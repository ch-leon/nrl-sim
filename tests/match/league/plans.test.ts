// tests/match/league/plans.test.ts — changing the plan at the breaks (N11,
// docs/plans/N10-N12.md item 2): a plan change is an input to the running sim
// at a tick, like a coach call. It is taken only at a break (half-time, or a
// try until the restart is kicked) and comes into force at the restart; no
// change plays exactly as before, and the same seed and changes give the same match.
import { describe, it, expect } from 'vitest';
import { LiveSim, type PlanInput } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { TeamTactics } from '../../../src/match/league/presets';
import type { MatchLength } from '../../../src/match/league/rules';

const H = sideSheet('H', { rating: 60 });
const A = sideSheet('A', { rating: 60 });
const SHORT: MatchLength = { halves: 2, halfMinutes: 3 };
const EXP_RUSH: TeamTactics = { attack: 'expansive', defence: 'rush' };

/** Play a short match; the home coach asks for `tactics` at the first moment `when` says yes. */
function play(seed: number, tactics: TeamTactics | null, when: (sim: LiveSim) => boolean): { sim: LiveSim; events: SimEvent[]; plans: PlanInput[]; refused: string[] } {
  const plans: PlanInput[] = [];
  const refused: string[] = [];
  const sim = new LiveSim(H, A, seed, { length: SHORT, plans });
  const events: SimEvent[] = [];
  while (!sim.finished) {
    if (tactics && plans.length === 0 && when(sim)) {
      const why = sim.planRefusal();
      if (why) refused.push(why);
      else plans.push({ tick: sim.tick + 1, side: 'home', tactics });
    }
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { sim, events, plans, refused };
}

describe('changing the plan at the breaks (N11)', () => {
  it('is refused in open play and taken at half-time, in force from the second-half kick-off', () => {
    const open = play(3, EXP_RUSH, (s) => s.phaseKind === 'play' && s.tick > 200);
    expect(open.refused.length).toBeGreaterThan(0);
    expect(new Set(open.refused)).toEqual(new Set(['at the breaks']));
    expect(open.plans).toHaveLength(0);
    expect(open.sim.tactics.home).toEqual({ attack: 'balanced', defence: 'slide' });

    const ht = play(3, EXP_RUSH, (s) => s.phaseKind === 'half-time');
    expect(ht.plans).toHaveLength(1);
    const plan = ht.events.filter((e) => e.kind === 'plan');
    expect(plan).toHaveLength(1);
    expect(plan[0]!.text).toContain('Expansive / Rush');
    expect(ht.sim.tactics.home).toEqual(EXP_RUSH);
    expect(ht.sim.tactics.away).toEqual({ attack: 'balanced', defence: 'slide' });
  });

  it('after a try the change waits for the restart', () => {
    const r = play(5, EXP_RUSH, (s) => s.phaseKind === 'try');
    expect(r.plans).toHaveLength(1);
    const at = r.plans[0]!.tick;
    const plan = r.events.find((e) => e.kind === 'plan')!;
    expect(plan.tick).toBeGreaterThan(at);
    expect(r.sim.tactics.home).toEqual(EXP_RUSH);
  });

  it('the same plan again changes nothing; no change plays exactly as runMatch', () => {
    const same = play(7, { attack: 'balanced', defence: 'slide' }, (s) => s.phaseKind === 'half-time');
    expect(same.plans).toHaveLength(1);
    expect(same.events.some((e) => e.kind === 'plan')).toBe(false);
    const none = runMatch(H, A, { seed: 7, length: SHORT });
    expect(runMatch(H, A, { seed: 7, length: SHORT, plans: same.plans })).toEqual(none);
    expect(runMatch(H, A, { seed: 7, length: SHORT, plans: [] })).toEqual(none);
  });

  it('a change at half-time gives a different match, the same one every time with the same changes', () => {
    const ht = play(11, EXP_RUSH, (s) => s.phaseKind === 'half-time');
    const changed = runMatch(H, A, { seed: 11, length: SHORT, plans: ht.plans });
    expect(changed).not.toEqual(runMatch(H, A, { seed: 11, length: SHORT }));
    expect(runMatch(H, A, { seed: 11, length: SHORT, plans: ht.plans.map((p) => ({ ...p })) })).toEqual(changed);
  });
});
