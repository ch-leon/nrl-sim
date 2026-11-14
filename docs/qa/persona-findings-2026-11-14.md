# Persona playtesters, 14 Nov 2026

240 careers (4 personas × easy/normal/hard × 20 seeds), up to five seasons, stopped when sacked. Live matches: two halves of 2.5 minutes (five minutes total) on an 80m field. No crashes and no unloadable saves.

The full report, compact summary JSON and week-by-week CSVs are on the `balance-log` branch, not on main:

- [Report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/2026-11-14-persona-playtesters/report.md)
- [Summary JSON](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/2026-11-14-persona-playtesters/summary.json)
- [Diaries](https://github.com/ch-leon/nrl-sim/tree/balance-log/runs/2026-11-14-persona-playtesters/diary)

CSV headers split the persona's choices (`action_events`, `action_facilities`) from the cash lines (`cash_events`, `cash_facilities`). Each file has seed 7919 and an average across seeds.

**Broke** means a bankruptcy warning (the balance went below zero; a forced sale is counted on that same warning) or a sacking for a missed solvency objective. A debt week is a week that ended below zero.

## Money

Wages are about $500k a season and the gate is about the same size. The bank goes negative between home games, then jumps when prize money lands. Easy starts on $300k and usually survives the dip. Hard starts on $150k and the dip becomes a sacking. Cash is not growing on its own. Easy casual changes by about −$34 a week.

End-of-season cash below is only seasons that finished. A career can finish one healthy year and still be sacked the next.

| | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Casual weekly | Ends about $309k. 2 of 20 sacked. Wins 64%, about 3rd, 26 premierships. | Ends about $82k. 11 of 20 sacked. Wins 51%. | Ends about −$14k. 15 of 20 sacked. Wins 43%. |
| Newcomer | Ends about $394k. Wins 60%, 29 premierships. | Ends about $195k. 13 of 20 sacked. Wins 52%. | Ends about −$21k. 16 of 20 sacked. Wins 41%. |
| Min-maxer | Ends about $82k. 4 of 20 sacked. Wins 74%, 48 premierships. | Ends about $20k. 13 of 20 sacked. Wins 57%. | Ends about −$140k. 19 of 20 sacked. Wins 36%. |
| Careless | Wins 63% and 22 premierships, then 15 of 20 are sacked. Worst balance about −$187k. | Ends about −$48k. 19 of 20 sacked. | Ends about −$143k. All 20 sacked. |

## XP

A player who gains a star usually does it in 20–36 weeks. About half the opening squad gains a star over the career. Season 1 almost never hits a stat ceiling. By the end of season 5 on easy, a slice of whoever is still there is capped: min-maxer 104 of 234, casual 78 of 277, newcomer 50 of 232. The best nine's average does not reach 80 or 90 in five seasons.

The diary's training/match XP split is an estimate. XP gained is the observed change.

## What to try

Start an easy career and watch the bank go red between home games even when the year ends fine. Then start a hard career and see how fast the solvency sacking arrives.
