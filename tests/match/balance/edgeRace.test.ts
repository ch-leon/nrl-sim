// tests/match/balance/edgeRace.test.ts — #322: the Speed levers (the edge race,
// the signed Slide v Expansive response, the relative Compressed edge term) are
// relative and roll-free, so a flat match plays bit for bit the same with them on
// or off, and fast backs carrying wide in an Expansive plan beat a flat Slide line
// by more than they did without them.
import { describe, expect, it } from 'vitest';
import { BalanceSim, measureCell } from '../../../src/match/balance/measure';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';
import type { SideSpec } from '../../../src/match/balance/plan';

const OFF: Overrides = { 'race.on': 0, 'counters.slide.expansiveSigned': 0, 'counters.compressed.expansiveRelative': 0 };
const SEEDS = 40;
const MARGIN = 0.02;
const ON: Overrides = { 'race.on': 1, 'counters.slide.expansiveSigned': 1, 'counters.compressed.expansiveRelative': 1 };

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

  it('fast backs in an Expansive plan beat a flat Slide line by more with the levers on', () => {
    const cell = (tuning: Overrides) => ({
      variant: { name: 'x', tuning },
      scenario: {
        name: 'fast-backs expansive v flat slide', track: 'home' as const, bothWays: true,
        home: { rating: 60, positionStats: { backs: { speed: 72 } }, tactics: { attack: 'expansive' as const } },
        away: { rating: 60, tactics: { defence: 'slide' as const } },
      },
    });
    const off = measureCell(cell(OFF), SEEDS);
    const on = measureCell(cell(ON), SEEDS);
    expect(on.pointsShare!.mean - off.pointsShare!.mean).toBeGreaterThan(MARGIN);
    expect(on.trackedCounts!.busts.mean).toBeGreaterThan(off.trackedCounts!.busts.mean);
  }, 120_000);
});
