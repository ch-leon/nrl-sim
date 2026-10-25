# Match balance — October 2026 (N13)

## Shorter halves (25 Oct)

Halves went from 9:00 to 7:00 so a watched match is shorter. The golden even
Balanced / Slide match (seed 1, no break rule) moved on purpose, from
`8-14:495:67db8b634c5a2e73` to `6-7:362:e959099a69ffd994`. The siren comes earlier,
legs drain and recover ×9/7, and the minute windows (field goal 180 s → 140 s,
the AI coach's early hold 60 s → 47 s, a penalty shot's "late" 300 s → 233 s,
sin bin 5 → 4, golden point 5 → 4, a late lead from minute 15 → 12) are a
different match on the same seed. The pin is the new match, not a slipped hash.
The sprint tank was left alone: a sprint is still a few seconds.

Count bands in the harness are the old bands ×7/9, rounded (tries 4–7, tackles
117–163, and the rest in tuning §12). Completion stayed 70–80%. Even 60 v 60
over 20 seeds scored 6.15 tries a match on 9:00 halves and 4.05 on 7:00 (the
length alone would suggest about 4.8). That 4.05 sits on the bottom of the new
band. It was left there: the per-minute rate was not pushed back up.

Screen only, so the golden match does not include them: dead time (ruck and
play-the-ball, tackle, restart and kick-off, set piece, conversion, try, penalty,
field goal) plays at twice the chosen speed, eased over 0.4 s; the half-time
card goes on after 4.5 s at every speed unless it is tapped; the chosen speed
is kept on the save (v20), and an old save still starts at ×4.

Presets, `balance/runs/20261025-080627-presets` on `c6770da`, 200 seeds both
ways (400 matches). Side win, 45–55% is the band:

| Preset | Side win | |
|---|---:|---|
| Grind | 44.8% | 0.2 under. Standard error on 400 matches is about 2.5 points, so this is not a miss a knob change can honestly fix. |
| Expansive | 50.2% | in |
| Kick-chase | 53.0% | in |
| All-out | 47.3% | in |
| Rush | 44.8% | same as Grind |
| Compressed | 47.8% | in |

No preset knob was moved. Grind's offloads are 4.5, under the new 6–11 band; that is the style (it was already under the old 8–14). Completion sits at 68–72%, a shade under 70 on the expansive, all-out and rush rows, as it did on 9:00 halves. A half-time change from Grind to Expansive still offloads more (6.7 against 4.9 over 40 matches).

The gate is the income line that follows a shorter match. Prize money is a finals cheque, not a payment per point, and the wage, upkeep and running-cost formulas are not per minute, so those stayed. On the soak of `main` at `1a3b7f0` (still 9:00) the gate was about 5% light once halves were 7:00, and a managing club that filled the hill a season later never quite caught the stand it would have built. The ticket is $21 (was $20). Prize stays $15k / $25k / $75k: raising it as well as the ticket put a managing Normal club about $200k past this baseline at season 5. Difficulty factors are unchanged (Easy prize and grant ×0.85, gate ×0.96; Hard prize and grant ×1.2; Normal ×1).

Soak after the ticket, `npm run soak -- --difficulties easy,normal,hard --jobs 4`. 20 seeds × 5 seasons × idle and managed × Easy, Normal and Hard, plus one 2-season managed run of each old save (v1–v19). **139 runs, no problems, forfeits none.** About 20 minutes on 4 jobs. The same command on `1a3b7f0` is the baseline in the table.

Season 5. Money is the balance at the rollover. "9:00" is `1a3b7f0`. "Before" is 7:00 halves with the $20 ticket, measured on `c6770da`.

| | Record | Pos | Top 8 | Prem | Sack | Money | Before | 9:00 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| idle Easy (20) | 15.3-1.2-7.5 | 3.0 | 90% | 35% | 5% | $1,200k | $1,080k (20) | $1,239k (19) |
| managed Easy (20) | 21.2-0.4-2.5 | 1.0 | 100% | 70% | 0% | $1,040k | $798k | $966k |
| idle Normal (12) | 12.8-1.1-10.2 | 7.1 | 58% | 17% | 50% | $871k | $817k (11) | $1,019k (10) |
| managed Normal (18) | 19.7-0.7-3.7 | 1.0 | 100% | 44% | 0% | $556k | $417k (19) | $443k (19) |
| idle Hard (4) | 16.3-0.5-7.3 | 2.0 | 100% | 0% | 0% | $792k | $687k (4) | $676k (4) |
| managed Hard (14) | 18.4-0.5-5.1 | 1.3 | 100% | 43% | 21% | $312k | $209k (13) | $275k (15) |

Income over five seasons (grant + gate + prize + board + events + sponsor, $k, summed across the season means). This is the flow, not the balance.

| | 9:00 | Before ($20) | Ticket $21 |
|---|---:|---:|---:|
| idle Easy | 3,165 | 3,046 | 3,167 |
| managed Easy | 5,555 | 5,240 | 5,613 |
| idle Normal | 2,873 | 2,807 | 2,909 |
| managed Normal | 4,847 | 4,863 | 5,145 |
| idle Hard | 2,733 | 2,708 | 2,804 |
| managed Hard | 4,301 | 4,256 | 4,652 |

A career in the red finished its last season below zero. Against `1a3b7f0`: idle Easy 0/20 (was 1/20), idle Normal 2/20 (was 6/20), idle Hard 14/20 (was 15/20), managed Easy 1/20 (was 0/20), managed Normal 2/20 (was 3/20), managed Hard 8/20 (was 9/20). Managed Easy is the one share above the 9:00 count, and it is inside 1 in 16. Easy's season-5 balance ($1,200k idle, $1,040k managed) stays above Normal's ($871k, $556k), and Hard stays under both. Managing Normal's balance runs ahead of the 9:00 mean ($556k against $443k) because the extra gate compounds into a stand; the five-season income is about 6% up.

A phone (844×390, touch, no taps) watched one match at the default ×4 in 3 min 21 s, siren at 14:00, and one at ×8 in 1 min 38 s. The half-time card went on by itself after 4.5 s both times. The aim was about 3½–4 minutes at ×4; 3:21 is a little under that, and the dead-time pace was not raised to close the gap. Commentary is 12.8px and stays on the screen without an ellipsis. At ×4 a line is the bright one for about half a second (median); at ×8 about a quarter of a second, with the dimmed line above holding the previous one. Held upright, the rotate card covers the match and the clock stays put (00:16, then 00:29 once it is sideways again).

## Grubber chase and season styles (25 Oct)

The grubber is a chase now, and a rival's Grind or Expansive label follows a wider pack and a real pace edge. The first cut of the chase (wingers away inside 28 m, leading by 4 m) made the kick pay too often, and a managed Normal club finished in the red more often. The chase now starts inside 24 m and leads by at most 3 m. The golden even Balanced / Slide match (seed 1) moved on purpose, from `6-7:362:e959099a69ffd994` to `14-16:355:a3624c324e9bb503` on the longer chase, then to `8-16:346:3436c830c791688a` once it was eased. Playback pace was left as the shorter-halves cut set it, so a watched match stays about 3:21 at ×4.

### Grubbers

Before this, a grubber was a turnover. The fullback was already on the end spot, the ball often died or was grounded, and the chase started too far back to arrive. Over the kicks close-out that was 0.008 tries a match from about 2.5 grubbers.

What changed (`tactics.ts`, `live.ts`, `touch.ts`, `ball.ts`, tuning §6 and §16):

- Inside 16 m the spot is still about 3 m into the in-goal. Further out it is about 8 m short of the line, so the chase can stick it.
- The aim is a winger's lane, pulled 40% back toward the kicker, with 14 m of scatter (`touch.grubberInfield` 0.4, `touch.grubberMissM` 14).
- The wingers start on the second-last tackle inside 24 m (the first cut was 28), at most 3 m in front of the ball (the first cut was 4) and no closer than 10 m to the try line until the kick is aimed. The fullback joins once it is aimed, so the last line is not abandoned for the whole set.
- The ball runs on up to 6 m (was 9) at 12 m/s (was 13). A close-in grubber stays short of the dead-ball line. The 20 m restart and the grounding rule are unchanged.

Even 60 v 60, 80 seeds. The four outcomes add up to the grubbers. "First cut" is `balance/runs/20261025-140642-loose-ends` (28 m, lead 4 m). "Eased" is `balance/runs/20261025-150020-grubber-ease-confirm` (24 m, lead 3 m).

| Outcome | First cut | Eased | Share | Band |
|---|---:|---:|---:|---|
| Grubbers | 2.04 | 1.88 | | about 2, as before |
| Tries | 0.38 | 0.25 | 13% | **0.20–0.35**, the lower half of the N13 band 0.2–0.5. Standard error 0.06. |
| Repeat sets | 0.08 | 0.08 | 4% | **0.05–0.30**. The chase regathers and does not score within 12 s. |
| Drop-outs | 0.00 | 0.00 | 0% | **0–0.15**. A defender who grounds it, and a kick that dies, are 20 m restarts, counted as turnovers. A drop-out is the ball dead off him. |
| Turnovers | 1.59 | 1.55 | 83% | the rest. The kick is a gamble. |

About one grubber in six is a try or a repeat set. That is a real option, and it is not how the set usually ends. The plan's "one in six from inside 22 m" was not split out of this run. A fast winger against a slow fullback was tried over 24 seeds on the first cut and scored 4 home grubber tries against 3 the other way: Speed barely separates them (the range is 6–9 m/s), so that test was not added.

All tries, both sides, went from 4.05 on the 7:00 cut (20 seeds) to 5.6 on the first cut (80 seeds) and 5.4 on the eased chase (80 seeds, standard error 0.2). The ask for this pass was about 4.5–5.5. The harness band is 4–7. Completion on the eased row is 70.8%.

### Why a managed club finished poorer

The first cut scored more (5.6 tries against 4.05) and managed Normal went from 2 of 20 careers in the red to 7 of 20, before wildcard events. The mean balance barely moved ($507k to $479k). The left tail did.

It is not injuries. In the player's own matches a season, the chase put about 0.23 injuries a game on his side and the old grubber about 0.21. A full even match still ends with nobody gassed and the legs near three quarters, so fatigue is not a bill. Prize money in season 1 was not the hole either: the chase-only careers took home $77k against $73k.

What moved is who won the player's matches. Season-1 wins, managed Normal, 20 seeds: 18.5 with neither change, 17.4 with only the chase, 17.3 with only the style thresholds, 17.1 with both. The chase gives both sides about a third of a try. The player's lead in tries stays about 1.9, and the extra ones are the grubber's, so a game he was winning becomes a coin flip often enough to cost him about a win. The style thresholds do the same without adding tries: a rival who was playing a losing expansive game now grinds, and takes a result. Those thresholds stay (Leon, 25 Oct). Kick-chase at +4.3 against strength is accepted and was not moved.

Wildcard events are on main (`beea9e9`). Main alone, with those events and no chase, is 5 of 20 managed Normal careers in the red. The longer chase on top of that was 3 of 20, mean end $409k, and the next club sat at +$14k. The eased chase is 3 of 20 as well, mean end $494k, season-1 wins back to 18.3, and the next club sits at +$26k. Two of the three red careers finished $2k and $5k under. That is the cap of 3 in 20. The full Easy / Normal / Hard soak is below.

### Presets, even matches

200 seeds both ways (400 matches). Side win. No preset knob was moved. 45–55% is the band. Standard error is still about 2.5 points. "Longer chase" is `balance/runs/20261025-134843-presets`. "Eased" is `balance/runs/20261025-150406-presets`.

| Preset | 7:00 before | Longer chase | Eased |
|---|---:|---:|---:|
| Grind | 44.8% | 47.8% | 50.0% |
| Expansive | 50.2% | 47.5% | 45.0% |
| Kick-chase | 53.0% | 46.3% | 52.3% |
| All-out | 47.3% | 49.0% | 50.5% |
| Rush | 44.8% | 51.5% | 51.5% |
| Compressed | 47.8% | 46.5% | 51.7% |

All six are inside the band. Expansive is on the 45% line (5.0% drawn). Draws on the eased run: Grind 5.3%, Expansive 5.0%, Kick-chase 4.8%, All-out 5.5%, Rush 3.5%, Compressed 5.8%. Grind still offloads least (4.6 against Expansive 9.0 and All-out 10.1). A half-time change from Grind to Expansive still offloads more (6.6 against 5.5 over 40 matches). Completion on the eased rows is 69–71%, under 70 on Expansive (69.4), All-out (68.7), Rush (69.0) and Compressed (69.4).

### Season styles (#322)

N14.2, before this, 10 seeds × 3 seasons, 10,354 rival games: at a level rating Grind 56% (**+5.7**) and Expansive 43% (**−6.9**). Against strength, Expansive **−5.7**, Kick-chase **+4.5**, All-out **+5.3**. A style is also a squad, so the even-match column above does not answer it. Grind was only a pack 2.5 stronger than its own nine, and Expansive was any back line 0.5 quicker.

`RIVAL_STYLE.packStrength` 2.5 → 1.0 and `backsPace` 0.5 → 1.5 (tuning §28). Leon (25 Oct) kept both cuts. The even-match tables were not moved to chase the season, because Grind's even matches were the weak side of the band and its seasons were the strong side.

After, 10 seeds × 1 season, idle and managed, Normal, `--live-rivals`, 3,445 rival games. No problems, no forfeits. Break-rule switches 2.26 a match (was 2.51). Mix: attack Balanced 37%, Grind 32%, Kick-chase 15%, Expansive 11%, All-out 5%; defence Slide 57%, Rush 27%, Compressed 15%.

Wins ÷ games when the clubs began within 2 points. A draw is half a win. **Bold** is more than 4 points from even.

| Attack | Sides | Before | After | Off even |
|---|---:|---:|---:|---:|
| Balanced | 357 | 49% | 50% | +0.4 |
| Grind | 295 | 56% | 52% | +1.5 |
| Kick-chase | 125 | 53% | 53% | +2.8 |
| Expansive | 107 | 43% | 43% | **−7.5** |
| All-out | 32 | 52% | 45% | −4.7 |

Defence at the same level rating: Slide 49% (−0.7), Rush 52% (+2.2), Compressed 49% (−1.1). None past 4 points.

Against the strength gap, every game. **Bold** is more than 4 points from that mean.

| Attack | Sides | Score | Expected | Difference | Before |
|---|---:|---:|---:|---:|---:|
| Balanced | 2,558 | 46% | 48% | −1.4 | −1.4 |
| Grind | 2,205 | 50% | 49% | +1.3 | +3.9 |
| Kick-chase | 1,040 | 59% | 55% | **+4.3** | **+4.5** |
| Expansive | 730 | 40% | 46% | **−6.4** | **−5.7** |
| All-out | 357 | 67% | 65% | +2.4 | **+5.3** |

Defence against strength: Slide −1.4, Rush +2.2, Compressed +1.3. None past 4 points.

Grind is inside both measures. Expansive is not. Raising the pace bar did not lift it (the strength gap was −5.7 and is −6.4, standard error 1.8 on 730 sides). A sweep of the Expansive knobs on even matches (`balance/runs/20261025-140349-expansive-buff`, 120 seeds both ways) moved the win rate by about two points, inside luck, and the moves that send more ball to the edges made it worse. The even-match rate on the longer chase was 47.5% (50% on that sweep's own baseline block) and is 45.0% once the chase was eased, still inside the band. The season table above is the longer chase. The thresholds did not move with the ease, and the season gap was not soaked again. Closing it means making Speed worth more in a match, or a change large enough that Expansive stops reading as a wide game. Leon left it (25 Oct). #322 stays open.

Kick-chase is +4.3 against strength (standard error 1.5) and +2.8 at a level rating. Leon accepted that (25 Oct) and the preset was not moved. Its even matches are 52.3% after the ease. The season edge is the half with Big Boot or Playmaker. All-out's level-rating row is 32 sides; the strength measure, on 357 sides, is inside 4 points.

### Open tuning items

Out of scope for this pass (Leon, 25 Oct). Spread, the home edge, the stamina slope and the error knobs were not moved. The gap and the legs rows are `balance/runs/20261025-140642-loose-ends`, on the longer chase.

| Item | What it says | Left because |
|---|---|---|
| Completion | 69.3% on the longer chase (even, 80 seeds); 70.8% once the chase was eased (80 seeds). Preset rows on the longer chase sat at 68–72%. | Inside or on the 70–80% band after the ease. An error-knob change would move the preset win rates. Not chased further. |
| 20-point gap | 70 v 50, the stronger side wins 69% (3% drawn, 80 seeds). Standard error about 5 points. | The plan's "about 70%". `rating.spread` was not moved. A bigger block is Leon's if he wants it tighter than 5 points. |
| Home edge | Even home side wins 49% (5% drawn) on that same row. The eased even row is 53% (80 seeds). | No `rating.homeEdge` was added. The size, and rating points rather than a crowd effect, are still open. The ask was 52–58%. |
| Legs, the slope | Stamina 30 v 80: the tired side wins 38% (40 seeds). | The slope and the cruise knobs were kept. The target margin is open. |
| Legs, fliers | Fliers win 48% and break the line 22 times to the even row's 16. | The direction is the one the plan describes. Not retuned. |
| Repeat-set band | 0.08 a match, inside 0.05–0.30. | The band itself was set in this pass. Leon has not signed the edges. |
| Drop-out band | 0.00 a match, inside 0–0.15. | A grounding and a kick that dies are 20 m restarts, not drop-outs. The band's top is open. |
| Tracking issues | Grubber tries now sit in 0.2–0.5, which #68 and #99 were waiting on. | The sign-off rewrite and closing #68, #99 and the other tracking issues are still Leon's. |

Kick-chase at +4.3 against strength is accepted (Leon, 25 Oct) and is not in this list. Expansive's season rate stays on #322.

### Economy, first cut (longer chase, before wildcard events)

This table is the longer chase only, measured before `beea9e9` added wildcard events. The shipped soak, with the eased chase and those events, is the next section.

Same command as the shorter-halves soak: `npm run soak -- --difficulties easy,normal,hard --jobs 4`. 20 seeds × 5 seasons × idle and managed × Easy, Normal and Hard, plus the old saves. **139 runs, no problems, forfeits none.** About 16 minutes on 4 jobs. Prize, ticket and the difficulty factors were not moved.

Season 5, clubs still going. Money is the balance at the rollover. "Before" is the shorter-halves soak in the section above.

| | Record | Pos | Top 8 | Prem | Sack | Money | Before |
|---|---|---:|---:|---:|---:|---:|---:|
| idle Easy (19) | 15.2-1.4-7.4 | 3.6 | 95% | 32% | 5% | $1,341k | $1,200k (20) |
| managed Easy (20) | 20.2-0.3-3.5 | 1.1 | 100% | 70% | 5% | $1,073k | $1,040k |
| idle Normal (12) | 13.1-1.2-9.8 | 6.4 | 67% | 0% | 33% | $762k | $871k (12) |
| managed Normal (16) | 17.5-0.6-5.9 | 1.7 | 100% | 50% | 19% | $617k | $556k (18) |
| idle Hard (5) | 14.0-1.8-8.2 | 3.0 | 100% | 20% | 80% | $936k | $792k (4) |
| managed Hard (10) | 17.1-0.7-6.2 | 3.4 | 80% | 20% | 40% | $218k | $312k (14) |

The season-5 column is the clubs that lasted. Idle Hard's $936k is five clubs. Across all 20 careers, money at the end of the run (a sacked club at the season it stopped) is idle Easy $1,281k, Normal $511k, Hard $174k, and managed Easy $1,073k, Normal $479k, Hard $104k. Easy richer than Normal richer than Hard, both ways.

A career in the red finished its last season below zero.

| | Before | After |
|---|---:|---:|
| idle Easy | 0/20 | 0/20 |
| managed Easy | 1/20 | 1/20 |
| idle Normal | 2/20 | 3/20 |
| managed Normal | 2/20 | 7/20 |
| idle Hard | 14/20 | 13/20 |
| managed Hard | 8/20 | 10/20 |

Managed Easy is on the cap of 1 in 20. Managed Normal's red share went from 2 to 7 on this cut. Leon (25 Oct) will not ship that. The cause and the eased chase are in "Why a managed club finished poorer" above. Prize and the ticket were not moved.

### Economy, eased chase, with wildcard events

The shipped game. Events from `beea9e9` are in, and the chase starts inside 24 m with a 3 m lead. Same command, **140 runs** (the v21 save adds one old version), **no problems, forfeits none.** Prize, ticket and the difficulty factors were not moved. Main alone, with those events and no chase, is 5 of 20 managed Normal careers in the red.

Season 5, clubs still going. "First cut" is the longer chase without events, in the section above. "7:00" is the shorter-halves soak.

| | Record | Pos | Top 8 | Prem | Sack | Money | First cut | 7:00 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| idle Easy (19) | 14.7-1.4-7.9 | 4.2 | 84% | 16% | 5% | $1,279k | $1,341k (19) | $1,200k (20) |
| managed Easy (19) | 20.6-0.6-2.8 | 1.2 | 100% | 53% | 0% | $749k | $1,073k (20) | $1,040k |
| idle Normal (14) | 11.9-1.1-11.1 | 7.7 | 57% | 14% | 43% | $698k | $762k (12) | $871k (12) |
| managed Normal (17) | 19.2-0.5-4.4 | 1.3 | 100% | 71% | 6% | $587k | $617k (16) | $556k (18) |
| idle Hard (3) | 16.0-1.7-6.3 | 3.3 | 100% | 0% | 33% | $906k | $936k (5) | $792k (4) |
| managed Hard (9) | 18.4-0.6-5.0 | 1.4 | 100% | 44% | 0% | $298k | $218k (10) | $312k (14) |

Across all 20 careers, money at the end of the run is idle Easy $1,237k, Normal $511k, Hard $89k, and managed Easy $723k, Normal $494k, Hard $131k. Easy richer than Normal richer than Hard, both ways.

| | 7:00 | Longer chase | Shipped |
|---|---:|---:|---:|
| idle Easy | 0/20 | 0/20 | 0/20 |
| managed Easy | 1/20 | 1/20 | 1/20 |
| idle Normal | 2/20 | 3/20 | 4/20 |
| managed Normal | 2/20 | 7/20 | 3/20 |
| idle Hard | 14/20 | 13/20 | 14/20 |
| managed Hard | 8/20 | 10/20 | 8/20 |

Managed Easy is on the cap of 1 in 20. Managed Normal is on the cap of 3 in 20 (two of those three finished $2k and $5k under; the next career finished $26k up). That is the number Leon set once events were on main.

## N13

The live match sim's knobs, measured with the harness (`npm run balance`, `balance/README.md`).
N13 item 1 is the presets. N13.5 is the break rule (below). Grubbers, the season styles,
the economy and the rows left open are in "Grubber chase and season styles" above.
Grubbers and Grind's season are in. Expansive's season rate stays on #322. The
rest is under "Open tuning items".

N15.4 (traits you can see) adds an optional `toSlot` on a cut-out event in `src/match/league/live.ts`
(this plan's file): the receiver's slot, so the view can draw the line. The sim does not
read it, no dice changed, and that line did not move the golden match. The 25 Oct cut above did.

Every decision taken without a fresh word from Leon is marked **Assumed (needs Leon)**.

## N13.5 The break rule (24 Oct, #316)

The rule is in the sim and off unless a match names the sides. A player watching a
match sees nothing new until N14 turns it on for the rival. Full knobs and the
assumed choices: tuning §30. Short version, even 60 v 60, 200 seeds both ways,
wins on points:

The side that has the rule wins **50.2%** (6.5% drawn). That is inside two
standard errors of even (about 5 points at 400 matches), so the rule alone is
not the 8-point edge N12.2 used for difficulty. N14 should turn Hard's AI coach
on, and leave Normal and Easy off. **Assumed (needs Leon).**

Each preset against Balanced or Slide, with the rule on the other side:

| Preset | No rule (N13.1) | Rule on the rival |
|---|---:|---:|
| Grind | 49.2% | 48.3% |
| Expansive | 46.2% | 45.3% |
| Kick-chase | 46.5% | 48.8% and 45.5% |
| All-out | 54.8% | 51.2% |
| Rush | 49.8% | 46.8% |
| Compressed | 49.0% | 49.0% |

Kick-chase at the old step (0.9) won 43.0% on seeds 1–200 and 41.8% on seeds
10001–10200, both under the band (pool 42.4% over 800). Step 1.0, which is
Balanced's step, wins 48.8% and 45.5% on those same blocks (pool **47.2%**).
Kicks stay about 24 a match and the bomb bias is unchanged. Kick metres on
seeds 1–200 fell 22.6, beyond luck. The other presets were left on the N13.1
tables. **Assumed (needs Leon):** the thresholds (8 down at half-time, two
tries in a row, 12 up after minute 15), Kick-chase opening to Expansive and
tightening to Grind, Compressed as the tight defence, a conceded run beating a
late lead, and this step.

Runs: `20261024-134002-break-rule`, `20261024-135701-kick-chase-step-confirm`,
`20261024-135245-kick-chase-step`. The plan is `balance/plans/break-rule.json`.
The golden even match is unchanged, because no side in that match is given the
rule. N14 turns the rule on for rivals. N14.2's season (10 seeds × 3, Normal,
10,354 rival games) changed a plan 2.51 times a match. At a level rating Grind
was +5.7 and Expansive −6.9; against strength Expansive −5.7, Kick-chase +4.5,
All-out +5.3. The 25 Oct section above is the remeasure. Compressed, which was
+6.4 before the rule, is +0.1 here. No preset was moved.

## N13.1 Presets back in balance (24 Oct)

The stopped branch `match/presets-balance` was never on the remote. The local commit it
would have held (a scenario's own match count, a tracked side, both ways round, and a
golden Balanced / Slide match) is on this branch instead, and the numbers below were
measured with it.

**The band.** Each tactical preset wins 45–55% of even matches against Balanced (attack)
or Slide (defence). **Assumed (needs Leon):** the band itself, from the N13 plan, and the
table values that land inside it. Styles should still read as their names. Calls and the
AI coach are off. Even 60-rated sides, whole matches, 200 seeds each way (400 matches;
one standard error about 2.5 points). Wins are on points; a draw is not a win.

Before is `20261024-061333-presets-before` on `35afd04` (home and away played as separate
rows, then pooled). After is `20261024-063629-presets` (`balance/plans/presets.json`).

| Preset | Before | After | Inside 45–55% |
|---|---:|---:|---|
| Grind | 49.2% | 49.2% | yes, unchanged |
| Expansive | 35.0% | 46.2% | yes |
| Kick-chase | 46.5% | 46.5% | yes, unchanged |
| All-out | 38.0% | 54.8% | yes, the top of the band |
| Rush | 57.2% | 49.8% | yes |
| Compressed | 64.0% | 49.0% | yes |

Draws after, same 400 matches: Grind 6.0%, Expansive 5.8%, Kick-chase 6.0%, All-out 3.8%,
Rush 3.8%, Compressed 5.2%.

**What moved** (`src/match/league/presets.ts`, spec §5.1–5.2, tuning §8):

- Expansive: pass +0.15 → 0, cut-out 0.08 → 0.02 (own 20 0.03 → 0.01), width 0.35 → 0.28, early kick 0.30 → 0.18.
  Offload stays ×1.3 and the edges stay +0.8, so it still throws more than Grind.
- All-out: pass +0.15 → 0, offload ×1.6 → ×1.5, cut-out 0.12 → 0.03, width 0.45 → 0.35,
  early kick 0.30 → 0.15. It still offloads the most.
- Rush: line speed 6.5 → 6.2 m/s. Busts stayed at +0.11. A tenth more (0.115) already
  dropped the win rate to about 45%, and 0.13 to about 42%, so the line speed is the lever
  that lands near half without giving up the rush.
- Compressed: pull ×1.4 → ×1.1, markers ×1.2 → ×1.05, busts −0.04 → −0.02, and
  step-against −0.02 → +0.03 so the open edges can be stepped. Line speed stays 4.5.
- Grind and Kick-chase were already inside the band and were left alone.

**They still play like their names** (after, counts are both sides, the matchup as written):

| Preset | Offloads | Kicks | Breaks | Big hits | Completion |
|---|---:|---:|---:|---:|---:|
| Grind | 5.7 | 24.2 | 57.0 | 26.3 | 71.5% |
| Expansive | 11.4 | 22.2 | 58.6 | 27.1 | 68.3% |
| Kick-chase | 8.0 | 24.0 | 58.5 | 26.4 | 70.3% |
| All-out | 13.0 | 21.7 | 60.0 | 26.8 | 68.8% |
| Rush | 10.3 | — | 80.5 | 33.8 | — |
| Compressed | 7.9 | — | 58.8 | 25.8 | — |

A Grind side that changes to Expansive at half-time offloads more than one that stays
(5.9 → 8.6 over 40 matches, same plan). The golden even Balanced / Slide match (seed 1)
is unchanged: `8-14:495:67db8b634c5a2e73`.

The standard plan carries the same six rows at 100 seeds both ways, so the next match-code
change reports the band again. Rival-style results over a whole season are N14.2, not this
item.

**Open.** All-out at 54.8% is the seeds 1–200 block, inside the band and within a point of
the top of it. That block is the high one, not the rate. The same tables on later blocks of
400 matches: seeds 201–400 **48.5%**, 401–600 **45.5%**, 601–800 **49.0%**, and an
independent block on seeds 10001–10200 **43.8%** (below the band). Pooled, 966 wins in
2000 matches, **48.3%** (one standard error about 1.1 points). All-out sits near the middle.
A single block of 400 can still print outside 45–55%; it did not print above 55% on the
fresh seeds. The knobs were left as the sign-off set them: chasing the low block up would
aim a 48% rate at the top of the band. Expansive and Kick-chase sat near 46% on seeds
1–200 (49.8% and 47.5% on seeds 10001–10200). Softer Expansive was not pushed further on
the sign-off pass. Own 20's cut-out had been left at 3% after the base came down to 2%, so
an Expansive side cut out more from its own 20 than anywhere else; it is 1%, under the base.
Remeasured after that, Expansive won 46.5% on seeds 1–200 and 49.5% on seeds 10001–10200.
