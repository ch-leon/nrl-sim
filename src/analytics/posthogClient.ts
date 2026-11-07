// src/analytics/posthogClient.ts — the one module that imports the PostHog SDK (#450).
//
// Only ever loaded by index.ts's dynamic import, after the title screen, so the SDK
// is its own chunk and never in the first load. The slim build: the core client
// without the extensions (autocapture, replay, surveys, error tracking), none of
// which #450 turns on. Its options are clientConfig.ts's.

import posthog from 'posthog-js/dist/module.slim';
import type { AnalyticsSetup } from './config';
import type { AnalyticsClient } from './index';
import { clientConfig } from './clientConfig';

export function createClient(setup: AnalyticsSetup): AnalyticsClient {
  posthog.init(setup.token, clientConfig(setup));
  return {
    capture(name, props) {
      posthog.capture(name, props);
    },
  };
}
