// src/ui/screens/contracts.ts — Contracts nav screen (GitHub #40, part of #49).
// Every contract sorted by expiry, with renew / release / sell actions. The
// numbers come from systems/contracts.ts; this file only renders them.

import { bus } from '../../core/events';
import { getState, type Player } from '../../core/state';
import { overallRating } from '../../data/player';
import { RELEASE_PAYOUT_WEEKS, releasePlayer } from '../../systems/freeagency';
import {
  contractRows, renewalFee, renewalWeeklyCost, renewEarly, renewsOnLoan, sellPlayer, transferFee,
} from '../../systems/contracts';
import { SQUAD_MIN, difficultyMultipliers } from '../../config';
import { el, panel, button, openModal } from '../dom';
import { fmtMoney } from './finance';
import { ensureScreenStyles } from './recruit';

const REASONS: Record<string, string> = {
  'insufficient-funds': 'Not enough money.',
  'already-fresh': 'Contract is already full length.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
  'not-found': 'Player not found.',
};

function act(result: { ok: boolean; reason?: string }): void {
  if (!result.ok) bus.emit('ui:notify', { text: REASONS[result.reason ?? ''] ?? 'Not possible.', kind: 'info' });
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

/** This visit's order, renewals and departures; reset when the screen opens. */
let order: string[] = [];
const renewed = new Set<string>();
const gone = new Map<string, GoneRow>();

function render(content: HTMLElement): void {
  const s = getState();
  const wageMult = difficultyMultipliers(s.settings.difficulty).wages;
  const nodes: HTMLElement[] = [el('h2', { text: 'Contracts' })];
  for (const row of heldRows(order, contractRows(s), gone)) {
    if (row.kind === 'gone') {
      const done = button(row.done, () => {});
      done.disabled = true;
      const held = panel({ class: 'nrl-finance-panel nrl-contract-gone' },
        el('div', { class: 'nrl-contract-info' }, row.text), el('div', { class: 'nrl-contract-actions' }, done));
      held.setAttribute('data-contract-gone', row.id);
      nodes.push(held);
      continue;
    }
    const p = row.player;
    const weeks = p.contractWeeks;
    const wk = `${weeks} wk${weeks === 1 ? '' : 's'}`;
    const info = el('div', { class: 'nrl-contract-info' },
      el('strong', { text: p.name }),
      ` · OVR ${overallRating(p)} · age ${p.age} · morale ${p.morale} · `,
      el('span', { class: weeks <= 8 ? 'nrl-finance-neg' : '', text: wk }),
      ` · ${fmtMoney(Math.round(p.wage * wageMult))}/wk`,
    );
    let renew: HTMLButtonElement;
    if (renewed.has(p.id)) {
      renew = button('Renewed ✓', () => {});
      renew.disabled = true;
    } else {
      renew = button(`Renew ${fmtMoney(renewalFee(s, p))}${renewsOnLoan(s, p) ? ' on a board loan' : ''} (${fmtMoney(renewalWeeklyCost(s, p))}/wk)`, () => {
        armed = null;
        const res = renewEarly(getState(), p.id);
        if (res.ok) renewed.add(p.id);
        act(res);
        render(content);
      });
    }
    renew.setAttribute('data-contract-renew', p.id);
    const actions = el('div', { class: 'nrl-contract-actions' },
      renew,
      button(armed === `release:${p.id}` ? 'Really release?' : `Release ${fmtMoney(RELEASE_PAYOUT_WEEKS * p.wage)}`, () => {
        const g = guardTap(armed, `release:${p.id}`);
        armed = g.armed;
        if (g.run) {
          const res = releasePlayer(getState(), p.id);
          if (res.ok) gone.set(p.id, { text: `${p.name} · released`, done: 'Released ✓' });
          act(res);
        }
        render(content);
      }, armed === `release:${p.id}` ? { class: 'nrl-btn-danger' } : {}),
      button(armed === `sell:${p.id}` ? 'Really sell?' : `Sell +${fmtMoney(transferFee(p))}`, () => {
        const g = guardTap(armed, `sell:${p.id}`);
        armed = g.armed;
        if (g.run) {
          const fee = transferFee(p);
          const res = sellPlayer(getState(), p.id);
          if (res.ok) gone.set(p.id, { text: `${p.name} · sold for ${fmtMoney(fee)}`, done: 'Sold ✓' });
          act(res);
        }
        render(content);
      }, armed === `sell:${p.id}` ? { class: 'nrl-btn-danger' } : {}),
    );
    nodes.push(panel({ class: 'nrl-finance-panel' }, info, actions));
  }
  content.replaceChildren(...nodes);
}

/** Open the Contracts screen. Re-renders on state changes until closed. */
export function openContractsScreen(): HTMLElement {
  ensureScreenStyles(); // the armed button's red (.nrl-btn-danger)
  armed = null;
  order = contractRows(getState()).map((p) => p.id);
  renewed.clear();
  gone.clear();
  const content = el('div', { class: 'nrl-finance nrl-contracts' });
  render(content);
  const off = bus.on('state:changed', () => {
    if (!content.isConnected) { off(); return; }
    render(content);
  });
  return openModal(content, { class: 'nrl-finance-modal', screen: true, key: 'contracts' });
}
