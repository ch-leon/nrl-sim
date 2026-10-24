// src/match/view/contestLayer.ts — the contest you can see (N15.6, BAK-206).
// A line break flashes across the defensive line where it was broken. A big
// hit, the tackle the sim drives backwards, leaves a dust puff a metre behind
// the carrier. The bodies already moved (live.ts, LIVE.driveBack); this only
// draws. Pure over the event and the snapshot: no dice, nothing the sim reads.
import type Phaser from 'phaser';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import { toFieldPt } from '../core/field';

/** How long a mark stays up, real ms. */
export const CONTEST_MS = 800;
/** The last part of that is the fade. */
const FADE_MS = 280;
/** The dust sits this far behind the carrier: the shove you can see, a metre. */
export const DRIVE_DUST_M = 1;
/** The break flash spans this many metres of the defensive line, centred on the man who went through. */
export const BREAK_SPAN_M = 12;

const DUST_COLOR = 0xd9c9a3;
const BREAK_COLOR = 0xfff2b0;

export type ContestKind = 'dust' | 'break';

export interface ContestMark {
  kind: ContestKind;
  /** Where it happened, field metres. */
  x: number;
  y: number;
  /** Which way the man faces along the field (+1 towards the right-hand dead-ball line). */
  headX: number;
  side: Side;
  slot: number;
}

/** 1 until the fade, then down to 0 at CONTEST_MS. Nothing before it starts or after it ends. */
export function contestAlpha(ageMs: number): number {
  if (ageMs < 0 || ageMs >= CONTEST_MS) return 0;
  if (ageMs <= CONTEST_MS - FADE_MS) return 1;
  return (CONTEST_MS - ageMs) / FADE_MS;
}

/**
 * The mark an event draws, or null. A line break flashes on the man who broke
 * it. A big hit puffs dust on the carrier the sim just drove back (the ball's
 * holder); with no holder it falls back to the man the event names.
 */
export function contestMarkFor(e: SimEvent, snap: Snapshot): ContestMark | null {
  if (e.kind === 'line-break') {
    if (e.side === undefined || e.slot === undefined) return null;
    const p = snap.players.find((q) => q.side === e.side && q.slot === e.slot);
    if (!p) return null;
    return { kind: 'break', x: p.x, y: p.y, headX: p.headX || 1, side: p.side, slot: p.slot };
  }
  if (e.kind === 'big-hit') {
    const h = snap.ball.holder;
    const p = h
      ? snap.players.find((q) => q.side === h.side && q.slot === h.slot)
      : e.side !== undefined && e.slot !== undefined
        ? snap.players.find((q) => q.side === e.side && q.slot === e.slot)
        : undefined;
    if (!p) return null;
    return { kind: 'dust', x: p.x, y: p.y, headX: p.headX || 1, side: p.side, slot: p.slot };
  }
  return null;
}

interface WorldPt {
  x: number;
  y: number;
}

function worldOf(x: number, y: number, toWorld: (fx: number, fy: number) => WorldPt): WorldPt {
  const f = toFieldPt({ x, y });
  return toWorld(f.fx, f.fy);
}

/**
 * Draws the marks on the pitch, under the pop-ups. Give it each event as it
 * is said (`note`); call `update` every frame after the sprites have moved.
 * `clear` drops them (a skipped or resumed stretch shows none).
 */
export class ContestLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly live: { mark: ContestMark; born: number }[] = [];
  private now = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  note(e: SimEvent, snap: Snapshot): void {
    const mark = contestMarkFor(e, snap);
    if (mark) this.live.push({ mark, born: this.now });
  }

  clear(): void {
    this.live.length = 0;
  }

  update(
    deltaMs: number,
    zoom: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    this.now += deltaMs;
    this.g.clear();
    const px = 1 / Math.max(0.25, zoom);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]!;
      const a = contestAlpha(this.now - l.born);
      if (a <= 0) {
        this.live.splice(i, 1);
        continue;
      }
      this.draw(l.mark, a, px, toWorld, feet);
    }
  }

  private draw(
    mark: ContestMark,
    a: number,
    px: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    const g = this.g;
    const at = feet(mark.side, mark.slot) ?? worldOf(mark.x, mark.y, toWorld);
    if (mark.kind === 'break') {
      // On the line where he went through. His feet have already left it.
      const half = BREAK_SPAN_M / 2;
      const onLine = worldOf(mark.x, mark.y, toWorld);
      const left = worldOf(mark.x, mark.y - half, toWorld);
      const right = worldOf(mark.x, mark.y + half, toWorld);
      g.lineStyle(7 * px, 0xffffff, 0.35 * a).lineBetween(left.x, left.y, right.x, right.y);
      g.lineStyle(3 * px, BREAK_COLOR, 0.95 * a).lineBetween(left.x, left.y, right.x, right.y);
      g.fillStyle(0xffffff, 0.9 * a).fillCircle(onLine.x, onLine.y, 4 * px);
      return;
    }
    // Dust a metre behind him: the shove the sim already drove.
    const sign = mark.headX < 0 ? -1 : 1;
    const back = worldOf(mark.x - sign * DRIVE_DUST_M, mark.y, toWorld);
    const mid = { x: (at.x + back.x) / 2, y: (at.y + back.y) / 2 };
    g.fillStyle(DUST_COLOR, 0.35 * a).fillEllipse(back.x, back.y, 18 * px, 8 * px);
    g.fillStyle(DUST_COLOR, 0.55 * a).fillEllipse(mid.x, mid.y, 12 * px, 6 * px);
    g.fillStyle(0xffffff, 0.4 * a).fillEllipse(at.x, at.y + 2, 8 * px, 4 * px);
  }

  destroy(): void {
    this.g.destroy();
    this.live.length = 0;
  }
}
