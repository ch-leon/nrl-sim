# BAK-163 — Build basic HUD (money, week, season counter)
**Linear:** https://linear.app/bakinglions/issue/BAK-163/build-basic-hud-money-week-season-counter | **Priority:** Medium | **Work unit:** WU-5

## Problem
There's no way to see core game state. We need an always-on HUD showing money, week, and season, styled as pixel-art UI, updating reactively when state changes, readable on desktop and mobile. We also need the shared DOM helpers and the bottom nav bar scaffolding that every later screen (squad, recruit, fixtures, build) plugs into.

## Proposed solution
**Binding decision (ARCHITECTURE.md §1.6):** UI is a DOM overlay in `#ui-root`, NOT a Phaser UI scene. Build `src/ui/dom.ts` (panel/button/mount helpers + pixel styling), `src/ui/hud.ts` (top HUD subscribing to the event bus), and `src/ui/nav.ts` (bottom nav bar with a `registerScreen` API). The orchestrator wires HUD + nav into `#ui-root` from `main.ts` and passes callbacks. HUD reads current values from `getState()` and re-renders on `state:changed` / `money:changed` bus events.

## Affected files
- Create `src/ui/dom.ts` — DOM helpers + injected pixel CSS.
- Create `src/ui/hud.ts` — HUD component.
- Create `src/ui/nav.ts` — bottom nav bar + screen registry.
- Modify `src/main.ts` (orchestrator-owned) — mount HUD and nav, wire `onAdvanceWeek`, call `registerScreen` for available screens. If unable to touch `main.ts`, report BLOCKED for the wiring only.
- Test `tests/ui/nav.test.ts` — `registerScreen` registry logic (pure part extracted; see note).

## Key interfaces & behaviour
`src/ui/dom.ts` — thin, dependency-free helpers over `document`:
```ts
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, opts?: { class?: string; text?: string; html?: string;
                   attrs?: Record<string, string>; onClick?: () => void },
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K];

export function panel(opts?: { class?: string }, ...children: (Node | string)[]): HTMLDivElement;
export function button(label: string, onClick: () => void, opts?: { class?: string }): HTMLButtonElement;

// Mount a node into #ui-root (creates the root if missing). Returns the node.
export function mount(node: HTMLElement): HTMLElement;

// Inject the shared pixel-UI stylesheet once (idempotent). Called by mount().
export function ensureStyles(): void;
```
Pixel styling injected by `ensureStyles()`: monospace font stack (`'Courier New', monospace`), `image-rendering: pixelated`, chunky borders (`border: 3px solid #000; box-shadow: 3px 3px 0 #000`), panel bg `#e8e0c8` with dark text, buttons with `:active` inset offset. All HUD/nav elements set `pointer-events: auto` (the `#ui-root` container is `pointer-events:none` per BAK-157, so only real controls capture input and the world stays draggable underneath).

`src/ui/hud.ts`:
```ts
export interface HudOpts { onAdvanceWeek?: () => void; }

export interface Hud {
  el: HTMLElement;
  destroy(): void;      // unsubscribe from bus + remove from DOM
}

// Builds the top HUD, subscribes to bus, and reflects current getState() immediately.
export function createHud(opts?: HudOpts): Hud;
```
Behaviour:
- Layout: a top panel (position: fixed; top:0; left/right:0) with three readouts — `$<money>` (thousands-separated), `Week <week>/<WEEKS_PER_SEASON>`, `Season <season>` — and an **"Advance Week"** button on the right that calls `opts.onAdvanceWeek?.()`. The time system is a later ticket; HUD only invokes the provided callback (button is present but is a no-op if no callback given).
- Initial render pulls from `getState()` (ARCHITECTURE.md §4 store API).
- Subscribe to `bus.on('state:changed', s => render(s))` and `bus.on('money:changed', ({balance}) => renderMoney(balance))`. `money:changed` fires with the new balance (ARCHITECTURE.md §5); use it for a snappy money update, but `state:changed` is the source of truth for week/season/money.
- `destroy()` removes both listeners and the DOM node (no leaks when switching contexts).

`src/ui/nav.ts` — bottom nav bar + registry:
```ts
export interface NavScreen { id: string; label: string; open: () => void; }

export interface Nav {
  el: HTMLElement;
  registerScreen(id: string, label: string, open: () => void): void; // adds a button
  destroy(): void;
}

export function createNav(): Nav;
```
Behaviour: fixed bottom bar of pixel buttons. `registerScreen(id,label,open)` appends a button labelled `label`; clicking calls `open()`. Re-registering the same `id` replaces the existing button (idempotent). Later WUs (squad/recruit/fixtures/build screens) are registered from `main.ts` via this API — nav.ts itself imports no screen modules. Extract the registry (id→screen map + replace semantics) as a pure function/object so `tests/ui/nav.test.ts` can assert registration/replacement without the DOM.

Responsiveness: HUD readouts shrink font and hide the `/total` suffix under ~480px; nav buttons wrap or scroll horizontally on narrow screens (`overflow-x:auto`, `white-space:nowrap`). Use `rem`/`vw`-aware sizing so both are legible on mobile.

## Edge cases & risks
- `#ui-root` must not block canvas input: container stays `pointer-events:none`, controls opt in with `pointer-events:auto`. Regressing this breaks pan/tap.
- Double-subscribing on re-mount leaks updates — `destroy()` must unsubscribe; guard against mounting HUD twice.
- Money formatting: use `Intl.NumberFormat` or manual grouping; negative balances (near bankruptcy) must render with a `-` and a danger colour.
- `ensureStyles()` must be idempotent (check for an existing `<style id>` before injecting) to avoid duplicate rules across scene switches.
- Nav registry replacing by `id` prevents duplicate buttons when `main.ts` re-registers after a scene change.
- HUD/nav are DOM and persist across Phaser scene switches (ARCHITECTURE.md §7) — do not tie their lifetime to a scene.

## Acceptance criteria
- [ ] HUD renders as a DOM overlay on top of the Phaser world (money, week/total, season).
- [ ] Values update reactively on `state:changed`; money also updates on `money:changed`.
- [ ] "Advance Week" button calls the injected `onAdvanceWeek` callback (no-op safe when absent).
- [ ] `registerScreen(id,label,open)` adds a working nav button; re-registering an id replaces it (unit test).
- [ ] HUD + nav are readable and usable on desktop and mobile (narrow-width styles verified).
- [ ] `#ui-root` overlay does not block world pan/tap (controls capture input, container does not).
- [ ] No listener leaks: `destroy()` unsubscribes from the bus and removes DOM nodes.

## Out of scope
The actual screens (squad/recruit/fixtures/build) and their content, the time/week-advance system logic (HUD only fires the callback), notifications toast (`ui:notify`) rendering, save/load UI, and settings/audio controls.
