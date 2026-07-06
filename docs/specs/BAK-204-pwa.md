# BAK-204 — Add PWA support (installable, offline play)
**Linear:** https://linear.app/bakinglions/issue/BAK-204/add-pwa-support-installable-offline-play | **Priority:** Medium | **Work unit:** WU-16

## Problem
The game only runs as a normal browser tab. We want it installable to the home screen on iOS
Safari and Android Chrome, playable offline after first load, and launched full-screen without
browser chrome. Per ARCHITECTURE §4 (no binary assets in repo) even the required PWA icons must
be generated at build time rather than committed.

## Proposed solution
Add `vite-plugin-pwa` (dev dependency) configured with the `generateSW` strategy and
`registerType:'autoUpdate'`, precaching all build output (HTML/JS/CSS incl. the Phaser chunk,
which is large — raise `maximumFileSizeToCacheInBytes`). A Web App Manifest (name, icons, theme
colour, standalone display, landscape orientation) is emitted by the plugin. Icons (192/512
PNG) are produced by a tiny zero-dependency Node script `scripts/gen-icons.mjs` run via a
`prebuild` npm script. Install UX: capture `beforeinstallprompt` for an "Install" button in the
settings popup (Android/desktop); on install-incapable iOS Safari, show a one-time instruction
toast. Registration is handled by the plugin's injected code, invoked from `main.ts`.

## Affected files
- Create: `scripts/gen-icons.mjs`
- Create: `src/fx/pwa.ts` — install-prompt capture, install button binding, iOS toast helper
- Modify: `vite.config.ts` — add `VitePWA({...})`
- Modify: `package.json` — add `vite-plugin-pwa` devDep, `"prebuild": "node scripts/gen-icons.mjs"`, ensure `build` runs after prebuild
- Modify: `src/main.ts` — call `initPwa()` (integration note; orchestrator-owned)
- Modify: `src/fx/audio.ts` settings popup — mount Install button container (integration note; WU-13 owned)
- Test: `tests/fx/pwa.test.ts` (icon generator output validity; iOS/standalone detection helpers)

## Key interfaces & behaviour
```ts
// src/fx/pwa.ts
export function initPwa(): void;              // wires beforeinstallprompt + iOS toast, once
export function canInstall(): boolean;        // a deferred prompt is available
export function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>;
export function isStandalone(): boolean;      // display-mode:standalone || navigator.standalone
export function isIosSafari(): boolean;
```

`vite.config.ts`:
```ts
VitePWA({
  registerType: 'autoUpdate',
  strategies: 'generateSW',
  manifest: {
    name: 'NRL Sim', short_name: 'NRLSim',
    display: 'standalone', orientation: 'landscape',
    theme_color: '#1a1a2e', background_color: '#1a1a2e',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: { globPatterns: ['**/*.{js,css,html,png}'], maximumFileSizeToCacheInBytes: 6_000_000 },
})
```

`scripts/gen-icons.mjs` (Node, only `node:fs`, `node:zlib`, `node:path` — no deps): writes a
minimal valid PNG for each size to `public/icons/icon-192.png` and `public/icons/icon-512.png`.
Draws a solid `#1a1a2e` background with a light-tinted rugby-ball ellipse motif into a raw
RGBA pixel buffer, encodes PNG manually: 8-byte signature, `IHDR`, `IDAT` (filter-byte-0 rows
`zlib.deflateSync`-compressed), `IEND`, with correct CRC32 per chunk. Idempotent (overwrites).

`initPwa()`:
- `window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; })`.
- Install button (in settings popup) calls `promptInstall()` → `deferred.prompt()`, awaits
  `userChoice`, clears `deferred`. Hide the button unless `canInstall()`.
- iOS: if `isIosSafari() && !isStandalone()` and not shown before (localStorage flag
  `nrlsim.iosInstallHintShown`), show a one-time toast: "Tap Share → Add to Home Screen".

## Edge cases & risks
- Phaser bundle exceeds Workbox default 2MB precache limit → set `maximumFileSizeToCacheInBytes`.
- iOS Safari fires no `beforeinstallprompt`; rely on the manual toast + Apple meta tags.
- `autoUpdate` can swap the SW mid-session; acceptable for a save-on-localStorage game, but
  avoid prompting reload during an active match — safe because state persists via save system.
- Dev mode: keep PWA disabled in `serve` (`devOptions.enabled:false`) to avoid caching churn.
- Icon script must emit spec-valid PNG (correct CRCs) or install silently fails.

## Acceptance criteria (automatable + documented manual QA)
- After `npm run build`, `dist/` contains `sw.js`, `manifest.webmanifest`, and
  `icons/icon-192.png` + `icons/icon-512.png` (valid PNG signature/size).
- `tests/fx/pwa.test.ts`: generated PNGs parse (signature + IHDR dims); iOS/standalone
  detection helpers behave per mocked UA/matchMedia.
- Manual QA (documented, not headless-testable): install to home screen on Android Chrome and
  iOS Safari; relaunch offline (airplane mode) loads the game; launches full-screen (no chrome).

## Out of scope
- Push notifications, background sync, custom offline fallback page, app-store packaging.
