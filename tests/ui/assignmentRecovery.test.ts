import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/events';
import { setActiveSlot } from '../../src/core/save';
import { createNewGame, getState, loadState } from '../../src/core/state';
import { advanceWeek } from '../../src/core/time';
import { awaitingCampReplay } from '../../src/systems/parkedLeagueFixture';
import { showAssignmentRecovery } from '../../src/ui/assignmentRecovery';
import { dueIndividualChallenge } from '../../src/systems/individualChallenges';
import { acknowledgeChallengeOutcome, challengeOutcomeVisible } from '../../src/systems/individualChallengeCommit';
import { StubNode, stubDocument } from './stubDom';

vi.mock('../../src/core/time', async original => ({
  ...await original<typeof import('../../src/core/time')>(), advanceWeek: vi.fn(),
}));
vi.mock('../../src/systems/parkedLeagueFixture', async original => ({
  ...await original<typeof import('../../src/systems/parkedLeagueFixture')>(), awaitingCampReplay: vi.fn(),
}));
vi.mock('../../src/systems/individualChallenges', async original => ({
  ...await original<typeof import('../../src/systems/individualChallenges')>(), dueIndividualChallenge: vi.fn(() => null),
}));
vi.mock('../../src/systems/individualChallengeCommit', async original => ({
  ...await original<typeof import('../../src/systems/individualChallengeCommit')>(),
  acknowledgeChallengeOutcome: vi.fn(), challengeOutcomeVisible: vi.fn(() => true),
}));

function element(id: string): HTMLElement {
  const node = document.createElement('div');
  node.id = id;
  document.body.append(node);
  return node;
}

const by = (attr: string) => document.querySelector(`[data-camp-recovery${attr}]`) as unknown as StubNode | null;

beforeEach(() => {
  bus.clear();
  vi.clearAllMocks();
  vi.mocked(dueIndividualChallenge).mockReturnValue(null);
  vi.mocked(challengeOutcomeVisible).mockReturnValue(true);
  vi.stubGlobal('HTMLElement', StubNode);
  stubDocument();
  createNewGame('Recovery FC', 708);
  setActiveSlot(1);
  vi.mocked(awaitingCampReplay).mockReturnValue(true);
});

afterEach(() => {
  bus.clear();
  vi.unstubAllGlobals();
});

it('covers only a career with a parked camper on its checkpoint', () => {
  const behind = element('ui-root');
  vi.mocked(awaitingCampReplay).mockReturnValue(false);
  expect(showAssignmentRecovery(vi.fn())).toBeNull();
  expect(by('')).toBeNull();
  expect(behind.hasAttribute('inert')).toBe(false);
});

it('waits for game readiness and keeps the reason and controls visible after a blocked checkpoint', () => {
  const behind = element('ui-root');
  const game = element('game-root');
  game.setAttribute('inert', '');
  const previous = document.createElement('button');
  behind.append(previous);
  Object.assign(document, { activeElement: previous });
  const returnFocus = vi.spyOn(previous, 'focus');
  const reason = 'The start of the week could not be confirmed in its save slot. Retry the advance.';
  const { season, week } = getState();
  vi.mocked(advanceWeek).mockImplementationOnce(() => bus.emit('week:blocked', { season, week, reason }));
  vi.mocked(advanceWeek).mockImplementationOnce(() => {
    vi.mocked(awaitingCampReplay).mockReturnValue(false);
    bus.emit('state:changed', getState());
  });
  const ready = showAssignmentRecovery(vi.fn())!;
  expect(by('-status')?.textContent).toBe('Resuming your saved match…');
  expect(advanceWeek).not.toHaveBeenCalled();
  expect(behind.hasAttribute('inert')).toBe(true);
  ready();
  expect(by('-status')?.textContent).toBe(reason);
  expect(by('-retry')?.disabled).toBe(false);
  by('-retry')!.click();
  expect(advanceWeek).toHaveBeenCalledTimes(2);
  expect(by('')).toBeNull();
  expect(behind.hasAttribute('inert')).toBe(false);
  expect(game.hasAttribute('inert')).toBe(true);
  expect(returnFocus).toHaveBeenCalledOnce();
});

it('opens the title through the supplied callback and prevents retired callbacks from acting', () => {
  const exit = vi.fn();
  const ready = showAssignmentRecovery(exit)!;
  const close = by('-exit')!;
  close.click();
  expect(exit).toHaveBeenCalledOnce();
  loadState({ ...getState() });
  expect(by('')).toBeNull();
  ready();
  close.click();
  expect(advanceWeek).not.toHaveBeenCalled();
  expect(exit).toHaveBeenCalledOnce();
});

it('never resumes a different slot from a deferred readiness callback', () => {
  const ready = showAssignmentRecovery(vi.fn())!;
  setActiveSlot(2);
  ready();
  expect(advanceWeek).not.toHaveBeenCalled();
  expect(by('')).toBeNull();
});

it('waits for native outcome confirmation before replay, and keeps a failed attempt retryable', async () => {
  const record = { status: 'ready-for-interval', editionId: 'showground' } as NonNullable<ReturnType<typeof dueIndividualChallenge>>;
  vi.mocked(dueIndividualChallenge).mockReturnValue(record);
  vi.mocked(challengeOutcomeVisible).mockReturnValue(false);
  let finish!: (value: Awaited<ReturnType<typeof acknowledgeChallengeOutcome>>) => void;
  vi.mocked(acknowledgeChallengeOutcome).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const ready = showAssignmentRecovery(vi.fn())!;
  ready();
  expect(acknowledgeChallengeOutcome).toHaveBeenCalledWith('showground');
  expect(advanceWeek).not.toHaveBeenCalled();
  finish({ ok: false, reason: 'native', message: 'Retry device confirmation.' });
  await Promise.resolve();
  expect(by('-status')?.textContent).toBe('Retry device confirmation.');
  expect(by('-retry')?.disabled).toBe(false);
  vi.mocked(acknowledgeChallengeOutcome).mockResolvedValueOnce({ ok: true, state: getState() });
  vi.mocked(advanceWeek).mockImplementationOnce(() => vi.mocked(awaitingCampReplay).mockReturnValue(false));
  by('-retry')!.click();
  await Promise.resolve();
  expect(advanceWeek).toHaveBeenCalledOnce();
  expect(by('')).toBeNull();
});

it('does not replay another career when native confirmation arrives late', async () => {
  vi.mocked(dueIndividualChallenge).mockReturnValue({ status: 'ready-for-interval', editionId: 'showground' } as NonNullable<ReturnType<typeof dueIndividualChallenge>>);
  vi.mocked(challengeOutcomeVisible).mockReturnValue(false);
  let finish!: (value: Awaited<ReturnType<typeof acknowledgeChallengeOutcome>>) => void;
  vi.mocked(acknowledgeChallengeOutcome).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  showAssignmentRecovery(vi.fn())!();
  setActiveSlot(2);
  finish({ ok: true, state: getState() });
  await Promise.resolve();
  expect(advanceWeek).not.toHaveBeenCalled();
  expect(by('')).toBeNull();
});
