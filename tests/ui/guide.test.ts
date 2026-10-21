// tests/ui/guide.test.ts — the Guide's pages (N7, #188). The DOM screen is
// not rendered here (the vitest env is 'node'); the pages are data.
import { describe, it, expect } from 'vitest';
import { GUIDE_PAGES, GUIDE_SCREENS, guidePage } from '../../src/ui/guide/guide';
import { CLUB_PAGES } from '../../src/ui/guide/pages';
import { NINES_FACTS, NINES_PAGE } from '../../src/ui/guide/nines';
import { NINES } from '../../src/match/league/rules';
import { GOALS } from '../../src/match/league/goals';
import { PENALTY } from '../../src/match/league/penalties';
import { BENCH } from '../../src/match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL } from '../../src/match/league/presets';
import { TACTIC_BLURB } from '../../src/ui/tacticsBlurbs';
import { TRAINING_FOCUS } from '../../src/config';
import { DIFFICULTY, ECON, ON_FIELD, SET_TACKLES } from '../../src/config';

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

  it('quotes the running costs a week on every difficulty (N12.3)', () => {
    expect(text).toContain(`${dollars(ECON.OVERHEAD_WEEKLY * DIFFICULTY.normal.overhead)} on Normal`);
    expect(text).toContain(`${dollars(ECON.OVERHEAD_WEEKLY * DIFFICULTY.easy.overhead)} on Easy`);
    expect(text).toContain(`${dollars(ECON.OVERHEAD_WEEKLY * DIFFICULTY.hard.overhead)} on Hard`);
  });

  it('quotes the ticket price', () => {
    expect(text).toContain(`Tickets are ${dollars(ECON.TICKET_PRICE)}.`);
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
