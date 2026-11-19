import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { bus, type Events } from '../../src/core/events';
import {
  __setStorage,
  __unlockSaves,
  exportSave,
  installImportedSave,
  migrateState,
  pendingLeagueSaveProblem,
  retryPendingLeagueSave,
  saveIfChanged,
  setActiveSlot
} from '../../src/core/save';
import { getState, loadState, setState } from '../../src/core/state';
import { slotKey, liveMatchKey } from '../../src/core/storageKeys';
import {
  advanceWeek,
  clearHeldWeek,
  clearTickHooks,
  failedIntervalProblem,
  weekHeld,
  withFastForward
} from '../../src/core/time';
import { captureCampAction } from '../../src/systems/playerAssignmentCommit';
import { currentSkillsCamp, changeCampBooking } from '../../src/systems/playerAssignments';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { registerTrainingSystem, setTrainingFocus, trainWeek } from '../../src/systems/training';
import { applyCampAward } from '../../src/systems/assignmentTraining';
import { type MatchResult } from '../../src/sim/events';
import { releasePlayer } from '../../src/systems/freeagency';
import { quotePlayerSale } from '../../src/systems/playerTransfers';
import { offerSign, currentOffer } from '../../src/systems/undo';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { commitLineup, placeSigning, setTactics } from '../../src/systems/lineup';
import { subjectCandidates } from '../../src/systems/events';
import { registerFixturesSystem } from '../../src/systems/fixtures';
import * as jobs from '../../src/systems/matchJobs';
import * as rivals from '../../src/systems/rivalRound';

const score: MatchResult = {
  homeScore: 12,
  awayScore: 6,
  events: [],
  injuries: [],
  stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
  weather: 'clear',
  momentumTimeline: []
};
function boundary(week: number) {
  const raw = readFileSync(new URL(`../fixtures/saves/v33-assignments/v33-au-week-${week}.json`, import.meta.url), 'utf8');
  const result = migrateState(JSON.parse(raw));
  if (!result.ok) throw Error(result.message);
  return result.state;
}
function setup() {
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => {
      bytes.set(k, v);
    }),
    removeItem: (k: string) => {
      bytes.delete(k);
    }
  };
  vi.stubGlobal('localStorage', storage);
  __setStorage(storage);
  __unlockSaves();
  setActiveSlot(1);
  const opening = boundary(4),
    start = boundary(5),
    offer = currentSkillsCamp(opening)!;
  const player = start.squad.find(
    (p) =>
      start.lineup.starters.includes(p.id) &&
      !p.injuredWeeks &&
      !p.suspendedWeeks &&
      opening.squad.some((q) => q.id === p.id && !q.injuredWeeks && !q.suspendedWeeks)
  )!;
  const booking = changeCampBooking(opening, offer.id, 0, {
    kind: 'book',
    participantId: player.id,
    focus: opening.settings.spendPointsMyself ? null : 'balanced'
  });
  if (!booking.ok) throw Error(booking.message);
  loadState({
    ...start,
    settings: { ...start.settings, spendPointsMyself: false },
    competitions: { ...start.competitions!, assignments: booking.state.competitions!.assignments! }
  });
  registerTrainingSystem();
  return { bytes, storage, player, start: getState() };
}
afterEach(() => {
  clearHeldWeek();
  clearTickHooks();
  bus.clear();
  __setStorage(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('confirms the Week 5 checkpoint before departure and refuses a missing required marker', () => {
  const { storage, start } = setup();
  storage.setItem.mockImplementation(() => {});
  advanceWeek();
  expect(getState()).toBe(start);
  expect(currentSkillsCamp(getState())?.status).toBe('booked');
  const c = { ...start.competitions! };
  delete c.openCupEntry;
  expect(migrateState({ ...start, competitions: c }).ok).toBe(false);
});
it.each(['watched', 'skip', 'player worker', 'forfeit'] as const)(
  'replaces training and returns the registered player once after %s',
  async (path) => {
    const { bytes, player, start } = setup();
    const before = trainWeek(player, start.facilities, start.training.focus, false, { skipXp: true });
    const expected = applyCampAward(before, { mode: 'auto', campFocus: 'balanced', clubFocus: start.training.focus });
    let kickoff: Events['match:started'] | undefined;
    bus.on('match:started', (e) => {
      kickoff = e;
    });
    if (path !== 'forfeit') registerPlayerMatchSystem();
    if (path === 'skip') withFastForward(advanceWeek);
    else if (path === 'player worker') {
      vi.spyOn(jobs, 'canUseWorker').mockReturnValue(true);
      const simulations = vi.spyOn(jobs, 'playMatchesInWorker').mockResolvedValue([score]);
      withFastForward(advanceWeek, { holds: true });
      expect(simulations).toHaveBeenCalledOnce();
      await vi.waitFor(() => expect(getState().week).toBe(6));
    } else advanceWeek();
    if (path === 'watched') {
      expect(weekHeld()).toBe(true);
      const held = getState();
      expect(currentSkillsCamp(held)?.status).toBe('away');
      expect(held.squad.find((p) => p.id === player.id)?.xp).toBe(before.xp);
      expect(migrateState(held).ok).toBe(false);
      expect(subjectCandidates(held, 'any').map((p) => p.id)).not.toContain(player.id);
      expect(captureCampAction({ kind: 'cancel' }).ok).toBe(false);
      expect(releasePlayer(held, player.id).ok).toBe(false);
      expect(quotePlayerSale(held, player.id).ok).toBe(false);
      const played = kickoff!.fixture.homeId === held.clubId ? kickoff!.home : kickoff!.away;
      expect([...(played.roster ?? []), ...(played.bench ?? [])].map((p) => p.id)).not.toContain(player.id);
      bus.emit('match:finished', { fixture: kickoff!.fixture, result: score });
    }
    const end = getState();
    expect(failedIntervalProblem()).toBeNull();
    expect(end.week).toBe(6);
    expect(end.competitions!.calendar!.elapsedIntervals).toBe(start.competitions!.calendar!.elapsedIntervals + 1);
    expect(currentSkillsCamp(end)).toMatchObject({ status: 'completed', award: expected.receipt });
    expect(end.squad.find((p) => p.id === player.id)).toMatchObject({
      id: player.id,
      xp: expected.player.xp,
      stats: expected.player.stats,
      career: player.career
    });
    expect(migrateState(end).ok).toBe(true);
    expect(bytes.get(slotKey(1))).toBe(JSON.stringify(end));
    if (kickoff) {
      bus.emit('match:finished', { fixture: kickoff.fixture, result: score });
      expect(getState()).toBe(end);
    }
  }
);
it('retains the exact checkpoint during a rival worker hold and retries the entire settled award after a dropped write', async () => {
  const { bytes, storage, player } = setup();
  setState({ settings: { ...getState().settings, liveRivals: true } });
  const checkpoint = getState();
  let finishRivals: (() => void) | undefined;
  vi.spyOn(rivals, 'canUseWorker').mockReturnValue(true);
  vi.spyOn(rivals, 'playRivalJobsInWorker').mockImplementation(
    (group) =>
      new Promise((resolve) => {
        finishRivals = () => resolve(group.map(() => score));
      })
  );
  registerFixturesSystem();
  registerPlayerMatchSystem();
  let watched: Events['match:started'] | undefined;
  bus.on('match:started', (e) => {
    watched = e;
  });
  advanceWeek();
  expect(finishRivals).toBeTypeOf('function');
  const sidecar = bytes.get(liveMatchKey(1));
  bus.emit('match:finished', { fixture: watched!.fixture, result: score });
  expect(currentSkillsCamp(getState())?.status).toBe('away');
  storage.setItem.mockImplementation((key, value) => {
    if (key !== slotKey(1)) bytes.set(key, value);
  });
  finishRivals!();
  await vi.waitFor(() => expect(getState().week).toBe(6));
  const settled = getState();
  expect(currentSkillsCamp(settled)?.booking?.participantId).toBe(player.id);
  expect(pendingLeagueSaveProblem()).toBeTruthy();
  expect(bytes.get(slotKey(1))).toBe(JSON.stringify(checkpoint));
  expect(bytes.get(liveMatchKey(1))).toBe(sidecar);
  const exported = JSON.parse(exportSave(settled));
  expect(exported.competitions.assignments).toEqual(checkpoint.competitions!.assignments);
  expect(exported.week).toBe(5);
  storage.setItem.mockImplementation((key, value) => {
    bytes.set(key, value);
  });
  expect(retryPendingLeagueSave()).toBeNull();
  expect(bytes.get(slotKey(1))).toBe(JSON.stringify(settled));
  expect(bytes.has(liveMatchKey(1))).toBe(false);
});
it('imports a parked camp to a different slot and resumes its frozen sheet and progress', () => {
  const { player, bytes, storage } = setup();
  const played: Events['match:started'][] = [];
  bus.on('match:started', (e) => played.push(e));
  registerPlayerMatchSystem();
  advanceWeek();
  expect(played[0]!.live.onProgress!([], 33, [])).toBe(true);
  const file = exportSave(getState());
  const target = installImportedSave(file, 2);
  if (!target.ok) throw Error(target.message);
  const oldSidecar = bytes.get(liveMatchKey(1));
  expect(currentSkillsCamp(target.state)?.status).toBe('booked');
  setActiveSlot(2);
  loadState(target.state);
  expect(weekHeld()).toBe(false);
  expect(exportSave(target.state)).toBe(file);
  const saved = bytes.get(slotKey(2)),
    side = bytes.get(liveMatchKey(2));
  expect(commitLineup(setTactics(getState().lineup, { attack: 'grind' }))).toBe(false);
  setTrainingFocus('speed');
  expect(saveIfChanged({ ...getState(), clubName: 'Detached candidate' }, true)).toBe(false);
  const available = getState().squad.find((p) => p.id !== player.id)!;
  offerSign(available, available, 0, 100);
  const undo = currentOffer()!;
  expect(captureCampAction({ kind: 'cancel' })).toMatchObject({ ok: false, reason: 'held' });
  expect(quotePlayerSale(getState(), available.id)).toMatchObject({ ok: false, reason: 'match-active' });
  expect(releasePlayer(getState(), available.id)).toMatchObject({ ok: false, reason: 'match-active' });
  expect(undo.canRevert(getState())).toBe(false);
  undo.revert();
  expect(getState()).toBe(target.state);
  expect(bytes.get(slotKey(2))).toBe(saved);
  expect(bytes.get(liveMatchKey(2))).toBe(side);
  bytes.set(liveMatchKey(2), JSON.stringify({ ...JSON.parse(side!), fixtureId: 'unrelated-fixture' }));
  expect(captureCampAction({ kind: 'cancel' }).ok).toBe(true);
  bytes.set(liveMatchKey(2), side!);
  const read = vi.spyOn(storage, 'getItem').mockImplementation((key) => {
    if (key === slotKey(2)) throw Error('checkpoint read unavailable');
    return bytes.get(key) ?? null;
  });
  advanceWeek();
  expect(weekHeld()).toBe(false);
  expect(captureCampAction({ kind: 'cancel' })).toMatchObject({ ok: false, reason: 'held' });
  expect(getState()).toBe(target.state);
  read.mockRestore();
  advanceWeek();
  expect(played[1]!.live.resumeAt).toBe(33);
  expect(played[1]!.home).toEqual(played[0]!.home);
  expect(played[1]!.away).toEqual(played[0]!.away);
  bus.emit('match:finished', { fixture: played[0]!.fixture, result: score });
  expect(currentSkillsCamp(getState())?.status).toBe('away');
  bus.emit('match:finished', { fixture: played[1]!.fixture, result: score });
  expect(currentSkillsCamp(getState())).toMatchObject({
    status: 'completed',
    revision: 3,
    booking: { participantId: player.id }
  });
  expect(bytes.get(liveMatchKey(1))).toBe(oldSidecar);
  expect(bytes.has(liveMatchKey(2))).toBe(false);
});
it('a mid-interval signing cannot seat a displaced camper on the bench', () => {
  const { player, start } = setup();
  const lineup = { ...start.lineup, bench: [] };
  const signed = {
    ...player,
    id: 'incoming',
    stats: { speed: 100, strength: 100, stamina: 100, handling: 100, kicking: 100, footyIQ: 100 }
  };
  const placed = placeSigning(lineup, [...start.squad, signed], signed, new Set([player.id]));
  expect(placed.lineup.bench).not.toContain(player.id);
});
it('captures only XP-relevant trait fields from a valid imported player', () => {
  const { start, player } = setup();
  const candidate = {
    ...start,
    squad: start.squad.map((p) =>
      p.id === player.id
        ? {
            ...p,
            traits: [...p.traits.filter((t) => t.id !== 'workhorse'), { id: 'workhorse', level: 1, legacyNote: 'inert' }]
          }
        : p
    )
  };
  const reloaded = migrateState(candidate);
  if (!reloaded.ok) throw Error(reloaded.message);
  loadState(reloaded.state);
  advanceWeek();
  expect(getState().week).toBe(6);
  const basis = currentSkillsCamp(getState())!.awardBasis!;
  expect(basis.xpTraits.find((t) => t.id === 'workhorse')).toEqual({ id: 'workhorse', level: 1 });
});
it('rejects a self-consistent forged award even after an otherwise valid interval', () => {
  setup();
  advanceWeek();
  const altered = structuredClone(getState());
  const award = currentSkillsCamp(altered)!.award!;
  award.effectiveXp += 0.125;
  award.xpAfter += 0.125;
  expect(migrateState(altered).ok).toBe(false);
});
it.each(['return age', 'above-ceiling stat'] as const)('rejects a reproducible award with an impossible %s', (fault) => {
  const { player } = setup();
  advanceWeek();
  const altered = structuredClone(getState());
  const camp = currentSkillsCamp(altered)!;
  const basis = camp.awardBasis!;
  const original = camp.award!;
  if (fault === 'return age') basis.age = 19;
  else basis.stats.speed = player.ceilings.speed! + 1;
  const before = {
    ...player,
    age: basis.age,
    traits: basis.xpTraits,
    stats: { ...player.stats, ...basis.stats },
    xp: original.xpBefore,
    unspentPoints: original.bankedBefore
  };
  camp.award = applyCampAward(before, {
    mode: original.mode,
    clubFocus: basis.clubFocus,
    ...(camp.booking!.focus ? { campFocus: camp.booking!.focus } : {})
  }).receipt;
  expect(migrateState(altered).ok).toBe(false);
});
it('retains the report when a camper retires and an older season’s draw is pruned', () => {
  const { player } = setup();
  setState({ squad: getState().squad.map((p) => (p.id === player.id ? { ...p, age: 37 } : p)) });
  registerFixturesSystem();
  withFastForward(advanceWeek);
  const report = structuredClone(currentSkillsCamp(getState())!);
  expect(report.status).toBe('completed');
  for (let season = 1; season <= 2; season++) {
    const week = getState().week;
    withFastForward(() => {
      for (let n = week; n <= 25; n++) advanceWeek();
    });
    const closed = getState();
    expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
    const selected = previewLeagueEntry(closed, closed.competitions!.world!.profile.startingDivisionId);
    if (!selected.ok) throw Error(selected.message);
    const result = confirmLeagueEntry(selected.preview);
    if (!result.ok) throw Error(result.message);
    expect(currentSkillsCamp(getState())).toMatchObject({ season: season + 1, status: 'available', revision: 0 });
    expect(getState().competitions!.assignments).toEqual([report]);
    expect(migrateState(getState()).ok).toBe(true);
  }
  expect(getState().playerPopulation.retired.some((p) => p.id === player.id)).toBe(true);
  expect(getState().competitions!.instances.some((i) => i.season === 1)).toBe(false);
  for (const suffix of ['not-a-fixture', '0.5', '04', '4', '100']) {
    const altered = structuredClone(getState());
    const prior = altered.competitions!.assignments![0]!;
    prior.fixtureId = `${prior.instanceId}:f${suffix}`;
    expect(migrateState(altered).ok, suffix).toBe(false);
  }
}, 30000);
it('refuses sale, direct release and even a previously captured Undo for both the booked participant and necessary cover', () => {
  const { player, start } = setup();
  const others = start.squad.filter((p) => p.id !== player.id).slice(0, 13);
  setState({ squad: [player, ...others].map((p) => ({ ...p, injuredWeeks: 0, suspendedWeeks: 0 })) });
  for (const person of getState().squad.slice(0, 2)) {
    const live = getState();
    expect(quotePlayerSale(live, person.id)).toMatchObject({ ok: false, reason: 'assignment' });
    expect(releasePlayer(live, person.id)).toMatchObject({ ok: false, reason: 'assignment' });
    offerSign(person, person, 0, 100);
    const undo = currentOffer()!;
    expect(undo.canRevert(live)).toBe(false);
    undo.revert();
    expect(getState()).toBe(live);
  }
});
