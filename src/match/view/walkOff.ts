// src/match/view/walkOff.ts — the whistle's pictures (#675). At half-time and full time both
// sides walk off toward the tunnel (behind the benches, on halfway) and fade; at full time the
// winners celebrate first and the losers stand hands on hips or head, then trudge off. Before
// golden point each side gathers in a loose huddle round its captain, fades, and comes back
// huddled at the kick-off to spread to its places. Each man on his own: no handshakes or hugs
// (match-big-moments.md). Where they are drawn only, as with the try mob and the contact
// layout: the sim's positions are untouched. A pure function of the snapshot and the ticks since
// its phase began (`Snapshot.phase.since`), plus the ticks the picture has stood still at the
// break (the full-time whistle, the half-time card): pause, seek and replay agree.
import { FIELD_LENGTH, FIELD_WIDTH } from '../core/field';
import { TICK_MS } from '../core/engine';
import type { PlayerSnap, Side, Snapshot } from '../core/snapshot';
import type { LivePlayerAction } from '../../art/match/livePlayer';
import { hashString } from '../../art/match/kit';
import { NINES } from '../league/rules';

/** The tunnel: off the near touchline on halfway, behind the benches (officials.ts). Each side heads for its own half of it. */
export const TUNNEL = { x: FIELD_LENGTH / 2, y: FIELD_WIDTH + 6, sideM: 3 } as const;
/** Walking pace off the field, metres a tick (2.4 m/s). */
export const WALK_M = 0.12;
/** Full time: ticks of celebration or dejection on the spot before they walk; when they start to fade, and are gone. */
export const FT_REACT = 24;
export const FT_FADE = 100;
export const FT_GONE = 140;
/** Half-time: they walk from the whistle and are gone by the end of the sim's break; this many ticks of fade. */
export const HT_FADE = 20;
/** The huddle before golden point: ticks to gather, its radius and how far (m) a man is drawn from where the sim has him. */
export const HUDDLE_IN = 24;
const HUDDLE_RING_M = 2.2;
const HUDDLE_MAX_M = 12;
/** …and the fade before the sim puts them on their kick-off spots (ticks before the break ends). */
const HUDDLE_FADE = 10;
/** The kick-off after a break: ticks to fade in; golden point's huddle holds, then has spread by SPREAD_END (the kick is at LIVE.restartTicks, 40). */
export const RESTART_FADE = 8;
const SPREAD_FROM = 10;
export const SPREAD_END = 34;
/** The captain the huddle forms round. The sim does not know who captains; the halfback, the side's general, stands in. */
export const CAPTAIN_SLOT = 5;
/** Ticks per frame of the walk cycle (the jog's frames, 6–11) and of the reactions. */
const STEP_TICKS = 1.6;
const NOD_TICKS = 8;

export interface BreakMan {
  side: Side; slot: number;
  /** Field-metre offset from where the sim has him, and how opaque he is drawn (0..1). */
  dx: number; dy: number; alpha: number;
  /** The picture: a walk (or the trudge), a reaction on the spot, or null for his own. */
  action: LivePlayerAction | null; frame: number; gait: number; slump: boolean;
  /** Walking: the field direction he is going (for his facing on screen). */
  toward?: { x: number; y: number };
}
export interface BreakScene { kind: 'walk-off' | 'huddle' | 'walk-on' | 'spread'; men: BreakMan[] }

const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

/** Has this snapshot a break picture: the whistle's phase, or the first ticks of the kick-off after one. */
export function breakKind(s: Snapshot): BreakScene['kind'] | null {
  const ph = s.phase;
  if (!ph) return null;
  if (ph.kind === 'full-time') return 'walk-off';
  if (ph.kind === 'half-time') return ph.golden ? 'huddle' : 'walk-off';
  // The kick-off of a half (its clock not yet started) after the break: the second half, or golden point.
  if (ph.kind === 'restart' && s.clock && s.clock.half >= 2 && s.clock.seconds === 0 && s.tick - ph.since <= SPREAD_END) {
    return ph.golden ? 'spread' : 'walk-on';
  }
  return null;
}

/**
 * The break picture for snapshot `s` drawn `age` ticks after its phase began (fractional; the
 * stood-still ticks included), or null outside one. `simAge` is the ticks the sim itself has
 * run of the phase: the huddle fades on the sim's clock, so a card held over it keeps it formed.
 */
export function breakScene(s: Snapshot, age: number, simAge = age): BreakScene | null {
  const kind = breakKind(s);
  if (!kind) return null;
  const t = Math.max(0, age);
  const men: BreakMan[] = [];
  const on = s.players.filter((p) => !p.binned);
  const full = s.phase!.kind === 'full-time';
  const score = s.score ?? { home: 0, away: 0 };
  for (const p of on) {
    const man: BreakMan = { side: p.side, slot: p.slot, dx: 0, dy: 0, alpha: 1, action: null, frame: 0, gait: -1, slump: false };
    if (kind === 'walk-off') {
      const won = full && score[p.side] > score[p.side === 'home' ? 'away' : 'home'];
      const lost = full && score[p.side] < score[p.side === 'home' ? 'away' : 'home'];
      const start = full ? FT_REACT : 0;
      const fade = full ? FT_FADE : NINES.halfTimeTicks - HT_FADE;
      const gone = full ? FT_GONE : NINES.halfTimeTicks;
      man.alpha = 1 - smooth((t - fade) / (gone - fade));
      const goal = { x: TUNNEL.x + (p.side === 'home' ? -TUNNEL.sideM : TUNNEL.sideM), y: TUNNEL.y };
      const ux = goal.x - p.x; const uy = goal.y - p.y; const d = Math.hypot(ux, uy);
      const walked = Math.min(d, WALK_M * Math.max(0, t - start));
      if (d > 0.01) { man.dx = ux / d * walked; man.dy = uy / d * walked; }
      const who = hashString(`${p.who ?? p.slot}/${s.phase!.since}`);
      if (t < start) {
        // On the spot at full time: the winners each celebrate their own way, the losers hang their heads.
        if (won) { man.action = (['fistPump', 'celebrate', 'point'] as const)[who % 3]!; man.frame = Math.floor(t / 3 + p.slot) % 6; }
        else if (lost) { man.action = who % 2 ? 'handsOnHips' : 'handsOnHead'; man.frame = Math.floor(t / NOD_TICKS + p.slot) % 2; }
      } else if (walked < d) {
        man.action = 'run'; man.gait = 6 + Math.floor(t / STEP_TICKS + p.slot) % 6; man.frame = man.gait % 6;
        man.slump = lost; man.toward = { x: ux, y: uy };
      }
    } else {
      const huddle = kind === 'huddle' || kind === 'spread';
      if (kind === 'huddle') man.alpha = 1 - smooth((simAge - (NINES.goldenPointBreakTicks - HUDDLE_FADE)) / HUDDLE_FADE);
      else man.alpha = smooth(t / RESTART_FADE);
      if (huddle) {
        const w = kind === 'huddle' ? smooth(t / HUDDLE_IN) : 1 - smooth((t - SPREAD_FROM) / (SPREAD_END - SPREAD_FROM));
        const cap = on.find((q) => q.side === p.side && q.slot === CAPTAIN_SLOT);
        if (cap && cap !== p && w > 0) {
          const d = Math.hypot(p.x - cap.x, p.y - cap.y);
          // Each in from his own side of the captain, a stride off him; no further than HUDDLE_MAX_M from his place.
          const ux = d > 0.01 ? (p.x - cap.x) / d : 1; const uy = d > 0.01 ? (p.y - cap.y) / d : 0;
          let dx = cap.x + ux * HUDDLE_RING_M - p.x; let dy = cap.y + uy * HUDDLE_RING_M - p.y;
          const len = Math.hypot(dx, dy);
          if (len > HUDDLE_MAX_M) { dx *= HUDDLE_MAX_M / len; dy *= HUDDLE_MAX_M / len; }
          man.dx = dx * w; man.dy = dy * w;
          // On the move while the gather or the spread carries him.
          const moving = kind === 'huddle' ? t < HUDDLE_IN : t > SPREAD_FROM && t < SPREAD_END;
          if (moving && len > 0.5) {
            man.action = 'run'; man.gait = 6 + Math.floor(t / STEP_TICKS + p.slot) % 6; man.frame = man.gait % 6;
            const sign = kind === 'huddle' ? 1 : -1;
            man.toward = { x: dx * sign, y: dy * sign };
          }
        }
      }
    }
    men.push(man);
  }
  return { kind, men };
}

/** Where the picture's clock stands: the ticks a break has stood still on screen, added to the sim's. */
export class BreakClock {
  private since = -1;
  private tick = -1;
  private held = 0;

  /**
   * Called once a frame with the snapshot on screen. `stalled`: the sim is not stepping (full time,
   * or held for a card) though the picture should play on; a sim held by the player's own pause
   * is not stalled, so the picture stands still with it. Resets when the phase changes or the
   * picture jumps (#682): back, or forward by more ticks than this frame's time can have played
   * (a seek; the clock it carried belonged to the other end of the break).
   */
  advance(cur: Snapshot, deltaMs: number, speed: number, stalled: boolean): number {
    const since = cur.phase?.since ?? -1;
    const played = Math.ceil(Math.max(0, deltaMs) * Math.max(0, speed) / TICK_MS) + 1;
    const jumped = this.tick >= 0 && (cur.tick < this.tick || cur.tick - this.tick > played);
    if (since !== this.since || jumped) { this.since = since; this.held = 0; }
    this.tick = cur.tick;
    if (stalled && (cur.phase?.kind === 'half-time' || cur.phase?.kind === 'full-time')) {
      // Enough to see every break picture through; no further, so it never grows without bound.
      this.held = Math.min(FT_GONE, this.held + Math.max(0, deltaMs) * speed / TICK_MS);
    }
    return this.held;
  }
}

/** The man's entry in a break scene. */
export function breakMan(scene: BreakScene | null, p: Pick<PlayerSnap, 'side' | 'slot'>): BreakMan | undefined {
  return scene?.men.find((m) => m.side === p.side && m.slot === p.slot);
}
