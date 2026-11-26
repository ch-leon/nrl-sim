# Balance: card week link sizing

How big must a card-week team-sheet bonus be before the side holding it wins more? Flat 60 v 60; the home side carries the bonus on the linked positions; 1000 whole matches per row (500 seeds both ways).

**commit** 8f4697f9 · **branch** claude/feature-idea-review-144cb5 · **started** 2026-11-26T06:46:43.002Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| even 60 v 60 | 1000 | 50.0% ± 1.4% |
| halves +3 footyIQ (as proposed) | 1000 | 50.3% ± 1.4% |
| halves +8 all stats | 1000 | 58.6% ± 1.4% |
| halves +15 all stats | 1000 | 64.8% ± 1.4% |
| halves +25 all stats | 1000 | 73.9% ± 1.3% |
| middle +8 all stats (hooker, prop) | 1000 | 60.2% ± 1.4% |
| edge +8 all stats (centre, both wingers) | 1000 | 45.2% ± 1.4% |
| wingers +25 all stats (gold winger size) | 1000 | 38.0% ± 1.4% |
| three links +8 all stats (7 of 9) | 1000 | 55.1% ± 1.4% |
| yardstick 63 v 60 | 1000 | 52.5% ± 1.4% |
| yardstick 68 v 60 | 1000 | 56.3% ± 1.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | tracked | 1.2 | 3.0 | 2.6 | 0.9 | 2.7 | 2.4 | 1.8 | 0.5 | 0.0 | 0.3 | 0.0 | 4.6 | 4.6 |
| even 60 v 60 | opponent | 1.2 | 3.0 | 2.6 | 0.9 | 2.7 | 2.4 | 1.8 | 0.5 | 0.0 | 0.3 | 0.0 | 4.6 | 4.6 |
| halves +3 footyIQ (as proposed) | tracked | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.8 | 0.5 | 0.0 | 0.3 | 0.0 | 4.6 | 4.6 |
| halves +3 footyIQ (as proposed) | opponent | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.8 | 0.5 | 0.0 | 0.3 | 0.0 | 4.6 | 4.6 |
| halves +8 all stats | tracked | 1.2 | 3.0 | 2.9 | 1.1 | 2.9 | 2.5 | 1.8 | 0.5 | 0.1 | 0.3 | 0.1 | 5.8 | 4.4 |
| halves +8 all stats | opponent | 1.1 | 2.8 | 2.7 | 0.8 | 2.7 | 2.2 | 1.8 | 0.5 | 0.1 | 0.3 | 0.1 | 4.4 | 5.8 |
| halves +15 all stats | tracked | 1.2 | 3.1 | 3.3 | 1.3 | 3.0 | 2.6 | 1.7 | 0.5 | 0.1 | 0.3 | 0.0 | 7.1 | 4.3 |
| halves +15 all stats | opponent | 1.1 | 2.7 | 2.7 | 0.8 | 2.8 | 2.1 | 1.7 | 0.5 | 0.1 | 0.3 | 0.1 | 4.3 | 7.1 |
| halves +25 all stats | tracked | 1.2 | 3.2 | 3.7 | 1.7 | 3.1 | 2.9 | 1.5 | 0.5 | 0.1 | 0.3 | 0.1 | 9.4 | 4.2 |
| halves +25 all stats | opponent | 1.1 | 2.4 | 2.8 | 0.8 | 2.6 | 1.8 | 1.7 | 0.5 | 0.1 | 0.3 | 0.1 | 4.2 | 9.4 |
| middle +8 all stats (hooker, prop) | tracked | 1.3 | 3.1 | 3.0 | 1.1 | 2.7 | 2.7 | 1.8 | 0.5 | 0.0 | 0.3 | 0.0 | 5.8 | 4.3 |
| middle +8 all stats (hooker, prop) | opponent | 1.1 | 2.7 | 2.6 | 0.8 | 2.7 | 2.1 | 1.8 | 0.5 | 0.1 | 0.3 | 0.1 | 4.3 | 5.8 |
| edge +8 all stats (centre, both wingers) | tracked | 1.1 | 2.9 | 2.6 | 0.8 | 2.7 | 2.2 | 1.9 | 0.5 | 0.1 | 0.3 | 0.0 | 4.2 | 4.9 |
| edge +8 all stats (centre, both wingers) | opponent | 1.2 | 3.0 | 2.9 | 0.9 | 2.8 | 2.6 | 1.8 | 0.5 | 0.1 | 0.3 | 0.0 | 4.9 | 4.2 |
| wingers +25 all stats (gold winger size) | tracked | 1.1 | 2.7 | 2.5 | 0.8 | 2.5 | 1.9 | 1.8 | 0.5 | 0.0 | 0.2 | 0.1 | 4.2 | 6.3 |
| wingers +25 all stats (gold winger size) | opponent | 1.2 | 3.2 | 3.0 | 1.2 | 3.0 | 2.9 | 1.9 | 0.6 | 0.1 | 0.3 | 0.1 | 6.3 | 4.2 |
| three links +8 all stats (7 of 9) | tracked | 1.2 | 3.0 | 3.1 | 1.0 | 2.8 | 2.7 | 1.7 | 0.5 | 0.1 | 0.3 | 0.1 | 5.6 | 4.4 |
| three links +8 all stats (7 of 9) | opponent | 1.1 | 2.8 | 2.8 | 0.8 | 2.8 | 2.0 | 1.7 | 0.5 | 0.1 | 0.3 | 0.0 | 4.4 | 5.6 |
| yardstick 63 v 60 | tracked | 1.2 | 3.0 | 2.9 | 0.9 | 2.8 | 2.5 | 1.8 | 0.5 | 0.1 | 0.3 | 0.0 | 4.7 | 4.4 |
| yardstick 63 v 60 | opponent | 1.2 | 2.9 | 2.7 | 0.8 | 2.8 | 2.3 | 1.8 | 0.5 | 0.0 | 0.2 | 0.0 | 4.4 | 4.7 |
| yardstick 68 v 60 | tracked | 1.3 | 3.1 | 3.4 | 1.0 | 2.8 | 2.6 | 1.7 | 0.5 | 0.1 | 0.3 | 0.1 | 5.3 | 4.4 |
| yardstick 68 v 60 | opponent | 1.1 | 2.6 | 2.8 | 0.8 | 2.8 | 2.1 | 1.7 | 0.5 | 0.0 | 0.3 | 0.1 | 4.4 | 5.3 |

_11 cells in 1812 s._
