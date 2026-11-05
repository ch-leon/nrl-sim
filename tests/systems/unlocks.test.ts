import { createLegacyGame as createNewGame } from '../helpers/legacyGame';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, loadState, setState, type Fixture } from '../../src/core/state';
import { advanceWeek, clearTickHooks, registerTickHook } from '../../src/core/time';
import { bus, type Events } from '../../src/core/events';
import { FACILITY_CATALOG, type FacilityDefId } from '../../src/data/facility';
import { DIFFICULTIES, SEASON_ROUNDS, BOARD } from '../../src/config';
import { isFacilityOpen, registerUnlockSystem, unlockReason, unlocksDue } from '../../src/systems/unlocks';
import { migrateState } from '../../src/core/save';
import { generateObjectives } from '../../src/systems/board';
import { NewsInbox, initNewsInbox } from '../../src/ui/inbox';

const all = Object.keys(FACILITY_CATALOG) as FacilityDefId[];
const start: FacilityDefId[] = ['trainingPaddock', 'weightsRoom', 'canteen', 'sponsorBoard'];
const open = () => all.filter((id) => isFacilityOpen(getState(), id)).sort();
const played = (homeId: string, awayId: string, homeScore = 0, awayScore = 2): Fixture =>
  ({ round: 1, homeId, awayId, result: { homeScore, awayScore } });
beforeEach(() => { bus.clear(); clearTickHooks(); createNewGame('Test', 481); setState({ unlocks: { facilities: [...start] } }); });

describe('facility unlock ladder (#481)', () => {
  it.each(DIFFICULTIES)('walks every round of a scripted season on %s', (difficulty) => {
    createNewGame('Test', 481, { difficulty });
    const expected = [...start];
    for (let week = 1; week <= 27; week++) {
      // Away defeats until the first home game at round 3; no early reputation shortcut.
      setState({ week, league: { ...getState().league, fixtures: week > 3 ? [played('player', 'rival')] : [] } });
      if (week === 2) expected.push('videoRoom', 'physioCentre');
      if (week === 4) expected.push('coachsOffice');
      if (week === 5) expected.push('scoutOffice', 'medicalBay');
      if (week === 8) expected.push('teamGym', 'academy');
      if (week === SEASON_ROUNDS) expected.push('grandstand');
      const due = unlocksDue(getState());
      setState({ unlocks: { facilities: [...getState().unlocks!.facilities, ...due] } });
      expect(open(), `round ${week}`).toEqual([...expected].sort());
    }
  });

  it('opens Video and Physio on a first win before round 2, at home or away', () => {
    for (const f of [played('player', 'rival', 2, 0), played('rival', 'player', 0, 2)]) {
      setState({ league: { ...getState().league, fixtures: [f] } });
      expect(unlocksDue(getState())).toEqual(f.homeId === 'player' ? ['videoRoom', 'physioCentre', 'coachsOffice'] : ['videoRoom', 'physioCentre']);
    }
  });

  it('ignores unplayed fixtures, rival wins, draws and player losses for the win trigger', () => {
    for (const f of [{ round: 1, homeId: 'player', awayId: 'rival' }, played('rival', 'other', 2, 0), played('rival', 'player', 2, 2), played('rival', 'player', 2, 0)]) {
      setState({ league: { ...getState().league, fixtures: [f] } });
      expect(unlocksDue(getState())).toEqual([]);
    }
    setState({ league: { ...getState().league, fixtures: [played('player', 'rival')] } });
    expect(unlocksDue(getState())).toEqual(['coachsOffice']);
  });

  it('opens the Grandstand at reputation 40 before the last round, or the last round', () => {
    setState({ reputation: 39, week: SEASON_ROUNDS - 1 });
    expect(unlocksDue(getState())).not.toContain('grandstand');
    setState({ reputation: 40, week: 3 });
    expect(unlocksDue(getState())).toContain('grandstand');
    setState({ reputation: 39, week: SEASON_ROUNDS });
    expect(unlocksDue(getState())).toContain('grandstand');
  });

  it('is pure, deterministic and opens any remaining facilities after season one', () => {
    setState({ season: 2 });
    const s = structuredClone(getState());
    expect(unlocksDue(s)).toEqual(unlocksDue(s));
    expect(s).toEqual(getState());
    expect(unlocksDue(s).length).toBe(8);
  });

  it('announces all openings once per week in News, before autosave, and clears the completed ladder', () => {
    const notices: Events['ui:notify'][] = [];
    const inbox = new NewsInbox();
    initNewsInbox(inbox);
    bus.on('ui:notify', (n) => notices.push(n));
    registerUnlockSystem(); registerUnlockSystem(); // registering twice must not double-announce
    let savedOpen = false;
    registerTickHook('test-save', 90, () => { savedOpen = isFacilityOpen(getState(), 'videoRoom'); });
    advanceWeek();
    expect(savedOpen).toBe(true);
    expect(getState().week).toBe(2);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ from: 'coach', kind: 'info' });
    expect(notices[0]!.text).toContain('Video Room');
    expect(notices[0]!.text).toContain('Physio Centre');
    advanceWeek();
    expect(notices).toHaveLength(1);
    setState({ week: SEASON_ROUNDS - 1, league: { ...getState().league, fixtures: [played('player', 'rival')] } });
    advanceWeek();
    expect(getState().unlocks).toBeUndefined();
    expect(open()).toHaveLength(12);
    expect(notices).toHaveLength(2);
    advanceWeek();
    expect(notices).toHaveLength(2);
    expect(inbox.items()).toHaveLength(2);
    expect(inbox.items().every((n) => n.from === 'coach')).toBe(true);
    const restored = JSON.parse(JSON.stringify(getState()));
    loadState(restored); advanceWeek();
    expect(notices).toHaveLength(2);
  });

  it('clears an already complete ladder without announcing anything', () => {
    setState({ unlocks: { facilities: [...all] } });
    const notices: string[] = [];
    bus.on('ui:notify', (n) => notices.push(n.text));
    registerUnlockSystem(); advanceWeek();
    expect(getState().unlocks).toBeUndefined();
    expect(notices).toEqual([]);
  });

  it('absent means open for the veteran skip and every old save', () => {
    createNewGame('Veteran', 481, { openAll: true });
    expect(getState()).not.toHaveProperty('unlocks');
    expect(open()).toHaveLength(12);
    expect(unlocksDue(getState())).toEqual([]);
    const saves = import.meta.glob('../fixtures/saves/*.json', { eager: true, import: 'default' });
    expect(Object.keys(saves).length).toBeGreaterThan(0);
    for (const raw of Object.values(saves)) {
      const result = migrateState(raw);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.state).not.toHaveProperty('unlocks');
      expect(all.every((id) => isFacilityOpen(result.state, id))).toBe(true);
    }
  });

  it('keeps the season-one build objective reachable with the facilities open by round 8', () => {
    const s = getState();
    expect(BOARD.BUILD_TARGET_EXTRA).toBe(2);
    const objective = generateObjectives({ ...s, league: { ...s.league, clubs: [] } }).find((o) => o.kind === 'build')!;
    expect(objective.target).toBe(2);
    expect(start.length).toBeGreaterThanOrEqual(objective.target);
    setState({ week: 8, league: { ...s.league, fixtures: [played('player', 'rival')] } });
    expect(new Set([...start, ...unlocksDue(getState())]).size).toBe(11);
  });

  it('gives every closed facility its opening reason', () => {
    for (const id of all.filter((id) => !start.includes(id))) expect(unlockReason(id)).toMatch(/^Opens /);
  });
});
