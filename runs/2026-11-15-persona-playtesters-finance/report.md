# Persona playtesters, 15 Nov — cash and the salary cap

Same run as 14 Nov: 240 Australian careers, 20 seeds, four personas, easy / normal / hard, five seasons, an 80 m field (`NRL_SOAK_FIELD=80`), matches of two 2.5-minute halves. This is main `ed6b6430`, which charges a signing fee, refuses a deal the cap cannot hold, and renews for free. The 14 Nov baseline is `runs/2026-11-14-persona-playtesters` at `82f7913e`, when wages, upkeep and overhead still came out of the bank every week.

The machine summary is `summary.json`. The harness's own tables are `harness-report.md`. Diaries for seed 7919 and the seed average are in `diary/`.

## Headline

Nobody goes broke, and nobody is sacked for money. On 14 Nov, 203 of 240 careers went broke and 150 were sacked for missing the solvency objective. Here that is 0 and 0. Bankruptcy warnings went from 10,582 to 0. There were no crashes, no thrown ticks, and no save that failed to load (a save at the end of every season, same as before).

That is the new model doing what it says, not a harness miss. Wages no longer touch the bank, and the solvency sacking was retired with the cash-and-cap split. Clubs still get sacked for results. Hard newcomers finish five seasons only 2 times out of 20, the same as November.

Cash runs away for anyone who does not spend it. A casual or newcomer club on normal ends season 5 with a median of about $2.5–2.7 million. On 14 Nov those same careers were usually broke by season 2. The cap does bite the club that signs every week (careless), and it does not bite the club that stands pat.

Training looks untouched. Season-1 XP and stars are within a few percent of November for casual and newcomer, and a bit higher for careless and min-maxer, who now survive long enough to keep training.

## Sackings and bankruptcy

Broke means the old bankruptcy warning, or a sacking whose failed objective was solvency. Both paths are gone, so the new column is zero everywhere. "Finished 5" is how many of the 20 seeds still had a completed fifth season. The rest were sacked for results, not for the bank.

| Persona | Difficulty | Broke, Nov | Broke, now | Solvency sackings, Nov | Finished 5, Nov | Finished 5, now |
|---|---|---:|---:|---:|---:|---:|
| Careless | easy | 20 | 0 | 15 | 10 | 20 |
| Careless | normal | 20 | 0 | 19 | 2 | 15 |
| Careless | hard | 20 | 0 | 20 | 0 | 8 |
| Casual | easy | 5 | 0 | 2 | 17 | 20 |
| Casual | normal | 18 | 0 | 11 | 7 | 15 |
| Casual | hard | 20 | 0 | 15 | 3 | 8 |
| Min-maxer | easy | 20 | 0 | 4 | 18 | 20 |
| Min-maxer | normal | 20 | 0 | 13 | 11 | 19 |
| Min-maxer | hard | 20 | 0 | 19 | 0 | 12 |
| Newcomer | easy | 5 | 0 | 3 | 15 | 14 |
| Newcomer | normal | 15 | 0 | 13 | 10 | 8 |
| Newcomer | hard | 20 | 0 | 16 | 2 | 2 |

A bankruptcy warning did not always end the career. Min-maxer on easy was flagged on all 20 seeds and still finished 18 of them; only 4 of those sackings were for solvency. Hard still ends a lot of careers early, and that is the board rather than the bank. Hard careless, casual and min-maxer all last longer than they did in November. Newcomers finish about as often as they did (2 of 20 on hard, both times).

## End-of-season cash

Median bank at the end of a completed season, and the range across those careers. November medians are in parentheses. A blank November cell means fewer than one career finished that season. Amounts are thousands of dollars, rounded.

| Persona | Difficulty | Season 1 | Season 3 | Season 5 |
|---|---|---|---|---|
| Careless | easy | 139 (was −68), 19 to 336 | 477 (39), 130 to 748 | 866 (−25), 308 to 1,172 |
| Careless | normal | 97 (−106), 3 to 389 | 238 (−65), 4 to 712 | 542 (−94), 24 to 1,220 |
| Careless | hard | 29 (−155), 3 to 253 | 109 (−57), 4 to 604 | 601 (none), 7 to 1,097 |
| Casual | easy | 542 (182), 413 to 745 | 1,629 (388), 1,357 to 2,149 | 2,846 (307), 2,355 to 3,545 |
| Casual | normal | 455 (−7), 380 to 712 | 1,521 (51), 1,059 to 2,331 | 2,702 (70), 2,173 to 3,832 |
| Casual | hard | 412 (−115), 345 to 532 | 1,325 (87), 805 to 1,951 | 2,770 (130), 2,291 to 3,081 |
| Min-maxer | easy | 201 (5), 82 to 280 | 685 (185), 211 to 1,208 | 3,029 (60), 2,092 to 4,087 |
| Min-maxer | normal | 102 (−43), 61 to 285 | 355 (62), 127 to 813 | 2,260 (7), 1,424 to 3,488 |
| Min-maxer | hard | 71 (−173), 49 to 207 | 154 (−95), 55 to 503 | 1,705 (none), 880 to 2,376 |
| Newcomer | easy | 595 (271), 419 to 737 | 1,649 (465), 900 to 2,040 | 2,528 (495), 1,994 to 3,042 |
| Newcomer | normal | 526 (98), 374 to 722 | 1,606 (270), 1,023 to 1,990 | 2,482 (270), 2,230 to 2,783 |
| Newcomer | hard | 421 (−102), 355 to 661 | 1,116 (21), 806 to 1,639 | 2,003 (46), 1,804 to 2,201 |

Every finished career ends season 5 richer than it started, on every persona and every difficulty. The poorest careless-hard season 5 is $7k; the richest min-maxer-easy is $4.1 million. November's season 5 medians were near zero or negative, and only the clubs that had not been sacked were still in the sample.

## Cap usage

The premier cap is $600,000. Opening squads sit at about 57–69% of it. That matches the earlier read of the real lists (about 60%), not the 80–95% the contract lists as the long-term target.

| Persona | Difficulty | Opening squad, median | Peak cap, median | Peak cap, worst seed | Cap room at the tightest week |
|---|---|---:|---:|---:|---|
| Careless | easy | 68% | 100% | 100% | $0 |
| Careless | normal | 64% | 100% | 100% | $0 |
| Careless | hard | 61% | 100% | 100% | $0 to $50 |
| Casual | easy | 64% | 84% | just under | about $99k left; closest seed $1,900 |
| Casual | normal | 60% | 74% | 91% | never fills |
| Casual | hard | 57% | 64% | 86% | never fills |
| Min-maxer | easy | 69% | 114% | 120% | about −$82k; worst seed −$121k |
| Min-maxer | normal | 60% | 112% | 120% | 19 of 20 seeds go over |
| Min-maxer | hard | 57% | 107% | 115% | 13 of 20 seeds go over |
| Newcomer | easy | 64% | 67% | 71% | never close |
| Newcomer | normal | 60% | 63% | 68% | never close |
| Newcomer | hard | 57% | 59% | 65% | never close |

Careless is the one persona the cap actually stops. It signs in about 90 to 110 weeks of a career and releases in 37 to 52. Once the room is $0, another signing needs a release first. The diary records the signings that went through (a name, an overall, a fee). It does not record a tap the cap refused. Room hitting zero, with releases in the same careers, is the evidence the refusal is doing the job.

Casual and newcomer each sign in a handful of weeks (median 3 to 5) and release about as often. Their peak never reaches the cap on normal or hard. On easy, the closest casual seed still had $1,900 of room, and the typical casual-easy career never got inside $99k. Refused deals are not what keeps them small. They simply do not shop.

Min-maxer goes over the published cap, and the extra is not the protected allowance for a relegated club (that column stays 0). On a typical normal seed the overage starts at the first trial week of season 4: the squad is under the cap at the end of season 3, then a new signing and the renewals that just became active land in the same week and the total steps to about $666k. It stays over for the rest of that season. One seed (134623, normal) is $117k over through the middle of season 5 with no signing and no release in those weeks, so this is not a one-week diary glitch. The cap check on a trial-week signing is not seeing the renewals that promote in the same week. That is a hole to fix before anyone treats "over the cap" as a tuning result.

## Where the money goes, and where it comes from

Totals below are the median across the 20 seeds, for the whole career, on normal. The other difficulties tell the same story with different finish counts. Wages, upkeep and overhead are $0 in every career. November's casual-normal career had a median of −$1.4 million in wages; that line is gone.

| | Careless | Casual | Min-maxer | Newcomer |
|---|---:|---:|---:|---:|
| Gates in | 2,328k | 2,317k | 3,683k | 2,016k |
| Reputation grant in | 245k | 245k | 340k | 244k |
| Prize money in | 160k | 168k | 350k | 65k |
| Board grant in | 65k | 50k | 70k | 30k |
| Sponsor in | 0 | 0 | 0 | 0 |
| Signing fees out | 2,354k | 284k | 437k | 241k |
| Release payouts out | 92k | 0 | 0 | 0 |
| Facilities out | 20k | 8k | 1,560k | 0 |
| Events out | 15k | 35k | 22k in | 24k |

Signing fees are the only serious cash sink, and only for the club that signs. Careless spends about $1.9–2.5 million on fees, depending on difficulty, and still finishes season 5 near $0.5–0.9 million up, because the gates keep paying after the cap is full and there is nothing left to buy. Casual and newcomer spend $0.2–0.4 million on fees across the career and take in a bit over $2 million at the gate.

Release payouts are small next to fees: about $90–100k for a careless career, nothing for a casual or newcomer club. Facilities only matter for min-maxer, who now has the cash to build and spends $1.3–1.9 million there. Staff still cost nothing to appoint. Min-maxer's gate and prize lines are higher than the others because those clubs win more, not because the income formula pays them a different rate.

Passive clubs do run away with the cash. Casual and newcomer are the passive end of this matrix. Their season-5 bank is $2.0–2.8 million wherever the career actually finishes, and the range is tight: the poorest casual-easy season 5 is still $2.4 million. On normal, a casual club takes in about $560k a completed season from gates, the reputation grant, prize money and the board, and spends about $60k of it. Difficulty changes the starting float ($90k / $60k / $45k) and how often the board sacks you. It does not change the fee, the salary, or the payout, so a hard newcomer who survives is just as rich as an easy one.

## XP and stars

Season 1 is the fair comparison. Later seasons in the November run are only the clubs that had not been sacked.

| Persona | Difficulty | Season-1 XP, Nov | Season-1 XP, now | Season-1 stars, Nov | Season-1 stars, now |
|---|---|---:|---:|---:|---:|
| Careless | easy | 18,687 | 20,753 | 4.0 | 4.5 |
| Careless | normal | 17,468 | 20,436 | 5.0 | 4.0 |
| Careless | hard | 15,089 | 17,602 | 5.0 | 5.0 |
| Casual | easy | 20,779 | 20,727 | 6.0 | 6.0 |
| Casual | normal | 19,594 | 19,564 | 7.0 | 7.0 |
| Casual | hard | 17,533 | 17,875 | 6.0 | 6.0 |
| Min-maxer | easy | 27,305 | 28,824 | 8.0 | 7.5 |
| Min-maxer | normal | 24,206 | 27,165 | 9.0 | 8.5 |
| Min-maxer | hard | 19,147 | 23,935 | 7.0 | 8.0 |
| Newcomer | easy | 18,373 | 18,318 | 5.0 | 5.0 |
| Newcomer | normal | 17,986 | 17,909 | 5.0 | 5.0 |
| Newcomer | hard | 15,904 | 16,023 | 4.0 | 4.0 |

Casual and newcomer are flat. Careless and min-maxer pick up roughly 10–25% more XP in season 1, which is the survival effect (they are not selling or being sacked out of the sessions) rather than a training-knob change. Stars per season stay on the November numbers. Nothing here says the XP curve moved.

## Crashes and saves

Zero crashes, zero thrown ticks, zero non-finite values, zero invariant failures, across all 240 careers. Every season-end save loaded back with no repairs and no silent change. The harness did not record an unloadable save.

## What to tweak

1. **Passive cash.** A club that barely signs takes in about $530–630k a completed season on normal and easy (gates, the reputation grant, prize money and the board grant together), and about $420k on hard, and spends well under $100k of it. The signing fee cannot touch a newcomer who signs three or four times in five years. The lever is the income that is still the old weekly grant and gate, which issue #559 is already scoped to replace with receipt-backed match income. Until that lands, do not expect the fee, the release payout, or the cap to stop a passive club banking $2 million. Staff appointment prices are the other sink #559 names, and they are still $0 here.

2. **Careless, once the cap is full.** Fees work: this persona spends about $1.9–2.5 million and hits $0 of cap room. It still finishes $0.5–0.9 million up because the gate does not stop when there is nothing legal to buy. Same income lever as above. Raising the signing fee further only taxes the weeks before the cap fills.

3. **Min-maxer over the cap.** Peak of 107–120% of the published cap, protected excess 0, starting at the trial week a new season's signing meets the renewals that just became active. Fix the ordering so that signing is refused when the promoted renewals already fill the cap. Do not tune fee or cap size to paper over it.

4. **Opening squads at ~60% of the cap.** Leave it. The 80–95% target is a later pass over the generated lists (#562), and this run is not the place to stretch salaries to get there.

5. **Hard careers ending early.** Not a money problem any more. Newcomer-hard still finishes five seasons only twice in twenty seeds, the same as November. That is results and the board, not the bank.
