import { describe, it, expect, beforeEach } from 'vitest';
import { fmtMoney, moneyTile, IN_DEBT_CLASS, IN_DEBT_TEXT, ADVANCE_MENU, HELD_WEEK_TEXT, MATCH_NOT_SAVED_TEXT, MATCH_SAVED_TEXT, MATCH_STILL_ON_TEXT, RESUME_MATCH_LABEL, SKIPPING_EXIT_TEXT, weekStillFinishing, advanceProgressLabel, clubAdvanceChoice, clubMenuChoice, nextMatchChip, ordinal, decisionsBadgeLabel } from '../../src/ui/hud';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, resumeWeek, TICK_ORDER } from '../../src/core/time';
import { createNewGame, getState, setState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { CSS } from '../../src/ui/dom';
import { ECON } from '../../src/config';

// DOM tests (createHud rendering / flash / bus wiring) are skipped: jsdom is not
// installed and the vitest environment is 'node' (see vite.config.ts). The
// money formatter is extracted as a pure function so it is covered here.
describe('fmtMoney', () => {
  it('formats positive balances with thousands separators and a $ prefix', () => {
    expect(fmtMoney(0)).toBe('$0');
    expect(fmtMoney(200_000)).toBe('$200,000');
    expect(fmtMoney(1_234)).toBe('$1,234');
    expect(fmtMoney(999)).toBe('$999');
    expect(fmtMoney(1_000_000)).toBe('$1,000,000');
  });

  it('formats negative balances with a leading minus and $ (bankruptcy)', () => {
    expect(fmtMoney(-1)).toBe('-$1');
    expect(fmtMoney(-50_000)).toBe('-$50,000');
  });

  it('rounds fractional balances', () => {
    expect(fmtMoney(1_234.6)).toBe('$1,235');
    expect(fmtMoney(-1_234.6)).toBe('-$1,235');
  });
});

describe('moneyTile (N12.5)', () => {
  it('a negative balance is in debt: the red tile says so beside the number', () => {
    expect(moneyTile(-4_200)).toEqual({ text: '-$4,200', inDebt: true });
    expect(moneyTile(-1)).toEqual({ text: '-$1', inDebt: true });
    expect(IN_DEBT_TEXT).toBe('in debt');
  });

  it('$0 and up is not in debt', () => {
    expect(moneyTile(0)).toEqual({ text: '$0', inDebt: false });
    expect(moneyTile(200_000)).toEqual({ text: '$200,000', inDebt: false });
  });

  it('in debt from the line the economy warns at (ECON.BANKRUPTCY_WARN)', () => {
    expect(moneyTile(ECON.BANKRUPTCY_WARN - 1).inDebt).toBe(true);
    expect(moneyTile(ECON.BANKRUPTCY_WARN).inDebt).toBe(false);
  });

  it('the in-debt class colours the tile red and the tag is white on red', () => {
    expect(IN_DEBT_CLASS).toBe('nrl-money-negative');
    expect(CSS).toMatch(new RegExp(`\\.nrl-hud-stat\\.${IN_DEBT_CLASS} \\{[^}]*color: #b00020`));
    expect(CSS).toMatch(/\.nrl-hud-debt \{[^}]*background: #b00020;[^}]*color: #fff/);
  });

  it('below 760px the tag hides (for screen readers only) and the tile wears a red border, so the HUD stays one row at 667×375 (#239)', () => {
    const at = CSS.indexOf('@media (max-width: 759px)');
    expect(at).toBeGreaterThan(CSS.indexOf('.nrl-hud-debt {'));
    const block = CSS.slice(at, CSS.indexOf('\n}', at));
    expect(block).toMatch(new RegExp(`\\.nrl-hud-stat\\.${IN_DEBT_CLASS} \\{[^}]*border-color: #b00020`));
    expect(block).toMatch(/\.nrl-hud-debt \{[^}]*position: absolute;[^}]*width: 1px;[^}]*clip: rect\(0 0 0 0\)/);
    // Visually hidden, not display: none, so the tile still reads "in debt".
    expect(block).not.toMatch(/\.nrl-hud-debt \{[^}]*display: none/);
  });
});

describe('ADVANCE_MENU (#44)', () => {
  it('offers ×4 weeks, to finals and to season end, in that order', () => {
    expect(ADVANCE_MENU.map((m) => m.target)).toEqual([
      { kind: 'weeks', weeks: 4 },
      { kind: 'finals' },
      { kind: 'seasonEnd' },
    ]);
    expect(ADVANCE_MENU.map((m) => m.label)).toEqual(['×4 weeks', 'To finals', 'To season end']);
  });
});

describe('a held week (#216)', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Held Test', 1);
  });

  it('a tap while the rival round finishes says so instead of doing nothing', () => {
    // The rival round (N9.2) holds the week past the player's match: back at the club, the HUD is live.
    registerTickHook('rivals', TICK_ORDER.match, (ctx) => ctx.hold?.());
    const notes: string[] = [];
    bus.on('ui:notify', ({ text }) => void notes.push(text));
    const week = getState().week;
    expect(weekStillFinishing()).toBe(false);
    expect(notes).toEqual([]);

    advanceWeek();
    expect(weekStillFinishing()).toBe(true);
    expect(notes).toEqual([HELD_WEEK_TEXT]);
    expect(getState().week).toBe(week);

    resumeWeek();
    expect(getState().week).toBe(week + 1);
    expect(weekStillFinishing()).toBe(false);
    expect(notes).toEqual([HELD_WEEK_TEXT]);
  });
});

describe('a parked live match (Save & exit)', () => {
  it('Advance Week resumes it and the menu will not skip the week', () => {
    expect(clubAdvanceChoice(true, true)).toBe('resume');
    expect(clubMenuChoice(true, true)).toBe('match');
    // A rival round still holding, with no parked player match, waits as before.
    expect(clubAdvanceChoice(false, true)).toBe('wait');
    expect(clubMenuChoice(false, true)).toBe('wait');
    expect(clubAdvanceChoice(false, false)).toBe('advance');
    expect(clubMenuChoice(false, false)).toBe('advance');
    expect(RESUME_MATCH_LABEL).toBe('Resume match');
    // #349 H4: the toast names the button the player sees.
    expect(MATCH_STILL_ON_TEXT).toBe('Your match is still on. Tap Resume match to carry on.');
    expect(MATCH_SAVED_TEXT).toBe('Match saved. Tap Resume match to carry on.');
    expect(MATCH_NOT_SAVED_TEXT).toBe("Couldn't save the match. It is still going.");
    expect(SKIPPING_EXIT_TEXT).toBe('Skipping to full time.');
    expect(HELD_WEEK_TEXT).toMatch(/still being played/);
  });
});

describe('advance progress (N10.2)', () => {
  it('labels the Advance button with the week of the season while a run is under way', () => {
    expect(advanceProgressLabel(12)).toBe('Week 12 of 27…');
  });
});

describe('the next-match chip (#350 H1)', () => {
  beforeEach(() => {
    createNewGame('Test Club', 1);
    setState({ league: initLeague(getState()) });
  });

  it('names the next opponent and home or away; no ladder place before a round is in', () => {
    const s = getState();
    const f = s.league.fixtures.filter((x) => x.homeId === 'player' || x.awayId === 'player').sort((a, b) => a.round - b.round)[0]!;
    const home = f.homeId === 'player';
    const opp = s.league.clubs.find((c) => c.id === (home ? f.awayId : f.homeId))!;
    const chip = nextMatchChip(s)!;
    expect(chip.text).toBe(`v ${opp.name} (${home ? 'H' : 'A'})`);
    expect(chip.label).toBe(`Next match: ${opp.name}, ${home ? 'home' : 'away'}`);
  });

  it('adds the club\'s ladder place once it has played', () => {
    const s = getState();
    const ladder = s.league.ladder.map((r) => (r.clubId === 'player' ? { ...r, played: 1 } : r));
    const place = ladder.findIndex((r) => r.clubId === 'player') + 1;
    const chip = nextMatchChip({ ...s, league: { ...s.league, ladder } })!;
    expect(chip.text.endsWith(` · ${ordinal(place)}`)).toBe(true);
    expect(chip.label).toContain(`You are ${ordinal(place)} on the ladder`);
  });

  it('is null with no match left this season', () => {
    const s = getState();
    expect(nextMatchChip({ ...s, league: { ...s.league, fixtures: [] } })).toBeNull();
  });

  it('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(
      ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });

  it('the Advance Week badge says what it counts', () => {
    expect(decisionsBadgeLabel(1)).toBe('1 decision waiting');
    expect(decisionsBadgeLabel(3)).toBe('3 decisions waiting');
  });
});
