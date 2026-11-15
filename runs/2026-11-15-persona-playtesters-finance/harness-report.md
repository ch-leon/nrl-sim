# AI persona career report

Rule-based measurement only. Seed/config/difficulty/pack identify each career in JSON. Elapsed weeks include trials. Best-nine mean includes recruitment; it is not an individual training curve. Unreached thresholds are censored, not zero. Star and potential weeks are for the players who started the career. A star week is the first week that player's star rating went up. Potential weeks exclude anyone who was already at their potential stars.

Match clock: 2 halves of 2.5 minutes, 5 minutes of match time in total. Verified from `fullMatch()` (`src/match/league/rules.ts`), which reads `rules.halfMinutes` (2.5) and is passed into every persona `runMatch`. 40/20 is on. FIELD_LENGTH is 80m from bootFieldLength() in src/match/fieldSettings.ts. Headless Node treats the process as a worker and reads globalThis.name (match-skip--field-80). The only names that select 80m or 60m are match-skip|background|replay|art--field-80|60 (src/labs/fieldLength.ts). Experiments can store 100, 80 or 60 in the browser and reload; runMatch has no field-length argument.

Cash and the salary cap are separate. cap_used, cap_limit, cap_next and cap_protected are the season commitments; the cash_ columns are the bank. Salaries, upkeep and overhead do not leave the bank. A signing takes the annual fee and cap room; a renewal is free and queued; a release pays the payout or is refused. Careers start on the current save and round-trip through the production importer. A save from before this finance format is refused and kept. Potential stars are visible on every player; there is no separate scout-fog concealment. The Scout Office still changes the free-agent pool and the signing fee, and the min-maxer builds one. Watchability work is how the match is drawn; these runs play the same headless live sim and do not render it.

Balance flags, not failures: money looks easy when a completed season ends more than $150,000 above the opening cash and nobody goes into debt; money looks hard when completed seasons end below zero; a solvency sacking in at least a quarter of careers is flagged on its own. Cash is climbing fast above $5,000 a week. Ceilings are early when more than 20% of a season-1 squad cannot take another point. XP is steep when the median star arrives in under 8 weeks, and flat when fewer than 25% of opening players gain a star in a run of three or more seasons. Broke means a bankruptcy warning (the balance went below zero; a forced sale is counted on that same warning) or a sacking for a missed solvency objective. A debt week is a week that ended below zero, which is what raises the warning.

The diary splits XP into training and match. That split is an estimate rebuilt from the sheets and the weekly formula. It can fall short of XP gained when an event or a facility built the same week adds XP the estimate does not see. XP gained is the observed change.

| Persona / difficulty / pack | Runs | Regular wins / games | Final wins / games | Finals share (completed seasons) | Premierships | Mean ladder | Broke rate | End-season cash | Min cash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| careless/easy/au | 20 | 69.6% / 2400 | 75.7% / 218 | 95.0% / 100 | 42 | 2.1 | 0.0% | 459972 | 19 |
| careless/normal/au | 20 | 56.5% / 2232 | 62.0% / 150 | 79.6% / 93 | 18 | 4.8 | 0.0% | 321972 | 0 |
| careless/hard/au | 20 | 48.3% / 1944 | 59.6% / 104 | 63.0% / 81 | 10 | 7.2 | 0.0% | 207204 | 2 |
| casual-weekly/easy/au | 20 | 64.0% / 2400 | 63.7% / 193 | 94.0% / 100 | 25 | 2.7 | 0.0% | 1694251 | 82000 |
| casual-weekly/normal/au | 20 | 53.0% / 2232 | 65.7% / 140 | 71.0% / 93 | 20 | 5.6 | 0.0% | 1497802 | 52000 |
| casual-weekly/hard/au | 20 | 46.2% / 1944 | 54.3% / 81 | 51.9% / 81 | 6 | 8.0 | 0.0% | 1220779 | 44500 |
| min-maxer/easy/au | 20 | 80.4% / 2400 | 80.9% / 251 | 100.0% / 100 | 53 | 1.2 | 0.0% | 1142183 | 27829 |
| min-maxer/normal/au | 20 | 65.3% / 2352 | 71.3% / 209 | 93.9% / 98 | 32 | 2.7 | 0.0% | 876041 | 33273 |
| min-maxer/hard/au | 20 | 53.3% / 2112 | 58.1% / 117 | 70.5% / 88 | 13 | 5.8 | 0.0% | 434520 | 29925 |
| newcomer/easy/au | 20 | 50.9% / 2232 | 60.3% / 121 | 65.6% / 93 | 13 | 6.7 | 0.0% | 1554349 | 90000 |
| newcomer/normal/au | 20 | 42.4% / 1992 | 64.3% / 84 | 50.6% / 83 | 12 | 8.8 | 0.0% | 1358631 | 60000 |
| newcomer/hard/au | 20 | 36.1% / 1752 | 25.0% / 28 | 30.1% / 73 | 1 | 11.1 | 0.0% | 992129 | 45000 |

## Baseline warnings

Compared 0 matching endpoints. Baseline differences are warnings only. A different field length or half length does not match the checked baseline.

- No matching baseline endpoints: use the documented baseline command for this pack/config/seed/horizon.

## Progression, finance and health

### careless/easy/au

- 70 overall (best nine, including recruitment): 62.1 weeks; 20 reached, 0 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 99 of 400; median 20.0 weeks among those who did.
- Reaching potential stars: 176 of 400 (100 already there at week 0); median 21.5 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/170; S3 0/0; S5 0/0.
- Mean XP per completed season 20788; mean level-ups per completed season 196.9.
- Cash: opening 90000; mean weekly change 4801; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 100; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $460k after opening at $90k, and no career went into debt.
- WARNING: XP looks flat. Only 24.8% of opening players gained a star.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 63728 |
| gate | 527509 |
| prize | 65833 |
| boardGrant | 11390 |
| events | -1111 |
| transfers | -501340 |
| contracts | -22468 |
| facilities | -4300 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 1 speed 1 | $72k | -$18k | 825 | 2 | 53.8 | W 4-0 Dubbo Diggers |
| S1 trial 2 | footyIQ | 5 speed 1, stamina 1, footyIQ 3 | $51k | -$21k | 780 | 7 | 54.1 | D 6-6 Wagga Swagmen |
| S1 W1 | handling | 3 handling 1, footyIQ 2 | $28k | -$23k | 824 | 6 | 54.8 | W 14-6 Launceston Larrikins |
| S1 W2 | stamina | 3 strength 1, handling 2 | $12k | -$16k | 862 | 10 | 54.8 | W 19-10 Darwin Drovers |
| S1 W3 | kicking | 16 speed 5, stamina 3, kicking 2, footyIQ 6 | $42k | $30k | 911 | 6 | 54.9 | W 20-12 Southport Stingrays |
| S1 W4 | strength | 4 speed 1, strength 2, stamina 1 | $15k | -$27k | 809 | 8 | 55.0 | L 6-10 Broken Hill Brollys |
| S1 W5 | strength | 10 speed 4, strength 1, stamina 1, handling 2, footyIQ 2 | $30k | $15k | 926 | 11 | 54.5 | W 14-6 Geelong Gulls |
| S1 W6 | strength | 9 speed 3, strength 2, stamina 1, handling 2, kicking 1 | $6.9k | -$23k | 878 | 10 | 55.5 | D 10-10 Wagga Swagmen |
| S1 W7 | speed | 4 speed 1, footyIQ 3 | $35k | $28k | 775 | 5 | 55.5 | L 0-16 Katherine Crocs |
| S1 W8 | handling | 4 speed 2, footyIQ 2 | $17k | -$17k | 861 | 9 | 55.6 | W 15-8 Shellharbour Scorpions |
| S1 W9 | footyIQ | 3 speed 1, footyIQ 2 | $26k | $8.5k | 751 | 5 | 55.5 | L 4-11 Dubbo Diggers |
| S1 W10 | strength | 15 speed 3, strength 1, stamina 6, handling 2, footyIQ 3 | $3.4k | -$23k | 736 | 7 | 55.9 | W 21-4 Mackay Marlins |
| S1 W11 | kicking | 5 speed 1, stamina 2, handling 2 | $29k | $25k | 746 | 7 | 55.9 | W 4-0 Ballarat Bushrangers |
| S1 W12 | kicking | 12 speed 3, strength 3, stamina 3, footyIQ 3 | $13k | -$16k | 727 | 8 | 55.8 | W 10-0 Cairns Cyclones |
| S1 W13 | kicking | 4 speed 2, strength 2 | $47k | $35k | 775 | 9 | 55.8 | W 19-4 Toowoomba Thunder |
| S1 W14 | strength | 11 speed 1, strength 1, handling 4, kicking 1, footyIQ 4 | $27k | -$20k | 838 | 6 | 56.0 | W 16-14 Woolloomooloo Wolves |
| S1 W15 | kicking | 10 speed 4, strength 4, stamina 1, handling 1 | $44k | $16k | 824 | 8 | 56.2 | W 10-4 Redcliffe Reapers |
| S1 W16 | kicking | 8 speed 1, strength 1, stamina 3, handling 1, footyIQ 2 | $45k | $1.2k | 780 | 8 | 56.2 | D 0-0 Launceston Larrikins |
| S1 W17 | handling | 9 speed 1, strength 1, stamina 3, handling 1, footyIQ 3 | $72k | $27k | 858 | 9 | 56.6 | W 16-2 Darwin Drovers |
| S1 W18 | handling | 9 speed 2, handling 1, kicking 1, footyIQ 5 | $56k | -$16k | 791 | 8 | 56.5 | L 10-13 Southport Stingrays |
| S1 W19 | speed | 6 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $82k | $26k | 826 | 8 | 56.9 | D 4-4 Broken Hill Brollys |
| S1 W20 | kicking | 4 strength 1, handling 1, footyIQ 2 | $67k | -$15k | 848 | 7 | 56.5 | W 10-0 Geelong Gulls |
| S1 W21 | strength | 7 speed 5, strength 1, footyIQ 1 | $93k | $26k | 848 | 10 | 56.9 | W 16-6 Wagga Swagmen |
| S1 W22 | strength | 4 speed 2, stamina 1, footyIQ 1 | $68k | -$25k | 761 | 8 | 57.1 | L 4-10 Katherine Crocs |
| S1 W23 | strength | 22 speed 6, strength 2, stamina 6, handling 7, footyIQ 1 | $68k | -$640 | 819 | 10 | 57.3 | W 14-4 Shellharbour Scorpions |
| S1 W24 | footyIQ | 7 speed 2, handling 3, kicking 1, footyIQ 1 | $51k | -$17k | 928 | 7 | 57.3 | W 28-7 Dubbo Diggers |
| S1 W25 final | footyIQ | 5 speed 1, stamina 1, handling 2, kicking 1 | $75k | $24k | 900 | 7 | 57.2 | W 22-18 Ballarat Bushrangers |
| S1 W26 final | stamina | 10 speed 3, strength 1, stamina 1, handling 1, footyIQ 4 | $114k | $39k | 816 | 9 | 57.5 | L 6-10 Katherine Crocs |
| S1 W27 final | footyIQ | 3 speed 1, handling 1, kicking 1 | $141k | $27k | 159 | 1 | 58.9 | no match |
| S2 trial 1 | stamina | 2 speed 1, footyIQ 1 | $117k | -$24k | 732 | 6 | 59.3 | W 16-8 Darwin Drovers |
| S2 trial 2 | footyIQ | 11 speed 4, strength 1, handling 2, kicking 1, footyIQ 3 | $101k | -$16k | 717 | 7 | 59.8 | W 14-11 Shellharbour Scorpions |
| S2 W1 | kicking | 10 speed 2, strength 3, stamina 1, handling 1, kicking 1, footyIQ 2 | $108k | $6.8k | 710 | 9 | 60.1 | D 13-13 Launceston Larrikins |
| S2 W2 | strength | 5 speed 1, strength 1, handling 1, footyIQ 2 | $88k | -$20k | 773 | 8 | 60.1 | L 8-9 Darwin Drovers |
| S2 W3 | speed | 5 speed 2, strength 1, handling 1, footyIQ 1 | $90k | $1.9k | 788 | 4 | 60.6 | W 15-12 Southport Stingrays |
| S2 W4 | speed | 3 speed 2, footyIQ 1 | $66k | -$24k | 807 | 10 | 60.8 | D 6-6 Broken Hill Brollys |
| S2 W5 | handling | 8 speed 1, strength 3, handling 1, kicking 1, footyIQ 2 | $79k | $13k | 831 | 8 | 61.7 | W 12-8 Geelong Gulls |
| S2 W6 | strength | 3 speed 1, stamina 1, handling 1 | $58k | -$21k | 870 | 7 | 61.8 | W 12-4 Wagga Swagmen |
| S2 W7 | kicking | 13 speed 5, strength 2, stamina 3, footyIQ 3 | $77k | $20k | 898 | 10 | 61.7 | W 14-13 Katherine Crocs |
| S2 W8 | footyIQ | 7 speed 2, strength 2, stamina 1, footyIQ 2 | $60k | -$17k | 848 | 7 | 61.5 | W 4-0 Shellharbour Scorpions |
| S2 W9 | strength | 3 stamina 3 | $72k | $12k | 1035 | 9 | 61.6 | W 28-12 Dubbo Diggers |
| S2 W10 | speed | 21 speed 4, strength 4, stamina 1, handling 7, kicking 3, footyIQ 2 | $53k | -$19k | 798 | 8 | 61.7 | L 0-4 Mackay Marlins |
| S2 W11 | strength | 11 speed 2, strength 4, stamina 1, handling 1, footyIQ 3 | $72k | $19k | 855 | 10 | 62.0 | W 16-4 Ballarat Bushrangers |
| S2 W12 | handling | 10 speed 5, handling 1, kicking 1, footyIQ 3 | $44k | -$28k | 938 | 10 | 62.1 | W 17-4 Cairns Cyclones |
| S2 W13 | stamina | 4 stamina 2, footyIQ 2 | $56k | $12k | 909 | 6 | 62.4 | W 16-10 Toowoomba Thunder |
| S2 W14 | strength | 7 speed 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $29k | -$27k | 933 | 8 | 63.0 | W 22-12 Woolloomooloo Wolves |
| S2 W15 | handling | 6 speed 2, strength 1, handling 2, footyIQ 1 | $51k | $22k | 845 | 8 | 62.7 | L 4-6 Redcliffe Reapers |
| S2 W16 | kicking | 9 speed 1, strength 3, stamina 3, footyIQ 2 | $34k | -$17k | 893 | 10 | 62.5 | W 12-8 Launceston Larrikins |
| S2 W17 | footyIQ | 5 speed 2, strength 1, footyIQ 2 | $41k | $6.6k | 887 | 7 | 62.7 | W 17-16 Darwin Drovers |
| S2 W18 | handling | 10 strength 5, stamina 2, footyIQ 3 | $26k | -$15k | 889 | 8 | 62.8 | W 12-4 Southport Stingrays |
| S2 W19 | kicking | 5 speed 1, strength 3, kicking 1 | $44k | $18k | 922 | 8 | 62.8 | W 18-0 Broken Hill Brollys |
| S2 W20 | handling | 7 speed 1, strength 1, stamina 2, handling 1, footyIQ 2 | $29k | -$15k | 916 | 13 | 62.9 | W 14-4 Geelong Gulls |
| S2 W21 | strength | 12 speed 3, strength 2, handling 3, kicking 1, footyIQ 3 | $56k | $27k | 922 | 8 | 62.2 | W 10-6 Wagga Swagmen |
| S2 W22 | stamina | 22 speed 2, strength 5, stamina 5, handling 3, kicking 2, footyIQ 5 | $57k | $1.5k | 985 | 12 | 62.4 | W 27-0 Katherine Crocs |
| S2 W23 | strength | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $96k | $38k | 1010 | 6 | 62.4 | W 33-0 Shellharbour Scorpions |
| S2 W24 | strength | 4 speed 1, strength 1, footyIQ 2 | $97k | $1.5k | 941 | 12 | 62.5 | W 21-6 Dubbo Diggers |
| S2 W25 final | handling | 16 speed 3, strength 3, stamina 6, footyIQ 4 | $139k | $41k | 959 | 9 | 63.4 | W 26-10 Cairns Cyclones |
| S2 W26 final | speed | 4 speed 1, stamina 2, handling 1 | $166k | $27k | 846 | 8 | 62.7 | L 4-9 Woolloomooloo Wolves |
| S2 W27 final | stamina | 5 speed 2, stamina 1, footyIQ 2 | $201k | $35k | 69 | 1 | 75.4 | no match |
| S3 trial 1 | kicking | 3 strength 1, kicking 2 | $171k | -$30k | 785 | 4 | 49.3 | L 6-14 Redcliffe Reapers |
| S3 trial 2 | stamina | 3 speed 2, handling 1 | $152k | -$20k | 956 | 10 | 50.7 | W 14-6 Mackay Marlins |
| S3 W1 | strength | 10 speed 2, strength 3, stamina 3, footyIQ 2 | $156k | $4.8k | 892 | 10 | 52.0 | W 8-0 Launceston Larrikins |
| S3 W2 | footyIQ | 6 speed 1, stamina 4, handling 1 | $127k | -$29k | 867 | 7 | 53.0 | W 10-4 Darwin Drovers |
| S3 W3 | footyIQ | 8 speed 2, strength 3, stamina 1, handling 1, footyIQ 1 | $138k | $11k | 792 | 9 | 55.3 | L 4-6 Southport Stingrays |
| S3 W4 | kicking | 6 speed 1, stamina 1, handling 1, footyIQ 3 | $117k | -$21k | 944 | 9 | 55.8 | W 26-12 Broken Hill Brollys |
| S3 W5 | stamina | 16 speed 3, strength 1, stamina 1, handling 2, kicking 5, footyIQ 4 | $131k | $15k | 887 | 9 | 56.4 | W 22-2 Geelong Gulls |
| S3 W6 | handling | 5 speed 2, handling 1, kicking 1, footyIQ 1 | $114k | -$17k | 778 | 7 | 56.5 | L 0-6 Wagga Swagmen |
| S3 W7 | footyIQ | 12 speed 5, strength 1, stamina 1, footyIQ 5 | $135k | $21k | 885 | 9 | 57.9 | W 22-8 Katherine Crocs |
| S3 W8 | kicking | 4 stamina 2, handling 1, footyIQ 1 | $118k | -$17k | 862 | 6 | 57.7 | W 18-4 Shellharbour Scorpions |
| S3 W9 | stamina | 9 speed 3, strength 1, handling 1, kicking 2, footyIQ 2 | $137k | $19k | 951 | 12 | 58.1 | W 26-7 Dubbo Diggers |
| S3 W10 | speed | 1 footyIQ 1 | $114k | -$23k | 935 | 6 | 59.4 | W 14-6 Mackay Marlins |
| S3 W11 | kicking | 14 speed 9, handling 1, footyIQ 4 | $132k | $17k | 977 | 10 | 60.8 | W 14-6 Ballarat Bushrangers |
| S3 W12 | kicking | 7 stamina 2, handling 1, kicking 1, footyIQ 3 | $119k | -$13k | 988 | 12 | 60.5 | W 25-4 Cairns Cyclones |
| S3 W13 | stamina | 4 speed 2, footyIQ 2 | $138k | $20k | 870 | 7 | 61.5 | L 4-14 Toowoomba Thunder |
| S3 W14 | kicking | 13 speed 4, handling 1, kicking 2, footyIQ 6 | $117k | -$22k | 941 | 9 | 62.6 | W 24-4 Woolloomooloo Wolves |
| S3 W15 | kicking | 8 speed 2, stamina 2, handling 1, kicking 1, footyIQ 2 | $144k | $27k | 958 | 11 | 62.2 | W 12-4 Redcliffe Reapers |
| S3 W16 | handling | 3 speed 3 | $128k | -$16k | 923 | 5 | 61.8 | L 12-23 Launceston Larrikins |
| S3 W17 | handling | 9 speed 2, strength 1, handling 4, kicking 1, footyIQ 1 | $141k | $13k | 976 | 11 | 61.9 | L 10-12 Darwin Drovers |
| S3 W18 | strength | 12 speed 3, strength 3, handling 3, footyIQ 3 | $122k | -$19k | 1053 | 12 | 62.9 | W 29-6 Southport Stingrays |
| S3 W19 | speed | 5 speed 1, strength 2, kicking 1, footyIQ 1 | $142k | $19k | 1008 | 7 | 62.7 | W 12-8 Broken Hill Brollys |
| S3 W20 | stamina | 10 speed 3, strength 1, kicking 3, footyIQ 3 | $129k | -$12k | 1020 | 12 | 62.8 | W 12-0 Geelong Gulls |
| S3 W21 | handling | 7 speed 3, strength 2, stamina 1, footyIQ 1 | $156k | $27k | 995 | 11 | 61.6 | W 17-6 Wagga Swagmen |
| S3 W22 | kicking | 9 speed 1, strength 1, stamina 1, handling 1, kicking 2, footyIQ 3 | $162k | $6.2k | 1060 | 7 | 62.9 | W 28-0 Katherine Crocs |
| S3 W23 | footyIQ | 7 strength 4, stamina 2, handling 1 | $193k | $31k | 1014 | 13 | 61.7 | D 12-12 Shellharbour Scorpions |
| S3 W24 | handling | 8 speed 2, strength 1, handling 1, kicking 1, footyIQ 3 | $194k | $1.5k | 990 | 11 | 63.0 | W 22-0 Dubbo Diggers |
| S3 W25 final | handling | 14 speed 2, handling 3, kicking 4, footyIQ 5 | $225k | $31k | 1081 | 8 | 61.9 | W 29-4 Darwin Drovers |
| S3 W26 final | handling | 11 speed 4, strength 2, stamina 2, handling 2, footyIQ 1 | $267k | $42k | 999 | 9 | 62.0 | W 13-10 Cairns Cyclones |
| S3 W27 final | strength | 0 | $450k | $182k | 0 | 0 | 0.0 | W 26-6 Woolloomooloo Wolves |
| S4 trial 1 | strength | 0 | $353k | -$96k | 715 | 1 | 38.6 | W 14-4 Dubbo Diggers |
| S4 trial 2 | footyIQ | 7 speed 3, strength 2, kicking 1, footyIQ 1 | $309k | -$44k | 923 | 10 | 41.9 | W 19-4 Katherine Crocs |
| S4 W1 | strength | 4 speed 1, stamina 1, handling 2 | $311k | $1.7k | 979 | 11 | 44.1 | W 10-0 Launceston Larrikins |
| S4 W2 | stamina | 9 speed 1, strength 1, handling 2, footyIQ 5 | $276k | -$35k | 1004 | 7 | 46.1 | W 19-0 Darwin Drovers |
| S4 W3 | handling | 13 speed 1, strength 3, stamina 1, handling 4, kicking 1, footyIQ 3 | $283k | $6.5k | 969 | 12 | 48.9 | W 18-4 Southport Stingrays |
| S4 W4 | stamina | 8 speed 3, strength 1, handling 1, footyIQ 3 | $257k | -$25k | 915 | 8 | 50.1 | W 19-10 Broken Hill Brollys |
| S4 W5 | strength | 9 strength 1, handling 3, kicking 2, footyIQ 3 | $271k | $14k | 872 | 12 | 52.4 | W 16-4 Geelong Gulls |
| S4 W6 | strength | 4 stamina 1, handling 2, footyIQ 1 | $246k | -$25k | 837 | 3 | 53.2 | W 12-10 Wagga Swagmen |
| S4 W7 | strength | 17 speed 3, strength 5, stamina 1, handling 2, kicking 2, footyIQ 4 | $265k | $19k | 938 | 11 | 54.0 | W 34-0 Katherine Crocs |
| S4 W8 | stamina | 5 speed 1, strength 1, kicking 1, footyIQ 2 | $244k | -$20k | 886 | 10 | 55.3 | W 22-18 Shellharbour Scorpions |
| S4 W9 | kicking | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $256k | $11k | 779 | 9 | 56.2 | L 10-16 Dubbo Diggers |
| S4 W10 | strength | 10 speed 1, strength 1, stamina 1, kicking 3, footyIQ 4 | $236k | -$20k | 840 | 6 | 56.6 | W 14-13 Mackay Marlins |
| S4 W11 | footyIQ | 6 speed 2, stamina 1, handling 1, footyIQ 2 | $256k | $21k | 777 | 8 | 57.8 | W 12-4 Ballarat Bushrangers |
| S4 W12 | stamina | 13 speed 1, strength 2, stamina 2, handling 1, kicking 3, footyIQ 4 | $238k | -$18k | 717 | 7 | 59.1 | D 6-6 Cairns Cyclones |
| S4 W13 | handling | 3 strength 1, stamina 1, footyIQ 1 | $262k | $24k | 810 | 6 | 59.9 | W 26-0 Toowoomba Thunder |
| S4 W14 | strength | 6 speed 1, stamina 2, handling 1, footyIQ 2 | $251k | -$11k | 730 | 9 | 58.8 | W 8-0 Woolloomooloo Wolves |
| S4 W15 | kicking | 5 speed 2, strength 1, stamina 1, handling 1 | $250k | -$1.4k | 815 | 10 | 58.8 | W 25-8 Redcliffe Reapers |
| S4 W16 | footyIQ | 6 speed 1, strength 2, footyIQ 3 | $252k | $2.6k | 831 | 9 | 58.8 | W 34-7 Launceston Larrikins |
| S4 W17 | stamina | 9 speed 4, strength 1, stamina 1, kicking 1, footyIQ 2 | $295k | $43k | 862 | 8 | 58.9 | W 35-8 Darwin Drovers |
| S4 W18 | handling | 1 strength 1 | $297k | $1.3k | 774 | 7 | 60.0 | W 20-10 Southport Stingrays |
| S4 W19 | strength | 5 speed 1, strength 1, stamina 1, footyIQ 2 | $326k | $29k | 802 | 6 | 60.1 | W 24-4 Broken Hill Brollys |
| S4 W20 | kicking | 3 stamina 1, handling 1, footyIQ 1 | $314k | -$12k | 817 | 9 | 60.1 | W 37-6 Geelong Gulls |
| S4 W21 | kicking | 5 speed 1, strength 1, handling 1, footyIQ 2 | $343k | $29k | 719 | 6 | 60.1 | L 6-8 Wagga Swagmen |
| S4 W22 | footyIQ | 5 strength 2, stamina 2, footyIQ 1 | $332k | -$11k | 788 | 8 | 59.0 | W 26-10 Katherine Crocs |
| S4 W23 | kicking | 1 speed 1 | $375k | $43k | 774 | 10 | 59.0 | W 24-4 Shellharbour Scorpions |
| S4 W24 | handling | 7 speed 3, strength 3, footyIQ 1 | $377k | $2.0k | 704 | 5 | 60.2 | L 6-13 Dubbo Diggers |
| S4 W25 final | handling | 5 strength 1, handling 1, footyIQ 3 | $406k | $29k | 739 | 7 | 60.4 | W 12-10 Toowoomba Thunder |
| S4 W26 final | strength | 5 speed 1, strength 1, stamina 1, footyIQ 2 | $437k | $30k | 782 | 8 | 59.3 | W 16-4 Mackay Marlins |
| S4 W27 final | footyIQ | 0 | $547k | $111k | 0 | 0 | 0.0 | L 4-6 Darwin Drovers |
| S5 trial 1 | stamina | 0 | $451k | -$96k | 727 | 1 | 38.2 | W 10-0 Geelong Gulls |
| S5 trial 2 | kicking | 4 strength 1, handling 2, footyIQ 1 | $398k | -$53k | 904 | 10 | 41.7 | W 14-6 Mackay Marlins |
| S5 W1 | kicking | 6 speed 1, strength 3, stamina 1, footyIQ 1 | $387k | -$11k | 933 | 9 | 44.4 | W 12-0 Launceston Larrikins |
| S5 W2 | footyIQ | 7 speed 1, strength 2, stamina 1, handling 2, footyIQ 1 | $343k | -$44k | 958 | 8 | 46.6 | W 22-12 Darwin Drovers |
| S5 W3 | speed | 11 speed 3, strength 4, stamina 1, handling 1, footyIQ 2 | $354k | $11k | 918 | 10 | 49.1 | W 24-8 Southport Stingrays |
| S5 W4 | footyIQ | 2 strength 1, footyIQ 1 | $325k | -$28k | 883 | 11 | 50.1 | W 14-6 Broken Hill Brollys |
| S5 W5 | handling | 7 speed 2, strength 3, handling 1, footyIQ 1 | $344k | $19k | 856 | 10 | 51.0 | W 22-11 Geelong Gulls |
| S5 W6 | stamina | 7 speed 2, stamina 1, footyIQ 4 | $324k | -$20k | 831 | 5 | 51.7 | W 22-16 Wagga Swagmen |
| S5 W7 | speed | 7 strength 2, footyIQ 5 | $347k | $23k | 821 | 8 | 53.3 | W 17-6 Katherine Crocs |
| S5 W8 | handling | 4 speed 2, stamina 2 | $328k | -$19k | 796 | 6 | 53.7 | W 13-6 Shellharbour Scorpions |
| S5 W9 | handling | 3 handling 2, footyIQ 1 | $343k | $15k | 704 | 10 | 55.5 | L 4-16 Dubbo Diggers |
| S5 W10 | kicking | 2 strength 1, handling 1 | $323k | -$20k | 739 | 6 | 56.9 | W 18-0 Mackay Marlins |
| S5 W11 | strength | 4 strength 2, stamina 1, handling 1 | $345k | $22k | 725 | 7 | 58.0 | W 14-4 Ballarat Bushrangers |
| S5 W12 | stamina | 8 speed 2, strength 1, stamina 2, footyIQ 3 | $327k | -$18k | 734 | 5 | 59.0 | W 20-0 Cairns Cyclones |
| S5 W13 | speed | 4 speed 2, strength 1, handling 1 | $348k | $21k | 831 | 8 | 59.2 | W 52-0 Toowoomba Thunder |
| S5 W14 | speed | 2 speed 1, footyIQ 1 | $349k | $1.2k | 727 | 8 | 60.4 | W 20-0 Woolloomooloo Wolves |
| S5 W15 | kicking | 2 handling 1, footyIQ 1 | $382k | $33k | 686 | 4 | 59.4 | W 8-4 Redcliffe Reapers |
| S5 W16 | speed | 7 speed 1, strength 4, footyIQ 2 | $385k | $2.9k | 768 | 12 | 59.5 | W 32-0 Launceston Larrikins |
| S5 W17 | stamina | 11 speed 1, strength 4, handling 2, footyIQ 4 | $428k | $43k | 716 | 5 | 59.6 | W 14-10 Darwin Drovers |
| S5 W18 | handling | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $430k | $1.7k | 649 | 7 | 60.8 | L 10-13 Southport Stingrays |
| S5 W19 | kicking | 3 speed 2, handling 1 | $458k | $28k | 721 | 7 | 59.7 | W 20-0 Broken Hill Brollys |
| S5 W20 | kicking | 3 speed 2, handling 1 | $461k | $2.9k | 766 | 6 | 59.7 | W 34-6 Geelong Gulls |
| S5 W21 | kicking | 5 strength 1, stamina 1, footyIQ 3 | $505k | $44k | 641 | 9 | 59.7 | L 0-7 Wagga Swagmen |
| S5 W22 | handling | 4 speed 1, stamina 1, footyIQ 2 | $507k | $2.9k | 737 | 5 | 59.8 | W 33-6 Katherine Crocs |
| S5 W23 | speed | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $551k | $43k | 681 | 10 | 59.8 | W 11-6 Shellharbour Scorpions |
| S5 W24 | strength | 3 speed 3 | $553k | $2.5k | 718 | 5 | 61.0 | W 22-0 Dubbo Diggers |
| S5 W25 final | handling | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $583k | $30k | 673 | 8 | 59.9 | L 4-5 Dubbo Diggers |
| S5 W26 final | speed | 2 speed 1, handling 1 | $586k | $3.0k | 226 | 2 | 59.9 | no match |
| S5 W27 final | kicking | 0 | $611k | $25k | 0 | 0 | 0.0 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $66k | -$24k | 645 | 0.60 | 53.9 | 60.1 | 0.0% | 35.0% |
| S1 trial 2 | 20 | $36k | -$30k | 660 | 5.75 | 54.4 | 60.9 | 0.0% | 40.0% |
| S1 W1 | 20 | $38k | $1.4k | 665 | 4.45 | 54.7 | 61.2 | 0.0% | 65.0% |
| S1 W2 | 20 | $16k | -$21k | 660 | 6.85 | 54.9 | 61.4 | 0.0% | 45.0% |
| S1 W3 | 20 | $35k | $18k | 679 | 4.25 | 54.9 | 61.5 | 0.0% | 50.0% |
| S1 W4 | 20 | $14k | -$21k | 692 | 6.80 | 54.9 | 61.6 | 0.0% | 70.0% |
| S1 W5 | 20 | $34k | $20k | 700 | 7.70 | 55.0 | 61.7 | 0.0% | 65.0% |
| S1 W6 | 20 | $11k | -$23k | 709 | 7.50 | 55.4 | 62.3 | 0.0% | 60.0% |
| S1 W7 | 20 | $35k | $24k | 689 | 4.85 | 55.5 | 62.5 | 0.0% | 55.0% |
| S1 W8 | 20 | $13k | -$22k | 701 | 8.70 | 55.8 | 62.6 | 0.0% | 75.0% |
| S1 W9 | 20 | $34k | $21k | 702 | 4.95 | 55.8 | 62.7 | 0.0% | 65.0% |
| S1 W10 | 20 | $12k | -$22k | 715 | 7.10 | 56.2 | 63.3 | 0.0% | 65.0% |
| S1 W11 | 20 | $35k | $23k | 718 | 5.50 | 56.2 | 63.4 | 0.0% | 55.0% |
| S1 W12 | 20 | $17k | -$18k | 730 | 8.15 | 56.3 | 63.6 | 0.0% | 55.0% |
| S1 W13 | 20 | $40k | $23k | 740 | 6.95 | 56.3 | 63.8 | 0.0% | 75.0% |
| S1 W14 | 20 | $22k | -$19k | 759 | 7.25 | 56.6 | 64.2 | 0.0% | 65.0% |
| S1 W15 | 20 | $50k | $28k | 746 | 7.30 | 56.7 | 64.3 | 0.0% | 45.0% |
| S1 W16 | 20 | $35k | -$15k | 754 | 7.80 | 56.8 | 64.4 | 0.0% | 70.0% |
| S1 W17 | 20 | $52k | $18k | 768 | 6.45 | 57.0 | 64.6 | 0.0% | 65.0% |
| S1 W18 | 20 | $39k | -$14k | 755 | 9.60 | 57.1 | 64.9 | 0.0% | 50.0% |
| S1 W19 | 20 | $60k | $21k | 774 | 6.85 | 57.2 | 65.0 | 0.0% | 60.0% |
| S1 W20 | 20 | $48k | -$12k | 776 | 6.65 | 57.2 | 65.1 | 0.0% | 70.0% |
| S1 W21 | 20 | $71k | $23k | 792 | 7.95 | 57.3 | 65.2 | 0.0% | 70.0% |
| S1 W22 | 20 | $60k | -$11k | 783 | 7.60 | 57.4 | 65.4 | 0.0% | 70.0% |
| S1 W23 | 20 | $85k | $25k | 765 | 7.80 | 57.5 | 65.6 | 0.0% | 45.0% |
| S1 W24 | 20 | $76k | -$8.6k | 791 | 7.45 | 57.5 | 65.7 | 0.0% | 65.0% |
| S1 W25 final | 20 | $97k | $21k | 707 | 7.15 | 57.6 | 65.9 | 0.0% | 58.8% |
| S1 W26 final | 20 | $104k | $6.7k | 530 | 5.05 | 57.7 | 65.9 | 0.0% | 60.0% |
| S1 W27 final | 20 | $156k | $52k | 140 | 0.90 | 58.0 | 58.7 | 0.0% | 66.7% |
| S2 trial 1 | 20 | $127k | -$29k | 615 | 5.35 | 52.1 | 58.7 | 0.0% | 50.0% |
| S2 trial 2 | 20 | $110k | -$17k | 682 | 5.80 | 53.0 | 60.6 | 0.0% | 65.0% |
| S2 W1 | 20 | $122k | $12k | 691 | 7.70 | 53.6 | 62.0 | 0.0% | 60.0% |
| S2 W2 | 20 | $99k | -$23k | 723 | 6.70 | 54.3 | 63.5 | 0.0% | 70.0% |
| S2 W3 | 20 | $117k | $18k | 709 | 7.35 | 54.7 | 64.2 | 0.0% | 70.0% |
| S2 W4 | 20 | $97k | -$20k | 694 | 6.85 | 55.2 | 64.7 | 0.0% | 55.0% |
| S2 W5 | 20 | $111k | $14k | 718 | 6.85 | 56.1 | 65.4 | 0.0% | 85.0% |
| S2 W6 | 20 | $89k | -$22k | 732 | 6.35 | 56.9 | 65.9 | 0.0% | 70.0% |
| S2 W7 | 20 | $108k | $19k | 722 | 7.55 | 57.3 | 66.0 | 0.0% | 60.0% |
| S2 W8 | 20 | $90k | -$18k | 723 | 6.90 | 57.5 | 66.2 | 0.0% | 75.0% |
| S2 W9 | 20 | $104k | $14k | 756 | 7.55 | 58.1 | 66.7 | 0.0% | 90.0% |
| S2 W10 | 20 | $83k | -$21k | 740 | 6.65 | 58.6 | 67.0 | 0.0% | 65.0% |
| S2 W11 | 20 | $105k | $22k | 734 | 7.00 | 58.6 | 67.2 | 0.0% | 50.0% |
| S2 W12 | 20 | $88k | -$17k | 750 | 7.45 | 58.6 | 67.3 | 0.0% | 60.0% |
| S2 W13 | 20 | $102k | $14k | 770 | 7.55 | 59.2 | 67.9 | 0.0% | 80.0% |
| S2 W14 | 20 | $80k | -$22k | 771 | 6.20 | 59.8 | 68.1 | 0.0% | 55.0% |
| S2 W15 | 20 | $98k | $19k | 794 | 7.70 | 59.9 | 68.2 | 0.0% | 75.0% |
| S2 W16 | 20 | $81k | -$17k | 782 | 7.65 | 60.0 | 68.4 | 0.0% | 75.0% |
| S2 W17 | 20 | $98k | $16k | 779 | 7.05 | 60.1 | 68.7 | 0.0% | 75.0% |
| S2 W18 | 20 | $82k | -$15k | 784 | 7.15 | 60.2 | 68.8 | 0.0% | 65.0% |
| S2 W19 | 20 | $107k | $25k | 784 | 8.20 | 60.2 | 69.0 | 0.0% | 65.0% |
| S2 W20 | 20 | $96k | -$11k | 786 | 8.10 | 60.3 | 69.1 | 0.0% | 70.0% |
| S2 W21 | 20 | $123k | $27k | 791 | 7.95 | 60.3 | 69.3 | 0.0% | 65.0% |
| S2 W22 | 20 | $114k | -$8.6k | 775 | 7.20 | 60.6 | 69.5 | 0.0% | 70.0% |
| S2 W23 | 20 | $140k | $26k | 800 | 7.60 | 60.7 | 69.7 | 0.0% | 80.0% |
| S2 W24 | 20 | $132k | -$8.9k | 792 | 7.85 | 60.8 | 69.8 | 0.0% | 70.0% |
| S2 W25 final | 20 | $164k | $33k | 765 | 8.30 | 60.8 | 70.0 | 0.0% | 78.9% |
| S2 W26 final | 20 | $188k | $23k | 650 | 5.10 | 61.1 | 70.1 | 0.0% | 66.7% |
| S2 W27 final | 20 | $270k | $83k | 86 | 1.15 | 60.6 | 60.6 | 0.0% | 80.0% |
| S3 trial 1 | 20 | $219k | -$52k | 657 | 2.10 | 44.7 | 50.8 | 0.0% | 35.0% |
| S3 trial 2 | 20 | $188k | -$31k | 827 | 8.80 | 46.8 | 55.2 | 0.0% | 65.0% |
| S3 W1 | 20 | $194k | $6.6k | 825 | 8.20 | 48.4 | 59.2 | 0.0% | 85.0% |
| S3 W2 | 20 | $167k | -$27k | 801 | 6.85 | 49.8 | 62.5 | 0.0% | 65.0% |
| S3 W3 | 20 | $185k | $17k | 792 | 8.75 | 51.2 | 65.0 | 0.0% | 60.0% |
| S3 W4 | 20 | $164k | -$21k | 773 | 7.70 | 52.1 | 67.0 | 0.0% | 75.0% |
| S3 W5 | 20 | $178k | $14k | 745 | 7.15 | 53.3 | 68.7 | 0.0% | 65.0% |
| S3 W6 | 20 | $156k | -$22k | 744 | 7.00 | 54.3 | 69.6 | 0.0% | 75.0% |
| S3 W7 | 20 | $176k | $19k | 726 | 7.20 | 55.1 | 69.9 | 0.0% | 70.0% |
| S3 W8 | 20 | $158k | -$18k | 717 | 6.65 | 55.5 | 70.2 | 0.0% | 85.0% |
| S3 W9 | 20 | $170k | $13k | 709 | 7.10 | 56.5 | 70.7 | 0.0% | 75.0% |
| S3 W10 | 20 | $148k | -$22k | 704 | 6.35 | 57.3 | 71.0 | 0.0% | 60.0% |
| S3 W11 | 20 | $169k | $21k | 744 | 6.70 | 57.8 | 71.1 | 0.0% | 90.0% |
| S3 W12 | 20 | $153k | -$15k | 738 | 7.80 | 58.0 | 71.2 | 0.0% | 80.0% |
| S3 W13 | 20 | $171k | $18k | 732 | 6.60 | 58.7 | 71.6 | 0.0% | 65.0% |
| S3 W14 | 20 | $153k | -$18k | 735 | 7.60 | 59.3 | 71.7 | 0.0% | 75.0% |
| S3 W15 | 20 | $180k | $27k | 750 | 6.80 | 59.5 | 71.8 | 0.0% | 75.0% |
| S3 W16 | 20 | $171k | -$9.5k | 740 | 7.70 | 59.6 | 72.0 | 0.0% | 75.0% |
| S3 W17 | 20 | $195k | $24k | 731 | 6.80 | 59.8 | 72.3 | 0.0% | 65.0% |
| S3 W18 | 20 | $187k | -$8.0k | 739 | 7.00 | 60.2 | 72.4 | 0.0% | 60.0% |
| S3 W19 | 20 | $219k | $33k | 741 | 7.25 | 60.1 | 72.5 | 0.0% | 60.0% |
| S3 W20 | 20 | $214k | -$5.2k | 770 | 7.20 | 60.0 | 72.6 | 0.0% | 90.0% |
| S3 W21 | 20 | $249k | $35k | 761 | 7.50 | 60.1 | 72.7 | 0.0% | 80.0% |
| S3 W22 | 20 | $247k | -$1.7k | 777 | 8.30 | 60.4 | 72.8 | 0.0% | 75.0% |
| S3 W23 | 20 | $282k | $35k | 758 | 7.35 | 60.2 | 73.0 | 0.0% | 65.0% |
| S3 W24 | 20 | $282k | -$680 | 763 | 7.15 | 60.5 | 73.1 | 0.0% | 80.0% |
| S3 W25 final | 20 | $319k | $37k | 775 | 7.90 | 60.5 | 73.3 | 0.0% | 80.0% |
| S3 W26 final | 20 | $345k | $26k | 662 | 6.40 | 60.7 | 73.3 | 0.0% | 87.5% |
| S3 W27 final | 20 | $471k | $126k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 92.9% |
| S4 trial 1 | 20 | $398k | -$73k | 711 | 1.10 | 38.1 | 41.3 | 0.0% | 50.0% |
| S4 trial 2 | 20 | $353k | -$44k | 918 | 9.70 | 41.2 | 46.6 | 0.0% | 85.0% |
| S4 W1 | 20 | $353k | -$34 | 907 | 10.35 | 43.6 | 51.4 | 0.0% | 80.0% |
| S4 W2 | 20 | $320k | -$33k | 880 | 5.65 | 45.5 | 55.7 | 0.0% | 65.0% |
| S4 W3 | 20 | $332k | $12k | 861 | 10.10 | 47.4 | 59.5 | 0.0% | 70.0% |
| S4 W4 | 20 | $309k | -$24k | 832 | 8.45 | 48.9 | 62.8 | 0.0% | 75.0% |
| S4 W5 | 20 | $320k | $12k | 818 | 8.20 | 50.5 | 66.4 | 0.0% | 80.0% |
| S4 W6 | 20 | $296k | -$25k | 780 | 6.45 | 51.8 | 69.6 | 0.0% | 85.0% |
| S4 W7 | 20 | $313k | $18k | 784 | 8.55 | 52.9 | 71.8 | 0.0% | 90.0% |
| S4 W8 | 20 | $295k | -$18k | 763 | 6.90 | 53.6 | 72.0 | 0.0% | 95.0% |
| S4 W9 | 20 | $309k | $14k | 749 | 7.40 | 54.7 | 72.8 | 0.0% | 65.0% |
| S4 W10 | 20 | $289k | -$20k | 730 | 6.20 | 55.6 | 73.1 | 0.0% | 75.0% |
| S4 W11 | 20 | $312k | $23k | 724 | 7.35 | 56.2 | 73.2 | 0.0% | 65.0% |
| S4 W12 | 20 | $297k | -$16k | 722 | 6.30 | 56.6 | 73.3 | 0.0% | 65.0% |
| S4 W13 | 20 | $318k | $21k | 736 | 7.50 | 57.3 | 73.7 | 0.0% | 75.0% |
| S4 W14 | 20 | $307k | -$11k | 736 | 7.35 | 57.7 | 73.9 | 0.0% | 65.0% |
| S4 W15 | 20 | $335k | $29k | 727 | 6.65 | 57.9 | 74.0 | 0.0% | 65.0% |
| S4 W16 | 20 | $329k | -$6.3k | 748 | 7.10 | 57.8 | 74.1 | 0.0% | 80.0% |
| S4 W17 | 20 | $365k | $36k | 748 | 8.20 | 58.0 | 74.2 | 0.0% | 60.0% |
| S4 W18 | 20 | $361k | -$4.0k | 723 | 6.40 | 58.3 | 74.2 | 0.0% | 45.0% |
| S4 W19 | 20 | $398k | $36k | 740 | 8.20 | 58.6 | 74.3 | 0.0% | 85.0% |
| S4 W20 | 20 | $391k | -$6.1k | 738 | 6.80 | 58.8 | 74.4 | 0.0% | 80.0% |
| S4 W21 | 20 | $426k | $35k | 727 | 7.05 | 58.7 | 74.5 | 0.0% | 60.0% |
| S4 W22 | 20 | $422k | -$4.3k | 739 | 7.00 | 58.5 | 74.6 | 0.0% | 50.0% |
| S4 W23 | 20 | $461k | $39k | 743 | 8.55 | 58.5 | 74.7 | 0.0% | 70.0% |
| S4 W24 | 20 | $460k | -$621 | 746 | 6.80 | 58.5 | 74.8 | 0.0% | 65.0% |
| S4 W25 final | 20 | $498k | $38k | 716 | 6.80 | 58.8 | 74.9 | 0.0% | 78.9% |
| S4 W26 final | 20 | $522k | $24k | 637 | 6.30 | 58.7 | 75.0 | 0.0% | 73.3% |
| S4 W27 final | 20 | $617k | $95k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 72.7% |
| S5 trial 1 | 20 | $538k | -$79k | 688 | 0.70 | 38.7 | 41.8 | 0.0% | 40.0% |
| S5 trial 2 | 20 | $488k | -$50k | 866 | 9.75 | 41.9 | 47.4 | 0.0% | 50.0% |
| S5 W1 | 20 | $481k | -$6.8k | 891 | 9.55 | 44.5 | 52.5 | 0.0% | 90.0% |
| S5 W2 | 20 | $446k | -$35k | 871 | 6.15 | 46.4 | 56.9 | 0.0% | 85.0% |
| S5 W3 | 20 | $458k | $12k | 841 | 9.30 | 48.3 | 60.7 | 0.0% | 80.0% |
| S5 W4 | 20 | $435k | -$23k | 809 | 8.35 | 49.8 | 63.8 | 0.0% | 60.0% |
| S5 W5 | 20 | $450k | $15k | 791 | 7.80 | 51.2 | 67.2 | 0.0% | 75.0% |
| S5 W6 | 20 | $428k | -$22k | 766 | 6.80 | 52.4 | 70.0 | 0.0% | 90.0% |
| S5 W7 | 20 | $450k | $22k | 736 | 7.40 | 53.2 | 72.2 | 0.0% | 85.0% |
| S5 W8 | 20 | $433k | -$17k | 725 | 6.30 | 53.9 | 72.3 | 0.0% | 75.0% |
| S5 W9 | 20 | $447k | $14k | 709 | 7.15 | 55.1 | 73.3 | 0.0% | 55.0% |
| S5 W10 | 20 | $429k | -$18k | 699 | 6.15 | 55.7 | 73.7 | 0.0% | 75.0% |
| S5 W11 | 20 | $456k | $26k | 687 | 6.90 | 56.1 | 73.8 | 0.0% | 70.0% |
| S5 W12 | 20 | $444k | -$12k | 688 | 6.55 | 56.3 | 73.9 | 0.0% | 50.0% |
| S5 W13 | 20 | $468k | $25k | 700 | 6.10 | 57.1 | 74.4 | 0.0% | 60.0% |
| S5 W14 | 20 | $456k | -$12k | 708 | 7.50 | 57.5 | 74.6 | 0.0% | 70.0% |
| S5 W15 | 20 | $489k | $32k | 702 | 6.40 | 57.7 | 74.7 | 0.0% | 70.0% |
| S5 W16 | 20 | $485k | -$3.9k | 711 | 7.65 | 57.8 | 74.8 | 0.0% | 95.0% |
| S5 W17 | 20 | $522k | $37k | 693 | 6.25 | 57.9 | 74.8 | 0.0% | 70.0% |
| S5 W18 | 20 | $520k | -$2.0k | 695 | 6.85 | 57.8 | 74.9 | 0.0% | 65.0% |
| S5 W19 | 20 | $560k | $40k | 703 | 7.40 | 58.2 | 75.0 | 0.0% | 65.0% |
| S5 W20 | 20 | $554k | -$5.2k | 702 | 6.50 | 58.2 | 75.1 | 0.0% | 75.0% |
| S5 W21 | 20 | $592k | $38k | 701 | 7.45 | 58.2 | 75.2 | 0.0% | 80.0% |
| S5 W22 | 20 | $590k | -$2.8k | 711 | 6.65 | 58.3 | 75.3 | 0.0% | 75.0% |
| S5 W23 | 20 | $628k | $38k | 712 | 7.35 | 58.2 | 75.3 | 0.0% | 75.0% |
| S5 W24 | 20 | $628k | -$127 | 699 | 6.80 | 58.4 | 75.4 | 0.0% | 75.0% |
| S5 W25 final | 20 | $663k | $35k | 704 | 7.35 | 58.4 | 75.5 | 0.0% | 70.0% |
| S5 W26 final | 20 | $687k | $24k | 566 | 5.60 | 58.4 | 75.6 | 0.0% | 85.7% |
| S5 W27 final | 20 | $786k | $99k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 75.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × rush | 2517 | 72.8% | 101 | 84.2% | -11.3% |  |
| expansive × slide | 91 | 82.4% | 2527 | 72.9% | 9.5% |  |
| kick-chase × slide | 10 | 100.0% | 2608 | 73.2% | 26.8% | WARNING |
| block-play | 122 | 76.6% | 2496 | 73.1% | 3.5% |  |
| block-shift | 266 | 73.9% | 2352 | 73.2% | 0.7% |  |
| chip-chase | 2164 | 73.3% | 454 | 72.9% | 0.4% |  |
| cut-out-winger | 266 | 73.9% | 2352 | 73.2% | 0.7% |  |
| inside-ball | 120 | 77.1% | 2498 | 73.1% | 4.0% |  |
| kick-pass | 2146 | 73.2% | 472 | 73.5% | -0.3% |  |
| second-man | 266 | 73.9% | 2352 | 73.2% | 0.7% |  |
| short-side-raid | 120 | 77.1% | 2498 | 73.1% | 4.0% |  |

### careless/normal/au

- 70 overall (best nine, including recruitment): 73.1 weeks; 15 reached, 5 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 105 of 400; median 22.0 weeks among those who did.
- Reaching potential stars: 130 of 400 (95 already there at week 0); median 42.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/169; S3 0/0; S5 0/0.
- Mean XP per completed season 20328; mean level-ups per completed season 191.7.
- Cash: opening 60000; mean weekly change 3161; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 93; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- No balance flag on the thresholds above.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 53833 |
| gate | 483182 |
| prize | 45968 |
| boardGrant | 11183 |
| events | -3315 |
| transfers | -474700 |
| contracts | -19761 |
| facilities | -4710 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 1 speed 1 | $42k | -$18k | 850 | 2 | 50.1 | W 12-6 Dubbo Diggers |
| S1 trial 2 | footyIQ | 5 speed 1, stamina 1, footyIQ 3 | $21k | -$21k | 757 | 7 | 50.7 | L 0-8 Wagga Swagmen |
| S1 W1 | handling | 3 handling 1, footyIQ 2 | $27k | $5.4k | 840 | 7 | 51.1 | W 5-0 Launceston Larrikins |
| S1 W2 | stamina | 6 strength 4, stamina 1, handling 1 | $2.7k | -$24k | 860 | 8 | 51.5 | L 10-12 Darwin Drovers |
| S1 W3 | handling | 11 speed 3, strength 2, stamina 3, kicking 1, footyIQ 2 | $36k | $33k | 845 | 6 | 51.6 | W 1-0 Southport Stingrays |
| S1 W4 | stamina | 4 speed 1, strength 1, stamina 1, kicking 1 | $12k | -$24k | 892 | 9 | 51.9 | W 8-0 Broken Hill Brollys |
| S1 W5 | speed | 10 speed 2, strength 2, handling 3, kicking 1, footyIQ 2 | $46k | $34k | 836 | 10 | 52.0 | L 0-12 Geelong Gulls |
| S1 W6 | speed | 11 speed 6, strength 2, handling 1, kicking 1, footyIQ 1 | $25k | -$21k | 793 | 9 | 52.5 | D 6-6 Wagga Swagmen |
| S1 W7 | speed | 2 speed 1, footyIQ 1 | $31k | $6.3k | 757 | 4 | 52.8 | L 4-10 Katherine Crocs |
| S1 W8 | strength | 3 speed 1, footyIQ 2 | $12k | -$19k | 798 | 7 | 53.0 | W 1-0 Shellharbour Scorpions |
| S1 W9 | footyIQ | 2 strength 2 | $28k | $16k | 776 | 8 | 53.4 | W 8-4 Dubbo Diggers |
| S1 W10 | handling | 16 speed 4, strength 2, stamina 2, handling 7, footyIQ 1 | $2.0k | -$26k | 812 | 9 | 54.0 | L 4-14 Mackay Marlins |
| S1 W11 | kicking | 15 speed 3, strength 2, stamina 3, handling 2, kicking 1, footyIQ 4 | $33k | $31k | 799 | 5 | 54.1 | L 0-10 Ballarat Bushrangers |
| S1 W12 | strength | 6 speed 1, strength 1, stamina 3, kicking 1 | $7.1k | -$26k | 879 | 11 | 54.6 | L 6-16 Cairns Cyclones |
| S1 W13 | handling | 5 speed 2, strength 1, kicking 2 | $37k | $30k | 876 | 8 | 54.6 | L 8-10 Toowoomba Thunder |
| S1 W14 | kicking | 13 speed 3, strength 2, stamina 2, handling 1, footyIQ 5 | $18k | -$19k | 905 | 7 | 54.9 | L 4-16 Woolloomooloo Wolves |
| S1 W15 | footyIQ | 5 stamina 1, handling 1, footyIQ 3 | $26k | $7.6k | 902 | 9 | 54.7 | L 6-10 Redcliffe Reapers |
| S1 W16 | handling | 9 speed 2, strength 2, stamina 2, footyIQ 3 | $1.9k | -$24k | 934 | 9 | 54.9 | W 6-4 Launceston Larrikins |
| S1 W17 | strength | 10 speed 2, strength 1, handling 2, footyIQ 5 | $29k | $27k | 979 | 12 | 55.0 | W 16-13 Darwin Drovers |
| S1 W18 | speed | 12 speed 3, strength 3, stamina 1, footyIQ 5 | $9.1k | -$20k | 842 | 7 | 55.3 | W 10-0 Southport Stingrays |
| S1 W19 | stamina | 6 speed 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $37k | $28k | 914 | 10 | 55.3 | W 10-0 Broken Hill Brollys |
| S1 W20 | strength | 11 speed 3, strength 6, handling 1, footyIQ 1 | $37k | $81 | 857 | 8 | 55.8 | L 0-1 Geelong Gulls |
| S1 W21 | handling | 6 speed 1, stamina 1, handling 1, footyIQ 3 | $49k | $12k | 962 | 11 | 55.8 | W 12-4 Wagga Swagmen |
| S1 W22 | strength | 13 speed 2, strength 3, stamina 5, kicking 1, footyIQ 2 | $50k | $1.2k | 1031 | 9 | 55.9 | W 20-4 Katherine Crocs |
| S1 W23 | footyIQ | 9 speed 2, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $72k | $22k | 940 | 11 | 56.4 | W 8-0 Shellharbour Scorpions |
| S1 W24 | strength | 8 speed 3, strength 1, stamina 2, kicking 1, footyIQ 1 | $57k | -$15k | 991 | 6 | 56.2 | W 33-6 Dubbo Diggers |
| S1 W25 final | stamina | 11 speed 5, stamina 2, handling 2, kicking 1, footyIQ 1 | $30k | -$27k | 897 | 11 | 56.6 | L 4-10 Redcliffe Reapers |
| S1 W26 final | strength | 4 speed 1, strength 1, stamina 1, kicking 1 | $16k | -$15k | 306 | 1 | 56.4 | no match |
| S1 W27 final | stamina | 1 footyIQ 1 | $52k | $36k | 153 | 2 | 55.6 | no match |
| S2 trial 1 | footyIQ | 8 strength 4, handling 1, footyIQ 3 | $21k | -$31k | 686 | 6 | 55.3 | L 0-10 Ballarat Bushrangers |
| S2 trial 2 | stamina | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | $8.1k | -$13k | 737 | 6 | 55.7 | W 8-6 Redcliffe Reapers |
| S2 W1 | footyIQ | 6 speed 1, strength 3, kicking 1, footyIQ 1 | $36k | $28k | 718 | 8 | 55.8 | W 6-0 Launceston Larrikins |
| S2 W2 | footyIQ | 5 speed 1, handling 1, kicking 1, footyIQ 2 | $8.0k | -$28k | 699 | 5 | 56.6 | D 6-6 Darwin Drovers |
| S2 W3 | kicking | 10 speed 4, strength 2, stamina 3, footyIQ 1 | $37k | $29k | 759 | 12 | 56.7 | W 8-4 Southport Stingrays |
| S2 W4 | kicking | 3 stamina 1, handling 1, footyIQ 1 | $17k | -$20k | 770 | 6 | 56.9 | W 16-11 Broken Hill Brollys |
| S2 W5 | stamina | 8 speed 2, strength 1, stamina 2, footyIQ 3 | $33k | $16k | 788 | 8 | 56.5 | L 7-10 Geelong Gulls |
| S2 W6 | stamina | 16 speed 3, strength 5, stamina 1, handling 2, kicking 3, footyIQ 2 | $13k | -$20k | 852 | 8 | 56.9 | D 0-0 Wagga Swagmen |
| S2 W7 | strength | 2 handling 1, kicking 1 | $33k | $20k | 913 | 10 | 55.5 | W 12-0 Katherine Crocs |
| S2 W8 | speed | 11 speed 2, stamina 4, footyIQ 5 | $17k | -$16k | 892 | 9 | 55.5 | W 12-6 Shellharbour Scorpions |
| S2 W9 | kicking | 5 speed 1, strength 1, handling 1, footyIQ 2 | $38k | $21k | 911 | 7 | 55.2 | W 6-4 Dubbo Diggers |
| S2 W10 | handling | 13 speed 6, strength 3, stamina 1, handling 2, footyIQ 1 | $19k | -$19k | 850 | 8 | 55.5 | L 6-11 Mackay Marlins |
| S2 W11 | footyIQ | 4 strength 2, footyIQ 2 | $31k | $13k | 869 | 8 | 55.4 | L 4-7 Ballarat Bushrangers |
| S2 W12 | handling | 4 handling 1, kicking 1, footyIQ 2 | $12k | -$19k | 910 | 10 | 56.6 | W 10-0 Cairns Cyclones |
| S2 W13 | strength | 6 speed 2, stamina 1, footyIQ 3 | $31k | $19k | 855 | 4 | 56.7 | L 4-8 Toowoomba Thunder |
| S2 W14 | handling | 5 speed 1, strength 3, footyIQ 1 | $13k | -$18k | 933 | 10 | 56.7 | W 10-6 Woolloomooloo Wolves |
| S2 W15 | handling | 12 speed 3, strength 1, handling 1, kicking 2, footyIQ 5 | $35k | $22k | 927 | 11 | 55.7 | W 14-0 Redcliffe Reapers |
| S2 W16 | footyIQ | 19 speed 5, strength 6, stamina 2, handling 1, footyIQ 5 | $20k | -$15k | 1007 | 9 | 55.7 | W 21-4 Launceston Larrikins |
| S2 W17 | strength | 7 speed 1, strength 4, footyIQ 2 | $40k | $20k | 964 | 10 | 55.8 | W 15-14 Darwin Drovers |
| S2 W18 | footyIQ | 11 speed 2, strength 1, stamina 1, handling 3, footyIQ 4 | $21k | -$19k | 938 | 10 | 56.0 | W 10-4 Southport Stingrays |
| S2 W19 | speed | 5 strength 1, stamina 1, kicking 1, footyIQ 2 | $39k | $18k | 908 | 8 | 56.1 | W 2-0 Broken Hill Brollys |
| S2 W20 | speed | 9 speed 1, strength 1, stamina 1, handling 4, footyIQ 2 | $38k | -$1.6k | 928 | 10 | 56.1 | W 10-4 Geelong Gulls |
| S2 W21 | stamina | 14 speed 4, strength 3, stamina 3, kicking 1, footyIQ 3 | $81k | $43k | 1008 | 9 | 57.2 | W 22-0 Wagga Swagmen |
| S2 W22 | speed | 6 speed 1, strength 3, footyIQ 2 | $67k | -$14k | 966 | 9 | 56.8 | W 8-6 Katherine Crocs |
| S2 W23 | stamina | 8 strength 2, stamina 3, handling 1, kicking 1, footyIQ 1 | $106k | $39k | 931 | 9 | 56.8 | D 6-6 Shellharbour Scorpions |
| S2 W24 | handling | 16 speed 6, stamina 1, handling 3, kicking 3, footyIQ 3 | $107k | $976 | 912 | 9 | 57.6 | L 4-10 Dubbo Diggers |
| S2 W25 final | stamina | 8 speed 2, strength 4, stamina 1, footyIQ 1 | $136k | $30k | 984 | 10 | 57.0 | W 14-12 Mackay Marlins |
| S2 W26 final | handling | 3 speed 1, handling 1, footyIQ 1 | $180k | $43k | 917 | 8 | 57.0 | L 6-11 Ballarat Bushrangers |
| S2 W27 final | kicking | 0 | $221k | $41k | 85 | 1 | 62.7 | no match |
| S3 trial 1 | speed | 2 speed 1, handling 1 | $179k | -$42k | 865 | 6 | 49.8 | W 20-0 Mackay Marlins |
| S3 trial 2 | speed | 13 speed 5, strength 1, stamina 3, kicking 1, footyIQ 3 | $155k | -$24k | 957 | 7 | 51.4 | W 18-15 Broken Hill Brollys |
| S3 W1 | kicking | 3 speed 1, stamina 1, footyIQ 1 | $163k | $8.4k | 975 | 12 | 52.3 | W 20-0 Launceston Larrikins |
| S3 W2 | strength | 12 speed 5, strength 3, handling 3, footyIQ 1 | $141k | -$22k | 913 | 10 | 53.1 | L 6-16 Darwin Drovers |
| S3 W3 | handling | 6 speed 2, strength 1, handling 2, footyIQ 1 | $160k | $19k | 852 | 8 | 53.6 | W 11-0 Southport Stingrays |
| S3 W4 | handling | 7 speed 1, stamina 1, handling 1, footyIQ 4 | $143k | -$17k | 840 | 7 | 53.8 | W 12-0 Broken Hill Brollys |
| S3 W5 | stamina | 7 strength 1, stamina 1, handling 1, footyIQ 4 | $160k | $17k | 716 | 7 | 54.2 | D 0-0 Geelong Gulls |
| S3 W6 | stamina | 13 speed 3, strength 1, stamina 2, kicking 1, footyIQ 6 | $140k | -$20k | 812 | 8 | 54.6 | L 10-14 Wagga Swagmen |
| S3 W7 | stamina | 6 stamina 2, handling 2, kicking 1, footyIQ 1 | $153k | $13k | 924 | 10 | 55.6 | W 22-7 Katherine Crocs |
| S3 W8 | stamina | 14 speed 5, strength 2, handling 1, kicking 2, footyIQ 4 | $139k | -$14k | 899 | 8 | 55.6 | W 12-8 Shellharbour Scorpions |
| S3 W9 | stamina | 14 speed 2, strength 3, stamina 1, handling 1, kicking 1, footyIQ 6 | $152k | $13k | 807 | 6 | 56.2 | L 6-12 Dubbo Diggers |
| S3 W10 | kicking | 5 strength 1, handling 1, kicking 2, footyIQ 1 | $130k | -$22k | 843 | 8 | 56.6 | L 8-12 Mackay Marlins |
| S3 W11 | footyIQ | 6 strength 2, handling 3, footyIQ 1 | $148k | $18k | 874 | 8 | 56.8 | W 10-0 Ballarat Bushrangers |
| S3 W12 | handling | 14 strength 3, stamina 2, handling 2, footyIQ 7 | $132k | -$16k | 859 | 11 | 56.6 | W 14-4 Cairns Cyclones |
| S3 W13 | footyIQ | 2 speed 1, footyIQ 1 | $147k | $15k | 811 | 6 | 57.8 | W 4-0 Toowoomba Thunder |
| S3 W14 | stamina | 4 handling 1, kicking 1, footyIQ 2 | $123k | -$24k | 888 | 7 | 58.1 | W 14-6 Woolloomooloo Wolves |
| S3 W15 | footyIQ | 8 speed 3, strength 2, handling 1, footyIQ 2 | $151k | $28k | 869 | 8 | 58.4 | W 21-0 Redcliffe Reapers |
| S3 W16 | kicking | 14 speed 4, strength 4, handling 5, footyIQ 1 | $139k | -$11k | 820 | 8 | 57.8 | L 8-16 Launceston Larrikins |
| S3 W17 | stamina | 15 speed 2, strength 1, stamina 2, handling 4, footyIQ 6 | $179k | $40k | 890 | 12 | 57.9 | W 8-6 Darwin Drovers |
| S3 W18 | stamina | 4 speed 3, footyIQ 1 | $180k | $507 | 838 | 8 | 58.7 | D 6-6 Southport Stingrays |
| S3 W19 | handling | 5 speed 4, handling 1 | $209k | $30k | 866 | 7 | 58.7 | W 21-19 Broken Hill Brollys |
| S3 W20 | stamina | 9 speed 2, strength 2, handling 1, kicking 1, footyIQ 3 | $198k | -$11k | 895 | 10 | 57.9 | W 18-13 Geelong Gulls |
| S3 W21 | handling | 5 strength 1, handling 1, footyIQ 3 | $241k | $43k | 842 | 8 | 58.8 | W 12-8 Wagga Swagmen |
| S3 W22 | footyIQ | 8 speed 1, strength 1, handling 2, kicking 3, footyIQ 1 | $230k | -$11k | 857 | 8 | 58.0 | W 10-0 Katherine Crocs |
| S3 W23 | footyIQ | 4 speed 2, strength 1, handling 1 | $272k | $42k | 865 | 9 | 58.8 | W 16-6 Shellharbour Scorpions |
| S3 W24 | stamina | 12 speed 3, strength 3, handling 3, footyIQ 3 | $261k | -$11k | 870 | 8 | 58.1 | W 18-4 Dubbo Diggers |
| S3 W25 final | strength | 3 speed 1, strength 1, footyIQ 1 | $305k | $44k | 916 | 11 | 58.1 | W 28-4 Launceston Larrikins |
| S3 W26 final | handling | 6 speed 2, strength 2, handling 1, footyIQ 1 | $348k | $44k | 871 | 7 | 58.9 | W 14-13 Broken Hill Brollys |
| S3 W27 final | kicking | 0 | $544k | $196k | 0 | 0 | 0.0 | W 16-6 Southport Stingrays |
| S4 trial 1 | kicking | 0 | $459k | -$86k | 715 | 1 | 38.2 | W 16-0 Redcliffe Reapers |
| S4 trial 2 | speed | 5 speed 1, stamina 1, handling 1, footyIQ 2 | $408k | -$51k | 865 | 10 | 41.3 | W 6-4 Broken Hill Brollys |
| S4 W1 | speed | 8 speed 1, stamina 1, handling 3, footyIQ 3 | $408k | -$160 | 843 | 8 | 43.8 | L 0-7 Launceston Larrikins |
| S4 W2 | strength | 3 strength 1, handling 1, footyIQ 1 | $370k | -$38k | 850 | 7 | 45.8 | L 4-5 Darwin Drovers |
| S4 W3 | stamina | 6 speed 1, handling 3, footyIQ 2 | $378k | $8.0k | 903 | 10 | 48.6 | W 26-4 Southport Stingrays |
| S4 W4 | kicking | 14 speed 4, strength 2, handling 4, kicking 2, footyIQ 2 | $349k | -$28k | 853 | 8 | 50.0 | L 4-12 Broken Hill Brollys |
| S4 W5 | speed | 14 speed 3, strength 4, stamina 1, handling 5, footyIQ 1 | $366k | $17k | 853 | 9 | 52.3 | W 17-10 Geelong Gulls |
| S4 W6 | kicking | 8 speed 3, handling 1, kicking 1, footyIQ 3 | $342k | -$24k | 812 | 8 | 54.4 | W 21-12 Wagga Swagmen |
| S4 W7 | stamina | 5 speed 2, strength 1, footyIQ 2 | $362k | $20k | 764 | 6 | 55.0 | W 18-8 Katherine Crocs |
| S4 W8 | strength | 9 speed 2, strength 3, stamina 1, kicking 1, footyIQ 2 | $341k | -$21k | 732 | 7 | 55.6 | W 10-0 Shellharbour Scorpions |
| S4 W9 | footyIQ | 11 speed 3, stamina 1, handling 3, kicking 1, footyIQ 3 | $354k | $13k | 676 | 8 | 57.6 | D 4-4 Dubbo Diggers |
| S4 W10 | footyIQ | 5 speed 1, stamina 1, footyIQ 3 | $335k | -$20k | 707 | 5 | 57.8 | W 10-4 Mackay Marlins |
| S4 W11 | kicking | 6 speed 1, stamina 1, handling 4 | $312k | -$22k | 696 | 6 | 58.1 | W 14-4 Ballarat Bushrangers |
| S4 W12 | speed | 7 speed 2, strength 1, stamina 1, footyIQ 3 | $297k | -$15k | 658 | 6 | 57.9 | L 11-12 Cairns Cyclones |
| S4 W13 | speed | 2 kicking 1, footyIQ 1 | $342k | $45k | 632 | 7 | 57.9 | L 4-12 Toowoomba Thunder |
| S4 W14 | handling | 4 speed 1, strength 2, kicking 1 | $345k | $2.7k | 652 | 7 | 57.9 | L 0-12 Woolloomooloo Wolves |
| S4 W15 | footyIQ | 4 strength 2, handling 1, footyIQ 1 | $388k | $43k | 661 | 6 | 59.1 | W 5-4 Redcliffe Reapers |
| S4 W16 | handling | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $377k | -$11k | 656 | 7 | 58.2 | L 4-10 Launceston Larrikins |
| S4 W17 | handling | 20 speed 7, stamina 1, handling 2, kicking 2, footyIQ 8 | $420k | $43k | 701 | 6 | 59.5 | W 24-0 Darwin Drovers |
| S4 W18 | speed | 3 handling 2, footyIQ 1 | $411k | -$9.6k | 665 | 5 | 58.5 | W 4-0 Southport Stingrays |
| S4 W19 | footyIQ | 6 speed 2, strength 1, footyIQ 3 | $455k | $45k | 684 | 10 | 58.5 | W 14-6 Broken Hill Brollys |
| S4 W20 | stamina | 4 handling 2, footyIQ 2 | $457k | $1.7k | 652 | 3 | 59.7 | W 4-0 Geelong Gulls |
| S4 W21 | speed | 3 strength 1, kicking 1, footyIQ 1 | $496k | $39k | 607 | 6 | 58.5 | D 4-4 Wagga Swagmen |
| S4 W22 | strength | 4 strength 1, kicking 1, footyIQ 2 | $498k | $2.0k | 705 | 11 | 59.7 | W 20-6 Katherine Crocs |
| S4 W23 | handling | 1 handling 1 | $529k | $31k | 637 | 3 | 59.7 | D 4-4 Shellharbour Scorpions |
| S4 W24 | stamina | 6 speed 1, strength 2, kicking 1, footyIQ 2 | $519k | -$10k | 726 | 6 | 58.6 | W 28-6 Dubbo Diggers |
| S4 W25 final | handling | 4 speed 1, stamina 2, footyIQ 1 | $563k | $44k | 637 | 9 | 59.8 | L 10-12 Ballarat Bushrangers |
| S4 W26 final | stamina | 8 speed 4, strength 1, stamina 1, kicking 1, footyIQ 1 | $553k | -$10k | 213 | 4 | 58.7 | no match |
| S4 W27 final | footyIQ | 0 | $581k | $28k | 0 | 0 | 0.0 | no match |
| S5 trial 1 | stamina | 0 | $495k | -$86k | 728 | 1 | 39.4 | W 12-6 Broken Hill Brollys |
| S5 trial 2 | kicking | 4 stamina 1, handling 1, footyIQ 2 | $435k | -$60k | 820 | 9 | 42.7 | L 0-8 Dubbo Diggers |
| S5 W1 | strength | 6 speed 2, strength 2, footyIQ 2 | $424k | -$11k | 880 | 11 | 45.4 | W 14-10 Launceston Larrikins |
| S5 W2 | strength | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $385k | -$39k | 890 | 5 | 47.4 | W 25-0 Darwin Drovers |
| S5 W3 | strength | 9 speed 2, strength 1, handling 3, footyIQ 3 | $402k | $17k | 862 | 10 | 48.7 | W 14-4 Southport Stingrays |
| S5 W4 | handling | 8 speed 4, handling 2, footyIQ 2 | $385k | -$17k | 763 | 8 | 49.4 | L 4-11 Broken Hill Brollys |
| S5 W5 | speed | 6 speed 1, strength 1, handling 2, kicking 1, footyIQ 1 | $406k | $21k | 795 | 7 | 50.2 | W 29-6 Geelong Gulls |
| S5 W6 | stamina | 5 speed 1, handling 1, footyIQ 3 | $389k | -$17k | 691 | 7 | 50.7 | W 7-0 Wagga Swagmen |
| S5 W7 | handling | 3 speed 1, handling 1, kicking 1 | $410k | $21k | 668 | 6 | 52.1 | L 10-13 Katherine Crocs |
| S5 W8 | speed | 6 speed 3, handling 2, footyIQ 1 | $396k | -$14k | 642 | 5 | 52.1 | L 6-8 Shellharbour Scorpions |
| S5 W9 | kicking | 4 speed 1, stamina 1, handling 2 | $404k | $8.4k | 685 | 8 | 54.0 | W 16-6 Dubbo Diggers |
| S5 W10 | handling | 3 speed 2, handling 1 | $375k | -$29k | 632 | 5 | 55.7 | L 4-6 Mackay Marlins |
| S5 W11 | kicking | 3 stamina 1, handling 1, footyIQ 1 | $394k | $18k | 633 | 3 | 56.2 | W 12-0 Ballarat Bushrangers |
| S5 W12 | handling | 4 stamina 1, handling 2, footyIQ 1 | $391k | -$2.2k | 582 | 8 | 57.3 | L 0-1 Cairns Cyclones |
| S5 W13 | kicking | 4 strength 1, stamina 2, kicking 1 | $423k | $31k | 610 | 5 | 56.5 | D 12-12 Toowoomba Thunder |
| S5 W14 | kicking | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $424k | $1.1k | 634 | 10 | 57.6 | W 18-4 Woolloomooloo Wolves |
| S5 W15 | footyIQ | 4 speed 1, handling 2, kicking 1 | $456k | $32k | 591 | 4 | 56.7 | W 7-6 Redcliffe Reapers |
| S5 W16 | speed | 0 | $458k | $2.8k | 620 | 4 | 56.6 | W 14-6 Launceston Larrikins |
| S5 W17 | speed | 1 footyIQ 1 | $503k | $45k | 605 | 8 | 56.6 | W 6-0 Darwin Drovers |
| S5 W18 | footyIQ | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $506k | $2.8k | 574 | 2 | 56.7 | W 6-0 Southport Stingrays |
| S5 W19 | kicking | 5 speed 1, stamina 1, footyIQ 3 | $550k | $44k | 587 | 10 | 57.7 | W 16-0 Broken Hill Brollys |
| S5 W20 | handling | 7 handling 2, kicking 2, footyIQ 3 | $539k | -$11k | 551 | 6 | 56.8 | L 0-12 Geelong Gulls |
| S5 W21 | stamina | 4 speed 1, handling 1, kicking 1, footyIQ 1 | $583k | $44k | 568 | 8 | 57.8 | L 6-10 Wagga Swagmen |
| S5 W22 | kicking | 3 strength 1, stamina 1, footyIQ 1 | $569k | -$15k | 607 | 3 | 56.8 | W 17-12 Katherine Crocs |
| S5 W23 | speed | 2 speed 1, stamina 1 | $614k | $45k | 573 | 5 | 56.9 | L 6-10 Shellharbour Scorpions |
| S5 W24 | stamina | 3 strength 1, handling 1, footyIQ 1 | $621k | $7.4k | 645 | 7 | 57.9 | W 26-0 Dubbo Diggers |
| S5 W25 final | stamina | 5 handling 2, kicking 1, footyIQ 2 | $653k | $32k | 613 | 8 | 56.9 | W 10-4 Redcliffe Reapers |
| S5 W26 final | handling | 4 speed 2, stamina 1, handling 1 | $698k | $45k | 663 | 6 | 56.9 | W 26-0 Southport Stingrays |
| S5 W27 final | footyIQ | 0 | $823k | $125k | 0 | 0 | 0.0 | L 6-12 Geelong Gulls |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $36k | -$24k | 652 | 0.60 | 50.3 | 57.0 | 0.0% | 45.0% |
| S1 trial 2 | 20 | $15k | -$21k | 660 | 5.85 | 51.0 | 58.2 | 0.0% | 40.0% |
| S1 W1 | 20 | $29k | $15k | 680 | 4.85 | 51.1 | 58.5 | 0.0% | 75.0% |
| S1 W2 | 20 | $8.7k | -$21k | 677 | 6.55 | 51.5 | 59.1 | 0.0% | 40.0% |
| S1 W3 | 20 | $37k | $28k | 678 | 5.00 | 51.6 | 59.2 | 0.0% | 55.0% |
| S1 W4 | 20 | $15k | -$22k | 693 | 6.25 | 51.8 | 59.3 | 0.0% | 60.0% |
| S1 W5 | 20 | $35k | $20k | 690 | 7.65 | 52.0 | 59.6 | 0.0% | 50.0% |
| S1 W6 | 20 | $13k | -$22k | 686 | 6.75 | 52.5 | 60.5 | 0.0% | 45.0% |
| S1 W7 | 20 | $36k | $23k | 686 | 5.45 | 52.7 | 60.7 | 0.0% | 40.0% |
| S1 W8 | 20 | $15k | -$21k | 696 | 8.60 | 53.0 | 60.9 | 0.0% | 55.0% |
| S1 W9 | 20 | $34k | $19k | 699 | 5.60 | 53.1 | 61.2 | 0.0% | 75.0% |
| S1 W10 | 20 | $11k | -$23k | 695 | 6.65 | 53.6 | 62.1 | 0.0% | 55.0% |
| S1 W11 | 20 | $36k | $25k | 693 | 5.50 | 53.5 | 62.2 | 0.0% | 45.0% |
| S1 W12 | 20 | $13k | -$23k | 720 | 7.50 | 53.8 | 62.5 | 0.0% | 50.0% |
| S1 W13 | 20 | $41k | $28k | 704 | 6.55 | 53.9 | 62.7 | 0.0% | 35.0% |
| S1 W14 | 20 | $18k | -$23k | 738 | 6.50 | 54.3 | 63.4 | 0.0% | 25.0% |
| S1 W15 | 20 | $40k | $22k | 739 | 7.25 | 54.4 | 63.5 | 0.0% | 40.0% |
| S1 W16 | 20 | $21k | -$18k | 767 | 7.10 | 54.6 | 63.7 | 0.0% | 85.0% |
| S1 W17 | 20 | $40k | $19k | 741 | 6.80 | 54.7 | 64.0 | 0.0% | 35.0% |
| S1 W18 | 20 | $26k | -$14k | 743 | 8.60 | 55.0 | 64.3 | 0.0% | 25.0% |
| S1 W19 | 20 | $47k | $21k | 762 | 7.15 | 55.0 | 64.4 | 0.0% | 60.0% |
| S1 W20 | 20 | $37k | -$10k | 781 | 6.95 | 55.3 | 64.6 | 0.0% | 75.0% |
| S1 W21 | 20 | $56k | $19k | 775 | 7.60 | 55.5 | 64.8 | 0.0% | 60.0% |
| S1 W22 | 20 | $43k | -$13k | 777 | 7.40 | 55.7 | 65.0 | 0.0% | 65.0% |
| S1 W23 | 20 | $66k | $23k | 778 | 7.60 | 55.9 | 65.1 | 0.0% | 60.0% |
| S1 W24 | 20 | $56k | -$9.9k | 778 | 7.35 | 55.9 | 65.3 | 0.0% | 60.0% |
| S1 W25 final | 20 | $64k | $7.9k | 626 | 6.90 | 56.0 | 65.4 | 0.0% | 57.1% |
| S1 W26 final | 20 | $67k | $3.0k | 473 | 5.05 | 56.1 | 65.5 | 0.0% | 75.0% |
| S1 W27 final | 20 | $131k | $64k | 119 | 1.00 | 54.3 | 54.7 | 0.0% | 50.0% |
| S2 trial 1 | 20 | $106k | -$25k | 599 | 4.85 | 49.6 | 55.4 | 0.0% | 25.0% |
| S2 trial 2 | 20 | $91k | -$15k | 669 | 5.20 | 50.4 | 57.2 | 0.0% | 45.0% |
| S2 W1 | 20 | $108k | $17k | 685 | 7.90 | 50.9 | 58.5 | 0.0% | 75.0% |
| S2 W2 | 20 | $85k | -$23k | 680 | 6.00 | 51.8 | 60.5 | 0.0% | 50.0% |
| S2 W3 | 20 | $107k | $22k | 668 | 7.20 | 52.6 | 61.3 | 0.0% | 65.0% |
| S2 W4 | 20 | $87k | -$20k | 688 | 6.25 | 53.2 | 62.2 | 0.0% | 80.0% |
| S2 W5 | 20 | $104k | $16k | 669 | 6.80 | 53.7 | 62.9 | 0.0% | 45.0% |
| S2 W6 | 20 | $82k | -$21k | 688 | 6.05 | 54.3 | 63.7 | 0.0% | 70.0% |
| S2 W7 | 20 | $107k | $25k | 687 | 7.25 | 54.6 | 63.8 | 0.0% | 70.0% |
| S2 W8 | 20 | $90k | -$18k | 689 | 6.40 | 54.8 | 64.1 | 0.0% | 35.0% |
| S2 W9 | 20 | $102k | $13k | 710 | 6.25 | 55.5 | 64.8 | 0.0% | 55.0% |
| S2 W10 | 20 | $81k | -$21k | 728 | 6.95 | 56.2 | 65.4 | 0.0% | 55.0% |
| S2 W11 | 20 | $103k | $22k | 726 | 7.45 | 56.2 | 65.5 | 0.0% | 55.0% |
| S2 W12 | 20 | $85k | -$18k | 719 | 7.05 | 56.6 | 65.7 | 0.0% | 50.0% |
| S2 W13 | 20 | $100k | $15k | 730 | 6.35 | 56.9 | 66.1 | 0.0% | 60.0% |
| S2 W14 | 20 | $78k | -$23k | 719 | 6.80 | 57.4 | 66.5 | 0.0% | 30.0% |
| S2 W15 | 20 | $103k | $25k | 744 | 7.10 | 57.5 | 66.6 | 0.0% | 35.0% |
| S2 W16 | 20 | $84k | -$19k | 774 | 7.15 | 57.6 | 66.8 | 0.0% | 60.0% |
| S2 W17 | 20 | $103k | $19k | 770 | 7.50 | 57.6 | 67.0 | 0.0% | 60.0% |
| S2 W18 | 20 | $86k | -$17k | 779 | 7.20 | 58.0 | 67.4 | 0.0% | 60.0% |
| S2 W19 | 20 | $109k | $23k | 791 | 7.70 | 58.0 | 67.5 | 0.0% | 65.0% |
| S2 W20 | 20 | $98k | -$11k | 793 | 8.20 | 58.1 | 67.6 | 0.0% | 70.0% |
| S2 W21 | 20 | $121k | $23k | 781 | 7.45 | 58.4 | 67.8 | 0.0% | 55.0% |
| S2 W22 | 20 | $107k | -$14k | 785 | 7.10 | 58.4 | 68.0 | 0.0% | 40.0% |
| S2 W23 | 20 | $136k | $29k | 795 | 8.05 | 58.4 | 68.1 | 0.0% | 55.0% |
| S2 W24 | 20 | $128k | -$8.2k | 787 | 8.35 | 58.4 | 68.2 | 0.0% | 55.0% |
| S2 W25 final | 20 | $142k | $15k | 742 | 6.70 | 58.4 | 68.4 | 0.0% | 72.2% |
| S2 W26 final | 20 | $151k | $9.1k | 591 | 5.65 | 58.6 | 68.5 | 0.0% | 23.1% |
| S2 W27 final | 20 | $192k | $41k | 53 | 0.90 | 55.2 | 55.2 | 0.0% | 66.7% |
| S3 trial 1 | 20 | $150k | -$43k | 673 | 2.60 | 43.8 | 49.3 | 0.0% | 50.0% |
| S3 trial 2 | 20 | $129k | -$21k | 774 | 7.75 | 45.3 | 52.5 | 0.0% | 55.0% |
| S3 W1 | 20 | $146k | $17k | 785 | 8.25 | 46.3 | 54.8 | 0.0% | 60.0% |
| S3 W2 | 20 | $120k | -$26k | 770 | 6.35 | 47.8 | 58.2 | 0.0% | 50.0% |
| S3 W3 | 20 | $140k | $21k | 763 | 8.55 | 48.5 | 60.0 | 0.0% | 70.0% |
| S3 W4 | 20 | $119k | -$21k | 737 | 6.75 | 49.7 | 62.2 | 0.0% | 60.0% |
| S3 W5 | 20 | $139k | $20k | 742 | 7.75 | 50.4 | 63.4 | 0.0% | 80.0% |
| S3 W6 | 20 | $117k | -$22k | 729 | 5.65 | 51.4 | 64.9 | 0.0% | 45.0% |
| S3 W7 | 20 | $140k | $24k | 710 | 8.20 | 52.1 | 65.4 | 0.0% | 60.0% |
| S3 W8 | 20 | $122k | -$19k | 714 | 6.80 | 52.8 | 66.2 | 0.0% | 70.0% |
| S3 W9 | 20 | $140k | $18k | 685 | 6.65 | 53.5 | 66.8 | 0.0% | 55.0% |
| S3 W10 | 20 | $117k | -$23k | 703 | 5.90 | 54.3 | 67.6 | 0.0% | 50.0% |
| S3 W11 | 20 | $139k | $21k | 702 | 6.85 | 54.5 | 67.8 | 0.0% | 45.0% |
| S3 W12 | 20 | $121k | -$18k | 711 | 6.50 | 54.9 | 68.0 | 0.0% | 45.0% |
| S3 W13 | 20 | $140k | $19k | 716 | 7.50 | 55.4 | 68.3 | 0.0% | 60.0% |
| S3 W14 | 20 | $120k | -$20k | 718 | 6.25 | 55.8 | 68.6 | 0.0% | 40.0% |
| S3 W15 | 20 | $144k | $25k | 724 | 6.75 | 56.1 | 68.7 | 0.0% | 55.0% |
| S3 W16 | 20 | $128k | -$16k | 731 | 6.90 | 56.4 | 68.9 | 0.0% | 55.0% |
| S3 W17 | 20 | $150k | $22k | 747 | 7.55 | 56.6 | 69.1 | 0.0% | 65.0% |
| S3 W18 | 20 | $137k | -$13k | 737 | 6.90 | 57.1 | 69.4 | 0.0% | 40.0% |
| S3 W19 | 20 | $163k | $26k | 754 | 7.00 | 57.1 | 69.5 | 0.0% | 80.0% |
| S3 W20 | 20 | $153k | -$9.9k | 750 | 8.30 | 57.2 | 69.6 | 0.0% | 40.0% |
| S3 W21 | 20 | $184k | $30k | 760 | 7.35 | 57.3 | 69.8 | 0.0% | 65.0% |
| S3 W22 | 20 | $175k | -$8.5k | 757 | 7.40 | 57.6 | 69.9 | 0.0% | 55.0% |
| S3 W23 | 20 | $206k | $31k | 780 | 7.60 | 57.8 | 70.0 | 0.0% | 80.0% |
| S3 W24 | 20 | $198k | -$8.4k | 765 | 7.15 | 57.8 | 70.2 | 0.0% | 75.0% |
| S3 W25 final | 20 | $220k | $23k | 644 | 6.00 | 58.0 | 70.3 | 0.0% | 73.3% |
| S3 W26 final | 20 | $233k | $12k | 529 | 5.30 | 58.1 | 70.4 | 0.0% | 63.6% |
| S3 W27 final | 20 | $309k | $77k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 71.4% |
| S4 trial 1 | 18 | $279k | -$64k | 696 | 0.78 | 38.1 | 41.0 | 0.0% | 44.4% |
| S4 trial 2 | 18 | $241k | -$38k | 884 | 10.17 | 40.5 | 45.3 | 0.0% | 38.9% |
| S4 W1 | 18 | $249k | $8.0k | 880 | 9.22 | 42.4 | 49.1 | 0.0% | 55.6% |
| S4 W2 | 18 | $219k | -$30k | 859 | 6.39 | 44.3 | 53.2 | 0.0% | 55.6% |
| S4 W3 | 18 | $238k | $19k | 841 | 9.00 | 45.6 | 56.1 | 0.0% | 44.4% |
| S4 W4 | 18 | $216k | -$23k | 836 | 8.67 | 47.1 | 59.3 | 0.0% | 44.4% |
| S4 W5 | 18 | $231k | $16k | 797 | 7.50 | 48.3 | 62.2 | 0.0% | 61.1% |
| S4 W6 | 18 | $210k | -$22k | 782 | 7.17 | 49.6 | 65.0 | 0.0% | 55.6% |
| S4 W7 | 18 | $233k | $23k | 746 | 7.61 | 50.2 | 66.8 | 0.0% | 38.9% |
| S4 W8 | 18 | $214k | -$19k | 741 | 6.44 | 51.0 | 67.5 | 0.0% | 61.1% |
| S4 W9 | 18 | $228k | $15k | 721 | 7.89 | 52.2 | 68.7 | 0.0% | 55.6% |
| S4 W10 | 18 | $207k | -$22k | 723 | 6.06 | 53.0 | 69.5 | 0.0% | 55.6% |
| S4 W11 | 18 | $229k | $22k | 713 | 6.89 | 53.5 | 69.7 | 0.0% | 72.2% |
| S4 W12 | 18 | $213k | -$16k | 703 | 7.22 | 53.9 | 70.1 | 0.0% | 44.4% |
| S4 W13 | 18 | $236k | $23k | 710 | 6.00 | 54.5 | 70.5 | 0.0% | 44.4% |
| S4 W14 | 18 | $218k | -$18k | 726 | 7.28 | 55.1 | 70.9 | 0.0% | 44.4% |
| S4 W15 | 18 | $249k | $31k | 719 | 7.06 | 55.4 | 71.0 | 0.0% | 50.0% |
| S4 W16 | 18 | $238k | -$11k | 726 | 7.22 | 55.7 | 71.2 | 0.0% | 61.1% |
| S4 W17 | 18 | $266k | $28k | 724 | 6.67 | 56.2 | 71.5 | 0.0% | 50.0% |
| S4 W18 | 18 | $255k | -$11k | 741 | 7.61 | 56.2 | 71.7 | 0.0% | 61.1% |
| S4 W19 | 18 | $292k | $37k | 735 | 7.06 | 56.5 | 71.7 | 0.0% | 61.1% |
| S4 W20 | 18 | $285k | -$7.1k | 738 | 7.06 | 56.6 | 71.9 | 0.0% | 61.1% |
| S4 W21 | 18 | $320k | $35k | 730 | 7.06 | 56.9 | 72.0 | 0.0% | 55.6% |
| S4 W22 | 18 | $313k | -$6.5k | 733 | 7.06 | 57.1 | 72.1 | 0.0% | 38.9% |
| S4 W23 | 18 | $348k | $35k | 740 | 7.22 | 57.1 | 72.2 | 0.0% | 66.7% |
| S4 W24 | 18 | $342k | -$6.5k | 735 | 7.50 | 57.3 | 72.3 | 0.0% | 61.1% |
| S4 W25 final | 18 | $361k | $20k | 633 | 6.94 | 57.2 | 72.4 | 0.0% | 71.4% |
| S4 W26 final | 18 | $374k | $12k | 521 | 4.28 | 57.3 | 72.4 | 0.0% | 70.0% |
| S4 W27 final | 18 | $444k | $70k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 71.4% |
| S5 trial 1 | 15 | $426k | -$80k | 725 | 0.93 | 38.4 | 41.7 | 0.0% | 80.0% |
| S5 trial 2 | 15 | $379k | -$46k | 876 | 9.80 | 41.5 | 47.0 | 0.0% | 53.3% |
| S5 W1 | 15 | $380k | $937 | 853 | 9.60 | 43.8 | 51.6 | 0.0% | 40.0% |
| S5 W2 | 15 | $348k | -$33k | 867 | 5.87 | 45.6 | 55.7 | 0.0% | 86.7% |
| S5 W3 | 15 | $361k | $14k | 842 | 9.13 | 47.6 | 59.2 | 0.0% | 60.0% |
| S5 W4 | 15 | $338k | -$23k | 806 | 8.40 | 49.0 | 62.4 | 0.0% | 73.3% |
| S5 W5 | 15 | $353k | $14k | 788 | 8.00 | 50.5 | 65.8 | 0.0% | 53.3% |
| S5 W6 | 15 | $329k | -$24k | 778 | 6.73 | 51.8 | 68.7 | 0.0% | 73.3% |
| S5 W7 | 15 | $347k | $18k | 746 | 7.73 | 52.6 | 70.8 | 0.0% | 66.7% |
| S5 W8 | 15 | $330k | -$18k | 731 | 6.60 | 53.4 | 71.0 | 0.0% | 66.7% |
| S5 W9 | 15 | $343k | $14k | 718 | 6.67 | 54.6 | 72.0 | 0.0% | 73.3% |
| S5 W10 | 15 | $320k | -$24k | 711 | 5.93 | 55.4 | 72.6 | 0.0% | 46.7% |
| S5 W11 | 15 | $344k | $25k | 716 | 7.80 | 55.7 | 72.8 | 0.0% | 66.7% |
| S5 W12 | 15 | $332k | -$12k | 718 | 6.47 | 56.3 | 72.9 | 0.0% | 86.7% |
| S5 W13 | 15 | $359k | $27k | 706 | 6.67 | 56.6 | 73.2 | 0.0% | 53.3% |
| S5 W14 | 15 | $350k | -$9.6k | 717 | 7.00 | 56.9 | 73.3 | 0.0% | 53.3% |
| S5 W15 | 15 | $382k | $32k | 708 | 7.00 | 57.0 | 73.5 | 0.0% | 53.3% |
| S5 W16 | 15 | $376k | -$5.6k | 699 | 7.07 | 57.3 | 73.5 | 0.0% | 73.3% |
| S5 W17 | 15 | $409k | $33k | 704 | 7.40 | 57.2 | 73.7 | 0.0% | 46.7% |
| S5 W18 | 15 | $408k | -$923 | 702 | 6.73 | 57.5 | 73.8 | 0.0% | 60.0% |
| S5 W19 | 15 | $445k | $37k | 707 | 6.87 | 57.7 | 73.9 | 0.0% | 66.7% |
| S5 W20 | 15 | $440k | -$5.0k | 706 | 6.40 | 57.5 | 73.9 | 0.0% | 53.3% |
| S5 W21 | 15 | $478k | $38k | 711 | 7.73 | 57.7 | 74.0 | 0.0% | 73.3% |
| S5 W22 | 15 | $473k | -$5.1k | 707 | 6.53 | 57.8 | 74.2 | 0.0% | 60.0% |
| S5 W23 | 15 | $512k | $39k | 694 | 7.07 | 58.0 | 74.3 | 0.0% | 40.0% |
| S5 W24 | 15 | $508k | -$4.2k | 703 | 7.40 | 58.0 | 74.4 | 0.0% | 60.0% |
| S5 W25 final | 15 | $542k | $34k | 640 | 6.33 | 57.8 | 74.5 | 0.0% | 53.8% |
| S5 W26 final | 15 | $561k | $19k | 455 | 3.93 | 58.0 | 74.6 | 0.0% | 57.1% |
| S5 W27 final | 15 | $620k | $59k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 50.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| expansive × slide | 393 | 71.1% | 1989 | 59.2% | 11.9% |  |
| grind × compressed | 1987 | 59.2% | 395 | 71.0% | -11.8% |  |
| kick-chase × slide | 2 | 50.0% | 2380 | 61.2% | -11.2% |  |
| block-play | 282 | 63.5% | 2100 | 60.8% | 2.6% |  |
| block-shift | 198 | 61.6% | 2184 | 61.1% | 0.5% |  |
| chip-chase | 1633 | 61.5% | 749 | 60.4% | 1.1% |  |
| cut-out-winger | 182 | 61.8% | 2200 | 61.1% | 0.7% |  |
| inside-ball | 273 | 63.2% | 2109 | 60.9% | 2.3% |  |
| kick-pass | 1627 | 61.5% | 755 | 60.3% | 1.2% |  |
| second-man | 186 | 61.8% | 2196 | 61.1% | 0.7% |  |
| short-side-raid | 308 | 62.0% | 2074 | 61.0% | 1.0% |  |

### careless/hard/au

- 70 overall (best nine, including recruitment): 83.0 weeks; 12 reached, 8 censored.
- 80 overall (best nine, including recruitment): 58.0 weeks; 1 reached, 19 censored.
- 90 overall (best nine, including recruitment): 58.0 weeks; 1 reached, 19 censored.
- Opening players gaining a star: 108 of 400; median 27.0 weeks among those who did.
- Reaching potential stars: 105 of 400 (92 already there at week 0); median 66.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/169; S3 0/0; S5 0/0.
- Mean XP per completed season 18824; mean level-ups per completed season 176.5.
- Cash: opening 45000; mean weekly change 2077; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 81; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $207k after opening at $45k, and no career went into debt.

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 46814 |
| gate | 433807 |
| prize | 41259 |
| boardGrant | 9778 |
| events | -456 |
| transfers | -446331 |
| contracts | -20869 |
| facilities | -3778 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | handling | 0 | $28k | -$17k | 520 | 0 | 45.9 | W 7-0 Dubbo Diggers |
| S1 trial 2 | kicking | 0 | $7.6k | -$21k | 536 | 3 | 46.5 | W 10-0 Wagga Swagmen |
| S1 W1 | footyIQ | 6 speed 2, strength 2, footyIQ 2 | $34k | $26k | 548 | 5 | 46.6 | W 20-0 Launceston Larrikins |
| S1 W2 | speed | 3 speed 1, strength 1, footyIQ 1 | $7.3k | -$27k | 653 | 5 | 47.5 | W 12-11 Darwin Drovers |
| S1 W3 | stamina | 4 speed 1, stamina 1, handling 1, kicking 1 | $42k | $34k | 583 | 5 | 47.5 | L 8-10 Southport Stingrays |
| S1 W4 | handling | 5 speed 5 | $20k | -$22k | 617 | 6 | 48.4 | W 6-4 Broken Hill Brollys |
| S1 W5 | handling | 8 speed 1, strength 1, stamina 3, handling 2, footyIQ 1 | $37k | $17k | 616 | 7 | 48.8 | W 4-0 Geelong Gulls |
| S1 W6 | kicking | 4 strength 2, footyIQ 2 | $16k | -$21k | 610 | 5 | 49.4 | L 6-15 Wagga Swagmen |
| S1 W7 | stamina | 7 speed 1, strength 2, stamina 1, kicking 1, footyIQ 2 | $33k | $17k | 610 | 6 | 49.4 | L 6-16 Katherine Crocs |
| S1 W8 | stamina | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $11k | -$22k | 731 | 6 | 49.9 | W 15-6 Shellharbour Scorpions |
| S1 W9 | stamina | 6 speed 3, stamina 1, footyIQ 2 | $30k | $19k | 681 | 6 | 50.4 | D 4-4 Dubbo Diggers |
| S1 W10 | footyIQ | 0 | $3.4k | -$26k | 774 | 6 | 50.9 | W 8-4 Mackay Marlins |
| S1 W11 | footyIQ | 13 speed 3, strength 1, stamina 1, handling 2, kicking 3, footyIQ 3 | $35k | $31k | 744 | 8 | 51.0 | L 0-1 Ballarat Bushrangers |
| S1 W12 | stamina | 9 speed 1, strength 1, stamina 3, handling 1, footyIQ 3 | $7.4k | -$27k | 778 | 11 | 51.8 | D 0-0 Cairns Cyclones |
| S1 W13 | handling | 10 speed 5, strength 3, handling 2 | $40k | $33k | 817 | 4 | 51.8 | L 6-12 Toowoomba Thunder |
| S1 W14 | stamina | 3 strength 2, handling 1 | $12k | -$28k | 796 | 9 | 52.6 | L 6-16 Woolloomooloo Wolves |
| S1 W15 | speed | 7 speed 1, strength 1, stamina 1, handling 3, footyIQ 1 | $29k | $17k | 825 | 7 | 51.9 | W 7-6 Redcliffe Reapers |
| S1 W16 | strength | 14 speed 3, strength 4, handling 4, footyIQ 3 | $13k | -$16k | 801 | 10 | 52.6 | L 4-6 Launceston Larrikins |
| S1 W17 | strength | 7 speed 2, strength 2, handling 1, footyIQ 2 | $29k | $16k | 842 | 7 | 52.0 | W 11-6 Darwin Drovers |
| S1 W18 | handling | 8 speed 3, handling 1, footyIQ 4 | $8.3k | -$21k | 794 | 8 | 52.4 | L 0-10 Southport Stingrays |
| S1 W19 | footyIQ | 10 speed 3, strength 1, handling 3, footyIQ 3 | $33k | $25k | 815 | 6 | 52.4 | W 4-0 Broken Hill Brollys |
| S1 W20 | speed | 6 speed 2, strength 1, handling 1, footyIQ 2 | $16k | -$17k | 830 | 9 | 53.1 | W 10-7 Geelong Gulls |
| S1 W21 | kicking | 8 strength 3, handling 2, kicking 2, footyIQ 1 | $28k | $12k | 812 | 7 | 53.0 | W 5-4 Wagga Swagmen |
| S1 W22 | strength | 5 speed 1, strength 2, stamina 1, handling 1 | $30k | $1.2k | 794 | 10 | 53.0 | L 0-10 Katherine Crocs |
| S1 W23 | speed | 5 speed 2, strength 1, kicking 2 | $50k | $20k | 843 | 7 | 53.5 | W 6-0 Shellharbour Scorpions |
| S1 W24 | handling | 7 speed 3, stamina 1, handling 1, footyIQ 2 | $33k | -$17k | 819 | 5 | 53.5 | L 7-8 Dubbo Diggers |
| S1 W25 final | handling | 5 stamina 1, handling 1, kicking 1, footyIQ 2 | $34k | $1.2k | 838 | 9 | 53.6 | W 6-0 Katherine Crocs |
| S1 W26 final | kicking | 12 speed 2, strength 3, stamina 1, handling 4, kicking 1, footyIQ 1 | $34k | $733 | 809 | 10 | 54.1 | L 6-10 Toowoomba Thunder |
| S1 W27 final | speed | 1 speed 1 | $73k | $39k | 77 | 2 | 48.3 | no match |
| S2 trial 1 | strength | 4 speed 1, strength 2, handling 1 | $23k | -$50k | 640 | 3 | 44.7 | W 16-12 Mackay Marlins |
| S2 trial 2 | speed | 5 strength 1, stamina 1, handling 1, footyIQ 2 | $8.9k | -$14k | 627 | 5 | 46.0 | D 4-4 Katherine Crocs |
| S2 W1 | kicking | 4 strength 2, stamina 1, kicking 1 | $39k | $30k | 637 | 7 | 46.1 | W 20-11 Launceston Larrikins |
| S2 W2 | handling | 7 speed 3, strength 2, footyIQ 2 | $15k | -$23k | 668 | 7 | 47.4 | W 20-6 Darwin Drovers |
| S2 W3 | handling | 7 speed 1, strength 3, handling 1, footyIQ 2 | $34k | $19k | 588 | 5 | 47.2 | W 10-7 Southport Stingrays |
| S2 W4 | stamina | 5 strength 1, stamina 1, kicking 1, footyIQ 2 | $2.6k | -$31k | 629 | 5 | 49.1 | W 10-7 Broken Hill Brollys |
| S2 W5 | stamina | 9 speed 2, strength 3, stamina 2, handling 1, footyIQ 1 | $46k | $43k | 613 | 8 | 49.2 | W 12-7 Geelong Gulls |
| S2 W6 | handling | 2 footyIQ 2 | $17k | -$29k | 652 | 6 | 50.3 | W 22-10 Wagga Swagmen |
| S2 W7 | footyIQ | 8 speed 2, handling 3, kicking 1, footyIQ 2 | $53k | $35k | 619 | 7 | 50.4 | L 4-14 Katherine Crocs |
| S2 W8 | handling | 4 speed 1, strength 2, kicking 1 | $36k | -$17k | 677 | 5 | 50.7 | W 10-4 Shellharbour Scorpions |
| S2 W9 | footyIQ | 6 speed 2, strength 2, footyIQ 2 | $43k | $7.2k | 708 | 7 | 52.5 | W 19-7 Dubbo Diggers |
| S2 W10 | handling | 7 speed 3, handling 1, kicking 1, footyIQ 2 | $20k | -$23k | 720 | 6 | 53.1 | L 6-11 Mackay Marlins |
| S2 W11 | stamina | 6 speed 1, strength 2, stamina 1, handling 2 | $34k | $15k | 716 | 7 | 54.3 | W 12-0 Ballarat Bushrangers |
| S2 W12 | kicking | 4 strength 1, handling 1, footyIQ 2 | $18k | -$17k | 716 | 7 | 54.5 | W 10-0 Cairns Cyclones |
| S2 W13 | strength | 7 speed 2, strength 2, handling 3 | $36k | $19k | 714 | 5 | 54.7 | D 0-0 Toowoomba Thunder |
| S2 W14 | strength | 9 speed 2, strength 3, stamina 1, footyIQ 3 | $10k | -$26k | 749 | 10 | 56.3 | W 15-2 Woolloomooloo Wolves |
| S2 W15 | strength | 8 speed 2, strength 3, stamina 1, footyIQ 2 | $47k | $36k | 689 | 4 | 56.4 | L 6-10 Redcliffe Reapers |
| S2 W16 | stamina | 6 stamina 3, handling 1, footyIQ 2 | $29k | -$17k | 690 | 10 | 56.5 | W 9-4 Launceston Larrikins |
| S2 W17 | stamina | 9 speed 1, strength 1, stamina 1, handling 2, kicking 2, footyIQ 2 | $34k | $4.8k | 669 | 6 | 57.1 | W 7-0 Darwin Drovers |
| S2 W18 | handling | 3 speed 1, stamina 1, handling 1 | $4.5k | -$30k | 666 | 4 | 57.1 | L 0-6 Southport Stingrays |
| S2 W19 | handling | 9 speed 2, strength 1, stamina 1, handling 3, footyIQ 2 | $35k | $31k | 675 | 5 | 57.2 | L 4-5 Broken Hill Brollys |
| S2 W20 | handling | 6 speed 2, strength 1, footyIQ 3 | $18k | -$18k | 704 | 7 | 57.9 | W 14-6 Geelong Gulls |
| S2 W21 | speed | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $33k | $16k | 684 | 9 | 57.7 | L 4-6 Wagga Swagmen |
| S2 W22 | stamina | 10 speed 1, strength 4, handling 1, kicking 1, footyIQ 3 | $12k | -$21k | 733 | 8 | 57.9 | W 27-6 Katherine Crocs |
| S2 W23 | handling | 5 strength 1, handling 2, footyIQ 2 | $30k | $18k | 707 | 5 | 57.0 | W 12-6 Shellharbour Scorpions |
| S2 W24 | stamina | 4 stamina 1, kicking 1, footyIQ 2 | $12k | -$18k | 771 | 6 | 57.8 | W 36-11 Dubbo Diggers |
| S2 W25 final | speed | 6 speed 1, strength 4, stamina 1 | $44k | $32k | 699 | 7 | 57.9 | W 8-4 Cairns Cyclones |
| S2 W26 final | handling | 7 strength 3, handling 1, footyIQ 3 | $67k | $23k | 733 | 8 | 58.6 | W 24-20 Redcliffe Reapers |
| S2 W27 final | handling | 1 handling 1 | $238k | $171k | 33 | 1 | 53.9 | W 21-8 Woolloomooloo Wolves |
| S3 trial 1 | stamina | 0 | $180k | -$59k | 650 | 2 | 41.9 | L 0-16 Toowoomba Thunder |
| S3 trial 2 | speed | 5 speed 1, strength 1, footyIQ 3 | $159k | -$21k | 848 | 9 | 43.9 | W 10-7 Cairns Cyclones |
| S3 W1 | strength | 6 speed 1, strength 3, handling 1, footyIQ 1 | $173k | $14k | 808 | 8 | 45.5 | W 8-7 Launceston Larrikins |
| S3 W2 | strength | 7 speed 1, strength 3, handling 1, footyIQ 2 | $146k | -$26k | 746 | 3 | 47.6 | W 12-0 Darwin Drovers |
| S3 W3 | strength | 9 speed 1, strength 2, stamina 3, handling 2, kicking 1 | $167k | $20k | 712 | 12 | 49.3 | L 4-10 Southport Stingrays |
| S3 W4 | handling | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $146k | -$21k | 709 | 5 | 50.9 | W 12-6 Broken Hill Brollys |
| S3 W5 | speed | 9 speed 3, strength 2, stamina 1, handling 2, kicking 1 | $154k | $7.9k | 639 | 7 | 53.3 | D 6-6 Geelong Gulls |
| S3 W6 | handling | 7 stamina 2, handling 1, footyIQ 4 | $134k | -$20k | 579 | 6 | 54.8 | D 0-0 Wagga Swagmen |
| S3 W7 | strength | 2 strength 2 | $158k | $24k | 550 | 3 | 56.0 | W 21-6 Katherine Crocs |
| S3 W8 | speed | 3 strength 1, stamina 1, handling 1 | $141k | -$16k | 552 | 7 | 56.0 | W 10-0 Shellharbour Scorpions |
| S3 W9 | stamina | 5 speed 2, strength 2, handling 1 | $150k | $8.5k | 567 | 3 | 56.9 | L 0-18 Dubbo Diggers |
| S3 W10 | handling | 2 footyIQ 2 | $126k | -$24k | 617 | 5 | 57.2 | W 12-4 Mackay Marlins |
| S3 W11 | handling | 16 speed 1, strength 2, stamina 1, handling 1, kicking 3, footyIQ 8 | $150k | $23k | 561 | 9 | 58.5 | W 4-0 Ballarat Bushrangers |
| S3 W12 | handling | 3 strength 1, handling 1, footyIQ 1 | $132k | -$18k | 637 | 3 | 58.4 | W 14-5 Cairns Cyclones |
| S3 W13 | footyIQ | 9 speed 2, handling 2, footyIQ 5 | $151k | $18k | 734 | 5 | 59.7 | W 22-6 Toowoomba Thunder |
| S3 W14 | footyIQ | 4 speed 1, strength 1, kicking 1, footyIQ 1 | $131k | -$19k | 636 | 7 | 60.6 | L 13-16 Woolloomooloo Wolves |
| S3 W15 | stamina | 5 strength 1, handling 2, footyIQ 2 | $154k | $22k | 665 | 9 | 60.5 | W 12-10 Redcliffe Reapers |
| S3 W16 | handling | 5 speed 1, handling 1, footyIQ 3 | $137k | -$17k | 639 | 5 | 60.3 | L 0-14 Launceston Larrikins |
| S3 W17 | kicking | 11 speed 3, stamina 1, handling 1, footyIQ 6 | $159k | $23k | 712 | 5 | 60.6 | W 12-8 Darwin Drovers |
| S3 W18 | footyIQ | 4 speed 1, handling 1, footyIQ 2 | $139k | -$20k | 665 | 7 | 61.5 | L 6-18 Southport Stingrays |
| S3 W19 | handling | 3 speed 1, footyIQ 2 | $162k | $22k | 661 | 6 | 61.3 | L 12-16 Broken Hill Brollys |
| S3 W20 | kicking | 5 speed 1, strength 1, handling 1, footyIQ 2 | $144k | -$17k | 612 | 5 | 61.9 | L 0-16 Geelong Gulls |
| S3 W21 | speed | 11 speed 3, strength 1, handling 3, kicking 1, footyIQ 3 | $165k | $21k | 706 | 7 | 62.0 | W 16-13 Wagga Swagmen |
| S3 W22 | footyIQ | 2 speed 1, footyIQ 1 | $166k | $1.2k | 668 | 6 | 62.4 | L 0-11 Katherine Crocs |
| S3 W23 | stamina | 4 speed 1, strength 1, kicking 1, footyIQ 1 | $185k | $19k | 707 | 7 | 62.1 | L 14-15 Shellharbour Scorpions |
| S3 W24 | footyIQ | 10 speed 5, strength 1, handling 3, footyIQ 1 | $186k | $1.5k | 684 | 8 | 62.5 | W 10-0 Dubbo Diggers |
| S3 W25 final | stamina | 8 strength 2, stamina 1, handling 2, footyIQ 3 | $213k | $27k | 709 | 5 | 62.3 | L 16-19 Redcliffe Reapers |
| S3 W26 final | kicking | 4 strength 2, stamina 1, kicking 1 | $215k | $1.9k | 212 | 1 | 62.7 | no match |
| S3 W27 final | kicking | 0 | $229k | $14k | 0 | 0 | 0.0 | no match |
| S4 trial 1 | speed | 1 footyIQ 1 | $166k | -$63k | 660 | 1 | 38.5 | W 14-10 Woolloomooloo Wolves |
| S4 trial 2 | footyIQ | 3 handling 3 | $138k | -$28k | 832 | 9 | 41.1 | W 16-12 Dubbo Diggers |
| S4 W1 | handling | 8 speed 2, strength 1, handling 2, footyIQ 3 | $144k | $5.6k | 848 | 8 | 43.4 | W 10-6 Launceston Larrikins |
| S4 W2 | strength | 7 speed 1, strength 2, stamina 1, handling 2, footyIQ 1 | $115k | -$29k | 788 | 4 | 45.2 | W 14-0 Darwin Drovers |
| S4 W3 | speed | 9 speed 2, strength 1, handling 2, kicking 2, footyIQ 2 | $129k | $14k | 739 | 10 | 47.6 | L 4-8 Southport Stingrays |
| S4 W4 | stamina | 5 speed 1, handling 1, kicking 1, footyIQ 2 | $105k | -$24k | 780 | 6 | 48.7 | W 16-7 Broken Hill Brollys |
| S4 W5 | stamina | 13 speed 4, strength 5, handling 2, footyIQ 2 | $118k | $13k | 740 | 12 | 50.1 | L 12-19 Geelong Gulls |
| S4 W6 | speed | 5 speed 1, strength 3, footyIQ 1 | $99k | -$19k | 695 | 4 | 51.7 | W 17-10 Wagga Swagmen |
| S4 W7 | strength | 7 speed 3, handling 2, footyIQ 2 | $120k | $21k | 606 | 6 | 53.1 | L 0-8 Katherine Crocs |
| S4 W8 | handling | 5 speed 1, strength 1, handling 1, kicking 2 | $102k | -$18k | 606 | 5 | 54.5 | W 8-4 Shellharbour Scorpions |
| S4 W9 | speed | 8 speed 3, strength 1, handling 1, kicking 1, footyIQ 2 | $119k | $17k | 607 | 5 | 55.2 | L 10-12 Dubbo Diggers |
| S4 W10 | footyIQ | 5 strength 2, handling 1, kicking 1, footyIQ 1 | $95k | -$24k | 609 | 7 | 56.9 | W 14-0 Mackay Marlins |
| S4 W11 | kicking | 6 speed 1, strength 3, handling 1, kicking 1 | $116k | $21k | 627 | 8 | 57.3 | W 12-4 Ballarat Bushrangers |
| S4 W12 | footyIQ | 6 speed 1, strength 4, handling 1 | $99k | -$17k | 589 | 7 | 57.3 | L 6-10 Cairns Cyclones |
| S4 W13 | handling | 1 speed 1 | $118k | $19k | 569 | 2 | 58.7 | L 6-22 Toowoomba Thunder |
| S4 W14 | handling | 2 stamina 1, footyIQ 1 | $97k | -$21k | 560 | 6 | 60.0 | W 8-4 Woolloomooloo Wolves |
| S4 W15 | speed | 7 speed 1, strength 3, stamina 1, handling 2 | $117k | $21k | 528 | 4 | 61.2 | L 4-6 Redcliffe Reapers |
| S4 W16 | strength | 1 speed 1 | $98k | -$19k | 545 | 5 | 61.0 | D 6-6 Launceston Larrikins |
| S4 W17 | stamina | 8 speed 1, strength 1, handling 2, kicking 1, footyIQ 3 | $109k | $10k | 598 | 7 | 61.5 | W 10-0 Darwin Drovers |
| S4 W18 | strength | 1 speed 1 | $114k | $5.4k | 589 | 5 | 61.4 | L 6-10 Southport Stingrays |
| S4 W19 | kicking | 6 speed 1, strength 2, handling 1, footyIQ 2 | $158k | $43k | 621 | 5 | 62.5 | W 21-0 Broken Hill Brollys |
| S4 W20 | kicking | 5 speed 2, handling 2, footyIQ 1 | $142k | -$16k | 566 | 4 | 62.1 | L 6-10 Geelong Gulls |
| S4 W21 | stamina | 9 speed 3, strength 1, handling 3, footyIQ 2 | $187k | $44k | 594 | 8 | 62.2 | W 14-4 Wagga Swagmen |
| S4 W22 | handling | 13 speed 3, strength 1, stamina 1, handling 2, kicking 2, footyIQ 4 | $190k | $3.3k | 544 | 4 | 62.3 | W 12-4 Katherine Crocs |
| S4 W23 | footyIQ | 3 strength 1, handling 1, footyIQ 1 | $234k | $44k | 523 | 9 | 62.3 | W 10-0 Shellharbour Scorpions |
| S4 W24 | strength | 8 speed 2, strength 2, handling 3, footyIQ 1 | $237k | $2.5k | 592 | 6 | 62.3 | W 23-7 Dubbo Diggers |
| S4 W25 final | strength | 5 speed 2, handling 2, footyIQ 1 | $281k | $44k | 574 | 5 | 62.4 | W 10-6 Darwin Drovers |
| S4 W26 final | footyIQ | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $326k | $44k | 604 | 5 | 62.4 | W 17-0 Redcliffe Reapers |
| S4 W27 final | kicking | 0 | $556k | $230k | 0 | 0 | 0.0 | W 14-0 Southport Stingrays |
| S5 trial 1 | speed | 0 | $503k | -$54k | 641 | 0 | 37.7 | W 20-8 Launceston Larrikins |
| S5 trial 2 | kicking | 6 speed 1, stamina 2, handling 2, kicking 1 | $469k | -$34k | 824 | 9 | 40.7 | W 20-0 Toowoomba Thunder |
| S5 W1 | stamina | 12 speed 5, strength 2, stamina 2, handling 1, footyIQ 2 | $468k | -$800 | 773 | 10 | 43.3 | L 0-4 Launceston Larrikins |
| S5 W2 | speed | 9 speed 3, strength 1, handling 2, footyIQ 3 | $436k | -$32k | 858 | 7 | 45.2 | W 14-11 Darwin Drovers |
| S5 W3 | stamina | 6 speed 1, strength 1, footyIQ 4 | $447k | $10k | 809 | 7 | 47.8 | W 10-0 Southport Stingrays |
| S5 W4 | stamina | 12 speed 3, strength 2, handling 2, kicking 2, footyIQ 3 | $417k | -$30k | 785 | 11 | 50.3 | W 16-6 Broken Hill Brollys |
| S5 W5 | speed | 6 speed 3, footyIQ 3 | $432k | $15k | 866 | 7 | 51.4 | W 10-7 Geelong Gulls |
| S5 W6 | strength | 6 strength 1, handling 1, footyIQ 4 | $412k | -$20k | 788 | 8 | 52.2 | L 13-19 Wagga Swagmen |
| S5 W7 | kicking | 4 speed 1, handling 1, footyIQ 2 | $434k | $22k | 740 | 7 | 52.8 | W 8-0 Katherine Crocs |
| S5 W8 | handling | 10 speed 3, strength 2, handling 2, footyIQ 3 | $412k | -$22k | 703 | 5 | 54.6 | L 6-18 Shellharbour Scorpions |
| S5 W9 | speed | 9 speed 4, strength 1, stamina 1, handling 3 | $414k | $2.6k | 719 | 8 | 55.8 | W 18-4 Dubbo Diggers |
| S5 W10 | footyIQ | 6 speed 1, handling 3, footyIQ 2 | $389k | -$26k | 713 | 7 | 56.3 | L 10-24 Mackay Marlins |
| S5 W11 | stamina | 4 handling 2, footyIQ 2 | $412k | $23k | 663 | 10 | 57.5 | L 0-11 Ballarat Bushrangers |
| S5 W12 | speed | 5 speed 1, strength 2, stamina 1, footyIQ 1 | $393k | -$20k | 678 | 5 | 58.8 | L 2-8 Cairns Cyclones |
| S5 W13 | strength | 6 strength 4, footyIQ 2 | $407k | $14k | 696 | 5 | 59.3 | W 8-4 Toowoomba Thunder |
| S5 W14 | speed | 11 speed 3, strength 2, stamina 1, footyIQ 5 | $388k | -$19k | 705 | 6 | 59.2 | W 6-5 Woolloomooloo Wolves |
| S5 W15 | stamina | 7 speed 2, handling 3, footyIQ 2 | $432k | $44k | 712 | 4 | 60.4 | W 12-6 Redcliffe Reapers |
| S5 W16 | stamina | 7 speed 2, handling 3, footyIQ 2 | $422k | -$9.2k | 683 | 9 | 59.4 | L 6-10 Launceston Larrikins |
| S5 W17 | speed | 7 speed 1, stamina 1, handling 2, kicking 1, footyIQ 2 | $466k | $44k | 692 | 10 | 60.5 | W 14-0 Darwin Drovers |
| S5 W18 | speed | 3 stamina 1, footyIQ 2 | $455k | -$11k | 659 | 6 | 60.5 | D 4-4 Southport Stingrays |
| S5 W19 | kicking | 11 speed 4, strength 1, handling 2, footyIQ 4 | $487k | $31k | 669 | 5 | 60.6 | W 10-6 Broken Hill Brollys |
| S5 W20 | footyIQ | 3 handling 1, footyIQ 2 | $477k | -$9.8k | 710 | 4 | 59.5 | W 16-8 Geelong Gulls |
| S5 W21 | handling | 1 footyIQ 1 | $522k | $45k | 657 | 8 | 59.5 | L 0-20 Wagga Swagmen |
| S5 W22 | speed | 3 speed 1, handling 2 | $530k | $7.8k | 655 | 4 | 60.6 | L 8-17 Katherine Crocs |
| S5 W23 | speed | 7 speed 1, strength 3, stamina 2, footyIQ 1 | $563k | $33k | 659 | 11 | 59.6 | L 4-19 Shellharbour Scorpions |
| S5 W24 | kicking | 15 speed 2, strength 4, stamina 2, kicking 3, footyIQ 4 | $566k | $3.5k | 656 | 6 | 59.7 | L 6-19 Dubbo Diggers |
| S5 W25 final | speed | 7 speed 2, handling 2, footyIQ 3 | $570k | $3.5k | 225 | 2 | 59.8 | no match |
| S5 W26 final | stamina | 0 | $573k | $3.5k | 225 | 0 | 59.8 | no match |
| S5 W27 final | stamina | 0 | $577k | $3.4k | 0 | 0 | 0.0 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $22k | -$23k | 599 | 0.20 | 46.7 | 54.1 | 0.0% | 30.0% |
| S1 trial 2 | 20 | $8.0k | -$14k | 604 | 5.00 | 47.1 | 55.1 | 0.0% | 35.0% |
| S1 W1 | 20 | $32k | $24k | 606 | 4.45 | 47.3 | 55.1 | 0.0% | 40.0% |
| S1 W2 | 20 | $13k | -$19k | 616 | 6.75 | 47.8 | 56.3 | 0.0% | 50.0% |
| S1 W3 | 20 | $36k | $23k | 614 | 3.35 | 47.8 | 56.4 | 0.0% | 45.0% |
| S1 W4 | 20 | $15k | -$21k | 627 | 5.60 | 48.3 | 57.0 | 0.0% | 40.0% |
| S1 W5 | 20 | $31k | $16k | 616 | 6.80 | 48.5 | 57.5 | 0.0% | 60.0% |
| S1 W6 | 20 | $9.1k | -$22k | 628 | 6.30 | 49.1 | 58.7 | 0.0% | 20.0% |
| S1 W7 | 20 | $34k | $25k | 636 | 4.90 | 49.1 | 58.8 | 0.0% | 30.0% |
| S1 W8 | 20 | $14k | -$20k | 658 | 8.20 | 49.6 | 59.5 | 0.0% | 60.0% |
| S1 W9 | 20 | $30k | $17k | 645 | 4.90 | 49.8 | 59.8 | 0.0% | 30.0% |
| S1 W10 | 20 | $9.7k | -$21k | 660 | 6.15 | 50.3 | 61.0 | 0.0% | 50.0% |
| S1 W11 | 20 | $34k | $25k | 657 | 5.30 | 50.3 | 61.1 | 0.0% | 40.0% |
| S1 W12 | 20 | $17k | -$17k | 652 | 7.80 | 50.7 | 61.5 | 0.0% | 30.0% |
| S1 W13 | 20 | $37k | $21k | 656 | 5.90 | 50.8 | 61.7 | 0.0% | 25.0% |
| S1 W14 | 20 | $16k | -$21k | 670 | 5.30 | 51.4 | 62.4 | 0.0% | 35.0% |
| S1 W15 | 20 | $36k | $20k | 666 | 6.70 | 51.4 | 62.5 | 0.0% | 25.0% |
| S1 W16 | 20 | $21k | -$15k | 689 | 6.10 | 51.7 | 62.7 | 0.0% | 45.0% |
| S1 W17 | 20 | $39k | $17k | 682 | 5.90 | 51.7 | 62.9 | 0.0% | 35.0% |
| S1 W18 | 20 | $20k | -$18k | 676 | 8.85 | 52.2 | 63.4 | 0.0% | 30.0% |
| S1 W19 | 20 | $38k | $18k | 691 | 6.45 | 52.5 | 63.6 | 0.0% | 50.0% |
| S1 W20 | 20 | $24k | -$14k | 686 | 6.40 | 52.8 | 63.8 | 0.0% | 55.0% |
| S1 W21 | 20 | $40k | $15k | 685 | 6.85 | 53.0 | 64.0 | 0.0% | 55.0% |
| S1 W22 | 20 | $25k | -$15k | 699 | 6.40 | 53.3 | 64.3 | 0.0% | 25.0% |
| S1 W23 | 20 | $47k | $22k | 705 | 6.55 | 53.4 | 64.4 | 0.0% | 55.0% |
| S1 W24 | 20 | $33k | -$14k | 703 | 6.10 | 53.7 | 64.5 | 0.0% | 50.0% |
| S1 W25 final | 20 | $32k | -$1.6k | 461 | 5.05 | 53.9 | 64.7 | 0.0% | 66.7% |
| S1 W26 final | 20 | $31k | -$386 | 382 | 4.00 | 54.1 | 64.8 | 0.0% | 50.0% |
| S1 W27 final | 20 | $66k | $35k | 90 | 0.55 | 50.6 | 51.2 | 0.0% | 33.3% |
| S2 trial 1 | 20 | $53k | -$13k | 575 | 4.55 | 46.0 | 50.8 | 0.0% | 45.0% |
| S2 trial 2 | 20 | $44k | -$8.4k | 640 | 5.70 | 46.6 | 52.4 | 0.0% | 40.0% |
| S2 W1 | 20 | $62k | $18k | 635 | 6.70 | 47.1 | 53.4 | 0.0% | 60.0% |
| S2 W2 | 20 | $39k | -$23k | 631 | 5.50 | 48.3 | 56.0 | 0.0% | 45.0% |
| S2 W3 | 20 | $64k | $25k | 627 | 7.30 | 48.5 | 56.4 | 0.0% | 40.0% |
| S2 W4 | 20 | $43k | -$20k | 627 | 5.75 | 49.4 | 58.2 | 0.0% | 45.0% |
| S2 W5 | 20 | $60k | $17k | 607 | 6.05 | 49.9 | 59.1 | 0.0% | 50.0% |
| S2 W6 | 20 | $38k | -$22k | 609 | 4.70 | 50.9 | 60.5 | 0.0% | 40.0% |
| S2 W7 | 20 | $59k | $22k | 614 | 7.15 | 51.1 | 60.8 | 0.0% | 40.0% |
| S2 W8 | 20 | $40k | -$19k | 623 | 5.80 | 51.6 | 61.5 | 0.0% | 50.0% |
| S2 W9 | 20 | $58k | $18k | 637 | 6.00 | 52.1 | 62.0 | 0.0% | 55.0% |
| S2 W10 | 20 | $36k | -$22k | 645 | 5.35 | 53.0 | 62.9 | 0.0% | 45.0% |
| S2 W11 | 20 | $57k | $21k | 655 | 7.35 | 53.2 | 63.1 | 0.0% | 70.0% |
| S2 W12 | 20 | $39k | -$18k | 654 | 5.90 | 53.6 | 63.4 | 0.0% | 50.0% |
| S2 W13 | 20 | $59k | $19k | 649 | 6.30 | 53.8 | 63.6 | 0.0% | 45.0% |
| S2 W14 | 20 | $37k | -$22k | 657 | 5.65 | 54.5 | 64.3 | 0.0% | 50.0% |
| S2 W15 | 20 | $59k | $22k | 651 | 6.20 | 54.6 | 64.3 | 0.0% | 25.0% |
| S2 W16 | 20 | $41k | -$18k | 659 | 5.85 | 55.0 | 64.5 | 0.0% | 55.0% |
| S2 W17 | 20 | $56k | $15k | 663 | 6.75 | 55.2 | 64.8 | 0.0% | 45.0% |
| S2 W18 | 20 | $34k | -$22k | 676 | 5.90 | 55.7 | 65.3 | 0.0% | 35.0% |
| S2 W19 | 20 | $58k | $23k | 683 | 6.90 | 55.7 | 65.4 | 0.0% | 75.0% |
| S2 W20 | 20 | $40k | -$17k | 681 | 6.35 | 56.0 | 65.6 | 0.0% | 45.0% |
| S2 W21 | 20 | $60k | $20k | 689 | 7.70 | 56.2 | 65.8 | 0.0% | 45.0% |
| S2 W22 | 20 | $43k | -$17k | 690 | 6.35 | 56.4 | 66.1 | 0.0% | 60.0% |
| S2 W23 | 20 | $66k | $23k | 686 | 6.00 | 56.6 | 66.2 | 0.0% | 55.0% |
| S2 W24 | 20 | $51k | -$15k | 691 | 6.40 | 56.7 | 66.3 | 0.0% | 45.0% |
| S2 W25 final | 20 | $60k | $8.8k | 620 | 6.80 | 56.8 | 66.4 | 0.0% | 62.5% |
| S2 W26 final | 20 | $67k | $6.8k | 472 | 4.05 | 57.0 | 66.6 | 0.0% | 80.0% |
| S2 W27 final | 20 | $134k | $67k | 38 | 0.45 | 55.6 | 55.6 | 0.0% | 37.5% |
| S3 trial 1 | 20 | $101k | -$33k | 662 | 2.15 | 41.4 | 45.4 | 0.0% | 45.0% |
| S3 trial 2 | 20 | $85k | -$17k | 780 | 8.20 | 42.7 | 48.0 | 0.0% | 45.0% |
| S3 W1 | 20 | $101k | $16k | 790 | 8.00 | 43.5 | 49.9 | 0.0% | 85.0% |
| S3 W2 | 20 | $76k | -$25k | 753 | 5.95 | 45.0 | 53.3 | 0.0% | 50.0% |
| S3 W3 | 20 | $104k | $28k | 734 | 9.15 | 45.6 | 54.5 | 0.0% | 15.0% |
| S3 W4 | 20 | $83k | -$20k | 733 | 6.80 | 46.7 | 57.0 | 0.0% | 55.0% |
| S3 W5 | 20 | $97k | $14k | 705 | 6.60 | 47.7 | 59.0 | 0.0% | 45.0% |
| S3 W6 | 20 | $76k | -$22k | 683 | 6.05 | 48.8 | 61.0 | 0.0% | 40.0% |
| S3 W7 | 20 | $100k | $24k | 675 | 7.15 | 49.4 | 61.3 | 0.0% | 50.0% |
| S3 W8 | 20 | $81k | -$19k | 682 | 6.10 | 50.3 | 62.4 | 0.0% | 65.0% |
| S3 W9 | 20 | $98k | $18k | 669 | 6.35 | 51.0 | 63.2 | 0.0% | 50.0% |
| S3 W10 | 20 | $75k | -$23k | 657 | 5.75 | 52.1 | 64.4 | 0.0% | 45.0% |
| S3 W11 | 20 | $99k | $23k | 643 | 6.70 | 52.4 | 64.5 | 0.0% | 35.0% |
| S3 W12 | 20 | $81k | -$18k | 643 | 6.05 | 53.0 | 64.9 | 0.0% | 45.0% |
| S3 W13 | 20 | $97k | $16k | 651 | 6.35 | 53.5 | 65.4 | 0.0% | 35.0% |
| S3 W14 | 20 | $77k | -$20k | 640 | 5.70 | 54.3 | 66.0 | 0.0% | 30.0% |
| S3 W15 | 20 | $99k | $22k | 649 | 7.10 | 54.4 | 66.0 | 0.0% | 25.0% |
| S3 W16 | 20 | $83k | -$16k | 665 | 5.60 | 54.8 | 66.2 | 0.0% | 65.0% |
| S3 W17 | 20 | $99k | $17k | 660 | 6.00 | 55.3 | 66.6 | 0.0% | 50.0% |
| S3 W18 | 20 | $79k | -$20k | 664 | 6.45 | 56.0 | 66.9 | 0.0% | 45.0% |
| S3 W19 | 20 | $102k | $22k | 666 | 6.25 | 56.0 | 67.0 | 0.0% | 55.0% |
| S3 W20 | 20 | $88k | -$14k | 674 | 6.50 | 56.1 | 67.1 | 0.0% | 40.0% |
| S3 W21 | 20 | $112k | $24k | 676 | 6.65 | 56.4 | 67.3 | 0.0% | 50.0% |
| S3 W22 | 20 | $98k | -$15k | 671 | 6.35 | 56.7 | 67.6 | 0.0% | 35.0% |
| S3 W23 | 20 | $125k | $28k | 687 | 6.40 | 56.7 | 67.6 | 0.0% | 65.0% |
| S3 W24 | 20 | $120k | -$5.5k | 679 | 6.55 | 57.0 | 67.8 | 0.0% | 50.0% |
| S3 W25 final | 20 | $129k | $9.3k | 483 | 5.05 | 57.3 | 67.9 | 0.0% | 54.5% |
| S3 W26 final | 20 | $133k | $3.7k | 389 | 3.95 | 57.6 | 68.0 | 0.0% | 42.9% |
| S3 W27 final | 20 | $177k | $45k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 66.7% |
| S4 trial 1 | 13 | $215k | -$52k | 680 | 0.69 | 37.7 | 40.4 | 0.0% | 30.8% |
| S4 trial 2 | 13 | $182k | -$33k | 880 | 9.38 | 40.2 | 44.8 | 0.0% | 61.5% |
| S4 W1 | 13 | $191k | $9.0k | 867 | 9.92 | 42.1 | 48.6 | 0.0% | 46.2% |
| S4 W2 | 13 | $161k | -$30k | 880 | 5.54 | 44.0 | 52.6 | 0.0% | 76.9% |
| S4 W3 | 13 | $180k | $20k | 851 | 9.77 | 45.5 | 55.6 | 0.0% | 46.2% |
| S4 W4 | 13 | $158k | -$22k | 833 | 8.23 | 46.8 | 58.7 | 0.0% | 76.9% |
| S4 W5 | 13 | $176k | $18k | 779 | 8.77 | 48.1 | 61.7 | 0.0% | 38.5% |
| S4 W6 | 13 | $154k | -$22k | 752 | 5.92 | 49.4 | 64.5 | 0.0% | 69.2% |
| S4 W7 | 13 | $175k | $21k | 722 | 7.31 | 50.4 | 66.4 | 0.0% | 46.2% |
| S4 W8 | 13 | $157k | -$17k | 717 | 6.85 | 51.3 | 66.9 | 0.0% | 76.9% |
| S4 W9 | 13 | $173k | $16k | 706 | 6.69 | 52.4 | 67.9 | 0.0% | 61.5% |
| S4 W10 | 13 | $152k | -$21k | 682 | 5.69 | 53.4 | 68.5 | 0.0% | 61.5% |
| S4 W11 | 13 | $174k | $23k | 668 | 7.23 | 54.1 | 68.8 | 0.0% | 38.5% |
| S4 W12 | 13 | $157k | -$17k | 672 | 6.15 | 54.5 | 69.1 | 0.0% | 46.2% |
| S4 W13 | 13 | $176k | $19k | 678 | 6.92 | 55.2 | 69.4 | 0.0% | 53.8% |
| S4 W14 | 13 | $155k | -$21k | 689 | 6.00 | 56.0 | 69.6 | 0.0% | 38.5% |
| S4 W15 | 13 | $178k | $23k | 700 | 7.38 | 56.2 | 69.7 | 0.0% | 38.5% |
| S4 W16 | 13 | $163k | -$15k | 699 | 6.08 | 56.3 | 69.8 | 0.0% | 61.5% |
| S4 W17 | 13 | $187k | $24k | 719 | 7.23 | 56.8 | 70.1 | 0.0% | 84.6% |
| S4 W18 | 13 | $176k | -$11k | 693 | 5.69 | 57.2 | 70.3 | 0.0% | 46.2% |
| S4 W19 | 13 | $208k | $32k | 709 | 8.15 | 57.6 | 70.5 | 0.0% | 61.5% |
| S4 W20 | 13 | $198k | -$11k | 712 | 6.69 | 57.6 | 70.6 | 0.0% | 53.8% |
| S4 W21 | 13 | $229k | $31k | 718 | 7.23 | 57.6 | 70.6 | 0.0% | 61.5% |
| S4 W22 | 13 | $225k | -$3.7k | 705 | 6.54 | 57.7 | 70.8 | 0.0% | 46.2% |
| S4 W23 | 13 | $263k | $37k | 702 | 6.92 | 58.0 | 70.9 | 0.0% | 46.2% |
| S4 W24 | 13 | $254k | -$8.3k | 743 | 7.08 | 58.0 | 71.0 | 0.0% | 76.9% |
| S4 W25 final | 13 | $278k | $23k | 630 | 6.54 | 58.2 | 71.2 | 0.0% | 90.0% |
| S4 W26 final | 13 | $299k | $21k | 583 | 5.46 | 58.4 | 71.2 | 0.0% | 44.4% |
| S4 W27 final | 13 | $379k | $80k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 75.0% |
| S5 trial 1 | 8 | $389k | -$54k | 692 | 0.50 | 37.7 | 40.6 | 0.0% | 50.0% |
| S5 trial 2 | 8 | $345k | -$44k | 877 | 9.88 | 40.2 | 45.0 | 0.0% | 62.5% |
| S5 W1 | 8 | $354k | $8.8k | 864 | 10.13 | 42.1 | 48.8 | 0.0% | 62.5% |
| S5 W2 | 8 | $321k | -$33k | 881 | 5.13 | 44.1 | 53.1 | 0.0% | 75.0% |
| S5 W3 | 8 | $342k | $21k | 848 | 10.00 | 45.4 | 55.8 | 0.0% | 75.0% |
| S5 W4 | 8 | $318k | -$24k | 826 | 9.38 | 47.4 | 59.2 | 0.0% | 62.5% |
| S5 W5 | 8 | $337k | $19k | 847 | 8.38 | 48.5 | 62.2 | 0.0% | 87.5% |
| S5 W6 | 8 | $314k | -$23k | 803 | 5.75 | 49.6 | 65.3 | 0.0% | 62.5% |
| S5 W7 | 8 | $336k | $22k | 759 | 8.25 | 50.4 | 67.5 | 0.0% | 37.5% |
| S5 W8 | 8 | $317k | -$19k | 755 | 6.75 | 51.2 | 68.2 | 0.0% | 50.0% |
| S5 W9 | 8 | $331k | $14k | 722 | 7.75 | 52.2 | 69.4 | 0.0% | 25.0% |
| S5 W10 | 8 | $308k | -$22k | 753 | 5.88 | 52.8 | 70.2 | 0.0% | 50.0% |
| S5 W11 | 8 | $331k | $22k | 724 | 7.88 | 53.2 | 70.5 | 0.0% | 50.0% |
| S5 W12 | 8 | $316k | -$14k | 720 | 6.50 | 53.6 | 70.8 | 0.0% | 50.0% |
| S5 W13 | 8 | $341k | $25k | 734 | 7.63 | 54.4 | 71.0 | 0.0% | 62.5% |
| S5 W14 | 8 | $326k | -$15k | 728 | 6.13 | 54.8 | 71.6 | 0.0% | 75.0% |
| S5 W15 | 8 | $361k | $35k | 747 | 7.38 | 55.2 | 71.7 | 0.0% | 75.0% |
| S5 W16 | 8 | $350k | -$12k | 734 | 7.75 | 55.2 | 72.0 | 0.0% | 50.0% |
| S5 W17 | 8 | $381k | $31k | 724 | 7.75 | 55.3 | 72.2 | 0.0% | 50.0% |
| S5 W18 | 8 | $373k | -$8.6k | 744 | 6.63 | 55.4 | 72.5 | 0.0% | 37.5% |
| S5 W19 | 8 | $408k | $35k | 772 | 7.63 | 55.5 | 72.5 | 0.0% | 87.5% |
| S5 W20 | 8 | $402k | -$6.1k | 742 | 6.38 | 55.6 | 72.6 | 0.0% | 75.0% |
| S5 W21 | 8 | $436k | $34k | 728 | 8.25 | 55.5 | 72.7 | 0.0% | 50.0% |
| S5 W22 | 8 | $430k | -$5.2k | 740 | 6.00 | 55.7 | 72.9 | 0.0% | 25.0% |
| S5 W23 | 8 | $468k | $38k | 747 | 9.38 | 55.6 | 73.0 | 0.0% | 37.5% |
| S5 W24 | 8 | $465k | -$2.9k | 746 | 6.75 | 55.7 | 73.1 | 0.0% | 37.5% |
| S5 W25 final | 8 | $488k | $23k | 593 | 5.63 | 56.1 | 73.2 | 0.0% | 40.0% |
| S5 W26 final | 8 | $495k | $7.0k | 415 | 3.88 | 56.0 | 73.3 | 0.0% | 50.0% |
| S5 W27 final | 8 | $541k | $45k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 100.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| expansive × slide | 179 | 64.5% | 1869 | 52.9% | 11.6% |  |
| grind × compressed | 1813 | 52.7% | 235 | 63.8% | -11.2% |  |
| kick-chase × slide | 56 | 61.6% | 1992 | 53.7% | 7.9% |  |
| block-shift | 169 | 56.2% | 1879 | 53.8% | 2.5% |  |
| chip-chase | 1062 | 59.8% | 986 | 47.7% | 12.1% |  |
| cut-out-winger | 166 | 56.3% | 1882 | 53.7% | 2.6% |  |
| kick-pass | 1062 | 59.6% | 986 | 47.9% | 11.6% |  |
| second-man | 166 | 56.3% | 1882 | 53.7% | 2.6% |  |

### casual-weekly/easy/au

- 70 overall (best nine, including recruitment): 82.3 weeks; 20 reached, 0 censored.
- 80 overall (best nine, including recruitment): 132.0 weeks; 1 reached, 19 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 187 of 400; median 25.0 weeks among those who did.
- Reaching potential stars: 245 of 400 (100 already there at week 0); median 31.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/313; S3 27/179; S5 86/178.
- Mean XP per completed season 19035; mean level-ups per completed season 187.0.
- Cash: opening 90000; mean weekly change 18936; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 100; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1694k after opening at $90k, and no career went into debt.
- WARNING: cash climbs by $19k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 60279 |
| gate | 508937 |
| prize | 49045 |
| boardGrant | 11220 |
| events | -10459 |
| transfers | -68283 |
| contracts | 0 |
| facilities | -1600 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 4 strength 1, stamina 1, kicking 1, footyIQ 1 | $89k | -$752 | 905 | 4 | 53.2 | D 4-4 Dubbo Diggers |
| S1 trial 2 | balanced | 8 strength 2, stamina 3, handling 1, kicking 1, footyIQ 1 | $90k | $1.2k | 1044 | 8 | 53.3 | W 23-6 Wagga Swagmen |
| S1 W1 | balanced | 8 strength 3, stamina 1, kicking 1, footyIQ 3 | $116k | $25k | 948 | 8 | 53.3 | D 4-4 Launceston Larrikins |
| S1 W2 | balanced | 11 strength 3, stamina 2, handling 2, kicking 1, footyIQ 3 | $119k | $3.2k | 1025 | 11 | 53.5 | W 10-0 Darwin Drovers |
| S1 W3 | balanced | 7 strength 2, stamina 1, handling 1, footyIQ 3 | $148k | $29k | 996 | 7 | 53.5 | W 16-4 Southport Stingrays |
| S1 W4 | balanced | 11 speed 3, strength 2, kicking 1, footyIQ 5 | $149k | $1.2k | 896 | 11 | 53.6 | D 0-0 Broken Hill Brollys |
| S1 W5 | balanced | 10 strength 3, stamina 3, handling 1, kicking 1, footyIQ 2 | $177k | $28k | 930 | 10 | 53.7 | L 10-12 Geelong Gulls |
| S1 W6 | balanced | 8 speed 2, strength 2, kicking 1, footyIQ 3 | $178k | $1.2k | 958 | 8 | 53.8 | W 6-4 Wagga Swagmen |
| S1 W7 | balanced | 11 speed 4, strength 3, stamina 1, kicking 1, footyIQ 2 | $211k | $33k | 1047 | 11 | 53.9 | W 14-0 Katherine Crocs |
| S1 W8 | balanced | 9 speed 1, strength 3, stamina 2, handling 2, footyIQ 1 | $212k | $1.2k | 1029 | 9 | 54.0 | W 14-4 Shellharbour Scorpions |
| S1 W9 | balanced | 9 speed 5, strength 1, kicking 2, footyIQ 1 | $245k | $33k | 922 | 9 | 54.1 | L 4-12 Dubbo Diggers |
| S1 W10 | balanced | 10 speed 1, strength 1, stamina 1, handling 2, footyIQ 5 | $247k | $1.2k | 984 | 10 | 54.2 | W 11-6 Mackay Marlins |
| S1 W11 | balanced | 11 speed 4, strength 1, stamina 1, handling 1, kicking 1, footyIQ 3 | $243k | -$3.8k | 946 | 11 | 55.0 | W 1-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 strength 3, stamina 1, kicking 1, footyIQ 2 | $244k | $1.2k | 893 | 7 | 55.1 | L 0-7 Cairns Cyclones |
| S1 W13 | balanced | 11 speed 3, strength 4, stamina 1, handling 1, footyIQ 2 | $276k | $32k | 915 | 11 | 55.2 | L 0-1 Toowoomba Thunder |
| S1 W14 | balanced | 10 speed 2, strength 1, stamina 2, handling 2, kicking 2, footyIQ 1 | $277k | $1.2k | 1018 | 10 | 55.3 | W 8-0 Woolloomooloo Wolves |
| S1 W15 | balanced | 9 speed 2, strength 1, stamina 1, kicking 1, footyIQ 4 | $304k | $27k | 992 | 9 | 55.4 | W 12-6 Redcliffe Reapers |
| S1 W16 | balanced | 10 speed 2, strength 3, handling 1, footyIQ 4 | $306k | $1.2k | 958 | 10 | 55.5 | D 0-0 Launceston Larrikins |
| S1 W17 | balanced | 10 speed 1, strength 1, stamina 4, handling 2, kicking 1, footyIQ 1 | $332k | $26k | 1040 | 10 | 55.5 | W 18-12 Darwin Drovers |
| S1 W18 | balanced | 9 speed 3, strength 2, handling 1, kicking 1, footyIQ 2 | $333k | $1.2k | 1063 | 9 | 55.6 | W 16-4 Southport Stingrays |
| S1 W19 | balanced | 11 speed 4, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $364k | $31k | 1027 | 11 | 55.7 | W 18-6 Broken Hill Brollys |
| S1 W20 | balanced | 11 speed 2, strength 2, stamina 1, handling 1, footyIQ 5 | $365k | $1.2k | 982 | 11 | 55.8 | W 6-4 Geelong Gulls |
| S1 W21 | balanced | 8 speed 2, strength 1, stamina 1, kicking 1, footyIQ 3 | $402k | $37k | 998 | 8 | 55.9 | W 14-6 Wagga Swagmen |
| S1 W22 | balanced | 11 speed 2, strength 2, stamina 2, handling 2, kicking 1, footyIQ 2 | $403k | $1.2k | 1014 | 11 | 56.0 | W 8-6 Katherine Crocs |
| S1 W23 | balanced | 11 speed 4, strength 1, stamina 3, handling 1, footyIQ 2 | $442k | $38k | 1031 | 11 | 56.1 | W 16-10 Shellharbour Scorpions |
| S1 W24 | balanced | 8 speed 3, strength 1, handling 1, kicking 1, footyIQ 2 | $443k | $1.2k | 915 | 8 | 56.2 | L 0-10 Dubbo Diggers |
| S1 W25 final | balanced | 10 speed 1, strength 3, stamina 1, handling 1, footyIQ 4 | $484k | $42k | 918 | 10 | 56.3 | L 0-10 Toowoomba Thunder |
| S1 W26 final | balanced | 2 handling 1, kicking 1 | $486k | $1.2k | 236 | 2 | 56.3 | no match |
| S1 W27 final | balanced | 2 strength 1, footyIQ 1 | $524k | $38k | 220 | 2 | 57.6 | no match |
| S2 trial 1 | balanced | 6 speed 1, strength 1, handling 1, kicking 1, footyIQ 2 | $525k | $1.6k | 807 | 6 | 57.7 | L 0-16 Darwin Drovers |
| S2 trial 2 | balanced | 12 speed 3, strength 1, stamina 3, handling 1, footyIQ 4 | $534k | $9.0k | 871 | 12 | 57.8 | W 1-0 Shellharbour Scorpions |
| S2 W1 | balanced | 8 speed 4, strength 2, handling 1, footyIQ 1 | $565k | $31k | 883 | 8 | 57.9 | L 14-16 Launceston Larrikins |
| S2 W2 | balanced | 8 strength 2, stamina 2, handling 1, kicking 1, footyIQ 2 | $567k | $1.6k | 907 | 8 | 58.0 | W 10-6 Darwin Drovers |
| S2 W3 | balanced | 10 speed 3, stamina 1, handling 1, kicking 1, footyIQ 4 | $604k | $37k | 956 | 10 | 58.1 | W 18-6 Southport Stingrays |
| S2 W4 | balanced | 8 speed 2, strength 2, handling 2, footyIQ 2 | $606k | $1.6k | 865 | 8 | 58.2 | L 2-21 Broken Hill Brollys |
| S2 W5 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, kicking 2, footyIQ 1 | $637k | $31k | 856 | 8 | 58.3 | D 0-0 Geelong Gulls |
| S2 W6 | balanced | 10 speed 3, stamina 2, handling 1, footyIQ 4 | $638k | $1.6k | 824 | 10 | 58.4 | L 10-12 Wagga Swagmen |
| S2 W7 | balanced | 11 speed 4, strength 2, stamina 2, handling 2, footyIQ 1 | $679k | $41k | 903 | 11 | 58.5 | D 4-4 Katherine Crocs |
| S2 W8 | balanced | 8 speed 1, strength 1, stamina 3, handling 1, kicking 1, footyIQ 1 | $681k | $1.6k | 887 | 8 | 58.6 | D 6-6 Shellharbour Scorpions |
| S2 W9 | balanced | 10 speed 2, strength 1, stamina 1, kicking 1, footyIQ 5 | $715k | $34k | 924 | 10 | 58.7 | W 13-4 Dubbo Diggers |
| S2 W10 | balanced | 8 speed 3, strength 2, handling 1, footyIQ 2 | $717k | $1.6k | 827 | 8 | 58.8 | L 0-11 Mackay Marlins |
| S2 W11 | balanced | 9 speed 1, strength 1, stamina 1, handling 3, kicking 1, footyIQ 2 | $747k | $30k | 952 | 9 | 58.9 | W 20-10 Ballarat Bushrangers |
| S2 W12 | balanced | 10 speed 1, strength 4, stamina 1, kicking 1, footyIQ 3 | $743k | -$4.4k | 954 | 10 | 59.0 | W 10-6 Cairns Cyclones |
| S2 W13 | balanced | 9 speed 3, strength 1, stamina 3, handling 1, footyIQ 1 | $784k | $42k | 943 | 9 | 59.1 | W 18-0 Toowoomba Thunder |
| S2 W14 | balanced | 9 speed 5, handling 2, footyIQ 2 | $786k | $1.6k | 847 | 9 | 59.2 | L 6-14 Woolloomooloo Wolves |
| S2 W15 | balanced | 8 speed 1, strength 2, kicking 2, footyIQ 3 | $819k | $33k | 838 | 8 | 59.3 | D 7-7 Redcliffe Reapers |
| S2 W16 | balanced | 6 speed 1, strength 1, stamina 2, footyIQ 2 | $821k | $1.6k | 807 | 6 | 59.3 | L 0-14 Launceston Larrikins |
| S2 W17 | balanced | 12 speed 4, stamina 1, handling 5, kicking 1, footyIQ 1 | $850k | $29k | 975 | 12 | 59.5 | W 22-20 Darwin Drovers |
| S2 W18 | balanced | 8 speed 1, strength 3, kicking 1, footyIQ 3 | $852k | $1.6k | 834 | 8 | 59.6 | L 4-10 Southport Stingrays |
| S2 W19 | balanced | 9 speed 1, strength 4, stamina 3, footyIQ 1 | $887k | $35k | 828 | 9 | 59.7 | L 0-7 Broken Hill Brollys |
| S2 W20 | balanced | 7 speed 3, stamina 1, handling 2, footyIQ 1 | $888k | $1.6k | 898 | 7 | 59.7 | W 12-6 Geelong Gulls |
| S2 W21 | balanced | 11 speed 2, strength 2, kicking 2, footyIQ 5 | $926k | $38k | 877 | 11 | 59.9 | W 4-0 Wagga Swagmen |
| S2 W22 | balanced | 6 speed 1, strength 2, stamina 2, footyIQ 1 | $928k | $1.8k | 920 | 6 | 59.9 | W 18-0 Katherine Crocs |
| S2 W23 | balanced | 10 speed 6, stamina 2, handling 1, footyIQ 1 | $964k | $36k | 964 | 10 | 60.0 | W 17-7 Shellharbour Scorpions |
| S2 W24 | balanced | 11 strength 1, stamina 1, handling 2, kicking 2, footyIQ 5 | $966k | $1.8k | 925 | 11 | 60.2 | W 13-0 Dubbo Diggers |
| S2 W25 final | balanced | 10 speed 2, strength 3, stamina 3, handling 1, footyIQ 1 | $968k | $2.4k | 1003 | 10 | 60.3 | W 34-12 Broken Hill Brollys |
| S2 W26 final | balanced | 8 speed 4, strength 1, stamina 1, handling 1, footyIQ 1 | $970k | $1.8k | 818 | 8 | 60.4 | L 0-10 Katherine Crocs |
| S2 W27 final | balanced | 1 footyIQ 1 | $1006k | $36k | 192 | 1 | 62.7 | no match |
| S3 trial 1 | balanced | 8 strength 1, stamina 1, handling 1, kicking 2, footyIQ 3 | $985k | -$21k | 794 | 8 | 62.8 | W 12-4 Cairns Cyclones |
| S3 trial 2 | balanced | 5 speed 1, strength 2, footyIQ 2 | $995k | $10k | 807 | 6 | 62.9 | W 17-0 Launceston Larrikins |
| S3 W1 | balanced | 8 speed 4, handling 3, footyIQ 1 | $1031k | $36k | 787 | 10 | 63.0 | W 6-0 Launceston Larrikins |
| S3 W2 | balanced | 7 speed 2, stamina 2, kicking 2, footyIQ 1 | $1032k | $1.8k | 832 | 9 | 63.1 | W 18-0 Darwin Drovers |
| S3 W3 | balanced | 7 speed 3, strength 1, stamina 1, handling 1, footyIQ 1 | $1075k | $42k | 860 | 8 | 63.2 | W 24-0 Southport Stingrays |
| S3 W4 | balanced | 8 speed 1, strength 1, stamina 1, handling 3, kicking 1, footyIQ 1 | $1076k | $1.7k | 774 | 9 | 63.3 | W 6-0 Broken Hill Brollys |
| S3 W5 | balanced | 6 strength 1, kicking 1, footyIQ 4 | $1123k | $47k | 791 | 7 | 63.3 | W 13-0 Geelong Gulls |
| S3 W6 | balanced | 4 speed 2, strength 2 | $1125k | $1.7k | 761 | 4 | 63.4 | W 4-0 Wagga Swagmen |
| S3 W7 | balanced | 9 strength 3, stamina 1, handling 2, kicking 1, footyIQ 2 | $1167k | $42k | 755 | 10 | 63.5 | D 7-7 Katherine Crocs |
| S3 W8 | balanced | 7 speed 1, stamina 1, kicking 1, footyIQ 4 | $1169k | $1.7k | 803 | 9 | 63.6 | W 12-0 Shellharbour Scorpions |
| S3 W9 | balanced | 6 speed 4, footyIQ 2 | $1210k | $41k | 881 | 8 | 63.7 | W 34-6 Dubbo Diggers |
| S3 W10 | balanced | 7 speed 3, strength 1, stamina 1, handling 2 | $1211k | $1.8k | 773 | 8 | 63.8 | W 10-4 Mackay Marlins |
| S3 W11 | balanced | 5 stamina 1, handling 1, kicking 2, footyIQ 1 | $1252k | $41k | 730 | 6 | 63.9 | L 6-10 Ballarat Bushrangers |
| S3 W12 | balanced | 6 speed 2, strength 1, handling 1, footyIQ 2 | $1254k | $1.8k | 769 | 7 | 63.9 | D 10-10 Cairns Cyclones |
| S3 W13 | balanced | 11 speed 5, strength 2, stamina 1, handling 2, footyIQ 1 | $1296k | $42k | 793 | 12 | 64.1 | W 17-0 Toowoomba Thunder |
| S3 W14 | balanced | 8 strength 1, stamina 2, handling 1, kicking 2, footyIQ 2 | $1290k | -$6.2k | 898 | 9 | 64.2 | W 36-10 Woolloomooloo Wolves |
| S3 W15 | balanced | 6 speed 2, stamina 2, footyIQ 2 | $1328k | $38k | 823 | 7 | 64.3 | W 19-4 Redcliffe Reapers |
| S3 W16 | balanced | 8 speed 3, strength 1, handling 2, kicking 1, footyIQ 1 | $1326k | -$1.2k | 798 | 9 | 64.4 | W 8-0 Launceston Larrikins |
| S3 W17 | balanced | 5 speed 1, strength 1, kicking 1, footyIQ 2 | $1367k | $41k | 885 | 7 | 64.5 | W 26-6 Darwin Drovers |
| S3 W18 | balanced | 7 speed 3, strength 1, handling 1, footyIQ 2 | $1369k | $1.8k | 840 | 8 | 64.6 | W 24-7 Southport Stingrays |
| S3 W19 | balanced | 8 speed 1, strength 3, handling 3, footyIQ 1 | $1405k | $36k | 787 | 9 | 64.7 | W 19-6 Broken Hill Brollys |
| S3 W20 | balanced | 6 strength 1, stamina 1, kicking 2, footyIQ 2 | $1407k | $1.8k | 867 | 7 | 64.7 | W 24-0 Geelong Gulls |
| S3 W21 | balanced | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $1449k | $42k | 780 | 9 | 64.8 | L 23-31 Wagga Swagmen |
| S3 W22 | balanced | 4 stamina 1, handling 1, footyIQ 2 | $1449k | -$240 | 761 | 7 | 64.9 | W 13-4 Katherine Crocs |
| S3 W23 | balanced | 7 speed 2, strength 1, kicking 1, footyIQ 3 | $1488k | $39k | 771 | 9 | 65.0 | W 12-6 Shellharbour Scorpions |
| S3 W24 | balanced | 5 speed 2, stamina 2, footyIQ 1 | $1490k | $1.8k | 795 | 7 | 65.0 | W 10-0 Dubbo Diggers |
| S3 W25 final | balanced | 5 speed 3, handling 2 | $1532k | $42k | 773 | 9 | 65.1 | L 12-16 Geelong Gulls |
| S3 W26 final | balanced | 1 stamina 1 | $1534k | $1.8k | 175 | 1 | 65.1 | no match |
| S3 W27 final | balanced | 2 handling 1, kicking 1 | $1565k | $32k | 123 | 2 | 76.8 | no match |
| S4 trial 1 | balanced | 6 strength 3, footyIQ 2 | $1430k | -$136k | 759 | 7 | 67.9 | W 22-0 Ballarat Bushrangers |
| S4 trial 2 | balanced | 5 speed 1, strength 1, stamina 2 | $1441k | $11k | 767 | 7 | 68.0 | W 28-4 Wagga Swagmen |
| S4 W1 | balanced | 3 speed 1, footyIQ 2 | $1479k | $38k | 717 | 7 | 68.0 | W 29-6 Launceston Larrikins |
| S4 W2 | balanced | 2 speed 1, footyIQ 1 | $1481k | $2.0k | 692 | 6 | 68.0 | W 6-0 Darwin Drovers |
| S4 W3 | balanced | 1 speed 1 | $1523k | $42k | 741 | 7 | 68.0 | W 20-0 Southport Stingrays |
| S4 W4 | balanced | 7 speed 3, strength 2, stamina 1, footyIQ 1 | $1525k | $2.0k | 663 | 10 | 68.1 | W 11-5 Broken Hill Brollys |
| S4 W5 | balanced | 3 strength 1, handling 1, footyIQ 1 | $1568k | $42k | 644 | 5 | 68.1 | W 7-6 Geelong Gulls |
| S4 W6 | balanced | 3 strength 2, handling 1 | $1570k | $2.0k | 757 | 7 | 68.2 | W 24-8 Wagga Swagmen |
| S4 W7 | balanced | 4 strength 2, stamina 2 | $1615k | $45k | 652 | 8 | 68.2 | L 4-7 Katherine Crocs |
| S4 W8 | balanced | 2 speed 1, footyIQ 1 | $1617k | $2.0k | 692 | 5 | 68.2 | W 6-4 Shellharbour Scorpions |
| S4 W9 | balanced | 1 footyIQ 1 | $1660k | $42k | 725 | 6 | 68.2 | W 13-0 Dubbo Diggers |
| S4 W10 | balanced | 4 speed 3, footyIQ 1 | $1662k | $2.0k | 765 | 8 | 68.3 | W 14-6 Mackay Marlins |
| S4 W11 | balanced | 4 speed 2, strength 1, stamina 1 | $1704k | $42k | 767 | 8 | 68.3 | W 18-13 Ballarat Bushrangers |
| S4 W12 | balanced | 3 strength 1, stamina 1, handling 1 | $1706k | $2.1k | 734 | 7 | 68.4 | W 25-6 Cairns Cyclones |
| S4 W13 | balanced | 5 strength 1, stamina 1, handling 2, footyIQ 1 | $1749k | $42k | 814 | 11 | 68.4 | W 34-0 Toowoomba Thunder |
| S4 W14 | balanced | 2 strength 1, kicking 1 | $1751k | $2.1k | 696 | 5 | 68.5 | W 7-6 Woolloomooloo Wolves |
| S4 W15 | balanced | 3 speed 1, footyIQ 2 | $1793k | $42k | 663 | 6 | 68.5 | L 4-6 Redcliffe Reapers |
| S4 W16 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $1795k | $2.2k | 715 | 12 | 68.6 | W 13-10 Launceston Larrikins |
| S4 W17 | balanced | 1 speed 1 | $1838k | $42k | 671 | 3 | 68.6 | L 6-17 Darwin Drovers |
| S4 W18 | balanced | 3 speed 2, strength 1 | $1840k | $2.2k | 745 | 7 | 68.6 | W 27-11 Southport Stingrays |
| S4 W19 | balanced | 3 stamina 2, handling 1 | $1882k | $42k | 698 | 7 | 68.6 | W 8-7 Broken Hill Brollys |
| S4 W20 | balanced | 4 speed 1, strength 2, handling 1 | $1885k | $2.2k | 729 | 8 | 68.7 | W 22-0 Geelong Gulls |
| S4 W21 | balanced | 3 strength 2, footyIQ 1 | $1927k | $42k | 723 | 8 | 68.7 | W 10-4 Wagga Swagmen |
| S4 W22 | balanced | 4 speed 1, footyIQ 3 | $1929k | $2.2k | 663 | 6 | 68.8 | L 4-12 Katherine Crocs |
| S4 W23 | balanced | 1 footyIQ 1 | $1966k | $37k | 752 | 5 | 68.8 | W 24-4 Shellharbour Scorpions |
| S4 W24 | balanced | 3 speed 1, strength 1, stamina 1 | $1968k | $2.2k | 779 | 9 | 68.8 | W 28-10 Dubbo Diggers |
| S4 W25 final | balanced | 5 speed 2, stamina 2, footyIQ 1 | $2011k | $43k | 725 | 8 | 68.9 | W 12-8 Toowoomba Thunder |
| S4 W26 final | balanced | 3 strength 1, stamina 1, handling 1 | $2053k | $43k | 754 | 7 | 68.9 | W 21-17 Ballarat Bushrangers |
| S4 W27 final | balanced | 2 speed 1, handling 1 | $2227k | $174k | 639 | 6 | 79.1 | W 18-6 Woolloomooloo Wolves |
| S5 trial 1 | balanced | 3 strength 2, footyIQ 1 | $2240k | $13k | 707 | 7 | 65.9 | W 24-0 Toowoomba Thunder |
| S5 trial 2 | balanced | 2 strength 1, footyIQ 1 | $2178k | -$63k | 725 | 6 | 65.0 | L 6-7 Redcliffe Reapers |
| S5 W1 | balanced | 6 speed 2, strength 1, footyIQ 3 | $2221k | $43k | 745 | 7 | 65.0 | W 4-0 Launceston Larrikins |
| S5 W2 | balanced | 3 speed 1, stamina 2 | $2224k | $2.8k | 717 | 7 | 65.1 | L 0-10 Darwin Drovers |
| S5 W3 | balanced | 6 speed 3, handling 1, footyIQ 2 | $2267k | $43k | 760 | 9 | 65.1 | W 13-6 Southport Stingrays |
| S5 W4 | balanced | 3 speed 1, stamina 1, handling 1 | $2270k | $2.8k | 749 | 6 | 65.2 | W 5-4 Broken Hill Brollys |
| S5 W5 | balanced | 6 speed 1, handling 1, kicking 1, footyIQ 3 | $2284k | $14k | 734 | 9 | 65.4 | W 1-0 Geelong Gulls |
| S5 W6 | balanced | 2 strength 1, footyIQ 1 | $2287k | $2.8k | 763 | 6 | 65.4 | D 10-10 Wagga Swagmen |
| S5 W7 | balanced | 7 speed 2, strength 2, stamina 1, footyIQ 2 | $2330k | $43k | 827 | 11 | 65.4 | W 26-0 Katherine Crocs |
| S5 W8 | balanced | 1 footyIQ 1 | $2333k | $2.9k | 816 | 4 | 65.4 | W 31-13 Shellharbour Scorpions |
| S5 W9 | balanced | 7 speed 1, stamina 1, kicking 1, footyIQ 4 | $2381k | $48k | 723 | 9 | 65.5 | L 0-16 Dubbo Diggers |
| S5 W10 | balanced | 2 speed 2 | $2384k | $2.9k | 723 | 5 | 65.5 | L 0-9 Mackay Marlins |
| S5 W11 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, footyIQ 2 | $2427k | $43k | 784 | 11 | 65.6 | W 12-0 Ballarat Bushrangers |
| S5 W12 | balanced | 3 handling 1, footyIQ 2 | $2430k | $2.9k | 806 | 7 | 65.6 | W 24-10 Cairns Cyclones |
| S5 W13 | balanced | 5 speed 2, strength 1, stamina 1, handling 1 | $2473k | $43k | 835 | 9 | 65.7 | W 30-0 Toowoomba Thunder |
| S5 W14 | balanced | 4 speed 1, strength 2, stamina 1 | $2476k | $2.9k | 768 | 6 | 65.7 | W 8-0 Woolloomooloo Wolves |
| S5 W15 | balanced | 6 stamina 1, kicking 2, footyIQ 3 | $2519k | $43k | 850 | 9 | 65.8 | W 38-16 Redcliffe Reapers |
| S5 W16 | balanced | 3 speed 2, footyIQ 1 | $2522k | $2.9k | 789 | 8 | 65.8 | W 12-6 Launceston Larrikins |
| S5 W17 | balanced | 6 speed 2, strength 1, footyIQ 3 | $2569k | $46k | 792 | 9 | 65.9 | W 20-10 Darwin Drovers |
| S5 W18 | balanced | 3 speed 1, stamina 1, handling 1 | $2572k | $3.0k | 822 | 8 | 65.9 | W 29-10 Southport Stingrays |
| S5 W19 | balanced | 4 speed 2, stamina 1, handling 1 | $2615k | $43k | 793 | 7 | 65.9 | W 24-18 Broken Hill Brollys |
| S5 W20 | balanced | 3 strength 1, handling 1, footyIQ 1 | $2618k | $3.0k | 774 | 8 | 66.0 | D 6-6 Geelong Gulls |
| S5 W21 | balanced | 6 speed 1, strength 1, handling 2, kicking 1, footyIQ 1 | $2662k | $44k | 751 | 8 | 66.0 | W 7-6 Wagga Swagmen |
| S5 W22 | balanced | 1 footyIQ 1 | $2665k | $3.0k | 788 | 6 | 66.0 | W 19-0 Katherine Crocs |
| S5 W23 | balanced | 7 speed 2, strength 1, kicking 1, footyIQ 3 | $2715k | $50k | 785 | 12 | 66.1 | W 16-4 Shellharbour Scorpions |
| S5 W24 | balanced | 1 speed 1 | $2718k | $3.0k | 760 | 3 | 66.1 | W 6-0 Dubbo Diggers |
| S5 W25 final | balanced | 8 speed 4, strength 1, handling 2, footyIQ 1 | $2761k | $43k | 833 | 13 | 66.2 | W 25-10 Wagga Swagmen |
| S5 W26 final | balanced | 1 stamina 1 | $2805k | $43k | 762 | 5 | 66.2 | W 13-8 Redcliffe Reapers |
| S5 W27 final | balanced | 2 strength 1, handling 1 | $2980k | $175k | 665 | 6 | 80.6 | W 30-6 Ballarat Bushrangers |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $88k | -$2.1k | 704 | 1.50 | 53.3 | 59.0 | 0.0% | 55.0% |
| S1 trial 2 | 20 | $91k | $2.9k | 714 | 5.85 | 53.3 | 59.1 | 0.0% | 45.0% |
| S1 W1 | 20 | $116k | $25k | 713 | 5.15 | 53.4 | 59.2 | 0.0% | 70.0% |
| S1 W2 | 20 | $116k | $290 | 707 | 7.25 | 53.4 | 59.3 | 0.0% | 50.0% |
| S1 W3 | 20 | $146k | $30k | 712 | 5.40 | 53.5 | 59.4 | 0.0% | 50.0% |
| S1 W4 | 20 | $146k | -$120 | 711 | 6.25 | 53.5 | 59.6 | 0.0% | 55.0% |
| S1 W5 | 20 | $172k | $26k | 723 | 8.30 | 53.6 | 59.8 | 0.0% | 65.0% |
| S1 W6 | 20 | $172k | -$534 | 718 | 6.80 | 53.7 | 60.0 | 0.0% | 65.0% |
| S1 W7 | 20 | $200k | $29k | 720 | 6.65 | 53.8 | 60.2 | 0.0% | 55.0% |
| S1 W8 | 20 | $202k | $1.2k | 723 | 8.70 | 53.9 | 60.3 | 0.0% | 60.0% |
| S1 W9 | 20 | $232k | $30k | 705 | 7.15 | 53.9 | 60.4 | 0.0% | 55.0% |
| S1 W10 | 20 | $233k | $1.3k | 715 | 5.20 | 54.0 | 60.5 | 0.0% | 55.0% |
| S1 W11 | 20 | $259k | $26k | 716 | 9.15 | 54.1 | 60.7 | 0.0% | 75.0% |
| S1 W12 | 20 | $260k | $1.6k | 715 | 5.75 | 54.1 | 60.8 | 0.0% | 55.0% |
| S1 W13 | 20 | $292k | $32k | 719 | 7.90 | 54.2 | 61.0 | 0.0% | 65.0% |
| S1 W14 | 20 | $294k | $1.5k | 725 | 7.95 | 54.3 | 61.1 | 0.0% | 55.0% |
| S1 W15 | 20 | $326k | $32k | 709 | 6.35 | 54.3 | 61.2 | 0.0% | 40.0% |
| S1 W16 | 20 | $325k | -$466 | 726 | 5.80 | 54.4 | 61.4 | 0.0% | 60.0% |
| S1 W17 | 20 | $357k | $32k | 731 | 9.90 | 54.5 | 61.5 | 0.0% | 70.0% |
| S1 W18 | 20 | $358k | $1.1k | 737 | 5.65 | 54.5 | 61.6 | 0.0% | 70.0% |
| S1 W19 | 20 | $387k | $29k | 731 | 7.70 | 54.6 | 61.8 | 0.0% | 70.0% |
| S1 W20 | 20 | $389k | $1.5k | 713 | 7.70 | 54.6 | 61.9 | 0.0% | 45.0% |
| S1 W21 | 20 | $417k | $29k | 730 | 5.60 | 54.7 | 62.1 | 0.0% | 75.0% |
| S1 W22 | 20 | $419k | $1.2k | 717 | 6.85 | 54.8 | 62.3 | 0.0% | 55.0% |
| S1 W23 | 20 | $446k | $27k | 740 | 8.65 | 54.9 | 62.5 | 0.0% | 75.0% |
| S1 W24 | 20 | $447k | $1.1k | 725 | 6.35 | 54.9 | 62.7 | 0.0% | 45.0% |
| S1 W25 final | 20 | $474k | $27k | 705 | 6.35 | 55.0 | 62.8 | 0.0% | 63.2% |
| S1 W26 final | 20 | $488k | $14k | 511 | 6.50 | 55.1 | 63.0 | 0.0% | 50.0% |
| S1 W27 final | 20 | $548k | $61k | 313 | 3.00 | 57.1 | 62.9 | 0.0% | 50.0% |
| S2 trial 1 | 20 | $535k | -$13k | 694 | 6.15 | 57.0 | 63.2 | 0.0% | 55.0% |
| S2 trial 2 | 20 | $540k | $4.8k | 701 | 8.60 | 57.1 | 63.3 | 0.0% | 60.0% |
| S2 W1 | 20 | $573k | $32k | 697 | 6.35 | 57.1 | 63.5 | 0.0% | 75.0% |
| S2 W2 | 20 | $574k | $1.8k | 691 | 6.65 | 57.2 | 63.6 | 0.0% | 55.0% |
| S2 W3 | 20 | $612k | $38k | 699 | 6.30 | 57.3 | 63.7 | 0.0% | 60.0% |
| S2 W4 | 20 | $614k | $2.2k | 697 | 6.60 | 57.4 | 63.9 | 0.0% | 75.0% |
| S2 W5 | 20 | $651k | $36k | 699 | 6.90 | 57.4 | 64.0 | 0.0% | 65.0% |
| S2 W6 | 20 | $652k | $995 | 699 | 9.00 | 57.6 | 64.2 | 0.0% | 65.0% |
| S2 W7 | 20 | $691k | $39k | 713 | 7.70 | 57.6 | 64.3 | 0.0% | 55.0% |
| S2 W8 | 20 | $690k | -$722 | 701 | 6.20 | 57.7 | 64.5 | 0.0% | 70.0% |
| S2 W9 | 20 | $727k | $37k | 691 | 6.95 | 57.8 | 64.7 | 0.0% | 65.0% |
| S2 W10 | 20 | $728k | $634 | 719 | 6.80 | 57.9 | 64.9 | 0.0% | 75.0% |
| S2 W11 | 20 | $765k | $37k | 690 | 7.25 | 58.0 | 65.0 | 0.0% | 50.0% |
| S2 W12 | 20 | $766k | $1.3k | 710 | 6.45 | 58.1 | 65.1 | 0.0% | 85.0% |
| S2 W13 | 20 | $806k | $39k | 701 | 7.60 | 58.1 | 65.3 | 0.0% | 45.0% |
| S2 W14 | 20 | $807k | $1.7k | 695 | 6.45 | 58.2 | 65.4 | 0.0% | 55.0% |
| S2 W15 | 20 | $846k | $38k | 680 | 7.30 | 58.3 | 65.6 | 0.0% | 25.0% |
| S2 W16 | 20 | $848k | $2.1k | 705 | 7.00 | 58.4 | 65.7 | 0.0% | 65.0% |
| S2 W17 | 20 | $885k | $37k | 705 | 6.95 | 58.5 | 65.9 | 0.0% | 45.0% |
| S2 W18 | 20 | $887k | $2.1k | 711 | 7.05 | 58.5 | 66.0 | 0.0% | 55.0% |
| S2 W19 | 20 | $920k | $33k | 704 | 7.25 | 58.6 | 66.2 | 0.0% | 50.0% |
| S2 W20 | 20 | $922k | $1.8k | 702 | 7.10 | 58.7 | 66.3 | 0.0% | 60.0% |
| S2 W21 | 20 | $960k | $37k | 707 | 6.80 | 58.8 | 66.5 | 0.0% | 55.0% |
| S2 W22 | 20 | $961k | $1.8k | 703 | 6.85 | 58.8 | 66.7 | 0.0% | 60.0% |
| S2 W23 | 20 | $998k | $37k | 708 | 6.80 | 58.9 | 66.8 | 0.0% | 85.0% |
| S2 W24 | 20 | $1000k | $2.0k | 713 | 7.20 | 59.0 | 66.9 | 0.0% | 70.0% |
| S2 W25 final | 20 | $1032k | $32k | 650 | 6.50 | 59.1 | 67.1 | 0.0% | 61.1% |
| S2 W26 final | 20 | $1052k | $21k | 479 | 5.00 | 59.1 | 67.2 | 0.0% | 72.7% |
| S2 W27 final | 20 | $1123k | $71k | 337 | 3.40 | 62.6 | 67.3 | 0.0% | 50.0% |
| S3 trial 1 | 20 | $1074k | -$49k | 651 | 5.75 | 60.9 | 67.6 | 0.0% | 65.0% |
| S3 trial 2 | 20 | $1074k | -$227 | 656 | 5.80 | 61.0 | 67.7 | 0.0% | 85.0% |
| S3 W1 | 20 | $1106k | $32k | 662 | 6.40 | 61.0 | 67.9 | 0.0% | 70.0% |
| S3 W2 | 20 | $1107k | $1.0k | 666 | 6.80 | 61.0 | 68.0 | 0.0% | 80.0% |
| S3 W3 | 20 | $1148k | $41k | 665 | 6.70 | 61.1 | 68.1 | 0.0% | 60.0% |
| S3 W4 | 20 | $1149k | $1.3k | 655 | 5.95 | 61.2 | 68.3 | 0.0% | 75.0% |
| S3 W5 | 20 | $1188k | $39k | 664 | 6.95 | 61.2 | 68.4 | 0.0% | 75.0% |
| S3 W6 | 20 | $1190k | $1.7k | 655 | 6.25 | 61.3 | 68.5 | 0.0% | 80.0% |
| S3 W7 | 20 | $1231k | $41k | 658 | 6.45 | 61.4 | 68.6 | 0.0% | 65.0% |
| S3 W8 | 20 | $1232k | $1.6k | 654 | 7.20 | 61.4 | 68.7 | 0.0% | 65.0% |
| S3 W9 | 20 | $1272k | $40k | 683 | 7.00 | 61.5 | 68.9 | 0.0% | 80.0% |
| S3 W10 | 20 | $1272k | $184 | 666 | 6.20 | 61.6 | 69.1 | 0.0% | 60.0% |
| S3 W11 | 20 | $1312k | $40k | 663 | 6.90 | 61.7 | 69.2 | 0.0% | 60.0% |
| S3 W12 | 20 | $1314k | $2.2k | 661 | 6.10 | 61.7 | 69.3 | 0.0% | 55.0% |
| S3 W13 | 20 | $1355k | $41k | 662 | 7.30 | 61.8 | 69.4 | 0.0% | 75.0% |
| S3 W14 | 20 | $1357k | $2.0k | 681 | 6.70 | 61.9 | 69.6 | 0.0% | 75.0% |
| S3 W15 | 20 | $1397k | $40k | 657 | 6.85 | 62.0 | 69.7 | 0.0% | 55.0% |
| S3 W16 | 20 | $1399k | $2.2k | 672 | 6.20 | 62.0 | 69.8 | 0.0% | 70.0% |
| S3 W17 | 20 | $1441k | $41k | 676 | 7.25 | 62.1 | 69.9 | 0.0% | 75.0% |
| S3 W18 | 20 | $1442k | $1.1k | 662 | 6.55 | 62.2 | 70.1 | 0.0% | 55.0% |
| S3 W19 | 20 | $1482k | $40k | 680 | 6.50 | 62.2 | 70.2 | 0.0% | 70.0% |
| S3 W20 | 20 | $1484k | $2.4k | 678 | 6.75 | 62.3 | 70.3 | 0.0% | 85.0% |
| S3 W21 | 20 | $1523k | $39k | 672 | 6.95 | 62.4 | 70.4 | 0.0% | 75.0% |
| S3 W22 | 20 | $1526k | $2.6k | 664 | 6.40 | 62.4 | 70.6 | 0.0% | 50.0% |
| S3 W23 | 20 | $1565k | $40k | 657 | 7.05 | 62.5 | 70.7 | 0.0% | 55.0% |
| S3 W24 | 20 | $1564k | -$1.3k | 669 | 6.40 | 62.6 | 70.9 | 0.0% | 60.0% |
| S3 W25 final | 20 | $1605k | $41k | 629 | 6.00 | 62.6 | 71.0 | 0.0% | 52.6% |
| S3 W26 final | 20 | $1628k | $23k | 398 | 4.55 | 62.7 | 71.0 | 0.0% | 60.0% |
| S3 W27 final | 20 | $1697k | $69k | 219 | 2.05 | 71.0 | 71.0 | 0.0% | 50.0% |
| S4 trial 1 | 20 | $1580k | -$117k | 633 | 5.55 | 63.9 | 71.0 | 0.0% | 60.0% |
| S4 trial 2 | 20 | $1582k | $1.8k | 665 | 5.95 | 64.1 | 71.3 | 0.0% | 65.0% |
| S4 W1 | 20 | $1623k | $41k | 653 | 6.50 | 64.1 | 71.4 | 0.0% | 60.0% |
| S4 W2 | 20 | $1625k | $2.3k | 669 | 6.05 | 64.2 | 71.5 | 0.0% | 75.0% |
| S4 W3 | 20 | $1667k | $42k | 663 | 7.15 | 64.2 | 71.6 | 0.0% | 75.0% |
| S4 W4 | 20 | $1669k | $1.6k | 655 | 6.45 | 64.3 | 71.7 | 0.0% | 60.0% |
| S4 W5 | 20 | $1710k | $41k | 647 | 6.40 | 64.4 | 71.8 | 0.0% | 70.0% |
| S4 W6 | 20 | $1709k | -$655 | 659 | 6.25 | 64.4 | 71.9 | 0.0% | 75.0% |
| S4 W7 | 20 | $1752k | $43k | 656 | 6.90 | 64.5 | 72.0 | 0.0% | 60.0% |
| S4 W8 | 20 | $1755k | $2.6k | 660 | 6.85 | 64.5 | 72.1 | 0.0% | 85.0% |
| S4 W9 | 20 | $1797k | $42k | 650 | 6.55 | 64.6 | 72.2 | 0.0% | 55.0% |
| S4 W10 | 20 | $1799k | $2.3k | 659 | 5.75 | 64.6 | 72.3 | 0.0% | 55.0% |
| S4 W11 | 20 | $1841k | $41k | 654 | 6.95 | 64.7 | 72.4 | 0.0% | 45.0% |
| S4 W12 | 20 | $1843k | $2.7k | 668 | 7.00 | 64.8 | 72.5 | 0.0% | 65.0% |
| S4 W13 | 20 | $1885k | $42k | 658 | 6.10 | 64.8 | 72.5 | 0.0% | 55.0% |
| S4 W14 | 20 | $1886k | $602 | 657 | 6.95 | 64.9 | 72.7 | 0.0% | 60.0% |
| S4 W15 | 20 | $1928k | $42k | 653 | 6.50 | 64.9 | 72.8 | 0.0% | 55.0% |
| S4 W16 | 20 | $1931k | $3.2k | 663 | 6.15 | 65.0 | 72.9 | 0.0% | 65.0% |
| S4 W17 | 20 | $1974k | $42k | 646 | 7.40 | 65.0 | 72.9 | 0.0% | 55.0% |
| S4 W18 | 20 | $1976k | $2.0k | 656 | 5.90 | 65.1 | 73.0 | 0.0% | 55.0% |
| S4 W19 | 20 | $2018k | $42k | 664 | 7.05 | 65.1 | 73.1 | 0.0% | 75.0% |
| S4 W20 | 20 | $2020k | $2.4k | 668 | 6.25 | 65.2 | 73.2 | 0.0% | 65.0% |
| S4 W21 | 20 | $2062k | $42k | 671 | 6.40 | 65.2 | 73.3 | 0.0% | 70.0% |
| S4 W22 | 20 | $2065k | $2.5k | 673 | 6.75 | 65.3 | 73.4 | 0.0% | 85.0% |
| S4 W23 | 20 | $2106k | $41k | 664 | 6.75 | 65.3 | 73.4 | 0.0% | 75.0% |
| S4 W24 | 20 | $2108k | $2.4k | 657 | 6.35 | 65.4 | 73.5 | 0.0% | 55.0% |
| S4 W25 final | 20 | $2142k | $33k | 618 | 6.45 | 65.4 | 73.6 | 0.0% | 77.8% |
| S4 W26 final | 20 | $2170k | $29k | 523 | 5.35 | 65.4 | 73.6 | 0.0% | 85.7% |
| S4 W27 final | 20 | $2267k | $96k | 360 | 3.45 | 73.6 | 73.7 | 0.0% | 66.7% |
| S5 trial 1 | 20 | $2159k | -$108k | 613 | 5.75 | 66.0 | 73.9 | 0.0% | 55.0% |
| S5 trial 2 | 20 | $2157k | -$1.3k | 638 | 5.65 | 66.0 | 74.0 | 0.0% | 70.0% |
| S5 W1 | 20 | $2197k | $40k | 639 | 6.05 | 66.1 | 74.1 | 0.0% | 75.0% |
| S5 W2 | 20 | $2200k | $2.3k | 637 | 5.95 | 66.2 | 74.1 | 0.0% | 55.0% |
| S5 W3 | 20 | $2242k | $43k | 638 | 7.10 | 66.2 | 74.2 | 0.0% | 70.0% |
| S5 W4 | 20 | $2245k | $2.9k | 640 | 5.45 | 66.3 | 74.3 | 0.0% | 75.0% |
| S5 W5 | 20 | $2285k | $40k | 634 | 6.90 | 66.3 | 74.4 | 0.0% | 60.0% |
| S5 W6 | 20 | $2288k | $3.0k | 640 | 6.10 | 66.4 | 74.5 | 0.0% | 65.0% |
| S5 W7 | 20 | $2329k | $41k | 640 | 6.25 | 66.4 | 74.5 | 0.0% | 65.0% |
| S5 W8 | 20 | $2331k | $2.3k | 656 | 6.75 | 66.4 | 74.6 | 0.0% | 70.0% |
| S5 W9 | 20 | $2375k | $44k | 643 | 6.55 | 66.5 | 74.6 | 0.0% | 60.0% |
| S5 W10 | 20 | $2378k | $3.1k | 636 | 5.20 | 66.5 | 74.7 | 0.0% | 45.0% |
| S5 W11 | 20 | $2421k | $43k | 644 | 7.60 | 66.6 | 74.8 | 0.0% | 75.0% |
| S5 W12 | 20 | $2423k | $1.9k | 654 | 6.90 | 66.6 | 74.9 | 0.0% | 80.0% |
| S5 W13 | 20 | $2467k | $44k | 646 | 5.20 | 66.7 | 74.9 | 0.0% | 60.0% |
| S5 W14 | 20 | $2470k | $3.5k | 634 | 7.55 | 66.7 | 75.0 | 0.0% | 60.0% |
| S5 W15 | 20 | $2512k | $42k | 658 | 6.00 | 66.8 | 75.0 | 0.0% | 65.0% |
| S5 W16 | 20 | $2515k | $3.2k | 643 | 5.70 | 66.8 | 75.1 | 0.0% | 60.0% |
| S5 W17 | 20 | $2558k | $43k | 643 | 7.70 | 66.8 | 75.2 | 0.0% | 65.0% |
| S5 W18 | 20 | $2560k | $1.4k | 656 | 6.05 | 66.9 | 75.2 | 0.0% | 80.0% |
| S5 W19 | 20 | $2603k | $43k | 637 | 6.05 | 66.9 | 75.3 | 0.0% | 60.0% |
| S5 W20 | 20 | $2606k | $3.1k | 650 | 6.50 | 66.9 | 75.3 | 0.0% | 60.0% |
| S5 W21 | 20 | $2649k | $43k | 645 | 6.65 | 67.0 | 75.4 | 0.0% | 70.0% |
| S5 W22 | 20 | $2652k | $3.2k | 650 | 5.80 | 67.0 | 75.4 | 0.0% | 75.0% |
| S5 W23 | 20 | $2695k | $43k | 652 | 7.30 | 67.1 | 75.5 | 0.0% | 85.0% |
| S5 W24 | 20 | $2698k | $2.5k | 652 | 5.70 | 67.1 | 75.6 | 0.0% | 70.0% |
| S5 W25 final | 20 | $2733k | $36k | 643 | 6.80 | 67.1 | 75.6 | 0.0% | 60.0% |
| S5 W26 final | 20 | $2754k | $21k | 465 | 4.60 | 67.2 | 75.7 | 0.0% | 58.3% |
| S5 W27 final | 20 | $2836k | $81k | 259 | 2.80 | 75.9 | 75.9 | 0.0% | 87.5% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × rush | 2492 | 67.9% | 101 | 67.8% | 0.1% |  |
| balanced × slide | 101 | 67.8% | 2492 | 67.9% | -0.1% |  |

### casual-weekly/normal/au

- 70 overall (best nine, including recruitment): 100.7 weeks; 14 reached, 6 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 180 of 400; median 19.0 weeks among those who did.
- Reaching potential stars: 227 of 400 (95 already there at week 0); median 48.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/315; S3 25/179; S5 63/136.
- Mean XP per completed season 18789; mean level-ups per completed season 184.5.
- Cash: opening 60000; mean weekly change 17867; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 93; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1498k after opening at $60k, and no career went into debt.
- WARNING: cash climbs by $18k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 53308 |
| gate | 475829 |
| prize | 47043 |
| boardGrant | 10323 |
| events | -7939 |
| transfers | -58694 |
| contracts | 0 |
| facilities | -1720 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 4 strength 1, stamina 1, kicking 1, footyIQ 1 | $60k | -$500 | 998 | 4 | 49.4 | W 7-0 Dubbo Diggers |
| S1 trial 2 | balanced | 8 strength 2, stamina 3, handling 1, kicking 1, footyIQ 1 | $61k | $1.2k | 993 | 8 | 49.5 | W 10-0 Wagga Swagmen |
| S1 W1 | balanced | 8 strength 3, stamina 1, footyIQ 4 | $87k | $26k | 887 | 8 | 49.5 | L 0-1 Launceston Larrikins |
| S1 W2 | balanced | 12 strength 3, stamina 3, handling 2, kicking 1, footyIQ 3 | $90k | $3.2k | 1001 | 12 | 49.7 | W 13-4 Darwin Drovers |
| S1 W3 | balanced | 7 speed 1, strength 3, handling 1, kicking 1, footyIQ 1 | $117k | $26k | 992 | 7 | 49.7 | D 6-6 Southport Stingrays |
| S1 W4 | balanced | 9 speed 2, strength 1, stamina 1, footyIQ 5 | $118k | $1.2k | 933 | 9 | 49.8 | D 0-0 Broken Hill Brollys |
| S1 W5 | balanced | 12 strength 3, stamina 2, handling 1, kicking 2, footyIQ 4 | $146k | $28k | 1036 | 12 | 49.9 | W 10-0 Geelong Gulls |
| S1 W6 | balanced | 9 speed 2, strength 4, kicking 1, footyIQ 2 | $148k | $1.2k | 952 | 9 | 50.0 | W 6-4 Wagga Swagmen |
| S1 W7 | balanced | 8 speed 3, strength 1, stamina 2, handling 1, footyIQ 1 | $183k | $36k | 894 | 8 | 50.1 | L 0-6 Katherine Crocs |
| S1 W8 | balanced | 9 speed 1, strength 3, handling 1, kicking 2, footyIQ 2 | $185k | $1.2k | 883 | 9 | 50.2 | L 0-8 Shellharbour Scorpions |
| S1 W9 | balanced | 8 speed 5, strength 1, footyIQ 2 | $216k | $31k | 913 | 8 | 50.3 | L 0-4 Dubbo Diggers |
| S1 W10 | balanced | 8 speed 1, stamina 1, handling 1, kicking 2, footyIQ 3 | $217k | $1.2k | 969 | 8 | 50.3 | W 6-4 Mackay Marlins |
| S1 W11 | balanced | 14 speed 4, strength 3, stamina 1, handling 1, footyIQ 5 | $210k | -$7.7k | 975 | 14 | 51.4 | W 4-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 speed 1, strength 1, stamina 2, handling 2, footyIQ 1 | $211k | $1.2k | 960 | 7 | 51.4 | L 4-5 Cairns Cyclones |
| S1 W13 | balanced | 9 speed 3, strength 4, kicking 2 | $241k | $30k | 958 | 9 | 51.5 | L 10-11 Toowoomba Thunder |
| S1 W14 | balanced | 12 speed 2, strength 1, stamina 3, handling 1, kicking 1, footyIQ 4 | $242k | $1.2k | 915 | 12 | 51.6 | L 0-15 Woolloomooloo Wolves |
| S1 W15 | balanced | 8 speed 1, strength 2, handling 2, footyIQ 3 | $268k | $26k | 943 | 8 | 51.7 | D 0-0 Redcliffe Reapers |
| S1 W16 | balanced | 8 speed 1, strength 2, stamina 2, kicking 2, footyIQ 1 | $269k | $1.2k | 1006 | 8 | 51.8 | W 4-0 Launceston Larrikins |
| S1 W17 | balanced | 12 speed 4, strength 1, stamina 2, handling 1, footyIQ 4 | $293k | $24k | 990 | 12 | 51.9 | D 6-6 Darwin Drovers |
| S1 W18 | balanced | 9 speed 2, strength 2, stamina 1, handling 2, footyIQ 2 | $295k | $1.2k | 1001 | 9 | 52.0 | W 6-0 Southport Stingrays |
| S1 W19 | balanced | 7 speed 1, strength 3, handling 1, kicking 1, footyIQ 1 | $323k | $28k | 1003 | 7 | 52.0 | W 12-11 Broken Hill Brollys |
| S1 W20 | balanced | 15 speed 4, strength 2, stamina 2, kicking 1, footyIQ 6 | $324k | $1.2k | 1076 | 15 | 52.2 | W 19-10 Geelong Gulls |
| S1 W21 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, footyIQ 1 | $363k | $38k | 965 | 6 | 52.2 | W 7-0 Wagga Swagmen |
| S1 W22 | balanced | 11 speed 4, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $364k | $1.2k | 1062 | 11 | 52.4 | W 16-6 Katherine Crocs |
| S1 W23 | balanced | 12 speed 2, strength 1, stamina 3, handling 1, kicking 1, footyIQ 4 | $404k | $40k | 1074 | 12 | 52.5 | W 14-0 Shellharbour Scorpions |
| S1 W24 | balanced | 13 speed 4, strength 3, stamina 1, handling 2, kicking 1, footyIQ 2 | $405k | $1.2k | 1025 | 13 | 52.6 | W 13-0 Dubbo Diggers |
| S1 W25 final | balanced | 7 strength 1, stamina 1, handling 1, footyIQ 4 | $448k | $43k | 939 | 7 | 52.7 | L 0-7 Ballarat Bushrangers |
| S1 W26 final | balanced | 3 strength 1, handling 1, footyIQ 1 | $450k | $1.2k | 251 | 3 | 52.7 | no match |
| S1 W27 final | balanced | 3 speed 1, strength 1, stamina 1 | $493k | $43k | 235 | 3 | 54.1 | no match |
| S2 trial 1 | balanced | 6 speed 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $494k | $1.5k | 832 | 6 | 54.1 | L 4-6 Darwin Drovers |
| S2 trial 2 | balanced | 11 speed 3, strength 1, stamina 1, kicking 1, footyIQ 5 | $503k | $9.1k | 870 | 11 | 54.2 | W 6-0 Shellharbour Scorpions |
| S2 W1 | balanced | 10 speed 3, strength 2, handling 3, footyIQ 2 | $535k | $32k | 840 | 10 | 54.4 | L 6-8 Launceston Larrikins |
| S2 W2 | balanced | 6 strength 2, stamina 2, handling 1, kicking 1 | $537k | $1.5k | 936 | 6 | 54.4 | W 12-0 Darwin Drovers |
| S2 W3 | balanced | 9 speed 2, strength 1, stamina 1, kicking 1, footyIQ 4 | $575k | $38k | 911 | 9 | 54.5 | W 10-4 Southport Stingrays |
| S2 W4 | balanced | 8 speed 3, handling 1, footyIQ 4 | $576k | $1.5k | 827 | 8 | 54.6 | L 0-18 Broken Hill Brollys |
| S2 W5 | balanced | 9 speed 1, strength 3, stamina 1, handling 3, footyIQ 1 | $608k | $32k | 856 | 9 | 54.7 | L 6-7 Geelong Gulls |
| S2 W6 | balanced | 9 speed 3, strength 1, stamina 3, kicking 2 | $609k | $1.5k | 815 | 9 | 54.8 | D 0-0 Wagga Swagmen |
| S2 W7 | balanced | 12 speed 5, strength 1, stamina 2, handling 1, footyIQ 3 | $651k | $42k | 945 | 12 | 54.9 | W 20-0 Katherine Crocs |
| S2 W8 | balanced | 7 strength 1, stamina 1, handling 1, kicking 1, footyIQ 3 | $653k | $1.6k | 777 | 7 | 55.0 | L 4-12 Shellharbour Scorpions |
| S2 W9 | balanced | 9 speed 2, strength 2, stamina 1, handling 1, footyIQ 3 | $687k | $35k | 867 | 9 | 55.1 | W 4-0 Dubbo Diggers |
| S2 W10 | balanced | 7 speed 1, stamina 2, handling 1, footyIQ 3 | $689k | $1.6k | 839 | 7 | 55.2 | L 0-10 Mackay Marlins |
| S2 W11 | balanced | 10 speed 1, strength 4, handling 2, kicking 2, footyIQ 1 | $721k | $32k | 932 | 10 | 55.3 | W 20-6 Ballarat Bushrangers |
| S2 W12 | balanced | 8 speed 3, strength 1, stamina 1, footyIQ 3 | $717k | -$4.4k | 850 | 8 | 55.4 | L 7-16 Cairns Cyclones |
| S2 W13 | balanced | 9 speed 3, strength 1, stamina 2, handling 1, footyIQ 2 | $754k | $37k | 830 | 9 | 55.5 | L 6-12 Toowoomba Thunder |
| S2 W14 | balanced | 9 speed 3, strength 2, handling 2, kicking 2 | $755k | $1.6k | 896 | 9 | 55.6 | L 10-13 Woolloomooloo Wolves |
| S2 W15 | balanced | 8 speed 2, stamina 2, footyIQ 4 | $785k | $30k | 909 | 8 | 55.7 | W 18-7 Redcliffe Reapers |
| S2 W16 | balanced | 10 speed 3, strength 1, stamina 1, handling 3, footyIQ 2 | $789k | $3.6k | 939 | 10 | 55.8 | W 14-6 Launceston Larrikins |
| S2 W17 | balanced | 8 speed 2, strength 1, handling 2, kicking 2, footyIQ 1 | $829k | $40k | 950 | 8 | 55.9 | W 18-6 Darwin Drovers |
| S2 W18 | balanced | 9 speed 1, strength 3, stamina 1, footyIQ 4 | $831k | $1.6k | 807 | 9 | 56.0 | L 0-21 Southport Stingrays |
| S2 W19 | balanced | 11 speed 2, strength 5, stamina 1, handling 2, footyIQ 1 | $873k | $42k | 952 | 11 | 56.1 | W 14-6 Broken Hill Brollys |
| S2 W20 | balanced | 7 strength 1, stamina 3, kicking 2, footyIQ 1 | $874k | $1.6k | 828 | 7 | 56.2 | L 0-18 Geelong Gulls |
| S2 W21 | balanced | 8 speed 4, stamina 1, footyIQ 3 | $916k | $42k | 867 | 8 | 56.3 | L 13-14 Wagga Swagmen |
| S2 W22 | balanced | 10 speed 4, strength 1, handling 1, footyIQ 4 | $915k | -$1.4k | 880 | 10 | 56.4 | W 6-0 Katherine Crocs |
| S2 W23 | balanced | 9 speed 1, strength 2, stamina 2, handling 2, kicking 2 | $947k | $32k | 956 | 9 | 56.5 | W 18-10 Shellharbour Scorpions |
| S2 W24 | balanced | 8 speed 2, stamina 3, footyIQ 3 | $949k | $1.6k | 963 | 8 | 56.6 | W 18-7 Dubbo Diggers |
| S2 W25 final | balanced | 11 speed 4, strength 2, handling 3, footyIQ 2 | $943k | -$6.4k | 934 | 11 | 56.7 | W 12-0 Katherine Crocs |
| S2 W26 final | balanced | 7 strength 2, stamina 1, kicking 2, footyIQ 2 | $944k | $1.6k | 919 | 7 | 56.8 | W 10-9 Cairns Cyclones |
| S2 W27 final | balanced | 10 speed 2, strength 2, stamina 2, footyIQ 4 | $1101k | $157k | 885 | 10 | 60.8 | W 11-10 Woolloomooloo Wolves |
| S3 trial 1 | balanced | 7 speed 2, strength 1, stamina 1, handling 3 | $1074k | -$27k | 763 | 7 | 60.5 | L 12-14 Cairns Cyclones |
| S3 trial 2 | balanced | 9 speed 3, stamina 2, kicking 2, footyIQ 2 | $1076k | $2.3k | 823 | 9 | 60.6 | W 10-0 Mackay Marlins |
| S3 W1 | balanced | 7 speed 3, strength 1, handling 1, footyIQ 2 | $1120k | $44k | 717 | 7 | 60.7 | L 0-7 Launceston Larrikins |
| S3 W2 | balanced | 8 speed 3, strength 1, stamina 1, handling 1, footyIQ 2 | $1123k | $2.3k | 711 | 8 | 60.8 | L 0-1 Darwin Drovers |
| S3 W3 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $1167k | $44k | 787 | 7 | 60.9 | W 6-4 Southport Stingrays |
| S3 W4 | balanced | 5 handling 1, kicking 1, footyIQ 3 | $1169k | $2.3k | 789 | 5 | 60.9 | W 6-4 Broken Hill Brollys |
| S3 W5 | balanced | 9 speed 2, strength 2, handling 1, footyIQ 4 | $1219k | $49k | 844 | 11 | 61.1 | W 16-0 Geelong Gulls |
| S3 W6 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, kicking 2 | $1221k | $2.3k | 812 | 8 | 61.2 | W 18-0 Wagga Swagmen |
| S3 W7 | balanced | 3 strength 1, footyIQ 2 | $1265k | $44k | 645 | 4 | 61.2 | L 0-8 Katherine Crocs |
| S3 W8 | balanced | 9 speed 3, stamina 2, handling 1, footyIQ 3 | $1268k | $2.4k | 656 | 10 | 61.3 | L 6-12 Shellharbour Scorpions |
| S3 W9 | balanced | 5 speed 4, handling 1 | $1312k | $44k | 749 | 6 | 61.4 | D 0-0 Dubbo Diggers |
| S3 W10 | balanced | 5 strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $1314k | $2.4k | 746 | 6 | 61.5 | L 4-10 Mackay Marlins |
| S3 W11 | balanced | 7 speed 1, strength 1, handling 2, footyIQ 3 | $1359k | $44k | 688 | 8 | 61.6 | W 10-0 Ballarat Bushrangers |
| S3 W12 | balanced | 7 speed 2, strength 2, handling 1, kicking 1, footyIQ 1 | $1361k | $2.4k | 751 | 8 | 61.6 | W 11-10 Cairns Cyclones |
| S3 W13 | balanced | 7 speed 2, strength 1, stamina 2, kicking 1, footyIQ 1 | $1406k | $44k | 744 | 8 | 61.7 | L 4-10 Toowoomba Thunder |
| S3 W14 | balanced | 8 speed 3, strength 1, handling 1, footyIQ 3 | $1411k | $5.4k | 835 | 9 | 61.9 | W 17-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 7 speed 1, stamina 1, handling 2, kicking 1, footyIQ 2 | $1455k | $44k | 796 | 8 | 61.9 | W 12-6 Redcliffe Reapers |
| S3 W16 | balanced | 4 kicking 1, footyIQ 3 | $1458k | $3.0k | 817 | 5 | 62.0 | W 18-6 Launceston Larrikins |
| S3 W17 | balanced | 10 speed 2, strength 4, handling 1, footyIQ 3 | $1503k | $44k | 827 | 12 | 62.1 | W 12-0 Darwin Drovers |
| S3 W18 | balanced | 4 speed 1, stamina 1, handling 1, kicking 1 | $1505k | $2.4k | 781 | 5 | 62.2 | W 6-0 Southport Stingrays |
| S3 W19 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, footyIQ 2 | $1550k | $44k | 723 | 8 | 62.3 | L 6-10 Broken Hill Brollys |
| S3 W20 | balanced | 7 speed 2, strength 1, handling 2, kicking 1, footyIQ 1 | $1559k | $9.4k | 719 | 9 | 62.4 | L 0-4 Geelong Gulls |
| S3 W21 | balanced | 5 speed 3, kicking 1, footyIQ 1 | $1604k | $44k | 714 | 5 | 62.4 | L 0-4 Wagga Swagmen |
| S3 W22 | balanced | 6 strength 1, stamina 1, handling 2, footyIQ 2 | $1606k | $2.4k | 747 | 7 | 62.5 | L 6-12 Katherine Crocs |
| S3 W23 | balanced | 5 speed 1, stamina 1, kicking 1, footyIQ 2 | $1646k | $40k | 761 | 8 | 62.6 | W 6-4 Shellharbour Scorpions |
| S3 W24 | balanced | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $1646k | -$560 | 799 | 9 | 62.7 | W 13-0 Dubbo Diggers |
| S3 W25 final | balanced | 4 speed 2, strength 1, footyIQ 1 | $1653k | $7.4k | 787 | 6 | 62.7 | W 10-6 Wagga Swagmen |
| S3 W26 final | balanced | 7 speed 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $1656k | $2.4k | 846 | 11 | 62.8 | W 11-4 Toowoomba Thunder |
| S3 W27 final | balanced | 3 speed 1, strength 1, footyIQ 1 | $1780k | $124k | 631 | 5 | 73.8 | L 10-18 Woolloomooloo Wolves |
| S4 trial 1 | balanced | 6 speed 2, handling 1, kicking 1, footyIQ 1 | $1643k | -$137k | 761 | 8 | 67.2 | W 16-0 Mackay Marlins |
| S4 trial 2 | balanced | 4 handling 1, footyIQ 2 | $1656k | $13k | 695 | 6 | 67.3 | D 12-12 Cairns Cyclones |
| S4 W1 | balanced | 3 handling 1, footyIQ 1 | $1700k | $45k | 696 | 6 | 67.3 | W 6-0 Launceston Larrikins |
| S4 W2 | balanced | 7 speed 2, strength 3, kicking 1 | $1703k | $2.6k | 727 | 9 | 67.3 | W 12-0 Darwin Drovers |
| S4 W3 | balanced | 2 stamina 1, footyIQ 1 | $1748k | $45k | 710 | 6 | 67.3 | W 12-0 Southport Stingrays |
| S4 W4 | balanced | 3 speed 1, handling 1, footyIQ 1 | $1750k | $2.6k | 747 | 7 | 67.4 | W 19-6 Broken Hill Brollys |
| S4 W5 | balanced | 3 speed 1, stamina 1, kicking 1 | $1795k | $45k | 712 | 7 | 67.4 | W 14-0 Geelong Gulls |
| S4 W6 | balanced | 3 speed 2, strength 1 | $1797k | $2.6k | 714 | 7 | 67.4 | W 10-0 Wagga Swagmen |
| S4 W7 | balanced | 3 speed 1, footyIQ 2 | $1842k | $45k | 699 | 8 | 67.4 | D 6-6 Katherine Crocs |
| S4 W8 | balanced | 5 speed 1, strength 2, handling 1, footyIQ 1 | $1846k | $4.6k | 708 | 7 | 67.5 | W 4-0 Shellharbour Scorpions |
| S4 W9 | balanced | 3 speed 1, stamina 1, handling 1 | $1893k | $47k | 734 | 7 | 67.5 | W 20-0 Dubbo Diggers |
| S4 W10 | balanced | 1 strength 1 | $1895k | $2.6k | 671 | 5 | 67.5 | L 7-10 Mackay Marlins |
| S4 W11 | balanced | 6 speed 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $1942k | $47k | 713 | 10 | 67.5 | W 12-4 Ballarat Bushrangers |
| S4 W12 | balanced | 2 footyIQ 2 | $1945k | $2.6k | 719 | 5 | 67.5 | W 11-0 Cairns Cyclones |
| S4 W13 | balanced | 2 speed 1, strength 1 | $1989k | $45k | 722 | 7 | 67.5 | L 16-18 Toowoomba Thunder |
| S4 W14 | balanced | 4 speed 1, strength 2, footyIQ 1 | $1990k | $560 | 692 | 8 | 67.6 | D 12-12 Woolloomooloo Wolves |
| S4 W15 | balanced | 3 speed 1, handling 1, footyIQ 1 | $2034k | $45k | 705 | 7 | 67.6 | W 13-0 Redcliffe Reapers |
| S4 W16 | balanced | 3 speed 2, stamina 1 | $2037k | $2.6k | 710 | 7 | 67.6 | W 4-0 Launceston Larrikins |
| S4 W17 | balanced | 5 speed 1, strength 2, stamina 1, kicking 1 | $2081k | $45k | 773 | 9 | 67.7 | W 16-10 Darwin Drovers |
| S4 W18 | balanced | 2 handling 2 | $2084k | $2.6k | 684 | 5 | 67.7 | L 8-10 Southport Stingrays |
| S4 W19 | balanced | 2 footyIQ 2 | $2129k | $45k | 732 | 6 | 67.7 | W 16-10 Broken Hill Brollys |
| S4 W20 | balanced | 6 speed 3, strength 2, footyIQ 1 | $2131k | $2.5k | 711 | 9 | 67.7 | W 20-6 Geelong Gulls |
| S4 W21 | balanced | 1 strength 1 | $2176k | $44k | 717 | 6 | 67.7 | W 12-10 Wagga Swagmen |
| S4 W22 | balanced | 3 stamina 1, handling 1, footyIQ 1 | $2178k | $2.5k | 732 | 8 | 67.7 | W 19-0 Katherine Crocs |
| S4 W23 | balanced | 4 speed 1, stamina 1, kicking 1, footyIQ 1 | $2223k | $44k | 674 | 7 | 67.8 | L 4-8 Shellharbour Scorpions |
| S4 W24 | balanced | 3 speed 1, strength 1, footyIQ 1 | $2225k | $2.6k | 711 | 6 | 67.8 | W 6-1 Dubbo Diggers |
| S4 W25 final | balanced | 3 handling 1, footyIQ 2 | $2270k | $45k | 711 | 8 | 67.8 | W 4-0 Darwin Drovers |
| S4 W26 final | balanced | 4 strength 3, footyIQ 1 | $2314k | $45k | 700 | 7 | 67.8 | W 7-6 Mackay Marlins |
| S4 W27 final | balanced | 2 speed 1, strength 1 | $2517k | $203k | 661 | 7 | 76.3 | W 10-0 Katherine Crocs |
| S5 trial 1 | balanced | 2 stamina 1, kicking 1 | $2520k | $3.3k | 704 | 5 | 62.9 | W 6-0 Geelong Gulls |
| S5 trial 2 | balanced | 3 stamina 1, handling 1, footyIQ 1 | $2534k | $14k | 737 | 5 | 62.9 | L 0-8 Southport Stingrays |
| S5 W1 | balanced | 7 speed 4, strength 1, kicking 1, footyIQ 1 | $2517k | -$16k | 806 | 9 | 62.3 | W 12-4 Launceston Larrikins |
| S5 W2 | balanced | 3 speed 1, strength 1, footyIQ 1 | $2521k | $3.3k | 809 | 6 | 62.3 | W 6-0 Darwin Drovers |
| S5 W3 | balanced | 8 speed 3, strength 2, handling 3 | $2566k | $45k | 842 | 11 | 62.5 | W 10-7 Southport Stingrays |
| S5 W4 | balanced | 1 footyIQ 1 | $2569k | $3.3k | 828 | 4 | 62.5 | W 11-5 Broken Hill Brollys |
| S5 W5 | balanced | 8 speed 3, strength 2, stamina 1, kicking 2 | $2615k | $45k | 920 | 13 | 62.6 | W 20-12 Geelong Gulls |
| S5 W6 | balanced | 3 speed 1, footyIQ 2 | $2618k | $3.3k | 815 | 7 | 62.6 | L 16-18 Wagga Swagmen |
| S5 W7 | balanced | 6 speed 2, strength 1, handling 2, footyIQ 1 | $2663k | $45k | 793 | 7 | 62.7 | L 4-8 Katherine Crocs |
| S5 W8 | balanced | 4 speed 1, strength 1, handling 1, footyIQ 1 | $2634k | -$30k | 833 | 8 | 63.2 | W 12-6 Shellharbour Scorpions |
| S5 W9 | balanced | 7 speed 4, strength 2, kicking 1 | $2679k | $45k | 856 | 11 | 63.3 | W 17-0 Dubbo Diggers |
| S5 W10 | balanced | 3 speed 1, strength 1, handling 1 | $2682k | $3.4k | 833 | 6 | 63.4 | W 12-4 Mackay Marlins |
| S5 W11 | balanced | 7 speed 2, strength 1, stamina 1, handling 2, footyIQ 1 | $2733k | $50k | 834 | 11 | 63.5 | W 8-6 Ballarat Bushrangers |
| S5 W12 | balanced | 4 speed 1, strength 1, stamina 1, kicking 1 | $2736k | $3.4k | 766 | 5 | 63.5 | D 0-0 Cairns Cyclones |
| S5 W13 | balanced | 5 speed 4, handling 1 | $2781k | $45k | 893 | 10 | 63.6 | W 32-4 Toowoomba Thunder |
| S5 W14 | balanced | 4 handling 1, footyIQ 3 | $2785k | $3.4k | 783 | 7 | 63.7 | L 4-5 Woolloomooloo Wolves |
| S5 W15 | balanced | 6 speed 3, strength 1, handling 1, kicking 1 | $2830k | $45k | 827 | 10 | 63.8 | W 10-4 Redcliffe Reapers |
| S5 W16 | balanced | 2 speed 1, strength 1 | $2833k | $3.4k | 872 | 6 | 63.8 | W 20-0 Launceston Larrikins |
| S5 W17 | balanced | 7 speed 4, strength 2, handling 1 | $2879k | $45k | 771 | 10 | 63.9 | L 0-9 Darwin Drovers |
| S5 W18 | balanced | 3 handling 1, footyIQ 2 | $2882k | $3.4k | 771 | 6 | 63.9 | L 0-16 Southport Stingrays |
| S5 W19 | balanced | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | $2928k | $45k | 857 | 11 | 64.0 | W 23-10 Broken Hill Brollys |
| S5 W20 | balanced | 2 speed 1, strength 1 | $2931k | $3.4k | 794 | 5 | 64.1 | L 4-8 Geelong Gulls |
| S5 W21 | balanced | 7 speed 2, strength 1, handling 1, kicking 1, footyIQ 2 | $2971k | $40k | 793 | 10 | 64.2 | W 1-0 Wagga Swagmen |
| S5 W22 | balanced | 1 handling 1 | $2975k | $3.4k | 856 | 7 | 64.2 | W 10-4 Katherine Crocs |
| S5 W23 | balanced | 8 speed 3, strength 3, handling 1, footyIQ 1 | $3020k | $45k | 787 | 11 | 64.3 | L 0-4 Shellharbour Scorpions |
| S5 W24 | balanced | 1 stamina 1 | $3024k | $4.0k | 872 | 5 | 64.3 | W 18-6 Dubbo Diggers |
| S5 W25 final | balanced | 7 strength 1, handling 3, footyIQ 3 | $3072k | $48k | 782 | 11 | 64.4 | L 4-21 Launceston Larrikins |
| S5 W26 final | balanced | 2 strength 1, footyIQ 1 | $3076k | $3.4k | 211 | 3 | 64.4 | no match |
| S5 W27 final | balanced | 0 | $3104k | $28k | 106 | 0 | 78.6 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $58k | -$2.0k | 691 | 1.30 | 49.5 | 55.5 | 0.0% | 35.0% |
| S1 trial 2 | 20 | $61k | $3.1k | 688 | 5.80 | 49.5 | 55.6 | 0.0% | 30.0% |
| S1 W1 | 20 | $87k | $26k | 703 | 5.00 | 49.5 | 55.7 | 0.0% | 55.0% |
| S1 W2 | 20 | $87k | $290 | 709 | 7.60 | 49.6 | 55.8 | 0.0% | 30.0% |
| S1 W3 | 20 | $118k | $30k | 711 | 4.80 | 49.6 | 55.9 | 0.0% | 25.0% |
| S1 W4 | 20 | $118k | -$75 | 705 | 6.60 | 49.7 | 56.1 | 0.0% | 50.0% |
| S1 W5 | 20 | $143k | $26k | 708 | 8.35 | 49.8 | 56.3 | 0.0% | 50.0% |
| S1 W6 | 20 | $143k | -$534 | 722 | 6.65 | 49.9 | 56.5 | 0.0% | 50.0% |
| S1 W7 | 20 | $171k | $28k | 715 | 6.20 | 50.0 | 56.7 | 0.0% | 65.0% |
| S1 W8 | 20 | $172k | $1.2k | 699 | 8.40 | 50.1 | 56.8 | 0.0% | 40.0% |
| S1 W9 | 20 | $203k | $31k | 701 | 7.30 | 50.1 | 56.9 | 0.0% | 40.0% |
| S1 W10 | 20 | $204k | $1.4k | 716 | 4.60 | 50.2 | 57.0 | 0.0% | 60.0% |
| S1 W11 | 20 | $230k | $26k | 714 | 10.20 | 50.3 | 57.3 | 0.0% | 50.0% |
| S1 W12 | 20 | $231k | $1.5k | 698 | 4.90 | 50.4 | 57.4 | 0.0% | 10.0% |
| S1 W13 | 20 | $262k | $30k | 711 | 7.95 | 50.4 | 57.6 | 0.0% | 30.0% |
| S1 W14 | 20 | $263k | $1.5k | 711 | 7.65 | 50.5 | 57.7 | 0.0% | 35.0% |
| S1 W15 | 20 | $294k | $30k | 712 | 6.70 | 50.6 | 57.8 | 0.0% | 50.0% |
| S1 W16 | 20 | $293k | -$612 | 715 | 5.05 | 50.6 | 58.0 | 0.0% | 40.0% |
| S1 W17 | 20 | $323k | $30k | 729 | 10.40 | 50.7 | 58.1 | 0.0% | 55.0% |
| S1 W18 | 20 | $324k | $1.0k | 725 | 5.95 | 50.8 | 58.3 | 0.0% | 50.0% |
| S1 W19 | 20 | $353k | $29k | 723 | 6.65 | 50.8 | 58.4 | 0.0% | 55.0% |
| S1 W20 | 20 | $354k | $1.4k | 714 | 8.65 | 50.9 | 58.5 | 0.0% | 65.0% |
| S1 W21 | 20 | $382k | $28k | 719 | 5.15 | 51.0 | 58.8 | 0.0% | 65.0% |
| S1 W22 | 20 | $383k | $1.1k | 712 | 6.40 | 51.0 | 58.9 | 0.0% | 35.0% |
| S1 W23 | 20 | $410k | $27k | 742 | 9.25 | 51.2 | 59.2 | 0.0% | 75.0% |
| S1 W24 | 20 | $411k | $1.1k | 722 | 6.30 | 51.2 | 59.4 | 0.0% | 55.0% |
| S1 W25 final | 20 | $423k | $11k | 495 | 4.60 | 51.3 | 59.4 | 0.0% | 45.5% |
| S1 W26 final | 20 | $426k | $3.8k | 342 | 4.40 | 51.3 | 59.5 | 0.0% | 100.0% |
| S1 W27 final | 20 | $477k | $50k | 291 | 3.20 | 53.3 | 59.4 | 0.0% | 60.0% |
| S2 trial 1 | 20 | $466k | -$10k | 668 | 5.90 | 53.3 | 59.7 | 0.0% | 35.0% |
| S2 trial 2 | 20 | $469k | $2.9k | 690 | 7.45 | 53.4 | 59.9 | 0.0% | 75.0% |
| S2 W1 | 20 | $501k | $31k | 675 | 6.45 | 53.4 | 60.0 | 0.0% | 40.0% |
| S2 W2 | 20 | $502k | $1.1k | 679 | 6.70 | 53.5 | 60.1 | 0.0% | 45.0% |
| S2 W3 | 20 | $537k | $35k | 685 | 5.90 | 53.6 | 60.2 | 0.0% | 45.0% |
| S2 W4 | 20 | $538k | $1.4k | 687 | 7.35 | 53.7 | 60.4 | 0.0% | 55.0% |
| S2 W5 | 20 | $571k | $33k | 686 | 6.90 | 53.7 | 60.5 | 0.0% | 65.0% |
| S2 W6 | 20 | $573k | $1.5k | 688 | 8.25 | 53.8 | 60.7 | 0.0% | 45.0% |
| S2 W7 | 20 | $609k | $36k | 682 | 7.50 | 53.9 | 60.9 | 0.0% | 45.0% |
| S2 W8 | 20 | $608k | -$957 | 683 | 6.40 | 54.0 | 61.1 | 0.0% | 50.0% |
| S2 W9 | 20 | $643k | $35k | 682 | 6.20 | 54.1 | 61.2 | 0.0% | 50.0% |
| S2 W10 | 20 | $644k | $1.2k | 667 | 6.25 | 54.2 | 61.4 | 0.0% | 45.0% |
| S2 W11 | 20 | $679k | $35k | 685 | 7.25 | 54.3 | 61.5 | 0.0% | 50.0% |
| S2 W12 | 20 | $679k | $551 | 689 | 6.80 | 54.3 | 61.7 | 0.0% | 55.0% |
| S2 W13 | 20 | $715k | $36k | 670 | 6.85 | 54.4 | 61.8 | 0.0% | 30.0% |
| S2 W14 | 20 | $717k | $2.2k | 690 | 5.95 | 54.5 | 61.9 | 0.0% | 35.0% |
| S2 W15 | 20 | $754k | $36k | 682 | 8.10 | 54.6 | 62.1 | 0.0% | 30.0% |
| S2 W16 | 20 | $756k | $2.3k | 690 | 6.50 | 54.6 | 62.2 | 0.0% | 55.0% |
| S2 W17 | 20 | $791k | $34k | 692 | 6.75 | 54.7 | 62.4 | 0.0% | 60.0% |
| S2 W18 | 20 | $791k | $779 | 693 | 7.45 | 54.8 | 62.6 | 0.0% | 55.0% |
| S2 W19 | 20 | $824k | $33k | 695 | 6.50 | 54.9 | 62.7 | 0.0% | 65.0% |
| S2 W20 | 20 | $825k | $1.1k | 685 | 7.05 | 55.0 | 62.9 | 0.0% | 35.0% |
| S2 W21 | 20 | $861k | $36k | 682 | 6.15 | 55.0 | 63.0 | 0.0% | 25.0% |
| S2 W22 | 20 | $863k | $1.6k | 700 | 7.05 | 55.1 | 63.2 | 0.0% | 65.0% |
| S2 W23 | 20 | $897k | $34k | 694 | 6.75 | 55.2 | 63.3 | 0.0% | 55.0% |
| S2 W24 | 20 | $899k | $1.8k | 691 | 7.50 | 55.3 | 63.4 | 0.0% | 55.0% |
| S2 W25 final | 20 | $913k | $14k | 457 | 4.35 | 55.3 | 63.5 | 0.0% | 80.0% |
| S2 W26 final | 20 | $923k | $10k | 417 | 3.85 | 55.3 | 63.6 | 0.0% | 55.6% |
| S2 W27 final | 20 | $980k | $57k | 294 | 3.20 | 58.8 | 63.5 | 0.0% | 66.7% |
| S3 trial 1 | 20 | $927k | -$53k | 656 | 5.65 | 57.4 | 64.1 | 0.0% | 55.0% |
| S3 trial 2 | 20 | $931k | $3.4k | 661 | 6.20 | 57.4 | 64.2 | 0.0% | 50.0% |
| S3 W1 | 20 | $963k | $32k | 648 | 6.65 | 57.4 | 64.4 | 0.0% | 50.0% |
| S3 W2 | 20 | $964k | $1.1k | 671 | 6.75 | 57.5 | 64.5 | 0.0% | 75.0% |
| S3 W3 | 20 | $1003k | $39k | 665 | 6.85 | 57.6 | 64.6 | 0.0% | 70.0% |
| S3 W4 | 20 | $1004k | $1.0k | 670 | 6.65 | 57.7 | 64.7 | 0.0% | 75.0% |
| S3 W5 | 20 | $1043k | $39k | 659 | 6.35 | 57.7 | 64.9 | 0.0% | 60.0% |
| S3 W6 | 20 | $1044k | $1.3k | 653 | 6.20 | 57.8 | 65.0 | 0.0% | 50.0% |
| S3 W7 | 20 | $1083k | $39k | 639 | 6.15 | 57.9 | 65.1 | 0.0% | 45.0% |
| S3 W8 | 20 | $1085k | $1.8k | 650 | 6.75 | 57.9 | 65.3 | 0.0% | 30.0% |
| S3 W9 | 20 | $1124k | $39k | 641 | 6.65 | 58.0 | 65.4 | 0.0% | 40.0% |
| S3 W10 | 20 | $1124k | $314 | 651 | 6.25 | 58.1 | 65.6 | 0.0% | 40.0% |
| S3 W11 | 20 | $1161k | $37k | 662 | 5.95 | 58.2 | 65.7 | 0.0% | 55.0% |
| S3 W12 | 20 | $1163k | $2.0k | 653 | 6.70 | 58.2 | 65.8 | 0.0% | 35.0% |
| S3 W13 | 20 | $1200k | $37k | 659 | 7.50 | 58.3 | 65.9 | 0.0% | 65.0% |
| S3 W14 | 20 | $1202k | $1.9k | 657 | 6.75 | 58.4 | 66.0 | 0.0% | 50.0% |
| S3 W15 | 20 | $1241k | $39k | 656 | 6.85 | 58.5 | 66.2 | 0.0% | 45.0% |
| S3 W16 | 20 | $1243k | $2.5k | 654 | 5.65 | 58.5 | 66.3 | 0.0% | 65.0% |
| S3 W17 | 20 | $1281k | $38k | 664 | 7.35 | 58.6 | 66.4 | 0.0% | 45.0% |
| S3 W18 | 20 | $1284k | $2.2k | 648 | 5.60 | 58.6 | 66.5 | 0.0% | 30.0% |
| S3 W19 | 20 | $1320k | $37k | 661 | 7.35 | 58.7 | 66.7 | 0.0% | 60.0% |
| S3 W20 | 20 | $1322k | $2.1k | 663 | 6.30 | 58.8 | 66.8 | 0.0% | 60.0% |
| S3 W21 | 20 | $1361k | $38k | 668 | 6.60 | 58.9 | 66.9 | 0.0% | 55.0% |
| S3 W22 | 20 | $1362k | $1.8k | 655 | 6.25 | 58.9 | 67.0 | 0.0% | 45.0% |
| S3 W23 | 20 | $1399k | $36k | 662 | 7.05 | 59.0 | 67.1 | 0.0% | 50.0% |
| S3 W24 | 20 | $1399k | $445 | 676 | 7.05 | 59.1 | 67.3 | 0.0% | 75.0% |
| S3 W25 final | 20 | $1426k | $27k | 562 | 4.80 | 59.1 | 67.4 | 0.0% | 68.8% |
| S3 W26 final | 20 | $1443k | $17k | 434 | 4.75 | 59.2 | 67.5 | 0.0% | 54.5% |
| S3 W27 final | 20 | $1513k | $70k | 245 | 2.55 | 67.6 | 67.6 | 0.0% | 50.0% |
| S4 trial 1 | 18 | $1460k | -$102k | 645 | 5.33 | 60.9 | 68.0 | 0.0% | 50.0% |
| S4 trial 2 | 18 | $1459k | -$1.7k | 655 | 6.39 | 60.9 | 68.1 | 0.0% | 55.6% |
| S4 W1 | 18 | $1499k | $40k | 651 | 5.67 | 61.0 | 68.2 | 0.0% | 61.1% |
| S4 W2 | 18 | $1501k | $2.5k | 652 | 6.78 | 61.0 | 68.3 | 0.0% | 38.9% |
| S4 W3 | 18 | $1544k | $43k | 663 | 6.50 | 61.1 | 68.4 | 0.0% | 61.1% |
| S4 W4 | 18 | $1545k | $1.0k | 668 | 5.89 | 61.1 | 68.5 | 0.0% | 61.1% |
| S4 W5 | 18 | $1588k | $43k | 648 | 7.17 | 61.2 | 68.6 | 0.0% | 50.0% |
| S4 W6 | 18 | $1591k | $2.1k | 660 | 5.50 | 61.2 | 68.6 | 0.0% | 72.2% |
| S4 W7 | 18 | $1633k | $43k | 663 | 7.00 | 61.3 | 68.7 | 0.0% | 50.0% |
| S4 W8 | 18 | $1635k | $2.1k | 661 | 7.06 | 61.4 | 68.8 | 0.0% | 55.6% |
| S4 W9 | 18 | $1678k | $42k | 656 | 6.89 | 61.4 | 68.9 | 0.0% | 50.0% |
| S4 W10 | 18 | $1680k | $2.3k | 658 | 5.72 | 61.5 | 69.0 | 0.0% | 55.6% |
| S4 W11 | 18 | $1722k | $42k | 647 | 7.44 | 61.5 | 69.1 | 0.0% | 44.4% |
| S4 W12 | 18 | $1725k | $2.7k | 649 | 6.11 | 61.6 | 69.2 | 0.0% | 66.7% |
| S4 W13 | 18 | $1766k | $41k | 663 | 6.33 | 61.7 | 69.3 | 0.0% | 44.4% |
| S4 W14 | 18 | $1768k | $2.1k | 649 | 6.72 | 61.7 | 69.4 | 0.0% | 61.1% |
| S4 W15 | 18 | $1812k | $44k | 656 | 6.72 | 61.8 | 69.5 | 0.0% | 66.7% |
| S4 W16 | 18 | $1815k | $3.1k | 645 | 5.67 | 61.8 | 69.6 | 0.0% | 44.4% |
| S4 W17 | 18 | $1858k | $43k | 673 | 8.39 | 61.9 | 69.7 | 0.0% | 66.7% |
| S4 W18 | 18 | $1860k | $1.9k | 656 | 5.67 | 61.9 | 69.8 | 0.0% | 61.1% |
| S4 W19 | 18 | $1903k | $43k | 663 | 6.11 | 62.0 | 69.8 | 0.0% | 55.6% |
| S4 W20 | 18 | $1903k | $539 | 656 | 6.44 | 62.1 | 70.0 | 0.0% | 66.7% |
| S4 W21 | 18 | $1947k | $44k | 651 | 6.94 | 62.1 | 70.1 | 0.0% | 66.7% |
| S4 W22 | 18 | $1949k | $2.1k | 664 | 5.83 | 62.2 | 70.2 | 0.0% | 77.8% |
| S4 W23 | 18 | $1990k | $41k | 666 | 7.44 | 62.2 | 70.3 | 0.0% | 50.0% |
| S4 W24 | 18 | $1991k | $1.0k | 659 | 5.17 | 62.3 | 70.3 | 0.0% | 55.6% |
| S4 W25 final | 18 | $2023k | $33k | 562 | 6.44 | 62.3 | 70.4 | 0.0% | 64.3% |
| S4 W26 final | 18 | $2044k | $21k | 414 | 5.11 | 62.3 | 70.5 | 0.0% | 77.8% |
| S4 W27 final | 18 | $2126k | $82k | 261 | 2.50 | 70.5 | 70.5 | 0.0% | 71.4% |
| S5 trial 1 | 15 | $2085k | -$92k | 620 | 5.47 | 62.9 | 70.9 | 0.0% | 60.0% |
| S5 trial 2 | 15 | $2080k | -$5.3k | 655 | 5.60 | 63.0 | 71.1 | 0.0% | 66.7% |
| S5 W1 | 15 | $2118k | $39k | 660 | 6.60 | 63.0 | 71.1 | 0.0% | 66.7% |
| S5 W2 | 15 | $2120k | $1.5k | 665 | 5.67 | 63.0 | 71.2 | 0.0% | 66.7% |
| S5 W3 | 15 | $2164k | $44k | 668 | 7.67 | 63.1 | 71.3 | 0.0% | 86.7% |
| S5 W4 | 15 | $2166k | $2.4k | 659 | 5.33 | 63.1 | 71.3 | 0.0% | 66.7% |
| S5 W5 | 15 | $2209k | $43k | 674 | 8.13 | 63.2 | 71.4 | 0.0% | 93.3% |
| S5 W6 | 15 | $2210k | $889 | 658 | 5.67 | 63.2 | 71.5 | 0.0% | 60.0% |
| S5 W7 | 15 | $2254k | $45k | 658 | 6.73 | 63.3 | 71.6 | 0.0% | 73.3% |
| S5 W8 | 15 | $2254k | -$63 | 669 | 6.80 | 63.4 | 71.6 | 0.0% | 60.0% |
| S5 W9 | 15 | $2300k | $46k | 666 | 6.60 | 63.5 | 71.7 | 0.0% | 73.3% |
| S5 W10 | 15 | $2302k | $2.7k | 655 | 6.00 | 63.5 | 71.8 | 0.0% | 46.7% |
| S5 W11 | 15 | $2347k | $44k | 665 | 7.87 | 63.6 | 71.8 | 0.0% | 60.0% |
| S5 W12 | 15 | $2349k | $2.2k | 653 | 5.47 | 63.6 | 71.9 | 0.0% | 46.7% |
| S5 W13 | 15 | $2392k | $43k | 662 | 6.87 | 63.7 | 71.9 | 0.0% | 46.7% |
| S5 W14 | 15 | $2395k | $3.1k | 659 | 6.60 | 63.7 | 72.0 | 0.0% | 60.0% |
| S5 W15 | 15 | $2439k | $44k | 661 | 6.80 | 63.8 | 72.1 | 0.0% | 60.0% |
| S5 W16 | 15 | $2442k | $2.6k | 666 | 6.20 | 63.8 | 72.1 | 0.0% | 60.0% |
| S5 W17 | 15 | $2487k | $45k | 653 | 7.67 | 63.9 | 72.2 | 0.0% | 60.0% |
| S5 W18 | 15 | $2487k | $200 | 661 | 5.87 | 63.9 | 72.2 | 0.0% | 46.7% |
| S5 W19 | 15 | $2530k | $43k | 661 | 6.93 | 64.0 | 72.3 | 0.0% | 66.7% |
| S5 W20 | 15 | $2532k | $2.4k | 657 | 5.73 | 64.0 | 72.3 | 0.0% | 53.3% |
| S5 W21 | 15 | $2576k | $44k | 671 | 7.27 | 64.0 | 72.4 | 0.0% | 66.7% |
| S5 W22 | 15 | $2578k | $2.1k | 654 | 5.60 | 64.1 | 72.4 | 0.0% | 33.3% |
| S5 W23 | 15 | $2620k | $42k | 663 | 7.67 | 64.2 | 72.5 | 0.0% | 60.0% |
| S5 W24 | 15 | $2623k | $3.0k | 673 | 6.27 | 64.2 | 72.5 | 0.0% | 60.0% |
| S5 W25 final | 15 | $2662k | $39k | 664 | 6.67 | 64.2 | 72.6 | 0.0% | 60.0% |
| S5 W26 final | 15 | $2681k | $19k | 452 | 5.13 | 64.3 | 72.6 | 0.0% | 77.8% |
| S5 W27 final | 15 | $2776k | $94k | 275 | 2.60 | 72.6 | 72.6 | 0.0% | 71.4% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1578 | 58.2% | 794 | 58.2% | 0.1% |  |
| balanced × slide | 794 | 58.2% | 1578 | 58.2% | -0.1% |  |

### casual-weekly/hard/au

- 70 overall (best nine, including recruitment): 113.6 weeks; 5 reached, 15 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 195 of 400; median 25.0 weeks among those who did.
- Reaching potential stars: 193 of 400 (92 already there at week 0); median 68.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/313; S3 15/177; S5 25/71.
- Mean XP per completed season 17526; mean level-ups per completed season 171.7.
- Cash: opening 45000; mean weekly change 15540; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 81; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1221k after opening at $45k, and no career went into debt.
- WARNING: cash climbs by $16k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 46690 |
| gate | 429363 |
| prize | 30222 |
| boardGrant | 8741 |
| events | -9425 |
| transfers | -52960 |
| contracts | 0 |
| facilities | -1975 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $53k | $7.5k | 518 | 0 | 45.0 | L 6-8 Dubbo Diggers |
| S1 trial 2 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $54k | $1.2k | 539 | 3 | 45.0 | L 8-10 Wagga Swagmen |
| S1 W1 | balanced | 4 strength 1, stamina 1, kicking 1, footyIQ 1 | $72k | $18k | 585 | 4 | 45.0 | W 4-0 Launceston Larrikins |
| S1 W2 | balanced | 6 strength 2, handling 1, footyIQ 3 | $73k | $1.2k | 560 | 6 | 45.1 | L 1-4 Darwin Drovers |
| S1 W3 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $100k | $26k | 558 | 3 | 45.1 | L 0-13 Southport Stingrays |
| S1 W4 | balanced | 6 strength 1, handling 1, footyIQ 4 | $101k | $1.2k | 593 | 6 | 45.1 | D 4-4 Broken Hill Brollys |
| S1 W5 | balanced | 9 speed 1, strength 2, stamina 2, kicking 1, footyIQ 3 | $128k | $27k | 589 | 9 | 45.2 | W 15-0 Geelong Gulls |
| S1 W6 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $129k | $1.2k | 563 | 6 | 45.2 | L 10-15 Wagga Swagmen |
| S1 W7 | balanced | 4 strength 2, kicking 1, footyIQ 1 | $158k | $28k | 627 | 4 | 45.3 | W 11-6 Katherine Crocs |
| S1 W8 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, footyIQ 1 | $159k | $1.2k | 579 | 6 | 45.3 | W 6-4 Shellharbour Scorpions |
| S1 W9 | balanced | 4 stamina 1, handling 1, kicking 1, footyIQ 1 | $193k | $34k | 570 | 4 | 45.3 | W 6-0 Dubbo Diggers |
| S1 W10 | balanced | 6 speed 1, strength 1, footyIQ 4 | $195k | $1.2k | 550 | 6 | 45.4 | L 0-12 Mackay Marlins |
| S1 W11 | balanced | 7 speed 2, kicking 1, footyIQ 4 | $189k | -$5.1k | 591 | 7 | 46.6 | L 8-10 Ballarat Bushrangers |
| S1 W12 | balanced | 4 speed 1, strength 2, footyIQ 1 | $191k | $1.2k | 595 | 4 | 46.6 | D 0-0 Cairns Cyclones |
| S1 W13 | balanced | 7 speed 3, strength 1, stamina 1, footyIQ 2 | $222k | $31k | 633 | 7 | 46.6 | L 6-8 Toowoomba Thunder |
| S1 W14 | balanced | 10 speed 1, strength 3, stamina 3, kicking 1, footyIQ 2 | $223k | $1.2k | 604 | 10 | 46.7 | W 8-0 Woolloomooloo Wolves |
| S1 W15 | balanced | 4 speed 2, footyIQ 2 | $247k | $24k | 644 | 4 | 46.8 | W 6-0 Redcliffe Reapers |
| S1 W16 | balanced | 5 speed 2, handling 1, footyIQ 2 | $249k | $1.2k | 595 | 5 | 46.8 | W 5-4 Launceston Larrikins |
| S1 W17 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $278k | $30k | 613 | 8 | 46.9 | W 11-10 Darwin Drovers |
| S1 W18 | balanced | 5 strength 2, footyIQ 3 | $279k | $1.2k | 632 | 5 | 46.9 | W 16-0 Southport Stingrays |
| S1 W19 | balanced | 4 speed 2, stamina 1, handling 1 | $313k | $34k | 604 | 4 | 46.9 | L 8-12 Broken Hill Brollys |
| S1 W20 | balanced | 10 speed 3, strength 2, stamina 1, handling 1, footyIQ 3 | $314k | $1.2k | 611 | 10 | 47.0 | W 15-0 Geelong Gulls |
| S1 W21 | balanced | 3 speed 1, strength 1, kicking 1 | $351k | $37k | 590 | 3 | 47.0 | L 4-8 Wagga Swagmen |
| S1 W22 | balanced | 6 speed 2, stamina 2, handling 1, footyIQ 1 | $352k | $1.2k | 672 | 6 | 47.0 | W 24-0 Katherine Crocs |
| S1 W23 | balanced | 8 speed 3, strength 1, stamina 1, footyIQ 3 | $386k | $34k | 612 | 8 | 47.1 | W 16-7 Shellharbour Scorpions |
| S1 W24 | balanced | 6 speed 2, strength 2, handling 1, footyIQ 1 | $387k | $1.2k | 621 | 6 | 47.2 | W 16-10 Dubbo Diggers |
| S1 W25 final | balanced | 2 strength 1, kicking 1 | $431k | $43k | 581 | 2 | 47.1 | L 4-8 Ballarat Bushrangers |
| S1 W26 final | balanced | 0 | $432k | $1.2k | 193 | 0 | 47.1 | no match |
| S1 W27 final | balanced | 5 strength 1, handling 1, footyIQ 3 | $482k | $50k | 173 | 5 | 47.6 | no match |
| S2 trial 1 | balanced | 7 speed 2, strength 1, stamina 3, footyIQ 1 | $484k | $1.5k | 657 | 7 | 47.7 | W 11-4 Darwin Drovers |
| S2 trial 2 | balanced | 8 speed 1, strength 1, handling 2, footyIQ 4 | $492k | $8.9k | 677 | 8 | 47.8 | W 20-0 Shellharbour Scorpions |
| S2 W1 | balanced | 6 speed 1, strength 1, stamina 2, kicking 1, footyIQ 1 | $524k | $31k | 685 | 6 | 47.9 | W 16-13 Launceston Larrikins |
| S2 W2 | balanced | 7 speed 2, strength 1, stamina 1, footyIQ 3 | $525k | $1.5k | 632 | 7 | 47.9 | D 6-6 Darwin Drovers |
| S2 W3 | balanced | 7 speed 4, footyIQ 3 | $564k | $39k | 708 | 7 | 48.0 | W 23-6 Southport Stingrays |
| S2 W4 | balanced | 5 strength 1, stamina 1, handling 2, footyIQ 1 | $565k | $1.5k | 617 | 5 | 48.0 | L 10-12 Broken Hill Brollys |
| S2 W5 | balanced | 7 strength 4, stamina 1, handling 1, kicking 1 | $598k | $33k | 672 | 7 | 48.1 | W 8-6 Geelong Gulls |
| S2 W6 | balanced | 8 speed 3, strength 1, stamina 2, footyIQ 2 | $599k | $1.5k | 601 | 8 | 48.2 | L 0-10 Wagga Swagmen |
| S2 W7 | balanced | 6 speed 3, stamina 2, handling 1 | $634k | $35k | 604 | 6 | 48.3 | L 0-12 Katherine Crocs |
| S2 W8 | balanced | 7 strength 1, stamina 2, handling 2, footyIQ 2 | $636k | $1.5k | 601 | 7 | 48.3 | L 1-8 Shellharbour Scorpions |
| S2 W9 | balanced | 5 speed 1, strength 2, kicking 1, footyIQ 1 | $663k | $27k | 603 | 5 | 48.4 | L 4-12 Dubbo Diggers |
| S2 W10 | balanced | 7 speed 2, stamina 2, footyIQ 3 | $664k | $1.5k | 637 | 7 | 48.4 | W 5-0 Mackay Marlins |
| S2 W11 | balanced | 6 speed 2, strength 2, footyIQ 2 | $697k | $32k | 629 | 6 | 48.5 | L 4-10 Ballarat Bushrangers |
| S2 W12 | balanced | 5 speed 2, handling 2, footyIQ 1 | $690k | -$6.5k | 639 | 5 | 48.5 | L 6-18 Cairns Cyclones |
| S2 W13 | balanced | 7 strength 1, stamina 3, kicking 1, footyIQ 2 | $723k | $32k | 623 | 7 | 48.6 | L 6-8 Toowoomba Thunder |
| S2 W14 | balanced | 6 speed 2, strength 2, stamina 1, footyIQ 1 | $724k | $1.5k | 622 | 6 | 48.7 | L 0-17 Woolloomooloo Wolves |
| S2 W15 | balanced | 7 speed 4, strength 1, stamina 1, footyIQ 1 | $758k | $34k | 643 | 7 | 48.7 | W 4-0 Redcliffe Reapers |
| S2 W16 | balanced | 6 speed 1, strength 1, handling 2, footyIQ 2 | $760k | $1.6k | 629 | 6 | 48.8 | L 6-11 Launceston Larrikins |
| S2 W17 | balanced | 6 speed 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $788k | $28k | 648 | 6 | 48.9 | L 8-16 Darwin Drovers |
| S2 W18 | balanced | 6 strength 3, stamina 1, footyIQ 2 | $790k | $1.6k | 619 | 6 | 48.9 | L 0-6 Southport Stingrays |
| S2 W19 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $818k | $28k | 658 | 5 | 49.0 | W 10-0 Broken Hill Brollys |
| S2 W20 | balanced | 8 speed 2, strength 1, stamina 3, handling 1, footyIQ 1 | $820k | $1.8k | 630 | 8 | 49.0 | L 4-8 Geelong Gulls |
| S2 W21 | balanced | 8 speed 4, strength 1, kicking 1, footyIQ 2 | $857k | $38k | 676 | 8 | 49.1 | W 20-6 Wagga Swagmen |
| S2 W22 | balanced | 4 strength 1, stamina 1, footyIQ 2 | $859k | $1.8k | 694 | 4 | 49.2 | W 24-10 Katherine Crocs |
| S2 W23 | balanced | 8 speed 1, strength 2, stamina 1, footyIQ 4 | $897k | $38k | 624 | 8 | 49.3 | L 6-12 Shellharbour Scorpions |
| S2 W24 | balanced | 5 speed 3, strength 1, handling 1 | $899k | $1.8k | 643 | 5 | 49.3 | L 10-17 Dubbo Diggers |
| S2 W25 final | balanced | 3 speed 1, strength 1, stamina 1 | $895k | -$4.2k | 154 | 3 | 49.3 | no match |
| S2 W26 final | balanced | 1 footyIQ 1 | $897k | $1.8k | 154 | 1 | 49.3 | no match |
| S2 W27 final | balanced | 1 strength 1 | $899k | $1.8k | 148 | 1 | 51.1 | no match |
| S3 trial 1 | balanced | 7 speed 2, strength 1, stamina 2, handling 1, kicking 1 | $887k | -$12k | 643 | 7 | 51.7 | W 16-4 Mackay Marlins |
| S3 trial 2 | balanced | 4 strength 1, stamina 1, handling 1, footyIQ 1 | $888k | $1.6k | 614 | 4 | 51.8 | D 6-6 Wagga Swagmen |
| S3 W1 | balanced | 7 speed 3, strength 1, stamina 2, footyIQ 1 | $922k | $34k | 625 | 7 | 51.8 | L 10-12 Launceston Larrikins |
| S3 W2 | balanced | 6 speed 2, handling 2, footyIQ 2 | $924k | $1.6k | 633 | 6 | 51.9 | W 12-6 Darwin Drovers |
| S3 W3 | balanced | 8 strength 2, kicking 1, footyIQ 5 | $962k | $38k | 691 | 8 | 52.0 | W 14-11 Southport Stingrays |
| S3 W4 | balanced | 5 speed 3, strength 1, footyIQ 1 | $963k | $1.5k | 614 | 5 | 52.1 | W 11-0 Broken Hill Brollys |
| S3 W5 | balanced | 7 speed 1, strength 2, stamina 2, handling 1, footyIQ 1 | $1003k | $40k | 643 | 7 | 52.2 | W 8-0 Geelong Gulls |
| S3 W6 | balanced | 6 strength 3, stamina 1, handling 1, kicking 1 | $1004k | $1.5k | 594 | 6 | 52.2 | L 0-6 Wagga Swagmen |
| S3 W7 | balanced | 4 speed 1, strength 1, footyIQ 2 | $1048k | $43k | 662 | 4 | 52.3 | W 14-0 Katherine Crocs |
| S3 W8 | balanced | 9 speed 2, strength 1, stamina 2, footyIQ 4 | $1049k | $1.6k | 633 | 9 | 52.4 | W 9-4 Shellharbour Scorpions |
| S3 W9 | balanced | 7 speed 3, strength 1, stamina 1, handling 1, footyIQ 1 | $1093k | $44k | 622 | 7 | 52.5 | W 4-0 Dubbo Diggers |
| S3 W10 | balanced | 5 speed 2, strength 1, kicking 1, footyIQ 1 | $1094k | $1.6k | 639 | 5 | 52.5 | W 14-10 Mackay Marlins |
| S3 W11 | balanced | 8 speed 2, strength 2, handling 2, footyIQ 2 | $1131k | $37k | 632 | 8 | 52.6 | W 8-0 Ballarat Bushrangers |
| S3 W12 | balanced | 5 strength 1, stamina 1, handling 1, footyIQ 2 | $1133k | $1.6k | 677 | 5 | 52.7 | W 16-13 Cairns Cyclones |
| S3 W13 | balanced | 6 speed 1, strength 1, stamina 3, kicking 1 | $1176k | $44k | 613 | 6 | 52.7 | L 0-4 Toowoomba Thunder |
| S3 W14 | balanced | 10 speed 3, strength 1, stamina 1, handling 3, footyIQ 2 | $1178k | $1.6k | 586 | 10 | 52.9 | L 0-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 5 speed 1, strength 1, footyIQ 3 | $1225k | $47k | 633 | 5 | 52.9 | L 11-16 Redcliffe Reapers |
| S3 W16 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $1224k | -$1.4k | 643 | 5 | 53.0 | W 10-0 Launceston Larrikins |
| S3 W17 | balanced | 7 speed 1, strength 4, stamina 1, kicking 1 | $1255k | $31k | 600 | 7 | 53.1 | L 4-6 Darwin Drovers |
| S3 W18 | balanced | 5 strength 1, stamina 1, handling 1, footyIQ 2 | $1256k | $1.6k | 584 | 5 | 53.1 | L 0-1 Southport Stingrays |
| S3 W19 | balanced | 5 speed 3, stamina 2 | $1284k | $28k | 629 | 5 | 53.2 | W 7-0 Broken Hill Brollys |
| S3 W20 | balanced | 7 speed 1, strength 1, stamina 1, handling 1, footyIQ 3 | $1286k | $2.2k | 594 | 7 | 53.3 | L 4-11 Geelong Gulls |
| S3 W21 | balanced | 8 speed 4, strength 1, handling 1, kicking 1, footyIQ 1 | $1324k | $38k | 617 | 8 | 53.4 | L 7-8 Wagga Swagmen |
| S3 W22 | balanced | 3 footyIQ 3 | $1326k | $1.7k | 652 | 3 | 53.4 | W 20-12 Katherine Crocs |
| S3 W23 | balanced | 7 speed 1, strength 3, handling 2, footyIQ 1 | $1358k | $33k | 594 | 9 | 53.5 | D 1-1 Shellharbour Scorpions |
| S3 W24 | balanced | 6 speed 1, strength 1, handling 1, footyIQ 3 | $1360k | $1.7k | 630 | 6 | 53.5 | W 8-0 Dubbo Diggers |
| S3 W25 final | balanced | 3 strength 1, stamina 1, kicking 1 | $1362k | $1.7k | 628 | 4 | 53.6 | W 6-0 Katherine Crocs |
| S3 W26 final | balanced | 8 speed 2, stamina 4, footyIQ 2 | $1363k | $1.7k | 671 | 9 | 53.7 | W 19-11 Redcliffe Reapers |
| S3 W27 final | balanced | 5 speed 2, strength 1, handling 1, kicking 1 | $1563k | $200k | 554 | 5 | 64.8 | W 12-4 Toowoomba Thunder |
| S4 trial 1 | balanced | 7 handling 2, footyIQ 2 | $1437k | -$127k | 604 | 5 | 61.3 | W 6-0 Wagga Swagmen |
| S4 trial 2 | balanced | 9 speed 2, strength 2, stamina 1, footyIQ 2 | $1439k | $2.4k | 627 | 7 | 61.4 | W 14-10 Mackay Marlins |
| S4 W1 | balanced | 3 stamina 1, handling 1 | $1483k | $44k | 592 | 3 | 61.4 | L 6-10 Launceston Larrikins |
| S4 W2 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $1486k | $2.4k | 672 | 7 | 61.5 | W 20-4 Darwin Drovers |
| S4 W3 | balanced | 6 speed 2, strength 1, handling 1, footyIQ 2 | $1530k | $44k | 623 | 6 | 61.6 | D 0-0 Southport Stingrays |
| S4 W4 | balanced | 6 speed 2, stamina 1, handling 1, footyIQ 2 | $1533k | $2.4k | 613 | 6 | 61.7 | W 16-8 Broken Hill Brollys |
| S4 W5 | balanced | 6 speed 1, strength 1, stamina 1, handling 3 | $1577k | $44k | 641 | 6 | 61.7 | W 13-6 Geelong Gulls |
| S4 W6 | balanced | 6 speed 1, strength 2, stamina 1, handling 1, kicking 1 | $1581k | $4.4k | 597 | 6 | 61.8 | W 12-4 Wagga Swagmen |
| S4 W7 | balanced | 4 speed 1, strength 1, handling 1, footyIQ 1 | $1628k | $46k | 664 | 4 | 61.8 | W 23-0 Katherine Crocs |
| S4 W8 | balanced | 9 speed 3, strength 1, stamina 1, handling 1, footyIQ 3 | $1632k | $4.4k | 615 | 9 | 61.9 | W 12-10 Shellharbour Scorpions |
| S4 W9 | balanced | 8 strength 2, stamina 2, handling 2, footyIQ 2 | $1677k | $44k | 589 | 8 | 62.0 | L 6-8 Dubbo Diggers |
| S4 W10 | balanced | 3 strength 1, handling 1, kicking 1 | $1679k | $2.4k | 594 | 3 | 62.1 | L 6-10 Mackay Marlins |
| S4 W11 | balanced | 7 speed 2, stamina 2, handling 1, footyIQ 2 | $1723k | $44k | 607 | 7 | 62.1 | L 0-11 Ballarat Bushrangers |
| S4 W12 | balanced | 8 speed 3, stamina 3, handling 2 | $1721k | -$2.6k | 691 | 8 | 62.2 | W 25-0 Cairns Cyclones |
| S4 W13 | balanced | 5 speed 2, strength 1, kicking 1, footyIQ 1 | $1765k | $44k | 640 | 5 | 62.3 | W 13-0 Toowoomba Thunder |
| S4 W14 | balanced | 5 strength 2, handling 2, footyIQ 1 | $1768k | $2.4k | 636 | 5 | 62.3 | W 16-4 Woolloomooloo Wolves |
| S4 W15 | balanced | 9 speed 2, strength 2, kicking 1, footyIQ 4 | $1812k | $44k | 577 | 9 | 62.4 | L 0-16 Redcliffe Reapers |
| S4 W16 | balanced | 2 speed 1, stamina 1 | $1815k | $2.4k | 608 | 3 | 62.4 | W 8-6 Launceston Larrikins |
| S4 W17 | balanced | 7 speed 1, strength 3, stamina 1, handling 2 | $1859k | $44k | 650 | 8 | 62.5 | W 18-12 Darwin Drovers |
| S4 W18 | balanced | 7 speed 2, strength 1, stamina 1, handling 2, footyIQ 1 | $1862k | $2.5k | 597 | 8 | 62.6 | L 4-6 Southport Stingrays |
| S4 W19 | balanced | 3 stamina 1, handling 1, footyIQ 1 | $1906k | $44k | 612 | 4 | 62.6 | W 10-0 Broken Hill Brollys |
| S4 W20 | balanced | 4 speed 1, strength 2, handling 1 | $1908k | $2.4k | 609 | 5 | 62.7 | L 6-8 Geelong Gulls |
| S4 W21 | balanced | 6 strength 1, stamina 1, handling 2, footyIQ 2 | $1953k | $44k | 652 | 7 | 62.7 | W 23-11 Wagga Swagmen |
| S4 W22 | balanced | 5 speed 1, stamina 2, footyIQ 2 | $1955k | $2.4k | 629 | 6 | 62.8 | L 16-21 Katherine Crocs |
| S4 W23 | balanced | 4 speed 1, stamina 2, handling 1 | $2000k | $44k | 583 | 5 | 62.8 | L 0-8 Shellharbour Scorpions |
| S4 W24 | balanced | 8 speed 2, strength 3, stamina 1, handling 1, kicking 1 | $2002k | $2.4k | 623 | 9 | 62.9 | W 12-6 Dubbo Diggers |
| S4 W25 final | balanced | 3 speed 1, stamina 1, handling 1 | $2007k | $5.5k | 625 | 4 | 62.9 | W 14-10 Ballarat Bushrangers |
| S4 W26 final | balanced | 5 strength 2, handling 1, footyIQ 2 | $2010k | $2.5k | 586 | 6 | 63.0 | L 6-10 Redcliffe Reapers |
| S4 W27 final | balanced | 1 stamina 1 | $2060k | $50k | 98 | 1 | 71.2 | no match |
| S5 trial 1 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $1933k | -$127k | 675 | 4 | 64.0 | W 11-6 Wagga Swagmen |
| S5 trial 2 | balanced | 7 speed 1, strength 2, stamina 1, handling 2, kicking 1 | $1946k | $13k | 650 | 8 | 64.1 | L 4-8 Ballarat Bushrangers |
| S5 W1 | balanced | 5 handling 1, footyIQ 4 | $1991k | $44k | 658 | 6 | 64.2 | D 10-10 Launceston Larrikins |
| S5 W2 | balanced | 4 speed 1, strength 1, handling 1, footyIQ 1 | $1993k | $2.5k | 702 | 6 | 64.3 | W 18-12 Darwin Drovers |
| S5 W3 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $2038k | $44k | 625 | 5 | 64.3 | W 4-0 Southport Stingrays |
| S5 W4 | balanced | 7 speed 1, strength 1, stamina 2, handling 1, footyIQ 2 | $2041k | $3.1k | 724 | 8 | 64.4 | W 26-6 Broken Hill Brollys |
| S5 W5 | balanced | 8 strength 3, stamina 1, handling 2, footyIQ 2 | $2085k | $45k | 676 | 9 | 64.5 | W 4-0 Geelong Gulls |
| S5 W6 | balanced | 4 speed 1, strength 1, stamina 1, handling 1 | $2088k | $2.5k | 657 | 6 | 64.6 | W 10-0 Wagga Swagmen |
| S5 W7 | balanced | 3 handling 1, kicking 1, footyIQ 1 | $2132k | $45k | 666 | 4 | 64.6 | W 10-0 Katherine Crocs |
| S5 W8 | balanced | 6 speed 1, strength 1, kicking 1, footyIQ 3 | $2135k | $2.6k | 657 | 8 | 64.7 | L 8-13 Shellharbour Scorpions |
| S5 W9 | balanced | 5 speed 1, stamina 1, handling 1, footyIQ 2 | $2179k | $45k | 661 | 7 | 64.7 | W 12-10 Dubbo Diggers |
| S5 W10 | balanced | 5 speed 2, strength 1, stamina 1, handling 1 | $2187k | $7.6k | 681 | 6 | 64.8 | W 16-6 Mackay Marlins |
| S5 W11 | balanced | 5 strength 2, handling 1, footyIQ 2 | $2232k | $45k | 739 | 9 | 64.9 | W 24-4 Ballarat Bushrangers |
| S5 W12 | balanced | 4 strength 1, stamina 1, handling 2 | $2234k | $2.6k | 661 | 5 | 64.9 | L 6-10 Cairns Cyclones |
| S5 W13 | balanced | 3 strength 1, handling 1, footyIQ 1 | $2279k | $45k | 733 | 6 | 64.9 | W 24-0 Toowoomba Thunder |
| S5 W14 | balanced | 8 speed 2, strength 2, kicking 2, footyIQ 2 | $2281k | $2.6k | 694 | 10 | 65.1 | W 5-0 Woolloomooloo Wolves |
| S5 W15 | balanced | 6 speed 1, strength 1, stamina 1, footyIQ 3 | $2326k | $45k | 658 | 7 | 65.1 | W 18-11 Redcliffe Reapers |
| S5 W16 | balanced | 2 strength 1, stamina 1 | $2329k | $2.6k | 671 | 4 | 65.2 | W 16-0 Launceston Larrikins |
| S5 W17 | balanced | 8 speed 1, strength 2, stamina 2, handling 3 | $2373k | $45k | 703 | 10 | 65.3 | W 12-0 Darwin Drovers |
| S5 W18 | balanced | 2 strength 2 | $2370k | -$3.4k | 648 | 3 | 65.3 | L 13-15 Southport Stingrays |
| S5 W19 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 2 | $2414k | $45k | 691 | 8 | 65.4 | W 13-12 Broken Hill Brollys |
| S5 W20 | balanced | 6 speed 1, stamina 1, handling 1, kicking 2, footyIQ 1 | $2417k | $2.6k | 651 | 8 | 65.4 | L 10-11 Geelong Gulls |
| S5 W21 | balanced | 3 speed 3 | $2462k | $45k | 640 | 5 | 65.5 | L 6-8 Wagga Swagmen |
| S5 W22 | balanced | 5 strength 1, handling 2, footyIQ 2 | $2461k | -$440 | 687 | 6 | 65.5 | W 12-0 Katherine Crocs |
| S5 W23 | balanced | 5 speed 1, handling 1, footyIQ 3 | $2506k | $45k | 651 | 7 | 65.6 | W 15-4 Shellharbour Scorpions |
| S5 W24 | balanced | 8 speed 2, strength 2, stamina 2, handling 1, footyIQ 1 | $2511k | $5.6k | 719 | 9 | 65.7 | W 14-0 Dubbo Diggers |
| S5 W25 final | balanced | 2 handling 1, footyIQ 1 | $2556k | $45k | 690 | 4 | 65.7 | W 11-4 Woolloomooloo Wolves |
| S5 W26 final | balanced | 8 speed 1, strength 3, stamina 3, handling 1 | $2601k | $45k | 696 | 11 | 65.8 | W 20-10 Redcliffe Reapers |
| S5 W27 final | balanced | 4 strength 1, handling 2, kicking 1 | $2831k | $231k | 529 | 6 | 73.7 | W 6-4 Toowoomba Thunder |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $49k | $4.0k | 573 | 0.00 | 45.7 | 52.1 | 0.0% | 15.0% |
| S1 trial 2 | 20 | $51k | $1.5k | 605 | 5.35 | 45.7 | 52.2 | 0.0% | 30.0% |
| S1 W1 | 20 | $73k | $22k | 641 | 4.10 | 45.8 | 52.2 | 0.0% | 55.0% |
| S1 W2 | 20 | $73k | $190 | 638 | 7.50 | 45.8 | 52.4 | 0.0% | 40.0% |
| S1 W3 | 20 | $104k | $31k | 638 | 3.35 | 45.8 | 52.4 | 0.0% | 25.0% |
| S1 W4 | 20 | $104k | -$75 | 655 | 6.05 | 45.9 | 52.6 | 0.0% | 60.0% |
| S1 W5 | 20 | $130k | $27k | 654 | 7.75 | 46.0 | 52.8 | 0.0% | 50.0% |
| S1 W6 | 20 | $132k | $1.3k | 639 | 6.65 | 46.1 | 52.9 | 0.0% | 20.0% |
| S1 W7 | 20 | $161k | $29k | 654 | 5.05 | 46.1 | 53.0 | 0.0% | 65.0% |
| S1 W8 | 20 | $162k | $1.2k | 650 | 8.65 | 46.2 | 53.1 | 0.0% | 50.0% |
| S1 W9 | 20 | $191k | $29k | 662 | 6.30 | 46.2 | 53.3 | 0.0% | 55.0% |
| S1 W10 | 20 | $192k | $1.3k | 638 | 3.85 | 46.3 | 53.3 | 0.0% | 35.0% |
| S1 W11 | 20 | $217k | $25k | 643 | 9.90 | 46.5 | 53.7 | 0.0% | 40.0% |
| S1 W12 | 20 | $219k | $1.3k | 641 | 4.40 | 46.5 | 53.8 | 0.0% | 30.0% |
| S1 W13 | 20 | $249k | $31k | 668 | 7.60 | 46.6 | 54.0 | 0.0% | 55.0% |
| S1 W14 | 20 | $251k | $1.8k | 649 | 6.10 | 46.6 | 54.1 | 0.0% | 25.0% |
| S1 W15 | 20 | $282k | $31k | 654 | 5.80 | 46.6 | 54.2 | 0.0% | 35.0% |
| S1 W16 | 20 | $282k | -$154 | 668 | 5.15 | 46.7 | 54.4 | 0.0% | 65.0% |
| S1 W17 | 20 | $312k | $31k | 652 | 9.85 | 46.8 | 54.5 | 0.0% | 35.0% |
| S1 W18 | 20 | $314k | $1.4k | 658 | 5.30 | 46.8 | 54.6 | 0.0% | 30.0% |
| S1 W19 | 20 | $340k | $27k | 655 | 6.10 | 46.9 | 54.7 | 0.0% | 35.0% |
| S1 W20 | 20 | $339k | -$823 | 658 | 7.55 | 47.0 | 55.0 | 0.0% | 50.0% |
| S1 W21 | 20 | $367k | $27k | 644 | 4.30 | 47.1 | 55.2 | 0.0% | 25.0% |
| S1 W22 | 20 | $368k | $1.3k | 661 | 6.30 | 47.1 | 55.3 | 0.0% | 40.0% |
| S1 W23 | 20 | $393k | $25k | 669 | 8.35 | 47.2 | 55.6 | 0.0% | 60.0% |
| S1 W24 | 20 | $394k | $1.1k | 651 | 6.05 | 47.3 | 55.7 | 0.0% | 35.0% |
| S1 W25 final | 20 | $400k | $5.8k | 413 | 3.15 | 47.3 | 55.7 | 0.0% | 44.4% |
| S1 W26 final | 20 | $402k | $2.3k | 291 | 4.15 | 47.3 | 55.8 | 0.0% | 25.0% |
| S1 W27 final | 20 | $430k | $28k | 182 | 1.75 | 49.3 | 55.5 | 0.0% | 0.0% |
| S2 trial 1 | 20 | $413k | -$17k | 631 | 6.05 | 49.6 | 56.4 | 0.0% | 40.0% |
| S2 trial 2 | 20 | $418k | $5.3k | 626 | 6.35 | 49.6 | 56.5 | 0.0% | 25.0% |
| S2 W1 | 20 | $447k | $29k | 627 | 5.85 | 49.7 | 56.6 | 0.0% | 40.0% |
| S2 W2 | 20 | $448k | $1.1k | 619 | 5.80 | 49.8 | 56.8 | 0.0% | 20.0% |
| S2 W3 | 20 | $481k | $33k | 638 | 5.90 | 49.8 | 56.9 | 0.0% | 60.0% |
| S2 W4 | 20 | $482k | $764 | 646 | 6.20 | 49.9 | 57.0 | 0.0% | 55.0% |
| S2 W5 | 20 | $512k | $30k | 635 | 6.65 | 50.0 | 57.2 | 0.0% | 45.0% |
| S2 W6 | 20 | $513k | $1.3k | 631 | 7.80 | 50.1 | 57.3 | 0.0% | 40.0% |
| S2 W7 | 20 | $545k | $32k | 640 | 6.80 | 50.2 | 57.5 | 0.0% | 65.0% |
| S2 W8 | 20 | $545k | -$452 | 634 | 6.60 | 50.3 | 57.7 | 0.0% | 40.0% |
| S2 W9 | 20 | $576k | $31k | 640 | 5.90 | 50.4 | 57.8 | 0.0% | 50.0% |
| S2 W10 | 20 | $574k | -$1.8k | 632 | 5.55 | 50.5 | 58.1 | 0.0% | 55.0% |
| S2 W11 | 20 | $608k | $34k | 639 | 6.85 | 50.6 | 58.2 | 0.0% | 45.0% |
| S2 W12 | 20 | $609k | $801 | 639 | 6.05 | 50.6 | 58.4 | 0.0% | 40.0% |
| S2 W13 | 20 | $643k | $34k | 633 | 5.95 | 50.7 | 58.5 | 0.0% | 35.0% |
| S2 W14 | 20 | $643k | $478 | 648 | 7.00 | 50.8 | 58.7 | 0.0% | 50.0% |
| S2 W15 | 20 | $678k | $35k | 634 | 6.65 | 50.9 | 58.8 | 0.0% | 30.0% |
| S2 W16 | 20 | $681k | $2.1k | 639 | 6.10 | 51.0 | 58.9 | 0.0% | 45.0% |
| S2 W17 | 20 | $714k | $33k | 642 | 6.60 | 51.0 | 59.0 | 0.0% | 40.0% |
| S2 W18 | 20 | $716k | $1.6k | 637 | 5.80 | 51.1 | 59.2 | 0.0% | 55.0% |
| S2 W19 | 20 | $745k | $30k | 646 | 6.75 | 51.2 | 59.4 | 0.0% | 50.0% |
| S2 W20 | 20 | $746k | $521 | 631 | 6.10 | 51.3 | 59.5 | 0.0% | 25.0% |
| S2 W21 | 20 | $780k | $34k | 645 | 6.15 | 51.3 | 59.6 | 0.0% | 45.0% |
| S2 W22 | 20 | $782k | $2.1k | 644 | 6.15 | 51.4 | 59.8 | 0.0% | 60.0% |
| S2 W23 | 20 | $815k | $33k | 632 | 6.50 | 51.5 | 59.9 | 0.0% | 40.0% |
| S2 W24 | 20 | $817k | $1.5k | 647 | 7.05 | 51.6 | 60.0 | 0.0% | 55.0% |
| S2 W25 final | 20 | $833k | $16k | 421 | 4.25 | 51.6 | 60.1 | 0.0% | 36.4% |
| S2 W26 final | 20 | $839k | $6.6k | 267 | 2.55 | 51.6 | 60.2 | 0.0% | 75.0% |
| S2 W27 final | 20 | $872k | $33k | 195 | 1.55 | 55.2 | 60.1 | 0.0% | 0.0% |
| S3 trial 1 | 20 | $817k | -$55k | 631 | 6.15 | 54.4 | 61.1 | 0.0% | 65.0% |
| S3 trial 2 | 20 | $821k | $3.6k | 628 | 5.30 | 54.5 | 61.3 | 0.0% | 40.0% |
| S3 W1 | 20 | $852k | $32k | 612 | 6.10 | 54.6 | 61.4 | 0.0% | 30.0% |
| S3 W2 | 20 | $853k | $1.0k | 623 | 6.20 | 54.6 | 61.5 | 0.0% | 45.0% |
| S3 W3 | 20 | $887k | $34k | 625 | 6.10 | 54.7 | 61.6 | 0.0% | 50.0% |
| S3 W4 | 20 | $888k | $1.0k | 628 | 6.15 | 54.8 | 61.7 | 0.0% | 45.0% |
| S3 W5 | 20 | $922k | $34k | 618 | 6.20 | 54.8 | 61.8 | 0.0% | 40.0% |
| S3 W6 | 20 | $923k | $1.6k | 621 | 6.85 | 54.9 | 61.9 | 0.0% | 40.0% |
| S3 W7 | 20 | $959k | $36k | 621 | 5.00 | 55.0 | 62.0 | 0.0% | 40.0% |
| S3 W8 | 20 | $961k | $1.4k | 624 | 7.20 | 55.0 | 62.1 | 0.0% | 55.0% |
| S3 W9 | 20 | $996k | $35k | 616 | 5.85 | 55.1 | 62.3 | 0.0% | 45.0% |
| S3 W10 | 20 | $996k | $200 | 628 | 5.70 | 55.2 | 62.4 | 0.0% | 50.0% |
| S3 W11 | 20 | $1031k | $35k | 618 | 7.05 | 55.2 | 62.5 | 0.0% | 40.0% |
| S3 W12 | 20 | $1033k | $1.6k | 633 | 5.90 | 55.3 | 62.6 | 0.0% | 45.0% |
| S3 W13 | 20 | $1069k | $36k | 630 | 6.95 | 55.4 | 62.7 | 0.0% | 45.0% |
| S3 W14 | 20 | $1071k | $1.6k | 618 | 6.35 | 55.5 | 62.9 | 0.0% | 35.0% |
| S3 W15 | 20 | $1108k | $38k | 621 | 5.95 | 55.5 | 63.0 | 0.0% | 20.0% |
| S3 W16 | 20 | $1110k | $1.3k | 627 | 5.80 | 55.6 | 63.1 | 0.0% | 75.0% |
| S3 W17 | 20 | $1142k | $33k | 632 | 7.00 | 55.7 | 63.3 | 0.0% | 45.0% |
| S3 W18 | 20 | $1144k | $1.5k | 623 | 5.65 | 55.8 | 63.4 | 0.0% | 45.0% |
| S3 W19 | 20 | $1178k | $34k | 625 | 6.75 | 55.8 | 63.5 | 0.0% | 40.0% |
| S3 W20 | 20 | $1179k | $1.4k | 617 | 5.80 | 55.9 | 63.6 | 0.0% | 30.0% |
| S3 W21 | 20 | $1217k | $38k | 629 | 6.10 | 55.9 | 63.7 | 0.0% | 45.0% |
| S3 W22 | 20 | $1218k | $931 | 625 | 5.85 | 56.0 | 63.8 | 0.0% | 50.0% |
| S3 W23 | 20 | $1254k | $36k | 626 | 7.10 | 56.1 | 64.0 | 0.0% | 45.0% |
| S3 W24 | 20 | $1253k | -$1.3k | 646 | 6.35 | 56.2 | 64.3 | 0.0% | 80.0% |
| S3 W25 final | 20 | $1265k | $12k | 351 | 3.10 | 56.3 | 64.3 | 0.0% | 75.0% |
| S3 W26 final | 20 | $1273k | $7.7k | 308 | 3.75 | 56.3 | 64.4 | 0.0% | 83.3% |
| S3 W27 final | 20 | $1323k | $50k | 204 | 1.95 | 64.5 | 64.5 | 0.0% | 40.0% |
| S4 trial 1 | 13 | $1328k | -$113k | 624 | 5.31 | 58.7 | 64.8 | 0.0% | 61.5% |
| S4 trial 2 | 13 | $1331k | $3.0k | 635 | 6.15 | 58.7 | 64.9 | 0.0% | 61.5% |
| S4 W1 | 13 | $1370k | $39k | 633 | 5.38 | 58.7 | 65.0 | 0.0% | 46.2% |
| S4 W2 | 13 | $1371k | $978 | 624 | 6.31 | 58.8 | 65.1 | 0.0% | 61.5% |
| S4 W3 | 13 | $1413k | $42k | 619 | 6.08 | 58.9 | 65.2 | 0.0% | 23.1% |
| S4 W4 | 13 | $1414k | $837 | 625 | 5.69 | 58.9 | 65.3 | 0.0% | 53.8% |
| S4 W5 | 13 | $1455k | $41k | 629 | 7.23 | 59.0 | 65.4 | 0.0% | 46.2% |
| S4 W6 | 13 | $1456k | $1.6k | 623 | 5.62 | 59.1 | 65.5 | 0.0% | 46.2% |
| S4 W7 | 13 | $1495k | $39k | 626 | 6.23 | 59.2 | 65.7 | 0.0% | 46.2% |
| S4 W8 | 13 | $1497k | $1.9k | 624 | 6.08 | 59.2 | 65.8 | 0.0% | 30.8% |
| S4 W9 | 13 | $1536k | $39k | 624 | 7.15 | 59.3 | 65.9 | 0.0% | 46.2% |
| S4 W10 | 13 | $1537k | $1.4k | 625 | 5.92 | 59.4 | 66.0 | 0.0% | 53.8% |
| S4 W11 | 13 | $1578k | $41k | 626 | 6.54 | 59.5 | 66.1 | 0.0% | 53.8% |
| S4 W12 | 13 | $1579k | $480 | 646 | 5.92 | 59.5 | 66.2 | 0.0% | 53.8% |
| S4 W13 | 13 | $1621k | $42k | 640 | 5.69 | 59.6 | 66.3 | 0.0% | 53.8% |
| S4 W14 | 13 | $1623k | $2.1k | 646 | 7.38 | 59.7 | 66.5 | 0.0% | 76.9% |
| S4 W15 | 13 | $1665k | $43k | 627 | 5.85 | 59.7 | 66.5 | 0.0% | 38.5% |
| S4 W16 | 13 | $1667k | $1.6k | 638 | 6.31 | 59.8 | 66.7 | 0.0% | 69.2% |
| S4 W17 | 13 | $1709k | $42k | 637 | 7.00 | 59.9 | 66.8 | 0.0% | 61.5% |
| S4 W18 | 13 | $1709k | $9 | 625 | 6.46 | 60.0 | 66.9 | 0.0% | 53.8% |
| S4 W19 | 13 | $1752k | $42k | 615 | 5.85 | 60.0 | 67.0 | 0.0% | 30.8% |
| S4 W20 | 13 | $1752k | $288 | 627 | 5.54 | 60.1 | 67.2 | 0.0% | 46.2% |
| S4 W21 | 13 | $1792k | $40k | 644 | 6.62 | 60.2 | 67.3 | 0.0% | 53.8% |
| S4 W22 | 13 | $1795k | $2.3k | 634 | 5.85 | 60.2 | 67.4 | 0.0% | 46.2% |
| S4 W23 | 13 | $1835k | $40k | 635 | 6.77 | 60.3 | 67.5 | 0.0% | 69.2% |
| S4 W24 | 13 | $1837k | $2.0k | 637 | 6.46 | 60.4 | 67.6 | 0.0% | 46.2% |
| S4 W25 final | 13 | $1856k | $20k | 462 | 4.69 | 60.4 | 67.7 | 0.0% | 62.5% |
| S4 W26 final | 13 | $1868k | $12k | 350 | 3.38 | 60.4 | 67.7 | 0.0% | 40.0% |
| S4 W27 final | 13 | $1915k | $47k | 167 | 2.38 | 67.8 | 67.8 | 0.0% | 50.0% |
| S5 trial 1 | 8 | $1973k | -$114k | 670 | 4.75 | 62.7 | 69.3 | 0.0% | 75.0% |
| S5 trial 2 | 8 | $1980k | $6.2k | 666 | 6.88 | 62.8 | 69.4 | 0.0% | 37.5% |
| S5 W1 | 8 | $2018k | $39k | 667 | 5.63 | 62.8 | 69.5 | 0.0% | 62.5% |
| S5 W2 | 8 | $2020k | $2.1k | 651 | 5.50 | 62.9 | 69.5 | 0.0% | 50.0% |
| S5 W3 | 8 | $2064k | $44k | 664 | 7.25 | 62.9 | 69.6 | 0.0% | 50.0% |
| S5 W4 | 8 | $2066k | $1.8k | 651 | 5.50 | 63.0 | 69.7 | 0.0% | 37.5% |
| S5 W5 | 8 | $2109k | $43k | 675 | 8.13 | 63.1 | 69.8 | 0.0% | 75.0% |
| S5 W6 | 8 | $2111k | $2.4k | 649 | 6.63 | 63.1 | 69.9 | 0.0% | 62.5% |
| S5 W7 | 8 | $2153k | $42k | 659 | 6.00 | 63.2 | 70.0 | 0.0% | 62.5% |
| S5 W8 | 8 | $2153k | -$783 | 659 | 7.13 | 63.3 | 70.1 | 0.0% | 37.5% |
| S5 W9 | 8 | $2195k | $42k | 666 | 6.00 | 63.3 | 70.1 | 0.0% | 75.0% |
| S5 W10 | 8 | $2198k | $2.9k | 658 | 6.38 | 63.4 | 70.2 | 0.0% | 50.0% |
| S5 W11 | 8 | $2243k | $45k | 694 | 7.88 | 63.5 | 70.3 | 0.0% | 75.0% |
| S5 W12 | 8 | $2245k | $2.4k | 661 | 6.63 | 63.5 | 70.4 | 0.0% | 37.5% |
| S5 W13 | 8 | $2289k | $44k | 654 | 5.63 | 63.6 | 70.4 | 0.0% | 37.5% |
| S5 W14 | 8 | $2291k | $2.4k | 674 | 7.63 | 63.6 | 70.5 | 0.0% | 62.5% |
| S5 W15 | 8 | $2333k | $42k | 652 | 5.88 | 63.7 | 70.6 | 0.0% | 37.5% |
| S5 W16 | 8 | $2335k | $2.4k | 661 | 5.63 | 63.7 | 70.7 | 0.0% | 37.5% |
| S5 W17 | 8 | $2379k | $44k | 658 | 8.50 | 63.8 | 70.8 | 0.0% | 62.5% |
| S5 W18 | 8 | $2380k | $703 | 661 | 5.75 | 63.9 | 70.8 | 0.0% | 37.5% |
| S5 W19 | 8 | $2423k | $43k | 672 | 6.63 | 63.9 | 70.9 | 0.0% | 87.5% |
| S5 W20 | 8 | $2425k | $2.5k | 661 | 7.50 | 64.0 | 71.0 | 0.0% | 62.5% |
| S5 W21 | 8 | $2470k | $44k | 662 | 5.50 | 64.0 | 71.0 | 0.0% | 62.5% |
| S5 W22 | 8 | $2472k | $2.1k | 671 | 6.38 | 64.1 | 71.1 | 0.0% | 50.0% |
| S5 W23 | 8 | $2515k | $43k | 658 | 7.25 | 64.2 | 71.2 | 0.0% | 37.5% |
| S5 W24 | 8 | $2518k | $2.9k | 683 | 6.63 | 64.2 | 71.3 | 0.0% | 62.5% |
| S5 W25 final | 8 | $2546k | $28k | 554 | 5.25 | 64.3 | 71.3 | 0.0% | 66.7% |
| S5 W26 final | 8 | $2574k | $28k | 495 | 5.63 | 64.3 | 71.4 | 0.0% | 80.0% |
| S5 W27 final | 8 | $2687k | $113k | 294 | 3.50 | 71.5 | 71.5 | 0.0% | 75.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1403 | 50.1% | 622 | 54.3% | -4.2% |  |
| balanced × slide | 622 | 54.3% | 1403 | 50.1% | 4.2% |  |

### min-maxer/easy/au

- 70 overall (best nine, including recruitment): 37.6 weeks; 20 reached, 0 censored.
- 80 overall (best nine, including recruitment): 71.0 weeks; 20 reached, 0 censored.
- 90 overall (best nine, including recruitment): 129.8 weeks; 6 reached, 14 censored.
- Opening players gaining a star: 178 of 400; median 19.0 weeks among those who did.
- Reaching potential stars: 212 of 400 (100 already there at week 0); median 19.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/359; S3 62/181; S5 124/159.
- Mean XP per completed season 31930; mean level-ups per completed season 315.0.
- Cash: opening 90000; mean weekly change 19990; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 100; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1142k after opening at $90k, and no career went into debt.
- WARNING: cash climbs by $20k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 75818 |
| gate | 862570 |
| prize | 79390 |
| boardGrant | 12155 |
| events | 5107 |
| transfers | -78442 |
| contracts | 0 |
| facilities | -376890 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 4 strength 3, handling 1 | $64k | -$26k | 956 | 4 | 53.8 | W 14-0 Dubbo Diggers |
| S1 trial 2 | kicking | 7 speed 2, strength 3, handling 2 | $49k | -$15k | 878 | 7 | 53.9 | L 0-8 Wagga Swagmen |
| S1 W1 | kicking | 10 speed 2, strength 5, handling 2, kicking 1 | $75k | $25k | 991 | 10 | 54.0 | W 8-4 Launceston Larrikins |
| S1 W2 | kicking | 8 speed 2, strength 4, handling 2 | $54k | -$21k | 1024 | 8 | 54.0 | W 27-11 Darwin Drovers |
| S1 W3 | kicking | 9 speed 1, strength 6, handling 1, kicking 1 | $89k | $35k | 1076 | 9 | 54.1 | W 18-6 Southport Stingrays |
| S1 W4 | kicking | 14 speed 3, strength 6, handling 5 | $54k | -$35k | 1023 | 14 | 54.5 | L 4-6 Broken Hill Brollys |
| S1 W5 | kicking | 9 speed 3, strength 5, handling 1 | $84k | $30k | 1112 | 9 | 54.6 | W 23-0 Geelong Gulls |
| S1 W6 | kicking | 12 speed 4, strength 5, handling 2, kicking 1 | $55k | -$29k | 1160 | 12 | 54.7 | W 4-0 Wagga Swagmen |
| S1 W7 | kicking | 9 speed 1, strength 5, handling 3 | $90k | $35k | 1189 | 9 | 54.7 | W 20-4 Katherine Crocs |
| S1 W8 | kicking | 11 speed 2, strength 6, handling 2, kicking 1 | $46k | -$44k | 1180 | 11 | 54.8 | W 6-0 Shellharbour Scorpions |
| S1 W9 | kicking | 15 speed 3, strength 7, stamina 1, handling 4 | $75k | $29k | 1207 | 15 | 55.0 | W 4-0 Dubbo Diggers |
| S1 W10 | kicking | 11 speed 2, strength 6, handling 2, kicking 1 | $45k | -$30k | 1159 | 11 | 55.7 | W 4-0 Mackay Marlins |
| S1 W11 | kicking | 11 speed 3, strength 3, stamina 2, handling 3 | $82k | $37k | 1212 | 11 | 55.8 | W 12-0 Ballarat Bushrangers |
| S1 W12 | kicking | 12 speed 3, strength 4, stamina 1, handling 3, kicking 1 | $42k | -$41k | 1125 | 12 | 55.9 | L 6-11 Cairns Cyclones |
| S1 W13 | kicking | 12 speed 4, strength 5, stamina 1, handling 1, kicking 1 | $76k | $35k | 1173 | 12 | 56.0 | W 6-4 Toowoomba Thunder |
| S1 W14 | kicking | 11 speed 2, strength 3, stamina 2, handling 4 | $41k | -$35k | 1158 | 11 | 56.1 | L 0-6 Woolloomooloo Wolves |
| S1 W15 | kicking | 11 speed 3, strength 2, stamina 3, handling 2, kicking 1 | $73k | $32k | 1140 | 11 | 56.2 | L 1-6 Redcliffe Reapers |
| S1 W16 | kicking | 11 speed 3, strength 2, stamina 3, handling 3 | $49k | -$24k | 1150 | 11 | 56.3 | W 6-0 Launceston Larrikins |
| S1 W17 | kicking | 11 speed 2, strength 2, stamina 4, handling 2, kicking 1 | $65k | $15k | 1319 | 11 | 56.4 | W 31-8 Darwin Drovers |
| S1 W18 | kicking | 14 speed 1, strength 4, stamina 5, handling 4 | $66k | $1.2k | 1200 | 14 | 56.5 | D 4-4 Southport Stingrays |
| S1 W19 | kicking | 12 speed 3, strength 2, stamina 3, handling 3, kicking 1 | $91k | $25k | 1316 | 12 | 56.6 | W 17-6 Broken Hill Brollys |
| S1 W20 | kicking | 12 speed 2, strength 1, stamina 4, handling 3, kicking 2 | $52k | -$39k | 1156 | 12 | 56.7 | L 4-6 Geelong Gulls |
| S1 W21 | kicking | 12 speed 2, strength 2, stamina 3, handling 2, kicking 3 | $85k | $33k | 1217 | 12 | 56.8 | W 13-11 Wagga Swagmen |
| S1 W22 | kicking | 14 speed 3, strength 2, stamina 4, handling 2, kicking 3 | $57k | -$29k | 1228 | 14 | 56.9 | W 27-4 Katherine Crocs |
| S1 W23 | kicking | 11 strength 1, stamina 4, handling 3, kicking 3 | $84k | $28k | 1162 | 11 | 57.0 | W 10-7 Shellharbour Scorpions |
| S1 W24 | kicking | 10 strength 1, stamina 3, handling 4, kicking 2 | $66k | -$19k | 1082 | 10 | 57.3 | L 6-12 Dubbo Diggers |
| S1 W25 final | kicking | 12 speed 1, stamina 4, handling 3, kicking 3, footyIQ 1 | $105k | $39k | 1352 | 12 | 57.4 | W 16-4 Launceston Larrikins |
| S1 W26 final | kicking | 14 speed 3, strength 1, stamina 4, handling 4, kicking 2 | $93k | -$13k | 1368 | 14 | 57.5 | W 18-4 Toowoomba Thunder |
| S1 W27 final | kicking | 18 speed 6, strength 3, stamina 3, handling 3, kicking 3 | $224k | $132k | 1291 | 18 | 58.2 | W 32-6 Woolloomooloo Wolves |
| S2 trial 1 | kicking | 8 speed 2, stamina 2, handling 2, kicking 2 | $147k | -$78k | 1040 | 8 | 58.3 | L 0-4 Shellharbour Scorpions |
| S2 trial 2 | kicking | 11 speed 2, strength 2, stamina 2, handling 2, kicking 3 | $83k | -$64k | 1123 | 11 | 58.4 | W 11-10 Woolloomooloo Wolves |
| S2 W1 | kicking | 12 speed 2, stamina 1, handling 2, kicking 3, footyIQ 4 | $123k | $40k | 1187 | 12 | 58.5 | W 10-0 Launceston Larrikins |
| S2 W2 | kicking | 12 speed 3, strength 2, stamina 1, handling 2, kicking 2, footyIQ 2 | $65k | -$58k | 1158 | 12 | 58.6 | W 8-0 Darwin Drovers |
| S2 W3 | kicking | 10 speed 2, stamina 1, handling 2, kicking 2, footyIQ 3 | $107k | $42k | 1107 | 10 | 58.7 | L 13-14 Southport Stingrays |
| S2 W4 | kicking | 12 speed 3, strength 2, stamina 1, handling 2, kicking 2, footyIQ 2 | $49k | -$58k | 1155 | 12 | 58.8 | W 13-8 Broken Hill Brollys |
| S2 W5 | kicking | 10 speed 1, stamina 2, handling 1, kicking 4, footyIQ 2 | $92k | $42k | 983 | 10 | 58.8 | D 7-7 Geelong Gulls |
| S2 W6 | kicking | 9 speed 1, strength 1, stamina 2, handling 2, kicking 2, footyIQ 1 | $65k | -$27k | 1054 | 9 | 59.6 | W 14-0 Wagga Swagmen |
| S2 W7 | kicking | 14 speed 2, strength 5, stamina 1, kicking 2, footyIQ 4 | $110k | $45k | 1173 | 14 | 59.7 | W 12-10 Katherine Crocs |
| S2 W8 | kicking | 9 speed 3, strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $86k | -$25k | 1255 | 9 | 60.4 | W 10-6 Shellharbour Scorpions |
| S2 W9 | kicking | 13 strength 3, stamina 1, handling 2, kicking 3, footyIQ 4 | $97k | $11k | 1291 | 13 | 61.2 | W 16-0 Dubbo Diggers |
| S2 W10 | kicking | 14 speed 5, strength 3, stamina 1, footyIQ 5 | $69k | -$27k | 1417 | 14 | 61.9 | W 17-4 Mackay Marlins |
| S2 W11 | kicking | 13 speed 4, strength 4, stamina 1, handling 1, footyIQ 3 | $112k | $42k | 1261 | 13 | 62.0 | W 11-4 Ballarat Bushrangers |
| S2 W12 | kicking | 14 speed 5, strength 2, footyIQ 7 | $114k | $2.1k | 1308 | 14 | 62.1 | W 6-0 Cairns Cyclones |
| S2 W13 | kicking | 14 speed 4, strength 3, stamina 1, handling 2, footyIQ 4 | $156k | $42k | 1425 | 14 | 62.2 | W 12-8 Toowoomba Thunder |
| S2 W14 | kicking | 14 speed 2, strength 3, stamina 1, handling 1, footyIQ 7 | $68k | -$88k | 1367 | 14 | 62.3 | L 12-14 Woolloomooloo Wolves |
| S2 W15 | kicking | 11 speed 4, strength 3, footyIQ 4 | $111k | $43k | 1407 | 11 | 62.4 | W 10-6 Redcliffe Reapers |
| S2 W16 | kicking | 15 speed 4, strength 4, stamina 1, handling 1, footyIQ 5 | $113k | $2.2k | 1434 | 18 | 62.5 | W 16-4 Launceston Larrikins |
| S2 W17 | kicking | 12 speed 3, strength 3, stamina 1, footyIQ 5 | $156k | $43k | 1386 | 13 | 62.6 | W 13-0 Darwin Drovers |
| S2 W18 | kicking | 10 speed 2, strength 1, stamina 3, footyIQ 4 | $158k | $2.2k | 1597 | 12 | 62.7 | W 43-4 Southport Stingrays |
| S2 W19 | kicking | 13 speed 3, strength 1, stamina 2, handling 1, footyIQ 6 | $201k | $43k | 1493 | 16 | 62.8 | W 29-11 Broken Hill Brollys |
| S2 W20 | kicking | 15 speed 3, strength 2, stamina 3, handling 1, footyIQ 6 | $83k | -$118k | 1521 | 18 | 62.9 | W 31-6 Geelong Gulls |
| S2 W21 | kicking | 12 speed 4, strength 1, stamina 2, handling 1, footyIQ 4 | $126k | $43k | 1473 | 14 | 63.0 | W 24-0 Wagga Swagmen |
| S2 W22 | kicking | 14 speed 4, strength 1, stamina 2, footyIQ 7 | $129k | $2.4k | 1577 | 15 | 63.1 | W 35-6 Katherine Crocs |
| S2 W23 | kicking | 12 speed 2, strength 1, stamina 2, handling 1, footyIQ 6 | $171k | $43k | 1419 | 14 | 63.2 | W 18-0 Shellharbour Scorpions |
| S2 W24 | kicking | 16 speed 4, strength 3, stamina 4, footyIQ 5 | $55k | -$117k | 1497 | 18 | 63.3 | W 30-10 Dubbo Diggers |
| S2 W25 final | kicking | 13 speed 4, stamina 3, handling 1, footyIQ 5 | $98k | $44k | 1445 | 16 | 63.4 | W 16-7 Dubbo Diggers |
| S2 W26 final | kicking | 9 speed 4, stamina 1, footyIQ 4 | $142k | $44k | 1408 | 12 | 63.5 | W 6-4 Woolloomooloo Wolves |
| S2 W27 final | kicking | 10 speed 3, stamina 3, handling 1, footyIQ 3 | $317k | $175k | 1260 | 12 | 67.8 | W 20-6 Cairns Cyclones |
| S3 trial 1 | kicking | 10 speed 3, strength 1, stamina 3, handling 1, footyIQ 2 | $78k | -$239k | 1274 | 12 | 69.4 | W 29-10 Broken Hill Brollys |
| S3 trial 2 | kicking | 8 speed 4, strength 1, stamina 2, footyIQ 1 | $81k | $3.1k | 1216 | 11 | 69.5 | W 22-0 Shellharbour Scorpions |
| S3 W1 | kicking | 8 speed 4, stamina 1, handling 2, footyIQ 1 | $126k | $44k | 1167 | 11 | 69.6 | W 12-4 Launceston Larrikins |
| S3 W2 | kicking | 10 speed 6, strength 1, stamina 2, handling 1 | $95k | -$30k | 1214 | 12 | 70.3 | W 38-12 Darwin Drovers |
| S3 W3 | kicking | 10 speed 7, strength 1, stamina 1, handling 1 | $138k | $42k | 1191 | 13 | 70.4 | W 31-16 Southport Stingrays |
| S3 W4 | kicking | 10 speed 7, stamina 2, handling 1 | $142k | $4.1k | 1203 | 12 | 70.5 | W 17-0 Broken Hill Brollys |
| S3 W5 | kicking | 9 speed 5, stamina 2, handling 1, footyIQ 1 | $191k | $49k | 1225 | 12 | 70.6 | W 14-4 Geelong Gulls |
| S3 W6 | kicking | 6 speed 5, stamina 1 | $75k | -$116k | 1198 | 9 | 70.7 | W 14-0 Wagga Swagmen |
| S3 W7 | kicking | 11 speed 6, strength 1, stamina 2, handling 2 | $150k | $75k | 1212 | 13 | 70.8 | W 25-6 Katherine Crocs |
| S3 W8 | kicking | 12 speed 5, strength 1, stamina 4, handling 2 | $154k | $4.1k | 1211 | 16 | 71.0 | W 22-10 Shellharbour Scorpions |
| S3 W9 | kicking | 8 speed 4, stamina 2, handling 2 | $225k | $71k | 1134 | 11 | 71.0 | W 11-6 Dubbo Diggers |
| S3 W10 | kicking | 7 speed 3, stamina 2, handling 1, footyIQ 1 | $228k | $3.2k | 1312 | 12 | 71.1 | W 34-12 Mackay Marlins |
| S3 W11 | kicking | 7 speed 2, stamina 2, handling 2, kicking 1 | $300k | $71k | 1049 | 11 | 71.2 | L 0-16 Ballarat Bushrangers |
| S3 W12 | kicking | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $303k | $3.2k | 1136 | 10 | 71.2 | L 18-21 Cairns Cyclones |
| S3 W13 | kicking | 8 speed 1, strength 1, handling 2, footyIQ 4 | $363k | $60k | 1340 | 12 | 71.3 | W 39-0 Toowoomba Thunder |
| S3 W14 | kicking | 6 speed 1, handling 1, footyIQ 4 | $366k | $3.2k | 1256 | 13 | 71.4 | W 17-6 Woolloomooloo Wolves |
| S3 W15 | kicking | 8 speed 1, strength 2, handling 3, footyIQ 2 | $437k | $71k | 1140 | 13 | 71.5 | W 12-0 Redcliffe Reapers |
| S3 W16 | kicking | 6 speed 3, handling 1, footyIQ 2 | $441k | $3.2k | 1381 | 12 | 71.5 | W 34-0 Launceston Larrikins |
| S3 W17 | kicking | 7 stamina 2, handling 2, footyIQ 3 | $276k | -$165k | 1280 | 14 | 71.6 | W 25-4 Darwin Drovers |
| S3 W18 | kicking | 6 speed 3, handling 2, footyIQ 1 | $279k | $3.2k | 1317 | 13 | 71.7 | W 29-6 Southport Stingrays |
| S3 W19 | kicking | 8 speed 3, strength 1, handling 1, footyIQ 3 | $350k | $70k | 1393 | 15 | 71.7 | W 38-8 Broken Hill Brollys |
| S3 W20 | kicking | 6 speed 3, handling 1, footyIQ 2 | $353k | $3.8k | 1337 | 13 | 71.8 | W 32-6 Geelong Gulls |
| S3 W21 | kicking | 7 speed 2, handling 2, footyIQ 3 | $425k | $71k | 1292 | 14 | 71.9 | W 30-6 Wagga Swagmen |
| S3 W22 | kicking | 4 speed 1, strength 1, handling 1, footyIQ 1 | $428k | $3.3k | 1091 | 8 | 71.9 | L 0-13 Katherine Crocs |
| S3 W23 | kicking | 9 speed 2, strength 1, handling 2, footyIQ 4 | $508k | $80k | 1244 | 15 | 72.0 | W 36-10 Shellharbour Scorpions |
| S3 W24 | kicking | 4 speed 2, footyIQ 2 | $511k | $3.3k | 1196 | 9 | 72.0 | W 10-6 Dubbo Diggers |
| S3 W25 final | kicking | 8 speed 3, handling 2, footyIQ 3 | $611k | $99k | 1130 | 14 | 72.1 | L 7-12 Katherine Crocs |
| S3 W26 final | kicking | 0 | $614k | $3.3k | 270 | 0 | 72.1 | no match |
| S3 W27 final | kicking | 1 speed 1 | $647k | $33k | 176 | 2 | 86.2 | no match |
| S4 trial 1 | kicking | 4 speed 1, handling 1, footyIQ 2 | $659k | $12k | 1079 | 9 | 72.2 | W 6-0 Toowoomba Thunder |
| S4 trial 2 | kicking | 10 speed 3, strength 1, handling 3, footyIQ 3 | $662k | $3.4k | 1279 | 14 | 72.4 | W 26-18 Launceston Larrikins |
| S4 W1 | kicking | 6 speed 2, strength 1, handling 1, footyIQ 2 | $723k | $60k | 1109 | 10 | 72.5 | L 4-6 Launceston Larrikins |
| S4 W2 | kicking | 7 speed 3, strength 1, handling 1, footyIQ 2 | $726k | $3.4k | 1151 | 10 | 72.6 | W 6-4 Darwin Drovers |
| S4 W3 | kicking | 9 speed 3, strength 1, handling 1, footyIQ 4 | $798k | $72k | 1166 | 14 | 72.7 | W 12-6 Southport Stingrays |
| S4 W4 | kicking | 6 speed 3, footyIQ 3 | $801k | $3.4k | 1153 | 10 | 72.8 | W 10-6 Broken Hill Brollys |
| S4 W5 | kicking | 7 speed 2, strength 1, handling 1, footyIQ 3 | $879k | $78k | 1176 | 11 | 72.9 | W 14-0 Geelong Gulls |
| S4 W6 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | $883k | $3.4k | 1101 | 10 | 73.0 | L 4-10 Wagga Swagmen |
| S4 W7 | kicking | 10 speed 4, strength 3, handling 1, footyIQ 2 | $953k | $71k | 1285 | 15 | 73.2 | W 38-6 Katherine Crocs |
| S4 W8 | kicking | 9 speed 4, strength 2, handling 1, footyIQ 2 | $959k | $5.4k | 1199 | 14 | 73.4 | W 23-6 Shellharbour Scorpions |
| S4 W9 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | $1043k | $84k | 1212 | 12 | 73.4 | W 12-0 Dubbo Diggers |
| S4 W10 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | $1046k | $3.4k | 1281 | 13 | 73.5 | W 34-0 Mackay Marlins |
| S4 W11 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | $1128k | $82k | 1151 | 12 | 73.6 | W 13-6 Ballarat Bushrangers |
| S4 W12 | kicking | 3 speed 1, strength 1, footyIQ 1 | $1131k | $3.4k | 1277 | 10 | 73.7 | W 29-7 Cairns Cyclones |
| S4 W13 | kicking | 5 speed 3, strength 1, handling 1 | $1206k | $74k | 1156 | 10 | 73.7 | W 26-20 Toowoomba Thunder |
| S4 W14 | kicking | 5 speed 1, strength 2, handling 1, footyIQ 1 | $1209k | $3.4k | 1246 | 13 | 73.8 | W 30-16 Woolloomooloo Wolves |
| S4 W15 | kicking | 5 speed 1, strength 2, handling 1, footyIQ 1 | $1299k | $90k | 1124 | 13 | 73.9 | W 9-4 Redcliffe Reapers |
| S4 W16 | kicking | 7 speed 2, strength 3, handling 1, footyIQ 1 | $1302k | $3.4k | 1133 | 13 | 74.0 | W 16-6 Launceston Larrikins |
| S4 W17 | kicking | 4 speed 1, strength 2, handling 1 | $1377k | $75k | 1237 | 11 | 74.0 | W 14-4 Darwin Drovers |
| S4 W18 | kicking | 5 speed 2, strength 1, handling 1, footyIQ 1 | $1381k | $3.4k | 1093 | 11 | 74.1 | L 1-2 Southport Stingrays |
| S4 W19 | kicking | 5 speed 1, strength 2, handling 1, footyIQ 1 | $1449k | $68k | 1238 | 13 | 74.2 | W 36-13 Broken Hill Brollys |
| S4 W20 | kicking | 6 speed 2, strength 2, handling 1, footyIQ 1 | $1452k | $3.4k | 1316 | 13 | 74.3 | W 35-6 Geelong Gulls |
| S4 W21 | kicking | 2 strength 1, footyIQ 1 | $1536k | $84k | 1220 | 11 | 74.3 | W 28-13 Wagga Swagmen |
| S4 W22 | kicking | 4 speed 1, strength 2, handling 1 | $1539k | $3.4k | 1127 | 12 | 74.4 | W 6-0 Katherine Crocs |
| S4 W23 | kicking | 5 speed 2, strength 2, handling 1 | $1609k | $70k | 1123 | 10 | 74.4 | W 6-4 Shellharbour Scorpions |
| S4 W24 | kicking | 4 speed 2, strength 1, handling 1 | $1613k | $3.4k | 1191 | 11 | 74.5 | W 25-0 Dubbo Diggers |
| S4 W25 final | kicking | 5 speed 1, strength 3, handling 1 | $1365k | -$248k | 1138 | 13 | 74.6 | W 16-0 Darwin Drovers |
| S4 W26 final | kicking | 4 speed 1, strength 2, handling 1 | $1477k | $112k | 1212 | 13 | 74.6 | W 12-0 Dubbo Diggers |
| S4 W27 final | kicking | 2 speed 1, strength 1 | $1722k | $244k | 979 | 11 | 89.4 | W 39-0 Wagga Swagmen |
| S5 trial 1 | kicking | 1 | $1725k | $3.8k | 1112 | 7 | 73.2 | W 22-0 Broken Hill Brollys |
| S5 trial 2 | kicking | 6 speed 1, strength 3, handling 2 | $1745k | $20k | 1452 | 14 | 73.3 | W 43-0 Darwin Drovers |
| S5 W1 | kicking | 7 speed 2, strength 3, kicking 2 | $1812k | $67k | 1215 | 14 | 73.5 | W 18-4 Launceston Larrikins |
| S5 W2 | kicking | 6 speed 1, strength 3, handling 2 | $1816k | $3.8k | 1176 | 11 | 73.6 | L 8-10 Darwin Drovers |
| S5 W3 | kicking | 8 speed 3, strength 3, kicking 2 | $1898k | $82k | 1211 | 15 | 73.7 | W 10-4 Southport Stingrays |
| S5 W4 | kicking | 2 speed 1, handling 1 | $1902k | $3.8k | 1265 | 7 | 72.3 | W 17-0 Broken Hill Brollys |
| S5 W5 | kicking | 9 speed 2, strength 4, handling 2, kicking 1 | $1990k | $88k | 1192 | 14 | 72.5 | L 0-14 Geelong Gulls |
| S5 W6 | kicking | 7 speed 1, strength 4, kicking 2 | $1992k | $1.8k | 1304 | 13 | 72.6 | W 25-20 Wagga Swagmen |
| S5 W7 | kicking | 9 speed 3, strength 4, handling 2 | $2068k | $76k | 1340 | 15 | 72.8 | W 35-16 Katherine Crocs |
| S5 W8 | kicking | 6 speed 1, strength 3, kicking 2 | $2072k | $3.8k | 1263 | 13 | 72.9 | W 24-0 Shellharbour Scorpions |
| S5 W9 | kicking | 6 speed 2, strength 2, handling 2 | $2164k | $92k | 1269 | 10 | 73.0 | W 8-0 Dubbo Diggers |
| S5 W10 | kicking | 5 speed 2, strength 2, kicking 1 | $2168k | $3.8k | 1397 | 13 | 73.0 | W 34-4 Mackay Marlins |
| S5 W11 | kicking | 7 speed 2, strength 3, handling 1, kicking 1 | $2252k | $84k | 1320 | 15 | 73.2 | W 28-4 Ballarat Bushrangers |
| S5 W12 | kicking | 4 speed 2, strength 1, handling 1 | $2256k | $3.8k | 1392 | 13 | 73.2 | W 37-6 Cairns Cyclones |
| S5 W13 | kicking | 5 speed 1, strength 2, kicking 2 | $2356k | $100k | 1329 | 14 | 73.3 | W 21-12 Toowoomba Thunder |
| S5 W14 | kicking | 7 speed 2, strength 3, handling 2 | $2360k | $3.8k | 1326 | 14 | 73.4 | W 22-6 Woolloomooloo Wolves |
| S5 W15 | kicking | 5 speed 1, strength 2, kicking 2 | $2459k | $99k | 1292 | 14 | 73.5 | W 26-4 Redcliffe Reapers |
| S5 W16 | kicking | 7 speed 3, strength 2, handling 2 | $2462k | $3.8k | 1290 | 12 | 73.6 | W 12-6 Launceston Larrikins |
| S5 W17 | kicking | 4 speed 1, strength 1, kicking 2 | $2562k | $99k | 1256 | 12 | 73.7 | W 19-10 Darwin Drovers |
| S5 W18 | kicking | 7 speed 2, strength 3, handling 2 | $2565k | $3.8k | 1345 | 14 | 73.8 | W 34-17 Southport Stingrays |
| S5 W19 | kicking | 4 speed 1, strength 2, kicking 1 | $2664k | $99k | 1298 | 13 | 73.9 | W 14-12 Broken Hill Brollys |
| S5 W20 | kicking | 9 speed 2, strength 3, handling 3, kicking 1 | $2668k | $3.8k | 1281 | 13 | 74.0 | W 13-12 Geelong Gulls |
| S5 W21 | kicking | 3 strength 1, handling 1, kicking 1 | $2755k | $87k | 1315 | 12 | 74.1 | W 35-0 Wagga Swagmen |
| S5 W22 | kicking | 5 strength 2, handling 2, kicking 1 | $2759k | $3.8k | 1346 | 11 | 74.2 | W 25-4 Katherine Crocs |
| S5 W23 | kicking | 7 strength 3, handling 3, kicking 1 | $2843k | $84k | 1306 | 17 | 74.3 | W 14-4 Shellharbour Scorpions |
| S5 W24 | kicking | 6 speed 1, strength 2, handling 2, kicking 1 | $2847k | $3.8k | 1209 | 10 | 74.4 | L 4-10 Dubbo Diggers |
| S5 W25 final | kicking | 5 strength 2, handling 3 | $2961k | $114k | 1376 | 15 | 74.5 | W 37-12 Toowoomba Thunder |
| S5 W26 final | kicking | 7 strength 3, handling 2, kicking 2 | $3077k | $116k | 1251 | 15 | 74.6 | W 23-7 Woolloomooloo Wolves |
| S5 W27 final | kicking | 0 | $3325k | $247k | 720 | 5 | 86.8 | W 29-6 Dubbo Diggers |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $59k | -$31k | 721 | 1.70 | 53.8 | 60.1 | 0.0% | 60.0% |
| S1 trial 2 | 20 | $50k | -$9.4k | 763 | 6.50 | 53.8 | 60.2 | 0.0% | 65.0% |
| S1 W1 | 20 | $74k | $24k | 758 | 6.20 | 53.9 | 60.3 | 0.0% | 55.0% |
| S1 W2 | 20 | $52k | -$22k | 822 | 6.70 | 53.9 | 60.4 | 0.0% | 80.0% |
| S1 W3 | 20 | $82k | $30k | 825 | 6.85 | 54.0 | 60.6 | 0.0% | 65.0% |
| S1 W4 | 20 | $50k | -$32k | 885 | 10.85 | 54.1 | 60.8 | 0.0% | 80.0% |
| S1 W5 | 20 | $78k | $27k | 919 | 8.10 | 54.2 | 60.9 | 0.0% | 85.0% |
| S1 W6 | 20 | $49k | -$28k | 954 | 8.80 | 54.3 | 61.3 | 0.0% | 85.0% |
| S1 W7 | 20 | $83k | $33k | 958 | 10.80 | 54.4 | 61.4 | 0.0% | 75.0% |
| S1 W8 | 20 | $52k | -$30k | 992 | 8.30 | 54.5 | 61.6 | 0.0% | 80.0% |
| S1 W9 | 20 | $81k | $29k | 1009 | 11.55 | 54.6 | 61.8 | 0.0% | 80.0% |
| S1 W10 | 20 | $55k | -$26k | 1037 | 9.15 | 54.7 | 62.1 | 0.0% | 85.0% |
| S1 W11 | 20 | $86k | $31k | 1032 | 11.40 | 54.9 | 62.4 | 0.0% | 65.0% |
| S1 W12 | 20 | $50k | -$37k | 1027 | 8.80 | 54.9 | 62.6 | 0.0% | 50.0% |
| S1 W13 | 20 | $85k | $36k | 1032 | 12.65 | 55.1 | 62.8 | 0.0% | 75.0% |
| S1 W14 | 20 | $51k | -$34k | 1020 | 8.60 | 55.2 | 63.1 | 0.0% | 60.0% |
| S1 W15 | 20 | $86k | $35k | 1044 | 10.05 | 55.3 | 63.3 | 0.0% | 50.0% |
| S1 W16 | 20 | $54k | -$33k | 1049 | 10.00 | 55.4 | 63.5 | 0.0% | 70.0% |
| S1 W17 | 20 | $85k | $31k | 1052 | 9.60 | 55.5 | 63.7 | 0.0% | 70.0% |
| S1 W18 | 20 | $51k | -$34k | 1058 | 11.30 | 55.6 | 64.1 | 0.0% | 70.0% |
| S1 W19 | 20 | $82k | $30k | 1085 | 10.15 | 55.7 | 64.3 | 0.0% | 80.0% |
| S1 W20 | 20 | $55k | -$26k | 1078 | 11.45 | 55.9 | 64.6 | 0.0% | 70.0% |
| S1 W21 | 20 | $88k | $32k | 1084 | 10.20 | 56.0 | 64.9 | 0.0% | 80.0% |
| S1 W22 | 20 | $58k | -$30k | 1106 | 12.90 | 56.4 | 65.7 | 0.0% | 75.0% |
| S1 W23 | 20 | $88k | $30k | 1086 | 9.70 | 56.5 | 66.0 | 0.0% | 70.0% |
| S1 W24 | 20 | $63k | -$25k | 1160 | 10.65 | 56.7 | 66.5 | 0.0% | 90.0% |
| S1 W25 final | 20 | $95k | $32k | 1148 | 10.70 | 56.9 | 66.9 | 0.0% | 80.0% |
| S1 W26 final | 20 | $86k | -$9.9k | 1004 | 9.25 | 57.1 | 67.3 | 0.0% | 81.3% |
| S1 W27 final | 20 | $183k | $98k | 796 | 10.35 | 59.2 | 67.1 | 0.0% | 84.6% |
| S2 trial 1 | 20 | $135k | -$48k | 1028 | 9.75 | 59.3 | 67.5 | 0.0% | 65.0% |
| S2 trial 2 | 20 | $88k | -$48k | 1044 | 10.20 | 59.4 | 67.7 | 0.0% | 70.0% |
| S2 W1 | 20 | $112k | $24k | 1057 | 10.40 | 59.5 | 67.9 | 0.0% | 85.0% |
| S2 W2 | 20 | $66k | -$46k | 1054 | 9.80 | 59.7 | 68.1 | 0.0% | 80.0% |
| S2 W3 | 20 | $108k | $42k | 1067 | 11.00 | 59.8 | 68.4 | 0.0% | 85.0% |
| S2 W4 | 20 | $78k | -$30k | 1072 | 11.55 | 59.9 | 68.6 | 0.0% | 85.0% |
| S2 W5 | 20 | $100k | $23k | 1121 | 10.90 | 60.3 | 69.4 | 0.0% | 85.0% |
| S2 W6 | 20 | $59k | -$42k | 1114 | 10.15 | 60.7 | 70.1 | 0.0% | 90.0% |
| S2 W7 | 20 | $97k | $39k | 1103 | 11.20 | 60.8 | 70.4 | 0.0% | 60.0% |
| S2 W8 | 20 | $77k | -$20k | 1157 | 11.05 | 61.1 | 71.0 | 0.0% | 75.0% |
| S2 W9 | 20 | $100k | $23k | 1171 | 11.10 | 61.5 | 71.7 | 0.0% | 85.0% |
| S2 W10 | 20 | $66k | -$34k | 1178 | 11.10 | 61.8 | 72.5 | 0.0% | 90.0% |
| S2 W11 | 20 | $104k | $39k | 1186 | 12.45 | 62.0 | 72.7 | 0.0% | 90.0% |
| S2 W12 | 20 | $80k | -$25k | 1213 | 11.95 | 62.2 | 73.1 | 0.0% | 75.0% |
| S2 W13 | 20 | $108k | $28k | 1188 | 11.95 | 62.5 | 73.6 | 0.0% | 75.0% |
| S2 W14 | 20 | $78k | -$29k | 1216 | 11.45 | 62.7 | 74.1 | 0.0% | 85.0% |
| S2 W15 | 20 | $120k | $41k | 1201 | 11.25 | 62.9 | 74.3 | 0.0% | 80.0% |
| S2 W16 | 20 | $84k | -$35k | 1201 | 12.70 | 63.0 | 74.6 | 0.0% | 80.0% |
| S2 W17 | 20 | $119k | $35k | 1212 | 11.85 | 63.2 | 75.0 | 0.0% | 85.0% |
| S2 W18 | 20 | $85k | -$35k | 1245 | 12.25 | 63.5 | 75.4 | 0.0% | 90.0% |
| S2 W19 | 20 | $127k | $42k | 1218 | 12.50 | 63.6 | 75.6 | 0.0% | 90.0% |
| S2 W20 | 20 | $100k | -$26k | 1240 | 12.35 | 63.6 | 75.8 | 0.0% | 85.0% |
| S2 W21 | 20 | $139k | $39k | 1191 | 11.60 | 63.8 | 76.1 | 0.0% | 60.0% |
| S2 W22 | 20 | $95k | -$44k | 1231 | 12.05 | 63.9 | 76.3 | 0.0% | 60.0% |
| S2 W23 | 20 | $138k | $42k | 1232 | 11.45 | 64.0 | 76.5 | 0.0% | 75.0% |
| S2 W24 | 20 | $94k | -$44k | 1259 | 15.00 | 64.1 | 76.8 | 0.0% | 95.0% |
| S2 W25 final | 20 | $137k | $43k | 1259 | 12.55 | 64.2 | 77.0 | 0.0% | 90.0% |
| S2 W26 final | 20 | $147k | $10k | 1153 | 11.15 | 64.2 | 77.1 | 0.0% | 66.7% |
| S2 W27 final | 20 | $214k | $67k | 692 | 6.60 | 69.0 | 76.9 | 0.0% | 66.7% |
| S3 trial 1 | 20 | $72k | -$142k | 1040 | 10.40 | 68.7 | 77.5 | 0.0% | 75.0% |
| S3 trial 2 | 20 | $71k | -$1.1k | 1046 | 9.95 | 68.6 | 77.6 | 0.0% | 80.0% |
| S3 W1 | 20 | $110k | $39k | 1066 | 10.20 | 68.6 | 77.9 | 0.0% | 90.0% |
| S3 W2 | 20 | $92k | -$18k | 1078 | 10.60 | 68.6 | 78.2 | 0.0% | 65.0% |
| S3 W3 | 20 | $141k | $50k | 1079 | 10.90 | 68.7 | 78.4 | 0.0% | 75.0% |
| S3 W4 | 20 | $124k | -$17k | 1078 | 11.05 | 68.7 | 78.6 | 0.0% | 80.0% |
| S3 W5 | 20 | $161k | $37k | 1092 | 10.35 | 69.1 | 79.2 | 0.0% | 75.0% |
| S3 W6 | 20 | $125k | -$36k | 1118 | 10.50 | 69.3 | 79.4 | 0.0% | 90.0% |
| S3 W7 | 20 | $184k | $59k | 1122 | 11.60 | 69.4 | 79.6 | 0.0% | 90.0% |
| S3 W8 | 20 | $145k | -$39k | 1107 | 11.35 | 69.5 | 79.8 | 0.0% | 80.0% |
| S3 W9 | 20 | $195k | $50k | 1134 | 11.35 | 69.6 | 80.0 | 0.0% | 90.0% |
| S3 W10 | 20 | $150k | -$45k | 1120 | 11.15 | 69.7 | 80.2 | 0.0% | 80.0% |
| S3 W11 | 20 | $202k | $52k | 1115 | 10.80 | 69.8 | 80.4 | 0.0% | 80.0% |
| S3 W12 | 20 | $175k | -$27k | 1133 | 10.75 | 69.9 | 80.5 | 0.0% | 85.0% |
| S3 W13 | 20 | $222k | $47k | 1131 | 11.50 | 70.0 | 80.7 | 0.0% | 85.0% |
| S3 W14 | 20 | $202k | -$21k | 1130 | 11.35 | 70.1 | 80.9 | 0.0% | 70.0% |
| S3 W15 | 20 | $268k | $67k | 1113 | 11.45 | 70.2 | 81.0 | 0.0% | 75.0% |
| S3 W16 | 20 | $262k | -$5.8k | 1112 | 11.20 | 70.3 | 81.2 | 0.0% | 80.0% |
| S3 W17 | 20 | $313k | $51k | 1116 | 10.90 | 70.3 | 81.3 | 0.0% | 80.0% |
| S3 W18 | 20 | $298k | -$15k | 1119 | 11.50 | 70.4 | 81.5 | 0.0% | 90.0% |
| S3 W19 | 20 | $360k | $62k | 1163 | 11.35 | 70.5 | 81.6 | 0.0% | 85.0% |
| S3 W20 | 20 | $342k | -$18k | 1140 | 11.00 | 70.5 | 81.8 | 0.0% | 85.0% |
| S3 W21 | 20 | $406k | $63k | 1132 | 12.10 | 70.6 | 82.0 | 0.0% | 85.0% |
| S3 W22 | 20 | $409k | $3.4k | 1123 | 11.65 | 70.6 | 82.1 | 0.0% | 80.0% |
| S3 W23 | 20 | $460k | $51k | 1130 | 10.95 | 70.7 | 82.2 | 0.0% | 75.0% |
| S3 W24 | 20 | $463k | $3.1k | 1146 | 10.95 | 70.8 | 82.4 | 0.0% | 90.0% |
| S3 W25 final | 20 | $401k | -$62k | 1147 | 12.30 | 70.9 | 82.5 | 0.0% | 95.0% |
| S3 W26 final | 20 | $461k | $60k | 1079 | 10.20 | 70.9 | 82.7 | 0.0% | 78.9% |
| S3 W27 final | 20 | $627k | $166k | 741 | 7.65 | 82.7 | 82.8 | 0.0% | 80.0% |
| S4 trial 1 | 20 | $578k | -$49k | 1046 | 8.45 | 75.2 | 83.6 | 0.0% | 90.0% |
| S4 trial 2 | 20 | $588k | $9.7k | 1134 | 11.55 | 75.4 | 83.7 | 0.0% | 90.0% |
| S4 W1 | 20 | $647k | $59k | 1128 | 10.75 | 75.5 | 83.8 | 0.0% | 80.0% |
| S4 W2 | 20 | $650k | $3.4k | 1155 | 12.65 | 75.6 | 84.0 | 0.0% | 90.0% |
| S4 W3 | 20 | $721k | $70k | 1147 | 11.45 | 75.7 | 84.1 | 0.0% | 85.0% |
| S4 W4 | 20 | $712k | -$8.4k | 1114 | 9.65 | 75.8 | 84.2 | 0.0% | 65.0% |
| S4 W5 | 20 | $786k | $74k | 1162 | 11.60 | 75.9 | 84.3 | 0.0% | 100.0% |
| S4 W6 | 20 | $790k | $3.5k | 1131 | 11.30 | 76.0 | 84.5 | 0.0% | 80.0% |
| S4 W7 | 20 | $864k | $74k | 1148 | 12.05 | 76.1 | 84.6 | 0.0% | 80.0% |
| S4 W8 | 20 | $868k | $3.9k | 1145 | 12.00 | 76.3 | 84.7 | 0.0% | 95.0% |
| S4 W9 | 20 | $945k | $77k | 1140 | 11.50 | 76.4 | 84.9 | 0.0% | 80.0% |
| S4 W10 | 20 | $949k | $3.5k | 1151 | 11.35 | 76.5 | 85.0 | 0.0% | 75.0% |
| S4 W11 | 20 | $1027k | $78k | 1122 | 11.50 | 76.5 | 85.1 | 0.0% | 75.0% |
| S4 W12 | 20 | $1031k | $3.9k | 1156 | 9.95 | 76.5 | 85.2 | 0.0% | 90.0% |
| S4 W13 | 20 | $1110k | $79k | 1165 | 11.90 | 76.6 | 85.3 | 0.0% | 85.0% |
| S4 W14 | 20 | $1113k | $3.4k | 1159 | 11.90 | 76.7 | 85.4 | 0.0% | 90.0% |
| S4 W15 | 20 | $1192k | $78k | 1144 | 11.25 | 76.7 | 85.5 | 0.0% | 80.0% |
| S4 W16 | 20 | $1195k | $3.6k | 1131 | 12.10 | 76.9 | 85.6 | 0.0% | 85.0% |
| S4 W17 | 20 | $1275k | $80k | 1141 | 11.40 | 77.0 | 85.7 | 0.0% | 90.0% |
| S4 W18 | 20 | $1279k | $3.5k | 1154 | 12.05 | 77.1 | 85.8 | 0.0% | 90.0% |
| S4 W19 | 20 | $1355k | $76k | 1156 | 11.50 | 77.2 | 85.9 | 0.0% | 85.0% |
| S4 W20 | 20 | $1359k | $3.8k | 1132 | 11.35 | 77.1 | 86.0 | 0.0% | 80.0% |
| S4 W21 | 20 | $1437k | $79k | 1134 | 9.75 | 77.2 | 86.1 | 0.0% | 65.0% |
| S4 W22 | 20 | $1442k | $4.2k | 1139 | 11.65 | 77.3 | 86.2 | 0.0% | 85.0% |
| S4 W23 | 20 | $1517k | $75k | 1163 | 11.65 | 77.4 | 86.3 | 0.0% | 80.0% |
| S4 W24 | 20 | $1521k | $3.9k | 1180 | 12.35 | 77.4 | 86.4 | 0.0% | 95.0% |
| S4 W25 final | 20 | $1482k | -$39k | 1138 | 12.00 | 77.5 | 86.5 | 0.0% | 85.0% |
| S4 W26 final | 20 | $1555k | $73k | 1024 | 10.20 | 77.5 | 86.5 | 0.0% | 76.5% |
| S4 W27 final | 20 | $1698k | $144k | 615 | 6.05 | 87.4 | 87.4 | 0.0% | 84.6% |
| S5 trial 1 | 20 | $1686k | -$13k | 1049 | 7.80 | 74.1 | 85.0 | 0.0% | 70.0% |
| S5 trial 2 | 20 | $1696k | $10k | 1163 | 11.45 | 74.2 | 85.1 | 0.0% | 60.0% |
| S5 W1 | 20 | $1760k | $64k | 1198 | 12.70 | 74.3 | 85.2 | 0.0% | 95.0% |
| S5 W2 | 20 | $1764k | $3.6k | 1169 | 12.25 | 74.5 | 85.3 | 0.0% | 65.0% |
| S5 W3 | 20 | $1841k | $77k | 1188 | 12.00 | 74.3 | 85.3 | 0.0% | 90.0% |
| S5 W4 | 20 | $1845k | $3.8k | 1197 | 9.35 | 74.3 | 85.4 | 0.0% | 85.0% |
| S5 W5 | 20 | $1922k | $77k | 1170 | 11.90 | 74.3 | 85.5 | 0.0% | 65.0% |
| S5 W6 | 20 | $1926k | $3.8k | 1177 | 12.75 | 74.4 | 85.6 | 0.0% | 85.0% |
| S5 W7 | 20 | $2009k | $83k | 1209 | 12.10 | 74.5 | 85.6 | 0.0% | 100.0% |
| S5 W8 | 20 | $2012k | $3.8k | 1167 | 11.80 | 74.7 | 85.7 | 0.0% | 80.0% |
| S5 W9 | 20 | $2093k | $81k | 1179 | 12.20 | 74.7 | 85.8 | 0.0% | 85.0% |
| S5 W10 | 20 | $2097k | $3.7k | 1189 | 11.65 | 74.6 | 85.8 | 0.0% | 65.0% |
| S5 W11 | 20 | $2182k | $86k | 1183 | 12.35 | 74.6 | 85.9 | 0.0% | 80.0% |
| S5 W12 | 20 | $2186k | $3.9k | 1198 | 10.00 | 74.6 | 85.9 | 0.0% | 100.0% |
| S5 W13 | 20 | $2272k | $85k | 1204 | 12.50 | 74.7 | 86.0 | 0.0% | 85.0% |
| S5 W14 | 20 | $2276k | $4.5k | 1193 | 12.10 | 74.9 | 86.1 | 0.0% | 75.0% |
| S5 W15 | 20 | $2363k | $87k | 1189 | 12.30 | 75.0 | 86.1 | 0.0% | 85.0% |
| S5 W16 | 20 | $2367k | $3.8k | 1200 | 12.25 | 75.1 | 86.2 | 0.0% | 85.0% |
| S5 W17 | 20 | $2452k | $86k | 1177 | 12.25 | 75.1 | 86.2 | 0.0% | 80.0% |
| S5 W18 | 20 | $2456k | $3.8k | 1190 | 11.30 | 75.2 | 86.3 | 0.0% | 80.0% |
| S5 W19 | 20 | $2539k | $83k | 1207 | 12.95 | 75.2 | 86.3 | 0.0% | 75.0% |
| S5 W20 | 20 | $2543k | $4.0k | 1189 | 11.50 | 75.3 | 86.3 | 0.0% | 85.0% |
| S5 W21 | 20 | $2623k | $80k | 1199 | 10.95 | 75.4 | 86.4 | 0.0% | 80.0% |
| S5 W22 | 20 | $2627k | $3.9k | 1203 | 11.80 | 75.5 | 86.4 | 0.0% | 85.0% |
| S5 W23 | 20 | $2708k | $81k | 1211 | 12.70 | 75.5 | 86.5 | 0.0% | 90.0% |
| S5 W24 | 20 | $2712k | $4.1k | 1236 | 12.30 | 75.5 | 86.5 | 0.0% | 90.0% |
| S5 W25 final | 20 | $2774k | $62k | 1208 | 12.45 | 75.6 | 86.6 | 0.0% | 85.0% |
| S5 W26 final | 20 | $2839k | $65k | 1047 | 10.75 | 75.7 | 86.6 | 0.0% | 64.7% |
| S5 W27 final | 20 | $2989k | $150k | 451 | 4.20 | 88.2 | 88.2 | 0.0% | 90.9% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × rush | 68 | 72.8% | 2583 | 83.2% | -10.4% |  |
| all-out × slide | 18 | 61.1% | 2633 | 83.1% | -22.0% | WARNING |
| expansive × slide | 2 | 100.0% | 2649 | 82.9% | 17.1% |  |
| grind × slide | 133 | 77.8% | 2518 | 83.2% | -5.4% |  |
| kick-chase × rush | 2430 | 83.6% | 221 | 75.1% | 8.5% |  |
| block-play | 2444 | 82.8% | 207 | 84.1% | -1.2% |  |
| block-shift | 122 | 85.2% | 2529 | 82.8% | 2.4% |  |
| cut-out-winger | 122 | 85.2% | 2529 | 82.8% | 2.4% |  |
| inside-ball | 2444 | 82.8% | 207 | 84.1% | -1.2% |  |
| second-man | 117 | 87.2% | 2534 | 82.7% | 4.5% |  |
| short-side-raid | 2426 | 82.8% | 225 | 84.4% | -1.7% |  |

### min-maxer/normal/au

- 70 overall (best nine, including recruitment): 41.5 weeks; 20 reached, 0 censored.
- 80 overall (best nine, including recruitment): 76.5 weeks; 19 reached, 1 censored.
- 90 overall (best nine, including recruitment): 130.4 weeks; 5 reached, 15 censored.
- Opening players gaining a star: 176 of 400; median 15.0 weeks among those who did.
- Reaching potential stars: 186 of 400 (95 already there at week 0); median 29.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/356; S3 47/178; S5 100/153.
- Mean XP per completed season 30247; mean level-ups per completed season 298.1.
- Cash: opening 60000; mean weekly change 15668; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 98; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $876k after opening at $60k, and no career went into debt.
- WARNING: cash climbs by $16k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 66767 |
| gate | 730798 |
| prize | 68980 |
| boardGrant | 12755 |
| events | 4842 |
| transfers | -89896 |
| contracts | 0 |
| facilities | -339888 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 4 strength 2, handling 2 | $60k | -$500 | 933 | 4 | 49.4 | L 7-8 Dubbo Diggers |
| S1 trial 2 | kicking | 8 speed 2, strength 4, handling 1, kicking 1 | $45k | -$15k | 1055 | 8 | 49.5 | W 17-10 Wagga Swagmen |
| S1 W1 | kicking | 11 speed 2, strength 4, handling 4, kicking 1 | $71k | $26k | 1063 | 11 | 49.6 | W 19-10 Launceston Larrikins |
| S1 W2 | kicking | 10 speed 2, strength 5, handling 3 | $50k | -$21k | 1134 | 10 | 49.7 | W 16-4 Darwin Drovers |
| S1 W3 | kicking | 8 speed 1, strength 4, handling 2, kicking 1 | $81k | $31k | 1114 | 8 | 49.8 | W 16-14 Southport Stingrays |
| S1 W4 | kicking | 16 speed 3, strength 8, handling 4, kicking 1 | $43k | -$38k | 1060 | 16 | 49.9 | L 0-5 Broken Hill Brollys |
| S1 W5 | kicking | 11 speed 3, strength 5, handling 2, kicking 1 | $80k | $36k | 1146 | 11 | 50.0 | W 4-0 Geelong Gulls |
| S1 W6 | kicking | 8 speed 3, strength 3, handling 2 | $51k | -$29k | 1108 | 8 | 50.1 | D 0-0 Wagga Swagmen |
| S1 W7 | kicking | 14 speed 1, strength 7, handling 4, kicking 2 | $80k | $29k | 1262 | 14 | 50.3 | W 8-4 Katherine Crocs |
| S1 W8 | kicking | 11 speed 2, strength 6, handling 2, kicking 1 | $63k | -$17k | 1449 | 11 | 50.4 | W 16-10 Shellharbour Scorpions |
| S1 W9 | kicking | 18 speed 3, strength 9, stamina 1, handling 4, kicking 1 | $98k | $34k | 1340 | 18 | 50.6 | W 5-4 Dubbo Diggers |
| S1 W10 | kicking | 8 speed 2, strength 4, handling 1, kicking 1 | $65k | -$32k | 1319 | 8 | 51.6 | L 0-6 Mackay Marlins |
| S1 W11 | kicking | 16 speed 5, strength 6, handling 4, kicking 1 | $75k | $9.5k | 1323 | 16 | 51.7 | L 0-2 Ballarat Bushrangers |
| S1 W12 | kicking | 15 speed 5, strength 4, stamina 2, handling 3, kicking 1 | $46k | -$29k | 1466 | 15 | 51.9 | W 12-10 Cairns Cyclones |
| S1 W13 | kicking | 16 speed 4, strength 5, stamina 2, handling 4, kicking 1 | $79k | $33k | 1402 | 16 | 52.0 | L 10-13 Toowoomba Thunder |
| S1 W14 | kicking | 11 speed 4, strength 2, stamina 3, handling 2 | $44k | -$35k | 1332 | 11 | 52.1 | L 0-18 Woolloomooloo Wolves |
| S1 W15 | kicking | 12 speed 2, strength 1, stamina 5, handling 3, kicking 1 | $71k | $27k | 1411 | 12 | 52.3 | D 14-14 Redcliffe Reapers |
| S1 W16 | kicking | 15 speed 5, strength 2, stamina 2, handling 5, kicking 1 | $55k | -$16k | 1415 | 15 | 52.7 | W 8-4 Launceston Larrikins |
| S1 W17 | kicking | 13 speed 4, strength 1, stamina 4, handling 3, kicking 1 | $86k | $31k | 1419 | 13 | 52.8 | D 4-4 Darwin Drovers |
| S1 W18 | kicking | 17 speed 4, strength 5, stamina 5, handling 1, kicking 2 | $42k | -$44k | 1407 | 17 | 53.0 | W 6-0 Southport Stingrays |
| S1 W19 | kicking | 10 speed 2, strength 2, stamina 3, kicking 3 | $75k | $33k | 1329 | 10 | 53.1 | L 0-10 Broken Hill Brollys |
| S1 W20 | kicking | 16 speed 6, strength 2, stamina 4, handling 2, kicking 2 | $57k | -$18k | 1408 | 16 | 53.5 | L 0-4 Geelong Gulls |
| S1 W21 | kicking | 13 speed 4, stamina 5, handling 1, kicking 3 | $89k | $31k | 1560 | 13 | 53.6 | W 16-4 Wagga Swagmen |
| S1 W22 | kicking | 15 speed 4, strength 3, stamina 3, handling 2, kicking 3 | $50k | -$39k | 1440 | 15 | 53.7 | L 6-14 Katherine Crocs |
| S1 W23 | kicking | 14 speed 3, strength 1, stamina 6, handling 2, kicking 2 | $75k | $25k | 1405 | 14 | 53.9 | L 0-8 Shellharbour Scorpions |
| S1 W24 | kicking | 16 speed 4, strength 1, stamina 4, handling 3, kicking 4 | $56k | -$19k | 1416 | 16 | 54.3 | D 6-6 Dubbo Diggers |
| S1 W25 final | kicking | 13 speed 2, stamina 3, handling 3, kicking 4, footyIQ 1 | $92k | $35k | 1485 | 13 | 54.4 | W 8-7 Redcliffe Reapers |
| S1 W26 final | kicking | 13 speed 2, stamina 4, handling 4, kicking 2, footyIQ 1 | $43k | -$49k | 1475 | 13 | 54.6 | W 6-4 Wagga Swagmen |
| S1 W27 final | kicking | 18 speed 3, strength 5, stamina 2, handling 3, kicking 4, footyIQ 1 | $134k | $91k | 1378 | 18 | 56.2 | L 0-4 Woolloomooloo Wolves |
| S2 trial 1 | kicking | 12 speed 6, stamina 1, handling 1, kicking 3, footyIQ 1 | $89k | -$45k | 1382 | 12 | 56.3 | W 12-0 Woolloomooloo Wolves |
| S2 trial 2 | kicking | 13 speed 5, strength 1, stamina 1, handling 2, kicking 3, footyIQ 1 | $91k | $1.6k | 1203 | 13 | 56.4 | L 0-1 Dubbo Diggers |
| S2 W1 | kicking | 13 speed 5, stamina 1, handling 3, kicking 1, footyIQ 3 | $123k | $32k | 1384 | 13 | 56.5 | W 16-0 Launceston Larrikins |
| S2 W2 | kicking | 14 speed 2, strength 2, stamina 1, handling 3, kicking 2, footyIQ 4 | $45k | -$78k | 1296 | 14 | 56.7 | W 16-4 Darwin Drovers |
| S2 W3 | kicking | 10 speed 2, strength 1, stamina 2, handling 2, kicking 1, footyIQ 2 | $87k | $42k | 1218 | 10 | 56.8 | W 19-8 Southport Stingrays |
| S2 W4 | kicking | 12 speed 2, strength 1, stamina 1, handling 2, kicking 2, footyIQ 4 | $89k | $1.6k | 1214 | 12 | 56.9 | L 0-10 Broken Hill Brollys |
| S2 W5 | kicking | 16 speed 5, strength 2, stamina 1, handling 2, kicking 1, footyIQ 5 | $96k | $7.5k | 1385 | 16 | 57.7 | W 7-6 Geelong Gulls |
| S2 W6 | kicking | 10 speed 4, strength 2, handling 1, footyIQ 3 | $75k | -$22k | 1427 | 10 | 58.2 | W 4-0 Wagga Swagmen |
| S2 W7 | kicking | 18 speed 3, strength 4, stamina 1, handling 3, footyIQ 7 | $99k | $25k | 1477 | 18 | 58.7 | W 20-6 Katherine Crocs |
| S2 W8 | kicking | 10 speed 2, strength 2, stamina 1, handling 1, footyIQ 4 | $101k | $1.6k | 1361 | 10 | 58.8 | W 10-8 Shellharbour Scorpions |
| S2 W9 | kicking | 12 speed 3, strength 3, handling 2, footyIQ 4 | $85k | -$16k | 1185 | 12 | 58.9 | L 0-16 Dubbo Diggers |
| S2 W10 | kicking | 14 speed 4, strength 2, stamina 1, handling 1, footyIQ 6 | $86k | $1.6k | 1445 | 14 | 59.0 | W 18-7 Mackay Marlins |
| S2 W11 | kicking | 16 speed 5, strength 3, stamina 2, handling 1, footyIQ 5 | $124k | $38k | 1321 | 16 | 59.2 | W 8-6 Ballarat Bushrangers |
| S2 W12 | kicking | 13 speed 2, strength 3, handling 3, footyIQ 5 | $51k | -$73k | 1309 | 13 | 59.3 | L 6-8 Cairns Cyclones |
| S2 W13 | kicking | 12 speed 4, strength 1, stamina 1, handling 1, footyIQ 5 | $85k | $35k | 1364 | 12 | 59.4 | L 4-6 Toowoomba Thunder |
| S2 W14 | kicking | 14 speed 1, strength 3, stamina 1, handling 4, footyIQ 5 | $60k | -$26k | 1403 | 14 | 60.1 | W 6-0 Woolloomooloo Wolves |
| S2 W15 | kicking | 16 speed 5, strength 3, stamina 1, handling 3, footyIQ 4 | $96k | $36k | 1322 | 16 | 60.2 | L 0-17 Redcliffe Reapers |
| S2 W16 | kicking | 12 speed 4, strength 2, handling 3, footyIQ 3 | $75k | -$21k | 1494 | 12 | 60.6 | L 8-12 Launceston Larrikins |
| S2 W17 | kicking | 15 speed 2, strength 3, stamina 1, handling 6, footyIQ 3 | $105k | $30k | 1544 | 18 | 60.7 | W 18-4 Darwin Drovers |
| S2 W18 | kicking | 12 speed 3, strength 2, handling 1, kicking 1, footyIQ 5 | $46k | -$58k | 1494 | 13 | 60.8 | W 11-10 Southport Stingrays |
| S2 W19 | kicking | 13 speed 3, strength 2, stamina 2, handling 3, footyIQ 3 | $90k | $44k | 1672 | 15 | 60.9 | W 35-6 Broken Hill Brollys |
| S2 W20 | kicking | 14 speed 3, strength 3, stamina 2, handling 1, kicking 1, footyIQ 4 | $92k | $1.8k | 1642 | 18 | 61.0 | W 26-6 Geelong Gulls |
| S2 W21 | kicking | 16 speed 4, stamina 1, handling 4, footyIQ 7 | $136k | $44k | 1570 | 18 | 61.1 | W 20-7 Wagga Swagmen |
| S2 W22 | kicking | 12 speed 3, stamina 3, handling 1, kicking 1, footyIQ 4 | $48k | -$88k | 1580 | 13 | 61.2 | W 16-15 Katherine Crocs |
| S2 W23 | kicking | 12 speed 3, strength 1, stamina 1, handling 4, footyIQ 3 | $91k | $44k | 1555 | 16 | 61.3 | W 10-4 Shellharbour Scorpions |
| S2 W24 | kicking | 14 speed 3, strength 2, stamina 3, handling 2, footyIQ 4 | $94k | $2.8k | 1497 | 16 | 61.4 | W 8-0 Dubbo Diggers |
| S2 W25 final | kicking | 14 speed 3, stamina 2, handling 3, kicking 1, footyIQ 5 | $139k | $45k | 1541 | 16 | 61.5 | W 11-7 Redcliffe Reapers |
| S2 W26 final | kicking | 14 speed 5, stamina 2, handling 3, footyIQ 4 | $184k | $45k | 1577 | 16 | 61.6 | W 14-4 Toowoomba Thunder |
| S2 W27 final | kicking | 10 speed 5, stamina 2, handling 1, kicking 1, footyIQ 1 | $264k | $80k | 1243 | 11 | 65.2 | W 11-10 Woolloomooloo Wolves |
| S3 trial 1 | kicking | 12 speed 4, strength 1, stamina 2, handling 4, footyIQ 1 | $104k | -$160k | 1254 | 13 | 65.8 | W 10-4 Darwin Drovers |
| S3 trial 2 | kicking | 7 speed 1, strength 1, stamina 1, handling 2, kicking 1, footyIQ 1 | $117k | $13k | 1232 | 12 | 65.9 | L 6-7 Woolloomooloo Wolves |
| S3 W1 | kicking | 9 speed 3, stamina 2, handling 3, footyIQ 1 | $163k | $46k | 1342 | 13 | 66.0 | W 6-4 Launceston Larrikins |
| S3 W2 | kicking | 11 speed 2, strength 2, stamina 4, handling 1, footyIQ 2 | $46k | -$116k | 1480 | 15 | 66.1 | W 18-6 Darwin Drovers |
| S3 W3 | kicking | 10 speed 2, strength 1, stamina 2, handling 1, kicking 2, footyIQ 2 | $112k | $66k | 1330 | 15 | 66.3 | W 10-4 Southport Stingrays |
| S3 W4 | kicking | 7 speed 3, handling 2, footyIQ 2 | $115k | $3.6k | 1348 | 11 | 66.4 | W 10-0 Broken Hill Brollys |
| S3 W5 | kicking | 8 speed 2, handling 1, footyIQ 5 | $145k | $30k | 1206 | 12 | 67.2 | L 0-4 Geelong Gulls |
| S3 W6 | kicking | 8 speed 3, strength 2, kicking 1, footyIQ 2 | $115k | -$30k | 1334 | 12 | 67.9 | D 13-13 Wagga Swagmen |
| S3 W7 | kicking | 12 speed 5, strength 2, handling 1, kicking 1, footyIQ 3 | $183k | $68k | 1338 | 16 | 68.1 | W 19-6 Katherine Crocs |
| S3 W8 | kicking | 9 speed 4, strength 2, footyIQ 3 | $187k | $3.6k | 1366 | 13 | 68.2 | W 10-0 Shellharbour Scorpions |
| S3 W9 | kicking | 8 speed 2, strength 1, kicking 1, footyIQ 4 | $254k | $68k | 1297 | 13 | 68.2 | L 6-10 Dubbo Diggers |
| S3 W10 | kicking | 8 speed 1, strength 2, handling 2, footyIQ 3 | $77k | -$177k | 1293 | 14 | 68.3 | L 10-12 Mackay Marlins |
| S3 W11 | kicking | 6 speed 2, strength 1, footyIQ 3 | $139k | $62k | 1435 | 10 | 68.4 | W 16-4 Ballarat Bushrangers |
| S3 W12 | kicking | 9 speed 2, strength 1, kicking 2, footyIQ 4 | $141k | $2.7k | 1395 | 14 | 68.5 | W 19-12 Cairns Cyclones |
| S3 W13 | kicking | 10 speed 2, strength 1, handling 1, kicking 1, footyIQ 5 | $196k | $54k | 1436 | 16 | 68.6 | W 25-4 Toowoomba Thunder |
| S3 W14 | kicking | 10 speed 2, strength 3, handling 1, footyIQ 4 | $198k | $2.7k | 1432 | 17 | 68.7 | W 22-10 Woolloomooloo Wolves |
| S3 W15 | kicking | 8 speed 2, strength 2, kicking 1, footyIQ 3 | $268k | $70k | 1441 | 13 | 68.8 | W 14-12 Redcliffe Reapers |
| S3 W16 | kicking | 7 speed 2, strength 1, handling 1, kicking 1, footyIQ 2 | $271k | $2.7k | 1307 | 12 | 68.9 | L 6-12 Launceston Larrikins |
| S3 W17 | kicking | 7 speed 2, strength 2, footyIQ 3 | $327k | $56k | 1413 | 14 | 69.0 | W 12-4 Darwin Drovers |
| S3 W18 | kicking | 11 speed 3, strength 3, handling 1, kicking 1, footyIQ 3 | $330k | $2.7k | 1470 | 16 | 69.1 | W 31-0 Southport Stingrays |
| S3 W19 | kicking | 8 speed 1, strength 3, handling 1, footyIQ 3 | $388k | $58k | 1450 | 12 | 69.2 | W 22-4 Broken Hill Brollys |
| S3 W20 | kicking | 7 speed 1, strength 4, footyIQ 2 | $392k | $3.3k | 1359 | 14 | 69.3 | W 12-0 Geelong Gulls |
| S3 W21 | kicking | 11 speed 2, strength 3, stamina 1, handling 1, kicking 2, footyIQ 2 | $451k | $59k | 1514 | 17 | 69.4 | W 28-0 Wagga Swagmen |
| S3 W22 | kicking | 11 speed 3, strength 3, stamina 1, handling 2, footyIQ 2 | $454k | $2.8k | 1310 | 16 | 69.5 | L 6-16 Katherine Crocs |
| S3 W23 | kicking | 7 speed 1, strength 3, handling 1, footyIQ 2 | $526k | $72k | 1388 | 13 | 69.6 | W 11-4 Shellharbour Scorpions |
| S3 W24 | kicking | 9 speed 1, strength 1, stamina 2, handling 1, kicking 1, footyIQ 3 | $529k | $2.8k | 1506 | 14 | 69.7 | W 27-0 Dubbo Diggers |
| S3 W25 final | kicking | 9 speed 1, strength 2, stamina 1, handling 2, kicking 1, footyIQ 2 | $379k | -$150k | 1405 | 13 | 69.8 | W 11-0 Toowoomba Thunder |
| S3 W26 final | kicking | 7 speed 1, strength 3, stamina 1, handling 1, footyIQ 1 | $468k | $90k | 1392 | 13 | 69.9 | W 10-7 Mackay Marlins |
| S3 W27 final | kicking | 5 speed 1, strength 2, footyIQ 2 | $648k | $180k | 1134 | 11 | 85.5 | L 14-16 Redcliffe Reapers |
| S4 trial 1 | kicking | 5 speed 1, strength 1, stamina 2, handling 1 | $645k | -$3.4k | 1219 | 9 | 74.9 | W 19-4 Woolloomooloo Wolves |
| S4 trial 2 | kicking | 9 speed 2, strength 2, stamina 2, handling 2, footyIQ 1 | $648k | $3.1k | 1301 | 14 | 75.1 | W 16-6 Shellharbour Scorpions |
| S4 W1 | kicking | 10 speed 1, strength 4, stamina 2, handling 1, kicking 1, footyIQ 1 | $706k | $59k | 1279 | 15 | 75.3 | W 7-0 Launceston Larrikins |
| S4 W2 | kicking | 9 speed 2, strength 3, stamina 2, handling 1, footyIQ 1 | $709k | $3.1k | 1322 | 11 | 75.5 | W 8-0 Darwin Drovers |
| S4 W3 | kicking | 9 speed 2, strength 3, stamina 2, handling 1, kicking 1 | $774k | $64k | 1256 | 13 | 75.6 | D 6-6 Southport Stingrays |
| S4 W4 | kicking | 6 speed 1, strength 1, stamina 2, handling 1, footyIQ 1 | $777k | $3.1k | 1338 | 11 | 75.8 | W 17-11 Broken Hill Brollys |
| S4 W5 | kicking | 11 speed 2, strength 4, stamina 2, handling 2, footyIQ 1 | $844k | $67k | 1245 | 15 | 76.0 | L 12-14 Geelong Gulls |
| S4 W6 | kicking | 8 speed 1, strength 3, stamina 2, kicking 1, footyIQ 1 | $847k | $3.1k | 1226 | 12 | 76.1 | D 0-0 Wagga Swagmen |
| S4 W7 | kicking | 9 speed 1, strength 4, stamina 2, handling 2 | $920k | $73k | 1285 | 15 | 76.3 | L 11-12 Katherine Crocs |
| S4 W8 | kicking | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | $925k | $5.1k | 1349 | 10 | 76.4 | W 25-4 Shellharbour Scorpions |
| S4 W9 | kicking | 8 speed 1, strength 3, stamina 2, handling 1, footyIQ 1 | $983k | $59k | 1269 | 14 | 76.5 | L 10-11 Dubbo Diggers |
| S4 W10 | kicking | 9 speed 1, strength 5, stamina 1, kicking 1, footyIQ 1 | $986k | $3.1k | 1338 | 14 | 76.7 | W 18-7 Mackay Marlins |
| S4 W11 | kicking | 7 speed 1, strength 3, stamina 2, handling 1 | $1045k | $59k | 1193 | 12 | 76.8 | L 0-4 Ballarat Bushrangers |
| S4 W12 | kicking | 6 strength 3, footyIQ 3 | $1048k | $3.1k | 1354 | 12 | 77.0 | W 28-4 Cairns Cyclones |
| S4 W13 | kicking | 7 speed 1, strength 2, stamina 1, kicking 1, footyIQ 2 | $1121k | $73k | 1253 | 12 | 77.1 | W 12-10 Toowoomba Thunder |
| S4 W14 | kicking | 8 speed 1, strength 5, handling 1, footyIQ 1 | $1124k | $3.1k | 1219 | 12 | 77.3 | W 1-0 Woolloomooloo Wolves |
| S4 W15 | kicking | 8 speed 1, strength 3, stamina 1, kicking 1, footyIQ 2 | $1205k | $81k | 1286 | 15 | 77.4 | W 10-8 Redcliffe Reapers |
| S4 W16 | kicking | 8 speed 1, strength 3, handling 1, footyIQ 3 | $1208k | $3.2k | 1358 | 14 | 77.6 | W 37-4 Launceston Larrikins |
| S4 W17 | kicking | 7 speed 1, strength 2, stamina 1, kicking 1, footyIQ 2 | $1281k | $73k | 1356 | 13 | 77.7 | W 16-4 Darwin Drovers |
| S4 W18 | kicking | 8 speed 2, strength 4, handling 1, footyIQ 1 | $1284k | $3.2k | 1378 | 16 | 77.8 | W 30-4 Southport Stingrays |
| S4 W19 | kicking | 5 speed 1, strength 2, kicking 1, footyIQ 1 | $1358k | $73k | 1359 | 13 | 77.9 | W 26-0 Broken Hill Brollys |
| S4 W20 | kicking | 6 speed 2, strength 2, stamina 1, handling 1 | $1361k | $3.2k | 1361 | 12 | 78.1 | W 24-2 Geelong Gulls |
| S4 W21 | kicking | 3 strength 3 | $1447k | $86k | 1251 | 10 | 78.1 | L 10-11 Wagga Swagmen |
| S4 W22 | kicking | 6 speed 1, strength 2, stamina 1, kicking 1, footyIQ 1 | $1450k | $3.2k | 1196 | 12 | 78.2 | L 6-20 Katherine Crocs |
| S4 W23 | kicking | 7 speed 2, strength 4, handling 1 | $1517k | $66k | 1305 | 16 | 78.4 | W 17-4 Shellharbour Scorpions |
| S4 W24 | kicking | 5 speed 1, strength 1, stamina 1, kicking 1, footyIQ 1 | $1520k | $3.2k | 1181 | 11 | 78.5 | L 0-10 Dubbo Diggers |
| S4 W25 final | kicking | 7 speed 2, strength 4, handling 1 | $1605k | $85k | 1339 | 12 | 78.6 | W 19-4 Katherine Crocs |
| S4 W26 final | kicking | 6 speed 1, strength 3, kicking 1, footyIQ 1 | $1690k | $85k | 1225 | 14 | 78.7 | L 6-12 Redcliffe Reapers |
| S4 W27 final | kicking | 0 | $1733k | $43k | 116 | 1 | 91.5 | no match |
| S5 trial 1 | kicking | 5 speed 1, strength 3 | $1713k | -$20k | 1056 | 9 | 73.6 | W 10-6 Wagga Swagmen |
| S5 trial 2 | kicking | 7 speed 3, strength 1, handling 1, kicking 1, footyIQ 1 | $1731k | $18k | 1237 | 12 | 73.8 | W 14-0 Shellharbour Scorpions |
| S5 W1 | kicking | 9 speed 4, strength 1, stamina 1, handling 1, kicking 2 | $1794k | $63k | 1195 | 12 | 73.9 | W 8-0 Launceston Larrikins |
| S5 W2 | kicking | 7 speed 3, strength 1, handling 2, footyIQ 1 | $1797k | $3.4k | 1232 | 12 | 74.1 | W 19-0 Darwin Drovers |
| S5 W3 | kicking | 9 speed 4, strength 1, stamina 1, handling 1, kicking 2 | $1879k | $82k | 1225 | 15 | 74.2 | W 16-10 Southport Stingrays |
| S5 W4 | kicking | 3 stamina 1, kicking 1, footyIQ 1 | $1882k | $3.4k | 1127 | 7 | 74.3 | L 0-16 Broken Hill Brollys |
| S5 W5 | kicking | 8 speed 4, strength 1, stamina 1, handling 2 | $1951k | $69k | 1135 | 11 | 74.4 | L 4-8 Geelong Gulls |
| S5 W6 | kicking | 8 speed 3, strength 1, handling 1, kicking 2, footyIQ 1 | $1954k | $3.6k | 1217 | 13 | 74.6 | W 15-0 Wagga Swagmen |
| S5 W7 | kicking | 8 speed 4, strength 1, stamina 1, handling 1, kicking 1 | $2020k | $66k | 1285 | 13 | 74.8 | W 26-10 Katherine Crocs |
| S5 W8 | kicking | 10 speed 4, strength 1, stamina 1, handling 1, kicking 2, footyIQ 1 | $2024k | $3.7k | 1250 | 15 | 74.9 | W 24-0 Shellharbour Scorpions |
| S5 W9 | kicking | 7 speed 3, stamina 1, handling 2, footyIQ 1 | $2091k | $67k | 1195 | 12 | 75.1 | W 12-10 Dubbo Diggers |
| S5 W10 | kicking | 8 speed 4, strength 1, handling 1, kicking 2 | $2100k | $8.7k | 1239 | 12 | 75.2 | W 20-12 Mackay Marlins |
| S5 W11 | kicking | 8 speed 4, strength 1, stamina 1, handling 1, kicking 1 | $2179k | $79k | 1144 | 12 | 75.4 | L 4-6 Ballarat Bushrangers |
| S5 W12 | kicking | 5 speed 1, strength 1, stamina 1, handling 1, kicking 1 | $2183k | $3.7k | 1205 | 9 | 75.5 | W 14-13 Cairns Cyclones |
| S5 W13 | kicking | 7 speed 4, stamina 1, handling 1, kicking 1 | $2270k | $87k | 1127 | 12 | 75.6 | L 0-1 Toowoomba Thunder |
| S5 W14 | kicking | 8 speed 4, strength 1, handling 2, kicking 1 | $2273k | $3.4k | 1220 | 12 | 75.8 | W 12-0 Woolloomooloo Wolves |
| S5 W15 | kicking | 8 speed 4, stamina 1, handling 1, kicking 2 | $2353k | $80k | 1269 | 13 | 75.9 | W 21-0 Redcliffe Reapers |
| S5 W16 | kicking | 7 speed 4, stamina 1, handling 1, kicking 1 | $2356k | $3.4k | 1217 | 13 | 76.1 | W 14-12 Launceston Larrikins |
| S5 W17 | kicking | 6 speed 3, stamina 1, handling 1, kicking 1 | $2429k | $73k | 1223 | 13 | 76.2 | W 20-6 Darwin Drovers |
| S5 W18 | kicking | 6 speed 3, handling 2, kicking 1 | $2433k | $3.4k | 1210 | 12 | 76.3 | W 16-6 Southport Stingrays |
| S5 W19 | kicking | 6 speed 3, stamina 1, kicking 2 | $2526k | $93k | 1244 | 12 | 76.4 | W 25-4 Broken Hill Brollys |
| S5 W20 | kicking | 7 speed 3, stamina 1, handling 2, kicking 1 | $2529k | $3.4k | 1195 | 14 | 76.5 | W 12-0 Geelong Gulls |
| S5 W21 | kicking | 2 stamina 1, handling 1 | $2626k | $97k | 1262 | 10 | 76.6 | W 22-0 Wagga Swagmen |
| S5 W22 | kicking | 6 speed 3, handling 1, kicking 2 | $2631k | $4.2k | 1232 | 12 | 76.7 | W 16-10 Katherine Crocs |
| S5 W23 | kicking | 6 speed 3, stamina 1, handling 1, kicking 1 | $2729k | $98k | 1202 | 11 | 76.8 | W 12-0 Shellharbour Scorpions |
| S5 W24 | kicking | 7 speed 3, stamina 1, handling 1, kicking 2 | $2735k | $6.6k | 1225 | 14 | 76.9 | W 16-12 Dubbo Diggers |
| S5 W25 final | kicking | 6 speed 3, stamina 1, handling 2 | $2498k | -$237k | 1195 | 13 | 77.1 | W 12-6 Cairns Cyclones |
| S5 W26 final | kicking | 6 speed 3, handling 1, kicking 2 | $2621k | $123k | 1250 | 13 | 77.2 | W 18-8 Wagga Swagmen |
| S5 W27 final | kicking | 0 | $2899k | $278k | 660 | 7 | 92.6 | W 18-0 Southport Stingrays |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $56k | -$4.0k | 726 | 1.75 | 49.5 | 55.5 | 0.0% | 70.0% |
| S1 trial 2 | 20 | $54k | -$2.5k | 735 | 5.95 | 49.5 | 55.6 | 0.0% | 55.0% |
| S1 W1 | 20 | $71k | $18k | 758 | 7.20 | 49.6 | 55.7 | 0.0% | 80.0% |
| S1 W2 | 20 | $48k | -$23k | 784 | 6.25 | 49.6 | 55.8 | 0.0% | 45.0% |
| S1 W3 | 20 | $80k | $31k | 792 | 5.85 | 49.7 | 55.9 | 0.0% | 60.0% |
| S1 W4 | 20 | $51k | -$28k | 839 | 10.55 | 49.9 | 56.2 | 0.0% | 35.0% |
| S1 W5 | 20 | $76k | $25k | 870 | 8.30 | 49.9 | 56.4 | 0.0% | 50.0% |
| S1 W6 | 20 | $48k | -$29k | 922 | 7.75 | 50.1 | 56.8 | 0.0% | 60.0% |
| S1 W7 | 20 | $78k | $30k | 947 | 10.60 | 50.2 | 57.0 | 0.0% | 65.0% |
| S1 W8 | 20 | $54k | -$25k | 967 | 7.85 | 50.3 | 57.2 | 0.0% | 65.0% |
| S1 W9 | 20 | $80k | $26k | 979 | 11.90 | 50.4 | 57.4 | 0.0% | 55.0% |
| S1 W10 | 20 | $51k | -$28k | 1010 | 8.80 | 50.6 | 57.8 | 0.0% | 65.0% |
| S1 W11 | 20 | $80k | $29k | 1008 | 10.95 | 50.7 | 58.0 | 0.0% | 60.0% |
| S1 W12 | 20 | $49k | -$32k | 1025 | 9.10 | 50.8 | 58.2 | 0.0% | 65.0% |
| S1 W13 | 20 | $83k | $35k | 1024 | 12.75 | 50.9 | 58.4 | 0.0% | 50.0% |
| S1 W14 | 20 | $51k | -$33k | 1021 | 8.10 | 51.1 | 58.7 | 0.0% | 45.0% |
| S1 W15 | 20 | $85k | $35k | 1024 | 10.05 | 51.1 | 58.9 | 0.0% | 70.0% |
| S1 W16 | 20 | $51k | -$35k | 1034 | 10.00 | 51.3 | 59.3 | 0.0% | 70.0% |
| S1 W17 | 20 | $83k | $32k | 1020 | 9.30 | 51.4 | 59.5 | 0.0% | 45.0% |
| S1 W18 | 20 | $51k | -$32k | 1050 | 11.15 | 51.7 | 60.2 | 0.0% | 70.0% |
| S1 W19 | 20 | $82k | $31k | 1042 | 9.55 | 51.8 | 60.4 | 0.0% | 55.0% |
| S1 W20 | 20 | $52k | -$29k | 1085 | 11.75 | 52.1 | 61.1 | 0.0% | 70.0% |
| S1 W21 | 20 | $84k | $32k | 1115 | 11.10 | 52.2 | 61.3 | 0.0% | 85.0% |
| S1 W22 | 20 | $54k | -$30k | 1070 | 11.70 | 52.7 | 62.3 | 0.0% | 55.0% |
| S1 W23 | 20 | $86k | $32k | 1079 | 9.40 | 52.7 | 62.5 | 0.0% | 55.0% |
| S1 W24 | 20 | $58k | -$28k | 1119 | 10.60 | 53.1 | 63.3 | 0.0% | 75.0% |
| S1 W25 final | 20 | $87k | $29k | 1024 | 9.45 | 53.2 | 63.6 | 0.0% | 61.1% |
| S1 W26 final | 20 | $71k | -$15k | 780 | 6.90 | 53.4 | 64.0 | 0.0% | 63.6% |
| S1 W27 final | 20 | $144k | $73k | 562 | 8.15 | 55.5 | 63.6 | 0.0% | 71.4% |
| S2 trial 1 | 20 | $97k | -$47k | 1063 | 9.50 | 55.7 | 64.2 | 0.0% | 75.0% |
| S2 trial 2 | 20 | $72k | -$25k | 1043 | 9.90 | 55.9 | 64.5 | 0.0% | 70.0% |
| S2 W1 | 20 | $102k | $30k | 1029 | 10.25 | 56.0 | 64.8 | 0.0% | 50.0% |
| S2 W2 | 20 | $60k | -$41k | 1020 | 10.35 | 56.1 | 65.1 | 0.0% | 40.0% |
| S2 W3 | 20 | $96k | $36k | 1045 | 9.60 | 56.2 | 65.3 | 0.0% | 60.0% |
| S2 W4 | 20 | $80k | -$15k | 1051 | 11.10 | 56.3 | 65.5 | 0.0% | 65.0% |
| S2 W5 | 20 | $99k | $18k | 1079 | 11.00 | 57.0 | 66.9 | 0.0% | 70.0% |
| S2 W6 | 20 | $58k | -$41k | 1099 | 9.85 | 57.4 | 67.8 | 0.0% | 55.0% |
| S2 W7 | 20 | $93k | $35k | 1082 | 11.50 | 57.6 | 68.1 | 0.0% | 45.0% |
| S2 W8 | 20 | $82k | -$10k | 1123 | 9.70 | 57.9 | 68.8 | 0.0% | 70.0% |
| S2 W9 | 20 | $100k | $18k | 1123 | 11.45 | 58.3 | 69.6 | 0.0% | 75.0% |
| S2 W10 | 20 | $70k | -$30k | 1117 | 10.55 | 58.8 | 70.5 | 0.0% | 60.0% |
| S2 W11 | 20 | $104k | $35k | 1125 | 12.25 | 58.9 | 70.8 | 0.0% | 75.0% |
| S2 W12 | 20 | $74k | -$30k | 1130 | 10.25 | 59.1 | 71.2 | 0.0% | 50.0% |
| S2 W13 | 20 | $104k | $30k | 1124 | 11.55 | 59.4 | 71.8 | 0.0% | 45.0% |
| S2 W14 | 20 | $71k | -$33k | 1136 | 10.50 | 59.7 | 72.3 | 0.0% | 65.0% |
| S2 W15 | 20 | $112k | $41k | 1137 | 11.75 | 59.8 | 72.5 | 0.0% | 55.0% |
| S2 W16 | 20 | $69k | -$43k | 1160 | 11.50 | 60.0 | 72.8 | 0.0% | 65.0% |
| S2 W17 | 20 | $101k | $32k | 1164 | 11.70 | 60.1 | 73.1 | 0.0% | 50.0% |
| S2 W18 | 20 | $84k | -$17k | 1177 | 11.45 | 60.4 | 73.6 | 0.0% | 75.0% |
| S2 W19 | 20 | $123k | $39k | 1183 | 12.10 | 60.5 | 73.8 | 0.0% | 80.0% |
| S2 W20 | 20 | $91k | -$32k | 1177 | 11.45 | 60.6 | 74.0 | 0.0% | 75.0% |
| S2 W21 | 20 | $120k | $29k | 1161 | 11.60 | 60.8 | 74.4 | 0.0% | 75.0% |
| S2 W22 | 20 | $89k | -$30k | 1153 | 10.75 | 60.9 | 74.6 | 0.0% | 55.0% |
| S2 W23 | 20 | $126k | $37k | 1160 | 11.40 | 60.9 | 74.8 | 0.0% | 50.0% |
| S2 W24 | 20 | $90k | -$35k | 1185 | 12.90 | 61.0 | 74.9 | 0.0% | 90.0% |
| S2 W25 final | 20 | $120k | $30k | 1112 | 11.15 | 61.1 | 75.1 | 0.0% | 88.9% |
| S2 W26 final | 20 | $123k | $2.9k | 1048 | 10.35 | 61.2 | 75.3 | 0.0% | 81.3% |
| S2 W27 final | 20 | $220k | $97k | 688 | 6.70 | 66.4 | 75.2 | 0.0% | 76.9% |
| S3 trial 1 | 20 | $95k | -$125k | 1010 | 9.75 | 66.4 | 76.1 | 0.0% | 50.0% |
| S3 trial 2 | 20 | $87k | -$8.2k | 1016 | 9.50 | 66.4 | 76.3 | 0.0% | 65.0% |
| S3 W1 | 20 | $129k | $42k | 1034 | 10.35 | 66.6 | 76.5 | 0.0% | 80.0% |
| S3 W2 | 20 | $111k | -$17k | 1031 | 11.00 | 66.8 | 76.8 | 0.0% | 50.0% |
| S3 W3 | 20 | $156k | $45k | 1031 | 9.85 | 66.9 | 77.0 | 0.0% | 60.0% |
| S3 W4 | 20 | $108k | -$49k | 1030 | 10.30 | 66.9 | 77.2 | 0.0% | 55.0% |
| S3 W5 | 20 | $139k | $32k | 1047 | 10.00 | 67.2 | 77.6 | 0.0% | 70.0% |
| S3 W6 | 20 | $116k | -$23k | 1074 | 10.55 | 67.5 | 78.0 | 0.0% | 55.0% |
| S3 W7 | 20 | $153k | $37k | 1056 | 11.55 | 67.6 | 78.2 | 0.0% | 55.0% |
| S3 W8 | 20 | $131k | -$22k | 1067 | 10.35 | 67.8 | 78.4 | 0.0% | 75.0% |
| S3 W9 | 20 | $176k | $44k | 1068 | 10.20 | 68.0 | 78.8 | 0.0% | 60.0% |
| S3 W10 | 20 | $137k | -$39k | 1107 | 11.25 | 68.2 | 79.0 | 0.0% | 70.0% |
| S3 W11 | 20 | $185k | $49k | 1118 | 10.70 | 68.2 | 79.2 | 0.0% | 75.0% |
| S3 W12 | 20 | $149k | -$36k | 1122 | 11.20 | 68.3 | 79.4 | 0.0% | 65.0% |
| S3 W13 | 20 | $202k | $53k | 1094 | 10.60 | 68.4 | 79.6 | 0.0% | 55.0% |
| S3 W14 | 20 | $190k | -$13k | 1093 | 10.70 | 68.5 | 79.7 | 0.0% | 55.0% |
| S3 W15 | 20 | $248k | $59k | 1119 | 11.65 | 68.6 | 79.9 | 0.0% | 70.0% |
| S3 W16 | 20 | $221k | -$27k | 1119 | 11.50 | 68.7 | 80.1 | 0.0% | 80.0% |
| S3 W17 | 20 | $276k | $55k | 1132 | 11.30 | 68.8 | 80.3 | 0.0% | 85.0% |
| S3 W18 | 20 | $228k | -$48k | 1120 | 10.70 | 68.9 | 80.4 | 0.0% | 70.0% |
| S3 W19 | 20 | $284k | $57k | 1101 | 11.15 | 69.0 | 80.6 | 0.0% | 65.0% |
| S3 W20 | 20 | $262k | -$23k | 1099 | 11.00 | 69.1 | 80.7 | 0.0% | 60.0% |
| S3 W21 | 20 | $318k | $56k | 1110 | 10.85 | 69.2 | 80.9 | 0.0% | 80.0% |
| S3 W22 | 20 | $309k | -$9.1k | 1103 | 12.10 | 69.3 | 81.1 | 0.0% | 55.0% |
| S3 W23 | 20 | $364k | $56k | 1110 | 10.75 | 69.4 | 81.2 | 0.0% | 60.0% |
| S3 W24 | 20 | $352k | -$13k | 1120 | 11.10 | 69.5 | 81.4 | 0.0% | 60.0% |
| S3 W25 final | 20 | $342k | -$9.6k | 1085 | 10.50 | 69.5 | 81.5 | 0.0% | 63.2% |
| S3 W26 final | 20 | $336k | -$6.6k | 809 | 8.25 | 69.6 | 81.6 | 0.0% | 75.0% |
| S3 W27 final | 20 | $424k | $88k | 492 | 4.75 | 81.8 | 81.8 | 0.0% | 33.3% |
| S4 trial 1 | 19 | $364k | -$67k | 1028 | 8.63 | 76.2 | 82.6 | 0.0% | 78.9% |
| S4 trial 2 | 19 | $373k | $9.4k | 1078 | 10.53 | 76.1 | 82.7 | 0.0% | 78.9% |
| S4 W1 | 19 | $426k | $53k | 1064 | 11.63 | 76.3 | 82.9 | 0.0% | 73.7% |
| S4 W2 | 19 | $429k | $3.1k | 1079 | 10.42 | 76.4 | 83.0 | 0.0% | 68.4% |
| S4 W3 | 19 | $490k | $61k | 1074 | 11.11 | 76.5 | 83.2 | 0.0% | 78.9% |
| S4 W4 | 19 | $487k | -$3.3k | 1064 | 9.16 | 76.6 | 83.3 | 0.0% | 68.4% |
| S4 W5 | 19 | $549k | $62k | 1054 | 11.16 | 76.5 | 83.5 | 0.0% | 68.4% |
| S4 W6 | 19 | $546k | -$3.4k | 1072 | 10.68 | 76.5 | 83.6 | 0.0% | 57.9% |
| S4 W7 | 19 | $612k | $66k | 1088 | 11.53 | 76.7 | 83.7 | 0.0% | 63.2% |
| S4 W8 | 19 | $602k | -$9.7k | 1067 | 9.79 | 76.7 | 83.8 | 0.0% | 52.6% |
| S4 W9 | 19 | $655k | $53k | 1114 | 11.68 | 76.7 | 84.0 | 0.0% | 78.9% |
| S4 W10 | 19 | $658k | $2.9k | 1078 | 10.47 | 76.8 | 84.1 | 0.0% | 78.9% |
| S4 W11 | 19 | $723k | $65k | 1082 | 11.11 | 76.9 | 84.2 | 0.0% | 73.7% |
| S4 W12 | 19 | $727k | $3.2k | 1075 | 9.89 | 76.8 | 84.4 | 0.0% | 63.2% |
| S4 W13 | 19 | $792k | $65k | 1089 | 11.26 | 77.0 | 84.5 | 0.0% | 63.2% |
| S4 W14 | 19 | $786k | -$6.0k | 1091 | 11.16 | 77.1 | 84.6 | 0.0% | 73.7% |
| S4 W15 | 19 | $854k | $68k | 1111 | 10.95 | 77.2 | 84.7 | 0.0% | 78.9% |
| S4 W16 | 19 | $844k | -$9.3k | 1089 | 11.37 | 77.3 | 84.8 | 0.0% | 68.4% |
| S4 W17 | 19 | $911k | $67k | 1092 | 10.84 | 77.4 | 85.0 | 0.0% | 68.4% |
| S4 W18 | 19 | $914k | $3.0k | 1099 | 11.32 | 77.4 | 85.1 | 0.0% | 63.2% |
| S4 W19 | 19 | $980k | $65k | 1080 | 10.05 | 77.3 | 85.2 | 0.0% | 57.9% |
| S4 W20 | 19 | $983k | $3.4k | 1102 | 11.63 | 77.4 | 85.3 | 0.0% | 94.7% |
| S4 W21 | 19 | $1050k | $67k | 1079 | 9.74 | 77.5 | 85.4 | 0.0% | 57.9% |
| S4 W22 | 19 | $1054k | $3.7k | 1093 | 10.95 | 77.6 | 85.5 | 0.0% | 57.9% |
| S4 W23 | 19 | $1119k | $65k | 1117 | 11.16 | 77.7 | 85.6 | 0.0% | 73.7% |
| S4 W24 | 19 | $1122k | $3.1k | 1103 | 11.53 | 77.8 | 85.7 | 0.0% | 73.7% |
| S4 W25 final | 19 | $1116k | -$5.7k | 1049 | 10.21 | 77.9 | 85.8 | 0.0% | 77.8% |
| S4 W26 final | 19 | $1180k | $64k | 900 | 9.79 | 78.0 | 85.9 | 0.0% | 71.4% |
| S4 W27 final | 19 | $1297k | $117k | 491 | 4.53 | 86.7 | 86.7 | 0.0% | 60.0% |
| S5 trial 1 | 19 | $1279k | -$18k | 982 | 7.58 | 74.5 | 85.0 | 0.0% | 84.2% |
| S5 trial 2 | 19 | $1289k | $9.6k | 1059 | 11.16 | 74.6 | 85.0 | 0.0% | 63.2% |
| S5 W1 | 19 | $1348k | $59k | 1061 | 11.11 | 74.8 | 85.2 | 0.0% | 57.9% |
| S5 W2 | 19 | $1352k | $3.3k | 1065 | 10.74 | 74.7 | 85.3 | 0.0% | 57.9% |
| S5 W3 | 19 | $1418k | $66k | 1068 | 11.05 | 74.7 | 85.4 | 0.0% | 84.2% |
| S5 W4 | 19 | $1421k | $3.6k | 1068 | 7.79 | 74.7 | 85.4 | 0.0% | 52.6% |
| S5 W5 | 19 | $1487k | $65k | 1095 | 11.26 | 74.8 | 85.5 | 0.0% | 73.7% |
| S5 W6 | 19 | $1491k | $3.6k | 1100 | 11.53 | 74.8 | 85.7 | 0.0% | 78.9% |
| S5 W7 | 19 | $1565k | $74k | 1099 | 11.53 | 74.9 | 85.7 | 0.0% | 73.7% |
| S5 W8 | 19 | $1568k | $3.9k | 1078 | 11.63 | 74.9 | 85.8 | 0.0% | 57.9% |
| S5 W9 | 19 | $1640k | $72k | 1094 | 10.68 | 74.9 | 85.9 | 0.0% | 63.2% |
| S5 W10 | 19 | $1644k | $3.8k | 1086 | 11.05 | 74.9 | 86.0 | 0.0% | 57.9% |
| S5 W11 | 19 | $1717k | $73k | 1099 | 10.89 | 74.8 | 86.1 | 0.0% | 78.9% |
| S5 W12 | 19 | $1721k | $3.8k | 1110 | 9.68 | 74.9 | 86.2 | 0.0% | 68.4% |
| S5 W13 | 19 | $1794k | $74k | 1077 | 10.84 | 74.9 | 86.3 | 0.0% | 47.4% |
| S5 W14 | 19 | $1798k | $3.9k | 1111 | 11.00 | 74.9 | 86.3 | 0.0% | 84.2% |
| S5 W15 | 19 | $1873k | $75k | 1117 | 11.47 | 75.0 | 86.4 | 0.0% | 73.7% |
| S5 W16 | 19 | $1877k | $3.4k | 1117 | 11.84 | 75.1 | 86.5 | 0.0% | 78.9% |
| S5 W17 | 19 | $1938k | $62k | 1098 | 11.37 | 75.2 | 86.5 | 0.0% | 52.6% |
| S5 W18 | 19 | $1941k | $3.3k | 1123 | 11.00 | 75.3 | 86.6 | 0.0% | 89.5% |
| S5 W19 | 19 | $2019k | $78k | 1107 | 11.16 | 75.4 | 86.7 | 0.0% | 78.9% |
| S5 W20 | 19 | $2023k | $3.4k | 1117 | 11.68 | 75.5 | 86.8 | 0.0% | 68.4% |
| S5 W21 | 19 | $2097k | $74k | 1128 | 9.47 | 75.6 | 86.8 | 0.0% | 84.2% |
| S5 W22 | 19 | $2101k | $3.6k | 1116 | 11.53 | 75.6 | 86.9 | 0.0% | 78.9% |
| S5 W23 | 19 | $2179k | $78k | 1107 | 11.21 | 75.6 | 87.0 | 0.0% | 73.7% |
| S5 W24 | 19 | $2182k | $3.7k | 1103 | 11.79 | 75.6 | 87.0 | 0.0% | 63.2% |
| S5 W25 final | 19 | $2174k | -$8.5k | 1100 | 10.79 | 75.7 | 87.1 | 0.0% | 78.9% |
| S5 W26 final | 19 | $2259k | $85k | 960 | 9.84 | 75.8 | 87.1 | 0.0% | 66.7% |
| S5 W27 final | 19 | $2392k | $133k | 418 | 3.84 | 88.4 | 88.4 | 0.0% | 80.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × slide | 16 | 68.8% | 2545 | 69.8% | -1.1% |  |
| expansive × compressed | 1237 | 70.9% | 1324 | 68.8% | 2.0% |  |
| expansive × slide | 28 | 67.9% | 2533 | 69.8% | -2.0% |  |
| grind × compressed | 39 | 65.4% | 2522 | 69.9% | -4.5% |  |
| grind × slide | 1219 | 69.0% | 1342 | 70.5% | -1.5% |  |
| kick-chase × rush | 16 | 68.8% | 2545 | 69.8% | -1.1% |  |
| kick-chase × slide | 6 | 58.3% | 2555 | 69.8% | -11.5% |  |
| block-play | 2263 | 69.9% | 298 | 69.1% | 0.8% |  |
| block-shift | 106 | 72.2% | 2455 | 69.7% | 2.5% |  |
| cut-out-winger | 106 | 72.2% | 2455 | 69.7% | 2.5% |  |
| inside-ball | 2269 | 69.9% | 292 | 69.3% | 0.5% |  |
| second-man | 106 | 72.2% | 2455 | 69.7% | 2.5% |  |
| short-side-raid | 2263 | 69.9% | 298 | 69.5% | 0.4% |  |

### min-maxer/hard/au

- 70 overall (best nine, including recruitment): 49.3 weeks; 20 reached, 0 censored.
- 80 overall (best nine, including recruitment): 88.1 weeks; 17 reached, 3 censored.
- 90 overall (best nine, including recruitment): 141.0 weeks; 2 reached, 18 censored.
- Opening players gaining a star: 195 of 400; median 21.0 weeks among those who did.
- Reaching potential stars: 143 of 400 (92 already there at week 0); median 43.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/349; S3 17/174; S5 59/96.
- Mean XP per completed season 27435; mean level-ups per completed season 269.1.
- Cash: opening 45000; mean weekly change 7780; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 88; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $435k after opening at $45k, and no career went into debt.
- WARNING: cash climbs by $7.8k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 52454 |
| gate | 535401 |
| prize | 44386 |
| boardGrant | 11182 |
| events | 2400 |
| transfers | -110459 |
| contracts | 0 |
| facilities | -309750 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | kicking | 0 | $53k | $7.5k | 502 | 0 | 45.0 | L 0-6 Dubbo Diggers |
| S1 trial 2 | kicking | 3 speed 1, strength 1, handling 1 | $46k | -$6.8k | 563 | 3 | 45.0 | W 7-1 Wagga Swagmen |
| S1 W1 | kicking | 5 strength 4, kicking 1 | $72k | $26k | 662 | 5 | 45.0 | W 23-6 Launceston Larrikins |
| S1 W2 | kicking | 7 speed 2, strength 2, handling 2, kicking 1 | $59k | -$13k | 657 | 7 | 45.1 | W 14-8 Darwin Drovers |
| S1 W3 | kicking | 6 strength 3, handling 3 | $73k | $14k | 666 | 6 | 45.1 | L 6-12 Southport Stingrays |
| S1 W4 | kicking | 10 speed 2, strength 6, handling 1, kicking 1 | $52k | -$21k | 702 | 10 | 45.2 | W 10-0 Broken Hill Brollys |
| S1 W5 | kicking | 6 speed 3, strength 1, handling 1, footyIQ 1 | $81k | $29k | 668 | 6 | 45.3 | L 0-1 Geelong Gulls |
| S1 W6 | kicking | 5 strength 3, handling 1, kicking 1 | $53k | -$29k | 756 | 5 | 45.3 | W 16-0 Wagga Swagmen |
| S1 W7 | kicking | 7 speed 2, strength 3, handling 1, kicking 1 | $80k | $28k | 767 | 7 | 45.4 | W 18-13 Katherine Crocs |
| S1 W8 | kicking | 8 speed 1, strength 4, handling 1, kicking 2 | $63k | -$17k | 833 | 8 | 45.4 | W 14-0 Shellharbour Scorpions |
| S1 W9 | kicking | 10 speed 1, strength 6, handling 2, kicking 1 | $94k | $30k | 789 | 10 | 45.5 | W 10-4 Dubbo Diggers |
| S1 W10 | kicking | 2 speed 1, kicking 1 | $62k | -$31k | 788 | 2 | 46.7 | L 0-10 Mackay Marlins |
| S1 W11 | kicking | 13 speed 5, strength 5, handling 3 | $93k | $30k | 801 | 13 | 46.8 | L 4-6 Ballarat Bushrangers |
| S1 W12 | kicking | 9 speed 1, strength 4, stamina 1, handling 2, kicking 1 | $49k | -$44k | 866 | 9 | 46.9 | W 12-8 Cairns Cyclones |
| S1 W13 | kicking | 6 strength 3, stamina 1, handling 1, kicking 1 | $82k | $33k | 797 | 6 | 46.9 | L 0-5 Toowoomba Thunder |
| S1 W14 | kicking | 9 speed 1, strength 5, handling 2, kicking 1 | $47k | -$35k | 920 | 9 | 47.0 | W 14-10 Woolloomooloo Wolves |
| S1 W15 | kicking | 9 speed 1, strength 3, stamina 1, handling 3, kicking 1 | $77k | $30k | 860 | 9 | 47.1 | D 8-8 Redcliffe Reapers |
| S1 W16 | kicking | 8 speed 2, strength 3, stamina 1, handling 2 | $53k | -$24k | 851 | 8 | 47.1 | W 16-7 Launceston Larrikins |
| S1 W17 | kicking | 8 speed 1, strength 4, handling 1, kicking 2 | $88k | $34k | 793 | 8 | 47.2 | D 10-10 Darwin Drovers |
| S1 W18 | kicking | 9 speed 1, strength 4, stamina 1, handling 2, kicking 1 | $49k | -$39k | 806 | 9 | 47.3 | L 4-8 Southport Stingrays |
| S1 W19 | kicking | 7 speed 1, strength 4, handling 2 | $76k | $28k | 838 | 7 | 47.3 | L 0-11 Broken Hill Brollys |
| S1 W20 | kicking | 8 strength 4, stamina 1, handling 2, kicking 1 | $48k | -$29k | 907 | 8 | 47.4 | D 0-0 Geelong Gulls |
| S1 W21 | kicking | 10 speed 1, strength 4, stamina 2, kicking 2, footyIQ 1 | $73k | $25k | 927 | 10 | 47.5 | W 11-0 Wagga Swagmen |
| S1 W22 | kicking | 11 speed 2, strength 4, stamina 1, handling 3, kicking 1 | $57k | -$16k | 937 | 11 | 48.0 | W 14-0 Katherine Crocs |
| S1 W23 | kicking | 10 strength 4, handling 4, kicking 1, footyIQ 1 | $83k | $26k | 968 | 10 | 48.1 | W 20-14 Shellharbour Scorpions |
| S1 W24 | kicking | 7 speed 1, strength 3, stamina 1, handling 1, kicking 1 | $45k | -$38k | 842 | 7 | 48.3 | L 4-12 Dubbo Diggers |
| S1 W25 final | kicking | 9 strength 3, stamina 1, handling 3, kicking 1, footyIQ 1 | $88k | $43k | 909 | 9 | 48.4 | W 19-0 Toowoomba Thunder |
| S1 W26 final | kicking | 6 strength 3, handling 3 | $70k | -$18k | 997 | 6 | 48.8 | L 10-12 Redcliffe Reapers |
| S1 W27 final | kicking | 9 speed 2, strength 3, handling 3, kicking 1 | $113k | $43k | 274 | 9 | 49.4 | no match |
| S2 trial 1 | kicking | 9 strength 4, handling 2, kicking 1, footyIQ 2 | $61k | -$53k | 927 | 9 | 49.5 | W 12-6 Southport Stingrays |
| S2 trial 2 | kicking | 7 strength 3, stamina 1, handling 1, kicking 1, footyIQ 1 | $69k | $8.7k | 891 | 7 | 49.5 | W 17-0 Geelong Gulls |
| S2 W1 | kicking | 7 speed 2, strength 2, stamina 1, handling 2 | $82k | $12k | 965 | 7 | 49.9 | D 6-6 Launceston Larrikins |
| S2 W2 | kicking | 13 speed 2, strength 3, stamina 3, handling 2, kicking 1, footyIQ 2 | $66k | -$16k | 947 | 13 | 50.3 | L 0-5 Darwin Drovers |
| S2 W3 | kicking | 8 speed 1, strength 2, stamina 2, handling 1, kicking 2 | $100k | $34k | 1018 | 8 | 50.3 | D 4-4 Southport Stingrays |
| S2 W4 | kicking | 11 speed 3, strength 2, stamina 2, handling 2, kicking 1, footyIQ 1 | $52k | -$49k | 1048 | 11 | 50.4 | L 12-17 Broken Hill Brollys |
| S2 W5 | kicking | 13 speed 1, strength 2, stamina 2, handling 3, kicking 3, footyIQ 2 | $79k | $28k | 1013 | 13 | 50.6 | L 0-10 Geelong Gulls |
| S2 W6 | kicking | 10 speed 3, strength 2, stamina 1, handling 2, kicking 2 | $52k | -$27k | 1075 | 10 | 51.5 | W 11-6 Wagga Swagmen |
| S2 W7 | kicking | 9 speed 1, strength 3, stamina 2, handling 1, kicking 1, footyIQ 1 | $83k | $31k | 1075 | 9 | 51.6 | W 6-4 Katherine Crocs |
| S2 W8 | kicking | 12 speed 2, strength 2, stamina 2, handling 2, kicking 3, footyIQ 1 | $62k | -$22k | 1247 | 12 | 52.3 | W 10-4 Shellharbour Scorpions |
| S2 W9 | kicking | 10 speed 2, strength 1, stamina 2, handling 2, kicking 2, footyIQ 1 | $94k | $33k | 1223 | 10 | 52.4 | W 16-4 Dubbo Diggers |
| S2 W10 | kicking | 11 speed 1, strength 1, stamina 3, handling 2, kicking 2, footyIQ 2 | $78k | -$16k | 1194 | 11 | 52.8 | W 18-4 Mackay Marlins |
| S2 W11 | kicking | 12 speed 2, strength 3, stamina 2, handling 2, kicking 1, footyIQ 2 | $122k | $43k | 1121 | 12 | 52.9 | L 4-6 Ballarat Bushrangers |
| S2 W12 | kicking | 13 speed 2, strength 2, stamina 4, handling 2, kicking 2, footyIQ 1 | $43k | -$79k | 1200 | 13 | 53.0 | D 4-4 Cairns Cyclones |
| S2 W13 | kicking | 13 speed 3, strength 1, stamina 3, handling 3, footyIQ 3 | $77k | $34k | 1242 | 13 | 53.1 | W 19-11 Toowoomba Thunder |
| S2 W14 | kicking | 12 speed 1, strength 2, stamina 3, handling 3, kicking 2, footyIQ 1 | $57k | -$20k | 1257 | 12 | 53.7 | W 16-8 Woolloomooloo Wolves |
| S2 W15 | kicking | 9 speed 2, strength 1, stamina 2, handling 2, footyIQ 2 | $99k | $42k | 1176 | 9 | 53.7 | W 14-11 Redcliffe Reapers |
| S2 W16 | kicking | 15 strength 4, stamina 2, handling 2, kicking 3, footyIQ 4 | $101k | $1.6k | 1220 | 15 | 53.8 | W 10-6 Launceston Larrikins |
| S2 W17 | kicking | 14 speed 2, strength 3, stamina 2, handling 4, kicking 1, footyIQ 2 | $84k | -$16k | 1298 | 14 | 53.9 | W 25-0 Darwin Drovers |
| S2 W18 | kicking | 11 strength 2, stamina 3, handling 3, kicking 1, footyIQ 2 | $63k | -$21k | 1262 | 11 | 54.4 | D 9-9 Southport Stingrays |
| S2 W19 | kicking | 14 speed 1, strength 3, stamina 2, handling 4, kicking 3, footyIQ 1 | $102k | $39k | 1336 | 14 | 54.5 | W 10-4 Broken Hill Brollys |
| S2 W20 | kicking | 11 strength 3, stamina 2, handling 3, kicking 1, footyIQ 2 | $43k | -$58k | 1274 | 11 | 54.6 | W 7-2 Geelong Gulls |
| S2 W21 | kicking | 14 speed 2, strength 3, stamina 1, handling 4, kicking 2, footyIQ 2 | $83k | $40k | 1291 | 14 | 54.7 | W 14-10 Wagga Swagmen |
| S2 W22 | kicking | 8 speed 2, strength 1, handling 2, kicking 2, footyIQ 1 | $61k | -$22k | 1293 | 8 | 55.2 | W 10-6 Katherine Crocs |
| S2 W23 | kicking | 14 strength 2, stamina 2, handling 5, kicking 3, footyIQ 2 | $101k | $39k | 1313 | 14 | 55.3 | L 10-16 Shellharbour Scorpions |
| S2 W24 | kicking | 13 speed 1, strength 4, handling 3, kicking 2, footyIQ 3 | $103k | $2.5k | 1240 | 13 | 55.4 | W 12-0 Dubbo Diggers |
| S2 W25 final | kicking | 15 speed 2, strength 2, stamina 2, handling 6, kicking 1, footyIQ 2 | $148k | $45k | 1200 | 15 | 55.5 | L 6-10 Mackay Marlins |
| S2 W26 final | kicking | 2 strength 1, stamina 1 | $75k | -$73k | 391 | 2 | 55.5 | no match |
| S2 W27 final | kicking | 5 speed 1, handling 2, footyIQ 2 | $108k | $33k | 283 | 5 | 59.4 | no match |
| S3 trial 1 | kicking | 11 speed 1, strength 3, handling 3, kicking 3, footyIQ 1 | $118k | $10k | 1061 | 11 | 59.6 | L 7-14 Darwin Drovers |
| S3 trial 2 | kicking | 10 speed 1, strength 3, handling 3, kicking 1, footyIQ 2 | $120k | $1.8k | 1050 | 10 | 59.7 | W 10-4 Shellharbour Scorpions |
| S3 W1 | kicking | 9 speed 1, stamina 2, handling 4, kicking 1, footyIQ 1 | $157k | $37k | 1045 | 10 | 59.8 | L 4-20 Launceston Larrikins |
| S3 W2 | kicking | 11 speed 1, strength 2, stamina 2, handling 1, kicking 3, footyIQ 2 | $70k | -$87k | 1110 | 12 | 60.0 | L 14-18 Darwin Drovers |
| S3 W3 | kicking | 10 speed 1, strength 1, stamina 2, handling 5, kicking 1 | $102k | $32k | 1186 | 10 | 60.1 | W 10-6 Southport Stingrays |
| S3 W4 | kicking | 10 speed 1, strength 1, handling 3, kicking 2, footyIQ 3 | $105k | $2.7k | 1154 | 11 | 60.2 | W 22-16 Broken Hill Brollys |
| S3 W5 | kicking | 11 strength 1, stamina 2, handling 3, kicking 2, footyIQ 3 | $114k | $8.7k | 975 | 11 | 61.5 | W 23-12 Geelong Gulls |
| S3 W6 | kicking | 8 speed 1, strength 1, stamina 2, kicking 3, footyIQ 1 | $88k | -$26k | 932 | 9 | 62.3 | W 24-4 Wagga Swagmen |
| S3 W7 | kicking | 7 stamina 2, handling 2, footyIQ 3 | $103k | $15k | 866 | 7 | 63.1 | W 13-10 Katherine Crocs |
| S3 W8 | kicking | 6 speed 1, strength 1, handling 2, kicking 1, footyIQ 1 | $105k | $2.8k | 977 | 7 | 63.1 | W 10-0 Shellharbour Scorpions |
| S3 W9 | kicking | 12 speed 1, strength 1, stamina 2, handling 1, kicking 3, footyIQ 4 | $149k | $44k | 998 | 13 | 63.3 | W 11-0 Dubbo Diggers |
| S3 W10 | kicking | 8 speed 2, stamina 1, handling 3, kicking 1, footyIQ 1 | $151k | $1.9k | 999 | 9 | 63.3 | W 11-0 Mackay Marlins |
| S3 W11 | kicking | 10 speed 2, strength 1, stamina 2, handling 1, kicking 2, footyIQ 2 | $195k | $44k | 996 | 11 | 63.4 | W 20-0 Ballarat Bushrangers |
| S3 W12 | kicking | 9 speed 2, stamina 1, handling 1, kicking 2, footyIQ 3 | $77k | -$118k | 1017 | 9 | 63.5 | W 22-12 Cairns Cyclones |
| S3 W13 | kicking | 8 speed 1, stamina 1, handling 3, footyIQ 3 | $121k | $44k | 1022 | 9 | 63.6 | W 26-11 Toowoomba Thunder |
| S3 W14 | kicking | 9 speed 1, stamina 1, handling 1, kicking 3, footyIQ 3 | $123k | $1.9k | 927 | 9 | 63.6 | L 4-6 Woolloomooloo Wolves |
| S3 W15 | kicking | 12 speed 2, strength 4, handling 2, kicking 1, footyIQ 3 | $165k | $42k | 1003 | 13 | 63.8 | W 4-0 Redcliffe Reapers |
| S3 W16 | kicking | 9 speed 2, stamina 1, handling 2, kicking 2, footyIQ 2 | $47k | -$118k | 1007 | 9 | 63.8 | W 16-12 Launceston Larrikins |
| S3 W17 | kicking | 8 speed 2, kicking 3, footyIQ 3 | $87k | $40k | 905 | 9 | 63.9 | L 0-16 Darwin Drovers |
| S3 W18 | kicking | 8 speed 1, handling 3, footyIQ 4 | $89k | $1.8k | 995 | 8 | 64.0 | W 18-7 Southport Stingrays |
| S3 W19 | kicking | 8 speed 3, kicking 1, footyIQ 4 | $128k | $39k | 965 | 9 | 64.0 | W 12-6 Broken Hill Brollys |
| S3 W20 | kicking | 11 speed 3, strength 1, stamina 1, handling 2, kicking 1, footyIQ 3 | $130k | $2.5k | 984 | 12 | 64.1 | W 10-0 Geelong Gulls |
| S3 W21 | kicking | 8 speed 2, strength 3, handling 1, footyIQ 2 | $174k | $44k | 989 | 9 | 64.2 | W 14-0 Wagga Swagmen |
| S3 W22 | kicking | 11 speed 4, strength 1, handling 1, kicking 2, footyIQ 3 | $56k | -$118k | 983 | 12 | 64.3 | W 14-4 Katherine Crocs |
| S3 W23 | kicking | 8 speed 2, strength 1, handling 2, kicking 1, footyIQ 2 | $105k | $48k | 969 | 8 | 64.4 | W 8-0 Shellharbour Scorpions |
| S3 W24 | kicking | 8 speed 1, strength 4, handling 1, kicking 1, footyIQ 1 | $107k | $2.0k | 1009 | 10 | 64.4 | W 20-4 Dubbo Diggers |
| S3 W25 final | kicking | 11 speed 3, strength 1, stamina 1, handling 2, footyIQ 4 | $178k | $72k | 1025 | 14 | 64.5 | W 13-0 Darwin Drovers |
| S3 W26 final | kicking | 9 speed 1, strength 2, kicking 1, footyIQ 5 | $250k | $72k | 1035 | 11 | 64.6 | W 22-0 Ballarat Bushrangers |
| S3 W27 final | kicking | 3 speed 1, strength 1, footyIQ 1 | $340k | $90k | 749 | 3 | 79.8 | W 10-0 Woolloomooloo Wolves |
| S4 trial 1 | stamina | 11 speed 3, strength 3, handling 3, footyIQ 2 | $194k | -$145k | 994 | 10 | 75.1 | W 16-0 Redcliffe Reapers |
| S4 trial 2 | stamina | 8 strength 1, handling 1, kicking 2, footyIQ 4 | $210k | $15k | 992 | 10 | 75.2 | W 24-0 Darwin Drovers |
| S4 W1 | stamina | 10 speed 3, strength 1, handling 3, kicking 1, footyIQ 2 | $263k | $53k | 971 | 11 | 75.4 | W 23-0 Launceston Larrikins |
| S4 W2 | stamina | 8 speed 3, strength 1, stamina 1, handling 1, footyIQ 2 | $266k | $2.8k | 973 | 8 | 75.5 | W 20-18 Darwin Drovers |
| S4 W3 | stamina | 8 speed 1, strength 1, handling 1, kicking 3, footyIQ 2 | $324k | $58k | 988 | 9 | 75.6 | W 12-6 Southport Stingrays |
| S4 W4 | stamina | 8 speed 2, strength 1, handling 1, kicking 1, footyIQ 3 | $327k | $2.8k | 979 | 10 | 75.8 | W 4-0 Broken Hill Brollys |
| S4 W5 | stamina | 12 speed 1, strength 2, stamina 1, handling 2, kicking 2, footyIQ 4 | $402k | $75k | 945 | 10 | 76.0 | L 0-4 Geelong Gulls |
| S4 W6 | stamina | 9 speed 4, strength 2, handling 1, footyIQ 2 | $407k | $4.8k | 1029 | 12 | 76.1 | W 20-0 Wagga Swagmen |
| S4 W7 | stamina | 9 speed 1, strength 1, handling 2, kicking 2, footyIQ 3 | $479k | $72k | 924 | 10 | 76.3 | L 6-8 Katherine Crocs |
| S4 W8 | stamina | 6 speed 1, strength 1, kicking 2, footyIQ 2 | $484k | $4.8k | 1027 | 7 | 76.3 | W 6-0 Shellharbour Scorpions |
| S4 W9 | stamina | 13 speed 5, strength 1, stamina 1, handling 3, kicking 1, footyIQ 2 | $542k | $58k | 1062 | 12 | 76.6 | W 10-0 Dubbo Diggers |
| S4 W10 | stamina | 8 speed 2, strength 2, handling 2, kicking 1, footyIQ 1 | $545k | $2.8k | 986 | 10 | 76.7 | W 12-6 Mackay Marlins |
| S4 W11 | stamina | 7 speed 1, strength 1, handling 1, kicking 2, footyIQ 2 | $605k | $61k | 1051 | 10 | 76.8 | W 18-14 Ballarat Bushrangers |
| S4 W12 | stamina | 11 speed 5, strength 1, stamina 1, handling 2, kicking 2 | $608k | $2.8k | 921 | 11 | 77.0 | L 4-15 Cairns Cyclones |
| S4 W13 | stamina | 7 speed 2, handling 1, kicking 3, footyIQ 1 | $669k | $61k | 1082 | 10 | 77.1 | W 16-6 Toowoomba Thunder |
| S4 W14 | stamina | 7 speed 3, handling 2, footyIQ 2 | $672k | $2.8k | 958 | 10 | 77.2 | W 10-7 Woolloomooloo Wolves |
| S4 W15 | stamina | 7 speed 2, stamina 1, handling 2, kicking 1, footyIQ 1 | $733k | $62k | 973 | 9 | 77.3 | W 16-8 Redcliffe Reapers |
| S4 W16 | stamina | 7 speed 2, strength 1, kicking 3, footyIQ 1 | $736k | $2.8k | 908 | 9 | 77.4 | L 1-5 Launceston Larrikins |
| S4 W17 | stamina | 6 speed 3, handling 2, kicking 1 | $793k | $56k | 926 | 8 | 77.5 | L 0-12 Darwin Drovers |
| S4 W18 | stamina | 8 speed 2, handling 2, kicking 1, footyIQ 3 | $795k | $2.8k | 1031 | 13 | 77.6 | W 19-6 Southport Stingrays |
| S4 W19 | stamina | 7 speed 4, stamina 1, kicking 1, footyIQ 1 | $851k | $55k | 927 | 8 | 77.7 | L 4-12 Broken Hill Brollys |
| S4 W20 | stamina | 9 speed 2, strength 1, handling 1, kicking 1, footyIQ 4 | $853k | $2.9k | 945 | 12 | 77.9 | W 15-7 Geelong Gulls |
| S4 W21 | stamina | 5 speed 1, kicking 1, footyIQ 3 | $905k | $52k | 985 | 6 | 78.0 | W 20-0 Wagga Swagmen |
| S4 W22 | stamina | 9 speed 6, stamina 1, handling 1, footyIQ 1 | $908k | $2.9k | 988 | 12 | 78.1 | W 6-0 Katherine Crocs |
| S4 W23 | stamina | 7 speed 3, handling 1, footyIQ 3 | $971k | $62k | 1005 | 11 | 78.2 | W 12-0 Shellharbour Scorpions |
| S4 W24 | stamina | 8 speed 3, kicking 2, footyIQ 3 | $973k | $2.9k | 1050 | 11 | 78.3 | W 16-6 Dubbo Diggers |
| S4 W25 final | stamina | 6 speed 1, stamina 1, handling 1, footyIQ 3 | $833k | -$140k | 1056 | 7 | 78.4 | W 18-0 Toowoomba Thunder |
| S4 W26 final | stamina | 6 speed 4, strength 1, footyIQ 1 | $933k | $100k | 960 | 9 | 78.5 | W 11-4 Redcliffe Reapers |
| S4 W27 final | stamina | 6 speed 3, kicking 1, footyIQ 2 | $1219k | $286k | 819 | 9 | 84.4 | W 10-6 Mackay Marlins |
| S5 trial 1 | stamina | 6 speed 2, footyIQ 4 | $1181k | -$38k | 908 | 7 | 75.6 | W 18-0 Toowoomba Thunder |
| S5 trial 2 | stamina | 8 speed 3, stamina 1, handling 2, footyIQ 2 | $1200k | $19k | 933 | 9 | 75.7 | L 6-14 Broken Hill Brollys |
| S5 W1 | stamina | 7 speed 3, kicking 2, footyIQ 2 | $1266k | $66k | 897 | 8 | 75.8 | L 7-12 Launceston Larrikins |
| S5 W2 | stamina | 7 speed 2, handling 2, footyIQ 3 | $1270k | $3.6k | 1001 | 12 | 75.9 | W 6-0 Darwin Drovers |
| S5 W3 | stamina | 11 speed 3, stamina 1, handling 1, kicking 2, footyIQ 4 | $1350k | $80k | 1047 | 12 | 76.1 | W 30-10 Southport Stingrays |
| S5 W4 | stamina | 3 speed 1, footyIQ 2 | $1353k | $3.6k | 933 | 8 | 76.2 | L 4-5 Broken Hill Brollys |
| S5 W5 | stamina | 5 speed 3, handling 2 | $1430k | $77k | 1005 | 7 | 76.2 | W 19-6 Geelong Gulls |
| S5 W6 | stamina | 8 speed 3, stamina 1, kicking 2, footyIQ 2 | $1434k | $3.6k | 966 | 11 | 76.4 | W 10-6 Wagga Swagmen |
| S5 W7 | stamina | 6 speed 3, handling 2, footyIQ 1 | $1515k | $81k | 945 | 9 | 76.5 | L 6-7 Katherine Crocs |
| S5 W8 | stamina | 7 speed 3, kicking 3, footyIQ 1 | $1519k | $3.6k | 971 | 13 | 76.6 | W 13-0 Shellharbour Scorpions |
| S5 W9 | stamina | 6 speed 3, handling 2, footyIQ 1 | $1588k | $70k | 935 | 9 | 76.7 | L 4-6 Dubbo Diggers |
| S5 W10 | stamina | 8 speed 4, stamina 1, kicking 2, footyIQ 1 | $1592k | $3.6k | 948 | 7 | 76.8 | W 6-0 Mackay Marlins |
| S5 W11 | stamina | 6 speed 3, handling 2, footyIQ 1 | $1662k | $70k | 1028 | 11 | 76.9 | W 22-2 Ballarat Bushrangers |
| S5 W12 | stamina | 3 speed 2, footyIQ 1 | $1665k | $3.6k | 944 | 7 | 77.0 | L 11-13 Cairns Cyclones |
| S5 W13 | stamina | 9 speed 4, stamina 1, handling 1, kicking 2, footyIQ 1 | $1735k | $70k | 987 | 13 | 77.1 | W 10-4 Toowoomba Thunder |
| S5 W14 | stamina | 5 speed 2, handling 2, footyIQ 1 | $1739k | $3.6k | 1010 | 10 | 77.2 | W 8-0 Woolloomooloo Wolves |
| S5 W15 | stamina | 5 speed 2, kicking 2, footyIQ 1 | $1828k | $90k | 954 | 8 | 77.3 | L 4-6 Redcliffe Reapers |
| S5 W16 | stamina | 7 speed 2, stamina 1, handling 2, footyIQ 2 | $1832k | $3.6k | 1037 | 13 | 77.4 | W 20-4 Launceston Larrikins |
| S5 W17 | stamina | 5 speed 2, kicking 2, footyIQ 1 | $1901k | $69k | 1021 | 9 | 77.5 | W 10-8 Darwin Drovers |
| S5 W18 | stamina | 4 speed 1, handling 2, footyIQ 1 | $1904k | $3.6k | 986 | 12 | 77.5 | L 4-6 Southport Stingrays |
| S5 W19 | stamina | 4 speed 1, kicking 3 | $1987k | $82k | 978 | 10 | 77.6 | W 6-4 Broken Hill Brollys |
| S5 W20 | stamina | 6 speed 2, stamina 1, handling 2, footyIQ 1 | $1990k | $3.6k | 1031 | 9 | 77.7 | W 23-12 Geelong Gulls |
| S5 W21 | stamina | 1 footyIQ 1 | $2084k | $94k | 997 | 7 | 77.7 | W 1-0 Wagga Swagmen |
| S5 W22 | stamina | 4 speed 1, kicking 2, footyIQ 1 | $2087k | $3.6k | 1010 | 10 | 77.8 | W 18-16 Katherine Crocs |
| S5 W23 | stamina | 5 speed 2, stamina 1, handling 2 | $2178k | $91k | 1029 | 13 | 77.8 | W 29-0 Shellharbour Scorpions |
| S5 W24 | stamina | 4 speed 1, handling 1, kicking 2 | $2181k | $3.6k | 1017 | 9 | 76.2 | W 16-10 Dubbo Diggers |
| S5 W25 final | stamina | 4 speed 1, strength 1, handling 2 | $1943k | -$238k | 1050 | 12 | 76.2 | W 8-0 Woolloomooloo Wolves |
| S5 W26 final | stamina | 4 speed 1, strength 1, kicking 2 | $2067k | $124k | 1032 | 11 | 76.3 | W 10-6 Shellharbour Scorpions |
| S5 W27 final | stamina | 0 | $2376k | $309k | 730 | 6 | 87.8 | W 24-0 Mackay Marlins |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $49k | $4.0k | 587 | 0.20 | 45.7 | 52.1 | 0.0% | 40.0% |
| S1 trial 2 | 20 | $50k | $1.1k | 604 | 5.25 | 45.7 | 52.2 | 0.0% | 20.0% |
| S1 W1 | 20 | $72k | $22k | 657 | 3.95 | 45.8 | 52.2 | 0.0% | 55.0% |
| S1 W2 | 20 | $57k | -$15k | 681 | 8.00 | 45.8 | 52.4 | 0.0% | 50.0% |
| S1 W3 | 20 | $74k | $17k | 721 | 4.40 | 45.8 | 52.5 | 0.0% | 25.0% |
| S1 W4 | 20 | $51k | -$23k | 771 | 10.45 | 46.0 | 52.8 | 0.0% | 40.0% |
| S1 W5 | 20 | $80k | $29k | 778 | 7.05 | 46.1 | 53.0 | 0.0% | 55.0% |
| S1 W6 | 20 | $53k | -$28k | 818 | 6.00 | 46.3 | 53.4 | 0.0% | 45.0% |
| S1 W7 | 20 | $78k | $25k | 832 | 9.80 | 46.4 | 53.5 | 0.0% | 35.0% |
| S1 W8 | 20 | $55k | -$23k | 896 | 7.95 | 46.5 | 53.7 | 0.0% | 55.0% |
| S1 W9 | 20 | $81k | $26k | 874 | 10.80 | 46.6 | 53.8 | 0.0% | 50.0% |
| S1 W10 | 20 | $53k | -$29k | 892 | 5.95 | 46.7 | 54.3 | 0.0% | 30.0% |
| S1 W11 | 20 | $80k | $27k | 901 | 10.50 | 46.9 | 54.5 | 0.0% | 40.0% |
| S1 W12 | 20 | $50k | -$30k | 915 | 8.65 | 47.0 | 54.8 | 0.0% | 35.0% |
| S1 W13 | 20 | $81k | $32k | 909 | 7.70 | 47.1 | 55.0 | 0.0% | 45.0% |
| S1 W14 | 20 | $49k | -$32k | 941 | 10.75 | 47.3 | 55.4 | 0.0% | 60.0% |
| S1 W15 | 20 | $81k | $31k | 938 | 8.55 | 47.3 | 55.6 | 0.0% | 35.0% |
| S1 W16 | 20 | $51k | -$30k | 937 | 10.50 | 47.5 | 56.0 | 0.0% | 55.0% |
| S1 W17 | 20 | $80k | $29k | 950 | 8.50 | 47.6 | 56.2 | 0.0% | 45.0% |
| S1 W18 | 20 | $52k | -$28k | 950 | 9.85 | 47.9 | 56.8 | 0.0% | 40.0% |
| S1 W19 | 20 | $81k | $29k | 942 | 8.05 | 48.0 | 57.0 | 0.0% | 35.0% |
| S1 W20 | 20 | $53k | -$28k | 956 | 10.65 | 48.3 | 57.7 | 0.0% | 40.0% |
| S1 W21 | 20 | $83k | $30k | 951 | 9.05 | 48.4 | 57.9 | 0.0% | 40.0% |
| S1 W22 | 20 | $52k | -$31k | 953 | 9.80 | 48.8 | 58.8 | 0.0% | 50.0% |
| S1 W23 | 20 | $82k | $30k | 962 | 9.10 | 48.8 | 59.0 | 0.0% | 50.0% |
| S1 W24 | 20 | $51k | -$31k | 968 | 9.00 | 49.1 | 59.6 | 0.0% | 55.0% |
| S1 W25 final | 20 | $62k | $11k | 607 | 5.45 | 49.2 | 59.8 | 0.0% | 55.6% |
| S1 W26 final | 20 | $61k | -$888 | 479 | 3.90 | 49.3 | 60.1 | 0.0% | 60.0% |
| S1 W27 final | 20 | $90k | $29k | 339 | 5.90 | 51.5 | 59.6 | 0.0% | 0.0% |
| S2 trial 1 | 20 | $66k | -$24k | 892 | 8.60 | 51.6 | 60.0 | 0.0% | 35.0% |
| S2 trial 2 | 20 | $61k | -$5.3k | 905 | 8.70 | 51.7 | 60.3 | 0.0% | 60.0% |
| S2 W1 | 20 | $89k | $28k | 914 | 8.75 | 51.8 | 60.5 | 0.0% | 45.0% |
| S2 W2 | 20 | $60k | -$29k | 928 | 9.05 | 52.2 | 61.2 | 0.0% | 55.0% |
| S2 W3 | 20 | $91k | $31k | 929 | 8.90 | 52.3 | 61.4 | 0.0% | 35.0% |
| S2 W4 | 20 | $63k | -$28k | 938 | 9.00 | 52.5 | 61.9 | 0.0% | 45.0% |
| S2 W5 | 20 | $85k | $22k | 925 | 9.75 | 52.9 | 62.6 | 0.0% | 20.0% |
| S2 W6 | 20 | $63k | -$22k | 964 | 9.10 | 53.5 | 63.9 | 0.0% | 40.0% |
| S2 W7 | 20 | $90k | $27k | 974 | 9.00 | 53.7 | 64.3 | 0.0% | 55.0% |
| S2 W8 | 20 | $62k | -$28k | 993 | 9.50 | 54.1 | 64.9 | 0.0% | 50.0% |
| S2 W9 | 20 | $88k | $26k | 1001 | 9.35 | 54.3 | 65.4 | 0.0% | 35.0% |
| S2 W10 | 20 | $64k | -$24k | 1043 | 9.90 | 54.8 | 66.4 | 0.0% | 70.0% |
| S2 W11 | 20 | $94k | $30k | 1027 | 11.30 | 54.9 | 66.6 | 0.0% | 60.0% |
| S2 W12 | 20 | $68k | -$25k | 1094 | 10.45 | 55.2 | 67.2 | 0.0% | 55.0% |
| S2 W13 | 20 | $91k | $23k | 1087 | 10.75 | 55.5 | 67.8 | 0.0% | 75.0% |
| S2 W14 | 20 | $63k | -$28k | 1103 | 10.00 | 55.9 | 68.6 | 0.0% | 40.0% |
| S2 W15 | 20 | $97k | $34k | 1088 | 11.30 | 56.1 | 68.9 | 0.0% | 30.0% |
| S2 W16 | 20 | $74k | -$23k | 1105 | 10.90 | 56.3 | 69.3 | 0.0% | 50.0% |
| S2 W17 | 20 | $93k | $18k | 1119 | 10.65 | 56.6 | 69.8 | 0.0% | 60.0% |
| S2 W18 | 20 | $63k | -$29k | 1096 | 11.15 | 57.0 | 70.6 | 0.0% | 40.0% |
| S2 W19 | 20 | $96k | $32k | 1109 | 11.15 | 57.1 | 70.8 | 0.0% | 65.0% |
| S2 W20 | 20 | $81k | -$15k | 1118 | 10.85 | 57.2 | 71.1 | 0.0% | 60.0% |
| S2 W21 | 20 | $108k | $27k | 1117 | 11.10 | 57.4 | 71.5 | 0.0% | 70.0% |
| S2 W22 | 20 | $67k | -$40k | 1128 | 10.55 | 57.6 | 71.9 | 0.0% | 45.0% |
| S2 W23 | 20 | $103k | $36k | 1116 | 10.65 | 57.7 | 72.1 | 0.0% | 55.0% |
| S2 W24 | 20 | $81k | -$22k | 1121 | 12.00 | 57.8 | 72.3 | 0.0% | 45.0% |
| S2 W25 final | 20 | $91k | $9.6k | 918 | 9.85 | 57.9 | 72.5 | 0.0% | 50.0% |
| S2 W26 final | 20 | $74k | -$16k | 654 | 6.20 | 57.9 | 72.6 | 0.0% | 85.7% |
| S2 W27 final | 20 | $134k | $59k | 433 | 4.15 | 62.9 | 72.4 | 0.0% | 50.0% |
| S3 trial 1 | 20 | $78k | -$56k | 952 | 9.20 | 62.5 | 72.8 | 0.0% | 55.0% |
| S3 trial 2 | 20 | $74k | -$4.5k | 946 | 9.25 | 62.2 | 73.0 | 0.0% | 45.0% |
| S3 W1 | 20 | $106k | $32k | 950 | 9.50 | 62.2 | 73.2 | 0.0% | 50.0% |
| S3 W2 | 20 | $79k | -$27k | 967 | 9.60 | 62.3 | 73.5 | 0.0% | 40.0% |
| S3 W3 | 20 | $108k | $29k | 966 | 9.30 | 62.4 | 73.6 | 0.0% | 55.0% |
| S3 W4 | 20 | $76k | -$32k | 931 | 9.90 | 62.5 | 73.8 | 0.0% | 35.0% |
| S3 W5 | 20 | $100k | $24k | 939 | 8.80 | 62.9 | 74.5 | 0.0% | 45.0% |
| S3 W6 | 20 | $79k | -$21k | 947 | 9.05 | 63.3 | 75.0 | 0.0% | 45.0% |
| S3 W7 | 20 | $111k | $32k | 961 | 9.05 | 63.5 | 75.2 | 0.0% | 50.0% |
| S3 W8 | 20 | $91k | -$20k | 987 | 10.45 | 63.7 | 75.5 | 0.0% | 50.0% |
| S3 W9 | 20 | $107k | $17k | 1002 | 9.75 | 64.1 | 76.0 | 0.0% | 60.0% |
| S3 W10 | 20 | $88k | -$19k | 1035 | 9.90 | 64.4 | 76.4 | 0.0% | 65.0% |
| S3 W11 | 20 | $129k | $40k | 1008 | 9.50 | 64.5 | 76.6 | 0.0% | 55.0% |
| S3 W12 | 20 | $92k | -$36k | 1019 | 11.00 | 64.6 | 76.8 | 0.0% | 50.0% |
| S3 W13 | 20 | $126k | $33k | 1036 | 9.90 | 64.8 | 77.0 | 0.0% | 55.0% |
| S3 W14 | 20 | $94k | -$32k | 1038 | 10.75 | 64.9 | 77.2 | 0.0% | 55.0% |
| S3 W15 | 20 | $136k | $42k | 1031 | 10.25 | 65.0 | 77.4 | 0.0% | 50.0% |
| S3 W16 | 20 | $95k | -$41k | 1063 | 10.80 | 65.1 | 77.5 | 0.0% | 75.0% |
| S3 W17 | 20 | $132k | $37k | 1012 | 9.45 | 65.2 | 77.8 | 0.0% | 60.0% |
| S3 W18 | 20 | $96k | -$36k | 1022 | 10.45 | 65.3 | 78.0 | 0.0% | 55.0% |
| S3 W19 | 20 | $131k | $35k | 1019 | 10.00 | 65.4 | 78.1 | 0.0% | 65.0% |
| S3 W20 | 20 | $109k | -$22k | 1051 | 10.30 | 65.5 | 78.3 | 0.0% | 60.0% |
| S3 W21 | 20 | $140k | $31k | 1024 | 10.40 | 65.6 | 78.5 | 0.0% | 40.0% |
| S3 W22 | 20 | $107k | -$33k | 1037 | 10.75 | 65.7 | 78.7 | 0.0% | 55.0% |
| S3 W23 | 20 | $143k | $36k | 1064 | 10.80 | 65.8 | 78.9 | 0.0% | 65.0% |
| S3 W24 | 20 | $118k | -$25k | 1044 | 10.50 | 65.9 | 79.1 | 0.0% | 60.0% |
| S3 W25 final | 20 | $133k | $14k | 887 | 8.55 | 66.0 | 79.2 | 0.0% | 50.0% |
| S3 W26 final | 20 | $149k | $16k | 591 | 6.30 | 66.1 | 79.3 | 0.0% | 50.0% |
| S3 W27 final | 20 | $213k | $64k | 282 | 2.35 | 79.6 | 79.6 | 0.0% | 75.0% |
| S4 trial 1 | 16 | $118k | -$125k | 930 | 7.75 | 73.3 | 80.2 | 0.0% | 43.8% |
| S4 trial 2 | 16 | $121k | $3.1k | 983 | 9.50 | 72.8 | 80.3 | 0.0% | 62.5% |
| S4 W1 | 16 | $160k | $39k | 1005 | 9.75 | 72.6 | 80.5 | 0.0% | 87.5% |
| S4 W2 | 16 | $148k | -$13k | 966 | 10.00 | 72.3 | 80.7 | 0.0% | 56.3% |
| S4 W3 | 16 | $197k | $49k | 977 | 9.50 | 72.4 | 80.9 | 0.0% | 56.3% |
| S4 W4 | 16 | $179k | -$17k | 984 | 9.06 | 72.5 | 81.0 | 0.0% | 43.8% |
| S4 W5 | 16 | $227k | $48k | 997 | 10.69 | 72.7 | 81.2 | 0.0% | 68.8% |
| S4 W6 | 16 | $220k | -$7.0k | 1019 | 10.06 | 72.9 | 81.4 | 0.0% | 75.0% |
| S4 W7 | 16 | $272k | $52k | 1000 | 11.13 | 72.9 | 81.6 | 0.0% | 50.0% |
| S4 W8 | 16 | $245k | -$27k | 993 | 8.06 | 73.0 | 81.7 | 0.0% | 62.5% |
| S4 W9 | 16 | $289k | $44k | 990 | 10.69 | 73.0 | 81.9 | 0.0% | 43.8% |
| S4 W10 | 16 | $276k | -$13k | 998 | 9.44 | 73.1 | 82.1 | 0.0% | 50.0% |
| S4 W11 | 16 | $326k | $49k | 1005 | 10.69 | 73.3 | 82.3 | 0.0% | 62.5% |
| S4 W12 | 16 | $321k | -$5.0k | 989 | 9.63 | 73.4 | 82.5 | 0.0% | 56.3% |
| S4 W13 | 16 | $371k | $51k | 1018 | 10.25 | 73.5 | 82.6 | 0.0% | 68.8% |
| S4 W14 | 16 | $351k | -$20k | 1020 | 10.69 | 73.7 | 82.8 | 0.0% | 62.5% |
| S4 W15 | 16 | $396k | $45k | 1027 | 9.50 | 73.8 | 83.0 | 0.0% | 75.0% |
| S4 W16 | 16 | $369k | -$27k | 1032 | 10.88 | 73.9 | 83.1 | 0.0% | 81.3% |
| S4 W17 | 16 | $422k | $53k | 1000 | 10.00 | 74.0 | 83.3 | 0.0% | 37.5% |
| S4 W18 | 16 | $425k | $2.6k | 1001 | 9.75 | 74.1 | 83.4 | 0.0% | 43.8% |
| S4 W19 | 16 | $476k | $51k | 995 | 9.63 | 74.2 | 83.6 | 0.0% | 56.3% |
| S4 W20 | 16 | $467k | -$8.9k | 1000 | 10.69 | 74.2 | 83.7 | 0.0% | 56.3% |
| S4 W21 | 16 | $516k | $49k | 1021 | 9.44 | 74.3 | 83.9 | 0.0% | 68.8% |
| S4 W22 | 16 | $492k | -$23k | 1028 | 10.31 | 74.3 | 84.0 | 0.0% | 43.8% |
| S4 W23 | 16 | $545k | $52k | 1047 | 10.63 | 74.4 | 84.2 | 0.0% | 68.8% |
| S4 W24 | 16 | $536k | -$8.8k | 1011 | 10.31 | 74.5 | 84.3 | 0.0% | 50.0% |
| S4 W25 final | 16 | $544k | $8.3k | 887 | 9.00 | 74.6 | 84.4 | 0.0% | 46.2% |
| S4 W26 final | 16 | $574k | $30k | 558 | 5.19 | 74.6 | 84.5 | 0.0% | 66.7% |
| S4 W27 final | 16 | $653k | $78k | 331 | 3.63 | 84.7 | 84.8 | 0.0% | 75.0% |
| S5 trial 1 | 12 | $727k | -$32k | 1014 | 8.08 | 75.3 | 84.8 | 0.0% | 66.7% |
| S5 trial 2 | 12 | $738k | $11k | 1052 | 10.42 | 75.3 | 85.0 | 0.0% | 66.7% |
| S5 W1 | 12 | $789k | $51k | 1051 | 10.83 | 75.4 | 85.1 | 0.0% | 50.0% |
| S5 W2 | 12 | $792k | $2.5k | 1055 | 10.58 | 75.4 | 85.1 | 0.0% | 58.3% |
| S5 W3 | 12 | $852k | $60k | 1086 | 11.33 | 75.3 | 85.3 | 0.0% | 58.3% |
| S5 W4 | 12 | $855k | $3.3k | 1070 | 9.00 | 75.2 | 85.4 | 0.0% | 66.7% |
| S5 W5 | 12 | $914k | $59k | 1088 | 10.83 | 75.2 | 85.5 | 0.0% | 58.3% |
| S5 W6 | 12 | $917k | $2.7k | 1082 | 10.75 | 75.2 | 85.5 | 0.0% | 66.7% |
| S5 W7 | 12 | $977k | $60k | 1072 | 11.17 | 75.3 | 85.6 | 0.0% | 58.3% |
| S5 W8 | 12 | $980k | $2.9k | 1077 | 11.08 | 75.4 | 85.7 | 0.0% | 66.7% |
| S5 W9 | 12 | $1040k | $61k | 1057 | 10.50 | 75.5 | 85.8 | 0.0% | 41.7% |
| S5 W10 | 12 | $1043k | $2.9k | 1101 | 10.83 | 75.5 | 85.9 | 0.0% | 75.0% |
| S5 W11 | 12 | $1104k | $61k | 1067 | 10.92 | 75.3 | 86.0 | 0.0% | 66.7% |
| S5 W12 | 12 | $1107k | $3.1k | 1089 | 9.58 | 75.3 | 86.1 | 0.0% | 66.7% |
| S5 W13 | 12 | $1168k | $61k | 1109 | 11.25 | 75.5 | 86.2 | 0.0% | 83.3% |
| S5 W14 | 12 | $1171k | $3.0k | 1092 | 11.92 | 75.6 | 86.2 | 0.0% | 75.0% |
| S5 W15 | 12 | $1240k | $69k | 1072 | 10.42 | 75.7 | 86.3 | 0.0% | 58.3% |
| S5 W16 | 12 | $1243k | $2.9k | 1073 | 11.00 | 75.7 | 86.4 | 0.0% | 66.7% |
| S5 W17 | 12 | $1304k | $62k | 1085 | 10.83 | 75.8 | 86.4 | 0.0% | 58.3% |
| S5 W18 | 12 | $1308k | $3.3k | 1091 | 11.42 | 75.9 | 86.5 | 0.0% | 58.3% |
| S5 W19 | 12 | $1371k | $63k | 1086 | 10.92 | 76.0 | 86.6 | 0.0% | 58.3% |
| S5 W20 | 12 | $1354k | -$17k | 1081 | 10.67 | 76.1 | 86.6 | 0.0% | 66.7% |
| S5 W21 | 12 | $1417k | $63k | 1112 | 9.83 | 76.2 | 86.7 | 0.0% | 66.7% |
| S5 W22 | 12 | $1420k | $2.8k | 1105 | 11.08 | 76.3 | 86.7 | 0.0% | 83.3% |
| S5 W23 | 12 | $1483k | $63k | 1103 | 11.42 | 76.4 | 86.8 | 0.0% | 66.7% |
| S5 W24 | 12 | $1486k | $3.1k | 1088 | 11.67 | 76.3 | 86.9 | 0.0% | 66.7% |
| S5 W25 final | 12 | $1457k | -$29k | 985 | 9.50 | 76.4 | 86.9 | 0.0% | 80.0% |
| S5 W26 final | 12 | $1477k | $20k | 805 | 8.17 | 76.4 | 86.9 | 0.0% | 50.0% |
| S5 W27 final | 12 | $1588k | $111k | 334 | 3.00 | 87.8 | 87.8 | 0.0% | 100.0% |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| all-out × compressed | 1 | 0.0% | 2228 | 58.2% | -58.2% |  |
| all-out × rush | 1 | 100.0% | 2228 | 58.2% | 41.8% |  |
| all-out × slide | 50 | 46.0% | 2179 | 58.5% | -12.5% |  |
| expansive × compressed | 1056 | 59.2% | 1173 | 57.3% | 1.9% |  |
| expansive × slide | 28 | 42.9% | 2201 | 58.4% | -15.5% | WARNING |
| grind × compressed | 44 | 44.3% | 2185 | 58.5% | -14.1% |  |
| grind × slide | 1033 | 58.8% | 1196 | 57.7% | 1.2% |  |
| kick-chase × rush | 15 | 53.3% | 2214 | 58.2% | -4.9% |  |
| kick-chase × slide | 1 | 100.0% | 2228 | 58.2% | 41.8% |  |
| block-play | 1571 | 60.4% | 658 | 52.8% | 7.6% |  |
| block-shift | 187 | 60.2% | 2042 | 58.0% | 2.2% |  |
| cut-out-winger | 188 | 60.4% | 2041 | 58.0% | 2.4% |  |
| inside-ball | 1571 | 60.4% | 658 | 52.8% | 7.6% |  |
| second-man | 187 | 60.2% | 2042 | 58.0% | 2.2% |  |
| short-side-raid | 1571 | 60.4% | 658 | 52.8% | 7.6% |  |

### newcomer/easy/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 189 of 400; median 31.0 weeks among those who did.
- Reaching potential stars: 219 of 400 (100 already there at week 0); median 28.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/248; S3 0/0; S5 0/0.
- Mean XP per completed season 16233; mean level-ups per completed season 158.5.
- Cash: opening 90000; mean weekly change 16603; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 93; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1554k after opening at $90k, and no career went into debt.
- WARNING: cash climbs by $17k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 57740 |
| gate | 475635 |
| prize | 30070 |
| boardGrant | 7769 |
| events | -8690 |
| transfers | -81028 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $97k | $7.2k | 848 | 3 | 53.1 | L 6-14 Dubbo Diggers |
| S1 trial 2 | balanced | 3 strength 1, kicking 1, footyIQ 1 | $98k | $1.2k | 801 | 7 | 53.2 | W 6-0 Wagga Swagmen |
| S1 W1 | balanced | 4 strength 2, stamina 1, kicking 1 | $124k | $25k | 703 | 5 | 53.2 | W 8-0 Launceston Larrikins |
| S1 W2 | balanced | 5 strength 3, footyIQ 2 | $125k | $1.2k | 735 | 7 | 53.2 | L 10-11 Darwin Drovers |
| S1 W3 | balanced | 5 stamina 2, handling 1, kicking 1, footyIQ 1 | $157k | $32k | 885 | 9 | 53.3 | W 13-12 Southport Stingrays |
| S1 W4 | balanced | 8 strength 3, stamina 2, footyIQ 3 | $160k | $3.2k | 982 | 8 | 53.3 | W 20-8 Broken Hill Brollys |
| S1 W5 | balanced | 8 strength 2, stamina 1, handling 2, kicking 1, footyIQ 2 | $196k | $35k | 934 | 11 | 53.4 | W 23-11 Geelong Gulls |
| S1 W6 | balanced | 9 speed 1, strength 1, stamina 2, kicking 1, footyIQ 4 | $197k | $1.2k | 893 | 10 | 53.5 | W 14-11 Wagga Swagmen |
| S1 W7 | balanced | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $231k | $35k | 871 | 6 | 53.5 | W 6-0 Katherine Crocs |
| S1 W8 | balanced | 11 speed 1, strength 4, handling 1, kicking 1, footyIQ 4 | $233k | $1.2k | 916 | 11 | 53.6 | W 12-8 Shellharbour Scorpions |
| S1 W9 | balanced | 8 speed 3, strength 1, stamina 1, kicking 2, footyIQ 1 | $264k | $31k | 928 | 9 | 53.7 | W 16-4 Dubbo Diggers |
| S1 W10 | balanced | 8 speed 2, strength 2, stamina 1, handling 1, footyIQ 2 | $265k | $1.2k | 823 | 8 | 53.8 | L 4-11 Mackay Marlins |
| S1 W11 | balanced | 7 speed 2, strength 2, stamina 1, kicking 1, footyIQ 1 | $267k | $2.2k | 866 | 8 | 54.6 | L 4-5 Ballarat Bushrangers |
| S1 W12 | balanced | 11 speed 3, strength 2, stamina 1, handling 1, kicking 1, footyIQ 3 | $269k | $1.2k | 967 | 11 | 54.7 | W 23-0 Cairns Cyclones |
| S1 W13 | balanced | 9 speed 1, strength 3, stamina 1, handling 2, footyIQ 2 | $300k | $32k | 922 | 9 | 54.8 | W 10-0 Toowoomba Thunder |
| S1 W14 | balanced | 10 speed 5, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $301k | $1.2k | 819 | 10 | 54.9 | L 0-8 Woolloomooloo Wolves |
| S1 W15 | balanced | 5 strength 1, kicking 1, footyIQ 3 | $326k | $25k | 813 | 5 | 54.9 | L 0-8 Redcliffe Reapers |
| S1 W16 | balanced | 9 speed 2, strength 2, stamina 2, handling 1, footyIQ 2 | $327k | $1.2k | 910 | 10 | 55.0 | W 14-0 Launceston Larrikins |
| S1 W17 | balanced | 6 speed 3, handling 1, kicking 1, footyIQ 1 | $360k | $32k | 843 | 6 | 55.1 | L 6-7 Darwin Drovers |
| S1 W18 | balanced | 12 speed 1, strength 4, stamina 1, handling 1, kicking 1, footyIQ 4 | $361k | $1.2k | 911 | 11 | 55.2 | W 12-6 Southport Stingrays |
| S1 W19 | balanced | 7 strength 2, stamina 2, handling 1, kicking 1, footyIQ 1 | $386k | $25k | 896 | 7 | 55.2 | W 10-4 Broken Hill Brollys |
| S1 W20 | balanced | 9 speed 5, stamina 1, kicking 1, footyIQ 2 | $387k | $1.2k | 929 | 10 | 55.3 | W 16-0 Geelong Gulls |
| S1 W21 | balanced | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $417k | $30k | 901 | 8 | 55.4 | W 10-0 Wagga Swagmen |
| S1 W22 | balanced | 12 speed 2, strength 2, stamina 2, handling 3, kicking 2, footyIQ 1 | $418k | $1.2k | 894 | 12 | 55.5 | W 14-4 Katherine Crocs |
| S1 W23 | balanced | 6 speed 1, strength 2, stamina 1, footyIQ 2 | $450k | $32k | 867 | 6 | 55.6 | W 12-10 Shellharbour Scorpions |
| S1 W24 | balanced | 9 speed 3, strength 3, handling 1, footyIQ 2 | $452k | $1.2k | 901 | 9 | 55.6 | W 4-0 Dubbo Diggers |
| S1 W25 final | balanced | 12 speed 1, strength 2, stamina 4, handling 1, kicking 1, footyIQ 3 | $493k | $42k | 886 | 12 | 55.8 | W 2-1 Mackay Marlins |
| S1 W26 final | balanced | 8 speed 5, kicking 1, footyIQ 2 | $535k | $42k | 965 | 8 | 55.8 | W 18-0 Cairns Cyclones |
| S1 W27 final | balanced | 8 speed 2, strength 1, handling 1, footyIQ 4 | $723k | $189k | 848 | 8 | 56.4 | W 11-4 Redcliffe Reapers |
| S2 trial 1 | balanced | 7 strength 2, stamina 1, handling 2, kicking 1, footyIQ 1 | $726k | $2.2k | 778 | 7 | 56.5 | W 10-6 Redcliffe Reapers |
| S2 trial 2 | balanced | 8 speed 2, strength 2, stamina 2, kicking 1, footyIQ 1 | $737k | $12k | 858 | 8 | 56.6 | W 15-0 Shellharbour Scorpions |
| S2 W1 | balanced | 9 speed 2, strength 2, stamina 1, handling 1, footyIQ 3 | $778k | $41k | 806 | 9 | 56.7 | W 16-4 Launceston Larrikins |
| S2 W2 | balanced | 7 speed 3, strength 1, stamina 1, kicking 1, footyIQ 1 | $780k | $2.2k | 837 | 7 | 56.8 | W 15-6 Darwin Drovers |
| S2 W3 | balanced | 9 speed 2, strength 1, stamina 1, handling 1, footyIQ 4 | $823k | $42k | 890 | 9 | 56.9 | W 28-0 Southport Stingrays |
| S2 W4 | balanced | 8 speed 2, strength 1, stamina 1, kicking 1, footyIQ 3 | $825k | $2.2k | 817 | 9 | 57.0 | W 20-13 Broken Hill Brollys |
| S2 W5 | balanced | 7 speed 1, strength 2, handling 1, kicking 1, footyIQ 2 | $868k | $42k | 771 | 7 | 57.1 | W 6-0 Geelong Gulls |
| S2 W6 | balanced | 12 speed 4, stamina 3, handling 2, footyIQ 3 | $870k | $2.2k | 884 | 12 | 57.2 | W 22-4 Wagga Swagmen |
| S2 W7 | balanced | 6 speed 2, strength 1, handling 2, kicking 1 | $915k | $46k | 825 | 5 | 57.3 | W 20-4 Katherine Crocs |
| S2 W8 | balanced | 9 speed 1, strength 2, stamina 1, kicking 1, footyIQ 4 | $917k | $2.2k | 733 | 8 | 57.4 | W 4-0 Shellharbour Scorpions |
| S2 W9 | balanced | 8 speed 2, strength 3, handling 2, kicking 1 | $960k | $43k | 771 | 10 | 57.5 | W 12-6 Dubbo Diggers |
| S2 W10 | balanced | 8 speed 1, strength 1, stamina 3, handling 1, footyIQ 2 | $962k | $2.2k | 687 | 8 | 57.6 | D 0-0 Mackay Marlins |
| S2 W11 | balanced | 7 speed 3, stamina 1, kicking 1, footyIQ 2 | $1005k | $43k | 768 | 7 | 57.6 | W 6-4 Ballarat Bushrangers |
| S2 W12 | balanced | 6 speed 1, strength 1, handling 1, footyIQ 3 | $1008k | $2.8k | 759 | 7 | 57.7 | W 7-4 Cairns Cyclones |
| S2 W13 | balanced | 6 speed 1, strength 2, stamina 1, kicking 1, footyIQ 1 | $1050k | $43k | 778 | 7 | 57.8 | W 10-7 Toowoomba Thunder |
| S2 W14 | balanced | 9 speed 1, strength 2, stamina 1, handling 2, kicking 1, footyIQ 2 | $1052k | $2.2k | 843 | 8 | 57.9 | W 20-0 Woolloomooloo Wolves |
| S2 W15 | balanced | 8 speed 2, strength 1, stamina 2, footyIQ 3 | $1095k | $43k | 860 | 8 | 58.0 | W 18-7 Redcliffe Reapers |
| S2 W16 | balanced | 9 speed 3, strength 1, stamina 2, handling 1, footyIQ 2 | $1097k | $2.3k | 798 | 9 | 58.1 | W 8-6 Launceston Larrikins |
| S2 W17 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, kicking 2, footyIQ 1 | $1140k | $43k | 721 | 8 | 58.2 | L 0-12 Darwin Drovers |
| S2 W18 | balanced | 7 speed 1, stamina 3, footyIQ 3 | $1142k | $2.3k | 710 | 7 | 58.2 | L 2-10 Southport Stingrays |
| S2 W19 | balanced | 6 speed 5, strength 1 | $1185k | $43k | 801 | 6 | 58.3 | W 17-8 Broken Hill Brollys |
| S2 W20 | balanced | 10 speed 2, strength 1, stamina 1, handling 2, kicking 1, footyIQ 3 | $1185k | $320 | 837 | 10 | 58.4 | W 24-0 Geelong Gulls |
| S2 W21 | balanced | 7 speed 1, strength 2, stamina 1, kicking 1, footyIQ 2 | $1228k | $43k | 771 | 7 | 58.5 | W 2-1 Wagga Swagmen |
| S2 W22 | balanced | 11 speed 3, strength 1, stamina 1, handling 4, footyIQ 2 | $1230k | $2.3k | 844 | 11 | 58.6 | W 20-0 Katherine Crocs |
| S2 W23 | balanced | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | $1265k | $35k | 794 | 6 | 58.7 | W 14-6 Shellharbour Scorpions |
| S2 W24 | balanced | 7 strength 2, stamina 2, kicking 1, footyIQ 2 | $1267k | $2.3k | 800 | 7 | 58.8 | W 10-0 Dubbo Diggers |
| S2 W25 final | balanced | 8 speed 4, strength 2, stamina 1, footyIQ 1 | $1310k | $43k | 746 | 8 | 58.9 | L 8-12 Toowoomba Thunder |
| S2 W26 final | balanced | 4 stamina 1, handling 2, footyIQ 1 | $1312k | $2.3k | 174 | 1 | 58.9 | no match |
| S2 W27 final | balanced | 2 strength 1, kicking 1 | $1336k | $24k | 122 | 1 | 60.4 | no match |
| S3 trial 1 | balanced | 7 speed 1, strength 2, stamina 1, kicking 1, footyIQ 2 | $1294k | -$42k | 830 | 8 | 53.7 | W 40-19 Redcliffe Reapers |
| S3 trial 2 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $1296k | $2.4k | 719 | 5 | 53.8 | W 20-8 Wagga Swagmen |
| S3 W1 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, footyIQ 1 | $1325k | $29k | 701 | 7 | 52.9 | W 12-10 Launceston Larrikins |
| S3 W2 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, kicking 2 | $1327k | $2.4k | 632 | 6 | 52.9 | W 23-4 Darwin Drovers |
| S3 W3 | balanced | 9 speed 4, strength 1, stamina 1, footyIQ 3 | $1370k | $43k | 710 | 11 | 53.0 | W 21-12 Southport Stingrays |
| S3 W4 | balanced | 5 speed 3, stamina 1, footyIQ 1 | $1372k | $2.4k | 710 | 5 | 53.1 | W 10-6 Broken Hill Brollys |
| S3 W5 | balanced | 8 speed 2, strength 3, handling 2, footyIQ 1 | $1415k | $43k | 716 | 8 | 53.2 | W 18-0 Geelong Gulls |
| S3 W6 | balanced | 7 speed 1, strength 1, stamina 1, kicking 2, footyIQ 2 | $1417k | $2.4k | 692 | 7 | 53.2 | W 14-0 Wagga Swagmen |
| S3 W7 | balanced | 7 speed 2, strength 2, stamina 2, footyIQ 1 | $1460k | $43k | 724 | 6 | 53.3 | W 12-10 Katherine Crocs |
| S3 W8 | balanced | 7 speed 2, stamina 2, handling 1, footyIQ 2 | $1462k | $2.4k | 786 | 9 | 53.4 | W 34-12 Shellharbour Scorpions |
| S3 W9 | balanced | 6 speed 2, strength 1, handling 1, kicking 1, footyIQ 1 | $1507k | $45k | 707 | 5 | 53.5 | W 12-0 Dubbo Diggers |
| S3 W10 | balanced | 9 speed 1, strength 1, stamina 2, kicking 1, footyIQ 4 | $1511k | $4.4k | 749 | 9 | 53.6 | W 24-10 Mackay Marlins |
| S3 W11 | balanced | 5 speed 3, strength 1, handling 1 | $1554k | $43k | 663 | 5 | 53.6 | D 0-0 Ballarat Bushrangers |
| S3 W12 | balanced | 7 speed 3, stamina 2, handling 1, kicking 1 | $1559k | $4.4k | 726 | 9 | 53.7 | W 18-13 Cairns Cyclones |
| S3 W13 | balanced | 5 speed 2, kicking 1, footyIQ 2 | $1601k | $43k | 765 | 6 | 53.7 | W 12-8 Toowoomba Thunder |
| S3 W14 | balanced | 9 speed 1, strength 2, handling 1, kicking 1, footyIQ 4 | $1604k | $2.4k | 817 | 10 | 53.8 | W 28-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 4 strength 1, handling 2, footyIQ 1 | $1647k | $43k | 649 | 5 | 53.9 | L 0-4 Redcliffe Reapers |
| S3 W16 | balanced | 6 speed 1, strength 1, stamina 3, kicking 1 | $1650k | $2.5k | 765 | 7 | 53.9 | W 28-6 Launceston Larrikins |
| S3 W17 | balanced | 4 speed 1, handling 1, kicking 1, footyIQ 1 | $1690k | $40k | 704 | 6 | 54.0 | W 12-0 Darwin Drovers |
| S3 W18 | balanced | 7 speed 3, strength 1, stamina 1, footyIQ 2 | $1692k | $2.5k | 763 | 8 | 54.0 | W 20-6 Southport Stingrays |
| S3 W19 | balanced | 8 speed 4, strength 1, stamina 1, handling 1, footyIQ 1 | $1735k | $43k | 635 | 7 | 54.1 | W 14-4 Broken Hill Brollys |
| S3 W20 | balanced | 6 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $1742k | $7.5k | 614 | 8 | 54.2 | W 16-0 Geelong Gulls |
| S3 W21 | balanced | 7 speed 2, strength 1, stamina 1, kicking 1, footyIQ 2 | $1785k | $43k | 763 | 9 | 54.3 | W 18-0 Wagga Swagmen |
| S3 W22 | balanced | 5 speed 1, strength 1, handling 1, footyIQ 2 | $1788k | $2.5k | 795 | 6 | 54.3 | W 36-4 Katherine Crocs |
| S3 W23 | balanced | 6 speed 1, strength 1, stamina 1, kicking 1, footyIQ 2 | $1830k | $43k | 795 | 7 | 54.4 | W 36-6 Shellharbour Scorpions |
| S3 W24 | balanced | 5 speed 1, strength 1, stamina 2, handling 1 | $1833k | $2.5k | 659 | 6 | 54.4 | L 6-14 Dubbo Diggers |
| S3 W25 final | balanced | 7 speed 3, stamina 1, kicking 1, footyIQ 2 | $1876k | $43k | 724 | 8 | 54.5 | W 12-7 Ballarat Bushrangers |
| S3 W26 final | balanced | 3 speed 3 | $1918k | $43k | 646 | 5 | 54.5 | L 4-8 Mackay Marlins |
| S3 W27 final | balanced | 0 | $1963k | $45k | 0 | 0 | 0.0 | no match |
| S4 trial 1 | balanced | 4 speed 1, strength 1, footyIQ 2 | $1779k | -$184k | 486 | 4 | 41.3 | D 4-4 Broken Hill Brollys |
| S4 trial 2 | balanced | 2 strength 1, stamina 1 | $1792k | $13k | 438 | 3 | 41.2 | L 4-6 Katherine Crocs |
| S4 W1 | balanced | 5 speed 3, strength 1, stamina 1 | $1835k | $43k | 418 | 5 | 41.3 | L 0-10 Launceston Larrikins |
| S4 W2 | balanced | 3 speed 3 | $1840k | $4.7k | 468 | 4 | 41.3 | W 6-0 Darwin Drovers |
| S4 W3 | balanced | 4 strength 2, stamina 1, footyIQ 1 | $1885k | $45k | 482 | 4 | 41.3 | W 10-0 Southport Stingrays |
| S4 W4 | balanced | 4 speed 1, strength 1, stamina 1, kicking 1 | $1887k | $2.7k | 441 | 4 | 41.4 | L 4-10 Broken Hill Brollys |
| S4 W5 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $1932k | $45k | 473 | 5 | 41.4 | W 5-0 Geelong Gulls |
| S4 W6 | balanced | 3 speed 2, strength 1 | $1932k | -$280 | 466 | 4 | 41.4 | W 4-0 Wagga Swagmen |
| S4 W7 | balanced | 6 speed 1, strength 1, stamina 1, footyIQ 3 | $1975k | $43k | 424 | 5 | 41.5 | L 0-12 Katherine Crocs |
| S4 W8 | balanced | 4 strength 1, stamina 1, footyIQ 2 | $1978k | $2.7k | 433 | 4 | 41.5 | D 6-6 Shellharbour Scorpions |
| S4 W9 | balanced | 5 speed 2, strength 2, stamina 1 | $2019k | $41k | 418 | 5 | 41.6 | L 0-4 Dubbo Diggers |
| S4 W10 | balanced | 2 speed 1, strength 1 | $2022k | $2.7k | 418 | 2 | 41.6 | L 0-12 Mackay Marlins |
| S4 W11 | balanced | 3 speed 2, stamina 1 | $2065k | $43k | 418 | 3 | 41.6 | L 0-8 Ballarat Bushrangers |
| S4 W12 | balanced | 4 stamina 1, handling 1, footyIQ 2 | $2067k | $2.7k | 418 | 8 | 41.6 | L 0-6 Cairns Cyclones |
| S4 W13 | balanced | 4 speed 2, strength 2 | $2110k | $43k | 423 | 4 | 41.6 | L 0-4 Toowoomba Thunder |
| S4 W14 | balanced | 5 speed 2, strength 1, stamina 1, kicking 1 | $2113k | $2.7k | 500 | 5 | 41.7 | W 19-6 Woolloomooloo Wolves |
| S4 W15 | balanced | 5 speed 2, footyIQ 3 | $2156k | $43k | 418 | 5 | 41.7 | L 0-4 Redcliffe Reapers |
| S4 W16 | balanced | 3 strength 1, stamina 1, footyIQ 1 | $2159k | $2.8k | 465 | 3 | 41.8 | L 8-12 Launceston Larrikins |
| S4 W17 | balanced | 6 speed 3, strength 2, footyIQ 1 | $2202k | $43k | 456 | 6 | 41.8 | D 10-10 Darwin Drovers |
| S4 W18 | balanced | 4 strength 1, stamina 1, handling 1, footyIQ 1 | $2205k | $2.6k | 484 | 4 | 41.9 | W 14-10 Southport Stingrays |
| S4 W19 | balanced | 3 speed 1, strength 1, stamina 1 | $2248k | $43k | 418 | 3 | 41.9 | D 1-1 Broken Hill Brollys |
| S4 W20 | balanced | 4 speed 1, stamina 2, footyIQ 1 | $2253k | $5.7k | 451 | 4 | 41.9 | W 10-0 Geelong Gulls |
| S4 W21 | balanced | 4 speed 2, strength 1, footyIQ 1 | $2281k | $28k | 391 | 4 | 42.3 | L 0-4 Wagga Swagmen |
| S4 W22 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $2284k | $2.7k | 436 | 5 | 42.3 | D 4-4 Katherine Crocs |
| S4 W23 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, kicking 1 | $2317k | $33k | 453 | 5 | 41.3 | W 13-7 Shellharbour Scorpions |
| S4 W24 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $2319k | $2.7k | 469 | 4 | 41.3 | D 4-4 Dubbo Diggers |
| S4 W25 final | balanced | 0 | $2322k | $2.7k | 91 | 0 | 41.3 | no match |
| S4 W26 final | balanced | 5 speed 2, stamina 1, handling 1, footyIQ 1 | $2325k | $2.7k | 93 | 5 | 41.3 | no match |
| S4 W27 final | balanced | 0 | $2327k | $2.7k | 0 | 0 | 0.0 | no match |
| S5 trial 1 | balanced | 2 speed 1, strength 1 | $2140k | -$187k | 423 | 2 | 41.6 | D 0-0 Katherine Crocs |
| S5 trial 2 | balanced | 5 speed 1, strength 1, stamina 1, footyIQ 2 | $2153k | $13k | 418 | 5 | 41.7 | W 1-0 Mackay Marlins |
| S5 W1 | balanced | 2 speed 1, footyIQ 1 | $2180k | $27k | 410 | 2 | 41.4 | L 4-6 Launceston Larrikins |
| S5 W2 | balanced | 4 strength 2, stamina 2 | $2189k | $9.4k | 435 | 5 | 41.4 | W 4-2 Darwin Drovers |
| S5 W3 | balanced | 3 speed 1, stamina 1, footyIQ 1 | $2232k | $43k | 465 | 3 | 41.4 | W 17-4 Southport Stingrays |
| S5 W4 | balanced | 5 speed 3, strength 1, stamina 1 | $2239k | $7.4k | 438 | 6 | 41.5 | L 8-11 Broken Hill Brollys |
| S5 W5 | balanced | 3 speed 1, stamina 1, handling 1 | $2282k | $43k | 405 | 3 | 41.5 | D 1-1 Geelong Gulls |
| S5 W6 | balanced | 7 speed 3, kicking 1, footyIQ 3 | $2284k | $2.4k | 441 | 6 | 41.6 | W 5-0 Wagga Swagmen |
| S5 W7 | balanced | 2 strength 1, footyIQ 1 | $2327k | $43k | 400 | 3 | 41.6 | L 0-6 Katherine Crocs |
| S5 W8 | balanced | 4 strength 3, handling 1 | $2329k | $2.4k | 435 | 4 | 41.6 | W 6-0 Shellharbour Scorpions |
| S5 W9 | balanced | 5 stamina 4, footyIQ 1 | $2372k | $43k | 413 | 5 | 41.6 | L 6-10 Dubbo Diggers |
| S5 W10 | balanced | 3 speed 2, stamina 1 | $2375k | $2.4k | 415 | 4 | 41.6 | L 4-6 Mackay Marlins |
| S5 W11 | balanced | 3 speed 2, footyIQ 1 | $2417k | $43k | 418 | 3 | 41.7 | W 12-4 Ballarat Bushrangers |
| S5 W12 | balanced | 5 speed 1, strength 2, footyIQ 2 | $2420k | $3.0k | 428 | 5 | 41.7 | L 6-11 Cairns Cyclones |
| S5 W13 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $2463k | $43k | 445 | 5 | 41.7 | W 10-6 Toowoomba Thunder |
| S5 W14 | balanced | 5 speed 3, strength 1, stamina 1 | $2466k | $2.4k | 442 | 5 | 41.8 | W 6-0 Woolloomooloo Wolves |
| S5 W15 | balanced | 3 strength 1, handling 1, footyIQ 1 | $2508k | $43k | 383 | 3 | 41.8 | D 0-0 Redcliffe Reapers |
| S5 W16 | balanced | 4 speed 1, stamina 2, kicking 1 | $2511k | $2.5k | 393 | 4 | 41.8 | L 0-8 Launceston Larrikins |
| S5 W17 | balanced | 2 strength 1, footyIQ 1 | $2557k | $46k | 403 | 2 | 41.8 | L 4-6 Darwin Drovers |
| S5 W18 | balanced | 5 speed 1, strength 2, stamina 2 | $2559k | $2.6k | 421 | 5 | 41.9 | D 6-6 Southport Stingrays |
| S5 W19 | balanced | 4 speed 2, footyIQ 2 | $2602k | $43k | 430 | 4 | 41.9 | W 6-0 Broken Hill Brollys |
| S5 W20 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $2605k | $2.6k | 453 | 5 | 41.9 | W 8-0 Geelong Gulls |
| S5 W21 | balanced | 4 speed 2, strength 2 | $2648k | $43k | 420 | 4 | 42.0 | L 4-6 Wagga Swagmen |
| S5 W22 | balanced | 7 speed 3, strength 1, stamina 2, footyIQ 1 | $2645k | -$2.4k | 438 | 7 | 42.0 | L 10-12 Katherine Crocs |
| S5 W23 | balanced | 2 speed 2 | $2688k | $43k | 403 | 2 | 42.0 | L 4-17 Shellharbour Scorpions |
| S5 W24 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $2691k | $2.6k | 415 | 5 | 42.1 | L 4-6 Dubbo Diggers |
| S5 W25 final | balanced | 0 | $2693k | $2.6k | 89 | 0 | 42.0 | no match |
| S5 W26 final | balanced | 0 | $2696k | $2.6k | 89 | 0 | 42.0 | no match |
| S5 W27 final | balanced | 0 | $2699k | $2.6k | 0 | 0 | 0.0 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $94k | $3.9k | 642 | 0.70 | 53.3 | 59.0 | 0.0% | 40.0% |
| S1 trial 2 | 20 | $98k | $4.5k | 644 | 5.90 | 53.2 | 59.0 | 0.0% | 50.0% |
| S1 W1 | 20 | $124k | $25k | 636 | 4.20 | 53.2 | 59.0 | 0.0% | 50.0% |
| S1 W2 | 20 | $125k | $740 | 632 | 7.55 | 53.3 | 59.1 | 0.0% | 60.0% |
| S1 W3 | 20 | $155k | $30k | 652 | 3.45 | 53.3 | 59.2 | 0.0% | 60.0% |
| S1 W4 | 20 | $156k | $1.2k | 654 | 6.80 | 53.3 | 59.3 | 0.0% | 75.0% |
| S1 W5 | 20 | $184k | $28k | 657 | 8.20 | 53.4 | 59.4 | 0.0% | 65.0% |
| S1 W6 | 20 | $183k | -$360 | 652 | 7.00 | 53.5 | 59.6 | 0.0% | 65.0% |
| S1 W7 | 20 | $213k | $30k | 663 | 4.10 | 53.5 | 59.7 | 0.0% | 40.0% |
| S1 W8 | 20 | $215k | $1.6k | 650 | 9.40 | 53.6 | 59.8 | 0.0% | 55.0% |
| S1 W9 | 20 | $244k | $30k | 660 | 4.45 | 53.6 | 59.9 | 0.0% | 75.0% |
| S1 W10 | 20 | $246k | $1.3k | 654 | 7.00 | 53.7 | 60.0 | 0.0% | 60.0% |
| S1 W11 | 20 | $274k | $28k | 653 | 4.45 | 53.7 | 60.3 | 0.0% | 55.0% |
| S1 W12 | 20 | $276k | $1.5k | 651 | 9.55 | 53.8 | 60.4 | 0.0% | 50.0% |
| S1 W13 | 20 | $307k | $32k | 656 | 4.45 | 53.8 | 60.5 | 0.0% | 50.0% |
| S1 W14 | 20 | $309k | $1.6k | 655 | 8.05 | 53.9 | 60.6 | 0.0% | 65.0% |
| S1 W15 | 20 | $341k | $32k | 651 | 6.65 | 54.0 | 60.7 | 0.0% | 60.0% |
| S1 W16 | 20 | $340k | -$262 | 648 | 6.25 | 54.0 | 60.9 | 0.0% | 40.0% |
| S1 W17 | 20 | $371k | $31k | 640 | 4.40 | 54.1 | 61.0 | 0.0% | 35.0% |
| S1 W18 | 20 | $372k | $1.1k | 658 | 10.45 | 54.2 | 61.1 | 0.0% | 65.0% |
| S1 W19 | 20 | $400k | $28k | 659 | 4.35 | 54.2 | 61.2 | 0.0% | 60.0% |
| S1 W20 | 20 | $401k | $116 | 651 | 5.70 | 54.2 | 61.4 | 0.0% | 35.0% |
| S1 W21 | 20 | $428k | $27k | 658 | 6.00 | 54.3 | 61.5 | 0.0% | 35.0% |
| S1 W22 | 20 | $429k | $1.4k | 663 | 8.15 | 54.4 | 61.7 | 0.0% | 80.0% |
| S1 W23 | 20 | $457k | $28k | 662 | 4.75 | 54.4 | 61.9 | 0.0% | 80.0% |
| S1 W24 | 20 | $458k | $1.4k | 659 | 6.20 | 54.5 | 62.0 | 0.0% | 70.0% |
| S1 W25 final | 20 | $487k | $29k | 644 | 8.10 | 54.6 | 62.1 | 0.0% | 73.7% |
| S1 W26 final | 20 | $509k | $22k | 529 | 4.90 | 54.6 | 62.2 | 0.0% | 57.1% |
| S1 W27 final | 20 | $594k | $85k | 264 | 2.05 | 55.0 | 58.1 | 0.0% | 87.5% |
| S2 trial 1 | 20 | $582k | -$12k | 548 | 5.55 | 53.5 | 58.2 | 0.0% | 55.0% |
| S2 trial 2 | 20 | $587k | $5.3k | 564 | 5.10 | 53.5 | 58.2 | 0.0% | 65.0% |
| S2 W1 | 20 | $620k | $33k | 549 | 6.15 | 53.4 | 58.4 | 0.0% | 65.0% |
| S2 W2 | 20 | $620k | $127 | 549 | 6.10 | 53.5 | 58.5 | 0.0% | 55.0% |
| S2 W3 | 20 | $659k | $39k | 562 | 5.45 | 53.6 | 58.7 | 0.0% | 50.0% |
| S2 W4 | 20 | $660k | $1.5k | 566 | 5.35 | 53.6 | 58.8 | 0.0% | 70.0% |
| S2 W5 | 20 | $697k | $37k | 554 | 6.20 | 53.7 | 58.9 | 0.0% | 55.0% |
| S2 W6 | 20 | $698k | $1.4k | 585 | 5.00 | 53.7 | 59.0 | 0.0% | 65.0% |
| S2 W7 | 20 | $735k | $37k | 570 | 5.10 | 53.8 | 59.2 | 0.0% | 65.0% |
| S2 W8 | 20 | $736k | $706 | 560 | 5.60 | 53.9 | 59.4 | 0.0% | 75.0% |
| S2 W9 | 20 | $772k | $36k | 567 | 6.65 | 54.0 | 59.5 | 0.0% | 50.0% |
| S2 W10 | 20 | $774k | $2.0k | 562 | 5.00 | 54.0 | 59.6 | 0.0% | 55.0% |
| S2 W11 | 20 | $812k | $38k | 561 | 5.65 | 54.1 | 59.8 | 0.0% | 75.0% |
| S2 W12 | 20 | $814k | $2.3k | 566 | 6.30 | 54.2 | 59.9 | 0.0% | 80.0% |
| S2 W13 | 20 | $853k | $39k | 559 | 5.40 | 54.2 | 60.0 | 0.0% | 60.0% |
| S2 W14 | 20 | $853k | -$425 | 561 | 5.15 | 54.4 | 60.3 | 0.0% | 55.0% |
| S2 W15 | 20 | $892k | $40k | 570 | 6.80 | 54.5 | 60.4 | 0.0% | 50.0% |
| S2 W16 | 20 | $893k | $1.2k | 564 | 5.10 | 54.5 | 60.5 | 0.0% | 40.0% |
| S2 W17 | 20 | $931k | $38k | 565 | 5.40 | 54.5 | 60.6 | 0.0% | 50.0% |
| S2 W18 | 20 | $933k | $2.0k | 583 | 5.75 | 54.6 | 60.7 | 0.0% | 65.0% |
| S2 W19 | 20 | $969k | $36k | 576 | 5.75 | 54.7 | 60.8 | 0.0% | 70.0% |
| S2 W20 | 20 | $970k | $960 | 571 | 5.30 | 54.8 | 61.0 | 0.0% | 65.0% |
| S2 W21 | 20 | $1008k | $38k | 574 | 5.90 | 54.8 | 61.2 | 0.0% | 65.0% |
| S2 W22 | 20 | $1010k | $1.4k | 583 | 6.10 | 54.9 | 61.3 | 0.0% | 80.0% |
| S2 W23 | 20 | $1048k | $39k | 562 | 5.15 | 54.9 | 61.4 | 0.0% | 60.0% |
| S2 W24 | 20 | $1051k | $2.5k | 573 | 5.05 | 55.0 | 61.5 | 0.0% | 75.0% |
| S2 W25 final | 20 | $1085k | $34k | 516 | 5.95 | 55.1 | 61.6 | 0.0% | 76.5% |
| S2 W26 final | 20 | $1112k | $26k | 415 | 3.80 | 55.1 | 61.7 | 0.0% | 69.2% |
| S2 W27 final | 20 | $1178k | $67k | 158 | 1.90 | 57.6 | 57.8 | 0.0% | 44.4% |
| S3 trial 1 | 20 | $1112k | -$66k | 529 | 3.85 | 48.6 | 53.9 | 0.0% | 65.0% |
| S3 trial 2 | 20 | $1116k | $4.1k | 564 | 4.95 | 48.6 | 54.0 | 0.0% | 70.0% |
| S3 W1 | 20 | $1153k | $37k | 549 | 5.65 | 48.6 | 54.1 | 0.0% | 55.0% |
| S3 W2 | 20 | $1154k | $1.3k | 555 | 5.15 | 48.6 | 54.2 | 0.0% | 65.0% |
| S3 W3 | 20 | $1194k | $40k | 555 | 6.00 | 48.7 | 54.3 | 0.0% | 50.0% |
| S3 W4 | 20 | $1195k | $1.5k | 563 | 4.90 | 48.7 | 54.4 | 0.0% | 70.0% |
| S3 W5 | 20 | $1234k | $38k | 562 | 6.65 | 48.8 | 54.5 | 0.0% | 65.0% |
| S3 W6 | 20 | $1236k | $2.4k | 557 | 4.75 | 48.9 | 54.6 | 0.0% | 70.0% |
| S3 W7 | 20 | $1276k | $40k | 550 | 5.20 | 48.9 | 54.7 | 0.0% | 55.0% |
| S3 W8 | 20 | $1278k | $2.0k | 555 | 6.80 | 48.9 | 54.8 | 0.0% | 65.0% |
| S3 W9 | 20 | $1319k | $41k | 549 | 4.45 | 49.0 | 54.9 | 0.0% | 65.0% |
| S3 W10 | 20 | $1322k | $2.3k | 548 | 6.00 | 49.1 | 55.0 | 0.0% | 50.0% |
| S3 W11 | 20 | $1360k | $39k | 549 | 4.15 | 49.2 | 55.2 | 0.0% | 50.0% |
| S3 W12 | 20 | $1362k | $1.7k | 552 | 7.45 | 49.2 | 55.3 | 0.0% | 50.0% |
| S3 W13 | 20 | $1398k | $36k | 553 | 4.30 | 49.3 | 55.7 | 0.0% | 75.0% |
| S3 W14 | 20 | $1400k | $1.4k | 561 | 6.15 | 49.3 | 55.8 | 0.0% | 50.0% |
| S3 W15 | 20 | $1440k | $40k | 534 | 5.15 | 49.4 | 55.8 | 0.0% | 35.0% |
| S3 W16 | 20 | $1442k | $2.2k | 554 | 5.45 | 49.5 | 55.9 | 0.0% | 55.0% |
| S3 W17 | 20 | $1482k | $40k | 553 | 5.40 | 49.5 | 56.0 | 0.0% | 55.0% |
| S3 W18 | 20 | $1483k | $686 | 550 | 5.65 | 49.6 | 56.2 | 0.0% | 40.0% |
| S3 W19 | 20 | $1520k | $37k | 561 | 5.35 | 49.7 | 56.3 | 0.0% | 50.0% |
| S3 W20 | 20 | $1522k | $1.9k | 558 | 5.30 | 49.7 | 56.4 | 0.0% | 55.0% |
| S3 W21 | 20 | $1562k | $40k | 564 | 6.20 | 49.8 | 56.5 | 0.0% | 60.0% |
| S3 W22 | 20 | $1565k | $2.6k | 570 | 5.20 | 49.9 | 56.6 | 0.0% | 65.0% |
| S3 W23 | 20 | $1604k | $39k | 572 | 6.50 | 50.0 | 56.8 | 0.0% | 65.0% |
| S3 W24 | 20 | $1605k | $1.3k | 560 | 5.05 | 50.0 | 56.9 | 0.0% | 50.0% |
| S3 W25 final | 20 | $1636k | $31k | 465 | 4.90 | 50.0 | 57.0 | 0.0% | 66.7% |
| S3 W26 final | 20 | $1655k | $19k | 326 | 3.30 | 50.1 | 57.1 | 0.0% | 10.0% |
| S3 W27 final | 20 | $1689k | $34k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 100.0% |
| S4 trial 1 | 19 | $1563k | -$167k | 542 | 3.89 | 42.2 | 45.6 | 0.0% | 31.6% |
| S4 trial 2 | 19 | $1570k | $7.0k | 553 | 4.79 | 42.2 | 45.6 | 0.0% | 26.3% |
| S4 W1 | 19 | $1612k | $41k | 553 | 5.47 | 42.3 | 45.7 | 0.0% | 47.4% |
| S4 W2 | 19 | $1612k | $118 | 550 | 5.05 | 42.4 | 46.0 | 0.0% | 36.8% |
| S4 W3 | 19 | $1651k | $39k | 547 | 5.42 | 42.6 | 46.2 | 0.0% | 26.3% |
| S4 W4 | 19 | $1651k | $101 | 553 | 5.58 | 42.7 | 46.4 | 0.0% | 36.8% |
| S4 W5 | 19 | $1691k | $40k | 560 | 6.37 | 42.8 | 46.5 | 0.0% | 47.4% |
| S4 W6 | 19 | $1694k | $2.7k | 556 | 4.42 | 42.8 | 46.6 | 0.0% | 47.4% |
| S4 W7 | 19 | $1733k | $40k | 561 | 5.42 | 42.9 | 46.7 | 0.0% | 26.3% |
| S4 W8 | 19 | $1736k | $2.9k | 554 | 5.89 | 43.0 | 46.8 | 0.0% | 36.8% |
| S4 W9 | 19 | $1778k | $41k | 551 | 4.79 | 43.0 | 46.9 | 0.0% | 26.3% |
| S4 W10 | 19 | $1778k | $681 | 560 | 5.79 | 43.1 | 47.0 | 0.0% | 42.1% |
| S4 W11 | 19 | $1819k | $41k | 558 | 5.11 | 43.1 | 47.1 | 0.0% | 31.6% |
| S4 W12 | 19 | $1821k | $2.4k | 549 | 7.42 | 43.2 | 47.2 | 0.0% | 36.8% |
| S4 W13 | 19 | $1861k | $40k | 556 | 4.95 | 43.2 | 47.4 | 0.0% | 31.6% |
| S4 W14 | 19 | $1863k | $1.8k | 555 | 5.79 | 43.3 | 47.5 | 0.0% | 26.3% |
| S4 W15 | 19 | $1904k | $41k | 563 | 5.79 | 43.3 | 47.6 | 0.0% | 42.1% |
| S4 W16 | 19 | $1906k | $2.2k | 565 | 5.32 | 43.4 | 47.7 | 0.0% | 36.8% |
| S4 W17 | 19 | $1944k | $38k | 566 | 5.37 | 43.6 | 48.0 | 0.0% | 31.6% |
| S4 W18 | 19 | $1947k | $2.3k | 557 | 5.74 | 43.7 | 48.1 | 0.0% | 26.3% |
| S4 W19 | 19 | $1987k | $40k | 558 | 5.26 | 43.8 | 48.2 | 0.0% | 0.0% |
| S4 W20 | 19 | $1989k | $2.6k | 560 | 4.95 | 43.8 | 48.3 | 0.0% | 36.8% |
| S4 W21 | 19 | $2029k | $39k | 563 | 6.37 | 43.9 | 48.5 | 0.0% | 42.1% |
| S4 W22 | 19 | $2030k | $1.5k | 560 | 5.32 | 44.0 | 48.7 | 0.0% | 36.8% |
| S4 W23 | 19 | $2069k | $39k | 564 | 5.42 | 44.0 | 48.8 | 0.0% | 63.2% |
| S4 W24 | 19 | $2071k | $2.0k | 567 | 5.05 | 44.1 | 48.9 | 0.0% | 47.4% |
| S4 W25 final | 19 | $2079k | $7.3k | 233 | 3.05 | 44.1 | 48.9 | 0.0% | 40.0% |
| S4 W26 final | 19 | $2084k | $4.9k | 174 | 3.05 | 44.1 | 49.0 | 0.0% | 100.0% |
| S4 W27 final | 19 | $2102k | $18k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 50.0% |
| S5 trial 1 | 14 | $1996k | -$122k | 549 | 2.21 | 40.4 | 43.6 | 0.0% | 14.3% |
| S5 trial 2 | 14 | $2004k | $8.5k | 636 | 6.07 | 40.4 | 43.7 | 0.0% | 42.9% |
| S5 W1 | 14 | $2044k | $40k | 636 | 7.43 | 40.5 | 43.8 | 0.0% | 50.0% |
| S5 W2 | 14 | $2046k | $2.2k | 643 | 4.43 | 40.5 | 43.9 | 0.0% | 50.0% |
| S5 W3 | 14 | $2084k | $38k | 630 | 6.93 | 40.8 | 44.3 | 0.0% | 35.7% |
| S5 W4 | 14 | $2087k | $2.4k | 636 | 6.07 | 40.9 | 44.4 | 0.0% | 21.4% |
| S5 W5 | 14 | $2127k | $40k | 641 | 8.00 | 41.0 | 44.6 | 0.0% | 42.9% |
| S5 W6 | 14 | $2130k | $3.2k | 635 | 4.86 | 41.0 | 44.7 | 0.0% | 35.7% |
| S5 W7 | 14 | $2172k | $42k | 638 | 5.50 | 41.1 | 44.8 | 0.0% | 42.9% |
| S5 W8 | 14 | $2172k | $535 | 629 | 6.86 | 41.1 | 44.9 | 0.0% | 50.0% |
| S5 W9 | 14 | $2213k | $41k | 647 | 6.36 | 41.2 | 45.1 | 0.0% | 50.0% |
| S5 W10 | 14 | $2216k | $2.6k | 640 | 6.57 | 41.3 | 45.2 | 0.0% | 28.6% |
| S5 W11 | 14 | $2257k | $41k | 641 | 5.21 | 41.4 | 45.3 | 0.0% | 42.9% |
| S5 W12 | 14 | $2259k | $2.5k | 637 | 8.50 | 41.5 | 45.5 | 0.0% | 21.4% |
| S5 W13 | 14 | $2300k | $41k | 649 | 6.43 | 41.7 | 45.8 | 0.0% | 64.3% |
| S5 W14 | 14 | $2302k | $1.3k | 641 | 6.07 | 41.9 | 46.1 | 0.0% | 28.6% |
| S5 W15 | 14 | $2343k | $42k | 629 | 5.93 | 42.0 | 46.2 | 0.0% | 14.3% |
| S5 W16 | 14 | $2346k | $2.5k | 632 | 6.29 | 42.0 | 46.3 | 0.0% | 35.7% |
| S5 W17 | 14 | $2386k | $40k | 636 | 6.43 | 42.2 | 46.6 | 0.0% | 28.6% |
| S5 W18 | 14 | $2388k | $2.7k | 644 | 6.21 | 42.3 | 46.8 | 0.0% | 35.7% |
| S5 W19 | 14 | $2427k | $39k | 635 | 6.14 | 42.4 | 46.9 | 0.0% | 35.7% |
| S5 W20 | 14 | $2428k | $1.3k | 641 | 5.57 | 42.4 | 47.0 | 0.0% | 35.7% |
| S5 W21 | 14 | $2468k | $40k | 645 | 7.50 | 42.5 | 47.2 | 0.0% | 35.7% |
| S5 W22 | 14 | $2468k | -$734 | 643 | 6.43 | 42.7 | 47.5 | 0.0% | 21.4% |
| S5 W23 | 14 | $2509k | $41k | 649 | 6.14 | 42.8 | 47.6 | 0.0% | 28.6% |
| S5 W24 | 14 | $2510k | $1.6k | 652 | 6.21 | 42.9 | 47.7 | 0.0% | 42.9% |
| S5 W25 final | 14 | $2513k | $2.9k | 320 | 4.00 | 43.0 | 48.0 | 0.0% | 20.0% |
| S5 W26 final | 14 | $2519k | $5.6k | 193 | 2.43 | 43.1 | 48.1 | 0.0% | 0.0% |
| S5 W27 final | 14 | $2528k | $9.6k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × rush | 2280 | 56.4% | 73 | 61.0% | -4.6% |  |
| balanced × slide | 73 | 61.0% | 2280 | 56.4% | 4.6% |  |

### newcomer/normal/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 186 of 400; median 24.5 weeks among those who did.
- Reaching potential stars: 171 of 400 (95 already there at week 0); median 48.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/249; S3 0/0; S5 0/0.
- Mean XP per completed season 16431; mean level-ups per completed season 160.2.
- Cash: opening 60000; mean weekly change 15812; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 83; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $1359k after opening at $60k, and no career went into debt.
- WARNING: cash climbs by $16k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 52754 |
| gate | 443916 |
| prize | 30542 |
| boardGrant | 6988 |
| events | -7629 |
| transfers | -68033 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $68k | $7.5k | 914 | 3 | 49.3 | W 20-11 Dubbo Diggers |
| S1 trial 2 | balanced | 3 strength 1, stamina 1, kicking 1 | $69k | $1.2k | 845 | 7 | 49.4 | W 12-0 Wagga Swagmen |
| S1 W1 | balanced | 5 strength 2, stamina 1, kicking 1, footyIQ 1 | $95k | $26k | 838 | 8 | 49.4 | W 6-0 Launceston Larrikins |
| S1 W2 | balanced | 6 strength 2, stamina 1, handling 1, footyIQ 2 | $96k | $1.2k | 798 | 7 | 49.4 | L 6-14 Darwin Drovers |
| S1 W3 | balanced | 7 strength 2, stamina 2, kicking 1, footyIQ 2 | $128k | $31k | 855 | 9 | 49.5 | L 4-14 Southport Stingrays |
| S1 W4 | balanced | 6 strength 1, stamina 1, handling 1, footyIQ 3 | $131k | $3.2k | 914 | 8 | 49.6 | W 8-0 Broken Hill Brollys |
| S1 W5 | balanced | 10 speed 1, strength 3, stamina 1, handling 1, kicking 1, footyIQ 3 | $164k | $33k | 981 | 13 | 49.7 | W 22-0 Geelong Gulls |
| S1 W6 | balanced | 8 speed 1, strength 2, stamina 2, handling 1, footyIQ 2 | $166k | $1.2k | 959 | 8 | 49.7 | W 21-11 Wagga Swagmen |
| S1 W7 | balanced | 7 speed 1, strength 3, kicking 1, footyIQ 2 | $199k | $33k | 902 | 7 | 49.8 | W 6-0 Katherine Crocs |
| S1 W8 | balanced | 10 speed 1, strength 2, stamina 2, handling 1, footyIQ 4 | $200k | $1.2k | 905 | 10 | 49.9 | W 8-0 Shellharbour Scorpions |
| S1 W9 | balanced | 9 speed 2, strength 1, stamina 1, kicking 2, footyIQ 3 | $232k | $33k | 930 | 9 | 50.0 | W 16-4 Dubbo Diggers |
| S1 W10 | balanced | 9 speed 3, strength 4, kicking 1, footyIQ 1 | $234k | $1.2k | 891 | 9 | 50.1 | W 6-0 Mackay Marlins |
| S1 W11 | balanced | 7 speed 1, strength 2, stamina 2, handling 1, footyIQ 1 | $240k | $6.6k | 916 | 8 | 51.1 | W 10-4 Ballarat Bushrangers |
| S1 W12 | balanced | 9 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $241k | $1.2k | 861 | 9 | 51.2 | L 4-5 Cairns Cyclones |
| S1 W13 | balanced | 8 speed 2, strength 2, handling 1, kicking 1, footyIQ 2 | $277k | $36k | 927 | 9 | 51.2 | W 12-6 Toowoomba Thunder |
| S1 W14 | balanced | 11 speed 3, strength 2, stamina 1, handling 1, footyIQ 4 | $279k | $1.2k | 839 | 11 | 51.3 | W 7-6 Woolloomooloo Wolves |
| S1 W15 | balanced | 8 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $310k | $32k | 834 | 8 | 51.4 | L 0-10 Redcliffe Reapers |
| S1 W16 | balanced | 7 speed 1, strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $312k | $1.2k | 883 | 7 | 51.5 | W 6-0 Launceston Larrikins |
| S1 W17 | balanced | 7 strength 3, stamina 1, handling 1, footyIQ 2 | $346k | $34k | 842 | 7 | 51.5 | L 6-10 Darwin Drovers |
| S1 W18 | balanced | 10 speed 4, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $347k | $1.2k | 898 | 10 | 51.6 | W 12-4 Southport Stingrays |
| S1 W19 | balanced | 7 speed 1, strength 1, stamina 1, kicking 1, footyIQ 3 | $375k | $28k | 823 | 7 | 51.7 | L 0-1 Broken Hill Brollys |
| S1 W20 | balanced | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $376k | $1.2k | 813 | 9 | 51.7 | D 1-1 Geelong Gulls |
| S1 W21 | balanced | 9 speed 2, strength 2, stamina 1, handling 1, kicking 2, footyIQ 1 | $403k | $27k | 922 | 9 | 51.8 | W 12-6 Wagga Swagmen |
| S1 W22 | balanced | 8 speed 1, strength 1, stamina 2, handling 2, kicking 1, footyIQ 1 | $405k | $1.2k | 918 | 8 | 51.9 | W 16-9 Katherine Crocs |
| S1 W23 | balanced | 9 speed 5, strength 2, handling 1, footyIQ 1 | $434k | $30k | 939 | 9 | 52.0 | W 14-8 Shellharbour Scorpions |
| S1 W24 | balanced | 9 speed 1, strength 1, handling 1, kicking 1, footyIQ 5 | $436k | $1.2k | 918 | 10 | 52.1 | D 6-6 Dubbo Diggers |
| S1 W25 final | balanced | 11 speed 2, strength 3, stamina 3, kicking 1, footyIQ 2 | $479k | $43k | 819 | 10 | 52.2 | L 7-10 Mackay Marlins |
| S1 W26 final | balanced | 4 speed 1, stamina 1, footyIQ 2 | $480k | $1.2k | 219 | 0 | 52.2 | no match |
| S1 W27 final | balanced | 2 speed 1, handling 1 | $517k | $37k | 194 | 2 | 52.6 | no match |
| S2 trial 1 | balanced | 8 speed 2, strength 1, stamina 1, kicking 1, footyIQ 3 | $518k | $1.6k | 816 | 9 | 52.6 | W 17-6 Mackay Marlins |
| S2 trial 2 | balanced | 7 speed 1, strength 2, stamina 1, handling 2, footyIQ 1 | $528k | $9.3k | 738 | 9 | 52.7 | D 6-6 Katherine Crocs |
| S2 W1 | balanced | 5 speed 2, strength 1, stamina 1, kicking 1 | $560k | $32k | 796 | 4 | 52.8 | W 8-0 Launceston Larrikins |
| S2 W2 | balanced | 7 speed 1, strength 1, stamina 1, handling 1, footyIQ 3 | $562k | $1.6k | 710 | 7 | 52.8 | L 0-10 Darwin Drovers |
| S2 W3 | balanced | 10 speed 3, strength 3, kicking 1, footyIQ 3 | $600k | $39k | 788 | 10 | 53.0 | W 6-4 Southport Stingrays |
| S2 W4 | balanced | 6 stamina 3, handling 1, footyIQ 2 | $602k | $1.6k | 696 | 6 | 53.0 | L 0-10 Broken Hill Brollys |
| S2 W5 | balanced | 9 speed 3, strength 1, kicking 1, footyIQ 4 | $634k | $32k | 800 | 9 | 53.1 | W 12-0 Geelong Gulls |
| S2 W6 | balanced | 7 speed 4, strength 1, handling 1, footyIQ 1 | $636k | $1.6k | 770 | 7 | 53.2 | L 10-12 Wagga Swagmen |
| S2 W7 | balanced | 7 speed 1, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $670k | $35k | 837 | 7 | 53.3 | W 18-4 Katherine Crocs |
| S2 W8 | balanced | 7 strength 1, stamina 1, handling 2, kicking 1, footyIQ 2 | $672k | $1.6k | 780 | 7 | 53.4 | L 8-15 Shellharbour Scorpions |
| S2 W9 | balanced | 10 speed 3, strength 3, stamina 2, handling 1, footyIQ 1 | $704k | $32k | 800 | 13 | 53.5 | W 5-1 Dubbo Diggers |
| S2 W10 | balanced | 8 speed 2, strength 2, stamina 1, handling 2, footyIQ 1 | $705k | $1.6k | 811 | 8 | 53.6 | W 8-0 Mackay Marlins |
| S2 W11 | balanced | 7 speed 1, strength 2, stamina 1, kicking 2, footyIQ 1 | $746k | $41k | 839 | 7 | 53.6 | W 12-4 Ballarat Bushrangers |
| S2 W12 | balanced | 8 speed 2, stamina 2, footyIQ 4 | $740k | -$6.4k | 761 | 8 | 53.7 | L 10-27 Cairns Cyclones |
| S2 W13 | balanced | 9 speed 3, strength 2, handling 2, footyIQ 2 | $781k | $41k | 746 | 9 | 53.8 | L 6-14 Toowoomba Thunder |
| S2 W14 | balanced | 6 speed 1, stamina 1, kicking 2, footyIQ 2 | $783k | $1.6k | 754 | 6 | 53.9 | L 6-15 Woolloomooloo Wolves |
| S2 W15 | balanced | 8 strength 3, stamina 3, footyIQ 2 | $822k | $39k | 759 | 8 | 54.0 | D 6-6 Redcliffe Reapers |
| S2 W16 | balanced | 8 speed 4, stamina 1, handling 1, footyIQ 2 | $824k | $1.7k | 749 | 8 | 54.1 | L 6-8 Launceston Larrikins |
| S2 W17 | balanced | 6 speed 1, stamina 1, handling 2, footyIQ 2 | $857k | $33k | 739 | 6 | 54.2 | L 4-10 Darwin Drovers |
| S2 W18 | balanced | 7 strength 3, kicking 2, footyIQ 2 | $858k | $1.7k | 776 | 7 | 54.2 | W 13-8 Southport Stingrays |
| S2 W19 | balanced | 9 speed 4, strength 1, stamina 3, footyIQ 1 | $896k | $37k | 890 | 10 | 54.3 | W 26-6 Broken Hill Brollys |
| S2 W20 | balanced | 7 speed 3, stamina 1, handling 1, kicking 1, footyIQ 1 | $897k | $1.8k | 816 | 6 | 54.4 | W 14-4 Geelong Gulls |
| S2 W21 | balanced | 9 speed 3, strength 1, handling 1, footyIQ 4 | $941k | $44k | 713 | 9 | 54.5 | L 0-4 Wagga Swagmen |
| S2 W22 | balanced | 5 speed 1, strength 1, handling 1, kicking 1, footyIQ 1 | $940k | -$1.2k | 704 | 5 | 54.6 | L 0-20 Katherine Crocs |
| S2 W23 | balanced | 9 speed 2, strength 3, stamina 1, handling 2, footyIQ 1 | $979k | $39k | 869 | 9 | 54.7 | W 27-8 Shellharbour Scorpions |
| S2 W24 | balanced | 7 stamina 3, handling 1, kicking 1, footyIQ 2 | $981k | $1.8k | 713 | 7 | 54.7 | L 0-8 Dubbo Diggers |
| S2 W25 final | balanced | 11 speed 4, strength 3, stamina 1, handling 1, kicking 1, footyIQ 1 | $983k | $2.5k | 830 | 11 | 54.9 | W 24-4 Cairns Cyclones |
| S2 W26 final | balanced | 6 speed 1, strength 1, stamina 1, handling 1, footyIQ 2 | $985k | $1.9k | 772 | 6 | 54.9 | W 7-6 Darwin Drovers |
| S2 W27 final | balanced | 6 speed 1, strength 1, kicking 1, footyIQ 3 | $1142k | $157k | 576 | 7 | 58.7 | W 13-8 Toowoomba Thunder |
| S3 trial 1 | balanced | 5 speed 1, strength 1, stamina 2, handling 1 | $1095k | -$47k | 653 | 5 | 54.0 | L 4-14 Toowoomba Thunder |
| S3 trial 2 | balanced | 7 speed 3, stamina 1, handling 1, kicking 1, footyIQ 1 | $1098k | $2.5k | 719 | 6 | 54.1 | W 11-4 Shellharbour Scorpions |
| S3 W1 | balanced | 8 speed 1, strength 2, kicking 1, footyIQ 4 | $1142k | $45k | 701 | 8 | 54.2 | D 14-14 Launceston Larrikins |
| S3 W2 | balanced | 7 speed 3, strength 2, stamina 1, handling 1 | $1145k | $2.4k | 750 | 8 | 54.4 | W 18-12 Darwin Drovers |
| S3 W3 | balanced | 4 stamina 2, handling 1, kicking 1 | $1189k | $44k | 676 | 4 | 54.4 | D 7-7 Southport Stingrays |
| S3 W4 | balanced | 8 speed 3, stamina 3, kicking 1, footyIQ 1 | $1196k | $7.4k | 699 | 8 | 54.5 | W 18-10 Broken Hill Brollys |
| S3 W5 | balanced | 10 speed 3, strength 2, handling 1, footyIQ 4 | $1241k | $44k | 745 | 11 | 54.7 | W 22-0 Geelong Gulls |
| S3 W6 | balanced | 5 speed 1, strength 1, handling 1, kicking 1, footyIQ 1 | $1243k | $2.4k | 669 | 5 | 54.8 | D 6-6 Wagga Swagmen |
| S3 W7 | balanced | 5 strength 1, stamina 1, handling 1, kicking 1, footyIQ 1 | $1288k | $44k | 736 | 6 | 54.9 | W 19-7 Katherine Crocs |
| S3 W8 | balanced | 8 speed 3, stamina 1, handling 1, footyIQ 3 | $1290k | $2.4k | 738 | 9 | 55.0 | W 17-4 Shellharbour Scorpions |
| S3 W9 | balanced | 5 speed 2, handling 1, kicking 1, footyIQ 1 | $1334k | $44k | 703 | 6 | 55.1 | W 16-12 Dubbo Diggers |
| S3 W10 | balanced | 4 strength 1, kicking 1, footyIQ 2 | $1337k | $2.4k | 669 | 6 | 55.1 | D 14-14 Mackay Marlins |
| S3 W11 | balanced | 8 speed 2, strength 1, stamina 1, handling 1, footyIQ 3 | $1381k | $44k | 763 | 9 | 55.2 | W 29-0 Ballarat Bushrangers |
| S3 W12 | balanced | 6 speed 2, strength 1, stamina 1, kicking 1, footyIQ 1 | $1384k | $2.4k | 714 | 7 | 55.3 | W 18-4 Cairns Cyclones |
| S3 W13 | balanced | 8 speed 2, stamina 2, handling 1, kicking 1, footyIQ 2 | $1431k | $47k | 721 | 8 | 55.5 | W 11-0 Toowoomba Thunder |
| S3 W14 | balanced | 6 speed 1, strength 1, stamina 1, handling 2, footyIQ 1 | $1434k | $2.5k | 709 | 7 | 55.6 | W 8-4 Woolloomooloo Wolves |
| S3 W15 | balanced | 5 speed 2, stamina 1, kicking 1, footyIQ 1 | $1476k | $42k | 667 | 6 | 55.6 | L 10-12 Redcliffe Reapers |
| S3 W16 | balanced | 4 speed 2, handling 1, footyIQ 1 | $1479k | $2.5k | 766 | 5 | 55.7 | W 32-6 Launceston Larrikins |
| S3 W17 | balanced | 6 speed 1, strength 1, handling 2, kicking 1, footyIQ 1 | $1523k | $44k | 708 | 7 | 55.8 | W 23-0 Darwin Drovers |
| S3 W18 | balanced | 8 speed 1, strength 2, stamina 1, kicking 1, footyIQ 3 | $1511k | -$12k | 729 | 9 | 54.8 | D 10-10 Southport Stingrays |
| S3 W19 | balanced | 5 speed 2, stamina 1, handling 1, footyIQ 1 | $1556k | $45k | 698 | 6 | 54.8 | W 12-7 Broken Hill Brollys |
| S3 W20 | balanced | 5 speed 2, stamina 1, kicking 1, footyIQ 1 | $1559k | $2.5k | 663 | 5 | 54.9 | L 4-7 Geelong Gulls |
| S3 W21 | balanced | 10 speed 2, strength 3, handling 1, footyIQ 4 | $1600k | $42k | 707 | 12 | 55.0 | W 16-12 Wagga Swagmen |
| S3 W22 | balanced | 6 strength 2, stamina 1, handling 1, kicking 1, footyIQ 1 | $1603k | $2.5k | 783 | 7 | 55.1 | W 27-10 Katherine Crocs |
| S3 W23 | balanced | 4 speed 2, stamina 1, kicking 1 | $1647k | $45k | 711 | 5 | 55.2 | W 12-8 Shellharbour Scorpions |
| S3 W24 | balanced | 8 speed 2, stamina 2, handling 1, kicking 1, footyIQ 2 | $1650k | $2.5k | 662 | 9 | 55.3 | L 6-12 Dubbo Diggers |
| S3 W25 final | balanced | 5 speed 2, handling 1, footyIQ 2 | $1694k | $45k | 783 | 6 | 55.4 | W 22-10 Toowoomba Thunder |
| S3 W26 final | balanced | 5 speed 1, strength 2, kicking 1, footyIQ 1 | $1739k | $45k | 762 | 7 | 55.4 | W 22-0 Cairns Cyclones |
| S3 W27 final | balanced | 0 | $1948k | $210k | 0 | 0 | 0.0 | W 7-6 Redcliffe Reapers |
| S4 trial 1 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, footyIQ 3 | $1724k | -$225k | 638 | 8 | 46.6 | W 10-0 Dubbo Diggers |
| S4 trial 2 | balanced | 3 speed 2, strength 1 | $1738k | $14k | 556 | 4 | 46.6 | L 4-13 Katherine Crocs |
| S4 W1 | balanced | 4 speed 2, strength 1, footyIQ 1 | $1783k | $45k | 537 | 6 | 46.7 | L 0-6 Launceston Larrikins |
| S4 W2 | balanced | 5 strength 2, stamina 2, handling 1 | $1786k | $3.3k | 636 | 8 | 46.7 | W 12-8 Darwin Drovers |
| S4 W3 | balanced | 3 speed 1, stamina 1, handling 1 | $1816k | $30k | 548 | 4 | 46.9 | L 7-16 Southport Stingrays |
| S4 W4 | balanced | 3 stamina 1, handling 1, footyIQ 1 | $1819k | $3.3k | 618 | 6 | 46.9 | W 8-6 Broken Hill Brollys |
| S4 W5 | balanced | 6 speed 1, strength 1, handling 2, footyIQ 2 | $1864k | $45k | 558 | 7 | 47.0 | L 6-16 Geelong Gulls |
| S4 W6 | balanced | 2 strength 1, stamina 1 | $1870k | $5.3k | 624 | 5 | 47.0 | W 12-10 Wagga Swagmen |
| S4 W7 | balanced | 5 speed 2, strength 1, handling 1, footyIQ 1 | $1915k | $45k | 530 | 6 | 47.1 | L 0-17 Katherine Crocs |
| S4 W8 | balanced | 4 speed 1, strength 1, handling 1, footyIQ 1 | $1918k | $3.3k | 660 | 6 | 47.1 | D 10-10 Shellharbour Scorpions |
| S4 W9 | balanced | 7 strength 3, stamina 4 | $1964k | $45k | 608 | 8 | 47.2 | W 10-6 Dubbo Diggers |
| S4 W10 | balanced | 3 speed 2, footyIQ 1 | $1967k | $3.3k | 530 | 4 | 47.2 | L 0-6 Mackay Marlins |
| S4 W11 | balanced | 5 speed 1, stamina 1, handling 1, footyIQ 2 | $2012k | $45k | 534 | 5 | 47.3 | L 4-12 Ballarat Bushrangers |
| S4 W12 | balanced | 4 strength 3, handling 1 | $2016k | $3.4k | 599 | 6 | 47.3 | W 10-6 Cairns Cyclones |
| S4 W13 | balanced | 4 speed 1, stamina 1, kicking 1, footyIQ 1 | $2061k | $45k | 640 | 6 | 47.4 | W 20-4 Toowoomba Thunder |
| S4 W14 | balanced | 2 footyIQ 2 | $2065k | $3.4k | 529 | 3 | 47.4 | L 4-13 Woolloomooloo Wolves |
| S4 W15 | balanced | 8 speed 4, strength 2, stamina 1, handling 1 | $2110k | $45k | 621 | 9 | 47.5 | W 10-6 Redcliffe Reapers |
| S4 W16 | balanced | 5 speed 3, handling 1, footyIQ 1 | $2114k | $3.4k | 542 | 6 | 47.6 | L 4-10 Launceston Larrikins |
| S4 W17 | balanced | 4 speed 1, stamina 1, footyIQ 2 | $2159k | $45k | 531 | 6 | 47.6 | D 0-0 Darwin Drovers |
| S4 W18 | balanced | 4 strength 1, handling 1, footyIQ 2 | $2162k | $3.3k | 640 | 5 | 47.7 | W 10-7 Southport Stingrays |
| S4 W19 | balanced | 5 speed 1, strength 1, stamina 1, handling 2 | $2208k | $45k | 598 | 7 | 47.7 | W 11-0 Broken Hill Brollys |
| S4 W20 | balanced | 1 speed 1 | $2211k | $3.3k | 539 | 2 | 47.7 | L 0-7 Geelong Gulls |
| S4 W21 | balanced | 6 speed 2, strength 1, stamina 1, footyIQ 2 | $2256k | $45k | 620 | 8 | 47.8 | W 8-7 Wagga Swagmen |
| S4 W22 | balanced | 3 strength 2, stamina 1 | $2260k | $3.4k | 567 | 4 | 47.8 | L 6-7 Katherine Crocs |
| S4 W23 | balanced | 7 speed 3, strength 1, stamina 1, handling 1, kicking 1 | $2305k | $45k | 566 | 8 | 47.9 | L 4-12 Shellharbour Scorpions |
| S4 W24 | balanced | 3 speed 1, footyIQ 2 | $2300k | -$4.6k | 540 | 4 | 48.0 | L 0-1 Dubbo Diggers |
| S4 W25 final | balanced | 2 strength 1, footyIQ 1 | $2304k | $3.4k | 126 | 2 | 48.0 | no match |
| S4 W26 final | balanced | 1 footyIQ 1 | $2307k | $3.4k | 126 | 1 | 48.0 | no match |
| S4 W27 final | balanced | 0 | $2311k | $3.4k | 0 | 0 | 0.0 | no match |
| S5 trial 1 | balanced | 5 strength 1, stamina 2, footyIQ 2 | $2082k | -$229k | 557 | 4 | 49.9 | W 6-4 Toowoomba Thunder |
| S5 trial 2 | balanced | 5 speed 3, strength 2 | $2085k | $3.2k | 536 | 6 | 50.0 | D 0-0 Katherine Crocs |
| S5 W1 | balanced | 2 stamina 1, footyIQ 1 | $2130k | $45k | 547 | 4 | 50.0 | W 8-4 Launceston Larrikins |
| S5 W2 | balanced | 5 speed 1, strength 1, handling 2, footyIQ 1 | $2134k | $3.2k | 624 | 7 | 50.0 | W 20-15 Darwin Drovers |
| S5 W3 | balanced | 3 speed 1, stamina 1, handling 1 | $2179k | $45k | 539 | 4 | 50.1 | L 10-12 Southport Stingrays |
| S5 W4 | balanced | 6 speed 2, strength 1, footyIQ 3 | $2182k | $3.2k | 478 | 6 | 49.2 | L 4-12 Broken Hill Brollys |
| S5 W5 | balanced | 5 speed 3, strength 1, footyIQ 1 | $2227k | $45k | 523 | 6 | 49.3 | L 0-6 Geelong Gulls |
| S5 W6 | balanced | 5 strength 2, stamina 2, handling 1 | $2231k | $3.3k | 605 | 7 | 49.3 | W 4-0 Wagga Swagmen |
| S5 W7 | balanced | 2 stamina 1, handling 1 | $2281k | $50k | 575 | 5 | 49.4 | L 4-18 Katherine Crocs |
| S5 W8 | balanced | 4 speed 2, stamina 1, footyIQ 1 | $2284k | $3.3k | 559 | 5 | 49.4 | W 6-4 Shellharbour Scorpions |
| S5 W9 | balanced | 5 handling 1, kicking 1, footyIQ 3 | $2329k | $45k | 546 | 6 | 49.5 | L 4-6 Dubbo Diggers |
| S5 W10 | balanced | 3 speed 1, strength 1, handling 1 | $2333k | $3.3k | 616 | 4 | 49.5 | W 10-5 Mackay Marlins |
| S5 W11 | balanced | 4 speed 1, strength 1, stamina 1, footyIQ 1 | $2378k | $45k | 625 | 5 | 49.5 | W 10-4 Ballarat Bushrangers |
| S5 W12 | balanced | 5 speed 1, handling 1, footyIQ 3 | $2381k | $3.3k | 536 | 6 | 49.6 | L 0-13 Cairns Cyclones |
| S5 W13 | balanced | 6 speed 3, strength 1, stamina 1, footyIQ 1 | $2427k | $45k | 542 | 7 | 49.7 | D 0-0 Toowoomba Thunder |
| S5 W14 | balanced | 6 speed 1, strength 1, stamina 2, handling 2 | $2430k | $3.3k | 590 | 8 | 49.8 | W 6-1 Woolloomooloo Wolves |
| S5 W15 | balanced | 4 speed 2, strength 1, handling 1 | $2482k | $52k | 589 | 5 | 49.8 | W 12-0 Redcliffe Reapers |
| S5 W16 | balanced | 5 speed 1, strength 2, stamina 1, footyIQ 1 | $2485k | $3.3k | 631 | 6 | 49.9 | W 8-0 Launceston Larrikins |
| S5 W17 | balanced | 3 stamina 1, footyIQ 2 | $2531k | $45k | 564 | 4 | 49.9 | L 4-6 Darwin Drovers |
| S5 W18 | balanced | 3 speed 2, footyIQ 1 | $2534k | $3.2k | 545 | 4 | 49.9 | L 4-10 Southport Stingrays |
| S5 W19 | balanced | 5 strength 1, handling 2, footyIQ 2 | $2576k | $42k | 527 | 6 | 50.0 | L 7-8 Broken Hill Brollys |
| S5 W20 | balanced | 5 speed 2, strength 2, footyIQ 1 | $2579k | $3.2k | 526 | 6 | 50.0 | L 0-10 Geelong Gulls |
| S5 W21 | balanced | 4 speed 2, stamina 2 | $2628k | $48k | 535 | 5 | 50.1 | L 6-7 Wagga Swagmen |
| S5 W22 | balanced | 8 speed 1, strength 2, stamina 1, handling 2, kicking 1, footyIQ 1 | $2631k | $3.3k | 628 | 9 | 50.2 | W 11-4 Katherine Crocs |
| S5 W23 | balanced | 2 speed 1, strength 1 | $2676k | $45k | 555 | 3 | 50.2 | L 4-10 Shellharbour Scorpions |
| S5 W24 | balanced | 6 speed 1, strength 1, stamina 2, footyIQ 2 | $2680k | $3.3k | 593 | 8 | 50.3 | D 16-16 Dubbo Diggers |
| S5 W25 final | balanced | 1 footyIQ 1 | $2683k | $3.3k | 130 | 0 | 50.3 | no match |
| S5 W26 final | balanced | 0 | $2681k | -$1.7k | 130 | 0 | 50.3 | no match |
| S5 W27 final | balanced | 0 | $2684k | $3.3k | 0 | 0 | 0.0 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $64k | $4.0k | 645 | 0.65 | 49.5 | 55.4 | 0.0% | 45.0% |
| S1 trial 2 | 20 | $69k | $4.7k | 634 | 5.65 | 49.4 | 55.4 | 0.0% | 40.0% |
| S1 W1 | 20 | $95k | $26k | 647 | 4.30 | 49.4 | 55.5 | 0.0% | 70.0% |
| S1 W2 | 20 | $96k | $740 | 641 | 8.10 | 49.5 | 55.6 | 0.0% | 35.0% |
| S1 W3 | 20 | $126k | $30k | 643 | 3.35 | 49.5 | 55.6 | 0.0% | 35.0% |
| S1 W4 | 20 | $127k | $958 | 639 | 6.50 | 49.5 | 55.7 | 0.0% | 55.0% |
| S1 W5 | 20 | $155k | $28k | 645 | 7.95 | 49.6 | 55.9 | 0.0% | 55.0% |
| S1 W6 | 20 | $155k | -$372 | 640 | 7.15 | 49.7 | 56.1 | 0.0% | 55.0% |
| S1 W7 | 20 | $183k | $28k | 648 | 3.60 | 49.7 | 56.2 | 0.0% | 50.0% |
| S1 W8 | 20 | $184k | $1.6k | 648 | 9.80 | 49.8 | 56.3 | 0.0% | 55.0% |
| S1 W9 | 20 | $213k | $29k | 651 | 3.80 | 49.8 | 56.4 | 0.0% | 55.0% |
| S1 W10 | 20 | $214k | $1.2k | 642 | 7.05 | 49.9 | 56.5 | 0.0% | 55.0% |
| S1 W11 | 20 | $244k | $29k | 642 | 4.25 | 49.9 | 56.7 | 0.0% | 30.0% |
| S1 W12 | 20 | $245k | $1.5k | 649 | 9.50 | 50.0 | 56.9 | 0.0% | 35.0% |
| S1 W13 | 20 | $276k | $31k | 640 | 4.25 | 50.0 | 56.9 | 0.0% | 30.0% |
| S1 W14 | 20 | $278k | $1.6k | 642 | 8.45 | 50.1 | 57.1 | 0.0% | 45.0% |
| S1 W15 | 20 | $308k | $30k | 647 | 6.45 | 50.2 | 57.2 | 0.0% | 35.0% |
| S1 W16 | 20 | $308k | $45 | 658 | 6.15 | 50.2 | 57.4 | 0.0% | 55.0% |
| S1 W17 | 20 | $338k | $30k | 634 | 4.05 | 50.3 | 57.5 | 0.0% | 40.0% |
| S1 W18 | 20 | $339k | $1.1k | 647 | 10.95 | 50.4 | 57.6 | 0.0% | 55.0% |
| S1 W19 | 20 | $367k | $28k | 661 | 3.95 | 50.4 | 57.7 | 0.0% | 70.0% |
| S1 W20 | 20 | $369k | $1.4k | 639 | 5.90 | 50.4 | 57.8 | 0.0% | 40.0% |
| S1 W21 | 20 | $397k | $29k | 660 | 6.10 | 50.5 | 58.0 | 0.0% | 65.0% |
| S1 W22 | 20 | $399k | $1.4k | 669 | 8.00 | 50.6 | 58.2 | 0.0% | 60.0% |
| S1 W23 | 20 | $428k | $29k | 658 | 4.70 | 50.7 | 58.4 | 0.0% | 60.0% |
| S1 W24 | 20 | $429k | $1.4k | 656 | 6.30 | 50.7 | 58.5 | 0.0% | 45.0% |
| S1 W25 final | 20 | $443k | $14k | 525 | 6.30 | 50.8 | 58.8 | 0.0% | 64.3% |
| S1 W26 final | 20 | $460k | $16k | 390 | 4.20 | 50.8 | 58.8 | 0.0% | 55.6% |
| S1 W27 final | 20 | $524k | $64k | 201 | 1.40 | 51.1 | 54.2 | 0.0% | 100.0% |
| S2 trial 1 | 20 | $510k | -$13k | 546 | 5.75 | 50.0 | 54.4 | 0.0% | 45.0% |
| S2 trial 2 | 20 | $516k | $5.5k | 538 | 5.30 | 50.0 | 54.5 | 0.0% | 30.0% |
| S2 W1 | 20 | $549k | $33k | 560 | 5.05 | 50.1 | 54.6 | 0.0% | 80.0% |
| S2 W2 | 20 | $548k | -$762 | 533 | 7.20 | 50.2 | 54.8 | 0.0% | 30.0% |
| S2 W3 | 20 | $582k | $35k | 556 | 4.95 | 50.2 | 54.9 | 0.0% | 45.0% |
| S2 W4 | 20 | $583k | $183 | 547 | 4.60 | 50.3 | 55.0 | 0.0% | 40.0% |
| S2 W5 | 20 | $617k | $35k | 562 | 6.95 | 50.3 | 55.2 | 0.0% | 75.0% |
| S2 W6 | 20 | $619k | $1.7k | 554 | 4.80 | 50.4 | 55.3 | 0.0% | 50.0% |
| S2 W7 | 20 | $654k | $35k | 547 | 5.00 | 50.4 | 55.5 | 0.0% | 60.0% |
| S2 W8 | 20 | $655k | $325 | 540 | 4.95 | 50.5 | 55.6 | 0.0% | 30.0% |
| S2 W9 | 20 | $690k | $36k | 559 | 6.40 | 50.6 | 55.8 | 0.0% | 65.0% |
| S2 W10 | 20 | $692k | $1.6k | 550 | 5.30 | 50.6 | 55.9 | 0.0% | 40.0% |
| S2 W11 | 20 | $728k | $36k | 563 | 5.55 | 50.7 | 56.0 | 0.0% | 65.0% |
| S2 W12 | 20 | $729k | $1.0k | 551 | 5.60 | 50.7 | 56.1 | 0.0% | 40.0% |
| S2 W13 | 20 | $766k | $37k | 558 | 5.65 | 50.8 | 56.2 | 0.0% | 40.0% |
| S2 W14 | 20 | $766k | $544 | 559 | 5.40 | 50.9 | 56.4 | 0.0% | 65.0% |
| S2 W15 | 20 | $804k | $38k | 545 | 6.45 | 51.0 | 56.5 | 0.0% | 20.0% |
| S2 W16 | 20 | $805k | $1.5k | 560 | 5.55 | 51.1 | 56.6 | 0.0% | 50.0% |
| S2 W17 | 20 | $841k | $36k | 554 | 4.65 | 51.1 | 56.7 | 0.0% | 55.0% |
| S2 W18 | 20 | $842k | $1.5k | 553 | 6.15 | 51.2 | 56.8 | 0.0% | 55.0% |
| S2 W19 | 20 | $878k | $35k | 561 | 5.05 | 51.2 | 56.9 | 0.0% | 40.0% |
| S2 W20 | 20 | $879k | $945 | 564 | 5.35 | 51.3 | 57.2 | 0.0% | 65.0% |
| S2 W21 | 20 | $915k | $37k | 546 | 5.50 | 51.4 | 57.3 | 0.0% | 35.0% |
| S2 W22 | 20 | $917k | $1.7k | 548 | 6.30 | 51.5 | 57.4 | 0.0% | 40.0% |
| S2 W23 | 20 | $953k | $36k | 564 | 4.40 | 51.4 | 57.5 | 0.0% | 55.0% |
| S2 W24 | 20 | $954k | $1.3k | 558 | 5.55 | 51.5 | 57.7 | 0.0% | 55.0% |
| S2 W25 final | 20 | $976k | $22k | 443 | 4.65 | 51.5 | 57.7 | 0.0% | 64.3% |
| S2 W26 final | 20 | $987k | $11k | 318 | 3.20 | 51.6 | 57.8 | 0.0% | 55.6% |
| S2 W27 final | 20 | $1036k | $49k | 139 | 1.80 | 53.4 | 53.6 | 0.0% | 60.0% |
| S3 trial 1 | 20 | $987k | -$50k | 539 | 3.35 | 46.3 | 50.8 | 0.0% | 65.0% |
| S3 trial 2 | 20 | $990k | $3.3k | 580 | 5.55 | 46.3 | 50.9 | 0.0% | 40.0% |
| S3 W1 | 20 | $1026k | $36k | 572 | 6.75 | 46.4 | 51.0 | 0.0% | 45.0% |
| S3 W2 | 20 | $1025k | -$912 | 579 | 4.85 | 46.5 | 51.1 | 0.0% | 45.0% |
| S3 W3 | 20 | $1061k | $36k | 566 | 6.25 | 46.6 | 51.3 | 0.0% | 30.0% |
| S3 W4 | 20 | $1063k | $2.7k | 559 | 4.85 | 46.6 | 51.4 | 0.0% | 30.0% |
| S3 W5 | 20 | $1101k | $38k | 580 | 7.35 | 46.8 | 51.5 | 0.0% | 55.0% |
| S3 W6 | 20 | $1102k | $1.3k | 568 | 4.30 | 46.8 | 51.6 | 0.0% | 30.0% |
| S3 W7 | 20 | $1139k | $37k | 578 | 5.20 | 46.8 | 51.7 | 0.0% | 45.0% |
| S3 W8 | 20 | $1140k | $1.2k | 575 | 6.15 | 46.9 | 51.8 | 0.0% | 50.0% |
| S3 W9 | 20 | $1178k | $38k | 575 | 5.50 | 47.0 | 52.0 | 0.0% | 50.0% |
| S3 W10 | 20 | $1180k | $2.1k | 580 | 6.35 | 47.0 | 52.0 | 0.0% | 45.0% |
| S3 W11 | 20 | $1214k | $34k | 584 | 5.05 | 47.2 | 52.4 | 0.0% | 60.0% |
| S3 W12 | 20 | $1215k | $859 | 577 | 7.15 | 47.3 | 52.6 | 0.0% | 40.0% |
| S3 W13 | 20 | $1250k | $35k | 586 | 5.00 | 47.5 | 52.9 | 0.0% | 55.0% |
| S3 W14 | 20 | $1251k | $1.4k | 580 | 6.50 | 47.6 | 53.0 | 0.0% | 65.0% |
| S3 W15 | 20 | $1291k | $40k | 584 | 5.30 | 47.6 | 53.1 | 0.0% | 35.0% |
| S3 W16 | 20 | $1293k | $1.8k | 582 | 5.25 | 47.7 | 53.2 | 0.0% | 30.0% |
| S3 W17 | 20 | $1332k | $39k | 587 | 6.35 | 47.8 | 53.3 | 0.0% | 50.0% |
| S3 W18 | 20 | $1333k | $1.1k | 591 | 6.20 | 47.8 | 53.4 | 0.0% | 50.0% |
| S3 W19 | 20 | $1371k | $38k | 574 | 5.40 | 47.9 | 53.5 | 0.0% | 40.0% |
| S3 W20 | 20 | $1373k | $2.1k | 589 | 4.90 | 47.9 | 53.6 | 0.0% | 50.0% |
| S3 W21 | 20 | $1407k | $34k | 582 | 6.85 | 48.0 | 53.9 | 0.0% | 50.0% |
| S3 W22 | 20 | $1409k | $2.3k | 587 | 5.35 | 48.1 | 54.0 | 0.0% | 25.0% |
| S3 W23 | 20 | $1444k | $35k | 590 | 5.90 | 48.2 | 54.2 | 0.0% | 55.0% |
| S3 W24 | 20 | $1447k | $2.3k | 597 | 6.00 | 48.3 | 54.3 | 0.0% | 45.0% |
| S3 W25 final | 20 | $1461k | $14k | 370 | 4.10 | 48.3 | 54.4 | 0.0% | 72.7% |
| S3 W26 final | 20 | $1470k | $9.3k | 316 | 2.80 | 48.3 | 54.5 | 0.0% | 62.5% |
| S3 W27 final | 20 | $1528k | $58k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | 80.0% |
| S4 trial 1 | 15 | $1538k | -$146k | 594 | 3.00 | 42.5 | 45.2 | 0.0% | 46.7% |
| S4 trial 2 | 15 | $1545k | $6.9k | 643 | 6.07 | 42.5 | 45.3 | 0.0% | 33.3% |
| S4 W1 | 15 | $1585k | $40k | 625 | 7.53 | 42.6 | 45.4 | 0.0% | 13.3% |
| S4 W2 | 15 | $1588k | $2.3k | 644 | 4.80 | 42.7 | 45.5 | 0.0% | 40.0% |
| S4 W3 | 15 | $1627k | $40k | 632 | 6.67 | 42.8 | 45.6 | 0.0% | 13.3% |
| S4 W4 | 15 | $1629k | $2.0k | 636 | 6.53 | 42.9 | 45.7 | 0.0% | 33.3% |
| S4 W5 | 15 | $1666k | $37k | 627 | 8.33 | 43.1 | 46.1 | 0.0% | 26.7% |
| S4 W6 | 15 | $1669k | $2.6k | 643 | 4.60 | 43.2 | 46.2 | 0.0% | 40.0% |
| S4 W7 | 15 | $1709k | $40k | 632 | 5.40 | 43.2 | 46.3 | 0.0% | 20.0% |
| S4 W8 | 15 | $1709k | $683 | 650 | 7.07 | 43.2 | 46.4 | 0.0% | 33.3% |
| S4 W9 | 15 | $1747k | $38k | 645 | 6.13 | 43.3 | 46.6 | 0.0% | 26.7% |
| S4 W10 | 15 | $1750k | $2.6k | 642 | 7.13 | 43.4 | 46.7 | 0.0% | 40.0% |
| S4 W11 | 15 | $1789k | $39k | 631 | 4.87 | 43.5 | 46.8 | 0.0% | 6.7% |
| S4 W12 | 15 | $1791k | $1.7k | 642 | 7.80 | 43.6 | 47.0 | 0.0% | 46.7% |
| S4 W13 | 15 | $1832k | $41k | 638 | 6.20 | 43.7 | 47.1 | 0.0% | 13.3% |
| S4 W14 | 15 | $1834k | $2.0k | 648 | 7.00 | 43.8 | 47.2 | 0.0% | 33.3% |
| S4 W15 | 15 | $1875k | $41k | 645 | 5.60 | 43.8 | 47.3 | 0.0% | 26.7% |
| S4 W16 | 15 | $1877k | $2.4k | 644 | 6.67 | 43.9 | 47.5 | 0.0% | 33.3% |
| S4 W17 | 15 | $1918k | $40k | 642 | 6.53 | 44.1 | 47.7 | 0.0% | 20.0% |
| S4 W18 | 15 | $1919k | $1.3k | 661 | 6.40 | 44.2 | 47.8 | 0.0% | 46.7% |
| S4 W19 | 15 | $1959k | $40k | 633 | 6.07 | 44.2 | 47.9 | 0.0% | 13.3% |
| S4 W20 | 15 | $1961k | $2.2k | 638 | 6.33 | 44.3 | 48.0 | 0.0% | 20.0% |
| S4 W21 | 15 | $2002k | $41k | 642 | 7.20 | 44.5 | 48.2 | 0.0% | 26.7% |
| S4 W22 | 15 | $2004k | $2.3k | 647 | 5.67 | 44.5 | 48.3 | 0.0% | 33.3% |
| S4 W23 | 15 | $2045k | $41k | 645 | 7.07 | 44.6 | 48.4 | 0.0% | 20.0% |
| S4 W24 | 15 | $2045k | $472 | 652 | 5.60 | 44.7 | 48.5 | 0.0% | 40.0% |
| S4 W25 final | 15 | $2051k | $5.8k | 228 | 1.93 | 44.7 | 48.6 | 0.0% | 33.3% |
| S4 W26 final | 15 | $2053k | $2.1k | 174 | 2.60 | 44.8 | 48.6 | 0.0% | 0.0% |
| S4 W27 final | 15 | $2060k | $6.9k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |
| S5 trial 1 | 8 | $1978k | -$153k | 567 | 2.88 | 42.8 | 45.3 | 0.0% | 50.0% |
| S5 trial 2 | 8 | $1990k | $11k | 611 | 6.25 | 42.8 | 45.4 | 0.0% | 25.0% |
| S5 W1 | 8 | $2032k | $43k | 602 | 6.50 | 42.9 | 45.5 | 0.0% | 25.0% |
| S5 W2 | 8 | $2032k | -$675 | 611 | 5.38 | 43.0 | 45.7 | 0.0% | 25.0% |
| S5 W3 | 8 | $2074k | $42k | 607 | 5.75 | 43.1 | 45.8 | 0.0% | 25.0% |
| S5 W4 | 8 | $2075k | $1.2k | 591 | 5.88 | 43.0 | 45.9 | 0.0% | 12.5% |
| S5 W5 | 8 | $2113k | $38k | 609 | 7.50 | 43.4 | 46.4 | 0.0% | 37.5% |
| S5 W6 | 8 | $2116k | $2.5k | 614 | 5.25 | 43.4 | 46.4 | 0.0% | 25.0% |
| S5 W7 | 8 | $2155k | $39k | 618 | 4.88 | 43.5 | 46.5 | 0.0% | 25.0% |
| S5 W8 | 8 | $2158k | $2.5k | 623 | 7.50 | 43.6 | 46.7 | 0.0% | 50.0% |
| S5 W9 | 8 | $2201k | $43k | 611 | 5.63 | 43.7 | 46.8 | 0.0% | 25.0% |
| S5 W10 | 8 | $2203k | $1.8k | 616 | 6.25 | 43.7 | 46.9 | 0.0% | 25.0% |
| S5 W11 | 8 | $2245k | $42k | 620 | 5.63 | 43.8 | 47.0 | 0.0% | 37.5% |
| S5 W12 | 8 | $2247k | $2.5k | 609 | 6.75 | 43.9 | 47.1 | 0.0% | 12.5% |
| S5 W13 | 8 | $2289k | $42k | 610 | 6.38 | 44.0 | 47.2 | 0.0% | 25.0% |
| S5 W14 | 8 | $2292k | $3.1k | 628 | 7.13 | 44.1 | 47.3 | 0.0% | 50.0% |
| S5 W15 | 8 | $2336k | $44k | 613 | 5.25 | 44.2 | 47.4 | 0.0% | 25.0% |
| S5 W16 | 8 | $2338k | $1.5k | 615 | 5.88 | 44.3 | 47.5 | 0.0% | 12.5% |
| S5 W17 | 8 | $2379k | $41k | 607 | 6.13 | 44.3 | 47.6 | 0.0% | 12.5% |
| S5 W18 | 8 | $2381k | $2.1k | 619 | 6.13 | 44.4 | 47.8 | 0.0% | 50.0% |
| S5 W19 | 8 | $2420k | $39k | 615 | 6.00 | 44.7 | 48.2 | 0.0% | 25.0% |
| S5 W20 | 8 | $2423k | $2.8k | 615 | 6.00 | 44.8 | 48.4 | 0.0% | 50.0% |
| S5 W21 | 8 | $2465k | $42k | 614 | 6.50 | 44.9 | 48.5 | 0.0% | 25.0% |
| S5 W22 | 8 | $2467k | $2.2k | 624 | 6.13 | 45.0 | 48.6 | 0.0% | 25.0% |
| S5 W23 | 8 | $2508k | $41k | 621 | 6.00 | 45.1 | 48.7 | 0.0% | 25.0% |
| S5 W24 | 8 | $2510k | $2.5k | 614 | 6.38 | 45.2 | 48.8 | 0.0% | 12.5% |
| S5 W25 final | 8 | $2513k | $2.5k | 145 | 1.00 | 45.2 | 48.8 | 0.0% | n/a |
| S5 W26 final | 8 | $2511k | -$2.0k | 146 | 1.75 | 45.3 | 49.1 | 0.0% | n/a |
| S5 W27 final | 8 | $2513k | $2.5k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1379 | 47.2% | 697 | 51.1% | -3.9% |  |
| balanced × slide | 697 | 51.1% | 1379 | 47.2% | 3.9% |  |

### newcomer/hard/au

- 70 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 80 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- 90 overall (best nine, including recruitment): n/a weeks; 0 reached, 20 censored.
- Opening players gaining a star: 204 of 400; median 33.0 weeks among those who did.
- Reaching potential stars: 138 of 400 (92 already there at week 0); median 70.0 weeks among those who got there later.
- Stat ceilings at the season rollover: S1 0/257; S3 0/0; S5 0/0.
- Mean XP per completed season 14703; mean level-ups per completed season 143.3.
- Cash: opening 45000; mean weekly change 12680; mean weeks in debt 0.0.
- Bankruptcy warnings: 0; forced sales: 0; sacked with missed solvency objective: 0.
- Save round-trips: 73; repairs: 0; unrecoverable: 0.
- Crashes: 0; thrown ticks: 0; invariant failures: 0; non-finite numbers: 0.
- WARNING: money looks easy. Completed seasons end about $992k after opening at $45k, and no career went into debt.
- WARNING: cash climbs by $13k a week on average (threshold $5,000).

| Mean completed-season finance line | $ |
| --- | --- |
| wages | 0 |
| upkeep | 0 |
| overhead | 0 |
| sponsor | 0 |
| grant | 42965 |
| gate | 381718 |
| prize | 9370 |
| boardGrant | 5753 |
| events | -7450 |
| transfers | -64627 |
| contracts | 0 |
| facilities | 0 |
| other | 0 |

Weekly diary for seed 7919. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.

| Wk | Focus | Points | Cash | Change | XP | Levels | Squad | Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | balanced | 0 | $53k | $7.5k | 518 | 0 | 45.0 | L 6-8 Dubbo Diggers |
| S1 trial 2 | balanced | 0 | $54k | $1.2k | 539 | 3 | 45.0 | L 8-10 Wagga Swagmen |
| S1 W1 | balanced | 2 strength 1, kicking 1 | $80k | $26k | 560 | 4 | 44.9 | W 14-12 Launceston Larrikins |
| S1 W2 | balanced | 4 strength 1, kicking 1, footyIQ 2 | $83k | $3.2k | 551 | 7 | 45.0 | W 14-10 Darwin Drovers |
| S1 W3 | balanced | 3 strength 1, stamina 1, footyIQ 1 | $120k | $36k | 548 | 3 | 45.0 | W 16-4 Southport Stingrays |
| S1 W4 | balanced | 4 kicking 1, footyIQ 3 | $123k | $3.2k | 548 | 5 | 45.0 | W 8-4 Broken Hill Brollys |
| S1 W5 | balanced | 6 strength 3, handling 1, footyIQ 2 | $162k | $39k | 550 | 9 | 45.0 | W 8-0 Geelong Gulls |
| S1 W6 | balanced | 3 kicking 1, footyIQ 2 | $164k | $1.2k | 544 | 6 | 45.0 | W 16-13 Wagga Swagmen |
| S1 W7 | balanced | 3 stamina 1, footyIQ 2 | $203k | $39k | 535 | 3 | 45.1 | W 10-7 Katherine Crocs |
| S1 W8 | balanced | 7 strength 2, stamina 1, kicking 1, footyIQ 3 | $204k | $1.2k | 516 | 7 | 45.1 | L 4-6 Shellharbour Scorpions |
| S1 W9 | balanced | 2 footyIQ 2 | $234k | $30k | 517 | 2 | 45.1 | L 4-10 Dubbo Diggers |
| S1 W10 | balanced | 6 speed 1, strength 2, handling 1, kicking 1, footyIQ 1 | $235k | $1.2k | 535 | 6 | 45.2 | W 10-4 Mackay Marlins |
| S1 W11 | balanced | 4 speed 1, strength 1, footyIQ 2 | $230k | -$4.7k | 586 | 4 | 46.4 | W 22-0 Ballarat Bushrangers |
| S1 W12 | balanced | 7 strength 3, stamina 2, handling 1, footyIQ 1 | $232k | $1.2k | 533 | 7 | 46.4 | L 6-8 Cairns Cyclones |
| S1 W13 | balanced | 3 speed 1, strength 1, kicking 1 | $262k | $30k | 537 | 3 | 46.4 | L 0-10 Toowoomba Thunder |
| S1 W14 | balanced | 8 speed 3, stamina 1, footyIQ 4 | $263k | $1.2k | 587 | 9 | 46.5 | W 14-4 Woolloomooloo Wolves |
| S1 W15 | balanced | 5 speed 1, strength 1, handling 1, footyIQ 2 | $292k | $29k | 530 | 6 | 46.5 | L 10-13 Redcliffe Reapers |
| S1 W16 | balanced | 5 speed 1, strength 2, stamina 1, kicking 1 | $293k | $1.2k | 519 | 5 | 46.5 | L 4-12 Launceston Larrikins |
| S1 W17 | balanced | 3 strength 1, footyIQ 2 | $320k | $28k | 537 | 3 | 46.6 | W 4-0 Darwin Drovers |
| S1 W18 | balanced | 9 speed 3, strength 1, stamina 2, footyIQ 3 | $322k | $1.2k | 557 | 9 | 46.6 | W 14-12 Southport Stingrays |
| S1 W19 | balanced | 2 strength 1, handling 1 | $350k | $28k | 540 | 2 | 46.6 | W 10-0 Broken Hill Brollys |
| S1 W20 | balanced | 4 speed 2, strength 1, kicking 1 | $351k | $1.2k | 518 | 5 | 46.6 | W 5-0 Geelong Gulls |
| S1 W21 | balanced | 5 speed 2, footyIQ 3 | $382k | $31k | 563 | 5 | 46.7 | W 16-8 Wagga Swagmen |
| S1 W22 | balanced | 9 speed 3, strength 2, stamina 2, handling 1, footyIQ 1 | $383k | $1.2k | 558 | 9 | 46.8 | W 14-4 Katherine Crocs |
| S1 W23 | balanced | 3 speed 1, handling 1, footyIQ 1 | $417k | $34k | 540 | 3 | 46.8 | D 8-8 Shellharbour Scorpions |
| S1 W24 | balanced | 5 speed 2, stamina 1, kicking 1, footyIQ 1 | $418k | $1.2k | 522 | 5 | 46.8 | L 4-12 Dubbo Diggers |
| S1 W25 final | balanced | 6 speed 1, strength 3, stamina 1, footyIQ 1 | $462k | $43k | 493 | 6 | 46.8 | L 0-13 Katherine Crocs |
| S1 W26 final | balanced | 0 | $463k | $1.2k | 153 | 0 | 46.8 | no match |
| S1 W27 final | balanced | 0 | $507k | $44k | 132 | 0 | 43.5 | no match |
| S2 trial 1 | balanced | 5 speed 2, stamina 1, footyIQ 2 | $508k | $1.5k | 519 | 5 | 43.6 | L 0-5 Toowoomba Thunder |
| S2 trial 2 | balanced | 5 speed 2, strength 2, footyIQ 1 | $517k | $9.1k | 524 | 5 | 43.6 | D 0-0 Dubbo Diggers |
| S2 W1 | balanced | 6 strength 1, stamina 2, handling 1, footyIQ 2 | $549k | $32k | 625 | 7 | 43.7 | W 23-14 Launceston Larrikins |
| S2 W2 | balanced | 6 speed 2, strength 1, stamina 1, kicking 1, footyIQ 1 | $551k | $1.5k | 522 | 7 | 43.8 | D 0-0 Darwin Drovers |
| S2 W3 | balanced | 6 speed 1, strength 1, footyIQ 4 | $590k | $40k | 519 | 6 | 43.8 | W 6-4 Southport Stingrays |
| S2 W4 | balanced | 6 speed 1, strength 1, stamina 2, handling 1, footyIQ 1 | $592k | $1.5k | 527 | 6 | 43.9 | L 4-10 Broken Hill Brollys |
| S2 W5 | balanced | 4 speed 2, strength 1, stamina 1 | $625k | $33k | 526 | 4 | 43.9 | W 4-0 Geelong Gulls |
| S2 W6 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $626k | $1.5k | 524 | 5 | 44.0 | L 6-12 Wagga Swagmen |
| S2 W7 | balanced | 5 speed 2, kicking 1, footyIQ 2 | $662k | $35k | 511 | 5 | 44.0 | L 2-6 Katherine Crocs |
| S2 W8 | balanced | 4 strength 1, footyIQ 3 | $663k | $1.6k | 537 | 4 | 44.0 | W 6-0 Shellharbour Scorpions |
| S2 W9 | balanced | 5 speed 1, strength 2, stamina 1, handling 1 | $694k | $31k | 537 | 6 | 44.1 | L 4-10 Dubbo Diggers |
| S2 W10 | balanced | 6 speed 2, strength 1, stamina 2, handling 1 | $696k | $1.6k | 526 | 6 | 44.2 | L 0-16 Mackay Marlins |
| S2 W11 | balanced | 4 speed 2, strength 1, kicking 1 | $729k | $33k | 507 | 4 | 44.2 | L 0-22 Ballarat Bushrangers |
| S2 W12 | balanced | 5 strength 1, stamina 1, footyIQ 3 | $732k | $3.6k | 565 | 5 | 44.2 | W 10-4 Cairns Cyclones |
| S2 W13 | balanced | 6 speed 2, strength 2, stamina 1, footyIQ 1 | $769k | $37k | 516 | 6 | 44.3 | L 0-19 Toowoomba Thunder |
| S2 W14 | balanced | 6 strength 1, stamina 3, handling 1, footyIQ 1 | $763k | -$6.4k | 579 | 6 | 44.4 | L 11-12 Woolloomooloo Wolves |
| S2 W15 | balanced | 7 speed 2, stamina 2, kicking 1, footyIQ 2 | $796k | $33k | 534 | 7 | 44.4 | L 1-6 Redcliffe Reapers |
| S2 W16 | balanced | 6 speed 3, strength 1, handling 1, footyIQ 1 | $797k | $1.6k | 547 | 6 | 44.5 | L 4-12 Launceston Larrikins |
| S2 W17 | balanced | 5 speed 1, footyIQ 4 | $835k | $38k | 595 | 5 | 44.6 | W 18-7 Darwin Drovers |
| S2 W18 | balanced | 7 speed 2, strength 3, stamina 1, handling 1 | $837k | $1.6k | 558 | 7 | 44.6 | W 14-6 Southport Stingrays |
| S2 W19 | balanced | 5 stamina 3, kicking 1, footyIQ 1 | $870k | $33k | 604 | 5 | 44.7 | W 6-0 Broken Hill Brollys |
| S2 W20 | balanced | 5 speed 4, footyIQ 1 | $871k | $1.6k | 589 | 5 | 44.7 | D 6-6 Geelong Gulls |
| S2 W21 | balanced | 5 speed 2, strength 1, footyIQ 2 | $914k | $43k | 566 | 5 | 44.8 | W 4-0 Wagga Swagmen |
| S2 W22 | balanced | 6 strength 2, handling 2, footyIQ 2 | $913k | -$1.4k | 541 | 6 | 44.9 | L 0-12 Katherine Crocs |
| S2 W23 | balanced | 5 strength 1, stamina 3, kicking 1 | $949k | $36k | 544 | 5 | 44.9 | D 0-0 Shellharbour Scorpions |
| S2 W24 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $951k | $1.6k | 543 | 5 | 44.9 | L 0-10 Dubbo Diggers |
| S2 W25 final | balanced | 1 stamina 1 | $953k | $2.2k | 119 | 1 | 44.9 | no match |
| S2 W26 final | balanced | 0 | $955k | $1.6k | 119 | 0 | 44.9 | no match |
| S2 W27 final | balanced | 1 footyIQ 1 | $956k | $1.6k | 75 | 1 | 44.0 | no match |
| S3 trial 1 | balanced | 5 speed 1, strength 1, stamina 1, handling 1, footyIQ 1 | $891k | -$66k | 405 | 5 | 42.1 | L 7-10 Ballarat Bushrangers |
| S3 trial 2 | balanced | 5 speed 2, strength 1, handling 1, footyIQ 1 | $900k | $9.5k | 405 | 5 | 42.2 | L 4-6 Redcliffe Reapers |
| S3 W1 | balanced | 3 speed 1, stamina 1, kicking 1 | $933k | $33k | 408 | 3 | 42.2 | W 6-4 Launceston Larrikins |
| S3 W2 | balanced | 5 speed 2, strength 1, stamina 1, footyIQ 1 | $935k | $1.6k | 391 | 5 | 42.2 | D 0-0 Darwin Drovers |
| S3 W3 | balanced | 4 speed 2, footyIQ 2 | $970k | $35k | 459 | 4 | 42.2 | W 18-0 Southport Stingrays |
| S3 W4 | balanced | 3 strength 1, stamina 1, handling 1 | $972k | $1.6k | 400 | 3 | 42.2 | L 6-10 Broken Hill Brollys |
| S3 W5 | balanced | 3 stamina 1, footyIQ 2 | $1014k | $42k | 423 | 3 | 42.2 | D 7-7 Geelong Gulls |
| S3 W6 | balanced | 5 speed 3, stamina 1, kicking 1 | $1002k | -$12k | 445 | 5 | 42.1 | W 4-1 Wagga Swagmen |
| S3 W7 | balanced | 5 strength 2, stamina 1, footyIQ 2 | $1044k | $42k | 408 | 5 | 42.1 | L 6-7 Katherine Crocs |
| S3 W8 | balanced | 6 speed 4, strength 1, stamina 1 | $1046k | $1.7k | 466 | 6 | 42.2 | W 6-4 Shellharbour Scorpions |
| S3 W9 | balanced | 5 speed 1, stamina 2, handling 2 | $1080k | $34k | 488 | 6 | 42.2 | W 12-6 Dubbo Diggers |
| S3 W10 | balanced | 2 speed 1, kicking 1 | $1082k | $1.7k | 403 | 2 | 42.2 | L 0-22 Mackay Marlins |
| S3 W11 | balanced | 4 footyIQ 4 | $1125k | $43k | 417 | 4 | 42.2 | L 7-12 Ballarat Bushrangers |
| S3 W12 | balanced | 4 speed 1, strength 2, footyIQ 1 | $1127k | $1.7k | 445 | 5 | 42.2 | W 8-6 Cairns Cyclones |
| S3 W13 | balanced | 4 strength 1, stamina 2, handling 1 | $1170k | $43k | 418 | 4 | 42.2 | L 6-10 Toowoomba Thunder |
| S3 W14 | balanced | 2 speed 1, kicking 1 | $1171k | $1.7k | 394 | 1 | 42.2 | L 0-6 Woolloomooloo Wolves |
| S3 W15 | balanced | 5 speed 1, stamina 2, footyIQ 2 | $1210k | $39k | 439 | 5 | 42.2 | W 6-0 Redcliffe Reapers |
| S3 W16 | balanced | 7 speed 5, strength 1, stamina 1 | $1212k | $1.8k | 411 | 7 | 42.3 | D 0-0 Launceston Larrikins |
| S3 W17 | balanced | 4 speed 1, stamina 1, handling 1, footyIQ 1 | $1248k | $36k | 419 | 4 | 42.3 | L 7-8 Darwin Drovers |
| S3 W18 | balanced | 2 speed 1, kicking 1 | $1250k | $1.8k | 420 | 2 | 42.2 | L 4-7 Southport Stingrays |
| S3 W19 | balanced | 7 speed 2, strength 2, footyIQ 3 | $1283k | $33k | 443 | 7 | 42.3 | W 12-8 Broken Hill Brollys |
| S3 W20 | balanced | 3 speed 1, strength 1, stamina 1 | $1282k | -$1.2k | 398 | 3 | 42.3 | L 0-10 Geelong Gulls |
| S3 W21 | balanced | 4 speed 1, strength 1, stamina 1, handling 1 | $1315k | $33k | 468 | 4 | 42.3 | W 18-4 Wagga Swagmen |
| S3 W22 | balanced | 2 speed 1, kicking 1 | $1317k | $1.8k | 434 | 2 | 42.3 | L 10-12 Katherine Crocs |
| S3 W23 | balanced | 5 stamina 2, footyIQ 3 | $1347k | $30k | 424 | 6 | 42.3 | L 4-10 Shellharbour Scorpions |
| S3 W24 | balanced | 6 speed 3, strength 2, handling 1 | $1349k | $1.8k | 450 | 5 | 42.3 | W 12-6 Dubbo Diggers |
| S3 W25 final | balanced | 2 speed 1, stamina 1 | $1356k | $6.8k | 85 | 2 | 42.3 | no match |
| S3 W26 final | balanced | 2 speed 1, handling 1 | $1358k | $1.8k | 85 | 2 | 42.3 | no match |
| S3 W27 final | balanced | 0 | $1371k | $14k | 0 | 0 | 0.0 | no match |
| S4 trial 1 | balanced | 0 | $1382k | $11k | 668 | 0 | 33.3 | L 0-12 Wagga Swagmen |
| S4 trial 2 | balanced | 0 | $1384k | $1.8k | 855 | 9 | 33.3 | L 0-4 Darwin Drovers |
| S4 W1 | balanced | 9 speed 2, strength 1, stamina 1, handling 2, footyIQ 3 | $1421k | $37k | 885 | 13 | 33.5 | L 6-22 Launceston Larrikins |
| S4 W2 | balanced | 1 footyIQ 1 | $1423k | $1.8k | 863 | 1 | 33.5 | L 0-1 Darwin Drovers |
| S4 W3 | balanced | 12 speed 3, strength 3, handling 4, footyIQ 2 | $1456k | $34k | 870 | 12 | 33.7 | L 0-7 Southport Stingrays |
| S4 W4 | balanced | 9 speed 2, strength 1, stamina 1, handling 2, footyIQ 3 | $1458k | $1.8k | 855 | 9 | 33.9 | L 0-6 Broken Hill Brollys |
| S4 W5 | balanced | 13 speed 1, strength 3, stamina 3, handling 2, footyIQ 4 | $1488k | $30k | 855 | 13 | 34.2 | L 0-12 Geelong Gulls |
| S4 W6 | balanced | 3 speed 1, footyIQ 2 | $1490k | $1.8k | 930 | 3 | 34.2 | W 7-6 Wagga Swagmen |
| S4 W7 | balanced | 7 speed 1, handling 5, footyIQ 1 | $1522k | $32k | 863 | 7 | 34.3 | L 0-6 Katherine Crocs |
| S4 W8 | balanced | 12 speed 2, strength 3, stamina 3, handling 3, footyIQ 1 | $1524k | $1.8k | 855 | 12 | 34.6 | L 0-11 Shellharbour Scorpions |
| S4 W9 | balanced | 9 speed 2, strength 1, handling 2, footyIQ 4 | $1556k | $32k | 878 | 9 | 34.8 | L 6-11 Dubbo Diggers |
| S4 W10 | balanced | 8 speed 1, strength 2, stamina 2, handling 1, footyIQ 2 | $1557k | $1.8k | 908 | 9 | 34.9 | W 6-4 Mackay Marlins |
| S4 W11 | balanced | 6 speed 2, strength 1, handling 2, footyIQ 1 | $1593k | $35k | 870 | 5 | 35.0 | L 6-12 Ballarat Bushrangers |
| S4 W12 | balanced | 13 speed 4, strength 1, stamina 2, handling 4, kicking 1, footyIQ 1 | $1595k | $1.8k | 885 | 13 | 35.3 | L 4-12 Cairns Cyclones |
| S4 W13 | balanced | 9 speed 2, strength 2, stamina 1, handling 1, footyIQ 3 | $1631k | $36k | 878 | 9 | 35.4 | L 0-10 Toowoomba Thunder |
| S4 W14 | balanced | 10 speed 1, strength 1, stamina 2, handling 2, footyIQ 4 | $1632k | $1.8k | 878 | 10 | 35.6 | D 6-6 Woolloomooloo Wolves |
| S4 W15 | balanced | 4 speed 1, strength 2, handling 1 | $1667k | $34k | 855 | 4 | 35.7 | L 0-7 Redcliffe Reapers |
| S4 W16 | balanced | 9 speed 3, strength 1, stamina 1, handling 1, kicking 1, footyIQ 2 | $1668k | $1.9k | 870 | 9 | 35.9 | L 4-12 Launceston Larrikins |
| S4 W17 | balanced | 12 speed 2, strength 1, stamina 2, handling 3, footyIQ 4 | $1699k | $31k | 878 | 12 | 36.1 | L 7-19 Darwin Drovers |
| S4 W18 | balanced | 6 speed 2, strength 1, stamina 1, handling 1, kicking 1 | $1701k | $1.9k | 900 | 6 | 36.2 | L 6-11 Southport Stingrays |
| S4 W19 | balanced | 11 speed 2, strength 1, stamina 1, handling 2, footyIQ 5 | $1735k | $34k | 938 | 11 | 36.4 | W 12-0 Broken Hill Brollys |
| S4 W20 | balanced | 8 speed 1, strength 2, stamina 1, handling 1, kicking 1, footyIQ 2 | $1725k | -$10k | 885 | 8 | 36.5 | D 0-0 Geelong Gulls |
| S4 W21 | balanced | 12 speed 1, strength 4, stamina 1, handling 2, kicking 1, footyIQ 3 | $1757k | $32k | 888 | 12 | 36.7 | L 6-10 Wagga Swagmen |
| S4 W22 | balanced | 5 stamina 3, handling 2 | $1759k | $1.8k | 867 | 5 | 36.8 | W 4-0 Katherine Crocs |
| S4 W23 | balanced | 12 speed 5, strength 2, handling 1, footyIQ 4 | $1803k | $44k | 922 | 12 | 37.0 | W 10-0 Shellharbour Scorpions |
| S4 W24 | balanced | 7 speed 1, stamina 1, handling 1, kicking 1, footyIQ 3 | $1805k | $1.8k | 822 | 7 | 37.1 | L 0-6 Dubbo Diggers |
| S4 W25 final | balanced | 1 stamina 1 | $1814k | $8.8k | 187 | 1 | 37.1 | no match |
| S4 W26 final | balanced | 2 speed 1, footyIQ 1 | $1815k | $1.8k | 198 | 2 | 37.1 | no match |
| S4 W27 final | balanced | 0 | $1817k | $1.8k | 0 | 0 | 0.0 | no match |

Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.

| Wk | n | Cash | Change | XP | Levels | Squad | Best 9 | Debt | Win% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 trial 1 | 20 | $49k | $4.0k | 573 | 0.00 | 45.7 | 52.1 | 0.0% | 15.0% |
| S1 trial 2 | 20 | $54k | $4.7k | 591 | 5.40 | 45.7 | 52.0 | 0.0% | 30.0% |
| S1 W1 | 20 | $80k | $26k | 581 | 3.90 | 45.7 | 52.1 | 0.0% | 50.0% |
| S1 W2 | 20 | $81k | $840 | 593 | 7.55 | 45.7 | 52.2 | 0.0% | 35.0% |
| S1 W3 | 20 | $112k | $31k | 590 | 2.20 | 45.7 | 52.2 | 0.0% | 50.0% |
| S1 W4 | 20 | $113k | $958 | 592 | 6.00 | 45.7 | 52.3 | 0.0% | 60.0% |
| S1 W5 | 20 | $142k | $29k | 590 | 7.65 | 45.8 | 52.5 | 0.0% | 65.0% |
| S1 W6 | 20 | $141k | -$267 | 594 | 6.85 | 45.9 | 52.7 | 0.0% | 50.0% |
| S1 W7 | 20 | $171k | $29k | 583 | 3.05 | 45.9 | 52.8 | 0.0% | 35.0% |
| S1 W8 | 20 | $172k | $1.6k | 594 | 9.50 | 46.0 | 53.0 | 0.0% | 50.0% |
| S1 W9 | 20 | $201k | $29k | 587 | 2.90 | 46.0 | 53.0 | 0.0% | 40.0% |
| S1 W10 | 20 | $202k | $1.2k | 594 | 6.55 | 46.1 | 53.1 | 0.0% | 55.0% |
| S1 W11 | 20 | $230k | $27k | 597 | 3.15 | 46.2 | 53.3 | 0.0% | 40.0% |
| S1 W12 | 20 | $231k | $1.5k | 596 | 9.85 | 46.2 | 53.5 | 0.0% | 40.0% |
| S1 W13 | 20 | $262k | $31k | 591 | 3.75 | 46.2 | 53.6 | 0.0% | 30.0% |
| S1 W14 | 20 | $264k | $1.6k | 589 | 7.65 | 46.3 | 53.7 | 0.0% | 35.0% |
| S1 W15 | 20 | $294k | $31k | 589 | 5.25 | 46.3 | 53.8 | 0.0% | 30.0% |
| S1 W16 | 20 | $294k | -$298 | 592 | 5.95 | 46.4 | 54.0 | 0.0% | 50.0% |
| S1 W17 | 20 | $322k | $28k | 595 | 3.30 | 46.4 | 54.1 | 0.0% | 40.0% |
| S1 W18 | 20 | $323k | $998 | 580 | 10.70 | 46.5 | 54.2 | 0.0% | 20.0% |
| S1 W19 | 20 | $349k | $26k | 595 | 3.10 | 46.5 | 54.3 | 0.0% | 55.0% |
| S1 W20 | 20 | $351k | $1.1k | 583 | 5.50 | 46.6 | 54.4 | 0.0% | 40.0% |
| S1 W21 | 20 | $377k | $27k | 595 | 5.35 | 46.7 | 54.6 | 0.0% | 40.0% |
| S1 W22 | 20 | $379k | $1.4k | 593 | 7.35 | 46.7 | 54.8 | 0.0% | 40.0% |
| S1 W23 | 20 | $404k | $25k | 596 | 4.30 | 46.8 | 55.0 | 0.0% | 45.0% |
| S1 W24 | 20 | $405k | $1.3k | 589 | 5.70 | 46.9 | 55.1 | 0.0% | 55.0% |
| S1 W25 final | 20 | $418k | $12k | 383 | 4.65 | 46.9 | 55.3 | 0.0% | 30.0% |
| S1 W26 final | 20 | $421k | $3.9k | 245 | 2.55 | 46.9 | 55.3 | 0.0% | 100.0% |
| S1 W27 final | 20 | $460k | $38k | 159 | 0.90 | 47.0 | 50.7 | 0.0% | 33.3% |
| S2 trial 1 | 20 | $447k | -$13k | 524 | 6.15 | 46.4 | 51.0 | 0.0% | 40.0% |
| S2 trial 2 | 20 | $450k | $2.7k | 525 | 4.60 | 46.5 | 51.1 | 0.0% | 35.0% |
| S2 W1 | 20 | $480k | $30k | 532 | 5.00 | 46.5 | 51.2 | 0.0% | 65.0% |
| S2 W2 | 20 | $479k | -$468 | 522 | 7.25 | 46.6 | 51.4 | 0.0% | 35.0% |
| S2 W3 | 20 | $513k | $34k | 534 | 4.50 | 46.7 | 51.5 | 0.0% | 45.0% |
| S2 W4 | 20 | $514k | $1.2k | 521 | 4.95 | 46.7 | 51.6 | 0.0% | 20.0% |
| S2 W5 | 20 | $545k | $30k | 525 | 5.65 | 46.7 | 51.7 | 0.0% | 50.0% |
| S2 W6 | 20 | $546k | $1.2k | 524 | 4.85 | 46.8 | 51.8 | 0.0% | 40.0% |
| S2 W7 | 20 | $579k | $33k | 527 | 5.05 | 46.8 | 51.9 | 0.0% | 50.0% |
| S2 W8 | 20 | $578k | -$804 | 534 | 4.80 | 47.0 | 52.2 | 0.0% | 60.0% |
| S2 W9 | 20 | $608k | $31k | 533 | 6.15 | 47.1 | 52.5 | 0.0% | 45.0% |
| S2 W10 | 20 | $610k | $1.2k | 530 | 4.90 | 47.2 | 52.6 | 0.0% | 50.0% |
| S2 W11 | 20 | $644k | $35k | 528 | 5.45 | 47.2 | 52.7 | 0.0% | 30.0% |
| S2 W12 | 20 | $647k | $2.4k | 527 | 5.70 | 47.3 | 52.8 | 0.0% | 30.0% |
| S2 W13 | 20 | $681k | $35k | 527 | 4.85 | 47.4 | 52.9 | 0.0% | 30.0% |
| S2 W14 | 20 | $682k | $931 | 524 | 5.00 | 47.4 | 53.0 | 0.0% | 15.0% |
| S2 W15 | 20 | $714k | $32k | 524 | 6.55 | 47.5 | 53.1 | 0.0% | 25.0% |
| S2 W16 | 20 | $716k | $1.9k | 529 | 4.90 | 47.6 | 53.2 | 0.0% | 35.0% |
| S2 W17 | 20 | $746k | $30k | 537 | 5.05 | 47.6 | 53.4 | 0.0% | 45.0% |
| S2 W18 | 20 | $748k | $1.1k | 537 | 5.15 | 47.7 | 53.5 | 0.0% | 45.0% |
| S2 W19 | 20 | $777k | $29k | 543 | 5.35 | 47.8 | 53.7 | 0.0% | 50.0% |
| S2 W20 | 20 | $779k | $2.0k | 535 | 5.40 | 47.9 | 53.8 | 0.0% | 35.0% |
| S2 W21 | 20 | $811k | $33k | 535 | 4.95 | 47.9 | 53.9 | 0.0% | 45.0% |
| S2 W22 | 20 | $813k | $1.3k | 539 | 5.85 | 48.0 | 54.0 | 0.0% | 35.0% |
| S2 W23 | 20 | $845k | $32k | 543 | 5.15 | 48.0 | 54.1 | 0.0% | 40.0% |
| S2 W24 | 20 | $847k | $1.9k | 534 | 5.15 | 48.1 | 54.2 | 0.0% | 35.0% |
| S2 W25 final | 20 | $855k | $8.4k | 293 | 3.15 | 48.1 | 54.3 | 0.0% | 0.0% |
| S2 W26 final | 20 | $857k | $2.0k | 125 | 0.95 | 48.1 | 54.3 | 0.0% | n/a |
| S2 W27 final | 20 | $869k | $12k | 50 | 0.55 | 49.3 | 49.3 | 0.0% | n/a |
| S3 trial 1 | 20 | $793k | -$77k | 504 | 3.70 | 44.3 | 48.3 | 0.0% | 40.0% |
| S3 trial 2 | 20 | $795k | $2.7k | 526 | 5.35 | 44.3 | 48.4 | 0.0% | 30.0% |
| S3 W1 | 20 | $827k | $31k | 523 | 5.70 | 44.3 | 48.5 | 0.0% | 25.0% |
| S3 W2 | 20 | $828k | $1.3k | 523 | 4.35 | 44.4 | 48.6 | 0.0% | 15.0% |
| S3 W3 | 20 | $859k | $32k | 531 | 5.60 | 44.5 | 48.7 | 0.0% | 25.0% |
| S3 W4 | 20 | $859k | -$53 | 525 | 5.25 | 44.6 | 48.9 | 0.0% | 45.0% |
| S3 W5 | 20 | $891k | $31k | 526 | 5.35 | 44.7 | 49.0 | 0.0% | 50.0% |
| S3 W6 | 20 | $890k | -$1.1k | 528 | 4.80 | 44.7 | 49.2 | 0.0% | 30.0% |
| S3 W7 | 20 | $920k | $31k | 522 | 4.60 | 44.7 | 49.3 | 0.0% | 35.0% |
| S3 W8 | 20 | $921k | $536 | 522 | 5.85 | 44.8 | 49.4 | 0.0% | 25.0% |
| S3 W9 | 20 | $954k | $33k | 537 | 5.15 | 44.9 | 49.5 | 0.0% | 45.0% |
| S3 W10 | 20 | $956k | $1.3k | 518 | 5.75 | 44.9 | 49.6 | 0.0% | 20.0% |
| S3 W11 | 20 | $988k | $32k | 522 | 4.30 | 45.0 | 49.7 | 0.0% | 25.0% |
| S3 W12 | 20 | $989k | $1.3k | 524 | 6.25 | 45.1 | 49.8 | 0.0% | 25.0% |
| S3 W13 | 20 | $1019k | $30k | 531 | 4.45 | 45.2 | 50.1 | 0.0% | 20.0% |
| S3 W14 | 20 | $1019k | $14 | 527 | 6.05 | 45.3 | 50.2 | 0.0% | 30.0% |
| S3 W15 | 20 | $1053k | $34k | 531 | 4.60 | 45.3 | 50.3 | 0.0% | 30.0% |
| S3 W16 | 20 | $1054k | $1.1k | 528 | 5.45 | 45.4 | 50.4 | 0.0% | 25.0% |
| S3 W17 | 20 | $1087k | $33k | 536 | 6.05 | 45.4 | 50.5 | 0.0% | 35.0% |
| S3 W18 | 20 | $1088k | $1.6k | 538 | 4.40 | 45.5 | 50.6 | 0.0% | 35.0% |
| S3 W19 | 20 | $1118k | $29k | 540 | 6.00 | 45.6 | 50.9 | 0.0% | 35.0% |
| S3 W20 | 20 | $1119k | $1.6k | 530 | 4.25 | 45.7 | 51.0 | 0.0% | 35.0% |
| S3 W21 | 20 | $1152k | $32k | 541 | 6.15 | 45.7 | 51.1 | 0.0% | 35.0% |
| S3 W22 | 20 | $1153k | $1.8k | 543 | 4.90 | 45.8 | 51.2 | 0.0% | 45.0% |
| S3 W23 | 20 | $1186k | $32k | 545 | 5.90 | 45.8 | 51.3 | 0.0% | 55.0% |
| S3 W24 | 20 | $1187k | $806 | 538 | 5.15 | 45.9 | 51.5 | 0.0% | 40.0% |
| S3 W25 final | 20 | $1193k | $6.3k | 198 | 2.25 | 45.9 | 51.5 | 0.0% | 0.0% |
| S3 W26 final | 20 | $1195k | $2.0k | 128 | 1.25 | 45.9 | 51.5 | 0.0% | n/a |
| S3 W27 final | 20 | $1205k | $10k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |
| S4 trial 1 | 11 | $1176k | -$153k | 519 | 3.45 | 41.9 | 44.6 | 0.0% | 27.3% |
| S4 trial 2 | 11 | $1176k | $129 | 564 | 5.27 | 42.0 | 44.8 | 0.0% | 27.3% |
| S4 W1 | 11 | $1211k | $35k | 564 | 6.45 | 42.0 | 44.9 | 0.0% | 36.4% |
| S4 W2 | 11 | $1213k | $1.8k | 568 | 3.91 | 42.0 | 45.0 | 0.0% | 45.5% |
| S4 W3 | 11 | $1253k | $39k | 562 | 6.27 | 42.1 | 45.1 | 0.0% | 9.1% |
| S4 W4 | 11 | $1254k | $1.2k | 560 | 5.09 | 42.2 | 45.2 | 0.0% | 18.2% |
| S4 W5 | 11 | $1286k | $32k | 561 | 7.18 | 42.2 | 45.3 | 0.0% | 27.3% |
| S4 W6 | 11 | $1288k | $1.8k | 567 | 4.55 | 42.3 | 45.4 | 0.0% | 27.3% |
| S4 W7 | 11 | $1323k | $35k | 563 | 5.36 | 42.3 | 45.5 | 0.0% | 27.3% |
| S4 W8 | 11 | $1322k | -$1.4k | 579 | 5.27 | 42.5 | 45.8 | 0.0% | 54.5% |
| S4 W9 | 11 | $1355k | $33k | 568 | 6.00 | 42.6 | 46.0 | 0.0% | 18.2% |
| S4 W10 | 11 | $1356k | $664 | 574 | 6.09 | 42.7 | 46.1 | 0.0% | 27.3% |
| S4 W11 | 11 | $1392k | $36k | 573 | 4.45 | 42.8 | 46.2 | 0.0% | 36.4% |
| S4 W12 | 11 | $1394k | $1.9k | 567 | 7.36 | 42.8 | 46.3 | 0.0% | 0.0% |
| S4 W13 | 11 | $1431k | $37k | 573 | 6.18 | 42.9 | 46.4 | 0.0% | 18.2% |
| S4 W14 | 11 | $1432k | $1.5k | 577 | 5.64 | 43.0 | 46.5 | 0.0% | 27.3% |
| S4 W15 | 11 | $1469k | $37k | 569 | 5.18 | 43.1 | 46.6 | 0.0% | 18.2% |
| S4 W16 | 11 | $1471k | $1.8k | 572 | 5.27 | 43.1 | 46.7 | 0.0% | 18.2% |
| S4 W17 | 11 | $1505k | $34k | 564 | 5.82 | 43.2 | 46.9 | 0.0% | 18.2% |
| S4 W18 | 11 | $1507k | $1.6k | 572 | 5.82 | 43.3 | 47.0 | 0.0% | 9.1% |
| S4 W19 | 11 | $1541k | $35k | 572 | 5.45 | 43.3 | 47.1 | 0.0% | 27.3% |
| S4 W20 | 11 | $1542k | $716 | 585 | 5.64 | 43.4 | 47.2 | 0.0% | 36.4% |
| S4 W21 | 11 | $1576k | $34k | 582 | 6.18 | 43.4 | 47.3 | 0.0% | 18.2% |
| S4 W22 | 11 | $1569k | -$7.5k | 566 | 5.18 | 43.8 | 48.0 | 0.0% | 18.2% |
| S4 W23 | 11 | $1603k | $35k | 577 | 5.82 | 43.9 | 48.1 | 0.0% | 27.3% |
| S4 W24 | 11 | $1605k | $1.9k | 577 | 5.82 | 44.0 | 48.3 | 0.0% | 27.3% |
| S4 W25 final | 11 | $1608k | $3.0k | 132 | 1.09 | 44.0 | 48.3 | 0.0% | n/a |
| S4 W26 final | 11 | $1610k | $2.3k | 133 | 2.36 | 44.0 | 48.3 | 0.0% | n/a |
| S4 W27 final | 11 | $1612k | $1.7k | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |
| S5 trial 1 | 2 | $1546k | -$194k | 339 | 2.50 | 43.6 | 49.0 | 0.0% | 50.0% |
| S5 trial 2 | 2 | $1547k | $1.2k | 343 | 2.50 | 43.7 | 49.3 | 0.0% | 0.0% |
| S5 W1 | 2 | $1584k | $37k | 352 | 3.00 | 43.7 | 49.3 | 0.0% | 0.0% |
| S5 W2 | 2 | $1585k | $1.8k | 355 | 4.50 | 43.8 | 49.5 | 0.0% | 0.0% |
| S5 W3 | 2 | $1615k | $29k | 351 | 2.50 | 43.8 | 49.5 | 0.0% | 0.0% |
| S5 W4 | 2 | $1616k | $1.8k | 351 | 4.00 | 43.8 | 49.6 | 0.0% | 0.0% |
| S5 W5 | 2 | $1648k | $32k | 343 | 4.00 | 43.9 | 49.7 | 0.0% | 0.0% |
| S5 W6 | 2 | $1650k | $1.8k | 335 | 4.00 | 43.9 | 49.7 | 0.0% | 0.0% |
| S5 W7 | 2 | $1686k | $36k | 348 | 1.50 | 43.8 | 49.7 | 0.0% | 0.0% |
| S5 W8 | 2 | $1688k | $1.8k | 342 | 4.50 | 43.9 | 49.8 | 0.0% | 0.0% |
| S5 W9 | 2 | $1723k | $36k | 341 | 3.00 | 43.9 | 49.8 | 0.0% | 0.0% |
| S5 W10 | 2 | $1725k | $1.8k | 342 | 3.50 | 43.9 | 49.8 | 0.0% | 0.0% |
| S5 W11 | 2 | $1759k | $33k | 336 | 2.50 | 43.8 | 49.8 | 0.0% | 0.0% |
| S5 W12 | 2 | $1761k | $2.0k | 346 | 5.00 | 43.9 | 49.8 | 0.0% | 0.0% |
| S5 W13 | 2 | $1795k | $35k | 359 | 2.50 | 43.8 | 49.8 | 0.0% | 50.0% |
| S5 W14 | 2 | $1797k | $2.0k | 370 | 4.50 | 43.9 | 49.9 | 0.0% | 100.0% |
| S5 W15 | 2 | $1840k | $43k | 336 | 3.00 | 43.8 | 49.9 | 0.0% | 0.0% |
| S5 W16 | 2 | $1842k | $2.0k | 338 | 3.50 | 43.8 | 50.0 | 0.0% | 0.0% |
| S5 W17 | 2 | $1880k | $38k | 344 | 3.00 | 43.8 | 50.0 | 0.0% | 50.0% |
| S5 W18 | 2 | $1883k | $3.0k | 370 | 5.50 | 43.9 | 50.0 | 0.0% | 100.0% |
| S5 W19 | 2 | $1921k | $38k | 349 | 1.50 | 43.8 | 50.0 | 0.0% | 100.0% |
| S5 W20 | 2 | $1923k | $1.9k | 353 | 4.00 | 43.8 | 50.0 | 0.0% | 50.0% |
| S5 W21 | 2 | $1963k | $40k | 344 | 3.00 | 43.8 | 50.1 | 0.0% | 0.0% |
| S5 W22 | 2 | $1965k | $1.9k | 342 | 4.00 | 43.8 | 50.1 | 0.0% | 0.0% |
| S5 W23 | 2 | $1996k | $31k | 352 | 3.50 | 43.7 | 50.3 | 0.0% | 50.0% |
| S5 W24 | 2 | $1998k | $1.9k | 342 | 3.00 | 43.7 | 50.3 | 0.0% | 0.0% |
| S5 W25 final | 2 | $2000k | $1.9k | 80 | 1.00 | 43.7 | 50.2 | 0.0% | n/a |
| S5 W26 final | 2 | $2002k | $1.9k | 84 | 1.50 | 43.7 | 50.3 | 0.0% | n/a |
| S5 W27 final | 2 | $2003k | $920 | 0 | 0.00 | 0.0 | 0.0 | 0.0% | n/a |

Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.

| Cell | Games | Win share | Rest games | Rest win share | Difference | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| balanced × compressed | 1231 | 41.2% | 549 | 43.6% | -2.4% |  |
| balanced × slide | 549 | 43.6% | 1231 | 41.2% | 2.4% |  |

## Per career

### careless / easy / au / seed 7919

Regular: 78.3% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 51 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 141104 | 240 | 0 | 0 | 0 | 0 | 34560 | 418097 | 25500 | 17000 | -17700 | -352700 | -53653 | -20000 | 0 |
| 2 | true | 201019 | 6435 | 0 | 0 | 0 | 0 | 43120 | 508586 | 25500 | 8500 | 4600 | -494000 | -36391 | 0 | 0 |
| 3 | true | 449556 | 91006 | 0 | 0 | 0 | 0 | 53400 | 582763 | 123250 | 17000 | 3000 | -515300 | -15576 | 0 | 0 |
| 4 | true | 547347 | 212946 | 0 | 0 | 0 | 0 | 75720 | 574560 | 59500 | 8500 | -4000 | -598500 | -17989 | 0 | 0 |
| 5 | true | 611085 | 299590 | 0 | 0 | 0 | 0 | 83200 | 534240 | 12750 | 8500 | 1500 | -560000 | -16452 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 7919

Regular: 62.5% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 65 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 51755 | 400 | 0 | 0 | 0 | 0 | 34560 | 337176 | 15000 | 20000 | -22800 | -317400 | -54781 | -20000 | 0 |
| 2 | true | 221200 | 208 | 0 | 0 | 0 | 0 | 38920 | 476805 | 30000 | 10000 | 8400 | -390500 | -4180 | 0 | 0 |
| 3 | true | 544470 | 103038 | 0 | 0 | 0 | 0 | 49720 | 596285 | 145000 | 20000 | -700 | -477100 | -9935 | 0 | 0 |
| 4 | true | 580616 | 294607 | 0 | 0 | 0 | 0 | 77240 | 514500 | 15000 | 10000 | 7000 | -572500 | -15094 | 0 | 0 |
| 5 | true | 823195 | 348937 | 0 | 0 | 0 | 0 | 80400 | 640500 | 70000 | 10000 | -3000 | -543000 | -12321 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 7919

Regular: 56.7% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 77 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 73147 | 266 | 0 | 0 | 0 | 0 | 34800 | 349524 | 36000 | 24000 | 13000 | -365800 | -63377 | 0 | 0 |
| 2 | true | 238261 | 190 | 0 | 0 | 0 | 0 | 42240 | 494981 | 174000 | 12000 | -6000 | -521900 | -10207 | -20000 | 0 |
| 3 | true | 229045 | 105718 | 0 | 0 | 0 | 0 | 63600 | 543900 | 18000 | 12000 | -1100 | -618500 | -27116 | 0 | 0 |
| 4 | true | 556232 | 66844 | 0 | 0 | 0 | 0 | 68120 | 637665 | 174000 | 12000 | 10600 | -557200 | -17998 | 0 | 0 |
| 5 | true | 576700 | 361428 | 0 | 0 | 0 | 0 | 95440 | 514500 | 0 | 0 | -2000 | -570300 | -17172 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 7919

Regular: 72.5% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 48 / 132 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 523711 | 82000 | 0 | 0 | 0 | 0 | 35320 | 403441 | 12750 | 17000 | -26800 | 0 | 0 | -8000 | 0 |
| 2 | true | 1005581 | 523711 | 0 | 0 | 0 | 0 | 47400 | 405870 | 25500 | 8500 | -5400 | 0 | 0 | 0 | 0 |
| 3 | true | 1565283 | 982781 | 0 | 0 | 0 | 0 | 51120 | 515632 | 12750 | 17000 | -14000 | -22800 | 0 | 0 | 0 |
| 4 | true | 2227453 | 1427783 | 0 | 0 | 0 | 0 | 61080 | 609840 | 123250 | 8500 | -3000 | -137500 | 0 | 0 | 0 |
| 5 | true | 2979763 | 2174993 | 0 | 0 | 0 | 0 | 84880 | 614880 | 123250 | 8500 | -13700 | -65500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 7919

Regular: 60.0% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 60 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 492861 | 52000 | 0 | 0 | 0 | 0 | 35320 | 397341 | 15000 | 20000 | -26800 | 0 | 0 | -8000 | 0 |
| 2 | true | 1100831 | 492861 | 0 | 0 | 0 | 0 | 45800 | 415170 | 145000 | 10000 | -8000 | 0 | 0 | 0 | 0 |
| 3 | true | 1780222 | 1061131 | 0 | 0 | 0 | 0 | 68960 | 552531 | 70000 | 10000 | 17600 | -39700 | 0 | 0 | 0 |
| 4 | true | 2516802 | 1640222 | 0 | 0 | 0 | 0 | 74080 | 640500 | 145000 | 10000 | 7000 | -140000 | 0 | 0 | 0 |
| 5 | true | 3104322 | 2472162 | 0 | 0 | 0 | 0 | 96920 | 556500 | 15000 | 10000 | -29200 | -61700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 7919

Regular: 56.7% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 103 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 482126 | 45000 | 0 | 0 | 0 | 0 | 35320 | 396606 | 18000 | 24000 | -28800 | 0 | 0 | -8000 | 0 |
| 2 | true | 898575 | 482126 | 0 | 0 | 0 | 0 | 46360 | 380489 | 0 | 0 | -10400 | 0 | 0 | 0 | 0 |
| 3 | true | 1563178 | 876975 | 0 | 0 | 0 | 0 | 46160 | 432443 | 174000 | 24000 | 9600 | -21600 | 0 | 0 | 0 |
| 4 | true | 2060398 | 1423778 | 0 | 0 | 0 | 0 | 70120 | 514500 | 36000 | 12000 | 4000 | -139400 | 0 | 0 | 0 |
| 5 | true | 2831118 | 1930698 | 0 | 0 | 0 | 0 | 74320 | 640500 | 174000 | 12000 | -400 | -129700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 7919

Regular: 84.2% wins / 120 games; finals: 92.3% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 57 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 224465 | 40263 | 0 | 0 | 0 | 0 | 34720 | 474605 | 123250 | 17000 | -25100 | -66010 | 0 | -424000 | 0 |
| 2 | true | 317278 | 47058 | 0 | 0 | 0 | 0 | 63920 | 611353 | 123250 | 8500 | 7200 | -116410 | 0 | -605000 | 0 |
| 3 | true | 646825 | 64898 | 0 | 0 | 0 | 0 | 92560 | 845047 | 12750 | 17000 | 8800 | -106610 | 0 | -540000 | 0 |
| 4 | true | 1721527 | 641505 | 0 | 0 | 0 | 0 | 98320 | 1205952 | 123250 | 8500 | 4000 | -5320 | 0 | -360000 | 0 |
| 5 | true | 3324605 | 1721527 | 0 | 0 | 0 | 0 | 111040 | 1352888 | 123250 | 8500 | 7400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 7919

Regular: 68.3% wins / 120 games; finals: 78.6% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 36 / 64 / 116; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 133980 | 40268 | 0 | 0 | 0 | 0 | 34720 | 394380 | 70000 | 20000 | -27600 | -56520 | 0 | -361000 | 0 |
| 2 | true | 263535 | 40905 | 0 | 0 | 0 | 0 | 48840 | 580115 | 145000 | 10000 | 7200 | -122600 | 0 | -539000 | 0 |
| 3 | true | 648044 | 42505 | 0 | 0 | 0 | 0 | 78640 | 979629 | 70000 | 20000 | 8800 | -112560 | 0 | -660000 | 0 |
| 4 | true | 1733064 | 627674 | 0 | 0 | 0 | 0 | 91560 | 970830 | 30000 | 10000 | 3000 | -20370 | 0 | 0 | 0 |
| 5 | true | 2899076 | 1709754 | 0 | 0 | 0 | 0 | 100160 | 1283562 | 145000 | 10000 | 10600 | -23310 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 7919

Regular: 69.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 49 / 88 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 113214 | 44174 | 0 | 0 | 0 | 0 | 34720 | 382284 | 36000 | 24000 | -28400 | -69390 | 0 | -311000 | 0 |
| 2 | true | 107659 | 40935 | 0 | 0 | 0 | 0 | 43920 | 465045 | 18000 | 12000 | 7200 | -172720 | 0 | -379000 | 0 |
| 3 | true | 339644 | 44818 | 0 | 0 | 0 | 0 | 54280 | 692675 | 174000 | 24000 | 8800 | -91770 | 0 | -630000 | 0 |
| 4 | true | 1218717 | 191594 | 0 | 0 | 0 | 0 | 82080 | 995043 | 174000 | 12000 | 4000 | -148050 | 0 | -240000 | 0 |
| 5 | true | 2375657 | 1177347 | 0 | 0 | 0 | 0 | 104080 | 1260830 | 174000 | 12000 | 7400 | -41370 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 7919

Regular: 64.2% wins / 120 games; finals: 66.7% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 723436 | 90000 | 0 | 0 | 0 | 0 | 35320 | 482266 | 123250 | 17000 | -24400 | 0 | 0 | 0 | 0 |
| 2 | true | 1335670 | 723436 | 0 | 0 | 0 | 0 | 65160 | 532224 | 12750 | 8500 | -6400 | 0 | 0 | 0 | 0 |
| 3 | true | 1963450 | 1281170 | 0 | 0 | 0 | 0 | 70320 | 574560 | 25500 | 17000 | 6100 | -65700 | 0 | 0 | 0 |
| 4 | true | 2327410 | 1776550 | 0 | 0 | 0 | 0 | 78240 | 493920 | 0 | 0 | 4000 | -212200 | 0 | 0 | 0 |
| 5 | true | 2698550 | 2136950 | 0 | 0 | 0 | 0 | 72120 | 493920 | 0 | 0 | 8100 | -203000 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 7919

Regular: 52.5% wins / 120 games; finals: 85.7% wins / 7 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 516930 | 60000 | 0 | 0 | 0 | 0 | 35360 | 419370 | 15000 | 20000 | -32800 | 0 | 0 | 0 | 0 |
| 2 | true | 1142007 | 516930 | 0 | 0 | 0 | 0 | 48520 | 428957 | 145000 | 10000 | -7400 | 0 | 0 | 0 | 0 |
| 3 | true | 1948367 | 1082107 | 0 | 0 | 0 | 0 | 71760 | 640500 | 145000 | 20000 | 3600 | -74500 | 0 | 0 | 0 |
| 4 | true | 2310647 | 1720367 | 0 | 0 | 0 | 0 | 97480 | 514500 | 0 | 0 | -6000 | -243700 | 0 | 0 | 0 |
| 5 | true | 2684447 | 2068347 | 0 | 0 | 0 | 0 | 94600 | 514500 | 0 | 0 | 7000 | -242300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 7919

Regular: 41.7% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 506630 | 45000 | 0 | 0 | 0 | 0 | 35360 | 413070 | 18000 | 24000 | -28800 | 0 | 0 | 0 | 0 |
| 2 | true | 956256 | 506630 | 0 | 0 | 0 | 0 | 45400 | 409626 | 0 | 0 | -5400 | 0 | 0 | 0 | 0 |
| 3 | true | 1371364 | 888956 | 0 | 0 | 0 | 0 | 49880 | 434028 | 0 | 12000 | 0 | -80800 | 0 | 0 | 0 |
| 4 | true | 1817246 | 1371364 | 0 | 0 | 0 | 0 | 53200 | 399882 | 0 | 0 | 5000 | -12200 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 15838

Regular: 75.8% wins / 120 games; finals: 81.8% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 56 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 311264 | 855 | 0 | 0 | 0 | 0 | 37040 | 487267 | 123250 | 17000 | -6000 | -360700 | -52593 | -24000 | 0 |
| 2 | true | 292784 | 201780 | 0 | 0 | 0 | 0 | 64920 | 528373 | 12750 | 8500 | -5700 | -592400 | -34923 | 0 | 0 |
| 3 | true | 576530 | 128519 | 0 | 0 | 0 | 0 | 65120 | 614880 | 123250 | 17000 | 15800 | -541300 | -11004 | 0 | 0 |
| 4 | true | 892256 | 379848 | 0 | 0 | 0 | 0 | 86800 | 614880 | 123250 | 8500 | -1200 | -507600 | -8904 | 0 | 0 |
| 5 | true | 983288 | 624735 | 0 | 0 | 0 | 0 | 100440 | 534240 | 12750 | 8500 | -30700 | -519900 | -14298 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 15838

Regular: 47.9% wins / 96 games; finals: 83.3% wins / 6 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 193365 | 36 | 0 | 0 | 0 | 0 | 36040 | 455049 | 70000 | 20000 | -1000 | -385600 | -37124 | -24000 | 0 |
| 2 | true | 86543 | 68978 | 0 | 0 | 0 | 0 | 53080 | 436947 | 0 | 0 | 8800 | -569600 | -36049 | 0 | 0 |
| 3 | true | 36419 | 22 | 0 | 0 | 0 | 0 | 50440 | 429734 | 0 | 0 | 1000 | -523100 | -8198 | 0 | 0 |
| 4 | true | 167603 | 319 | 0 | 0 | 0 | 0 | 51760 | 441483 | 145000 | 10000 | 5600 | -507400 | -15259 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 15838

Regular: 55.8% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 102 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 4363 | 216 | 0 | 0 | 0 | 0 | 35600 | 313950 | 0 | 0 | 0 | -332800 | -37387 | -20000 | 0 |
| 2 | true | 191738 | 191 | 0 | 0 | 0 | 0 | 30440 | 358701 | 174000 | 12000 | 5000 | -383600 | -9166 | 0 | 0 |
| 3 | true | 281125 | 95056 | 0 | 0 | 0 | 0 | 50640 | 572051 | 36000 | 24000 | 4000 | -579800 | -17504 | 0 | 0 |
| 4 | true | 591426 | 143967 | 0 | 0 | 0 | 0 | 62800 | 626441 | 174000 | 12000 | 5400 | -557100 | -13240 | 0 | 0 |
| 5 | true | 693071 | 410020 | 0 | 0 | 0 | 0 | 88000 | 556500 | 18000 | 12000 | -1400 | -558800 | -12655 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 15838

Regular: 55.8% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 127 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 566004 | 90000 | 0 | 0 | 0 | 0 | 36880 | 437974 | 12750 | 17000 | -20600 | 0 | 0 | -8000 | 0 |
| 2 | true | 1090204 | 523704 | 0 | 0 | 0 | 0 | 49800 | 486450 | 12750 | 8500 | 4000 | -37300 | 0 | 0 | 0 |
| 3 | true | 1619556 | 1006104 | 0 | 0 | 0 | 0 | 61880 | 523222 | 12750 | 17000 | -1400 | -84100 | 0 | 0 | 0 |
| 4 | true | 2020929 | 1472456 | 0 | 0 | 0 | 0 | 65560 | 487913 | 0 | 0 | -5000 | -147100 | 0 | 0 | 0 |
| 5 | true | 2541906 | 1862029 | 0 | 0 | 0 | 0 | 64400 | 518727 | 123250 | 8500 | -35000 | -158900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 15838

Regular: 43.8% wins / 96 games; finals: 100.0% wins / 3 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 600793 | 60000 | 0 | 0 | 0 | 0 | 36880 | 368613 | 145000 | 20000 | -21700 | 0 | 0 | -8000 | 0 |
| 2 | true | 1098215 | 560593 | 0 | 0 | 0 | 0 | 61320 | 480302 | 0 | 0 | -9000 | -35200 | 0 | 0 | 0 |
| 3 | true | 1550196 | 1022415 | 0 | 0 | 0 | 0 | 62720 | 475461 | 0 | 0 | -10400 | -75800 | 0 | 0 | 0 |
| 4 | true | 1992848 | 1417596 | 0 | 0 | 0 | 0 | 62800 | 504452 | 0 | 0 | 8000 | -132600 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 15838

Regular: 25.0% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 390429 | 45000 | 0 | 0 | 0 | 0 | 36920 | 349209 | 0 | 0 | -32700 | 0 | 0 | -8000 | 0 |
| 2 | true | 708590 | 353529 | 0 | 0 | 0 | 0 | 39200 | 303261 | 0 | 0 | 12600 | -36900 | 0 | 0 | 0 |
| 3 | true | 955365 | 640890 | 0 | 0 | 0 | 0 | 37960 | 313215 | 0 | 0 | -36700 | -67700 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 15838

Regular: 82.5% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 47 / 79 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 127070 | 41042 | 0 | 0 | 0 | 0 | 37040 | 474930 | 25500 | 17000 | 6000 | -108400 | 0 | -415000 | 0 |
| 2 | true | 169702 | 40895 | 0 | 0 | 0 | 0 | 49640 | 577332 | 59500 | 8500 | 6400 | -173740 | 0 | -485000 | 0 |
| 3 | true | 211453 | 49702 | 0 | 0 | 0 | 0 | 66520 | 707001 | 25500 | 17000 | 16000 | -130270 | 0 | -660000 | 0 |
| 4 | true | 1152720 | 98333 | 0 | 0 | 0 | 0 | 80160 | 935427 | 25500 | 8500 | 4800 | -113120 | 0 | 0 | 0 |
| 5 | true | 2162839 | 1152720 | 0 | 0 | 0 | 0 | 91000 | 1130169 | 123250 | 8500 | 17200 | 0 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 15838

Regular: 65.8% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / 88 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 87351 | 41080 | 0 | 0 | 0 | 0 | 36920 | 422121 | 15000 | 20000 | -23700 | -81990 | 0 | -361000 | 0 |
| 2 | true | 245182 | 40274 | 0 | 0 | 0 | 0 | 47480 | 572891 | 145000 | 10000 | 14900 | -213440 | 0 | -419000 | 0 |
| 3 | true | 279538 | 44540 | 0 | 0 | 0 | 0 | 74960 | 803796 | 30000 | 20000 | 3900 | -118300 | 0 | -780000 | 0 |
| 4 | true | 1165759 | 167888 | 0 | 0 | 0 | 0 | 83240 | 873831 | 15000 | 10000 | 15800 | -111650 | 0 | 0 | 0 |
| 5 | true | 2260172 | 1062789 | 0 | 0 | 0 | 0 | 91840 | 946743 | 145000 | 10000 | 3800 | -102970 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 15838

Regular: 29.2% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: 65 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 62160 | 40456 | 0 | 0 | 0 | 0 | 36120 | 333900 | 0 | 0 | -27700 | -38160 | 0 | -287000 | 0 |
| 2 | true | 70336 | 40428 | 0 | 0 | 0 | 0 | 36760 | 328986 | 0 | 0 | 5600 | -235170 | 0 | -128000 | 0 |
| 3 | true | 54873 | 44695 | 0 | 0 | 0 | 0 | 37000 | 333617 | 0 | 0 | 12200 | -183280 | 0 | -215000 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 15838

Regular: 38.5% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 573265 | 90000 | 0 | 0 | 0 | 0 | 36840 | 412675 | 12750 | 17000 | 4000 | 0 | 0 | 0 | 0 |
| 2 | true | 977890 | 547856 | 0 | 0 | 0 | 0 | 49880 | 387545 | 0 | 0 | -1400 | -31400 | 0 | 0 | 0 |
| 3 | true | 1429986 | 977890 | 0 | 0 | 0 | 0 | 51360 | 420236 | 0 | 0 | -19500 | 0 | 0 | 0 | 0 |
| 4 | true | 1629607 | 1238786 | 0 | 0 | 0 | 0 | 50240 | 359181 | 0 | 0 | -5400 | -204400 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 15838

Regular: 32.3% wins / 96 games; finals: 50.0% wins / 2 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 609144 | 60000 | 0 | 0 | 0 | 0 | 36840 | 458304 | 30000 | 20000 | 4000 | 0 | 0 | 0 | 0 |
| 2 | true | 1034237 | 574744 | 0 | 0 | 0 | 0 | 48640 | 407253 | 0 | 0 | -1400 | -29400 | 0 | 0 | 0 |
| 3 | true | 1457770 | 1034237 | 0 | 0 | 0 | 0 | 44840 | 395693 | 0 | 0 | -17000 | 0 | 0 | 0 | 0 |
| 4 | true | 1680698 | 1280870 | 0 | 0 | 0 | 0 | 48880 | 371648 | 0 | 0 | -7400 | -190200 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 15838

Regular: 29.2% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 392337 | 45000 | 0 | 0 | 0 | 0 | 36880 | 317457 | 0 | 0 | -7000 | 0 | 0 | 0 | 0 |
| 2 | true | 709751 | 348737 | 0 | 0 | 0 | 0 | 36400 | 334814 | 0 | 0 | 3600 | -57400 | 0 | 0 | 0 |
| 3 | true | 900930 | 581451 | 0 | 0 | 0 | 0 | 38680 | 311399 | 0 | 0 | -18400 | -140500 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 23757

Regular: 66.7% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 69 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 115200 | 390 | 0 | 0 | 0 | 0 | 36720 | 391829 | 12750 | 17000 | 2600 | -375100 | -40599 | -20000 | 0 |
| 2 | true | 366819 | 3161 | 0 | 0 | 0 | 0 | 46960 | 564025 | 123250 | 8500 | -33000 | -448900 | -9216 | 0 | 0 |
| 3 | true | 720967 | 268641 | 0 | 0 | 0 | 0 | 71600 | 614880 | 123250 | 17000 | 600 | -464800 | -8382 | 0 | 0 |
| 4 | true | 861046 | 547258 | 0 | 0 | 0 | 0 | 98120 | 574560 | 25500 | 8500 | 5000 | -556800 | -14801 | 0 | 0 |
| 5 | true | 975722 | 695825 | 0 | 0 | 0 | 0 | 98600 | 574560 | 25500 | 8500 | -3700 | -570700 | -18084 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 23757

Regular: 55.0% wins / 120 games; finals: 28.6% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 70 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 151847 | 0 | 0 | 0 | 0 | 0 | 37160 | 421722 | 15000 | 20000 | -8000 | -343400 | -30635 | -20000 | 0 |
| 2 | true | 100347 | 14898 | 0 | 0 | 0 | 0 | 45080 | 454797 | 15000 | 10000 | -23900 | -529000 | -23477 | 0 | 0 |
| 3 | true | 255132 | 65 | 0 | 0 | 0 | 0 | 49880 | 476564 | 70000 | 20000 | 2000 | -458700 | -4959 | 0 | 0 |
| 4 | true | 301891 | 73192 | 0 | 0 | 0 | 0 | 58200 | 482013 | 15000 | 10000 | 5600 | -519600 | -4454 | 0 | 0 |
| 5 | true | 381112 | 57305 | 0 | 0 | 0 | 0 | 61480 | 552038 | 15000 | 10000 | 1800 | -548100 | -12997 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 23757

Regular: 54.2% wins / 96 games; finals: 33.3% wins / 6 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 76 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 41686 | 250 | 0 | 0 | 0 | 0 | 37160 | 303744 | 18000 | 12000 | -3200 | -319700 | -51318 | 0 | 0 |
| 2 | true | 220467 | 47 | 0 | 0 | 0 | 0 | 42320 | 500420 | 84000 | 12000 | -36100 | -397700 | -6159 | -20000 | 0 |
| 3 | true | 231020 | 87205 | 0 | 0 | 0 | 0 | 54880 | 513335 | 18000 | 12000 | 8000 | -580200 | -15462 | 0 | 0 |
| 4 | true | 214266 | 75101 | 0 | 0 | 0 | 0 | 63280 | 502593 | 18000 | 12000 | 9600 | -598600 | -23627 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 23757

Regular: 68.3% wins / 120 games; finals: 50.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 80 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 577503 | 82000 | 0 | 0 | 0 | 0 | 37320 | 433783 | 25500 | 17000 | -18100 | 0 | 0 | -8000 | 0 |
| 2 | true | 1093207 | 504203 | 0 | 0 | 0 | 0 | 49320 | 526184 | 25500 | 8500 | -19900 | -73900 | 0 | 0 | 0 |
| 3 | true | 1654800 | 997407 | 0 | 0 | 0 | 0 | 55640 | 563653 | 25500 | 17000 | -4400 | -95800 | 0 | 0 | 0 |
| 4 | true | 2282176 | 1543600 | 0 | 0 | 0 | 0 | 70400 | 614376 | 59500 | 8500 | -14200 | -111200 | 0 | 0 | 0 |
| 5 | true | 2775466 | 2125176 | 0 | 0 | 0 | 0 | 88800 | 534240 | 12750 | 8500 | 6000 | -157000 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 23757

Regular: 46.9% wins / 96 games; finals: 75.0% wins / 4 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 101 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 416805 | 52000 | 0 | 0 | 0 | 0 | 39800 | 336105 | 0 | 0 | -11100 | 0 | 0 | -8000 | 0 |
| 2 | true | 731864 | 364705 | 0 | 0 | 0 | 0 | 39200 | 358659 | 0 | 0 | -30100 | -52700 | 0 | 0 | 0 |
| 3 | true | 1273344 | 633864 | 0 | 0 | 0 | 0 | 35520 | 435960 | 145000 | 20000 | 500 | -95500 | 0 | 0 | 0 |
| 4 | true | 1747144 | 1135144 | 0 | 0 | 0 | 0 | 60200 | 546000 | 15000 | 10000 | -22200 | -135200 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 23757

Regular: 52.5% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 102 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 519528 | 44500 | 0 | 0 | 0 | 0 | 37320 | 351708 | 84000 | 24000 | -14500 | 0 | 0 | -8000 | 0 |
| 2 | true | 1254448 | 519528 | 0 | 0 | 0 | 0 | 50480 | 609840 | 84000 | 12000 | -21400 | 0 | 0 | 0 | 0 |
| 3 | true | 1950528 | 1164948 | 0 | 0 | 0 | 0 | 61440 | 620540 | 84000 | 24000 | -4400 | -89500 | 0 | 0 | 0 |
| 4 | true | 2437368 | 1824428 | 0 | 0 | 0 | 0 | 77840 | 514500 | 18000 | 0 | 2600 | -126100 | 0 | 0 | 0 |
| 5 | true | 2850756 | 2274868 | 0 | 0 | 0 | 0 | 76440 | 513198 | 0 | 0 | -13750 | -162500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 23757

Regular: 79.2% wins / 120 games; finals: 85.7% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 69 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 215666 | 42748 | 0 | 0 | 0 | 0 | 38800 | 460736 | 123250 | 17000 | 14000 | -113120 | 0 | -415000 | 0 |
| 2 | true | 123966 | 43346 | 0 | 0 | 0 | 0 | 68280 | 574560 | 25500 | 8500 | -14050 | -149490 | 0 | -605000 | 0 |
| 3 | true | 608045 | 43146 | 0 | 0 | 0 | 0 | 76880 | 906879 | 123250 | 17000 | 10600 | -110530 | 0 | -540000 | 0 |
| 4 | true | 1674419 | 537205 | 0 | 0 | 0 | 0 | 102360 | 1256704 | 123250 | 8500 | 6400 | -70840 | 0 | -360000 | 0 |
| 5 | true | 3160779 | 1639279 | 0 | 0 | 0 | 0 | 111800 | 1341700 | 59500 | 8500 | 0 | -35140 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 23757

Regular: 55.8% wins / 120 games; finals: 66.7% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / 82 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 92397 | 40544 | 0 | 0 | 0 | 0 | 35320 | 401457 | 15000 | 20000 | -14800 | -59580 | 0 | -365000 | 0 |
| 2 | true | 249486 | 41707 | 0 | 0 | 0 | 0 | 46120 | 584819 | 145000 | 10000 | 16100 | -199950 | 0 | -445000 | 0 |
| 3 | true | 240782 | 41216 | 0 | 0 | 0 | 0 | 71840 | 572796 | 0 | 10000 | 10600 | -163940 | 0 | -510000 | 0 |
| 4 | true | 847550 | 141662 | 0 | 0 | 0 | 0 | 75200 | 618188 | 0 | 0 | 12500 | -99120 | 0 | 0 | 0 |
| 5 | true | 1587220 | 821370 | 0 | 0 | 0 | 0 | 76240 | 880310 | 30000 | 10000 | 9300 | -26180 | 0 | -240000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 23757

Regular: 59.4% wins / 96 games; finals: 75.0% wins / 4 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 40 / 77 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 110021 | 42300 | 0 | 0 | 0 | 0 | 35680 | 426951 | 18000 | 24000 | -16300 | -62310 | 0 | -361000 | 0 |
| 2 | true | 330559 | 41106 | 0 | 0 | 0 | 0 | 46360 | 571578 | 174000 | 12000 | -11280 | -153120 | 0 | -419000 | 0 |
| 3 | true | 290057 | 51699 | 0 | 0 | 0 | 0 | 70680 | 538818 | 0 | 0 | 14600 | -124600 | 0 | -540000 | 0 |
| 4 | true | 904849 | 210117 | 0 | 0 | 0 | 0 | 71720 | 610512 | 0 | 0 | 12500 | -79940 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 23757

Regular: 50.0% wins / 120 games; finals: 33.3% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 468982 | 90000 | 0 | 0 | 0 | 0 | 36080 | 328002 | 25500 | 8500 | -19100 | 0 | 0 | 0 | 0 |
| 2 | true | 919816 | 425682 | 0 | 0 | 0 | 0 | 41160 | 464024 | 12750 | 8500 | -31700 | -43900 | 0 | 0 | 0 |
| 3 | true | 1397091 | 811016 | 0 | 0 | 0 | 0 | 47080 | 514795 | 25500 | 17000 | -3000 | -124100 | 0 | 0 | 0 |
| 4 | true | 1703772 | 1209491 | 0 | 0 | 0 | 0 | 55040 | 433641 | 0 | 0 | 5600 | -187600 | 0 | 0 | 0 |
| 5 | true | 1994055 | 1516172 | 0 | 0 | 0 | 0 | 54320 | 439913 | 12750 | 8500 | -37600 | -187600 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 23757

Regular: 31.3% wins / 96 games; finals: 66.7% wins / 3 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 413407 | 60000 | 0 | 0 | 0 | 0 | 36080 | 333627 | 0 | 0 | -16300 | 0 | 0 | 0 | 0 |
| 2 | true | 724548 | 382307 | 0 | 0 | 0 | 0 | 33960 | 333281 | 0 | 10000 | -22400 | -43700 | 0 | 0 | 0 |
| 3 | true | 1220009 | 606748 | 0 | 0 | 0 | 0 | 36640 | 499821 | 70000 | 10000 | 14000 | -135000 | 0 | 0 | 0 |
| 4 | true | 1418563 | 1026109 | 0 | 0 | 0 | 0 | 48840 | 353714 | 0 | 0 | 2600 | -206600 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 23757

Regular: 38.5% wins / 96 games; finals: 100.0% wins / 3 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 661068 | 45000 | 0 | 0 | 0 | 0 | 36080 | 397488 | 174000 | 24000 | -15500 | 0 | 0 | 0 | 0 |
| 2 | true | 1190068 | 661068 | 0 | 0 | 0 | 0 | 62680 | 502520 | 0 | 0 | -36200 | 0 | 0 | 0 | 0 |
| 3 | true | 1596648 | 1034211 | 0 | 0 | 0 | 0 | 63320 | 499160 | 0 | 0 | 12000 | -167900 | 0 | 0 | 0 |
| 4 | true | 1864473 | 1389848 | 0 | 0 | 0 | 0 | 61600 | 441725 | 0 | 0 | 0 | -235500 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 31676

Regular: 70.8% wins / 120 games; finals: 85.7% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 54 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 227921 | 740 | 0 | 0 | 0 | 0 | 35320 | 408560 | 59500 | 17000 | 3600 | -318800 | -47259 | -20000 | 0 |
| 2 | true | 389271 | 98832 | 0 | 0 | 0 | 0 | 51040 | 527507 | 123250 | 8500 | 4000 | -518600 | -34347 | 0 | 0 |
| 3 | true | 680969 | 190279 | 0 | 0 | 0 | 0 | 76080 | 614880 | 123250 | 17000 | -35900 | -492600 | -11012 | 0 | 0 |
| 4 | true | 786172 | 455213 | 0 | 0 | 0 | 0 | 102680 | 574560 | 25500 | 8500 | 3000 | -592700 | -16337 | 0 | 0 |
| 5 | true | 1018089 | 523556 | 0 | 0 | 0 | 0 | 110960 | 614880 | 123250 | 8500 | -3400 | -605000 | -17273 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 31676

Regular: 38.5% wins / 96 games; finals: 50.0% wins / 2 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 17568 | 400 | 0 | 0 | 0 | 0 | 34880 | 323064 | 0 | 0 | -12900 | -325100 | -42376 | -20000 | 0 |
| 2 | true | 44086 | 54 | 0 | 0 | 0 | 0 | 37000 | 360665 | 30000 | 10000 | 600 | -405300 | -6447 | 0 | 0 |
| 3 | true | 41351 | 12 | 0 | 0 | 0 | 0 | 43080 | 413081 | 0 | 10000 | 5000 | -469000 | -4896 | 0 | 0 |
| 4 | true | 10807 | 329 | 0 | 0 | 0 | 0 | 48560 | 402833 | 0 | 0 | 0 | -477800 | -4137 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 31676

Regular: 37.5% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 6254 | 578 | 0 | 0 | 0 | 0 | 34800 | 323064 | 0 | 0 | 12550 | -360700 | -48460 | 0 | 0 |
| 2 | true | 39734 | 303 | 0 | 0 | 0 | 0 | 32840 | 330656 | 18000 | 12000 | -1750 | -353100 | -5166 | 0 | 0 |
| 3 | true | 10990 | 21 | 0 | 0 | 0 | 0 | 37360 | 312753 | 0 | 0 | 7000 | -378100 | -7757 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 31676

Regular: 57.5% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 132 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 548172 | 89248 | 0 | 0 | 0 | 0 | 34320 | 325302 | 123250 | 8500 | -25200 | 0 | 0 | -8000 | 0 |
| 2 | true | 1315487 | 548172 | 0 | 0 | 0 | 0 | 54600 | 586365 | 123250 | 8500 | -5400 | 0 | 0 | 0 | 0 |
| 3 | true | 2097217 | 1291927 | 0 | 0 | 0 | 0 | 75400 | 614880 | 123250 | 17000 | -9800 | -39000 | 0 | 0 | 0 |
| 4 | true | 2672017 | 1963177 | 0 | 0 | 0 | 0 | 99640 | 574560 | 25500 | 8500 | -2000 | -131400 | 0 | 0 | 0 |
| 5 | true | 3150647 | 2529317 | 0 | 0 | 0 | 0 | 100240 | 534240 | 12750 | 8500 | -34400 | -142700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 31676

Regular: 55.0% wins / 120 games; finals: 66.7% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 382804 | 59500 | 0 | 0 | 0 | 0 | 34320 | 323484 | 0 | 0 | -27000 | 0 | 0 | -8000 | 0 |
| 2 | true | 794838 | 382804 | 0 | 0 | 0 | 0 | 39640 | 367794 | 0 | 10000 | -5400 | 0 | 0 | 0 | 0 |
| 3 | true | 1354376 | 761138 | 0 | 0 | 0 | 0 | 49040 | 492198 | 15000 | 20000 | 12000 | -28700 | 0 | 0 | 0 |
| 4 | true | 1856446 | 1219476 | 0 | 0 | 0 | 0 | 52480 | 543890 | 30000 | 10000 | -1900 | -132400 | 0 | 0 | 0 |
| 5 | true | 2590354 | 1728046 | 0 | 0 | 0 | 0 | 61240 | 632468 | 145000 | 10000 | 11600 | -126400 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 31676

Regular: 42.7% wins / 96 games; finals: 33.3% wins / 3 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 377955 | 44500 | 0 | 0 | 0 | 0 | 34760 | 333795 | 0 | 0 | -27600 | 0 | 0 | -8000 | 0 |
| 2 | true | 887756 | 377955 | 0 | 0 | 0 | 0 | 38880 | 422321 | 36000 | 12000 | 600 | 0 | 0 | 0 | 0 |
| 3 | true | 1360496 | 887756 | 0 | 0 | 0 | 0 | 48280 | 421460 | 0 | 12000 | -9000 | 0 | 0 | 0 | 0 |
| 4 | true | 1769270 | 1238896 | 0 | 0 | 0 | 0 | 54600 | 464174 | 18000 | 12000 | -11400 | -128600 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 31676

Regular: 81.7% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 40 / 74 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 98085 | 41255 | 0 | 0 | 0 | 0 | 37080 | 420095 | 12750 | 17000 | 1400 | -65240 | 0 | -415000 | 0 |
| 2 | true | 315922 | 40018 | 0 | 0 | 0 | 0 | 49120 | 577747 | 123250 | 8500 | 6000 | -181780 | 0 | -365000 | 0 |
| 3 | true | 683151 | 44428 | 0 | 0 | 0 | 0 | 79040 | 990339 | 123250 | 17000 | 16000 | -78400 | 0 | -780000 | 0 |
| 4 | true | 1775885 | 606151 | 0 | 0 | 0 | 0 | 107400 | 1285584 | 123250 | 8500 | 5000 | -77000 | 0 | -360000 | 0 |
| 5 | true | 3107956 | 1749165 | 0 | 0 | 0 | 0 | 111440 | 1204551 | 25500 | 8500 | 6300 | -24220 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 31676

Regular: 63.3% wins / 120 games; finals: 92.3% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 41 / 66 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 92549 | 41172 | 0 | 0 | 0 | 0 | 38120 | 414309 | 15000 | 20000 | 4400 | -44280 | 0 | -415000 | 0 |
| 2 | true | 291357 | 44099 | 0 | 0 | 0 | 0 | 48080 | 549528 | 145000 | 10000 | 8000 | -196800 | 0 | -365000 | 0 |
| 3 | true | 484499 | 44887 | 0 | 0 | 0 | 0 | 75280 | 796152 | 145000 | 20000 | 3000 | -66290 | 0 | -780000 | 0 |
| 4 | true | 1723606 | 441819 | 0 | 0 | 0 | 0 | 98080 | 1024107 | 145000 | 10000 | 2100 | -40180 | 0 | 0 | 0 |
| 5 | true | 2957177 | 1715906 | 0 | 0 | 0 | 0 | 113760 | 1320911 | 145000 | 10000 | 11600 | -7700 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 31676

Regular: 57.5% wins / 120 games; finals: 42.9% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 49 / 85 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 100756 | 40464 | 0 | 0 | 0 | 0 | 34600 | 339486 | 18000 | 24000 | 2600 | -51930 | 0 | -311000 | 0 |
| 2 | true | 72467 | 40867 | 0 | 0 | 0 | 0 | 42280 | 428001 | 18000 | 12000 | -1840 | -222730 | 0 | -304000 | 0 |
| 3 | true | 106052 | 42744 | 0 | 0 | 0 | 0 | 47320 | 444245 | 18000 | 24000 | 7500 | -102480 | 0 | -405000 | 0 |
| 4 | true | 685657 | 50262 | 0 | 0 | 0 | 0 | 53760 | 719345 | 174000 | 12000 | 1000 | -80500 | 0 | -300000 | 0 |
| 5 | true | 1395929 | 656467 | 0 | 0 | 0 | 0 | 81240 | 852422 | 18000 | 12000 | 15800 | -29190 | 0 | -240000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 31676

Regular: 52.5% wins / 120 games; finals: 40.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 457836 | 90000 | 0 | 0 | 0 | 0 | 35280 | 328506 | 12750 | 17000 | -25700 | 0 | 0 | 0 | 0 |
| 2 | true | 1054413 | 429736 | 0 | 0 | 0 | 0 | 44880 | 525197 | 59500 | 8500 | -15900 | -25600 | 0 | 0 | 0 |
| 3 | true | 1586109 | 996013 | 0 | 0 | 0 | 0 | 58560 | 507186 | 12750 | 17000 | 10000 | -73800 | 0 | 0 | 0 |
| 4 | true | 1931294 | 1382709 | 0 | 0 | 0 | 0 | 66640 | 490745 | 0 | 0 | 6200 | -218400 | 0 | 0 | 0 |
| 5 | true | 2281086 | 1737294 | 0 | 0 | 0 | 0 | 71560 | 477832 | 0 | 0 | 7600 | -207200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 31676

Regular: 51.0% wins / 96 games; finals: 57.1% wins / 7 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 709102 | 60000 | 0 | 0 | 0 | 0 | 37040 | 438312 | 145000 | 20000 | 8750 | 0 | 0 | 0 | 0 |
| 2 | true | 1341202 | 675702 | 0 | 0 | 0 | 0 | 66040 | 550610 | 30000 | 10000 | 5850 | -30400 | 0 | 0 | 0 |
| 3 | true | 1863518 | 1283502 | 0 | 0 | 0 | 0 | 72080 | 506436 | 15000 | 0 | -13500 | -57700 | 0 | 0 | 0 |
| 4 | true | 2240338 | 1655618 | 0 | 0 | 0 | 0 | 68720 | 514500 | 15000 | 0 | -500 | -220900 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 31676

Regular: 34.4% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 397689 | 45000 | 0 | 0 | 0 | 0 | 35280 | 319809 | 0 | 0 | -2400 | 0 | 0 | 0 | 0 |
| 2 | true | 799097 | 382989 | 0 | 0 | 0 | 0 | 32960 | 344148 | 18000 | 12000 | 6500 | -12200 | 0 | 0 | 0 |
| 3 | true | 1087019 | 691297 | 0 | 0 | 0 | 0 | 34720 | 327002 | 18000 | 24000 | -9900 | -105900 | 0 | 0 | 0 |
| 4 | true | 1277057 | 903119 | 0 | 0 | 0 | 0 | 42160 | 344778 | 0 | 0 | 2600 | -199500 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 39595

Regular: 69.2% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 55 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 268278 | 409 | 0 | 0 | 0 | 0 | 36240 | 451200 | 25500 | 17000 | 15600 | -329900 | -17362 | -20000 | 0 |
| 2 | true | 316788 | 181063 | 0 | 0 | 0 | 0 | 46520 | 457440 | 25500 | 8500 | -2000 | -471800 | -15650 | 0 | 0 |
| 3 | true | 539882 | 114992 | 0 | 0 | 0 | 0 | 48680 | 569812 | 123250 | 17000 | 0 | -525600 | -10048 | 0 | 0 |
| 4 | true | 749773 | 299352 | 0 | 0 | 0 | 0 | 76560 | 614880 | 59500 | 8500 | -7000 | -531400 | -11149 | 0 | 0 |
| 5 | true | 834741 | 491052 | 0 | 0 | 0 | 0 | 84160 | 534240 | 12750 | 8500 | -12000 | -531700 | -10982 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 39595

Regular: 60.0% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 72 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 388743 | 1593 | 0 | 0 | 0 | 0 | 35000 | 481341 | 145000 | 20000 | 7000 | -308100 | -31498 | -20000 | 0 |
| 2 | true | 537315 | 323719 | 0 | 0 | 0 | 0 | 60040 | 590405 | 30000 | 10000 | -7000 | -514800 | -20073 | 0 | 0 |
| 3 | true | 632681 | 386710 | 0 | 0 | 0 | 0 | 65360 | 553245 | 15000 | 20000 | 1000 | -544900 | -14339 | 0 | 0 |
| 4 | true | 753699 | 463561 | 0 | 0 | 0 | 0 | 73880 | 556500 | 30000 | 10000 | -5000 | -534100 | -10262 | 0 | 0 |
| 5 | true | 851475 | 574643 | 0 | 0 | 0 | 0 | 74800 | 598500 | 30000 | 10000 | 2600 | -599200 | -18924 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 39595

Regular: 51.0% wins / 96 games; finals: 66.7% wins / 6 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 104 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 225357 | 14 | 0 | 0 | 0 | 0 | 33480 | 471009 | 84000 | 24000 | -250 | -365000 | -46882 | -20000 | 0 |
| 2 | true | 360939 | 125792 | 0 | 0 | 0 | 0 | 48960 | 481278 | 84000 | 12000 | 4650 | -482900 | -12406 | 0 | 0 |
| 3 | true | 311215 | 233588 | 0 | 0 | 0 | 0 | 60240 | 479882 | 0 | 12000 | -26900 | -557400 | -17546 | 0 | 0 |
| 4 | true | 295143 | 171385 | 0 | 0 | 0 | 0 | 59960 | 497711 | 0 | 0 | -3300 | -556700 | -13743 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 39595

Regular: 74.2% wins / 120 games; finals: 86.7% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 69 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 745221 | 82000 | 0 | 0 | 0 | 0 | 36040 | 492931 | 123250 | 17000 | -6000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1496985 | 676221 | 0 | 0 | 0 | 0 | 66880 | 611534 | 123250 | 8500 | 10600 | -69000 | 0 | 0 | 0 |
| 3 | true | 2148945 | 1387585 | 0 | 0 | 0 | 0 | 93480 | 614880 | 59500 | 17000 | -23500 | -109400 | 0 | 0 | 0 |
| 4 | true | 2858215 | 2010645 | 0 | 0 | 0 | 0 | 104440 | 614880 | 123250 | 8500 | -6000 | -135800 | 0 | 0 | 0 |
| 5 | true | 3545145 | 2712415 | 0 | 0 | 0 | 0 | 112400 | 614880 | 123250 | 8500 | -26300 | -145800 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 39595

Regular: 61.7% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 91 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 602103 | 52000 | 0 | 0 | 0 | 0 | 36040 | 357063 | 145000 | 20000 | -8000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1095021 | 535503 | 0 | 0 | 0 | 0 | 61760 | 487158 | 0 | 0 | 10600 | -66600 | 0 | 0 | 0 |
| 3 | true | 1768214 | 992521 | 0 | 0 | 0 | 0 | 64480 | 637613 | 70000 | 20000 | -16400 | -102500 | 0 | 0 | 0 |
| 4 | true | 2430474 | 1635714 | 0 | 0 | 0 | 0 | 77760 | 640500 | 70000 | 10000 | -6000 | -130000 | 0 | 0 | 0 |
| 5 | true | 3074754 | 2294274 | 0 | 0 | 0 | 0 | 88480 | 640500 | 70000 | 10000 | -28500 | -136200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 39595

Regular: 60.8% wins / 120 games; finals: 81.8% wins / 11 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 110 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 480675 | 44500 | 0 | 0 | 0 | 0 | 36040 | 355635 | 36000 | 24000 | -8000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1196853 | 447475 | 0 | 0 | 0 | 0 | 46000 | 596778 | 84000 | 12000 | 10600 | -33200 | 0 | 0 | 0 |
| 3 | true | 1626016 | 1098353 | 0 | 0 | 0 | 0 | 62120 | 484943 | 0 | 0 | -19400 | -98500 | 0 | 0 | 0 |
| 4 | true | 2358876 | 1490316 | 0 | 0 | 0 | 0 | 64240 | 636720 | 174000 | 12000 | -18400 | -135700 | 0 | 0 | 0 |
| 5 | true | 3081476 | 2199676 | 0 | 0 | 0 | 0 | 88600 | 640500 | 174000 | 12000 | -33300 | -159200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 39595

Regular: 81.7% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 39 / 72 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 95961 | 44371 | 0 | 0 | 0 | 0 | 39360 | 443561 | 12750 | 17000 | -27830 | -63880 | 0 | -415000 | 0 |
| 2 | true | 181895 | 40721 | 0 | 0 | 0 | 0 | 52320 | 518244 | 12750 | 8500 | 11700 | -152580 | 0 | -365000 | 0 |
| 3 | true | 237292 | 41319 | 0 | 0 | 0 | 0 | 63760 | 780857 | 59500 | 17000 | 8500 | -94220 | 0 | -780000 | 0 |
| 4 | true | 1189908 | 167682 | 0 | 0 | 0 | 0 | 78440 | 896186 | 25500 | 8500 | 14200 | -70210 | 0 | 0 | 0 |
| 5 | true | 2091709 | 1169608 | 0 | 0 | 0 | 0 | 87120 | 1058631 | 123250 | 8500 | 4600 | -20300 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 39595

Regular: 61.7% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 38 / 61 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 277058 | 41038 | 0 | 0 | 0 | 0 | 35360 | 492828 | 145000 | 20000 | -250 | -110880 | 0 | -365000 | 0 |
| 2 | true | 314231 | 40311 | 0 | 0 | 0 | 0 | 66200 | 637613 | 145000 | 10000 | 12450 | -179090 | 0 | -655000 | 0 |
| 3 | true | 792659 | 46416 | 0 | 0 | 0 | 0 | 93760 | 950838 | 15000 | 20000 | 6800 | -67970 | 0 | -540000 | 0 |
| 4 | true | 1703911 | 702219 | 0 | 0 | 0 | 0 | 99040 | 811052 | 70000 | 0 | 21600 | -90440 | 0 | 0 | 0 |
| 5 | true | 2620034 | 1687321 | 0 | 0 | 0 | 0 | 102160 | 812753 | 15000 | 0 | 2800 | -16590 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 39595

Regular: 58.3% wins / 120 games; finals: 55.6% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 45 / 85 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 206849 | 42252 | 0 | 0 | 0 | 0 | 34760 | 473529 | 84000 | 24000 | -250 | -89190 | 0 | -365000 | 0 |
| 2 | true | 216269 | 43537 | 0 | 0 | 0 | 0 | 48840 | 486560 | 84000 | 12000 | 15450 | -222430 | 0 | -415000 | 0 |
| 3 | true | 337306 | 42197 | 0 | 0 | 0 | 0 | 61920 | 658067 | 36000 | 24000 | 6000 | -124950 | 0 | -540000 | 0 |
| 4 | true | 1125969 | 246336 | 0 | 0 | 0 | 0 | 72760 | 777473 | 18000 | 12000 | -2600 | -88970 | 0 | 0 | 0 |
| 5 | true | 1826178 | 1096079 | 0 | 0 | 0 | 0 | 78280 | 651819 | 0 | 0 | 0 | -29890 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 39595

Regular: 60.0% wins / 120 games; finals: 28.6% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 642194 | 90000 | 0 | 0 | 0 | 0 | 39040 | 462654 | 25500 | 17000 | 8000 | 0 | 0 | 0 | 0 |
| 2 | true | 1203925 | 632294 | 0 | 0 | 0 | 0 | 55520 | 516761 | 12750 | 8500 | -6800 | -25000 | 0 | 0 | 0 |
| 3 | true | 1661045 | 1054025 | 0 | 0 | 0 | 0 | 68680 | 534240 | 25500 | 8500 | -29900 | -149900 | 0 | 0 | 0 |
| 4 | true | 2084875 | 1468345 | 0 | 0 | 0 | 0 | 72440 | 534240 | 12750 | 8500 | 6000 | -210100 | 0 | 0 | 0 |
| 5 | true | 2628735 | 2084875 | 0 | 0 | 0 | 0 | 73040 | 493920 | 12750 | 0 | -26150 | -9700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 39595

Regular: 55.2% wins / 96 games; finals: 77.8% wins / 9 games; finals share: 100.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 699431 | 60000 | 0 | 0 | 0 | 0 | 36040 | 440391 | 145000 | 10000 | 8000 | 0 | 0 | 0 | 0 |
| 2 | true | 1497686 | 671431 | 0 | 0 | 0 | 0 | 60120 | 626535 | 145000 | 10000 | -15400 | -28000 | 0 | 0 | 0 |
| 3 | true | 1936186 | 1349886 | 0 | 0 | 0 | 0 | 89600 | 514500 | 30000 | 0 | -28000 | -167600 | 0 | 0 | 0 |
| 4 | true | 2342366 | 1686286 | 0 | 0 | 0 | 0 | 91480 | 556500 | 15000 | 10000 | 600 | -267400 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 39595

Regular: 45.8% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 562096 | 45000 | 0 | 0 | 0 | 0 | 39200 | 427896 | 18000 | 24000 | 8000 | 0 | 0 | 0 | 0 |
| 2 | true | 1125227 | 504596 | 0 | 0 | 0 | 0 | 56040 | 541391 | 18000 | 12000 | -6800 | -57500 | 0 | 0 | 0 |
| 3 | true | 1512819 | 970827 | 0 | 0 | 0 | 0 | 63800 | 494792 | 0 | 0 | 0 | -171000 | 0 | 0 | 0 |
| 4 | true | 1799665 | 1293362 | 0 | 0 | 0 | 0 | 61040 | 452456 | 0 | 0 | -3150 | -223500 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 47514

Regular: 70.8% wins / 120 games; finals: 78.6% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 47 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 137436 | 838 | 0 | 0 | 0 | 0 | 35760 | 337638 | 59500 | 8500 | -4000 | -331000 | -38962 | -20000 | 0 |
| 2 | true | 334098 | 284 | 0 | 0 | 0 | 0 | 40880 | 530531 | 123250 | 8500 | 3800 | -494400 | -15899 | 0 | 0 |
| 3 | true | 463921 | 187116 | 0 | 0 | 0 | 0 | 66320 | 572746 | 25500 | 17000 | 10800 | -542900 | -19643 | 0 | 0 |
| 4 | true | 650492 | 230275 | 0 | 0 | 0 | 0 | 76000 | 614880 | 123250 | 8500 | 4000 | -620600 | -19459 | 0 | 0 |
| 5 | true | 896619 | 377490 | 0 | 0 | 0 | 0 | 97800 | 614880 | 59500 | 8500 | 5800 | -531800 | -8553 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 47514

Regular: 57.5% wins / 120 games; finals: 57.1% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 81 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 35259 | 550 | 0 | 0 | 0 | 0 | 34200 | 310905 | 0 | 0 | -1000 | -313900 | -34946 | -20000 | 0 |
| 2 | true | 44449 | 335 | 0 | 0 | 0 | 0 | 35760 | 385970 | 30000 | 10000 | -14700 | -423400 | -14440 | 0 | 0 |
| 3 | true | 160612 | 60 | 0 | 0 | 0 | 0 | 43920 | 481373 | 15000 | 20000 | -200 | -438300 | -5630 | 0 | 0 |
| 4 | true | 291610 | 12 | 0 | 0 | 0 | 0 | 56400 | 533820 | 145000 | 10000 | -6900 | -590400 | -16922 | 0 | 0 |
| 5 | true | 401414 | 69324 | 0 | 0 | 0 | 0 | 80920 | 556500 | 15000 | 10000 | 3000 | -544300 | -11316 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 47514

Regular: 52.5% wins / 120 games; finals: 44.4% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 98 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 84720 | 92 | 0 | 0 | 0 | 0 | 35120 | 379848 | 36000 | 24000 | 3000 | -398800 | -39448 | 0 | 0 |
| 2 | true | 40012 | 539 | 0 | 0 | 0 | 0 | 40880 | 345524 | 18000 | 12000 | -2700 | -425400 | -13012 | -20000 | 0 |
| 3 | true | 285638 | 150 | 0 | 0 | 0 | 0 | 44280 | 556049 | 84000 | 24000 | 9000 | -461900 | -9803 | 0 | 0 |
| 4 | true | 425122 | 102937 | 0 | 0 | 0 | 0 | 57960 | 590604 | 36000 | 12000 | -5100 | -538100 | -13880 | 0 | 0 |
| 5 | true | 471636 | 223766 | 0 | 0 | 0 | 0 | 62360 | 542829 | 18000 | 12000 | -13400 | -562900 | -12375 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 47514

Regular: 55.8% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 62 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 566319 | 82000 | 0 | 0 | 0 | 0 | 37240 | 440879 | 25500 | 17000 | -36300 | 0 | 0 | -8000 | 0 |
| 2 | true | 1039271 | 563819 | 0 | 0 | 0 | 0 | 48880 | 414472 | 0 | 8500 | 1100 | 0 | 0 | 0 | 0 |
| 3 | true | 1500581 | 965171 | 0 | 0 | 0 | 0 | 50320 | 471340 | 12750 | 17000 | -18500 | -71600 | 0 | 0 | 0 |
| 4 | true | 1916076 | 1379581 | 0 | 0 | 0 | 0 | 55680 | 465465 | 12750 | 8500 | -5900 | -121000 | 0 | 0 | 0 |
| 5 | true | 2399301 | 1792476 | 0 | 0 | 0 | 0 | 60800 | 519775 | 12750 | 8500 | 5000 | -123600 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 47514

Regular: 46.9% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 113 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 432328 | 52000 | 0 | 0 | 0 | 0 | 37240 | 334488 | 0 | 10000 | -1400 | 0 | 0 | -8000 | 0 |
| 2 | true | 919939 | 413428 | 0 | 0 | 0 | 0 | 42200 | 434711 | 30000 | 10000 | -12900 | -16400 | 0 | 0 | 0 |
| 3 | true | 1419339 | 845879 | 0 | 0 | 0 | 0 | 46840 | 480260 | 30000 | 20000 | -4500 | -73200 | 0 | 0 | 0 |
| 4 | true | 1877565 | 1299539 | 0 | 0 | 0 | 0 | 50760 | 507266 | 15000 | 10000 | -7500 | -117300 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 47514

Regular: 35.4% wins / 96 games; finals: n/a wins / 0 games; finals share: 0.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 420983 | 44500 | 0 | 0 | 0 | 0 | 36560 | 339423 | 0 | 12000 | -4000 | 0 | 0 | -8000 | 0 |
| 2 | true | 772967 | 370783 | 0 | 0 | 0 | 0 | 44280 | 370304 | 0 | 0 | -12400 | -50200 | 0 | 0 | 0 |
| 3 | true | 1115016 | 664667 | 0 | 0 | 0 | 0 | 45880 | 392469 | 0 | 12000 | 5000 | -113300 | 0 | 0 | 0 |
| 4 | true | 1456125 | 977616 | 0 | 0 | 0 | 0 | 54360 | 461349 | 0 | 0 | -37200 | -137400 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 47514

Regular: 72.5% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 33 / 63 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 226758 | 41862 | 0 | 0 | 0 | 0 | 36400 | 494928 | 123250 | 17000 | 10800 | -70620 | 0 | -475000 | 0 |
| 2 | true | 327274 | 48884 | 0 | 0 | 0 | 0 | 68680 | 614376 | 123250 | 8500 | 3600 | -172890 | 0 | -545000 | 0 |
| 3 | true | 725992 | 51133 | 0 | 0 | 0 | 0 | 95440 | 1113578 | 123250 | 17000 | 9300 | -59850 | 0 | -900000 | 0 |
| 4 | true | 1987849 | 684782 | 0 | 0 | 0 | 0 | 110360 | 1136007 | 25500 | 8500 | 20200 | -38710 | 0 | 0 | 0 |
| 5 | true | 3257666 | 1974479 | 0 | 0 | 0 | 0 | 111800 | 1133687 | 25500 | 8500 | 3700 | -13370 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 47514

Regular: 64.2% wins / 120 games; finals: 69.2% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 39 / 71 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 100244 | 40316 | 0 | 0 | 0 | 0 | 36880 | 347844 | 15000 | 20000 | 900 | -69380 | 0 | -311000 | 0 |
| 2 | true | 206197 | 43744 | 0 | 0 | 0 | 0 | 43520 | 557183 | 70000 | 10000 | 10400 | -206150 | 0 | -379000 | 0 |
| 3 | true | 218730 | 44452 | 0 | 0 | 0 | 0 | 56400 | 556553 | 70000 | 10000 | 7050 | -57470 | 0 | -630000 | 0 |
| 4 | true | 905433 | 147960 | 0 | 0 | 0 | 0 | 65760 | 829563 | 70000 | 10000 | 22150 | -70770 | 0 | -240000 | 0 |
| 5 | true | 2164339 | 887793 | 0 | 0 | 0 | 0 | 77360 | 1043186 | 145000 | 10000 | 1000 | -17640 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 47514

Regular: 57.5% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 48 / 88 / 137; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 77069 | 40947 | 0 | 0 | 0 | 0 | 36840 | 343119 | 0 | 12000 | -34100 | -38790 | 0 | -287000 | 0 |
| 2 | true | 278998 | 40648 | 0 | 0 | 0 | 0 | 44280 | 449369 | 174000 | 12000 | -17660 | -192060 | 0 | -268000 | 0 |
| 3 | true | 216065 | 48926 | 0 | 0 | 0 | 0 | 68960 | 585617 | 36000 | 24000 | 3250 | -195760 | 0 | -585000 | 0 |
| 4 | true | 1003811 | 54678 | 0 | 0 | 0 | 0 | 83320 | 1035846 | 174000 | 12000 | 21650 | -119070 | 0 | -420000 | 0 |
| 5 | true | 1858546 | 987431 | 0 | 0 | 0 | 0 | 108600 | 1092515 | 18000 | 12000 | 0 | -16380 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 47514

Regular: 48.3% wins / 120 games; finals: 75.0% wins / 8 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 703561 | 90000 | 0 | 0 | 0 | 0 | 37680 | 435031 | 123250 | 17000 | 600 | 0 | 0 | 0 | 0 |
| 2 | true | 1369286 | 665761 | 0 | 0 | 0 | 0 | 68400 | 570125 | 59500 | 8500 | 9000 | -49800 | 0 | 0 | 0 |
| 3 | true | 1929406 | 1252946 | 0 | 0 | 0 | 0 | 80160 | 574560 | 25500 | 17000 | -10500 | -126600 | 0 | 0 | 0 |
| 4 | true | 2484986 | 1929406 | 0 | 0 | 0 | 0 | 88560 | 493920 | 0 | 0 | -17300 | -9600 | 0 | 0 | 0 |
| 5 | true | 3042004 | 2482486 | 0 | 0 | 0 | 0 | 77720 | 493698 | 0 | 0 | -2500 | -11900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 47514

Regular: 34.2% wins / 120 games; finals: 75.0% wins / 4 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 587935 | 60000 | 0 | 0 | 0 | 0 | 37680 | 358155 | 145000 | 20000 | -32900 | 0 | 0 | 0 | 0 |
| 2 | true | 1112621 | 550035 | 0 | 0 | 0 | 0 | 64760 | 499926 | 0 | 0 | 4600 | -44600 | 0 | 0 | 0 |
| 3 | true | 1606954 | 1008061 | 0 | 0 | 0 | 0 | 64440 | 504693 | 15000 | 20000 | 4500 | -114300 | 0 | 0 | 0 |
| 4 | true | 2162605 | 1606954 | 0 | 0 | 0 | 0 | 67600 | 492051 | 0 | 0 | 5600 | -9600 | 0 | 0 | 0 |
| 5 | true | 2660322 | 2160105 | 0 | 0 | 0 | 0 | 62840 | 450377 | 0 | 0 | -15500 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 47514

Regular: 27.8% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 354717 | 45000 | 0 | 0 | 0 | 0 | 35760 | 300657 | 0 | 0 | -26700 | 0 | 0 | 0 | 0 |
| 2 | true | 654634 | 293737 | 0 | 0 | 0 | 0 | 32160 | 304857 | 18000 | 12000 | -7500 | -59600 | 0 | 0 | 0 |
| 3 | true | 806312 | 484434 | 0 | 0 | 0 | 0 | 36720 | 306758 | 0 | 0 | -7500 | -184300 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 55433

Regular: 61.7% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 65 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 124294 | 119 | 0 | 0 | 0 | 0 | 36320 | 355987 | 12750 | 17000 | 7000 | -317700 | -44063 | -33000 | 0 |
| 2 | true | 275341 | 167 | 0 | 0 | 0 | 0 | 44040 | 536870 | 59500 | 8500 | 9000 | -496600 | -10263 | 0 | 0 |
| 3 | true | 496816 | 91297 | 0 | 0 | 0 | 0 | 54520 | 584208 | 123250 | 17000 | -5000 | -537700 | -14803 | 0 | 0 |
| 4 | true | 757226 | 282411 | 0 | 0 | 0 | 0 | 73440 | 614880 | 123250 | 8500 | -2500 | -544700 | -12460 | 0 | 0 |
| 5 | true | 968083 | 489215 | 0 | 0 | 0 | 0 | 90320 | 614880 | 59500 | 8500 | 10300 | -557600 | -15043 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 55433

Regular: 41.7% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 3020 | 73 | 0 | 0 | 0 | 0 | 35800 | 334509 | 0 | 0 | 8800 | -352700 | -50389 | -33000 | 0 |
| 2 | true | 29382 | 63 | 0 | 0 | 0 | 0 | 37080 | 350543 | 15000 | 10000 | -2000 | -378100 | -6161 | 0 | 0 |
| 3 | true | 3896 | 68 | 0 | 0 | 0 | 0 | 39280 | 350658 | 0 | 0 | 2000 | -408200 | -9224 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 55433

Regular: 27.8% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 3804 | 84 | 0 | 0 | 0 | 0 | 35240 | 326193 | 0 | 0 | 2000 | -356900 | -47729 | 0 | 0 |
| 2 | true | 11171 | 254 | 0 | 0 | 0 | 0 | 36600 | 335234 | 0 | 0 | 2000 | -356200 | -10267 | 0 | 0 |
| 3 | true | 4279 | 216 | 0 | 0 | 0 | 0 | 38080 | 348117 | 0 | 0 | -1200 | -379500 | -12389 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 55433

Regular: 53.3% wins / 120 games; finals: 42.9% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 75 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 513548 | 83200 | 0 | 0 | 0 | 0 | 36280 | 336068 | 59500 | 17000 | -17300 | 0 | 0 | -8000 | 0 |
| 2 | true | 1008191 | 513548 | 0 | 0 | 0 | 0 | 45040 | 447553 | 12750 | 8500 | -19200 | 0 | 0 | 0 | 0 |
| 3 | true | 1463620 | 955434 | 0 | 0 | 0 | 0 | 54040 | 444689 | 0 | 17000 | 2000 | -62300 | 0 | 0 | 0 |
| 4 | true | 1893607 | 1320920 | 0 | 0 | 0 | 0 | 54920 | 500167 | 25500 | 8500 | -18900 | -140200 | 0 | 0 | 0 |
| 5 | true | 2355478 | 1754307 | 0 | 0 | 0 | 0 | 59120 | 516801 | 12750 | 8500 | 4000 | -139300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 55433

Regular: 48.3% wins / 120 games; finals: 33.3% wins / 3 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 100 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 428597 | 53200 | 0 | 0 | 0 | 0 | 36280 | 337617 | 0 | 20000 | -17300 | 0 | 0 | -8000 | 0 |
| 2 | true | 830140 | 428597 | 0 | 0 | 0 | 0 | 40320 | 356223 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |
| 3 | true | 1341113 | 780740 | 0 | 0 | 0 | 0 | 40640 | 472133 | 30000 | 20000 | -2400 | -49400 | 0 | 0 | 0 |
| 4 | true | 1739111 | 1208513 | 0 | 0 | 0 | 0 | 51600 | 466998 | 0 | 0 | 12000 | -132600 | 0 | 0 | 0 |
| 5 | true | 2173100 | 1608311 | 0 | 0 | 0 | 0 | 53560 | 521829 | 15000 | 10000 | -35600 | -130800 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 55433

Regular: 43.1% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 388670 | 45000 | 0 | 0 | 0 | 0 | 36280 | 335790 | 0 | 0 | -20400 | 0 | 0 | -8000 | 0 |
| 2 | true | 731831 | 388670 | 0 | 0 | 0 | 0 | 33440 | 331821 | 0 | 0 | -22100 | 0 | 0 | 0 | 0 |
| 3 | true | 1117146 | 716734 | 0 | 0 | 0 | 0 | 38960 | 366755 | 0 | 0 | 2000 | -22400 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 55433

Regular: 75.0% wins / 120 games; finals: 92.9% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 69 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 190621 | 39735 | 0 | 0 | 0 | 0 | 35800 | 339011 | 123250 | 8500 | -9000 | -85940 | 0 | -311000 | 0 |
| 2 | true | 171425 | 40326 | 0 | 0 | 0 | 0 | 56600 | 558834 | 25500 | 8500 | 12700 | -92330 | 0 | -589000 | 0 |
| 3 | true | 435516 | 40899 | 0 | 0 | 0 | 0 | 68160 | 840591 | 123250 | 17000 | 600 | -125510 | 0 | -660000 | 0 |
| 4 | true | 1696778 | 367286 | 0 | 0 | 0 | 0 | 91320 | 1099922 | 123250 | 8500 | 4000 | -65730 | 0 | 0 | 0 |
| 5 | true | 2918633 | 1683058 | 0 | 0 | 0 | 0 | 109480 | 1332645 | 123250 | 8500 | 21700 | -13720 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 55433

Regular: 61.7% wins / 120 games; finals: 33.3% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / 91 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 61370 | 40315 | 0 | 0 | 0 | 0 | 35800 | 355950 | 0 | 10000 | -8300 | -81080 | 0 | -311000 | 0 |
| 2 | true | 95880 | 41152 | 0 | 0 | 0 | 0 | 43040 | 401930 | 30000 | 10000 | 12700 | -159160 | 0 | -304000 | 0 |
| 3 | true | 191119 | 41382 | 0 | 0 | 0 | 0 | 53920 | 535479 | 15000 | 20000 | -1400 | -122760 | 0 | -405000 | 0 |
| 4 | true | 522571 | 40461 | 0 | 0 | 0 | 0 | 72400 | 854112 | 30000 | 10000 | 6300 | -101360 | 0 | -540000 | 0 |
| 5 | true | 1423636 | 465521 | 0 | 0 | 0 | 0 | 82760 | 836105 | 15000 | 10000 | 14250 | -57050 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 55433

Regular: 47.9% wins / 96 games; finals: 33.3% wins / 3 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 54 / 91 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 52683 | 29925 | 0 | 0 | 0 | 0 | 35800 | 329133 | 0 | 0 | -10800 | -59450 | 0 | -287000 | 0 |
| 2 | true | 89439 | 40210 | 0 | 0 | 0 | 0 | 38320 | 343896 | 0 | 0 | 14700 | -152160 | 0 | -208000 | 0 |
| 3 | true | 132392 | 41129 | 0 | 0 | 0 | 0 | 45400 | 478643 | 18000 | 24000 | -1400 | -116690 | 0 | -405000 | 0 |
| 4 | true | 241124 | 40216 | 0 | 0 | 0 | 0 | 53040 | 531342 | 36000 | 12000 | 3100 | -106750 | 0 | -420000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 55433

Regular: 47.5% wins / 120 games; finals: 44.4% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 480557 | 90000 | 0 | 0 | 0 | 0 | 36280 | 337177 | 25500 | 8500 | -16900 | 0 | 0 | 0 | 0 |
| 2 | true | 1004305 | 480557 | 0 | 0 | 0 | 0 | 39240 | 438208 | 59500 | 8500 | -21700 | 0 | 0 | 0 | 0 |
| 3 | true | 1605329 | 1001805 | 0 | 0 | 0 | 0 | 49160 | 515864 | 25500 | 17000 | -6500 | 0 | 0 | 0 | 0 |
| 4 | true | 1947989 | 1409429 | 0 | 0 | 0 | 0 | 60440 | 457270 | 12750 | 8500 | -400 | -195900 | 0 | 0 | 0 |
| 5 | true | 2306541 | 1749589 | 0 | 0 | 0 | 0 | 60400 | 476302 | 12750 | 8500 | -3500 | -195900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 55433

Regular: 43.1% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 404692 | 60000 | 0 | 0 | 0 | 0 | 36280 | 324912 | 0 | 0 | -16500 | 0 | 0 | 0 | 0 |
| 2 | true | 794366 | 404692 | 0 | 0 | 0 | 0 | 35600 | 340074 | 15000 | 10000 | -11000 | 0 | 0 | 0 | 0 |
| 3 | true | 1071411 | 712166 | 0 | 0 | 0 | 0 | 38880 | 348065 | 0 | 0 | 3000 | -112900 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 55433

Regular: 37.5% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 413364 | 45000 | 0 | 0 | 0 | 0 | 36280 | 348684 | 0 | 0 | -16600 | 0 | 0 | 0 | 0 |
| 2 | true | 772160 | 413364 | 0 | 0 | 0 | 0 | 35880 | 314916 | 0 | 0 | 8000 | 0 | 0 | 0 | 0 |
| 3 | true | 1075341 | 704260 | 0 | 0 | 0 | 0 | 35160 | 344621 | 0 | 0 | 3000 | -79600 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 63352

Regular: 83.3% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 47 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 126843 | 274 | 0 | 0 | 0 | 0 | 36760 | 427190 | 12750 | 17000 | -1400 | -361100 | -74357 | -20000 | 0 |
| 2 | true | 317853 | 22457 | 0 | 0 | 0 | 0 | 44120 | 540407 | 59500 | 8500 | 5000 | -454700 | -11817 | 0 | 0 |
| 3 | true | 500183 | 126942 | 0 | 0 | 0 | 0 | 59440 | 609437 | 123250 | 17000 | 11800 | -615500 | -23097 | 0 | 0 |
| 4 | true | 739096 | 255007 | 0 | 0 | 0 | 0 | 88960 | 614880 | 123250 | 8500 | -7000 | -571100 | -18577 | 0 | 0 |
| 5 | true | 1088950 | 502937 | 0 | 0 | 0 | 0 | 110600 | 614880 | 123250 | 8500 | 6800 | -507700 | -6476 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 63352

Regular: 70.0% wins / 120 games; finals: 69.2% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 292184 | 0 | 0 | 0 | 0 | 0 | 33560 | 430311 | 70000 | 20000 | 1600 | -271900 | -31387 | -20000 | 0 |
| 2 | true | 359577 | 145798 | 0 | 0 | 0 | 0 | 46920 | 545811 | 30000 | 10000 | 3600 | -520600 | -48338 | 0 | 0 |
| 3 | true | 712032 | 144179 | 0 | 0 | 0 | 0 | 53720 | 626409 | 145000 | 20000 | -30700 | -456600 | -5374 | 0 | 0 |
| 4 | true | 789361 | 487314 | 0 | 0 | 0 | 0 | 81440 | 598500 | 30000 | 10000 | 5500 | -627500 | -20611 | 0 | 0 |
| 5 | true | 1012488 | 570931 | 0 | 0 | 0 | 0 | 85560 | 640500 | 70000 | 10000 | -1000 | -567700 | -14233 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 63352

Regular: 65.0% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 73 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 55489 | 62 | 0 | 0 | 0 | 0 | 30480 | 315210 | 18000 | 24000 | 1000 | -304300 | -40901 | -33000 | 0 |
| 2 | true | 135605 | 113 | 0 | 0 | 0 | 0 | 37440 | 451637 | 36000 | 12000 | 16800 | -456700 | -17061 | 0 | 0 |
| 3 | true | 403326 | 361 | 0 | 0 | 0 | 0 | 46240 | 568649 | 174000 | 24000 | 2600 | -535600 | -12168 | 0 | 0 |
| 4 | true | 674410 | 206046 | 0 | 0 | 0 | 0 | 73840 | 640500 | 84000 | 12000 | 13800 | -541500 | -11556 | 0 | 0 |
| 5 | true | 754006 | 447104 | 0 | 0 | 0 | 0 | 85280 | 556500 | 18000 | 12000 | 5000 | -580600 | -16584 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 63352

Regular: 68.3% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 79 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 641849 | 82000 | 0 | 0 | 0 | 0 | 38080 | 444669 | 59500 | 17000 | 600 | 0 | 0 | -8000 | 0 |
| 2 | true | 1200547 | 641849 | 0 | 0 | 0 | 0 | 54040 | 494908 | 12750 | 8500 | -11500 | 0 | 0 | 0 | 0 |
| 3 | true | 1840012 | 1186847 | 0 | 0 | 0 | 0 | 59560 | 565105 | 25500 | 17000 | -7000 | -20700 | 0 | 0 | 0 |
| 4 | true | 2519302 | 1715112 | 0 | 0 | 0 | 0 | 70560 | 614880 | 123250 | 8500 | -13000 | -124900 | 0 | 0 | 0 |
| 5 | true | 3038532 | 2398602 | 0 | 0 | 0 | 0 | 97840 | 534240 | 12750 | 8500 | -13400 | -120700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 63352

Regular: 55.0% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 106 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 554868 | 52000 | 0 | 0 | 0 | 0 | 37440 | 429828 | 15000 | 20000 | 600 | 0 | 0 | -8000 | 0 |
| 2 | true | 1004456 | 554868 | 0 | 0 | 0 | 0 | 44760 | 417228 | 0 | 0 | -12400 | 0 | 0 | 0 | 0 |
| 3 | true | 1540660 | 991356 | 0 | 0 | 0 | 0 | 45640 | 482664 | 15000 | 20000 | -7000 | -20100 | 0 | 0 | 0 |
| 4 | true | 2027599 | 1416560 | 0 | 0 | 0 | 0 | 57280 | 528759 | 15000 | 10000 | 0 | -124100 | 0 | 0 | 0 |
| 5 | true | 2546508 | 1895699 | 0 | 0 | 0 | 0 | 59680 | 570129 | 30000 | 10000 | -19000 | -131900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 63352

Regular: 44.2% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 130 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 454895 | 44500 | 0 | 0 | 0 | 0 | 37440 | 351855 | 18000 | 12000 | -1400 | 0 | 0 | -8000 | 0 |
| 2 | true | 867576 | 454895 | 0 | 0 | 0 | 0 | 39400 | 373181 | 18000 | 12000 | -29900 | 0 | 0 | 0 | 0 |
| 3 | true | 1446968 | 823576 | 0 | 0 | 0 | 0 | 42040 | 380352 | 174000 | 24000 | 3000 | -44000 | 0 | 0 | 0 |
| 4 | true | 1894661 | 1325868 | 0 | 0 | 0 | 0 | 67280 | 513513 | 0 | 0 | -12000 | -121100 | 0 | 0 | 0 |
| 5 | true | 2351196 | 1759061 | 0 | 0 | 0 | 0 | 66520 | 510615 | 18000 | 0 | -3000 | -135600 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 63352

Regular: 79.2% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 38 / 73 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 264970 | 40162 | 0 | 0 | 0 | 0 | 37440 | 491380 | 123250 | 17000 | 3600 | -82700 | 0 | -415000 | 0 |
| 2 | true | 224530 | 44670 | 0 | 0 | 0 | 0 | 66840 | 645120 | 59500 | 17000 | -11710 | -92190 | 0 | -725000 | 0 |
| 3 | true | 753332 | 44530 | 0 | 0 | 0 | 0 | 80240 | 853232 | 25500 | 17000 | 12800 | -39970 | 0 | -420000 | 0 |
| 4 | true | 1981391 | 678642 | 0 | 0 | 0 | 0 | 88200 | 1074799 | 123250 | 8500 | 8000 | -74690 | 0 | 0 | 0 |
| 5 | true | 2804375 | 1947161 | 0 | 0 | 0 | 0 | 110800 | 1086564 | 12750 | 8500 | -1400 | -34230 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 63352

Regular: 74.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 36 / 76 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 259001 | 41567 | 0 | 0 | 0 | 0 | 38240 | 539931 | 145000 | 20000 | 3600 | -72770 | 0 | -475000 | 0 |
| 2 | true | 449251 | 43661 | 0 | 0 | 0 | 0 | 70720 | 735000 | 145000 | 20000 | 11000 | -126470 | 0 | -665000 | 0 |
| 3 | true | 768909 | 218499 | 0 | 0 | 0 | 0 | 99000 | 974138 | 15000 | 20000 | 19800 | -28280 | 0 | -780000 | 0 |
| 4 | true | 1984005 | 705839 | 0 | 0 | 0 | 0 | 104520 | 1120046 | 30000 | 10000 | 13600 | -63070 | 0 | 0 | 0 |
| 5 | true | 3487861 | 1974835 | 0 | 0 | 0 | 0 | 110880 | 1235346 | 145000 | 10000 | 11800 | -9170 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 63352

Regular: 46.7% wins / 120 games; finals: 33.3% wins / 3 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 49 / 104 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 60593 | 41673 | 0 | 0 | 0 | 0 | 37280 | 361473 | 0 | 12000 | 1600 | -35760 | 0 | -361000 | 0 |
| 2 | true | 88153 | 40191 | 0 | 0 | 0 | 0 | 43760 | 399840 | 18000 | 0 | 14000 | -179040 | 0 | -269000 | 0 |
| 3 | true | 247579 | 48076 | 0 | 0 | 0 | 0 | 43880 | 545916 | 36000 | 24000 | 20800 | -121170 | 0 | -390000 | 0 |
| 4 | true | 436854 | 41317 | 0 | 0 | 0 | 0 | 57800 | 511235 | 0 | 0 | 10400 | -90160 | 0 | -300000 | 0 |
| 5 | true | 880246 | 357124 | 0 | 0 | 0 | 0 | 60960 | 460562 | 0 | 0 | 1600 | -79730 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 63352

Regular: 45.8% wins / 96 games; finals: 80.0% wins / 5 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 613847 | 90000 | 0 | 0 | 0 | 0 | 38320 | 444427 | 25500 | 17000 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | 1330274 | 613847 | 0 | 0 | 0 | 0 | 50240 | 518437 | 123250 | 8500 | 16000 | 0 | 0 | 0 | 0 |
| 3 | true | 1766274 | 1260574 | 0 | 0 | 0 | 0 | 69600 | 491500 | 0 | 0 | -40100 | -85000 | 0 | 0 | 0 |
| 4 | true | 2293091 | 1766274 | 0 | 0 | 0 | 0 | 67920 | 475897 | 0 | 0 | -4000 | -13000 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 63352

Regular: 41.7% wins / 96 games; finals: 80.0% wins / 5 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 722211 | 60000 | 0 | 0 | 0 | 0 | 38480 | 460131 | 145000 | 20000 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | 1447831 | 722211 | 0 | 0 | 0 | 0 | 71120 | 598500 | 30000 | 10000 | 16000 | 0 | 0 | 0 | 0 |
| 3 | true | 1926217 | 1400531 | 0 | 0 | 0 | 0 | 74240 | 500346 | 0 | 0 | -30700 | -65500 | 0 | 0 | 0 |
| 4 | true | 2425960 | 1926217 | 0 | 0 | 0 | 0 | 67920 | 463323 | 0 | 0 | -4000 | -27500 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 63352

Regular: 37.5% wins / 96 games; finals: 50.0% wins / 4 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 568857 | 45000 | 0 | 0 | 0 | 0 | 38480 | 378777 | 84000 | 24000 | -1400 | 0 | 0 | 0 | 0 |
| 2 | true | 1138306 | 568857 | 0 | 0 | 0 | 0 | 57200 | 480249 | 18000 | 0 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 1472962 | 1057406 | 0 | 0 | 0 | 0 | 54400 | 418656 | 0 | 0 | -25400 | -113000 | 0 | 0 | 0 |
| 4 | true | 1902867 | 1472962 | 0 | 0 | 0 | 0 | 52240 | 387765 | 0 | 0 | 600 | -10700 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 71271

Regular: 55.8% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 54 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 164705 | 110 | 0 | 0 | 0 | 0 | 38160 | 410721 | 12750 | 17000 | -1400 | -351700 | -30826 | -20000 | 0 |
| 2 | true | 213799 | 69583 | 0 | 0 | 0 | 0 | 51040 | 504826 | 12750 | 8500 | 9000 | -506700 | -30322 | 0 | 0 |
| 3 | true | 244855 | 39755 | 0 | 0 | 0 | 0 | 53880 | 491660 | 12750 | 17000 | -8700 | -522500 | -13034 | 0 | 0 |
| 4 | true | 177611 | 51800 | 0 | 0 | 0 | 0 | 57760 | 448570 | 0 | 0 | -4000 | -556600 | -12974 | 0 | 0 |
| 5 | true | 307791 | 1827 | 0 | 0 | 0 | 0 | 58640 | 512356 | 123250 | 8500 | 600 | -557000 | -16166 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 71271

Regular: 39.6% wins / 96 games; finals: 75.0% wins / 4 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 110256 | 57 | 0 | 0 | 0 | 0 | 36800 | 338247 | 15000 | 10000 | 5000 | -301600 | -33191 | -20000 | 0 |
| 2 | true | 17033 | 278 | 0 | 0 | 0 | 0 | 40880 | 360696 | 0 | 0 | 5000 | -483200 | -16599 | 0 | 0 |
| 3 | true | 12100 | 68 | 0 | 0 | 0 | 0 | 46600 | 396617 | 0 | 10000 | 600 | -451600 | -7150 | 0 | 0 |
| 4 | true | 231523 | 48 | 0 | 0 | 0 | 0 | 54800 | 510174 | 145000 | 10000 | -2000 | -488100 | -10451 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 71271

Regular: 44.2% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 142 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 3384 | 47 | 0 | 0 | 0 | 0 | 34560 | 303051 | 0 | 0 | -20000 | -325500 | -13727 | -20000 | 0 |
| 2 | true | 34406 | 115 | 0 | 0 | 0 | 0 | 32040 | 314507 | 18000 | 12000 | -34900 | -308600 | -2025 | 0 | 0 |
| 3 | true | 113660 | 102 | 0 | 0 | 0 | 0 | 34680 | 430637 | 36000 | 24000 | -3000 | -436200 | -6863 | 0 | 0 |
| 4 | true | 53349 | 477 | 0 | 0 | 0 | 0 | 48960 | 414057 | 36000 | 12000 | -3000 | -550000 | -18328 | 0 | 0 |
| 5 | true | 98562 | 9 | 0 | 0 | 0 | 0 | 53720 | 474936 | 0 | 0 | 3000 | -483300 | -3143 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 71271

Regular: 57.5% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 85 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 472451 | 82000 | 0 | 0 | 0 | 0 | 34440 | 323911 | 25500 | 17000 | -10400 | 0 | 0 | -8000 | 0 |
| 2 | true | 961951 | 472451 | 0 | 0 | 0 | 0 | 41440 | 432310 | 12750 | 8500 | -5500 | 0 | 0 | 0 | 0 |
| 3 | true | 1519565 | 909980 | 0 | 0 | 0 | 0 | 46880 | 529734 | 25500 | 17000 | -5000 | -56500 | 0 | 0 | 0 |
| 4 | true | 2264929 | 1478845 | 0 | 0 | 0 | 0 | 56040 | 605174 | 123250 | 8500 | -7500 | -40100 | 0 | 0 | 0 |
| 5 | true | 2824239 | 2137029 | 0 | 0 | 0 | 0 | 79440 | 493920 | 123250 | 0 | -9400 | -127900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 71271

Regular: 45.8% wins / 120 games; finals: 88.9% wins / 9 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 117 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 507045 | 52000 | 0 | 0 | 0 | 0 | 34440 | 334005 | 70000 | 20000 | -3400 | 0 | 0 | -8000 | 0 |
| 2 | true | 924750 | 507045 | 0 | 0 | 0 | 0 | 43880 | 410025 | 0 | 0 | -36200 | 0 | 0 | 0 | 0 |
| 3 | true | 1608706 | 872850 | 0 | 0 | 0 | 0 | 44640 | 531216 | 145000 | 20000 | -5000 | -51900 | 0 | 0 | 0 |
| 4 | true | 2125893 | 1581466 | 0 | 0 | 0 | 0 | 70640 | 493647 | 0 | 0 | -9500 | -37600 | 0 | 0 | 0 |
| 5 | true | 2702115 | 1979593 | 0 | 0 | 0 | 0 | 72920 | 511602 | 145000 | 10000 | -17000 | -146300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 71271

Regular: 44.4% wins / 72 games; finals: 50.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 403440 | 44500 | 0 | 0 | 0 | 0 | 34440 | 323400 | 0 | 12000 | -3400 | 0 | 0 | -8000 | 0 |
| 2 | true | 847835 | 363440 | 0 | 0 | 0 | 0 | 39720 | 369275 | 84000 | 12000 | -20600 | -40000 | 0 | 0 | 0 |
| 3 | true | 1277333 | 764035 | 0 | 0 | 0 | 0 | 50760 | 444938 | 18000 | 0 | -2900 | -81300 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 71271

Regular: 80.0% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 78 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 192279 | 44873 | 0 | 0 | 0 | 0 | 38160 | 535429 | 59500 | 17000 | 10400 | -83210 | 0 | -475000 | 0 |
| 2 | true | 169848 | 45529 | 0 | 0 | 0 | 0 | 58760 | 559259 | 25500 | 8500 | -11950 | -117500 | 0 | -545000 | 0 |
| 3 | true | 408986 | 49848 | 0 | 0 | 0 | 0 | 68840 | 745798 | 25500 | 17000 | 1800 | -79800 | 0 | -540000 | 0 |
| 4 | true | 1561491 | 320156 | 0 | 0 | 0 | 0 | 82840 | 1071695 | 59500 | 8500 | 18800 | -88830 | 0 | 0 | 0 |
| 5 | true | 2614535 | 1538321 | 0 | 0 | 0 | 0 | 96240 | 953124 | 12750 | 8500 | 5600 | -23170 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 71271

Regular: 57.5% wins / 120 games; finals: 57.1% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 43 / 77 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 83852 | 40117 | 0 | 0 | 0 | 0 | 39040 | 360402 | 15000 | 10000 | 10400 | -99990 | 0 | -311000 | 0 |
| 2 | true | 79857 | 40197 | 0 | 0 | 0 | 0 | 46080 | 400145 | 0 | 0 | -20940 | -130280 | 0 | -299000 | 0 |
| 3 | true | 126580 | 40522 | 0 | 0 | 0 | 0 | 47720 | 490623 | 15000 | 20000 | 0 | -116620 | 0 | -410000 | 0 |
| 4 | true | 500557 | 53360 | 0 | 0 | 0 | 0 | 58840 | 756557 | 145000 | 10000 | 16800 | -73220 | 0 | -540000 | 0 |
| 5 | true | 1645568 | 494677 | 0 | 0 | 0 | 0 | 87400 | 1017891 | 30000 | 10000 | 5600 | -5880 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 71271

Regular: 56.7% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 47 / 97 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 80999 | 41959 | 0 | 0 | 0 | 0 | 37280 | 376719 | 18000 | 12000 | 7400 | -24400 | 0 | -391000 | 0 |
| 2 | true | 89212 | 41082 | 0 | 0 | 0 | 0 | 45480 | 409773 | 0 | 0 | -10800 | -212240 | 0 | -224000 | 0 |
| 3 | true | 127534 | 41617 | 0 | 0 | 0 | 0 | 50960 | 481362 | 18000 | 24000 | -4000 | -127000 | 0 | -405000 | 0 |
| 4 | true | 415361 | 46372 | 0 | 0 | 0 | 0 | 62360 | 607247 | 18000 | 12000 | 13800 | -125580 | 0 | -300000 | 0 |
| 5 | true | 1141340 | 353781 | 0 | 0 | 0 | 0 | 70000 | 654959 | 36000 | 12000 | 12100 | -59080 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 71271

Regular: 45.8% wins / 96 games; finals: 60.0% wins / 5 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 690754 | 90000 | 0 | 0 | 0 | 0 | 37800 | 492854 | 59500 | 17000 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | 1296077 | 690754 | 0 | 0 | 0 | 0 | 53080 | 540843 | 25500 | 8500 | -22600 | 0 | 0 | 0 | 0 |
| 3 | true | 1692006 | 1180243 | 0 | 0 | 0 | 0 | 64520 | 466009 | 0 | 0 | -7500 | -127100 | 0 | 0 | 0 |
| 4 | true | 1992611 | 1494906 | 0 | 0 | 0 | 0 | 60520 | 435485 | 0 | 0 | 12000 | -207400 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 71271

Regular: 35.4% wins / 96 games; finals: 33.3% wins / 3 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 477604 | 60000 | 0 | 0 | 0 | 0 | 37800 | 351204 | 15000 | 20000 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | 940437 | 477604 | 0 | 0 | 0 | 0 | 44000 | 409133 | 30000 | 10000 | -30300 | 0 | 0 | 0 | 0 |
| 3 | true | 1369232 | 937937 | 0 | 0 | 0 | 0 | 46720 | 379575 | 0 | 0 | 2500 | 0 | 0 | 0 | 0 |
| 4 | true | 1817659 | 1369232 | 0 | 0 | 0 | 0 | 46000 | 392427 | 0 | 0 | 10000 | 0 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 71271

Regular: 30.2% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 539345 | 45000 | 0 | 0 | 0 | 0 | 37800 | 420945 | 18000 | 24000 | -6400 | 0 | 0 | 0 | 0 |
| 2 | true | 864846 | 505420 | 0 | 0 | 0 | 0 | 47200 | 350301 | 0 | 0 | -28600 | -43400 | 0 | 0 | 0 |
| 3 | true | 1246033 | 864846 | 0 | 0 | 0 | 0 | 44320 | 353567 | 0 | 0 | -2000 | -14700 | 0 | 0 | 0 |
| 4 | true | 1451936 | 1060533 | 0 | 0 | 0 | 0 | 43200 | 370503 | 0 | 0 | -8000 | -199800 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 79190

Regular: 70.0% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 130 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 18852 | 178 | 0 | 0 | 0 | 0 | 35800 | 289356 | 0 | 17000 | -22500 | -329900 | -40904 | -20000 | 0 |
| 2 | true | 93831 | 74 | 0 | 0 | 0 | 0 | 42880 | 507356 | 25500 | 8500 | 0 | -494300 | -14957 | 0 | 0 |
| 3 | true | 130081 | 440 | 0 | 0 | 0 | 0 | 51040 | 493899 | 12750 | 17000 | 4000 | -533700 | -8739 | 0 | 0 |
| 4 | true | 354968 | 57 | 0 | 0 | 0 | 0 | 56960 | 604285 | 123250 | 8500 | -8400 | -546100 | -13608 | 0 | 0 |
| 5 | true | 571549 | 171166 | 0 | 0 | 0 | 0 | 81960 | 614880 | 123250 | 8500 | -21700 | -573100 | -17209 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 79190

Regular: 57.5% wins / 120 games; finals: 44.4% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 115 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 117053 | 301 | 0 | 0 | 0 | 0 | 34760 | 339801 | 30000 | 20000 | -21800 | -302300 | -23408 | -20000 | 0 |
| 2 | true | 63223 | 10 | 0 | 0 | 0 | 0 | 39040 | 384962 | 30000 | 10000 | 7800 | -503800 | -21832 | 0 | 0 |
| 3 | true | 115859 | 156 | 0 | 0 | 0 | 0 | 43840 | 442124 | 70000 | 20000 | -2600 | -513400 | -7328 | 0 | 0 |
| 4 | true | 192574 | 164 | 0 | 0 | 0 | 0 | 55120 | 525756 | 15000 | 10000 | -1000 | -519300 | -8861 | 0 | 0 |
| 5 | true | 213667 | 2558 | 0 | 0 | 0 | 0 | 61840 | 539081 | 15000 | 10000 | -31100 | -555000 | -18728 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 79190

Regular: 34.7% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 9529 | 425 | 0 | 0 | 0 | 0 | 37760 | 282261 | 0 | 0 | -10600 | -314000 | -30892 | 0 | 0 |
| 2 | true | 4200 | 19 | 0 | 0 | 0 | 0 | 36840 | 335601 | 0 | 0 | 16600 | -384800 | -9570 | 0 | 0 |
| 3 | true | 5481 | 2 | 0 | 0 | 0 | 0 | 38280 | 358922 | 0 | 0 | 13600 | -398200 | -11321 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 79190

Regular: 53.3% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 67 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 536498 | 82000 | 0 | 0 | 0 | 0 | 34880 | 410518 | 25500 | 17000 | -33400 | 0 | 0 | -8000 | 0 |
| 2 | true | 944700 | 536498 | 0 | 0 | 0 | 0 | 43080 | 368122 | 0 | 0 | -3000 | 0 | 0 | 0 | 0 |
| 3 | true | 1357239 | 857800 | 0 | 0 | 0 | 0 | 42680 | 441009 | 12750 | 17000 | -14000 | -86900 | 0 | 0 | 0 |
| 4 | true | 1893342 | 1229439 | 0 | 0 | 0 | 0 | 46880 | 532173 | 123250 | 8500 | -46900 | -127800 | 0 | 0 | 0 |
| 5 | true | 2447882 | 1750842 | 0 | 0 | 0 | 0 | 76480 | 574560 | 25500 | 8500 | 12000 | -142500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 79190

Regular: 33.3% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 397317 | 52000 | 0 | 0 | 0 | 0 | 34880 | 333837 | 0 | 10000 | -33400 | 0 | 0 | -8000 | 0 |
| 2 | true | 777895 | 397317 | 0 | 0 | 0 | 0 | 38560 | 354018 | 0 | 0 | -12000 | 0 | 0 | 0 | 0 |
| 3 | true | 1058507 | 682795 | 0 | 0 | 0 | 0 | 38960 | 342752 | 0 | 0 | -14000 | -87100 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 79190

Regular: 25.0% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 375825 | 45000 | 0 | 0 | 0 | 0 | 34800 | 305025 | 0 | 0 | -1000 | 0 | 0 | -8000 | 0 |
| 2 | true | 604564 | 302225 | 0 | 0 | 0 | 0 | 33880 | 295859 | 0 | 0 | -27400 | -73600 | 0 | 0 | 0 |
| 3 | true | 804988 | 473964 | 0 | 0 | 0 | 0 | 32720 | 311304 | 0 | 0 | -13000 | -130600 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 79190

Regular: 81.7% wins / 120 games; finals: 58.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 35 / 88 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 196066 | 32432 | 0 | 0 | 0 | 0 | 37560 | 504686 | 59500 | 17000 | -25300 | -72380 | 0 | -415000 | 0 |
| 2 | true | 141674 | 45034 | 0 | 0 | 0 | 0 | 56200 | 557968 | 25500 | 8500 | 12800 | -110360 | 0 | -605000 | 0 |
| 3 | true | 411447 | 51114 | 0 | 0 | 0 | 0 | 67640 | 800533 | 25500 | 17000 | 11800 | -112700 | 0 | -540000 | 0 |
| 4 | true | 1538231 | 364407 | 0 | 0 | 0 | 0 | 81000 | 1026024 | 59500 | 8500 | -1200 | -47040 | 0 | 0 | 0 |
| 5 | true | 2676992 | 1488951 | 0 | 0 | 0 | 0 | 91040 | 1044401 | 25500 | 8500 | 18600 | -49280 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 79190

Regular: 69.2% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 36 / 59 / 116; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 284947 | 41276 | 0 | 0 | 0 | 0 | 37560 | 508347 | 145000 | 20000 | -25400 | -45560 | 0 | -415000 | 0 |
| 2 | true | 182435 | 40115 | 0 | 0 | 0 | 0 | 64640 | 628688 | 30000 | 20000 | 10800 | -131640 | 0 | -725000 | 0 |
| 3 | true | 705335 | 54260 | 0 | 0 | 0 | 0 | 73800 | 641970 | 30000 | 20000 | 3000 | -65870 | 0 | -180000 | 0 |
| 4 | true | 1392340 | 690355 | 0 | 0 | 0 | 0 | 80080 | 833805 | 15000 | 10000 | 3100 | -14980 | 0 | -240000 | 0 |
| 5 | true | 2790772 | 1380160 | 0 | 0 | 0 | 0 | 90880 | 1146632 | 145000 | 10000 | 18100 | -12180 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 79190

Regular: 27.8% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: 52 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 51552 | 34576 | 0 | 0 | 0 | 0 | 36360 | 311472 | 0 | 0 | -29600 | -40680 | 0 | -271000 | 0 |
| 2 | true | 47766 | 40067 | 0 | 0 | 0 | 0 | 37000 | 346574 | 0 | 0 | 12100 | -195460 | 0 | -204000 | 0 |
| 3 | true | 70089 | 41344 | 0 | 0 | 0 | 0 | 38920 | 354333 | 0 | 0 | 2600 | -158530 | 0 | -215000 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 79190

Regular: 41.7% wins / 96 games; finals: 83.3% wins / 6 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 547471 | 90000 | 0 | 0 | 0 | 0 | 34880 | 314941 | 123250 | 17000 | -32600 | 0 | 0 | 0 | 0 |
| 2 | true | 1249007 | 534871 | 0 | 0 | 0 | 0 | 59040 | 603096 | 59500 | 8500 | -16000 | -12600 | 0 | 0 | 0 |
| 3 | true | 1626325 | 1069807 | 0 | 0 | 0 | 0 | 73920 | 491098 | 0 | 0 | -3000 | -184700 | 0 | 0 | 0 |
| 4 | true | 1964492 | 1428225 | 0 | 0 | 0 | 0 | 68400 | 484667 | 0 | 0 | -2400 | -212500 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 79190

Regular: 38.9% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 373605 | 60000 | 0 | 0 | 0 | 0 | 34880 | 311325 | 0 | 0 | -32600 | 0 | 0 | 0 | 0 |
| 2 | true | 790642 | 360905 | 0 | 0 | 0 | 0 | 33520 | 423917 | 30000 | 10000 | -35400 | -45000 | 0 | 0 | 0 |
| 3 | true | 1022595 | 624142 | 0 | 0 | 0 | 0 | 45000 | 388353 | 0 | 0 | -1400 | -200000 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 79190

Regular: 41.7% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 399303 | 45000 | 0 | 0 | 0 | 0 | 34880 | 307923 | 18000 | 24000 | -30500 | 0 | 0 | 0 | 0 |
| 2 | true | 783176 | 299703 | 0 | 0 | 0 | 0 | 41640 | 444633 | 18000 | 12000 | -18500 | -113900 | 0 | 0 | 0 |
| 3 | true | 1091726 | 594976 | 0 | 0 | 0 | 0 | 54480 | 446670 | 0 | 0 | -6400 | -186200 | 0 | 0 | 0 |
| 4 | true | 1304367 | 875186 | 0 | 0 | 0 | 0 | 55520 | 422121 | 0 | 0 | -39800 | -225200 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 87109

Regular: 61.7% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 68 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 145907 | 199 | 0 | 0 | 0 | 0 | 37360 | 396689 | 12750 | 17000 | -2000 | -344000 | -41892 | -20000 | 0 |
| 2 | true | 320202 | 4123 | 0 | 0 | 0 | 0 | 44760 | 546238 | 123250 | 8500 | -2000 | -510500 | -35953 | 0 | 0 |
| 3 | true | 489293 | 189610 | 0 | 0 | 0 | 0 | 67280 | 531740 | 59500 | 17000 | 4800 | -496000 | -15229 | 0 | 0 |
| 4 | true | 523388 | 300184 | 0 | 0 | 0 | 0 | 80320 | 534240 | 12750 | 8500 | 1600 | -583600 | -19715 | 0 | 0 |
| 5 | true | 718836 | 346307 | 0 | 0 | 0 | 0 | 86040 | 574560 | 123250 | 8500 | 7000 | -585300 | -18602 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 87109

Regular: 43.3% wins / 120 games; finals: 75.0% wins / 4 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 104 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 33564 | 158 | 0 | 0 | 0 | 0 | 35840 | 319536 | 0 | 0 | 0 | -324500 | -37312 | -20000 | 0 |
| 2 | true | 35643 | 32 | 0 | 0 | 0 | 0 | 34320 | 353210 | 15000 | 10000 | 1000 | -407400 | -4051 | 0 | 0 |
| 3 | true | 233799 | 10 | 0 | 0 | 0 | 0 | 40600 | 461927 | 145000 | 20000 | -11000 | -444400 | -13971 | 0 | 0 |
| 4 | true | 204258 | 88088 | 0 | 0 | 0 | 0 | 63760 | 494088 | 0 | 0 | 0 | -571600 | -15789 | 0 | 0 |
| 5 | true | 183095 | 8878 | 0 | 0 | 0 | 0 | 58240 | 498110 | 0 | 0 | 0 | -558800 | -18713 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 87109

Regular: 30.6% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 8475 | 158 | 0 | 0 | 0 | 0 | 35440 | 306684 | 0 | 0 | 5000 | -348200 | -35449 | 0 | 0 |
| 2 | true | 33482 | 10 | 0 | 0 | 0 | 0 | 36680 | 352496 | 18000 | 12000 | -3200 | -359900 | -31069 | 0 | 0 |
| 3 | true | 5074 | 86 | 0 | 0 | 0 | 0 | 38320 | 325637 | 0 | 0 | -21400 | -350000 | -20965 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 87109

Regular: 74.2% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 89 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 588917 | 82000 | 0 | 0 | 0 | 0 | 36320 | 428097 | 25500 | 17000 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 1363064 | 588917 | 0 | 0 | 0 | 0 | 52000 | 581797 | 123250 | 8500 | 8600 | 0 | 0 | 0 | 0 |
| 3 | true | 2076264 | 1325564 | 0 | 0 | 0 | 0 | 77320 | 614880 | 59500 | 17000 | -18000 | -37500 | 0 | 0 | 0 |
| 4 | true | 2570714 | 1950664 | 0 | 0 | 0 | 0 | 91760 | 534240 | 12750 | 8500 | -27200 | -125600 | 0 | 0 | 0 |
| 5 | true | 3193734 | 2409214 | 0 | 0 | 0 | 0 | 97640 | 614880 | 59500 | 8500 | 4000 | -161500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 87109

Regular: 49.2% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 133 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 379509 | 52000 | 0 | 0 | 0 | 0 | 35840 | 291669 | 0 | 0 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 746974 | 379509 | 0 | 0 | 0 | 0 | 35040 | 321825 | 0 | 0 | 10600 | 0 | 0 | 0 | 0 |
| 3 | true | 1198644 | 711674 | 0 | 0 | 0 | 0 | 39040 | 405930 | 30000 | 20000 | -8000 | -35300 | 0 | 0 | 0 |
| 4 | true | 1806048 | 1075044 | 0 | 0 | 0 | 0 | 48560 | 603194 | 70000 | 10000 | -750 | -123600 | 0 | 0 | 0 |
| 5 | true | 2310122 | 1679648 | 0 | 0 | 0 | 0 | 58160 | 543564 | 15000 | 10000 | 3750 | -126400 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 87109

Regular: 55.0% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 392025 | 45000 | 0 | 0 | 0 | 0 | 35720 | 319305 | 0 | 0 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 866268 | 376825 | 0 | 0 | 0 | 0 | 36200 | 415643 | 18000 | 12000 | 10600 | -18200 | 0 | 0 | 0 |
| 3 | true | 1408972 | 832068 | 0 | 0 | 0 | 0 | 46000 | 470904 | 36000 | 24000 | 0 | -34200 | 0 | 0 | 0 |
| 4 | true | 1914138 | 1291872 | 0 | 0 | 0 | 0 | 56440 | 518826 | 36000 | 12000 | -1000 | -117100 | 0 | 0 | 0 |
| 5 | true | 2546878 | 1783038 | 0 | 0 | 0 | 0 | 61040 | 604800 | 84000 | 12000 | 2000 | -131100 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 87109

Regular: 79.2% wins / 120 games; finals: 84.6% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / 85 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 81792 | 40590 | 0 | 0 | 0 | 0 | 37360 | 395702 | 12750 | 17000 | 5000 | -61020 | 0 | -415000 | 0 |
| 2 | true | 179961 | 41445 | 0 | 0 | 0 | 0 | 51440 | 594579 | 59500 | 8500 | 15800 | -146650 | 0 | -485000 | 0 |
| 3 | true | 709170 | 50550 | 0 | 0 | 0 | 0 | 64960 | 789769 | 123250 | 17000 | 9600 | -55370 | 0 | -420000 | 0 |
| 4 | true | 1353068 | 513519 | 0 | 0 | 0 | 0 | 88800 | 1122318 | 123250 | 8500 | 1900 | -100870 | 0 | -600000 | 0 |
| 5 | true | 2862563 | 1321498 | 0 | 0 | 0 | 0 | 112680 | 1298635 | 123250 | 8500 | -2000 | -31570 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 87109

Regular: 60.8% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 42 / 85 / 130; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 141142 | 40984 | 0 | 0 | 0 | 0 | 34640 | 435162 | 30000 | 20000 | 5000 | -78660 | 0 | -365000 | 0 |
| 2 | true | 218506 | 44451 | 0 | 0 | 0 | 0 | 45280 | 512684 | 70000 | 10000 | 6400 | -152000 | 0 | -415000 | 0 |
| 3 | true | 201047 | 47636 | 0 | 0 | 0 | 0 | 58000 | 536781 | 15000 | 20000 | 700 | -107940 | 0 | -540000 | 0 |
| 4 | true | 954425 | 96117 | 0 | 0 | 0 | 0 | 62400 | 706808 | 70000 | 10000 | 9100 | -104930 | 0 | 0 | 0 |
| 5 | true | 1749162 | 954425 | 0 | 0 | 0 | 0 | 77880 | 918057 | 30000 | 10000 | -1200 | 0 | 0 | -240000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 87109

Regular: 55.8% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 45 / 76 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 164248 | 41020 | 0 | 0 | 0 | 0 | 35280 | 332388 | 84000 | 24000 | -12000 | -57420 | 0 | -287000 | 0 |
| 2 | true | 96038 | 40058 | 0 | 0 | 0 | 0 | 50280 | 437210 | 36000 | 12000 | 15800 | -207500 | 0 | -412000 | 0 |
| 3 | true | 364003 | 41688 | 0 | 0 | 0 | 0 | 55600 | 633885 | 84000 | 24000 | 5600 | -85120 | 0 | -450000 | 0 |
| 4 | true | 849189 | 72973 | 0 | 0 | 0 | 0 | 65680 | 676736 | 18000 | 12000 | 1900 | -109130 | 0 | -180000 | 0 |
| 5 | true | 1807100 | 824059 | 0 | 0 | 0 | 0 | 75120 | 963921 | 174000 | 12000 | -2000 | -25130 | 0 | -240000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 87109

Regular: 55.0% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 531562 | 90000 | 0 | 0 | 0 | 0 | 35840 | 384472 | 12750 | 8500 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 1129428 | 531562 | 0 | 0 | 0 | 0 | 41800 | 516066 | 25500 | 8500 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 1571460 | 1057671 | 0 | 0 | 0 | 0 | 49480 | 481502 | 12750 | 17000 | -39900 | -78800 | 0 | 0 | 0 |
| 4 | true | 1852736 | 1353960 | 0 | 0 | 0 | 0 | 55880 | 444246 | 12750 | 8500 | -22600 | -217500 | 0 | 0 | 0 |
| 5 | true | 2128540 | 1644836 | 0 | 0 | 0 | 0 | 58480 | 436624 | 0 | 0 | -11400 | -207900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 87109

Regular: 43.3% wins / 120 games; finals: 71.4% wins / 7 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 463578 | 60000 | 0 | 0 | 0 | 0 | 36320 | 342258 | 15000 | 10000 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 1134558 | 463578 | 0 | 0 | 0 | 0 | 45280 | 539700 | 70000 | 10000 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 1707143 | 1071958 | 0 | 0 | 0 | 0 | 54200 | 465885 | 145000 | 20000 | -36700 | -75800 | 0 | 0 | 0 |
| 4 | true | 2057486 | 1495943 | 0 | 0 | 0 | 0 | 76200 | 501543 | 0 | 0 | -2000 | -225400 | 0 | 0 | 0 |
| 5 | true | 2391936 | 1852986 | 0 | 0 | 0 | 0 | 64960 | 501690 | 0 | 0 | -27700 | -204500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 87109

Regular: 33.3% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 452024 | 45000 | 0 | 0 | 0 | 0 | 36320 | 340704 | 18000 | 12000 | 0 | 0 | 0 | 0 | 0 |
| 2 | true | 870831 | 452024 | 0 | 0 | 0 | 0 | 44800 | 371007 | 0 | 0 | 3000 | 0 | 0 | 0 | 0 |
| 3 | true | 1237535 | 781931 | 0 | 0 | 0 | 0 | 39040 | 371564 | 18000 | 24000 | 500 | -86400 | 0 | 0 | 0 |
| 4 | true | 1466546 | 1037435 | 0 | 0 | 0 | 0 | 44400 | 382211 | 0 | 0 | 3100 | -200700 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 95028

Regular: 65.8% wins / 120 games; finals: 62.5% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 98 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 41462 | 286 | 0 | 0 | 0 | 0 | 34120 | 316211 | 0 | 8500 | 1800 | -355100 | -34069 | -20000 | 0 |
| 2 | true | 102349 | 673 | 0 | 0 | 0 | 0 | 37840 | 468460 | 25500 | 8500 | -1000 | -467800 | -10613 | 0 | 0 |
| 3 | true | 383660 | 108 | 0 | 0 | 0 | 0 | 44600 | 559229 | 123250 | 17000 | 0 | -458700 | -4068 | 0 | 0 |
| 4 | true | 438105 | 236098 | 0 | 0 | 0 | 0 | 75160 | 534240 | 25500 | 8500 | 0 | -571000 | -17955 | 0 | 0 |
| 5 | true | 507045 | 256986 | 0 | 0 | 0 | 0 | 71400 | 534240 | 12750 | 8500 | -2750 | -543600 | -11600 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 95028

Regular: 65.8% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 77 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 84510 | 0 | 0 | 0 | 0 | 0 | 38720 | 428904 | 15000 | 20000 | -8200 | -401900 | -48014 | -20000 | 0 |
| 2 | true | 209822 | 33 | 0 | 0 | 0 | 0 | 48480 | 513482 | 30000 | 10000 | 3400 | -475500 | -4550 | 0 | 0 |
| 3 | true | 241917 | 69312 | 0 | 0 | 0 | 0 | 53320 | 532371 | 15000 | 20000 | 7000 | -577900 | -17696 | 0 | 0 |
| 4 | true | 462626 | 54854 | 0 | 0 | 0 | 0 | 61080 | 635250 | 70000 | 10000 | -10000 | -532000 | -13621 | 0 | 0 |
| 5 | true | 541896 | 235997 | 0 | 0 | 0 | 0 | 72360 | 555891 | 15000 | 10000 | -32700 | -527300 | -13981 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 95028

Regular: 46.9% wins / 96 games; finals: 50.0% wins / 6 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 187097 | 28 | 0 | 0 | 0 | 0 | 37960 | 368340 | 84000 | 24000 | -5000 | -329700 | -17503 | -20000 | 0 |
| 2 | true | 74636 | 28239 | 0 | 0 | 0 | 0 | 48560 | 430658 | 18000 | 0 | -5400 | -564800 | -39479 | 0 | 0 |
| 3 | true | 24561 | 186 | 0 | 0 | 0 | 0 | 46600 | 405594 | 0 | 0 | -26000 | -468700 | -7569 | 0 | 0 |
| 4 | true | 105650 | 28 | 0 | 0 | 0 | 0 | 41640 | 479934 | 36000 | 12000 | -8900 | -470100 | -9485 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 95028

Regular: 65.0% wins / 120 games; finals: 63.6% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 78 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 580206 | 82000 | 0 | 0 | 0 | 0 | 39520 | 414186 | 25500 | 17000 | 2000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1189291 | 519606 | 0 | 0 | 0 | 0 | 48840 | 546245 | 59500 | 8500 | 6600 | -60600 | 0 | 0 | 0 |
| 3 | true | 1877993 | 1103791 | 0 | 0 | 0 | 0 | 62600 | 611252 | 123250 | 17000 | -39900 | -85500 | 0 | 0 | 0 |
| 4 | true | 2372103 | 1726893 | 0 | 0 | 0 | 0 | 90120 | 534240 | 12750 | 8500 | -400 | -151100 | 0 | 0 | 0 |
| 5 | true | 2868223 | 2192003 | 0 | 0 | 0 | 0 | 97960 | 574560 | 25500 | 8500 | -30300 | -180100 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 95028

Regular: 50.0% wins / 120 games; finals: 77.8% wins / 9 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 124 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 467790 | 52000 | 0 | 0 | 0 | 0 | 39520 | 354270 | 0 | 20000 | 2000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1079326 | 411690 | 0 | 0 | 0 | 0 | 45560 | 541076 | 70000 | 10000 | 1000 | -56100 | 0 | 0 | 0 |
| 3 | true | 1519395 | 1007226 | 0 | 0 | 0 | 0 | 53880 | 447689 | 0 | 10000 | 600 | -72100 | 0 | 0 | 0 |
| 4 | true | 2205677 | 1387195 | 0 | 0 | 0 | 0 | 57360 | 602522 | 145000 | 10000 | -1400 | -127200 | 0 | 0 | 0 |
| 5 | true | 2845097 | 2074477 | 0 | 0 | 0 | 0 | 82720 | 556500 | 145000 | 10000 | -23600 | -131200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 95028

Regular: 49.0% wins / 96 games; finals: 40.0% wins / 5 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 375785 | 45000 | 0 | 0 | 0 | 0 | 35280 | 323505 | 0 | 0 | -20000 | 0 | 0 | -8000 | 0 |
| 2 | true | 763432 | 339685 | 0 | 0 | 0 | 0 | 35800 | 361347 | 18000 | 12000 | -3400 | -36100 | 0 | 0 | 0 |
| 3 | true | 1167107 | 674432 | 0 | 0 | 0 | 0 | 38440 | 431235 | 18000 | 12000 | -7000 | -89000 | 0 | 0 | 0 |
| 4 | true | 1758164 | 1043007 | 0 | 0 | 0 | 0 | 48520 | 563787 | 84000 | 12000 | 7350 | -124600 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 95028

Regular: 80.8% wins / 120 games; finals: 81.8% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 32 / 62 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 267819 | 40540 | 0 | 0 | 0 | 0 | 35520 | 517909 | 123250 | 17000 | -2000 | -98860 | 0 | -415000 | 0 |
| 2 | true | 164119 | 40169 | 0 | 0 | 0 | 0 | 68600 | 532980 | 12750 | 8500 | 11400 | -132930 | 0 | -605000 | 0 |
| 3 | true | 715981 | 44119 | 0 | 0 | 0 | 0 | 77600 | 922422 | 123250 | 17000 | 7800 | -56210 | 0 | -540000 | 0 |
| 4 | true | 1441818 | 644111 | 0 | 0 | 0 | 0 | 103720 | 1025137 | 12750 | 8500 | 5100 | -69370 | 0 | -360000 | 0 |
| 5 | true | 3048947 | 1441818 | 0 | 0 | 0 | 0 | 113000 | 1351779 | 123250 | 8500 | 10600 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 95028

Regular: 66.7% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 43 / 80 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 81222 | 40860 | 0 | 0 | 0 | 0 | 35240 | 418152 | 15000 | 20000 | 3000 | -55170 | 0 | -415000 | 0 |
| 2 | true | 135447 | 41328 | 0 | 0 | 0 | 0 | 44880 | 467765 | 15000 | 10000 | 1500 | -209920 | 0 | -275000 | 0 |
| 3 | true | 199006 | 45447 | 0 | 0 | 0 | 0 | 52040 | 643829 | 70000 | 20000 | 8700 | -101010 | 0 | -630000 | 0 |
| 4 | true | 772969 | 121406 | 0 | 0 | 0 | 0 | 70280 | 777683 | 30000 | 10000 | 8600 | -82600 | 0 | -240000 | 0 |
| 5 | true | 1706370 | 748259 | 0 | 0 | 0 | 0 | 80120 | 833291 | 15000 | 10000 | 19700 | -24710 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 95028

Regular: 42.7% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 49 / 95 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 55923 | 42300 | 0 | 0 | 0 | 0 | 35440 | 330183 | 0 | 0 | -2000 | -65700 | 0 | -287000 | 0 |
| 2 | true | 89546 | 41023 | 0 | 0 | 0 | 0 | 34520 | 373863 | 18000 | 12000 | -14600 | -182160 | 0 | -208000 | 0 |
| 3 | true | 112132 | 41268 | 0 | 0 | 0 | 0 | 42760 | 378126 | 18000 | 12000 | -2000 | -141300 | 0 | -285000 | 0 |
| 4 | true | 54936 | 46816 | 0 | 0 | 0 | 0 | 46880 | 412094 | 0 | 0 | 7850 | -104020 | 0 | -420000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 95028

Regular: 52.5% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 637076 | 90000 | 0 | 0 | 0 | 0 | 39000 | 460576 | 25500 | 17000 | 5000 | 0 | 0 | 0 | 0 |
| 2 | true | 1118843 | 560576 | 0 | 0 | 0 | 0 | 49440 | 474427 | 25500 | 8500 | 15000 | -91100 | 0 | 0 | 0 |
| 3 | true | 1631839 | 1008903 | 0 | 0 | 0 | 0 | 54920 | 557776 | 25500 | 17000 | -30300 | -111900 | 0 | 0 | 0 |
| 4 | true | 1944040 | 1445439 | 0 | 0 | 0 | 0 | 64360 | 455141 | 0 | 0 | 1100 | -208400 | 0 | 0 | 0 |
| 5 | true | 2426492 | 1941540 | 0 | 0 | 0 | 0 | 55040 | 452612 | 0 | 0 | -25200 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 95028

Regular: 45.8% wins / 120 games; finals: 71.4% wins / 7 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 535880 | 60000 | 0 | 0 | 0 | 0 | 36080 | 415800 | 15000 | 20000 | -11000 | 0 | 0 | 0 | 0 |
| 2 | true | 1086936 | 478580 | 0 | 0 | 0 | 0 | 49800 | 487956 | 70000 | 10000 | 5600 | -72300 | 0 | 0 | 0 |
| 3 | true | 1787776 | 999536 | 0 | 0 | 0 | 0 | 60000 | 624740 | 145000 | 20000 | -46500 | -102400 | 0 | 0 | 0 |
| 4 | true | 2174004 | 1591476 | 0 | 0 | 0 | 0 | 83800 | 511728 | 0 | 0 | -8500 | -200800 | 0 | 0 | 0 |
| 5 | true | 2523770 | 1974104 | 0 | 0 | 0 | 0 | 76120 | 506646 | 0 | 0 | -33100 | -199900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 95028

Regular: 23.6% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 377579 | 45000 | 0 | 0 | 0 | 0 | 34080 | 296499 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |
| 2 | true | 713522 | 377579 | 0 | 0 | 0 | 0 | 34880 | 319263 | 0 | 0 | 9000 | -27200 | 0 | 0 | 0 |
| 3 | true | 975559 | 643822 | 0 | 0 | 0 | 0 | 38920 | 337817 | 0 | 0 | -29200 | -85500 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 102947

Regular: 69.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 66 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 84687 | 432 | 0 | 0 | 0 | 0 | 32720 | 314416 | 25500 | 8500 | -2200 | -312700 | -51549 | -20000 | 0 |
| 2 | true | 256611 | 379 | 0 | 0 | 0 | 0 | 40240 | 515694 | 123250 | 8500 | 10800 | -511300 | -15260 | 0 | 0 |
| 3 | true | 312528 | 103065 | 0 | 0 | 0 | 0 | 68960 | 534240 | 12750 | 17000 | 50 | -557700 | -19383 | 0 | 0 |
| 4 | true | 620655 | 128003 | 0 | 0 | 0 | 0 | 78960 | 614880 | 123250 | 8500 | 10150 | -519300 | -8313 | 0 | 0 |
| 5 | true | 937423 | 439806 | 0 | 0 | 0 | 0 | 105680 | 614880 | 123250 | 8500 | 1600 | -528200 | -8942 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 102947

Regular: 56.7% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 106 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 28599 | 266 | 0 | 0 | 0 | 0 | 32680 | 327327 | 15000 | 10000 | 0 | -343300 | -53108 | -20000 | 0 |
| 2 | true | 52222 | 71 | 0 | 0 | 0 | 0 | 35040 | 382799 | 30000 | 10000 | -8000 | -405800 | -20416 | 0 | 0 |
| 3 | true | 179604 | 162 | 0 | 0 | 0 | 0 | 41760 | 486528 | 30000 | 20000 | 12800 | -455900 | -7806 | 0 | 0 |
| 4 | true | 212182 | 42305 | 0 | 0 | 0 | 0 | 48800 | 518994 | 30000 | 10000 | -2900 | -557100 | -15216 | 0 | 0 |
| 5 | true | 240447 | 10149 | 0 | 0 | 0 | 0 | 53400 | 529358 | 15000 | 10000 | 5600 | -570700 | -14393 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 102947

Regular: 57.5% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 55 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 2/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 100911 | 96 | 0 | 0 | 0 | 0 | 35200 | 393708 | 18000 | 24000 | 7600 | -364500 | -38097 | -20000 | 0 |
| 2 | true | 136411 | 1337 | 0 | 0 | 0 | 0 | 43040 | 488628 | 18000 | 12000 | 2000 | -495200 | -32968 | 0 | 0 |
| 3 | true | 227202 | 139 | 0 | 0 | 0 | 0 | 50800 | 508631 | 18000 | 24000 | 5800 | -509300 | -7140 | 0 | 0 |
| 4 | true | 474347 | 29667 | 0 | 0 | 0 | 0 | 53840 | 612329 | 174000 | 12000 | -3500 | -586100 | -15424 | 0 | 0 |
| 5 | true | 625726 | 244848 | 0 | 0 | 0 | 0 | 75200 | 598500 | 36000 | 12000 | 11400 | -566700 | -15021 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 102947

Regular: 75.8% wins / 120 games; finals: 78.6% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 84 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 626064 | 82000 | 0 | 0 | 0 | 0 | 36120 | 464244 | 59500 | 17000 | -32800 | 0 | 0 | -8000 | 0 |
| 2 | true | 1353933 | 626064 | 0 | 0 | 0 | 0 | 55480 | 598389 | 59500 | 8500 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 1947133 | 1297633 | 0 | 0 | 0 | 0 | 65400 | 573300 | 25500 | 17000 | -31700 | -56300 | 0 | 0 | 0 |
| 4 | true | 2620583 | 1817033 | 0 | 0 | 0 | 0 | 78320 | 614880 | 123250 | 8500 | -14400 | -137100 | 0 | 0 | 0 |
| 5 | true | 3311613 | 2462583 | 0 | 0 | 0 | 0 | 103400 | 614880 | 123250 | 8500 | -1000 | -158000 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 102947

Regular: 64.2% wins / 120 games; finals: 86.7% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 96 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 711822 | 52000 | 0 | 0 | 0 | 0 | 36120 | 490602 | 145000 | 20000 | -31900 | 0 | 0 | -8000 | 0 |
| 2 | true | 1578780 | 711822 | 0 | 0 | 0 | 0 | 68240 | 637718 | 145000 | 10000 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 2331240 | 1539780 | 0 | 0 | 0 | 0 | 89760 | 640500 | 70000 | 20000 | -28800 | -39000 | 0 | 0 | 0 |
| 4 | true | 3069580 | 2186640 | 0 | 0 | 0 | 0 | 103840 | 640500 | 145000 | 0 | -6400 | -144600 | 0 | 0 | 0 |
| 5 | true | 3832460 | 2931080 | 0 | 0 | 0 | 0 | 107280 | 640500 | 145000 | 10000 | -1400 | -138500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 102947

Regular: 43.3% wins / 120 games; finals: 60.0% wins / 5 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 123 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 459154 | 45000 | 0 | 0 | 0 | 0 | 36120 | 353934 | 36000 | 24000 | -27900 | 0 | 0 | -8000 | 0 |
| 2 | true | 924581 | 459154 | 0 | 0 | 0 | 0 | 48520 | 410907 | 0 | 0 | 6000 | 0 | 0 | 0 | 0 |
| 3 | true | 1482547 | 837081 | 0 | 0 | 0 | 0 | 45680 | 522186 | 84000 | 24000 | -30400 | -87500 | 0 | 0 | 0 |
| 4 | true | 1892644 | 1357847 | 0 | 0 | 0 | 0 | 60160 | 485037 | 0 | 0 | -18400 | -116700 | 0 | 0 | 0 |
| 5 | true | 2291218 | 1763944 | 0 | 0 | 0 | 0 | 60720 | 471954 | 0 | 0 | -5400 | -128700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 102947

Regular: 75.8% wins / 120 games; finals: 92.3% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 88 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 240258 | 30986 | 0 | 0 | 0 | 0 | 34080 | 498618 | 123250 | 17000 | -9900 | -97790 | 0 | -415000 | 0 |
| 2 | true | 262435 | 49185 | 0 | 0 | 0 | 0 | 67400 | 642247 | 123250 | 17000 | 4800 | -107520 | 0 | -725000 | 0 |
| 3 | true | 826442 | 53513 | 0 | 0 | 0 | 0 | 96080 | 1150007 | 123250 | 17000 | 6600 | -48930 | 0 | -780000 | 0 |
| 4 | true | 1951299 | 714652 | 0 | 0 | 0 | 0 | 112040 | 1091957 | 12750 | 8500 | 11400 | -111790 | 0 | 0 | 0 |
| 5 | true | 3396670 | 1870169 | 0 | 0 | 0 | 0 | 113160 | 1275341 | 123250 | 8500 | 6250 | -81130 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 102947

Regular: 66.7% wins / 120 games; finals: 54.5% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 40 / 77 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 135586 | 40207 | 0 | 0 | 0 | 0 | 34080 | 451416 | 30000 | 20000 | -7110 | -91800 | 0 | -361000 | 0 |
| 2 | true | 110961 | 42074 | 0 | 0 | 0 | 0 | 51240 | 564995 | 30000 | 10000 | 4800 | -146660 | 0 | -539000 | 0 |
| 3 | true | 392470 | 44451 | 0 | 0 | 0 | 0 | 66040 | 830739 | 70000 | 20000 | 6600 | -51870 | 0 | -660000 | 0 |
| 4 | true | 1193019 | 307070 | 0 | 0 | 0 | 0 | 81320 | 778229 | 15000 | 10000 | 1400 | -85400 | 0 | 0 | 0 |
| 5 | true | 2251658 | 1145489 | 0 | 0 | 0 | 0 | 85960 | 930059 | 70000 | 10000 | 10150 | -47530 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 102947

Regular: 60.0% wins / 120 games; finals: 66.7% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 53 / 85 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 52343 | 41700 | 0 | 0 | 0 | 0 | 35640 | 338373 | 0 | 0 | -5480 | -74190 | 0 | -287000 | 0 |
| 2 | true | 132885 | 43862 | 0 | 0 | 0 | 0 | 38960 | 444612 | 18000 | 12000 | 3250 | -188280 | 0 | -248000 | 0 |
| 3 | true | 365676 | 46561 | 0 | 0 | 0 | 0 | 51600 | 549801 | 174000 | 24000 | 14300 | -95910 | 0 | -485000 | 0 |
| 4 | true | 780906 | 82926 | 0 | 0 | 0 | 0 | 83400 | 860370 | 84000 | 12000 | 10100 | -94640 | 0 | -540000 | 0 |
| 5 | true | 1603337 | 763196 | 0 | 0 | 0 | 0 | 95760 | 1047081 | 36000 | 12000 | 9300 | -17710 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 102947

Regular: 55.8% wins / 120 games; finals: 80.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 727391 | 90000 | 0 | 0 | 0 | 0 | 36240 | 486501 | 123250 | 17000 | -25600 | 0 | 0 | 0 | 0 |
| 2 | true | 1453737 | 727391 | 0 | 0 | 0 | 0 | 66360 | 533736 | 123250 | 8500 | 8000 | -13500 | 0 | 0 | 0 |
| 3 | true | 2039697 | 1397937 | 0 | 0 | 0 | 0 | 86520 | 534240 | 12750 | 17000 | 8850 | -73400 | 0 | 0 | 0 |
| 4 | true | 2433207 | 1813897 | 0 | 0 | 0 | 0 | 93840 | 493920 | 59500 | 0 | -7650 | -246100 | 0 | 0 | 0 |
| 5 | true | 2782527 | 2223307 | 0 | 0 | 0 | 0 | 96200 | 493920 | 0 | 0 | -18600 | -222200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 102947

Regular: 44.8% wins / 96 games; finals: 33.3% wins / 3 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 580939 | 60000 | 0 | 0 | 0 | 0 | 36240 | 460299 | 30000 | 20000 | -25600 | 0 | 0 | 0 | 0 |
| 2 | true | 1123633 | 580939 | 0 | 0 | 0 | 0 | 46880 | 477614 | 15000 | 10000 | 8000 | -14800 | 0 | 0 | 0 |
| 3 | true | 1643792 | 1123633 | 0 | 0 | 0 | 0 | 55840 | 462819 | 0 | 0 | 1500 | 0 | 0 | 0 | 0 |
| 4 | true | 1921544 | 1434992 | 0 | 0 | 0 | 0 | 59360 | 452592 | 0 | 0 | -12500 | -221700 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 102947

Regular: 36.1% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 386090 | 45000 | 0 | 0 | 0 | 0 | 36240 | 332850 | 0 | 0 | -28000 | 0 | 0 | 0 | 0 |
| 2 | true | 782899 | 386090 | 0 | 0 | 0 | 0 | 38760 | 350049 | 0 | 0 | 8000 | 0 | 0 | 0 | 0 |
| 3 | true | 1130360 | 768479 | 0 | 0 | 0 | 0 | 35280 | 337281 | 0 | 12000 | -23900 | -13200 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 110866

Regular: 75.8% wins / 120 games; finals: 100.0% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 43 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 209032 | 82 | 0 | 0 | 0 | 0 | 34480 | 416888 | 123250 | 17000 | -6200 | -391700 | -54686 | -20000 | 0 |
| 2 | true | 415782 | 94023 | 0 | 0 | 0 | 0 | 60120 | 604174 | 123250 | 8500 | 10000 | -564100 | -35194 | 0 | 0 |
| 3 | true | 688444 | 263941 | 0 | 0 | 0 | 0 | 81040 | 614880 | 123250 | 17000 | 8600 | -553000 | -19108 | 0 | 0 |
| 4 | true | 928337 | 398545 | 0 | 0 | 0 | 0 | 104160 | 614880 | 123250 | 8500 | 6600 | -597400 | -20097 | 0 | 0 |
| 5 | true | 1171752 | 634292 | 0 | 0 | 0 | 0 | 107480 | 614880 | 123250 | 8500 | -4500 | -585300 | -20895 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 110866

Regular: 70.8% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 43 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 267558 | 341 | 0 | 0 | 0 | 0 | 38000 | 523971 | 145000 | 20000 | -2400 | -418800 | -74213 | -24000 | 0 |
| 2 | true | 601437 | 184518 | 0 | 0 | 0 | 0 | 66680 | 638610 | 70000 | 10000 | 2000 | -446800 | -6611 | 0 | 0 |
| 3 | true | 708984 | 467170 | 0 | 0 | 0 | 0 | 75640 | 556500 | 15000 | 20000 | 600 | -542700 | -17493 | 0 | 0 |
| 4 | true | 1050916 | 470202 | 0 | 0 | 0 | 0 | 80560 | 640500 | 145000 | 10000 | -5000 | -519500 | -9628 | 0 | 0 |
| 5 | true | 1220434 | 790636 | 0 | 0 | 0 | 0 | 101360 | 598500 | 30000 | 10000 | 7800 | -565600 | -12542 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 110866

Regular: 70.0% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 50 / 58 / 58; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 166936 | 187 | 0 | 0 | 0 | 0 | 34040 | 423612 | 36000 | 24000 | 0 | -338300 | -37416 | -20000 | 0 |
| 2 | true | 219784 | 20615 | 0 | 0 | 0 | 0 | 45160 | 556952 | 84000 | 12000 | 10300 | -619300 | -36264 | 0 | 0 |
| 3 | true | 588441 | 72358 | 0 | 0 | 0 | 0 | 58320 | 633675 | 174000 | 24000 | 13100 | -520700 | -13738 | 0 | 0 |
| 4 | true | 765561 | 451469 | 0 | 0 | 0 | 0 | 84000 | 598500 | 36000 | 12000 | -8500 | -533600 | -11280 | 0 | 0 |
| 5 | true | 1096905 | 591427 | 0 | 0 | 0 | 0 | 86200 | 640500 | 174000 | 12000 | -4000 | -565000 | -12356 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 110866

Regular: 61.7% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 93 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 532991 | 82000 | 0 | 0 | 0 | 0 | 37960 | 418481 | 12750 | 17000 | -35200 | 0 | 0 | -8000 | 0 |
| 2 | true | 1046889 | 532211 | 0 | 0 | 0 | 0 | 48640 | 435508 | 12750 | 8500 | 8500 | 0 | 0 | 0 | 0 |
| 3 | true | 1556037 | 973089 | 0 | 0 | 0 | 0 | 51240 | 504958 | 12750 | 17000 | -3000 | -73800 | 0 | 0 | 0 |
| 4 | true | 2073392 | 1420537 | 0 | 0 | 0 | 0 | 59680 | 517175 | 59500 | 8500 | 8000 | -135500 | 0 | 0 | 0 |
| 5 | true | 2629555 | 2037451 | 0 | 0 | 0 | 0 | 65920 | 524543 | 25500 | 8500 | -17400 | -50900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 110866

Regular: 50.8% wins / 120 games; finals: 50.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 118 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 495522 | 52000 | 0 | 0 | 0 | 0 | 37960 | 405762 | 15000 | 20000 | -35200 | 0 | 0 | -8000 | 0 |
| 2 | true | 1048660 | 494662 | 0 | 0 | 0 | 0 | 46320 | 419318 | 70000 | 10000 | 7500 | 0 | 0 | 0 | 0 |
| 3 | true | 1539757 | 977060 | 0 | 0 | 0 | 0 | 55400 | 465297 | 30000 | 10000 | 2000 | -71600 | 0 | 0 | 0 |
| 4 | true | 2099977 | 1486057 | 0 | 0 | 0 | 0 | 57960 | 528360 | 30000 | 10000 | -10400 | -55700 | 0 | 0 | 0 |
| 5 | true | 2637045 | 2041697 | 0 | 0 | 0 | 0 | 60120 | 491348 | 30000 | 10000 | 3500 | -57900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 110866

Regular: 51.4% wins / 72 games; finals: 33.3% wins / 3 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 486676 | 44500 | 0 | 0 | 0 | 0 | 37960 | 398916 | 36000 | 12000 | -35200 | 0 | 0 | -8000 | 0 |
| 2 | true | 1034720 | 486676 | 0 | 0 | 0 | 0 | 42840 | 466704 | 18000 | 12000 | 8500 | 0 | 0 | 0 | 0 |
| 3 | true | 1432414 | 951720 | 0 | 0 | 0 | 0 | 50080 | 439614 | 0 | 0 | -9000 | -83000 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 110866

Regular: 82.5% wins / 120 games; finals: 93.3% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 36 / 67 / 116; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 205466 | 40819 | 0 | 0 | 0 | 0 | 35240 | 455856 | 123250 | 17000 | 1800 | -152680 | 0 | -365000 | 0 |
| 2 | true | 172990 | 41100 | 0 | 0 | 0 | 0 | 66720 | 612864 | 59500 | 8500 | 11500 | -136560 | 0 | -655000 | 0 |
| 3 | true | 729598 | 50910 | 0 | 0 | 0 | 0 | 78200 | 966238 | 123250 | 17000 | 15100 | -103180 | 0 | -540000 | 0 |
| 4 | true | 1786788 | 688648 | 0 | 0 | 0 | 0 | 103920 | 1210870 | 123250 | 8500 | 11600 | -40950 | 0 | -360000 | 0 |
| 5 | true | 3332188 | 1756548 | 0 | 0 | 0 | 0 | 112040 | 1333050 | 123250 | 8500 | -1200 | -30240 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 110866

Regular: 65.0% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 45 / 82 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 104442 | 40482 | 0 | 0 | 0 | 0 | 35720 | 395682 | 30000 | 10000 | 1800 | -67760 | 0 | -361000 | 0 |
| 2 | true | 261969 | 42324 | 0 | 0 | 0 | 0 | 45840 | 550347 | 145000 | 10000 | 13500 | -188160 | 0 | -419000 | 0 |
| 3 | true | 363829 | 40289 | 0 | 0 | 0 | 0 | 71240 | 660450 | 15000 | 20000 | 15100 | -139930 | 0 | -540000 | 0 |
| 4 | true | 1302188 | 283399 | 0 | 0 | 0 | 0 | 82960 | 1009229 | 145000 | 10000 | 11600 | -80430 | 0 | -240000 | 0 |
| 5 | true | 2139379 | 1288328 | 0 | 0 | 0 | 0 | 105520 | 1081731 | 15000 | 10000 | -1200 | -13860 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 110866

Regular: 63.3% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 46 / 79 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 173003 | 40300 | 0 | 0 | 0 | 0 | 35240 | 389403 | 84000 | 24000 | 1800 | -69440 | 0 | -337000 | 0 |
| 2 | true | 236644 | 40614 | 0 | 0 | 0 | 0 | 47040 | 585701 | 84000 | 12000 | 13500 | -205600 | 0 | -473000 | 0 |
| 3 | true | 348105 | 43322 | 0 | 0 | 0 | 0 | 59640 | 624341 | 36000 | 24000 | 15100 | -137620 | 0 | -510000 | 0 |
| 4 | true | 1022687 | 267255 | 0 | 0 | 0 | 0 | 68000 | 646832 | 18000 | 12000 | 10600 | -80850 | 0 | 0 | 0 |
| 5 | true | 1959038 | 1020187 | 0 | 0 | 0 | 0 | 69160 | 917091 | 174000 | 12000 | 4100 | 0 | 0 | -240000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 110866

Regular: 43.3% wins / 120 games; finals: 40.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 499590 | 90000 | 0 | 0 | 0 | 0 | 35640 | 380400 | 12750 | 17000 | -36200 | 0 | 0 | 0 | 0 |
| 2 | true | 1073827 | 493077 | 0 | 0 | 0 | 0 | 44840 | 494897 | 25500 | 8500 | 13100 | -12600 | 0 | 0 | 0 |
| 3 | true | 1636509 | 985127 | 0 | 0 | 0 | 0 | 54440 | 548342 | 25500 | 17000 | 6100 | -88700 | 0 | 0 | 0 |
| 4 | true | 1949103 | 1440909 | 0 | 0 | 0 | 0 | 63640 | 449054 | 0 | 0 | -4500 | -195600 | 0 | 0 | 0 |
| 5 | true | 2388378 | 1949103 | 0 | 0 | 0 | 0 | 57280 | 404895 | 0 | 0 | -22900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 110866

Regular: 48.3% wins / 120 games; finals: 60.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 567994 | 60000 | 0 | 0 | 0 | 0 | 35640 | 343854 | 145000 | 20000 | -36500 | 0 | 0 | 0 | 0 |
| 2 | true | 1172537 | 555894 | 0 | 0 | 0 | 0 | 58760 | 529883 | 15000 | 10000 | 13100 | -22200 | 0 | 0 | 0 |
| 3 | true | 1731387 | 1085637 | 0 | 0 | 0 | 0 | 64640 | 550610 | 15000 | 20000 | 12000 | -103400 | 0 | 0 | 0 |
| 4 | true | 2098323 | 1516187 | 0 | 0 | 0 | 0 | 71480 | 511056 | 0 | 0 | -400 | -215200 | 0 | 0 | 0 |
| 5 | true | 2440346 | 1883923 | 0 | 0 | 0 | 0 | 70240 | 496083 | 0 | 0 | 6000 | -230300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 110866

Regular: 43.3% wins / 120 games; finals: 0.0% wins / 2 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 386869 | 45000 | 0 | 0 | 0 | 0 | 35640 | 330729 | 0 | 12000 | -36500 | 0 | 0 | 0 | 0 |
| 2 | true | 827204 | 384369 | 0 | 0 | 0 | 0 | 38560 | 360675 | 18000 | 12000 | 11100 | 0 | 0 | 0 | 0 |
| 3 | true | 1264723 | 736604 | 0 | 0 | 0 | 0 | 43520 | 451899 | 18000 | 24000 | 6100 | -106000 | 0 | 0 | 0 |
| 4 | true | 1563306 | 1073023 | 0 | 0 | 0 | 0 | 53960 | 440223 | 0 | 0 | 10500 | -206100 | 0 | 0 | 0 |
| 5 | true | 1804375 | 1352766 | 0 | 0 | 0 | 0 | 50680 | 418089 | 0 | 0 | -2900 | -224800 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 118785

Regular: 63.3% wins / 120 games; finals: 57.1% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 98 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 24375 | 595 | 0 | 0 | 0 | 0 | 37160 | 335643 | 0 | 17000 | -2300 | -381800 | -51328 | -20000 | 0 |
| 2 | true | 102386 | 206 | 0 | 0 | 0 | 0 | 45640 | 469193 | 12750 | 8500 | 12100 | -463600 | -6572 | 0 | 0 |
| 3 | true | 319893 | 802 | 0 | 0 | 0 | 0 | 51960 | 582291 | 123250 | 17000 | 7000 | -553100 | -10894 | 0 | 0 |
| 4 | true | 349631 | 93694 | 0 | 0 | 0 | 0 | 78160 | 493920 | 25500 | 8500 | -2250 | -559700 | -14392 | 0 | 0 |
| 5 | true | 393872 | 136464 | 0 | 0 | 0 | 0 | 82640 | 534240 | 12750 | 8500 | 850 | -580200 | -14539 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 118785

Regular: 45.0% wins / 120 games; finals: 40.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 76 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 2/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 58339 | 200 | 0 | 0 | 0 | 0 | 35640 | 361515 | 15000 | 20000 | 700 | -376900 | -37616 | -20000 | 0 |
| 2 | true | 153151 | 18 | 0 | 0 | 0 | 0 | 41760 | 443961 | 30000 | 10000 | -6000 | -416500 | -8409 | 0 | 0 |
| 3 | true | 172789 | 5 | 0 | 0 | 0 | 0 | 44160 | 443373 | 30000 | 10000 | 600 | -501800 | -6695 | 0 | 0 |
| 4 | true | 93825 | 276 | 0 | 0 | 0 | 0 | 50760 | 421302 | 0 | 0 | -32500 | -509400 | -9126 | 0 | 0 |
| 5 | true | 23976 | 240 | 0 | 0 | 0 | 0 | 48400 | 397719 | 0 | 0 | -8000 | -500700 | -7268 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 118785

Regular: 25.0% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 15623 | 341 | 0 | 0 | 0 | 0 | 35480 | 305193 | 0 | 0 | -1300 | -307100 | -28650 | -33000 | 0 |
| 2 | true | 6120 | 13 | 0 | 0 | 0 | 0 | 35520 | 317436 | 0 | 0 | 3100 | -357100 | -8459 | 0 | 0 |
| 3 | true | 4370 | 25 | 0 | 0 | 0 | 0 | 32480 | 299943 | 0 | 0 | 0 | -320300 | -13873 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 118785

Regular: 47.5% wins / 120 games; finals: 60.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 123 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 425428 | 83200 | 0 | 0 | 0 | 0 | 37600 | 335928 | 0 | 0 | -30100 | 0 | 0 | -8000 | 0 |
| 2 | true | 827478 | 389228 | 0 | 0 | 0 | 0 | 41640 | 371760 | 12750 | 8500 | 5000 | -37600 | 0 | 0 | 0 |
| 3 | true | 1445484 | 781365 | 0 | 0 | 0 | 0 | 42920 | 522336 | 123250 | 17000 | -32800 | -54700 | 0 | 0 | 0 |
| 4 | true | 1880138 | 1318784 | 0 | 0 | 0 | 0 | 67840 | 482914 | 0 | 0 | 10600 | -126700 | 0 | 0 | 0 |
| 5 | true | 2354750 | 1766938 | 0 | 0 | 0 | 0 | 65840 | 531922 | 12750 | 8500 | -31200 | -113200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 118785

Regular: 29.2% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 396172 | 53200 | 0 | 0 | 0 | 0 | 37600 | 336672 | 0 | 0 | -30100 | 0 | 0 | -8000 | 0 |
| 2 | true | 768966 | 360432 | 0 | 0 | 0 | 0 | 40560 | 362334 | 0 | 0 | 7000 | -37100 | 0 | 0 | 0 |
| 3 | true | 1076844 | 727341 | 0 | 0 | 0 | 0 | 37120 | 327558 | 0 | 0 | -6000 | -50800 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 118785

Regular: 36.1% wins / 72 games; finals: 0.0% wins / 1 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 387761 | 45000 | 0 | 0 | 0 | 0 | 36880 | 328881 | 0 | 0 | -15000 | 0 | 0 | -8000 | 0 |
| 2 | true | 752801 | 317961 | 0 | 0 | 0 | 0 | 35800 | 362040 | 18000 | 12000 | 7000 | -69800 | 0 | 0 | 0 |
| 3 | true | 1046566 | 672901 | 0 | 0 | 0 | 0 | 38280 | 350585 | 0 | 0 | -15200 | -79900 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 118785

Regular: 75.0% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 37 / 67 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 234021 | 41122 | 0 | 0 | 0 | 0 | 40600 | 481441 | 123250 | 17000 | 3600 | -106870 | 0 | -415000 | 0 |
| 2 | true | 160731 | 41881 | 0 | 0 | 0 | 0 | 71400 | 574560 | 25500 | 8500 | 18200 | -166450 | 0 | -605000 | 0 |
| 3 | true | 710348 | 40731 | 0 | 0 | 0 | 0 | 80000 | 994977 | 59500 | 17000 | 9400 | -71260 | 0 | -540000 | 0 |
| 4 | true | 1680719 | 665478 | 0 | 0 | 0 | 0 | 93520 | 1146621 | 123250 | 8500 | 3350 | -44870 | 0 | -360000 | 0 |
| 5 | true | 3008798 | 1680719 | 0 | 0 | 0 | 0 | 112640 | 1180589 | 25500 | 8500 | 850 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 118785

Regular: 40.3% wins / 72 games; finals: 100.0% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: 52 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 64770 | 39509 | 0 | 0 | 0 | 0 | 38080 | 335160 | 0 | 0 | 1000 | -58470 | 0 | -311000 | 0 |
| 2 | true | 46841 | 40761 | 0 | 0 | 0 | 0 | 40240 | 367731 | 0 | 0 | -21400 | -165500 | 0 | -239000 | 0 |
| 3 | true | 280530 | 40325 | 0 | 0 | 0 | 0 | 43840 | 403599 | 145000 | 10000 | 4400 | -143150 | 0 | -230000 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 118785

Regular: 49.2% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 51 / 98 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 64233 | 40407 | 0 | 0 | 0 | 0 | 40480 | 369453 | 0 | 0 | -2000 | -47700 | 0 | -341000 | 0 |
| 2 | true | 76238 | 41318 | 0 | 0 | 0 | 0 | 46040 | 427025 | 18000 | 12000 | -10120 | -206940 | 0 | -274000 | 0 |
| 3 | true | 130831 | 41551 | 0 | 0 | 0 | 0 | 49880 | 511833 | 18000 | 24000 | 14600 | -158720 | 0 | -405000 | 0 |
| 4 | true | 301618 | 50944 | 0 | 0 | 0 | 0 | 59440 | 505187 | 18000 | 0 | 8000 | -119840 | 0 | -300000 | 0 |
| 5 | true | 928081 | 205578 | 0 | 0 | 0 | 0 | 63000 | 614103 | 36000 | 12000 | -2600 | -96040 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 118785

Regular: 25.0% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 419480 | 90000 | 0 | 0 | 0 | 0 | 37600 | 312280 | 0 | 0 | -20400 | 0 | 0 | 0 | 0 |
| 2 | true | 749017 | 419480 | 0 | 0 | 0 | 0 | 36680 | 320757 | 0 | 0 | -27900 | 0 | 0 | 0 | 0 |
| 3 | true | 900154 | 587417 | 0 | 0 | 0 | 0 | 39120 | 308117 | 0 | 0 | -21300 | -174800 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 118785

Regular: 25.0% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 412489 | 60000 | 0 | 0 | 0 | 0 | 37200 | 317289 | 0 | 0 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 715288 | 356589 | 0 | 0 | 0 | 0 | 37520 | 319179 | 0 | 0 | 2000 | -55900 | 0 | 0 | 0 |
| 3 | true | 1063338 | 715288 | 0 | 0 | 0 | 0 | 34360 | 329690 | 0 | 0 | -16000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 118785

Regular: 19.4% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 429047 | 45000 | 0 | 0 | 0 | 0 | 37080 | 344967 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |
| 2 | true | 682599 | 352437 | 0 | 0 | 0 | 0 | 39840 | 316512 | 0 | 0 | -17900 | -84900 | 0 | 0 | 0 |
| 3 | true | 1024207 | 682599 | 0 | 0 | 0 | 0 | 36680 | 318728 | 0 | 0 | 600 | -14400 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 126704

Regular: 67.5% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 42 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 233261 | 40 | 0 | 0 | 0 | 0 | 36920 | 398199 | 25500 | 17000 | -6400 | -298900 | -9058 | -20000 | 0 |
| 2 | true | 268947 | 91037 | 0 | 0 | 0 | 0 | 47800 | 467530 | 12750 | 8500 | 6800 | -465800 | -41894 | 0 | 0 |
| 3 | true | 352565 | 39741 | 0 | 0 | 0 | 0 | 54400 | 544481 | 25500 | 17000 | 7000 | -551200 | -13563 | 0 | 0 |
| 4 | true | 570085 | 117408 | 0 | 0 | 0 | 0 | 62840 | 610212 | 123250 | 8500 | -2000 | -570400 | -14882 | 0 | 0 |
| 5 | true | 760977 | 348648 | 0 | 0 | 0 | 0 | 88320 | 614880 | 123250 | 8500 | 7400 | -626000 | -25458 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 126704

Regular: 45.8% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 7982 | 181 | 0 | 0 | 0 | 0 | 36000 | 327831 | 0 | 0 | -27700 | -306900 | -57249 | -24000 | 0 |
| 2 | true | 45982 | 77 | 0 | 0 | 0 | 0 | 36920 | 365253 | 30000 | 10000 | 3600 | -397900 | -9873 | 0 | 0 |
| 3 | true | 16517 | 14 | 0 | 0 | 0 | 0 | 36960 | 350847 | 0 | 10000 | -5000 | -414200 | -8072 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 126704

Regular: 40.3% wins / 72 games; finals: 100.0% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: 85 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 6329 | 153 | 0 | 0 | 0 | 0 | 35880 | 332871 | 0 | 0 | -1400 | -344700 | -41322 | -20000 | 0 |
| 2 | true | 187827 | 104 | 0 | 0 | 0 | 0 | 31720 | 325395 | 174000 | 12000 | 6000 | -336000 | -31617 | 0 | 0 |
| 3 | true | 31161 | 525 | 0 | 0 | 0 | 0 | 52120 | 408419 | 0 | 0 | -1600 | -596800 | -18805 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 126704

Regular: 68.3% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 53 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 413498 | 83200 | 0 | 0 | 0 | 0 | 32000 | 308648 | 12750 | 8500 | -30400 | 0 | 0 | -8000 | 0 |
| 2 | true | 1026817 | 413498 | 0 | 0 | 0 | 0 | 35960 | 425609 | 123250 | 8500 | 20000 | 0 | 0 | 0 | 0 |
| 3 | true | 1557151 | 944017 | 0 | 0 | 0 | 0 | 62800 | 511984 | 12750 | 17000 | 8600 | -82800 | 0 | 0 | 0 |
| 4 | true | 2138571 | 1415951 | 0 | 0 | 0 | 0 | 74040 | 614880 | 59500 | 8500 | -34300 | -141200 | 0 | 0 | 0 |
| 5 | true | 2912041 | 2075331 | 0 | 0 | 0 | 0 | 89440 | 614880 | 123250 | 8500 | -1400 | -61200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 126704

Regular: 57.5% wins / 120 games; finals: 37.5% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 66 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 447154 | 53200 | 0 | 0 | 0 | 0 | 32000 | 316554 | 70000 | 10000 | -33400 | 0 | 0 | -8000 | 0 |
| 2 | true | 975743 | 447154 | 0 | 0 | 0 | 0 | 40040 | 452949 | 30000 | 10000 | -4400 | 0 | 0 | 0 | 0 |
| 3 | true | 1521959 | 936021 | 0 | 0 | 0 | 0 | 49640 | 509576 | 15000 | 20000 | 1000 | -49000 | 0 | 0 | 0 |
| 4 | true | 1999579 | 1405059 | 0 | 0 | 0 | 0 | 60520 | 500000 | 15000 | 10000 | 14000 | -121900 | 0 | 0 | 0 |
| 5 | true | 2480038 | 1847479 | 0 | 0 | 0 | 0 | 62640 | 544919 | 15000 | 10000 | -5000 | -147100 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 126704

Regular: 31.9% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 344800 | 45000 | 0 | 0 | 0 | 0 | 32000 | 306600 | 0 | 0 | -30800 | 0 | 0 | -8000 | 0 |
| 2 | true | 686161 | 344800 | 0 | 0 | 0 | 0 | 33040 | 300321 | 0 | 0 | 8000 | 0 | 0 | 0 | 0 |
| 3 | true | 1075682 | 686161 | 0 | 0 | 0 | 0 | 38280 | 349241 | 0 | 0 | 2000 | 0 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 126704

Regular: 83.3% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 32 / 69 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 88869 | 40099 | 0 | 0 | 0 | 0 | 36840 | 428279 | 25500 | 17000 | -25920 | -67830 | 0 | -415000 | 0 |
| 2 | true | 100837 | 42829 | 0 | 0 | 0 | 0 | 47280 | 539038 | 25500 | 8500 | 18200 | -141550 | 0 | -485000 | 0 |
| 3 | true | 386234 | 50279 | 0 | 0 | 0 | 0 | 61760 | 793417 | 123250 | 17000 | 13600 | -63630 | 0 | -660000 | 0 |
| 4 | true | 1372384 | 325474 | 0 | 0 | 0 | 0 | 89200 | 932460 | 12750 | 8500 | 4000 | -60760 | 0 | 0 | 0 |
| 5 | true | 2362431 | 1353344 | 0 | 0 | 0 | 0 | 93520 | 1141217 | 123250 | 8500 | 2600 | -19040 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 126704

Regular: 76.7% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 40 / 93 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 95344 | 39940 | 0 | 0 | 0 | 0 | 36840 | 422604 | 15000 | 20000 | -19530 | -24570 | 0 | -415000 | 0 |
| 2 | true | 343916 | 44339 | 0 | 0 | 0 | 0 | 46480 | 573972 | 145000 | 10000 | 18200 | -180080 | 0 | -365000 | 0 |
| 3 | true | 482466 | 46016 | 0 | 0 | 0 | 0 | 74520 | 868140 | 30000 | 20000 | 13600 | -87710 | 0 | -780000 | 0 |
| 4 | true | 1631399 | 375996 | 0 | 0 | 0 | 0 | 84560 | 1011843 | 145000 | 10000 | 4000 | -106470 | 0 | 0 | 0 |
| 5 | true | 2855926 | 1576029 | 0 | 0 | 0 | 0 | 107920 | 1369977 | 145000 | 10000 | 7000 | -55370 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 126704

Regular: 38.9% wins / 72 games; finals: 100.0% wins / 3 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: 45 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 48944 | 33068 | 0 | 0 | 0 | 0 | 36720 | 347004 | 0 | 0 | -26120 | -42660 | 0 | -311000 | 0 |
| 2 | true | 265649 | 40194 | 0 | 0 | 0 | 0 | 35240 | 345965 | 174000 | 12000 | 3600 | -175100 | 0 | -179000 | 0 |
| 3 | true | 130772 | 43634 | 0 | 0 | 0 | 0 | 61240 | 506153 | 0 | 0 | 16400 | -68670 | 0 | -650000 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 126704

Regular: 50.8% wins / 120 games; finals: 60.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 487522 | 90000 | 0 | 0 | 0 | 0 | 32160 | 364412 | 12750 | 17000 | -28800 | 0 | 0 | 0 | 0 |
| 2 | true | 1229134 | 487522 | 0 | 0 | 0 | 0 | 43080 | 554782 | 123250 | 8500 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 1846864 | 1229134 | 0 | 0 | 0 | 0 | 74040 | 534240 | 12750 | 17000 | -4400 | -15900 | 0 | 0 | 0 |
| 4 | true | 2210768 | 1671564 | 0 | 0 | 0 | 0 | 82360 | 489444 | 0 | 0 | -19100 | -188800 | 0 | 0 | 0 |
| 5 | true | 2734580 | 2210768 | 0 | 0 | 0 | 0 | 73680 | 485332 | 0 | 0 | -8000 | -27200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 126704

Regular: 46.7% wins / 120 games; finals: 33.3% wins / 3 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 540999 | 60000 | 0 | 0 | 0 | 0 | 32680 | 427119 | 30000 | 20000 | -28800 | 0 | 0 | 0 | 0 |
| 2 | true | 1109964 | 540999 | 0 | 0 | 0 | 0 | 46760 | 485205 | 15000 | 10000 | 12000 | 0 | 0 | 0 | 0 |
| 3 | true | 1604886 | 1109964 | 0 | 0 | 0 | 0 | 54360 | 464562 | 0 | 10000 | -4000 | -30000 | 0 | 0 | 0 |
| 4 | true | 1899501 | 1414966 | 0 | 0 | 0 | 0 | 56640 | 463575 | 0 | 0 | -23100 | -202500 | 0 | 0 | 0 |
| 5 | true | 2392793 | 1897001 | 0 | 0 | 0 | 0 | 54120 | 446072 | 0 | 0 | -6900 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 126704

Regular: 30.6% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 369072 | 45000 | 0 | 0 | 0 | 0 | 32160 | 320712 | 0 | 0 | -28800 | 0 | 0 | 0 | 0 |
| 2 | true | 709266 | 369072 | 0 | 0 | 0 | 0 | 34920 | 306474 | 0 | 0 | 12000 | -13200 | 0 | 0 | 0 |
| 3 | true | 1027364 | 709266 | 0 | 0 | 0 | 0 | 34520 | 315578 | 0 | 0 | -3000 | -29000 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 134623

Regular: 69.2% wins / 120 games; finals: 75.0% wins / 8 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 336038 | 480 | 0 | 0 | 0 | 0 | 38960 | 486421 | 123250 | 17000 | -4000 | -344500 | -51093 | -20000 | 0 |
| 2 | true | 316024 | 213599 | 0 | 0 | 0 | 0 | 65080 | 481421 | 0 | 0 | -8000 | -525500 | -33015 | 0 | 0 |
| 3 | true | 400332 | 208177 | 0 | 0 | 0 | 0 | 63480 | 532224 | 12750 | 17000 | 0 | -527000 | -14146 | 0 | 0 |
| 4 | true | 439493 | 188283 | 0 | 0 | 0 | 0 | 67480 | 534240 | 12750 | 8500 | -7500 | -561200 | -15109 | 0 | 0 |
| 5 | true | 630211 | 207904 | 0 | 0 | 0 | 0 | 71120 | 574560 | 123250 | 8500 | 600 | -571100 | -16212 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 134623

Regular: 69.2% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 52 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 238278 | 40 | 0 | 0 | 0 | 0 | 40280 | 496818 | 30000 | 20000 | 6000 | -360900 | -33920 | -20000 | 0 |
| 2 | true | 407194 | 130231 | 0 | 0 | 0 | 0 | 53080 | 471293 | 145000 | 10000 | 2000 | -480200 | -32257 | 0 | 0 |
| 3 | true | 701238 | 293975 | 0 | 0 | 0 | 0 | 73680 | 640500 | 145000 | 20000 | 8000 | -568700 | -24436 | 0 | 0 |
| 4 | true | 753991 | 503449 | 0 | 0 | 0 | 0 | 96040 | 556500 | 15000 | 10000 | -8000 | -596600 | -20187 | 0 | 0 |
| 5 | true | 849132 | 502612 | 0 | 0 | 0 | 0 | 98040 | 556500 | 15000 | 10000 | 4600 | -570200 | -18799 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 134623

Regular: 49.0% wins / 96 games; finals: 71.4% wins / 7 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 57 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 3/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 252612 | 80 | 0 | 0 | 0 | 0 | 37360 | 406371 | 174000 | 24000 | 1000 | -359300 | -55819 | -20000 | 0 |
| 2 | true | 510123 | 180117 | 0 | 0 | 0 | 0 | 60880 | 541695 | 84000 | 12000 | 8000 | -443800 | -5264 | 0 | 0 |
| 3 | true | 603676 | 417303 | 0 | 0 | 0 | 0 | 66240 | 502845 | 18000 | 0 | 9000 | -491100 | -11432 | 0 | 0 |
| 4 | true | 543901 | 395341 | 0 | 0 | 0 | 0 | 62040 | 475262 | 0 | 0 | 5600 | -585900 | -16777 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 134623

Regular: 70.8% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 89 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 524133 | 82000 | 0 | 0 | 0 | 0 | 35000 | 388383 | 12750 | 17000 | -11000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1124718 | 524133 | 0 | 0 | 0 | 0 | 46520 | 506065 | 25500 | 8500 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 1637636 | 1053118 | 0 | 0 | 0 | 0 | 53640 | 505128 | 12750 | 17000 | 1000 | -76600 | 0 | 0 | 0 |
| 4 | true | 2288286 | 1508136 | 0 | 0 | 0 | 0 | 62360 | 606040 | 123250 | 8500 | -20000 | -129500 | 0 | 0 | 0 |
| 5 | true | 2793216 | 2153486 | 0 | 0 | 0 | 0 | 83640 | 534240 | 12750 | 8500 | 3100 | -137300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 134623

Regular: 69.2% wins / 120 games; finals: 66.7% wins / 9 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 102 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 517035 | 52000 | 0 | 0 | 0 | 0 | 35000 | 406035 | 15000 | 20000 | -11000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1314019 | 517035 | 0 | 0 | 0 | 0 | 46520 | 579464 | 145000 | 10000 | 16000 | 0 | 0 | 0 | 0 |
| 3 | true | 1939359 | 1280819 | 0 | 0 | 0 | 0 | 71040 | 556500 | 15000 | 20000 | 1000 | -38200 | 0 | 0 | 0 |
| 4 | true | 2642799 | 1795959 | 0 | 0 | 0 | 0 | 77440 | 640500 | 145000 | 10000 | -26100 | -143400 | 0 | 0 | 0 |
| 5 | true | 3180819 | 2501999 | 0 | 0 | 0 | 0 | 98720 | 556500 | 15000 | 10000 | 1100 | -143300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 134623

Regular: 65.0% wins / 120 games; finals: 42.9% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 386368 | 45000 | 0 | 0 | 0 | 0 | 34360 | 326508 | 0 | 12000 | -23500 | 0 | 0 | -8000 | 0 |
| 2 | true | 872362 | 386368 | 0 | 0 | 0 | 0 | 37960 | 419034 | 18000 | 12000 | -1000 | 0 | 0 | 0 | 0 |
| 3 | true | 1578546 | 854962 | 0 | 0 | 0 | 0 | 46040 | 580944 | 84000 | 24000 | -11400 | -17400 | 0 | 0 | 0 |
| 4 | true | 2089831 | 1460346 | 0 | 0 | 0 | 0 | 59360 | 552825 | 18000 | 12000 | -12700 | -118200 | 0 | 0 | 0 |
| 5 | true | 2745527 | 2064769 | 0 | 0 | 0 | 0 | 64440 | 588956 | 36000 | 12000 | -8500 | -37200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 134623

Regular: 82.5% wins / 120 games; finals: 72.7% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 41 / 69 / 116; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 83790 | 39438 | 0 | 0 | 0 | 0 | 36400 | 470130 | 25500 | 17000 | 1000 | -66240 | 0 | -490000 | 0 |
| 2 | true | 280958 | 40410 | 0 | 0 | 0 | 0 | 47280 | 581998 | 123250 | 8500 | -17920 | -135940 | 0 | -410000 | 0 |
| 3 | true | 636882 | 52728 | 0 | 0 | 0 | 0 | 71280 | 912664 | 123250 | 17000 | 15000 | -123270 | 0 | -660000 | 0 |
| 4 | true | 1400867 | 596932 | 0 | 0 | 0 | 0 | 96760 | 1027375 | 25500 | 8500 | 3300 | -37450 | 0 | -360000 | 0 |
| 5 | true | 2543921 | 1379237 | 0 | 0 | 0 | 0 | 105160 | 1018874 | 12750 | 8500 | 19400 | -21630 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 134623

Regular: 78.3% wins / 120 games; finals: 93.3% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 42 / 65 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 211156 | 40190 | 0 | 0 | 0 | 0 | 36400 | 521556 | 70000 | 20000 | 1000 | -82800 | 0 | -415000 | 0 |
| 2 | true | 285313 | 40636 | 0 | 0 | 0 | 0 | 51920 | 623847 | 145000 | 10000 | -17080 | -134530 | 0 | -605000 | 0 |
| 3 | true | 812831 | 52893 | 0 | 0 | 0 | 0 | 74760 | 920178 | 145000 | 20000 | 13000 | -105420 | 0 | -540000 | 0 |
| 4 | true | 1900778 | 764061 | 0 | 0 | 0 | 0 | 99080 | 1236837 | 145000 | 10000 | 3300 | -46270 | 0 | -360000 | 0 |
| 5 | true | 3311876 | 1900778 | 0 | 0 | 0 | 0 | 112200 | 1124498 | 145000 | 10000 | 19400 | 0 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 134623

Regular: 69.2% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 49 / 87 / 145; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 133280 | 40208 | 0 | 0 | 0 | 0 | 36400 | 450450 | 36000 | 24000 | 3000 | -96570 | 0 | -365000 | 0 |
| 2 | true | 72765 | 41165 | 0 | 0 | 0 | 0 | 46120 | 477845 | 18000 | 12000 | -12600 | -186880 | 0 | -415000 | 0 |
| 3 | true | 503272 | 51120 | 0 | 0 | 0 | 0 | 51560 | 665217 | 174000 | 24000 | 13000 | -137270 | 0 | -360000 | 0 |
| 4 | true | 941143 | 168802 | 0 | 0 | 0 | 0 | 78200 | 880341 | 36000 | 12000 | 3300 | -151970 | 0 | -420000 | 0 |
| 5 | true | 2078735 | 928753 | 0 | 0 | 0 | 0 | 86040 | 993542 | 36000 | 12000 | 22400 | -12390 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 134623

Regular: 62.5% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 736963 | 90000 | 0 | 0 | 0 | 0 | 36040 | 472673 | 123250 | 17000 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 1348562 | 736963 | 0 | 0 | 0 | 0 | 63920 | 527829 | 12750 | 8500 | 14000 | -15400 | 0 | 0 | 0 |
| 3 | true | 1933542 | 1277062 | 0 | 0 | 0 | 0 | 69320 | 574560 | 25500 | 17000 | -6900 | -94500 | 0 | 0 | 0 |
| 4 | true | 2515772 | 1721942 | 0 | 0 | 0 | 0 | 78200 | 614880 | 123250 | 8500 | -16300 | -226300 | 0 | 0 | 0 |
| 5 | true | 2902242 | 2297572 | 0 | 0 | 0 | 0 | 96400 | 493920 | 12750 | 0 | -900 | -215700 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 134623

Regular: 49.2% wins / 120 games; finals: 80.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 13/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 574792 | 60000 | 0 | 0 | 0 | 0 | 36040 | 430752 | 30000 | 20000 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 1181001 | 574792 | 0 | 0 | 0 | 0 | 46040 | 411569 | 145000 | 10000 | 8000 | -14400 | 0 | 0 | 0 |
| 3 | true | 1990396 | 1119301 | 0 | 0 | 0 | 0 | 69320 | 639975 | 145000 | 20000 | 12000 | -76900 | 0 | 0 | 0 |
| 4 | true | 2388816 | 1768696 | 0 | 0 | 0 | 0 | 94520 | 514500 | 30000 | 0 | -18900 | -221700 | 0 | 0 | 0 |
| 5 | true | 2783416 | 2172316 | 0 | 0 | 0 | 0 | 93000 | 514500 | 0 | 0 | 3600 | -216500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 134623

Regular: 47.5% wins / 120 games; finals: 0.0% wins / 3 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 545513 | 45000 | 0 | 0 | 0 | 0 | 36040 | 424473 | 18000 | 24000 | -2000 | 0 | 0 | 0 | 0 |
| 2 | true | 1139828 | 545513 | 0 | 0 | 0 | 0 | 47680 | 502635 | 18000 | 12000 | 14000 | 0 | 0 | 0 | 0 |
| 3 | true | 1639344 | 1061028 | 0 | 0 | 0 | 0 | 56960 | 515256 | 18000 | 12000 | -4300 | -98400 | 0 | 0 | 0 |
| 4 | true | 1916816 | 1446644 | 0 | 0 | 0 | 0 | 63000 | 492272 | 0 | 0 | -85100 | -192700 | 0 | 0 | 0 |
| 5 | true | 2201180 | 1717716 | 0 | 0 | 0 | 0 | 58120 | 440444 | 0 | 0 | -2900 | -211300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 142542

Regular: 75.0% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 53 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 133569 | 100 | 0 | 0 | 0 | 0 | 38920 | 411668 | 12750 | 17000 | -3000 | -361200 | -39569 | -33000 | 0 |
| 2 | true | 311605 | 2540 | 0 | 0 | 0 | 0 | 50280 | 594359 | 123250 | 8500 | 0 | -576300 | -22053 | 0 | 0 |
| 3 | true | 568819 | 146274 | 0 | 0 | 0 | 0 | 71920 | 614880 | 123250 | 17000 | 2500 | -549500 | -22836 | 0 | 0 |
| 4 | true | 753109 | 331897 | 0 | 0 | 0 | 0 | 95120 | 614880 | 59500 | 8500 | -41300 | -540400 | -12010 | 0 | 0 |
| 5 | true | 1017114 | 587711 | 0 | 0 | 0 | 0 | 100640 | 614880 | 59500 | 8500 | -5500 | -507300 | -6715 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 142542

Regular: 64.2% wins / 120 games; finals: 86.7% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 69 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 284377 | 135 | 0 | 0 | 0 | 0 | 36480 | 485121 | 145000 | 20000 | -25600 | -357000 | -46624 | -33000 | 0 |
| 2 | true | 357998 | 178383 | 0 | 0 | 0 | 0 | 60080 | 489143 | 145000 | 10000 | 3800 | -612900 | -21502 | 0 | 0 |
| 3 | true | 681005 | 232618 | 0 | 0 | 0 | 0 | 77720 | 640500 | 145000 | 20000 | -2000 | -545400 | -12813 | 0 | 0 |
| 4 | true | 873875 | 500477 | 0 | 0 | 0 | 0 | 102320 | 640500 | 70000 | 10000 | -11000 | -600500 | -18450 | 0 | 0 |
| 5 | true | 1164789 | 660899 | 0 | 0 | 0 | 0 | 107040 | 640500 | 145000 | 10000 | -12000 | -583900 | -15726 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 142542

Regular: 55.2% wins / 96 games; finals: 57.1% wins / 7 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 77 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 62093 | 78 | 0 | 0 | 0 | 0 | 37240 | 343497 | 0 | 0 | 4000 | -317100 | -30544 | -20000 | 0 |
| 2 | true | 178300 | 9 | 0 | 0 | 0 | 0 | 38120 | 486024 | 84000 | 12000 | -7200 | -476400 | -20337 | 0 | 0 |
| 3 | true | 105210 | 55370 | 0 | 0 | 0 | 0 | 52680 | 474411 | 36000 | 12000 | -5000 | -611000 | -32181 | 0 | 0 |
| 4 | true | 219268 | 333 | 0 | 0 | 0 | 0 | 54000 | 568775 | 36000 | 12000 | 2000 | -546600 | -12117 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 142542

Regular: 68.3% wins / 120 games; finals: 76.9% wins / 13 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 65 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 564015 | 82000 | 0 | 0 | 0 | 0 | 33000 | 330565 | 123250 | 17000 | -21800 | 0 | 0 | -8000 | 0 |
| 2 | true | 1263963 | 530915 | 0 | 0 | 0 | 0 | 58720 | 608328 | 59500 | 8500 | -10000 | -25100 | 0 | 0 | 0 |
| 3 | true | 1809153 | 1169563 | 0 | 0 | 0 | 0 | 75600 | 534240 | 12750 | 17000 | 0 | -94400 | 0 | 0 | 0 |
| 4 | true | 2447493 | 1733213 | 0 | 0 | 0 | 0 | 84680 | 574560 | 59500 | 8500 | -10000 | -78900 | 0 | 0 | 0 |
| 5 | true | 3154903 | 2306193 | 0 | 0 | 0 | 0 | 93480 | 614880 | 123250 | 8500 | 8600 | -141300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 142542

Regular: 57.5% wins / 120 games; finals: 81.8% wins / 11 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 421046 | 52000 | 0 | 0 | 0 | 0 | 32320 | 323526 | 15000 | 20000 | -21800 | 0 | 0 | -8000 | 0 |
| 2 | true | 850202 | 413046 | 0 | 0 | 0 | 0 | 39280 | 372876 | 15000 | 10000 | -8000 | 0 | 0 | 0 | 0 |
| 3 | true | 1520315 | 741702 | 0 | 0 | 0 | 0 | 44360 | 571253 | 145000 | 20000 | -2000 | -108500 | 0 | 0 | 0 |
| 4 | true | 2327326 | 1469035 | 0 | 0 | 0 | 0 | 71920 | 639891 | 145000 | 10000 | -6000 | -53800 | 0 | 0 | 0 |
| 5 | true | 3143966 | 2275666 | 0 | 0 | 0 | 0 | 94440 | 640500 | 145000 | 10000 | -18400 | -54900 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 142542

Regular: 41.7% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 464641 | 44500 | 0 | 0 | 0 | 0 | 36000 | 340641 | 18000 | 24000 | 9000 | 0 | 0 | -8000 | 0 |
| 2 | true | 862060 | 464641 | 0 | 0 | 0 | 0 | 45960 | 377559 | 0 | 0 | -26100 | 0 | 0 | 0 | 0 |
| 3 | true | 1289974 | 794960 | 0 | 0 | 0 | 0 | 46720 | 441294 | 0 | 12000 | -5000 | -67100 | 0 | 0 | 0 |
| 4 | true | 1721789 | 1245744 | 0 | 0 | 0 | 0 | 49360 | 437955 | 0 | 0 | -3400 | -52100 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 142542

Regular: 84.2% wins / 120 games; finals: 92.9% wins / 14 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 38 / 63 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 280302 | 27829 | 0 | 0 | 0 | 0 | 40320 | 520692 | 123250 | 17000 | -12000 | -83960 | 0 | -415000 | 0 |
| 2 | true | 330762 | 41142 | 0 | 0 | 0 | 0 | 70720 | 675360 | 123250 | 17000 | 11000 | -121870 | 0 | -725000 | 0 |
| 3 | true | 1207654 | 45991 | 0 | 0 | 0 | 0 | 95120 | 1146782 | 123250 | 17000 | 0 | -85260 | 0 | -420000 | 0 |
| 4 | true | 2430523 | 1205154 | 0 | 0 | 0 | 0 | 114760 | 1334059 | 123250 | 8500 | 2300 | 0 | 0 | -360000 | 0 |
| 5 | true | 3843068 | 2416593 | 0 | 0 | 0 | 0 | 111680 | 1270895 | 25500 | 8500 | 9900 | -13930 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 142542

Regular: 71.7% wins / 120 games; finals: 58.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 41 / 84 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 98162 | 33273 | 0 | 0 | 0 | 0 | 40360 | 495642 | 30000 | 20000 | -9300 | -63540 | 0 | -475000 | 0 |
| 2 | true | 167047 | 40647 | 0 | 0 | 0 | 0 | 57640 | 517115 | 70000 | 10000 | 10000 | -170870 | 0 | -425000 | 0 |
| 3 | true | 346200 | 47047 | 0 | 0 | 0 | 0 | 69880 | 820323 | 70000 | 20000 | 0 | -141050 | 0 | -660000 | 0 |
| 4 | true | 1270362 | 248900 | 0 | 0 | 0 | 0 | 85160 | 904302 | 15000 | 10000 | 7000 | -97300 | 0 | 0 | 0 |
| 5 | true | 2202560 | 1258742 | 0 | 0 | 0 | 0 | 90440 | 1121978 | 70000 | 10000 | 11400 | -11620 | 0 | -360000 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 142542

Regular: 44.4% wins / 72 games; finals: 50.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: 46 / 69 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 49820 | 40358 | 0 | 0 | 0 | 0 | 36880 | 347340 | 0 | 0 | 8600 | -47000 | 0 | -341000 | 0 |
| 2 | true | 155327 | 41550 | 0 | 0 | 0 | 0 | 41560 | 378147 | 84000 | 12000 | -7640 | -188560 | 0 | -214000 | 0 |
| 3 | true | 105190 | 40105 | 0 | 0 | 0 | 0 | 49680 | 461003 | 18000 | 0 | 0 | -113820 | 0 | -465000 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 142542

Regular: 58.3% wins / 96 games; finals: 85.7% wins / 7 games; finals share: 75.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 699961 | 90000 | 0 | 0 | 0 | 0 | 32200 | 450011 | 123250 | 17000 | -12500 | 0 | 0 | 0 | 0 |
| 2 | true | 1444955 | 633961 | 0 | 0 | 0 | 0 | 59720 | 609024 | 123250 | 8500 | 2500 | -58000 | 0 | 0 | 0 |
| 3 | true | 2025437 | 1442455 | 0 | 0 | 0 | 0 | 81880 | 490352 | 12750 | 0 | -4500 | 0 | 0 | 0 | 0 |
| 4 | true | 2401937 | 1850137 | 0 | 0 | 0 | 0 | 77480 | 493920 | 0 | 0 | -5500 | -189400 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 142542

Regular: 45.8% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 384665 | 60000 | 0 | 0 | 0 | 0 | 32280 | 302085 | 0 | 0 | -9700 | 0 | 0 | 0 | 0 |
| 2 | true | 715068 | 342065 | 0 | 0 | 0 | 0 | 35680 | 333323 | 0 | 0 | 4000 | -42600 | 0 | 0 | 0 |
| 3 | true | 1041077 | 712568 | 0 | 0 | 0 | 0 | 32000 | 309309 | 0 | 0 | -4500 | -10800 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 142542

Regular: 38.9% wins / 72 games; finals: 50.0% wins / 4 games; finals share: 66.7% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 12/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 610465 | 45000 | 0 | 0 | 0 | 0 | 32600 | 448665 | 84000 | 24000 | -23800 | 0 | 0 | 0 | 0 |
| 2 | true | 1124326 | 610465 | 0 | 0 | 0 | 0 | 48800 | 435561 | 18000 | 0 | 11500 | 0 | 0 | 0 | 0 |
| 3 | true | 1458531 | 1021126 | 0 | 0 | 0 | 0 | 48080 | 391325 | 0 | 0 | -4500 | -100700 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 150461

Regular: 77.5% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 45 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 4/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 219710 | 124 | 0 | 0 | 0 | 0 | 35920 | 497627 | 123250 | 17000 | -2000 | -416300 | -105787 | -20000 | 0 |
| 2 | true | 417921 | 83599 | 0 | 0 | 0 | 0 | 67120 | 614376 | 123250 | 8500 | -11400 | -582200 | -21435 | 0 | 0 |
| 3 | true | 748133 | 246081 | 0 | 0 | 0 | 0 | 92080 | 574560 | 123250 | 17000 | 3000 | -475100 | -4578 | 0 | 0 |
| 4 | true | 812510 | 531441 | 0 | 0 | 0 | 0 | 109440 | 534240 | 12750 | 8500 | 0 | -585300 | -15253 | 0 | 0 |
| 5 | true | 944822 | 615428 | 0 | 0 | 0 | 0 | 106480 | 574560 | 25500 | 8500 | 6200 | -572300 | -16628 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 150461

Regular: 64.2% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 53 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 219501 | 243 | 0 | 0 | 0 | 0 | 36320 | 405678 | 145000 | 20000 | -8200 | -367100 | -52197 | -20000 | 0 |
| 2 | true | 352046 | 118592 | 0 | 0 | 0 | 0 | 63360 | 553613 | 15000 | 10000 | 10800 | -507000 | -13228 | 0 | 0 |
| 3 | true | 496885 | 216063 | 0 | 0 | 0 | 0 | 69280 | 598500 | 30000 | 20000 | -10500 | -546400 | -16041 | 0 | 0 |
| 4 | true | 795776 | 297973 | 0 | 0 | 0 | 0 | 73440 | 640500 | 145000 | 10000 | 0 | -556800 | -13249 | 0 | 0 |
| 5 | true | 1043008 | 533368 | 0 | 0 | 0 | 0 | 93480 | 598500 | 145000 | 10000 | -13400 | -570800 | -15548 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 150461

Regular: 38.3% wins / 120 games; finals: 50.0% wins / 4 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 7732 | 1600 | 0 | 0 | 0 | 0 | 31680 | 308910 | 0 | 0 | 0 | -338400 | -39458 | 0 | 0 |
| 2 | true | 52142 | 120 | 0 | 0 | 0 | 0 | 32920 | 323495 | 36000 | 12000 | -7200 | -343600 | -9205 | 0 | 0 |
| 3 | true | 63932 | 147 | 0 | 0 | 0 | 0 | 39240 | 363384 | 36000 | 24000 | 11000 | -455900 | -5934 | 0 | 0 |
| 4 | true | 1851 | 211 | 0 | 0 | 0 | 0 | 44200 | 385161 | 0 | 0 | 1000 | -481400 | -11042 | 0 | 0 |
| 5 | true | 7473 | 25 | 0 | 0 | 0 | 0 | 42480 | 363300 | 0 | 0 | -2300 | -393500 | -4358 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 150461

Regular: 67.5% wins / 120 games; finals: 60.0% wins / 10 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 85 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 492634 | 82000 | 0 | 0 | 0 | 0 | 37680 | 343204 | 12750 | 17000 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 1036412 | 492634 | 0 | 0 | 0 | 0 | 45640 | 474888 | 12750 | 8500 | 2000 | 0 | 0 | 0 | 0 |
| 3 | true | 1687521 | 996412 | 0 | 0 | 0 | 0 | 54520 | 575689 | 59500 | 17000 | -15600 | -40000 | 0 | 0 | 0 |
| 4 | true | 2333171 | 1501221 | 0 | 0 | 0 | 0 | 72320 | 614880 | 123250 | 8500 | 10000 | -183300 | 0 | 0 | 0 |
| 5 | true | 2936431 | 2274531 | 0 | 0 | 0 | 0 | 97800 | 574560 | 25500 | 8500 | -31100 | -72000 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 150461

Regular: 57.5% wins / 120 games; finals: 66.7% wins / 9 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 462713 | 52000 | 0 | 0 | 0 | 0 | 37680 | 348033 | 15000 | 10000 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 1111076 | 462713 | 0 | 0 | 0 | 0 | 43320 | 449043 | 145000 | 10000 | 1000 | 0 | 0 | 0 | 0 |
| 3 | true | 1709450 | 1031476 | 0 | 0 | 0 | 0 | 65800 | 552174 | 30000 | 20000 | 10000 | -79600 | 0 | 0 | 0 |
| 4 | true | 2158661 | 1594950 | 0 | 0 | 0 | 0 | 73120 | 513891 | 0 | 0 | -23300 | -114500 | 0 | 0 | 0 |
| 5 | true | 2808681 | 2026461 | 0 | 0 | 0 | 0 | 72720 | 640500 | 70000 | 10000 | -11000 | -132200 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 150461

Regular: 53.3% wins / 120 games; finals: 57.1% wins / 7 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 531577 | 45000 | 0 | 0 | 0 | 0 | 37680 | 414897 | 18000 | 24000 | 0 | 0 | 0 | -8000 | 0 |
| 2 | true | 1088392 | 531577 | 0 | 0 | 0 | 0 | 47960 | 477855 | 18000 | 12000 | 1000 | 0 | 0 | 0 | 0 |
| 3 | true | 1530541 | 1001392 | 0 | 0 | 0 | 0 | 54200 | 452949 | 0 | 12000 | 10000 | -87000 | 0 | 0 | 0 |
| 4 | true | 2052055 | 1396541 | 0 | 0 | 0 | 0 | 56880 | 576734 | 36000 | 12000 | -26100 | -134000 | 0 | 0 | 0 |
| 5 | true | 2795340 | 1918655 | 0 | 0 | 0 | 0 | 63160 | 626525 | 174000 | 12000 | 1000 | -133400 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 150461

Regular: 82.5% wins / 120 games; finals: 75.0% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 41 / 66 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 7/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 83835 | 40326 | 0 | 0 | 0 | 0 | 37680 | 431605 | 12750 | 17000 | 0 | -90200 | 0 | -415000 | 0 |
| 2 | true | 220378 | 42096 | 0 | 0 | 0 | 0 | 49800 | 587633 | 123250 | 8500 | 2600 | -150240 | 0 | -485000 | 0 |
| 3 | true | 686812 | 63288 | 0 | 0 | 0 | 0 | 81800 | 957014 | 123250 | 17000 | 11000 | -63630 | 0 | -660000 | 0 |
| 4 | true | 1812522 | 641442 | 0 | 0 | 0 | 0 | 107880 | 1290450 | 123250 | 8500 | 4000 | -48370 | 0 | -360000 | 0 |
| 5 | true | 3165016 | 1746092 | 0 | 0 | 0 | 0 | 114880 | 1266544 | 25500 | 8500 | 3500 | -66430 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 150461

Regular: 63.3% wins / 120 games; finals: 66.7% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 45 / 79 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 203999 | 40309 | 0 | 0 | 0 | 0 | 37840 | 362649 | 145000 | 10000 | 0 | -50490 | 0 | -361000 | 0 |
| 2 | true | 100162 | 47952 | 0 | 0 | 0 | 0 | 61680 | 539333 | 15000 | 10000 | -14240 | -176610 | 0 | -539000 | 0 |
| 3 | true | 287197 | 40231 | 0 | 0 | 0 | 0 | 67080 | 807975 | 70000 | 20000 | 9800 | -127820 | 0 | -660000 | 0 |
| 4 | true | 1427904 | 230987 | 0 | 0 | 0 | 0 | 82360 | 1029557 | 70000 | 10000 | 5000 | -56210 | 0 | 0 | 0 |
| 5 | true | 2472393 | 1408514 | 0 | 0 | 0 | 0 | 89000 | 928379 | 30000 | 10000 | 6500 | -19390 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 150461

Regular: 50.8% wins / 120 games; finals: 50.0% wins / 6 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 44 / 87 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 100480 | 40466 | 0 | 0 | 0 | 0 | 37680 | 351960 | 18000 | 24000 | 0 | -39160 | 0 | -337000 | 0 |
| 2 | true | 93617 | 41080 | 0 | 0 | 0 | 0 | 46080 | 419097 | 0 | 0 | 2600 | -196640 | 0 | -278000 | 0 |
| 3 | true | 93207 | 40684 | 0 | 0 | 0 | 0 | 50160 | 460310 | 18000 | 12000 | 12800 | -148680 | 0 | -405000 | 0 |
| 4 | true | 331039 | 44470 | 0 | 0 | 0 | 0 | 54720 | 555912 | 18000 | 12000 | 5000 | -107800 | 0 | -300000 | 0 |
| 5 | true | 1206503 | 282179 | 0 | 0 | 0 | 0 | 60840 | 674184 | 174000 | 12000 | 3300 | -48860 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 150461

Regular: 50.8% wins / 120 games; finals: 80.0% wins / 5 games; finals share: 40.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 575627 | 90000 | 0 | 0 | 0 | 0 | 32080 | 424047 | 25500 | 17000 | -13000 | 0 | 0 | 0 | 0 |
| 2 | true | 969659 | 575627 | 0 | 0 | 0 | 0 | 44680 | 370652 | 0 | 0 | -21300 | 0 | 0 | 0 | 0 |
| 3 | true | 1566423 | 896759 | 0 | 0 | 0 | 0 | 45560 | 490654 | 123250 | 17000 | 6000 | -85700 | 0 | 0 | 0 |
| 4 | true | 1914623 | 1367523 | 0 | 0 | 0 | 0 | 74520 | 493880 | 0 | 0 | -24300 | -195900 | 0 | 0 | 0 |
| 5 | true | 2245179 | 1725763 | 0 | 0 | 0 | 0 | 70360 | 478196 | 0 | 0 | -29200 | -188800 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 150461

Regular: 36.1% wins / 72 games; finals: 50.0% wins / 2 games; finals share: 33.3% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 401051 | 60000 | 0 | 0 | 0 | 0 | 32080 | 313971 | 0 | 0 | -5000 | 0 | 0 | 0 | 0 |
| 2 | true | 726380 | 401051 | 0 | 0 | 0 | 0 | 34040 | 313089 | 0 | 0 | -21800 | 0 | 0 | 0 | 0 |
| 3 | true | 1105676 | 657880 | 0 | 0 | 0 | 0 | 33600 | 371196 | 30000 | 10000 | 3000 | -68500 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 150461

Regular: 43.8% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 438531 | 45000 | 0 | 0 | 0 | 0 | 32080 | 332451 | 18000 | 24000 | -13000 | 0 | 0 | 0 | 0 |
| 2 | true | 801832 | 438531 | 0 | 0 | 0 | 0 | 38680 | 346521 | 0 | 0 | -21900 | 0 | 0 | 0 | 0 |
| 3 | true | 1101697 | 698132 | 0 | 0 | 0 | 0 | 41320 | 383345 | 0 | 0 | -7200 | -117600 | 0 | 0 | 0 |
| 4 | true | 1368864 | 902497 | 0 | 0 | 0 | 0 | 44680 | 414687 | 0 | 0 | 5000 | -197200 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / easy / au / seed 158380

Regular: 65.0% wins / 120 games; finals: 50.0% wins / 8 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 58 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 5/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 56634 | 37 | 0 | 0 | 0 | 0 | 36240 | 365600 | 12750 | 8500 | 11000 | -392700 | -54756 | -20000 | 0 |
| 2 | true | 94096 | 19 | 0 | 0 | 0 | 0 | 36080 | 440648 | 25500 | 8500 | -6200 | -460500 | -6566 | 0 | 0 |
| 3 | true | 345320 | 1943 | 0 | 0 | 0 | 0 | 45920 | 567132 | 123250 | 17000 | 3100 | -494000 | -11178 | 0 | 0 |
| 4 | true | 380977 | 145852 | 0 | 0 | 0 | 0 | 74560 | 534240 | 12750 | 8500 | -8200 | -571100 | -15093 | 0 | 0 |
| 5 | true | 386070 | 168342 | 0 | 0 | 0 | 0 | 79400 | 534240 | 12750 | 8500 | -9200 | -600000 | -20597 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / normal / au / seed 158380

Regular: 55.8% wins / 120 games; finals: 40.0% wins / 5 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 70 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 6/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 34756 | 70 | 0 | 0 | 0 | 0 | 36440 | 356370 | 0 | 10000 | 2000 | -376400 | -33654 | -20000 | 0 |
| 2 | true | 130041 | 113 | 0 | 0 | 0 | 0 | 40440 | 484985 | 15000 | 10000 | -25400 | -424300 | -5440 | 0 | 0 |
| 3 | true | 241663 | 1603 | 0 | 0 | 0 | 0 | 49400 | 536298 | 30000 | 20000 | -4100 | -504000 | -15976 | 0 | 0 |
| 4 | true | 224224 | 32401 | 0 | 0 | 0 | 0 | 57480 | 483105 | 0 | 0 | -7000 | -540000 | -11024 | 0 | 0 |
| 5 | true | 345766 | 6372 | 0 | 0 | 0 | 0 | 56000 | 574854 | 30000 | 10000 | -4000 | -531000 | -14312 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### careless / hard / au / seed 158380

Regular: 33.3% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 2720 | 250 | 0 | 0 | 0 | 0 | 35440 | 298935 | 0 | 0 | -17000 | -296800 | -62855 | 0 | 0 |
| 2 | true | 1277 | 75 | 0 | 0 | 0 | 0 | 32480 | 305078 | 0 | 0 | 800 | -323400 | -16401 | 0 | 0 |
| 3 | true | 14588 | 248 | 0 | 0 | 0 | 0 | 33160 | 322067 | 0 | 12000 | -7000 | -341600 | -5316 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / easy / au / seed 158380

Regular: 64.2% wins / 120 games; finals: 28.6% wins / 7 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 62 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 527773 | 82000 | 0 | 0 | 0 | 0 | 35080 | 375943 | 12750 | 17000 | 5000 | 0 | 0 | -8000 | 0 |
| 2 | true | 1075862 | 459173 | 0 | 0 | 0 | 0 | 43840 | 521549 | 59500 | 8500 | -16700 | -68600 | 0 | 0 | 0 |
| 3 | true | 1582025 | 988162 | 0 | 0 | 0 | 0 | 56400 | 520713 | 12750 | 17000 | -13000 | -87700 | 0 | 0 | 0 |
| 4 | true | 2064009 | 1434025 | 0 | 0 | 0 | 0 | 70800 | 530934 | 12750 | 8500 | 7000 | -148000 | 0 | 0 | 0 |
| 5 | true | 2501059 | 1917009 | 0 | 0 | 0 | 0 | 78960 | 534240 | 12750 | 8500 | -52900 | -144500 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / normal / au / seed 158380

Regular: 55.8% wins / 120 games; finals: 20.0% wins / 5 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 83 / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 420185 | 52000 | 0 | 0 | 0 | 0 | 34520 | 322665 | 0 | 10000 | 1000 | 0 | 0 | -8000 | 0 |
| 2 | true | 845470 | 336085 | 0 | 0 | 0 | 0 | 36880 | 451805 | 30000 | 10000 | -19300 | -84100 | 0 | 0 | 0 |
| 3 | true | 1210177 | 745870 | 0 | 0 | 0 | 0 | 44560 | 407747 | 15000 | 10000 | -13000 | -99600 | 0 | 0 | 0 |
| 4 | true | 1643655 | 1070077 | 0 | 0 | 0 | 0 | 51040 | 511938 | 15000 | 10000 | -14400 | -140100 | 0 | 0 | 0 |
| 5 | true | 2205605 | 1584200 | 0 | 0 | 0 | 0 | 60200 | 547050 | 15000 | 10000 | 1000 | -71300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### casual-weekly / hard / au / seed 158380

Regular: 35.4% wins / 96 games; finals: 0.0% wins / 1 games; finals share: 25.0% / 4 completed seasons. Weeks: 116; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 471207 | 45000 | 0 | 0 | 0 | 0 | 37320 | 355887 | 18000 | 24000 | -1000 | 0 | 0 | -8000 | 0 |
| 2 | true | 821003 | 410307 | 0 | 0 | 0 | 0 | 45000 | 385896 | 0 | 0 | -20200 | -60900 | 0 | 0 | 0 |
| 3 | true | 1222831 | 784303 | 0 | 0 | 0 | 0 | 47320 | 404208 | 0 | 0 | -13000 | -36700 | 0 | 0 | 0 |
| 4 | true | 1494754 | 1071031 | 0 | 0 | 0 | 0 | 50200 | 387923 | 0 | 0 | -14400 | -151800 | 0 | 0 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / easy / au / seed 158380

Regular: 84.2% wins / 120 games; finals: 100.0% wins / 15 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 34 / 63 / 112; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 271502 | 44845 | 0 | 0 | 0 | 0 | 36040 | 499022 | 123250 | 17000 | 9600 | -88410 | 0 | -415000 | 0 |
| 2 | true | 256485 | 40158 | 0 | 0 | 0 | 0 | 66800 | 639113 | 123250 | 17000 | 15800 | -151980 | 0 | -725000 | 0 |
| 3 | true | 805600 | 50165 | 0 | 0 | 0 | 0 | 95440 | 1164875 | 123250 | 17000 | 13600 | -85050 | 0 | -780000 | 0 |
| 4 | true | 2457724 | 788310 | 0 | 0 | 0 | 0 | 114760 | 1422904 | 123250 | 8500 | 0 | -17290 | 0 | 0 | 0 |
| 5 | true | 4087143 | 2444144 | 0 | 0 | 0 | 0 | 114000 | 1393449 | 123250 | 8500 | 3800 | -13580 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / normal / au / seed 158380

Regular: 65.0% wins / 120 games; finals: 83.3% wins / 12 games; finals share: 100.0% / 5 completed seasons. Weeks: 145; to 70/80/90: 40 / 73 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 274387 | 40977 | 0 | 0 | 0 | 0 | 38760 | 504777 | 145000 | 20000 | 13000 | -83150 | 0 | -424000 | 0 |
| 2 | true | 355847 | 45847 | 0 | 0 | 0 | 0 | 70520 | 640500 | 145000 | 10000 | 15800 | -195360 | 0 | -605000 | 0 |
| 3 | true | 648739 | 63817 | 0 | 0 | 0 | 0 | 90680 | 841092 | 15000 | 20000 | -5500 | -128380 | 0 | -540000 | 0 |
| 4 | true | 1716607 | 549759 | 0 | 0 | 0 | 0 | 100120 | 1267928 | 145000 | 10000 | 3800 | -98980 | 0 | -360000 | 0 |
| 5 | true | 2921461 | 1619797 | 0 | 0 | 0 | 0 | 114000 | 1150664 | 30000 | 0 | 7000 | -96810 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### min-maxer / hard / au / seed 158380

Regular: 49.0% wins / 96 games; finals: 0.0% wins / 2 games; finals share: 50.0% / 4 completed seasons. Weeks: 116; to 70/80/90: 59 / 107 / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 10/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 50881 | 40862 | 0 | 0 | 0 | 0 | 35960 | 332871 | 0 | 0 | 7000 | -49950 | 0 | -320000 | 0 |
| 2 | true | 62651 | 41733 | 0 | 0 | 0 | 0 | 39640 | 363090 | 0 | 0 | 5600 | -232560 | 0 | -164000 | 0 |
| 3 | true | 175729 | 40502 | 0 | 0 | 0 | 0 | 42840 | 461738 | 18000 | 24000 | 3500 | -132000 | 0 | -305000 | 0 |
| 4 | true | 131467 | 40756 | 0 | 0 | 0 | 0 | 57760 | 491348 | 18000 | 12000 | 1400 | -84770 | 0 | -540000 | 0 |

Save round-trips: 4; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / easy / au / seed 158380

Regular: 54.2% wins / 120 games; finals: 70.0% wins / 10 games; finals share: 80.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 9/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 660443 | 90000 | 0 | 0 | 0 | 0 | 37240 | 392453 | 123250 | 8500 | 9000 | 0 | 0 | 0 | 0 |
| 2 | true | 1305618 | 596143 | 0 | 0 | 0 | 0 | 60600 | 602775 | 59500 | 8500 | -21900 | -64300 | 0 | 0 | 0 |
| 3 | true | 1978278 | 1305618 | 0 | 0 | 0 | 0 | 76400 | 574560 | 25500 | 17000 | -7000 | -13800 | 0 | 0 | 0 |
| 4 | true | 2346838 | 1791778 | 0 | 0 | 0 | 0 | 87840 | 493920 | 0 | 0 | -12000 | -201200 | 0 | 0 | 0 |
| 5 | true | 2838239 | 2158738 | 0 | 0 | 0 | 0 | 82320 | 573431 | 25500 | 8500 | 2250 | -200600 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / normal / au / seed 158380

Regular: 36.7% wins / 120 games; finals: 25.0% wins / 4 games; finals share: 60.0% / 5 completed seasons. Weeks: 145; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 8/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 500047 | 60000 | 0 | 0 | 0 | 0 | 37240 | 366807 | 15000 | 10000 | 11000 | 0 | 0 | 0 | 0 |
| 2 | true | 931728 | 458647 | 0 | 0 | 0 | 0 | 43200 | 444381 | 15000 | 10000 | -23400 | -57500 | 0 | 0 | 0 |
| 3 | true | 1460023 | 931728 | 0 | 0 | 0 | 0 | 52800 | 445095 | 30000 | 20000 | -6000 | -13600 | 0 | 0 | 0 |
| 4 | true | 1963453 | 1460023 | 0 | 0 | 0 | 0 | 62040 | 445190 | 0 | 0 | -3800 | 0 | 0 | 0 | 0 |
| 5 | true | 2230450 | 1788153 | 0 | 0 | 0 | 0 | 57880 | 438417 | 0 | 0 | -39000 | -190300 | 0 | 0 | 0 |

Save round-trips: 5; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.


### newcomer / hard / au / seed 158380

Regular: 22.2% wins / 72 games; finals: n/a wins / 0 games; finals share: 0.0% / 3 completed seasons. Weeks: 87; to 70/80/90: unreached / unreached / unreached; broke: false; weeks in debt: 0. Opening players gaining a star: 11/20.

| Season | Completed | End cash | Minimum cash | wages | upkeep | overhead | sponsor | grant | gate | prize | boardGrant | events | transfers | contracts | facilities | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | true | 402701 | 45000 | 0 | 0 | 0 | 0 | 36000 | 316701 | 0 | 0 | 5000 | 0 | 0 | 0 | 0 |
| 2 | true | 740069 | 402701 | 0 | 0 | 0 | 0 | 36880 | 317888 | 0 | 0 | -17400 | 0 | 0 | 0 | 0 |
| 3 | true | 1087055 | 740069 | 0 | 0 | 0 | 0 | 37280 | 323306 | 0 | 0 | 600 | -14200 | 0 | 0 | 0 |

Save round-trips: 3; repairs: 0; unrecoverable: 0. Stability: {"crashes":0,"thrownTicks":0,"invariantFailures":0,"nonFinite":0}.

