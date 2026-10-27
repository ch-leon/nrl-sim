// src/ui/decisions.ts — event cards (GitHub #75) answered in a popup of their own,
// and the advance asking first (UI cleanup chunk 2).
//
// #345: News stays a plain feed. Pending decisions are answered here, one card at
// a time with its choices as big buttons; News and the HUD's Advance Week badge
// open it. #346: a choice shows what is sure and each risk on its own line.
// #338: Advance Week, and the ▾ runs, never take a default unasked: with a card
// waiting they list what is pending and let the player answer or take the
// defaults. #350 (N4): a long advance that stops on a new card opens it here,
// with Keep advancing once it is answered.
//
// The cards live in GameState (systems/events.ts); this module renders them and
// passes the tapped choice back through chooseEvent(). No Phaser.

import { bus } from '../core/events';
import { getState, type GameState, type PendingEvent } from '../core/state';
import type { AdvanceRun } from '../core/advance';
import { remainingTarget, targetSpan, type AdvanceTarget } from '../core/advanceRules';
import { cardById } from '../data/events';
import { absWeek, chooseEvent, describeChoice, fillText } from '../systems/events';
import { hasStaff } from '../systems/staff';
import { NEW_CONTRACT_WEEKS } from '../systems/freeagency';
import { el, button, openModal, closeModal, activeScreen, dialogOpen } from './dom';
import { ADVANCE_FAILED_TEXT } from './hud';

// ── View-model (pure) ─────────────────────────────────────────────────────────

export interface DecisionChoiceView {
  index: number;
  label: string;
  /** What surely happens ('' when the choice is only a gamble). */
  sure: string;
  /** Each chance, e.g. "25% risk: a 2-3 week ban, −$2,500" (#346). */
  risks: string[];
  isDefault: boolean;
}

export interface DecisionView {
  id: string;
  title: string;
  text: string;
  /** "S1 · Week 5" when it was drawn. */
  stamp: string;
  /** Advances until the default is taken: 1 means the next one takes it. */
  advancesLeft: number;
  defaultLabel: string;
  choices: DecisionChoiceView[];
}

/**
 * How many advances a card survives unanswered: the tick of week `expiresAt`
 * takes its default, so 1 means the next Advance Week does. A season-end card
 * (the season-end trip) expires in the week it is offered: 1 from the start.
 */
export function advancesLeft(ev: Pick<PendingEvent, 'expiresAt'>, state: Pick<GameState, 'season' | 'week'>): number {
  return Math.max(1, ev.expiresAt - absWeek(state.season, state.week) + 1);
}

/** Pending event cards as plain view data, oldest first. Cards no longer in the deck are skipped. */
export function decisionViews(state: GameState): DecisionView[] {
  const out: DecisionView[] = [];
  const welfare = hasStaff(state, 'welfare');
  for (const ev of state.eventDeck.pending) {
    const card = cardById(ev.cardId);
    if (!card) continue;
    const ctx = { subjectName: ev.subjectName, clubName: state.clubName, vars: ev.vars };
    out.push({
      id: ev.id,
      title: card.title,
      text: fillText(card.text, ctx),
      stamp: `S${ev.season} · Week ${ev.week}`,
      advancesLeft: advancesLeft(ev, state),
      defaultLabel: card.choices[card.defaultChoice]?.label ?? '',
      choices: card.choices.map((c, index) => {
        const signs = ev.fee !== undefined && c.effects.some((e) => e.kind === 'signSubject');
        const split = signs
          ? { sure: `−$${ev.fee!.toLocaleString('en-US')} fee, ${NEW_CONTRACT_WEEKS}-week deal`, risks: [] }
          : describeChoice(c.effects, { welfare });
        return { index, label: c.label, ...split, isDefault: index === card.defaultChoice };
      }),
    });
  }
  return out;
}

/** Number of cards waiting for a choice (the News and Advance Week badges). */
export function pendingDecisionCount(state: GameState): number {
  return state.eventDeck.pending.length;
}

/** The card's deadline, in advances rather than calendar weeks. */
export function deadlineText(v: Pick<DecisionView, 'advancesLeft' | 'defaultLabel'>): string {
  const when = v.advancesLeft === 1 ? 'Answer before you advance' : `${v.advancesLeft} weeks to answer`;
  return `${when}, or it's "${v.defaultLabel}".`;
}

/** What Advance Week asks before a run of `span` weeks, or null when nothing is pending. */
export interface AdvanceAsk {
  rows: { id: string; title: string; note: string; due: boolean }[];
  /** Cards whose default this run would take. */
  due: number;
  /** The button that goes ahead without answering. */
  proceed: string;
}

export function advanceAsk(state: GameState, span: number): AdvanceAsk | null {
  const views = decisionViews(state);
  if (views.length === 0) return null;
  const rows = views.map((v) => {
    const due = v.advancesLeft <= span;
    return { id: v.id, title: v.title, due, note: due ? `no answer means "${v.defaultLabel}"` : `${v.advancesLeft} weeks left to answer` };
  });
  const due = rows.filter((r) => r.due).length;
  const proceed = due === 0 ? 'Advance, answer later' : due === 1 ? 'Take the default and advance' : 'Take the defaults and advance';
  return { rows, due, proceed };
}

/** Runs longer than this confirm first (#350 H3); ×4 weeks never does. */
export const CONFIRM_SPAN = 4;

/** The confirm's question for a long run, or null when the run is short enough to go at once. */
export function longAdvanceQuestion(span: number): string | null {
  return span > CONFIRM_SPAN ? `Play ${span} weeks? It stops for decisions.` : null;
}

/** Keep advancing's label for what is left of a run. */
export function keepAdvancingLabel(rest: AdvanceTarget): string {
  switch (rest.kind) {
    case 'weeks': return `Keep advancing (${rest.weeks === 1 ? '1 week' : `${rest.weeks} weeks`})`;
    case 'finals': return 'Keep advancing to finals';
    case 'seasonEnd': return 'Keep advancing to season end';
  }
}

// ── DOM ───────────────────────────────────────────────────────────────────────

/** One pixel card: the story, its deadline, and a big button per choice with its sure line and risks. */
export function decisionCard(view: DecisionView, onChoose: (id: string, index: number) => void): HTMLElement {
  const card = el('div', { class: 'nrl-event-card', attrs: { 'data-event-id': view.id } });
  card.append(
    el('div', { class: 'nrl-event-head' },
      el('div', { class: 'nrl-event-title', text: view.title }),
      el('div', { class: 'nrl-event-meta', text: `${view.stamp} · ${deadlineText(view)}` })),
    el('p', { class: 'nrl-event-text', text: view.text }),
  );
  const choices = el('div', { class: 'nrl-event-choices' });
  for (const c of view.choices) {
    const b = button('', () => onChoose(view.id, c.index), { class: 'nrl-event-choice' });
    b.setAttribute('data-event-choice', String(c.index));
    b.append(el('span', { class: 'nrl-event-choice-label', text: c.label }));
    if (c.sure) {
      b.append(el('span', { class: 'nrl-event-choice-hint', text: c.risks.length > 0 ? `Sure: ${c.sure}` : c.sure }));
    }
    for (const r of c.risks) b.append(el('span', { class: 'nrl-event-choice-risk', text: r }));
    choices.append(b);
  }
  card.append(choices);
  return card;
}

/**
 * Open the decisions popup on the oldest pending card. Each answer shows the
 * next; with none left it closes, or, given `then` (an advance waiting on the
 * answers), offers its button. A region dialog: the HUD and nav stay usable.
 */
export function openDecisions(opts: { then?: { label: string; run: () => void } } = {}): HTMLElement | null {
  const content = el('div', { class: 'nrl-decisions', attrs: { 'data-decisions': '' } });
  const render = (): void => {
    const views = decisionViews(getState());
    content.replaceChildren();
    if (views.length === 0) {
      if (!opts.then) {
        closeModal();
        return;
      }
      const then = opts.then;
      const go = button(then.label, () => { closeModal(); then.run(); }, { class: 'nrl-decisions-go' });
      go.setAttribute('data-keep-advancing', '');
      content.append(
        el('h2', { text: 'All answered' }),
        el('p', { class: 'nrl-decisions-note', text: 'Nothing else is waiting on you.' }),
        el('div', { class: 'nrl-decisions-actions' }, go),
      );
      return;
    }
    const v = views[0]!;
    content.append(
      el('h2', { text: views.length > 1 ? `Decision · 1 of ${views.length}` : 'Decision' }),
      decisionCard(v, (id, index) => {
        chooseEvent(id, index);
        render();
      }),
    );
  };
  if (pendingDecisionCount(getState()) === 0 && !opts.then) return null;
  const node = openModal(content, { class: 'nrl-decisions-modal', region: true, closeButton: true });
  render();
  return node;
}

/**
 * Advance only once the pending cards have been seen (#338). With none, `proceed`
 * runs at once. Otherwise a dialog lists them, with what this run of `span`
 * weeks would take by default, and offers Answer now (the decisions popup, then
 * Keep advancing) or going ahead, which takes the defaults that fall due.
 */
export function askBeforeAdvance(span: number, proceed: () => void): void {
  const ask = advanceAsk(getState(), span);
  if (!ask) {
    proceed();
    return;
  }
  const list = el('ul', { class: 'nrl-ask-list' });
  for (const r of ask.rows) {
    list.append(el('li', { class: `nrl-ask-row${r.due ? ' nrl-ask-due' : ''}`, attrs: { 'data-ask-row': r.id } },
      el('span', { class: 'nrl-ask-title', text: r.title }), el('span', { class: 'nrl-ask-note', text: r.note })));
  }
  const answer = button('Answer now', () => openDecisions({ then: { label: 'Keep advancing', run: () => askBeforeAdvance(span, proceed) } }), { class: 'nrl-ask-answer' });
  answer.setAttribute('data-ask-answer', '');
  const go = button(ask.proceed, () => { closeModal(); proceed(); }, { class: 'nrl-ask-proceed' });
  go.setAttribute('data-ask-proceed', '');
  const n = ask.rows.length;
  const content = el('div', { class: 'nrl-ask', attrs: { 'data-advance-ask': '' } },
    el('h2', { text: n === 1 ? 'A decision is waiting' : `${n} decisions are waiting` }),
    list,
    el('div', { class: 'nrl-decisions-actions' }, answer, go));
  openModal(content, { class: 'nrl-decisions-modal', region: true, closeButton: true });
}

/**
 * A ▾ run that asks first (#338) and, when it stops on a new card with weeks of
 * it still to play (#350 N4), opens that card with Keep advancing to the same
 * end. Not over another screen or dialog (the season review at the rollover):
 * the badge and News say the card is there. Errors in the run are posted, as
 * the HUD does for its own runs.
 */
export function advanceUntilAsked(target: AdvanceTarget, run: (t: AdvanceTarget) => Promise<AdvanceRun>, opts: { confirmed?: boolean } = {}): void {
  const span = targetSpan(target, getState().week);
  const question = pendingDecisionCount(getState()) === 0 && !opts.confirmed ? longAdvanceQuestion(span) : null;
  if (question) {
    confirmLongAdvance(question, () => advanceUntilAsked(target, run, { confirmed: true }));
    return;
  }
  askBeforeAdvance(span, () => {
    const startSeason = getState().season;
    run(target).then((r) => {
      if (r.stop.kind !== 'decision') return;
      const s = getState();
      const rest = remainingTarget(target, { weeksPlayed: r.weeksPlayed, week: s.week, startSeason, season: s.season });
      if (!rest || activeScreen() || dialogOpen()) return;
      openDecisions({ then: { label: keepAdvancingLabel(rest), run: () => advanceUntilAsked(rest, run, { confirmed: true }) } });
    }).catch((err: unknown) => {
      console.error(err);
      bus.emit('ui:notify', { text: ADVANCE_FAILED_TEXT, kind: 'danger' });
    });
  });
}

/** #350 H3: one slip on the ▾ menu must not play out a season. */
function confirmLongAdvance(question: string, go: () => void): void {
  const yes = button('Play', () => { closeModal(); go(); }, { class: 'nrl-ask-answer' });
  yes.setAttribute('data-confirm-advance', '');
  const no = button('Cancel', () => closeModal());
  const content = el('div', { class: 'nrl-ask', attrs: { 'data-advance-confirm': '' } },
    el('h2', { text: question }),
    el('div', { class: 'nrl-decisions-actions' }, yes, no));
  openModal(content, { class: 'nrl-decisions-modal', region: true, closeButton: true });
}
