// src/sim/commentary.ts — event → Aussie-footy commentary lines (BAK-196, WU-12).
// Pure TypeScript: no Phaser, no DOM. `commentaryFor` maps a MatchEvent to a
// flavourful string, choosing a template variant via the passed seeded rng so
// replays read identically. Low-signal kinds (set-start/kickoff) return '' to
// avoid feed spam; every scoring/impact kind has ≥4 non-empty variants.
import type { MatchEvent, MatchEventKind } from './events';

// Placeholders: {player} (from ev.player, generic fallback) and {team} (home or
// away display name resolved from ev.teamId vs the acting side).
const TEMPLATES: Record<MatchEventKind, string[]> = {
  kickoff: [
    'And we are underway at the ground!',
    '{team} get us started — here we go!',
    "The ref blows his whistle and it's on!",
    'Kick-off! Game on.',
  ],
  'set-start': [], // low-signal: no line (avoids feed spam)
  run: [
    '{player} takes it up the guts.',
    '{player} carts it into the line for {team}.',
    'Strong carry there from {player}.',
    '{player} makes a few metres for {team}.',
    'Up the middle goes {player}.',
  ],
  break: [
    '{player} breaks the line!',
    "Oh he's through! {player} slices them open!",
    '{player} busts it wide open for {team}!',
    'Line break! {player} is away!',
    '{player} steps and goes — huge break!',
  ],
  tackle: [
    '{player} pulled down short.',
    'Wrapped up by the {team} defence.',
    'Good tackle, held up on the spot.',
    'Brought down a metre out.',
  ],
  'big-hit': [
    'Bone-rattler from {player}!',
    '{player} lines him up and CRUNCH!',
    '{player} absolutely smashes him in that tackle!',
    'Massive shot from {player} — felt that one in the stands!',
    '{player} puts on a monster hit for {team}!',
  ],
  error: [
    '{player} spills it — turnover!',
    'Butterfingers! {player} coughs it up.',
    'Oh no, {player} knocks on. {team} lose it.',
    '{player} throws it to nobody — handling error!',
    'Dropped cold by {player}. Change of possession.',
  ],
  penalty: [
    'Penalty against the ruck — {team} get a shot.',
    'Whistle goes, {team} awarded the penalty.',
    'Ref pings them — advantage {team}.',
    'Penalty! {team} march downfield.',
  ],
  try: [
    'TRY! {player} plants it down for {team}!',
    '{player} busts through the line and scores!',
    'FOUR POINTS! {player} dives over in the corner!',
    'What a finish! {player} touches down for {team}!',
    '{player} crosses the stripe — try to {team}!',
  ],
  conversion: [
    'Conversion is GOOD — straight through the middle.',
    'And he slots the two! Extras added.',
    'Right between the sticks — conversion made.',
    'The kicker nails the conversion for {team}.',
  ],
  'penalty-goal': [
    'Penalty goal — two points to {team}.',
    'He takes the easy two, {team} on the board.',
    'Slots the penalty goal for {team}.',
    'Two more from the tee for {team}.',
  ],
  'field-goal': [
    'FIELD GOAL! {player} ices it for {team}!',
    'One-pointer! {player} drops it over!',
    'Cool as you like — {player} nails the field goal!',
    'The one-point play comes off for {team}!',
  ],
  'half-time': [
    "That's the half-time hooter.",
    'Half-time — a chance for a breather.',
    "We'll take a break there at the interval.",
    'The whistle goes for half-time.',
  ],
  'full-time': [
    "FULL-TIME! That's the match.",
    "And that's the game — full-time!",
    'The hooter sounds — full-time.',
    'Full-time, the result is in.',
  ],
};

const GENERIC_PLAYER = 'the ball-runner';

/**
 * Return a commentary line for `ev`, or '' for low-signal kinds. Variant chosen
 * deterministically via `rng()` (index into the kind's array), so a given seed
 * always reads the same. `{player}` falls back to a generic when `ev.player` is
 * absent. `{team}` resolves to `homeName` when `ev.teamId === homeId`, else
 * `awayName`. `homeId` is optional (additive to the spec signature); when omitted
 * the acting team defaults to the home name (kept for pure-signature callers).
 */
export function commentaryFor(
  ev: MatchEvent,
  homeName: string,
  awayName: string,
  rng: () => number,
  homeId?: string,
): string {
  const variants = TEMPLATES[ev.kind];
  if (!variants || variants.length === 0) return '';
  const idx = Math.min(variants.length - 1, Math.floor(rng() * variants.length));
  const template = variants[idx] as string;
  const isHome = homeId === undefined ? true : ev.teamId === homeId;
  const team = isHome ? homeName : awayName;
  const player = ev.player && ev.player.trim() !== '' ? ev.player : GENERIC_PLAYER;
  return template.replace(/\{player\}/g, player).replace(/\{team\}/g, team);
}

/** Number of non-empty template variants for a kind (test/introspection helper). */
export function variantCount(kind: MatchEventKind): number {
  return (TEMPLATES[kind] ?? []).length;
}
