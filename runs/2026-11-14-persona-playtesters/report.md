# AI persona career report

Rule-based measurement only. Seed/config/difficulty/pack identify each career in JSON. Elapsed weeks include trials. Best-nine mean includes recruitment; it is not an individual training curve. Unreached thresholds are censored, not zero. Star and potential weeks are for the players who started the career. A star week is the first week that player's star rating went up. Potential weeks exclude anyone who was already at their potential stars.

Match clock: 2 halves of 2.5 minutes, 5 minutes of match time in total. Verified from `fullMatch()` (`src/match/league/rules.ts`), which reads `rules.halfMinutes` (2.5) and is passed into every persona `runMatch`. 40/20 is on. FIELD_LENGTH is 80m from bootFieldLength() in src/match/fieldSettings.ts. Headless Node treats the process as a worker and reads globalThis.name (match-skip--field-80). The only names that select 80m or 60m are match-skip|background|replay|art--field-80|60 (src/labs/fieldLength.ts). Experiments can store 100, 80 or 60 in the browser and reload; runMatch has no field-length argument.

Money in these careers is the live weekly books (gate, wages, sponsors, facilities, events). The finance testing contract (#595) publishes salary, cap and match-income quotes, and those quotes are not what a career spends yet. Potential stars are visible on every player; there is no separate scout-fog concealment. The Scout Office still changes the free-agent pool and the signing fee, and the min-maxer builds one. Careers start on the current save and round-trip through the production importer (formats 24–27 are the supported new-career path). Watchability work is how the match is drawn; these runs play the same headless live sim and do not render it.

Balance flags, not failures: money looks easy when a completed season ends more than $150,000 above the opening cash and nobody goes into debt; money looks hard when completed seasons end below zero; a solvency sacking in at least a quarter of careers is flagged on its own. Cash is climbing fast above $5,000 a week. Ceilings are early when more than 20% of a season-1 squad cannot take another point. XP is steep when the median star arrives in under 8 weeks, and flat when fewer than 25% of opening players gain a star in a run of three or more seasons. Broke means a bankruptcy warning (the balance went below zero; a forced sale is counted on that same warning) or a sacking for a missed solvency objective. A debt week is a week that ended below zero, which is what raises the warning.

The diary splits XP into training and match. That split is an estimate rebuilt from the sheets and the weekly formula. It can fall short of XP gained when an event or a facility built the same week adds XP the estimate does not see. XP gained is the observed change.

| Persona / difficulty / pack | Runs | Regular wins / games | Final wins / games | Finals share (completed seasons) | Premierships | Mean ladder | Broke rate | End-season cash | Min cash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| careless/easy/au | 20 | 63.3% / 1992 | 66.0% / 162 | 92.8% / 83 | 22 | 3.1 | 100.0% | 19132 | -186898 |
| careless/normal/au | 20 | 48.0% / 1344 | 51.8% / 56 | 58.9% / 56 | 6 | 6.9 | 100.0% | -47561 | -196937 |
| careless/hard/au | 20 | 35.5% / 1080 | 35.7% / 14 | 22.2% / 45 | 1 | 11.6 | 100.0% | -143198 | -338263 |
| casual-weekly/easy/au | 20 | 64.2% / 2328 | 66.0% / 194 | 93.8% / 97 | 26 | 2.8 | 25.0% | 309195 | -138913 |
| casual-weekly/normal/au | 20 | 51.1% / 1656 | 57.1% / 98 | 73.9% / 69 | 9 | 6.1 | 90.0% | 81612 | -180405 |
| casual-weekly/hard/au | 20 | 42.6% / 1368 | 61.9% / 63 | 52.6% / 57 | 6 | 8.4 | 100.0% | -13686 | -192883 |
| min-maxer/easy/au | 20 | 73.8% / 2304 | 79.2% / 221 | 94.8% / 96 | 48 | 1.8 | 100.0% | 82487 | -171287 |
| min-maxer/normal/au | 20 | 56.7% / 1920 | 68.1% / 138 | 80.0% / 80 | 21 | 4.7 | 100.0% | 20080 | -225256 |
| min-maxer/hard/au | 20 | 35.7% / 1128 | 50.0% / 22 | 25.5% / 47 | 1 | 11.6 | 100.0% | -139508 | -303573 |
| newcomer/easy/au | 20 | 60.2% / 2232 | 69.0% / 187 | 93.5% / 93 | 29 | 3.3 | 25.0% | 394333 | -161891 |
| newcomer/normal/au | 20 | 52.4% / 1824 | 57.8% / 102 | 73.7% / 76 | 13 | 5.5 | 75.0% | 195301 | -172893 |
| newcomer/hard/au | 20 | 41.3% / 1320 | 48.7% / 39 | 43.6% / 55 | 4 | 9.3 | 100.0% | -20503 | -217931 |

## Baseline warnings

Compared 0 matching endpoints. Baseline differences are warnings only. A different field length or half length does not match the checked baseline.

- No matching baseline endpoints: use the documented baseline command for this pack/config/seed/horizon.

## Progression, finance and health

### careless/easy/au

- 70 overall (best nine, including recruitment): 90.9 weeks; 9 reached, 11 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 140 of 400; median 29.5 weeks among those who did.
- Reaching potential stars: 216 of 400 (100 already there at week 0); median 32.5 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/277; S3 4/291; S5 27/149.
- Mean XP per completed season 16434; mean level-ups per completed season 159.5.
- Cash: opening 300000; mean weekly change -2602; mean weeks in debt 81.4.
- Bankruptcy warnings: 1638; forced sales: 96; sacked with missed solvency objective: 15.
- Save round-trips: 83; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: the board is sacking clubs for money. 15 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -502398 |
| upkeep | 0 |
| overhead | -56678 |
| sponsor | 0 |
| grant | 58761 |
| gate | 498355 |
| prize | 49976 |
| boardGrant | 15054 |
| events | 2626 |
| transfers | -125727 |
| contracts | -10484 |
| facilities | -4940 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 1 speed 1 | $275k | -$25k | 825 | 2 | 53.8 | W 4-0 Dubbo Diggers |
| S1 trial 2 | footyIQ | 5 speed 1, stamina 1, footyIQ 3 | $218k | -$56k | 780 | 7 | 54.1 | D 6-6 Wagga Swagmen |
| S1 W1 | handling | 3 handling 1, footyIQ 2 | $165k | -$53k | 824 | 6 | 54.8 | W 14-6 Launceston Larrikins |
| S1 W2 | stamina | 3 strength 1, handling 2 | $115k | -$50k | 847 | 10 | 55.1 | W 19-10 Darwin Drovers |
| S1 W3 | kicking | 16 speed 5, stamina 3, kicking 2, footyIQ 6 | $93k | -$22k | 911 | 6 | 55.0 | W 20-12 Southport Stingrays |
| S1 W4 | strength | 4 speed 1, strength 2, stamina 1 | $53k | -$39k | 800 | 8 | 55.0 | L 6-10 Broken Hill Brollys |
| S1 W5 | strength | 6 speed 2, strength 2, footyIQ 2 | $48k | -$5.9k | 802 | 8 | 55.7 | W 6-0 Geelong Gulls |
| S1 W6 | stamina | 12 speed 2, strength 2, stamina 2, handling 2, footyIQ 4 | $15k | -$32k | 793 | 10 | 55.9 | W 12-4 Wagga Swagmen |
| S1 W7 | speed | 5 speed 3, kicking 1, footyIQ 1 | $5.5k | -$9.8k | 711 | 4 | 55.9 | L 4-10 Katherine Crocs |
| S1 W8 | speed | 3 speed 1, stamina 1, footyIQ 1 | -$18k | -$24k | 806 | 7 | 56.2 | W 13-11 Shellharbour Scorpions |
| S1 W9 | footyIQ | 1 strength 1 | -$16k | $2.1k | 858 | 8 | 56.6 | W 12-0 Dubbo Diggers |
| S1 W10 | stamina | 20 speed 7, strength 1, stamina 5, handling 1, kicking 4, footyIQ 2 | -$39k | -$23k | 908 | 9 | 57.2 | W 14-6 Mackay Marlins |
| S1 W11 | speed | 7 speed 2, stamina 1, handling 2, kicking 1, footyIQ 1 | -$32k | $7.0k | 822 | 10 | 57.3 | L 10-12 Ballarat Bushrangers |
| S1 W12 | strength | 12 speed 3, strength 3, stamina 2, handling 1, footyIQ 3 | -$53k | -$21k | 797 | 8 | 57.4 | D 4-4 Cairns Cyclones |
| S1 W13 | speed | 3 speed 1, strength 1, handling 1 | -$42k | $11k | 774 | 7 | 57.4 | W 8-0 Toowoomba Thunder |
| S1 W14 | handling | 9 speed 3, strength 1, stamina 1, handling 2, footyIQ 2 | -$63k | -$21k | 863 | 9 | 57.5 | W 22-6 Woolloomooloo Wolves |
| S1 W15 | footyIQ | 11 speed 5, strength 3, stamina 1, footyIQ 2 | -$52k | $11k | 837 | 9 | 57.6 | W 13-4 Redcliffe Reapers |
| S1 W16 | strength | 7 speed 2, strength 1, stamina 1, footyIQ 3 | -$72k | -$21k | 813 | 9 | 57.6 | W 6-4 Launceston Larrikins |
| S1 W17 | speed | 10 speed 1, stamina 3, handling 2, kicking 1, footyIQ 3 | -$58k | $14k | 765 | 7 | 57.7 | L 7-21 Darwin Drovers |
| S1 W18 | speed | 8 speed 2, strength 2, stamina 1, footyIQ 3 | -$79k | -$21k | 869 | 9 | 57.8 | W 21-7 Southport Stingrays |
| S1 W19 | kicking | 9 speed 3, strength 2, stamina 1, footyIQ 3 | -$73k | $6.1k | 873 | 8 | 58.3 | W 23-0 Broken Hill Brollys |
| S1 W20 | speed | 7 speed 1, strength 1, stamina 2, kicking 2, footyIQ 1 | -$93k | -$20k | 859 | 8 | 58.4 | W 16-0 Geelong Gulls |
| S1 W21 | strength | 3 strength 2, footyIQ 1 | -$86k | $7.7k | 821 | 9 | 58.4 | W 14-0 Wagga Swagmen |
| S1 W22 | footyIQ | 4 stamina 1, handling 2, footyIQ 1 | -$107k | -$21k | 758 | 7 | 57.7 | W 10-4 Katherine Crocs |
| S1 W23 | strength | 6 speed 1, stamina 1, handling 2, kicking 1, footyIQ 1 | -$95k | $12k | 741 | 7 | 58.2 | W 22-10 Shellharbour Scorpions |
| S1 W24 | handling | 6 speed 1, kicking 2, footyIQ 3 | -$112k | -$17k | 718 | 7 | 57.9 | L 6-8 Dubbo Diggers |
| S1 W25 final | strength | 7 speed 2, stamina 2, handling 2, kicking 1 | -$80k | $32k | 780 | 7 | 58.0 | W 28-4 Darwin Drovers |
| S1 W26 final | stamina | 9 speed 2, strength 1, stamina 2, handling 2, footyIQ 2 | -$55k | $25k | 806 | 9 | 58.1 | W 12-0 Ballarat Bushrangers |
| S1 W27 final | stamina | 5 speed 2, stamina 1, handling 1, footyIQ 1 | $119k | $174k | 790 | 7 | 58.1 | W 24-6 Toowoomba Thunder |
| S2 trial 1 | strength | 17 speed 3, strength 3, stamina 3, handling 3, kicking 2, footyIQ 3 | $83k | -$35k | 654 | 6 | 58.8 | L 6-10 Katherine Crocs |
| S2 trial 2 | strength | 3 speed 3 | $41k | -$42k | 646 | 7 | 58.9 | L 6-22 Shellharbour Scorpions |
| S2 W1 | kicking | 5 speed 4, footyIQ 1 | $47k | $6.2k | 732 | 7 | 59.4 | W 16-6 Launceston Larrikins |
| S2 W2 | footyIQ | 5 speed 3, handling 1, footyIQ 1 | $7.5k | -$40k | 719 | 7 | 59.8 | W 10-7 Darwin Drovers |
| S2 W3 | footyIQ | 7 speed 5, kicking 1, footyIQ 1 | $24k | $17k | 668 | 5 | 59.9 | W 10-0 Southport Stingrays |
| S2 W4 | footyIQ | 12 speed 5, strength 1, stamina 1, handling 2, footyIQ 3 | -$10k | -$35k | 661 | 7 | 59.5 | W 6-4 Broken Hill Brollys |
| S2 W5 | kicking | 5 speed 2, strength 1, kicking 1, footyIQ 1 | $14k | $24k | 645 | 7 | 60.1 | L 1-6 Geelong Gulls |
| S2 W6 | strength | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | -$5.9k | -$19k | 709 | 6 | 59.5 | W 7-6 Wagga Swagmen |
| S2 W7 | footyIQ | 7 speed 2, strength 2, stamina 1, handling 1, footyIQ 1 | $19k | $25k | 735 | 9 | 59.5 | W 10-4 Katherine Crocs |
| S2 W8 | kicking | 6 speed 1, strength 1, stamina 1, kicking 1, footyIQ 2 | -$11k | -$30k | 663 | 6 | 58.7 | L 12-23 Shellharbour Scorpions |
| S2 W9 | speed | 5 speed 3, strength 1, footyIQ 1 | $12k | $23k | 686 | 8 | 59.6 | L 8-18 Dubbo Diggers |
| S2 W10 | strength | 5 speed 1, strength 3, stamina 1 | -$16k | -$28k | 667 | 6 | 59.0 | W 6-4 Mackay Marlins |
| S2 W11 | speed | 12 speed 3, stamina 3, handling 2, kicking 2, footyIQ 2 | $8.3k | $24k | 764 | 8 | 59.2 | W 20-4 Ballarat Bushrangers |
| S2 W12 | speed | 6 speed 2, strength 2, handling 1, footyIQ 1 | -$16k | -$24k | 718 | 5 | 59.2 | W 12-6 Cairns Cyclones |
| S2 W13 | speed | 9 speed 5, strength 1, kicking 1, footyIQ 2 | $7.1k | $23k | 666 | 7 | 60.0 | L 7-16 Toowoomba Thunder |
| S2 W14 | strength | 8 speed 3, stamina 2, kicking 1, footyIQ 2 | -$16k | -$23k | 764 | 10 | 59.4 | W 22-13 Woolloomooloo Wolves |
| S2 W15 | kicking | 3 strength 1, footyIQ 2 | $8.1k | $24k | 702 | 6 | 59.4 | D 4-4 Redcliffe Reapers |
| S2 W16 | kicking | 9 speed 1, stamina 2, handling 1, kicking 4, footyIQ 1 | -$15k | -$23k | 663 | 5 | 58.8 | L 6-11 Launceston Larrikins |
| S2 W17 | stamina | 8 speed 2, strength 2, handling 1, kicking 1, footyIQ 2 | $7.5k | $23k | 688 | 10 | 58.9 | W 6-0 Darwin Drovers |
| S2 W18 | kicking | 10 speed 3, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | -$9.6k | -$17k | 758 | 6 | 59.0 | W 19-6 Southport Stingrays |
| S2 W19 | footyIQ | 7 speed 1, strength 2, handling 1, footyIQ 3 | $14k | $23k | 677 | 6 | 59.0 | L 6-11 Broken Hill Brollys |
| S2 W20 | footyIQ | 7 speed 1, strength 2, handling 1, footyIQ 3 | -$17k | -$30k | 805 | 10 | 58.0 | W 23-10 Geelong Gulls |
| S2 W21 | kicking | 4 speed 2, handling 1, kicking 1 | $5.9k | $23k | 742 | 4 | 58.0 | W 21-7 Wagga Swagmen |
| S2 W22 | handling | 6 handling 2, kicking 1, footyIQ 3 | -$15k | -$21k | 749 | 8 | 56.8 | W 10-6 Katherine Crocs |
| S2 W23 | footyIQ | 2 kicking 1, footyIQ 1 | $6.0k | $21k | 727 | 7 | 58.1 | W 16-6 Shellharbour Scorpions |
| S2 W24 | speed | 8 speed 2, strength 3, handling 1, kicking 1, footyIQ 1 | -$15k | -$21k | 686 | 7 | 56.9 | L 11-20 Dubbo Diggers |
| S2 W25 final | speed | 12 speed 4, strength 1, stamina 3, handling 1, footyIQ 3 | $6.9k | $22k | 734 | 8 | 57.0 | W 6-0 Southport Stingrays |
| S2 W26 final | kicking | 5 speed 2, handling 2, footyIQ 1 | $21k | $14k | 794 | 7 | 57.5 | W 12-0 Cairns Cyclones |
| S2 W27 final | speed | 2 footyIQ 2 | $168k | $147k | 773 | 10 | 61.0 | W 18-4 Redcliffe Reapers |
| S3 trial 1 | handling | 10 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 3 | $118k | -$50k | 753 | 5 | 60.5 | W 25-10 Woolloomooloo Wolves |
| S3 trial 2 | footyIQ | 16 speed 3, strength 2, stamina 2, handling 2, kicking 4, footyIQ 3 | $79k | -$39k | 718 | 8 | 60.0 | W 20-0 Geelong Gulls |
| S3 W1 | footyIQ | 7 speed 2, strength 1, handling 1, kicking 1, footyIQ 2 | $88k | $9.1k | 694 | 8 | 60.2 | D 4-4 Launceston Larrikins |
| S3 W2 | kicking | 3 handling 1, footyIQ 2 | $60k | -$28k | 701 | 4 | 60.3 | W 10-0 Darwin Drovers |
| S3 W3 | speed | 5 speed 2, strength 1, handling 1, footyIQ 1 | $74k | $14k | 660 | 7 | 60.3 | W 7-4 Southport Stingrays |
| S3 W4 | stamina | 12 speed 5, strength 2, handling 1, kicking 1, footyIQ 3 | $53k | -$21k | 670 | 9 | 59.7 | W 10-4 Broken Hill Brollys |
| S3 W5 | kicking | 3 speed 1, strength 1, footyIQ 1 | $51k | -$1.8k | 620 | 5 | 60.0 | L 4-11 Geelong Gulls |
| S3 W6 | stamina | 3 speed 1, strength 1, handling 1 | $3.5k | -$48k | 720 | 6 | 60.6 | W 16-0 Wagga Swagmen |
| S3 W7 | strength | 9 speed 1, handling 2, kicking 4, footyIQ 2 | $23k | $20k | 705 | 9 | 60.7 | W 12-0 Katherine Crocs |
| S3 W8 | footyIQ | 5 strength 1, handling 1, footyIQ 3 | -$12k | -$35k | 709 | 5 | 60.4 | W 10-4 Shellharbour Scorpions |
| S3 W9 | kicking | 9 speed 1, stamina 2, handling 2, footyIQ 4 | $7.0k | $19k | 621 | 3 | 60.5 | L 6-10 Dubbo Diggers |
| S3 W10 | strength | 9 strength 4, stamina 1, handling 2, footyIQ 2 | -$21k | -$28k | 736 | 9 | 59.9 | W 14-0 Mackay Marlins |
| S3 W11 | kicking | 8 speed 4, strength 1, stamina 1, handling 1, footyIQ 1 | -$4.1k | $17k | 647 | 7 | 60.6 | L 12-19 Ballarat Bushrangers |
| S3 W12 | strength | 4 stamina 1, handling 2, kicking 1 | -$22k | -$18k | 631 | 6 | 60.6 | L 4-8 Cairns Cyclones |
| S3 W13 | handling | 7 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | -$3.3k | $19k | 745 | 6 | 60.7 | W 20-6 Toowoomba Thunder |
| S3 W14 | speed | 1 speed 1 | -$26k | -$22k | 666 | 7 | 61.3 | W 10-0 Woolloomooloo Wolves |
| S3 W15 | kicking | 14 speed 2, strength 2, stamina 2, handling 2, footyIQ 6 | -$6.9k | $19k | 748 | 7 | 62.1 | W 27-4 Redcliffe Reapers |
| S3 W16 | kicking | 6 handling 1, kicking 3, footyIQ 2 | -$27k | -$20k | 708 | 5 | 62.1 | W 17-6 Launceston Larrikins |
| S3 W17 | strength | 7 speed 2, strength 1, stamina 1, handling 1, footyIQ 2 | -$7.4k | $19k | 713 | 12 | 62.8 | W 20-0 Darwin Drovers |
| S3 W18 | handling | 7 speed 2, strength 2, stamina 1, handling 1, footyIQ 1 | -$27k | -$19k | 635 | 6 | 62.9 | W 12-8 Southport Stingrays |
| S3 W19 | footyIQ | 6 handling 1, footyIQ 5 | -$5.5k | $21k | 626 | 5 | 63.0 | L 15-18 Broken Hill Brollys |
| S3 W20 | speed | 7 speed 3, strength 1, handling 1, footyIQ 2 | -$25k | -$19k | 662 | 9 | 63.0 | W 16-0 Geelong Gulls |
| S3 W21 | footyIQ | 2 strength 2 | -$6.4k | $18k | 653 | 5 | 63.7 | W 7-6 Wagga Swagmen |
| S3 W22 | strength | 7 speed 1, strength 3, stamina 1, footyIQ 2 | -$26k | -$19k | 709 | 8 | 64.4 | W 22-4 Katherine Crocs |
| S3 W23 | kicking | 11 speed 3, strength 2, stamina 1, handling 3, kicking 1, footyIQ 1 | -$3.3k | $23k | 672 | 7 | 64.6 | W 21-0 Shellharbour Scorpions |
| S3 W24 | kicking | 6 strength 3, handling 1, footyIQ 2 | -$21k | -$18k | 617 | 5 | 64.6 | W 20-16 Dubbo Diggers |
| S3 W25 final | footyIQ | 2 strength 1, handling 1 | $19k | $41k | 617 | 6 | 64.6 | W 10-4 Ballarat Bushrangers |
| S3 W26 final | stamina | 3 strength 2, footyIQ 1 | $21k | $1.8k | 711 | 6 | 65.1 | W 28-6 Toowoomba Thunder |
| S3 W27 final | footyIQ | 12 speed 1, strength 1, handling 5, kicking 3, footyIQ 2 | $159k | $138k | 669 | 8 | 65.1 | W 14-0 Woolloomooloo Wolves |
| S4 trial 1 | handling | 14 strength 2, stamina 2, handling 6, footyIQ 4 | $87k | -$73k | 630 | 7 | 65.7 | W 14-12 Shellharbour Scorpions |
| S4 trial 2 | handling | 2 strength 1, footyIQ 1 | $46k | -$41k | 603 | 3 | 65.4 | L 6-12 Dubbo Diggers |
| S4 W1 | strength | 5 speed 2, kicking 1, footyIQ 2 | $36k | -$9.6k | 656 | 7 | 65.0 | W 14-0 Launceston Larrikins |
| S4 W2 | strength | 9 speed 2, strength 2, handling 2, kicking 1, footyIQ 2 | -$17k | -$53k | 636 | 7 | 64.5 | L 14-16 Darwin Drovers |
| S4 W3 | handling | 3 speed 1, strength 2 | -$3.4k | $14k | 645 | 6 | 64.5 | L 4-6 Southport Stingrays |
| S4 W4 | stamina | 5 strength 1, stamina 1, footyIQ 3 | -$31k | -$27k | 689 | 7 | 65.2 | W 23-10 Broken Hill Brollys |
| S4 W5 | speed | 6 speed 2, stamina 2, kicking 1, footyIQ 1 | -$17k | $14k | 700 | 8 | 65.9 | W 24-6 Geelong Gulls |
| S4 W6 | stamina | 2 strength 2 | -$42k | -$25k | 708 | 6 | 65.9 | W 14-6 Wagga Swagmen |
| S4 W7 | footyIQ | 4 speed 1, strength 1, footyIQ 2 | -$27k | $15k | 736 | 7 | 66.5 | W 28-10 Katherine Crocs |
| S4 W8 | speed | 2 speed 1, strength 1 | -$51k | -$24k | 604 | 5 | 66.5 | L 4-5 Shellharbour Scorpions |
| S4 W9 | kicking | 2 strength 1, footyIQ 1 | -$35k | $16k | 589 | 4 | 67.3 | W 6-0 Dubbo Diggers |
| S4 W10 | handling | 3 speed 1, strength 1, handling 1 | -$59k | -$24k | 573 | 7 | 68.0 | D 10-10 Mackay Marlins |
| S4 W11 | strength | 2 strength 1, footyIQ 1 | -$84k | -$26k | 535 | 6 | 68.0 | L 0-6 Ballarat Bushrangers |
| S4 W12 | speed | 1 stamina 1 | -$106k | -$22k | 554 | 5 | 66.8 | L 10-11 Cairns Cyclones |
| S4 W13 | kicking | 8 speed 2, strength 3, stamina 1, handling 2 | -$84k | $22k | 629 | 6 | 66.9 | W 23-13 Toowoomba Thunder |
| S4 W14 | stamina | 2 strength 1, handling 1 | -$103k | -$18k | 576 | 5 | 66.0 | W 14-4 Woolloomooloo Wolves |
| S4 W15 | speed | 4 speed 1, strength 2, handling 1 | -$80k | $23k | 568 | 6 | 66.1 | W 20-6 Redcliffe Reapers |
| S4 W16 | stamina | 0 | -$96k | -$16k | 622 | 7 | 66.1 | W 30-10 Launceston Larrikins |
| S4 W17 | handling | 4 speed 2, strength 2 | -$71k | $25k | 578 | 5 | 66.1 | W 6-4 Darwin Drovers |
| S4 W18 | footyIQ | 7 strength 4, stamina 1, footyIQ 2 | -$87k | -$16k | 562 | 7 | 66.3 | W 18-6 Southport Stingrays |
| S4 W19 | footyIQ | 5 speed 3, stamina 1, footyIQ 1 | -$63k | $25k | 527 | 2 | 66.3 | L 4-12 Broken Hill Brollys |
| S4 W20 | footyIQ | 9 speed 3, strength 3, handling 1, kicking 2 | -$78k | -$16k | 576 | 11 | 66.5 | W 16-14 Geelong Gulls |
| S4 W21 | stamina | 4 speed 1, strength 1, footyIQ 2 | -$54k | $25k | 539 | 3 | 66.5 | W 16-0 Wagga Swagmen |
| S4 W22 | speed | 2 strength 2 | -$70k | -$16k | 575 | 6 | 66.6 | D 18-18 Katherine Crocs |
| S4 W23 | speed | 5 speed 1, strength 1, handling 1, footyIQ 2 | -$25k | $45k | 548 | 6 | 66.7 | W 14-0 Shellharbour Scorpions |
| S4 W24 | strength | 6 speed 1, strength 3, footyIQ 2 | -$37k | -$12k | 549 | 4 | 66.7 | W 11-6 Dubbo Diggers |
| S4 W25 final | speed | 2 stamina 2 | $7.4k | $44k | 606 | 7 | 66.3 | W 23-4 Woolloomooloo Wolves |
| S4 W26 final | handling | 7 speed 4, strength 2, footyIQ 1 | $24k | $16k | 538 | 5 | 64.8 | W 17-6 Southport Stingrays |
| S4 W27 final | handling | 1 strength 1 | $130k | $106k | 529 | 5 | 64.1 | W 10-0 Launceston Larrikins |
| S5 trial 1 | kicking | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $84k | -$46k | 340 | 5 | 64.3 | W 14-10 Woolloomooloo Wolves |
| S5 trial 2 | kicking | 5 footyIQ 5 | $33k | -$51k | 429 | 2 | 64.3 | W 24-10 Mackay Marlins |
| S5 W1 | kicking | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $26k | -$7.5k | 413 | 4 | 65.1 | W 20-0 Launceston Larrikins |
| S5 W2 | stamina | 0 | -$1.9k | -$28k | 399 | 2 | 64.4 | W 8-0 Darwin Drovers |
| S5 W3 | footyIQ | 4 speed 3, footyIQ 1 | $16k | $17k | 433 | 5 | 64.4 | W 6-4 Southport Stingrays |
| S5 W4 | footyIQ | 2 handling 1, footyIQ 1 | -$14k | -$30k | 501 | 7 | 63.3 | W 30-6 Broken Hill Brollys |
| S5 W5 | handling | 1 stamina 1 | $1.3k | $15k | 469 | 2 | 64.3 | W 12-6 Geelong Gulls |
| S5 W6 | speed | 4 speed 3, footyIQ 1 | -$23k | -$24k | 439 | 6 | 65.0 | D 10-10 Wagga Swagmen |
| S5 W7 | strength | 6 speed 2, handling 1, footyIQ 3 | -$5.0k | $18k | 464 | 4 | 65.1 | W 14-0 Katherine Crocs |
| S5 W8 | strength | 1 speed 1 | -$27k | -$22k | 411 | 6 | 65.0 | L 4-10 Shellharbour Scorpions |
| S5 W9 | handling | 5 speed 3, strength 1, stamina 1 | -$9.5k | $18k | 446 | 3 | 65.1 | W 16-13 Dubbo Diggers |
| S5 W10 | handling | 3 speed 1, footyIQ 2 | -$32k | -$22k | 426 | 6 | 65.1 | W 10-8 Mackay Marlins |
| S5 W11 | speed | 1 speed 1 | -$14k | $18k | 456 | 4 | 65.0 | W 12-10 Ballarat Bushrangers |
| S5 W12 | handling | 2 speed 1, handling 1 | -$36k | -$22k | 484 | 5 | 65.8 | W 16-0 Cairns Cyclones |
| S5 W13 | handling | 6 speed 2, strength 1, handling 3 | -$17k | $19k | 418 | 4 | 65.9 | L 6-11 Toowoomba Thunder |
| S5 W14 | stamina | 3 speed 1, strength 1, stamina 1 | -$36k | -$19k | 494 | 6 | 65.9 | W 22-4 Woolloomooloo Wolves |
| S5 W15 | speed | 1 footyIQ 1 | -$15k | $21k | 441 | 4 | 65.8 | W 14-4 Redcliffe Reapers |
| S5 W16 | handling | 1 speed 1 | -$38k | -$23k | 426 | 2 | 65.8 | W 8-4 Launceston Larrikins |
| S5 W17 | footyIQ | 4 speed 1, strength 1, handling 2 | -$19k | $19k | 412 | 5 | 65.9 | W 8-6 Darwin Drovers |
| S5 W18 | speed | 2 strength 1, footyIQ 1 | -$41k | -$21k | 402 | 3 | 65.8 | L 6-12 Southport Stingrays |
| S5 W19 | kicking | 6 speed 2, strength 2, stamina 1, handling 1 | -$22k | $19k | 410 | 5 | 65.9 | W 8-6 Broken Hill Brollys |
| S5 W20 | kicking | 2 speed 1, strength 1 | -$43k | -$21k | 428 | 5 | 65.9 | W 14-0 Geelong Gulls |
| S5 W21 | kicking | 3 speed 1, footyIQ 2 | -$24k | $19k | 434 | 6 | 65.9 | W 7-6 Wagga Swagmen |
| S5 W22 | stamina | 2 stamina 2 | -$45k | -$21k | 443 | 2 | 65.9 | W 8-5 Katherine Crocs |
| S5 W23 | handling | 4 stamina 1, footyIQ 3 | -$4.4k | $41k | 423 | 7 | 65.9 | W 12-6 Shellharbour Scorpions |
| S5 W24 | strength | 4 strength 1, stamina 1, footyIQ 2 | -$27k | -$22k | 402 | 3 | 65.9 | L 6-12 Dubbo Diggers |
| S5 W25 final | handling | 3 strength 2, handling 1 | $6.7k | $33k | 406 | 3 | 66.1 | W 10-6 Woolloomooloo Wolves |
| S5 W26 final | kicking | 3 speed 1, handling 1, footyIQ 1 | $19k | $13k | 409 | 5 | 64.6 | W 12-6 Ballarat Bushrangers |
| S5 W27 final | speed | 1 strength 1 | $117k | $98k | 407 | 3 | 66.5 | W 10-8 Darwin Drovers |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $247k | -$53k | 645 | 0.60 | 53.9 | 60.1 | 0.0% | 35.0% |
| S1 trial 2 | 20 | $186k | -$61k | 660 | 5.75 | 54.4 | 60.9 | 0.0% | 40.0% |
| S1 W1 | 20 | $155k | -$31k | 667 | 4.45 | 54.8 | 61.3 | 0.0% | 60.0% |
| S1 W2 | 20 | $103k | -$52k | 670 | 6.90 | 55.0 | 61.4 | 0.0% | 55.0% |
| S1 W3 | 20 | $82k | -$21k | 679 | 4.20 | 55.0 | 61.5 | 0.0% | 50.0% |
| S1 W4 | 20 | $40k | -$42k | 695 | 7.10 | 55.0 | 61.6 | 15.0% | 65.0% |
| S1 W5 | 20 | $25k | -$14k | 697 | 6.90 | 55.4 | 62.2 | 10.0% | 65.0% |
| S1 W6 | 20 | -$13k | -$38k | 688 | 7.40 | 55.6 | 62.4 | 80.0% | 55.0% |
| S1 W7 | 20 | -$9.4k | $3.3k | 680 | 4.65 | 55.8 | 62.5 | 80.0% | 50.0% |
| S1 W8 | 20 | -$33k | -$24k | 689 | 9.05 | 56.0 | 62.6 | 100.0% | 55.0% |
| S1 W9 | 20 | -$29k | $4.7k | 700 | 5.10 | 56.2 | 62.7 | 100.0% | 85.0% |
| S1 W10 | 20 | -$51k | -$22k | 686 | 7.50 | 56.4 | 62.8 | 100.0% | 60.0% |
| S1 W11 | 20 | -$43k | $8.1k | 691 | 5.60 | 56.5 | 62.9 | 100.0% | 70.0% |
| S1 W12 | 20 | -$65k | -$22k | 694 | 8.25 | 56.7 | 63.0 | 100.0% | 60.0% |
| S1 W13 | 20 | -$54k | $11k | 688 | 5.85 | 56.9 | 63.1 | 100.0% | 70.0% |
| S1 W14 | 20 | -$75k | -$22k | 686 | 7.65 | 57.0 | 63.1 | 100.0% | 65.0% |
| S1 W15 | 20 | -$63k | $12k | 681 | 6.90 | 57.2 | 63.2 | 100.0% | 75.0% |
| S1 W16 | 20 | -$84k | -$21k | 680 | 7.20 | 57.2 | 63.0 | 100.0% | 75.0% |
| S1 W17 | 20 | -$73k | $12k | 672 | 5.35 | 57.3 | 63.0 | 100.0% | 60.0% |
| S1 W18 | 20 | -$93k | -$20k | 664 | 8.00 | 57.1 | 62.1 | 100.0% | 55.0% |
| S1 W19 | 20 | -$84k | $8.6k | 662 | 5.65 | 57.0 | 61.8 | 100.0% | 65.0% |
| S1 W20 | 20 | -$102k | -$18k | 636 | 6.40 | 56.9 | 61.4 | 100.0% | 50.0% |
| S1 W21 | 20 | -$91k | $11k | 642 | 6.20 | 57.0 | 61.3 | 100.0% | 65.0% |
| S1 W22 | 20 | -$108k | -$17k | 635 | 6.85 | 56.8 | 60.6 | 100.0% | 40.0% |
| S1 W23 | 20 | -$98k | $9.7k | 632 | 5.45 | 56.8 | 60.3 | 100.0% | 65.0% |
| S1 W24 | 20 | -$114k | -$15k | 607 | 6.70 | 56.6 | 59.6 | 100.0% | 45.0% |
| S1 W25 final | 20 | -$98k | $16k | 582 | 5.05 | 56.6 | 59.5 | 100.0% | 57.9% |
| S1 W26 final | 20 | -$91k | $6.3k | 417 | 4.95 | 56.5 | 59.4 | 100.0% | 54.5% |
| S1 W27 final | 20 | -$42k | $49k | 280 | 1.85 | 56.4 | 59.1 | 85.0% | 50.0% |
| S2 trial 1 | 20 | -$56k | -$14k | 593 | 6.25 | 55.9 | 59.3 | 85.0% | 60.0% |
| S2 trial 2 | 20 | -$68k | -$12k | 599 | 6.15 | 56.0 | 59.4 | 85.0% | 45.0% |
| S2 W1 | 20 | -$54k | $14k | 602 | 5.95 | 56.0 | 59.5 | 80.0% | 75.0% |
| S2 W2 | 20 | -$70k | -$16k | 598 | 5.75 | 55.9 | 59.4 | 85.0% | 60.0% |
| S2 W3 | 20 | -$52k | $19k | 589 | 6.35 | 56.0 | 59.6 | 80.0% | 45.0% |
| S2 W4 | 20 | -$67k | -$15k | 599 | 5.55 | 55.9 | 59.7 | 95.0% | 65.0% |
| S2 W5 | 20 | -$46k | $21k | 595 | 6.25 | 56.0 | 59.8 | 70.0% | 45.0% |
| S2 W6 | 20 | -$61k | -$15k | 601 | 5.55 | 56.0 | 59.9 | 95.0% | 70.0% |
| S2 W7 | 20 | -$39k | $22k | 597 | 5.85 | 56.0 | 59.9 | 70.0% | 65.0% |
| S2 W8 | 20 | -$55k | -$16k | 594 | 6.15 | 55.9 | 60.0 | 95.0% | 50.0% |
| S2 W9 | 20 | -$34k | $21k | 599 | 5.85 | 56.1 | 60.2 | 70.0% | 50.0% |
| S2 W10 | 20 | -$51k | -$16k | 608 | 6.20 | 56.1 | 60.3 | 100.0% | 55.0% |
| S2 W11 | 20 | -$29k | $22k | 601 | 5.90 | 56.2 | 60.5 | 65.0% | 65.0% |
| S2 W12 | 20 | -$44k | -$15k | 608 | 6.10 | 56.3 | 60.6 | 100.0% | 60.0% |
| S2 W13 | 20 | -$22k | $22k | 608 | 5.55 | 56.4 | 60.7 | 65.0% | 65.0% |
| S2 W14 | 20 | -$39k | -$16k | 611 | 6.55 | 56.5 | 60.9 | 100.0% | 45.0% |
| S2 W15 | 20 | -$17k | $22k | 607 | 6.25 | 56.7 | 61.0 | 55.0% | 70.0% |
| S2 W16 | 20 | -$34k | -$17k | 599 | 5.65 | 56.5 | 61.1 | 100.0% | 60.0% |
| S2 W17 | 20 | -$11k | $22k | 602 | 6.10 | 56.6 | 61.2 | 50.0% | 65.0% |
| S2 W18 | 20 | -$29k | -$17k | 614 | 5.80 | 56.7 | 61.4 | 100.0% | 70.0% |
| S2 W19 | 20 | -$8.7k | $20k | 589 | 6.15 | 56.9 | 61.5 | 35.0% | 60.0% |
| S2 W20 | 20 | -$26k | -$17k | 603 | 5.65 | 56.8 | 61.7 | 100.0% | 50.0% |
| S2 W21 | 20 | -$4.5k | $22k | 605 | 6.00 | 56.9 | 61.9 | 20.0% | 65.0% |
| S2 W22 | 20 | -$23k | -$19k | 598 | 5.85 | 56.9 | 62.1 | 100.0% | 75.0% |
| S2 W23 | 20 | -$2.7k | $21k | 588 | 5.90 | 57.0 | 62.2 | 15.0% | 65.0% |
| S2 W24 | 20 | -$22k | -$20k | 591 | 5.65 | 56.5 | 62.2 | 100.0% | 55.0% |
| S2 W25 final | 20 | -$5.7k | $17k | 554 | 5.80 | 56.8 | 62.4 | 35.0% | 55.6% |
| S2 W26 final | 20 | -$8.3k | -$2.6k | 370 | 3.80 | 56.9 | 62.6 | 60.0% | 70.0% |
| S2 W27 final | 20 | $32k | $40k | 295 | 2.75 | 57.6 | 62.5 | 50.0% | 57.1% |
| S3 trial 1 | 19 | $7.4k | -$27k | 553 | 5.00 | 57.7 | 62.7 | 52.6% | 57.9% |
| S3 trial 2 | 19 | -$14k | -$21k | 545 | 5.11 | 57.6 | 62.7 | 63.2% | 63.2% |
| S3 W1 | 19 | $2.8k | $17k | 544 | 5.42 | 57.8 | 62.9 | 42.1% | 42.1% |
| S3 W2 | 19 | -$19k | -$22k | 545 | 5.32 | 57.7 | 63.0 | 78.9% | 57.9% |
| S3 W3 | 19 | $1.9k | $21k | 559 | 5.37 | 57.8 | 63.1 | 36.8% | 63.2% |
| S3 W4 | 19 | -$19k | -$21k | 560 | 5.74 | 57.5 | 63.2 | 84.2% | 47.4% |
| S3 W5 | 19 | $598 | $19k | 553 | 5.68 | 57.6 | 63.4 | 31.6% | 52.6% |
| S3 W6 | 19 | -$23k | -$24k | 567 | 5.26 | 57.6 | 63.6 | 89.5% | 73.7% |
| S3 W7 | 19 | -$1.1k | $22k | 567 | 6.00 | 57.8 | 63.7 | 31.6% | 68.4% |
| S3 W8 | 19 | -$23k | -$22k | 559 | 5.58 | 57.6 | 63.8 | 100.0% | 57.9% |
| S3 W9 | 19 | -$1.9k | $21k | 557 | 4.47 | 57.9 | 63.9 | 31.6% | 57.9% |
| S3 W10 | 19 | -$23k | -$21k | 572 | 6.16 | 57.9 | 64.1 | 100.0% | 68.4% |
| S3 W11 | 19 | $43 | $23k | 555 | 5.89 | 58.1 | 64.2 | 36.8% | 57.9% |
| S3 W12 | 19 | -$23k | -$23k | 555 | 5.26 | 58.2 | 64.3 | 100.0% | 57.9% |
| S3 W13 | 19 | -$882 | $22k | 556 | 5.58 | 58.4 | 64.4 | 31.6% | 52.6% |
| S3 W14 | 19 | -$22k | -$21k | 565 | 5.42 | 58.4 | 64.5 | 100.0% | 68.4% |
| S3 W15 | 19 | -$1.9k | $20k | 565 | 5.89 | 58.8 | 64.6 | 31.6% | 68.4% |
| S3 W16 | 19 | -$23k | -$21k | 566 | 4.89 | 58.6 | 64.7 | 100.0% | 68.4% |
| S3 W17 | 19 | -$164 | $22k | 574 | 6.63 | 58.7 | 64.8 | 31.6% | 68.4% |
| S3 W18 | 19 | -$21k | -$21k | 552 | 4.74 | 58.7 | 65.0 | 100.0% | 52.6% |
| S3 W19 | 19 | $944 | $22k | 561 | 5.63 | 58.9 | 65.1 | 31.6% | 63.2% |
| S3 W20 | 19 | -$19k | -$20k | 570 | 5.53 | 58.8 | 65.2 | 94.7% | 78.9% |
| S3 W21 | 19 | $3.0k | $22k | 544 | 5.79 | 59.1 | 65.3 | 26.3% | 57.9% |
| S3 W22 | 19 | -$17k | -$20k | 559 | 5.00 | 59.3 | 65.5 | 94.7% | 73.7% |
| S3 W23 | 19 | $5.4k | $23k | 548 | 6.05 | 59.4 | 65.6 | 21.1% | 63.2% |
| S3 W24 | 19 | -$17k | -$22k | 540 | 4.79 | 59.3 | 65.7 | 94.7% | 57.9% |
| S3 W25 final | 19 | $4.6k | $21k | 497 | 5.21 | 59.5 | 65.8 | 26.3% | 81.3% |
| S3 W26 final | 19 | $6.0k | $1.3k | 420 | 4.21 | 59.5 | 65.9 | 42.1% | 61.5% |
| S3 W27 final | 19 | $58k | $52k | 311 | 2.74 | 60.2 | 65.6 | 31.6% | 87.5% |
| S4 trial 1 | 14 | $54k | -$39k | 504 | 4.71 | 60.4 | 66.6 | 28.6% | 57.1% |
| S4 trial 2 | 14 | $22k | -$31k | 527 | 4.79 | 60.2 | 66.8 | 50.0% | 85.7% |
| S4 W1 | 14 | $33k | $10k | 532 | 4.93 | 60.2 | 66.9 | 14.3% | 64.3% |
| S4 W2 | 14 | $751 | -$32k | 531 | 5.57 | 60.0 | 67.0 | 71.4% | 57.1% |
| S4 W3 | 14 | $20k | $19k | 546 | 4.93 | 59.9 | 67.1 | 21.4% | 64.3% |
| S4 W4 | 14 | -$7.0k | -$27k | 546 | 5.79 | 59.7 | 67.2 | 85.7% | 78.6% |
| S4 W5 | 14 | $6.9k | $14k | 545 | 5.29 | 60.0 | 67.4 | 28.6% | 85.7% |
| S4 W6 | 14 | -$21k | -$28k | 549 | 5.43 | 60.4 | 67.7 | 92.9% | 57.1% |
| S4 W7 | 14 | -$278 | $21k | 548 | 5.00 | 60.7 | 67.8 | 28.6% | 57.1% |
| S4 W8 | 14 | -$25k | -$24k | 541 | 5.64 | 60.5 | 67.9 | 100.0% | 57.1% |
| S4 W9 | 14 | -$3.5k | $21k | 530 | 5.00 | 60.7 | 67.9 | 28.6% | 71.4% |
| S4 W10 | 14 | -$26k | -$22k | 545 | 5.50 | 60.8 | 68.0 | 100.0% | 71.4% |
| S4 W11 | 14 | -$9.2k | $17k | 534 | 5.71 | 60.9 | 68.1 | 28.6% | 71.4% |
| S4 W12 | 14 | -$30k | -$21k | 548 | 5.36 | 60.6 | 68.0 | 100.0% | 85.7% |
| S4 W13 | 14 | -$9.3k | $21k | 550 | 4.93 | 60.8 | 68.1 | 35.7% | 78.6% |
| S4 W14 | 14 | -$30k | -$21k | 532 | 5.36 | 60.9 | 68.0 | 100.0% | 64.3% |
| S4 W15 | 14 | -$8.9k | $21k | 528 | 5.00 | 61.2 | 68.1 | 35.7% | 35.7% |
| S4 W16 | 14 | -$30k | -$21k | 542 | 5.36 | 61.4 | 68.3 | 100.0% | 78.6% |
| S4 W17 | 14 | -$8.3k | $21k | 545 | 5.29 | 61.5 | 68.4 | 28.6% | 78.6% |
| S4 W18 | 14 | -$28k | -$20k | 541 | 5.86 | 61.6 | 68.4 | 100.0% | 85.7% |
| S4 W19 | 14 | -$6.7k | $22k | 526 | 5.00 | 61.8 | 68.5 | 35.7% | 57.1% |
| S4 W20 | 14 | -$28k | -$21k | 535 | 5.79 | 61.5 | 68.6 | 100.0% | 64.3% |
| S4 W21 | 14 | -$6.0k | $22k | 530 | 5.00 | 61.6 | 68.7 | 28.6% | 78.6% |
| S4 W22 | 14 | -$28k | -$22k | 546 | 5.50 | 61.7 | 68.8 | 100.0% | 64.3% |
| S4 W23 | 14 | $7.3k | $35k | 531 | 5.29 | 61.9 | 68.8 | 14.3% | 64.3% |
| S4 W24 | 14 | -$14k | -$21k | 550 | 5.50 | 61.3 | 68.9 | 100.0% | 64.3% |
| S4 W25 final | 14 | $7.4k | $21k | 551 | 4.93 | 61.2 | 68.7 | 28.6% | 85.7% |
| S4 W26 final | 14 | $9.1k | $1.6k | 490 | 5.00 | 61.2 | 68.8 | 28.6% | 58.3% |
| S4 W27 final | 14 | $45k | $36k | 331 | 3.14 | 62.0 | 68.6 | 42.9% | 85.7% |
| S5 trial 1 | 10 | $40k | -$36k | 471 | 4.80 | 62.8 | 68.6 | 20.0% | 70.0% |
| S5 trial 2 | 10 | $3.7k | -$36k | 479 | 4.60 | 62.5 | 68.7 | 40.0% | 70.0% |
| S5 W1 | 10 | $11k | $7.0k | 484 | 4.30 | 62.6 | 68.7 | 20.0% | 60.0% |
| S5 W2 | 10 | -$18k | -$29k | 496 | 5.20 | 62.1 | 68.8 | 90.0% | 80.0% |
| S5 W3 | 10 | $1.0k | $20k | 499 | 4.20 | 62.2 | 68.8 | 40.0% | 60.0% |
| S5 W4 | 10 | -$25k | -$26k | 511 | 5.10 | 61.8 | 68.9 | 100.0% | 80.0% |
| S5 W5 | 10 | -$5.5k | $20k | 510 | 5.20 | 62.2 | 68.9 | 50.0% | 70.0% |
| S5 W6 | 10 | -$27k | -$22k | 494 | 5.00 | 62.2 | 69.0 | 100.0% | 50.0% |
| S5 W7 | 10 | -$7.0k | $20k | 504 | 5.10 | 62.6 | 69.1 | 80.0% | 70.0% |
| S5 W8 | 10 | -$27k | -$20k | 494 | 4.30 | 62.7 | 69.1 | 100.0% | 60.0% |
| S5 W9 | 10 | -$7.1k | $20k | 495 | 5.30 | 62.9 | 69.2 | 70.0% | 70.0% |
| S5 W10 | 10 | -$28k | -$21k | 512 | 5.10 | 62.8 | 69.2 | 100.0% | 90.0% |
| S5 W11 | 10 | -$8.1k | $20k | 499 | 5.10 | 63.1 | 69.3 | 70.0% | 60.0% |
| S5 W12 | 10 | -$31k | -$23k | 515 | 5.40 | 63.2 | 69.3 | 100.0% | 70.0% |
| S5 W13 | 10 | -$10k | $20k | 477 | 4.50 | 63.3 | 69.4 | 60.0% | 50.0% |
| S5 W14 | 10 | -$31k | -$21k | 503 | 5.20 | 63.0 | 69.5 | 100.0% | 70.0% |
| S5 W15 | 10 | -$11k | $20k | 503 | 5.30 | 63.2 | 69.5 | 60.0% | 80.0% |
| S5 W16 | 10 | -$32k | -$21k | 497 | 4.80 | 63.0 | 69.6 | 100.0% | 60.0% |
| S5 W17 | 10 | -$12k | $20k | 492 | 4.80 | 63.3 | 69.6 | 60.0% | 60.0% |
| S5 W18 | 10 | -$33k | -$21k | 505 | 5.10 | 63.2 | 69.7 | 100.0% | 60.0% |
| S5 W19 | 10 | -$13k | $20k | 503 | 4.20 | 63.3 | 69.8 | 50.0% | 80.0% |
| S5 W20 | 10 | -$34k | -$21k | 488 | 4.90 | 63.0 | 69.8 | 100.0% | 50.0% |
| S5 W21 | 10 | -$14k | $20k | 513 | 5.30 | 63.3 | 69.9 | 40.0% | 90.0% |
| S5 W22 | 10 | -$35k | -$21k | 495 | 5.10 | 62.7 | 69.9 | 100.0% | 80.0% |
| S5 W23 | 10 | $453 | $35k | 503 | 5.60 | 63.0 | 70.0 | 40.0% | 90.0% |
| S5 W24 | 10 | -$27k | -$28k | 506 | 4.80 | 63.1 | 70.1 | 90.0% | 90.0% |
| S5 W25 final | 10 | $11k | $38k | 477 | 5.10 | 63.4 | 69.8 | 20.0% | 70.0% |
| S5 W26 final | 10 | $5.9k | -$5.0k | 353 | 3.30 | 63.1 | 70.1 | 40.0% | 57.1% |
| S5 W27 final | 10 | $7.0k | $1.1k | 221 | 1.70 | 64.2 | 70.1 | 60.0% | 50.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × rush | 2093 | 67.5% | 61 | 77.9% | -10.4% |  |
| expansive × slide | 55 | 78.2% | 2099 | 67.5% | 10.7% |  |
| kick-chase × slide | 6 | 75.0% | 2148 | 67.7% | 7.3% |  |
| block-play | 122 | 71.7% | 2032 | 67.5% | 4.2% |  |
| block-shift | 204 | 66.9% | 1950 | 67.8% | -0.9% |  |
| chip-chase | 1682 | 68.1% | 472 | 66.4% | 1.7% |  |
| cut-out-winger | 204 | 66.9% | 1950 | 67.8% | -0.9% |  |
| inside-ball | 122 | 71.7% | 2032 | 67.5% | 4.2% |  |
| kick-pass | 1682 | 68.1% | 472 | 66.4% | 1.7% |  |
| second-man | 204 | 66.9% | 1950 | 67.8% | -0.9% |  |
| short-side-raid | 122 | 71.7% | 2032 | 67.5% | 4.2% |  |

### careless/normal/au

- 70 overall (best nine, including recruitment): 101.0 weeks; 2 reached, 18 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 157 of 400; median 25.0 weeks among those who did.
- Reaching potential stars: 177 of 400 (95 already there at week 0); median 44.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/249; S3 1/157; S5 2/27.
- Mean XP per completed season 16067; mean level-ups per completed season 155.6.
- Cash: opening 200000; mean weekly change -3317; mean weeks in debt 66.8.
- Bankruptcy warnings: 1343; forced sales: 103; sacked with missed solvency objective: 19.
- Save round-trips: 56; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks hard. Completed seasons end at -47561 on average. Broke rate 100.0% (a bankruptcy warning, or a sacking for a missed solvency objective).
- WARNING: the board is sacking clubs for money. 19 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -443865 |
| upkeep | 0 |
| overhead | -65714 |
| sponsor | 0 |
| grant | 46374 |
| gate | 420607 |
| prize | 26161 |
| boardGrant | 11429 |
| events | 3507 |
| transfers | -81888 |
| contracts | -6407 |
| facilities | -6393 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 1 speed 1 | $174k | -$26k | 850 | 2 | 50.1 | W 12-6 Dubbo Diggers |
| S1 trial 2 | footyIQ | 5 speed 1, stamina 1, footyIQ 3 | $116k | -$58k | 757 | 7 | 50.7 | L 0-8 Wagga Swagmen |
| S1 W1 | handling | 3 handling 1, footyIQ 2 | $63k | -$54k | 809 | 6 | 51.5 | W 11-5 Launceston Larrikins |
| S1 W2 | stamina | 3 strength 1, handling 2 | $1.6k | -$61k | 822 | 11 | 52.1 | W 14-4 Darwin Drovers |
| S1 W3 | kicking | 11 speed 4, stamina 2, footyIQ 5 | $7.5k | $5.9k | 750 | 4 | 52.2 | L 0-6 Southport Stingrays |
| S1 W4 | kicking | 3 speed 2, footyIQ 1 | -$12k | -$20k | 768 | 7 | 52.2 | W 4-0 Broken Hill Brollys |
| S1 W5 | stamina | 9 speed 4, strength 2, stamina 1, handling 1, footyIQ 1 | -$6.4k | $5.9k | 753 | 8 | 52.3 | L 4-10 Geelong Gulls |
| S1 W6 | strength | 13 speed 3, strength 3, handling 2, kicking 2, footyIQ 3 | -$28k | -$22k | 768 | 8 | 52.4 | L 8-14 Wagga Swagmen |
| S1 W7 | speed | 4 speed 2, strength 1, footyIQ 1 | -$26k | $2.1k | 843 | 7 | 52.4 | W 14-4 Katherine Crocs |
| S1 W8 | footyIQ | 5 stamina 1, footyIQ 4 | -$49k | -$23k | 798 | 10 | 52.9 | D 4-4 Shellharbour Scorpions |
| S1 W9 | footyIQ | 5 strength 1, handling 1, kicking 2, footyIQ 1 | -$45k | $3.4k | 855 | 7 | 53.5 | W 18-10 Dubbo Diggers |
| S1 W10 | footyIQ | 18 speed 3, strength 3, stamina 5, handling 3, kicking 1, footyIQ 3 | -$67k | -$21k | 822 | 8 | 54.2 | W 4-0 Mackay Marlins |
| S1 W11 | footyIQ | 6 speed 1, strength 2, stamina 2, handling 1 | -$60k | $6.7k | 836 | 6 | 54.3 | D 0-0 Ballarat Bushrangers |
| S1 W12 | kicking | 7 speed 1, strength 1, stamina 1, handling 2, footyIQ 2 | -$80k | -$20k | 869 | 11 | 55.0 | D 6-6 Cairns Cyclones |
| S1 W13 | speed | 6 strength 1, stamina 1, handling 1, kicking 2, footyIQ 1 | -$68k | $13k | 794 | 8 | 55.0 | L 0-10 Toowoomba Thunder |
| S1 W14 | handling | 9 speed 2, handling 2, kicking 2, footyIQ 3 | -$86k | -$19k | 801 | 8 | 55.2 | L 4-10 Woolloomooloo Wolves |
| S1 W15 | footyIQ | 15 speed 2, strength 2, stamina 4, handling 3, kicking 1, footyIQ 3 | -$79k | $7.6k | 852 | 8 | 56.0 | W 6-0 Redcliffe Reapers |
| S1 W16 | speed | 8 speed 3, strength 2, stamina 1, handling 1, footyIQ 1 | -$97k | -$18k | 859 | 11 | 56.1 | D 6-6 Launceston Larrikins |
| S1 W17 | handling | 6 speed 2, strength 1, stamina 2, kicking 1 | -$88k | $9.2k | 887 | 7 | 56.2 | W 10-0 Darwin Drovers |
| S1 W18 | footyIQ | 10 speed 3, strength 1, stamina 2, handling 1, footyIQ 3 | -$107k | -$19k | 690 | 8 | 55.4 | D 0-0 Southport Stingrays |
| S1 W19 | footyIQ | 8 speed 3, strength 1, handling 2, kicking 1, footyIQ 1 | -$97k | $9.9k | 738 | 5 | 55.5 | W 4-0 Broken Hill Brollys |
| S1 W20 | stamina | 6 stamina 1, handling 3, footyIQ 2 | -$112k | -$15k | 773 | 8 | 54.9 | L 0-13 Geelong Gulls |
| S1 W21 | handling | 4 strength 2, handling 2 | -$101k | $11k | 731 | 7 | 54.3 | L 4-6 Wagga Swagmen |
| S1 W22 | handling | 4 speed 2, stamina 2 | -$114k | -$13k | 729 | 9 | 54.4 | L 4-16 Katherine Crocs |
| S1 W23 | strength | 5 speed 1, strength 1, handling 1, kicking 1, footyIQ 1 | -$105k | $8.8k | 754 | 7 | 54.5 | W 4-0 Shellharbour Scorpions |
| S1 W24 | strength | 14 speed 2, stamina 2, handling 2, kicking 6, footyIQ 2 | -$118k | -$13k | 797 | 7 | 54.7 | W 12-0 Dubbo Diggers |
| S1 W25 final | footyIQ | 11 speed 2, strength 2, stamina 2, handling 1, footyIQ 4 | -$130k | -$12k | 760 | 9 | 54.9 | W 20-7 Southport Stingrays |
| S1 W26 final | speed | 3 handling 1, kicking 1, footyIQ 1 | -$142k | -$13k | 716 | 6 | 55.0 | L 0-4 Toowoomba Thunder |
| S1 W27 final | strength | 3 speed 2, footyIQ 1 | -$105k | $37k | 162 | 2 | 55.0 | no match |
| S2 trial 1 | kicking | 8 speed 2, strength 1, stamina 2, handling 2, footyIQ 1 | -$118k | -$13k | 637 | 7 | 55.2 | W 10-4 Toowoomba Thunder |
| S2 trial 2 | speed | 7 speed 4, strength 1, stamina 1, footyIQ 1 | -$123k | -$5.5k | 657 | 5 | 55.3 | W 4-0 Wagga Swagmen |
| S2 W1 | stamina | 9 speed 1, strength 2, handling 3, kicking 1, footyIQ 2 | -$107k | $16k | 609 | 7 | 55.4 | D 0-0 Launceston Larrikins |
| S2 W2 | footyIQ | 5 strength 1, kicking 1, footyIQ 3 | -$120k | -$13k | 627 | 7 | 55.5 | W 7-6 Darwin Drovers |
| S2 W3 | handling | 9 speed 3, stamina 1, handling 3, footyIQ 2 | -$97k | $23k | 711 | 8 | 54.6 | W 6-0 Southport Stingrays |
| S2 W4 | speed | 7 speed 2, stamina 2, footyIQ 3 | -$110k | -$13k | 746 | 5 | 54.0 | W 6-4 Broken Hill Brollys |
| S2 W5 | strength | 2 strength 1, footyIQ 1 | -$89k | $21k | 686 | 9 | 54.0 | L 0-6 Geelong Gulls |
| S2 W6 | stamina | 6 speed 2, strength 1, kicking 1, footyIQ 2 | -$101k | -$12k | 680 | 4 | 54.1 | L 0-12 Wagga Swagmen |
| S2 W7 | handling | 4 speed 2, stamina 1, handling 1 | -$83k | $18k | 766 | 9 | 54.2 | W 7-4 Katherine Crocs |
| S2 W8 | handling | 10 speed 4, strength 2, handling 2, kicking 1, footyIQ 1 | -$95k | -$12k | 651 | 8 | 54.4 | L 0-1 Shellharbour Scorpions |
| S2 W9 | speed | 13 speed 3, strength 2, stamina 1, handling 2, kicking 2, footyIQ 3 | -$80k | $15k | 768 | 8 | 54.6 | W 14-12 Dubbo Diggers |
| S2 W10 | speed | 1 stamina 1 | -$89k | -$8.8k | 708 | 6 | 54.6 | L 4-10 Mackay Marlins |
| S2 W11 | speed | 9 strength 1, stamina 1, handling 2, kicking 1, footyIQ 4 | -$73k | $16k | 746 | 6 | 54.8 | W 4-0 Ballarat Bushrangers |
| S2 W12 | stamina | 10 speed 3, strength 3, handling 2, footyIQ 2 | -$85k | -$12k | 688 | 7 | 55.0 | L 4-6 Cairns Cyclones |
| S2 W13 | speed | 5 speed 2, strength 1, handling 1, footyIQ 1 | -$64k | $21k | 702 | 5 | 55.1 | L 0-4 Toowoomba Thunder |
| S2 W14 | kicking | 8 speed 1, strength 3, handling 1, footyIQ 3 | -$75k | -$12k | 774 | 10 | 55.2 | W 14-10 Woolloomooloo Wolves |
| S2 W15 | footyIQ | 8 speed 2, strength 1, stamina 3, handling 1, kicking 1 | -$53k | $22k | 693 | 8 | 55.3 | L 0-4 Redcliffe Reapers |
| S2 W16 | kicking | 9 speed 4, handling 2, kicking 2, footyIQ 1 | -$65k | -$12k | 758 | 8 | 55.5 | W 6-0 Launceston Larrikins |
| S2 W17 | handling | 3 strength 2, footyIQ 1 | -$43k | $22k | 740 | 6 | 55.5 | L 12-20 Darwin Drovers |
| S2 W18 | handling | 8 speed 2, strength 2, stamina 1, handling 1, footyIQ 2 | -$55k | -$12k | 726 | 9 | 55.7 | L 8-13 Southport Stingrays |
| S2 W19 | speed | 12 speed 4, strength 1, stamina 1, handling 1, kicking 3, footyIQ 2 | -$39k | $16k | 750 | 6 | 55.9 | W 4-0 Broken Hill Brollys |
| S2 W20 | handling | 2 strength 1, footyIQ 1 | -$51k | -$12k | 710 | 6 | 55.9 | L 4-14 Geelong Gulls |
| S2 W21 | footyIQ | 6 speed 3, strength 2, footyIQ 1 | -$38k | $14k | 793 | 9 | 56.0 | W 15-0 Wagga Swagmen |
| S2 W22 | kicking | 5 speed 1, strength 3, stamina 1 | -$50k | -$12k | 686 | 5 | 56.1 | L 0-26 Katherine Crocs |
| S2 W23 | footyIQ | 11 speed 3, handling 5, kicking 2, footyIQ 1 | -$31k | $19k | 783 | 9 | 56.3 | W 12-6 Shellharbour Scorpions |
| S2 W24 | stamina | 6 strength 2, handling 1, footyIQ 3 | -$43k | -$12k | 703 | 5 | 56.4 | L 6-16 Dubbo Diggers |
| S2 W25 final | strength | 5 speed 2, strength 1, handling 2 | -$55k | -$12k | 149 | 4 | 56.5 | no match |
| S2 W26 final | stamina | 5 strength 2, stamina 1, kicking 1, footyIQ 1 | -$61k | -$6.4k | 149 | 2 | 56.6 | no match |
| S2 W27 final | handling | 2 speed 1, kicking 1 | -$79k | -$18k | 149 | 1 | 56.6 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $146k | -$54k | 653 | 0.60 | 50.3 | 57.0 | 0.0% | 45.0% |
| S1 trial 2 | 20 | $86k | -$60k | 650 | 5.75 | 51.0 | 58.2 | 0.0% | 35.0% |
| S1 W1 | 20 | $58k | -$27k | 659 | 4.25 | 51.5 | 59.0 | 0.0% | 50.0% |
| S1 W2 | 20 | $3.1k | -$55k | 680 | 7.45 | 51.8 | 59.4 | 55.0% | 50.0% |
| S1 W3 | 20 | $1.7k | -$1.4k | 689 | 4.40 | 51.9 | 59.5 | 45.0% | 45.0% |
| S1 W4 | 20 | -$25k | -$27k | 678 | 6.80 | 52.0 | 59.5 | 100.0% | 55.0% |
| S1 W5 | 20 | -$20k | $4.9k | 682 | 7.20 | 52.1 | 59.6 | 100.0% | 65.0% |
| S1 W6 | 20 | -$43k | -$22k | 676 | 7.20 | 52.3 | 59.8 | 100.0% | 50.0% |
| S1 W7 | 20 | -$36k | $6.7k | 673 | 5.05 | 52.6 | 59.9 | 100.0% | 45.0% |
| S1 W8 | 20 | -$57k | -$22k | 672 | 9.50 | 52.8 | 60.0 | 100.0% | 40.0% |
| S1 W9 | 20 | -$53k | $4.4k | 667 | 4.70 | 53.0 | 60.1 | 100.0% | 50.0% |
| S1 W10 | 20 | -$74k | -$22k | 668 | 7.50 | 53.1 | 59.8 | 100.0% | 50.0% |
| S1 W11 | 20 | -$67k | $7.3k | 674 | 5.15 | 53.2 | 59.7 | 100.0% | 60.0% |
| S1 W12 | 20 | -$87k | -$20k | 662 | 7.60 | 53.2 | 59.4 | 100.0% | 40.0% |
| S1 W13 | 20 | -$76k | $11k | 664 | 5.85 | 53.4 | 59.3 | 100.0% | 60.0% |
| S1 W14 | 20 | -$95k | -$19k | 660 | 7.25 | 53.3 | 58.6 | 100.0% | 35.0% |
| S1 W15 | 20 | -$82k | $13k | 655 | 6.35 | 53.4 | 58.5 | 100.0% | 45.0% |
| S1 W16 | 20 | -$100k | -$18k | 666 | 6.95 | 53.3 | 57.8 | 100.0% | 65.0% |
| S1 W17 | 20 | -$88k | $12k | 656 | 5.90 | 53.4 | 57.7 | 100.0% | 55.0% |
| S1 W18 | 20 | -$104k | -$16k | 620 | 7.10 | 53.0 | 56.8 | 100.0% | 30.0% |
| S1 W19 | 20 | -$92k | $12k | 619 | 5.00 | 53.0 | 56.7 | 100.0% | 40.0% |
| S1 W20 | 20 | -$107k | -$15k | 632 | 6.25 | 52.9 | 56.2 | 100.0% | 55.0% |
| S1 W21 | 20 | -$92k | $14k | 606 | 6.15 | 52.8 | 56.1 | 100.0% | 30.0% |
| S1 W22 | 20 | -$106k | -$14k | 605 | 7.05 | 52.5 | 55.6 | 100.0% | 50.0% |
| S1 W23 | 20 | -$93k | $13k | 599 | 5.40 | 52.5 | 55.7 | 100.0% | 45.0% |
| S1 W24 | 20 | -$107k | -$13k | 610 | 6.05 | 52.4 | 55.3 | 100.0% | 45.0% |
| S1 W25 final | 20 | -$104k | $2.3k | 435 | 4.20 | 52.2 | 55.0 | 100.0% | 38.5% |
| S1 W26 final | 20 | -$113k | -$8.5k | 236 | 2.85 | 52.1 | 54.8 | 100.0% | 40.0% |
| S1 W27 final | 20 | -$89k | $24k | 157 | 1.30 | 52.3 | 54.6 | 90.0% | 50.0% |
| S2 trial 1 | 20 | -$101k | -$12k | 571 | 5.50 | 51.3 | 54.8 | 90.0% | 35.0% |
| S2 trial 2 | 20 | -$111k | -$9.5k | 584 | 5.25 | 51.4 | 54.9 | 95.0% | 60.0% |
| S2 W1 | 20 | -$95k | $16k | 584 | 6.35 | 51.4 | 55.1 | 95.0% | 30.0% |
| S2 W2 | 20 | -$109k | -$13k | 590 | 5.60 | 51.5 | 55.2 | 100.0% | 30.0% |
| S2 W3 | 20 | -$89k | $20k | 595 | 6.65 | 51.4 | 55.3 | 90.0% | 45.0% |
| S2 W4 | 20 | -$101k | -$12k | 598 | 5.10 | 51.4 | 55.3 | 100.0% | 65.0% |
| S2 W5 | 20 | -$82k | $19k | 599 | 6.55 | 51.4 | 55.4 | 90.0% | 45.0% |
| S2 W6 | 20 | -$94k | -$12k | 607 | 5.45 | 51.3 | 55.5 | 100.0% | 65.0% |
| S2 W7 | 20 | -$72k | $22k | 597 | 5.45 | 51.4 | 55.5 | 90.0% | 50.0% |
| S2 W8 | 20 | -$85k | -$13k | 590 | 6.85 | 51.4 | 55.7 | 100.0% | 35.0% |
| S2 W9 | 20 | -$64k | $21k | 611 | 5.40 | 51.5 | 55.8 | 85.0% | 55.0% |
| S2 W10 | 20 | -$77k | -$13k | 613 | 6.75 | 51.6 | 55.9 | 100.0% | 50.0% |
| S2 W11 | 20 | -$59k | $18k | 601 | 5.70 | 51.7 | 56.0 | 85.0% | 35.0% |
| S2 W12 | 20 | -$72k | -$13k | 598 | 6.15 | 51.7 | 56.2 | 100.0% | 45.0% |
| S2 W13 | 20 | -$53k | $20k | 606 | 5.70 | 51.8 | 56.3 | 80.0% | 50.0% |
| S2 W14 | 20 | -$66k | -$14k | 591 | 6.30 | 51.8 | 56.5 | 100.0% | 35.0% |
| S2 W15 | 20 | -$44k | $22k | 583 | 5.45 | 51.8 | 56.6 | 75.0% | 20.0% |
| S2 W16 | 20 | -$58k | -$14k | 605 | 5.75 | 51.9 | 56.6 | 100.0% | 55.0% |
| S2 W17 | 20 | -$38k | $20k | 592 | 6.50 | 52.0 | 56.7 | 65.0% | 15.0% |
| S2 W18 | 20 | -$52k | -$14k | 600 | 5.75 | 52.1 | 56.9 | 100.0% | 40.0% |
| S2 W19 | 20 | -$38k | $14k | 616 | 6.35 | 52.1 | 57.0 | 65.0% | 45.0% |
| S2 W20 | 20 | -$51k | -$13k | 596 | 5.35 | 52.2 | 57.1 | 100.0% | 55.0% |
| S2 W21 | 20 | -$32k | $19k | 617 | 6.70 | 52.2 | 57.2 | 65.0% | 65.0% |
| S2 W22 | 20 | -$47k | -$15k | 604 | 5.40 | 52.3 | 57.4 | 100.0% | 55.0% |
| S2 W23 | 20 | -$27k | $21k | 620 | 6.75 | 52.5 | 57.6 | 60.0% | 70.0% |
| S2 W24 | 20 | -$42k | -$15k | 601 | 5.25 | 52.4 | 57.7 | 100.0% | 40.0% |
| S2 W25 final | 20 | -$38k | $4.1k | 387 | 4.65 | 52.5 | 57.8 | 65.0% | 54.5% |
| S2 W26 final | 20 | -$45k | -$7.5k | 265 | 2.65 | 52.7 | 58.0 | 80.0% | 50.0% |
| S2 W27 final | 20 | -$26k | $19k | 204 | 2.20 | 53.2 | 57.8 | 70.0% | 100.0% |
| S3 trial 1 | 11 | $4.5k | -$24k | 525 | 3.91 | 53.7 | 58.8 | 63.6% | 54.5% |
| S3 trial 2 | 11 | -$9.1k | -$14k | 506 | 5.36 | 53.9 | 58.9 | 72.7% | 27.3% |
| S3 W1 | 11 | $6.7k | $16k | 529 | 5.00 | 53.8 | 59.0 | 45.5% | 72.7% |
| S3 W2 | 11 | -$13k | -$20k | 519 | 5.45 | 53.8 | 59.1 | 72.7% | 18.2% |
| S3 W3 | 11 | -$1.1k | $12k | 525 | 4.64 | 53.7 | 59.2 | 54.5% | 45.5% |
| S3 W4 | 11 | -$23k | -$22k | 530 | 5.55 | 53.6 | 59.2 | 72.7% | 45.5% |
| S3 W5 | 11 | -$8.1k | $15k | 546 | 5.18 | 53.9 | 59.7 | 54.5% | 72.7% |
| S3 W6 | 11 | -$31k | -$23k | 524 | 5.45 | 54.1 | 59.9 | 90.9% | 45.5% |
| S3 W7 | 11 | -$10k | $20k | 518 | 5.00 | 54.3 | 60.0 | 45.5% | 36.4% |
| S3 W8 | 11 | -$31k | -$20k | 521 | 5.09 | 54.3 | 60.1 | 100.0% | 45.5% |
| S3 W9 | 11 | -$10k | $20k | 544 | 4.55 | 54.4 | 60.2 | 36.4% | 72.7% |
| S3 W10 | 11 | -$31k | -$21k | 521 | 5.18 | 54.3 | 60.4 | 100.0% | 45.5% |
| S3 W11 | 11 | -$10k | $20k | 523 | 6.18 | 54.5 | 60.5 | 45.5% | 54.5% |
| S3 W12 | 11 | -$29k | -$19k | 521 | 4.82 | 54.6 | 60.6 | 100.0% | 45.5% |
| S3 W13 | 11 | -$8.6k | $21k | 537 | 4.91 | 54.7 | 60.7 | 54.5% | 63.6% |
| S3 W14 | 11 | -$29k | -$20k | 531 | 5.00 | 54.9 | 61.0 | 100.0% | 45.5% |
| S3 W15 | 11 | -$6.5k | $22k | 507 | 5.18 | 55.1 | 61.1 | 45.5% | 18.2% |
| S3 W16 | 11 | -$28k | -$22k | 512 | 5.36 | 55.0 | 61.2 | 90.9% | 36.4% |
| S3 W17 | 11 | -$7.9k | $20k | 517 | 4.73 | 55.3 | 61.2 | 45.5% | 54.5% |
| S3 W18 | 11 | -$27k | -$19k | 517 | 5.27 | 55.4 | 61.3 | 100.0% | 63.6% |
| S3 W19 | 11 | -$8.1k | $19k | 520 | 5.18 | 55.6 | 61.4 | 45.5% | 36.4% |
| S3 W20 | 11 | -$27k | -$19k | 528 | 5.36 | 55.5 | 61.6 | 100.0% | 45.5% |
| S3 W21 | 11 | -$8.0k | $19k | 515 | 4.82 | 55.7 | 61.7 | 36.4% | 45.5% |
| S3 W22 | 11 | -$28k | -$20k | 521 | 5.64 | 55.5 | 61.8 | 100.0% | 72.7% |
| S3 W23 | 11 | -$6.8k | $21k | 520 | 5.18 | 55.8 | 61.9 | 45.5% | 36.4% |
| S3 W24 | 11 | -$27k | -$20k | 510 | 5.73 | 55.7 | 62.1 | 100.0% | 45.5% |
| S3 W25 final | 11 | -$11k | $16k | 331 | 2.82 | 55.8 | 62.2 | 63.6% | 50.0% |
| S3 W26 final | 11 | -$26k | -$15k | 223 | 2.00 | 56.1 | 62.4 | 81.8% | 33.3% |
| S3 W27 final | 11 | -$23k | $3.2k | 148 | 1.27 | 57.1 | 62.2 | 72.7% | 100.0% |
| S4 trial 1 | 3 | $36k | -$40k | 466 | 3.67 | 60.7 | 66.0 | 66.7% | 33.3% |
| S4 trial 2 | 3 | $16k | -$20k | 461 | 4.00 | 60.6 | 66.1 | 66.7% | 66.7% |
| S4 W1 | 3 | $26k | $10k | 478 | 6.00 | 60.4 | 66.2 | 33.3% | 33.3% |
| S4 W2 | 3 | -$6.8k | -$33k | 486 | 4.67 | 60.0 | 66.3 | 66.7% | 33.3% |
| S4 W3 | 3 | $9.8k | $17k | 501 | 3.33 | 59.8 | 66.3 | 33.3% | 66.7% |
| S4 W4 | 3 | -$18k | -$27k | 493 | 5.33 | 59.3 | 66.4 | 66.7% | 66.7% |
| S4 W5 | 3 | -$5.2k | $12k | 494 | 5.67 | 59.4 | 66.8 | 33.3% | 100.0% |
| S4 W6 | 3 | -$36k | -$30k | 447 | 4.00 | 59.3 | 66.9 | 100.0% | 66.7% |
| S4 W7 | 3 | -$17k | $19k | 541 | 3.67 | 59.3 | 66.9 | 66.7% | 100.0% |
| S4 W8 | 3 | -$43k | -$26k | 492 | 6.33 | 59.1 | 67.0 | 100.0% | 33.3% |
| S4 W9 | 3 | -$24k | $19k | 490 | 4.33 | 59.1 | 67.1 | 66.7% | 66.7% |
| S4 W10 | 3 | -$50k | -$26k | 506 | 5.67 | 59.0 | 67.1 | 100.0% | 66.7% |
| S4 W11 | 3 | -$31k | $19k | 511 | 5.67 | 59.5 | 67.1 | 66.7% | 100.0% |
| S4 W12 | 3 | -$56k | -$25k | 511 | 4.33 | 59.2 | 67.2 | 100.0% | 100.0% |
| S4 W13 | 3 | -$37k | $18k | 484 | 4.67 | 59.5 | 67.2 | 66.7% | 33.3% |
| S4 W14 | 3 | -$61k | -$24k | 506 | 5.00 | 59.5 | 67.3 | 100.0% | 66.7% |
| S4 W15 | 3 | -$43k | $19k | 497 | 5.00 | 59.5 | 67.4 | 66.7% | 100.0% |
| S4 W16 | 3 | -$69k | -$26k | 461 | 4.33 | 58.8 | 65.9 | 100.0% | 0.0% |
| S4 W17 | 3 | -$47k | $21k | 472 | 4.33 | 59.1 | 66.0 | 66.7% | 100.0% |
| S4 W18 | 3 | -$71k | -$23k | 436 | 5.00 | 58.6 | 64.8 | 100.0% | 100.0% |
| S4 W19 | 3 | -$47k | $24k | 420 | 3.67 | 58.7 | 64.9 | 66.7% | 66.7% |
| S4 W20 | 3 | -$67k | -$20k | 435 | 3.00 | 58.4 | 65.0 | 100.0% | 66.7% |
| S4 W21 | 3 | -$45k | $22k | 416 | 6.67 | 58.5 | 65.0 | 66.7% | 33.3% |
| S4 W22 | 3 | -$65k | -$20k | 426 | 4.00 | 58.6 | 65.1 | 100.0% | 66.7% |
| S4 W23 | 3 | -$34k | $31k | 463 | 4.00 | 58.8 | 65.1 | 66.7% | 100.0% |
| S4 W24 | 3 | -$51k | -$18k | 395 | 4.00 | 58.7 | 65.2 | 100.0% | 0.0% |
| S4 W25 final | 3 | -$17k | $35k | 414 | 5.00 | 58.7 | 65.3 | 66.7% | 66.7% |
| S4 W26 final | 3 | -$11k | $5.1k | 321 | 3.33 | 58.4 | 65.3 | 66.7% | 50.0% |
| S4 W27 final | 3 | $26k | $37k | 233 | 1.67 | 59.2 | 65.3 | 66.7% | 100.0% |
| S5 trial 1 | 2 | -$33k | -$13k | 316 | 1.50 | 56.8 | 62.3 | 100.0% | 50.0% |
| S5 trial 2 | 2 | -$45k | -$13k | 340 | 3.50 | 56.7 | 62.3 | 100.0% | 100.0% |
| S5 W1 | 2 | -$21k | $24k | 326 | 4.50 | 56.7 | 62.3 | 100.0% | 50.0% |
| S5 W2 | 2 | -$37k | -$15k | 341 | 3.00 | 56.7 | 62.3 | 100.0% | 50.0% |
| S5 W3 | 2 | -$10k | $26k | 342 | 4.00 | 56.7 | 62.4 | 100.0% | 50.0% |
| S5 W4 | 2 | -$28k | -$18k | 361 | 3.00 | 56.7 | 62.5 | 100.0% | 50.0% |
| S5 W5 | 2 | -$4.7k | $24k | 362 | 2.50 | 56.7 | 62.6 | 50.0% | 100.0% |
| S5 W6 | 2 | -$23k | -$18k | 325 | 3.50 | 56.7 | 62.5 | 100.0% | 0.0% |
| S5 W7 | 2 | -$115 | $23k | 323 | 3.50 | 56.7 | 62.6 | 50.0% | 0.0% |
| S5 W8 | 2 | -$21k | -$21k | 355 | 3.00 | 56.2 | 62.6 | 100.0% | 50.0% |
| S5 W9 | 2 | $2.0k | $23k | 347 | 3.00 | 56.2 | 62.6 | 50.0% | 50.0% |
| S5 W10 | 2 | -$17k | -$19k | 336 | 5.00 | 56.2 | 62.7 | 100.0% | 0.0% |
| S5 W11 | 2 | $6.5k | $23k | 344 | 3.00 | 56.2 | 62.8 | 0.0% | 50.0% |
| S5 W12 | 2 | -$18k | -$25k | 363 | 3.50 | 55.2 | 62.9 | 100.0% | 50.0% |
| S5 W13 | 2 | $3.0k | $21k | 358 | 3.00 | 55.7 | 63.0 | 0.0% | 50.0% |
| S5 W14 | 2 | -$16k | -$19k | 368 | 3.50 | 56.5 | 63.0 | 100.0% | 100.0% |
| S5 W15 | 2 | $7.1k | $23k | 326 | 3.50 | 56.5 | 63.0 | 0.0% | 0.0% |
| S5 W16 | 2 | -$18k | -$25k | 314 | 3.00 | 57.0 | 63.1 | 100.0% | 0.0% |
| S5 W17 | 2 | $5.3k | $23k | 344 | 3.50 | 57.0 | 63.2 | 0.0% | 50.0% |
| S5 W18 | 2 | -$16k | -$21k | 330 | 3.00 | 56.4 | 63.2 | 100.0% | 0.0% |
| S5 W19 | 2 | $7.1k | $23k | 341 | 4.00 | 56.5 | 63.3 | 0.0% | 50.0% |
| S5 W20 | 2 | -$17k | -$24k | 350 | 3.00 | 55.3 | 63.3 | 100.0% | 50.0% |
| S5 W21 | 2 | $5.0k | $22k | 330 | 3.00 | 55.7 | 63.4 | 0.0% | 0.0% |
| S5 W22 | 2 | -$17k | -$22k | 349 | 4.50 | 55.7 | 63.4 | 100.0% | 50.0% |
| S5 W23 | 2 | $16k | $33k | 362 | 3.00 | 56.4 | 63.4 | 0.0% | 100.0% |
| S5 W24 | 2 | -$12k | -$28k | 359 | 5.00 | 56.4 | 63.7 | 100.0% | 50.0% |
| S5 W25 final | 2 | -$9.4k | $2.5k | 77 | 0.50 | 56.9 | 63.7 | 100.0% | n/a |
| S5 W26 final | 2 | -$27k | -$18k | 77 | 0.50 | 56.9 | 63.6 | 100.0% | n/a |
| S5 W27 final | 2 | -$94k | -$67k | 69 | 1.00 | 57.8 | 62.6 | 100.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| expansive × slide | 329 | 67.2% | 1071 | 49.2% | 18.0% | WARNING |
| grind × compressed | 1038 | 49.2% | 362 | 65.5% | -16.3% | WARNING |
| kick-chase × slide | 33 | 48.5% | 1367 | 53.5% | -5.0% |  |
| block-play | 278 | 61.2% | 1122 | 51.5% | 9.7% |  |
| block-shift | 151 | 58.9% | 1249 | 52.7% | 6.2% |  |
| chip-chase | 618 | 50.6% | 782 | 55.6% | -5.1% |  |
| cut-out-winger | 151 | 58.9% | 1249 | 52.7% | 6.2% |  |
| inside-ball | 278 | 61.2% | 1122 | 51.5% | 9.7% |  |
| kick-pass | 668 | 51.3% | 732 | 55.3% | -4.1% |  |
| second-man | 151 | 58.9% | 1249 | 52.7% | 6.2% |  |
| short-side-raid | 278 | 61.2% | 1122 | 51.5% | 9.7% |  |

### careless/hard/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 167 of 400; median 27.0 weeks among those who did.
- Reaching potential stars: 115 of 400 (92 already there at week 0); median 45.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/239; S3 1/58; S5 0/0.
- Mean XP per completed season 15257; mean level-ups per completed season 147.2.
- Cash: opening 150000; mean weekly change -4938; mean weeks in debt 60.1.
- Bankruptcy warnings: 1203; forced sales: 124; sacked with missed solvency objective: 20.
- Save round-trips: 45; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks hard. Completed seasons end at -143198 on average. Broke rate 100.0% (a bankruptcy warning, or a sacking for a missed solvency objective).
- WARNING: the board is sacking clubs for money. 20 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -414391 |
| upkeep | 0 |
| overhead | -70898 |
| sponsor | 0 |
| grant | 38214 |
| gate | 345942 |
| prize | 8267 |
| boardGrant | 4533 |
| events | 3087 |
| transfers | -47586 |
| contracts | -4213 |
| facilities | -6156 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 0 | $95k | -$55k | 520 | 0 | 45.9 | W 7-0 Dubbo Diggers |
| S1 trial 2 | kicking | 0 | $35k | -$60k | 530 | 3 | 47.0 | W 10-0 Wagga Swagmen |
| S1 W1 | footyIQ | 7 speed 1, strength 3, footyIQ 3 | $29k | -$6.7k | 559 | 6 | 47.5 | W 13-0 Launceston Larrikins |
| S1 W2 | kicking | 3 speed 1, strength 1, footyIQ 1 | -$8.3k | -$37k | 486 | 2 | 48.2 | W 17-12 Darwin Drovers |
| S1 W3 | handling | 2 kicking 1, footyIQ 1 | $2.1k | $10k | 447 | 4 | 48.2 | D 0-0 Southport Stingrays |
| S1 W4 | strength | 5 speed 2, footyIQ 3 | -$19k | -$21k | 522 | 3 | 48.2 | W 14-6 Broken Hill Brollys |
| S1 W5 | strength | 7 speed 2, strength 2, stamina 1, kicking 1, footyIQ 1 | -$4.8k | $14k | 479 | 6 | 48.3 | W 9-6 Geelong Gulls |
| S1 W6 | handling | 3 speed 2, kicking 1 | -$28k | -$23k | 490 | 8 | 48.8 | W 10-6 Wagga Swagmen |
| S1 W7 | footyIQ | 4 speed 1, stamina 2, handling 1 | -$14k | $15k | 478 | 5 | 49.3 | L 16-17 Katherine Crocs |
| S1 W8 | strength | 8 speed 2, strength 3, stamina 2, handling 1 | -$35k | -$21k | 466 | 5 | 49.3 | W 10-6 Shellharbour Scorpions |
| S1 W9 | speed | 3 speed 1, stamina 1, footyIQ 1 | -$26k | $8.5k | 444 | 1 | 49.4 | L 7-18 Dubbo Diggers |
| S1 W10 | stamina | 6 speed 1, strength 2, stamina 1, kicking 1, footyIQ 1 | -$48k | -$22k | 447 | 5 | 50.0 | W 10-0 Mackay Marlins |
| S1 W11 | strength | 1 speed 1 | -$37k | $12k | 417 | 2 | 50.5 | L 6-11 Ballarat Bushrangers |
| S1 W12 | stamina | 3 speed 1, stamina 1, footyIQ 1 | -$56k | -$20k | 433 | 6 | 50.6 | D 5-5 Cairns Cyclones |
| S1 W13 | kicking | 4 speed 1, stamina 2, kicking 1 | -$46k | $11k | 474 | 2 | 51.2 | W 10-6 Toowoomba Thunder |
| S1 W14 | strength | 8 speed 1, strength 1, stamina 1, handling 1, kicking 2, footyIQ 2 | -$65k | -$19k | 452 | 8 | 51.3 | L 0-4 Woolloomooloo Wolves |
| S1 W15 | strength | 2 speed 1, footyIQ 1 | -$52k | $12k | 495 | 3 | 51.3 | W 12-0 Redcliffe Reapers |
| S1 W16 | handling | 7 speed 3, stamina 3, footyIQ 1 | -$71k | -$19k | 479 | 8 | 51.4 | L 12-16 Launceston Larrikins |
| S1 W17 | speed | 3 speed 1, stamina 1, handling 1 | -$59k | $12k | 446 | 4 | 51.4 | L 0-8 Darwin Drovers |
| S1 W18 | stamina | 7 speed 2, strength 2, handling 3 | -$78k | -$19k | 465 | 6 | 51.5 | D 6-6 Southport Stingrays |
| S1 W19 | kicking | 6 strength 2, stamina 1, kicking 1, footyIQ 2 | -$74k | $4.4k | 464 | 3 | 51.6 | D 0-0 Broken Hill Brollys |
| S1 W20 | footyIQ | 2 speed 1, stamina 1 | -$93k | -$19k | 440 | 5 | 52.2 | L 0-4 Geelong Gulls |
| S1 W21 | footyIQ | 4 speed 1, strength 1, footyIQ 2 | -$89k | $3.9k | 477 | 4 | 52.2 | W 21-4 Wagga Swagmen |
| S1 W22 | handling | 6 speed 1, strength 2, stamina 1, footyIQ 2 | -$107k | -$18k | 467 | 5 | 50.5 | L 13-15 Katherine Crocs |
| S1 W23 | strength | 3 speed 1, footyIQ 2 | -$98k | $9.2k | 495 | 4 | 50.5 | W 7-4 Shellharbour Scorpions |
| S1 W24 | kicking | 4 speed 3, stamina 1 | -$113k | -$15k | 450 | 6 | 49.4 | L 0-10 Dubbo Diggers |
| S1 W25 final | kicking | 7 speed 2, stamina 2, handling 1, footyIQ 2 | -$127k | -$14k | 511 | 5 | 48.3 | W 6-4 Katherine Crocs |
| S1 W26 final | strength | 6 speed 2, stamina 2, footyIQ 2 | -$140k | -$13k | 454 | 4 | 48.4 | L 6-17 Cairns Cyclones |
| S1 W27 final | stamina | 1 strength 1 | -$92k | $48k | 89 | 0 | 47.7 | no match |
| S2 trial 1 | speed | 3 speed 1, footyIQ 2 | -$93k | -$1.2k | 531 | 4 | 43.9 | L 0-4 Toowoomba Thunder |
| S2 trial 2 | handling | 3 speed 1, handling 1, kicking 1 | -$104k | -$10k | 654 | 6 | 44.0 | W 6-4 Mackay Marlins |
| S2 W1 | stamina | 4 speed 2, stamina 1, footyIQ 1 | -$84k | $19k | 710 | 7 | 44.1 | W 22-6 Launceston Larrikins |
| S2 W2 | footyIQ | 6 speed 3, stamina 1, handling 1, kicking 1 | -$94k | -$10k | 614 | 6 | 44.2 | L 4-6 Darwin Drovers |
| S2 W3 | strength | 5 speed 1, strength 1, handling 2, kicking 1 | -$69k | $25k | 620 | 9 | 44.2 | W 6-0 Southport Stingrays |
| S2 W4 | strength | 12 speed 3, strength 4, stamina 1, handling 3, footyIQ 1 | -$79k | -$10k | 594 | 5 | 44.5 | L 0-11 Broken Hill Brollys |
| S2 W5 | stamina | 7 speed 1, strength 1, handling 3, kicking 2 | -$60k | $19k | 647 | 7 | 44.6 | W 7-6 Geelong Gulls |
| S2 W6 | handling | 6 strength 1, stamina 1, handling 1, footyIQ 3 | -$70k | -$10k | 639 | 5 | 44.7 | D 0-0 Wagga Swagmen |
| S2 W7 | footyIQ | 1 handling 1 | -$45k | $25k | 594 | 4 | 44.7 | L 0-12 Katherine Crocs |
| S2 W8 | strength | 10 speed 4, strength 2, stamina 2, handling 1, footyIQ 1 | -$55k | -$10k | 609 | 8 | 44.9 | D 4-4 Shellharbour Scorpions |
| S2 W9 | handling | 2 handling 1, footyIQ 1 | -$37k | $18k | 609 | 3 | 44.9 | L 4-6 Dubbo Diggers |
| S2 W10 | speed | 8 speed 3, strength 2, stamina 1, handling 1, footyIQ 1 | -$47k | -$10k | 617 | 11 | 45.0 | L 0-4 Mackay Marlins |
| S2 W11 | handling | 11 speed 4, strength 2, stamina 1, handling 3, footyIQ 1 | -$32k | $15k | 695 | 4 | 45.2 | W 14-6 Ballarat Bushrangers |
| S2 W12 | handling | 2 strength 1, footyIQ 1 | -$43k | -$10k | 633 | 9 | 45.3 | W 13-4 Cairns Cyclones |
| S2 W13 | footyIQ | 9 speed 2, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | -$17k | $25k | 655 | 5 | 45.4 | W 16-13 Toowoomba Thunder |
| S2 W14 | handling | 2 strength 1, stamina 1 | -$28k | -$10k | 663 | 7 | 45.5 | W 10-4 Woolloomooloo Wolves |
| S2 W15 | footyIQ | 9 speed 1, strength 2, stamina 1, kicking 1, footyIQ 4 | $4.3k | $32k | 632 | 5 | 45.6 | W 1-0 Redcliffe Reapers |
| S2 W16 | kicking | 3 speed 2, strength 1 | -$9.3k | -$14k | 655 | 5 | 44.6 | W 10-8 Launceston Larrikins |
| S2 W17 | footyIQ | 6 speed 4, footyIQ 2 | $22k | $31k | 637 | 8 | 44.7 | L 6-8 Darwin Drovers |
| S2 W18 | stamina | 10 strength 1, stamina 3, handling 1, kicking 2, footyIQ 3 | $1.3k | -$21k | 567 | 6 | 45.4 | L 0-12 Southport Stingrays |
| S2 W19 | strength | 7 speed 2, stamina 2, handling 2, footyIQ 1 | $28k | $27k | 583 | 7 | 45.5 | W 6-4 Broken Hill Brollys |
| S2 W20 | strength | 3 speed 2, strength 1 | $7.5k | -$21k | 545 | 4 | 45.9 | L 0-10 Geelong Gulls |
| S2 W21 | stamina | 7 speed 5, stamina 1, footyIQ 1 | $18k | $11k | 542 | 7 | 46.5 | D 6-6 Wagga Swagmen |
| S2 W22 | strength | 5 speed 2, kicking 1, footyIQ 2 | -$14k | -$32k | 500 | 4 | 48.0 | W 8-4 Katherine Crocs |
| S2 W23 | handling | 1 footyIQ 1 | $2.9k | $17k | 585 | 3 | 48.0 | W 14-13 Shellharbour Scorpions |
| S2 W24 | stamina | 9 speed 3, strength 1, stamina 1, kicking 1, footyIQ 3 | -$14k | -$17k | 477 | 6 | 49.0 | L 8-10 Dubbo Diggers |
| S2 W25 final | footyIQ | 5 speed 2, stamina 1, handling 1, footyIQ 1 | -$29k | -$15k | 464 | 4 | 49.1 | L 0-4 Katherine Crocs |
| S2 W26 final | stamina | 0 | -$43k | -$15k | 127 | 0 | 49.0 | no match |
| S2 W27 final | handling | 3 speed 1, stamina 1, handling 1 | -$28k | $15k | 122 | 3 | 48.6 | no match |
| S3 trial 1 | speed | 6 speed 5, strength 1 | -$43k | -$15k | 458 | 5 | 48.7 | L 4-6 Toowoomba Thunder |
| S3 trial 2 | speed | 4 strength 2, handling 1, footyIQ 1 | -$49k | -$6.7k | 499 | 5 | 48.7 | W 14-6 Broken Hill Brollys |
| S3 W1 | stamina | 3 speed 1, handling 1, footyIQ 1 | -$32k | $17k | 438 | 3 | 48.7 | L 0-6 Launceston Larrikins |
| S3 W2 | stamina | 2 strength 1, footyIQ 1 | -$47k | -$15k | 411 | 5 | 48.7 | L 0-6 Darwin Drovers |
| S3 W3 | kicking | 3 strength 1, handling 2 | -$30k | $17k | 422 | 4 | 48.7 | W 6-4 Southport Stingrays |
| S3 W4 | handling | 7 speed 1, strength 1, handling 2, kicking 1, footyIQ 2 | -$44k | -$15k | 492 | 6 | 48.8 | W 1-0 Broken Hill Brollys |
| S3 W5 | footyIQ | 2 handling 1, footyIQ 1 | -$24k | $20k | 459 | 3 | 48.8 | L 6-10 Geelong Gulls |
| S3 W6 | speed | 5 speed 3, strength 1, handling 1 | -$39k | -$15k | 476 | 4 | 48.8 | L 4-5 Wagga Swagmen |
| S3 W7 | speed | 3 speed 1, strength 1, handling 1 | -$20k | $19k | 457 | 5 | 48.9 | L 0-19 Katherine Crocs |
| S3 W8 | footyIQ | 7 speed 1, strength 1, stamina 3, footyIQ 2 | -$35k | -$15k | 466 | 4 | 48.9 | L 6-10 Shellharbour Scorpions |
| S3 W9 | speed | 6 speed 2, strength 1, handling 3 | -$19k | $16k | 487 | 5 | 49.0 | L 11-18 Dubbo Diggers |
| S3 W10 | stamina | 2 speed 1, footyIQ 1 | -$34k | -$15k | 494 | 8 | 49.0 | W 10-4 Mackay Marlins |
| S3 W11 | handling | 6 speed 2, strength 1, stamina 1, footyIQ 2 | -$18k | $16k | 458 | 3 | 49.1 | L 0-4 Ballarat Bushrangers |
| S3 W12 | strength | 4 speed 1, stamina 1, footyIQ 2 | -$33k | -$15k | 508 | 5 | 49.1 | W 16-6 Cairns Cyclones |
| S3 W13 | strength | 7 speed 3, strength 1, handling 2, footyIQ 1 | -$19k | $13k | 470 | 5 | 49.2 | D 0-0 Toowoomba Thunder |
| S3 W14 | handling | 5 speed 1, strength 1, stamina 2, footyIQ 1 | -$31k | -$12k | 462 | 3 | 49.2 | L 0-4 Woolloomooloo Wolves |
| S3 W15 | handling | 4 speed 2, strength 1, kicking 1 | -$9.4k | $22k | 501 | 6 | 49.2 | W 6-0 Redcliffe Reapers |
| S3 W16 | speed | 2 speed 1, handling 1 | -$24k | -$15k | 452 | 3 | 49.2 | L 0-18 Launceston Larrikins |
| S3 W17 | speed | 5 speed 1, strength 2, stamina 1, handling 1 | -$2.4k | $22k | 536 | 6 | 49.3 | W 17-13 Darwin Drovers |
| S3 W18 | footyIQ | 7 speed 3, strength 2, handling 1, kicking 1 | -$17k | -$15k | 516 | 5 | 49.4 | L 16-19 Southport Stingrays |
| S3 W19 | footyIQ | 1 footyIQ 1 | -$2.9k | $14k | 456 | 6 | 49.3 | D 0-0 Broken Hill Brollys |
| S3 W20 | kicking | 3 speed 1, strength 1, stamina 1 | -$18k | -$15k | 467 | 3 | 49.3 | D 0-0 Geelong Gulls |
| S3 W21 | strength | 5 strength 3, stamina 1, footyIQ 1 | -$3.4k | $14k | 457 | 6 | 49.4 | L 0-4 Wagga Swagmen |
| S3 W22 | strength | 8 speed 3, strength 1, handling 1, kicking 1, footyIQ 2 | -$18k | -$15k | 498 | 6 | 49.5 | W 12-4 Katherine Crocs |
| S3 W23 | handling | 4 speed 2, footyIQ 2 | $1.8k | $20k | 492 | 5 | 49.5 | D 4-4 Shellharbour Scorpions |
| S3 W24 | strength | 7 speed 3, stamina 1, handling 1, footyIQ 2 | -$13k | -$15k | 457 | 4 | 49.6 | L 0-10 Dubbo Diggers |
| S3 W25 final | speed | 8 speed 3, stamina 2, footyIQ 3 | -$21k | -$7.8k | 108 | 1 | 49.7 | no match |
| S3 W26 final | footyIQ | 0 | -$35k | -$15k | 108 | 0 | 49.7 | no match |
| S3 W27 final | kicking | 1 handling 1 | -$57k | -$22k | 105 | 1 | 50.9 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $95k | -$55k | 598 | 0.20 | 46.7 | 54.1 | 0.0% | 40.0% |
| S1 trial 2 | 20 | $33k | -$63k | 609 | 5.15 | 47.5 | 55.5 | 10.0% | 35.0% |
| S1 W1 | 20 | $15k | -$18k | 619 | 4.15 | 48.1 | 56.4 | 5.0% | 55.0% |
| S1 W2 | 20 | -$17k | -$32k | 585 | 6.45 | 48.3 | 56.8 | 95.0% | 30.0% |
| S1 W3 | 20 | -$12k | $4.3k | 586 | 3.30 | 48.5 | 56.8 | 85.0% | 50.0% |
| S1 W4 | 20 | -$37k | -$24k | 596 | 6.10 | 48.7 | 57.0 | 100.0% | 65.0% |
| S1 W5 | 20 | -$32k | $4.6k | 581 | 6.35 | 49.0 | 57.0 | 100.0% | 35.0% |
| S1 W6 | 20 | -$55k | -$23k | 578 | 6.60 | 49.2 | 57.1 | 100.0% | 35.0% |
| S1 W7 | 20 | -$50k | $5.4k | 572 | 3.60 | 49.4 | 57.2 | 100.0% | 25.0% |
| S1 W8 | 20 | -$72k | -$23k | 581 | 8.80 | 49.7 | 57.3 | 100.0% | 45.0% |
| S1 W9 | 20 | -$70k | $2.6k | 569 | 4.10 | 49.9 | 57.4 | 100.0% | 30.0% |
| S1 W10 | 20 | -$92k | -$22k | 564 | 6.05 | 49.5 | 55.9 | 100.0% | 45.0% |
| S1 W11 | 20 | -$89k | $3.7k | 564 | 3.90 | 49.5 | 55.4 | 100.0% | 35.0% |
| S1 W12 | 20 | -$108k | -$20k | 558 | 7.35 | 49.1 | 54.3 | 100.0% | 35.0% |
| S1 W13 | 20 | -$97k | $12k | 548 | 3.95 | 48.9 | 53.6 | 100.0% | 30.0% |
| S1 W14 | 20 | -$114k | -$18k | 548 | 7.05 | 48.6 | 52.8 | 100.0% | 25.0% |
| S1 W15 | 20 | -$102k | $13k | 555 | 4.65 | 48.5 | 52.4 | 100.0% | 30.0% |
| S1 W16 | 20 | -$118k | -$16k | 563 | 6.10 | 48.1 | 51.5 | 100.0% | 50.0% |
| S1 W17 | 20 | -$106k | $12k | 552 | 4.55 | 48.1 | 51.4 | 100.0% | 40.0% |
| S1 W18 | 20 | -$120k | -$15k | 538 | 6.40 | 47.7 | 50.6 | 100.0% | 20.0% |
| S1 W19 | 20 | -$110k | $10k | 549 | 4.55 | 47.6 | 50.6 | 100.0% | 40.0% |
| S1 W20 | 20 | -$124k | -$14k | 543 | 5.65 | 47.5 | 50.3 | 100.0% | 35.0% |
| S1 W21 | 20 | -$111k | $13k | 539 | 5.15 | 47.6 | 50.4 | 100.0% | 30.0% |
| S1 W22 | 20 | -$125k | -$14k | 542 | 6.15 | 47.3 | 49.9 | 100.0% | 30.0% |
| S1 W23 | 20 | -$114k | $11k | 547 | 5.00 | 47.3 | 49.9 | 100.0% | 50.0% |
| S1 W24 | 20 | -$127k | -$13k | 548 | 5.65 | 47.2 | 49.8 | 100.0% | 35.0% |
| S1 W25 final | 20 | -$138k | -$11k | 245 | 1.90 | 47.2 | 49.7 | 100.0% | 33.3% |
| S1 W26 final | 20 | -$151k | -$13k | 162 | 2.05 | 47.2 | 49.6 | 100.0% | 0.0% |
| S1 W27 final | 20 | -$150k | $1.1k | 116 | 1.00 | 47.4 | 49.3 | 100.0% | n/a |
| S2 trial 1 | 20 | -$159k | -$8.8k | 541 | 4.60 | 46.3 | 49.4 | 100.0% | 25.0% |
| S2 trial 2 | 20 | -$168k | -$9.8k | 572 | 5.80 | 46.3 | 49.4 | 100.0% | 50.0% |
| S2 W1 | 20 | -$153k | $15k | 578 | 6.10 | 46.4 | 49.4 | 100.0% | 45.0% |
| S2 W2 | 20 | -$166k | -$12k | 570 | 5.30 | 46.4 | 49.5 | 100.0% | 35.0% |
| S2 W3 | 20 | -$149k | $17k | 566 | 5.90 | 46.4 | 49.6 | 100.0% | 25.0% |
| S2 W4 | 20 | -$161k | -$12k | 561 | 5.25 | 46.4 | 49.6 | 100.0% | 25.0% |
| S2 W5 | 20 | -$146k | $15k | 578 | 6.55 | 46.5 | 49.6 | 100.0% | 45.0% |
| S2 W6 | 20 | -$159k | -$12k | 566 | 4.95 | 46.5 | 49.7 | 100.0% | 20.0% |
| S2 W7 | 20 | -$144k | $15k | 574 | 5.45 | 46.4 | 49.7 | 100.0% | 25.0% |
| S2 W8 | 20 | -$156k | -$12k | 585 | 6.25 | 46.4 | 49.7 | 100.0% | 40.0% |
| S2 W9 | 20 | -$142k | $15k | 580 | 5.40 | 46.4 | 49.7 | 100.0% | 35.0% |
| S2 W10 | 20 | -$154k | -$12k | 585 | 6.25 | 46.5 | 49.8 | 100.0% | 50.0% |
| S2 W11 | 20 | -$139k | $15k | 581 | 5.40 | 46.5 | 49.8 | 100.0% | 30.0% |
| S2 W12 | 20 | -$151k | -$12k | 580 | 6.20 | 46.5 | 49.9 | 100.0% | 40.0% |
| S2 W13 | 20 | -$137k | $14k | 581 | 5.80 | 46.5 | 49.8 | 100.0% | 35.0% |
| S2 W14 | 20 | -$149k | -$13k | 582 | 6.10 | 46.5 | 49.9 | 100.0% | 30.0% |
| S2 W15 | 20 | -$132k | $18k | 592 | 5.40 | 46.6 | 49.9 | 95.0% | 30.0% |
| S2 W16 | 20 | -$144k | -$12k | 593 | 5.45 | 46.6 | 49.9 | 100.0% | 40.0% |
| S2 W17 | 20 | -$128k | $16k | 591 | 6.45 | 46.6 | 50.0 | 95.0% | 25.0% |
| S2 W18 | 20 | -$140k | -$12k | 588 | 5.55 | 46.7 | 50.2 | 95.0% | 20.0% |
| S2 W19 | 20 | -$127k | $13k | 595 | 6.30 | 46.7 | 50.2 | 95.0% | 40.0% |
| S2 W20 | 20 | -$140k | -$13k | 587 | 5.50 | 46.8 | 50.3 | 95.0% | 35.0% |
| S2 W21 | 20 | -$124k | $16k | 599 | 6.60 | 46.9 | 50.4 | 95.0% | 35.0% |
| S2 W22 | 20 | -$137k | -$13k | 593 | 5.55 | 47.1 | 50.6 | 100.0% | 30.0% |
| S2 W23 | 20 | -$123k | $14k | 586 | 5.85 | 47.0 | 50.7 | 90.0% | 15.0% |
| S2 W24 | 20 | -$135k | -$12k | 584 | 5.35 | 47.2 | 50.8 | 100.0% | 25.0% |
| S2 W25 final | 20 | -$146k | -$10k | 173 | 2.05 | 47.2 | 50.8 | 100.0% | 0.0% |
| S2 W26 final | 20 | -$157k | -$12k | 133 | 1.00 | 47.2 | 50.9 | 100.0% | n/a |
| S2 W27 final | 20 | -$170k | -$13k | 131 | 2.15 | 47.6 | 50.7 | 100.0% | n/a |
| S3 trial 1 | 4 | -$54k | -$8.6k | 516 | 3.75 | 49.1 | 53.8 | 100.0% | 0.0% |
| S3 trial 2 | 4 | -$64k | -$9.9k | 558 | 5.25 | 49.1 | 53.9 | 100.0% | 75.0% |
| S3 W1 | 4 | -$44k | $19k | 528 | 5.50 | 49.2 | 54.0 | 100.0% | 50.0% |
| S3 W2 | 4 | -$58k | -$14k | 526 | 4.75 | 49.2 | 54.1 | 100.0% | 25.0% |
| S3 W3 | 4 | -$37k | $22k | 530 | 5.00 | 49.3 | 54.1 | 100.0% | 75.0% |
| S3 W4 | 4 | -$50k | -$13k | 536 | 6.25 | 49.4 | 54.2 | 100.0% | 50.0% |
| S3 W5 | 4 | -$28k | $22k | 528 | 5.25 | 49.4 | 54.3 | 100.0% | 0.0% |
| S3 W6 | 4 | -$41k | -$13k | 545 | 5.00 | 49.5 | 54.4 | 100.0% | 50.0% |
| S3 W7 | 4 | -$19k | $22k | 508 | 4.75 | 49.6 | 54.5 | 100.0% | 25.0% |
| S3 W8 | 4 | -$33k | -$14k | 526 | 6.25 | 49.6 | 54.6 | 100.0% | 50.0% |
| S3 W9 | 4 | -$14k | $19k | 538 | 3.25 | 49.7 | 54.6 | 75.0% | 25.0% |
| S3 W10 | 4 | -$28k | -$14k | 543 | 8.50 | 49.8 | 54.7 | 100.0% | 75.0% |
| S3 W11 | 4 | -$5.9k | $22k | 524 | 2.75 | 49.9 | 54.9 | 75.0% | 25.0% |
| S3 W12 | 4 | -$24k | -$18k | 538 | 6.50 | 50.0 | 55.0 | 100.0% | 75.0% |
| S3 W13 | 4 | -$3.6k | $20k | 529 | 5.00 | 49.8 | 55.1 | 50.0% | 0.0% |
| S3 W14 | 4 | -$20k | -$17k | 509 | 5.50 | 49.8 | 55.2 | 100.0% | 0.0% |
| S3 W15 | 4 | $3.2k | $23k | 551 | 5.00 | 49.8 | 55.2 | 50.0% | 50.0% |
| S3 W16 | 4 | -$15k | -$18k | 512 | 4.50 | 49.6 | 55.3 | 100.0% | 25.0% |
| S3 W17 | 4 | $2.5k | $18k | 549 | 5.75 | 49.6 | 55.4 | 50.0% | 75.0% |
| S3 W18 | 4 | -$14k | -$17k | 566 | 5.75 | 49.3 | 55.5 | 100.0% | 25.0% |
| S3 W19 | 4 | $5.4k | $19k | 535 | 6.25 | 49.4 | 55.5 | 50.0% | 25.0% |
| S3 W20 | 4 | -$16k | -$21k | 524 | 4.25 | 49.5 | 55.8 | 100.0% | 25.0% |
| S3 W21 | 4 | $3.8k | $20k | 518 | 6.00 | 49.8 | 55.9 | 50.0% | 25.0% |
| S3 W22 | 4 | -$14k | -$18k | 547 | 4.50 | 49.9 | 56.0 | 100.0% | 75.0% |
| S3 W23 | 4 | $6.5k | $20k | 524 | 5.50 | 49.9 | 56.1 | 0.0% | 0.0% |
| S3 W24 | 4 | -$14k | -$21k | 513 | 5.25 | 50.1 | 56.3 | 100.0% | 25.0% |
| S3 W25 final | 4 | -$8.7k | $5.4k | 223 | 3.00 | 50.4 | 56.4 | 75.0% | 100.0% |
| S3 W26 final | 4 | -$26k | -$18k | 220 | 0.75 | 50.1 | 56.4 | 100.0% | 100.0% |
| S3 W27 final | 4 | -$3.1k | $23k | 225 | 2.25 | 51.3 | 56.4 | 75.0% | 100.0% |
| S4 trial 1 | 1 | $147k | -$29k | 450 | 5.00 | 50.2 | 56.4 | 0.0% | 100.0% |
| S4 trial 2 | 1 | $118k | -$29k | 471 | 3.00 | 50.6 | 56.5 | 0.0% | 100.0% |
| S4 W1 | 1 | $95k | -$23k | 448 | 5.00 | 50.7 | 56.6 | 0.0% | 0.0% |
| S4 W2 | 1 | $64k | -$31k | 459 | 3.00 | 50.7 | 56.7 | 0.0% | 0.0% |
| S4 W3 | 1 | $76k | $12k | 454 | 4.00 | 50.1 | 56.7 | 0.0% | 0.0% |
| S4 W4 | 1 | $49k | -$27k | 476 | 5.00 | 49.5 | 56.8 | 0.0% | 0.0% |
| S4 W5 | 1 | $32k | -$17k | 476 | 5.00 | 50.2 | 58.5 | 0.0% | 0.0% |
| S4 W6 | 1 | -$7.1k | -$39k | 515 | 8.00 | 50.6 | 59.5 | 100.0% | 100.0% |
| S4 W7 | 1 | $10k | $18k | 495 | 4.00 | 51.3 | 59.5 | 0.0% | 100.0% |
| S4 W8 | 1 | -$19k | -$29k | 425 | 5.00 | 50.6 | 59.6 | 100.0% | 0.0% |
| S4 W9 | 1 | $1.1k | $20k | 430 | 0.00 | 50.6 | 59.6 | 0.0% | 0.0% |
| S4 W10 | 1 | -$22k | -$23k | 417 | 6.00 | 51.3 | 59.7 | 100.0% | 0.0% |
| S4 W11 | 1 | -$1.8k | $20k | 476 | 3.00 | 52.0 | 59.7 | 100.0% | 100.0% |
| S4 W12 | 1 | -$23k | -$21k | 494 | 6.00 | 52.8 | 59.8 | 100.0% | 100.0% |
| S4 W13 | 1 | $5.5k | $29k | 543 | 5.00 | 53.5 | 59.9 | 0.0% | 100.0% |
| S4 W14 | 1 | -$19k | -$25k | 459 | 6.00 | 52.9 | 60.1 | 100.0% | 0.0% |
| S4 W15 | 1 | $2.2k | $22k | 480 | 3.00 | 53.7 | 60.2 | 0.0% | 100.0% |
| S4 W16 | 1 | -$17k | -$19k | 473 | 6.00 | 53.8 | 60.3 | 100.0% | 100.0% |
| S4 W17 | 1 | $6.5k | $23k | 483 | 3.00 | 53.8 | 60.3 | 0.0% | 100.0% |
| S4 W18 | 1 | -$18k | -$25k | 470 | 8.00 | 53.1 | 60.4 | 100.0% | 100.0% |
| S4 W19 | 1 | $1.9k | $20k | 513 | 3.00 | 53.2 | 60.5 | 0.0% | 100.0% |
| S4 W20 | 1 | -$18k | -$20k | 523 | 6.00 | 53.2 | 60.5 | 100.0% | 100.0% |
| S4 W21 | 1 | $4.4k | $22k | 517 | 4.00 | 53.2 | 60.6 | 0.0% | 100.0% |
| S4 W22 | 1 | -$16k | -$20k | 481 | 6.00 | 54.1 | 60.9 | 100.0% | 0.0% |
| S4 W23 | 1 | $17k | $33k | 501 | 3.00 | 54.2 | 60.9 | 0.0% | 0.0% |
| S4 W24 | 1 | -$16k | -$33k | 493 | 6.00 | 54.6 | 61.0 | 100.0% | 100.0% |
| S4 W25 final | 1 | $15k | $31k | 434 | 2.00 | 54.6 | 61.0 | 0.0% | 0.0% |
| S4 W26 final | 1 | -$13k | -$28k | 111 | 4.00 | 54.5 | 61.5 | 100.0% | n/a |
| S4 W27 final | 1 | -$29k | -$16k | 108 | 1.00 | 55.2 | 61.5 | 100.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| expansive × slide | 79 | 43.0% | 1015 | 42.2% | 0.8% |  |
| grind × compressed | 997 | 42.5% | 97 | 40.2% | 2.3% |  |
| kick-chase × slide | 18 | 27.8% | 1076 | 42.5% | -14.7% |  |
| block-play | 145 | 43.4% | 949 | 42.1% | 1.4% |  |
| block-shift | 192 | 40.9% | 902 | 42.6% | -1.7% |  |
| chip-chase | 122 | 45.1% | 972 | 41.9% | 3.2% |  |
| cut-out-winger | 144 | 40.3% | 950 | 42.6% | -2.3% |  |
| inside-ball | 145 | 43.4% | 949 | 42.1% | 1.4% |  |
| kick-pass | 122 | 45.1% | 972 | 41.9% | 3.2% |  |
| long-ball | 25 | 56.0% | 1069 | 42.0% | 14.0% |  |
| second-man | 192 | 40.9% | 902 | 42.6% | -1.7% |  |
| short-side-raid | 192 | 42.2% | 902 | 42.3% | -0.1% |  |
| tap-rambo | 25 | 56.0% | 1069 | 42.0% | 14.0% |  |

### casual-weekly/easy/au

- 70 overall (best nine, including recruitment): 80.8 weeks; 18 reached, 2 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 224 of 400; median 31.0 weeks among those who did.
- Reaching potential stars: 253 of 400 (100 already there at week 0); median 33.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/379; S3 29/337; S5 78/277.
- Mean XP per completed season 18329; mean level-ups per completed season 180.9.
- Cash: opening 300000; mean weekly change -34; mean weeks in debt 5.8.
- Bankruptcy warnings: 115; forced sales: 2; sacked with missed solvency objective: 2.
- Save round-trips: 97; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- No balance flag on the thresholds above.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -566764 |
| upkeep | -2315 |
| overhead | -50855 |
| sponsor | 0 |
| grant | 66071 |
| gate | 518451 |
| prize | 51351 |
| boardGrant | 19015 |
| events | -14950 |
| transfers | -6516 |
| contracts | -12819 |
| facilities | -1649 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 4 strength 1, stamina 1, kicking 1, footyIQ 1 | $281k | -$19k | 905 | 4 | 53.2 | D 4-4 Dubbo Diggers |
| S1 trial 2 | balanced | 8 strength 2, stamina 3, handling 1, kicking 1, footyIQ 1 | $264k | -$17k | 1044 | 8 | 53.3 | W 23-6 Wagga Swagmen |
| S1 W1 | balanced | 8 strength 3, stamina 1, kicking 1, footyIQ 3 | $271k | $7.1k | 948 | 8 | 53.3 | D 4-4 Launceston Larrikins |
| S1 W2 | balanced | 11 strength 3, stamina 2, handling 2, kicking 1, footyIQ 3 | $256k | -$15k | 1025 | 11 | 53.5 | W 10-0 Darwin Drovers |
| S1 W3 | balanced | 7 strength 2, stamina 1, handling 1, footyIQ 3 | $266k | $10k | 996 | 7 | 53.5 | W 16-4 Southport Stingrays |
| S1 W4 | balanced | 11 speed 3, strength 2, kicking 1, footyIQ 5 | $249k | -$17k | 896 | 11 | 53.6 | D 0-0 Broken Hill Brollys |
| S1 W5 | balanced | 10 strength 3, stamina 3, handling 1, kicking 1, footyIQ 2 | $258k | $9.5k | 930 | 10 | 53.7 | L 10-12 Geelong Gulls |
| S1 W6 | balanced | 8 speed 2, strength 2, kicking 1, footyIQ 3 | $241k | -$17k | 958 | 8 | 53.8 | W 6-4 Wagga Swagmen |
| S1 W7 | balanced | 11 speed 4, strength 3, stamina 1, kicking 1, footyIQ 2 | $256k | $15k | 1047 | 11 | 53.9 | W 14-0 Katherine Crocs |
| S1 W8 | balanced | 9 speed 1, strength 3, stamina 2, handling 2, footyIQ 1 | $239k | -$17k | 1029 | 9 | 54.0 | W 14-4 Shellharbour Scorpions |
| S1 W9 | balanced | 9 speed 5, strength 1, kicking 2, footyIQ 1 | $254k | $15k | 922 | 9 | 54.1 | L 4-12 Dubbo Diggers |
| S1 W10 | balanced | 10 speed 1, strength 1, stamina 1, handling 2, footyIQ 5 | $237k | -$17k | 984 | 10 | 54.2 | W 11-6 Mackay Marlins |
| S1 W11 | balanced | 11 speed 4, strength 1, stamina 1, handling 1, kicking 1, footyIQ 3 | $183k | -$54k | 946 | 11 | 55.0 | W 1-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 strength 3, stamina 1, kicking 1, footyIQ 2 | $165k | -$19k | 893 | 7 | 55.1 | L 0-7 Cairns Cyclones |
| S1 W13 | balanced | 11 speed 3, strength 4, stamina 1, handling 1, footyIQ 2 | $177k | $12k | 915 | 11 | 55.2 | L 0-1 Toowoomba Thunder |
| S1 W14 | balanced | 10 speed 2, strength 1, stamina 2, handling 2, kicking 2, footyIQ 1 | $158k | -$19k | 1018 | 10 | 55.3 | W 8-0 Woolloomooloo Wolves |
| S1 W15 | balanced | 9 speed 2, strength 1, stamina 1, kicking 1, footyIQ 4 | $166k | $7.8k | 992 | 9 | 55.4 | W 12-6 Redcliffe Reapers |
| S1 W16 | balanced | 10 speed 2, strength 3, handling 1, footyIQ 4 | $147k | -$19k | 958 | 10 | 55.5 | D 0-0 Launceston Larrikins |
| S1 W17 | balanced | 10 speed 1, strength 1, stamina 4, handling 2, kicking 1, footyIQ 1 | $152k | $5.7k | 1040 | 10 | 55.5 | W 18-12 Darwin Drovers |
| S1 W18 | balanced | 9 speed 3, strength 2, handling 1, kicking 1, footyIQ 2 | $133k | -$19k | 1063 | 9 | 55.6 | W 16-4 Southport Stingrays |
| S1 W19 | balanced | 11 speed 4, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $144k | $11k | 1027 | 11 | 55.7 | W 18-6 Broken Hill Brollys |
| S1 W20 | balanced | 11 speed 2, strength 2, stamina 1, handling 1, footyIQ 5 | $125k | -$19k | 982 | 11 | 55.8 | W 6-4 Geelong Gulls |
| S1 W21 | balanced | 8 speed 2, strength 1, stamina 1, kicking 1, footyIQ 3 | $141k | $17k | 998 | 8 | 55.9 | W 14-6 Wagga Swagmen |
| S1 W22 | balanced | 11 speed 2, strength 2, stamina 2, handling 2, kicking 1, footyIQ 2 | $122k | -$19k | 1014 | 11 | 56.0 | W 8-6 Katherine Crocs |
| S1 W23 | balanced | 11 speed 4, strength 1, stamina 3, handling 1, footyIQ 2 | $140k | $18k | 1031 | 11 | 56.1 | W 16-10 Shellharbour Scorpions |
| S1 W24 | balanced | 8 speed 3, strength 1, handling 1, kicking 1, footyIQ 2 | $121k | -$19k | 915 | 8 | 56.2 | L 0-10 Dubbo Diggers |
| S1 W25 final | balanced | 10 speed 1, strength 3, stamina 1, handling 1, footyIQ 4 | $142k | $21k | 918 | 10 | 56.3 | L 0-10 Toowoomba Thunder |
| S1 W26 final | balanced | 2 handling 1, kicking 1 | $123k | -$19k | 236 | 2 | 56.3 | no match |
| S1 W27 final | balanced | 2 strength 1, footyIQ 1 | $149k | $26k | 233 | 2 | 56.8 | no match |
| S2 trial 1 | balanced | 9 speed 1, strength 1, stamina 2, handling 1, kicking 1, footyIQ 3 | $132k | -$18k | 969 | 9 | 56.9 | W 21-6 Darwin Drovers |
| S2 trial 2 | balanced | 10 speed 5, strength 1, stamina 1, footyIQ 3 | $121k | -$10k | 816 | 10 | 57.0 | D 4-4 Shellharbour Scorpions |
| S2 W1 | balanced | 9 speed 3, strength 1, handling 2, kicking 1, footyIQ 2 | $134k | $13k | 882 | 9 | 57.1 | W 10-0 Launceston Larrikins |
| S2 W2 | balanced | 6 strength 2, stamina 1, kicking 1, footyIQ 2 | $117k | -$18k | 812 | 6 | 57.1 | L 6-8 Darwin Drovers |
| S2 W3 | balanced | 9 speed 3, strength 1, stamina 2, handling 2, footyIQ 1 | $136k | $19k | 820 | 9 | 57.2 | D 6-6 Southport Stingrays |
| S2 W4 | balanced | 9 speed 2, strength 2, handling 3, footyIQ 2 | $118k | -$18k | 936 | 9 | 57.3 | D 16-16 Broken Hill Brollys |
| S2 W5 | balanced | 7 speed 1, strength 2, stamina 1, kicking 2, footyIQ 1 | $131k | $13k | 830 | 7 | 57.4 | D 4-4 Geelong Gulls |
| S2 W6 | balanced | 12 speed 5, strength 2, stamina 2, footyIQ 3 | $113k | -$18k | 798 | 12 | 57.5 | L 0-4 Wagga Swagmen |
| S2 W7 | balanced | 9 speed 3, stamina 1, handling 2, footyIQ 3 | $132k | $19k | 926 | 9 | 57.6 | W 12-0 Katherine Crocs |
| S2 W8 | balanced | 9 speed 1, strength 2, stamina 3, kicking 2, footyIQ 1 | $114k | -$18k | 892 | 9 | 57.6 | W 12-7 Shellharbour Scorpions |
| S2 W9 | balanced | 7 speed 3, stamina 1, footyIQ 3 | $136k | $22k | 868 | 7 | 57.7 | W 8-4 Dubbo Diggers |
| S2 W10 | balanced | 11 speed 3, strength 1, handling 3, footyIQ 4 | $118k | -$18k | 808 | 11 | 57.8 | L 0-8 Mackay Marlins |
| S2 W11 | balanced | 6 strength 2, stamina 1, kicking 2, footyIQ 1 | $133k | $15k | 907 | 6 | 57.9 | W 6-0 Ballarat Bushrangers |
| S2 W12 | balanced | 9 speed 3, strength 2, stamina 2, footyIQ 2 | $110k | -$24k | 845 | 9 | 58.0 | D 0-0 Cairns Cyclones |
| S2 W13 | balanced | 12 speed 4, strength 1, stamina 1, handling 3, footyIQ 3 | $132k | $23k | 952 | 12 | 58.1 | W 24-7 Toowoomba Thunder |
| S2 W14 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $116k | -$16k | 906 | 6 | 58.1 | W 16-0 Woolloomooloo Wolves |
| S2 W15 | balanced | 9 speed 3, strength 2, stamina 1, kicking 1, footyIQ 2 | $133k | $17k | 863 | 9 | 58.2 | D 6-6 Redcliffe Reapers |
| S2 W16 | balanced | 10 speed 2, strength 2, stamina 1, handling 3, footyIQ 2 | $117k | -$16k | 899 | 10 | 58.3 | W 16-6 Launceston Larrikins |
| S2 W17 | balanced | 8 speed 2, stamina 1, handling 2, kicking 1, footyIQ 2 | $137k | $20k | 866 | 8 | 58.4 | W 14-7 Darwin Drovers |
| S2 W18 | balanced | 9 speed 2, strength 3, stamina 1, kicking 1, footyIQ 2 | $119k | -$18k | 962 | 9 | 58.5 | W 24-0 Southport Stingrays |
| S2 W19 | balanced | 11 speed 1, strength 4, stamina 2, handling 1, footyIQ 3 | $142k | $23k | 788 | 11 | 58.6 | D 0-0 Broken Hill Brollys |
| S2 W20 | balanced | 6 speed 2, strength 1, stamina 1, kicking 1, footyIQ 1 | $124k | -$18k | 848 | 6 | 58.6 | L 10-11 Geelong Gulls |
| S2 W21 | balanced | 9 speed 3, strength 1, handling 1, footyIQ 4 | $146k | $23k | 807 | 9 | 58.7 | W 6-4 Wagga Swagmen |
| S2 W22 | balanced | 9 speed 2, strength 1, stamina 2, handling 1, kicking 1, footyIQ 2 | $129k | -$18k | 906 | 9 | 58.8 | W 12-6 Katherine Crocs |
| S2 W23 | balanced | 8 speed 2, strength 1, stamina 2, kicking 1, footyIQ 2 | $148k | $20k | 926 | 8 | 58.9 | W 16-0 Shellharbour Scorpions |
| S2 W24 | balanced | 8 speed 2, strength 1, stamina 2, handling 2, footyIQ 1 | $121k | -$27k | 841 | 8 | 59.0 | L 4-7 Dubbo Diggers |
| S2 W25 final | balanced | 8 speed 3, stamina 1, handling 2, kicking 1, footyIQ 1 | $144k | $22k | 811 | 8 | 59.0 | L 0-14 Toowoomba Thunder |
| S2 W26 final | balanced | 1 footyIQ 1 | $125k | -$18k | 214 | 1 | 59.0 | no match |
| S2 W27 final | balanced | 1 footyIQ 1 | $136k | $11k | 208 | 1 | 60.7 | no match |
| S3 trial 1 | balanced | 8 speed 2, strength 3, stamina 1, kicking 1, footyIQ 1 | $129k | -$7.4k | 747 | 8 | 60.8 | W 7-0 Shellharbour Scorpions |
| S3 trial 2 | balanced | 9 speed 1, strength 1, stamina 1, handling 4, kicking 1, footyIQ 1 | $112k | -$17k | 820 | 9 | 60.9 | W 22-4 Katherine Crocs |
| S3 W1 | balanced | 12 speed 4, strength 1, stamina 1, handling 1, kicking 1, footyIQ 4 | $133k | $21k | 728 | 12 | 61.0 | D 6-6 Launceston Larrikins |
| S3 W2 | balanced | 5 speed 3, footyIQ 2 | $116k | -$17k | 782 | 6 | 61.1 | W 16-12 Darwin Drovers |
| S3 W3 | balanced | 5 speed 2, strength 1, stamina 1, handling 1 | $139k | $23k | 752 | 6 | 61.1 | W 10-0 Southport Stingrays |
| S3 W4 | balanced | 7 stamina 1, handling 2, kicking 1, footyIQ 3 | $123k | -$17k | 777 | 8 | 61.2 | W 20-11 Broken Hill Brollys |
| S3 W5 | balanced | 4 speed 1, kicking 1, footyIQ 2 | $148k | $25k | 678 | 5 | 61.3 | L 0-6 Geelong Gulls |
| S3 W6 | balanced | 8 speed 1, strength 4, handling 1, footyIQ 2 | $130k | -$17k | 776 | 9 | 61.3 | W 19-18 Wagga Swagmen |
| S3 W7 | balanced | 7 speed 1, strength 1, stamina 2, handling 1, kicking 2 | $154k | $23k | 806 | 9 | 61.4 | W 26-10 Katherine Crocs |
| S3 W8 | balanced | 6 speed 2, footyIQ 4 | $137k | -$17k | 777 | 7 | 61.5 | W 19-0 Shellharbour Scorpions |
| S3 W9 | balanced | 7 speed 4, handling 1, footyIQ 2 | $160k | $23k | 822 | 8 | 61.6 | W 26-6 Dubbo Diggers |
| S3 W10 | balanced | 6 speed 1, handling 2, kicking 2, footyIQ 1 | $143k | -$17k | 783 | 7 | 61.6 | W 19-6 Mackay Marlins |
| S3 W11 | balanced | 7 speed 1, strength 2, stamina 2, footyIQ 2 | $166k | $23k | 794 | 8 | 61.7 | W 12-7 Ballarat Bushrangers |
| S3 W12 | balanced | 7 speed 1, stamina 2, handling 4 | $149k | -$17k | 771 | 8 | 61.8 | W 22-0 Cairns Cyclones |
| S3 W13 | balanced | 8 speed 2, strength 2, stamina 1, kicking 2, footyIQ 1 | $172k | $23k | 797 | 9 | 61.9 | W 24-16 Toowoomba Thunder |
| S3 W14 | balanced | 5 speed 3, footyIQ 2 | $147k | -$25k | 850 | 7 | 61.9 | W 30-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 7 speed 2, strength 2, handling 1, footyIQ 2 | $170k | $23k | 681 | 8 | 62.0 | L 0-29 Redcliffe Reapers |
| S3 W16 | balanced | 8 speed 1, strength 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $150k | -$20k | 783 | 9 | 62.1 | W 6-4 Launceston Larrikins |
| S3 W17 | balanced | 7 speed 2, strength 2, kicking 1, footyIQ 2 | $174k | $23k | 707 | 8 | 62.2 | D 4-4 Darwin Drovers |
| S3 W18 | balanced | 7 speed 4, handling 2, footyIQ 1 | $156k | -$17k | 699 | 8 | 62.2 | L 6-8 Southport Stingrays |
| S3 W19 | balanced | 4 stamina 1, handling 2, kicking 1 | $170k | $13k | 741 | 5 | 62.3 | W 12-0 Broken Hill Brollys |
| S3 W20 | balanced | 4 speed 1, kicking 1, footyIQ 2 | $153k | -$17k | 708 | 6 | 62.3 | W 16-12 Geelong Gulls |
| S3 W21 | balanced | 6 speed 1, strength 1, handling 1, footyIQ 3 | $176k | $23k | 744 | 9 | 62.4 | W 11-10 Wagga Swagmen |
| S3 W22 | balanced | 5 speed 2, strength 1, footyIQ 2 | $157k | -$19k | 763 | 7 | 62.4 | W 12-4 Katherine Crocs |
| S3 W23 | balanced | 6 strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $180k | $23k | 867 | 10 | 62.5 | W 28-14 Shellharbour Scorpions |
| S3 W24 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $133k | -$47k | 785 | 6 | 62.5 | W 16-12 Dubbo Diggers |
| S3 W25 final | balanced | 4 speed 2, strength 1, handling 1 | $149k | $16k | 795 | 7 | 62.5 | W 12-4 Toowoomba Thunder |
| S3 W26 final | balanced | 7 speed 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $165k | $16k | 725 | 10 | 62.6 | D 1-1 Ballarat Bushrangers |
| S3 W27 final | balanced | 3 strength 1, footyIQ 2 | $330k | $165k | 775 | 6 | 65.0 | W 21-6 Southport Stingrays |
| S4 trial 1 | balanced | 7 speed 1, strength 2, stamina 2, footyIQ 1 | $318k | -$12k | 798 | 8 | 65.1 | W 38-0 Geelong Gulls |
| S4 trial 2 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $296k | -$22k | 751 | 8 | 65.1 | W 29-10 Toowoomba Thunder |
| S4 W1 | balanced | 5 speed 1, kicking 1, footyIQ 2 | $314k | $18k | 711 | 6 | 65.2 | W 19-6 Launceston Larrikins |
| S4 W2 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 1 | $292k | -$22k | 699 | 8 | 65.2 | W 10-8 Darwin Drovers |
| S4 W3 | balanced | 2 speed 1, handling 1 | $310k | $18k | 746 | 6 | 65.3 | W 23-0 Southport Stingrays |
| S4 W4 | balanced | 4 speed 1, stamina 1, handling 2 | $288k | -$22k | 704 | 9 | 65.3 | W 19-4 Broken Hill Brollys |
| S4 W5 | balanced | 1 footyIQ 1 | $307k | $18k | 695 | 5 | 65.3 | W 12-0 Geelong Gulls |
| S4 W6 | balanced | 4 strength 2, footyIQ 2 | $285k | -$22k | 719 | 8 | 65.3 | W 12-4 Wagga Swagmen |
| S4 W7 | balanced | 3 strength 2, handling 1 | $306k | $21k | 742 | 7 | 65.4 | W 16-6 Katherine Crocs |
| S4 W8 | balanced | 2 speed 1, footyIQ 1 | $284k | -$22k | 715 | 6 | 65.4 | W 12-8 Shellharbour Scorpions |
| S4 W9 | balanced | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $302k | $18k | 768 | 12 | 65.5 | W 21-6 Dubbo Diggers |
| S4 W10 | balanced | 2 speed 1, footyIQ 1 | $280k | -$22k | 661 | 5 | 65.5 | L 6-18 Mackay Marlins |
| S4 W11 | balanced | 3 speed 1, stamina 1, handling 1 | $299k | $18k | 686 | 6 | 65.5 | W 8-0 Ballarat Bushrangers |
| S4 W12 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $277k | -$22k | 710 | 9 | 65.5 | W 18-10 Cairns Cyclones |
| S4 W13 | balanced | 3 speed 1, strength 2 | $295k | $18k | 677 | 7 | 65.6 | W 4-0 Toowoomba Thunder |
| S4 W14 | balanced | 0 | $274k | -$22k | 736 | 4 | 65.6 | W 20-4 Woolloomooloo Wolves |
| S4 W15 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 2 | $292k | $18k | 683 | 9 | 65.6 | W 6-4 Redcliffe Reapers |
| S4 W16 | balanced | 4 speed 3, handling 1 | $270k | -$22k | 681 | 8 | 65.7 | W 16-10 Launceston Larrikins |
| S4 W17 | balanced | 1 stamina 1 | $289k | $18k | 679 | 5 | 65.7 | W 8-6 Darwin Drovers |
| S4 W18 | balanced | 4 strength 1, handling 1, footyIQ 2 | $252k | -$37k | 637 | 7 | 65.7 | L 0-8 Southport Stingrays |
| S4 W19 | balanced | 2 strength 2 | $268k | $16k | 671 | 6 | 65.7 | W 6-0 Broken Hill Brollys |
| S4 W20 | balanced | 2 strength 2 | $244k | -$24k | 742 | 6 | 65.7 | W 16-4 Geelong Gulls |
| S4 W21 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $260k | $16k | 642 | 8 | 65.8 | L 4-6 Wagga Swagmen |
| S4 W22 | balanced | 4 speed 1, strength 1, footyIQ 2 | $236k | -$24k | 719 | 7 | 65.8 | W 11-10 Katherine Crocs |
| S4 W23 | balanced | 2 speed 1, stamina 1 | $247k | $10k | 636 | 7 | 65.8 | L 6-8 Shellharbour Scorpions |
| S4 W24 | balanced | 5 speed 2, stamina 2, footyIQ 1 | $223k | -$24k | 689 | 7 | 65.9 | W 10-0 Dubbo Diggers |
| S4 W25 final | balanced | 3 speed 1, stamina 1, handling 1 | $239k | $16k | 728 | 7 | 65.9 | W 18-0 Launceston Larrikins |
| S4 W26 final | balanced | 1 strength 1 | $250k | $11k | 713 | 6 | 65.9 | W 22-12 Shellharbour Scorpions |
| S4 W27 final | balanced | 5 speed 1, strength 1, stamina 1, handling 2 | $406k | $156k | 704 | 8 | 67.0 | W 17-12 Redcliffe Reapers |
| S5 trial 1 | balanced | 2 speed 2 | $383k | -$23k | 654 | 7 | 67.0 | W 17-11 Dubbo Diggers |
| S5 trial 2 | balanced | 3 handling 1, footyIQ 2 | $346k | -$37k | 683 | 5 | 67.0 | W 24-4 Mackay Marlins |
| S5 W1 | balanced | 4 speed 1, strength 1, footyIQ 2 | $362k | $16k | 642 | 7 | 67.1 | W 10-4 Launceston Larrikins |
| S5 W2 | balanced | 2 speed 1, strength 1 | $337k | -$25k | 640 | 6 | 67.1 | W 10-0 Darwin Drovers |
| S5 W3 | balanced | 2 strength 1, stamina 1 | $353k | $16k | 646 | 6 | 67.1 | W 10-4 Southport Stingrays |
| S5 W4 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 2 | $329k | -$25k | 691 | 10 | 67.1 | W 28-10 Broken Hill Brollys |
| S5 W5 | balanced | 2 speed 1, strength 1 | $287k | -$42k | 608 | 5 | 67.1 | L 4-10 Geelong Gulls |
| S5 W6 | balanced | 1 speed 1 | $261k | -$26k | 657 | 5 | 67.0 | W 10-5 Wagga Swagmen |
| S5 W7 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $276k | $15k | 697 | 8 | 67.1 | W 25-6 Katherine Crocs |
| S5 W8 | balanced | 3 speed 1, strength 1, footyIQ 1 | $250k | -$26k | 609 | 6 | 67.1 | L 8-12 Shellharbour Scorpions |
| S5 W9 | balanced | 2 speed 1, strength 1 | $270k | $20k | 598 | 5 | 67.1 | L 4-6 Dubbo Diggers |
| S5 W10 | balanced | 4 speed 1, stamina 2, handling 1 | $245k | -$26k | 673 | 7 | 67.1 | W 18-5 Mackay Marlins |
| S5 W11 | balanced | 3 speed 1, stamina 1, handling 1 | $259k | $15k | 659 | 6 | 67.2 | W 16-4 Ballarat Bushrangers |
| S5 W12 | balanced | 1 strength 1 | $234k | -$26k | 728 | 6 | 67.1 | W 39-4 Cairns Cyclones |
| S5 W13 | balanced | 5 speed 1, strength 2, footyIQ 2 | $248k | $15k | 648 | 7 | 67.2 | W 17-8 Toowoomba Thunder |
| S5 W14 | balanced | 4 speed 1, footyIQ 3 | $223k | -$26k | 654 | 8 | 67.2 | W 23-6 Woolloomooloo Wolves |
| S5 W15 | balanced | 2 speed 2 | $237k | $15k | 664 | 7 | 67.2 | D 14-14 Redcliffe Reapers |
| S5 W16 | balanced | 5 speed 2, strength 2, footyIQ 1 | $212k | -$26k | 660 | 9 | 67.3 | W 12-10 Launceston Larrikins |
| S5 W17 | balanced | 1 handling 1 | $230k | $18k | 690 | 5 | 67.3 | W 24-12 Darwin Drovers |
| S5 W18 | balanced | 1 stamina 1 | $170k | -$59k | 681 | 5 | 67.3 | W 29-4 Southport Stingrays |
| S5 W19 | balanced | 3 speed 1, strength 1, stamina 1 | $181k | $11k | 661 | 8 | 67.3 | W 12-0 Broken Hill Brollys |
| S5 W20 | balanced | 1 speed 1 | $152k | -$29k | 669 | 4 | 67.3 | W 16-0 Geelong Gulls |
| S5 W21 | balanced | 2 footyIQ 2 | $164k | $12k | 706 | 7 | 67.3 | W 29-10 Wagga Swagmen |
| S5 W22 | balanced | 4 speed 3, stamina 1 | $135k | -$29k | 658 | 9 | 67.3 | W 14-0 Katherine Crocs |
| S5 W23 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $153k | $18k | 675 | 8 | 67.3 | W 18-0 Shellharbour Scorpions |
| S5 W24 | balanced | 1 stamina 1 | $124k | -$29k | 587 | 6 | 67.3 | L 0-1 Dubbo Diggers |
| S5 W25 final | balanced | 2 handling 1, footyIQ 1 | $135k | $11k | 636 | 6 | 67.3 | W 8-7 Geelong Gulls |
| S5 W26 final | balanced | 2 speed 1, strength 1 | $145k | $10k | 582 | 4 | 67.3 | L 0-1 Wagga Swagmen |
| S5 W27 final | balanced | 1 strength 1 | $158k | $12k | 153 | 1 | 67.3 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $279k | -$21k | 704 | 1.50 | 53.3 | 59.0 | 0.0% | 55.0% |
| S1 trial 2 | 20 | $264k | -$16k | 714 | 5.85 | 53.3 | 59.1 | 0.0% | 45.0% |
| S1 W1 | 20 | $270k | $6.4k | 713 | 5.15 | 53.4 | 59.2 | 0.0% | 70.0% |
| S1 W2 | 20 | $252k | -$18k | 707 | 7.25 | 53.4 | 59.3 | 0.0% | 50.0% |
| S1 W3 | 20 | $263k | $11k | 712 | 5.40 | 53.5 | 59.4 | 0.0% | 50.0% |
| S1 W4 | 20 | $243k | -$20k | 711 | 6.25 | 53.5 | 59.6 | 0.0% | 55.0% |
| S1 W5 | 20 | $251k | $7.8k | 723 | 8.30 | 53.6 | 59.8 | 0.0% | 65.0% |
| S1 W6 | 20 | $230k | -$21k | 718 | 6.80 | 53.7 | 60.0 | 0.0% | 65.0% |
| S1 W7 | 20 | $240k | $10k | 720 | 6.65 | 53.8 | 60.2 | 0.0% | 55.0% |
| S1 W8 | 20 | $222k | -$18k | 723 | 8.70 | 53.9 | 60.3 | 0.0% | 60.0% |
| S1 W9 | 20 | $233k | $11k | 705 | 7.15 | 53.9 | 60.4 | 0.0% | 55.0% |
| S1 W10 | 20 | $216k | -$18k | 715 | 5.20 | 54.0 | 60.5 | 0.0% | 55.0% |
| S1 W11 | 20 | $218k | $2.9k | 716 | 9.15 | 54.1 | 60.7 | 0.0% | 75.0% |
| S1 W12 | 20 | $201k | -$17k | 715 | 5.75 | 54.1 | 60.8 | 0.0% | 55.0% |
| S1 W13 | 20 | $214k | $13k | 719 | 7.90 | 54.2 | 61.0 | 0.0% | 65.0% |
| S1 W14 | 20 | $196k | -$18k | 725 | 7.95 | 54.3 | 61.1 | 0.0% | 55.0% |
| S1 W15 | 20 | $209k | $13k | 709 | 6.35 | 54.3 | 61.2 | 0.0% | 40.0% |
| S1 W16 | 20 | $188k | -$21k | 726 | 5.80 | 54.4 | 61.4 | 0.0% | 60.0% |
| S1 W17 | 20 | $200k | $12k | 731 | 9.90 | 54.5 | 61.5 | 0.0% | 70.0% |
| S1 W18 | 20 | $181k | -$19k | 737 | 5.65 | 54.5 | 61.6 | 0.0% | 70.0% |
| S1 W19 | 20 | $190k | $9.4k | 731 | 7.70 | 54.6 | 61.8 | 0.0% | 70.0% |
| S1 W20 | 20 | $172k | -$18k | 713 | 7.70 | 54.6 | 61.9 | 0.0% | 45.0% |
| S1 W21 | 20 | $179k | $6.7k | 730 | 5.60 | 54.7 | 62.1 | 0.0% | 75.0% |
| S1 W22 | 20 | $160k | -$19k | 717 | 6.85 | 54.8 | 62.3 | 0.0% | 55.0% |
| S1 W23 | 20 | $166k | $5.8k | 740 | 8.65 | 54.9 | 62.5 | 0.0% | 75.0% |
| S1 W24 | 20 | $142k | -$24k | 725 | 6.35 | 54.9 | 62.7 | 0.0% | 45.0% |
| S1 W25 final | 20 | $148k | $6.6k | 705 | 6.35 | 55.0 | 62.8 | 0.0% | 63.2% |
| S1 W26 final | 20 | $141k | -$7.8k | 511 | 6.50 | 55.1 | 63.0 | 0.0% | 50.0% |
| S1 W27 final | 20 | $190k | $49k | 352 | 3.40 | 55.7 | 62.9 | 0.0% | 50.0% |
| S2 trial 1 | 20 | $175k | -$14k | 695 | 5.90 | 55.7 | 63.0 | 0.0% | 45.0% |
| S2 trial 2 | 20 | $164k | -$11k | 696 | 9.35 | 55.8 | 63.2 | 0.0% | 55.0% |
| S2 W1 | 20 | $179k | $15k | 701 | 6.00 | 55.9 | 63.3 | 0.0% | 80.0% |
| S2 W2 | 20 | $162k | -$17k | 702 | 6.90 | 55.9 | 63.5 | 5.0% | 60.0% |
| S2 W3 | 20 | $183k | $21k | 693 | 6.00 | 56.0 | 63.6 | 0.0% | 60.0% |
| S2 W4 | 20 | $167k | -$16k | 692 | 6.50 | 56.0 | 63.7 | 5.0% | 60.0% |
| S2 W5 | 20 | $186k | $19k | 703 | 6.45 | 56.1 | 63.9 | 0.0% | 75.0% |
| S2 W6 | 20 | $169k | -$17k | 677 | 10.70 | 56.2 | 64.0 | 5.0% | 50.0% |
| S2 W7 | 20 | $190k | $21k | 698 | 7.50 | 56.3 | 64.2 | 0.0% | 50.0% |
| S2 W8 | 20 | $168k | -$22k | 701 | 6.00 | 56.4 | 64.4 | 5.0% | 55.0% |
| S2 W9 | 20 | $187k | $19k | 710 | 6.30 | 56.4 | 64.5 | 5.0% | 75.0% |
| S2 W10 | 20 | $168k | -$19k | 696 | 6.80 | 56.5 | 64.7 | 5.0% | 60.0% |
| S2 W11 | 20 | $187k | $19k | 701 | 6.75 | 56.5 | 64.8 | 5.0% | 60.0% |
| S2 W12 | 20 | $169k | -$17k | 711 | 7.10 | 56.6 | 65.0 | 5.0% | 75.0% |
| S2 W13 | 20 | $190k | $21k | 710 | 7.05 | 56.7 | 65.1 | 5.0% | 65.0% |
| S2 W14 | 20 | $174k | -$16k | 696 | 6.65 | 56.7 | 65.3 | 5.0% | 60.0% |
| S2 W15 | 20 | $195k | $21k | 697 | 7.95 | 56.8 | 65.4 | 5.0% | 60.0% |
| S2 W16 | 20 | $178k | -$17k | 712 | 7.40 | 56.9 | 65.6 | 5.0% | 70.0% |
| S2 W17 | 20 | $200k | $22k | 714 | 6.20 | 56.9 | 65.7 | 5.0% | 80.0% |
| S2 W18 | 20 | $184k | -$17k | 706 | 7.70 | 57.0 | 65.9 | 5.0% | 70.0% |
| S2 W19 | 20 | $201k | $17k | 707 | 6.75 | 57.1 | 66.0 | 5.0% | 70.0% |
| S2 W20 | 20 | $184k | -$17k | 697 | 7.20 | 57.1 | 66.2 | 5.0% | 60.0% |
| S2 W21 | 20 | $206k | $22k | 705 | 6.10 | 57.2 | 66.3 | 5.0% | 80.0% |
| S2 W22 | 20 | $188k | -$17k | 713 | 7.35 | 57.3 | 66.5 | 5.0% | 65.0% |
| S2 W23 | 20 | $208k | $20k | 725 | 6.10 | 57.3 | 66.6 | 5.0% | 80.0% |
| S2 W24 | 20 | $186k | -$23k | 708 | 8.90 | 57.4 | 66.8 | 5.0% | 60.0% |
| S2 W25 final | 20 | $204k | $19k | 700 | 6.10 | 57.4 | 66.9 | 5.0% | 55.0% |
| S2 W26 final | 20 | $206k | $2.0k | 471 | 4.75 | 57.5 | 67.0 | 5.0% | 54.5% |
| S2 W27 final | 20 | $261k | $55k | 334 | 3.15 | 57.8 | 66.6 | 5.0% | 83.3% |
| S3 trial 1 | 20 | $252k | -$9.8k | 659 | 6.10 | 57.9 | 66.7 | 5.0% | 80.0% |
| S3 trial 2 | 20 | $237k | -$15k | 664 | 6.45 | 57.9 | 66.9 | 5.0% | 85.0% |
| S3 W1 | 20 | $258k | $22k | 652 | 7.30 | 58.0 | 67.0 | 5.0% | 60.0% |
| S3 W2 | 20 | $242k | -$17k | 645 | 6.60 | 58.1 | 67.1 | 5.0% | 50.0% |
| S3 W3 | 20 | $265k | $24k | 647 | 6.00 | 58.1 | 67.3 | 5.0% | 60.0% |
| S3 W4 | 20 | $249k | -$16k | 641 | 6.95 | 58.2 | 67.4 | 5.0% | 55.0% |
| S3 W5 | 20 | $271k | $22k | 648 | 6.05 | 58.2 | 67.5 | 5.0% | 70.0% |
| S3 W6 | 20 | $254k | -$17k | 634 | 6.25 | 58.3 | 67.6 | 10.0% | 60.0% |
| S3 W7 | 20 | $277k | $23k | 649 | 7.00 | 58.3 | 67.8 | 5.0% | 65.0% |
| S3 W8 | 20 | $261k | -$17k | 650 | 6.60 | 58.4 | 67.9 | 5.0% | 70.0% |
| S3 W9 | 20 | $284k | $23k | 629 | 6.15 | 58.4 | 68.0 | 5.0% | 45.0% |
| S3 W10 | 20 | $264k | -$20k | 651 | 6.45 | 58.5 | 68.2 | 10.0% | 70.0% |
| S3 W11 | 20 | $286k | $22k | 644 | 5.75 | 58.6 | 68.3 | 5.0% | 60.0% |
| S3 W12 | 20 | $270k | -$16k | 642 | 6.05 | 58.6 | 68.4 | 10.0% | 50.0% |
| S3 W13 | 20 | $294k | $24k | 655 | 9.25 | 58.7 | 68.5 | 5.0% | 80.0% |
| S3 W14 | 20 | $277k | -$16k | 656 | 5.80 | 58.7 | 68.7 | 10.0% | 60.0% |
| S3 W15 | 20 | $301k | $23k | 652 | 6.90 | 58.8 | 68.8 | 5.0% | 55.0% |
| S3 W16 | 20 | $284k | -$17k | 662 | 6.60 | 58.8 | 68.9 | 10.0% | 75.0% |
| S3 W17 | 20 | $307k | $23k | 650 | 5.90 | 58.9 | 69.0 | 5.0% | 55.0% |
| S3 W18 | 20 | $282k | -$25k | 639 | 6.10 | 58.9 | 69.2 | 10.0% | 50.0% |
| S3 W19 | 20 | $302k | $20k | 649 | 6.70 | 59.0 | 69.3 | 5.0% | 70.0% |
| S3 W20 | 20 | $283k | -$18k | 658 | 6.10 | 59.0 | 69.4 | 10.0% | 80.0% |
| S3 W21 | 20 | $305k | $21k | 650 | 6.65 | 59.1 | 69.5 | 0.0% | 65.0% |
| S3 W22 | 20 | $287k | -$18k | 660 | 7.35 | 59.1 | 69.6 | 5.0% | 80.0% |
| S3 W23 | 20 | $308k | $21k | 668 | 5.65 | 59.2 | 69.7 | 0.0% | 80.0% |
| S3 W24 | 20 | $277k | -$31k | 660 | 6.90 | 59.2 | 69.9 | 5.0% | 50.0% |
| S3 W25 final | 20 | $290k | $13k | 609 | 6.40 | 59.3 | 70.0 | 5.0% | 72.2% |
| S3 W26 final | 20 | $294k | $3.8k | 483 | 4.05 | 59.3 | 70.1 | 10.0% | 69.2% |
| S3 W27 final | 20 | $375k | $82k | 402 | 4.55 | 60.7 | 69.9 | 10.0% | 80.0% |
| S4 trial 1 | 20 | $342k | -$33k | 598 | 5.50 | 60.5 | 70.0 | 10.0% | 65.0% |
| S4 trial 2 | 20 | $328k | -$14k | 591 | 5.60 | 60.5 | 69.9 | 10.0% | 65.0% |
| S4 W1 | 20 | $348k | $20k | 595 | 6.25 | 60.6 | 70.0 | 10.0% | 70.0% |
| S4 W2 | 20 | $328k | -$20k | 577 | 6.10 | 60.6 | 70.1 | 10.0% | 60.0% |
| S4 W3 | 20 | $348k | $20k | 603 | 5.75 | 60.7 | 70.2 | 10.0% | 75.0% |
| S4 W4 | 20 | $329k | -$20k | 585 | 5.75 | 60.7 | 70.3 | 10.0% | 65.0% |
| S4 W5 | 20 | $349k | $20k | 602 | 5.65 | 60.7 | 70.3 | 10.0% | 70.0% |
| S4 W6 | 20 | $327k | -$22k | 592 | 5.90 | 60.8 | 70.4 | 10.0% | 60.0% |
| S4 W7 | 20 | $348k | $21k | 593 | 5.50 | 60.8 | 70.5 | 10.0% | 55.0% |
| S4 W8 | 20 | $328k | -$20k | 605 | 6.55 | 60.8 | 70.6 | 10.0% | 65.0% |
| S4 W9 | 20 | $348k | $20k | 589 | 6.20 | 60.9 | 70.7 | 10.0% | 55.0% |
| S4 W10 | 20 | $329k | -$19k | 594 | 5.05 | 60.9 | 70.7 | 10.0% | 60.0% |
| S4 W11 | 20 | $349k | $20k | 599 | 6.85 | 60.9 | 70.8 | 10.0% | 70.0% |
| S4 W12 | 20 | $330k | -$19k | 594 | 6.30 | 61.0 | 70.9 | 10.0% | 75.0% |
| S4 W13 | 20 | $349k | $19k | 594 | 5.70 | 61.0 | 71.0 | 5.0% | 70.0% |
| S4 W14 | 20 | $326k | -$23k | 591 | 5.55 | 61.1 | 71.1 | 15.0% | 60.0% |
| S4 W15 | 20 | $347k | $21k | 597 | 6.85 | 61.1 | 71.2 | 5.0% | 50.0% |
| S4 W16 | 20 | $328k | -$19k | 603 | 5.40 | 61.1 | 71.3 | 15.0% | 75.0% |
| S4 W17 | 20 | $348k | $20k | 594 | 5.85 | 61.2 | 71.3 | 5.0% | 60.0% |
| S4 W18 | 20 | $321k | -$28k | 585 | 5.70 | 61.2 | 71.4 | 15.0% | 40.0% |
| S4 W19 | 20 | $339k | $18k | 603 | 5.80 | 61.2 | 71.5 | 5.0% | 60.0% |
| S4 W20 | 20 | $315k | -$24k | 613 | 5.90 | 61.3 | 71.6 | 10.0% | 75.0% |
| S4 W21 | 20 | $336k | $21k | 603 | 7.60 | 61.3 | 71.7 | 0.0% | 65.0% |
| S4 W22 | 20 | $310k | -$26k | 615 | 5.90 | 61.4 | 71.7 | 10.0% | 75.0% |
| S4 W23 | 20 | $327k | $17k | 581 | 5.65 | 61.4 | 71.8 | 0.0% | 45.0% |
| S4 W24 | 20 | $306k | -$21k | 597 | 5.80 | 61.4 | 71.9 | 5.0% | 75.0% |
| S4 W25 final | 20 | $315k | $9.2k | 558 | 5.25 | 61.8 | 71.9 | 5.0% | 72.2% |
| S4 W26 final | 20 | $315k | -$217 | 445 | 4.40 | 61.8 | 72.0 | 10.0% | 69.2% |
| S4 W27 final | 20 | $371k | $56k | 357 | 3.60 | 62.5 | 72.0 | 10.0% | 55.6% |
| S5 trial 1 | 17 | $418k | -$27k | 552 | 5.71 | 62.7 | 72.8 | 0.0% | 70.6% |
| S5 trial 2 | 17 | $396k | -$22k | 558 | 5.24 | 62.7 | 73.0 | 0.0% | 70.6% |
| S5 W1 | 17 | $414k | $18k | 560 | 6.18 | 62.7 | 73.0 | 0.0% | 64.7% |
| S5 W2 | 17 | $389k | -$26k | 557 | 5.76 | 62.8 | 73.1 | 0.0% | 64.7% |
| S5 W3 | 17 | $407k | $18k | 568 | 4.76 | 62.8 | 73.1 | 0.0% | 76.5% |
| S5 W4 | 17 | $384k | -$23k | 559 | 5.59 | 62.8 | 73.2 | 0.0% | 47.1% |
| S5 W5 | 17 | $398k | $14k | 558 | 5.24 | 62.8 | 73.2 | 0.0% | 64.7% |
| S5 W6 | 17 | $376k | -$22k | 567 | 5.82 | 62.8 | 73.3 | 0.0% | 82.4% |
| S5 W7 | 17 | $394k | $18k | 564 | 6.24 | 62.8 | 73.3 | 0.0% | 76.5% |
| S5 W8 | 17 | $369k | -$25k | 564 | 5.18 | 62.9 | 73.4 | 0.0% | 58.8% |
| S5 W9 | 17 | $388k | $19k | 558 | 5.59 | 62.9 | 73.4 | 0.0% | 70.6% |
| S5 W10 | 17 | $366k | -$22k | 571 | 6.06 | 62.9 | 73.5 | 0.0% | 70.6% |
| S5 W11 | 17 | $384k | $18k | 561 | 5.18 | 62.9 | 73.5 | 0.0% | 70.6% |
| S5 W12 | 17 | $355k | -$29k | 568 | 5.41 | 62.9 | 73.6 | 0.0% | 64.7% |
| S5 W13 | 17 | $371k | $16k | 552 | 5.88 | 62.9 | 73.6 | 0.0% | 58.8% |
| S5 W14 | 17 | $348k | -$24k | 547 | 5.12 | 63.0 | 73.7 | 0.0% | 58.8% |
| S5 W15 | 17 | $364k | $17k | 565 | 5.41 | 63.0 | 73.7 | 0.0% | 76.5% |
| S5 W16 | 17 | $339k | -$25k | 561 | 6.82 | 63.0 | 73.7 | 0.0% | 70.6% |
| S5 W17 | 17 | $356k | $17k | 555 | 5.35 | 63.0 | 73.8 | 0.0% | 58.8% |
| S5 W18 | 17 | $319k | -$37k | 570 | 4.82 | 63.0 | 73.8 | 0.0% | 76.5% |
| S5 W19 | 17 | $331k | $12k | 563 | 6.59 | 63.0 | 73.9 | 0.0% | 58.8% |
| S5 W20 | 17 | $305k | -$27k | 566 | 5.24 | 63.0 | 73.9 | 5.9% | 70.6% |
| S5 W21 | 17 | $318k | $14k | 570 | 5.71 | 63.1 | 73.9 | 0.0% | 82.4% |
| S5 W22 | 17 | $292k | -$27k | 556 | 5.65 | 63.1 | 74.0 | 5.9% | 64.7% |
| S5 W23 | 17 | $305k | $14k | 578 | 5.24 | 63.1 | 74.0 | 0.0% | 94.1% |
| S5 W24 | 17 | $279k | -$27k | 562 | 6.35 | 63.1 | 74.1 | 5.9% | 76.5% |
| S5 W25 final | 17 | $288k | $9.6k | 547 | 5.12 | 63.1 | 74.1 | 0.0% | 87.5% |
| S5 W26 final | 17 | $293k | $4.2k | 479 | 4.82 | 63.1 | 74.1 | 5.9% | 64.3% |
| S5 W27 final | 17 | $355k | $63k | 357 | 3.47 | 64.7 | 74.1 | 5.9% | 55.6% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × rush | 2454 | 68.2% | 68 | 72.1% | -3.9% |  |
| balanced × slide | 68 | 72.1% | 2454 | 68.2% | 3.9% |  |

### casual-weekly/normal/au

- 70 overall (best nine, including recruitment): 111.0 weeks; 5 reached, 15 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 208 of 400; median 22.5 weeks among those who did.
- Reaching potential stars: 214 of 400 (95 already there at week 0); median 48.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/377; S3 17/228; S5 31/112.
- Mean XP per completed season 18116; mean level-ups per completed season 177.8.
- Cash: opening 200000; mean weekly change -1557; mean weeks in debt 29.7.
- Bankruptcy warnings: 601; forced sales: 57; sacked with missed solvency objective: 11.
- Save round-trips: 69; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: the board is sacking clubs for money. 11 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -522962 |
| upkeep | -2313 |
| overhead | -55542 |
| sponsor | 0 |
| grant | 53335 |
| gate | 454406 |
| prize | 37609 |
| boardGrant | 15797 |
| events | -11560 |
| transfers | -5149 |
| contracts | -6462 |
| facilities | -2319 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 4 strength 1, stamina 1, kicking 1, footyIQ 1 | $180k | -$20k | 998 | 4 | 49.4 | W 7-0 Dubbo Diggers |
| S1 trial 2 | balanced | 8 strength 2, stamina 3, handling 1, kicking 1, footyIQ 1 | $162k | -$18k | 993 | 8 | 49.5 | W 10-0 Wagga Swagmen |
| S1 W1 | balanced | 8 strength 3, stamina 1, footyIQ 4 | $169k | $7.1k | 887 | 8 | 49.5 | L 0-1 Launceston Larrikins |
| S1 W2 | balanced | 12 strength 3, stamina 3, handling 2, kicking 1, footyIQ 3 | $153k | -$16k | 1001 | 12 | 49.7 | W 13-4 Darwin Drovers |
| S1 W3 | balanced | 7 speed 1, strength 3, handling 1, kicking 1, footyIQ 1 | $160k | $7.1k | 992 | 7 | 49.7 | D 6-6 Southport Stingrays |
| S1 W4 | balanced | 9 speed 2, strength 1, stamina 1, footyIQ 5 | $142k | -$18k | 933 | 9 | 49.8 | D 0-0 Broken Hill Brollys |
| S1 W5 | balanced | 12 strength 3, stamina 2, handling 1, kicking 2, footyIQ 4 | $151k | $9.1k | 1036 | 12 | 49.9 | W 10-0 Geelong Gulls |
| S1 W6 | balanced | 9 speed 2, strength 4, kicking 1, footyIQ 2 | $133k | -$18k | 952 | 9 | 50.0 | W 6-4 Wagga Swagmen |
| S1 W7 | balanced | 8 speed 3, strength 1, stamina 2, handling 1, footyIQ 1 | $150k | $17k | 894 | 8 | 50.1 | L 0-6 Katherine Crocs |
| S1 W8 | balanced | 9 speed 1, strength 3, handling 1, kicking 2, footyIQ 2 | $132k | -$18k | 883 | 9 | 50.2 | L 0-8 Shellharbour Scorpions |
| S1 W9 | balanced | 8 speed 5, strength 1, footyIQ 2 | $144k | $12k | 913 | 8 | 50.3 | L 0-4 Dubbo Diggers |
| S1 W10 | balanced | 8 speed 1, stamina 1, handling 1, kicking 2, footyIQ 3 | $126k | -$18k | 969 | 8 | 50.3 | W 6-4 Mackay Marlins |
| S1 W11 | balanced | 14 speed 4, strength 3, stamina 1, handling 1, footyIQ 5 | $67k | -$59k | 975 | 14 | 51.4 | W 4-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 speed 1, strength 1, stamina 2, handling 2, footyIQ 1 | $48k | -$20k | 960 | 7 | 51.4 | L 4-5 Cairns Cyclones |
| S1 W13 | balanced | 9 speed 3, strength 4, kicking 2 | $57k | $9.1k | 958 | 9 | 51.5 | L 10-11 Toowoomba Thunder |
| S1 W14 | balanced | 12 speed 2, strength 1, stamina 3, handling 1, kicking 1, footyIQ 4 | $37k | -$20k | 915 | 12 | 51.6 | L 0-15 Woolloomooloo Wolves |
| S1 W15 | balanced | 8 speed 1, strength 2, handling 2, footyIQ 3 | $42k | $4.8k | 943 | 8 | 51.7 | D 0-0 Redcliffe Reapers |
| S1 W16 | balanced | 7 speed 1, strength 2, stamina 1, kicking 2, footyIQ 1 | $22k | -$20k | 926 | 7 | 51.8 | L 0-4 Launceston Larrikins |
| S1 W17 | balanced | 12 speed 3, strength 1, stamina 3, handling 1, footyIQ 4 | $23k | $1.0k | 1025 | 12 | 51.9 | W 12-0 Darwin Drovers |
| S1 W18 | balanced | 10 speed 3, strength 2, stamina 1, handling 2, footyIQ 2 | $3.6k | -$20k | 1025 | 10 | 52.0 | W 10-5 Southport Stingrays |
| S1 W19 | balanced | 9 speed 2, strength 2, handling 1, kicking 2, footyIQ 2 | $9.8k | $6.2k | 905 | 9 | 52.1 | L 0-15 Broken Hill Brollys |
| S1 W20 | balanced | 11 speed 2, strength 3, stamina 2, footyIQ 4 | -$9.9k | -$20k | 958 | 11 | 52.2 | D 0-0 Geelong Gulls |
| S1 W21 | balanced | 8 speed 3, stamina 1, handling 1, kicking 1, footyIQ 2 | $1.5k | $11k | 982 | 8 | 52.2 | L 12-13 Wagga Swagmen |
| S1 W22 | balanced | 8 speed 2, strength 2, handling 1, footyIQ 3 | -$18k | -$20k | 996 | 8 | 52.3 | W 10-8 Katherine Crocs |
| S1 W23 | balanced | 13 speed 4, strength 2, stamina 4, kicking 1, footyIQ 2 | -$6.7k | $11k | 1056 | 13 | 52.4 | W 12-6 Shellharbour Scorpions |
| S1 W24 | balanced | 9 speed 2, strength 1, handling 3, kicking 1, footyIQ 2 | -$26k | -$20k | 908 | 9 | 52.5 | L 0-8 Dubbo Diggers |
| S1 W25 final | balanced | 2 strength 1, stamina 1 | -$46k | -$20k | 251 | 2 | 52.5 | no match |
| S1 W26 final | balanced | 1 speed 1 | -$66k | -$20k | 251 | 1 | 52.5 | no match |
| S1 W27 final | balanced | 2 strength 1, footyIQ 1 | -$85k | -$19k | 246 | 2 | 53.6 | no match |
| S2 trial 1 | balanced | 9 speed 2, strength 1, stamina 1, handling 2, footyIQ 3 | -$103k | -$18k | 742 | 9 | 52.0 | L 4-11 Launceston Larrikins |
| S2 trial 2 | balanced | 9 speed 1, strength 1, stamina 1, handling 1, kicking 2, footyIQ 3 | -$112k | -$9.4k | 804 | 9 | 51.0 | W 10-7 Broken Hill Brollys |
| S2 W1 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 2 | -$100k | $12k | 725 | 6 | 50.3 | W 12-0 Launceston Larrikins |
| S2 W2 | balanced | 6 speed 3, strength 1, handling 1, footyIQ 1 | -$114k | -$13k | 645 | 6 | 50.2 | L 0-13 Darwin Drovers |
| S2 W3 | balanced | 6 speed 1, strength 1, stamina 2, kicking 1, footyIQ 1 | -$94k | $19k | 708 | 6 | 50.3 | L 12-16 Southport Stingrays |
| S2 W4 | balanced | 12 speed 4, strength 2, stamina 1, handling 2, footyIQ 3 | -$107k | -$13k | 757 | 12 | 50.4 | W 14-6 Broken Hill Brollys |
| S2 W5 | balanced | 6 speed 2, strength 2, handling 1, footyIQ 1 | -$87k | $20k | 693 | 6 | 50.5 | W 4-0 Geelong Gulls |
| S2 W6 | balanced | 6 speed 1, strength 1, kicking 1, footyIQ 3 | -$99k | -$12k | 650 | 6 | 50.6 | L 0-4 Wagga Swagmen |
| S2 W7 | balanced | 8 speed 1, strength 4, stamina 1, footyIQ 2 | -$78k | $20k | 715 | 8 | 50.7 | W 4-0 Katherine Crocs |
| S2 W8 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | -$90k | -$12k | 666 | 5 | 50.7 | L 4-6 Shellharbour Scorpions |
| S2 W9 | balanced | 7 speed 2, strength 1, stamina 2, kicking 1, footyIQ 1 | -$74k | $16k | 728 | 7 | 50.9 | D 6-6 Dubbo Diggers |
| S2 W10 | balanced | 9 speed 1, strength 2, stamina 2, handling 1, footyIQ 3 | -$83k | -$9.7k | 746 | 9 | 51.0 | W 18-6 Mackay Marlins |
| S2 W11 | balanced | 7 speed 3, stamina 2, handling 1, footyIQ 1 | -$68k | $15k | 700 | 7 | 51.1 | L 10-14 Ballarat Bushrangers |
| S2 W12 | balanced | 6 speed 2, strength 1, kicking 1, footyIQ 2 | -$80k | -$12k | 737 | 6 | 51.2 | W 10-7 Cairns Cyclones |
| S2 W13 | balanced | 7 speed 2, strength 2, footyIQ 3 | -$60k | $20k | 709 | 7 | 51.3 | D 4-4 Toowoomba Thunder |
| S2 W14 | balanced | 7 strength 2, stamina 1, handling 3, footyIQ 1 | -$72k | -$12k | 666 | 7 | 51.4 | L 4-10 Woolloomooloo Wolves |
| S2 W15 | balanced | 8 speed 2, stamina 3, kicking 1, footyIQ 2 | -$50k | $22k | 748 | 8 | 51.5 | W 12-4 Redcliffe Reapers |
| S2 W16 | balanced | 7 speed 4, strength 2, handling 1 | -$62k | -$12k | 669 | 7 | 51.6 | L 0-6 Launceston Larrikins |
| S2 W17 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, footyIQ 1 | -$40k | $22k | 733 | 6 | 51.7 | W 13-4 Darwin Drovers |
| S2 W18 | balanced | 8 speed 2, strength 2, handling 1, kicking 1, footyIQ 2 | -$52k | -$12k | 742 | 8 | 51.8 | W 11-10 Southport Stingrays |
| S2 W19 | balanced | 8 speed 1, strength 3, stamina 1, footyIQ 3 | -$34k | $17k | 701 | 8 | 51.9 | W 1-0 Broken Hill Brollys |
| S2 W20 | balanced | 6 speed 1, strength 1, stamina 2, handling 1, footyIQ 1 | -$45k | -$11k | 681 | 6 | 52.0 | L 4-23 Geelong Gulls |
| S2 W21 | balanced | 8 speed 1, strength 1, stamina 1, kicking 1, footyIQ 4 | -$21k | $24k | 767 | 8 | 52.1 | W 4-0 Wagga Swagmen |
| S2 W22 | balanced | 6 speed 1, strength 1, handling 1, footyIQ 3 | -$33k | -$12k | 671 | 6 | 52.2 | L 6-13 Katherine Crocs |
| S2 W23 | balanced | 7 speed 3, strength 1, stamina 2, kicking 1 | -$15k | $18k | 702 | 7 | 52.3 | D 1-1 Shellharbour Scorpions |
| S2 W24 | balanced | 7 speed 4, stamina 2, footyIQ 1 | -$27k | -$12k | 710 | 7 | 52.4 | W 4-0 Dubbo Diggers |
| S2 W25 final | balanced | 8 speed 3, strength 1, handling 2, footyIQ 2 | -$38k | -$12k | 695 | 8 | 52.6 | W 14-4 Toowoomba Thunder |
| S2 W26 final | balanced | 5 strength 2, handling 1, kicking 1, footyIQ 1 | -$50k | -$12k | 681 | 5 | 52.6 | W 10-6 Southport Stingrays |
| S2 W27 final | balanced | 8 speed 1, strength 2, stamina 1, handling 2, footyIQ 2 | $70k | $120k | 653 | 8 | 55.4 | L 6-12 Ballarat Bushrangers |
| S3 trial 1 | balanced | 5 speed 1, stamina 3, handling 1 | $32k | -$38k | 628 | 5 | 54.5 | W 6-4 Woolloomooloo Wolves |
| S3 trial 2 | balanced | 5 strength 2, handling 1, kicking 1, footyIQ 1 | $20k | -$13k | 619 | 5 | 54.6 | W 13-0 Toowoomba Thunder |
| S3 W1 | balanced | 8 speed 4, strength 2, footyIQ 2 | $40k | $20k | 665 | 8 | 54.8 | W 10-0 Launceston Larrikins |
| S3 W2 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, footyIQ 2 | $27k | -$13k | 588 | 7 | 54.9 | L 0-14 Darwin Drovers |
| S3 W3 | balanced | 6 strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $55k | $28k | 739 | 6 | 55.0 | W 32-0 Southport Stingrays |
| S3 W4 | balanced | 5 speed 3, footyIQ 2 | $24k | -$32k | 642 | 5 | 54.6 | L 6-16 Broken Hill Brollys |
| S3 W5 | balanced | 8 strength 3, stamina 1, handling 1, footyIQ 3 | $44k | $21k | 623 | 8 | 54.7 | L 6-7 Geelong Gulls |
| S3 W6 | balanced | 5 speed 1, strength 1, kicking 1, footyIQ 2 | $31k | -$13k | 638 | 5 | 54.8 | L 10-13 Wagga Swagmen |
| S3 W7 | balanced | 5 speed 3, stamina 1, footyIQ 1 | $46k | $15k | 638 | 5 | 54.9 | L 6-7 Katherine Crocs |
| S3 W8 | balanced | 9 speed 3, strength 3, stamina 1, handling 1, footyIQ 1 | $33k | -$13k | 694 | 9 | 55.0 | W 16-4 Shellharbour Scorpions |
| S3 W9 | balanced | 5 strength 1, stamina 1, kicking 1, footyIQ 2 | $55k | $22k | 655 | 5 | 55.1 | W 6-0 Dubbo Diggers |
| S3 W10 | balanced | 8 speed 2, stamina 2, handling 3, footyIQ 1 | $31k | -$24k | 637 | 8 | 55.3 | W 4-0 Mackay Marlins |
| S3 W11 | balanced | 6 speed 1, strength 1, stamina 1, handling 2, footyIQ 1 | $53k | $22k | 653 | 6 | 55.4 | W 10-0 Ballarat Bushrangers |
| S3 W12 | balanced | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | $38k | -$14k | 625 | 5 | 55.4 | L 6-10 Cairns Cyclones |
| S3 W13 | balanced | 6 speed 4, strength 2 | $69k | $31k | 606 | 6 | 55.5 | L 0-10 Toowoomba Thunder |
| S3 W14 | balanced | 9 strength 2, handling 3, kicking 1, footyIQ 3 | $55k | -$14k | 686 | 9 | 55.6 | L 18-19 Woolloomooloo Wolves |
| S3 W15 | balanced | 3 strength 1, footyIQ 2 | $82k | $27k | 655 | 3 | 55.7 | W 12-0 Redcliffe Reapers |
| S3 W16 | balanced | 7 speed 2, strength 2, footyIQ 3 | $67k | -$15k | 609 | 7 | 55.8 | L 0-6 Launceston Larrikins |
| S3 W17 | balanced | 8 speed 1, strength 1, stamina 3, handling 1, kicking 1, footyIQ 1 | $82k | $16k | 622 | 8 | 55.9 | L 0-10 Darwin Drovers |
| S3 W18 | balanced | 5 speed 1, stamina 1, handling 2, footyIQ 1 | $67k | -$15k | 698 | 6 | 55.9 | W 23-12 Southport Stingrays |
| S3 W19 | balanced | 7 speed 3, strength 2, footyIQ 2 | $79k | $11k | 640 | 7 | 56.0 | D 12-12 Broken Hill Brollys |
| S3 W20 | balanced | 6 speed 4, strength 1, footyIQ 1 | $64k | -$15k | 657 | 8 | 56.1 | W 1-0 Geelong Gulls |
| S3 W21 | balanced | 1 footyIQ 1 | $88k | $24k | 612 | 3 | 56.1 | L 0-14 Wagga Swagmen |
| S3 W22 | balanced | 6 speed 1, strength 1, stamina 2, handling 1, footyIQ 1 | $71k | -$17k | 681 | 7 | 56.2 | W 12-6 Katherine Crocs |
| S3 W23 | balanced | 6 speed 1, strength 1, handling 2, footyIQ 2 | $95k | $24k | 648 | 8 | 56.3 | W 13-0 Shellharbour Scorpions |
| S3 W24 | balanced | 4 speed 2, stamina 2 | $69k | -$26k | 701 | 7 | 56.3 | W 6-0 Dubbo Diggers |
| S3 W25 final | balanced | 4 speed 1, strength 1, stamina 1, handling 1 | $51k | -$18k | 624 | 6 | 56.4 | L 4-18 Toowoomba Thunder |
| S3 W26 final | balanced | 2 strength 2 | $34k | -$18k | 155 | 2 | 56.4 | no match |
| S3 W27 final | balanced | 2 strength 1, footyIQ 1 | $51k | $17k | 152 | 2 | 57.3 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $178k | -$22k | 691 | 1.30 | 49.5 | 55.5 | 0.0% | 35.0% |
| S1 trial 2 | 20 | $162k | -$17k | 688 | 5.80 | 49.5 | 55.6 | 0.0% | 30.0% |
| S1 W1 | 20 | $168k | $6.3k | 703 | 5.00 | 49.5 | 55.7 | 0.0% | 55.0% |
| S1 W2 | 20 | $149k | -$19k | 709 | 7.60 | 49.6 | 55.8 | 0.0% | 30.0% |
| S1 W3 | 20 | $159k | $11k | 711 | 4.80 | 49.6 | 55.9 | 0.0% | 25.0% |
| S1 W4 | 20 | $138k | -$21k | 705 | 6.60 | 49.7 | 56.1 | 0.0% | 50.0% |
| S1 W5 | 20 | $143k | $5.1k | 708 | 8.35 | 49.8 | 56.3 | 0.0% | 50.0% |
| S1 W6 | 20 | $121k | -$22k | 722 | 6.65 | 49.9 | 56.5 | 0.0% | 50.0% |
| S1 W7 | 20 | $130k | $8.8k | 715 | 6.20 | 50.0 | 56.7 | 0.0% | 65.0% |
| S1 W8 | 20 | $112k | -$19k | 699 | 8.40 | 50.1 | 56.8 | 0.0% | 40.0% |
| S1 W9 | 20 | $122k | $11k | 701 | 7.30 | 50.1 | 56.9 | 0.0% | 40.0% |
| S1 W10 | 20 | $103k | -$19k | 716 | 4.60 | 50.2 | 57.0 | 0.0% | 60.0% |
| S1 W11 | 20 | $106k | $2.1k | 714 | 10.20 | 50.3 | 57.3 | 0.0% | 50.0% |
| S1 W12 | 20 | $87k | -$19k | 698 | 4.90 | 50.4 | 57.4 | 0.0% | 10.0% |
| S1 W13 | 20 | $97k | $10k | 711 | 7.95 | 50.4 | 57.6 | 0.0% | 30.0% |
| S1 W14 | 20 | $79k | -$19k | 711 | 7.65 | 50.5 | 57.7 | 0.0% | 35.0% |
| S1 W15 | 20 | $89k | $10k | 712 | 6.70 | 50.6 | 57.8 | 0.0% | 50.0% |
| S1 W16 | 20 | $66k | -$23k | 713 | 5.05 | 50.6 | 58.0 | 0.0% | 55.0% |
| S1 W17 | 20 | $76k | $10k | 732 | 10.45 | 50.7 | 58.1 | 0.0% | 60.0% |
| S1 W18 | 20 | $57k | -$19k | 729 | 6.05 | 50.8 | 58.3 | 5.0% | 50.0% |
| S1 W19 | 20 | $65k | $8.2k | 727 | 7.05 | 50.8 | 58.4 | 5.0% | 70.0% |
| S1 W20 | 20 | $46k | -$19k | 713 | 8.15 | 50.9 | 58.5 | 15.0% | 60.0% |
| S1 W21 | 20 | $51k | $5.5k | 722 | 5.60 | 51.0 | 58.8 | 10.0% | 65.0% |
| S1 W22 | 20 | $32k | -$20k | 711 | 5.90 | 51.0 | 59.0 | 20.0% | 30.0% |
| S1 W23 | 20 | $36k | $4.6k | 740 | 9.20 | 51.2 | 59.2 | 20.0% | 65.0% |
| S1 W24 | 20 | $15k | -$22k | 727 | 6.40 | 51.2 | 59.4 | 35.0% | 65.0% |
| S1 W25 final | 20 | $5.5k | -$9.1k | 513 | 4.90 | 51.3 | 59.5 | 50.0% | 58.3% |
| S1 W26 final | 20 | -$9.4k | -$15k | 388 | 4.65 | 51.3 | 59.5 | 65.0% | 42.9% |
| S1 W27 final | 20 | $18k | $28k | 277 | 2.80 | 51.9 | 59.4 | 55.0% | 66.7% |
| S2 trial 1 | 20 | $5.6k | -$13k | 681 | 6.45 | 51.8 | 59.1 | 55.0% | 35.0% |
| S2 trial 2 | 20 | -$9.4k | -$15k | 684 | 8.20 | 51.8 | 59.1 | 60.0% | 65.0% |
| S2 W1 | 20 | $3.7k | $13k | 697 | 5.75 | 51.8 | 59.1 | 55.0% | 50.0% |
| S2 W2 | 20 | -$14k | -$17k | 691 | 7.35 | 51.8 | 59.2 | 65.0% | 50.0% |
| S2 W3 | 20 | $2.9k | $17k | 685 | 5.85 | 51.9 | 59.3 | 50.0% | 50.0% |
| S2 W4 | 20 | -$15k | -$18k | 688 | 7.25 | 51.8 | 59.1 | 65.0% | 45.0% |
| S2 W5 | 20 | $1.6k | $16k | 668 | 5.65 | 51.9 | 59.3 | 50.0% | 45.0% |
| S2 W6 | 20 | -$15k | -$17k | 679 | 9.95 | 51.9 | 59.2 | 65.0% | 45.0% |
| S2 W7 | 20 | $948 | $16k | 683 | 7.00 | 51.9 | 59.3 | 50.0% | 40.0% |
| S2 W8 | 20 | -$19k | -$20k | 681 | 6.55 | 51.9 | 59.2 | 60.0% | 55.0% |
| S2 W9 | 20 | -$1.7k | $17k | 691 | 6.15 | 51.9 | 59.4 | 50.0% | 65.0% |
| S2 W10 | 20 | -$18k | -$17k | 676 | 6.70 | 51.9 | 59.3 | 65.0% | 60.0% |
| S2 W11 | 20 | $23 | $18k | 673 | 6.60 | 51.9 | 59.3 | 50.0% | 50.0% |
| S2 W12 | 20 | -$16k | -$16k | 677 | 6.40 | 51.9 | 59.3 | 65.0% | 55.0% |
| S2 W13 | 20 | $3.9k | $20k | 678 | 6.80 | 52.0 | 59.4 | 50.0% | 50.0% |
| S2 W14 | 20 | -$12k | -$16k | 664 | 6.65 | 52.0 | 59.5 | 65.0% | 25.0% |
| S2 W15 | 20 | $8.8k | $21k | 667 | 7.20 | 52.1 | 59.7 | 50.0% | 40.0% |
| S2 W16 | 20 | -$6.7k | -$16k | 672 | 7.10 | 52.2 | 59.8 | 60.0% | 40.0% |
| S2 W17 | 20 | $11k | $17k | 681 | 5.85 | 52.2 | 59.9 | 50.0% | 50.0% |
| S2 W18 | 20 | -$5.7k | -$16k | 673 | 7.05 | 52.2 | 59.9 | 65.0% | 40.0% |
| S2 W19 | 20 | $11k | $17k | 677 | 7.10 | 52.3 | 60.0 | 50.0% | 55.0% |
| S2 W20 | 20 | -$5.3k | -$16k | 701 | 6.80 | 52.3 | 60.0 | 65.0% | 60.0% |
| S2 W21 | 20 | $14k | $20k | 689 | 6.30 | 52.3 | 60.1 | 50.0% | 45.0% |
| S2 W22 | 20 | -$2.0k | -$16k | 668 | 6.75 | 52.3 | 60.2 | 65.0% | 30.0% |
| S2 W23 | 20 | $14k | $16k | 676 | 5.95 | 52.3 | 60.2 | 50.0% | 55.0% |
| S2 W24 | 20 | -$3.7k | -$18k | 662 | 7.60 | 52.2 | 59.9 | 65.0% | 40.0% |
| S2 W25 final | 20 | -$4.4k | -$786 | 490 | 4.95 | 52.2 | 59.8 | 60.0% | 75.0% |
| S2 W26 final | 20 | -$15k | -$11k | 411 | 3.80 | 52.2 | 59.8 | 70.0% | 55.6% |
| S2 W27 final | 20 | $19k | $34k | 291 | 2.55 | 52.7 | 59.4 | 55.0% | 40.0% |
| S3 trial 1 | 15 | $37k | -$15k | 619 | 5.67 | 53.1 | 60.8 | 40.0% | 66.7% |
| S3 trial 2 | 15 | $24k | -$13k | 608 | 6.07 | 52.9 | 60.6 | 40.0% | 40.0% |
| S3 W1 | 15 | $44k | $20k | 626 | 6.60 | 52.9 | 60.6 | 40.0% | 53.3% |
| S3 W2 | 15 | $28k | -$16k | 624 | 7.07 | 52.7 | 60.2 | 40.0% | 60.0% |
| S3 W3 | 15 | $50k | $22k | 624 | 5.47 | 52.8 | 60.4 | 40.0% | 46.7% |
| S3 W4 | 15 | $32k | -$18k | 607 | 6.20 | 52.7 | 60.3 | 40.0% | 66.7% |
| S3 W5 | 15 | $54k | $22k | 620 | 5.87 | 52.8 | 60.4 | 40.0% | 60.0% |
| S3 W6 | 15 | $38k | -$16k | 601 | 6.33 | 52.8 | 60.3 | 40.0% | 40.0% |
| S3 W7 | 15 | $60k | $22k | 603 | 6.53 | 52.8 | 60.5 | 40.0% | 33.3% |
| S3 W8 | 15 | $45k | -$15k | 625 | 6.00 | 52.9 | 60.6 | 40.0% | 66.7% |
| S3 W9 | 15 | $67k | $22k | 616 | 6.00 | 52.9 | 60.7 | 33.3% | 66.7% |
| S3 W10 | 15 | $47k | -$20k | 602 | 5.80 | 52.9 | 60.8 | 40.0% | 53.3% |
| S3 W11 | 15 | $69k | $22k | 608 | 5.40 | 53.0 | 60.9 | 33.3% | 46.7% |
| S3 W12 | 15 | $53k | -$15k | 596 | 6.00 | 53.0 | 61.0 | 40.0% | 46.7% |
| S3 W13 | 15 | $76k | $23k | 610 | 7.73 | 53.1 | 61.1 | 26.7% | 53.3% |
| S3 W14 | 15 | $61k | -$15k | 598 | 6.27 | 53.1 | 61.2 | 33.3% | 26.7% |
| S3 W15 | 15 | $83k | $22k | 608 | 5.33 | 53.2 | 61.3 | 26.7% | 53.3% |
| S3 W16 | 15 | $67k | -$16k | 614 | 6.00 | 53.2 | 61.4 | 33.3% | 53.3% |
| S3 W17 | 15 | $89k | $22k | 611 | 5.80 | 53.3 | 61.5 | 26.7% | 53.3% |
| S3 W18 | 15 | $70k | -$19k | 615 | 6.20 | 53.3 | 61.6 | 40.0% | 40.0% |
| S3 W19 | 15 | $89k | $19k | 611 | 6.27 | 53.4 | 61.7 | 26.7% | 46.7% |
| S3 W20 | 15 | $73k | -$16k | 615 | 6.60 | 53.5 | 61.8 | 40.0% | 73.3% |
| S3 W21 | 15 | $96k | $23k | 596 | 6.20 | 53.5 | 61.9 | 26.7% | 33.3% |
| S3 W22 | 15 | $80k | -$16k | 611 | 5.47 | 53.5 | 62.0 | 40.0% | 46.7% |
| S3 W23 | 15 | $100k | $20k | 614 | 5.93 | 53.5 | 62.1 | 33.3% | 60.0% |
| S3 W24 | 15 | $73k | -$27k | 636 | 6.00 | 53.6 | 62.3 | 33.3% | 73.3% |
| S3 W25 final | 15 | $80k | $6.4k | 546 | 5.60 | 53.7 | 62.4 | 33.3% | 30.8% |
| S3 W26 final | 15 | $73k | -$6.3k | 277 | 2.27 | 53.7 | 62.4 | 40.0% | 100.0% |
| S3 W27 final | 15 | $119k | $46k | 276 | 3.27 | 54.4 | 62.2 | 40.0% | 75.0% |
| S4 trial 1 | 7 | $207k | -$29k | 599 | 6.14 | 56.5 | 67.3 | 28.6% | 57.1% |
| S4 trial 2 | 7 | $191k | -$17k | 589 | 5.86 | 56.6 | 67.4 | 28.6% | 42.9% |
| S4 W1 | 7 | $212k | $21k | 573 | 4.86 | 56.6 | 67.5 | 28.6% | 57.1% |
| S4 W2 | 7 | $190k | -$21k | 590 | 7.57 | 56.3 | 66.9 | 28.6% | 85.7% |
| S4 W3 | 7 | $214k | $23k | 592 | 5.00 | 56.4 | 67.0 | 28.6% | 71.4% |
| S4 W4 | 7 | $195k | -$19k | 580 | 5.29 | 56.2 | 66.8 | 28.6% | 85.7% |
| S4 W5 | 7 | $218k | $23k | 562 | 5.86 | 56.3 | 66.9 | 14.3% | 57.1% |
| S4 W6 | 7 | $197k | -$21k | 579 | 5.00 | 56.2 | 66.7 | 28.6% | 57.1% |
| S4 W7 | 7 | $219k | $23k | 582 | 6.71 | 56.2 | 66.7 | 14.3% | 71.4% |
| S4 W8 | 7 | $200k | -$19k | 569 | 6.00 | 56.3 | 66.8 | 28.6% | 57.1% |
| S4 W9 | 7 | $222k | $22k | 588 | 5.14 | 56.3 | 66.9 | 14.3% | 71.4% |
| S4 W10 | 7 | $203k | -$19k | 565 | 5.29 | 56.3 | 67.0 | 28.6% | 71.4% |
| S4 W11 | 7 | $224k | $21k | 570 | 6.14 | 56.3 | 67.1 | 14.3% | 57.1% |
| S4 W12 | 7 | $204k | -$20k | 566 | 5.86 | 56.4 | 67.1 | 28.6% | 57.1% |
| S4 W13 | 7 | $210k | $5.2k | 585 | 5.71 | 56.6 | 67.6 | 14.3% | 57.1% |
| S4 W14 | 7 | $189k | -$20k | 571 | 5.43 | 56.6 | 67.7 | 28.6% | 57.1% |
| S4 W15 | 7 | $210k | $21k | 589 | 6.86 | 56.6 | 67.8 | 14.3% | 57.1% |
| S4 W16 | 7 | $193k | -$18k | 593 | 5.14 | 56.7 | 67.8 | 28.6% | 85.7% |
| S4 W17 | 7 | $213k | $21k | 573 | 6.71 | 56.7 | 67.9 | 14.3% | 42.9% |
| S4 W18 | 7 | $187k | -$26k | 580 | 4.86 | 56.7 | 67.9 | 28.6% | 57.1% |
| S4 W19 | 7 | $208k | $21k | 584 | 5.43 | 56.7 | 68.0 | 14.3% | 57.1% |
| S4 W20 | 7 | $179k | -$29k | 592 | 6.14 | 56.8 | 68.2 | 28.6% | 57.1% |
| S4 W21 | 7 | $200k | $21k | 589 | 7.14 | 56.9 | 68.3 | 14.3% | 57.1% |
| S4 W22 | 7 | $177k | -$23k | 583 | 5.71 | 56.9 | 68.3 | 28.6% | 42.9% |
| S4 W23 | 7 | $198k | $21k | 598 | 5.57 | 56.9 | 68.4 | 0.0% | 57.1% |
| S4 W24 | 7 | $181k | -$17k | 567 | 5.14 | 56.9 | 68.5 | 14.3% | 28.6% |
| S4 W25 final | 7 | $197k | $16k | 601 | 6.29 | 57.0 | 68.5 | 0.0% | 71.4% |
| S4 W26 final | 7 | $193k | -$4.2k | 488 | 4.57 | 57.0 | 68.6 | 28.6% | 100.0% |
| S4 W27 final | 7 | $279k | $86k | 452 | 5.14 | 59.0 | 68.6 | 0.0% | 40.0% |
| S5 trial 1 | 7 | $243k | -$36k | 522 | 4.57 | 58.8 | 68.7 | 0.0% | 57.1% |
| S5 trial 2 | 7 | $229k | -$14k | 556 | 5.14 | 58.8 | 68.8 | 14.3% | 71.4% |
| S5 W1 | 7 | $249k | $21k | 535 | 5.71 | 58.8 | 68.9 | 0.0% | 42.9% |
| S5 W2 | 7 | $227k | -$22k | 540 | 6.43 | 58.9 | 68.9 | 14.3% | 57.1% |
| S5 W3 | 7 | $248k | $21k | 529 | 5.29 | 58.9 | 68.9 | 0.0% | 28.6% |
| S5 W4 | 7 | $225k | -$23k | 552 | 4.43 | 58.9 | 69.0 | 0.0% | 57.1% |
| S5 W5 | 7 | $246k | $21k | 551 | 4.86 | 58.9 | 69.0 | 0.0% | 71.4% |
| S5 W6 | 7 | $224k | -$21k | 543 | 5.71 | 58.9 | 69.1 | 0.0% | 42.9% |
| S5 W7 | 7 | $244k | $20k | 544 | 5.57 | 59.0 | 69.1 | 0.0% | 57.1% |
| S5 W8 | 7 | $223k | -$21k | 542 | 6.57 | 59.0 | 69.2 | 0.0% | 57.1% |
| S5 W9 | 7 | $244k | $21k | 574 | 5.43 | 59.0 | 69.2 | 0.0% | 100.0% |
| S5 W10 | 7 | $223k | -$21k | 535 | 4.86 | 59.0 | 69.3 | 0.0% | 42.9% |
| S5 W11 | 7 | $243k | $20k | 539 | 5.29 | 59.0 | 69.3 | 0.0% | 57.1% |
| S5 W12 | 7 | $216k | -$27k | 547 | 5.43 | 59.1 | 69.3 | 0.0% | 71.4% |
| S5 W13 | 7 | $235k | $19k | 556 | 5.00 | 59.1 | 69.4 | 0.0% | 71.4% |
| S5 W14 | 7 | $211k | -$24k | 537 | 5.14 | 59.1 | 69.4 | 0.0% | 42.9% |
| S5 W15 | 7 | $231k | $20k | 544 | 6.57 | 59.1 | 69.4 | 0.0% | 42.9% |
| S5 W16 | 7 | $205k | -$27k | 550 | 5.71 | 59.0 | 69.6 | 0.0% | 85.7% |
| S5 W17 | 7 | $224k | $19k | 539 | 5.43 | 59.0 | 69.6 | 0.0% | 57.1% |
| S5 W18 | 7 | $183k | -$41k | 539 | 4.86 | 59.0 | 69.7 | 0.0% | 42.9% |
| S5 W19 | 7 | $198k | $14k | 559 | 5.86 | 59.0 | 69.7 | 0.0% | 71.4% |
| S5 W20 | 7 | $170k | -$27k | 542 | 5.00 | 59.1 | 69.9 | 0.0% | 42.9% |
| S5 W21 | 7 | $187k | $17k | 543 | 5.00 | 59.1 | 69.9 | 0.0% | 57.1% |
| S5 W22 | 7 | $161k | -$26k | 542 | 6.71 | 59.1 | 70.0 | 0.0% | 42.9% |
| S5 W23 | 7 | $178k | $16k | 580 | 5.43 | 59.1 | 70.0 | 0.0% | 85.7% |
| S5 W24 | 7 | $153k | -$25k | 537 | 5.43 | 59.1 | 70.0 | 0.0% | 42.9% |
| S5 W25 final | 7 | $156k | $3.0k | 547 | 5.14 | 59.2 | 70.2 | 0.0% | 57.1% |
| S5 W26 final | 7 | $148k | -$7.8k | 367 | 3.71 | 59.2 | 70.2 | 14.3% | 25.0% |
| S5 W27 final | 7 | $166k | $18k | 197 | 1.71 | 60.5 | 69.9 | 14.3% | 0.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1161 | 56.2% | 593 | 57.0% | -0.8% |  |
| balanced × slide | 593 | 57.0% | 1161 | 56.2% | 0.8% |  |

### casual-weekly/hard/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 213 of 400; median 27.0 weeks among those who did.
- Reaching potential stars: 137 of 400 (92 already there at week 0); median 62.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/340; S3 5/117; S5 12/43.
- Mean XP per completed season 16961; mean level-ups per completed season 165.6.
- Cash: opening 150000; mean weekly change -2226; mean weeks in debt 42.1.
- Bankruptcy warnings: 851; forced sales: 94; sacked with missed solvency objective: 15.
- Save round-trips: 57; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks hard. Completed seasons end at -13686 on average. Broke rate 100.0% (a bankruptcy warning, or a sacking for a missed solvency objective).
- WARNING: the board is sacking clubs for money. 15 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -497445 |
| upkeep | -2312 |
| overhead | -54954 |
| sponsor | 0 |
| grant | 45916 |
| gate | 411826 |
| prize | 35158 |
| boardGrant | 11368 |
| events | -2788 |
| transfers | -5530 |
| contracts | -2983 |
| facilities | -2807 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $129k | -$21k | 560 | 0 | 45.0 | L 4-7 Dubbo Diggers |
| S1 trial 2 | balanced | 4 strength 2, kicking 1, footyIQ 1 | $109k | -$20k | 617 | 4 | 45.0 | W 12-6 Wagga Swagmen |
| S1 W1 | balanced | 5 strength 1, stamina 1, kicking 1, footyIQ 2 | $114k | $5.5k | 571 | 5 | 45.0 | D 4-4 Launceston Larrikins |
| S1 W2 | balanced | 4 strength 1, handling 1, footyIQ 2 | $97k | -$18k | 573 | 4 | 45.1 | W 4-0 Darwin Drovers |
| S1 W3 | balanced | 4 strength 1, kicking 1, footyIQ 2 | $103k | $6.8k | 558 | 4 | 45.1 | L 0-13 Southport Stingrays |
| S1 W4 | balanced | 5 strength 1, handling 1, footyIQ 3 | $86k | -$18k | 589 | 5 | 45.1 | W 8-0 Broken Hill Brollys |
| S1 W5 | balanced | 10 speed 1, strength 2, stamina 3, kicking 1, footyIQ 3 | $92k | $6.8k | 550 | 10 | 45.2 | L 0-6 Geelong Gulls |
| S1 W6 | balanced | 5 speed 2, strength 1, footyIQ 2 | $73k | -$20k | 563 | 5 | 45.2 | L 10-20 Wagga Swagmen |
| S1 W7 | balanced | 5 strength 2, kicking 1, footyIQ 2 | $82k | $9.0k | 599 | 5 | 45.3 | L 4-13 Katherine Crocs |
| S1 W8 | balanced | 5 speed 1, strength 2, stamina 1, handling 1 | $62k | -$20k | 590 | 5 | 45.3 | W 13-4 Shellharbour Scorpions |
| S1 W9 | balanced | 6 stamina 1, handling 1, kicking 1, footyIQ 3 | $71k | $9.0k | 586 | 6 | 45.3 | W 12-10 Dubbo Diggers |
| S1 W10 | balanced | 4 speed 1, strength 1, footyIQ 2 | $51k | -$20k | 572 | 4 | 45.4 | L 4-16 Mackay Marlins |
| S1 W11 | balanced | 9 speed 3, strength 1, kicking 1, footyIQ 4 | $5.2k | -$46k | 619 | 9 | 46.6 | W 20-6 Ballarat Bushrangers |
| S1 W12 | balanced | 1 footyIQ 1 | -$16k | -$22k | 578 | 1 | 46.6 | D 0-0 Cairns Cyclones |
| S1 W13 | balanced | 10 speed 3, strength 4, stamina 2, footyIQ 1 | -$4.6k | $12k | 611 | 10 | 46.7 | D 0-0 Toowoomba Thunder |
| S1 W14 | balanced | 7 speed 2, strength 1, stamina 1, kicking 1, footyIQ 2 | -$26k | -$22k | 564 | 7 | 46.7 | L 0-15 Woolloomooloo Wolves |
| S1 W15 | balanced | 5 speed 1, stamina 1, footyIQ 3 | -$19k | $7.2k | 612 | 5 | 46.8 | W 10-4 Redcliffe Reapers |
| S1 W16 | balanced | 4 speed 1, handling 1, footyIQ 2 | -$40k | -$21k | 611 | 4 | 46.8 | W 10-4 Launceston Larrikins |
| S1 W17 | balanced | 10 speed 3, strength 3, stamina 1, handling 1, kicking 1, footyIQ 1 | -$33k | $7.7k | 623 | 10 | 46.9 | W 10-0 Darwin Drovers |
| S1 W18 | balanced | 2 strength 1, footyIQ 1 | -$54k | -$21k | 645 | 2 | 46.9 | W 10-0 Southport Stingrays |
| S1 W19 | balanced | 6 speed 2, strength 1, handling 1, footyIQ 2 | -$43k | $11k | 620 | 6 | 46.9 | D 4-4 Broken Hill Brollys |
| S1 W20 | balanced | 11 speed 3, strength 1, stamina 4, handling 1, footyIQ 2 | -$65k | -$21k | 629 | 11 | 47.0 | W 12-8 Geelong Gulls |
| S1 W21 | balanced | 3 strength 1, kicking 1, footyIQ 1 | -$46k | $19k | 574 | 3 | 47.0 | L 8-16 Wagga Swagmen |
| S1 W22 | balanced | 5 speed 3, strength 1, footyIQ 1 | -$68k | -$21k | 579 | 5 | 47.1 | L 8-11 Katherine Crocs |
| S1 W23 | balanced | 7 speed 2, strength 1, stamina 2, footyIQ 2 | -$56k | $12k | 604 | 7 | 47.1 | W 12-6 Shellharbour Scorpions |
| S1 W24 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | -$77k | -$21k | 601 | 5 | 47.1 | W 16-4 Dubbo Diggers |
| S1 W25 final | balanced | 5 speed 2, strength 1, kicking 1, footyIQ 1 | -$98k | -$21k | 604 | 5 | 47.2 | W 14-6 Southport Stingrays |
| S1 W26 final | balanced | 6 strength 1, handling 1, footyIQ 4 | -$120k | -$21k | 652 | 6 | 45.5 | W 12-8 Redcliffe Reapers |
| S1 W27 final | balanced | 6 speed 3, strength 3 | $5.6k | $125k | 556 | 6 | 46.2 | L 0-4 Shellharbour Scorpions |
| S2 trial 1 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, footyIQ 1 | -$10k | -$16k | 540 | 6 | 46.2 | L 0-5 Redcliffe Reapers |
| S2 trial 2 | balanced | 6 stamina 2, kicking 1, footyIQ 3 | -$18k | -$7.6k | 543 | 6 | 46.3 | L 2-16 Geelong Gulls |
| S2 W1 | balanced | 7 speed 3, strength 1, stamina 2, footyIQ 1 | -$872 | $17k | 664 | 7 | 46.4 | D 6-6 Launceston Larrikins |
| S2 W2 | balanced | 7 speed 2, strength 1, handling 1, footyIQ 3 | -$17k | -$16k | 637 | 7 | 46.4 | L 12-14 Darwin Drovers |
| S2 W3 | balanced | 6 speed 1, strength 3, handling 1, footyIQ 1 | $4.9k | $22k | 656 | 6 | 46.5 | W 12-11 Southport Stingrays |
| S2 W4 | balanced | 4 strength 1, stamina 2, kicking 1 | -$11k | -$16k | 659 | 4 | 46.5 | W 18-7 Broken Hill Brollys |
| S2 W5 | balanced | 10 speed 3, strength 3, stamina 2, footyIQ 2 | $15k | $25k | 611 | 10 | 46.6 | D 0-0 Geelong Gulls |
| S2 W6 | balanced | 6 speed 4, stamina 2 | -$1.3k | -$16k | 604 | 6 | 46.7 | L 6-7 Wagga Swagmen |
| S2 W7 | balanced | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $19k | $21k | 593 | 6 | 46.8 | L 0-6 Katherine Crocs |
| S2 W8 | balanced | 7 speed 1, strength 2, stamina 2, kicking 1, footyIQ 1 | $3.6k | -$16k | 642 | 7 | 46.8 | W 6-4 Shellharbour Scorpions |
| S2 W9 | balanced | 5 speed 1, strength 1, stamina 2, footyIQ 1 | $28k | $24k | 601 | 5 | 46.9 | L 0-6 Dubbo Diggers |
| S2 W10 | balanced | 5 speed 4, handling 1 | $12k | -$16k | 695 | 5 | 46.9 | W 16-0 Mackay Marlins |
| S2 W11 | balanced | 9 speed 1, strength 2, stamina 1, handling 2, footyIQ 3 | $28k | $16k | 647 | 9 | 47.0 | W 6-0 Ballarat Bushrangers |
| S2 W12 | balanced | 3 strength 2, kicking 1 | $19k | -$8.8k | 624 | 3 | 47.1 | L 4-12 Cairns Cyclones |
| S2 W13 | balanced | 9 speed 3, stamina 4, handling 1, footyIQ 1 | $46k | $26k | 604 | 9 | 47.2 | L 2-11 Toowoomba Thunder |
| S2 W14 | balanced | 6 speed 3, strength 2, footyIQ 1 | $22k | -$24k | 632 | 6 | 47.2 | L 6-14 Woolloomooloo Wolves |
| S2 W15 | balanced | 7 speed 3, handling 1, footyIQ 3 | $44k | $22k | 707 | 7 | 47.3 | W 10-6 Redcliffe Reapers |
| S2 W16 | balanced | 7 strength 5, kicking 1, footyIQ 1 | $28k | -$16k | 652 | 7 | 47.4 | L 8-12 Launceston Larrikins |
| S2 W17 | balanced | 8 speed 1, stamina 4, footyIQ 3 | $46k | $18k | 733 | 8 | 47.5 | W 14-0 Darwin Drovers |
| S2 W18 | balanced | 5 speed 2, strength 1, stamina 1, handling 1 | $30k | -$16k | 664 | 5 | 47.5 | W 13-0 Southport Stingrays |
| S2 W19 | balanced | 5 speed 1, kicking 1, footyIQ 3 | $56k | $26k | 663 | 5 | 47.6 | W 5-0 Broken Hill Brollys |
| S2 W20 | balanced | 10 speed 4, strength 2, stamina 2, footyIQ 2 | $41k | -$16k | 636 | 10 | 47.7 | L 6-12 Geelong Gulls |
| S2 W21 | balanced | 5 speed 1, strength 1, stamina 2, footyIQ 1 | $60k | $19k | 608 | 5 | 47.7 | L 0-14 Wagga Swagmen |
| S2 W22 | balanced | 6 speed 4, stamina 1, handling 1 | $41k | -$19k | 732 | 6 | 47.8 | W 18-4 Katherine Crocs |
| S2 W23 | balanced | 7 speed 1, strength 2, handling 1, kicking 1, footyIQ 2 | $60k | $19k | 701 | 7 | 47.9 | W 12-6 Shellharbour Scorpions |
| S2 W24 | balanced | 4 strength 2, footyIQ 2 | $33k | -$27k | 678 | 4 | 47.9 | W 4-0 Dubbo Diggers |
| S2 W25 final | balanced | 7 speed 1, strength 2, stamina 2, handling 2 | $17k | -$16k | 617 | 7 | 48.0 | L 0-14 Katherine Crocs |
| S2 W26 final | balanced | 4 strength 1, stamina 2, handling 1 | $783 | -$16k | 148 | 4 | 48.0 | no match |
| S2 W27 final | balanced | 2 speed 1, stamina 1 | $14k | $14k | 146 | 2 | 48.8 | no match |
| S3 trial 1 | balanced | 4 speed 2, stamina 1, kicking 1 | $7.2k | -$7.1k | 572 | 4 | 48.9 | W 6-4 Cairns Cyclones |
| S3 trial 2 | balanced | 6 speed 4, footyIQ 2 | -$8.5k | -$16k | 602 | 6 | 48.9 | W 16-14 Launceston Larrikins |
| S3 W1 | balanced | 8 speed 2, strength 2, footyIQ 4 | $10k | $19k | 578 | 8 | 49.0 | W 16-4 Launceston Larrikins |
| S3 W2 | balanced | 3 strength 1, handling 1, footyIQ 1 | -$5.4k | -$16k | 538 | 3 | 49.1 | D 8-8 Darwin Drovers |
| S3 W3 | balanced | 6 strength 1, stamina 2, kicking 1, footyIQ 2 | $21k | $26k | 608 | 6 | 49.1 | W 18-10 Southport Stingrays |
| S3 W4 | balanced | 6 speed 1, strength 2, stamina 1, footyIQ 2 | $5.3k | -$16k | 563 | 6 | 49.2 | W 4-0 Broken Hill Brollys |
| S3 W5 | balanced | 6 speed 6 | $30k | $25k | 597 | 6 | 49.2 | W 16-4 Geelong Gulls |
| S3 W6 | balanced | 5 strength 1, stamina 1, handling 1, footyIQ 2 | $14k | -$16k | 525 | 5 | 49.3 | L 0-14 Wagga Swagmen |
| S3 W7 | balanced | 8 speed 4, stamina 1, handling 1, kicking 1, footyIQ 1 | $40k | $26k | 552 | 8 | 49.4 | D 4-4 Katherine Crocs |
| S3 W8 | balanced | 6 strength 3, stamina 2, footyIQ 1 | $24k | -$16k | 565 | 6 | 49.5 | L 4-6 Shellharbour Scorpions |
| S3 W9 | balanced | 3 speed 1, stamina 1, footyIQ 1 | $49k | $25k | 519 | 3 | 49.5 | L 0-1 Dubbo Diggers |
| S3 W10 | balanced | 7 speed 1, strength 1, stamina 2, handling 2, footyIQ 1 | $33k | -$17k | 589 | 7 | 49.6 | W 16-4 Mackay Marlins |
| S3 W11 | balanced | 5 speed 3, strength 1, kicking 1 | $48k | $16k | 536 | 5 | 49.6 | L 6-10 Ballarat Bushrangers |
| S3 W12 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $32k | -$17k | 537 | 4 | 49.6 | L 0-12 Cairns Cyclones |
| S3 W13 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, footyIQ 3 | $52k | $20k | 531 | 8 | 49.7 | L 4-10 Toowoomba Thunder |
| S3 W14 | balanced | 6 speed 2, strength 2, handling 1, footyIQ 1 | $37k | -$15k | 572 | 6 | 49.8 | W 10-8 Woolloomooloo Wolves |
| S3 W15 | balanced | 4 speed 1, strength 1, stamina 1, kicking 1 | $61k | $24k | 604 | 4 | 49.8 | W 14-0 Redcliffe Reapers |
| S3 W16 | balanced | 7 speed 1, stamina 3, footyIQ 3 | $45k | -$17k | 546 | 7 | 49.9 | L 4-6 Launceston Larrikins |
| S3 W17 | balanced | 6 speed 4, strength 2 | $62k | $17k | 594 | 6 | 50.0 | W 16-4 Darwin Drovers |
| S3 W18 | balanced | 3 handling 1, footyIQ 2 | $46k | -$17k | 525 | 3 | 50.0 | D 0-0 Southport Stingrays |
| S3 W19 | balanced | 6 speed 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $68k | $23k | 574 | 7 | 50.1 | D 4-4 Broken Hill Brollys |
| S3 W20 | balanced | 4 strength 2, stamina 1, footyIQ 1 | $52k | -$16k | 539 | 4 | 50.1 | D 6-6 Geelong Gulls |
| S3 W21 | balanced | 6 speed 3, strength 1, stamina 2 | $72k | $20k | 578 | 6 | 50.2 | W 12-0 Wagga Swagmen |
| S3 W22 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, footyIQ 1 | $53k | -$20k | 573 | 7 | 50.2 | W 8-6 Katherine Crocs |
| S3 W23 | balanced | 6 speed 3, stamina 1, kicking 1, footyIQ 1 | $74k | $21k | 563 | 6 | 50.3 | W 4-1 Shellharbour Scorpions |
| S3 W24 | balanced | 5 speed 1, strength 1, footyIQ 3 | $51k | -$23k | 580 | 5 | 50.4 | W 11-6 Dubbo Diggers |
| S3 W25 final | balanced | 5 speed 1, strength 2, footyIQ 2 | $74k | $23k | 583 | 6 | 50.4 | W 6-0 Launceston Larrikins |
| S3 W26 final | balanced | 5 strength 1, stamina 2, handling 1, footyIQ 1 | $97k | $23k | 581 | 5 | 50.5 | W 13-6 Redcliffe Reapers |
| S3 W27 final | balanced | 3 strength 1, stamina 1, kicking 1 | $329k | $232k | 537 | 3 | 50.8 | W 16-6 Katherine Crocs |
| S4 trial 1 | balanced | 8 speed 3, strength 2, stamina 1, footyIQ 1 | $274k | -$55k | 621 | 8 | 51.4 | W 6-4 Katherine Crocs |
| S4 trial 2 | balanced | 7 speed 4, stamina 1, footyIQ 1 | $255k | -$19k | 624 | 6 | 51.5 | W 6-4 Redcliffe Reapers |
| S4 W1 | balanced | 6 speed 1, strength 1, handling 1, footyIQ 2 | $278k | $23k | 639 | 5 | 51.6 | D 6-6 Launceston Larrikins |
| S4 W2 | balanced | 10 speed 2, strength 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $259k | -$19k | 643 | 9 | 51.7 | W 12-0 Darwin Drovers |
| S4 W3 | balanced | 3 speed 2, footyIQ 1 | $282k | $23k | 680 | 3 | 51.7 | W 10-0 Southport Stingrays |
| S4 W4 | balanced | 7 stamina 2, handling 2, kicking 1, footyIQ 2 | $264k | -$19k | 681 | 7 | 51.8 | W 17-0 Broken Hill Brollys |
| S4 W5 | balanced | 10 speed 3, strength 3, stamina 2, footyIQ 2 | $287k | $23k | 644 | 10 | 51.9 | D 8-8 Geelong Gulls |
| S4 W6 | balanced | 6 speed 4, footyIQ 2 | $268k | -$19k | 640 | 6 | 52.0 | W 6-4 Wagga Swagmen |
| S4 W7 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $291k | $23k | 623 | 4 | 52.0 | D 6-6 Katherine Crocs |
| S4 W8 | balanced | 9 speed 2, strength 4, kicking 1, footyIQ 2 | $274k | -$17k | 661 | 9 | 52.1 | W 20-15 Shellharbour Scorpions |
| S4 W9 | balanced | 6 stamina 2, footyIQ 4 | $299k | $25k | 662 | 6 | 52.2 | W 12-0 Dubbo Diggers |
| S4 W10 | balanced | 6 speed 3, strength 1, stamina 2 | $280k | -$19k | 628 | 6 | 52.2 | L 6-19 Mackay Marlins |
| S4 W11 | balanced | 7 speed 3, strength 1, stamina 1, handling 1, footyIQ 1 | $303k | $23k | 655 | 7 | 52.3 | L 4-7 Ballarat Bushrangers |
| S4 W12 | balanced | 7 speed 2, strength 1, stamina 1, kicking 1, footyIQ 2 | $284k | -$19k | 656 | 7 | 52.4 | W 14-0 Cairns Cyclones |
| S4 W13 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $307k | $23k | 625 | 5 | 52.5 | W 6-4 Toowoomba Thunder |
| S4 W14 | balanced | 9 speed 3, strength 2, stamina 3, handling 1 | $288k | -$19k | 598 | 9 | 52.6 | D 0-0 Woolloomooloo Wolves |
| S4 W15 | balanced | 4 stamina 2, footyIQ 2 | $311k | $23k | 651 | 5 | 52.6 | W 19-10 Redcliffe Reapers |
| S4 W16 | balanced | 3 speed 2, strength 1 | $292k | -$19k | 609 | 4 | 52.6 | W 6-4 Launceston Larrikins |
| S4 W17 | balanced | 8 speed 3, strength 2, stamina 1, footyIQ 2 | $315k | $23k | 611 | 9 | 52.7 | L 6-16 Darwin Drovers |
| S4 W18 | balanced | 2 speed 2 | $296k | -$19k | 671 | 4 | 52.7 | W 10-6 Southport Stingrays |
| S4 W19 | balanced | 7 strength 1, stamina 2, footyIQ 4 | $319k | $23k | 647 | 8 | 52.8 | W 4-0 Broken Hill Brollys |
| S4 W20 | balanced | 7 speed 2, strength 4, footyIQ 1 | $291k | -$28k | 670 | 8 | 52.9 | W 12-4 Geelong Gulls |
| S4 W21 | balanced | 5 speed 1, stamina 4 | $313k | $22k | 652 | 6 | 52.9 | W 17-0 Wagga Swagmen |
| S4 W22 | balanced | 6 speed 3, strength 1, footyIQ 2 | $293k | -$20k | 603 | 7 | 53.0 | L 6-10 Katherine Crocs |
| S4 W23 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $315k | $22k | 683 | 5 | 53.0 | W 14-12 Shellharbour Scorpions |
| S4 W24 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | $289k | -$26k | 603 | 6 | 53.1 | W 16-8 Dubbo Diggers |
| S4 W25 final | balanced | 7 speed 1, strength 2, stamina 4 | $311k | $22k | 653 | 8 | 53.2 | W 11-0 Darwin Drovers |
| S4 W26 final | balanced | 3 speed 2, handling 1 | $333k | $22k | 609 | 4 | 53.2 | L 6-7 Ballarat Bushrangers |
| S4 W27 final | balanced | 1 footyIQ 1 | $374k | $40k | 137 | 1 | 54.2 | no match |
| S5 trial 1 | balanced | 5 speed 3, stamina 1, footyIQ 1 | $309k | -$65k | 628 | 6 | 54.7 | W 18-10 Ballarat Bushrangers |
| S5 trial 2 | balanced | 5 speed 1, strength 1, stamina 1, footyIQ 2 | $299k | -$9.5k | 625 | 6 | 54.7 | W 18-0 Southport Stingrays |
| S5 W1 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $321k | $22k | 612 | 5 | 54.8 | W 14-10 Launceston Larrikins |
| S5 W2 | balanced | 3 speed 3 | $301k | -$20k | 618 | 5 | 54.8 | L 12-18 Darwin Drovers |
| S5 W3 | balanced | 8 speed 2, stamina 2, footyIQ 4 | $323k | $22k | 572 | 10 | 54.9 | L 0-4 Southport Stingrays |
| S5 W4 | balanced | 2 strength 2 | $303k | -$20k | 657 | 4 | 54.9 | W 12-0 Broken Hill Brollys |
| S5 W5 | balanced | 4 speed 1, strength 2, stamina 1 | $314k | $11k | 591 | 6 | 54.9 | L 10-16 Geelong Gulls |
| S5 W6 | balanced | 6 speed 2, strength 2, stamina 1, footyIQ 1 | $292k | -$22k | 611 | 9 | 55.0 | W 4-0 Wagga Swagmen |
| S5 W7 | balanced | 2 stamina 1, footyIQ 1 | $312k | $20k | 658 | 4 | 55.0 | W 15-0 Katherine Crocs |
| S5 W8 | balanced | 6 speed 2, strength 2, stamina 2 | $290k | -$22k | 622 | 8 | 55.0 | D 10-10 Shellharbour Scorpions |
| S5 W9 | balanced | 2 stamina 1, footyIQ 1 | $315k | $25k | 610 | 3 | 55.0 | W 12-2 Dubbo Diggers |
| S5 W10 | balanced | 6 speed 5, stamina 1 | $294k | -$22k | 584 | 8 | 55.1 | L 10-12 Mackay Marlins |
| S5 W11 | balanced | 5 speed 2, strength 2, footyIQ 1 | $314k | $20k | 569 | 6 | 55.1 | L 0-1 Ballarat Bushrangers |
| S5 W12 | balanced | 3 speed 1, strength 1, stamina 1 | $292k | -$22k | 583 | 5 | 55.2 | L 6-17 Cairns Cyclones |
| S5 W13 | balanced | 5 speed 1, stamina 1, footyIQ 3 | $312k | $20k | 604 | 6 | 55.2 | L 10-17 Toowoomba Thunder |
| S5 W14 | balanced | 5 speed 3, strength 1, footyIQ 1 | $290k | -$22k | 654 | 8 | 55.3 | W 28-8 Woolloomooloo Wolves |
| S5 W15 | balanced | 3 stamina 1, footyIQ 2 | $311k | $20k | 605 | 5 | 55.3 | W 6-1 Redcliffe Reapers |
| S5 W16 | balanced | 3 strength 2, stamina 1 | $289k | -$22k | 640 | 5 | 55.3 | W 12-6 Launceston Larrikins |
| S5 W17 | balanced | 5 speed 1, strength 2, stamina 1, handling 1 | $309k | $20k | 589 | 8 | 55.3 | W 7-1 Darwin Drovers |
| S5 W18 | balanced | 4 speed 3, stamina 1 | $273k | -$36k | 627 | 6 | 55.4 | W 10-4 Southport Stingrays |
| S5 W19 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $291k | $18k | 666 | 7 | 55.4 | W 10-0 Broken Hill Brollys |
| S5 W20 | balanced | 5 speed 2, strength 2, stamina 1 | $267k | -$24k | 575 | 7 | 55.5 | L 4-6 Geelong Gulls |
| S5 W21 | balanced | 3 strength 1, stamina 1, footyIQ 1 | $282k | $15k | 573 | 4 | 55.5 | L 0-7 Wagga Swagmen |
| S5 W22 | balanced | 2 speed 2 | $254k | -$29k | 580 | 5 | 55.5 | L 4-10 Katherine Crocs |
| S5 W23 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $271k | $17k | 600 | 6 | 55.5 | W 6-4 Shellharbour Scorpions |
| S5 W24 | balanced | 2 strength 1, stamina 1 | $246k | -$25k | 602 | 5 | 55.5 | W 6-0 Dubbo Diggers |
| S5 W25 final | balanced | 5 speed 3, stamina 1, footyIQ 1 | $222k | -$25k | 648 | 8 | 55.6 | W 10-6 Darwin Drovers |
| S5 W26 final | balanced | 5 speed 2, handling 1, footyIQ 2 | $196k | -$25k | 707 | 8 | 55.6 | W 28-0 Toowoomba Thunder |
| S5 W27 final | balanced | 3 speed 1, strength 1, footyIQ 1 | $357k | $161k | 586 | 5 | 61.2 | W 2-0 Geelong Gulls |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $126k | -$24k | 628 | 0.30 | 45.7 | 52.1 | 0.0% | 25.0% |
| S1 trial 2 | 20 | $108k | -$18k | 636 | 5.25 | 45.7 | 52.2 | 0.0% | 35.0% |
| S1 W1 | 20 | $112k | $4.4k | 632 | 4.20 | 45.8 | 52.2 | 0.0% | 40.0% |
| S1 W2 | 20 | $91k | -$21k | 640 | 7.20 | 45.8 | 52.4 | 0.0% | 35.0% |
| S1 W3 | 20 | $100k | $9.3k | 642 | 4.10 | 45.8 | 52.4 | 0.0% | 25.0% |
| S1 W4 | 20 | $77k | -$23k | 650 | 5.80 | 45.9 | 52.6 | 0.0% | 45.0% |
| S1 W5 | 20 | $81k | $3.5k | 650 | 7.85 | 46.0 | 52.8 | 0.0% | 40.0% |
| S1 W6 | 20 | $61k | -$20k | 648 | 6.35 | 46.1 | 52.9 | 0.0% | 50.0% |
| S1 W7 | 20 | $68k | $7.0k | 652 | 5.65 | 46.2 | 53.2 | 0.0% | 40.0% |
| S1 W8 | 20 | $47k | -$21k | 647 | 7.95 | 46.2 | 53.3 | 0.0% | 40.0% |
| S1 W9 | 20 | $54k | $6.9k | 652 | 6.75 | 46.3 | 53.4 | 0.0% | 40.0% |
| S1 W10 | 20 | $33k | -$21k | 648 | 3.95 | 46.3 | 53.5 | 15.0% | 35.0% |
| S1 W11 | 20 | $36k | $3.1k | 647 | 9.60 | 46.5 | 53.7 | 5.0% | 35.0% |
| S1 W12 | 20 | $16k | -$20k | 645 | 4.50 | 46.5 | 53.8 | 20.0% | 25.0% |
| S1 W13 | 20 | $24k | $8.2k | 657 | 7.50 | 46.5 | 54.0 | 15.0% | 35.0% |
| S1 W14 | 20 | $3.3k | -$21k | 652 | 6.10 | 46.6 | 54.1 | 30.0% | 30.0% |
| S1 W15 | 20 | $12k | $8.4k | 650 | 5.95 | 46.6 | 54.2 | 25.0% | 25.0% |
| S1 W16 | 20 | -$9.8k | -$21k | 649 | 5.05 | 46.7 | 54.4 | 65.0% | 45.0% |
| S1 W17 | 20 | -$2.3k | $7.5k | 642 | 9.65 | 46.8 | 54.5 | 50.0% | 40.0% |
| S1 W18 | 20 | -$24k | -$22k | 657 | 5.10 | 46.9 | 54.7 | 90.0% | 45.0% |
| S1 W19 | 20 | -$19k | $5.4k | 657 | 6.15 | 46.9 | 54.8 | 75.0% | 40.0% |
| S1 W20 | 20 | -$39k | -$21k | 666 | 7.75 | 46.9 | 54.8 | 95.0% | 50.0% |
| S1 W21 | 20 | -$33k | $6.6k | 658 | 5.10 | 46.9 | 54.9 | 90.0% | 40.0% |
| S1 W22 | 20 | -$54k | -$21k | 649 | 5.65 | 46.9 | 55.0 | 100.0% | 35.0% |
| S1 W23 | 20 | -$48k | $5.9k | 666 | 8.50 | 47.0 | 55.1 | 95.0% | 75.0% |
| S1 W24 | 20 | -$68k | -$21k | 641 | 5.45 | 46.8 | 54.7 | 100.0% | 40.0% |
| S1 W25 final | 20 | -$81k | -$12k | 369 | 3.15 | 46.7 | 54.4 | 95.0% | 50.0% |
| S1 W26 final | 20 | -$98k | -$18k | 285 | 4.15 | 45.8 | 52.4 | 100.0% | 75.0% |
| S1 W27 final | 20 | -$87k | $11k | 242 | 2.10 | 46.3 | 51.7 | 90.0% | 0.0% |
| S2 trial 1 | 20 | -$100k | -$13k | 593 | 5.45 | 45.9 | 50.9 | 100.0% | 35.0% |
| S2 trial 2 | 20 | -$112k | -$12k | 607 | 6.45 | 45.6 | 50.3 | 100.0% | 50.0% |
| S2 W1 | 20 | -$99k | $13k | 610 | 6.45 | 45.4 | 49.8 | 100.0% | 30.0% |
| S2 W2 | 20 | -$114k | -$15k | 606 | 6.05 | 45.2 | 49.4 | 100.0% | 45.0% |
| S2 W3 | 20 | -$96k | $19k | 601 | 5.55 | 45.2 | 49.2 | 95.0% | 25.0% |
| S2 W4 | 20 | -$110k | -$14k | 602 | 6.35 | 45.1 | 49.1 | 100.0% | 50.0% |
| S2 W5 | 20 | -$92k | $17k | 603 | 6.05 | 45.2 | 49.2 | 95.0% | 30.0% |
| S2 W6 | 20 | -$105k | -$13k | 599 | 6.15 | 45.2 | 49.2 | 100.0% | 30.0% |
| S2 W7 | 20 | -$89k | $16k | 612 | 6.85 | 45.2 | 49.3 | 90.0% | 50.0% |
| S2 W8 | 20 | -$103k | -$14k | 612 | 5.85 | 45.3 | 49.3 | 95.0% | 55.0% |
| S2 W9 | 20 | -$87k | $16k | 602 | 5.55 | 45.3 | 49.4 | 85.0% | 45.0% |
| S2 W10 | 20 | -$100k | -$13k | 613 | 6.15 | 45.3 | 49.4 | 90.0% | 50.0% |
| S2 W11 | 20 | -$82k | $18k | 611 | 6.40 | 45.4 | 49.5 | 85.0% | 45.0% |
| S2 W12 | 20 | -$95k | -$13k | 603 | 5.35 | 45.5 | 49.6 | 90.0% | 30.0% |
| S2 W13 | 20 | -$76k | $19k | 604 | 6.25 | 45.5 | 49.8 | 85.0% | 30.0% |
| S2 W14 | 20 | -$90k | -$14k | 600 | 6.25 | 45.5 | 49.8 | 85.0% | 10.0% |
| S2 W15 | 20 | -$72k | $18k | 604 | 5.70 | 45.6 | 49.9 | 85.0% | 35.0% |
| S2 W16 | 20 | -$86k | -$14k | 614 | 6.50 | 45.6 | 50.0 | 85.0% | 50.0% |
| S2 W17 | 20 | -$71k | $15k | 615 | 6.20 | 45.7 | 50.1 | 85.0% | 30.0% |
| S2 W18 | 20 | -$84k | -$13k | 612 | 5.45 | 45.7 | 50.1 | 85.0% | 50.0% |
| S2 W19 | 20 | -$69k | $16k | 614 | 6.80 | 45.8 | 50.3 | 85.0% | 55.0% |
| S2 W20 | 20 | -$82k | -$13k | 612 | 5.90 | 45.8 | 50.4 | 85.0% | 45.0% |
| S2 W21 | 20 | -$64k | $18k | 603 | 5.90 | 45.9 | 50.5 | 85.0% | 40.0% |
| S2 W22 | 20 | -$77k | -$14k | 614 | 6.00 | 45.9 | 50.5 | 85.0% | 35.0% |
| S2 W23 | 20 | -$59k | $18k | 610 | 5.90 | 46.0 | 50.6 | 85.0% | 55.0% |
| S2 W24 | 20 | -$74k | -$15k | 619 | 5.90 | 45.9 | 50.5 | 85.0% | 35.0% |
| S2 W25 final | 20 | -$81k | -$6.9k | 345 | 3.50 | 45.9 | 50.5 | 85.0% | 75.0% |
| S2 W26 final | 20 | -$85k | -$4.4k | 283 | 2.85 | 45.9 | 50.5 | 90.0% | 16.7% |
| S2 W27 final | 20 | -$79k | $6.2k | 158 | 1.80 | 46.7 | 50.4 | 75.0% | 0.0% |
| S3 trial 1 | 8 | -$23k | -$9.9k | 581 | 4.88 | 47.5 | 53.3 | 50.0% | 37.5% |
| S3 trial 2 | 8 | -$35k | -$12k | 588 | 6.63 | 47.5 | 53.2 | 62.5% | 75.0% |
| S3 W1 | 8 | -$16k | $18k | 579 | 6.63 | 47.5 | 53.2 | 50.0% | 50.0% |
| S3 W2 | 8 | -$30k | -$14k | 579 | 4.75 | 47.5 | 53.2 | 62.5% | 37.5% |
| S3 W3 | 8 | -$7.7k | $23k | 586 | 5.88 | 47.6 | 53.4 | 50.0% | 50.0% |
| S3 W4 | 8 | -$23k | -$15k | 566 | 6.25 | 47.7 | 53.5 | 50.0% | 25.0% |
| S3 W5 | 8 | -$155 | $23k | 587 | 5.00 | 47.7 | 53.6 | 50.0% | 75.0% |
| S3 W6 | 8 | -$18k | -$17k | 585 | 6.38 | 47.7 | 53.9 | 50.0% | 50.0% |
| S3 W7 | 8 | $6.6k | $24k | 578 | 5.88 | 47.8 | 54.0 | 50.0% | 37.5% |
| S3 W8 | 8 | -$9.6k | -$16k | 570 | 5.13 | 47.9 | 54.1 | 50.0% | 25.0% |
| S3 W9 | 8 | $11k | $20k | 575 | 6.88 | 48.0 | 54.2 | 37.5% | 50.0% |
| S3 W10 | 8 | -$8.4k | -$19k | 612 | 5.00 | 48.1 | 54.5 | 50.0% | 87.5% |
| S3 W11 | 8 | $13k | $21k | 594 | 6.13 | 48.1 | 54.6 | 37.5% | 50.0% |
| S3 W12 | 8 | -$2.7k | -$16k | 583 | 4.88 | 48.2 | 54.7 | 50.0% | 12.5% |
| S3 W13 | 8 | $19k | $21k | 565 | 6.63 | 48.2 | 54.8 | 37.5% | 25.0% |
| S3 W14 | 8 | $3.2k | -$15k | 589 | 5.38 | 48.3 | 54.9 | 50.0% | 62.5% |
| S3 W15 | 8 | $26k | $23k | 600 | 7.00 | 48.4 | 55.1 | 25.0% | 62.5% |
| S3 W16 | 8 | $10k | -$16k | 600 | 6.13 | 48.4 | 55.2 | 37.5% | 75.0% |
| S3 W17 | 8 | $32k | $22k | 595 | 6.13 | 48.5 | 55.3 | 25.0% | 37.5% |
| S3 W18 | 8 | $12k | -$20k | 580 | 5.25 | 48.7 | 55.8 | 37.5% | 50.0% |
| S3 W19 | 8 | $34k | $22k | 602 | 5.63 | 48.7 | 55.8 | 12.5% | 75.0% |
| S3 W20 | 8 | $19k | -$16k | 587 | 5.88 | 48.8 | 56.0 | 37.5% | 50.0% |
| S3 W21 | 8 | $41k | $23k | 594 | 5.38 | 48.9 | 56.1 | 0.0% | 62.5% |
| S3 W22 | 8 | $25k | -$17k | 590 | 6.88 | 48.9 | 56.2 | 25.0% | 50.0% |
| S3 W23 | 8 | $45k | $21k | 580 | 5.63 | 49.0 | 56.3 | 0.0% | 37.5% |
| S3 W24 | 8 | $28k | -$17k | 587 | 5.00 | 49.0 | 56.4 | 12.5% | 37.5% |
| S3 W25 final | 8 | $42k | $13k | 541 | 6.63 | 49.1 | 56.5 | 12.5% | 71.4% |
| S3 W26 final | 8 | $35k | -$6.7k | 412 | 3.50 | 49.1 | 56.6 | 25.0% | 60.0% |
| S3 W27 final | 8 | $129k | $94k | 298 | 2.00 | 49.9 | 56.6 | 12.5% | 100.0% |
| S4 trial 1 | 6 | $129k | -$28k | 595 | 6.83 | 49.9 | 57.2 | 0.0% | 66.7% |
| S4 trial 2 | 6 | $105k | -$25k | 591 | 5.33 | 50.1 | 57.4 | 0.0% | 33.3% |
| S4 W1 | 6 | $124k | $20k | 613 | 6.17 | 50.1 | 57.4 | 0.0% | 50.0% |
| S4 W2 | 6 | $106k | -$19k | 611 | 6.50 | 50.2 | 57.5 | 0.0% | 66.7% |
| S4 W3 | 6 | $127k | $22k | 619 | 6.17 | 50.3 | 57.7 | 0.0% | 66.7% |
| S4 W4 | 6 | $107k | -$20k | 595 | 4.33 | 50.3 | 57.8 | 0.0% | 33.3% |
| S4 W5 | 6 | $129k | $22k | 618 | 8.00 | 50.4 | 57.9 | 0.0% | 66.7% |
| S4 W6 | 6 | $107k | -$21k | 596 | 5.00 | 50.5 | 58.1 | 0.0% | 33.3% |
| S4 W7 | 6 | $129k | $22k | 590 | 5.17 | 50.6 | 58.2 | 0.0% | 16.7% |
| S4 W8 | 6 | $110k | -$20k | 615 | 7.50 | 50.7 | 58.3 | 0.0% | 66.7% |
| S4 W9 | 6 | $131k | $21k | 593 | 5.33 | 50.7 | 58.4 | 0.0% | 50.0% |
| S4 W10 | 6 | $111k | -$20k | 595 | 6.00 | 50.8 | 58.5 | 0.0% | 16.7% |
| S4 W11 | 6 | $130k | $19k | 604 | 6.83 | 50.8 | 58.7 | 0.0% | 33.3% |
| S4 W12 | 6 | $111k | -$19k | 592 | 5.83 | 50.9 | 58.8 | 0.0% | 33.3% |
| S4 W13 | 6 | $130k | $19k | 598 | 5.00 | 50.9 | 58.8 | 0.0% | 33.3% |
| S4 W14 | 6 | $111k | -$19k | 612 | 7.33 | 51.0 | 59.0 | 0.0% | 50.0% |
| S4 W15 | 6 | $132k | $21k | 601 | 5.67 | 51.1 | 59.1 | 0.0% | 50.0% |
| S4 W16 | 6 | $114k | -$17k | 603 | 5.83 | 51.1 | 59.1 | 0.0% | 50.0% |
| S4 W17 | 6 | $136k | $22k | 592 | 6.83 | 51.2 | 59.3 | 0.0% | 33.3% |
| S4 W18 | 6 | $117k | -$19k | 603 | 5.00 | 51.2 | 59.4 | 0.0% | 33.3% |
| S4 W19 | 6 | $137k | $19k | 630 | 6.17 | 51.3 | 59.4 | 0.0% | 83.3% |
| S4 W20 | 6 | $117k | -$20k | 608 | 6.17 | 51.4 | 59.6 | 0.0% | 50.0% |
| S4 W21 | 6 | $140k | $23k | 592 | 5.33 | 51.4 | 59.6 | 0.0% | 33.3% |
| S4 W22 | 6 | $115k | -$25k | 607 | 7.17 | 51.5 | 59.8 | 0.0% | 66.7% |
| S4 W23 | 6 | $136k | $21k | 621 | 6.00 | 51.5 | 59.9 | 0.0% | 66.7% |
| S4 W24 | 6 | $114k | -$21k | 599 | 6.50 | 51.6 | 60.0 | 0.0% | 33.3% |
| S4 W25 final | 6 | $106k | -$8.3k | 450 | 4.67 | 51.6 | 60.1 | 0.0% | 100.0% |
| S4 W26 final | 6 | $100k | -$5.8k | 437 | 3.83 | 51.6 | 60.1 | 33.3% | 50.0% |
| S4 W27 final | 6 | $166k | $66k | 281 | 2.50 | 52.4 | 60.0 | 16.7% | 100.0% |
| S5 trial 1 | 3 | $232k | -$35k | 557 | 5.00 | 54.8 | 64.5 | 0.0% | 100.0% |
| S5 trial 2 | 3 | $216k | -$16k | 549 | 6.00 | 54.9 | 64.6 | 0.0% | 100.0% |
| S5 W1 | 3 | $235k | $19k | 536 | 5.00 | 54.9 | 64.7 | 0.0% | 100.0% |
| S5 W2 | 3 | $192k | -$43k | 561 | 5.00 | 55.0 | 65.3 | 0.0% | 33.3% |
| S5 W3 | 3 | $210k | $18k | 529 | 7.00 | 55.1 | 65.5 | 0.0% | 33.3% |
| S5 W4 | 3 | $186k | -$24k | 559 | 4.33 | 55.0 | 65.4 | 0.0% | 100.0% |
| S5 W5 | 3 | $201k | $14k | 547 | 5.33 | 55.1 | 65.5 | 0.0% | 66.7% |
| S5 W6 | 3 | $175k | -$26k | 575 | 6.33 | 55.1 | 65.6 | 0.0% | 100.0% |
| S5 W7 | 3 | $193k | $18k | 567 | 5.67 | 55.1 | 65.6 | 0.0% | 100.0% |
| S5 W8 | 3 | $168k | -$24k | 575 | 5.33 | 55.1 | 65.7 | 0.0% | 66.7% |
| S5 W9 | 3 | $186k | $18k | 544 | 4.67 | 55.1 | 65.7 | 0.0% | 66.7% |
| S5 W10 | 3 | $162k | -$24k | 513 | 6.00 | 55.1 | 65.8 | 0.0% | 0.0% |
| S5 W11 | 3 | $180k | $18k | 522 | 5.67 | 55.2 | 65.8 | 0.0% | 33.3% |
| S5 W12 | 3 | $155k | -$24k | 543 | 5.00 | 55.2 | 65.9 | 0.0% | 33.3% |
| S5 W13 | 3 | $173k | $18k | 549 | 4.67 | 55.2 | 65.9 | 0.0% | 66.7% |
| S5 W14 | 3 | $148k | -$24k | 548 | 6.67 | 55.2 | 66.0 | 0.0% | 66.7% |
| S5 W15 | 3 | $166k | $18k | 542 | 4.33 | 55.2 | 66.0 | 0.0% | 66.7% |
| S5 W16 | 3 | $143k | -$23k | 546 | 6.00 | 55.2 | 66.1 | 33.3% | 66.7% |
| S5 W17 | 3 | $161k | $17k | 533 | 5.67 | 55.2 | 66.1 | 0.0% | 33.3% |
| S5 W18 | 3 | $134k | -$26k | 549 | 5.33 | 55.3 | 66.2 | 33.3% | 66.7% |
| S5 W19 | 3 | $150k | $16k | 550 | 6.00 | 55.3 | 66.2 | 0.0% | 33.3% |
| S5 W20 | 3 | $125k | -$25k | 522 | 3.67 | 55.3 | 66.2 | 33.3% | 33.3% |
| S5 W21 | 3 | $135k | $10k | 518 | 6.00 | 55.3 | 66.3 | 0.0% | 33.3% |
| S5 W22 | 3 | $108k | -$27k | 549 | 5.00 | 55.3 | 66.3 | 33.3% | 66.7% |
| S5 W23 | 3 | $126k | $18k | 520 | 5.33 | 55.3 | 66.3 | 0.0% | 33.3% |
| S5 W24 | 3 | $99k | -$27k | 540 | 4.67 | 55.3 | 66.4 | 33.3% | 66.7% |
| S5 W25 final | 3 | $112k | $13k | 564 | 7.33 | 55.4 | 66.5 | 0.0% | 100.0% |
| S5 W26 final | 3 | $100k | -$12k | 576 | 6.33 | 55.4 | 66.5 | 0.0% | 66.7% |
| S5 W27 final | 3 | $172k | $72k | 380 | 3.33 | 58.1 | 66.5 | 0.0% | 50.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 956 | 48.0% | 475 | 55.1% | -7.1% |  |
| balanced × slide | 475 | 55.1% | 956 | 48.0% | 7.1% |  |

### min-maxer/easy/au

- 70 overall (best nine, including recruitment): 66.1 weeks; 16 reached, 4 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 240 of 400; median 24.0 weeks among those who did.
- Reaching potential stars: 296 of 400 (100 already there at week 0); median 31.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 1/366; S3 73/324; S5 104/234.
- Mean XP per completed season 25620; mean level-ups per completed season 253.9.
- Cash: opening 300000; mean weekly change -1774; mean weeks in debt 58.5.
- Bankruptcy warnings: 1187; forced sales: 55; sacked with missed solvency objective: 4.
- Save round-trips: 96; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- No balance flag on the thresholds above.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -524313 |
| upkeep | -36564 |
| overhead | -110475 |
| sponsor | 0 |
| grant | 74930 |
| gate | 544895 |
| prize | 73622 |
| boardGrant | 18151 |
| events | 4200 |
| transfers | -7663 |
| contracts | -1757 |
| facilities | -86469 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 5 strength 3, handling 2 | $254k | -$46k | 1009 | 5 | 53.2 | W 19-0 Dubbo Diggers |
| S1 trial 2 | kicking | 8 speed 2, strength 3, handling 2, kicking 1 | $219k | -$36k | 1036 | 8 | 53.3 | W 12-4 Wagga Swagmen |
| S1 W1 | kicking | 12 speed 2, strength 6, handling 3, kicking 1 | $199k | -$20k | 1091 | 12 | 53.4 | W 13-10 Launceston Larrikins |
| S1 W2 | kicking | 10 speed 2, strength 5, handling 3 | $166k | -$33k | 1221 | 10 | 53.5 | W 18-0 Darwin Drovers |
| S1 W3 | kicking | 11 speed 2, strength 4, handling 4, kicking 1 | $150k | -$16k | 1253 | 11 | 53.6 | W 19-12 Southport Stingrays |
| S1 W4 | kicking | 15 speed 2, strength 9, handling 3, kicking 1 | $87k | -$63k | 1342 | 15 | 53.8 | W 20-6 Broken Hill Brollys |
| S1 W5 | kicking | 13 speed 3, strength 6, handling 3, kicking 1 | $79k | -$7.3k | 1381 | 13 | 53.9 | W 16-0 Geelong Gulls |
| S1 W6 | kicking | 12 speed 3, strength 5, handling 3, kicking 1 | $23k | -$56k | 1322 | 12 | 54.0 | W 10-8 Wagga Swagmen |
| S1 W7 | kicking | 14 speed 3, strength 5, handling 4, kicking 2 | $39k | $16k | 1414 | 14 | 54.2 | W 22-4 Katherine Crocs |
| S1 W8 | kicking | 18 speed 2, strength 10, stamina 1, handling 4, kicking 1 | $19k | -$20k | 1355 | 18 | 54.4 | W 17-10 Shellharbour Scorpions |
| S1 W9 | kicking | 9 speed 2, strength 4, handling 2, kicking 1 | $28k | $9.9k | 1275 | 9 | 54.5 | L 4-10 Dubbo Diggers |
| S1 W10 | kicking | 13 speed 4, strength 6, handling 3 | -$8.3k | -$37k | 1256 | 13 | 55.4 | W 13-6 Mackay Marlins |
| S1 W11 | kicking | 12 speed 2, strength 5, stamina 1, handling 3, kicking 1 | $3.3k | $12k | 1374 | 12 | 55.5 | W 20-10 Ballarat Bushrangers |
| S1 W12 | kicking | 11 speed 1, strength 3, stamina 2, handling 4, kicking 1 | -$19k | -$22k | 1254 | 11 | 55.6 | D 6-6 Cairns Cyclones |
| S1 W13 | kicking | 16 speed 2, strength 4, stamina 5, handling 4, kicking 1 | -$8.5k | $10k | 1336 | 16 | 55.7 | W 13-0 Toowoomba Thunder |
| S1 W14 | kicking | 11 speed 1, strength 1, stamina 4, handling 4, kicking 1 | -$30k | -$22k | 1219 | 11 | 55.8 | L 4-16 Woolloomooloo Wolves |
| S1 W15 | kicking | 14 speed 5, strength 3, stamina 2, handling 3, kicking 1 | -$21k | $9.2k | 1242 | 14 | 56.0 | W 12-10 Redcliffe Reapers |
| S1 W16 | kicking | 12 speed 1, strength 1, stamina 6, handling 2, kicking 2 | -$43k | -$22k | 1441 | 12 | 56.1 | W 26-4 Launceston Larrikins |
| S1 W17 | kicking | 16 speed 2, strength 4, stamina 6, handling 2, kicking 2 | -$34k | $9.2k | 1374 | 16 | 56.2 | W 14-4 Darwin Drovers |
| S1 W18 | kicking | 12 speed 1, strength 1, stamina 4, handling 3, kicking 3 | -$56k | -$22k | 1319 | 12 | 56.4 | W 9-6 Southport Stingrays |
| S1 W19 | kicking | 12 speed 3, strength 2, stamina 2, handling 2, kicking 3 | -$45k | $11k | 1138 | 12 | 56.5 | D 10-10 Broken Hill Brollys |
| S1 W20 | kicking | 10 speed 1, stamina 4, kicking 4, footyIQ 1 | -$67k | -$22k | 1209 | 10 | 56.6 | W 14-6 Geelong Gulls |
| S1 W21 | kicking | 12 speed 3, stamina 6, handling 1, kicking 2 | -$60k | $6.4k | 1278 | 12 | 56.7 | W 6-5 Wagga Swagmen |
| S1 W22 | kicking | 16 speed 4, strength 3, stamina 3, handling 2, kicking 3, footyIQ 1 | -$82k | -$22k | 1202 | 16 | 56.8 | W 6-4 Katherine Crocs |
| S1 W23 | kicking | 9 speed 1, stamina 2, handling 2, kicking 2, footyIQ 2 | -$76k | $6.4k | 1309 | 9 | 56.9 | W 6-0 Shellharbour Scorpions |
| S1 W24 | kicking | 12 speed 2, strength 1, stamina 3, handling 2, kicking 2, footyIQ 2 | -$98k | -$22k | 1175 | 12 | 57.0 | L 0-12 Dubbo Diggers |
| S1 W25 final | kicking | 12 speed 3, stamina 3, handling 1, kicking 4, footyIQ 1 | -$79k | $18k | 1339 | 12 | 57.1 | W 6-0 Redcliffe Reapers |
| S1 W26 final | kicking | 23 speed 6, strength 4, stamina 3, handling 3, kicking 4, footyIQ 3 | -$58k | $21k | 1323 | 23 | 57.4 | W 11-4 Katherine Crocs |
| S1 W27 final | kicking | 8 speed 2, stamina 1, handling 1, kicking 3, footyIQ 1 | $109k | $167k | 1249 | 8 | 59.6 | W 15-10 Toowoomba Thunder |
| S2 trial 1 | kicking | 11 speed 2, strength 1, stamina 1, handling 1, kicking 3, footyIQ 3 | $47k | -$63k | 1106 | 11 | 59.7 | W 13-4 Katherine Crocs |
| S2 trial 2 | kicking | 10 speed 1, strength 1, stamina 2, handling 3, kicking 2, footyIQ 1 | $28k | -$19k | 1117 | 10 | 59.9 | W 24-0 Dubbo Diggers |
| S2 W1 | kicking | 13 speed 5, stamina 1, handling 1, kicking 2, footyIQ 4 | $49k | $21k | 1253 | 13 | 60.0 | W 23-0 Launceston Larrikins |
| S2 W2 | kicking | 12 speed 3, strength 2, stamina 2, handling 1, kicking 1, footyIQ 3 | $30k | -$19k | 1130 | 12 | 60.2 | W 6-4 Darwin Drovers |
| S2 W3 | kicking | 14 speed 2, strength 1, stamina 1, handling 2, kicking 1, footyIQ 7 | $52k | $22k | 1211 | 14 | 60.3 | W 17-12 Southport Stingrays |
| S2 W4 | kicking | 12 speed 3, strength 1, stamina 1, handling 2, footyIQ 5 | $33k | -$19k | 1117 | 12 | 60.5 | W 26-0 Broken Hill Brollys |
| S2 W5 | kicking | 9 speed 2, strength 1, stamina 3, handling 1, footyIQ 2 | $55k | $22k | 1059 | 9 | 60.6 | W 12-4 Geelong Gulls |
| S2 W6 | kicking | 13 speed 3, strength 1, stamina 1, footyIQ 8 | $37k | -$19k | 1226 | 13 | 60.7 | W 22-2 Wagga Swagmen |
| S2 W7 | kicking | 12 speed 3, strength 1, stamina 1, handling 3, footyIQ 4 | $58k | $22k | 1287 | 12 | 60.9 | W 29-10 Katherine Crocs |
| S2 W8 | kicking | 12 speed 2, stamina 1, handling 1, footyIQ 8 | $40k | -$19k | 1186 | 12 | 61.0 | W 18-11 Shellharbour Scorpions |
| S2 W9 | kicking | 9 speed 2, strength 1, stamina 2, handling 1, footyIQ 3 | $61k | $22k | 1071 | 9 | 61.1 | L 4-10 Dubbo Diggers |
| S2 W10 | kicking | 12 speed 1, strength 3, stamina 1, footyIQ 7 | $43k | -$19k | 1142 | 12 | 61.3 | W 10-0 Mackay Marlins |
| S2 W11 | kicking | 12 speed 3, handling 3, footyIQ 6 | $64k | $22k | 1210 | 12 | 61.4 | W 14-0 Ballarat Bushrangers |
| S2 W12 | kicking | 13 speed 4, strength 2, handling 1, footyIQ 6 | $46k | -$19k | 1216 | 13 | 61.6 | W 20-13 Cairns Cyclones |
| S2 W13 | kicking | 9 speed 2, handling 1, footyIQ 6 | $67k | $22k | 1154 | 9 | 61.7 | D 7-7 Toowoomba Thunder |
| S2 W14 | kicking | 13 speed 2, strength 1, stamina 2, footyIQ 8 | $24k | -$44k | 1301 | 13 | 61.9 | W 30-13 Woolloomooloo Wolves |
| S2 W15 | kicking | 15 speed 3, strength 1, handling 3, footyIQ 8 | $45k | $22k | 1194 | 15 | 62.0 | W 16-0 Redcliffe Reapers |
| S2 W16 | kicking | 10 speed 1, strength 2, stamina 1, handling 1, footyIQ 5 | $26k | -$19k | 1170 | 11 | 62.2 | W 10-0 Launceston Larrikins |
| S2 W17 | kicking | 8 speed 5, handling 1, footyIQ 2 | $48k | $22k | 1100 | 11 | 62.3 | L 6-10 Darwin Drovers |
| S2 W18 | kicking | 9 speed 3, strength 1, stamina 1, handling 2, footyIQ 2 | $29k | -$19k | 1300 | 14 | 62.4 | W 28-6 Southport Stingrays |
| S2 W19 | kicking | 7 speed 2, strength 1, handling 1, footyIQ 3 | $51k | $22k | 1198 | 11 | 62.4 | D 10-10 Broken Hill Brollys |
| S2 W20 | kicking | 6 speed 2, stamina 1, handling 1, footyIQ 2 | $32k | -$19k | 1249 | 10 | 62.5 | W 14-4 Geelong Gulls |
| S2 W21 | kicking | 8 speed 4, strength 1, handling 1, footyIQ 2 | $54k | $22k | 1253 | 13 | 62.6 | W 21-10 Wagga Swagmen |
| S2 W22 | kicking | 7 speed 3, stamina 1, handling 2, footyIQ 1 | $36k | -$19k | 1276 | 12 | 62.7 | W 30-10 Katherine Crocs |
| S2 W23 | kicking | 10 speed 6, strength 2, stamina 1, handling 1 | $57k | $22k | 1312 | 15 | 62.8 | W 29-0 Shellharbour Scorpions |
| S2 W24 | kicking | 8 speed 4, strength 1, kicking 1, footyIQ 2 | $40k | -$18k | 1208 | 13 | 62.9 | W 20-0 Dubbo Diggers |
| S2 W25 final | kicking | 7 speed 4, stamina 1, kicking 1, footyIQ 1 | $62k | $23k | 1084 | 10 | 62.9 | L 6-8 Ballarat Bushrangers |
| S2 W26 final | kicking | 4 speed 1, handling 1, footyIQ 2 | $40k | -$22k | 265 | 6 | 63.0 | no match |
| S2 W27 final | kicking | 2 speed 2 | $51k | $11k | 258 | 2 | 63.8 | no match |
| S3 trial 1 | kicking | 6 speed 4, strength 1, footyIQ 1 | $33k | -$18k | 1101 | 9 | 63.9 | W 25-4 Woolloomooloo Wolves |
| S3 trial 2 | kicking | 10 speed 5, strength 1, stamina 1, handling 1, footyIQ 2 | $24k | -$8.3k | 1204 | 15 | 64.0 | W 35-0 Southport Stingrays |
| S3 W1 | kicking | 6 speed 5, strength 1 | $47k | $23k | 1046 | 8 | 64.1 | W 12-0 Launceston Larrikins |
| S3 W2 | kicking | 6 speed 1, strength 1, handling 1, footyIQ 3 | $30k | -$17k | 1047 | 10 | 64.2 | W 16-4 Darwin Drovers |
| S3 W3 | kicking | 5 speed 3, strength 1, footyIQ 1 | $51k | $21k | 1103 | 10 | 64.2 | W 23-0 Southport Stingrays |
| S3 W4 | kicking | 6 speed 1, stamina 2, footyIQ 3 | $33k | -$17k | 1032 | 12 | 64.3 | W 16-4 Broken Hill Brollys |
| S3 W5 | kicking | 6 speed 5, strength 1 | $61k | $28k | 1249 | 10 | 64.4 | W 36-6 Geelong Gulls |
| S3 W6 | kicking | 6 speed 2, strength 1, footyIQ 3 | $44k | -$17k | 1074 | 13 | 64.5 | W 16-0 Wagga Swagmen |
| S3 W7 | kicking | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $67k | $23k | 1101 | 11 | 64.5 | W 26-12 Katherine Crocs |
| S3 W8 | kicking | 4 speed 1, strength 1, footyIQ 2 | $40k | -$26k | 1032 | 11 | 64.0 | W 17-13 Shellharbour Scorpions |
| S3 W9 | kicking | 3 speed 1, footyIQ 2 | $62k | $21k | 1120 | 12 | 64.0 | W 37-0 Dubbo Diggers |
| S3 W10 | kicking | 1 footyIQ 1 | $42k | -$19k | 1029 | 7 | 64.0 | W 10-0 Mackay Marlins |
| S3 W11 | kicking | 5 speed 1, stamina 1, footyIQ 3 | $64k | $21k | 1038 | 11 | 64.0 | W 22-4 Ballarat Bushrangers |
| S3 W12 | kicking | 3 speed 1, strength 1, footyIQ 1 | $45k | -$19k | 1144 | 10 | 64.1 | W 28-0 Cairns Cyclones |
| S3 W13 | kicking | 4 stamina 1, footyIQ 3 | $69k | $24k | 1026 | 12 | 64.1 | D 11-11 Toowoomba Thunder |
| S3 W14 | kicking | 3 speed 1, strength 1, footyIQ 1 | $39k | -$30k | 1089 | 10 | 63.9 | W 28-12 Woolloomooloo Wolves |
| S3 W15 | kicking | 4 stamina 1, footyIQ 3 | $59k | $20k | 921 | 10 | 63.9 | W 6-0 Redcliffe Reapers |
| S3 W16 | kicking | 4 speed 2, footyIQ 2 | $39k | -$20k | 1016 | 8 | 63.9 | W 16-12 Launceston Larrikins |
| S3 W17 | kicking | 4 speed 1, strength 1, footyIQ 2 | $60k | $20k | 1082 | 12 | 64.0 | W 24-4 Darwin Drovers |
| S3 W18 | kicking | 3 stamina 1, footyIQ 2 | $40k | -$20k | 1108 | 10 | 64.0 | W 26-12 Southport Stingrays |
| S3 W19 | kicking | 4 speed 2, footyIQ 2 | $60k | $20k | 1144 | 12 | 64.0 | W 37-4 Broken Hill Brollys |
| S3 W20 | kicking | 5 speed 1, strength 1, footyIQ 3 | $40k | -$20k | 1154 | 12 | 64.1 | W 36-0 Geelong Gulls |
| S3 W21 | kicking | 4 strength 2, stamina 1, footyIQ 1 | $60k | $20k | 1105 | 12 | 64.1 | W 33-0 Wagga Swagmen |
| S3 W22 | kicking | 6 speed 2, stamina 1, handling 1, footyIQ 2 | $40k | -$20k | 1012 | 12 | 64.1 | W 12-0 Katherine Crocs |
| S3 W23 | kicking | 3 speed 1, handling 1, footyIQ 1 | $61k | $20k | 1074 | 10 | 64.2 | W 22-0 Shellharbour Scorpions |
| S3 W24 | kicking | 4 speed 1, footyIQ 3 | $40k | -$20k | 1072 | 11 | 64.2 | W 16-8 Dubbo Diggers |
| S3 W25 final | kicking | 3 strength 1, footyIQ 2 | $60k | $20k | 957 | 9 | 64.2 | W 18-8 Geelong Gulls |
| S3 W26 final | kicking | 2 strength 1, footyIQ 1 | $80k | $20k | 845 | 7 | 64.2 | L 8-13 Toowoomba Thunder |
| S3 W27 final | kicking | 2 strength 2 | $70k | -$9.9k | 232 | 3 | 65.0 | no match |
| S4 trial 1 | kicking | 2 speed 1, footyIQ 1 | $21k | -$49k | 1018 | 9 | 65.0 | W 34-0 Wagga Swagmen |
| S4 trial 2 | kicking | 3 strength 1, footyIQ 2 | -$7.5k | -$29k | 1007 | 10 | 65.0 | W 26-0 Geelong Gulls |
| S4 W1 | kicking | 1 strength 1 | $3.9k | $11k | 994 | 9 | 65.0 | W 32-10 Launceston Larrikins |
| S4 W2 | kicking | 6 speed 1, strength 2, stamina 2, footyIQ 1 | -$25k | -$29k | 861 | 12 | 65.0 | L 10-12 Darwin Drovers |
| S4 W3 | kicking | 2 speed 1, footyIQ 1 | -$14k | $11k | 894 | 8 | 65.0 | W 16-7 Southport Stingrays |
| S4 W4 | kicking | 4 speed 1, strength 2, footyIQ 1 | -$43k | -$29k | 980 | 11 | 65.1 | W 23-8 Broken Hill Brollys |
| S4 W5 | kicking | 4 speed 2, strength 2 | -$31k | $11k | 1003 | 9 | 65.1 | W 22-4 Geelong Gulls |
| S4 W6 | kicking | 3 strength 1, stamina 1, footyIQ 1 | -$60k | -$29k | 983 | 10 | 65.1 | W 24-0 Wagga Swagmen |
| S4 W7 | kicking | 4 strength 1, stamina 1, footyIQ 2 | -$49k | $11k | 897 | 10 | 65.1 | W 6-4 Katherine Crocs |
| S4 W8 | kicking | 0 | -$78k | -$29k | 1058 | 7 | 65.1 | W 37-0 Shellharbour Scorpions |
| S4 W9 | kicking | 5 speed 2, strength 1, stamina 1, footyIQ 1 | -$66k | $11k | 971 | 11 | 65.2 | W 25-4 Dubbo Diggers |
| S4 W10 | kicking | 3 speed 1, strength 1, stamina 1 | -$94k | -$28k | 966 | 10 | 65.2 | W 18-0 Mackay Marlins |
| S4 W11 | kicking | 4 strength 1, stamina 1, footyIQ 2 | -$83k | $11k | 1014 | 12 | 65.2 | W 32-10 Ballarat Bushrangers |
| S4 W12 | kicking | 3 speed 1, strength 1, stamina 1 | -$112k | -$29k | 923 | 8 | 63.3 | W 18-0 Cairns Cyclones |
| S4 W13 | kicking | 4 strength 1, stamina 1, footyIQ 2 | -$96k | $16k | 835 | 9 | 63.3 | L 4-11 Toowoomba Thunder |
| S4 W14 | kicking | 2 strength 1, footyIQ 1 | -$120k | -$24k | 740 | 5 | 61.8 | L 7-8 Woolloomooloo Wolves |
| S4 W15 | kicking | 7 speed 3, strength 2, stamina 1, footyIQ 1 | -$100k | $20k | 638 | 9 | 60.6 | W 10-4 Redcliffe Reapers |
| S4 W16 | kicking | 2 stamina 2 | -$118k | -$18k | 551 | 4 | 59.1 | D 0-0 Launceston Larrikins |
| S4 W17 | kicking | 7 strength 2, stamina 2, kicking 1, footyIQ 2 | -$93k | $25k | 555 | 7 | 59.2 | L 6-12 Darwin Drovers |
| S4 W18 | kicking | 4 speed 1, strength 2, stamina 1 | -$111k | -$18k | 598 | 6 | 59.3 | W 14-0 Southport Stingrays |
| S4 W19 | kicking | 5 speed 1, strength 2, stamina 1, footyIQ 1 | -$86k | $25k | 578 | 5 | 59.3 | W 4-0 Broken Hill Brollys |
| S4 W20 | kicking | 5 speed 2, strength 2, stamina 1 | -$102k | -$16k | 537 | 6 | 59.4 | L 0-6 Geelong Gulls |
| S4 W21 | kicking | 4 strength 1, stamina 1, footyIQ 2 | -$75k | $27k | 596 | 5 | 59.4 | W 12-0 Wagga Swagmen |
| S4 W22 | kicking | 6 speed 1, strength 3, stamina 2 | -$91k | -$16k | 593 | 7 | 59.5 | L 10-12 Katherine Crocs |
| S4 W23 | kicking | 5 speed 1, strength 1, stamina 2, footyIQ 1 | -$53k | $38k | 605 | 6 | 59.6 | D 14-14 Shellharbour Scorpions |
| S4 W24 | kicking | 3 strength 1, stamina 2 | -$69k | -$17k | 568 | 4 | 59.6 | L 10-12 Dubbo Diggers |
| S4 W25 final | kicking | 7 speed 2, strength 2, stamina 1, footyIQ 2 | -$12k | $57k | 630 | 8 | 59.7 | W 17-4 Southport Stingrays |
| S4 W26 final | kicking | 5 strength 3, stamina 1, handling 1 | $13k | $24k | 612 | 6 | 58.2 | L 4-6 Geelong Gulls |
| S4 W27 final | kicking | 1 stamina 1 | -$20k | -$32k | 133 | 1 | 58.2 | no match |
| S5 trial 1 | kicking | 5 speed 2, strength 2, stamina 1 | -$28k | -$8.3k | 579 | 6 | 58.2 | L 6-7 Broken Hill Brollys |
| S5 trial 2 | kicking | 5 speed 3, stamina 1, footyIQ 1 | -$47k | -$18k | 592 | 5 | 58.3 | W 6-0 Toowoomba Thunder |
| S5 W1 | kicking | 4 strength 2, stamina 1, footyIQ 1 | -$21k | $25k | 578 | 5 | 58.3 | W 1-0 Launceston Larrikins |
| S5 W2 | kicking | 4 speed 1, strength 1, stamina 2 | -$39k | -$18k | 574 | 5 | 58.4 | L 7-16 Darwin Drovers |
| S5 W3 | kicking | 8 speed 5, strength 1, stamina 1, footyIQ 1 | -$18k | $22k | 559 | 8 | 58.5 | L 0-6 Southport Stingrays |
| S5 W4 | kicking | 2 stamina 1, footyIQ 1 | -$36k | -$19k | 600 | 3 | 58.5 | W 12-6 Broken Hill Brollys |
| S5 W5 | kicking | 6 speed 1, strength 1, stamina 2, footyIQ 2 | -$15k | $22k | 589 | 8 | 58.6 | L 7-9 Geelong Gulls |
| S5 W6 | kicking | 6 speed 2, strength 1, stamina 1, footyIQ 2 | -$28k | -$14k | 559 | 5 | 58.6 | L 0-13 Wagga Swagmen |
| S5 W7 | kicking | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | -$6.6k | $22k | 576 | 6 | 58.7 | L 4-12 Katherine Crocs |
| S5 W8 | kicking | 5 speed 3, stamina 1, footyIQ 1 | -$25k | -$19k | 672 | 7 | 58.7 | W 24-4 Shellharbour Scorpions |
| S5 W9 | kicking | 6 speed 3, strength 1, footyIQ 2 | -$3.5k | $22k | 628 | 7 | 58.8 | W 7-4 Dubbo Diggers |
| S5 W10 | kicking | 4 speed 2, stamina 2 | -$22k | -$19k | 568 | 6 | 58.9 | L 4-16 Mackay Marlins |
| S5 W11 | kicking | 4 speed 2, stamina 1, footyIQ 1 | -$445 | $22k | 592 | 6 | 58.9 | L 11-12 Ballarat Bushrangers |
| S5 W12 | kicking | 3 speed 2, stamina 1 | -$19k | -$19k | 671 | 4 | 58.9 | W 18-8 Cairns Cyclones |
| S5 W13 | kicking | 6 speed 4, footyIQ 2 | $2.6k | $22k | 645 | 7 | 59.0 | W 7-6 Toowoomba Thunder |
| S5 W14 | kicking | 4 speed 1, stamina 2, footyIQ 1 | -$14k | -$17k | 650 | 7 | 59.0 | W 15-6 Woolloomooloo Wolves |
| S5 W15 | kicking | 6 speed 3, stamina 2, handling 1 | $7.7k | $22k | 641 | 9 | 59.1 | D 12-12 Redcliffe Reapers |
| S5 W16 | kicking | 4 speed 2, stamina 1, footyIQ 1 | -$9.0k | -$17k | 685 | 5 | 59.1 | W 27-8 Launceston Larrikins |
| S5 W17 | kicking | 3 speed 1, footyIQ 2 | $15k | $24k | 649 | 5 | 59.2 | W 15-4 Darwin Drovers |
| S5 W18 | kicking | 6 speed 5, stamina 1 | -$3.6k | -$18k | 624 | 8 | 59.2 | W 10-0 Southport Stingrays |
| S5 W19 | kicking | 4 speed 2, stamina 1, footyIQ 1 | $18k | $22k | 671 | 6 | 59.3 | W 8-6 Broken Hill Brollys |
| S5 W20 | kicking | 7 speed 3, stamina 2, footyIQ 2 | $687 | -$18k | 676 | 8 | 59.4 | W 10-4 Geelong Gulls |
| S5 W21 | kicking | 2 speed 1, footyIQ 1 | $23k | $23k | 700 | 5 | 59.4 | W 27-7 Wagga Swagmen |
| S5 W22 | kicking | 3 speed 2, stamina 1 | $5.9k | -$18k | 559 | 5 | 59.4 | L 0-17 Katherine Crocs |
| S5 W23 | kicking | 5 speed 2, stamina 2, footyIQ 1 | $29k | $23k | 574 | 6 | 59.4 | L 0-8 Shellharbour Scorpions |
| S5 W24 | kicking | 8 speed 5, stamina 1, kicking 1, footyIQ 1 | $11k | -$18k | 679 | 9 | 59.5 | W 13-6 Dubbo Diggers |
| S5 W25 final | kicking | 2 footyIQ 2 | $31k | $21k | 645 | 4 | 59.5 | W 12-4 Dubbo Diggers |
| S5 W26 final | kicking | 5 speed 3, stamina 2 | $53k | $21k | 570 | 7 | 59.6 | W 4-0 Katherine Crocs |
| S5 W27 final | kicking | 5 speed 2, stamina 1, footyIQ 2 | $107k | $54k | 548 | 7 | 61.1 | L 4-17 Woolloomooloo Wolves |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $253k | -$47k | 729 | 1.75 | 53.3 | 59.0 | 0.0% | 75.0% |
| S1 trial 2 | 20 | $218k | -$35k | 762 | 6.65 | 53.3 | 59.1 | 0.0% | 65.0% |
| S1 W1 | 20 | $198k | -$20k | 793 | 6.60 | 53.4 | 59.3 | 0.0% | 70.0% |
| S1 W2 | 20 | $163k | -$35k | 868 | 6.90 | 53.4 | 59.4 | 0.0% | 60.0% |
| S1 W3 | 20 | $142k | -$21k | 904 | 8.25 | 53.5 | 59.6 | 0.0% | 65.0% |
| S1 W4 | 20 | $76k | -$65k | 953 | 10.00 | 53.6 | 59.7 | 0.0% | 85.0% |
| S1 W5 | 20 | $68k | -$8.4k | 986 | 9.25 | 53.7 | 59.9 | 0.0% | 55.0% |
| S1 W6 | 20 | $32k | -$36k | 1000 | 11.65 | 53.8 | 60.1 | 0.0% | 85.0% |
| S1 W7 | 20 | $42k | $10k | 1001 | 9.15 | 53.9 | 60.3 | 0.0% | 60.0% |
| S1 W8 | 20 | $21k | -$21k | 998 | 11.35 | 54.0 | 60.4 | 0.0% | 80.0% |
| S1 W9 | 20 | $29k | $8.2k | 1000 | 7.65 | 54.1 | 60.6 | 0.0% | 70.0% |
| S1 W10 | 20 | $7.7k | -$21k | 997 | 10.05 | 54.2 | 60.9 | 15.0% | 65.0% |
| S1 W11 | 20 | $19k | $12k | 1023 | 11.00 | 54.3 | 61.1 | 5.0% | 70.0% |
| S1 W12 | 20 | -$1.1k | -$20k | 982 | 7.85 | 54.4 | 61.2 | 65.0% | 55.0% |
| S1 W13 | 20 | $12k | $13k | 1000 | 12.50 | 54.5 | 61.4 | 25.0% | 65.0% |
| S1 W14 | 20 | -$8.8k | -$20k | 993 | 9.90 | 54.6 | 61.6 | 75.0% | 55.0% |
| S1 W15 | 20 | $3.4k | $12k | 1008 | 9.95 | 54.7 | 61.8 | 50.0% | 55.0% |
| S1 W16 | 20 | -$17k | -$21k | 1022 | 8.65 | 54.8 | 62.0 | 90.0% | 80.0% |
| S1 W17 | 20 | -$8.4k | $8.9k | 1028 | 10.85 | 54.9 | 62.2 | 75.0% | 75.0% |
| S1 W18 | 20 | -$29k | -$21k | 1011 | 9.35 | 55.0 | 62.5 | 95.0% | 75.0% |
| S1 W19 | 20 | -$21k | $8.4k | 992 | 11.90 | 55.1 | 62.6 | 95.0% | 60.0% |
| S1 W20 | 20 | -$42k | -$21k | 1019 | 9.15 | 55.2 | 62.8 | 100.0% | 90.0% |
| S1 W21 | 20 | -$31k | $11k | 1029 | 8.80 | 55.3 | 63.1 | 95.0% | 80.0% |
| S1 W22 | 20 | -$52k | -$21k | 1029 | 12.25 | 55.4 | 63.3 | 100.0% | 55.0% |
| S1 W23 | 20 | -$42k | $9.8k | 1023 | 9.30 | 55.5 | 63.5 | 95.0% | 70.0% |
| S1 W24 | 20 | -$63k | -$21k | 1013 | 8.95 | 55.6 | 63.7 | 100.0% | 75.0% |
| S1 W25 final | 20 | -$47k | $16k | 962 | 9.55 | 55.7 | 63.8 | 95.0% | 72.2% |
| S1 W26 final | 20 | -$43k | $3.4k | 790 | 12.40 | 55.6 | 63.7 | 95.0% | 57.1% |
| S1 W27 final | 20 | $30k | $74k | 581 | 4.95 | 56.3 | 63.5 | 40.0% | 100.0% |
| S2 trial 1 | 20 | -$4.6k | -$35k | 968 | 9.10 | 56.3 | 63.7 | 55.0% | 90.0% |
| S2 trial 2 | 20 | -$27k | -$22k | 964 | 9.10 | 56.2 | 63.5 | 55.0% | 70.0% |
| S2 W1 | 20 | -$11k | $16k | 958 | 8.65 | 56.3 | 63.6 | 55.0% | 65.0% |
| S2 W2 | 20 | -$30k | -$19k | 961 | 9.85 | 56.2 | 63.5 | 55.0% | 85.0% |
| S2 W3 | 20 | -$11k | $19k | 942 | 9.20 | 56.3 | 63.6 | 50.0% | 55.0% |
| S2 W4 | 20 | -$29k | -$18k | 956 | 11.30 | 56.4 | 63.7 | 55.0% | 80.0% |
| S2 W5 | 20 | -$9.0k | $20k | 970 | 8.75 | 56.4 | 63.9 | 50.0% | 80.0% |
| S2 W6 | 20 | -$31k | -$22k | 970 | 9.65 | 56.5 | 64.0 | 60.0% | 85.0% |
| S2 W7 | 20 | -$11k | $21k | 966 | 9.80 | 56.6 | 64.2 | 45.0% | 85.0% |
| S2 W8 | 20 | -$30k | -$19k | 963 | 9.00 | 56.7 | 64.3 | 55.0% | 75.0% |
| S2 W9 | 20 | -$10k | $20k | 964 | 9.25 | 56.8 | 64.5 | 50.0% | 70.0% |
| S2 W10 | 20 | -$30k | -$20k | 983 | 11.15 | 56.9 | 64.7 | 60.0% | 80.0% |
| S2 W11 | 20 | -$9.5k | $21k | 987 | 9.95 | 57.0 | 64.9 | 55.0% | 70.0% |
| S2 W12 | 20 | -$30k | -$20k | 988 | 9.20 | 57.1 | 65.1 | 60.0% | 75.0% |
| S2 W13 | 20 | -$8.9k | $21k | 1003 | 9.55 | 57.2 | 65.3 | 55.0% | 60.0% |
| S2 W14 | 20 | -$30k | -$21k | 1011 | 9.45 | 57.3 | 65.5 | 65.0% | 80.0% |
| S2 W15 | 20 | -$9.5k | $21k | 994 | 10.85 | 57.4 | 65.7 | 55.0% | 60.0% |
| S2 W16 | 20 | -$29k | -$19k | 999 | 10.15 | 57.5 | 65.9 | 65.0% | 80.0% |
| S2 W17 | 20 | -$8.9k | $20k | 956 | 9.25 | 57.6 | 66.1 | 50.0% | 30.0% |
| S2 W18 | 20 | -$27k | -$18k | 1028 | 10.60 | 57.7 | 66.1 | 70.0% | 85.0% |
| S2 W19 | 20 | -$6.6k | $20k | 993 | 10.00 | 57.8 | 66.4 | 50.0% | 65.0% |
| S2 W20 | 20 | -$24k | -$17k | 998 | 9.90 | 57.8 | 66.5 | 65.0% | 70.0% |
| S2 W21 | 20 | -$3.1k | $21k | 1016 | 9.25 | 57.9 | 66.7 | 50.0% | 85.0% |
| S2 W22 | 20 | -$21k | -$17k | 1003 | 10.45 | 58.0 | 66.9 | 65.0% | 65.0% |
| S2 W23 | 20 | $555 | $21k | 1010 | 9.70 | 58.1 | 67.1 | 50.0% | 75.0% |
| S2 W24 | 20 | -$19k | -$19k | 1000 | 12.15 | 58.2 | 67.2 | 65.0% | 80.0% |
| S2 W25 final | 20 | -$177 | $19k | 974 | 9.45 | 58.3 | 67.4 | 45.0% | 63.2% |
| S2 W26 final | 20 | $6.2k | $6.4k | 756 | 7.70 | 58.3 | 67.6 | 45.0% | 92.3% |
| S2 W27 final | 20 | $95k | $88k | 705 | 6.85 | 59.0 | 67.2 | 25.0% | 83.3% |
| S3 trial 1 | 20 | $39k | -$55k | 922 | 8.70 | 58.8 | 67.5 | 25.0% | 80.0% |
| S3 trial 2 | 20 | $16k | -$24k | 926 | 8.95 | 58.9 | 67.7 | 25.0% | 70.0% |
| S3 W1 | 20 | $34k | $19k | 926 | 9.90 | 59.0 | 67.8 | 25.0% | 75.0% |
| S3 W2 | 20 | $11k | -$23k | 940 | 9.00 | 59.1 | 68.0 | 25.0% | 95.0% |
| S3 W3 | 20 | $32k | $21k | 917 | 9.35 | 59.2 | 68.1 | 25.0% | 65.0% |
| S3 W4 | 20 | $10k | -$21k | 909 | 8.50 | 59.2 | 68.3 | 25.0% | 65.0% |
| S3 W5 | 20 | $32k | $21k | 922 | 8.45 | 59.2 | 68.4 | 25.0% | 70.0% |
| S3 W6 | 20 | $13k | -$18k | 920 | 9.45 | 59.2 | 68.4 | 25.0% | 80.0% |
| S3 W7 | 20 | $33k | $19k | 925 | 9.40 | 59.3 | 68.6 | 20.0% | 70.0% |
| S3 W8 | 20 | $7.6k | -$25k | 947 | 10.40 | 59.3 | 68.6 | 30.0% | 95.0% |
| S3 W9 | 20 | $28k | $21k | 934 | 9.45 | 59.4 | 68.7 | 20.0% | 80.0% |
| S3 W10 | 20 | $7.4k | -$21k | 912 | 8.25 | 59.4 | 68.7 | 30.0% | 70.0% |
| S3 W11 | 20 | $29k | $22k | 928 | 8.70 | 59.5 | 68.8 | 15.0% | 85.0% |
| S3 W12 | 20 | $5.7k | -$23k | 949 | 9.75 | 59.6 | 69.1 | 35.0% | 85.0% |
| S3 W13 | 20 | $27k | $22k | 955 | 9.80 | 59.6 | 69.2 | 15.0% | 85.0% |
| S3 W14 | 20 | $9.2k | -$18k | 947 | 9.15 | 59.7 | 69.3 | 30.0% | 80.0% |
| S3 W15 | 20 | $30k | $21k | 950 | 9.65 | 59.8 | 69.4 | 15.0% | 80.0% |
| S3 W16 | 20 | $12k | -$18k | 940 | 9.40 | 59.8 | 69.6 | 30.0% | 75.0% |
| S3 W17 | 20 | $33k | $20k | 948 | 9.50 | 59.9 | 69.7 | 20.0% | 80.0% |
| S3 W18 | 20 | $14k | -$19k | 934 | 9.15 | 60.0 | 69.8 | 30.0% | 60.0% |
| S3 W19 | 20 | $36k | $21k | 954 | 9.40 | 60.0 | 70.0 | 20.0% | 80.0% |
| S3 W20 | 20 | $17k | -$19k | 942 | 9.35 | 60.0 | 70.1 | 25.0% | 75.0% |
| S3 W21 | 20 | $38k | $21k | 944 | 11.00 | 60.1 | 70.2 | 20.0% | 70.0% |
| S3 W22 | 20 | $14k | -$25k | 920 | 9.35 | 60.1 | 70.3 | 25.0% | 70.0% |
| S3 W23 | 20 | $34k | $21k | 935 | 9.00 | 60.2 | 70.4 | 20.0% | 70.0% |
| S3 W24 | 20 | $14k | -$20k | 960 | 9.15 | 60.2 | 70.5 | 25.0% | 80.0% |
| S3 W25 final | 20 | $37k | $23k | 916 | 9.10 | 60.2 | 70.6 | 10.0% | 89.5% |
| S3 W26 final | 20 | $45k | $8.8k | 850 | 8.40 | 60.2 | 70.7 | 10.0% | 82.4% |
| S3 W27 final | 20 | $143k | $98k | 723 | 6.90 | 61.1 | 70.6 | 10.0% | 85.7% |
| S4 trial 1 | 18 | $90k | -$68k | 866 | 9.44 | 61.4 | 71.5 | 5.6% | 72.2% |
| S4 trial 2 | 18 | $43k | -$47k | 859 | 7.67 | 61.4 | 71.6 | 11.1% | 61.1% |
| S4 W1 | 18 | $55k | $11k | 863 | 9.28 | 61.5 | 71.7 | 5.6% | 83.3% |
| S4 W2 | 18 | $25k | -$29k | 859 | 8.33 | 61.5 | 71.8 | 11.1% | 77.8% |
| S4 W3 | 18 | $42k | $16k | 846 | 8.00 | 61.5 | 71.9 | 11.1% | 72.2% |
| S4 W4 | 18 | $17k | -$25k | 880 | 8.44 | 61.6 | 71.9 | 11.1% | 100.0% |
| S4 W5 | 18 | $33k | $16k | 878 | 9.11 | 61.6 | 72.0 | 11.1% | 77.8% |
| S4 W6 | 18 | $9.5k | -$24k | 875 | 9.56 | 61.7 | 72.1 | 27.8% | 77.8% |
| S4 W7 | 18 | $27k | $18k | 860 | 8.56 | 61.7 | 72.2 | 16.7% | 77.8% |
| S4 W8 | 18 | $3.8k | -$23k | 876 | 8.00 | 61.7 | 72.2 | 33.3% | 94.4% |
| S4 W9 | 18 | $20k | $17k | 857 | 8.39 | 61.7 | 72.3 | 27.8% | 66.7% |
| S4 W10 | 18 | -$4.7k | -$25k | 881 | 9.56 | 61.8 | 72.4 | 55.6% | 94.4% |
| S4 W11 | 18 | $13k | $18k | 887 | 8.50 | 61.8 | 72.5 | 27.8% | 88.9% |
| S4 W12 | 18 | -$11k | -$24k | 861 | 8.28 | 61.7 | 72.3 | 61.1% | 77.8% |
| S4 W13 | 18 | $6.3k | $17k | 870 | 8.44 | 61.7 | 72.3 | 38.9% | 88.9% |
| S4 W14 | 18 | -$19k | -$25k | 847 | 8.44 | 61.7 | 72.2 | 66.7% | 61.1% |
| S4 W15 | 18 | -$2.2k | $17k | 848 | 8.78 | 61.7 | 72.1 | 50.0% | 61.1% |
| S4 W16 | 18 | -$26k | -$23k | 844 | 8.28 | 61.5 | 71.8 | 66.7% | 77.8% |
| S4 W17 | 18 | -$8.4k | $17k | 845 | 8.50 | 61.5 | 71.9 | 55.6% | 66.7% |
| S4 W18 | 18 | -$32k | -$24k | 852 | 8.56 | 61.4 | 71.6 | 66.7% | 77.8% |
| S4 W19 | 18 | -$15k | $18k | 862 | 9.56 | 61.4 | 71.5 | 55.6% | 83.3% |
| S4 W20 | 18 | -$37k | -$22k | 826 | 7.78 | 61.1 | 71.0 | 72.2% | 83.3% |
| S4 W21 | 18 | -$16k | $20k | 827 | 8.22 | 61.1 | 71.0 | 61.1% | 83.3% |
| S4 W22 | 18 | -$39k | -$23k | 811 | 7.89 | 60.8 | 70.7 | 72.2% | 83.3% |
| S4 W23 | 18 | -$18k | $21k | 829 | 8.67 | 60.8 | 70.8 | 66.7% | 66.7% |
| S4 W24 | 18 | -$38k | -$20k | 806 | 7.94 | 60.7 | 70.6 | 72.2% | 66.7% |
| S4 W25 final | 18 | $3.7k | $41k | 816 | 8.61 | 60.8 | 70.6 | 55.6% | 83.3% |
| S4 W26 final | 18 | $12k | $8.5k | 703 | 6.83 | 60.6 | 70.6 | 44.4% | 73.3% |
| S4 W27 final | 18 | $84k | $72k | 588 | 6.06 | 61.9 | 70.5 | 22.2% | 91.7% |
| S5 trial 1 | 18 | $26k | -$58k | 730 | 7.33 | 61.7 | 70.6 | 22.2% | 77.8% |
| S5 trial 2 | 18 | $522 | -$26k | 741 | 6.78 | 61.7 | 70.5 | 27.8% | 83.3% |
| S5 W1 | 18 | $19k | $18k | 720 | 7.22 | 61.7 | 70.5 | 22.2% | 72.2% |
| S5 W2 | 18 | -$3.1k | -$22k | 731 | 7.28 | 61.7 | 70.6 | 27.8% | 72.2% |
| S5 W3 | 18 | $15k | $18k | 738 | 7.83 | 61.7 | 70.7 | 27.8% | 72.2% |
| S5 W4 | 18 | -$6.8k | -$22k | 719 | 6.61 | 61.8 | 70.7 | 38.9% | 66.7% |
| S5 W5 | 18 | $12k | $19k | 709 | 7.33 | 61.8 | 70.7 | 33.3% | 50.0% |
| S5 W6 | 18 | -$9.6k | -$22k | 731 | 6.78 | 61.8 | 70.8 | 44.4% | 77.8% |
| S5 W7 | 18 | $8.5k | $18k | 737 | 8.00 | 61.7 | 70.8 | 33.3% | 77.8% |
| S5 W8 | 18 | -$15k | -$23k | 734 | 7.28 | 61.7 | 70.9 | 50.0% | 77.8% |
| S5 W9 | 18 | $3.5k | $18k | 740 | 7.44 | 61.8 | 70.9 | 38.9% | 72.2% |
| S5 W10 | 18 | -$19k | -$22k | 738 | 7.44 | 61.8 | 70.9 | 61.1% | 72.2% |
| S5 W11 | 18 | -$979 | $18k | 749 | 7.56 | 61.8 | 71.0 | 44.4% | 83.3% |
| S5 W12 | 18 | -$23k | -$22k | 719 | 6.67 | 61.8 | 71.0 | 66.7% | 61.1% |
| S5 W13 | 18 | -$5.1k | $18k | 738 | 7.06 | 61.8 | 71.1 | 50.0% | 77.8% |
| S5 W14 | 18 | -$28k | -$23k | 736 | 8.11 | 61.7 | 70.9 | 66.7% | 72.2% |
| S5 W15 | 18 | -$9.7k | $18k | 746 | 7.28 | 61.7 | 70.9 | 55.6% | 77.8% |
| S5 W16 | 18 | -$32k | -$22k | 726 | 6.89 | 61.6 | 70.6 | 72.2% | 61.1% |
| S5 W17 | 18 | -$13k | $19k | 739 | 7.67 | 61.6 | 70.7 | 50.0% | 77.8% |
| S5 W18 | 18 | -$36k | -$23k | 736 | 8.28 | 61.4 | 70.2 | 77.8% | 94.4% |
| S5 W19 | 18 | -$12k | $25k | 722 | 6.78 | 61.4 | 70.2 | 55.6% | 61.1% |
| S5 W20 | 18 | -$34k | -$22k | 726 | 6.78 | 61.3 | 70.1 | 66.7% | 55.6% |
| S5 W21 | 18 | -$12k | $21k | 734 | 6.83 | 61.3 | 70.2 | 55.6% | 88.9% |
| S5 W22 | 18 | -$34k | -$21k | 739 | 7.39 | 61.1 | 70.0 | 66.7% | 77.8% |
| S5 W23 | 18 | -$50 | $34k | 722 | 7.78 | 60.9 | 70.1 | 38.9% | 61.1% |
| S5 W24 | 18 | -$21k | -$21k | 735 | 7.28 | 60.5 | 69.7 | 61.1% | 83.3% |
| S5 W25 final | 18 | $763 | $22k | 717 | 6.72 | 59.3 | 68.8 | 50.0% | 88.2% |
| S5 W26 final | 18 | $10k | $9.6k | 650 | 6.78 | 59.4 | 68.9 | 44.4% | 66.7% |
| S5 W27 final | 18 | $58k | $48k | 497 | 4.72 | 61.0 | 68.5 | 33.3% | 70.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × rush | 68 | 72.8% | 2457 | 77.2% | -4.4% |  |
| all-out × slide | 3 | 100.0% | 2522 | 77.1% | 22.9% |  |
| expansive × slide | 6 | 91.7% | 2519 | 77.1% | 14.6% |  |
| grind × slide | 111 | 78.4% | 2414 | 77.1% | 1.3% |  |
| kick-chase × rush | 2337 | 77.1% | 188 | 77.1% | -0.0% |  |
| block-play | 2525 | 77.1% | 0 | n/a | n/a |  |
| inside-ball | 2525 | 77.1% | 0 | n/a | n/a |  |
| short-side-raid | 2525 | 77.1% | 0 | n/a | n/a |  |

### min-maxer/normal/au

- 70 overall (best nine, including recruitment): 84.2 weeks; 5 reached, 15 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 234 of 400; median 20.5 weeks among those who did.
- Reaching potential stars: 255 of 400 (95 already there at week 0); median 46.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 1/322; S3 45/255; S5 59/147.
- Mean XP per completed season 23373; mean level-ups per completed season 230.8.
- Cash: opening 200000; mean weekly change -2004; mean weeks in debt 62.9.
- Bankruptcy warnings: 1270; forced sales: 92; sacked with missed solvency objective: 13.
- Save round-trips: 80; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: the board is sacking clubs for money. 13 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -488227 |
| upkeep | -23636 |
| overhead | -127961 |
| sponsor | 0 |
| grant | 65166 |
| gate | 507415 |
| prize | 54000 |
| boardGrant | 16000 |
| events | 5628 |
| transfers | -6591 |
| contracts | -940 |
| facilities | -58963 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 4 strength 2, handling 2 | $153k | -$47k | 964 | 4 | 49.4 | W 8-0 Dubbo Diggers |
| S1 trial 2 | kicking | 7 speed 2, strength 3, handling 1, kicking 1 | $116k | -$37k | 931 | 7 | 49.5 | L 0-4 Wagga Swagmen |
| S1 W1 | kicking | 11 speed 2, strength 6, handling 2, kicking 1 | $96k | -$20k | 1009 | 11 | 49.6 | W 12-4 Launceston Larrikins |
| S1 W2 | kicking | 10 speed 2, strength 4, handling 3, kicking 1 | $62k | -$34k | 1175 | 10 | 49.7 | W 7-0 Darwin Drovers |
| S1 W3 | kicking | 13 speed 2, strength 8, handling 3 | $58k | -$4.1k | 1391 | 13 | 49.8 | W 20-12 Southport Stingrays |
| S1 W4 | kicking | 14 speed 2, strength 7, handling 4, kicking 1 | $37k | -$21k | 1192 | 14 | 50.0 | L 6-12 Broken Hill Brollys |
| S1 W5 | kicking | 13 speed 3, strength 6, handling 3, kicking 1 | $45k | $8.3k | 1392 | 13 | 50.1 | W 16-10 Geelong Gulls |
| S1 W6 | kicking | 13 speed 3, strength 6, handling 3, kicking 1 | $23k | -$21k | 1323 | 13 | 50.2 | W 14-8 Wagga Swagmen |
| S1 W7 | kicking | 11 speed 1, strength 6, handling 2, kicking 2 | $31k | $7.6k | 1334 | 11 | 50.3 | W 12-4 Katherine Crocs |
| S1 W8 | kicking | 11 speed 3, strength 4, stamina 1, handling 2, kicking 1 | $9.7k | -$21k | 1151 | 11 | 50.5 | L 0-1 Shellharbour Scorpions |
| S1 W9 | kicking | 14 speed 3, strength 7, handling 3, kicking 1 | $15k | $5.0k | 1153 | 14 | 50.6 | L 0-1 Dubbo Diggers |
| S1 W10 | kicking | 11 speed 3, strength 4, handling 3, kicking 1 | -$20k | -$35k | 1148 | 11 | 51.3 | L 0-1 Mackay Marlins |
| S1 W11 | kicking | 12 speed 3, strength 6, handling 3 | -$19k | $1.3k | 1208 | 12 | 51.5 | W 10-4 Ballarat Bushrangers |
| S1 W12 | kicking | 12 speed 1, strength 4, stamina 3, handling 3, kicking 1 | -$42k | -$23k | 1240 | 12 | 51.6 | W 7-4 Cairns Cyclones |
| S1 W13 | kicking | 14 speed 2, strength 4, stamina 3, handling 4, kicking 1 | -$35k | $6.1k | 1217 | 14 | 51.7 | D 6-6 Toowoomba Thunder |
| S1 W14 | kicking | 8 speed 1, strength 1, stamina 3, handling 2, kicking 1 | -$58k | -$23k | 1146 | 8 | 51.8 | L 6-18 Woolloomooloo Wolves |
| S1 W15 | kicking | 12 speed 1, strength 1, stamina 4, handling 5, kicking 1 | -$51k | $6.8k | 1136 | 12 | 51.9 | L 4-12 Redcliffe Reapers |
| S1 W16 | kicking | 11 speed 3, strength 2, stamina 2, handling 3, kicking 1 | -$74k | -$23k | 1155 | 11 | 52.0 | W 6-0 Launceston Larrikins |
| S1 W17 | kicking | 11 speed 1, strength 1, stamina 5, handling 3, kicking 1 | -$67k | $6.8k | 1114 | 11 | 52.1 | L 0-12 Darwin Drovers |
| S1 W18 | kicking | 14 speed 2, strength 4, stamina 4, handling 4 | -$90k | -$23k | 1259 | 14 | 52.2 | W 6-4 Southport Stingrays |
| S1 W19 | kicking | 12 speed 1, strength 1, stamina 5, handling 3, kicking 2 | -$89k | $680 | 1272 | 12 | 52.3 | W 13-6 Broken Hill Brollys |
| S1 W20 | kicking | 11 speed 2, strength 2, stamina 2, handling 3, kicking 2 | -$112k | -$23k | 1012 | 11 | 50.8 | L 0-4 Geelong Gulls |
| S1 W21 | kicking | 9 speed 3, strength 1, stamina 2, kicking 3 | -$107k | $5.3k | 1050 | 9 | 50.3 | L 0-1 Wagga Swagmen |
| S1 W22 | kicking | 9 speed 3, strength 1, stamina 2, handling 1, kicking 1, footyIQ 1 | -$126k | -$19k | 961 | 9 | 49.6 | L 6-10 Katherine Crocs |
| S1 W23 | kicking | 12 speed 3, strength 3, stamina 1, handling 2, kicking 1, footyIQ 2 | -$116k | $9.6k | 1110 | 12 | 49.6 | D 6-6 Shellharbour Scorpions |
| S1 W24 | kicking | 11 speed 3, strength 2, stamina 1, handling 4, footyIQ 1 | -$134k | -$17k | 1017 | 11 | 49.6 | D 0-0 Dubbo Diggers |
| S1 W25 final | kicking | 10 speed 3, strength 2, handling 2, kicking 2, footyIQ 1 | -$150k | -$17k | 1012 | 10 | 49.0 | W 10-4 Woolloomooloo Wolves |
| S1 W26 final | kicking | 11 speed 3, strength 1, handling 2, kicking 3, footyIQ 2 | -$163k | -$13k | 927 | 11 | 48.8 | L 6-14 Redcliffe Reapers |
| S1 W27 final | kicking | 3 strength 2, handling 1 | -$138k | $25k | 174 | 3 | 48.4 | no match |
| S2 trial 1 | kicking | 6 speed 1, strength 1, kicking 2, footyIQ 2 | -$151k | -$13k | 834 | 6 | 47.7 | W 12-10 Redcliffe Reapers |
| S2 trial 2 | kicking | 8 speed 2, strength 2, handling 1, kicking 1, footyIQ 2 | -$157k | -$6.6k | 836 | 8 | 47.8 | W 6-0 Geelong Gulls |
| S2 W1 | kicking | 7 speed 2, strength 1, handling 2, kicking 2 | -$144k | $14k | 760 | 7 | 47.9 | L 6-13 Launceston Larrikins |
| S2 W2 | kicking | 9 speed 2, strength 1, handling 2, footyIQ 4 | -$157k | -$13k | 770 | 9 | 48.0 | W 12-0 Darwin Drovers |
| S2 W3 | kicking | 6 speed 2, strength 2, footyIQ 2 | -$143k | $14k | 734 | 6 | 48.1 | L 0-1 Southport Stingrays |
| S2 W4 | kicking | 9 speed 2, strength 2, handling 1, footyIQ 4 | -$157k | -$13k | 800 | 9 | 48.3 | L 4-6 Broken Hill Brollys |
| S2 W5 | kicking | 9 speed 3, strength 2, handling 1, kicking 1, footyIQ 2 | -$146k | $11k | 772 | 9 | 48.4 | L 6-14 Geelong Gulls |
| S2 W6 | kicking | 5 speed 1, strength 1, kicking 1, footyIQ 2 | -$159k | -$13k | 813 | 5 | 48.5 | W 4-0 Wagga Swagmen |
| S2 W7 | kicking | 11 speed 2, strength 2, handling 3, footyIQ 4 | -$141k | $18k | 760 | 11 | 48.7 | L 0-10 Katherine Crocs |
| S2 W8 | kicking | 7 speed 2, strength 1, stamina 1, footyIQ 3 | -$153k | -$11k | 862 | 7 | 48.8 | W 8-0 Shellharbour Scorpions |
| S2 W9 | kicking | 7 speed 2, strength 1, handling 1, footyIQ 3 | -$140k | $12k | 745 | 7 | 48.9 | L 0-1 Dubbo Diggers |
| S2 W10 | kicking | 8 speed 1, strength 3, handling 2, footyIQ 2 | -$152k | -$11k | 745 | 8 | 47.9 | W 6-0 Mackay Marlins |
| S2 W11 | kicking | 5 speed 1, strength 2, footyIQ 2 | -$131k | $20k | 616 | 5 | 46.2 | L 0-4 Ballarat Bushrangers |
| S2 W12 | stamina | 8 strength 3, handling 4, footyIQ 1 | -$144k | -$13k | 754 | 8 | 46.4 | W 16-10 Cairns Cyclones |
| S2 W13 | stamina | 6 speed 1, strength 3, footyIQ 2 | -$123k | $21k | 711 | 6 | 46.4 | L 0-10 Toowoomba Thunder |
| S2 W14 | stamina | 10 speed 2, strength 2, handling 4, footyIQ 2 | -$136k | -$13k | 796 | 10 | 46.6 | D 12-12 Woolloomooloo Wolves |
| S2 W15 | stamina | 5 strength 2, stamina 1, footyIQ 2 | -$118k | $18k | 702 | 5 | 46.7 | L 6-8 Redcliffe Reapers |
| S2 W16 | stamina | 9 speed 1, strength 3, stamina 1, handling 1, footyIQ 3 | -$131k | -$13k | 767 | 9 | 46.0 | W 4-0 Launceston Larrikins |
| S2 W17 | stamina | 7 speed 1, strength 2, stamina 3, handling 1 | -$117k | $14k | 637 | 7 | 44.3 | L 0-2 Darwin Drovers |
| S2 W18 | kicking | 5 speed 1, strength 2, stamina 1, kicking 1 | -$129k | -$12k | 660 | 5 | 44.3 | L 6-7 Southport Stingrays |
| S2 W19 | kicking | 8 speed 1, strength 3, stamina 1, handling 2, footyIQ 1 | -$118k | $11k | 681 | 8 | 44.5 | W 8-0 Broken Hill Brollys |
| S2 W20 | kicking | 6 speed 1, strength 2, stamina 1, kicking 1, footyIQ 1 | -$130k | -$12k | 639 | 6 | 44.5 | L 0-14 Geelong Gulls |
| S2 W21 | kicking | 6 speed 1, strength 2, stamina 1, footyIQ 2 | -$117k | $14k | 648 | 6 | 44.6 | L 0-4 Wagga Swagmen |
| S2 W22 | kicking | 6 speed 2, strength 3, stamina 1 | -$128k | -$11k | 660 | 6 | 44.7 | L 6-7 Katherine Crocs |
| S2 W23 | kicking | 6 speed 1, strength 2, stamina 1, footyIQ 2 | -$117k | $11k | 639 | 6 | 44.8 | L 0-12 Shellharbour Scorpions |
| S2 W24 | kicking | 7 strength 3, stamina 1, handling 2, footyIQ 1 | -$128k | -$11k | 639 | 7 | 44.9 | D 0-0 Dubbo Diggers |
| S2 W25 final | kicking | 2 stamina 1, handling 1 | -$140k | -$11k | 148 | 2 | 44.9 | no match |
| S2 W26 final | kicking | 1 strength 1 | -$151k | -$11k | 148 | 1 | 44.9 | no match |
| S2 W27 final | kicking | 3 strength 2, footyIQ 1 | -$163k | -$11k | 141 | 3 | 46.2 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $151k | -$49k | 707 | 1.70 | 49.5 | 55.5 | 0.0% | 70.0% |
| S1 trial 2 | 20 | $115k | -$36k | 762 | 6.45 | 49.5 | 55.6 | 0.0% | 55.0% |
| S1 W1 | 20 | $94k | -$20k | 777 | 6.60 | 49.6 | 55.7 | 0.0% | 60.0% |
| S1 W2 | 20 | $58k | -$36k | 849 | 6.50 | 49.6 | 55.8 | 0.0% | 60.0% |
| S1 W3 | 20 | $55k | -$2.6k | 911 | 8.35 | 49.7 | 56.0 | 0.0% | 50.0% |
| S1 W4 | 20 | $28k | -$27k | 926 | 9.95 | 49.8 | 56.1 | 0.0% | 60.0% |
| S1 W5 | 20 | $35k | $7.2k | 936 | 8.80 | 49.9 | 56.3 | 0.0% | 55.0% |
| S1 W6 | 20 | $14k | -$21k | 918 | 11.05 | 50.0 | 56.5 | 0.0% | 45.0% |
| S1 W7 | 20 | $23k | $8.7k | 925 | 8.40 | 50.1 | 56.7 | 0.0% | 45.0% |
| S1 W8 | 20 | $1.4k | -$21k | 933 | 6.90 | 50.1 | 56.8 | 45.0% | 55.0% |
| S1 W9 | 20 | $8.8k | $7.4k | 925 | 11.00 | 50.2 | 57.0 | 25.0% | 50.0% |
| S1 W10 | 20 | -$14k | -$22k | 899 | 8.95 | 50.4 | 57.2 | 85.0% | 35.0% |
| S1 W11 | 20 | -$5.2k | $8.5k | 925 | 10.00 | 50.5 | 57.4 | 65.0% | 60.0% |
| S1 W12 | 20 | -$26k | -$21k | 921 | 7.80 | 50.5 | 57.6 | 100.0% | 50.0% |
| S1 W13 | 20 | -$16k | $9.8k | 923 | 11.10 | 50.6 | 57.7 | 90.0% | 55.0% |
| S1 W14 | 20 | -$38k | -$22k | 934 | 8.10 | 50.7 | 57.9 | 100.0% | 55.0% |
| S1 W15 | 20 | -$26k | $12k | 920 | 8.90 | 50.8 | 58.1 | 100.0% | 40.0% |
| S1 W16 | 20 | -$48k | -$22k | 931 | 9.90 | 50.9 | 58.3 | 100.0% | 75.0% |
| S1 W17 | 20 | -$39k | $9.3k | 945 | 8.20 | 51.0 | 58.5 | 100.0% | 60.0% |
| S1 W18 | 20 | -$60k | -$22k | 930 | 9.80 | 51.0 | 58.5 | 100.0% | 50.0% |
| S1 W19 | 20 | -$53k | $7.5k | 958 | 8.95 | 51.0 | 58.6 | 100.0% | 75.0% |
| S1 W20 | 20 | -$74k | -$22k | 941 | 10.05 | 51.0 | 58.4 | 100.0% | 60.0% |
| S1 W21 | 20 | -$64k | $10k | 937 | 9.40 | 51.0 | 58.5 | 100.0% | 75.0% |
| S1 W22 | 20 | -$85k | -$21k | 930 | 8.00 | 50.9 | 58.4 | 100.0% | 70.0% |
| S1 W23 | 20 | -$75k | $11k | 935 | 11.35 | 51.0 | 58.5 | 100.0% | 85.0% |
| S1 W24 | 20 | -$95k | -$21k | 905 | 8.65 | 50.8 | 57.9 | 100.0% | 40.0% |
| S1 W25 final | 20 | -$93k | $2.9k | 780 | 7.30 | 50.5 | 57.3 | 100.0% | 75.0% |
| S1 W26 final | 20 | -$93k | -$318 | 652 | 5.90 | 50.3 | 56.9 | 100.0% | 33.3% |
| S1 W27 final | 20 | -$40k | $53k | 395 | 6.65 | 50.7 | 56.1 | 70.0% | 80.0% |
| S2 trial 1 | 20 | -$60k | -$20k | 839 | 7.40 | 50.4 | 56.1 | 80.0% | 65.0% |
| S2 trial 2 | 20 | -$79k | -$19k | 863 | 8.55 | 50.4 | 55.9 | 80.0% | 55.0% |
| S2 W1 | 20 | -$63k | $16k | 836 | 7.65 | 50.4 | 56.0 | 75.0% | 50.0% |
| S2 W2 | 20 | -$83k | -$20k | 848 | 8.40 | 50.5 | 56.1 | 80.0% | 65.0% |
| S2 W3 | 20 | -$63k | $19k | 852 | 8.55 | 50.6 | 56.3 | 75.0% | 40.0% |
| S2 W4 | 20 | -$80k | -$17k | 860 | 8.35 | 50.6 | 56.3 | 75.0% | 65.0% |
| S2 W5 | 20 | -$61k | $19k | 844 | 9.10 | 50.6 | 56.4 | 75.0% | 60.0% |
| S2 W6 | 20 | -$78k | -$16k | 858 | 8.00 | 50.7 | 56.5 | 75.0% | 45.0% |
| S2 W7 | 20 | -$56k | $21k | 860 | 9.35 | 50.8 | 56.7 | 75.0% | 50.0% |
| S2 W8 | 20 | -$73k | -$16k | 854 | 7.85 | 50.9 | 56.8 | 75.0% | 45.0% |
| S2 W9 | 20 | -$54k | $19k | 864 | 8.85 | 51.0 | 57.0 | 70.0% | 60.0% |
| S2 W10 | 20 | -$70k | -$16k | 860 | 8.60 | 51.0 | 57.2 | 75.0% | 70.0% |
| S2 W11 | 20 | -$49k | $21k | 841 | 7.90 | 51.0 | 57.2 | 70.0% | 40.0% |
| S2 W12 | 20 | -$66k | -$16k | 855 | 8.65 | 51.1 | 57.4 | 80.0% | 50.0% |
| S2 W13 | 20 | -$46k | $20k | 883 | 8.75 | 51.3 | 57.6 | 70.0% | 65.0% |
| S2 W14 | 20 | -$62k | -$16k | 862 | 8.45 | 51.4 | 57.7 | 80.0% | 35.0% |
| S2 W15 | 20 | -$41k | $21k | 867 | 8.70 | 51.5 | 57.9 | 70.0% | 50.0% |
| S2 W16 | 20 | -$57k | -$16k | 875 | 9.25 | 51.5 | 58.1 | 80.0% | 60.0% |
| S2 W17 | 20 | -$38k | $19k | 870 | 8.50 | 51.5 | 58.1 | 70.0% | 65.0% |
| S2 W18 | 20 | -$56k | -$18k | 864 | 8.55 | 51.6 | 58.3 | 80.0% | 50.0% |
| S2 W19 | 20 | -$37k | $19k | 885 | 9.30 | 51.7 | 58.5 | 70.0% | 65.0% |
| S2 W20 | 20 | -$53k | -$16k | 872 | 7.95 | 51.8 | 58.6 | 80.0% | 60.0% |
| S2 W21 | 20 | -$32k | $20k | 863 | 8.95 | 51.9 | 58.8 | 70.0% | 45.0% |
| S2 W22 | 20 | -$49k | -$17k | 857 | 8.60 | 52.0 | 59.0 | 80.0% | 50.0% |
| S2 W23 | 20 | -$30k | $19k | 851 | 8.05 | 52.1 | 59.1 | 70.0% | 45.0% |
| S2 W24 | 20 | -$48k | -$18k | 846 | 8.45 | 52.2 | 59.3 | 80.0% | 40.0% |
| S2 W25 final | 20 | -$43k | $4.6k | 778 | 8.25 | 52.2 | 59.4 | 65.0% | 93.8% |
| S2 W26 final | 20 | -$43k | $412 | 722 | 6.80 | 52.1 | 59.2 | 60.0% | 60.0% |
| S2 W27 final | 20 | $30k | $73k | 527 | 5.95 | 52.7 | 59.2 | 45.0% | 77.8% |
| S3 trial 1 | 16 | $30k | -$46k | 832 | 7.88 | 53.2 | 61.1 | 31.3% | 81.3% |
| S3 trial 2 | 16 | $1.9k | -$28k | 830 | 8.63 | 53.3 | 61.3 | 31.3% | 62.5% |
| S3 W1 | 16 | $21k | $19k | 844 | 7.81 | 53.3 | 61.4 | 31.3% | 81.3% |
| S3 W2 | 16 | -$6.1k | -$27k | 849 | 8.19 | 53.4 | 61.6 | 31.3% | 56.3% |
| S3 W3 | 16 | $14k | $20k | 846 | 8.88 | 53.5 | 61.7 | 31.3% | 62.5% |
| S3 W4 | 16 | -$7.9k | -$22k | 848 | 8.56 | 53.5 | 61.7 | 31.3% | 68.8% |
| S3 W5 | 16 | $14k | $22k | 834 | 8.56 | 53.5 | 61.8 | 31.3% | 68.8% |
| S3 W6 | 16 | -$6.7k | -$21k | 836 | 7.50 | 53.6 | 62.0 | 37.5% | 68.8% |
| S3 W7 | 16 | $15k | $22k | 856 | 9.31 | 53.7 | 62.1 | 31.3% | 56.3% |
| S3 W8 | 16 | -$6.5k | -$22k | 870 | 8.19 | 53.8 | 62.2 | 37.5% | 68.8% |
| S3 W9 | 16 | $14k | $21k | 864 | 8.94 | 53.9 | 62.5 | 31.3% | 56.3% |
| S3 W10 | 16 | -$5.1k | -$19k | 852 | 7.75 | 54.0 | 62.7 | 43.8% | 50.0% |
| S3 W11 | 16 | $15k | $20k | 856 | 9.63 | 54.1 | 62.9 | 31.3% | 50.0% |
| S3 W12 | 16 | -$5.8k | -$20k | 864 | 7.56 | 54.1 | 63.1 | 43.8% | 62.5% |
| S3 W13 | 16 | $16k | $21k | 873 | 8.81 | 54.2 | 63.2 | 31.3% | 62.5% |
| S3 W14 | 16 | -$4.8k | -$20k | 849 | 9.44 | 54.3 | 63.3 | 43.8% | 50.0% |
| S3 W15 | 16 | $18k | $22k | 860 | 8.25 | 54.4 | 63.4 | 31.3% | 43.8% |
| S3 W16 | 16 | -$946 | -$18k | 878 | 8.56 | 54.4 | 63.6 | 43.8% | 93.8% |
| S3 W17 | 16 | $21k | $22k | 863 | 8.31 | 54.5 | 63.7 | 25.0% | 68.8% |
| S3 W18 | 16 | $731 | -$21k | 850 | 8.75 | 54.6 | 64.0 | 43.8% | 56.3% |
| S3 W19 | 16 | $22k | $21k | 888 | 9.06 | 54.7 | 64.1 | 25.0% | 68.8% |
| S3 W20 | 16 | $1.4k | -$20k | 852 | 7.75 | 54.7 | 64.3 | 37.5% | 62.5% |
| S3 W21 | 16 | $24k | $22k | 844 | 7.94 | 54.8 | 64.4 | 25.0% | 50.0% |
| S3 W22 | 16 | $2.3k | -$21k | 886 | 9.50 | 54.9 | 64.6 | 37.5% | 93.8% |
| S3 W23 | 16 | $25k | $22k | 861 | 8.44 | 54.9 | 64.7 | 25.0% | 43.8% |
| S3 W24 | 16 | $3.6k | -$21k | 872 | 8.81 | 55.0 | 64.8 | 37.5% | 62.5% |
| S3 W25 final | 16 | $23k | $20k | 769 | 8.31 | 55.0 | 64.9 | 18.8% | 57.1% |
| S3 W26 final | 16 | $19k | -$4.3k | 510 | 4.75 | 55.0 | 65.0 | 37.5% | 75.0% |
| S3 W27 final | 16 | $84k | $65k | 424 | 5.19 | 55.6 | 64.0 | 18.8% | 83.3% |
| S4 trial 1 | 13 | $60k | -$43k | 765 | 7.46 | 56.6 | 65.8 | 23.1% | 53.8% |
| S4 trial 2 | 13 | $26k | -$34k | 790 | 7.62 | 56.6 | 65.8 | 30.8% | 76.9% |
| S4 W1 | 13 | $34k | $7.7k | 776 | 7.92 | 56.6 | 65.7 | 23.1% | 53.8% |
| S4 W2 | 13 | $937 | -$33k | 786 | 7.69 | 56.6 | 65.8 | 30.8% | 92.3% |
| S4 W3 | 13 | $21k | $20k | 777 | 7.69 | 56.7 | 65.8 | 30.8% | 61.5% |
| S4 W4 | 13 | -$1.3k | -$22k | 775 | 7.69 | 56.7 | 65.9 | 30.8% | 46.2% |
| S4 W5 | 13 | $19k | $20k | 765 | 7.77 | 56.8 | 66.0 | 30.8% | 46.2% |
| S4 W6 | 13 | -$3.7k | -$22k | 766 | 7.46 | 56.8 | 66.1 | 30.8% | 76.9% |
| S4 W7 | 13 | $15k | $19k | 749 | 7.69 | 57.0 | 66.4 | 30.8% | 38.5% |
| S4 W8 | 13 | -$10.0k | -$25k | 763 | 7.38 | 57.0 | 66.5 | 46.2% | 61.5% |
| S4 W9 | 13 | $9.9k | $20k | 765 | 8.08 | 57.1 | 66.6 | 30.8% | 69.2% |
| S4 W10 | 13 | -$15k | -$25k | 751 | 6.85 | 56.9 | 66.4 | 46.2% | 46.2% |
| S4 W11 | 13 | $5.5k | $20k | 771 | 8.08 | 56.8 | 66.4 | 46.2% | 61.5% |
| S4 W12 | 13 | -$20k | -$25k | 773 | 7.08 | 56.8 | 66.4 | 53.8% | 61.5% |
| S4 W13 | 13 | $250 | $20k | 755 | 7.54 | 56.8 | 66.5 | 46.2% | 46.2% |
| S4 W14 | 13 | -$21k | -$22k | 755 | 8.15 | 56.7 | 66.3 | 53.8% | 61.5% |
| S4 W15 | 13 | -$1.2k | $20k | 782 | 6.85 | 56.8 | 66.4 | 46.2% | 69.2% |
| S4 W16 | 13 | -$24k | -$22k | 764 | 8.38 | 56.6 | 66.2 | 53.8% | 76.9% |
| S4 W17 | 13 | -$2.6k | $21k | 763 | 7.54 | 56.6 | 66.2 | 46.2% | 46.2% |
| S4 W18 | 13 | -$24k | -$21k | 749 | 7.85 | 56.5 | 66.1 | 53.8% | 53.8% |
| S4 W19 | 13 | -$2.8k | $21k | 778 | 6.92 | 56.5 | 66.1 | 46.2% | 53.8% |
| S4 W20 | 13 | -$24k | -$21k | 763 | 7.54 | 56.4 | 66.0 | 53.8% | 53.8% |
| S4 W21 | 13 | -$3.7k | $21k | 751 | 8.00 | 56.5 | 66.0 | 46.2% | 46.2% |
| S4 W22 | 13 | -$29k | -$25k | 751 | 7.46 | 56.4 | 65.8 | 61.5% | 53.8% |
| S4 W23 | 13 | -$8.8k | $20k | 736 | 7.38 | 56.4 | 65.9 | 53.8% | 30.8% |
| S4 W24 | 13 | -$30k | -$21k | 758 | 7.15 | 56.3 | 65.7 | 61.5% | 53.8% |
| S4 W25 final | 13 | -$9.9k | $20k | 637 | 7.23 | 56.2 | 65.6 | 46.2% | 70.0% |
| S4 W26 final | 13 | -$9.5k | $358 | 497 | 4.85 | 56.0 | 65.2 | 61.5% | 57.1% |
| S4 W27 final | 13 | $27k | $37k | 359 | 3.46 | 57.4 | 64.6 | 46.2% | 75.0% |
| S5 trial 1 | 11 | -$3.1k | -$49k | 688 | 6.82 | 57.5 | 65.1 | 45.5% | 36.4% |
| S5 trial 2 | 11 | -$24k | -$21k | 692 | 7.09 | 57.5 | 65.0 | 54.5% | 45.5% |
| S5 W1 | 11 | -$2.6k | $21k | 687 | 6.82 | 57.4 | 64.8 | 45.5% | 36.4% |
| S5 W2 | 11 | -$23k | -$21k | 695 | 6.09 | 57.4 | 64.8 | 54.5% | 36.4% |
| S5 W3 | 11 | -$1.8k | $22k | 699 | 7.09 | 57.4 | 64.8 | 36.4% | 72.7% |
| S5 W4 | 11 | -$23k | -$21k | 679 | 6.82 | 57.4 | 64.9 | 54.5% | 36.4% |
| S5 W5 | 11 | -$1.1k | $21k | 692 | 7.09 | 57.5 | 64.9 | 45.5% | 63.6% |
| S5 W6 | 11 | -$22k | -$21k | 696 | 7.55 | 57.4 | 65.0 | 54.5% | 63.6% |
| S5 W7 | 11 | -$869 | $21k | 703 | 6.82 | 57.4 | 65.0 | 36.4% | 63.6% |
| S5 W8 | 11 | -$20k | -$19k | 686 | 6.91 | 57.5 | 65.1 | 54.5% | 36.4% |
| S5 W9 | 11 | $1.2k | $21k | 692 | 6.45 | 57.5 | 65.1 | 36.4% | 36.4% |
| S5 W10 | 11 | -$24k | -$26k | 698 | 7.64 | 57.5 | 65.2 | 54.5% | 36.4% |
| S5 W11 | 11 | -$3.2k | $21k | 712 | 6.82 | 57.5 | 65.3 | 36.4% | 81.8% |
| S5 W12 | 11 | -$24k | -$21k | 702 | 6.91 | 57.2 | 65.3 | 63.6% | 54.5% |
| S5 W13 | 11 | -$2.2k | $22k | 722 | 6.73 | 57.2 | 65.4 | 36.4% | 45.5% |
| S5 W14 | 11 | -$24k | -$21k | 717 | 7.18 | 57.2 | 65.4 | 63.6% | 54.5% |
| S5 W15 | 11 | -$2.8k | $21k | 725 | 7.82 | 57.3 | 65.4 | 45.5% | 63.6% |
| S5 W16 | 11 | -$24k | -$21k | 718 | 6.73 | 57.3 | 65.5 | 63.6% | 63.6% |
| S5 W17 | 11 | -$2.6k | $21k | 725 | 7.82 | 57.3 | 65.5 | 45.5% | 63.6% |
| S5 W18 | 11 | -$25k | -$22k | 722 | 6.64 | 57.1 | 65.2 | 63.6% | 81.8% |
| S5 W19 | 11 | -$3.1k | $21k | 706 | 7.09 | 57.0 | 65.2 | 45.5% | 45.5% |
| S5 W20 | 11 | -$24k | -$21k | 694 | 6.73 | 56.9 | 65.0 | 63.6% | 27.3% |
| S5 W21 | 11 | -$2.5k | $21k | 712 | 7.45 | 57.0 | 65.1 | 36.4% | 54.5% |
| S5 W22 | 11 | -$23k | -$21k | 712 | 7.27 | 56.9 | 64.9 | 63.6% | 54.5% |
| S5 W23 | 11 | $6.9k | $30k | 694 | 7.00 | 56.8 | 64.6 | 36.4% | 63.6% |
| S5 W24 | 11 | -$15k | -$21k | 704 | 6.82 | 56.8 | 64.7 | 54.5% | 72.7% |
| S5 W25 final | 11 | $847 | $15k | 551 | 5.27 | 56.1 | 63.9 | 45.5% | 62.5% |
| S5 W26 final | 11 | -$9.5k | -$10k | 424 | 4.18 | 56.1 | 63.9 | 54.5% | 60.0% |
| S5 W27 final | 11 | $9.4k | $19k | 308 | 3.36 | 57.8 | 63.6 | 45.5% | 66.7% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × rush | 1 | 50.0% | 2057 | 62.5% | -12.5% |  |
| all-out × slide | 25 | 52.0% | 2033 | 62.6% | -10.6% |  |
| expansive × compressed | 979 | 64.9% | 1079 | 60.3% | 4.6% |  |
| expansive × slide | 28 | 58.9% | 2030 | 62.5% | -3.6% |  |
| grind × compressed | 26 | 40.4% | 2032 | 62.7% | -22.4% | WARNING |
| grind × slide | 969 | 61.0% | 1089 | 63.8% | -2.8% |  |
| kick-chase × rush | 23 | 58.7% | 2035 | 62.5% | -3.8% |  |
| kick-chase × slide | 7 | 78.6% | 2051 | 62.4% | 16.2% |  |
| block-play | 1881 | 62.7% | 177 | 59.9% | 2.8% |  |
| block-shift | 177 | 59.9% | 1881 | 62.7% | -2.8% |  |
| cut-out-winger | 177 | 59.9% | 1881 | 62.7% | -2.8% |  |
| inside-ball | 1881 | 62.7% | 177 | 59.9% | 2.8% |  |
| second-man | 177 | 59.9% | 1881 | 62.7% | -2.8% |  |
| short-side-raid | 1881 | 62.7% | 177 | 59.9% | 2.8% |  |

### min-maxer/hard/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 205 of 400; median 21.0 weeks among those who did.
- Reaching potential stars: 123 of 400 (92 already there at week 0); median 56.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/234; S3 4/79; S5 0/0.
- Mean XP per completed season 19765; mean level-ups per completed season 192.8.
- Cash: opening 150000; mean weekly change -4565; mean weeks in debt 55.5.
- Bankruptcy warnings: 1113; forced sales: 177; sacked with missed solvency objective: 19.
- Save round-trips: 47; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks hard. Completed seasons end at -139508 on average. Broke rate 100.0% (a bankruptcy warning, or a sacking for a missed solvency objective).
- WARNING: the board is sacking clubs for money. 19 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -385432 |
| upkeep | -8292 |
| overhead | -149089 |
| sponsor | 0 |
| grant | 41637 |
| gate | 374777 |
| prize | 12255 |
| boardGrant | 5872 |
| events | 6333 |
| transfers | 0 |
| contracts | -155 |
| facilities | -30277 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 0 | $101k | -$49k | 581 | 0 | 45.0 | D 7-7 Dubbo Diggers |
| S1 trial 2 | kicking | 6 speed 1, strength 3, handling 1, kicking 1 | $62k | -$39k | 620 | 6 | 45.0 | W 10-0 Wagga Swagmen |
| S1 W1 | kicking | 5 speed 1, strength 2, handling 2 | $49k | -$13k | 660 | 5 | 45.1 | L 0-4 Launceston Larrikins |
| S1 W2 | kicking | 6 speed 1, strength 4, kicking 1 | $28k | -$21k | 678 | 6 | 45.1 | W 7-4 Darwin Drovers |
| S1 W3 | kicking | 5 speed 1, strength 2, handling 2 | $37k | $9.0k | 740 | 5 | 45.1 | W 16-0 Southport Stingrays |
| S1 W4 | kicking | 8 speed 1, strength 5, handling 1, kicking 1 | $16k | -$21k | 679 | 8 | 45.2 | W 10-0 Broken Hill Brollys |
| S1 W5 | kicking | 7 speed 3, strength 3, handling 1 | $20k | $4.5k | 653 | 7 | 45.3 | L 13-16 Geelong Gulls |
| S1 W6 | kicking | 6 speed 1, strength 2, handling 1, kicking 2 | -$3.0k | -$23k | 630 | 6 | 45.3 | L 0-16 Wagga Swagmen |
| S1 W7 | kicking | 6 speed 1, strength 2, handling 2, kicking 1 | $208 | $3.2k | 670 | 6 | 45.4 | L 0-12 Katherine Crocs |
| S1 W8 | kicking | 5 speed 1, strength 3, handling 1 | -$23k | -$23k | 685 | 5 | 45.4 | L 11-16 Shellharbour Scorpions |
| S1 W9 | kicking | 9 speed 1, strength 5, handling 1, kicking 1, footyIQ 1 | -$21k | $2.5k | 660 | 9 | 45.5 | D 4-4 Dubbo Diggers |
| S1 W10 | kicking | 5 speed 1, strength 2, handling 2 | -$44k | -$23k | 690 | 5 | 45.5 | L 4-10 Mackay Marlins |
| S1 W11 | kicking | 8 speed 3, strength 3, kicking 2 | -$46k | -$2.0k | 664 | 8 | 45.6 | L 7-18 Ballarat Bushrangers |
| S1 W12 | kicking | 11 speed 2, strength 5, handling 3, kicking 1 | -$66k | -$20k | 685 | 11 | 45.7 | L 7-8 Cairns Cyclones |
| S1 W13 | kicking | 3 speed 1, strength 1, handling 1 | -$63k | $2.9k | 697 | 3 | 45.7 | W 14-6 Toowoomba Thunder |
| S1 W14 | kicking | 6 speed 1, strength 3, handling 1, kicking 1 | -$86k | -$23k | 656 | 6 | 45.7 | L 0-14 Woolloomooloo Wolves |
| S1 W15 | kicking | 7 strength 3, handling 2, kicking 2 | -$86k | -$71 | 724 | 7 | 45.8 | W 7-4 Redcliffe Reapers |
| S1 W16 | kicking | 7 speed 1, strength 4, handling 2 | -$109k | -$23k | 764 | 7 | 44.1 | L 11-12 Launceston Larrikins |
| S1 W17 | kicking | 8 speed 1, strength 4, handling 2, kicking 1 | -$101k | $7.8k | 750 | 8 | 43.9 | L 4-6 Darwin Drovers |
| S1 W18 | kicking | 8 speed 1, strength 4, stamina 1, handling 2 | -$121k | -$19k | 750 | 8 | 43.4 | W 4-0 Southport Stingrays |
| S1 W19 | kicking | 7 speed 1, strength 3, handling 2, kicking 1 | -$111k | $9.8k | 636 | 7 | 42.9 | L 0-4 Broken Hill Brollys |
| S1 W20 | stamina | 5 strength 2, handling 2, kicking 1 | -$128k | -$17k | 658 | 5 | 42.4 | D 7-7 Geelong Gulls |
| S1 W21 | stamina | 5 speed 2, strength 2, handling 1 | -$113k | $16k | 651 | 5 | 42.1 | L 12-14 Wagga Swagmen |
| S1 W22 | kicking | 8 speed 1, strength 2, handling 2, kicking 3 | -$128k | -$16k | 609 | 8 | 41.9 | L 0-10 Katherine Crocs |
| S1 W23 | stamina | 7 speed 2, strength 2, handling 3 | -$116k | $12k | 624 | 7 | 42.0 | D 0-0 Shellharbour Scorpions |
| S1 W24 | stamina | 6 speed 1, strength 3, handling 1, kicking 1 | -$131k | -$15k | 633 | 6 | 42.1 | L 6-11 Dubbo Diggers |
| S1 W25 final | stamina | 3 handling 2, footyIQ 1 | -$145k | -$15k | 129 | 3 | 42.1 | no match |
| S1 W26 final | stamina | 1 strength 1 | -$160k | -$15k | 129 | 1 | 42.1 | no match |
| S1 W27 final | stamina | 1 handling 1 | -$173k | -$14k | 129 | 1 | 42.1 | no match |
| S2 trial 1 | stamina | 3 strength 1, handling 1, kicking 1 | -$181k | -$8.0k | 519 | 3 | 42.1 | L 7-8 Cairns Cyclones |
| S2 trial 2 | stamina | 6 speed 1, strength 2, handling 2, kicking 1 | -$196k | -$15k | 516 | 6 | 42.2 | L 10-11 Redcliffe Reapers |
| S2 W1 | stamina | 5 strength 2, handling 2, footyIQ 1 | -$183k | $13k | 493 | 5 | 42.3 | D 0-0 Launceston Larrikins |
| S2 W2 | stamina | 4 strength 2, handling 1, kicking 1 | -$197k | -$14k | 483 | 4 | 42.3 | L 0-4 Darwin Drovers |
| S2 W3 | stamina | 5 strength 1, handling 2, kicking 1, footyIQ 1 | -$185k | $12k | 486 | 5 | 42.3 | L 0-8 Southport Stingrays |
| S2 W4 | stamina | 6 speed 1, strength 2, handling 1, kicking 2 | -$199k | -$14k | 541 | 6 | 42.4 | D 0-0 Broken Hill Brollys |
| S2 W5 | stamina | 3 strength 2, handling 1 | -$183k | $15k | 483 | 3 | 42.4 | L 0-1 Geelong Gulls |
| S2 W6 | stamina | 6 strength 1, handling 3, kicking 1, footyIQ 1 | -$197k | -$14k | 483 | 6 | 42.5 | L 0-8 Wagga Swagmen |
| S2 W7 | stamina | 6 speed 2, strength 3, kicking 1 | -$187k | $9.8k | 550 | 6 | 42.6 | W 8-4 Katherine Crocs |
| S2 W8 | stamina | 6 strength 2, stamina 1, handling 2, footyIQ 1 | -$199k | -$12k | 532 | 6 | 42.1 | W 10-0 Shellharbour Scorpions |
| S2 W9 | stamina | 4 strength 2, handling 2 | -$186k | $13k | 427 | 4 | 41.0 | L 0-10 Dubbo Diggers |
| S2 W10 | kicking | 4 speed 2, strength 1, handling 1 | -$198k | -$11k | 499 | 4 | 41.0 | W 6-4 Mackay Marlins |
| S2 W11 | kicking | 7 speed 1, strength 3, handling 1, kicking 1, footyIQ 1 | -$177k | $21k | 491 | 7 | 41.1 | W 6-4 Ballarat Bushrangers |
| S2 W12 | kicking | 2 strength 1, handling 1 | -$188k | -$11k | 441 | 2 | 41.1 | L 0-20 Cairns Cyclones |
| S2 W13 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | -$167k | $21k | 441 | 6 | 41.2 | L 0-1 Toowoomba Thunder |
| S2 W14 | kicking | 4 strength 1, stamina 1, handling 2 | -$182k | -$14k | 481 | 4 | 41.2 | D 6-6 Woolloomooloo Wolves |
| S2 W15 | kicking | 4 speed 1, stamina 1, handling 1, kicking 1 | -$168k | $14k | 443 | 4 | 41.2 | L 0-10 Redcliffe Reapers |
| S2 W16 | kicking | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | -$177k | -$9.2k | 441 | 5 | 41.3 | L 0-12 Launceston Larrikins |
| S2 W17 | kicking | 5 speed 2, stamina 1, handling 2 | -$169k | $8.0k | 441 | 5 | 41.3 | L 0-12 Darwin Drovers |
| S2 W18 | kicking | 2 speed 1, strength 1 | -$184k | -$14k | 441 | 2 | 41.3 | L 0-16 Southport Stingrays |
| S2 W19 | kicking | 8 speed 1, stamina 4, handling 2, footyIQ 1 | -$170k | $14k | 486 | 8 | 41.5 | W 7-4 Broken Hill Brollys |
| S2 W20 | kicking | 4 speed 1, stamina 2, handling 1 | -$184k | -$14k | 487 | 4 | 41.5 | W 6-4 Geelong Gulls |
| S2 W21 | kicking | 3 strength 1, stamina 1, kicking 1 | -$166k | $18k | 452 | 3 | 41.5 | D 4-4 Wagga Swagmen |
| S2 W22 | kicking | 7 speed 1, stamina 2, handling 2, footyIQ 2 | -$180k | -$14k | 441 | 7 | 41.6 | L 0-12 Katherine Crocs |
| S2 W23 | kicking | 3 speed 1, stamina 2 | -$166k | $14k | 449 | 3 | 41.6 | L 0-10 Shellharbour Scorpions |
| S2 W24 | kicking | 4 speed 1, strength 1, stamina 1, kicking 1 | -$180k | -$14k | 441 | 4 | 41.7 | L 0-8 Dubbo Diggers |
| S2 W25 final | kicking | 1 footyIQ 1 | -$194k | -$14k | 100 | 1 | 41.6 | no match |
| S2 W26 final | kicking | 1 stamina 1 | -$208k | -$14k | 100 | 1 | 41.6 | no match |
| S2 W27 final | kicking | 2 speed 1, footyIQ 1 | -$222k | -$14k | 100 | 2 | 41.6 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $99k | -$51k | 641 | 0.35 | 45.7 | 52.1 | 0.0% | 35.0% |
| S1 trial 2 | 20 | $61k | -$39k | 687 | 6.35 | 45.7 | 52.2 | 0.0% | 65.0% |
| S1 W1 | 20 | $48k | -$13k | 748 | 5.95 | 45.8 | 52.3 | 0.0% | 55.0% |
| S1 W2 | 20 | $24k | -$24k | 747 | 6.25 | 45.8 | 52.4 | 0.0% | 60.0% |
| S1 W3 | 20 | $30k | $5.7k | 747 | 6.45 | 45.9 | 52.5 | 0.0% | 40.0% |
| S1 W4 | 20 | $5.6k | -$24k | 729 | 8.25 | 46.0 | 52.6 | 15.0% | 35.0% |
| S1 W5 | 20 | $9.9k | $4.3k | 739 | 7.05 | 46.0 | 52.8 | 10.0% | 50.0% |
| S1 W6 | 20 | -$14k | -$24k | 737 | 6.25 | 46.1 | 52.9 | 100.0% | 20.0% |
| S1 W7 | 20 | -$9.5k | $4.4k | 749 | 8.70 | 46.2 | 53.0 | 80.0% | 40.0% |
| S1 W8 | 20 | -$33k | -$23k | 748 | 6.80 | 46.2 | 53.1 | 100.0% | 55.0% |
| S1 W9 | 20 | -$29k | $4.2k | 742 | 9.50 | 46.3 | 53.3 | 100.0% | 35.0% |
| S1 W10 | 20 | -$53k | -$24k | 753 | 5.70 | 46.3 | 53.4 | 100.0% | 40.0% |
| S1 W11 | 20 | -$49k | $3.9k | 754 | 8.55 | 46.4 | 53.5 | 100.0% | 35.0% |
| S1 W12 | 20 | -$72k | -$23k | 739 | 7.10 | 46.4 | 53.5 | 100.0% | 15.0% |
| S1 W13 | 20 | -$66k | $5.6k | 762 | 6.30 | 46.4 | 53.5 | 100.0% | 55.0% |
| S1 W14 | 20 | -$89k | -$23k | 734 | 6.35 | 46.0 | 52.8 | 100.0% | 20.0% |
| S1 W15 | 20 | -$82k | $7.0k | 733 | 9.10 | 46.1 | 52.7 | 100.0% | 25.0% |
| S1 W16 | 20 | -$105k | -$23k | 746 | 7.25 | 45.1 | 50.5 | 100.0% | 55.0% |
| S1 W17 | 20 | -$98k | $7.0k | 733 | 7.25 | 44.9 | 50.1 | 100.0% | 20.0% |
| S1 W18 | 20 | -$118k | -$20k | 732 | 7.25 | 44.3 | 48.9 | 100.0% | 25.0% |
| S1 W19 | 20 | -$111k | $7.0k | 733 | 7.55 | 44.0 | 48.1 | 100.0% | 45.0% |
| S1 W20 | 20 | -$129k | -$18k | 707 | 7.30 | 43.4 | 46.9 | 100.0% | 35.0% |
| S1 W21 | 20 | -$116k | $13k | 698 | 6.30 | 43.1 | 46.2 | 100.0% | 35.0% |
| S1 W22 | 20 | -$133k | -$16k | 657 | 7.05 | 42.8 | 45.5 | 100.0% | 30.0% |
| S1 W23 | 20 | -$122k | $11k | 656 | 6.15 | 42.7 | 45.2 | 100.0% | 45.0% |
| S1 W24 | 20 | -$137k | -$15k | 657 | 7.80 | 42.7 | 45.0 | 100.0% | 30.0% |
| S1 W25 final | 20 | -$144k | -$7.0k | 360 | 3.05 | 42.6 | 44.9 | 100.0% | 62.5% |
| S1 W26 final | 20 | -$157k | -$13k | 270 | 2.95 | 42.6 | 44.9 | 100.0% | 40.0% |
| S1 W27 final | 20 | -$144k | $13k | 180 | 1.80 | 43.1 | 44.7 | 95.0% | 0.0% |
| S2 trial 1 | 20 | -$155k | -$11k | 656 | 5.75 | 42.2 | 44.9 | 100.0% | 25.0% |
| S2 trial 2 | 20 | -$165k | -$10k | 689 | 6.15 | 42.3 | 44.9 | 100.0% | 25.0% |
| S2 W1 | 20 | -$150k | $15k | 705 | 7.45 | 42.4 | 45.1 | 95.0% | 25.0% |
| S2 W2 | 20 | -$164k | -$14k | 684 | 7.55 | 42.4 | 45.0 | 95.0% | 25.0% |
| S2 W3 | 20 | -$148k | $16k | 689 | 6.20 | 42.5 | 45.1 | 95.0% | 15.0% |
| S2 W4 | 20 | -$162k | -$14k | 710 | 7.05 | 42.5 | 45.2 | 95.0% | 40.0% |
| S2 W5 | 20 | -$146k | $16k | 705 | 6.80 | 42.6 | 45.3 | 95.0% | 40.0% |
| S2 W6 | 20 | -$159k | -$14k | 708 | 7.35 | 42.7 | 45.4 | 95.0% | 45.0% |
| S2 W7 | 20 | -$143k | $16k | 700 | 6.70 | 42.8 | 45.5 | 90.0% | 20.0% |
| S2 W8 | 20 | -$157k | -$14k | 710 | 7.55 | 42.8 | 45.6 | 95.0% | 25.0% |
| S2 W9 | 20 | -$141k | $16k | 708 | 7.40 | 42.8 | 45.6 | 90.0% | 35.0% |
| S2 W10 | 20 | -$155k | -$14k | 718 | 6.30 | 42.8 | 45.6 | 95.0% | 30.0% |
| S2 W11 | 20 | -$139k | $16k | 723 | 7.65 | 42.8 | 45.7 | 90.0% | 40.0% |
| S2 W12 | 20 | -$153k | -$14k | 723 | 6.10 | 42.8 | 45.7 | 90.0% | 40.0% |
| S2 W13 | 20 | -$135k | $18k | 730 | 8.05 | 42.8 | 45.7 | 90.0% | 35.0% |
| S2 W14 | 20 | -$148k | -$13k | 729 | 6.60 | 42.9 | 45.8 | 90.0% | 25.0% |
| S2 W15 | 20 | -$130k | $19k | 716 | 7.55 | 43.0 | 46.0 | 90.0% | 20.0% |
| S2 W16 | 20 | -$144k | -$14k | 734 | 8.10 | 43.1 | 46.1 | 90.0% | 40.0% |
| S2 W17 | 20 | -$127k | $17k | 726 | 6.65 | 43.2 | 46.2 | 90.0% | 30.0% |
| S2 W18 | 20 | -$142k | -$15k | 746 | 7.85 | 43.3 | 46.3 | 90.0% | 45.0% |
| S2 W19 | 20 | -$125k | $16k | 748 | 7.30 | 43.3 | 46.5 | 90.0% | 55.0% |
| S2 W20 | 20 | -$139k | -$14k | 743 | 7.75 | 43.3 | 46.6 | 90.0% | 30.0% |
| S2 W21 | 20 | -$121k | $18k | 753 | 6.55 | 43.4 | 46.6 | 85.0% | 40.0% |
| S2 W22 | 20 | -$135k | -$14k | 756 | 7.80 | 43.5 | 46.8 | 90.0% | 25.0% |
| S2 W23 | 20 | -$118k | $18k | 749 | 7.40 | 43.6 | 47.0 | 80.0% | 30.0% |
| S2 W24 | 20 | -$133k | -$15k | 759 | 7.80 | 43.7 | 47.0 | 85.0% | 40.0% |
| S2 W25 final | 20 | -$146k | -$13k | 198 | 1.90 | 43.7 | 47.0 | 90.0% | 0.0% |
| S2 W26 final | 20 | -$159k | -$13k | 165 | 1.55 | 43.7 | 46.9 | 90.0% | n/a |
| S2 W27 final | 20 | -$171k | -$12k | 163 | 1.85 | 44.1 | 46.9 | 95.0% | n/a |
| S3 trial 1 | 6 | -$88k | -$9.2k | 737 | 7.17 | 44.2 | 47.6 | 83.3% | 50.0% |
| S3 trial 2 | 6 | -$100k | -$12k | 749 | 7.17 | 44.2 | 47.7 | 83.3% | 33.3% |
| S3 W1 | 6 | -$79k | $21k | 754 | 7.67 | 44.4 | 47.9 | 83.3% | 33.3% |
| S3 W2 | 6 | -$94k | -$14k | 749 | 7.83 | 44.5 | 48.0 | 83.3% | 16.7% |
| S3 W3 | 6 | -$76k | $18k | 733 | 6.50 | 44.6 | 48.1 | 83.3% | 16.7% |
| S3 W4 | 6 | -$90k | -$14k | 739 | 7.83 | 44.7 | 48.3 | 83.3% | 50.0% |
| S3 W5 | 6 | -$70k | $20k | 741 | 6.50 | 44.8 | 48.5 | 83.3% | 16.7% |
| S3 W6 | 6 | -$85k | -$15k | 738 | 8.83 | 44.9 | 48.6 | 83.3% | 16.7% |
| S3 W7 | 6 | -$68k | $17k | 746 | 6.67 | 45.0 | 48.8 | 83.3% | 50.0% |
| S3 W8 | 6 | -$83k | -$15k | 774 | 8.17 | 45.1 | 49.0 | 83.3% | 66.7% |
| S3 W9 | 6 | -$62k | $21k | 748 | 7.67 | 45.1 | 48.8 | 66.7% | 16.7% |
| S3 W10 | 6 | -$77k | -$15k | 768 | 7.17 | 45.2 | 49.0 | 83.3% | 50.0% |
| S3 W11 | 6 | -$56k | $20k | 768 | 7.83 | 45.3 | 49.2 | 66.7% | 66.7% |
| S3 W12 | 6 | -$75k | -$18k | 758 | 7.00 | 45.4 | 49.3 | 83.3% | 33.3% |
| S3 W13 | 6 | -$53k | $22k | 759 | 7.50 | 45.6 | 49.5 | 50.0% | 33.3% |
| S3 W14 | 6 | -$67k | -$15k | 774 | 7.50 | 45.5 | 49.7 | 83.3% | 33.3% |
| S3 W15 | 6 | -$45k | $22k | 746 | 9.00 | 45.6 | 49.8 | 50.0% | 16.7% |
| S3 W16 | 6 | -$60k | -$15k | 760 | 7.17 | 45.7 | 50.0 | 66.7% | 33.3% |
| S3 W17 | 6 | -$41k | $19k | 758 | 7.17 | 45.8 | 50.1 | 50.0% | 16.7% |
| S3 W18 | 6 | -$72k | -$31k | 806 | 8.67 | 46.4 | 51.2 | 100.0% | 16.7% |
| S3 W19 | 6 | -$55k | $17k | 800 | 7.50 | 46.4 | 51.3 | 50.0% | 33.3% |
| S3 W20 | 6 | -$70k | -$15k | 795 | 8.50 | 46.6 | 51.4 | 100.0% | 33.3% |
| S3 W21 | 6 | -$51k | $19k | 830 | 7.50 | 46.7 | 51.6 | 50.0% | 66.7% |
| S3 W22 | 6 | -$66k | -$15k | 803 | 8.50 | 46.8 | 51.7 | 100.0% | 50.0% |
| S3 W23 | 6 | -$46k | $20k | 799 | 7.17 | 46.8 | 51.9 | 66.7% | 66.7% |
| S3 W24 | 6 | -$60k | -$14k | 774 | 8.83 | 46.8 | 51.9 | 83.3% | 16.7% |
| S3 W25 final | 6 | -$68k | -$7.9k | 407 | 3.17 | 46.9 | 51.9 | 100.0% | 50.0% |
| S3 W26 final | 6 | -$83k | -$15k | 304 | 3.33 | 46.9 | 52.0 | 100.0% | 0.0% |
| S3 W27 final | 6 | -$90k | -$7.3k | 176 | 2.17 | 47.3 | 52.0 | 83.3% | n/a |
| S4 trial 1 | 1 | $2.5k | -$8.2k | 980 | 7.00 | 51.6 | 60.2 | 0.0% | 100.0% |
| S4 trial 2 | 1 | -$16k | -$19k | 906 | 8.00 | 51.7 | 60.4 | 100.0% | 0.0% |
| S4 W1 | 1 | $7.7k | $24k | 934 | 10.00 | 51.8 | 60.6 | 0.0% | 100.0% |
| S4 W2 | 1 | -$10k | -$18k | 941 | 9.00 | 52.0 | 60.9 | 100.0% | 0.0% |
| S4 W3 | 1 | $14k | $25k | 990 | 12.00 | 52.1 | 61.0 | 0.0% | 100.0% |
| S4 W4 | 1 | -$4.0k | -$18k | 903 | 10.00 | 52.2 | 61.2 | 100.0% | 100.0% |
| S4 W5 | 1 | $18k | $22k | 863 | 8.00 | 52.4 | 61.4 | 0.0% | 0.0% |
| S4 W6 | 1 | -$113 | -$18k | 999 | 9.00 | 52.5 | 61.6 | 100.0% | 100.0% |
| S4 W7 | 1 | $24k | $24k | 930 | 9.00 | 52.6 | 61.8 | 0.0% | 100.0% |
| S4 W8 | 1 | $5.7k | -$18k | 1020 | 9.00 | 52.7 | 62.0 | 0.0% | 100.0% |
| S4 W9 | 1 | $30k | $24k | 961 | 11.00 | 52.9 | 62.2 | 0.0% | 100.0% |
| S4 W10 | 1 | $12k | -$18k | 937 | 8.00 | 53.0 | 62.4 | 0.0% | 100.0% |
| S4 W11 | 1 | $35k | $23k | 1001 | 12.00 | 53.2 | 62.7 | 0.0% | 100.0% |
| S4 W12 | 1 | $16k | -$19k | 931 | 11.00 | 53.3 | 62.9 | 0.0% | 0.0% |
| S4 W13 | 1 | $39k | $23k | 873 | 6.00 | 53.4 | 63.0 | 0.0% | 0.0% |
| S4 W14 | 1 | $25k | -$14k | 914 | 12.00 | 53.5 | 63.1 | 0.0% | 0.0% |
| S4 W15 | 1 | $48k | $23k | 941 | 9.00 | 53.6 | 63.3 | 0.0% | 100.0% |
| S4 W16 | 1 | $30k | -$18k | 907 | 7.00 | 53.6 | 63.4 | 0.0% | 0.0% |
| S4 W17 | 1 | $53k | $23k | 889 | 10.00 | 53.7 | 63.5 | 0.0% | 0.0% |
| S4 W18 | 1 | $34k | -$19k | 900 | 8.00 | 53.8 | 63.6 | 0.0% | 0.0% |
| S4 W19 | 1 | $57k | $23k | 967 | 9.00 | 53.9 | 63.8 | 0.0% | 100.0% |
| S4 W20 | 1 | $38k | -$19k | 896 | 9.00 | 53.9 | 63.9 | 0.0% | 100.0% |
| S4 W21 | 1 | $61k | $23k | 856 | 10.00 | 54.0 | 64.0 | 0.0% | 0.0% |
| S4 W22 | 1 | $38k | -$23k | 928 | 9.00 | 54.1 | 64.2 | 0.0% | 100.0% |
| S4 W23 | 1 | $60k | $22k | 867 | 9.00 | 54.2 | 64.3 | 0.0% | 0.0% |
| S4 W24 | 1 | $38k | -$22k | 884 | 7.00 | 54.2 | 64.4 | 0.0% | 0.0% |
| S4 W25 final | 1 | $60k | $22k | 922 | 12.00 | 54.4 | 64.6 | 0.0% | 100.0% |
| S4 W26 final | 1 | $81k | $21k | 961 | 11.00 | 54.4 | 64.8 | 0.0% | 100.0% |
| S4 W27 final | 1 | $270k | $189k | 945 | 5.00 | 56.2 | 64.9 | 0.0% | 100.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × compressed | 1 | 100.0% | 1149 | 42.5% | 57.5% |  |
| all-out × slide | 7 | 71.4% | 1143 | 42.3% | 29.1% |  |
| expansive × compressed | 558 | 43.5% | 592 | 41.6% | 2.0% |  |
| expansive × slide | 17 | 50.0% | 1133 | 42.4% | 7.6% |  |
| grind × compressed | 16 | 46.9% | 1134 | 42.5% | 4.4% |  |
| grind × slide | 551 | 40.7% | 599 | 44.2% | -3.6% |  |
| block-play | 1102 | 42.6% | 48 | 39.6% | 3.1% |  |
| block-shift | 48 | 39.6% | 1102 | 42.6% | -3.1% |  |
| cut-out-winger | 48 | 39.6% | 1102 | 42.6% | -3.1% |  |
| inside-ball | 1102 | 42.6% | 48 | 39.6% | 3.1% |  |
| second-man | 48 | 39.6% | 1102 | 42.6% | -3.1% |  |
| short-side-raid | 1102 | 42.6% | 48 | 39.6% | 3.1% |  |

### newcomer/easy/au

- 70 overall (best nine, including recruitment): 93.1 weeks; 15 reached, 5 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 211 of 400; median 36.0 weeks among those who did.
- Reaching potential stars: 242 of 400 (100 already there at week 0); median 36.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/376; S3 16/325; S5 50/232.
- Mean XP per completed season 16644; mean level-ups per completed season 164.1.
- Cash: opening 300000; mean weekly change 704; mean weeks in debt 5.0.
- Bankruptcy warnings: 101; forced sales: 12; sacked with missed solvency objective: 3.
- Save round-trips: 93; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- No balance flag on the thresholds above.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -581579 |
| upkeep | 0 |
| overhead | -34800 |
| sponsor | 0 |
| grant | 66112 |
| gate | 513839 |
| prize | 54656 |
| boardGrant | 18554 |
| events | -16257 |
| transfers | -109 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $289k | -$11k | 848 | 3 | 53.1 | L 6-14 Dubbo Diggers |
| S1 trial 2 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $272k | -$17k | 801 | 7 | 53.2 | W 6-0 Wagga Swagmen |
| S1 W1 | balanced | 4 strength 2, stamina 1, kicking 1 | $279k | $7.1k | 703 | 5 | 53.2 | W 8-0 Launceston Larrikins |
| S1 W2 | balanced | 5 strength 3, footyIQ 2 | $262k | -$17k | 735 | 7 | 53.2 | L 10-11 Darwin Drovers |
| S1 W3 | balanced | 5 stamina 2, handling 1, kicking 1, footyIQ 1 | $276k | $14k | 885 | 9 | 53.3 | W 13-12 Southport Stingrays |
| S1 W4 | balanced | 8 strength 3, stamina 2, footyIQ 3 | $261k | -$15k | 982 | 8 | 53.3 | W 20-8 Broken Hill Brollys |
| S1 W5 | balanced | 8 strength 2, stamina 1, handling 2, kicking 1, footyIQ 2 | $278k | $17k | 934 | 11 | 53.4 | W 23-11 Geelong Gulls |
| S1 W6 | balanced | 9 speed 1, strength 1, stamina 2, kicking 1, footyIQ 4 | $261k | -$17k | 893 | 10 | 53.5 | W 14-11 Wagga Swagmen |
| S1 W7 | balanced | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $277k | $16k | 871 | 6 | 53.5 | W 6-0 Katherine Crocs |
| S1 W8 | balanced | 11 speed 1, strength 4, handling 1, kicking 1, footyIQ 4 | $260k | -$17k | 916 | 11 | 53.6 | W 12-8 Shellharbour Scorpions |
| S1 W9 | balanced | 8 speed 3, strength 1, stamina 1, kicking 2, footyIQ 1 | $273k | $13k | 928 | 9 | 53.7 | W 16-4 Dubbo Diggers |
| S1 W10 | balanced | 8 speed 2, strength 2, stamina 1, handling 1, footyIQ 2 | $256k | -$17k | 823 | 8 | 53.8 | L 4-11 Mackay Marlins |
| S1 W11 | balanced | 7 speed 2, strength 2, stamina 1, kicking 1, footyIQ 1 | $222k | -$34k | 866 | 8 | 54.6 | L 4-5 Ballarat Bushrangers |
| S1 W12 | balanced | 11 speed 3, strength 2, stamina 1, handling 1, kicking 1, footyIQ 3 | $204k | -$18k | 967 | 11 | 54.7 | W 23-0 Cairns Cyclones |
| S1 W13 | balanced | 9 speed 1, strength 3, stamina 1, handling 2, footyIQ 2 | $216k | $12k | 922 | 9 | 54.8 | W 10-0 Toowoomba Thunder |
| S1 W14 | balanced | 10 speed 5, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $197k | -$18k | 819 | 10 | 54.9 | L 0-8 Woolloomooloo Wolves |
| S1 W15 | balanced | 5 strength 1, kicking 1, footyIQ 3 | $202k | $4.8k | 813 | 5 | 54.9 | L 0-8 Redcliffe Reapers |
| S1 W16 | balanced | 9 speed 2, strength 2, stamina 2, handling 1, footyIQ 2 | $184k | -$18k | 910 | 10 | 55.0 | W 14-0 Launceston Larrikins |
| S1 W17 | balanced | 6 speed 3, handling 1, kicking 1, footyIQ 1 | $196k | $13k | 843 | 6 | 55.1 | L 6-7 Darwin Drovers |
| S1 W18 | balanced | 12 speed 1, strength 4, stamina 1, handling 1, kicking 1, footyIQ 4 | $178k | -$18k | 911 | 11 | 55.2 | W 12-6 Southport Stingrays |
| S1 W19 | balanced | 7 strength 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $183k | $5.1k | 896 | 7 | 55.2 | W 10-4 Broken Hill Brollys |
| S1 W20 | balanced | 9 speed 5, stamina 1, kicking 1, footyIQ 2 | $165k | -$18k | 929 | 10 | 55.3 | W 16-0 Geelong Gulls |
| S1 W21 | balanced | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $175k | $10k | 901 | 8 | 55.4 | W 10-0 Wagga Swagmen |
| S1 W22 | balanced | 12 speed 2, strength 2, stamina 2, handling 3, kicking 2, footyIQ 1 | $156k | -$18k | 894 | 12 | 55.5 | W 14-4 Katherine Crocs |
| S1 W23 | balanced | 6 speed 1, strength 2, stamina 1, footyIQ 2 | $169k | $13k | 867 | 6 | 55.6 | W 12-10 Shellharbour Scorpions |
| S1 W24 | balanced | 9 speed 3, strength 3, handling 1, footyIQ 2 | $150k | -$18k | 901 | 9 | 55.6 | W 4-0 Dubbo Diggers |
| S1 W25 final | balanced | 12 speed 1, strength 2, stamina 4, handling 1, kicking 1, footyIQ 3 | $172k | $22k | 886 | 12 | 55.8 | W 2-1 Mackay Marlins |
| S1 W26 final | balanced | 8 speed 5, kicking 1, footyIQ 2 | $194k | $22k | 965 | 8 | 55.8 | W 18-0 Cairns Cyclones |
| S1 W27 final | balanced | 8 speed 2, strength 1, handling 1, footyIQ 4 | $372k | $178k | 915 | 8 | 56.4 | W 11-4 Redcliffe Reapers |
| S2 trial 1 | balanced | 9 strength 3, stamina 2, handling 2, kicking 1, footyIQ 1 | $355k | -$17k | 768 | 9 | 56.5 | L 8-10 Redcliffe Reapers |
| S2 trial 2 | balanced | 6 speed 1, strength 1, stamina 2, kicking 1, footyIQ 1 | $348k | -$6.7k | 800 | 5 | 56.5 | W 4-0 Shellharbour Scorpions |
| S2 W1 | balanced | 10 speed 3, strength 2, stamina 1, handling 1, footyIQ 3 | $372k | $23k | 744 | 10 | 56.6 | L 8-16 Launceston Larrikins |
| S2 W2 | balanced | 6 speed 2, strength 2, stamina 1, kicking 1 | $355k | -$17k | 847 | 7 | 56.7 | W 12-4 Darwin Drovers |
| S2 W3 | balanced | 9 speed 2, stamina 1, handling 1, footyIQ 5 | $379k | $24k | 840 | 10 | 56.8 | W 14-4 Southport Stingrays |
| S2 W4 | balanced | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | $362k | -$17k | 830 | 6 | 56.8 | W 12-10 Broken Hill Brollys |
| S2 W5 | balanced | 7 speed 1, strength 1, kicking 1, footyIQ 4 | $386k | $24k | 735 | 7 | 56.9 | L 12-15 Geelong Gulls |
| S2 W6 | balanced | 13 speed 6, strength 1, stamina 4, handling 1, footyIQ 1 | $369k | -$17k | 910 | 13 | 57.0 | W 33-4 Wagga Swagmen |
| S2 W7 | balanced | 6 speed 2, handling 3, footyIQ 1 | $396k | $27k | 817 | 6 | 57.1 | W 12-0 Katherine Crocs |
| S2 W8 | balanced | 8 strength 3, stamina 1, kicking 2, footyIQ 2 | $379k | -$17k | 693 | 7 | 57.1 | D 0-0 Shellharbour Scorpions |
| S2 W9 | balanced | 8 speed 2, strength 3, handling 1, footyIQ 2 | $403k | $24k | 710 | 9 | 57.2 | L 4-5 Dubbo Diggers |
| S2 W10 | balanced | 8 speed 2, strength 2, stamina 1, handling 1, footyIQ 2 | $386k | -$17k | 763 | 9 | 57.3 | W 6-0 Mackay Marlins |
| S2 W11 | balanced | 7 strength 1, stamina 2, handling 1, kicking 1, footyIQ 2 | $410k | $24k | 819 | 7 | 57.3 | D 9-9 Ballarat Bushrangers |
| S2 W12 | balanced | 7 speed 3, strength 1, kicking 1, footyIQ 2 | $394k | -$16k | 777 | 7 | 57.4 | W 4-0 Cairns Cyclones |
| S2 W13 | balanced | 8 speed 3, strength 1, footyIQ 4 | $418k | $24k | 779 | 8 | 57.5 | D 4-4 Toowoomba Thunder |
| S2 W14 | balanced | 4 strength 2, handling 2 | $401k | -$17k | 767 | 3 | 57.5 | W 6-4 Woolloomooloo Wolves |
| S2 W15 | balanced | 12 speed 1, strength 1, stamina 4, handling 1, kicking 2, footyIQ 3 | $425k | $24k | 763 | 12 | 57.6 | W 1-0 Redcliffe Reapers |
| S2 W16 | balanced | 7 speed 3, stamina 2, footyIQ 2 | $408k | -$17k | 816 | 8 | 57.7 | L 20-23 Launceston Larrikins |
| S2 W17 | balanced | 11 speed 3, strength 2, stamina 3, handling 2, footyIQ 1 | $432k | $24k | 857 | 11 | 57.8 | W 22-0 Darwin Drovers |
| S2 W18 | balanced | 4 speed 1, kicking 2, footyIQ 1 | $416k | -$17k | 711 | 4 | 57.8 | L 0-8 Southport Stingrays |
| S2 W19 | balanced | 8 speed 2, strength 2, footyIQ 4 | $439k | $24k | 765 | 9 | 57.9 | W 4-0 Broken Hill Brollys |
| S2 W20 | balanced | 9 speed 2, strength 1, stamina 3, handling 2, footyIQ 1 | $420k | -$19k | 907 | 9 | 58.0 | W 29-4 Geelong Gulls |
| S2 W21 | balanced | 8 speed 4, stamina 1, handling 1, kicking 1, footyIQ 1 | $444k | $24k | 849 | 8 | 58.1 | W 26-16 Wagga Swagmen |
| S2 W22 | balanced | 7 strength 1, handling 2, kicking 1, footyIQ 3 | $427k | -$17k | 776 | 7 | 58.1 | W 6-5 Katherine Crocs |
| S2 W23 | balanced | 8 speed 2, strength 3, stamina 1, handling 1, footyIQ 1 | $443k | $16k | 827 | 8 | 58.2 | W 18-6 Shellharbour Scorpions |
| S2 W24 | balanced | 8 speed 3, strength 2, stamina 1, handling 1, kicking 1 | $426k | -$17k | 777 | 8 | 58.3 | L 6-10 Dubbo Diggers |
| S2 W25 final | balanced | 8 speed 2, stamina 1, handling 1, footyIQ 4 | $449k | $24k | 758 | 8 | 58.3 | W 10-4 Southport Stingrays |
| S2 W26 final | balanced | 8 speed 1, strength 2, stamina 2, kicking 1, footyIQ 2 | $473k | $24k | 848 | 8 | 58.4 | W 21-7 Toowoomba Thunder |
| S2 W27 final | balanced | 7 speed 2, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $637k | $164k | 833 | 7 | 59.6 | W 10-4 Dubbo Diggers |
| S3 trial 1 | balanced | 7 speed 3, strength 1, footyIQ 3 | $617k | -$20k | 637 | 7 | 59.6 | D 6-6 Wagga Swagmen |
| S3 trial 2 | balanced | 7 speed 3, strength 2, handling 1, footyIQ 1 | $610k | -$7.0k | 622 | 7 | 59.7 | L 0-6 Toowoomba Thunder |
| S3 W1 | balanced | 6 strength 2, stamina 1, handling 2, kicking 1 | $633k | $23k | 637 | 5 | 59.8 | L 4-16 Launceston Larrikins |
| S3 W2 | balanced | 6 speed 1, stamina 1, kicking 1, footyIQ 3 | $616k | -$17k | 625 | 6 | 59.8 | L 4-6 Darwin Drovers |
| S3 W3 | balanced | 7 speed 3, strength 1, stamina 1, footyIQ 2 | $640k | $23k | 740 | 7 | 59.9 | W 23-0 Southport Stingrays |
| S3 W4 | balanced | 9 speed 2, stamina 2, handling 3, footyIQ 2 | $622k | -$17k | 685 | 9 | 60.0 | W 6-4 Broken Hill Brollys |
| S3 W5 | balanced | 8 speed 1, strength 3, stamina 1, kicking 2, footyIQ 1 | $646k | $23k | 656 | 8 | 60.1 | L 10-11 Geelong Gulls |
| S3 W6 | balanced | 7 speed 2, strength 1, stamina 2, footyIQ 2 | $629k | -$17k | 674 | 6 | 60.2 | D 12-12 Wagga Swagmen |
| S3 W7 | balanced | 6 speed 2, strength 1, stamina 1, handling 2 | $652k | $23k | 705 | 7 | 60.2 | W 10-7 Katherine Crocs |
| S3 W8 | balanced | 7 speed 2, strength 1, handling 1, kicking 2, footyIQ 1 | $635k | -$17k | 712 | 7 | 60.3 | W 16-8 Shellharbour Scorpions |
| S3 W9 | balanced | 4 handling 1, footyIQ 3 | $659k | $25k | 687 | 5 | 60.3 | W 7-0 Dubbo Diggers |
| S3 W10 | balanced | 7 speed 3, strength 1, handling 1, footyIQ 2 | $642k | -$18k | 655 | 8 | 60.4 | L 6-16 Mackay Marlins |
| S3 W11 | balanced | 4 strength 2, handling 2 | $665k | $23k | 660 | 5 | 60.4 | D 12-12 Ballarat Bushrangers |
| S3 W12 | balanced | 6 speed 1, strength 1, stamina 1, kicking 2, footyIQ 1 | $647k | -$17k | 681 | 7 | 60.5 | D 1-1 Cairns Cyclones |
| S3 W13 | balanced | 5 speed 3, footyIQ 2 | $670k | $23k | 693 | 6 | 60.5 | W 13-4 Toowoomba Thunder |
| S3 W14 | balanced | 9 speed 3, stamina 2, handling 2, kicking 1, footyIQ 1 | $653k | -$17k | 733 | 10 | 60.6 | W 16-0 Woolloomooloo Wolves |
| S3 W15 | balanced | 4 speed 1, kicking 1, footyIQ 2 | $676k | $23k | 660 | 4 | 60.7 | D 4-4 Redcliffe Reapers |
| S3 W16 | balanced | 8 speed 2, strength 2, stamina 2, footyIQ 2 | $659k | -$17k | 722 | 10 | 60.7 | W 12-0 Launceston Larrikins |
| S3 W17 | balanced | 6 speed 2, stamina 1, handling 3 | $679k | $20k | 640 | 6 | 60.8 | L 4-12 Darwin Drovers |
| S3 W18 | balanced | 6 speed 1, handling 1, kicking 1, footyIQ 3 | $661k | -$17k | 725 | 8 | 60.9 | W 19-6 Southport Stingrays |
| S3 W19 | balanced | 6 speed 3, strength 2, kicking 1 | $684k | $23k | 682 | 7 | 60.9 | W 10-4 Broken Hill Brollys |
| S3 W20 | balanced | 6 speed 2, strength 1, handling 1, footyIQ 2 | $672k | -$12k | 707 | 7 | 61.0 | W 8-4 Geelong Gulls |
| S3 W21 | balanced | 8 speed 1, strength 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $694k | $23k | 732 | 9 | 61.1 | W 16-8 Wagga Swagmen |
| S3 W22 | balanced | 5 speed 1, stamina 2, kicking 1, footyIQ 1 | $677k | -$17k | 728 | 6 | 61.1 | W 20-4 Katherine Crocs |
| S3 W23 | balanced | 5 speed 2, handling 1, footyIQ 2 | $700k | $23k | 684 | 6 | 61.2 | L 13-16 Shellharbour Scorpions |
| S3 W24 | balanced | 6 speed 2, strength 2, kicking 1, footyIQ 1 | $682k | -$17k | 649 | 7 | 61.2 | L 4-14 Dubbo Diggers |
| S3 W25 final | balanced | 6 speed 1, handling 2, footyIQ 3 | $705k | $23k | 775 | 7 | 61.3 | W 24-8 Darwin Drovers |
| S3 W26 final | balanced | 3 strength 1, kicking 1, footyIQ 1 | $728k | $22k | 645 | 5 | 61.3 | L 4-10 Redcliffe Reapers |
| S3 W27 final | balanced | 4 speed 1, strength 1, handling 1, footyIQ 1 | $761k | $33k | 165 | 3 | 63.7 | no match |
| S4 trial 1 | balanced | 3 speed 2, strength 1 | $733k | -$27k | 613 | 5 | 63.7 | W 14-0 Cairns Cyclones |
| S4 trial 2 | balanced | 5 speed 1, stamina 2, handling 1, footyIQ 1 | $716k | -$17k | 605 | 8 | 63.7 | W 9-6 Dubbo Diggers |
| S4 W1 | balanced | 3 stamina 1, kicking 1, footyIQ 1 | $729k | $13k | 633 | 5 | 63.8 | W 12-6 Launceston Larrikins |
| S4 W2 | balanced | 7 speed 4, strength 1, handling 1, footyIQ 1 | $704k | -$25k | 661 | 9 | 63.8 | W 24-0 Darwin Drovers |
| S4 W3 | balanced | 3 speed 1, stamina 1, footyIQ 1 | $719k | $15k | 695 | 6 | 63.9 | W 37-6 Southport Stingrays |
| S4 W4 | balanced | 5 strength 1, handling 2, footyIQ 2 | $691k | -$27k | 556 | 7 | 63.9 | L 6-8 Broken Hill Brollys |
| S4 W5 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $706k | $15k | 596 | 4 | 63.9 | W 5-4 Geelong Gulls |
| S4 W6 | balanced | 4 strength 1, stamina 2, footyIQ 1 | $676k | -$30k | 568 | 5 | 64.0 | W 14-6 Wagga Swagmen |
| S4 W7 | balanced | 5 speed 3, strength 2 | $689k | $13k | 550 | 6 | 64.0 | W 19-18 Katherine Crocs |
| S4 W8 | balanced | 5 speed 1, handling 1, footyIQ 3 | $662k | -$27k | 636 | 6 | 64.1 | W 21-4 Shellharbour Scorpions |
| S4 W9 | balanced | 5 speed 1, strength 1, stamina 2, kicking 1 | $673k | $11k | 589 | 7 | 64.1 | W 6-4 Dubbo Diggers |
| S4 W10 | balanced | 3 speed 2, footyIQ 1 | $645k | -$27k | 659 | 8 | 64.2 | W 14-4 Mackay Marlins |
| S4 W11 | balanced | 2 speed 2 | $658k | $13k | 571 | 3 | 64.2 | L 4-6 Ballarat Bushrangers |
| S4 W12 | balanced | 2 speed 1, handling 1 | $631k | -$27k | 621 | 6 | 64.2 | W 4-0 Cairns Cyclones |
| S4 W13 | balanced | 1 footyIQ 1 | $644k | $13k | 591 | 4 | 64.2 | W 6-0 Toowoomba Thunder |
| S4 W14 | balanced | 1 strength 1 | $617k | -$27k | 560 | 5 | 64.2 | L 0-12 Woolloomooloo Wolves |
| S4 W15 | balanced | 7 speed 1, strength 2, stamina 2, handling 1, footyIQ 1 | $630k | $13k | 659 | 10 | 64.2 | W 22-0 Redcliffe Reapers |
| S4 W16 | balanced | 4 speed 2, stamina 1, footyIQ 1 | $603k | -$27k | 581 | 7 | 64.3 | W 1-0 Launceston Larrikins |
| S4 W17 | balanced | 3 speed 1, strength 1, stamina 1 | $616k | $13k | 642 | 8 | 64.3 | W 20-4 Darwin Drovers |
| S4 W18 | balanced | 3 speed 2, strength 1 | $588k | -$27k | 638 | 6 | 64.3 | W 20-10 Southport Stingrays |
| S4 W19 | balanced | 1 footyIQ 1 | $601k | $13k | 578 | 5 | 64.3 | L 4-14 Broken Hill Brollys |
| S4 W20 | balanced | 2 speed 1, handling 1 | $581k | -$20k | 602 | 5 | 64.3 | W 13-7 Geelong Gulls |
| S4 W21 | balanced | 3 strength 2, handling 1 | $594k | $13k | 572 | 6 | 64.3 | L 6-7 Wagga Swagmen |
| S4 W22 | balanced | 2 strength 1, footyIQ 1 | $566k | -$27k | 659 | 6 | 64.3 | W 25-12 Katherine Crocs |
| S4 W23 | balanced | 1 stamina 1 | $579k | $13k | 634 | 4 | 64.3 | W 21-4 Shellharbour Scorpions |
| S4 W24 | balanced | 3 speed 2, footyIQ 1 | $552k | -$27k | 578 | 7 | 64.4 | L 6-8 Dubbo Diggers |
| S4 W25 final | balanced | 2 speed 2 | $565k | $13k | 586 | 5 | 64.4 | L 4-6 Mackay Marlins |
| S4 W26 final | balanced | 1 footyIQ 1 | $535k | -$30k | 149 | 1 | 64.4 | no match |
| S4 W27 final | balanced | 3 stamina 1, footyIQ 2 | $535k | -$327 | 144 | 4 | 66.1 | no match |
| S5 trial 1 | balanced | 3 speed 1, stamina 1, footyIQ 1 | $517k | -$18k | 525 | 6 | 66.2 | L 4-6 Ballarat Bushrangers |
| S5 trial 2 | balanced | 1 strength 1 | $489k | -$28k | 525 | 3 | 66.1 | L 4-6 Darwin Drovers |
| S5 W1 | balanced | 3 speed 1, strength 1, handling 1 | $498k | $9.8k | 504 | 6 | 66.2 | L 6-8 Launceston Larrikins |
| S5 W2 | balanced | 2 speed 1, stamina 1 | $473k | -$25k | 529 | 5 | 66.2 | W 6-0 Darwin Drovers |
| S5 W3 | balanced | 2 strength 1, stamina 1 | $486k | $12k | 602 | 5 | 66.2 | W 25-6 Southport Stingrays |
| S5 W4 | balanced | 4 speed 3, strength 1 | $463k | -$23k | 590 | 8 | 66.2 | W 20-4 Broken Hill Brollys |
| S5 W5 | balanced | 4 speed 2, footyIQ 2 | $475k | $12k | 565 | 7 | 66.3 | W 17-0 Geelong Gulls |
| S5 W6 | balanced | 1 footyIQ 1 | $447k | -$28k | 600 | 4 | 66.3 | W 24-6 Wagga Swagmen |
| S5 W7 | balanced | 3 speed 1, strength 1, footyIQ 1 | $459k | $12k | 594 | 6 | 66.3 | W 17-0 Katherine Crocs |
| S5 W8 | balanced | 0 | $431k | -$28k | 565 | 3 | 66.3 | W 16-8 Shellharbour Scorpions |
| S5 W9 | balanced | 4 strength 2, stamina 1, handling 1 | $443k | $12k | 560 | 8 | 66.3 | W 12-11 Dubbo Diggers |
| S5 W10 | balanced | 2 strength 1, stamina 1 | $414k | -$28k | 583 | 5 | 66.3 | W 14-1 Mackay Marlins |
| S5 W11 | balanced | 2 speed 1, strength 1 | $426k | $12k | 556 | 4 | 66.3 | D 7-7 Ballarat Bushrangers |
| S5 W12 | balanced | 5 speed 2, stamina 2, footyIQ 1 | $399k | -$28k | 540 | 8 | 66.4 | D 4-4 Cairns Cyclones |
| S5 W13 | balanced | 2 speed 1, footyIQ 1 | $411k | $12k | 565 | 5 | 66.4 | W 13-6 Toowoomba Thunder |
| S5 W14 | balanced | 3 strength 1, stamina 1, footyIQ 1 | $382k | -$28k | 586 | 6 | 66.4 | W 15-6 Woolloomooloo Wolves |
| S5 W15 | balanced | 4 speed 3, stamina 1 | $395k | $12k | 547 | 7 | 66.5 | D 5-5 Redcliffe Reapers |
| S5 W16 | balanced | 2 strength 1, stamina 1 | $366k | -$28k | 572 | 5 | 66.5 | W 14-4 Launceston Larrikins |
| S5 W17 | balanced | 2 speed 1, handling 1 | $375k | $9.1k | 586 | 5 | 66.5 | W 24-0 Darwin Drovers |
| S5 W18 | balanced | 2 stamina 1, footyIQ 1 | $347k | -$28k | 591 | 6 | 66.5 | W 20-13 Southport Stingrays |
| S5 W19 | balanced | 2 strength 1, footyIQ 1 | $359k | $12k | 530 | 4 | 66.5 | L 10-14 Broken Hill Brollys |
| S5 W20 | balanced | 2 speed 2 | $331k | -$28k | 562 | 5 | 66.5 | L 8-12 Geelong Gulls |
| S5 W21 | balanced | 4 speed 2, strength 1, footyIQ 1 | $338k | $7.1k | 591 | 8 | 66.5 | W 19-12 Wagga Swagmen |
| S5 W22 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $310k | -$28k | 573 | 6 | 66.6 | W 12-0 Katherine Crocs |
| S5 W23 | balanced | 2 speed 1, strength 1 | $322k | $12k | 589 | 6 | 66.6 | W 20-0 Shellharbour Scorpions |
| S5 W24 | balanced | 2 handling 1, footyIQ 1 | $294k | -$28k | 563 | 5 | 66.6 | W 19-4 Dubbo Diggers |
| S5 W25 final | balanced | 4 stamina 3, footyIQ 1 | $306k | $12k | 597 | 7 | 66.6 | W 20-4 Launceston Larrikins |
| S5 W26 final | balanced | 3 speed 1, strength 2 | $317k | $10k | 546 | 5 | 66.7 | W 12-4 Shellharbour Scorpions |
| S5 W27 final | balanced | 2 speed 1, strength 1 | $467k | $151k | 539 | 4 | 68.4 | W 7-0 Toowoomba Thunder |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $285k | -$15k | 642 | 0.70 | 53.3 | 59.0 | 0.0% | 40.0% |
| S1 trial 2 | 20 | $271k | -$14k | 644 | 5.90 | 53.2 | 59.0 | 0.0% | 50.0% |
| S1 W1 | 20 | $278k | $6.8k | 636 | 4.20 | 53.2 | 59.0 | 0.0% | 50.0% |
| S1 W2 | 20 | $260k | -$18k | 632 | 7.55 | 53.3 | 59.1 | 0.0% | 60.0% |
| S1 W3 | 20 | $272k | $12k | 652 | 3.45 | 53.3 | 59.2 | 0.0% | 60.0% |
| S1 W4 | 20 | $255k | -$17k | 654 | 6.80 | 53.3 | 59.3 | 0.0% | 75.0% |
| S1 W5 | 20 | $264k | $9.3k | 657 | 8.20 | 53.4 | 59.4 | 0.0% | 65.0% |
| S1 W6 | 20 | $243k | -$21k | 652 | 7.00 | 53.5 | 59.6 | 0.0% | 65.0% |
| S1 W7 | 20 | $255k | $11k | 663 | 4.10 | 53.5 | 59.7 | 0.0% | 40.0% |
| S1 W8 | 20 | $238k | -$17k | 650 | 9.40 | 53.6 | 59.8 | 0.0% | 55.0% |
| S1 W9 | 20 | $249k | $11k | 660 | 4.45 | 53.6 | 59.9 | 0.0% | 75.0% |
| S1 W10 | 20 | $231k | -$18k | 654 | 7.00 | 53.7 | 60.0 | 0.0% | 60.0% |
| S1 W11 | 20 | $237k | $6.2k | 653 | 4.45 | 53.7 | 60.3 | 0.0% | 55.0% |
| S1 W12 | 20 | $220k | -$17k | 651 | 9.55 | 53.8 | 60.4 | 0.0% | 50.0% |
| S1 W13 | 20 | $233k | $13k | 656 | 4.45 | 53.8 | 60.5 | 0.0% | 50.0% |
| S1 W14 | 20 | $215k | -$17k | 655 | 8.05 | 53.9 | 60.6 | 0.0% | 65.0% |
| S1 W15 | 20 | $228k | $13k | 651 | 6.65 | 54.0 | 60.7 | 0.0% | 60.0% |
| S1 W16 | 20 | $209k | -$19k | 648 | 6.25 | 54.0 | 60.9 | 0.0% | 40.0% |
| S1 W17 | 20 | $221k | $12k | 640 | 4.40 | 54.1 | 61.0 | 0.0% | 35.0% |
| S1 W18 | 20 | $203k | -$18k | 658 | 10.45 | 54.2 | 61.1 | 0.0% | 65.0% |
| S1 W19 | 20 | $212k | $9.0k | 659 | 4.35 | 54.2 | 61.2 | 0.0% | 60.0% |
| S1 W20 | 20 | $191k | -$20k | 651 | 5.70 | 54.2 | 61.4 | 0.0% | 35.0% |
| S1 W21 | 20 | $198k | $6.3k | 658 | 6.00 | 54.3 | 61.5 | 0.0% | 35.0% |
| S1 W22 | 20 | $180k | -$18k | 663 | 8.15 | 54.4 | 61.7 | 0.0% | 80.0% |
| S1 W23 | 20 | $187k | $7.0k | 662 | 4.75 | 54.4 | 61.9 | 0.0% | 80.0% |
| S1 W24 | 20 | $169k | -$18k | 659 | 6.20 | 54.5 | 62.0 | 0.0% | 70.0% |
| S1 W25 final | 20 | $179k | $9.9k | 644 | 8.10 | 54.6 | 62.1 | 0.0% | 73.7% |
| S1 W26 final | 20 | $181k | $2.5k | 529 | 4.90 | 54.6 | 62.2 | 0.0% | 57.1% |
| S1 W27 final | 20 | $255k | $74k | 388 | 2.95 | 55.2 | 62.2 | 0.0% | 87.5% |
| S2 trial 1 | 20 | $242k | -$13k | 626 | 7.75 | 55.2 | 62.3 | 0.0% | 60.0% |
| S2 trial 2 | 20 | $230k | -$12k | 623 | 5.05 | 55.3 | 62.4 | 0.0% | 70.0% |
| S2 W1 | 20 | $247k | $17k | 621 | 6.55 | 55.3 | 62.5 | 0.0% | 65.0% |
| S2 W2 | 20 | $228k | -$19k | 641 | 5.60 | 55.4 | 62.7 | 0.0% | 65.0% |
| S2 W3 | 20 | $249k | $21k | 613 | 8.15 | 55.5 | 62.8 | 0.0% | 40.0% |
| S2 W4 | 20 | $233k | -$17k | 623 | 4.70 | 55.5 | 62.9 | 0.0% | 50.0% |
| S2 W5 | 20 | $252k | $19k | 640 | 6.40 | 55.6 | 63.0 | 0.0% | 80.0% |
| S2 W6 | 20 | $235k | -$17k | 639 | 5.90 | 55.6 | 63.1 | 0.0% | 65.0% |
| S2 W7 | 20 | $255k | $20k | 630 | 6.25 | 55.7 | 63.3 | 0.0% | 75.0% |
| S2 W8 | 20 | $236k | -$19k | 632 | 5.60 | 55.8 | 63.5 | 0.0% | 60.0% |
| S2 W9 | 20 | $256k | $20k | 634 | 10.85 | 55.9 | 63.6 | 0.0% | 50.0% |
| S2 W10 | 20 | $240k | -$16k | 630 | 5.70 | 55.9 | 63.7 | 0.0% | 50.0% |
| S2 W11 | 20 | $261k | $21k | 637 | 5.90 | 56.0 | 63.8 | 0.0% | 60.0% |
| S2 W12 | 20 | $245k | -$16k | 635 | 5.70 | 56.0 | 64.0 | 0.0% | 60.0% |
| S2 W13 | 20 | $267k | $21k | 628 | 5.80 | 56.0 | 64.1 | 0.0% | 50.0% |
| S2 W14 | 20 | $247k | -$19k | 623 | 5.30 | 56.1 | 64.3 | 0.0% | 50.0% |
| S2 W15 | 20 | $268k | $21k | 624 | 6.80 | 56.2 | 64.4 | 0.0% | 45.0% |
| S2 W16 | 20 | $252k | -$16k | 625 | 6.45 | 56.2 | 64.5 | 5.0% | 50.0% |
| S2 W17 | 20 | $271k | $19k | 628 | 6.50 | 56.3 | 64.6 | 0.0% | 65.0% |
| S2 W18 | 20 | $254k | -$16k | 634 | 5.75 | 56.3 | 64.8 | 5.0% | 70.0% |
| S2 W19 | 20 | $273k | $18k | 629 | 8.25 | 56.4 | 64.9 | 0.0% | 65.0% |
| S2 W20 | 20 | $254k | -$19k | 634 | 5.20 | 56.5 | 65.0 | 5.0% | 50.0% |
| S2 W21 | 20 | $274k | $20k | 641 | 6.30 | 56.5 | 65.2 | 5.0% | 60.0% |
| S2 W22 | 20 | $258k | -$16k | 623 | 5.50 | 56.6 | 65.3 | 5.0% | 55.0% |
| S2 W23 | 20 | $277k | $19k | 638 | 7.25 | 56.6 | 65.4 | 5.0% | 65.0% |
| S2 W24 | 20 | $261k | -$16k | 619 | 5.60 | 56.7 | 65.6 | 5.0% | 35.0% |
| S2 W25 final | 20 | $272k | $12k | 622 | 6.45 | 56.7 | 65.7 | 10.0% | 63.2% |
| S2 W26 final | 20 | $275k | $2.1k | 451 | 4.10 | 56.7 | 65.8 | 10.0% | 66.7% |
| S2 W27 final | 20 | $336k | $61k | 353 | 3.55 | 57.2 | 65.7 | 10.0% | 75.0% |
| S3 trial 1 | 19 | $344k | -$12k | 585 | 4.95 | 57.2 | 65.9 | 5.3% | 52.6% |
| S3 trial 2 | 19 | $330k | -$14k | 572 | 7.32 | 57.3 | 66.1 | 5.3% | 52.6% |
| S3 W1 | 19 | $352k | $21k | 587 | 5.05 | 57.3 | 66.2 | 5.3% | 52.6% |
| S3 W2 | 19 | $335k | -$17k | 586 | 5.84 | 57.4 | 66.3 | 5.3% | 47.4% |
| S3 W3 | 19 | $357k | $22k | 579 | 5.26 | 57.4 | 66.4 | 5.3% | 57.9% |
| S3 W4 | 19 | $339k | -$18k | 585 | 6.21 | 57.5 | 66.5 | 5.3% | 57.9% |
| S3 W5 | 19 | $361k | $22k | 584 | 5.47 | 57.5 | 66.6 | 5.3% | 47.4% |
| S3 W6 | 19 | $344k | -$17k | 574 | 6.47 | 57.5 | 66.6 | 5.3% | 47.4% |
| S3 W7 | 19 | $367k | $23k | 584 | 5.84 | 57.5 | 66.7 | 5.3% | 68.4% |
| S3 W8 | 19 | $350k | -$16k | 590 | 6.11 | 57.6 | 66.8 | 5.3% | 73.7% |
| S3 W9 | 19 | $373k | $23k | 590 | 4.95 | 57.6 | 66.9 | 5.3% | 52.6% |
| S3 W10 | 19 | $356k | -$17k | 577 | 6.37 | 57.7 | 67.0 | 5.3% | 73.7% |
| S3 W11 | 19 | $376k | $20k | 579 | 5.53 | 57.7 | 67.1 | 5.3% | 68.4% |
| S3 W12 | 19 | $357k | -$19k | 578 | 5.58 | 57.8 | 67.3 | 5.3% | 36.8% |
| S3 W13 | 19 | $377k | $20k | 585 | 5.42 | 57.8 | 67.4 | 5.3% | 47.4% |
| S3 W14 | 19 | $360k | -$16k | 592 | 6.58 | 57.9 | 67.5 | 5.3% | 57.9% |
| S3 W15 | 19 | $384k | $23k | 592 | 5.21 | 57.9 | 67.6 | 5.3% | 63.2% |
| S3 W16 | 19 | $367k | -$17k | 599 | 6.68 | 57.9 | 67.8 | 5.3% | 78.9% |
| S3 W17 | 19 | $389k | $22k | 595 | 5.11 | 58.0 | 67.9 | 5.3% | 52.6% |
| S3 W18 | 19 | $369k | -$20k | 599 | 6.26 | 58.0 | 68.0 | 5.3% | 57.9% |
| S3 W19 | 19 | $392k | $23k | 603 | 6.05 | 58.1 | 68.1 | 5.3% | 63.2% |
| S3 W20 | 19 | $375k | -$17k | 584 | 8.26 | 58.2 | 68.3 | 5.3% | 52.6% |
| S3 W21 | 19 | $397k | $22k | 602 | 6.00 | 58.2 | 68.4 | 5.3% | 78.9% |
| S3 W22 | 19 | $380k | -$17k | 596 | 6.16 | 58.3 | 68.5 | 5.3% | 52.6% |
| S3 W23 | 19 | $399k | $19k | 610 | 5.58 | 58.3 | 68.6 | 5.3% | 68.4% |
| S3 W24 | 19 | $379k | -$20k | 598 | 5.63 | 58.4 | 68.8 | 5.3% | 68.4% |
| S3 W25 final | 19 | $397k | $18k | 578 | 5.21 | 58.4 | 68.9 | 5.3% | 72.2% |
| S3 W26 final | 19 | $399k | $2.5k | 453 | 4.74 | 58.4 | 68.9 | 5.3% | 53.8% |
| S3 W27 final | 19 | $466k | $67k | 311 | 2.84 | 59.3 | 68.6 | 5.3% | 71.4% |
| S4 trial 1 | 19 | $449k | -$16k | 547 | 5.32 | 59.3 | 68.6 | 5.3% | 73.7% |
| S4 trial 2 | 19 | $433k | -$17k | 546 | 5.32 | 59.3 | 68.6 | 5.3% | 78.9% |
| S4 W1 | 19 | $452k | $19k | 541 | 5.95 | 59.3 | 68.5 | 5.3% | 73.7% |
| S4 W2 | 19 | $430k | -$22k | 527 | 5.58 | 59.3 | 68.6 | 5.3% | 42.1% |
| S4 W3 | 19 | $449k | $19k | 539 | 5.16 | 59.4 | 68.7 | 5.3% | 73.7% |
| S4 W4 | 19 | $428k | -$21k | 535 | 4.84 | 59.3 | 68.8 | 5.3% | 57.9% |
| S4 W5 | 19 | $447k | $19k | 540 | 5.79 | 59.3 | 68.9 | 5.3% | 52.6% |
| S4 W6 | 19 | $425k | -$21k | 539 | 5.05 | 59.4 | 69.0 | 5.3% | 68.4% |
| S4 W7 | 19 | $443k | $18k | 522 | 5.42 | 59.4 | 69.0 | 5.3% | 52.6% |
| S4 W8 | 19 | $422k | -$21k | 548 | 4.63 | 59.4 | 69.1 | 10.5% | 73.7% |
| S4 W9 | 19 | $441k | $19k | 527 | 6.42 | 59.4 | 69.2 | 10.5% | 63.2% |
| S4 W10 | 19 | $419k | -$21k | 541 | 4.68 | 59.4 | 69.2 | 10.5% | 47.4% |
| S4 W11 | 19 | $438k | $19k | 537 | 6.42 | 59.4 | 69.3 | 10.5% | 73.7% |
| S4 W12 | 19 | $418k | -$20k | 538 | 4.21 | 59.4 | 69.3 | 10.5% | 57.9% |
| S4 W13 | 19 | $434k | $16k | 535 | 5.68 | 59.5 | 69.4 | 10.5% | 73.7% |
| S4 W14 | 19 | $413k | -$21k | 532 | 4.58 | 59.5 | 69.5 | 10.5% | 73.7% |
| S4 W15 | 19 | $431k | $19k | 524 | 5.95 | 59.5 | 69.6 | 10.5% | 57.9% |
| S4 W16 | 19 | $410k | -$21k | 541 | 4.26 | 59.5 | 69.6 | 10.5% | 63.2% |
| S4 W17 | 19 | $420k | $9.9k | 524 | 5.89 | 59.5 | 69.8 | 10.5% | 52.6% |
| S4 W18 | 19 | $399k | -$21k | 539 | 5.84 | 59.6 | 69.9 | 10.5% | 63.2% |
| S4 W19 | 19 | $418k | $19k | 541 | 5.05 | 59.6 | 70.0 | 10.5% | 47.4% |
| S4 W20 | 19 | $396k | -$21k | 535 | 4.89 | 59.5 | 69.8 | 10.5% | 63.2% |
| S4 W21 | 19 | $416k | $19k | 539 | 6.32 | 59.6 | 69.9 | 10.5% | 68.4% |
| S4 W22 | 19 | $393k | -$23k | 539 | 4.95 | 59.5 | 69.9 | 10.5% | 63.2% |
| S4 W23 | 19 | $409k | $16k | 530 | 4.74 | 59.6 | 69.9 | 10.5% | 57.9% |
| S4 W24 | 19 | $388k | -$21k | 518 | 5.11 | 59.5 | 69.8 | 10.5% | 47.4% |
| S4 W25 final | 19 | $404k | $16k | 481 | 5.26 | 59.5 | 69.8 | 10.5% | 62.5% |
| S4 W26 final | 19 | $399k | -$5.6k | 355 | 3.37 | 59.4 | 69.7 | 10.5% | 60.0% |
| S4 W27 final | 19 | $436k | $38k | 252 | 2.53 | 60.7 | 69.6 | 10.5% | 50.0% |
| S5 trial 1 | 15 | $517k | -$20k | 510 | 5.07 | 61.7 | 71.7 | 0.0% | 66.7% |
| S5 trial 2 | 15 | $501k | -$17k | 509 | 5.07 | 61.7 | 71.8 | 0.0% | 73.3% |
| S5 W1 | 15 | $518k | $17k | 495 | 5.13 | 61.8 | 71.8 | 0.0% | 33.3% |
| S5 W2 | 15 | $496k | -$22k | 503 | 6.27 | 61.8 | 71.9 | 0.0% | 73.3% |
| S5 W3 | 15 | $512k | $17k | 509 | 4.53 | 61.8 | 72.0 | 0.0% | 73.3% |
| S5 W4 | 15 | $489k | -$23k | 519 | 5.00 | 61.8 | 72.0 | 0.0% | 73.3% |
| S5 W5 | 15 | $505k | $16k | 507 | 5.07 | 61.9 | 72.1 | 0.0% | 60.0% |
| S5 W6 | 15 | $482k | -$23k | 512 | 5.33 | 61.9 | 72.1 | 0.0% | 60.0% |
| S5 W7 | 15 | $500k | $18k | 518 | 4.80 | 61.9 | 72.2 | 0.0% | 73.3% |
| S5 W8 | 15 | $473k | -$27k | 506 | 5.13 | 62.0 | 72.3 | 0.0% | 60.0% |
| S5 W9 | 15 | $491k | $18k | 518 | 5.40 | 62.0 | 72.4 | 0.0% | 86.7% |
| S5 W10 | 15 | $464k | -$27k | 512 | 4.40 | 62.0 | 72.4 | 0.0% | 66.7% |
| S5 W11 | 15 | $477k | $13k | 500 | 5.00 | 62.1 | 72.5 | 0.0% | 53.3% |
| S5 W12 | 15 | $454k | -$23k | 506 | 5.40 | 62.1 | 72.6 | 0.0% | 66.7% |
| S5 W13 | 15 | $472k | $18k | 525 | 4.93 | 62.1 | 72.7 | 0.0% | 80.0% |
| S5 W14 | 15 | $449k | -$23k | 515 | 5.27 | 62.2 | 72.7 | 0.0% | 66.7% |
| S5 W15 | 15 | $467k | $18k | 509 | 5.47 | 62.2 | 72.7 | 0.0% | 53.3% |
| S5 W16 | 15 | $443k | -$23k | 519 | 5.27 | 62.2 | 72.8 | 0.0% | 73.3% |
| S5 W17 | 15 | $461k | $17k | 518 | 5.47 | 62.2 | 72.9 | 0.0% | 60.0% |
| S5 W18 | 15 | $434k | -$27k | 503 | 4.67 | 62.2 | 73.0 | 6.7% | 46.7% |
| S5 W19 | 15 | $451k | $17k | 520 | 4.87 | 62.2 | 73.0 | 0.0% | 73.3% |
| S5 W20 | 15 | $426k | -$24k | 511 | 4.67 | 62.3 | 73.1 | 6.7% | 73.3% |
| S5 W21 | 15 | $443k | $17k | 528 | 5.07 | 62.3 | 73.1 | 6.7% | 86.7% |
| S5 W22 | 15 | $420k | -$23k | 514 | 5.40 | 62.3 | 73.1 | 6.7% | 66.7% |
| S5 W23 | 15 | $436k | $17k | 516 | 5.27 | 62.3 | 73.2 | 0.0% | 80.0% |
| S5 W24 | 15 | $410k | -$26k | 515 | 4.93 | 62.3 | 73.3 | 13.3% | 66.7% |
| S5 W25 final | 15 | $428k | $18k | 527 | 5.20 | 62.5 | 73.2 | 0.0% | 73.3% |
| S5 W26 final | 15 | $428k | -$224 | 418 | 4.60 | 62.5 | 73.3 | 13.3% | 100.0% |
| S5 W27 final | 15 | $514k | $86k | 405 | 4.20 | 64.1 | 73.3 | 13.3% | 72.7% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × rush | 2329 | 65.3% | 90 | 73.3% | -8.0% |  |
| balanced × slide | 90 | 73.3% | 2329 | 65.3% | 8.0% |  |

### newcomer/normal/au

- 70 overall (best nine, including recruitment): 110.4 weeks; 5 reached, 15 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 196 of 400; median 26.0 weeks among those who did.
- Reaching potential stars: 202 of 400 (95 already there at week 0); median 52.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/377; S3 10/235; S5 29/143.
- Mean XP per completed season 16123; mean level-ups per completed season 158.4.
- Cash: opening 200000; mean weekly change -820; mean weeks in debt 17.0.
- Bankruptcy warnings: 342; forced sales: 38; sacked with missed solvency objective: 13.
- Save round-trips: 76; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: the board is sacking clubs for money. 13 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -566946 |
| upkeep | 0 |
| overhead | -43500 |
| sponsor | 0 |
| grant | 59569 |
| gate | 483692 |
| prize | 39211 |
| boardGrant | 17105 |
| events | -12471 |
| transfers | -450 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $188k | -$12k | 914 | 3 | 49.3 | W 20-11 Dubbo Diggers |
| S1 trial 2 | balanced | 3 strength 1, stamina 1, kicking 1 | $170k | -$18k | 845 | 7 | 49.4 | W 12-0 Wagga Swagmen |
| S1 W1 | balanced | 5 strength 2, stamina 1, kicking 1, footyIQ 1 | $177k | $7.2k | 838 | 8 | 49.4 | W 6-0 Launceston Larrikins |
| S1 W2 | balanced | 6 strength 2, stamina 1, handling 1, footyIQ 2 | $159k | -$18k | 798 | 7 | 49.4 | L 6-14 Darwin Drovers |
| S1 W3 | balanced | 7 strength 2, stamina 2, kicking 1, footyIQ 2 | $172k | $12k | 855 | 9 | 49.5 | L 4-14 Southport Stingrays |
| S1 W4 | balanced | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $156k | -$16k | 914 | 8 | 49.6 | W 8-0 Broken Hill Brollys |
| S1 W5 | balanced | 10 speed 1, strength 3, stamina 1, handling 1, kicking 1, footyIQ 3 | $170k | $14k | 981 | 13 | 49.7 | W 22-0 Geelong Gulls |
| S1 W6 | balanced | 8 speed 1, strength 2, stamina 2, handling 1, footyIQ 2 | $152k | -$18k | 959 | 8 | 49.7 | W 21-11 Wagga Swagmen |
| S1 W7 | balanced | 7 speed 1, strength 3, kicking 1, footyIQ 2 | $166k | $14k | 902 | 7 | 49.8 | W 6-0 Katherine Crocs |
| S1 W8 | balanced | 10 speed 1, strength 2, stamina 2, handling 1, footyIQ 4 | $148k | -$18k | 905 | 10 | 49.9 | W 8-0 Shellharbour Scorpions |
| S1 W9 | balanced | 9 speed 2, strength 1, stamina 1, kicking 2, footyIQ 3 | $161k | $13k | 930 | 9 | 50.0 | W 16-4 Dubbo Diggers |
| S1 W10 | balanced | 9 speed 3, strength 4, kicking 1, footyIQ 1 | $143k | -$18k | 891 | 9 | 50.1 | W 6-0 Mackay Marlins |
| S1 W11 | balanced | 7 speed 1, strength 2, stamina 2, handling 1, footyIQ 1 | $112k | -$31k | 916 | 8 | 51.1 | W 10-4 Ballarat Bushrangers |
| S1 W12 | balanced | 9 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $93k | -$20k | 861 | 9 | 51.2 | L 4-5 Cairns Cyclones |
| S1 W13 | balanced | 8 speed 2, strength 2, handling 1, kicking 1, footyIQ 2 | $108k | $15k | 927 | 9 | 51.2 | W 12-6 Toowoomba Thunder |
| S1 W14 | balanced | 11 speed 3, strength 2, stamina 1, handling 1, footyIQ 4 | $88k | -$20k | 839 | 11 | 51.3 | W 7-6 Woolloomooloo Wolves |
| S1 W15 | balanced | 8 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $99k | $11k | 834 | 8 | 51.4 | L 0-10 Redcliffe Reapers |
| S1 W16 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $80k | -$20k | 883 | 7 | 51.5 | W 6-0 Launceston Larrikins |
| S1 W17 | balanced | 7 strength 3, stamina 1, handling 1, footyIQ 2 | $93k | $13k | 842 | 7 | 51.5 | L 6-10 Darwin Drovers |
| S1 W18 | balanced | 10 speed 4, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $73k | -$20k | 898 | 10 | 51.6 | W 12-4 Southport Stingrays |
| S1 W19 | balanced | 7 speed 1, strength 1, stamina 1, kicking 1, footyIQ 3 | $81k | $7.6k | 823 | 7 | 51.7 | L 0-1 Broken Hill Brollys |
| S1 W20 | balanced | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $61k | -$20k | 813 | 9 | 51.7 | D 1-1 Geelong Gulls |
| S1 W21 | balanced | 9 speed 2, strength 2, stamina 1, handling 1, kicking 2, footyIQ 1 | $67k | $6.3k | 922 | 9 | 51.8 | W 12-6 Wagga Swagmen |
| S1 W22 | balanced | 8 speed 1, strength 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $48k | -$20k | 918 | 8 | 51.9 | W 16-9 Katherine Crocs |
| S1 W23 | balanced | 9 speed 5, strength 2, handling 1, footyIQ 1 | $56k | $8.8k | 939 | 9 | 52.0 | W 14-8 Shellharbour Scorpions |
| S1 W24 | balanced | 9 speed 1, strength 1, handling 1, kicking 1, footyIQ 5 | $37k | -$20k | 918 | 10 | 52.1 | D 6-6 Dubbo Diggers |
| S1 W25 final | balanced | 11 speed 2, strength 3, stamina 3, kicking 1, footyIQ 2 | $59k | $22k | 819 | 10 | 52.2 | L 7-10 Mackay Marlins |
| S1 W26 final | balanced | 4 speed 1, stamina 1, footyIQ 2 | $40k | -$20k | 219 | 0 | 52.2 | no match |
| S1 W27 final | balanced | 2 speed 1, handling 1 | $66k | $26k | 216 | 2 | 52.7 | no match |
| S2 trial 1 | balanced | 9 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $47k | -$18k | 724 | 9 | 52.8 | L 0-16 Mackay Marlins |
| S2 trial 2 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | $37k | -$10k | 881 | 8 | 52.8 | W 18-6 Katherine Crocs |
| S2 W1 | balanced | 8 speed 2, strength 1, stamina 2, kicking 1, footyIQ 2 | $51k | $14k | 721 | 8 | 52.9 | L 0-20 Launceston Larrikins |
| S2 W2 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 2 | $32k | -$18k | 787 | 6 | 52.9 | D 0-0 Darwin Drovers |
| S2 W3 | balanced | 11 speed 3, strength 4, kicking 1, footyIQ 3 | $50k | $18k | 815 | 11 | 53.1 | W 12-4 Southport Stingrays |
| S2 W4 | balanced | 5 stamina 3, handling 1, footyIQ 1 | $32k | -$18k | 778 | 5 | 53.1 | L 10-12 Broken Hill Brollys |
| S2 W5 | balanced | 8 speed 5, kicking 1, footyIQ 2 | $44k | $12k | 851 | 9 | 53.2 | W 16-13 Geelong Gulls |
| S2 W6 | balanced | 9 speed 2, strength 1, handling 1, footyIQ 5 | $25k | -$18k | 925 | 9 | 53.3 | W 31-0 Wagga Swagmen |
| S2 W7 | balanced | 6 strength 2, stamina 1, handling 2, kicking 1 | $46k | $21k | 741 | 7 | 53.3 | D 0-0 Katherine Crocs |
| S2 W8 | balanced | 5 speed 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $28k | -$18k | 723 | 5 | 53.3 | L 0-10 Shellharbour Scorpions |
| S2 W9 | balanced | 13 speed 4, strength 4, stamina 1, handling 2, footyIQ 2 | $42k | $14k | 867 | 16 | 53.5 | W 20-6 Dubbo Diggers |
| S2 W10 | balanced | 7 speed 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $24k | -$18k | 788 | 7 | 53.5 | W 6-0 Mackay Marlins |
| S2 W11 | balanced | 9 speed 1, strength 3, kicking 1, footyIQ 4 | $47k | $24k | 849 | 9 | 53.6 | W 14-6 Ballarat Bushrangers |
| S2 W12 | balanced | 7 speed 2, strength 1, stamina 2, footyIQ 2 | $21k | -$26k | 775 | 7 | 53.7 | D 6-6 Cairns Cyclones |
| S2 W13 | balanced | 9 speed 4, strength 2, handling 1, footyIQ 2 | $44k | $24k | 855 | 9 | 53.8 | W 19-7 Toowoomba Thunder |
| S2 W14 | balanced | 6 strength 1, stamina 1, handling 1, kicking 2, footyIQ 1 | $26k | -$18k | 744 | 5 | 53.8 | L 7-8 Woolloomooloo Wolves |
| S2 W15 | balanced | 9 speed 2, strength 1, stamina 3, handling 1, footyIQ 2 | $50k | $24k | 833 | 9 | 53.9 | W 16-4 Redcliffe Reapers |
| S2 W16 | balanced | 8 speed 2, strength 1, stamina 1, footyIQ 4 | $31k | -$18k | 825 | 9 | 54.0 | W 19-10 Launceston Larrikins |
| S2 W17 | balanced | 7 speed 1, strength 3, handling 2, footyIQ 1 | $55k | $24k | 717 | 7 | 54.0 | D 4-4 Darwin Drovers |
| S2 W18 | balanced | 6 speed 2, stamina 1, kicking 2, footyIQ 1 | $37k | -$18k | 786 | 6 | 54.1 | L 10-19 Southport Stingrays |
| S2 W19 | balanced | 11 speed 3, strength 1, stamina 3, footyIQ 4 | $59k | $22k | 797 | 11 | 54.2 | W 13-4 Broken Hill Brollys |
| S2 W20 | balanced | 7 speed 3, strength 1, stamina 1, handling 2 | $41k | -$18k | 769 | 6 | 54.3 | D 6-6 Geelong Gulls |
| S2 W21 | balanced | 8 speed 2, stamina 2, kicking 2, footyIQ 2 | $61k | $20k | 812 | 8 | 54.3 | W 10-0 Wagga Swagmen |
| S2 W22 | balanced | 7 speed 1, strength 1, handling 1, footyIQ 4 | $40k | -$21k | 773 | 7 | 54.4 | D 0-0 Katherine Crocs |
| S2 W23 | balanced | 7 speed 2, strength 2, stamina 1, handling 2 | $60k | $20k | 796 | 7 | 54.5 | D 16-16 Shellharbour Scorpions |
| S2 W24 | balanced | 6 speed 1, stamina 3, handling 2 | $42k | -$18k | 776 | 7 | 54.5 | D 0-0 Dubbo Diggers |
| S2 W25 final | balanced | 10 speed 3, strength 1, handling 1, kicking 2, footyIQ 3 | $67k | $24k | 815 | 10 | 54.6 | W 13-4 Wagga Swagmen |
| S2 W26 final | balanced | 11 speed 2, strength 6, footyIQ 3 | $90k | $24k | 804 | 11 | 54.7 | L 10-16 Darwin Drovers |
| S2 W27 final | balanced | 4 speed 1, stamina 2, handling 1 | $122k | $32k | 187 | 1 | 56.7 | no match |
| S3 trial 1 | balanced | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | $105k | -$18k | 736 | 6 | 56.8 | W 30-10 Woolloomooloo Wolves |
| S3 trial 2 | balanced | 4 kicking 1, footyIQ 3 | $97k | -$7.5k | 726 | 5 | 56.8 | W 12-4 Mackay Marlins |
| S3 W1 | balanced | 7 speed 2, strength 1, stamina 1, footyIQ 3 | $120k | $23k | 638 | 8 | 56.9 | L 0-10 Launceston Larrikins |
| S3 W2 | balanced | 7 speed 2, strength 1, stamina 2, handling 1, footyIQ 1 | $102k | -$18k | 768 | 7 | 57.0 | W 23-0 Darwin Drovers |
| S3 W3 | balanced | 6 speed 2, stamina 1, handling 2, kicking 1 | $127k | $24k | 620 | 6 | 57.0 | L 0-1 Southport Stingrays |
| S3 W4 | balanced | 7 speed 2, strength 1, stamina 1, kicking 1, footyIQ 2 | $114k | -$13k | 741 | 8 | 57.1 | W 25-0 Broken Hill Brollys |
| S3 W5 | balanced | 7 speed 3, strength 1, handling 1, footyIQ 2 | $135k | $21k | 731 | 7 | 57.2 | W 10-4 Geelong Gulls |
| S3 W6 | balanced | 5 speed 1, strength 1, handling 1, kicking 1, footyIQ 1 | $117k | -$18k | 683 | 6 | 57.3 | W 6-4 Wagga Swagmen |
| S3 W7 | balanced | 7 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $141k | $24k | 636 | 8 | 57.3 | D 6-6 Katherine Crocs |
| S3 W8 | balanced | 6 speed 2, strength 1, handling 2, footyIQ 1 | $123k | -$18k | 681 | 7 | 57.4 | W 8-6 Shellharbour Scorpions |
| S3 W9 | balanced | 6 speed 2, stamina 3, kicking 1 | $147k | $24k | 693 | 7 | 57.5 | W 13-4 Dubbo Diggers |
| S3 W10 | balanced | 5 speed 1, strength 1, handling 2, footyIQ 1 | $129k | -$18k | 603 | 5 | 57.5 | L 0-6 Mackay Marlins |
| S3 W11 | balanced | 6 speed 3, strength 1, kicking 1, footyIQ 1 | $153k | $24k | 719 | 7 | 57.6 | W 14-4 Ballarat Bushrangers |
| S3 W12 | balanced | 6 speed 1, strength 2, handling 1, kicking 1, footyIQ 1 | $135k | -$18k | 728 | 7 | 57.7 | W 18-7 Cairns Cyclones |
| S3 W13 | balanced | 6 strength 1, handling 2, footyIQ 3 | $162k | $27k | 650 | 7 | 57.7 | L 4-10 Toowoomba Thunder |
| S3 W14 | balanced | 7 speed 2, strength 1, kicking 1, footyIQ 3 | $144k | -$18k | 708 | 8 | 57.8 | W 12-4 Woolloomooloo Wolves |
| S3 W15 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $166k | $22k | 698 | 6 | 57.9 | L 10-12 Redcliffe Reapers |
| S3 W16 | balanced | 7 speed 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $148k | -$18k | 654 | 8 | 57.9 | L 6-11 Launceston Larrikins |
| S3 W17 | balanced | 4 speed 2, kicking 1, footyIQ 1 | $168k | $20k | 716 | 5 | 58.0 | W 16-4 Darwin Drovers |
| S3 W18 | balanced | 6 speed 2, handling 2, footyIQ 2 | $150k | -$18k | 727 | 7 | 58.0 | W 8-4 Southport Stingrays |
| S3 W19 | balanced | 4 speed 1, strength 1, kicking 1, footyIQ 1 | $174k | $25k | 677 | 6 | 58.1 | W 10-6 Broken Hill Brollys |
| S3 W20 | balanced | 8 speed 2, strength 2, stamina 2, handling 1, footyIQ 1 | $156k | -$18k | 737 | 9 | 58.2 | W 10-0 Geelong Gulls |
| S3 W21 | balanced | 5 stamina 1, handling 3, kicking 1 | $177k | $21k | 677 | 6 | 58.2 | W 14-10 Wagga Swagmen |
| S3 W22 | balanced | 9 speed 3, strength 1, stamina 1, kicking 1, footyIQ 3 | $159k | -$18k | 677 | 10 | 58.3 | W 4-0 Katherine Crocs |
| S3 W23 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $183k | $24k | 728 | 5 | 58.4 | W 17-4 Shellharbour Scorpions |
| S3 W24 | balanced | 9 speed 2, strength 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $164k | -$18k | 730 | 11 | 58.5 | W 24-0 Dubbo Diggers |
| S3 W25 final | balanced | 5 speed 2, strength 1, kicking 1, footyIQ 1 | $188k | $24k | 730 | 6 | 58.5 | W 17-16 Woolloomooloo Wolves |
| S3 W26 final | balanced | 4 speed 1, handling 1, footyIQ 2 | $211k | $23k | 730 | 5 | 58.6 | W 14-6 Launceston Larrikins |
| S3 W27 final | balanced | 7 speed 1, stamina 1, handling 2, kicking 1, footyIQ 2 | $410k | $198k | 737 | 8 | 59.9 | W 10-6 Redcliffe Reapers |
| S4 trial 1 | balanced | 6 speed 2, strength 1, kicking 1, footyIQ 2 | $385k | -$25k | 589 | 6 | 60.0 | L 6-12 Ballarat Bushrangers |
| S4 trial 2 | balanced | 4 speed 2, strength 1, footyIQ 1 | $370k | -$14k | 580 | 4 | 60.1 | L 6-16 Dubbo Diggers |
| S4 W1 | balanced | 6 speed 2, handling 2, footyIQ 2 | $387k | $17k | 622 | 8 | 60.1 | W 17-10 Launceston Larrikins |
| S4 W2 | balanced | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | $362k | -$25k | 532 | 7 | 60.2 | L 15-16 Darwin Drovers |
| S4 W3 | balanced | 2 speed 1, footyIQ 1 | $379k | $17k | 583 | 3 | 60.2 | W 13-12 Southport Stingrays |
| S4 W4 | balanced | 3 speed 2, stamina 1 | $354k | -$25k | 660 | 5 | 60.2 | W 10-0 Broken Hill Brollys |
| S4 W5 | balanced | 5 speed 1, handling 3, footyIQ 1 | $373k | $19k | 668 | 8 | 60.2 | W 14-0 Geelong Gulls |
| S4 W6 | balanced | 4 stamina 1, kicking 1, footyIQ 2 | $350k | -$23k | 620 | 6 | 60.3 | W 12-0 Wagga Swagmen |
| S4 W7 | balanced | 8 speed 1, strength 5, footyIQ 2 | $369k | $19k | 602 | 9 | 60.4 | W 6-0 Katherine Crocs |
| S4 W8 | balanced | 4 speed 2, strength 2 | $346k | -$23k | 635 | 7 | 60.4 | W 17-8 Shellharbour Scorpions |
| S4 W9 | balanced | 5 speed 1, stamina 2, handling 1, footyIQ 1 | $363k | $17k | 619 | 5 | 60.5 | W 6-0 Dubbo Diggers |
| S4 W10 | balanced | 4 speed 2, strength 1, kicking 1 | $338k | -$25k | 611 | 6 | 60.5 | W 12-4 Mackay Marlins |
| S4 W11 | balanced | 3 speed 1, footyIQ 2 | $355k | $17k | 645 | 6 | 60.5 | W 8-4 Ballarat Bushrangers |
| S4 W12 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $331k | -$25k | 572 | 5 | 60.6 | L 4-10 Cairns Cyclones |
| S4 W13 | balanced | 2 stamina 1, handling 1 | $348k | $17k | 628 | 5 | 60.6 | W 10-0 Toowoomba Thunder |
| S4 W14 | balanced | 2 strength 2 | $323k | -$25k | 626 | 7 | 60.6 | W 10-0 Woolloomooloo Wolves |
| S4 W15 | balanced | 2 speed 2 | $340k | $17k | 634 | 5 | 60.6 | W 8-0 Redcliffe Reapers |
| S4 W16 | balanced | 3 stamina 2, footyIQ 1 | $315k | -$25k | 580 | 7 | 60.6 | L 4-6 Launceston Larrikins |
| S4 W17 | balanced | 5 speed 2, strength 1, stamina 2 | $332k | $17k | 641 | 8 | 60.7 | W 14-6 Darwin Drovers |
| S4 W18 | balanced | 3 speed 2, handling 1 | $307k | -$25k | 627 | 6 | 60.7 | W 17-4 Southport Stingrays |
| S4 W19 | balanced | 1 footyIQ 1 | $324k | $17k | 612 | 6 | 60.7 | W 6-4 Broken Hill Brollys |
| S4 W20 | balanced | 2 stamina 1, handling 1 | $299k | -$25k | 591 | 5 | 60.7 | L 8-13 Geelong Gulls |
| S4 W21 | balanced | 4 speed 2, strength 2 | $316k | $17k | 600 | 7 | 60.7 | W 8-1 Wagga Swagmen |
| S4 W22 | balanced | 3 speed 1, strength 1, stamina 1 | $291k | -$25k | 606 | 7 | 60.7 | W 14-4 Katherine Crocs |
| S4 W23 | balanced | 1 handling 1 | $308k | $17k | 690 | 5 | 60.7 | W 24-0 Shellharbour Scorpions |
| S4 W24 | balanced | 3 speed 1, footyIQ 2 | $287k | -$22k | 639 | 7 | 60.8 | W 11-0 Dubbo Diggers |
| S4 W25 final | balanced | 3 speed 2, footyIQ 1 | $304k | $17k | 698 | 8 | 60.8 | W 20-0 Launceston Larrikins |
| S4 W26 final | balanced | 2 speed 1, footyIQ 1 | $319k | $15k | 647 | 4 | 60.8 | W 6-0 Darwin Drovers |
| S4 W27 final | balanced | 3 speed 1, footyIQ 2 | $499k | $180k | 611 | 8 | 62.1 | W 12-10 Toowoomba Thunder |
| S5 trial 1 | balanced | 3 speed 1, strength 1, handling 1 | $473k | -$26k | 484 | 5 | 62.1 | L 4-6 Katherine Crocs |
| S5 trial 2 | balanced | 0 | $458k | -$15k | 562 | 3 | 62.1 | W 23-21 Geelong Gulls |
| S5 W1 | balanced | 5 speed 1, strength 2, stamina 2 | $474k | $16k | 558 | 9 | 62.1 | W 12-10 Launceston Larrikins |
| S5 W2 | balanced | 0 | $449k | -$26k | 538 | 4 | 62.1 | W 13-4 Darwin Drovers |
| S5 W3 | balanced | 3 speed 1, strength 1, footyIQ 1 | $465k | $16k | 497 | 5 | 62.1 | D 13-13 Southport Stingrays |
| S5 W4 | balanced | 3 speed 1, strength 1, stamina 1 | $379k | -$86k | 569 | 6 | 62.5 | W 29-8 Broken Hill Brollys |
| S5 W5 | balanced | 2 speed 1, footyIQ 1 | $394k | $15k | 563 | 6 | 62.5 | W 8-0 Geelong Gulls |
| S5 W6 | balanced | 2 strength 1, stamina 1 | $362k | -$32k | 544 | 4 | 62.5 | D 10-10 Wagga Swagmen |
| S5 W7 | balanced | 3 speed 1, stamina 1, handling 1 | $377k | $14k | 547 | 6 | 62.5 | W 10-0 Katherine Crocs |
| S5 W8 | balanced | 2 strength 1, stamina 1 | $349k | -$28k | 584 | 6 | 62.5 | W 24-0 Shellharbour Scorpions |
| S5 W9 | balanced | 4 speed 2, strength 1, stamina 1 | $369k | $19k | 577 | 7 | 62.5 | W 25-7 Dubbo Diggers |
| S5 W10 | balanced | 0 | $341k | -$28k | 499 | 3 | 62.5 | L 0-13 Mackay Marlins |
| S5 W11 | balanced | 2 footyIQ 2 | $356k | $14k | 555 | 5 | 62.5 | W 4-0 Ballarat Bushrangers |
| S5 W12 | balanced | 2 speed 2 | $328k | -$28k | 529 | 5 | 62.5 | D 6-6 Cairns Cyclones |
| S5 W13 | balanced | 3 speed 1, strength 2 | $343k | $14k | 597 | 6 | 62.5 | W 31-0 Toowoomba Thunder |
| S5 W14 | balanced | 3 speed 1, stamina 2 | $315k | -$28k | 556 | 7 | 62.5 | W 8-0 Woolloomooloo Wolves |
| S5 W15 | balanced | 4 speed 3, handling 1 | $330k | $14k | 574 | 6 | 62.6 | W 12-0 Redcliffe Reapers |
| S5 W16 | balanced | 0 | $302k | -$28k | 549 | 3 | 62.5 | W 18-7 Launceston Larrikins |
| S5 W17 | balanced | 5 speed 1, strength 1, stamina 1, footyIQ 2 | $324k | $21k | 517 | 8 | 62.6 | L 10-21 Darwin Drovers |
| S5 W18 | balanced | 1 stamina 1 | $296k | -$28k | 496 | 3 | 62.6 | L 6-22 Southport Stingrays |
| S5 W19 | balanced | 3 strength 2, footyIQ 1 | $311k | $14k | 542 | 7 | 62.6 | W 12-6 Broken Hill Brollys |
| S5 W20 | balanced | 2 speed 1, footyIQ 1 | $283k | -$27k | 541 | 5 | 62.6 | W 12-8 Geelong Gulls |
| S5 W21 | balanced | 2 speed 1, strength 1 | $295k | $12k | 546 | 5 | 62.6 | W 10-4 Wagga Swagmen |
| S5 W22 | balanced | 2 strength 1, handling 1 | $267k | -$27k | 539 | 5 | 62.6 | W 12-0 Katherine Crocs |
| S5 W23 | balanced | 4 speed 1, strength 1, stamina 2 | $282k | $15k | 489 | 7 | 62.6 | L 0-1 Shellharbour Scorpions |
| S5 W24 | balanced | 1 strength 1 | $255k | -$28k | 567 | 4 | 62.6 | W 22-13 Dubbo Diggers |
| S5 W25 final | balanced | 2 speed 2 | $269k | $14k | 536 | 5 | 62.6 | L 10-11 Geelong Gulls |
| S5 W26 final | balanced | 1 strength 1 | $236k | -$33k | 140 | 1 | 62.6 | no match |
| S5 W27 final | balanced | 0 | $233k | -$3.0k | 138 | 0 | 63.6 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $184k | -$16k | 645 | 0.65 | 49.5 | 55.4 | 0.0% | 45.0% |
| S1 trial 2 | 20 | $170k | -$15k | 634 | 5.65 | 49.4 | 55.4 | 0.0% | 40.0% |
| S1 W1 | 20 | $176k | $6.8k | 647 | 4.30 | 49.4 | 55.5 | 0.0% | 70.0% |
| S1 W2 | 20 | $158k | -$19k | 641 | 8.10 | 49.5 | 55.6 | 0.0% | 35.0% |
| S1 W3 | 20 | $168k | $11k | 643 | 3.35 | 49.5 | 55.6 | 0.0% | 35.0% |
| S1 W4 | 20 | $150k | -$19k | 639 | 6.50 | 49.5 | 55.7 | 0.0% | 55.0% |
| S1 W5 | 20 | $157k | $7.3k | 645 | 7.95 | 49.6 | 55.9 | 0.0% | 55.0% |
| S1 W6 | 20 | $136k | -$22k | 640 | 7.15 | 49.7 | 56.1 | 0.0% | 55.0% |
| S1 W7 | 20 | $143k | $7.8k | 648 | 3.60 | 49.7 | 56.2 | 0.0% | 50.0% |
| S1 W8 | 20 | $125k | -$18k | 648 | 9.80 | 49.8 | 56.3 | 0.0% | 55.0% |
| S1 W9 | 20 | $134k | $9.1k | 651 | 3.80 | 49.8 | 56.4 | 0.0% | 55.0% |
| S1 W10 | 20 | $116k | -$19k | 642 | 7.05 | 49.9 | 56.5 | 0.0% | 55.0% |
| S1 W11 | 20 | $123k | $7.7k | 642 | 4.25 | 49.9 | 56.7 | 0.0% | 30.0% |
| S1 W12 | 20 | $105k | -$18k | 649 | 9.50 | 50.0 | 56.9 | 0.0% | 35.0% |
| S1 W13 | 20 | $115k | $11k | 640 | 4.25 | 50.0 | 56.9 | 0.0% | 30.0% |
| S1 W14 | 20 | $97k | -$18k | 642 | 8.45 | 50.1 | 57.1 | 0.0% | 45.0% |
| S1 W15 | 20 | $108k | $11k | 647 | 6.45 | 50.2 | 57.2 | 0.0% | 35.0% |
| S1 W16 | 20 | $88k | -$20k | 658 | 6.15 | 50.2 | 57.4 | 5.0% | 55.0% |
| S1 W17 | 20 | $97k | $9.5k | 634 | 4.05 | 50.3 | 57.5 | 0.0% | 40.0% |
| S1 W18 | 20 | $78k | -$19k | 647 | 10.95 | 50.4 | 57.6 | 5.0% | 55.0% |
| S1 W19 | 20 | $87k | $8.6k | 661 | 3.95 | 50.4 | 57.7 | 5.0% | 70.0% |
| S1 W20 | 20 | $68k | -$19k | 639 | 5.90 | 50.4 | 57.8 | 10.0% | 40.0% |
| S1 W21 | 20 | $75k | $6.9k | 660 | 6.10 | 50.5 | 58.0 | 5.0% | 65.0% |
| S1 W22 | 20 | $56k | -$19k | 669 | 8.00 | 50.6 | 58.2 | 10.0% | 60.0% |
| S1 W23 | 20 | $64k | $7.4k | 658 | 4.70 | 50.7 | 58.4 | 10.0% | 60.0% |
| S1 W24 | 20 | $45k | -$19k | 656 | 6.30 | 50.7 | 58.5 | 25.0% | 45.0% |
| S1 W25 final | 20 | $38k | -$7.0k | 525 | 6.30 | 50.8 | 58.8 | 30.0% | 64.3% |
| S1 W26 final | 20 | $33k | -$4.5k | 390 | 4.20 | 50.8 | 58.8 | 30.0% | 55.6% |
| S1 W27 final | 20 | $84k | $51k | 295 | 1.85 | 51.2 | 58.6 | 30.0% | 100.0% |
| S2 trial 1 | 20 | $71k | -$13k | 627 | 7.20 | 51.1 | 58.3 | 30.0% | 55.0% |
| S2 trial 2 | 20 | $58k | -$13k | 621 | 5.95 | 51.0 | 58.0 | 30.0% | 50.0% |
| S2 W1 | 20 | $73k | $15k | 606 | 5.60 | 50.9 | 58.1 | 30.0% | 45.0% |
| S2 W2 | 20 | $56k | -$17k | 619 | 5.70 | 50.8 | 57.8 | 30.0% | 60.0% |
| S2 W3 | 20 | $74k | $18k | 605 | 7.80 | 50.8 | 57.8 | 30.0% | 30.0% |
| S2 W4 | 20 | $58k | -$16k | 611 | 5.25 | 50.8 | 57.7 | 30.0% | 50.0% |
| S2 W5 | 20 | $76k | $18k | 611 | 6.20 | 50.8 | 57.8 | 30.0% | 40.0% |
| S2 W6 | 20 | $60k | -$16k | 626 | 5.75 | 50.8 | 57.8 | 30.0% | 75.0% |
| S2 W7 | 20 | $79k | $20k | 601 | 5.65 | 50.9 | 58.0 | 30.0% | 40.0% |
| S2 W8 | 20 | $63k | -$16k | 590 | 4.90 | 50.9 | 58.0 | 30.0% | 30.0% |
| S2 W9 | 20 | $82k | $19k | 608 | 10.20 | 51.0 | 58.2 | 30.0% | 60.0% |
| S2 W10 | 20 | $65k | -$16k | 600 | 5.50 | 51.0 | 58.2 | 30.0% | 45.0% |
| S2 W11 | 20 | $85k | $20k | 612 | 5.60 | 51.0 | 58.4 | 30.0% | 60.0% |
| S2 W12 | 20 | $69k | -$16k | 605 | 5.90 | 51.1 | 58.5 | 30.0% | 40.0% |
| S2 W13 | 20 | $88k | $19k | 604 | 6.15 | 51.2 | 58.6 | 30.0% | 50.0% |
| S2 W14 | 20 | $72k | -$16k | 594 | 4.75 | 51.2 | 58.7 | 35.0% | 20.0% |
| S2 W15 | 20 | $92k | $20k | 591 | 6.00 | 51.2 | 58.8 | 30.0% | 30.0% |
| S2 W16 | 20 | $76k | -$16k | 604 | 6.50 | 51.3 | 59.0 | 35.0% | 55.0% |
| S2 W17 | 20 | $93k | $17k | 603 | 5.75 | 51.4 | 59.1 | 35.0% | 40.0% |
| S2 W18 | 20 | $77k | -$16k | 611 | 6.15 | 51.4 | 59.2 | 35.0% | 55.0% |
| S2 W19 | 20 | $95k | $18k | 616 | 7.10 | 51.4 | 59.3 | 35.0% | 55.0% |
| S2 W20 | 20 | $79k | -$16k | 608 | 5.85 | 51.5 | 59.5 | 35.0% | 50.0% |
| S2 W21 | 20 | $98k | $20k | 607 | 5.45 | 51.5 | 59.6 | 35.0% | 60.0% |
| S2 W22 | 20 | $83k | -$16k | 606 | 5.80 | 51.6 | 59.7 | 35.0% | 50.0% |
| S2 W23 | 20 | $103k | $20k | 611 | 6.40 | 51.6 | 59.8 | 35.0% | 60.0% |
| S2 W24 | 20 | $87k | -$15k | 618 | 5.60 | 51.6 | 59.9 | 35.0% | 60.0% |
| S2 W25 final | 20 | $90k | $3.1k | 439 | 4.65 | 51.6 | 59.9 | 35.0% | 58.3% |
| S2 W26 final | 20 | $87k | -$3.2k | 323 | 3.30 | 51.7 | 60.0 | 40.0% | 71.4% |
| S2 W27 final | 20 | $123k | $36k | 262 | 2.80 | 52.5 | 60.0 | 35.0% | 60.0% |
| S3 trial 1 | 14 | $210k | -$14k | 580 | 5.14 | 53.4 | 62.3 | 7.1% | 71.4% |
| S3 trial 2 | 14 | $198k | -$12k | 574 | 7.29 | 53.4 | 62.2 | 14.3% | 78.6% |
| S3 W1 | 14 | $219k | $22k | 558 | 4.64 | 53.4 | 62.2 | 7.1% | 57.1% |
| S3 W2 | 14 | $201k | -$19k | 582 | 6.14 | 53.4 | 62.2 | 14.3% | 57.1% |
| S3 W3 | 14 | $223k | $23k | 557 | 5.00 | 53.4 | 62.2 | 7.1% | 42.9% |
| S3 W4 | 14 | $203k | -$20k | 556 | 4.93 | 53.4 | 62.2 | 14.3% | 57.1% |
| S3 W5 | 14 | $225k | $22k | 553 | 4.93 | 53.4 | 62.2 | 7.1% | 42.9% |
| S3 W6 | 14 | $208k | -$17k | 568 | 6.64 | 53.4 | 62.3 | 21.4% | 50.0% |
| S3 W7 | 14 | $227k | $19k | 561 | 6.07 | 53.5 | 62.5 | 7.1% | 50.0% |
| S3 W8 | 14 | $210k | -$17k | 566 | 5.36 | 53.5 | 62.6 | 21.4% | 71.4% |
| S3 W9 | 14 | $232k | $23k | 566 | 5.64 | 53.6 | 62.7 | 7.1% | 57.1% |
| S3 W10 | 14 | $214k | -$18k | 554 | 5.64 | 53.6 | 62.8 | 21.4% | 42.9% |
| S3 W11 | 14 | $237k | $23k | 560 | 5.29 | 53.6 | 62.9 | 14.3% | 42.9% |
| S3 W12 | 14 | $214k | -$23k | 572 | 5.29 | 53.7 | 63.1 | 21.4% | 57.1% |
| S3 W13 | 14 | $231k | $17k | 570 | 5.21 | 53.8 | 63.3 | 7.1% | 35.7% |
| S3 W14 | 14 | $214k | -$17k | 573 | 6.86 | 53.8 | 63.5 | 14.3% | 71.4% |
| S3 W15 | 14 | $237k | $22k | 564 | 4.93 | 53.8 | 63.5 | 14.3% | 35.7% |
| S3 W16 | 14 | $219k | -$18k | 568 | 6.50 | 53.9 | 63.7 | 14.3% | 57.1% |
| S3 W17 | 14 | $241k | $23k | 560 | 4.29 | 53.9 | 63.7 | 14.3% | 28.6% |
| S3 W18 | 14 | $219k | -$22k | 582 | 5.86 | 54.0 | 64.0 | 14.3% | 50.0% |
| S3 W19 | 14 | $241k | $22k | 581 | 5.86 | 54.1 | 64.1 | 14.3% | 57.1% |
| S3 W20 | 14 | $224k | -$18k | 581 | 7.79 | 54.1 | 64.2 | 14.3% | 78.6% |
| S3 W21 | 14 | $246k | $22k | 575 | 5.71 | 54.2 | 64.3 | 14.3% | 71.4% |
| S3 W22 | 14 | $228k | -$18k | 562 | 6.07 | 54.2 | 64.4 | 14.3% | 35.7% |
| S3 W23 | 14 | $246k | $19k | 586 | 5.79 | 54.3 | 64.6 | 14.3% | 42.9% |
| S3 W24 | 14 | $228k | -$18k | 576 | 5.64 | 54.3 | 64.7 | 14.3% | 35.7% |
| S3 W25 final | 14 | $239k | $11k | 482 | 4.50 | 54.4 | 64.8 | 14.3% | 36.4% |
| S3 W26 final | 14 | $231k | -$8.4k | 278 | 3.00 | 54.4 | 64.8 | 14.3% | 100.0% |
| S3 W27 final | 14 | $275k | $44k | 269 | 2.71 | 55.3 | 64.4 | 21.4% | 50.0% |
| S4 trial 1 | 12 | $315k | -$20k | 518 | 5.25 | 55.9 | 65.5 | 8.3% | 33.3% |
| S4 trial 2 | 12 | $300k | -$15k | 511 | 4.33 | 55.8 | 65.4 | 8.3% | 58.3% |
| S4 W1 | 12 | $321k | $20k | 525 | 6.00 | 55.8 | 65.3 | 8.3% | 58.3% |
| S4 W2 | 12 | $300k | -$21k | 516 | 4.92 | 55.7 | 65.1 | 8.3% | 41.7% |
| S4 W3 | 12 | $320k | $20k | 514 | 4.33 | 55.7 | 65.2 | 8.3% | 41.7% |
| S4 W4 | 12 | $297k | -$22k | 521 | 4.92 | 55.7 | 65.1 | 8.3% | 50.0% |
| S4 W5 | 12 | $318k | $21k | 536 | 6.33 | 55.7 | 65.2 | 8.3% | 83.3% |
| S4 W6 | 12 | $297k | -$21k | 522 | 4.33 | 55.7 | 65.3 | 8.3% | 75.0% |
| S4 W7 | 12 | $317k | $20k | 511 | 5.83 | 55.8 | 65.4 | 8.3% | 66.7% |
| S4 W8 | 12 | $297k | -$21k | 522 | 5.25 | 55.8 | 65.4 | 8.3% | 83.3% |
| S4 W9 | 12 | $318k | $21k | 510 | 5.00 | 55.9 | 65.5 | 8.3% | 50.0% |
| S4 W10 | 12 | $296k | -$21k | 518 | 5.67 | 55.9 | 65.6 | 8.3% | 50.0% |
| S4 W11 | 12 | $317k | $21k | 514 | 5.00 | 55.9 | 65.7 | 8.3% | 33.3% |
| S4 W12 | 12 | $296k | -$21k | 509 | 4.92 | 56.0 | 65.7 | 8.3% | 50.0% |
| S4 W13 | 12 | $317k | $21k | 538 | 5.25 | 56.0 | 65.8 | 8.3% | 83.3% |
| S4 W14 | 12 | $296k | -$21k | 519 | 4.92 | 56.0 | 65.9 | 8.3% | 50.0% |
| S4 W15 | 12 | $316k | $20k | 523 | 4.50 | 56.0 | 66.0 | 0.0% | 66.7% |
| S4 W16 | 12 | $294k | -$22k | 515 | 5.00 | 56.1 | 66.1 | 8.3% | 66.7% |
| S4 W17 | 12 | $316k | $22k | 528 | 5.83 | 56.1 | 66.1 | 0.0% | 66.7% |
| S4 W18 | 12 | $294k | -$21k | 521 | 5.00 | 56.1 | 66.2 | 0.0% | 50.0% |
| S4 W19 | 12 | $314k | $20k | 525 | 5.83 | 56.2 | 66.4 | 0.0% | 75.0% |
| S4 W20 | 12 | $293k | -$21k | 524 | 4.83 | 56.3 | 66.5 | 8.3% | 66.7% |
| S4 W21 | 12 | $313k | $21k | 512 | 5.25 | 56.3 | 66.6 | 0.0% | 58.3% |
| S4 W22 | 12 | $286k | -$27k | 528 | 5.67 | 56.4 | 66.7 | 8.3% | 66.7% |
| S4 W23 | 12 | $301k | $14k | 549 | 4.75 | 56.4 | 66.9 | 0.0% | 75.0% |
| S4 W24 | 12 | $279k | -$21k | 525 | 5.42 | 56.5 | 67.0 | 8.3% | 41.7% |
| S4 W25 final | 12 | $294k | $14k | 466 | 4.92 | 56.5 | 67.1 | 0.0% | 40.0% |
| S4 W26 final | 12 | $284k | -$9.5k | 273 | 1.92 | 56.5 | 67.1 | 0.0% | 50.0% |
| S4 W27 final | 12 | $316k | $32k | 200 | 2.33 | 57.3 | 66.8 | 16.7% | 50.0% |
| S5 trial 1 | 10 | $366k | -$15k | 464 | 4.50 | 58.1 | 67.8 | 0.0% | 30.0% |
| S5 trial 2 | 10 | $347k | -$19k | 486 | 4.20 | 58.1 | 67.9 | 10.0% | 80.0% |
| S5 W1 | 10 | $366k | $19k | 479 | 5.80 | 58.1 | 67.9 | 0.0% | 70.0% |
| S5 W2 | 10 | $343k | -$23k | 475 | 5.60 | 58.2 | 68.0 | 10.0% | 50.0% |
| S5 W3 | 10 | $362k | $19k | 493 | 4.60 | 58.2 | 68.0 | 0.0% | 60.0% |
| S5 W4 | 10 | $334k | -$29k | 470 | 5.00 | 58.3 | 68.3 | 10.0% | 60.0% |
| S5 W5 | 10 | $353k | $19k | 478 | 4.40 | 58.3 | 68.3 | 0.0% | 50.0% |
| S5 W6 | 10 | $329k | -$23k | 472 | 4.30 | 58.3 | 68.4 | 10.0% | 40.0% |
| S5 W7 | 10 | $349k | $20k | 469 | 5.20 | 58.3 | 68.4 | 10.0% | 50.0% |
| S5 W8 | 10 | $327k | -$22k | 485 | 5.10 | 58.4 | 68.5 | 20.0% | 90.0% |
| S5 W9 | 10 | $346k | $18k | 477 | 5.00 | 58.3 | 68.6 | 10.0% | 50.0% |
| S5 W10 | 10 | $323k | -$23k | 476 | 3.90 | 58.3 | 68.6 | 20.0% | 80.0% |
| S5 W11 | 10 | $342k | $19k | 480 | 4.30 | 58.3 | 68.6 | 10.0% | 70.0% |
| S5 W12 | 10 | $316k | -$26k | 474 | 5.30 | 58.3 | 68.8 | 20.0% | 50.0% |
| S5 W13 | 10 | $334k | $19k | 486 | 4.30 | 58.4 | 68.9 | 10.0% | 60.0% |
| S5 W14 | 10 | $311k | -$23k | 473 | 4.40 | 58.4 | 68.9 | 20.0% | 50.0% |
| S5 W15 | 10 | $329k | $18k | 483 | 5.70 | 58.4 | 69.0 | 20.0% | 60.0% |
| S5 W16 | 10 | $305k | -$23k | 486 | 4.90 | 58.4 | 69.0 | 20.0% | 90.0% |
| S5 W17 | 10 | $325k | $20k | 472 | 4.40 | 58.4 | 69.1 | 20.0% | 40.0% |
| S5 W18 | 10 | $302k | -$23k | 464 | 5.40 | 58.5 | 69.1 | 20.0% | 30.0% |
| S5 W19 | 10 | $320k | $18k | 472 | 4.70 | 58.5 | 69.2 | 20.0% | 60.0% |
| S5 W20 | 10 | $297k | -$23k | 478 | 4.20 | 58.5 | 69.2 | 20.0% | 60.0% |
| S5 W21 | 10 | $314k | $17k | 473 | 4.70 | 58.5 | 69.2 | 20.0% | 50.0% |
| S5 W22 | 10 | $290k | -$24k | 472 | 4.50 | 58.5 | 69.3 | 20.0% | 70.0% |
| S5 W23 | 10 | $305k | $15k | 466 | 4.30 | 58.5 | 69.1 | 0.0% | 50.0% |
| S5 W24 | 10 | $280k | -$25k | 485 | 5.00 | 58.5 | 69.1 | 30.0% | 70.0% |
| S5 W25 final | 10 | $285k | $4.9k | 428 | 4.10 | 57.3 | 67.1 | 10.0% | 33.3% |
| S5 W26 final | 10 | $273k | -$12k | 231 | 2.60 | 57.3 | 67.1 | 20.0% | 100.0% |
| S5 W27 final | 10 | $305k | $32k | 225 | 2.00 | 58.8 | 66.9 | 30.0% | 66.7% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1266 | 57.2% | 660 | 58.7% | -1.5% |  |
| balanced × slide | 660 | 58.7% | 1266 | 57.2% | 1.5% |  |

### newcomer/hard/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 195 of 400; median 33.0 weeks among those who did.
- Reaching potential stars: 128 of 400 (92 already there at week 0); median 65.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/334; S3 4/124; S5 5/28.
- Mean XP per completed season 15573; mean level-ups per completed season 151.7.
- Cash: opening 150000; mean weekly change -2192; mean weeks in debt 40.8.
- Bankruptcy warnings: 818; forced sales: 107; sacked with missed solvency objective: 16.
- Save round-trips: 55; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks hard. Completed seasons end at -20503 on average. Broke rate 100.0% (a bankruptcy warning, or a sacking for a missed solvency objective).
- WARNING: the board is sacking clubs for money. 16 of 20 careers missed the solvency objective and were sacked.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | -486737 |
| upkeep | 0 |
| overhead | -52200 |
| sponsor | 0 |
| grant | 44895 |
| gate | 400669 |
| prize | 22036 |
| boardGrant | 10691 |
| events | -2181 |
| transfers | -736 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $137k | -$13k | 518 | 0 | 45.0 | L 6-8 Dubbo Diggers |
| S1 trial 2 | balanced | 0 | $117k | -$20k | 539 | 3 | 45.0 | L 8-10 Wagga Swagmen |
| S1 W1 | balanced | 2 strength 1, kicking 1 | $123k | $5.6k | 560 | 4 | 44.9 | W 14-12 Launceston Larrikins |
| S1 W2 | balanced | 4 strength 1, kicking 1, footyIQ 2 | $105k | -$18k | 551 | 7 | 45.0 | W 14-10 Darwin Drovers |
| S1 W3 | balanced | 3 strength 1, stamina 1, footyIQ 1 | $121k | $16k | 548 | 3 | 45.0 | W 16-4 Southport Stingrays |
| S1 W4 | balanced | 4 kicking 1, footyIQ 3 | $103k | -$18k | 548 | 5 | 45.0 | W 8-4 Broken Hill Brollys |
| S1 W5 | balanced | 6 strength 3, handling 1, footyIQ 2 | $122k | $19k | 550 | 9 | 45.0 | W 8-0 Geelong Gulls |
| S1 W6 | balanced | 3 kicking 1, footyIQ 2 | $102k | -$20k | 544 | 6 | 45.0 | W 16-13 Wagga Swagmen |
| S1 W7 | balanced | 3 stamina 1, footyIQ 2 | $120k | $18k | 535 | 3 | 45.1 | W 10-7 Katherine Crocs |
| S1 W8 | balanced | 7 strength 2, stamina 1, kicking 1, footyIQ 3 | $101k | -$20k | 516 | 7 | 45.1 | L 4-6 Shellharbour Scorpions |
| S1 W9 | balanced | 2 footyIQ 2 | $110k | $9.4k | 517 | 2 | 45.1 | L 4-10 Dubbo Diggers |
| S1 W10 | balanced | 6 speed 1, strength 2, handling 1, kicking 1, footyIQ 1 | $90k | -$20k | 535 | 6 | 45.2 | W 10-4 Mackay Marlins |
| S1 W11 | balanced | 4 speed 1, strength 1, footyIQ 2 | $46k | -$44k | 586 | 4 | 46.4 | W 22-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 strength 3, stamina 2, handling 1, footyIQ 1 | $25k | -$21k | 533 | 7 | 46.4 | L 6-8 Cairns Cyclones |
| S1 W13 | balanced | 3 speed 1, strength 1, kicking 1 | $32k | $7.3k | 537 | 3 | 46.4 | L 0-10 Toowoomba Thunder |
| S1 W14 | balanced | 8 speed 3, stamina 1, footyIQ 4 | $11k | -$21k | 587 | 9 | 46.5 | W 14-4 Woolloomooloo Wolves |
| S1 W15 | balanced | 5 speed 1, strength 1, handling 1, footyIQ 2 | $17k | $6.1k | 530 | 6 | 46.5 | L 10-13 Redcliffe Reapers |
| S1 W16 | balanced | 5 speed 1, strength 2, stamina 1, kicking 1 | -$4.6k | -$21k | 519 | 5 | 46.5 | L 4-12 Launceston Larrikins |
| S1 W17 | balanced | 3 strength 1, footyIQ 2 | $328 | $4.9k | 537 | 3 | 46.6 | W 4-0 Darwin Drovers |
| S1 W18 | balanced | 9 speed 3, strength 1, stamina 2, footyIQ 3 | -$21k | -$21k | 557 | 9 | 46.6 | W 14-12 Southport Stingrays |
| S1 W19 | balanced | 2 strength 1, handling 1 | -$15k | $5.7k | 540 | 2 | 46.6 | W 10-0 Broken Hill Brollys |
| S1 W20 | balanced | 4 speed 2, strength 1, kicking 1 | -$37k | -$21k | 518 | 5 | 46.6 | W 5-0 Geelong Gulls |
| S1 W21 | balanced | 5 speed 2, footyIQ 3 | -$29k | $8.3k | 563 | 5 | 46.7 | W 16-8 Wagga Swagmen |
| S1 W22 | balanced | 9 speed 3, strength 2, stamina 2, handling 1, footyIQ 1 | -$50k | -$21k | 558 | 9 | 46.8 | W 14-4 Katherine Crocs |
| S1 W23 | balanced | 3 speed 1, handling 1, footyIQ 1 | -$39k | $11k | 540 | 3 | 46.8 | D 8-8 Shellharbour Scorpions |
| S1 W24 | balanced | 5 speed 2, stamina 1, kicking 1, footyIQ 1 | -$60k | -$21k | 522 | 5 | 46.8 | L 4-12 Dubbo Diggers |
| S1 W25 final | balanced | 6 speed 1, strength 3, stamina 1, footyIQ 1 | -$40k | $21k | 493 | 6 | 46.8 | L 0-13 Katherine Crocs |
| S1 W26 final | balanced | 0 | -$61k | -$21k | 153 | 0 | 46.8 | no match |
| S1 W27 final | balanced | 0 | -$40k | $21k | 161 | 0 | 46.9 | no match |
| S2 trial 1 | balanced | 7 speed 2, stamina 2, footyIQ 3 | -$60k | -$20k | 584 | 8 | 46.9 | W 12-11 Toowoomba Thunder |
| S2 trial 2 | balanced | 4 speed 1, strength 2, footyIQ 1 | -$72k | -$12k | 537 | 4 | 46.9 | L 6-8 Dubbo Diggers |
| S2 W1 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | -$62k | $10k | 497 | 4 | 47.0 | L 0-17 Launceston Larrikins |
| S2 W2 | balanced | 8 speed 2, strength 4, stamina 1, kicking 1 | -$81k | -$20k | 543 | 7 | 47.0 | W 24-4 Darwin Drovers |
| S2 W3 | balanced | 7 speed 2, footyIQ 5 | -$65k | $17k | 545 | 8 | 47.1 | W 1-0 Southport Stingrays |
| S2 W4 | balanced | 5 speed 1, strength 1, stamina 2, footyIQ 1 | -$85k | -$20k | 537 | 5 | 47.1 | L 11-13 Broken Hill Brollys |
| S2 W5 | balanced | 3 stamina 2, handling 1 | -$74k | $10k | 505 | 2 | 47.1 | L 8-10 Geelong Gulls |
| S2 W6 | balanced | 6 speed 3, strength 2, footyIQ 1 | -$94k | -$20k | 522 | 6 | 47.2 | W 14-4 Wagga Swagmen |
| S2 W7 | balanced | 5 speed 2, strength 1, footyIQ 2 | -$80k | $14k | 487 | 5 | 47.2 | W 10-6 Katherine Crocs |
| S2 W8 | balanced | 4 strength 1, stamina 1, handling 1, footyIQ 1 | -$98k | -$18k | 574 | 5 | 47.2 | W 16-7 Shellharbour Scorpions |
| S2 W9 | balanced | 6 speed 2, stamina 1, handling 1, kicking 1, footyIQ 1 | -$84k | $14k | 600 | 9 | 47.3 | W 20-12 Dubbo Diggers |
| S2 W10 | balanced | 7 speed 3, strength 2, stamina 1, footyIQ 1 | -$103k | -$20k | 559 | 7 | 45.4 | D 6-6 Mackay Marlins |
| S2 W11 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | -$78k | $25k | 529 | 5 | 45.5 | L 6-7 Ballarat Bushrangers |
| S2 W12 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | -$92k | -$14k | 547 | 6 | 45.5 | W 4-0 Cairns Cyclones |
| S2 W13 | balanced | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | -$68k | $24k | 517 | 5 | 45.6 | D 1-1 Toowoomba Thunder |
| S2 W14 | balanced | 5 speed 1, strength 1, stamina 1, footyIQ 2 | -$84k | -$17k | 543 | 5 | 45.6 | L 6-10 Woolloomooloo Wolves |
| S2 W15 | balanced | 5 speed 2, strength 2, footyIQ 1 | -$66k | $19k | 524 | 5 | 45.6 | L 4-12 Redcliffe Reapers |
| S2 W16 | balanced | 5 strength 1, stamina 1, handling 1, footyIQ 2 | -$82k | -$17k | 527 | 5 | 45.7 | D 0-0 Launceston Larrikins |
| S2 W17 | balanced | 6 strength 1, stamina 3, kicking 1, footyIQ 1 | -$59k | $24k | 553 | 5 | 45.7 | W 6-4 Darwin Drovers |
| S2 W18 | balanced | 4 speed 2, stamina 1, footyIQ 1 | -$75k | -$17k | 593 | 4 | 45.7 | W 11-6 Southport Stingrays |
| S2 W19 | balanced | 11 speed 8, strength 1, stamina 1, footyIQ 1 | -$55k | $20k | 572 | 11 | 45.9 | W 8-4 Broken Hill Brollys |
| S2 W20 | balanced | 2 handling 1, footyIQ 1 | -$72k | -$17k | 586 | 2 | 45.8 | W 10-4 Geelong Gulls |
| S2 W21 | balanced | 6 strength 2, stamina 1, kicking 1, footyIQ 2 | -$48k | $24k | 527 | 6 | 45.9 | L 0-6 Wagga Swagmen |
| S2 W22 | balanced | 6 speed 1, strength 2, handling 2, footyIQ 1 | -$64k | -$16k | 569 | 7 | 45.9 | W 6-0 Katherine Crocs |
| S2 W23 | balanced | 4 speed 2, strength 1, stamina 1 | -$41k | $23k | 541 | 3 | 46.0 | W 12-6 Shellharbour Scorpions |
| S2 W24 | balanced | 6 strength 1, stamina 4, handling 1 | -$58k | -$16k | 544 | 6 | 46.0 | W 10-0 Dubbo Diggers |
| S2 W25 final | balanced | 5 strength 2, stamina 1, handling 1, kicking 1 | -$32k | $26k | 537 | 5 | 46.1 | W 8-4 Broken Hill Brollys |
| S2 W26 final | balanced | 6 speed 5, footyIQ 1 | -$6.1k | $26k | 524 | 6 | 46.1 | L 4-5 Darwin Drovers |
| S2 W27 final | balanced | 0 | $26k | $32k | 135 | 0 | 46.1 | no match |
| S3 trial 1 | balanced | 6 speed 3, footyIQ 3 | $18k | -$7.8k | 505 | 6 | 46.1 | W 8-7 Darwin Drovers |
| S3 trial 2 | balanced | 5 strength 1, handling 1, footyIQ 3 | $861 | -$17k | 481 | 5 | 46.2 | D 1-1 Southport Stingrays |
| S3 W1 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $21k | $20k | 468 | 3 | 46.2 | L 6-22 Launceston Larrikins |
| S3 W2 | balanced | 7 speed 1, strength 2, stamina 2, footyIQ 2 | $4.0k | -$17k | 493 | 7 | 46.2 | W 6-4 Darwin Drovers |
| S3 W3 | balanced | 3 speed 3 | $29k | $25k | 494 | 3 | 46.2 | W 6-4 Southport Stingrays |
| S3 W4 | balanced | 7 speed 2, strength 2, stamina 1, handling 1, footyIQ 1 | $12k | -$17k | 500 | 7 | 46.3 | W 12-10 Broken Hill Brollys |
| S3 W5 | balanced | 2 speed 1, kicking 1 | $34k | $21k | 453 | 2 | 46.3 | D 0-0 Geelong Gulls |
| S3 W6 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | $17k | -$17k | 456 | 6 | 46.3 | L 0-4 Wagga Swagmen |
| S3 W7 | balanced | 4 speed 1, stamina 2, handling 1 | $37k | $20k | 458 | 4 | 46.3 | L 0-12 Katherine Crocs |
| S3 W8 | balanced | 4 speed 1, stamina 3 | $20k | -$17k | 481 | 4 | 46.4 | W 6-4 Shellharbour Scorpions |
| S3 W9 | balanced | 6 speed 2, strength 1, handling 1, footyIQ 2 | $36k | $16k | 504 | 6 | 46.4 | W 8-4 Dubbo Diggers |
| S3 W10 | balanced | 4 speed 2, strength 1, kicking 1 | $18k | -$18k | 474 | 4 | 46.4 | D 0-0 Mackay Marlins |
| S3 W11 | balanced | 4 speed 1, strength 2, footyIQ 1 | $41k | $24k | 463 | 4 | 46.4 | L 0-10 Ballarat Bushrangers |
| S3 W12 | balanced | 5 speed 1, strength 1, footyIQ 3 | $24k | -$18k | 485 | 5 | 46.5 | W 1-0 Cairns Cyclones |
| S3 W13 | balanced | 6 speed 1, stamina 2, handling 2, footyIQ 1 | $44k | $20k | 468 | 6 | 46.5 | L 0-6 Toowoomba Thunder |
| S3 W14 | balanced | 4 speed 1, strength 1, kicking 1, footyIQ 1 | $26k | -$18k | 476 | 4 | 46.5 | L 4-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 4 speed 2, strength 1, footyIQ 1 | $52k | $26k | 459 | 4 | 46.5 | D 7-7 Redcliffe Reapers |
| S3 W16 | balanced | 6 speed 3, stamina 2, footyIQ 1 | $34k | -$18k | 509 | 6 | 46.6 | W 16-6 Launceston Larrikins |
| S3 W17 | balanced | 3 speed 2, handling 1 | $49k | $15k | 470 | 3 | 46.6 | L 13-16 Darwin Drovers |
| S3 W18 | balanced | 6 speed 1, strength 2, kicking 1, footyIQ 2 | $31k | -$18k | 459 | 6 | 46.6 | L 4-18 Southport Stingrays |
| S3 W19 | balanced | 6 speed 1, stamina 1, handling 1, footyIQ 3 | $50k | $19k | 523 | 6 | 46.7 | D 14-14 Broken Hill Brollys |
| S3 W20 | balanced | 8 speed 3, strength 2, stamina 2, handling 1 | $33k | -$18k | 476 | 8 | 46.8 | D 0-0 Geelong Gulls |
| S3 W21 | balanced | 3 speed 1, stamina 1, handling 1 | $49k | $16k | 483 | 3 | 46.8 | W 4-0 Wagga Swagmen |
| S3 W22 | balanced | 6 speed 2, strength 2, stamina 2 | $31k | -$18k | 503 | 6 | 46.8 | W 11-5 Katherine Crocs |
| S3 W23 | balanced | 5 speed 2, strength 1, kicking 1, footyIQ 1 | $46k | $15k | 517 | 5 | 46.8 | W 10-0 Shellharbour Scorpions |
| S3 W24 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $28k | -$18k | 511 | 6 | 46.9 | W 12-7 Dubbo Diggers |
| S3 W25 final | balanced | 3 speed 2, footyIQ 1 | $9.9k | -$18k | 475 | 3 | 46.9 | L 4-12 Redcliffe Reapers |
| S3 W26 final | balanced | 2 stamina 1, footyIQ 1 | -$3.1k | -$13k | 113 | 2 | 46.9 | no match |
| S3 W27 final | balanced | 2 stamina 1, handling 1 | $21k | $24k | 115 | 2 | 47.0 | no match |
| S4 trial 1 | balanced | 5 speed 1, strength 1, kicking 1, footyIQ 2 | $11k | -$9.7k | 493 | 5 | 47.0 | W 8-4 Cairns Cyclones |
| S4 trial 2 | balanced | 3 strength 1, footyIQ 2 | -$7.9k | -$19k | 489 | 3 | 47.0 | L 6-8 Ballarat Bushrangers |
| S4 W1 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $10k | $18k | 474 | 5 | 47.0 | W 16-6 Launceston Larrikins |
| S4 W2 | balanced | 4 speed 1, stamina 1, handling 2 | -$8.7k | -$19k | 448 | 4 | 47.1 | L 0-1 Darwin Drovers |
| S4 W3 | balanced | 6 speed 2, strength 2, stamina 1, kicking 1 | $9.4k | $18k | 512 | 6 | 47.1 | W 14-7 Southport Stingrays |
| S4 W4 | balanced | 3 speed 1, stamina 1, footyIQ 1 | -$9.6k | -$19k | 498 | 3 | 47.1 | W 8-4 Broken Hill Brollys |
| S4 W5 | balanced | 6 speed 3, strength 1, footyIQ 2 | $13k | $23k | 582 | 7 | 47.2 | W 27-4 Geelong Gulls |
| S4 W6 | balanced | 5 speed 2, stamina 1, handling 1, footyIQ 1 | -$5.6k | -$19k | 461 | 5 | 47.2 | D 4-4 Wagga Swagmen |
| S4 W7 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $16k | $22k | 462 | 4 | 47.2 | L 0-1 Katherine Crocs |
| S4 W8 | balanced | 5 strength 2, kicking 1, footyIQ 2 | -$2.7k | -$19k | 504 | 5 | 47.3 | W 12-8 Shellharbour Scorpions |
| S4 W9 | balanced | 5 speed 2, strength 2, footyIQ 1 | $19k | $22k | 512 | 5 | 47.3 | W 14-0 Dubbo Diggers |
| S4 W10 | balanced | 4 speed 1, strength 1, stamina 2 | $655 | -$19k | 475 | 4 | 47.3 | L 4-5 Mackay Marlins |
| S4 W11 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $19k | $18k | 520 | 5 | 47.3 | W 16-6 Ballarat Bushrangers |
| S4 W12 | balanced | 8 speed 3, strength 1, stamina 1, kicking 1, footyIQ 2 | $309 | -$19k | 509 | 7 | 47.4 | W 10-0 Cairns Cyclones |
| S4 W13 | balanced | 4 speed 1, stamina 2, footyIQ 1 | $24k | $23k | 470 | 4 | 47.4 | L 4-7 Toowoomba Thunder |
| S4 W14 | balanced | 5 speed 3, footyIQ 2 | $4.8k | -$19k | 521 | 5 | 47.5 | W 11-0 Woolloomooloo Wolves |
| S4 W15 | balanced | 3 speed 2, handling 1 | $23k | $18k | 458 | 3 | 47.5 | L 0-13 Redcliffe Reapers |
| S4 W16 | balanced | 5 strength 3, kicking 1, footyIQ 1 | $4.3k | -$19k | 477 | 5 | 47.5 | D 6-6 Launceston Larrikins |
| S4 W17 | balanced | 4 strength 1, stamina 1, footyIQ 2 | $27k | $23k | 528 | 4 | 47.5 | W 23-7 Darwin Drovers |
| S4 W18 | balanced | 4 speed 2, stamina 1, footyIQ 1 | $8.3k | -$19k | 508 | 4 | 47.5 | W 10-4 Southport Stingrays |
| S4 W19 | balanced | 7 speed 1, strength 2, stamina 2, handling 2 | $30k | $22k | 487 | 7 | 47.6 | W 12-0 Broken Hill Brollys |
| S4 W20 | balanced | 6 speed 4, kicking 1, footyIQ 1 | $11k | -$19k | 509 | 6 | 47.6 | W 14-6 Geelong Gulls |
| S4 W21 | balanced | 6 speed 1, strength 2, stamina 1, footyIQ 2 | $34k | $23k | 502 | 6 | 47.7 | W 18-8 Wagga Swagmen |
| S4 W22 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $15k | -$19k | 532 | 5 | 47.7 | W 18-6 Katherine Crocs |
| S4 W23 | balanced | 4 speed 2, strength 1, handling 1 | $38k | $23k | 553 | 4 | 47.7 | W 24-8 Shellharbour Scorpions |
| S4 W24 | balanced | 5 strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $19k | -$19k | 494 | 5 | 47.8 | W 8-4 Dubbo Diggers |
| S4 W25 final | balanced | 5 stamina 1, footyIQ 4 | $41k | $23k | 520 | 5 | 47.8 | W 14-10 Ballarat Bushrangers |
| S4 W26 final | balanced | 5 speed 2, strength 1, stamina 1, handling 1 | $65k | $23k | 529 | 5 | 47.8 | W 14-7 Cairns Cyclones |
| S4 W27 final | balanced | 3 speed 1, kicking 1, footyIQ 1 | $285k | $220k | 494 | 3 | 49.5 | W 8-0 Woolloomooloo Wolves |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $133k | -$17k | 573 | 0.00 | 45.7 | 52.1 | 0.0% | 15.0% |
| S1 trial 2 | 20 | $116k | -$17k | 591 | 5.40 | 45.7 | 52.0 | 0.0% | 30.0% |
| S1 W1 | 20 | $121k | $4.9k | 581 | 3.90 | 45.7 | 52.1 | 0.0% | 50.0% |
| S1 W2 | 20 | $100k | -$21k | 593 | 7.55 | 45.7 | 52.2 | 0.0% | 35.0% |
| S1 W3 | 20 | $109k | $9.3k | 590 | 2.20 | 45.7 | 52.2 | 0.0% | 50.0% |
| S1 W4 | 20 | $89k | -$21k | 592 | 6.00 | 45.7 | 52.3 | 0.0% | 60.0% |
| S1 W5 | 20 | $95k | $6.0k | 590 | 7.65 | 45.8 | 52.5 | 0.0% | 65.0% |
| S1 W6 | 20 | $71k | -$23k | 594 | 6.85 | 45.9 | 52.7 | 0.0% | 50.0% |
| S1 W7 | 20 | $78k | $6.4k | 583 | 3.05 | 45.9 | 52.8 | 0.0% | 35.0% |
| S1 W8 | 20 | $58k | -$20k | 594 | 9.50 | 46.0 | 53.0 | 5.0% | 50.0% |
| S1 W9 | 20 | $65k | $7.2k | 587 | 2.90 | 46.0 | 53.0 | 5.0% | 40.0% |
| S1 W10 | 20 | $44k | -$21k | 594 | 6.55 | 46.1 | 53.1 | 15.0% | 55.0% |
| S1 W11 | 20 | $48k | $3.5k | 597 | 3.15 | 46.2 | 53.3 | 10.0% | 40.0% |
| S1 W12 | 20 | $28k | -$20k | 596 | 9.85 | 46.2 | 53.5 | 15.0% | 40.0% |
| S1 W13 | 20 | $37k | $9.4k | 591 | 3.75 | 46.2 | 53.6 | 15.0% | 30.0% |
| S1 W14 | 20 | $17k | -$20k | 589 | 7.65 | 46.3 | 53.7 | 25.0% | 35.0% |
| S1 W15 | 20 | $25k | $8.8k | 589 | 5.25 | 46.3 | 53.8 | 15.0% | 30.0% |
| S1 W16 | 20 | $3.4k | -$22k | 592 | 5.95 | 46.4 | 54.0 | 40.0% | 50.0% |
| S1 W17 | 20 | $9.6k | $6.3k | 595 | 3.30 | 46.4 | 54.0 | 30.0% | 40.0% |
| S1 W18 | 20 | -$11k | -$21k | 583 | 10.75 | 46.4 | 54.0 | 55.0% | 25.0% |
| S1 W19 | 20 | -$6.7k | $4.7k | 596 | 3.00 | 46.4 | 54.0 | 50.0% | 60.0% |
| S1 W20 | 20 | -$27k | -$20k | 579 | 5.50 | 46.3 | 53.8 | 75.0% | 30.0% |
| S1 W21 | 20 | -$20k | $7.6k | 590 | 5.30 | 46.3 | 53.9 | 70.0% | 35.0% |
| S1 W22 | 20 | -$40k | -$20k | 589 | 7.25 | 46.3 | 53.9 | 85.0% | 40.0% |
| S1 W23 | 20 | -$34k | $5.7k | 598 | 4.25 | 46.3 | 53.9 | 75.0% | 40.0% |
| S1 W24 | 20 | -$54k | -$20k | 588 | 6.10 | 46.2 | 53.7 | 95.0% | 50.0% |
| S1 W25 final | 20 | -$65k | -$11k | 372 | 4.10 | 46.0 | 53.3 | 85.0% | 10.0% |
| S1 W26 final | 20 | -$84k | -$19k | 186 | 2.20 | 45.6 | 52.2 | 95.0% | 100.0% |
| S1 W27 final | 20 | -$78k | $6.1k | 173 | 0.90 | 45.9 | 51.5 | 80.0% | 0.0% |
| S2 trial 1 | 20 | -$90k | -$12k | 561 | 6.40 | 45.1 | 50.2 | 85.0% | 45.0% |
| S2 trial 2 | 20 | -$103k | -$12k | 559 | 5.20 | 44.9 | 49.7 | 90.0% | 25.0% |
| S2 W1 | 20 | -$89k | $13k | 555 | 4.85 | 44.8 | 49.3 | 80.0% | 35.0% |
| S2 W2 | 20 | -$103k | -$14k | 566 | 6.40 | 44.6 | 49.0 | 95.0% | 50.0% |
| S2 W3 | 20 | -$86k | $18k | 564 | 5.90 | 44.7 | 48.9 | 80.0% | 40.0% |
| S2 W4 | 20 | -$100k | -$14k | 553 | 5.30 | 44.6 | 48.7 | 95.0% | 30.0% |
| S2 W5 | 20 | -$84k | $16k | 558 | 6.25 | 44.6 | 48.8 | 80.0% | 50.0% |
| S2 W6 | 20 | -$97k | -$14k | 555 | 4.90 | 44.5 | 48.6 | 95.0% | 55.0% |
| S2 W7 | 20 | -$79k | $18k | 547 | 5.40 | 44.5 | 48.7 | 85.0% | 25.0% |
| S2 W8 | 20 | -$94k | -$15k | 559 | 5.05 | 44.6 | 48.7 | 95.0% | 35.0% |
| S2 W9 | 20 | -$78k | $16k | 565 | 6.70 | 44.5 | 48.8 | 90.0% | 45.0% |
| S2 W10 | 20 | -$92k | -$13k | 561 | 5.65 | 44.3 | 48.4 | 90.0% | 40.0% |
| S2 W11 | 20 | -$73k | $18k | 562 | 5.65 | 44.3 | 48.4 | 90.0% | 35.0% |
| S2 W12 | 20 | -$86k | -$13k | 555 | 5.45 | 44.4 | 48.5 | 90.0% | 40.0% |
| S2 W13 | 20 | -$66k | $20k | 564 | 5.45 | 44.4 | 48.6 | 90.0% | 40.0% |
| S2 W14 | 20 | -$79k | -$13k | 555 | 5.35 | 44.5 | 48.7 | 90.0% | 25.0% |
| S2 W15 | 20 | -$60k | $19k | 559 | 6.15 | 44.6 | 48.8 | 85.0% | 25.0% |
| S2 W16 | 20 | -$73k | -$13k | 555 | 5.25 | 44.6 | 48.9 | 90.0% | 25.0% |
| S2 W17 | 20 | -$57k | $17k | 555 | 5.80 | 44.7 | 49.0 | 85.0% | 20.0% |
| S2 W18 | 20 | -$70k | -$13k | 572 | 4.80 | 44.7 | 49.1 | 85.0% | 45.0% |
| S2 W19 | 20 | -$54k | $15k | 568 | 6.90 | 44.8 | 49.3 | 85.0% | 45.0% |
| S2 W20 | 20 | -$67k | -$13k | 561 | 4.55 | 44.8 | 49.4 | 85.0% | 25.0% |
| S2 W21 | 20 | -$50k | $17k | 556 | 6.00 | 44.9 | 49.5 | 85.0% | 25.0% |
| S2 W22 | 20 | -$62k | -$13k | 563 | 5.80 | 44.9 | 49.6 | 85.0% | 45.0% |
| S2 W23 | 20 | -$45k | $17k | 564 | 5.40 | 45.0 | 49.7 | 85.0% | 60.0% |
| S2 W24 | 20 | -$58k | -$13k | 564 | 5.45 | 45.0 | 49.9 | 85.0% | 55.0% |
| S2 W25 final | 20 | -$63k | -$4.4k | 270 | 2.65 | 45.0 | 49.8 | 85.0% | 83.3% |
| S2 W26 final | 20 | -$67k | -$4.9k | 242 | 2.15 | 44.9 | 49.7 | 80.0% | 20.0% |
| S2 W27 final | 20 | -$58k | $9.6k | 154 | 2.00 | 45.4 | 49.6 | 75.0% | 100.0% |
| S3 trial 1 | 9 | -$1.6k | -$11k | 588 | 5.67 | 46.2 | 51.9 | 44.4% | 44.4% |
| S3 trial 2 | 9 | -$12k | -$10k | 598 | 6.22 | 46.1 | 51.7 | 44.4% | 44.4% |
| S3 W1 | 9 | $11k | $23k | 582 | 5.33 | 46.0 | 51.5 | 44.4% | 33.3% |
| S3 W2 | 9 | -$4.5k | -$15k | 580 | 6.11 | 46.0 | 51.3 | 44.4% | 33.3% |
| S3 W3 | 9 | $17k | $21k | 582 | 5.33 | 46.0 | 51.3 | 44.4% | 33.3% |
| S3 W4 | 9 | $2.8k | -$14k | 569 | 5.89 | 46.1 | 51.3 | 44.4% | 22.2% |
| S3 W5 | 9 | $23k | $20k | 565 | 5.22 | 46.1 | 51.4 | 44.4% | 11.1% |
| S3 W6 | 9 | $8.8k | -$14k | 583 | 6.44 | 46.2 | 51.5 | 44.4% | 66.7% |
| S3 W7 | 9 | $30k | $22k | 567 | 5.44 | 46.3 | 51.7 | 44.4% | 33.3% |
| S3 W8 | 9 | $16k | -$15k | 581 | 5.78 | 46.3 | 51.8 | 44.4% | 44.4% |
| S3 W9 | 9 | $35k | $20k | 592 | 5.67 | 46.4 | 51.8 | 44.4% | 55.6% |
| S3 W10 | 9 | $20k | -$15k | 582 | 5.89 | 46.5 | 52.0 | 44.4% | 44.4% |
| S3 W11 | 9 | $43k | $23k | 586 | 5.67 | 46.5 | 52.1 | 44.4% | 22.2% |
| S3 W12 | 9 | $28k | -$15k | 586 | 6.00 | 46.6 | 52.2 | 44.4% | 44.4% |
| S3 W13 | 9 | $49k | $21k | 575 | 5.22 | 46.7 | 52.3 | 44.4% | 33.3% |
| S3 W14 | 9 | $35k | -$14k | 574 | 6.78 | 46.7 | 52.5 | 44.4% | 22.2% |
| S3 W15 | 9 | $58k | $23k | 580 | 5.11 | 46.8 | 52.6 | 44.4% | 33.3% |
| S3 W16 | 9 | $43k | -$15k | 585 | 6.67 | 46.9 | 52.7 | 44.4% | 44.4% |
| S3 W17 | 9 | $63k | $20k | 570 | 5.00 | 46.9 | 52.8 | 44.4% | 11.1% |
| S3 W18 | 9 | $49k | -$15k | 585 | 6.33 | 47.0 | 52.9 | 44.4% | 44.4% |
| S3 W19 | 9 | $68k | $19k | 582 | 4.67 | 47.1 | 53.0 | 44.4% | 22.2% |
| S3 W20 | 9 | $53k | -$14k | 570 | 7.22 | 47.1 | 53.1 | 44.4% | 44.4% |
| S3 W21 | 9 | $73k | $20k | 600 | 5.78 | 47.2 | 53.2 | 44.4% | 55.6% |
| S3 W22 | 9 | $59k | -$15k | 581 | 6.78 | 47.2 | 53.4 | 44.4% | 11.1% |
| S3 W23 | 9 | $78k | $19k | 575 | 5.44 | 47.3 | 53.5 | 33.3% | 44.4% |
| S3 W24 | 9 | $63k | -$15k | 585 | 5.89 | 47.4 | 53.6 | 44.4% | 44.4% |
| S3 W25 final | 9 | $58k | -$5.0k | 318 | 2.67 | 47.4 | 53.6 | 44.4% | 25.0% |
| S3 W26 final | 9 | $44k | -$14k | 193 | 1.67 | 47.4 | 53.7 | 55.6% | 100.0% |
| S3 W27 final | 9 | $64k | $20k | 190 | 1.89 | 48.3 | 53.7 | 44.4% | 100.0% |
| S4 trial 1 | 4 | $101k | -$11k | 541 | 6.25 | 50.1 | 57.3 | 0.0% | 50.0% |
| S4 trial 2 | 4 | $84k | -$16k | 540 | 3.25 | 49.9 | 57.4 | 25.0% | 25.0% |
| S4 W1 | 4 | $105k | $20k | 531 | 6.25 | 50.0 | 57.5 | 0.0% | 25.0% |
| S4 W2 | 4 | $87k | -$18k | 540 | 5.25 | 50.1 | 57.6 | 25.0% | 25.0% |
| S4 W3 | 4 | $104k | $17k | 566 | 6.00 | 50.2 | 57.7 | 0.0% | 75.0% |
| S4 W4 | 4 | $85k | -$19k | 567 | 5.25 | 50.2 | 57.8 | 25.0% | 75.0% |
| S4 W5 | 4 | $106k | $21k | 579 | 5.75 | 50.3 | 57.9 | 0.0% | 100.0% |
| S4 W6 | 4 | $87k | -$19k | 552 | 6.25 | 50.4 | 58.0 | 25.0% | 25.0% |
| S4 W7 | 4 | $110k | $23k | 546 | 4.50 | 50.4 | 58.0 | 0.0% | 50.0% |
| S4 W8 | 4 | $92k | -$19k | 566 | 5.25 | 50.5 | 58.2 | 25.0% | 75.0% |
| S4 W9 | 4 | $116k | $24k | 563 | 5.75 | 50.5 | 58.3 | 0.0% | 75.0% |
| S4 W10 | 4 | $97k | -$19k | 547 | 5.25 | 50.6 | 58.3 | 0.0% | 50.0% |
| S4 W11 | 4 | $119k | $22k | 550 | 5.50 | 50.7 | 58.5 | 0.0% | 25.0% |
| S4 W12 | 4 | $101k | -$18k | 550 | 6.50 | 50.8 | 58.6 | 0.0% | 75.0% |
| S4 W13 | 4 | $125k | $24k | 542 | 4.25 | 50.8 | 58.6 | 0.0% | 25.0% |
| S4 W14 | 4 | $106k | -$18k | 557 | 6.25 | 50.9 | 58.8 | 0.0% | 50.0% |
| S4 W15 | 4 | $127k | $20k | 545 | 5.50 | 50.9 | 58.9 | 0.0% | 25.0% |
| S4 W16 | 4 | $105k | -$22k | 558 | 5.00 | 51.2 | 59.4 | 0.0% | 50.0% |
| S4 W17 | 4 | $125k | $20k | 557 | 5.75 | 51.3 | 59.6 | 0.0% | 75.0% |
| S4 W18 | 4 | $106k | -$19k | 550 | 5.50 | 51.3 | 59.6 | 0.0% | 75.0% |
| S4 W19 | 4 | $125k | $20k | 552 | 6.50 | 51.4 | 59.8 | 0.0% | 75.0% |
| S4 W20 | 4 | $106k | -$19k | 550 | 3.75 | 51.4 | 59.8 | 0.0% | 50.0% |
| S4 W21 | 4 | $128k | $21k | 569 | 7.50 | 51.5 | 59.9 | 0.0% | 75.0% |
| S4 W22 | 4 | $106k | -$21k | 564 | 4.25 | 51.6 | 60.1 | 0.0% | 50.0% |
| S4 W23 | 4 | $129k | $23k | 561 | 5.75 | 51.6 | 60.1 | 0.0% | 25.0% |
| S4 W24 | 4 | $111k | -$18k | 552 | 4.75 | 51.7 | 60.2 | 0.0% | 50.0% |
| S4 W25 final | 4 | $113k | $1.6k | 442 | 4.50 | 51.7 | 60.3 | 0.0% | 100.0% |
| S4 W26 final | 4 | $113k | -$63 | 424 | 4.25 | 51.8 | 60.4 | 0.0% | 66.7% |
| S4 W27 final | 4 | $229k | $116k | 306 | 1.50 | 54.1 | 60.0 | 0.0% | 100.0% |
| S5 trial 1 | 2 | $170k | -$24k | 536 | 7.00 | 58.1 | 63.4 | 0.0% | 100.0% |
| S5 trial 2 | 2 | $147k | -$23k | 492 | 6.50 | 58.2 | 63.5 | 0.0% | 100.0% |
| S5 W1 | 2 | $167k | $19k | 479 | 2.00 | 58.2 | 63.5 | 0.0% | 50.0% |
| S5 W2 | 2 | $144k | -$23k | 473 | 5.50 | 57.4 | 63.5 | 0.0% | 0.0% |
| S5 W3 | 2 | $163k | $19k | 482 | 5.00 | 57.4 | 63.6 | 0.0% | 50.0% |
| S5 W4 | 2 | $141k | -$23k | 473 | 5.00 | 57.5 | 63.7 | 0.0% | 50.0% |
| S5 W5 | 2 | $160k | $19k | 495 | 3.50 | 57.5 | 63.8 | 0.0% | 100.0% |
| S5 W6 | 2 | $137k | -$23k | 474 | 6.50 | 57.6 | 63.8 | 0.0% | 0.0% |
| S5 W7 | 2 | $156k | $19k | 456 | 3.00 | 57.5 | 63.8 | 0.0% | 0.0% |
| S5 W8 | 2 | $134k | -$23k | 492 | 6.50 | 57.6 | 63.9 | 0.0% | 50.0% |
| S5 W9 | 2 | $150k | $16k | 477 | 3.50 | 57.1 | 63.9 | 0.0% | 50.0% |
| S5 W10 | 2 | $127k | -$23k | 463 | 6.00 | 57.2 | 64.0 | 0.0% | 0.0% |
| S5 W11 | 2 | $144k | $17k | 489 | 4.00 | 57.2 | 64.0 | 0.0% | 50.0% |
| S5 W12 | 2 | $121k | -$23k | 473 | 4.50 | 57.2 | 64.1 | 0.0% | 50.0% |
| S5 W13 | 2 | $140k | $19k | 481 | 4.50 | 57.2 | 64.1 | 0.0% | 50.0% |
| S5 W14 | 2 | $118k | -$22k | 488 | 5.50 | 57.3 | 64.3 | 0.0% | 100.0% |
| S5 W15 | 2 | $137k | $19k | 480 | 4.00 | 57.3 | 64.2 | 0.0% | 50.0% |
| S5 W16 | 2 | $114k | -$22k | 494 | 5.00 | 57.3 | 64.3 | 0.0% | 50.0% |
| S5 W17 | 2 | $134k | $20k | 524 | 6.50 | 57.4 | 64.4 | 0.0% | 100.0% |
| S5 W18 | 2 | $111k | -$23k | 491 | 4.50 | 57.4 | 64.4 | 0.0% | 50.0% |
| S5 W19 | 2 | $130k | $19k | 498 | 4.50 | 57.4 | 64.5 | 0.0% | 100.0% |
| S5 W20 | 2 | $107k | -$23k | 465 | 4.50 | 57.5 | 64.5 | 0.0% | 50.0% |
| S5 W21 | 2 | $126k | $19k | 497 | 5.50 | 57.5 | 64.7 | 0.0% | 100.0% |
| S5 W22 | 2 | $103k | -$23k | 499 | 4.00 | 57.5 | 64.7 | 0.0% | 50.0% |
| S5 W23 | 2 | $111k | $8.3k | 460 | 5.50 | 57.6 | 65.0 | 0.0% | 50.0% |
| S5 W24 | 2 | $86k | -$25k | 503 | 5.00 | 57.6 | 65.1 | 0.0% | 100.0% |
| S5 W25 final | 2 | $87k | $714 | 268 | 2.00 | 57.6 | 65.1 | 50.0% | 0.0% |
| S5 W26 final | 2 | $60k | -$27k | 112 | 1.00 | 57.6 | 65.1 | 50.0% | n/a |
| S5 W27 final | 2 | $46k | -$14k | 111 | 0.50 | 58.1 | 65.1 | 50.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 930 | 45.3% | 429 | 52.7% | -7.4% |  |
| balanced × slide | 429 | 52.7% | 930 | 45.3% | 7.4% |  |

## Per career

### careless / easy / au / seed 7919

Regular: 72.5% wins / 120 games; finals: 100.0% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 70 / unreached / unreached; broke: true; weeks in debt: 90. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 118561 | -126326 | -556724 | 0 | -56670 | 0 | 34800 | 470050 | 123250 | 25500 | 13000 | -198371 | -16274 | -20000 | 0 |
| 2 | true | 167932 | -36660 | -485939 | 0 | -58290 | 0 | 64680 | 613217 | 123250 | 17000 | 0 | -208887 | -15660 | 0 | 0 |
| 3 | true | 159066 | -50753 | -596009 | 0 | -58290 | 0 | 88160 | 614880 | 123250 | 25500 | 4000 | -191967 | -18390 | 0 | 0 |
| 4 | true | 129730 | -128418 | -642675 | 0 | -58290 | 0 | 112560 | 574560 | 123250 | 17000 | 1600 | -145329 | -12012 | 0 | 0 |
| 5 | true | 117394 | -70265 | -692320 | 0 | -58290 | 0 | 113760 | 614880 | 123250 | 17000 | 4500 | -127782 | -7334 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 7919

Regular: 45.8% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -105150 | -156350 | -488183 | 0 | -67800 | 0 | 33520 | 320439 | 30000 | 20000 | 4600 | -125662 | -12064 | -20000 | 0 |
| 2 | true | -78973 | -137097 | -320441 | 0 | -69600 | 0 | 40520 | 372698 | 0 | 0 | 3000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 7919

Regular: 41.7% wins / 72 games; finals: 33.3% wins / 3 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 75. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -92208 | -153488 | -541854 | 0 | -52200 | 0 | 35720 | 361746 | 36000 | 24000 | 6600 | -101268 | -10952 | 0 | 0 |
| 2 | true | -28228 | -115367 | -322045 | 0 | -52200 | 0 | 43960 | 409637 | 18000 | 12000 | 7000 | -49824 | -2548 | 0 | 0 |
| 3 | true | -56988 | -65588 | -416285 | 0 | -52200 | 0 | 43960 | 387765 | 0 | 0 | 8000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 7919

Regular: 72.5% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 50 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 149372 | 100802 | -518166 | -2320 | -42360 | 0 | 35320 | 403441 | 12750 | 25500 | -56793 | 0 | 0 | -8000 | 0 |
| 2 | true | 136483 | 90174 | -513514 | -2320 | -53070 | 0 | 49720 | 486493 | 12750 | 17000 | -1400 | 0 | -8548 | 0 | 0 |
| 3 | true | 329580 | 93339 | -525256 | -2320 | -53070 | 0 | 58080 | 607321 | 123250 | 25500 | -14000 | 0 | -26408 | 0 | 0 |
| 4 | true | 406416 | 195530 | -690534 | -2320 | -53070 | 0 | 87760 | 614880 | 123250 | 17000 | -3000 | 0 | -17130 | 0 | 0 |
| 5 | true | 157753 | 90839 | -828734 | -2320 | -53070 | 0 | 112120 | 574560 | 25500 | 17000 | -40600 | -22781 | -30338 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 7919

Regular: 45.8% wins / 72 games; finals: 50.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 35. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -84592 | -85872 | -540451 | -2320 | -43500 | 0 | 35360 | 337512 | 0 | 0 | -63193 | 0 | 0 | -8000 | 0 |
| 2 | true | 70267 | -127760 | -348144 | -2320 | -43500 | 0 | 38360 | 415863 | 70000 | 20000 | 4600 | 0 | 0 | 0 | 0 |
| 3 | true | 51202 | 5271 | -418905 | -2320 | -51900 | 0 | 52680 | 445536 | 15000 | 20000 | -2400 | -66234 | -10522 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 7919

Regular: 54.2% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 23. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 5599 | -145761 | -579927 | -2320 | -52200 | 0 | 36720 | 403977 | 84000 | 24000 | -50651 | 0 | 0 | -8000 | 0 |
| 2 | true | 14288 | -35312 | -455675 | -2320 | -52200 | 0 | 49680 | 445368 | 18000 | 12000 | 4600 | 0 | -10764 | 0 | 0 |
| 3 | true | 329190 | -26063 | -483104 | -2320 | -53005 | 0 | 54240 | 596117 | 174000 | 36000 | 4600 | 0 | -11626 | 0 | 0 |
| 4 | true | 373607 | 233645 | -559155 | -2320 | -75545 | 0 | 79880 | 598500 | 36000 | 24000 | -2000 | -46411 | -8532 | 0 | 0 |
| 5 | true | 357243 | 168123 | -657795 | -2320 | -75545 | 0 | 87720 | 514500 | 174000 | 12000 | -3000 | -36906 | -29018 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 7919

Regular: 75.8% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 36 / unreached / unreached; broke: true; weeks in debt: 59. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 109452 | -120738 | -520473 | -18215 | -110490 | 0 | 34360 | 495431 | 123250 | 25500 | -3911 | 0 | 0 | -216000 | 0 |
| 2 | true | 51026 | 2462 | -470606 | -27280 | -110490 | 0 | 65720 | 532980 | 12750 | 17000 | 4200 | 0 | -3700 | -79000 | 0 |
| 3 | true | 70267 | 3344 | -499094 | -31430 | -110490 | 0 | 79080 | 574560 | 25500 | 25500 | 13200 | -17585 | 0 | -40000 | 0 |
| 4 | true | -19887 | -143565 | -601894 | -51330 | -110490 | 0 | 91400 | 574560 | 25500 | 8500 | 3600 | 0 | 0 | -30000 | 0 |
| 5 | true | 107079 | -68201 | -480274 | -51330 | -110490 | 0 | 101000 | 574560 | 59500 | 17000 | 17000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 7919

Regular: 37.5% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 47. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -137584 | -178784 | -499871 | -12920 | -127600 | 0 | 34360 | 336735 | 30000 | 10000 | -3288 | 0 | 0 | -105000 | 0 |
| 2 | true | -162848 | -173639 | -270935 | -14210 | -127600 | 0 | 37920 | 341261 | 0 | 0 | 8300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 7919

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 50. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -173445 | -175825 | -479479 | -7490 | -148915 | 0 | 38800 | 326739 | 0 | 0 | 9900 | 0 | 0 | -63000 | 0 |
| 2 | true | -222311 | -223711 | -300443 | -7830 | -148915 | 0 | 39360 | 345062 | 0 | 0 | 23900 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 7919

Regular: 68.3% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 55 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 371809 | 130745 | -518727 | 0 | -34800 | 0 | 35320 | 482266 | 123250 | 25500 | -41000 | 0 | 0 | 0 | 0 |
| 2 | true | 636718 | 329559 | -515997 | 0 | -34800 | 0 | 67480 | 614376 | 123250 | 17000 | -6400 | 0 | 0 | 0 | 0 |
| 3 | true | 760711 | 589963 | -560067 | 0 | -34800 | 0 | 91200 | 574560 | 25500 | 25500 | 2100 | 0 | 0 | 0 | 0 |
| 4 | true | 534512 | 501442 | -861029 | 0 | -34800 | 0 | 97640 | 534240 | 12750 | 17000 | 8000 | 0 | 0 | 0 | 0 |
| 5 | true | 467459 | 262263 | -884403 | 0 | -34800 | 0 | 98920 | 614880 | 123250 | 17000 | -1900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 7919

Regular: 67.5% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 78 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 65750 | 16030 | -541080 | 0 | -43500 | 0 | 35360 | 419370 | 15000 | 30000 | -49400 | 0 | 0 | 0 | 0 |
| 2 | true | 122284 | 732 | -539081 | 0 | -43500 | 0 | 50840 | 545675 | 30000 | 20000 | -7400 | 0 | 0 | 0 | 0 |
| 3 | true | 409674 | 77138 | -542742 | 0 | -43500 | 0 | 62480 | 632552 | 145000 | 30000 | 3600 | 0 | 0 | 0 | 0 |
| 4 | true | 498629 | 258553 | -774725 | 0 | -43500 | 0 | 90680 | 640500 | 145000 | 20000 | 11000 | 0 | 0 | 0 | 0 |
| 5 | true | 233146 | 194146 | -867892 | 0 | -43500 | 0 | 114040 | 556500 | 15000 | 20000 | -59631 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 7919

Regular: 60.4% wins / 96 games; finals: 57.1% wins / 7 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 45. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -40117 | -83397 | -582947 | 0 | -52200 | 0 | 35360 | 413070 | 18000 | 24000 | -45400 | 0 | 0 | 0 | 0 |
| 2 | true | 25658 | -121507 | -512814 | 0 | -52200 | 0 | 46240 | 521199 | 36000 | 12000 | 15350 | 0 | 0 | 0 | 0 |
| 3 | true | 20844 | -23036 | -512237 | 0 | -52200 | 0 | 53120 | 457653 | 18000 | 24000 | 6850 | 0 | 0 | 0 | 0 |
| 4 | true | 284951 | -30539 | -556916 | 0 | -52200 | 0 | 56120 | 618503 | 174000 | 24000 | 600 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 15838

Regular: 67.5% wins / 120 games; finals: 28.6% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 96. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -90100 | -121442 | -607035 | 0 | -55680 | 0 | 38040 | 430799 | 12750 | 17000 | -3400 | -183942 | -14632 | -24000 | 0 |
| 2 | true | -25916 | -129567 | -379225 | 0 | -55680 | 0 | 51600 | 449549 | 12750 | 8500 | -3000 | -16760 | -3550 | 0 | 0 |
| 3 | true | 16794 | -56407 | -439920 | 0 | -55680 | 0 | 59320 | 520925 | 25500 | 25500 | -5200 | -79129 | -8606 | 0 | 0 |
| 4 | true | 25794 | -40127 | -522423 | 0 | -55680 | 0 | 71040 | 574560 | 25500 | 17000 | 600 | -84197 | -17400 | 0 | 0 |
| 5 | true | -45237 | -53737 | -578955 | 0 | -55680 | 0 | 73640 | 534240 | 12750 | 8500 | 1100 | -55252 | -11374 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 15838

Regular: 48.6% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 82. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -84499 | -131450 | -492770 | 0 | -66700 | 0 | 31800 | 365799 | 15000 | 20000 | 0 | -120212 | -13416 | -24000 | 0 |
| 2 | true | -28434 | -114416 | -324370 | 0 | -66700 | 0 | 38760 | 371375 | 15000 | 10000 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | -82616 | -82616 | -385713 | 0 | -66700 | 0 | 41960 | 358271 | 0 | 0 | -2000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 15838

Regular: 37.5% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -151485 | -152605 | -466386 | 0 | -78880 | 0 | 32440 | 321489 | 0 | 0 | 5000 | -84344 | -6804 | -24000 | 0 |
| 2 | true | -224030 | -224030 | -321671 | 0 | -78880 | 0 | 33080 | 298326 | 0 | 0 | -3400 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 15838

Regular: 58.3% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 122 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 172542 | 131426 | -536453 | -2160 | -42360 | 0 | 36880 | 437974 | 12750 | 25500 | -48503 | 0 | -3086 | -8000 | 0 |
| 2 | true | 411693 | 132367 | -399255 | -2320 | -53070 | 0 | 52120 | 569994 | 59500 | 17000 | 4000 | 0 | -8818 | 0 | 0 |
| 3 | true | 728134 | 342050 | -410917 | -2320 | -53070 | 0 | 68840 | 613630 | 123250 | 25500 | -1400 | -37210 | -9862 | 0 | 0 |
| 4 | true | 756833 | 637704 | -505122 | -2320 | -53070 | 0 | 94440 | 534240 | 12750 | 17000 | 1750 | -52833 | -18136 | 0 | 0 |
| 5 | true | 521700 | 509920 | -643432 | -2320 | -53070 | 0 | 92480 | 493920 | 0 | 8500 | -61672 | -62793 | -6746 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 15838

Regular: 41.7% wins / 72 games; finals: 33.3% wins / 3 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 24. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -4170 | -55490 | -562131 | -2160 | -43500 | 0 | 36880 | 373989 | 30000 | 20000 | -49248 | 0 | 0 | -8000 | 0 |
| 2 | true | -23242 | -41497 | -428489 | -2320 | -43500 | 0 | 45000 | 399347 | 0 | 0 | 13200 | 0 | -2310 | 0 | 0 |
| 3 | true | -5642 | -59950 | -416067 | -2320 | -43500 | 0 | 41400 | 402087 | 15000 | 20000 | 1000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 15838

Regular: 34.7% wins / 72 games; finals: 66.7% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -50958 | -160238 | -575368 | -2160 | -52200 | 0 | 35800 | 345618 | 84000 | 24000 | -52648 | 0 | 0 | -8000 | 0 |
| 2 | true | -23434 | -79275 | -367163 | -2320 | -52200 | 0 | 48480 | 425355 | 0 | 0 | 12600 | -30112 | -7116 | 0 | 0 |
| 3 | true | -53851 | -62401 | -418601 | -2320 | -52200 | 0 | 44760 | 387944 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 15838

Regular: 74.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 33. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 6334 | -77882 | -510353 | -21735 | -110490 | 0 | 37880 | 470332 | 25500 | 17000 | 3200 | 0 | 0 | -205000 | 0 |
| 2 | true | -12608 | -36812 | -390664 | -25810 | -110490 | 0 | 48120 | 424652 | 12750 | 8500 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 213372 | -53912 | -389330 | -25900 | -110490 | 0 | 51840 | 600253 | 123250 | 25500 | 7300 | -8587 | -11856 | -36000 | 0 |
| 4 | true | 241243 | 1271 | -499541 | -50030 | -110490 | 0 | 85040 | 614880 | 123250 | 25500 | 18800 | -48510 | -7028 | -124000 | 0 |
| 5 | true | 228835 | 8561 | -565410 | -60630 | -110490 | 0 | 113040 | 614880 | 123250 | 17000 | 14900 | -26488 | -2460 | -130000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 15838

Regular: 61.7% wins / 120 games; finals: 80.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 72. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -12426 | -105932 | -527133 | -12920 | -127600 | 0 | 35960 | 468867 | 30000 | 20000 | 5400 | 0 | 0 | -105000 | 0 |
| 2 | true | -56001 | -57641 | -380284 | -14210 | -127600 | 0 | 47240 | 417879 | 0 | 0 | 13400 | 0 | 0 | 0 | 0 |
| 3 | true | 216479 | -109105 | -401270 | -14210 | -127600 | 0 | 47080 | 585480 | 145000 | 30000 | 8000 | 0 | 0 | 0 | 0 |
| 4 | true | 264448 | -1174 | -484043 | -27125 | -127600 | 0 | 82040 | 640500 | 145000 | 30000 | 6800 | -51603 | 0 | -166000 | 0 |
| 5 | true | 35829 | -43983 | -597058 | -50930 | -127600 | 0 | 112680 | 598500 | 30000 | 20000 | -44104 | -76107 | 0 | -94000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 15838

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -182562 | -183922 | -459517 | -7490 | -148915 | 0 | 36120 | 311640 | 0 | 0 | -1400 | 0 | 0 | -63000 | 0 |
| 2 | true | -239593 | -240833 | -253612 | -7830 | -148915 | 0 | 34720 | 310506 | 0 | 0 | 8100 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 15838

Regular: 62.5% wins / 120 games; finals: 50.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 247342 | 202736 | -509623 | 0 | -34800 | 0 | 36840 | 412675 | 12750 | 25500 | 4000 | 0 | 0 | 0 | 0 |
| 2 | true | 336687 | 209198 | -396314 | 0 | -34800 | 0 | 52200 | 427159 | 25500 | 17000 | -1400 | 0 | 0 | 0 | 0 |
| 3 | true | 465104 | 304600 | -421009 | 0 | -34800 | 0 | 59440 | 517941 | 12750 | 25500 | -31405 | 0 | 0 | 0 | 0 |
| 4 | true | 742241 | 431607 | -436243 | 0 | -34800 | 0 | 69200 | 614880 | 59500 | 17000 | -12400 | 0 | 0 | 0 | 0 |
| 5 | true | 953036 | 699480 | -462740 | 0 | -34800 | 0 | 78720 | 614880 | 59500 | 17000 | -51597 | -10168 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 15838

Regular: 59.2% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 182841 | 75045 | -532803 | 0 | -43500 | 0 | 36840 | 458304 | 30000 | 30000 | 4000 | 0 | 0 | 0 | 0 |
| 2 | true | 587485 | 145934 | -381176 | 0 | -43500 | 0 | 53360 | 612360 | 145000 | 20000 | -1400 | 0 | 0 | 0 | 0 |
| 3 | true | 796046 | 559482 | -401514 | 0 | -43500 | 0 | 81480 | 556500 | 15000 | 30000 | -29405 | 0 | 0 | 0 | 0 |
| 4 | true | 986209 | 761881 | -451957 | 0 | -43500 | 0 | 90120 | 556500 | 15000 | 20000 | 4000 | 0 | 0 | 0 | 0 |
| 5 | true | 1070411 | 949438 | -512658 | 0 | -43500 | 0 | 98360 | 514500 | 15000 | 10000 | 2500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 15838

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 39. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -126394 | -127754 | -577131 | 0 | -52200 | 0 | 36880 | 317457 | 0 | 0 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | -145684 | -160036 | -334102 | 0 | -52200 | 0 | 35400 | 314612 | 0 | 0 | 17000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 23757

Regular: 67.5% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 104 / unreached / unreached; broke: true; weeks in debt: 90. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -25316 | -120078 | -559062 | 0 | -57480 | 0 | 37960 | 460193 | 25500 | 17000 | -26761 | -186044 | -16622 | -20000 | 0 |
| 2 | true | 36888 | -57572 | -412767 | 0 | -58290 | 0 | 50640 | 537777 | 25500 | 17000 | 9400 | -98764 | -8292 | 0 | 0 |
| 3 | true | 168798 | -36281 | -495579 | 0 | -58290 | 0 | 61760 | 610596 | 123250 | 25500 | 1000 | -122499 | -13828 | 0 | 0 |
| 4 | true | 84668 | -53744 | -618835 | 0 | -58290 | 0 | 86720 | 574560 | 123250 | 17000 | -400 | -196369 | -11766 | 0 | 0 |
| 5 | true | 65658 | -64912 | -679781 | 0 | -58290 | 0 | 106920 | 614880 | 59500 | 17000 | 7000 | -74619 | -11620 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 23757

Regular: 31.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -165951 | -168131 | -498919 | 0 | -67800 | 0 | 35920 | 322329 | 0 | 0 | 1500 | -150037 | -8944 | 0 | 0 |
| 2 | true | -176045 | -196937 | -301605 | 0 | -69600 | 0 | 35480 | 321531 | 0 | 0 | 4100 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 23757

Regular: 27.1% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -156632 | -157832 | -485558 | 0 | -52200 | 0 | 33680 | 311724 | 0 | 0 | 600 | -106498 | -8380 | 0 | 0 |
| 2 | true | -207122 | -207122 | -327412 | 0 | -52200 | 0 | 35400 | 291722 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 23757

Regular: 65.8% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 87 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 219326 | 122393 | -534449 | -2320 | -42360 | 0 | 37320 | 433783 | 25500 | 25500 | -13780 | 0 | -1868 | -8000 | 0 |
| 2 | true | 251041 | 140191 | -489786 | -2320 | -53070 | 0 | 51640 | 538402 | 25500 | 17000 | -49173 | 0 | -6478 | 0 | 0 |
| 3 | true | 494067 | 209903 | -485874 | -2320 | -53070 | 0 | 60280 | 599176 | 123250 | 25500 | -4400 | 0 | -19516 | 0 | 0 |
| 4 | true | 495912 | 384216 | -587649 | -2320 | -53070 | 0 | 91280 | 574560 | 25500 | 17000 | 10000 | -60512 | -12944 | 0 | 0 |
| 5 | true | 500447 | 348125 | -672259 | -2320 | -53070 | 0 | 100320 | 614880 | 59500 | 17000 | 8000 | -40768 | -26748 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 23757

Regular: 43.1% wins / 72 games; finals: 75.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 31. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -40758 | -42238 | -547936 | -2320 | -43500 | 0 | 39800 | 347949 | 0 | 0 | -26751 | 0 | 0 | -8000 | 0 |
| 2 | true | 26333 | -140067 | -482661 | -2320 | -43500 | 0 | 42000 | 384972 | 145000 | 20000 | 3600 | 0 | 0 | 0 | 0 |
| 3 | true | 165751 | 5497 | -357118 | -2320 | -55400 | 0 | 65320 | 507150 | 15000 | 10000 | 3000 | -34638 | -11576 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 23757

Regular: 52.8% wins / 72 games; finals: 71.4% wins / 7 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 61. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -11100 | -112864 | -614314 | -2320 | -52200 | 0 | 37080 | 458031 | 36000 | 24000 | -39377 | 0 | 0 | -8000 | 0 |
| 2 | true | -22964 | -122108 | -591894 | -2320 | -52200 | 0 | 50760 | 541790 | 36000 | 12000 | -6000 | 0 | 0 | 0 | 0 |
| 3 | true | 140955 | -69208 | -540149 | -2320 | -52200 | 0 | 61040 | 499548 | 174000 | 12000 | 12000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 23757

Regular: 72.5% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 70 / unreached / unreached; broke: true; weeks in debt: 20. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 58757 | -34403 | -500830 | -16235 | -110490 | 0 | 38520 | 460192 | 25500 | 25500 | 16600 | 0 | 0 | -180000 | 0 |
| 2 | true | 51202 | 912 | -423197 | -24760 | -110490 | 0 | 55880 | 500362 | 12750 | 25500 | 11400 | 0 | 0 | -55000 | 0 |
| 3 | true | 225257 | -23361 | -473953 | -34510 | -110490 | 0 | 66720 | 613066 | 123250 | 25500 | -31128 | 0 | -4400 | 0 | 0 |
| 4 | true | 147901 | -4687 | -582286 | -50040 | -110490 | 0 | 91680 | 614880 | 59500 | 17000 | 12400 | 0 | 0 | -130000 | 0 |
| 5 | true | 57725 | -87194 | -636096 | -57130 | -110490 | 0 | 101160 | 614880 | 59500 | 17000 | 1000 | 0 | 0 | -80000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 23757

Regular: 52.5% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 58. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -148848 | -161028 | -488295 | -12920 | -127600 | 0 | 35520 | 325647 | 0 | 10000 | 13800 | 0 | 0 | -105000 | 0 |
| 2 | true | 102958 | -181233 | -272113 | -14210 | -127600 | 0 | 40280 | 446649 | 145000 | 20000 | 13800 | 0 | 0 | 0 | 0 |
| 3 | true | 68070 | 8337 | -372904 | -30925 | -127600 | 0 | 67080 | 556500 | 15000 | 30000 | 12600 | -52879 | -10760 | -121000 | 0 |
| 4 | true | -1459 | -30159 | -495902 | -34945 | -127600 | 0 | 77320 | 514500 | 15000 | 10000 | 8000 | -27056 | -8846 | 0 | 0 |
| 5 | true | 171800 | -45844 | -489136 | -34945 | -127600 | 0 | 81240 | 640500 | 70000 | 20000 | 13200 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 23757

Regular: 37.5% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 79. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -132160 | -193440 | -503204 | -7490 | -148915 | 0 | 35520 | 334929 | 36000 | 24000 | 10000 | 0 | 0 | -63000 | 0 |
| 2 | true | -171036 | -173536 | -296361 | -7830 | -148915 | 0 | 44720 | 359510 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |
| 3 | true | -171291 | -209003 | -306933 | -7830 | -148915 | 0 | 45960 | 399263 | 0 | 0 | 18200 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 23757

Regular: 56.7% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 109 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 122943 | 79163 | -534059 | 0 | -34800 | 0 | 36080 | 328002 | 25500 | 17000 | -14780 | 0 | 0 | 0 | 0 |
| 2 | true | 201741 | 2349 | -522379 | 0 | -34800 | 0 | 43480 | 510572 | 123250 | 17000 | -58325 | 0 | 0 | 0 | 0 |
| 3 | true | 301659 | 158970 | -517732 | 0 | -34800 | 0 | 67960 | 534240 | 12750 | 25500 | 12000 | 0 | 0 | 0 | 0 |
| 4 | true | 295753 | 250609 | -621016 | 0 | -34800 | 0 | 81920 | 534240 | 12750 | 17000 | 4000 | 0 | 0 | 0 | 0 |
| 5 | true | 377082 | 158506 | -669394 | 0 | -34800 | 0 | 90280 | 614880 | 123250 | 17000 | -59887 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 23757

Regular: 39.6% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 33. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -64247 | -65567 | -554471 | 0 | -43500 | 0 | 36160 | 333627 | 0 | 0 | -36063 | 0 | 0 | 0 | 0 |
| 2 | true | -83535 | -121252 | -412485 | 0 | -43500 | 0 | 35720 | 366377 | 15000 | 10000 | 9600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 23757

Regular: 40.3% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 74. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -109096 | -152376 | -599802 | 0 | -52200 | 0 | 36080 | 355803 | 18000 | 24000 | -40977 | 0 | 0 | 0 | 0 |
| 2 | true | -71274 | -140691 | -338436 | 0 | -52200 | 0 | 45400 | 376058 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |
| 3 | true | -44074 | -99748 | -360193 | 0 | -52200 | 0 | 46160 | 385833 | 0 | 0 | 7600 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 31676

Regular: 64.2% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 116 / unreached / unreached; broke: true; weeks in debt: 79. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 125536 | -143272 | -515692 | 0 | -58290 | 0 | 35440 | 452630 | 123250 | 25500 | 0 | -206082 | -11220 | -20000 | 0 |
| 2 | true | 118354 | -34449 | -433267 | 0 | -58290 | 0 | 65080 | 610263 | 59500 | 17000 | 5000 | -259194 | -13274 | 0 | 0 |
| 3 | true | 131978 | -39130 | -538418 | 0 | -58290 | 0 | 79760 | 574560 | 123250 | 25500 | -8000 | -169000 | -15738 | 0 | 0 |
| 4 | true | -9937 | -45034 | -589431 | 0 | -58290 | 0 | 107000 | 574560 | 25500 | 8500 | 1800 | -188460 | -23094 | 0 | 0 |
| 5 | true | -54177 | -63062 | -635559 | 0 | -58290 | 0 | 111320 | 534240 | 12750 | 8500 | 17000 | -32569 | -1632 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 31676

Regular: 50.0% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 68. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -84165 | -134809 | -486707 | 0 | -69600 | 0 | 31920 | 367920 | 15000 | 20000 | 750 | -137652 | -5796 | -20000 | 0 |
| 2 | true | -42191 | -115882 | -305364 | 0 | -69600 | 0 | 40160 | 381297 | 0 | 10000 | 1750 | -16269 | 0 | 0 | 0 |
| 3 | true | 4971 | -68507 | -348087 | 0 | -69600 | 0 | 44000 | 453884 | 15000 | 20000 | 1000 | -63021 | -6014 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 31676

Regular: 39.6% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -184442 | -185722 | -499065 | 0 | -83897 | 0 | 35840 | 317352 | 0 | 0 | 5600 | -73258 | -4014 | -33000 | 0 |
| 2 | true | -200845 | -219453 | -293405 | 0 | -83897 | 0 | 33520 | 329879 | 0 | 0 | -2500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 31676

Regular: 62.5% wins / 120 games; finals: 55.6% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 181540 | 40090 | -520536 | -2240 | -42360 | 0 | 34320 | 325302 | 123250 | 17000 | -40516 | 0 | -4680 | -8000 | 0 |
| 2 | true | 220724 | 136517 | -507394 | -2320 | -53070 | 0 | 59720 | 527376 | 12750 | 17000 | -5400 | 0 | -9478 | 0 | 0 |
| 3 | true | 308130 | 179626 | -517995 | -2320 | -53070 | 0 | 69840 | 574560 | 25500 | 25500 | -17367 | 0 | -17242 | 0 | 0 |
| 4 | true | 232897 | 200227 | -602534 | -2320 | -53070 | 0 | 83160 | 493275 | 12750 | 17000 | -14000 | 0 | -9494 | 0 | 0 |
| 5 | true | 224751 | 136313 | -627007 | -2320 | -53070 | 0 | 87080 | 574560 | 25500 | 17000 | 13600 | -20161 | -23328 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 31676

Regular: 37.5% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 35. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -89553 | -90753 | -544701 | -2240 | -51900 | 0 | 34320 | 323484 | 0 | 0 | -40516 | 0 | 0 | -8000 | 0 |
| 2 | true | -56915 | -134976 | -312527 | -2320 | -63800 | 0 | 40120 | 362565 | 0 | 0 | 8600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 31676

Regular: 35.4% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 38. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -121093 | -122373 | -578811 | -2240 | -52200 | 0 | 35400 | 340158 | 0 | 0 | -5400 | 0 | 0 | -8000 | 0 |
| 2 | true | -96975 | -166169 | -340704 | -2320 | -52200 | 0 | 38200 | 363542 | 0 | 0 | 17600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 31676

Regular: 71.7% wins / 120 games; finals: 69.2% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 87 / unreached / unreached; broke: true; weeks in debt: 69. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 3679 | -80415 | -514547 | -16055 | -110490 | 0 | 38360 | 440011 | 25500 | 17000 | 3900 | 0 | 0 | -180000 | 0 |
| 2 | true | 156926 | -51346 | -483459 | -18560 | -110490 | 0 | 55840 | 546366 | 123250 | 17000 | 23300 | 0 | 0 | 0 | 0 |
| 3 | true | 174435 | -52423 | -550695 | -28170 | -110490 | 0 | 85960 | 614880 | 123250 | 25500 | -48058 | -33668 | 0 | -61000 | 0 |
| 4 | true | 127219 | -89793 | -674036 | -42230 | -110490 | 0 | 111560 | 614880 | 123250 | 17000 | 6850 | 0 | 0 | -94000 | 0 |
| 5 | true | -2032 | -64190 | -632571 | -48430 | -110490 | 0 | 111080 | 574560 | 25500 | 8500 | 22600 | 0 | 0 | -80000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 31676

Regular: 55.0% wins / 120 games; finals: 55.6% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 48. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -119189 | -155629 | -530143 | -12740 | -127600 | 0 | 38320 | 379974 | 15000 | 20000 | 3000 | 0 | 0 | -105000 | 0 |
| 2 | true | 235016 | -158878 | -304423 | -14210 | -127600 | 0 | 46840 | 572198 | 145000 | 20000 | 16400 | 0 | 0 | 0 | 0 |
| 3 | true | 109441 | 10092 | -428000 | -30525 | -127600 | 0 | 82880 | 598500 | 30000 | 30000 | 15000 | -112462 | -17368 | -166000 | 0 |
| 4 | true | 61910 | -29213 | -553974 | -39730 | -127600 | 0 | 92160 | 598500 | 30000 | 20000 | -12887 | 0 | 0 | -54000 | 0 |
| 5 | true | 6969 | -21351 | -539201 | -39730 | -127600 | 0 | 95520 | 556500 | 15000 | 10000 | -3680 | -7098 | -14652 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 31676

Regular: 33.3% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 81. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -153091 | -196331 | -497990 | -7490 | -148915 | 0 | 35320 | 333984 | 18000 | 24000 | 3000 | 0 | 0 | -63000 | 0 |
| 2 | true | -148983 | -195420 | -311414 | -7830 | -148915 | 0 | 45600 | 410267 | 0 | 0 | 16400 | 0 | 0 | 0 | 0 |
| 3 | true | -161593 | -183346 | -306665 | -7830 | -148915 | 0 | 52520 | 392480 | 0 | 0 | 5800 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 31676

Regular: 52.1% wins / 96 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 92679 | 53189 | -522587 | 0 | -34800 | 0 | 35280 | 328506 | 12750 | 25500 | -51970 | 0 | 0 | 0 | 0 |
| 2 | true | 155050 | -6760 | -506692 | 0 | -34800 | 0 | 43880 | 502983 | 59500 | 17000 | -19500 | 0 | 0 | 0 | 0 |
| 3 | true | 192579 | 111907 | -493086 | 0 | -34800 | 0 | 60480 | 480685 | 12750 | 17000 | -5500 | 0 | 0 | 0 | 0 |
| 4 | true | 259372 | 136469 | -616482 | 0 | -34800 | 0 | 69080 | 573895 | 59500 | 17000 | -1400 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 31676

Regular: 49.2% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 278580 | 36378 | -537022 | 0 | -43500 | 0 | 37040 | 438312 | 145000 | 30000 | 8750 | 0 | 0 | 0 | 0 |
| 2 | true | 330818 | 235507 | -485373 | 0 | -43500 | 0 | 65560 | 501701 | 0 | 10000 | 3850 | 0 | 0 | 0 | 0 |
| 3 | true | 517121 | 288705 | -532735 | 0 | -43500 | 0 | 70080 | 639975 | 70000 | 20000 | -37517 | 0 | 0 | 0 | 0 |
| 4 | true | 482488 | 441726 | -665313 | 0 | -43500 | 0 | 80680 | 556500 | 15000 | 20000 | 2000 | 0 | 0 | 0 | 0 |
| 5 | true | 434578 | 396658 | -618990 | 0 | -43500 | 0 | 87080 | 514500 | 15000 | 20000 | -22000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 31676

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -112033 | -113353 | -575388 | 0 | -52200 | 0 | 35920 | 322035 | 0 | 0 | 7600 | 0 | 0 | 0 | 0 |
| 2 | true | -80602 | -150750 | -336516 | 0 | -52200 | 0 | 39800 | 369747 | 0 | 0 | 10600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 39595

Regular: 52.8% wins / 72 games; finals: 25.0% wins / 4 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 66. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -45285 | -150938 | -568965 | 0 | -58290 | 0 | 35480 | 427534 | 25500 | 17000 | -600 | -193154 | -9790 | -20000 | 0 |
| 2 | true | -24645 | -75284 | -337882 | 0 | -58290 | 0 | 45880 | 392204 | 12750 | 8500 | -14500 | -27358 | -664 | 0 | 0 |
| 3 | true | -12728 | -57129 | -406657 | 0 | -58290 | 0 | 53560 | 453026 | 12750 | 17000 | 7800 | -63888 | -3384 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 39595

Regular: 43.8% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -69354 | -142067 | -494096 | 0 | -69600 | 0 | 33440 | 344694 | 30000 | 20000 | 1000 | -107220 | -7572 | -20000 | 0 |
| 2 | true | -66150 | -100988 | -317198 | 0 | -69600 | 0 | 35640 | 328062 | 0 | 10000 | 16300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 39595

Regular: 54.2% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 78. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -63026 | -120647 | -559337 | 0 | -82215 | 0 | 38280 | 451731 | 18000 | 24000 | -3100 | -69107 | -11278 | -20000 | 0 |
| 2 | true | -45282 | -102847 | -418199 | 0 | -82215 | 0 | 50360 | 427298 | 18000 | 12000 | 10500 | 0 | 0 | 0 | 0 |
| 3 | true | -75571 | -79953 | -430093 | 0 | -82215 | 0 | 54720 | 471734 | 0 | 0 | 0 | -42127 | -2308 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 39595

Regular: 68.3% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 70 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 390510 | 157840 | -523705 | -2320 | -42360 | 0 | 36040 | 492931 | 123250 | 25500 | -6000 | 0 | -4826 | -8000 | 0 |
| 2 | true | 496535 | 355250 | -433545 | -2320 | -53070 | 0 | 68640 | 493416 | 25500 | 17000 | 1600 | 0 | -11196 | 0 | 0 |
| 3 | true | 529658 | 432864 | -539360 | -2320 | -53070 | 0 | 74920 | 574560 | 25500 | 25500 | -52945 | 0 | -19662 | 0 | 0 |
| 4 | true | 625649 | 407203 | -669783 | -2320 | -53070 | 0 | 85880 | 614880 | 123250 | 17000 | -6000 | 0 | -13846 | 0 | 0 |
| 5 | true | 532819 | 323921 | -776302 | -2320 | -53070 | 0 | 110400 | 614880 | 123250 | 17000 | -54083 | -40465 | -32120 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 39595

Regular: 64.2% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 101 / unreached / unreached; broke: true; weeks in debt: 1. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 144598 | -31642 | -548227 | -2320 | -51900 | 0 | 36040 | 357063 | 145000 | 30000 | -8000 | 0 | -5058 | -8000 | 0 |
| 2 | true | 284976 | 105243 | -457558 | -2320 | -63800 | 0 | 64560 | 550914 | 30000 | 20000 | 10600 | 0 | -12018 | 0 | 0 |
| 3 | true | 276263 | 225112 | -554603 | -2320 | -63800 | 0 | 73760 | 556500 | 15000 | 30000 | -42688 | 0 | -20562 | 0 | 0 |
| 4 | true | 335792 | 163722 | -667135 | -2320 | -63800 | 0 | 83560 | 640500 | 70000 | 20000 | -6000 | 0 | -15276 | 0 | 0 |
| 5 | true | 7243 | -21317 | -772524 | -2320 | -63800 | 0 | 96600 | 556500 | 15000 | 10000 | -56628 | -83105 | -28272 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 39595

Regular: 50.0% wins / 48 games; finals: 60.0% wins / 5 games; finals share: 100.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 23. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -17544 | -126784 | -587241 | -2320 | -52200 | 0 | 36040 | 345177 | 84000 | 24000 | -7000 | 0 | 0 | -8000 | 0 |
| 2 | true | 18928 | -57771 | -380506 | -2320 | -52200 | 0 | 46280 | 417470 | 36000 | 0 | -23900 | 0 | -4352 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 39595

Regular: 84.2% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 48 / unreached / unreached; broke: true; weeks in debt: 69. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 166504 | -64140 | -524117 | -21735 | -110490 | 0 | 41600 | 528696 | 123250 | 25500 | 8800 | 0 | 0 | -205000 | 0 |
| 2 | true | 127835 | -40665 | -476975 | -35740 | -110490 | 0 | 73640 | 614880 | 59500 | 17000 | -36613 | -23871 | 0 | -120000 | 0 |
| 3 | true | 221934 | 2549 | -551689 | -51330 | -110490 | 0 | 90560 | 614880 | 123250 | 25500 | 4650 | 0 | -11232 | -40000 | 0 |
| 4 | true | -123698 | -141757 | -729772 | -60630 | -110490 | 0 | 115320 | 534240 | 12750 | 8500 | 14450 | 0 | 0 | -130000 | 0 |
| 5 | true | -42125 | -171287 | -472962 | -60755 | -110490 | 0 | 113720 | 574560 | 25500 | 8500 | 3500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 39595

Regular: 57.3% wins / 96 games; finals: 33.3% wins / 6 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 69. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -21423 | -113693 | -548535 | -12740 | -127600 | 0 | 38800 | 474852 | 30000 | 20000 | 8800 | 0 | 0 | -105000 | 0 |
| 2 | true | -88771 | -130491 | -455674 | -14210 | -127600 | 0 | 48480 | 433356 | 30000 | 10000 | 8300 | 0 | 0 | 0 | 0 |
| 3 | true | 55142 | -124608 | -325362 | -14210 | -127600 | 0 | 55000 | 526460 | 15000 | 30000 | -15375 | 0 | 0 | 0 | 0 |
| 4 | true | -633 | -28233 | -496096 | -19210 | -127600 | 0 | 72880 | 514500 | 15000 | 10000 | 17400 | -12683 | -4966 | -25000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 39595

Regular: 47.9% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 48. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -44601 | -154827 | -545261 | -7490 | -148915 | 0 | 38480 | 467985 | 36000 | 24000 | 3600 | 0 | 0 | -63000 | 0 |
| 2 | true | -26862 | -84088 | -317178 | -7830 | -148915 | 0 | 47960 | 423602 | 0 | 0 | 20100 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 39595

Regular: 66.7% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 77 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 295519 | 198133 | -530375 | 0 | -34800 | 0 | 39040 | 462654 | 25500 | 25500 | 8000 | 0 | 0 | 0 | 0 |
| 2 | true | 441902 | 247815 | -501120 | 0 | -34800 | 0 | 57840 | 552363 | 59500 | 17000 | -4400 | 0 | 0 | 0 | 0 |
| 3 | true | 678507 | 401579 | -518739 | 0 | -34800 | 0 | 78920 | 614880 | 123250 | 25500 | -52406 | 0 | 0 | 0 | 0 |
| 4 | true | 625602 | 592212 | -698495 | 0 | -34800 | 0 | 106800 | 534240 | 12750 | 17000 | 9600 | 0 | 0 | 0 | 0 |
| 5 | true | 531683 | 498133 | -737349 | 0 | -34800 | 0 | 109240 | 534240 | 12750 | 17000 | 5000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 39595

Regular: 63.3% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 106 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 250438 | 19870 | -555493 | 0 | -43500 | 0 | 36040 | 440391 | 145000 | 20000 | 8000 | 0 | 0 | 0 | 0 |
| 2 | true | 534181 | 210761 | -470061 | 0 | -43500 | 0 | 62480 | 574224 | 145000 | 20000 | -4400 | 0 | 0 | 0 | 0 |
| 3 | true | 569720 | 475972 | -541611 | 0 | -43500 | 0 | 94280 | 556500 | 15000 | 30000 | -50531 | -24599 | 0 | 0 | 0 |
| 4 | true | 554349 | 466435 | -714411 | 0 | -43500 | 0 | 97040 | 598500 | 30000 | 20000 | -3000 | 0 | 0 | 0 | 0 |
| 5 | true | 307155 | 268555 | -823053 | 0 | -43500 | 0 | 103760 | 556500 | 15000 | 20000 | -66331 | -9570 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 39595

Regular: 58.3% wins / 120 games; finals: 33.3% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 12. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 12753 | -30807 | -599057 | 0 | -52200 | 0 | 39400 | 428610 | 18000 | 24000 | 4000 | 0 | 0 | 0 | 0 |
| 2 | true | 127358 | -36627 | -532672 | 0 | -52200 | 0 | 59240 | 581637 | 36000 | 24000 | -1400 | 0 | 0 | 0 | 0 |
| 3 | true | 127487 | 67793 | -626931 | 0 | -52200 | 0 | 68760 | 556500 | 18000 | 36000 | 0 | 0 | 0 | 0 | 0 |
| 4 | true | 133464 | 31212 | -673923 | 0 | -52200 | 0 | 76600 | 598500 | 36000 | 24000 | -3000 | 0 | 0 | 0 | 0 |
| 5 | true | -86963 | -86963 | -741762 | 0 | -52200 | 0 | 80880 | 514500 | 0 | 0 | -21845 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 47514

Regular: 56.3% wins / 48 games; finals: 50.0% wins / 4 games; finals share: 100.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 46. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -53767 | -151760 | -533575 | 0 | -56670 | 0 | 35120 | 365259 | 59500 | 8500 | -4000 | -193001 | -14900 | -20000 | 0 |
| 2 | true | -12215 | -79476 | -358750 | 0 | -58290 | 0 | 43000 | 441252 | 12750 | 8500 | -2500 | -43782 | -628 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 47514

Regular: 41.7% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -162038 | -163238 | -443763 | 0 | -66900 | 0 | 34680 | 289842 | 0 | 0 | -4000 | -142699 | -9198 | -20000 | 0 |
| 2 | true | -164026 | -193387 | -309649 | 0 | -69600 | 0 | 32400 | 316061 | 15000 | 10000 | 3800 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 47514

Regular: 18.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -219310 | -220550 | -494470 | 0 | -80145 | 0 | 35560 | 275583 | 0 | 0 | -4000 | -74958 | -6880 | -20000 | 0 |
| 2 | true | -285703 | -285703 | -312236 | 0 | -82215 | 0 | 31840 | 291218 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 47514

Regular: 65.8% wins / 120 games; finals: 55.6% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 59 / unreached / unreached; broke: true; weeks in debt: 5. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 183363 | 110346 | -519958 | -2320 | -42360 | 0 | 37240 | 440879 | 25500 | 25500 | -66472 | 0 | -6646 | -8000 | 0 |
| 2 | true | 220401 | 122993 | -532948 | -2320 | -53070 | 0 | 51200 | 537042 | 25500 | 17000 | -900 | 0 | -4466 | 0 | 0 |
| 3 | true | 202628 | 162138 | -564531 | -2320 | -53070 | 0 | 62560 | 525682 | 12750 | 25500 | 5000 | 0 | -29344 | 0 | 0 |
| 4 | true | 177457 | 8035 | -708778 | -2320 | -53070 | 0 | 73640 | 574560 | 123250 | 17000 | -44983 | 0 | -4470 | 0 | 0 |
| 5 | true | -77255 | -85755 | -827290 | -2320 | -53070 | 0 | 99280 | 534240 | 12750 | 8500 | 1600 | 0 | -28402 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 47514

Regular: 45.8% wins / 48 games; finals: 66.7% wins / 3 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 31. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -25661 | -37101 | -538437 | -2320 | -51900 | 0 | 37240 | 334488 | 0 | 10000 | -1400 | 0 | -5332 | -8000 | 0 |
| 2 | true | -8087 | -102441 | -508225 | -2320 | -63800 | 0 | 45720 | 464699 | 70000 | 10000 | 1500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 47514

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 39. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -127728 | -129048 | -590076 | -2320 | -52200 | 0 | 35920 | 339948 | 0 | 0 | -1000 | 0 | 0 | -8000 | 0 |
| 2 | true | -143717 | -168860 | -348144 | -2320 | -52200 | 0 | 41760 | 336315 | 0 | 0 | 8600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 47514

Regular: 79.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 52 / unreached / unreached; broke: true; weeks in debt: 43. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 59402 | -90628 | -517186 | -16235 | -110490 | 0 | 36320 | 388643 | 123250 | 25500 | 9600 | 0 | 0 | -180000 | 0 |
| 2 | true | 206097 | 365 | -472837 | -22650 | -110490 | 0 | 61520 | 612108 | 123250 | 17000 | 5100 | 0 | -5306 | -61000 | 0 |
| 3 | true | 81282 | -2822 | -517452 | -41530 | -110490 | 0 | 94720 | 574560 | 25500 | 25500 | 10000 | -61623 | 0 | -124000 | 0 |
| 4 | true | 85097 | -136305 | -727215 | -51330 | -110490 | 0 | 108120 | 614880 | 123250 | 17000 | 29600 | 0 | 0 | 0 | 0 |
| 5 | true | -58204 | -66704 | -647051 | -51330 | -110490 | 0 | 114480 | 534240 | 12750 | 8500 | -4400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 47514

Regular: 75.8% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 72 / unreached / unreached; broke: true; weeks in debt: 90. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -29564 | -121086 | -538501 | -12740 | -127600 | 0 | 37160 | 465717 | 30000 | 20000 | 1400 | 0 | 0 | -105000 | 0 |
| 2 | true | 55940 | -88603 | -461825 | -14210 | -127600 | 0 | 56120 | 578519 | 30000 | 20000 | 4500 | 0 | 0 | 0 | 0 |
| 3 | true | 236780 | -12338 | -511021 | -14460 | -127600 | 0 | 66240 | 640500 | 145000 | 30000 | -22819 | 0 | 0 | -25000 | 0 |
| 4 | true | 43338 | -122658 | -705097 | -30505 | -127600 | 0 | 94760 | 640500 | 70000 | 20000 | 9500 | 0 | 0 | -165000 | 0 |
| 5 | true | -102432 | -137295 | -687900 | -31030 | -127600 | 0 | 107960 | 556500 | 15000 | 10000 | 11300 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 47514

Regular: 43.8% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -142572 | -173932 | -513691 | -7490 | -148915 | 0 | 37000 | 362124 | 18000 | 12000 | 11400 | 0 | 0 | -63000 | 0 |
| 2 | true | -201735 | -203215 | -320930 | -7830 | -148915 | 0 | 42480 | 365232 | 0 | 0 | 10800 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 47514

Regular: 56.7% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 86 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 367520 | 172728 | -519741 | 0 | -34800 | 0 | 37680 | 435031 | 123250 | 25500 | 600 | 0 | 0 | 0 | 0 |
| 2 | true | 453081 | 322536 | -514112 | 0 | -34800 | 0 | 70760 | 526963 | 12750 | 17000 | 7000 | 0 | 0 | 0 | 0 |
| 3 | true | 681604 | 403114 | -507097 | 0 | -34800 | 0 | 78040 | 614880 | 59500 | 25500 | -7500 | 0 | 0 | 0 | 0 |
| 4 | true | 538649 | 492829 | -731015 | 0 | -34800 | 0 | 94320 | 534240 | 25500 | 17000 | -48200 | 0 | 0 | 0 | 0 |
| 5 | true | 495314 | 353998 | -799795 | 0 | -34800 | 0 | 99880 | 614880 | 59500 | 17000 | 0 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 47514

Regular: 43.1% wins / 72 games; finals: 100.0% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 3. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 131572 | -44828 | -546307 | 0 | -43500 | 0 | 37680 | 358155 | 145000 | 30000 | -49456 | 0 | 0 | 0 | 0 |
| 2 | true | 79847 | 67527 | -582668 | 0 | -43500 | 0 | 65320 | 499023 | 0 | 10000 | 100 | 0 | 0 | 0 | 0 |
| 3 | true | -53489 | -53489 | -605744 | 0 | -43500 | 0 | 67680 | 509061 | 0 | 0 | -60833 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 47514

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 42. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -141510 | -142790 | -585002 | 0 | -52200 | 0 | 36360 | 304332 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |
| 2 | true | -216771 | -217931 | -348418 | 0 | -52200 | 0 | 33400 | 292457 | 0 | 0 | -500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 55433

Regular: 50.0% wins / 96 games; finals: 60.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 89. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -135002 | -157452 | -509388 | 0 | -59595 | 0 | 34240 | 332117 | 12750 | 8500 | 0 | -207498 | -13128 | -33000 | 0 |
| 2 | true | -131641 | -182316 | -282343 | 0 | -59595 | 0 | 38120 | 304679 | 0 | 8500 | -6000 | 0 | 0 | 0 | 0 |
| 3 | true | 169584 | -151066 | -305306 | 0 | -59595 | 0 | 41920 | 474376 | 123250 | 25500 | 12600 | -11520 | 0 | 0 | 0 |
| 4 | true | -15007 | -35249 | -459440 | 0 | -59595 | 0 | 65520 | 531276 | 12750 | 8500 | 5000 | -273132 | -15470 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 55433

Regular: 37.5% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -138775 | -141035 | -495539 | 0 | -71050 | 0 | 36560 | 354711 | 0 | 0 | 8100 | -126373 | -12184 | -33000 | 0 |
| 2 | true | -112727 | -168616 | -307559 | 0 | -71050 | 0 | 40960 | 362397 | 0 | 0 | 1300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 55433

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -176722 | -177882 | -499097 | 0 | -83897 | 0 | 34120 | 333585 | 0 | 0 | 6000 | -106209 | -11224 | 0 | 0 |
| 2 | true | -263558 | -263558 | -328608 | 0 | -83897 | 0 | 32520 | 285149 | 0 | 0 | 8000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 55433

Regular: 43.8% wins / 96 games; finals: 50.0% wins / 4 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 80 / unreached / unreached; broke: true; weeks in debt: 31. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 134677 | 48397 | -526094 | -2240 | -42360 | 0 | 36280 | 336068 | 59500 | 25500 | -37325 | 0 | -6652 | -8000 | 0 |
| 2 | true | 36590 | 5040 | -521752 | -2320 | -53070 | 0 | 49720 | 408584 | 12750 | 17000 | -4675 | 0 | -4324 | 0 | 0 |
| 3 | true | -79868 | -79868 | -565051 | -2320 | -53070 | 0 | 55720 | 441263 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |
| 4 | true | -28630 | -124639 | -423671 | -2320 | -53070 | 0 | 57920 | 459345 | 0 | 0 | 15100 | 0 | -2066 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 55433

Regular: 45.8% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 62. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -24984 | -61264 | -550229 | -2240 | -43500 | 0 | 36280 | 345030 | 15000 | 20000 | -37325 | 0 | 0 | -8000 | 0 |
| 2 | true | -150930 | -152370 | -513399 | -2320 | -43500 | 0 | 41280 | 384993 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |
| 3 | true | -78257 | -180405 | -337975 | -2320 | -43500 | 0 | 41520 | 386348 | 15000 | 10000 | 3600 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 55433

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 41. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -118769 | -120009 | -571442 | -2240 | -52200 | 0 | 35800 | 320313 | 0 | 0 | 9000 | 0 | 0 | -8000 | 0 |
| 2 | true | -151269 | -158217 | -329535 | -2320 | -52200 | 0 | 31280 | 310275 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 55433

Regular: 64.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 123 / unreached / unreached; broke: true; weeks in debt: 66. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -26795 | -104325 | -512893 | -21735 | -110490 | 0 | 36400 | 441423 | 25500 | 17000 | 3000 | 0 | 0 | -205000 | 0 |
| 2 | true | 84463 | -121237 | -462906 | -25810 | -110490 | 0 | 50680 | 517234 | 123250 | 17000 | 2300 | 0 | 0 | 0 | 0 |
| 3 | true | 49723 | 3604 | -445111 | -34420 | -110490 | 0 | 75880 | 534240 | 12750 | 25500 | -1400 | -8619 | -17070 | -66000 | 0 |
| 4 | true | 160225 | -54473 | -588418 | -37120 | -110490 | 0 | 85000 | 614880 | 123250 | 17000 | 6400 | 0 | 0 | 0 | 0 |
| 5 | true | 133806 | -71412 | -642969 | -50930 | -110490 | 0 | 107640 | 614880 | 123250 | 17000 | 9200 | 0 | 0 | -94000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 55433

Regular: 41.7% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 49. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -176484 | -177764 | -494541 | -12920 | -127600 | 0 | 36400 | 324177 | 0 | 0 | 3000 | 0 | 0 | -105000 | 0 |
| 2 | true | -136318 | -218381 | -276892 | -14210 | -127600 | 0 | 38360 | 379208 | 30000 | 10000 | 1300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 55433

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -201603 | -202883 | -476051 | -7490 | -148915 | 0 | 36400 | 306453 | 0 | 0 | 1000 | 0 | 0 | -63000 | 0 |
| 2 | true | -302373 | -303573 | -277490 | -7830 | -148915 | 0 | 33400 | 299765 | 0 | 0 | 300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 55433

Regular: 44.8% wins / 96 games; finals: 25.0% wins / 4 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 68. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 115264 | 71484 | -527394 | 0 | -34800 | 0 | 36280 | 337177 | 25500 | 17000 | -38499 | 0 | 0 | 0 | 0 |
| 2 | true | -35826 | -58944 | -560786 | 0 | -34800 | 0 | 41440 | 416616 | 12750 | 8500 | -34810 | 0 | 0 | 0 | 0 |
| 3 | true | -110665 | -127665 | -506814 | 0 | -34800 | 0 | 44600 | 388825 | 12750 | 17000 | 3600 | 0 | 0 | 0 | 0 |
| 4 | true | -75714 | -148249 | -329529 | 0 | -34800 | 0 | 43920 | 356260 | 0 | 0 | -900 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 55433

Regular: 37.5% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 33. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -69869 | -71149 | -550518 | 0 | -43500 | 0 | 36280 | 324912 | 0 | 0 | -37043 | 0 | 0 | 0 | 0 |
| 2 | true | -106192 | -123371 | -367646 | 0 | -43500 | 0 | 35480 | 329343 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 55433

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 42. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -134974 | -136374 | -589955 | 0 | -52200 | 0 | 37560 | 355026 | 0 | 0 | -35405 | 0 | 0 | 0 | 0 |
| 2 | true | -129587 | -175012 | -308639 | 0 | -52200 | 0 | 40120 | 319106 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 63352

Regular: 52.1% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 86. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -86816 | -135677 | -553001 | 0 | -56670 | 0 | 36760 | 381853 | 12750 | 17000 | 10600 | -203082 | -13026 | -20000 | 0 |
| 2 | true | -42964 | -114248 | -310309 | 0 | -58290 | 0 | 43560 | 376720 | 0 | 0 | 1000 | -8829 | 0 | 0 | 0 |
| 3 | true | 44920 | -77247 | -388929 | 0 | -58290 | 0 | 41800 | 496752 | 25500 | 25500 | 7000 | -59857 | -1592 | 0 | 0 |
| 4 | true | -42929 | -51429 | -493633 | 0 | -58290 | 0 | 58160 | 459015 | 25500 | 8500 | 4400 | -79709 | -11792 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 63352

Regular: 43.1% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 82. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -121099 | -157419 | -538048 | 0 | -67800 | 0 | 37600 | 353031 | 15000 | 20000 | 7600 | -139540 | -8942 | 0 | 0 |
| 2 | true | -69215 | -149925 | -312451 | 0 | -69600 | 0 | 44280 | 389855 | 0 | 0 | -200 | 0 | 0 | 0 | 0 |
| 3 | true | -93056 | -101996 | -363013 | 0 | -69600 | 0 | 43440 | 357032 | 0 | 0 | 8300 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 63352

Regular: 33.3% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 80. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -100403 | -143763 | -529273 | 0 | -52200 | 0 | 36920 | 347991 | 18000 | 24000 | 10600 | -95359 | -11082 | 0 | 0 |
| 2 | true | -67083 | -130611 | -345677 | 0 | -52200 | 0 | 45080 | 390117 | 0 | 0 | -4000 | 0 | 0 | 0 | 0 |
| 3 | true | -56533 | -94157 | -371407 | 0 | -52200 | 0 | 47480 | 413553 | 0 | 0 | 3000 | -29876 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 63352

Regular: 70.0% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 79 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 288243 | 158195 | -523950 | -2320 | -42360 | 0 | 38080 | 444669 | 59500 | 25500 | 600 | 0 | -3476 | -8000 | 0 |
| 2 | true | 255506 | 217930 | -551614 | -2320 | -53070 | 0 | 57160 | 527427 | 12750 | 17000 | -23810 | 0 | -16260 | 0 | 0 |
| 3 | true | 304130 | 199708 | -587108 | -2320 | -53070 | 0 | 68600 | 570004 | 25500 | 25500 | 11750 | 0 | -10232 | 0 | 0 |
| 4 | true | 338522 | 186854 | -661886 | -2320 | -53070 | 0 | 80960 | 614880 | 59500 | 17000 | 6250 | 0 | -26922 | 0 | 0 |
| 5 | true | 194107 | 124953 | -768881 | -2320 | -53070 | 0 | 95640 | 574560 | 25500 | 17000 | -14400 | 0 | -18444 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 63352

Regular: 36.1% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 101133 | 52403 | -546081 | -2320 | -51900 | 0 | 37440 | 429828 | 15000 | 30000 | 600 | 0 | -3434 | -8000 | 0 |
| 2 | true | -77715 | -79395 | -541556 | -2320 | -63800 | 0 | 49200 | 421428 | 0 | 0 | -41800 | 0 | 0 | 0 | 0 |
| 3 | true | -96660 | -136903 | -363534 | -2320 | -63800 | 0 | 44520 | 365589 | 0 | 0 | 600 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 63352

Regular: 44.8% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -55990 | -99350 | -587266 | -2320 | -52200 | 0 | 36800 | 354396 | 18000 | 24000 | 10600 | 0 | 0 | -8000 | 0 |
| 2 | true | 14808 | -124407 | -423818 | -2320 | -52200 | 0 | 45040 | 411096 | 84000 | 0 | 9000 | 0 | 0 | 0 | 0 |
| 3 | true | 81354 | -12676 | -399532 | -2320 | -57030 | 0 | 51200 | 452939 | 18000 | 36000 | 3600 | -27993 | -8318 | 0 | 0 |
| 4 | true | 60447 | 12277 | -463020 | -2320 | -75545 | 0 | 60080 | 486738 | 0 | 12000 | -1000 | -26266 | -11574 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 63352

Regular: 77.5% wins / 120 games; finals: 92.9% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 50 / unreached / unreached; broke: true; weeks in debt: 70. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 135829 | -92547 | -523680 | -21735 | -110490 | 0 | 37320 | 494264 | 123250 | 25500 | 16400 | 0 | 0 | -205000 | 0 |
| 2 | true | 199612 | -22798 | -550016 | -28420 | -110490 | 0 | 73080 | 614880 | 123250 | 17000 | 198 | -39699 | 0 | -36000 | 0 |
| 3 | true | -622 | -72340 | -642294 | -49430 | -110490 | 0 | 99720 | 574560 | 25500 | 17000 | 9200 | 0 | 0 | -124000 | 0 |
| 4 | true | 98138 | -129024 | -619280 | -51330 | -110490 | 0 | 106880 | 614880 | 123250 | 17000 | 17850 | 0 | 0 | 0 | 0 |
| 5 | true | 116762 | -86568 | -634531 | -54955 | -110490 | 0 | 113120 | 614880 | 123250 | 17000 | 350 | 0 | 0 | -50000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 63352

Regular: 60.8% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 80 / unreached / unreached; broke: true; weeks in debt: 86. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 82768 | -100010 | -545932 | -8420 | -131950 | 0 | 37320 | 511350 | 70000 | 30000 | 16400 | 0 | 0 | -96000 | 0 |
| 2 | true | 218195 | -32525 | -539595 | -11165 | -131950 | 0 | 61000 | 633098 | 145000 | 20000 | -10961 | 0 | 0 | -30000 | 0 |
| 3 | true | -27606 | -55732 | -624491 | -34260 | -131950 | 0 | 91600 | 556500 | 15000 | 20000 | 15800 | 0 | 0 | -154000 | 0 |
| 4 | true | -57206 | -131745 | -553670 | -37120 | -131950 | 0 | 101040 | 556500 | 15000 | 10000 | 10600 | 0 | 0 | 0 | 0 |
| 5 | true | -71790 | -106766 | -487014 | -37120 | -131950 | 0 | 109200 | 514500 | 0 | 0 | 17800 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 63352

Regular: 54.2% wins / 96 games; finals: 66.7% wins / 9 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -39507 | -161509 | -520295 | -7490 | -148915 | 0 | 36920 | 390873 | 84000 | 24000 | 14400 | 0 | 0 | -63000 | 0 |
| 2 | true | 26477 | -75363 | -320833 | -9310 | -148915 | 0 | 56880 | 488156 | 18000 | 12000 | 14000 | 0 | -1994 | -42000 | 0 |
| 3 | true | 10746 | -47346 | -366254 | -18210 | -148915 | 0 | 60240 | 477645 | 36000 | 24000 | -55237 | 0 | 0 | -25000 | 0 |
| 4 | true | 270177 | -36998 | -452518 | -21535 | -148915 | 0 | 66320 | 639975 | 174000 | 24000 | 13400 | 0 | -5296 | -30000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 63352

Regular: 66.7% wins / 120 games; finals: 28.6% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 96 / unreached / unreached; broke: true; weeks in debt: 7. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 273474 | 176088 | -524073 | 0 | -34800 | 0 | 38320 | 444427 | 25500 | 25500 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | 286934 | 218839 | -533890 | 0 | -34800 | 0 | 53400 | 489000 | 12750 | 17000 | 10000 | 0 | 0 | 0 | 0 |
| 3 | true | 281895 | 193689 | -652833 | 0 | -34800 | 0 | 64240 | 563754 | 25500 | 25500 | 3600 | 0 | 0 | 0 | 0 |
| 4 | true | 138652 | 106182 | -747633 | 0 | -34800 | 0 | 77200 | 534240 | 12750 | 17000 | -2000 | 0 | 0 | 0 | 0 |
| 5 | true | -66417 | -74917 | -817519 | 0 | -34800 | 0 | 83160 | 534240 | 12750 | 8500 | 8600 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 63352

Regular: 53.3% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 124 / unreached / unreached; broke: true; weeks in debt: 3. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 282342 | 59604 | -546369 | 0 | -43500 | 0 | 38480 | 460131 | 145000 | 30000 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | 504025 | 236035 | -553581 | 0 | -43500 | 0 | 73440 | 639324 | 70000 | 20000 | 16000 | 0 | 0 | 0 | 0 |
| 3 | true | 311761 | 299041 | -700913 | 0 | -43500 | 0 | 78880 | 514500 | 0 | 10000 | -51231 | 0 | 0 | 0 | 0 |
| 4 | true | 155765 | 118005 | -781836 | 0 | -43500 | 0 | 78240 | 556500 | 15000 | 20000 | -400 | 0 | 0 | 0 | 0 |
| 5 | true | -19841 | -48041 | -807126 | 0 | -43500 | 0 | 90520 | 556500 | 15000 | 10000 | 3000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 63352

Regular: 33.3% wins / 72 games; finals: 66.7% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 52. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 39951 | -69609 | -587266 | 0 | -52200 | 0 | 38440 | 378777 | 84000 | 24000 | 4200 | 0 | 0 | 0 | 0 |
| 2 | true | -110675 | -112755 | -589959 | 0 | -52200 | 0 | 56000 | 464678 | 0 | 0 | -29145 | 0 | 0 | 0 | 0 |
| 3 | true | -70324 | -150441 | -365256 | 0 | -52200 | 0 | 53760 | 397047 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 71271

Regular: 52.8% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 67. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -90724 | -129442 | -556032 | 0 | -57480 | 0 | 36280 | 385380 | 12750 | 17000 | 7000 | -199192 | -16430 | -20000 | 0 |
| 2 | true | -3877 | -123441 | -319177 | 0 | -58290 | 0 | 42440 | 424035 | 12750 | 8500 | -4500 | -18911 | 0 | 0 | 0 |
| 3 | true | -66689 | -75189 | -446813 | 0 | -58290 | 0 | 52040 | 433803 | 0 | 8500 | 3000 | -50510 | -4542 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 71271

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -122496 | -133896 | -515368 | 0 | -43500 | 0 | 38840 | 352401 | 0 | 10000 | 8600 | -161391 | -12078 | 0 | 0 |
| 2 | true | -68718 | -150384 | -313763 | 0 | -43500 | 0 | 42040 | 369401 | 0 | 0 | -400 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 71271

Regular: 35.4% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -190643 | -192903 | -479172 | 0 | -81180 | 0 | 37000 | 292131 | 0 | 0 | 2500 | -105110 | -6812 | 0 | 0 |
| 2 | true | -214191 | -224065 | -331375 | 0 | -82215 | 0 | 36920 | 348222 | 0 | 0 | 4900 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 71271

Regular: 60.0% wins / 120 games; finals: 85.7% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 79 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 136182 | 84022 | -502929 | -2320 | -42360 | 0 | 34440 | 323911 | 25500 | 25500 | -10400 | 0 | -7160 | -8000 | 0 |
| 2 | true | 255537 | 32245 | -521433 | -2320 | -53070 | 0 | 44000 | 554260 | 123250 | 17000 | -31170 | 0 | -11162 | 0 | 0 |
| 3 | true | 378429 | 186639 | -577050 | -2320 | -53070 | 0 | 76720 | 574560 | 123250 | 25500 | -33688 | 0 | -11010 | 0 | 0 |
| 4 | true | 424422 | 212110 | -691301 | -2320 | -53070 | 0 | 98680 | 614880 | 123250 | 17000 | -40666 | 0 | -20460 | 0 | 0 |
| 5 | true | 201345 | 129345 | -830631 | -2320 | -53070 | 0 | 115040 | 493920 | 59500 | 8500 | 4000 | 0 | -18016 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 71271

Regular: 51.7% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 20. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 75224 | -25936 | -520845 | -2320 | -51900 | 0 | 34440 | 334005 | 70000 | 30000 | -3400 | 0 | -6756 | -8000 | 0 |
| 2 | true | 72516 | -18492 | -527324 | -2320 | -63800 | 0 | 48600 | 550263 | 30000 | 20000 | -45623 | 0 | -12504 | 0 | 0 |
| 3 | true | 5346 | -31774 | -588381 | -2320 | -63800 | 0 | 60560 | 500661 | 15000 | 20000 | 1000 | 0 | -9890 | 0 | 0 |
| 4 | true | 125984 | -48226 | -604440 | -2320 | -63800 | 0 | 67760 | 555188 | 145000 | 20000 | 3250 | 0 | 0 | 0 | 0 |
| 5 | true | -7018 | -40338 | -703396 | -2320 | -63800 | 0 | 93880 | 514500 | 30000 | 0 | 8350 | 0 | -10216 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 71271

Regular: 46.9% wins / 96 games; finals: 33.3% wins / 3 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 62. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -115872 | -128992 | -557744 | -2320 | -52200 | 0 | 34320 | 311472 | 0 | 12000 | -3400 | 0 | 0 | -8000 | 0 |
| 2 | true | -49892 | -159303 | -330741 | -2320 | -52200 | 0 | 34080 | 372561 | 36000 | 12000 | -3400 | 0 | 0 | 0 | 0 |
| 3 | true | 65698 | -82890 | -340684 | -2320 | -52200 | 0 | 36200 | 416094 | 18000 | 36000 | 4500 | 0 | 0 | 0 | 0 |
| 4 | true | -22434 | -22434 | -459965 | -2320 | -52200 | 0 | 48640 | 407022 | 0 | 0 | 2000 | -28857 | -2452 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 71271

Regular: 71.7% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 54 / unreached / unreached; broke: true; weeks in debt: 61. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 127766 | -102166 | -503121 | -21735 | -110490 | 0 | 38160 | 481602 | 123250 | 25500 | -400 | 0 | 0 | -205000 | 0 |
| 2 | true | -36413 | -61123 | -550122 | -28420 | -110490 | 0 | 69600 | 534240 | 12750 | 8500 | -33436 | -30801 | 0 | -36000 | 0 |
| 3 | true | 68735 | -126467 | -525632 | -28420 | -110490 | 0 | 78400 | 534240 | 123250 | 25500 | 8300 | 0 | 0 | 0 | 0 |
| 4 | true | 71668 | 1075 | -493321 | -34220 | -110490 | 0 | 98960 | 574560 | 25500 | 25500 | 1500 | -5494 | -9562 | -70000 | 0 |
| 5 | true | 35956 | 1157 | -545753 | -48720 | -110490 | 0 | 108920 | 534240 | 12750 | 17000 | 15800 | -19459 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 71271

Regular: 54.2% wins / 96 games; finals: 66.7% wins / 6 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 76. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 5582 | -90554 | -522029 | -12740 | -127600 | 0 | 38240 | 472311 | 30000 | 20000 | 12400 | 0 | 0 | -105000 | 0 |
| 2 | true | 64538 | -102302 | -519414 | -14210 | -127600 | 0 | 50600 | 503780 | 145000 | 20000 | 800 | 0 | 0 | 0 | 0 |
| 3 | true | 9133 | -28827 | -588495 | -14210 | -127600 | 0 | 79800 | 556500 | 15000 | 20000 | 3600 | 0 | 0 | 0 | 0 |
| 4 | true | -151048 | -151048 | -631391 | -14210 | -127600 | 0 | 90120 | 514500 | 0 | 0 | 8400 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 71271

Regular: 34.7% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 80. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -112018 | -173378 | -491296 | -7490 | -148915 | 0 | 36080 | 343203 | 36000 | 24000 | 9400 | 0 | 0 | -63000 | 0 |
| 2 | true | -126070 | -146079 | -302621 | -7830 | -148915 | 0 | 46800 | 391514 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |
| 3 | true | -132440 | -166196 | -309500 | -7830 | -148915 | 0 | 46040 | 408335 | 0 | 12000 | -6500 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 71271

Regular: 56.7% wins / 120 games; finals: 71.4% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 126 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 371333 | 198853 | -503121 | 0 | -34800 | 0 | 37800 | 492854 | 59500 | 25500 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | 312421 | 267961 | -528778 | 0 | -34800 | 0 | 54880 | 443209 | 25500 | 17000 | -35923 | 0 | 0 | 0 | 0 |
| 3 | true | 389806 | 238776 | -619082 | 0 | -34800 | 0 | 61760 | 528757 | 123250 | 25500 | -8000 | 0 | 0 | 0 | 0 |
| 4 | true | 412926 | 263176 | -680272 | 0 | -34800 | 0 | 84920 | 614880 | 59500 | 17000 | -38108 | 0 | 0 | 0 | 0 |
| 5 | true | 343762 | 242102 | -770544 | 0 | -34800 | 0 | 99520 | 574560 | 59500 | 17000 | -14400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 71271

Regular: 31.9% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 42. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 62075 | 15755 | -522029 | 0 | -43500 | 0 | 37800 | 351204 | 15000 | 30000 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | -104811 | -106451 | -555683 | 0 | -43500 | 0 | 45800 | 396029 | 0 | 0 | -9532 | 0 | 0 | 0 | 0 |
| 3 | true | -117705 | -157565 | -348531 | 0 | -43500 | 0 | 42760 | 338877 | 0 | 0 | -2500 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 71271

Regular: 43.1% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 31662 | -14004 | -560483 | 0 | -52200 | 0 | 37800 | 420945 | 18000 | 24000 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | -108476 | -110036 | -529790 | 0 | -52200 | 0 | 45800 | 395052 | 0 | 0 | 1000 | 0 | 0 | 0 | 0 |
| 3 | true | -67058 | -154103 | -360854 | 0 | -52200 | 0 | 46960 | 400512 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 79190

Regular: 54.2% wins / 72 games; finals: 75.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 62. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -158045 | -159285 | -525752 | 0 | -57480 | 0 | 35040 | 312861 | 0 | 0 | -9169 | -180303 | -13242 | -20000 | 0 |
| 2 | true | 114002 | -186898 | -290463 | 0 | -58290 | 0 | 31760 | 447390 | 123250 | 17000 | 1400 | 0 | 0 | 0 | 0 |
| 3 | true | -3889 | -36695 | -450139 | 0 | -58290 | 0 | 55840 | 516578 | 12750 | 17000 | 10800 | -206070 | -16360 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 79190

Regular: 44.4% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 77. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -112508 | -134728 | -476624 | 0 | -68700 | 0 | 36200 | 331044 | 0 | 20000 | 5900 | -127980 | -12348 | -20000 | 0 |
| 2 | true | -679 | -142846 | -299584 | 0 | -69600 | 0 | 43200 | 439289 | 15000 | 10000 | 6400 | -32876 | 0 | 0 | 0 |
| 3 | true | -66772 | -66772 | -421036 | 0 | -69600 | 0 | 52120 | 381056 | 0 | 0 | 1400 | -8715 | -1318 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 79190

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -164285 | -166505 | -464741 | 0 | -82804 | 0 | 37280 | 310842 | 0 | 0 | -3600 | -81402 | -6860 | -23000 | 0 |
| 2 | true | -123495 | -194482 | -295559 | 0 | -83897 | 0 | 41360 | 368886 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 79190

Regular: 52.1% wins / 96 games; finals: 80.0% wins / 5 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 63 / unreached / unreached; broke: true; weeks in debt: 11. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 132391 | 36455 | -536356 | -2320 | -42360 | 0 | 34880 | 410518 | 25500 | 25500 | -63859 | 0 | -11112 | -8000 | 0 |
| 2 | true | 220265 | 34961 | -512135 | -2320 | -53070 | 0 | 46000 | 485735 | 123250 | 17000 | -3000 | 0 | -13586 | 0 | 0 |
| 3 | true | 141329 | 121649 | -586088 | -2320 | -53070 | 0 | 77480 | 493194 | 0 | 17000 | -7000 | 0 | -18132 | 0 | 0 |
| 4 | true | -138913 | -138913 | -718603 | -2320 | -53070 | 0 | 77000 | 491944 | 0 | 0 | -75193 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 79190

Regular: 47.2% wins / 72 games; finals: 33.3% wins / 3 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 68. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -52416 | -103616 | -558368 | -2320 | -43500 | 0 | 34880 | 338751 | 30000 | 20000 | -63859 | 0 | 0 | -8000 | 0 |
| 2 | true | -112184 | -131407 | -452589 | -2320 | -43500 | 0 | 41960 | 383681 | 0 | 0 | 13000 | 0 | 0 | 0 | 0 |
| 3 | true | -20547 | -144626 | -329641 | -2320 | -43500 | 0 | 42680 | 391818 | 15000 | 20000 | -2400 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 79190

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -131460 | -132660 | -576056 | -2320 | -52200 | 0 | 34800 | 323316 | 0 | 0 | -1000 | 0 | 0 | -8000 | 0 |
| 2 | true | -191763 | -192883 | -340568 | -2320 | -52200 | 0 | 31120 | 301665 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 79190

Regular: 60.0% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 136 / unreached / unreached; broke: true; weeks in debt: 48. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -74162 | -105112 | -501088 | -21735 | -110490 | 0 | 35240 | 388361 | 12750 | 17000 | 10800 | 0 | 0 | -205000 | 0 |
| 2 | true | 202907 | -128711 | -324794 | -25810 | -110490 | 0 | 45520 | 546993 | 123250 | 17000 | 5400 | 0 | 0 | 0 | 0 |
| 3 | true | 74985 | 4613 | -409104 | -45940 | -110490 | 0 | 73840 | 534240 | 12750 | 25500 | 9200 | -43786 | -14132 | -160000 | 0 |
| 4 | true | 152381 | 6335 | -508392 | -51330 | -110490 | 0 | 84160 | 534240 | 123250 | 17000 | 15100 | -26142 | 0 | 0 | 0 |
| 5 | true | -58267 | -66767 | -623467 | -57130 | -110490 | 0 | 105560 | 534240 | 25500 | 8500 | -13361 | 0 | 0 | -80000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 79190

Regular: 39.6% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 46. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -133675 | -159955 | -513900 | -8420 | -131950 | 0 | 35480 | 344715 | 15000 | 10000 | 11400 | 0 | 0 | -96000 | 0 |
| 2 | true | -172880 | -174240 | -294179 | -8990 | -131950 | 0 | 39480 | 343434 | 0 | 0 | 13000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 79190

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -189473 | -190713 | -477527 | -7490 | -148915 | 0 | 36040 | 315819 | 0 | 0 | 5600 | 0 | 0 | -63000 | 0 |
| 2 | true | -225325 | -226875 | -245038 | -7830 | -148915 | 0 | 34640 | 327191 | 0 | 0 | 4100 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 79190

Regular: 43.8% wins / 96 games; finals: 80.0% wins / 5 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 73 / unreached / unreached; broke: true; weeks in debt: 20. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 166006 | 16056 | -534832 | 0 | -34800 | 0 | 34880 | 314941 | 123250 | 25500 | -62933 | 0 | 0 | 0 | 0 |
| 2 | true | 209974 | 120108 | -534920 | 0 | -34800 | 0 | 60720 | 521288 | 25500 | 17000 | -10820 | 0 | 0 | 0 | 0 |
| 3 | true | 96057 | 76697 | -646906 | 0 | -34800 | 0 | 67240 | 489949 | 0 | 17000 | -6400 | 0 | 0 | 0 | 0 |
| 4 | true | -161891 | -161891 | -780550 | 0 | -34800 | 0 | 71640 | 491601 | 0 | 0 | -5839 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 79190

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -115168 | -116368 | -554312 | 0 | -43500 | 0 | 34840 | 310737 | 0 | 0 | -62933 | 0 | 0 | 0 | 0 |
| 2 | true | -171853 | -172893 | -323297 | 0 | -43500 | 0 | 29680 | 268832 | 0 | 0 | 11600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 79190

Regular: 36.5% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -112474 | -155914 | -559325 | 0 | -52200 | 0 | 38480 | 329217 | 18000 | 24000 | -60646 | 0 | 0 | 0 | 0 |
| 2 | true | 46670 | -132906 | -282269 | 0 | -52200 | 0 | 46360 | 407642 | 18000 | 24000 | 2000 | -4389 | 0 | 0 | 0 |
| 3 | true | 163352 | 13110 | -378175 | 0 | -52200 | 0 | 53320 | 464237 | 0 | 24000 | 5500 | 0 | 0 | 0 | 0 |
| 4 | true | 243560 | 132221 | -388571 | 0 | -52200 | 0 | 57040 | 461339 | 0 | 12000 | -9400 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 87109

Regular: 66.7% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 86. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -100396 | -149071 | -566813 | 0 | -54240 | 0 | 36480 | 388262 | 12750 | 17000 | 0 | -204271 | -9564 | -20000 | 0 |
| 2 | true | -9552 | -127097 | -332764 | 0 | -58290 | 0 | 49000 | 477813 | 12750 | 8500 | 3000 | -65989 | -3176 | 0 | 0 |
| 3 | true | 39221 | -40733 | -433162 | 0 | -58290 | 0 | 57720 | 556214 | 25500 | 25500 | 600 | -115209 | -10100 | 0 | 0 |
| 4 | true | 79239 | -43056 | -546028 | 0 | -58290 | 0 | 67160 | 492106 | 123250 | 17000 | 7500 | -45718 | -16962 | 0 | 0 |
| 5 | true | 136602 | -39765 | -513834 | 0 | -58290 | 0 | 85840 | 614880 | 123250 | 17000 | -5000 | -186845 | -19638 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 87109

Regular: 35.4% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -147685 | -148925 | -497697 | 0 | -43500 | 0 | 35840 | 314370 | 0 | 0 | 0 | -146402 | -10296 | 0 | 0 |
| 2 | true | -97404 | -175507 | -316537 | 0 | -43500 | 0 | 36520 | 332798 | 30000 | 10000 | 1000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 87109

Regular: 43.8% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 54. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -101239 | -150479 | -527367 | 0 | -52200 | 0 | 35680 | 352002 | 36000 | 12000 | -5000 | -94230 | -8124 | 0 | 0 |
| 2 | true | -97619 | -133277 | -346555 | 0 | -52200 | 0 | 38840 | 353535 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 87109

Regular: 72.5% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 92 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 15/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 265897 | 168087 | -493070 | -2320 | -42360 | 0 | 36320 | 428097 | 25500 | 25500 | 0 | 0 | -3770 | -8000 | 0 |
| 2 | true | 322337 | 224688 | -490315 | -2320 | -53070 | 0 | 54080 | 516237 | 12750 | 17000 | 6000 | 0 | -3922 | 0 | 0 |
| 3 | true | 485735 | 278977 | -521762 | -2320 | -53070 | 0 | 62760 | 612108 | 59500 | 25500 | 3600 | 0 | -22918 | 0 | 0 |
| 4 | true | 426363 | 393973 | -641726 | -2320 | -53070 | 0 | 78240 | 534240 | 12750 | 17000 | -1000 | 0 | -3486 | 0 | 0 |
| 5 | true | 307183 | 274393 | -678406 | -2320 | -53070 | 0 | 84680 | 534240 | 12750 | 17000 | 600 | 0 | -34654 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 87109

Regular: 31.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 32. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -46851 | -48091 | -512140 | -2320 | -51900 | 0 | 35840 | 291669 | 0 | 0 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | -123673 | -127429 | -364855 | -2320 | -63800 | 0 | 31960 | 313593 | 0 | 0 | 8600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 87109

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 41. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -130894 | -132134 | -550272 | -2320 | -52200 | 0 | 35840 | 296058 | 0 | 0 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | -146954 | -174534 | -320078 | -2320 | -52200 | 0 | 34080 | 308858 | 0 | 0 | 15600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 87109

Regular: 47.2% wins / 72 games; finals: 66.7% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 71. Opening players gaining a star: 15/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -120408 | -130148 | -490616 | -16235 | -110490 | 0 | 36760 | 326673 | 0 | 8500 | 5000 | 0 | 0 | -180000 | 0 |
| 2 | true | -104770 | -162102 | -292100 | -18560 | -110490 | 0 | 41960 | 371628 | 0 | 8500 | 14700 | 0 | 0 | 0 | 0 |
| 3 | true | 41882 | -136526 | -273439 | -18560 | -110490 | 0 | 45160 | 423531 | 59500 | 17000 | 3950 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 87109

Regular: 56.7% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 20. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 6167 | -160073 | -502770 | -12920 | -127600 | 0 | 36760 | 347697 | 145000 | 20000 | 5000 | 0 | 0 | -105000 | 0 |
| 2 | true | 157013 | -29594 | -365197 | -17010 | -127600 | 0 | 61160 | 475493 | 145000 | 20000 | 14000 | 0 | 0 | -55000 | 0 |
| 3 | true | 270013 | 4934 | -453111 | -34150 | -127600 | 0 | 84280 | 640500 | 145000 | 30000 | 6650 | -54691 | -12878 | -111000 | 0 |
| 4 | true | 115083 | 21561 | -537702 | -56330 | -127600 | 0 | 111760 | 598500 | 30000 | 20000 | 5150 | -18966 | -5742 | -174000 | 0 |
| 5 | true | 21867 | -7133 | -556489 | -60755 | -127600 | 0 | 113440 | 556500 | 15000 | 10000 | 11800 | -5112 | 0 | -50000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 87109

Regular: 18.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -186459 | -187699 | -486687 | -7490 | -148915 | 0 | 36760 | 327873 | 0 | 0 | 5000 | 0 | 0 | -63000 | 0 |
| 2 | true | -249893 | -252073 | -271578 | -7830 | -148915 | 0 | 35000 | 315189 | 0 | 0 | 14700 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 87109

Regular: 64.2% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 100 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 222668 | 186520 | -492594 | 0 | -34800 | 0 | 35840 | 384472 | 12750 | 17000 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 298877 | 174331 | -503382 | 0 | -34800 | 0 | 44120 | 521771 | 25500 | 17000 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 402443 | 202051 | -542052 | 0 | -34800 | 0 | 51880 | 533011 | 123250 | 25500 | -53223 | 0 | 0 | 0 | 0 |
| 4 | true | 252209 | 219739 | -708131 | 0 | -34800 | 0 | 79080 | 534240 | 12750 | 17000 | -50373 | 0 | 0 | 0 | 0 |
| 5 | true | 108850 | 76300 | -736989 | 0 | -34800 | 0 | 82440 | 534240 | 12750 | 17000 | -18000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 87109

Regular: 49.0% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 1. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 57938 | 21538 | -512140 | 0 | -43500 | 0 | 36320 | 342258 | 15000 | 20000 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 176980 | 9018 | -523131 | 0 | -43500 | 0 | 47600 | 542073 | 70000 | 20000 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 213222 | 128194 | -536522 | 0 | -43500 | 0 | 58000 | 526764 | 15000 | 30000 | -13500 | 0 | 0 | 0 | 0 |
| 4 | true | -15328 | -17608 | -687014 | 0 | -43500 | 0 | 66320 | 502257 | 0 | 0 | -66613 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 87109

Regular: 50.0% wins / 72 games; finals: 85.7% wins / 7 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 32. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -47974 | -79374 | -552798 | 0 | -52200 | 0 | 36320 | 340704 | 18000 | 12000 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 184071 | -130983 | -456604 | 0 | -52200 | 0 | 45080 | 491169 | 174000 | 24000 | 6600 | 0 | 0 | 0 | 0 |
| 3 | true | 520167 | 151398 | -413155 | 0 | -52200 | 0 | 72560 | 555891 | 174000 | 12000 | -13000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 95028

Regular: 55.0% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 82. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -6542 | -145500 | -559535 | 0 | -34800 | 0 | 36320 | 433843 | 59500 | 8500 | 0 | -235854 | -14516 | 0 | 0 |
| 2 | true | 47119 | -31301 | -392323 | 0 | -34800 | 0 | 50880 | 530964 | 25500 | 17000 | -5400 | -125534 | -12626 | 0 | 0 |
| 3 | true | 38281 | -34665 | -432756 | 0 | -34800 | 0 | 60560 | 560276 | 25500 | 25500 | -7200 | -185864 | -20054 | 0 | 0 |
| 4 | true | -64173 | -72673 | -579151 | 0 | -34800 | 0 | 69200 | 493920 | 12750 | 8500 | 13800 | -73659 | -13014 | 0 | 0 |
| 5 | true | 34001 | -101915 | -499304 | 0 | -34800 | 0 | 62120 | 556939 | 59500 | 17000 | 3100 | -65093 | -1288 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 95028

Regular: 55.0% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 96. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -61778 | -143098 | -512334 | 0 | -43500 | 0 | 36120 | 348831 | 70000 | 10000 | -1200 | -159405 | -10290 | 0 | 0 |
| 2 | true | 41421 | -86589 | -361086 | 0 | -43500 | 0 | 45960 | 495128 | 30000 | 20000 | 14500 | -94069 | -3734 | 0 | 0 |
| 3 | true | 55443 | -36244 | -471781 | 0 | -43500 | 0 | 54880 | 571232 | 30000 | 30000 | 4500 | -146511 | -14798 | 0 | 0 |
| 4 | true | -22169 | -41605 | -526162 | 0 | -69600 | 0 | 67160 | 543459 | 15000 | 10000 | 11800 | -101275 | -7994 | -20000 | 0 |
| 5 | true | -89021 | -89021 | -548326 | 0 | -69600 | 0 | 74760 | 510993 | 0 | 0 | 3600 | -30391 | -7888 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 95028

Regular: 18.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -172550 | -173670 | -498155 | 0 | -52200 | 0 | 33800 | 308007 | 0 | 0 | -2000 | -101100 | -10902 | 0 | 0 |
| 2 | true | -262290 | -262290 | -338277 | 0 | -52200 | 0 | 28360 | 265377 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 95028

Regular: 64.2% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 95 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 239672 | 187232 | -502540 | -2320 | -42360 | 0 | 39520 | 414186 | 25500 | 25500 | 2000 | 0 | -11814 | -8000 | 0 |
| 2 | true | 467316 | 192158 | -465590 | -2320 | -53070 | 0 | 50840 | 564934 | 123250 | 17000 | -7400 | 0 | 0 | 0 | 0 |
| 3 | true | 505455 | 431111 | -484785 | -2320 | -53070 | 0 | 77280 | 532486 | 12750 | 25500 | -39690 | 0 | -30012 | 0 | 0 |
| 4 | true | 448589 | 402809 | -656416 | -2320 | -53070 | 0 | 88600 | 534240 | 25500 | 17000 | -10400 | 0 | 0 | 0 | 0 |
| 5 | true | 451527 | 240103 | -728187 | -2320 | -53070 | 0 | 100240 | 614880 | 123250 | 17000 | -31003 | 0 | -37852 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 95028

Regular: 58.3% wins / 120 games; finals: 57.1% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 138 / unreached / unreached; broke: true; weeks in debt: 8. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 16853 | -4587 | -523845 | -2320 | -51900 | 0 | 39520 | 354270 | 0 | 20000 | 2000 | 0 | -12872 | -8000 | 0 |
| 2 | true | 39992 | -31989 | -477166 | -2320 | -63800 | 0 | 46200 | 473225 | 15000 | 20000 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 312583 | -1742 | -488259 | -2320 | -63800 | 0 | 57080 | 623480 | 145000 | 30000 | 0 | 0 | -28590 | 0 | 0 |
| 4 | true | 245695 | 201957 | -624431 | -2320 | -63800 | 0 | 91920 | 556500 | 15000 | 20000 | -59757 | 0 | 0 | 0 | 0 |
| 5 | true | 167994 | 86116 | -716442 | -2320 | -63800 | 0 | 100880 | 598500 | 30000 | 20000 | -9767 | 0 | -34752 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 95028

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 40. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -117196 | -118476 | -553147 | -2320 | -52200 | 0 | 37360 | 321111 | 0 | 0 | -10000 | 0 | 0 | -8000 | 0 |
| 2 | true | -149243 | -161355 | -321127 | -2320 | -52200 | 0 | 34040 | 305960 | 0 | 0 | 3600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 95028

Regular: 75.8% wins / 120 games; finals: 80.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 54 / unreached / unreached; broke: true; weeks in debt: 59. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 169328 | -63770 | -501584 | -16235 | -110490 | 0 | 35560 | 487327 | 123250 | 25500 | 6000 | 0 | 0 | -180000 | 0 |
| 2 | true | 138866 | -30764 | -507498 | -28170 | -110490 | 0 | 70160 | 614880 | 59500 | 17000 | -38433 | -46411 | 0 | -61000 | 0 |
| 3 | true | 202693 | 10623 | -546727 | -31330 | -110490 | 0 | 85440 | 614880 | 123250 | 25500 | -1200 | -11496 | 0 | -84000 | 0 |
| 4 | true | -98151 | -147417 | -699714 | -56930 | -110490 | 0 | 114400 | 534240 | 12750 | 8500 | 16400 | 0 | 0 | -120000 | 0 |
| 5 | true | -15766 | -134498 | -366075 | -57130 | -110490 | 0 | 112760 | 493920 | 0 | 0 | 9400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 95028

Regular: 41.7% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 76. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -130546 | -156946 | -511842 | -12920 | -127600 | 0 | 37000 | 354816 | 15000 | 10000 | 10000 | 0 | 0 | -105000 | 0 |
| 2 | true | -95492 | -168111 | -296218 | -14210 | -127600 | 0 | 42120 | 393162 | 15000 | 10000 | 12800 | 0 | 0 | 0 | 0 |
| 3 | true | -61743 | -125270 | -277053 | -14210 | -127600 | 0 | 47520 | 404492 | 0 | 0 | 600 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 95028

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -176579 | -177939 | -483114 | -7490 | -148915 | 0 | 35240 | 338100 | 0 | 0 | 2600 | 0 | 0 | -63000 | 0 |
| 2 | true | -214309 | -216916 | -282424 | -7830 | -148915 | 0 | 39280 | 356559 | 0 | 0 | 5600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 95028

Regular: 63.3% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 101 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 318847 | 220344 | -501929 | 0 | -34800 | 0 | 39000 | 460576 | 25500 | 25500 | 5000 | 0 | 0 | 0 | 0 |
| 2 | true | 628237 | 279511 | -458403 | 0 | -34800 | 0 | 51760 | 595083 | 123250 | 17000 | 15500 | 0 | 0 | 0 | 0 |
| 3 | true | 899357 | 592266 | -474317 | 0 | -34800 | 0 | 75880 | 614880 | 123250 | 25500 | -59273 | 0 | 0 | 0 | 0 |
| 4 | true | 849838 | 799634 | -694819 | 0 | -34800 | 0 | 105360 | 534240 | 25500 | 17000 | -2000 | 0 | 0 | 0 | 0 |
| 5 | true | 768772 | 633022 | -777425 | 0 | -34800 | 0 | 112800 | 534240 | 123250 | 8500 | -47631 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 95028

Regular: 53.3% wins / 120 games; finals: 16.7% wins / 6 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 19. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 120119 | 73397 | -522261 | 0 | -43500 | 0 | 36080 | 415800 | 15000 | 30000 | -11000 | 0 | 0 | 0 | 0 |
| 2 | true | 112500 | 75514 | -512686 | 0 | -43500 | 0 | 52120 | 455847 | 15000 | 20000 | 5600 | 0 | 0 | 0 | 0 |
| 3 | true | 97161 | 49961 | -514620 | 0 | -43500 | 0 | 60880 | 497249 | 15000 | 30000 | -60348 | 0 | 0 | 0 | 0 |
| 4 | true | 54443 | -36077 | -711228 | 0 | -43500 | 0 | 71760 | 598500 | 30000 | 20000 | -8250 | 0 | 0 | 0 | 0 |
| 5 | true | -86151 | -86151 | -710864 | 0 | -43500 | 0 | 82920 | 514500 | 15000 | 0 | 1350 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 95028

Regular: 33.3% wins / 48 games; finals: 50.0% wins / 2 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 39. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -118085 | -119405 | -555704 | 0 | -52200 | 0 | 35440 | 302379 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |
| 2 | true | -53987 | -166990 | -332854 | 0 | -52200 | 0 | 35520 | 352632 | 36000 | 12000 | 13000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 102947

Regular: 60.8% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 123 / unreached / unreached; broke: true; weeks in debt: 97. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -82481 | -151561 | -483875 | 0 | -58290 | 0 | 31800 | 312298 | 59500 | 8500 | 0 | -216200 | -16214 | -20000 | 0 |
| 2 | true | -49231 | -112516 | -330053 | 0 | -58290 | 0 | 40520 | 360823 | 12750 | 8500 | -1000 | 0 | 0 | 0 | 0 |
| 3 | true | 182454 | -81693 | -387340 | 0 | -58290 | 0 | 46240 | 556999 | 123250 | 25500 | 8600 | -78996 | -4278 | 0 | 0 |
| 4 | true | 159415 | -41063 | -552886 | 0 | -58290 | 0 | 77400 | 614880 | 123250 | 17000 | 10000 | -231713 | -22680 | 0 | 0 |
| 5 | true | -30551 | -56526 | -644205 | 0 | -58290 | 0 | 98200 | 574560 | 25500 | 8500 | 8000 | -188129 | -14102 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 102947

Regular: 41.7% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -124628 | -135828 | -470408 | 0 | -69600 | 0 | 34640 | 328839 | 0 | 10000 | 12600 | -138755 | -11944 | -20000 | 0 |
| 2 | true | -78359 | -156850 | -320359 | 0 | -69600 | 0 | 38520 | 372708 | 15000 | 10000 | 0 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 102947

Regular: 31.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -168541 | -169781 | -480379 | 0 | -78880 | 0 | 35520 | 311598 | 0 | 0 | 8800 | -99438 | -6762 | -9000 | 0 |
| 2 | true | -214539 | -214539 | -311269 | 0 | -78880 | 0 | 32080 | 316071 | 0 | 0 | -4000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 102947

Regular: 79.2% wins / 120 games; finals: 80.0% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 84 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 15/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 262685 | 93841 | -501146 | -2320 | -41730 | 0 | 36120 | 464244 | 59500 | 25500 | -63677 | 0 | -5806 | -8000 | 0 |
| 2 | true | 480615 | 211026 | -533157 | -2320 | -53070 | 0 | 57800 | 604417 | 123250 | 17000 | 6000 | 0 | -1990 | 0 | 0 |
| 3 | true | 631085 | 404973 | -555472 | -2320 | -53070 | 0 | 82800 | 614880 | 123250 | 25500 | -60100 | 0 | -24998 | 0 | 0 |
| 4 | true | 641213 | 487873 | -729646 | -2320 | -53070 | 0 | 113120 | 614880 | 59500 | 17000 | -6400 | 0 | -2936 | 0 | 0 |
| 5 | true | 541440 | 404000 | -812359 | -2320 | -53070 | 0 | 114520 | 614880 | 59500 | 17000 | -1000 | 0 | -36924 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 102947

Regular: 55.8% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 131 / unreached / unreached; broke: true; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 254127 | -7201 | -523344 | -2320 | -51200 | 0 | 36120 | 490602 | 145000 | 30000 | -62731 | 0 | 0 | -8000 | 0 |
| 2 | true | 269090 | 204834 | -556631 | -2320 | -63800 | 0 | 70560 | 513198 | 30000 | 20000 | 6000 | 0 | -2044 | 0 | 0 |
| 3 | true | 329458 | 151532 | -602764 | -2320 | -63800 | 0 | 73520 | 640500 | 70000 | 30000 | -60100 | 0 | -24668 | 0 | 0 |
| 4 | true | 212822 | 174702 | -721870 | -2320 | -63800 | 0 | 88880 | 556500 | 15000 | 20000 | -6400 | 0 | -2626 | 0 | 0 |
| 5 | true | 24445 | -13955 | -782271 | -2320 | -63800 | 0 | 94600 | 556500 | 15000 | 20000 | 8600 | 0 | -34686 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 102947

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 39. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -135155 | -136555 | -574705 | -2320 | -52200 | 0 | 36520 | 331401 | 0 | 0 | -15851 | 0 | 0 | -8000 | 0 |
| 2 | true | -97424 | -177601 | -322684 | -2320 | -52200 | 0 | 42240 | 369695 | 0 | 0 | 3000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 102947

Regular: 69.4% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 59. Opening players gaining a star: 15/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -54454 | -85404 | -504246 | -21235 | -110490 | 0 | 33920 | 424510 | 12750 | 17000 | -1663 | 0 | 0 | -205000 | 0 |
| 2 | true | -34601 | -129048 | -392276 | -25810 | -110490 | 0 | 46320 | 476259 | 12750 | 8500 | 4600 | 0 | 0 | 0 | 0 |
| 3 | true | -26668 | -74360 | -369352 | -25810 | -110490 | 0 | 53080 | 431805 | 0 | 8500 | 20200 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 102947

Regular: 53.3% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 74. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 155491 | -104817 | -514344 | -12920 | -127600 | 0 | 37920 | 490035 | 145000 | 30000 | 12400 | 0 | 0 | -105000 | 0 |
| 2 | true | 72278 | 4211 | -515793 | -25075 | -127600 | 0 | 75760 | 598500 | 30000 | 20000 | 6000 | -9005 | 0 | -136000 | 0 |
| 3 | true | 178312 | -34896 | -563626 | -37120 | -127600 | 0 | 85280 | 598500 | 145000 | 30000 | 5600 | 0 | 0 | -30000 | 0 |
| 4 | true | -175137 | -175137 | -709899 | -50930 | -127600 | 0 | 113080 | 514500 | 0 | 0 | 1400 | 0 | 0 | -94000 | 0 |
| 5 | true | -67511 | -225256 | -383684 | -51330 | -127600 | 0 | 111040 | 514500 | 30000 | 0 | 14700 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 102947

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -184153 | -185673 | -510343 | -3440 | -153932 | 0 | 37920 | 340242 | 0 | 0 | 12400 | 0 | 0 | -57000 | 0 |
| 2 | true | -201104 | -220328 | -298563 | -3480 | -153932 | 0 | 45080 | 387944 | 0 | 0 | 6000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 102947

Regular: 70.8% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 98 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 381606 | 147020 | -499686 | 0 | -34800 | 0 | 36240 | 486501 | 123250 | 25500 | -55399 | 0 | 0 | 0 | 0 |
| 2 | true | 441065 | 336992 | -545986 | 0 | -34800 | 0 | 68920 | 533575 | 12750 | 17000 | 8000 | 0 | 0 | 0 | 0 |
| 3 | true | 491951 | 390755 | -561551 | 0 | -34800 | 0 | 78880 | 570528 | 25500 | 25500 | -53171 | 0 | 0 | 0 | 0 |
| 4 | true | 315639 | 282729 | -784822 | 0 | -34800 | 0 | 90720 | 534240 | 12750 | 17000 | -11400 | 0 | 0 | 0 | 0 |
| 5 | true | 248625 | 39907 | -827684 | 0 | -34800 | 0 | 97440 | 614880 | 123250 | 17000 | -57100 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 102947

Regular: 65.0% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 21. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 135836 | 30697 | -521804 | 0 | -43500 | 0 | 36240 | 460299 | 30000 | 30000 | -55399 | 0 | 0 | 0 | 0 |
| 2 | true | 95842 | 56922 | -581996 | 0 | -43500 | 0 | 47920 | 494582 | 15000 | 20000 | 8000 | 0 | 0 | 0 | 0 |
| 3 | true | 129268 | -13045 | -634482 | 0 | -43500 | 0 | 56520 | 567966 | 70000 | 30000 | -13078 | 0 | 0 | 0 | 0 |
| 4 | true | 35825 | -1975 | -712403 | 0 | -43500 | 0 | 75360 | 556500 | 15000 | 20000 | -4400 | 0 | 0 | 0 | 0 |
| 5 | true | 162226 | -78116 | -730559 | 0 | -43500 | 0 | 89360 | 640500 | 145000 | 20000 | 5600 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 102947

Regular: 35.4% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 36. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -89016 | -90416 | -562977 | 0 | -52200 | 0 | 36640 | 333921 | 0 | 0 | 5600 | 0 | 0 | 0 | 0 |
| 2 | true | -68766 | -130844 | -333419 | 0 | -52200 | 0 | 40000 | 358869 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 110866

Regular: 44.4% wins / 72 games; finals: 75.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 58. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -106892 | -152267 | -522603 | 0 | -58290 | 0 | 35080 | 350823 | 12750 | 17000 | -8000 | -195366 | -18286 | -20000 | 0 |
| 2 | true | 97531 | -133388 | -289041 | 0 | -58290 | 0 | 41920 | 374655 | 123250 | 17000 | 13000 | -18071 | 0 | 0 | 0 |
| 3 | true | -50557 | -50557 | -415000 | 0 | -58290 | 0 | 62040 | 470011 | 0 | 0 | 10100 | -199663 | -17286 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 110866

Regular: 65.8% wins / 120 games; finals: 80.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 103 / unreached / unreached; broke: true; weeks in debt: 89. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 31234 | -80018 | -522973 | 0 | -66700 | 0 | 37320 | 484008 | 30000 | 30000 | 0 | -124333 | -12088 | -24000 | 0 |
| 2 | true | 175172 | -41164 | -513099 | 0 | -66700 | 0 | 53720 | 603666 | 145000 | 20000 | 10750 | -98519 | -10880 | 0 | 0 |
| 3 | true | 200160 | -43163 | -579475 | 0 | -66700 | 0 | 78640 | 640500 | 145000 | 30000 | 13250 | -213507 | -22720 | 0 | 0 |
| 4 | true | -17780 | -124801 | -732329 | 0 | -66700 | 0 | 103560 | 598500 | 30000 | 10000 | 3000 | -153207 | -10764 | 0 | 0 |
| 5 | true | -99954 | -99954 | -600221 | 0 | -66700 | 0 | 103320 | 514500 | 0 | 0 | 5600 | -34201 | -4472 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 110866

Regular: 47.9% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -104767 | -148007 | -479516 | 0 | -78880 | 0 | 37080 | 340431 | 18000 | 24000 | -3400 | -80170 | -8312 | -24000 | 0 |
| 2 | true | -60346 | -137528 | -300305 | 0 | -78880 | 0 | 38440 | 372866 | 0 | 0 | 12300 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 110866

Regular: 60.8% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 100 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 165292 | 122818 | -507549 | -2320 | -42360 | 0 | 37960 | 418481 | 12750 | 25500 | -64322 | 0 | -4848 | -8000 | 0 |
| 2 | true | 188459 | 117734 | -491608 | -2320 | -53070 | 0 | 50960 | 486975 | 12750 | 17000 | 8500 | 0 | -6020 | 0 | 0 |
| 3 | true | 379103 | 142839 | -530375 | -2320 | -53070 | 0 | 57200 | 596353 | 123250 | 25500 | -3000 | 0 | -22894 | 0 | 0 |
| 4 | true | 330300 | 284640 | -594757 | -2320 | -53070 | 0 | 88880 | 493920 | 25500 | 17000 | -14000 | 0 | -9956 | 0 | 0 |
| 5 | true | 236450 | 129682 | -723118 | -2320 | -53070 | 0 | 90800 | 574560 | 59500 | 17000 | 7100 | -37234 | -27068 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 110866

Regular: 40.3% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 44. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 32314 | -15750 | -529866 | -2320 | -51900 | 0 | 37960 | 405762 | 15000 | 30000 | -64322 | 0 | 0 | -8000 | 0 |
| 2 | true | -69399 | -70999 | -506659 | -2320 | -63800 | 0 | 47440 | 416126 | 0 | 0 | 7500 | 0 | 0 | 0 | 0 |
| 3 | true | -68089 | -124637 | -354808 | -2320 | -63800 | 0 | 46760 | 376478 | 0 | 0 | -1000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 110866

Regular: 59.2% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 30. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 6115 | -37729 | -566394 | -2320 | -52200 | 0 | 37960 | 426594 | 18000 | 24000 | -21525 | 0 | 0 | -8000 | 0 |
| 2 | true | 54909 | -57988 | -548882 | -2320 | -52200 | 0 | 46800 | 532896 | 36000 | 24000 | 12500 | 0 | 0 | 0 | 0 |
| 3 | true | 300973 | 4034 | -545557 | -2320 | -52200 | 0 | 58640 | 630105 | 174000 | 36000 | -27452 | 0 | -25152 | 0 | 0 |
| 4 | true | 259679 | 70679 | -710234 | -2320 | -75545 | 0 | 86520 | 514500 | 174000 | 12000 | -400 | -26523 | -13292 | 0 | 0 |
| 5 | true | 130399 | 40433 | -790299 | -2320 | -75545 | 0 | 102880 | 598500 | 36000 | 24000 | 6000 | 0 | -28496 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 110866

Regular: 73.3% wins / 120 games; finals: 69.2% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 84 / unreached / unreached; broke: true; weeks in debt: 68. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -30549 | -74369 | -499583 | -16235 | -110490 | 0 | 35600 | 395859 | 25500 | 17000 | 1800 | 0 | 0 | -180000 | 0 |
| 2 | true | 147123 | -90775 | -471308 | -18560 | -110490 | 0 | 50840 | 575940 | 123250 | 17000 | 11000 | 0 | 0 | 0 | 0 |
| 3 | true | 144253 | -11863 | -503329 | -27970 | -110490 | 0 | 78760 | 614880 | 59500 | 25500 | -14498 | -34223 | 0 | -91000 | 0 |
| 4 | true | 30028 | -39792 | -637785 | -39730 | -110490 | 0 | 91320 | 574560 | 25500 | 17000 | 19400 | 0 | 0 | -54000 | 0 |
| 5 | true | 57608 | -125757 | -614220 | -39730 | -110490 | 0 | 98640 | 614880 | 59500 | 17000 | 2000 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 110866

Regular: 70.0% wins / 120 games; finals: 92.9% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 137 / unreached / unreached; broke: true; weeks in debt: 58. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -13776 | -106326 | -520115 | -12740 | -127600 | 0 | 37640 | 467439 | 30000 | 20000 | -3400 | 0 | 0 | -105000 | 0 |
| 2 | true | 195276 | -71851 | -446020 | -14210 | -127600 | 0 | 47920 | 571662 | 145000 | 20000 | 12300 | 0 | 0 | 0 | 0 |
| 3 | true | 240743 | -24281 | -559812 | -24485 | -127600 | 0 | 79680 | 640500 | 145000 | 30000 | 4706 | -42522 | 0 | -100000 | 0 |
| 4 | true | 214100 | -26086 | -602233 | -44990 | -127600 | 0 | 111080 | 640500 | 145000 | 20000 | 11600 | 0 | 0 | -180000 | 0 |
| 5 | true | 88998 | -96064 | -704747 | -60455 | -127600 | 0 | 113400 | 598500 | 145000 | 10000 | 10800 | 0 | 0 | -110000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 110866

Regular: 27.1% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -174733 | -176173 | -473182 | -7490 | -148915 | 0 | 38200 | 322854 | 0 | 0 | 6800 | 0 | 0 | -63000 | 0 |
| 2 | true | -223927 | -225127 | -271251 | -7830 | -148915 | 0 | 35360 | 333942 | 0 | 0 | 9500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 110866

Regular: 46.9% wins / 96 games; finals: 66.7% wins / 6 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 146456 | 104608 | -507976 | 0 | -34800 | 0 | 35640 | 380400 | 12750 | 25500 | -65058 | 0 | 0 | 0 | 0 |
| 2 | true | 214285 | 72395 | -502381 | 0 | -34800 | 0 | 46680 | 406980 | 123250 | 17000 | 11100 | 0 | 0 | 0 | 0 |
| 3 | true | 298888 | 170390 | -538676 | 0 | -34800 | 0 | 69440 | 534139 | 25500 | 17000 | 12000 | 0 | 0 | 0 | 0 |
| 4 | true | 207429 | 196289 | -637709 | 0 | -34800 | 0 | 75880 | 492670 | 0 | 8500 | 4000 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 110866

Regular: 50.8% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 4. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 115881 | -60359 | -529544 | 0 | -43500 | 0 | 35560 | 343854 | 145000 | 30000 | -65489 | 0 | 0 | 0 | 0 |
| 2 | true | 208152 | 69393 | -516380 | 0 | -43500 | 0 | 59920 | 544131 | 15000 | 20000 | 13100 | 0 | 0 | 0 | 0 |
| 3 | true | 265019 | 163842 | -536791 | 0 | -43500 | 0 | 66960 | 513198 | 15000 | 30000 | 12000 | 0 | 0 | 0 | 0 |
| 4 | true | 194241 | 156721 | -689098 | 0 | -43500 | 0 | 71320 | 556500 | 15000 | 20000 | -1000 | 0 | 0 | 0 | 0 |
| 5 | true | -36374 | -36374 | -772119 | 0 | -43500 | 0 | 74800 | 508704 | 0 | 0 | 1500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 110866

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -89016 | -102546 | -558946 | 0 | -52200 | 0 | 35840 | 330540 | 0 | 12000 | -6250 | 0 | 0 | 0 | 0 |
| 2 | true | -79802 | -133423 | -345410 | 0 | -52200 | 0 | 39600 | 346374 | 0 | 0 | 20850 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 118785

Regular: 68.3% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 142 / unreached / unreached; broke: true; weeks in debt: 80. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -83528 | -123186 | -553273 | 0 | -57480 | 0 | 35120 | 386003 | 12750 | 17000 | -1400 | -184040 | -18208 | -20000 | 0 |
| 2 | true | 106842 | -118415 | -370381 | 0 | -58290 | 0 | 44800 | 530832 | 59500 | 17000 | 20200 | -50999 | -2292 | 0 | 0 |
| 3 | true | 182332 | -40072 | -509319 | 0 | -58290 | 0 | 56840 | 603379 | 123250 | 25500 | -4000 | -143972 | -17898 | 0 | 0 |
| 4 | true | 86346 | -42902 | -546880 | 0 | -58290 | 0 | 82680 | 614880 | 59500 | 17000 | -7500 | -237942 | -19434 | 0 | 0 |
| 5 | true | -18950 | -46884 | -600534 | 0 | -58290 | 0 | 94120 | 574560 | 25500 | 8500 | 5000 | -138842 | -15310 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 118785

Regular: 51.4% wins / 72 games; finals: 33.3% wins / 3 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 62. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -57644 | -127464 | -526004 | 0 | -68700 | 0 | 37320 | 411222 | 15000 | 20000 | -2000 | -114110 | -10372 | -20000 | 0 |
| 2 | true | 35654 | -91497 | -384174 | 0 | -69600 | 0 | 46240 | 508043 | 30000 | 20000 | 2000 | -57571 | -1640 | 0 | 0 |
| 3 | true | -68864 | -68864 | -471631 | 0 | -69600 | 0 | 55200 | 474002 | 0 | 0 | 5000 | -82531 | -14958 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 118785

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 56. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -154070 | -156210 | -494637 | 0 | -52200 | 0 | 35160 | 323043 | 0 | 0 | 1600 | -111548 | -5488 | 0 | 0 |
| 2 | true | -203462 | -204622 | -342548 | 0 | -52200 | 0 | 33640 | 302516 | 0 | 0 | 9200 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 118785

Regular: 46.9% wins / 96 games; finals: 25.0% wins / 4 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 21. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 62468 | 52608 | -510270 | -2240 | -42360 | 0 | 37600 | 335928 | 0 | 8500 | -51768 | 0 | -4922 | -8000 | 0 |
| 2 | true | 33671 | -10105 | -476168 | -2320 | -53070 | 0 | 43960 | 426495 | 12750 | 17000 | 9000 | 0 | -6444 | 0 | 0 |
| 3 | true | -18579 | -35921 | -453640 | -2320 | -53070 | 0 | 48720 | 423986 | 12750 | 17000 | -40776 | 0 | -4900 | 0 | 0 |
| 4 | true | 29647 | -61443 | -480762 | -2320 | -53070 | 0 | 51120 | 474758 | 25500 | 17000 | 16000 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 118785

Regular: 45.8% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 33. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -51071 | -52431 | -532604 | -2240 | -43500 | 0 | 37600 | 336441 | 0 | 0 | -38768 | 0 | 0 | -8000 | 0 |
| 2 | true | -75451 | -121431 | -442759 | -2320 | -43500 | 0 | 41240 | 385959 | 15000 | 10000 | 12000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 118785

Regular: 39.6% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 43. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -151236 | -152596 | -583800 | -2240 | -52200 | 0 | 37360 | 348285 | 0 | 0 | -40641 | 0 | 0 | -8000 | 0 |
| 2 | true | -131108 | -183220 | -332753 | -2320 | -52200 | 0 | 40680 | 350721 | 0 | 0 | 16000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 118785

Regular: 63.3% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 56. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -123057 | -132877 | -490454 | -16235 | -110490 | 0 | 37440 | 330182 | 0 | 8500 | -2000 | 0 | 0 | -180000 | 0 |
| 2 | true | -51917 | -161744 | -292757 | -18560 | -110490 | 0 | 41960 | 421937 | 12750 | 8500 | 7800 | 0 | 0 | 0 | 0 |
| 3 | true | 221319 | -82067 | -287591 | -18650 | -110490 | 0 | 46680 | 530158 | 123250 | 25500 | 379 | 0 | 0 | -36000 | 0 |
| 4 | true | 246862 | 3477 | -433619 | -45180 | -110490 | 0 | 77640 | 614880 | 123250 | 25500 | 1000 | -74200 | -4238 | -149000 | 0 |
| 5 | true | 95497 | 10751 | -522302 | -60630 | -110490 | 0 | 107360 | 574560 | 25500 | 17000 | 17200 | -63347 | -6216 | -130000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 118785

Regular: 41.7% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 58. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -147664 | -159064 | -506072 | -12920 | -127600 | 0 | 38280 | 354648 | 0 | 10000 | 1000 | 0 | 0 | -105000 | 0 |
| 2 | true | -54076 | -184054 | -293497 | -14210 | -127600 | 0 | 44640 | 440255 | 30000 | 10000 | 4000 | 0 | 0 | 0 | 0 |
| 3 | true | 1821 | -86299 | -304989 | -14210 | -127600 | 0 | 48280 | 434616 | 0 | 10000 | 9800 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 118785

Regular: 35.4% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -150976 | -153476 | -492706 | -7490 | -148915 | 0 | 40520 | 369915 | 0 | 0 | 700 | 0 | 0 | -63000 | 0 |
| 2 | true | -130064 | -185102 | -275452 | -7830 | -148915 | 0 | 44960 | 388049 | 0 | 0 | 20100 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 118785

Regular: 27.1% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 3. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 65534 | 55674 | -512463 | 0 | -34800 | 0 | 37600 | 312280 | 0 | 8500 | -45583 | 0 | 0 | 0 | 0 |
| 2 | true | -40856 | -42296 | -441819 | 0 | -34800 | 0 | 39320 | 349667 | 0 | 0 | -18758 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 118785

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 30. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -7601 | -9001 | -516590 | 0 | -43500 | 0 | 37200 | 317289 | 0 | 0 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | -82153 | -83513 | -420587 | 0 | -43500 | 0 | 37920 | 342615 | 0 | 0 | 9000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 118785

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -95687 | -97007 | -576099 | 0 | -52200 | 0 | 36800 | 343812 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |
| 2 | true | -112862 | -132819 | -343317 | 0 | -52200 | 0 | 39720 | 331622 | 0 | 0 | 7000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 126704

Regular: 65.8% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 101 / unreached / unreached; broke: true; weeks in debt: 90. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -20448 | -122427 | -562848 | 0 | -58290 | 0 | 38880 | 454505 | 25500 | 17000 | 1600 | -204047 | -12748 | -20000 | 0 |
| 2 | true | 36955 | -51574 | -394762 | 0 | -58290 | 0 | 48360 | 524473 | 25500 | 17000 | 7800 | -99662 | -13016 | 0 | 0 |
| 3 | true | 41914 | -38025 | -510028 | 0 | -58290 | 0 | 55920 | 509300 | 59500 | 25500 | -2500 | -55347 | -19096 | 0 | 0 |
| 4 | true | 151033 | -40648 | -564522 | 0 | -58290 | 0 | 66520 | 614880 | 123250 | 17000 | 7800 | -89673 | -7846 | 0 | 0 |
| 5 | true | -73353 | -91311 | -689590 | 0 | -58290 | 0 | 90720 | 534240 | 12750 | 8500 | 8600 | -122366 | -8950 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 126704

Regular: 50.0% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 79. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -58495 | -125427 | -526011 | 0 | -66700 | 0 | 36680 | 413847 | 15000 | 20000 | 4400 | -121369 | -10342 | -24000 | 0 |
| 2 | true | -47459 | -91943 | -371878 | 0 | -66700 | 0 | 46720 | 419801 | 0 | 0 | 5000 | -21907 | 0 | 0 | 0 |
| 3 | true | -38439 | -105346 | -493210 | 0 | -66700 | 0 | 46280 | 475650 | 15000 | 20000 | 12000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 126704

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -151239 | -160770 | -491978 | 0 | -78880 | 0 | 37520 | 344295 | 0 | 0 | 4200 | -87088 | -5308 | -24000 | 0 |
| 2 | true | -185919 | -187319 | -307149 | 0 | -78880 | 0 | 38800 | 306149 | 0 | 0 | 6400 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 126704

Regular: 62.5% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 53 / unreached / unreached; broke: true; weeks in debt: 47. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 34943 | 4113 | -524652 | -2240 | -42360 | 0 | 32000 | 308648 | 12750 | 17000 | -54637 | 0 | -3566 | -8000 | 0 |
| 2 | true | -40249 | -66187 | -511216 | -2320 | -53070 | 0 | 38360 | 419804 | 12750 | 8500 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 192021 | -90149 | -489010 | -2320 | -53070 | 0 | 49160 | 562160 | 123250 | 25500 | 16600 | 0 | 0 | 0 | 0 |
| 4 | true | 322818 | 150358 | -528097 | -2320 | -53070 | 0 | 83640 | 614880 | 59500 | 17000 | -43570 | 0 | -17166 | 0 | 0 |
| 5 | true | 414694 | 197950 | -681722 | -2320 | -53070 | 0 | 96880 | 614880 | 123250 | 17000 | -6400 | 0 | -16622 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 126704

Regular: 57.5% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 69 / unreached / unreached; broke: true; weeks in debt: 47. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 48265 | -56581 | -550488 | -2240 | -43500 | 0 | 32160 | 414330 | 30000 | 30000 | -53997 | 0 | 0 | -8000 | 0 |
| 2 | true | 106350 | -35200 | -556553 | -2320 | -43500 | 0 | 45800 | 514658 | 70000 | 20000 | 10000 | 0 | 0 | 0 | 0 |
| 3 | true | -58003 | -78003 | -679098 | -2320 | -63800 | 0 | 59880 | 497837 | 15000 | 20000 | -9000 | 0 | -2852 | 0 | 0 |
| 4 | true | 20772 | -132297 | -529651 | -2320 | -63800 | 0 | 64240 | 512306 | 70000 | 20000 | 8000 | 0 | 0 | 0 | 0 |
| 5 | true | 69552 | -24278 | -570727 | -2320 | -63800 | 0 | 72040 | 598500 | 30000 | 20000 | -20192 | -14721 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 126704

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 41. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -155239 | -156359 | -560259 | -2240 | -52200 | 0 | 32160 | 299607 | 0 | 0 | -14307 | 0 | 0 | -8000 | 0 |
| 2 | true | -176813 | -191867 | -319204 | -2320 | -52200 | 0 | 33880 | 312270 | 0 | 0 | 6000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 126704

Regular: 83.3% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 41 / unreached / unreached; broke: true; weeks in debt: 50. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 3629 | -78911 | -513300 | -21735 | -109770 | 0 | 37600 | 465334 | 25500 | 17000 | 8000 | 0 | 0 | -205000 | 0 |
| 2 | true | 43361 | -59818 | -495324 | -25810 | -110490 | 0 | 51760 | 562696 | 25500 | 17000 | 14400 | 0 | 0 | 0 | 0 |
| 3 | true | 223955 | -12974 | -510271 | -25810 | -110490 | 0 | 63160 | 611353 | 123250 | 25500 | 6000 | 0 | -2098 | 0 | 0 |
| 4 | true | 172058 | -53388 | -599697 | -49540 | -110490 | 0 | 91400 | 614880 | 123250 | 25500 | 12800 | 0 | 0 | -160000 | 0 |
| 5 | true | 209772 | -7376 | -593926 | -57130 | -110490 | 0 | 115680 | 614880 | 123250 | 17000 | 8450 | 0 | 0 | -80000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 126704

Regular: 71.7% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 57 / unreached / unreached; broke: true; weeks in debt: 80. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 167375 | -91061 | -536268 | -12740 | -126800 | 0 | 37600 | 527583 | 145000 | 30000 | 8000 | 0 | 0 | -105000 | 0 |
| 2 | true | 155750 | -466 | -537300 | -21075 | -127600 | 0 | 68800 | 640500 | 70000 | 20000 | 11050 | 0 | 0 | -136000 | 0 |
| 3 | true | -89063 | -116733 | -666833 | -42230 | -127600 | 0 | 80000 | 556500 | 15000 | 20000 | 14350 | 0 | 0 | -94000 | 0 |
| 4 | true | 5403 | -151867 | -466444 | -42630 | -127600 | 0 | 88840 | 598500 | 30000 | 10000 | 3800 | 0 | 0 | 0 | 0 |
| 5 | true | 218362 | -49146 | -538791 | -42630 | -127600 | 0 | 98880 | 640500 | 145000 | 20000 | 17600 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 126704

Regular: 27.1% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -180532 | -181932 | -465739 | -7490 | -147995 | 0 | 38000 | 307692 | 0 | 0 | 8000 | 0 | 0 | -63000 | 0 |
| 2 | true | -220653 | -225593 | -276858 | -7830 | -148915 | 0 | 37800 | 341282 | 0 | 0 | 14400 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 126704

Regular: 63.3% wins / 120 games; finals: 66.7% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 68 / unreached / unreached; broke: true; weeks in debt: 3. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 148145 | 108775 | -527532 | 0 | -34800 | 0 | 32160 | 364412 | 12750 | 25500 | -24345 | 0 | 0 | 0 | 0 |
| 2 | true | 127848 | 79985 | -535891 | 0 | -34800 | 0 | 44440 | 464204 | 12750 | 17000 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 220651 | -4357 | -641846 | 0 | -34800 | 0 | 54280 | 570819 | 123250 | 25500 | -4400 | 0 | 0 | 0 | 0 |
| 4 | true | 226705 | 23839 | -731337 | 0 | -34800 | 0 | 82520 | 614880 | 123250 | 17000 | -65459 | 0 | 0 | 0 | 0 |
| 5 | true | -44285 | -52785 | -877780 | 0 | -34800 | 0 | 107000 | 534240 | 12750 | 8500 | -20900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 126704

Regular: 53.1% wins / 96 games; finals: 25.0% wins / 4 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 99882 | -4980 | -552072 | 0 | -43500 | 0 | 32680 | 427119 | 30000 | 30000 | -24345 | 0 | 0 | 0 | 0 |
| 2 | true | 70300 | 20204 | -575215 | 0 | -43500 | 0 | 50040 | 492093 | 15000 | 20000 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | -92400 | -112400 | -705837 | 0 | -43500 | 0 | 63200 | 493437 | 15000 | 20000 | -5000 | 0 | 0 | 0 | 0 |
| 4 | true | -7732 | -148175 | -448067 | 0 | -43500 | 0 | 73360 | 514500 | 0 | 0 | -11625 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 126704

Regular: 33.3% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 41. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -134009 | -135249 | -567405 | 0 | -52200 | 0 | 33200 | 328125 | 0 | 0 | -25729 | 0 | 0 | 0 | 0 |
| 2 | true | -121660 | -172250 | -328755 | 0 | -52200 | 0 | 37880 | 343424 | 0 | 0 | 12000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 134623

Regular: 58.3% wins / 72 games; finals: 50.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 61. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -83906 | -123820 | -551423 | 0 | -56670 | 0 | 38800 | 418160 | 12750 | 17000 | -2200 | -222537 | -17786 | -20000 | 0 |
| 2 | true | 115696 | -114502 | -396959 | 0 | -58290 | 0 | 47680 | 566979 | 59500 | 17000 | 13000 | -45782 | -3526 | 0 | 0 |
| 3 | true | -63890 | -63890 | -489495 | 0 | -58290 | 0 | 60120 | 472198 | 0 | 0 | 10800 | -158005 | -16914 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 134623

Regular: 34.7% wins / 72 games; finals: 100.0% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 60. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 100585 | -135251 | -510141 | 0 | -67800 | 0 | 34360 | 429198 | 145000 | 30000 | -200 | -133992 | -5840 | -20000 | 0 |
| 2 | true | -52886 | -55006 | -394126 | 0 | -69600 | 0 | 60720 | 432915 | 0 | 0 | 8000 | -180818 | -10562 | 0 | 0 |
| 3 | true | -64813 | -81833 | -386665 | 0 | -69600 | 0 | 57720 | 465938 | 0 | 0 | 5000 | -79000 | -5320 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 134623

Regular: 51.0% wins / 96 games; finals: 60.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 89. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -108153 | -151513 | -528663 | 0 | -52200 | 0 | 38200 | 366114 | 18000 | 24000 | -3000 | -111172 | -9432 | 0 | 0 |
| 2 | true | -40428 | -133985 | -319720 | 0 | -52200 | 0 | 44680 | 391965 | 0 | 0 | 3000 | 0 | 0 | 0 | 0 |
| 3 | true | 176747 | -77590 | -448386 | 0 | -52200 | 0 | 46120 | 482003 | 174000 | 36000 | 4000 | -21988 | -2374 | 0 | 0 |
| 4 | true | -28814 | -46137 | -556652 | 0 | -93902 | 0 | 70600 | 554652 | 18000 | 12000 | 8000 | -166677 | -17582 | -34000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 134623

Regular: 71.7% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 90 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 198766 | 154242 | -495855 | -2320 | -42360 | 0 | 35000 | 388383 | 12750 | 25500 | -11000 | 0 | -3332 | -8000 | 0 |
| 2 | true | 314105 | 163157 | -443383 | -2320 | -53070 | 0 | 48840 | 515038 | 25500 | 17000 | 12000 | 0 | -4266 | 0 | 0 |
| 3 | true | 617822 | 284351 | -435027 | -2320 | -53070 | 0 | 58280 | 609840 | 123250 | 25500 | 1000 | 0 | -23736 | 0 | 0 |
| 4 | true | 654643 | 497511 | -596079 | -2320 | -53070 | 0 | 86720 | 614880 | 59500 | 17000 | -19851 | -63657 | -6302 | 0 | 0 |
| 5 | true | 709151 | 498161 | -713178 | -2320 | -53070 | 0 | 96400 | 614880 | 123250 | 17000 | 3100 | 0 | -31554 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 134623

Regular: 65.8% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 116 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 94389 | 43433 | -515058 | -2320 | -51900 | 0 | 35000 | 406035 | 15000 | 30000 | -11000 | 0 | -3368 | -8000 | 0 |
| 2 | true | 157739 | 54266 | -459466 | -2320 | -63800 | 0 | 48840 | 494918 | 15000 | 20000 | 16000 | 0 | -5822 | 0 | 0 |
| 3 | true | 458110 | 125495 | -449945 | -2320 | -63800 | 0 | 57120 | 605798 | 145000 | 30000 | 1000 | 0 | -22482 | 0 | 0 |
| 4 | true | 515903 | 340679 | -599293 | -2320 | -63800 | 0 | 85560 | 640500 | 70000 | 20000 | -52058 | -35152 | -5644 | 0 | 0 |
| 5 | true | 466976 | 367871 | -686523 | -2320 | -63800 | 0 | 96400 | 556500 | 70000 | 10000 | 3100 | 0 | -32284 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 134623

Regular: 54.2% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 47. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -30233 | -74123 | -582755 | -2320 | -52200 | 0 | 35000 | 399042 | 18000 | 24000 | -11000 | 0 | 0 | -8000 | 0 |
| 2 | true | 27084 | -77205 | -506920 | -2320 | -52200 | 0 | 45240 | 520517 | 36000 | 12000 | 5000 | 0 | 0 | 0 | 0 |
| 3 | true | 73654 | -18490 | -519711 | -2320 | -52200 | 0 | 54880 | 514752 | 36000 | 36000 | -16167 | 0 | -4664 | 0 | 0 |
| 4 | true | 168620 | -33960 | -659317 | -2320 | -52200 | 0 | 65400 | 544803 | 174000 | 12000 | 12600 | 0 | 0 | 0 | 0 |
| 5 | true | 28336 | -51690 | -745671 | -2320 | -75545 | 0 | 82480 | 556500 | 84000 | 12000 | 6100 | -57828 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 134623

Regular: 73.3% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 62 / unreached / unreached; broke: true; weeks in debt: 84. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -65170 | -96320 | -496074 | -21735 | -110490 | 0 | 38800 | 400579 | 12750 | 17000 | -1000 | 0 | 0 | -205000 | 0 |
| 2 | true | 146966 | -118055 | -444570 | -25810 | -110490 | 0 | 48840 | 582916 | 123250 | 17000 | 21000 | 0 | 0 | 0 | 0 |
| 3 | true | 224112 | 1035 | -460610 | -38020 | -110490 | 0 | 76480 | 614880 | 123250 | 25500 | 800 | -39006 | -9638 | -106000 | 0 |
| 4 | true | 110040 | -97238 | -688462 | -56930 | -110490 | 0 | 106880 | 614880 | 123250 | 17000 | 13800 | 0 | 0 | -134000 | 0 |
| 5 | true | -38736 | -129575 | -654651 | -60755 | -110490 | 0 | 113560 | 574560 | 25500 | 8500 | 5000 | 0 | 0 | -50000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 134623

Regular: 51.7% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 84. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -56432 | -92832 | -515388 | -12920 | -127600 | 0 | 38800 | 431676 | 15000 | 20000 | -1000 | 0 | 0 | -105000 | 0 |
| 2 | true | 91852 | -109972 | -463217 | -14210 | -127600 | 0 | 47680 | 596631 | 70000 | 20000 | 19000 | 0 | 0 | 0 | 0 |
| 3 | true | 36300 | -25820 | -466614 | -21385 | -127600 | 0 | 61360 | 496304 | 30000 | 30000 | 800 | -3417 | 0 | -55000 | 0 |
| 4 | true | -86818 | -86818 | -515911 | -23635 | -127600 | 0 | 68280 | 507066 | 0 | 0 | -31318 | 0 | 0 | 0 | 0 |
| 5 | true | -139536 | -141831 | -480129 | -23635 | -127600 | 0 | 66080 | 498666 | 0 | 0 | 13900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 134623

Regular: 47.2% wins / 72 games; finals: 0.0% wins / 2 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 72. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -91078 | -142757 | -542460 | -7490 | -148915 | 0 | 38640 | 441147 | 18000 | 24000 | -1000 | 0 | 0 | -63000 | 0 |
| 2 | true | -41807 | -119519 | -291931 | -7830 | -148915 | 0 | 48840 | 432107 | 0 | 0 | 17000 | 0 | 0 | 0 | 0 |
| 3 | true | -28025 | -76523 | -317876 | -7830 | -148915 | 0 | 46560 | 424673 | 18000 | 24000 | -24830 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 134623

Regular: 62.5% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 94 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 424589 | 187531 | -496074 | 0 | -34800 | 0 | 36040 | 472673 | 123250 | 25500 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 544897 | 396243 | -427315 | 0 | -34800 | 0 | 66240 | 482933 | 12750 | 8500 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 656855 | 515232 | -460807 | 0 | -34800 | 0 | 67000 | 534240 | 12750 | 25500 | -31925 | 0 | 0 | 0 | 0 |
| 4 | true | 647901 | 562351 | -637787 | 0 | -34800 | 0 | 78200 | 574560 | 25500 | 17000 | -31627 | 0 | 0 | 0 | 0 |
| 5 | true | 674640 | 508710 | -732931 | 0 | -34800 | 0 | 84560 | 574560 | 123250 | 17000 | -4900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 134623

Regular: 62.5% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 118 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 165904 | 56488 | -515388 | 0 | -43500 | 0 | 36040 | 430752 | 30000 | 30000 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 397049 | 125107 | -493116 | 0 | -43500 | 0 | 48840 | 539921 | 145000 | 20000 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 527117 | 367605 | -462994 | 0 | -43500 | 0 | 75120 | 556500 | 15000 | 30000 | -40058 | 0 | 0 | 0 | 0 |
| 4 | true | 449409 | 411409 | -660543 | 0 | -43500 | 0 | 85160 | 556500 | 15000 | 20000 | -50325 | 0 | 0 | 0 | 0 |
| 5 | true | 515342 | 277598 | -771487 | 0 | -43500 | 0 | 88320 | 640500 | 145000 | 20000 | -12900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 134623

Regular: 62.5% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 6. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 15558 | -28612 | -582755 | 0 | -52200 | 0 | 36040 | 424473 | 18000 | 24000 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 117041 | -30189 | -504484 | 0 | -52200 | 0 | 47680 | 536487 | 36000 | 24000 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 136105 | 76511 | -526429 | 0 | -52200 | 0 | 58120 | 493973 | 18000 | 24000 | 3600 | 0 | 0 | 0 | 0 |
| 4 | true | 254197 | 11757 | -638132 | 0 | -52200 | 0 | 65320 | 547943 | 174000 | 24000 | -2839 | 0 | 0 | 0 | 0 |
| 5 | true | 179164 | 133924 | -681190 | 0 | -52200 | 0 | 90360 | 556500 | 18000 | 24000 | 5600 | -36103 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 142542

Regular: 74.0% wins / 96 games; finals: 57.1% wins / 7 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 49 / unreached / unreached; broke: true; weeks in debt: 92. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 134816 | -101776 | -514491 | 0 | -59595 | 0 | 38000 | 474848 | 123250 | 25500 | 3000 | -208246 | -14450 | -33000 | 0 |
| 2 | true | -38215 | -46715 | -548676 | 0 | -59595 | 0 | 72880 | 534240 | 12750 | 8500 | 5400 | -179780 | -18750 | 0 | 0 |
| 3 | true | -52596 | -91487 | -587355 | 0 | -59595 | 0 | 76000 | 534240 | 12750 | 17000 | -2500 | -4921 | 0 | 0 | 0 |
| 4 | true | -33751 | -104889 | -610013 | 0 | -59595 | 0 | 83160 | 574560 | 25500 | 8500 | 0 | -3267 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 142542

Regular: 61.5% wins / 96 games; finals: 75.0% wins / 8 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 99 / unreached / unreached; broke: true; weeks in debt: 87. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -61524 | -119310 | -485702 | 0 | -71050 | 0 | 36400 | 390516 | 15000 | 20000 | 10300 | -133658 | -10330 | -33000 | 0 |
| 2 | true | 139678 | -94033 | -374402 | 0 | -71050 | 0 | 44480 | 469487 | 145000 | 20000 | 4500 | -33293 | -3520 | 0 | 0 |
| 3 | true | -26752 | -46752 | -502897 | 0 | -71050 | 0 | 67720 | 556500 | 15000 | 20000 | -2000 | -234299 | -15404 | 0 | 0 |
| 4 | true | 117744 | -121552 | -654374 | 0 | -71050 | 0 | 75920 | 640500 | 145000 | 20000 | -11500 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 142542

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 55. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -144691 | -146011 | -451644 | 0 | -83897 | 0 | 36680 | 318318 | 0 | 0 | 1000 | -72482 | -9666 | -33000 | 0 |
| 2 | true | -134908 | -178536 | -325374 | 0 | -83897 | 0 | 39360 | 369894 | 0 | 0 | 9800 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 142542

Regular: 70.8% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 98 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 200240 | 50330 | -534537 | -2320 | -42360 | 0 | 33000 | 330565 | 123250 | 25500 | -13092 | 0 | -11766 | -8000 | 0 |
| 2 | true | 322464 | 149725 | -482331 | -2320 | -53070 | 0 | 60040 | 569117 | 25500 | 17000 | -10000 | 0 | -1712 | 0 | 0 |
| 3 | true | 467228 | 292772 | -416294 | -2320 | -53070 | 0 | 68640 | 534240 | 12750 | 25500 | 0 | 0 | -24682 | 0 | 0 |
| 4 | true | 658828 | 418084 | -577272 | -2320 | -53070 | 0 | 80040 | 614880 | 123250 | 17000 | -6000 | 0 | -4908 | 0 | 0 |
| 5 | true | 757214 | 540236 | -654602 | -2320 | -53070 | 0 | 105200 | 614880 | 123250 | 17000 | 6600 | -27908 | -30644 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 142542

Regular: 61.1% wins / 72 games; finals: 71.4% wins / 7 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 52. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -12263 | -63383 | -562617 | -2320 | -43500 | 0 | 32200 | 326466 | 30000 | 20000 | -4492 | 0 | 0 | -8000 | 0 |
| 2 | true | -26784 | -119596 | -536024 | -2320 | -43500 | 0 | 37800 | 484523 | 30000 | 10000 | 5000 | 0 | 0 | 0 | 0 |
| 3 | true | 183286 | -72126 | -472757 | -2320 | -43500 | 0 | 47160 | 526565 | 145000 | 20000 | 500 | 0 | -10578 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 142542

Regular: 47.9% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 67. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -72143 | -122909 | -625687 | -2320 | -52200 | 0 | 34840 | 396837 | 18000 | 24000 | -7613 | 0 | 0 | -8000 | 0 |
| 2 | true | -117999 | -122005 | -468704 | -2320 | -52200 | 0 | 49240 | 432128 | 0 | 0 | -4000 | 0 | 0 | 0 | 0 |
| 3 | true | 92953 | -156545 | -359661 | -2320 | -52200 | 0 | 47240 | 502793 | 36000 | 36000 | 3100 | 0 | 0 | 0 | 0 |
| 4 | true | 158650 | 19232 | -459824 | -2320 | -63470 | 0 | 57800 | 526418 | 36000 | 24000 | -13900 | -34321 | -4686 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 142542

Regular: 84.2% wins / 120 games; finals: 81.8% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 56 / unreached / unreached; broke: true; weeks in debt: 83. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -24897 | -56241 | -535653 | -16235 | -109770 | 0 | 40360 | 447230 | 12750 | 17000 | -579 | 0 | 0 | -180000 | 0 |
| 2 | true | 132029 | -93621 | -523450 | -18560 | -110490 | 0 | 55560 | 606816 | 123250 | 17000 | 6800 | 0 | 0 | 0 | 0 |
| 3 | true | 228917 | 1702 | -488687 | -34170 | -110490 | 0 | 84640 | 614880 | 123250 | 25500 | 5600 | -10355 | -22280 | -91000 | 0 |
| 4 | true | -64967 | -79361 | -662799 | -54305 | -110490 | 0 | 112320 | 534240 | 12750 | 8500 | 9900 | 0 | 0 | -144000 | 0 |
| 5 | true | 85057 | -137680 | -559481 | -54955 | -110490 | 0 | 111320 | 614880 | 123250 | 17000 | 8500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 142542

Regular: 65.8% wins / 120 games; finals: 90.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 75 / unreached / unreached; broke: true; weeks in debt: 47. Opening players gaining a star: 14/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 136725 | -119655 | -562860 | -12920 | -126800 | 0 | 39240 | 533148 | 145000 | 30000 | -3083 | 0 | 0 | -105000 | 0 |
| 2 | true | 236243 | 1313 | -537370 | -19155 | -127600 | 0 | 72440 | 640500 | 145000 | 20000 | 8050 | -11347 | 0 | -91000 | 0 |
| 3 | true | 32250 | -16190 | -559990 | -41340 | -127600 | 0 | 99760 | 556500 | 15000 | 30000 | 5000 | -42323 | 0 | -139000 | 0 |
| 4 | true | 124229 | -131343 | -659791 | -42630 | -127600 | 0 | 109800 | 640500 | 145000 | 20000 | 6700 | 0 | 0 | 0 | 0 |
| 5 | true | -59253 | -59253 | -562212 | -48430 | -127600 | 0 | 115160 | 514500 | 0 | 0 | 5100 | 0 | 0 | -80000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 142542

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -172771 | -174331 | -516264 | -7490 | -147995 | 0 | 40760 | 362418 | 0 | 0 | 8800 | 0 | 0 | -63000 | 0 |
| 2 | true | -191033 | -211020 | -280751 | -7830 | -148915 | 0 | 43720 | 374514 | 0 | 0 | 1000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 142542

Regular: 70.0% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 130 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 352583 | 120308 | -539673 | 0 | -34800 | 0 | 32200 | 450011 | 123250 | 25500 | -3905 | 0 | 0 | 0 | 0 |
| 2 | true | 428865 | 301331 | -516374 | 0 | -34800 | 0 | 62040 | 531166 | 12750 | 17000 | 4500 | 0 | 0 | 0 | 0 |
| 3 | true | 595230 | 387647 | -490588 | 0 | -34800 | 0 | 69120 | 571133 | 25500 | 25500 | 500 | 0 | 0 | 0 | 0 |
| 4 | true | 777973 | 539323 | -608167 | 0 | -34800 | 0 | 79080 | 614880 | 123250 | 17000 | -8500 | 0 | 0 | 0 | 0 |
| 5 | true | 947791 | 725183 | -646272 | 0 | -34800 | 0 | 107160 | 614880 | 123250 | 17000 | -11400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 142542

Regular: 41.7% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 36. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -91378 | -92458 | -560832 | 0 | -43500 | 0 | 31920 | 300657 | 0 | 0 | -19623 | 0 | 0 | 0 | 0 |
| 2 | true | -135856 | -140959 | -319785 | 0 | -43500 | 0 | 30720 | 286587 | 0 | 0 | 1500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 142542

Regular: 25.0% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 76. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -127712 | -170792 | -582053 | 0 | -52200 | 0 | 32040 | 320754 | 18000 | 24000 | -38253 | 0 | 0 | 0 | 0 |
| 2 | true | -121531 | -156620 | -268638 | 0 | -52200 | 0 | 33680 | 293339 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | true | -209490 | -209490 | -326409 | 0 | -52200 | 0 | 28520 | 259130 | 0 | 0 | 3000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 150461

Regular: 84.2% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 57 / unreached / unreached; broke: true; weeks in debt: 113. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -28355 | -116344 | -534257 | 0 | -58290 | 0 | 35600 | 455917 | 25500 | 17000 | -3200 | -232013 | -14612 | -20000 | 0 |
| 2 | true | 145998 | -71847 | -463358 | 0 | -58290 | 0 | 44080 | 557827 | 123250 | 17000 | 9400 | -52500 | -3056 | 0 | 0 |
| 3 | true | 166653 | -64985 | -604404 | 0 | -58290 | 0 | 70920 | 614880 | 123250 | 25500 | -1400 | -136521 | -13280 | 0 | 0 |
| 4 | true | 113204 | -67447 | -664342 | 0 | -58290 | 0 | 96560 | 614880 | 123250 | 17000 | 500 | -172911 | -10096 | 0 | 0 |
| 5 | true | -61405 | -125057 | -764703 | 0 | -58290 | 0 | 114640 | 574560 | 25500 | 8500 | 16500 | -89570 | -1746 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 150461

Regular: 54.2% wins / 48 games; finals: 0.0% wins / 2 games; finals share: 100.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 52. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -126868 | -153188 | -501814 | 0 | -69600 | 0 | 36640 | 359163 | 15000 | 10000 | -2000 | -142313 | -11944 | -20000 | 0 |
| 2 | true | 6336 | -161521 | -323748 | 0 | -69600 | 0 | 42440 | 475367 | 15000 | 10000 | -5900 | -10355 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 150461

Regular: 25.0% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 57. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -170284 | -171524 | -473692 | 0 | -83897 | 0 | 35840 | 328839 | 0 | 0 | 0 | -86092 | -8282 | -33000 | 0 |
| 2 | true | -210880 | -210880 | -258787 | 0 | -83897 | 0 | 29800 | 273788 | 0 | 0 | -1500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 150461

Regular: 60.8% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 88 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 169551 | 129941 | -489907 | -2320 | -42360 | 0 | 37680 | 343204 | 12750 | 25500 | 0 | 0 | -6996 | -8000 | 0 |
| 2 | true | 251189 | 131060 | -423623 | -2320 | -53070 | 0 | 47960 | 487267 | 12750 | 17000 | 2000 | 0 | -6326 | 0 | 0 |
| 3 | true | 514297 | 218373 | -414467 | -2320 | -53070 | 0 | 60040 | 603833 | 59500 | 25500 | 1600 | 0 | -17508 | 0 | 0 |
| 4 | true | 320926 | 288206 | -564898 | -2320 | -53070 | 0 | 78600 | 534240 | 12750 | 17000 | -41417 | -165700 | -8556 | 0 | 0 |
| 5 | true | 267543 | 190555 | -673199 | -2320 | -53070 | 0 | 87080 | 574560 | 25500 | 17000 | -4000 | 0 | -24934 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 150461

Regular: 55.0% wins / 120 games; finals: 66.7% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 41637 | 5277 | -509672 | -2320 | -51900 | 0 | 37680 | 348033 | 15000 | 20000 | 0 | 0 | -7184 | -8000 | 0 |
| 2 | true | 209515 | -728 | -436525 | -2320 | -63800 | 0 | 45640 | 465129 | 145000 | 20000 | 1000 | 0 | -6246 | 0 | 0 |
| 3 | true | 331108 | 150976 | -449907 | -2320 | -63800 | 0 | 70680 | 556290 | 15000 | 30000 | 10000 | -23040 | -21310 | 0 | 0 |
| 4 | true | 493557 | 227797 | -531771 | -2320 | -63800 | 0 | 78240 | 640500 | 145000 | 20000 | -55248 | -60258 | -7894 | 0 | 0 |
| 5 | true | 429494 | 390894 | -625352 | -2320 | -63800 | 0 | 100960 | 556500 | 15000 | 20000 | -6000 | -38131 | -20920 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 150461

Regular: 18.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 38. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -114583 | -115943 | -569821 | -2320 | -52200 | 0 | 37680 | 330078 | 0 | 0 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | -154588 | -155908 | -308406 | -2320 | -52200 | 0 | 37120 | 283301 | 0 | 0 | 2500 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 150461

Regular: 80.0% wins / 120 games; finals: 100.0% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 56 / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 147741 | -80795 | -490303 | -21735 | -110490 | 0 | 36720 | 493799 | 123250 | 25500 | -4000 | 0 | 0 | -205000 | 0 |
| 2 | true | 203101 | -11907 | -453248 | -31340 | -110490 | 0 | 68400 | 614880 | 123250 | 17000 | -36750 | 0 | -6342 | -130000 | 0 |
| 3 | true | 195939 | -39965 | -492310 | -54430 | -110490 | 0 | 99840 | 614880 | 123250 | 25500 | -41123 | -62279 | 0 | -110000 | 0 |
| 4 | true | 88316 | -101912 | -686249 | -62930 | -110490 | 0 | 115320 | 614880 | 123250 | 17000 | 5600 | 0 | -4004 | -120000 | 0 |
| 5 | true | 71302 | -137446 | -720964 | -62930 | -110490 | 0 | 114840 | 614880 | 123250 | 17000 | 7400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 150461

Regular: 39.6% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 46. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -152990 | -164390 | -494864 | -12920 | -127600 | 0 | 36800 | 342594 | 0 | 10000 | -2000 | 0 | 0 | -105000 | 0 |
| 2 | true | -140699 | -185198 | -272921 | -14210 | -127600 | 0 | 43440 | 380982 | 0 | 0 | 2600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 150461

Regular: 40.3% wins / 72 games; finals: 66.7% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 45. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 7957 | -154096 | -511520 | -7490 | -148915 | 0 | 36800 | 446082 | 84000 | 24000 | -2000 | 0 | 0 | -63000 | 0 |
| 2 | true | -12181 | -23687 | -283539 | -10610 | -148915 | 0 | 52000 | 428526 | 0 | 0 | 14400 | 0 | 0 | -72000 | 0 |
| 3 | true | -57184 | -57184 | -344167 | -16385 | -148915 | 0 | 52160 | 403704 | 0 | 0 | 8600 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 150461

Regular: 69.2% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 106 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 269024 | 179568 | -490303 | 0 | -34800 | 0 | 32080 | 424047 | 25500 | 25500 | -13000 | 0 | 0 | 0 | 0 |
| 2 | true | 446912 | 174496 | -455628 | 0 | -34800 | 0 | 46320 | 543946 | 123250 | 17000 | -62200 | 0 | 0 | 0 | 0 |
| 3 | true | 772056 | 415534 | -421976 | 0 | -34800 | 0 | 73040 | 614880 | 59500 | 25500 | 9000 | 0 | 0 | 0 | 0 |
| 4 | true | 867117 | 733580 | -522648 | 0 | -34800 | 0 | 87080 | 574560 | 25500 | 17000 | -51631 | 0 | 0 | 0 | 0 |
| 5 | true | 1098851 | 822140 | -582256 | 0 | -34800 | 0 | 95160 | 614880 | 123250 | 17000 | -1500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 150461

Regular: 43.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 30. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -13197 | -14317 | -510748 | 0 | -43500 | 0 | 32080 | 313971 | 0 | 0 | -5000 | 0 | 0 | 0 | 0 |
| 2 | true | -85317 | -86677 | -412474 | 0 | -43500 | 0 | 36240 | 343014 | 0 | 0 | 4600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 150461

Regular: 52.1% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 38. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -70410 | -113610 | -569821 | 0 | -52200 | 0 | 32160 | 332451 | 18000 | 24000 | -5000 | 0 | 0 | 0 | 0 |
| 2 | true | -117758 | -118998 | -385891 | 0 | -52200 | 0 | 38000 | 356643 | 0 | 0 | -3900 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 158380

Regular: 70.8% wins / 96 games; finals: 42.9% wins / 7 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 56 / unreached / unreached; broke: true; weeks in debt: 98. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -23312 | -115568 | -516830 | 0 | -58290 | 0 | 35160 | 424247 | 25500 | 17000 | 7000 | -220705 | -16394 | -20000 | 0 |
| 2 | true | -14686 | -67793 | -457063 | 0 | -58290 | 0 | 47480 | 470424 | 12750 | 8500 | 1500 | -16675 | 0 | 0 | 0 |
| 3 | true | 1344 | -68087 | -556460 | 0 | -58290 | 0 | 54360 | 542465 | 25500 | 17000 | 17900 | -22719 | -3726 | 0 | 0 |
| 4 | true | -31006 | -49748 | -580254 | 0 | -58290 | 0 | 62600 | 567675 | 25500 | 8500 | 7000 | -65081 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 158380

Regular: 47.2% wins / 72 games; finals: 66.7% wins / 6 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 71. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -107750 | -144070 | -491325 | 0 | -69600 | 0 | 35880 | 360885 | 15000 | 20000 | -4000 | -153092 | -10498 | -11000 | 0 |
| 2 | true | 163791 | -140059 | -335460 | 0 | -69600 | 0 | 42560 | 499391 | 145000 | 20000 | -3200 | -18150 | 0 | -9000 | 0 |
| 3 | true | -69689 | -82245 | -590226 | 0 | -69600 | 0 | 67280 | 507612 | 30000 | 0 | 800 | -169032 | -10314 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 158380

Regular: 18.8% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 53. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -220951 | -222191 | -492504 | 0 | -83897 | 0 | 35520 | 272181 | 0 | 0 | -4000 | -90027 | -8224 | 0 | 0 |
| 2 | true | -337183 | -338263 | -341102 | 0 | -83897 | 0 | 30880 | 276087 | 0 | 0 | 1800 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 158380

Regular: 65.0% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 65 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 203645 | 159433 | -492676 | -2320 | -42360 | 0 | 35080 | 375943 | 12750 | 25500 | 5000 | 0 | -5272 | -8000 | 0 |
| 2 | true | 384136 | 155246 | -454372 | -2320 | -53070 | 0 | 46160 | 556769 | 123250 | 17000 | -48058 | 0 | -4868 | 0 | 0 |
| 3 | true | 397154 | 338721 | -539831 | -2320 | -53070 | 0 | 73800 | 532567 | 12750 | 25500 | -13000 | 0 | -23378 | 0 | 0 |
| 4 | true | 297402 | 264492 | -689314 | -2320 | -53070 | 0 | 85880 | 534240 | 12750 | 17000 | 7000 | 0 | -11918 | 0 | 0 |
| 5 | true | 102068 | 32154 | -768111 | -2320 | -53070 | 0 | 93440 | 574560 | 25500 | 17000 | -51919 | 0 | -30414 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 158380

Regular: 39.6% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 31. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -10785 | -21945 | -511432 | -2320 | -51900 | 0 | 34520 | 322665 | 0 | 10000 | 1000 | 0 | -5318 | -8000 | 0 |
| 2 | true | -141698 | -142978 | -447221 | -2320 | -63800 | 0 | 36400 | 333428 | 0 | 0 | 12600 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 158380

Regular: 41.7% wins / 48 games; finals: 0.0% wins / 1 games; finals share: 50.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -97764 | -99044 | -560280 | -2320 | -52200 | 0 | 37080 | 340956 | 0 | 0 | -3000 | 0 | 0 | -8000 | 0 |
| 2 | true | -58217 | -138454 | -339192 | -2320 | -52200 | 0 | 37120 | 352139 | 18000 | 12000 | 14000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 158380

Regular: 83.3% wins / 120 games; finals: 93.3% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 49 / unreached / unreached; broke: true; weeks in debt: 50. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 135839 | -94679 | -492304 | -18215 | -110490 | 0 | 35880 | 478618 | 123250 | 25500 | 9600 | 0 | 0 | -216000 | 0 |
| 2 | true | 239166 | 348 | -468567 | -33880 | -110490 | 0 | 66440 | 614880 | 123250 | 25500 | 3600 | 0 | -8406 | -109000 | 0 |
| 3 | true | 224820 | 7676 | -522098 | -60180 | -110490 | 0 | 96200 | 614880 | 123250 | 25500 | 7300 | 0 | -18708 | -170000 | 0 |
| 4 | true | 92357 | -103380 | -716548 | -66555 | -110490 | 0 | 116000 | 614880 | 123250 | 17000 | 10000 | 0 | 0 | -120000 | 0 |
| 5 | true | 61962 | -136466 | -724440 | -66555 | -110490 | 0 | 115160 | 614880 | 123250 | 17000 | 800 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 158380

Regular: 50.0% wins / 72 games; finals: 57.1% wins / 7 games; finals share: 100.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 73. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -76930 | -118210 | -511328 | -12920 | -127600 | 0 | 35880 | 396438 | 30000 | 10000 | 7600 | 0 | 0 | -105000 | 0 |
| 2 | true | -76170 | -130491 | -321443 | -14210 | -127600 | 0 | 41520 | 378693 | 30000 | 10000 | 3800 | 0 | 0 | 0 | 0 |
| 3 | true | 72426 | -115677 | -307028 | -14210 | -127600 | 0 | 44360 | 459974 | 70000 | 20000 | 3100 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 158380

Regular: 29.2% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 51. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -192270 | -193510 | -486306 | -7490 | -148915 | 0 | 35360 | 320481 | 0 | 0 | 7600 | 0 | 0 | -63000 | 0 |
| 2 | true | -291881 | -293081 | -300496 | -7830 | -148915 | 0 | 33640 | 318990 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 158380

Regular: 61.7% wins / 120 games; finals: 92.9% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 78 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 351839 | 169909 | -492304 | 0 | -34800 | 0 | 37240 | 392453 | 123250 | 17000 | 9000 | 0 | 0 | 0 | 0 |
| 2 | true | 627235 | 316294 | -450953 | 0 | -34800 | 0 | 62920 | 608882 | 123250 | 17000 | -50903 | 0 | 0 | 0 | 0 |
| 3 | true | 776825 | 586459 | -526810 | 0 | -34800 | 0 | 92640 | 574560 | 25500 | 25500 | -7000 | 0 | 0 | 0 | 0 |
| 4 | true | 835126 | 624596 | -767469 | 0 | -34800 | 0 | 106440 | 614880 | 123250 | 17000 | -1000 | 0 | 0 | 0 | 0 |
| 5 | true | 805020 | 605394 | -828441 | 0 | -34800 | 0 | 114680 | 614880 | 123250 | 17000 | -36675 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 158380

Regular: 55.8% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 126 / unreached / unreached; broke: true; weeks in debt: 8. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 95219 | 58859 | -511328 | 0 | -43500 | 0 | 37240 | 366807 | 15000 | 20000 | 11000 | 0 | 0 | 0 | 0 |
| 2 | true | 20172 | -31428 | -509863 | 0 | -43500 | 0 | 45520 | 395157 | 30000 | 20000 | -12361 | 0 | 0 | 0 | 0 |
| 3 | true | 275538 | -31286 | -542977 | 0 | -43500 | 0 | 56120 | 597723 | 145000 | 30000 | 13000 | 0 | 0 | 0 | 0 |
| 4 | true | 402539 | 219199 | -648039 | 0 | -43500 | 0 | 89040 | 640500 | 70000 | 20000 | -1000 | 0 | 0 | 0 | 0 |
| 5 | true | 470659 | 311903 | -691111 | 0 | -43500 | 0 | 102160 | 640500 | 70000 | 20000 | -29929 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 158380

Regular: 27.1% wins / 48 games; finals: n/a wins / 0 games; finals share: 0.0% / 2 completed seasons. Weeks: 58; to 70/80/90: unreached / unreached / unreached; broke: true; weeks in debt: 37. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | -107464 | -108744 | -560280 | 0 | -52200 | 0 | 35520 | 314496 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |
| 2 | true | -118373 | -156900 | -322213 | 0 | -52200 | 0 | 34440 | 319064 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 2; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.

