// The view follows contact facts. It never rolls a result or recruits a nearby player.
import type { ContactPlayer, ContactSnap, Snapshot } from '../core/snapshot';
import { cyrb53 } from '../../utils/hash';

export type ContactKind = 'wrap' | 'low' | 'dominant' | 'break' | 'steal';
export interface ContactAnimation {
  contact: ContactSnap;
  joined: { player: ContactPlayer; tick: number }[];
  kind: ContactKind;
  variant: number;
  resolvedTick: number | null;
  phase: 'contact' | 'ground' | 'ptb' | 'escape';
  phaseTick: number;
  tick: number;
  holder: Snapshot['ball']['holder'];
}
export const contactPlayerKey = (p: ContactPlayer): string => `${p.side}/${p.slot}/${p.who}`;
const sameContact = (a: ContactSnap, b: ContactSnap) => a.startedTick === b.startedTick && contactPlayerKey(a.carrier) === contactPlayerKey(b.carrier);
export function contactVariant(contact: ContactSnap): number {
  return parseInt(cyrb53(`${contact.startedTick}/${contactPlayerKey(contact.carrier)}`).slice(-6), 16) % 2;
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
  const carrier = snap.players.find(p => p.side === contact.carrier.side && p.slot === contact.carrier.slot && p.who === contact.carrier.who);
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
  return { contact, joined, kind, resolvedTick, variant: prior?.variant ?? contactVariant(contact), tick: snap.tick,
    phase, phaseTick: contact.phaseTick ?? (prior?.phase === phase ? prior.phaseTick : snap.tick),
    holder: snap.ball.holder };
}
