# Issue #488: trials-era comparison

Main: 6bb6cc05456c331f6ec047e8510d2619bc084d85. Branch: 1fecccf130920b4b617bd367b4fd1208f7f749fc.

`main-soak.json` preserves the complete #508 baseline and its original measured provenance. See `provenance.json` and `upstream-economy-provenance.json`: all 115 game/harness blobs in the listed paths match current main. The plan-fit merge adds UI/readout behavior and does not change these simulation paths.

`branch-soak.json` repeats the same 80 cases on this PR: 60 fresh careers (10 seeds × idle/managed × Easy/Normal/Hard, three planned seasons), plus legacy saves v1–20 (two planned seasons). `uk-soak.json` runs 30 UK managed careers (10 seeds × Easy/Normal/Hard, three planned seasons). Both use the existing `runSoak` harness, persistent workers and per-career checkpoints; `soak-specs.json` preserves the exact inputs. Board sackings can terminate careers early.

The comparison excludes only runtime (`ms`), serialized save size (`saveBytes`) and pack metadata (`pack`). It compares all actual financial, match and career fields. Tables use fresh-career samples only, reporting season-one and season-three cash means, summed debt weeks and fire sales, cumulative sackings through that season, and finals qualification / sample count. Dropped careers are reflected in sample counts; these are survivor means, not a fixed cohort estimate. Legacy outcomes remain in the raw comparison.

Both presets runs use the complete unmodified `balance/plans/presets.json`: six 200-seed scenarios in both orientations and two 40-seed half-time scenarios, 2,480 matches per revision. All measured fields except runtime are compared. Match fingerprints remain unchanged and are separately tested by CI.
