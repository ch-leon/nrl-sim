# Card week — first playable slice

A Labs test for [#846](https://github.com/ch-leon/nrl-sim/issues/846), 26 November 2026.
It asks one question: is picking a card after every League match fun? It is off by
default and cheap to remove. Design background: Notion page "NRL Sim — Cards,
collections and branching careers", section 24, as cut down on 26 Nov 2026.

## Turning it on

1. Settings → Developer settings → Experiments → **Card week**.
2. Start a new League career. On the Start step, tick **Card week (test)**.

The Labs switch only decides whether the option is offered. The career itself
remembers that it is a card-week career (`GameState.cardWeek`), so turning the switch
off later does not break it. Careers without it play
exactly as before, and their saves are unchanged apart from the save version.

## Rules

| Rule | Behaviour |
| --- | --- |
| Picks owed | Three starter picks before round 1. Each League match the club plays (a regular round or a final) adds a pick, up to three match picks waiting. Trials, cup ties, camps and challenges add none. |
| A match pick | Shows five different cards and closes after two keeps. Take a card into the hand or play it on the spot. |
| A starter pick | Shows five and closes after one keep, so the three starter picks can fill three hand slots. |
| Drawing | All ordinary picks use the weighted normal pool, whatever the result. A pick can show fewer cards when the pool runs short and closes if the last card is kept. Decree picks still show three and adopt one. |
| Waiting | A pick can wait without blocking Advance Week. A new match pick at the cap replaces the oldest waiting match pick. |
| The same offer | The shown cards and any used keeps are saved. Reopening keeps their order and details. The draw uses the card week's own seeded stream. |
| Full hand | A new card cannot be taken into a full hand. With one free slot, take one card and play or pass the other. Upgrades that use no new hand slot are still available. |
| Pass | Spends the rest of the pick and keeps any card already taken or played. Always allowed while the pick is showing. The history records a pass. |

### Weekly fatigue

At the start of every calendar week, all owned squad players recover 20 fatigue
points. A built Physio Centre and a built Medical Bay add 2 recovery each.
Fatigue runs from 0 to 100 and carries across seasons, with the same recovery
during weeks off and pre-season.

| Appearance | Fatigue after the event |
| --- | ---: |
| League starter, including finals | +30 |
| League interchange who takes the field | +15 |
| Pre-season trial or Open Cup tie, starter or used interchange | +20 |
| Away at Skills Camp, Big Mick's Break the Line or Mick's Invitational | +20 |

Leaving a player out, listing him on the bench without using him, and forfeiting
a match add zero. Club story cards with no recorded participant have no player
appearance to charge.

Before kick-off, the club's starters and bench get 0.4 percentage points less
starting energy per fatigue point, so a player on 50 starts at 80%. Fatigue
strictly above 60 multiplies injury chance on a big hit by 1.5. Above 80 it
doubles the chance. The existing injury roll reads the scaled risk on the
team sheet. Rival sheets use their normal kick-off values. Card-week matches
save both sheets for deterministic replay.

### Cards

| Kind | What it does | Offered when |
| --- | --- | --- |
| Player | A generated player joins now with no signing fee. He is rated above the card floor at his position (below). His salary counts on the cap. | His salary fits the squad limit and this season's cap, or a named player can be released to make it fit. |
| Staff | Hires the role with the appointment fee waived. Wages still run. | The role is empty and nothing else refuses it (the attack coach: one at a time; Razzle needs reputation). |
| Set play | Adds one play the club could buy today, free. Which play is settled when the card is drawn. | The club's attack coach teaches a play it does not own. |
| Trait | The player chooses a squad member. The first copy gives the trait at I, a second raises it to II, a third to III. III is the limit. | Someone in the squad, not away, is below III in that trait. |
| Cash | Money now, booked to the Events line of the books as `card: <title>`. | Always. |
| Dilemma | A gold-tier player joins (as a player card) at the position with the lowest card floor, and board patience drops by one. | As a player card, and only while board patience is at least 2, so it never takes the last point. |
| Saved rival recruit or set play | The recruit transfers with his career history and his former club receives a fit replacement at the same position. The set play goes into the playbook for free. | Already in the hand or a waiting pick in an older save. |

The calendar and the club’s facilities determine [weekly fatigue](#weekly-fatigue) alongside these card rules.

**The card floor.** The club's best natural player at the card's position (his own
position is the card's), by overall rating. With nobody there, the best man from a
related position by his rating there (×0.92: centre and winger, the halves, the pack);
with none of those either, the best man anywhere by his rating there. A star from an
unrelated position does not set it: at 0.8 fit a 85-rated halfback would read 68 at
fullback, and a grey fullback card would land near 70 in a league whose clubs average
in the 40s. The card's man is generated around floor + margin (each stat within ±6 of
that) and must rate strictly above the floor. No player card is offered at the position
of the club's best player: built on his rating, a gold man there came out in the 90s.

**Full squad or no cap room.** The card names the man the newcomer replaces: the weakest
at his position first, then the weakest player outside the starting nine, whose release
makes the signing legal. Releasing him costs his normal release payout (a quarter of the
salary still to run), and the card says how much. A player away or booked on an
assignment, or on an emergency scholarship, is never named. If no release would make the
signing legal, the card is not offered. A take re-checks all of this and refuses, with
the reason, if the club changed since the draw.

**No limit on traits per player.** The game has none, so the card week adds none.

## The pick screen

Opens by itself once a new pick is waiting and nothing else is on screen: at the start of
a card-week career, and after a week whose League match added a pick. It waits behind the
week summary, any decision, a sheet and the tutorial, and never opens during a match. The
HUD's **Card week** chip shows how many picks are waiting and reopens it.

The pick says how many cards you can keep. Each card shows its tier in words (Grey or
Gold) and level, its title and a one-line effect. A player card also shows his position,
rating and salary a year, and "Replaces <name> (release costs $X)" when he needs a place.
A card that can't be taken is shown disabled with the reason.

Under that, each face shows the facts to choose with (the play-test said the faces did
not give enough). The pick and a held card in Cards show the same lines, worked out from
the club as it is now and as playing the card would settle it:

| Card | What the face adds |
| --- | --- |
| Player | For a man who has not joined: the club's best natural player there ("Your best prop now: Jai Smith 41") and the gap ("+5 better"), with his rating as he would join at this card's level (a Level II or III dilemma adds its margin steps). "Nobody plays there now" when the card floor came from another position, with no gap, since it would be over an unnamed man; no claim either when the gap is not above zero. An upgrade of a man already here shows neither. |
| Dilemma | As a player card, plus board patience before and after playing it ("Board patience 4 → 3 of 5"). Every play costs it, an upgrade too, so every level shows it. |
| Trait | What the trait does (`TRAITS[id].blurb`) and, when it has a fit, "Suits: fullback, winger". Also shown once the trait is bound to its man. |
| Staff | What the job does (the staff screen's blurb), "Wage $X a week" as he would be paid at this card's level (the hire's wage cut by `STAFF_WAGE_FACTOR`), and "Saves the $X fee" on a first hire only. An attack coach's first hire also lists the plays he opens and says each is still bought separately. |
| Set play | The play's one-line description and "Saves $X" when the card grants the play free; its name is already the face's detail line. An upgrade saves nothing. |
| Cash, Decree | Nothing more. |

A trait card lists who can take it (starters first), each with his real step at this
card's level ("Last Line I → II", "Last Line new → I", or "Last Line I → III" for a Level
II card), and a "suits" mark on men whose position the trait suits; the list's heading
repeats what the trait does. Below the cards, **Last match** lists each player who played, with tries,
line breaks and tackles, and marks players who joined from a card or hold a trait from a
card.

## Tuning values

| Value | Where | Now | What moving it does |
| --- | --- | --- | --- |
| `PLAYER_CARD_MARGIN.grey` | `src/data/cards.ts` | 4 | How far above the card floor a grey player card's man is generated (overall points). He lands within ±6 of floor + 4 and above the floor. |
| `PLAYER_CARD_MARGIN.gold` | `src/data/cards.ts` | 18 | The same for the gold player card and the dilemma: meant to read about five stars in Local (five stars start at 60, `STAR_BANDS` in `src/config.ts`). Capped at 99. |
| `CARD_WEEK.STARTER_PICKS` | `src/data/cards.ts` | 3 | Picks waiting when a card-week career starts (`newCardWeek` in `state.ts` matches it). |
| `CARD_WEEK.MAX_OWED` | `src/data/cards.ts` | 3 | The most match picks that can wait; the next one replaces the oldest. |
| `CARD_WEEK.PICKS.match.show` / `.keep` | `src/data/cards.ts` | 5 / 2 | Cards dealt and keeps allowed in each new match pick. |
| `CARD_WEEK.PICKS.starter.show` / `.keep` | `src/data/cards.ts` | 5 / 1 | Cards dealt and keeps allowed in each new starter pick. |
| `CARD_WEEK.PICKS.decree.show` / `.keep` | `src/data/cards.ts` | 3 / 1 | Decrees dealt and adopted in the season's Decree pick. |
| `CARD_WEEK.PLAYER_TRIES` | `src/data/cards.ts` | 6 | Generation tries for a player card's man to beat the floor before the card sits that pick out. |
| `WEEKLY_FATIGUE.MIN` / `.MAX` | `src/data/cards.ts` | 0 / 100 | Bounds for each squad player's weekly fatigue. |
| `WEEKLY_FATIGUE.LEAGUE_STARTER` / `.LEAGUE_BENCH` | `src/data/cards.ts` | 30 / 15 | Fatigue gained by a League starter or a used interchange. |
| `WEEKLY_FATIGUE.BONUS_EVENT` | `src/data/cards.ts` | 20 | Fatigue gained from playing a bonus match or completing an away event. |
| `WEEKLY_FATIGUE.RECOVERY` / `.FACILITY_RECOVERY` | `src/data/cards.ts` | 20 / 2 | Recovery per week and extra recovery for each of the two built facilities. |
| `WEEKLY_FATIGUE.ENERGY_LOSS_PER_POINT` | `src/data/cards.ts` | 0.004 | Fraction of full starting energy lost per fatigue point. |
| `WEEKLY_FATIGUE.INJURY_TIERS` | `src/data/cards.ts` | >60 ×1.5, >80 ×2 | Strict thresholds for scaling the existing big-hit injury chance. The highest applicable tier wins. |
| Card `weight` | `src/data/cards.ts` `CARDS` | grey players 10, gold halfback 4; staff 6 (attack coach 4); set play 8; grey traits 7, Finisher 4; cash 8; dilemma 3 | How often each card turns up, relative to the others that can be offered. |
| Cash `amount` | `src/data/cards.ts` `cashInjection` | $15,000 | The cash card's money. |
| Dilemma `patience` | `src/data/cards.ts` `marqueeGamble` | −1 | Board patience the dilemma costs. |

## Deliberately out

Position links, the opening pack, the album across careers, and any scoring.

## Where it lives

- `src/data/cards.ts`: the cards and the tuning values.
- `src/systems/cardWeek.ts`: drawing, taking, passing, the weekly tick
  (`TICK_ORDER.autosave − 2`), the last match's lines and the view model.
- `src/ui/cardWeek.ts`: the pick screen and its automatic opening; the HUD chip is in
  `src/ui/hud.ts`.
- `src/systems/weeklyFatigue.ts` applies recovery at week start and appearance
  loads on settlement. `src/match/league/sheets.ts` sets kick-off energy and injury
  risk. `src/systems/liveMatchRecord.ts` stores Card-week kick-off sheets.
- Save v41 stores weekly fatigue by squad player ID. Earlier Card-week saves
  start everyone at zero, while careers without the experiment keep their
  existing shape. Save validation checks each stored value.
- Save v40 records the cards already kept from each waiting pick. Loading an
  older save preserves the waiting faces, hand, active cards, Decree and strikes.
  Those waiting picks have used no keeps. `GameState.cardWeek` stays optional
  and is validated when present (`saveValidation.ts` `isCardWeek`).


## Rerolls, saved steals and levels

Rerolls use the card stream to redraw the remaining slots in the displayed pick
from the normal pool. Kept cards stay where they are and cannot come up again
in that pick. The first reroll costs $1,500. Each adds $1,500 to the next price until
the week changes. The debit appears under Events. Starter picks can be rerolled
and Decree picks cannot.

The steal from the beaten club has been removed. Older saves keep rival recruits
and rival set plays in their hand and waiting picks and can still play them.
The card face shows its original club. Rerolling a saved pick replaces the
cards still on show with a normal draw.

| Card type | Level I | Level II | Level III |
| --- | --- | --- | --- |
| Recruit | Signature trait at least I | Trait level or rating | Trait level or rating |
| Trait | First upgrade on the chosen player | Same player to II | Same player to III |
| Staff | Hiring fee waived | Weekly wage −25% | Weekly wage −50% |
| Set play | Added free | Role IQ needs −1 and break modifier +0.02 | Role IQ needs −2 and break modifier +0.04 |
| Cash injection | $15,000 | $22,500 | $30,000 |
| Marquee gamble | Base recruit margin | Margin +2 | Margin +4 |

Recruit upgrades raise the signature trait from its current level, including
traits the player already had. Once that trait reaches III, a further card
upgrade adds up to two rating points per level. A waiting upgrade can only
apply to the recruit it names while he is still at the club.

Marquee gamble costs one patience point each time it is played or applied to
an active card. A duplicate merges in the hand or upgrades its active effect.
Cash pays the level shown when played. Set-play bonuses are encoded by the
match sheet’s play ID and apply through the existing set-play logic.

Save v38 keeps v37 offers, hands, history and current roster effects. It
recovers already applied recruit and trait cards where the saved history
identifies the recipient. The squad and playbook stay as saved so an in-progress
match can resume from the same inputs. Existing card recruits gain their signature
trait on their next upgrade. A v37 playbook can mix bought and card-earned plays
with no receipt tying a card to a play. Where attribution is ambiguous, every
owned play is kept and no individual one receives a card upgrade on migration.

When a former card recruit rejoins through a saved rival recruit card, he keeps
one card marker. Affected v38 saves recover the single marker and preserve the
original save in recovery.


## Strikes and Decrees

A League loss by 24 or more, or every third consecutive League loss, earns
one strike. A strike costs one board patience point down to a minimum of one.
A win or recorded draw breaks the run. A tied final counts by its tiebreak
winner. A heavy third loss counts once. Cards and the board chip show this
season's strike count. The week summary gives the
reason or says the strike was absorbed.

After the club's fifth completed League match, including forfeits, the next
pick offers three of six Decrees. Adopting one applies it immediately for the rest of the season.
Passing gives up the Decree for that season. A waiting Decree survives match
pick expiry and expires at season close.

Match-sheet bonuses share an eight-point budget per player. Level II and III
plays reserve one and two points respectively. Width uses three points of
that budget when the lineup takes a width play. Tight ship credits five per
cent of the quoted weekly squad and staff wages to the wages line.

Save v39 identifies fee-waived appointments so a paid replacement cannot
inherit a card level or discount. It links a Level I v38 hire when exactly one
serving staff member matches the recorded name, role, speciality and hire
season. Level II and III hires also need the matching discounted wage.
