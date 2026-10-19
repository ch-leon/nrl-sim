// Kit designs (GitHub #79): defaults reproduce the old look, designs override it,
// the alternate strip handles clashes, and kits never touch the match result.
import { describe, it, expect, afterEach } from 'vitest';
import {
  defaultKitDesign, defaultPattern, kitFromColors, kitFromDesign, resolveKits, setKitDesign, kitDesignFor,
  KIT_PATTERNS, type KitDesign,
} from '../../../src/art/match/kit';
import { drawPlayerFrame, LOOKS } from '../../../src/art/match/players';
import { simulateMatch, teamSheetFromSquad } from '../../../src/sim/engine';
import { createNewGame, getState } from '../../../src/core/state';

afterEach(() => setKitDesign('player', null));

const design: KitDesign = { pattern: 'stripes', trim: '#ffffff', alt: { jersey: '#ecf0f1', trim: '#c0392b', pattern: 'hoops' } };

describe('kit designs', () => {
  it('the default design reproduces the derived look exactly', () => {
    const colors: [string, string] = ['#2e6fd8', '#f4d03f'];
    const d = defaultKitDesign(colors, 'player');
    expect(kitFromDesign(colors[0], d)).toEqual(kitFromColors(colors, 'player'));
    expect(kitFromDesign(colors[0], d, true)).toEqual(kitFromColors(colors, 'player', true));
    expect(d.pattern).toBe(defaultPattern('player'));
  });

  it('a registered design overrides the trim, pattern and alternate strip for that club only', () => {
    const colors: [string, string] = ['#1a1a2e', '#f4d03f'];
    setKitDesign('player', design);
    expect(kitDesignFor('player')).toEqual(design);
    const home = kitFromColors(colors, 'player');
    expect(home.jersey).toBe(0x1a1a2e);
    expect(home.trim).toBe(0xffffff);
    expect(home.pattern).toBe('stripes');
    const alt = kitFromColors(colors, 'player', true);
    expect([alt.jersey, alt.trim, alt.pattern]).toEqual([0xecf0f1, 0xc0392b, 'hoops']);
    expect(kitFromColors(colors, 'rival-reapers')).toEqual(kitFromColors(colors, 'rival-reapers'));
    expect(kitFromColors(colors, 'rival-reapers').trim).toBe(0xf4d03f);
    setKitDesign('player', null);
    expect(kitFromColors(colors, 'player').trim).toBe(0xf4d03f);
  });

  it('switches to the designed alternate strip away against a clashing club', () => {
    setKitDesign('player', design);
    const r = resolveKits(
      { clubId: 'rival-x', colors: ['#20203a', '#ffffff'] }, // dark home jersey
      { clubId: 'player', colors: ['#1a1a2e', '#f4d03f'] }, // dark away jersey: clash
    );
    expect(r.awayAlt).toBe(true);
    expect(r.away.jersey).toBe(0xecf0f1);
  });

  it('every pattern draws a different jersey', () => {
    const frames = KIT_PATTERNS.map((pattern) =>
      Array.from(drawPlayerFrame(kitFromDesign('#2e6fd8', { ...design, pattern }), LOOKS[0]!, 'idle', 0).data).join(','));
    expect(new Set(frames).size).toBe(KIT_PATTERNS.length);
  });

  it('is purely cosmetic: the kit never changes simulateMatch', () => {
    createNewGame('Kit FC', 5);
    const s = getState();
    const home = teamSheetFromSquad(s.squad, 'player', 'Kit FC', ['#1a1a2e', '#f4d03f']);
    const away = teamSheetFromSquad(s.squad.slice().reverse(), 'rival-x', 'X', ['#c0392b', '#ffffff']);
    const before = simulateMatch(home, away, { seed: 99, weather: 'clear' });
    setKitDesign('player', design);
    const after = simulateMatch(home, away, { seed: 99, weather: 'clear' });
    expect(after).toEqual(before);
  });
});
