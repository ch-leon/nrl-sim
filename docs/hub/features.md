# Features

Last updated: 2026-11-25

What's in the game, with the PR that added each.

## Match

- Live Nines match the screen draws ([PR](https://github.com/ch-leon/nrl-sim/pull/162))
- Kick contests ([PR](https://github.com/ch-leon/nrl-sim/pull/430)); Short and Long kick-offs ([PR](https://github.com/ch-leon/nrl-sim/pull/403))
- Bench of four ([PR](https://github.com/ch-leon/nrl-sim/pull/118)); traits on screen ([PR](https://github.com/ch-leon/nrl-sim/pull/105))
- Momentum line, auto-slow key moments ([PR](https://github.com/ch-leon/nrl-sim/pull/376))
- Steady tackle count ([PR](https://github.com/ch-leon/nrl-sim/pull/440))

## Coach calls

- Hit-up, shifts, kicks, Rush, Hold ([PR](https://github.com/ch-leon/nrl-sim/pull/159))
- Offload, Gang tackle, Grubber, 40/20, penalty choice ([PR](https://github.com/ch-leon/nrl-sim/pull/405)); Fresh legs ([PR](https://github.com/ch-leon/nrl-sim/pull/379))
- Unlocks explained, Coach calls page ([PR](https://github.com/ch-leon/nrl-sim/pull/441))

## Club and grounds

- Twelve facilities, gym to grandstand (`src/data/facility.ts`)
- Aim then Build, footpaths ([PR](https://github.com/ch-leon/nrl-sim/pull/402))
- Finance screen, season P&L ([PR](https://github.com/ch-leon/nrl-sim/pull/175))
- Weekly summary, "Why did I lose?" ([PR](https://github.com/ch-leon/nrl-sim/pull/377))

## Squad and recruitment

- Free agents; stars cost a fee ([PR](https://github.com/ch-leon/nrl-sim/pull/147))
- Player page ([PR](https://github.com/ch-leon/nrl-sim/pull/378))
- Lineup: the nine and bench ([PR](https://github.com/ch-leon/nrl-sim/pull/186))
- Staff (`src/systems/staff.ts`): Assistant Coach, Analyst, Welfare Manager

## League and season

- 16 clubs, 24 rounds, top-8 finals (`src/content/au.ts`)
- Rivals sign ([PR](https://github.com/ch-leon/nrl-sim/pull/386)) and switch plans ([PR](https://github.com/ch-leon/nrl-sim/pull/319))
- Fictional names, rename in-game ([PR](https://github.com/ch-leon/nrl-sim/pull/401))
- Easy, Normal, Hard ([PR](https://github.com/ch-leon/nrl-sim/pull/153))

## Events

- Events deck ([PR](https://github.com/ch-leon/nrl-sim/pull/117)); wildcards, Bali trip ([PR](https://github.com/ch-leon/nrl-sim/pull/332))

## UI and accessibility

- Broadcast Quiet look ([PR](https://github.com/ch-leon/nrl-sim/pull/381))
- 5-tab bar ([PR](https://github.com/ch-leon/nrl-sim/pull/436)). On a phone, the game plays in landscape: holding it upright covers everything with “Turn your phone sideways”, and the Android app locks to landscape.
- Three-tap onboarding, Undo ([PR](https://github.com/ch-leon/nrl-sim/pull/380))
- Text size, non-colour cues ([PR](https://github.com/ch-leon/nrl-sim/pull/385))
- Touch polish: press feedback, motion tokens, mis-tap guards, scroll cues ([PR](https://github.com/ch-leon/nrl-sim/pull/617))

## Labs

- In Settings on current builds (`VITE_DEV_SETTINGS`, on until launch); `?labs=1` still works; every experiment off by default ([PR](https://github.com/ch-leon/nrl-sim/pull/438))

## Under the hood

- Content packs ([PR](https://github.com/ch-leon/nrl-sim/pull/375)); storage adapter ([PR](https://github.com/ch-leon/nrl-sim/pull/374))
- Demo gate ([PR](https://github.com/ch-leon/nrl-sim/pull/373)), paywall ([PR](https://github.com/ch-leon/nrl-sim/pull/384)), behind the flag
- Brand config ([PR](https://github.com/ch-leon/nrl-sim/pull/382))
- Android test APK ([PR](https://github.com/ch-leon/nrl-sim/pull/394)); CI ([PR](https://github.com/ch-leon/nrl-sim/pull/442))

## Recently added

- **Set-play tap.** Calling a play from the match tray now hits at once: the tile lights under the finger, a CALLED banner names it, and a short sting plays. A buzz fires where the phone supports it. When the play comes off — a bust, a line break or a try — the camera pulls in, the crowd lifts, and the commentary credits PLAY CALLED. A breakdown stays a quiet read. Match results are unchanged. [PR #828](https://github.com/ch-leon/nrl-sim/pull/828). [#825](https://github.com/ch-leon/nrl-sim/issues/825).

- **Story events in League career.** The Classic deck, including the wildcards and the Bali trip, now turns up in a League career. Cards follow the 25-week year, the trip is offered when the season closes, and a player away at Skills Camp or a booked event is not the subject of a card. A wildcard ban misses real fixtures. [#820](https://github.com/ch-leon/nrl-sim/issues/820).

- **A title season is not a sacking.** Finishing outside the board’s ladder target still meets that goal when the club reaches the grand final or wins the title, in Classic and in a League career. Winning the title never ends the season in a sacking, even if another goal is missed. A building goal only asks for facilities the cash can pay for. The persona report names the goal missed in every sacking. [#692](https://github.com/ch-leon/nrl-sim/issues/692) ([PR](https://github.com/ch-leon/nrl-sim/pull/826)).

- **A ground that grows** ([PR #827](https://github.com/ch-leon/nrl-sim/pull/827)). A home match draws the hill until you build a Grandstand, then a stand with more rows and a roof at each level. The Sponsor Board is signage and the Canteen a food stall. Seats fill with that day's attendance against capacity. An away ground follows the home club's league: smaller in Local, the full ground in the Premier League. [#824](https://github.com/ch-leon/nrl-sim/issues/824).

- **Open-side shifts through hands.** When a ruck is near one touchline and the support can get into position, balanced and wider sides can work the ball all the way to the opposite winger through normal catches and passes. Cover, handling errors and missing support can end the move. Short-side carries, coach calls and learned plays still have their place. Ported from [draft PR #799](https://github.com/ch-leon/nrl-sim/pull/799). [#798](https://github.com/ch-leon/nrl-sim/issues/798).

- **Repeat one-on-ones.** A first step, fend, bust, run-down or solo held-up keeps the commentator's own line. A repeat names both players and briefly links them on the pitch. The pair's second win holds the strip; a later repeat is an ordinary line. A tactic counter, or any line the strip is already holding, stays, and the repeat is said after it. Match Lab remembers the same actions when you seek. Ported from [draft PR #792](https://github.com/ch-leon/nrl-sim/pull/792). [#662](https://github.com/ch-leon/nrl-sim/issues/662).

- **Penalty advantage.** After an ordinary offside at the ruck, the referee holds the whistle for up to 3.5 seconds while the attack still has the ball. Eight metres, a line break or a try takes the advantage. If the chance dies, play comes back to the original mark for the penalty. High shots and bin-worthy fouls are whistled at once. Ported from [draft PR #791](https://github.com/ch-leon/nrl-sim/pull/791). [#659](https://github.com/ch-leon/nrl-sim/issues/659).

- **Dummy-and-go.** When a runner is available, a carrier can turn his shoulders and show the ball in both hands before pulling it back into his carry. The closest defender can slide toward the runner or stay square and close the carrier down. The normal tackle contest applies in both cases. Ported from [draft PR #790](https://github.com/ch-leon/nrl-sim/pull/790). First slice of [#653](https://github.com/ch-leon/nrl-sim/issues/653).

- **Try-saving tackles in the corner.** A fullback can come across to cover an open run down the edge. If he reaches the runner before the line, he can dive at his legs for a tackle or miss and leave the runner free to ground it. The play-by-play calls each result. Ported from [draft PR #789](https://github.com/ch-leon/nrl-sim/pull/789). This slice of [#652](https://github.com/ch-leon/nrl-sim/issues/652).

- **Posts charge.** A prop with Wrecking Ball II or III can call for a short ball from dummy-half near the posts. He straightens toward the uprights with a small first-contact edge. His full name is on the banner and the commentary credits a bust, fend or try. Either side can launch it once a half, and the line can still stop him. Ported from [draft PR #788](https://github.com/ch-leon/nrl-sim/pull/788). First signature from [#663](https://github.com/ch-leon/nrl-sim/issues/663).

- **Directional wind on long punts.** The match seed fixes which way the wind blows. Punts carry further and come down sooner with it, while those kicked into it land shorter and hang longer. The wind holds its direction when the teams swap ends, changing who gets the help. The corner and halfway flags and wind streaks show the direction. Ported from [draft PR #787](https://github.com/ch-leon/nrl-sim/pull/787). This slice of [#661](https://github.com/ch-leon/nrl-sim/issues/661).

- **The score and clock shape the last tackle.** In the final minute, a side within a converted try plays more ball inside the opposition 40. A side protecting a one- or two-point lead favours a territory punt when it has room to land one. Coach calls and set plays still lead. First slice of [#651](https://github.com/ch-leon/nrl-sim/issues/651). Ported from [draft PR #786](https://github.com/ch-leon/nrl-sim/pull/786).

- **Impact interchanges.** A tired player jogs toward his bench while his replacement gets a short burst on a carry or extra grip on a tackle. Watch for **FRESH LEGS** on the first two involvements. Ported from [draft PR #785](https://github.com/ch-leon/nrl-sim/pull/785).

- **Goal-line stands.** Repeat sets starting inside the opposition 20 draw the defence in toward the ruck and cost it more legs. The attack looks for a short forward drive, a wide shift or a kick into the corner. The third straight set gets a banner, commentary and a crowd swell. Ported from [draft PR #784](https://github.com/ch-leon/nrl-sim/pull/784).

- At a penalty or 20 m restart, a captain can call a quick tap while defenders are still getting back. The taker nudges it with his boot and regathers, with **QUICK TAP!** on the pitch. Short defenders have to reach the 10 m line before tackling. Ported from [draft PR #783](https://github.com/ch-leon/nrl-sim/pull/783).

- **Touch judges in open play.** The same two officials jog along the touchlines in career matches and the Match Lab, one on each side. They catch up to kicks, turn with play and carry their flags low. Ported from [draft PR #782](https://github.com/ch-leon/nrl-sim/pull/782). [Match presentation](../specs/match-big-moments.md#touch-judges-in-open-play)

- **Kick returns with support.** A player who takes a long punt or bomb cleanly in space bursts toward the clearest lane. The two nearest available teammates peel in behind for a pass. A close chase can stop the return at the catch. Ported from [draft PR #781](https://github.com/ch-leon/nrl-sim/pull/781).

- **Dummy-half reads tired markers.** When the markers are tired, dummy-half is more likely to run from the play-the-ball. If their legs tip the choice, a Tired Marker cue and the commentary explain the dart. A tired onside line also advances a little slower. Ported from [draft PR #780](https://github.com/ch-leon/nrl-sim/pull/780).

- **SuperCOOKED look, follow-ups.** The Undo toast counts down on a bar along its foot. The title's messages (a failed import, a save from a newer version) are toasts at the foot of the screen. Each save slot shows the club's ladder place ("Season 1 · Week 2 · 3rd"). Contracts says when each deal ends ("S2"), keeping the weeks, in amber, for one about to lapse. Ported from [draft PR #779](https://github.com/ch-leon/nrl-sim/pull/779).

- **Intercepting a pass.** The defender reaches into the pass, draws the ball to his body and carries it away on the turn. Ported from [draft PR #769](https://github.com/ch-leon/nrl-sim/pull/769).

- **Six-again signal.** On a ruck infringement that resets the tackle count, the referee raises his arm, circles it and lowers it while the attack plays on. A try or a penalty takes over, and the signal ends if play stops or the ball changes hands. Ported from [draft PR #767](https://github.com/ch-leon/nrl-sim/pull/767).

- **A second kicking option on the last tackle.** On the last play-the-ball the halfback sets up flatter on the open side and the five-eighth drops behind on the other. Once the heel is played, the onside line can come up. If a defender is closing on the halfback and the five-eighth has more room, dummy-half finds him. He then makes the ordinary kick, run or pass. A directed last-tackle call, a set play or a manual pass keeps the usual path. `secondKicker.on:0` restores the single kicker and the previous ruck. Ported from draft PR #760, part of [#650](https://github.com/ch-leon/nrl-sim/issues/650).

- **Attacking bombs to the corner.** When an onside winger has time to chase, an ordinary attacking bomb can drop in his corner, 8–12 m from the try line and from touch. The fullback reads that aim while the kicker winds up, and the usual contest decides who takes it. Inside 22 m the bomb joins the last-tackle kick choices only if that chase is on. A midfield bomb, a winger who cannot get there, a Lab aim or a scripted kick keeps the fullback's patch. `wingBomb.on:0` turns the corner off. Ported from draft PR #757, part of [#650](https://github.com/ch-leon/nrl-sim/issues/650).

- **Grubber kicks.** The oval tumbles end over end as it skips along the turf, then settles on its side for the chase. Ported from [draft PR #777](https://github.com/ch-leon/nrl-sim/pull/777). [Match rules](../specs/BAK-208-match-rules-and-skills.md#44-kicks--first-slice-implemented-long-bomb-grubber-chip-cross-field)

- **Long punts into space.** On an ordinary territory punt, the kicker reads the fullback. If he has shaded more than 6 m off centre and the opposite landing is clear, the kick goes there, still at least 12 m from touch, with the same depth and the same accuracy roll. A centred fullback, a covered lane, a Lab aim, a coach kick call, a 40/20 or a touch-finder keeps the existing target. `longKick.on:0` turns the read off. [PR #773](https://github.com/ch-leon/nrl-sim/pull/773), ported from [draft PR #756](https://github.com/ch-leon/nrl-sim/pull/756), part of [#650](https://github.com/ch-leon/nrl-sim/issues/650).

- **Offloads in contact.** A tackled runner can get one arm free and send the ball to a support runner while the defender holds on. The flight starts at the releasing hand. Ported from [draft PR #766](https://github.com/ch-leon/nrl-sim/pull/766).

- **One-on-one sidesteps.** When a ball carrier beats a defender with a step, the runner plants and cuts away. The beaten defender reaches into the old running line and gathers his feet to chase. Ported from [draft PR #765](https://github.com/ch-leon/nrl-sim/pull/765).

- **Conversion touch judges.** Two officials watch from the goalposts. Both raise their flags vertically on a make and wave them side to side at the waist on a miss. [PR #778](https://github.com/ch-leon/nrl-sim/pull/778)

- **Loose-ball pickups.** The player who gets to a loose ball in open play drops his hips, scoops it from the turf and tucks it into his running or standing carry. Ported from [draft PR #764](https://github.com/ch-leon/nrl-sim/pull/764). [Match rules](../specs/BAK-208-match-rules-and-skills.md#44-kicks--first-slice-implemented-long-bomb-grubber-chip-cross-field)

- **Centre carries out wide.** A centre catching an ordinary pass near touch reads the nearest free defender ahead. He straightens onto the outside shoulder of a man holding infield, or cuts back inside a man sliding toward touch, and only when that lane has room. The read lasts at most 0.9 seconds. A covered lane, a square defender, a manual step or a set play leaves the usual gap-seeking carry. Pass, sprint and contact odds are unchanged. `live.centreShoulderTicks:0` turns the read off. [PR #770](https://github.com/ch-leon/nrl-sim/pull/770), ported from [draft PR #755](https://github.com/ch-leon/nrl-sim/pull/755), part of [#649](https://github.com/ch-leon/nrl-sim/issues/649).

- **Contested bombs.** The chaser and receiver plant and leap as an open-play bomb comes down. The player who takes it gathers it in the air. On a spill, both land empty-handed and the ball bounces free. Ported from [draft PR #761](https://github.com/ch-leon/nrl-sim/pull/761). [Match rules](../specs/BAK-208-match-rules-and-skills.md#44-kicks--first-slice-implemented-long-bomb-grubber-chip-cross-field)

- **SuperCOOKED look, Phase 6 (screens with no mockup):** Contracts in the Recruit row look (a Renew that can't go says why on the row); the rival squad opens on the pitch in their kit, read-only, with the list a tap away; the expansion intro in the season review's layout with one Carry on; Coach calls and the Playbook as tile grids (calls grouped by Coach's Office level, locked groups saying what opens them; each play's IQ check as a pill); the Guide as a topic list beside the page; History's records and season books and Finance's Season P&L and Ledger as label/value rows and mono tables; the long-advance question and the update bar in the confirm and toast looks. Nothing was taken out ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).
- **SuperCOOKED look, Phase 5 (App):** the title shows the wordmark beside three save-slot cards: your last-played club gets the one orange Continue, and each save's exports, New club and Delete sit behind its ⋯. A new club is set up in three steps (Town, Club, Start) with a step bar and ◂ Back on each: one big town search, then the names, colours (a faded colour says why) and the drawn player in your kit, then a summary card, career mode, difficulty as three cards and the "played before" tick box. The league loading screen, the tutorial bubble (the screen dims round the ringed target), the weekly summary (four blocks with the board's mood as a pill), the season review (a finish banner, then the season in two columns), Settings, the sacked card and the paywall take the new look. Nothing was taken out ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).
- **Nearby defender honours the back-door lead.** During a back-door play, the nearest free line defender within 8 m of the lead holds his depth and shades across toward that runner for up to eight ticks (0.4 s). Committed tacklers keep tracking the half. Markers, retreating defenders and the fullback keep their jobs. He returns to his line when the pass goes, the run stops being a threat, or the time is up, and that play does not pick a replacement. Pass, catch and contact odds are unchanged. `shapes.leadDecoy.on:0` leaves the line as it was. [PR #762](https://github.com/ch-leon/nrl-sim/pull/762), ported from [draft PR #744](https://github.com/ch-leon/nrl-sim/pull/744) onto the back-door packet in [PR #722](https://github.com/ch-leon/nrl-sim/pull/722), part of [#649](https://github.com/ch-leon/nrl-sim/issues/649).

- **Events on the club home** ([PR #752](https://github.com/ch-leon/nrl-sim/pull/752)): the Events card names Big Mick, Skills Camp and Open Cup, shows the nearest deadline and opens their booking screens. Play Week and fast-forward warn before unentered opportunities close, including the later-opening Invitational. Coaches can review or deliberately continue without entering; missed entries explain when they return.

- **Readable player details on small phones** ([PR #745](https://github.com/ch-leon/nrl-sim/pull/745)): the narrow player header stacks its status pills; on short, narrow screens the whole player sheet scrolls so long names, every tab and Deal actions remain readable at Larger text.

- **Stable challenge controls** ([PR #750](https://github.com/ch-leon/nrl-sim/pull/750)): entry, booking, coaching and result dialogs keep a bounded height so notifications cannot move Confirm or Back to club away from your aim. Long details scroll inside the card. [Verification](../status/2026-11-individual-challenges.md)

- **Big Mick’s Break the Line** ([PR #745](https://github.com/ch-leon/nrl-sim/pull/745)): send one player to the Week 6 Showground contest, coach three carry/defend duels and watch the saved clashes in a country-show arena. Six calls trade off ability, matchup, risk and energy; Skip stops at the next decision, while explicit Auto or Finish handles coaching. The player misses that club fixture and returns before Week 7 with development; a title adds $8,000, a personal honour and permanent club access to the harder Week 14 Invitational. Its title pays $16,000. Booking windows, cover, exact entrant odds and earned-versus-paid rewards are visible in League. [Rules and Notion guide](../specs/individual-challenges.md) · [Verification and release evidence](../status/2026-11-individual-challenges.md)

- **iPhone app, Phase 5 (club widgets):** a **Big Coach** widget for the iPhone's lock screen (rectangular and inline) and home screen (small and medium): your next match as the game words it, the best player you have injured and how many rounds until he is back, and the points you have banked to spend. It counts in game rounds and only changes when you play; the game writes it when the week advances, a match is played, points are spent or an injury changes. Tapping it opens the game. Needs the shared App Group (still to prove on a free-signed phone). Website and Android unchanged. [docs/ios-test-build.md](../ios-test-build.md#widgets) · [spec](../specs/ios.md)

- **iPhone app, Phase 4 (captain icon):** the Live Activity's ball is now a little captain in the brand colours, in four poses: carrying the ball, diving for a try, wrapped up after a big hit, and arms up at full time. It changes only when an update arrives and holds until the next; on a squeezed Dynamic Island it shows alone in a small circle. Built and compiled, not yet seen on a phone. Website and Android unchanged. [docs/ios-test-build.md](../ios-test-build.md#lock-screen-and-dynamic-island) · [spec](../specs/ios.md)

- **iPhone app, Phase 3 (lock screen and Dynamic Island):** a match you are playing shows on the iPhone's lock screen and in the Dynamic Island as a Live Activity: both clubs (yours starred), the score, the half and minute as of the last big moment, that moment in one line, and live, paused, half-time or full time. It updates on tries, goals, big hits, sin bins and the breaks; only full time lights the screen. Leaving the app should show it paused and tapping it should return you to the match; leaving the match ends it. The app updates it itself, so nothing paid is needed. Not yet seen on a phone or in the Simulator (compiled only). Website and Android unchanged. [docs/ios-test-build.md](../ios-test-build.md#lock-screen-and-dynamic-island) · [spec](../specs/ios.md)

- **SuperCOOKED look, Phase 3 (Club):** the decisions card on the grounds shows the count in an orange disc over the first one waiting, and the dock labels the money CASH. Build tiles and the building card take the new look; the card shows the level as three bars and Now beside the next level (a training facility's XP boost as the big figure). The League sheet heads its ladder "LADDER" with the round and the finals cut, shows form as lettered dots, and puts the next opponent in a card over your fixtures (a tap opens the full preview). Nothing else changed ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).

- **SuperCOOKED look, Phase 1 (Squad & player):** Squad opens on the pitch: your nine as player cards in their lanes, the bench and reserves beside them; tap a card for his page, or Swap (or a long press) then a card to choose who goes there. List shows the squad by position group with each group's four stats, stars, fitness and where he is in the side. Plan, Plays and the training focus are in the ⋯ at the top right. The player page has four tabs: Stats (spend level points here when "Spend points myself" is on in Settings), Traits, Deal (goal-kicker and captain, the contract, Renew / Sell / Release) and Record (level, potential, morale, injury risk, tallies and club history). Recruit gains a position filter, faces, stars and what a young player grows to. Nothing was taken out ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).

- **SuperCOOKED look, Phase 4 (Office):** the Office sheet gets a head and rings the tiles that want you. Finance shows its tiles on ringed panels and says what cash pays for. Staff & Board shows patience as five pips, each objective as a card with its chip, each role's weekly wage, and outlined Hire buttons. News is a flat feed with a dot for each kind and the coach's lines in italics; History shows each season as a card; Kit puts each preview on its own panel; a decision's choices are cards with Sure and risk pills. Nothing else changed ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).

- **Skills Camp:** book one free annual place in Weeks 1–4, send a squad player away for the Week 5 league opener, and get him back before Week 6 with a saved development report. The League view shows named cover, the chosen focus, XP and cancellation terms. Automatic cover keeps the preferred team; actual awards use existing age/trait modifiers, point spending and ceilings. Release checks are tracked in the [evidence record](../status/2026-11-player-assignments.md) for [PR #742](https://github.com/ch-leon/nrl-sim/pull/742).

- **iPhone app, Phase 2 (durable saves):** in the iPhone app every save is also kept as a native file, so a career survives iOS clearing the web view's storage. It comes back at the next launch, and a deleted slot stays deleted. Export opens the share sheet (Files, AirDrop). The website and Android are unchanged. [docs/ios-test-build.md](../ios-test-build.md#saves-on-iphone) · [spec](../specs/commercial-saves.md)

- **iPhone app, Phase 1 (the shell):** the game now builds as an iPhone app, **Big Coach**, from the same code as the website and the Android test build. Landscape only, iPhone only, full screen with no status bar, the home bar dimmed while you play, no page bounce, the ball icon and a launch screen in the brand's ink. Leon runs it on his own iPhone from Xcode with a free Apple ID (re-run every 7 days). Analytics and the store rules now know the iPhone app from the website and Android. [docs/ios-test-build.md](../ios-test-build.md) · [spec](../specs/ios.md)

- **SuperCOOKED look, Phase 2 (Match):** the score bar sits top centre with the clock between the scores, and a chip under it says whose ball and the tackle. One bottom bar holds Coach, the latest commentary line (tap it for the full log) and pause / speed / skip; speed is one button that steps 1× → 2× → 4× → 8×, and the LOG on/off switch is gone. The coach tray, the half-time sheet (with the Analyst, where the other side goes when behind), the pre-match Game plan, the full-time card (your Player of the Match with his face and stars) and the match report (five numbers, All stats for the rest) take the new look. Nothing else about the match changed ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).

- **Optional Open Cup:** AU and UK League coaches can enter free through Week 6, change their choice before the draw, or sit out while the AI cup continues. Played wins earn separate cash prizes and reputation; a played-final title preserves the full registered squad in History. Withdrawal forfeits the next actual tie on its date and keeps earlier winnings. The League card publishes the dates and rules, and reports read saved income/prize receipts. Club cap capacity stays unchanged. Initial prize values remain for testing. [PR #736](https://github.com/ch-leon/nrl-sim/pull/736) · [Implementation and release checks](../status/2026-11-open-cup.md)

- **SuperCOOKED look, Phase 0 (Foundations):** the game is now **Big Coach** ("a SuperCOOKED game"): the SuperCOOKED palette (navy and ink, one orange primary a screen, green good / amber watch / red bad), self-hosted Oswald, Inter, JetBrains Mono and Archivo Black, the text wordmark on the title and the rotate card, an ink dock and toasts, white selected tabs inside sheets, and PLAY WEEK turning navy while a sheet has its own primary. Adds the shared parts later phases build screens from (status pill, stars, stat tile, player card, confirm dialog, empty state, locked tile). Layout and behaviour are unchanged ([docs/specs/ui-supercooked.md](../specs/ui-supercooked.md)).

- **League career is live.** Start in Local in Australia or the UK. A finals title unlocks the next league permanently. At season review, choose where to play next year. Moving down preserves the club’s salary-cap capacity, and each match pays at the chosen division’s rate. Existing Classic careers keep their format. [Merged PR #719](https://github.com/ch-leon/nrl-sim/pull/719) · [Verification](../status/2026-11-league-selection.md)

- **Back-door support runs:** a fourth ordinary attacking shape. A forward starts his lead run as the ball is heeled and the fullback sweeps wide from depth, so the half can pass behind the lead to the fullback running onto the ball. Who gets the ball is still the ordinary receiver choice, with the usual pass, catch and interception odds; a different pass, a coach call or a set play ends the option. `shapes.backDoor.on:0` restores the three-shape match exactly. [PR #722](https://github.com/ch-leon/nrl-sim/pull/722), part of [#649](https://github.com/ch-leon/nrl-sim/issues/649).

- **Attacking shapes:** free players prepare a compact forward pod or an edge shift during established tackle contact and carry that choice into the play-the-ball, alongside the existing spread. The selected players must be close enough to form it; the pod uses two forwards and a nearby free half. Real seed-1 play demonstrates both structures settled before release. [PR #715](https://github.com/ch-leon/nrl-sim/pull/715), the first slice of [#649](https://github.com/ch-leon/nrl-sim/issues/649), preserves explicit instructions, receiver commitment and unassigned support runners. The initial Expansive win-rate drop did not replicate on fresh seeds; defaults remain unchanged. Merged through #715 on 17 November. Back-door support runs are in #722. The bounded lead read is the follow-up above; wider decoys remain later.

- **Real players and funded transfers** ([PR #716](https://github.com/ch-leon/nrl-sim/pull/716)): review the actual buyer, fee and unchanged deal before selling; the same player joins that club. Sale and event recruitment fees appear under Transfers in Finance. Market refreshes reveal existing unsigned players, club spells remain readable, and History includes retired people. Annual births are bounded. Emergency scholarships only replace unavoidable expiry/retirement vacancies below 13; injuries and bans no longer manufacture extra players. Save v30 retains supported v28/v29 careers.

- **Played-match income and upfront investments** ([PR #695](https://github.com/ch-leon/nrl-sim/pull/695)): base, venue and small result payments settle once with the fixture; byes and waiting pay nothing. Rival wallets pay for signings/releases. Staff appointment fees and Grandstand 30k/60k/90k purchases are upfront, with refunds based on recorded spend. v29 records kickoff promises and receipts; v28 loads without retroactive income.

- **Whistle cleanup:** a player still in the sin bin fades from his seat with his side at half-time and full time, and returns with the restart. The fade finishes completely; retained tackle artwork, carrier markers, bin cards and gas/fatigue bars clear for the break picture and restore on replay ([PR #706](https://github.com/ch-leon/nrl-sim/pull/706), merged 17 November).

- **Connected big moments:** kick follow-through lowers into the continuing run or settled stance; aerial landing loads into the same carry pose; try recovery uses palm and knee support before entering celebration. Knee slides settle once, and the empty goal-kick tee stays put as the kicker turns. Uses the connected handling poses with existing event timing and possession ([PR #705](https://github.com/ch-leon/nrl-sim/pull/705)).

- **Connected handling:** the actual receiver prepares his hands during an incoming pass, with his running stride continuing underneath. Pickup finishes in the carry pose, the passer turns through release, and flight sprites meet the painted hand anchors. Nearby defenders can brace as they approach the current carrier. This uses actual flight and possession facts; pre-release calls remain separate gameplay work ([PR #703](https://github.com/ch-leon/nrl-sim/pull/703)).

- **Receiver preparation:** an ordinary dummy-half commits to his pass four ticks before release. The intended receiver raises an arm while keeping his running stride; a changed instruction or invalid recipient cancels the call. Interceptions and spills still resolve normally ([PR #707](https://github.com/ch-leon/nrl-sim/pull/707), merged 17 November).

- **Contact weight and recovery:** tackle holds use planted support feet, falls land more sharply, and players recover through supported poses. Defenders clear the carrier in sequence and finish at their live positions before the shared tackle artwork hands back to ordinary movement. Existing contact outcomes and ball ownership are preserved ([PR #701](https://github.com/ch-leon/nrl-sim/pull/701)).

- **Everyday match movement:** players lean into starts, take braking steps and plant into turns. Nearby defenders watch the ball while shuffling or backpedalling, including during a pass. Short support/transfer cycles follow distance travelled; the Art Lab Footwork control previews each pose. This builds on the art foundation and preserves match decisions ([PR #699](https://github.com/ch-leon/nrl-sim/pull/699)).

- **Match art foundation:** ordinary movement and handling use a new side profile alongside the front/back views. Editable torso and handling poses give players clearer shoulders, hands and exposed ball panels; the pitch has quieter grass texture and the crowd has softer shirt contrast. Art Lab has a Side view control. Contact, ruck and kick sequences keep their existing directional artwork, and match decisions and player identities are preserved ([PR #697](https://github.com/ch-leon/nrl-sim/pull/697)).

- Signing a player takes the cash for one year's wage (a quarter for an Academy prospect, less a Scout Office discount on the fee only) and room under this season's salary cap. Both are checked before anything changes, so a signing that does not fit is refused and the books stay as they were. A renewal costs nothing, and only in the last season of the current deal: it is priced on his ability now, starts the season after that deal, and has to fit the cap in the season it starts. It does not move the weeks left or the salary already signed. A second renewal in the same season does nothing. Releasing him shows the cash payout and the cap it frees, and is refused when the cash is short. There is no buyer for a sale yet. A rival's later signing is refused when it does not fit the annual cap. Rival wallets are not charged the fee until they have match income ([#558](https://github.com/ch-leon/nrl-sim/issues/558)).

- A new career keeps club cash and the salary cap apart. Player salaries are a season commitment against the cap and no longer come out of the bank each week, and the weekly running costs and facility upkeep do not either. Gates, sponsors and prize money still land as cash and do not change the cap. The Finance screen shows the cash balance, this season's cap and next season's commitments. Careers saved before this change are refused and kept, so they can be exported; they are not converted ([#557](https://github.com/ch-leon/nrl-sim/issues/557)).

- Portrait is blocked on a touch phone. The title, menus, grounds and live match all sit under “Turn your phone sideways” until the phone is landscape, and the Android app locks to landscape. The upright Club home sheet is gone. A desktop window is never blocked ([PR #690](https://github.com/ch-leon/nrl-sim/pull/690)).

- The scripted persona playtesters record a weekly money and XP diary and spend stat points in character (optimal, spend-by-focus, random, or half). This is a measurement tool. A normal career still spends points by focus automatically ([PR #691](https://github.com/ch-leon/nrl-sim/pull/691)).

- More options on the last tackle: the kicker weighs kicking, running it and shifting it wide by field position, his side's style, his boot, his outside backs' pace and, in the last minute, the score. Between even sides the last tackle is a kick 62% of the time (was 69%) and a pass 15% (was 8%). Awaiting lab sign-off ([PR](https://github.com/ch-leon/nrl-sim/pull/687), [issue](https://github.com/ch-leon/nrl-sim/issues/650)).


- A carrier at the try line can be held up: any tackler on him there may stop the try, more surely with two or three men on him and less surely against a carrier at full pace. Play restarts with a play-the-ball 10 m out (a handover on the last). It shows as `HELD UP!` with a commentary line, in about one match in five between even sides (20 to 30% of matches across scenarios), for about 0.2 fewer tries a match, measured on top of the last-tackle options. Awaiting lab sign-off ([PR](https://github.com/ch-leon/nrl-sim/pull/686), [issue](https://github.com/ch-leon/nrl-sim/issues/652)).

- The pass finds one of the near-best options by weight, not always the single best man, in open play and from dummy half, so a set's first receiver varies more (the chance two first passes on the same tackle find the same man falls from 32% to 26% between even sides). Step 1 of the attack-shapes work; awaiting lab sign-off ([PR](https://github.com/ch-leon/nrl-sim/pull/684), [issue](https://github.com/ch-leon/nrl-sim/issues/649)).

- Developer settings is in Settings on every build (GitHub Pages, the Android test APK and local dev). Overrides and experiments stay off until you turn one on, so a normal career plays as before. Analytics stays on unless the address has `?labs=1` or a developer override, experiment or playtest career is actually on. Before launch, set `VITE_DEV_SETTINGS=0` or remove Developer settings ([PR #683](https://github.com/ch-leon/nrl-sim/pull/683)).

- Normal 2:30 clock halves on a 100m field; the existing Experiments panel offers browser-local 100m/80m/60m choices between matches ([PR #678](https://github.com/ch-leon/nrl-sim/pull/678)).

- Match watchability, wave 1 ([PR](https://github.com/ch-leon/nrl-sim/pull/676), [tracker](https://github.com/ch-leon/nrl-sim/issues/626)):
  - A phone shows more of the play: the canvas renders at the screen's pixel density, so a 2× phone sits at ×1.5 (about 14 of 18 players in view, was 11) and big hits and tries zoom in. Developer settings can switch back to the old resolution to compare frame rate. A browser drawing without a GPU (software WebGL) stays at 1×, and the hand-off to a match no longer waits on painting the players' rings, the night light map or the last stadium textures.
  - A match starts at ×2. Contact plays at the chosen speed, and the ruck is not doubled again at ×2.
  - Players face the way they move on screen, and the run is a real stride driven by distance run, with a breathing idle.
  - Three sizes of big moment: a try, a clean break or a 40/20 slows the match; a big hit, bust, strip or intercept freezes for a beat and shakes; the rest keep their pop-up. Only a clean break (about 3 a match) gets the big call.
  - Match sound: a crowd that rises near the try line and on a break, the whistle, the siren, a boot on the ball, a heavier big hit, and a groan when you concede. Not yet listened to by a person.
  - The balance report has a watchability table: lead changes, late margins, how tries are scored and what sides do on the last tackle.

- Match watchability, wave 2 ([PR](https://github.com/ch-leon/nrl-sim/pull/676), [tracker](https://github.com/ch-leon/nrl-sim/issues/626)):
  - Commentary remembers the match: a second try, a hat-trick, the lead changing hands, two tries in a row, a close margin late, a long scoreless spell. A try, a clean break, a sin bin or a penalty stays on the strip for 1.2 s; routine lines no longer push it off.
  - Forwards are drawn bigger than outside backs, heights vary, and all eleven head styles turn up. Players wear a number (their place on the team sheet) and real sleeve cuffs. A fending carrier keeps striding. Players in existing saves may change look once.
  - The camera leaves room ahead of the ball carrier, picks its zoom back up 3 s after a pinch, and no longer streaks at the start of a half. The ball spins and its shadow follows its height; players cast a shadow that matches the stadium light.
  - A coach call paying off shows `COACH'S CALL!` over the player and sounds; the COACH badge pulses when a held call suits the moment; the match holds at ×1 while the tray is open.
  - Full time counts the score up and shows possession, line breaks and tries on the card. Golden point announces itself, and a final or a derby is tagged in the score bug.
  - The match draws with less work each frame: the player frame cache holds 768 frames and the team rings are painted once.

- Match watchability, wave 3 ([PR](https://github.com/ch-leon/nrl-sim/pull/676), [tracker](https://github.com/ch-leon/nrl-sim/issues/626)):
  - A referee trails the ruck and signals tries and penalties; corner flags, benches with the interchange players seated, and a sin bin with a yellow card over the man in it.
  - The crowd is drawn at the players' scale and fills the near terraces. It groans at a try against and a missed kick, looks up at a bomb, rises at kick-off and full time, waves flags on a home try and runs a Mexican wave.
  - A scoreboard on the grandstand roof shows the score and flashes after one; floodlights come on bank by bank at dusk and night kick-offs.
  - Body language: the defensive line gets ready at the play-the-ball; tired players run hunched and stand hands-on-knees; hands on head after a knock-on or a missed goal; team-mates gather round a try scorer; long hair and shorts hems move with the stride.
  - Ten more traits show when they fire (Offload King, Jets, Last Line, Pickpocket, Poacher, Brick Wall, Hothead, Razzle Dazzle, Gambler, Workhorse), and each player page says what to look for.

- Match watchability, wave 4 ([PR](https://github.com/ch-leon/nrl-sim/pull/681), [tracker](https://github.com/ch-leon/nrl-sim/issues/626)):
  - Tackles look like what happened: a wrap from the front, a drag from the side, an ankle tap from behind, a front-on stop for a big hit, and a defender spun off on a bust.
  - The goal kicker has a routine: ball on the tee, steps back, a look at the posts, a breath, then the run-up.
  - At half-time and full time both sides walk off and fade behind the card, winners celebrating and losers head-down; before golden point each side huddles, then spreads.
  - The men under a bomb tip their heads back to watch it.
  - The referee no longer darts when the ball changes hands.
  - Follow-ups ([PR](https://github.com/ch-leon/nrl-sim/pull/685), [issue](https://github.com/ch-leon/nrl-sim/issues/682)): the referee glides through the play-the-ball instead of stepping as the ball reaches the dummy half, and the walk-off at half-time stands still under a pause.

- Defenders other than the markers must physically retreat 10m (or to their goal line) after each ruck before they can rejoin the defence, including after quick heels, handovers, sin bins and substitutions ([PR](https://github.com/ch-leon/nrl-sim/pull/677), [evidence](../specs/625-retreat-validation.md)).

- Ruck markers line up square with the play-the-ball, one behind the other in both attacking directions, with room between bodies ([PR](https://github.com/ch-leon/nrl-sim/pull/621), [spec](../specs/618-marker-alignment.md)).

- Kick catches and loose-ball pickups carry explicit commentary detail, so a kick scooped up on its first grounded tick is called a pickup ([PR](https://github.com/ch-leon/nrl-sim/pull/620)).

- A touch and motion polish pass over the menus and the match screen. Controls
  show a press under the finger and hover fills no longer stick after a tap; a
  sheet that replaces a sheet opens without replaying its entrance; dialogs and
  the ▾ menu ease in; motion runs on shared tokens and reduced motion keeps the
  fades without the travel. A double tap no longer signs two players or upgrades
  twice, arming SKIP no longer moves the speed pill, and the coach tray ignores
  taps for a moment after its tiles move. The bank flashes the week's net
  direction, money reads one way on every screen, the League sheet follows the
  week, long lists show there is more below, and the dock's tabs hold their
  place ([issue](https://github.com/ch-leon/nrl-sim/issues/596)).

- The finance testing model has headless salary, fee, income and cap quotes,
  a versioned contract and a reproducible opening-roster inventory
  ([PR #595](https://github.com/ch-leon/nrl-sim/pull/595)). New careers now use
  the cash and cap split described above.

- The original isolated developer regional prototype includes a cross-division
  Open Cup, with a saved deterministic draw, implicit byes, profile-based dates,
  a neutral final and a finite seeded tie decider. Existing match/result hooks
  draw each later round before the week settles, so a cup that is still going is
  not forfeited or withdrawn. They expose stable sporting outcomes for later
  settlement; there are no prototype prize payments or normal event offers
  ([issue](https://github.com/ch-leon/nrl-sim/issues/575)).

- Isolated developer competition careers can construct AU or UK regional worlds
  from authored division counts, schedules and finals dates, with persistent
  squads, one club registry, division ladders and per-tier rival development.
  Format 27 validates saved membership and retains supported originals. The
  prototype has three divisions of eight; alternate sizes and finals series use
  the same runtime. Normal entry, finance and promotion remain downstream
  ([issue](https://github.com/ch-leon/nrl-sim/issues/573)).

- An isolated developer competition calendar separates slots from competition
  rounds, guards watch/skip/worker results and honours against duplicate delivery,
  preserves held-match recovery, and tracks elapsed intervals. A competition that
  can never finish, or a background result that fails to land, is closed and
  logged so the week still advances; loading a save already in that state
  applies the same closure. It pauses for next-season setup through the existing
  hook registry. Default and dormant careers retain their current flow; normal
  competition entry and finance remain separate work
  ([PR](https://github.com/ch-leon/nrl-sim/pull/587)).

- Save format 25 stores optional, versioned competition rule/prize snapshots and
  stable fixture identities with strict import validation. Supported v24 careers
  upgrade without changing their people or league format, retaining their original
  save; the pre-v24 restart/export policy stays in place. This is dormant metadata
  for subsequent calendar work, not an enabled multi-competition career
  ([PR](https://github.com/ch-leon/nrl-sim/pull/586)).

- [Match big moments](../specs/match-big-moments.md) ([release issue #588](https://github.com/ch-leon/nrl-sim/issues/588)): distinct punt/grubber/drop-kick motion at the actual release, high-take landings with grounded shadows, and scored tries that flow through grounding, recovery and individual reactions. The new snapshot fields describe presentation only; the original seeded match behavior is preserved.

- [Match transition polish](../specs/match-animation-transitions.md) ([release issue #588](https://github.com/ch-leon/nrl-sim/issues/588)): catches keep their running stride while tucking the ball; tackled carriers rise into the play-the-ball; dummy-half pickup and pass follow the real ball timing. The approved short limbs and sim outcomes are preserved.

- The contact-study preview opens with Current and Prototype visible together, sharing playback and scenario controls; phone layouts stack the comparison panels. Updated tackles use close torso contact, short bent arms, impact compression and firmer landings. Tackle legs now keep their standing reach: boots slide in with the hips and knees fold through the landing instead of stretching between fixed feet and moving bodies.

- [Match character art and contact animations](../specs/match-art-prototype.md) ([release PR and verification](https://github.com/ch-leon/nrl-sim/pull/584)): larger heads and stable identities in career matches and the match lab; running catches, close body contact, short bent arms and sim-driven group tackles, breaks and steals. Join/result timing survives replay and faster playback. The approved tackle-leg correction keeps the lowered stance, bounded legs and boots moving with the hips. `/#artlab` retains the earlier-art comparison and eleven-head workbench. Existing hair/colour assignments and current save formats are preserved. The [original handover](../handoffs/match-art-playable-build.md) retains pre-release provenance; the release PR records the tested candidate, independent review and deployed build.

- Squad players earn XP from matches, moments and weekly training; levels auto-spend banked points by focus within fixed ceilings. Training buildings give a generic, capped XP boost with no adjacency effect, and the player page shows plain XP progress ([PR](https://github.com/ch-leon/nrl-sim/pull/568)).

- Rival players grow their shown stats toward fixed ceilings by age, veterans still decline, and the league anchor keeps average strength steady ([PR](https://github.com/ch-leon/nrl-sim/pull/567)).

- Arriving juniors gain +2 potential ceiling points per shown stat per Academy level (up to +6 at level 3); existing players keep their ceilings ([PR](https://github.com/ch-leon/nrl-sim/pull/566)).

- Offloads lean two-thirds on Strength and one-third on Handling; one existing trait is marked as the headline, with Offload King first for forwards ([PR](https://github.com/ch-leon/nrl-sim/pull/564)).

- Every player has fixed potential ceilings on their four shown stats, with more headroom for younger players. A plain Potential star line replaces the career projection; existing format-24 careers backfill ceilings deterministically ([PR](https://github.com/ch-leon/nrl-sim/pull/565)).

- Players show four stats for their position group; overall averages those four, with half-step rating stars beside it. Hidden off-role stats start low and stay fixed ([issue](https://github.com/ch-leon/nrl-sim/issues/537)).

- Handling and Kicking replace Skill in matches, training and player stats. New careers use save format 24; older careers need a new start and their original files remain available for recovery ([issue](https://github.com/ch-leon/nrl-sim/issues/536)).

- Live-match recovery resumes only with a matching engine identity and rules. Updates restart the affected fixture from kick-off with a one-time explanation, keeping the career and once-only week effects; exports and developer careers follow the same policy ([issue](https://github.com/ch-leon/nrl-sim/issues/524)).

- Career loads and imports validate nested players, facilities and selections. Missing or duplicate selections use explicit deterministic repairs, with a warning and retained originals; invalid imports leave the existing career intact ([PR](https://github.com/ch-leon/nrl-sim/pull/532), [repair rules](../specs/save-validation.md)).

- Unreadable and newer-version careers stay visible in their slots, with Export original to recover the exact saved file. Automatic saves cannot replace them; Start over and Delete require confirmation. Older save originals are kept before an upgrade is written, with each recovery copy available to export on the title screen ([PR](https://github.com/ch-leon/nrl-sim/pull/530)).

- Labs is now Developer settings (still `?labs=1`). It can open the Office screens early on this browser only. It can also set up a separate playtest career with a Direct attack coach hired and Block play bought and picked, so you can call it in the first match. Return to my career puts your own career back exactly as it was. Reset all turns everything off ([issue](https://github.com/ch-leon/nrl-sim/issues/519)).

- Anonymous analytics, ready for the PostHog EU token: once the title screen is done, a build given the token sends a handful of anonymous events (career started, match result and difficulty, season finished, dock tab views; push, pop-up and email sign-up events wait for those features). No cookies or browser storage, no person profiles, no names or save data; off in dev, tests, the match lab and Labs, and the game plays the same when PostHog is unreachable. The Pages build has no token yet, so it sends nothing ([PR](https://github.com/ch-leon/nrl-sim/pull/518)).

- Call a set play from the match: with the ball, the COACH tray shows the plays you took in (three at most) under the calls, each with its weakest man's footy IQ; a tapped play runs at the next play-the-ball and the tag over COACH says what came of it. Clubs with no playbook see today's tray ([PR](https://github.com/ch-leon/nrl-sim/pull/517)).

- Normal and Hard rivals counter your last three league plans; Easy keeps its existing squad style. Player-match scouting shows the same habit-based plan as kick-off. Old saves start with no plan history ([PR](https://github.com/ch-leon/nrl-sim/pull/511)).

- UK home towns start a 12-club English-style league with invented clubs and players, 22 rounds, local match vocabulary and a seaside season-end trip. Other countries and old saves keep the AU league; the UK content loads only when needed ([PR](https://github.com/ch-leon/nrl-sim/pull/509)).

- Counter moments get varied, rate-limited live commentary; losses can explain an unfavourable plan matchup with an out-schemed reason and a plan action ([PR](https://github.com/ch-leon/nrl-sim/pull/512)).

- Plan buttons show squad-fit stars and a named contributor; pre-match scouting uses the selected rival nine and shows counters, and half-time shows breaks, kicks and errors against style guides ([PR](https://github.com/ch-leon/nrl-sim/pull/510)).

- Tight tactics now describe forward carries and offloads throughout the plan sheets and guides; old saves keep their plan ([PR](https://github.com/ch-leon/nrl-sim/pull/507)).

- Two pre-season trial weeks in new careers: try a lineup, earn a small home gate, then start round 1 with a clean ladder. Existing saves keep their season shape ([PR](https://github.com/ch-leon/nrl-sim/pull/508)).

- Plans now counter each other by default, with squad fit and offload-heavy Tight for strong packs ([PR](https://github.com/ch-leon/nrl-sim/pull/506); see `docs/status/2026-11-counters.md`).

- New careers arrive as an expansion club: the football manager introduces the club, bank and first-year board goals before the grounds; News and the first season review carry the same framing ([PR](https://github.com/ch-leon/nrl-sim/pull/504)).

- Compressed counters pack middle tackles against Tight and leave edge overlaps for Expansive, behind an off switch; normal matches are unchanged ([PR](https://github.com/ch-leon/nrl-sim/pull/503)).

- Listed home towns now choose the nearest fictional derby rival: a board target, guide News before the fixture, result News afterwards, and a Derby tag on Club home ([PR](https://github.com/ch-leon/nrl-sim/pull/505)). Old saves and free-text towns keep their existing objectives.

- Rush counters use carrier/defence fit, kick space and rushed All-out offload spills behind an off switch; normal matches are unchanged ([PR](https://github.com/ch-leon/nrl-sim/pull/502)).

- Slide matchup mechanics for Expansive, Kick-chase, Tight and All-out are implemented behind an off switch; normal matches are unchanged ([PR](https://github.com/ch-leon/nrl-sim/pull/501)).

- Finance opens after the first home game, Staff & Board at round 4 and Contracts at round 12. Office explains locked tiles; HUD and warning links stay available ([PR](https://github.com/ch-leon/nrl-sim/pull/498)).

- Club home’s “Coach says” gives one practical next step; the weekly summary shares the same suggestion ([PR](https://github.com/ch-leon/nrl-sim/pull/499)).

- New careers open facilities through season one, with a veteran setup skip and a confirmed Settings skip; old saves keep everything open ([PR](https://github.com/ch-leon/nrl-sim/pull/497)).

- Fictional football manager Mick Dorney gives the tutorial, first-visit hints, weekly summary, coach News and seven event cards one voice and pixel portrait ([PR](https://github.com/ch-leon/nrl-sim/pull/494)).

- Optional coach name at new-game setup; the first tutorial bubble and board objectives address you by name, with “Coach” for unnamed careers ([PR](https://github.com/ch-leon/nrl-sim/pull/491)).

Newest first; merge dates in UTC.

- Difficulty descriptions and a first-career Easy hint at setup ([PR](https://github.com/ch-leon/nrl-sim/pull/493)); Normal remains the default.
- Own-style attack and defence fit can influence contact contests behind a switch that defaults off ([PR](https://github.com/ch-leon/nrl-sim/pull/495)); plan changes select the new fits, 4 Nov
- Grind is now named Tight; pack-fit offloads are available behind a switch that defaults off ([PR](https://github.com/ch-leon/nrl-sim/pull/473)), 4 Nov
- Recruit shortlist of four with an affordable Coach’s pick and Show all ([PR](https://github.com/ch-leon/nrl-sim/pull/492)), 4 Nov
- Club home always shows cash runway in weeks, or “covering costs” ([PR](https://github.com/ch-leon/nrl-sim/pull/490)), 4 Nov
- Offline Australia and New Zealand home-town setup, editable club and ground names ([PR](https://github.com/ch-leon/nrl-sim/pull/496)), 4 Nov

- CI test fixes ([PR](https://github.com/ch-leon/nrl-sim/pull/442)), 1 Nov
- Steady tackle count ([PR](https://github.com/ch-leon/nrl-sim/pull/440)), 31 Oct
- Coach calls clarity and page ([PR](https://github.com/ch-leon/nrl-sim/pull/441)), 31 Oct
- Tackle count, easier Labs swipes ([PR](https://github.com/ch-leon/nrl-sim/pull/439)), 31 Oct
- Labs panel, Retro Bowl-style controls ([PR](https://github.com/ch-leon/nrl-sim/pull/438)), 30 Oct
- Coach-tray captions, iOS install hint ([PR](https://github.com/ch-leon/nrl-sim/pull/437)), 29 Oct
- Upright menus ([PR](https://github.com/ch-leon/nrl-sim/pull/436)), 29 Oct
- Play-test fixes ([PR](https://github.com/ch-leon/nrl-sim/pull/435)), 28 Oct
- Kick contests ([PR](https://github.com/ch-leon/nrl-sim/pull/430)), 28 Oct
