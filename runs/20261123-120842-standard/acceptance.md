# Seven match-sim improvements

The first seven pieces were reviewed separately in draft PRs [#786](https://github.com/ch-leon/nrl-sim/pull/786) through [#792](https://github.com/ch-leon/nrl-sim/pull/792) and then exercised together on a private test branch. The [Notion playbook](https://www.notion.so/4210870d4c44816aafc0dff55e8c3f08) records each rule, the replay seed and expansion ideas.

## Five-minute matches

Each standard run covers 13 scenarios and 1,340 simulated matches. Each tactic below played 100 seeds from both ends. Its score is the percentage of wins plus half the percentage of draws. The target range for these six comparisons is 42–58%. The four attacking presets face Balanced. The two defensive presets face Slide.

| Build | Grind | Expansive | Kick-chase | All-out | Rush | Compressed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Main baseline](../20261122-235848-standard/report.md) | 53.75% | 55.50% | 48.75% | 50.00% | 50.50% | 50.00% |
| [Score and clock](../20261123-114924-standard/report.md) | 52.75% | 54.50% | 47.50% | 50.50% | 50.50% | 50.75% |
| [Corner cover](../20261123-120434-standard/report.md) | 54.25% | 48.75% | 50.25% | 49.50% | 55.00% | 51.75% |
| [Dummy and go](../20261123-120721-standard/report.md) | 50.25% | 46.75% | 48.50% | 56.00% | 51.50% | 50.75% |
| [Signature drive](../20261123-121659-standard/report.md) | 53.75% | 55.50% | 48.75% | 50.00% | 50.50% | 50.00% |
| [Penalty advantage](../20261123-122308-standard/report.md) | 49.75% | 52.00% | 46.00% | 47.50% | 54.25% | 49.00% |
| [Wind](../20261123-122601-standard/report.md) | 53.75% | 55.50% | 48.75% | 50.00% | 50.50% | 50.00% |
| [All seven together](../20261123-120842-standard/report.md) | 51.00% | 51.50% | 46.25% | 54.50% | 48.00% | 47.50% |

The combined run averaged 2.10 tries in the 20 equal-strength fixtures. The 70-rated side won 10 of its 20 fixtures against the 50-rated side, with four draws. The standard flat teams and clear weather leave the signature trait and directional gusts dormant. The Stars and windy Match Lab recordings exercise those features. The remembered-duel feature changes presentation only. Its full seed-2 match result matched main.

## Review notes

- On 48 equal-strength seeds, the fullback averaged 0.208 corner saves and 0.229 missed dives per match. The observed try difference was below the harness threshold. Saves are still rare compared with the wider [#652](https://github.com/ch-leon/nrl-sim/issues/652) ambition. [Corner measurements](../20261123-115737-corner-cover-tackle/report.md)
- Across 160 new equal-strength seeds, the attack attempted 4.91 dummies and drew 2.18 bites per match. Tries averaged 1.55 with the dummy switched off and 1.59 with it on. The initial lead-change and comeback differences did not repeat above the harness threshold. Total tackle breaks averaged 16.25 with it off and 15.18 with it on. [Initial dummy sweep](../20261123-115137-dummy-pass/report.md) · [Independent sample](../20261123-120943-dummy-read-holdout/report.md)
- The initial 20-seed run had the 70-rated side winning only 5 games with the dummy enabled. Across 100 different seeds played from both ends, the stronger side won 56% with the dummy off and 52% with it on. Counting draws as half a win gives 65.50% and 61.75% respectively. The larger sample preserves the strength advantage and leaves its size worth watching. [Strength sample](../20261123-121901-dummy-strength-holdout/report.md)

## Combined gameplay and replay

The six gameplay drafts were tested separately from the same main commit. The combined rehearsal used a fresh match-recovery revision (26) and updated the deterministic replay witnesses for the combined rules. When landing approved changes, assign a fresh recovery revision to each shipped ruleset and verify its witnesses against the resulting match engine.

A defender followed a dummy, recovered and made the low cover tackle. A separate cover tackle played through an existing advantage, and the referee called it back to the original mark. A late-game lead led the kicker to punt in both clear and windy conditions. The Stars prop received a signature drive and earned the tackle bust. Seeking backward and forward rebuilt a repeat duel.

The integrated production build completed the 75-step 844 × 390 mobile career walkthrough with zero failed steps, layout problems or runtime errors. The watched and headless results agreed in both trials and round one. The combined typecheck, 75 focused tests and 10 historical checks also passed.
