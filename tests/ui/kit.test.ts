import { describe, it, expect, afterEach } from 'vitest';
import {
  trimOptions, altJerseyOptions, withAltJersey, isValidDesign, startingDesign, syncKitDesign, KIT_COLORS,
} from '../../src/ui/screens/kit';
import { kitDesignFor, setKitDesign, defaultKitDesign, colorDistance, CLASH_DISTANCE } from '../../src/art/match/kit';
import { hexToInt } from '../../src/art/pixel';
import { colorsContrast } from '../../src/config';
import { createNewGame, getState, setState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';

afterEach(() => setKitDesign('player', null));

describe('kit designer view-model (#79)', () => {
  it('only offers trims that read against the jersey, and alternates that fix a clash', () => {
    for (const jersey of KIT_COLORS) {
      for (const t of trimOptions(jersey)) expect(colorsContrast(jersey, t)).toBe(true);
      for (const a of altJerseyOptions(jersey)) expect(colorDistance(hexToInt(jersey), hexToInt(a))).toBeGreaterThanOrEqual(CLASH_DISTANCE * 1.5);
      expect(trimOptions(jersey).length).toBeGreaterThan(0);
      expect(altJerseyOptions(jersey).length).toBeGreaterThan(0);
    }
  });

  it('changing the alternate jersey keeps its trim readable', () => {
    const d = defaultKitDesign(['#f4d03f', '#1a1a2e'], 'player');
    const white = withAltJersey(d, '#ffffff');
    expect(colorsContrast('#ffffff', white.alt.trim)).toBe(true);
    expect(isValidDesign(white, '#f4d03f')).toBe(true);
    expect(isValidDesign({ ...white, trim: '#f4d03f' }, '#f4d03f')).toBe(false);
  });

  it('opens on the saved design, else the club look; sync feeds the registry', () => {
    createNewGame('Kit FC', 3);
    initLeague(getState(), ['#2e6fd8', '#ffffff']);
    expect(startingDesign(getState())).toEqual(defaultKitDesign(['#2e6fd8', '#ffffff'], 'player'));
    syncKitDesign(getState());
    expect(kitDesignFor('player')).toBeUndefined();
    const kit = { pattern: 'plain' as const, trim: '#f4d03f', alt: { jersey: '#ffffff', trim: '#1a1a2e', pattern: 'v' as const } };
    setState({ kit });
    expect(startingDesign(getState())).toEqual(kit);
    syncKitDesign(getState());
    expect(kitDesignFor('player')).toEqual(kit);
  });
});
