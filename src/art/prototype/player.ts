// Approved match characters. Legacy LOOKS and its hash remain the identity authority.
// No atlas of every cosmetic combination: callers cache only the people on screen.
import { PixelBuffer, shade } from '../pixel';
import { LOOKS, lookForPlayer } from '../match/players';
import { hashString, OUTLINE, type Kit } from '../match/kit';
import { drawHead, type Head, type Facing } from './head';
export { HEAD_OPTIONS, type Head, type Facing } from './head';

export type Build = 'lean' | 'athletic' | 'stocky';
export type Action = 'idle' | 'run' | 'carry' | 'pass' | 'catch' | 'brace' | 'wrap' | 'ground' | 'ptb';
export interface Appearance {
  skin: number;
  hair: number;
  head: Head;
  beard: boolean;
  build: Build;
  tape: boolean;
  boots: number;
}
export const WIDTH = 44;
export const HEIGHT = 40;
export const FOOT = 35;
export const CENTRE = 19;

/** Existing faces keep their colours, hairstyle and beard; new details use a separate hash. */
export function appearanceFor(id: string): Appearance {
  const legacy = LOOKS[lookForPlayer(id)]!;
  const h = hashString(`${id}/body-v1`);
  return {
    skin: legacy.skin, hair: legacy.hair, head: legacy.style, beard: legacy.beard,
    build: (['lean', 'athletic', 'stocky'] as const)[h % 3]!,
    tape: (h >>> 4) % 2 === 0,
    boots: [0xe6be57, 0xf3eee0, 0xd66a50, 0x293449][(h >>> 6) % 4]!,
  };
}

/** A small rugby ball with a dark edge and white central panel. */
export function ballPixels(): PixelBuffer {
  const b = new PixelBuffer(9, 7);
  b.sprite(['...ooo...', '.owwwwwo.', 'owWwwwWwo', 'owWwwwWwo', '.owwwwwo.', '...ooo...'],
    { o: OUTLINE, w: 0xe7dfc7, W: 0xffffff });
  b.fillRect(3, 2, 3, 1, 0xa39475);
  return b;
}

const BALL = ballPixels();

/** Frames are sampled on a six-step cycle; directions are painted, never skewed. */
export function drawPrototypePlayer(a: Appearance, kit: Kit, action: Action, frame: number, facing: Facing = 'front', possession = false, strideFrame?: number): PixelBuffer {
  const b = new PixelBuffer(WIDTH, HEIGHT);
  const f = ((Math.floor(frame) % 6) + 6) % 6;
  const stocky = a.build === 'stocky';
  const bodyW = stocky ? 11 : a.build === 'athletic' ? 9 : 7;
  const thick = stocky ? 4 : 3;
  const skinDark = shade(a.skin, .7);
  const line = (x: number, y: number, ex: number, ey: number, color: number, width = thick) => {
    for (let i = 0; i < width; i++) b.line(x + i, y, ex + i, ey, color);
  };
  const heldBall = (x: number, y: number) => b.blit(BALL, x, y);

  if (action === 'ground') {
    // Authored side-on landing: bent knees, shoulder on turf, ball protected.
    line(8, 31, 12, 34, skinDark); line(7, 34, 3, 34, kit.sock);
    b.fillRect(2, 34, 5, 2, a.boots);
    b.fillRect(10, 29, 7, 5, kit.shorts);
    b.fillRect(16, 27, 10, stocky ? 7 : 6, kit.jersey);
    b.line(16, 27, 25, 27, kit.jerseyLight);
    b.fillRect(20, 28, 2, 5, kit.trim);
    b.blit(drawHead(a, kit, facing), 24, 18);
    line(17, 33, 10, 35, a.skin);
    b.fillRect(8, 35, 5, 1, a.boots);
    if (possession) heldBall(25, 32);
    line(23, 31, 29, 34, a.skin, 2);
    b.outline(OUTLINE);
    return b;
  }

  const running = strideFrame !== -1 && (action === 'run' || action === 'carry' || action === 'catch' || (action === 'pass' && strideFrame !== undefined));
  const gait = strideFrame === undefined || strideFrame < 0 ? f : strideFrame % 6;
  const stride = running ? [3, 1, -3, -3, -1, 3][gait]! : 0;
  const crouch = action === 'brace' || action === 'wrap' ? 3 : action === 'ptb' ? [6, 6, 3, 1, 0, 0][f]! : 0;
  const bob = running ? [0, 1, -1, 0, 1, -1][gait]! : 0;
  const lean = action === 'brace' || action === 'wrap' ? 3 : running ? 1 : action === 'ptb' ? 2 : 0;
  const hipY = 27 + crouch + bob;
  const shoulderY = 20 + crouch + bob;
  const left = CENTRE - Math.floor(bodyW / 2) + lean;

  // Far limbs first; subdued shading separates them in crowded contact.
  line(18, hipY, 18 - stride, 30 + bob, skinDark);
  line(18 - stride, 30 + bob, 18 - stride * 2, 34 - Math.abs(stride), kit.sock);
  b.fillRect(17 - stride * 2, 34 - Math.abs(stride), 5, 2, shade(a.boots, .7));
  line(left + 2, shoulderY + 1, left - 1, shoulderY + 6, skinDark);

  b.fillRect(left, shoulderY, bodyW, 7, kit.jersey);
  b.fillRect(left, shoulderY, 2, 6, kit.jerseyShade);
  b.fillRect(left + 2, shoulderY, bodyW - 3, 1, kit.jerseyLight);
  b.fillRect(left + bodyW - 2, shoulderY + 1, 2, 6, kit.jerseyShade);
  if (kit.pattern === 'v') {
    b.line(left + 1, shoulderY + 2, left + bodyW / 2, shoulderY + 5, kit.trim);
    b.line(left + bodyW / 2, shoulderY + 5, left + bodyW - 2, shoulderY + 2, kit.trim);
  } else if (kit.pattern === 'hoops') {
    b.fillRect(left, shoulderY + 3, bodyW, 2, kit.trim);
  } else if (kit.pattern === 'stripes') {
    for (let x = 2; x < bodyW; x += 3) b.fillRect(left + x, shoulderY + 1, 1, 7, kit.trim);
  }
  b.fillRect(left + 1, hipY, bodyW - 1, 3, kit.shorts);
  b.fillRect(left + 1, hipY + 2, bodyW - 1, 1, kit.shortsShade);
  const nearX = left + bodyW - 4;
  const heel = action === 'ptb' && f >= 4 ? -5 : stride;
  line(nearX, hipY + 2, nearX + heel, 31 + bob, a.skin);
  line(nearX + heel, 31 + bob, nearX + heel, 34, kit.sock);
  b.fillRect(nearX + heel, 31 + bob, thick, 1, kit.trim);
  b.fillRect(nearX + heel, 34, 5, 2, a.boots);

  b.fillRect(CENTRE + lean, shoulderY - 2, 3, 3, skinDark);
  b.fillRect(CENTRE + lean - 1, shoulderY, 5, 1, kit.trim);
  b.blit(drawHead(a, kit, facing), CENTRE - 7 + lean, shoulderY - 17);
  if (facing === 'back') {
    // Small number block visible from behind, omitted on the front chest.
    b.fillRect(left + 4, shoulderY + 2, 2, 4, kit.trim);
  }

  const shX = left + bodyW - 2;
  const shY = shoulderY + 2;
  let handX = shX + (running ? -stride : 1);
  let handY = shY + 6;
  if (action === 'carry' || action === 'brace' || (action === 'catch' && strideFrame !== undefined && f === 5)) {
    handX = shX + 2; handY = shY + 4;
    if (possession) heldBall(shX - 1, shY + 2);
    line(shX, shY, shX - 1, shY + 6, a.skin);
    line(shX - 1, shY + 6, handX + 2, handY + 1, a.skin, 2);
  } else if (strideFrame !== undefined && (action === 'catch' || (action === 'pass' && f < 5))) {
    const reach = action === 'catch' ? [7, 6, 4, 3, 2, 2][f]! : [5, 7, 6, 4, 2, 1][f]!;
    handX = shX + reach; handY = shY + (action === 'catch' ? [2, 2, 3, 4, 4, 4][f]! : [2, 1, 2, 4, 5, 6][f]!);
    line(shX - 3, shY + 1, handX - 2, handY + 2, skinDark, 2);
    if (possession) heldBall(handX - 3, handY - 2);
    line(shX, shY, shX + 2, shY + 4, a.skin, 2);
    line(shX + 2, shY + 4, handX, handY, a.skin, 2);
  } else if (strideFrame === undefined && (action === 'pass' || action === 'catch')) {
    const extended = action === 'catch' || f >= 3;
    handX = shX + (extended ? 7 : 1); handY = shY + 2;
    line(shX - 3, shY + 1, handX, handY + 2, skinDark, 2);
    if (possession) heldBall(handX - 2, handY - 1);
    line(shX, shY, handX, handY, a.skin, 2);
  } else if (action === 'wrap') {
    handX = shX + 7; handY = shY + 2;
    line(shX - 4, shY + 1, handX - 1, handY + 4, skinDark, 2);
    line(shX, shY, handX - 2, shY - 1, a.skin);
    line(handX - 2, shY - 1, handX, handY, a.skin, 2);
  } else {
    if (action === 'ptb') { handX = shX + 2; handY = shY + (f < 3 ? 7 : 5); }
    line(shX, shY, handX - 1, handY - 2, a.skin);
    line(handX - 1, handY - 2, handX, handY, a.skin, 2);
    if (action === 'ptb' && possession) heldBall(CENTRE + 2 - (f >= 4 ? 6 : 0), 30);
  }
  if (kit.pattern === 'sleeves') b.fillRect(shX, shY - 1, 3, 3, kit.trim);
  b.fillRect(shX, shY - 1, 3, 2, kit.pattern === 'sleeves' ? kit.trim : kit.jerseyShade);
  if (a.tape) b.fillRect(handX, handY - 1, 2, 2, 0xf6edda);
  b.outline(OUTLINE);
  return b;
}

