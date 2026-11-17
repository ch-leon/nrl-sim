import { careerActionClock } from '../../core/season';
// src/ui/screens/contracts.ts — Contracts screen (GitHub #40, part of #49), under
// Finance (its "contracts end … VIEW ▸" tile). A sheet in the Broadcast Quiet
// look: "◂ FINANCE", a summary line, and one table row a player, soonest to end
// first, with renew / release / sell. The numbers come from systems/contracts.ts;
// this file only renders them.
//
// No yellow on this screen: it is a list of 20-odd equal choices, and a yellow
// RENEW on every row would be a column of primaries. RENEW is the plain
// secondary button; RELEASE uses two taps and SELL opens a separate offer review.

import { bus } from '../../core/events';
import { getState, type Player } from '../../core/state';
import { overallRating } from '../../data/player';
import { releasePlayer } from '../../systems/freeagency';
import { activeSalary, releaseTerms, renewalAsk } from '../../systems/cap';
import { contractRows, renewEarly, renewalRefusal } from '../../systems/contracts';
import { quotePlayerSale } from '../../systems/playerTransfers';
import { saleConfirmation } from '../saleConfirmation';
import { hasStaff } from '../../systems/staff';
import { SQUAD_MIN } from '../../config';
import { fmtMoneyShort } from '../../utils/money';
import { ARMED_CLASS, armGuard, armedTap, el, button, openScreen, screenHead, backButton } from '../dom';
import { EXPIRY_WINDOW_WEEKS, ensureFinanceStyles, fmtMoney, openFinanceScreen } from './finance';

const REASONS: Record<string, string> = {
  'insufficient-funds': 'Not enough cash.',
  'over-cap': 'Not enough salary-cap room.',
  'already-renewed': 'A renewal is already queued.',
  'not-final-season': 'A renewal waits until the last season of his deal.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
  'not-found': 'Player not found.',
  'no-buyer': 'No club has bought him. Nothing was changed.',
};

function act(result: { ok: boolean; reason?: string; message?: string }): void {
  if (!result.ok) bus.emit('ui:notify', { text: result.message ?? REASONS[result.reason ?? ''] ?? 'Not possible.', kind: 'info' });
}

/** Short money for a button: $900, $12k, $12.5k, $2m (the labels are written in caps so the k stays small). */
const fmtShort = (n: number): string => fmtMoneyShort(n, { places: 1 });

/**
 * The action waiting for its second tap (N14, #263): the player page's two-tap
 * guard instead of a `window.confirm`, which a phone shows as a browser dialog.
 * `release:<id>`; a tap anywhere else, or four seconds, clears it (#612).
 */
let armed: string | null = null;
/** Calls off the armed button's wait (dom.ts armGuard), and puts that button back as it was. */
let stopWait: (() => void) | null = null;
/** When the armed button was armed, so a quick double tap does not take both steps (#617). */
let armedAt = 0;
let atRest: (() => void) | null = null;

/**
 * Arm `key`, or nothing. Disarming on its own (the wait ran out, a tap landed
 * elsewhere) rewrites the one button in place: no row is rebuilt under that tap,
 * and nothing moves (F3 below).
 */
function arm(key: string | null): void {
  armed = key;
  armedAt = performance.now();
  stopWait?.();
  stopWait = key ? armGuard(() => { armed = null; stopWait = null; atRest?.(); }) : null;
}

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
export function contractsSummary(players: readonly Pick<Player, 'contractWeeks' | 'deal'>[], season = 1): string {
  const soon = players.filter((p) => !p.deal?.renewal && p.contractWeeks <= EXPIRY_WINDOW_WEEKS).length;
  const cap = players.reduce((total, p) => {
    const deal = p.deal;
    if (!deal) return total;
    if (season >= deal.startSeason && season <= deal.endSeason) return total + deal.salary;
    const next = deal.renewal;
    if (next && season >= next.startSeason && season <= next.endSeason) return total + next.salary;
    return total;
  }, 0);
  return `${players.length} players · ${soon} end within ${EXPIRY_WINDOW_WEEKS} wks · cap ${fmtMoney(cap)} this season`;
}

/** This visit's order, renewals and departures; reset when the screen opens. */
let order: string[] = [];
const renewed = new Set<string>();
const gone = new Map<string, GoneRow>();

function render(sub: HTMLElement, tbody: HTMLElement, saleHost: HTMLElement): void {
  const s = getState();
  sub.textContent = contractsSummary(contractRows(s), careerActionClock(s).season) + (careerActionClock(s).structural ? ` · season ${careerActionClock(s).season}` : '');
  const rows: HTMLElement[] = [];
  const rerender = (): void => render(sub, tbody, saleHost);
  atRest = null;
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
    const ask = renewalAsk(p, hasStaff(s, 'welfare'));
    const queued = p.deal?.renewal;
    const start = queued?.startSeason ?? (p.deal && p.deal.endSeason >= careerActionClock(s).season ? p.deal.endSeason + 1 : careerActionClock(s).season);
    const changed = p.deal && ask.salary !== p.deal.salary ? ` ${ask.why}.` : '';
    const blocked = renewalRefusal(s, p);
    const meta = queued
      ? `age ${p.age} · renewal queued from season ${queued.startSeason} at ${fmtMoney(queued.salary)}/season`
      : blocked
        ? `age ${p.age} · ${blocked.message}`
        : `age ${p.age} · morale ${p.morale} · renews from season ${start} at ${fmtMoney(ask.salary)}/season, no fee${changed}`;
    const who = el('td', { class: 'nrl-contract-info', attrs: { title: meta } }, el('div', { class: 'nrl-contract-who' },
      el('span', { class: 'nrl-contract-name', text: p.name }),
      el('span', { class: 'nrl-contract-meta', text: meta }),
      el('span', { class: 'nrl-contract-pos', text: p.position })));

    let renew: HTMLButtonElement;
    if (queued) {
      renew = button('QUEUED', () => {});
      renew.disabled = true;
      renew.title = `A renewal is already queued from season ${queued.startSeason} at ${fmtMoney(queued.salary)} a season.`;
    } else if (renewed.has(p.id)) {
      renew = button('RENEWED ✓', () => {});
      renew.disabled = true;
      renew.title = 'Renewed this visit.';
    } else if (blocked) {
      renew = button('RENEW', () => { act(renewEarly(getState(), p.id)); });
      renew.disabled = true;
      renew.title = blocked.message;
    } else {
      renew = button('RENEW', () => {
        arm(null);
        const res = renewEarly(getState(), p.id);
        if (res.ok) renewed.add(p.id);
        act(res);
        rerender();
      });
      renew.title = `No fee. From season ${start} at ${fmtMoney(ask.salary)} a season.${changed}`;
    }
    renew.setAttribute('data-contract-renew', p.id);
    const terms = releaseTerms(p, careerActionClock(s).season, careerActionClock(s).week, careerActionClock(s).duration);
    const releaseArmed = armed === `release:${p.id}`;
    const releaseLabel = `RELEASE ${fmtShort(terms.payout)}`;
    const release = button(releaseArmed ? 'REALLY RELEASE?' : releaseLabel, () => {
      const g = guardTap(armed, `release:${p.id}`);
      if (g.run && !armedTap(performance.now() - armedAt)) return; // the tap that armed it, twice
      arm(g.armed);
      if (g.run) {
        const res = releasePlayer(getState(), p.id);
        if (res.ok) gone.set(p.id, { text: `${p.name} · released`, done: 'RELEASED ✓' });
        act(res);
      }
      rerender();
    }, { class: releaseArmed ? `nrl-btn-danger ${ARMED_CLASS}` : 'nrl-btn-danger' });
    const nextFreed = terms.nextCapFreed > 0 ? ` and ${fmtMoney(terms.nextCapFreed)} next season` : '';
    release.title = `Two taps: pays ${fmtMoney(terms.payout)} and frees ${fmtMoney(terms.capFreed)} of this season's cap${nextFreed}. The signing fee is not refunded.`;
    const offer = quotePlayerSale(s, p.id);
    const sell = button(offer.ok ? `SELL +${fmtShort(offer.offer.fee)}` : 'NO BUYER', () => {
      arm(null);
      saleHost?.replaceChildren(saleConfirmation(p.id, {
        back: backButton('Finance', () => openFinanceScreen()),
        onCancel: () => {
          saleHost.replaceChildren();
          Array.from(tbody.querySelectorAll<HTMLButtonElement>('[data-contract-sell]')).find(b => b.getAttribute('data-contract-sell') === p.id)?.focus();
        },
        onSold: (accepted) => {
          const buyer = getState().league.clubs.find(c => c.id === accepted.buyerId);
          gone.set(p.id, { text: `${p.name} · sold to ${buyer?.name ?? accepted.buyerId}`, done: 'SOLD ✓' });
          saleHost?.replaceChildren(); rerender();
        },
      }));
      saleHost?.querySelector<HTMLButtonElement>('[data-sale-cancel]')?.focus();
    }, { class: 'nrl-btn-danger' });
    sell.setAttribute('data-contract-sell', p.id);
    sell.title = offer.ok ? 'Review the buying club, fee and existing contract before confirming.' : offer.message;
    if (releaseArmed) atRest = () => { release.classList.remove(ARMED_CLASS); release.textContent = releaseLabel; };

    rows.push(el('tr', { attrs: { 'data-contract': p.id } },
      who,
      el('td', { text: p.position }),
      el('td', { class: 'nrl-num', text: String(Math.round(overallRating(p))) }),
      el('td', { class: `nrl-num${weeks <= EXPIRY_WINDOW_WEEKS && !queued ? ' nrl-contract-soon' : ''}`, text: `${weeks} wk${weeks === 1 ? '' : 's'}` }),
      el('td', { class: 'nrl-num', text: fmtMoney(careerActionClock(s).structural ? activeSalary(p, careerActionClock(s).season) : p.deal?.salary ?? 0), attrs: { title: 'Annual salary on the cap' } }),
      el('td', {}, el('div', { class: 'nrl-contract-actions' }, renew, release, sell)),
    ));
  }
  tbody.replaceChildren(...rows);
}

/** Open the Contracts sheet (lights Finance, which holds it). Re-renders on state changes until closed. */
export function openContractsScreen(): HTMLElement {
  ensureFinanceStyles();
  arm(null);
  order = contractRows(getState()).map((p) => p.id);
  renewed.clear();
  gone.clear();
  const saleHost = el('div', { class: 'nrl-contracts-sale' });
  const sub = el('span', { class: 'nrl-screen-sub' });
  const tbody = el('tbody');
  const table = el('table', { class: 'nrl-table nrl-contracts-table' },
    el('colgroup', {}, el('col'), el('col', { attrs: { style: 'width:44px' } }), el('col', { attrs: { style: 'width:44px' } }),
      el('col', { attrs: { style: 'width:64px' } }), el('col', { attrs: { style: 'width:76px' } }), el('col', { class: 'nrl-contracts-col-actions' })),
    el('thead', {}, el('tr', {},
      el('th', { text: 'Player' }), el('th', { text: 'Pos' }), el('th', { class: 'nrl-num', text: 'Ovr' }),
      el('th', { class: 'nrl-num', text: 'Left' }), el('th', { class: 'nrl-num', text: 'Cap' }), el('th'))),
    tbody);
  render(sub, tbody, saleHost);
  const sheet = el('div', { class: 'nrl-screen nrl-finance-sheet nrl-contracts' },
    screenHead('Contracts', { lead: [backButton('Finance', () => openFinanceScreen())], sub }),
    saleHost,
    el('div', { class: 'nrl-contracts-scroll' }, table));
  const off = bus.on('state:changed', () => {
    if (sheet.isConnected) render(sub, tbody, saleHost);
  });
  return openScreen(sheet, () => { off(); arm(null); }, 'contracts');
}
