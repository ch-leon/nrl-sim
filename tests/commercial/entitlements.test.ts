import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  type Entitlements, type EntitlementProvider, type Tier, type Platform,
  CACHE_KEY, EntitlementService, LocalStubProvider, PLATFORMS, STUB_KEY,
  entitlementsFor, getEntitlementService, hasFullGame, __resetEntitlementService,
} from '../../src/commercial/entitlements';
import {
  type RcCustomerInfo, type RcPurchasesClient, RC_ENTITLEMENT_IDS, RevenueCatProvider, entitlementsFromCustomerInfo,
} from '../../src/commercial/revenuecat';
import { __setCommercial } from '../../src/commercial/flags';
import { stubLocalStorage, type MemStorage } from './memStorage';

let storage: MemStorage;

beforeEach(() => {
  storage = stubLocalStorage();
  __resetEntitlementService();
});

afterEach(() => {
  __setCommercial(null);
  __resetEntitlementService();
  vi.unstubAllGlobals();
});

const ent = (tier: Tier, platforms: Platform[]): Entitlements => ({ tier, platforms, source: 'stub', checkedAt: 0 });

describe('hasFullGame (#362)', () => {
  it('demo never has the full game, on any platform, cross-buy or not', () => {
    for (const p of PLATFORMS) {
      expect(hasFullGame(ent('demo', []), p, false)).toBe(false);
      expect(hasFullGame(ent('demo', []), p, true)).toBe(false);
    }
  });

  it('standard unlocks the platforms it was bought on; with cross-buy, every platform', () => {
    const iosOnly = ent('standard', ['ios']);
    expect(hasFullGame(iosOnly, 'ios', false)).toBe(true);
    for (const p of ['web', 'android', 'steam'] as const) {
      expect(hasFullGame(iosOnly, p, false)).toBe(false);
      expect(hasFullGame(iosOnly, p, true)).toBe(true);
    }
    expect(hasFullGame(ent('standard', ['web', 'android']), 'android', false)).toBe(true);
  });

  it('allPlatforms unlocks every platform, cross-buy or not', () => {
    for (const p of PLATFORMS) {
      expect(hasFullGame(ent('allPlatforms', []), p, false)).toBe(true);
      expect(hasFullGame(ent('allPlatforms', []), p, true)).toBe(true);
    }
  });

  it('entitlementsFor gives the web build its own platform for standard, all for allPlatforms', () => {
    expect(entitlementsFor('standard', 'stub', 5)).toEqual({ tier: 'standard', platforms: ['web'], source: 'stub', checkedAt: 5 });
    expect(entitlementsFor('allPlatforms', 'stub').platforms).toEqual([...PLATFORMS]);
    expect(entitlementsFor('demo', 'stub').platforms).toEqual([]);
  });
});

describe('LocalStubProvider (#362)', () => {
  it('defaults to demo with the flag on and standard with it off, writing nothing', async () => {
    __setCommercial(true);
    expect((await new LocalStubProvider().current()).tier).toBe('demo');
    __setCommercial(false);
    expect((await new LocalStubProvider().current()).tier).toBe('standard');
    expect(storage.writes).toEqual([]);
  });

  it('keeps a set tier in its dev key and tells listeners at once', () => {
    __setCommercial(true);
    const stub = new LocalStubProvider();
    const heard: Tier[] = [];
    stub.onChange((e) => heard.push(e.tier));
    stub.set('allPlatforms');
    expect(storage.map.get(STUB_KEY)).toBe('allPlatforms');
    expect(heard).toEqual(['allPlatforms']);
    expect(new LocalStubProvider().read()).toMatchObject({ tier: 'allPlatforms', source: 'stub' });
  });

  it('ignores a stored value that is not a tier', () => {
    __setCommercial(true);
    storage.map.set(STUB_KEY, 'premium');
    expect(new LocalStubProvider().read().tier).toBe('demo');
  });

  it('getEntitlementService uses the stub and follows its changes without a reload', () => {
    __setCommercial(true);
    const page: { __nrlEntitlements?: { set: (t: Tier) => void } } = {};
    vi.stubGlobal('window', page);
    const service = getEntitlementService();
    expect(service.snapshot()).toMatchObject({ tier: 'demo', source: 'stub' });
    expect(getEntitlementService()).toBe(service);
    page.__nrlEntitlements!.set('standard'); // the dev console hook

    expect(service.snapshot()).toMatchObject({ tier: 'standard', platforms: ['web'] });
  });
});

/** A provider whose answers a test scripts; `null` throws (offline). */
function scripted(answers: (Entitlements | null)[]): EntitlementProvider {
  const next = async (): Promise<Entitlements> => {
    const a = answers.shift();
    if (!a) throw new Error('offline');
    return a;
  };
  return { current: next, refresh: next, restore: next, onChange: () => () => {} };
}

describe('EntitlementService fail-open cache (#362)', () => {
  it('answers a failed ask with the last good answer, never re-locking', async () => {
    const service = new EntitlementService(scripted([ent('standard', ['web']), null, null]));
    expect((await service.current()).tier).toBe('standard');
    expect((await service.refresh()).tier).toBe('standard');
    expect((await service.current()).tier).toBe('standard');
    expect(service.snapshot().tier).toBe('standard');
  });

  it('keeps the last good answer across a reload, so an offline start is not re-locked', async () => {
    await new EntitlementService(scripted([ent('allPlatforms', [...PLATFORMS])])).current();
    expect(storage.map.has(CACHE_KEY)).toBe(true);
    const reloaded = new EntitlementService(scripted([null]));
    expect((await reloaded.current()).tier).toBe('allPlatforms');
  });

  it('starts at demo with nothing to fall back on', async () => {
    const service = new EntitlementService(scripted([null]));
    expect((await service.current()).tier).toBe('demo');
  });

  it('takes a real answer that changes the tier (a refund is not a dropped network)', async () => {
    const service = new EntitlementService(scripted([ent('standard', ['web']), ent('demo', [])]));
    await service.current();
    expect((await service.refresh()).tier).toBe('demo');
  });

  it('tells its listeners of each new answer', async () => {
    const service = new EntitlementService(scripted([ent('standard', ['web'])]));
    const heard: Tier[] = [];
    service.onChange((e) => heard.push(e.tier));
    await service.restore();
    expect(heard).toEqual(['standard']);
  });
});

/** A CustomerInfo with these entitlement ids active. */
function info(...active: string[]): RcCustomerInfo {
  return { entitlements: { active: Object.fromEntries(active.map((id) => [id, { identifier: id, isActive: true }])) } };
}

describe('RevenueCat seam (#362)', () => {
  it('maps CustomerInfo to our entitlements', () => {
    expect(entitlementsFromCustomerInfo(info(), 7)).toEqual({ tier: 'demo', platforms: [], source: 'revenuecat', checkedAt: 7 });
    expect(entitlementsFromCustomerInfo(info('standard_web'), 7)).toEqual({ tier: 'standard', platforms: ['web'], source: 'revenuecat', checkedAt: 7 });
    expect(entitlementsFromCustomerInfo(info('standard_ios', 'standard_android')).platforms).toEqual(['ios', 'android']);
    expect(entitlementsFromCustomerInfo(info('standard_ios', 'all_platforms')))
      .toMatchObject({ tier: 'allPlatforms', platforms: [...PLATFORMS] });
    expect(entitlementsFromCustomerInfo(info('some_other_thing')).tier).toBe('demo');
    // An entitlement listed but not active doesn't count.
    const lapsed: RcCustomerInfo = { entitlements: { active: { standard_web: { identifier: 'standard_web', isActive: false } } } };
    expect(entitlementsFromCustomerInfo(lapsed).tier).toBe('demo');
  });

  it('keeps the RevenueCat ids in one config object', () => {
    expect(RC_ENTITLEMENT_IDS).toEqual({
      allPlatforms: 'all_platforms',
      standard: { web: 'standard_web', ios: 'standard_ios', android: 'standard_android' },
    });
  });

  it('drives a fake Purchases client: logIn, getCustomerInfo, restorePurchases and updates', async () => {
    let push: ((i: RcCustomerInfo) => void) | undefined;
    const client: RcPurchasesClient = {
      logIn: vi.fn(async () => ({ customerInfo: info('standard_web'), created: false })),
      getCustomerInfo: vi.fn(async () => info('standard_web')),
      restorePurchases: vi.fn(async () => info('all_platforms')),
      addCustomerInfoUpdateListener: (cb) => { push = cb; },
    };
    const rc = new RevenueCatProvider(client, () => 42);
    expect(await rc.logIn('supabase-user-id')).toMatchObject({ tier: 'standard', platforms: ['web'], checkedAt: 42 });
    expect(client.logIn).toHaveBeenCalledWith('supabase-user-id');
    expect((await rc.current()).tier).toBe('standard');
    expect((await rc.refresh()).tier).toBe('standard');
    expect((await rc.restore()).tier).toBe('allPlatforms');

    const service = new EntitlementService(rc);
    push!(info('all_platforms'));
    expect(service.snapshot()).toMatchObject({ tier: 'allPlatforms', source: 'revenuecat' });
  });

  it('fails open through the service when the client throws', async () => {
    const client: RcPurchasesClient = {
      logIn: async () => ({ customerInfo: info(), created: true }),
      getCustomerInfo: vi.fn<() => Promise<RcCustomerInfo>>()
        .mockResolvedValueOnce(info('standard_web'))
        .mockRejectedValueOnce(new Error('network')),
      restorePurchases: async () => info(),
    };
    const service = new EntitlementService(new RevenueCatProvider(client));
    expect((await service.current()).tier).toBe('standard');
    expect((await service.current()).tier).toBe('standard');
  });
});
