# Overview

Last updated: 2026-11-07

## The pitch

A Kairosoft-style rugby league club management sim. Build your grounds, recruit and
train a squad, and watch Nines matches play out. Phaser 3 + TypeScript, with every
pixel of art generated in code. (From the [README](../../README.md).)

## Who it's for

Fans of Kairosoft-style management games and rugby league fans. The plan is a
premium game with a free demo and a one-off unlock
([issue](https://github.com/ch-leon/nrl-sim/issues/362)). See
[marketing.md](marketing.md) for what is still **Open**.

## Play it

- **Live build:** https://ch-leon.github.io/nrl-sim/ (deployed from `main` on every merge).
  Before launch it moves to Firebase Hosting on our own domain, and the repo goes
  private ([issue #448](https://github.com/ch-leon/nrl-sim/issues/448)).
- **How Leon plays it:** installed as a Home Screen web app on iPhone. The menus work
  held upright, with a 5-tab bar along the bottom; the match and the grounds turn
  landscape ([PR](https://github.com/ch-leon/nrl-sim/pull/436)).
- **Match lab:** https://ch-leon.github.io/nrl-sim/#lab. Pick two teams and a seed,
  then watch, pause, step and scrub the match sim. This is where a match mechanic is
  signed off.
- **Labs:** add `?labs=1` to the URL to show a hidden experiments panel. Every
  experiment is off by default.
- **Android:** CI builds a sideloadable test APK from `main`
  ([PR](https://github.com/ch-leon/nrl-sim/pull/394)). Saves stay on the phone; no
  login or payments.

## Where things stand (as of 7 Nov 2026)

- **UI cleanup:** done, in five chunks
  ([PR](https://github.com/ch-leon/nrl-sim/pull/353) to
  [PR](https://github.com/ch-leon/nrl-sim/pull/359)).
- **Leon's 12 gameplay and UX tasks:** complete; the tracker is closed (source: [issue #372](https://github.com/ch-leon/nrl-sim/issues/372)).
- **Commercial foundations:** built
  ([issue](https://github.com/ch-leon/nrl-sim/issues/365)). The storage adapter,
  content packs and brand config are in use in today's game. Only the demo gate,
  paywall and login sit behind the commercial switch, which is off on the live build.
- **Save format:** version 22 (`SAVE_VERSION` in `src/core/state.ts`).
- **Repo maintenance:** the live-sim and WebKit module split is merged
  ([PR #443](https://github.com/ch-leon/nrl-sim/pull/443)); the repo slim is also
  merged ([PR #447](https://github.com/ch-leon/nrl-sim/pull/447)).
- **Strategy counters:** on in the live game
  ([PR #506](https://github.com/ch-leon/nrl-sim/pull/506)), with plan fit, matchup
  scouting, half-time readouts, counter commentary and rivals that counter your recent
  plans by difficulty. The tracker is closed
  ([#470](https://github.com/ch-leon/nrl-sim/issues/470)).
- **New game experience:** phases 1 to 4 have shipped, including the curated offline
  Australia and New Zealand town list
  ([PR #496](https://github.com/ch-leon/nrl-sim/pull/496)), the nearest club as derby
  rival ([PR #505](https://github.com/ch-leon/nrl-sim/pull/505)), expansion-club
  framing ([PR #504](https://github.com/ch-leon/nrl-sim/pull/504)) and an English-style
  league for UK home towns ([PR #509](https://github.com/ch-leon/nrl-sim/pull/509)).
  The tracker stays open ([#489](https://github.com/ch-leon/nrl-sim/issues/489)); the
  board grant is parked ([#483](https://github.com/ch-leon/nrl-sim/issues/483)).
- **Match balance:** Expansive is still under par, at about 41% of level-rating games
  ([#322](https://github.com/ch-leon/nrl-sim/issues/322), open). The Speed levers in
  [PR #514](https://github.com/ch-leon/nrl-sim/pull/514) are merged but all off, so no
  match changed.
- **In progress, not shipped:** set plays phase 1 in draft
  [PR #515](https://github.com/ch-leon/nrl-sim/pull/515), off by default; Labs shorter
  matches ([#513](https://github.com/ch-leon/nrl-sim/issues/513)), planned and
  awaiting Leon's go.
- **Launch plumbing:** decided and documented
  ([PR #457](https://github.com/ch-leon/nrl-sim/pull/457), merged), not live. Firebase
  hosting/push, PostHog, EmailOctopus, tester distribution and privacy work are tracked
  in [#456](https://github.com/ch-leon/nrl-sim/issues/456), including Leon's setup
  checklist. GitHub Pages remains the current play link; the repo goes private at
  launch. See [roadmap.md](roadmap.md).

## How work moves

Issues, build, check (by a different tool), prove (CI green), play-test, merge. The
full process is in [AGENTS.md](../../AGENTS.md); how the game is built is in
[CLAUDE.md](../../CLAUDE.md) and [docs/ARCHITECTURE.md](../ARCHITECTURE.md).
