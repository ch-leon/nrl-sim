// The sides' tags and letters (#371): home and away told apart without their colours.
import { describe, expect, it } from 'vitest';
import { teamLetters, teamTag, teamTags } from '../../src/ui/teamTag';
import { RIVAL_CLUBS } from '../../src/data/league';

describe('teamTag', () => {
  it('takes three letters from the club name', () => {
    expect(teamTag('Brisbane Bears')).toBe('BRI');
    expect(teamTag('Darwin Drovers')).toBe('DAR');
    expect(teamTag('Live Test FC')).toBe('LTF');
    expect(teamTag('Gulls')).toBe('GUL');
    expect(teamTag("St. George's Saints")).toBe('SGS');
    expect(teamTag('  ')).toBe('—');
  });
});

describe('teamTags', () => {
  it('leaves two different tags alone', () => {
    expect(teamTags('Brisbane Bears', 'Darwin Drovers')).toEqual(['BRI', 'DAR']);
  });

  it('de-duplicates two clubs whose tags collide', () => {
    expect(teamTags('Brisbane Bears', 'Brisbane Larrikins')).toEqual(['BBE', 'BLA']);
    // The first fallback collides too: the away side walks its nickname for a letter.
    const [h, a] = teamTags('Bay Bears', 'Bay Beetles');
    expect(h).toBe('BBE');
    expect(a).not.toBe(h);
    expect(a).toHaveLength(3);
    // Two clubs of the same name still read apart.
    const same = teamTags('Gulls', 'Gulls');
    expect(same[0]).not.toBe(same[1]);
  });

  it('every pairing in the league reads apart, both ways round', () => {
    for (const a of RIVAL_CLUBS) {
      for (const b of RIVAL_CLUBS) {
        if (a === b) continue;
        const [h, w] = teamTags(a.name, b.name);
        expect(h, `${a.name} v ${b.name}`).not.toBe(w);
      }
    }
  });
});

describe('teamLetters', () => {
  it('is each tag’s first letter, or H and A when those are the same', () => {
    expect(teamLetters(['BRI', 'DAR'])).toEqual(['B', 'D']);
    expect(teamLetters(['BBE', 'BLA'])).toEqual(['H', 'A']);
  });
});
