// src/commercial/entitlements.ts — who owns what (commercial foundations 03, #362).
//
// The model (a tier, the platforms it was bought on, where the answer came from),
// the one rule that reads it (hasFullGame), the provider seam a store plugs into,
// and the service the game asks. For now the service always uses the local stub:
// no account, SDK or keys exist yet. RevenueCat's seam is in ./revenuecat.ts.
// docs/specs/commercial-entitlements.md has the model and every DECISION (Leon).
//
// Nothing here runs with the commercial flag off: the demo gate checks the flag
// before it asks for the service, so no key below is ever written.

import { commercialEnabled } from './flags';

export type Tier = 'demo' | 'standard' | 'allPlatforms';
export type Platform = 'web' | 'ios' | 'android' | 'steam';
export const PLATFORMS: readonly Platform[] = ['web', 'ios', 'android', 'steam'];

export interface Entitlements {
  tier: Tier;
  /** Where the full game was bought (standard); every platform for allPlatforms; none for demo. */
  platforms: Platform[];
  source: 'stub' | 'revenuecat' | 'steam' | 'grandfathered';
  /** When the answer was got (ms since epoch). */
  checkedAt: number;
}

/** The platform this build runs on. The web build is the only one so far. */
export const PLATFORM: Platform = 'web';

/**
 * DECISION (Leon): cross-buy. false: standard unlocks the platform it was bought
 * on and allPlatforms is the tier above it. true (Option A in the launch plan):
 * standard unlocks every platform, as allPlatforms does.
 */
export const CROSS_BUY_INCLUDED = false;

/** Whether `ent` plays the full game on `platform`: standard on its own platforms, allPlatforms everywhere. */
export function hasFullGame(ent: Entitlements, platform: Platform, crossBuyIncluded = CROSS_BUY_INCLUDED): boolean {
  switch (ent.tier) {
    case 'demo': return false;
    case 'allPlatforms': return true;
    case 'standard': return crossBuyIncluded || ent.platforms.includes(platform);
  }
}

/** The entitlements a tier gives on this platform. */
export function entitlementsFor(tier: Tier, source: Entitlements['source'], now = Date.now()): Entitlements {
  const platforms = tier === 'allPlatforms' ? [...PLATFORMS] : tier === 'standard' ? [PLATFORM] : [];
  return { tier, platforms, source, checkedAt: now };
}

// ── Storage ─────────────────────────────────────────────────────────────────

/** localStorage when the page has one (a blocked one reads as none). */
export function commercialStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readKey(key: string): string | null {
  try {
    return commercialStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    commercialStorage()?.setItem(key, value);
  } catch {
    // Storage full or blocked: the answer still holds for this page.
  }
}

// ── Providers ───────────────────────────────────────────────────────────────

/** Where the answer comes from: the local stub now, RevenueCat or Steam later. */
export interface EntitlementProvider {
  current(): Promise<Entitlements>;
  /** Ask the store again (after a purchase). */
  refresh(): Promise<Entitlements>;
  /** Restore purchases (the store's own Restore button). */
  restore(): Promise<Entitlements>;
  /** Buy `tier` through the store (the paywall's Buy, #364). */
  purchase(tier: Tier): Promise<Entitlements>;
  /** Called with each new answer the provider learns of by itself. Returns an unsubscribe. */
  onChange(cb: (ent: Entitlements) => void): () => void;
}

/** The dev-only key the stub keeps its tier in. */
export const STUB_KEY = 'nrl-sim-entitlements-stub';

const TIERS: readonly Tier[] = ['demo', 'standard', 'allPlatforms'];

/**
 * The stand-in store: a tier kept in STUB_KEY. Unset, it is `demo` with the flag
 * on (a commercial build starts in the demo) and `standard` with it off.
 */
export class LocalStubProvider implements EntitlementProvider {
  private listeners = new Set<(ent: Entitlements) => void>();

  /** The answer, at once. */
  read(): Entitlements {
    const stored = readKey(STUB_KEY) as Tier | null;
    const tier = stored && TIERS.includes(stored) ? stored : commercialEnabled() ? 'demo' : 'standard';
    return entitlementsFor(tier, 'stub');
  }

  /** Set the tier (the dev console hook, tests). Listeners hear it straight away. */
  set(tier: Tier): void {
    writeKey(STUB_KEY, tier);
    const ent = this.read();
    for (const cb of [...this.listeners]) cb(ent);
  }

  current(): Promise<Entitlements> { return Promise.resolve(this.read()); }
  refresh(): Promise<Entitlements> { return this.current(); }
  restore(): Promise<Entitlements> { return this.current(); }

  /** The stand-in purchase: the tier changes at once, no payment (#364). */
  purchase(tier: Tier): Promise<Entitlements> {
    this.set(tier);
    return this.current();
  }

  onChange(cb: (ent: Entitlements) => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
}

// ── Service ─────────────────────────────────────────────────────────────────

/** The last good answer, kept across reloads so an offline start is not re-locked. */
export const CACHE_KEY = 'nrl-sim-entitlements-cache';

function readCache(): Entitlements | null {
  const raw = readKey(CACHE_KEY);
  if (!raw) return null;
  try {
    const ent = JSON.parse(raw) as Entitlements;
    return TIERS.includes(ent.tier) && Array.isArray(ent.platforms) ? ent : null;
  } catch {
    return null;
  }
}

/**
 * Asks the provider and keeps its last good answer. A failed ask (offline, the
 * store down) answers with that last one: a dropped network never re-locks a
 * player. snapshot() gives it at once, for the week tick, which can't wait.
 */
export class EntitlementService {
  private last: Entitlements;
  private listeners = new Set<(ent: Entitlements) => void>();

  /** `initial`: the provider's own answer when it has one at once (the stub); else the cache, else demo. */
  constructor(private readonly provider: EntitlementProvider, initial?: Entitlements) {
    this.last = initial ?? readCache() ?? entitlementsFor('demo', 'stub', 0);
    provider.onChange((ent) => this.keep(ent));
  }

  snapshot(): Entitlements { return this.last; }

  current(): Promise<Entitlements> { return this.ask(() => this.provider.current()); }
  refresh(): Promise<Entitlements> { return this.ask(() => this.provider.refresh()); }
  restore(): Promise<Entitlements> { return this.ask(() => this.provider.restore()); }
  purchase(tier: Tier): Promise<Entitlements> { return this.ask(() => this.provider.purchase(tier)); }

  onChange(cb: (ent: Entitlements) => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }

  private async ask(fn: () => Promise<Entitlements>): Promise<Entitlements> {
    try {
      const ent = await fn();
      this.keep(ent);
      return ent;
    } catch {
      return this.last; // fail open
    }
  }

  private keep(ent: Entitlements): void {
    this.last = ent;
    writeKey(CACHE_KEY, JSON.stringify(ent));
    for (const cb of [...this.listeners]) cb(ent);
  }
}

let service: EntitlementService | null = null;

/** The game's entitlement service: the local stub for now. Only ever asked with the flag on. */
export function getEntitlementService(): EntitlementService {
  if (service) return service;
  const stub = new LocalStubProvider();
  service = new EntitlementService(stub, stub.read());
  // `window.__nrlEntitlements.set('standard')` in the dev build's console; play goes on at once.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as unknown as { __nrlEntitlements?: unknown }).__nrlEntitlements = {
      set: (tier: Tier) => stub.set(tier),
      get: () => service?.snapshot(),
    };
  }
  return service;
}

/** Test hook: forget the service (the next ask builds a fresh one). */
export function __resetEntitlementService(): void {
  service = null;
}
