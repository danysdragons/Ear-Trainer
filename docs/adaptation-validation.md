# Adaptive practice validation

Run `node scripts/simulate-adaptation.cjs` to reproduce this table. The script uses the app's actual progression and session-summary functions; it does not use a separate implementation of the rules.

Each row contains 600 simulated sessions: 100 deterministic random seeds × starting gaps of 1, 20, and 100 cents × psychometric slopes of 3 and 6. The synthetic listener has probability `0.5 + 0.5 / (1 + exp(-slope * log(gap / 15)))`, so its 75%-correct threshold is 15 cents, with a 50% guessing floor. For each rule, the known threshold at its nominal target is calculated from that curve.

Accuracy excludes the first 20 answers. Bias and absolute error compare an offered threshold estimate with the known threshold; withheld estimates are excluded from those two error statistics. The estimate count therefore matters when interpreting the error figures. These stationary synthetic listeners do not validate performance in people, with learning, lapses, fatigue, different timbres, replays, or mixed pitch registers.

| Rule | Error step % | Questions | Nominal target % | Accuracy after first 20 % | Estimates shown | Mean bias % | Mean absolute error % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| target | 10 | 50 | 75.0 | 75.4 | 178/600 | 1.4 | 13.4 |
| target | 10 | 200 | 75.0 | 73.9 | 600/600 | 1.5 | 9.2 |
| target | 30 | 50 | 75.0 | 73.1 | 395/600 | 4.1 | 15.4 |
| target | 30 | 200 | 75.0 | 74.6 | 561/600 | 2.6 | 13.4 |
| target | 60 | 50 | 75.0 | 74.6 | 381/600 | 6.6 | 17.5 |
| target | 60 | 200 | 75.0 | 74.9 | 471/600 | 1.5 | 14.9 |
| streak2 | 10 | 50 | 70.7 | 71.4 | 144/600 | 5.3 | 21.4 |
| streak2 | 10 | 200 | 70.7 | 69.6 | 598/600 | -0.9 | 10.0 |
| streak2 | 30 | 50 | 70.7 | 68.9 | 271/600 | -3.6 | 16.1 |
| streak2 | 30 | 200 | 70.7 | 70.2 | 499/600 | -4.4 | 14.8 |
| streak2 | 60 | 50 | 70.7 | 70.3 | 253/600 | -3.3 | 19.6 |
| streak2 | 60 | 200 | 70.7 | 70.4 | 344/600 | -8.3 | 16.3 |
| streak3 | 10 | 50 | 79.4 | 76.7 | 56/600 | -2.2 | 11.7 |
| streak3 | 10 | 200 | 79.4 | 78.1 | 600/600 | 0.9 | 8.9 |
| streak3 | 30 | 50 | 79.4 | 77.8 | 195/600 | 2.0 | 12.7 |
| streak3 | 30 | 200 | 79.4 | 78.8 | 533/600 | -2.0 | 10.6 |
| streak3 | 60 | 50 | 79.4 | 78.8 | 281/600 | -0.1 | 14.3 |
| streak3 | 60 | 200 | 79.4 | 78.8 | 447/600 | -2.4 | 14.1 |

Chance-only listeners: 0/1000 sessions offered an estimate (200 answers, default rule).

The weighted default (75%, 30% widening) reached an average 74.6% after settling in 200-answer sessions, with estimates offered in 561/600 sessions. Their mean absolute threshold error was 13.4%. Short sessions and larger steps showed greater uncertainty. This supports displaying nominal targets and approximate estimates, not treating either as exact measurements or ranking single lucky answers.

The estimator requires at least 40 answers, discards the first 20 for settling, and requires eight subsequent direction reversals. It takes the geometric mean of the latest eight reversal gaps. Unchanged gaps do not count as reversals. Estimates are withheld if any of the latest 20 answers used the 1- or 100-cent boundary, post-settling accuracy has a 95% Wilson lower bound no higher than chance, or geometric means of the latest two ten-answer blocks differ by more than a factor of 1.5. These are conservative engineering gates, not a clinically validated measurement protocol. The Wilson calculation is an evidence gate on accuracy, not a confidence interval for the gap. Repeated sessions can still produce chance findings.

Automated tests additionally vary weighted targets (60%, 75%, 90%), check longer-run tracking, verify streak reset semantics and bounds, and cover early termination, fixed practice, replay, migration, and persistence.
