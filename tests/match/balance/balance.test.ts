// tests/match/balance/balance.test.ts — the balance harness (balance/README.md):
// knobs by name with a clean way back, plans that fail fast on a typo, sweeps
// expanded in order, the report's bands and luck test, and a measured cell
// that is deterministic and actually feels its overrides.
import { describe, it, expect } from 'vitest';
import { BASE } from '../../../src/match/league/contest';
import { FATIGUE } from '../../../src/match/league/fatigue';
import { LIVE } from '../../../src/match/league/live';
import { PRESET_TABLES, attackPlan, defencePlan } from '../../../src/match/league/presets';
import { WRESTLE } from '../../../src/match/league/wrestle';
import { applyTuning, checkTuning, listKnobs } from '../../../src/match/league/tuning';
import { cellsOf, checkPlan, expandVariants, type Plan } from '../../../src/match/balance/plan';
import { measureCell, scenarioEdge, scenarioSides, sideSheet } from '../../../src/match/balance/measure';
import { DIFFICULTY } from '../../../src/config';
import { bandMark, delta, reportMarkdown } from '../../../src/match/balance/report';

const EVEN = { name: 'even', home: { rating: 60 }, away: { rating: 60 } };
const plan = (over: Partial<Plan> = {}): Plan => ({ name: 'p', seeds: 2, minutes: 2, scenarios: [EVEN], ...over });

describe('knobs by name', () => {
  it('lists every group and applies overrides with an exact way back', () => {
    const paths = listKnobs().map((k) => k.path);
    for (const p of ['live.carrySpeed', 'contest.broken', 'fatigue.runCost', 'fatigue.contactCost.carrier', 'wrestle.gripBase', 'wrestle.gang.1', 'traits.hitman', 'edge.hothead', 'presets.defence.rush.lineSpeed', 'presets.attackDefault.earlyKick']) {
      expect(paths).toContain(p);
    }
    const before = JSON.stringify(PRESET_TABLES);
    const restore = applyTuning({ 'wrestle.gripBase': 2, 'fatigue.contactCost.carrier': 0.5, 'contest.broken': 0.3, 'live.carrySpeed': 0.9, 'wrestle.gang.1': 3, 'presets.defence.rush.lineSpeed': 9 });
    expect(WRESTLE.gripBase).toBe(2);
    expect(FATIGUE.contactCost.carrier).toBe(0.5);
    expect(BASE.broken).toBe(0.3);
    expect(LIVE.carrySpeed).toBe(0.9);
    expect(WRESTLE.gang[1]).toBe(3);
    expect(defencePlan('rush').lineSpeed).toBe(9);
    restore();
    expect(WRESTLE.gripBase).toBe(1.3);
    expect(FATIGUE.contactCost.carrier).toBe(0.006);
    expect(BASE.broken).toBe(0.12);
    expect(LIVE.carrySpeed).toBe(0.95);
    expect(WRESTLE.gang[1]).toBe(1.5);
    expect(JSON.stringify(PRESET_TABLES)).toBe(before);
  });
  it('can set an attack preset field the table leaves out, and removes it again', () => {
    const before = JSON.stringify(PRESET_TABLES);
    const restore = applyTuning({ 'presets.attack.balanced.base.pass': 0.1, 'presets.attack.grind.zones.redZone.width': 0.2, 'presets.attack.balanced.zones.midfield.kickBias.bomb': 2 });
    expect(attackPlan('balanced', 'own20').pass).toBe(-0.05); // the zone still wins where it sets it
    expect(attackPlan('balanced', 'ownHalf').pass).toBe(0.1);
    expect(attackPlan('grind', 'redZone').width).toBe(0.2);
    expect(attackPlan('balanced', 'midfield').kickBias.bomb).toBe(2);
    restore();
    expect(JSON.stringify(PRESET_TABLES)).toBe(before);
  });
  it('refuses typos and non-numbers before changing anything', () => {
    expect(checkTuning({ 'wrestle.gripBse': 1 })).toHaveLength(1);
    expect(checkTuning({ 'presets.attack.balanced.base.pasz': 1 })).toHaveLength(1);
    expect(checkTuning({ 'fatigue.contactCost': 1 })).toHaveLength(1); // a group, not a number
    expect(checkTuning({ 'wrestle.gripBase': Number.NaN })).toHaveLength(1);
    expect(checkTuning({ 'wrestle.gripBase': 1.2, 'live.carrySpeed': 1.3 })).toEqual([]);
    expect(() => applyTuning({ 'wrestle.gripBase': 9, nope: 1 })).toThrow(/nope/);
    expect(WRESTLE.gripBase).toBe(1.3);
  });
});

describe('plans', () => {
  it('expands a sweep into every combination, baseline first, crossed with hand-written variants', () => {
    const vs = expandVariants(plan({ sweep: { 'wrestle.gripBase': [1.1, 1.2], 'fatigue.runCost': [0.0001, 0.0002] } }));
    expect(vs.map((v) => v.name)).toEqual([
      'baseline',
      'wrestle.gripBase=1.1, fatigue.runCost=0.0001',
      'wrestle.gripBase=1.1, fatigue.runCost=0.0002',
      'wrestle.gripBase=1.2, fatigue.runCost=0.0001',
      'wrestle.gripBase=1.2, fatigue.runCost=0.0002',
    ]);
    const crossed = expandVariants(plan({ base: { 'live.carrySpeed': 1.2 }, variants: [{ name: 'rush on', tuning: { 'presets.defence.rush.commit': 2 } }], sweep: { 'wrestle.gripBase': [1, 2] } }));
    expect(crossed.map((v) => v.name)).toEqual(['baseline', 'rush on · wrestle.gripBase=1', 'rush on · wrestle.gripBase=2']);
    expect(crossed[0]!.tuning).toEqual({ 'live.carrySpeed': 1.2 });
    expect(crossed[2]!.tuning).toEqual({ 'live.carrySpeed': 1.2, 'presets.defence.rush.commit': 2, 'wrestle.gripBase': 2 });
    expect(cellsOf(plan({ scenarios: [EVEN, { ...EVEN, name: 'b' }], sweep: { 'wrestle.gripBase': [1, 2] } }))).toHaveLength(6);
  });
  it('fails fast on a bad plan, naming each problem', () => {
    expect(checkPlan(plan())).toEqual([]);
    const errs = checkPlan(plan({ seeds: 0, scenarios: [{ ...EVEN, legs: 'tired' as never, home: { tactics: { attack: 'yolo' as never } } }], sweep: { 'wrestle.grip': [1] } }));
    expect(errs.join('\n')).toMatch(/seeds/);
    expect(errs.join('\n')).toMatch(/legs/);
    expect(errs.join('\n')).toMatch(/yolo/);
    expect(errs.join('\n')).toMatch(/wrestle\.grip/);
  });
  it('checks plan changes at the breaks (N11), and a change after a try plays a different match', () => {
    const bad = checkPlan(plan({ scenarios: [{ ...EVEN, plans: [{ side: 'home', at: 'later' as never, tactics: { attack: 'yolo' as never } }] }] }));
    expect(bad.join('\n')).toMatch(/half-time \/ try \/ conceded/);
    expect(bad.join('\n')).toMatch(/yolo/);
    const withPlan = plan({ minutes: 4, scenarios: [{ ...EVEN, plans: [{ side: 'home', at: 'try', tactics: { attack: 'expansive', defence: 'rush' } }] }] });
    expect(checkPlan(withPlan)).toEqual([]);
    const changed = measureCell(cellsOf(withPlan)[0]!, 1, 6);
    const same = measureCell(cellsOf(plan({ minutes: 4 }))[0]!, 1, 6);
    expect(changed.counts).not.toEqual(same.counts);
    expect(measureCell(cellsOf(withPlan)[0]!, 1, 6).counts).toEqual(changed.counts);
  }, 60_000);
  it('builds flat squads with stat overrides, or a club roster', () => {
    const s = sideSheet('H', { rating: 70, stats: { stamina: 30 }, tactics: { defence: 'rush' } });
    expect(s.roster).toHaveLength(9);
    expect(s.roster![0]!.stats).toMatchObject({ speed: 70, stamina: 30 });
    expect(s.tactics).toEqual({ attack: 'balanced', defence: 'rush' });
    expect(s.roster![0]!.traits).toBeUndefined();
    expect(sideSheet('H', { traits: 'stars' }).roster![0]!.traits).toHaveLength(2);
    expect(sideSheet('A', { club: 'rival-wolves' }).roster!.length).toBeGreaterThan(0);
  });
  it('builds squad sides the way the game does (N12.2): a new pair each seed, a rival level with the other side, the same pair either way round', () => {
    const one = scenarioSides({ squad: 'player' }, { squad: 'rival' }, 1);
    expect(one.home.roster).toHaveLength(9);
    expect(one.home.bench).toHaveLength(4);
    expect(one.away.roster!.map((r) => r.position)).toEqual(one.home.roster!.map((r) => r.position)); // both picked by slot
    expect(Math.abs(one.nine.away! - one.nine.home!)).toBeLessThan(2); // level
    const swapped = scenarioSides({ squad: 'rival' }, { squad: 'player' }, 1);
    expect(swapped.away.roster).toEqual(one.home.roster);
    expect(swapped.home.roster).toEqual(one.away.roster);
    expect(scenarioSides({ squad: 'player' }, { squad: 'rival' }, 2).home.roster).not.toEqual(one.home.roster);
    const bare = scenarioSides({ squad: 'player', traits: 'none', bench: 0 }, { squad: 'rival', rating: 70, tactics: { defence: 'rush' } }, 1);
    expect(bare.home.roster!.every((r) => r.traits === undefined)).toBe(true);
    expect(bare.home.bench).toEqual([]);
    expect(bare.away.tactics).toEqual({ attack: 'balanced', defence: 'rush' });
    expect(bare.nine.away).toBeGreaterThan(66);
    expect(checkPlan(plan({ scenarios: [{ name: 's', home: { squad: 'coach' as never, club: 'rival-wolves' }, away: { rating: 60, rivalOf: 'nightmare' as never } }] })).join('\n')).toMatch(/player \/ rival[\s\S]*not both[\s\S]*rivalOf/);
    expect(checkPlan(plan({ scenarios: [{ name: 's', home: { rivalOf: 'hard' }, away: { rivalOf: 'easy' } }] })).join('\n')).toMatch(/only one side is the rival/);
  });
  it('plays a rival with the difficulty’s edge (N12.2), swept by name as difficulty.<d>.rivalEdge', () => {
    expect(listKnobs().map((k) => k.path)).toEqual(expect.arrayContaining(['difficulty.easy.rivalEdge', 'difficulty.normal.rivalEdge', 'difficulty.hard.rivalEdge']));
    expect(listKnobs().some((k) => k.path.startsWith('difficulty.') && !k.path.endsWith('.rivalEdge'))).toBe(false); // money and wages are not match knobs
    const was = DIFFICULTY.hard.rivalEdge;
    const restore = applyTuning({ 'difficulty.hard.rivalEdge': 7 });
    expect(DIFFICULTY.hard.rivalEdge).toBe(7);
    expect(scenarioEdge({ rating: 60 }, { rating: 60, rivalOf: 'hard' })).toEqual({ side: 'away', points: 7 });
    restore();
    expect(DIFFICULTY.hard.rivalEdge).toBe(was);
    const p = plan({ scenarios: [{ name: 'hard', home: { rating: 60 }, away: { rating: 60, rivalOf: 'hard' } }], variants: [{ name: 'big', tuning: { 'difficulty.hard.rivalEdge': 10 } }, { name: 'none', tuning: { 'difficulty.hard.rivalEdge': 0 } }] });
    const [, big, none] = cellsOf(p).map((c) => measureCell(c, 2, 2));
    expect(big!.counts).not.toEqual(none!.counts);
    expect(DIFFICULTY.hard.rivalEdge).toBe(was);
  });
});

describe('measuring and reporting', () => {
  it('a cell is deterministic, feels its overrides, and puts the knobs back', () => {
    const cell = (tuning = {}) => cellsOf(plan({ variants: [{ name: 'v', tuning }] })).find((c) => c.variant.name === 'v')!;
    const a = measureCell(cell(), 2, 2);
    const b = measureCell(cell(), 2, 2);
    expect(a.counts).toEqual(b.counts);
    expect(a.counts.tackles.mean).toBeGreaterThan(0);
    expect(a.legs.map((l) => l.minute)).toEqual([]); // under 3 minutes: no legs reading yet
    const tired = measureCell(cell({ 'fatigue.runCost': 0.002 }), 2, 3);
    expect(tired.legs[0]!.home).toBeLessThan(0.7);
    expect(FATIGUE.runCost).toBe(0.00015);
    expect(measureCell(cell(), 2, 3).legs[0]!.home).toBeGreaterThan(0.85);
  });
  it('marks the §7 bands and flags only changes beyond luck', () => {
    expect(bandMark('tries', 7)).toBe('✓');
    expect(bandMark('tries', 3)).toBe('↓');
    expect(bandMark('tackles', 150)).toBe('✓');
    expect(bandMark('tackles', 250)).toBe('↑');
    expect(bandMark('gassed', 4)).toBe('');
    expect(delta({ mean: 10, se: 0.5 }, { mean: 7, se: 0.5 })).toBe('+3.0*');
    expect(delta({ mean: 10, se: 2 }, { mean: 7, se: 2 })).toBe('+3.0');
    expect(delta({ mean: 10, se: 0.5 }, { mean: 7, se: 0.5 }, false)).toBe('+3.0');
  });
  it('writes a report with a row per variant and what moved since a previous run', () => {
    const cells = cellsOf(plan({ sweep: { 'wrestle.gripBase': [0.6] } }));
    const results = cells.map((c) => measureCell(c, 2, 2));
    const md = reportMarkdown({ plan: plan(), meta: { commit: 'abc' }, results, previous: results });
    expect(md).toContain('## even');
    expect(md).toContain('| baseline |');
    expect(md).toContain('| wrestle.gripBase=0.6 |');
    expect(md).toContain('nothing beyond noise');
    // A previous run from before a metric existed is compared on the metrics it has.
    const older = results.map((r) => ({ ...r, counts: Object.fromEntries(Object.entries(r.counts).filter(([k]) => k !== 'runDowns')) })) as typeof results;
    expect(reportMarkdown({ plan: plan(), meta: {}, results, previous: older })).toContain('nothing beyond noise');
  });
});
