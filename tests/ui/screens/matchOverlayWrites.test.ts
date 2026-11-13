// tests/ui/screens/matchOverlayWrites.test.ts — the match overlay writes the page only
// when what it shows changes (#602). The clock is set every frame and the score every
// event: writing the same words again still costs a style pass, a layout and a paint.
// So the clock is written once a displayed second, the half label and the scores when
// they change, the Replay chip's seconds once a second; the open stats sheet keeps its
// rows and rewrites only the cells that moved; and the commentary line's fitter (#433)
// measures nothing while the line is not showing, and once a frame at most.
// The real overlay, mounted on the stub DOM with every write and layout read counted.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from '../stubDom';
import { bus } from '../../../src/core/events';
import {
  HeldText,
  TICKER_MIN_PX,
  initLiveState,
  mountMatchOverlay,
  possessionPct,
  reduceEvent,
  statSplit,
  unmountMatchOverlay,
  type MatchOverlayHandle,
} from '../../../src/ui/screens/matchOverlay';
import { NINES } from '../../../src/match/league/rules';
import { REPLAY_OFFER_MS } from '../../../src/match/view/replay';
import type { MatchEvent, TeamSheet } from '../../../src/sim/events';

/** Layout reads (clientHeight, scrollHeight, clientWidth) since the last reset. */
let layoutReads = 0;

/** A stub node with the few more things the overlay touches. It counts each write of its words. */
class PageNode extends StubNode {
  dataset: Record<string, string> = {};
  textWrites = 0;
  /** What its box measures: the test sets these to stand a long line up. */
  box = { clientHeight: 40, scrollHeight: 40, clientWidth: 400 };
  override get textContent(): string { return super.textContent; }
  override set textContent(v: string) { this.textWrites++; super.textContent = v; }
  get clientHeight(): number { layoutReads++; return this.box.clientHeight; }
  get scrollHeight(): number { layoutReads++; return this.box.scrollHeight; }
  get clientWidth(): number { layoutReads++; return this.box.clientWidth; }
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number } { return { left: 16, top: 12, right: 330, bottom: 60 }; }
}

/** The observers the overlay made, to fire by hand (the stub DOM reports no mutations). */
let observers: { cb: () => void; targets: unknown[] }[] = [];
/** The frame's requestAnimationFrame callbacks. */
let frames = new Map<number, () => void>();
let frameId = 0;
const nextFrame = (): void => {
  const due = [...frames.values()];
  frames.clear();
  for (const cb of due) cb();
};

const H = 'H';
const A = 'A';
const sheet = (clubId: string, name: string): TeamSheet => ({ clubId, name, attack: 60, defense: 60, kicking: 60, fitness: 60, colors: ['#123456', '#eeeeee'] });
const mountLive = (): MatchOverlayHandle => mountMatchOverlay({ home: sheet(H, 'Harbour City'), away: sheet(A, 'Anvil Town'), weather: 'clear', halfMinutes: NINES.halfMinutes, mine: 'home' });
const page = (): PageNode => document.body as unknown as PageNode;
const all = (sel: string): PageNode[] => page().querySelectorAll(sel) as PageNode[];
const one = (sel: string): PageNode => {
  const n = all(sel)[0];
  if (!n) throw new Error(`${sel} is not on the page`);
  return n;
};
const emit = (kind: MatchEvent['kind'], teamId: string, extra: Partial<MatchEvent> = {}): MatchEvent => {
  const ev: MatchEvent = { t: 1, kind, teamId, ...extra };
  bus.emit('match:event', ev);
  return ev;
};
/** Fire the commentary line's fitter as a new line (or a resize) would. */
const fit = (): void => {
  const strip = one('.nrl-mo-strip-text');
  observers.find((o) => o.targets.includes(strip))!.cb();
};
/** `fn`'s writes to each of `nodes`. */
const writes = (nodes: PageNode[], fn: () => void): number[] => {
  const was = nodes.map((n) => n.textWrites);
  fn();
  return nodes.map((n, i) => n.textWrites - was[i]!);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] });
  stubDocument();
  const doc = document as unknown as Record<string, unknown>;
  doc.createElement = (tag: string) => new PageNode(tag);
  doc.createElementNS = (_ns: string, tag: string) => new PageNode(tag);
  // The cards the replay offer waits under (CARD_SELECTOR): none open.
  doc.querySelector = () => null;
  Object.assign(document.documentElement.style, { removeProperty: () => '' });
  observers = [];
  frames = new Map();
  layoutReads = 0;
  vi.stubGlobal('MutationObserver', class {
    targets: unknown[] = [];
    constructor(readonly cb: () => void) { observers.push(this); }
    observe(target: unknown): void { this.targets.push(target); }
    disconnect(): void {}
  });
  vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { frames.set(++frameId, cb); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('getComputedStyle', (n: PageNode) => ({ fontSize: n.style.fontSize || '14px' }));
});
afterEach(() => {
  unmountMatchOverlay();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HeldText', () => {
  it('writes its element only when the words change, starting from what the element says', () => {
    let text = '00:00', n = 0;
    const el = { get textContent() { return text; }, set textContent(v: string) { n++; text = v; } };
    const held = new HeldText(el);
    held.set('00:00');
    expect(n).toBe(0);
    held.set('00:01');
    held.set('00:01');
    expect([n, text]).toEqual([1, '00:01']);
    held.set('00:00');
    expect([n, text]).toEqual([2, '00:00']);
  });
});

describe('the clock and the half label (#602)', () => {
  it('writes the clock once a displayed second and leaves the half label alone, frame after frame', () => {
    const o = mountLive();
    const clock = one('.nrl-mo-clock'), half = one('.nrl-mo-half');
    expect([clock.textContent, half.textContent]).toEqual(['00:00', '1H']);
    // Thirty match seconds at sixty frames each.
    const w = writes([clock, half], () => {
      for (let f = 0; f < 30 * 60; f++) {
        o.setClock(f / 60, 1);
        // Read straight after the frame: always the second on the clock.
        if (f % 60 === 59) expect(clock.textContent).toBe(`00:${String(Math.floor(f / 60)).padStart(2, '0')}`);
      }
    });
    expect(w).toEqual([29, 0]); // 00:00 was already there
    expect(clock.textContent).toBe('00:29');
  });

  it('holds through a pause, and writes the label once at half-time and once for golden point', () => {
    const o = mountLive();
    const clock = one('.nrl-mo-clock'), half = one('.nrl-mo-half');
    const halfSecs = NINES.halfMinutes * 60;
    o.setClock(75.4, 1);
    // Paused: the sim reports the same moment every frame.
    expect(writes([clock, half], () => { for (let f = 0; f < 600; f++) o.setClock(75.4, 1); })).toEqual([0, 0]);
    expect(clock.textContent).toBe('01:15');
    // Resumed, then the second half.
    expect(writes([clock, half], () => { for (let f = 0; f < 120; f++) o.setClock(halfSecs + f / 60, 2); })).toEqual([2, 1]);
    expect([clock.textContent, half.textContent]).toEqual([`${String(NINES.halfMinutes).padStart(2, '0')}:01`, '2H']);
    // Golden point counts its own clock from 00:00.
    expect(writes([clock, half], () => { for (let f = 0; f < 90; f++) o.setClock(f / 60, 'gp'); })).toEqual([2, 1]);
    expect([clock.textContent, half.textContent]).toEqual(['00:01', 'GP']);
  });

  it('keeps the whistle’s clock at full time without another write, a replay aside', () => {
    const o = mountLive();
    const clock = one('.nrl-mo-clock'), half = one('.nrl-mo-half');
    const end = 2 * NINES.halfMinutes * 60;
    o.setClock(end, 2);
    const final = clock.textContent;
    expect(writes([clock, half], () => bus.emit('match:finished', {} as never))).toEqual([0, 1]);
    expect(half.textContent).toBe('FT');
    // After a Skip the paused sim still reports where it stopped.
    expect(writes([clock, half], () => { for (let f = 0; f < 300; f++) o.setClock(200, 1); })).toEqual([0, 0]);
    expect([clock.textContent, half.textContent]).toEqual([final, 'FT']);
    // The last try's replay shows its own clock and half, then the whistle's again.
    o.setReplaying(true);
    expect(writes([clock, half], () => { for (let f = 0; f < 60; f++) o.setClock(end - 30, 2); })).toEqual([1, 1]);
    expect([clock.textContent, half.textContent]).toEqual([`${String(2 * NINES.halfMinutes - 1).padStart(2, '0')}:30`, '2H']);
    o.setReplaying(false);
    expect(writes([clock, half], () => { for (let f = 0; f < 60; f++) o.setClock(end - 30, 2); })).toEqual([1, 1]);
    expect([clock.textContent, half.textContent]).toEqual([final, 'FT']);
  });

  it('starts a new match from its own page, not the last match’s words', () => {
    const first = mountLive();
    first.setClock(29.5, 1);
    emit('try', H);
    bus.emit('match:finished', {} as never);
    expect([one('.nrl-mo-clock').textContent, one('.nrl-mo-half').textContent, one('.nrl-mo-score').textContent]).toEqual(['00:29', 'FT', '4 – 0']);
    // Mounting again tears the old overlay down.
    const second = mountLive();
    expect(all('.nrl-mo-clock')).toHaveLength(1);
    const clock = one('.nrl-mo-clock'), half = one('.nrl-mo-half');
    expect([clock.textContent, half.textContent, one('.nrl-mo-score').textContent, ...all('.nrl-mo-pts').map((p) => p.textContent)]).toEqual(['00:00', '1H', '0 – 0', '0', '0']);
    // The moment the last match stopped on, and its score, still reach the new page.
    second.setClock(29.5, 1);
    emit('try', H);
    expect([clock.textContent, half.textContent, one('.nrl-mo-score').textContent]).toEqual(['00:29', '1H', '4 – 0']);
    first.setClock(40, 1);
    expect(clock.textContent).toBe('00:29');
  });

  it('follows the events’ whole minutes when no live clock drives it (the recorded match)', () => {
    mountMatchOverlay({ home: sheet(H, 'Harbour City'), away: sheet(A, 'Anvil Town') });
    const clock = one('.nrl-mo-clock'), half = one('.nrl-mo-half');
    expect(writes([clock, half], () => { for (let i = 0; i < 10; i++) emit('run', H, { t: 12 }); })).toEqual([1, 0]);
    expect(writes([clock, half], () => emit('run', A, { t: 41 }))).toEqual([1, 1]);
    expect([clock.textContent, half.textContent]).toEqual(['41:00', '2H']);
  });
});

describe('the score (#602)', () => {
  it('writes a side’s points and the spoken score only when a score changes', () => {
    mountLive();
    const [home, away] = all('.nrl-mo-pts') as [PageNode, PageNode];
    const score = one('.nrl-mo-score');
    const nodes = [home, away, score];
    expect(writes(nodes, () => {
      for (let i = 0; i < 20; i++) emit(i % 2 ? 'run' : 'tackle', i % 3 ? H : A);
      emit('error', A);
      emit('kick', H);
    })).toEqual([0, 0, 0]);
    expect(writes(nodes, () => emit('try', H))).toEqual([1, 0, 1]);
    expect([home.textContent, away.textContent, score.textContent]).toEqual(['4', '0', '4 – 0']);
    expect(writes(nodes, () => emit('conversion', H, { detail: 'missed' }))).toEqual([0, 0, 0]);
    expect(writes(nodes, () => emit('try', A, { detail: 'bonus' }))).toEqual([0, 1, 1]);
    expect(writes(nodes, () => emit('conversion', A))).toEqual([0, 1, 1]);
    expect([home.textContent, away.textContent, score.textContent]).toEqual(['4', '7', '4 – 7']);
  });

  it('follows a replay back to an earlier score, then the live score again', () => {
    const o = mountLive();
    const [home, away] = all('.nrl-mo-pts') as [PageNode, PageNode];
    const score = one('.nrl-mo-score');
    const nodes = [home, away, score];
    emit('try', A);
    emit('try', H);
    // The replay's picture sets its score every frame.
    expect(writes(nodes, () => { for (let f = 0; f < 120; f++) o.setScore(0, 4); })).toEqual([1, 0, 1]);
    expect([home.textContent, away.textContent, score.textContent]).toEqual(['0', '4', '0 – 4']);
    expect(writes(nodes, () => { o.showLiveScore(); o.showLiveScore(); })).toEqual([1, 0, 1]);
    expect([home.textContent, away.textContent, score.textContent]).toEqual(['4', '4', '4 – 4']);
  });
});

describe('the Replay try chip’s seconds (#602)', () => {
  it('writes the countdown once a second, not every 250ms', () => {
    const o = mountLive();
    o.offerReplay(() => {});
    const count = one('.nrl-mo-replay-count');
    expect([count.textContent, count.textWrites]).toEqual([String(REPLAY_OFFER_MS / 1000), 1]);
    vi.advanceTimersByTime(750);
    expect(count.textWrites).toBe(1);
    vi.advanceTimersByTime(250);
    expect([count.textContent, count.textWrites]).toEqual([String(REPLAY_OFFER_MS / 1000 - 1), 2]);
    vi.advanceTimersByTime(2000);
    expect([count.textContent, count.textWrites]).toEqual([String(REPLAY_OFFER_MS / 1000 - 3), 4]);
    // The next try's offer is a new chip from the top.
    o.offerReplay(() => {});
    expect(all('.nrl-mo-replay-count')).toHaveLength(1);
    expect(one('.nrl-mo-replay-count').textContent).toBe(String(REPLAY_OFFER_MS / 1000));
  });
});

describe('the stats sheet, open through the match (#602)', () => {
  /** The rows the sheet should show for `seen`, folded here from the events alone. */
  const expected = (seen: MatchEvent[], calls?: string[]): string[][] => {
    let s = initLiveState();
    const n = { break: [0, 0], kick: [0, 0], 'big-hit': [0, 0] };
    for (const ev of seen) {
      s = reduceEvent(s, ev, H, NINES.halfMinutes);
      if (ev.kind === 'break' || ev.kind === 'kick' || ev.kind === 'big-hit') n[ev.kind][ev.teamId === H ? 0 : 1]!++;
    }
    const [ph, pa] = possessionPct(s);
    const rows = [
      ['Possession', `${ph}%`, `${pa}%`], ['Tackles', ...s.tackles.map(String)], ['Line breaks', ...n.break.map(String)],
      ['Errors', ...s.errors.map(String)], ['Kicks', ...n.kick.map(String)], ['Big hits', ...n['big-hit'].map(String)],
      ...(calls ? [['Calls paid off', ...calls]] : []),
    ];
    return rows.map(([label, h, a]) => [label!, h!, a!, `${statSplit(h!, a!)}%`]);
  };
  const shown = (): string[][] => all('.nrl-mo-statrow').map((r) => [
    r.querySelector('.nrl-mo-stat-label')!.textContent, r.querySelector('.nrl-mo-stat-h')!.textContent, r.querySelector('.nrl-mo-stat-a')!.textContent,
    (r.querySelector('.nrl-mo-stat-bar')!.children[0] as PageNode).style.width!,
  ]);
  const KINDS: MatchEvent['kind'][] = ['run', 'tackle', 'break', 'kick', 'big-hit', 'error', 'run', 'set-start', 'fend', 'penalty'];

  it('keeps its rows through every event and shows the right numbers', () => {
    mountLive();
    const seen: MatchEvent[] = [];
    for (let i = 0; i < 7; i++) seen.push(emit(KINDS[i % KINDS.length]!, i % 2 ? H : A));
    one('.nrl-mo-scoreboard').click();
    const table = one('.nrl-mo-stattable');
    const rows = all('.nrl-mo-statrow');
    expect(shown()).toEqual(expected(seen));
    for (let i = 0; i < 60; i++) {
      seen.push(emit(KINDS[(i * 7) % KINDS.length]!, i % 3 ? H : A, { t: 1 + i / 10 }));
      // Read straight after the event.
      expect(shown()).toEqual(expected(seen));
    }
    expect(one('.nrl-mo-stattable')).toBe(table);
    const after = all('.nrl-mo-statrow');
    expect(after).toHaveLength(rows.length);
    after.forEach((r, i) => expect(r).toBe(rows[i]));
  });

  it('rewrites only the cells an event moved', () => {
    mountLive();
    for (let i = 0; i < 4; i++) emit('run', i % 2 ? H : A);
    one('.nrl-mo-scoreboard').click();
    const cells = all('.nrl-mo-statrow').flatMap((r) => [r.querySelector('.nrl-mo-stat-h') as PageNode, r.querySelector('.nrl-mo-stat-a') as PageNode]);
    // Possession 50/50, Tackles 2/2, then Line breaks, Errors, Kicks, Big hits at 0/0.
    // A kick is no tackle: only the Kicks row's home cell.
    expect(writes(cells, () => emit('kick', H))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
    // A set start changes no stat.
    expect(writes(cells, () => emit('set-start', A))).toEqual(cells.map(() => 0));
    // A home run: possession moves for both, home's tackle count goes up.
    expect(writes(cells, () => emit('run', H))).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('catches up when it reopens, and takes the Calls paid off row when a call is made', () => {
    const o = mountLive();
    const seen: MatchEvent[] = [emit('run', H)];
    const board = one('.nrl-mo-scoreboard');
    board.click();
    const rows = all('.nrl-mo-statrow');
    board.click();
    // Shut: the events still count.
    for (let i = 0; i < 12; i++) seen.push(emit(KINDS[i % KINDS.length]!, i % 2 ? A : H));
    board.click();
    expect(shown()).toEqual(expected(seen));
    all('.nrl-mo-statrow').forEach((r, i) => expect(r).toBe(rows[i]));
    // The first call adds a row: the one time the table is built again.
    o.setCalls!({ home: 1, away: 0 }, { home: 0, away: 0 });
    expect(shown()).toEqual(expected(seen, ['0/1', '0/0']));
    const withCalls = all('.nrl-mo-statrow');
    expect(withCalls).toHaveLength(rows.length + 1);
    o.setCalls!({ home: 2, away: 1 }, { home: 1, away: 0 });
    seen.push(emit('big-hit', A));
    expect(shown()).toEqual(expected(seen, ['1/2', '0/1']));
    all('.nrl-mo-statrow').forEach((r, i) => expect(r).toBe(withCalls[i]));
  });
});

describe('the commentary line’s fitter (#433, #602)', () => {
  it('draws a line too long for the strip smaller, at once', () => {
    const o = mountLive();
    const text = one('.nrl-mo-strip-text');
    text.box.scrollHeight = 62;
    o.comment('Maximilian Featherstonehaugh-Cholmondeley steps off his left foot and finds Maximilian Featherstonehaugh-Cholmondeley.');
    fit();
    expect(text.style.fontSize).toBe(`${TICKER_MIN_PX}px`);
    // A line that fits again goes back to the CSS's size.
    text.box.scrollHeight = 40;
    nextFrame();
    o.comment('Short one.');
    fit();
    expect(text.style.fontSize).toBe('');
  });

  it('reads no layout while the line is not showing', () => {
    const o = mountLive();
    const hidden = (how: string, on: () => void, off: () => void): void => {
      on();
      layoutReads = 0;
      o.comment(`A line said with ${how}.`);
      fit();
      expect(layoutReads, how).toBe(0);
      off();
      nextFrame();
      layoutReads = 0;
      fit();
      expect(layoutReads, `${how}, then back`).toBeGreaterThan(0);
      nextFrame();
    };
    const board = one('.nrl-mo-scoreboard'), log = one('.nrl-mo-log-toggle');
    hidden('the stats open', () => board.click(), () => board.click());
    hidden('the log switched off', () => log.click(), () => log.click());
    hidden('the full log open', () => one('.nrl-mo-strip').click(), () => one('.nrl-mo-full-x').click());
    hidden('the coach tray open', () => o.setTrayOpen!(true), () => o.setTrayOpen!(false));
    // Full time hides the line for good.
    bus.emit('match:finished', {} as never);
    layoutReads = 0;
    o.comment('Full time.');
    fit();
    expect(layoutReads).toBe(0);
  });

  it('measures once a frame at most: a second ask waits for the next frame', () => {
    const o = mountLive();
    const text = one('.nrl-mo-strip-text');
    o.comment('First line.');
    layoutReads = 0;
    fit();
    const once = layoutReads;
    expect(once).toBeGreaterThan(0);
    // The same frame: a long line, and a resize after it.
    text.box.scrollHeight = 62;
    o.comment('Maximilian Featherstonehaugh-Cholmondeley steps off his left foot and finds Maximilian Featherstonehaugh-Cholmondeley.');
    fit();
    fit();
    expect(layoutReads).toBe(once);
    expect(text.style.fontSize).toBe('');
    // The next frame fits it, before the browser paints.
    nextFrame();
    expect(text.style.fontSize).toBe(`${TICKER_MIN_PX}px`);
    // Nothing more waiting: the frame after measures nothing.
    layoutReads = 0;
    nextFrame();
    nextFrame();
    expect(layoutReads).toBe(0);
  });
});
