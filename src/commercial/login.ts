// src/commercial/login.ts — "Already bought? Log in" (commercial foundations 05, #364).
//
// The seam an account plugs into. Accounts will be Supabase users (DECISION
// (Leon): Supabase project), signing in with Apple, Google or email; the user's
// id becomes RevenueCat's app user id (RevenueCatProvider.logIn), so what they
// bought follows them. None of that exists yet: the game's provider says "coming
// soon", and a dev build has a fake one that signs straight in.

import { type EntitlementService, getEntitlementService } from './entitlements';

export type LoginMethod = 'apple' | 'google' | 'email';

export interface LoginResult {
  ok: boolean;
  /** The account's id once signed in. */
  userId?: string;
}

export interface LoginProvider {
  /** Whether signing in works yet. */
  readonly available: boolean;
  signIn(method: LoginMethod): Promise<LoginResult>;
}

/** No accounts yet: signing in never succeeds. */
export const COMING_SOON_LOGIN: LoginProvider = {
  available: false,
  signIn: () => Promise.resolve({ ok: false }),
};

/** Dev builds only: signs in at once as a made-up account. */
export const DEV_FAKE_LOGIN: LoginProvider = {
  available: true,
  signIn: () => Promise.resolve({ ok: true, userId: 'dev-fake-account' }),
};

/** The game's login provider. */
export function loginProvider(): LoginProvider {
  return COMING_SOON_LOGIN;
}

/** Sign in, and on success ask the entitlement service again: the account may own the full game. */
export async function logIn(
  provider: LoginProvider, method: LoginMethod, service: EntitlementService = getEntitlementService(),
): Promise<LoginResult> {
  const res = await provider.signIn(method);
  if (res.ok) await service.refresh();
  return res;
}
