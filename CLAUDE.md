# NRL Sim — notes for agents

A Kairosoft-style rugby league club sim: Phaser 3 + TypeScript, all art generated
in code. Read `docs/ARCHITECTURE.md` for structure and conventions, `README.md` for
running it.

## Checks (what CI runs on every PR)

```bash
npx tsc --noEmit   # typecheck
npx vitest run     # unit tests
npm run build      # typecheck + production build
```

## Where things are decided

- `docs/specs/` holds one spec per ticket. The live match sim's design is
  `BAK-207-live-match-sim.md` (architecture) and `BAK-208-match-rules-and-skills.md`
  (rules, traits, tactics, fatigue). BAK-208 is a living doc: its delivery table (§9)
  says what has shipped, and each mechanic ships as its own PR with lab sign-off.
- `docs/specs/BAK-208-tuning.md` lists every match-sim knob: its name, file, current
  value and what moving it does.
- The match lab (`/#lab`) is where a person watches the sim and signs a mechanic off.

## Balance experiments — the harness exists, use it

Do not write throwaway scripts to measure the match sim. There is a harness for
that (`balance/README.md`):

- Every knob in the tuning reference can be overridden by name (`wrestle.gripBase`,
  `fatigue.runCost`, `presets.defence.rush.lineSpeed`, …) without editing code;
  `npm run balance -- --list` prints them all with their values.
- A **plan** (`balance/plans/*.json`) lists scenarios (who plays whom: ratings,
  stats, clubs, tactics, traits, starting legs) and variants (overrides, or a sweep
  of values). `npm run balance -- --plan <file> --jobs <cores>` plays every variant on
  every scenario over many seeds and writes `report.md`, with the §7 targets marked
  and changes beyond luck starred. `--resume` continues a stopped run.
- Runs are kept on the **`balance-log`** branch (`scripts/balance-log.sh publish
  <run>`); its `INDEX.md` lists every run with a link to its report.
- `.github/workflows/balance.yml` re-runs `balance/plans/standard.json` on every
  match-code change to `main` and compares it with the previous run.

To write scenarios or run an experiment, follow the `balance-experiments` skill
(`.claude/skills/balance-experiments/SKILL.md`).

## Conventions

- Match the surrounding code: comment density, naming, the footy vocabulary.
- Every match-sim number belongs in the tuning reference; when one changes, update
  its row and the spec section it came from.
- The sim is deterministic: same seed, same match. Adding a dice roll reshuffles every
  seed's match, so compare averages over many seeds, not one seed against itself.
