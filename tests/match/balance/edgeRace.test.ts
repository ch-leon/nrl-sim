// tests/match/balance/edgeRace.test.ts — #322: the Speed levers (the edge race,
// the signed Slide v Expansive response, the relative Compressed edge term) are
// relative and roll-free, so a flat 60 v 60 match plays bit for bit the same with
// them on or off (at Speed 60 the relative Compressed term equals the old Speed / 60;
// at other flat Speeds it does not). The bust-rate sample, seeds 1..400 at
// margin 1, is the four edgeRace.part files: one mean, split so a unit shard
// can run it inside the 15-minute job.
import { describe, expect, it } from 'vitest';
import { BalanceSim, sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';
import type { SideSpec } from '../../../src/match/balance/plan';
import { EDGE_RACE_MARGIN, EDGE_RACE_RANGES, EDGE_RACE_SEEDS } from './edgeRace';

/** Every #322 lever off (the shipped defaults), and every one on. */
const OFF: Overrides = { 'race.on': 0, 'counters.slide.expansiveSigned': 0, 'counters.compressed.expansiveRelative': 0 };
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

  it('splits seeds 1..400 into four ranges that still meet as one sample at margin 1', () => {
    const seeds = EDGE_RACE_RANGES.flatMap((r) => Array.from({ length: r.seeds }, (_, i) => r.seedStart + i));
    expect(seeds).toEqual(Array.from({ length: EDGE_RACE_SEEDS }, (_, i) => i + 1));
    expect(new Set(seeds).size).toBe(EDGE_RACE_SEEDS);
    expect(EDGE_RACE_MARGIN).toBe(1);
  });
});
