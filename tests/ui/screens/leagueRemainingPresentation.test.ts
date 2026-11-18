import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, loadState, type SeasonRecord } from '../../../src/core/state';
import { bus, type Events } from '../../../src/core/events';
import { preparePack, selectPack } from '../../../src/content';
import { AU_CAREER_PROFILE } from '../../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../../src/content/career/uk';
import { setupStructuralDivisionCareer } from '../../../src/systems/divisionCareer';
import { setCareerNamespace } from '../../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../../src/core/storageKeys';
import { acceptLeagueEntry, previewLeagueEntry } from '../../../src/systems/leagueEntry';
import { leagueCareerStateProblem } from '../../../src/systems/leagueEntryValidation';
import { leagueSeasonView } from '../../../src/systems/leagueSeasonView';
import { registerAllSystems } from '../../../src/qa/soak';
import * as time from '../../../src/core/time';
import { financeSummary, openFinanceScreen } from '../../../src/ui/screens/finance';
import { homeGate } from '../../../src/systems/economy';
import { fmtFinalsOutcome, fmtRulesNote } from '../../../src/ui/screens/history';
import { openSeasonReview } from '../../../src/ui/screens/seasonReview';
import { initMatchReport } from '../../../src/ui/screens/matchReport';
import { openLineupScreen } from '../../../src/ui/screens/lineup';
import { guidePage, renderGuidePage } from '../../../src/ui/guide/guide';
import { weekSnapshot, weekSummary } from '../../../src/ui/weekSummary';
import { closeModal, closeScreen } from '../../../src/ui/dom';
import { stubDocument, type StubNode } from '../stubDom';

async function admitted(region: 'au' | 'uk') {
  setCareerNamespace(DEV_TEST_PREFIX); await preparePack(region);
  createNewGame('Real League', 573, region === 'uk' ? { home: { town: 'Leeds', country: 'GB', lat: 53.8, lon: -1.5 } } : {});
  const profile = region === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE;
  const s = structuredClone(setupStructuralDivisionCareer(profile, 573, undefined, { enterOpenCup: false }));
  const c = s.competitions!;
  c.leagueCareer = { version: 1, scheduleSeed: 573, clubId: s.clubId, phase: 'initial-choice', access: [{ leagueId: profile.startingDivisionId }],
    initialFields: Object.fromEntries(c.world!.divisions.map(d => [d.id, c.instances.find(i => i.id === d.instanceId)!.entrantIds.slice()])) };
  const p = previewLeagueEntry(s, profile.startingDivisionId); if (!p.ok) throw new Error(p.message);
  const a = acceptLeagueEntry(s, p.preview); if (!a.ok) throw new Error(a.message);
  expect(leagueCareerStateProblem(a.state)).toBeNull(); return a.state;
}
beforeEach(() => { bus.clear(); stubDocument(); vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {}); });
afterEach(() => { closeScreen(); closeModal(); bus.clear(); time.clearHeldWeek(); time.clearTickHooks(); time.clearSeasonHooks(); setCareerNamespace(null); selectPack('au'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('saved League presentation outside the hub', () => {
  it.each(['au', 'uk'] as const)('uses real %s home fixture dates, quiet intervals, and saved help format', async region => {
    loadState(await admitted(region)); registerAllSystems();
    time.withFastForward(() => { for (let n = 0; n < 4; n++) time.advanceWeek(); });
    const s = getState(); const view = leagueSeasonView(s)!;
    expect(leagueCareerStateProblem(s)).toBeNull();
    const homes = view.fixtures.filter(f => f.status === 'scheduled' && f.slot! >= s.week && f.fixture.homeId === s.clubId && !f.fixture.neutral);
    expect(homes.length).toBeGreaterThan(0);
    const summary = financeSummary(s);
    expect(summary.nextHome).toMatchObject({ dateLabel: homes[0]!.dateLabel, stageLabel: homes[0]!.stageLabel });
    const expected = Math.round(homes.reduce((n, f) => n + homeGate({ ...s, week: f.slot! }, f.bridge).receipts, 0) / (view.calendar.slots.length - s.week + 1));
    expect(summary.gateWeekly).toBe(expected);
    expect((openFinanceScreen() as unknown as StubNode).words()).toContain(`${homes[0]!.dateLabel} · ${homes[0]!.stageLabel}`);
    openLineupScreen();
    const plan = (document.body as unknown as StubNode).querySelector('[data-plan]') as unknown as HTMLButtonElement;
    plan.onclick!.call(plan, {} as PointerEvent);
    expect((document.body as unknown as StubNode).words()).toContain(`${view.next!.dateLabel} · ${view.next!.stageLabel}`);
    const help = (id: string) => (renderGuidePage(guidePage(id)) as unknown as StubNode).words();
    expect(help('week')).toContain(`${view.calendar.slots.length}`);
    expect(help('ladder')).toContain(`${view.fieldSize} clubs`);
    expect(help('ladder')).toContain(`Top ${view.finalsSize}`);
    expect(help('ladder')).not.toMatch(/top eight|quarter finals|week 27/i);
    expect(help('money')).toContain('No extra title cash');
    expect(help('ladder')).toContain('permanently');
    expect(help('ladder')).not.toContain('Each one met pays');
    const future = view.fixtures.filter(f => f.status === 'scheduled' && f.slot! >= s.week && f.fixture.homeId === s.clubId);
    for (const f of future) f.fixture.status = 'cancelled';
    expect(leagueCareerStateProblem(s)).toBeNull();
    expect(financeSummary(s)).toMatchObject({ nextHome: null, gateWeekly: 0 });
  });

  it('resolves a committed report from the saved completed fixture, not the scheduled-only query', async () => {
    loadState(await admitted('au')); registerAllSystems();
    const expected = leagueSeasonView(getState())!.next!;
    const off = initMatchReport();
    let kickoff: Events['match:started'] | undefined;
    const stop = bus.on('match:started', m => { kickoff = m; });
    time.advanceWeek(); stop(); expect(kickoff).toBeDefined();
    bus.emit('match:finished', { fixture: kickoff!.fixture, result: {
      homeScore: 12, awayScore: 0, events: [], injuries: [],
      stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] }, weather: 'clear', momentumTimeline: [],
    } });
    const report = (document.body as unknown as StubNode).querySelector('.nrl-rp-title')!;
    expect(report.textContent).toBe(`${expected.dateLabel} · ${expected.stageLabel} · Full time`);
    off();
  });

  it('names the saved stage and date in real match and forfeit notices', async () => {
    loadState(await admitted('au')); registerAllSystems();
    const notices: string[] = []; bus.on('ui:notify', n => notices.push(n.text));
    const first = leagueSeasonView(getState())!.next!;
    time.withFastForward(() => time.advanceWeek());
    expect(notices.some(n => n.startsWith(`${first.dateLabel} · ${first.stageLabel}:`))).toBe(true);
    time.withFastForward(() => { time.advanceWeek(); time.advanceWeek(); });
    const s = getState(); const next = leagueSeasonView(s)!.next!;
    for (const p of s.squad) p.injuredWeeks = 20;
    notices.length = 0;
    time.withFastForward(() => time.advanceWeek());
    expect(notices.some(n => n.includes(`${next.dateLabel} · ${next.stageLabel} forfeited`))).toBe(true);
  });

  it('counts the final interval once and annual acceptance as no elapsed week', async () => {
    loadState(await admitted('au')); registerAllSystems();
    const slots = getState().competitions!.calendar!.slots.length;
    time.withFastForward(() => { for (let n = 0; n < slots - 1; n++) time.advanceWeek(); });
    const before = weekSnapshot(getState()); time.withFastForward(() => time.advanceWeek());
    const closed = getState(); expect(leagueCareerStateProblem(closed)).toBeNull();
    const atClose = weekSnapshot(closed);
    expect(weekSummary(before, atClose)).toMatchObject({ weeks: 1, title: `Week ${slots}` });
    expect(financeSummary(closed)).toMatchObject({ nextHome: null, gateWeekly: 0 });
    const entry = closed.history[closed.history.length - 1]!;
    const review = openSeasonReview(entry) as unknown as StubNode;
    expect(review.words()).toContain('14 regular rounds'); expect(review.words()).not.toContain('24 rounds');
    const p = previewLeagueEntry(closed, closed.competitions!.world!.profile.startingDivisionId); if (!p.ok) throw new Error(p.message);
    const accepted = acceptLeagueEntry(closed, p.preview); if (!accepted.ok) throw new Error(accepted.message);
    expect(leagueCareerStateProblem(accepted.state)).toBeNull();
    expect(weekSummary(atClose, weekSnapshot(accepted.state)).weeks).toBe(0);
  });

  it('reads compact saved final facts after source fixtures have aged out', () => {
    const entry: SeasonRecord = { season: 3, ladderPosition: 5, premiership: false, wins: 6, league: {
      closeId: 'close:3', leagueId: 'local', instanceId: 'local:3', startInterval: 50, endingInterval: 75,
      slotCount: 25, fieldSize: 8, regularRounds: 14, finalsSize: 4,
    } };
    expect(fmtFinalsOutcome(entry)).toBe('missed the finals');
    expect(fmtRulesNote(entry)).not.toContain('Before Nines');
    entry.ladderPosition = 2;
    entry.league!.lastPlayerFinal = { fixtureId: 'final:3', stageId: 'knockout', stageName: 'Regional finals', round: 2, slot: 25,
      homeId: 'player', awayId: 'other', result: { homeScore: 12, awayScore: 12, winnerId: 'other', decider: 'higher-seed' } };
    entry.league!.final = { ...entry.league!.lastPlayerFinal };
    expect(fmtFinalsOutcome(entry)).toContain('lost the final');
    expect(fmtFinalsOutcome(entry)).toContain('higher seed');
    delete entry.league!.final;
    expect(fmtFinalsOutcome(entry)).toContain('Regional finals');
    expect(fmtFinalsOutcome(entry)).toContain('Week 25');
    delete entry.league!.lastPlayerFinal;
    expect(fmtFinalsOutcome(entry)).toBe('No completed finals result recorded');
    entry.league!.finalsSize = 0;
    expect(fmtFinalsOutcome(entry)).toBe('No finals this season');
  });
});
