---
name: tabletop-game-design
description: >-
  Design exceptionally balanced, engaging tabletop/card games using the mechanism
  catalog from "Building Blocks of Tabletop Game Design" (Engelstein & Shalev).
  Use when asked to design, improve, balance, or playtest any board game, card game,
  or party game, or when the user wants to turn a game idea into a full design with
  rules, card lists, and a simulation-backed balance report.
---

# Tabletop Game Design

Design tabletop and card games like an engineer: pick mechanisms deliberately from the
building-blocks catalog, write a decision-complete ruleset, then **prove balance with
simulation before claiming the design is done**.

## Source of truth

Principles below are distilled from *Building Blocks of Tabletop Game Design*
(Geoffrey Engelstein & Isaac Shalev, CRC Press). The book catalogs ~200 mechanisms in
chapters: Game Structure (STR), Actions (ACT), Resolution (ReS), Game End and Victory
(VIC), Uncertainty (UNC), Economics (ECO), Auctions (AUC), Worker Placement (WPL),
Movement (MOV), Area Control (ARC), Set Collection (SeT), Card Mechanisms (CAR).
Always reference mechanisms by their code (e.g. UNC-08) in design docs so choices are
auditable.

## Non-negotiable principles

1. **Start from the player experience, then pick mechanisms.** A mechanism is an
   ingredient, not a dish. Name the feeling you want (tension, outsmarting, racing)
   first; choose 2–4 mechanisms that produce it. More mechanisms ≠ better.
2. **Symmetry of expectations (STR-01).** Every player must start with a roughly equal
   chance to win. If an inherent advantage exists (first move, seat order), compensate
   it in-game or measure it by simulation and keep it ≤ ~3%.
3. **Hidden information needs stability for bluffing to work (UNC-01).** If hidden
   state changes constantly, reads are impossible and the game degrades to random
   guessing. Keep secret identities stable long enough for patterns to form.
4. **Information leakage is a feature (UNC-03 / ReS-17).** Public answers, open plays,
   and visible resources let players track each other (Hidden Trackable Information).
   Decide deliberately for every piece of information: who learns it, when, and at
   what cost. The best deduction games make *gathering* intel also *leak* intel.
5. **Reward efficient decisions (decision-tree intuition).** Wherever players narrow
   possibilities (deduction, search, bidding), structure payoffs so balanced,
   high-information-gain choices beat naive ones. Skill must measurably beat randomness.
6. **Card economy is a dial, not an afterthought (CAR-04).** Hand limits, draw rates,
   and deck exhaustion control pacing and power. Deck exhaustion is a clean,
   low-bookkeeping game clock.
7. **Push-your-luck creates emotion (UNC-02).** Let players risk settled gains for a
   bigger reward. Keep exact odds hard to compute in your head; if expected value is
   always trivially computable, the game feels stale.
8. **End cleanly (STR-01, VIC-*).** Players remember how a game ended. Avoid shared
   victories and indecisive conclusions; define a deterministic tiebreak.
9. **Prototype fast, simulate early.** The book's best advice: build a physical
   prototype as quickly as possible. For the agent: build a rules engine + bots
   as the prototype; thousands of simulated games replace weeks of intuition.
10. **YAGNI.** A design that needs a rulebook appendix is a design with too many
    mechanisms. Cut until the core loop carries the fun.

## Mechanism quick-reference (most useful blocks)

| Need | Reach for |
|---|---|
| Hidden identity / deduction | UNC-08 Hidden Information, UNC-07 Unknown Information, UNC-05 Asymmetric Info |
| Bluffing, reading opponents | UNC-01 Betting and Bluffing (needs stable hidden info + observable action channel) |
| Deduction tracking tension | UNC-03 Memory / HTI; give players a pad or component aid (Clue-style) |
| Clue-giving between uneven audiences | ReS-17 Targeted Clues (best when *some but not all* guessing is optimal) |
| Risk/reward moments | UNC-02 Push-Your-Luck, AUC-06 Constrained Bidding |
| Card distribution with agency | CAR-06 Drafting (pick-and-pass, snake, Rochester); CAR-04 draw/limit tuning |
| Game clock | CAR-04 deck exhaustion, VIC-09 fixed rounds, VIC-12 fixed events |
| Victory shape | VIC-07 Race, VIC-11 Completing Targets, VIC-15 Circuit Breaker/Sudden Death |
| Fairness tools | ReS-18 Tie-Breakers (resource > positional > random; random endgame tiebreaks feel bad), ACT-14 Advantage Token |
| Self-balancing luck | UNC-09 Probability Management (deck tuning, hand management) |

## Design process (follow in order)

1. **Concept sheet.** One paragraph: player count, play time, target feeling, the one
   clever hook. List design pillars mapped to mechanism codes.
2. **Core loop.** Turn structure in ≤ 8 bullets. If it can't be summarized in one
   breath, simplify.
3. **Information map.** Table of every game secret: who knows it, when it's revealed,
   through which action, and what revealing it costs.
4. **Economy & clock.** Draw/discard/hand-limit numbers; define the game-ending
   trigger(s) and tiebreaks.
5. **Scoring.** Make the score function encode the skill you want to teach (e.g.
   efficiency bonuses for deduction games, tempo bonuses for races).
6. **Card/content lists as CSV** (id, name, traits/values, copies) so the simulation
   and a print pipeline can share one source of truth.
7. **Simulation kit.** Rules engine + at least: a random bot, an optimal/heuristic
   bot, and a strategy-space sweep. Deterministic seeds. Standard metrics below.
8. **Balance pass.** Iterate numbers until acceptance targets pass; record before/after.
9. **Rulebook write-up.** Decision-complete: setup, turn, end, tiebreaks, edge cases,
   component list.

## Standard simulation metrics & acceptance targets

- First-player advantage (win-rate delta): **≤ 3%**
- Mean game length inside the intended play-time envelope
- Optimal-bot vs random-bot win rate: **≥ 85%** (skill must pay)
- Strategy sweep: no degenerate strategy dominates (e.g. always-guess, never-guess)
- Distribution checks: score variance, elimination/comeback frequency, per-card usage
- Trait/question balance (deduction games): every question should split remaining
  candidates between ~30/70 and 50/50 on average; report per-question information gain

## Playtesting guidance (physical)

- Test the core loop with blank cards and a sharpie before any art exists.
- Watch for: kingmaking, runaway leaders, players who can't affect the outcome,
  downtime between turns, rules questions that recur (a rules problem, not a player problem).
- Change one variable per test round; record results.

## Reference example

This workspace is a reusable game lab. New games are scaffolded with
`templates/new-game.sh <name>` (creates `games/<name>/` + a dated spec in
`docs/specs/`). See `games/taxon/`: a deduction card game built end-to-end with this
skill (spec, card CSVs, rules, simulation kit, balance report).
