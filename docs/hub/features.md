# Features

Last updated: 2026-11-04

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
- Player page, projected peak ([PR](https://github.com/ch-leon/nrl-sim/pull/378))
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

- Compressed counters pack middle tackles against Tight and leave edge overlaps for Expansive, behind an off switch; normal matches are unchanged ([PR](https://github.com/ch-leon/nrl-sim/pull/503)).

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

- CI test fixes ([PR](https://github.com/ch-leon/nrl-sim/pull/442)), 1 Nov
- Steady tackle count ([PR](https://github.com/ch-leon/nrl-sim/pull/440)), 31 Oct
- Coach calls clarity and page ([PR](https://github.com/ch-leon/nrl-sim/pull/441)), 31 Oct
- Tackle count, easier Labs swipes ([PR](https://github.com/ch-leon/nrl-sim/pull/439)), 31 Oct
- Labs panel, Retro Bowl-style controls ([PR](https://github.com/ch-leon/nrl-sim/pull/438)), 30 Oct
- Coach-tray captions, iOS install hint ([PR](https://github.com/ch-leon/nrl-sim/pull/437)), 29 Oct
- Upright menus ([PR](https://github.com/ch-leon/nrl-sim/pull/436)), 29 Oct
- Play-test fixes ([PR](https://github.com/ch-leon/nrl-sim/pull/435)), 28 Oct
- Kick contests ([PR](https://github.com/ch-leon/nrl-sim/pull/430)), 28 Oct
