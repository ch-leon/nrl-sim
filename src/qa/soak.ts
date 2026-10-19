// src/qa/soak.ts — headless multi-season soak of the club/league systems (QA pass).
// Plays whole seasons through the real tick pipeline (every system main.ts
// registers, with matches auto-simmed) and checks invariants every week: no NaN
// or Infinity anywhere in GameState, no player in two places, rival squads never
// empty, the events deck within its limits, saves that round-trip through
// migrateState. It also builds old-version saves (v1–v8) from a live game and
// plays on from them. Used by scripts/soak.ts (npm run soak) and, at a smaller
// size, by tests/qa/soak.test.ts. Never imported by the game. No Phaser.
import { createNewGame, getState, loadState, setState, type GameState, type Player } from '../core/state';
import { advanceWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../core/time';
import { bus } from '../core/events';
import { migrateState, MIGRATIONS } from '../core/save';
import { EVENTS, SQUAD_CAP, WEEKS_PER_SEASON, type Difficulty } from '../config';
import { initLeague, registerFixturesSystem } from '../systems/fixtures';
import { registerTrainingSystem } from '../systems/training';
import { registerEconomySystem } from '../systems/economy';
import { registerFreeAgencySystem, signPlayer, SIGNING_FEE_WEEKS } from '../systems/freeagency';
import { registerPlayerMatchSystem } from '../systems/matchday';
import { registerMoraleSystem } from '../systems/morale';
import { registerAgingSystem } from '../systems/aging';
import { registerYouthSystem } from '../systems/youth';
import { registerStatsSystem } from '../systems/stats';
import { registerBoardSystem } from '../systems/board';
import { chooseEvent, registerEventsSystem } from '../systems/events';
import { registerRivalsSystem, RIVAL_SQUAD_MIN } from '../systems/rivals';
import { STRENGTH_MAX, STRENGTH_MIN } from '../systems/league';
import { overallRating } from '../data/player';
import { cardById } from '../data/events';

/** How the headless manager plays: hands-off, or a simple sensible manager. */
export type SoakMode = 'idle' | 'managed';

export interface SoakOptions {
  seed: number;
  seasons: number;
  mode: SoakMode;
  /** Start from a save of this version (built from the fresh game) instead of v-current. */
  fromVersion?: number;
  difficulty?: Difficulty;
}

export interface SeasonSample {
  season: number;
  money: number;
  minMoney: number;
  squad: number;
  freeAgents: number;
  saveBytes: number;
  rivalStrength: [number, number];
  reputation: number;
  sacked: boolean;
}

export interface SoakResult {
  seed: number;
  mode: SoakMode;
  difficulty?: Difficulty;
  fromVersion?: number;
  seasons: SeasonSample[];
  problems: string[];
  ms: number;
}

/** Register every system main.ts registers (the UI-only ones aside). */
export function registerAllSystems(): void {
  clearTickHooks();
  clearSeasonHooks();
  registerTrainingSystem();
  registerEconomySystem();
  registerFixturesSystem();
  registerPlayerMatchSystem();
  registerFreeAgencySystem();
  registerMoraleSystem();
  registerAgingSystem();
  registerYouthSystem();
  registerStatsSystem();
  registerBoardSystem();
  registerEventsSystem();
  registerRivalsSystem();
}

/** Paths of every number in `v` that is NaN or ±Infinity. */
export function nonFinitePaths(v: unknown, path = 'state', out: string[] = []): string[] {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) out.push(path);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => nonFinitePaths(x, `${path}[${i}]`, out));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) nonFinitePaths(x, `${path}.${k}`, out);
  }
  return out;
}

/** Player ids that appear more than once across the squad, the pool and rival squads. */
export function duplicatePlayers(s: GameState): string[] {
  const seen = new Map<string, number>();
  const all: Player[] = [...s.squad, ...s.freeAgents, ...s.league.clubs.flatMap((c) => c.squad ?? [])];
  for (const p of all) seen.set(p.id, (seen.get(p.id) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
}

/** Problems with one state snapshot (empty = healthy). */
export function checkState(s: GameState): string[] {
  const out: string[] = [];
  const bad = nonFinitePaths(s);
  if (bad.length) out.push(`non-finite numbers: ${bad.slice(0, 5).join(', ')}`);
  const dupes = duplicatePlayers(s);
  if (dupes.length) out.push(`players in two places: ${dupes.slice(0, 5).join(', ')}`);
  if (s.squad.length > SQUAD_CAP) out.push(`squad over cap: ${s.squad.length}`);
  for (const c of s.league.clubs) {
    if (c.id === s.clubId) continue;
    if (!c.squad || c.squad.length < Math.min(RIVAL_SQUAD_MIN, 13)) out.push(`${c.id} squad too small: ${c.squad?.length ?? 0}`);
    if (c.strength < STRENGTH_MIN || c.strength > STRENGTH_MAX) out.push(`${c.id} strength out of band: ${c.strength}`);
  }
  if (s.eventDeck.pending.length > EVENTS.MAX_PENDING) out.push(`too many pending cards: ${s.eventDeck.pending.length}`);
  if (s.eventDeck.modifiers.some((m) => m.weeksLeft <= 0)) out.push('expired modifier kept');
  if (s.reputation < 1 || s.reputation > 100) out.push(`reputation out of range: ${s.reputation}`);
  return out;
}

/**
 * Build an old-version save from a current state by undoing each migration's
 * additions: the shape a player on that version would have saved.
 */
export function asOldSave(s: GameState, version: number): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & GameState;
  const out: Record<string, unknown> = raw;
  if (version < 9) delete out.kit;
  if (version < 8) raw.league = { ...raw.league, clubs: raw.league.clubs.map(({ squad: _s, ...c }) => c) };
  if (version < 7) delete out.eventDeck;
  if (version < 6) {
    const strings = (list: Player[]): unknown[] => list.map((p) => ({ ...p, traits: p.traits.map((t) => (t.id === 'hitman' ? 'hardMan' : t.id)) }));
    out.squad = strings(raw.squad);
    out.freeAgents = strings(raw.freeAgents);
  }
  if (version < 5) { delete out.boardPatience; delete out.objectives; }
  if (version < 4) {
    const strip = (list: unknown[]): unknown[] => list.map((p) => {
      const { career: _c, joinedSeason: _j, ...rest } = p as Record<string, unknown>;
      return rest;
    });
    out.squad = strip(out.squad as unknown[]);
    out.freeAgents = strip(out.freeAgents as unknown[]);
  }
  if (version < 3) out.settings = { ...(raw.settings as object), difficulty: undefined };
  out.version = version;
  return out;
}

/** A very plain manager: answer cards with choice 0, keep 17+ players if affordable. */
function manage(): void {
  const s = getState();
  for (const ev of s.eventDeck.pending) {
    if (cardById(ev.cardId)) chooseEvent(ev.id, 0);
  }
  let st = getState();
  while (st.squad.length < 17) {
    const fits = st.freeAgents
      .filter((p) => !p.junior && SIGNING_FEE_WEEKS * p.wage + p.wage * 8 < st.money)
      .sort((a, b) => overallRating(b) - overallRating(a))[0];
    if (!fits) break;
    const r = signPlayer(st, fits.id);
    if (!r.ok) break;
    st = getState();
  }
}

/** Play `seasons` seasons from a new game (or an old save built from it) and check as we go. */
export function runSoak(opts: SoakOptions): SoakResult {
  const t0 = Date.now();
  bus.clear();
  const problems: string[] = [];
  createNewGame(`Soak ${opts.seed}`, opts.seed, { difficulty: opts.difficulty });
  initLeague(getState());
  if (opts.fromVersion !== undefined) {
    const res = migrateState(asOldSave(getState(), opts.fromVersion));
    if (!res.ok) return { seed: opts.seed, mode: opts.mode, fromVersion: opts.fromVersion, seasons: [], problems: [`v${opts.fromVersion} save failed to migrate: ${res.message}`], ms: 0 };
    loadState(res.state);
  }
  registerAllSystems();
  const seasons: SeasonSample[] = [];
  let minMoney = getState().money;
  const note = (msg: string): void => {
    const s = getState();
    if (problems.length < 20) problems.push(`S${s.season}W${s.week}: ${msg}`);
  };
  for (const p of checkState(getState())) note(p);

  withFastForward(() => {
    for (let i = 0; i < opts.seasons * WEEKS_PER_SEASON; i++) {
      if (getState().sacked) break;
      if (opts.mode === 'managed') manage();
      const before = getState().season;
      try {
        advanceWeek();
      } catch (err) {
        note(`tick threw: ${(err as Error).message}`);
        break;
      }
      const s = getState();
      minMoney = Math.min(minMoney, s.money);
      for (const p of checkState(s)) note(p);
      if (s.season !== before) {
        const text = JSON.stringify(s);
        const back = migrateState(JSON.parse(text));
        if (!back.ok) note(`save does not reload: ${back.message}`);
        else if (JSON.stringify(back.state) !== text) note('save changes on reload');
        const strengths = s.league.clubs.filter((c) => c.id !== s.clubId).map((c) => c.strength);
        seasons.push({
          season: before,
          money: s.money,
          minMoney,
          squad: s.squad.length,
          freeAgents: s.freeAgents.length,
          saveBytes: text.length,
          rivalStrength: [Math.min(...strengths), Math.max(...strengths)],
          reputation: s.reputation,
          sacked: !!s.sacked,
        });
        minMoney = s.money;
      }
    }
  });
  // Save growth: a season's save shouldn't keep getting bigger (history aside).
  if (seasons.length >= 3) {
    const first = seasons[0]!.saveBytes;
    const last = seasons[seasons.length - 1]!.saveBytes;
    if (last > first * 1.5) note(`save grew ${Math.round((last / first) * 100)}% over ${seasons.length} seasons (${first} → ${last} bytes)`);
  }
  setState({});
  return { seed: opts.seed, mode: opts.mode, ...(opts.difficulty ? { difficulty: opts.difficulty } : {}), ...(opts.fromVersion !== undefined ? { fromVersion: opts.fromVersion } : {}), seasons, problems, ms: Date.now() - t0 };
}

/** Versions an old save can come from (every migration's starting point). */
export const OLD_VERSIONS: readonly number[] = MIGRATIONS.map((m) => m.from);
