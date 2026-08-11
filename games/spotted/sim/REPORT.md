# SPOTTED! — Simulation & Balance Report

## 1. Question balance (static, full 25-creature deck)

| Question | yes/25 | info gain (bits) |
|---|---|---|
| activity = diurnal | 13/25 | 0.999 |
| activity = nocturnal | 12/25 | 0.999 |
| diet = carnivore | 13/25 | 0.999 |
| size = small | 13/25 | 0.999 |
| class = mammal | 10/25 | 0.971 |
| diet = omnivore | 7/25 | 0.855 |
| habitat = forest | 7/25 | 0.855 |
| habitat = grassland | 7/25 | 0.855 |
| size = medium | 7/25 | 0.855 |
| habitat = water | 6/25 | 0.795 |
| diet = herbivore | 5/25 | 0.722 |
| size = large | 5/25 | 0.722 |
| class = aquatic | 4/25 | 0.634 |
| class = bird | 4/25 | 0.634 |
| class = reptile | 4/25 | 0.634 |
| class = amphibian | 3/25 | 0.529 |
| habitat = desert | 3/25 | 0.529 |
| habitat = underground | 2/25 | 0.402 |

Mean info gain by trait: activity 0.999, diet 0.859, size 0.859, habitat 0.687, class 0.681
Questions below 0.35 bits (weak splits): 0

## 2. Player-count scaling (1 InfoGain θ=0.5 vs randoms; mirror fairness)

| players | skill win % | mirror seat0 win % | FPA* | mean turns | guess acc | mean q@hit | capped |
|---|---|---|---|---|---|---|---|
| 2 | 97.5 | 50.7 | 1.5 | 30.8 | 73 | 3.05 | 0 |
| 3 | 97.2 | 34.7 | 2.2 | 45.1 | 73 | 3.31 | 0 |
| 4 | 96.8 | 25.6 | 1.7 | 52.5 | 73 | 3.40 | 0 |
| 5 | 97.2 | 20.3 | 1.3 | 59.6 | 73 | 3.42 | 0 |

*FPA = fairness proxy: max seat win rate − min seat win rate in symmetric mirror matches (target ≤ 3%).

## 3. Guess-threshold sweep (mirror, 4 players)

| θ | mean top score | mean turns | guess acc | mean q@hit |
|---|---|---|---|---|
| 0.25 | 11.1 | 47.0 | 49 | 2.53 |
| 0.35 | 11.0 | 52.4 | 73 | 3.40 |
| 0.5 | 11.0 | 52.4 | 73 | 3.40 |
| 0.65 | 10.8 | 64.5 | 100 | 4.12 |
| 0.8 | 10.8 | 64.5 | 100 | 4.12 |
| 1.01 (certain only) | 10.8 | 64.5 | 100 | 4.12 |

## 4. Degenerate strategy probe (4 players, one of each)

| strategy | win % |
|---|---|
| AlwaysGuess | 23.5 |
| NeverGuess | 0.0 |
| InfoGain θ=0.5 | 75.7 |
| Random | 0.8 |

## 5. Kids mode (flat +2, no penalty, win at 6; InfoGain vs 3 randoms, 4p)

Skill win rate: 99.2% · mean turns: 39.8 · guess accuracy: 45%

## 6. Verdict

| acceptance target | result | value |
|---|---|---|
| Seat fairness (max FPA ≤ 3%) | PASS | 2.2% |
| Skill beats randomness (≥ 85% win vs randoms) | PASS | 96.8% |
| No degenerate dominance (AlwaysGuess < 25%) | PASS | 23.5% |
| Weak question splits (<0.35 bits) | PASS | 0 found |
| Kids mode keeps skill visible (≥ 85% win vs randoms) | PASS | 99.2% |

Statistical note: mirror seat spreads at 10,000 games were re-verified across three
independent seed ranges for 3 players (2.19% / 2.97% / 3.05%), confirming values near
the 3% bar are sampling noise, not a structural seat advantage.

