# Immutable v34 individual challenge migration sources

These normal AU and UK League careers were simulated on commit
`008c7ceef9a04de5823823c0f9c9ccd3ecbd9ac1` using Normal difficulty and seed 573
in private in-memory storage at normal slot 1. The fixture bytes are the
production slot and sidecar writes. Keep them unchanged for migration tests.

| Week | Career checkpoint |
| --- | --- |
| 5 | Four intervals elapsed, before the first League match |
| 6 | Five intervals elapsed, before League round 2 |
| 13 | Twelve intervals elapsed, before an Open Cup date without a club fixture |
| 14 | Thirteen intervals elapsed, before League round 7 |

Both clubs let their unanswered Open Cup offers expire. The production QA
harness advanced the clock and completed the club fixtures in Weeks 1, 4, 5,
6, 8, 9, 11, 12 and 14. The two due-week matches per pack used their actual
kickoff sheets and options in `LiveSim`. Each sidecar was persisted after 720
real sim ticks (33.9 seconds on the match clock) through the kickoff's
`onProgress` save callback. The capture continued that same sim to full time
and checked its result settled the fixture. Field length was 100 m, with
2.5-minute halves and no coach inputs or live rival setting.

The separate `v34-au-week-6-camp-completed.json` follows the same initial career
with a Skills Camp booking at Week 4. The driver chose the first starter with
legal cover, confirmed through the production booking command, and played the
trial and the Week 5 opening fixture. Lenny Steplock was absent from the
opening match sheet and returned before Week 6 with the saved camp award.

These captures provide historical import and club-match recovery inputs.
They contain no individual challenge records or qualification adjustments.
The evidence is from the headless production match and career systems.

## Reproduce

Archive the exact source commit into a temporary directory and install its
locked dependencies. Copy `capture.ts.txt` to `scripts/capture-challenges.ts`
inside that archive. Run the commands from the archive root, substituting
absolute directories for `<output>` and `<second-output>`.

```sh
node_modules/.bin/vite-node scripts/capture-challenges.ts capture au <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts capture uk <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts capture-camp au <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts verify au <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts verify uk <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts verify-camp au <output>
node_modules/.bin/vite-node scripts/capture-challenges.ts capture au <second-output>
node_modules/.bin/vite-node scripts/capture-challenges.ts capture uk <second-output>
node_modules/.bin/vite-node scripts/capture-challenges.ts capture-camp au <second-output>
diff -qr <output> <second-output>
```

Each `verify` command installs and loads the Week 5 and Week 13 saves, advances
through the corresponding interval and compares the exact Week 6 or Week 14
slot bytes. It then imports the due week's held export, reopens the same
fixture at the saved resume tick, and computes the paused snapshot and full
result hashes recorded in `manifest.json`. All imports and slot loads reported
zero repairs. A second generation reproduced all 13 fixture files byte for
byte.

To reconstruct a held export, parse the due-week slot and its matching
`live-matches` sidecar. Add the latter under the top-level `nrlLiveMatch` field
and stringify with two-space indentation. The driver independently compares
that expression to the production `exportSave()` output. The Skills Camp
variant has no matching sidecar.
