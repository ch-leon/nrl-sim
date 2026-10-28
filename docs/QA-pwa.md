# QA — PWA (BAK-204 / WU-16)

The install and offline behaviours below cannot run headless; they require real
devices/browsers. Run these manually before shipping a build.

## Prerequisites
- `npm run build` (runs `prebuild` → generates icons) then serve `dist/` over
  **HTTPS or http://localhost** (service workers require a secure context).
  e.g. `npm run preview`.

## Automated checks (already covered)
- `npm test` — `tests/fx/pwa.test.ts` asserts the generated PNGs are valid
  (signature + IHDR 192/512, RGBA) and that the iOS/standalone/install-detection
  helpers behave under mocked UA / matchMedia.
- Build artifacts present in `dist/`: `sw.js`, `manifest.webmanifest`,
  `icons/icon-192.png`, `icons/icon-512.png`; the Phaser chunk is precached
  (verify it appears in `sw.js`'s precache manifest — the 6MB cap raise).

## Manual QA

### Android Chrome (installable)
1. Open the served URL in Chrome on Android.
2. Trigger the in-app **Install** button (settings popup) → native prompt appears
   → accept. (Or use the browser's "Add to Home screen".)
3. Launch from the home-screen icon: app opens **full-screen**, no browser chrome,
   either way up (`orientation: any`, #350: the menus work upright, the match and the
   grounds ask to turn sideways), splash uses `#1a1a2e`.
4. Enable airplane mode, relaunch: the game loads and is playable **offline**.

### iOS Safari (manual install path)
1. Open the served URL in Safari on iOS (not Chrome/other iOS browsers).
2. A one-time toast appears: "Tap Share → Add to Home Screen to install".
   (Shown once; cleared via `localStorage` key `nrlsim.iosInstallHintShown`.)
3. Use Share → Add to Home Screen.
4. Launch from the icon: opens **standalone** (no Safari chrome).
5. Airplane mode, relaunch: game loads offline.

### Desktop Chromium (optional)
1. Open in Chrome/Edge desktop; the install icon appears in the address bar or via
   the in-app Install button → install → launches in its own window.

### Build label and the update bar (N7, #181)
`main` deploys to Pages after every merge, so the build on the phone says which one
it is and asks before swapping itself.

1. The title screen's last line reads `Build <date> <sha>` (`[data-nrl-build]`), e.g.
   `Build 2026-10-19 979cbbe`: the UTC build date and the short SHA of the commit
   `vite build` ran on (from `git rev-parse`, else `GITHUB_SHA`, else `local`; a bundle
   without the define says `dev`). Compare the SHA with the merge list in the status
   logs to know what is being tested.
2. Open the installed app on build A, then merge build B. Within 15 minutes, or at
   once when the app comes back to the foreground, a bar appears above the nav:
   **New version ready · Reload · Later** (`.nrl-update-toast`). Nothing reloads by
   itself (`registerType: 'prompt'`).
3. **Reload** swaps to build B and reloads the page; the save is in localStorage, so
   the game continues where it was. **Later** removes the bar until the next launch
   (the waiting build takes over on its own once every tab of the game is closed).
4. During a match the bar never shows: the overlay puts `nrl-match-active` on `<body>`,
   the prompt waits for the class to go, and the stylesheet hides the bar should a match
   start while it is up. Check: start a live match, have a new build deploy, see no bar
   until Back to Club.
   Headless check: with `?e2e` in the URL, `window.__nrlUpdateReady()` raises the bar
   as a new build would (the playthrough can call it mid-match and after full time).

## Notes
- `registerType: 'prompt'` (was `autoUpdate` until #181): the service worker never
  swaps itself in mid-session; the update bar above asks first and waits for any
  match to end. The save is in localStorage, so a reload loses nothing.
- Icons are generated at build time (no binaries in repo, per ARCHITECTURE §4).

## Layout QA (#18)
The canvas uses `Scale.RESIZE` and fills the viewport (no letterboxing). Check at
390×844, 360×740, 768×1024 and 1280×800 (Chrome devtools device mode or a real phone):
- Grounds, match and a menu screen fill the screen; nothing is dark-navy bands.
- All seven nav items are visible/reachable at 360px; buttons are ≥44px tall.
- Rotate mid-match: playback continues and the camera re-frames.
- On a notched phone, HUD/nav/scoreboard clear the safe-area insets
  (`viewport-fit=cover` + `env(safe-area-inset-*)`).
Screenshots: `docs/screenshots/18/`.

## Save corpus (QA loop)
`tests/fixtures/saves/` holds real saves from the phone playthrough, one file per save
version at each of four points (after the tutorial, mid-season, after the rollover,
season 2). `tests/qa/corpus.test.ts` (part of `npm test`) checks every one still migrates
to `SAVE_VERSION`, passes the soak's invariant checks and plays a season headless.
When `SAVE_VERSION` moves, run `npm run e2e:season` on the new `main` and copy its dumps
from `e2e-output/saves/` in; never edit an old file (rules in the README there).
