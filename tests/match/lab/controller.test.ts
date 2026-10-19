// tests/match/lab/controller.test.ts — lab state without a DOM (BAK-207 §4):
// URL hash ↔ params, play/pause/step/scrub, Flag codes that replay.
import { describe, it, expect } from 'vitest';
import { LabController, isLabHash, labHash, parseLabHash } from '../../../src/match/lab/controller';
import { decodeFlag } from '../../../src/match/core/flag';
import { replayTo, type MatchSim } from '../../../src/match/core/engine';
import type { Snapshot } from '../../../src/match/core/snapshot';

const DEF = { home: 'crushers', away: 'larrikins' };

function fake(home: string, away: string, seed: number): MatchSim {
  let tick = 0;
  return {
    get tick() {
      return tick;
    },
    finished: false,
    step() {
      tick++;
    },
    snapshot(): Snapshot {
      return { tick, players: [], ball: { x: seed * 1000 + tick, y: 0, lift: 0, holder: null }, label: `${home} v ${away}`, events: [] };
    },
  };
}

describe('lab hash', () => {
  it('recognises the lab route', () => {
    expect(isLabHash('#lab')).toBe(true);
    expect(isLabHash('#lab?seed=3')).toBe(true);
    expect(isLabHash('#labs')).toBe(false);
    expect(isLabHash('')).toBe(false);
  });
  it('parses defaults, explicit params and a flag', () => {
    expect(parseLabHash('#lab', DEF)).toEqual({ seed: 1, home: 'crushers', away: 'larrikins', tick: 0, note: '', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh', bench: 'standard' });
    expect(parseLabHash('#lab?seed=77&home=a&away=b&tick=120', DEF)).toEqual({ seed: 77, home: 'a', away: 'b', tick: 120, note: '', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh', bench: 'standard' });
    expect(parseLabHash('#lab?seed=-4&tick=x', DEF)).toMatchObject({ seed: 1, tick: 0 });
    const ctrl = new LabController(fake, { seed: 5, home: 'a', away: 'b', tick: 0, note: '', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh' });
    ctrl.seek(42);
    const code = ctrl.flag('late tackle');
    expect(parseLabHash(`#lab?flag=${encodeURIComponent(code)}`, DEF)).toEqual({ seed: 5, home: 'a', away: 'b', tick: 42, note: 'late tackle', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh', bench: 'standard' });
  });
  it('round-trips through labHash', () => {
    const h = labHash({ seed: 9, home: 'a', away: 'b', tick: 30 });
    expect(h.startsWith('#lab?')).toBe(true);
    expect(parseLabHash(h, DEF)).toMatchObject({ seed: 9, home: 'a', away: 'b', tick: 30 });
    expect(labHash({ seed: 9, home: 'a', away: 'b' })).not.toContain('tick');
    // The trait sandbox rides the hash only when it is not the default.
    expect(labHash({ seed: 9, home: 'a', away: 'b', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh' })).not.toContain('traits');
    expect(labHash({ seed: 9, home: 'a', away: 'b', legs: 'fresh' })).not.toContain('legs');
    expect(parseLabHash(labHash({ seed: 9, home: 'a', away: 'b', legs: 'late' }), DEF).legs).toBe('late');
    expect(parseLabHash(labHash({ seed: 9, home: 'a', away: 'b', bench: 'heavy' }), DEF).bench).toBe('heavy');
    expect(labHash({ seed: 9, home: 'a', away: 'b', bench: 'standard' })).not.toContain('bench');
    expect(parseLabHash('#lab?legs=bogus', DEF).legs).toBe('fresh');
    expect(parseLabHash(labHash({ seed: 9, home: 'a', away: 'b', traits: 'stars' }), DEF)).toMatchObject({ traits: 'stars' });
    expect(parseLabHash('#lab?traits=bogus', DEF).traits).toBe('gen');
    // Tactics overrides ride the hash per side; unknown presets are ignored.
    const t = parseLabHash('#lab?hatk=grind&hdef=rush&aatk=bogus&adef=compressed', DEF).tactics;
    expect(t).toEqual({ home: { attack: 'grind', defence: 'rush' }, away: { defence: 'compressed' } });
    expect(labHash({ seed: 1, home: 'a', away: 'b', tactics: t })).toBe('#lab?seed=1&home=a&away=b&hatk=grind&hdef=rush&adef=compressed');
  });
});

describe('LabController', () => {
  it('seeks to a loaded tick, then plays, steps, scrubs and reseeds', () => {
    const c = new LabController(fake, { seed: 3, home: 'a', away: 'b', tick: 25, note: '', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh' });
    expect(c.tick).toBe(25);
    expect(c.runner.playing).toBe(false);
    c.play();
    c.update(1000);
    expect(c.tick).toBe(45);
    c.step();
    expect(c.tick).toBe(46);
    expect(c.runner.playing).toBe(false);
    c.seek(10);
    expect(c.tick).toBe(10);
    expect(c.runner.cur).toEqual(replayTo((s) => fake('a', 'b', s), 3, 10));
    c.setSpeed(4);
    c.play();
    c.update(100);
    expect(c.tick).toBe(18);
    c.reseed(8);
    expect(c.seed).toBe(8);
    expect(c.tick).toBe(0);
    expect(c.runner.cur.ball.x).toBe(8000);
  });

  it('a Flag code pins the current moment and the hash reopens the same lab', () => {
    const c = new LabController(fake, { seed: 11, home: 'a', away: 'b', tick: 0, note: '', traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh' });
    c.play();
    c.update(2000);
    const code = c.flag('ball not grounded');
    expect(decodeFlag(code)).toEqual({ seed: 11, tick: 40, home: 'a', away: 'b', note: 'ball not grounded' });
    expect(c.hash()).toBe('#lab?seed=11&home=a&away=b');
    expect(c.hash(true)).toBe('#lab?seed=11&home=a&away=b&tick=40');
    // Someone else loading the code sees exactly what the flagger saw.
    const f = decodeFlag(code)!;
    const other = new LabController(fake, { ...f, traits: 'gen', tactics: { home: {}, away: {} }, legs: 'fresh' });
    expect(other.runner.cur).toEqual(c.runner.cur);
  });
});
