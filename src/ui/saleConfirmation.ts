import { getState } from '../core/state';
import { activeSalary } from '../systems/cap';
import { confirmPlayerSale, quotePlayerSale, type SaleOffer } from '../systems/playerTransfers';
import { fmtMoney } from '../utils/money';
import { button, el } from './dom';

/** An inline review, not another modal: the surrounding screen keeps its back route. */
export function saleConfirmation(playerId: string, actions: { onCancel(): void; onSold(offer: SaleOffer): void }): HTMLElement {
  ensureSaleStyles();
  const panel = el('section', { class: 'nrl-sale-review', attrs: { 'data-sale-review': playerId, 'aria-label': 'Review player sale' } });
  let finished = false;
  let generation = 0;
  const render = (notice = ''): void => {
    const token = ++generation;
    const state = getState();
    const preview = quotePlayerSale(state, playerId);
    const details = el('div', { class: 'nrl-sale-details' });
    const footer = el('div', { class: 'nrl-sale-actions' });
    details.append(el('h3', { text: 'Review sale' }));
    if (notice) details.append(el('p', { text: notice, attrs: { role: 'alert' } }));
    if (preview.ok) {
      const { offer, buyerCommitments } = preview;
      const p = state.squad.find(x => x.id === playerId)!;
      const buyer = state.league.clubs.find(c => c.id === offer.buyerId)!;
      details.append(el('p', { text: `${p.name} → ${buyer.name} · club receives ${fmtMoney(offer.fee)}` }));
      details.append(el('p', { text: `Contract stays unchanged: ${fmtMoney(p.deal!.salary)} a season through season ${p.deal!.endSeason}.` }));
      if (p.deal!.renewal) {
        const next = p.deal!.renewal;
        details.append(el('p', { text: `Queued renewal: ${fmtMoney(next.salary)} a season, seasons ${next.startSeason}–${next.endSeason}.` }));
      }
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
        }
      }, { class: 'nrl-btn-danger' });
      confirm.setAttribute('data-sale-confirm', '');
      footer.append(confirm);
    } else details.append(el('p', { text: preview.message }));
    const cancel = button('Cancel', () => {
      if (finished) return;
      finished = true; generation++;
      actions.onCancel();
    });
    cancel.setAttribute('data-sale-cancel', '');
    footer.append(cancel);
    panel.replaceChildren(details, footer);
  };
  render();
  return panel;
}

function ensureSaleStyles(): void {
  if (document.getElementById('nrl-sale-styles')) return;
  const style = document.createElement('style'); style.id = 'nrl-sale-styles';
  style.textContent = `
.nrl-sale-review { display: flex; flex-direction: column; min-width: 0; min-height: 0; max-height: min(25rem, calc(100dvh - 8rem)); border: 1px solid var(--nrl-button); border-radius: 6px; padding: 8px; background: var(--nrl-bg-2, #142238); }
.nrl-sale-details { min-height: 0; overflow: auto; overflow-wrap: anywhere; }
.nrl-sale-details h3 { margin: 0 0 6px; }
.nrl-sale-details p { margin: 0 0 8px; line-height: 1.35; }
.nrl-sale-actions { display: flex; flex-wrap: wrap; gap: 8px; flex: 0 0 auto; padding-top: 4px; }
.nrl-sale-actions .nrl-btn { min-height: 44px; white-space: normal; }
.nrl-contracts-sale:empty { display: none; }
.nrl-contracts-sale { flex: 0 1 auto; min-height: 0; }
.nrl-player-side > .nrl-sale-review { flex: 1 1 auto; }
`;
  document.head.appendChild(style);
}
