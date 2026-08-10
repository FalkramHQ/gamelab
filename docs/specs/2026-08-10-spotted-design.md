# SPOTTED! — Design Spec

**Date:** 2026-08-10
**Status:** Approved
**Source:** Principles extracted from *Building Blocks of Tabletop Game Design* (Engelstein & Shalev)

## 1. Vision

A competitive deduction card game for 2–5 players (~25 minutes) where players secretly
hold creature cards and interrogate each other with question cards to identify rival
creatures. The scoring system rewards **efficient deduction** (fewer public questions
before a correct guess = more points), which trains decision-tree / information-gain
intuition as an emergent side effect of competitive play.

## 2. Design pillars (from the book)

| Pillar | Mechanism block | Implementation |
|---|---|---|
| Hidden deduction | UNC-08 Hidden Information | Each player's creature is secret; trait matrix is public knowledge |
| Information leakage | UNC-03 Memory / HTI, ReS-17 Targeted Clues | Answers are public: interrogating a rival also feeds every other player |
| Bluffing & Yomi | UNC-01 Betting and Bluffing | Creature identity is stable all round, so question patterns can be read and faked; Misdirect cards enable private answers |
| Push-your-luck | UNC-02 | Guess with little intel = big payout but high bust risk; wrong guesses are publicly revealed |
| Card economy | CAR-04 Draw, Limits, Deck Exhaustion | Hand limit 7, one draw per turn; creature deck exhaustion is the game clock |
| Race to victory | VIC-07 Race, VIC-15 Sudden Death | First to 10 tokens; deck-out ends the round with highest-score tiebreak |
| Fairness | STR-01 Competitive Games | Symmetric start; simulation must verify first-player advantage < ~3% |

## 3. Components

- **Creature deck:** 25 unique creatures, each defined by 5 binary-answerable traits:
  CLASS (mammal/bird/reptile/insect/aquatic), HABITAT (forest/grassland/desert/water/underground),
  SIZE (small/medium/large), DIET (herbivore/carnivore/omnivore), ACTIVITY (diurnal/nocturnal).
  Trait values are distributed so any single-trait question splits the remaining candidates
  roughly 30/70 to 50/50 (verified by simulation).
- **Question deck (~80 cards):** trait questions ("Is your creature NOCTURNAL?") plus 16 special cards:
  Double Probe ×3, Misdirect ×4, Eavesdrop ×3, Cross-Examine ×3, Wild Probe ×3.
- **Tokens:** 25 victory ("Discovery") tokens, yes/no answer tokens per player.
- **Deduction pads:** one per player, a trait grid for tracking public answers.

## 4. Core loop

1. Setup: deal 1 creature (secret) + 6 question cards to each player.
2. On your turn: draw 1 question card, then either play 1 card, make an Identification, or discard 1.
3. Playing a question at a target: target answers honestly and publicly (unless Misdirect/Eavesdrop).
4. Identification: name a rival's full creature. Correct: score `2 + max(0, 4 − q)` where q = public
   answers about that rival this round; rival draws a new creature. Wrong: lose 2 tokens, guess revealed.
5. Game ends when a player reaches 10 tokens: equal-turn finish (round played out so all players
   have had the same number of turns), then highest total wins; creature-deck exhaustion is the
   alternate clock.

## 5. Simulation / testing kit

Python package under `games/spotted/sim/`:
- **Engine:** full rules implementation with deterministic seeds.
- **Agents:** Random, InformationGain (decision-tree optimal questioning), ThresholdGuesser
  (guess when posterior ≥ θ), combined Optimal bot.
- **Experiments:** win rates, first-player advantage, game length, guess accuracy, threshold sweep,
  player-count scaling (2–5), question-deck usage, per-trait information gain.
- **Acceptance targets:** first-player win-rate advantage ≤ 3%; mean game length 15–40 turns;
  optimal-vs-random win rate ≥ 85% (skill is rewarded); no degenerate always-guess strategy.

## 6. Deliverables

1. `docs/specs/2026-08-10-spotted-design.md` (this file)
2. `.qoder/skills/tabletop-game-design/SKILL.md` + `.qoder/agents/tabletop-game-designer.md` — reusable skill
3. `games/spotted/RULES.md`, `games/spotted/cards/*.csv` — complete printable game
4. `games/spotted/sim/` — simulation kit, tests, balance report
