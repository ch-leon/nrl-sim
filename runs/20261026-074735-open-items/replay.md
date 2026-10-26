# Replaying the experiments

Original plans and metadata are retained unchanged. Some runs started before their
source state was committed. To replay a historical run, use the source below and
merge the listed baseline overrides into a copy of its plan's `base` object.
Then run that copied plan with the normal balance harness. Do not change the
retained original plan.

| Run suffix | Source | Baseline overrides for replay |
|---|---|---|
| 061533-expansive-tuning | c10e2f9 | `presets.attack.expansive.base.pass: 0`, `pace.extraPerStat: 0` |
| 061548-open-items-baseline | c10e2f9 | `presets.attack.expansive.base.pass: 0`, `pace.extraPerStat: 0` |
| 061654-handling-tuning | acaa569 | `handling.catchBase: 0.04`, `handling.catchPressured: 0.04`, `rating.homeEdge: 0` |
| 062144-home-edge-tuning | acaa569 | `handling.catchBase: 0.04`, `rating.homeEdge: 0` |
| 062746-presets (rejected global trial) | acaa569 | none |
| 062752-open-items (rejected global trial) | acaa569 | none |
| 074225-expansive-risk | c10e2f9 | `presets.attack.expansive.base.pass: 0`, `pace.extraPerStat: 0` |
| 074559-pace-slope | c10e2f9 | `presets.attack.expansive.base.pass: 0`, `pace.extraPerStat: 0` |
| 074735-open-items (selected candidate) | c10e2f9 | none |
| 080940-presets (selected candidate) | c10e2f9 | none |

All folder names begin `20261026-`. The original zero extra pace exactly reproduces
main's linear speed mapping; the extra clamp only acts when extra pace is nonzero.
For the early handling/home experiments, zero home edge is a no-op. These facts
allow replay from the committed source states without preserving an extra code
branch for each temporary default.

The completed baseline/open-item/pace/preset reports were rendered again using
the final report formatter (`--resume`, zero cells to run). Their raw outcomes,
plans and original metadata are unchanged. The refreshed formatter exposes rare
kick rates to three decimal places and marks the provisional outcome bands.
