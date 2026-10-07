// src/sim/staging.ts — presentation staging for the raw match event log.
//
// The engine (engine.ts) reasons in ATTACKER-RELATIVE field position (0 = the
// attacking side's own line, 100 = the line they attack) and has no notion of
// width or individual players. Playback and commentary need more: absolute
// positions so both teams play the right way, lateral movement so the ball
// isn't glued to the centre line, and a named actor for each beat.
//
// `stageEvents` adds that, as a post-pass over the engine's log in append order:
//   - x → absolute: 0 = home's own try-line, 100 = away's try-line (home attacks
//     toward 100). big-hit events carry the DEFENDING teamId but an attacker-
//     relative x, so they convert using the current set's attacker.
//   - y → 5..95, drifting within a set (runs nudge, breaks swing wide, tries
//     often finish toward a wing; conversions are taken in line with the try).
//   - player → a roster name chosen by event kind and position (forwards carry
//     and hit, backs break and score, the team's kicker kicks).
//   - set-start detail → 'turnover' (after an error), 'kick' (6th-tackle kick)
//     or 'restart' (after points) when possession changes hands.
//
// Uses its OWN rng stream derived from the match seed, so staging never shifts
// the engine's outcome rolls: scores/results are identical with or without it.
import { makeRng, type Rng } from '../utils/rng';
import { randomName } from '../data/names';
import type { Position } from '../core/state';
import type { MatchEvent, TeamSheet, RosterEntry } from './events';

// Standard 1-13 positions, used when a sheet has no roster (rival clubs).
export const STANDARD_POSITIONS: readonly Position[] = [
  'fullback', 'winger', 'centre', 'centre', 'winger', 'five-eighth', 'halfback',
  'prop', 'hooker', 'prop', 'second-row', 'second-row', 'lock',
];

const FORWARDS: ReadonlySet<Position> = new Set(['prop', 'hooker', 'second-row', 'lock']);
const BACKS: ReadonlySet<Position> = new Set(['fullback', 'winger', 'centre']);
const HALVES: ReadonlySet<Position> = new Set(['five-eighth', 'halfback']);

const Y_MIN = 5;
const Y_MAX = 95;
const clampY = (y: number): number => Math.max(Y_MIN, Math.min(Y_MAX, Math.round(y)));

// Small deterministic string hash (FNV-1a) for per-club roster seeding.
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * A deterministic 13-man roster for a club without real players (rivals). Same
 * clubId → same names every match, so rival players become familiar.
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

// Weighted pick: entries matching `prefer` are `weight`× more likely.
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
 * Stage a raw engine log (append order, attacker-relative x, y=50, no players)
 * for presentation. Returns new event objects; the input is not mutated.
 */
export function stageEvents(
  raw: readonly MatchEvent[],
  home: TeamSheet,
  away: TeamSheet,
  seed: number,
): MatchEvent[] {
  // Independent stream: XOR-salted so it never mirrors the engine's rng.
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
            : prevKind === 'conversion' || prevKind === 'penalty-goal' ? 'restart'
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
        // Breaks swing toward an edge.
        laneY += (laneY < 50 ? -1 : 1) * (10 + rng.next() * 20);
        player = pickWeighted(rng, roster, (p) => BACKS.has(p) || HALVES.has(p), 3);
        break;
      case 'big-hit':
      case 'tackle':
        // teamId is the tackling side; position follows the carrier's set.
        laneY += (rng.next() - 0.5) * 10;
        player = pickWeighted(rng, roster, (p) => FORWARDS.has(p), 3);
        break;
      case 'error':
        player = pickWeighted(rng, roster, () => true, 1);
        break;
      case 'try':
        // Half of tries finish out wide; the rest where the play was.
        if (rng.next() < 0.5) laneY = laneY < 50 ? 8 + rng.next() * 12 : 80 + rng.next() * 12;
        lastTryY = laneY;
        player = pickWeighted(rng, roster, (p) => BACKS.has(p), 4);
        break;
      case 'conversion':
        laneY = lastTryY; // taken in line with where the try was scored
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
      // big-hit/tackle: x is relative to the set's carrier side, not teamId.
      const relAttacker = ev.kind === 'big-hit' || ev.kind === 'tackle' ? setAttacker : ev.teamId;
      e.x = ev.kind === 'kickoff' ? 50 : Math.max(0, Math.min(100, toAbsX(ev.x, relAttacker)));
      e.y = ev.kind === 'kickoff' ? 50 : laneY;
    }
    if (player !== undefined) e.player = player;
    prevKind = ev.kind === 'set-start' ? prevKind : ev.kind;
    out.push(e);
  }
  return out;
}
