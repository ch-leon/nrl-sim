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
  busts, strips, intercepts). Each seed is a **whole match**: two 9:00 halves,
  half-time (legs part-restored), the siren and full time, won on points. **minutes**
  (optional) plays one stretch of that many minutes from a kick-off instead, with no
  half-time; its counts are scaled to 18 minutes.
- **Sides**: either a flat squad (`rating` for every stat, `stats` to override some)
  or a league `club`'s generated roster. `tactics` takes `attack` (grind, balanced,
  expansive, kick-chase, all-out) and `defence` (slide, rush, compressed). `traits`:
  `none` (flat squads' default), `gen` (clubs' default), `stars`. `bench` is how many
  interchange players (0–4, default 4; a flat squad's bench has its stats) and
  `rotation` how hard the coach uses them: `off`, `standard` (default), `heavy`.
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
  and `level-rating.json` use them.
- **Scenario extras**: `legs` (`fresh`, `late`, `spent` or 0..1), its own `minutes`
  (a stretch instead of a whole match, e.g. the last 8 minutes on tired legs) and
  `weather` (`clear`, `rain` or `wind`; clear unless given) and `calls`, coach calls each side
  makes whenever it may (`{ "home": [{ "call": "shift-left", "tackle": 2 }] }`, #73), and
  `plans`, changes of plan at the breaks, each made once at the first break it names
  (`[{ "side": "home", "at": "half-time", "tactics": { "attack": "expansive" } }]`; `at` is
  `half-time`, `try` (the first try) or `conceded` (the first try against that side), N11).
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
scaled to 18 minutes), both sides together, so they read against the §7 targets: **✓** inside, **↑** above,
**↓** below. In brackets, the change from the baseline row; a **\*** means the change
is bigger than luck explains (more than two standard errors, only judged with 8+
matches a row). No star means it may be noise: run more seeds before deciding.
**Home win** is the share of matches the home side scored more tries in; **Wrestle s**
the average wrestle; **Legs end** each side's average energy at the last 3-minute
mark. **sinBins** is men sent to the bin a match, **shortMin** the minutes of clock one
side was alone a man short and **binSwing** the points the full side scored minus the
short side's over them (so binSwing / shortMin × 5 is the swing per five-minute bin). Every other number (strips, intercepts, quick play-the-balls, wrestles held by
1/2/3 men, legs at every mark, standard errors) is in `results*.jsonl`.

## Always on

`.github/workflows/balance.yml` runs `standard.json` on every push to `main` that
touches the match code or a plan, compares it with the previous standard run, shows
the report on the run's summary page and publishes it to `balance-log`. Run any plan
from the Actions tab (**Balance → Run workflow**, plan path and optional seeds); jobs
can run for up to about 5½ hours.
