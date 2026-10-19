// src/sim/staging.ts — presentation staging for the raw match event log.
//
// The engine (engine.ts) reasons in ATTACKER-RELATIVE field position (0 = the
// attacking side's own line, 100 = the line they attack). Playback needs
// absolute x, lateral y, and (when the engine didn't already name an actor)
// a roster fallback. BAK-206: engine usually sets `player` for contest/kick
// events; staging preserves those names.
//
// Uses its OWN rng stream derived from the match seed, so staging never shifts
// the engine's outcome rolls.
import { makeRng, type Rng } from '../utils/rng';
import { randomName } from '../data/names';
import type { Position } from '../core/state';
import { ON_FIELD } from '../config';
import type { MatchEvent, TeamSheet, RosterEntry } from './events';

/** Nines on-field positions (BAK-206). Used when a sheet has no roster. */
export const STANDARD_POSITIONS: readonly Position[] = [
  'fullback',
  'winger',
  'winger',
  'centre',
  'five-eighth',
  'halfback',
  'hooker',
  'prop',
  'second-row',
];

const FORWARDS: ReadonlySet<Position> = new Set(['prop', 'hooker', 'second-row', 'lock']);
const BACKS: ReadonlySet<Position> = new Set(['fullback', 'winger', 'centre']);
const HALVES: ReadonlySet<Position> = new Set(['five-eighth', 'halfback']);

const Y_MIN = 5;
const Y_MAX = 95;
const clampY = (y: number): number => Math.max(Y_MIN, Math.min(Y_MAX, Math.round(y)));

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * A deterministic ON_FIELD roster for a club without real players (rivals).
 * Same clubId → same names every match.
 */
export function generatedRoster(clubId: string): RosterEntry[] {
  const rng = makeRng(hashString(`roster:${clubId}`));
  const used = new Set<string>();
  return STANDARD_POSITIONS.map((position) => {
    let name = randomName(rng);
    for (let guard = 0; used.has(name) && guard < 20; guard++) name = randomName(rng);
    used.add(name);
    return { name, position };
  });
}

/** A generated bench's positions: two forwards, a back and a half (BAK-207 2b). */
export const BENCH_POSITIONS: readonly Position[] = ['prop', 'second-row', 'centre', 'halfback'];

/**
 * A deterministic interchange bench for a club without real players, named
 * apart from its starters. Its own rng stream, so the starters never change.
 */
export function generatedBench(clubId: string, starters: readonly RosterEntry[] = generatedRoster(clubId)): RosterEntry[] {
  const rng = makeRng(hashString(`bench:${clubId}`));
  const used = new Set(starters.map((r) => r.name));
  return BENCH_POSITIONS.map((position) => {
    let name = randomName(rng);
    for (let guard = 0; used.has(name) && guard < 20; guard++) name = randomName(rng);
    used.add(name);
    return { name, position };
  });
}

/** Roster for a sheet: its real one if present and non-empty, else generated. */
export function rosterFor(sheet: TeamSheet): RosterEntry[] {
  return sheet.roster && sheet.roster.length > 0 ? sheet.roster : generatedRoster(sheet.clubId);
}

/** The team's goal-kicker: first halfback, else five-eighth, else first listed. */
export function kickerOf(roster: readonly RosterEntry[]): RosterEntry | undefined {
  return (
    roster.find((p) => p.position === 'halfback') ??
    roster.find((p) => p.position === 'five-eighth') ??
    roster[0]
  );
}

function pickWeighted(
  rng: Rng,
  roster: readonly RosterEntry[],
  prefer: (p: Position) => boolean,
  weight: number,
): string | undefined {
  if (roster.length === 0) return undefined;
  const ws = roster.map((p) => (prefer(p.position) ? weight : 1));
  let r = rng.next() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < roster.length; i++) {
    r -= ws[i] ?? 0;
    if (r < 0) return roster[i]?.name;
  }
  return roster[roster.length - 1]?.name;
}

/**
 * Stage a raw engine log for presentation. Preserves engine-set `player` names.
 * Returns new event objects; the input is not mutated.
 */
export function stageEvents(
  raw: readonly MatchEvent[],
  home: TeamSheet,
  away: TeamSheet,
  seed: number,
): MatchEvent[] {
  const rng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const rosters = new Map<string, RosterEntry[]>([
    [home.clubId, rosterFor(home)],
    [away.clubId, rosterFor(away)],
  ]);
  const kickers = new Map<string, string | undefined>(
    [...rosters].map(([id, r]) => [id, kickerOf(r)?.name]),
  );
  const isHome = (teamId: string): boolean => teamId === home.clubId;
  const toAbsX = (relX: number, attackerId: string): number =>
    isHome(attackerId) ? relX : 100 - relX;

  let setAttacker = home.clubId;
  let laneY = 50;
  let lastTryY = 50;
  let prevSetTeam: string | undefined;
  let prevKind: MatchEvent['kind'] | undefined;

  const out: MatchEvent[] = [];
  for (const ev of raw) {
    const e: MatchEvent = { ...ev };
    let player: string | undefined;
    const roster = rosters.get(ev.teamId) ?? [];

    switch (ev.kind) {
      case 'kickoff':
        laneY = 50;
        break;
      case 'set-start': {
        setAttacker = ev.teamId;
        laneY = 25 + rng.next() * 50;
        if (prevSetTeam !== undefined && prevSetTeam !== ev.teamId) {
          e.detail =
            prevKind === 'error' ? 'turnover'
            : prevKind === 'conversion' || prevKind === 'penalty-goal' || prevKind === 'try'
              ? 'restart'
            : prevKind === 'kick' ? 'kick'
            : 'kick';
        }
        prevSetTeam = ev.teamId;
        break;
      }
      case 'run':
        laneY += (rng.next() - 0.5) * 24;
        player = pickWeighted(rng, roster, (p) => FORWARDS.has(p), 3);
        break;
      case 'break':
      case 'break-tackle':
      case 'fend':
        laneY += (laneY < 50 ? -1 : 1) * (8 + rng.next() * 18);
        player = pickWeighted(rng, roster, (p) => BACKS.has(p) || HALVES.has(p), 3);
        break;
      case 'big-hit':
      case 'tackle':
        laneY += (rng.next() - 0.5) * 10;
        player = pickWeighted(rng, roster, (p) => FORWARDS.has(p), 3);
        break;
      case 'error':
        player = pickWeighted(rng, roster, () => true, 1);
        break;
      case 'kick':
        // Bombs/grubbers drift wide; find-touch stays central-ish.
        if (ev.detail === 'bomb' || ev.detail === 'grubber' || ev.detail === 'chip') {
          laneY += (laneY < 50 ? -1 : 1) * (12 + rng.next() * 20);
        } else {
          laneY += (rng.next() - 0.5) * 16;
        }
        player = kickers.get(ev.teamId);
        break;
      case 'try':
        if (rng.next() < 0.5) laneY = laneY < 50 ? 8 + rng.next() * 12 : 80 + rng.next() * 12;
        lastTryY = laneY;
        player = pickWeighted(rng, roster, (p) => BACKS.has(p), 4);
        break;
      case 'conversion':
        laneY = lastTryY;
        player = kickers.get(ev.teamId);
        break;
      case 'penalty-goal':
      case 'field-goal':
        player = kickers.get(ev.teamId);
        break;
      default:
        break;
    }

    laneY = clampY(laneY);
    if (ev.x !== undefined) {
      const relAttacker =
        ev.kind === 'big-hit' || ev.kind === 'tackle' ? setAttacker : ev.teamId;
      e.x = ev.kind === 'kickoff' ? 50 : Math.max(0, Math.min(100, toAbsX(ev.x, relAttacker)));
      e.y = ev.kind === 'kickoff' ? 50 : laneY;
    }
    // Prefer engine-assigned actors; fall back to staging pick.
    if (ev.player !== undefined && ev.player.trim() !== '') e.player = ev.player;
    else if (player !== undefined) e.player = player;
    prevKind = ev.kind === 'set-start' ? prevKind : ev.kind;
    out.push(e);
  }

  // Sanity: generated rosters are ON_FIELD-sized (helps catch drift in tests).
  void ON_FIELD;
  return out;
}
