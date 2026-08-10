"""TAXON demo: narrate a real simulated game turn by turn.

Run from the workspace root:

    python3 -m games.taxon.sim.demo [seed] [players]

Prints Round 1 in full detail (every question, answer, and deduction), then
fast-forwards to the final result, highlighting every Identification.
"""
from __future__ import annotations

import random
import sys

from .agents import InfoGainAgent
from .engine import Game

NAMES = ["Ada", "Ben", "Chloe", "Dev", "Eve"]

TRAIT_PHRASE = {
    "class": "Is your creature a(n) {v}?",
    "habitat": "Does your creature live in the {v}?",
    "size": "Is your creature {v}?",
    "diet": "Is your creature a {v}?",
    "activity": "Is your creature {v}?",
}


def question_text(trait: str, value: str) -> str:
    return TRAIT_PHRASE[trait].format(v=value.upper())


def run_demo(seed: int, n: int, verbose_turns: int):
    rng = random.Random(seed)
    agents = [InfoGainAgent(s, random.Random(rng.random()), threshold=0.5) for s in range(n)]
    game = Game(n, agents, seed)

    print(f"SETUP — {n} players, win at {game.win_target} tokens, seed {seed}")
    for p in game.players:
        print(f"  {NAMES[p.seat]} draws a Specimen (SECRET): {p.specimen.name.upper()}"
              f"   [{', '.join(p.specimen.traits)}]")
    print(f"  Each player draws 6 question cards. {NAMES[0]} goes first.")
    print()

    state = {"first_hit_printed": False}

    def on_turn(game, seat, actions, events):
        turn = game.turns  # 0-based index of this turn
        round_no = turn // game.n + 1
        verbose = turn < verbose_turns
        if verbose and turn % game.n == 0:
            print(f"— ROUND {round_no} (order: {' → '.join(NAMES[s] for s in game.order)}) —")

        me = NAMES[seat]
        for act in actions:
            kind = act[0]
            if kind == "ask_card":
                _, card, target = act
                if not verbose:
                    continue
                q = question_text(card.trait, card.value)
                ans = next(e for e in events if e[0] == "answer")
                print(f"  {me} asks {NAMES[target]}: “{q}”"
                      f"   →  {NAMES[target]} answers {'YES' if ans[5] else 'NO'} (public)")
            elif kind == "ask_free":
                _, trait, value, target, private_to = act
                q = question_text(trait, value)
                ans = next(e for e in events if e[0] == "answer")
                if verbose:
                    tag = f"   →  {NAMES[target]} answers {'YES' if ans[5] else 'NO'}"
                    tag += " (SECRET — only to " + NAMES[private_to] + ")" if private_to is not None else " (public)"
                    print(f"  {me} probes {NAMES[target]}: “{q}”{tag}")
            elif kind == "reveal_trait":
                _, trait, target, private_to = act
                ev = next(e for e in events if e[0] == "reveal")
                if verbose:
                    print(f"  {me} plays EAVESDROP on {NAMES[target]}: secretly sees"
                          f" {trait.upper()} = {ev[4].upper()}")
            elif kind == "play_special":
                _, card = act
                if verbose:
                    print(f"  {me} plays {card.kind.replace('_', ' ').upper()}")
            elif kind == "guess":
                _, target, cid = act
                creature = next(c for c in game.creatures if c.cid == cid)
                hit_ev = next((e for e in events if e[0] == "identified"), None)
                line = f"  {me} IDENTIFIES {NAMES[target]}'s Specimen: {creature.name.upper()}"
                if hit_ev:
                    q_used = hit_ev[4]
                    points = 2 + max(0, 4 - q_used)
                    line += f"   →  CORRECT! +{points} tokens (only {q_used} public questions asked about them)"
                    line += f"\n       {NAMES[target]} reveals the card and draws a new secret Specimen."
                    if verbose or not state["first_hit_printed"]:
                        print(line)
                        state["first_hit_printed"] = True
                    else:
                        print(f"[round {round_no}] {line.strip().splitlines()[0]}")
                else:
                    line += "   →  WRONG (−2 tokens, guess becomes public info)"
                    if verbose:
                        print(line)
                    else:
                        print(f"[round {round_no}] {line.strip()}")
            elif kind == "discard" and verbose:
                _, card = act
                label = card.kind.replace("_", " ") if card.special else question_text(card.trait, card.value)
                print(f"  {me} discards a card ({label})")

        if verbose:
            cands = [f"{NAMES[r]}≈{len(game.candidates(seat, r))}" for r in range(game.n) if r != seat]
            scores = ", ".join(f"{NAMES[i]} {game.players[i].score}" for i in range(game.n))
            print(f"       [{me}'s pad after this turn: {' | '.join(cands)} candidates]   scores: {scores}")
            print()

    res = game.play(on_turn=on_turn)

    print("=" * 64)
    print(f"GAME OVER after {res.turns} turns — winner: {NAMES[res.winner]}")
    print("Final scores: " + ", ".join(f"{NAMES[i]} {s}" for i, s in enumerate(res.scores)))
    print(f"Guessing stats: {res.guess_hits}/{res.guess_attempts} identifications correct"
          f" (avg public questions before a hit: "
          f"{(sum(res.q_at_hit) / len(res.q_at_hit)):.1f})" if res.q_at_hit else "")


if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    run_demo(seed, n, verbose_turns=n)
