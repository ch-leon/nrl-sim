# Balance experiments

Play the live match sim headless over many seeds and count what happens, with
the knobs set however an experiment wants. One match is one seed, and one seed is
luck; twenty matches a row is a measurement. Use this to check balance after a
change, and to try lots of tweaks without touching the code, then decide later
from the reports.

- **Knobs**: every tunable number has a name, e.g. `wrestle.gripBase`, listed in
  `docs/specs/BAK-208-tuning.md`. `npm run balance -- --list` prints all of them
  with their current values.
- **Plans** (`balance/plans/*.json`) list scenarios (who plays whom) and variants
  (which knobs to change). The runner plays every variant on every scenario.
- **Runs** land in `balance/runs/<date>-<plan>/` (git-ignored on main) and are kept
  on the **`balance-log`** branch, whose `INDEX.md` lists every run.
- **Agents**: the `balance-experiments` skill (`.claude/skills/balance-experiments/`)
  is the procedure for writing scenarios and running plans. Ad-hoc plans go in
  `balance/plans/experiments/` (git-ignored; each run keeps a copy of its plan).

## Running one (step by step)

These are the exact commands. They need nothing but `npm ci`.

1. Check the plan: `npm run balance -- --check --plan balance/plans/<plan>.json`.
   It prints how many cells (variants × scenarios) will run, or names each problem
   (a misspelt knob, an unknown preset) without running anything.
2. Run it: `npm run balance -- --plan balance/plans/<plan>.json --jobs 4`.
   `--jobs` is how many CPU cores to use (`nproc` tells you). It prints a line per
   finished cell with the time left. A 20-seed cell of whole matches takes about
   15 s on one core.
3. If it stops (timeout, crash, closed session), carry on where it left off:
   `npm run balance -- --resume balance/runs/<that run's folder> --jobs 4`.
   Finished cells are never run twice.
4. Read `balance/runs/<run>/report.md`. To compare with an earlier run of the same
   plan, add `--previous <earlier run folder>` to step 2.
5. Keep it: `scripts/balance-log.sh publish balance/runs/<run>`. That copies the run
   to the `balance-log` branch, adds it to `INDEX.md` and pushes. It needs push
   access to the repository.
6. Report back: the run folder name, the plan, the commit (from the report's first
   line), and the report's tables as they are. Don't round or reinterpret the
   numbers; the `*` marks already say which changes are beyond luck.

Other options: `--seeds N` overrides the plan (more seeds, less luck); `--minutes M`
plays an M-minute stretch instead of whole matches; `--out <dir>` puts the run
somewhere else.

A season measure the harness can't give (each rival style's record against its
strength gap, and at a level rating) is the soak's: `npm run soak -- --live-rivals
--seasons 3 --seeds 20 --difficulties normal --jobs 4`. `--tune knob=value`
(repeatable, the same names as here) soaks a candidate value before its default
moves (#322).

## Writing a plan

```json
{
  "name": "grip and legs",
  "description": "What question this run answers.",
  "seeds": 20,
  "base": { "live.burst": 1.15 },
  "scenarios": [
    { "name": "even 60 v 60", "home": { "rating": 60 }, "away": { "rating": 60 } },
    { "name": "stamina 30 v 80", "home": { "rating": 60, "stats": { "stamina": 30 } }, "away": { "rating": 60, "stats": { "stamina": 80 } } },
    { "name": "reapers v wolves", "home": { "club": "rival-reapers", "traits": "gen" }, "away": { "club": "rival-wolves" } },
    { "name": "last 8 min", "home": { "rating": 60 }, "away": { "rating": 60 }, "legs": "late", "minutes": 8 }
  ],
  "variants": [
    { "name": "rush commits two", "tuning": { "presets.defence.rush.commit": 2 } }
  ],
  "sweep": {
    "wrestle.gripBase": [1.1, 1.2, 1.3, 1.4],
    "fatigue.runCost": [0.00012, 0.00015, 0.00018]
  }
}
```

- **seeds**: matches per cell. 20 is a fair measurement; 40+ for rare events (late
  busts, strips, intercepts). Each seed is a **whole match**: two 7:00 halves,
  half-time (legs part-restored), the siren and full time, won on points. **minutes**
  (optional) plays one stretch of that many minutes from a kick-off instead, with no
  half-time; its counts are scaled to 14 minutes.
- **Sides**: either a flat squad (`rating` for every stat, `stats` to override some)
  or a league `club`'s generated roster. `tactics` takes `attack` (grind, balanced,
  expansive, kick-chase, all-out) and `defence` (slide, rush, compressed). `traits`:
  `none` (flat squads' default), `gen` (clubs' default), `stars`. `bench` is how many
  interchange players (0–4, default 4; a flat squad's bench has its stats) and
  `rotation` how hard the coach uses them: `off`, `standard` (default), `heavy`.
- **Exact style-fit fixtures** (#465): `"fit": { "expansive": 1.5, "slide": 0.5 }`
  overrides only those cached starting-sheet fits in the headless harness. Values
  must be finite and within 0–1.5; omitted styles keep their derived fit. Playing
  stats stay unchanged, the fixture follows its written side when swapped, and
  break-time plan changes select the corresponding cached fit. This is for
  isolating counter/own-fit effects, not a live-game or saved-sheet override.
- **Squads as the game builds them** (N12.2): `"squad": "player"` is a new game's squad
  (one star, a first-grader and a depth man a position; `difficulty` sets its start
  rating) through its opening lineup, and `"squad": "rival"` a rival club's generated
  squad of strength `rating` through its coach's auto-pick, both through the game's own
  sheet builder as `matchday.ts` builds the player's match. A new pair every seed, the
  same pair either way round; a rival with no `rating` is level with the other side's
  best nine. `traits`, `tactics`, `bench` and `rotation` override what the squad gets.
  `results*.jsonl` carries each squad's best nine (`nine`) and the home side's signed
  margin (`homeMargin`). `"rivalOf": "hard"` on a side plays it as the rival of a player
  on that difficulty: with the difficulty's edge after the spread
  (`difficulty.hard.rivalEdge`), as the game gives it. `balance/plans/difficulty.json`
  and `level-rating.json` use them. `"style": "expansive"` (any attack) on a rival
  squad draws, each seed, rival squads until one's nine reads as that attack
  under the style thresholds (tuning §28), so a style's own squads can be played
  against a level rival (#322; `expansive-speed.json`).
- **Scenario extras**: `legs` (`fresh`, `late`, `spent` or 0..1), its own `minutes`
  (a stretch instead of a whole match, e.g. the last 8 minutes on tired legs) and
  `weather` (`clear`, `rain` or `wind`; clear unless given) and `calls`, coach calls each side
  makes whenever it may (`{ "home": [{ "call": "shift-left", "tackle": 2 }] }`, #73; `fresh-legs`,
  #367, is made whenever it is on offer and `tackle` means nothing to it), and
  `plans`, changes of plan at the breaks, each made once at the first break it names
  (`[{ "side": "home", "at": "half-time", "tactics": { "attack": "expansive" } }]`; `at` is
  `half-time`, `try` (the first try) or `conceded` (the first try against that side), N11),
  and `breakRule` (`["home"]`, `["away"]` or both): those sides, as written, change plan
  at the breaks by the default rule (N13.5, `breaks.*`). With `bothWays` the named side
  stays the written one, so `away` is the opponent of a tracked home preset.
- **A scenario's own matches** (`seeds`): that row plays this many matches instead of
  the plan's. `--seeds` still replaces the plan's count and leaves a row's own count
  alone, so a preset matrix stays at the size it was signed off at. With `track`
  (`home` or `away`) the report adds a **Side win** column for that side, to a tenth of a percent. `bothWays`
  also plays each seed with the sides swapped and pools the tracked side's wins
  (its `seeds` is per orientation, so the column is over twice that); it needs
  `track`. Counts, Home win and the legs stay the matchup as written, so a style
  still reads on the side that has it.
- **base**: overrides under every variant, baseline included.
- **variants**: hand-written sets of overrides. A `baseline` with no overrides is
  always run first so every row has something to compare with.
- **sweep**: every combination of the listed values becomes a variant (4 × 3 = 12
  above); crossed with `variants` when both are given. Include the current value if
  you want it as a sweep point.
- An attack preset can be given a field its table leaves out:
  `presets.attack.balanced.base.pass`, `presets.attack.grind.zones.redZone.offload`,
  `presets.attack.expansive.base.kickBias.bomb`.

Sizing: cells = variants × scenarios; one core plays a whole match in about 0.75 s,
so time ≈ cells × seeds × 0.75 seconds, divided by the jobs (a stretch of M minutes
costs about M/24 of that). A 13-variant sweep on 2 scenarios at 20 seeds is about
6–7 minutes on one core, 2 on four; 100 variants on 6 scenarios is about 2½ hours on
one core, 40–50 minutes on four. There is no limit; resume makes long runs safe.

## Reading a report

One table per scenario, one row per variant. Counts are per match (a stretch is
scaled to 14 minutes), both sides together, so they read against the §7 targets: **✓** inside, **↑** above,
**↓** below. In brackets, the change from the baseline row; a **\*** means the change
is bigger than luck explains (more than two standard errors, only judged with 8+
matches a row). No star means it may be noise: run more seeds before deciding.
**Home win** is the share of matches the home side scored more tries in; **Wrestle s**
the average wrestle; **Legs end** each side's average energy at the last 3-minute
mark. **sinBins** is men sent to the bin a match, **shortMin** the minutes of clock one
side was alone a man short and **binSwing** the points the full side scored minus the
short side's over them (so binSwing / shortMin × 5 is the swing per five-minute bin). Every other number (strips, intercepts, quick play-the-balls, wrestles held by
1/2/3 men, legs at every mark, standard errors) is in `results*.jsonl`.

## Watchability (#648)

Under each scenario's table the report has a second one, for whether the matches
were worth watching. It is read off the events the sim already emits and the ball's
position and holder; nothing in the sim changes, so every seed plays the same match
with or without it. The columns (`src/match/balance/watch.ts`), in `results*.jsonl`
as a `watch` field after `ms` (older results lack it and are read as not measured,
never as zero: the table is left out, or a dash shown for that row):

- **Lead changes**: a side taking the lead from the side that last held it. 0-0 to
  the first score is not one; level and then ahead again by the same side is not
  one. A stretch's count is scaled to 14 minutes like the other counts.
- **Within 6, 1 min out %**: matches where the points were within 6 (inclusive) when
  the last minute began (the match clock at full time, 14:00, less 60 s; a stretch's
  own end).
- **Decided last min %**: matches won by a side that was not in front when the last
  minute began, so the points that won it came in the last minute. Anything scored
  from then on counts (a conversion taken after the siren, golden point). A draw is
  decided by nobody.
- **Winner's biggest deficit**: the most points the eventual winner ever trailed by,
  0 if it never trailed or the match was drawn. Mean over matches.
- **Try kick / set play / offload / break 20 m+ / drive <5 m / other %**: how each
  try came about, as a share of tries. Rules, first that fits wins:
  1. **kick**: the scoring side's own `bomb`, `grubber`, `chip` or `cross-field`
     kick within 12 s (240 ticks) before the try, with no tackle, stoppage or loss
     of the ball by the kicking side in between. The other side regathering ends it;
     the kicker's own regather, scramble or the defender spilling it does not. A
     `long` kick is territory and is not an origin.
  2. **set play**: a `set-play` event by the scoring side within 3 s (`plays.scriptTicks`)
     before the try, with no tackle, `play-breaks-down` or stoppage since: the play
     the coach called was still running. Only sides with `plays` in their sheet have
     any.
  3. **offload**: an `offload` by the scoring side earlier in the same play (no
     tackle or stoppage since).
  4. **break 20 m+**: a `line-break` by the scoring side in the same play (none of
     the above, no tackle since) and the try scored 20 m or more further up the
     pitch than where the break was made. A break nearer the line is not counted
     here (the break happens near the line most of the time: tries after any break
     are roughly a quarter of all tries, after one of 20 m or more far fewer).
  5. **drive <5 m**: the scoring side's last tackle (its play-the-ball) was within
     5 m of the line it scored at, and nothing has stopped play since (a penalty
     tap, kick or turnover would).
  6. **other**: everything else (a long run from further out, a return off the
     other side's kick, a try off a penalty tap or a scrum-style restart, a kick
     the rules above do not own).
  Known limits: the sim emits no event for a pass, a carry, or where a set started,
  so "kick-chase" and "second-phase" tries cannot be told apart from "other", and a
  drive is judged by where the play-the-ball was, not by the carrier being driven
  back. Telling them apart would need a `pass` event (or a count of passes in the
  play) and a start-of-set marker; the harness does not change the sim to get them.
- **Last tackle kick / run / pass %**: the play on the final tackle of a set (the
  play that begins with the last-tackle flag up, after the dummy-half's heel): a
  **kick** when its side kicks (any kick, or a field-goal attempt) before the play
  ends; else a **pass** when more than one man holds the ball in the play (counting
  the dummy-half only if he runs it himself, so his heel to the first receiver is
  not a pass; an offload or cut-out is); else a **run**, including a dart.
- **1st receiver same man % / 1st receiver slots** (#649): the first receiver is the
  first man of the attacking side, other than the one who had the ball at the ruck, to
  hold it in the play after a play-the-ball (a dart, a tackle or a turnover before
  anyone else has it counts nobody; the pass to the kicker on the last tackle counts).
  **Same man %** is the chance that two first passes on the same tackle of a set, by
  the same side in the same match, found the same slot: Σ n(n−1) / Σ N(N−1) over
  slots and tackles, which small samples do not inflate the way the most-used man's
  share would (a match with no such pair reads 0). **Slots** is how many slots took a
  first pass, a side's mean. Neither is scaled for a stretch. Results from before
  #649 show a dash.
- **Shape spread / forward pod / edge shift / back door %** (#649 step 2): the attack
  shapes picked at the play-the-ball (`src/match/league/shapes.ts`), both sides, as
  shares of the picks; the per-match counts are `watch.shapes` in `results*.jsonl`. A
  row with no shape picked (`shapes.on` 0) or from before step 2 shows a dash.
- **Shape formed % / Formed pod, edge, back door % / Shape short m** (#649 step 2): of the
  shaped play-the-balls, the share where the shape was formed as the ball left the ruck:
  every man it places (not the dummy-half, the man who played the ball or a man still
  locked) within 2 m (`SHAPE_FORMED_M`) of his spot, measured to the nearest point of his
  run-on line (from where the shape stands him to where he comes onto the ball). Pooled
  over the row; the ± treats each play-the-ball as a draw. **Short m** is the mean
  distance short, a man's mean per play-the-ball. The sim notes each ball-out in a view
  channel (`shapeBallOut`); nothing in it reads it. A dash with no shaped play-the-ball.

Origins and last-tackle plays are shares of the tries or last tackles in the row;
the `*` marks use a standard error that treats each try (or last tackle) as an
independent draw, the most such a share can claim. The percentages and the per-match
counts behind them (`watch.origins`, `watch.lastTackles`, in the same scale as the
other counts) are in `results*.jsonl`.

## Always on

`.github/workflows/balance.yml` runs `standard.json` on every push to `main` that
touches the match code or a plan, compares it with the previous standard run, shows
the report on the run's summary page and publishes it to `balance-log`. Run any plan
from the Actions tab (**Balance → Run workflow**, plan path and optional seeds); jobs
can run for up to about 5½ hours.

## Strategy counter baselines (#458)

- `counters-matrix.json`: all five current attacks (including **Grind**, whose
  later rename is outside this task), each on Slide, against Balanced on Slide,
  Rush and Compressed. Flat 60 squads, 200 seeds both ways (400 matches/cell).
  Re-run with `--seeds 500` for 1,000 matches/cell.
- `counters-fit.json`: the same matrix control, all five attacks with fast backs
  (backs speed 80), strong pack (pack strength 80), or smart opposing D (opponent
  footyIQ 75); fast-backs Expansive and every strong-pack attack also face Rush
  and Compressed. Flat 62/65 against 60 yardsticks each use 500 seeds both ways,
  regardless of `--seeds`. Other rows default to 200 seeds both ways.

`positionStats` on a side overrides stats on starters **and bench**, after `stats`.
Groups match `league/presets.ts`: `backs` = fullback/winger/centre, `halves` =
five-eighth/halfback, `pack` = hooker/prop/second-row/lock. An exact `Position`
(e.g. `"prop": { "strength": 90 }`) wins over its group. Stat values must be
finite numbers from 1 to 100. These are sheet overrides, including club and
squad-built sheets; stored players are unchanged. The existing `stats` field
keeps its flat-squad-only behavior.

`"report": "matrix"` opts into the compact report. Scenarios named exactly
`<attack> v <defence>` (lower-case preset ids, e.g. `grind v slide`) fill the 5 × 3
matrix; missing cells print —. Every scenario also appears in the tracked-side
and per-side tables, including squad-fit and yardstick rows. Without this flag,
the existing report is unchanged.

For `track` rows, `pointsShare` is the mean of 1 for a win, ½ for a draw and 0
for a loss. Its SE uses sample variance divided by the number of matches (zero
for a single match); `bothWays` includes both orientations. `trackedCounts` and
`opponentCounts` pool the same matches and include offloads, busts (excluding
late wrestle busts), line breaks, tries, kicks, steps, errors, points for and
against, with count SEs in JSON. Events are credited to their named side.
Stretches scale counts to 14 minutes. The legacy `counts`, Home win and legs
still describe only the written orientation, exactly as before. Thus the two
new sides sum to the legacy counts for one orientation; for bothWays they sum
to the average of the two orientations' legacy counts.

`counters-slide.json` is the Slide-column acceptance plan (#462): flat 60,
500 seeds each way (1,000 matches per cell), with Tight, own-style fit and Slide
counters enabled only as plan overrides. Targets are 53–57% for Tight/All-out,
43–47% for Expansive/Kick-chase, and Balanced within one SE of 50%. It also reports
per-side bombs, bombs won, grubbers and grubber tries from existing kick events;
these are harness counts, not new stored player stats. For a paired dormant
control, override `counters.slide.on` to 0 in an experiment copy of the plan.


`counters-rush.json` is the Rush-column acceptance plan (#463), with Tight,
own-style fit, Slide and Rush enabled only by overrides. Flat rows use 500 seeds
both ways (1,000 whole matches), except Tight: its initial 47.85% sample was
extended once with the next 500 seeds both ways, so its acceptance estimate uses
all seeds 1–1,000 (2,000 matches). Targets are Kick-chase 53–57%, All-out 43–47%,
and Tight/Expansive 48–52%. The three fit rows use task 1's 200 seeds both ways
(400 matches): pack strength 80/45 and backs speed 80. Raw chunk inputs and the
sample-variance pooling formula are preserved beside each pooled report on
`balance-log`; no seed or orientation is discarded.


`counters-compressed.json` is the task-7 full-matrix acceptance plan (#464). It
enables Tight, own-style fit, Slide, Rush and Compressed through overrides only.
Flat-60 cells use 500 seeds both ways (1,000 whole matches), except Tight v Rush
and Balanced v Rush: both retain seeds 1–1,000 in both orientations (2,000 matches).
The enabled Compressed plan uses the recorded common contact baseline
(busts -0.015, offloads -0.03); the additional Contact D-scaled middle benefit
belongs to Tight. The legacy flat profile measured Balanced v Compressed at
47.55% over 1,000 matches, so calibration controls remain separate from final
acceptance.

Compressed targets are Tight 43–47%, Expansive 53–57% and the other three 48–52%.
Sum unrounded signed swings from 50 in each row and column; each total must be
within ±3 percentage points. The report exposes per-side offloads, contact busts
and line breaks. Runs use disjoint 125-seed checkpoint blocks; pooled reports
preserve every source plan/result and the sample-variance formula. The committed
plan reruns each complete consecutive range directly. Tuned values are in §34.

`SideSpec.fit` is a **headless harness fixture** for #465: e.g.
`"home": {"rating":60,"fit":{"balanced":1.5}}`. It replaces only the named
starting-sheet style fit in `BalanceSim`, leaving playing stats and every other
fit unchanged. `"away":{"rating":60,"fit":{"slide":0.5}}` isolates the opposing
defence fit. Fixtures follow their written side when orientations swap and
remain cached when a break selects a different style. The opening positions are
reset with the existing receiver, without an RNG draw. Omitted fits replay the
live sim exactly. This field is not on `TeamSheet`, `LiveOptions` or any save;
the game cannot supply it. `fitFixtures.test.ts` guards that boundary.


### #465 switch-on acceptance (Leon, 5 Nov 2026)

The final neutral comparison is **enabled minus dormant on the same 500 seeds
in both orientations (1,000 matches)**, with signed 4–6 point win-share swings
in all eight nonzero cells. Distance from 50% does not measure that swing.
Flat preset controls versus Balanced/Slide use **42–58%** (previously 45–55%).
Full-fit counters use the exact 1.5 v 0.5 fixtures, hold Tight’s independent
rebuild on in both runs as Leon specified, hold the independent Kick-chase
preset adjustment fixed in both, and require **9 points or stronger**;
9–12 is the nominal target. The fully dormant variant also restores the legacy
Kick-chase pass weight and exposes total change. Neutral controls restore that
legacy weight too, and the guard checks all 15 against immutable dormant-main
shares; counter-off with a retuned preset is not a main baseline.

After running each committed `counters-*.json` acceptance plan, check the saved
measurements with `npx vite-node scripts/check-counters.ts -- <kind> <run-dir>`.
Kinds are `enabled`, `full-fit`, `fit-enabled`, `strong-pack`, `round-robin` and
`yardstick`. The checker rejects missing, duplicate or undersized evidence and
checks each signed counter, own-fit cap, six-offload floor and 53% plan average.
`tests/match/balance/acceptance.test.ts` guards paired swings and the revised
42–58% preset bounds. The manual acceptance workflow runs these guards.

Compare complete soak JSON with
`python3 scripts/check-counters-soak.py <main.json> <enabled.json>`: all 120
fresh careers and saves v1–20 remain included; Normal idle and managed each
must stay within three win points. Mean final money in each mode/difficulty
must remain within the baseline mean ±2 baseline standard errors, including
careers that ended early. Both six-row tables belong in the PR.

`npm run soak -- --difficulties easy,normal,hard --jobs 4 --shard i/7`
partitions the original case list across seven runners (1 ≤ i ≤ 7). It preserves
every case's seed, difficulty, mode and planned seasons, including saves v1–20.
The unsharded command is unchanged. Pool all seven JSON files and enforce the
complete 140-case guard before reporting an acceptance result; individual shards
are not a complete soak. `tests/qa/shard.test.ts` verifies exact partition coverage
and preserves case objects and their order within each shard.
