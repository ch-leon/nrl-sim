// src/analytics/posthogClient.ts — the one module that imports the PostHog SDK (#450).
//
// Only ever loaded by index.ts's dynamic import, after the title screen, so the SDK
// is its own chunk and never in the first load. The slim build: the core client
// with only the official error-tracking extension (#548). Our guarded listeners
// queue early errors; SDK autocapture stays off to avoid a second capture path.

import posthog from 'posthog-js/dist/module.slim';
import { ErrorTrackingExtensions } from 'posthog-js/dist/extension-bundles';
import { EXCEPTION_MESSAGE } from './exceptions';
import type { AnalyticsSetup } from './config';
import type { AnalyticsClient } from './index';
import { clientConfig } from './clientConfig';

export function createClient(setup: AnalyticsSetup): AnalyticsClient {
  posthog.init(setup.token, { ...clientConfig(setup), __extensionClasses: ErrorTrackingExtensions });
  return {
    captureException(error, props) {
      const safe = new Error(EXCEPTION_MESSAGE);
      safe.name = error.type;
      safe.stack = `${error.type}: ${EXCEPTION_MESSAGE}\n${error.frames.map((f) => `    at ${f.filename}:${f.lineno}:${f.colno}`).join('\n')}`;
      posthog.captureException(safe, props);
    },
    capture(name, props) {
      posthog.capture(name, props);
    },
  };
}
