import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FREE_AGENT_POOL_SIZE,
  REFRESH_EVERY_WEEKS,
  SIGNING_FEE_WEEKS,
  SCOUT_FEE_DISCOUNT_PER_LEVEL,
  RELEASE_PAYOUT_WEEKS,
  NEW_CONTRACT_WEEKS,
  signingFee,
  signingFeeBasis,
  refreshFreeAgents,
  signPlayer,
  releasePlayer,
  freeAgencyTick,
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
import { transferFee } from '../../src/systems/contracts';
import { REP_BASELINE } from '../../src/systems/league';
import { bus } from '../../src/core/events';
import {
  clearTickHooks, advanceWeek, TICK_ORDER,
} from '../../src/core/time';
import { LEAGUE, SQUAD_CAP, SQUAD_MIN } from '../../src/config';

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

  it('fully replaces the previous pool (discards unsigned agents)', () => {
    const before = getState().freeAgents.map((p) => p.id);
    refreshFreeAgents(getState(), makeRng(7));
    const after = getState().freeAgents.map((p) => p.id);
    expect(after).not.toEqual(before);
    // No overlap in ids: it is a brand-new pool.
    expect(after.some((id) => before.includes(id))).toBe(false);
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

  it('advances rngSeed on the state', () => {
    const seedBefore = getState().rngSeed;
    refreshFreeAgents(getState(), makeRng(getState().rngSeed));
    expect(getState().rngSeed).not.toBe(seedBefore);
  });

  it('higher scout level raises the mean overall over many seeded runs', () => {
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
        refreshFreeAgents(getState(), makeRng(seed * 31 + 5));
        for (const p of getState().freeAgents) {
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

  it('higher reputation raises the mean overall over many seeded runs', () => {
    const meanOverallWithRep = (rep: number, runs: number): number => {
      let total = 0;
      let count = 0;
      for (let seed = 1; seed <= runs; seed++) {
        createNewGame('Test Club', seed);
        setState({ reputation: rep });
        refreshFreeAgents(getState(), makeRng(seed * 17 + 3));
        for (const p of getState().freeAgents) {
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
  /** Every overall from `runs` refreshes through the real refreshFreeAgents at this club. */
  const refreshed = (reputation: number, built: Built[] = [], runs = 40): number[] => {
    const out: number[] = [];
    for (let seed = 1; seed <= runs; seed++) {
      createNewGame('Test Club', seed);
      setState({ ...club(reputation, built), freeAgents: [] });
      out.push(...refreshFreeAgents(getState(), makeRng(seed * 31 + 5)).freeAgents.map(overallRating));
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

  it('a refresh at reputation 30 lands within a point and a half of the target, and higher with a Scout Office or an Academy', () => {
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
    const junior: Player = { ...a!, id: 'jr', junior: true, stats: { speed: 41, strength: 42, stamina: 43, skill: 44, footyIQ: 45 } };
    const departed: Player = { ...b!, id: 'gone', departed: true, stats: { speed: 71, strength: 72, stamina: 73, skill: 74, footyIQ: 75 } };
    setState({ ...club(100, [{ defId: 'scoutOffice', level: 3 }, { defId: 'academy', level: 3 }]), freeAgents: [junior, departed] });
    const pool = refreshFreeAgents(getState(), makeRng(9)).freeAgents;
    expect(pool.slice(0, 2)).toEqual([junior, departed]);
    expect(pool).toHaveLength(2 + FREE_AGENT_POOL_SIZE);
    expect(pool.slice(2).every((p) => !p.junior && !p.departed)).toBe(true);
  });
});

describe('signingFee (#146)', () => {
  const at = (overall: number, over: Partial<Player> = {}): Player => ({
    ...getState().freeAgents[0]!, id: `fa${overall}`, age: 25,
    stats: { speed: overall, strength: overall, stamina: overall, skill: overall, footyIQ: overall }, ...over,
  });

  it('is a transfer-style fee that grows with overall and falls with age', () => {
    const s = getState();
    expect(signingFee(s, at(55))).toBe(transferFee(at(55)));
    expect(signingFee(s, at(55))).toBe(55 * 55 * 10);
    expect(signingFee(s, at(80))).toBeGreaterThan(signingFee(s, at(65)));
    expect(signingFee(s, at(65))).toBeGreaterThan(signingFee(s, at(55)));
    expect(signingFee(s, at(80, { age: 34 }))).toBeLessThan(signingFee(s, at(80)));
    expect(signingFee(s, at(80))).toBeGreaterThan(10 * SIGNING_FEE_WEEKS * at(80).wage); // not four weeks' wages any more
    expect(signingFeeBasis(s, at(55))).toBe('by rating and age');
  });

  it('Academy prospects still cost SIGNING_FEE_WEEKS × wage', () => {
    const s = getState();
    const junior = at(40, { junior: true, wage: 400 });
    expect(signingFee(s, junior)).toBe(SIGNING_FEE_WEEKS * 400);
    expect(signingFeeBasis(s, junior)).toContain('Academy');
  });

  it('a Scout Office takes SCOUT_FEE_DISCOUNT_PER_LEVEL off per level', () => {
    const base = signingFee(getState(), at(70));
    for (const level of [1, 2, 3] as const) {
      setState({ facilities: [{ id: 'sc', defId: 'scoutOffice', level, x: 0, y: 0 }] });
      expect(signingFee(getState(), at(70))).toBe(Math.round(base * (1 - SCOUT_FEE_DISCOUNT_PER_LEVEL * level)));
      expect(signingFeeBasis(getState(), at(70))).toContain(`Scout Office −${Math.round(SCOUT_FEE_DISCOUNT_PER_LEVEL * level * 100)}%`);
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
    expect(inSquad.contractWeeks).toBe(NEW_CONTRACT_WEEKS);
    expect(signed).not.toBeNull();
    expect(signed!.id).toBe(agent.id);
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
  it('pays 2×wage, removes from squad, returns to freeAgents', () => {
    const target = getState().squad[0]!;
    const payout = RELEASE_PAYOUT_WEEKS * target.wage;
    const moneyBefore = getState().money;
    const squadBefore = getState().squad.length;
    const faBefore = getState().freeAgents.length;

    const res = releasePlayer(getState(), target.id);
    expect(res.ok).toBe(true);

    const st = getState();
    expect(st.money).toBe(moneyBefore - payout);
    expect(st.squad).toHaveLength(squadBefore - 1);
    expect(st.squad.some((p) => p.id === target.id)).toBe(false);
    expect(st.freeAgents).toHaveLength(faBefore + 1);
    expect(st.freeAgents.some((p) => p.id === target.id)).toBe(true);
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

  it('is allowed to take money negative (economy handles bankruptcy)', () => {
    const target = getState().squad[0]!;
    setState({ money: 0 });
    const res = releasePlayer(getState(), target.id);
    expect(res.ok).toBe(true);
    expect(getState().money).toBe(-(RELEASE_PAYOUT_WEEKS * target.wage));
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
    const before = getState().freeAgents.map((p) => p.id);
    freeAgencyTick(getState(), makeRng(1));
    expect(getState().freeAgents.map((p) => p.id)).toEqual(before);
  });

  it('refreshes when week is divisible by 4', () => {
    setState({ week: 4 });
    const before = getState().freeAgents.map((p) => p.id);
    freeAgencyTick(getState(), makeRng(1));
    const after = getState().freeAgents.map((p) => p.id);
    expect(after).not.toEqual(before);
    expect(after).toHaveLength(FREE_AGENT_POOL_SIZE);
  });
});

describe('registerFreeAgencySystem (tick hook)', () => {
  it('installs a hook at order 60 that refreshes on weeks 4, 8, ... only', () => {
    registerFreeAgencySystem();

    const poolSnapshot = (): string[] => getState().freeAgents.map((p) => p.id).sort();

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
    const before = getState().freeAgents.map((p) => p.id);
    advanceWeek(); // runs hooks for week 4, then bumps to week 5
    const after = getState().freeAgents.map((p) => p.id);
    expect(after).not.toEqual(before);
    expect(getState().week).toBe(5);
  });

  it('advanceWeek on week 3 does not refresh', () => {
    registerFreeAgencySystem();
    setState({ week: 3 });
    const before = getState().freeAgents.map((p) => p.id);
    advanceWeek();
    expect(getState().freeAgents.map((p) => p.id)).toEqual(before);
  });

  it('registers under the freeagents tick order (60)', () => {
    expect(TICK_ORDER.freeagents).toBe(60);
  });
});
