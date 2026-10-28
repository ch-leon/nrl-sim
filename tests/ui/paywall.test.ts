// tests/ui/paywall.test.ts — the paywall and "Already bought? Log in" (#364), built
// in the stand-in DOM (tests/ui/stubDom.ts): which buttons each country gets, that
// AU and the default never mention the web, the tier cards, and Buy, Restore and
// the login going through the entitlement service.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PAYWALL_TEXT, buildLogin, buildPaywall, tierCards, type PaywallOptions } from '../../src/ui/screens/paywall';
import { showTitleFlow } from '../../src/ui/title';
import {
  EntitlementService, LocalStubProvider, getEntitlementService, __resetEntitlementService,
} from '../../src/commercial/entitlements';
import { DEMO, initCommercial, setDemoSlot, __resetDemo } from '../../src/commercial/demo';
import { __setCommercial } from '../../src/commercial/flags';
import { COMING_SOON_LOGIN, logIn, type LoginProvider } from '../../src/commercial/login';
import { PRICE_PLACEHOLDER } from '../../src/commercial/prices';
import { STORE_RULES, type Storefront } from '../../src/commercial/storeRules';
import { BRAND } from '../../src/brand';
import { bus, type Events } from '../../src/core/events';
import { createNewGame, getState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { stubLocalStorage, type MemStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from './stubDom';

let storage: MemStorage;
let toasts: Events['ui:notify'][];

beforeEach(() => {
  storage = stubLocalStorage();
  stubDocument();
  __setCommercial(true);
  __resetEntitlementService();
  __resetDemo();
  bus.clear();
  toasts = [];
  bus.on('ui:notify', (t) => toasts.push(t));
});

afterEach(() => {
  __setCommercial(null);
  __resetEntitlementService();
  __resetDemo();
  vi.unstubAllGlobals();
});

/** Let the button handlers' awaits finish. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function paywall(over: Partial<PaywallOptions> = {}, close = vi.fn()): { root: StubNode; close: typeof close } {
  const root = buildPaywall({ reason: 'demo', storefront: 'ios', country: 'AU', devLogin: false, ...over }, close) as unknown as StubNode;
  return { root, close };
}

/** The paywall's buttons, by what they do. */
function buttons(root: StubNode): string[] {
  const out: string[] = [];
  for (const n of root.all()) {
    if (n.tagName !== 'BUTTON') continue;
    if ('data-nrl-paywall-buy' in n.attrs) out.push(`buy:${n.attrs['data-nrl-paywall-buy']}`);
    else if ('data-nrl-paywall-restore' in n.attrs) out.push('restore');
    else if ('data-nrl-paywall-login' in n.attrs) out.push('login');
    else if ('data-nrl-paywall-web' in n.attrs) out.push(`web:${n.attrs['data-nrl-paywall-web']}`);
    else out.push(`other:${n.textContent}`);
  }
  return out;
}

// Any word about buying elsewhere, a currency, or a store by name.
const WEB_WORDING = /\bweb\b|website|online|internet|checkout|elsewhere|cheaper|\blink|\bQR\b|\$|€|£|app store|google play|play store|steam|stripe|paddle/i;

describe('the buttons per country (#364)', () => {
  it('AU: Buy, Restore and "Already bought? Log in" only', () => {
    expect(buttons(paywall({ country: 'AU' }).root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login']);
  });

  it('an unknown country gets the same as AU', () => {
    expect(buttons(paywall({ country: 'default' }).root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login']);
    expect(buttons(paywall({ country: 'NZ' }).root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login']);
  });

  it('US: "Buy on the web" is added; EU: added too, marked as the fee case', () => {
    expect(buttons(paywall({ country: 'US' }).root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login', 'web:allowed']);
    expect(buttons(paywall({ country: 'DE' }).root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login', 'web:allowed-with-fee']);
    const web = paywall({ country: 'US' }).root.querySelector('[data-nrl-paywall-web]')!;
    expect(web.textContent).toBe(PAYWALL_TEXT.buyWeb);
  });

  it('the buttons follow the table for every store, never a web button on Steam or on the web itself', () => {
    for (const storefront of ['ios', 'android', 'steam', 'web'] as Storefront[]) {
      for (const country of ['US', 'DE', 'AU', 'default']) {
        const rules = STORE_RULES[storefront][country === 'DE' ? 'EU' : country as 'US' | 'AU' | 'default'];
        const web = paywall({ storefront, country }).root.querySelector('[data-nrl-paywall-web]');
        expect(web !== null).toBe(storefront !== 'web' && rules.externalLink !== 'none');
        if (storefront === 'steam' || storefront === 'web') expect(web).toBeNull();
      }
    }
  });

  it('the screen carries the brand name and what the full game includes', () => {
    const { root } = paywall();
    expect(root.querySelector('[data-nrl-paywall]')).toBeNull(); // the root is the paywall itself
    expect(root.attrs['data-nrl-paywall']).toBe('');
    expect(root.textContent).toContain(BRAND.name);
    for (const line of PAYWALL_TEXT.includes) expect(root.textContent).toContain(line);
    expect(root.textContent).toContain(PAYWALL_TEXT.demoEnded);
    expect(paywall({ reason: 'title' }).root.textContent).toContain(PAYWALL_TEXT.fromTitle);
  });
});

describe('no web wording or price for AU and the default (#364)', () => {
  it('nothing on the screen, its labels included, mentions the web, a currency or a store', () => {
    for (const country of ['AU', 'default', 'NZ']) {
      for (const storefront of ['ios', 'android', 'steam'] as Storefront[]) {
        const { root } = paywall({ country, storefront });
        expect(root.words()).not.toMatch(WEB_WORDING);
        expect(root.querySelector('[data-nrl-paywall-webprice]')).toBeNull();
      }
    }
  });

  it('nor does it after a tap on Restore finds nothing', async () => {
    const { root } = paywall({ country: 'AU', service: new EntitlementService(new LocalStubProvider()) });
    root.querySelector('[data-nrl-paywall-restore]')!.click();
    await settle();
    expect(root.querySelector('[data-nrl-paywall-status]')!.textContent).toBe(PAYWALL_TEXT.nothingToRestore);
    expect(root.words()).not.toMatch(WEB_WORDING);
  });

  it('the US and EU may show a web price; prices are placeholders until the store supplies them', () => {
    const { root } = paywall({ country: 'US' });
    expect(root.querySelector('[data-nrl-paywall-webprice="standard"]')!.textContent).toBe(`${PAYWALL_TEXT.webPrice}: ${PRICE_PLACEHOLDER}`);
    expect(root.querySelector('[data-nrl-paywall-price="standard"]')!.textContent).toBe(PRICE_PLACEHOLDER);
    expect(root.words()).toMatch(WEB_WORDING);
    expect(paywall({ country: 'FR' }).root.querySelector('[data-nrl-paywall-webprice]')).not.toBeNull();
  });

  it('a web button with no web checkout yet says so', () => {
    const { root } = paywall({ country: 'US' });
    root.querySelector('[data-nrl-paywall-web]')!.click();
    expect(root.querySelector('[data-nrl-paywall-status]')!.textContent).toBe(PAYWALL_TEXT.webNotOpen);
  });
});

describe('the tier cards (#364)', () => {
  it('Standard and All platforms with cross-buy off; one card with it on', () => {
    expect(tierCards(false).map((t) => t.tier)).toEqual(['standard', 'allPlatforms']);
    expect(tierCards(true).map((t) => t.tier)).toEqual(['standard']);
    const tiers = (on: boolean): string[] => paywall({ crossBuyIncluded: on }).root
      .querySelectorAll('[data-nrl-paywall-tier]').map((n) => n.attrs['data-nrl-paywall-tier']!);
    expect(tiers(false)).toEqual(['standard', 'allPlatforms']);
    expect(tiers(true)).toEqual(['standard']);
  });

  it('the first card holds the one yellow button', () => {
    const { root } = paywall();
    const buys = root.querySelectorAll('[data-nrl-paywall-buy]');
    expect(buys.map((b) => b.className)).toEqual(['nrl-btn nrl-btn-primary', 'nrl-btn']);
  });
});

describe('Buy, Restore and the login go through the entitlement service (#364)', () => {
  it('Buy calls the service with its tier; the stub unlocks at once and the paywall closes', async () => {
    const service = getEntitlementService();
    const purchase = vi.spyOn(service, 'purchase');
    const { root, close } = paywall({ service });
    root.querySelector('[data-nrl-paywall-buy="allPlatforms"]')!.click();
    await settle();
    expect(purchase).toHaveBeenCalledWith('allPlatforms');
    expect(service.snapshot().tier).toBe('allPlatforms');
    expect(close).toHaveBeenCalledOnce();
    expect(toasts.map((t) => t.text)).toEqual([PAYWALL_TEXT.unlocked]);
  });

  it('a purchase that does not unlock leaves the paywall open and says so', async () => {
    const service = new EntitlementService(new LocalStubProvider());
    vi.spyOn(service, 'purchase').mockResolvedValue(service.snapshot());
    const { root, close } = paywall({ service });
    root.querySelector('[data-nrl-paywall-buy="standard"]')!.click();
    await settle();
    expect(close).not.toHaveBeenCalled();
    expect(root.querySelector('[data-nrl-paywall-status]')!.textContent).toBe(PAYWALL_TEXT.notBought);
  });

  it('Restore unlocks when the store finds a purchase', async () => {
    const stub = new LocalStubProvider();
    const service = new EntitlementService(stub, stub.read());
    stub.set('standard');
    const { root, close } = paywall({ service });
    root.querySelector('[data-nrl-paywall-restore]')!.click();
    await settle();
    expect(close).toHaveBeenCalledOnce();
    expect(toasts.map((t) => t.text)).toEqual([PAYWALL_TEXT.restored]);
  });

  it('"Already bought? Log in" says accounts are coming, and Back returns to the offer', () => {
    const { root } = paywall({ login: COMING_SOON_LOGIN });
    root.querySelector('[data-nrl-paywall-login]')!.click();
    expect(root.textContent).toContain(PAYWALL_TEXT.loginSoon);
    expect(root.textContent).toBe(
      `${PAYWALL_TEXT.loginHead}${PAYWALL_TEXT.loginSoon}${PAYWALL_TEXT.loginWhy}◂ ${PAYWALL_TEXT.back}`,
    );
    expect(root.querySelector('[data-nrl-login-go]')).toBeNull(); // no fake login outside a dev build
    root.querySelector('[data-nrl-login-back]')!.click();
    expect(buttons(root)).toEqual(['buy:standard', 'buy:allPlatforms', 'restore', 'login']);
  });

  it('a fake login in a dev build asks the service again, and closes once the account owns the game', async () => {
    const stub = new LocalStubProvider();
    const service = new EntitlementService(stub, stub.read());
    const refresh = vi.spyOn(service, 'refresh');
    const { root, close } = paywall({ service, devLogin: true });
    root.querySelector('[data-nrl-paywall-login]')!.click();
    root.querySelector('[data-nrl-login-go]')!.click();
    await settle();
    expect(refresh).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(root.querySelector('[data-nrl-paywall-status]')!.textContent).toBe(PAYWALL_TEXT.loggedInNone);

    stub.set('standard'); // the account turns out to own it
    root.querySelector('[data-nrl-login-go]')!.click();
    await settle();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    expect(toasts.map((t) => t.text)).toEqual([PAYWALL_TEXT.loggedInOwned]);
  });

  it('logIn refreshes only on a successful sign-in', async () => {
    const service = new EntitlementService(new LocalStubProvider());
    const refresh = vi.spyOn(service, 'refresh');
    expect(await logIn(COMING_SOON_LOGIN, 'apple', service)).toEqual({ ok: false });
    expect(refresh).not.toHaveBeenCalled();
    const ok: LoginProvider = { available: true, signIn: async () => ({ ok: true, userId: 'u1' }) };
    expect(await logIn(ok, 'google', service)).toEqual({ ok: true, userId: 'u1' });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('the login panel on its own (the title entry) has no Back', () => {
    const panel = buildLogin({ onOwned: () => {} }) as unknown as StubNode;
    expect(panel.querySelector('[data-nrl-login-back]')).toBeNull();
    expect(panel.textContent).toContain(PAYWALL_TEXT.loginSoon);
  });
});

describe('the demo end opens it, and Buy lets the season go on (#364)', () => {
  it('Advance Week stops at the demo, the paywall opens, Buy unlocks, and Advance Week carries on', async () => {
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Paywall Test', 3);
    initLeague(getState());
    let open: { root: StubNode; close: ReturnType<typeof vi.fn> } | null = null;
    initCommercial(1, () => { open = paywall({ service: getEntitlementService() }); });
    setDemoSlot(1);

    advanceWeeks(DEMO.lastWeek);
    const locked = getState().week;
    expect(open).toBeNull();
    advanceWeek();
    expect(getState().week).toBe(locked);
    expect(open).not.toBeNull();
    expect(toasts).toEqual([]); // the paywall, not the old toast

    open!.root.querySelector('[data-nrl-paywall-buy="standard"]')!.click();
    await settle();
    expect(open!.close).toHaveBeenCalledOnce();
    advanceWeek();
    expect(getState().week).toBe(locked + 1);
  });

  it('closed without buying, the demo stays gated', () => {
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Paywall Test', 3);
    initLeague(getState());
    let opened = 0;
    initCommercial(1, () => { opened++; });
    setDemoSlot(1);
    advanceWeeks(DEMO.lastWeek + 1);
    const locked = getState().week;
    advanceWeek();
    expect(getState().week).toBe(locked);
    expect(opened).toBe(2);
  });
});

describe('the title screen entries (#364)', () => {
  function title(): StubNode {
    const root = new StubNode('div');
    void showTitleFlow(root as unknown as HTMLElement);
    root.querySelector('[data-nrl-back]')?.click(); // a fresh install starts on the new-club step
    return root;
  }

  it('"Already bought? Log in" and the full game show with the flag on', () => {
    const root = title();
    expect(root.querySelector('[data-nrl-login]')!.textContent).toBe('Already bought? Log in');
    expect(root.querySelector('[data-nrl-full-game]')!.textContent).toBe('Get the full game');
  });

  it('with the flag off: no entry, no extra CSS, no key written', () => {
    __setCommercial(false);
    const root = title();
    expect(root.querySelector('[data-nrl-login]')).toBeNull();
    expect(root.querySelector('[data-nrl-full-game]')).toBeNull();
    expect(root.words()).not.toMatch(/log in|full game/i);
    const style = root.all().find((n) => n.tagName === 'STYLE')!;
    expect(style.textContent).not.toContain('nrl-title-buy');
    expect(storage.writes).toEqual([]);
  });
});
