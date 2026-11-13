# Features

Last updated: 2026-11-13

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
- Upright menus, 5-tab bar ([PR](https://github.com/ch-leon/nrl-sim/pull/436))
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

- More options on the last tackle: the kicker weighs kicking, running it and shifting it wide by field position, his side's style, his boot, his outside backs' pace and, in the last minute, the score. Between even sides the last tackle is a kick 62% of the time (was 69%) and a pass 15% (was 8%). Awaiting lab sign-off ([PR](https://github.com/ch-leon/nrl-sim/pull/687), [issue](https://github.com/ch-leon/nrl-sim/issues/650)).

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

- The finance testing model now has headless salary, fee, income and cap quotes,
  a versioned contract and a reproducible opening-roster inventory. This prepares
  the fresh-career economy; cash/cap transactions and player-facing finance are
  subsequent work ([PR #595](https://github.com/ch-leon/nrl-sim/pull/595)).

- The isolated developer regional career includes an optional cross-division
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
