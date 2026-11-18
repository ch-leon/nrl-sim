import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrateState } from '../../src/core/save';
import * as entry from '../../src/systems/openCupEntry';
import { validateCompetitions } from '../../src/data/competition';

for (const region of ['au', 'uk'])
  it('freezes the ' + region + ' field from only the final choice and saved draw seed', () => {
    const source = JSON.parse(
      readFileSync(new URL('../fixtures/saves/league-career/v32-' + region + '-week-6.json', import.meta.url), 'utf8')
    );
    const migrated = migrateState(source);
    if (!migrated.ok) throw Error(migrated.message);
    const s = migrated.state;
    const choose = (state: typeof s, choice: 'enter' | 'decline') => {
      const p = entry.previewOpenCupEntry(state);
      if (!p.ok) throw Error(p.message);
      expect(p.preview).not.toHaveProperty('byes');
      const r = entry.chooseOpenCupEntry(state, { ...p.preview, choice });
      if (!r.ok) throw Error(r.message);
      return r.state;
    };
    const entered = choose(s, 'enter');
    const declined = choose(entered, 'decline');
    const restored = choose(JSON.parse(JSON.stringify(declined)), 'enter');
    for (const [state, resolution, size] of [
      [s, 'expired', 23],
      [declined, 'declined', 23],
      [restored, 'entered', 24]
    ] as const) {
      const closed = entry.closeOpenCupRegistration(state);
      const offer = closed.competitions!.openCupEntry!.current;
      expect(offer.resolution).toBe(resolution);
      const cup = closed.competitions!.instances.find(i => i.id === offer.instanceId)!;
      expect(cup.entrantIds).toHaveLength(size);
      expect(cup.entrantIds.includes(s.clubId)).toBe(size === 24);
      expect(cup.definition.stages[0]!.slotIds).toEqual([7, 10, 13, 16, 19]);
      expect(cup.definition.rewards.filter(p => p.kind === 'cash').map(p => p.matchBaseMultiplier)).toEqual([1, 1, 2, 3, 5]);
      expect(closed.money).toBe(s.money);
      expect(closed.rngSeed).toBe(s.rngSeed);
      expect(closed.capAccount).toEqual(s.capAccount);
      expect(
        validateCompetitions(closed.competitions, { pack: region, season: 1, week: 6, clubIds: s.league.clubs.map(c => c.id) })
      ).toBeNull();
    }
    expect(entry.closeOpenCupRegistration({ ...restored, rngSeed: 321 }).competitions).toEqual(
      entry.closeOpenCupRegistration(entered).competitions
    );
  });
