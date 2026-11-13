// src/art/match/bench.ts — the people off the ball (#642): the interchange bench
// with its seated reserves, the sin-bin seat, and the referee's strip and look.
// Drawn with the players' own art (prototype/player, the contact brush), so a man
// on the bench is the same man when he comes on. Pure + Phaser-free.
import { PixelBuffer, mix, shade } from '../pixel';
import { OUTLINE, buildKit, colorDistance, type Kit } from './kit';
import { kitContrast } from './kitClash';
import { CENTRE, FOOT, HEIGHT, PAINT_H, WIDTH, appearanceFor, stand, type Appearance } from '../prototype/player';
import { body, contactPainter } from '../prototype/tackle';
import { tiltedHead } from '../prototype/contact';
import { bentContactArm } from './limbs';

// ── Referee ─────────────────────────────────────────────────────────────────

/**
 * Strips the referee may wear (jersey, trim): the bright single colours league
 * officials wear, and black. He wears the one furthest from both sides as they
 * are dressed (the away side's clash strip included), so he never reads as a player.
 */
export const REFEREE_STRIPS: readonly (readonly [number, number])[] = [
  [0xb5f23a, 0x1b1d22], // lime, black trim
  [0xff4fa6, 0x1b1d22], // pink
  [0x2fd6e6, 0x1b1d22], // cyan
  [0xff8a1c, 0x1b1d22], // orange
  [0x1b1d22, 0xb5f23a], // black, lime trim
];

/** The referee's kit for a fixture: plain, in the strip that contrasts most with both kits worn. */
export function refereeKit(...worn: readonly Kit[]): Kit {
  let best: Kit | null = null;
  let bestScore = -Infinity;
  for (const [jersey, trim] of REFEREE_STRIPS) {
    const k = buildKit(jersey, trim, 'plain');
    // The nearer side decides: a strip is only as good as its worst clash.
    const score = Math.min(...worn.map((w) => Math.min(kitContrast(k, w), colorDistance(k.jersey, w.jersey) / 4)));
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return { ...best!, shorts: 0x1b1d22, shortsShade: 0x0c0d10, sock: 0x1b1d22, sockHoop: best!.jersey };
}

/** The referee: an ordinary man (no number), the same one every match. */
export function refereeLook(): Appearance {
  return { ...appearanceFor('match-referee'), head: 'short', build: 'athletic', stature: 0, tape: false, boots: 0x1b1d22 };
}

// ── Bench ───────────────────────────────────────────────────────────────────

/**
 * A reserve sitting on the bench, seen from behind (the bench faces the field, the
 * camera looks from the near stand): side-on, thighs forward to the right, hands on
 * his knees, the number on his back. Same frame as a player's (WIDTH × HEIGHT, feet
 * on FOOT at CENTRE).
 */
export function drawSeatedPlayer(look: Appearance, kit: Kit): PixelBuffer {
  const out = new PixelBuffer(WIDTH, PAINT_H);
  const brush = contactPainter(out);
  // The standing figure's joints (moments.ts stand()), the hips dropped onto a seat.
  const drop = 3;
  const p = body([18, 27 + drop], [18, 20 + drop], [11, 3 + drop], [24, 27 + drop], [24, 34], [21, 27 + drop], [21, 34]);
  brush.legs(p, look, kit);
  const far = bentContactArm([p.shoulder[0] - 3, p.shoulder[1] + 1], [22, 30], 1);
  brush.arm(far.shoulder, far.elbow, far.hand, look, true);
  brush.torso(p, look, kit);
  // From behind: the back of his head, and his number.
  out.blit(tiltedHead(look, kit, 'back', false, 0), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  if (look.number !== undefined) {
    const digits = String(look.number);
    // A 3×5 digit per number, on the jersey between the shoulder blades.
    let x = 17 - (digits.length - 1) * 2;
    // A plain panel under the digits keeps them off hoops, stripes and the V (as on a standing man).
    out.fillRect(x - 1, p.shoulder[1] + 1, digits.length * 4 + 1, 5, kit.jersey);
    for (const d of digits) {
      digitAt(out, d, x, p.shoulder[1] + 1, kit.trim);
      x += 4;
    }
  }
  // The near arm hangs down his side to his knee, clear of the number.
  const half = look.build === 'stocky' ? 6 : look.build === 'athletic' ? 5 : 4;
  brush.arm([p.shoulder[0] + half, p.shoulder[1] + 1], [p.shoulder[0] + half + 1, p.shoulder[1] + 5], [p.shoulder[0] + half + 3, p.hip[1] - 1], look, false);
  out.outline(OUTLINE);
  return stand(out, 0);
}

const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};
function digitAt(b: PixelBuffer, d: string, x: number, y: number, color: number): void {
  DIGITS[d]?.forEach((row, dy) => {
    for (let dx = 0; dx < 3; dx++) if (row[dx] === '#') b.set(x + dx, y + dy, color);
  });
}

/** Seat height above the ground (px) and how far the plank runs either side of a seat. */
const SEAT_H = 5;
const PLANK = 0x5d6470;

export interface BenchPainting {
  buf: PixelBuffer;
  /** World position of the buffer's top-left corner. */
  x: number;
  y: number;
}

/**
 * A side's bench as one picture: a long padded bench along the touchline with a seat
 * per place (world feet positions, any order) and the seated reserves on it (null for an
 * empty seat). Seats run along the field, so each is a 2:1 step down-right of the last;
 * nearer seats (lower on screen) are painted over farther ones. The size depends on the
 * seats alone, so a bench repainted after an interchange fits the same texture.
 */
export function paintBench(seats: readonly { x: number; y: number }[], people: readonly (PixelBuffer | null)[], kit: Kit): BenchPainting {
  const xs = seats.map((s) => s.x);
  const ys = seats.map((s) => s.y);
  const x0 = Math.floor(Math.min(...xs)) - WIDTH;
  const y0 = Math.floor(Math.min(...ys)) - HEIGHT;
  const buf = new PixelBuffer(Math.ceil(Math.max(...xs)) + WIDTH - x0, Math.ceil(Math.max(...ys)) + 8 - y0);
  const at = (p: { x: number; y: number }) => ({ x: Math.round(p.x) - x0, y: Math.round(p.y) - y0 });
  // One plank under every seat, painted seat by seat from the far end.
  const order = seats.map((s, i) => ({ s, i })).sort((p, q) => p.s.y - q.s.y);
  const step = order.length > 1 ? { x: (order[1]!.s.x - order[0]!.s.x) / 2, y: (order[1]!.s.y - order[0]!.s.y) / 2 } : { x: 9, y: 4.5 };
  for (const { s, i } of order) {
    const c = at(s);
    const man = people[i];
    if (man) buf.blit(man, c.x - CENTRE, c.y - FOOT);
    plank(buf, c.x, c.y, step, kit);
  }
  return { buf, x: x0, y: y0 };
}

/** The sin-bin spot's picture: origin, in the buffer, of the seat's ground point. */
export const BIN_SPOT_X = 13;
export const BIN_SPOT_Y = 12;

/**
 * The sin bin: a yellow box marked out on the grass round a lone yellow stool. Drawn
 * under the man who sits there (it sorts at its own ground point, he one pixel nearer).
 */
export function drawBinSpot(): PixelBuffer {
  const buf = new PixelBuffer(27, 20);
  const b = { x: BIN_SPOT_X, y: BIN_SPOT_Y };
  // A ground diamond 24 px across and 12 deep, dashed every other pair of pixels.
  for (let i = 0; i <= 12; i++) {
    if ((i >> 1) % 2 === 1) continue;
    const a = Math.floor(i / 2);
    for (const [ox, oy] of [[i - 12, a], [i, 6 - a], [i - 12, -a], [i, a - 6]] as const) buf.set(b.x + ox, b.y + oy, 0xf5d020);
  }
  stool(buf, b.x, b.y, 0xf5d020);
  return buf;
}

/** One seat's run of the bench: a padded top in the side's colours on two dark legs. */
function plank(buf: PixelBuffer, cx: number, cy: number, step: { x: number; y: number }, kit: Kit): void {
  const n = Math.round(Math.abs(step.x)) + 1;
  for (let i = -n; i <= n; i++) {
    const x = cx + i;
    const y = cy + Math.round((i * step.y) / Math.max(1, Math.abs(step.x)));
    const top = y - SEAT_H;
    buf.set(x, top - 1, OUTLINE);
    buf.set(x, top, mix(kit.jersey, 0xffffff, 0.25));
    buf.set(x, top + 1, kit.jersey);
    buf.set(x, top + 2, kit.jerseyShade);
    buf.set(x, top + 3, PLANK);
    buf.set(x, top + 4, OUTLINE);
    if (Math.abs(i) === n - 1) for (let yy = top + 5; yy <= y; yy++) buf.set(x, yy, shade(PLANK, 0.7));
    buf.set(x + 2, y + 1, 0x000000, 0.18);
  }
}

/** The sin-bin stool. */
function stool(buf: PixelBuffer, cx: number, cy: number, accent: number): void {
  for (let i = -3; i <= 3; i++) {
    buf.set(cx + i, cy - SEAT_H - 1, OUTLINE);
    buf.set(cx + i, cy - SEAT_H, accent);
    buf.set(cx + i, cy - SEAT_H + 1, shade(accent, 0.7));
    buf.set(cx + i, cy - SEAT_H + 2, OUTLINE);
  }
  for (let yy = cy - SEAT_H + 3; yy <= cy; yy++) {
    buf.set(cx - 2, yy, PLANK);
    buf.set(cx + 2, yy, shade(PLANK, 0.7));
  }
}

/** The yellow card hung over a man in the sin bin. */
export function drawBinCard(): PixelBuffer {
  const b = new PixelBuffer(9, 11);
  b.fillRect(1, 1, 7, 9, 0xf5d020);
  b.fillRect(1, 1, 7, 1, 0xfff27a);
  b.fillRect(6, 2, 2, 8, 0xd4ae10);
  b.outline(OUTLINE);
  return b;
}

/**
 * A corner post: a padded white post with a flag on top in the home side's colours.
 * Origin is the bottom-centre pixel (CORNER_FLAG_X, CORNER_FLAG_H - 1), the post's
 * foot, so it sorts by its own ground contact like the goalposts.
 */
export const CORNER_FLAG_W = 11;
export const CORNER_FLAG_H = 26;
export const CORNER_FLAG_X = 2;
export function drawCornerFlag(kit: Kit): PixelBuffer {
  const b = new PixelBuffer(CORNER_FLAG_W, CORNER_FLAG_H);
  const base = CORNER_FLAG_H - 2;
  const x = CORNER_FLAG_X;
  // The post: white with a shaded side, padded in the home colours near the ground.
  for (let y = 2; y <= base; y++) {
    b.set(x, y, 0xf6f6f0);
    b.set(x + 1, y, 0xc8c8c4);
  }
  for (let y = base - 5; y <= base; y++) {
    b.set(x - 1, y, mix(kit.jersey, 0xffffff, 0.3));
    b.set(x, y, kit.jersey);
    b.set(x + 1, y, kit.jersey);
    b.set(x + 2, y, kit.jerseyShade);
  }
  // The flag: a swallow-tailed pennant in two halves, jersey over trim.
  const rows = ['jjjjjjj', 'jjjjjj.', 'ttttt..', 'tttttt.', 'ttttttt'];
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === 'j') b.set(x + 2 + dx, 2 + dy, dx === 0 ? kit.jerseyShade : kit.jersey);
      else if (row[dx] === 't') b.set(x + 2 + dx, 2 + dy, dx === 0 ? kit.trimShade : kit.trim);
    }
  });
  b.outline(OUTLINE);
  return b;
}

export { HEIGHT as SEATED_H, WIDTH as SEATED_W, FOOT as SEATED_FOOT, CENTRE as SEATED_CENTRE };
