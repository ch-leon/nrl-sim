// tests/match/league/sinbin.test.ts — sin bins and professional fouls (#71):
// the chance by situation, a penalty sending the offender to the touchline for
// five minutes of match clock with his side a man short, stand-ins taking his
// duties, his return, the contract events, the harness's swing, and the
// binned side's margin being worse than the same matches without the bin.
import { describe, it, expect, afterEach } from 'vitest';
import { BIN, binReason, binReasonText, sinBinChance } from '../../../src/match/league/sinbin';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { applyTuning } from '../../../src/match/league/tuning';
import { BinSwing, pointsOf, sideSheet } from '../../../src/match/balance/measure';
import { toMatchEvent } from '../../../src/match/league/events';
import { PLAYERS, HOOKER, KICKER, FULLBACK } from '../../../src/match/league/roles';
import { FIELD_WIDTH } from '../../../src/match/core/field';
import { TICK_S } from '../../../src/match/core/engine';
import { Commentator } from '../../../src/match/view/commentary';
import { foldEvents, playerOfTheMatch } from '../../../src/systems/stats';
import { popupFor } from '../../../src/match/view/popups';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { SideSpec } from '../../../src/match/balance/plan';

const OFF = { 'bin.base': 0, 'bin.redZone': 0, 'bin.repeat': 0, 'bin.highShot': 0, 'bin.hitman': 0, 'bin.hothead': 0 };
const ALWAYS = { 'bin.base': 1, 'bin.redZone': 1, 'bin.highShot': 1 };

describe('the sin-bin chance (pure)', () => {
  const plain = { high: false, own20: false, prior: 0, hitman: 0, hothead: 0 };
  it('a high shot and a penalty in his own 20 are more likely bins than one in midfield; repeats and traits raise it', () => {
    expect(sinBinChance(plain)).toBe(BIN.base);
    expect(sinBinChance({ ...plain, own20: true })).toBe(BIN.redZone);
    expect(sinBinChance({ ...plain, high: true })).toBe(BIN.highShot);
    expect(sinBinChance({ ...plain, own20: true, prior: 2 })).toBeCloseTo(BIN.redZone + 2 * BIN.repeat);
    expect(sinBinChance({ ...plain, hitman: 2 })).toBeCloseTo(BIN.base + 2 * BIN.hitman);
    expect(sinBinChance({ ...plain, hothead: 1 })).toBeCloseTo(BIN.base + BIN.hothead);
    expect(sinBinChance({ ...plain, own20: true, prior: 20 })).toBe(1);
  });
  it('names the reason', () => {
    expect(binReason({ high: true, own20: true, prior: 3 })).toBe('high');
    expect(binReason({ high: false, own20: true, prior: 0 })).toBe('professional');
    expect(binReason({ high: false, own20: true, prior: 1 })).toBe('repeat');
    expect(binReason({ high: false, own20: false, prior: 4 })).toBe('offside');
    expect(binReasonText('high')).toMatch(/high shot/);
    expect(BIN.minutes).toBe(4); // the same share of a 14-minute match as five was of 18
  });
});

type Seen = { e: SimEvent; snap: Snapshot };
function play(seed: number, home: SideSpec = { rating: 60 }, away: SideSpec = { rating: 60 }, minutes = 9): { seen: Seen[]; sim: LiveSim } {
  const sim = new LiveSim(sideSheet('H', home), sideSheet('A', away), seed, { length: { halves: 2, halfMinutes: minutes } });
  const seen: Seen[] = [];
  while (!sim.finished && sim.tick < 60_000) {
    sim.step();
    const es = sim.tickEvents;
    if (es.length) {
      const snap = sim.snapshot();
      for (const e of es) seen.push({ e, snap });
    }
  }
  return { seen, sim };
}

describe('sin bins in the live sim', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('with every penalty a bin: the offender goes to the touchline, his side plays eight, and he is back after the bin’s minutes of clock', () => {
    restore = applyTuning({ ...ALWAYS, 'penalty.offside.slide': 0.1 });
    let bins = 0;
    let returns = 0;
    for (const seed of [1, 2, 3]) {
      const { seen } = play(seed);
      seen.forEach(({ e, snap }, i) => {
        if (e.kind !== 'sin-bin') return;
        bins++;
        expect(e.side).toBeDefined();
        expect(e.text).toMatch(/is sent to the sin bin — /);
        expect(['high', 'professional', 'repeat', 'offside']).toContain(e.detail);
        // The penalty that sent him, against his side, just before.
        const pen = seen[i - 1]!.e;
        expect(pen.kind).toBe('penalty');
        expect(pen.side).toBe(e.side);
        const binnedAt = snap.clock!.half === 1 ? snap.clock!.seconds : 9 * 60 + snap.clock!.seconds;
        // A little later he stands on the touchline, flagged, and his side is a man short; then he is back.
        const later = seen.slice(i + 1).find((x) => x.snap.tick > snap.tick + 15 * 20 && x.e.kind !== 'sin-bin-return');
        if (later) {
          const him = later.snap.players.find((p) => p.side === e.side && p.slot === e.slot)!;
          const back = seen.slice(i + 1).find((x) => x.e.kind === 'sin-bin-return' && x.e.side === e.side);
          if (!back || back.snap.tick > later.snap.tick) {
            expect(him.binned).toBe(true);
            expect(Math.min(him.y, FIELD_WIDTH - him.y)).toBeLessThan(2.5);
            // His side is down to eight (the other side may be short too).
            const m = / (\d) v (\d)$/.exec(later.snap.label)!;
            expect(m, later.snap.label).not.toBeNull();
            expect(Number(e.side === 'home' ? m[1] : m[2])).toBe(PLAYERS - 1);
          }
        }
        const back = seen.slice(i + 1).find((x) => x.e.kind === 'sin-bin-return' && x.e.side === e.side && x.e.slot === e.slot);
        if (back) {
          returns++;
          const backAt = back.snap.clock!.half === 1 ? back.snap.clock!.seconds : 9 * 60 + back.snap.clock!.seconds;
          expect(backAt).toBeGreaterThanOrEqual(binnedAt + BIN.minutes * 60 - TICK_S);
          expect(backAt).toBeLessThan(binnedAt + BIN.minutes * 60 + 1);
          expect(back.e.text).toMatch(/back from the sin bin/);
          const him = back.snap.players.find((p) => p.side === e.side && p.slot === e.slot)!;
          expect(him.binned).toBeUndefined();
        } else {
          // Not back: the match ended first.
          expect(seen[seen.length - 1]!.e.kind).toBe('full-time');
        }
      });
    }
    expect(bins).toBeGreaterThan(3);
    expect(returns).toBeGreaterThan(1);
  }, 60_000);

  it('never two men from one side at once; the match plays to full time whoever is binned', () => {
    restore = applyTuning({ ...ALWAYS, 'penalty.offside.slide': 0.25, 'penalty.highShot': 0.02 });
    const slotsBinned = new Set<number>();
    for (let seed = 1; seed <= 8; seed++) {
      const { seen, sim } = play(seed);
      expect(sim.finished).toBe(true);
      const out: Record<'home' | 'away', number> = { home: 0, away: 0 };
      for (const { e } of seen) {
        if (e.kind === 'sin-bin') {
          out[e.side!]++;
          slotsBinned.add(e.slot!);
          expect(out[e.side!]).toBeLessThanOrEqual(BIN.maxOut);
        } else if (e.kind === 'sin-bin-return') out[e.side!]--;
      }
      expect(seen[seen.length - 1]!.e.kind).toBe('full-time');
    }
    // The men with duties were among those binned, so the stand-ins were exercised.
    expect([HOOKER, KICKER, FULLBACK].filter((s) => slotsBinned.has(s)).length).toBeGreaterThan(0);
    expect(slotsBinned.size).toBeGreaterThan(4);
  }, 120_000);

  it('a stand-in takes the binned man’s duties: the kick-off and the dummy-half pass come from someone on the field', () => {
    restore = applyTuning({ ...ALWAYS, 'penalty.offside.slide': 0.3 });
    let checked = 0;
    for (let seed = 1; seed <= 10 && checked < 20; seed++) {
      const { seen } = play(seed);
      for (const { e, snap } of seen) {
        if (e.kind !== 'kickoff' && e.kind !== 'dart' && e.kind !== 'tap' && e.kind !== 'conversion') continue;
        const who = snap.players.find((p) => p.side === e.side && p.slot === e.slot)!;
        expect(who.binned, `${e.kind} by a binned man`).toBeUndefined();
        if (snap.players.some((p) => p.binned)) checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  }, 60_000);

  it('bins off plays the same match as default until a bin would have happened, and the same seed replays exactly', () => {
    const home = sideSheet('H', { rating: 60 });
    const away = sideSheet('A', { rating: 60, tactics: { defence: 'rush' } });
    const a = runMatch(home, away, { seed: 3 });
    expect(runMatch(home, away, { seed: 3 })).toEqual(a);
    restore = applyTuning(OFF);
    const off = runMatch(home, away, { seed: 3 });
    const firstBin = a.events.findIndex((e) => e.kind === 'sin-bin');
    const upTo = firstBin < 0 ? a.events.length : firstBin;
    expect(off.events.slice(0, upTo)).toEqual(a.events.slice(0, upTo));
    if (firstBin < 0) expect(off).toEqual(a);
  }, 60_000);

  it('the binned side’s scoring margin over its spells a man short is worse than even', () => {
    // Every penalty a bin, many seeds: between even sides the margin over any spell is even on
    // average, so the points the other side gains per bin is the swing (the harness's binSwing).
    const home = sideSheet('H', { rating: 60 });
    const away = sideSheet('A', { rating: 60 });
    restore = applyTuning(ALWAYS);
    const bins = new BinSwing();
    let count = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const sim = new LiveSim(home, away, seed);
      while (!sim.finished && sim.tick < 100_000) {
        sim.step();
        const outH = sim.binnedOf('home') > 0;
        const outA = sim.binnedOf('away') > 0;
        bins.tick(outH !== outA ? (outH ? 'home' : 'away') : null, sim.matchSeconds, sim.tickEvents);
        count += sim.tickEvents.filter((e) => e.kind === 'sin-bin').length;
      }
    }
    expect(count).toBeGreaterThan(20);
    expect(bins.shortS / 60).toBeGreaterThan(30); // minutes measured with one side alone a man short
    // Points the full side gains over the short one, per five-minute bin: well above even.
    expect((bins.swing / bins.shortS) * 60 * BIN.minutes).toBeGreaterThan(2);
  }, 180_000);
});

describe('what the rest of the game sees', () => {
  it('the contract carries both events, the commentary and pop-ups speak, the stats count the bin against him', () => {
    const snap: Snapshot = { tick: 100, players: [], ball: { x: 10, y: 34, lift: 0, holder: null }, label: '', events: [] };
    const bin: SimEvent = { tick: 100, kind: 'sin-bin', text: '', side: 'away', slot: 7, player: 'Rhys Vaughan', detail: 'professional' };
    const back: SimEvent = { ...bin, kind: 'sin-bin-return' };
    const ids = { home: 'H', away: 'A' } as const;
    const ev = toMatchEvent(bin, snap, ids)!;
    expect(ev).toMatchObject({ kind: 'sin-bin', teamId: 'A', player: 'Rhys Vaughan' });
    expect(toMatchEvent(back, snap, ids)).toMatchObject({ kind: 'sin-bin-return', teamId: 'A' });
    const commentary = new Commentator(1, { home: 'Home', away: 'Away' });
    expect(commentary.line(bin)).toContain('Rhys Vaughan');
    expect(commentary.line(back)).toContain('Rhys Vaughan');
    expect(popupFor(bin)).toMatchObject({ word: 'SIN BIN!', big: true, sub: 'VAUGHAN' });
    expect(popupFor(back)).toMatchObject({ word: 'BACK ON' });
    const tally = foldEvents([ev, { ...ev, kind: 'tackle' }], 'A');
    expect(tally.get('Rhys Vaughan')).toEqual({ games: 0, tries: 0, tackles: 1, lineBreaks: 0, sinBins: 1 });
    // A binned man is marked down for Player of the Match.
    const tryEv = { ...ev, kind: 'try' as const, player: 'Someone Else' };
    const potm = playerOfTheMatch({ homeScore: 0, awayScore: 4, events: [tryEv, { ...ev, kind: 'try' }, ev] }, 'H', 'A');
    expect(potm!.name).toBe('Someone Else');
  });
  it('the harness’s swing: points the full side scores while the other is alone a man short count for it, the short side’s against', () => {
    const e = (kind: string, side: 'home' | 'away', detail?: string): SimEvent => ({ tick: 1, kind, text: '', side, ...(detail ? { detail } : {}) });
    expect(pointsOf(e('try', 'home'))).toBe(4);
    expect(pointsOf(e('try', 'home', 'bonus'))).toBe(5);
    expect(pointsOf(e('conversion', 'home', 'good'))).toBe(2);
    expect(pointsOf(e('conversion', 'home', 'missed'))).toBe(0);
    expect(pointsOf(e('field-goal', 'away', 'good'))).toBe(1);
    expect(pointsOf(e('tackle', 'away'))).toBe(0);
    const b = new BinSwing();
    b.tick(null, 10, [e('try', 'home')]); // nobody short: nothing
    b.tick('home', 70, [e('try', 'away'), e('conversion', 'away', 'good')]); // home short for a minute: +6
    b.tick('home', 100, [e('penalty-goal', 'home', 'good')]); // …and scores anyway: −2
    b.tick(null, 160, [e('try', 'away', 'bonus')]); // both short or neither: nothing
    expect(b.shortS).toBe(90);
    expect(b.swing).toBe(4);
    expect(PLAYERS).toBe(9);
  });
});
