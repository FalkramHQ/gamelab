"""SPOTTED! simulation: seat-compensation calibration.

Searches small starting-token offsets for later seats (ACT-14 style) so that
symmetric mirror matches give every seat an equal chance to win.

Run from the workspace root:

    python3 -m games.spotted.sim.calibrate [--games 400]

Writes sim/calibration.json consumed by run.py and documented in RULES.md.
"""
from __future__ import annotations

import argparse
import itertools
import json
import random
from pathlib import Path

from .agents import InfoGainAgent
from .engine import Game

OUT = Path(__file__).resolve().parent / "calibration.json"


def mirror_win_rates(n, comp, games, seed_start):
    wins = [0] * n
    for g in range(games):
        seed = seed_start + g
        rng = random.Random(seed)
        agents = [InfoGainAgent(s, random.Random(rng.random()), threshold=0.5) for s in range(n)]
        res = Game(n, agents, seed, compensation=comp).play()
        wins[res.winner] += 1
    return [w / games for w in wins]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=400)
    args = ap.parse_args()

    profiles = {}
    for n in (2, 3, 4, 5):
        best_comp, best_spread, best_rates = None, 2.0, None
        for offsets in itertools.product(range(3), repeat=n - 1):
            comp = [0] + list(offsets)
            rates = mirror_win_rates(n, comp, args.games, seed_start=70000 + n * 10000)
            spread = max(rates) - min(rates)
            if spread < best_spread:
                best_comp, best_spread, best_rates = comp, spread, rates
        profiles[str(n)] = best_comp
        print(f"n={n}: comp={best_comp} spread={best_spread*100:.1f}% rates={[f'{r*100:.0f}' for r in best_rates]}")

    OUT.write_text(json.dumps(profiles, indent=2) + "\n")
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
