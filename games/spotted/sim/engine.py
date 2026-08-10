"""SPOTTED! simulation: full rules engine.

Implements the rulebook in games/spotted/RULES.md exactly:
- draw 1, then one action (question / special / identification / discard)
- public answers increment the target's q counter (efficiency penalty meter)
- scoring: 2 + max(0, 4 - q) for a correct identification
- win at WIN_TARGET tokens; creature-deck exhaustion ends the round; tiebreaks
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

from .data import (
    Creature,
    QuestionCard,
    TRAITS,
    load_creatures,
    load_question_deck,
)

HAND_LIMIT = 7
STARTING_HAND = 6
WIN_TARGET_DEFAULT = 10
WIN_TARGET_2P = 8  # Duel variant
MAX_TURNS = 400  # safety cap


@dataclass
class PlayerState:
    seat: int
    hand: list[QuestionCard] = field(default_factory=list)
    specimen: Creature | None = None
    epoch: int = 0  # increments every time this player's specimen is replaced
    score: int = 0
    q: int = 0  # public answers about current specimen
    correct_ids: int = 0


@dataclass
class GameResult:
    winner: int  # seat, -1 for capped/abnormal
    turns: int
    scores: list[int]
    guess_attempts: int
    guess_hits: int
    q_at_hit: list[int] = field(default_factory=list)
    capped: bool = False


class Game:
    def __init__(self, n_players: int, agents, seed: int, win_target: int | None = None,
                 compensation: list[int] | None = None, rotate_first_player: bool = True):
        assert 2 <= n_players <= 5
        self.rng = random.Random(seed)
        self.n = n_players
        self.agents = agents
        self.rotate = rotate_first_player
        self.win_target = win_target or (WIN_TARGET_2P if n_players == 2 else WIN_TARGET_DEFAULT)
        self.creatures = load_creatures()
        self.creature_deck = self.creatures[:]
        self.rng.shuffle(self.creature_deck)
        self.question_deck = load_question_deck()
        self.rng.shuffle(self.question_deck)
        self.question_discard: list[QuestionCard] = []

        self.players = [PlayerState(seat=i) for i in range(n_players)]
        for p in self.players:
            p.specimen = self.creature_deck.pop()
            for _ in range(STARTING_HAND):
                p.hand.append(self.question_deck.pop())
            if compensation:
                # ACT-14 style advantage compensation: later seats act later in the
                # information race, so they start with tokens to balance win chances.
                # Values are calibrated by sim/calibrate.py.
                p.score = compensation[p.seat]

        # Fact log entries:
        #   ("answer", target, epoch, trait, value, yes, private_to)
        #   ("reveal", target, epoch, trait, value, private_to)
        #   ("guess_fail", target, epoch, cid)
        #   ("identified", target, epoch, cid, q_at_guess)
        self.log: list[tuple] = []
        self.depleted = False
        self.finish_triggered = False  # someone reached WIN_TARGET; finish the round
        self.turns = 0
        self.order = list(range(n_players))  # seat order for the current round
        self.pos = 0  # position within the round
        self.turn_seat = 0
        self.guess_attempts = 0
        self.guess_hits = 0
        self.q_at_hit: list[int] = []
        self.over = False
        self.winner = -1
        self.capped = False

    # ------------------------------------------------------------------ facts

    def public_q(self, seat: int) -> int:
        return self.players[seat].q

    def known_removed(self, viewer: int) -> set[str]:
        """Creature ids the viewer knows are out of play."""
        removed = set()
        for ev in self.log:
            if ev[0] == "identified":
                removed.add(ev[3])
        removed.add(self.players[viewer].specimen.cid)  # my own can't be anyone else's
        return removed

    def candidates(self, viewer: int, rival: int) -> list[Creature]:
        """All creatures consistent with everything `viewer` knows about `rival`."""
        p = self.players[rival]
        removed = self.known_removed(viewer)
        cands = [c for c in self.creatures if c.cid not in removed]
        for ev in self.log:
            kind = ev[0]
            if kind in ("answer", "reveal", "guess_fail") and ev[1] == rival and ev[2] == p.epoch:
                if kind == "answer":
                    _, _t, _e, trait, value, yes, private_to = ev
                    if private_to is not None and private_to != viewer:
                        continue
                    cands = [c for c in cands if c.has(trait, value) == yes]
                elif kind == "reveal":
                    _, _t, _e, trait, value, private_to = ev
                    if private_to is not None and private_to != viewer:
                        continue
                    cands = [c for c in cands if c.value_of(trait) == value]
                else:  # guess_fail: public information
                    cid = ev[3]
                    cands = [c for c in cands if c.cid != cid]
        return cands

    # ------------------------------------------------------------------ turns

    def _draw(self, p: PlayerState):
        if not self.question_deck and self.question_discard:
            self.question_deck = self.question_discard
            self.question_discard = []
            self.rng.shuffle(self.question_deck)
        if self.question_deck:
            p.hand.append(self.question_deck.pop())
        while len(p.hand) > HAND_LIMIT:  # enforce hand limit deterministically
            self.question_discard.append(p.hand.pop(0))

    def _resolve(self, p: PlayerState, act: tuple):
        kind = act[0]
        if kind == "ask_card":
            _, card, target = act
            if card not in p.hand or target == p.seat or card.special:
                return
            p.hand.remove(card)
            self.question_discard.append(card)
            self._answer(p.seat, target, card.trait, card.value, private_to=None)
        elif kind == "ask_free":
            _, trait, value, target, private_to = act
            if target == p.seat or trait not in TRAITS:
                return
            self._answer(p.seat, target, trait, value, private_to=private_to)
        elif kind == "reveal_trait":
            _, trait, target, private_to = act
            if target == p.seat or trait not in TRAITS:
                return
            t = self.players[target]
            self.log.append(("reveal", target, t.epoch, trait, t.specimen.value_of(trait), private_to))
        elif kind == "play_special":
            _, card = act
            if card in p.hand and card.special:
                p.hand.remove(card)
                self.question_discard.append(card)
        elif kind == "guess":
            _, target, cid = act
            if target == p.seat:
                return
            self.guess_attempts += 1
            t = self.players[target]
            if t.specimen.cid == cid:
                self.guess_hits += 1
                self.q_at_hit.append(t.q)
                points = 2 + max(0, 4 - t.q)
                p.score += points
                p.correct_ids += 1
                self.log.append(("identified", target, t.epoch, cid, t.q))
                if self.creature_deck:
                    t.specimen = self.creature_deck.pop()
                    t.epoch += 1
                    t.q = 0
                else:
                    self.depleted = True
            else:
                p.score = max(0, p.score - 2)
                self.log.append(("guess_fail", target, t.epoch, cid))
        elif kind == "discard":
            _, card = act
            if card in p.hand:
                p.hand.remove(card)
                self.question_discard.append(card)

    def _answer(self, asker: int, target: int, trait: str, value: str, private_to: int | None):
        t = self.players[target]
        yes = t.specimen.has(trait, value)
        self.log.append(("answer", target, t.epoch, trait, value, yes, private_to))
        if private_to is None:
            t.q += 1

    def play(self, on_turn=None) -> GameResult:
        while not self.over and self.turns < MAX_TURNS:
            self.turn_seat = self.order[self.pos]
            p = self.players[self.turn_seat]
            self._draw(p)
            log_before = len(self.log)
            actions = self.agents[self.turn_seat].play(self, self.turn_seat)
            resolved_main = False
            for act in actions:
                if act[0] in ("ask_card", "guess", "discard") and resolved_main:
                    continue
                self._resolve(p, act)
                if act[0] in ("ask_card", "guess", "discard", "play_special"):
                    resolved_main = True
            if not resolved_main and p.hand:  # forced discard if agent idled
                self.question_discard.append(p.hand.pop(0))
            if on_turn:
                on_turn(self, p.seat, actions, self.log[log_before:])

            if p.score >= self.win_target:
                self.finish_triggered = True  # equal-turn finish: complete the round

            self.turns += 1
            self.pos += 1
            if self.pos == self.n:  # round complete
                self.pos = 0
                if self.rotate:
                    # pass the first-player marker: cancels the late-seat
                    # listening advantage over the course of the game.
                    self.order = self.order[1:] + self.order[:1]
                if self.depleted or self.finish_triggered:
                    self.over = True
                    self.winner = self._settle_by_score()
            self.turn_seat = self.order[self.pos]

        if not self.over:
            self.capped = True
            self.over = True
            self.winner = self._settle_by_score()

        return GameResult(
            winner=self.winner,
            turns=self.turns,
            scores=[pl.score for pl in self.players],
            guess_attempts=self.guess_attempts,
            guess_hits=self.guess_hits,
            q_at_hit=self.q_at_hit,
            capped=self.capped,
        )

    def _settle_by_score(self) -> int:
        best = max((pl.score, pl.correct_ids, -pl.seat) for pl in self.players)
        for pl in self.players:
            if (pl.score, pl.correct_ids, -pl.seat) == best:
                return pl.seat
        return 0
