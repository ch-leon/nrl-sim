# BAK-201 — Add particle effects (crowd, big hits, celebrations)
**Linear:** https://linear.app/bakinglions/issue/BAK-201/add-particle-effects-crowd-big-hits-celebrations | **Priority:** Low | **Work unit:** WU-14

## Problem
Key moments (tries, big hits, income, premiership win) currently have no visual punch, and
matches feel empty without crowd motion. We need lightweight, pooled particle effects that
enhance these moments without harming performance and without leaking on scene teardown.

## Proposed solution
Add `src/fx/particles.ts` (owned by WU-14) providing two attach functions that a scene calls
in its `create()`. Each uses Phaser's `ParticleEmitter` with the boot-generated
`'particle-square'` texture (ARCHITECTURE §7), tinted per effect. Emitters are created once,
kept paused/pooled, and re-emitted via `explode()`/`start()`; a global cap keeps total live
particles ≤300. Every attach registers teardown on the scene's `'shutdown'` event and
`bus.off`s its subscriptions, so switching scenes leaves nothing running.

`MatchScene` calls `attachMatchFx(this)`; `GroundsScene` calls `attachGroundsFx(this)`. These
are the only integration points (both scene files are WU-11/WU-2 owned; call sites noted for
orchestrator integration).

## Affected files
- Create: `src/fx/particles.ts`
- Test: `tests/fx/particles.test.ts` (pure helpers: world-mapping + cap math, no Phaser render)
- Modify: `src/scenes/MatchScene.ts`, `src/scenes/GroundsScene.ts` — add attach calls (integration note; not owned by WU-14)

## Key interfaces & behaviour
```ts
export const MAX_LIVE_PARTICLES = 300;

export interface FxHandle { destroy(): void; }   // returned so caller can force teardown

export function attachMatchFx(scene: Phaser.Scene): FxHandle;
export function attachGroundsFx(scene: Phaser.Scene): FxHandle;

// internal, unit-tested pure helper
export function fieldToWorld(x: number, y: number, bounds: Phaser.Geom.Rectangle): { x: number; y: number };
```

`attachMatchFx` subscribes to `'match:event'` (ARCHITECTURE §5 `MatchEvent`, field coords
`x/y` are 0..100 → map via `fieldToWorld` using the field render bounds):
- `kind==='try'` → gold-tinted burst (~24 particles) at event position **plus** a slow gold
  "shower" from above the try line for ~1.2s.
- `kind==='big-hit'` → white impact ring (radial explode ~16) at position **plus**
  `scene.cameras.main.shake(100, 0.008)`.
- Ambient **crowd**: while a match is playing, drifting specks along both sidelines (two
  low-rate emitters, tinted club colours from the fixture), started on attach, stopped on
  `'match:finished'` and on shutdown.

`attachGroundsFx` subscribes to:
- `'money:changed'` → if `delta>0`, coin-sparkle burst at the HUD money corner. HUD is DOM;
  map its screen rect to world via `scene.cameras.main.getWorldPoint(screenX, screenY)`.
- `'facility:placed'` → dust puff (~12 grey particles) at the placed facility's iso screen
  position (compute from `PlacedFacility.x/y` via `src/world/iso.ts`).
- `'season:ended'` → if `payload.premiership`, full-screen confetti (multi-tint) for 3s then
  auto-stop.

Performance & pooling: create each emitter once with a bounded `maxAliveParticles`; sum of all
emitter caps ≤ `MAX_LIVE_PARTICLES`. Reuse via `explode(n, x, y)` — never create emitters per
event. Bursts use `emitting:false` idle emitters.

Teardown (spec explicitly):
```ts
const off = [
  bus.on('match:event', onEvent), /* ...others... */
];
const teardown = () => {
  off.forEach(fn => fn());               // bus.on returns an unsubscribe fn
  emitters.forEach(e => e.destroy());
  scene.events.off('shutdown', teardown);
};
scene.events.once('shutdown', teardown);
return { destroy: teardown };
```

## Edge cases & risks
- Rapid try/big-hit bursts must not exceed the cap → rely on per-emitter `maxAliveParticles`.
- HUD/world mapping: if HUD element not found, skip the coin sparkle rather than throw.
- Missing `'particle-square'` texture (boot order) → guard and no-op with a `console.warn`.
- Double-attach (scene restart): idempotent — destroy any prior handle stored on `scene.data`.
- Leak risk is the main hazard: never subscribe to `bus` without unsubscribing on shutdown.

## Acceptance criteria
- Try, big-hit, coin, dust, and premiership confetti each trigger on their bus events.
- Live particle count never exceeds `MAX_LIVE_PARTICLES` under a burst-spam test.
- After `scene.scene.stop()`/shutdown, no emitters remain and no bus handlers fire.
- `fieldToWorld` mapping unit-tested (corners + centre); `npm run build` passes strict.

## Out of scope
- Audio (BAK-200), skeletal/animated crowd sprites, GPU shader effects, particle art assets.
