// src/ui/screens/paywall.ts — the paywall and "Already bought? Log in"
// (commercial foundations 05, #364).
//
// Opens when the demo stops an advance (commercial:demoEnded) and from the title
// screen. What it offers follows the store rules for the storefront and country
// (src/commercial/storeRules.ts): Buy, Restore purchases and "Already bought? Log
// in" everywhere; "Buy on the web" only where the store allows a link out; a web
// price only where it allows one to be mentioned. A region dialog, so the dock
// stays whole; closing it goes back to the club with the demo still gated.
//
// Commercial flag on only: with it off nothing calls in here and the stylesheet
// is never added. Styled with the Broadcast Quiet tokens (--nrl-*) and dom.ts's
// buttons and dialog frame only.

import { button, closeModal, el, openModal } from '../dom';
import { bus } from '../../core/events';
import { BRAND, type Brand } from '../../brand';
import {
  CROSS_BUY_INCLUDED, PLATFORM, getEntitlementService, hasFullGame, type EntitlementService, type Entitlements, type Tier,
} from '../../commercial/entitlements';
import {
  getStorefront, getStorefrontCountry, rulesFor, type CountryCode, type PaywallRules, type Storefront,
} from '../../commercial/storeRules';
import { PLACEHOLDER_PRICES, type PriceSource } from '../../commercial/prices';
import { DEV_FAKE_LOGIN, logIn, loginProvider, type LoginProvider } from '../../commercial/login';

// Plain words. No store's name and nothing about buying elsewhere outside the
// web-only lines (buyWeb, webPrice, webNotOpen), which show only where the rules allow.
export const PAYWALL_TEXT = {
  demoEnded: "That's the end of the demo. Unlock the full game to keep your career going.",
  fromTitle: 'Unlock the full game and play every season of your career.',
  includes: [
    'Every round of every season, for as long as your career runs',
    "Finals, the season review and your club's history",
    'Your demo club carries on from where it stopped',
  ],
  buy: 'Buy',
  buyWeb: 'Buy on the web',
  webPrice: 'On the web',
  restore: 'Restore purchases',
  login: 'Already bought? Log in',
  unlocked: 'Full game unlocked. Your career carries on.',
  restored: 'Purchases restored. Your career carries on.',
  nothingToRestore: 'No purchase found to restore.',
  notBought: "The purchase didn't go through.",
  webNotOpen: "The web checkout isn't open yet.",
  loginHead: 'Log in',
  loginSoon: 'Accounts are coming soon: sign in with Apple, Google or email.',
  loginWhy: 'Logging in will bring back what you bought, on any device.',
  loginDev: 'Fake log in (dev)',
  loggedInOwned: 'Logged in. Your career carries on.',
  loggedInNone: 'Logged in. No purchase found on this account.',
  back: 'Back',
} as const;

/** One tier on offer. */
export interface TierCard {
  tier: Tier;
  name: string;
  line: string;
}

/** The tiers on offer: one card when standard already plays everywhere (cross-buy), else Standard and All platforms. */
export function tierCards(crossBuyIncluded: boolean): TierCard[] {
  if (crossBuyIncluded) return [{ tier: 'standard', name: 'Full game', line: 'Every device you play on, with one account' }];
  return [
    { tier: 'standard', name: 'Standard', line: 'The full game where you buy it' },
    { tier: 'allPlatforms', name: 'All platforms', line: 'Phone, tablet and computer, with one account' },
  ];
}

export interface PaywallOptions {
  /** Why it opened: the demo's end, or the title screen. */
  reason: 'demo' | 'title';
  storefront?: Storefront;
  country?: CountryCode | 'default';
  /** The rules to follow; by default the table's for the storefront and country. */
  rules?: PaywallRules;
  prices?: PriceSource;
  crossBuyIncluded?: boolean;
  service?: EntitlementService;
  login?: LoginProvider | undefined;
  /** Offer a fake login that signs straight in (dev builds). */
  devLogin?: boolean | undefined;
  brand?: Brand;
  /** Our web checkout once it exists (VITE_WEB_CHECKOUT_URL); unset, its button says it isn't open yet. */
  webCheckoutUrl?: string | undefined;
}

/** A status line, and a guard so a second tap waits for the first to finish. */
function statusLine(): { el: HTMLElement; say(text: string): void; act(fn: () => Promise<void>): () => void } {
  const line = el('p', { class: 'nrl-paywall-status', attrs: { 'data-nrl-paywall-status': '', role: 'status' } });
  let busy = false;
  const say = (text: string): void => { line.textContent = text; };
  return {
    el: line,
    say,
    act: (fn) => () => {
      if (busy) return;
      busy = true;
      say('');
      void fn().finally(() => { busy = false; });
    },
  };
}

/**
 * "Already bought? Log in": accounts are coming, so it says so. A dev build adds a
 * fake login, which signs in and asks the entitlement service again. `onOwned`
 * runs when the account turns out to own the full game.
 */
export function buildLogin(opts: {
  login?: LoginProvider | undefined; devLogin?: boolean | undefined; service?: EntitlementService | undefined;
  crossBuyIncluded?: boolean | undefined; onOwned: () => void; onBack?: (() => void) | undefined;
}): HTMLElement {
  const service = opts.service ?? getEntitlementService();
  const status = statusLine();
  const actions = el('div', { class: 'nrl-paywall-foot' });
  if (opts.onBack) {
    const back = button(`◂ ${PAYWALL_TEXT.back}`, opts.onBack);
    back.setAttribute('data-nrl-login-back', '');
    actions.append(back);
  }
  const provider = opts.login ?? loginProvider();
  const fake = opts.devLogin ? DEV_FAKE_LOGIN : provider.available ? provider : null;
  if (fake) {
    const go = button(opts.devLogin ? PAYWALL_TEXT.loginDev : PAYWALL_TEXT.loginHead, status.act(async () => {
      const res = await logIn(fake, 'email', service);
      if (!res.ok) return;
      if (hasFullGame(service.snapshot(), PLATFORM, opts.crossBuyIncluded ?? CROSS_BUY_INCLUDED)) opts.onOwned();
      else status.say(PAYWALL_TEXT.loggedInNone);
    }), { class: 'nrl-btn-primary' });
    go.setAttribute('data-nrl-login-go', '');
    actions.append(go);
  }
  return el('div', { class: 'nrl-paywall', attrs: { 'data-nrl-login-panel': '' } },
    el('h2', { text: PAYWALL_TEXT.loginHead }),
    el('p', { class: 'nrl-paywall-lead', text: PAYWALL_TEXT.loginSoon }),
    el('p', { class: 'nrl-paywall-note', text: PAYWALL_TEXT.loginWhy }),
    actions,
    status.el,
  );
}

/**
 * The paywall's content. `close` shuts the dialog it sits in; it runs once the
 * full game is owned (bought, restored, or found on the account logged in to).
 */
export function buildPaywall(opts: PaywallOptions, close: () => void): HTMLElement {
  const storefront = opts.storefront ?? getStorefront();
  const country = opts.country ?? getStorefrontCountry();
  const rules = opts.rules ?? rulesFor(storefront, country);
  const prices = opts.prices ?? PLACEHOLDER_PRICES;
  const service = opts.service ?? getEntitlementService();
  const brand = opts.brand ?? BRAND;
  const crossBuy = opts.crossBuyIncluded ?? CROSS_BUY_INCLUDED;
  const owns = (ent: Entitlements): boolean => hasFullGame(ent, PLATFORM, crossBuy);
  const unlocked = (text: string): void => {
    close();
    bus.emit('ui:notify', { text, kind: 'success' });
  };
  // Web wording only where the rules allow it, and never on the web, where everything is.
  const webExtras = storefront !== 'web' && rules.webCheckout;

  const root = el('div', {
    class: 'nrl-paywall',
    attrs: { 'data-nrl-paywall': '', 'data-storefront': storefront, 'data-country': country },
  });

  const showOffer = (): void => {
    const status = statusLine();
    const cards = tierCards(crossBuy).map((t, i) => {
      const card = el('div', { class: 'nrl-paywall-tier', attrs: { 'data-nrl-paywall-tier': t.tier } },
        el('div', { class: 'nrl-paywall-tier-name', text: t.name }),
        el('div', { class: 'nrl-paywall-tier-line', text: t.line }),
        el('div', { class: 'nrl-paywall-price nrl-num', text: prices.storePrice(t.tier), attrs: { 'data-nrl-paywall-price': t.tier } }),
      );
      if (webExtras && rules.mayMentionWebPrice) {
        card.append(el('div', {
          class: 'nrl-paywall-webprice', text: `${PAYWALL_TEXT.webPrice}: ${prices.webPrice(t.tier)}`, attrs: { 'data-nrl-paywall-webprice': t.tier },
        }));
      }
      if (rules.nativePurchase) {
        // The store supplies its own label for this button once it is wired.
        const buy = button(PAYWALL_TEXT.buy, status.act(async () => {
          if (owns(await service.purchase(t.tier))) unlocked(PAYWALL_TEXT.unlocked);
          else status.say(PAYWALL_TEXT.notBought);
        }), { class: i === 0 ? 'nrl-btn-primary' : '' });
        buy.setAttribute('data-nrl-paywall-buy', t.tier);
        buy.setAttribute('aria-label', `${PAYWALL_TEXT.buy} ${t.name}`);
        card.append(buy);
      }
      return card;
    });

    const foot = el('div', { class: 'nrl-paywall-foot' });
    const restore = button(PAYWALL_TEXT.restore, status.act(async () => {
      if (owns(await service.restore())) unlocked(PAYWALL_TEXT.restored);
      else status.say(PAYWALL_TEXT.nothingToRestore);
    }));
    restore.setAttribute('data-nrl-paywall-restore', '');
    foot.append(restore);
    const login = button(PAYWALL_TEXT.login, showLogin);
    login.setAttribute('data-nrl-paywall-login', '');
    foot.append(login);
    if (webExtras && rules.externalLink !== 'none') {
      const web = button(PAYWALL_TEXT.buyWeb, () => {
        if (opts.webCheckoutUrl) window.open(opts.webCheckoutUrl, '_blank', 'noopener');
        else status.say(PAYWALL_TEXT.webNotOpen);
      });
      web.setAttribute('data-nrl-paywall-web', rules.externalLink);
      foot.append(web);
    }

    root.replaceChildren(
      el('h2', { text: brand.name }),
      el('p', { class: 'nrl-paywall-lead', text: opts.reason === 'demo' ? PAYWALL_TEXT.demoEnded : PAYWALL_TEXT.fromTitle }),
      el('div', { class: 'nrl-paywall-grid' },
        el('ul', { class: 'nrl-paywall-includes' }, ...PAYWALL_TEXT.includes.map((t) => el('li', { text: t }))),
        el('div', { class: 'nrl-paywall-tiers' }, ...cards),
      ),
      foot,
      status.el,
    );
  };

  const showLogin = (): void => {
    const panel = buildLogin({
      login: opts.login, devLogin: opts.devLogin, service, crossBuyIncluded: crossBuy,
      onOwned: () => unlocked(PAYWALL_TEXT.loggedInOwned), onBack: showOffer,
    });
    root.replaceChildren(...Array.from(panel.childNodes));
  };

  showOffer();
  return root;
}

// ── Opening it ──────────────────────────────────────────────────────────────

function pageOptions(): Partial<PaywallOptions> {
  const url = import.meta.env.VITE_WEB_CHECKOUT_URL as string | undefined;
  return { devLogin: import.meta.env.DEV, webCheckoutUrl: url || undefined };
}

function openDialog(content: HTMLElement): HTMLElement {
  ensurePaywallStyles();
  const backdrop = openModal(content, { region: true, closeButton: true, class: 'nrl-paywall-modal' });
  backdrop.classList.add('nrl-paywall-backdrop');
  return backdrop;
}

/** Open the paywall as a dialog over the club (or the title screen). */
export function openPaywall(opts: PaywallOptions): HTMLElement {
  return openDialog(buildPaywall({ ...pageOptions(), ...opts }, closeModal));
}

/** "Already bought? Log in" on its own (the title screen's entry). */
export function openLoginDialog(): HTMLElement {
  const { devLogin } = pageOptions();
  return openDialog(buildLogin({
    devLogin,
    onOwned: () => {
      closeModal();
      bus.emit('ui:notify', { text: PAYWALL_TEXT.loggedInOwned, kind: 'success' });
    },
  }));
}

// ── Styles ──────────────────────────────────────────────────────────────────

const PAYWALL_STYLE_ID = 'nrl-paywall-styles';

/** Add the paywall's stylesheet, once, when it first opens. */
export function ensurePaywallStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(PAYWALL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PAYWALL_STYLE_ID;
  style.textContent = PAYWALL_CSS;
  document.head.appendChild(style);
}

// Tokens only (dom.ts's --nrl-*). At the title there is no dock under the dialog,
// so its bottom clears the safe area itself; over the club the dock already does.
export const PAYWALL_CSS = `
.nrl-dialog-region .nrl-paywall-modal { width: min(100%, 760px); }
.nrl-paywall-backdrop { padding-bottom: max(12px, calc(12px + var(--nrl-safe-b) - var(--nrl-nav-h, 0px))); }
.nrl-paywall { display: flex; flex-direction: column; gap: 10px; }
.nrl-paywall h2 { margin: 0; }
.nrl-paywall-lead { margin: 0; color: var(--nrl-text-2); }
.nrl-paywall-note { margin: 0; color: var(--nrl-muted); font-size: 13px; }
.nrl-paywall-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); gap: 10px; align-items: stretch; }
.nrl-paywall-includes { margin: 0; padding: 10px 12px 10px 28px; border-radius: 10px; background: var(--nrl-panel);
  color: var(--nrl-text-2); font-size: 13px; line-height: 1.35; display: flex; flex-direction: column; gap: 6px; }
.nrl-paywall-tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: 8px; }
.nrl-paywall-tier { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 10px 12px; border-radius: 10px;
  background: var(--nrl-raised); }
.nrl-paywall-tier-name { font-family: var(--nrl-f-label); font-size: 18px; font-weight: 700; letter-spacing: 0.02em;
  text-transform: uppercase; color: var(--nrl-text); }
.nrl-paywall-tier-line { font-size: 12px; color: var(--nrl-muted); }
.nrl-paywall-price { margin-top: 4px; font-size: 20px; color: var(--nrl-text); }
.nrl-paywall-webprice { font-size: 12px; color: var(--nrl-muted); }
/* Buy sits at the card's foot, so the cards' buttons line up whatever their words. */
.nrl-paywall-tier .nrl-btn { margin-top: auto; width: 100%; }
.nrl-paywall-tier > :nth-last-child(2) { margin-bottom: 8px; }
.nrl-paywall-foot { display: flex; flex-wrap: wrap; gap: 8px; }
.nrl-paywall-foot .nrl-btn { flex: 1 1 auto; }
.nrl-paywall-status { margin: 0; color: var(--nrl-accent); font-size: 13px; }
.nrl-paywall-status:empty { display: none; }
@media (max-height: 500px) {
  .nrl-paywall { gap: 8px; }
  .nrl-paywall-includes { padding: 8px 10px 8px 24px; font-size: 12px; gap: 4px; }
  .nrl-paywall-tier { padding: 8px 10px; }
  .nrl-paywall-price { margin-top: 2px; font-size: 18px; }
  .nrl-paywall-tier > :nth-last-child(2) { margin-bottom: 6px; }
}
@media (max-width: 560px) { .nrl-paywall-grid { grid-template-columns: minmax(0, 1fr); } }
`;
