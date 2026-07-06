import { describe, it, expect } from 'vitest';
import * as config from '../src/config';

describe('config constants', () => {
  it('matches the documented values in ARCHITECTURE.md §3', () => {
    expect(config.GRID_W).toBe(20);
    expect(config.GRID_H).toBe(20);
    expect(config.TILE_W).toBe(64);
    expect(config.TILE_H).toBe(32);
    expect(config.SEASON_ROUNDS).toBe(24);
    expect(config.FINALS_WEEKS).toBe(3);
    expect(config.WEEKS_PER_SEASON).toBe(27);
    expect(config.SQUAD_CAP).toBe(30);
    expect(config.SQUAD_MIN).toBe(13);
    expect(config.STARTING_MONEY).toBe(200_000);
    expect(config.STAT_MAX).toBe(100);
  });

  it('derives WEEKS_PER_SEASON from rounds + finals', () => {
    expect(config.WEEKS_PER_SEASON).toBe(config.SEASON_ROUNDS + config.FINALS_WEEKS);
  });
});
