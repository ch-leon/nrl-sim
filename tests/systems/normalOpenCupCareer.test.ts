import { beforeEach, expect, it, vi } from 'vitest';
import { FORFEIT_SCORE } from '../../src/config';
import { AU_PACK } from '../../src/content/au';
import * as calendar from '../../src/systems/competitionCalendar';
import { preparePack } from '../../src/content';
import { bus, type Events } from '../../src/core/events';
import { getState, loadState, setState } from '../../src/core/state';
import { loadSlot, migrateState, pendingLeagueSaveProblem, retryPendingLeagueSave } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { advanceWeek, failedIntervalProblem, weekHeld, registerTickHook, TICK_ORDER, withFastForward } from '../../src/core/time';
import { registerAllSystems } from '../../src/qa/soak';
import { startLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { captureOpenCupEntryPreview, confirmOpenCupChoice, confirmOpenCupWithdrawal } from '../../src/systems/openCupEntryCommit';
import { competitionHonours } from '../../src/systems/competitionRewards';
import { openCupByes } from '../../src/systems/openCup';
import { bytes, firstTieSeed, installCupTestHooks } from '../helpers/openCupCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';

import * as matchJobs from '../../src/systems/matchJobs';
import * as rivalRound from '../../src/systems/rivalRound';
import * as rewardSystem from '../../src/systems/competitionRewards';
import { slotKey, liveMatchKey } from '../../src/core/storageKeys';

installCupTestHooks();
beforeEach(() => setCareerNamespace(null));

function offer() {
  const preview = captureOpenCupEntryPreview();
  if (!preview.ok) throw Error(preview.message);
  return preview.preview;
}
function enterLeague(rank: number) {
  const s = getState(),
    id = s.competitions!.world!.divisions[rank]!.id;
  const p = previewLeagueEntry(s, id);
  if (!p.ok) throw Error(p.message);
  const result = confirmLeagueEntry(p.preview);
  if (!result.ok) throw Error(result.message);
}
async function start(region: 'au' | 'uk', seed: number, choice: 'enter' | 'decline') {
  await preparePack(region);
  const result = await startLeagueCareer({
    clubName: 'Rovers',
    seed,
    ...(region === 'uk' ? { home: { town: 'Leeds', country: 'GB' } } : {})
  });
  if (!result.ok) throw Error(result.message);
  enterLeague(0);
  registerAllSystems();
  const entered = confirmOpenCupChoice({ ...offer(), choice });
  if (!entered.ok) throw Error(entered.message);
}
function cup() {
  const c = getState().competitions!;
  return c.instances.find(i => i.id === c.openCupEntry!.current.instanceId)!;
}
function play(outcome: 'win' | 'loss' = 'win') {
  const before = getState();
  let match: Events['match:started'] | undefined;
  const off = bus.on('match:started', m => {
    match = m;
  });
  advanceWeek();
  off();
  if (match) {
    const homeWins = (match.fixture.homeId === before.clubId) === (outcome === 'win');
    // Backend-only controlled score delivered through the watched match callback.
    bus.emit('match:finished', {
      fixture: match.fixture,
      result: {
        homeScore: homeWins ? 24 : 0,
        awayScore: homeWins ? 0 : 24,
        events: [],
        injuries: [],
        stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
        weather: 'clear',
        momentumTimeline: []
      }
    });
  }
  expect(failedIntervalProblem()).toBeNull();
  expect(weekHeld()).toBe(false);
  expect(getState().competitions!.calendar!.elapsedIntervals).toBe(before.competitions!.calendar!.elapsedIntervals + 1);
  return match;
}
function until(week: number) {
  while (getState().week < week) play();
}

it('wins two normal Australian cups across a league change and preserves both honours', async () => {
  await start('au', firstTieSeed(), 'enter');
  const template = offer().definition,
    ids: string[] = [];
  for (const season of [1, 2]) {
    if (season === 2) {
      expect(offer()).toMatchObject({ choice: 'unanswered', lifecycle: 'open', definition: template });
      expect(confirmOpenCupChoice({ ...offer(), choice: 'enter' }).ok).toBe(true);
    }
    until(7);
    expect(cup().entrantIds).toHaveLength(24);
    ids.push(cup().id);
    const unlocks = structuredClone(getState().competitions!.leagueCareer!.access);
    const cap = structuredClone(getState().capAccount);
    until(19);
    const squad = getState().squad.map(({ id, name }) => ({ id, name }));
    const final = cup().fixtures.find(f => f.round === 5)!;
    const notices: Events['money:changed'][] = [];
    const off = bus.on('money:changed', value => notices.push(value));
    play();
    off();
    const state = getState();
    const award = state.competitionRewards.find(r => r.fixtureId === final.id)!;
    const ordinary = state.matchIncome.find(r => r.fixture.id === final.id)!;
    expect(ordinary.receipt).toBeDefined();
    expect(award.status === 'settled' && award.receipts.map(r => r.kind)).toEqual(['cash', 'reputation', 'reputation', 'honour']);
    expect(notices.filter(r => r.reason === 'prize').map(r => r.delta)).toEqual([5 * ordinary.matchBase]);
    expect(award.status === 'settled' && award.receipts.find(r => r.kind === 'honour')?.squad.players).toEqual(squad);
    expect(cup().winnerId).toBe(state.clubId);
    expect(offer().canWithdraw).toBe(false);
    expect(confirmOpenCupWithdrawal(offer())).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(state.competitions!.leagueCareer!.access).toEqual(unlocks);
    expect(state.capAccount).toEqual(cap);
    expect(competitionHonours(state, state.clubId)).toHaveLength(season);
    const loaded = loadSlot();
    if (loaded.status !== 'ok') throw Error('invalid winning save');
    loadState(loaded.state);
    until(25);
    play();
    enterLeague(season === 1 ? 1 : 0);
    const forged = structuredClone(getState());
    forged.competitions!.openCupEntry!.retained = [];
    expect(migrateState(forged).ok).toBe(false);
    expect(getState().playerPopulation.lastAcademyIntakeSeason).toBe(season + 1);
    expect(getState().competitions!.calendar!.elapsedIntervals).toBe(25 * season);
  }
  expect(new Set(ids).size).toBe(2);
  expect(competitionHonours(getState(), getState().clubId)).toHaveLength(2);
  expect(getState().competitions!.openCupEntry!.retained.map(o => o.instanceId)).toEqual(ids.slice(-1));
  // Season three returns to Local while retaining the Championship salary capacity.
  expect(getState().capAccount.tier).toBe('championship');
  expect(confirmOpenCupChoice({ ...offer(), choice: 'enter' }).ok).toBe(true);
  until(19);
  play();
  const final = cup().fixtures.find(f => f.round === 5)!;
  const award = getState().competitionRewards.find(r => r.fixtureId === final.id)!;
  expect(award.matchBase).toBe(8000);
  expect(award.status === 'settled' && award.receipts.find(r => r.kind === 'cash')?.delta).toBe(40000);
  const forged = structuredClone(getState());
  const historical = forged.competitionRewards.find(r => r.season === 1)!;
  const firstBase = historical.matchBase;
  historical.matchBase = 1;
  for (const item of historical.policies) if (item.policy.kind === 'cash') item.cash = item.policy.matchBaseMultiplier;
  if (historical.status === 'settled') for (const receipt of historical.receipts) if (receipt.kind === 'cash') receipt.delta /= firstBase;
  expect(migrateState(forged).ok).toBe(false);
  const badVersion = structuredClone(getState());
  badVersion.competitionRewards.find(r => r.season === 1)!.definitionVersion++;
  expect(migrateState(badVersion).ok).toBe(false);
}, 90000);

it('completes a declined British cup with the AI champion and leaves the player league active', async () => {
  await start('uk', 573, 'decline');
  until(20);
  expect(cup().entrantIds).toHaveLength(23);
  expect(cup().entrantIds).not.toContain('player');
  expect(cup().status).toBe('completed');
  expect(competitionHonours(getState(), cup().winnerId!)).toHaveLength(1);
  expect(getState().competitions!.leagueCareer!.phase).toBe('active');
}, 45000);

it.each([false, true])(
  'withdraws only on the next real tie after opening bye=%s',
  async bye => {
    // Probe the existing sporting policy to pick reproducible test seeds, without changing any saved draw.
    const { structuralOpenCup } = await import('../../src/systems/openCupCareer');
    const { AU_PACK } = await import('../../src/content/au');
    const ids = ['player', ...AU_CAREER_PROFILE.clubs.map(c => c.id)];
    const seed = Array.from({ length: 40 }, (_, n) => n + 1).find(
      n => openCupByes(structuralOpenCup(AU_CAREER_PROFILE, AU_PACK, n, ids, 'player', true)!).includes('player') === bye
    )!;
    await start('au', seed, 'enter');
    until(7);
    expect(openCupByes(cup()).includes('player')).toBe(bye);
    if (!bye) {
      play();
      expect(cup().fixtures.some(f => f.result?.winnerId === 'player')).toBe(true);
    }
    const earlier = getState().competitionRewards.filter(r => r.status === 'settled' && r.receipts.some(x => x.clubId === 'player'));
    const choice = confirmOpenCupWithdrawal(offer());
    if (!choice.ok) throw Error(choice.message);
    if (bye) expect(play()).toBeUndefined();
    until(10);
    const before = getState();
    const committed: Events['match:committed'][] = [];
    const off = bus.on('match:committed', e => committed.push(e));
    expect(play()).toBeUndefined();
    off();
    expect(committed).toEqual([]);
    const w = offer().withdrawal!;
    expect(w.fulfilled).toMatchObject({ slot: 10, result: { decider: 'forfeit' } });
    expect(w.fulfilled!.result.winnerId).not.toBe('player');
    const record = getState().competitionRewards.find(r => r.fixtureId === w.fulfilled!.fixtureId)!;
    expect(record).toMatchObject({ status: 'settled', receipts: [] });
    expect(getState().matchIncome.find(r => r.fixture.id === record.fixtureId)?.receipt).toMatchObject({
      home: { total: 0 },
      away: { total: 0 }
    });
    expect(getState().competitionRewards).toEqual(expect.arrayContaining(earlier));
    expect(getState().squad.map(p => p.seasonStats?.games)).toEqual(before.squad.map(p => p.seasonStats?.games));
    expect(offer().canWithdraw).toBe(false);
    until(20);
    expect(cup().status).toBe('completed');
    expect(cup().winnerId).not.toBe('player');
  },
  45000
);

it('quarantines a no-op withdrawal before a player job or end-of-week cleanup', async () => {
  await start('au', firstTieSeed(), 'enter');
  until(7);
  expect(confirmOpenCupWithdrawal(offer()).ok).toBe(true);
  const source = bytes.get(slotKey(1))!;
  const elapsed = getState().competitions!.calendar!.elapsedIntervals;
  const tie = cup().fixtures.find(f => f.homeId === 'player' || f.awayId === 'player')!;
  const finalise = calendar.finaliseCalendarFixture;
  const recorder = vi
    .spyOn(calendar, 'finaliseCalendarFixture')
    .mockImplementation((s, f, score, forfeit, fulfilment) => (fulfilment ? s : finalise(s, f, score, forfeit)));
  const playerStarted = vi.fn();
  bus.on('match:started', playerStarted);
  const cleanup = vi.spyOn(calendar, 'settleStructuralCalendar');
  advanceWeek();
  expect(recorder).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: tie.id }), expect.anything(), true, {
    kind: 'open-cup-withdrawal',
    offerId: getState().competitions!.openCupEntry!.current.offerId
  });
  expect(failedIntervalProblem()).toMatch(/Reload the saved interval/);
  advanceWeek();
  expect(recorder).toHaveBeenCalledTimes(1);
  expect(playerStarted).not.toHaveBeenCalled();
  expect(cleanup).not.toHaveBeenCalled();
  expect(getState().week).toBe(7);
  expect(getState().competitions!.calendar!.elapsedIntervals).toBe(elapsed);
  expect(cup().fixtures.find(f => f.id === tie.id)).toMatchObject({ status: 'scheduled' });
  expect(getState().competitions!.openCupEntry!.current.withdrawal!.fulfilled).toBeNull();
  expect(bytes.get(slotKey(1))).toBe(source);
}, 20000);

it('rejects invalid withdrawal fulfilment for a pending real player tie', async () => {
  await start('au', firstTieSeed(), 'enter');
  until(7);
  play();
  expect(confirmOpenCupWithdrawal(offer()).ok).toBe(true);
  const instance = cup();
  const fixture = instance.fixtures.find(f => f.slot === 10 && (f.homeId === 'player' || f.awayId === 'player'))!;
  const bridge = calendar.fixtureBridge({ instance, fixture });
  const lose = fixture.homeId === 'player' ? { homeScore: 0, awayScore: FORFEIT_SCORE } : { homeScore: FORFEIT_SCORE, awayScore: 0 };
  const win = { homeScore: lose.awayScore, awayScore: lose.homeScore };
  const fulfilment = { kind: 'open-cup-withdrawal' as const, offerId: offer().offerId };
  expect(getState().week).toBe(8);
  expect(calendar.finaliseCalendarFixture(getState(), bridge, lose, true, fulfilment)).toBe(getState());
  until(10);
  const state = getState();
  const original = JSON.stringify(state);
  expect(() => calendar.finaliseCalendarFixture(state, bridge, lose, true, { ...fulfilment, offerId: 'foreign' })).toThrow(/fulfilment/);
  expect(() => calendar.finaliseCalendarFixture(state, bridge, lose, false, fulfilment)).toThrow(/fulfilment/);
  expect(() => calendar.finaliseCalendarFixture(state, bridge, win, true, fulfilment)).toThrow(/fulfilment/);
  expect(JSON.stringify(state)).toBe(original);
}, 20000);

it('forfeits a real round-one tie on the request date and reloads the zero-value settlement', async () => {
  await start('au', firstTieSeed(), 'enter');
  until(7);
  const fixture = cup().fixtures.find(f => f.homeId === 'player' || f.awayId === 'player')!;
  expect(fixture).toMatchObject({ round: 1, slot: 7, status: 'scheduled' });
  expect(confirmOpenCupWithdrawal(offer()).ok).toBe(true);
  expect(play()).toBeUndefined();
  const loaded = loadSlot();
  if (loaded.status !== 'ok') throw Error('Cannot reload the first-round forfeit');
  loadState(loaded.state);
  expect(offer().withdrawal).toMatchObject({
    requestSlot: 7,
    fulfilled: {
      fixtureId: fixture.id,
      slot: 7,
      result: { winnerId: fixture.homeId === 'player' ? fixture.awayId : fixture.homeId, decider: 'forfeit' }
    }
  });
  expect(getState().competitionRewards.filter(r => r.fixtureId === fixture.id)).toMatchObject([{ status: 'settled', receipts: [] }]);
  expect(getState().matchIncome.filter(r => r.fixture.id === fixture.id)).toMatchObject([
    { receipt: { home: { total: 0 }, away: { total: 0 } } }
  ]);
}, 20000);

it('refuses withdrawal after a played elimination while the other clubs continue', async () => {
  await start('au', firstTieSeed(), 'enter');
  until(7);
  expect(play('loss')).toBeDefined();
  expect(cup().status).toBe('active');
  expect(cup().fixtures.find(f => f.homeId === 'player' || f.awayId === 'player')!.result!.winnerId).not.toBe('player');
  const source = bytes.get(slotKey(1));
  expect(offer().canWithdraw).toBe(false);
  expect(confirmOpenCupWithdrawal(offer())).toMatchObject({ ok: false, reason: 'unavailable' });
  expect(offer().withdrawal).toBeNull();
  expect(bytes.get(slotKey(1))).toBe(source);
}, 20000);

it('keeps the current, retained and next annual terms through regional catalogue edits', async () => {
  await start('au', firstTieSeed(), 'enter');
  const { definition, dates, deadline } = offer();
  const terms = { definition, dates, deadline };
  const originalSlots = AU_CAREER_PROFILE.calendarSlots;
  const originalRules = AU_PACK.rules;
  try {
    AU_CAREER_PROFILE.calendarSlots = originalSlots.map(slot => (slot.id === deadline ? { ...slot, kind: 'rest' } : slot));
    AU_PACK.rules = { ...originalRules, halfMinutes: originalRules.halfMinutes + 1 };
    expect(migrateState(getState()).ok).toBe(true);
    expect(offer()).toMatchObject(terms);
    until(7);
    expect(cup().definition).toEqual(definition);
    const firstOffer = structuredClone(getState().competitions!.openCupEntry!.current);
    until(25);
    play();
    enterLeague(1);
    const loaded = loadSlot();
    if (loaded.status !== 'ok') throw Error('Cannot reload the new season after catalogue changes');
    loadState(loaded.state);
    expect(getState().competitions!.openCupEntry!.retained).toEqual([firstOffer]);
    expect(offer()).toMatchObject({ ...terms, season: 2, choice: 'unanswered' });
  } finally {
    AU_PACK.rules = originalRules;
    AU_CAREER_PROFILE.calendarSlots = originalSlots;
  }
}, 45000);

it('quarantines corrupted deadline closure before saving week seven', async () => {
  await start('au', 573, 'enter');
  until(6);
  const source = bytes.get(slotKey(1));
  registerTickHook('corrupt-registration', TICK_ORDER.ladder, () => {
    const s = getState(),
      c = structuredClone(s.competitions!);
    c.openCupEntry!.current.draw.ordinal = 1 as 0;
    setState({ competitions: c });
  });
  withFastForward(advanceWeek);
  expect(failedIntervalProblem()).toBeTruthy();
  expect(getState().week).toBe(6);
  expect(bytes.get(slotKey(1))).toBe(source);
}, 20000);

it('verifies the headless AI-only week and blocks subsequent progress until readback succeeds', async () => {
  await start('uk', 573, 'decline');
  until(7);
  const source = bytes.get(slotKey(1))!;
  const sidecar = 'retained sidecar';
  bytes.set(liveMatchKey(1), sidecar);
  const put = globalThis.localStorage.setItem;
  const mismatch = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation((k, v) => {
    put(k, k === slotKey(1) && JSON.parse(v).week === 8 ? 'damaged week' : v);
  });
  withFastForward(advanceWeek);
  expect(getState().week).toBe(8);
  expect(pendingLeagueSaveProblem()).toBeTruthy();
  expect(bytes.get(slotKey(1))).toBe(source);
  expect(bytes.get(liveMatchKey(1))).toBe(sidecar);
  expect(confirmOpenCupWithdrawal({ ...offer(), offerId: 'old', previewKey: 'old' })).toMatchObject({ ok: false, reason: 'storage' });
  withFastForward(advanceWeek);
  expect(getState().week).toBe(8);
  mismatch.mockRestore();
  expect(retryPendingLeagueSave()).toBeNull();
  expect(JSON.parse(bytes.get(slotKey(1))!).week).toBe(8);
}, 20000);

it.each(['watched', 'worker', 'shared rival'] as const)(
  'rejects a failed normal cup %s settlement without a cancellation fallback',
  async route => {
    await start('au', firstTieSeed(), 'enter');
    until(7);
    if (route === 'shared rival') setState({ settings: { ...getState().settings, liveRivals: true } });
    const startState = getState(),
      field = cup(),
      ties = field.fixtures;
    const target =
      route === 'shared rival'
        ? ties.filter(f => f.homeId !== 'player' && f.awayId !== 'player')[1]!
        : ties.find(f => f.homeId === 'player' || f.awayId === 'player')!;
    const real = rewardSystem.reconcileCompetitionRewards;
    const fault = vi.spyOn(rewardSystem, 'reconcileCompetitionRewards').mockImplementation(s => {
      const f = s.competitions!.instances.find(i => i.id === field.id)!.fixtures.find(f => f.id === target.id)!;
      if (f.result) throw new rewardSystem.CompetitionRewardError('Injected normal cup award failure');
      return real(s);
    });
    const played: Events['match:started'][] = [];
    bus.on('match:started', m => played.push(m));
    const result = {
      homeScore: 24,
      awayScore: 0,
      events: [],
      injuries: [],
      stats: {
        possession: [50, 50] as [number, number],
        tackles: [0, 0] as [number, number],
        errors: [0, 0] as [number, number],
        tries: [0, 0] as [number, number]
      },
      weather: 'clear' as const,
      momentumTimeline: []
    };
    if (route === 'worker') {
      vi.spyOn(matchJobs, 'canUseWorker').mockReturnValue(true);
      vi.spyOn(matchJobs, 'playMatchesInWorker').mockResolvedValue([result]);
      withFastForward(advanceWeek, { holds: true });
    } else {
      if (route === 'shared rival') {
        vi.spyOn(rivalRound, 'canUseWorker').mockReturnValue(true);
        vi.spyOn(rivalRound, 'playRivalJobsInWorker').mockImplementation(async jobs => jobs.map(() => result));
      }
      advanceWeek();
      expect(played).toHaveLength(1);
      // Backend-only controlled score delivered through the watched match callback.
      bus.emit('match:finished', { fixture: played[0]!.fixture, result });
    }
    await vi.waitFor(() => expect(failedIntervalProblem()).toBeTruthy());
    expect(bytes.get(slotKey(1))).toBe(JSON.stringify(startState));
    if (route !== 'worker') expect(bytes.has(liveMatchKey(1))).toBe(true);
    expect(cup().fixtures.find(f => f.id === target.id)!.status).toBe('scheduled');
    expect(cup().status).not.toBe('withdrawn');
    fault.mockRestore();
  },
  25000
);
