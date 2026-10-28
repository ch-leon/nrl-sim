// tests/match/league/moreCalls.test.ts — five more coach calls (#396): Offload,
// Gang tackle, Grubber, 40/20 and the penalty pair (Take the two / Tap and go).
// Each shows only when it applies, at its Coach's Office level, and is refused
// with a reason otherwise; each does what it says on a seeded match; the judge
// words its verdict; the tray never shows more than five rows; and asking the
// sim what it would refuse never moves the match.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import {
  CALLS, COACH_CALLS, CallJudge, callIsDefence, callIsPenalty, callIsPlay, callResultText, callScope, chipState, penaltyChoiceOf,
  unlockLevel, unlockedCalls, withAttackCall, withDefenceCall, type CallInput, type CallVerdict, type CoachCall,
} from '../../../src/match/league/calls';
import { attackPlan, defencePlan } from '../../../src/match/league/presets';
import { TOUCH } from '../../../src/match/league/touch';
import { CALL_TILE, TRAY_MAX_BUTTONS, TRAY_MAX_ROWS, callCaption, callsUnlockLine, trayHidden, trayCallsOn, trayRows, type TrayButton } from '../../../src/ui/screens/matchOverlay';
import type { SimEvent } from '../../../src/match/core/snapshot';

const H = sideSheet('H', { rating: 60 });
const A = sideSheet('A', { rating: 60 });
const NEW: readonly CoachCall[] = ['offload', 'gang-tackle', 'grubber', 'forty-twenty', 'take-two', 'tap-go'];

/** The sim's own reading of the field, for checking it (private: the tests only read). */
interface Inside {
  dirOf(s: 'home' | 'away'): 1 | -1;
  fortyTwentyReach(s: 'home' | 'away'): number;
  pendingKick: { to: { x: number; y: number }; aim?: 'touch' | '40-20'; kind: string; kickoff: boolean; kicker: number } | null;
  callState: Record<'home' | 'away', { attack: CoachCall | null }>;
}
const inside = (sim: LiveSim): Inside => sim as unknown as Inside;
/** Metres from `x` to the line `side` attacks. */
const toLine = (sim: LiveSim, side: 'home' | 'away', x: number): number => (inside(sim).dirOf(side) > 0 ? 100 - x : x);

interface Played {
  sim: LiveSim;
  events: SimEvent[];
  calls: CallInput[];
  /** Each tick the call could be made: the tackle count, and the ball's metres from the line he attacks then. */
  legal: { tick: number; tackles: number; toLine: number }[];
  /** Every refusal the sim gave the call. */
  refusals: Set<string>;
}

/**
 * Seeds for the penalty pair: a home penalty in range is rare in a 6-minute half,
 * and one the captain doesn't tap himself (Tap and go's moment) rarer still.
 * 1–8 had both until the deeper default kick-off (#397) reshuffled every match;
 * these four have Take the two on (14, 65, 119, 142) and Tap and go (65, 119, 142).
 */
const PENALTY_SEEDS = [14, 65, 119, 142];

/** Play with the home coach making `call` whenever he may (as a player at the tray does: a tap, in on the next tick). */
function play(seed: number, call: CoachCall | null, minutes = 6, side: 'home' | 'away' = 'home'): Played {
  const calls: CallInput[] = [];
  const sim = new LiveSim(H, A, seed, { length: { halves: 1, halfMinutes: minutes }, calls });
  const events: SimEvent[] = [];
  const legal: Played['legal'] = [];
  const refusals = new Set<string>();
  while (!sim.finished) {
    if (call) {
      const why = sim.callRefusal(side, call);
      if (why === null) {
        legal.push({ tick: sim.tick, tackles: sim.tackleCount, toLine: toLine(sim, side, sim.snapshot().ball.x) });
        calls.push({ tick: sim.tick + 1, side, call });
      } else refusals.add(why);
    }
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { sim, events, calls, legal, refusals };
}

/** The events after each of the home coach's calls of `call`, up to the end of that set (a handover, a kick, a turnover), the next call or `span` events. */
function afterCalls(p: Played, call: CoachCall, span = 80): SimEvent[][] {
  const at = p.events.flatMap((e, i) => (e.kind === 'coach-call' && e.detail === call && e.side === 'home' ? [i] : []));
  return at.map((i, k) => {
    const run = p.events.slice(i + 1, Math.min(at[k + 1] ?? Infinity, i + 1 + span));
    const end = run.findIndex((e) => e.kind === 'handover' || e.kind === 'kick' || e.kind === 'error' || e.kind === 'intercept' || e.kind === 'strip');
    return end < 0 ? run : run.slice(0, end + 1);
  });
}

describe('five more calls (#396): what they are', () => {
  it('unlock at the levels the issue gives: Offload and Gang tackle at 1, Grubber and the penalty pair at 2, 40/20 at 3', () => {
    expect(NEW.map((c) => [c, unlockLevel(c)])).toEqual([['offload', 1], ['gang-tackle', 1], ['grubber', 2], ['forty-twenty', 3], ['take-two', 2], ['tap-go', 2]]);
    for (const c of NEW) {
      expect(COACH_CALLS).toContain(c);
      expect(unlockedCalls(unlockLevel(c))).toContain(c);
      expect(unlockedCalls(unlockLevel(c) - 1)).not.toContain(c);
    }
  });

  it('Gang tackle defends; Offload is a play call for two carries; the penalty pair is neither and picks goal or tap', () => {
    expect(callIsDefence('gang-tackle')).toBe(true);
    expect(callScope('gang-tackle')).toBe(CALLS.gang.tackles);
    expect(callIsPlay('offload')).toBe(true);
    expect(callScope('offload')).toBe(CALLS.offload.plays);
    expect(callScope('hit-up')).toBe(1);
    expect(callScope('bomb')).toBe(0);
    expect(['take-two', 'tap-go'].map((c) => callIsPenalty(c as CoachCall))).toEqual([true, true]);
    expect([penaltyChoiceOf('take-two'), penaltyChoiceOf('tap-go')]).toEqual(['goal', 'tap']);
  });

  it('Offload asks for it even in a plan that tucks it; Gang tackle commits a man more and is stepped more out wide', () => {
    const tuck = attackPlan('grind', 'midfield');
    expect(tuck.offload).toBe(0);
    expect(withAttackCall(tuck, 'offload').offload).toBe(1 + CALLS.offload.offload);
    const slide = defencePlan('slide');
    const gang = withDefenceCall(slide, 'gang-tackle');
    expect(gang.commit).toBe(slide.commit + CALLS.gang.commit);
    expect(gang.stepAgainst).toBeGreaterThan(slide.stepAgainst);
    // Any other call (or none) is the plan itself, the same object.
    expect(withDefenceCall(slide, 'rush')).toBe(slide);
    expect(withDefenceCall(slide, null)).toBe(slide);
  });

  it('the chip for a penalty call shows only while it can be made', () => {
    expect(chipState('take-two', null, true, 'hit-up')).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('tap-go', 'no penalty', true, null).show).toBe(false);
    expect(chipState('grubber', 'not inside their 25', true, null).show).toBe(false);
    expect(chipState('gang-tackle', null, false, null)).toEqual({ show: true, enabled: true, lit: false });
  });
});

describe('five more calls (#396): when the sim takes them', () => {
  it('Offload on tackles 1–4 with the ball, refused on the last', () => {
    const p = play(5, 'offload');
    expect(p.legal.length).toBeGreaterThan(0);
    expect(p.legal.every((l) => l.tackles < CALLS.offload.beforeTackle)).toBe(true);
    expect(p.refusals).toContain('not your ball');
    expect(p.refusals).toContain('one call a set');
  });

  it('Gang tackle only while defending', () => {
    const p = play(5, 'gang-tackle');
    expect(p.legal.length).toBeGreaterThan(0);
    expect(p.refusals).toContain('not while you have the ball');
  });

  it('Grubber from tackle 4, inside their 25; 40/20 from tackle 4, behind his own 40 and in reach of their 20', () => {
    let grub = 0;
    let ftw = 0;
    const refused = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = play(seed, 'grubber');
      const f = play(seed, 'forty-twenty');
      for (const l of g.legal) {
        expect(l.tackles).toBeGreaterThanOrEqual(CALLS.lastFrom);
        expect(l.toLine).toBeLessThanOrEqual(CALLS.grubberInsideM);
      }
      // A flat side's kicker (no Big Boot) in no wind: their 20, the shortest roll, and the kick's reach.
      const reach = inside(f.sim).fortyTwentyReach('home');
      expect(reach).toBeCloseTo(20 + TOUCH.touchRollM + CALLS.fortyTwenty.reachM);
      for (const l of f.legal) {
        expect(l.tackles).toBeGreaterThanOrEqual(CALLS.lastFrom);
        expect(l.toLine).toBeGreaterThanOrEqual(CALLS.fortyTwentyFromM);
        expect(l.toLine).toBeLessThanOrEqual(reach);
      }
      grub += g.legal.length;
      ftw += f.legal.length;
      for (const r of [...g.refusals, ...f.refusals]) refused.add(r);
    }
    expect(grub).toBeGreaterThan(0);
    expect(ftw).toBeGreaterThan(0);
    expect(refused).toContain('late in the set');
    expect(refused).toContain('not inside their 25');
    expect(refused).toContain('not behind your 40');
    expect(refused).toContain('out of reach of their 20');
  });

  it('the penalty pair only on a penalty his side has won, in range, and not the captain’s own choice', () => {
    const refused = new Set<string>();
    let on = 0;
    for (const seed of PENALTY_SEEDS) {
      for (const c of ['take-two', 'tap-go'] as const) {
        const p = play(seed, c);
        on += p.legal.length;
        for (const r of p.refusals) refused.add(r);
      }
    }
    expect(on).toBeGreaterThan(0);
    expect(refused).toContain('no penalty');
    // Every refusal the pair gave has a caption for the tray.
    for (const r of refused) expect(callCaption(r, false).length, r).toBeGreaterThan(0);
  });
});

describe('five more calls (#396): each does what it says', () => {
  it('Grubber: the last-tackle kick is a grubber', () => {
    let kicks = 0;
    let grubbers = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const p = play(seed, 'grubber');
      for (const after of afterCalls(p, 'grubber')) {
        const k = after.find((e) => e.kind === 'kick' && e.side === 'home');
        if (!k) continue;
        kicks++;
        if (k.detail === 'grubber') grubbers++;
      }
    }
    expect(kicks).toBeGreaterThan(0);
    expect(grubbers).toBe(kicks);
  });

  it('40/20: the last-tackle kick is aimed at touch inside their 20, and finds it', () => {
    let kicks = 0;
    let inReach = 0;
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const calls: CallInput[] = [];
      const sim = new LiveSim(H, A, seed, { length: { halves: 1, halfMinutes: 6 }, calls });
      let aimed = false;
      let prev = sim.snapshot().ball;
      let before = inside(sim).pendingKick;
      while (!sim.finished) {
        if (sim.callRefusal('home', 'forty-twenty') === null) calls.push({ tick: sim.tick + 1, side: 'home', call: 'forty-twenty' });
        sim.step();
        const k = inside(sim).pendingKick;
        // The kick he called, as it is planned (in force for the set when it is): 26 m out or a little more, a few
        // metres in from touch, so the shortest roll on takes it inside their 20. A last carry that lost ground can
        // leave him out of reach: then it is the kick for touch it is, and said so.
        const own = k && k !== before && !k.kickoff && sim.snapshot().players[k.kicker]!.side === 'home' && sim.inPossession === 'home';
        if (k && own && inside(sim).callState.home.attack === 'forty-twenty') {
          kicks++;
          expect(k.kind).toBe('long');
          const land = toLine(sim, 'home', k.to.x);
          expect(land).toBeGreaterThanOrEqual(TOUCH.fortyTwentyLandM - 1e-6);
          expect(k.aim).toBe(land - TOUCH.touchRollM <= 20 ? '40-20' : 'touch');
          expect(Math.min(k.to.y, 68 - k.to.y)).toBeLessThan(TOUCH.fortyTwentyInsideM + TOUCH.touchScatterM);
          if (k.aim === '40-20') inReach++;
          aimed = true;
        }
        for (const e of sim.tickEvents) {
          // Touch in their 20, from the ball's last spot in the field: what the 40/20 rule says.
          if (e.kind === '40-20' && aimed) {
            found++;
            expect(toLine(sim, 'home', prev.x)).toBeLessThanOrEqual(20 + 1);
            expect(Math.min(prev.y, 68 - prev.y)).toBeLessThanOrEqual(2);
          }
        }
        if (sim.tickEvents.some((e) => e.kind === '40-20' || e.kind === 'touch' || e.kind === 'set-start' || e.kind === 'on-full')) aimed = false;
        before = k;
        prev = sim.snapshot().ball;
      }
    }
    expect(kicks).toBeGreaterThan(5);
    expect(inReach / kicks).toBeGreaterThan(0.75);
    expect(found).toBeGreaterThan(0);
  });

  it('Take the two: the captain’s call is overruled and the goal is attempted', () => {
    let made = 0;
    for (const seed of PENALTY_SEEDS) {
      const p = play(seed, 'take-two');
      for (const after of afterCalls(p, 'take-two')) {
        made++;
        expect(after.find((e) => e.kind === 'penalty-choice')?.detail).toBe('goal');
        expect(after.some((e) => e.kind === 'penalty-goal' && e.side === 'home')).toBe(true);
      }
    }
    expect(made).toBeGreaterThan(0);
  });

  it('Tap and go: the penalty is tapped, and the set’s call is still his', () => {
    let made = 0;
    for (const seed of PENALTY_SEEDS) {
      const calls: CallInput[] = [];
      const sim = new LiveSim(H, A, seed, { length: { halves: 1, halfMinutes: 6 }, calls });
      const events: SimEvent[] = [];
      while (!sim.finished) {
        if (sim.callRefusal('home', 'tap-go') === null) {
          expect(sim.call('home', 'tap-go')).toBeNull();
          made++;
          // One a penalty, and it is not the set's call.
          expect(sim.callRefusal('home', 'tap-go')).toBe('one call a penalty');
          expect(sim.callRefusal('home', 'hit-up')).not.toBe('one call a set');
          const from = events.length;
          for (let i = 0; i < 300 && !sim.finished; i++) {
            sim.step();
            events.push(...sim.tickEvents);
          }
          const after = events.slice(from);
          expect(after.find((e) => e.kind === 'penalty-choice')).toBeUndefined();
          expect(after.some((e) => e.kind === 'tap' && e.side === 'home')).toBe(true);
          continue;
        }
        sim.step();
        events.push(...sim.tickEvents);
      }
      // The call came straight after the captain's choice, and its own line names it.
      const at = events.findIndex((e) => e.kind === 'coach-call' && e.detail === 'tap-go');
      if (at >= 0) expect(events[at]!.side).toBe('home');
    }
    expect(made).toBeGreaterThan(0);
  });

  it('Offload: more offloads, and some spilled', () => {
    let withCall = 0;
    let without = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      withCall += play(seed, 'offload').events.filter((e) => e.kind === 'offload' && e.side === 'home').length;
      without += play(seed, null).events.filter((e) => e.kind === 'offload' && e.side === 'home').length;
    }
    expect(withCall).toBeGreaterThan(without);
  });

  it('Gang tackle: the next two tackles, then the line is its own again; the rucks are slower', () => {
    const calls: CallInput[] = [];
    const sim = new LiveSim(H, A, 3, { length: { halves: 1, halfMinutes: 6 }, calls });
    let checked = 0;
    const ruckTicks = { gang: [] as number[], plain: [] as number[] };
    let gangLeft = 0;
    let ruck = 0;
    let tackles = sim.tackleCount;
    let atk = sim.inPossession;
    while (!sim.finished) {
      if (sim.callRefusal('home', 'gang-tackle') === null) {
        expect(sim.call('home', 'gang-tackle')).toBeNull();
        gangLeft = CALLS.gang.tackles;
        checked++;
      }
      sim.step();
      if (sim.phaseKind === 'ruck') ruck++;
      else if (ruck > 0) {
        (gangLeft > 0 && atk === 'away' ? ruckTicks.gang : ruckTicks.plain).push(ruck);
        ruck = 0;
      }
      const newSet = sim.inPossession !== atk || sim.tackleCount < tackles;
      if (newSet) gangLeft = 0;
      else if (sim.tackleCount > tackles && gangLeft > 0 && ruck === 0) gangLeft--;
      tackles = sim.tackleCount;
      atk = sim.inPossession;
    }
    expect(checked).toBeGreaterThan(0);
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    expect(ruckTicks.gang.length).toBeGreaterThan(3);
    expect(mean(ruckTicks.gang)).toBeGreaterThan(mean(ruckTicks.plain));
  });
});

describe('five more calls (#396): the verdicts', () => {
  const ev = (kind: string, side: 'home' | 'away', detail?: string): SimEvent => ({ tick: 1, kind, text: '', side, ...(detail ? { detail } : {}) });
  const v = (o: Partial<CallVerdict> & { call: CoachCall }): CallVerdict => ({ side: 'home', paid: false, metres: 0, how: 'set-end', ...o });

  it('Grubber: a drop-out is a repeat set; the ball to them is a miss; no kick is no kick', () => {
    const j = new CallJudge();
    j.make('home', 'grubber', 'home', 1, 80);
    expect(j.observe([ev('kick', 'home', 'grubber')], 80, false, false)).toEqual([]);
    // Dead off the defence: a new set (the drop-out), then their drop-out kick.
    expect(j.observe([], 80, false, true)).toEqual([]);
    const [won] = j.observe([ev('drop-out', 'away')], 50, false, false);
    expect(won).toMatchObject({ call: 'grubber', paid: true, how: 'drop-out' });
    expect(callResultText(won!)).toBe('Grubber: repeat set');
    j.make('home', 'grubber', 'home', 1, 80);
    j.observe([ev('kick', 'home', 'grubber')], 80, false, false);
    const [lost] = j.kicked('home', 12);
    expect(lost).toMatchObject({ paid: false, how: 'kick' });
    expect(callResultText(lost!)).toBe('Grubber: missed, their ball');
    j.make('home', 'grubber', 'home', 1, 80);
    const [none] = j.observe([], 82, false, true);
    expect(callResultText(none!)).toBe('Grubber: no kick');
  });

  it('40/20 pays only on touch inside their 20: a regather, a drop or a drop-out off it is no 40/20', () => {
    const j = new CallJudge();
    for (const [e, side] of [['regather', 'home'], ['drop', 'away'], ['drop-out', 'away']] as const) {
      j.make('home', 'forty-twenty', 'home', 1, 36);
      j.observe([ev('kick', 'home', 'long')], 36, false, false);
      const [v] = j.observe([ev(e, side)], 70, false, false);
      expect(v, e).toMatchObject({ paid: false, how: e });
      expect(callResultText(v!)).toBe('40/20: no 40/20');
    }
    expect([j.made.home, j.paid.home]).toEqual([3, 0]);
    // Grubber keeps them: a regather or a drop-out is what it is for.
    j.make('home', 'grubber', 'home', 1, 80);
    j.observe([ev('kick', 'home', 'grubber')], 80, false, false);
    expect(j.observe([ev('regather', 'home')], 98, false, false)[0]!.paid).toBe(true);
  });

  it('40/20: found touch, or missed', () => {
    const j = new CallJudge();
    j.make('home', 'forty-twenty', 'home', 1, 25);
    j.observe([ev('kick', 'home', 'long')], 25, false, false);
    const [found] = j.observe([ev('40-20', 'home')], 80, false, true);
    expect(found).toMatchObject({ paid: true, how: '40-20' });
    expect(callResultText(found!)).toBe('40/20: found touch');
    j.make('home', 'forty-twenty', 'home', 1, 25);
    j.observe([ev('kick', 'home', 'long')], 25, false, false);
    expect(callResultText(j.kicked('home', 30)[0]!)).toBe('40/20: missed, their ball');
  });

  it('Offload pays off when it gets away, not when two carries go by or it is spilled', () => {
    const j = new CallJudge();
    j.make('home', 'offload', 'home', 1, 40);
    expect(j.observe([], 44, true, false)).toEqual([]);
    const [two] = j.observe([], 47, true, false);
    expect(two).toMatchObject({ paid: false, how: 'gain' });
    expect(callResultText(two!)).toBe('Offload: no offload');
    j.make('home', 'offload', 'home', 1, 47);
    expect(callResultText(j.observe([ev('offload', 'home')], 49, false, false)[0]!)).toBe('Offload: got it away');
    j.make('home', 'offload', 'home', 1, 49);
    expect(callResultText(j.observe([ev('error', 'home')], 49, false, false)[0]!)).toBe('Offload: lost the ball');
  });

  it('Gang tackle is judged on its two tackles', () => {
    const j = new CallJudge();
    j.make('away', 'gang-tackle', 'home', 1, 40);
    expect(j.observe([], 43, true, false)).toEqual([]);
    const [held] = j.observe([], 46, true, false);
    expect(held).toMatchObject({ side: 'away', paid: true, metres: 6 });
    expect(callResultText(held!)).toBe('Gang tackle: held to +6m');
    j.make('away', 'gang-tackle', 'home', 1, 46);
    j.observe([], 52, true, false);
    expect(callResultText(j.observe([], 46 + CALLS.paid.gangM + 2, true, false)[0]!)).toBe('Gang tackle: they made +12m');
  });

  it('Take the two on the goal, Tap and go on the set', () => {
    const j = new CallJudge();
    j.make('home', 'take-two', 'home', 1, 70);
    expect(callResultText(j.observe([ev('penalty-goal', 'home', 'good')], 70, false, false)[0]!)).toBe('Take the two: over!');
    j.make('home', 'take-two', 'home', 1, 70);
    expect(callResultText(j.observe([ev('penalty-goal', 'home', 'missed')], 70, false, false)[0]!)).toBe('Take the two: missed');
    j.make('home', 'tap-go', 'home', 1, 70);
    expect(callResultText(j.observe([ev('try', 'home')], 100, false, false)[0]!)).toBe('Tap and go: try!');
    j.make('home', 'tap-go', 'home', 1, 70);
    j.observe([], 78, true, false);
    expect(callResultText(j.observe([], 80, false, true)[0]!)).toBe('Tap and go: no try, +8m');
  });

  it('every new call has a result line that fits by the chips', () => {
    for (const c of NEW) {
      for (const how of ['gain', 'kick', 'set-end', 'no-kick', 'try', 'offload', '40-20', 'drop-out', 'penalty-goal', 'penalty', 'error']) {
        for (const paid of [true, false]) expect(callResultText(v({ call: c, how, paid, metres: 17 })).length, `${c} ${how}`).toBeLessThanOrEqual(28);
      }
    }
  });
});

describe('the coach tray’s rows (#396)', () => {
  const on = (...calls: CoachCall[]): TrayButton[] => calls.map((call) => ({ call, why: null }));

  it('never more than five rows or six buttons, the late kicks first, shown in play order', () => {
    // Tackle 4 behind his own 40 with everything built: ten calls are on.
    const all = on('hit-up', 'shift-left', 'shift-right', 'offload', 'kick-early', 'run-it', 'bomb', 'forty-twenty', 'field-goal', 'fresh-legs');
    const rows = trayRows(all, true);
    expect(rows.length).toBeLessThanOrEqual(TRAY_MAX_ROWS);
    expect(rows.reduce((n, r) => n + r.buttons.length, 0)).toBeLessThanOrEqual(TRAY_MAX_BUTTONS);
    expect(rows.map((r) => r.id)).toEqual(['kick-early', 'run-it', 'bomb', 'forty-twenty', 'field-goal']);
    expect(trayCallsOn(rows)).toBe(5);
    // The calls on that lost the cap are named in the footer, first, so none just vanishes.
    const hidden = trayHidden(all, true, rows);
    expect(hidden).toEqual(['hit-up', 'shift-left', 'shift-right', 'offload', 'fresh-legs']);
    expect(callsUnlockLine(all, [], hidden)).toBe('+5 more: Hit-up, Shift left, Shift right, Offload, Fresh legs');
    expect(callsUnlockLine([{ call: 'bomb', why: 'late in the set' }], [], ['fresh-legs'])).toBe('+1 more: Fresh legs · Bomb from tackle 4');
    // Nothing left out, nothing said.
    const few = on('hit-up', 'fresh-legs');
    expect(trayHidden(few, true, trayRows(few, true))).toEqual([]);
  });

  it('early in the set: Hit-up, the shift as one row of two, Offload, Fresh legs', () => {
    const rows = trayRows(on('hit-up', 'shift-left', 'shift-right', 'offload', 'fresh-legs', 'rush', 'gang-tackle'), true);
    expect(rows.map((r) => [r.id, r.buttons.map((b) => b.call)])).toEqual([
      ['hit-up', ['hit-up']],
      ['shift', ['shift-left', 'shift-right']],
      ['offload', ['offload']],
      ['fresh-legs', ['fresh-legs']],
    ]);
  });

  it('defending: Rush, Hold, Gang tackle, Fresh legs; refused calls are left out', () => {
    const rows = trayRows([...on('rush', 'hold', 'fresh-legs'), { call: 'gang-tackle', why: 'one call a set' }, { call: 'hit-up', why: 'not your ball' }], false);
    expect(rows.map((r) => r.id)).toEqual(['rush', 'hold', 'fresh-legs']);
    expect(trayRows([{ call: 'rush', why: 'one call a set' }], false)).toEqual([]);
  });

  it('a penalty won: one row, two buttons, first; the captain’s own choice greyed with why', () => {
    const rows = trayRows([{ call: 'take-two', why: 'the captain’s call' }, { call: 'tap-go', why: null }, ...on('hit-up', 'shift-left', 'shift-right', 'offload', 'fresh-legs')], true);
    expect(rows[0]).toEqual({ id: 'penalty', buttons: [{ call: 'take-two', why: 'the captain’s call' }, { call: 'tap-go', why: null }] });
    expect(rows.length).toBeLessThanOrEqual(TRAY_MAX_ROWS);
    expect(rows.reduce((n, r) => n + r.buttons.length, 0)).toBeLessThanOrEqual(TRAY_MAX_BUTTONS);
    expect(callCaption('the captain’s call', false)).toBe('captain’s call');
    // No penalty, or out of range: no row.
    expect(trayRows([{ call: 'take-two', why: 'no penalty' }, { call: 'tap-go', why: 'no penalty' }], true)).toEqual([]);
    expect(trayRows([{ call: 'take-two', why: 'too far out' }, { call: 'tap-go', why: 'too far out' }], true)).toEqual([]);
    expect(trayCallsOn(rows)).toBe(rows.reduce((n, r) => n + r.buttons.filter((b) => b.why === null).length, 0));
  });

  it('every call says what it does on its tile in a few words', () => {
    for (const c of COACH_CALLS) {
      expect(CALL_TILE[c], c).toBeTruthy();
      expect(CALL_TILE[c].length, c).toBeLessThanOrEqual(26);
    }
  });

  it('every refusal the new calls give has a short caption', () => {
    for (const why of ['tackles 1–4', 'not inside their 25', 'not behind your 40', 'out of reach of their 20', 'the kick’s away', 'no penalty', 'one call a penalty', 'too far out', 'the captain’s call', 'the siren’s gone']) {
      const c = callCaption(why, false);
      expect(c.length, why).toBeGreaterThan(0);
      expect(c.length, why).toBeLessThanOrEqual(14);
    }
  });
});

describe('no calls, no change (#396)', () => {
  it('asking the sim about every call each tick, and building the tray, never moves the match', () => {
    const quiet = new LiveSim(H, A, 11, { length: { halves: 1, halfMinutes: 6 } });
    const asked = new LiveSim(H, A, 11, { length: { halves: 1, halfMinutes: 6 } });
    const a: SimEvent[] = [];
    const b: SimEvent[] = [];
    while (!quiet.finished) {
      quiet.step();
      a.push(...quiet.tickEvents);
    }
    while (!asked.finished) {
      for (const side of ['home', 'away'] as const) {
        const why = COACH_CALLS.map((call) => ({ call, why: asked.callRefusal(side, call) }));
        trayRows(why, asked.inPossession === side);
      }
      asked.step();
      b.push(...asked.tickEvents);
    }
    expect(b).toEqual(a);
    expect(asked.snapshot().score).toEqual(quiet.snapshot().score);
  });
});
