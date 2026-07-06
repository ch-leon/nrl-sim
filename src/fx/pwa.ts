// src/fx/pwa.ts — BAK-204 (WU-16): PWA install UX + service-worker registration.
//
// initPwa() is called once by the orchestrator from main.ts. It:
//   * registers the auto-updating service worker (plugin's virtual module),
//   * captures `beforeinstallprompt` so we can offer an Install button
//     (Android/desktop Chromium) via canInstall()/promptInstall(),
//   * on install-incapable iOS Safari, shows a one-time "Add to Home Screen"
//     instruction toast through the typed event bus ('ui:notify').
//
// No Phaser import. SW registration uses `virtual:pwa-register`, dynamically
// imported inside initPwa() and wrapped in try/catch so the Vitest node env
// (where the virtual module does not resolve) never fails or eagerly imports it.

/// <reference types="vite-plugin-pwa/vanillajs" />

import { bus } from '../core/events';

/** The `beforeinstallprompt` event, typed minimally (not in lib.dom yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IOS_HINT_KEY = 'nrlsim.iosInstallHintShown';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialised = false;

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
 * Safe to call in any environment; no-ops without a DOM.
 */
export function initPwa(): void {
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

  // Register the auto-updating service worker. The virtual module only exists
  // in a Vite build/dev graph, so guard against environments (Vitest) where it
  // cannot be resolved.
  void registerServiceWorker();

  maybeShowIosHint();
}

async function registerServiceWorker(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch {
    // Virtual module unavailable (test/unsupported env) — SW simply not registered.
  }
}

function maybeShowIosHint(): void {
  if (!isIosSafari() || isStandalone()) return;
  try {
    if (localStorage.getItem(IOS_HINT_KEY)) return;
    localStorage.setItem(IOS_HINT_KEY, '1');
  } catch {
    // localStorage blocked (private mode) — show the hint anyway, once per load.
  }
  bus.emit('ui:notify', {
    text: 'Tap Share → Add to Home Screen to install',
    kind: 'info',
  });
}
