import { getState } from '../core/state';
import { activeSalary } from '../systems/cap';
import { confirmPlayerSale, quotePlayerSale, type SaleOffer } from '../systems/playerTransfers';
import { fmtMoney } from '../utils/money';
import { button, el } from './dom';

/** An inline review, not another modal: the surrounding screen keeps its back route. */
export function saleConfirmation(playerId: string, actions: { onCancel(): void; onSold(offer: SaleOffer): void; back?: HTMLElement }): HTMLElement {
  ensureSaleStyles();
  const panel = el('section', { class: 'nrl-sale-review', attrs: { 'data-sale-review': playerId, 'aria-label': 'Review player sale' } });
  let finished = false;
  let generation = 0;
  const render = (notice = ''): void => {
    const token = ++generation;
    const state = getState();
    const preview = quotePlayerSale(state, playerId);
    const summary = el('div', { class: 'nrl-sale-summary', attrs: { 'data-sale-summary': '' } });
    const details = el('div', { class: 'nrl-sale-details' });
    const footer = el('div', { class: 'nrl-sale-actions' });
    summary.append(el('h3', { class: 'nrl-sale-heading', text: notice ? 'Review revised offer' : 'Review sale' }));
    if (notice) details.append(el('p', { text: notice, attrs: { role: 'alert' } }));
    if (actions.back) footer.append(actions.back);
    if (preview.ok) {
      const { offer, buyerCommitments } = preview;
      const p = state.squad.find(x => x.id === playerId)!;
      const buyer = state.league.clubs.find(c => c.id === offer.buyerId)!;
      const key = (label: string, value: string, attr: string): HTMLElement => el('div', { class: 'nrl-sale-key' },
        el('span', { class: 'nrl-sale-label', text: label }),
        el('strong', { text: value, attrs: { [attr]: '' } }));
      summary.append(el('div', { class: 'nrl-sale-parties' },
        key('Player', p.name, 'data-sale-person'),
        key('Buyer', buyer.name, 'data-sale-buyer'),
        key('Club receives', fmtMoney(offer.fee), 'data-sale-fee')));
      const next = p.deal!.renewal;
      const renewal = next ? ` · renewal ${fmtMoney(next.salary)}/season, S${next.startSeason}${next.endSeason === next.startSeason ? '' : `–${next.endSeason}`}` : '';
      summary.append(el('p', { class: 'nrl-sale-contract', attrs: { 'data-sale-contract': '' },
        text: `Deal unchanged: ${fmtMoney(p.deal!.salary)}/season to S${p.deal!.endSeason}${renewal}.` }));
      details.append(el('p', { text: `Your cap freed: ${fmtMoney(activeSalary(p, state.season))} this season; ${fmtMoney(activeSalary(p, state.season + 1))} next season.` }));
      details.append(el('p', { text: `Buyer cap after transfer: ${buyerCommitments.map(row => `S${row.season} ${fmtMoney(row.used)} / ${fmtMoney(row.cap)}`).join(' · ')}. All covered seasons fit.` }));
      const confirm = button('Confirm sale', () => {
        if (finished || token !== generation) return;
        finished = true;
        confirm.disabled = true;
        const result = confirmPlayerSale(offer);
        if (result.ok) actions.onSold(offer);
        else {
          finished = false;
          render(`${result.message ?? 'The offer changed.'} Review the terms before confirming again.`);
          panel.querySelector<HTMLButtonElement>('[data-sale-cancel]')?.focus();
        }
      }, { class: 'nrl-btn-danger' });
      confirm.setAttribute('data-sale-confirm', '');
      footer.append(confirm);
    } else summary.append(el('p', { text: preview.message, attrs: { 'data-sale-refusal': '' } }));
    const cancel = button('Cancel', () => {
      if (finished) return;
      finished = true; generation++;
      actions.onCancel();
    });
    cancel.setAttribute('data-sale-cancel', '');
    footer.append(cancel);
    panel.replaceChildren(summary, details, footer);
  };
  render();
  return panel;
}

function ensureSaleStyles(): void {
  if (document.getElementById('nrl-sale-styles')) return;
  const style = document.createElement('style'); style.id = 'nrl-sale-styles';
  style.textContent = `
.nrl-sale-review { display: flex; flex-direction: column; flex: 1 1 0; min-width: 0; min-height: 0; border: 1px solid var(--nrl-button); border-radius: 6px; padding: 8px; gap: 6px; background: var(--nrl-bg-2, #142238); }
.nrl-sale-summary { flex: 0 0 auto; min-width: 0; font-size: 0.8125rem; line-height: 1.25; }
.nrl-sale-parties { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 12px; }
.nrl-sale-key { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-sale-label { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-sale-key strong { font-size: 0.9375rem; font-weight: 600; overflow-wrap: anywhere; }
.nrl-sale-summary p { margin: 6px 0 0; }
.nrl-sale-summary .nrl-sale-heading { margin: 0 0 4px; font-size: 0.8125rem; line-height: 1.2; }
.nrl-sale-details { flex: 1 1 0; min-height: 0; overflow: auto; overflow-wrap: anywhere; font-size: 0.75rem; }
.nrl-sale-details p { margin: 0 0 6px; line-height: 1.3; }
.nrl-sale-actions { display: flex; gap: 8px; flex: 0 0 auto; }
.nrl-sale-actions .nrl-btn { min-height: 44px; white-space: normal; }
/* A sale is a decision: keep its fixed actions above ordinary toasts (60),
   below dialogs (100). Covered notices stay queued and their timer pauses. */
.nrl-screen-region:has(.nrl-sale-review) { z-index: 61; }
.nrl-contracts-sale:empty { display: none; }
.nrl-contracts-sale { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; overflow: hidden; }
.nrl-contracts:has(.nrl-sale-review) > .nrl-screen-head, .nrl-contracts:has(.nrl-sale-review) > .nrl-hint, .nrl-contracts:has(.nrl-sale-review) .nrl-screen-sub { display: none; }
.nrl-contracts-sale:not(:empty) + .nrl-contracts-scroll { display: none; }
.nrl-player.nrl-player-sale { display: flex; flex-direction: column; gap: 6px; }
.nrl-dialog-region .nrl-modal.nrl-player-modal:has(.nrl-player-sale) { padding: 2px 12px; }
@media (max-height: 340px) {
  .nrl-sale-review { padding: 3px; gap: 2px; }
  .nrl-sale-summary .nrl-sale-heading { display: none; }
  .nrl-sale-summary p { margin-top: 4px; }
}
`;
  document.head.appendChild(style);
}
