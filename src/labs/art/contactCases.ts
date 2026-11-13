// Authored review snapshots, using the same contact contract as LiveSim.
// These fixtures select a situation for inspection; they do not resolve a match.
import type { ContactPlayer, ContactSnap, Snapshot } from '../../match/core/snapshot';
import { advanceContactAnimation, type ContactAnimation, type ContactApproach } from '../../match/view/contactAnimation';

export const CONTACT_CASES = [
  { id: 'two', label: 'Two-man tackle', joins: [12, 19], end: 31, outcome: 'tackle', note: 'First contact high. The second defender wraps low. Both release before play-the-ball.' },
  { id: 'three', label: 'Three-man tackle', joins: [12, 19, 24], end: 33, outcome: 'tackle', note: 'A third defender joins from the far side. Follow each arrival and the separate releases.' },
  { id: 'low', label: 'Quick low tackle', joins: [12], end: 17, outcome: 'tackle', note: 'A short one-on-one stop: wrap the legs, tip the runner forward, then clear.' },
  { id: 'dominant', label: 'Dominant hit', joins: [12], end: 12, outcome: 'big-hit', note: 'A sharp collision and backward recoil. The carrier keeps the ball through the landing.' },
  { id: 'break', label: 'Tackle break', joins: [12, 19], end: 29, outcome: 'break-tackle', note: 'The carrier fights out of a two-man tackle and runs on. There is no play-the-ball.' },
  { id: 'bump', label: 'Bump-off', joins: [12], end: 12, outcome: 'break-tackle', note: 'A one-on-one bust, as the sim mostly has them: the runner bumps the defender off, who spins away and goes down.' },
  { id: 'steal', label: 'Ball steal', joins: [12], end: 12, outcome: 'strip', note: 'One-on-one strip. The ball and possession marker transfer to the defender as he pulls away.' },
  { id: 'wrap', label: 'Upright wrestle', joins: [12], end: 40, outcome: 'tackle', note: 'The longer upright wrap remains one option, with the runner fighting against the hold.' },
] as const;
export type ContactCaseId = typeof CONTACT_CASES[number]['id'];
export const CASE_CARRIER: ContactPlayer = { side: 'home', slot: 4, who: 'p-art-4' };
export const CASE_DEFENDERS: readonly ContactPlayer[] = [
  { side: 'away', slot: 1, who: 'p-art-11' }, { side: 'away', slot: 5, who: 'p-art-5' }, { side: 'away', slot: 7, who: 'p-art-8' },
];
export const caseDefinition = (id: ContactCaseId) => CONTACT_CASES.find(c => c.id === id)!;
export function caseDuration(id: ContactCaseId): number {
  const def = caseDefinition(id);
  return def.end / 20 + (def.outcome === 'strip' || def.outcome === 'break-tackle' ? 1 : 1.8);
}
/** The approach the review's variation shows (#674): the first defender in front, behind or beside the runner. */
export const CASE_APPROACHES: readonly ContactApproach[] = ['front', 'behind', 'side'];
const OFFSET = 100;
// Field metres from the runner (at 50, 20, heading +x) for the first defender.
const FIRST_AT: Record<ContactApproach, { x: number; y: number }> = { front: { x: 51, y: 20 }, behind: { x: 49, y: 20 }, side: { x: 50.2, y: 21 } };
export function caseSnapshot(id: ContactCaseId, tick: number, variation = 0): Snapshot {
  const def = caseDefinition(id); const offset = OFFSET;
  const first = FIRST_AT[CASE_APPROACHES[variation % CASE_APPROACHES.length]!];
  const joined = CASE_DEFENDERS.slice(0, def.joins.filter(t => tick >= t).length);
  const info: ContactSnap = { startedTick: offset + 12, carrier: CASE_CARRIER, defenders: [...joined] };
  const done = tick >= def.end; const steal = def.outcome === 'strip' && done;
  const escape = done && (steal || def.outcome === 'break-tackle');
  const holder = steal ? CASE_DEFENDERS[0]! : CASE_CARRIER;
  const ptb = done && !escape && tick >= def.end + 22;
  return {
    tick: offset + tick, label: def.label,
    players: [CASE_CARRIER, ...CASE_DEFENDERS.slice(0, def.joins.length)].map(p => ({ ...p, ...(p === CASE_CARRIER ? { x: 50, y: 20 } : p === CASE_DEFENDERS[0] ? first : { x: 51, y: 20 }), speed: escape ? 4 : 0, headX: p.side === 'home' ? 1 : -1,
      pose: escape ? p === holder ? 'run' : 'down' : ptb ? p === CASE_CARRIER ? 'ptb' : 'idle' : done && tick >= def.end + 6 ? 'down' : p === CASE_CARRIER ? 'tackled' : 'tackle' })),
    ball: { x: 50, y: 20, lift: 1, holder: { side: holder.side, slot: holder.slot } },
    events: tick === def.end ? [{ tick: offset + tick, kind: def.outcome, text: def.label, side: def.outcome === 'break-tackle' ? 'home' : 'away', slot: def.outcome === 'break-tackle' ? 4 : 1, contact: info }] : [],
    ...(tick >= 12 && !done ? { contact: info } : {}),
  };
}

export interface ContactCaseFrame { state: ContactAnimation | null; beat: string; seconds: number }
export function contactCaseAt(id: ContactCaseId, seconds: number, variation = 0): ContactCaseFrame {
  const last = Math.floor(Math.max(0, Math.min(caseDuration(id) - .001, seconds)) * 20);
  let state: ContactAnimation | null = null;
  for (let tick = 0; tick <= last; tick++) state = advanceContactAnimation(state, caseSnapshot(id, tick, variation));
  const beat = !state ? 'Approach' : state.phase === 'ptb' ? 'Play-the-ball' : state.kind === 'steal' ? 'Strip · defender ball'
    : state.kind === 'break' ? 'Break · runner away' : state.phase === 'ground' ? 'Release / recover'
      : state.resolvedTick !== null ? state.kind === 'dominant' ? 'Dominant hit' : 'Tackle complete' : state.joined.length > 1 ? `${state.joined.length} defenders joined` : 'First contact';
  return { state, beat, seconds: last / 20 };
}
