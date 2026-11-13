// The view follows contact facts. It never rolls a result or recruits a nearby player.
import type { ContactPlayer, ContactSnap, PlayerSnap, Snapshot } from '../core/snapshot';

export type ContactKind = 'wrap' | 'low' | 'dominant' | 'break' | 'steal';
/** Where the first defender came from, against the carrier's heading (#674). */
export type ContactApproach = 'front' | 'side' | 'behind';
/**
 * The picture drawn for a contact (#674): front-on wrap (`square`), the drag of a
 * man hanging on from the side, the ankle tap from behind, the front-on `stop` of a
 * big hit, the `bump` that busts a tackle, and the `strip`.
 */
export type ContactVariant = 'square' | 'drag' | 'ankle' | 'stop' | 'bump' | 'strip';
export interface ContactAnimation {
  contact: ContactSnap;
  joined: { player: ContactPlayer; tick: number }[];
  kind: ContactKind;
  approach: ContactApproach;
  variant: ContactVariant;
  resolvedTick: number | null;
  phase: 'contact' | 'ground' | 'ptb' | 'escape';
  phaseTick: number;
  tick: number;
  holder: Snapshot['ball']['holder'];
}
export const contactPlayerKey = (p: ContactPlayer): string => `${p.side}/${p.slot}/${p.who}`;
const sameContact = (a: ContactSnap, b: ContactSnap) => a.startedTick === b.startedTick && contactPlayerKey(a.carrier) === contactPlayerKey(b.carrier);

/** Cosine of the first defender's approach against the carrier's heading: 1 at his face, −1 at his back. */
export const APPROACH_FRONT = .6;
export const APPROACH_BEHIND = 0;
/**
 * The approach as the snapshot has it: the line from the first defender to the
 * carrier against the carrier's heading, the same geometry the sim reads its tackle
 * angle from. A held pair moves together, so this holds still for the whole hold and
 * fall; a fresh read on any tick (seek, resume, replay) gives the same answer.
 */
export function contactApproach(carrier: PlayerSnap, defender: PlayerSnap | undefined): ContactApproach {
  if (!defender) return 'front';
  const ax = carrier.x - defender.x; const ay = carrier.y - defender.y;
  const length = Math.hypot(ax, ay);
  if (length < 1e-6) return 'front';
  const square = -(ax * carrier.headX + ay * (carrier.headY ?? 0)) / length;
  return square >= APPROACH_FRONT ? 'front' : square < APPROACH_BEHIND ? 'behind' : 'side';
}
/** The outcome picks the beat; for a held tackle or a big hit, the approach picks the picture. */
export function contactVariant(kind: ContactKind, approach: ContactApproach): ContactVariant {
  if (kind === 'break') return 'bump';
  if (kind === 'steal') return 'strip';
  if (kind === 'dominant') return approach === 'front' ? 'stop' : 'square';
  return approach === 'behind' ? 'ankle' : approach === 'side' ? 'drag' : 'square';
}

/** Modern snapshots are self-contained; older rehearsal data can be folded in tick order. */
export function advanceContactAnimation(previous: ContactAnimation | null, snap: Snapshot): ContactAnimation | null {
  const event = snap.events.find(e => e.contact);
  if (event && !['tackle', 'big-hit', 'break-tackle', 'strip'].includes(event.kind)) return null;
  // Old recordings without exact references intentionally keep the ordinary player art.
  if (previous && snap.tick < previous.tick) previous = null;
  const facts = snap.contact ?? event?.contact;
  // Modern records explicitly end when the sim leaves that contact's lifecycle.
  if (!facts && previous?.contact.joinedTicks) return null;
  if (!facts && !previous) return null;
  if (!facts && previous?.resolvedTick === null) return null;
  const contact = facts ?? previous!.contact;
  const prior = previous && sameContact(previous.contact, contact) ? previous : null;
  const joined = contact.defenders.map((player, index) => ({
    player, tick: contact.joinedTicks?.[index] ?? prior?.joined.find(j => contactPlayerKey(j.player) === contactPlayerKey(player))?.tick ?? snap.tick,
  }));
  let kind: ContactKind = prior?.kind ?? 'wrap';
  let resolvedTick = prior?.resolvedTick ?? null;
  const outcome = contact.outcome ?? event?.kind;
  if (outcome) {
    resolvedTick = contact.resolvedTick ?? resolvedTick ?? event!.tick;
    kind = outcome === 'strip' ? 'steal' : outcome === 'break-tackle' ? 'break' : outcome === 'big-hit' ? 'dominant'
      : contact.defenders.length === 1 && resolvedTick - contact.startedTick <= 7 ? 'low' : 'wrap';
  }
  const find = (p: ContactPlayer) => snap.players.find(q => q.side === p.side && q.slot === p.slot && q.who === p.who);
  const carrier = find(contact.carrier);
  if (!carrier || joined.length === 0 || joined.length > 3) return null;
  // A strip is only painted when the engine has actually awarded the defender the ball.
  const expected = kind === 'steal' ? contact.defenders[0]! : contact.carrier;
  if (kind === 'steal' && contact.defenders.length !== 1) return null;
  if (!snap.ball.holder || snap.ball.holder.side !== expected.side || snap.ball.holder.slot !== expected.slot) return null;
  if (!facts && resolvedTick !== null) {
    if (kind === 'break' || kind === 'steal') {
      if (snap.tick - resolvedTick > 20) return null;
    } else if (!['down', 'tackled', 'ptb'].includes(carrier.pose)) return null;
  }
  const phase = kind === 'break' || kind === 'steal' ? 'escape' : carrier.pose === 'ptb' ? 'ptb' : carrier.pose === 'down' ? 'ground' : 'contact';
  // Read from this tick's facts alone (never the fold), so a seek draws what playing through drew.
  const approach = contactApproach(carrier, find(contact.defenders[0]!));
  return { contact, joined, kind, approach, variant: contactVariant(kind, approach), resolvedTick, tick: snap.tick,
    phase, phaseTick: contact.phaseTick ?? (prior?.phase === phase ? prior.phaseTick : snap.tick),
    holder: snap.ball.holder };
}
