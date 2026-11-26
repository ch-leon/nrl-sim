// src/ui/cardWeek.ts — the card week's pick (#846, Labs): three cards on show,
// take one (a trait card asks who gets it) or pass, and the last match's lines
// below them. Opens by itself once a pick is new and nothing else is on screen,
// and from the HUD's card chip. It never holds up Advance Week.
//
// The rules live in systems/cardWeek.ts; this module renders its view model and
// passes the tap back through chooseCard() / passPick(). No Phaser.

import { bus } from '../core/events';
import { getState, type GameState, type Position } from '../core/state';
import { advanceInProgress } from '../core/advance';
import { weekHeld } from '../core/time';
import { cardDefById, type CardTier } from '../data/cards';
import { ROMAN, TRAITS } from '../data/traits';
import { cardOfferView, chooseCard, passPick, type CardFaceView } from '../systems/cardWeek';
import { POSITION_SHORT } from '../systems/lineup';
import { fmtMoney } from '../utils/money';
import { el, button, openModal, closeModal, activeScreen, dialogOpen, ensureStyles } from './dom';
import { MATCH_ACTIVE_CLASS } from './screens/matchOverlay';
import { isTutorialActive } from './tutorial';

// ── View model (pure) ─────────────────────────────────────────────────────────

/** A tier in words, so gold and grey never rest on colour alone. */
export function tierLabel(tier: CardTier): string {
  return tier === 'gold' ? 'Gold' : 'Grey';
}

/** "Replaces Sam Smith (release costs $4,000)", or null when he fits as things are. */
export function replacesLine(face: Pick<CardFaceView, 'player'>): string | null {
  const p = face.player;
  if (!p?.replacesName) return null;
  return p.releaseCost ? `Replaces ${p.replacesName} (release costs ${fmtMoney(p.releaseCost)})` : `Replaces ${p.replacesName}`;
}

/** A player card's facts: "HB · 79 · $49,300 a year". */
export function playerLine(face: Pick<CardFaceView, 'player'>): string | null {
  const p = face.player;
  return p ? `${POSITION_SHORT[p.position]} · ${p.rating} · ${fmtMoney(p.salary)} a year` : null;
}

export interface TraitTargetRow { playerId: string; name: string; position: Position; label: string; starter: boolean }

/** Who a trait card can go to, starters first (in the nine's order), then the rest by name: "Playmaker II". */
export function traitTargetRows(state: GameState, face: CardFaceView): TraitTargetRow[] {
  const def = cardDefById(face.cardId);
  if (!def || def.kind !== 'trait') return [];
  const starters = state.lineup.starters;
  const byId = new Map(state.squad.map((p) => [p.id, p]));
  const rows = (face.targets ?? []).flatMap((t) => {
    const p = byId.get(t.playerId);
    if (!p) return [];
    const at = starters.indexOf(t.playerId);
    return [{ row: { playerId: t.playerId, name: t.name, position: p.position, label: `${TRAITS[def.trait].name} ${ROMAN[t.level]}`, starter: at >= 0 }, at }];
  });
  rows.sort((a, b) => (a.at < 0 ? 99 : a.at) - (b.at < 0 ? 99 : b.at) || a.row.name.localeCompare(b.row.name));
  return rows.map((r) => r.row);
}

export interface LastMatchRowView { playerId: string; name: string; position: string; tries: number; lineBreaks: number; tackles: number; card: boolean }
export interface LastMatchView { opponent: string; rows: LastMatchRowView[] }

/** The last match's lines, each marked when the man joined from a card or holds a card trait. Null before the first match. */
export function lastMatchView(state: GameState): LastMatchView | null {
  const cw = state.cardWeek;
  const m = cw?.lastMatch;
  if (!cw || !m) return null;
  const byId = new Map(state.squad.map((p) => [p.id, p]));
  const marked = new Set([...cw.cardPlayers, ...cw.cardTraits.map((t) => t.playerId)]);
  return {
    opponent: m.opponentName,
    rows: m.rows.map((r) => {
      const p = byId.get(r.playerId);
      return { playerId: r.playerId, name: r.name, position: p ? POSITION_SHORT[p.position] : '—', tries: r.tries, lineBreaks: r.lineBreaks, tackles: r.tackles, card: marked.has(r.playerId) };
    }),
  };
}

/** Picks waiting with one on show (the HUD chip's count); 0 on a career without the card week. */
export function cardChipCount(state: GameState): number {
  const cw = state.cardWeek;
  return cw?.offer ? cw.owed : 0;
}

/** The pick's header line. */
export function picksWaitingText(owed: number): string {
  return owed === 1 ? '1 pick waiting' : `${owed} picks waiting`;
}

// ── DOM ───────────────────────────────────────────────────────────────────────

/** One card's face: its tier, title, effect and (for a player) who, how good, what he costs and whom he replaces. */
export function cardFace(face: CardFaceView, onTake: (index: number) => void): HTMLElement {
  const b = button('', () => { if (!face.refusal) onTake(face.index); }, { class: `nrl-card-face nrl-card-${face.tier}` });
  b.setAttribute('data-card-choice', String(face.index));
  b.setAttribute('data-card-id', face.cardId);
  if (face.refusal) b.disabled = true;
  b.append(
    el('span', { class: 'nrl-card-tier', text: tierLabel(face.tier) }),
    el('span', { class: 'nrl-card-title', text: face.title }),
    el('span', { class: 'nrl-card-effect', text: face.effect }),
  );
  const who = playerLine(face);
  if (face.player && who) b.append(el('span', { class: 'nrl-card-player', text: `${face.player.name}` }), el('span', { class: 'nrl-card-facts', text: who }));
  const out = replacesLine(face);
  if (out) b.append(el('span', { class: 'nrl-card-replaces', text: out }));
  if (face.refusal) b.append(el('span', { class: 'nrl-card-refusal', text: face.refusal }));
  return b;
}

/** The last match's panel: open with its lines, or a closed line before the first match. */
export function lastMatchPanel(view: LastMatchView | null): HTMLElement {
  const box = el('details', { class: 'nrl-card-last', attrs: { 'data-card-last-match': '' } });
  if (!view) {
    box.append(el('summary', { text: 'Last match: none played yet' }));
    return box;
  }
  box.setAttribute('open', '');
  box.append(el('summary', { text: `Last match v ${view.opponent}` }));
  const head = el('div', { class: 'nrl-card-last-row nrl-card-last-head' },
    el('span', { text: 'Player' }), el('span', { text: 'Pos' }), el('span', { text: 'Tries' }), el('span', { text: 'Breaks' }), el('span', { text: 'Tackles' }));
  const list = el('div', { class: 'nrl-card-last-list' }, head);
  for (const r of view.rows) {
    const name = el('span', { class: 'nrl-card-last-name', text: r.name });
    if (r.card) name.append(' ', el('span', { class: 'nrl-card-mark', text: 'card', attrs: { title: 'Joined from a card or holds a card trait' } }));
    list.append(el('div', { class: 'nrl-card-last-row', attrs: { 'data-card-last-row': r.playerId } },
      name, el('span', { text: r.position }), el('span', { text: String(r.tries) }), el('span', { text: String(r.lineBreaks) }), el('span', { text: String(r.tackles) })));
  }
  box.append(list);
  return box;
}

type Step = { kind: 'cards' } | { kind: 'targets'; index: number } | { kind: 'pass' };

/**
 * Open the pick. A take shows its outcome line over the next pick, or closes
 * when none is owed. A region dialog: the HUD and nav stay usable. Null with
 * no pick on show.
 */
export function openCardPick(): HTMLElement | null {
  if (cardChipCount(getState()) === 0) return null;
  ensureCardStyles();
  const content = el('div', { class: 'nrl-card-pick', attrs: { 'data-card-pick': '' } });
  let step: Step = { kind: 'cards' };
  let outcome = '';
  let problem = '';

  const take = (index: number, targetId?: string): void => {
    const r = chooseCard(index, targetId);
    if (!r.ok) { problem = r.reason; step = { kind: 'cards' }; render(); return; }
    outcome = r.outcome;
    problem = '';
    step = { kind: 'cards' };
    if (cardChipCount(getState()) === 0) {
      closeModal();
      bus.emit('ui:notify', { text: outcome, kind: 'success' });
      return;
    }
    render();
  };

  const render = (): void => {
    const s = getState();
    const view = cardOfferView(s);
    content.replaceChildren();
    if (view.cards.length === 0) { closeModal(); return; }
    content.append(
      el('div', { class: 'nrl-card-head' },
        el('h2', { text: 'Pick a card' }),
        el('p', { class: 'nrl-decisions-count', text: picksWaitingText(view.owed), attrs: { 'data-card-owed': String(view.owed) } })),
    );
    if (outcome) content.append(el('p', { class: 'nrl-card-outcome', text: outcome, attrs: { 'data-card-outcome': '', role: 'status' } }));
    if (problem) content.append(el('p', { class: 'nrl-card-problem', text: problem, attrs: { role: 'alert' } }));

    if (step.kind === 'targets') {
      const face = view.cards[step.index];
      if (!face) { step = { kind: 'cards' }; render(); return; }
      const rows = traitTargetRows(s, face);
      const list = el('div', { class: 'nrl-card-targets', attrs: { role: 'list' } });
      for (const r of rows) {
        const b = button('', () => take(face.index, r.playerId), { class: 'nrl-card-target' });
        b.setAttribute('data-card-target', r.playerId);
        b.setAttribute('role', 'listitem');
        b.append(el('span', { class: 'nrl-card-target-name', text: r.name }),
          el('span', { class: 'nrl-card-target-pos', text: POSITION_SHORT[r.position] }),
          el('span', { class: 'nrl-card-target-level', text: r.label }));
        list.append(b);
      }
      const back = button('◂ Back to the cards', () => { step = { kind: 'cards' }; render(); }, { class: 'nrl-btn-outline' });
      back.setAttribute('data-card-back', '');
      content.append(el('p', { class: 'nrl-decisions-note', text: `${face.title}: who gets it?` }), list, el('div', { class: 'nrl-decisions-actions' }, back));
      return;
    }

    const row = el('div', { class: 'nrl-card-row' });
    for (const face of view.cards) {
      row.append(cardFace(face, (index) => {
        if (face.kind === 'trait') { step = { kind: 'targets', index }; problem = ''; render(); return; }
        take(index);
      }));
    }
    content.append(row);

    const actions = el('div', { class: 'nrl-decisions-actions nrl-card-actions' });
    if (step.kind === 'pass') {
      const keep = button('Keep picking', () => { step = { kind: 'cards' }; render(); }, { class: 'nrl-btn-outline' });
      const yes = button('Pass', () => {
        const r = passPick();
        if (!r.ok) { problem = r.reason; step = { kind: 'cards' }; render(); return; }
        outcome = 'Pick passed.';
        step = { kind: 'cards' };
        if (cardChipCount(getState()) === 0) { closeModal(); return; }
        render();
      }, { class: 'nrl-btn-primary' });
      yes.setAttribute('data-card-pass-confirm', '');
      actions.append(el('p', { class: 'nrl-card-pass-ask', text: 'Pass this pick? No card is taken and it is gone.' }), keep, yes);
    } else {
      const pass = button('Pass', () => { step = { kind: 'pass' }; render(); }, { class: 'nrl-btn-outline' });
      pass.setAttribute('data-card-pass', '');
      actions.append(pass);
    }
    content.append(actions, lastMatchPanel(lastMatchView(s)));
  };

  const node = openModal(content, { class: 'nrl-decisions-modal nrl-card-modal', region: true, closeButton: true });
  render();
  return node;
}

/** The pick's identity: a new pick on show, or another owed, makes it new. */
function pickKey(state: GameState): string | null {
  const cw = state.cardWeek;
  if (!cw?.offer || cw.owed <= 0) return null;
  return `${cw.history.length}:${cw.owed}:${cw.offer.season}:${cw.offer.week}`;
}

/**
 * Open the pick by itself (#846): at the start of a new card-week career and
 * after a week that brings another pick, once each, when nothing is in the way:
 * no advance, held week or match on screen, no dialog (the week summary and
 * the decisions go first), no sheet and no tutorial. Returns unsubscribe.
 */
export function initCardWeekPick(): () => void {
  let shown = (() => { const s = getState(); return s.cardWeek && s.cardWeek.history.length === 0 ? null : pickKey(s); })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  const stopPoll = (): void => { if (poll) clearInterval(poll); poll = undefined; };

  const tryShow = (): void => {
    const s = getState();
    const key = pickKey(s);
    if (!key || key === shown) { stopPoll(); return; }
    if (s.sacked || advanceInProgress() || weekHeld() || dialogOpen() || activeScreen() !== null || isTutorialActive()) return;
    if (typeof document !== 'undefined' && document.body?.classList.contains(MATCH_ACTIVE_CLASS)) return;
    shown = key;
    stopPoll();
    openCardPick();
  };
  // After the week summary's own task, so it (and any decision) is up first and the pick waits behind it.
  const soon = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tryShow, 50);
    // Nothing announces a dialog closing or the tutorial's end: look again now and then.
    if (!poll) poll = setInterval(tryShow, 400);
  };
  const offWeek = bus.on('week:advanced', soon);
  soon();
  return () => {
    offWeek();
    if (timer) clearTimeout(timer);
    stopPoll();
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_STYLE_ID = 'nrl-card-week-styles';

function ensureCardStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(CARD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CARD_STYLE_ID;
  style.textContent = CARD_CSS;
  document.head.appendChild(style);
}

/** Three cards side by side when there is width, stacked in portrait; rem throughout, so Larger text scales it. */
export const CARD_CSS = `
.nrl-dialog-region .nrl-card-modal { width: min(100%, 760px); }
.nrl-card-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 12px; padding-right: 44px; }
.nrl-card-head h2 { margin: 0; }
.nrl-card-outcome { margin: 4px 0 8px; padding: 6px 10px; border-radius: 8px; color: var(--nrl-pos); background: color-mix(in srgb, var(--nrl-pos) 12%, transparent); font-size: 0.875rem; overflow-wrap: anywhere; }
.nrl-card-problem { margin: 4px 0 8px; color: var(--nrl-neg); font-size: 0.875rem; overflow-wrap: anywhere; }
.nrl-card-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr)); gap: 8px; }
.nrl-btn.nrl-card-face {
  height: auto; min-height: 48px; width: 100%; min-width: 0;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 10px 12px; border-radius: 14px; text-align: left; text-transform: none; letter-spacing: 0; white-space: normal;
  background: var(--nrl-panel); border: 1px solid var(--nrl-line); border-top-width: 4px;
}
.nrl-btn.nrl-card-face.nrl-card-gold { border-top-color: var(--nrl-accent); }
.nrl-btn.nrl-card-face.nrl-card-grey { border-top-color: var(--nrl-bench); }
.nrl-btn.nrl-card-face:disabled { opacity: 0.6; }
@media (hover: hover) and (pointer: fine) { .nrl-btn.nrl-card-face:hover:not(:disabled) { background: var(--nrl-raised-hover); } }
.nrl-btn.nrl-card-face:active:not(:disabled) { background: var(--nrl-raised-hover); }
.nrl-card-tier { font-family: var(--nrl-f-num); font-size: 0.6875rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-card-gold .nrl-card-tier { color: var(--nrl-accent); }
.nrl-card-title { font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.2; color: var(--nrl-text); overflow-wrap: anywhere; }
.nrl-card-effect { font-size: 0.875rem; line-height: 1.35; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-card-player { font-weight: 700; font-size: 0.9375rem; color: var(--nrl-text); overflow-wrap: anywhere; }
.nrl-card-facts { font-family: var(--nrl-f-num); font-size: 0.8125rem; color: var(--nrl-text); }
.nrl-card-replaces { font-size: 0.8125rem; color: var(--nrl-neg); overflow-wrap: anywhere; }
.nrl-card-refusal { font-size: 0.8125rem; color: var(--nrl-neg); overflow-wrap: anywhere; }
.nrl-card-actions { align-items: center; }
.nrl-card-actions .nrl-btn { flex: 0 1 10rem; }
.nrl-card-pass-ask { flex: 1 1 100%; margin: 0; color: var(--nrl-text-2); font-size: 0.875rem; }
.nrl-card-targets { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow-y: auto; overscroll-behavior: contain; }
.nrl-btn.nrl-card-target { height: auto; min-height: 44px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 6px 12px; text-transform: none; letter-spacing: 0; text-align: left; white-space: normal; background: var(--nrl-panel); border: 1px solid var(--nrl-line); border-radius: 10px; }
.nrl-card-target-name { font-weight: 700; overflow-wrap: anywhere; }
.nrl-card-target-pos { font-family: var(--nrl-f-num); font-size: 0.8125rem; color: var(--nrl-muted); }
.nrl-card-target-level { font-size: 0.8125rem; color: var(--nrl-pos); }
.nrl-card-last { margin-top: 12px; border-top: 1px solid var(--nrl-line); padding-top: 8px; }
.nrl-card-last summary { cursor: pointer; font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; min-height: 32px; display: flex; align-items: center; }
.nrl-card-last-list { display: flex; flex-direction: column; gap: 2px; font-size: 0.8125rem; }
.nrl-card-last-row { display: grid; grid-template-columns: minmax(0, 1fr) 2.5rem 3rem 3.5rem 3.75rem; gap: 6px; align-items: baseline; padding: 2px 0; }
.nrl-card-last-row > span:not(:first-child) { text-align: right; font-family: var(--nrl-f-num); }
.nrl-card-last-head { color: var(--nrl-muted); font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-card-last-name { overflow-wrap: anywhere; }
.nrl-card-mark { display: inline-block; padding: 0 5px; border-radius: 6px; font-size: 0.6875rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); border: 1px solid var(--nrl-accent); }
/* Short landscape phones: tighter, so three cards and the Pass row fit above the fold. */
@media (max-height: 500px) {
  .nrl-btn.nrl-card-face { padding: 6px 10px; gap: 2px; }
  .nrl-card-title { font-size: 0.9375rem; }
  .nrl-card-effect, .nrl-card-replaces, .nrl-card-refusal, .nrl-card-facts { font-size: 0.75rem; line-height: 1.3; }
  .nrl-card-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`;
