# Immutable v33 assignment migration sources

These are actual simulated AU and UK League careers from unchanged commit
`6b1cfa76145f8b399c4ce2c97e194fdfabcacdb7`, seed 573, Normal difficulty and normal
slot storage. They are source captures, not browser playtest evidence. Do not
rewrite the JSON fixtures. `manifest.json` records exact hashes and provenance.

Week 4 is before the second trial; Week 5 is before the first regular league
match. The corresponding `live-matches` sidecars were saved at actual kickoff.
Cup entry is still open and unanswered. No scores, players or fixtures were
fabricated. Independent regeneration reproduced all six files byte for byte.
Fresh-process replay from each Week 4 snapshot reproduced its Week 5 checkpoint;
both held exports reopened their original fixture and seed without repair.

For reproduction, archive the exact source commit into a separate temporary
directory, install its unchanged dependencies, and copy `capture.ts.txt` to
`scripts/capture-opening.ts` there. The `.txt` suffix keeps this historical driver
out of the current TypeScript build; its bytes match `capture_driver.sha256`.
Run `node_modules/.bin/vite-node scripts/capture-opening.ts capture au <output>`
and the same command for `uk`. Use `verify` instead of `capture` to independently
load, replay and reopen each captured pair. The original absolute commands in
the manifest describe the capture environment; substitute your archive/output
paths when reproducing. The committed driver only runs against save version 33.

To reconstruct the original held export, parse the Week 5 slot and matching
sidecar, attach the latter as `nrlLiveMatch`, then stringify with two-space
indentation. Migration tests must preserve the original slot/sidecar bytes and
recover the same match; migration must not invent a camp booking or award.

The byte-for-byte rule holds only on match-engine revision 6, the one these saves were recorded under. On a later revision the tests still check migration exactly, but a week's results and the held match are re-played (`tests/core/assignmentMigration.test.ts`, #747).
