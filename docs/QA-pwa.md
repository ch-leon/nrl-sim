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
   **landscape** orientation, splash uses `#1a1a2e`.
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

## Notes
- `registerType: 'autoUpdate'` may swap the service worker mid-session. Safe here:
  game state persists via the localStorage save system, so an update+reload does
  not lose progress. Avoid forcing a reload during an active match.
- Icons are generated at build time (no binaries in repo, per ARCHITECTURE §4).
