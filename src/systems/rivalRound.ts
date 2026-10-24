// src/systems/rivalRound.ts — the rival-v-rival fixtures of a round played on
// the live match sim (N9.2), so the whole league is on one engine. Off by
// default (`settings.liveRivals`): each match costs about 300 ms headless, so a
// round of seven runs off the main thread (matchWorker.ts) while the player
// watches his own match, and the week waits for both. Fast-forward keeps the
// cheap sim (fixtures.ts, on the live sim's scale). Pure apart from the Worker
// glue at the bottom: jobs from state, results back into state.
import type { GameState, RivalClub } from '../core/state';
import type { MatchResult, TeamSheet, WeatherKind } from '../sim/events';
import type { Rng } from '../utils/rng';
import { ON_FIELD, SEASON_ROUNDS } from '../config';
import { canUseWorker, playMatchJob, playMatchesInWorker, type MatchJob } from './matchJobs';
import { aiCoachSides } from '../match/league/calls';
import { teamSheetFromRival, teamSheetFromSquad, withRivalStyle } from '../match/league/sheets';
import type { TeamTactics } from '../match/league/presets';
import { autoPick, resolveLineup } from './lineup';
import { applyMatchStats } from './stats';
import { injureRivalPlayers } from './rivals';

/** One rival fixture to play: the sheets, the seed and the day's weather. */
export interface RivalJob {
  round: number;
  homeId: string;
  awayId: string;
  home: TeamSheet;
  away: TeamSheet;
  seed: number;
  weather: WeatherKind;
  /** Sides with an AI coach (N9.6): both, on Hard (N14.1). */
  aiCoach: ('home' | 'away')[];
  /** Sides whose plan changes at the breaks (N13.5): both, in a rival-v-rival game (N14.1). */
  breakRuleSides: ('home' | 'away')[];
  /** A final (N9.4): golden point if level at full time. */
  goldenPoint: boolean;
}

/**
 * A rival's side for a match against another rival: its own fit players
 * through the sheet builder with its coach's auto-pick (#69, #74), or the
 * strength-built sheet when it has fewer than nine fit. Its style follows from
 * the nine it fields (N11). No difficulty scaling: that is for the sides the
 * player faces.
 */
export function rivalSheet(club: RivalClub): TeamSheet {
  const fit = (club.squad ?? []).filter((p) => p.injuredWeeks <= 0);
  if (fit.length >= ON_FIELD) return withRivalStyle(teamSheetFromSquad(fit, club.id, club.name, club.colors, resolveLineup(autoPick(fit), fit)), club);
  return teamSheetFromRival(club);
}

/** How a rival plays this week (N11): the style of the nine it would field today, for the next-match card, its squad page and the ladder. */
export function rivalStyle(club: RivalClub): TeamTactics {
  return rivalSheet(club).tactics ?? { attack: 'balanced', defence: 'slide' };
}

/** The round's unplayed rival-v-rival fixtures as jobs, one seed each from `rng` in fixture order. */
export function rivalJobs(state: GameState, rng: Rng, playerId: string): RivalJob[] {
  const round = state.week;
  const byId = new Map(state.league.clubs.map((c) => [c.id, c] as const));
  const jobs: RivalJob[] = [];
  for (const f of state.league.fixtures) {
    if (f.round !== round || f.result || f.homeId === playerId || f.awayId === playerId) continue;
    const home = byId.get(f.homeId);
    const away = byId.get(f.awayId);
    if (!home || !away) continue;
    jobs.push({
      round, homeId: f.homeId, awayId: f.awayId, home: rivalSheet(home), away: rivalSheet(away),
      seed: rng.int(1, 2 ** 31), weather: state.weather ?? 'clear',
      // Both sides change plan at the breaks. Hard gives both an AI coach; Normal and Easy do not (N14.1).
      aiCoach: aiCoachSides(['home', 'away'], state.settings.difficulty === 'hard'),
      breakRuleSides: ['home', 'away'],
      goldenPoint: round > SEASON_ROUNDS,
    });
  }
  return jobs;
}

/** Play one job on the live sim, headless. */
export function playRivalJob(job: RivalJob): MatchResult {
  return playMatchJob(rivalMatchJob(job));
}

/** How many break-rule plan changes a rival-v-rival result carried (N14.2). */
export interface RivalPlanChangeNote {
  round: number;
  homeId: string;
  awayId: string;
  switches: number;
}

const planChangeListeners = new Set<(n: RivalPlanChangeNote) => void>();

/**
 * Told each rival-v-rival result as it lands. The soak counts switches here.
 * Nothing is written onto the fixture or the save: a result stays the two scores.
 */
export function onRivalPlanChanges(fn: (n: RivalPlanChangeNote) => void): () => void {
  planChangeListeners.add(fn);
  return () => { planChangeListeners.delete(fn); };
}

function notePlanChanges(job: RivalJob, result: MatchResult): void {
  if (planChangeListeners.size === 0) return;
  const note: RivalPlanChangeNote = {
    round: job.round, homeId: job.homeId, awayId: job.awayId,
    switches: result.planChanges?.length ?? 0,
  };
  for (const fn of planChangeListeners) fn(note);
}

/**
 * The round's results into the league: each score through `applyResult`
 * (ladder or finals stamp), the injuries onto the rivals' squads, and the
 * players' match stats (games, tries, tackles, line breaks) onto their records.
 * Plan changes are counted for a listener and then dropped.
 */
export function applyRivalResults(
  state: GameState,
  jobs: readonly RivalJob[],
  results: readonly MatchResult[],
  applyResult: (s: GameState, f: GameState['league']['fixtures'][number], r: { homeScore: number; awayScore: number }) => GameState,
): GameState {
  let next = state;
  jobs.forEach((job, i) => {
    const r = results[i];
    if (!r) return;
    const f = next.league.fixtures.find((x) => x.round === job.round && x.homeId === job.homeId && x.awayId === job.awayId);
    if (!f || f.result) return;
    notePlanChanges(job, r);
    next = applyResult(next, f, { homeScore: r.homeScore, awayScore: r.awayScore });
    let clubs = injureRivalPlayers(next.league.clubs, r.injuries.filter((x) => x.playerId));
    clubs = clubs.map((c) => {
      const sheet = c.id === job.homeId ? job.home : c.id === job.awayId ? job.away : null;
      if (!sheet || !c.squad) return c;
      const played = (sheet.roster ?? []).flatMap((p) => (p.id ? [p.id] : []));
      return { ...c, squad: applyMatchStats(c.squad, r.events, c.id, played, next.season) };
    });
    next = { ...next, league: { ...next.league, clubs } };
  });
  return next;
}

// ── Off the main thread ─────────────────────────────────────────────────────

/** A rival job as a match job for the shared worker (matchJobs.ts, N10.3). */
export function rivalMatchJob(job: RivalJob): MatchJob {
  return { home: job.home, away: job.away, opts: { seed: job.seed, weather: job.weather, aiCoach: job.aiCoach, breakRuleSides: job.breakRuleSides, goldenPoint: job.goldenPoint } };
}

/** How long the worker gets before the round is played on the main thread instead (ms): a phone-speed worker needs about 30 s for the round (#216), so this only catches one that has hung. */
export const RIVAL_WORKER_TIMEOUT_MS = 120_000;

/** Play the jobs in a Web Worker; on any failure or silence, play them here instead. */
export function playRivalJobsInWorker(jobs: readonly RivalJob[], timeoutMs = RIVAL_WORKER_TIMEOUT_MS): Promise<MatchResult[]> {
  return playMatchesInWorker(jobs.map(rivalMatchJob), timeoutMs);
}

export { canUseWorker };
