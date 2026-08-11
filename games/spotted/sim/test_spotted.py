"""SPOTTED! simulation: unit tests.

Run from the workspace root:

    python3 -m unittest games.spotted.sim.test_spotted -v
"""
from __future__ import annotations

import random
import unittest

from .agents import AlwaysGuessAgent, InfoGainAgent, RandomAgent
from .engine import Game, HAND_LIMIT, STARTING_HAND
from .data import (
    TRAITS,
    load_creatures,
    load_question_deck,
    question_info_gain,
    trait_reveal_gain,
)


class TestData(unittest.TestCase):
    def test_creature_deck_size_and_traits(self):
        creatures = load_creatures()
        self.assertEqual(len(creatures), 25)
        ids = {c.cid for c in creatures}
        self.assertEqual(len(ids), 25)
        for c in creatures:
            self.assertEqual(len(c.traits), len(TRAITS))
            self.assertTrue(all(c.traits))

    def test_question_deck_composition(self):
        deck = load_question_deck()
        self.assertEqual(len(deck), 80)
        specials = [c for c in deck if c.special]
        self.assertEqual(len(specials), 16)
        kinds = {c.kind for c in specials}
        self.assertEqual(kinds, {"double_probe", "misdirect", "eavesdrop",
                                 "cross_examine", "wild_probe"})

    def test_info_gain_bounds(self):
        creatures = load_creatures()
        for c in creatures[:1]:
            pass
        g = question_info_gain(creatures, "activity", "nocturnal")
        self.assertGreater(g, 0.5)  # 10/15 split is near-balanced
        # a question with zero yes-answers gives no information
        self.assertEqual(question_info_gain(creatures, "size", "colossal"), 0.0)

    def test_trait_reveal_gain_positive(self):
        creatures = load_creatures()
        for t in TRAITS:
            self.assertGreater(trait_reveal_gain(creatures, t), 0.0)


class TestEngine(unittest.TestCase):
    def _game(self, n=3, seed=7, kids_mode=False):
        agents = [RandomAgent(i, random.Random(seed + i)) for i in range(n)]
        return Game(n, agents, seed, kids_mode=kids_mode)

    def test_setup(self):
        g = self._game()
        for p in g.players:
            self.assertIsNotNone(p.specimen)
            self.assertEqual(len(p.hand), STARTING_HAND)
        specimens = [p.specimen.cid for p in g.players]
        self.assertEqual(len(set(specimens)), 3)

    def test_public_answer_increments_q(self):
        g = self._game()
        target = g.players[1]
        g._answer(0, 1, "size", target.specimen.value_of("size"), private_to=None)
        self.assertEqual(target.q, 1)
        g._answer(0, 1, "size", target.specimen.value_of("size"), private_to=0)
        self.assertEqual(target.q, 1)  # private answers don't count

    def test_scoring_formula(self):
        g = self._game()
        scorer, target = g.players[0], g.players[1]
        cid = target.specimen.cid
        target.q = 1
        g._resolve(scorer, ("guess", 1, cid))
        self.assertEqual(scorer.score, 2 + max(0, 4 - 1))
        self.assertEqual(scorer.correct_ids, 1)
        self.assertNotEqual(target.specimen.cid, cid)  # drew a replacement

    def test_wrong_guess_penalizes_and_is_public(self):
        g = self._game()
        scorer, target = g.players[0], g.players[1]
        scorer.score = 3
        wrong = next(c.cid for c in g.creatures if c.cid != target.specimen.cid)
        g._resolve(scorer, ("guess", 1, wrong))
        self.assertEqual(scorer.score, 0)  # -3 penalty for a wrong identification
        # failed guess is public info: that creature is no longer a candidate
        cands = g.candidates(2, 1)
        self.assertNotIn(wrong, [c.cid for c in cands])

    def test_kids_mode_scoring(self):
        g = self._game(kids_mode=True)
        self.assertEqual(g.win_target, 6)  # shorter game for kids
        scorer, target = g.players[0], g.players[1]
        cid = target.specimen.cid
        target.q = 3  # efficiency bonus must NOT apply in kids mode
        g._resolve(scorer, ("guess", 1, cid))
        self.assertEqual(scorer.score, 2)  # flat scoring
        # wrong guesses are free (no penalty) but still public
        wrong = next(c.cid for c in g.creatures
                     if c.cid != g.players[1].specimen.cid)
        g._resolve(scorer, ("guess", 1, wrong))
        self.assertEqual(scorer.score, 2)
        cands = g.candidates(2, 1)
        self.assertNotIn(wrong, [c.cid for c in cands])

    def test_candidates_respect_private_answers(self):
        g = self._game()
        target = g.players[1]
        # private answer visible only to seat 0
        g._answer(0, 1, "class", target.specimen.value_of("class"), private_to=0)
        cands0 = g.candidates(0, 1)
        cands2 = g.candidates(2, 1)
        self.assertLess(len(cands0), len(cands2))
        self.assertTrue(all(c.value_of("class") == target.specimen.value_of("class")
                            for c in cands0))

    def test_hand_limit_enforced(self):
        g = self._game()
        p = g.players[0]
        p.hand = g.question_deck[:HAND_LIMIT]  # fill to limit
        g._draw(p)
        self.assertEqual(len(p.hand), HAND_LIMIT)

    def test_determinism(self):
        def run(seed):
            agents = [InfoGainAgent(i, random.Random(seed * 31 + i)) for i in range(3)]
            return Game(3, agents, seed).play()
        self.assertEqual(run(11).scores, run(11).scores)
        self.assertEqual(run(11).winner, run(11).winner)

    def test_games_terminate(self):
        for n in (2, 3, 4, 5):
            for seed in range(5):
                agents = [InfoGainAgent(i, random.Random(seed * 7 + i), threshold=0.4)
                          for i in range(n)]
                res = Game(n, agents, seed).play()
                self.assertFalse(res.capped, f"game capped at n={n} seed={seed}")
                self.assertGreaterEqual(max(res.scores), 1)

    def test_degenerate_always_guess_still_terminates(self):
        agents = [AlwaysGuessAgent(i, random.Random(i)) for i in range(4)]
        res = Game(4, agents, 3).play()
        self.assertGreaterEqual(res.winner, 0)


if __name__ == "__main__":
    unittest.main()
