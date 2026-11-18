import { describe, it, expect, beforeEach } from 'vitest';
import { applyInjuries, applyTraining, ageMod, traitMult, awardXp, spendByFocus, trainPlayer, trainWeek, facilityXpMultiplier, applyMatchXp, setSpendPointsMyself, spendPoint, spendPointBlock, spendSquadPoint } from '../../src/systems/training';
import { validateCurrent } from '../../src/core/saveValidation';
import { createNewGame, getState, loadState, type Player, type PlacedFacility } from '../../src/core/state';
import { PROGRESSION } from '../../src/config';
import { shownStats, POSITIONS } from '../../src/data/player';
import { teamSheetFromSquad } from '../../src/match/league/sheets';
import type { MatchResult } from '../../src/sim/events';
const pf = (over: Partial<PlacedFacility> & Pick<PlacedFacility, 'defId'>): PlacedFacility => ({ id: 'f', x: 0, y: 0, level: 1, ...over });
function mkPlayer(over: Partial<Player> = {}): Player {
  const p = getState().squad[0]!;
  return { ...p, id: 'p', name: 'Test Player', age: 25, position: 'lock', traits: [], injuredWeeks: 0,
    stats: { speed: 50, strength: 50, stamina: 50, handling: 20, kicking: 20, footyIQ: 50 },
    ceilings: { speed: 52, strength: 55, stamina: 53, footyIQ: 54 }, xp: 0, level: 1, unspentPoints: 0, ...over };
}
beforeEach(() => { createNewGame('XP', 539); });
describe('XP progression', () => {
  it('no growth without XP, regardless of buildings or focus', () => {
    const p = mkPlayer();
    expect(trainPlayer(p, [pf({ defId: 'teamGym', level: 3 })], 'strength')).toEqual(p.stats);
    expect(awardXp(p, 0).stats).toEqual(p.stats);
    expect(spendByFocus(p).stats).toEqual(p.stats);
  });
  it('age and Workhorse / Young Gun modify every XP award', () => {
    for (const [age, mult] of [[21, 1.5], [25, 1], [29, 0.6], [33, 0.25]]) {
      const p = mkPlayer({ age, traits: [{ id: 'workhorse', level: 2 }, { id: 'youngGun', level: 1 }] });
      expect(ageMod(age)).toBe(mult);
      expect(traitMult(p)).toBeCloseTo(1.32 * 1.3);
      expect(awardXp(p, 10).xp).toBeCloseTo(10 * mult * 1.32 * 1.3);
    }
  });
  it('level-up banks points, carries XP and does not spend or change stats', () => {
    const p = mkPlayer({ xp: 90, unspentPoints: 3 });
    const q = awardXp(p, 220);
    expect(q).toMatchObject({ xp: 10, level: 4, unspentPoints: 6, stats: p.stats });
    expect(p.xp).toBe(90);
  });
  it('weekly trickle works without facilities and injuries slow it before recovery', () => {
    const p = mkPlayer();
    expect(trainWeek(p, []).xp).toBe(PROGRESSION.WEEKLY_XP);
    loadState({ ...getState(), squad: [{ ...p, injuredWeeks: 1 }] });
    applyTraining(getState()); applyInjuries(getState());
    expect(getState().squad[0]).toMatchObject({ xp: PROGRESSION.WEEKLY_XP * 0.3, injuredWeeks: 0 });
  });
  it('training buildings give the same generic capped XP boost; adjacency has no effect', () => {
    const buildings = ['trainingPaddock', 'weightsRoom', 'videoRoom', 'physioCentre', 'academy', 'coachsOffice', 'teamGym'] as const;
    for (const defId of buildings) expect(facilityXpMultiplier([pf({ defId })])).toBe(1.1);
    const all = buildings.map((defId, i) => pf({ id: String(i), defId, level: 3, x: i * 2 }));
    expect(facilityXpMultiplier(all)).toBe(1 + PROGRESSION.FACILITY_XP_CAP);
    expect(facilityXpMultiplier([pf({ defId: 'medicalBay' })])).toBe(1);
    expect(trainWeek(mkPlayer(), all)).toEqual(trainWeek(mkPlayer(), all.map((f, i) => ({ ...f, x: i * 20 }))));
    expect(trainWeek(mkPlayer(), all).ceilings).toEqual(mkPlayer().ceilings);
  });
  it('match level points auto-spend through focus without changing the season seed', () => {
    const squad = getState().squad.map(p => ({ ...p, age: 25, traits: [], xp: 90, level: 1, unspentPoints: 0 }));
    const own = teamSheetFromSquad(squad, 'player', 'XP', ['#000000', '#ffffff']);
    const result = { homeScore: 0, awayScore: 0, events: [] } as unknown as MatchResult;
    const seed = getState().rngSeed;
    const after = applyMatchXp(squad, own, result, 'player', 'rival', [], 'balanced');
    const starter = after.find(p => p.id === own.roster![0]!.id)!;
    const before = squad.find(p => p.id === starter.id)!;
    expect(starter).toMatchObject({ level: 2, unspentPoints: 0 });
    expect(shownStats(starter.position).reduce((sum, key) => sum + starter.stats[key] - before.stats[key], 0)).toBe(1);
    expect(getState().rngSeed).toBe(seed);
  });
  it('playing and moments award starters more than bench, and reserves nothing', () => {
    const squad = getState().squad.map(p => ({ ...p, age: 25, traits: [], xp: 0, level: 1, unspentPoints: 0 }));
    const own = teamSheetFromSquad(squad, 'player', 'XP', ['#000000', '#ffffff']);
    const result = { homeScore: 6, awayScore: 0, events: [] } as unknown as MatchResult;
    let after = applyMatchXp(squad, own, result, 'player', 'rival', []);
    expect(after.find(p => p.id === own.roster![0]!.id)?.xp).toBe(PROGRESSION.STARTER_XP);
    expect(after.find(p => p.id === own.bench![0]!.id)?.xp).toBe(PROGRESSION.BENCH_XP);
    expect(after.filter(p => ![...own.roster!, ...own.bench!].some(r => r.id === p.id)).every(p => p.xp === 0)).toBe(true);
    const scorer = squad.find(p => p.id === own.roster![0]!.id)!;
    result.events = [{ t: 1, kind: 'try', teamId: 'player', player: scorer.name }, { t: 2, kind: 'break', teamId: 'player', player: scorer.name }];
    after = applyMatchXp(squad, own, result, 'player', 'rival', []);
    expect(after.find(p => p.id === scorer.id)?.xp).toBe(PROGRESSION.STARTER_XP + PROGRESSION.TRY_XP + PROGRESSION.LINE_BREAK_XP + PROGRESSION.POTM_XP);
  });
});
describe('spendByFocus', () => {
  it('spends on an eligible focus before the stat with most room', () => {
    const p = mkPlayer({ unspentPoints: 1 });
    expect(spendByFocus(p, 'speed')).toMatchObject({ unspentPoints: 0, stats: { ...p.stats, speed: 51 } });
  });
  it.each(['balanced', 'handling', 'kicking', 'speed'] as const)('%s falls back to most room when Balanced, off-group or at ceiling', focus => {
    const p = mkPlayer({ unspentPoints: 1 }); p.stats.speed = 52;
    expect(spendByFocus(p, focus).stats.strength).toBe(51);
  });
  it('rechecks room for every point, honours fractional ceilings and retains surplus', () => {
    const p = mkPlayer({ unspentPoints: 100, ceilings: { speed: 50.5, strength: 51, stamina: 51, footyIQ: 51 } });
    const q = spendByFocus(p, 'speed');
    expect(q.stats.speed).toBe(50.5);
    expect(q.unspentPoints).toBe(96);
    expect(q.ceilings).toEqual(p.ceilings);
    expect(q.stats.handling).toBe(p.stats.handling);
  });
  it.each(POSITIONS)('%s never passes ceilings or grows hidden stats through many weeks', position => {
    let p: Player = { ...getState().squad[0]!, position, age: 20, traits: [] };
    p = { ...p, ceilings: Object.fromEntries(shownStats(position).map(k => [k, p.stats[k] + 1.5])) };
    const initial = { ...p.stats };
    for (let i = 0; i < 300; i++) p = trainWeek(p, [pf({ defId: 'teamGym', level: 3 })]);
    for (const k of Object.keys(p.stats) as (keyof Player['stats'])[]) {
      if (shownStats(position).includes(k)) expect(p.stats[k]).toBeLessThanOrEqual(p.ceilings[k]!);
      else expect(p.stats[k]).toBe(initial[k]);
    }
  });
  it('veteran decline remains on shown speed/stamina only', () => {
    const p = mkPlayer({ age: 33 });
    expect(trainPlayer(p)).toEqual({ ...p.stats, speed: 49.7, stamina: 49.7 });
  });
});
// SuperCOOKED §7 #1: the coach can spend level points by hand, opt-in (settings.spendPointsMyself).
describe('spending level points by hand', () => {
  // A lock's shown stats are strength, stamina, speed and footyIQ; kicking and handling are hidden.
  it('one point into a shown stat, up to its ceiling, and no further', () => {
    const p = mkPlayer({ unspentPoints: 3 });
    const q = spendPoint(p, 'speed');
    expect(q.stats.speed).toBe(51);
    expect(q.unspentPoints).toBe(2);
    expect(p.stats.speed).toBe(50); // pure
    const top = spendPoint(spendPoint(q, 'speed'), 'speed'); // ceiling 52
    expect(top.stats.speed).toBe(52);
    expect(top.unspentPoints).toBe(1);
    expect(spendPointBlock(top, 'speed')).toBe('at-ceiling');
    expect(spendPoint(top, 'speed')).toBe(top);
  });

  it('never a hidden stat, and nothing without a banked point', () => {
    const p = mkPlayer({ unspentPoints: 2 });
    expect(spendPointBlock(p, 'kicking')).toBe('not-shown');
    expect(spendPoint(p, 'kicking')).toBe(p);
    const none = mkPlayer({ unspentPoints: 0 });
    expect(spendPointBlock(none, 'strength')).toBe('no-points');
    expect(spendPoint(none, 'strength')).toBe(none);
    expect(spendPointBlock(p, 'strength')).toBeNull();
  });

  it('off (as every career starts), the focus spends points as they are earned, as before', () => {
    expect(getState().settings.spendPointsMyself).toBeUndefined();
    const p = mkPlayer({ xp: PROGRESSION.XP_PER_LEVEL - 1 });
    const auto = trainWeek(p, [], 'strength');
    expect(auto.unspentPoints).toBe(0);
    expect(auto.stats.strength).toBe(51);
    expect(trainWeek(p, [], 'strength', false)).toEqual(auto);
  });

  it('on, weekly and match points bank for the coach, and the level still counts them', () => {
    const p = mkPlayer({ xp: PROGRESSION.XP_PER_LEVEL - 1 });
    const banked = trainWeek(p, [], 'strength', true);
    expect(banked).toMatchObject({ level: 2, unspentPoints: PROGRESSION.POINTS_PER_LEVEL, stats: p.stats });
    const squad = getState().squad.map(q => ({ ...q, age: 25, traits: [], xp: 90, level: 1, unspentPoints: 0 }));
    const own = teamSheetFromSquad(squad, 'player', 'XP', ['#000000', '#ffffff']);
    const result = { homeScore: 0, awayScore: 0, events: [] } as unknown as MatchResult;
    const after = applyMatchXp(squad, own, result, 'player', 'rival', [], 'balanced', true);
    const starter = after.find(q => q.id === own.roster![0]!.id)!;
    expect(starter).toMatchObject({ level: 2, unspentPoints: PROGRESSION.POINTS_PER_LEVEL });
    expect(starter.stats).toEqual(squad.find(q => q.id === starter.id)!.stats);
  });

  it("the weekly tick follows the setting, the coach spends from the squad, and off again the focus takes what's banked", () => {
    const first = getState().squad[0]!;
    const stat = shownStats(first.position).find(k => first.stats[k] < (first.ceilings[k] ?? 0))!;
    loadState({ ...getState(), squad: getState().squad.map(q => (q.id === first.id ? { ...q, xp: PROGRESSION.XP_PER_LEVEL - 1, unspentPoints: 0 } : q)) });
    setSpendPointsMyself(true);
    expect(getState().settings.spendPointsMyself).toBe(true);
    applyTraining(getState());
    const banked = getState().squad.find(q => q.id === first.id)!;
    expect(banked.unspentPoints).toBe(PROGRESSION.POINTS_PER_LEVEL);
    expect(spendSquadPoint(first.id, stat)).toBe(true);
    const spent = getState().squad.find(q => q.id === first.id)!;
    expect(spent.stats[stat]).toBe(banked.stats[stat] + 1);
    expect(spent.unspentPoints).toBe(PROGRESSION.POINTS_PER_LEVEL - 1);
    expect(spendSquadPoint('nobody', stat)).toBe(false);
    setSpendPointsMyself(false);
    applyTraining(getState());
    expect(getState().squad.find(q => q.id === first.id)!.unspentPoints).toBe(0);
  });

  it('the setting saves, and a save without it still loads', () => {
    setSpendPointsMyself(true);
    expect(validateCurrent(JSON.parse(JSON.stringify(getState()))).ok).toBe(true);
    expect(validateCurrent({ ...JSON.parse(JSON.stringify(getState())), settings: { ...getState().settings, spendPointsMyself: 'yes' } }).ok).toBe(false);
    const { spendPointsMyself, ...without } = getState().settings;
    expect(spendPointsMyself).toBe(true);
    const old = validateCurrent({ ...JSON.parse(JSON.stringify(getState())), settings: without });
    expect(old.ok).toBe(true);
    expect(old.ok && old.state.settings.spendPointsMyself).toBeUndefined();
  });
});

describe('applyInjuries', () => {
  it('base recovery of 1/wk with no medical facilities', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 3 });
    loadState({ ...getState(), squad: [p], facilities: [] });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(2);
  });

  it('medicalBay adds its level to recovery', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 5 });
    loadState({
      ...getState(), squad: [p],
      facilities: [pf({ defId: 'medicalBay', level: 2 })],
    });
    applyInjuries(getState());
    // 1 + level(2) = 3 → 5-3 = 2
    expect(getState().squad[0].injuredWeeks).toBe(2);
  });

  it('physioCentre adds 1 extra; stacks with medicalBay', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 6 });
    loadState({
      ...getState(), squad: [p],
      facilities: [
        pf({ defId: 'medicalBay', level: 1 }),
        pf({ defId: 'physioCentre', level: 1 }),
      ],
    });
    applyInjuries(getState());
    // 1 + medical(1) + physio(1) = 3 → 6-3 = 3
    expect(getState().squad[0].injuredWeeks).toBe(3);
  });

  it('never goes below 0', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 1 });
    loadState({
      ...getState(), squad: [p],
      facilities: [pf({ defId: 'medicalBay', level: 3 })],
    });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(0);
  });

  it('leaves fit players untouched', () => {
    const p = mkPlayer({ id: 'fit', injuredWeeks: 0 });
    loadState({ ...getState(), squad: [p], facilities: [] });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(0);
  });
});
