import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { bus, type Events } from '../../src/core/events';
import { __setStorage, __unlockSaves, installImportedSave, setActiveSlot } from '../../src/core/save';
import { getState, loadState } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import {
  advanceWeek,
  clearHeldWeek,
  clearSeasonHooks,
  clearTickHooks,
  failedIntervalProblem,
  weekHeld
} from '../../src/core/time';
import { registerAllSystems, advanceWeekAsTapped } from '../../src/qa/soak';
import { LIVE_MATCH_EXPORT_FIELD } from '../../src/systems/liveMatchRecord';
import { MATCH_ENGINE_REVISION, matchEngineIdentity } from '../../src/systems/matchEngineIdentity';

const capture = (name: string) =>
  readFileSync(new URL('../fixtures/saves/v33-assignments/' + name + '.json', import.meta.url), 'utf8');

/** The match-engine revision a captured sidecar was saved under ("nrl-live-6-…" → 6). */
const recordedRevision = (sidecar: string): number =>
  Number(/^nrl-live-(\d+)-/.exec((JSON.parse(sidecar) as { engineId: string }).engineId)![1]);

type Save = Record<string, unknown> & {
  squad: Record<string, unknown>[];
  competitions: Record<string, unknown> & { instances: (Record<string, unknown> & { fixtures: Record<string, unknown>[] })[] };
};

/**
 * The parts of a save that only the week's matches decide: the squad's form, fitness,
 * injuries and season stats, Player of the Match counts, and the fixtures' scores. A
 * match-engine change replays these differently by design; everything else (the save
 * migration, Skills Camp, the Open Cup offer, money, the calendar) must not move.
 */
function withoutMatchResults(save: Save): unknown {
  const { squad: _squad, potmTally: _potm, competitions, ...rest } = save;
  const { instances: _instances, ...otherCompetitions } = competitions;
  return { ...rest, competitions: otherCompetitions };
}

/** Who is in the squad and on what terms: the identity and contract fields a match result can't change. */
const squadIdentity = (save: Save) => save.squad.map(p => ({
  id: p.id, name: p.name, position: p.position, age: p.age, wage: p.wage,
  contractWeeks: p.contractWeeks, deal: p.deal, joinedSeason: p.joinedSeason,
}));

/**
 * Every competition, and every fixture's teams, round and played/scheduled status, without
 * its score. A finished competition's winner is a result too: it must still have one, and
 * one of its own entrants.
 */
const fixtureCalendar = (save: Save) => save.competitions.instances.map(({ fixtures, winnerId, ...instance }) => ({
  ...instance,
  decided: winnerId !== undefined && (instance.entrantIds as unknown[]).includes(winnerId),
  fixtures: fixtures.map(f => ({ id: f.id, round: f.round, homeId: f.homeId, awayId: f.awayId, status: f.status })),
}));

afterEach(() => {
  clearHeldWeek();
  clearTickHooks();
  clearSeasonHooks();
  bus.clear();
  __setStorage(null);
  vi.unstubAllGlobals();
});
it.each(['au', 'uk'] as const)(
  'reconstructs the complete released %s Week 5 boundary and its original parked match',
  async (pack) => {
    await preparePack(pack);
    selectPack(pack);
    const bytes = new Map<string, string>();
    const store = {
      getItem: (k: string) => bytes.get(k) ?? null,
      setItem: (k: string, v: string) => {
        bytes.set(k, v);
      },
      removeItem: (k: string) => {
        bytes.delete(k);
      }
    };
    vi.stubGlobal('localStorage', store);
    __setStorage(store);
    __unlockSaves();
    setActiveSlot(1);
    const w4 = capture('v33-' + pack + '-week-4'),
      w5 = JSON.parse(capture('v33-' + pack + '-week-5')) as Save;
    const originalSidecar = capture('live-matches/v33-' + pack + '-week-5'),
      live = JSON.parse(originalSidecar);
    // The saves were captured on one match engine. On that engine the week replays exactly;
    // on a later one (any MATCH_ENGINE_REVISION bump) its matches play out differently, so
    // only what the matches decide is allowed to differ.
    const sameEngine = recordedRevision(originalSidecar) === MATCH_ENGINE_REVISION;
    const first = installImportedSave(w4, 1);
    if (!first.ok) throw Error(first.message);
    loadState(first.state);
    registerAllSystems();
    advanceWeekAsTapped();
    const replayed = { ...getState(), version: 33 } as unknown as Save;
    // Migration, Skills Camp, the cup offer, money and the calendar: exact on any engine.
    expect(withoutMatchResults(replayed)).toEqual(withoutMatchResults(w5));
    expect(squadIdentity(replayed)).toEqual(squadIdentity(w5));
    expect(fixtureCalendar(replayed)).toEqual(fixtureCalendar(w5));
    // The slot holds what was played, in the current save version.
    expect(bytes.get(slotKey(1))).toBe(JSON.stringify({ ...replayed, version: 34 }));
    if (sameEngine) {
      expect(replayed).toEqual(w5);
      expect(bytes.get(slotKey(1))).toBe(JSON.stringify({ ...w5, version: 34 }));
    }
    const parked = installImportedSave(JSON.stringify({ ...w5, [LIVE_MATCH_EXPORT_FIELD]: live }), 1);
    if (!parked.ok) throw Error(parked.message);
    loadState(parked.state);
    const kickoffs: Events['match:started'][] = [];
    bus.on('match:started', (e) => kickoffs.push(e));
    advanceWeek();
    expect(failedIntervalProblem()).toBeNull();
    expect(weekHeld()).toBe(true);
    expect(kickoffs).toHaveLength(1);
    expect(kickoffs[0]!.fixture.id).toBe(live.fixtureId);
    expect(kickoffs[0]!.live.seed).toBe(live.seed);
    // The held match is the same fixture and seed, recorded under the engine now running.
    const sidecar = bytes.get(liveMatchKey(1));
    expect(sidecar).toBeDefined();
    expect(JSON.parse(sidecar!)).toMatchObject({ fixtureId: live.fixtureId, seed: live.seed, engineId: matchEngineIdentity() });
    // On the engine it was saved under, the original sidecar is kept byte for byte.
    if (sameEngine) expect(sidecar).toBe(originalSidecar);
  }
);
