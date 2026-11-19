import { bus } from '../core/events';
import { getActiveSlot } from '../core/save';
import { getState, stateInstallation } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { advanceWeek, failedIntervalProblem } from '../core/time';
import { awaitingCampReplay } from '../systems/parkedLeagueFixture';
import { dueIndividualChallenge } from '../systems/individualChallenges';
import { acknowledgeChallengeOutcome, challengeOutcomeVisible } from '../systems/individualChallengeCommit';
import { button, el, ensureStyles } from './dom';
import { ROTATE_ON_CLASS } from './orientation';

const RESUMING = 'Resuming your saved match…';

/** Protect the parked checkpoint until the game can take ownership of it again. */
export function showAssignmentRecovery(backToTitle: () => void): (() => void) | null {
  const state = getState();
  if (!awaitingCampReplay(state)) return null;
  const installation = stateInstallation();
  const slot = getActiveSlot();
  const namespace = careerNamespace();
  const owns = (): boolean => stateInstallation() === installation && getActiveSlot() === slot && careerNamespace() === namespace;
  const atCheckpoint = (): boolean => getState().season === state.season && getState().week === state.week;
  let mounted = true;
  let ready = false;
  let resuming = false;
  let failure = '';

  ensureStyles();
  ensureRecoveryStyles();
  const previous = document.activeElement;
  const locked = [document.getElementById('game-root'), document.getElementById('ui-root')]
    .filter((root): root is HTMLElement => !!root && !root.hasAttribute('inert'));
  const retry = button('Retry match', () => void resume(), { class: 'nrl-btn-primary' });
  retry.setAttribute('data-camp-recovery-retry', '');
  const exit = button('Back to title', () => {
    if (isCurrent()) backToTitle();
  });
  exit.setAttribute('data-camp-recovery-exit', '');
  const status = el('p', { text: RESUMING, attrs: { role: 'status', 'data-camp-recovery-status': '' } });
  const overlay = el('div', { class: 'nrl-camp-recovery', attrs: { 'data-camp-recovery': '' } },
    el('section', { class: 'nrl-camp-recovery-card', attrs: {
      role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nrl-camp-recovery-title',
    } },
    el('h2', { text: 'Saved match', attrs: { id: 'nrl-camp-recovery-title' } }),
    status, el('div', { class: 'nrl-camp-recovery-actions' }, exit, retry)));

  function refresh(): void {
    status.textContent = resuming ? RESUMING : failure || RESUMING;
    retry.hidden = !failure;
    retry.disabled = !ready || resuming;
  }

  async function resume(): Promise<void> {
    if (!ready || resuming || !isCurrent()) return;
    const blocked = failedIntervalProblem();
    if (blocked) {
      failure = blocked;
      refresh();
      return;
    }
    if (!awaitingCampReplay(getState())) {
      failure = 'The saved match record is unavailable. Reopen the career from the title screen to recover.';
      refresh();
      return;
    }
    resuming = true;
    const previousFailure = failure;
    failure = '';
    refresh();
    try {
      const contest = dueIndividualChallenge(getState());
      if (contest?.status === 'ready-for-interval' && !challengeOutcomeVisible(getState(), contest.editionId)) {
        const confirmed = await acknowledgeChallengeOutcome(contest.editionId);
        if (!isCurrent()) return;
        if (!confirmed.ok) failure = confirmed.message;
      }
      if (!failure) advanceWeek();
    } catch (error) {
      console.error('nrl-sim: could not restart the saved match', error);
      failure = 'The saved match could not be resumed. Try again or return to the title screen.';
    }
    resuming = false;
    if (!isCurrent()) return;
    if (!failure && !awaitingCampReplay(getState())) {
      remove();
      return;
    }
    failure ||= previousFailure || 'The saved match could not be resumed. Try again or return to the title screen.';
    refresh();
    retry.focus();
  }

  function isCurrent(): boolean {
    if (mounted && (!owns() || !atCheckpoint())) remove();
    return mounted;
  }

  function trap(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    if (document.documentElement.classList.contains(ROTATE_ON_CLASS)) return;
    const other = !retry.hidden && !retry.disabled && document.activeElement === exit ? retry : exit;
    other.focus();
  }

  const off = [
    bus.on('state:changed', () => { isCurrent(); }),
    bus.on('match:started', () => { if (isCurrent()) remove(); }),
    bus.on('week:blocked', ({ season, week, reason }) => {
      if (!isCurrent() || season !== state.season || week !== state.week) return;
      failure = reason;
      if (!resuming) refresh();
    }),
  ];

  function remove(): void {
    if (!mounted) return;
    mounted = false;
    for (const stop of off) stop();
    document.removeEventListener('keydown', trap, true);
    overlay.remove();
    for (const root of locked) root.removeAttribute('inert');
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  }

  refresh();
  for (const root of locked) root.setAttribute('inert', '');
  document.body.append(overlay);
  document.addEventListener('keydown', trap, true);
  if (!document.documentElement.classList.contains(ROTATE_ON_CLASS)) exit.focus();
  return () => {
    if (ready || !isCurrent()) return;
    ready = true;
    void resume();
  };
}

function ensureRecoveryStyles(): void {
  const id = 'nrl-camp-recovery-style';
  if (document.getElementById(id)) return;
  const style = el('style', { text: `
.nrl-camp-recovery {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: calc(12px + var(--nrl-safe-t, 0px)) calc(12px + var(--nrl-safe-r, 0px))
    calc(12px + var(--nrl-safe-b, 0px)) calc(12px + var(--nrl-safe-l, 0px));
  background: var(--nrl-navy);
  color: var(--nrl-text);
}
html.${ROTATE_ON_CLASS} .nrl-camp-recovery { visibility: hidden; }
.nrl-camp-recovery-card {
  box-sizing: border-box;
  width: min(440px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid var(--nrl-line);
  border-radius: 12px;
  background: var(--nrl-raised);
  overflow-wrap: anywhere;
}
.nrl-camp-recovery-card h2 { margin: 0; font-size: 1.125rem; }
.nrl-camp-recovery-card p { margin: 8px 0 12px; line-height: 1.4; }
.nrl-camp-recovery-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.nrl-camp-recovery .nrl-btn { min-width: 44px; min-height: 44px; white-space: normal; }
.nrl-camp-recovery [hidden] { display: none; }
` });
  style.id = id;
  document.head.append(style);
}
