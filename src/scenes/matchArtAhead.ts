// src/scenes/matchArtAhead.ts — the next fixture's match art, painted ahead (N10.5,
// #154). After each week (and when a game starts or loads) the player's next
// fixture is looked up and its stadium, crowd and kit atlases are painted in the
// art worker (src/art/match/artWorker.ts), so the hand-off to the match scene only
// uploads them. One painting is kept, keyed by the kit design: a kit change, or a
// different opponent, paints again. Node and the tests have no Worker and paint in
// place; a worker that fails or stays silent is dropped and the art painted here.
import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import { advanceInProgress } from '../core/advance';
import { DEFAULT_PLAYER_COLORS } from '../config';
import { PLAYER_ID } from '../systems/fixtures';
import { nextFixture } from '../systems/league';
import { resolveKits } from '../art/match/kit';
import { fixtureArtKey, paintFixtureArt, reviveFixtureArt, type FixtureArt, type FixtureKits } from '../art/match/fixtureArt';
import { fieldOffsetX } from './matchField';

/** How long the art worker gets before the art is painted here instead (ms). */
const ART_WORKER_TIMEOUT_MS = 20_000;

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

function canPaintElsewhere(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined';
}

function paintElsewhere(offsetX: number, kits: FixtureKits): Promise<FixtureArt> {
  if (!canPaintElsewhere()) return Promise.resolve(paintFixtureArt(offsetX, kits));
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = worker ??= new Worker(new URL('../art/match/artWorker.ts', import.meta.url), { type: 'module', name: 'match-art' });
    } catch {
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
    ready = art;
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

/**
 * Paint the next fixture's art whenever it may have changed: after a week, and on any
 * state change (a new game, a load, a kit designed). Never during a multi-week run:
 * the worker would paint fixtures nobody watches; it looks again when the run ends.
 */
export function initMatchArtAhead(): () => void {
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
  soon();
  return () => offs.forEach((off) => off());
}

/** Forget the painting and the worker (tests). */
export function clearFixtureArt(): void {
  worker?.terminate();
  worker = null;
  ready = null;
  pending = null;
  tail = Promise.resolve();
}
