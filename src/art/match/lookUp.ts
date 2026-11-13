// Eyes on the bomb (#671): a standing or running man with his head tipped back, watching a high
// ball come down. The body is the ordinary idle or run frame; only the head is taken off and put
// back at an angle, with `tiltedHead` (the contact art's), so nothing below the chin changes.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { CENTRE, HEIGHT, PAINT_H, type Appearance, type Facing } from '../prototype/player';
import { tiltedHead } from '../prototype/contact';

/** Degrees the head tips back at each look-up level (1 a glance up, 2 right back); the sprite is painted facing right, so back is anticlockwise. */
export const LOOK_UP_TILT: readonly number[] = [0, -14, -30];

/** `drawPrototypePlayer`'s bob over a run cycle (player.ts RUN_BOB, JOG_BOB), which lifts the head with the shoulders. */
const RUN_BOB = [0, 1, -1, 0, 1, -1];
const JOG_BOB = [0, 1, 0, 0, 1, 0];

/**
 * Where `drawPrototypePlayer` puts the top-left of the head in the finished frame, for the idle
 * and run frames (the same arithmetic as player.ts, so the old head can be lifted off exactly).
 */
export function headSpot(action: 'idle' | 'run', frame: number, strideFrame: number | undefined, tired: number, stature: number): { x: number; y: number } {
  const f = ((Math.floor(frame) % 6) + 6) % 6;
  const running = strideFrame !== -1 && action === 'run';
  const gait = strideFrame === undefined || strideFrame < 0 ? f : strideFrame % 6;
  const jog = running && strideFrame !== undefined && strideFrame >= 6;
  const weary = Math.max(0, Math.min(2, tired));
  const bob = running ? Math.max(weary ? 0 : -1, (jog ? JOG_BOB : RUN_BOB)[gait]!) : 0;
  const breath = action === 'idle' && f % 2 === 1 ? 1 : 0;
  const lean = (running ? 1 : 0) + weary;
  const shoulderY = 20 + bob - breath + weary;
  // `stand` fits the painted figure to the frame: down by the spare rows, up by the shins a tall man adds.
  return { x: CENTRE - 7 + lean + (weary > 1 ? 1 : 0), y: shoulderY - 17 + weary + (HEIGHT - PAINT_H) - stature };
}

/** The head's height in the painted frame (rows): everything above its chin row goes when the head is lifted off. */
const HEAD_ROWS = 16;

/**
 * `frame` (an idle or run frame) with its head tipped back `level` steps (LOOK_UP_TILT). The
 * head and the outline round it are redrawn; the body, arms and legs are the frame's own.
 */
export function lookUpFrame(frame: PixelBuffer, look: Appearance, kit: Kit, facing: Facing, action: 'idle' | 'run', frameNo: number, strideFrame: number | undefined, tired: number, level: number): PixelBuffer {
  const angle = LOOK_UP_TILT[Math.max(0, Math.min(2, level))]!;
  const at = headSpot(action, frameNo, strideFrame, tired, look.stature);
  const out = new PixelBuffer(frame.w, frame.h, frame.data.slice());
  // Above the chin there is only the head and its outline: clear it, then put the head back tipped.
  const chin = at.y + HEAD_ROWS;
  out.data.fill(0, 0, Math.min(out.h, chin) * out.w * 4);
  out.blit(tiltedHead(look, kit, facing, false, angle), at.x - 6, at.y - 6);
  // A fresh outline round the new head only: the body's is already there.
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < out.w && y < out.h && out.get(x, y).alpha > 0;
  const ring: [number, number][] = [];
  for (let y = 0; y <= Math.min(out.h - 1, chin); y++) for (let x = 0; x < out.w; x++) {
    if (!opaque(x, y) && (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1))) ring.push([x, y]);
  }
  for (const [x, y] of ring) out.set(x, y, OUTLINE);
  return out;
}
