# NRL Sim: Card week specs

27–28 Nov 2026 · @Le · decisions D1 to D34

## Status and how to use this

**Most of this is approved and filed as GitHub issues.** Build only from the issues; this file is the background they link to and the record of Le's decisions (D1 to D34, below). The file keeps its `-draft` name because the issues link to it.

- **Filed, batch 1** (the pick and fatigue; stop here for Le's playtest): #852, #853, #854, #855, #856, #862, #857, #858, in that order.
- **Filed, batch 2** (after the playtest): #866, #868, #869, #870, #871, #872, #874, #875, in that order.
- **Parked, not filed:** the stadium, plots, neighbour bonuses and the saving shelf (Spec 4 below the blueprint step).
- **Pinned, not filed:** gear (D34).

Where an issue and this file disagree, the issue wins. Every number is a starting value to playtest.

Parent: Notion page *NRL Sim — Cards, collections and branching careers*. Section 24 is the design background; section 25 mirrors the decisions and issue list in this file. Where this file and section 24 disagree, this file holds the newer decision. Section 23 (opening pack and album) is unchanged and out of scope here. What is in the game today is described in `docs/specs/846-card-week.md`.

Each spec has the same parts: what the player experiences, the rules, what exists in the game today, done when, and open questions. Labels used throughout:

- **Today**: in the game now (checked against main `329fd4fc`, save version 39).
- **New**: does not exist yet.
- **Proposal**: a starting number to playtest, not a balanced value.

Every agent prompt starts with: read AGENTS.md, CLAUDE.md and docs/hub before touching code.

## What changed in revision 2

Revision 1 was checked against the repo on 27 Nov. Le's decisions D1–D9 are untouched. These proposals and gaps changed. Two were changed again later: weekly recovery is 20, not 30 (D30), and the player-card fee is flat by tier, not half the free-agent fee (D10).

1. **Based on #850, not #849.** Strikes, the Decree and team-sheet bonuses are in the game, and the save version is 39.
2. **Fatigue recovers every week.** Revision 1 only recovered in a week without playing, so a starter hit 90 by round 3 with no event entered. Now League alone nets zero and each event adds a debt (Spec 5).
3. **Rivals do not tire, and strikes are in play.** Spec 5 says so and the balance run checks it.
4. **Slice 1 is split.** 1a tests the offer and fatigue with player cards still free. 1b adds the money rule.
5. **The bots get a card policy.** The persona bots have no card logic today, so the balance run needs one first.
6. **Starter picks keep 1 each,** so three picks put 3 cards in a 5-card hand, not 6.
7. **Staff card generators are sequenced.** Welfare manager and attack coach in Slice 2; assistant coach and analyst wait for their card types in Slice 3.
8. **A neighbour pair changed.** The Grandstand becomes the stadium, so "Canteen beside Grandstand" became "Canteen beside Sponsor Board".
9. **Recovery cards have a hold limit,** so they can't be hoarded to switch fatigue off.
10. **Card-player fees are worked out** (Spec 3). Half the free-agent fee is about one home match's income in Local.

## Decisions so far

Le has set the direction: cards run most of the career week, tested first behind a Labs switch. The table separates what Le decided from what is still open.

| # | Decision | Who | Date |
| --- | --- | --- | --- |
| D1 | No "steal a card from the club you beat" | Le | 27 Nov |
| D2 | Each week you are shown cards and keep a set number | Le | 27 Nov |
| D3 | Cards come in categories (players, facilities, traits, training, recovery, boosters, sponsors, gear, staff, special) | Le | 27 Nov |
| D4 | Facilities move from free build to fixed plots around an upgradable stadium | Le | 27 Nov |
| D5 | Bonus events plus weekly fatigue create the core dilemma: rest a star or play him in the event | Le | 27 Nov |
| D6 | Players and facilities: the card unlocks it, cash pays for it. You may need to save up before you can play it | Le | 27 Nov |
| D7 | Free agency stays, and still costs a cash signing fee | Le | 27 Nov |
| D8 | Salary cap still pays wages, including card players | Le | 27 Nov (option C) |
| D9 | First test proves the weekly offer plus the fatigue-versus-event choice. Stadium, gear and sponsors follow if it is fun | Le agreed direction | 27 Nov |
| D10 | A player card costs a flat fee by tier, in multiples of the league's match base: Common 1×, Rare 2×, Gold 3× ($8,000, $16,000 and $24,000 in Local). Final multiples are set from the balance runs (#858, #870) | Le | 27 Nov |
| D11 | The saving shelf waits for Slice 2, when facilities make cards dear enough to need it | Le | 27 Nov |
| D12 | A released card player joins the free-agent pool like any other released player | Le | 27 Nov |
| D13 | Card players sign for the rest of the season, the same as free agents | Le | 27 Nov |
| D14 | A card's colour is its family and its word is its type (#851's types: Player, Staff, Trait, Facility, Specialty, Fatigue relief, Booster) | Le | 27 Nov |
| D15 | Slice 1a is judged in two steps: the bot report (#858), then Le plays a season to round 10. The friend playtests only after Le has | Le | 27 Nov |
| D16 | No limit on cards played per week during testing | Le | 27 Nov |
| D17 | Three tiers: Common, Rare and Gold (#851), replacing grey and gold | Le | 27 Nov |
| D18 | Everything carries into the next season: hand, card levels, waiting picks and fatigue. Only the Decree expires and strikes reset, as today | Le | 27 Nov |
| D19 | For the first testing round, the cards in a pick are drawn by chance as today, with no guaranteed mix of families. Revisit after the playtest | Le | 27 Nov |
| D20 | The facilities rework (one plain benefit per facility) is done first, as its own piece, before the stadium | Le | 27 Nov |
| D21 | Plots sit in a ring around the stadium; each touches the plot on either side | Le | 27 Nov |
| D22 | A new card-week career starts holding two blueprints; the rest come by chance | Le | 27 Nov |
| D23 | Stadium upgrades cost 5×, 10× and 20× the league's match base ($40,000, $80,000 and $160,000 in Local) | Le | 27 Nov |
| D24 | Staff handing you cards ships straight after Slice 1a as its own piece (#862), welfare manager and attack coach first | Le | 27 Nov |
| D25 | Boosters are played before kick-off and last the next match. In-match boosters (#851) are a later experiment of their own: revisit after Slice 3 | Le | 27 Nov |
| D26 | Training cards add on top of the automatic weekly training; nothing is removed | Le | 27 Nov |
| D27 | Gear is a trait you can move between players, one slot each. Built last in Slice 3 | Le | 27 Nov |
| D28 | Sponsors are deal cards with a condition and a payout, one deal active at a time | Le | 27 Nov |
| D29 | The cap booster card gives one level of the three-level cap upgrade. Gold tier. Correction, 27 Nov: the game does not sell that upgrade. Its rules exist (a level field and a price) but nothing grants a level, so this card is the first way to get one (#872) | Le | 27 Nov |
| D30 | Weekly recovery is 20, not 30, and Physio Centre and Medical Bay add 2 each, not 5. Resolves Codex's finding on #854 that every bonus event falls in a week with no League match for that player | Claude, on Le's instruction to resolve #854 | 27 Nov |
| D31 | Facilities by card starts small: in a card-week career a facility needs its blueprint card before it can be built (#866). The four facilities open today from the start stay open, which replaces D22. The stadium, plots, neighbour bonuses and shelf (D11, D21, D23) are parked until after it. The facilities rework (D20) no longer blocks blueprints, only the stadium | Le | 27 Nov |
| D32 | A booster is a big lift to one stat for one player for one match (+10, +15, +20 at Levels I to III), for example a winger's speed. It sits outside the 8-point team-sheet bonus limit (#874). The in-match, minute-long version (D25) stays on the list to revisit, and is the likely fix if a whole match proves too strong | Le | 27 Nov |
| D33 | Sponsors start with three deals, one running at a time, no penalty for failing: Winning run, Cup night and Young guns (#875) | Le | 27 Nov |
| D34 | Gear is pinned until Le has played Slice 1a | Le | 27 Nov |

**Still open:** whether training adds fatigue; whether an away event should tire a player as much as a match; a guaranteed mix of families in each pick (revisit D19 after the playtest); gear's rules (D34); the in-match booster (D25, D32); and everything about the stadium (plot counts, moving or demolishing, neighbour bonuses, the shelf).

## Spec 1: Weekly offer and hand

After each League match you see a row of cards and keep two. Cards wait in your hand until you play them, and cards you are saving cash for sit on their own shelf so they never block the hand.

**Today (Labs, PRs #847–#850):**

- After each League match you pick 1 of 3. A card can be taken into the hand or played straight from the pick.
- A new career starts with 3 picks waiting. Up to 3 unused picks can wait; a fourth replaces the oldest.
- The hand holds 5. A full hand refuses a take until you play or discard.
- A reroll costs $1,500, rising $1,500 each time that week.
- After a win, one option comes from the beaten club (the steal).
- Cards level I to III when you take a duplicate.
- After the fifth League match, one pick offers 3 of 6 Decrees. A Decree lasts the rest of the season.
- A League loss by 24 or more, or a third loss in a row, is a strike. A strike costs one board patience.

**Changes**

1. **Remove the steal (D1).** Beaten clubs no longer supply a card. A career already holding a stolen card keeps it and can still play it.
2. **Show more, keep more (D2).** Proposal: show 5, keep 2. Both numbers are tuning values Le can change. "Keep" means take into the hand or play straight away, as today.
3. **Starter picks keep 1 each (new in revision 2).** The three picks before round 1 show 5 and keep 1, so a new career starts with 3 cards and two free hand slots.
4. **A full hand still refuses a take.** With one free slot, you keep one card and play or pass the other.
5. **The Decree pick is unchanged:** 3 of 6, adopt one.
6. **No limit on plays per week** in the test (D16). The offer is the limit. Revisit only if players hoard and dump.
7. **Saving shelf (new, Slice 2, D11).** Two slots, separate from the 5-card hand, for priced cards you can't afford yet (Spec 2). A shelved card shows how much more cash you need.
8. **Cards never expire** in the hand or on the shelf. Unused picks still expire as today.
9. **Rerolls stay** as a cash sink, same prices.

**Done when**

- [ ] No offer in a new card-week career ever includes a card from a beaten club.
- [ ] A match pick shows 5 cards and lets the player keep exactly 2, then closes.
- [ ] Each of the three starter picks shows 5 and lets the player keep exactly 1.
- [ ] A priced card the player can't afford can go to the shelf; a third one is refused with a plain reason.
- [ ] A shelved card shows "Need $X more" and becomes playable the moment cash allows.
- [ ] Saving, reloading and reopening never changes an offer or grants a pick twice.
- [ ] An existing card-week save (v38 and v39 fixtures) loads with its hand, levels, Decree, strikes and any stolen cards intact.

**Open:** should bonus event matches (Spec 5) also earn a pick, or only League matches? Recommended: League only. A pick for entering an event pays the player for the choice that is meant to cost him.

**Watch:** keeping 2 of 5 roughly doubles how fast duplicates level a card to III. The balance run checks it.

## Spec 2: Card families and the money rule

Every card belongs to one of four colour-coded families, and every card face shows its price before you keep it. Players and facilities cost cash to play; matchday cards are free, so a broke week still has decisions.

**Today:** seven card kinds (player, staff, set play, trait, cash, the "Marquee gamble" dilemma, and Decree) in two tiers, grey and gold. Player cards join with no signing fee; staff cards waive the appointment fee; set plays are free. The cash card pays $15,000.

**Tiers (D17).** Three tiers replace today's two: Common (today's grey), Rare (new) and Gold. Proposal for the new middle tier: a Rare player is generated +10 above the club's best at his position (Common +4, Gold +18) and costs 2× match base (Common 1×, Gold 3×, D10). This lands with the card-face work in Slice 1b, not in 1a.

**Families (D3)**

| Family | Cards | Plays for | Status |
| --- | --- | --- | --- |
| Squad | Players, traits, gear | Players: cash fee + wage on cap. Traits: free. Gear: priced (later) | Players, traits today; gear new |
| Club | Facility blueprints, staff, set plays, sponsors | Blueprints: cash build cost + a free plot. Staff, set plays: free. Sponsors: pay you (later) | Staff, set plays today; rest new |
| Matchday | Training, recovery, one-match boosters | Free | New |
| Special | Cap booster, cash injection, Marquee gamble, Decrees | Free | Cash, gamble and Decrees today; booster new |

**The money rule (D6–D8)**

- **Cards are tickets for players and facilities.** Keeping the card gives the right; cash pays the price when you play it.
- **Everything else is free to play.**
- **The cap pays wages**, for card players and free agents alike.
- **Cash pays for:** player-card fees, free-agent fees, facility builds and levels, stadium upgrades, rerolls.

**Card face (new)**

- Family colour, the card's type as a word (D14), and tier. Types follow #851: Player, Staff, Trait, Facility, Specialty, Fatigue relief, Booster. Cards #851 does not name keep their own word: Set play, Cash, Decree, Injury repair.
- One-line effect, about 12 words at most, with both the % and the flat number where relevant.
- Price badge: "Free" or "$X to play". Player cards also show wage and whether it fits under the cap now.
- A "Good if…" hint, for example "Good if your halfback has Playmaker". Today's cards already carry a hint per kind.

**Done when**

- [ ] Every card in the catalogue has a family and a type, and the offer screen shows the family by colour and the type as a word (never colour alone).
- [ ] A player card costs its cash fee when played and is refused with "Need $X more" when cash is short.
- [ ] A matchday card can be played with $0 in the bank.
- [ ] Every card face shows its price before the player keeps it.
- [ ] The persona bots can still play a full season with the new prices (balance harness runs).

**Open:** stay with free matchday cards (recommended), or price the strongest boosters?

## Spec 3: Player cards versus free agency

A player card is the cheaper, better route to a signing; free agency is the route to exactly who you want. Both cost cash up front, so the card needs a clear edge or it is the same thing in two places.

**Today:** a free agent's fee is one year's wage up front (a quarter of that for an Academy prospect), and each Scout Office level takes 10% off. A card player is generated above the club's best natural player at that position (grey +4 overall, gold +18) and pays no fee. Both a free agent and a card player sign for the rest of the season. When the squad or cap is full, the card names the player he replaces and the release payout.

**What the fee comes to.** From the wage curve in `src/data/financeRules.ts`, for a 25-year-old with no Scout Office:

| Overall | Wage a year | Free-agent fee | Half that (revision 2's proposal, replaced by D10) |
| --- | --- | --- | --- |
| 45 | $15,500 | $15,500 | $7,750 |
| 50 | $17,000 | $17,000 | $8,500 |
| 55 | $18,500 | $18,500 | $9,250 |
| 65 | $25,500 | $25,500 | $12,750 |
| 75 | $40,500 | $40,500 | $20,250 |

For scale: a Normal career starts with $60,000, Local's match base is $8,000 (before home, result and sponsor money) and the Local cap is $350,000 a year. Half-fee made a gold player (+18 over your best) only half as dear again as a grey one (+4), so D10 replaces it with a flat fee by tier. Even at 3× match base, saving up for a player is a wait of a few weeks at most.

**Changes**

1. **Card players pay a flat fee by tier (D6, D10).** Common costs 1× the league's match base, Rare 2× and Gold 3×: $8,000, $16,000 and $24,000 in Local, $12,000, $24,000 and $36,000 in Championship, $18,000, $36,000 and $54,000 in Premier (#869). The Scout Office discount does not apply. Both multiples are tuning values, set finally from the #858 run.
2. **Card players are exclusive until signed.** They never appear in the free-agent pool before the card is played. Once released, a card player joins the pool like anyone else (D12).
3. **The quality floor stays.** A card player always beats your best natural player at his position.
4. **Free agency is unchanged (D7):** full fee, your choice of player, available any week the Recruit screen is open. Card players sign for the rest of the season, the same as free agents (D13).
5. **Print the deal on the card:** position, overall, age, wage, contract length, fee, and whether he fits under the cap today. When he replaces someone, the card shows the fee and the release payout as one total.

**Done when**

- [ ] Playing a grey player card deducts 1× the league's match base and a gold one 3×, and the card shows the sum first.
- [ ] A released card player appears in the free-agent pool.
- [ ] No card-generated player appears in the free-agent list before his card is played.
- [ ] Every card player still beats the club's best natural player at his position.
- [ ] A card player who would break the cap is refused with the wage gap shown, never silently signed.
- [ ] Free-agent fees and the Scout Office discount behave exactly as today.

**Open:** the final fee multiples, after #858. Revisit a longer deal for card players only if cards don't feel better than free agency in the playtest.

## Spec 4: Stadium and facility plots

The club ground becomes a stadium ringed by a fixed number of plots. A blueprint card lets you build a facility, cash pays for it, and upgrading the stadium opens more plots. This is the main cash sink, and it belongs to Slice 2, after the weekly offer and fatigue prove fun (D9).

**Today:** free build on a 20 × 20 tile grid. There are 12 facilities (Training Paddock, Weights Room, Video Room, Physio Centre, Canteen, Sponsor Board, Grandstand, Academy, Coach's Office, Scout Office, Medical Bay, Team Gym), each levelling 1 to 3 with weekly upkeep. Level-one builds cost $8,000 to $60,000. They unlock through season one. The Grandstand already grows the match-day ground.

**First step (D31, #866): blueprints only.** A facility can be built only after its blueprint card is played. Playing it is free and permanent; building costs today's price on today's free-build grid. Training Paddock, Weights Room, Canteen and Sponsor Board stay open from the start; the other eight need a blueprint. A played blueprint leaves the pool. Everything below this line is parked until Le has played with blueprints.

**Changes (card-week careers only), parked**

1. **Plots replace free build (D4).** Plots sit in a ring around the stadium, and each touches the plot on either side (D21). Proposal: stadium level 1 has 4 plots, level 2 has 6, level 3 has 9. With 11 facilities left to place, a club can never build everything; that is the intent.
2. **The Grandstand becomes the stadium.** It sits in the middle and takes no plot. Upgrading it opens plots as well as growing the crowd. Upgrades cost 5×, 10× and 20× the league's match base (D23): $40,000, $80,000 and $160,000 in Local. The unused cap-upgrade price in the finance rules uses the same multiples.
3. **Blueprints replace the season-one unlock ladder.** A facility can't be built until you have played its blueprint card. Then you pay today's build cost. A new career starts holding two blueprints (D22), so round 1 has something to build; which two is open.
4. **Duplicate blueprints** make that facility's next level cheaper. Proposal: 25% off.
5. **Neighbour bonuses (new).** Start with three named pairs, shown as a line between plots: Physio Centre beside Medical Bay (faster recovery), Canteen beside Sponsor Board (more match-day income), Weights Room beside Team Gym (bigger strength gains).
6. **Upkeep stays** as today.

**After the facilities rework (D20).** Le's current focus is making facility benefits clear. Every facility gets one visible, plain benefit first, as its own piece of work with its own spec. The stadium is built after that, not alongside it.

**Done when**

- [ ] A new card-week career shows a stadium with 4 empty plots and no free-build grid.
- [ ] A facility can only be placed after its blueprint card is played, and placing it charges the build cost.
- [ ] Upgrading the stadium charges cash and opens the next plots.
- [ ] Each neighbour pair shows its link and its bonus in numbers when both are built side by side.
- [ ] Existing non-card careers keep free build exactly as today.

**Open:** plot counts per stadium level; which two blueprints a career starts with (fixed, or the player's choice); whether a facility can be moved or demolished; which other facility pairs make good neighbours.

## Spec 5: Weekly fatigue and the event dilemma

Players carry tiredness from week to week. League matches in back-to-back weeks build it up and a week off clears it. Play your star in the Open Cup tie that falls in that week off and it does not clear: he carries 20 until he sits a League match out or you spend a recovery card. This is the heart of the first Labs test (D5, D9) and needs a new system: weekly fatigue does not exist today.

**Today:**

- Fatigue only exists inside a single match. Every player starts every match at full energy.
- Injuries carry over (weeks out). Every player has an injury-risk stat; the match rolls an injury on a big hit using the value on the team sheet.
- A player away at an event can't play a clashing fixture.
- The calendar (the first pacing profile; it is saved data, so do not hard-code weeks):
  - Trials in weeks 1 and 4.
  - League rounds in weeks 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, then 20 to 23 in a row. Finals in weeks 24 and 25.
  - Weeks 7, 10, 13, 16 and 19 have no League round. They are the Open Cup slots, and a rest week for a club that is out of the Cup or did not enter.
  - Skills Camp takes a player away in week 5, and the two individual challenges in weeks 6 and 14. Each costs him that week's League round.
- So **every bonus event falls in a week when that player plays no League match.** Codex found this on #854; revision 2's numbers assumed the opposite.
- Rival clubs' team sheets are built fresh each match and carry nothing from week to week.

**Changes (card-week careers only)**

1. **Weekly fatigue (new).** Every player in your squad has fatigue from 0 to 100, shown as a bar on Squad, Lineup and event entry.
2. **What adds it.** Proposal: a full League match +30, off the bench +15, a bonus event +20.
3. **What removes it (D30).** Proposal: every player recovers 20 at the start of each week, whatever he did the week before. No special cases. Physio Centre and Medical Bay each add 2 to that. At 30 a week every bonus event was wiped before the next League kick-off; at 5 each the two facilities together cancelled a League match exactly and fatigue disappeared.
4. **What it does.** A tired player starts the match with less energy, using the in-match energy that already exists. Proposal: 0.4% less per point, so fatigue 50 starts him at 80%. Above 60 his injury chance rises by half; above 80 it doubles.
5. **The preview.** Entering a player in an event shows the cost before you confirm, for example "Fatigue 20 → 40. Kicks off Round 6 on 20, at 92% energy." The kick-off figure is after the weekly recovery.
6. **Recovery cards** in the Matchday family, free to play: *Fatigue wipe* (one player to 0), *Ice baths* (whole squad −30), *Injury repair* (one player −2 weeks out).
7. **Recovery cards have a hold limit (new in revision 2).** Proposal: the hand holds at most 2 recovery cards. A third can be played at once or passed, not kept.
8. **Rivals do not tire.** Only your squad carries fatigue. It can only cost you, never a rival, so the numbers must be gentle enough that a careful player loses nothing against today's game.
9. **Match randomness unchanged.** Fatigue is written onto the saved team sheet before kick-off as each player's starting energy and injury risk. It adds no dice roll, so a match still replays identically from its saved sheets.

**How the numbers play out (Proposal).** Fatigue at kick-off for a star who starts every League match, with no Physio Centre or Medical Bay:

| What he does | Kick-off fatigue |
| --- | --- |
| League, League, week off, League, League | 0, 10, 0, 10 |
| Plays the Open Cup tie in that week off | 20 and 30 in the next two rounds, and still 20 after the following week off |
| Plays three Cup ties running | 60 by the third: one more League match puts him in the raised-injury band |
| Away at Skills Camp or a challenge | 0 at his next League match. He missed a round, and that is the cost |
| Sits out one League match | 30 lower at the next kick-off than if he had played |
| The last four rounds and two finals, all in a row | 0, 10, 20, 30, then 40 and 50 in the finals |
| Fatigue wipe card | Back to 0 |

So the real rest-or-risk choice is the Open Cup tie: play the star and carry 20 that will not clear by itself, or rest him and weaken the Cup side. The run into the finals is the second pinch, and where recovery cards are worth saving.

**Across seasons (D18).** Fatigue carries into the next season like everything else. The weekly recovery keeps running in the weeks with no League round, so a player who sits out the off-season starts round 1 at 0 without a special reset. Pre-season trials count as bonus events.

**Strikes.** Strikes exist today. A tired side that loses by 24 or more, or three in a row, costs board patience. That is the real price of overplaying, so it must be visible: the event preview names the next League opponent.

**Done when**

- [ ] Every player in a card-week career shows a fatigue bar that changes after matches, events and the weekly recovery.
- [ ] A starter whose weeks run League, League, week off, League, League kicks off at 0, 10, 0 and 10; with an Open Cup tie in the week off, the next two kick-offs are 20 and 30.
- [ ] A player at 80+ fatigue is measurably more likely to be injured than one at 0, shown by a balance-harness plan (not an ad-hoc script).
- [ ] Event entry shows each player's fatigue change and next-match energy before the player confirms.
- [ ] Playing a Fatigue wipe card on a tired star resets him to 0 and his next-match preview updates.
- [ ] A third recovery card can't be kept and the screen says why.
- [ ] A saved match replays with the same result.
- [ ] Rival sheets and non-card careers are unaffected.

**Open:** the numbers above; whether training also adds fatigue; whether rested players should lose a little sharpness, so resting isn't always free. Whether an away event (Skills Camp, a challenge) should cost as much as a match: at +20 a player comes back from camp fresher than if he had played.

## Spec 6: Staff as card generators

Keep staff, but give each one a job you can see: every few weeks they add a card from their speciality to your offer. Staff become the way you steer what you're dealt, which replaces the steal as your lever on the deck.

**Today:** four roles (assistant coach, analyst, welfare manager, attack coach with a speciality per set-play family), one of each. Staff cards in Card week hire someone with the appointment fee waived; duplicates cut the weekly wage.

**Changes (card-week careers only)**

1. **Each role feeds one family.** Proposal: assistant coach adds a Training card, welfare manager a Recovery card, analyst a one-match Booster, attack coach a Set play from his speciality.
2. **Built in two steps.** The welfare manager and attack coach ship straight after Slice 1a as their own piece (D24, #862), because recovery cards and set plays exist by then. Training and Booster cards arrive in Slice 3, and the assistant coach and analyst start with them.
3. **How often.** Proposal: one extra card in the offer every 3 League rounds per staff member, marked "From your Welfare Manager". It still counts as one of the cards on show, not an extra keep.
4. **Existing staff benefits stay** as they are today, so nothing a career relies on disappears.
5. **Staff cards still hire** with the appointment fee waived, as today.

**Why not remove staff:** turning every staff benefit into cards would make each week's offer carry too many jobs, and the friend's playtest already found staff and facility benefits unclear. A staff member who visibly hands you a card is easier to understand than one who quietly changes a number.

**Done when**

- [ ] With a welfare manager hired, a Recovery card labelled "From your Welfare Manager" appears in the offer every third League round.
- [ ] Without that staff member, that family's cards appear only by normal chance.
- [ ] The offer size stays the same; a staff card replaces one random card.
- [ ] A staff-supplied recovery card still obeys the hold limit in Spec 5.

**Open:** every 3 rounds, or does a better staff member deliver more often?

## Later: gear, sponsors, training and boosters

These card types are wanted but are not needed to prove the loop. Each gets one clear job so it never becomes its own system.

- **Training (D26):** a small permanent gain to one stat for one player, for example +2 speed. Respects the 100 cap and the player's potential ceiling. It adds to today's training, which is automatic: players earn XP each week and from matches, and levels spend it by each player's focus. There is no Training screen to replace.
- **One-match boosters (D25, D32, #874):** a big lift to one stat for one player for the club's next match: +10 at Level I, +15 at II, +20 at III, played before kick-off. Four cards, one per shown stat. One booster per player per match, and it sits outside the 8-point team-sheet bonus limit. Never called "Fresh legs", which is already a coach call. **Revisit later:** #851's in-match booster, tapped during the match for about a minute of match time. It puts a new control on the match screen beside coach calls and live calling, so it is its own experiment, and the likely fix if a whole match at +20 proves too strong.
- **Gear (D27, pinned by D34):** a trait you can move between players, so when a star rests his gear can go to whoever replaces him. Its rules wait until Le has played Slice 1a, because how often players get rested should shape it.
- **Sponsors (D28, D33, #875):** a deal with a condition and a cash payout, one running at a time, no penalty for failing. Three to start, paid in multiples of the league's match base: Winning run (win 3 of your next 5 League matches, 2.5×), Cup night (win your next Open Cup tie, 1.5×) and Young guns (start two players aged 21 or under in each of your next 4 League matches, 2×). Cup night pulls against fatigue on purpose. Builds on nothing in the events deck; the Sponsor Board is unchanged.
- **Cap booster (Special, D29, #872):** raises the club's cap by one level, for good. The rules for a three-level upgrade exist in the finance code (5% of the league's cap per level: $17,500 a year in Local) but nothing in the game grants a level today, so this card is the first way to get one. Gold tier. Not offered at level 3. It is permanent, so a legal squad can't turn illegal.

## Build order and issues

Build in four slices, each playable on its own. Slice 1a answers the one question that matters first: is the weekly offer plus the rest-or-risk-him choice fun? Player cards stay free in 1a so the answer is about fatigue, not prices.

**Slice 1a: offer and fatigue** (Specs 1 and 5)

Approved and filed. Build in this order, one PR each, because they share files and save-version bumps.

1. #852: Remove the steal from Card week offers.
2. #853: Match picks show 5 and keep 2; starter picks show 5 and keep 1.
3. #854: Weekly fatigue: rules, team-sheet fields and save field (save version bump from 39, with a migration and load test).
4. #855: Fatigue bars on Squad and Lineup, plus the cost preview at event entry.
5. #856: Three recovery cards (Fatigue wipe, Ice baths, Injury repair) and the hold limit.
6. #857: Persona bots keep cards from each offer and rest tired players. Without this the balance run measures a bot that ignores the feature.
7. #858: Balance run with Card week on and off, using the persona bots. Reports League wins, strikes a season, injuries, and how many cards reach level III.

**Staff hand you cards** (Spec 6, D24): #862, built after #856. It does not wait for #857 or #858. With picks drawn by chance (D19), this is the player's one way to steer what he is dealt, so it should be in Le's playtest.

**Blueprints** (Spec 4 first step, D31): #866, built after #858 so the Slice 1a balance run measures fatigue alone.

**Slice 1b: the money rule** (Specs 2 and 3), after Le has played 1a

Filed, each built after the one before:

1. #868: Card faces show family, type, tier (Common, Rare, Gold) and a price badge. Built after #858 and #866.
2. #869: Player cards cost a flat fee by tier (D10) and stay out of free agency until played.
3. #870: Balance run with prices on.

**Slice 2: the stadium** (Spec 4), parked (D31). It follows blueprints (#866) and the facilities rework (D20), which needs its own spec first

1. Stadium with plots replaces free build in card-week careers.
2. Grandstand becomes the upgradable stadium.
3. Blueprint cards gate facilities; duplicates discount the next level.
4. Three neighbour bonuses.
5. Saving shelf: two slots for priced cards (D11).
6. Every new career starts holding two blueprints (D22).

**Slice 3: more card types** (Later section, D25 to D29). Filed: #871 training cards (with the assistant coach supplying them) and #872 the Cap boost card, built after #870. Then #874 one-match boosters (with the analyst supplying them) and #875 sponsor deals. Gear is not filed (D34).

Each numbered item is one GitHub issue with a plain "done when" taken from its spec. Every agent prompt starts: read AGENTS.md, CLAUDE.md and docs/hub first, and check open PRs touching cardWeek.ts, matchday.ts, lineup.ts or sheets.ts before starting.

## How Slice 1a is judged (D15)

1. **The bot report (#858)** says whether Card week makes a career easier, harder or the same, and whether fatigue is a tax.
2. **Le plays one season to round 10.** Proposal for the bar: in those 10 rounds Le hesitated over rest-or-play at least three times, and no pick felt like a chore.
3. **The friend playtests** only after Le has, with the same checklist.

## Risks and open questions

The biggest risk in Slice 1a is that fatigue only ever hurts the player, so a card-week career feels harder than a normal one for no reward. The biggest risk in Slice 1b is that saving up makes weeks feel like waiting.

| Risk | What it looks like | Check |
| --- | --- | --- |
| Fatigue is a tax | Card clubs lose more and take more strikes than normal clubs | Balance run, Slice 1a item 7: strikes a season, on against off |
| Fatigue is a chore | Players rest everyone every week, or ignore it | Track how often a star plays tired, and why |
| Recovery cards cancel fatigue | Nobody ever plays a tired star | Count recovery cards played a season; tune the hold limit |
| Waiting weeks | Shelf full, no cash, nothing worth playing | Count weeks with no card played in a test season (Slice 1b) |
| Cash still piles up | Players ignore money by mid-season | Ask at round 7: are you thinking about money? |
| Too many taps | The week takes longer than before | Time a week with Card week on and off |
| Power creep | Card clubs win the Local League every season; cards hit level III by mid-season | Balance run, Slice 1a item 7 |
| Parallel work | Two agents edit cardWeek.ts, lineup.ts or sheets.ts at once | Check open PRs before each issue |

**Open questions for Le**

Settled by approving Slice 1a (27 Nov), as starting values to playtest:

- [x] Split Slice 1 into 1a (fatigue, free player cards) and 1b (money).
- [x] Offer size and keep count: 5 and 2, with starter picks keeping 1.
- [x] Bonus events do not earn a pick in 1a.
- [x] Fatigue numbers: +30 League, +20 event, 20 back each week (30 until D30).
- [x] Recovery cards: hold at most 2.

Still open:

- [ ] Does training add fatigue? (Left out of 1a.)
- [x] Card-player fee: flat by tier, grey 1× and gold 3× match base (D10). Final multiples after #858.
- [x] Matchday cards are free: recovery, training and booster cards are filed as free to play (#856, #871, #874).
- [x] Staff deliver a card every 3 rounds, as a starting value (#862).
- [ ] Stadium plot counts: 4, 6, 9? (Parked with the stadium, D31.)
- [ ] Should an away event (Skills Camp, a challenge) tire a player as much as a match?
- [ ] Gear's rules (pinned, D34).
