# Features

Last updated: 2026-11-11

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

## Labs

- `?labs=1`, all off by default; Retro Bowl-style controls ([PR](https://github.com/ch-leon/nrl-sim/pull/438))

## Under the hood

- Content packs ([PR](https://github.com/ch-leon/nrl-sim/pull/375)); storage adapter ([PR](https://github.com/ch-leon/nrl-sim/pull/374))
- Demo gate ([PR](https://github.com/ch-leon/nrl-sim/pull/373)), paywall ([PR](https://github.com/ch-leon/nrl-sim/pull/384)), behind the flag
- Brand config ([PR](https://github.com/ch-leon/nrl-sim/pull/382))
- Android test APK ([PR](https://github.com/ch-leon/nrl-sim/pull/394)); CI ([PR](https://github.com/ch-leon/nrl-sim/pull/442))

## Recently added

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
