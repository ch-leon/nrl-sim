// src/ui/screens/contracts.ts — Contracts screen (GitHub #40, part of #49), under
// Finance (its "contracts end … VIEW ▸" tile). A sheet in the Broadcast Quiet
// look: "◂ FINANCE", a summary line, and one table row a player, soonest to end
// first, with renew / release / sell. The numbers come from systems/contracts.ts;
// this file only renders them.
//
// No yellow on this screen: it is a list of 20-odd equal choices, and a yellow
// RENEW on every row would be a column of primaries. RENEW is the plain
// secondary button; RELEASE and SELL are the destructive red-on-navy, two taps.

import { bus } from '../../core/events';
import { getState, type Player } from '../../core/state';
import { overallRating } from '../../data/player';
import { RELEASE_PAYOUT_WEEKS, releasePlayer } from '../../systems/freeagency';
import {
  contractRows, renewalFee, renewalWeeklyCost, renewEarly, renewsOnLoan, sellPlayer, transferFee,
} from '../../systems/contracts';
import { SQUAD_MIN, difficultyMultipliers } from '../../config';
import { el, button, openScreen, screenHead, backButton } from '../dom';
import { EXPIRY_WINDOW_WEEKS, ensureFinanceStyles, fmtMoney, openFinanceScreen } from './finance';

const REASONS: Record<string, string> = {
  'insufficient-funds': 'Not enough money.',
  'already-fresh': 'Contract is already full length.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
  'not-found': 'Player not found.',
};

function act(result: { ok: boolean; reason?: string }): void {
  if (!result.ok) bus.emit('ui:notify', { text: REASONS[result.reason ?? ''] ?? 'Not possible.', kind: 'info' });
}

/** Short money for a button: $900, $12k, $12.5k (the labels are written in caps so the k stays small). */
function fmtShort(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs < 1000) return fmtMoney(n);
  return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

/**
 * The action waiting for its second tap (N14, #263): the player page's two-tap
 * guard instead of a `window.confirm`, which a phone shows as a browser dialog.
 * `release:<id>` or `sell:<id>`; any other tap or a re-render with the player gone clears it.
 */
let armed: string | null = null;

/** A tap on a guarded action: the first arms it (the label asks again), the second does it. */
export function guardTap(current: string | null, key: string): { armed: string | null; run: boolean } {
  return current === key ? { armed: null, run: true } : { armed: key, run: false };
}

/**
 * F3 (#350): the rows hold still while the screen is open. The order is the one
 * the screen opened with (players who arrive since go after it, in expiry order);
 * a renewed row stays where it was, and a released or sold player leaves his row
 * behind, so the next tap never lands on a different player.
 */
export interface GoneRow { text: string; done: string }
export type HeldRow = { kind: 'player'; player: Player } | ({ kind: 'gone'; id: string } & GoneRow);

export function heldRows(order: readonly string[], rows: readonly Player[], gone: ReadonlyMap<string, GoneRow>): HeldRow[] {
  const byId = new Map(rows.map((p) => [p.id, p]));
  const out: HeldRow[] = [];
  for (const id of order) {
    const p = byId.get(id);
    if (p) out.push({ kind: 'player', player: p });
    else if (gone.has(id)) out.push({ kind: 'gone', id, ...gone.get(id)! });
  }
  const known = new Set(order);
  for (const p of rows) if (!known.has(p.id)) out.push({ kind: 'player', player: p });
  return out;
}

/** "24 players · 3 end within 8 wks · wages $14,200/wk". */
export function contractsSummary(players: readonly Pick<Player, 'contractWeeks' | 'wage'>[], wageMult = 1): string {
  const soon = players.filter((p) => p.contractWeeks <= EXPIRY_WINDOW_WEEKS).length;
  const wages = players.reduce((t, p) => t + Math.round(p.wage * wageMult), 0);
  return `${players.length} players · ${soon} end within ${EXPIRY_WINDOW_WEEKS} wks · wages ${fmtMoney(wages)}/wk`;
}

/** This visit's order, renewals and departures; reset when the screen opens. */
let order: string[] = [];
const renewed = new Set<string>();
const gone = new Map<string, GoneRow>();

function render(sub: HTMLElement, tbody: HTMLElement): void {
  const s = getState();
  const wageMult = difficultyMultipliers(s.settings.difficulty).wages;
  sub.textContent = contractsSummary(s.squad, wageMult);
  const rows: HTMLElement[] = [];
  const rerender = (): void => render(sub, tbody);
  for (const row of heldRows(order, contractRows(s), gone)) {
    if (row.kind === 'gone') {
      const done = button(row.done, () => {});
      done.disabled = true;
      const held = el('tr', { class: 'nrl-contract-gone', attrs: { 'data-contract-gone': row.id } },
        el('td', { class: 'nrl-contract-info', text: row.text, attrs: { colspan: '5' } }),
        el('td', {}, el('div', { class: 'nrl-contract-actions' }, done)));
      rows.push(held);
      continue;
    }
    const p = row.player;
    const weeks = p.contractWeeks;
    const onLoan = renewsOnLoan(s, p);
    // Who he is, and what a renewal would pay him (the button says what it costs now). His
    // position under his name too, for the narrowest sheet, which drops the Pos column (#350).
    const meta = `age ${p.age} · morale ${p.morale} · renews at ${fmtMoney(renewalWeeklyCost(s, p))}/wk${onLoan ? ' on a board loan' : ''}`;
    const who = el('td', { class: 'nrl-contract-info', attrs: { title: meta } }, el('div', { class: 'nrl-contract-who' },
      el('span', { class: 'nrl-contract-name', text: p.name }),
      el('span', { class: 'nrl-contract-meta', text: meta }),
      el('span', { class: 'nrl-contract-pos', text: p.position })));

    let renew: HTMLButtonElement;
    if (renewed.has(p.id)) {
      renew = button('RENEWED ✓', () => {});
      renew.disabled = true;
    } else {
      renew = button(`RENEW ${fmtMoney(renewalFee(s, p))}`, () => {
        armed = null;
        const res = renewEarly(getState(), p.id);
        if (res.ok) renewed.add(p.id);
        act(res);
        rerender();
      });
      renew.title = `Renew: ${fmtMoney(renewalFee(s, p))} now${onLoan ? ' on a board loan' : ''}, then ${fmtMoney(renewalWeeklyCost(s, p))}/wk`;
    }
    renew.setAttribute('data-contract-renew', p.id);
    const releaseArmed = armed === `release:${p.id}`;
    const sellArmed = armed === `sell:${p.id}`;
    const release = button(releaseArmed ? 'REALLY RELEASE?' : `RELEASE ${fmtShort(RELEASE_PAYOUT_WEEKS * p.wage)}`, () => {
      const g = guardTap(armed, `release:${p.id}`);
      armed = g.armed;
      if (g.run) {
        const res = releasePlayer(getState(), p.id);
        if (res.ok) gone.set(p.id, { text: `${p.name} · released`, done: 'RELEASED ✓' });
        act(res);
      }
      rerender();
    }, { class: releaseArmed ? 'nrl-btn-danger nrl-contract-armed' : 'nrl-btn-danger' });
    release.title = `Two taps: pays out ${fmtMoney(RELEASE_PAYOUT_WEEKS * p.wage)}`;
    const sell = button(sellArmed ? 'REALLY SELL?' : `SELL +${fmtShort(transferFee(p))}`, () => {
      const g = guardTap(armed, `sell:${p.id}`);
      armed = g.armed;
      if (g.run) {
        const fee = transferFee(p);
        const res = sellPlayer(getState(), p.id);
        if (res.ok) gone.set(p.id, { text: `${p.name} · sold for ${fmtMoney(fee)}`, done: 'SOLD ✓' });
        act(res);
      }
      rerender();
    }, { class: sellArmed ? 'nrl-btn-danger nrl-contract-armed' : 'nrl-btn-danger' });
    sell.title = `Two taps: a transfer fee of ${fmtMoney(transferFee(p))}`;

    rows.push(el('tr', { attrs: { 'data-contract': p.id } },
      who,
      el('td', { text: p.position }),
      el('td', { class: 'nrl-num', text: String(overallRating(p)) }),
      el('td', { class: `nrl-num${weeks <= EXPIRY_WINDOW_WEEKS ? ' nrl-contract-soon' : ''}`, text: `${weeks} wk${weeks === 1 ? '' : 's'}` }),
      el('td', { class: 'nrl-num', text: fmtMoney(Math.round(p.wage * wageMult)) }),
      el('td', {}, el('div', { class: 'nrl-contract-actions' }, renew, release, sell)),
    ));
  }
  tbody.replaceChildren(...rows);
}

/** Open the Contracts sheet (lights Finance, which holds it). Re-renders on state changes until closed. */
export function openContractsScreen(): HTMLElement {
  ensureFinanceStyles();
  armed = null;
  order = contractRows(getState()).map((p) => p.id);
  renewed.clear();
  gone.clear();
  const sub = el('span', { class: 'nrl-screen-sub' });
  const tbody = el('tbody');
  const table = el('table', { class: 'nrl-table nrl-contracts-table' },
    el('colgroup', {}, el('col'), el('col', { attrs: { style: 'width:44px' } }), el('col', { attrs: { style: 'width:44px' } }),
      el('col', { attrs: { style: 'width:64px' } }), el('col', { attrs: { style: 'width:76px' } }), el('col', { class: 'nrl-contracts-col-actions' })),
    el('thead', {}, el('tr', {},
      el('th', { text: 'Player' }), el('th', { text: 'Pos' }), el('th', { class: 'nrl-num', text: 'Ovr' }),
      el('th', { class: 'nrl-num', text: 'Left' }), el('th', { class: 'nrl-num', text: 'Wage' }), el('th'))),
    tbody);
  render(sub, tbody);
  const sheet = el('div', { class: 'nrl-screen nrl-finance-sheet nrl-contracts' },
    screenHead('Contracts', { lead: [backButton('Finance', () => openFinanceScreen())], sub }),
    el('div', { class: 'nrl-contracts-scroll' }, table));
  const off = bus.on('state:changed', () => {
    if (sheet.isConnected) render(sub, tbody);
  });
  return openScreen(sheet, off, 'contracts');
}
