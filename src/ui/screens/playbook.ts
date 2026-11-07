// src/ui/screens/playbook.ts — the Playbook, an Office tile beside Coach calls
// (#326, plan §4.1). Your attack coach at the top (or a way to hire one), then
// your plays, each with who it needs against today's nine and a switch to take
// it into the match (three at most), then the plays your coach opens to buy,
// then the other coaches' plays, folded away. The rules are
// systems/playbook.ts and systems/staff.ts; the words playbookText.ts. One
// column that scrolls upright, two side by side when there's room.
import { el, button, ensureStyles, openScreen, screenHead } from '../dom';
import { getState, setState, type GameState } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { PLAY_LIST, playsOfFamily, type Play, type PlayId } from '../../data/plays';
import { PLAYS, type PlayMan } from '../../match/league/plays';
import { buyPlay, buyRefusal, ownedPlays, togglePlay, validPlays } from '../../systems/playbook';
import { ATTACK_COACHES, attackCoach } from '../../systems/staff';
import { screenLockReason } from '../../systems/screenUnlocks';
import { money, playFitLine, playFitShort, playStyleLabel, playWhenLine, todaysNine } from '../playbookText';
import { openStaffScreen, STAFF_SCREEN_TITLE } from './board';
import posthog, { isPostHogConfigured } from '../../posthog';

/** The page's name, in the nav's Office sheet. */
export const PLAYBOOK_TITLE = 'Playbook';

/** The Office tile's line: "2 plays · 1 taken", or what to do first. */
export function playbookStatus(state: Pick<GameState, 'playbook' | 'staff' | 'lineup'>): string {
  const owned = ownedPlays(state);
  if (owned.length === 0) return attackCoach(state) ? 'No plays yet' : 'No attack coach';
  const taken = validPlays(state.lineup.plays, owned).length;
  return `${owned.length} play${owned.length === 1 ? '' : 's'} · ${taken} taken`;
}

/** A play's name line: the name, its style, and (to buy) its price. */
function playTop(play: Play, price: boolean): HTMLElement {
  return el('div', { class: 'nrl-pb-top' },
    el('b', { class: 'nrl-pb-name', text: play.name }),
    el('span', { class: 'nrl-pb-style', text: playStyleLabel(play) }),
    ...(price ? [el('span', { class: 'nrl-pb-price nrl-num', text: money(play.price) })] : []));
}

function playWords(play: Play, nine: readonly PlayMan[]): HTMLElement[] {
  const short = playFitShort(play, nine);
  return [
    el('p', { class: 'nrl-pb-blurb', text: play.blurb }),
    el('p', { class: 'nrl-pb-when' }, el('span', { class: 'nrl-label', text: 'When' }), ` ${playWhenLine(play)}`),
    el('p', { class: `nrl-pb-fit${short.ok ? '' : ' nrl-pb-fit-short'}`, attrs: { 'data-play-fit': short.ok ? 'met' : 'short' }, text: playFitLine(play, nine) }),
  ];
}

/** An owned play: its words and the switch that takes it into the match (or why it can't). */
function ownedRow(play: Play, nine: readonly PlayMan[], taken: readonly PlayId[], onTake: (id: PlayId) => void): HTMLElement {
  const at = taken.indexOf(play.id);
  const full = at < 0 && taken.length >= PLAYS.takeMax;
  const take = button(at >= 0 ? `Taken · ${at + 1}` : 'Take into the match', () => onTake(play.id), { class: at >= 0 ? 'nrl-btn-primary nrl-pb-take' : 'nrl-pb-take' });
  take.setAttribute('data-play-take', play.id);
  take.setAttribute('aria-pressed', String(at >= 0));
  if (full) {
    take.disabled = true;
    take.title = 'Three is the most';
  }
  return el('li', { class: 'nrl-pb-play', attrs: { 'data-play': play.id, 'data-owned': '', ...(at >= 0 ? { 'data-taken': String(at + 1) } : {}) } },
    playTop(play, false), ...playWords(play, nine),
    el('div', { class: 'nrl-pb-actions' }, take, ...(full ? [el('span', { class: 'nrl-pb-note', text: 'Three is the most' })] : [])));
}

/** A play the club's coach opens: its price and Buy. A refusal (the money) is said when tapped. */
function buyRow(play: Play, nine: readonly PlayMan[], state: GameState, onBuy: (id: PlayId) => void): HTMLElement {
  const why = buyRefusal(state, play.id);
  const buy = button(`Buy · ${money(play.price)}`, () => onBuy(play.id), { class: why ? 'nrl-pb-buy' : 'nrl-btn-primary nrl-pb-buy' });
  buy.setAttribute('data-play-buy', play.id);
  if (why) { buy.setAttribute('data-refused', ''); buy.title = why; }
  return el('li', { class: 'nrl-pb-play', attrs: { 'data-play': play.id, 'data-to-buy': '' } },
    playTop(play, false), ...playWords(play, nine),
    el('div', { class: 'nrl-pb-actions' }, buy, ...(why ? [el('span', { class: 'nrl-pb-note', text: why })] : [])));
}

/** The top card: your attack coach and what he opens, or a way to hire one. */
function coachCard(state: GameState): HTMLElement {
  const coach = attackCoach(state);
  if (coach?.speciality) {
    const def = ATTACK_COACHES[coach.speciality];
    return el('div', { class: 'nrl-pb-coach', attrs: { 'data-playbook-coach': coach.speciality } },
      el('b', { text: `${def.title}: ${coach.name}` }),
      el('p', { text: `Opens ${playsOfFamily(coach.speciality).map((p) => p.name).join(', ')}. Plays you buy stay if he goes.` }));
  }
  const locked = screenLockReason(state, 'staff');
  const go = button(STAFF_SCREEN_TITLE, () => { openStaffScreen(); }, { class: 'nrl-btn-primary' });
  go.setAttribute('data-playbook-staff', '');
  if (locked) { go.disabled = true; go.title = `${STAFF_SCREEN_TITLE}: ${locked.toLowerCase()}`; }
  return el('div', { class: 'nrl-pb-coach', attrs: { 'data-playbook-coach': '' } },
    el('div', { class: 'nrl-pb-coach-text' },
      el('b', { text: 'No attack coach: hire one on Staff & Board' }),
      el('p', { text: locked ? `${STAFF_SCREEN_TITLE} ${locked.charAt(0).toLowerCase()}${locked.slice(1)}. Each coach opens a family of plays to buy.` : 'Each coach opens a family of plays to buy. Plays you buy stay if he goes.' })),
    go);
}

function section(title: string, attr: string, items: HTMLElement[], empty: string, sub?: string): HTMLElement {
  return el('section', { class: 'nrl-pb-section', attrs: { [attr]: '' } },
    el('h3', { class: 'nrl-pb-title', text: title }),
    ...(sub && items.length > 0 ? [el('p', { class: 'nrl-pb-sub', text: sub })] : []),
    items.length > 0 ? el('ul', { class: 'nrl-pb-list' }, ...items) : el('p', { class: 'nrl-pb-empty', text: empty }));
}

export interface PlaybookHandlers {
  onTake: (id: PlayId) => void;
  onBuy: (id: PlayId) => void;
}

/** The page's body for `state` (exported for the DOM test). */
export function playbookBody(state: GameState, h: PlaybookHandlers): HTMLElement {
  const nine = todaysNine(state);
  const owned = ownedPlays(state);
  const taken = validPlays(state.lineup.plays, owned);
  const coach = attackCoach(state);
  const mine = PLAY_LIST.filter((p) => owned.includes(p.id));
  const toBuy = coach?.speciality ? playsOfFamily(coach.speciality).filter((p) => !owned.includes(p.id)) : [];
  const others = PLAY_LIST.filter((p) => !owned.includes(p.id) && p.family !== coach?.speciality);
  const takenLine = `${taken.length} of ${PLAYS.takeMax} taken into the match: your half calls them when they're on.`;
  const ownedSec = section('Your plays', 'data-playbook-owned', mine.map((p) => ownedRow(p, nine, taken, h.onTake)),
    coach ? 'None yet. Buy one of your coach’s plays.' : 'None yet. Hire an attack coach to buy plays.', takenLine);
  const cols = el('div', { class: 'nrl-pb-cols' }, ownedSec);
  if (coach?.speciality) {
    cols.append(section('To buy', 'data-playbook-buy', toBuy.map((p) => buyRow(p, nine, state, h.onBuy)), 'You have every play your coach teaches.'));
  }
  const otherLines = others.map((p) =>
    el('li', { class: 'nrl-pb-other', attrs: { 'data-play': p.id, 'data-other': p.family } },
      el('b', { text: p.name }), ` · ${playStyleLabel(p)} · ${money(p.price)}`,
      el('span', { class: 'nrl-pb-note', text: `Hire the ${ATTACK_COACHES[p.family].title.replace(/^Attack Coach \((.*)\)$/, '$1')} coach to buy` })));
  const body = el('div', { class: 'nrl-pb-body', attrs: { 'data-playbook-body': '' } }, coachCard(state), cols);
  if (otherLines.length > 0) {
    body.append(el('details', { class: 'nrl-pb-others', attrs: { 'data-playbook-others': '' } },
      el('summary', { class: 'nrl-pb-others-head', text: `Other coaches’ plays · ${otherLines.length}` }),
      el('ul', { class: 'nrl-pb-list' }, ...otherLines)));
  }
  return body;
}

/** Take a play into the match or leave it out, and keep the lineup now (as the Lineup screen does). */
function takePlay(id: PlayId): void {
  const s = getState();
  const next = togglePlay(s.lineup, id, ownedPlays(s));
  if (next === s.lineup) {
    bus.emit('ui:notify', { text: 'Three is the most. Leave one out first.', kind: 'info' });
    return;
  }
  setState({ lineup: next });
  save(getState());
}

function tapBuy(id: PlayId): void {
  const why = buyRefusal(getState(), id);
  if (why !== null || !buyPlay(id)) {
    bus.emit('ui:notify', { text: why ?? 'Not enough money', kind: 'danger' });
    return;
  }
  const play = PLAY_LIST.find((item) => item.id === id);
  if (isPostHogConfigured && play) posthog.capture('play_purchased', { play_id: id, price: play.price });
  save(getState());
}

/** Open the Playbook for the club as it is now (it follows a hire, a purchase or a pick while open). */
export function openPlaybookScreen(): HTMLElement {
  ensurePlaybookStyles();
  const sub = el('span', { class: 'nrl-screen-sub' });
  const body = el('div', { class: 'nrl-pb-scroll' });
  let open = false;
  const render = (): void => {
    const s = getState();
    // Keep the folded list as the coach left it across a re-render.
    open = body.querySelector<HTMLDetailsElement>('[data-playbook-others]')?.open ?? open;
    sub.textContent = `${playbookStatus(s)} · ${money(s.money)} in the bank`;
    body.replaceChildren(playbookBody(s, { onTake: takePlay, onBuy: tapBuy }));
    const det = body.querySelector<HTMLDetailsElement>('[data-playbook-others]');
    if (det) det.open = open;
  };
  render();
  const sheet = el('div', { class: 'nrl-screen nrl-playbook', attrs: { 'data-playbook': '' } }, screenHead(PLAYBOOK_TITLE, { sub }), body);
  const off = bus.on('state:changed', () => { if (sheet.isConnected) render(); });
  return openScreen(sheet, off, 'playbook');
}

// ── Styles (injected once, beside the shared kit) ───────────────────────────

const PLAYBOOK_STYLE_ID = 'nrl-playbook-styles';

function ensurePlaybookStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(PLAYBOOK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PLAYBOOK_STYLE_ID;
  style.textContent = PLAYBOOK_CSS;
  document.head.appendChild(style);
}

export const PLAYBOOK_CSS = `
/* The Playbook (#326): the coach card, your plays and the ones to buy (side by side when there's room), the others folded; only the body scrolls. */
.nrl-pb-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
.nrl-pb-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.nrl-pb-coach { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; font-size: 0.8125rem; line-height: 1.35; }
.nrl-pb-coach > b, .nrl-pb-coach-text { flex: 1 1 220px; min-width: 0; }
.nrl-pb-coach p { margin: 2px 0 0; color: var(--nrl-text-2); font-size: 0.75rem; flex: 1 1 100%; }
.nrl-pb-coach-text p { flex: none; }
.nrl-pb-coach .nrl-btn { flex: 0 0 auto; min-height: 44px; padding: 0 16px; border-radius: 8px; }
.nrl-pb-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 8px; align-items: start; }
.nrl-pb-section, .nrl-pb-others { background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; min-width: 0; }
.nrl-pb-section .nrl-pb-title { margin: 0 0 2px; font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.03em; line-height: 1.2; }
.nrl-pb-sub, .nrl-pb-empty { margin: 0 0 4px; font-size: 0.75rem; color: var(--nrl-text-2); line-height: 1.35; }
.nrl-pb-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.nrl-pb-play, .nrl-pb-other { padding: 6px 0; border-top: 1px solid var(--nrl-line); min-width: 0; }
.nrl-pb-top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.nrl-pb-name { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.02em; }
.nrl-pb-style { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-pb-play p { margin: 1px 0 0; font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-pb-when .nrl-label { font-size: 0.6875rem; }
.nrl-pb-play .nrl-pb-fit { color: var(--nrl-pos); }
.nrl-pb-play .nrl-pb-fit.nrl-pb-fit-short { color: var(--nrl-accent); }
.nrl-pb-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
.nrl-pb-actions .nrl-btn { min-height: 44px; padding: 0 14px; border-radius: 8px; }
.nrl-pb-buy[data-refused] { opacity: 0.7; }
.nrl-pb-note { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-pb-other { font-size: 0.8125rem; line-height: 1.35; display: flex; flex-wrap: wrap; gap: 0 4px; align-items: baseline; }
.nrl-pb-other .nrl-pb-note { flex-basis: 100%; }
.nrl-pb-others-head { min-height: 44px; display: flex; align-items: center; cursor: pointer; list-style: none; font-family: var(--nrl-f-label); font-size: 1rem; font-weight: 700; letter-spacing: 0.03em; }
.nrl-pb-others-head::-webkit-details-marker { display: none; }
.nrl-pb-others-head::after { content: '▸'; margin-left: auto; padding-left: 12px; color: var(--nrl-muted); }
.nrl-pb-others[open] > .nrl-pb-others-head::after { content: '▾'; }
`;
