import { getState, type GameState } from '../../core/state';
import { isExecutableCompetitionRewardPolicy, type CompetitionInstance } from '../../data/competition';
import type { OpenCupOffer } from '../../data/openCupEntry';
import { leagueFixtureView } from '../../systems/leagueSeasonView';
import { isOpenCupInstance, openCupByes } from '../../systems/openCup';
import {
  captureOpenCupEntryPreview, confirmOpenCupChoice, confirmOpenCupWithdrawal,
  type OpenCupEntryConfirmationResult,
} from '../../systems/openCupEntryCommit';
import type { OpenCupEntryPreview } from '../../systems/openCupEntry';
import { button, closeModal, el, openModal } from '../dom';

type Offer = Omit<OpenCupOffer, 'draw'>;
type Action = 'enter' | 'decline' | 'withdraw' | 'confirm-withdrawal' | 'cancel-withdrawal';

const choiceLabel = { unanswered: 'No decision yet', enter: 'Entered', decline: 'Declined' } as const;
const NEXT_OFFER = 'A fresh offer follows next season’s league choice.';

function cupInstance(state: GameState, offer: Offer): CompetitionInstance | undefined {
  return state.competitions?.instances.find(instance => instance.id === offer.instanceId ||
    (offer.resolution === 'legacy-cup' && instance.season === offer.season && isOpenCupInstance(instance)));
}

function cupStatus(state: GameState, offer: Offer, cup: CompetitionInstance | undefined): string {
  if (offer.resolution === 'legacy-window-missed') return 'Entry window missed';
  if (offer.resolution === 'legacy-cup') return 'Cup from an earlier save';
  if (offer.lifecycle === 'open') return choiceLabel[offer.choice];
  if (offer.withdrawal?.fulfilled) return 'Withdrawn';
  if (offer.withdrawal) return 'Withdrawal queued';
  if (offer.resolution === 'declined') return 'Registration closed · Declined';
  if (offer.resolution === 'expired') return 'Registration closed · No decision';
  if (cup?.winnerId === state.clubId) return 'Open Cup champions';
  if (cup?.fixtures.some(f => f.result && (f.homeId === state.clubId || f.awayId === state.clubId) && f.result.winnerId !== state.clubId)) {
    return 'Eliminated';
  }
  if (cup?.status === 'completed') return 'Cup complete';
  if (cup?.status === 'withdrawn') return 'Cup closed';
  return 'Registration closed · Entered';
}

export function buildOpenCupCard(state: GameState, findOpener: () => HTMLElement | null): HTMLElement | null {
  const offer = state.competitions?.openCupEntry?.current;
  if (!offer || state.competitions?.leagueCareer?.phase === 'initial-choice') return null;
  ensureCupStyles();
  const open = button('Cup details', () => openOpenCupEntry(findOpener));
  open.setAttribute('data-open-cup-details', '');
  open.setAttribute('aria-haspopup', 'dialog');
  return el('section', { class: 'nrl-cup-card', attrs: { 'data-open-cup-card': '', 'aria-label': offer.definition.name } },
    el('div', {}, el('h3', { text: offer.definition.name }),
      el('p', { text: offer.lifecycle === 'open'
        ? `${choiceLabel[offer.choice]} · Free through Week ${offer.deadline - 1}`
        : cupStatus(state, offer, cupInstance(state, offer)) })),
    open);
}

function statusDetail(state: GameState, offer: OpenCupEntryPreview, cup: CompetitionInstance | undefined): string {
  if (offer.resolution === 'legacy-window-missed') return `The entry window had already closed when this save was updated. ${NEXT_OFFER}`;
  if (offer.resolution === 'legacy-cup') return `This season keeps the Open Cup already in the save. ${NEXT_OFFER}`;
  if (offer.lifecycle === 'open') return `You can enter, decline or change your choice through Week ${offer.deadline - 1}. The draw is made before play in Week ${offer.deadline}.`;
  if (offer.withdrawal?.fulfilled) return `Your Week ${offer.withdrawal.fulfilled.slot} tie was forfeited. You keep any prizes already won. ${NEXT_OFFER}`;
  if (offer.withdrawal) {
    const next = cup?.fixtures.find(f => f.status === 'scheduled' && (f.homeId === state.clubId || f.awayId === state.clubId));
    return next?.slot
      ? `Your Week ${next.slot} tie will be forfeited on its scheduled date. You keep any prizes already won. ${NEXT_OFFER}`
      : `Your next actual tie will be forfeited when it falls due. A bye leaves your withdrawal queued. ${NEXT_OFFER}`;
  }
  if (offer.resolution !== 'entered') return `The other ${cup?.entrantIds.length ?? 0} clubs contest the cup. ${NEXT_OFFER}`;
  if (!offer.canWithdraw) return NEXT_OFFER;
  return `The draw includes ${cup?.entrantIds.length ?? 0} clubs. See the bracket for your club’s ties. ${NEXT_OFFER}`;
}

function roundName(round: number, count: number): string {
  if (round === count) return 'Final';
  if (round === count - 1) return 'Semi-finals';
  if (round === count - 2) return 'Quarter-finals';
  return `Round ${round}`;
}

function terms(offer: OpenCupEntryPreview): HTMLElement {
  const policies = offer.definition.rewards.filter(isExecutableCompetitionRewardPolicy);
  const cash = policies.filter(policy => policy.kind === 'cash');
  const winRep = policies.find(policy => policy.kind === 'reputation' && policy.execution.trigger === 'round-win');
  const titleRep = policies.find(policy => policy.kind === 'reputation' && policy.execution.trigger === 'title');
  const dates = offer.dates.map(date => `Week ${date}`).join(' · ');
  return el('section', { class: 'nrl-cup-panel', attrs: { 'data-open-cup-terms': '' } },
    el('h3', { text: 'Entry and prizes' }),
    el('p', { text: `Free entry through Week ${offer.deadline - 1}. The whole club enters under the same Nines rules as the league. Entry is optional. Leave the offer unanswered and your club sits out while the other clubs still play.` }),
    el('p', { text: `Up to five cup dates, with no league clashes: ${dates}. Elimination frees up all later cup dates for your club.` }),
    el('p', { text: 'Extra cash for a played win uses the host’s league match base (M). The neutral final uses the lower of the two clubs’ league match bases.' }),
    el('ul', { class: 'nrl-cup-prize-table' }, ...cash.map(policy =>
      el('li', {}, el('span', { text: roundName(policy.round, offer.dates.length) }),
        el('strong', { class: 'nrl-num', text: `${policy.matchBaseMultiplier} × M` })))),
    ...(winRep?.kind === 'reputation' && titleRep?.kind === 'reputation' ? [
      el('p', { text: `Each played win earns +${winRep.amount} reputation, with +${titleRep.amount} more for a played title win, up to the reputation limit.` }),
    ] : []),
    el('p', { text: 'A played final win earns a trophy for the full registered squad at the final, including reserves. League access comes from league finals titles.' }),
    el('p', { text: 'Byes and forfeits earn no prize. After the draw, withdrawing forfeits your next actual tie on its scheduled date. A bye leaves the withdrawal queued and earlier prizes stay with your club.' }));
}

function bracket(state: GameState, cup: CompetitionInstance): HTMLElement {
  const name = (id: string) => id === state.clubId ? state.clubName : state.league.clubs.find(c => c.id === id)?.name ?? id;
  const dates = cup.definition.stages[0]?.slotIds ?? [];
  const fixtures = cup.fixtures.map(f => leagueFixtureView(cup, f));
  const openingRound = Math.min(...fixtures.map(f => f.fixture.round));
  const byes = fixtures.length ? openCupByes(cup) : [];
  const rounds = dates.flatMap((date, index) => {
    const round = index + 1;
    if (round < openingRound) return [];
    const rows = fixtures.filter(f => f.fixture.round === round).map(f => {
      const { homeId, awayId, result, neutral } = f.fixture;
      const teams = result ? `${name(homeId)} ${result.homeScore}–${result.awayScore} ${name(awayId)}`
        : `${name(homeId)} v ${name(awayId)}`;
      const status = f.status === 'completed' && result
        ? f.decider === 'forfeit' ? `${name(f.winnerId!)} won on forfeit`
          : f.decider === 'seeded-draw' ? `${name(f.winnerId!)} advanced on the seeded draw` : 'Played'
        : { completed: 'Completed', cancelled: 'Cancelled', pending: 'Pending', scheduled: 'Scheduled' }[f.status];
      return el('li', { attrs: { 'data-open-cup-fixture': f.fixture.id, 'data-open-cup-club': String(homeId === state.clubId || awayId === state.clubId) } },
        el('span', { text: teams }),
        el('small', { text: `${f.dateLabel} · ${status}${neutral ? ' · Neutral venue' : ''}` }));
    });
    return el('section', { class: 'nrl-cup-round' },
      el('h4', { text: `${roundName(round, dates.length)} · Week ${date}` }),
      ...(rows.length ? [el('ul', {}, ...rows)] : [el('p', { text: cup.status === 'withdrawn' ? 'Round cancelled' : 'Ties to be decided' })]),
      ...(round === openingRound && byes.length ? [el('p', { text: `Opening byes: ${byes.map(name).join(', ')}.` })] : []));
  });
  return el('section', { class: 'nrl-cup-panel nrl-cup-bracket', attrs: { 'data-open-cup-bracket': '' } },
    el('h3', { text: 'Cup bracket' }),
    ...(cup.winnerId ? [el('p', { class: 'nrl-cup-champion', text: `Champion: ${name(cup.winnerId)}` })] : []),
    ...(rounds.length ? rounds : [el('p', { text: 'No ties were drawn for this cup.' })]));
}

const refusal: Record<Exclude<OpenCupEntryConfirmationResult, { ok: true }>['reason'], string> = {
  stale: 'The career changed. Review the refreshed Open Cup details and choose again.',
  storage: 'Your Open Cup decision could not be saved. Free up storage if needed, then try again.',
  held: 'Finish the current match or week before changing cup entry.',
  quarantine: 'The latest week has a save problem. Return to the club and reload the career before trying again.',
  unavailable: 'This action is no longer available. Review the refreshed cup status.',
  invalid: 'This career’s Open Cup details could not be verified. Reload the career before trying again.',
};

export function openOpenCupEntry(findOpener?: () => HTMLElement | null): HTMLElement {
  ensureCupStyles();
  const opener = document.activeElement;
  const dismiss = button('Close', closeModal);
  const title = el('h2', { attrs: { id: 'nrl-cup-title' }, text: 'Open Cup' });
  const head = el('div', { class: 'nrl-cup-head' }, title, dismiss);
  const detail = el('div', { class: 'nrl-cup-detail', attrs: { tabindex: '0', role: 'region', 'aria-label': 'Cup details' } });
  const status = el('p', { class: 'nrl-cup-feedback', attrs: { role: 'status', 'data-open-cup-status': '' } });
  const actions = el('div', { class: 'nrl-cup-actions' });
  const footer = el('div', { class: 'nrl-cup-footer' }, status, actions);
  const content = el('div', { class: 'nrl-cup-dialog', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': title.id } },
    head, detail, footer);
  let captured = captureOpenCupEntryPreview();
  let withdrawalArmed = false;

  function act(id: Action): void {
    if (!captured.ok) return;
    if (id === 'withdraw' || id === 'cancel-withdrawal') {
      withdrawalArmed = id === 'withdraw';
      render();
      focusAction(withdrawalArmed ? 'cancel-withdrawal' : 'withdraw');
      return;
    }
    const { owner, offerId, previewKey } = captured.preview;
    const selection = { owner, offerId, previewKey };
    const result = id === 'confirm-withdrawal'
      ? confirmOpenCupWithdrawal(selection)
      : confirmOpenCupChoice({ ...selection, choice: id });
    captured = captureOpenCupEntryPreview();
    withdrawalArmed = false;
    render(result.ok ? { enter: 'Entry saved.', decline: 'Decline saved.', 'confirm-withdrawal': 'Withdrawal saved.' }[id] : refusal[result.reason]);
    focusAction(id === 'confirm-withdrawal' ? 'withdraw' : id);
  }

  function focusAction(id: Action): void {
    const action = actions.querySelector<HTMLButtonElement>(`[data-open-cup-action="${id}"]`);
    (action && !action.disabled ? action : dismiss).focus();
  }

  function makeAction(label: string, id: Action, primary = false, disabled = false): HTMLButtonElement {
    const control = button(label, () => act(id), primary ? { class: 'nrl-btn-primary' } : {});
    control.setAttribute('data-open-cup-action', id);
    control.disabled = disabled;
    return control;
  }

  function render(message = ''): void {
    status.textContent = message;
    actions.replaceChildren();
    footer.hidden = !message;
    if (!captured.ok) {
      detail.replaceChildren(el('p', { text: captured.reason === 'unavailable'
        ? 'Choose your league to receive an Open Cup offer.' : refusal[captured.reason] }));
      return;
    }
    const offer = captured.preview;
    const state = getState();
    const cup = cupInstance(state, offer);
    title.textContent = `${offer.definition.name} · Season ${offer.season}`;
    detail.replaceChildren(el('section', { class: 'nrl-cup-panel nrl-cup-decision' },
      el('h3', { text: cupStatus(state, offer, cup) }),
      el('p', { text: statusDetail(state, offer, cup) })),
    ...(cup ? [bracket(state, cup)] : []),
    ...(offer.resolution === 'legacy-cup' ? [] : [terms(offer)]));
    if (offer.canChoose) {
      actions.append(makeAction('Decline cup', 'decline', false, offer.choice === 'decline'),
        makeAction('Enter cup', 'enter', true, offer.choice === 'enter'));
    } else if (offer.canWithdraw && withdrawalArmed) {
      status.textContent = 'Confirm to forfeit your next Open Cup tie on its scheduled date.';
      actions.append(makeAction('Keep playing', 'cancel-withdrawal'), makeAction('Confirm withdrawal', 'confirm-withdrawal', true));
    } else if (offer.canWithdraw) {
      actions.append(makeAction('Withdraw from cup', 'withdraw'));
    }
    footer.hidden = !status.textContent && actions.children.length === 0;
  }

  content.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(actions.children).filter(node => !(node as HTMLButtonElement).disabled) as HTMLElement[];
    const last = controls[controls.length - 1] ?? detail;
    if (event.shiftKey && document.activeElement === dismiss) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      dismiss.focus();
    }
  });
  render();
  const modal = openModal(content, { class: 'nrl-cup-modal', onRemove: () => {
    const current = findOpener?.();
    if (current?.isConnected) current.focus();
    else if (opener?.isConnected && opener instanceof HTMLElement) opener.focus();
  } });
  dismiss.focus();
  return modal;
}

function ensureCupStyles(): void {
  const id = 'nrl-open-cup-style';
  if (document.getElementById(id)) return;
  const style = el('style', { text: CSS });
  style.id = id;
  document.head.append(style);
}

const CSS = `
.nrl-cup-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 10px;
  margin-bottom: 8px;
  padding: 7px 9px;
  border: 1px solid var(--nrl-line);
  border-radius: 10px;
  background: var(--nrl-raised);
}
.nrl-cup-card h3, .nrl-cup-card p { margin: 0; }
.nrl-cup-card h3 { font-family: var(--nrl-f-label); font-size: 0.9375rem; }
.nrl-cup-card p { font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-cup-card .nrl-btn, .nrl-cup-dialog .nrl-btn { min-width: 44px; min-height: 44px; white-space: normal; }
.nrl-modal.nrl-cup-modal {
  width: min(640px, calc(100vw - 24px - var(--nrl-safe-l, 0px) - var(--nrl-safe-r, 0px)));
  max-width: none;
  max-height: calc(100vh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px));
  max-height: calc(100dvh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px));
  margin: var(--nrl-safe-t, 0px) var(--nrl-safe-r, 0px) var(--nrl-safe-b, 0px) var(--nrl-safe-l, 0px);
  padding: 0;
  overflow: hidden;
  display: flex;
}
.nrl-cup-dialog { display: flex; flex-direction: column; width: 100%; min-width: 0; }
.nrl-cup-head, .nrl-cup-footer {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 4px 12px;
  padding: 6px 12px;
}
.nrl-cup-head h2, .nrl-cup-footer p { margin: 0; }
.nrl-cup-detail { min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 0 12px 8px; }
.nrl-cup-detail:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -3px; }
.nrl-cup-panel {
  padding: 10px 12px;
  margin: 0 0 8px;
  border-radius: 10px;
  background: var(--nrl-raised);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.nrl-cup-panel :is(h3, h4, p) { margin: 0 0 6px; }
.nrl-cup-panel > :last-child { margin-bottom: 0; }
.nrl-cup-decision { border-left: 3px solid var(--nrl-accent); }
.nrl-cup-panel ul { margin: 0 0 6px; padding: 0; list-style: none; }
.nrl-cup-prize-table li { display: flex; justify-content: space-between; gap: 12px; }
.nrl-cup-prize-table li, .nrl-cup-round li { padding: 4px 0; border-top: 1px solid var(--nrl-line); }
.nrl-cup-round + .nrl-cup-round { margin-top: 10px; }
.nrl-cup-round small { display: block; color: var(--nrl-text-2); }
.nrl-cup-round [data-open-cup-club="true"], .nrl-cup-champion { color: var(--nrl-accent); font-weight: 600; }
.nrl-cup-footer { border-top: 1px solid var(--nrl-line); }
.nrl-cup-footer[hidden], .nrl-cup-feedback:empty, .nrl-cup-actions:empty { display: none; }
.nrl-cup-feedback { flex: 1 1 196px; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-cup-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; margin-left: auto; }
`;
