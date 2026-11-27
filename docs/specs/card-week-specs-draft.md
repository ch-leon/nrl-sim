# NRL Sim: Card week specs (draft, revision 2)

Nov 27, 2026 · @Le

## Status and how to use this

**Slice 1a is approved** (Le, 27 Nov) and filed as issues #852 to #858. Everything else is still a draft for Le's review: not approved, Ready or built. These six specs turn the 26–27 Nov chat decisions into buildable pieces for the Card week Labs test. Build only from the issues; do not build Slice 1b, 2 or 3 from this file until Le approves them and their issues exist.

Parent: Notion page *NRL Sim — Cards, collections and branching careers*, section 24. Where this draft and section 24 disagree, this draft holds the newer decision (no steal, the money rule, stadium plots). Section 23 (opening pack and album) is unchanged and out of scope here. What is in the game today is described in `docs/specs/846-card-week.md`.

Each spec has the same parts: what the player experiences, the rules, what exists in the game today, done when, and open questions. Labels used throughout:

- **Today**: in the game now (checked against main `329fd4fc`, save version 39).
- **New**: does not exist yet.
- **Proposal**: a starting number to playtest, not a balanced value.

Once Le approves a spec, it becomes one or more GitHub issues. Every agent prompt starts with: read AGENTS.md, CLAUDE.md and docs/hub before touching code.

## What changed in revision 2

Revision 1 was checked against the repo on 27 Nov. Le's decisions D1–D9 are untouched. These proposals and gaps changed:

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

**Still open:** whether there is a limit on cards played per week; whether staff stay or become cards; whether matchday cards are free; gear's exact job; how a player card beats free agency.

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
6. **No limit on plays per week** in the test. The offer is the limit. Revisit only if players hoard and dump.
7. **Saving shelf (new, Slice 1b).** Two slots, separate from the 5-card hand, for priced cards you can't afford yet (Spec 2). A shelved card shows how much more cash you need.
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

- Family colour and tier.
- One-line effect, about 12 words at most, with both the % and the flat number where relevant.
- Price badge: "Free" or "$X to play". Player cards also show wage and whether it fits under the cap now.
- A "Good if…" hint, for example "Good if your halfback has Playmaker". Today's cards already carry a hint per kind.

**Done when**

- [ ] Every card in the catalogue has a family, and the offer screen shows it by colour plus a word (not colour alone).
- [ ] A player card costs its cash fee when played and is refused with "Need $X more" when cash is short.
- [ ] A matchday card can be played with $0 in the bank.
- [ ] Every card face shows its price before the player keeps it.
- [ ] The persona bots can still play a full season with the new prices (balance harness runs).

**Open:** stay with free matchday cards (recommended), or price the strongest boosters?

## Spec 3: Player cards versus free agency

A player card is the cheaper, better route to a signing; free agency is the route to exactly who you want. Both cost cash up front, so the card needs a clear edge or it is the same thing in two places.

**Today:** a free agent's fee is one year's wage up front (a quarter of that for an Academy prospect), and each Scout Office level takes 10% off. A card player is generated above the club's best natural player at that position (grey +4 overall, gold +18) and pays no fee. Both a free agent and a card player sign for the rest of the season. When the squad or cap is full, the card names the player he replaces and the release payout.

**What the fee comes to.** From the wage curve in `src/data/financeRules.ts`, for a 25-year-old with no Scout Office:

| Overall | Wage a year | Free-agent fee | Card fee (half) |
| --- | --- | --- | --- |
| 45 | $15,500 | $15,500 | $7,750 |
| 50 | $17,000 | $17,000 | $8,500 |
| 55 | $18,500 | $18,500 | $9,250 |
| 65 | $25,500 | $25,500 | $12,750 |
| 75 | $40,500 | $40,500 | $20,250 |

For scale: a Normal career starts with $60,000, Local's match base is $8,000 (before home, result and sponsor money) and the Local cap is $350,000 a year. So a grey card player costs about one match's base pay and a gold one about a match and a half. Saving up for a player is a one or two week wait, not a long one.

**Changes**

1. **Card players pay a fee (D6).** Proposal: half the fee the same player would cost in free agency, after any Scout Office discount.
2. **Card players are exclusive.** They never appear in the free-agent pool before the card is played, so the card is the only way to sign them.
3. **The quality floor stays.** A card player always beats your best natural player at his position.
4. **Free agency is unchanged (D7):** full fee, your choice of player, available any week the Recruit screen is open.
5. **Print the deal on the card:** position, overall, age, wage, contract length, fee, and whether he fits under the cap today. When he replaces someone, the card shows the fee and the release payout as one total.

**Done when**

- [ ] Playing a player card deducts half the matching free-agent fee and shows the sum on the card first.
- [ ] No card-generated player appears in the free-agent list before his card is played.
- [ ] Every card player still beats the club's best natural player at his position.
- [ ] A card player who would break the cap is refused with the wage gap shown, never silently signed.
- [ ] Free-agent fees and the Scout Office discount behave exactly as today.

**Open:** is half the right discount? Should card players sign for longer than the rest of the season? When a card player is released or his deal ends, does he join the free-agent pool like anyone else (recommended) or leave the game?

## Spec 4: Stadium and facility plots

The club ground becomes a stadium ringed by a fixed number of plots. A blueprint card lets you build a facility, cash pays for it, and upgrading the stadium opens more plots. This is the main cash sink, and it belongs to Slice 2, after the weekly offer and fatigue prove fun (D9).

**Today:** free build on a 20 × 20 tile grid. There are 12 facilities (Training Paddock, Weights Room, Video Room, Physio Centre, Canteen, Sponsor Board, Grandstand, Academy, Coach's Office, Scout Office, Medical Bay, Team Gym), each levelling 1 to 3 with weekly upkeep. Level-one builds cost $8,000 to $60,000. They unlock through season one. The Grandstand already grows the match-day ground.

**Changes (card-week careers only)**

1. **Plots replace free build (D4).** Proposal: stadium level 1 has 4 plots, level 2 has 6, level 3 has 9. With 11 facilities left to place, a club can never build everything; that is the intent.
2. **The Grandstand becomes the stadium.** It sits in the middle and takes no plot. Upgrading it opens plots as well as growing the crowd. Upgrades cost cash and get noticeably dearer each level.
3. **Blueprints replace the season-one unlock ladder.** A facility can't be built until you have played its blueprint card. Then you pay today's build cost.
4. **Duplicate blueprints** make that facility's next level cheaper. Proposal: 25% off.
5. **Neighbour bonuses (new).** Start with three named pairs, shown as a line between plots: Physio Centre beside Medical Bay (faster recovery), Canteen beside Sponsor Board (more match-day income), Weights Room beside Team Gym (bigger strength gains).
6. **Upkeep stays** as today.

**Fits with the facilities rework.** Le's current focus is making facility benefits clear. Every facility needs one visible, plain benefit before it goes on a plot, so do that rework first or alongside this spec, not after.

**Done when**

- [ ] A new card-week career shows a stadium with 4 empty plots and no free-build grid.
- [ ] A facility can only be placed after its blueprint card is played, and placing it charges the build cost.
- [ ] Upgrading the stadium charges cash and opens the next plots.
- [ ] Each neighbour pair shows its link and its bonus in numbers when both are built side by side.
- [ ] Existing non-card careers keep free build exactly as today.

**Open:** plot counts per stadium level; whether a facility can be moved or demolished; which other facility pairs make good neighbours.

## Spec 5: Weekly fatigue and the event dilemma

Players carry tiredness from week to week. A League match alone leaves a player fresh for the next one; every bonus event he enters adds a debt that stays until he rests a week or you spend a recovery card. This is the heart of the first Labs test (D5, D9) and needs a new system: weekly fatigue does not exist today.

**Today:**

- Fatigue only exists inside a single match. Every player starts every match at full energy.
- Injuries carry over (weeks out). Every player has an injury-risk stat; the match rolls an injury on a big hit using the value on the team sheet.
- A player away at an event can't play a clashing fixture.
- League rounds sit in weeks 5–23. Weeks 7, 10, 13, 16 and 19 have no round; they are the Open Cup slots.
- Rival clubs' team sheets are built fresh each match and carry nothing from week to week.

**Changes (card-week careers only)**

1. **Weekly fatigue (new).** Every player in your squad has fatigue from 0 to 100, shown as a bar on Squad, Lineup and event entry.
2. **What adds it.** Proposal: a full League match +30, off the bench +15, a bonus event +20.
3. **What removes it (changed in revision 2).** Proposal: every player recovers 30 at the start of each week, whether he played or not. Physio Centre and Medical Bay each add 5 to that.
4. **What it does.** A tired player starts the match with less energy, using the in-match energy that already exists. Proposal: 0.4% less per point, so fatigue 50 starts him at 80%. Above 60 his injury chance rises by half; above 80 it doubles.
5. **The preview.** Entering a player in an event shows the cost before you confirm, for example "Fatigue 20 → 40. Starts Round 6 at 84% energy."
6. **Recovery cards** in the Matchday family, free to play: *Fatigue wipe* (one player to 0), *Ice baths* (whole squad −30), *Injury repair* (one player −2 weeks out).
7. **Recovery cards have a hold limit (new in revision 2).** Proposal: the hand holds at most 2 recovery cards. A third can be played at once or passed, not kept.
8. **Rivals do not tire.** Only your squad carries fatigue. It can only cost you, never a rival, so the numbers must be gentle enough that a careful player loses nothing against today's game.
9. **Match randomness unchanged.** Fatigue is written onto the saved team sheet before kick-off as each player's starting energy and injury risk. It adds no dice roll, so a match still replays identically from its saved sheets.

**How the numbers play out (Proposal).** Fatigue at kick-off, for a star who starts every League match:

| What he does | Kick-off fatigue |
| --- | --- |
| League only, every week | 0 every round |
| Enters 1 event | 20, and it stays 20 each round after |
| Enters 2 events | 40 |
| Enters 3 events | 60: one more puts him in the raised-injury band |
| Rests one Open Cup week | 30 comes off |
| Fatigue wipe card | Back to 0 |

So the choice each event is: take on 20 that will not clear by itself, or keep him fresh. The Open Cup weeks become the natural place to pay it back, by leaving him out of the tie.

**Strikes.** Strikes exist today. A tired side that loses by 24 or more, or three in a row, costs board patience. That is the real price of overplaying, so it must be visible: the event preview names the next League opponent.

**Done when**

- [ ] Every player in a card-week career shows a fatigue bar that changes after matches, events and the weekly recovery.
- [ ] A star who plays only League matches kicks off every round at 0 fatigue.
- [ ] A player at 80+ fatigue is measurably more likely to be injured than one at 0, shown by a balance-harness plan (not an ad-hoc script).
- [ ] Event entry shows each player's fatigue change and next-match energy before the player confirms.
- [ ] Playing a Fatigue wipe card on a tired star resets him to 0 and his next-match preview updates.
- [ ] A third recovery card can't be kept and the screen says why.
- [ ] A saved match replays with the same result.
- [ ] Rival sheets and non-card careers are unaffected.

**Open:** the numbers above; whether training also adds fatigue; whether rested players should lose a little sharpness, so resting isn't always free. If League-only play should slowly wear a player down over a season, drop the weekly recovery from 30 to 25.

## Spec 6: Staff as card generators

Keep staff, but give each one a job you can see: every few weeks they add a card from their speciality to your offer. Staff become the way you steer what you're dealt, which replaces the steal as your lever on the deck.

**Today:** four roles (assistant coach, analyst, welfare manager, attack coach with a speciality per set-play family), one of each. Staff cards in Card week hire someone with the appointment fee waived; duplicates cut the weekly wage.

**Changes (card-week careers only)**

1. **Each role feeds one family.** Proposal: assistant coach adds a Training card, welfare manager a Recovery card, analyst a one-match Booster, attack coach a Set play from his speciality.
2. **Built in two steps (changed in revision 2).** Recovery cards and set plays exist by Slice 2, so the welfare manager and attack coach start then. Training and Booster cards arrive in Slice 3, and the assistant coach and analyst start with them.
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

- **Training:** a small permanent gain to one stat for one player, for example +2 speed. Respects the 100 cap and the player's potential ceiling.
- **One-match boosters:** a bigger gain that lasts for the next match only, for example +8 speed. Never called "Fresh legs", which is already a coach call.
- **Gear:** a trait you can move between players. One gear slot per player, priced in cash (a ticket card). Swapping it is free between matches.
- **Sponsors:** a deal with a condition and a cash payout, for example "Stay under the cap for 8 rounds: $25k". Builds on the timed sponsor effects already in the events deck. The main cash source for the stadium.
- **Cap booster (Special):** raises this career's cap by a printed amount. One active at a time, never stacking, and it never expires mid-season, so a legal squad can't turn illegal. The game already sells a cap upgrade in three levels for cash, so this card must say how the two combine.

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

**Slice 1b: the money rule** (Specs 2 and 3), after Le has played 1a

1. Card faces show family and price badge.
2. Player cards cost half the matching free-agent fee and stay out of free agency until played.
3. Saving shelf: two slots for priced cards.
4. Balance run again with prices on.

**Slice 2: stadium and staff** (Specs 4 and 6), after the facilities rework

1. Stadium with plots replaces free build in card-week careers.
2. Grandstand becomes the upgradable stadium.
3. Blueprint cards gate facilities; duplicates discount the next level.
4. Three neighbour bonuses.
5. Welfare manager and attack coach add a card from their family every 3 rounds.

**Slice 3: more card types** (Later section): training, boosters, gear, sponsors, cap booster. Assistant coach and analyst start supplying Training and Booster cards here.

Each numbered item is one GitHub issue with a plain "done when" taken from its spec. Every agent prompt starts: read AGENTS.md, CLAUDE.md and docs/hub first, and check open PRs touching cardWeek.ts, matchday.ts, lineup.ts or sheets.ts before starting.

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
- [x] Fatigue numbers: +30 League, +20 event, 30 back each week.
- [x] Recovery cards: hold at most 2.

Still open:

- [ ] Does training add fatigue? (Left out of 1a.)
- [ ] Card-player fee: half the free-agent fee (about $8,500 for a grey card)?
- [ ] Matchday cards free (recommended)?
- [ ] Staff deliver a card every 3 rounds?
- [ ] Stadium plot counts: 4, 6, 9?
