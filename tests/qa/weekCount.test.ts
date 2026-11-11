import { describe, expect, it } from 'vitest';
import { weeksAdvanced } from '../../scripts/e2e-week-count.mjs';

describe('browser performance weekly tick count', () => {
  it('counts both trial weeks while the league round stays at one', () => {
    expect(weeksAdvanced({ season: 1, week: 1, preseason: 1 }, { season: 1, week: 1, preseason: 2 })).toBe(1);
    expect(weeksAdvanced({ season: 1, week: 1, preseason: 2 }, { season: 1, week: 1, preseason: 0 })).toBe(1);
    expect(weeksAdvanced({ season: 1, week: 1, preseason: 1 }, { season: 1, week: 3, preseason: 0 })).toBe(4);
  });

  it('counts the season-ending week and next season trials exactly once', () => {
    expect(weeksAdvanced({ season: 1, week: 27, preseason: 0 }, { season: 2, week: 1, preseason: 1 })).toBe(1);
    expect(weeksAdvanced({ season: 1, week: 26, preseason: 0 }, { season: 2, week: 2, preseason: 0 })).toBe(5);
  });

  it('keeps ordinary rounds and legacy careers without trials correct', () => {
    expect(weeksAdvanced({ season: 1, week: 3, preseason: 0 }, { season: 1, week: 7, preseason: 0 })).toBe(4);
    expect(weeksAdvanced({ season: 1, week: 26 }, { season: 2, week: 2 })).toBe(3);
    expect(weeksAdvanced({ season: 2, week: 1, preseason: 2 }, { season: 2, week: 1, preseason: 2 })).toBe(0);
  });
});
