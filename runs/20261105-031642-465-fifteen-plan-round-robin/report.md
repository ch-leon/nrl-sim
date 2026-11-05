# Balance: 465 fifteen plan round robin

Every unordered pair of the 15 plans on flat 60; 100 seeds in each orientation (200 matches per pairing, 2800 per plan). Report both sides points share for each plan and aggregate attack/defence styles; no average above 53%.

**commit** eefbaaa · **branch** HEAD · **started** 2026-11-05T03:16:42.957Z

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
| grind/slide v grind/rush | 200 | 42.3% ± 3.4% |
| grind/slide v grind/compressed | 200 | 37.5% ± 3.3% |
| grind/slide v balanced/slide | 200 | 53.5% ± 3.4% |
| grind/slide v balanced/rush | 200 | 48.8% ± 3.4% |
| grind/slide v balanced/compressed | 200 | 42.5% ± 3.4% |
| grind/slide v expansive/slide | 200 | 55.0% ± 3.3% |
| grind/slide v expansive/rush | 200 | 56.8% ± 3.4% |
| grind/slide v expansive/compressed | 200 | 45.3% ± 3.4% |
| grind/slide v kick-chase/slide | 200 | 59.3% ± 3.4% |
| grind/slide v kick-chase/rush | 200 | 48.0% ± 3.4% |
| grind/slide v kick-chase/compressed | 200 | 47.0% ± 3.4% |
| grind/slide v all-out/slide | 200 | 56.5% ± 3.4% |
| grind/slide v all-out/rush | 200 | 42.0% ± 3.4% |
| grind/slide v all-out/compressed | 200 | 44.5% ± 3.4% |
| grind/rush v grind/compressed | 200 | 51.2% ± 3.4% |
| grind/rush v balanced/slide | 200 | 57.5% ± 3.4% |
| grind/rush v balanced/rush | 200 | 56.8% ± 3.4% |
| grind/rush v balanced/compressed | 200 | 48.0% ± 3.4% |
| grind/rush v expansive/slide | 200 | 57.5% ± 3.4% |
| grind/rush v expansive/rush | 200 | 46.8% ± 3.4% |
| grind/rush v expansive/compressed | 200 | 40.8% ± 3.4% |
| grind/rush v kick-chase/slide | 200 | 51.2% ± 3.4% |
| grind/rush v kick-chase/rush | 200 | 41.8% ± 3.4% |
| grind/rush v kick-chase/compressed | 200 | 35.0% ± 3.3% |
| grind/rush v all-out/slide | 200 | 60.3% ± 3.3% |
| grind/rush v all-out/rush | 200 | 47.8% ± 3.4% |
| grind/rush v all-out/compressed | 200 | 52.8% ± 3.4% |
| grind/compressed v balanced/slide | 200 | 63.7% ± 3.2% |
| grind/compressed v balanced/rush | 200 | 52.5% ± 3.5% |
| grind/compressed v balanced/compressed | 200 | 49.5% ± 3.4% |
| grind/compressed v expansive/slide | 200 | 52.3% ± 3.4% |
| grind/compressed v expansive/rush | 200 | 44.0% ± 3.4% |
| grind/compressed v expansive/compressed | 200 | 40.8% ± 3.4% |
| grind/compressed v kick-chase/slide | 200 | 50.2% ± 3.4% |
| grind/compressed v kick-chase/rush | 200 | 45.5% ± 3.5% |
| grind/compressed v kick-chase/compressed | 200 | 39.0% ± 3.4% |
| grind/compressed v all-out/slide | 200 | 58.8% ± 3.4% |
| grind/compressed v all-out/rush | 200 | 55.3% ± 3.4% |
| grind/compressed v all-out/compressed | 200 | 43.0% ± 3.4% |
| balanced/slide v balanced/rush | 200 | 48.8% ± 3.5% |
| balanced/slide v balanced/compressed | 200 | 52.5% ± 3.4% |
| balanced/slide v expansive/slide | 200 | 54.8% ± 3.4% |
| balanced/slide v expansive/rush | 200 | 42.0% ± 3.4% |
| balanced/slide v expansive/compressed | 200 | 50.7% ± 3.5% |
| balanced/slide v kick-chase/slide | 200 | 55.8% ± 3.4% |
| balanced/slide v kick-chase/rush | 200 | 58.0% ± 3.4% |
| balanced/slide v kick-chase/compressed | 200 | 54.8% ± 3.4% |
| balanced/slide v all-out/slide | 200 | 43.5% ± 3.4% |
| balanced/slide v all-out/rush | 200 | 50.5% ± 3.4% |
| balanced/slide v all-out/compressed | 200 | 43.5% ± 3.4% |
| balanced/rush v balanced/compressed | 200 | 52.5% ± 3.4% |
| balanced/rush v expansive/slide | 200 | 49.0% ± 3.5% |
| balanced/rush v expansive/rush | 200 | 48.3% ± 3.4% |
| balanced/rush v expansive/compressed | 200 | 48.8% ± 3.4% |
| balanced/rush v kick-chase/slide | 200 | 44.0% ± 3.4% |
| balanced/rush v kick-chase/rush | 200 | 38.0% ± 3.3% |
| balanced/rush v kick-chase/compressed | 200 | 44.5% ± 3.4% |
| balanced/rush v all-out/slide | 200 | 56.0% ± 3.4% |
| balanced/rush v all-out/rush | 200 | 49.8% ± 3.5% |
| balanced/rush v all-out/compressed | 200 | 52.3% ± 3.4% |
| balanced/compressed v expansive/slide | 200 | 44.8% ± 3.4% |
| balanced/compressed v expansive/rush | 200 | 46.8% ± 3.4% |
| balanced/compressed v expansive/compressed | 200 | 48.3% ± 3.4% |
| balanced/compressed v kick-chase/slide | 200 | 44.0% ± 3.4% |
| balanced/compressed v kick-chase/rush | 200 | 51.2% ± 3.4% |
| balanced/compressed v kick-chase/compressed | 200 | 41.0% ± 3.3% |
| balanced/compressed v all-out/slide | 200 | 48.5% ± 3.5% |
| balanced/compressed v all-out/rush | 200 | 47.3% ± 3.5% |
| balanced/compressed v all-out/compressed | 200 | 48.0% ± 3.4% |
| expansive/slide v expansive/rush | 200 | 45.3% ± 3.4% |
| expansive/slide v expansive/compressed | 200 | 54.8% ± 3.4% |
| expansive/slide v kick-chase/slide | 200 | 58.5% ± 3.4% |
| expansive/slide v kick-chase/rush | 200 | 54.5% ± 3.4% |
| expansive/slide v kick-chase/compressed | 200 | 50.7% ± 3.4% |
| expansive/slide v all-out/slide | 200 | 43.8% ± 3.4% |
| expansive/slide v all-out/rush | 200 | 48.3% ± 3.4% |
| expansive/slide v all-out/compressed | 200 | 51.0% ± 3.4% |
| expansive/rush v expansive/compressed | 200 | 44.8% ± 3.4% |
| expansive/rush v kick-chase/slide | 200 | 39.8% ± 3.4% |
| expansive/rush v kick-chase/rush | 200 | 44.3% ± 3.4% |
| expansive/rush v kick-chase/compressed | 200 | 45.8% ± 3.4% |
| expansive/rush v all-out/slide | 200 | 52.0% ± 3.4% |
| expansive/rush v all-out/rush | 200 | 54.0% ± 3.4% |
| expansive/rush v all-out/compressed | 200 | 63.2% ± 3.3% |
| expansive/compressed v kick-chase/slide | 200 | 44.8% ± 3.4% |
| expansive/compressed v kick-chase/rush | 200 | 46.5% ± 3.4% |
| expansive/compressed v kick-chase/compressed | 200 | 55.0% ± 3.4% |
| expansive/compressed v all-out/slide | 200 | 53.0% ± 3.4% |
| expansive/compressed v all-out/rush | 200 | 51.5% ± 3.4% |
| expansive/compressed v all-out/compressed | 200 | 53.5% ± 3.4% |
| kick-chase/slide v kick-chase/rush | 200 | 62.5% ± 3.3% |
| kick-chase/slide v kick-chase/compressed | 200 | 57.5% ± 3.4% |
| kick-chase/slide v all-out/slide | 200 | 42.5% ± 3.4% |
| kick-chase/slide v all-out/rush | 200 | 53.3% ± 3.5% |
| kick-chase/slide v all-out/compressed | 200 | 49.5% ± 3.5% |
| kick-chase/rush v kick-chase/compressed | 200 | 50.2% ± 3.5% |
| kick-chase/rush v all-out/slide | 200 | 52.0% ± 3.4% |
| kick-chase/rush v all-out/rush | 200 | 56.0% ± 3.4% |
| kick-chase/rush v all-out/compressed | 200 | 60.8% ± 3.4% |
| kick-chase/compressed v all-out/slide | 200 | 52.0% ± 3.4% |
| kick-chase/compressed v all-out/rush | 200 | 52.5% ± 3.4% |
| kick-chase/compressed v all-out/compressed | 200 | 54.3% ± 3.4% |
| all-out/slide v all-out/rush | 200 | 42.0% ± 3.4% |
| all-out/slide v all-out/compressed | 200 | 48.0% ± 3.5% |
| all-out/rush v all-out/compressed | 200 | 58.0% ± 3.4% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind/slide v grind/rush | tracked | 2.2 | 23.1 | 4.8 | 2.5 | 9.7 | 5.8 | 4.8 | 1.2 | 0.1 | 1.2 | 0.2 | 13.2 | 15.3 |
| grind/slide v grind/rush | opponent | 3.3 | 11.6 | 6.4 | 2.9 | 9.6 | 4.5 | 4.6 | 1.3 | 0.1 | 1.0 | 0.1 | 15.3 | 13.2 |
| grind/slide v grind/compressed | tracked | 1.3 | 5.2 | 4.7 | 2.2 | 9.9 | 5.5 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 11.7 | 15.4 |
| grind/slide v grind/compressed | opponent | 3.4 | 11.7 | 6.9 | 2.9 | 9.8 | 4.9 | 4.7 | 1.3 | 0.1 | 1.1 | 0.1 | 15.4 | 11.7 |
| grind/slide v balanced/slide | tracked | 3.3 | 11.6 | 6.0 | 3.0 | 9.6 | 4.5 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 15.6 | 13.9 |
| grind/slide v balanced/slide | opponent | 3.7 | 8.6 | 7.2 | 2.7 | 8.6 | 7.2 | 5.3 | 1.6 | 0.1 | 0.9 | 0.1 | 13.9 | 15.6 |
| grind/slide v balanced/rush | tracked | 2.4 | 22.9 | 4.8 | 2.7 | 9.5 | 6.2 | 4.9 | 1.1 | 0.0 | 1.1 | 0.2 | 14.2 | 14.7 |
| grind/slide v balanced/rush | opponent | 3.7 | 8.9 | 7.4 | 2.8 | 9.1 | 7.3 | 5.2 | 1.8 | 0.2 | 1.0 | 0.1 | 14.7 | 14.2 |
| grind/slide v balanced/compressed | tracked | 1.1 | 5.0 | 4.5 | 2.6 | 9.9 | 5.7 | 4.7 | 1.2 | 0.1 | 1.3 | 0.2 | 13.4 | 15.0 |
| grind/slide v balanced/compressed | opponent | 4.0 | 9.0 | 7.4 | 2.9 | 9.0 | 7.5 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 15.0 | 13.4 |
| grind/slide v expansive/slide | tracked | 3.2 | 11.3 | 6.2 | 3.0 | 9.4 | 4.7 | 4.7 | 1.1 | 0.1 | 1.2 | 0.1 | 15.7 | 14.3 |
| grind/slide v expansive/slide | opponent | 4.5 | 8.4 | 6.8 | 2.8 | 9.0 | 7.2 | 4.8 | 1.8 | 0.1 | 0.8 | 0.2 | 14.3 | 15.7 |
| grind/slide v expansive/rush | tracked | 2.3 | 23.0 | 4.8 | 2.9 | 9.7 | 5.9 | 4.9 | 1.2 | 0.1 | 1.1 | 0.2 | 15.2 | 14.2 |
| grind/slide v expansive/rush | opponent | 4.8 | 8.7 | 6.9 | 2.8 | 8.9 | 6.9 | 5.2 | 1.8 | 0.2 | 0.9 | 0.1 | 14.2 | 15.2 |
| grind/slide v expansive/compressed | tracked | 1.2 | 5.0 | 4.7 | 2.4 | 9.7 | 5.4 | 4.6 | 1.2 | 0.1 | 1.1 | 0.1 | 12.2 | 14.0 |
| grind/slide v expansive/compressed | opponent | 4.6 | 8.5 | 6.8 | 2.7 | 8.8 | 6.9 | 5.0 | 1.7 | 0.1 | 0.7 | 0.1 | 14.0 | 12.2 |
| grind/slide v kick-chase/slide | tracked | 3.4 | 11.5 | 6.2 | 3.0 | 10.0 | 4.7 | 4.5 | 1.1 | 0.1 | 1.2 | 0.1 | 15.7 | 13.1 |
| grind/slide v kick-chase/slide | opponent | 2.0 | 8.7 | 5.7 | 2.5 | 9.5 | 7.0 | 4.9 | 2.6 | 0.1 | 1.1 | 0.1 | 13.1 | 15.7 |
| grind/slide v kick-chase/rush | tracked | 2.4 | 22.7 | 4.7 | 2.5 | 9.8 | 5.9 | 4.6 | 1.0 | 0.1 | 1.0 | 0.1 | 13.4 | 13.7 |
| grind/slide v kick-chase/rush | opponent | 2.2 | 8.9 | 6.1 | 2.6 | 10.0 | 7.5 | 4.7 | 2.6 | 0.1 | 1.4 | 0.1 | 13.7 | 13.4 |
| grind/slide v kick-chase/compressed | tracked | 0.9 | 5.0 | 4.8 | 2.5 | 10.1 | 5.6 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 12.9 | 14.0 |
| grind/slide v kick-chase/compressed | opponent | 2.2 | 9.2 | 5.9 | 2.7 | 9.8 | 7.0 | 5.2 | 2.7 | 0.1 | 1.2 | 0.0 | 14.0 | 12.9 |
| grind/slide v all-out/slide | tracked | 3.1 | 11.0 | 6.0 | 2.9 | 9.4 | 4.3 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 15.4 | 14.7 |
| grind/slide v all-out/slide | opponent | 6.3 | 10.4 | 7.6 | 2.8 | 8.3 | 7.0 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 14.7 | 15.4 |
| grind/slide v all-out/rush | tracked | 2.2 | 21.9 | 4.7 | 2.8 | 9.6 | 5.8 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.7 | 15.9 |
| grind/slide v all-out/rush | opponent | 6.6 | 10.4 | 8.1 | 3.1 | 8.3 | 7.8 | 5.4 | 2.0 | 0.2 | 0.8 | 0.2 | 15.9 | 14.7 |
| grind/slide v all-out/compressed | tracked | 1.1 | 4.8 | 4.6 | 2.6 | 9.8 | 5.3 | 4.5 | 1.2 | 0.1 | 1.3 | 0.2 | 13.6 | 15.2 |
| grind/slide v all-out/compressed | opponent | 6.3 | 10.1 | 7.8 | 2.9 | 8.3 | 7.6 | 5.6 | 2.1 | 0.2 | 0.7 | 0.1 | 15.2 | 13.6 |
| grind/rush v grind/compressed | tracked | 1.3 | 5.5 | 5.0 | 2.5 | 10.5 | 5.6 | 4.5 | 1.4 | 0.1 | 1.3 | 0.2 | 13.3 | 12.9 |
| grind/rush v grind/compressed | opponent | 2.3 | 23.6 | 4.8 | 2.5 | 9.5 | 5.9 | 4.9 | 1.3 | 0.1 | 1.0 | 0.1 | 12.9 | 13.3 |
| grind/rush v balanced/slide | tracked | 3.2 | 11.8 | 6.2 | 3.1 | 9.8 | 4.3 | 4.8 | 1.2 | 0.1 | 1.2 | 0.2 | 16.3 | 14.2 |
| grind/rush v balanced/slide | opponent | 3.8 | 22.2 | 6.0 | 2.7 | 8.4 | 9.9 | 5.2 | 1.5 | 0.1 | 0.9 | 0.1 | 14.2 | 16.3 |
| grind/rush v balanced/rush | tracked | 2.3 | 23.7 | 5.0 | 3.1 | 9.6 | 6.4 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 16.2 | 14.7 |
| grind/rush v balanced/rush | opponent | 3.5 | 22.9 | 6.2 | 2.8 | 8.4 | 9.6 | 5.5 | 1.8 | 0.1 | 0.8 | 0.1 | 14.7 | 16.2 |
| grind/rush v balanced/compressed | tracked | 1.2 | 5.2 | 4.7 | 2.6 | 9.8 | 5.5 | 4.6 | 1.3 | 0.1 | 1.1 | 0.2 | 13.6 | 14.4 |
| grind/rush v balanced/compressed | opponent | 3.8 | 22.6 | 6.2 | 2.7 | 8.8 | 9.7 | 5.6 | 1.9 | 0.2 | 0.9 | 0.1 | 14.4 | 13.6 |
| grind/rush v expansive/slide | tracked | 3.2 | 11.6 | 6.1 | 3.1 | 9.6 | 4.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 16.0 | 15.1 |
| grind/rush v expansive/slide | opponent | 5.0 | 23.3 | 5.8 | 2.9 | 8.6 | 9.9 | 5.1 | 1.8 | 0.2 | 0.7 | 0.2 | 15.1 | 16.0 |
| grind/rush v expansive/rush | tracked | 2.4 | 23.4 | 4.8 | 3.1 | 9.3 | 5.8 | 4.5 | 1.2 | 0.1 | 1.1 | 0.2 | 16.0 | 16.7 |
| grind/rush v expansive/rush | opponent | 5.0 | 23.6 | 6.5 | 3.2 | 8.4 | 10.3 | 5.1 | 1.8 | 0.2 | 0.8 | 0.1 | 16.7 | 16.0 |
| grind/rush v expansive/compressed | tracked | 1.0 | 5.0 | 4.6 | 2.6 | 9.5 | 5.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 13.6 | 16.3 |
| grind/rush v expansive/compressed | opponent | 4.8 | 24.3 | 6.3 | 3.2 | 8.5 | 10.1 | 5.2 | 1.8 | 0.2 | 0.7 | 0.1 | 16.3 | 13.6 |
| grind/rush v kick-chase/slide | tracked | 3.0 | 11.1 | 6.0 | 3.1 | 9.4 | 4.3 | 5.0 | 1.2 | 0.1 | 1.0 | 0.2 | 16.5 | 17.1 |
| grind/rush v kick-chase/slide | opponent | 2.4 | 23.0 | 6.7 | 3.3 | 9.9 | 9.5 | 4.9 | 2.6 | 0.4 | 1.2 | 0.4 | 17.1 | 16.5 |
| grind/rush v kick-chase/rush | tracked | 2.2 | 22.4 | 4.7 | 2.8 | 9.5 | 6.0 | 4.9 | 1.2 | 0.1 | 1.2 | 0.2 | 14.8 | 17.4 |
| grind/rush v kick-chase/rush | opponent | 2.5 | 23.5 | 7.3 | 3.3 | 9.7 | 10.1 | 5.3 | 2.6 | 0.4 | 1.3 | 0.5 | 17.4 | 14.8 |
| grind/rush v kick-chase/compressed | tracked | 1.1 | 5.0 | 4.6 | 2.7 | 9.9 | 5.0 | 4.8 | 1.4 | 0.1 | 1.1 | 0.2 | 13.8 | 17.3 |
| grind/rush v kick-chase/compressed | opponent | 2.4 | 22.7 | 6.9 | 3.3 | 9.8 | 10.3 | 5.3 | 2.7 | 0.4 | 1.3 | 0.5 | 17.3 | 13.8 |
| grind/rush v all-out/slide | tracked | 3.2 | 11.5 | 6.1 | 3.3 | 9.6 | 4.1 | 4.8 | 1.3 | 0.1 | 1.3 | 0.1 | 17.3 | 14.6 |
| grind/rush v all-out/slide | opponent | 6.7 | 22.3 | 6.3 | 2.8 | 8.0 | 9.8 | 6.0 | 1.6 | 0.2 | 0.8 | 0.1 | 14.6 | 17.3 |
| grind/rush v all-out/rush | tracked | 2.3 | 23.4 | 4.8 | 3.1 | 9.4 | 5.8 | 4.7 | 1.1 | 0.1 | 1.0 | 0.1 | 15.9 | 15.7 |
| grind/rush v all-out/rush | opponent | 6.9 | 23.5 | 6.6 | 3.0 | 8.1 | 10.1 | 5.6 | 1.8 | 0.2 | 0.7 | 0.1 | 15.7 | 15.9 |
| grind/rush v all-out/compressed | tracked | 1.2 | 5.2 | 4.5 | 2.8 | 10.0 | 5.5 | 4.4 | 1.2 | 0.1 | 1.2 | 0.2 | 14.4 | 14.2 |
| grind/rush v all-out/compressed | opponent | 6.9 | 22.9 | 6.2 | 2.7 | 8.2 | 9.9 | 5.9 | 1.8 | 0.2 | 0.8 | 0.1 | 14.2 | 14.4 |
| grind/compressed v balanced/slide | tracked | 3.2 | 11.4 | 6.4 | 3.2 | 9.7 | 4.6 | 4.4 | 1.2 | 0.1 | 1.1 | 0.1 | 16.8 | 13.2 |
| grind/compressed v balanced/slide | opponent | 2.3 | 6.9 | 6.6 | 2.6 | 8.5 | 9.0 | 5.3 | 1.6 | 0.2 | 1.0 | 0.1 | 13.2 | 16.8 |
| grind/compressed v balanced/rush | tracked | 2.3 | 23.0 | 4.8 | 2.9 | 9.6 | 5.9 | 4.8 | 1.2 | 0.1 | 1.1 | 0.1 | 15.2 | 14.5 |
| grind/compressed v balanced/rush | opponent | 2.6 | 7.1 | 7.0 | 2.8 | 8.9 | 9.3 | 5.4 | 1.8 | 0.1 | 1.0 | 0.1 | 14.5 | 15.2 |
| grind/compressed v balanced/compressed | tracked | 1.2 | 5.2 | 4.7 | 2.7 | 9.6 | 5.3 | 4.7 | 1.1 | 0.1 | 1.2 | 0.2 | 14.2 | 15.2 |
| grind/compressed v balanced/compressed | opponent | 2.4 | 7.0 | 7.3 | 3.0 | 8.9 | 9.3 | 5.2 | 1.8 | 0.2 | 1.0 | 0.2 | 15.2 | 14.2 |
| grind/compressed v expansive/slide | tracked | 3.0 | 11.4 | 6.2 | 3.0 | 9.7 | 4.3 | 4.6 | 1.3 | 0.1 | 1.2 | 0.2 | 15.8 | 14.8 |
| grind/compressed v expansive/slide | opponent | 3.5 | 12.7 | 7.8 | 3.0 | 8.3 | 9.9 | 5.1 | 1.7 | 0.2 | 0.7 | 0.1 | 14.8 | 15.8 |
| grind/compressed v expansive/rush | tracked | 2.3 | 22.6 | 4.6 | 2.7 | 9.4 | 5.7 | 4.6 | 1.3 | 0.2 | 1.1 | 0.1 | 14.3 | 15.6 |
| grind/compressed v expansive/rush | opponent | 3.7 | 12.7 | 7.9 | 3.1 | 8.8 | 10.1 | 5.1 | 1.9 | 0.2 | 0.8 | 0.1 | 15.6 | 14.3 |
| grind/compressed v expansive/compressed | tracked | 1.2 | 5.2 | 4.6 | 2.6 | 9.6 | 5.4 | 4.7 | 1.3 | 0.1 | 1.1 | 0.2 | 13.3 | 15.7 |
| grind/compressed v expansive/compressed | opponent | 3.8 | 12.5 | 7.9 | 3.1 | 8.6 | 9.4 | 5.2 | 1.9 | 0.1 | 0.8 | 0.1 | 15.7 | 13.3 |
| grind/compressed v kick-chase/slide | tracked | 3.2 | 11.6 | 6.3 | 2.8 | 9.6 | 4.6 | 5.0 | 1.2 | 0.1 | 1.1 | 0.1 | 14.7 | 14.5 |
| grind/compressed v kick-chase/slide | opponent | 1.0 | 6.7 | 6.5 | 2.8 | 10.0 | 8.8 | 5.2 | 2.8 | 0.4 | 1.3 | 0.2 | 14.5 | 14.7 |
| grind/compressed v kick-chase/rush | tracked | 2.3 | 23.0 | 4.8 | 2.7 | 9.4 | 5.8 | 5.1 | 1.2 | 0.1 | 1.1 | 0.2 | 13.9 | 16.0 |
| grind/compressed v kick-chase/rush | opponent | 0.9 | 7.2 | 6.9 | 3.1 | 10.1 | 9.3 | 5.1 | 2.5 | 0.4 | 1.4 | 0.3 | 16.0 | 13.9 |
| grind/compressed v kick-chase/compressed | tracked | 1.1 | 5.0 | 4.6 | 2.5 | 10.1 | 5.4 | 4.8 | 1.2 | 0.2 | 1.1 | 0.1 | 12.9 | 14.7 |
| grind/compressed v kick-chase/compressed | opponent | 1.1 | 6.8 | 6.9 | 2.8 | 9.9 | 9.4 | 5.2 | 2.7 | 0.2 | 1.3 | 0.2 | 14.7 | 12.9 |
| grind/compressed v all-out/slide | tracked | 3.3 | 11.3 | 6.1 | 2.9 | 9.4 | 4.5 | 4.5 | 1.3 | 0.1 | 1.2 | 0.1 | 14.9 | 13.5 |
| grind/compressed v all-out/slide | opponent | 4.7 | 7.2 | 7.1 | 2.6 | 8.3 | 9.5 | 5.5 | 2.1 | 0.2 | 0.7 | 0.1 | 13.5 | 14.9 |
| grind/compressed v all-out/rush | tracked | 2.2 | 22.8 | 4.8 | 2.9 | 9.5 | 6.0 | 4.7 | 1.2 | 0.1 | 1.3 | 0.2 | 15.3 | 14.4 |
| grind/compressed v all-out/rush | opponent | 5.2 | 7.3 | 7.3 | 2.8 | 8.5 | 9.1 | 5.3 | 2.0 | 0.2 | 0.8 | 0.1 | 14.4 | 15.3 |
| grind/compressed v all-out/compressed | tracked | 1.2 | 5.0 | 4.6 | 2.5 | 9.8 | 5.3 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 13.1 | 14.0 |
| grind/compressed v all-out/compressed | opponent | 5.0 | 7.4 | 7.4 | 2.7 | 8.8 | 9.3 | 5.6 | 2.1 | 0.2 | 0.8 | 0.1 | 14.0 | 13.1 |
| balanced/slide v balanced/rush | tracked | 3.6 | 21.6 | 5.8 | 3.0 | 8.6 | 9.3 | 5.1 | 1.4 | 0.2 | 1.0 | 0.2 | 15.8 | 15.8 |
| balanced/slide v balanced/rush | opponent | 3.7 | 8.8 | 7.5 | 3.1 | 8.5 | 7.3 | 5.1 | 1.4 | 0.2 | 1.1 | 0.2 | 15.8 | 15.8 |
| balanced/slide v balanced/compressed | tracked | 2.6 | 7.0 | 6.5 | 3.0 | 8.7 | 9.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.5 | 15.4 |
| balanced/slide v balanced/compressed | opponent | 3.9 | 8.6 | 7.0 | 3.0 | 8.4 | 7.5 | 5.2 | 1.5 | 0.1 | 0.9 | 0.2 | 15.4 | 15.5 |
| balanced/slide v expansive/slide | tracked | 3.7 | 8.3 | 7.2 | 3.1 | 8.7 | 6.9 | 5.4 | 1.6 | 0.2 | 0.9 | 0.2 | 16.3 | 15.1 |
| balanced/slide v expansive/slide | opponent | 4.6 | 8.5 | 6.7 | 2.9 | 8.5 | 7.1 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 15.1 | 16.3 |
| balanced/slide v expansive/rush | tracked | 3.8 | 21.9 | 6.1 | 3.0 | 8.5 | 9.9 | 5.4 | 1.6 | 0.1 | 0.9 | 0.2 | 15.2 | 16.4 |
| balanced/slide v expansive/rush | opponent | 4.4 | 8.4 | 7.1 | 3.2 | 8.7 | 7.2 | 4.9 | 1.7 | 0.1 | 0.7 | 0.1 | 16.4 | 15.2 |
| balanced/slide v expansive/compressed | tracked | 2.4 | 6.9 | 6.7 | 3.0 | 9.0 | 9.0 | 5.1 | 1.8 | 0.2 | 1.0 | 0.2 | 15.5 | 15.2 |
| balanced/slide v expansive/compressed | opponent | 4.7 | 8.5 | 6.5 | 2.9 | 8.7 | 6.7 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 15.2 | 15.5 |
| balanced/slide v kick-chase/slide | tracked | 4.0 | 8.7 | 7.2 | 2.8 | 8.8 | 7.5 | 5.0 | 1.6 | 0.1 | 0.9 | 0.1 | 14.3 | 12.9 |
| balanced/slide v kick-chase/slide | opponent | 2.1 | 8.4 | 5.6 | 2.5 | 9.5 | 6.8 | 4.8 | 2.6 | 0.1 | 1.3 | 0.1 | 12.9 | 14.3 |
| balanced/slide v kick-chase/rush | tracked | 3.8 | 23.0 | 6.0 | 3.0 | 8.8 | 9.9 | 5.1 | 1.6 | 0.1 | 0.9 | 0.2 | 16.0 | 14.9 |
| balanced/slide v kick-chase/rush | opponent | 2.3 | 8.6 | 5.8 | 2.9 | 9.7 | 7.4 | 4.9 | 2.5 | 0.1 | 1.3 | 0.1 | 14.9 | 16.0 |
| balanced/slide v kick-chase/compressed | tracked | 2.4 | 7.2 | 7.0 | 2.8 | 9.1 | 9.2 | 4.8 | 1.6 | 0.2 | 1.0 | 0.1 | 14.2 | 13.0 |
| balanced/slide v kick-chase/compressed | opponent | 2.3 | 8.9 | 5.5 | 2.5 | 9.4 | 6.9 | 4.9 | 2.6 | 0.1 | 1.2 | 0.0 | 13.0 | 14.2 |
| balanced/slide v all-out/slide | tracked | 3.4 | 8.3 | 7.0 | 2.9 | 8.2 | 6.7 | 4.9 | 1.5 | 0.1 | 0.8 | 0.1 | 15.1 | 16.9 |
| balanced/slide v all-out/slide | opponent | 6.6 | 10.1 | 7.9 | 3.3 | 8.4 | 7.3 | 5.3 | 2.1 | 0.3 | 0.8 | 0.2 | 16.9 | 15.1 |
| balanced/slide v all-out/rush | tracked | 3.2 | 22.4 | 5.8 | 3.0 | 8.9 | 9.6 | 5.1 | 1.8 | 0.2 | 1.1 | 0.2 | 15.8 | 15.8 |
| balanced/slide v all-out/rush | opponent | 6.3 | 10.0 | 7.5 | 3.1 | 8.0 | 7.0 | 5.4 | 1.8 | 0.2 | 0.7 | 0.1 | 15.8 | 15.8 |
| balanced/slide v all-out/compressed | tracked | 2.4 | 6.6 | 6.5 | 2.9 | 8.4 | 8.7 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.1 | 16.9 |
| balanced/slide v all-out/compressed | opponent | 6.2 | 10.2 | 7.8 | 3.3 | 8.0 | 7.2 | 5.6 | 2.0 | 0.2 | 0.7 | 0.1 | 16.9 | 15.1 |
| balanced/rush v balanced/compressed | tracked | 2.6 | 7.2 | 6.8 | 3.0 | 8.9 | 8.8 | 5.1 | 1.7 | 0.2 | 1.1 | 0.1 | 15.3 | 14.5 |
| balanced/rush v balanced/compressed | opponent | 3.9 | 21.3 | 5.7 | 2.8 | 8.5 | 9.7 | 5.2 | 1.6 | 0.2 | 0.9 | 0.1 | 14.5 | 15.3 |
| balanced/rush v expansive/slide | tracked | 3.8 | 8.5 | 7.1 | 3.0 | 8.6 | 7.2 | 5.3 | 1.6 | 0.2 | 1.2 | 0.2 | 15.5 | 16.8 |
| balanced/rush v expansive/slide | opponent | 4.8 | 23.4 | 6.2 | 3.2 | 8.4 | 9.5 | 5.0 | 1.7 | 0.1 | 0.7 | 0.1 | 16.8 | 15.5 |
| balanced/rush v expansive/rush | tracked | 3.7 | 22.4 | 5.8 | 3.1 | 8.6 | 9.6 | 5.2 | 1.5 | 0.2 | 1.0 | 0.1 | 16.1 | 16.3 |
| balanced/rush v expansive/rush | opponent | 4.9 | 23.2 | 6.0 | 3.1 | 8.4 | 10.2 | 5.2 | 1.6 | 0.1 | 0.7 | 0.1 | 16.3 | 16.1 |
| balanced/rush v expansive/compressed | tracked | 2.4 | 6.8 | 7.0 | 2.9 | 9.1 | 9.1 | 5.0 | 1.7 | 0.2 | 1.1 | 0.1 | 14.9 | 14.7 |
| balanced/rush v expansive/compressed | opponent | 4.8 | 23.4 | 5.8 | 2.9 | 8.4 | 9.6 | 5.1 | 1.7 | 0.1 | 0.7 | 0.1 | 14.7 | 14.9 |
| balanced/rush v kick-chase/slide | tracked | 3.5 | 8.7 | 7.1 | 2.8 | 8.7 | 7.0 | 5.5 | 1.6 | 0.2 | 0.9 | 0.1 | 14.7 | 17.1 |
| balanced/rush v kick-chase/slide | opponent | 2.3 | 22.4 | 6.7 | 3.3 | 9.8 | 9.9 | 5.0 | 2.6 | 0.4 | 1.2 | 0.4 | 17.1 | 14.7 |
| balanced/rush v kick-chase/rush | tracked | 3.8 | 21.4 | 5.6 | 2.9 | 8.6 | 9.1 | 5.3 | 1.7 | 0.1 | 0.9 | 0.2 | 15.1 | 18.6 |
| balanced/rush v kick-chase/rush | opponent | 2.4 | 22.7 | 6.7 | 3.6 | 9.8 | 9.8 | 5.1 | 2.6 | 0.4 | 1.4 | 0.5 | 18.6 | 15.1 |
| balanced/rush v kick-chase/compressed | tracked | 2.7 | 6.7 | 7.1 | 3.1 | 8.5 | 9.2 | 5.4 | 1.6 | 0.1 | 0.8 | 0.1 | 16.0 | 17.3 |
| balanced/rush v kick-chase/compressed | opponent | 2.1 | 21.8 | 6.4 | 3.3 | 9.1 | 9.4 | 5.3 | 2.5 | 0.4 | 1.1 | 0.4 | 17.3 | 16.0 |
| balanced/rush v all-out/slide | tracked | 3.7 | 8.7 | 7.0 | 3.3 | 8.8 | 7.1 | 5.1 | 1.6 | 0.1 | 1.1 | 0.1 | 16.9 | 15.5 |
| balanced/rush v all-out/slide | opponent | 6.6 | 22.1 | 6.3 | 3.0 | 8.1 | 9.8 | 5.6 | 1.8 | 0.2 | 0.8 | 0.1 | 15.5 | 16.9 |
| balanced/rush v all-out/rush | tracked | 3.8 | 21.9 | 5.9 | 3.2 | 8.6 | 10.0 | 5.4 | 1.5 | 0.1 | 1.0 | 0.1 | 16.4 | 16.4 |
| balanced/rush v all-out/rush | opponent | 6.7 | 22.1 | 6.2 | 3.1 | 7.8 | 10.1 | 5.8 | 1.8 | 0.2 | 0.8 | 0.1 | 16.4 | 16.4 |
| balanced/rush v all-out/compressed | tracked | 2.5 | 6.7 | 6.8 | 3.2 | 8.8 | 8.9 | 5.2 | 1.6 | 0.1 | 1.1 | 0.2 | 16.4 | 15.9 |
| balanced/rush v all-out/compressed | opponent | 6.5 | 22.7 | 6.4 | 3.1 | 7.9 | 10.1 | 5.5 | 1.8 | 0.2 | 0.8 | 0.1 | 15.9 | 16.4 |
| balanced/compressed v expansive/slide | tracked | 3.5 | 8.3 | 6.8 | 2.9 | 8.5 | 7.1 | 5.3 | 1.6 | 0.2 | 0.8 | 0.1 | 14.8 | 16.0 |
| balanced/compressed v expansive/slide | opponent | 3.8 | 12.4 | 7.6 | 3.2 | 8.6 | 9.4 | 4.9 | 1.7 | 0.1 | 0.9 | 0.1 | 16.0 | 14.8 |
| balanced/compressed v expansive/rush | tracked | 3.8 | 22.9 | 6.2 | 3.0 | 8.7 | 9.3 | 5.1 | 1.6 | 0.1 | 1.0 | 0.2 | 15.3 | 15.7 |
| balanced/compressed v expansive/rush | opponent | 3.8 | 11.8 | 7.6 | 3.1 | 8.4 | 9.9 | 5.0 | 1.6 | 0.2 | 0.7 | 0.1 | 15.7 | 15.3 |
| balanced/compressed v expansive/compressed | tracked | 2.3 | 6.9 | 7.0 | 2.7 | 8.8 | 8.9 | 5.1 | 1.7 | 0.1 | 0.9 | 0.1 | 13.9 | 15.2 |
| balanced/compressed v expansive/compressed | opponent | 3.7 | 12.0 | 7.8 | 3.1 | 8.6 | 9.8 | 5.0 | 1.7 | 0.1 | 0.6 | 0.1 | 15.2 | 13.9 |
| balanced/compressed v kick-chase/slide | tracked | 3.6 | 8.2 | 7.1 | 2.7 | 8.6 | 7.0 | 5.5 | 1.6 | 0.1 | 1.0 | 0.1 | 13.8 | 15.5 |
| balanced/compressed v kick-chase/slide | opponent | 1.1 | 6.8 | 6.5 | 2.9 | 9.9 | 8.8 | 4.7 | 2.6 | 0.3 | 1.4 | 0.2 | 15.5 | 13.8 |
| balanced/compressed v kick-chase/rush | tracked | 3.8 | 21.9 | 5.6 | 2.8 | 8.8 | 9.4 | 5.4 | 1.7 | 0.2 | 1.0 | 0.1 | 14.4 | 14.8 |
| balanced/compressed v kick-chase/rush | opponent | 1.1 | 6.4 | 6.4 | 2.8 | 9.9 | 9.2 | 5.1 | 2.6 | 0.3 | 1.3 | 0.3 | 14.8 | 14.4 |
| balanced/compressed v kick-chase/compressed | tracked | 2.3 | 7.0 | 7.1 | 2.7 | 8.5 | 9.6 | 5.1 | 1.6 | 0.1 | 0.8 | 0.1 | 13.7 | 15.2 |
| balanced/compressed v kick-chase/compressed | opponent | 1.0 | 6.8 | 6.7 | 2.9 | 9.9 | 9.1 | 4.7 | 2.5 | 0.3 | 1.3 | 0.2 | 15.2 | 13.7 |
| balanced/compressed v all-out/slide | tracked | 3.5 | 8.5 | 7.1 | 3.0 | 8.4 | 7.0 | 5.2 | 1.5 | 0.1 | 1.0 | 0.2 | 15.5 | 15.7 |
| balanced/compressed v all-out/slide | opponent | 4.9 | 7.0 | 7.1 | 3.0 | 8.4 | 9.1 | 5.3 | 1.9 | 0.1 | 0.7 | 0.1 | 15.7 | 15.5 |
| balanced/compressed v all-out/rush | tracked | 3.6 | 21.7 | 5.9 | 2.9 | 8.4 | 9.2 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 15.2 | 16.2 |
| balanced/compressed v all-out/rush | opponent | 5.0 | 6.9 | 7.2 | 3.2 | 8.3 | 9.1 | 5.2 | 2.0 | 0.2 | 0.7 | 0.1 | 16.2 | 15.2 |
| balanced/compressed v all-out/compressed | tracked | 2.2 | 6.6 | 6.6 | 3.0 | 8.6 | 9.1 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.4 | 16.3 |
| balanced/compressed v all-out/compressed | opponent | 4.7 | 7.4 | 7.3 | 3.1 | 8.3 | 9.0 | 5.1 | 2.0 | 0.2 | 0.8 | 0.1 | 16.3 | 15.4 |
| expansive/slide v expansive/rush | tracked | 5.1 | 23.1 | 5.8 | 3.0 | 8.2 | 9.5 | 5.3 | 1.8 | 0.2 | 0.7 | 0.1 | 15.7 | 16.2 |
| expansive/slide v expansive/rush | opponent | 4.7 | 8.3 | 6.7 | 3.2 | 8.9 | 6.8 | 4.7 | 1.8 | 0.1 | 0.8 | 0.1 | 16.2 | 15.7 |
| expansive/slide v expansive/compressed | tracked | 3.8 | 12.2 | 7.8 | 3.3 | 8.6 | 9.2 | 5.0 | 1.9 | 0.2 | 0.7 | 0.1 | 16.7 | 15.3 |
| expansive/slide v expansive/compressed | opponent | 4.3 | 8.3 | 6.8 | 3.0 | 8.7 | 7.1 | 4.8 | 1.7 | 0.1 | 0.8 | 0.1 | 15.3 | 16.7 |
| expansive/slide v kick-chase/slide | tracked | 4.8 | 9.0 | 7.1 | 2.9 | 9.2 | 7.3 | 4.7 | 1.9 | 0.2 | 0.8 | 0.1 | 14.8 | 12.4 |
| expansive/slide v kick-chase/slide | opponent | 2.2 | 8.4 | 5.6 | 2.4 | 9.3 | 7.1 | 5.1 | 2.4 | 0.1 | 1.2 | 0.1 | 12.4 | 14.8 |
| expansive/slide v kick-chase/rush | tracked | 5.0 | 23.6 | 6.2 | 2.9 | 8.6 | 10.2 | 5.1 | 1.9 | 0.2 | 0.7 | 0.1 | 14.9 | 13.7 |
| expansive/slide v kick-chase/rush | opponent | 2.1 | 8.4 | 5.6 | 2.6 | 9.7 | 7.3 | 4.8 | 2.5 | 0.1 | 1.5 | 0.1 | 13.7 | 14.9 |
| expansive/slide v kick-chase/compressed | tracked | 3.8 | 12.5 | 7.9 | 2.8 | 8.9 | 9.1 | 4.7 | 1.9 | 0.2 | 0.7 | 0.1 | 14.0 | 13.4 |
| expansive/slide v kick-chase/compressed | opponent | 2.2 | 8.4 | 5.5 | 2.6 | 10.1 | 7.1 | 4.7 | 2.7 | 0.1 | 1.4 | 0.1 | 13.4 | 14.0 |
| expansive/slide v all-out/slide | tracked | 4.4 | 8.4 | 6.6 | 2.8 | 8.6 | 6.8 | 4.8 | 1.6 | 0.2 | 0.8 | 0.1 | 14.5 | 16.3 |
| expansive/slide v all-out/slide | opponent | 6.3 | 10.0 | 7.9 | 3.1 | 8.4 | 7.3 | 5.5 | 2.0 | 0.2 | 0.8 | 0.1 | 16.3 | 14.5 |
| expansive/slide v all-out/rush | tracked | 4.9 | 23.1 | 6.0 | 3.1 | 8.7 | 9.8 | 4.8 | 1.7 | 0.1 | 0.8 | 0.2 | 15.8 | 15.8 |
| expansive/slide v all-out/rush | opponent | 6.2 | 10.1 | 7.7 | 3.0 | 8.1 | 7.5 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 15.8 | 15.8 |
| expansive/slide v all-out/compressed | tracked | 3.7 | 12.0 | 7.5 | 3.2 | 8.5 | 9.1 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.1 | 15.5 |
| expansive/slide v all-out/compressed | opponent | 6.3 | 10.0 | 7.3 | 3.0 | 8.1 | 7.1 | 5.2 | 1.9 | 0.2 | 0.6 | 0.1 | 15.5 | 16.1 |
| expansive/rush v expansive/compressed | tracked | 3.9 | 12.1 | 7.4 | 3.1 | 8.3 | 9.3 | 5.0 | 1.8 | 0.2 | 0.8 | 0.1 | 15.9 | 16.8 |
| expansive/rush v expansive/compressed | opponent | 5.3 | 23.5 | 5.9 | 3.3 | 8.6 | 9.8 | 5.0 | 1.8 | 0.1 | 0.6 | 0.1 | 16.8 | 15.9 |
| expansive/rush v kick-chase/slide | tracked | 4.8 | 7.9 | 6.7 | 2.9 | 8.7 | 7.2 | 5.0 | 1.8 | 0.1 | 0.7 | 0.1 | 14.8 | 17.7 |
| expansive/rush v kick-chase/slide | opponent | 2.2 | 22.0 | 6.7 | 3.4 | 9.8 | 9.7 | 5.0 | 2.6 | 0.4 | 1.3 | 0.4 | 17.7 | 14.8 |
| expansive/rush v kick-chase/rush | tracked | 5.1 | 23.0 | 5.9 | 3.2 | 8.1 | 9.9 | 5.2 | 1.6 | 0.2 | 0.6 | 0.1 | 16.2 | 18.5 |
| expansive/rush v kick-chase/rush | opponent | 2.3 | 23.0 | 7.0 | 3.5 | 9.5 | 9.7 | 5.1 | 2.4 | 0.5 | 1.4 | 0.5 | 18.5 | 16.2 |
| expansive/rush v kick-chase/compressed | tracked | 3.6 | 11.8 | 7.5 | 3.1 | 8.5 | 9.2 | 5.0 | 1.7 | 0.1 | 0.7 | 0.1 | 15.9 | 17.1 |
| expansive/rush v kick-chase/compressed | opponent | 2.4 | 21.9 | 6.6 | 3.3 | 9.5 | 9.3 | 5.2 | 2.5 | 0.4 | 1.3 | 0.4 | 17.1 | 15.9 |
| expansive/rush v all-out/slide | tracked | 4.6 | 8.3 | 6.7 | 3.0 | 8.4 | 6.5 | 5.0 | 1.6 | 0.2 | 0.7 | 0.1 | 15.8 | 15.8 |
| expansive/rush v all-out/slide | opponent | 6.4 | 22.4 | 6.6 | 3.1 | 8.0 | 10.3 | 5.6 | 1.9 | 0.2 | 0.8 | 0.1 | 15.8 | 15.8 |
| expansive/rush v all-out/rush | tracked | 5.0 | 23.5 | 6.0 | 3.5 | 8.4 | 10.0 | 5.1 | 1.5 | 0.2 | 0.8 | 0.1 | 18.3 | 16.6 |
| expansive/rush v all-out/rush | opponent | 6.7 | 22.6 | 6.2 | 3.2 | 7.7 | 9.9 | 5.5 | 1.7 | 0.2 | 0.8 | 0.1 | 16.6 | 18.3 |
| expansive/rush v all-out/compressed | tracked | 3.4 | 12.1 | 7.7 | 3.4 | 8.5 | 9.6 | 5.2 | 1.8 | 0.2 | 0.7 | 0.1 | 17.2 | 14.8 |
| expansive/rush v all-out/compressed | opponent | 6.7 | 22.3 | 6.1 | 2.9 | 8.0 | 9.9 | 5.6 | 1.8 | 0.2 | 0.8 | 0.2 | 14.8 | 17.2 |
| expansive/compressed v kick-chase/slide | tracked | 4.4 | 8.5 | 6.7 | 2.7 | 8.5 | 6.8 | 5.0 | 1.7 | 0.1 | 0.7 | 0.1 | 13.9 | 14.8 |
| expansive/compressed v kick-chase/slide | opponent | 1.1 | 6.7 | 6.3 | 2.9 | 9.8 | 8.5 | 5.0 | 2.6 | 0.3 | 1.2 | 0.2 | 14.8 | 13.9 |
| expansive/compressed v kick-chase/rush | tracked | 4.7 | 23.4 | 6.2 | 2.9 | 8.4 | 9.9 | 5.3 | 1.7 | 0.2 | 0.7 | 0.1 | 15.2 | 15.6 |
| expansive/compressed v kick-chase/rush | opponent | 1.2 | 6.9 | 6.5 | 3.0 | 9.9 | 8.9 | 4.7 | 2.6 | 0.3 | 1.3 | 0.2 | 15.6 | 15.2 |
| expansive/compressed v kick-chase/compressed | tracked | 3.9 | 12.2 | 7.9 | 3.1 | 8.7 | 10.0 | 5.1 | 1.8 | 0.1 | 0.6 | 0.1 | 15.4 | 14.6 |
| expansive/compressed v kick-chase/compressed | opponent | 1.2 | 6.4 | 6.4 | 2.8 | 9.9 | 8.6 | 4.8 | 2.7 | 0.3 | 1.3 | 0.2 | 14.6 | 15.4 |
| expansive/compressed v all-out/slide | tracked | 4.4 | 8.4 | 6.9 | 2.9 | 8.6 | 7.1 | 4.9 | 1.8 | 0.2 | 0.8 | 0.1 | 15.2 | 14.2 |
| expansive/compressed v all-out/slide | opponent | 4.9 | 7.0 | 6.9 | 2.7 | 8.1 | 9.4 | 5.4 | 2.0 | 0.2 | 0.7 | 0.1 | 14.2 | 15.2 |
| expansive/compressed v all-out/rush | tracked | 5.1 | 22.8 | 5.7 | 3.1 | 8.3 | 9.7 | 5.1 | 1.6 | 0.2 | 0.7 | 0.1 | 15.9 | 15.0 |
| expansive/compressed v all-out/rush | opponent | 5.1 | 7.0 | 6.8 | 2.9 | 8.6 | 8.9 | 5.3 | 1.8 | 0.2 | 0.9 | 0.1 | 15.0 | 15.9 |
| expansive/compressed v all-out/compressed | tracked | 3.7 | 11.9 | 7.2 | 3.1 | 8.6 | 9.1 | 5.0 | 1.7 | 0.2 | 0.8 | 0.1 | 15.6 | 15.0 |
| expansive/compressed v all-out/compressed | opponent | 4.8 | 7.2 | 7.1 | 2.9 | 8.3 | 9.3 | 5.0 | 1.9 | 0.2 | 0.7 | 0.1 | 15.0 | 15.6 |
| kick-chase/slide v kick-chase/rush | tracked | 2.4 | 23.6 | 7.3 | 3.4 | 9.8 | 9.8 | 4.9 | 2.5 | 0.4 | 1.2 | 0.4 | 17.6 | 13.3 |
| kick-chase/slide v kick-chase/rush | opponent | 2.1 | 8.3 | 5.3 | 2.5 | 9.4 | 7.0 | 5.1 | 2.6 | 0.1 | 1.4 | 0.1 | 13.3 | 17.6 |
| kick-chase/slide v kick-chase/compressed | tracked | 1.1 | 6.9 | 6.7 | 2.8 | 10.2 | 8.8 | 4.7 | 2.6 | 0.2 | 1.2 | 0.2 | 14.7 | 12.8 |
| kick-chase/slide v kick-chase/compressed | opponent | 2.2 | 8.8 | 5.3 | 2.5 | 9.6 | 6.7 | 5.2 | 2.8 | 0.1 | 1.1 | 0.0 | 12.8 | 14.7 |
| kick-chase/slide v all-out/slide | tracked | 2.0 | 7.9 | 5.3 | 2.5 | 9.6 | 6.8 | 4.7 | 2.6 | 0.1 | 1.3 | 0.0 | 12.8 | 14.8 |
| kick-chase/slide v all-out/slide | opponent | 6.4 | 10.1 | 8.0 | 2.9 | 8.5 | 7.4 | 5.0 | 2.0 | 0.2 | 0.8 | 0.1 | 14.8 | 12.8 |
| kick-chase/slide v all-out/rush | tracked | 2.5 | 21.3 | 6.3 | 3.3 | 9.5 | 9.4 | 5.0 | 2.4 | 0.4 | 1.2 | 0.4 | 17.4 | 16.4 |
| kick-chase/slide v all-out/rush | opponent | 6.3 | 9.8 | 7.6 | 3.2 | 8.2 | 7.3 | 5.5 | 1.9 | 0.2 | 0.7 | 0.1 | 16.4 | 17.4 |
| kick-chase/slide v all-out/compressed | tracked | 1.1 | 6.6 | 6.5 | 2.9 | 9.4 | 9.2 | 5.0 | 2.6 | 0.3 | 1.3 | 0.3 | 14.8 | 15.2 |
| kick-chase/slide v all-out/compressed | opponent | 6.2 | 10.0 | 7.4 | 2.9 | 8.3 | 7.5 | 5.5 | 1.9 | 0.2 | 0.8 | 0.1 | 15.2 | 14.8 |
| kick-chase/rush v kick-chase/compressed | tracked | 1.0 | 6.7 | 6.5 | 3.0 | 10.0 | 9.1 | 4.9 | 2.8 | 0.4 | 1.4 | 0.3 | 15.8 | 16.6 |
| kick-chase/rush v kick-chase/compressed | opponent | 2.2 | 22.6 | 6.4 | 3.2 | 9.6 | 9.8 | 5.1 | 2.5 | 0.4 | 1.2 | 0.5 | 16.6 | 15.8 |
| kick-chase/rush v all-out/slide | tracked | 2.0 | 8.8 | 6.0 | 2.8 | 9.7 | 7.0 | 4.7 | 2.5 | 0.1 | 1.5 | 0.1 | 14.8 | 14.2 |
| kick-chase/rush v all-out/slide | opponent | 6.6 | 22.9 | 6.4 | 2.8 | 8.0 | 10.0 | 5.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.2 | 14.8 |
| kick-chase/rush v all-out/rush | tracked | 2.4 | 22.5 | 6.5 | 3.3 | 9.5 | 9.4 | 5.0 | 2.3 | 0.4 | 1.3 | 0.4 | 17.2 | 14.9 |
| kick-chase/rush v all-out/rush | opponent | 7.2 | 22.6 | 6.1 | 2.9 | 7.8 | 10.1 | 6.0 | 1.8 | 0.2 | 0.6 | 0.1 | 14.9 | 17.2 |
| kick-chase/rush v all-out/compressed | tracked | 1.1 | 6.8 | 6.7 | 3.3 | 10.0 | 9.1 | 4.7 | 2.5 | 0.2 | 1.5 | 0.3 | 17.2 | 14.5 |
| kick-chase/rush v all-out/compressed | opponent | 6.3 | 22.1 | 6.1 | 2.8 | 7.8 | 9.8 | 6.0 | 1.7 | 0.2 | 0.7 | 0.1 | 14.5 | 17.2 |
| kick-chase/compressed v all-out/slide | tracked | 2.3 | 8.1 | 5.3 | 2.8 | 9.9 | 7.1 | 4.7 | 2.7 | 0.1 | 1.2 | 0.0 | 14.7 | 14.3 |
| kick-chase/compressed v all-out/slide | opponent | 5.1 | 7.3 | 7.5 | 2.8 | 8.4 | 9.3 | 5.3 | 2.1 | 0.2 | 0.7 | 0.1 | 14.3 | 14.7 |
| kick-chase/compressed v all-out/rush | tracked | 2.2 | 21.4 | 6.3 | 3.3 | 9.3 | 9.7 | 5.0 | 2.5 | 0.4 | 1.2 | 0.4 | 17.4 | 16.1 |
| kick-chase/compressed v all-out/rush | opponent | 5.3 | 7.0 | 7.0 | 3.1 | 8.5 | 9.3 | 5.5 | 2.1 | 0.2 | 0.8 | 0.1 | 16.1 | 17.4 |
| kick-chase/compressed v all-out/compressed | tracked | 1.0 | 6.8 | 6.4 | 3.0 | 10.1 | 8.6 | 4.8 | 2.8 | 0.3 | 1.2 | 0.2 | 15.6 | 14.1 |
| kick-chase/compressed v all-out/compressed | opponent | 5.0 | 7.3 | 7.0 | 2.7 | 8.3 | 9.3 | 5.4 | 2.2 | 0.2 | 0.7 | 0.1 | 14.1 | 15.6 |
| all-out/slide v all-out/rush | tracked | 6.6 | 21.8 | 6.1 | 3.0 | 7.9 | 9.7 | 5.3 | 1.9 | 0.2 | 0.7 | 0.1 | 15.2 | 17.3 |
| all-out/slide v all-out/rush | opponent | 6.5 | 10.1 | 7.6 | 3.3 | 8.1 | 7.3 | 5.2 | 2.0 | 0.1 | 0.7 | 0.1 | 17.3 | 15.2 |
| all-out/slide v all-out/compressed | tracked | 4.8 | 6.9 | 7.1 | 2.8 | 8.3 | 8.8 | 5.1 | 2.0 | 0.2 | 0.8 | 0.1 | 14.5 | 15.4 |
| all-out/slide v all-out/compressed | opponent | 6.1 | 9.5 | 7.4 | 3.0 | 8.2 | 7.3 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.4 | 14.5 |
| all-out/rush v all-out/compressed | tracked | 5.3 | 7.4 | 6.8 | 3.3 | 8.5 | 9.5 | 4.9 | 2.0 | 0.2 | 0.8 | 0.1 | 17.0 | 15.6 |
| all-out/rush v all-out/compressed | opponent | 6.5 | 22.1 | 6.1 | 3.0 | 7.8 | 9.8 | 5.8 | 1.8 | 0.1 | 0.7 | 0.1 | 15.6 | 17.0 |

_105 cells in 15206 s._
