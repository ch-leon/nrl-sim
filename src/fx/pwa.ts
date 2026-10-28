// src/fx/pwa.ts — BAK-204 (WU-16): PWA install UX + service-worker registration.
//
// initPwa() is called once by the orchestrator from main.ts. It:
//   * registers the service worker (plugin's virtual module). Updates are
//     prompted, not forced (N7, GitHub #181): a new build waits until the player
//     taps Reload on the "New version ready" bar (src/ui/updatePrompt.ts), and
//     that bar never appears during a match,
//   * checks for a new build every UPDATE_CHECK_MS and whenever the app comes
//     back to the foreground (main deploys after every merge),
//   * captures `beforeinstallprompt` so we can offer an Install button
//     (Android/desktop Chromium) via canInstall()/promptInstall(),
//   * on install-incapable iOS Safari, shows a one-time "Add to Home Screen"
//     instruction toast through the typed event bus ('ui:notify').
//
// No Phaser import. SW registration uses `virtual:pwa-register`, dynamically
// imported inside initPwa() and wrapped in try/catch so the Vitest node env
// (where the virtual module does not resolve) never fails or eagerly imports it.

/// <reference types="vite-plugin-pwa/vanillajs" />

// #89: set to true in the native Android build (vite.config.ts define). There the
// app is served from the APK, so registering a service worker would only add a
// cache-first copy that could go stale; `typeof` guards the Vitest/node env where
// the define is absent.
declare const __NRL_NATIVE__: boolean | undefined;

import { bus } from '../core/events';
import { domUpdateHooks, scheduleUpdatePrompt } from '../ui/updatePrompt';
import { browserStorage } from '../core/storage/local';
import { IOS_INSTALL_HINT_KEY } from '../core/storageKeys';

/** The `beforeinstallprompt` event, typed minimally (not in lib.dom yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** How long the install hint stays in view (a tap dismisses it sooner). */
export const IOS_HINT_MS = 8000;
/** How often a running app asks the server whether a new build is up. */
export const UPDATE_CHECK_MS = 15 * 60 * 1000;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialised = false;
/** Applies the waiting build (reloads the page); set once one is waiting. */
let applyUpdate: (() => Promise<void>) | null = null;

/** A new build is downloaded and waiting for a reload. */
export function updateReady(): boolean {
  return applyUpdate !== null;
}

/** Swap to the waiting build now (the page reloads). No-op when none is waiting. */
export function reloadForUpdate(): void {
  void applyUpdate?.();
}

/** True once a `beforeinstallprompt` has been captured and not yet consumed. */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** Running as an installed/standalone app (Android/desktop or iOS Safari). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari exposes navigator.standalone (non-standard).
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mm || iosStandalone);
}

/** Heuristic: iOS Safari (which fires no beforeinstallprompt). */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; disambiguate via touch points.
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  // Exclude in-app browsers / other engines wrapped on iOS.
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
  return isSafari;
}

/**
 * Trigger the native install prompt if one was captured. Resolves with the
 * user's choice, or 'unavailable' when no deferred prompt exists.
 */
export async function promptInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  const dp = deferredPrompt;
  if (!dp) return 'unavailable';
  deferredPrompt = null; // a prompt can only be used once
  await dp.prompt();
  const { outcome } = await dp.userChoice;
  return outcome;
}

/**
 * Idempotently wire install-prompt capture, SW registration and the iOS hint.
 * Safe to call in any environment; no-ops without a DOM. `holdIosHint` defers
 * the hint (main.ts holds it until the tutorial ends, #337 U4).
 */
export function initPwa(opts: { holdIosHint?: (show: () => void) => void } = {}): void {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // suppress the mini-infobar; we drive the UI ourselves
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  // Once installed, drop any captured prompt.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  // Register the service worker. The virtual module only exists in a Vite
  // build/dev graph, so guard against environments (Vitest) where it cannot be
  // resolved.
  void registerServiceWorker();

  (opts.holdIosHint ?? ((show) => show()))(maybeShowIosHint);

  // `?e2e` (scripts/e2e-season.mjs): let the playthrough raise the update bar
  // without deploying a build, so it can check the bar waits for full time.
  if (new URLSearchParams(location.search).has('e2e')) {
    const w = window as unknown as { __nrlUpdateReady?: () => void };
    w.__nrlUpdateReady = () => onNewBuildWaiting(() => Promise.resolve());
  }
}

/** A new build is waiting: remember how to apply it and prompt (after any match). */
function onNewBuildWaiting(apply: () => Promise<void>): void {
  applyUpdate = apply;
  scheduleUpdatePrompt(domUpdateHooks(() => void apply()));
}

/**
 * Ask the browser to look for a new service worker every UPDATE_CHECK_MS and
 * whenever the page becomes visible again. Pure wiring so a test can drive it
 * with fake timers; returns a disposer.
 */
export function startUpdateChecks(
  check: () => Promise<unknown>,
  opts: { intervalMs?: number; doc?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'> } = {},
): () => void {
  const run = (): void => {
    void check().catch(() => {
      // Offline, or the server is mid-deploy: the next check will try again.
    });
  };
  const timer = setInterval(run, opts.intervalMs ?? UPDATE_CHECK_MS);
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null);
  const onVisible = (): void => {
    if (doc?.visibilityState === 'visible') run();
  };
  doc?.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    doc?.removeEventListener('visibilitychange', onVisible);
  };
}

async function registerServiceWorker(): Promise<void> {
  // #89: never register a SW inside the native Android app.
  if (typeof __NRL_NATIVE__ !== 'undefined' && __NRL_NATIVE__) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => onNewBuildWaiting(() => update(true)),
      onRegisteredSW: (_url, reg) => {
        if (reg) startUpdateChecks(() => reg.update());
      },
    });
  } catch {
    // Virtual module unavailable (test/unsupported env) — SW simply not registered.
  }
}

function maybeShowIosHint(): void {
  if (!isIosSafari() || isStandalone()) return;
  try {
    const storage = browserStorage();
    if (storage?.getItem(IOS_INSTALL_HINT_KEY)) return;
    storage?.setItem(IOS_INSTALL_HINT_KEY, '1');
  } catch {
    // localStorage blocked (private mode) — show the hint anyway, once per load.
  }
  // A toast like any other (#339): in the lane, never over a screen's header; it stays a while.
  bus.emit('ui:notify', {
    text: 'Tap Share → Add to Home Screen to install',
    kind: 'info',
    ms: IOS_HINT_MS,
  });
}
