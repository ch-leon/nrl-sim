// One fictional football manager: cap, grey hair, lined face and a plain polo.
// Hand-authored 16×16 pixels; no RNG, club identity or saved state.
import { fromGrid, type PixelBuffer } from './pixel';
import { encodeCanvas, type PortraitEncoder } from './portrait';

const FACE = [
  'xxxxxxxxxxxxxxxx',
  'xnnnnnnnnnnnnnnx',
  'xnnnnccccccnnnnx',
  'xnnnccccccccnnnx',
  'xnnccccccccccnnx',
  'xnnggssssggnnnnx',
  'xnngsdsdssgnnnnx',
  'xnnssessessnnnnx',
  'xnnsssssdssnnnnx',
  'xnnssddddssnnnnx',
  'xnnngssssgnnnnnx',
  'xnnnnssssnnnnnnx',
  'xnnpppttpppnnnnx',
  'xnppppttppppnnnx',
  'xpppppptppppppnx',
  'xxxxxxxxxxxxxxxx',
] as const;

export function buildCoachFace(): PixelBuffer {
  return fromGrid(FACE, { x: 0x0d0b14, n: 0x2b3150, c: 0x3e494e,
    g: 0xb6b8b2, s: 0xc39b79, d: 0x916a53, e: 0x24292c,
    p: 0x445e65, t: 0xaab6ae });
}

const cache = new Map<PortraitEncoder, string>();

/** Encode only once, as with player portraits. The encoder is injectable for node tests. */
export function coachFaceDataUrl(encode: PortraitEncoder = encodeCanvas): string {
  let url = cache.get(encode);
  if (url === undefined) {
    url = encode(buildCoachFace());
    cache.set(encode, url);
  }
  return url;
}
