// src/fx/audio.ts — WebAudio-synthesised SFX + chiptune music. See BAK-200 (WU-13)
// and ARCHITECTURE §4 (settings) / §5 (event bus). No binary assets: every sound
// is generated at runtime from oscillators and noise buffers.
//
// Design notes for testability & the browser autoplay policy:
//  - All WebAudio construction is guarded behind typeof-window / AudioContext
//    checks so Vitest's node environment never builds a real context. Tests inject
//    a minimal fake context into the AudioEngine constructor.
//  - The pure math (volume clamp, master gain, sfx preset tables, note→schedule
//    windowing, loop construction) is exported as free functions and unit-tested
//    without any audio at all.
//  - The context starts suspended; initAudio() registers a one-time, self-removing
//    pointer/key listener that resume()s it on the first user gesture.

import { bus } from '../core/events';
import { getState, setState, type GameState } from '../core/state';
import { el, button, mount, openModal, closeModal } from '../ui/dom';
import { downloadSave, getActiveSlot, importIntoSlot, pickSaveFile, save } from '../core/save';
import { startTutorial } from '../ui/tutorial';
import { canInstall, promptInstall } from './pwa';

// ── Public sfx names (BAK-200) ─────────────────────────────────────────────

export type SfxName = 'click' | 'coin' | 'build' | 'cheer' | 'tackle' | 'try';

export type MusicTrack = 'grounds' | 'match';

// ── Pure helpers (unit-tested; no WebAudio) ────────────────────────────────

/** Clamp an incoming volume to the [0,1] range. NaN → 0. */
export function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Master gain from settings: muted → 0, else the clamped volume. */
export function masterGainFor(settings: { muted: boolean; volume: number }): number {
  return settings.muted ? 0 : clampVolume(settings.volume);
}

/** A single scheduled oscillator segment within an SFX preset. */
export interface SfxTone {
  type: OscillatorType;
  freq: number; // Hz (frequency at note start)
  freqEnd?: number; // Hz (linear ramp target, if a glide is wanted)
  start: number; // offset seconds from sfx trigger
  duration: number; // seconds
  gain: number; // peak gain 0..1 (before master)
  attack: number; // seconds to reach peak
}

/** A noise segment (white-noise buffer through an optional filter). */
export interface SfxNoise {
  filter?: 'lowpass' | 'bandpass';
  freqStart: number; // filter cutoff/centre at start
  freqEnd?: number; // filter sweep target
  Q?: number;
  start: number; // offset seconds
  duration: number; // seconds
  gain: number; // peak gain 0..1
  attack: number; // seconds to peak
}

export interface SfxPreset {
  tones: SfxTone[];
  noises: SfxNoise[];
}

/**
 * SFX preset tables — the exact oscillator/envelope parameters from the BAK-200
 * spec. Pure data so tests can assert them without a real AudioContext.
 */
export const SFX_PRESETS: Record<SfxName, SfxPreset> = {
  // square osc 660Hz, 40ms, fast decay envelope.
  click: {
    tones: [{ type: 'square', freq: 660, start: 0, duration: 0.04, gain: 0.3, attack: 0.002 }],
    noises: [],
  },
  // two sine notes 988Hz→1319Hz, 70ms each, rising.
  coin: {
    tones: [
      { type: 'sine', freq: 988, start: 0, duration: 0.07, gain: 0.3, attack: 0.005 },
      { type: 'sine', freq: 1319, start: 0.07, duration: 0.07, gain: 0.3, attack: 0.005 },
    ],
    noises: [],
  },
  // white-noise buffer through lowpass ~400Hz, 120ms "thud", short attack.
  build: {
    tones: [],
    noises: [
      { filter: 'lowpass', freqStart: 400, start: 0, duration: 0.12, gain: 0.5, attack: 0.005 },
    ],
  },
  // white noise through bandpass sweeping 300→2000Hz, 900ms swell envelope.
  cheer: {
    tones: [],
    noises: [
      {
        filter: 'bandpass',
        freqStart: 300,
        freqEnd: 2000,
        Q: 1.2,
        start: 0,
        duration: 0.9,
        gain: 0.35,
        attack: 0.35, // long swell in
      },
    ],
  },
  // sine 90Hz + noise burst, 150ms, sharp attack low thump.
  tackle: {
    tones: [{ type: 'sine', freq: 90, start: 0, duration: 0.15, gain: 0.5, attack: 0.002 }],
    noises: [
      { filter: 'lowpass', freqStart: 1200, start: 0, duration: 0.08, gain: 0.35, attack: 0.001 },
    ],
  },
  // 4-note square arpeggio (C-E-G-C', 90ms/note) fanfare.
  try: {
    tones: [
      { type: 'square', freq: 523.25, start: 0.0, duration: 0.09, gain: 0.3, attack: 0.003 }, // C5
      { type: 'square', freq: 659.25, start: 0.09, duration: 0.09, gain: 0.3, attack: 0.003 }, // E5
      { type: 'square', freq: 783.99, start: 0.18, duration: 0.09, gain: 0.3, attack: 0.003 }, // G5
      { type: 'square', freq: 1046.5, start: 0.27, duration: 0.12, gain: 0.3, attack: 0.003 }, // C6
    ],
    noises: [],
  },
};

/** A single note in a music loop voice. freq=0 means a rest. */
export interface Note {
  freq: number; // Hz; 0 = rest
  duration: number; // seconds
}

/** A voice (monophonic instrument line) in a loop. */
export interface Voice {
  type: OscillatorType;
  gain: number; // relative gain 0..1
  notes: Note[];
}

export interface MusicLoop {
  voices: Voice[];
  /** Total loop length in seconds (all voices are equal length). */
  length: number;
}

// ── Note frequency table (equal temperament, A4=440) ───────────────────────

const SEMITONES: Record<string, number> = {
  C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4,
  'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2,
};

/** Convert a note name like "C4" / "F#5" to a frequency (Hz). */
export function noteFreq(name: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  const semi = SEMITONES[m[1]];
  const octave = Number(m[2]);
  const n = semi + (octave - 4) * 12; // A4 = 440 at octave 4, semitone 0.
  return 440 * Math.pow(2, n / 12);
}

/** Sum of note durations in a voice = its length in seconds. */
export function voiceLength(voice: Voice): number {
  return voice.notes.reduce((s, n) => s + n.duration, 0);
}

/**
 * Build a MusicLoop from named-note voice specs. `beat` is seconds per duration
 * unit. Validates that all voices share the same total length so the loop is
 * gapless (unequal voices would drift across wraps).
 */
export function buildLoop(
  voiceSpecs: { type: OscillatorType; gain: number; notes: [string | 0, number][] }[],
  beat: number,
): MusicLoop {
  const voices: Voice[] = voiceSpecs.map((spec) => ({
    type: spec.type,
    gain: spec.gain,
    notes: spec.notes.map(([nm, d]) => ({
      freq: nm === 0 ? 0 : noteFreq(nm),
      duration: d * beat,
    })),
  }));
  const lengths = voices.map(voiceLength);
  const length = lengths.length ? Math.max(...lengths) : 0;
  for (const l of lengths) {
    if (Math.abs(l - length) > 1e-6) {
      throw new Error(`loop voices must be equal length; got ${lengths.join(', ')}`);
    }
  }
  return { voices, length };
}

/** One note occurrence to schedule at an absolute context time. */
export interface ScheduledNote {
  type: OscillatorType;
  freq: number;
  when: number; // absolute ctx time (seconds)
  duration: number;
  gain: number;
}

/**
 * Pure lookahead scheduler math. Given a loop, the loop's absolute bar-0 start
 * time (`loopStart`), the time already scheduled up to (`cursor`, absolute) and a
 * `horizon` (absolute ctx time to schedule up to), return every note whose start
 * falls in (cursor, horizon] plus the advanced cursor. Wrapping is handled by
 * walking note offsets across loop iterations, so looping is gapless and
 * sample-accurate. Rests (freq 0) advance time but emit nothing.
 */
export function scheduleWindow(
  loop: MusicLoop,
  loopStart: number,
  cursor: number,
  horizon: number,
): { notes: ScheduledNote[]; cursor: number } {
  const notes: ScheduledNote[] = [];
  if (loop.length <= 0 || horizon <= cursor) return { notes, cursor: Math.max(cursor, horizon) };

  for (const voice of loop.voices) {
    // Precompute note start offsets within one iteration.
    let offset = 0;
    const starts: { freq: number; duration: number; offset: number }[] = [];
    for (const note of voice.notes) {
      starts.push({ freq: note.freq, duration: note.duration, offset });
      offset += note.duration;
    }
    // First iteration index the cursor sits in.
    const elapsed = cursor - loopStart;
    let iter = Math.max(0, Math.floor(elapsed / loop.length));
    for (;;) {
      const base = loopStart + iter * loop.length;
      if (base > horizon) break;
      for (const s of starts) {
        const when = base + s.offset;
        if (when > cursor && when <= horizon && s.freq > 0) {
          notes.push({
            type: voice.type,
            freq: s.freq,
            when,
            duration: s.duration,
            gain: voice.gain,
          });
        }
      }
      iter += 1;
    }
  }

  return { notes, cursor: horizon };
}

/** Map a match-event kind to an SFX (or null). Exported for testing. */
export function sfxForMatchEventKind(kind: string): SfxName | null {
  if (kind === 'try') return 'try';
  if (kind === 'big-hit' || kind === 'tackle') return 'tackle';
  return null;
}

// ── Music loop definitions (precomputed note arrays) ───────────────────────

// ~120 BPM → 0.5s per beat for the ambient theme; the match theme is faster.
const GROUNDS_BEAT = 0.5;
const MATCH_BEAT = 0.375;

/** Cheerful square lead + triangle bass. 8 bars @ 4/4. */
function groundsLoop(): MusicLoop {
  const lead: [string | 0, number][] = [
    ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1],
    ['F5', 1], ['A5', 1], ['G5', 1], ['E5', 1],
    ['D5', 1], ['F5', 1], ['A5', 1], ['F5', 1],
    ['G5', 1], ['B4', 1], ['C5', 1], [0, 1],
    ['C5', 1], ['E5', 1], ['G5', 1], ['C6', 1],
    ['A5', 1], ['G5', 1], ['E5', 1], ['C5', 1],
    ['D5', 1], ['G5', 1], ['F5', 1], ['D5', 1],
    ['C5', 2], [0, 2],
  ];
  const bass: [string | 0, number][] = [
    ['C3', 2], ['C3', 2],
    ['F3', 2], ['F3', 2],
    ['D3', 2], ['D3', 2],
    ['G3', 2], ['G3', 2],
    ['C3', 2], ['C3', 2],
    ['A2', 2], ['C3', 2],
    ['G3', 2], ['G3', 2],
    ['C3', 2], ['C3', 2],
  ];
  return buildLoop(
    [
      { type: 'square', gain: 0.5, notes: lead },
      { type: 'triangle', gain: 0.7, notes: bass },
    ],
    GROUNDS_BEAT,
  );
}

/** Driving faster match loop: square lead + square bass. */
function matchLoop(): MusicLoop {
  const lead: [string | 0, number][] = [
    ['E5', 1], ['E5', 1], ['G5', 1], ['E5', 1],
    ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 1],
    ['E5', 1], ['E5', 1], ['B5', 1], ['A5', 1],
    ['G5', 1], ['E5', 1], ['D5', 1], ['E5', 1],
    ['E5', 1], ['E5', 1], ['G5', 1], ['E5', 1],
    ['C6', 1], ['B5', 1], ['G5', 1], ['E5', 1],
    ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 1],
    ['E5', 2], [0, 2],
  ];
  const bass: [string | 0, number][] = [
    ['E3', 1], ['E3', 1], ['E3', 1], ['E3', 1],
    ['A2', 1], ['A2', 1], ['A2', 1], ['A2', 1],
    ['E3', 1], ['E3', 1], ['E3', 1], ['E3', 1],
    ['G2', 1], ['G2', 1], ['B2', 1], ['B2', 1],
    ['E3', 1], ['E3', 1], ['E3', 1], ['E3', 1],
    ['A2', 1], ['A2', 1], ['C3', 1], ['C3', 1],
    ['A2', 1], ['A2', 1], ['E3', 1], ['E3', 1],
    ['E3', 2], ['E3', 2],
  ];
  return buildLoop(
    [
      { type: 'square', gain: 0.45, notes: lead },
      { type: 'square', gain: 0.55, notes: bass },
    ],
    MATCH_BEAT,
  );
}

// ── Environment guard ──────────────────────────────────────────────────────

interface AudioCtor {
  new (): AudioContext;
}

/** Resolve an AudioContext constructor, or null in non-browser/old envs. */
function resolveAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const LOOKAHEAD_MS = 25; // scheduler tick interval
const SCHEDULE_AHEAD = 0.1; // schedule notes up to 100ms ahead (tolerates throttle)
const CROSSFADE = 0.15; // music crossfade seconds
const SFX_GAP = 0.05; // the same SFX again within this many seconds is dropped (one burst, one sound)

interface ActiveMusic {
  track: MusicTrack;
  loop: MusicLoop;
  gain: GainNode;
  loopStart: number;
  cursor: number;
}

// ── AudioEngine ────────────────────────────────────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private active: ActiveMusic | null = null;

  /** True once any music track is playing (or fading in). */
  get musicPlaying(): boolean {
    return this.active !== null;
  }
  private fadingOut: ActiveMusic[] = [];
  private unsubs: (() => void)[] = [];
  private disposed = false;
  /** When each SFX last started (audio time), for SFX_GAP. */
  private sfxStarted = new Map<SfxName, number>();

  /** `ctx` injectable for tests. If omitted, one is created when available. */
  constructor(ctx?: AudioContext) {
    if (ctx) {
      this.ctx = ctx;
    } else {
      const Ctor = resolveAudioCtor();
      this.ctx = Ctor ? new Ctor() : null;
    }
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.gain.value = masterGainFor(getState().settings);
      this.master.connect(this.ctx.destination);
    }
  }

  /** True when audio is usable (a context exists). */
  get available(): boolean {
    return this.ctx !== null;
  }

  /** Resume the context after a user gesture. No-op if running/unavailable. */
  async resume(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Set volume [0,1] (clamps) and persist through the store. */
  setVolume(v: number): void {
    const volume = clampVolume(v);
    setState({ settings: { ...getState().settings, volume } });
    this.applyMasterGain();
  }

  /** Set muted flag and persist through the store. */
  setMuted(m: boolean): void {
    setState({ settings: { ...getState().settings, muted: m } });
    this.applyMasterGain();
  }

  /** Re-read settings and push master gain (also used after external changes). */
  applyMasterGain(): void {
    if (!this.ctx || !this.master) return;
    const target = masterGainFor(getState().settings);
    this.master.gain.setValueAtTime(target, this.ctx.currentTime);
  }

  /** Play a one-shot SFX. No-op if muted, unavailable, or context suspended. */
  playSfx(name: SfxName): void {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') return;
    if (getState().settings.muted) return;
    const now = this.ctx.currentTime;
    // A skipped match lands the rest of its events in one go (N10.4): hundreds of the same few
    // sounds at one moment, each a fresh noise buffer, cost Skip ~200 ms of main thread at ×4
    // and play as one burst (QA finding 16). The first of a kind in the moment is enough.
    const last = this.sfxStarted.get(name);
    if (last !== undefined && now - last < SFX_GAP) return;
    this.sfxStarted.set(name, now);
    const preset = SFX_PRESETS[name];
    for (const tone of preset.tones) this.renderTone(tone, now);
    for (const noise of preset.noises) this.renderNoise(noise, now);
  }

  /** Start (or crossfade to) a music track. Idempotent per track. */
  playMusic(track: MusicTrack): void {
    if (!this.ctx || !this.master) return;
    if (this.active && this.active.track === track) return; // idempotent
    const loop = track === 'grounds' ? groundsLoop() : matchLoop();
    const now = this.ctx.currentTime;

    if (this.active) {
      this.fadeOut(this.active, now);
      this.active = null;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + CROSSFADE);
    gain.connect(this.master);
    this.active = { track, loop, gain, loopStart: now, cursor: now };
    this.ensureScheduler();
  }

  /** Fade out the current track. Scheduler keeps running (cheap when idle). */
  stopMusic(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.active) {
      this.fadeOut(this.active, now);
      this.active = null;
    }
  }

  /** Tear down: stop scheduler, unsubscribe bus handlers, close context. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    for (const off of this.unsubs) off();
    this.unsubs = [];
    this.active = null;
    this.fadingOut = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
  }

  /** Wire bus subscriptions (called by initAudio). Records unsubscribers. */
  subscribeBus(): void {
    this.unsubs.push(bus.on('facility:placed', () => this.playSfx('build')));
    this.unsubs.push(
      bus.on('money:changed', (p) => {
        if (p.delta > 0) this.playSfx('coin');
      }),
    );
    this.unsubs.push(
      bus.on('match:event', (ev) => {
        const sfx = sfxForMatchEventKind(ev.kind);
        if (sfx) this.playSfx(sfx);
        if (ev.kind === 'try') this.playSfx('cheer');
      }),
    );
    this.unsubs.push(bus.on('ui:notify', () => this.playSfx('click')));
    this.unsubs.push(bus.on('match:started', () => this.playMusic('match')));
    this.unsubs.push(bus.on('match:finished', () => this.playMusic('grounds')));
  }

  // ── internals ──────────────────────────────────────────────────────────

  private fadeOut(m: ActiveMusic, now: number): void {
    m.gain.gain.cancelScheduledValues(now);
    m.gain.gain.setValueAtTime(m.gain.gain.value, now);
    m.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE);
    this.fadingOut.push(m);
    const gainNode = m.gain;
    setTimeout(
      () => {
        try {
          gainNode.disconnect();
        } catch {
          /* already disconnected */
        }
        this.fadingOut = this.fadingOut.filter((x) => x !== m);
      },
      CROSSFADE * 1000 + 50,
    );
  }

  private ensureScheduler(): void {
    if (this.schedulerId !== null) return;
    this.schedulerId = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  private tick(): void {
    if (!this.ctx) return;
    const active = this.active;
    if (!active) return;
    const horizon = this.ctx.currentTime + SCHEDULE_AHEAD;
    const { notes, cursor } = scheduleWindow(
      active.loop,
      active.loopStart,
      active.cursor,
      horizon,
    );
    active.cursor = cursor;
    for (const note of notes) this.renderNote(note, active.gain);
  }

  private renderNote(note: ScheduledNote, dest: GainNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, note.when);
    const peak = note.gain;
    const atk = Math.min(0.01, note.duration * 0.2);
    g.gain.setValueAtTime(0, note.when);
    g.gain.linearRampToValueAtTime(peak, note.when + atk);
    g.gain.setValueAtTime(peak, note.when + note.duration * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, note.when + note.duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(note.when);
    osc.stop(note.when + note.duration + 0.02);
  }

  private renderTone(tone: SfxTone, now: number): void {
    if (!this.ctx || !this.master) return;
    const at = now + tone.start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, at);
    if (tone.freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(tone.freqEnd, at + tone.duration);
    }
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(tone.gain, at + tone.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(at);
    osc.stop(at + tone.duration + 0.02);
  }

  private renderNoise(noise: SfxNoise, now: number): void {
    if (!this.ctx || !this.master) return;
    const at = now + noise.start;
    const buffer = this.makeNoiseBuffer(noise.duration);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    let node: AudioNode = src;
    if (noise.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = noise.filter;
      filter.frequency.setValueAtTime(noise.freqStart, at);
      if (noise.freqEnd !== undefined) {
        filter.frequency.linearRampToValueAtTime(noise.freqEnd, at + noise.duration);
      }
      if (noise.Q !== undefined) filter.Q.value = noise.Q;
      src.connect(filter);
      node = filter;
    }
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(noise.gain, at + noise.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + noise.duration);
    node.connect(g);
    g.connect(this.master);
    src.start(at);
    src.stop(at + noise.duration + 0.02);
  }

  private makeNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate || 44100;
    const len = Math.max(1, Math.floor(rate * duration));
    const buffer = this.ctx.createBuffer(1, len, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

// ── Singleton orchestration entry points ───────────────────────────────────

let engine: AudioEngine | null = null;

/**
 * Create (once) the AudioEngine singleton, subscribe it to the bus, and register
 * a one-time self-removing gesture listener that resumes the context and starts
 * the ambient theme. Safe in non-browser envs (engine exists but has no context).
 */
export function initAudio(): AudioEngine {
  if (engine) return engine;
  engine = new AudioEngine();
  engine.subscribeBus();

  if (typeof window !== 'undefined' && engine.available) {
    const onGesture = (): void => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      void engine?.resume().then(() => {
        // The gesture may itself have triggered a match (Advance Week click);
        // don't crossfade grounds music over a track that already started.
        if (!engine?.musicPlaying) engine?.playMusic('grounds');
      });
    };
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
  }

  return engine;
}

/** Test/reset helper: dispose the singleton so a fresh one can be created. */
export function _resetAudioForTest(): void {
  if (engine) engine.dispose();
  engine = null;
}

/** The gear on the top bar: drawn on a 16px grid so it stays crisp, the same on every phone. */
const GEAR_SVG = '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" shape-rendering="crispEdges">'
  + '<path fill="currentColor" fill-rule="evenodd" d="M4 3h8v1h1v8h-1v1H4v-1H3V4h1zM6 6h4v4H6zM7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3zM2 2h2v2H2zM12 2h2v2h-2zM2 12h2v2H2zM12 12h2v2h-2z"/></svg>';

/**
 * Mount the Settings dialog and its gear on the top bar (#349 E1): sound, the
 * match settings (coach calls, rival matches on the engine, #350 X3: they were
 * on Fixtures), the tutorial's Replay, saves and the PWA Install. Every switch is
 * read from getState().settings when the dialog opens; sound flows through the
 * engine (which persists via setState), the match settings are saved at once.
 * No-op in non-browser envs. GitHub #9 / BAK-202 S6 + BAK-204 Install button.
 */
export function initAudioUi(): void {
  if (typeof document === 'undefined') return;
  const eng = engine ?? initAudio();
  const settings = getState().settings;

  const slider = el('input', {
    class: 'nrl-audio-slider',
    attrs: {
      type: 'range',
      min: '0',
      max: '100',
      value: String(Math.round(clampVolume(settings.volume) * 100)),
      'aria-label': 'Volume',
    },
  });
  slider.addEventListener('input', () => {
    eng.setVolume(Number(slider.value) / 100);
  });

  /** A 44px switch with what it does under its name. */
  const toggle = (name: string, hint: string, get: () => boolean, set: (on: boolean) => void, cls = ''): { row: HTMLElement; sync: () => void } => {
    const box = el('input', { class: 'nrl-switch', attrs: { type: 'checkbox', 'aria-label': name } });
    box.addEventListener('change', () => set(box.checked));
    const row = el('label', { class: `nrl-audio-row nrl-settings-toggle${cls ? ` ${cls}` : ''}` },
      box, el('span', { class: 'nrl-settings-text' }, el('b', { text: name }), ...(hint ? [el('small', { text: hint })] : [])));
    return { row, sync: () => { box.checked = get(); } };
  };
  const setSetting = (patch: Partial<GameState['settings']>): void => {
    setState({ settings: { ...getState().settings, ...patch } });
    save(getState());
  };
  const mute = toggle('Mute', '', () => getState().settings.muted, (on) => eng.setMuted(on));
  const coachCalls = toggle('Coach calls', 'Nudge your side during a match: hit-up, shift, kick early, rush…',
    () => getState().settings.coachCalls !== false, (on) => setSetting({ coachCalls: on }), 'nrl-live-toggle');
  const liveRivals = toggle('Rival matches played out', 'Real stats and injuries for every result. Match weeks take longer on a phone.',
    () => getState().settings.liveRivals === true, (on) => setSetting({ liveRivals: on }), 'nrl-live-toggle nrl-rivals-toggle');
  // #366: on when absent, so an old save slows down for big moments too.
  const keyMoments = toggle('Slow down for big moments', 'Line breaks, tries and the last two minutes',
    () => getState().settings.keyMoments !== false, (on) => setSetting({ keyMoments: on }), 'nrl-live-toggle nrl-moments-toggle');
  // #368: the weekly summary card after each advance; on unless switched off.
  const weekSummary = toggle('Show weekly summary', 'Training, injuries, money and the board after each advance.',
    () => getState().settings.weekSummary !== false, (on) => setSetting({ weekSummary: on }), 'nrl-summary-toggle');

  const installBtn = button('Install app', () => {
    void promptInstall().then((outcome) => {
      if (outcome !== 'unavailable') syncInstallVisibility();
    });
  });
  installBtn.classList.add('nrl-audio-install');
  const syncInstallVisibility = (): void => {
    installBtn.style.display = canInstall() ? '' : 'none';
  };
  syncInstallVisibility();
  if (typeof window !== 'undefined') {
    // initAudioUi runs before initPwa, so these fire before pwa.ts updates its
    // deferred prompt — defer one task so canInstall() reads the new value.
    window.addEventListener('beforeinstallprompt', () => setTimeout(syncInstallVisibility, 0));
    window.addEventListener('appinstalled', () => setTimeout(syncInstallVisibility, 0));
  }

  const replayBtn = button('Replay tutorial', () => {
    closeModal();
    startTutorial(true);
  });

  const exportBtn = button('Export save', () => downloadSave(getState()));
  // Import replaces the slot being played and reloads, so it asks first, on its own row.
  const importRow = el('div', { class: 'nrl-audio-row nrl-settings-import' });
  const importIdle = (): void => {
    importRow.replaceChildren(button('Import save…', () => {
      const s = getState();
      importRow.replaceChildren(
        el('span', { class: 'nrl-settings-ask', text: `Replace slot ${getActiveSlot()} (${s.clubName}, S${s.season} W${s.week}) with a save file? The game reloads.` }),
        button('Choose file', () => {
          void pickSaveFile().then((text) => {
            if (text === null) return;
            if (importIntoSlot(text, getActiveSlot()) && typeof location !== 'undefined') {
              setTimeout(() => location.reload(), 600);
            }
          });
        }, { class: 'nrl-settings-import-go' }),
        button('Cancel', importIdle),
      );
    }));
  };

  const content = el(
    'div',
    { class: 'nrl-audio-settings' },
    el('h2', { text: 'Settings', class: 'nrl-audio-title' }),
    el('div', { class: 'nrl-settings-cols' },
      el('div', { class: 'nrl-settings-col' },
        el('label', { class: 'nrl-audio-row' }, el('b', { text: 'Volume' }), slider),
        mute.row, coachCalls.row, liveRivals.row),
      el('div', { class: 'nrl-settings-col' },
        el('div', { class: 'nrl-audio-row' }, replayBtn),
        el('div', { class: 'nrl-audio-row' }, exportBtn),
        importRow,
        // In this column: the toggles' column is full on a 375px-tall phone (#366, #368).
        keyMoments.row,
        weekSummary.row,
        el('div', { class: 'nrl-audio-row nrl-audio-install-row' }, installBtn)),
    ),
  );

  const openBtn = button('', () => {
    syncInstallVisibility();
    for (const t of [mute, coachCalls, keyMoments, liveRivals, weekSummary]) t.sync();
    slider.value = String(Math.round(clampVolume(getState().settings.volume) * 100));
    importIdle();
    openModal(content, { class: 'nrl-settings-modal', region: true, closeButton: true });
  }, { class: 'nrl-audio-gear' });
  openBtn.innerHTML = GEAR_SVG;
  openBtn.setAttribute('aria-label', 'Settings');
  openBtn.title = 'Settings';
  const holder = el('div', { class: 'nrl-audio-launcher' }, openBtn);
  ensureAudioStyles();
  mount(holder);
}

/** Inject the small popup-specific stylesheet once. */
function ensureAudioStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nrl-audio-styles')) return;
  const style = document.createElement('style');
  style.id = 'nrl-audio-styles';
  style.textContent = `
/* Docked in the HUD strip's top-right corner: the HUD reserves room for it
   (padding-right below), so it never overlaps Advance Week or the screen
   region beneath the HUD (GitHub #14). In a match the HUD is hidden and the
   overlay moves it to the bottom-right corner. */
.nrl-audio-launcher {
  pointer-events: none;
  position: fixed;
  top: calc(0.5rem + var(--nrl-safe-t, 0px));
  right: calc(0.5rem + var(--nrl-safe-r, 0px));
  z-index: 20;
}
.nrl-hud { padding-right: calc(3.75rem + var(--nrl-safe-r, 0px)); }
@media (max-height: 500px) { .nrl-audio-launcher { top: calc(2px + var(--nrl-safe-t, 0px)); } }
.nrl-audio-gear { pointer-events: auto; display: flex; align-items: center; justify-content: center; padding: 0.3rem; }
.nrl-audio-gear svg { display: block; }
.nrl-audio-settings { min-width: 220px; }
.nrl-dialog-region .nrl-settings-modal { width: min(96vw, 680px); max-width: none; }
.nrl-audio-title { margin: 0; font-size: 1rem; min-height: 44px; display: flex; align-items: center; padding-right: 2.75rem; }
.nrl-settings-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0 1rem; }
.nrl-audio-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.3rem 0;
  min-height: 44px;
  pointer-events: auto;
}
.nrl-settings-toggle { cursor: pointer; }
.nrl-settings-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; font-size: 0.8rem; }
.nrl-settings-text small { font-size: 0.68rem; opacity: 0.85; }
.nrl-settings-ask { flex: 1 1 100%; font-size: 0.75rem; line-height: 1.25; }
.nrl-settings-import { flex-wrap: wrap; }
/* 956x330: three columns of rows, so every switch and the Import question sit on screen unscrolled. */
@media (max-height: 340px) {
  .nrl-dialog-region .nrl-settings-modal { width: min(96vw, 940px); }
  .nrl-settings-cols { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, auto); grid-auto-flow: column; align-items: start; }
  .nrl-settings-col { display: contents; }
  .nrl-audio-row { margin: 0.1rem 0; }
  .nrl-settings-import { grid-row: span 2; align-self: start; }
}
/* A switch a finger can hit (N14, #263; X3): 52×44, the track and its knob drawn in its background. */
.nrl-switch {
  -webkit-appearance: none;
  appearance: none;
  flex: 0 0 auto;
  width: 52px;
  height: 44px;
  margin: 0;
  cursor: pointer;
  pointer-events: auto;
  background:
    linear-gradient(#fff, #fff) no-repeat 11px 50% / 14px 14px,
    linear-gradient(#8a8a8a, #8a8a8a) no-repeat 50% 50% / 38px 20px,
    linear-gradient(#000, #000) no-repeat 50% 50% / 44px 26px;
}
.nrl-switch:checked {
  background:
    linear-gradient(#fff, #fff) no-repeat 27px 50% / 14px 14px,
    linear-gradient(#7ec850, #7ec850) no-repeat 50% 50% / 38px 20px,
    linear-gradient(#000, #000) no-repeat 50% 50% / 44px 26px;
}
.nrl-switch:focus-visible { outline: 3px solid #f4d03f; }
/* The volume slider in the kit's colours (#349 E1), 44px tall to take a thumb. */
.nrl-audio-slider { -webkit-appearance: none; appearance: none; flex: 1 1 auto; min-width: 120px; height: 44px; margin: 0; background: transparent; pointer-events: auto; }
.nrl-audio-slider::-webkit-slider-runnable-track { height: 10px; background: #1a1a2e; border: 2px solid #000; }
.nrl-audio-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 30px; margin-top: -12px; background: #f4d03f; border: 3px solid #000; box-shadow: 2px 2px 0 #000; }
.nrl-audio-slider::-moz-range-track { height: 6px; background: #1a1a2e; border: 2px solid #000; }
.nrl-audio-slider::-moz-range-thumb { width: 16px; height: 24px; border-radius: 0; background: #f4d03f; border: 3px solid #000; }
`;
  document.head.appendChild(style);
}
