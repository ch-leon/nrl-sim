// src/qa/soak.ts — headless multi-season soak of the club/league systems (QA pass).
// Plays whole seasons through the real tick pipeline (every system main.ts
// registers, with matches auto-simmed) and checks invariants every week: no NaN
// or Infinity anywhere in GameState, no player in two places, rival squads never
// empty, the events deck within its limits, saves that round-trip through
// migrateState. It also builds old-version saves (v1–v8) from a live game and
// plays on from them, and plays on from any real save handed to it (the corpus in
// tests/fixtures/saves, tests/qa/corpus.test.ts). Used by scripts/soak.ts (npm run
// soak) and, at a smaller size, by tests/qa/soak.test.ts. Never imported by the
// game. No Phaser.
import { createNewGame, getState, loadState, setState, type GameState, type Player } from '../core/state';
import { advanceWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../core/time';
import { bus } from '../core/events';
import { migrateState, MIGRATIONS } from '../core/save';
import { EVENTS, GRID_H, GRID_W, ON_FIELD, SEASON_ROUNDS, SQUAD_CAP, WEEKS_PER_SEASON, type Difficulty } from '../config';
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
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import { addFacility, spendMoney } from '../data/club';

/** How the headless manager plays: hands-off, or a simple sensible manager. */
export type SoakMode = 'idle' | 'managed';

export interface SoakOptions {
  seed: number;
  seasons: number;
  mode: SoakMode;
  /** Start from a save of this version (built from the fresh game) instead of v-current. */
  fromVersion?: number;
  /**
   * Start from this parsed save (any version; it is migrated first) instead of a new
   * game: the save corpus (tests/fixtures/saves) plays on from real phone saves.
   */
  fromSave?: unknown;
  difficulty?: Difficulty;
}

/**
 * The rating gap between the player's club and the league at one moment (#138):
 * the mean overall of the player's best ON_FIELD against the rivals' strength
 * (each rival's strength is the mean overall of its own best nine).
 */
export interface GapSample {
  /** Mean overall of the player's best nine (one decimal). */
  bestNine: number;
  /** Mean rival strength (one decimal). */
  rivalMean: number;
  /** Weakest and strongest rival. */
  rivalRange: [number, number];
}

export interface SeasonSample extends GapSample {
  season: number;
  money: number;
  minMoney: number;
  squad: number;
  freeAgents: number;
  saveBytes: number;
  /** Rival strength range after the rollover (the band the next season starts in). */
  rivalStrength: [number, number];
  reputation: number;
  sacked: boolean;
  // The player's regular season (#138): record, points margin a game, ladder finish.
  wins: number;
  draws: number;
  losses: number;
  /** (points for − points against) ÷ games played; 0 when nothing was played. */
  marginPerGame: number;
  /** 1-based regular-season ladder finish (0 = unknown). */
  ladderPosition: number;
  premiership: boolean;
  // bestNine / rivalMean / rivalRange (GapSample) are taken at the end of the
  // regular season: the squad that produced the record, before the rollover.
  /** Free agents the managed manager signed this season (0 when idle). */
  signings: number;
  /** Total fees paid for those signings. */
  signingFees: number;
  /** Mean overall of the players signed (0 when none). */
  signedOverall: number;
}

export interface SoakResult {
  seed: number;
  mode: SoakMode;
  difficulty?: Difficulty;
  fromVersion?: number;
  /** The rating gap at week 1 of season 1 (how far ahead a new game starts). */
  start: GapSample;
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

/** Mean overall of the best `n` of a squad (not clamped to the rival band), one decimal. */
export function bestNineMean(squad: readonly Player[], n = ON_FIELD): number {
  if (squad.length === 0) return 0;
  const best = squad.map(overallRating).sort((a, b) => b - a).slice(0, n);
  return Math.round((best.reduce((t, x) => t + x, 0) / best.length) * 10) / 10;
}

/** The rating gap right now: the player's best nine against the rivals' strengths. */
export function gapSample(s: GameState): GapSample {
  const strengths = s.league.clubs.filter((c) => c.id !== s.clubId).map((c) => c.strength);
  const rivalMean = strengths.length ? Math.round((strengths.reduce((t, x) => t + x, 0) / strengths.length) * 10) / 10 : 0;
  return {
    bestNine: bestNineMean(s.squad),
    rivalMean,
    rivalRange: strengths.length ? [Math.min(...strengths), Math.max(...strengths)] : [0, 0],
  };
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

/** What the managed manager signed this week, for the season's tally. */
interface Signed { count: number; fees: number; overall: number }

/** The managed manager's policy (#138). Assumed (needs Leon): a plain, sensible club. */
export const MANAGED = {
  /** Facilities it builds, in order, as soon as it can keep BUILD_RESERVE afterwards. */
  BUILDS: ['trainingPaddock', 'teamGym'] as readonly FacilityDefId[],
  BUILD_RESERVE: 40_000,
  /** Never let the squad fall below this many players. */
  SQUAD_FLOOR: 17,
  /** Sign a free agent who beats the ninth-best player by at least this much. */
  STAR_MARGIN: 2,
  /** Money kept back after a star's fee plus WAGE_WEEKS of their wage. */
  STAR_RESERVE: 50_000,
  WAGE_WEEKS: 8,
} as const;

/** Build `defId` on the first free spot (top-left scan), paying its cost. */
function buildFirstFree(defId: FacilityDefId): boolean {
  const s = getState();
  const def = FACILITY_CATALOG[defId];
  const taken = new Set<string>();
  for (const f of s.facilities) {
    const fd = FACILITY_CATALOG[f.defId];
    for (let x = f.x; x < f.x + fd.footprint.w; x++) for (let y = f.y; y < f.y + fd.footprint.h; y++) taken.add(`${x},${y}`);
  }
  const fits = (x: number, y: number): boolean => {
    for (let i = x; i < x + def.footprint.w; i++) for (let j = y; j < y + def.footprint.h; j++) if (taken.has(`${i},${j}`)) return false;
    return true;
  };
  for (let y = 0; y + def.footprint.h <= GRID_H; y++) {
    for (let x = 0; x + def.footprint.w <= GRID_W; x++) {
      if (!fits(x, y)) continue;
      // The same order as placement.ts: place, then pay.
      if (!addFacility(defId, x, y, 1)) return false;
      spendMoney(def.cost, `build:${defId}`);
      return true;
    }
  }
  return false;
}

/** Sign `p`, returning the fee actually paid (or null when the signing failed). */
function trySign(p: Player): number | null {
  const before = getState().money;
  const r = signPlayer(getState(), p.id);
  return r.ok ? before - getState().money : null;
}

/**
 * A plain, sensible manager: answers cards with choice 0; builds a Training
 * Paddock then a Team Gym once it can keep a reserve; keeps SQUAD_FLOOR players
 * (the best free agent it can pay for, fee plus WAGE_WEEKS of wages); and signs
 * one star a week — a free agent who would walk into the best nine — when the
 * fee plus wages still leaves STAR_RESERVE. Signing fees are read off the
 * balance, so the tally follows whatever the fee formula is.
 */
function manage(): Signed {
  const s = getState();
  for (const ev of s.eventDeck.pending) {
    if (cardById(ev.cardId)) chooseEvent(ev.id, 0);
  }
  for (const defId of MANAGED.BUILDS) {
    const st = getState();
    if (st.facilities.some((f) => f.defId === defId)) continue;
    if (st.money - FACILITY_CATALOG[defId].cost < MANAGED.BUILD_RESERVE) break;
    buildFirstFree(defId);
  }
  const out: Signed = { count: 0, fees: 0, overall: 0 };
  const record = (p: Player, fee: number): void => {
    out.count++;
    out.fees += fee;
    out.overall += overallRating(p);
  };
  let st = getState();
  while (st.squad.length < MANAGED.SQUAD_FLOOR) {
    const fits = st.freeAgents
      .filter((p) => !p.junior && SIGNING_FEE_WEEKS * p.wage + p.wage * MANAGED.WAGE_WEEKS < st.money)
      .sort((a, b) => overallRating(b) - overallRating(a))[0];
    if (!fits) break;
    const fee = trySign(fits);
    if (fee === null) break;
    record(fits, fee);
    st = getState();
  }
  if (st.squad.length < SQUAD_CAP) {
    const ninth = st.squad.map(overallRating).sort((a, b) => b - a)[Math.min(ON_FIELD, st.squad.length) - 1] ?? 0;
    const star = st.freeAgents
      .filter((p) => !p.junior && overallRating(p) >= ninth + MANAGED.STAR_MARGIN)
      .sort((a, b) => overallRating(b) - overallRating(a))[0];
    if (star) {
      const budget = st.money - MANAGED.STAR_RESERVE - star.wage * MANAGED.WAGE_WEEKS;
      // The fee is whatever signPlayer charges; trySign refuses if it is more than the balance.
      if (budget > 0 && SIGNING_FEE_WEEKS * star.wage <= budget) {
        const fee = trySign(star);
        if (fee !== null) record(star, fee);
      }
    }
  }
  return out;
}

/** Play `seasons` seasons from a new game (or an old save built from it) and check as we go. */
export function runSoak(opts: SoakOptions): SoakResult {
  const t0 = Date.now();
  bus.clear();
  const problems: string[] = [];
  if (opts.fromSave !== undefined) {
    const res = migrateState(opts.fromSave);
    if (!res.ok) return { seed: opts.seed, mode: opts.mode, start: { bestNine: 0, rivalMean: 0, rivalRange: [0, 0] }, seasons: [], problems: [`save failed to migrate: ${res.message}`], ms: 0 };
    loadState(res.state);
  } else {
    createNewGame(`Soak ${opts.seed}`, opts.seed, { difficulty: opts.difficulty });
    initLeague(getState());
    if (opts.fromVersion !== undefined) {
      const res = migrateState(asOldSave(getState(), opts.fromVersion));
      if (!res.ok) return { seed: opts.seed, mode: opts.mode, fromVersion: opts.fromVersion, start: gapSample(getState()), seasons: [], problems: [`v${opts.fromVersion} save failed to migrate: ${res.message}`], ms: 0 };
      loadState(res.state);
    }
  }
  registerAllSystems();
  const seasons: SeasonSample[] = [];
  let minMoney = getState().money;
  const start = gapSample(getState());
  // The gap at the end of the regular season (after round SEASON_ROUNDS), kept
  // until the rollover sample; the start gap stands in if the season never got there.
  let gap: GapSample = start;
  let signed: Signed = { count: 0, fees: 0, overall: 0 };
  const note = (msg: string): void => {
    const s = getState();
    if (problems.length < 20) problems.push(`S${s.season}W${s.week}: ${msg}`);
  };
  for (const p of checkState(getState())) note(p);

  withFastForward(() => {
    for (let i = 0; i < opts.seasons * WEEKS_PER_SEASON; i++) {
      if (getState().sacked) break;
      if (opts.mode === 'managed') {
        const w = manage();
        signed = { count: signed.count + w.count, fees: signed.fees + w.fees, overall: signed.overall + w.overall };
      }
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
      if (s.season === before && s.week === SEASON_ROUNDS + 1) gap = gapSample(s);
      if (s.season !== before) {
        const text = JSON.stringify(s);
        const back = migrateState(JSON.parse(text));
        if (!back.ok) note(`save does not reload: ${back.message}`);
        else if (JSON.stringify(back.state) !== text) note('save changes on reload');
        const strengths = s.league.clubs.filter((c) => c.id !== s.clubId).map((c) => c.strength);
        // The season's record was pushed onto history by the rollover (fixtures season hook).
        const rec = s.history.find((h) => h.season === before);
        const played = (rec?.wins ?? 0) + (rec?.draws ?? 0) + (rec?.losses ?? 0);
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
          wins: rec?.wins ?? 0,
          draws: rec?.draws ?? 0,
          losses: rec?.losses ?? 0,
          marginPerGame: played ? Math.round((((rec?.pointsFor ?? 0) - (rec?.pointsAgainst ?? 0)) / played) * 10) / 10 : 0,
          ladderPosition: rec?.ladderPosition ?? 0,
          premiership: rec?.premiership ?? false,
          ...gap,
          signings: signed.count,
          signingFees: signed.fees,
          signedOverall: signed.count ? Math.round((signed.overall / signed.count) * 10) / 10 : 0,
        });
        minMoney = s.money;
        gap = gapSample(s);
        signed = { count: 0, fees: 0, overall: 0 };
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
  return { seed: opts.seed, mode: opts.mode, ...(opts.difficulty ? { difficulty: opts.difficulty } : {}), ...(opts.fromVersion !== undefined ? { fromVersion: opts.fromVersion } : {}), start, seasons, problems, ms: Date.now() - t0 };
}

// ── Summary across seeds ─────────────────────────────────────────────────────

/** One season of one mode, averaged over every seed that reached it (#138). */
export interface SeasonSummary {
  mode: SoakMode;
  difficulty: Difficulty;
  season: number;
  runs: number;
  wins: number;
  draws: number;
  losses: number;
  marginPerGame: number;
  ladderPosition: number;
  /** Share of runs that finished in the top eight. */
  finals: number;
  /** Share of runs that won the premiership. */
  premierships: number;
  /** Share of runs sacked by the end of this season. */
  sacked: number;
  bestNine: number;
  rivalMean: number;
  /** bestNine − rivalMean. */
  gap: number;
  rivalRange: [number, number];
  money: number;
  signings: number;
  signingFees: number;
  signedOverall: number;
  /** The start-of-game gap, averaged over the same runs (the same for every season row). */
  startGap: number;
}

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : 0);
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Average the fresh-game runs (not the old-save ones) by mode, difficulty and season. */
export function summariseSeasons(results: readonly SoakResult[]): SeasonSummary[] {
  const groups = new Map<string, SoakResult[]>();
  for (const r of results) {
    if (r.fromVersion !== undefined) continue;
    const key = `${r.mode}/${r.difficulty ?? 'normal'}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: SeasonSummary[] = [];
  for (const [key, runs] of groups) {
    const [mode, difficulty] = key.split('/') as [SoakMode, Difficulty];
    const seasonCount = Math.max(0, ...runs.map((r) => r.seasons.length));
    for (let i = 0; i < seasonCount; i++) {
      const rows = runs.flatMap((r) => (r.seasons[i] ? [r.seasons[i]!] : []));
      if (rows.length === 0) continue;
      const signedRows = rows.filter((s) => s.signings > 0);
      out.push({
        mode, difficulty, season: rows[0]!.season, runs: rows.length,
        wins: r1(mean(rows.map((s) => s.wins))),
        draws: r1(mean(rows.map((s) => s.draws))),
        losses: r1(mean(rows.map((s) => s.losses))),
        marginPerGame: r1(mean(rows.map((s) => s.marginPerGame))),
        ladderPosition: r1(mean(rows.map((s) => s.ladderPosition))),
        finals: r1(mean(rows.map((s) => (s.ladderPosition >= 1 && s.ladderPosition <= 8 ? 1 : 0)))),
        premierships: r1(mean(rows.map((s) => (s.premiership ? 1 : 0)))),
        sacked: r1(mean(rows.map((s) => (s.sacked ? 1 : 0)))),
        bestNine: r1(mean(rows.map((s) => s.bestNine))),
        rivalMean: r1(mean(rows.map((s) => s.rivalMean))),
        gap: r1(mean(rows.map((s) => s.bestNine - s.rivalMean))),
        rivalRange: [Math.min(...rows.map((s) => s.rivalRange[0])), Math.max(...rows.map((s) => s.rivalRange[1]))],
        money: Math.round(mean(rows.map((s) => s.money))),
        signings: r1(mean(rows.map((s) => s.signings))),
        signingFees: Math.round(mean(rows.map((s) => s.signingFees))),
        signedOverall: r1(mean(signedRows.map((s) => s.signedOverall))),
        startGap: r1(mean(runs.map((r) => r.start.bestNine - r.start.rivalMean))),
      });
    }
  }
  return out;
}

/** Versions an old save can come from (every migration's starting point). */
export const OLD_VERSIONS: readonly number[] = MIGRATIONS.map((m) => m.from);
