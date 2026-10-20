import { describe, it, expect, beforeEach } from 'vitest';
import {
  STEPS,
  shouldAutoStart,
  isEventStep,
  isTutorialActive,
  startTutorial,
  endTutorial,
  ANCHOR_RETRY_MS,
  type TutorialStep,
} from '../../src/ui/tutorial';
import type { Events } from '../../src/core/events';
import { createNewGame, getState } from '../../src/core/state';

// DOM rendering (bubble / cutout / anchor scrolling) is NOT unit-tested: jsdom is
// not installed and the vitest environment is 'node' (see vite.config.ts). Those
// paths self-guard on `typeof document` and are covered by manual/preview QA.
// These specs cover the pure, DOM-free contract: the declarative step list, the
// advance-on mapping, and tutorialDone gating.

// The 7 canonical event names an event-driven step is allowed to reference.
const KNOWN_EVENTS: readonly (keyof Events)[] = [
  'state:changed', 'week:advanced', 'season:ended', 'money:changed',
  'facility:placed', 'player:signed', 'match:started', 'match:event',
  'match:finished', 'bankruptcy:warning', 'ui:notify',
];

describe('STEPS (declarative step list invariants)', () => {
  it('has the 7 spec steps plus News, Finance and Contracts (#188) and Lineup (N11), in order', () => {
    expect(STEPS.map((s) => s.id)).toEqual([
      'welcome', 'build', 'recruit', 'squad', 'lineup', 'advance', 'match', 'news', 'finance', 'contracts', 'wrap',
    ]);
  });

  it('gives every step a non-empty id and text', () => {
    for (const step of STEPS) {
      expect(step.id.length).toBeGreaterThan(0);
      expect(step.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('has unique step ids', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
  });

  it('first and last steps advance on the Next button, last is wrap', () => {
    const last = STEPS[STEPS.length - 1]!;
    expect(STEPS[0]!.advanceOn).toBe('next-button');
    expect(last.id).toBe('wrap');
    expect(last.advanceOn).toBe('next-button');
  });
});

describe('advance-on mapping', () => {
  it('maps each spec step to the correct advance trigger', () => {
    const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));
    expect(byId.get('welcome')!.advanceOn).toBe('next-button');
    expect(byId.get('build')!.advanceOn).toBe('facility:placed');
    expect(byId.get('recruit')!.advanceOn).toBe('player:signed');
    expect(byId.get('squad')!.advanceOn).toBe('next-button');
    expect(byId.get('advance')!.advanceOn).toBe('week:advanced');
    expect(byId.get('match')!.advanceOn).toBe('match:finished');
    expect(byId.get('wrap')!.advanceOn).toBe('next-button');
  });

  it('every event step references a real bus event name', () => {
    for (const step of STEPS) {
      if (isEventStep(step)) {
        expect(KNOWN_EVENTS).toContain(step.advanceOn);
      }
    }
  });

  it('isEventStep is true iff advanceOn is not the Next button', () => {
    for (const step of STEPS) {
      expect(isEventStep(step)).toBe(step.advanceOn !== 'next-button');
    }
  });

  it('classifies the 4 event steps and 7 button steps', () => {
    const eventSteps = STEPS.filter(isEventStep);
    expect(eventSteps.map((s) => s.id)).toEqual([
      'build', 'recruit', 'advance', 'match',
    ]);
    const buttonSteps = STEPS.filter((s) => !isEventStep(s));
    expect(buttonSteps.map((s) => s.id)).toEqual(['welcome', 'squad', 'lineup', 'news', 'finance', 'contracts', 'wrap']);
  });
});

describe('anchors', () => {
  it('centers welcome/match/wrap and anchors build/recruit/squad/advance', () => {
    const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));
    expect(byId.get('welcome')!.anchor).toBeNull();
    expect(byId.get('match')!.anchor).toBeNull();
    expect(byId.get('wrap')!.anchor).toBeNull();
    for (const id of ['build', 'recruit', 'squad', 'lineup', 'advance']) {
      expect(byId.get(id)!.anchor).not.toBeNull();
    }
  });

  it('exposes a positive anchor-retry window', () => {
    expect(ANCHOR_RETRY_MS).toBeGreaterThan(0);
  });
});

describe('shouldAutoStart (tutorialDone gating)', () => {
  it('runs auto-start only when tutorialDone is false', () => {
    expect(shouldAutoStart({ tutorialDone: false })).toBe(true);
    expect(shouldAutoStart({ tutorialDone: true })).toBe(false);
  });
});

describe('startTutorial gating (node / DOM-less)', () => {
  beforeEach(() => {
    // Fresh state per test; endTutorial() is a no-op if nothing is active.
    createNewGame('Test Club', 1);
    endTutorial();
  });

  it('never activates in a DOM-less env, but respects the gate first', () => {
    // Fresh game: tutorialDone=false, so the gate passes; but with no `document`
    // in node the run cannot render, so it stays inactive.
    expect(typeof document).toBe('undefined');
    expect(getState().settings.tutorialDone).toBe(false);
    startTutorial();
    expect(isTutorialActive()).toBe(false);
  });

  it('no-ops (stays inactive) when tutorialDone is already true and not forced', () => {
    const s = getState();
    s.settings.tutorialDone = true;
    startTutorial(false);
    expect(isTutorialActive()).toBe(false);
    // tutorialDone must not have been cleared by a no-op start.
    expect(getState().settings.tutorialDone).toBe(true);
  });
});
