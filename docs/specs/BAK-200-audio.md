# BAK-200 — Add sound effects and music
**Linear:** https://linear.app/bakinglions/issue/BAK-200/add-sound-effects-and-music | **Priority:** Medium | **Work unit:** WU-13

## Problem
The game is silent. We need background music (grounds theme + match theme) and SFX for key
moments (build placement, income, crowd cheer, tackle, try, UI clicks), plus volume/mute
controls that persist. Per ARCHITECTURE §4 principle "no binary assets in the repo", we
cannot ship audio files. All audio must be **synthesised at runtime** with the WebAudio API.

## Proposed solution
Add `src/fx/audio.ts` (owned by WU-13) exporting an `AudioEngine` class that owns a single
`AudioContext`. Because browsers block audio before a user gesture, the context starts
`suspended` and is `resume()`d on the first pointer/key event. SFX are short procedurally
generated presets; music is two chiptune loops scheduled by a lookahead scheduler for gapless
looping. The engine subscribes to `bus` events (ARCHITECTURE §5) and plays the mapped sound.
Volume/mute live in `state.settings` (ARCHITECTURE §4) and are persisted by the existing save
system automatically — audio.ts only reads/writes via the store. A self-contained settings
popup (DOM, mounted into `#ui-root`) exposes a volume slider and mute toggle.

`main.ts` (orchestrator-owned) will call `initAudio()` and `initAudioUi()` once at boot.

## Affected files
- Create: `src/fx/audio.ts`
- Test: `tests/fx/audio.test.ts`
- Modify: `src/main.ts` — orchestrator wires `initAudio()` + `initAudioUi()` (out of this WU's ownership; noted for integration)

## Key interfaces & behaviour
```ts
export type SfxName = 'click' | 'coin' | 'build' | 'cheer' | 'tackle' | 'try';

export class AudioEngine {
  constructor(ctx?: AudioContext);          // ctx injectable for tests (mock)
  resume(): Promise<void>;                   // called on first gesture; no-op if running
  setVolume(v: number): void;                // 0..1, clamps, writes state.settings.volume
  setMuted(m: boolean): void;                // writes state.settings.muted
  playSfx(name: SfxName): void;              // no-op if muted or ctx suspended
  playMusic(track: 'grounds' | 'match'): void; // crossfades; idempotent per track
  stopMusic(): void;
  dispose(): void;                           // stop scheduler, close ctx, bus.off all
}

export function initAudio(): AudioEngine;    // singleton; subscribes to bus (below)
export function initAudioUi(): void;         // mounts settings popup into #ui-root
```

SFX synthesis (master gain = `state.settings.muted ? 0 : volume`):
- `click`: square osc 660Hz, 40ms, fast decay envelope.
- `coin`: two sine notes 988Hz→1319Hz, 70ms each, rising.
- `build`: white-noise buffer through lowpass ~400Hz, 120ms "thud", short attack.
- `cheer`: white noise through bandpass sweeping 300→2000Hz, 900ms swell envelope.
- `tackle`: sine 90Hz + noise burst, 150ms, sharp attack low thump.
- `try`: 4-note square arpeggio (C-E-G-C', 90ms/note) fanfare.

Music: precomputed note arrays (freq+duration), two loops of 8 bars @ ~120BPM. A lookahead
scheduler runs `setInterval(25ms)`, scheduling notes ≤100ms ahead against `ctx.currentTime` so
loop wrap is sample-accurate and **gapless**. `grounds` = cheerful square lead + triangle bass;
`match` = driving faster loop. `playMusic` fades current out (150ms) and the new in.

Bus subscriptions (ARCHITECTURE §5 payloads):
- `'facility:placed'` → `playSfx('build')`
- `'money:changed'` → if `payload.delta > 0` → `playSfx('coin')`
- `'match:event'` → `kind==='try'`→`try`; `'big-hit'`→`tackle`; `'tackle'`→`tackle`
- `'ui:notify'` → `playSfx('click')`
- `'match:started'` → `playMusic('match')`; `'match:finished'` → `playMusic('grounds')`

Settings popup: pixel-styled (reuse `src/ui/dom.ts` helpers where available), a range input
`0..100` bound to `setVolume(v/100)` and a checkbox bound to `setMuted`. Initial control state
reads `getState().settings`. Toggling either calls the store `setState` so save picks it up.

## Edge cases & risks
- Autoplay policy: never create/resume context before a gesture; register a one-time
  `pointerdown`/`keydown` listener that calls `resume()` then removes itself.
- Muted at boot: master gain 0, but scheduler still runs so unmute is instant.
- `AudioContext` unavailable (old browser / test env): guard construction; all methods no-op.
- Tab backgrounded: `setInterval` may throttle → schedule far enough ahead (100ms) to tolerate.
- Do not leak: `dispose()` clears interval, `bus.off`s every handler, closes context.
- Volume must be clamped to `[0,1]`; slider is `[0,100]` → divide.

## Acceptance criteria
- Music loops with no audible gap at the wrap point; switching grounds↔match crossfades.
- Each mapped bus event triggers the correct SFX exactly once per emission.
- Mute and volume changes persist across reload (via `state.settings` + existing save).
- No audio starts before a user gesture (no console autoplay warnings).
- `npm run build` passes strict; `tests/fx/audio.test.ts` green using a mocked AudioContext.

## Out of scope
- Real recorded audio assets, positional/spatial audio, per-SFX volume mixing UI.
- Phaser's sound manager (we use raw WebAudio, not Phaser sound).
