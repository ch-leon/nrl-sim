# Overview

Last updated: 2026-11-01

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

## Where things stand

- **UI cleanup:** done, in five chunks
  ([PR](https://github.com/ch-leon/nrl-sim/pull/353) to
  [PR](https://github.com/ch-leon/nrl-sim/pull/359)).
- **Leon's 12 gameplay and UX tasks:** all done
  ([issue](https://github.com/ch-leon/nrl-sim/issues/372)).
- **Commercial foundations:** built (storage adapter, content packs, entitlements and
  demo gate, brand config, paywall), all behind a switch that is **off** on the live
  build ([issue](https://github.com/ch-leon/nrl-sim/issues/365)).
- **Save format:** version 21 (`SAVE_VERSION` in `src/core/state.ts`).
- **In flight:** splitting `live.ts` and `e2e-webkit.mjs` into modules, no behaviour
  change ([PR](https://github.com/ch-leon/nrl-sim/pull/443)). A repo slim Leon approved
  is planned, with no PR yet. See [roadmap.md](roadmap.md).

## How work moves

Issues, build, check (by a different tool), prove (CI green), play-test, merge. The
full process is in [AGENTS.md](../../AGENTS.md); how the game is built is in
[CLAUDE.md](../../CLAUDE.md) and [docs/ARCHITECTURE.md](../ARCHITECTURE.md).
