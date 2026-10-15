// src/ui/screens/contracts.ts — Contracts nav screen (GitHub #40, part of #49).
// Every contract sorted by expiry, with renew / release / sell actions. The
// numbers come from systems/contracts.ts; this file only renders them.

import { bus } from '../../core/events';
import { getState } from '../../core/state';
import { overallRating } from '../../data/player';
import { RELEASE_PAYOUT_WEEKS, releasePlayer } from '../../systems/freeagency';
import {
  contractRows, renewalFee, renewalWeeklyCost, renewEarly, sellPlayer, transferFee,
} from '../../systems/contracts';
import { SQUAD_MIN, difficultyMultipliers } from '../../config';
import { el, panel, button, openModal, closeScreen } from '../dom';
import { fmtMoney } from './finance';

const REASONS: Record<string, string> = {
  'insufficient-funds': 'Not enough money.',
  'already-fresh': 'Contract is already full length.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
  'not-found': 'Player not found.',
};

function act(result: { ok: boolean; reason?: string }): void {
  if (!result.ok) bus.emit('ui:notify', { text: REASONS[result.reason ?? ''] ?? 'Not possible.', kind: 'danger' });
}

function render(content: HTMLElement): void {
  const s = getState();
  const wageMult = difficultyMultipliers(s.settings.difficulty).wages;
  const nodes: HTMLElement[] = [el('h2', { text: 'Contracts' })];
  for (const p of contractRows(s)) {
    const weeks = p.contractWeeks;
    const wk = `${weeks} wk${weeks === 1 ? '' : 's'}`;
    const info = el('div', { class: 'nrl-contract-info' },
      el('strong', { text: p.name }),
      ` · OVR ${overallRating(p)} · age ${p.age} · morale ${p.morale} · `,
      el('span', { class: weeks <= 8 ? 'nrl-finance-neg' : '', text: wk }),
      ` · ${fmtMoney(Math.round(p.wage * wageMult))}/wk`,
    );
    const actions = el('div', { class: 'nrl-contract-actions' },
      button(`Renew ${fmtMoney(renewalFee(s, p))} (${fmtMoney(renewalWeeklyCost(s, p))}/wk)`, () => act(renewEarly(getState(), p.id))),
      button(`Release ${fmtMoney(RELEASE_PAYOUT_WEEKS * p.wage)}`, () => {
        if (window.confirm(`Release ${p.name}?`)) act(releasePlayer(getState(), p.id));
      }),
      button(`Sell +${fmtMoney(transferFee(p))}`, () => {
        if (window.confirm(`Sell ${p.name} for ${fmtMoney(transferFee(p))}?`)) act(sellPlayer(getState(), p.id));
      }),
    );
    nodes.push(panel({ class: 'nrl-finance-panel' }, info, actions));
  }
  nodes.push(button('Close', () => closeScreen()));
  content.replaceChildren(...nodes);
}

/** Open the Contracts screen. Re-renders on state changes until closed. */
export function openContractsScreen(): HTMLElement {
  const content = el('div', { class: 'nrl-finance nrl-contracts' });
  render(content);
  const off = bus.on('state:changed', () => {
    if (!content.isConnected) { off(); return; }
    render(content);
  });
  return openModal(content, { class: 'nrl-finance-modal', screen: true });
}
