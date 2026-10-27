import { describe, it, expect, beforeEach } from 'vitest';
import { fmtMoney, moneyTile, moneyTileLabel, runwayLevel, RUNWAY_LOW_WEEKS, RUNWAY_SHORT_WEEKS, IN_DEBT_CLASS, IN_DEBT_TEXT, ADVANCE_MENU, HELD_WEEK_TEXT, MATCH_NOT_SAVED_TEXT, MATCH_SAVED_TEXT, MATCH_STILL_ON_TEXT, RESUME_MATCH_LABEL, SKIPPING_EXIT_TEXT, weekStillFinishing, advanceProgressLabel, clubAdvanceChoice, clubMenuChoice, nextMatchChip, ordinal, decisionsBadgeLabel, placeName, boardChip, fmtMoneyShort, BOARD_RISK_CLASS } from '../../src/ui/hud';
import type { GameState, Objective } from '../../src/core/state';
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

describe('money tile runway (#351 H2)', () => {
  it('amber under 20 weeks, red under 8, plain when the club is not losing money', () => {
    expect([RUNWAY_LOW_WEEKS, RUNWAY_SHORT_WEEKS]).toEqual([20, 8]);
    expect(runwayLevel(null)).toBe('ok');
    expect(runwayLevel(20)).toBe('ok');
    expect(runwayLevel(19.9)).toBe('low');
    expect(runwayLevel(8)).toBe('low');
    expect(runwayLevel(7.9)).toBe('short');
    expect(runwayLevel(0)).toBe('short');
  });

  it('the label says how long the money lasts only when it is short, and that a tap opens Finance', () => {
    expect(moneyTileLabel(200_000, null, true)).toBe('Money $200,000. Tap for Finance');
    expect(moneyTileLabel(68_000, 12.6, true)).toBe("Money $68,000. Enough for about 12 weeks at this week's spending. Tap for Finance");
    expect(moneyTileLabel(-4_200, 0, false)).toBe('Money -$4,200, in debt');
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
    expect(chip.opponent).toBe(`v ${placeName(opp.name)}`);
    expect(chip.detail).toBe(home ? 'Home' : 'Away');
    expect(chip.label).toBe(`Next match: ${opp.name}, ${home ? 'home' : 'away'}`);
  });

  it('adds the club\'s ladder place once it has played', () => {
    const s = getState();
    const ladder = s.league.ladder.map((r) => (r.clubId === 'player' ? { ...r, played: 1 } : r));
    const place = ladder.findIndex((r) => r.clubId === 'player') + 1;
    const chip = nextMatchChip({ ...s, league: { ...s.league, ladder } })!;
    expect(chip.detail.endsWith(` · ${ordinal(place)}`)).toBe(true);
    expect(chip.label).toContain(`You are ${ordinal(place)} on the ladder`);
  });

  it('is null with no match left this season', () => {
    const s = getState();
    expect(nextMatchChip({ ...s, league: { ...s.league, fixtures: [] } })).toBeNull();
  });

  it('names the opponent by its place, not its nickname', () => {
    expect(placeName('Darwin Drovers')).toBe('Darwin');
    expect(placeName('Broken Hill Brollys')).toBe('Broken Hill');
    expect(placeName('Woolloomooloo Wolves')).toBe('Woolloomooloo');
    expect(placeName('Solo')).toBe('Solo');
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

describe('the board chip (#368)', () => {
  beforeEach(() => {
    createNewGame('Test Club', 1);
    setState({ league: initLeague(getState()) });
  });

  /** The club 11th on 14 points behind ten rivals on 20, with `left` rounds to play. */
  const eleventh = (left: number): GameState => {
    const s = getState();
    const rivals = s.league.clubs.filter((c) => c.id !== 'player');
    const row = (clubId: string, points: number) => ({ clubId, played: 1, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points });
    const ladder = [row('player', 14), ...rivals.map((c, i) => row(c.id, i < 10 ? 20 : 0))];
    const fixtures = Array.from({ length: 24 }, (_, i) => ({
      round: i + 1, homeId: 'player', awayId: rivals[i % rivals.length]!.id, ...(i < 24 - left ? { result: { homeScore: 0, awayScore: 0 } } : {}),
    }));
    return { ...s, week: 25 - left, money: 100_000, league: { ...s.league, ladder, fixtures } };
  };
  const finals = (target: number): Objective => ({ id: 'f', kind: 'finals', text: `Finish in the top ${target}`, target, status: 'pending' });
  const solvent = (target: number): Objective => ({ id: 's', kind: 'solvent', text: `Finish the season with at least $${target.toLocaleString()}`, target, status: 'pending' });

  it('shows the worst objective at risk: the target over where the club is', () => {
    const chip = boardChip({ ...eleventh(4), objectives: [finals(8), solvent(0)] }, null)!;
    expect(chip).toEqual({
      title: 'Board: top 8', detail: "You're 11th", risk: 'at-risk',
      label: "Board objective at risk: Finish in the top 8. You're 11th",
    });
  });

  it('the worse of two wins: money under the floor while burning is off track', () => {
    const s = { ...eleventh(4), money: 12_000, objectives: [finals(8), solvent(20_000)] };
    const chip = boardChip(s, 3)!;
    expect(chip).toMatchObject({ title: 'Board: $20k', detail: 'You have $12k', risk: 'off-track' });
    expect(BOARD_RISK_CLASS[chip.risk as 'off-track']).toBe('nrl-hud-board-off');
  });

  it('above the floor but the runway ends before the season does: how long the cash lasts', () => {
    const s = { ...eleventh(20), money: 40_000, objectives: [solvent(20_000)] };
    expect(boardChip(s, 6.4)).toMatchObject({ title: 'Board: $20k', detail: 'Cash: 6 wks', risk: 'at-risk' });
  });

  it('the rival: both places, the rival named in the label; every line short enough for 667px', () => {
    const s0 = eleventh(2);
    const top = s0.league.ladder.find((r) => r.points === 20)!.clubId;
    const name = s0.league.clubs.find((c) => c.id === top)!.name;
    const rival: Objective = { id: 'r', kind: 'beatRival', text: `Finish above ${name}`, target: 0, rivalId: top, status: 'pending' };
    const chip = boardChip({ ...s0, objectives: [rival] }, null)!;
    expect(chip).toMatchObject({ title: 'Board: rival', detail: '11th v 1st', risk: 'off-track' });
    expect(chip.label).toContain(name);
    for (const c of [chip, boardChip({ ...s0, money: 5_000, objectives: [solvent(0)] }, 2)!]) {
      expect(c.title.length).toBeLessThanOrEqual(14);
      expect(c.detail.length).toBeLessThanOrEqual(14);
    }
  });

  it('hides when every objective is on track', () => {
    expect(boardChip({ ...eleventh(4), objectives: [finals(12), solvent(0)] }, null)).toBeNull();
    expect(boardChip({ ...eleventh(16), objectives: [finals(8)] }, null)).toBeNull(); // plenty of rounds to catch up
    expect(boardChip({ ...getState(), objectives: [] }, null)).toBeNull();
  });

  it('short money on the chip', () => {
    expect(fmtMoneyShort(20_000)).toBe('$20k');
    expect(fmtMoneyShort(-4_400)).toBe('-$4k');
    expect(fmtMoneyShort(1_250_000)).toBe('$1.3m');
    expect(fmtMoneyShort(800)).toBe('$800');
  });

  it('the chip sits beside the next match and its risk colours are themable', () => {
    expect(CSS).toContain('.nrl-hud .nrl-btn.nrl-hud-board');
    expect(CSS).toContain('var(--nrl-risk-amber, #d08a00)');
  });
});
