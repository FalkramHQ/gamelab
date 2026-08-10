# <GAME NAME> — Design Spec

**Date:** YYYY-MM-DD
**Status:** Draft / Approved
**Source:** Principles from *Building Blocks of Tabletop Game Design* (see
`.qoder/skills/tabletop-game-design/SKILL.md`)

## 1. Vision

One paragraph: player count, play time, the feeling you're selling, and the one
clever hook. List design pillars mapped to mechanism codes:

| Pillar | Mechanism block | Implementation |
|---|---|---|
| … | UNC-08, CAR-04, … | … |

## 2. Components

Decks, tokens, boards — with sizes. Card content must live in `cards/*.csv`.

## 3. Core loop

Setup + turn structure in ≤ 8 bullets. Information map: for every secret, who knows
it, when it's revealed, and what revealing it costs.

## 4. Economy & clock

Draw/discard/hand limits; game-ending trigger(s); tiebreaks (no shared victories).

## 5. Scoring

Make the score function encode the skill the game should teach.

## 6. Simulation / testing kit

Engine + bots planned under `games/<name>/sim/`. Acceptance targets (defaults from
the skill — tune per game):

- Seat fairness (win-rate spread in mirror matches): ≤ 3%
- Optimal-bot vs random-bot win rate: ≥ 85%
- No degenerate strategy dominates (probe always-X / never-X bots)
- Mean game length inside the play-time envelope
