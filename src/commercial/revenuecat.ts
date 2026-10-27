// src/commercial/revenuecat.ts — RevenueCat's seam (commercial foundations 03, #362).
//
// A typed seam only: no SDK installed, no keys. The provider takes a client with
// the shape of RevenueCat's Purchases API (logIn, getCustomerInfo,
// restorePurchases); the adapter that wraps the real SDK later unwraps its
// replies into this shape. The app user id will be the Supabase account's.
// Nothing in the game imports this file yet, so it is not in the bundle.

import { type Entitlements, type EntitlementProvider, type Platform, PLATFORMS } from './entitlements';

/** One entitlement in CustomerInfo.entitlements.active (the fields we read). */
export interface RcEntitlementInfo {
  identifier: string;
  isActive: boolean;
}

/** The slice of RevenueCat's CustomerInfo the mapping reads. */
export interface RcCustomerInfo {
  entitlements: { active: Record<string, RcEntitlementInfo> };
}

/** RevenueCat's Purchases API, as far as we use it. */
export interface RcPurchasesClient {
  logIn(appUserId: string): Promise<{ customerInfo: RcCustomerInfo; created: boolean }>;
  getCustomerInfo(): Promise<RcCustomerInfo>;
  restorePurchases(): Promise<RcCustomerInfo>;
  addCustomerInfoUpdateListener?(cb: (info: RcCustomerInfo) => void): void;
}

/**
 * RevenueCat entitlement identifiers → ours. Placeholders until the RevenueCat
 * project exists; they must match the identifiers set up in its dashboard.
 * Steam has none: our own server checks Steam ownership.
 */
export const RC_ENTITLEMENT_IDS = {
  allPlatforms: 'all_platforms',
  standard: { web: 'standard_web', ios: 'standard_ios', android: 'standard_android' } as Partial<Record<Platform, string>>,
};

/** Our entitlements from a CustomerInfo: all_platforms wins; else a standard per platform bought; else demo. */
export function entitlementsFromCustomerInfo(info: RcCustomerInfo, now = Date.now()): Entitlements {
  const active = (id: string | undefined): boolean => id !== undefined && info.entitlements.active[id]?.isActive === true;
  if (active(RC_ENTITLEMENT_IDS.allPlatforms)) {
    return { tier: 'allPlatforms', platforms: [...PLATFORMS], source: 'revenuecat', checkedAt: now };
  }
  const platforms = PLATFORMS.filter((p) => active(RC_ENTITLEMENT_IDS.standard[p]));
  return { tier: platforms.length > 0 ? 'standard' : 'demo', platforms, source: 'revenuecat', checkedAt: now };
}

/** The provider over a RevenueCat client. Throws through when the client does (the service fails open). */
export class RevenueCatProvider implements EntitlementProvider {
  private listeners = new Set<(ent: Entitlements) => void>();

  constructor(private readonly client: RcPurchasesClient, private readonly now: () => number = Date.now) {
    client.addCustomerInfoUpdateListener?.((info) => {
      const ent = entitlementsFromCustomerInfo(info, this.now());
      for (const cb of [...this.listeners]) cb(ent);
    });
  }

  /** Tie purchases to the account (the Supabase user id). */
  async logIn(appUserId: string): Promise<Entitlements> {
    const { customerInfo } = await this.client.logIn(appUserId);
    return entitlementsFromCustomerInfo(customerInfo, this.now());
  }

  async current(): Promise<Entitlements> {
    return entitlementsFromCustomerInfo(await this.client.getCustomerInfo(), this.now());
  }

  refresh(): Promise<Entitlements> { return this.current(); }

  async restore(): Promise<Entitlements> {
    return entitlementsFromCustomerInfo(await this.client.restorePurchases(), this.now());
  }

  onChange(cb: (ent: Entitlements) => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
}
