# NRL Sim — Implementation Plan

> **For agentic workers:** Executed via subagent-driven development — one implementer
> subagent per work unit, waves run in dependency order, work units within a wave are
> parallel-safe (disjoint file ownership per docs/ARCHITECTURE.md §2). Shared-file
> integration (`main.ts`, nav registration, tick-hook wiring) is done by the
> orchestrator between waves.

**Goal:** Implement all 24 actionable NRL Sim tickets (BAK-157…BAK-204) into a
playable browser game; BAK-205 (monetisation) is blocked on a business decision,
BAK-170 is a duplicate of BAK-172.

**Architecture:** Pure-TS simulation/systems layer under a single serialisable
`GameState`, typed EventBus, Phaser scenes as views, DOM overlay UI, generated
placeholder textures, seeded RNG. See docs/ARCHITECTURE.md.

**Tech stack:** Vite 7, TypeScript (strict), Phaser 3, Vitest, vite-plugin-pwa.

---

## Work units (ticket → unit mapping)

Tickets that touch the same files are merged into one work unit (one subagent) to
avoid write conflicts; parallelism happens *between* units, not within them.

| WU | Tickets | Scope | Owns (per ARCHITECTURE §2) |
|----|---------|-------|-----------------------------|
| WU-1 | BAK-157 | Scaffold: Vite+Phaser+TS+Vitest, repo init | whole repo skeleton |
| WU-2 | BAK-158, 159, 161 | Grounds scene: iso tilemap, camera, walking character | scenes/BootScene, scenes/GroundsScene, world/iso, world/camera, world/path |
| WU-3 | BAK-166, 168, 172 (+170 dup) | Data models + core state/events + RNG | data/player, data/facility, data/club, data/names, core/state, core/events, utils/rng |
| WU-4 | BAK-176, 174 | Time tick system + save/load | core/time, core/save |
| WU-5 | BAK-163 | DOM UI kit + HUD + nav bar | ui/dom, ui/hud, ui/nav |
| WU-6 | BAK-191, 198 | Match sim engine + weather/momentum | sim/engine, sim/events, sim/weather |
| WU-7 | BAK-184 | League, fixtures, ladder + screens | data/league, systems/fixtures, ui/screens/fixtures |
| WU-8 | BAK-178 | Facility placement + build menu | world/placement, ui/screens/build |
| WU-9 | BAK-179 | Free agency + recruit/squad screens | systems/freeagency, ui/screens/recruit, ui/screens/squad |
| WU-10 | BAK-180, 188 | Training gains + economy (both week-tick systems) | systems/training, systems/economy |
| WU-11 | BAK-189 | Match field scene | scenes/MatchScene |
| WU-12 | BAK-194, 196 | Match playback + overlay/commentary (both in Match scene) | world/playback, ui/screens/matchOverlay, sim/commentary |
| WU-13 | BAK-200 | Audio (WebAudio synth) | fx/audio |
| WU-14 | BAK-201 | Particles | fx/particles |
| WU-15 | BAK-202 | Tutorial | ui/tutorial |
| WU-16 | BAK-204 | PWA | vite config, scripts/gen-icons.mjs |
| — | BAK-205 | **BLOCKED** — monetisation model undecided; decision doc only | — |
| — | BAK-170 | **DUPLICATE** of BAK-172 — cancel in Linear | — |

## Dependency graph

```
WU-1 (scaffold)
 ├──> WU-2 (grounds scene) ──────────────┬──> WU-8 (placement)
 ├──> WU-3 (models/core) ──┬──> WU-4 (tick+save)
 │                         ├──> WU-5 (HUD/nav/UI kit) ──> WU-7, WU-9 (screens use UI kit)
 │                         ├──> WU-6 (match sim) ─────┐
 │                         ├──> WU-7 (fixtures)       ├──> WU-12 (playback+overlay)
 │                         ├──> WU-9 (free agency)    │
 │                         └──> WU-10 (training+econ, needs WU-4 hooks)
 ├──> WU-11 (match field, needs WU-2's iso utils) ────┘
 └──> WU-16 (PWA — independent, run last to precache final bundle)
WU-12 ──> WU-13 (audio), WU-14 (particles)  [subscribe to match events]
all core loop ──> WU-15 (tutorial — references every screen)
```

## Execution waves

Within a wave, units are parallel-safe (disjoint files). Orchestrator integrates
`main.ts` wiring, runs `npm run build` + `npm test` as the gate, and dispatches a
review pass after each wave.

| Wave | Units (parallel) | Gate before next wave |
|------|-------------------|----------------------|
| 0 | WU-1 | dev server boots, blank canvas, git repo initialised |
| 1 | WU-2, WU-3 | build+tests green; iso helpers and models importable |
| 2 | WU-4, WU-5, WU-6 | tick pipeline runs; HUD reactive; sim calibration tests pass |
| 3 | WU-7, WU-8, WU-9, WU-10, WU-11 | full club-management loop playable (auto-sim matches) |
| 4 | WU-12 | watchable match with overlay + commentary |
| 5 | WU-13, WU-14, WU-15, WU-16 | polish integrated; PWA build artifacts present |

**Rationale for key sequencing choices:**
- WU-2 and WU-3 share nothing (scene/world rendering vs pure data) — safe in parallel.
- WU-6 (sim) needs only models, not the tick system — pulled forward to wave 2 to
  de-risk the highest-uncertainty component (score calibration) early.
- WU-10 depends on WU-4's `registerTickHook`; WU-7/8/9 depend on WU-5's UI kit —
  hence all in wave 3, not 2.
- WU-12 is alone in wave 4: it merges the two Match-scene tickets and is the
  integration point for sim + field scene + fixtures.
- WU-16 (PWA) runs last so the service-worker precache covers the final bundle.

## Per-wave orchestrator integration duties

- After wave 1: register Boot/Grounds scenes in `main.ts`.
- After wave 2: wire HUD `onAdvanceWeek` → `advanceWeek()`; boot flow New/Continue.
- After wave 3: nav-register fixtures/build/recruit/squad screens; wire match tick
  hook (order 40) to hand off player fixtures to MatchScene (or auto-sim on
  fast-forward); wire rival-round sim + weather roll.
- After wave 4: route `match:started` → scene switch; `match:finished` → back to
  Grounds.
- After wave 5: init audio/particles/tutorial in `main.ts`; final full review.

## Risks

1. **Score calibration** (WU-6): statistical acceptance tests over ≥200 seeded runs
   are in the spec; risk of tuning loops. Mitigated by pulling to wave 2.
2. **Parallel-agent file conflicts:** mitigated by ownership map + orchestrator-only
   `main.ts`; any agent needing a foreign file must report BLOCKED.
3. **Generated-art quality:** placeholder aesthetic accepted for this milestone;
   texture keys are the swap-in interface for real pixel art later.
4. **Design docs missing:** facility/adjacency/league-naming numbers invented in
   specs and marked authoritative; Leon should review balance tables afterwards.
5. **iOS PWA quirks** (WU-16): install-flow acceptance is manual QA, documented.
