import { describe, it, expect } from 'vitest';
import {
  EU_COUNTRIES, RULES_REGIONS, STORE_RULES, STORE_RULES_REVIEW, STOREFRONTS, STRICT_RULES,
  getStorefront, getStorefrontCountry, regionFor, rulesFor, type PaywallRules,
} from '../../src/commercial/storeRules';
import { PLATFORMS } from '../../src/commercial/entitlements';

// #364: what the paywall may offer, per storefront and country, as data. The rows
// follow the launch plan of 27 Oct 2026; these tests pin what the plan says.

const COUNTRIES = ['US', 'AU', 'DE', 'FR', 'IE', 'GB', 'NZ', 'JP', 'CA', 'ZZ', 'default', 'au', 'de'];

describe('the store rules table (#364)', () => {
  it('has a row for every storefront and region, and was reviewed on the plan date', () => {
    expect([...STOREFRONTS]).toEqual([...PLATFORMS]);
    for (const sf of STOREFRONTS) expect(Object.keys(STORE_RULES[sf]).sort()).toEqual([...RULES_REGIONS].sort());
    expect(STORE_RULES_REVIEW.lastReviewed).toBe('2026-10-27');
  });

  it('every storefront and country resolves to a full row, with the login entry always allowed', () => {
    for (const sf of STOREFRONTS) {
      for (const c of COUNTRIES) {
        const r: PaywallRules = rulesFor(sf, c);
        expect(Object.keys(r).sort()).toEqual(Object.keys(STRICT_RULES).sort());
        expect(r.showLoginForPriorPurchase).toBe(true);
        expect(r.nativePurchase).toBe(true);
        // A link out always comes with our web checkout behind it.
        if (r.externalLink !== 'none') expect(r.webCheckout).toBe(true);
      }
    }
  });

  it('an unknown country falls back to the strict default on every store', () => {
    expect(STRICT_RULES).toEqual({
      nativePurchase: true, externalLink: 'none', userChoiceBilling: false,
      mayMentionWebPrice: false, showLoginForPriorPurchase: true, webCheckout: false,
    });
    for (const c of ['ZZ', 'GB', 'NZ', 'JP', 'default', '']) {
      expect(regionFor(c)).toBe('default');
      for (const sf of ['ios', 'android', 'steam'] as const) expect(rulesFor(sf, c)).toEqual(STRICT_RULES);
    }
  });

  it('the AU iOS row is the strict one, and so is every default', () => {
    expect(rulesFor('ios', 'AU')).toEqual(STRICT_RULES);
    for (const sf of ['ios', 'android', 'steam'] as const) expect(STORE_RULES[sf].default).toEqual(STRICT_RULES);
  });

  it('Steam never allows a link, a web price or another biller', () => {
    for (const c of COUNTRIES) expect(rulesFor('steam', c)).toEqual(STRICT_RULES);
  });

  it('iOS: a free link in the US, a link with a fee in the EU', () => {
    expect(rulesFor('ios', 'US')).toMatchObject({ externalLink: 'allowed', mayMentionWebPrice: true, webCheckout: true });
    for (const c of EU_COUNTRIES) expect(rulesFor('ios', c).externalLink).toBe('allowed-with-fee');
  });

  it('Android: a link at a fee in the US, user choice billing (no link) in AU, strict in the EU for now', () => {
    expect(rulesFor('android', 'US')).toMatchObject({ externalLink: 'allowed-with-fee', userChoiceBilling: false });
    expect(rulesFor('android', 'AU')).toEqual({ ...STRICT_RULES, userChoiceBilling: true });
    expect(rulesFor('android', 'DE')).toEqual(STRICT_RULES);
  });

  it('the web is our own checkout everywhere, with nothing to link out to', () => {
    for (const c of COUNTRIES) expect(rulesFor('web', c)).toMatchObject({ externalLink: 'none', webCheckout: true });
  });

  it('the EU is its 27 members, as one row', () => {
    expect(EU_COUNTRIES).toHaveLength(27);
    expect(new Set(EU_COUNTRIES).size).toBe(27);
    for (const c of EU_COUNTRIES) expect(regionFor(c)).toBe('EU');
    expect(regionFor('GB')).toBe('default');
    expect(regionFor('CH')).toBe('default');
  });
});

describe('the country and storefront seams (#364)', () => {
  it('a dev build takes ?country=, then the language region, then default', () => {
    expect(getStorefrontCountry({ DEV: true, search: '?commercial=1&country=au', language: 'en-US' })).toBe('AU');
    expect(getStorefrontCountry({ DEV: true, search: '?country=nope', language: 'en-US' })).toBe('US');
    expect(getStorefrontCountry({ DEV: true, search: '', language: 'de-DE' })).toBe('DE');
    expect(getStorefrontCountry({ DEV: true, search: '', language: 'zh-Hant-TW' })).toBe('TW');
    expect(getStorefrontCountry({ DEV: true, search: '', language: 'en' })).toBe('default');
    expect(getStorefrontCountry({ search: '', language: '' })).toBe('default');
  });

  it('the URL override counts in a dev build only', () => {
    expect(getStorefrontCountry({ DEV: false, search: '?country=US', language: 'en-AU' })).toBe('AU');
    expect(getStorefront({ DEV: false, search: '?store=steam' })).toBe('ios');
  });

  it('the storefront is the App Store rehearsal unless a dev build names another', () => {
    expect(getStorefront({})).toBe('ios');
    expect(getStorefront({ DEV: true, search: '?store=android' })).toBe('android');
    expect(getStorefront({ DEV: true, search: '?store=web' })).toBe('web');
    expect(getStorefront({ DEV: true, search: '?store=playstation' })).toBe('ios');
  });
});
