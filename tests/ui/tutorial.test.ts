import { describe, it, expect, beforeEach } from 'vitest';
import {
  STEPS,
  shouldAutoStart,
  isEventStep,
  isTutorialActive,
  startTutorial,
  endTutorial,
  ANCHOR_RETRY_MS,
  sentenceCount,
  whenTutorialDone,
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
  it('walks build, place, recruit, squad, lineup and the first week, then News, Finance and Contracts (#337)', () => {
    expect(STEPS.map((s) => s.id)).toEqual([
      'welcome', 'build', 'place', 'recruit', 'squad', 'lineup', 'advance', 'news', 'finance', 'contracts', 'wrap',
    ]);
  });

  it('has no step for the match: the tutorial stands aside until Back to Club (#337 U1)', () => {
    for (const step of STEPS) {
      expect(step.advanceOn).not.toBe('match:started');
      expect(step.advanceOn).not.toBe('match:finished');
    }
  });

  it('keeps every bubble to two sentences (#337 U3)', () => {
    for (const step of STEPS) expect(sentenceCount(step.text), step.id).toBeLessThanOrEqual(2);
  });

  it('opens the screen a step explains, and points inside it (#337 U3)', () => {
    const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));
    for (const [id, screen] of [['build', 'build'], ['recruit', 'recruit'], ['squad', 'squad'], ['lineup', 'lineup'], ['news', 'news'], ['finance', 'finance'], ['contracts', 'contracts']] as const) {
      expect(byId.get(id)!.opens, id).toBe(screen);
    }
    expect(byId.get('build')!.anchor!.split(',')[0]).toContain('[data-screen-key="build"] [data-facility="trainingPaddock"]');
    expect(byId.get('recruit')!.anchor!.split(',')[0]).toContain('[data-screen-key="recruit"] .nrl-row');
    // The placement step frames the bar on the grass and moves on once the bar is up.
    expect(byId.get('build')!.until).toBe('.nrl-placebar:not([hidden])');
    expect(byId.get('place')!.text).toContain('green spot on the grass');
  });

  it('copy names the 5-tab nav: screens under More say so', () => {
    const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));
    expect(byId.get('finance')!.text).toContain('in Office');
    expect(byId.get('wrap')!.text).toContain('in Office');
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
    expect(byId.get('place')!.advanceOn).toBe('facility:placed');
    expect(byId.get('recruit')!.advanceOn).toBe('player:signed');
    expect(byId.get('squad')!.advanceOn).toBe('next-button');
    expect(byId.get('advance')!.advanceOn).toBe('week:advanced');
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
      'build', 'place', 'recruit', 'advance',
    ]);
    const buttonSteps = STEPS.filter((s) => !isEventStep(s));
    expect(buttonSteps.map((s) => s.id)).toEqual(['welcome', 'squad', 'lineup', 'news', 'finance', 'contracts', 'wrap']);
  });
});

describe('anchors', () => {
  it('centers welcome/wrap and anchors build/place/recruit/squad/lineup/advance', () => {
    const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));
    expect(byId.get('welcome')!.anchor).toBeNull();
    expect(byId.get('wrap')!.anchor).toBeNull();
    for (const id of ['build', 'place', 'recruit', 'squad', 'lineup', 'advance']) {
      expect(byId.get(id)!.anchor).not.toBeNull();
    }
  });

  it('exposes a positive anchor-retry window', () => {
    expect(ANCHOR_RETRY_MS).toBeGreaterThan(0);
  });
});

describe('sentenceCount', () => {
  it('counts sentences, not the dots inside them', () => {
    expect(sentenceCount('One. Two!')).toBe(2);
    expect(sentenceCount("That's the loop! The Guide under More explains the rest. Good luck, coach.")).toBe(3);
    expect(sentenceCount('No stop at the end')).toBe(1);
  });
});

describe('whenTutorialDone', () => {
  it('runs at once when no tutorial is up (the iOS install hint, #337 U4)', () => {
    let ran = 0;
    whenTutorialDone(() => ran++);
    expect(ran).toBe(1);
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
