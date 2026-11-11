// Illustrative cast only. These overrides never enter career state or the ID-to-look map.
import { appearanceFor, type Appearance } from '../../art/prototype/player';
import type { ArtMoment } from './sequence';

const variants: Partial<Appearance>[] = [
  { head: 'curls', hair: 0xb3502b, skin: 0xf3c9a0, build: 'lean', beard: false },
  { head: 'headgear', hair: 0x252338, skin: 0x8a5636, build: 'stocky', beard: false },
  { head: 'ponytail', hair: 0x56416c, skin: 0xd59a68, build: 'athletic', beard: false },
  { head: 'flatTop', hair: 0x27212a, skin: 0xb97a4e, build: 'stocky', beard: false },
  { head: 'headband', hair: 0xd9b04c, skin: 0xf3c9a0, build: 'lean', beard: false },
  { head: 'bald', hair: 0x6c3824, skin: 0xd59a68, build: 'stocky', beard: true },
  { head: 'mullet', hair: 0x7b3a24, skin: 0xf3c9a0, build: 'athletic', beard: true },
  { head: 'braids', hair: 0x232233, skin: 0x8a5636, build: 'lean', beard: false },
  { head: 'buzz', hair: 0xa7a9b1, skin: 0xf3c9a0, build: 'athletic', beard: false },
];
export const RECOGNITION_CAST: readonly { id: string; look: Appearance }[] = variants.map((variant, i) => {
  const id = `art-recognition-${i}`;
  return { id, look: { ...appearanceFor(id), ...variant } };
});

/** Continuous ten-second loop, stable identities even when starting positions change. */
export function recognitionAt(seconds: number, arrangement = 0): ArtMoment {
  const angle = seconds / 10 * Math.PI * 2;
  return {
    beat: 'Follow your player', ball: null,
    actors: RECOGNITION_CAST.map(({ id }, i) => {
      const slot = ((i + arrangement * 4) % 9 + 9) % 9;
      const phase = i * .7;
      return {
        id, x: .18 + slot % 3 * .32 + .055 * (Math.sin(angle + phase) - Math.sin(phase)),
        y: .32 + Math.floor(slot / 3) * .235 + .025 * Math.sin(angle * 2 + phase),
        action: 'run', frame: (Math.floor(seconds * 10) + i) % 6,
        facing: Math.sin(angle + phase) > .65 ? 'back' : 'front',
        left: Math.cos(angle + phase) < 0, side: 'home', possession: false,
      };
    }),
  };
}
