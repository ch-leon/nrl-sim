// GitHub #46: individual stats folded from the match event log, player of the
// match, club legend. Pure functions + one season hook. Deterministic: no RNG,
// ties broken by name.
import { getState, setState, type Player, type StatTally } from '../core/state';
import { registerSeasonHook } from '../core/time';
import type { MatchEvent, MatchResult } from '../sim/events';
import { hasTrait, withTrait } from '../data/traits';

export const LEGEND_SEASONS = 3;

export const emptyTally = (): StatTally => ({ games: 0, tries: 0, tackles: 0, lineBreaks: 0 });

/** Player-of-the-match weight per event kind (error is negative). */
const POTM_WEIGHT: Partial<Record<MatchEvent['kind'], number>> = {
  try: 5, break: 2, 'big-hit': 1.5, tackle: 0.3, fend: 0.5, 'break-tackle': 0.5,
  conversion: 1, 'penalty-goal': 1, 'field-goal': 1.5, error: -1,
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
    if (delta.games === 0 && delta.tries + delta.tackles + delta.lineBreaks === 0) return p;
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
