// src/systems/lossReasons.ts — "Why did I lose?" on the match report (#368): two
// or three reasons for a loss, ranked, each pointing at the screen that fixes it
// (Lineup, Build or Recruit). Pure: read from the result, the two team sheets
// the match was played from and the club as it stands. A read after the fact,
// so it adds nothing to the sim (no events, no dice, no state).
//
// Each rule scores how far past its threshold the match went: 1 is just over,
// more is worse. Reasons over their threshold come first, biggest first; a loss
// with fewer than two tops up with the nearest misses, then a plain fallback.
import type { GameState } from '../core/state';
import type { MatchEvent, MatchResult, TeamSheet } from '../sim/events';
import { BENCH } from '../match/league/bench';
import { FACILITY_CATALOG } from '../data/facility';
import { LINEUP_SLOTS, positionFit } from './lineup';
import { squadStrength } from './rivals';

export type ReasonScreen = 'lineup' | 'build' | 'recruit';

export interface LossReason {
  text: string;
  screen: ReasonScreen;
  /** The button's words, e.g. "Find a strike player". */
  cta: string;
}

/** Out-gunned: their attack or defence rated this many points over ours. */
export const OUTGUNNED_GAP = 6;
/** Sloppy: this many more errors than them… */
export const ERROR_GAP = 3;
/** …or less of the ball than this (%). */
export const POSSESSION_FLOOR = 45;
/** Out of legs: their fitness rated this many points over ours. */
export const FITNESS_GAP = 8;
/** Out of legs: they scored this many more tries after half-time than before it. */
export const FADE_TRIES = 2;
/** Behind the league: the squad rated this far under the league's average strength… */
export const LEAGUE_GAP = 3;
/** …with fewer training facility levels than this par, plus one a season. */
export const TRAINING_LEVELS_PAR = 2;
/** Goal-kicking: their kicked goals over ours by this many points. */
export const KICK_POINTS_GAP = 4;
/** Reasons the report shows at most, and at least. */
export const MAX_REASONS = 3;
export const MIN_REASONS = 2;

interface Scored extends LossReason {
  score: number;
}

type Sheets = { home: TeamSheet; away: TeamSheet };
type ClubState = Pick<GameState, 'clubId' | 'squad' | 'lineup' | 'facilities' | 'league' | 'season'>;

/** Their side and ours from a fixture the club played, or null for one it didn't. */
function sides(fixture: { homeId: string; awayId: string }, clubId: string): { mine: 0 | 1; theirs: 0 | 1 } | null {
  if (fixture.homeId === clubId) return { mine: 0, theirs: 1 };
  if (fixture.awayId === clubId) return { mine: 1, theirs: 0 };
  return null;
}

function outgunned(us: TeamSheet, them: TeamSheet): Scored {
  const attack = them.attack - us.attack;
  const defence = them.defense - us.defense;
  return attack >= defence
    ? { score: attack / OUTGUNNED_GAP, screen: 'recruit', text: `Their attack rated ${them.attack} to your ${us.attack}`, cta: 'Find a strike player' }
    : { score: defence / OUTGUNNED_GAP, screen: 'recruit', text: `Their defence rated ${them.defense} to your ${us.defense}`, cta: 'Find a hard defender' };
}

function sloppy(result: MatchResult, mine: 0 | 1, theirs: 0 | 1): Scored {
  const errors = result.stats.errors[mine] - result.stats.errors[theirs];
  const ball = result.stats.possession[mine];
  const byErrors = errors / ERROR_GAP;
  // Whole percentages: one under the floor scores 1.
  const byBall = (50 - ball) / (50 - POSSESSION_FLOOR + 1);
  return byErrors >= byBall
    ? { score: byErrors, screen: 'lineup', text: `You made ${result.stats.errors[mine]} errors to their ${result.stats.errors[theirs]}`, cta: 'Pick surer hands' }
    : { score: byBall, screen: 'lineup', text: `You had ${ball}% of the ball`, cta: 'Change the plan' };
}

/** Their tries before and after the half-time whistle. */
function triesByHalf(events: readonly MatchEvent[], teamId: string): [number, number] {
  const half = events.find((e) => e.kind === 'half-time')?.t ?? Infinity;
  const tries = events.filter((e) => e.kind === 'try' && e.teamId === teamId);
  return [tries.filter((e) => e.t < half).length, tries.filter((e) => e.t >= half).length];
}

function outOfLegs(result: MatchResult, us: TeamSheet, them: TeamSheet): Scored {
  const [early, late] = triesByHalf(result.events, them.clubId);
  // A side that faded late makes any of these worse.
  const fade = late - early >= FADE_TRIES ? 0.5 : 0;
  const bench = us.bench?.length ?? 0;
  const fitness = them.fitness - us.fitness;
  if (us.rotation === 'off') return { score: 1 + fade, screen: 'lineup', text: 'Rotation was Off: no fresh legs off the bench', cta: 'Turn the rotation on' };
  if (bench < BENCH.size) return { score: 1 + fade, screen: 'lineup', text: `Only ${bench} on the bench to rotate`, cta: 'Fill the bench' };
  return { score: fitness / FITNESS_GAP + (fitness > 0 ? fade : 0), screen: 'lineup', text: `Their fitness rated ${them.fitness} to your ${us.fitness}`, cta: 'Rotate harder' };
}

/** A picked starter who missed the match, or a man out of position in the nine. */
function theNine(us: TeamSheet, state: ClubState): Scored {
  const byId = new Map(state.squad.map((p) => [p.id, p] as const));
  const played = new Set((us.roster ?? []).flatMap((r) => (r.id ? [r.id] : [])));
  const missed = state.lineup.starters.flatMap((id, slot) => {
    const p = id ? byId.get(id) : undefined;
    return p && !played.has(p.id) ? [{ name: p.name, slot: LINEUP_SLOTS[slot]!, banned: (p.suspendedWeeks ?? 0) > 0 }] : [];
  });
  // The sheet's roster carries each man at his slot's position: his own is in the squad.
  const odd = (us.roster ?? []).flatMap((r) => {
    const p = r.id ? byId.get(r.id) : undefined;
    const fit = p ? positionFit(p.position, r.position) : 1;
    return fit < 1 ? [{ name: p!.name, slot: r.position, weight: fit <= 0.8 ? 1 : 0.5 }] : [];
  });
  const oddScore = odd.reduce((n, o) => n + o.weight, 0);
  const missedScore = missed.length > 0 ? 1 + (missed.length - 1) * 0.25 : 0;
  if (missedScore >= oddScore && missed[0]) {
    const m = missed[0];
    const more = missed.length > 1 ? ` (and ${missed.length - 1} more)` : '';
    return { score: missedScore, screen: 'lineup', text: `Your ${m.slot} ${m.name} missed it ${m.banned ? 'banned' : 'injured'}${more}`, cta: 'Rework the nine' };
  }
  const o = odd.sort((a, b) => b.weight - a.weight)[0];
  return o
    ? { score: oddScore, screen: 'lineup', text: `${o.name} played ${o.slot} out of position${odd.length > 1 ? ` (and ${odd.length - 1} more)` : ''}`, cta: 'Fix the nine' }
    : { score: 0, screen: 'lineup', text: '', cta: '' };
}

/** Training facility levels built: every level of a facility that trains a stat. */
export function trainingLevels(state: Pick<GameState, 'facilities'>): number {
  return state.facilities.reduce((n, f) => n + (Object.keys(FACILITY_CATALOG[f.defId]?.trains ?? {}).length > 0 ? f.level : 0), 0);
}

function behindTheLeague(state: ClubState): Scored {
  const rivals = state.league.clubs.filter((c) => c.id !== state.clubId);
  const league = rivals.length ? Math.round(rivals.reduce((n, c) => n + c.strength, 0) / rivals.length) : 0;
  const ours = squadStrength(state.squad);
  const levels = trainingLevels(state);
  const par = TRAINING_LEVELS_PAR + state.season;
  const short = league - ours;
  // Both have to hold: a weak squad with a good training base is a recruiting job.
  const score = levels < par ? short / LEAGUE_GAP : 0;
  return { score, screen: 'build', text: `Your squad rates ${ours} to the league's ${league}, on ${levels} training level${levels === 1 ? '' : 's'}`, cta: 'Build training' };
}

function goalKicking(result: MatchResult, fixture: { homeId: string; awayId: string }, clubId: string): Scored {
  const theirId = fixture.homeId === clubId ? fixture.awayId : fixture.homeId;
  const goals = (id: string): { made: number; taken: number } => {
    const kicks = result.events.filter((e) => e.teamId === id && (e.kind === 'conversion' || e.kind === 'penalty-goal'));
    return { made: kicks.filter((e) => e.detail === 'good').length, taken: kicks.length };
  };
  const us = goals(clubId);
  const them = goals(theirId);
  const gap = (them.made - us.made) * 2;
  const margin = Math.abs(result.homeScore - result.awayScore);
  // The kicks alone were the difference: worse.
  const decisive = gap >= margin && gap > 0 ? 0.5 : 0;
  return {
    score: gap / KICK_POINTS_GAP + decisive,
    screen: 'lineup',
    text: `You kicked ${us.made} from ${us.taken} at goal, they kicked ${them.made} from ${them.taken}`,
    cta: 'Pick a new kicker',
  };
}

/** The plain words a loss gets when nothing stood out. */
const FALLBACK: readonly LossReason[] = [
  { text: 'A tight one: small margins in the plan', screen: 'lineup', cta: 'Tweak the plan' },
  { text: 'A stronger squad wins these', screen: 'recruit', cta: 'Scout players' },
];

/**
 * Why the club lost (#368): 2–3 reasons, most telling first, or none for a win,
 * a draw or a match the club wasn't in. `sheets` are the two sides as they ran
 * out (match:started); `state` is the club now.
 */
export function lossReasons(
  result: MatchResult,
  fixture: { homeId: string; awayId: string },
  sheets: Sheets,
  state: ClubState,
): LossReason[] {
  const s = sides(fixture, state.clubId);
  if (!s) return [];
  const scores = [result.homeScore, result.awayScore];
  if (scores[s.mine]! >= scores[s.theirs]!) return [];
  const us = s.mine === 0 ? sheets.home : sheets.away;
  const them = s.mine === 0 ? sheets.away : sheets.home;
  const all: Scored[] = [
    outgunned(us, them),
    sloppy(result, s.mine, s.theirs),
    outOfLegs(result, us, them),
    theNine(us, state),
    behindTheLeague(state),
    goalKicking(result, fixture, state.clubId),
  ].sort((a, b) => b.score - a.score);
  const fired = all.filter((r) => r.score >= 1);
  const near = all.filter((r) => r.score > 0 && r.score < 1);
  const picked: LossReason[] = [...fired, ...(fired.length < MIN_REASONS ? near : [])]
    .slice(0, MAX_REASONS)
    .map(({ text, screen, cta }) => ({ text, screen, cta }));
  for (const f of FALLBACK) {
    if (picked.length >= MIN_REASONS) break;
    if (!picked.some((p) => p.cta === f.cta)) picked.push(f);
  }
  return picked;
}
