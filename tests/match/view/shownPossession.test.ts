// tests/match/view/shownPossession.test.ts — the coach tray goes by the side with
// the ball on screen (#348). The sim hands a kick-off or drop-out to the receivers
// as the kicker lines it up; the tray must not say "Your ball" to the receivers
// (nor offer them Hit-up) while the other side's kicker holds it.
import { describe, it, expect } from 'vitest';
import { shownPossession } from '../../../src/match/view/livePlayback';
import { LiveSim } from '../../../src/match/league/live';
import { COACH_CALLS, callIsBench, callIsDefence, callIsKickoff } from '../../../src/match/league/calls';
import type { Side } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;

function sheet(id: string): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: 60,
    defense: 60,
    kicking: 60,
    fitness: 60,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({
      name: `${id} ${i}`,
      position,
      stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60 },
    })),
  };
}

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const ball = (holder: Side | null) => ({ ball: { x: 0, y: 0, lift: 0, holder: holder ? { side: holder, slot: 4 } : null } });

/** The tray's rule (MatchScene.refreshCallChips): calls for the play on screen that the sim takes now. */
function trayCalls(sim: LiveSim, side: Side): string[] {
  const attacking = shownPossession(sim.snapshot(), sim.inPossession) === side;
  return COACH_CALLS.filter((c) => !callIsBench(c) && !callIsKickoff(c) && callIsDefence(c) !== attacking && sim.callRefusal(side, c) === null);
}

describe('shownPossession (#348)', () => {
  it('is whoever holds the ball in the picture, else the sim\'s attacking side', () => {
    expect(shownPossession(ball('home'), 'away')).toBe('home');
    expect(shownPossession(ball('away'), 'away')).toBe('away');
    expect(shownPossession(ball(null), 'away')).toBe('away');
    expect(shownPossession(ball(null), 'home')).toBe('home');
  });

  it('follows the ball through a change of possession: the restart is the kicker\'s, the set is the catcher\'s', () => {
    const sim = new LiveSim(sheet('H'), sheet('A'), 1, { weather: 'clear' });
    let restarts = 0;
    let flips = 0;
    let shownBefore: Side | null = null;
    while (!sim.finished) {
      sim.step();
      const snap = sim.snapshot();
      const shown = shownPossession(snap, sim.inPossession);
      const holder = snap.ball.holder;
      if (holder) expect(shown).toBe(holder.side);
      if (sim.phaseKind === 'restart' && holder && holder.side !== sim.inPossession) {
        restarts++;
        // The kicker holds it: his side is shown with the ball, though the sim already has the receivers attacking.
        expect(shown).toBe(other(sim.inPossession));
        // Neither tray offers a call the play on screen belies: no Hit-up for the receivers, no Rush for the kickers.
        expect(trayCalls(sim, sim.inPossession), `tick ${sim.tick}`).toEqual([]);
        expect(trayCalls(sim, other(sim.inPossession)), `tick ${sim.tick}`).toEqual([]);
      }
      if (shownBefore && shown !== shownBefore) flips++;
      shownBefore = shown;
    }
    expect(restarts).toBeGreaterThan(0);
    expect(flips).toBeGreaterThan(10);
  });

  it('agrees with the sim whenever the side holding the ball is the one attacking: open play, tackles, rucks, set pieces', () => {
    const sim = new LiveSim(sheet('H'), sheet('A'), 2, { weather: 'clear' });
    const differ = new Set<string>();
    while (!sim.finished) {
      sim.step();
      const snap = sim.snapshot();
      if (snap.ball.holder && shownPossession(snap, sim.inPossession) !== sim.inPossession) differ.add(sim.phaseKind);
    }
    // Only a restart, with the kicker lining it up, shows a different side from the sim's.
    expect([...differ]).toEqual(['restart']);
  });
});
