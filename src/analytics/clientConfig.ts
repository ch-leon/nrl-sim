// src/analytics/clientConfig.ts — how the PostHog SDK is set up (#450). Pure: types only from the SDK.
//
// Anonymous by default, as #450 agreed:
//  - cookieless_mode 'always', persistence in memory and disabled: no cookie, no
//    localStorage or sessionStorage, no device id; PostHog counts visitors with a
//    daily server-side hash (the project's own cookieless setting must be on, or
//    PostHog drops these events);
//  - person_profiles 'never': no person records, and the game never calls
//    identify(), alias(), group() or reset();
//  - nothing captured on its own: no autocapture, page views or page leaves, dead
//    clicks, heatmaps, web vitals or console logs; exceptions use guarded listeners;
//  - session replay off (and inputs masked, should it ever be switched on);
//  - no other calls: no feature flags or remote config (advanced_disable_flags), no
//    scripts fetched from PostHog (surveys, recorder, toolbar, site apps).
// before_send is the last gate: sanitized $exception plus events.ts's events, with only their own
// properties, and the page address without its query or hash.

import type { CaptureResult, PostHogConfig } from 'posthog-js/dist/module.slim';
import type { AnalyticsSetup } from './config';
import { sanitizeExceptionProperties } from './exceptions';
import { isEventName, sanitize } from './events';

/** SDK properties that say where a visit came from; dropped. */
const DROPPED = ['$referrer', '$referring_domain', '$initial_referrer', '$initial_referring_domain', '$initial_current_url', '$set', '$set_once'];

/** Only the agreed events, with only their own properties and the SDK's anonymous ones. */
export function beforeSend(e: CaptureResult | null): CaptureResult | null {
  if (!e) return null;
  if (e.event === '$exception') {
    try {
      const properties = sanitizeExceptionProperties(e.properties ?? {});
      return properties ? { uuid: e.uuid, event: '$exception', timestamp: e.timestamp, properties } as CaptureResult : null;
    } catch { return null; }
  }
  if (!isEventName(e.event)) return null;
  const own = sanitize(e.event, e.properties ?? {});
  if (!own) return null;
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e.properties ?? {})) {
    // The SDK's own: $-prefixed, plus its token and distinct_id (the cookieless sentinel).
    if ((k.startsWith('$') || k === 'token' || k === 'distinct_id') && !DROPPED.includes(k)) props[k] = v;
  }
  for (const k of ['$current_url', '$pathname'] as const) {
    if (typeof props[k] === 'string') props[k] = stripQuery(props[k] as string);
  }
  const { $set: _s, $set_once: _o, ...rest } = e;
  return { ...rest, properties: { ...props, ...own } } as CaptureResult;
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** The SDK's options for this setup. */
export function clientConfig(setup: AnalyticsSetup): Partial<PostHogConfig> {
  return {
    api_host: setup.host,
    cookieless_mode: 'always',
    person_profiles: 'never',
    persistence: 'memory',
    disable_persistence: true,
    save_referrer: false,
    save_campaign_params: false,
    autocapture: false,
    rageclick: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_performance: false,
    // #548: guarded window listeners queue errors before this chunk exists.
    // captureException uses the official extension; no duplicate SDK listeners.
    capture_exceptions: false,
    disable_session_recording: true,
    session_recording: { maskAllInputs: true },
    mask_all_text: true,
    mask_all_element_attributes: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    respect_dnt: true,
    before_send: beforeSend,
  };
}
