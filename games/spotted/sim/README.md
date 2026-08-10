# SPOTTED! — Simulation & Testing Kit

Deterministic rules engine + bot players + balance experiments for the SPOTTED! card
game. Pure Python 3, zero dependencies.

## Quick start (run from the workspace root)

```bash
# unit tests (13 tests: data, rules, scoring, determinism, termination)
python3 -m unittest games.spotted.sim.test_spotted -v

# full balance suite: ~23k games, writes REPORT.md (~45s)
python3 -m games.spotted.sim.run

# fast smoke run (~7s)
python3 -m games.spotted.sim.run --quick

# seat-compensation calibration search (only needed if rules change)
python3 -m games.spotted.sim.calibrate --games 500

# narrate a real game turn by turn (Round 1 in detail)
python3 -m games.spotted.sim.demo [seed] [players]
```

## Layout

| File | Role |
|---|---|
| `data.py` | Loads card content from `../cards/*.csv` (single source of truth); entropy / information-gain math |
| `engine.py` | Full rules implementation: draws, hand limit, questions, specials, identification, scoring, equal-turn finish, first-player rotation |
| `agents.py` | `RandomAgent` (baseline), `InfoGainAgent` (decision-tree optimal questioning + threshold guessing), `AlwaysGuessAgent` / `NeverGuessAgent` (degenerate probes) |
| `run.py` | Experiments + auto-generated `REPORT.md` with PASS/FAIL verdict |
| `calibrate.py` | Searches starting-token offsets (unused in shipped rules; rotation suffices) |
| `calibration.json` | Seat offsets consumed by `run.py` (currently all zeros) |

## What the experiments measure

1. **Question balance** — every question's split ratio and information gain (bits)
   against the full creature set.
2. **Player-count scaling** — skill win rate vs randoms; seat fairness in mirror
   matches (FPA = max − min seat win rate); game length; guess accuracy; q at hit.
3. **Threshold sweep** — how the guess-confidence threshold trades game length vs
   accuracy (the push-your-luck dial).
4. **Degenerate probe** — always-guess / never-guess must not dominate.
5. **Verdict** — acceptance targets from the design spec, auto-checked.

## Design decisions proven by simulation (see REPORT.md)

- **Equal-turn finish** instead of immediate win removed most of the race advantage.
- **First-player marker rotation each round** removed the late-seat listening
  advantage (spread dropped from ~20-28% to ~1-3%; verified at 1.2% over 5000 games).
- **Wrong-guess penalty raised to −2** brought the AlwaysGuess free-rider from 30% to ~21%.
- Token compensation was explored and rejected: calibration results were
  indistinguishable from noise once rotation was in place.
