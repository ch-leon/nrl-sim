import { careerActionClock } from './season';
import { validatePlayerPopulation } from '../systems/playerCareer';
import { validMatchIncome } from '../systems/matchIncome';
// Save boundary only. Historical defaults belong to MIGRATIONS, never to ticks.
import { FINANCE_LINES, SAVE_VERSION, type GameState, type Lineup, type Player, type PlayerStats, type PlacedFacility } from './state';
import { createCeilings } from '../systems/potential';
import { POSITIONS, shownStats } from '../data/player';
import { FACILITY_CATALOG } from '../data/facility';
import { TRAIT_IDS } from '../data/traits';
import type { ActiveModifier, SeasonFinance } from './state';
import type { ImmediateEffect } from '../data/events';
import { isBasePlayId } from '../data/plays';
import { BOARD, GRID_W, GRID_H } from '../config';
import { BENCH, isRotation } from '../match/league/bench';
import { isAttackPreset, isDefencePreset } from '../match/league/presets';
import { LINEUP_SLOTS, resolveLineup } from '../systems/lineup';
import { competitionRewardsProblem } from '../data/competitionRewards';
import type { IndividualChallengeRecord } from '../data/individualChallenges';
import { individualChallengeOwnerProblem } from '../systems/individualChallengeEvidence';
import type { RunningCamp } from '../data/playerAssignments';
import { assignmentOwnerProblem } from '../systems/assignmentEvidence';
import { competitionInstanceId, validateCompetitions } from '../data/competition';
import { FINANCE_TIERS, tierForRank } from '../data/financeRules';
import { canonicalLeagueJson, validateLeagueHistory } from '../data/leagueCareer';
import { CARD_PASS, CARD_WEEK, cardDefById } from '../data/cards';

export interface SaveRepair { field: string; problem: string; repair: string; rationale: string; notification: string }
export const REPAIR_NOTICE = 'Career lineup repaired. The original save has been kept in recovery.';
export const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const range = (v: unknown, lo: number, hi = Infinity): v is number => finite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo = 0, hi = Infinity): v is number => range(v, lo, hi) && Number.isInteger(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const oneOf = (v: unknown, values: readonly unknown[]): boolean => values.includes(v);
const knownTrait = (v: unknown): boolean => typeof v === 'string' && TRAIT_IDS.some(id => id === v);
const stats = ['speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'] as const;
const unique = (xs: readonly unknown[]): boolean => new Set(xs).size === xs.length;
function validHome(v: unknown): boolean {
  return record(v) && typeof v.town === 'string' && ['region', 'country'].every(k => v[k] === undefined || typeof v[k] === 'string') && (v.lat === undefined || range(v.lat, -90, 90)) && (v.lon === undefined || range(v.lon, -180, 180));
}
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);

export function isPlayerStats(v: unknown): v is PlayerStats {
  return record(v) && !('skill' in v) && stats.every(k => range(v[k], 1, 100));
}
function tally(v: unknown): boolean {
  return record(v) && ['games', 'tries', 'tackles', 'lineBreaks'].every(k => integer(v[k])) && (v.sinBins === undefined || integer(v.sinBins));
}
export function isPlayer(v: unknown, version = SAVE_VERSION): v is Player {
  if (!record(v) || !text(v.id) || !text(v.name) || !integer(v.age, 1) || !oneOf(v.position, POSITIONS) || !isPlayerStats(v.stats)) return false;
  // Missing means a pre-ceiling v24 career. Present ceilings must be complete.
  // Do not reject legacy v24 training above a stored ceiling. The weekly
  // progression tick clamps those stats; never lift the stored ceiling.
  if (v.ceilings !== undefined) {
    const ceilings = v.ceilings;
    if (!record(ceilings) || !Object.keys(ceilings).every(k => stats.includes(k as typeof stats[number]) && range(ceilings[k], 1, 100))
      || !shownStats(v.position as Player['position']).every(k => range(ceilings[k], 1, 100))) return false;
  }
  // Injury recovery is fractional; contracts and ages are not. Debt is a career
  // balance, never a reason to clamp a player's wage or fabricate a contract.
  if (!range(v.morale, 1, 100) || !range(v.injuryRisk, 0, 100) || !range(v.injuredWeeks, 0) || !range(v.wage, 0) || !integer(v.contractWeeks)) return false;
  if (v.xp !== undefined && !range(v.xp, 0)) return false;
  if (v.level !== undefined && !integer(v.level, 1)) return false;
  if (v.unspentPoints !== undefined && !integer(v.unspentPoints)) return false;
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
  if (v.constructionSpend !== undefined && !integer(v.constructionSpend)) return false;
  const def = FACILITY_CATALOG[v.defId as keyof typeof FACILITY_CATALOG];
  return integer(v.x, 0, GRID_W - def.footprint.w) && integer(v.y, 0, GRID_H - def.footprint.h);
}

/** Finance gained its books in v10 and the overhead line in v17. Missing
 * historical overhead is defaulted by that migration; every other line must
 * already exist. Deltas are signed amounts, not nonnegative balances. */
function isTerm(v: unknown, after?: number): boolean {
  return record(v) && integer(v.salary) && Number.isSafeInteger(v.salary)
    && integer(v.startSeason, after ?? 1) && integer(v.endSeason, v.startSeason as number)
    && (v.endSeason as number) <= (v.startSeason as number) + 2;
}
function isDeal(v: unknown): boolean {
  if (!isTerm(v)) return false;
  if (!record(v) || v.renewal === undefined) return true;
  return isTerm(v.renewal, (v.endSeason as number) + 1) && record(v.renewal) && v.renewal.startSeason === (v.endSeason as number) + 1;
}
function isCapAccount(v: unknown): boolean {
  return record(v) && v.rulesVersion === 1 && oneOf(v.tier, ['local', 'championship', 'premier'])
    && integer(v.purchasedLevel, 0, 3)
    && (v.lastPurchaseSeason === null || integer(v.lastPurchaseSeason, 1))
    && oneOf(v.earnedBasisPoints, [0, 500, 1000])
    && strings(v.receipts) && unique(v.receipts)
    && strings(v.protectedIds) && unique(v.protectedIds);
}

/** Current allowances must identify an owned, unchanged agreement exactly. */
function validProtection(account: Record<string, unknown>, players: unknown, season: number): boolean {
  const terms = account.protectedTerms;
  if (terms === undefined) return (account.protectedIds as string[]).length === 0;
  if (!Array.isArray(terms) || !Array.isArray(players)) return false;
  const seen = new Set<string>();
  for (const term of terms) {
    if (!record(term) || Object.keys(term).sort().join(',') !== 'endSeason,playerId,salary,startSeason'
      || !text(term.playerId) || !isTerm(term) || (term.endSeason as number) < season) return false;
    const key = JSON.stringify([term.playerId, term.salary, term.startSeason, term.endSeason]);
    if (seen.has(key)) return false;
    seen.add(key);
    const player = players.find(p => record(p) && p.id === term.playerId);
    if (!record(player) || !record(player.deal)) return false;
    const owned = [player.deal, player.deal.renewal].some(t => record(t) && t.salary === term.salary && t.startSeason === term.startSeason && t.endSeason === term.endSeason);
    if (!owned) return false;
  }
  const ids = [...new Set(terms.map(t => (t as Record<string, unknown>).playerId))];
  return ids.length === (account.protectedIds as string[]).length && ids.every(id => (account.protectedIds as string[]).includes(id as string));
}

export function isSeasonFinance(v: unknown, version = SAVE_VERSION): v is SeasonFinance {
  // Totals consume every present line, including extra keys preserved by the UI.
  if (!record(v) || !integer(v.season, 1) || !Object.values(v).every(finite)) return false;
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

/** The published normal career may contain scheduled kickoff promises, but
 * accepted results already include both the ordinary and prize settlements. */
function settledCupProblem(state: GameState): string | null {
  const c = state.competitions;
  if (!c?.leagueCareer) return null;
  const template = c.openCupEntry?.current.definition;
  const rewards = new Map(state.competitionRewards.map(r => [r.fixtureId,r]));
  const ordinary = new Map(state.matchIncome.map(r => [r.fixture.id,r]));
  for (const instance of c.instances) {
    if (!instance.definition.rewards.some(p => p.execution)) continue;
    for (const f of instance.fixtures) {
      if (ordinary.has(f.id) !== rewards.has(f.id)) return 'unpaired League cup promises';
    }
  }
  const divisions = c.world!.divisions;
  const base = (season: number, clubId: string): number | undefined => {
    const division = divisions.find(d => c.instances.some(i =>
      i.id === competitionInstanceId(c.world!.profile.id + ':' + d.id,season,0) && i.entrantIds.includes(clubId)));
    return division && FINANCE_TIERS[tierForRank(division.rank)].matchBase;
  };
  for (const reward of rewards.values()) {
    const instance = c.instances.find(i => i.id === reward.instanceId);
    if (!instance) {
      const final = template?.stages[0];
      if (!template || !final || !Object.values(FINANCE_TIERS).some(tier => tier.matchBase === reward.matchBase)
        || reward.season >= state.season-1 || reward.status !== 'settled'
        || !reward.receipts.some(r => r.kind === 'honour') || reward.definitionId !== template.id
        || reward.definitionVersion !== template.version || reward.definitionName !== template.name
        || reward.instanceId !== competitionInstanceId(template.id,reward.season,0)
        || reward.stageId !== final.id || reward.round !== final.rounds || reward.slot !== final.slotIds?.[final.rounds-1]
        || canonicalLeagueJson(reward.policies.map(p=>p.policy)) !== canonicalLeagueJson(template.rewards.filter(p=>p.round === final.rounds)))
        return 'unsupported reward history';
      continue;
    }
    const fixture = instance.fixtures.find(f => f.id === reward.fixtureId)!;
    const income = ordinary.get(fixture.id);
    if (!income || ((fixture.status === 'completed' || fixture.status === 'cancelled') && (reward.status !== 'settled' || !income.receipt)))
      return 'unsettled League competition reward';
    const home = base(instance.season,fixture.homeId), away = base(instance.season,fixture.awayId);
    if (!home || !away || reward.matchBase !== (fixture.neutral ? Math.min(home,away) : home)) return 'League cup sporting match base';
  }
  return null;
}

function cardDate(v: unknown): v is Record<string, unknown> {
  return record(v) && integer(v.season, 1) && integer(v.week, 1);
}

function cardOffer(v: unknown): v is Record<string, unknown> {
  return cardDate(v) && Array.isArray(v.cards) && v.cards.length >= 1 && v.cards.length <= CARD_WEEK.OFFER_SIZE
    && v.cards.every(isOfferedCard) && unique(v.cards.map(c => c.cardId));
}

function cardWeekCommon(v: unknown): v is Record<string, unknown> {
  if (!record(v) || !integer(v.rng, 0, 0xffffffff) || !integer(v.owed, 0, CARD_WEEK.MAX_OWED)) return false;
  if (!Array.isArray(v.history) || !v.history.every(h => cardDate(h) && text(h.cardId))) return false;
  if (!strings(v.cardPlayers) || !unique(v.cardPlayers)) return false;
  if (!Array.isArray(v.cardTraits) || !v.cardTraits.every(t => record(t) && text(t.playerId) && knownTrait(t.trait))
    || !unique(v.cardTraits.map(t => `${t.playerId}:${t.trait}`))) return false;
  if (v.lastMatch !== undefined) {
    const m = v.lastMatch;
    if (!cardDate(m) || typeof m.opponentName !== 'string' || !Array.isArray(m.rows)) return false;
    if (!m.rows.every(r => record(r) && text(r.playerId) && text(r.name) && integer(r.tries) && integer(r.tackles) && integer(r.lineBreaks))) return false;
  }
  return true;
}

export function isCardWeekV36(v: unknown): boolean {
  return cardWeekCommon(v) && (v.offer === null || cardOffer(v.offer));
}

function isActiveCard(v: unknown): boolean {
  if (!record(v) || !text(v.cardId) || !integer(v.level, 1, 3)) return false;
  switch (v.kind) {
    case 'staff': {
      const def = cardDefById(v.cardId);
      return def?.kind === 'staff' && record(v.member) && text(v.member.name)
        && integer(v.member.wage) && integer(v.member.hiredSeason, 1)
        && (typeof def.role === 'string' ? v.member.role === def.role && v.member.speciality === undefined
          : v.member.role === 'attackCoach' && v.member.speciality === def.role.attackCoach);
    }
    case 'setPlay': return cardDefById(v.cardId)?.kind === 'setPlay' && isBasePlayId(v.playId);
    case 'player': case 'dilemma': case 'trait': return cardDefById(v.cardId)?.kind === v.kind && text(v.playerId);
    case 'cash': return cardDefById(v.cardId)?.kind === 'cash';
    case 'buff': case 'decree': return cardDate(v) && (v.playerId === undefined || text(v.playerId));
    default: return false;
  }
}

export function isCardWeek(v: unknown): boolean {
  if (!cardWeekCommon(v) || !integer(v.starterLeft, 0, CARD_WEEK.STARTER_PICKS) || !integer(v.owed, 0, CARD_WEEK.MAX_OWED)) return false;
  const starterLeft = v.starterLeft;
  if (!Array.isArray(v.offers) || v.offers.length !== starterLeft + v.owed) return false;
  const grants = v.grants;
  const seenGrant = v.seenGrant;
  if (!integer(grants, v.offers.length) || !integer(seenGrant, 0, grants)) return false;
  const identified = v.offers.some(o => record(o) && o.grant !== undefined);
  let previous = 0;
  for (const [i, o] of v.offers.entries()) {
    if (!cardOffer(o) || (i < starterLeft ? o.kind !== 'starter' : !oneOf(o.kind, ['match', 'decree']))
      || (o.fromClubId !== undefined && !text(o.fromClubId))) return false;
    if (identified) {
      if (!integer(o.grant, previous + 1, grants)) return false;
      previous = o.grant;
    }
    const stolen = (o.cards as unknown[]).filter(c => record(c) && c.fromClubId !== undefined);
    if (stolen.length > 1 || stolen.some(c => record(c) && (o.kind !== 'match' || c.fromClubId !== o.fromClubId))) return false;
    if (o.seen !== undefined && (o.seen !== true || !integer(o.grant, 1, seenGrant))) return false;
  }
  if (!Array.isArray(v.hand) || v.hand.length > CARD_WEEK.HAND_CAP || !v.hand.every(h => record(h) && isOfferedCard(h.offered)
    && record(h.offered) && h.cardId === h.offered.cardId && integer(h.level, 1, 3)
    && integer(h.gotSeason, 1) && integer(h.gotWeek, 1))) return false;
  if (!Array.isArray(v.history) || !v.history.every(h => h.action === undefined || (oneOf(h.action, ['take', 'pass', 'expire', 'discard', 'play', 'reroll'])
    && (h.action !== 'pass' || h.cardId === CARD_PASS) && (h.action !== 'expire' || h.cardId === 'expired')))) return false;
  if (!Array.isArray(v.cardTraits) || !v.cardTraits.every(t => t.level === undefined || integer(t.level, 1, 3))) return false;
  if (!Array.isArray(v.active) || !v.active.every(isActiveCard)) return false;
  if (!cardDate(v.rerolls) || !integer(v.rerolls.count)) return false;
  if (!record(v.strikes) || !integer(v.strikes.season, 1) || !integer(v.strikes.count) || !integer(v.strikes.lossRun)
    || !Array.isArray(v.strikes.log) || !v.strikes.log.every(l => record(l) && integer(l.week, 1) && oneOf(l.reason, ['margin', 'run']))) return false;
  return v.decree === null || (record(v.decree) && integer(v.decree.season, 1) && text(v.decree.id));
}

function isOfferedCard(c: unknown): boolean {
  if (!record(c) || !text(c.cardId)) return false;
  const def = cardDefById(c.cardId);
  if (!def || c.kind !== def.kind) return false;
  const steal = c.cardId.startsWith('steal-');
  if (steal ? !text(c.fromClubId) : c.fromClubId !== undefined) return false;
  switch (def.kind) {
    case 'player': case 'dilemma':
      return isPlayer(c.player) && integer(c.salary, 1)
        && (!steal || c.cardId === `steal-player:${c.player.position}:${c.player.id}`)
        && (c.replacesId === undefined ? c.replacesName === undefined : text(c.replacesId) && text(c.replacesName));
    case 'staff': return text(c.name);
    case 'setPlay': return isBasePlayId(c.playId) && (!steal || c.cardId === `steal-play:${c.playId}`);
    case 'trait': case 'cash': return true;
  }
}

export function hasV33Fields(v: Record<string, unknown>): boolean {
  if ('competitionRewards' in v) return true;
  if (record(v.league) && Array.isArray(v.league.clubs) && v.league.clubs.some(c => record(c) && 'reputation' in c)) return true;
  const c = v.competitions;
  return record(c) && ('openCupEntry' in c || Array.isArray(c.instances) && c.instances.some(i =>
    record(i) && record(i.definition) && Array.isArray(i.definition.rewards) && i.definition.rewards.some(p =>
      record(p) && ['execution','basis','squad'].some(key => key in p))));
}

/** Validate structures a migration reads before it can spread/map/dereference
 * them. Required fields are version-aware; optional fields are checked if present.
 * Does not select a pack or pull the lazy UK chunk into the synchronous boundary.
 * These persisted season limits are AU 24+3 and UK 22+3 (content/au.ts, uk.ts).
 */
export function validateInput(v: Record<string, unknown>, version: number, runningCamp?: RunningCamp, runningChallenge?: IndividualChallengeRecord): string | null {
  const fail = (field: string): string => `Invalid save data: ${field}.`;
  // JSON can decode 1e400 as Infinity. Include optional nested numeric fields,
  // not only required scalars, before any migration uses or defaults them.
  const finiteTree = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value)
    : Array.isArray(value) ? value.every(finiteTree) : record(value) ? Object.values(value).every(finiteTree) : true;
  if (!finiteTree(v)) return fail('non-finite number');
  if (v.pack !== undefined && !oneOf(v.pack, ['au', 'uk'])) return fail('pack');
  if (v.clubId !== 'player' || !text(v.clubName) || !finite(v.money) || !integer(v.season, 1) || !integer(v.week, 1) || !range(v.reputation, 1, 100) || !integer(v.rngSeed, 0, 0xffffffff)) return fail('career fields');
  if (v.preseason !== undefined && !oneOf(v.preseason, [0, 1, 2])) return fail('preseason');
  for (const key of ['coachName', 'groundName']) if (v[key] !== undefined && typeof v[key] !== 'string') return fail(key);
  if (v.weather !== undefined && !oneOf(v.weather, ['clear', 'rain', 'wind'])) return fail('weather');
  if (v.home !== undefined && !validHome(v.home)) return fail('home');
  const ids = new Set<string>();
  const roster = (list: unknown): boolean => Array.isArray(list) && list.every(p => {
    if (!isPlayer(p, version) || ids.has(p.id)) return false;
    if (version < 30 && 'clubHistory' in p) return false;
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
    if ('reputation' in c && (c.id === 'player' || !range(c.reputation, 1, 100))) return fail('rival reputation');
    if (c.home !== undefined && !validHome(c.home)) return fail('club home');
    clubs.add(c.id);
    // Pre-v8 catalogues had no rival squads. A missing current roster must not
    // be regenerated; an empty league is legitimate before initLeague.
    if ((c.squad !== undefined || (version >= 8 && c.id !== 'player')) && !roster(c.squad)) return fail('rival squad');
  }
  if ('individualChallenges' in v || (version < 35 && record(v.competitions) && 'individualChallenges' in v.competitions)) return fail('individual challenge version');
  if (version < 30 && 'playerPopulation' in v) return fail('player population version');
  if (v.cardWeek !== undefined && (version < 36 || !(version === 36 ? isCardWeekV36(v.cardWeek) : isCardWeek(v.cardWeek)) || !record(v.competitions) || v.competitions.leagueCareer === undefined)) return fail('card week');
  if (clubs.size && !clubs.has('player')) return fail('player club reference');
  if (v.competitions !== undefined) {
    if (version < 25) return fail('competition metadata version');
    if (record(v.competitions) && 'assignments' in v.competitions && version < 34) return fail('assignment version');
    if (record(v.competitions) && v.competitions.calendar !== undefined && version < 26) return fail('competition calendar version');
    if (record(v.competitions) && v.competitions.leagueCareer !== undefined && version < 31) return fail('league career version');
    if (record(v.competitions) && v.competitions.world !== undefined && version < 27) return fail('division world version');
    const problem = validateCompetitions(v.competitions, { pack: v.pack === 'uk' ? 'uk' : 'au', season: v.season as number, week: v.week as number, clubIds: [...clubs], runningChallenge, clubId: v.clubId as string, ...(runningCamp ? {runningCamp} : {}) });
    if (problem) return fail(problem);
  }
  if (version >= 30) {
    // The competition/progression boundary above must verify the pending phase
    // before management history may reach its target-year action date. Annual
    // intake and retirement bounds remain tied to the raw source year.
    const state = v as unknown as GameState;
    const problem = validatePlayerPopulation(state, careerActionClock(state));
    if (problem) return fail(problem);
  }
  if ((!record(v.competitions) || v.competitions.calendar === undefined) && !integer(v.week, 1, v.pack === 'uk' ? 25 : 27)) return fail('career fields');
  for (const f of v.league.fixtures) {
    if (!record(f) || !integer(f.round, -1, v.pack === 'uk' ? 25 : 27) || !text(f.homeId) || !text(f.awayId) || !clubs.has(f.homeId) || !clubs.has(f.awayId) || f.homeId === f.awayId || (f.result !== undefined && (!record(f.result) || !integer(f.result.homeScore) || !integer(f.result.awayScore)))) return fail('fixture');
    if (f.unplayed !== undefined && typeof f.unplayed !== 'boolean') return fail('unplayed fixture');
  }
  const ladderIds: unknown[] = [];
  for (const row of v.league.ladder) {
    if (!record(row) || !text(row.clubId) || !clubs.has(row.clubId) || !['played', 'wins', 'draws', 'losses', 'pointsFor', 'pointsAgainst', 'points'].every(k => integer(row[k]))) return fail('ladder');
    ladderIds.push(row.clubId);
  }
  if (!unique(ladderIds)) return fail('duplicate ladder club');
  if (!record(v.settings) || typeof v.settings.muted !== 'boolean' || typeof v.settings.tutorialDone !== 'boolean' || !range(v.settings.volume, 0, 1) || (version >= 3 && !oneOf(v.settings.difficulty, ['easy', 'normal', 'hard']))) return fail('settings');
  for (const key of ['coachCalls', 'liveRivals', 'keyMoments', 'weekSummary', 'teamLetters', 'spendPointsMyself']) if (v.settings[key] !== undefined && typeof v.settings[key] !== 'boolean') return fail(`settings.${key}`);
  if ((v.settings.playbackSpeed !== undefined && !oneOf(v.settings.playbackSpeed, [1, 2, 4, 8])) || (v.settings.textSize !== undefined && !oneOf(v.settings.textSize, ['normal', 'large', 'larger'])) || (v.settings.hintsSeen !== undefined && !strings(v.settings.hintsSeen))) return fail('settings preferences');
  if (!Array.isArray(v.history) || !v.history.every(record)) return fail('history');
  const assignmentProblem = assignmentOwnerProblem(v as unknown as GameState) ?? individualChallengeOwnerProblem(v as unknown as GameState,runningChallenge);
  if (assignmentProblem) return fail(assignmentProblem);

  if (version >= 5 && (!range(v.boardPatience, 0, BOARD.MAX_PATIENCE) || !Array.isArray(v.objectives) || !v.objectives.every(record))) return fail('board');
  if (version >= 7 && (!record(v.eventDeck) || !integer(v.eventDeck.rng, 0, 0xffffffff) || !Array.isArray(v.eventDeck.pending) || !v.eventDeck.pending.every(record) || !Array.isArray(v.eventDeck.modifiers) || !v.eventDeck.modifiers.every(isActiveModifier) || !record(v.eventDeck.cooldowns) || !integer(v.eventDeck.lastDrawn))) return fail('eventDeck');
  if (version >= 10 && (!Array.isArray(v.finance) || !v.finance.every(e => isSeasonFinance(e, version)))) return fail('finance');
  if (version >= 21 && record(v.eventDeck) && !strings(v.eventDeck.flags)) return fail('eventDeck.flags');
  if (v.lineup !== undefined && !record(v.lineup)) return fail('lineup');
  if (version >= 16 && (!record(v.training) || !oneOf(v.training.focus, ['balanced', ...stats]))) return fail('training');
  if (version >= 18 && (!record(v.boardLoan) || !range(v.boardLoan.owed, 0))) return fail('boardLoan');
  if (version >= 19 && (!Array.isArray(v.staff) || !v.staff.every(s => record(s) && oneOf(s.role, ['assistantCoach', 'analyst', 'welfare', 'attackCoach']) && text(s.name) && range(s.wage, 0) && integer(s.hiredSeason, 1) && (s.speciality === undefined || oneOf(s.speciality, ['direct', 'width', 'kicking', 'razzle']))) || !unique(v.staff.map(s => s.role)))) return fail('staff');
  if (version >= 29 && !validMatchIncome(v.matchIncome, { season: v.season as number, league: v.league as unknown as GameState['league'], competitions: v.competitions as GameState['competitions'] })) return fail('match income');
  if (version >= 33) {
    const state = v as unknown as GameState;
    const problem = competitionRewardsProblem(v.competitionRewards, state);
    if (problem) return fail(problem);
    const admission = settledCupProblem(state);
    if (admission) return fail(admission);
  }
  if (record(v.competitions) && v.competitions.leagueCareer !== undefined) {
    const problem = validateLeagueHistory(v as unknown as GameState);
    if (problem) return fail(problem);
    const progress = (v as unknown as GameState).competitions!.leagueCareer!;
    if (progress.phase === 'next-season-choice' && (v as unknown as GameState).matchIncome.some(r => r.season === v.season && !r.receipt)) return fail('league career unsettled income');
  }
  if (version >= 28) {
    if (!isCapAccount(v.capAccount)) return fail('cap');
    const deals = (list: unknown, required: boolean): boolean => Array.isArray(list) && list.every(p => record(p) && (p.deal === undefined ? !required : isDeal(p.deal)));
    if (!deals(v.squad, true) || !deals(v.freeAgents, false)) return fail('deals');
    if (version >= 32 && !validProtection(v.capAccount as Record<string, unknown>, v.squad, v.season as number)) return fail('cap protection');
    for (const c of v.league.clubs as Record<string, unknown>[]) {
      if (c.id === 'player' || c.squad === undefined) continue;
      if (!integer(c.cash) || !Number.isSafeInteger(c.cash) || !isCapAccount(c.capAccount) || !deals(c.squad, true)) return fail('rival account');
      if (version >= 32 && !validProtection(c.capAccount as Record<string, unknown>, c.squad, v.season as number)) return fail('rival protection');
    }
  }
  return null;
}

export type ValidationResult = { ok: true; state: GameState; repairs: SaveRepair[] } | { ok: false; message: string };
export function validateCurrent(v: Record<string, unknown>, runningCamp?: RunningCamp, runningChallenge?: IndividualChallengeRecord): ValidationResult {
  const problem = validateInput(v, SAVE_VERSION, runningCamp, runningChallenge);
  if (problem) return { ok: false, message: problem };
  const bad = (field: string): ValidationResult => ({ ok: false, message: `Invalid save data: ${field}.` });
  const tactics = (t: unknown): boolean => record(t) && isAttackPreset(t.attack as string) && isDefencePreset(t.defence as string);
  if (!Array.isArray(v.recentPlans) || !v.recentPlans.every(tactics)) return bad('recentPlans');
  if (!record(v.playbook) || !Array.isArray(v.playbook.owned) || !v.playbook.owned.every(isBasePlayId) || !unique(v.playbook.owned)) return bad('playbook');
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
  if (!record(l) || !Array.isArray(l.starters) || l.starters.length !== LINEUP_SLOTS.length || !l.starters.every(id => id === null || text(id)) || !strings(l.bench) || l.bench.length > BENCH.size || !isRotation(l.rotation as string) || !tactics(l.tactics) || ![l.kicker, l.captain].every(id => id === null || text(id)) || !Array.isArray(l.plays) || !l.plays.every(isBasePlayId) || !unique(l.plays) || !l.plays.every(id => (v.playbook as { owned: unknown[] }).owned.includes(id))) return bad('lineup');
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
  // Compatible additions within format 24. Copy only players missing fields;
  // preserve existing ceilings, raw input, selections and all RNG state.
  let backfilled = false;
  const roster = (players: Player[]): Player[] => players.map(p => {
    if (p.ceilings !== undefined && p.xp !== undefined && p.level !== undefined && p.unspentPoints !== undefined) return p;
    backfilled = true;
    return { ...p, ceilings: p.ceilings ?? createCeilings(p), xp: p.xp ?? 0, level: p.level ?? 1, unspentPoints: p.unspentPoints ?? 0 };
  });
  const squad = roster(state.squad);
  const freeAgents = roster(state.freeAgents);
  const clubs = state.league.clubs.map(c => c.squad ? { ...c, squad: roster(c.squad) } : c);
  const compatible = backfilled ? { ...state, squad, freeAgents, league: { ...state.league, clubs } } : state;
  return { ok: true, state: repairs.length ? { ...compatible, lineup } : compatible, repairs };
}
