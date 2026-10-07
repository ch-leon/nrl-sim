// src/art/grounds/palette.ts — shared colours for the club grounds art.
//
// One cohesive, bright Kairosoft-ish palette used by tiles, the manager,
// facilities and decor so everything on the grounds reads as one world.
// Club colours default to the player club's gold/navy (src/systems/fixtures.ts).

/** Soft near-black used for every sprite outline (warmer than pure black). */
export const OUTLINE = 0x2a1d2b;

export const GRASS = {
  dark: 0x4f9c35,
  mid: 0x5cad3b,
  light: 0x6bbd45,
  hi: 0x86d05a,
  seam: 0x3d8a2b,
} as const;

/** The rough grass surrounding the club (darker, cooler than the lawn). */
export const ROUGH = {
  dark: 0x2f6a35,
  mid: 0x377a3a,
  light: 0x3f8640,
  hi: 0x4c9646,
} as const;

export const DIRT = {
  dark: 0x8a5d34,
  mid: 0x9e6c3e,
  light: 0xb07d4a,
  hi: 0xc39463,
} as const;

export const STONE = {
  dark: 0x8e8578,
  mid: 0xb3a994,
  light: 0xcbc2ab,
  hi: 0xe0d8c2,
  mortar: 0x7a7266,
} as const;

export const CLUB = {
  gold: 0xf4c430,
  goldDark: 0xc9961c,
  navy: 0x24346b,
  navyDark: 0x18234a,
} as const;

export const WHITE = 0xf7f4ec;
export const GLASS = { dark: 0x3c6c96, mid: 0x5a92c2, hi: 0xa9d6f2 } as const;
export const WOOD = { dark: 0x6b4426, mid: 0x8c5a32, light: 0xad7745 } as const;
export const METAL = { dark: 0x6d7682, mid: 0x9aa4b0, light: 0xc7cfd8 } as const;
export const RED = { dark: 0xa8302c, mid: 0xd9483b, light: 0xf06f5c } as const;
export const LEAF = { dark: 0x2c6b2f, mid: 0x3f8f3a, light: 0x5aae46, hi: 0x7cc95a } as const;
