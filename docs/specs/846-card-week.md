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
| Picks owed | Three when the career starts, so three picks before round 1. Each League match the club plays (a regular round or a final) adds one, up to three waiting. Trials, cup ties, camps and challenges add none. |
| A pick | Three different cards, drawn by weight from the cards that can be offered now. Fewer only when fewer can be offered. The player takes one or passes. |
| Waiting | A pick not taken waits. It is never lost and never blocks Advance Week. |
| The same offer | The cards on show are settled when drawn (the player, his salary, who he replaces, the play, the hire's name) and saved, so a reload shows the same offer. The draw uses the card week's own seeded stream, never the match seed or the story deck's. |
| Pass | Spends the pick with no card taken. Always allowed while a pick is showing, so a pick whose three cards are all refused never sticks. The history records it as a pass. |

### Cards

| Kind | What it does | Offered when |
| --- | --- | --- |
| Player | A generated player joins now with no signing fee. He is rated above the card floor at his position (below). His salary counts on the cap. | His salary fits the squad limit and this season's cap, or a named player can be released to make it fit. |
| Staff | Hires the role with the appointment fee waived. Wages still run. | The role is empty and nothing else refuses it (the attack coach: one at a time; Razzle needs reputation). |
| Set play | Adds one play the club could buy today, free. Which play is settled when the card is drawn. | The club's attack coach teaches a play it does not own. |
| Trait | The player chooses a squad member. The first copy gives the trait at I, a second raises it to II, a third to III. III is the limit. | Someone in the squad, not away, is below III in that trait. |
| Cash | Money now, booked to the Events line of the books as `card: <title>`. | Always. |
| Dilemma | A gold-tier player joins (as a player card) at the position with the lowest card floor, and board patience drops by one. | As a player card, and only while board patience is at least 2, so it never takes the last point. |

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

Each card shows its tier in words (Grey or Gold), its title and a one-line effect. A
player card also shows his position, rating and salary a year, and "Replaces <name>
(release costs $X)" when he needs a place. A card that can't be taken is shown disabled
with the reason. A trait card lists who can take it (starters first) and the level each
would reach. Below the cards, **Last match** lists each player who played, with tries,
line breaks and tackles, and marks players who joined from a card or hold a trait from a
card.

## Tuning values

| Value | Where | Now | What moving it does |
| --- | --- | --- | --- |
| `PLAYER_CARD_MARGIN.grey` | `src/data/cards.ts` | 4 | How far above the card floor a grey player card's man is generated (overall points). He lands within ±6 of floor + 4 and above the floor. |
| `PLAYER_CARD_MARGIN.gold` | `src/data/cards.ts` | 18 | The same for the gold player card and the dilemma: meant to read about five stars in Local (five stars start at 60, `STAR_BANDS` in `src/config.ts`). Capped at 99. |
| `CARD_WEEK.START_OWED` | `src/data/cards.ts` | 3 | Picks waiting when a card-week career starts (`newCardWeek` in `state.ts` matches it). |
| `CARD_WEEK.MAX_OWED` | `src/data/cards.ts` | 3 | The most picks that can wait; a League match beyond it adds nothing. |
| `CARD_WEEK.OFFER_SIZE` | `src/data/cards.ts` | 3 | Cards on show in a pick. |
| `CARD_WEEK.PLAYER_TRIES` | `src/data/cards.ts` | 6 | Generation tries for a player card's man to beat the floor before the card sits that pick out. |
| Card `weight` | `src/data/cards.ts` `CARDS` | grey players 10, gold halfback 4; staff 6 (attack coach 4); set play 8; grey traits 7, Finisher 4; cash 8; dilemma 3 | How often each card turns up, relative to the others that can be offered. |
| Cash `amount` | `src/data/cards.ts` `cashInjection` | $15,000 | The cash card's money. |
| Dilemma `patience` | `src/data/cards.ts` `marqueeGamble` | −1 | Board patience the dilemma costs. |

## Deliberately out

Position links and sheet bonuses, steal from the club you beat, decrees, strikes,
rerolls, the opening pack, the album across careers, and any scoring.

## Where it lives

- `src/data/cards.ts`: the cards and the tuning values.
- `src/systems/cardWeek.ts`: drawing, taking, passing, the weekly tick
  (`TICK_ORDER.autosave − 2`), the last match's lines and the view model.
- `src/ui/cardWeek.ts`: the pick screen and its automatic opening; the HUD chip is in
  `src/ui/hud.ts`.
- Save v36: `GameState.cardWeek` is optional and validated when present
  (`saveValidation.ts` `isCardWeek`). It is refused on a save before v36 and on a
  career that is not a League career.


## Rerolls, win rewards and levels

Rerolls use the card stream to redraw the displayed pick. A win reward slot
stays when the beaten club still has an eligible card. The first reroll costs
$1,500. Each adds $1,500 to the next price until the week changes. The debit appears under Events. Starter picks can be rerolled
and Decree picks cannot.

After a League win, the third slot can offer a real player from the beaten
club. On play, the player moves with his career history and the rival receives
a fit replacement at the same position, generated around his rating. If no
recruit fits, the slot can offer a set play from the beaten club’s attack
style. Passes, discards and rerolls never move a player.

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
upgrade adds up to two rating points per level.

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

When a former card recruit rejoins through a win reward, he keeps one card
marker. Affected v38 saves recover the single marker and preserve the original
save in recovery.
