---
name: balance-experiments
description: Write scenarios and run balance experiments on the live match sim with the repo's harness (npm run balance). Use when asked to test, measure, tune or compare match balance, try knob values or sweeps, check the §7 targets, run or queue balance plans, or log and report results. Do not write ad-hoc measurement scripts; this harness does it.
---

# Balance experiments

The harness plays the live match sim headless over many seeds and reports what
happened, with any knob overridden by name. Full reference: `balance/README.md`.
Knob meanings: `docs/specs/BAK-208-tuning.md`. Targets: BAK-208 spec §7.

Your job is usually one of three: **write a plan** (scenarios + variants) for a
question, **run** plans and keep the results, or **report** what came back. Do only
what you were asked; never change game code or knob defaults as part of an
experiment. Overrides exist so that nothing in `src/` has to change.

## 1. Pin down the question

One plan answers one question, written in its `description`, e.g. "Does a lower
defenders' grip make late busts common between even sides?" A question names:

- **what to measure**: a report column (tackles, breaks, lateBusts, offloads, errors,
  kicks, tries, bigHits, gassed, sinBins, shortMin and binSwing — the swing per bin is
  binSwing / shortMin × 5 — home win, wrestle s, legs) or a field in
  `results*.jsonl` (strips, intercepts, quickPtb, slowPtb, held1/2/3, legs per 3 min);
- **which knobs move it**: find them in the tuning reference or with
  `npm run balance -- --list | grep <word>`;
- **where it matters**: the scenarios (below).

## 2. Write the scenarios

A scenario is one matchup. Pick the fewest that answer the question, and always
include a neutral one (`even 60 v 60`) so effects can be told from matchup quirks.

```json
{ "name": "stamina 30 v 80",
  "home": { "rating": 60, "stats": { "stamina": 30 } },
  "away": { "rating": 60, "stats": { "stamina": 80 } } }
```

- **Flat squads** (`rating`, default 60, for every stat; `stats` overrides
  speed / strength / stamina / skill / footyIQ) isolate one difference. Prefer them.
- **Clubs** (`"club": "rival-reapers"`) use a real generated roster with its traits.
  Ids and strengths: reapers 78, wolves 71, stingrays 68, thunder 66, cyclones 62,
  crocs 60, drovers 57, brumbies 55, swagmen 53, mariners 50, gulls 48, diggers 45,
  scorpions 42, brollys 39, larrikins 35 (all prefixed `rival-`).
- **Tactics**: `"tactics": { "attack": "grind|balanced|expansive|kick-chase|all-out",
  "defence": "slide|rush|compressed" }` (default balanced / slide).
- **Traits**: `none` (flat default), `gen` (club default), `stars` (two level-III
  traits each: a stress test).
- **Squads** (`"squad": "player"` or `"rival"`, N12.2) are built as the game builds the
  player's match, a new pair every seed; a rival with no `rating` is level with the
  other side. `"rivalOf": "easy|normal|hard"` gives a side the difficulty's edge.
  Use them for questions about the player's club against its rivals.
  `"style": "expansive"` (any attack) on a rival squad plays a squad whose nine
  reads as that style, as the season's rival styles are picked (#322).
- **Bench**: `"bench": 0–4` interchange players (default 4) and `"rotation":
  "off|standard|heavy"` (default standard). Rotation is a side setting, not a knob: to
  compare policies write one scenario per policy.
- **Legs**: `"legs": "fresh|late|spent"` or 0..1, with `"minutes"` for that scenario
  (a single stretch instead of a whole match; late legs over a full 14 minutes run dry, so
  use about 6).
- **Own match count**: `"seeds"` on a scenario overrides the plan's. `"track":
  "home"|"away"` reports that side's win rate to a tenth of a percent; `"bothWays": true` (needs `track`)
  also plays the swapped fixture and pools it. Counts stay the written orientation.
- Names are what the report shows. Make them say the matchup ("rush v slide",
  "70 v 50"), unique within the plan.

## 3. Write the variants

- A **baseline** (current values) always runs first; every row is compared with it.
- **Sweep** one or two knobs over a handful of values that bracket the current one:
  `"sweep": { "wrestle.gripBase": [1.1, 1.2, 1.3, 1.4] }`. Two axes multiply
  (4 × 3 = 12 variants).
- **Hand-written variants** for a named idea:
  `{ "name": "rush commits two", "tuning": { "presets.defence.rush.commit": 2 } }`.
- **base** applies overrides under every variant (the experiment's fixed ground).
- Values must be numbers. A misspelt knob fails `--check`, so check before running.

## 4. Size it

- **seeds**: 20 for a general measurement, 40+ for rare events (late busts, strips,
  intercepts, home win %). Each seed is a **whole match** (two 7:00 halves, half-time,
  full time, won on points) unless the plan or scenario gives **minutes** for a single
  stretch.
- Time ≈ cells × seeds × 0.75 seconds on one core, where cells = variants ×
  scenarios. Divide by `--jobs` (use `nproc`). Over about 2 hours, split it into
  several plans or say so before starting.

## 5. Check, run, keep

Put ad-hoc plans in `balance/plans/experiments/<yyyymmdd>-<slug>.json` (git-ignored;
each run keeps a copy of its plan). Commit a plan to `balance/plans/` only when it
should be rerun by others or from the Actions tab.

```bash
npm run balance -- --check --plan balance/plans/experiments/<file>.json
npm run balance -- --plan balance/plans/experiments/<file>.json --jobs "$(nproc)"
# stopped part-way? carry on, nothing runs twice:
npm run balance -- --resume balance/runs/<run folder> --jobs "$(nproc)"
scripts/balance-log.sh publish balance/runs/<run folder>
```

To compare with an earlier run of the same plan, add `--previous <run folder>`
(`scripts/balance-log.sh fetch` then `scripts/balance-log.sh latest "<plan name>"`
finds the last one on the log). Long unattended runs can also go through **Actions →
Balance → Run workflow** with a plan path that is on `main`.

## 6. Report back

Give: the question, the plan file, the run folder, the commit (top of the report),
and the report tables as written. Then, only if asked to interpret:

- A change is real only if starred (`*`). Unstarred changes are noise until a run
  with more seeds says otherwise. Never call an unstarred difference an effect.
- Read the §7 marks (✓ ↑ ↓) on the baseline row first: they say what is already off
  before any tweak.
- Say which variant moves the target metric toward its band with the fewest side
  effects on the other columns, and what you would sweep next. Leave the decision
  to change a default to the person; it goes through a normal PR with the tuning
  reference and spec updated.
