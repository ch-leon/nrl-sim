// Save boundary only. Historical defaults belong to MIGRATIONS, never to ticks.
import { FINANCE_LINES, SAVE_VERSION, type GameState, type Lineup, type Player, type PlayerStats, type PlacedFacility } from './state';
import { POSITIONS } from '../data/player';
import { FACILITY_CATALOG } from '../data/facility';
import { TRAIT_IDS } from '../data/traits';
import type { ActiveModifier, SeasonFinance } from './state';
import type { ImmediateEffect } from '../data/events';
import { isPlayId } from '../data/plays';
import { BOARD, GRID_W, GRID_H } from '../config';
import { BENCH, isRotation } from '../match/league/bench';
import { isAttackPreset, isDefencePreset } from '../match/league/presets';
import { LINEUP_SLOTS, resolveLineup } from '../systems/lineup';

export interface SaveRepair { field: string; problem: string; repair: string; rationale: string; notification: string }
export const REPAIR_NOTICE = 'Career lineup repaired. The original save has been kept in recovery.';
export const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const range = (v: unknown, lo: number, hi = Infinity): v is number => finite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo = 0, hi = Infinity): v is number => range(v, lo, hi) && Number.isInteger(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const oneOf = (v: unknown, values: readonly unknown[]): boolean => values.includes(v);
const knownTrait = (v: unknown): boolean => typeof v === 'string' && TRAIT_IDS.some(id => id === v);
const stats = ['speed', 'strength', 'stamina', 'skill', 'footyIQ'] as const;
const unique = (xs: readonly unknown[]): boolean => new Set(xs).size === xs.length;
function validHome(v: unknown): boolean {
  return record(v) && typeof v.town === 'string' && ['region', 'country'].every(k => v[k] === undefined || typeof v[k] === 'string') && (v.lat === undefined || range(v.lat, -90, 90)) && (v.lon === undefined || range(v.lon, -180, 180));
}
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);

export function isPlayerStats(v: unknown): v is PlayerStats {
  return record(v) && stats.every(k => range(v[k], 1, 100));
}
function tally(v: unknown): boolean {
  return record(v) && ['games', 'tries', 'tackles', 'lineBreaks'].every(k => integer(v[k])) && (v.sinBins === undefined || integer(v.sinBins));
}
export function isPlayer(v: unknown, version = SAVE_VERSION): v is Player {
  if (!record(v) || !text(v.id) || !text(v.name) || !integer(v.age, 1) || !oneOf(v.position, POSITIONS) || !isPlayerStats(v.stats)) return false;
  // Injury recovery is fractional; contracts and ages are not. Debt is a career
  // balance, never a reason to clamp a player's wage or fabricate a contract.
  if (!range(v.morale, 1, 100) || !range(v.injuryRisk, 0, 100) || !range(v.injuredWeeks, 0) || !range(v.wage, 0) || !integer(v.contractWeeks)) return false;
  if (v.suspendedWeeks !== undefined && !integer(v.suspendedWeeks)) return false;
  if (['junior', 'departed'].some(k => v[k] !== undefined && typeof v[k] !== 'boolean')) return false;
  if (v.joinedSeason !== undefined && !integer(v.joinedSeason, 1)) return false;
  if (v.career !== undefined && !tally(v.career)) return false;
  if (v.seasonStats !== undefined && (!tally(v.seasonStats) || !record(v.seasonStats) || !integer(v.seasonStats.season, 1))) return false;
  if (!Array.isArray(v.traits)) return false;
  if (version <= 5) return v.traits.every(t => typeof t === 'string' || (record(t) && knownTrait(t.id) && integer(t.level, 1, 3)));
  return v.traits.every(t => record(t) && typeof t.id === 'string' && knownTrait(t.id) && integer(t.level, 1, 3)) && unique(v.traits.map(t => (t as Record<string, unknown>).id));
}
export function isPlacedFacility(v: unknown): v is PlacedFacility {
  if (!record(v) || !text(v.id) || typeof v.defId !== 'string' || !Object.prototype.hasOwnProperty.call(FACILITY_CATALOG, v.defId) || !integer(v.level, 1, 3)) return false;
  const def = FACILITY_CATALOG[v.defId as keyof typeof FACILITY_CATALOG];
  return integer(v.x, 0, GRID_W - def.footprint.w) && integer(v.y, 0, GRID_H - def.footprint.h);
}

/** Finance gained its books in v10 and the overhead line in v17. Missing
 * historical overhead is defaulted by that migration; every other line must
 * already exist. Deltas are signed amounts, not nonnegative balances. */
export function isSeasonFinance(v: unknown, version = SAVE_VERSION): v is SeasonFinance {
  if (!record(v) || !integer(v.season, 1)) return false;
  return FINANCE_LINES.every(line => line === 'overhead' && version < 17 && v[line] === undefined
    ? true : finite(v[line]));
}

/** ActiveModifier persists ImmediateEffect[], rather than nested chance or
 * modifier declarations. Validate every discriminated payload before ticks can
 * consume it. Missing/departed subjects are still legitimate frozen references. */
export function isImmediateEffect(v: unknown): v is ImmediateEffect {
  if (!record(v)) return false;
  switch (v.kind) {
    case 'money':
    case 'reputation':
    case 'squadMorale':
    case 'playerMorale':
    case 'boardPatience':
      return finite(v.amount);
    case 'playerWage':
      return range(v.pct, -1); // a full wage cut is valid; a negative resulting wage is not
    case 'playerTrait':
      return knownTrait(v.trait);
    case 'signSubject':
    case 'closeGates':
      return true;
    case 'flag':
      return text(v.id);
    case 'suspend': {
      const weeks = v.weeks;
      const validWeeks = integer(weeks) || (Array.isArray(weeks) && weeks.length === 2
        && integer(weeks[0]) && integer(weeks[1]) && weeks[0] <= weeks[1]);
      return validWeeks && oneOf(v.source, ['event', 'trip', 'judiciary']);
    }
    default:
      return false;
  }
}

export function isActiveModifier(v: unknown): v is ActiveModifier {
  return record(v) && text(v.id) && text(v.cardId) && text(v.label)
    && oneOf(v.trigger, ['weekly', 'win', 'loss']) && integer(v.weeksLeft, 1)
    && Array.isArray(v.effects) && v.effects.every(isImmediateEffect)
    && (v.subjectId === undefined || text(v.subjectId))
    && (v.subjectName === undefined || typeof v.subjectName === 'string');
}

/** Validate structures a migration reads before it can spread/map/dereference
 * them. Required fields are version-aware; optional fields are checked if present.
 * Does not select a pack or pull the lazy UK chunk into the synchronous boundary.
 * These persisted season limits are AU 24+3 and UK 22+3 (content/au.ts, uk.ts).
 */
export function validateInput(v: Record<string, unknown>, version: number): string | null {
  const fail = (field: string): string => `Invalid save data: ${field}.`;
  // JSON can decode 1e400 as Infinity. Include optional nested numeric fields,
  // not only required scalars, before any migration uses or defaults them.
  const finiteTree = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value)
    : Array.isArray(value) ? value.every(finiteTree) : record(value) ? Object.values(value).every(finiteTree) : true;
  if (!finiteTree(v)) return fail('non-finite number');
  if (v.pack !== undefined && !oneOf(v.pack, ['au', 'uk'])) return fail('pack');
  if (v.clubId !== 'player' || !text(v.clubName) || !finite(v.money) || !integer(v.season, 1) || !integer(v.week, 1, v.pack === 'uk' ? 25 : 27) || !range(v.reputation, 1, 100) || !integer(v.rngSeed, 0, 0xffffffff)) return fail('career fields');
  if (v.preseason !== undefined && !oneOf(v.preseason, [0, 1, 2])) return fail('preseason');
  for (const key of ['coachName', 'groundName']) if (v[key] !== undefined && typeof v[key] !== 'string') return fail(key);
  if (v.weather !== undefined && !oneOf(v.weather, ['clear', 'rain', 'wind'])) return fail('weather');
  if (v.home !== undefined && !validHome(v.home)) return fail('home');
  const ids = new Set<string>();
  const roster = (list: unknown): boolean => Array.isArray(list) && list.every(p => {
    if (!isPlayer(p, version) || ids.has(p.id)) return false;
    ids.add(p.id); return true;
  });
  if (!roster(v.squad)) return fail('squad');
  if (!roster(v.freeAgents)) return fail('freeAgents');
  if (!Array.isArray(v.facilities) || !v.facilities.every(isPlacedFacility) || !unique(v.facilities.map(f => f.id))) return fail('facilities');
  const facilities = v.facilities as PlacedFacility[];
  for (let i = 0; i < facilities.length; i++) {
    const a = facilities[i]!; const ad = FACILITY_CATALOG[a.defId];
    for (const b of facilities.slice(i + 1)) {
      const bd = FACILITY_CATALOG[b.defId];
      if ((ad.unique && a.defId === b.defId) || (a.x < b.x + bd.footprint.w && b.x < a.x + ad.footprint.w && a.y < b.y + bd.footprint.h && b.y < a.y + ad.footprint.h)) return fail('overlapping/unique facilities');
    }
  }
  if (v.unlocks !== undefined && (!record(v.unlocks) || !strings(v.unlocks.facilities) || !unique(v.unlocks.facilities) || !v.unlocks.facilities.every(id => Object.prototype.hasOwnProperty.call(FACILITY_CATALOG, id)) || (v.unlocks.screens !== undefined && !strings(v.unlocks.screens)))) return fail('unlocks');
  if (!record(v.league) || !Array.isArray(v.league.clubs) || !Array.isArray(v.league.fixtures) || !Array.isArray(v.league.ladder)) return fail('league');
  const clubs = new Set<string>();
  for (const c of v.league.clubs) {
    if (!record(c) || !text(c.id) || clubs.has(c.id) || !text(c.name) || !range(c.strength, 1, 100) || !Array.isArray(c.colors) || c.colors.length !== 2 || !c.colors.every(x => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x))) return fail('league.clubs');
    if (c.home !== undefined && !validHome(c.home)) return fail('club home');
    clubs.add(c.id);
    // Pre-v8 catalogues had no rival squads. A missing current roster must not
    // be regenerated; an empty league is legitimate before initLeague.
    if ((c.squad !== undefined || (version >= 8 && c.id !== 'player')) && !roster(c.squad)) return fail('rival squad');
  }
  if (clubs.size && !clubs.has('player')) return fail('player club reference');
  for (const f of v.league.fixtures) {
    if (!record(f) || !integer(f.round, -1, v.pack === 'uk' ? 25 : 27) || !text(f.homeId) || !text(f.awayId) || !clubs.has(f.homeId) || !clubs.has(f.awayId) || f.homeId === f.awayId || (f.result !== undefined && (!record(f.result) || !integer(f.result.homeScore) || !integer(f.result.awayScore)))) return fail('fixture');
  }
  const ladderIds: unknown[] = [];
  for (const row of v.league.ladder) {
    if (!record(row) || !text(row.clubId) || !clubs.has(row.clubId) || !['played', 'wins', 'draws', 'losses', 'pointsFor', 'pointsAgainst', 'points'].every(k => integer(row[k]))) return fail('ladder');
    ladderIds.push(row.clubId);
  }
  if (!unique(ladderIds)) return fail('duplicate ladder club');
  if (!record(v.settings) || typeof v.settings.muted !== 'boolean' || typeof v.settings.tutorialDone !== 'boolean' || !range(v.settings.volume, 0, 1) || (version >= 3 && !oneOf(v.settings.difficulty, ['easy', 'normal', 'hard']))) return fail('settings');
  for (const key of ['coachCalls', 'liveRivals', 'keyMoments', 'weekSummary', 'teamLetters']) if (v.settings[key] !== undefined && typeof v.settings[key] !== 'boolean') return fail(`settings.${key}`);
  if ((v.settings.playbackSpeed !== undefined && !oneOf(v.settings.playbackSpeed, [1, 2, 4, 8])) || (v.settings.textSize !== undefined && !oneOf(v.settings.textSize, ['normal', 'large', 'larger'])) || (v.settings.hintsSeen !== undefined && !strings(v.settings.hintsSeen))) return fail('settings preferences');
  if (!Array.isArray(v.history) || !v.history.every(record)) return fail('history');
  if (version >= 5 && (!range(v.boardPatience, 0, BOARD.MAX_PATIENCE) || !Array.isArray(v.objectives) || !v.objectives.every(record))) return fail('board');
  if (version >= 7 && (!record(v.eventDeck) || !integer(v.eventDeck.rng, 0, 0xffffffff) || !Array.isArray(v.eventDeck.pending) || !v.eventDeck.pending.every(record) || !Array.isArray(v.eventDeck.modifiers) || !v.eventDeck.modifiers.every(isActiveModifier) || !record(v.eventDeck.cooldowns) || !integer(v.eventDeck.lastDrawn))) return fail('eventDeck');
  if (version >= 10 && (!Array.isArray(v.finance) || !v.finance.every(e => isSeasonFinance(e, version)))) return fail('finance');
  if (version >= 21 && record(v.eventDeck) && !strings(v.eventDeck.flags)) return fail('eventDeck.flags');
  if (v.lineup !== undefined && !record(v.lineup)) return fail('lineup');
  if (version >= 16 && (!record(v.training) || !oneOf(v.training.focus, ['balanced', ...stats]))) return fail('training');
  if (version >= 18 && (!record(v.boardLoan) || !range(v.boardLoan.owed, 0))) return fail('boardLoan');
  if (version >= 19 && (!Array.isArray(v.staff) || !v.staff.every(s => record(s) && oneOf(s.role, ['assistantCoach', 'analyst', 'welfare', 'attackCoach']) && text(s.name) && range(s.wage, 0) && integer(s.hiredSeason, 1) && (s.speciality === undefined || oneOf(s.speciality, ['direct', 'width', 'kicking', 'razzle']))) || !unique(v.staff.map(s => s.role)))) return fail('staff');
  return null;
}

export type ValidationResult = { ok: true; state: GameState; repairs: SaveRepair[] } | { ok: false; message: string };
export function validateCurrent(v: Record<string, unknown>): ValidationResult {
  const problem = validateInput(v, SAVE_VERSION);
  if (problem) return { ok: false, message: problem };
  const bad = (field: string): ValidationResult => ({ ok: false, message: `Invalid save data: ${field}.` });
  const tactics = (t: unknown): boolean => record(t) && isAttackPreset(t.attack as string) && isDefencePreset(t.defence as string);
  if (!Array.isArray(v.recentPlans) || !v.recentPlans.every(tactics)) return bad('recentPlans');
  if (!record(v.playbook) || !Array.isArray(v.playbook.owned) || !v.playbook.owned.every(isPlayId) || !unique(v.playbook.owned)) return bad('playbook');
  const repairs: SaveRepair[] = [];
  const repair = (field: string, problem: string, action: string, rationale: string): void => {
    repairs.push({ field, problem, repair: action, rationale, notification: REPAIR_NOTICE });
  };
  if (!record(v.lineup)) return bad('lineup');
  let l = v.lineup;
  for (const field of ['starters', 'bench', 'kicker', 'captain'] as const) {
    if (l[field] !== undefined) continue;
    const value = field === 'starters' ? LINEUP_SLOTS.map(() => null) : field === 'bench' ? [] : null;
    l = { ...l, [field]: value };
    repair(`lineup.${field}`, 'missing selection', field === 'starters' || field === 'bench' ? 'resolveLineup' : 'clear to null', 'Existing selection rules supply the missing selection from the existing squad or use the default leader.');
  }
  if (!record(l) || !Array.isArray(l.starters) || l.starters.length !== LINEUP_SLOTS.length || !l.starters.every(id => id === null || text(id)) || !strings(l.bench) || l.bench.length > BENCH.size || !isRotation(l.rotation as string) || !tactics(l.tactics) || ![l.kicker, l.captain].every(id => id === null || text(id)) || !Array.isArray(l.plays) || !l.plays.every(isPlayId) || !unique(l.plays) || !l.plays.every(id => (v.playbook as { owned: unknown[] }).owned.includes(id))) return bad('lineup');
  const state = v as unknown as GameState;
  let lineup = l as unknown as Lineup;
  const selected = [...lineup.starters.filter(id => id !== null), ...lineup.bench];
  const duplicateSelection = !unique(selected);
  if (duplicateSelection) {
    repair('lineup.selection', 'duplicate player selection', 'resolveLineup', 'A player cannot occupy two selections; existing lineup rules keep the first and select replacements deterministically.');
  }
  if (repairs.some(r => r.repair === 'resolveLineup')) {
    // The resolver also clears departed leader ids. Preserve those legitimate
    // saved choices: this repair owns missing selections and duplicates only.
    const resolved = resolveLineup(lineup, state.squad).lineup;
    const missingStarters = repairs.some(r => r.field === 'lineup.starters');
    lineup = {
      ...resolved,
      // Reconstructing a missing bench must not rewrite saved starter intent.
      starters: missingStarters || duplicateSelection ? resolved.starters : lineup.starters,
      kicker: lineup.kicker,
      captain: lineup.captain,
    };
  }
  return { ok: true, state: repairs.length ? { ...state, lineup } : state, repairs };
}
