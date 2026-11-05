| Moment (CPU ×4, 844×390) | Time | Longest block | Notes |
|---|---|---|---|
| load → title | 1111 ms | 546 ms | 1048 ms since navigation start in-page |
| Start → grounds (textures painted, HUD up) | 1275 ms | 307 ms |  |
| grounds fps | 36 fps |  |  |
| grounds frame rate (3 s) | 3069 ms | 0 ms | 36 fps |
| Advance Week → match scene (hand-off) | 653 ms | 176 ms | of which the tick itself 158 ms |
| match play at ×4 (15 s): longest frame | 50 ms | 59 ms | 527 frames, 0 over 100 ms |
| Skip → full time | 3152 ms | 186 ms |  |
| Back to Club → grounds | 304 ms | 153 ms |  |
| ×4 advance #1 | 6309 ms | 70 ms | 3 weeks |
| ×4 advance #2 | 4066 ms | 68 ms | 3 weeks |
| ×4 advance #3 | 2651 ms | 76 ms | 2 weeks |
| tick per week (×4 advances) | 1628 ms |  | 8 weeks in 13026 ms |
| tap mid-advance (touch to its handler) | 116 ms |  | progress line read "WEEK 10 OF 27…" |
| to finals (call 1) | 2015 ms | 106 ms | 2 weeks, now week 12 |
| to finals (call 2) | 2801 ms | 53 ms | 2 weeks, now week 14 |
| to finals (call 3) | 1929 ms | 66 ms | 1 weeks, now week 15 |
| to finals (call 4) | 2923 ms | 66 ms | 2 weeks, now week 17 |
| to finals (call 5) | 3312 ms | 67 ms | 3 weeks, now week 20 |
| to finals (call 6) | 1395 ms | 63 ms | 1 weeks, now week 21 |
| to finals (call 7) | 2464 ms | 72 ms | 2 weeks, now week 23 |
| to finals (call 8) | 3849 ms | 78 ms | 2 weeks, now week 25 |
| to season end (call 1) | 251 ms | 78 ms | 2 weeks |
| to season end (call 2) | 219 ms | 111 ms | 1 weeks |
| rollover (season end call minus its weeks) | 219 ms |  | 219 ms call, 0 plain weeks before it |
| bundle (10 js/css files) | 1863 KB raw, 539 KB gzipped | | index-DgqwFz8u.js 1571 KB, matchWorker-BTPRYz_6.js 124 KB, towns-ChIH3guL.js 86 KB |

| Budget (scripts/perf-budget.json) | Value | Max | |
|---|---|---|---|
| titleMs | 1111 | 3500 | ok |
| groundsMs | 1275 | 2750 | ok |
| handoffMs | 653 | 1000 | ok |
| handoffBlockMs | 176 | 300 | ok |
| skipMs | 3152 | 5000 | ok |
| skipBlockMs | 186 | 300 | ok |
| backToClubMs | 304 | 1000 | ok |
| weekMs | 1628 | 2250 | ok |
| advanceBlockMs | 111 | 300 | ok |
| midAdvanceTapMs | 116 | 300 | ok |
| bundleGzKb (warning) | 539 | 590 | ok |

Every budget met.
