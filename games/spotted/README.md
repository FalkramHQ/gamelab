# SPOTTED!

A competitive deduction card game for **2–5 players, ~25 minutes**. Secret creatures,
public interrogations, and a score system that rewards the sharpest decision tree.

Designed end-to-end with the `tabletop-game-design` skill (see
`.qoder/skills/tabletop-game-design/SKILL.md`), using mechanism blocks from
*Building Blocks of Tabletop Game Design*.

## Contents

| Path | What it is |
|---|---|
| [RULES.md](RULES.md) | Complete rulebook: setup, turn, specials, scoring, variants |
| [cards/creatures.csv](cards/creatures.csv) | 25 creatures × 5 traits — print as creature cards |
| [cards/questions.csv](cards/questions.csv) | 64 trait questions (18 questions, printed in copies) |
| [cards/specials.csv](cards/specials.csv) | 16 special cards (5 types) |
| [sim/](sim/README.md) | Simulation & testing kit: rules engine, bots, balance report |

## The pitch

Everyone hides a **Specimen** (a creature defined by class, habitat, size, diet, and
activity). On your turn you interrogate a rival with a question card — but answers are
**public**, so hunting for intel also feeds your hunters. When you think you've solved
someone, make an **Identification**: the fewer public questions that were asked about
them, the more you score. Bluff with questions you already know; hoard **Misdirect**
cards for private intel; and push your luck with early guesses.

## Simulation status

All balance targets pass — see [sim/REPORT.md](sim/REPORT.md):
seat fairness ≤ 3% (verified 1.2% at 2p over 5000 games), skill beats randomness
(~97%), no degenerate strategy, game length 29–59 turns for 2–5 players.
