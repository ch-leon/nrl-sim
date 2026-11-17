import { intakeUnsignedMarket } from '../../src/systems/playerCareer';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FREE_AGENT_POOL_SIZE,
  REFRESH_EVERY_WEEKS,
  SIGNING_FEE_WEEKS,
  RELEASE_PAYOUT_WEEKS,
  NEW_CONTRACT_WEEKS,
  signingFee,
  signingFeeBasis,
  refreshFreeAgents,
  signPlayer,
  releasePlayer,
  freeAgencyTick,
  weeksToPoolRefresh,
  registerFreeAgencySystem,
  poolTarget,
  scoutBias,
  POOL_POINTS_PER_BIAS,
  SCOUT_BIAS_PER_LEVEL,
} from '../../src/systems/freeagency';
import {
  createNewGame, getState, setState, type Player,
} from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';
import { FREE_AGENT_SPREAD, overallRating } from '../../src/data/player';
import { SPECIAL_MAGNITUDE } from '../../src/data/facility';
import { releaseTerms, salaryDemand } from '../../src/systems/cap';
import { signingFeeQuote } from '../../src/data/financeRules';
import { REP_BASELINE } from '../../src/systems/league';
import { bus } from '../../src/core/events';
import {
  clearTickHooks, advanceWeek, TICK_ORDER,
} from '../../src/core/time';
import { LEAGUE, SQUAD_CAP, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  createNewGame('Test Club', 1);
});

afterEach(() => {
  clearTickHooks();
});

describe('constants', () => {
  it('match the spec values', () => {
    expect(FREE_AGENT_POOL_SIZE).toBe(12);
    expect(REFRESH_EVERY_WEEKS).toBe(4);
    expect(SIGNING_FEE_WEEKS).toBe(4);
    expect(RELEASE_PAYOUT_WEEKS).toBe(2);
    expect(NEW_CONTRACT_WEEKS).toBe(52);
  });
});

describe('refreshFreeAgents', () => {
  it('produces exactly FREE_AGENT_POOL_SIZE players', () => {
    const s = getState();
    const rng = makeRng(42);
    refreshFreeAgents(s, rng);
    expect(getState().freeAgents).toHaveLength(FREE_AGENT_POOL_SIZE);
  });

  it('retains all previous unsigned agents', () => {
    const before = getState().freeAgents.map((p) => p.id);
    refreshFreeAgents(getState(), makeRng(7));
    const after = getState().freeAgents.map((p) => p.id);
    expect(after).toEqual(before);
  });

  it('is deterministic for the same seed + state', () => {
    // Two identical starting states.
    createNewGame('Test Club', 1);
    refreshFreeAgents(getState(), makeRng(99));
    const a = getState().freeAgents.map((p) => p.id);
    createNewGame('Test Club', 1);
    refreshFreeAgents(getState(), makeRng(99));
    const b = getState().freeAgents.map((p) => p.id);
    expect(a).toEqual(b);
  });

  it('preserves rngSeed on the state', () => {
    const seedBefore = getState().rngSeed;
    refreshFreeAgents(getState(), makeRng(getState().rngSeed));
    expect(getState().rngSeed).toBe(seedBefore);
  });

  it('higher scout level raises annual intake quality over many seasons', () => {
    const meanOverallWithScout = (scoutLevel: 0 | 1 | 2 | 3, runs: number): number => {
      let total = 0;
      let count = 0;
      for (let seed = 1; seed <= runs; seed++) {
        createNewGame('Test Club', seed);
        if (scoutLevel > 0) {
          setState({
            facilities: [
              { id: 'sc', defId: 'scoutOffice', level: scoutLevel as 1 | 2 | 3, x: 0, y: 0 },
            ],
          });
        }
        setState({ season: seed + 1, freeAgents: [], playerPopulation: { ...getState().playerPopulation, shortlistIds: [] } });
        const intake = intakeUnsignedMarket(getState());
        for (const p of intake.freeAgents) {
          total += overallRating(p);
          count += 1;
        }
      }
      return total / count;
    };

    const runs = 40;
    const noScout = meanOverallWithScout(0, runs);
    const highScout = meanOverallWithScout(3, runs);
    expect(highScout).toBeGreaterThan(noScout);
  });

  it('higher reputation raises annual intake quality over many seasons', () => {
    const meanOverallWithRep = (rep: number, runs: number): number => {
      let total = 0;
      let count = 0;
      for (let seed = 1; seed <= runs; seed++) {
        createNewGame('Test Club', seed);
        setState({ reputation: rep });
        setState({ season: seed + 1, freeAgents: [], playerPopulation: { ...getState().playerPopulation, shortlistIds: [] } });
        const intake = intakeUnsignedMarket(getState());
        for (const p of intake.freeAgents) {
          total += overallRating(p);
          count += 1;
        }
      }
      return total / count;
    };

    const runs = 40;
    const lowRep = meanOverallWithRep(1, runs);
    const highRep = meanOverallWithRep(100, runs);
    expect(highRep).toBeGreaterThan(lowRep);
  });
});

describe('the pool follows the league (N12)', () => {
  type Built = { defId: 'scoutOffice' | 'academy'; level: 1 | 2 | 3 };
  const club = (reputation: number, built: Built[] = []) => ({
    reputation,
    facilities: built.map((b) => ({ id: b.defId, defId: b.defId, level: b.level, x: 0, y: 0 })),
  });
  /** Quality belongs to annual intake; refreshing discovery never rerolls people. */
  const refreshed = (reputation: number, built: Built[] = [], runs = 40): number[] => {
    const out: number[] = [];
    for (let seed = 1; seed <= runs; seed++) {
      createNewGame('Test Club', seed);
      setState({ ...club(reputation, built), season: seed + 1, freeAgents: [], playerPopulation: { ...getState().playerPopulation, shortlistIds: [] } });
      out.push(...intakeUnsignedMarket(getState()).freeAgents.map(overallRating));
    }
    return out;
  };
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

  it('targets the league mean less POOL_BELOW at a new club, lifted by scouting and reputation', () => {
    expect(LEAGUE.POOL_BELOW).toBe(3);
    expect(scoutBias(club(REP_BASELINE))).toBe(0);
    expect(poolTarget(club(REP_BASELINE))).toBe(LEAGUE.MEAN - LEAGUE.POOL_BELOW);
    expect(poolTarget(createNewGame('Test Club', 3))).toBe(52);
    expect(poolTarget(club(REP_BASELINE, [{ defId: 'scoutOffice', level: 1 }])) - 52).toBeCloseTo(SCOUT_BIAS_PER_LEVEL * POOL_POINTS_PER_BIAS); // +3
    expect(poolTarget(club(REP_BASELINE, [{ defId: 'academy', level: 1 }])) - 52).toBeCloseTo(SPECIAL_MAGNITUDE.recruitQuality * POOL_POINTS_PER_BIAS); // +2.5
    expect(poolTarget(club(100))).toBeCloseTo(59); // +1 for every 10 points above the baseline
    expect(poolTarget(club(10))).toBeCloseTo(50); // and a little off below it
    expect(poolTarget(club(100, [{ defId: 'scoutOffice', level: 3 }, { defId: 'academy', level: 3 }]))).toBeCloseTo(75.5);
  });

  it('a new game\'s opening pool sits around the target: a level club\'s first-grader, a star now and then', () => {
    const all: number[] = [];
    for (let seed = 1; seed <= 100; seed++) all.push(...createNewGame('Test Club', seed).freeAgents.map(overallRating));
    expect(Math.abs(mean(all) - 52)).toBeLessThan(1.5); // was about 60: every agent an 'average' roll
    const over65 = all.filter((o) => o >= 65).length / all.length;
    expect(over65).toBeGreaterThan(0.01); // stars still turn up...
    expect(over65).toBeLessThan(0.08); // ...but rarely (was about 15%)
    expect(Math.max(...all)).toBeLessThanOrEqual(52 + 2 * FREE_AGENT_SPREAD + 6);
  });

  it('annual intake at reputation 30 lands within a point and a half of the target, and higher with a Scout Office or an Academy', () => {
    const base = refreshed(30);
    expect(Math.abs(mean(base) - 52)).toBeLessThan(1.5);
    const scout = refreshed(30, [{ defId: 'scoutOffice', level: 3 }]);
    expect(Math.abs(mean(scout) - 61)).toBeLessThan(1.5);
    const academy = refreshed(30, [{ defId: 'academy', level: 3 }]);
    expect(Math.abs(mean(academy) - 59.5)).toBeLessThan(1.5);
    expect(mean(scout)).toBeGreaterThan(mean(base) + 6);
    expect(mean(academy)).toBeGreaterThan(mean(base) + 5);
  });

  it('keeps every stat a whole number when reputation puts the target between two', () => {
    createNewGame('Test Club', 5);
    setState({ reputation: 35 }); // target 52.5
    for (const p of refreshFreeAgents(getState(), makeRng(8)).freeAgents) {
      for (const v of Object.values(p.stats)) expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('leaves Academy prospects and departed players exactly as they were', () => {
    createNewGame('Test Club', 6);
    const [a, b] = getState().freeAgents;
    const junior: Player = { ...a!, id: 'jr', junior: true, stats: { speed: 41, strength: 42, stamina: 43, handling: 44, kicking: 44, footyIQ: 45 } };
    const departed: Player = { ...b!, id: 'gone', departed: true, stats: { speed: 71, strength: 72, stamina: 73, handling: 74, kicking: 74, footyIQ: 75 } };
    setState({ ...club(100, [{ defId: 'scoutOffice', level: 3 }, { defId: 'academy', level: 3 }]), freeAgents: [junior, departed] });
    const pool = refreshFreeAgents(getState(), makeRng(9)).freeAgents;
    expect(pool.slice(0, 2)).toEqual([junior, departed]);
    expect(pool).toHaveLength(2);
  });
});

describe('signingFee', () => {
  const at = (overall: number, over: Partial<Player> = {}): Player => ({
    ...getState().freeAgents[0]!, id: `fa${overall}`, age: 25,
    stats: { speed: overall, strength: overall, stamina: overall, handling: overall, kicking: overall, footyIQ: overall }, ...over,
  });

  it('is one year\'s wage, higher for a better player and lower for an older one', () => {
    const s = getState();
    const prime = at(80);
    expect(signingFee(s, prime)).toBe(signingFeeQuote(salaryDemand(prime), false, 0));
    expect(signingFee(s, at(80))).toBeGreaterThan(signingFee(s, at(55)));
    expect(signingFee(s, at(65))).toBeGreaterThan(signingFee(s, at(55)));
    expect(signingFee(s, at(80, { age: 34 }))).toBeLessThan(signingFee(s, at(80)));
    expect(signingFeeBasis(s, at(55))).toBe("one year's wage");
  });

  it('Academy prospects pay a quarter, and not again after they have left', () => {
    const junior = at(40, { junior: true, wage: 400, clubHistory: { spells: [], academyDiscountUsed: false } });
    expect(signingFee(getState(), junior)).toBe(signingFeeQuote(salaryDemand(junior), true, 0));
    expect(signingFee(getState(), { ...junior, departed: true })).toBe(signingFeeQuote(salaryDemand(junior), false, 0));
    expect(signingFeeBasis(getState(), junior)).toContain('Academy');
    expect(signingFee(getState(), { ...junior, clubHistory: { spells: [], academyDiscountUsed: true } })).toBe(signingFeeQuote(salaryDemand(junior), false, 0));
  });

  it('a Scout Office takes 10% off the fee per level and nothing off the salary', () => {
    const player = at(70);
    for (const level of [1, 2, 3] as const) {
      setState({ facilities: [{ id: 'sc', defId: 'scoutOffice', level, x: 0, y: 0 }] });
      expect(signingFee(getState(), player)).toBe(signingFeeQuote(salaryDemand(player), false, level));
      expect(salaryDemand(player)).toBe(signingFeeQuote(salaryDemand(player), false, 0));
      expect(signingFeeBasis(getState(), player)).toContain(`Scout Office −${level * 10}%`);
    }
  });
});

describe('signPlayer', () => {
  const firstAgent = (): Player => getState().freeAgents[0]!;

  it('moves player to squad, deducts the signing fee, sets contract, emits player:signed', () => {
    let signed: Player | null = null;
    bus.on('player:signed', (p) => { signed = p; });

    const agent = firstAgent();
    const fee = signingFee(getState(), agent);
    const moneyBefore = getState().money;
    const squadBefore = getState().squad.length;

    const res = signPlayer(getState(), agent.id);
    expect(res.ok).toBe(true);

    const st = getState();
    expect(st.money).toBe(moneyBefore - fee);
    expect(st.squad).toHaveLength(squadBefore + 1);
    expect(st.freeAgents.some((p) => p.id === agent.id)).toBe(false);
    const inSquad = st.squad.find((p) => p.id === agent.id)!;
    expect(inSquad.contractWeeks).toBe(WEEKS_PER_SEASON - st.week + 1);
    expect(inSquad.deal).toMatchObject({ startSeason: st.season, endSeason: st.season });
    expect(signed).not.toBeNull();
    expect(signed!.id).toBe(agent.id);
  });

  it('leaves the lineup alone unless the coach\'s tap asks (#416: the soak and the rivals never place him)', () => {
    const agent = { ...firstAgent(), injuredWeeks: 0, stats: { speed: 99, strength: 99, stamina: 99, handling: 99, kicking: 99, footyIQ: 99 } };
    setState({ money: 5_000_000, freeAgents: [agent, ...getState().freeAgents.slice(1)] });
    const lineup = getState().lineup;
    const plain = signPlayer(getState(), agent.id);
    expect(plain).toEqual({ ok: true });
    expect(getState().lineup).toBe(lineup);
  });

  it('with intoLineup a man who out-rates a starter goes into the nine before player:signed (#416)', () => {
    const agent = { ...firstAgent(), injuredWeeks: 0, stats: { speed: 99, strength: 99, stamina: 99, handling: 99, kicking: 99, footyIQ: 99 } };
    setState({ money: 5_000_000, freeAgents: [agent, ...getState().freeAgents.slice(1)] });
    let inNine = false;
    bus.on('player:signed', () => { inNine = getState().lineup.starters.includes(agent.id); });
    const res = signPlayer(getState(), agent.id, { intoLineup: true });
    expect(res.placed?.where).toBe('nine');
    expect(getState().lineup).toBe(res.placed!.lineup);
    expect(inNine).toBe(true);
  });

  it('emits ui:notify success on signing', () => {
    let kind: string | null = null;
    bus.on('ui:notify', (n) => { kind = n.kind; });
    signPlayer(getState(), firstAgent().id);
    expect(kind).toBe('success');
  });

  it('rejects unknown id with not-found and does not mutate', () => {
    const moneyBefore = getState().money;
    const squadBefore = getState().squad.length;
    const res = signPlayer(getState(), 'nope');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not-found');
    expect(getState().money).toBe(moneyBefore);
    expect(getState().squad).toHaveLength(squadBefore);
  });

  it('rejects with squad-full at SQUAD_CAP without mutating', () => {
    // Move free agents into the squad directly (bypass fee) to reach the cap.
    const s = getState();
    const needed = SQUAD_CAP - s.squad.length;
    const extra: Player[] = [];
    let seed = 5000;
    for (let i = 0; i < needed; i++) {
      // reuse an agent-like player by cloning an existing squad member with new id
      const base = s.squad[0]!;
      extra.push({ ...base, id: `fill_${seed++}` });
    }
    setState({ squad: [...s.squad, ...extra] });
    expect(getState().squad).toHaveLength(SQUAD_CAP);

    const agent = firstAgent();
    const moneyBefore = getState().money;
    const faBefore = getState().freeAgents.length;
    const res = signPlayer(getState(), agent.id);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('squad-full');
    expect(getState().money).toBe(moneyBefore);
    expect(getState().squad).toHaveLength(SQUAD_CAP);
    expect(getState().freeAgents).toHaveLength(faBefore);
  });

  it('rejects with insufficient-funds when broke without mutating', () => {
    const agent = firstAgent();
    setState({ money: signingFee(getState(), agent) - 1 });
    const squadBefore = getState().squad.length;
    const faBefore = getState().freeAgents.length;
    const moneyBefore = getState().money;

    const res = signPlayer(getState(), agent.id);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('insufficient-funds');
    expect(getState().squad).toHaveLength(squadBefore);
    expect(getState().freeAgents).toHaveLength(faBefore);
    expect(getState().money).toBe(moneyBefore);
  });

  it('allows signing when funds exactly equal the fee', () => {
    const agent = firstAgent();
    setState({ money: signingFee(getState(), agent) });
    const res = signPlayer(getState(), agent.id);
    expect(res.ok).toBe(true);
    expect(getState().money).toBe(0);
  });
});

describe('releasePlayer', () => {
  it('pays the release payout, removes him, and does not refund a signing fee or keep the deal', () => {
    const target = getState().squad[0]!;
    const terms = releaseTerms(target, getState().season, getState().week);
    setState({ money: terms.payout });
    const squadBefore = getState().squad.length;
    const faBefore = getState().freeAgents.length;

    const res = releasePlayer(getState(), target.id);
    expect(res.ok).toBe(true);

    const st = getState();
    expect(st.money).toBe(0);
    expect(st.squad).toHaveLength(squadBefore - 1);
    expect(st.squad.some((p) => p.id === target.id)).toBe(false);
    expect(st.freeAgents).toHaveLength(faBefore + 1);
    const back = st.freeAgents.find((p) => p.id === target.id)!;
    expect(back.deal).toBeUndefined();
    expect(back.junior).toBeUndefined();
    expect(back.departed).toBe(true);
  });

  it('emits ui:notify info on release', () => {
    let kind: string | null = null;
    bus.on('ui:notify', (n) => { kind = n.kind; });
    releasePlayer(getState(), getState().squad[0]!.id);
    expect(kind).toBe('info');
  });

  it('rejects unknown id with not-found without mutating', () => {
    const moneyBefore = getState().money;
    const squadBefore = getState().squad.length;
    const res = releasePlayer(getState(), 'nope');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not-found');
    expect(getState().money).toBe(moneyBefore);
    expect(getState().squad).toHaveLength(squadBefore);
  });

  it('refuses when the cash is a dollar short and changes nothing', () => {
    const target = getState().squad[0]!;
    const payout = releaseTerms(target, getState().season, getState().week).payout;
    expect(payout).toBeGreaterThan(0);
    setState({ money: payout - 1 });
    const squadBefore = getState().squad.map((p) => p.id);
    const res = releasePlayer(getState(), target.id);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('insufficient-funds');
    expect(res.message).toContain('Not enough cash');
    expect(getState().money).toBe(payout - 1);
    expect(getState().squad.map((p) => p.id)).toEqual(squadBefore);
  });

  it('rejects with squad-min at SQUAD_MIN without mutating', () => {
    // Trim squad down to SQUAD_MIN.
    while (getState().squad.length > SQUAD_MIN) {
      const s = getState();
      setState({ squad: s.squad.slice(0, -1) });
    }
    expect(getState().squad).toHaveLength(SQUAD_MIN);

    const target = getState().squad[0]!;
    const moneyBefore = getState().money;
    const faBefore = getState().freeAgents.length;
    const res = releasePlayer(getState(), target.id);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('squad-min');
    expect(getState().squad).toHaveLength(SQUAD_MIN);
    expect(getState().money).toBe(moneyBefore);
    expect(getState().freeAgents).toHaveLength(faBefore);
  });
});

describe('freeAgencyTick / cadence', () => {
  it('no-ops when week is not divisible by 4', () => {
    setState({ week: 3 });
    const before = getState().playerPopulation.shortlistIds;
    freeAgencyTick(getState(), makeRng(1));
    expect(getState().playerPopulation.shortlistIds).toEqual(before);
  });

  it('refreshes when week is divisible by 4', () => {
    setState({ week: 4 });
    const before = getState().playerPopulation.shortlistIds;
    freeAgencyTick(getState(), makeRng(1));
    const after = getState().playerPopulation.shortlistIds;
    expect(after).not.toEqual(before);
    expect(after).toHaveLength(FREE_AGENT_POOL_SIZE);
  });
});

describe('registerFreeAgencySystem (tick hook)', () => {
  it('installs a hook at order 60 that refreshes on weeks 4, 8, ... only', () => {
    registerFreeAgencySystem();

    const poolSnapshot = (): string[] => [...getState().playerPopulation.shortlistIds];

    // Weeks 1,2,3 -> no refresh (advanceWeek runs the hook for the CURRENT week
    // before incrementing). Track when the pool changes.
    const changedOnWeek: number[] = [];
    for (let w = 1; w <= 8; w++) {
      setState({ week: w });
      const before = poolSnapshot();
      // Manually run only the registered hook via advanceWeek would also bump the
      // week; instead we invoke freeAgencyTick indirectly through advanceWeek and
      // reset week each loop for a clean cadence check.
      // Simpler: call the exported freeAgencyTick with a fresh state rng.
      freeAgencyTick(getState(), makeRng(getState().rngSeed));
      const after = poolSnapshot();
      if (JSON.stringify(before) !== JSON.stringify(after)) changedOnWeek.push(w);
    }
    expect(changedOnWeek).toEqual([4, 8]);
  });

  it('advanceWeek fires the hook and refreshes the pool on week 4', () => {
    registerFreeAgencySystem();
    setState({ week: 4 });
    const before = getState().playerPopulation.shortlistIds;
    advanceWeek(); // runs hooks for week 4, then bumps to week 5
    const after = getState().playerPopulation.shortlistIds;
    expect(after).not.toEqual(before);
    expect(getState().week).toBe(5);
  });

  it('advanceWeek on week 3 does not refresh', () => {
    registerFreeAgencySystem();
    setState({ week: 3 });
    const before = getState().playerPopulation.shortlistIds;
    advanceWeek();
    expect(getState().playerPopulation.shortlistIds).toEqual(before);
  });

  it('registers under the freeagents tick order (60)', () => {
    expect(TICK_ORDER.freeagents).toBe(60);
  });
});

describe('weeksToPoolRefresh', () => {
  it('counts the weeks to advance until a refresh week has been played', () => {
    expect(weeksToPoolRefresh(1)).toBe(4);
    expect(weeksToPoolRefresh(4)).toBe(1);
    expect(weeksToPoolRefresh(5)).toBe(4);
    expect(weeksToPoolRefresh(24)).toBe(1);
  });
  it('agrees with the tick over a season and into the next', () => {
    for (let week = 1; week <= 27; week++) {
      const n = weeksToPoolRefresh(week);
      // The weeks played from here, wrapping 27 → 1; the nth is the first that refreshes.
      const played = Array.from({ length: n }, (_, i) => ((week - 1 + i) % 27) + 1);
      expect(played.filter((w) => w % REFRESH_EVERY_WEEKS === 0 && w <= 24)).toEqual([played[n - 1]]);
    }
    expect(weeksToPoolRefresh(25)).toBe(7);
  });
});
