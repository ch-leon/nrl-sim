import { describe, it, expect } from 'vitest';
import { rivalColorOptions, rivalSquadRows, withJersey } from '../../src/ui/screens/rivalSquad';
import { KIT_COLORS } from '../../src/ui/screens/kit';
import { colorsContrast } from '../../src/config';
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

describe('the club editor colours (#398)', () => {
  const club: [string, string] = ['#8e1c1c', '#f2c14e'];

  it("offers the club's own jersey first, then the kit designer's", () => {
    const { jerseys } = rivalColorOptions(club, club[0]);
    expect(jerseys[0]).toBe('#8e1c1c');
    expect(jerseys).toEqual(expect.arrayContaining([...KIT_COLORS]));
    expect(new Set(jerseys).size).toBe(jerseys.length);
  });

  it('offers only trims that read against the jersey, the own trim first when it does', () => {
    const { trims } = rivalColorOptions(club, club[0]);
    expect(trims[0]).toBe('#f2c14e');
    for (const t of trims) expect(colorsContrast(club[0], t)).toBe(true);
    expect(rivalColorOptions(club, '#ffffff').trims).not.toContain('#ffffff');
  });

  it('a new jersey keeps the trim when it still reads, else takes the first that does', () => {
    expect(withJersey(club, '#1a1a2e')).toEqual(['#1a1a2e', '#f2c14e']);
    const [jersey, trim] = withJersey(['#1a1a2e', '#f4d03f'], '#f4d03f');
    expect(jersey).toBe('#f4d03f');
    expect(colorsContrast(jersey, trim)).toBe(true);
  });
});
