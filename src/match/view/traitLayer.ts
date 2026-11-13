// src/match/view/traitLayer.ts — traits you can see (N15.4, #654, BAK-208 §3).
// Each move is drawn when the sim's event names the trait that fired: a fend's
// straight arm, a step's cut, a Playmaker's line through the man he skips, a
// Wrecking Ball's drive, a Hitman's shock, the Offload King's ball out the back,
// a Razzle Dazzle flourish, a Pickpocket's or Poacher's pluck, a Gambler's die,
// a Hothead's temper. Three read the roster as well as the event, because the
// sim only shifts odds for them and names no one: Brick Wall (a two-man tackle),
// Last Line (the last man's tackle on a break) and Workhorse (his third tackle
// in a set, counted here from the tackle events). Jets is the sprint streak
// (sprintLayer.ts), and Big Boot the kick's own trail (kickLayer.ts). A second
// or less, then gone. Pure over the events, the snapshot and the sheets: no
// dice, nothing the sim reads.
import type Phaser from 'phaser';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import type { TeamSheet } from '../../sim/events';
import type { TraitId } from '../../data/traits';
import { toFieldPt } from '../core/field';
import { impactTier, type ImpactTier } from './impact';
import { popupFor } from './popups';

/** How long a move stays up, real ms. A second or less at ×1 and ×2. */
export const TRAIT_MOVE_MS = 1000;
/** From this playback speed the move is held longer, and the match eases, so ×8 does not run past it. */
export const TRAIT_FAST_FROM = 4;
/** Real-time multiplier on TRAIT_MOVE_MS while the playback is at TRAIT_FAST_FROM or faster. */
export const TRAIT_FAST_HOLD = 2;
/** A short ease when a move fires at that speed: real ms, and the time factor. */
export const TRAIT_SLOW_MS = 420;
export const TRAIT_SLOW_FACTOR = 0.4;

/** How many real seconds a move lasts at this playback speed. ×4 and ×8 hold it twice as long. */
export function moveHold(speed: number): number {
  return speed >= TRAIT_FAST_FROM ? TRAIT_FAST_HOLD : 1;
}
/** The last part of that is the fade. */
const FADE_MS = 280;
/** A teammate this close to the pass line, between the passer and the man he finds, is the one skipped. */
export const CUT_NEAR_M = 2.5;
/**
 * Keep this much of the pass clear of either end, in metres. A fraction of the
 * pass length dropped the man beside the passer on a long cut-out (he sits in
 * the first 12% of a 20 m ball) and circled someone further down the line.
 */
export const CUT_END_M = 0.4;
/** The arm, the cut and the shock, in the trait colour (popups.ts TRAIT_COLOR). */
const MOVE_COLOR = 0xd9a5ff;
const DUST_COLOR = 0xd9c9a3;

export type MoveKind =
  | 'fend' | 'step' | 'cut-out' | 'drive' | 'hit'
  | 'offload' | 'razz' | 'pluck' | 'gamble' | 'temper' | 'wall' | 'last-line' | 'workhorse';

/** The moves an event's own trait name draws (traitMoveFor). */
export type NamedMove = 'fend' | 'step' | 'cut-out' | 'drive' | 'hit';

/** The offload's receiver is the nearest teammate this close (metres): the sim's own reach is LIVE.offloadM + 2. */
export const OFFLOAD_REACH_M = 9;
/** A last-man tackle counts as saving a break when the runner has beaten this many of the defence. */
export const LAST_LINE_BEATEN = 4;
/** A man this far (metres) behind the tackler stands deeper than him; at most LAST_MEN_BEHIND of them and he is the last line (the fullback, or the winger covering him). */
export const LAST_MAN_M = 1;
export const LAST_MEN_BEHIND = 1;
/** His third tackle in a set draws the Workhorse marker. */
export const WORKHORSE_TACKLES = 3;

export interface TraitMove {
  kind: MoveKind;
  side: Side;
  slot: number;
  /** Where he stood when it fired, field metres. */
  x: number;
  y: number;
  /** Which way he faces along the field (+1 towards the right-hand dead-ball line). */
  headX: number;
  /** A cut-out: the man he found. */
  to?: { x: number; y: number; slot: number };
  /** A cut-out: the teammate the line passes through, when one stands on it. */
  through?: { x: number; y: number; slot: number };
  /** The other man in it, on the other side: the tackled carrier (a strip, a Last Line tackle, a Brick Wall's contact), the passer a Poacher picked off, the Brick Wall man. */
  other?: { x: number; y: number; side: Side; slot: number };
  /** A Gambler's read: true when it came off (the intercept), false when he missed. */
  ok?: boolean;
  /** The impact beat this moment earns that its own event does not already get (impact.ts). */
  tier?: ImpactTier;
}

// ── Who has what ────────────────────────────────────────────────────────────

/**
 * The traits on the two sheets, by the name the snapshot gives a man (`who`:
 * the squad id, or his name): the view's own lookup, since the snapshot does
 * not carry traits. A substitute is found too, from the bench.
 */
export class TraitRoster {
  private readonly by = new Map<string, ReadonlySet<TraitId>>();

  constructor(sheets: Readonly<Record<Side, Pick<TeamSheet, 'roster' | 'bench'>>>) {
    for (const side of ['home', 'away'] as const) {
      for (const r of [...(sheets[side].roster ?? []), ...(sheets[side].bench ?? [])]) {
        if (r.traits?.length) this.by.set(`${side}|${r.id ?? r.name}`, new Set(r.traits.map((t) => t.id)));
      }
    }
  }

  has(side: Side, who: string | undefined, id: TraitId): boolean {
    return who !== undefined && (this.by.get(`${side}|${who}`)?.has(id) ?? false);
  }
}

const sameMan = (p: { side: Side; slot: number }, side: Side, slot: number): boolean => p.side === side && p.slot === slot;
const whoIs = (snap: Snapshot, side: Side, slot: number): string | undefined => snap.players.find((p) => sameMan(p, side, slot))?.who;

/** Possession changes hands or play stops: a new set follows (a Workhorse's count starts again). */
const SET_ENDS: ReadonlySet<string> = new Set([
  'set-start', 'regather', 'handover', 'intercept', 'strip', 'penalty', 'six-again', 'try', 'kickoff', 'half-time', 'full-time', 'golden-point',
  'dead-ball', 'touch', 'on-full', 'drop-out', 'error', 'drop', 'conversion', 'field-goal', 'penalty-goal', '40-20', 'charge-down',
]);
/** The events whose `slot` is the tackler. */
const TACKLES: ReadonlySet<string> = new Set(['tackle', 'big-hit']);

/**
 * A Workhorse's tackles this set, from the tackle events. Keyed by tick, so an
 * event heard twice (a replay, a resume) counts once, and a replayed tick counts
 * only the tackles up to it. Only tackles by a man who has the trait are kept.
 */
export class TackleTally {
  private readonly ends = new Set<number>();
  private readonly tackles = new Map<string, { tick: number; key: string }>();

  /** Hear an event. `has` says whether the tackler is a Workhorse. */
  hear(e: SimEvent, tacklerKey: string | null): void {
    if (SET_ENDS.has(e.kind)) this.ends.add(e.tick);
    if (tacklerKey !== null && TACKLES.has(e.kind)) this.tackles.set(`${e.tick}|${tacklerKey}`, { tick: e.tick, key: tacklerKey });
  }

  /** How many he has made in the set the tick `tick` belongs to, that one included. */
  count(key: string, tick: number): number {
    let since = -1;
    for (const t of this.ends) if (t < tick && t > since) since = t;
    let n = 0;
    for (const t of this.tackles.values()) if (t.key === key && t.tick > since && t.tick <= tick) n++;
    return n;
  }

  clear(): void {
    this.ends.clear();
    this.tackles.clear();
  }
}

/**
 * Which announced name may draw the move. Finisher shares the step, the fend
 * and the drive. A Hothead's big hit is his temper, not a Hitman's shock, and
 * draws nothing here.
 */
const MOVE_TRAITS: Readonly<Record<NamedMove, readonly string[]>> = {
  fend: ["Don't Argue", 'Finisher'],
  step: ['Dancing Feet', 'Finisher'],
  'cut-out': ['Playmaker'],
  drive: ['Wrecking Ball', 'Finisher'],
  hit: ['Hitman'],
};

/** The event's trait line ("Hitman II") is one of the names that own this move. */
export function traitOwnsMove(kind: NamedMove, trait: string): boolean {
  return MOVE_TRAITS[kind].some((name) => trait === name || trait.startsWith(`${name} `));
}

const KIND_OF: Readonly<Record<string, NamedMove>> = {
  fend: 'fend',
  step: 'step',
  'cut-out': 'cut-out',
  // A bust, at contact or out of the wrestle, and the drive the pop-up calls DRIVE!.
  'break-tackle': 'drive',
  tackle: 'drive',
  'big-hit': 'hit',
};

/** 1 until the fade, then down to 0 at TRAIT_MOVE_MS. Nothing before it starts or after it ends. */
export function moveAlpha(ageMs: number): number {
  if (ageMs < 0 || ageMs >= TRAIT_MOVE_MS) return 0;
  if (ageMs <= TRAIT_MOVE_MS - FADE_MS) return 1;
  return (TRAIT_MOVE_MS - ageMs) / FADE_MS;
}

/**
 * The man a cut-out skips: the teammate nearest the passer who still stands
 * on the line to the man he found, within CUT_NEAR_M of it and clear of both
 * ends. The nearest point on the line would rather circle a trailer in a
 * crowded shift than the man beside the ball. Null when the pass is too short
 * to skip anyone, or nobody stands on it.
 */
export function manOnTheLine<T extends { x: number; y: number }>(
  from: { x: number; y: number },
  to: { x: number; y: number },
  others: readonly T[],
): T | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const len = Math.sqrt(len2);
  if (len < 1) return null;
  let best: T | null = null;
  let bestAlong = Infinity;
  for (const p of others) {
    const along = ((p.x - from.x) * dx + (p.y - from.y) * dy) / len;
    if (along <= CUT_END_M || along >= len - CUT_END_M) continue;
    const u = along / len;
    const off = Math.hypot(p.x - (from.x + u * dx), p.y - (from.y + u * dy));
    if (off > CUT_NEAR_M) continue;
    if (along < bestAlong) {
      bestAlong = along;
      best = p;
    }
  }
  return best;
}

/**
 * The move an event draws, or null. Null without a named trait, for a kind
 * with no move, and when the player is not on the snapshot. A fend or a step
 * with no trait credited (the plan, not Don't Argue or Dancing Feet) draws
 * nothing here: the pop-up and the pose already say it happened.
 */
export function traitMoveFor(e: SimEvent, snap: Snapshot): TraitMove | null {
  if (!e.trait || e.side === undefined || e.slot === undefined) return null;
  const kind = KIND_OF[e.kind];
  if (!kind || !traitOwnsMove(kind, e.trait)) return null;
  const who = snap.players.find((p) => p.side === e.side && p.slot === e.slot);
  if (!who) return null;
  const move: TraitMove = { kind, side: e.side, slot: e.slot, x: who.x, y: who.y, headX: who.headX || 1 };
  if (kind === 'cut-out' && e.toSlot !== undefined) {
    const to = snap.players.find((p) => p.side === e.side && p.slot === e.toSlot);
    if (to) {
      move.to = { x: to.x, y: to.y, slot: to.slot };
      const through = manOnTheLine(
        who,
        to,
        snap.players.filter((p) => p.side === e.side && p.slot !== who.slot && p.slot !== to.slot),
      );
      if (through) move.through = { x: through.x, y: through.y, slot: through.slot };
    }
  }
  return move;
}

/** "Hitman II" is one of the trait's names. */
const named = (trait: string | undefined, name: string): boolean => trait !== undefined && (trait === name || trait.startsWith(`${name} `));

/**
 * Is `tackler` the last line (no more than LAST_MEN_BEHIND men deeper), and has the carrier run past most of his defence?
 * `dir` is the way the carrier runs (+1 towards the right-hand dead-ball line).
 */
export function lastLineSave(
  snap: Snapshot,
  tackler: { side: Side; slot: number; x: number },
  carrier: { x: number; headX: number },
): boolean {
  const dir = carrier.headX < 0 ? -1 : 1;
  const mine = snap.players.filter((p) => p.side === tackler.side && !p.binned && p.slot !== tackler.slot);
  if (mine.filter((p) => p.x * dir > tackler.x * dir + LAST_MAN_M).length > LAST_MEN_BEHIND) return false;
  return mine.filter((p) => p.x * dir < carrier.x * dir - 1).length >= LAST_LINE_BEATEN;
}

/**
 * Every move an event draws: the ones the event names (traitMoveFor), and the
 * #654 cues. Brick Wall and Last Line are not named by any event (the sim only
 * shifts the odds), so they come from the tackle and the sheets: a two-man
 * tackle with a Brick Wall man in it, and the last man's tackle once the runner
 * has broken the line. A Poacher who reads the pass and misses leaves no event,
 * so his cue shows only on the intercept.
 */
export function traitCuesFor(e: SimEvent, snap: Snapshot, roster?: TraitRoster | null): TraitMove[] {
  const out: TraitMove[] = [];
  const base = traitMoveFor(e, snap);
  if (base) out.push(base);
  if (e.side === undefined || e.slot === undefined) return out;
  const who = snap.players.find((p) => sameMan(p, e.side!, e.slot!));
  if (!who) return out;
  const at = (kind: MoveKind): TraitMove => ({ kind, side: who.side, slot: who.slot, x: who.x, y: who.y, headX: who.headX || 1 });
  const man = (side: Side, slot: number) => {
    const p = snap.players.find((q) => sameMan(q, side, slot));
    return p ? { x: p.x, y: p.y, side: p.side, slot: p.slot } : undefined;
  };

  if (e.kind === 'offload' && (named(e.trait, 'Offload King') || named(e.trait, 'Razzle Dazzle'))) {
    // The sim does not say who he threw to: the nearest teammate within reach, as pickReceiver does with its candidates.
    let to: { x: number; y: number; slot: number } | undefined;
    let best = OFFLOAD_REACH_M;
    for (const p of snap.players) {
      if (p.side !== who.side || p.slot === who.slot || p.binned) continue;
      const d = Math.hypot(p.x - who.x, p.y - who.y);
      if (d < best) { best = d; to = { x: p.x, y: p.y, slot: p.slot }; }
    }
    const razz = named(e.trait, 'Razzle Dazzle');
    if (to || razz) out.push({ ...at(razz ? 'razz' : 'offload'), ...(to ? { to } : {}) });
  } else if (e.kind === 'gamble') {
    out.push({ ...at('gamble'), ok: false });
  } else if (e.kind === 'intercept' && named(e.trait, 'Gambler')) {
    out.push({ ...at('gamble'), ok: true });
  } else if (e.kind === 'intercept' && named(e.trait, 'Poacher')) {
    // The passer is the man on the other side still in his passing pose.
    let from: PlayerFrom | undefined;
    let best = Infinity;
    for (const p of snap.players) {
      if (p.side === who.side || p.pose !== 'pass') continue;
      const d = Math.hypot(p.x - who.x, p.y - who.y);
      if (d < best) { best = d; from = p; }
    }
    out.push({ ...at('pluck'), ok: true, ...(from ? { other: { x: from.x, y: from.y, side: from.side, slot: from.slot } } : {}) });
  } else if (e.kind === 'strip' && named(e.trait, 'Pickpocket')) {
    const c = e.contact?.carrier ? man(e.contact.carrier.side, e.contact.carrier.slot) : undefined;
    out.push({ ...at('pluck'), ...(c ? { other: c } : {}) });
  } else if (e.kind === 'penalty' && named(e.trait, 'Hothead')) {
    out.push(at('temper'));
  } else if (e.kind === 'tackle' && roster && e.contact && e.contact.defenders.length >= 2) {
    const wall = e.contact.defenders.find((d) => roster.has(d.side, d.who, 'brickWall'));
    const carrier = man(e.contact.carrier.side, e.contact.carrier.slot);
    const w = wall ? man(wall.side, wall.slot) : undefined;
    if (carrier && w) out.push({ kind: 'wall', side: carrier.side, slot: carrier.slot, x: carrier.x, y: carrier.y, headX: 1, other: w });
  }

  if (roster && TACKLES.has(e.kind) && e.contact && roster.has(who.side, who.who, 'lastLine')) {
    const carrier = snap.players.find((p) => sameMan(p, e.contact!.carrier.side, e.contact!.carrier.slot));
    if (carrier && lastLineSave(snap, who, carrier)) {
      const m: TraitMove = { ...at('last-line'), other: { x: carrier.x, y: carrier.y, side: carrier.side, slot: carrier.slot } };
      // A held frame, unless the moment already has its beat (a big hit, a run-down, a try).
      if (!snap.events.some((x) => impactTier(x, popupFor(x)) !== null)) m.tier = 2;
      out.push(m);
    }
  }
  return out;
}

type PlayerFrom = { x: number; y: number; side: Side; slot: number };

interface WorldPt {
  x: number;
  y: number;
}

/** Field metres onto the pitch's screen point. */
function worldOf(x: number, y: number, toWorld: (fx: number, fy: number) => WorldPt): WorldPt {
  const f = toFieldPt({ x, y });
  return toWorld(f.fx, f.fy);
}

/** A unit step along the field in the direction he faces, in world px. */
function facing(move: TraitMove, toWorld: (fx: number, fy: number) => WorldPt): WorldPt {
  const sign = move.headX < 0 ? -1 : 1;
  const a = worldOf(move.x, move.y, toWorld);
  const b = worldOf(move.x + sign * 2, move.y, toWorld);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

/**
 * Draws the moves over the players and under the pop-ups. Give it each event
 * as it is said (`note`); call `update` every frame after the sprites have moved.
 * `clear` drops them (a skipped or resumed stretch shows none).
 */
export class TraitLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly live: { move: TraitMove; born: number }[] = [];
  private readonly tackles = new TackleTally();
  private roster: TraitRoster | null = null;
  private now = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** The two sheets' traits, for the cues the sim names no one for (Brick Wall, Last Line, Workhorse). */
  setRoster(roster: TraitRoster | null): void {
    this.roster = roster;
  }

  /** Count a tackle or a change of possession without drawing: a skipped stretch still builds a Workhorse's set. */
  tally(e: SimEvent, snap: Snapshot): void {
    this.tackles.hear(e, this.workhorseKey(e, snap));
  }

  /** The tackler's key when he is a Workhorse and the event is his tackle, else null. */
  private workhorseKey(e: SimEvent, snap: Snapshot): string | null {
    if (!this.roster || !TACKLES.has(e.kind) || e.side === undefined || e.slot === undefined) return null;
    const who = whoIs(snap, e.side, e.slot);
    return this.roster.has(e.side, who, 'workhorse') ? `${e.side}|${who}` : null;
  }

  /**
   * The move the event drew, or null (the playback eases ×4 and ×8 so it can be seen).
   * A move with a `tier` asks for that impact beat, which the caller plays.
   */
  note(e: SimEvent, snap: Snapshot): TraitMove | null {
    this.tally(e, snap);
    const moves = traitCuesFor(e, snap, this.roster);
    const key = this.workhorseKey(e, snap);
    if (key !== null && this.tackles.count(key, e.tick) === WORKHORSE_TACKLES) {
      const p = snap.players.find((q) => sameMan(q, e.side!, e.slot!));
      if (p) moves.push({ kind: 'workhorse', side: p.side, slot: p.slot, x: p.x, y: p.y, headX: p.headX || 1 });
    }
    for (const move of moves) this.live.push({ move, born: this.now });
    return moves.find((m) => m.tier) ?? moves[0] ?? null;
  }

  clear(): void {
    this.live.length = 0;
  }

  update(
    deltaMs: number,
    zoom: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
    speed = 1,
  ): void {
    // Age in held time: at ×8 the mark stays up for two real seconds, not one.
    this.now += deltaMs / moveHold(speed);
    this.g.clear();
    const px = 1 / Math.max(0.25, zoom);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]!;
      const a = moveAlpha(this.now - l.born);
      if (a <= 0) {
        this.live.splice(i, 1);
        continue;
      }
      this.draw(l.move, a, px, (this.now - l.born) / TRAIT_MOVE_MS, toWorld, feet);
    }
  }

  private draw(
    move: TraitMove,
    a: number,
    px: number,
    t: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    const at = feet(move.side, move.slot) ?? worldOf(move.x, move.y, toWorld);
    const fwd = facing(move, toWorld);
    const g = this.g;
    if (move.kind === 'fend') {
      // The straight arm: out along the way he faces, the palm at the end.
      const end = { x: at.x + fwd.x * 18 - fwd.y * 6, y: at.y + fwd.y * 18 + fwd.x * 6 - 8 };
      g.lineStyle(4 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(at.x, at.y - 10, end.x, end.y);
      g.fillStyle(MOVE_COLOR, 0.9 * a).fillCircle(end.x, end.y, 4 * px);
      return;
    }
    if (move.kind === 'step') {
      // The cut: a sidestep off his line and back onto it.
      const side = { x: -fwd.y, y: fwd.x };
      const p0 = { x: at.x - fwd.x * 8, y: at.y - fwd.y * 8 };
      const p1 = { x: at.x + side.x * 14, y: at.y + side.y * 14 };
      const p2 = { x: at.x + fwd.x * 16, y: at.y + fwd.y * 16 };
      g.lineStyle(3 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      g.lineBetween(p1.x, p1.y, p2.x, p2.y);
      return;
    }
    if (move.kind === 'cut-out' && move.to) {
      // Follow the men, so at ×8 the line is still through the man he skipped
      // and not a patch of grass he has run off.
      const from = feet(move.side, move.slot) ?? worldOf(move.x, move.y, toWorld);
      const to = feet(move.side, move.to.slot) ?? worldOf(move.to.x, move.to.y, toWorld);
      const mid = move.through ? feet(move.side, move.through.slot) ?? worldOf(move.through.x, move.through.y, toWorld) : null;
      g.lineStyle(3 * px, MOVE_COLOR, 0.9 * a);
      if (mid) {
        g.lineBetween(from.x, from.y, mid.x, mid.y);
        g.lineBetween(mid.x, mid.y, to.x, to.y);
        g.lineStyle(2 * px, 0xffffff, 0.9 * a).strokeCircle(mid.x, mid.y, 8);
      } else g.lineBetween(from.x, from.y, to.x, to.y);
      g.fillStyle(MOVE_COLOR, 0.85 * a).fillCircle(to.x, to.y, 3.5 * px);
      return;
    }
    if (move.kind === 'drive') {
      // Through the tackle: dust behind him, a chevron ahead.
      const back = { x: at.x - fwd.x * 10, y: at.y - fwd.y * 10 };
      g.fillStyle(DUST_COLOR, 0.55 * a).fillEllipse(back.x, back.y, 14, 6);
      const tip = { x: at.x + fwd.x * 16, y: at.y + fwd.y * 16 - 4 };
      g.lineStyle(3 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(tip.x, tip.y, tip.x - fwd.x * 10 + fwd.y * 6, tip.y - fwd.y * 10 - fwd.x * 6);
      g.lineBetween(tip.x, tip.y, tip.x - fwd.x * 10 - fwd.y * 6, tip.y - fwd.y * 10 + fwd.x * 6);
      return;
    }
    if (move.kind === 'hit') {
      // The shock of the big hit, on the man who made it.
      g.lineStyle(3 * px, 0xffffff, 0.95 * a).strokeEllipse(at.x, at.y, 26, 12);
      g.lineStyle(2 * px, MOVE_COLOR, 0.8 * a).strokeEllipse(at.x, at.y, 16, 7);
      return;
    }
    this.drawCue(move, a, px, t, at, toWorld, feet);
  }

  /** The #654 cues. Sizes are world px with a floor in screen px (`px` is world px per screen px), so they read on a phone. */
  private drawCue(
    move: TraitMove,
    a: number,
    px: number,
    t: number,
    at: WorldPt,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    const g = this.g;
    const sz = (world: number, css: number): number => Math.max(world, css * px);
    const chest = { x: at.x, y: at.y - 14 };
    const head = { x: at.x, y: at.y - 42 };
    const pt = (p: { x: number; y: number }): WorldPt => worldOf(p.x, p.y, toWorld);
    const otherAt = move.other ? feet(move.other.side, move.other.slot) ?? pt(move.other) : null;
    const ease = (v: number): number => 1 - (1 - Math.min(1, Math.max(0, v))) ** 2;
    switch (move.kind) {
      case 'offload':
      case 'razz': {
        // The ball out the back of the tackle: a dashed arc from the tackled man to the man it is for, drawn out as the ball flies.
        const razz = move.kind === 'razz';
        const toF = move.to ? feet(move.side, move.to.slot) ?? pt(move.to) : null;
        const to = toF ? { x: toF.x, y: toF.y - 14 } : null;
        const col = razz ? 0xffd24a : MOVE_COLOR;
        if (to) {
          const len = Math.hypot(to.x - chest.x, to.y - chest.y);
          const lift = Math.min(40, 14 + len * 0.4) + 6 * px;
          const reach = ease(t / 0.4) * 0.92;
          const N = 12;
          const along = (s: number): WorldPt => {
            const wob = razz ? Math.sin(s * Math.PI * 3) * sz(5, 4) : 0;
            return { x: chest.x + (to.x - chest.x) * s, y: chest.y + (to.y - chest.y) * s - 4 * lift * s * (1 - s) + wob };
          };
          for (let i = 0; i < N; i += 2) {
            const s0 = i / N;
            const s1 = Math.min(reach, (i + 1) / N);
            if (s1 <= s0) break;
            const p0 = along(s0);
            const p1 = along(s1);
            g.lineStyle(6.5 * px, 0xffffff, 0.8 * a).lineBetween(p0.x, p0.y, p1.x, p1.y);
            g.lineStyle(4.5 * px, col, 0.95 * a).lineBetween(p0.x, p0.y, p1.x, p1.y);
          }
          g.lineStyle(2 * px, col, 0.9 * a).strokeCircle(to.x, to.y, sz(7, 6) * (0.6 + 0.4 * ease(t / 0.4)));
        }
        if (razz) {
          // The flourish: sparkles round the flick, turning.
          for (let i = 0; i < 3; i++) {
            const ang = t * 5 + (i * Math.PI * 2) / 3;
            const r = sz(15, 13);
            this.sparkle(chest.x + Math.cos(ang) * r, chest.y - 8 + Math.sin(ang) * r * 0.6, sz(6, 6) * (0.8 + 0.3 * Math.sin(t * 14 + i)), 0xffffff, col, a);
          }
          if (to) this.sparkle(to.x, to.y - 6, sz(5, 5) * ease((t - 0.25) / 0.2), 0xffffff, col, a);
        }
        return;
      }
      case 'pluck': {
        // A strip: the ball squirts out of the carrier's hands (the spark) and a line runs to the thief.
        // A pick-off: the lane the pass came down, and the spark where he plucks it.
        const thief = { x: chest.x, y: chest.y - 2 };
        const from = otherAt ? { x: otherAt.x, y: otherAt.y - 16 } : null;
        const spot = move.ok || !from ? thief : from;
        if (from) {
          const len = Math.hypot(thief.x - from.x, thief.y - from.y);
          const lift = Math.min(18, 4 + len * 0.15);
          const reach = ease(t / 0.3);
          const N = 10;
          for (let i = 0; i < N; i++) {
            const s0 = i / N;
            const s1 = Math.min(reach, (i + 1) / N);
            if (s1 <= s0) break;
            const q0 = { x: from.x + (thief.x - from.x) * s0, y: from.y + (thief.y - from.y) * s0 - 4 * lift * s0 * (1 - s0) };
            const q1 = { x: from.x + (thief.x - from.x) * s1, y: from.y + (thief.y - from.y) * s1 - 4 * lift * s1 * (1 - s1) };
            g.lineStyle(4.5 * px, 0xffffff, 0.8 * a).lineBetween(q0.x, q0.y, q1.x, q1.y);
            g.lineStyle(3 * px, MOVE_COLOR, 0.95 * a).lineBetween(q0.x, q0.y, q1.x, q1.y);
          }
        }
        this.burst(spot.x, spot.y - 6 * px, sz(11, 10) * (0.7 + 0.5 * ease(t / 0.25)), 8, 0xffffff, 0xffe14a, a);
        g.lineStyle(2.5 * px, MOVE_COLOR, 0.95 * a).strokeCircle(thief.x, thief.y, sz(8, 7) * (1.3 - 0.3 * ease(t / 0.3)));
        return;
      }
      case 'gamble': {
        // A lunge across the lane, and the die in the air: gold if it comes off, red if he is beaten.
        const col = move.ok ? 0xffd24a : 0xff4a4a;
        const fwd = facing(move, toWorld);
        const r = sz(16, 14);
        const ang = Math.atan2(fwd.y, fwd.x);
        g.lineStyle(4.5 * px, 0xffffff, 0.8 * a);
        g.beginPath().arc(chest.x, chest.y, r, ang - 0.9, ang + 0.9, false).strokePath();
        g.lineStyle(3 * px, col, 0.95 * a);
        g.beginPath().arc(chest.x, chest.y, r, ang - 0.9, ang + 0.9, false).strokePath();
        const spin = (1 - ease(t / 0.5)) * 7 + (move.ok ? 0 : 0.35);
        this.die(head.x, head.y - ease(t / 0.4) * 5 * px - 2, sz(12, 11), spin, col, a);
        return;
      }
      case 'temper': {
        // His temper: the red cross of a lost cool over his head, and a flare at his feet.
        const pulse = 1 + 0.25 * Math.sin(t * 22);
        const r = sz(9, 9) * pulse;
        const gap = r * 0.3;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const pts = [
            { x: head.x + sx * gap, y: head.y + sy * r },
            { x: head.x + sx * gap, y: head.y + sy * gap },
            { x: head.x + sx * r, y: head.y + sy * gap },
          ];
          g.lineStyle(5.5 * px, 0xffffff, 0.8 * a).strokePoints(pts, false);
          g.lineStyle(3.5 * px, 0xff3b2e, 0.95 * a).strokePoints(pts, false);
        }
        g.lineStyle(3 * px, 0xff3b2e, 0.8 * a * (1 - t)).strokeEllipse(at.x, at.y, sz(28, 22) * (0.6 + t), sz(12, 10) * (0.6 + t));
        return;
      }
      case 'wall': {
        // Stopped dead: a brick wall where the two met, and the shock off it.
        const c = { x: at.x, y: at.y - 14 };
        const o = otherAt ? { x: otherAt.x, y: otherAt.y - 14 } : c;
        const mid = { x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 - 4 };
        const bw = sz(8, 8);
        const bh = bw * 0.55;
        for (let row = 0; row < 3; row++) {
          const n = row === 1 ? 3 : 2;
          for (let k = 0; k < n; k++) {
            const x = mid.x + (k - (n - 1) / 2) * bw;
            const y = mid.y + (row - 1) * bh;
            g.fillStyle(0xb5533c, 0.95 * a).fillRect(x - bw / 2, y - bh / 2, bw, bh);
            g.lineStyle(1.5 * px, 0xffffff, 0.9 * a).strokeRect(x - bw / 2, y - bh / 2, bw, bh);
          }
        }
        const reach = ease(t / 0.35);
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI * 2) / 6 + Math.PI / 6;
          const r0 = sz(16, 15);
          const r1 = r0 + sz(8, 8) * reach;
          g.lineStyle(3 * px, 0xffffff, 0.9 * a * (1 - 0.5 * reach)).lineBetween(mid.x + Math.cos(ang) * r0, mid.y + Math.sin(ang) * r0 * 0.7, mid.x + Math.cos(ang) * r1, mid.y + Math.sin(ang) * r1 * 0.7);
        }
        return;
      }
      case 'last-line': {
        // The last man: a marker bobbing over him, a ring at his feet, and a shock where he met the runner.
        const bob = Math.sin(t * 12) * 2 * px;
        const s = sz(7, 8);
        const tip = { x: head.x, y: head.y - 2 + bob };
        g.fillStyle(MOVE_COLOR, 0.95 * a).fillTriangle(tip.x - s, tip.y - s * 1.5, tip.x + s, tip.y - s * 1.5, tip.x, tip.y);
        g.lineStyle(2 * px, 0xffffff, 0.95 * a).strokeTriangle(tip.x - s, tip.y - s * 1.5, tip.x + s, tip.y - s * 1.5, tip.x, tip.y);
        g.lineStyle(3 * px, MOVE_COLOR, 0.9 * a).strokeEllipse(at.x, at.y, sz(30, 24), sz(13, 10));
        if (otherAt) {
          const grow = ease(t / 0.3);
          g.lineStyle(3 * px, 0xffffff, 0.95 * a * (1 - 0.5 * grow)).strokeEllipse(otherAt.x, otherAt.y - 10, sz(16, 14) * (0.6 + grow), sz(10, 9) * (0.6 + grow));
        }
        return;
      }
      case 'workhorse': {
        // His third tackle of the set: a horseshoe over him with three nails, and a gold ring.
        const r = sz(9, 10);
        const c = { x: head.x, y: head.y - 4 - 4 * ease(t / 0.3) * px };
        g.lineStyle(8 * px, 0xffffff, 0.85 * a);
        g.beginPath().arc(c.x, c.y, r, 0.15, Math.PI - 0.15, false).strokePath();
        g.lineStyle(5.5 * px, 0xe8b830, 0.95 * a);
        g.beginPath().arc(c.x, c.y, r, 0.15, Math.PI - 0.15, false).strokePath();
        for (let i = 0; i < 3; i++) g.fillStyle(0xffffff, 0.95 * a).fillCircle(c.x + (i - 1) * r * 0.6, c.y + r * (i === 1 ? 0.75 : 0.4), 1.3 * px);
        g.lineStyle(3 * px, 0xe8b830, 0.85 * a * (1 - t)).strokeEllipse(at.x, at.y, sz(28, 22) * (0.6 + t), sz(12, 10) * (0.6 + t));
        return;
      }
      default:
        return;
    }
  }

  /** A four-point sparkle. */
  private sparkle(x: number, y: number, r: number, core: number, edge: number, a: number): void {
    const g = this.g;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.3;
      const ang = (i * Math.PI) / 4 - Math.PI / 2;
      pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
    }
    g.fillStyle(edge, 0.9 * a).fillPoints(pts, true);
    g.lineStyle(Math.max(1, r / 4), core, 0.9 * a).strokePoints(pts, true);
  }

  /** A spark: rays out from a point. */
  private burst(x: number, y: number, r: number, rays: number, core: number, edge: number, a: number): void {
    const g = this.g;
    for (let i = 0; i < rays; i++) {
      const ang = (i * Math.PI * 2) / rays;
      const inner = i % 2 === 0 ? r * 0.35 : r * 0.5;
      g.lineStyle(Math.max(1.5, r * 0.22), i % 2 === 0 ? core : edge, 0.95 * a).lineBetween(x + Math.cos(ang) * inner, y + Math.sin(ang) * inner, x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    }
    g.fillStyle(core, 0.95 * a).fillCircle(x, y, r * 0.22);
  }

  /** A die in the air: a tilted white face with five pips and a coloured edge. */
  private die(x: number, y: number, size: number, spin: number, edge: number, a: number): void {
    const g = this.g;
    const h = size / 2;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);
    const rot = (dx: number, dy: number): { x: number; y: number } => ({ x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos });
    const face = [rot(-h, -h), rot(h, -h), rot(h, h), rot(-h, h)];
    g.fillStyle(0xffffff, 0.97 * a).fillPoints(face, true);
    g.lineStyle(Math.max(2, size * 0.16), edge, 0.97 * a).strokePoints(face, true);
    for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]] as const) {
      const c = rot(dx * h, dy * h);
      g.fillStyle(0x201020, 0.95 * a).fillCircle(c.x, c.y, Math.max(1.2, size * 0.09));
    }
  }

  destroy(): void {
    this.g.destroy();
    this.live.length = 0;
  }
}
