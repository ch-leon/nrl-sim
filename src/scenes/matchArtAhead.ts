// src/scenes/matchArtAhead.ts — the next fixture's match art, painted ahead (N10.5,
// #154). After each week (and when a game starts or loads) the player's next
// fixture is looked up and its stadium, crowd and kit atlases are painted in the
// art worker (src/art/match/artWorker.ts), then uploaded as textures one per idle
// slice while the club screens are up, so the hand-off to the match scene finds
// them ready. One painting is kept, keyed by the kit design: a kit change, or a
// different opponent, paints again (and frees the old one's textures). Node and the
// tests have no Worker and paint in place; a worker that fails or stays silent is
// dropped and the art painted here.
import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import { advanceInProgress } from '../core/advance';
import { DEFAULT_PLAYER_COLORS } from '../config';
import { PLAYER_ID } from '../systems/fixtures';
import { nextFixture } from '../systems/league';
import { resolveKits } from '../art/match/kit';
import { PixelBuffer, toTexture, type TextureHost } from '../art/pixel';
import type { IdleSlice } from '../art/grounds';
import { fixtureArtKey, fixtureArtPieces, paintFixtureArt, reviveFixtureArt, type FixtureArt, type FixtureKits } from '../art/match/fixtureArt';
import { fieldOffsetX } from './matchField';

/** How long the art worker gets before the art is painted here instead (ms). */
const ART_WORKER_TIMEOUT_MS = 20_000;
/**
 * The longest an upload waits for an idle slice (ms). A throttled phone drawing the
 * grounds at 17 fps is never idle, so without it nothing would go up before the match.
 */
const UPLOAD_IDLE_TIMEOUT_MS = 100;

/** The next idle slice, or the timeout's end; a timer where there are no idle callbacks (Safari). */
function whenIdleSoon(fn: (slice?: IdleSlice) => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback((deadline) => fn(deadline), { timeout: UPLOAD_IDLE_TIMEOUT_MS });
  else setTimeout(() => fn(), 250);
}

/** A side as the kits see it: the club and its two colours. */
export interface KitSide {
  clubId: string;
  colors: readonly [string, string];
}

/** The kits a fixture is played in (resolveKits picks the away side's clash strip). */
export function fixtureKits(home: KitSide, away: KitSide): FixtureKits {
  const k = resolveKits({ clubId: home.clubId, colors: [home.colors[0], home.colors[1]] }, { clubId: away.clubId, colors: [away.colors[0], away.colors[1]] });
  return { home: k.home, away: k.away };
}

/** The art painted ahead, waiting for its match. */
let ready: FixtureArt | null = null;
/** The painting under way, if any. */
let pending: { key: string; promise: Promise<FixtureArt> } | null = null;
/** Paintings run one after another (the worker answers one request at a time). */
let tail: Promise<unknown> = Promise.resolve();
let worker: Worker | null = null;
/** Uploads a painting's textures ahead, once one is in (set by initMatchArtAhead). */
let uploadAhead: ((art: FixtureArt) => void) | null = null;
/** Frees a painting's textures uploaded ahead that no match took. */
let dropUploads: ((art: FixtureArt) => void) | null = null;

function canPaintElsewhere(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined';
}

/** The art worker, started on first use; null where there is none or it can't start. */
function artWorker(): Worker | null {
  if (!canPaintElsewhere()) return null;
  try {
    return (worker ??= new Worker(new URL('../art/match/artWorker.ts', import.meta.url), { type: 'module', name: 'match-art' }));
  } catch {
    return null;
  }
}

/** The worker that has been asked to paint the ground. */
let warmed: Worker | null = null;

/**
 * Have the art worker paint the ground now (main.ts calls it before the title screen):
 * the same for every fixture and about 90% of the background's cost, so the first
 * match's art is ready seconds sooner. Once per worker; a no-op without one.
 */
export function warmMatchArt(): void {
  const w = artWorker();
  if (!w || warmed === w) return;
  try {
    w.postMessage({ warm: fieldOffsetX() });
    warmed = w;
  } catch {
    /* painted with the first fixture instead */
  }
}

function paintElsewhere(offsetX: number, kits: FixtureKits): Promise<FixtureArt> {
  return new Promise((resolve) => {
    const w = artWorker();
    if (!w) {
      resolve(paintFixtureArt(offsetX, kits));
      return;
    }
    const done = (art: FixtureArt): void => {
      clearTimeout(timer);
      w.onmessage = null;
      w.onerror = null;
      resolve(art);
    };
    const fail = (): void => {
      if (worker === w) worker = null;
      w.terminate();
      done(paintFixtureArt(offsetX, kits));
    };
    const timer = setTimeout(fail, ART_WORKER_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<FixtureArt>) => done(reviveFixtureArt(e.data));
    w.onerror = fail;
    try {
      w.postMessage({ offsetX, kits });
    } catch {
      fail();
    }
  });
}

/** The art for these kits: the one painted ahead, the one being painted, or a new painting. */
export function fixtureArtFor(offsetX: number, kits: FixtureKits): Promise<FixtureArt> {
  const key = fixtureArtKey(offsetX, kits);
  if (ready?.key === key) return Promise.resolve(ready);
  if (pending?.key === key) return pending.promise;
  const promise = tail.then(() => paintElsewhere(offsetX, kits)).then((art) => {
    if (pending?.promise === promise) pending = null;
    if (ready && ready !== art) dropUploads?.(ready);
    ready = art;
    uploadAhead?.(art);
    return art;
  });
  tail = promise.catch(() => undefined);
  pending = { key, promise };
  return promise;
}

/** The art for a key if it is painted; it leaves the cache (the scene's textures hold it now). */
export function takeFixtureArt(key: string): FixtureArt | null {
  if (ready?.key !== key) return null;
  const art = ready;
  ready = null;
  return art;
}

/** The player's next fixture as two kit sides, or null when there is none. */
export function nextFixtureSides(state: GameState): [KitSide, KitSide] | null {
  const f = nextFixture(state.league.fixtures, state.week, PLAYER_ID);
  if (!f) return null;
  const side = (id: string): KitSide | null => {
    const club = state.league.clubs.find((c) => c.id === id);
    if (club) return { clubId: id, colors: club.colors };
    return id === PLAYER_ID ? { clubId: id, colors: DEFAULT_PLAYER_COLORS } : null;
  };
  const home = side(f.homeId);
  const away = side(f.awayId);
  return home && away ? [home, away] : null;
}

/** What initMatchArtAhead needs from the game: its textures, and whether a match is on. */
export interface ArtAheadHost {
  /** The game's texture manager, once the game is up. */
  textures: () => TextureHost['textures'] | null;
  /** True while the match scene runs: nothing is uploaded under a live match. */
  busy: () => boolean;
  /** When to run the next upload (an idle slice; tests run it at once). */
  schedule?: (fn: (slice?: IdleSlice) => void) => void;
}

/** A piece's pixels once its texture is up (the 13 MB of the background no longer held twice). */
const UPLOADED = new PixelBuffer(1, 1);
let uploadSerial = 0;

/**
 * Paint the next fixture's art whenever it may have changed: after a week, and on any
 * state change (a new game, a load, a kit designed). Never during a multi-week run:
 * the worker would paint fixtures nobody watches; it looks again when the run ends.
 * Once painted, its textures go up one per idle slice, never under a live match.
 */
export function initMatchArtAhead(host: ArtAheadHost): () => void {
  const schedule = host.schedule ?? whenIdleSoon;
  uploadAhead = (art) => {
    const serial = ++uploadSerial;
    const todo = fixtureArtPieces(art).filter((p) => !p.texKey);
    let n = 0;
    const step = (): void => {
      if (ready !== art) return; // taken by its match, or another fixture painted since
      const textures = host.textures();
      if (!textures || host.busy()) {
        schedule(step);
        return;
      }
      const piece = todo.shift();
      if (!piece) return;
      const key = `ahead-${serial}-${n++}`;
      toTexture({ textures }, key, piece.buf);
      piece.texKey = key;
      piece.buf = UPLOADED;
      if (todo.length) schedule(step);
    };
    schedule(step);
  };
  dropUploads = (art) => {
    const textures = host.textures();
    for (const p of fixtureArtPieces(art)) if (p.texKey && textures?.exists(p.texKey)) textures.remove(p.texKey);
  };
  let queued = false;
  const look = (): void => {
    if (advanceInProgress()) {
      setTimeout(look, 1000);
      return;
    }
    queued = false;
    const sides = nextFixtureSides(getState());
    if (sides) void fixtureArtFor(fieldOffsetX(), fixtureKits(sides[0], sides[1]));
  };
  const soon = (): void => {
    if (queued) return;
    queued = true;
    setTimeout(look, 0);
  };
  const offs = [bus.on('week:advanced', soon), bus.on('state:changed', soon)];
  warmMatchArt();
  soon();
  return () => {
    offs.forEach((off) => off());
    uploadAhead = null;
    dropUploads = null;
  };
}

/** Forget the painting and the worker (tests). */
export function clearFixtureArt(): void {
  worker?.terminate();
  worker = null;
  warmed = null;
  if (ready) dropUploads?.(ready);
  ready = null;
  pending = null;
  tail = Promise.resolve();
}
