// FIN v1: kickoff promises and ordinary match receipts share the result boundary.
import { SEASON_ROUNDS } from '../config';
import { bus } from '../core/events';
import { emptyFinance, getState, setState, type Fixture, type GameState } from '../core/state';
import { divisionForClub } from '../data/competitionDivisions';
import { FINANCE_TIERS, matchCashQuote, tierForRank, type FinanceLevel, type FinanceTier, type MatchCashInput, type MatchCashQuote } from '../data/financeRules';

export interface MatchIncomeRecord {
  id: string;
  season: number;
  fixture: Fixture;
  matchBase: number;
  kind: MatchCashInput['kind'];
  neutral: boolean;
  homeSponsor: FinanceLevel;
  awaySponsor: FinanceLevel;
  homeStand: FinanceLevel;
  /** Present together with the cash credit. Reports never create receipts. */
  receipt?: { home: MatchCashQuote; away: MatchCashQuote };
}

function incomeReceipt(record: MatchIncomeRecord, result: {homeScore: number; awayScore: number} | undefined,
  winner: string | undefined, unplayed: boolean): NonNullable<MatchIncomeRecord['receipt']> {
  const fixture = record.fixture;
  const quote = (home: boolean): MatchCashQuote => matchCashQuote({
    matchBase: record.matchBase, kind: unplayed ? 'unplayed' : record.kind,
    venue: record.neutral ? 'neutral' : home ? 'home' : 'away',
    result: winner ? winner === (home ? fixture.homeId : fixture.awayId) ? 'win' : 'loss'
      : !result || result.homeScore === result.awayScore ? 'draw' : (result.homeScore > result.awayScore) === home ? 'win' : 'loss',
    sponsorLevel: home ? record.homeSponsor : record.awaySponsor, grandstandLevel: home ? record.homeStand : 0,
  });
  return {home: quote(true), away: quote(false)};
}

export function incomeIdentity(state: GameState, fixture: Fixture): string {
  return JSON.stringify(['ordinary', state.season, fixture.competitionId ?? 'league', fixture.id ?? '', fixture.round, fixture.homeId, fixture.awayId]);
}
function level(state: GameState, club: string, def: 'sponsorBoard' | 'grandstand'): FinanceLevel {
  return (club === state.clubId ? Math.max(0, ...state.facilities.filter(f => f.defId === def).map(f => f.level)) : 0) as FinanceLevel;
}

/** Selectable League careers may retain a higher salary cap after moving divisions. */
export function matchIncomeTier(state: GameState, clubId: string = state.clubId): FinanceTier {
  const competitions = state.competitions;
  if (competitions?.leagueCareer) {
    const membership = competitions.world && divisionForClub(competitions.world, competitions.instances, clubId);
    if (!membership || membership.instance.season !== state.season) throw new Error('Missing current division for match income');
    return tierForRank(membership.division.rank);
  }
  const account = clubId === state.clubId ? state.capAccount : state.league.clubs.find(c => c.id === clubId)?.capAccount;
  return account?.tier ?? 'premier';
}

/** Shared by kickoff promises and hypothetical gate projections. */
export function fixtureMatchBase(state: GameState, fixture: Fixture, neutral: boolean): number {
  const host = FINANCE_TIERS[matchIncomeTier(state, fixture.homeId)].matchBase;
  return neutral ? Math.min(host, FINANCE_TIERS[matchIncomeTier(state, fixture.awayId)].matchBase) : host;
}

/** Snapshot before play. Completed old fixtures without a promise gain no claim. */
export function freezeMatchIncome(state: GameState, fixture: Fixture): GameState {
  const id = incomeIdentity(state, fixture);
  if (fixture.result || state.matchIncome.some(r => r.id === id)) return state;
  const context = state.competitions?.instances.find(i => i.id === fixture.competitionId);
  const actual = context?.fixtures.find(f => f.id === fixture.id);
  if (context && (!actual || actual.status !== 'scheduled')) return state;
  const neutral = actual?.neutral ?? false;
  const record: MatchIncomeRecord = {
    id, season: state.season, fixture: { ...fixture },
    matchBase: fixtureMatchBase(state, fixture, neutral),
    kind: context?.definition.format.kind === 'exhibition' || (!context && fixture.round <= 0) ? 'trial' : 'played', neutral,
    homeSponsor: level(state, fixture.homeId, 'sponsorBoard'), awaySponsor: level(state, fixture.awayId, 'sponsorBoard'),
    homeStand: level(state, fixture.homeId, 'grandstand'),
  };
  // Keep the current and immediately preceding season for result/review recovery.
  // Older fixtures are no longer in the sporting state; their totals remain in
  // the season books. Retaining every full receipt would grow saves indefinitely.
  return { ...state, matchIncome: [...state.matchIncome.filter(r => r.season >= state.season - 1), record] };
}

/** Reconcile only accepted results with a saved kickoff promise, without replaying sport. */
export function reconcileMatchIncome(state: GameState): GameState {
  let next = state;
  for (const record of state.matchIncome) {
    if (record.receipt || record.season !== state.season) continue;
    const fixture = record.fixture;
    const context = state.competitions?.instances.find(i => i.id === fixture.competitionId);
    if (fixture.competitionId && !context) continue;
    if (!fixture.competitionId && fixture.id) continue;
    const actual = context?.fixtures.find(f => f.id === fixture.id && f.homeId === fixture.homeId && f.awayId === fixture.awayId && f.round === fixture.round && f.stageId === fixture.stageId && f.slot === fixture.slot);
    const legacy = state.league.fixtures.find(f => f.round === fixture.round && f.homeId === fixture.homeId && f.awayId === fixture.awayId);
    const result = context ? actual?.result : legacy?.result;
    // Cancellations settle a canonical saved promise through the existing zero
    // unplayed quote, without manufacturing a sporting result or winner.
    const cancelled = !!context && actual?.status === 'cancelled';
    if (!cancelled && (!result || (context && actual?.status !== 'completed'))) continue;
    const unplayed = cancelled || (context ? actual?.result?.decider === 'forfeit' : legacy?.unplayed === true);
    const winner = context ? actual?.result?.winnerId : result?.homeScore === result?.awayScore && fixture.round > SEASON_ROUNDS ? fixture.homeId : undefined;
    const receipt = incomeReceipt(record, result, winner, unplayed);
    const playerQuote = fixture.homeId === state.clubId ? receipt.home : fixture.awayId === state.clubId ? receipt.away : undefined;
    const money = next.money + (playerQuote?.total ?? 0);
    const clubs = next.league.clubs.map(club => {
      if (cancelled) return club;
      if (club.id === state.clubId || (club.id !== fixture.homeId && club.id !== fixture.awayId)) return club;
      const cash = (club.cash ?? 60_000) + (club.id === fixture.homeId ? receipt.home.total : receipt.away.total);
      if (!Number.isSafeInteger(cash)) throw new Error('Match income exceeds safe cash balance');
      return { ...club, cash };
    });
    if (!Number.isSafeInteger(money)) throw new Error('Match income exceeds safe cash balance');
    const books = next.finance.some(f => f.season === record.season) ? next.finance : [...next.finance, emptyFinance(record.season)];
    next = { ...next, money, league: { ...next.league, clubs },
      finance: playerQuote && !cancelled ? books.map(f => f.season !== record.season ? f : { ...f,
        grant: f.grant + playerQuote.base, gate: f.gate + playerQuote.home,
        sponsor: f.sponsor + playerQuote.sponsor, other: f.other + playerQuote.performance }) : next.finance,
      matchIncome: next.matchIncome.map(r => r.id === record.id ? { ...r, receipt } : r),
    };
  }
  return next;
}

/** Include this patch whenever a result owner commits its returned state. */
export function matchIncomePatch(state: GameState): Pick<GameState, 'money' | 'finance' | 'matchIncome'> {
  return { money: state.money, finance: state.finance, matchIncome: state.matchIncome };
}

/** Bounded, plain-data persistence validation; malformed receipts cannot mint cash. */
export function validMatchIncome(value: unknown, state?: { season: number; league: GameState['league']; competitions?: GameState['competitions'] }): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
  const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
  for (const r of value) {
    if (!object(r) || typeof r.id !== 'string' || ids.has(r.id) || !integer(r.season, 1) || !object(r.fixture)
      || !integer(r.fixture.round, -1) || typeof r.fixture.homeId !== 'string' || typeof r.fixture.awayId !== 'string'
      || r.fixture.homeId === r.fixture.awayId || ![8_000, 12_000, 18_000].includes(Number(r.matchBase))
      || !['played', 'trial', 'unplayed'].includes(String(r.kind)) || typeof r.neutral !== 'boolean'
      || !['homeSponsor', 'awaySponsor', 'homeStand'].every(k => integer(r[k], 0, 3))) return false;
    if (state && r.season > state.season) return false;
    const f = r.fixture;
    if ((!f.competitionId && (f.id !== undefined || f.stageId !== undefined || f.slot !== undefined))
      || (f.competitionId && (typeof f.id !== 'string' || typeof f.stageId !== 'string' || !integer(f.slot, 1)))) return false;
    if (state && r.season === state.season) {
      const canonical = f.competitionId
        ? state.competitions?.instances.find(i => i.id === f.competitionId)?.fixtures.find(x => x.id === f.id && x.stageId === f.stageId && x.slot === f.slot)
        : state.league.fixtures.find(x => x.round === f.round && x.homeId === f.homeId && x.awayId === f.awayId);
      if (!canonical || canonical.round !== f.round || canonical.homeId !== f.homeId || canonical.awayId !== f.awayId) return false;
    }
    if (r.id !== JSON.stringify(['ordinary', r.season, f.competitionId ?? 'league', f.id ?? '', f.round, f.homeId, f.awayId])) return false;
    if (r.receipt !== undefined) {
      if (!object(r.receipt)) return false;
      for (const side of ['home', 'away']) {
        const q = r.receipt[side];
        if (!object(q) || !['base', 'home', 'performance', 'sponsor', 'total'].every(k => integer(q[k]))
          || q.total !== (q.base as number) + (q.home as number) + (q.performance as number) + (q.sponsor as number)) return false;
      }
    }
    if (state?.competitions?.leagueCareer) {
      // Marked careers never import a legacy promise or a receipt detached from
      // the exact retained source fixture. Check quotes as well as arithmetic.
      if (r.season < state.season - 1 || !f.competitionId) return false;
      const instance = state.competitions.instances.find(i => i.id === f.competitionId && i.season === r.season);
      const actual = instance?.fixtures.find(x => x.id === f.id && x.stageId === f.stageId && x.slot === f.slot
        && x.round === f.round && x.homeId === f.homeId && x.awayId === f.awayId);
      if (!actual || actual.neutral !== r.neutral) return false;
      if (r.receipt !== undefined) {
        if (actual.status !== 'completed' && actual.status !== 'cancelled') return false;
        const expected = incomeReceipt(r as unknown as MatchIncomeRecord, actual.result, actual.result?.winnerId,
          actual.status === 'cancelled' || actual.result?.decider === 'forfeit');
        for (const side of ['home', 'away'] as const) {
          const q = (r.receipt as Record<string, unknown>)[side] as Record<string, unknown>;
          if (Object.keys(q).some(k => !['base', 'home', 'performance', 'sponsor', 'total'].includes(k))
            || Object.entries(expected[side]).some(([key, n]) => q[key] !== n)) return false;
        }
      }
    }
    ids.add(r.id);
  }
  return true;
}

/** Commit the sporting state, receipt, wallets and books before notifying observers. */
export function commitMatchState(next: GameState, extra: Partial<GameState> = {}): void {
  const before = getState();
  const delivered = new Set(before.matchIncome.filter(r => r.receipt).map(r => r.id));
  setState({ league: next.league, ...(next.competitions ? { competitions: next.competitions } : {}), ...matchIncomePatch(next), ...extra });
  for (const r of next.matchIncome) {
    if (!r.receipt || delivered.has(r.id)) continue;
    const q = r.fixture.homeId === next.clubId ? r.receipt.home : r.fixture.awayId === next.clubId ? r.receipt.away : undefined;
    if (!q) continue;
    for (const [reason, delta] of [['grant', q.base], ['gate', q.home], ['sponsor', q.sponsor], ['match performance', q.performance]] as const) {
      if (delta) bus.emit('money:changed', { reason, delta, balance: getState().money, booked: true, stamp: { season: r.season, week: r.fixture.slot ?? r.fixture.round } });
    }
  }
}
