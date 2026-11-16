// The last-tackle call (#650 part 1, BAK-208 §4.4): kick, run it or shift it
// wide, weighed by zone, style, score and clock and who is on the field; and
// the early kick on the second-last, called at the play-the-ball.
import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { LAST_TACKLE, chooseLastPlay, earlyKickChance, kickLean, lastTackleWeights, runLean, type LastTackleRead } from '../../../src/match/league/lastTackle';
import { ATTACK_PRESETS } from '../../../src/match/league/presets';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';

const read = (over: Partial<LastTackleRead> = {}): LastTackleRead => ({
  zone: 'midfield', toLine: 50, preset: 'balanced', margin: 0, late: false, kicking: 60, bigBoot: 0, paceEdge: 0, ...over,
});
const share = (w: Record<'kick' | 'run' | 'pass', number>, k: 'kick' | 'run' | 'pass'): number => w[k] / (w.kick + w.run + w.pass);

describe('last tackle: the weights', () => {
  it('a neutral read is the zone row: mostly a kick from deep, more run and pass near the line, never a kick inside closeM', () => {
    expect(lastTackleWeights(read())).toEqual(LAST_TACKLE.zones.midfield);
    const deep = lastTackleWeights(read({ zone: 'own20', toLine: 90 }));
    const red = lastTackleWeights(read({ zone: 'redZone', toLine: 15 }));
    expect(share(deep, 'kick')).toBeGreaterThan(share(red, 'kick'));
    expect(share(red, 'run')).toBeGreaterThan(share(deep, 'run'));
    expect(share(red, 'pass')).toBeGreaterThan(share(deep, 'pass'));
    const close = lastTackleWeights(read({ zone: 'redZone', toLine: LAST_TACKLE.closeM }));
    expect(close.kick).toBe(0);
    expect(close.run).toBeGreaterThan(0);
    expect(close.pass).toBeGreaterThan(0);
  });
  it('keeps the styles apart: Kick-chase kicks most, All-out least, and the wide styles pass more', () => {
    const kick = Object.fromEntries(ATTACK_PRESETS.map((p) => [p, share(lastTackleWeights(read({ preset: p })), 'kick')]));
    for (const p of ATTACK_PRESETS) {
      if (p !== 'kick-chase') expect(kick['kick-chase']).toBeGreaterThan(kick[p]!);
      if (p !== 'all-out') expect(kick['all-out']).toBeLessThan(kick[p]!);
    }
    const pass = (p: (typeof ATTACK_PRESETS)[number]): number => share(lastTackleWeights(read({ preset: p })), 'pass');
    expect(pass('expansive')).toBeGreaterThan(pass('balanced'));
    expect(pass('all-out')).toBeGreaterThan(pass('balanced'));
  });
  it('reads the score and the clock only late: behind runs and passes more, in front kicks more', () => {
    const level = lastTackleWeights(read());
    expect(lastTackleWeights(read({ margin: -6 }))).toEqual(level); // not late: the score is not read
    const behind = lastTackleWeights(read({ margin: -6, late: true }));
    const ahead = lastTackleWeights(read({ margin: 6, late: true }));
    expect(share(behind, 'kick')).toBeLessThan(share(level, 'kick'));
    expect(behind.run).toBeCloseTo(level.run * LAST_TACKLE.trailRun);
    expect(share(ahead, 'kick')).toBeGreaterThan(share(level, 'kick'));
    expect(lastTackleWeights(read({ margin: 0, late: true }))).toEqual(level);
  });
  it('reads who is on the field: a big boot kicks more, quick outside backs run and pass more, never below minMult', () => {
    expect(kickLean(read({ kicking: 80 }))).toBeGreaterThan(1);
    expect(kickLean(read({ bigBoot: 1.6 }))).toBeGreaterThan(kickLean(read({ bigBoot: 1 })));
    expect(runLean(read({ paceEdge: 10 }))).toBeGreaterThan(1);
    expect(runLean(read({ paceEdge: -100 }))).toBe(LAST_TACKLE.minMult);
    expect(kickLean(read({ kicking: -500 }))).toBe(LAST_TACKLE.minMult);
  });
  it('chooses by the roll in the order kick, run, pass; nothing weighted is a run', () => {
    const w = { kick: 2, run: 1, pass: 1 };
    expect(chooseLastPlay(w, 0)).toBe('kick');
    expect(chooseLastPlay(w, 0.49)).toBe('kick');
    expect(chooseLastPlay(w, 0.5)).toBe('run');
    expect(chooseLastPlay(w, 0.8)).toBe('pass');
    expect(chooseLastPlay({ kick: 0, run: 0, pass: 0 }, 0.3)).toBe('run');
  });
  it('the early kick: the style chance × earlyScale, a territory kick from the own 20 for anyone, capped', () => {
    expect(earlyKickChance(0.35, read({ zone: 'redZone', toLine: 20 }), true)).toBeCloseTo(0.35 * LAST_TACKLE.earlyScale);
    expect(earlyKickChance(0, read({ zone: 'ownHalf', toLine: 70 }), false)).toBe(0);
    expect(earlyKickChance(0, read({ zone: 'own20', toLine: 90 }), false)).toBeCloseTo(LAST_TACKLE.earlyOwn20);
    // In front late kicks for position more; behind late less.
    const own20 = read({ zone: 'own20', toLine: 90 });
    expect(earlyKickChance(0.3, { ...own20, late: true, margin: 4 }, false)).toBeGreaterThan(earlyKickChance(0.3, own20, false));
    expect(earlyKickChance(0.3, { ...own20, late: true, margin: -4 }, false)).toBeLessThan(earlyKickChance(0.3, own20, false));
    expect(earlyKickChance(5, own20, false)).toBe(LAST_TACKLE.earlyMax);
  });
});

describe('last tackle: in the sim', () => {
  const home = labSheet(DEFAULT_HOME, 'gen');
  const away = labSheet(DEFAULT_AWAY, 'gen');
  const play = (seed: number): { events: number; home: number; away: number; draws: number } => {
    const sim = new LiveSim(home, away, seed);
    // Count every roll after kick-off's coin toss.
    const rng = (sim as unknown as { rng: { next: () => number } }).rng;
    const next = rng.next.bind(rng);
    let draws = 0;
    rng.next = () => { draws++; return next(); };
    let events = 0;
    while (!sim.finished) {
      sim.step();
      events += sim.tickEvents.length;
    }
    return { events, home: sim.points.home, away: sim.points.away, draws };
  };
  const OFF_1 = { events: 131, home: 6, away: 4, draws: 795 };
  const OFF_11 = { events: 142, home: 8, away: 12, draws: 842 };

  it('is a set of knobs by name', () => {
    const names = listKnobs().map((k) => k.path);
    for (const k of ['lastTackle.on', 'lastTackle.closeM', 'lastTackle.zones.midfield.pass', 'lastTackle.presets.kick-chase.kick', 'lastTackle.trailRun', 'lastTackle.leadKick', 'lastTackle.lateS', 'lastTackle.bootPerKicking', 'lastTackle.bigBoot', 'lastTackle.pacePerSpeed', 'lastTackle.earlyScale', 'lastTackle.earlyOwn20']) {
      expect(names).toContain(k);
    }
  });
  it('off (lastTackle.on 0) plays exactly as before it existed: same events, points and rolls (pinned from a65edf9)', () => {
    const restore = applyTuning({ 'lastTackle.on': 0 });
    try {
      expect(play(1)).toEqual(OFF_1);
      expect(play(11)).toEqual(OFF_11);
      // Its other knobs do nothing while it is off.
      const r2 = applyTuning({ 'lastTackle.zones.midfield.pass': 9, 'lastTackle.earlyScale': 1, 'lastTackle.earlyOwn20': 0.5, 'lastTackle.trailRun': 5 });
      try {
        expect(play(1)).toEqual(OFF_1);
      } finally {
        r2();
      }
    } finally {
      restore();
    }
  });
  it('on, it rolls the call: a different match, and its weights change it', () => {
    expect(LAST_TACKLE.on).toBeGreaterThan(0);
    const on = play(1);
    expect(on).not.toEqual(OFF_1);
    const restore = applyTuning({ 'lastTackle.zones.midfield.pass': 9, 'lastTackle.zones.ownHalf.pass': 9 });
    try {
      expect(play(1)).not.toEqual(on);
    } finally {
      restore();
    }
  });
});
