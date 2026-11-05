# Issue #488 evidence

Main: ce2c57b214ca9a838ce18c786336e679ea045973. Branch: a0b5a0abf6f69590a897b93d1fa664143335cd87.

Main/branch: the same 3 planned seasons × 10 seeds, idle/managed, Easy/Normal/Hard (60 fresh careers), plus 20 legacy-save cases (v1–20, two seasons each). Both produced 215 season samples with zero invariant problems. No seed was dropped or selected by outcome. After an environment interruption, the same runSoak cases were checkpointed individually; the complete case list is preserved in soak-specs.json.

UK: 30 managed careers, 10 seeds per difficulty, three complete seasons each: 90 season samples, zero invariant problems, zero board sackings.

The main/branch results compare exactly after removing only execution time, save byte count and optional pack metadata. The eight presets results compare exactly after removing only execution time (2,480 matches each).

Cash is the mean of runs reaching the named season. N shows early sackings; debt weeks, fire-sold player counts and board sackings are totals for that season. Finals are count/N. The economy table excludes old-save cases, which remain in the raw results.

## Rebase onto Tight rename #507

The PR was rebased from `a0b5a0abf6f69590a897b93d1fa664143335cd87` onto main `33de8a7cd121389bea3b96ddb7510db09da5aa61`, producing `6dcb29fc519560294db436998511be72adb1c3a5`. The measurements above retain their actual original commit IDs.

`rebase-provenance.json` records byte-for-byte Git blob identity for all non-UI source plus the soak/balance scripts, preset plan and Vite configuration: 197 files for measured main versus rebased main, and 198 for the measured branch versus rebased branch. In both comparisons the only changed files are the same six Tight display-copy, tests and documentation files. No simulation, economy, names, content pack, save or harness source changed. Therefore the complete economy and presets measurements remain applicable after this rebase. Rebased fingerprint/name tests and CI are checked separately in PR #509.
