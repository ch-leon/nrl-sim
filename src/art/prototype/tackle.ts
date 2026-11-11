// One shared pose clock and coordinate space for both players in a wrap tackle.
// The hands follow the carrier's chest throughout contact, drive and descent.
import { PixelBuffer, shade } from '../pixel';
import { OUTLINE, type Kit } from '../match/kit';
import { drawHead, type Facing } from './head';
import { ballPixels, CENTRE, FOOT, drawPrototypePlayer, type Appearance } from './player';

export const TACKLE_START = 5.5;
export const TACKLE_PTB = 8.3;
export const TACKLE_FPS = 20;
export const PAIR_W = 112;
export const PAIR_H = 56;
export const PAIR_X = 30;
export const PAIR_FOOT = 49;
export type Point = readonly [number, number];
export interface Body {
  hip: Point; shoulder: Point; head: Point;
  knee: Point; foot: Point; farKnee: Point; farFoot: Point;
}
interface Key { at: number; carrier: Body; defender: Body; grip: number }
export const body = (hip: Point, shoulder: Point, head: Point, knee: Point, foot: Point, farKnee: Point, farFoot: Point): Body => ({ hip, shoulder, head, knee, foot, farKnee, farFoot });
const KEYS: readonly Key[] = [
  { at: 5.5, grip: 0,
    carrier: body([28, 40], [29, 32], [22, 15], [31, 44], [33, 49], [23, 44], [22, 49]),
    defender: body([61, 40], [57, 33], [50, 16], [55, 44], [53, 49], [65, 44], [68, 49]) },
  { at: 5.7, grip: .3,
    carrier: body([28, 41], [28, 33], [21, 16], [32, 45], [34, 49], [24, 45], [23, 49]),
    defender: body([55, 41], [48, 36], [42, 19], [49, 45], [47, 49], [61, 45], [64, 49]) },
  { at: 5.95, grip: 1,
    carrier: body([28, 41], [27, 33], [20, 16], [31, 45], [34, 49], [24, 45], [23, 49]),
    defender: body([53, 42], [46, 36], [40, 19], [48, 46], [45, 49], [58, 45], [62, 49]) },
  { at: 6.25, grip: 1,
    carrier: body([28, 42], [26, 34], [19, 17], [32, 45], [35, 49], [24, 46], [22, 49]),
    defender: body([51, 42], [44, 37], [38, 20], [47, 46], [43, 49], [57, 46], [61, 49]) },
  { at: 6.5, grip: 1,
    carrier: body([29, 42], [25, 34], [18, 17], [34, 46], [36, 49], [24, 45], [25, 49]),
    defender: body([50, 42], [43, 37], [37, 20], [44, 45], [45, 49], [56, 46], [58, 49]) },
  { at: 6.7, grip: 1,
    carrier: body([29, 43], [23, 36], [15, 19], [35, 47], [38, 49], [26, 47], [25, 49]),
    defender: body([49, 43], [40, 38], [34, 21], [43, 47], [45, 49], [55, 47], [59, 49]) },
  { at: 6.95, grip: 1,
    carrier: body([29, 45], [19, 40], [8, 24], [37, 47], [43, 49], [28, 48], [33, 49]),
    defender: body([47, 44], [35, 41], [28, 24], [43, 49], [48, 49], [53, 47], [59, 49]) },
  { at: 7.15, grip: 1,
    carrier: body([29, 46], [17, 43], [4, 27], [38, 48], [44, 49], [31, 49], [37, 49]),
    defender: body([45, 45], [32, 43], [24, 26], [43, 49], [49, 49], [52, 48], [59, 49]) },
  { at: 7.55, grip: 1,
    carrier: body([29, 46], [17, 43], [4, 27], [38, 48], [44, 49], [31, 49], [37, 49]),
    defender: body([45, 45], [32, 43], [24, 26], [43, 49], [49, 49], [52, 48], [59, 49]) },
  { at: 7.85, grip: 0,
    carrier: body([29, 46], [21, 42], [10, 25], [35, 48], [39, 49], [29, 49], [35, 49]),
    defender: body([54, 44], [50, 36], [43, 19], [51, 47], [48, 49], [59, 46], [63, 49]) },
  { at: 8.3, grip: 0,
    carrier: body([30, 47], [32, 40], [25, 23], [33, 48], [36, 49], [26, 48], [25, 49]),
    defender: body([66, 40], [66, 32], [59, 15], [69, 44], [69, 49], [63, 44], [62, 49]) },
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const blend = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const add = (a: Point, dx: number, dy: number): Point => [a[0] + dx, a[1] + dy];
export const blendBody = (a: Body, b: Body, t: number): Body => ({
  hip: blend(a.hip, b.hip, t), shoulder: blend(a.shoulder, b.shoulder, t), head: blend(a.head, b.head, t),
  knee: blend(a.knee, b.knee, t), foot: blend(a.foot, b.foot, t), farKnee: blend(a.farKnee, b.farKnee, t), farFoot: blend(a.farFoot, b.farFoot, t),
});

/** Sample without integrating time: scrubbing, slow motion and replay use the same poses. */
export function tacklePoseAt(seconds: number): { carrier: Body; defender: Body; grip: number; hands: readonly Point[] } {
  const t = Math.max(TACKLE_START, Math.min(TACKLE_PTB, seconds));
  const i = Math.max(0, KEYS.findIndex(k => k.at >= t));
  const a = KEYS[Math.max(0, i - 1)]!; const b = KEYS[i]!;
  const fraction = b.at === a.at ? 0 : clamp((t - a.at) / (b.at - a.at));
  const carrier = blendBody(a.carrier, b.carrier, fraction);
  const defender = blendBody(a.defender, b.defender, fraction);
  const grip = a.grip + (b.grip - a.grip) * fraction;
  // Contacts sit either side of the carrier's chest. Released hands move with the defender.
  const hands = [blend(add(defender.shoulder, -6, 5), add(carrier.shoulder, -2, 3), grip),
    blend(add(defender.shoulder, 0, 8), add(carrier.shoulder, 3, 5), grip)];
  return { carrier, defender, grip, hands };
}

export function flip(buffer: PixelBuffer): PixelBuffer {
  const out = new PixelBuffer(buffer.w, buffer.h);
  for (let y = 0; y < buffer.h; y++) for (let x = 0; x < buffer.w; x++) {
    const p = buffer.get(x, y); if (p.alpha) out.set(buffer.w - 1 - x, y, p.color, p.alpha / 255);
  }
  return out;
}

/** Pair frames own limb layering; no independently sliding sprites at contact. */
export function drawTacklePair(home: Appearance, away: Appearance, homeKit: Kit, awayKit: Kit, frame: number, facing: Facing = 'front'): PixelBuffer {
  const t = TACKLE_START + Math.max(0, frame) / TACKLE_FPS;
  const out = new PixelBuffer(PAIR_W, PAIR_H);
  if (t >= TACKLE_PTB) {
    const f = Math.min(5, Math.floor((t - TACKLE_PTB) * 3.5));
    out.blit(flip(drawPrototypePlayer(away, awayKit, 'idle', 0, facing)), 66 - CENTRE, PAIR_FOOT - FOOT);
    out.blit(drawPrototypePlayer(home, homeKit, 'ptb', f, facing, true), PAIR_X - CENTRE, PAIR_FOOT - FOOT);
    return out;
  }
  const pose = tacklePoseAt(t);
  const { arm, legs, torso } = contactPainter(out);
  const c = pose.carrier; const d = pose.defender;
  legs(d, away, awayKit); torso(d, away, awayKit);
  // Far arm behind the carrier, near forearm over the carrier's jersey.
  arm(d.shoulder, blend(d.shoulder, pose.hands[0]!, .55), pose.hands[0]!, away, true);
  legs(c, home, homeKit); torso(c, home, homeKit);
  out.blit(drawHead(home, homeKit, facing), Math.round(c.head[0]), Math.round(c.head[1]));
  out.blit(flip(drawHead(away, awayKit, facing)), Math.round(d.head[0]), Math.round(d.head[1]));
  const ball = add(c.shoulder, 0, 3);
  out.blit(ballPixels(), Math.round(ball[0]), Math.round(ball[1]));
  arm(add(c.shoulder, 4, 1), add(c.shoulder, 6, 9), add(ball, 4, 4), home);
  arm(add(d.shoulder, 2, 2), add(blend(d.shoulder, pose.hands[1]!, .5), 0, 3), pose.hands[1]!, away);
  out.outline(OUTLINE);
  return out;
}

/** Shared pixel brushwork; each contact situation supplies its own body poses. */
export function contactPainter(out: PixelBuffer) {
  const limb = (a: Point, b: Point, c: Point, skin: number, thickness: number) => {
    for (let i = 0; i < thickness; i++) {
      out.line(a[0] + i, a[1], b[0] + i, b[1], skin);
      out.line(b[0] + i, b[1], c[0] + i, c[1], skin);
    }
  };
  const arm = (start: Point, elbow: Point, hand: Point, look: Appearance, dark = false) => {
    limb(start, elbow, hand, dark ? shade(look.skin, .7) : look.skin, look.build === 'stocky' ? 3 : 2);
    if (look.tape) out.fillRect(hand[0], hand[1], 2, 2, 0xf6edda);
  };
  const legs = (p: Body, look: Appearance, kit: Kit) => {
    const width = look.build === 'stocky' ? 4 : 3;
    limb(add(p.hip, -2, 0), p.farKnee, p.farFoot, shade(look.skin, .7), width);
    limb(add(p.hip, 2, 0), p.knee, p.foot, look.skin, width);
    for (const [foot, dark] of [[p.farFoot, true], [p.foot, false]] as const) {
      out.fillRect(foot[0], foot[1] - 3, width, 3, kit.sock);
      out.fillRect(foot[0], foot[1] - 2, width, 1, kit.trim);
      out.fillRect(foot[0] - 1, foot[1], width + 2, 2, dark ? shade(look.boots, .7) : look.boots);
    }
  };
  const torso = (p: Body, look: Appearance, kit: Kit) => {
    const width = look.build === 'stocky' ? 11 : look.build === 'athletic' ? 9 : 7;
    const dx = p.hip[0] - p.shoulder[0]; const dy = p.hip[1] - p.shoulder[1];
    const length = Math.max(1, Math.hypot(dx, dy));
    const side: Point = [dy / length * width / 2, -dx / length * width / 2];
    const corner = (p: Point, sign: number) => ({ x: p[0] + side[0] * sign, y: p[1] + side[1] * sign });
    const corners = [corner(p.shoulder, -1), corner(p.shoulder, 1), corner(p.hip, 1), corner(p.hip, -1)];
    out.fillPoly(corners, kit.jersey);
    out.line(corners[0]!.x, corners[0]!.y, corners[3]!.x, corners[3]!.y, kit.jerseyShade);
    out.line(corners[0]!.x, corners[0]!.y, corners[1]!.x, corners[1]!.y, kit.jerseyLight);
    const chest = blend(p.shoulder, p.hip, .45);
    if (kit.pattern === 'v') {
      out.line(chest[0] - side[0] * .8, chest[1] - side[1] * .8, chest[0], chest[1] + 2, kit.trim);
      out.line(chest[0], chest[1] + 2, chest[0] + side[0] * .8, chest[1] + side[1] * .8, kit.trim);
    } else if (kit.pattern === 'hoops') {
      for (const t of [.4, .55]) {
        const at = blend(p.shoulder, p.hip, t);
        out.line(at[0] - side[0], at[1] - side[1], at[0] + side[0], at[1] + side[1], kit.trim);
      }
    } else if (kit.pattern === 'stripes') {
      for (const t of [-.6, .2, .8]) out.line(p.shoulder[0] + side[0] * t, p.shoulder[1] + side[1] * t, p.hip[0] + side[0] * t, p.hip[1] + side[1] * t, kit.trim);
    } else if (kit.pattern === 'sleeves') {
      for (const t of [-1, .6]) out.fillRect(p.shoulder[0] + side[0] * t, p.shoulder[1] + side[1] * t, 3, 2, kit.trim);
    }
    const shorts = blend(p.shoulder, p.hip, .88);
    out.fillRect(shorts[0] - width / 2, shorts[1], width, 3, kit.shorts);
  };
  return { arm, legs, torso };
}
