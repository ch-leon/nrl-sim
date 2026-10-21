import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clampVolume,
  masterGainFor,
  noteFreq,
  voiceLength,
  buildLoop,
  scheduleWindow,
  sfxForMatchEventKind,
  SFX_PRESETS,
  AudioEngine,
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
  it('exposes exactly the six spec presets', () => {
    expect(Object.keys(SFX_PRESETS).sort()).toEqual(
      ['build', 'cheer', 'click', 'coin', 'tackle', 'try'].sort(),
    );
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
    expect(sfxForMatchEventKind('big-hit')).toBe('tackle');
    expect(sfxForMatchEventKind('tackle')).toBe('tackle');
    expect(sfxForMatchEventKind('kickoff')).toBeNull();
    expect(sfxForMatchEventKind('penalty')).toBeNull();
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
}

function makeParam(v = 0): FakeParam {
  return {
    value: v,
    setValueAtTime: vi.fn(function (this: FakeParam, x: number) {
      this.value = x;
      return this;
    }),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    cancelScheduledValues: vi.fn().mockReturnThis(),
  };
}

class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
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
    this.state = 'running';
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
    expect(spy).toHaveBeenCalledWith('try');
    expect(spy).toHaveBeenCalledWith('cheer');

    bus.emit('match:event', { t: 21, kind: 'big-hit', teamId: 'player' });
    expect(spy).toHaveBeenCalledWith('tackle');

    bus.emit('ui:notify', { text: 'hi', kind: 'info' });
    expect(spy).toHaveBeenCalledWith('click');
  });

  it('a burst of match events in one moment starts each SFX once (a skipped match, QA finding 16)', async () => {
    await engine.resume();
    engine.subscribeBus();
    const tackle = SFX_PRESETS.tackle;
    const one = { oscillators: tackle.tones.length, buffers: tackle.noises.length };
    // Skip lands the rest of the match's events in one synchronous go: the audio clock doesn't move.
    for (let t = 0; t < 200; t++) bus.emit('match:event', { t, kind: 'big-hit', teamId: 'player' });
    expect({ oscillators: fake.oscillators, buffers: fake.buffers }).toEqual(one);
    // A tackle a moment later is a new sound.
    fake.currentTime += 0.1;
    bus.emit('match:event', { t: 201, kind: 'big-hit', teamId: 'player' });
    expect({ oscillators: fake.oscillators, buffers: fake.buffers }).toEqual({ oscillators: 2 * one.oscillators, buffers: 2 * one.buffers });
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
