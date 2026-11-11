vi.mock('../../src/art/coachFace', () => ({ coachFaceDataUrl: () => 'data:image/png;base64,face' }));
import { vi, describe, it, expect, beforeEach } from 'vitest';
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
  firstStepIndex,
  nextStepIndex,
  tapUndone,
  hintsArmed,
  hintFor,
  markHintSeen,
  HINTS,
  TAP_COUNT,
  TUTORIAL_END_TEXT,
  overlapArea,
  pickDock,
  onSheetIn,
  type Box,
  type TutorialStep,
} from '../../src/ui/tutorial';
import type { Events } from '../../src/core/events';
import { createNewGame, getState, setState, type GameState } from '../../src/core/state';
import { addFacility } from '../../src/data/club';
import { FACILITY_CATALOG } from '../../src/data/facility';

// Node tests cover the declarative three-tap flow, hint gating and the shared
// speaker block (with the existing stub DOM). Browser checks cover placement,
// anchor scrolling, geometry and the real taps; jsdom is not installed.

// The bus events an event-driven step may reference (#370 adds the Undo's two).
const KNOWN_EVENTS: readonly (keyof Events)[] = [
  'state:changed', 'week:advanced', 'season:ended', 'money:changed',
  'facility:placed', 'facility:removed', 'player:signed', 'player:unsigned', 'match:started', 'match:event',
  'match:finished', 'bankruptcy:warning', 'ui:notify', 'commercial:demoEnded',
];

const byId = new Map<string, TutorialStep>(STEPS.map((s) => [s.id, s]));

describe('STEPS: three guided taps (#370)', () => {
  beforeEach(() => { createNewGame('Test Club', 1); });

  it('addresses the current coach in the first bubble, including an unnamed next game', () => {
    createNewGame('Test Club', 1, { coachName: 'Sam Hale' });
    expect(STEPS[0]!.text).toBe(`Sam Hale, tap ${FACILITY_CATALOG.trainingPaddock.name} to build one.`);
    createNewGame('Test Club', 1);
    expect(STEPS[0]!.text).toBe(`Coach, tap ${FACILITY_CATALOG.trainingPaddock.name} to build one.`);
  });

  it('is build, place, recruit and advance, grouped into three taps', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['build', 'place', 'recruit', 'advance']);
    expect(STEPS.map((s) => s.tap)).toEqual([1, 1, 2, 3]);
    expect(TAP_COUNT).toBe(3);
  });

  it('has no step for the match: the tutorial stands aside until Back to Club (#337 U1)', () => {
    for (const step of STEPS) {
      expect(step.advanceOn).not.toBe('match:started');
      expect(step.advanceOn).not.toBe('match:finished');
    }
  });

  it('keeps every bubble to one short sentence (#370)', () => {
    for (const step of STEPS) expect(sentenceCount(step.text), step.id).toBe(1);
  });

  it('names the paddock as the catalog does, and says what each tap does', () => {
    expect(byId.get('build')!.text).toBe(`Coach, tap ${FACILITY_CATALOG.trainingPaddock.name} to build one.`);
    expect(byId.get('place')!.text).toBe('Pick a green spot, then Build here.');
    expect(byId.get('recruit')!.text).toMatch(/Sign on the best player you can afford/);
    expect(byId.get('advance')!.text).toMatch(/Play Week/);
  });

  it('opens the screen a tap is on, and points inside it (#337 U3)', () => {
    expect(byId.get('build')!.opens).toBe('build');
    expect(byId.get('recruit')!.opens).toBe('recruit');
    expect(byId.get('build')!.anchor!.split(',')[0]).toContain('[data-screen-key="build"] [data-facility="trainingPaddock"]');
    // The first enabled SIGN under the default rating sort: the best player the club can afford.
    expect(byId.get('recruit')!.anchor!.split(',')[0]).toContain('[data-screen-key="recruit"] .nrl-row:has(.nrl-row-action:not(:disabled))');
    expect(byId.get('advance')!.anchor).toBe('.nrl-hud-actions .nrl-btn');
    // The placement step frames the bar on the grass and moves on once the bar is up.
    expect(byId.get('build')!.until).toBe('.nrl-placebar:not([hidden])');
  });

  it('every step is an event step on a real bus event; the advance also ends on the demo stopping it', () => {
    for (const step of STEPS) {
      expect(isEventStep(step), step.id).toBe(true);
      if (isEventStep(step)) expect(KNOWN_EVENTS).toContain(step.advanceOn);
      if (step.revertOn) expect(KNOWN_EVENTS).toContain(step.revertOn);
      if (step.alsoOn) expect(KNOWN_EVENTS).toContain(step.alsoOn);
    }
    expect(byId.get('build')!.advanceOn).toBe('facility:placed');
    expect(byId.get('place')!.advanceOn).toBe('facility:placed');
    expect(byId.get('recruit')!.advanceOn).toBe('player:signed');
    expect(byId.get('advance')!.advanceOn).toBe('week:advanced');
    expect(byId.get('advance')!.alsoOn).toBe('commercial:demoEnded');
  });

  it('an Undo of tap 1 or tap 2 brings the run back to that tap', () => {
    expect(byId.get('build')!.revertOn).toBe('facility:removed');
    expect(byId.get('recruit')!.revertOn).toBe('player:unsigned');
    expect(byId.get('place')!.revertOn).toBeUndefined();
    expect(byId.get('advance')!.revertOn).toBeUndefined();
  });

  it('has unique, non-empty ids and text', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    for (const step of STEPS) {
      expect(step.id.length).toBeGreaterThan(0);
      expect(step.text.trim().length).toBeGreaterThan(0);
    }
    expect(ANCHOR_RETRY_MS).toBeGreaterThan(0);
  });

  it('ends with the old wrap line as a toast, and it still says where the Guide is', () => {
    expect(TUTORIAL_END_TEXT).toContain('in Office');
  });
});

describe('where a run starts, and when an Undo takes it back', () => {
  beforeEach(() => {
    createNewGame('Test Club', 1);
  });

  it('a new game starts at tap 1; with a paddock already up, at tap 2', () => {
    expect(getState().facilities.some((f) => f.defId === 'trainingPaddock')).toBe(false);
    expect(firstStepIndex(getState())).toBe(0);
    addFacility('trainingPaddock', 0, 0, 1);
    expect(STEPS[firstStepIndex(getState())]!.id).toBe('recruit');
  });

  it('an undone paddock reverts tap 1; an undone Weights Room with a paddock up does not', () => {
    const build = byId.get('build')!;
    expect(tapUndone(build, getState())).toBe(true);
    addFacility('trainingPaddock', 0, 0, 1);
    expect(tapUndone(build, getState())).toBe(false);
    expect(tapUndone(byId.get('recruit')!, getState())).toBe(true);
  });
});

describe('first-visit hints (#370)', () => {
  const base: GameState['settings'] = { muted: false, volume: 1, tutorialDone: true, difficulty: 'normal' };

  it('are for Lineup, News, Finance and Contracts, one sentence each', () => {
    expect(Object.keys(HINTS).sort()).toEqual(['contracts', 'finance', 'lineup', 'news']);
    for (const [k, t] of Object.entries(HINTS)) expect(sentenceCount(t), k).toBe(1);
  });

  it('never show on a save without hintsSeen (every save from before #370)', () => {
    expect(hintsArmed(base)).toBe(false);
    for (const k of Object.keys(HINTS)) expect(hintFor(base, k)).toBeNull();
  });

  it('show once per screen once armed', () => {
    let settings: GameState['settings'] = { ...base, hintsSeen: [] };
    expect(hintsArmed(settings)).toBe(true);
    expect(hintFor(settings, 'lineup')).toBe(HINTS.lineup);
    settings = markHintSeen(settings, 'lineup');
    expect(hintFor(settings, 'lineup')).toBeNull();
    expect(hintFor(settings, 'news')).toBe(HINTS.news);
    expect(markHintSeen(settings, 'lineup')).toBe(settings); // already seen: unchanged
    expect(settings.hintsSeen).toEqual(['lineup']);
  });

  it('none on a screen without one, or with no screen', () => {
    const armed = { ...base, hintsSeen: [] };
    expect(hintFor(armed, 'squad')).toBeNull();
    expect(hintFor(armed, 'build')).toBeNull();
    expect(hintFor(armed, null)).toBeNull();
    expect(hintFor(armed, 'toString')).toBeNull();
  });
});

describe('sentenceCount', () => {
  it('counts sentences, not the dots inside them', () => {
    expect(sentenceCount('One. Two!')).toBe(2);
    expect(sentenceCount("That's the loop! The Guide under More explains the rest. Good luck, coach.")).toBe(3);
    expect(sentenceCount('Lineup sets your nine; you can change the plan at half-time.')).toBe(1);
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
    const before = s.settings;
    startTutorial(false);
    expect(isTutorialActive()).toBe(false);
    // tutorialDone must not have been cleared by a no-op start, and an old save gets no hints (#370).
    expect(getState().settings.tutorialDone).toBe(true);
    expect(getState().settings).toBe(before);
    expect(getState().settings.hintsSeen).toBeUndefined();
  });

  it('a new game arms the first-visit hints as the run starts (#370)', () => {
    expect(getState().settings.hintsSeen).toBeUndefined();
    startTutorial();
    expect(getState().settings.hintsSeen).toEqual([]);
  });

  it('Replay tutorial resets the hints (#370)', () => {
    const s = getState();
    setState({ settings: { ...s.settings, tutorialDone: true, hintsSeen: ['lineup', 'news'] } });
    startTutorial(true);
    expect(getState().settings.hintsSeen).toEqual([]);
    // tutorialDone stays true until a run completes.
    expect(getState().settings.tutorialDone).toBe(true);
  });
});

describe('nextStepIndex (#370)', () => {
  const at = (id: string): number => STEPS.findIndex((s) => s.id === id);
  it('the paddock placed while the build step still waits for its bar finishes tap 1', () => {
    expect(STEPS[nextStepIndex(at('build'), 'facility:placed')]!.id).toBe('recruit');
  });
  it('the bar showing (the until poll) moves on to the place step only', () => {
    expect(STEPS[nextStepIndex(at('build'), null)]!.id).toBe('place');
    expect(STEPS[nextStepIndex(at('place'), 'facility:placed')]!.id).toBe('recruit');
  });
  it('never skips into another tap, and the advance ends the run', () => {
    expect(STEPS[nextStepIndex(at('recruit'), 'player:signed')]!.id).toBe('advance');
    expect(nextStepIndex(at('advance'), 'week:advanced')).toBe(STEPS.length);
  });
});

describe('pickDock: clear of the anchor and the Undo toast (#337 U2, #412)', () => {
  const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });
  // 667×375: the bar along the dock (bottom), the bar at the top, and the top-right and right corners.
  const bar = [box(12, 251, 652, 307), box(12, 4, 652, 60), box(300, 4, 655, 60), box(300, 251, 655, 307)];
  const row = box(20, 90, 640, 134); // the first free agent's row, under the header
  const undo = box(195, 235, 472, 295); // the build's Undo toast, just above the dock (TOAST_PAD round it)

  it('measures overlap in px², and none for boxes that only touch', () => {
    expect(overlapArea(box(0, 0, 10, 10), box(5, 5, 20, 20))).toBe(25);
    expect(overlapArea(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(0);
  });

  it('takes the first dock clear of the anchor when no toast is up', () => {
    expect(pickDock(bar, row, null)).toBe(0);
    expect(pickDock(bar, box(20, 250, 640, 300), null)).toBe(1);
  });

  it('skips a dock over the Undo toast though it is clear of the anchor (#412, step 2 after Build here)', () => {
    expect(pickDock(bar, row, undo)).toBe(1);
  });

  it('keeps clear of the toast before the anchor: the toast wins while its Undo counts down', () => {
    // The anchor at the top and the toast at the bottom: only the top docks are clear of the toast.
    const top = box(20, 10, 640, 50);
    expect(pickDock(bar, top, undo)).toBe(2);
    expect(overlapArea(bar[2]!, top)).toBeGreaterThan(0);
  });

  it('stands the bubble aside (-1) when every dock covers the toast', () => {
    expect(pickDock(bar, row, box(0, 0, 667, 375))).toBe(-1);
  });

  it('with every dock over the anchor and no toast, takes the one that covers least', () => {
    // The full-width bars cover 640px of it, the right-hand ones 355px: the right one dips in least (29px).
    const big = box(0, 30, 667, 280);
    expect(pickDock(bar, big, null)).toBe(3);
  });
});

const screenListener = vi.hoisted(() => ({ fn: null as null | ((key: string | null) => void) }));
vi.mock('../../src/ui/dom', async (original) => ({
  ...await original<typeof import('../../src/ui/dom')>(),
  mount: (node: HTMLElement) => document.body.appendChild(node),
  onScreenChange: (fn: (key: string | null) => void) => { screenListener.fn = fn; return () => { screenListener.fn = null; }; },
}));

it('bubbles and first-visit hints contain the shared coach block (#476)', async () => {
  const { coachDocument } = await import('./coachDom');
  const { initFirstVisitHints } = await import('../../src/ui/tutorial');
  const { COACH_NAME } = await import('../../src/ui/coachVoice');
  createNewGame('Test Club', 1);
  const root = coachDocument();
  const off = initFirstVisitHints();
  try {
    startTutorial();
    expect(root.querySelectorAll('[data-coach-line]')).toHaveLength(1);
    expect(root.textContent).toContain(COACH_NAME);
    expect(root.querySelectorAll('[data-step="build"]')).toHaveLength(1);
    endTutorial();
    const screen = document.createElement('div');
    screen.querySelector = () => null;
    (screen as unknown as import('./stubDom').StubNode & { prepend: (n: import('./stubDom').StubNode) => void }).prepend = (n) => (screen as unknown as import('./stubDom').StubNode).appendChild(n);
    root.appendChild(screen as unknown as import('./stubDom').StubNode);
    document.querySelector = (() => screen) as typeof document.querySelector;
    screenListener.fn?.('lineup');
    expect(root.querySelectorAll('[data-hint="lineup"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-coach-line]')).toHaveLength(1);
    expect(root.textContent).toContain(HINTS.lineup);
    expect(root.textContent).toContain(COACH_NAME);
  } finally { endTutorial(); off(); vi.unstubAllGlobals(); }
});

// #611: the ring is measured as the step's sheet mounts, 12px low while the sheet rises;
// it is measured again the moment the sheet lands.
describe('onSheetIn: the anchor is measured again when its sheet has risen (#611)', () => {
  /** A sheet that records its listeners; `fire` sends it an event as the browser would. */
  const fakeSheet = () => {
    const on = new Map<string, Set<(e: Event) => void>>();
    const sheet = {
      addEventListener: (ev: string, fn: (e: Event) => void) => { (on.get(ev) ?? on.set(ev, new Set()).get(ev)!).add(fn); },
      removeEventListener: (ev: string, fn: (e: Event) => void) => { on.get(ev)?.delete(fn); },
    };
    const fire = (ev: string, target: unknown = sheet): void => { for (const fn of [...(on.get(ev) ?? [])]) fn({ target } as Event); };
    const listening = (): number => [...on.values()].reduce((n, fns) => n + fns.size, 0);
    return { sheet, fire, listening };
  };
  const anchorIn = (sheet: unknown, asked: string[] = []) => ({ closest: ((sel: string) => { asked.push(sel); return sheet; }) as HTMLElement['closest'] });

  it('calls once when the sheet\'s entrance ends, and stops listening', () => {
    const { sheet, fire, listening } = fakeSheet();
    const asked: string[] = [];
    let calls = 0;
    onSheetIn(anchorIn(sheet, asked), () => { calls++; });
    expect(asked).toEqual(['.nrl-screen-region, .nrl-nav-sheet']);
    expect(calls).toBe(0);
    fire('animationend');
    fire('animationend');
    expect(calls).toBe(1);
    expect(listening()).toBe(0);
  });

  it('is not set off by an animation ending inside the sheet', () => {
    const { sheet, fire } = fakeSheet();
    let calls = 0;
    onSheetIn(anchorIn(sheet), () => { calls++; });
    fire('animationend', { a: 'row' });
    expect(calls).toBe(0);
    fire('animationend');
    expect(calls).toBe(1);
  });

  it('measures again when the entrance is cut short too', () => {
    const { sheet, fire, listening } = fakeSheet();
    let calls = 0;
    onSheetIn(anchorIn(sheet), () => { calls++; });
    fire('animationcancel');
    expect(calls).toBe(1);
    expect(listening()).toBe(0);
  });

  it('never calls for a sheet that came in without an entrance (a swap), and its teardown lets go', () => {
    const { sheet, fire, listening } = fakeSheet();
    let calls = 0;
    const off = onSheetIn(anchorIn(sheet), () => { calls++; });
    expect(listening()).toBe(2);
    off();
    expect(listening()).toBe(0);
    fire('animationend');
    expect(calls).toBe(0);
  });

  it('does nothing for an anchor outside a sheet (PLAY WEEK, a dock tab)', () => {
    let calls = 0;
    const off = onSheetIn(anchorIn(null), () => { calls++; });
    off();
    expect(calls).toBe(0);
  });
});
