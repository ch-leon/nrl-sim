// tests/ui/screens/fixtures.test.ts — pure view helpers only. DOM screen
// rendering (openFixturesScreen/openLadderScreen) is skipped: jsdom is not
// installed and the vitest env is 'node' (see vite.config.ts), matching the
// hud.ts / nav.ts convention. The formatting/projection helpers are pure and
// covered here.
import { describe, it, expect } from 'vitest';
import {
  fmtFixtureLine,
  ladderView,
  clubNameMap,
  fixturesByRound,
} from '../../../src/ui/screens/fixtures';
import type { Fixture, LadderRow, RivalClub } from '../../../src/core/state';

const clubs: RivalClub[] = [
  { id: 'player', name: 'Cavehole Crushers', colors: ['#000000', '#ffffff'], strength: 55 },
  { id: 'rival-reapers', name: 'Redcliffe Reapers', colors: ['#000000', '#ffffff'], strength: 78 },
  { id: 'rival-wolves', name: 'Woolloomooloo Wolves', colors: ['#000000', '#ffffff'], strength: 71 },
];
const names = clubNameMap(clubs);

describe('clubNameMap', () => {
  it('maps ids to names', () => {
    expect(names['rival-reapers']).toBe('Redcliffe Reapers');
    expect(names.player).toBe('Cavehole Crushers');
  });
});

describe('fmtFixtureLine', () => {
  it('formats a played fixture with the score', () => {
    const f: Fixture = { round: 7, homeId: 'rival-reapers', awayId: 'rival-wolves', result: { homeScore: 18, awayScore: 12 } };
    expect(fmtFixtureLine(f, names)).toBe('R7 · Redcliffe Reapers 18–12 Woolloomooloo Wolves');
  });

  it('formats an upcoming fixture with "v"', () => {
    const f: Fixture = { round: 2, homeId: 'player', awayId: 'rival-reapers' };
    expect(fmtFixtureLine(f, names)).toBe('R2 · Cavehole Crushers v Redcliffe Reapers');
  });

  it('falls back to the raw id for unknown clubs', () => {
    const f: Fixture = { round: 1, homeId: 'ghost', awayId: 'rival-wolves' };
    expect(fmtFixtureLine(f, names)).toContain('ghost');
  });
});

describe('ladderView', () => {
  const ladder: LadderRow[] = [
    { clubId: 'rival-reapers', played: 2, wins: 2, draws: 0, losses: 0, pointsFor: 40, pointsAgainst: 10, points: 4 },
    { clubId: 'player', played: 2, wins: 1, draws: 0, losses: 1, pointsFor: 20, pointsAgainst: 24, points: 2 },
    { clubId: 'rival-wolves', played: 2, wins: 0, draws: 0, losses: 2, pointsFor: 8, pointsAgainst: 34, points: 0 },
  ];

  it('projects positions (1-based), diff and player flag', () => {
    const rows = ladderView(ladder, names);
    expect(rows[0]?.pos).toBe(1);
    expect(rows[0]?.name).toBe('Redcliffe Reapers');
    expect(rows[0]?.diff).toBe(30);
    expect(rows[1]?.isPlayer).toBe(true);
    expect(rows[1]?.diff).toBe(-4);
    expect(rows[2]?.pos).toBe(3);
    expect(rows.filter((r) => r.isPlayer)).toHaveLength(1);
  });
});

describe('fixturesByRound', () => {
  it('groups fixtures by round ascending', () => {
    const fixtures: Fixture[] = [
      { round: 3, homeId: 'a', awayId: 'b' },
      { round: 1, homeId: 'c', awayId: 'd' },
      { round: 1, homeId: 'e', awayId: 'f' },
    ];
    const grouped = fixturesByRound(fixtures);
    expect(grouped.map((g) => g.round)).toEqual([1, 3]);
    expect(grouped[0]?.fixtures).toHaveLength(2);
    expect(grouped[1]?.fixtures).toHaveLength(1);
  });
});

// ── Next-match card helpers (N7, #183) ──────────────────────────────────────
import { fmtHeadToHead, fmtOrdinal, fmtSideLine, fmtWeather } from '../../../src/ui/screens/fixtures';

describe('fmtOrdinal', () => {
  it('suffixes positions the English way', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 14, 16, 21, 22, 23, 101, 111].map(fmtOrdinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '14th', '16th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});

describe('fmtHeadToHead', () => {
  it('reads the first meeting and every meeting since from the player’s side', () => {
    expect(fmtHeadToHead([])).toBe('First meeting this season');
    expect(fmtHeadToHead([
      { round: 3, opponentId: 'x', home: true, pointsFor: 18, pointsAgainst: 12, result: 'W' },
      { round: 14, opponentId: 'x', home: false, pointsFor: 10, pointsAgainst: 10, result: 'D' },
      { round: 25, opponentId: 'x', home: false, pointsFor: 4, pointsAgainst: 20, result: 'L' },
    ])).toBe('R3: won 18–12 at home · R14: drew 10–10 away · R25: lost 4–20 away');
  });
});

describe('fmtSideLine / fmtWeather', () => {
  it('shows the ladder place only once there is one', () => {
    expect(fmtSideLine({ ladderPos: 3, strength: 70 })).toBe('3rd · strength 70');
    expect(fmtSideLine({ ladderPos: 0, strength: 61 })).toBe('strength 61');
  });
  it('names the conditions', () => {
    expect(['clear', 'rain', 'wind'].map((w) => fmtWeather(w as 'clear' | 'rain' | 'wind'))).toEqual(['Fine', 'Rain', 'Windy']);
  });
});

// N14 (#263, QA finding 3): long club names wrapped on the ladder at 844px.
// #351 X4: one naming rule for every club on the ladder and the fixtures.
import { clubLabels, fmtMyFixture, LADDER_NAME_MAX } from '../../../src/ui/screens/fixtures';
import { RIVAL_CLUBS } from '../../../src/data/league';

describe('clubLabels', () => {
  it('every club is its short name, as the match report says it; a bare "FC" keeps the whole name', () => {
    const m = clubLabels([
      { id: 'a', name: 'Woolloomooloo Wolves' }, { id: 'b', name: 'Cairns Cyclones' }, { id: 'p', name: 'Phone Test FC' },
    ]);
    expect(m).toEqual({ a: 'Wolves', b: 'Cyclones', p: 'Phone Test FC' });
  });

  it('two clubs with the same short name keep their whole names', () => {
    const m = clubLabels([{ id: 'p', name: 'Review Larrikins' }, { id: 'r', name: 'Launceston Larrikins' }, { id: 'w', name: 'Woolloomooloo Wolves' }]);
    expect(m).toEqual({ p: 'Review Larrikins', r: 'Launceston Larrikins', w: 'Wolves' });
  });

  it('every rival on the ladder fits the limit', () => {
    for (const [id, label] of Object.entries(clubLabels(RIVAL_CLUBS))) expect(label.length, id).toBeLessThanOrEqual(LADDER_NAME_MAX);
  });
});

describe('fmtMyFixture (#351 X2)', () => {
  const names = { player: 'Test FC', w: 'Wolves' };
  it('says where, and the result with your score first', () => {
    expect(fmtMyFixture({ round: 3, homeId: 'player', awayId: 'w' } as never, names)).toEqual({ label: 'R3 · v Wolves', result: null, score: '' });
    expect(fmtMyFixture({ round: 4, homeId: 'w', awayId: 'player', result: { homeScore: 18, awayScore: 12 } } as never, names))
      .toEqual({ label: 'R4 · at Wolves', result: 'L', score: '12–18' });
    expect(fmtMyFixture({ round: 25, homeId: 'player', awayId: 'w', result: { homeScore: 10, awayScore: 10 } } as never, names).label).toBe('Quarter final · v Wolves');
  });
});

// N14 (#263): the Contracts screen's two-tap guard, as the player page's.
import { guardTap } from '../../../src/ui/screens/contracts';

describe('guardTap', () => {
  it('the first tap arms, the second runs, a tap on another action re-arms', () => {
    expect(guardTap(null, 'sell:a')).toEqual({ armed: 'sell:a', run: false });
    expect(guardTap('sell:a', 'sell:a')).toEqual({ armed: null, run: true });
    expect(guardTap('sell:a', 'release:a')).toEqual({ armed: 'release:a', run: false });
    expect(guardTap('sell:a', 'sell:b')).toEqual({ armed: 'sell:b', run: false });
  });
});
