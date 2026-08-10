# GameLab

A reusable laboratory for designing, simulating, and balancing tabletop and card games.

Every game here is built the same way: **concept → spec → mechanism selection →
card lists → rules engine + bots → simulation-backed balance report**. The methodology
is codified as an agent skill, so each new game starts from proven engineering instead
of a blank page.

## Layout

```
gamelab/
├── .qoder/
│   ├── skills/tabletop-game-design/   # THE design methodology (book principles + process)
│   └── agents/tabletop-game-designer.md
├── docs/
│   └── specs/                         # one design spec per game (approved concepts)
├── games/
│   └── spotted/                         # game #1 — competitive creature deduction
│       ├── RULES.md                   #   decision-complete rulebook
│       ├── cards/*.csv                #   printable card content (single source of truth)
│       └── sim/                       #   rules engine, bots, experiments, REPORT.md
└── templates/
    └── new-game.sh                    # scaffold a new game folder
```

## How a game gets made here

1. **Spec** — copy `docs/specs/` format: vision, design pillars mapped to mechanism
   codes from *Building Blocks of Tabletop Game Design* (STR/UNC/CAR/ReS/VIC/…),
   components, core loop, sim acceptance targets.
2. **Content** — card lists as CSVs (`cards/creatures.csv` style) so the physical game
   and the simulator share one source of truth.
3. **Simulate** — every game ships a Python sim kit: rules engine, a random bot, an
   optimal/heuristic bot, and a strategy sweep (`games/spotted/sim/` is the reference).
4. **Balance gate** — a game ships only when its report passes: seat fairness ≤ 3%,
   skill beats randomness ≥ 85%, no degenerate strategy, game length inside the
   play-time envelope.

Read the full methodology: [.qoder/skills/tabletop-game-design/SKILL.md](.qoder/skills/tabletop-game-design/SKILL.md)

## Game catalog

| Game | Players | Time | Pitch | Status |
|---|---|---|---|---|
| [SPOTTED!](games/spotted/README.md) | 2–5 | ~25 min | Secret creatures, public interrogations — the sharpest decision tree wins | ✅ sim-balanced |

## Quick commands

```bash
# scaffold a new game
./templates/new-game.sh my-game-name

# SPOTTED! test kit
python3 -m unittest games.spotted.sim.test_spotted   # unit tests
python3 -m games.spotted.sim.run                    # full balance suite → REPORT.md
```
