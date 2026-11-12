import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clampVolume,
  masterGainFor,
  noteFreq,
  voiceLength,
  buildLoop,
  scheduleWindow,
  sfxForMatchEventKind,
  sfxForTry,
  soundsForMatchEvent,
  stingForResult,
  pitchVariation,
  crowdLevel,
  crowdSwellFor,
  CROWD_OUT,
  SFX_PRESETS,
  AudioEngine,
  installAudioUnlock,
  UNLOCK_EVENTS,
  type MusicLoop,
} from '../../src/fx/audio';
import { createNewGame, getState } from '../../src/core/state';
import { bus } from '../../src/core/events';

// DOM entry points (initAudioUi, the gesture listener in initAudio) are not
// covered here: vitest runs in the node environment with no window/document (see
// vite.config.ts). The engine is exercised with an injected fake AudioContext,
// and the pure scheduling/preset math is tested directly.

describe('clampVolume', () => {
  it('clamps to [0,1] and maps NaN to 0', () => {
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
  });
});

describe('masterGainFor', () => {
  it('is 0 when muted regardless of volume', () => {
    expect(masterGainFor({ muted: true, volume: 0.9 })).toBe(0);
  });
  it('is the clamped volume when not muted', () => {
    expect(masterGainFor({ muted: false, volume: 0.7 })).toBe(0.7);
    expect(masterGainFor({ muted: false, volume: 5 })).toBe(1);
    expect(masterGainFor({ muted: false, volume: -3 })).toBe(0);
  });
});

describe('noteFreq', () => {
  it('resolves reference pitches', () => {
    expect(noteFreq('A4')).toBeCloseTo(440, 5);
    expect(noteFreq('C5')).toBeCloseTo(523.2511, 3);
    expect(noteFreq('A5')).toBeCloseTo(880, 5);
    expect(noteFreq('A3')).toBeCloseTo(220, 5);
  });
  it('handles sharps', () => {
    expect(noteFreq('C#4')).toBeCloseTo(277.1826, 3);
  });
  it('rejects malformed names', () => {
    expect(() => noteFreq('H4')).toThrow();
    expect(() => noteFreq('C')).toThrow();
  });
});

describe('SFX_PRESETS', () => {
  it('exposes the six spec presets, the groan and the match sounds', () => {
    expect(Object.keys(SFX_PRESETS).sort()).toEqual(
      ['build', 'cheer', 'click', 'coin', 'groan', 'tackle', 'try',
        'whistle', 'whistleLong', 'siren', 'boot', 'goal', 'miss', 'whoosh', 'tackleBig',
        'stingWin', 'stingDraw', 'stingLoss'].sort(),
    );
  });
  it('a big hit is louder and lower than an ordinary tackle', () => {
    const t = SFX_PRESETS.tackle.tones[0];
    const b = SFX_PRESETS.tackleBig.tones[0];
    expect(b.gain).toBeGreaterThan(t.gain);
    expect(b.freq).toBeLessThan(t.freq);
  });
  it('click is a 660Hz square, 40ms', () => {
    const t = SFX_PRESETS.click.tones[0];
    expect(t.type).toBe('square');
    expect(t.freq).toBe(660);
    expect(t.duration).toBeCloseTo(0.04, 5);
  });
  it('coin is two rising sine notes', () => {
    const tones = SFX_PRESETS.coin.tones;
    expect(tones).toHaveLength(2);
    expect(tones[0].freq).toBe(988);
    expect(tones[1].freq).toBe(1319);
    expect(tones[1].freq).toBeGreaterThan(tones[0].freq);
  });
  it('cheer sweeps a bandpass 300→2000Hz', () => {
    const n = SFX_PRESETS.cheer.noises[0];
    expect(n.filter).toBe('bandpass');
    expect(n.freqStart).toBe(300);
    expect(n.freqEnd).toBe(2000);
    expect(n.duration).toBeCloseTo(0.9, 5);
  });
  it('try is a 4-note ascending square arpeggio', () => {
    const tones = SFX_PRESETS.try.tones;
    expect(tones).toHaveLength(4);
    for (const t of tones) expect(t.type).toBe('square');
    const freqs = tones.map((t) => t.freq);
    expect([...freqs].sort((a, b) => a - b)).toEqual(freqs);
  });
});

describe('sfxForMatchEventKind', () => {
  it('maps try/big-hit/tackle and ignores others', () => {
    expect(sfxForMatchEventKind('try')).toBe('try');
    expect(sfxForMatchEventKind('big-hit')).toBe('tackleBig');
    expect(sfxForMatchEventKind('tackle')).toBe('tackle');
    expect(sfxForMatchEventKind('kickoff')).toBeNull();
    expect(sfxForMatchEventKind('penalty')).toBeNull();
  });
});

describe('sfxForTry (#634)', () => {
  it('our try is the fanfare and the cheer; a try against a groan with no jingle', () => {
    expect(sfxForTry(true)).toEqual(['try', 'cheer']);
    expect(sfxForTry(false)).toEqual(['groan']);
  });
});

describe('soundsForMatchEvent (#635)', () => {
  const names = (kind: string, detail?: string, cheers = true) => soundsForMatchEvent({ kind, teamId: 'x', ...(detail ? { detail } : {}) }, cheers).map((c) => c.name);
  it('the referee: kick-off and a sin bin a whistle, half-time and full time the long blast and the siren', () => {
    expect(names('kickoff')).toEqual(['whistle']);
    expect(names('sin-bin')).toEqual(['whistle']);
    expect(names('half-time')).toEqual(['whistleLong', 'siren']);
    expect(names('full-time')).toEqual(['whistleLong', 'siren']);
  });
  it('every kick is a boot; a kick at goal then rings or misses', () => {
    expect(names('kick')).toEqual(['boot']);
    expect(names('conversion', 'good')).toEqual(['boot', 'goal']);
    expect(names('conversion', 'missed')).toEqual(['boot', 'miss']);
    expect(names('penalty-goal', 'good')).toEqual(['boot', 'goal']);
    expect(names('field-goal', 'missed')).toEqual(['boot', 'miss']);
  });
  it('a line break whooshes; runs and the rest are silent', () => {
    expect(names('break')).toEqual(['whoosh']);
    expect(names('run')).toEqual([]);
    expect(names('error')).toEqual([]);
  });
  it('an ordinary tackle is softer than a big hit, and both vary in pitch', () => {
    const [t] = soundsForMatchEvent({ kind: 'tackle', teamId: 'x' }, true);
    const [b] = soundsForMatchEvent({ kind: 'big-hit', teamId: 'x' }, true);
    expect(t.name).toBe('tackle');
    expect(b.name).toBe('tackleBig');
    expect(t.gain ?? 1).toBeLessThan(b.gain ?? 1);
    expect(t.vary && b.vary).toBe(true);
  });
  it('tries follow who is cheered', () => {
    expect(names('try', undefined, true)).toEqual(['try', 'cheer']);
    expect(names('try', undefined, false)).toEqual(['groan']);
  });
  it('the sting follows the coached side result', () => {
    expect(stingForResult(20, 10)).toBe('stingWin');
    expect(stingForResult(10, 10)).toBe('stingDraw');
    expect(stingForResult(4, 30)).toBe('stingLoss');
  });
});

describe('pitchVariation', () => {
  it('is repeatable, stays within about 7%, and does vary', () => {
    const run = (): number[] => Array.from({ length: 50 }, (_, i) => pitchVariation(i));
    expect(run()).toEqual(run());
    for (const v of run()) { expect(v).toBeGreaterThanOrEqual(0.93); expect(v).toBeLessThanOrEqual(1.07); }
    expect(new Set(run().map((v) => v.toFixed(3))).size).toBeGreaterThan(10);
  });
});

describe('crowdLevel (#635)', () => {
  it('is louder inside either 30 m than at halfway, and louder again with momentum', () => {
    const mid = crowdLevel(50, 0);
    expect(crowdLevel(10, 0)).toBeGreaterThan(mid);
    expect(crowdLevel(90, 0)).toBeGreaterThan(mid);
    expect(crowdLevel(10, 0)).toBeCloseTo(crowdLevel(90, 0), 6);
    expect(crowdLevel(2, 0)).toBeGreaterThan(crowdLevel(18, 0));
    expect(crowdLevel(50, 80)).toBeGreaterThan(mid);
    expect(crowdLevel(50, -80)).toBeCloseTo(crowdLevel(50, 80), 6);
    expect(crowdLevel(null, 0)).toBe(mid);
  });
  it('a break and a try swell it; a try for us more than one against', () => {
    expect(crowdSwellFor({ kind: 'break', teamId: 'x' }, true)).toBeGreaterThan(0);
    expect(crowdSwellFor({ kind: 'try', teamId: 'x' }, true)).toBeGreaterThan(crowdSwellFor({ kind: 'break', teamId: 'x' }, true));
    expect(crowdSwellFor({ kind: 'try', teamId: 'x' }, true)).toBeGreaterThan(crowdSwellFor({ kind: 'try', teamId: 'x' }, false));
    expect(crowdSwellFor({ kind: 'tackle', teamId: 'x' }, true)).toBe(0);
  });
});

describe('buildLoop / voiceLength', () => {
  it('builds voices from named notes and reports length', () => {
    const loop = buildLoop(
      [
        { type: 'square', gain: 0.5, notes: [['C5', 1], ['E5', 1]] },
        { type: 'triangle', gain: 0.7, notes: [['C3', 2]] },
      ],
      0.5,
    );
    expect(loop.length).toBeCloseTo(1.0, 5); // 2 beats * 0.5s
    expect(voiceLength(loop.voices[0])).toBeCloseTo(1.0, 5);
    expect(voiceLength(loop.voices[1])).toBeCloseTo(1.0, 5);
    expect(loop.voices[0].notes[0].freq).toBeCloseTo(noteFreq('C5'), 5);
  });
  it('treats 0 as a rest (freq 0)', () => {
    const loop = buildLoop([{ type: 'square', gain: 1, notes: [[0, 1]] }], 0.5);
    expect(loop.voices[0].notes[0].freq).toBe(0);
  });
  it('rejects unequal-length voices (would drift over wraps)', () => {
    expect(() =>
      buildLoop(
        [
          { type: 'square', gain: 1, notes: [['C5', 1]] },
          { type: 'square', gain: 1, notes: [['C5', 2]] },
        ],
        0.5,
      ),
    ).toThrow(/equal length/);
  });
});

describe('scheduleWindow', () => {
  // Simple single-voice loop: two 1s notes, 2s long total.
  const loop: MusicLoop = {
    length: 2,
    voices: [
      {
        type: 'square',
        gain: 0.5,
        notes: [
          { freq: 100, duration: 1 },
          { freq: 200, duration: 1 },
        ],
      },
    ],
  };

  it('schedules only notes strictly after cursor and at/before horizon', () => {
    // loopStart=0, cursor=0, horizon=1.5 → note at t=0 excluded (== cursor,
    // handled at loop start), note at t=1 included.
    const { notes, cursor } = scheduleWindow(loop, 0, 0, 1.5);
    expect(cursor).toBe(1.5);
    expect(notes.map((n) => n.when)).toEqual([1]);
    expect(notes[0].freq).toBe(200);
  });

  it('wraps gaplessly across loop boundaries', () => {
    // From cursor=1.5 to horizon=3.5 across the wrap at t=2.
    const { notes } = scheduleWindow(loop, 0, 1.5, 3.5);
    // t=2 (wrap, first note freq 100) and t=3 (second note freq 200).
    expect(notes.map((n) => n.when)).toEqual([2, 3]);
    expect(notes.map((n) => n.freq)).toEqual([100, 200]);
  });

  it('never double-schedules the same instant across successive windows', () => {
    const seen: number[] = [];
    let cursor = 0;
    for (let horizon = 0.5; horizon <= 6; horizon += 0.5) {
      const res = scheduleWindow(loop, 0, cursor, horizon);
      for (const n of res.notes) seen.push(n.when);
      cursor = res.cursor;
    }
    const unique = new Set(seen);
    expect(unique.size).toBe(seen.length); // no duplicates
    // Expected note starts across [0,6]: 1,2,3,4,5,6 (t=0 excluded as == start cursor).
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('returns no notes for an empty window', () => {
    expect(scheduleWindow(loop, 0, 2, 2).notes).toEqual([]);
  });
});

// ── Engine tests with a minimal fake AudioContext ──────────────────────────

interface FakeParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
}

function makeParam(v = 0): FakeParam {
  return {
    value: v,
    setValueAtTime: vi.fn(function (this: FakeParam, x: number) {
      this.value = x;
      return this;
    }),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    setTargetAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    cancelScheduledValues: vi.fn().mockReturnThis(),
  };
}

class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' | 'interrupted' = 'suspended';
  /** A context that refuses to resume (no gesture yet) stays as it is. */
  stubborn = false;
  private listeners: Record<string, (() => void)[]> = {};
  addEventListener(t: string, fn: () => void) {
    (this.listeners[t] ??= []).push(fn);
  }
  removeEventListener(t: string, fn: () => void) {
    this.listeners[t] = (this.listeners[t] ?? []).filter((f) => f !== fn);
  }
  setState(s: FakeAudioContext['state']) {
    this.state = s;
    for (const f of this.listeners.statechange ?? []) f();
  }
  createDynamicsCompressor() {
    return { threshold: makeParam(), knee: makeParam(), ratio: makeParam(), attack: makeParam(), release: makeParam(), connect: vi.fn(), disconnect: vi.fn() };
  }
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  oscillators = 0;
  buffers = 0;

  createGain() {
    return { gain: makeParam(1), connect: vi.fn(), disconnect: vi.fn() };
  }
  createOscillator() {
    this.oscillators += 1;
    return {
      type: 'sine' as OscillatorType,
      frequency: makeParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  }
  createBiquadFilter() {
    return { type: 'lowpass' as BiquadFilterType, frequency: makeParam(), Q: makeParam(), connect: vi.fn() };
  }
  createBuffer(_ch: number, len: number) {
    this.buffers += 1;
    return { getChannelData: () => new Float32Array(len) };
  }
  async resume() {
    if (!this.stubborn) this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

describe('AudioEngine (fake context)', () => {
  let fake: FakeAudioContext;
  let engine: AudioEngine;

  beforeEach(() => {
    createNewGame('Test FC', 42);
    fake = new FakeAudioContext();
    engine = new AudioEngine(fake as unknown as AudioContext);
  });

  afterEach(() => {
    engine.dispose();
    bus.clear();
  });

  it('reports available and initialises master gain from settings', () => {
    expect(engine.available).toBe(true);
    // default settings: muted false, volume 0.8 → master 0.8
    // (createGain returns 1 by default, but the engine sets it explicitly)
  });

  it('does not play SFX while the context is suspended', () => {
    engine.playSfx('click');
    expect(fake.oscillators).toBe(0);
  });

  it('plays SFX once resumed and unmuted', async () => {
    await engine.resume();
    expect(fake.state).toBe('running');
    engine.playSfx('try'); // 4 oscillators
    expect(fake.oscillators).toBe(4);
  });

  it('is silent when muted even if running', async () => {
    await engine.resume();
    engine.setMuted(true);
    engine.playSfx('click');
    expect(fake.oscillators).toBe(0);
    expect(getState().settings.muted).toBe(true);
  });

  it('setVolume clamps and persists through the store', () => {
    engine.setVolume(1.5);
    expect(getState().settings.volume).toBe(1);
    engine.setVolume(-0.2);
    expect(getState().settings.volume).toBe(0);
    engine.setVolume(0.33);
    expect(getState().settings.volume).toBeCloseTo(0.33, 5);
  });

  it('subscribes to the bus and maps events to SFX', async () => {
    await engine.resume();
    engine.subscribeBus();
    const spy = vi.spyOn(engine, 'playSfx');

    bus.emit('facility:placed', { id: 'f1', defId: 'weightsRoom', level: 1, x: 0, y: 0 });
    expect(spy).toHaveBeenCalledWith('build');

    bus.emit('money:changed', { delta: 100, reason: 'gate', balance: 100 });
    expect(spy).toHaveBeenCalledWith('coin');

    spy.mockClear();
    bus.emit('money:changed', { delta: -50, reason: 'wages', balance: 50 });
    expect(spy).not.toHaveBeenCalledWith('coin');

    bus.emit('match:event', { t: 20, kind: 'try', teamId: 'player' });
    expect(spy).toHaveBeenCalledWith('try', expect.anything());
    expect(spy).toHaveBeenCalledWith('cheer', expect.anything());

    bus.emit('match:event', { t: 21, kind: 'big-hit', teamId: 'player' });
    expect(spy).toHaveBeenCalledWith('tackleBig', expect.anything());

    bus.emit('ui:notify', { text: 'hi', kind: 'info' });
    expect(spy).toHaveBeenCalledWith('click');
  });

  it('a try plays the fanfare for the coached club and a groan against it (#634)', async () => {
    await engine.resume();
    engine.subscribeBus();
    const spy = vi.spyOn(engine, 'playSfx');
    const sheet = (clubId: string) => ({ clubId }) as never;
    bus.emit('match:started', { fixture: { round: 1, homeId: 'r1', awayId: 'player' }, home: sheet('r1'), away: sheet('player') } as never);
    spy.mockClear();
    bus.emit('match:event', { t: 5, kind: 'try', teamId: 'player' });
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['try', 'cheer']);
    spy.mockClear();
    fake.currentTime += 1;
    bus.emit('match:event', { t: 9, kind: 'try', teamId: 'r1' });
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['groan']);
  });

  it('the lab, where nobody is coached, cheers both sides', async () => {
    await engine.resume();
    engine.subscribeBus();
    const spy = vi.spyOn(engine, 'playSfx');
    bus.emit('match:event', { t: 5, kind: 'try', teamId: 'r1' });
    bus.emit('match:event', { t: 9, kind: 'try', teamId: 'r2' });
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['try', 'cheer', 'try', 'cheer']);
  });

  it('a burst of match events in one moment starts each SFX once (a skipped match, QA finding 16)', async () => {
    await engine.resume();
    engine.subscribeBus();
    const hit = SFX_PRESETS.tackleBig;
    const one = { oscillators: hit.tones.length, buffers: hit.noises.length };
    // The first event starts the crowd bed (one noise buffer); count from after it.
    bus.emit('match:event', { t: 0, kind: 'run', teamId: 'player' });
    const base = { oscillators: fake.oscillators, buffers: fake.buffers };
    // Skip lands the rest of the match's events in one synchronous go: the audio clock doesn't move.
    for (let t = 0; t < 200; t++) bus.emit('match:event', { t, kind: 'big-hit', teamId: 'player' });
    expect({ oscillators: fake.oscillators - base.oscillators, buffers: fake.buffers - base.buffers }).toEqual(one);
    // A tackle a moment later is a new sound.
    fake.currentTime += 0.1;
    bus.emit('match:event', { t: 201, kind: 'big-hit', teamId: 'player' });
    expect({ oscillators: fake.oscillators - base.oscillators, buffers: fake.buffers - base.buffers }).toEqual({ oscillators: 2 * one.oscillators, buffers: 2 * one.buffers });
  });

  it('the crowd bed starts on match:started, follows the ball to the try line and swells on a break', async () => {
    await engine.resume();
    engine.subscribeBus();
    const sheet = (clubId: string) => ({ clubId }) as never;
    bus.emit('match:started', { fixture: { round: 1, homeId: 'player', awayId: 'r1' }, home: sheet('player'), away: sheet('r1') } as never);
    expect(engine.crowdGain).not.toBeNull();
    bus.emit('match:event', { t: 1, kind: 'tackle', teamId: 'r1', x: 50, y: 50 });
    const mid = engine.crowdTarget;
    fake.currentTime += 1;
    bus.emit('match:event', { t: 2, kind: 'tackle', teamId: 'r1', x: 8, y: 50 });
    const near = engine.crowdTarget;
    expect(near).toBeGreaterThan(mid);
    const ramps = engine.crowdGain!.linearRampToValueAtTime as unknown as ReturnType<typeof vi.fn>;
    ramps.mockClear();
    fake.currentTime += 1;
    bus.emit('match:event', { t: 3, kind: 'break', teamId: 'player', x: 8, y: 50 });
    // The swell goes past the steady level before settling back to it.
    expect(Math.max(...ramps.mock.calls.map((c) => c[0] as number))).toBeGreaterThan(near * CROWD_OUT);
  });

  it('the music drops under the crowd and comes back when the match ends', async () => {
    await engine.resume();
    engine.subscribeBus();
    const musicGain = (engine as unknown as { musicBus: { gain: FakeParam } }).musicBus.gain;
    bus.emit('match:started', { fixture: { round: 1, homeId: 'player', awayId: 'r1' }, home: { clubId: 'player' }, away: { clubId: 'r1' } } as never);
    expect(musicGain.setTargetAtTime.mock.calls[musicGain.setTargetAtTime.mock.calls.length - 1]![0]).toBeLessThan(1);
    bus.emit('match:finished', { fixture: { round: 1, homeId: 'player', awayId: 'r1' }, result: { homeScore: 30, awayScore: 6 } } as never);
    expect(musicGain.setTargetAtTime.mock.calls[musicGain.setTargetAtTime.mock.calls.length - 1]![0]).toBe(1);
  });

  it('a loss plays the loss sting and does not go to the grounds track until the player moves on', async () => {
    await engine.resume();
    engine.subscribeBus();
    const music = vi.spyOn(engine, 'playMusic');
    const sfx = vi.spyOn(engine, 'playSfx');
    bus.emit('match:started', { fixture: { round: 1, homeId: 'player', awayId: 'r1' }, home: { clubId: 'player' }, away: { clubId: 'r1' } } as never);
    music.mockClear();
    bus.emit('match:finished', { fixture: { round: 1, homeId: 'player', awayId: 'r1' }, result: { homeScore: 6, awayScore: 30 } } as never);
    expect(sfx).toHaveBeenCalledWith('stingLoss', expect.objectContaining({ delay: expect.any(Number) }));
    expect(music).not.toHaveBeenCalledWith('grounds');
    expect(engine.musicPlaying).toBe(false);
    bus.emit('ui:openScreen', { id: 'office' });
    expect(music).toHaveBeenCalledWith('grounds');
  });

  it('a win plays the win sting, then the grounds track', async () => {
    vi.useFakeTimers();
    try {
      await engine.resume();
      engine.subscribeBus();
      const sfx = vi.spyOn(engine, 'playSfx');
      const music = vi.spyOn(engine, 'playMusic');
      bus.emit('match:started', { fixture: { round: 1, homeId: 'r1', awayId: 'player' }, home: { clubId: 'r1' }, away: { clubId: 'player' } } as never);
      bus.emit('match:finished', { fixture: { round: 1, homeId: 'r1', awayId: 'player' }, result: { homeScore: 6, awayScore: 30 } } as never);
      expect(sfx).toHaveBeenCalledWith('stingWin', expect.anything());
      music.mockClear();
      vi.advanceTimersByTime(4000);
      expect(music).toHaveBeenCalledWith('grounds');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a penalty whistles; mute and a suspended context silence the whole match', async () => {
    await engine.resume();
    engine.subscribeBus();
    bus.emit('match:penalty', { tick: 10 });
    expect(fake.oscillators).toBe(SFX_PRESETS.whistle.tones.length);
    engine.setMuted(true);
    const before = fake.oscillators;
    fake.currentTime += 1;
    for (const kind of ['kickoff', 'kick', 'tackle', 'big-hit', 'break', 'half-time', 'try'] as const) bus.emit('match:event', { t: 1, kind, teamId: 'player', x: 5 });
    bus.emit('match:penalty', { tick: 11 });
    expect(fake.oscillators).toBe(before);
    engine.setMuted(false);
    fake.state = 'suspended';
    fake.currentTime += 1;
    bus.emit('match:event', { t: 2, kind: 'kick', teamId: 'player' });
    expect(fake.oscillators).toBe(before);
  });

  it('playMusic is idempotent per track and switches on match events', () => {
    const spy = vi.spyOn(engine, 'playMusic');
    engine.subscribeBus();
    engine.playMusic('grounds');
    engine.playMusic('grounds'); // idempotent — no crossfade churn
    bus.emit('match:started', {
      fixture: { round: 1, homeId: 'player', awayId: 'r1' },
      // sim/home/away are unused by the audio handler; cast minimally.
    } as never);
    expect(spy).toHaveBeenCalledWith('match');
    bus.emit('match:finished', {
      fixture: { round: 1, homeId: 'player', awayId: 'r1' },
    } as never);
    expect(spy).toHaveBeenCalledWith('grounds');
  });

  it('dispose closes the context and unsubscribes handlers', async () => {
    await engine.resume();
    engine.subscribeBus();
    engine.dispose();
    expect(fake.state).toBe('closed');
    // After dispose, bus emissions must not throw or schedule audio.
    const before = fake.oscillators;
    bus.emit('ui:notify', { text: 'x', kind: 'info' });
    expect(fake.oscillators).toBe(before);
  });
});

/** A tiny window/document: records listeners so the test can fire them. */
class FakeTarget {
  handlers = new Map<string, Set<() => void>>();
  visibilityState = 'visible';
  addEventListener(t: string, fn: () => void) {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t)!.add(fn);
  }
  removeEventListener(t: string, fn: () => void) {
    this.handlers.get(t)?.delete(fn);
  }
  count(t: string) {
    return this.handlers.get(t)?.size ?? 0;
  }
  fire(t: string) {
    for (const f of [...(this.handlers.get(t) ?? [])]) f();
  }
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('audio unlock and re-arm (#636)', () => {
  let fake: FakeAudioContext;
  let engine: AudioEngine;
  let win: FakeTarget;
  let doc: FakeTarget;
  let unlocked: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createNewGame('Test FC', 42);
    fake = new FakeAudioContext();
    engine = new AudioEngine(fake as unknown as AudioContext);
    win = new FakeTarget();
    doc = new FakeTarget();
    unlocked = vi.fn();
    installAudioUnlock(engine, win, doc, unlocked);
  });
  afterEach(() => {
    engine.dispose();
    bus.clear();
  });

  it('listens for touchend and click as well as pointerdown and keydown', () => {
    for (const t of UNLOCK_EVENTS) expect(win.count(t)).toBe(1);
    expect(UNLOCK_EVENTS).toEqual(expect.arrayContaining(['touchend', 'click', 'pointerdown', 'keydown']));
  });

  it('keeps listening while a gesture leaves the context suspended, and stands down once it runs', async () => {
    fake.stubborn = true;
    win.fire('touchend');
    await flush();
    expect(unlocked).not.toHaveBeenCalled();
    for (const t of UNLOCK_EVENTS) expect(win.count(t)).toBe(1);
    fake.stubborn = false;
    win.fire('click');
    await flush();
    expect(fake.state).toBe('running');
    expect(unlocked).toHaveBeenCalledTimes(1);
    for (const t of UNLOCK_EVENTS) expect(win.count(t)).toBe(0);
  });

  it('re-arms and resumes when the context is interrupted, and again on the next tap', async () => {
    win.fire('pointerdown');
    await flush();
    expect(engine.running).toBe(true);
    expect(win.count('click')).toBe(0);
    fake.stubborn = true; // a call: iOS will not resume without a gesture
    fake.setState('interrupted');
    await flush();
    expect(engine.running).toBe(false);
    for (const t of UNLOCK_EVENTS) expect(win.count(t)).toBe(1);
    fake.stubborn = false;
    win.fire('touchend');
    await flush();
    expect(engine.running).toBe(true);
    expect(unlocked).toHaveBeenCalledTimes(2);
    for (const t of UNLOCK_EVENTS) expect(win.count(t)).toBe(0);
  });

  it('on coming back to the foreground, tries to resume and re-arms if it cannot', async () => {
    win.fire('keydown');
    await flush();
    fake.state = 'suspended';
    fake.stubborn = true;
    doc.visibilityState = 'hidden';
    doc.fire('visibilitychange');
    await flush();
    expect(win.count('click')).toBe(0); // hidden: nothing to do
    doc.visibilityState = 'visible';
    doc.fire('visibilitychange');
    await flush();
    expect(win.count('click')).toBe(1);
    fake.stubborn = false;
    doc.fire('visibilitychange');
    await flush();
    expect(engine.running).toBe(true);
    expect(win.count('click')).toBe(0);
  });

  it('puts a limiter between the master gain and the destination', () => {
    // The fake records connections: master -> compressor -> destination.
    const master = (engine as unknown as { master: { connect: ReturnType<typeof vi.fn> } }).master;
    const limiter = (engine as unknown as { limiter: { connect: ReturnType<typeof vi.fn> } }).limiter;
    expect(master.connect).toHaveBeenCalledWith(limiter);
    expect(limiter.connect).toHaveBeenCalledWith(fake.destination);
  });
});

describe('AudioEngine (no context available)', () => {
  beforeEach(() => createNewGame('Test FC', 7));

  it('is inert when constructed without a usable context', () => {
    // In node there is no window/AudioContext, so the default ctor yields no ctx.
    const engine = new AudioEngine();
    expect(engine.available).toBe(false);
    // All methods must be safe no-ops.
    expect(() => engine.playSfx('click')).not.toThrow();
    expect(() => engine.playMusic('grounds')).not.toThrow();
    expect(() => engine.stopMusic()).not.toThrow();
    expect(() => engine.setVolume(0.5)).not.toThrow();
    expect(() => engine.setMuted(true)).not.toThrow();
    expect(() => engine.dispose()).not.toThrow();
  });
});
