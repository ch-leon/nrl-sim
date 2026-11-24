# Open-side passing in ordinary matches

The original score-and-clock fixture shows the short side. With 25 seconds left, Dane Addison passes from 17.5 m inside the nearer touchline to Ryder Thornwell, who catches 4.3 m from that line. The clock decision is documented in [#786](https://github.com/ch-leon/nrl-sim/pull/786). The general change to attacking width is in [#799](https://github.com/ch-leon/nrl-sim/pull/799).

## Paired match review

Each of eight fixed club matchups was played twice, with the home and away clubs swapped and the seed held constant, on main `c493cfa4` and the gameplay change `8214a65e`. Both teams used Balanced attack and Slide defence through both halves, with clear weather, generated traits, standard interchange and no coach or controller inputs. The same seeds and teams can produce different rucks after the first changed decision.

| Metric | Main `c493cfa4` | Open side `8214a65e` |
| --- | ---: | ---: |
| Ruck releases | 816 | 783 |
| Outside-third ruck releases | 368 | 395 |
| Complete outside-third to opposite-third winger shifts | 0 | 26 |
| Matches with a complete cross-field winger shift | 0 of 16 | 14 of 16 |
| All completed passes caught by a rostered winger in a wing slot | 38 | 67 |
| Shorter multi-pass shifts to a winger, 14–22.67 m laterally | 6 | 9 |
| Multi-pass moves from the middle third to an outside-third winger, at least 14 m | 5 | 8 |
| Same-edge winger catches, at least 4 m toward the nearer touchline | 23 | 25 |
| Edge rucks with an initial completed pass over 4 m toward the nearer touchline | 69 | 64 |
| Dummy-half carries directly from a ruck | 100 | 98 |

A switch starts with a play-the-ball in an outer third of the 68 m field, completes two or more passes in the same passage, and reaches a rostered winger in a wing slot in the opposite third. Contact or loss of possession ends the passage. The 26 switches occurred in both halves, with either team in possession and in either direction across the field. The winger caught on average 4.85 m behind the starting ruck in the direction of attack. [Original match traces](passing-sample/baseline.jsonl) · [New match traces](passing-sample/final.jsonl) · [Scanner and fixed fixtures](passing-sample/scan.ts)

## Recorded Match Lab passages

Both recordings are at normal speed. Both touchlines are visible throughout.

- First half, Mackay Marlins v Ballarat Bushrangers, seed 2. Start at tick 2209. Mackay moves the ball through six passes from y=64.56 m to Sully Leggett at y=5.01 m, a shift of 59.55 m.
- Second half, Launceston Larrikins v Wagga Swagmen, seed 42. Start at tick 6585. Four passes bring the ball from y=21.22 m to Rafe Haumate at y=63.02 m, a shift of 41.80 m.

The [Notion playbook](https://www.notion.so/4210870d4c44816aafc0dff55e8c3f08) records these rules, both fixtures and the follow-up to the ball carrier’s dummy animation. See the [standard balance run](report.md) for the broader match scenarios.

## Wider balance

Across all 13 standard scenarios and 1,340 five-minute matches, the six preset comparisons scored 49.25%–55.50%. A win counts as one and a draw as half. All six fall within the 42–58% reference range.

A separate integration check used an equipped block play alongside the new wide option, score-and-clock logic and the dummy. A seed-1 Reapers v Crocs match completed a five-pass shift from y=53.4 m to y=5.0 m. The same match separately produced a scripted play, a dummy and a short-side pass.
