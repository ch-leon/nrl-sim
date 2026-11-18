import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, loadState, type GameState } from '../../../src/core/state';
import { previewLeagueEntry, type LeagueEntryPreview } from '../../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../../src/systems/leagueEntryCommit';
import { closeModal } from '../../../src/ui/dom';
import { openLeagueSelection } from '../../../src/ui/screens/leagueSelection';
import { competitions, progress } from '../../data/leagueCareerFixtures';
import { stubDocument, type StubNode } from '../stubDom';

// Exercise the dialog's actual DOM and events with independently controlled
// quotes and commit outcomes. The entry engine and store own their own tests.
vi.mock('../../../src/systems/leagueEntry', () => ({ previewLeagueEntry: vi.fn() }));
vi.mock('../../../src/systems/leagueEntryCommit', () => ({ confirmLeagueEntry: vi.fn() }));

const preview = vi.mocked(previewLeagueEntry);
const confirm = vi.mocked(confirmLeagueEntry);
let state: GameState;
let local: LeagueEntryPreview;
let championship: LeagueEntryPreview;
let premier: LeagueEntryPreview;

function open(onConfirmed?: (confirmed: GameState) => void): StubNode {
  return openLeagueSelection(onConfirmed ? { onConfirmed } : {}) as unknown as StubNode;
}

const part = (dialog: StubNode, name: string): StubNode => dialog.querySelector(`[data-nrl-league-${name}]`)!;
const choice = (dialog: StubNode, id: string): StubNode => dialog.querySelector(`[data-nrl-league-choice="${id}"]`)!;

beforeEach(() => {
  stubDocument();
  vi.resetAllMocks();
  const career = competitions(1, false);
  career.leagueCareer = progress();
  const [lower, middle, upper] = career.world!.divisions;
  const definition = career.instances[0]!.definition;
  state = {
    ...createNewGame('Seabirds', 573),
    competitions: career,
    league: {
      ladder: [], fixtures: [],
      clubs: [
        { id: 'player', name: 'Seabirds', strength: 40, colors: ['#333', '#fff'] },
        { id: 'rival-a', name: 'Saltbush', strength: 45, colors: ['#333', '#fff'] },
        { id: 'rival-b', name: 'Bellbirds', strength: 62, colors: ['#333', '#fff'] },
      ],
    },
  };
  loadState(state);
  local = {
    leagueId: lower!.id, leagueName: lower!.name, currentLeagueId: lower!.id, rank: 0, requirement: null,
    eligible: true, phase: 'initial-choice', sourceSeason: 1, targetSeason: 1, sourceCloseId: null,
    evidence: null, previewKey: 'local-v1', fieldIds: ['player', 'rival-a'], movements: [],
    definition, slots: career.calendar!.slots, trialSlots: [1, 2], strength: { min: 45, mean: 45, max: 45 },
    quote: { definitionInstanceId: lower!.instanceId, opponents: [{ clubId: 'rival-a', strength: 45 }],
      commitments: [{
        clubId: 'player', capacityBasis: 'retained-tier-v1', tier: 'championship', previousTier: 'championship',
        baseCap: 450_000, purchasedLevel: 1, purchasedAddition: 22_500, earnedBasisPoints: 500, earnedAddition: 22_500,
        cap: 495_000, years: [
          { season: 1, committed: 499_000, cap: 495_000, protectedAmount: 12_000, protectedExcess: 4_000, unprotectedExcess: 0 },
          { season: 2, committed: 80_000, cap: 495_000, protectedAmount: 0, protectedExcess: 0, unprotectedExcess: 0 },
        ],
      }],
    },
  };
  championship = {
    ...local, leagueId: middle!.id, leagueName: middle!.name, rank: 1, eligible: false, previewKey: 'championship-v1',
    requirement: { leagueId: local.leagueId, leagueName: local.leagueName }, fieldIds: ['rival-b'],
    strength: { min: 62, mean: 62, max: 62 },
    quote: { definitionInstanceId: middle!.instanceId, opponents: [{ clubId: 'rival-b', strength: 62 }], commitments: local.quote.commitments },
  };
  premier = {
    ...championship, leagueId: upper!.id, leagueName: upper!.name, rank: 2, previewKey: 'premier-v1',
    requirement: { leagueId: championship.leagueId, leagueName: championship.leagueName },
  };
  preview.mockImplementation((_state, id) => ({
    ok: true,
    preview: [local, championship, premier].find(league => league.leagueId === id)!,
  }));
});

afterEach(() => {
  closeModal();
  vi.unstubAllGlobals();
});

describe('League selection dialog', () => {
  it('shows the field, saved calendar, cap and all signed seasons for the current preview', () => {
    const dialog = open();
    const detail = part(dialog, 'detail');
    expect(choice(dialog, local.leagueId).getAttribute('aria-pressed')).toBe('true');
    expect(choice(dialog, local.leagueId).words()).toContain('Current');
    expect(detail.words()).toMatch(/Nines.*9 a side/);
    expect(detail.words()).toContain('Weeks 3–4');
    expect(detail.words()).toContain('Week 5');
    expect(detail.words()).toContain('Weeks 1–2');
    expect(detail.words()).toContain('Minor premiership');
    expect(detail.words()).toContain('unlocks Championship permanently');
    expect(part(dialog, 'field').words()).toMatch(/Seabirds.*Saltbush.*45/);
    expect(part(dialog, 'field').words()).toMatch(/45 low.*45 average.*45 high/);
    expect(part(dialog, 'finance').words()).toMatch(/\$450,000.*\$22,500.*\$22,500.*\$495,000/);
    expect(part(dialog, 'finance').words()).toMatch(/Season 1.*\$499,000.*\$12,000.*\$4,000/);
    expect(part(dialog, 'finance').words()).toMatch(/Season 2.*\$80,000/);
    expect(part(dialog, 'finance').words()).toContain('keeps its salary cap when moving down');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('lets the coach inspect a locked choice but refuses confirmation and keeps the save unchanged', () => {
    const original = JSON.stringify(state);
    const dialog = open();
    choice(dialog, championship.leagueId).click();

    expect(choice(dialog, championship.leagueId).getAttribute('aria-pressed')).toBe('true');
    expect(choice(dialog, local.leagueId).getAttribute('aria-pressed')).toBe('false');
    expect(choice(dialog, championship.leagueId).words()).toContain('Locked');
    expect(part(dialog, 'selection-status').textContent).toContain('Win the Local League finals title');
    expect(part(dialog, 'field').words()).toContain('Current Championship clubs');
    expect(part(dialog, 'field').words()).toContain('Bellbirds');
    expect(part(dialog, 'field').words()).not.toContain('Seabirds');
    expect(part(dialog, 'confirm').getAttribute('aria-disabled')).toBe('true');
    part(dialog, 'confirm').click();
    expect(confirm).not.toHaveBeenCalled();
    closeModal();
    expect(JSON.stringify(getState())).toBe(original);
    expect(choice(open(), local.leagueId).getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['championship', 'premier'])('shows hypothetical club finances for locked initial %s without adding the club to its field', league => {
    const target = league === 'championship' ? championship : premier;
    const dialog = open();
    choice(dialog, target.leagueId).click();

    expect(part(dialog, 'finance').words()).toContain('Hypothetical cap and commitments if eligible');
    expect(part(dialog, 'finance').words()).toMatch(/Annual cap.*\$495,000/);
    expect(part(dialog, 'finance').words()).toMatch(/Season 1.*\$499,000.*Season 2.*\$80,000/);
    expect(part(dialog, 'field').words()).not.toContain('Seabirds');
    expect(part(dialog, 'confirm').getAttribute('aria-disabled')).toBe('true');
  });

  it('describes a saved season without finals without promising a title or adjacent unlock', () => {
    const definition = structuredClone(local.definition);
    if (definition.format.kind !== 'league') throw new Error('Expected league fixture');
    definition.format.finalsSize = 0;
    definition.stages = definition.stages.filter(stage => stage.kind !== 'knockout');
    local = { ...local, definition };
    const dialog = open();

    expect(part(dialog, 'format').words()).toContain('No finals');
    expect(part(dialog, 'rewards').words()).toContain('Minor premiership');
    expect(part(dialog, 'rewards').words()).toContain('No finals are scheduled, so no league title can be earned.');
    expect(part(dialog, 'rewards').words()).toContain('Championship cannot be unlocked through this season');
    expect(part(dialog, 'rewards').words()).not.toContain('finals winner earns');
    expect(part(dialog, 'rewards').words()).not.toContain('unlocks Championship permanently');
    expect(part(dialog, 'confirm').getAttribute('aria-disabled')).toBe('false');
  });

  it('uses the saved source definition for locked reasons even when that league preview is unavailable', () => {
    const source = state.competitions!.instances.find(instance => instance.id === state.competitions!.world!.divisions[0]!.instanceId)!;
    if (source.definition.format.kind !== 'league') throw new Error('Expected league fixture');
    source.definition.format.finalsSize = 0;
    source.definition.stages = source.definition.stages.filter(stage => stage.kind !== 'knockout');
    loadState(state);
    preview.mockImplementation((_, id) => id === local.leagueId
      ? { ok: false, reason: 'invalid', message: 'Signed commitments exceed available club capacity.' }
      : { ok: true, preview: id === championship.leagueId ? championship : premier });
    const dialog = open();
    choice(dialog, championship.leagueId).click();

    expect(part(dialog, 'selection-status').textContent).toContain('Local League has no finals scheduled');
    expect(part(dialog, 'selection-status').textContent).toContain('cannot unlock this league');
    expect(part(dialog, 'selection-status').textContent).not.toContain('Win the Local League finals title');
  });

  it('shows the permanent annual unlock and AI movement and asks again after a stale preview', () => {
    local = { ...local, phase: 'next-season-choice', targetSeason: 2 };
    championship = {
      ...championship, phase: 'next-season-choice', targetSeason: 2, eligible: true, fieldIds: ['player', 'rival-b'],
      evidence: {
        season: 1, leagueId: local.leagueId, targetLeagueId: championship.leagueId, instanceId: 'league-one',
        finalFixtureId: 'final-one', homeId: 'player', awayId: 'rival-a',
        result: { homeScore: 12, awayScore: 6, winnerId: 'player', decider: 'score' },
      },
      movements: [{ clubId: 'rival-b', fromLeagueId: championship.leagueId, toLeagueId: local.leagueId }],
      quote: { ...championship.quote, commitments: [{
        ...local.quote.commitments[0]!, previousTier: 'local',
        years: local.quote.commitments[0]!.years.map(year => ({ ...year, season: year.season + 1 })),
      }] },
    };
    const accepted = { ...state, season: 2 };
    confirm
      .mockImplementationOnce(() => {
        championship = {
          ...championship, previewKey: 'championship-v2', strength: { min: 65, mean: 65, max: 65 },
          quote: { ...championship.quote, opponents: [{ clubId: 'rival-b', strength: 65 }] },
        };
        return { ok: false, reason: 'stale', message: 'This League quote has changed.' };
      })
      .mockReturnValueOnce({ ok: true, state: accepted });
    const onConfirmed = vi.fn();
    const dialog = open(onConfirmed);
    expect(part(dialog, 'detail').words()).toContain('Championship is already unlocked permanently.');
    choice(dialog, championship.leagueId).click();
    expect(part(dialog, 'detail').words()).toContain('Permanently unlocked by your Season 1 Local League finals title');
    expect(part(dialog, 'detail').words()).toContain('Training, retirements and recruitment');
    expect(part(dialog, 'movements').words()).toMatch(/Bellbirds.*Championship.*Local League/);
    expect(part(dialog, 'finance').words()).toContain('Current cap');
    expect(confirm).not.toHaveBeenCalled();

    const button = part(dialog, 'confirm');
    button.click();
    expect(confirm).toHaveBeenNthCalledWith(1, { leagueId: championship.leagueId, previewKey: 'championship-v1' });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(dialog.isConnected).toBe(true);
    expect(part(dialog, 'selection-status').textContent).toContain('confirm again');
    expect(part(dialog, 'field').words()).toContain('65 average');

    button.click();
    expect(confirm).toHaveBeenNthCalledWith(2, { leagueId: championship.leagueId, previewKey: 'championship-v2' });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed).toHaveBeenCalledWith(accepted);
    expect(dialog.isConnected).toBe(false);
  });

  it('keeps save failures in the dialog and allows deliberate retry', () => {
    const onConfirmed = vi.fn();
    confirm
      .mockReturnValueOnce({ ok: false, reason: 'storage', message: 'Could not save your league choice.' })
      .mockReturnValueOnce({ ok: true, state });
    const dialog = open(onConfirmed);
    part(dialog, 'confirm').click();
    expect(part(dialog, 'selection-status').textContent).toContain('Could not save your league choice.');
    expect(dialog.isConnected).toBe(true);
    expect(onConfirmed).not.toHaveBeenCalled();
    part(dialog, 'confirm').click();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed).toHaveBeenCalledWith(state);
  });

  it('keeps a financial refusal reachable while another league preview is available', () => {
    preview.mockImplementation((_, id) => id === local.leagueId
      ? { ok: false, reason: 'invalid', message: 'Signed commitments exceed available club capacity.' }
      : { ok: true, preview: id === championship.leagueId ? championship : premier });
    const dialog = open();
    expect(choice(dialog, local.leagueId).getAttribute('aria-pressed')).toBe('true');
    expect(part(dialog, 'selection-status').textContent).toContain('Signed commitments exceed available club capacity.');
    expect(part(dialog, 'confirm').getAttribute('aria-disabled')).toBe('true');
    part(dialog, 'confirm').click();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('removes registration controls once the career already has a confirmed league', () => {
    preview.mockReturnValue({ ok: false, reason: 'unavailable', message: 'This season already has a league.' });
    const dialog = open();
    expect(dialog.querySelector('[data-nrl-league-choice]')).toBeNull();
    expect(dialog.querySelector('[data-nrl-league-confirm]')).toBeNull();
    expect(part(dialog, 'selection-status').textContent).toContain('This season already has a league.');
  });
});
