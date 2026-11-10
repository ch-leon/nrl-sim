# AI persona career playtesters (#534)

Measure difficulty, progression, economy and save health through the existing soak
harness. This is QA tooling, with no changes to game balance or save format.
Exactly four starter configs ship: **min-maxer**, **casual-weekly**, **careless**,
**newcomer**. Leon's 10 November 2026 decision makes the long matrix **on demand
only**. There is no nightly job, workflow change or automatic issue filing.

## Smoke (PR use)

```bash
npm run soak:personas:smoke
# Included automatically in the existing unit-test command:
npx vitest run
```

`tests/qa/personas.test.ts` checks all four policy shapes and mistake-rate ranges,
real training/facilities/recruitment/staff/attack-coach/playbook/tactics decisions,
AU deterministic smoke (min-maxer, Normal, seeds 7919/15838, four weeks, repeated),
UK determinism, idle/managed compatibility, save validation/repairs/refusals,
current SAVE_VERSION, partial-season/failed-load boundaries, card expected value,
outlier flags and warning-only baseline
comparison. The focused file takes about 12 seconds on the build environment;
it does not play the long matrix.

To inspect machine and human output for a tiny run:

```bash
npm run soak -- --personas min-maxer --difficulties normal --seeds 2 --weeks 4 --seasons 1 --json work/persona-smoke.json --report work/persona-smoke.md
```

## Full matrix (manual only)

```bash
npm run soak:personas -- --seasons 5 --seeds 20 --jobs 4 --json work/personas.json --report work/personas.md
# Split the same ordered case set across machines; repeat for each i in 1..4:
npm run soak:personas -- --seasons 5 --seeds 20 --shard 1/4 --jobs 4 --json work/personas-1.json --report work/personas-1.md
# Same four personas × easy/normal/hard for the prepared UK pack:
npm run soak:personas -- --pack uk --seasons 5 --seeds 20 --jobs 4 --json work/personas-uk.json --report work/personas-uk.md
```

These are 240 careers per pack before sharding (20 seeds × four personas × three
difficulties), up to five seasons each, stopping when sacked. Seeds are `i * 7919`
for `i=1..--seeds`, as on soak. `--jobs` partitions cases across processes and
restores case order; `--shard i/n` selects unchanged cases before jobs. They can
be expensive and are **not a merge gate**. Do not run `npm run balance` for this
feature. `npm run soak` keeps its original idle/managed and AU old-save cases;
persona matrices contain only selected persona careers. Direct `runSoak` callers
can still combine personas with `fromSave`/`fromVersion` and `liveRivals`.

`--personas all` discovers configs; `--personas min-maxer,newcomer` selects ids.
Without `--difficulties`, each config's defaults apply. The matrix npm script
explicitly selects all three difficulties. Omitted output paths default to
`work/personas.json` and `work/personas.md`; choose distinct files for each shard.
Each invocation writes JSON with raw per-run observations, per-run summaries,
rollups and comparison warnings, plus a Markdown report. Reports from partial
shards describe that shard's observations, not an unrun full matrix.

## Rules and measurements

Configs under `src/qa/personas/configs/` specify every decision domain, reserves,
default difficulties and mistake rates (3%, 20%, 60%, 15%). Discovery is automatic:
adding a later persona is a new config file using existing policy primitives,
not another `if (persona.id)` code branch. This build adds no extra personas.
Policies use a private seeded RNG for slips/inaction and random choices. Only
real game actions advance the game's RNG. There are no LLM or API calls.

Weekly and match-prep hooks call real game operations, using the soak manager's
existing build placement helper and weekly budget calculation. Min-maxer uses
weakest-stat training on the best nine, reserve-limited improvements/renewals,
training/gate investment, counter-table tactics with squad fit breaking ties,
and executable coach-family plays ranked by current fit, failure odds and contact
bonuses. Event utility is a transparent estimate of visible effects, including
probabilities and modifier duration. Casual stays shallow, builds only the first
cheap training facility, renews stars, signs for shortages and hires Welfare late.
Careless buys stars without wage reserves, trains randomly and chooses mismatches;
facilities are neglected (there is no upkeep toggle). Newcomer keeps defaults,
first-button cards and Balanced training, skipping decisions through inaction;
it signs only below the playable minimum and never opens coach/playbook menus.

Persona weeks use `advanceWeekAsTapped`, the existing headless tapped-week driver,
so actual kickoff sheets and results are observable. Rivals keep the normal cheap
round model unless `--live-rivals` is requested. As with a real tapped week,
Assistant Coach break changes apply only to fast-forwarded matches, not this path.
The old idle/managed fast-forward path is retained.

- **Wins:** regular wins/games, finals wins/games and finals-appearance share of
  completed seasons. Trials are retained separately and excluded from win rates.
  Forfeits count as losses; the strategy tables exclude them. Draws count as zero
  wins in win rates and half a win in outlier win share.
- **Progression:** elapsed weeks, including trials, for the best-nine mean to first
  reach 70/80/90 (0 if already there). This includes recruitment and is not an
  individual training curve. Null means unreached/censored; rollups show both the
  reached mean and reached/censored counts.
- **Money:** weekly cash series, transaction-level minimum cash, completed-season
  closing cash and P&L using the existing finance lines. Partial and sacked seasons
  remain visible and marked incomplete; completed-season averages exclude them.
- **Broke:** any bankruptcy warning or forced sale, or a sacking with a structured
  missed solvency objective. Counts and the career-level rate are separate.
- **Outliers:** attack × opposing defence and each taken play's win share versus
  games without that cell. Flag ≥15 percentage points difference only with at
  least 10 games in both groups. Tables show sample sizes and null comparisons.
  These are observational, affected by strength, persona, difficulty and plays
  selected together. They do not establish causality or justify an automatic retune.
  Kickoff plans are recorded; in-match rival switches are not attributed to new cells.
- **Saves:** initial loaded inputs record validation outcomes; every season serialises then uses the production import parser,
  migrations (when needed), `saveValidation` and `loadState`, continuing the loaded
  career. Repairs include field-level details; failed loads are counted. Existing
  soak reload-equality and `checkState` checks remain active.
- **Stability:** crashes/thrown ticks, invariant failures and non-finite number
  counts. The raw `problems` list remains the soak's hard-error exit condition.

## Baselines (warnings only)

`src/qa/personas/baseline.json` contains measured AU season-one endpoints for all
four personas and three difficulties, seed 7919. Reproduce it with:

```bash
npm run soak:personas -- --seasons 1 --seeds 1 --jobs 3 --json work/baseline-check.json --report work/baseline-check.md
```

A longer run compares its matching first-season endpoints too. Config contents,
seed, difficulty, pack, live-rivals mode, synthetic save version and endpoint must match; unrelated packs, changed configs,
or a four-week smoke never silently compare to a full season. Arbitrary loaded
saves are excluded from fresh-career baseline comparison. Reports state the
number of matching endpoints; no coverage produces an explicit warning.

To record a broader local baseline, then compare another run against it:

```bash
npm run soak:personas -- --seasons 5 --seeds 20 --jobs 4 --write-baseline work/persona-baseline.json --json work/reference.json --report work/reference.md
npm run soak:personas -- --seasons 5 --seeds 20 --jobs 4 --baseline work/persona-baseline.json --json work/candidate.json --report work/candidate.md
```

Baseline warnings cover regular win rate falling more than 10 percentage points,
minimum/end cash falling over 25% (at least $10,000), new broke careers, more
crashes/invariants/unloadable saves or repairs, and previously reached progression
thresholds delayed over four weeks or no longer reached. No warning fails CI.
Only real soak problems retain its existing nonzero exit. Do not refresh a
checked baseline to conceal a regression; inspect the report and leave balance
retunes to follow-up work. This baseline is measurement evidence, not a target
for how strong each persona should be.
