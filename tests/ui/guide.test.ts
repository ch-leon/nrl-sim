// tests/ui/guide.test.ts — the Guide's pages (N7, #188). The DOM screen is
// not rendered here (the vitest env is 'node'); the pages are data.
import { describe, it, expect } from 'vitest';
import { GUIDE_PAGES, GUIDE_SCREENS, guidePage } from '../../src/ui/guide/guide';
import { CLUB_PAGES, sponsorBullet } from '../../src/ui/guide/pages';
import { NINES_FACTS, NINES_PAGE } from '../../src/ui/guide/nines';
import { NINES } from '../../src/match/league/rules';
import { BIN } from '../../src/match/league/sinbin';
import { GOALS } from '../../src/match/league/goals';
import { PENALTY } from '../../src/match/league/penalties';
import { BENCH } from '../../src/match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL } from '../../src/match/league/presets';
import { TACTIC_BLURB } from '../../src/ui/tacticsBlurbs';
import { TRAINING_FOCUS } from '../../src/config';
import { STAFF, STAFF_ROLES } from '../../src/systems/staff';
import { BOARD, DIFFICULTY, ECON, ON_FIELD, PRIZE, SET_TACKLES, SQUAD_MIN } from '../../src/config';
import { createNewGame, setState } from '../../src/core/state';
import { FACILITY_CATALOG } from '../../src/data/facility';
import { fmtMoney } from '../../src/utils/money';
import { IN_GOAL } from '../../src/match/core/field';
import { bonusZoneSvg, zonePictureGeometry } from '../../src/ui/guide/zonePicture';

describe('GUIDE_PAGES', () => {
  it('is the club pages then How Nines works, each with an id, a title and something to read', () => {
    expect(GUIDE_PAGES.map((p) => p.id)).toEqual(['week', 'money', 'squad', 'tactics', 'events', 'ladder', 'grounds', 'nines']);
    expect(GUIDE_PAGES.length).toBe(CLUB_PAGES.length + 1);
    expect(GUIDE_PAGES[GUIDE_PAGES.length - 1]).toBe(NINES_PAGE);
    expect(new Set(GUIDE_PAGES.map((p) => p.id)).size).toBe(GUIDE_PAGES.length);
    for (const p of GUIDE_PAGES) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.short.length).toBeGreaterThan(0);
      expect(p.sections.length).toBeGreaterThan(0);
      for (const s of p.sections) {
        expect((s.text?.length ?? 0) + (s.bullets?.join('').length ?? 0)).toBeGreaterThan(20);
      }
    }
  });

  it('the Tactics page (N11) names every preset in its chip words and quotes the training focus', () => {
    const tactics = GUIDE_PAGES.find((p) => p.id === 'tactics')!;
    const text = tactics.sections.flatMap((s) => [s.text ?? '', ...(s.bullets ?? [])]).join(' ');
    for (const p of [...ATTACK_PRESETS, ...DEFENCE_PRESETS]) expect(text).toContain(`${PRESET_LABEL[p]}: ${TACTIC_BLURB[p]}`);
    expect(text).toContain(`×${TRAINING_FOCUS.ON}`);
    expect(text).toContain(`×${TRAINING_FOCUS.OFF}`);
    expect(text).toContain('Kicker or Captain');
  });

  it('the Ladder page quotes golden point from the rule', () => {
    const ladder = GUIDE_PAGES.find((p) => p.id === 'ladder')!;
    const text = ladder.sections.flatMap((s) => [s.text ?? '', ...(s.bullets ?? [])]).join(' ');
    expect(text).toContain(`golden point: ${NINES.goldenPointMinutes} more minutes`);
  });

  it('teaches the League season, not the retired Classic one (#819)', () => {
    const page = (id: string): string => GUIDE_PAGES.find((p) => p.id === id)!.sections
      .flatMap((s) => [s.text ?? '', ...(s.bullets ?? [])]).join(' ');
    const ladder = page('ladder');
    expect(ladder).toContain('Local League: 8 clubs play 14 rounds');
    expect(ladder).toContain('The top 4 play the finals');
    expect(ladder).not.toMatch(/top eight|quarter final|1 v 8/);
    const week = page('week');
    expect(week).toContain('14 league rounds, then finals for the top 4');
    expect(week).not.toMatch(/make the eight|Older careers keep/);
  });

  it('falls back to the first page for an unknown id', () => {
    expect(guidePage('nines').id).toBe('nines');
    expect(guidePage('nope').id).toBe('week');
    expect(guidePage(undefined).id).toBe('week');
  });
});

describe('the Money page stays true to the economy', () => {
  const money = CLUB_PAGES.find((p) => p.id === 'money')!;
  const text = money.sections.map((s) => `${s.text ?? ''} ${s.bullets?.join(' ') ?? ''}`).join(' ');
  const dollars = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

  it('quotes the cash that leaves the bank, not a weekly wage bill', () => {
    expect(text).toContain('A signing fee');
    expect(text).toContain('Releasing a player');
    expect(text).toContain('A renewal costs no cash');
    expect(text).not.toContain('Wages every week');
    expect(text).not.toContain('Running costs');
    expect(text).not.toContain('turns amber');
    expect(text).toContain('The balance at the left of the dock is the cash in the bank');
  });

  it('quotes fixed match income rather than ticket multiplication', () => {
    expect(text).toContain('Local $8,000');
    expect(text).toContain('not an extra ticket payment');
  });

  it('quotes the finals prize money, the board\'s grant, the fire-sale floor and its morale hit (N12.7)', () => {
    expect(text).toContain(`Finals prize money at the rollover: ${dollars(PRIZE.PER_FINALS_WEEK)} for every finals week played, `
      + `${dollars(PRIZE.GRAND_FINAL)} more for a grand final and ${dollars(PRIZE.PREMIERSHIP)} for the premiership.`);
    expect(text).toContain(`The board pays ${dollars(BOARD.GRANT_PER_MET)} for every objective met`);
    expect(text).toContain(`Easy pays ${Math.round(DIFFICULTY.easy.prize * 100)}% of that and Hard ${Math.round(DIFFICULTY.hard.prize * 100)}%`);
    expect(text).toContain(`Easy ${Math.round(DIFFICULTY.easy.prize * 100)}%, Hard ${Math.round(DIFFICULTY.hard.prize * 100)}%`);
    expect(text).toContain('a negative balance does not sell a player');
    expect(text).toContain('Salaries sit on the cap');
    const all = CLUB_PAGES.flatMap((p) => p.sections.map((s) => `${s.text ?? ''} ${s.bullets?.join(' ') ?? ''}`)).join(' ');
    expect(all).toContain(`Each one met pays ${dollars(BOARD.GRANT_PER_MET)} and ${BOARD.REP_PER_MET} reputation.`);
    expect(all).toContain(`the week the balance passes the -${dollars(-ECON.FORCED_SALE_FLOOR)} floor`);
  });
});

describe('How Nines works stays true to the live sim', () => {
  // The page is a data file owned by the match session (src/ui/guide/nines.ts).
  // When one of these fails, the rules moved: update NINES_FACTS and the text.
  it('quotes the rule constants', () => {
    expect(NINES_FACTS.aSide).toBe(ON_FIELD);
    expect(NINES_FACTS.halfMinutes).toBe(NINES.halfMinutes);
    expect(NINES_FACTS.tackles).toBe(SET_TACKLES);
    expect(NINES_FACTS.tryPoints).toBe(NINES.tryPoints);
    expect(NINES_FACTS.bonusTryPoints).toBe(NINES.bonusTryPoints);
    expect(NINES_FACTS.conversionPoints).toBe(NINES.conversionPoints);
    expect(NINES_FACTS.fieldGoalPoints).toBe(NINES.fieldGoalPoints);
    expect(NINES_FACTS.penaltyGoalPoints).toBe(PENALTY.goalPoints);
    expect(NINES_FACTS.benchSize).toBe(BENCH.size);
    expect(NINES_FACTS.fieldGoalLastS).toBe(GOALS.fieldGoalLastS);
    expect(NINES_FACTS.fieldGoalRangeM).toBe(GOALS.fieldGoalRangeM);
    expect(NINES_FACTS.halfTimeLegsBack).toBe(NINES.halfTimeLegsBack);
    expect(NINES_FACTS.sinBinMinutes).toBe(BIN.minutes);
    expect(NINES_FACTS.goldenPointMinutes).toBe(NINES.goldenPointMinutes);
    expect(NINES_FACTS.postGapM).toBe(2 * GOALS.halfPosts);
    expect(NINES_FACTS.inGoalM).toBe(IN_GOAL);
  });

  it('puts the numbers in the text', () => {
    const text = NINES_PAGE.sections.map((s) => `${s.text ?? ''} ${s.bullets?.join(' ') ?? ''}`).join(' ');
    expect(text).toContain(`${NINES_FACTS.aSide} a side`);
    expect(text).toContain(`two halves of ${NINES_FACTS.halfMinutes} minutes`);
    expect(text).toContain(`A set is ${NINES_FACTS.tackles} tackles`);
    expect(text).toContain(`A try is ${NINES_FACTS.tryPoints} points`);
    expect(text).toContain(`it is ${NINES_FACTS.bonusTryPoints}`);
    expect(text).toContain(`bench of ${NINES_FACTS.benchSize}`);
  });
});

describe('the Money page says the real numbers (N12)', () => {
  const bullets = (pageId: string): string => CLUB_PAGES.find((p) => p.id === pageId)!.sections.map((s) => s.bullets?.join(' ') ?? '').join(' ');
  const board = (level: 1 | 2 | 3) => [{ id: 'sb', defId: 'sponsorBoard' as const, level, x: 0, y: 0 }];

  it('the Sponsor Board line states the rule, then what one pays at the club\'s reputation', () => {
    expect(sponsorBullet(null)).toBe('A Sponsor Board pays 3% / 9% / 18% of match base at levels 1 / 2 / 3 on played non-trial matches. A new one would pay $540 per eligible match. No income while idle.');
    expect(sponsorBullet({ reputation: 60, facilities: [] })).toContain('A new one would pay $540 per eligible match.');
    expect(sponsorBullet({ reputation: 80, facilities: board(3) })).toContain('Yours (level 3) pays $3,240 per eligible match.');
  });

  it('is worked out each time the page is shown, for the club in play', () => {
    createNewGame('Guide FC', 4);
    expect(bullets('money')).toContain('A new one would pay $540 per eligible match');
    setState({ reputation: 100, facilities: board(1) });
    expect(bullets('money')).toContain('Yours (level 1) pays $540 per eligible match.');
    expect(bullets('money')).not.toContain('$3,000');
  });

  it('quotes the signing fee and the pool\'s level', () => {
    expect(bullets('money')).toContain('difficulty does not scale');
    expect(bullets('squad')).toContain('about 52 overall');
    expect(bullets('grounds')).toContain('Sponsor Board ($10,000, one only): 3% / 9% / 18% of the match base on played matches');
  });

  it('quotes every facility price from the catalog (#836)', () => {
    const text = bullets('grounds');
    for (const def of Object.values(FACILITY_CATALOG)) {
      expect(text).toContain(`${def.name.replace("'", '’')} (${fmtMoney(def.cost)}`);
    }
    expect(text).toContain('Grandstand ($30,000, one only): seats 3,500, 5,000 or 6,500');
    expect(text).not.toContain('a reputation point');
  });
});

// N14 (#263): each page links to the screen it describes.

describe('Guide links', () => {
  it('Money opens Finance and Tactics opens Lineup; every link names a screen', () => {
    expect(guidePage('money').screen).toBe('finance');
    expect(guidePage('tactics').screen).toBe('lineup');
    expect(GUIDE_PAGES.filter((p) => p.screen).map((p) => [p.id, p.screen])).toEqual([
      ['money', 'finance'], ['squad', 'squad'], ['tactics', 'lineup'], ['events', 'news'], ['ladder', 'ladder'], ['grounds', 'build'],
    ]);
    for (const p of GUIDE_PAGES) if (p.screen) expect(GUIDE_SCREENS[p.screen].label).toMatch(/^Open /);
  });
});

describe('the Squad page stays true to the cascade (N14.3)', () => {
  const squad = CLUB_PAGES.find((p) => p.id === 'squad')!;
  const text = squad.sections.map((s) => `${s.text ?? ''} ${s.bullets?.join(' ') ?? ''}`).join(' ');

  it('says the board does not lend, and quotes the call-up', () => {
    expect(text).toContain('The board does not lend');
    expect(text).not.toContain('finished solvent');
    expect(text).toContain(`expiry or retirement can leave fewer than ${SQUAD_MIN} registered players`);
    expect(text).toContain('injuries and bans do not create replacements');
    expect(text).toContain('Sell previews a real buying club');
    expect(text).toContain('it does not replace the people already in the world');
    expect(text).not.toContain('There is no buyer for a sale yet');
  });
});

describe('the Squad page\'s Staff section stays true to the hires (N14.5)', () => {
  const squad = CLUB_PAGES.find((p) => p.id === 'squad')!;
  const text = squad.sections.map((s) => `${s.text ?? ''} ${s.bullets?.join(' ') ?? ''}`).join(' ');

  it('quotes each role\'s wage on Normal', () => {
    for (const role of STAFF_ROLES) {
      expect(text).toContain(`${STAFF[role].title} ($${STAFF[role].wage.toLocaleString('en-US')} a week on Normal)`);
    }
  });

  it('quotes the Welfare Manager\'s cut on a new agreement', () => {
    expect(text).toContain('takes 3% off a new agreement');
  });
});

// Nines (#77): the page shows the bonus zone, drawn to the rule's measurements.
describe('the bonus zone picture', () => {
  it('sits on the Nines page under its own heading', () => {
    const sec = NINES_PAGE.sections.find((x) => x.figure === 'bonus-zone');
    expect(sec?.heading).toBe('The bonus zone');
    expect(sec?.text).toContain(`${NINES_FACTS.postGapM} m wide and ${NINES_FACTS.inGoalM} m deep`);
  });

  it('draws the zone as wide as the posts are apart and as deep as the in-goal, at one scale', () => {
    const g = zonePictureGeometry();
    expect(g.zone.y).toBe(g.deadBallY);
    expect(g.zone.y + g.zone.h).toBe(g.tryLineY);
    expect(g.zone.w / g.zone.h).toBeCloseTo(NINES_FACTS.postGapM / NINES_FACTS.inGoalM);
    const svg = bonusZoneSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`width="${g.zone.w}" height="${g.zone.h}"`);
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain(`>${NINES_FACTS.bonusTryPoints}</text>`);
  });
});

describe('League career guide pages (#836)', () => {
  it('says story cards run in a League career', async () => {
    const { prepareLeagueCareer } = await import('../../src/systems/leagueCareerSetup');
    const { guidePageForCareer } = await import('../../src/ui/guide/pages');
    const state = await prepareLeagueCareer({ clubName: 'Guide FC', seed: 575 });
    const events = guidePageForCareer(CLUB_PAGES.find(p => p.id === 'events')!, state);
    const text = events.sections.map(x => [x.heading, x.text, ...(x.bullets ?? [])].join(' ')).join(' ');
    expect(text).not.toContain('not enabled');
    expect(text).toContain('In a League career');
    expect(text).toContain('Skills Camp');
  });
});
