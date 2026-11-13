# Short-match career comparison — 2026-11-13

**Current disposition:** after the reviewed QA-only event-budget correction, both duration arms pass the unchanged maintained44 gate. The original four remain negative and visible. The user’s merge hold remains; CI and independent checking are still required. No runtime economy/XP parameters changed.

**Initial measurement:** the maintained zero-cutoff agency gate failed by 0.050 rating points. That is not evidence for an economy/XP adjustment: the paired interval is wide, the old-clock advantage is itself uncertain at season two, and the primary forty differ from the original four. There is a clear increase in draws and a small first-season player progression loss; a primary-cohort idle-cash review flag also triggers. No runtime parameters have changed in this pass.

Plan and predeclared interpretation: [short-career-balance](../specs/short-career-balance.md). Source `e6f760bf`, same recurring-affordability QA manager in both arms; only `rules.halfMinutes` changes. Primary indices 1–40 map to RNG seeds `7919 * index`; raw 101–104 are retained separately and combined with equal weight. Two AU Normal seasons, default field, cheap rival rounds, idle and managed: **176 careers / 352 complete seasons, zero invariant problems**. Both initial CLI runs and both original-four child runs exited 0.

Intervals below are paired two-sided 95% Student t intervals, seed as the unit (df 39/3/43). They are exploratory, not multiplicity-adjusted equivalence tests. Binary paired t intervals are descriptive and can exceed probability limits or collapse at zero observed changes; zero events never proves zero risk.

## Agency: managed minus idle best nine

| Cohort | Season | Old 7 min | Short 2.5 min | Short − old advantage |
| --- | ---: | ---: | ---: | ---: |
| primary40 | 1 | 0.878 [0.578, 1.177] | 0.803 [0.495, 1.110] | -0.075 [-0.336, 0.186] |
| primary40 | 2 | 0.875 [-0.455, 2.205] | 0.142 [-1.117, 1.402] | -0.733 [-2.571, 1.106] |
| regression4 | 1 | 0.600 [-0.793, 1.993] | 0.100 [-0.125, 0.325] | -0.500 [-1.719, 0.719] |
| regression4 | 2 | 2.700 [-10.788, 16.188] | -1.975 [-11.007, 7.057] | -4.675 [-26.266, 16.916] |
| combined44 | 1 | 0.852 [0.571, 1.134] | 0.739 [0.453, 1.024] | -0.114 [-0.361, 0.133] |
| combined44 | 2 | 1.041 [-0.352, 2.434] | -0.050 [-1.292, 1.192] | -1.091 [-3.111, 0.929] |

The separate maintained `--career-agency` run reproduced all 88 short-clock samples exactly (apart from wall time) and exited **1** for `combined44 managed best-nine mean is below idle`. At this initial measurement the original four-seed unit assertion remained unchanged and failing. The new QA job and synthetic validation tests preserve the zero cutoff and reject missing, duplicate, mismatched, partial or invariant-failing evidence.

## Ratings, progression and competition outcomes

Combined44 means. Growth is best nine minus that same career’s initial best nine; rival gap uses the same end-of-regular-season rating units. Every record sums to 24. Win share counts a draw as half a win.

| Season | Mode | Clock | Best nine | Growth | Rival mean | Gap | W–D–L | Win share | Ladder | Finals share |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 1 | idle | old | 58.305 | 2.750 | 55.902 | 2.402 | 11.614–1.432–10.955 | 51.37% | 8.000 | 56.82% |
| 1 | idle | short | 58.102 | 2.548 | 55.891 | 2.211 | 10.523–3.705–9.773 | 51.56% | 8.136 | 54.55% |
| 1 | managed | old | 59.157 | 3.602 | 55.864 | 3.293 | 11.432–1.295–11.273 | 50.33% | 8.114 | 52.27% |
| 1 | managed | short | 58.841 | 3.286 | 55.868 | 2.973 | 10.250–4.545–9.205 | 52.18% | 8.091 | 47.73% |
| 2 | idle | old | 58.330 | 2.775 | 56.157 | 2.173 | 12.500–1.295–10.205 | 54.78% | 7.136 | 59.09% |
| 2 | idle | short | 59.114 | 3.559 | 56.114 | 3.000 | 10.659–4.318–9.023 | 53.41% | 7.273 | 54.55% |
| 2 | managed | old | 59.370 | 3.816 | 56.145 | 3.225 | 12.205–1.386–10.409 | 53.74% | 7.273 | 61.36% |
| 2 | managed | short | 59.064 | 3.509 | 56.150 | 2.914 | 11.432–4.273–8.295 | 56.53% | 6.023 | 75.00% |

Combined44 short-minus-old paired changes:

| Season | Mode | Best nine / growth | Rival gap | Wins | Draws | Losses | Win share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | idle | -0.202 [-0.245, -0.160] | -0.191 [-0.238, -0.144] | -1.091 [-2.146, -0.036] | 2.273 [1.587, 2.958] | -1.182 [-2.299, -0.065] | 0.002 [-0.041, 0.045] |
| 1 | managed | -0.316 [-0.573, -0.059] | -0.320 [-0.588, -0.053] | -1.182 [-2.335, -0.029] | 3.250 [2.617, 3.883] | -2.068 [-3.330, -0.806] | 0.018 [-0.030, 0.067] |
| 2 | idle | 0.784 [-0.830, 2.398] | 0.827 [-0.802, 2.456] | -1.841 [-2.963, -0.719] | 3.023 [2.517, 3.528] | -1.182 [-2.278, -0.086] | -0.014 [-0.059, 0.031] |
| 2 | managed | -0.307 [-2.115, 1.501] | -0.311 [-2.126, 1.503] | -0.773 [-2.123, 0.577] | 2.886 [2.267, 3.506] | -2.114 [-3.420, -0.807] | 0.028 [-0.026, 0.082] |

The clear draw increase replaces losses as well as wins. Managed season-two win share and finals appearances improve, while idle win share falls slightly. Fewer outright wins cannot be read alone as a worse season. First-season growth falls about 0.20 idle / 0.32 managed rating points with intervals excluding zero; rival mean barely changes. By season two, roster loss, recruitment and bankruptcy dominate the rating variation, and neither mode’s rating change excludes zero.

## Cash, failure and the predeclared flags

Combined44 cash is game currency at rollover. Sale and sacking columns count careers in that season, not players sold; the full JSON retains player-sale and debt-week counts.

| Season | Mode | Clock | End cash mean | Cash median [min, max] | Forced-sale careers | Sacked careers | Players sold mean | Debt weeks mean |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | idle | old | 84,623 | 40,610 [-44,466, 359,007] | 0/44 | 0/44 | 0.000 | 0.341 |
| 1 | idle | short | 67,220 | 32,843 [-47,197, 362,925] | 0/44 | 0/44 | 0.000 | 0.227 |
| 1 | managed | old | 42,428 | 39,367 [-130,615, 303,408] | 3/44 | 0/44 | 0.091 | 2.205 |
| 1 | managed | short | 32,893 | 15,482 [-118,582, 284,483] | 1/44 | 0/44 | 0.023 | 1.636 |
| 2 | idle | old | 95,613 | -13,183 [-153,930, 539,253] | 15/44 | 14/44 | 1.955 | 12.773 |
| 2 | idle | short | 46,587 | -36,236 [-139,920, 476,172] | 14/44 | 11/44 | 1.455 | 14.364 |
| 2 | managed | old | 8,772 | -33,158 [-178,142, 311,538] | 19/44 | 16/44 | 2.591 | 15.500 |
| 2 | managed | short | 17,057 | -9,010 [-154,014, 283,467] | 16/44 | 18/44 | 1.841 | 16.955 |

All cohorts’ short-minus-old health comparisons:

| Cohort | Season | Mode | End cash change | Minimum cash change | Forced-sale incidence change | Sacking incidence change |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| primary40 | 1 | idle | -18,046 [-55,951, 19,858] | -1,721 [-13,495, 10,052] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| primary40 | 1 | managed | -10,975 [-49,436, 27,486] | 3,537 [-12,828, 19,902] | -0.050 [-0.121, 0.021] | 0.000 [0.000, 0.000] |
| primary40 | 2 | idle | -59,018 [-127,912, 9,875] | -30,303 [-77,959, 17,353] | 0.000 [-0.177, 0.177] | -0.050 [-0.174, 0.074] |
| primary40 | 2 | managed | 3,550 [-50,365, 57,465] | -4,232 [-29,337, 20,874] | -0.050 [-0.227, 0.127] | 0.050 [-0.127, 0.227] |
| regression4 | 1 | idle | -10,979 [-195,680, 173,721] | 14,743 [-54,998, 84,484] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| regression4 | 1 | managed | 4,874 [-68,026, 77,773] | 4,409 [-70,584, 79,401] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| regression4 | 2 | idle | 50,899 [-409,246, 511,043] | 511 [-209,599, 210,621] | -0.250 [-1.046, 0.546] | -0.250 [-1.046, 0.546] |
| regression4 | 2 | managed | 55,645 [-99,686, 210,976] | 32,598 [-53,065, 118,261] | -0.250 [-1.046, 0.546] | 0.000 [0.000, 0.000] |
| combined44 | 1 | idle | -17,404 [-52,969, 18,162] | -225 [-11,544, 11,095] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| combined44 | 1 | managed | -9,534 [-44,577, 25,508] | 3,616 [-11,676, 18,908] | -0.045 [-0.110, 0.019] | 0.000 [0.000, 0.000] |
| combined44 | 2 | idle | -49,026 [-116,286, 18,234] | -27,502 [-72,014, 17,011] | -0.023 [-0.190, 0.144] | -0.068 [-0.189, 0.053] |
| combined44 | 2 | managed | 8,286 [-41,366, 57,937] | -883 [-24,248, 22,481] | -0.068 [-0.234, 0.098] | 0.045 [-0.115, 0.205] |

**Review flag:** primary40 idle season-two ending cash falls $59,018 (CI −$127,912 to +$9,875), exceeding the predeclared $50,000 investigation flag. It must not be hidden by the combined44 estimate (−$49,026). This cash endpoint includes both seasons: the primary change comprises −$18,046 in season one and −$40,972 net in season two. No primary/combined aggregate best-nine loss reaches one point, and no primary/combined forced-sale or sacking increase reaches 10 percentage points. The original-four managed rating loss is 1.50 and its agency change is −4.675 with very wide intervals; those witnesses remain visible rather than being excluded.

Both clocks already have substantial season-two forced sales and sackings. These are a background career-health issue, not a new short-clock causal finding. No forfeits occurred in any of the 176 careers.

## Finance attribution

Combined44 seasonal ledger changes, short minus old, with paired 95% intervals. Negative expense lines mean spending. Each arm’s full ledger still reconciles against its balance and in-game books.

| Finance line | S1 idle | S1 managed | S2 idle | S2 managed |
| --- | ---: | ---: | ---: | ---: |
| wages | 0 [0, 0] | 1,480 [-2,880, 5,841] | -14,221 [-26,198, -2,243] | -2,432 [-29,336, 24,473] |
| upkeep | 0 [0, 0] | 18 [-73, 109] | 0 [0, 0] | 775 [-5,059, 6,608] |
| overhead | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | -450 [-7,448, 6,548] |
| sponsor | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |
| grant | -77 [-169, 14] | -105 [-528, 317] | -1,455 [-4,500, 1,590] | -1,182 [-4,903, 2,539] |
| gate | -8,299 [-26,038, 9,440] | -4,629 [-27,472, 18,214] | -11,930 [-40,994, 17,133] | 5,160 [-40,358, 50,677] |
| prize | -9,886 [-29,314, 9,541] | -10,455 [-26,431, 5,522] | -4,432 [-20,834, 11,971] | -568 [-20,712, 19,575] |
| boardGrant | 455 [-3,134, 4,043] | -227 [-4,188, 3,733] | -455 [-2,990, 2,081] | 909 [-2,549, 4,367] |
| events | 405 [-476, 1,285] | 1,477 [-2,317, 5,271] | 870 [-191, 1,932] | 7,762 [1,098, 14,425] |
| transfers | 0 [0, 0] | 2,725 [-4,315, 9,765] | 0 [0, 0] | 5,483 [-6,064, 17,031] |
| contracts | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |
| facilities | 0 [0, 0] | 182 [-3,030, 3,394] | 0 [0, 0] | 2,364 [-17,260, 21,987] |
| other | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |

For the primary40 idle cash flag, season-two net deterioration is composed of wages −$12,014, gates −$18,260, prize −$8,875, board −$1,250, reputation grant −$1,356, events +$782 (rounding explains one dollar). Season-one wages are identical. The old clock sells more idle players in season two, which reduces its later wage bill: lower spending after forced sales is not a healthier club. Gate/prize differences individually have wide intervals. This decomposition is accounting attribution; it does not isolate draw frequency from altered RNG paths or standings.

### What depends on a win or draw

- `economy.ts:111–174`: home gate depends on reputation, capacity, opponent top-eight status/finals and rolling form. Form counts win +1 / draw 0 / loss −1; match minutes never enter the gate formula. Draws damp both winning and losing form. Reputation affects weekly grant and future gates.
- `fixtures.ts:215–260`, `board.ts:34–121`: league points are 2 win / 1 draw / 0 loss. Board grants are $10,000 per objective (standings, solvency, builds), not a direct win bonus. Finals progression changes prizes: $15,000 per finals match, $25,000 for reaching the grand final and $75,000 for a premiership. Reputation also changes with ladder/finals/objectives.
- `data/events.ts:148–160,276–285`, `events.ts:488–521`: the Pizza modifier pays $2,000 on wins only for its four-week window; a draw pays zero. TV gives +4 reputation on a win, −1 on a loss, zero on a draw. All these receipts/costs share the `events` ledger line; the existing soak does not emit their individual contributions. There is no universal per-win cash payment in `applyEconomy`. Therefore the aggregate event line cannot establish a Pizza-specific loss.
- `morale.ts`, `config.ts:MORALE`: wins and losses swing morale +4/−4; draws give neither, so future match strength can change in either direction.

### Player progression versus rivals

`training.ts:138–157`, `config.ts:PROGRESSION`: player weekly XP 10, starter completion 40 and bench completion 20 are unchanged. Tries add 10, breaks 5 and player-of-match 20. Fewer action opportunities can lower those bonuses; awards also depend on age/traits/facilities. The measured small first-season growth decline is consistent with this pathway, but the existing soak does not record component XP, so this run cannot attribute every lost rating fraction to it. No fixed-award rescaling is justified.

Rivals **do not receive completion or action XP** on either the cheap or live path. `rivals.ts:395–465` develops them weekly by age, pull toward the league mean and an anchor; `rivalRound.ts:140–165` adds match statistics/injuries without calling `applyMatchXp`. Their duration-independent development is an existing asymmetry, not retained 40-XP rewards. It means player action bonuses shrink while the rival weekly process stays steady; the near-flat rival means and small first-year player drop quantify the observed effect, not proof of an unfair career failure.

### Cheap-score rounding

Exhaustively enumerated the production `cheapSimScore` helper over every one of its 30 × 30 equally likely integer dice pairs at equal strength 55. This is finite arithmetic, not another stochastic cohort:

| Half minutes | Home wins | Draws | Away wins | Draw share |
| ---: | ---: | ---: | ---: | ---: |
| 7 | 435 | 30 | 435 | 3.333% |
| 2.5 | 409 | 82 | 409 | 9.111% |

Scaling and rounding to whole points merges distinct old scores into draws. Player live draws in the actual careers rise from roughly 5–6% to 15–19%, more than this neutral cheap example. The neutral enumeration is not a full distribution of rival strength gaps, nor does it establish that their draw share must equal the player’s; it confirms the specific quantisation mechanism.

## Initial recommendation (before the QA correction)

1. Keep the merge hold and both red gates visible. Do not add income/XP or tune a manager merely to gain 0.051 rating points. All runtime economy/XP values remain unchanged.
2. Agree a career outcome contract before choosing a different statistical gate. This evidence supports mandatory invariants, identical initial resources and fixed completion/weekly awards, explicit draw-aware competition outcomes, and a manager that avoids knowingly unaffordable recurring commitments. It does not supply an accepted numerical non-inferiority margin for long-term cash, progression or agency.
3. Investigate the concrete QA manager gap separately: At the measured base, `manage()` took event choice zero unconditionally, including +15% wage demands, paid camps/fan days and rival signings. Those paths bypass the facility/staff/star affordability guards. Test unaffordable choices against healthy-budget controls before changing the policy; keep this a QA-only causal correction. The observed event line alone does not prove it caused the near-zero aggregate.
4. If the zero point-estimate gate is replaced, make the tradeoff explicit before another run. A gate that only rejects a negative advantage with a confidence interval below zero reduces false alarms but can pass underpowered harmful changes; a non-inferiority gate needs an explicitly accepted practical margin and enough precision. Neither is equivalent to the currently approved zero-mean gate, and neither is adopted here.

## Receipts and limitations

Full JSON, original logs, maintained-gate output, exhaustive enumeration and the output-only analysis are retained outside commits in `e2e-output/career-balance/2026-11-13/` in this worktree (also `/tmp/nrl-career-*`). The output-only Python analysis imports no game code; all career measurements use the existing soak. No seeds were added after inspection.

| Receipt | Careers | SHA-256 |
| --- | ---: | --- |
| nrl-career-short40.json | 80 | `73121dc307fdaef9301199205aad7b429df8a060776f550739dd6cca7d103007` |
| nrl-career-old40.json | 80 | `3761c7468c7641e8f217e83e75f5629456c4e1a10223406b249e06e03916bd12` |
| nrl-career-short4.json | 8 | `e681498244790b8fe6c4dc1697f457e666a204bd2de33e44acb64cfd22dea933` |
| nrl-career-old4.json | 8 | `18e57a92c8a7877a514ee2892ad6d92b930e3afe4108b6f0b85f7c7f4fe11561` |

Scope limits: two fresh AU Normal seasons, default field and cheap-rival mode. No claim about UK, other difficulties, longer careers, browser play or live-rival balance follows from this run. Historical game-head effects were not measured: the old-clock control deliberately uses the same QA policy. CI/QA and independent different-tool checking remain required; local agent reports are not merge proof.

## Subsequent causal QA correction and fixed-cohort remeasurement

After the baseline comparison, the reviewed QA-only `managedEventChoice` guard applies existing cash/recurring-budget rules to visible guaranteed event costs, wage increases and rival signings. Three poor-budget cases were red before the edit while their healthy-budget controls passed. Nine event tests and sixteen gate tests pass, including an exact-tie cancellation regression. No game event, economy or XP definitions changed. The same primary40 and original4 seeds were repeated at both durations: **another 176 careers / 352 seasons, all complete, zero invariant problems or forfeits**. Both maintained CLI arms exited 0. No cohort size, seed or gate threshold changed.

The QA policy source measured here is `src/qa/soak.ts`, SHA-256 `6f614af2c4a27ed9cc3175a4e6ea4c4b8b5114b1c605a8c71fbf3db9707efbbd`, on feature base `e6f760bf`. The gate sums exact reported tenths to preserve mathematical ties; it uses no epsilon or practical margin.

### Postguard agency

| Cohort | Season | Old 7 min | Short 2.5 min | Short − old advantage |
| --- | ---: | ---: | ---: | ---: |
| primary40 | 1 | 0.245 [0.085, 0.405] | 0.268 [0.078, 0.457] | 0.023 [-0.226, 0.271] |
| primary40 | 2 | 1.602 [0.074, 3.131] | 1.627 [0.342, 2.913] | 0.025 [-1.837, 1.887] |
| regression4 | 1 | 0.450 [-0.988, 1.888] | 0.875 [-0.496, 2.246] | 0.425 [-1.911, 2.761] |
| regression4 | 2 | 2.100 [-14.103, 18.303] | -2.625 [-10.018, 4.768] | -4.725 [-20.773, 11.323] |
| combined44 | 1 | 0.264 [0.101, 0.426] | 0.323 [0.130, 0.515] | 0.059 [-0.197, 0.315] |
| combined44 | 2 | 1.648 [0.040, 3.255] | 1.241 [-0.038, 2.520] | -0.407 [-2.324, 1.510] |

The current-clock combined estimate is **+1.2409**, interval **[−0.0380, +2.5198]**, compared with baseline policy **−0.0500 [−1.2923, +1.1923]**. This passes the predeclared point-estimate gate; the interval still spans zero and cannot establish equivalence. The postguard primary40 old/new advantage is almost identical; the original four remain a losing subset.

### Postguard ratings and competition outcomes

Combined44 means, same definitions and season boundaries as above.

| Season | Mode | Clock | Best nine | Growth | Rival mean | Gap | W–D–L | Win share | Ladder | Finals share |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 1 | idle | old | 58.305 | 2.750 | 55.902 | 2.402 | 11.614–1.432–10.955 | 51.37% | 8.000 | 56.82% |
| 1 | idle | short | 58.102 | 2.548 | 55.891 | 2.211 | 10.523–3.705–9.773 | 51.56% | 8.136 | 54.55% |
| 1 | managed | old | 58.568 | 3.014 | 55.880 | 2.689 | 11.318–1.386–11.295 | 50.05% | 8.386 | 50.00% |
| 1 | managed | short | 58.425 | 2.870 | 55.882 | 2.543 | 10.568–4.273–9.159 | 52.94% | 7.795 | 52.27% |
| 2 | idle | old | 58.330 | 2.775 | 56.157 | 2.173 | 12.500–1.295–10.205 | 54.78% | 7.136 | 59.09% |
| 2 | idle | short | 59.114 | 3.559 | 56.114 | 3.000 | 10.659–4.318–9.023 | 53.41% | 7.273 | 54.55% |
| 2 | managed | old | 59.977 | 4.423 | 56.118 | 3.859 | 12.250–1.091–10.659 | 53.31% | 7.523 | 59.09% |
| 2 | managed | short | 60.355 | 4.800 | 56.145 | 4.209 | 11.227–3.500–9.273 | 54.07% | 6.750 | 65.91% |

### Postguard cash and failure tradeoffs

| Season | Mode | Clock | End cash mean | Cash median [min, max] | Forced-sale careers | Sacked careers | Players sold mean | Debt weeks mean |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | idle | old | 84,623 | 40,610 [-44,466, 359,007] | 0/44 | 0/44 | 0.000 | 0.341 |
| 1 | idle | short | 67,220 | 32,843 [-47,197, 362,925] | 0/44 | 0/44 | 0.000 | 0.227 |
| 1 | managed | old | 66,245 | 53,594 [-54,419, 315,247] | 0/44 | 0/44 | 0.000 | 0.318 |
| 1 | managed | short | 70,514 | 36,446 [-20,773, 301,826] | 0/44 | 0/44 | 0.000 | 0.205 |
| 2 | idle | old | 95,613 | -13,183 [-153,930, 539,253] | 15/44 | 14/44 | 1.955 | 12.773 |
| 2 | idle | short | 46,587 | -36,236 [-139,920, 476,172] | 14/44 | 11/44 | 1.455 | 14.364 |
| 2 | managed | old | 17,543 | -1,765 [-170,594, 434,348] | 16/44 | 18/44 | 1.636 | 12.727 |
| 2 | managed | short | 11,155 | -15,573 [-154,200, 278,211] | 13/44 | 15/44 | 1.227 | 14.159 |

All postguard cohorts, short-minus-old paired changes:

| Cohort | Season | Mode | Best nine | End cash | Forced-sale incidence | Sacking incidence |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| primary40 | 1 | idle | -0.207 [-0.254, -0.161] | -18,046 [-55,951, 19,858] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| primary40 | 1 | managed | -0.185 [-0.449, 0.079] | 6,855 [-24,189, 37,899] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| primary40 | 2 | idle | 0.545 [-1.101, 2.191] | -59,018 [-127,912, 9,875] | 0.000 [-0.177, 0.177] | -0.050 [-0.174, 0.074] |
| primary40 | 2 | managed | 0.570 [-0.820, 1.960] | -11,653 [-64,302, 40,997] | -0.100 [-0.289, 0.089] | -0.075 [-0.258, 0.108] |
| regression4 | 1 | idle | -0.150 [-0.309, 0.009] | -10,979 [-195,680, 173,721] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| regression4 | 1 | managed | 0.275 [-1.924, 2.474] | -21,580 [-53,562, 10,402] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| regression4 | 2 | idle | 3.175 [-8.207, 14.557] | 50,899 [-409,246, 511,043] | -0.250 [-1.046, 0.546] | -0.250 [-1.046, 0.546] |
| regression4 | 2 | managed | -1.550 [-7.069, 3.969] | 46,258 [-129,200, 221,716] | 0.250 [-0.546, 1.046] | 0.000 [0.000, 0.000] |
| combined44 | 1 | idle | -0.202 [-0.245, -0.160] | -17,404 [-52,969, 18,162] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| combined44 | 1 | managed | -0.143 [-0.410, 0.123] | 4,270 [-23,994, 32,534] | 0.000 [0.000, 0.000] | 0.000 [0.000, 0.000] |
| combined44 | 2 | idle | 0.784 [-0.830, 2.398] | -49,026 [-116,286, 18,234] | -0.023 [-0.190, 0.144] | -0.068 [-0.189, 0.053] |
| combined44 | 2 | managed | 0.377 [-0.925, 1.679] | -6,388 [-55,139, 42,363] | -0.068 [-0.247, 0.110] | -0.068 [-0.234, 0.098] |

The primary40 idle $59,018 cash flag persists unchanged: idle behaviour was untouched. Its accounting/source assessment above still applies. Original4 managed short-versus-old rating −1.550 and forced-sale incidence +25 percentage points also trigger the review flags, with very wide intervals; these witnesses are retained explicitly. They cannot establish population damage, and passing the combined gate does not erase them. No primary/combined managed deterioration reaches the predeclared practical review flags.

Compared with the initial short-clock policy, postguard managed season-two best nine rises 59.0636 → 60.3545; forced-sale careers fall 16 → 13, while ending cash falls $17,057 → $11,155. Keeping players can retain their wage bill; the QA correction is justified by the controlled affordability bug, not by guaranteeing an improvement in every cash endpoint or every seed.

### Postguard finance attribution

Combined44 seasonal ledger change, short minus old, with paired 95% intervals:

| Finance line | S1 idle | S1 managed | S2 idle | S2 managed |
| --- | ---: | ---: | ---: | ---: |
| wages | 0 [0, 0] | -1,761 [-5,978, 2,457] | -14,221 [-26,198, -2,243] | -21,059 [-40,914, -1,203] |
| upkeep | 0 [0, 0] | 122 [-80, 324] | 0 [0, 0] | 1,405 [-3,787, 6,598] |
| overhead | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | -423 [-6,890, 6,045] |
| sponsor | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |
| grant | -77 [-169, 14] | -33 [-455, 390] | -1,455 [-4,500, 1,590] | 878 [-2,404, 4,160] |
| gate | -8,299 [-26,038, 9,440] | 6,231 [-14,597, 27,058] | -11,930 [-40,994, 17,133] | 6,496 [-31,686, 44,678] |
| prize | -9,886 [-29,314, 9,541] | 114 [-15,234, 15,461] | -4,432 [-20,834, 11,971] | 1,136 [-17,380, 19,652] |
| boardGrant | 455 [-3,134, 4,043] | 2,500 [-1,653, 6,653] | -455 [-2,990, 2,081] | -227 [-3,965, 3,510] |
| events | 405 [-476, 1,285] | 32 [-990, 1,053] | 870 [-191, 1,932] | 913 [-988, 2,814] |
| transfers | 0 [0, 0] | -4,753 [-12,782, 3,277] | 0 [0, 0] | -2,505 [-13,165, 8,154] |
| contracts | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |
| facilities | 0 [0, 0] | 1,818 [-2,629, 6,265] | 0 [0, 0] | 2,727 [-16,207, 21,661] |
| other | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] | 0 [0, 0] |

### Gate disposition and remaining limits

Only the four-seed population mean assertion moved out of the unit suite, after the fixed44 replacement, preserved zero cutoff and both-clock evidence were reviewed. All four original seeds still execute all pipeline, financial-ledger, state and reload checks and print their negative aggregate. The separate QA workflow job is mandatory for nightly, default/all and on-demand `only=qa`, shares the existing QA selection condition, propagates nonzero exits and retains every sample/log. `only=perf` deliberately selects neither QA job. The CI `check` aggregate continues to mean build and units; the separate QA workflow conclusion is also required by repository policy.

Keep runtime parameters unchanged. The evidence supports the narrow QA policy correction and an honest representative gate, while leaving draw frequency, small action-bonus progression differences and background career-finance fragility visible for design review. Neither the initial nor postguard comparison proves non-inferiority; no practical equivalence margin was adopted. The user’s merge hold and the different-tool checker/CI requirements remain.

| Postguard receipt | Careers | SHA-256 |
| --- | ---: | --- |
| nrl-career-events-short44.json | 88 | `521df2c289d3ec2144a2545dc9a78f54b8cb99f4be82e86ef591584b6371718b` |
| nrl-career-events-old44.json | 88 | `97bfb89a68fedbbf81fae7f4b75622f0bf422a441812f68f0de583cb2e23d7d4` |

Local verification on 2026-11-13: `npx tsc --noEmit`, full `npx vitest run` (289 files / 3,912 tests), `npm run build` and `git diff --check` all pass. Independent different-tool checker review and CI/QA receipts are pending; this is a local verification record, not merge approval.
