/**
 * Bot players — ported from sim/agents.py.
 * - RandomAgent:   casual baseline; legal moves, no strategy.
 * - InfoGainAgent: sharp decision-tree bot. Asks the question with maximal
 *   expected information gain over its candidate set; guesses when the
 *   posterior probability crosses a threshold.
 */
import {
  TRAITS, Trait, Creature, QuestionCard,
  allQuestions, questionInfoGain, traitRevealGain,
} from "./data";
import { Game, Agent, Action } from "./engine";
import { Rng } from "./rng";

export class RandomAgent implements Agent {
  constructor(private rng: Rng) {}

  play(game: Game, seat: number): Action[] {
    const p = game.players[seat];
    const rivals = [...Array(game.n).keys()].filter((i) => i !== seat);
    const roll = this.rng.random();
    const qcards = p.hand.filter((c) => !c.special);
    if (qcards.length && roll < 0.7) {
      return [{ kind: "ask_card", card: this.rng.choice(qcards), target: this.rng.choice(rivals) }];
    }
    if (roll < 0.85) {
      const target = this.rng.choice(rivals);
      const cands = game.candidates(seat, target);
      if (cands.length) return [{ kind: "guess", target, cid: this.rng.choice(cands).cid }];
    }
    if (p.hand.length) return [{ kind: "discard", card: this.rng.choice(p.hand) }];
    return [];
  }
}

export class InfoGainAgent implements Agent {
  threshold: number;
  useSpecials: boolean;

  constructor(private rng: Rng, threshold = 0.5, useSpecials = true) {
    this.threshold = threshold;
    this.useSpecials = useSpecials;
  }

  /** Rivals ordered by closeness to solvable (fewest candidates, then low q). */
  private rankedTargets(game: Game, seat: number) {
    const info: [number, number, number, number, Creature[]][] = [];
    for (let r = 0; r < game.n; r++) {
      if (r === seat) continue;
      const cands = game.candidates(seat, r);
      info.push([cands.length, game.players[r].q, this.rng.random(), r, cands]);
    }
    info.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return info.map(([n, q, , r, c]) => ({ n, q, r, cands: c }));
  }

  private bestQuestionCard(cands: Creature[], handCards: QuestionCard[]): [QuestionCard | null, number] {
    let best: QuestionCard[] = [];
    let bestGain = 0;
    for (const card of handCards) {
      const g = questionInfoGain(cands, card.trait as Trait, card.value);
      if (g > bestGain + 1e-9) { best = [card]; bestGain = g; }
      else if (best.length && Math.abs(g - bestGain) <= 1e-9) best.push(card);
    }
    return best.length ? [this.rng.choice(best), bestGain] : [null, 0];
  }

  private bestAnyQuestion(cands: Creature[]): [[Trait, string] | null, number] {
    let best: [Trait, string][] = [];
    let bestGain = 0;
    for (const [trait, value] of allQuestions()) {
      const g = questionInfoGain(cands, trait, value);
      if (g > bestGain + 1e-9) { best = [[trait, value]]; bestGain = g; }
      else if (best.length && Math.abs(g - bestGain) <= 1e-9) best.push([trait, value]);
    }
    return best.length ? [this.rng.choice(best), bestGain] : [null, 0];
  }

  play(game: Game, seat: number): Action[] {
    const p = game.players[seat];
    const targets = this.rankedTargets(game, seat);

    // 1. Certain knowledge -> identify immediately.
    for (const t of targets) {
      if (t.cands.length === 1) return [{ kind: "guess", target: t.r, cid: t.cands[0].cid }];
    }
    // 2. Posterior above threshold -> push your luck and identify.
    for (const t of targets) {
      if (t.cands.length && 1 / t.cands.length >= this.threshold) {
        return [{ kind: "guess", target: t.r, cid: this.rng.choice(t.cands).cid }];
      }
    }

    const qcards = p.hand.filter((c) => !c.special);
    const specials = p.hand.filter((c) => c.special);
    const best = targets[0];

    // 3. Specials (each grants free questions / intel).
    if (this.useSpecials && specials.length) {
      const sp = this.rng.choice(specials);
      if (sp.kind === "double_probe") {
        const acts: Action[] = [{ kind: "play_special", card: sp }];
        let cands = [...best.cands];
        for (let i = 0; i < 2; i++) {
          const [q] = this.bestAnyQuestion(cands);
          if (!q) break;
          acts.push({ kind: "ask_free", trait: q[0], value: q[1], target: best.r, privateTo: null });
          // assume the more informative branch for planning purposes
          const yes = cands.filter((c) => c.traits[q[0]] === q[1]);
          cands = yes.length <= cands.length - yes.length ? yes : cands.filter((c) => c.traits[q[0]] !== q[1]);
        }
        if (acts.length > 1) return acts;
        return [{ kind: "discard", card: sp }];
      }
      if (sp.kind === "misdirect") {
        const [q, g] = this.bestAnyQuestion(best.cands);
        if (q && g > 0) {
          return [{ kind: "play_special", card: sp },
                  { kind: "ask_free", trait: q[0], value: q[1], target: best.r, privateTo: seat }];
        }
      }
      if (sp.kind === "wild_probe") {
        const [q, g] = this.bestAnyQuestion(best.cands);
        if (q && g > 0) {
          return [{ kind: "play_special", card: sp },
                  { kind: "ask_free", trait: q[0], value: q[1], target: best.r, privateTo: null }];
        }
      }
      if (sp.kind === "eavesdrop") {
        let bestTraits: Trait[] = [];
        let bestG = 0;
        for (const t of TRAITS) {
          const g = traitRevealGain(best.cands, t);
          if (g > bestG + 1e-9) { bestTraits = [t]; bestG = g; }
          else if (bestTraits.length && Math.abs(g - bestG) <= 1e-9) bestTraits.push(t);
        }
        if (bestTraits.length && bestG > 0) {
          return [{ kind: "play_special", card: sp },
                  { kind: "reveal_trait", trait: this.rng.choice(bestTraits), target: best.r, privateTo: seat }];
        }
      }
      if (sp.kind === "cross_examine" && targets.length >= 2) {
        const [q, g] = this.bestAnyQuestion(best.cands);
        if (q && g > 0) {
          return [{ kind: "play_special", card: sp },
                  { kind: "ask_free", trait: q[0], value: q[1], target: best.r, privateTo: null },
                  { kind: "ask_free", trait: q[0], value: q[1], target: targets[1].r, privateTo: null }];
        }
      }
    }

    // 4. Best question card in hand.
    {
      const [card, gain] = this.bestQuestionCard(best.cands, qcards);
      if (card && gain > 0) return [{ kind: "ask_card", card, target: best.r }];
    }
    // 5. Nothing informative on the best target: try other targets.
    for (const t of targets.slice(1)) {
      const [card, gain] = this.bestQuestionCard(t.cands, qcards);
      if (card && gain > 0) return [{ kind: "ask_card", card, target: t.r }];
    }
    // 6. Idle: discard a card.
    if (p.hand.length) return [{ kind: "discard", card: this.rng.choice(p.hand) }];
    return [];
  }
}
