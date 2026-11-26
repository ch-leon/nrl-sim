// Season-one unlocks in a League career (#831): its results live in the
// competition instances, and "round N" is the league round, not the calendar week.
import { beforeEach, describe, expect, it } from 'vitest';
import { preparePack } from '../../src/content';
import { bus, type Events } from '../../src/core/events';
import { getState, setState, type GameState } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { advanceWeek, failedIntervalProblem, weekHeld } from '../../src/core/time';
import type { CompetitionFixture } from '../../src/data/competition';
import type { FacilityDefId } from '../../src/data/facility';
import { registerAllSystems } from '../../src/qa/soak';
import { startLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { captureOpenCupEntryPreview, confirmOpenCupChoice } from '../../src/systems/openCupEntryCommit';
import { isOpenCupInstance } from '../../src/systems/openCup';
import { leagueUnlockProgress } from '../../src/systems/screenUnlocks';
import { isFacilityOpen, isScreenOpen, screenLockReason, screensDue, unlockReason, unlocksDue } from '../../src/systems/unlocks';
import { firstTieSeed, installCupTestHooks } from '../helpers/openCupCareer';

installCupTestHooks();
beforeEach(() => setCareerNamespace(null));

async function start(): Promise<void> {
  await preparePack('au');
  const result = await startLeagueCareer({ clubName: 'Rovers', seed: firstTieSeed() });
  if (!result.ok) throw Error(result.message);
  const s = getState();
  const preview = previewLeagueEntry(s, s.competitions!.world!.divisions[0]!.id);
  if (!preview.ok) throw Error(preview.message);
  const entered = confirmLeagueEntry(preview.preview);
  if (!entered.ok) throw Error(entered.message);
  const offer = captureOpenCupEntryPreview();
  if (!offer.ok) throw Error(offer.message);
  const cup = confirmOpenCupChoice({ ...offer.preview, choice: 'enter' });
  if (!cup.ok) throw Error(cup.message);
}

/** One calendar week; the player's match, if any, is won 24-0. */
function play(): void {
  const before = getState();
  let match: Events['match:started'] | undefined;
  const off = bus.on('match:started', (m) => { match = m; });
  advanceWeek();
  off();
  if (match) {
    const homeWins = match.fixture.homeId === before.clubId;
    bus.emit('match:finished', { fixture: match.fixture, result: {
      homeScore: homeWins ? 24 : 0, awayScore: homeWins ? 0 : 24, events: [], injuries: [],
      stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] }, weather: 'clear', momentumTimeline: [],
    } });
  }
  expect(failedIntervalProblem()).toBeNull();
  expect(weekHeld()).toBe(false);
}

const instances = (s: GameState) => s.competitions!.instances.filter((i) => i.season === s.season);
const mine = (s: GameState, f: CompetitionFixture) => f.homeId === s.clubId || f.awayId === s.clubId;
const isTrial = (s: GameState, f: CompetitionFixture) =>
  instances(s).find((i) => i.id === f.competitionId)!.definition.id.endsWith(':trials');
/** The player's regular-season league fixtures, in round order. */
function leagueFixtures(s: GameState): CompetitionFixture[] {
  return instances(s).flatMap((i) => i.fixtures)
    .filter((f) => mine(s, f) && !isTrial(s, f) && f.stageId === instances(s).find((i) => i.id === f.competitionId)!.definition.stages[0]!.id
      && instances(s).find((i) => i.id === f.competitionId)!.definition.stages[0]!.kind === 'league')
    .sort((a, b) => a.round - b.round);
}
const open = (id: FacilityDefId) => isFacilityOpen(getState(), id);

describe('League career season-one unlocks (#831)', () => {
  it('opens every row from League results: home game, first win, league rounds and the last round', async () => {
    await start();
    const s0 = getState();
    expect(s0.competitions!.leagueCareer).toBeDefined();
    expect(s0.league.fixtures).toEqual([]);
    expect(s0.unlocks).toEqual({ facilities: ['trainingPaddock', 'weightsRoom', 'canteen', 'sponsorBoard'], screens: [] });
    const rounds = leagueFixtures(s0);
    expect(rounds.map((f) => f.round)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(rounds[0]!.slot).toBe(5); // league round 1 is calendar week 5
    /** Week after which "round N" items are due: league round N-1 has been played. */
    const dueAfter = (n: number) => rounds[n - 2]!.slot!;
    registerAllSystems();

    // Each row by its league round. Reputation is held under 40 so the Grandstand
    // can only open on the round rule.
    const rows: [string, () => boolean, number][] = [
      ['videoRoom', () => open('videoRoom') && open('physioCentre'), 2],
      ['staff', () => isScreenOpen(getState(), 'staff'), 4],
      ['scoutOffice', () => open('scoutOffice') && open('medicalBay'), 5],
      ['teamGym', () => open('teamGym') && open('academy'), 8],
      ['contracts', () => isScreenOpen(getState(), 'contracts'), 12],
      ['grandstand', () => open('grandstand'), 14],
    ];
    let homeWeek: number | undefined;
    let sawHomeTrial = false;
    // Through the first finals week; the season close then waits on a league choice.
    for (let week = 1; week <= 24; week++) {
      expect(getState().week).toBe(week);
      play();
      expect(getState().week).toBe(week + 1);
      setState({ reputation: Math.min(getState().reputation, 39) });
      const s = getState();
      const played = instances(s).flatMap((i) => i.fixtures).filter((f) => mine(s, f) && f.status === 'completed' && f.slot === week);
      if (played.some((f) => f.homeId === s.clubId && isTrial(s, f))) sawHomeTrial = true;
      if (homeWeek === undefined && played.some((f) => f.homeId === s.clubId && !isTrial(s, f))) homeWeek = week;
      // The first home game outside the trials opens the Coach's Office and Finance.
      const home = homeWeek !== undefined;
      expect(open('coachsOffice'), `Coach's Office after week ${week}`).toBe(home);
      expect(isScreenOpen(s, 'finance'), `Finance after week ${week}`).toBe(home);
      // Every round row is open before its league round is played, and not before the round ahead of it.
      for (const [name, isOpen, n] of rows) expect(isOpen(), `${name} after week ${week}`).toBe(week >= dueAfter(n));
      if (week === rounds[13]!.slot) expect(leagueUnlockProgress(s)!.round).toBe(15);
    }
    expect(sawHomeTrial).toBe(true); // a home trial was played and did not count
    expect(homeWeek).toBeDefined();
    expect(homeWeek!).toBeGreaterThanOrEqual(5);
  }, 90000);

  it('counts a first win or home game in the Open Cup, but never in the trials', async () => {
    await start();
    const s = getState();
    const trial = instances(s).flatMap((i) => i.fixtures).find((f) => isTrial(s, f) && f.homeId === s.clubId)!;
    const finish = (state: GameState, fixture: CompetitionFixture): GameState => ({ ...state, competitions: { ...state.competitions!,
      instances: state.competitions!.instances.map((i) => i.id !== fixture.competitionId ? i : { ...i, status: 'active',
        fixtures: i.fixtures.map((f) => f.id !== fixture.id ? f : { ...f, status: 'completed',
          result: { homeScore: f.homeId === s.clubId ? 24 : 0, awayScore: f.homeId === s.clubId ? 0 : 24, winnerId: s.clubId, decider: 'score' } }) }) } });
    const afterTrial = finish(s, trial);
    expect(leagueUnlockProgress(afterTrial)).toMatchObject({ home: false, win: false, round: 1, regularRounds: 14 });
    expect(unlocksDue(afterTrial)).toEqual([]);
    expect(screensDue(afterTrial)).toEqual([]);

    // The cup is drawn later in the year; graft its first tie onto the pre-round-1 state.
    registerAllSystems();
    const cupOf = () => getState().competitions!.instances.find((i) => i.season === 1 && isOpenCupInstance(i)
      && i.fixtures.some((f) => mine(getState(), f) && f.status === 'scheduled'));
    for (let week = 1; week <= 12 && !cupOf(); week++) play();
    const cup = structuredClone(cupOf()!);
    const cupTie = cup.fixtures.find((f) => mine(s, f) && f.status === 'scheduled')!;
    const withCup: GameState = { ...afterTrial, competitions: { ...afterTrial.competitions!,
      instances: [...afterTrial.competitions!.instances.filter((i) => i.id !== cup.id), cup] } };
    expect(leagueUnlockProgress(withCup)).toMatchObject({ home: false, win: false, round: 1 });
    const afterCup = finish(withCup, cupTie);
    const home = cupTie.homeId === s.clubId;
    expect(leagueUnlockProgress(afterCup)).toMatchObject({ home, win: true, round: 1 });
    expect(unlocksDue(afterCup)).toEqual(home ? ['videoRoom', 'physioCentre', 'coachsOffice'] : ['videoRoom', 'physioCentre']);
    expect(screensDue(afterCup)).toEqual(home ? ['finance'] : []);
    // The calendar week does not move a League ladder: week 25 is still before round 1 here.
    expect(screensDue({ ...afterTrial, week: 25 }, 26)).toEqual([]);
    expect(unlocksDue({ ...afterTrial, week: 25 })).toEqual([]);
    expect(unlocksDue({ ...afterTrial, reputation: 40 })).toEqual(['grandstand']);
  });

  it('names league rounds and the trials in its lock reasons', async () => {
    await start();
    const s = getState();
    expect(screenLockReason(s, 'finance')).toBe('Opens after your first home game once the trials are done');
    expect(screenLockReason(s, 'staff')).toBe('Opens at league round 4');
    expect(screenLockReason(s, 'contracts')).toBe('Opens at league round 12');
    expect(unlockReason('coachsOffice', s)).toBe('Opens after your first home game once the trials are done');
    expect(unlockReason('videoRoom', s)).toBe('Opens at league round 2, or after your first win once the trials are done');
    expect(unlockReason('scoutOffice', s)).toBe('Opens at league round 5');
    expect(unlockReason('teamGym', s)).toBe('Opens at league round 8');
    expect(unlockReason('grandstand', s)).toBe('Opens at league round 14, or reputation 40');
  });
});
