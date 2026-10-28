// src/commercial/prices.ts — where the paywall's prices come from (commercial foundations 05, #364).
//
// The store supplies the price, in the player's own currency and formatted its own
// way, so the game never writes one. Prices are not decided yet (DECISION (Leon):
// price), so every price is a placeholder dash until a store answers.

import type { Tier } from './entitlements';

/** The dash shown where a price will go. */
export const PRICE_PLACEHOLDER = '—';

export interface PriceSource {
  /** The storefront's own price for `tier`, as the store formats it. */
  storePrice(tier: Tier): string;
  /** Our web checkout's price for `tier`. The paywall shows it only where the store rules allow. */
  webPrice(tier: Tier): string;
}

/** Placeholders until RevenueCat's offerings (and the web checkout) supply the prices. */
export const PLACEHOLDER_PRICES: PriceSource = {
  storePrice: () => PRICE_PLACEHOLDER,
  webPrice: () => PRICE_PLACEHOLDER,
};
