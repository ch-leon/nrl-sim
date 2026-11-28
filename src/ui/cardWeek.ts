import { bus } from '../core/events';
import { getState, setState, type GameState, type Position } from '../core/state';
import { advanceInProgress } from '../core/advance';
import { saveIfChanged } from '../core/save';
import { CARD_WEEK, cardDefById, type CardTier } from '../data/cards';
import { ROMAN, TRAITS } from '../data/traits';
import { rerollCost, rerollPick, rerollRefusal, cardHandView, cardOfferView, chooseCard, discardHeldCard, passPick, pickBlocked, playChosenCard, preferredCardOffer, unshownCardOffer, type CardFaceView } from '../systems/cardWeek';
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

export interface TraitTargetRow { playerId: string; name: string; position: Position; label: string; starter: boolean; suited: boolean }

/** The level a target holds and would reach: "Last Line I → II", or "Last Line new → I". */
export function traitStepLabel(traitName: string, current: number, level: number): string {
  return `${traitName} ${current ? ROMAN[current as 1 | 2 | 3] : 'new'} → ${ROMAN[level as 1 | 2 | 3]}`;
}

/** Who a trait card can go to, starters first (in the nine's order), then the rest by name, each with his step ("Playmaker I → II"). */
export function traitTargetRows(state: GameState, face: CardFaceView): TraitTargetRow[] {
  const def = cardDefById(face.cardId);
  if (!def || def.kind !== 'trait') return [];
  const starters = state.lineup.starters;
  const byId = new Map(state.squad.map((p) => [p.id, p]));
  const rows = (face.targets ?? []).flatMap((t) => {
    const p = byId.get(t.playerId);
    if (!p) return [];
    const at = starters.indexOf(t.playerId);
    return [{ row: { playerId: t.playerId, name: t.name, position: p.position, label: traitStepLabel(TRAITS[def.trait].name, t.current, t.level), starter: at >= 0, suited: t.suited }, at }];
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
  return cw?.offers.length ?? 0;
}

/** The pick's header line. */
export function picksWaitingText(owed: number, starter = 0): string {
  return `${owed} ${owed === 1 ? 'pick' : 'picks'} waiting${starter ? ` (${starter} starter)` : ''}`;
}

/** One extra line on a face, with its look: plain, a number that helps, a cost, or a note. The words carry the meaning; the colour only repeats it. */
export interface FaceLine { text: string; tone: 'plain' | 'pos' | 'neg' | 'note' }

/**
 * The facts a face shows under its effect line, in order (#846 play-test: enough to
 * choose with). A man not yet here: the club's best there and the gap over him. The
 * dilemma: board patience before and after. A trait: what it does and whom it suits.
 * Staff: the job, the wage as paid at this level, any fee saved and an attack coach's
 * plays. A set play: what it is and any price saved (its name is the detail line).
 * Cash and decrees have none.
 */
export function faceLines(face: CardFaceView): FaceLine[] {
  const out: FaceLine[] = [];
  if (face.floor) {
    out.push({ text: face.floor.line, tone: 'plain' });
    if (face.floor.gap !== null && face.floor.gap > 0) out.push({ text: `+${face.floor.gap} better`, tone: 'pos' });
  }
  if (face.board) out.push({ text: face.board.line, tone: 'neg' });
  if (face.trait) {
    out.push({ text: face.trait.blurb, tone: 'plain' });
    if (face.trait.suits) out.push({ text: `Suits: ${face.trait.suits.join(', ')}`, tone: 'note' });
  }
  if (face.staff) {
    out.push({ text: face.staff.blurb, tone: 'plain' }, { text: `Wage ${fmtMoney(face.staff.wage)} a week`, tone: 'note' });
    if (face.staff.feeSaved > 0) out.push({ text: `Saves the ${fmtMoney(face.staff.feeSaved)} fee`, tone: 'pos' });
    if (face.staff.plays?.length) out.push({ text: `Opens ${face.staff.plays.join(', ')}; each still bought separately`, tone: 'note' });
  }
  if (face.play) {
    out.push({ text: face.play.blurb, tone: 'note' });
    if (face.play.priceSaved > 0) out.push({ text: `Saves ${fmtMoney(face.play.priceSaved)}`, tone: 'pos' });
  }
  return out;
}

// ── DOM ───────────────────────────────────────────────────────────────────────

export function cardFacts(face: CardFaceView): HTMLElement {
  const box = el('div', { class: `nrl-card-face nrl-card-${face.tier}` },
    el('span', { class: 'nrl-card-tier', text: face.kind === 'decree' ? 'Rest of season' : `${tierLabel(face.tier)} · Level ${ROMAN[face.level]}` }),
    el('strong', { class: 'nrl-card-title', text: face.title }),
    el('span', { class: 'nrl-card-effect', text: face.effect }));
  if (face.source) box.append(el('span', { class: 'nrl-card-source', text: `From ${face.source}` }));
  const who = playerLine(face);
  if (face.player && who) box.append(el('span', { class: 'nrl-card-player', text: face.player.name }), el('span', { class: 'nrl-card-facts', text: who }));
  if (face.detail) box.append(el('span', { class: 'nrl-card-player', text: face.detail }));
  for (const line of faceLines(face)) box.append(el('span', { class: `nrl-card-fact nrl-card-fact-${line.tone}`, text: line.text }));
  const out = replacesLine(face);
  if (out) box.append(el('span', { class: 'nrl-card-replaces', text: out }));
  return box;
}

export function cardAction(label: string, run: () => void, refusal: string | null = null, primary = false): HTMLButtonElement {
  const b = button(label, run, { class: primary ? 'nrl-btn-primary' : 'nrl-btn-outline' });
  b.disabled = refusal !== null;
  if (refusal) b.title = refusal;
  return b;
}

export function cardProblem(reason: string): HTMLElement {
  return el('p', { class: 'nrl-card-refusal', text: reason });
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

export function cardTargets(state: GameState, face: CardFaceView, onPlay: (targetId: string) => void, onBack: () => void): HTMLElement {
  const list = el('div', { class: 'nrl-card-targets' });
  for (const r of traitTargetRows(state, face)) {
    const b = button('', () => onPlay(r.playerId), { class: 'nrl-card-target' });
    b.setAttribute('data-card-target', r.playerId);
    // Marked only when the trait has a fit: one that suits anyone would mark every man.
    const name = el('span', { class: 'nrl-card-target-name', text: r.name });
    if (r.suited && face.trait?.suits) {
      b.setAttribute('data-card-suited', '');
      name.append(' ', el('span', { class: 'nrl-card-mark', text: 'suits', attrs: { title: 'The trait suits his position' } }));
    }
    b.append(name,
      el('span', { class: 'nrl-card-target-pos', text: POSITION_SHORT[r.position] }),
      el('span', { class: 'nrl-card-target-level', text: r.label }));
    list.append(b);
  }
  const back = cardAction('Back to cards', onBack);
  back.setAttribute('data-card-back', '');
  return el('div', {}, el('p', { class: 'nrl-decisions-note', text: `Who gets ${face.title}?${face.trait ? ` ${face.trait.blurb}.` : ''}` }), list, back);
}

type Step = { kind: 'cards' } | { kind: 'targets'; index: number } | { kind: 'pass' } | { kind: 'discard' };

function matchOnScreen(): boolean {
  return typeof document !== 'undefined' && !!document.body?.classList.contains(MATCH_ACTIVE_CLASS);
}

/** Open the saved pick and acknowledge this grant, including when opened manually. */
export function openCardPick(grant?: number): HTMLElement | null {
  const s = getState();
  const offer = grant === undefined ? preferredCardOffer(s) : s.cardWeek?.offers.find(o => o.grant === grant);
  if (!offer || advanceInProgress() || matchOnScreen()) return null;
  let showing = offer.grant;
  ensureCardStyles();
  const content = el('div', { class: 'nrl-card-pick', attrs: { 'data-card-pick': '' } });
  let step: Step = { kind: 'cards' };
  let outcome = '';
  let problem = '';

  const choose = (index: number, play = false, targetId?: string): void => {
    const kind = getState().cardWeek?.offers.find(o => o.grant === showing)?.kind;
    const r = play ? playChosenCard('pick', index, targetId, showing) : chooseCard(index, showing);
    problem = r.ok ? '' : r.reason;
    step = { kind: 'cards' };
    if (r.ok) {
      outcome = r.outcome;
      const state = getState();
      if (!state.cardWeek?.offers.some(o => o.grant === showing)) {
        if (kind === 'match' || cardChipCount(state) === 0) {
          closeModal();
          if (!play) bus.emit('ui:notify', { text: outcome, kind: 'success' });
          return;
        }
        showing = preferredCardOffer(state)?.grant;
      }
    }
    render();
  };

  const back = (): void => { step = { kind: 'cards' }; problem = ''; render(); };
  const render = (): void => {
    const state = getState();
    const view = cardOfferView(state, showing);
    content.replaceChildren();
    if (!view.cards.length) { closeModal(); return; }
    const displayed = state.cardWeek!.offers.find(o => o.grant === showing);
    content.setAttribute('data-card-grant', String(showing));
    const keeps = displayed?.keptCardIds.length
      ? `${view.keepsLeft} ${view.keepsLeft === 1 ? 'keep' : 'keeps'} left`
      : `Keep ${view.keepsLeft} ${view.keepsLeft === 1 ? 'card' : 'cards'}`;
    content.append(el('div', { class: 'nrl-card-head' },
      el('h2', { text: displayed?.kind === 'decree' ? 'Decree pick' : displayed?.kind === 'match' ? 'Match pick' : 'Pick a card' }),
      el('p', { class: 'nrl-decisions-count', text: picksWaitingText(view.owed, view.starterLeft), attrs: { 'data-card-owed': String(view.owed) } }),
      ...(displayed?.kind === 'decree' ? [] : [el('p', { class: 'nrl-decisions-count', text: keeps, attrs: { 'data-card-keeps': String(view.keepsLeft), role: 'status' } })])));
    if (outcome) content.append(el('p', { class: 'nrl-card-outcome', text: outcome, attrs: { 'data-card-outcome': '', role: 'status' } }));
    if (problem) content.append(el('p', { class: 'nrl-card-problem', text: problem, attrs: { role: 'alert' } }));

    if (step.kind === 'targets') {
      const face = view.cards.find((c) => step.kind === 'targets' && c.index === step.index);
      if (face) content.append(cardTargets(state, face, (id) => choose(face.index, true, id), back));
      return;
    }
    const blocked = pickBlocked(state);
    if (step.kind === 'discard') {
      content.append(el('p', { text: 'Choose a card to discard.' }));
      const list = el('div', { class: 'nrl-card-targets' });
      for (const face of cardHandView(state)) {
        const discard = cardAction(`Discard ${face.title}`, () => {
          const result = discardHeldCard(face.index);
          if (result.ok) { outcome = result.outcome; back(); }
          else { problem = result.reason; render(); }
        }, blocked);
        discard.setAttribute('data-card-discard', String(face.index));
        list.append(discard);
      }
      content.append(list, cardAction('Back to pick', back));
      return;
    }

    const row = el('div', { class: 'nrl-card-row' });
    const decree = displayed?.kind === 'decree';
    const full = !decree && state.cardWeek!.hand.length >= CARD_WEEK.HAND_CAP;
    for (const face of view.cards) {
      const box = cardFacts(face);
      const take = cardAction(decree ? 'Adopt' : face.upgrade ? 'Upgrade' : 'Take', () => choose(face.index), face.takeRefusal);
      take.setAttribute('data-card-choice', String(face.index));
      take.setAttribute('data-card-id', face.cardId);
      take.setAttribute('aria-label', `${decree ? 'Adopt' : face.upgrade ? 'Upgrade' : 'Take'} ${face.title}`);
      const play = cardAction('Play now', () => {
        if (face.targets) { step = { kind: 'targets', index: face.index }; problem = ''; render(); }
        else choose(face.index, true);
      }, face.refusal, true);
      play.setAttribute('data-card-play-now', String(face.index));
      play.setAttribute('aria-label', `Play ${face.title} now`);
      if (face.refusal && face.refusal !== blocked) {
        box.append(cardProblem(face.refusal));
      }
      box.append(el('div', { class: 'nrl-card-buttons' }, take, ...(!decree ? [play] : [])));
      row.append(box);
    }
    content.append(row);

    const actions = el('div', { class: 'nrl-decisions-actions nrl-card-actions' });
    if (blocked) content.append(cardProblem(blocked));
    if (full) {
      const manage = cardAction('Discard a card', () => { step = { kind: 'discard' }; render(); }, blocked);
      manage.setAttribute('data-card-make-room', '');
      actions.append(el('p', { class: 'nrl-card-pass-ask', text: 'Hand full. Play or discard a card first.' }), manage);
    }
    if (step.kind === 'pass') {
      const yes = cardAction('Pass', () => {
        const r = passPick(showing);
        if (!r.ok) { problem = r.reason; step = { kind: 'cards' }; render(); return; }
        outcome = 'Pick passed.';
        showing = preferredCardOffer(getState())?.grant;
        step = { kind: 'cards' };
        if (!cardChipCount(getState())) { closeModal(); return; }
        render();
      }, blocked, true);
      yes.setAttribute('data-card-pass-confirm', '');
      const question = decree ? 'Pass and go without a Decree this season?'
        : displayed?.keptCardIds.length ? 'Pass the rest of this pick?' : 'Pass this pick? It will be gone.';
      actions.append(el('p', { class: 'nrl-card-pass-ask', text: question }), cardAction('Keep picking', back), yes);
    } else {
      if (!decree) {
        const rerollProblem = rerollRefusal(state, displayed);
        const reroll = cardAction(`Reroll (${fmtMoney(rerollCost(state))})`, () => {
          const result = rerollPick(showing);
          if (result.ok) {
            outcome = result.outcome;
            problem = '';
          } else problem = result.reason;
          render();
          if (result.ok) content.closest('.nrl-modal-scroll')?.scrollTo({ top: 0 });
        }, rerollProblem);
        reroll.setAttribute('data-card-reroll', '');
        actions.append(reroll);
        if (rerollProblem && rerollProblem !== blocked) {
          actions.append(el('span', { class: 'nrl-card-refusal', text: rerollProblem }));
        }
      }
      const pass = cardAction('Pass', () => { step = { kind: 'pass' }; render(); }, blocked);
      pass.setAttribute('data-card-pass', '');
      actions.append(pass);
    }
    content.append(actions, lastMatchPanel(lastMatchView(state)));
    if (displayed?.grant !== undefined && !displayed.seen) {
      const cw = state.cardWeek!;
      setState({ cardWeek: {
        ...cw, seenGrant: Math.max(cw.seenGrant, displayed.grant),
        offers: cw.offers.map(o => o === displayed ? { ...o, seen: true } : o),
      } });
      saveIfChanged(getState());
    }
  };

  const node = openModal(content, { class: 'nrl-decisions-modal nrl-card-modal', region: true, closeButton: true });
  render();
  return node;
}

/** Wait behind the week summary, decisions, screens and tutorial. A grant is acknowledged once. */
export function initCardWeekPick(summaryPending: () => boolean = () => false): () => void {
  if (!getState().cardWeek) return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  const stopPoll = (): void => { if (poll) clearInterval(poll); poll = undefined; };

  const tryShow = (): void => {
    const s = getState();
    const offer = unshownCardOffer(s);
    if (!offer || s.sacked) { stopPoll(); return; }
    if (pickBlocked(s) || advanceInProgress() || summaryPending() || dialogOpen() || activeScreen() !== null
      || isTutorialActive() || matchOnScreen() || document.querySelector('[data-expansion-intro]')) return;
    stopPoll();
    openCardPick(offer.grant);
  };
  const soon = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tryShow, 50);
    if (!poll) poll = setInterval(tryShow, 400);
  };
  const offWeek = bus.on('week:advanced', soon);
  const offState = bus.on('state:changed', (s) => {
    if (!poll && unshownCardOffer(s) && !s.sacked) soon();
  });
  soon();
  return () => {
    offWeek();
    offState();
    if (timer) clearTimeout(timer);
    stopPoll();
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_STYLE_ID = 'nrl-card-week-styles';

export function ensureCardStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(CARD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CARD_STYLE_ID;
  style.textContent = CARD_CSS;
  document.head.appendChild(style);
}

/** Cards in rows when there is width, stacked in portrait; rem throughout, so Larger text scales it. */
export const CARD_CSS = `
.nrl-dialog-region .nrl-card-modal { width: min(100%, 760px); }
.nrl-card-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 12px; padding-right: 44px; }
.nrl-card-head h2 { margin: 0; }
.nrl-card-outcome { margin: 4px 0 8px; padding: 6px 10px; border-radius: 8px; color: var(--nrl-pos); background: color-mix(in srgb, var(--nrl-pos) 12%, transparent); font-size: 0.875rem; overflow-wrap: anywhere; }
.nrl-card-problem { margin: 4px 0 8px; color: var(--nrl-neg); font-size: 0.875rem; overflow-wrap: anywhere; }
.nrl-card-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.nrl-card-face {
  box-sizing: border-box; min-height: 48px; min-width: 0;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 10px 12px; border-radius: 14px; text-align: left; text-transform: none; letter-spacing: 0; white-space: normal;
  background: var(--nrl-panel); border: 1px solid var(--nrl-line); border-top-width: 4px;
}
.nrl-card-face.nrl-card-gold { border-top-color: var(--nrl-accent); }
.nrl-card-face.nrl-card-grey { border-top-color: var(--nrl-bench); }
.nrl-card-buttons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; width: 100%; }
.nrl-card-buttons .nrl-btn { min-height: 44px; min-width: 44px; flex: 1 0 auto; height: auto; padding: 0 6px; font-size: 0.8125rem; }
.nrl-card-targets + .nrl-btn { min-height: 44px; margin-top: 0.5rem; }
.nrl-card-pick > .nrl-card-refusal, .nrl-card-face > .nrl-card-refusal { margin: 0; }
.nrl-card-actions .nrl-btn, .nrl-card-targets .nrl-btn { min-height: 44px; height: auto; white-space: normal; }
.nrl-card-tier { font-family: var(--nrl-f-num); font-size: 0.6875rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-card-gold .nrl-card-tier { color: var(--nrl-accent); }
.nrl-card-title { font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.2; color: var(--nrl-text); overflow-wrap: anywhere; }
.nrl-card-effect { font-size: 0.875rem; line-height: 1.35; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-card-player { font-weight: 700; font-size: 0.9375rem; color: var(--nrl-text); overflow-wrap: anywhere; }
.nrl-card-source { font-size: 0.75rem; color: var(--nrl-accent); overflow-wrap: anywhere; }
.nrl-card-facts { font-family: var(--nrl-f-num); font-size: 0.8125rem; color: var(--nrl-text); overflow-wrap: anywhere; }
.nrl-card-fact { font-size: 0.8125rem; line-height: 1.3; overflow-wrap: anywhere; }
.nrl-card-fact-plain { color: var(--nrl-text); }
.nrl-card-fact-note { color: var(--nrl-text-2); }
.nrl-card-fact-pos { color: var(--nrl-pos); font-family: var(--nrl-f-num); }
.nrl-card-fact-neg { color: var(--nrl-neg); }
.nrl-card-replaces { font-size: 0.8125rem; color: var(--nrl-neg); overflow-wrap: anywhere; }
.nrl-card-refusal { font-size: 0.8125rem; color: var(--nrl-neg); overflow-wrap: anywhere; }
.nrl-card-actions { align-items: center; }
.nrl-card-actions .nrl-btn { flex: 0 1 auto; min-width: 44px; }
.nrl-card-pass-ask { flex: 1 1 100%; margin: 0; color: var(--nrl-text-2); font-size: 0.875rem; }
.nrl-card-targets { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow-y: auto; overscroll-behavior: contain; }
.nrl-btn.nrl-card-target { height: auto; min-height: 44px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 6px 12px; text-transform: none; letter-spacing: 0; text-align: left; white-space: normal; background: var(--nrl-panel); border: 1px solid var(--nrl-line); border-radius: 10px; }
.nrl-card-target-name { font-weight: 700; overflow-wrap: anywhere; }
.nrl-card-target-pos { font-family: var(--nrl-f-num); font-size: 0.8125rem; color: var(--nrl-muted); }
.nrl-card-target-level { font-size: 0.8125rem; color: var(--nrl-pos); }
.nrl-card-last { margin-top: 12px; border-top: 1px solid var(--nrl-line); padding-top: 8px; }
.nrl-card-last summary { cursor: pointer; font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; min-height: 44px; display: flex; align-items: center; }
.nrl-card-last-list { display: flex; flex-direction: column; gap: 2px; font-size: 0.8125rem; }
.nrl-card-last-row { display: grid; grid-template-columns: minmax(0, 1fr) 2.5rem 3rem 3.5rem 3.75rem; gap: 6px; align-items: baseline; padding: 2px 0; }
.nrl-card-last-row > span:not(:first-child) { text-align: right; font-family: var(--nrl-f-num); }
.nrl-card-last-head { color: var(--nrl-muted); font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-card-last-name { overflow-wrap: anywhere; }
.nrl-card-mark { display: inline-block; padding: 0 5px; border-radius: 6px; font-size: 0.6875rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); border: 1px solid var(--nrl-accent); }
@media (orientation: portrait) {
  .nrl-card-row { grid-template-columns: minmax(0, 1fr); }
  .nrl-card-last-row { grid-template-columns: minmax(0, 1fr) 2rem 2rem 2.5rem 3.5rem; }
}
.nrl-cards-content { display: grid; gap: 0.875rem; }
.nrl-cards-content > h2 { margin: 0; padding-right: 44px; }
.nrl-cards-content h3 { font-size: 1rem; margin: 0 0 0.375rem; }
.nrl-cards-content p, .nrl-cards-content ul { margin: 0.25rem 0; }
.nrl-cards-content ul { padding-left: 1.25rem; }
.nrl-cards-content li { margin: 0.25rem 0; }
.nrl-cards-content summary { cursor: pointer; min-height: 44px; align-content: center; font-weight: 700; }
.nrl-cards-picks { display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; padding-right: 44px; }
.nrl-cards-picks .nrl-btn { min-height: 44px; }
.nrl-cards-offers { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.375rem; }
.nrl-cards-offers .nrl-btn { min-height: 44px; height: auto; white-space: normal; }
.nrl-cards-latest { margin-left: 0.375rem; font-size: 0.75em; color: var(--nrl-accent); }
.nrl-cards-hand { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
.nrl-card-hint { color: var(--nrl-muted); font-size: 0.8125rem; }
@media (orientation: portrait) {
  .nrl-cards-hand { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  body:has(.nrl-cards-screen, .nrl-card-modal) .nrl-rotate { display: none; }
}
/* Short landscape phones: keep each card compact in the scrolling pick. */
@media (max-height: 500px) and (orientation: landscape) {
  .nrl-card-face { padding: 6px 10px; gap: 2px; }
  .nrl-card-title { font-size: 0.9375rem; }
  .nrl-card-effect, .nrl-card-replaces, .nrl-card-refusal, .nrl-card-facts, .nrl-card-fact { font-size: 0.75rem; line-height: 1.3; }
}
`;
