import { getState, type GameState } from '../../core/state';
import { annualCapQuote, FINANCE_TIERS, tierForRank } from '../../data/financeRules';
import type { CompetitionDefinition } from '../../data/competition';
import type { LeagueMovement } from '../../data/leagueCareer';
import type { ClubCommitmentQuote } from '../../data/leagueEntryReceipt';
import { previewLeagueEntry, type LeagueEntryPreview, type LeaguePreviewResult } from '../../systems/leagueEntry';
import { confirmLeagueEntry } from '../../systems/leagueEntryCommit';
import { squadStrength } from '../../systems/rivals';
import { fmtMoney } from '../../utils/money';
import { button, closeModal, el, hintScroll, openModal } from '../dom';

export interface LeagueSelectionOptions {
  onConfirmed?: (state: GameState) => void;
}

const TITLE_ID = 'nrl-league-selection-title';
const DETAIL_ID = 'nrl-league-selection-detail';
const STATUS_ID = 'nrl-league-selection-status';
const STYLE_ID = 'nrl-league-selection-style';

/** One preview dialog for the first entry and every annual entry. */
export function openLeagueSelection(options: LeagueSelectionOptions = {}): HTMLElement {
  ensureStyles();
  const opener = document.activeElement;
  const title = el('h2', { attrs: { id: TITLE_ID } });
  const dismiss = button('Close', closeModal);
  const choices = el('div', { class: 'nrl-league-choices', attrs: { role: 'group', 'aria-label': 'Leagues' } });
  const detail = el('div', { class: 'nrl-league-detail', attrs: {
    id: DETAIL_ID, tabindex: '0', role: 'region', 'aria-label': 'League preview', 'data-nrl-league-detail': '',
  } });
  const status = el('p', { attrs: { id: STATUS_ID, role: 'status', 'data-nrl-league-selection-status': '' } });
  const footer = el('footer', { class: 'nrl-league-footer' }, status);
  const content = el('div', { class: 'nrl-league-selection', attrs: {
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': TITLE_ID, 'data-nrl-league-selection': '',
  } }, el('header', { class: 'nrl-league-head' }, title, dismiss), choices, detail, footer);

  let snapshot = getState();
  let selectedId: string | undefined;
  let selected: LeagueEntryPreview | undefined;
  let results = new Map<string, LeaguePreviewResult>();
  let previews: LeagueEntryPreview[] = [];
  let confirming = false;
  const cards = new Map<string, HTMLButtonElement>();

  const confirm = button('Confirm league', () => {
    if (!content.isConnected || !selected?.eligible || confirming) return;
    const { leagueId, previewKey } = selected;
    confirming = true;
    const result = confirmLeagueEntry({ leagueId, previewKey });
    confirming = false;
    if (result.ok) {
      if (content.isConnected) closeModal();
      options.onConfirmed?.(result.state);
      return;
    }
    if (result.reason === 'stale') {
      refresh(`${result.message} Review the updated preview and confirm again.`);
      if (!confirm.isConnected) dismiss.focus();
    } else if (result.reason === 'unavailable' || result.reason === 'locked') {
      refresh(result.message);
      if (!confirm.isConnected) dismiss.focus();
    } else {
      status.textContent = result.message;
    }
  }, { class: 'nrl-btn-primary' });
  confirm.setAttribute('data-nrl-league-confirm', '');
  confirm.setAttribute('aria-describedby', STATUS_ID);

  function showSelection(message = ''): void {
    const result = selectedId ? results.get(selectedId) : undefined;
    selected = result?.ok ? result.preview : undefined;
    for (const [id, card] of cards) card.setAttribute('aria-pressed', String(id === selectedId));
    detail.replaceChildren();
    detail.scrollTop = 0;
    confirm.setAttribute('aria-disabled', String(!selected?.eligible));
    if (!selected) {
      const refusal = result && !result.ok ? result.message : undefined;
      status.textContent = [message, refusal].filter(Boolean).join(' ');
      return;
    }
    renderPreview(detail, selected, snapshot, previews);
    const reason = selected.eligible ? '' : lockedReason(selected, snapshot);
    status.textContent = [message, reason].filter(Boolean).join(' ');
  }

  function refresh(message = ''): void {
    snapshot = getState();
    const divisions = snapshot.competitions?.world?.divisions ?? [];
    results = new Map(divisions.map(d => [d.id, previewLeagueEntry(snapshot, d.id)]));
    previews = [...results.values()].flatMap(r => r.ok ? [r.preview] : []);
    const first = previews[0];
    choices.hidden = detail.hidden = !first;
    if (first) {
      title.textContent = `Choose your league · Season ${first.targetSeason}`;
      if (!selectedId || !results.has(selectedId)) {
        selectedId = results.has(first.currentLeagueId) ? first.currentLeagueId : first.leagueId;
      }
      for (const division of divisions) {
        const result = results.get(division.id)!;
        const preview = result.ok ? result.preview : undefined;
        const current = division.id === first.currentLeagueId;
        let card = cards.get(division.id);
        if (!card) {
          card = button('', () => {
            selectedId = division.id;
            showSelection();
          }, { class: 'nrl-league-choice' });
          card.setAttribute('data-nrl-league-choice', division.id);
          card.setAttribute('aria-controls', DETAIL_ID);
          cards.set(division.id, card);
        }
        const access = !preview ? 'Unavailable' : !preview.eligible ? 'Locked' : preview.evidence ? 'Unlocked' : 'Eligible';
        card.replaceChildren(
          el('span', { text: preview?.leagueName ?? division.name }),
          el('span', { class: 'nrl-league-access', text: current ? `Current · ${access}` : access }),
        );
        card.setAttribute('data-eligibility', !preview ? 'unavailable' : preview.eligible ? 'eligible' : 'locked');
      }
      // Preserve controls and keyboard focus when only the quote changes.
      const order = divisions.map(d => cards.get(d.id)!);
      if (order.length !== choices.children.length || order.some((node, i) => choices.children[i] !== node)) {
        choices.replaceChildren(...order);
      }
      if (confirm.parentNode !== footer) footer.append(confirm);
    } else {
      title.textContent = 'League choice unavailable';
      confirm.remove();
    }
    if (first) {
      showSelection(message);
    } else {
      selected = undefined;
      const refusal = [...results.values()].find(r => !r.ok);
      status.textContent = message || refusal?.message || 'This career has no league choice available.';
    }
  }

  // Keep focus within this dialog while a career is waiting for a decision.
  content.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }
    if (e.key !== 'Tab') return;
    const last = confirm.isConnected ? confirm : dismiss;
    if (e.shiftKey && document.activeElement === dismiss) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      dismiss.focus();
    }
  });

  refresh();
  const stopScrollHint = hintScroll(detail);
  const backdrop = openModal(content, {
    class: 'nrl-league-selection-modal',
    onRemove: () => {
      stopScrollHint();
      if (opener?.isConnected && opener instanceof HTMLElement) opener.focus();
    },
  });
  (selectedId ? cards.get(selectedId) ?? dismiss : dismiss).focus();
  return backdrop;
}

function hasFinals(definition: CompetitionDefinition): boolean {
  return definition.format.kind === 'league' && definition.format.finalsSize > 0
    && definition.stages.some(stage => stage.kind === 'knockout' && stage.rounds > 0);
}

function lockedReason(preview: LeagueEntryPreview, state: GameState): string {
  if (!preview.requirement) return 'This league is locked.';
  const { leagueId, leagueName } = preview.requirement;
  const source = state.competitions?.world?.divisions.find(division => division.id === leagueId);
  const definition = state.competitions?.instances.find(instance => instance.id === source?.instanceId)?.definition;
  if (!definition) return `A ${leagueName} finals title is required. Its saved season format is unavailable.`;
  return hasFinals(definition)
    ? `Win the ${leagueName} finals title to unlock this league.`
    : `${leagueName} has no finals scheduled, so this season cannot unlock this league. A minor premiership does not grant access.`;
}

function renderPreview(detail: HTMLElement, preview: LeagueEntryPreview, state: GameState, previews: LeagueEntryPreview[]): void {
  const leagueName = (id: string): string => state.competitions?.world?.divisions.find(d => d.id === id)?.name ?? id;
  const clubName = (id: string): string => state.league.clubs.find(c => c.id === id)?.name ?? id;
  const unlock = previews.find(p => p.requirement?.leagueId === preview.leagueId);
  const { evidence, phase } = preview;
  if (evidence) detail.append(el('p', {
    class: 'nrl-league-unlock',
    text: `Permanently unlocked by your Season ${evidence.season} ${leagueName(evidence.leagueId)} finals title.`,
  }));
  if (preview.eligible && !preview.requirement) detail.append(el('p', {
    class: 'nrl-league-note', text: 'Available from the start.',
  }));
  if (phase === 'next-season-choice') {
    detail.append(el('p', { class: 'nrl-league-note', text: 'This preview uses squads and signed deals before the annual changes. Training, retirements and recruitment can change squad strength.' }));
  }
  const financials = preview.quote.commitments.find(c => c.clubId === state.clubId);
  const movements = preview.movements.filter(m => m.clubId !== state.clubId);
  const grid = el('div', { class: 'nrl-league-grid' }, formatPanel(preview), fieldPanel(preview, state, clubName));
  if (financials) grid.append(financePanel(financials, !preview.eligible));
  grid.append(rewardPanel(preview, unlock));
  if (movements.length) grid.append(movementPanel(movements, clubName, leagueName));
  detail.append(grid);
}

function panel(title: string, hook: string, ...children: HTMLElement[]): HTMLElement {
  return el('section', { class: 'nrl-league-panel', attrs: { [`data-nrl-league-${hook}`]: '' } },
    el('h3', { text: title }), ...children);
}

function line(label: string, value: string, numeric = false): HTMLElement {
  return el('li', { class: 'nrl-league-row' },
    el('span', { text: label }),
    el('span', { ...(numeric ? { class: 'nrl-num' } : {}), text: value }),
  );
}

function weekRanges(ids: readonly number[]): string {
  if (!ids.length) return 'None scheduled';
  const ranges: string[] = [];
  let start = ids[0]!;
  let end = start;
  for (const week of ids.slice(1)) {
    if (week === end + 1) {
      end = week;
    } else {
      ranges.push(start === end ? String(start) : `${start}–${end}`);
      start = end = week;
    }
  }
  ranges.push(start === end ? String(start) : `${start}–${end}`);
  return `${ids.length === 1 ? 'Week' : 'Weeks'} ${ranges.join(', ')}`;
}

function formatPanel(preview: LeagueEntryPreview): HTMLElement {
  const { definition, fieldIds, slots, trialSlots } = preview;
  const { format, lineup, matchRules } = definition;
  return panel('Season format', 'format', el('ul', { class: 'nrl-league-rows' },
    line(lineup.onField === 9 ? 'Nines' : 'Match format', `${lineup.onField} a side · ${matchRules.halfMinutes}-minute halves`),
    line('Field', `${fieldIds.length} clubs`),
    line('Calendar', weekRanges(slots.map(slot => slot.id))),
    line('Trials', weekRanges(trialSlots)),
    ...(format.kind === 'league' ? [line('Finals field', format.finalsSize ? `Top ${format.finalsSize} clubs` : 'No finals')] : []),
    ...definition.stages.map(stage => line(
      stage.kind === 'league' ? `${stage.rounds} regular rounds` : `${stage.name} · ${stage.rounds} ${stage.rounds === 1 ? 'round' : 'rounds'}`,
      weekRanges(stage.slotIds ?? []),
    )),
  ));
}

function fieldPanel(preview: LeagueEntryPreview, state: GameState, clubName: (id: string) => string): HTMLElement {
  const { strength, quote, phase, eligible, leagueName } = preview;
  const listed = preview.fieldIds.includes(state.clubId);
  const caption = eligible ? 'Proposed field' : phase === 'initial-choice' ? `Current ${leagueName} clubs` : 'Field if eligible';
  return panel(caption, 'field',
    el('p', { class: 'nrl-league-note', text: listed
      ? `Strength compares squads.${hasFinals(preview.definition) ? ' Finals titles determine access.' : ''}`
      : 'Strength of the current clubs in this league.' }),
    ...(listed ? [el('p', { class: 'nrl-league-club-strength' },
      el('span', { text: `${state.clubName} · your club` }),
      el('strong', { class: 'nrl-num', text: String(squadStrength(state.squad)) }),
    )] : []),
    el('p', { class: 'nrl-league-note', text: `${listed ? 'Opponents' : 'Clubs'} · ${strength.min} low · ${strength.mean.toLocaleString('en-US', { maximumFractionDigits: 1 })} average · ${strength.max} high` }),
    el('ul', { class: 'nrl-league-rows' }, ...quote.opponents.map(club => line(clubName(club.clubId), String(club.strength), true))),
  );
}

function financePanel(quote: ClubCommitmentQuote, hypothetical: boolean): HTMLElement {
  const currentCap = annualCapQuote(quote.previousTier, quote.purchasedLevel, quote.earnedBasisPoints);
  const increasing = quote.cap > currentCap;
  return panel('Your club’s salary cap', 'finance',
    ...(hypothetical ? [el('p', { class: 'nrl-league-note', text: 'Hypothetical cap and commitments if eligible. Your club has not entered this league.' })] : []),
    el('p', { class: 'nrl-league-note', text: 'Your club keeps its salary cap when moving down.' }),
    el('ul', { class: 'nrl-league-rows' },
      line('Annual base cap', fmtMoney(quote.baseCap), true),
      ...(quote.purchasedAddition ? [line('Purchased addition', `+${fmtMoney(quote.purchasedAddition)}`, true)] : []),
      ...(quote.earnedAddition ? [line('Earned addition', `+${fmtMoney(quote.earnedAddition)}`, true)] : []),
      ...(increasing ? [line('Current cap', fmtMoney(currentCap), true)] : []),
      line(increasing ? 'Cap on entry' : 'Annual cap', fmtMoney(quote.cap), true),
    ),
    el('h4', { text: 'Signed commitments' }),
    el('ul', { class: 'nrl-league-rows' }, ...quote.years.map(year => el('li', {},
      el('div', { class: 'nrl-league-row' }, el('span', { text: `Season ${year.season}` }),
        el('span', { class: 'nrl-num', text: fmtMoney(year.committed) })),
      ...(year.protectedAmount ? [el('p', { class: 'nrl-league-note', text: `${fmtMoney(year.protectedAmount)} in protected terms${year.protectedExcess ? ` · ${fmtMoney(year.protectedExcess)} covered above cap` : ''}.` })] : []),
    ))),
  );
}

function rewardPanel(preview: LeagueEntryPreview, unlock: LeagueEntryPreview | undefined): HTMLElement {
  const matchBase = FINANCE_TIERS[tierForRank(preview.rank)].matchBase;
  const finals = hasFinals(preview.definition);
  const regular = preview.definition.stages.some(stage => stage.kind === 'league' && stage.rounds > 0);
  return panel('Match income and honours', 'rewards',
    el('p', { text: `Ordinary match payments use this league’s ${fmtMoney(matchBase)} match base. The payout depends on match type, venue, result and facilities.` }),
    ...(regular ? [el('p', { text: 'Minor premiership goes to the club leading the regular-season table. A minor premiership does not unlock another league.' })] : []),
    el('p', { text: finals
      ? 'The finals winner earns the league title. There is no extra title cash or salary-cap prize.'
      : 'No finals are scheduled, so no league title can be earned.' }),
    ...(unlock ? [el('p', { text: unlock.evidence
      ? `${unlock.leagueName} is already unlocked permanently.`
      : finals ? `Winning this league’s finals title unlocks ${unlock.leagueName} permanently.`
        : `${unlock.leagueName} cannot be unlocked through this season because no finals title is available.` })] : []),
  );
}

function movementPanel(movements: LeagueMovement[], clubName: (id: string) => string, leagueName: (id: string) => string): HTMLElement {
  return panel('Other clubs moving', 'movements',
    el('p', { text: 'Each crossed league fills a vacancy using last season’s regular standings. Moving up sends its lowest-placed club down. Moving down brings its highest-placed club up.' }),
    el('ul', { class: 'nrl-league-rows' }, ...movements.map(m => line(
      clubName(m.clubId), `${leagueName(m.fromLeagueId)} → ${leagueName(m.toLeagueId)}`,
    ))),
  );
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = el('style', { text: CSS });
  style.id = STYLE_ID;
  document.head.append(style);
}

const CSS = `
.nrl-modal.nrl-league-selection-modal {
  width: min(840px, calc(100vw - 24px - var(--nrl-safe-l, 0px) - var(--nrl-safe-r, 0px)));
  max-width: none;
  max-height: none;
  height: min(680px, calc(100vh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px)));
  height: min(680px, calc(100dvh - 16px - var(--nrl-safe-t, 0px) - var(--nrl-safe-b, 0px)));
  margin: var(--nrl-safe-t, 0px) var(--nrl-safe-r, 0px) var(--nrl-safe-b, 0px) var(--nrl-safe-l, 0px);
  padding: 0;
  overflow: hidden;
}
.nrl-modal.nrl-league-selection-modal:has(.nrl-league-choices[hidden]) { height: auto; }
.nrl-league-selection {
  height: 100%;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  grid-template-areas: 'heading' 'choices' 'detail' 'footer';
}
.nrl-league-head, .nrl-league-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 12px;
}
.nrl-league-head { grid-area: heading; }
.nrl-league-head h2, .nrl-league-footer p { margin: 0; }
.nrl-league-choices {
  grid-area: choices;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 8px;
  padding: 3px 12px 8px;
}
.nrl-league-choices[hidden] { display: none; }
.nrl-btn.nrl-league-choice {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  white-space: normal;
  overflow-wrap: anywhere;
  font-size: 0.875rem;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
}
.nrl-league-choices .nrl-btn.nrl-league-choice[aria-pressed="true"] {
  border-color: var(--nrl-accent);
  background: var(--nrl-me);
}
.nrl-league-access {
  font-size: 0.75rem;
  color: var(--nrl-text-2);
  text-transform: none;
}
.nrl-league-detail {
  grid-area: detail;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 12px 10px;
  --nrl-scroll-fade: 20px;
}
.nrl-league-detail:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -3px; }
.nrl-league-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 8px;
}
.nrl-league-panel {
  min-width: 0;
  background: var(--nrl-raised);
  border-radius: 10px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
}
.nrl-league-panel :is(h3, h4, p), .nrl-league-detail > p { margin: 0 0 6px; }
.nrl-league-panel h4 { margin-top: 10px; }
.nrl-league-panel > :last-child { margin-bottom: 0; }
.nrl-league-note { color: var(--nrl-text-2); }
.nrl-league-unlock { color: var(--nrl-pos); font-weight: 600; }
.nrl-league-rows { margin: 0; padding: 0; list-style: none; }
.nrl-league-rows > li + li { border-top: 1px solid var(--nrl-line); }
.nrl-league-row, .nrl-league-club-strength {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 3px 0;
}
.nrl-league-row > span:first-child { min-width: min(11ch, 42%); }
.nrl-league-row > span:last-child, .nrl-league-club-strength > strong { text-align: right; }
.nrl-league-footer {
  grid-area: footer;
  border-top: 1px solid var(--nrl-line);
}
.nrl-league-footer p { flex: 1; min-width: 0; overflow-wrap: anywhere; color: var(--nrl-text-2); }
.nrl-league-footer .nrl-btn { align-self: flex-end; }
.nrl-league-selection .nrl-league-footer .nrl-btn.nrl-btn-primary[aria-disabled="true"] {
  color: var(--nrl-text-2);
  background: var(--nrl-raised);
  cursor: default;
  transform: none;
}
@media (max-width: 400px) {
  .nrl-league-grid { grid-template-columns: minmax(0, 1fr); }
  .nrl-league-footer { flex-wrap: wrap; }
  .nrl-league-footer p { flex-basis: 100%; }
  .nrl-league-footer p:empty { display: none; }
  .nrl-league-footer .nrl-btn { margin-left: auto; }
}
`;
