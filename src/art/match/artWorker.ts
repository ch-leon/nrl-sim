// src/art/match/artWorker.ts — a Web Worker that paints a fixture's match art off
// the main thread (N10.5, #154): receives the field offset and the two kits, posts
// back the FixtureArt with its pixel buffers transferred (not copied). A `warm`
// message paints the ground ahead (the same for every fixture), with no reply. It
// imports the pure match art only: no Phaser, no game state, no DOM.
import { fixtureArtBuffers, paintFixtureArt, type FixtureKits } from './fixtureArt';
import { warmGround } from './stadium';

type ArtRequest = { warm: number } | { offsetX: number; kits: FixtureKits };

self.onmessage = (e: MessageEvent<ArtRequest>): void => {
  if ('warm' in e.data) {
    warmGround(e.data.warm);
    return;
  }
  const art = paintFixtureArt(e.data.offsetX, e.data.kits);
  self.postMessage(art, { transfer: fixtureArtBuffers(art) });
};
