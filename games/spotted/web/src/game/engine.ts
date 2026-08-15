/**
 * SPOTTED! rules engine — faithful TypeScript port of sim/engine.py.
 * Implements RULES.md exactly:
 * - draw 1, then one action (question / special / identification / discard)
 * - public answers increment the target's q counter (efficiency penalty meter)
 * - scoring: 2 + max(0, 4 - q) for a correct identification
 * - win at winTarget tokens; equal-turn finish; tiebreaks; first-player rotation
 */
import {
  Creature, QuestionCard, Trait, TRAITS,
  CREATURES, buildQuestionDeck, hasTrait,
} from "./data";
import { makeRng, Rng } from "./rng";

export const HAND_LIMIT = 7;
export const STARTING_HAND = 6;
export const WIN_TARGET_DEFAULT = 10;
export const WIN_TARGET_2P = 8; // Duel variant
export const WIN_TARGET_KIDS = 6;
export const MAX_TURNS = 400;

export interface PlayerState {
  seat: number;
  hand: QuestionCard[];
  specimen: Creature;
  epoch: number; // increments every time this player's specimen is replaced
  score: number;
  q: number; // public answers about current specimen
  correctIds: number;
}

export type LogEvent =
  | { kind: "answer"; target: number; epoch: number; trait: Trait; value: string; yes: boolean; privateTo: number | null }
  | { kind: "reveal"; target: number; epoch: number; trait: Trait; value: string; privateTo: number }
  | { kind: "guess_fail"; target: number; epoch: number; cid: string }
  | { kind: "identified"; target: number; epoch: number; cid: string; q: number };

export type Action =
  | { kind: "ask_card"; card: QuestionCard; target: number }
  | { kind: "ask_free"; trait: Trait; value: string; target: number; privateTo: number | null }
  | { kind: "reveal_trait"; trait: Trait; target: number; privateTo: number }
  | { kind: "play_special"; card: QuestionCard }
  | { kind: "guess"; target: number; cid: string }
  | { kind: "discard"; card: QuestionCard };

export interface GameResult {
  winner: number; // seat, -1 for capped/abnormal
  turns: number;
  scores: number[];
  guessAttempts: number;
  guessHits: number;
  capped: boolean;
}

export interface GameConfig {
  nPlayers: number;
  seed: number;
  kidsMode?: boolean;
  winTarget?: number;
  rotateFirstPlayer?: boolean;
}

export interface Agent {
  play(game: Game, seat: number): Action[];
}

export class Game {
  rng: Rng;
  n: number;
  agents: Agent[] = [];
  rotate: boolean;
  kidsMode: boolean;
  winTarget: number;
  creatures: Creature[] = CREATURES;
  creatureDeck: Creature[];
  questionDeck: QuestionCard[];
  questionDiscard: QuestionCard[] = [];
  players: PlayerState[];
  log: LogEvent[] = [];
  depleted = false;
  finishTriggered = false;
  turns = 0;
  order: number[];
  pos = 0;
  turnSeat = 0;
  guessAttempts = 0;
  guessHits = 0;
  over = false;
  winner = -1;
  capped = false;
  /** true between beginTurn() and endTurn() — a turn is in progress */
  inTurn = false;
  lastDrawn: QuestionCard | null = null;

  constructor(cfg: GameConfig) {
    const n = cfg.nPlayers;
    if (n < 2 || n > 5) throw new Error("2-5 players");
    this.rng = makeRng(cfg.seed);
    this.n = n;
    this.rotate = cfg.rotateFirstPlayer ?? true;
    this.kidsMode = cfg.kidsMode ?? false;
    this.winTarget = cfg.winTarget ?? (this.kidsMode ? WIN_TARGET_KIDS
      : n === 2 ? WIN_TARGET_2P : WIN_TARGET_DEFAULT);
    this.creatureDeck = this.rng.shuffle([...this.creatures]);
    this.questionDeck = this.rng.shuffle(buildQuestionDeck());

    this.players = [];
    for (let i = 0; i < n; i++) {
      const hand: QuestionCard[] = [];
      for (let k = 0; k < STARTING_HAND; k++) hand.push(this.questionDeck.pop()!);
      this.players.push({
        seat: i, hand, specimen: this.creatureDeck.pop()!,
        epoch: 0, score: 0, q: 0, correctIds: 0,
      });
    }
    this.order = [...Array(n).keys()];
  }

  // ------------------------------------------------------------------ facts

  publicQ(seat: number): number {
    return this.players[seat].q;
  }

  /** Creature ids the viewer knows are out of play. */
  knownRemoved(viewer: number): Set<string> {
    const removed = new Set<string>();
    for (const ev of this.log) if (ev.kind === "identified") removed.add(ev.cid);
    removed.add(this.players[viewer].specimen.cid); // my own can't be anyone else's
    return removed;
  }

  /** All creatures consistent with everything `viewer` knows about `rival`. */
  candidates(viewer: number, rival: number): Creature[] {
    const p = this.players[rival];
    const removed = this.knownRemoved(viewer);
    let cands = this.creatures.filter((c) => !removed.has(c.cid));
    for (const ev of this.log) {
      if (ev.target !== rival || ev.epoch !== p.epoch) continue;
      if (ev.kind === "answer") {
        if (ev.privateTo !== null && ev.privateTo !== viewer) continue;
        cands = cands.filter((c) => hasTrait(c, ev.trait, ev.value) === ev.yes);
      } else if (ev.kind === "reveal") {
        if (ev.privateTo !== viewer) continue;
        cands = cands.filter((c) => c.traits[ev.trait] === ev.value);
      } else if (ev.kind === "guess_fail") {
        cands = cands.filter((c) => c.cid !== ev.cid);
      }
    }
    return cands;
  }

  // ------------------------------------------------------------------ turns

  /** Step 1 — draw (reshuffle discard if empty; enforce hand limit). */
  beginTurn(): QuestionCard | null {
    if (this.over || this.inTurn) throw new Error("bad turn state");
    this.inTurn = true;
    this.turnSeat = this.order[this.pos];
    const p = this.players[this.turnSeat];
    this.lastDrawn = null;
    if (this.questionDeck.length === 0 && this.questionDiscard.length) {
      this.questionDeck = this.rng.shuffle(this.questionDiscard);
      this.questionDiscard = [];
    }
    if (this.questionDeck.length) {
      this.lastDrawn = this.questionDeck.pop()!;
      p.hand.push(this.lastDrawn);
    }
    while (p.hand.length > HAND_LIMIT) this.questionDiscard.push(p.hand.shift()!);
    return this.lastDrawn;
  }

  /** Step 2 — resolve the chosen actions (exactly one main action enforced by UI/agents). */
  resolve(actions: Action[]): LogEvent[] {
    const before = this.log.length;
    const p = this.players[this.turnSeat];
    let resolvedMain = false;
    for (const act of actions) {
      if (resolvedMain && (act.kind === "ask_card" || act.kind === "guess" || act.kind === "discard")) continue;
      this.resolveOne(p, act);
      if (act.kind === "ask_card" || act.kind === "guess" || act.kind === "discard" || act.kind === "play_special") {
        resolvedMain = true;
      }
    }
    if (!resolvedMain && p.hand.length) this.questionDiscard.push(p.hand.shift()!);
    return this.log.slice(before);
  }

  private resolveOne(p: PlayerState, act: Action): void {
    switch (act.kind) {
      case "ask_card": {
        const { card, target } = act;
        if (!p.hand.includes(card) || target === p.seat || card.special) return;
        p.hand.splice(p.hand.indexOf(card), 1);
        this.questionDiscard.push(card);
        this.answer(p.seat, target, card.trait as Trait, card.value, null);
        break;
      }
      case "ask_free": {
        const { trait, value, target, privateTo } = act;
        if (target === p.seat || !(TRAITS as readonly string[]).includes(trait)) return;
        this.answer(p.seat, target, trait, value, privateTo);
        break;
      }
      case "reveal_trait": {
        const { trait, target, privateTo } = act;
        if (target === p.seat || !(TRAITS as readonly string[]).includes(trait)) return;
        const t = this.players[target];
        this.log.push({ kind: "reveal", target, epoch: t.epoch, trait, value: t.specimen.traits[trait], privateTo });
        break;
      }
      case "play_special": {
        const { card } = act;
        if (p.hand.includes(card) && card.special) {
          p.hand.splice(p.hand.indexOf(card), 1);
          this.questionDiscard.push(card);
        }
        break;
      }
      case "guess": {
        const { target, cid } = act;
        if (target === p.seat) return;
        this.guessAttempts += 1;
        const t = this.players[target];
        if (t.specimen.cid === cid) {
          this.guessHits += 1;
          const points = this.kidsMode ? 2 : 2 + Math.max(0, 4 - t.q);
          p.score += points;
          p.correctIds += 1;
          this.log.push({ kind: "identified", target, epoch: t.epoch, cid, q: t.q });
          if (this.creatureDeck.length) {
            t.specimen = this.creatureDeck.pop()!;
            t.epoch += 1;
            t.q = 0;
          } else {
            this.depleted = true;
          }
        } else {
          if (!this.kidsMode) p.score = Math.max(0, p.score - 3);
          this.log.push({ kind: "guess_fail", target, epoch: t.epoch, cid });
        }
        break;
      }
      case "discard": {
        const { card } = act;
        if (p.hand.includes(card)) {
          p.hand.splice(p.hand.indexOf(card), 1);
          this.questionDiscard.push(card);
        }
        break;
      }
    }
  }

  private answer(asker: number, target: number, trait: Trait, value: string, privateTo: number | null): void {
    const t = this.players[target];
    const yes = hasTrait(t.specimen, trait, value);
    this.log.push({ kind: "answer", target, epoch: t.epoch, trait, value, yes, privateTo });
    if (privateTo === null) t.q += 1;
  }

  /** End of turn: win trigger check, rotation, equal-turn finish. */
  endTurn(): void {
    if (!this.inTurn) throw new Error("endTurn without beginTurn");
    this.inTurn = false;
    const p = this.players[this.turnSeat];
    if (p.score >= this.winTarget) this.finishTriggered = true;

    this.turns += 1;
    this.pos += 1;
    if (this.pos === this.n) {
      this.pos = 0;
      if (this.rotate) {
        // pass the first-player marker: cancels the late-seat listening advantage
        this.order = [...this.order.slice(1), this.order[0]];
      }
      if (this.depleted || this.finishTriggered) {
        this.over = true;
        this.winner = this.settleByScore();
      }
    }
    if (!this.over && this.turns >= MAX_TURNS) {
      this.capped = true;
      this.over = true;
      this.winner = this.settleByScore();
    }
  }

  private settleByScore(): number {
    let bestSeat = 0;
    let best: [number, number, number] = [-1, -1, 0];
    for (const pl of this.players) {
      const key: [number, number, number] = [pl.score, pl.correctIds, -pl.seat];
      if (key[0] > best[0] || (key[0] === best[0] && key[1] > best[1]) ||
          (key[0] === best[0] && key[1] === best[1] && key[2] > best[2])) {
        best = key; bestSeat = pl.seat;
      }
    }
    return bestSeat;
  }

  result(): GameResult {
    return {
      winner: this.winner,
      turns: this.turns,
      scores: this.players.map((p) => p.score),
      guessAttempts: this.guessAttempts,
      guessHits: this.guessHits,
      capped: this.capped,
    };
  }

  /** Headless full game (used by tests + bot-vs-bot smoke runs). */
  play(onTurn?: (game: Game, seat: number, actions: Action[], events: LogEvent[]) => void): GameResult {
    while (!this.over) {
      this.beginTurn();
      const seat = this.turnSeat;
      const actions = this.agents[seat].play(this, seat);
      const events = this.resolve(actions);
      if (onTurn) onTurn(this, seat, actions, events);
      this.endTurn();
    }
    return this.result();
  }
}
