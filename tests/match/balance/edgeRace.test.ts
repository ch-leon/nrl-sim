// tests/match/balance/edgeRace.test.ts — #322: the Speed levers (the edge race,
// the signed Slide v Expansive response, the relative Compressed edge term) are
// relative and roll-free, so a flat 60 v 60 match plays bit for bit the same with
// them on or off (at Speed 60 the relative Compressed term equals the old Speed / 60;
// at other flat Speeds it does not), and with the edge race on fast backs carrying
// wide bust more.
import { describe, expect, it } from 'vitest';
import { BalanceSim, MATCH_MINUTES, measureCell } from '../../../src/match/balance/measure';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';
import type { SideSpec } from '../../../src/match/balance/plan';

/** Every #322 lever off (the shipped defaults), and every one on. */
const OFF: Overrides = { 'race.on': 0, 'counters.slide.expansiveSigned': 0, 'counters.compressed.expansiveRelative': 0 };
const SEEDS = 30;
/** Extra busts per fourteen minutes for the tracked side; keep the historical rate threshold. */
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
  it('leave every flat 60 preset cell and the full-fit Expansive cells bit for bit the same', () => {
    const cells: [SideSpec, SideSpec][] = [];
    for (const attack of ATTACKS) for (const defence of DEFENCES) {
      cells.push([{ rating: 60, tactics: { attack } }, { rating: 60, tactics: { defence } }]);
    }
    cells.push([{ rating: 60, tactics: { attack: 'expansive' }, fit: { expansive: 0.5 } }, { rating: 60, tactics: { defence: 'slide' }, fit: { slide: 1.5 } }]);
    cells.push([{ rating: 60, tactics: { attack: 'expansive' }, fit: { expansive: 1.5 } }, { rating: 60, tactics: { defence: 'compressed' }, fit: { compressed: 0.5 } }]);
    for (const seed of [3, 8]) for (const [home, away] of cells) {
      expect(stream(home, away, seed, ON), `${home.tactics?.attack} v ${away.tactics?.defence} seed ${seed}`).toBe(stream(home, away, seed, OFF));
    }
  }, 240_000);

  it('with the edge race on, fast backs carrying wide bust a flat line more', () => {
    const cell = (tuning: Overrides) => ({
      variant: { name: 'x', tuning },
      scenario: {
        name: 'fast-backs expansive v flat slide', track: 'home' as const, bothWays: true,
        home: { rating: 60, positionStats: { backs: { speed: 85 } }, tactics: { attack: 'expansive' as const } },
        away: { rating: 60, tactics: { defence: 'slide' as const } },
      },
    });
    // Twice the seeds since the attack shapes (#649 step 2): over 30 both ways the race's extra busts read 0.98 a match.
    const off = measureCell(cell({ ...ON, 'race.on': 0 }), SEEDS * 2);
    const on = measureCell(cell({ ...ON, 'race.on': 1, 'race.perPoint': 0.02, 'race.single': 0 }), SEEDS * 2);
    // The harness now reports counts per five-minute default; compare the established
    // fourteen-minute rate so shortening the clock does not dilute the physics threshold.
    const extraBustsPer14Minutes = (on.trackedCounts!.busts.mean - off.trackedCounts!.busts.mean) * 14 / MATCH_MINUTES;
    expect(extraBustsPer14Minutes).toBeGreaterThan(MARGIN);
  }, 240_000);
});
