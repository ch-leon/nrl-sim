import { careerActionClock, type CareerActionClock } from '../core/season';
// src/systems/undo.ts — the 5-second Undo after a build, a signing or a demolish
// (#370). It replaces the confirm taps: the action happens at once, and a toast
// with an Undo button gives five seconds to take it back.
//
// Rules (DECISION (Leon), #370):
//   - one offer at a time: a new action replaces the open offer;
//   - the offer ends at UNDO_MS, on Advance Week or a ▾ run (main.ts commits it
//     before asking anything), when a match starts, and on reload: it lives in
//     memory only and is never saved;
//   - an action that can no longer be reversed (the spot is taken, the man has
//     gone, the money isn't there) keeps its toast but loses the button.
// Each Undo books a reversing movement under `undo:<reason>`, which the books
// file on the line it reverses (economy.ts classifyReason), so Finance nets to zero.
//
// Pure-ish around getState/setState; no DOM, no Phaser.

import { weekHeld } from '../core/time';
import { bus } from '../core/events';
import { getState, setState, type GameState, type Lineup, type PlacedFacility, type Player } from '../core/state';
import { FACILITY_CATALOG } from '../data/facility';
import { fmtMoney } from '../utils/money';
import { demolishFacility, validatePlacement } from '../world/placement';
import { signPlayer, signingFee, type SignResult } from './freeagency';
import { bookPlayerMovement } from './playerCareer';
import { signingNote } from './lineup';

/** How long the Undo stays on offer. */
export const UNDO_MS = 5000;

export type UndoKind = 'build' | 'sign' | 'demolish';

/** An action that can still be taken back. */
export interface UndoOffer {
  kind: UndoKind;
  /** The toast's line ("Training Paddock built!"). */
  text: string;
  /** Date.now() past which the offer is gone. */
  expiresAt: number;
  /** Whether `revert` would still put things back exactly in `s`. */
  canRevert(s: GameState): boolean;
  revert(): void;
}

let open: UndoOffer | null = null;

/** The open offer, or null once it has expired, been taken or been committed. */
export function currentOffer(now = Date.now()): UndoOffer | null {
  if (open && now >= open.expiresAt) open = null;
  return open;
}

/**
 * Put `offer` up, replacing any open one, and show its toast with the Undo
 * button. The button hides once the offer is gone or can't be reversed.
 */
export function offerUndo(offer: UndoOffer, kind: 'info' | 'success' = 'success'): void {
  open = offer;
  bus.emit('ui:notify', {
    text: offer.text,
    kind,
    ms: UNDO_MS,
    action: {
      label: 'Undo',
      run: () => void undoNow(),
      enabled: () => currentOffer() === offer && offer.canRevert(getState()),
    },
  });
}

/** Take the open offer back. False (and the offer gone) when there is none or it can't be reversed. */
export function undoNow(now = Date.now()): boolean {
  const o = currentOffer(now);
  open = null;
  if (weekHeld() || !o || !o.canRevert(getState())) return false;
  o.revert();
  return true;
}

/** Keep what was done: the offer ends without reverting (Advance Week, a match). */
export function commitUndo(): void {
  open = null;
}

/** A match starting ends the offer (a parked match resuming at boot too). Returns the unsubscribe. */
export function initUndo(): () => void {
  return bus.on('match:started', () => commitUndo());
}

// ── The three actions ─────────────────────────────────────────────────────

/**
 * Offer to take back a build that cost `cost`: the facility goes, the full cost
 * comes back and its tiles free up (the scene rebuilds the walk grid from state).
 * Only while it stands where it was put, at level 1.
 */
export function offerBuild(f: PlacedFacility, cost: number, now = Date.now()): void {
  const def = FACILITY_CATALOG[f.defId];
  offerUndo({
    kind: 'build',
    text: `${def.name} built!`,
    expiresAt: now + UNDO_MS,
    canRevert: (s) => s.facilities.some((x) => x.id === f.id && x.level === f.level && x.x === f.x && x.y === f.y),
    revert: () => {
      const s = getState();
      const balance = s.money + cost;
      setState({ facilities: s.facilities.filter((x) => x.id !== f.id), money: balance });
      bus.emit('money:changed', { delta: cost, reason: `undo:build:${f.defId}`, balance });
      bus.emit('facility:removed', { facility: f, undo: true });
    },
  });
}

/**
 * Offer to take back a signing: `asWas` (the free agent before he signed) goes
 * back into the pool at `poolIndex` and the fee comes back. Only while he is
 * still in the squad (not sold or released in the meantime). `lineup` is the
 * nine before he went into it and the one he left (#416): the old one comes
 * back while the lineup is still as he left it.
 */
export function offerSign(
  signed: Player, asWas: Player, poolIndex: number, fee: number, now = Date.now(),
  opts: { stamp?: CareerActionClock; text?: string; shortlistIndex?: number; lineup?: { before: Lineup; after: Lineup } } = {},
): void {
  const stamp = opts.stamp ?? careerActionClock(getState());
  offerUndo({
    kind: 'sign',
    text: opts.text ?? `Signed ${signed.name}`,
    expiresAt: now + UNDO_MS,
    canRevert: (s) => (!stamp.structural || careerActionClock(s).key === stamp.key) && s.squad.some((p) => p.id === signed.id && JSON.stringify(p) === JSON.stringify(signed)) && !s.freeAgents.some((p) => p.id === signed.id),
    revert: () => {
      const s = getState();
      const refundStamp = stamp.structural ? stamp : careerActionClock(s);
      const pool = [...s.freeAgents];
      pool.splice(Math.min(poolIndex, pool.length), 0, asWas);
      const lineup = opts.lineup && s.lineup === opts.lineup.after ? { lineup: opts.lineup.before } : {};
      const shortlistIds = [...s.playerPopulation.shortlistIds];
      if (opts.shortlistIndex !== undefined && opts.shortlistIndex >= 0 && !shortlistIds.includes(asWas.id)) shortlistIds.splice(Math.min(opts.shortlistIndex, shortlistIds.length), 0, asWas.id);
      const next = bookPlayerMovement({ ...s, squad: s.squad.filter(p => p.id !== signed.id), freeAgents: pool,
        playerPopulation: { ...s.playerPopulation, shortlistIds }, ...lineup }, fee, 'transfers', refundStamp);
      setState({ squad: next.squad, freeAgents: pool, money: next.money, finance: next.finance, playerPopulation: next.playerPopulation, ...lineup });
      bus.emit('money:changed', { delta: fee, reason: `undo:sign:${signed.id}`, balance: next.money, booked: true, stamp: { season: refundStamp.season, week: refundStamp.week } });
      bus.emit('player:unsigned', { player: asWas });
    },
  });
}

/**
 * Offer to take back a demolish: the facility comes back at its spot, level and
 * place in the list, and the refund goes back. Only while its spot is still free
 * (and a unique facility has no second copy) and the club still has the refund.
 */
export function offerDemolish(f: PlacedFacility, index: number, refund: number, now = Date.now()): void {
  const def = FACILITY_CATALOG[f.defId];
  offerUndo({
    kind: 'demolish',
    text: `${def.name} demolished, +${fmtMoney(refund)}`,
    expiresAt: now + UNDO_MS,
    canRevert: (s) => !s.facilities.some((x) => x.id === f.id) && s.money >= refund && validatePlacement(s, f.defId, f.x, f.y, { cost: 0 }).ok,
    revert: () => {
      const s = getState();
      const list = [...s.facilities];
      list.splice(Math.min(index, list.length), 0, f);
      const balance = s.money - refund;
      setState({ facilities: list, money: balance });
      if (refund > 0) bus.emit('money:changed', { delta: -refund, reason: `undo:demolish:${f.defId}`, balance });
      bus.emit('facility:placed', f); // the scene, sounds and badges as for a build
    },
  }, 'info');
}

/** Sign from a screen (Recruit, the player page): signPlayer with the Undo toast in place of its own. */
export function signWithUndo(playerId: string): SignResult {
  const s = getState();
  const index = s.freeAgents.findIndex((p) => p.id === playerId);
  const asWas = s.freeAgents[index];
  const fee = asWas ? signingFee(s, asWas) : 0;
  const res = signPlayer(s, playerId, { toast: false, intoLineup: true });
  const after = getState();
  const signed = after.squad.find((p) => p.id === playerId);
  // "Signed Deakin Cronky: goes straight into the nine at second-row" (#416).
  const text = res.placed && signed ? `Signed ${signed.name}: ${signingNote(res.placed)}` : undefined;
  if (res.ok && asWas && signed) offerSign(signed, asWas, index, fee, Date.now(), { stamp: careerActionClock(s), ...(text ? { text } : {}), shortlistIndex: s.playerPopulation.shortlistIds.indexOf(playerId), lineup: { before: s.lineup, after: after.lineup } });
  return res;
}

/** Demolish from the facility popup: one tap, then the Undo toast. Returns the refund, or null. */
export function demolishWithUndo(facilityId: string): number | null {
  const index = getState().facilities.findIndex((f) => f.id === facilityId);
  const f = getState().facilities[index];
  const refund = demolishFacility(facilityId);
  if (f && refund !== null) offerDemolish(f, index, refund);
  return refund;
}
