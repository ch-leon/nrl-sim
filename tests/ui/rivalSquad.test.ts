import { describe, it, expect } from 'vitest';
import { rivalSquadRows } from '../../src/ui/screens/rivalSquad';
import { generateRivalSquad } from '../../src/systems/rivals';

describe('rivalSquadRows (#74)', () => {
  it('lists the squad best first with traits', () => {
    const squad = generateRivalSquad({ id: 'rival-x', strength: 60 }, 3);
    squad[0] = { ...squad[0]!, traits: [{ id: 'hitman', level: 2 }], injuredWeeks: 2 };
    const rows = rivalSquadRows({ id: 'rival-x', name: 'X', colors: ['#000000', '#ffffff'], strength: 60, squad });
    expect(rows).toHaveLength(squad.length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.overall).toBeGreaterThanOrEqual(rows[i]!.overall);
    const hurt = rows.find((r) => r.id === squad[0]!.id)!;
    expect(hurt.traits).toBe('Hitman II');
    expect(hurt.injuredWeeks).toBe(2);
    expect(rivalSquadRows({ id: 'p', name: 'P', colors: ['#000000', '#ffffff'], strength: 55 })).toEqual([]);
  });
});
