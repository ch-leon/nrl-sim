import posthog, { isPostHogConfigured } from './posthog';

type GameLogAttributes = Record<string, boolean | number | string>;

/** Dedicated PostHog logger: only purpose-written game lifecycle records leave the client. */
export const gameLog = {
  info(message: string, attributes: GameLogAttributes): void {
    if (isPostHogConfigured) posthog.logger.info(message, attributes);
  },
};
