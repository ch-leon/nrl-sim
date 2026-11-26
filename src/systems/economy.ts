// FIN v1 economy: contract clock, presentation quotes and cash bookkeeping.
// Ordinary income settles at the accepted-result boundary (matchIncome.ts).
// Waiting neither earns income nor pays salaries, staff wages or upkeep.

import { emptyFinance, getState, setState, type FinanceLine, type Fixture, type GameState, type PlacedFacility } from '../core/state';
import { bus, type Events } from '../core/events';
import { ECON, SEASON_ROUNDS, WEEKS_PER_SEASON, difficultyMultipliers } from '../config';
import { sortLadder } from './fixtures';
import { FACILITY_CATALOG, facilityUpkeep } from '../data/facility';
import { closedGatesFlag, EVENT_CARDS } from '../data/events';
import { careerActionClock, currentRound, inTrials } from '../core/season';
import { registerSeasonHook, registerTickHook, TICK_ORDER } from '../core/time';
import { leagueClubResults, leagueSeasonView } from './leagueSeasonView';
import { competitionLadder, hasStructuralCalendar } from './competitionCalendar';
import { staffWages } from './staff';
import { BOARD_LOAN, BOARD_LOAN_REPAID, warnForWeeks, notifyContractWarning } from './contracts';
import { FINANCE_TIERS, matchCashQuote, type FinanceLevel, type FinanceTier } from '../data/financeRules';
import { expireEndedDeals, reconcileClubProtection } from './cap';
import { reconcileMatchEffects, commitMatchState, fixtureMatchBase, matchIncomeTier } from './matchIncome';

/**
 * Level of the built facility with `defId`, or 0 if none is built. Placement
 * blocks duplicates of these, but older saves may hold two: the best one counts.
 */
function facilityLevel(state: GameState, defId: 'sponsorBoard' | 'grandstand'): number {
  return state.facilities.reduce((m, pf) => (pf.defId === defId ? Math.max(m, pf.level) : m), 0);
}

/** Σ of every squad player's weekly wage, scaled by the difficulty's wage multiplier. */
export function weeklyWages(state: GameState): number {
  const base = state.squad.reduce((sum, p) => sum + p.wage, 0);
  return Math.round(base * difficultyMultipliers(state.settings.difficulty).wages);
}

/**
 * Σ weekly upkeep of every built facility at its level (N6, #164):
 * the running cost that grows with the grounds. A defId the catalog no longer
 * knows costs nothing rather than crashing an old save.
 */
export function weeklyUpkeep(state: GameState): number {
  return state.facilities.reduce((sum, pf) => {
    const def = FACILITY_CATALOG[pf.defId];
    return sum + (def ? facilityUpkeep(def, pf.level) : 0);
  }, 0);
}

/**
 * The club's running costs a week (N12.3): staff, travel, insurance.
 * ECON.OVERHEAD_WEEKLY × the difficulty's overhead multiplier, the same whatever
 * the club has built or signed, so an idle club cannot shed it; plus the wages of
 * the staff it has hired (N14.5), paid on the same line.
 */
export function weeklyOverhead(state: GameState): number {
  return Math.round(ECON.OVERHEAD_WEEKLY * difficultyMultipliers(state.settings.difficulty).overhead) + staffWages(state);
}

/** Sponsor Board return per eligible played match. Reputation never changes this quote. */
export function sponsorReturn(level: number, _reputation: number, tier: FinanceTier = 'premier'): number {
  return matchCashQuote({ matchBase: FINANCE_TIERS[tier].matchBase, kind: 'played', venue: 'away', result: 'loss', sponsorLevel: Math.max(0, Math.min(3, level)) as FinanceLevel }).sponsor;
}

/** Sponsor extra per eligible match at the club's own tier (not a weekly grant). */
export function sponsorIncome(state: GameState): number {
  return sponsorReturn(facilityLevel(state, 'sponsorBoard'), state.reputation, matchIncomeTier(state));
}

/** Retired passive revenue: waiting never earns cash. */
export function reputationGrant(_state: GameState): number { return 0; }
export function weeklyIncome(_state: GameState): number { return 0; }

/**
 * Find the current week's fixture for the player club, if any. Reads
 * state.league.fixtures defensively (WU-7 owns population): matches a fixture on
 * `round === state.week` involving the player club. Returns undefined when the
 * league is unpopulated or there is no such fixture (bye/finals-skip week).
 */
function currentFixture(state: GameState): GameState['league']['fixtures'][number] | undefined {
  const fixtures = state.league?.fixtures ?? [];
  return fixtures.find(
    (f) => f.round === currentRound(state)
      && (f.homeId === state.clubId || f.awayId === state.clubId),
  );
}

// ── Gates with a roof (N6, #169) ──────────────────────────────────────────────

/** Seats on the grounds: ECON.CAPACITY by Grandstand level (0 = the hill). */
export function groundCapacity(state: GameState): number {
  return ECON.CAPACITY[facilityLevel(state, 'grandstand')] ?? ECON.CAPACITY[0];
}

/**
 * Form as the crowd sees it: (wins − losses) ÷ FORM_GAMES over the club's last
 * FORM_GAMES results before `round` this season, so −1 (five losses) to +1
 * (five wins); a side yet to play is 0.
 */
export function recentForm(state: GameState, round = state.week): number {
  const mine = state.league.fixtures
    .filter((f) => f.result && f.round > 0 && f.round < round && (f.homeId === state.clubId || f.awayId === state.clubId))
    .sort((a, b) => b.round - a.round)
    .slice(0, ECON.FORM_GAMES);
  let score = 0;
  for (const f of mine) {
    const home = f.homeId === state.clubId;
    const us = home ? f.result!.homeScore : f.result!.awayScore;
    const them = home ? f.result!.awayScore : f.result!.homeScore;
    score += us > them ? 1 : us < them ? -1 : 0;
  }
  return score / ECON.FORM_GAMES;
}

/** Is `clubId` in the top eight of the ladder, once it has played? */
function topEight(state: GameState, clubId: string): boolean {
  const rows = sortLadder(state.league.ladder);
  const idx = rows.findIndex((r) => r.clubId === clubId);
  return idx >= 0 && idx < 8 && rows[idx]!.played > 0;
}

export interface GateEstimate {
  /** Seats: ECON.CAPACITY by Grandstand level. */
  capacity: number;
  /** Fans who would come: reputation, form and the occasion. */
  demand: number;
  /** min(capacity, demand). */
  attendance: number;
  receipts: number;
  /** Demand exceeds the seats (presentation only, not a cash multiplier). */
  soldOut: boolean;
}

/**
 * The crowd a home `fixture` would draw at `state`, and what it pays:
 *   demand     = (ATTEND_BASE + reputation × ATTEND_PER_REP) × form × occasion
 *   attendance = min(groundCapacity, demand)
 * Venue receipts use the fixed FIN v1 base/stand quote, not attendance.
 * Form is 1 ± FORM_SWING × recentForm before the fixture's round; the occasion
 * is FINALS_MULT for a home final, BIG_MATCH_MULT for a top-eight opponent.
 * The Finance screen projects the next home gate with this same function.
 */
export function homeGate(state: GameState, fixture: Fixture): GateEstimate {
  const base = ECON.ATTEND_BASE + state.reputation * ECON.ATTEND_PER_REP;
  const view = leagueSeasonView(state);
  const saved = view?.fixtures.find(f => f.instance.id === fixture.competitionId && f.fixture.id === fixture.id);
  const slot = saved?.slot ?? fixture.slot ?? state.week;
  const formValue = view ? leagueClubResults(view, state.clubId).filter(f => f.slot !== null && f.slot < slot)
    .slice(-ECON.FORM_GAMES).reduce((n, f) => n + (f.result === 'W' ? 1 : f.result === 'L' ? -1 : 0), 0) / ECON.FORM_GAMES
    : recentForm(state, fixture.round);
  const form = 1 + ECON.FORM_SWING * formValue;
  const opponent = fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId;
  // Crowd appeal follows the saved sporting field before this date. Its cash
  // quote below is fixed independently of form, standings and attendance.
  const priorLadder = view ? competitionLadder({ ...view.instance, fixtures: view.fixtures
    .filter(f => f.instance.id === view.instance.id && f.status === 'completed' && f.slot !== null && f.slot < slot)
    .map(f => f.fixture) }) : [];
  const opponentPlace = priorLadder.findIndex(r => r.clubId === opponent && r.played > 0);
  const bigMatch = view ? opponentPlace >= 0 && opponentPlace < view.finalsSize : topEight(state, opponent);
  const final = view ? saved?.stageKind === 'knockout' || saved?.stageKind === 'series' : fixture.round > SEASON_ROUNDS;
  const occasion = final ? ECON.FINALS_MULT : bigMatch ? ECON.BIG_MATCH_MULT : 1;
  const demand = Math.round(base * form * occasion);
  const capacity = groundCapacity(state);
  const closed = state.eventDeck.flags.includes(closedGatesFlag(state.season, view ? slot : fixture.round));
  const attendance = closed ? 0 : Math.min(capacity, demand);
  // Crowd presentation is independent of the fixed venue payment. Never multiply
  // attendance by ticket prices or apply a hidden difficulty modifier to cash.
  const context = state.competitions?.instances.find(i => i.id === fixture.competitionId);
  const actual = context?.fixtures.find(f => f.id === fixture.id);
  const matchBase = fixtureMatchBase(state, fixture, actual?.neutral ?? false);
  const receipts = matchCashQuote({ matchBase,
    kind: fixture.unplayed || actual?.status === 'cancelled' || actual?.result?.decider === 'forfeit' ? 'unplayed' : context?.definition.format.kind === 'exhibition' || (!context && fixture.round <= 0) ? 'trial' : 'played',
    venue: actual?.neutral ? 'neutral' : fixture.homeId === state.clubId ? 'home' : 'away', result: 'loss',
    grandstandLevel: facilityLevel(state, 'grandstand') as FinanceLevel,
  }).home;
  return { capacity, demand, attendance, receipts, soldOut: !closed && demand > capacity };
}

/** What the next Grandstand level would draw and pay at a sold-out fixture's demand. */
export interface StandProjection {
  /** The Grandstand level it would take: 1 builds a stand on the hill, 2–3 upgrade it. */
  level: number;
  /** Its seats (ECON.CAPACITY at that level). */
  capacity: number;
  /** min(that capacity, today's demand). */
  attendance: number;
  receipts: number;
  /** receipts − today's gate: what the bigger stand adds a game. */
  gain: number;
}

/**
 * What the next Grandstand level would earn at `fixture` (N12): homeGate on the
 * same state with that stand built. The fixed venue-income increase applies
 * even below capacity. Null for trials, neutral/away fixtures and at the top level.
 */
export function nextStandGate(state: GameState, fixture: Fixture): StandProjection | null {
  const today = homeGate(state, fixture);
  const level = facilityLevel(state, 'grandstand') + 1;
  if (ECON.CAPACITY[level] === undefined || fixture.round <= 0 || fixture.homeId !== state.clubId
    || state.competitions?.instances.find(i => i.id === fixture.competitionId)?.fixtures.find(f => f.id === fixture.id)?.neutral) return null;
  // facilityLevel takes the best Grandstand, so one more at the next level stands in for the upgrade.
  const stand: PlacedFacility = { id: 'projected-stand', defId: 'grandstand', level: level as PlacedFacility['level'], x: 0, y: 0 };
  const bigger = homeGate({ ...state, facilities: [...state.facilities, stand] }, fixture);
  if (bigger.receipts <= today.receipts) return null;
  return { level, capacity: bigger.capacity, attendance: bigger.attendance, receipts: bigger.receipts, gain: bigger.receipts - today.receipts };
}

/**
 * Gate receipts, applied on a HOME-game week only (homeGate for the current
 * fixture). Returns 0 on away/bye weeks and when the league is empty.
 */
export function gateReceipts(state: GameState): number {
  const fixture = currentFixture(state);
  if (!fixture || fixture.homeId !== state.clubId) return 0;
  return homeGate(state, fixture).receipts;
}

/**
 * Count a week off each contract. Salaries are not repriced and nobody leaves
 * for money: a deal ends at season rollover (expireEndedDeals), not midweek.
 * Weeks stop at zero so a counted contract cannot go negative.
 */
export function tickContracts(state: GameState): GameState {
  let changed = false;
  const squad = state.squad.map(player => {
    if (player.contractWeeks <= 0) return player;
    changed = true;
    const weeks = player.contractWeeks - 1;
    if (weeks > 0 && !player.deal?.renewal) {
      const warning = warnForWeeks(player.name, weeks);
      if (warning) notifyContractWarning(warning);
    }
    return { ...player, contractWeeks: weeks };
  });
  if (changed) setState({ squad });
  return getState();
}

/**
 * Finance-driven failure is retired (#557). A negative balance does not sell
 * a player, cut morale, or sack the coach. Cash still cannot be created by
 * waiting, and salaries are not what puts a club in the red.
 */
export function handleBankruptcy(_state: GameState): GameState {
  return getState();
}

/**
 * Tick hook order 30. Time passing does not spend cash: wages, upkeep and
 * overhead are retired. Sponsor, reputation grant and the home gate still
 * credit cash until receipt-backed income replaces them (#559). Contracts
 * count down without a salary bill.
 */
export function applyEconomy(state: GameState): GameState {
  commitMatchState(reconcileMatchEffects(state));
  if (hasStructuralCalendar(state)) return getState();
  if (!inTrials(state)) tickContracts(getState());
  return getState();
}

/** Candidate-only expiry owner. The legacy structural-calendar skip stays in the hook. */
export function expirePlayerDeals(state: GameState, seasonWeeks = WEEKS_PER_SEASON): { state: GameState; notices: Events['ui:notify'][] } {
  const next = expireEndedDeals(state.squad, state.freeAgents, state.capAccount, state.season, seasonWeeks);
  if (next.squad.length === state.squad.length && next.squad.every((p, i) => p === state.squad[i]) && next.capAccount === state.capAccount) return { state, notices: [] };
  const left = state.squad.filter(player => !next.squad.some(kept => kept.id === player.id));
  return { state: { ...state, ...next }, notices: left.length ? [{
    text: left.length === 1 ? `${left[0]!.name} is unsigned. The deal ended with last season.`
      : `${left.length} players are unsigned. Their deals ended with last season.`, kind: 'info',
  }] : [] };
}

/**
 * Install the economy tick hook (order 30). Called explicitly by the orchestrator
 * (main.ts) — importing this module has no side effects. The hook reads/writes
 * the live store via getState/setState.
 */
export function registerEconomySystem(): void {
  registerTickHook('economy', TICK_ORDER.economy, () => {
    applyEconomy(getState());
  }, { trials: true });
  // Before ageing and the Academy intake, so a finished deal is unsigned first.
  // The structural prototype does not run this career finance clock.
  registerSeasonHook('cap-season', 4, () => {
    const s = getState();
    if (hasStructuralCalendar(s)) {
      const next = reconcileClubProtection(s);
      if (next !== s) setState({ capAccount: next.capAccount, league: next.league });
      return;
    }
    const { state: next, notices } = expirePlayerDeals(s);
    if (next === s) return;
    setState({ squad: next.squad, freeAgents: next.freeAgents, capAccount: next.capAccount });
    for (const notice of notices) bus.emit('ui:notify', notice);
  });
}

// ── The club's books (N6, #172) ───────────────────────────────────────────────

/** Event modifiers that pay or cost money ('Merch royalties', …) use their label as the ledger reason. */
const MODIFIER_LABELS = new Set(EVENT_CARDS.flatMap((c) => c.choices.flatMap((ch) => ch.effects.flatMap((e) =>
  (e.kind === 'modifier' && e.effects.some((x) => x.kind === 'money') ? [e.label] : [])))));

/**
 * The line of the books a ledger reason belongs to. Reasons are the strings each
 * system passes to earnMoney / spendMoney: this file's fixed words, the board's,
 * `event: <title>` and modifier labels from the deck, `card: <title>` from the card week, and `<verb>:<id>` for
 * signings, sales, renewals, releases and the grounds. Anything else is `other`.
 */
export function classifyReason(reason: string): FinanceLine {
  // An Undo (#370) books against the line it reverses, so the season nets to zero.
  if (reason.startsWith('undo:')) return classifyReason(reason.slice(5));
  if (reason === 'wages') return 'wages';
  if (reason === 'upkeep') return 'upkeep';
  if (reason === 'overhead') return 'overhead';
  if (reason === 'sponsor') return 'sponsor';
  if (reason === 'grant' || reason === 'sponsor+grant') return 'grant';
  if (reason === 'gate') return 'gate';
  if (reason === 'finals prize money') return 'prize';
  if (reason === 'board grant' || reason === BOARD_LOAN || reason === BOARD_LOAN_REPAID) return 'boardGrant';
  // A card week's cash card (#846) books like an event card's money.
  if (reason.startsWith('event: ') || reason.startsWith('card: ') || MODIFIER_LABELS.has(reason)) return 'events';
  if (/^(sign|sell):/.test(reason)) return 'transfers';
  if (/^(renew|release):/.test(reason)) return 'contracts';
  // A set play bought from the Playbook (#326) is spent on the club like a build.
  if (/^(build|upgrade|move|demolish|play):/.test(reason)) return 'facilities';
  return 'other';
}

/** Σ of a season's lines: its net money movement. */
export function financeNet(f: Record<FinanceLine, number>): number {
  let n = 0;
  for (const l of Object.keys(f) as FinanceLine[]) n += f[l];
  return n;
}

/** The lines the rollover pays for the season just played (fixtures-season hook → applyBoardReview). */
const CLOSING_LINES: ReadonlySet<FinanceLine> = new Set(['prize', 'boardGrant']);

/** Where a money movement belongs: its line of the books and the season and week it is stamped with. */
export interface MovementStamp { line: FinanceLine; season: number; week: number }

/**
 * Stamp a movement at its explicit owner date, or the canonical action clock.
 * Legacy and unmarked DEV careers retain their existing closing rule:
 * the rollover pays the finals prize money and the board grant after the season
 * counter has moved to the next season, in week 1, so those two lines at week 1
 * close the season just played: they are stamped to its last week
 * (WEEKS_PER_SEASON, the week whose advance paid them). The books
 * (registerFinanceSystem) and the Finance screen's weekly ledger both stamp with
 * this, so the two always agree on where the rollover's money belongs (N12).
 */
export function stampMovement(state: Pick<GameState, 'season' | 'week' | 'finance' | 'preseason'> & Partial<Pick<GameState, 'competitions'>>,
  reason: string, explicit?: Pick<MovementStamp, 'season' | 'week'>): MovementStamp {
  const line = classifyReason(reason);
  // Explicit owner receipts take precedence in both the books and the ledger.
  if (explicit) return { line, season: explicit.season, week: explicit.week };
  const clock = careerActionClock(state);
  // League planning belongs to the target year without moving the stored
  // sporting cursor. Marked active years use their actual authored slot.
  if (clock.structural) return { line, season: clock.season, week: clock.week };
  // A loan taken in week 1 is that season's; its repayment, like the grant, closes the one before.
  const closing = state.week === 1 && CLOSING_LINES.has(line) && reason !== BOARD_LOAN && state.finance.some((e) => e.season === state.season - 1);
  return closing
    ? { line, season: state.season - 1, week: WEEKS_PER_SEASON }
    : { line, season: state.season, week: currentRound(state) };
}

/**
 * Keep the club's books: every money:changed delta is added to its line in the
 * entry for the season stampMovement gives (opened on the first movement, so a
 * save written at any moment loads right). Explicit owner dates take priority;
 * League planning uses its target year. Legacy rollover prize money and board
 * grants retain their existing closing-season date.
 * Pure bookkeeping: nothing here depends on the order listeners fire in. Called
 * once from main.ts (and the soak); returns the unsubscribe.
 */
export function registerFinanceSystem(): () => void {
  return bus.on('money:changed', ({ delta, reason, booked, stamp }) => {
    if (booked) return;
    const s = getState();
    const { line, season } = stampMovement(s, reason, stamp);
    const books = s.finance.some((e) => e.season === season)
      ? s.finance
      : [...s.finance, emptyFinance(season)].sort((a, b) => a.season - b.season);
    setState({ finance: books.map((e) => (e.season === season ? { ...e, [line]: e[line] + delta } : e)) });
  });
}
