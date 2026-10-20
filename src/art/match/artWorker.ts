// src/art/match/artWorker.ts — a Web Worker that paints a fixture's match art off
// the main thread (N10.5, #154): receives the field offset and the two kits, posts
// back the FixtureArt with its pixel buffers transferred (not copied). It imports
// the pure match art only: no Phaser, no game state, no DOM.
import { fixtureArtBuffers, paintFixtureArt, type FixtureKits } from './fixtureArt';

self.onmessage = (e: MessageEvent<{ offsetX: number; kits: FixtureKits }>): void => {
  const art = paintFixtureArt(e.data.offsetX, e.data.kits);
  self.postMessage(art, { transfer: fixtureArtBuffers(art) });
};
