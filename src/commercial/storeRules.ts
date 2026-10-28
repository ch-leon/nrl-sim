// src/commercial/storeRules.ts — what the paywall may offer, per storefront and
// country (commercial foundations 05, #364).
//
// Store rules on linking out to a web checkout differ by country and change often,
// so the paywall reads them from this table rather than deciding in code. The rows
// follow the commercial launch plan of 27 Oct 2026. RE-CHECK EVERY ROW BEFORE
// LAUNCH, and bump STORE_RULES_REVIEW.lastReviewed when you do.
//
// An unknown country gets its storefront's `default` row, and on every store that
// is the strict one: the store's own purchase only, no link, no word of a price
// anywhere else. Pure: no DOM; the country and storefront seams read the page only
// when asked.

import type { Platform } from './entitlements';

/** Where the game is bought. The same four as the entitlement platforms. */
export type Storefront = Platform;
export const STOREFRONTS: readonly Storefront[] = ['web', 'ios', 'android', 'steam'];

/** An ISO 3166-1 alpha-2 country code, upper case ('AU', 'US', 'DE'). */
export type CountryCode = string;

/** The rows the table holds: the countries with their own rules, the EU as one, and everyone else. */
export type RulesRegion = 'US' | 'EU' | 'AU' | 'default';
export const RULES_REGIONS: readonly RulesRegion[] = ['US', 'EU', 'AU', 'default'];

export interface PaywallRules {
  /** The storefront's own purchase: App Store, Play, Steam, or our own checkout on the web. */
  nativePurchase: boolean;
  /** A button out to our web checkout: never, allowed, or allowed with the store taking a fee. */
  externalLink: 'none' | 'allowed' | 'allowed-with-fee';
  /** Google's user choice billing: another biller (Stripe, Paddle) offered beside Google's own. */
  userChoiceBilling: boolean;
  /** Whether the screen may show a web price or say anything about buying on the web. */
  mayMentionWebPrice: boolean;
  /** "Already bought? Log in" is allowed everywhere. */
  showLoginForPriorPurchase: true;
  /** Our web checkout is a way to buy on this storefront (its own checkout on the web, the link elsewhere). */
  webCheckout: boolean;
}

export const STORE_RULES_REVIEW = { lastReviewed: '2026-10-27' } as const;

/** The strict row: the store's own purchase and nothing else. Every store's default. */
export const STRICT_RULES: Readonly<PaywallRules> = Object.freeze({
  nativePurchase: true,
  externalLink: 'none',
  userChoiceBilling: false,
  mayMentionWebPrice: false,
  showLoginForPriorPurchase: true,
  webCheckout: false,
});

const rules = (over: Partial<PaywallRules>): PaywallRules => ({ ...STRICT_RULES, ...over });

/** On the web our own checkout is the storefront's purchase: there is no store over it. Paddle or Stripe: DECISION (Leon). */
const WEB = rules({ mayMentionWebPrice: true, webCheckout: true });

export const STORE_RULES: Record<Storefront, Record<RulesRegion, PaywallRules>> = {
  web: { US: WEB, EU: WEB, AU: WEB, default: WEB },
  ios: {
    // In-app purchase plus a button to our web checkout; Apple takes no fee on it (for now).
    US: rules({ externalLink: 'allowed', mayMentionWebPrice: true, webCheckout: true }),
    // Linking out is allowed, but Apple charges fees on it.
    EU: rules({ externalLink: 'allowed-with-fee', mayMentionWebPrice: true, webCheckout: true }),
    // In-app purchase only: no price, link, QR code or wording about buying elsewhere.
    AU: rules({}),
    default: rules({}),
  },
  android: {
    // In-app purchase plus an external link at a reduced fee.
    US: rules({ externalLink: 'allowed-with-fee', mayMentionWebPrice: true, webCheckout: true }),
    // Google's EU rules vary by country: strict until each one is checked.
    EU: rules({}),
    // User choice billing (Stripe/Paddle beside Google), inside Play's own purchase flow; still no link out.
    AU: rules({ userChoiceBilling: true }),
    default: rules({}),
  },
  // Steam checkout only, with no links out anywhere.
  steam: { US: rules({}), EU: rules({}), AU: rules({}), default: rules({}) },
};

/** The EU's member states, which share one row. */
export const EU_COUNTRIES: readonly CountryCode[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
];

/** The table's row for a country: its own, the EU's, or the default. */
export function regionFor(country: CountryCode | 'default'): RulesRegion {
  const c = country.toUpperCase();
  if (c === 'US' || c === 'AU') return c;
  if (EU_COUNTRIES.includes(c)) return 'EU';
  return 'default';
}

/** What the paywall may offer on `storefront` in `country`; an unknown country gets the strict default. */
export function rulesFor(storefront: Storefront, country: CountryCode | 'default'): PaywallRules {
  return STORE_RULES[storefront][regionFor(country)];
}

// ── Seams: which country, which storefront ──────────────────────────────────

/** The bits of the page the seams read (the real page in the game; a stand-in in tests). */
export interface StorefrontEnv {
  DEV?: boolean;
  search?: string;
  language?: string;
}

function pageEnv(): StorefrontEnv {
  return {
    DEV: import.meta.env.DEV,
    search: typeof location === 'undefined' ? '' : location.search,
    language: typeof navigator === 'undefined' ? '' : navigator.language,
  };
}

const COUNTRY_RE = /^[A-Za-z]{2}$/;

/**
 * The country whose rules apply. A dev build takes `?country=AU`; then the region
 * of the browser's language (en-AU → AU) on the web; then 'default' (strict).
 * Native builds will read the store's own country instead, from StoreKit or Play
 * Billing via RevenueCat, since that is the country the store's rules follow.
 */
export function getStorefrontCountry(env: StorefrontEnv = pageEnv()): CountryCode | 'default' {
  if (env.DEV) {
    const q = new URLSearchParams(env.search ?? '').get('country');
    if (q && COUNTRY_RE.test(q)) return q.toUpperCase();
  }
  const region = (env.language ?? '').split('-').slice(1).find((p) => COUNTRY_RE.test(p));
  return region ? region.toUpperCase() : 'default';
}

/**
 * The storefront the paywall follows. Native builds will report their own store.
 * The web build has no checkout of its own yet, so until it does the paywall
 * rehearses the App Store's rules, the ones that differ most by country. A dev
 * build takes `?store=web|ios|android|steam`.
 */
export function getStorefront(env: StorefrontEnv = pageEnv()): Storefront {
  if (env.DEV) {
    const q = new URLSearchParams(env.search ?? '').get('store') as Storefront | null;
    if (q && STOREFRONTS.includes(q)) return q;
  }
  return 'ios';
}
