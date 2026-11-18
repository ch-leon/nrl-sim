// tests/ui/screens/matchReport.test.ts — the match report at full time (N9.5):
// built from the MatchResult, it agrees with the score and the overlay's tallies.
import { describe, it, expect, vi } from 'vitest';
import { runMatch } from '../../../src/match/league/match';
import { buildNewGameState, getState, loadState, type Fixture } from '../../../src/core/state';
import { leagueFixtureView } from '../../../src/systems/leagueSeasonView';
import { fixtureBridge } from '../../../src/systems/competitionCalendar';
import { drawOpenCup } from '../../../src/systems/openCup';
import { cupDefinition } from '../../fixtures/competition';
import { competitionRewardPromiseId } from '../../../src/data/competitionRewards';
import { matchCashQuote } from '../../../src/data/financeRules';
import { closeModal } from '../../../src/ui/dom';
import { stubDocument, type StubNode } from '../stubDom';
import { BONUS_TRY_MARK, openMatchReport, readMatchReportIncome, buildMatchReport, countUpValue, fullTimeStats, initials, injuryChip, ladderMove, planChangeLines, planChangesSummary, resultHeadline, shortName } from '../../../src/ui/screens/matchReport';
import { fmtPotmLine, fmtPotmShort } from '../../../src/ui/screens/potm';
import { playerOfTheMatch } from '../../../src/systems/stats';
import { summaryLines } from '../../../src/match/view/commentary';
import type { MatchEvent, MatchResult, TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const sheet = (id: string, name: string): TeamSheet => ({
  clubId: id,
  name,
  attack: 60,
  defense: 60,
  kicking: 60,
  fitness: 60,
  colors: ['#111', '#eee'],
  roster: POSITIONS.map((position, i) => ({ name: `${name} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, handling: 60, kicking: 60, footyIQ: 60 } })),
});
const names = { player: 'Live Test FC', 'rival-gulls': 'Gulls' };
const fixture = { round: 3, homeId: 'player', awayId: 'rival-gulls' };

describe('match report (N9.5)', () => {
  const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
  const r = buildMatchReport(result, fixture, names, playerOfTheMatch(result, fixture.homeId, fixture.awayId));

  it('the score, a try line for every try, and the goals as kicked', () => {
    expect(r.title).toBe('Round 3 · Full time');
    expect([r.home.score, r.away.score]).toEqual([result.homeScore, result.awayScore]);
    // A line per scorer, a minute per try.
    const marks = (s: typeof r.home) => s.tries.flatMap((t) => t.match(/\d+'( \(bonus\))?/g) ?? []);
    expect([marks(r.home).length, marks(r.away).length]).toEqual(result.stats.tries);
    const goals = (id: string) => result.events.filter((e) => e.teamId === id && (e.kind === 'conversion' || e.kind === 'penalty-goal'));
    expect(r.home.goals).toEqual({ made: goals('player').filter((e) => e.detail === 'good').length, taken: goals('player').length });
    // The points add up: tries (4 or 5), goals 2, field goals 1.
    const pts = (s: typeof r.home) => marks(s).reduce((a, t) => a + (t.endsWith(BONUS_TRY_MARK) ? 5 : 4), 0) + 2 * s.goals.made + s.fieldGoals;
    expect(pts(r.home)).toBe(result.homeScore);
    expect(pts(r.away)).toBe(result.awayScore);
  });

  it('marks a bonus-zone try by what it is, never a bare "(5)" that reads as a try count (#423)', () => {
    const ev = (t: number, detail?: string): MatchEvent => ({ t, kind: 'try', teamId: 'player', player: 'Deakin Whitbread', ...(detail ? { detail } : {}) });
    const four: MatchResult = { ...result, homeScore: 17, awayScore: 0, events: [ev(3), ev(7), ev(8), ev(9, 'bonus')] };
    const line = buildMatchReport(four, fixture, names, null).home.tries[0];
    expect(line).toMatch(/9' \(bonus\)$/);
    expect(line).not.toContain('(5)');
    expect(line.match(/\d+'/g)).toHaveLength(4);
  });

  it('the numbers match the overlay’s tallies, side by side', () => {
    const row = (label: string) => r.rows.find((x) => x.label === label)!;
    expect(row('Possession')).toMatchObject({ home: `${result.stats.possession[0]}%`, away: `${result.stats.possession[1]}%` });
    expect(row('Tackles')).toMatchObject({ home: String(result.stats.tackles[0]), away: String(result.stats.tackles[1]) });
    expect(row('Errors')).toMatchObject({ home: String(result.stats.errors[0]), away: String(result.stats.errors[1]) });
    expect(Number(row('Line breaks').home) + Number(row('Line breaks').away)).toBe(result.events.filter((e) => e.kind === 'break').length);
  });

  it('names the Player of the Match with his club', () => {
    expect(r.potm?.who).toMatch(/\((Live Test FC|Gulls)\)$/);
    expect(r.potm?.who.startsWith(r.potm.name)).toBe(true);
    expect(['Live Test FC', 'Gulls']).toContain(r.potm?.short);
    expect(r.round).toBe('Round 3');
  });

  it('carries the commentary’s summary (N15.2): the final whistle with the score, then the tries', () => {
    expect(r.summary).toEqual(summaryLines(result, { id: 'player', name: 'Live Test FC' }, { id: 'rival-gulls', name: 'Gulls' }));
    expect(r.summary.length).toBe(2);
    const [hi, lo] = [Math.max(result.homeScore, result.awayScore), Math.min(result.homeScore, result.awayScore)];
    expect(r.summary[0]).toContain(`${hi}–${lo}`);
  });

  it('says a final was won in golden point, or drawn and decided on seeding', () => {
    const ev = (kind: MatchEvent['kind'], detail?: string): MatchEvent => ({ t: 18, kind, teamId: 'player', ...(detail ? { detail } : {}) });
    const base: MatchResult = { ...result, homeScore: 12, awayScore: 12, events: [ev('full-time')] };
    expect(buildMatchReport(base, { ...fixture, round: 26 }, names, null).note).toBe('Drawn — Live Test FC through on seeding');
    expect(buildMatchReport(base, fixture, names, null).note).toBe('Drawn');
    const gp: MatchResult = { ...result, homeScore: 16, awayScore: 12, events: [ev('try'), ev('full-time', 'golden-point')] };
    expect(buildMatchReport(gp, { ...fixture, round: 27 }, names, null)).toMatchObject({ title: 'Grand Final · Full time', note: 'Won in golden point' });
  });

  it('lists the injured with their weeks, the calls that paid off, and short names over the numbers', () => {
    const hurt: MatchResult = { ...result, injuries: [{ teamId: 'rival-gulls', playerName: 'Gulls 7', weeks: 3 }, { teamId: 'player', playerName: 'Live Test FC 2', weeks: 1 }], calls: { made: [5, 0], paid: [2, 0] } };
    const rep = buildMatchReport(hurt, fixture, names, null);
    expect(rep.away.injuries).toEqual(['Gulls 7 (3 weeks)']);
    expect(rep.home.injuries).toEqual(['Live Test FC 2 (1 week)']);
    expect(rep.rows.find((x) => x.label === 'Calls paid off')).toMatchObject({ home: '2/5', away: '0/0' });
    expect(buildMatchReport(result, fixture, names, null).rows.some((x) => x.label === 'Calls paid off')).toBe(result.calls !== undefined);
    expect(shortName('Launceston Larrikins')).toBe('Larrikins');
    expect(rep.home.short).toBe('Live Test FC');
    const same = buildMatchReport(result, fixture, { player: 'Brisbane Larrikins', 'rival-gulls': 'Launceston Larrikins' }, null);
    expect([same.home.short, same.away.short]).toEqual(['Brisbane Larrikins', 'Launceston Larrikins']);
  });

  it('names a plan change with the short name (N14.1)', () => {
    expect(planChangeLines([
      { minute: 9, side: 'away', attack: 'expansive', defence: 'rush', at: 'half-time' },
      { minute: 14, side: 'home', attack: 'grind', defence: 'compressed', at: 'try' },
    ], { home: 'Larrikins', away: 'Gulls' })).toEqual([
      'Half-time: Gulls went Expansive · Rush.',
      'Minute 14: Larrikins went Tight · Compressed.',
    ]);
    const changed: MatchResult = {
      ...result,
      planChanges: [{ minute: 9, side: 'away', attack: 'expansive', defence: 'rush', at: 'half-time' }],
    };
    expect(buildMatchReport(changed, fixture, names, null).changes).toEqual(['Half-time: Gulls went Expansive · Rush.']);
    expect(buildMatchReport(result, fixture, names, null).changes).toEqual([]);
  });
});

describe('the report headline (#351 P2)', () => {
  it('your result in a word and the margin, home or away', () => {
    expect(resultHeadline({ id: 'player', score: 24 }, { id: 'rival-gulls', score: 12 })).toEqual({ text: 'WIN by 12', kind: 'win' });
    expect(resultHeadline({ id: 'rival-gulls', score: 24 }, { id: 'player', score: 20 })).toEqual({ text: 'LOSS by 4', kind: 'loss' });
    expect(resultHeadline({ id: 'player', score: 10 }, { id: 'rival-gulls', score: 10 })).toEqual({ text: 'DRAW', kind: 'draw' });
  });

  it('none for a match the player is not in; the built report carries it', () => {
    expect(resultHeadline({ id: 'rival-a', score: 4 }, { id: 'rival-b', score: 0 })).toBeNull();
    const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
    const r = buildMatchReport(result, fixture, names, null);
    expect(r.headline?.kind).toBe(result.homeScore > result.awayScore ? 'win' : result.homeScore < result.awayScore ? 'loss' : 'draw');
  });

  it('the plan changes fold under one line that counts them (#351 P0)', () => {
    expect(planChangesSummary(2)).toBe('Plan changes (2)');
  });
});

describe('the full-time card (3s)', () => {
  it('a two-letter badge for the Player of the Match', () => {
    expect(initials('Brayden Naden')).toBe('BN');
    expect(initials('Jett Van Der Berg')).toBe('JB');
    expect(initials('Madonna')).toBe('MA');
    expect(initials('  ')).toBe('?');
  });
  it('takes the badge by letter, not by UTF-16 unit (#616)', () => {
    expect(initials('🦊 Fox')).toBe('FO'); // the emoji is no word: one word, its first two letters
    expect(initials('Jo')).toBe('JO');
    expect(initials('王秀英')).toBe('王秀');
    expect(initials('Tāne 🏉 Whakarua')).toBe('TW');
    expect(initials('🦊 🏉')).toBe('?');
    expect(initials("O'Neill 9")).toBe('O9');
  });
  it('his line leaves out the noughts', () => {
    const p = { name: 'Brayden Naden', teamId: 'player', score: 9, tries: 1, tackles: 31, lineBreaks: 0 };
    expect(fmtPotmShort(p)).toBe('1 try, 31 tackles');
    expect(fmtPotmShort({ ...p, tries: 0, tackles: 0 })).toBe('0 tackles');
    expect(fmtPotmLine(p)).toBe('1 try · 31 tackles · 0 line breaks');
  });
  it('an injury chip by surname, and the ladder move', () => {
    expect(injuryChip('Dane Webb', 2)).toBe('Webb injured 2 wk');
    expect(ladderMove(5, 4)).toEqual({ from: '5th', to: '4th' });
    expect(ladderMove(3, 3)).toEqual({ held: '3rd' });
  });
});

describe('the full-time card occasion (#640)', () => {
  it('the score counts up from nothing to the exact final, never past it', () => {
    expect(countUpValue(24, 0)).toBe(0);
    expect(countUpValue(24, 1)).toBe(24);
    expect(countUpValue(24, 1.7)).toBe(24);
    let last = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const v = countUpValue(24, p);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v).toBeLessThanOrEqual(24);
      last = v;
    }
    expect(countUpValue(0, 0.5)).toBe(0);
  });

  it('three stat rows, the player\u2019s side first', () => {
    const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
    const r = buildMatchReport(result, fixture, names, null);
    const rows = fullTimeStats(r, result);
    expect(rows.map((x) => x.label)).toEqual(['Possession', 'Line breaks', 'Tries']);
    expect(rows[0]).toMatchObject({ first: `${result.stats.possession[0]}%`, second: `${result.stats.possession[1]}%` });
    expect([rows[2]!.first, rows[2]!.second]).toEqual(result.stats.tries.map(String));
    // Away: the player's club is first, so the pairs swap.
    const away = { round: 3, homeId: 'rival-gulls', awayId: 'player' };
    const ra = buildMatchReport(result, away, names, null);
    expect(fullTimeStats(ra, result)[0]).toMatchObject({ first: `${result.stats.possession[1]}%`, second: `${result.stats.possession[0]}%` });
  });
});

import { competitions } from '../../data/leagueCareerFixtures';

describe('saved League match reports', () => {
  it.each(['higher-seed', 'seeded-draw', 'forfeit'] as const)('uses saved dates, stage and official %s winner', decider => {
    const instance = competitions().instances[0]!;
    const f = instance.fixtures[2]!;
    f.homeId = 'player'; f.awayId = 'rival-gulls';
    f.result = { homeScore: decider === 'forfeit' ? 0 : 12, awayScore: 12, winnerId: f.awayId, decider };
    const saved = leagueFixtureView(instance, f);
    const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
    const report = buildMatchReport({ ...result, ...f.result }, saved.bridge, names, null, [], saved);
    expect(report.round).toBe('Week 5 · Finals');
    expect(report.headline?.kind).toBe('loss');
    expect(report.note).toContain('Gulls'); expect(report.note).toContain(decider.replace(/-/g, ' '));
    expect(report.regularLeagueMatch).toBe(false);
    expect(report.note).not.toContain('Live Test FC through');
    const regular = leagueFixtureView(instance, instance.fixtures[0]!);
    expect(buildMatchReport(result, regular.bridge, names, null, [], regular).regularLeagueMatch).toBe(true);
  });
});

describe('settled match payments', () => {
  it.each(['home', 'away'] as const)('reopens the neutral report for the %s club using saved gate and prize receipts', side => {
    const state = buildNewGameState('Live Test FC', 11);
    const definition = cupDefinition('au');
    definition.id = 'au:open-cup';
    definition.stages[0]!.slotIds = [7, 19];
    const { instance } = drawOpenCup({
      definition, season: 1, seed: 4, clubIds: ['player', 'rival-gulls'], currentSlot: 1,
    });
    const actual = instance.fixtures[0]!;
    actual.status = 'completed';
    actual.homeId = side === 'home' ? 'player' : 'rival-gulls';
    actual.awayId = side === 'away' ? 'player' : 'rival-gulls';
    actual.result = { homeScore: side === 'home' ? 20 : 4, awayScore: side === 'away' ? 20 : 4, winnerId: 'player', decider: 'score' };
    const accepted = fixtureBridge({ instance, fixture: actual });
    const base = 7_500;
    const ordinary = matchCashQuote({ matchBase: base, kind: 'played', venue: 'neutral', result: 'win' });
    const other = matchCashQuote({ matchBase: base, kind: 'played', venue: 'neutral', result: 'loss' });
    state.matchIncome = [{
      id: 'ordinary', season: 1, fixture: accepted, matchBase: base, kind: 'played', neutral: true,
      homeSponsor: 0, awaySponsor: 0, homeStand: 0, receipt: { home: side === 'home' ? ordinary : other, away: side === 'away' ? ordinary : other },
    }];
    const { id, competitionId, stageId, slot, round, homeId, awayId } = accepted;
    const { neutral } = actual;
    state.competitionRewards = [{
      id: competitionRewardPromiseId(1, competitionId!, id!), version: 1, season: 1, instanceId: competitionId!, fixtureId: id!,
      definitionId: definition.id, definitionName: definition.name, definitionVersion: definition.version,
      stageId: stageId!, round, slot: slot!, homeId, awayId, neutral, status: 'settled', matchBase: base,
      policies: [{ policy: {
        id: 'cash', kind: 'cash', stageId: stageId!, round, basis: 'fixture-match-base', matchBaseMultiplier: 5,
        execution: { version: 1, eligibility: 'played', recipient: 'winner', repeat: 'each-outcome', trigger: 'round-win' },
      }, cash: 37_500 }],
      resolution: { kind: 'result', result: actual.result },
      receipts: [
        { id: 'cash', outcomeId: 'win', policyId: 'cash', clubId: 'player', kind: 'cash', delta: 37_500 },
        { id: 'rep', outcomeId: 'win', policyId: 'rep', clubId: 'player', kind: 'reputation',
          advertisedDelta: 1, delta: 0, reputationBefore: 100, reputationAfter: 100 },
      ],
    }];
    const saved = leagueFixtureView(instance, actual);
    const result = runMatch(sheet('player', 'Live Test FC'), sheet('rival-gulls', 'Gulls'), { seed: 11 });
    const original = structuredClone(state);
    stubDocument();
    try {
      loadState(state);
      for (let i = 0; i < 2; i++) {
        const income = readMatchReportIncome(getState(), saved);
        const report = buildMatchReport(result, accepted, names, null, [], saved, income);
        expect(report.payments?.ordinary).toEqual(ordinary);
        expect(report.payments?.cup).toMatchObject({ matchBase: base, quotedCash: 37_500, cash: 37_500, reputation: 0, advertisedReputation: 1 });
        const modal = openMatchReport(report) as unknown as StubNode;
        const payment = modal.querySelector('[data-match-payment="ordinary"]')!;
        const gate = '$' + ordinary.home.toLocaleString('en-US');
        expect(ordinary.home).toBeGreaterThan(0);
        expect(payment.words()).toContain('Gate receipts');
        expect(payment.words()).toContain(gate);
        expect(payment.words()).not.toContain('Home income');
        const prize = modal.querySelector('[data-match-payment="cup"]')!;
        expect(prize.words()).toMatch(/Extra Open Cup prize.*Cash received.*\$37,500.*Base payment for this match.*\$7,500/);
        closeModal();
        expect(getState()).toEqual(original);
      }
    } finally {
      closeModal();
      vi.unstubAllGlobals();
    }
    const different: Fixture = { ...accepted, slot: slot! + 1 };
    expect(readMatchReportIncome({ ...state, matchIncome: [{ ...state.matchIncome[0]!, fixture: different }] }, saved)?.ordinary).toBeUndefined();
  });
});
