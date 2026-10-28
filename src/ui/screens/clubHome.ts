// src/ui/screens/clubHome.ts — the Club home sheet (#350 P1): what CLUB shows on a
// phone held upright, where the grounds can't be (they need landscape). The same
// facts the landscape hub gives (#368's H1): the club, the week and season, the
// money, who is next and where you sit ("Next: v Darwin (A) · 5th"), the
// decisions waiting and the board objective at risk; PLAY WEEK is the dock's, right
// under it. "See the grounds" brings up the rotate card. The view-model is pure
// and unit-tested; the render is thin. DOM UI kit only; no Phaser.

import { getState, type GameState } from '../../core/state';
import { bus } from '../../core/events';
import { nextFixture } from '../../systems/league';
import { WEEKS_PER_SEASON } from '../../config';
import type { ObjectiveRisk } from '../../systems/board';
import { boardChip, decisionsChipCount, moneyTile, moneyTileLabel, ordinal, placeName, runwayLevel, BOARD_RISK_CLASS } from '../hud';
import { button, el, openScreen, screenHead } from '../dom';
import { HOME_ID } from '../nav';

/** The sheet's screen key: the dock marks CLUB for it. */
export const CLUB_HOME_KEY = HOME_ID;

/** What the Club home sheet shows. */
export interface ClubHomeView {
  club: string;
  /** "Week 3 of 26 · Season 1". */
  week: string;
  money: string;
  /** How worried the money looks (the dock's tile, #351 H2 and N12.5). */
  moneyLevel: 'ok' | 'low' | 'short' | 'debt';
  moneyLabel: string;
  /** "Next: v Darwin (A) · 5th", the full names in `label`; null with no match left this season. */
  next: { text: string; label: string } | null;
  /** "2 DECISIONS" and the first due; null with none waiting. */
  decisions: { count: string; top: string } | null;
  /** The board objective most at risk (#368); null when all are on track. */
  board: { title: string; detail: string; label: string; risk: ObjectiveRisk } | null;
}

/** The next-match line (#350 H1): "Next: v Darwin (A) · 5th", the place once a round is in. Pure. */
export function nextMatchLine(s: Pick<GameState, 'league' | 'week'>): { text: string; label: string } | null {
  const f = nextFixture(s.league.fixtures, s.week, 'player');
  if (!f) return null;
  const home = f.homeId === 'player';
  const opp = s.league.clubs.find((c) => c.id === (home ? f.awayId : f.homeId));
  if (!opp) return null;
  const i = s.league.ladder.findIndex((r) => r.clubId === 'player');
  const row = i < 0 ? undefined : s.league.ladder[i];
  const place = row && row.played > 0 ? ordinal(i + 1) : '';
  return {
    text: `Next: v ${placeName(opp.name)} (${home ? 'H' : 'A'})${place ? ` · ${place}` : ''}`,
    label: `Next match: ${opp.name}, ${home ? 'home' : 'away'}${place ? `. You are ${place} on the ladder` : ''}`,
  };
}

/**
 * The Club home sheet's view-model. `decisions` and `runwayWeeks` are the HUD's
 * (main.ts passes the same functions). Pure.
 */
export function clubHomeView(
  s: GameState,
  opts: { decisions?: (s: GameState) => readonly { title: string; note: string }[]; runwayWeeks?: (s: GameState) => number | null } = {},
): ClubHomeView {
  const runway = opts.runwayWeeks?.(s) ?? null;
  const tile = moneyTile(s.money);
  const list = opts.decisions?.(s) ?? [];
  const first = list[0];
  const board = boardChip(s, runway);
  return {
    club: s.clubName,
    week: `Week ${s.week} of ${WEEKS_PER_SEASON} · Season ${s.season}`,
    money: tile.text,
    moneyLevel: tile.inDebt ? 'debt' : runwayLevel(runway),
    moneyLabel: moneyTileLabel(s.money, runway, true),
    next: nextMatchLine(s),
    decisions: first ? { count: decisionsChipCount(list.length), top: `${first.title}${first.note ? ` · ${first.note}` : ''}` } : null,
    board: board ? { title: board.title, detail: board.detail, label: board.label, risk: board.risk } : null,
  };
}

/** What the sheet's buttons open (main.ts wires them to the nav and the decisions popup). */
export interface ClubHomeDeps {
  decisions?: (s: GameState) => readonly { title: string; note: string }[];
  runwayWeeks?: (s: GameState) => number | null;
  onMoney: () => void;
  onNextMatch: () => void;
  onDecisions: () => void;
  onBoard: () => void;
  /** "See the grounds": close the sheet and bring up the rotate card. */
  onGrounds: () => void;
}

const STYLE_ID = 'nrl-club-home-styles';
const CSS = `
.nrl-club-home .nrl-modal-scroll, .nrl-club-home-body { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 0; flex: 1 1 auto; }
.nrl-club-home-name { font-family: var(--nrl-f-label); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.1; overflow-wrap: anywhere; }
.nrl-club-home-week { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 600; letter-spacing: 0.06em; color: var(--nrl-muted); text-transform: uppercase; }
.nrl-club-home-row {
  display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 6px 12px; border: 0; border-radius: 10px;
  background: var(--nrl-raised); color: var(--nrl-text); font: inherit; text-align: left; box-sizing: border-box; width: 100%;
}
button.nrl-club-home-row { cursor: pointer; }
button.nrl-club-home-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-club-home-k { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); flex: 0 0 auto; }
.nrl-club-home-v { flex: 1 1 auto; min-width: 0; font-size: 0.9375rem; overflow-wrap: anywhere; }
.nrl-club-home-money { font-family: var(--nrl-f-num); font-size: 1.125rem; font-weight: 600; }
.nrl-club-home-money[data-level="low"] { color: var(--nrl-fit-ok); }
.nrl-club-home-money[data-level="short"], .nrl-club-home-money[data-level="debt"] { color: var(--nrl-neg); }
.nrl-club-home-go { flex: 0 0 auto; color: var(--nrl-accent); font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.04em; }
.nrl-club-home-alert .nrl-club-home-k { color: var(--nrl-accent); }
.nrl-club-home-board.${BOARD_RISK_CLASS['off-track']} .nrl-club-home-k { color: var(--nrl-neg); }
.nrl-club-home-board.${BOARD_RISK_CLASS['at-risk']} .nrl-club-home-k { color: var(--nrl-fit-ok); }
.nrl-btn.nrl-club-home-grounds { min-height: 44px; margin-top: auto; align-self: stretch; }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** One row: a small label and its value, a button when it opens something. */
function row(cls: string, key: string, value: Node | string, onTap?: () => void, label?: string): HTMLElement {
  const kids = [el('span', { class: 'nrl-club-home-k', text: key }), typeof value === 'string' ? el('span', { class: 'nrl-club-home-v', text: value }) : value];
  if (!onTap) return el('div', { class: `nrl-club-home-row ${cls}` }, ...kids);
  const b = el('button', { class: `nrl-club-home-row ${cls}`, attrs: { type: 'button' }, onClick: onTap }, ...kids, el('span', { class: 'nrl-club-home-go', text: '▸', attrs: { 'aria-hidden': 'true' } }));
  if (label) b.setAttribute('aria-label', label);
  return b;
}

/** Open the Club home sheet. Re-renders on every state change while it is up. */
export function openClubHome(deps: ClubHomeDeps): HTMLElement {
  ensureStyles();
  const body = el('div', { class: 'nrl-club-home-body' });
  const render = (): void => {
    const v = clubHomeView(getState(), deps);
    const money = el('span', { class: 'nrl-club-home-v nrl-club-home-money', text: v.money, attrs: { 'data-level': v.moneyLevel } });
    const rows: HTMLElement[] = [
      el('div', {}, el('div', { class: 'nrl-club-home-name', text: v.club }), el('div', { class: 'nrl-club-home-week', text: v.week })),
      row('nrl-club-home-cash', 'Money', money, deps.onMoney, v.moneyLabel),
      v.next
        ? row('nrl-club-home-next', 'Fixtures', v.next.text, deps.onNextMatch, `${v.next.label}. Tap for the League`)
        : row('nrl-club-home-next', 'Fixtures', 'No more matches this season', deps.onNextMatch),
    ];
    if (v.decisions) rows.push(row('nrl-club-home-alert', v.decisions.count, v.decisions.top, deps.onDecisions, `${v.decisions.count.toLowerCase()}: ${v.decisions.top}. Tap to review`));
    if (v.board) {
      const risk = v.board.risk === 'on-track' ? '' : ` ${BOARD_RISK_CLASS[v.board.risk]}`;
      rows.push(row(`nrl-club-home-board${risk}`, v.board.title, v.board.detail, deps.onBoard, `${v.board.label}. Tap for Staff & Board`));
    }
    const grounds = button('See the grounds ▸', deps.onGrounds, { class: 'nrl-club-home-grounds' });
    grounds.setAttribute('data-club-home-grounds', '');
    rows.push(grounds);
    body.replaceChildren(...rows);
  };
  const screen = el('div', { class: 'nrl-screen nrl-club-home', attrs: { 'data-club-home': '' } }, screenHead('Club'), body);
  render();
  const off = bus.on('state:changed', render);
  return openScreen(screen, off, CLUB_HOME_KEY);
}
