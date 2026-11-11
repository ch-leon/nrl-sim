import { describe, expect, it } from 'vitest';
import { COUNTER_MATRIX, pickRivalPlan, planValue, usualPlan } from '../../../src/match/league/ai';
import { styleFit, type StyleFit } from '../../../src/match/league/fit';
import { ATTACK_PRESETS, DEFENCE_PRESETS, DEFAULT_TACTICS, rivalTactics, type StyleEntry, type TeamTactics } from '../../../src/match/league/presets';
import { STANDARD_POSITIONS, teamSheetFromRival } from '../../../src/match/league/sheets';
import { applyTuning } from '../../../src/match/league/tuning';

const neutral = styleFit([]);
const wide: TeamTactics = { attack: 'expansive', defence: 'compressed' };
const tight: TeamTactics = { attack: 'grind', defence: 'slide' };

describe('rival plans from three past kick-offs', () => {
  it('Easy preserves main’s All-out / Slide for a flat-60 nine at strength 70', () => {
    const club = { id: 'flat-contender', strength: 70 };
    const nine: StyleEntry[] = STANDARD_POSITIONS.map(position => ({ position,
      stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 } }));
    const legacy = rivalTactics(club, nine);
    expect(legacy).toEqual({ attack: 'all-out', defence: 'slide' });
    for (const recentPlans of [[], [wide, wide, wide], [tight, tight, tight]]) {
      expect(rivalTactics(club, nine, { difficulty: 'easy', recentPlans, playerRoster: [] })).toEqual(legacy);
    }
  });
  it('Easy matches the legacy selector across squad styles, strengths and histories', () => {
    const flat: StyleEntry[] = STANDARD_POSITIONS.map(position => ({ position,
      stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 } }));
    const nines = [undefined, [], flat,
      flat.map(p => ({ ...p, stats: { ...p.stats!, strength: ['hooker', 'prop', 'second-row'].includes(p.position) ? 85 : 60 } })),
      flat.map(p => ({ ...p, stats: { ...p.stats!, speed: ['fullback', 'winger', 'centre'].includes(p.position) ? 85 : 60 } })),
      flat.map(p => ({ ...p, stats: { ...p.stats!, stamina: 85 } })),
      flat.map(p => ({ ...p, traits: p.position === 'halfback' ? [{ id: 'bigBoot' }] : [] }))];
    for (const strength of [35, 55, 70]) for (const nine of nines) for (const recentPlans of [[], [wide, wide, wide], [tight, tight, tight]]) {
      const club = { id: 'legacy', strength };
      expect(rivalTactics(club, nine, { difficulty: 'easy', recentPlans, playerRoster: flat })).toEqual(rivalTactics(club, nine));
    }
  });
  it('Easy and the AI off switch preserve generated fallback sheets, including identity tactics', () => {
    const club = { id: 'legacy-generated', name: 'Legacy', strength: 70, colors: ['#000', '#fff'] as [string, string] };
    const legacy = teamSheetFromRival(club);
    expect(teamSheetFromRival(club, { difficulty: 'easy', recentPlans: [wide], playerRoster: [] })).toEqual(legacy);
    const restore = applyTuning({ 'counters.ai.on': 0 });
    try { expect(teamSheetFromRival(club, { difficulty: 'normal', recentPlans: [wide], playerRoster: [] })).toEqual(legacy); }
    finally { restore(); }
  });
  it.each(['normal', 'hard'] as const)('%s changes its best counter when history changes', difficulty => {
    const a = pickRivalPlan(neutral, neutral, difficulty, [wide, wide, tight]);
    const b = pickRivalPlan(neutral, neutral, difficulty, [tight, tight, wide]);
    expect(a).toEqual({ attack: 'expansive', defence: 'slide' });
    expect(COUNTER_MATRIX[b.attack][tight.defence]).toBe(1);
    expect(b.defence).toBe('compressed');
    expect(a).not.toEqual(b);
  });
  it.each(['normal', 'hard'] as const)('%s has a deterministic no-history Balanced / Slide default', difficulty => {
    expect(pickRivalPlan(neutral, neutral, difficulty, [])).toEqual(pickRivalPlan(neutral, neutral, difficulty, [DEFAULT_TACTICS]));
  });
  it('uses the joint mode of only the last three, breaking ties newest first', () => {
    expect(usualPlan([wide, tight, tight, wide, wide, wide])).toEqual(tight);
    expect(usualPlan([wide, tight])).toEqual(wide);
    for (const difficulty of ['normal', 'hard'] as const) {
      expect(pickRivalPlan(neutral, neutral, difficulty, [wide, tight, tight, wide, wide])).toEqual(pickRivalPlan(neutral, neutral, difficulty, [wide, tight, tight]));
    }
  });
  it('Normal maximises matrix × both fits plus own fit against the usual plan', () => {
    const own: StyleFit = { ...neutral, grind: 1.3, expansive: 0.6, slide: 0.7, rush: 1.2 };
    const theirs = { ...neutral, expansive: 1.4, compressed: 1.3 };
    const picked = pickRivalPlan(own, theirs, 'normal', [wide, tight, wide]);
    for (const attack of ATTACK_PRESETS) for (const defence of DEFENCE_PRESETS) {
      expect(planValue(picked, wide, own, theirs)).toBeGreaterThanOrEqual(planValue({ attack, defence }, wide, own, theirs));
    }
  });
  it('Hard weighs all three habits by player fit, including a strong minority plan', () => {
    const theirs = { ...neutral, grind: 1.5, expansive: 0.1, compressed: 0.1, slide: 1.5 };
    const normal = pickRivalPlan(neutral, theirs, 'normal', [wide, wide, tight]);
    const hard = pickRivalPlan(neutral, theirs, 'hard', [wide, wide, tight]);
    expect(hard).not.toEqual(normal);
    for (const attack of ATTACK_PRESETS) for (const defence of DEFENCE_PRESETS) {
      const value = (p: TeamTactics) => [wide, wide, tight].reduce((sum, h) => sum + (theirs[h.attack] + theirs[h.defence]) / 2 * planValue(p, h, neutral, theirs), 0);
      expect(value(hard)).toBeGreaterThanOrEqual(value({ attack, defence }));
    }
  });
  it('keeps the legacy rival-v-rival pick and supports the AI off switch', () => {
    const club = { id: 'test', strength: 65 };
    const legacy = rivalTactics(club);
    const restore = applyTuning({ 'counters.ai.on': 0 });
    try { expect(rivalTactics(club, [], { difficulty: 'hard', recentPlans: [wide], playerRoster: [] })).toEqual(legacy); }
    finally { restore(); }
    expect(rivalTactics(club)).toEqual(legacy);
  });
});
