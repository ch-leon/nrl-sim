import { PixelBuffer, mix, shade } from '../pixel';
import { OUTLINE, type Kit } from '../match/kit';

export const HEAD_OPTIONS = ['short', 'buzz', 'mullet', 'headgear', 'headband', 'curls', 'braids', 'mohawk', 'bald', 'ponytail', 'flatTop'] as const;
export type Head = typeof HEAD_OPTIONS[number];
export type Facing = 'front' | 'back';
export interface HeadLook { skin: number; hair: number; head: Head; beard: boolean }

/** Large, original three-quarter heads: two eyes, visible cheek and recognisable hair outlines. */
export function drawHead(a: HeadLook, kit: Kit, facing: Facing): PixelBuffer {
  const b = new PixelBuffer(17, 18);
  const skinShade = shade(a.skin, .74);
  const skinLight = mix(a.skin, 0xffefd9, .17);
  const hairShade = shade(a.hair, .65);
  const hairLight = mix(a.hair, 0xf6dcc2, .3);
  const gear = mix(kit.trim, 0xb0cddd, .4);
  const polygon = (points: number[][], colour: number) => b.fillPoly(points.map(([x, y]) => ({ x: x!, y: y! })), colour);
  const face = [[5, 3], [12, 3], [15, 6], [15, 12], [12, 16], [5, 16], [2, 12], [2, 7]];
  polygon(face, skinShade);
  polygon([[6, 4], [12, 4], [14, 6], [14, 12], [11, 15], [6, 14], [4, 11], [4, 7]], a.skin);
  b.fillRect(6, 5, 6, 2, skinLight);
  b.fillRect(2, 9, 2, 3, a.skin); // Far ear.
  b.fillRect(14, 9, 2, 3, skinLight); // Near ear.

  // Rear hair volume keeps the same outer silhouette; the far eye never leaks through.
  if (facing === 'back' && !['bald', 'buzz', 'mohawk'].includes(a.head)) {
    polygon(face, a.head === 'headgear' ? gear : a.hair);
    b.fillRect(3, 8, 3, 5, a.head === 'headgear' ? shade(gear, .65) : hairShade);
    b.fillRect(6, 5, 4, 3, a.head === 'headgear' ? mix(gear, 0xffffff, .25) : hairLight);
    b.fillRect(14, 9, 2, 3, a.skin);
    b.fillRect(7, 15, 5, 1, skinShade);
  }

  // Hair has broad light/shade clusters and genuinely different outer shapes.
  if (a.head === 'short' || a.head === 'headband' || a.head === 'mullet' || a.head === 'ponytail' || a.head === 'braids') {
    polygon([[3, 3], [6, 1], [12, 1], [15, 4], [15, 7], [11, 6], [9, 7], [6, 6], [4, 10], [2, 9], [2, 5]], a.hair);
    b.line(4, 3, 10, 2, hairLight); b.fillRect(3, 4, 3, 2, hairLight);
    b.fillRect(2, 7, 2, 5, hairShade);
  }
  if (a.head === 'mullet') {
    polygon([[2, 7], [5, 8], [5, 16], [2, 17], [1, 13]], a.hair);
    b.fillRect(2, 10, 1, 5, hairLight); b.fillRect(4, 12, 1, 5, hairShade);
  }
  if (a.head === 'ponytail') {
    polygon([[2, 5], [4, 6], [3, 10], [3, 14], [1, 16], [0, 13], [0, 8]], a.hair);
    b.fillRect(1, 7, 2, 1, kit.trim); b.fillRect(0, 9, 1, 4, hairLight);
  }
  if (a.head === 'braids') {
    for (const x of [4, 7, 10, 13]) b.line(x, 2, x - 1, 6, hairShade);
    b.fillRect(1, 8, 2, 8, a.hair); b.fillRect(4, 11, 1, 6, hairShade);
    for (const y of [9, 12, 15]) b.set(1, y, hairLight);
    b.set(1, 16, kit.trim);
  }
  if (a.head === 'buzz') {
    polygon([[4, 4], [6, 2], [11, 2], [14, 4], [14, 6], [6, 5], [3, 7]], mix(a.hair, a.skin, .25));
    b.line(5, 3, 11, 3, hairLight); b.fillRect(3, 6, 1, 3, hairShade);
    if (facing === 'back') polygon([[3, 6], [14, 6], [14, 12], [11, 14], [5, 13]], mix(a.hair, a.skin, .35));
  }
  if (a.head === 'flatTop') {
    polygon([[3, 1], [13, 1], [14, 3], [14, 7], [5, 6], [4, 10], [2, 9], [2, 3]], a.hair);
    b.fillRect(3, 1, 9, 2, hairLight); b.fillRect(2, 6, 2, 6, hairShade);
  }
  if (a.head === 'curls') {
    polygon([[2, 2], [5, 2], [5, 0], [10, 0], [10, 1], [14, 1], [14, 3], [16, 3], [16, 7], [13, 8], [10, 6], [7, 8], [4, 7], [3, 12], [1, 11], [0, 6], [0, 3]], a.hair);
    for (const [x, y] of [[2, 3], [5, 1], [9, 2], [12, 3], [4, 5]]) b.fillRect(x!, y!, 2, 2, hairLight);
    b.fillRect(1, 7, 2, 4, hairShade);
  }
  if (a.head === 'mohawk') {
    polygon([[7, 0], [10, 0], [12, 3], [11, 7], [8, 6], [7, 3]], a.hair);
    b.fillRect(7, 1, 2, 3, hairLight);
    if (facing === 'back') b.fillRect(8, 5, 3, 10, a.hair);
  }
  if (a.head === 'headgear') {
    polygon([[4, 2], [12, 2], [15, 5], [15, 8], [12, 7], [5, 7], [4, 13], [2, 12], [1, 6]], gear);
    b.line(4, 3, 11, 3, mix(gear, 0xffffff, .5));
    b.fillRect(2, 7, 3, 6, shade(gear, .65));
    for (const x of [5, 8, 11]) b.fillRect(x, 4, 1, 2, OUTLINE);
    b.fillRect(3, 9, 1, 2, mix(gear, 0xffffff, .4));
    b.line(4, 13, 8, 16, shade(gear, .65)); b.line(8, 16, 12, 15, gear);
  }
  if (a.head === 'headband') {
    b.fillRect(2, 6, 13, 2, 0xf3e8d2);
    b.fillRect(2, 7, 13, 1, mix(kit.trim, 0xf3e8d2, .4));
    b.line(2, 8, 0, 11, 0xf3e8d2); b.line(2, 8, 2, 13, 0xf3e8d2);
  }

  if (facing === 'front') {
    b.fillRect(6, 9, 2, 3, OUTLINE); b.fillRect(11, 9, 2, 3, OUTLINE);
    b.set(6, 9, 0xfff4dc); b.set(11, 9, 0xfff4dc);
    b.set(10, 12, skinLight);
    if (a.beard) {
      polygon([[4, 12], [6, 13], [8, 14], [12, 13], [14, 12], [13, 15], [11, 17], [6, 16]], a.hair);
      b.fillRect(8, 14, 3, 1, a.skin); b.fillRect(7, 16, 4, 1, hairShade);
    }
    // A closed, two-pixel mouth: stronger than cheek shading, softer than the eyes.
    b.fillRect(8, 14, 2, 1, mix(a.skin, 0x4a252b, .65));
  }
  return b;
}
