import { describe, it, expect, vi } from 'vitest';
import { MATCH_ACTIVE_CLASS, scheduleUpdatePrompt, type UpdatePromptHooks } from '../../src/ui/updatePrompt';
import { MATCH_ACTIVE_CLASS as OVERLAY_CLASS } from '../../src/ui/screens/matchOverlay';

/** A fake <body> flag with subscribers, standing in for the MutationObserver. */
function fakeHooks(matchActive: boolean) {
  const listeners = new Set<() => void>();
  const show = vi.fn();
  let active = matchActive;
  const hooks: UpdatePromptHooks = {
    matchActive: () => active,
    onMatchFlagChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    show,
  };
  const setMatch = (on: boolean): void => {
    active = on;
    for (const cb of [...listeners]) cb();
  };
  return { hooks, show, setMatch, listeners };
}

describe('scheduleUpdatePrompt', () => {
  it('uses the same body class as the match overlay', () => {
    expect(MATCH_ACTIVE_CLASS).toBe(OVERLAY_CLASS);
  });

  it('shows at once when no match is on screen', () => {
    const f = fakeHooks(false);
    expect(scheduleUpdatePrompt(f.hooks)).toBe('shown');
    expect(f.show).toHaveBeenCalledTimes(1);
    expect(f.listeners.size).toBe(0);
  });

  it('waits for the match to end, then shows once and stops listening', () => {
    const f = fakeHooks(true);
    expect(scheduleUpdatePrompt(f.hooks)).toBe('deferred');
    expect(f.show).not.toHaveBeenCalled();
    f.setMatch(true); // the class changed but the match is still on
    expect(f.show).not.toHaveBeenCalled();
    f.setMatch(false); // full time, overlay gone
    expect(f.show).toHaveBeenCalledTimes(1);
    expect(f.listeners.size).toBe(0);
    f.setMatch(true);
    f.setMatch(false); // the next match's end must not show it again
    expect(f.show).toHaveBeenCalledTimes(1);
  });

  it('shows straight away if the flag cleared before it subscribed', () => {
    const f = fakeHooks(true);
    // The subscription itself finds the match already over.
    f.hooks.onMatchFlagChange = (cb) => {
      f.setMatch(false);
      f.listeners.add(cb);
      return () => f.listeners.delete(cb);
    };
    expect(scheduleUpdatePrompt(f.hooks)).toBe('deferred');
    expect(f.show).toHaveBeenCalledTimes(1);
  });
});
