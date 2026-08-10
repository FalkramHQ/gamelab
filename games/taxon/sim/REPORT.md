# TAXON — Simulation & Balance Report

## 1. Question balance (static, full 25-creature deck)

| Question | yes/25 | info gain (bits) |
|---|---|---|
| diet = carnivore | 13/25 | 0.999 |
| size = small | 14/25 | 0.990 |
| activity = diurnal | 15/25 | 0.971 |
| activity = nocturnal | 10/25 | 0.971 |
| diet = herbivore | 7/25 | 0.855 |
| class = mammal | 6/25 | 0.795 |
| class = reptile | 6/25 | 0.795 |
| habitat = grassland | 6/25 | 0.795 |
| habitat = water | 6/25 | 0.795 |
| size = medium | 6/25 | 0.795 |
| class = bird | 5/25 | 0.722 |
| class = insect | 5/25 | 0.722 |
| diet = omnivore | 5/25 | 0.722 |
| habitat = forest | 5/25 | 0.722 |
| size = large | 5/25 | 0.722 |
| habitat = desert | 4/25 | 0.634 |
| habitat = underground | 4/25 | 0.634 |
| class = aquatic | 3/25 | 0.529 |

Mean info gain by trait: activity 0.971, diet 0.859, size 0.836, habitat 0.716, class 0.713
Questions below 0.35 bits (weak splits): 0

## 2. Player-count scaling (1 InfoGain θ=0.5 vs randoms; mirror fairness)

| players | skill win % | mirror seat0 win % | FPA* | mean turns | guess acc | mean q@hit | capped |
|---|---|---|---|---|---|---|---|
| 2 | 97.7 | 51.3 | 2.7 | 28.5 | 74 | 3.07 | 0 |
| 3 | 97.8 | 34.7 | 2.2 | 43.2 | 74 | 3.34 | 0 |
| 4 | 98.0 | 25.2 | 1.4 | 50.9 | 74 | 3.42 | 0 |
| 5 | 97.4 | 19.9 | 1.1 | 58.9 | 74 | 3.45 | 0 |

*FPA = fairness proxy: max seat win rate − min seat win rate in symmetric mirror matches (target ≤ 3%).

## 3. Guess-threshold sweep (mirror, 4 players)

| θ | mean top score | mean turns | guess acc | mean q@hit |
|---|---|---|---|---|
| 0.25 | 11.1 | 43.5 | 51 | 2.63 |
| 0.35 | 10.9 | 51.7 | 74 | 3.43 |
| 0.5 | 10.9 | 51.7 | 74 | 3.43 |
| 0.65 | 10.8 | 60.8 | 100 | 4.14 |
| 0.8 | 10.8 | 60.8 | 100 | 4.14 |
| 1.01 (certain only) | 10.8 | 60.8 | 100 | 4.14 |

## 4. Degenerate strategy probe (4 players, one of each)

| strategy | win % |
|---|---|
| AlwaysGuess | 21.5 |
| NeverGuess | 0.0 |
| InfoGain θ=0.5 | 77.3 |
| Random | 1.2 |

## 5. Verdict

| acceptance target | result | value |
|---|---|---|
| Seat fairness (max FPA ≤ 3%) | PASS | 2.7% |
| Skill beats randomness (≥ 85% win vs randoms) | PASS | 97.4% |
| No degenerate dominance (AlwaysGuess < 25%) | PASS | 21.5% |
| Weak question splits (<0.35 bits) | PASS | 0 found |

Statistical note: at 2000 games the 95% CI on a win-rate spread is ~±3%. A 2-player
mirror re-run at 5000 games measured a seat spread of 1.20% (seed 90000+), so borderline
2p values at this sample size are noise, not a real seat advantage.

