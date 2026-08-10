"""TAXON simulation: bot players.

- RandomAgent:      baseline noise; legal moves, no strategy.
- InfoGainAgent:    decision-tree bot. Asks the question with maximal expected
                    information gain over its candidate set; guesses when the
                    posterior probability crosses a threshold.
- AlwaysGuessAgent: degenerate strategy probe (guess every turn).
- NeverGuessAgent:  degenerate strategy probe (never guesses).
"""
from __future__ import annotations

import random

from .engine import Game
from .taxon_data import (
    TRAITS,
    all_questions,
    question_info_gain,
    trait_reveal_gain,
)


class Agent:
    def __init__(self, seat: int, rng: random.Random):
        self.seat = seat
        self.rng = rng

    def play(self, game: Game, seat: int) -> list[tuple]:
        raise NotImplementedError


class RandomAgent(Agent):
    def play(self, game, seat):
        p = game.players[seat]
        rivals = [i for i in range(game.n) if i != seat]
        roll = self.rng.random()
        qcards = [c for c in p.hand if not c.special]
        if qcards and roll < 0.70:
            card = self.rng.choice(qcards)
            return [("ask_card", card, self.rng.choice(rivals))]
        if roll < 0.85:
            target = self.rng.choice(rivals)
            cands = game.candidates(seat, target)
            if cands:
                return [("guess", target, self.rng.choice(cands).cid)]
        if p.hand:
            return [("discard", self.rng.choice(p.hand))]
        return []


class InfoGainAgent(Agent):
    """Greedy information-gain questioning + threshold-based identification."""

    def __init__(self, seat, rng, threshold=0.5, use_specials=True):
        super().__init__(seat, rng)
        self.threshold = threshold
        self.use_specials = use_specials

    # ------------------------------------------------------------ helpers

    def _ranked_targets(self, game, seat):
        """Rivals ordered by closeness to solvable (fewest candidates, then low q).
        Ties are broken randomly so identical bots don't pile onto one seat."""
        info = []
        for r in range(game.n):
            if r == seat:
                continue
            cands = game.candidates(seat, r)
            info.append((len(cands), game.players[r].q, self.rng.random(), r, cands))
        info.sort()
        return [(n, q, r, c) for n, q, _t, r, c in info]

    def _best_question_card(self, cands, hand_cards):
        best, best_gain = [], 0.0
        for card in hand_cards:
            g = question_info_gain(cands, card.trait, card.value)
            if g > best_gain + 1e-9:
                best, best_gain = [card], g
            elif best and abs(g - best_gain) <= 1e-9:
                best.append(card)
        return (self.rng.choice(best), best_gain) if best else (None, 0.0)

    def _best_any_question(self, cands, game):
        best, best_gain = [], 0.0
        for trait, value in all_questions(game.creatures):
            g = question_info_gain(cands, trait, value)
            if g > best_gain + 1e-9:
                best, best_gain = [(trait, value)], g
            elif best and abs(g - best_gain) <= 1e-9:
                best.append((trait, value))
        return (self.rng.choice(best), best_gain) if best else (None, 0.0)

    # ------------------------------------------------------------ turn

    def play(self, game, seat):
        p = game.players[seat]
        targets = self._ranked_targets(game, seat)

        # 1. Certain knowledge -> identify immediately.
        for _n, _q, r, cands in targets:
            if len(cands) == 1:
                return [("guess", r, cands[0].cid)]

        # 2. Posterior above threshold -> push your luck and identify.
        for _n, _q, r, cands in targets:
            if cands and 1.0 / len(cands) >= self.threshold:
                return [("guess", r, self.rng.choice(cands).cid)]

        qcards = [c for c in p.hand if not c.special]
        specials = [c for c in p.hand if c.special]
        _, _, best_r, best_cands = targets[0]

        # 3. Specials (each grants free questions / intel).
        if self.use_specials and specials:
            sp = self.rng.choice(specials)
            if sp.kind == "double_probe":
                acts = [("play_special", sp)]
                cands = list(best_cands)
                for _ in range(2):
                    q, _g = self._best_any_question(cands, game)
                    if q is None:
                        break
                    acts.append(("ask_free", q[0], q[1], best_r, None))
                    # assume the more informative branch for planning purposes
                    yes = [c for c in cands if c.has(q[0], q[1])]
                    cands = yes if len(yes) <= len(cands) - len(yes) else [
                        c for c in cands if c not in yes
                    ]
                return acts if len(acts) > 1 else [("discard", sp)]
            if sp.kind == "misdirect":
                q, g = self._best_any_question(best_cands, game)
                if q and g > 0:
                    return [("play_special", sp), ("ask_free", q[0], q[1], best_r, seat)]
            if sp.kind == "wild_probe":
                q, g = self._best_any_question(best_cands, game)
                if q and g > 0:
                    return [("play_special", sp), ("ask_free", q[0], q[1], best_r, None)]
            if sp.kind == "eavesdrop":
                best_traits, best_g = [], 0.0
                for t in TRAITS:
                    g = trait_reveal_gain(best_cands, t)
                    if g > best_g + 1e-9:
                        best_traits, best_g = [t], g
                    elif best_traits and abs(g - best_g) <= 1e-9:
                        best_traits.append(t)
                if best_traits and best_g > 0:
                    return [("play_special", sp), ("reveal_trait", self.rng.choice(best_traits), best_r, seat)]
            if sp.kind == "cross_examine" and len(targets) >= 2:
                q, g = self._best_any_question(best_cands, game)
                if q and g > 0:
                    r2 = targets[1][2]
                    return [
                        ("play_special", sp),
                        ("ask_free", q[0], q[1], best_r, None),
                        ("ask_free", q[0], q[1], r2, None),
                    ]

        # 4. Best question card in hand.
        card, gain = self._best_question_card(best_cands, qcards)
        if card is not None and gain > 0:
            return [("ask_card", card, best_r)]

        # 5. Nothing informative on the best target: try other targets.
        for _n, _q, r, cands in targets[1:]:
            card, gain = self._best_question_card(cands, qcards)
            if card is not None and gain > 0:
                return [("ask_card", card, r)]

        # 6. Idle: discard the least useful card.
        if p.hand:
            return [("discard", self.rng.choice(p.hand))]
        return []


class AlwaysGuessAgent(Agent):
    def play(self, game, seat):
        rivals = [i for i in range(game.n) if i != seat]
        best_r, best_cands = None, None
        for r in rivals:
            cands = game.candidates(seat, r)
            if best_cands is None or len(cands) < len(best_cands):
                best_r, best_cands = r, cands
        if best_cands:
            return [("guess", best_r, self.rng.choice(best_cands).cid)]
        return []


class NeverGuessAgent(InfoGainAgent):
    def __init__(self, seat, rng, **_kw):
        super().__init__(seat, rng, threshold=1.01)  # step 2 never fires

    def play(self, game, seat):
        for _n, _q, r, cands in self._ranked_targets(game, seat):
            if len(cands) == 1:
                # still never guesses: discard instead (this is the point of the probe)
                p = game.players[seat]
                return [("discard", p.hand[0])] if p.hand else []
        return super().play(game, seat)
