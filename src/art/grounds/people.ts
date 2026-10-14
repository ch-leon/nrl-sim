// src/art/grounds/people.ts — squad players, staff and fans for the grounds (#23).
//
// Every person is the manager's walk cycle (src/art/grounds/manager.ts) with a
// palette swap: skin/hair from the player's match look (LOOKS / lookForPlayer in
// art/match/players.ts) and shirt/trim/shorts from the club kit, so a player is
// recognisable on the grounds and in a match. One strip atlas per person look
// (4 dirs × idle + 4 walk frames), plus a few tiny props and emotes.
// Pure and Phaser-free — the scene uploads the buffers.
import { PixelBuffer, mix, shade } from '../pixel';
import type { Kit } from '../match/kit';
import { LOOKS, lookForPlayer } from '../match/players';
import { CHAR_DIRS, CHAR_FOOT_Y, CHAR_H, CHAR_W, CHAR_WALK_FRAMES, MANAGER_COLORS as M, charFrame, type CharDir } from './manager';

export type PersonKind = 'player' | 'coach' | 'physio' | 'groundskeeper' | 'fan';

export interface PersonLook {
  skin: number;
  hair: number;
  shirt: number;
  shirtShade: number;
  trim: number;
  legs: number;
  legsShade: number;
}

/** Frames per direction in a person atlas: idle + the walk cycle. */
export const PERSON_FRAMES_PER_DIR = 1 + CHAR_WALK_FRAMES;

const STAFF = {
  coach: { shirt: 0x2f6f9f, trim: 0xf7f4ec, legs: 0x2b3249 },
  physio: { shirt: 0xf2f2ee, trim: 0x2aa198, legs: 0x3b6e8f },
  groundskeeper: { shirt: 0xe8742a, trim: 0xf4d03f, legs: 0x8a7a52 },
} as const;

/** Look for one person. `key` is the player id (or name) / a stable fan or staff key. */
export function personLook(kind: PersonKind, key: string, kit: Kit): PersonLook {
  const base = LOOKS[lookForPlayer(key)] ?? LOOKS[0]!;
  if (kind === 'player') {
    return {
      skin: base.skin,
      hair: base.hair,
      shirt: kit.jersey,
      shirtShade: kit.jerseyShade,
      trim: kit.trim,
      legs: kit.shorts,
      legsShade: kit.shortsShade,
    };
  }
  if (kind === 'fan') {
    // Supporters wear the club colours, some the trim colour as the main shirt.
    const trimShirt = lookForPlayer(`${key}/shirt`) % 3 === 0;
    const shirt = trimShirt ? kit.trim : kit.jersey;
    return {
      skin: base.skin,
      hair: base.hair,
      shirt,
      shirtShade: trimShirt ? kit.trimShade : kit.jerseyShade,
      trim: trimShirt ? kit.jersey : kit.trim,
      legs: 0x3f5f8a,
      legsShade: shade(0x3f5f8a, 0.72),
    };
  }
  const s = STAFF[kind];
  return {
    skin: base.skin,
    hair: base.hair,
    shirt: s.shirt,
    shirtShade: shade(s.shirt, 0.78),
    trim: s.trim,
    legs: s.legs,
    legsShade: shade(s.legs, 0.72),
  };
}

/** Stable texture key for a look — equal looks share one atlas. */
export function personKey(look: PersonLook): string {
  const h = (n: number) => n.toString(16);
  return `life-${h(look.skin)}-${h(look.hair)}-${h(look.shirt)}-${h(look.trim)}-${h(look.legs)}`;
}

function swapMap(look: PersonLook): Map<number, number> {
  return new Map<number, number>([
    [M.hairDark, shade(look.hair, 0.7)],
    [M.hairMid, look.hair],
    [M.hairLight, mix(look.hair, 0xffffff, 0.22)],
    [M.skin, look.skin],
    [M.skinShade, shade(look.skin, 0.86)],
    [M.shirt, look.shirt],
    [M.shirtShade, look.shirtShade],
    [M.trim, look.trim],
    [M.trousers, look.legs],
    [M.trousersShade, look.legsShade],
  ]);
}

/** Recolour every opaque pixel of `src` through `map` (alpha preserved). */
function swapColors(src: PixelBuffer, map: Map<number, number>): PixelBuffer {
  const out = new PixelBuffer(src.w, src.h);
  out.data.set(src.data);
  for (let i = 0; i < out.data.length; i += 4) {
    if ((out.data[i + 3] ?? 0) === 0) continue;
    const c = ((out.data[i] ?? 0) << 16) | ((out.data[i + 1] ?? 0) << 8) | (out.data[i + 2] ?? 0);
    const to = map.get(c);
    if (to === undefined) continue;
    out.data[i] = (to >> 16) & 0xff;
    out.data[i + 1] = (to >> 8) & 0xff;
    out.data[i + 2] = to & 0xff;
  }
  return out;
}

/** Atlas frame name: `<dir>i` (idle) or `<dir><0..3>` (walk). */
export function personFrameName(dir: CharDir, frame: number | null): string {
  return `${dir}${frame === null ? 'i' : frame}`;
}

/** Left edge of a frame in the strip atlas. */
export function personFrameX(dir: CharDir, frame: number | null): number {
  const d = CHAR_DIRS.indexOf(dir);
  return (d * PERSON_FRAMES_PER_DIR + (frame === null ? 0 : 1 + frame)) * CHAR_W;
}

/** One person's strip atlas (CHAR_W × CHAR_H cells) — the manager's frames, recoloured. */
export function personAtlas(look: PersonLook): PixelBuffer {
  const map = swapMap(look);
  const atlas = new PixelBuffer(CHAR_W * CHAR_DIRS.length * PERSON_FRAMES_PER_DIR, CHAR_H);
  for (const dir of CHAR_DIRS) {
    const frames: (number | null)[] = [null];
    for (let f = 0; f < CHAR_WALK_FRAMES; f++) frames.push(f);
    for (const f of frames) {
      const src = swapColors(charFrame(dir, f), map);
      const ox = personFrameX(dir, f);
      for (let y = 0; y < CHAR_H; y++) {
        for (let x = 0; x < CHAR_W; x++) {
          const px = src.get(x, y);
          if (px.alpha > 0) atlas.set(ox + x, y, px.color, px.alpha / 255);
        }
      }
    }
  }
  return atlas;
}

// ── Props and emotes ────────────────────────────────────────────────────────

const OUTLINE = 0x1c1424;

function barbell(): PixelBuffer {
  const b = new PixelBuffer(16, 7);
  b.fillRect(1, 3, 14, 1, 0x9aa0aa); // bar
  b.fillRect(0, 1, 2, 5, 0x3a3f4d); // plates
  b.fillRect(14, 1, 2, 5, 0x3a3f4d);
  b.fillRect(2, 2, 1, 3, 0x59606e);
  b.fillRect(13, 2, 1, 3, 0x59606e);
  return b;
}

function bed(): PixelBuffer {
  const b = new PixelBuffer(24, 12);
  b.fillRect(2, 3, 20, 6, 0xdfe8ee);
  b.fillRect(2, 8, 20, 2, 0x8fa4b4);
  b.fillRect(2, 3, 5, 5, 0x6fb7c9); // pillow end
  b.outline(OUTLINE);
  return b;
}

function cloud(): PixelBuffer {
  const b = new PixelBuffer(11, 9);
  b.fillRect(2, 1, 6, 4, 0xb9c3d4);
  b.fillRect(0, 2, 11, 3, 0xb9c3d4);
  b.fillRect(1, 1, 3, 1, 0xdfe6f0);
  b.fillRect(2, 5, 1, 2, 0x4b8fe0); // rain drops
  b.fillRect(5, 6, 1, 2, 0x4b8fe0);
  b.fillRect(8, 5, 1, 2, 0x4b8fe0);
  b.outline(OUTLINE);
  return b;
}

function cross(): PixelBuffer {
  const b = new PixelBuffer(9, 9);
  b.fillRect(3, 1, 3, 7, 0xe4453b);
  b.fillRect(1, 3, 7, 3, 0xe4453b);
  b.outline(0xf7f4ec);
  return b;
}

/** Texture keys for the props/emotes drawn beside people. */
export const LIFE_PROPS = {
  barbell: 'life-barbell',
  bed: 'life-bed',
  cloud: 'life-emote-cloud',
  cross: 'life-emote-cross',
} as const;

export function lifePropTextures(): { key: string; buf: PixelBuffer }[] {
  return [
    { key: LIFE_PROPS.barbell, buf: barbell() },
    { key: LIFE_PROPS.bed, buf: bed() },
    { key: LIFE_PROPS.cloud, buf: cloud() },
    { key: LIFE_PROPS.cross, buf: cross() },
  ];
}

export { CHAR_FOOT_Y, CHAR_H, CHAR_W };
