# BAK-179 — Build recruit / free agency screen
**Linear:** https://linear.app/bakinglions/issue/BAK-179/build-recruit-free-agency-screen | **Priority:** Urgent | **Work unit:** WU-9

## Problem
The player needs to grow the squad by signing free agents. This requires a
periodically-refreshed pool of available players (`GameState.freeAgents`, §4), a
recruit screen showing player cards (stats, position, age, wage demand) with a
sign action, and a squad screen listing owned players (same card) with a release
action. Signing/releasing must enforce `SQUAD_CAP` / funds and move players between
`freeAgents` and `squad` deterministically.

## Proposed solution
Add pure free-agency logic (`src/systems/freeagency.ts`): `refreshFreeAgents` and
`signPlayer`, plus the release helper. `refreshFreeAgents` is registered as a
week-tick hook (order 60 — free agent pool refresh, ARCHITECTURE §5) that runs
every 4 weeks. Add the recruit screen (`src/ui/screens/recruit.ts`) and squad
screen (`src/ui/screens/squad.ts`), sharing a card component. Both use `Player`
from `src/core/state.ts` (§4) and `overallRating`/`generatePlayer` from
`src/data/player.ts` (BAK-166).

## Affected files
- Create: `src/systems/freeagency.ts`
- Create: `src/ui/screens/recruit.ts`
- Create: `src/ui/screens/squad.ts`
- Test: `tests/systems/freeagency.test.ts`

## Key interfaces & behaviour
`src/systems/freeagency.ts`:
```ts
import type { GameState, Player } from '../core/state';
import type { Rng } from '../utils/rng';

export const FREE_AGENT_POOL_SIZE = 12;
export const REFRESH_EVERY_WEEKS = 4;
export const SIGNING_FEE_WEEKS = 4;     // upfront = 4 × weekly wage
export const RELEASE_PAYOUT_WEEKS = 2;  // upfront = 2 × weekly wage
export const NEW_CONTRACT_WEEKS = 52;

export interface SignResult { ok: boolean; reason?: string; }

// Regenerate GameState.freeAgents to a fresh pool of 12. Quality is influenced by
// Scout Office level and club reputation (see below). Pure: mutates & returns state.
export function refreshFreeAgents(state: GameState, rng: Rng): GameState;

// Sign freeAgents[playerId] into squad. Deducts SIGNING_FEE_WEEKS × wage upfront,
// sets contractWeeks = 52, enforces SQUAD_CAP and funds. Returns {ok,reason?}.
export function signPlayer(state: GameState, playerId: string): SignResult;

// Release a squad player: pays RELEASE_PAYOUT_WEEKS × wage, removes from squad,
// returns them to freeAgents (contract cleared). Fails if not below SQUAD_MIN guard? — no.
export function releasePlayer(state: GameState, playerId: string): SignResult;

// Week-tick hook (order 60). Runs refreshFreeAgents only when
// state.week % REFRESH_EVERY_WEEKS === 0.
export function freeAgencyTick(state: GameState, rng: Rng): GameState;
```
Behaviour:
- **Quality influence:** each free agent's `quality` (BAK-166 `Quality`) is rolled
  from a weighted table biased upward by scouting. Let `scoutLevel` = level of a
  built `scoutOffice` facility (0 if none) and `rep = state.reputation`. Compute
  `bias = scoutLevel * 0.12 + rep / 250` (0..~0.76). Roll `r = rng.next() + bias`:
  `r >= 1.1 → 'star'`, `r >= 0.7 → 'average'`, else `'rookie'`. Generate via
  `generatePlayer(rng, { quality })`. *Superseded (N12, #247): the pool is now
  generated around `freeagency.poolTarget`, the league mean less a little, lifted
  by the same scouting bias; see BAK-188's 2026-10 retune.*
- **Sign reasons (exact):** `'squad-full'` when `squad.length >= SQUAD_CAP`;
  `'insufficient-funds'` when `money < SIGNING_FEE_WEEKS * player.wage`;
  `'not-found'` when id absent from `freeAgents`. On success: deduct fee via
  `club.spendMoney(fee, 'sign:'+id)`, splice from `freeAgents`, set
  `contractWeeks = NEW_CONTRACT_WEEKS`, push to `squad`, emit `player:signed`
  and `ui:notify success`.
- **Release:** `'not-found'` if absent; else `club.spendMoney(2×wage, 'release:'+id)`
  (allowed to go negative — economy handles bankruptcy), splice from `squad`, push
  to `freeAgents`, emit `ui:notify info`. UI must confirm before calling.
- **Refresh cadence:** `freeAgencyTick` no-ops unless `week % 4 === 0`; on refresh it
  fully replaces the pool (previously-listed unsigned agents are discarded).

`src/ui/screens/recruit.ts`: renders `freeAgents` as cards. **PlayerCard** (shared,
exported from this module) shows name, position, age, `overallRating`, stat bars
(the 5 `PlayerStats`), weekly wage, and upfront signing fee. A **Sign** button calls
`signPlayer`; on `ok:false` it shows the reason text via `ui:notify danger` and
leaves the card. Sign button disabled when `squad.length >= SQUAD_CAP` or unaffordable.

`src/ui/screens/squad.ts`: lists `squad` using the same **PlayerCard**, sortable by
position or `overallRating` (toggle control), showing injured status
(`injuredWeeks > 0` badge "OUT xw"). A **Release** button opens a confirm dialog;
on confirm calls `releasePlayer`.

## Edge cases & risks
- Signing the last slot: guard uses `>=` so exactly `SQUAD_CAP` blocks further signs.
- Determinism: `refreshFreeAgents` must consume RNG in a fixed order so a given
  seed+state yields the same pool (tests assert this).
- Releasing into an already-full-ish state is fine; freeAgents has no cap.
- Fee is computed from the agent's *current* wage at sign time, not stored demand.
- Refresh discards unsigned agents — acceptable per design; note in UI copy.

## Acceptance criteria
- [ ] `refreshFreeAgents` produces exactly `FREE_AGENT_POOL_SIZE` (12) players.
- [ ] Higher Scout Office level and reputation measurably raise the share of
      `'star'`/`'average'` agents over many seeded runs.
- [ ] `signPlayer` moves the player from `freeAgents` to `squad`, deducts
      `4 × wage`, sets `contractWeeks = 52`, and emits `player:signed`.
- [ ] Signing is rejected with `'squad-full'` at `SQUAD_CAP` and
      `'insufficient-funds'` when broke — nothing mutated on failure.
- [ ] `releasePlayer` pays `2 × wage`, removes from squad, returns to `freeAgents`.
- [ ] `freeAgencyTick` refreshes only on weeks divisible by 4 (cadence test).
- [ ] Squad screen shows injured status and sorts by position/rating.

## Out of scope
- Contract renewal / expiry of squad players (BAK-188 economy).
- Rival clubs signing free agents (single-club scope).
- Scout Office facility definition (BAK-168) and its training effects (BAK-180).
