import { getState, type GameState, type Player, type PlayerStats, type TrainingFocus } from '../../core/state';
import { CAMP_RULES, openingCampFixture, supportedCampCalendar, type CampRecord } from '../../data/playerAssignments';
import { PROGRESSION } from '../../config';
import { shownStats } from '../../data/player';
import { applyCampAward, campTrainingFoci } from '../../systems/assignmentTraining';
import { currentSkillsCamp, projectCampDeparture } from '../../systems/playerAssignments';
import { captureCampAction, confirmCampAction } from '../../systems/playerAssignmentCommit';
import { isSelectable, POSITION_SHORT, resolveLineup } from '../../systems/lineup';
import { focusLabel, levelPointSpendMode } from '../../systems/training';
import { button, closeModal, el, openModal } from '../dom';

type CampAction = Parameters<typeof captureCampAction>[0];
import { previewWeeklyFatigue } from '../../systems/fatiguePreview';
import { fatigueBookingNote } from '../weeklyFatigue';

type Selection = Parameters<typeof confirmCampAction>[0];
type CampProjection = ReturnType<typeof projectCampDeparture>;
type CampState = Pick<GameState, 'competitions' | 'season' | 'clubId'>;

/** The saved booking tells the club when to expect the player back. */
export function campAvailability(state: CampState): CampRecord | undefined {
  return state.competitions?.assignments?.find(r => r.season === state.season && r.clubId === state.clubId && (r.status === 'booked' || r.status === 'away'));
}

export function campAbsenceText(camp: CampRecord | undefined, playerId: string): string | null {
  if (!camp || camp.booking?.participantId !== playerId) return null;
  const when = camp.status === 'away' ? 'Away now' : `Away Week ${camp.rules.departureWeek}`;
  return `${camp.rules.title} · ${when} · Back Week ${camp.rules.returnWeek}`;
}

function reports(state: GameState, current: CampRecord | null): CampRecord[] {
  return (state.competitions?.assignments ?? [])
    .filter(r => r.id !== current?.id && (r.status === 'completed' || r.status === 'cancelled'))
    .sort((a, b) => b.season - a.season);
}

function missedWindow(state: GameState): boolean {
  const c = state.competitions;
  return state.week > CAMP_RULES.closesWeek && !!c?.leagueCareer && c.leagueCareer.phase !== 'initial-choice'
    && supportedCampCalendar(c, state.pack ?? 'au') && !!openingCampFixture(c, state.season, state.clubId);
}

function summary(camp: CampRecord, state: GameState): string {
  const { week } = state;
  const savedName = camp.booking?.participantName;
  const name = state.squad.find(p => p.id === camp.booking?.participantId)?.name ?? savedName;
  switch (camp.status) {
    case 'available':
      return week <= camp.rules.closesWeek
        ? `One free place · Book by Week ${camp.rules.closesWeek}`
        : 'Booking closed';
    case 'booked':
      return `${name} · ${week === camp.rules.departureWeek ? 'Departs this week' : `Away Week ${camp.rules.departureWeek}`} · Back Week ${camp.rules.returnWeek}`;
    case 'away':
      return `${name} is away · Back Week ${camp.rules.returnWeek}`;
    case 'cancelled':
      return `${savedName} · Camp cancelled`;
    case 'completed':
      return `${savedName} is back · +${number(camp.award?.effectiveXp ?? 0)} XP`;
  }
}

export function buildSkillsCampCard(state: GameState, findOpener: () => HTMLElement | null): HTMLElement | null {
  const camp = currentSkillsCamp(state);
  const history = reports(state, camp);
  const missed = !camp && missedWindow(state);
  if (!camp && !missed && !history.length) return null;
  ensureCampStyles();
  const showReport = camp ? camp.status === 'completed' || camp.status === 'cancelled' : history.length > 0;
  const open = button(showReport ? 'Camp report' : 'Camp details', () => openSkillsCamp(findOpener));
  open.setAttribute('data-camp-details', '');
  open.setAttribute('aria-haspopup', 'dialog');
  return el('section', { class: 'nrl-camp-card', attrs: { 'data-camp-card': '', 'aria-label': 'Skills Camp' } },
    el('div', {}, el('h3', { text: 'Skills Camp' }),
      el('p', { text: camp ? summary(camp, state) : missed ? 'Booking closed · Opens next season' : 'Past camp reports' })), open);
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function report(camp: CampRecord): HTMLElement {
  const title = `${camp.booking?.participantName} · Season ${camp.season}`;
  const result = camp.award;
  const stats = result ? (Object.entries(result.statGains) as [keyof PlayerStats, number][])
    .map(([stat, gain]) => `${focusLabel(stat)} +${number(gain)}`) : [];
  return el('section', { class: 'nrl-camp-panel', attrs: { 'data-camp-report': camp.id } },
    el('h3', { text: title }),
    ...(result ? [
      el('p', { text: `Returned before Week ${camp.rules.returnWeek} · +${number(result.effectiveXp)} XP · ${result.newPoints} new level points` }),
      el('p', { text: `${result.priorPointsSpent} previously banked points spent · ${result.bankedAfter} points remaining` }),
      el('p', { text: result.mode === 'manual' ? 'Points banked for manual spending.'
        : `${camp.booking?.focus === null ? 'Automatic spending used the club training focus at return' : 'Automatic spending'} · ${focusLabel(result.focus ?? 'balanced')}` }),
      el('p', { text: stats.length ? stats.join(' · ') : 'No stat increases.' }),
    ] : [el('p', { text: `Camp cancelled. ${camp.reason ?? ''} No camp XP awarded.` })]));
}

function missingFixture(state: GameState, camp: CampRecord): string {
  const fixture = state.competitions?.instances.find(i => i.id === camp.instanceId)?.fixtures.find(f => f.id === camp.fixtureId);
  const opponent = state.league.clubs.find(club => club.id === camp.opponentId)?.name ?? 'League opponent';
  const venue = fixture ? ` (${fixture.homeId === camp.clubId ? 'home' : 'away'})` : '';
  return `Misses the Week ${camp.rules.departureWeek} league opener against ${opponent}${venue}. Back before Week ${camp.rules.returnWeek} selection.`;
}

function coverText(projected: CampProjection): string {
  if (projected.role === 'reserve') return 'Reserve · Usual matchday places stay covered.';
  const role = projected.role === 'starter' ? 'Starter' : 'Bench';
  return projected.cover ? `${role} · ${projected.cover.name} covers.` : `${role} · Cover to be checked.`;
}

function developmentLimits(player: Player): HTMLElement {
  const stats = shownStats(player.position).map(key => {
    const current = player.stats[key];
    const ceiling = player.ceilings[key] ?? current;
    return { key, current, ceiling, capped: current >= ceiling };
  });
  return el('div', { class: 'nrl-camp-limits', attrs: { 'data-camp-limits': '' } },
    el('h4', { text: 'Current stats and ceilings' }),
    el('ul', {}, ...stats.map(({ key, current, ceiling, capped }) =>
      el('li', { attrs: { 'data-camp-limit': key } },
        el('span', { text: focusLabel(key) }),
        el('strong', { class: 'nrl-num', text: `${number(current)} / ${number(ceiling)}` }),
        ...(capped ? [el('small', { text: 'At ceiling' })] : [])))),
    ...(stats.every(stat => stat.capped) ? [el('p', { text: 'All shown stats are at their ceilings. Earned points stay banked while there is no room to spend.' })] : []));
}

function development(state: GameState, camp: CampRecord, player: Player, focus: TrainingFocus | null, projected: CampProjection): HTMLElement {
  const mode = levelPointSpendMode(state.settings.spendPointsMyself);
  const clubFocus = state.training?.focus ?? 'balanced';
  const { receipt } = applyCampAward(player, { mode, clubFocus, ...(focus === null ? {} : { campFocus: focus }) });
  const appearance = projected.role === 'starter' ? PROGRESSION.STARTER_XP : projected.role === 'bench' ? PROGRESSION.BENCH_XP : 0;
  const focusText = focus === null ? 'your club training focus at return' : `the ${focusLabel(focus)} focus`;
  const spend = mode === 'manual'
    ? `You spend level points manually. Camp banks the points. If you switch to automatic spending before return, it uses ${focusText}.`
    : `Uses ${focusText}. Points can go to other shown stats when the target reaches its ceiling.`;
  return el('div', { class: 'nrl-camp-development' },
    el('p', { text: `${camp.rules.baseXp} base XP · ${number(receipt.effectiveXp)} XP expected for ${player.name} at current age and traits, without home-facility XP bonuses.` }),
    el('p', { text: `Replaces ${PROGRESSION.WEEKLY_XP} base club training XP. Staying would also give ${appearance} base appearance XP in this role, before match moments and training bonuses.` }),
    el('p', { text: `At your current settings, ${receipt.newPoints} new level points and ${receipt.bankedAfter} points remaining after spending are expected. ${spend}` }),
    developmentLimits(player));
}

function choice<T extends string>(label: string, attr: string, value: T, options: readonly { value: T; label: string }[], onChange: (value: T) => void): HTMLLabelElement {
  const select = el('select', { attrs: { [attr]: '' } }, ...options.map(o => el('option', { text: o.label, attrs: { value: o.value } })));
  select.value = value;
  select.onchange = () => onChange(select.value as T);
  return el('label', { class: 'nrl-camp-choice' }, el('span', { text: label }), select);
}

export function openSkillsCamp(findOpener: () => HTMLElement | null): HTMLElement {
  const originalOpener = document.activeElement;
  const dismiss = button('Close', closeModal);
  const title = el('h2', { text: 'Skills Camp', attrs: { id: 'nrl-camp-title' } });
  const detail = el('div', { class: 'nrl-camp-body', attrs: { tabindex: '0', role: 'region', 'aria-label': 'Camp details' } });
  const status = el('p', { attrs: { role: 'status', 'data-camp-status': '' } });
  const actions = el('div', { class: 'nrl-camp-actions' });
  const footer = el('div', { class: 'nrl-camp-footer' }, status, actions);
  const content = el('div', { class: 'nrl-camp-dialog', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': title.id, 'data-camp-dialog': '' } },
    el('div', { class: 'nrl-camp-head' }, title, dismiss), detail, footer);
  let playerId = '';
  let focus: TrainingFocus = 'balanced';
  let review: { action: CampAction; selection: Selection } | null = null;

  function focusControl(attr: string): void {
    (content.querySelector<HTMLElement>(`[${attr}]`) ?? dismiss).focus();
  }

  function inspect(action: CampAction): void {
    const captured = captureCampAction(action);
    review = captured.ok ? { action, selection: captured.selection } : null;
    render(captured.ok ? '' : captured.message);
    // Review the refreshed details from their top before moving to confirmation.
    if (captured.ok) detail.focus();
    else focusControl('data-camp-review');
  }

  function confirm(): void {
    if (!review) return;
    const { action, selection } = review;
    review = null;
    const result = confirmCampAction(selection);
    if (result.ok && action.kind === 'cancel') {
      playerId = '';
      focus = 'balanced';
    }
    render(result.ok ? (action.kind === 'book' ? 'Camp booking saved.' : 'Camp booking cancelled.') : result.message);
    detail.focus();
  }

  function control(label: string, attr: string, action: () => void, primary = false): HTMLButtonElement {
    const b = button(label, action, primary ? { class: 'nrl-btn-primary' } : {});
    b.setAttribute(attr, '');
    return b;
  }

  function render(message = ''): void {
    const state = getState();
    const camp = currentSkillsCamp(state);
    title.textContent = camp ? `${camp.rules.title} · Season ${camp.season}` : 'Skills Camp';
    status.textContent = message;
    status.hidden = !message;
    actions.replaceChildren();
    detail.replaceChildren();
    detail.scrollTop = 0;

    if (camp?.status === 'completed' || camp?.status === 'cancelled') {
      detail.append(report(camp));
    } else if (camp) {
      drawOffer(state, camp);
    } else if (missedWindow(state)) {
      detail.append(el('p', { text: `The booking window closed after Week ${CAMP_RULES.closesWeek}. The next offer opens next season.` }));
    }
    const history = reports(state, camp);
    if (history.length) {
      const previous = el('details', { class: 'nrl-camp-history', attrs: { 'data-camp-history': '' } },
        el('summary', { text: 'Past camp reports' }), ...history.map(report));
      previous.open = !camp;
      detail.append(previous);
    } else if (!camp && !detail.children.length) {
      detail.append(el('p', { text: 'Skills Camp is currently unavailable in this career.' }));
    }
    footer.hidden = !message && actions.children.length === 0;
  }

  function drawOffer(state: GameState, camp: CampRecord): void {
    const { rules, booking } = camp;
    const open = camp.status === 'available' && state.week <= rules.closesWeek;
    detail.append(el('div', { class: 'nrl-camp-panel' },
      el('h3', { text: summary(camp, state) }),
      el('p', { text: !open && !booking ? 'The next offer opens next season.' : missingFixture(state, camp) }),
      ...(open || booking ? [el('p', { text: camp.status === 'away'
        ? 'The camp is underway. The player returns after this week settles.'
        : `Free cancellation before departure. The club rechecks fitness and cover when Week ${rules.departureWeek} starts.` })] : [])));

    const manual = levelPointSpendMode(state.settings.spendPointsMyself) === 'manual';
    const participant = state.squad.find(p => p.id === (booking?.participantId ?? playerId));
    if (open && !review) {
      const eligible = state.squad.filter(p => isSelectable(p)).sort((a, b) => a.name.localeCompare(b.name));
      detail.append(choice('Player', 'data-camp-player', participant?.id ?? '', [
        { value: '', label: 'Choose a squad player' },
        ...eligible.map(p => ({ value: p.id, label: `${p.name} · ${POSITION_SHORT[p.position]}` })),
      ], id => {
        playerId = id;
        focus = 'balanced';
        render();
        focusControl('data-camp-player');
      }));
      if (!eligible.length) detail.append(el('p', { text: 'Camp requires a fit and unbanned squad player.' }));
    }
    const projected = participant && camp.status !== 'away' && (open || booking)
      ? projectCampDeparture(state, { participantId: participant.id }, rules.departureWeek) : null;
    if (participant && projected) {
      const targets = campTrainingFoci(participant);
      if (!targets.includes(focus)) focus = 'balanced';
      const shownFocus = booking ? booking.focus : manual ? null : focus;
      const today = resolveLineup(state.lineup, state.squad);
      const role = today.starters.some(p => p?.id === participant.id) ? 'starter'
        : today.bench.some(p => p.id === participant.id) ? 'bench' : 'reserve';
      const roleNote = role === 'bench' ? 'Currently on the bench.' : `Currently a ${role}.`;
      const fatigue = review?.action.kind === 'cancel' ? undefined : fatigueBookingNote(
        previewWeeklyFatigue(state, { week: rules.departureWeek, playerId: participant.id }), participant.id);
      detail.append(el('div', { class: 'nrl-camp-panel', attrs: { 'data-camp-preview': '' } },
        el('h3', { text: participant.name }),
        ...(role === projected.role ? [] : [el('p', { text: roleNote })]),
        el('p', { text: coverText(projected) }),
        ...(fatigue ? [fatigue] : []),
        ...(projected.reason ? [el('p', { class: 'nrl-camp-risk', text: projected.reason })] : []),
        ...(open && !manual && !review ? [choice('Camp focus', 'data-camp-focus', focus,
          targets.map(target => ({ value: target, label: focusLabel(target) })), next => {
            focus = next;
            render();
            focusControl('data-camp-focus');
          })] : []),
        development(state, camp, participant, shownFocus, projected)));
    }

    if (review) {
      const cancelling = review.action.kind === 'cancel';
      detail.append(el('p', { class: 'nrl-camp-confirmation', text: cancelling
        ? `Cancel the booking for ${booking?.participantName}? The player stays with the club for Week ${rules.departureWeek}.`
        : `Confirm the free place for ${participant?.name}. The player remains on your squad and misses the opener.` }));
      const confirmButton = control(cancelling ? 'Confirm cancellation' : 'Confirm booking', 'data-camp-confirm', confirm, true);
      const previewId = detail.querySelector('[data-fatigue-event-preview]')?.getAttribute('id');
      if (previewId) confirmButton.setAttribute('aria-describedby', previewId);
      actions.append(control('Back', 'data-camp-back', () => {
        review = null;
        render();
        focusControl(cancelling ? 'data-camp-cancel' : 'data-camp-review');
      }), confirmButton);
    } else if (open) {
      const next = control('Review booking', 'data-camp-review', () => {
        if (participant) inspect({ kind: 'book', participantId: participant.id, focus: manual ? null : focus });
      }, true);
      next.disabled = !participant || !projected || !!projected.reason;
      actions.append(next);
    } else if (camp.status === 'booked') {
      actions.append(control('Cancel booking', 'data-camp-cancel', () => inspect({ kind: 'cancel' })));
    }
  }

  content.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(content.querySelectorAll<HTMLElement>('button:not(:disabled), select, summary, [tabindex="0"]'));
    const last = controls[controls.length - 1] ?? dismiss;
    if (event.shiftKey && document.activeElement === dismiss) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      dismiss.focus();
    }
  });
  render();
  const modal = openModal(content, { class: 'nrl-camp-modal', onRemove: () => {
    const current = findOpener();
    const opener = current?.isConnected ? current : originalOpener;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  } });
  dismiss.focus();
  return modal;
}

function ensureCampStyles(): void {
  const id = 'nrl-camp-styles';
  if (document.getElementById(id)) return;
  const style = el('style', { text: CSS });
  style.id = id;
  document.head.append(style);
}

const CSS = `
.nrl-camp-card {
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
.nrl-camp-card h3, .nrl-camp-card p { margin: 0; }
.nrl-camp-card h3 { font-family: var(--nrl-f-label); font-size: 0.9375rem; }
.nrl-camp-card p { font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-camp-card .nrl-btn, .nrl-camp-dialog .nrl-btn { min-width: 44px; min-height: 44px; white-space: normal; }
.nrl-modal.nrl-camp-modal {
  display: flex;
  width: min(600px, calc(100vw - 24px - var(--nrl-safe-l, 0px) - var(--nrl-safe-r, 0px)));
  max-width: none;
  max-height: calc(100vh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px));
  max-height: calc(100dvh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px));
  margin: var(--nrl-safe-t, 0px) var(--nrl-safe-r, 0px) var(--nrl-safe-b, 0px) var(--nrl-safe-l, 0px);
  padding: 0;
  overflow: hidden;
}
.nrl-camp-dialog { display: flex; flex-direction: column; width: 100%; min-width: 0; }
.nrl-camp-head, .nrl-camp-footer { flex: none; padding: 6px 12px; }
.nrl-camp-head, .nrl-camp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.nrl-camp-head { justify-content: space-between; border-bottom: 1px solid var(--nrl-line); }
.nrl-camp-head h2 { margin: 0; font-size: 1.125rem; }
.nrl-camp-body { min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 10px 12px; overflow-wrap: anywhere; }
.nrl-camp-panel { margin-bottom: 8px; padding: 8px 10px; border-radius: 8px; background: var(--nrl-raised); }
.nrl-camp-panel h3 { margin: 0; color: var(--nrl-text); font-size: 0.9375rem; }
.nrl-camp-panel p, .nrl-camp-confirmation, .nrl-camp-footer p { margin: 5px 0 0; line-height: 1.35; }
.nrl-camp-panel p { color: var(--nrl-text-2); }
.nrl-camp-panel .nrl-camp-risk { color: var(--nrl-neg); }
.nrl-camp-limits { margin-top: 10px; }
.nrl-camp-limits h4 { margin: 0 0 5px; font-size: 0.8125rem; }
.nrl-camp-limits ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(7rem, 100%), 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.nrl-camp-limits li { display: grid; align-content: start; gap: 2px; padding: 4px 6px; border-radius: 4px; background: var(--nrl-navy); }
.nrl-camp-limits li span, .nrl-camp-limits li small { color: var(--nrl-text-2); font-size: 0.75rem; }
.nrl-camp-limits li strong { font-size: 0.8125rem; }
.nrl-camp-choice { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }
.nrl-camp-choice select {
  min-height: 44px;
  min-width: 44px;
  max-width: 100%;
  padding: 0 8px;
  border: 1px solid var(--nrl-line-2);
  border-radius: 8px;
  background: var(--nrl-navy);
  color: var(--nrl-text);
  font: inherit;
  color-scheme: dark;
}
.nrl-camp-history summary { min-height: 44px; padding: 10px 4px; cursor: pointer; box-sizing: border-box; }
.nrl-camp-footer { border-top: 1px solid var(--nrl-line); }
.nrl-camp-footer p { margin-bottom: 6px; }
.nrl-camp-actions { justify-content: flex-end; }
.nrl-camp-body:focus-visible, .nrl-camp-choice select:focus-visible, .nrl-camp-history summary:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
`;
