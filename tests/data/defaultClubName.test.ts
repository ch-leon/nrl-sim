// #616: one name limit. The title's default club (and ground) name for every town in the
// catalogue passes the rename rule, so Kit & Colours never opens on a name it calls wrong.
import { describe, it, expect } from 'vitest';
import towns from '../../src/data/towns.json';
import { cleanName, GROUND_MAX, NAME_MAX } from '../../src/data/names';
import { defaultClubName, fitTown, groundForTown } from '../../src/data/townSetup';

/** The nicknames the title pairs with a typed town it doesn't know (title.ts applyTown). */
const TYPED_TOWN_NICKNAMES = ['Wombats', 'Kestrels', 'Otters', 'Ironworkers'];

describe('the default club name (#616)', () => {
  it('passes the rename rule for every town, with its own nickname and every one a typed town can get', () => {
    const nicknames = [...new Set([...towns.map((t) => t.nickname), ...TYPED_TOWN_NICKNAMES])];
    const bad: string[] = [];
    for (const t of towns) {
      for (const n of nicknames) {
        const name = defaultClubName(t.name, n);
        const c = cleanName(name);
        if (!c.ok || c.name !== name) bad.push(`${t.name} + ${n} → ${name}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps a name that fits as it was', () => {
    expect(defaultClubName('Brisbane', 'Wombats')).toBe('Brisbane Wombats');
    expect(defaultClubName('Sample Bay', 'Otters')).toBe('Sample Bay Otters');
    const exact = `${'A'.repeat(NAME_MAX - 8)} Wombats`;
    expect(defaultClubName('A'.repeat(NAME_MAX - 8), 'Wombats')).toBe(exact);
  });

  it('shortens a long town by whole words, never ending on a link or a direction', () => {
    expect(defaultClubName('Sydney Central Business District', 'Wombats')).toBe('Sydney Wombats');
    expect(defaultClubName('Surfers Paradise', 'Kestrels')).toBe('Surfers Kestrels');
    expect(defaultClubName('Newark on Trent', 'Ironworkers')).toBe('Newark Ironworkers');
    expect(defaultClubName('Perth city centre', 'Wombats')).toBe('Perth Wombats');
    expect(defaultClubName('Eight Mile Plains', 'Ironworkers')).toBe('Eight Mile Ironworkers');
  });

  it('keeps the place when the lead word is not one ("South", "Port", "City of")', () => {
    expect(defaultClubName('South Melbourne', 'Ironworkers')).toBe('Melbourne Ironworkers');
    expect(defaultClubName('Port Macquarie', 'Ironworkers')).toBe('Macquarie Ironworkers');
    expect(defaultClubName('City of Port Phillip', 'Wombats')).toBe('Port Phillip Wombats');
    expect(defaultClubName('Mount Gravatt East', 'Ironworkers')).toBe('Gravatt East Ironworkers');
  });

  it('a one-word town too long beside the nickname goes alone; past 24 it is cut', () => {
    expect(defaultClubName('Greensborough', 'Ironworkers')).toBe('Greensborough');
    expect(defaultClubName('Llanfairpwllgwyngyllgogerychwyrndrobwll', 'Otters')).toBe('Llanfairpwllgwyngyllgoge');
    expect(fitTown('Greensborough', 12)).toBe('');
  });

  it('every default ground passes the ground limit', () => {
    const bad = towns.map((t) => groundForTown(t.name, t.id)).filter((g) => !cleanName(g, GROUND_MAX).ok);
    expect(bad).toEqual([]);
    expect(cleanName(groundForTown('A'.repeat(80)), GROUND_MAX).ok).toBe(true);
  });
});

describe('the ground limit', () => {
  it('is the rename rule with room for 48 characters', () => {
    expect(GROUND_MAX).toBe(48);
    expect(cleanName('x'.repeat(GROUND_MAX), GROUND_MAX).ok).toBe(true);
    expect(cleanName('x'.repeat(GROUND_MAX + 1), GROUND_MAX)).toEqual({ ok: false, why: 'At most 48 characters' });
    expect(cleanName('x'.repeat(NAME_MAX + 1))).toEqual({ ok: false, why: 'At most 24 characters' });
  });
});
