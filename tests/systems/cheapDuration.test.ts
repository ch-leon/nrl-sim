import { expect, it, vi } from 'vitest';
import { cheapSimScore } from '../../src/systems/fixtures';
import { NINES } from '../../src/match/league/rules';
import type { Rng } from '../../src/utils/rng';
import type { RivalClub } from '../../src/core/state';

it('keeps the cheap engine on the selected match duration without consuming extra dice', () => {
  const side = (id: string): RivalClub => ({ id, name: id, colors: ['#111', '#eee'], strength: 60 });
  const original = NINES.halfMinutes;
  try {
    for (const halfMinutes of [7, 2.5]) {
      NINES.halfMinutes = halfMinutes;
      const int = vi.fn().mockReturnValueOnce(15).mockReturnValueOnce(7);
      const result = cheapSimScore(side('h'), side('a'), { int } as unknown as Rng);
      expect(result).toEqual({ homeScore: Math.round(15.5 * halfMinutes / 7), awayScore: Math.round(7.5 * halfMinutes / 7) });
      expect(int).toHaveBeenCalledTimes(2);
      expect(int).toHaveBeenNthCalledWith(1, 0, 29);
      expect(int).toHaveBeenNthCalledWith(2, 0, 29);
    }
  } finally { NINES.halfMinutes = original; }
});
