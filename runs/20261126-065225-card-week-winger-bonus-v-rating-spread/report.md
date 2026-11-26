# Balance: card week winger bonus v rating spread

Does the rating spread explain why a bonus on the wingers lowered the holder's win rate? Flat 60 v 60, home carries the bonus, played with the spread as shipped (0.2) and with sheets as written (1). 500 whole matches per row (250 seeds both ways).

**commit** 8f4697f9 · **branch** claude/feature-idea-review-144cb5 · **started** 2026-11-26T06:52:25.542Z

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
| even 60 v 60 | 500 | 50.0% ± 2.1% |
| wingers +25 all stats | 500 | 37.2% ± 2.0% |
| wingers +25, expansive attack | 500 | 36.5% ± 2.0% |
| even, expansive attack | 500 | 47.4% ± 2.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | tracked | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.7 | 0.5 | 0.0 | 0.3 | 0.0 | 4.7 | 4.7 |
| even 60 v 60 | opponent | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.7 | 0.5 | 0.0 | 0.3 | 0.0 | 4.7 | 4.7 |
| wingers +25 all stats | tracked | 1.2 | 2.7 | 2.5 | 0.8 | 2.5 | 1.9 | 1.9 | 0.5 | 0.0 | 0.2 | 0.1 | 4.2 | 6.3 |
| wingers +25 all stats | opponent | 1.2 | 3.2 | 3.0 | 1.2 | 3.0 | 2.9 | 1.9 | 0.6 | 0.1 | 0.3 | 0.1 | 6.3 | 4.2 |
| wingers +25, expansive attack | tracked | 1.5 | 2.4 | 2.2 | 0.8 | 2.3 | 2.0 | 1.8 | 0.4 | 0.0 | 0.1 | 0.0 | 3.9 | 6.2 |
| wingers +25, expansive attack | opponent | 1.3 | 3.2 | 3.0 | 1.1 | 2.9 | 2.8 | 1.8 | 0.5 | 0.1 | 0.3 | 0.1 | 6.2 | 3.9 |
| even, expansive attack | tracked | 1.5 | 2.8 | 2.5 | 0.8 | 2.5 | 2.3 | 1.8 | 0.5 | 0.1 | 0.2 | 0.0 | 4.3 | 4.7 |
| even, expansive attack | opponent | 1.2 | 3.1 | 2.6 | 0.9 | 2.9 | 2.3 | 1.7 | 0.5 | 0.1 | 0.3 | 0.0 | 4.7 | 4.3 |

## Attack × defence points share — sheets as written

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — sheets as written

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| even 60 v 60 | 500 | 50.0% ± 2.1% |
| wingers +25 all stats | 500 | 57.1% ± 2.0% |
| wingers +25, expansive attack | 500 | 56.3% ± 2.0% |
| even, expansive attack | 500 | 47.4% ± 2.0% |

## Per-side counts — sheets as written

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | tracked | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.7 | 0.5 | 0.0 | 0.3 | 0.0 | 4.7 | 4.7 |
| even 60 v 60 | opponent | 1.2 | 3.0 | 2.6 | 0.9 | 2.8 | 2.4 | 1.7 | 0.5 | 0.0 | 0.3 | 0.0 | 4.7 | 4.7 |
| wingers +25 all stats | tracked | 1.2 | 3.2 | 3.1 | 1.0 | 2.7 | 2.7 | 1.8 | 0.5 | 0.0 | 0.3 | 0.1 | 5.4 | 4.2 |
| wingers +25 all stats | opponent | 1.1 | 2.7 | 2.5 | 0.8 | 2.8 | 2.0 | 1.9 | 0.5 | 0.0 | 0.3 | 0.0 | 4.2 | 5.4 |
| wingers +25, expansive attack | tracked | 1.6 | 2.8 | 2.7 | 1.0 | 2.4 | 2.8 | 1.7 | 0.4 | 0.1 | 0.1 | 0.0 | 4.9 | 4.1 |
| wingers +25, expansive attack | opponent | 1.0 | 2.8 | 2.5 | 0.8 | 3.0 | 2.1 | 1.7 | 0.6 | 0.0 | 0.3 | 0.1 | 4.1 | 4.9 |
| even, expansive attack | tracked | 1.5 | 2.8 | 2.5 | 0.8 | 2.5 | 2.3 | 1.8 | 0.5 | 0.1 | 0.2 | 0.0 | 4.3 | 4.7 |
| even, expansive attack | opponent | 1.2 | 3.1 | 2.6 | 0.9 | 2.9 | 2.3 | 1.7 | 0.5 | 0.1 | 0.3 | 0.0 | 4.7 | 4.3 |

_8 cells in 826 s._
