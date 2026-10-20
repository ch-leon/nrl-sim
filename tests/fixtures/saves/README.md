# Save corpus

Real saves from the phone playthrough (`npm run e2e:season`), one file per save
version at each point: `v<version>-<point>.json`, about 120 KB each.
`tests/qa/corpus.test.ts` checks that every one still migrates to `SAVE_VERSION`,
passes the soak's invariant checks and plays a whole season headless.

Rules:

- **Never edit a file here.** Each one is what a player on that version has in
  their phone; the migrations have to keep loading it as it is.
- **Add, don't replace.** When `SAVE_VERSION` moves, run the playthrough on the new
  `main` and copy two or three of its dumps from `e2e-output/saves/` here (the
  file names already carry the version). Old versions stay.

Points the playthrough dumps: `after-tutorial` (new game, nothing advanced yet),
`mid-season` (facilities, a signing, a kit, event cards answered, about round 14),
`after-rollover` (season 2, week 1: history, aged squad, juniors, new fixtures),
`season-2` (a week into season 2) and, from v13, `live-rivals` (the held-week step: rival
matches on the match engine turned on and one round of them played).
