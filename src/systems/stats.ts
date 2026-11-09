// GitHub #46: individual stats folded from the match event log, player of the
// match, club legend and season reviews. Pure builders + store operations/hooks. No RNG,
// ties broken by name.
import { getState, setState, type Player, type StatTally, type GameState, type Fixture, type PotmTally, type RivalClub, type SeasonReview } from '../core/state';
import { strengthChanges } from './league';
import { isFinalsRound, knockoutWinner, PLAYER_ID } from './fixtures';
import { registerSeasonHook } from '../core/time';
import type { MatchEvent, MatchResult } from '../sim/events';
import { hasTrait, withTrait } from '../data/traits';

export const LEGEND_SEASONS = 3;

export const emptyTally = (): StatTally => ({ games: 0, tries: 0, tackles: 0, lineBreaks: 0 });

/** Player-of-the-match weight per event kind (error is negative). */
const POTM_WEIGHT: Partial<Record<MatchEvent['kind'], number>> = {
  try: 5, break: 2, 'big-hit': 1.5, tackle: 0.3, fend: 0.5, 'break-tackle': 0.5,
  conversion: 1, 'penalty-goal': 1, 'field-goal': 1.5, error: -1, 'sin-bin': -2,
};

/** Per-name tallies for one team's events (games left at 0; callers add them). */
export function foldEvents(events: readonly MatchEvent[], teamId: string): Map<string, StatTally> {
  const out = new Map<string, StatTally>();
  for (const e of events) {
    if (e.teamId !== teamId || !e.player) continue;
    const t = out.get(e.player) ?? emptyTally();
    if (e.kind === 'try') t.tries++;
    else if (e.kind === 'tackle' || e.kind === 'big-hit') t.tackles++;
    else if (e.kind === 'break') t.lineBreaks++;
    else if (e.kind === 'sin-bin') t.sinBins = (t.sinBins ?? 0) + 1; // #71
    else continue;
    out.set(e.player, t);
  }
  return out;
}

export interface PlayerOfMatch {
  name: string; teamId: string; score: number; tries: number; tackles: number; lineBreaks: number;
}

/**
 * Highest weighted score among players on the winning side (either side on a
 * draw). Ties go to the alphabetically first name. Null when nobody acted.
 */
export function playerOfTheMatch(result: Pick<MatchResult, 'homeScore' | 'awayScore' | 'events'>,
  homeId: string, awayId: string): PlayerOfMatch | null {
  const winner = result.homeScore > result.awayScore ? homeId
    : result.awayScore > result.homeScore ? awayId : null;
  const scores = new Map<string, PlayerOfMatch>();
  for (const e of result.events) {
    if (!e.player || (winner && e.teamId !== winner)) continue;
    const w = POTM_WEIGHT[e.kind];
    if (w === undefined) continue;
    const key = `${e.teamId}|${e.player}`;
    const p = scores.get(key) ?? { name: e.player, teamId: e.teamId, score: 0, tries: 0, tackles: 0, lineBreaks: 0 };
    p.score += w;
    if (e.kind === 'try') p.tries++;
    else if (e.kind === 'tackle' || e.kind === 'big-hit') p.tackles++;
    else if (e.kind === 'break') p.lineBreaks++;
    scores.set(key, p);
  }
  let best: PlayerOfMatch | null = null;
  for (const p of scores.values()) {
    if (!best || p.score > best.score || (p.score === best.score && p.name < best.name)) best = p;
  }
  return best;
}

const add = (a: StatTally, b: StatTally): StatTally => ({
  games: a.games + b.games, tries: a.tries + b.tries,
  tackles: a.tackles + b.tackles, lineBreaks: a.lineBreaks + b.lineBreaks,
  // Sin bins (#71) only once a player has one, so older tallies keep their shape.
  ...(a.sinBins !== undefined || b.sinBins !== undefined ? { sinBins: (a.sinBins ?? 0) + (b.sinBins ?? 0) } : {}),
});

/**
 * Apply one match to the squad: every player in `playedIds` gets a game; events
 * (matched by name, squad-unique in practice) add tries/tackles/line breaks to
 * both career and the current season. Returns a new squad array.
 */
export function applyMatchStats(squad: readonly Player[], events: readonly MatchEvent[],
  teamId: string, playedIds: readonly string[], season: number): Player[] {
  const byName = foldEvents(events, teamId);
  const played = new Set(playedIds);
  return squad.map((p) => {
    const delta = { ...(byName.get(p.name) ?? emptyTally()), games: played.has(p.id) ? 1 : 0 };
    if (delta.games === 0 && delta.tries + delta.tackles + delta.lineBreaks + (delta.sinBins ?? 0) === 0) return p;
    const cur = p.seasonStats && p.seasonStats.season === season ? p.seasonStats : { ...emptyTally(), season };
    return {
      ...p,
      career: add(p.career ?? emptyTally(), delta),
      seasonStats: { ...add(cur, delta), season },
    };
  });
}

/** Season's top try-scorer (most tries, then name), or undefined when none scored. */
export function topTryScorer(squad: readonly Player[], season: number): { name: string; tries: number } | undefined {
  let best: { name: string; tries: number } | undefined;
  for (const p of squad) {
    const t = p.seasonStats && p.seasonStats.season === season ? p.seasonStats.tries : 0;
    if (t <= 0) continue;
    if (!best || t > best.tries || (t === best.tries && p.name < best.name)) best = { name: p.name, tries: t };
  }
  return best;
}

/** Stamp unseen players with their join season; award clubLegend after LEGEND_SEASONS. */
export function applyTenure(squad: readonly Player[], endedSeason: number, season: number): Player[] {
  return squad.map((p) => {
    const joined = p.joinedSeason ?? endedSeason;
    const legend = season - joined >= LEGEND_SEASONS && !hasTrait(p.traits, 'clubLegend');
    if (p.joinedSeason === joined && !legend) return p;
    return { ...p, joinedSeason: joined, traits: legend ? withTrait(p.traits, 'clubLegend') : p.traits };
  });
}

export function registerStatsSystem(): void {
  registerSeasonHook('stats-tenure', 12, () => {
    const s = getState();
    setState({ squad: applyTenure(s.squad, s.season - 1, s.season) });
  });
}

/** What the review needs from before the rollover's hooks run. */
export interface RolloverSnapshot {
  /** The season that is ending. */
  season: number;
  squad: { id: string; name: string; age: number }[];
  rivals: RivalClub[];
  reputation: number;
  /** How the club's finals ended; the fixtures are gone by the time the review is built. */
  finals?: SeasonReview['finals'];
}

/** `endedSeason`: the rollover has already moved the counter on when its hooks run, so the hook passes `season - 1`. */
export function snapshotBeforeRollover(s: Pick<GameState, 'season' | 'squad' | 'league' | 'reputation' | 'clubId'>, endedSeason: number = s.season): RolloverSnapshot {
  const finals = finalsRun(s.league.fixtures, s.clubId);
  return {
    season: endedSeason,
    squad: s.squad.map((p) => ({ id: p.id, name: p.name, age: p.age })),
    rivals: s.league.clubs.map((c) => ({ id: c.id, name: c.name, colors: c.colors, strength: c.strength })),
    reputation: s.reputation,
    ...(finals ? { finals } : {}),
  };
}

/** The club's last played finals tie and whether it won, or undefined when it played none (#351 E2). */
export function finalsRun(fixtures: readonly Fixture[], clubId: string): SeasonReview['finals'] {
  let last: Fixture | undefined;
  for (const f of fixtures) {
    if (!isFinalsRound(f.round) || !f.result || (f.homeId !== clubId && f.awayId !== clubId)) continue;
    if (!last || f.round > last.round) last = f;
  }
  return last ? { round: last.round, won: knockoutWinner(last) === clubId } : undefined;
}

/** How many movers the review names. */
export const MOVERS_SHOWN = 3;

/** The tally with one more award for `name` in `season` (a new season starts it over). */
export function addPotm(tally: PotmTally | undefined, season: number, name: string): PotmTally {
  const counts = tally && tally.season === season ? { ...tally.counts } : {};
  counts[name] = (counts[name] ?? 0) + 1;
  return { season, counts };
}

/** The season's awards: how many, and who took most (ties to the first name). */
export function potmSummary(tally: PotmTally | undefined, season: number): SeasonReview['potm'] | undefined {
  if (!tally || tally.season !== season) return undefined;
  let total = 0;
  let best: { name: string; count: number } | undefined;
  for (const [name, count] of Object.entries(tally.counts)) {
    total += count;
    if (!best || count > best.count || (count === best.count && name < best.name)) best = { name, count };
  }
  return total > 0 ? { total, ...(best ? { best } : {}) } : undefined;
}

/**
 * The review of `before.season`, read off the state as the rollover's hooks
 * (ageing, youth, fixtures, the board review) have left it and before the
 * board sets the new season's objectives.
 */
export function buildSeasonReview(before: RolloverSnapshot, after: GameState): SeasonReview {
  const ended = before.season;
  const review: SeasonReview = {};

  if (before.finals) review.finals = before.finals;

  const potm = potmSummary(after.potmTally, ended);
  if (potm) review.potm = potm;

  const reviewed = after.objectives.filter((o) => o.status !== 'pending');
  if (reviewed.length > 0) {
    const met = reviewed.filter((o) => o.status === 'met').length;
    review.board = {
      met,
      missed: reviewed.length - met,
      patience: after.boardPatience,
      sacked: after.sacked?.season === ended,
      objectives: reviewed.map((o) => ({ text: o.text, met: o.status === 'met' })),
    };
  }

  const books = after.finance.find((f) => f.season === ended);
  if (books) {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const [line, v] of Object.entries(books)) {
      if (line === 'season' || typeof v !== 'number') continue;
      if (v > 0) moneyIn += v;
      else moneyOut -= v;
    }
    review.money = { in: Math.round(moneyIn), out: Math.round(moneyOut) };
  }

  const stillHere = new Set(after.squad.map((p) => p.id));
  const retired = before.squad.filter((p) => !stillHere.has(p.id)).map((p) => ({ name: p.name, age: p.age + 1 }));
  if (retired.length > 0) review.retired = retired;

  const juniors = after.freeAgents.filter((p) => p.junior).length;
  if (juniors > 0) review.juniors = juniors;

  const movers = strengthChanges(before.rivals, after.league.clubs)
    .filter((c) => c.clubId !== after.clubId)
    .slice(0, MOVERS_SHOWN)
    .map((c) => ({ name: c.name, from: c.from, to: c.to }));
  if (movers.length > 0) review.movers = movers;

  review.reputation = { from: before.reputation, to: after.reputation };
  return review;
}

/** Install review hooks at the existing boot boundary; no new listeners or save timing. */
export function registerSeasonReview(): void {
  let snapshot: RolloverSnapshot | null = null;
  // Before ageing (5), youth (6), fixtures (10) and the board (10 / 20).
  registerSeasonHook('season-review-before', 1, ({ season }) => {
    snapshot = snapshotBeforeRollover(getState(), season - 1);
  });
  // After fixtures (10) and tenure (12), before the board's new objectives (20).
  registerSeasonHook('season-review', 15, () => {
    const s = getState();
    const before = snapshot;
    snapshot = null;
    if (!before) return;
    const i = s.history.findIndex((h) => h.season === before.season);
    if (i < 0) return;
    const review = buildSeasonReview(before, s);
    setState({ history: s.history.map((h, k) => (k === i ? { ...h, review } : h)) });
  });
}

/** Full-time award and its season tally. Called at the report's existing event position, before rollover. */
export function recordMatchAward(result: Pick<MatchResult, 'homeScore' | 'awayScore' | 'events'>,
  homeId: string, awayId: string): PlayerOfMatch | null {
  const p = playerOfTheMatch(result, homeId, awayId);
  const s = getState();
  if (p && p.teamId === PLAYER_ID) setState({ potmTally: addPotm(s.potmTally, s.season, p.name) });
  return p;
}
