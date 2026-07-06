# BAK-157 — Scaffold Vite + Phaser 3 + TypeScript project
**Linear:** https://linear.app/bakinglions/issue/BAK-157/scaffold-vite-phaser-3-typescript-project | **Priority:** Urgent | **Work unit:** WU-1

## Problem
There is no project yet. We need a working dev loop (hot reload), a strict-TypeScript build, a headless test runner, and the directory skeleton from ARCHITECTURE.md §2 so every later work unit has an owned home for its files. Nothing renders and nothing can be tested until this lands.

## Proposed solution
Bootstrap a Vite `vanilla-ts` project, add Phaser 3 and Vitest, lock tsconfig to strict, and boot a single placeholder `BootScene` inside a Phaser game instance. Create the full `src/` tree (empty stub files are acceptable where a later WU owns the content) plus `tests/` and `docs/specs/`. Add `#ui-root` DOM overlay and base pixel CSS to `index.html`. Add `.gitignore` and initialise git.

This ticket owns bootstrap/config files and `main.ts` (orchestrator-owned), `config.ts`, and a minimal `BootScene`. It must NOT implement iso rendering, tiles, camera, or UI logic — those belong to WU-2/WU-5. Stub files it creates for other WUs must be empty or contain only a `// owned by WU-n` comment.

## Affected files
- Create `package.json` — scripts: `dev`, `build`, `test`, `preview`.
- Create `tsconfig.json` — strict.
- Create `vite.config.ts` — Vitest config block.
- Create `index.html` — Phaser canvas mount + `#ui-root` overlay.
- Create `src/main.ts` (orchestrator-owned) — boot Phaser, register scenes.
- Create `src/config.ts` — constants per ARCHITECTURE.md §3.
- Create `src/scenes/BootScene.ts` — placeholder scene.
- Create directory skeleton (empty/stub) per §2: `src/core/{events,state,save,time}.ts`, `src/data/{player,facility,club,league,names}.ts`, `src/systems/{fixtures,economy,training,freeagency}.ts`, `src/sim/{engine,events,weather,commentary}.ts`, `src/scenes/{GroundsScene,MatchScene}.ts`, `src/world/{iso,camera,path,placement,playback}.ts`, `src/ui/{dom,hud,nav}.ts`, `src/ui/screens/{squad,recruit,fixtures,build,matchOverlay}.ts`, `src/ui/tutorial.ts`, `src/fx/{audio,particles}.ts`, `src/utils/rng.ts`.
- Create `.gitignore`.
- Test `tests/config.test.ts` — assert constants exist and are the documented values.
- Test `tests/smoke.test.ts` — trivial `expect(true).toBe(true)` to prove Vitest runs.

## Key interfaces & behaviour
`package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```
Dependencies: `phaser@^3.80.0`. Dev: `vite`, `typescript`, `vitest`.

`tsconfig.json` (strict essentials):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
```
Rationale for `environment: 'node'`: sim/systems/data are headless pure TS (ARCHITECTURE.md §1); no jsdom needed. Scenes/UI are excluded from unit tests (§8).

`src/config.ts` — export exactly the constants block from ARCHITECTURE.md §3 (GRID_W/H, TILE_W/H, SEASON_ROUNDS, FINALS_WEEKS, WEEKS_PER_SEASON, SQUAD_CAP, SQUAD_MIN, STARTING_MONEY, STAT_MAX).

`src/scenes/BootScene.ts`:
```ts
import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }        // scene key per §7
  create(): void {
    this.add.text(16, 16, 'NRL Sim — Boot OK', { color: '#ffffff' });
  }
}
```

`src/main.ts` — construct `Phaser.Game` with config: `pixelArt: true`, `roundPixels: true`, `scale.mode: Phaser.Scale.FIT`, `backgroundColor: '#1a1a2e'`, `parent: 'game-root'`, `scene: [BootScene]` (§7). No other scene registered yet.

`index.html` body:
```html
<div id="game-root"></div>
<div id="ui-root"></div>
<script type="module" src="/src/main.ts"></script>
```
Base CSS (inline `<style>` or `src/style.css` imported by main.ts): `html,body{margin:0;height:100%;background:#1a1a2e}`, `#game-root,#ui-root{position:absolute;inset:0}`, `#ui-root{pointer-events:none}` (children opt back in with `pointer-events:auto`), and `*{image-rendering:pixelated}` plus a monospace font-family default. This makes the DOM overlay sit above the canvas without stealing world input.

## Edge cases & risks
- Phaser's default is `pixelArt:false`; forgetting the flag makes generated art blurry — assert visually.
- `#ui-root` capturing pointer events would break world panning; `pointer-events:none` on the container is load-bearing.
- `exactOptionalPropertyTypes` is strict and may surface later; keep it on — GameState has genuine optional fields (`weather?`).
- Stub files must still be valid TS (empty file compiles fine); do not add throwaway exports that later WUs must delete.

## Acceptance criteria
- [ ] `npm run dev` opens a browser tab showing a Phaser canvas on `#1a1a2e` with the Boot text.
- [ ] Editing a source file updates the browser with no manual refresh (HMR).
- [ ] `npm run build` exits 0 with zero TS errors under strict mode.
- [ ] `npm test` runs and both `config.test.ts` and `smoke.test.ts` pass.
- [ ] The full `src/` directory skeleton from §2 exists (stubs allowed).
- [ ] `#ui-root` exists in the DOM overlaid on the canvas and does not block canvas pointer events.
- [ ] `.gitignore` excludes `node_modules`, `dist`; git repo initialised with an initial commit.

## Out of scope
Any iso math, tile generation, camera, character, HUD, or game logic. Real texture generation in BootScene (WU-2). Save/load, time system, and all gameplay systems.
