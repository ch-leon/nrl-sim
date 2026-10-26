# Career evidence for the October tuning pass

All runs use the repository's existing soak harness and seeded manager. Wildcard
cards are enabled (main includes beea9e9). JSON retains every run and season;
logs retain the harness's summaries. Old-save runs are migration checks, excluded
from the 20-seed economy and ten-seed season comparisons.

- `baseline-season`: shipped main e75e140.
- `rejected-global-*`: acaa569, catch base 3.5% and home edge +0.5. Rejected:
  managed Normal ended in the red 4/20, above the 3/20 cap.
- `tuned-*`: sim source c10e2f9, Expansive pass -0.10 and pace.extraPerStat 0.03.
  Global catch errors and home edge are restored to main. These runs began
  before the commit was recorded, so balance metadata says acaa569 with
  uncommitted changes. The sim defaults are exactly those committed at c10e2f9.
  Subsequent report precision and status prose do not affect the sim.

The documented shipped economy baseline (1/20, 3/20, 8/20 managed in the red)
comes from docs/status/2026-10-balance.md on e75e140. It is not the rejected
trial's economy JSON.

Commands used for the original season and rejected broad-economy trials:

```bash
npm run soak -- --seasons 1 --seeds 10 --difficulties normal --live-rivals --jobs 3 --json work/season.json
npm run soak -- --difficulties easy,normal,hard --jobs 3 --json work/economy.json
```

The first source's season run used four jobs. Jobs only partition independent
runs; seeds and outcomes are unchanged. Season seeds are 7919, 15838, ...;
the live-rival comparison is idle and managed Normal for each of ten seeds.
The rejected broad economy trial uses 20 seeds and five seasons, idle and
managed on all difficulties, plus old versions. The final integrated economy
uses the same 20 managed seeds on each difficulty, plus all old-save checks;
its idle careers are omitted by the managed-only flag. End money is the last recorded season balance of each of
the 20 fresh careers, including clubs stopped early. This matches the status
doc's definition and avoids survivor-only season-five means.

Goldens (seed 1, even 60, Slide defence, home attack as named):

| Home attack | Before | Tuned |
|---|---|---|
| Balanced | 8-16:346:3436c830c791688a | 8-16:346:3436c830c791688a |
| Expansive | 18-18:341:c5d42c10eb6a4f46 | 14-14:385:97934f5b337f329e |

Both are asserted in tests/match/balance/balance.test.ts. Full typecheck,
1,730-test suite, and production build pass; see ../validation/check.log.
WebKit is run by PR CI because local browser downloads are denied by the
cloud network policy.

## Integration with newer main

While the validation ran, main advanced to b2a1c2d (#334: event polish,
closed gates and rival suspension eligibility). It was merged as c5a6311.
The match engine and all flat-match presets above are unchanged by that merge.
A new managed-only switch in the existing soak runner (2d7abdb) reproduces
exactly the requested career sample without adding idle careers.

The final career checks are repeated on 2d7abdb:

```bash
npm run soak -- --managed-only --difficulties easy,normal,hard --jobs 4 --json work/economy-latest.json
npm run soak -- --seasons 1 --seeds 10 --difficulties normal --live-rivals --jobs 4 --json work/season-latest.json
```

These retain all old-save checks. `merged-managed-economy.*` and
`merged-season.*` are the final integrated results; `tuned-*` retain the
pre-integration comparison. The wildcard-specific integration tests (19),
typecheck and production build also pass on the merged source. The final PR head runs the complete check and WebKit jobs in CI; consult
the PR checks for their results.
