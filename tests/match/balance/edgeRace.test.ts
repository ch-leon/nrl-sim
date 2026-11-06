// tests/match/balance/edgeRace.test.ts — #322: the Speed levers (the edge race,
// the signed Slide v Expansive response, the relative Compressed edge term) are
// relative and roll-free, so a flat match plays bit for bit the same with them on
// or off, and with the edge race switched on fast backs carrying wide bust more.
import { describe, expect, it } from 'vitest';
import { BalanceSim, measureCell } from '../../../src/match/balance/measure';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';
import type { SideSpec } from '../../../src/match/balance/plan';

/** Every #322 lever off (before), and on (the shipped B and C with the edge race switched on too). */
const OFF: Overrides = { 'race.on': 0, 'counters.slide.expansiveSigned': 0, 'counters.compressed.expansiveRelative': 0 };
const SEEDS = 30;
/** Busts a match the tracked side gains; +2.2 measured over these seeds. */
const MARGIN = 1;
const ON: Overrides = { 'race.on': 1, 'race.single': 0, 'counters.slide.expansiveSigned': 1, 'counters.compressed.expansiveRelative': 1 };

function stream(home: SideSpec, away: SideSpec, seed: number, over: Overrides): string {
  const restore = applyTuning(over);
  try {
    const sim = new BalanceSim(sideSheet('H', home), sideSheet('A', away), seed, {}, { home: home.fit, away: away.fit });
    const parts: string[] = [];
    while (!sim.finished && sim.tick < 100_000) {
      sim.step();
      for (const e of sim.tickEvents) parts.push(`${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`);
    }
    return parts.join('|');
  } finally {
    restore();
  }
}

const ATTACKS: readonly AttackPreset[] = ['balanced', 'grind', 'expansive', 'kick-chase', 'all-out'];
const DEFENCES: readonly DefencePreset[] = ['slide', 'rush', 'compressed'];

describe('the #322 Speed levers', () => {
  it('leave every flat preset cell and the full-fit Expansive cells bit for bit the same', () => {
    const cells: [SideSpec, SideSpec][] = [];
    for (const attack of ATTACKS) for (const defence of DEFENCES) {
      cells.push([{ rating: 60, tactics: { attack } }, { rating: 60, tactics: { defence } }]);
    }
    cells.push([{ rating: 60, tactics: { attack: 'expansive' }, fit: { expansive: 0.5 } }, { rating: 60, tactics: { defence: 'slide' }, fit: { slide: 1.5 } }]);
    cells.push([{ rating: 60, tactics: { attack: 'expansive' }, fit: { expansive: 1.5 } }, { rating: 60, tactics: { defence: 'compressed' }, fit: { compressed: 0.5 } }]);
    for (const [home, away] of cells) {
      expect(stream(home, away, 3, ON), `${home.tactics?.attack} v ${away.tactics?.defence}`).toBe(stream(home, away, 3, OFF));
    }
  }, 120_000);

  it('with the edge race on, fast backs carrying wide bust a flat line more', () => {
    const cell = (tuning: Overrides) => ({
      variant: { name: 'x', tuning },
      scenario: {
        name: 'fast-backs expansive v flat slide', track: 'home' as const, bothWays: true,
        home: { rating: 60, positionStats: { backs: { speed: 85 } }, tactics: { attack: 'expansive' as const } },
        away: { rating: 60, tactics: { defence: 'slide' as const } },
      },
    });
    const off = measureCell(cell({ ...ON, 'race.on': 0 }), SEEDS);
    const on = measureCell(cell({ ...ON, 'race.on': 1, 'race.perPoint': 0.02, 'race.single': 0 }), SEEDS);
    expect(on.trackedCounts!.busts.mean - off.trackedCounts!.busts.mean).toBeGreaterThan(MARGIN);
  }, 120_000);
});
