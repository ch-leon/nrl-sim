// src/match/view/kickLayer.ts — kicks go wide (N15.3, BAK-208 §4.4 and §6): the
// camera pulls back to hold the kicker and where the ball will come down, a trail
// follows the ball from the boot and fades after the catch or the bounce, and then
// the framing comes back within a second. A bomb or a cross-field kick shows the
// contest under the ball (the two men nearest where it comes down, and which of
// them won it, BAK-206's polish item); a grubber shows where it skids and hops.
//
// Pure over the snapshots and events, like the other layers: KickWatch follows
// the kick event by event and tick by tick, predictFlight, kickFrame and trailAlpha
// are maths, and KickLayer is two Phaser Graphics drawing what they say. No dice,
// nothing the sim reads. The snapshot carries the ball, not its flight, but the
// sim flies a kick on a fixed curve (core/ball.ts), so its first three ticks in
// the air say where it lands and how high it goes.
import type Phaser from 'phaser';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import { toFieldPt } from '../core/field';
import { LIFT_PX_PER_M } from './liveView';
import { GROUNDED_LIFT } from './commentary';

/** The events a kick in general play starts with. */
export const KICK_STARTS: ReadonlySet<string> = new Set(['kick', 'kickoff', 'drop-out']);
/** What brings a kick down: a catch or a scoop, a regather, a spill, touch, dead, a try, the whistle. */
const KICK_ENDS: ReadonlySet<string> = new Set([
  'set-start', 'regather', 'drop', 'touch', 'dead-ball', 'on-full', '40-20', 'try', 'error', 'penalty', 'charge-down', 'tackle', 'intercept', 'half-time', 'full-time', 'golden-point',
]);
/** The kicks with a catch contest under them (§4.4: the bomb onto the fullback, the cross-field winger on winger). */
const CONTEST_KICKS: ReadonlySet<string> = new Set(['bomb', 'cross-field']);
/** The contest is shown from the top of the flight, between men this close (metres) to where it comes down. */
export const CONTEST_M = 9;
/** A grubber skids where its hops come down below this, metres. */
export const SKID_LIFT_M = 0.12;
/** A flight read off three ticks that comes down later than this (ticks) is not a kick's: none is that long. */
const MAX_FLIGHT_TICKS = 400;

/** Real ms the framing holds after the kick comes down, then the time it has to get back. */
export const KICK_HOLD_MS = 200;
export const KICK_RETURN_MS = 800;
/**
 * Ease rates (per second) for the zoom and the pan going out to a kick (95% in half a
 * second) and coming back (the zoom whole again, from 1 to 2, inside KICK_RETURN_MS).
 */
export const KICK_OUT_PER_S = 6;
export const KICK_BACK_PER_S = 8;
/** The pan's speed cap going out and back (world px per ms): too high to bind, so the ease alone sets the pace. Finite: a 0 ms frame times Infinity is NaN. */
export const KICK_PAN_MAX_PX_PER_MS = 1e6;
/** The trail fades over this long after the kick comes down (real ms); the winner's ring grows over the first part of it. */
export const TRAIL_FADE_MS = 900;
const WIN_POP_MS = 400;
/** Screen px kept clear: the scoreboard above, the ticker and the speed buttons below, the Stats panel on the right, the edges. */
export const FRAME_MARGIN = { top: 76, bottom: 120, left: 40, right: 160 } as const;
/** Screen px the landing keeps inside that band when the rest cannot all be held: room for the men under it and their rings. */
export const LANDING_INSET = 40;

export interface BallPoint {
  /** Field metres along and across, and metres up. */
  x: number;
  y: number;
  lift: number;
}

/** Where a kick comes down and the top of its flight, read off its first ticks in the air. */
export interface KickFlight {
  landing: { x: number; y: number };
  apex: BallPoint;
}

export interface Contestant {
  side: Side;
  slot: number;
}

/** One kick in general play, from the boot until it comes down. */
export interface Kick {
  /** The kick's type (long, bomb, grubber, chip, cross-field), or kickoff / drop-out. */
  type: string;
  side: Side;
  slot: number;
  /** Where the kicker stood when he struck it, field metres. */
  strike: { x: number; y: number };
  strikeTick: number;
  /** The ball each tick while it was free. */
  path: BallPoint[];
  /** Where it comes down and how high it goes, from its third tick in the air; null before then and for a grubber. */
  flight: KickFlight | null;
  /** Where a grubber skidded. */
  skids: BallPoint[];
  /** The tick it came down (caught, landed, out, dead), or null while it is up. */
  downTick: number | null;
  /** The two under a bomb or a cross-field kick as it comes down: the kicking side's man, then the receiver's. */
  contest: [Contestant, Contestant] | null;
  /** Who took the ball out of the contest, or null (a spill is nobody's). */
  winner: Contestant | null;
  /** Big Boot made the kick (the event names the trait): the trail is wider and in the trait colour (N15.4). The flight is already longer. */
  boot?: boolean;
}

/**
 * Where a kick comes down and how high it goes, from its first three ticks in the air.
 * The sim flies a kick at a steady pace over the ground on a parabola in time
 * (core/ball.ts `flightLift`), so three heights fix the curve and two places the pace:
 * it lands where the curve comes back to the ground. Null when the heights are not a
 * falling curve (a grubber's hops) or it would land absurdly late.
 */
export function predictFlight(path: readonly BallPoint[]): KickFlight | null {
  const [p0, p1, p2] = path;
  if (!p0 || !p1 || !p2) return null;
  // lift(t) = a·t² + b·t + c, t in ticks from p0.
  const a = (p2.lift - 2 * p1.lift + p0.lift) / 2;
  if (a > -1e-6) return null;
  const b = p1.lift - p0.lift - a;
  const c = p0.lift;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const down = (-b - Math.sqrt(disc)) / (2 * a); // the later root (a < 0)
  if (!(down >= 2) || down > MAX_FLIGHT_TICKS) return null;
  const top = Math.max(0, -b / (2 * a));
  const vx = p1.x - p0.x;
  const vy = p1.y - p0.y;
  return {
    landing: { x: p0.x + vx * down, y: p0.y + vy * down },
    apex: { x: p0.x + vx * top, y: p0.y + vy * top, lift: a * top * top + b * top + c },
  };
}

/** The nearest man of each side to the ball's spot, within CONTEST_M; null unless both are there. */
export function contestants(s: Snapshot, at: { x: number; y: number }, kicking: Side): [Contestant, Contestant] | null {
  const nearest = (side: Side): Contestant | null => {
    let best: Contestant | null = null;
    let bd = CONTEST_M;
    for (const p of s.players) {
      if (p.side !== side || p.binned) continue;
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < bd) {
        bd = d;
        best = { side: p.side, slot: p.slot };
      }
    }
    return best;
  };
  const a = nearest(kicking);
  const r = nearest(kicking === 'home' ? 'away' : 'home');
  return a && r ? [a, r] : null;
}

/**
 * Follows the kicks in a match: an event starts one (KICK_STARTS) or brings it
 * down (KICK_ENDS); each tick's ball draws its path, reads where it will land,
 * sees it held, landed or lying on the ground (down), marks a grubber's skids and
 * finds the two under a contest kick. Give it every event and every tick
 * in order; ticks only go forward (a replay that goes back wants its own watch).
 */
export class KickWatch {
  kick: Kick | null = null;
  private groundAt = -2;
  private prevLift = 0;

  /** An event on the tick `snap` shows. */
  event(e: SimEvent, snap: Snapshot): void {
    if (KICK_STARTS.has(e.kind) && e.side && e.slot !== undefined) {
      const p = snap.players.find((q) => q.side === e.side && q.slot === e.slot);
      this.kick = {
        type: e.kind === 'kick' ? e.detail ?? 'long' : e.kind,
        side: e.side,
        slot: e.slot,
        strike: p ? { x: p.x, y: p.y } : { x: snap.ball.x, y: snap.ball.y },
        strikeTick: e.tick,
        path: [],
        flight: null,
        skids: [],
        downTick: null,
        contest: null,
        winner: null,
        boot: typeof e.trait === 'string' && (e.trait === 'Big Boot' || e.trait.startsWith('Big Boot ')),
      };
      this.groundAt = -2;
      this.prevLift = snap.ball.lift;
      return;
    }
    const k = this.kick;
    if (!k || k.downTick !== null || !KICK_ENDS.has(e.kind)) return;
    k.downTick = e.tick;
    // Out of the contest: the man who took it won it; a spill is nobody's.
    if (k.contest && e.side && e.slot !== undefined && (e.kind === 'set-start' || e.kind === 'regather')) {
      k.winner = { side: e.side, slot: e.slot };
    }
  }

  /** Each tick's snapshot, after its events. */
  tick(s: Snapshot): void {
    const k = this.kick;
    if (!k || k.downTick !== null || s.tick <= k.strikeTick) return;
    const b = s.ball;
    if (b.holder !== null) {
      // Taken without a word (grounded in-goal, say): whoever has it won the contest.
      k.downTick = s.tick;
      if (k.contest) k.winner = { ...b.holder };
      return;
    }
    k.path.push({ x: b.x, y: b.y, lift: b.lift });
    if (k.path.length === 3 && k.type !== 'grubber') k.flight = predictFlight(k.path);
    if (k.type === 'grubber' && b.lift < SKID_LIFT_M && this.prevLift >= SKID_LIFT_M) k.skids.push({ x: b.x, y: b.y, lift: 0 });
    // Coming down: the nearest of each side to where it lands are under it, and the rings follow them.
    if (CONTEST_KICKS.has(k.type) && b.lift < this.prevLift) k.contest = contestants(s, k.flight?.landing ?? b, k.side) ?? k.contest;
    this.prevLift = b.lift;
    if (b.lift < GROUNDED_LIFT) {
      // A kick whose flight is read has landed the first tick it touches the ground (the
      // bounce); anything else is down once it lies there two ticks running (a grubber's hops
      // touch it a tick at a time).
      if (k.flight || this.groundAt === s.tick - 1) k.downTick = s.tick;
      this.groundAt = s.tick;
    }
  }

  /** Forget the kick (a skipped or resumed stretch). */
  clear(): void {
    this.kick = null;
  }
}

/** A point on screen to frame, world px. */
export interface WorldPt {
  x: number;
  y: number;
}

/** Where the camera centres and at what zoom. */
export interface Frame {
  cx: number;
  cy: number;
  zoom: number;
}

/**
 * The framing that holds the points: the widest whole-number zoom from `base` down
 * (never under 1, where a player is still 20 px tall) at which their box fits inside
 * the view less its margins, centred in the band the overlay leaves clear. Whole
 * numbers keep the pixel art crisp (world/viewport.ts). The points come in order of
 * need: when they cannot all fit even at 1, the first stays inside the band (and
 * LANDING_INSET in from its edges), then each next one as far as it still can.
 */
export function kickFrame(points: readonly WorldPt[], view: { width: number; height: number }, base: number): Frame {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const availW = Math.max(1, view.width - FRAME_MARGIN.left - FRAME_MARGIN.right);
  const availH = Math.max(1, view.height - FRAME_MARGIN.top - FRAME_MARGIN.bottom);
  let zoom = Math.max(1, Math.round(base));
  while (zoom > 1 && ((x1 - x0) * zoom > availW || (y1 - y0) * zoom > availH)) zoom -= 1;
  // The band's middle, in world px: the box's middle, kept where it holds each point in turn.
  const hw = availW / 2 / zoom;
  const hh = availH / 2 / zoom;
  const inset = { x: Math.min(LANDING_INSET, availW / 4) / zoom, y: Math.min(LANDING_INSET, availH / 4) / zoom };
  let lo = { x: -Infinity, y: -Infinity };
  let hi = { x: Infinity, y: Infinity };
  for (const [i, p] of points.entries()) {
    const w = i === 0 ? hw - inset.x : hw;
    const h = i === 0 ? hh - inset.y : hh;
    const nlo = { x: Math.max(lo.x, p.x - w), y: Math.max(lo.y, p.y - h) };
    const nhi = { x: Math.min(hi.x, p.x + w), y: Math.min(hi.y, p.y + h) };
    if (nlo.x <= nhi.x) (lo.x = nlo.x), (hi.x = nhi.x);
    if (nlo.y <= nhi.y) (lo.y = nlo.y), (hi.y = nhi.y);
  }
  const bx = Math.min(hi.x, Math.max(lo.x, (x0 + x1) / 2));
  const by = Math.min(hi.y, Math.max(lo.y, (y0 + y1) / 2));
  // The band sits off the screen's middle: the scoreboard above is shorter than the ticker
  // and buttons below, and the Stats panel wider than the left edge's margin.
  const shiftX = (FRAME_MARGIN.left - FRAME_MARGIN.right) / 2;
  const shiftY = (FRAME_MARGIN.top - FRAME_MARGIN.bottom) / 2;
  return { cx: bx - shiftX / zoom, cy: by - shiftY / zoom, zoom };
}

/**
 * The points a kick's framing holds, in order of need: where it comes down (the ball
 * on the ground until that is known), the kicker where he struck it, and the ball at
 * the top of its flight (or where it is now).
 */
export function kickPoints(k: Kick, toWorld: (fx: number, fy: number) => WorldPt): WorldPt[] {
  const ground = (p: { x: number; y: number }): WorldPt => {
    const f = toFieldPt(p);
    return toWorld(f.fx, f.fy);
  };
  const air = (p: BallPoint): WorldPt => {
    const g = ground(p);
    return { x: g.x, y: g.y - p.lift * LIFT_PX_PER_M };
  };
  const strike = ground(k.strike);
  if (k.flight) return [ground(k.flight.landing), strike, air(k.flight.apex)];
  const b = k.path[k.path.length - 1];
  return b ? [ground(b), strike, air(b)] : [strike];
}

/** The trail's alpha: full while the kick is up, fading over TRAIL_FADE_MS once it is down, then gone. */
export function trailAlpha(msSinceDown: number | null): number {
  if (msSinceDown === null) return 1;
  return Math.max(0, 1 - msSinceDown / TRAIL_FADE_MS);
}

/** Whether a kick still holds the framing: up, or down less than KICK_HOLD_MS ago. */
export function framingHeld(msSinceDown: number | null): boolean {
  return msSinceDown === null || msSinceDown < KICK_HOLD_MS;
}

const TRAIL_COLOR = 0xffffff;
const TRAIL_SHADE = 0x1b2a12;
/** Big Boot's trail: wider, and in the trait colour (popups.ts TRAIT_COLOR), so his kick reads as his (N15.4). */
export const BOOT_TRAIL_COLOR = 0xd9a5ff;
const PLAIN_WIDTHS: readonly [number, number] = [5, 3];
const BOOT_WIDTHS: readonly [number, number] = [9, 5];

/** The trail's two widths (shade, then the line) and the line's colour. Wider and in the trait colour when Big Boot struck it. */
export function trailStyle(boot: boolean): { widths: readonly [number, number]; color: number } {
  return boot ? { widths: BOOT_WIDTHS, color: BOOT_TRAIL_COLOR } : { widths: PLAIN_WIDTHS, color: TRAIL_COLOR };
}
const SKID_COLOR = 0xd9c9a3;
const MARK_COLOR = 0xffffff;
/** The contest's rings and the landing mark, world px: the carrier's ring is 22 × 11 (MatchScene). */
const RING_W = 22;
const RING_H = 11;

/**
 * Draws the trail (in the air, over the players), and on the ground under them where
 * the kick comes down, a grubber's skids and the contest's rings; keeps the time since
 * the kick came down (real ms) for the fade and the framing.
 */
export class KickLayer {
  private readonly air: Phaser.GameObjects.Graphics;
  private readonly ground: Phaser.GameObjects.Graphics;
  /** Real ms since the kick came down, or null while it is up (or there is none). */
  private sinceDown: number | null = null;
  private drawn: Kick | null = null;

  constructor(
    scene: Phaser.Scene,
    depths: { air: number; ground: number },
    /** The sides' colours (the carrier ring's): the contest's rings wear them. */
    private readonly colors: () => Readonly<Record<Side, number>>,
  ) {
    this.air = scene.add.graphics().setDepth(depths.air);
    this.ground = scene.add.graphics().setDepth(depths.ground);
  }

  /** Real ms since the kick on screen came down (null while it is up or none is). */
  get msSinceDown(): number | null {
    return this.drawn ? this.sinceDown : null;
  }

  /** Whether a kick is on screen (up, or its trail still fading). */
  get active(): boolean {
    return this.drawn !== null && trailAlpha(this.sinceDown) > 0;
  }

  /** Call every frame with the kick being watched, the real delta and the camera's zoom. */
  update(
    k: Kick | null,
    deltaMs: number,
    zoom: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    if (k !== this.drawn) {
      this.drawn = k;
      this.sinceDown = null;
    }
    const g = this.air;
    const under = this.ground;
    g.clear();
    under.clear();
    if (!k) return;
    if (k.downTick !== null) this.sinceDown = (this.sinceDown ?? 0) + deltaMs;
    const a = trailAlpha(this.sinceDown);
    if (a <= 0) return;
    const px = 1 / zoom;
    const at = (p: BallPoint): WorldPt => {
      const f = toFieldPt(p);
      const w = toWorld(f.fx, f.fy);
      return { x: w.x, y: w.y - p.lift * LIFT_PX_PER_M };
    };
    // The trail: from the boot to the ball, older stretches fainter, over a dark edge so it reads on the grass.
    const pts = [at({ ...k.strike, lift: 0.4 }), ...k.path.map(at)];
    const style = trailStyle(k.boot === true);
    for (const [width, color, strength] of [[style.widths[0], TRAIL_SHADE, 0.3], [style.widths[1], style.color, 1]] as const) {
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1]!;
        const q = pts[i]!;
        g.lineStyle(width * px, color, strength * a * (0.25 + 0.65 * (i / pts.length)));
        g.lineBetween(p.x, p.y, q.x, q.y);
      }
    }
    // Where it comes down, marked on the ground while it is up: a ring the carrier's size and a spot.
    if (k.flight && k.downTick === null) {
      const m = at({ ...k.flight.landing, lift: 0 });
      under.fillStyle(MARK_COLOR, 0.15).fillEllipse(m.x, m.y, RING_W, RING_H);
      under.lineStyle(1.5, MARK_COLOR, 0.8).strokeEllipse(m.x, m.y, RING_W, RING_H);
      under.fillStyle(MARK_COLOR, 0.8).fillEllipse(m.x, m.y, 4, 2);
    }
    // A grubber's skids: a puff where each hop came down.
    for (const s of k.skids) {
      const w = at(s);
      under.fillStyle(SKID_COLOR, 0.7 * a).fillEllipse(w.x, w.y, 11, 5);
    }
    // The contest under a bomb: a ring under each of the two in his side's colours; once
    // one has it his ring goes white and grows, and the other's fades.
    if (k.contest) {
      const won = (c: Contestant): boolean => k.winner !== null && k.winner.side === c.side && k.winner.slot === c.slot;
      for (const c of k.contest) {
        if (won(c)) continue;
        const f = feet(c.side, c.slot);
        if (!f) continue;
        const fade = k.winner || k.downTick !== null ? a * a : 1;
        const col = this.colors()[c.side];
        under.fillStyle(col, 0.22 * fade).fillEllipse(f.x, f.y, RING_W, RING_H);
        under.lineStyle(2, col, 0.95 * fade).strokeEllipse(f.x, f.y, RING_W, RING_H);
      }
      const w = k.winner ? feet(k.winner.side, k.winner.slot) : null;
      if (w) {
        const grow = Math.min(1, (this.sinceDown ?? 0) / WIN_POP_MS);
        under.lineStyle(2.5, 0xffffff, a).strokeEllipse(w.x, w.y, RING_W * (1 + 0.6 * grow), RING_H * (1 + 0.6 * grow));
      }
    }
  }

  destroy(): void {
    this.air.destroy();
    this.ground.destroy();
  }
}
