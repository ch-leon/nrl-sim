// src/match/league/match.ts — a whole match on the live sim, headless, to full
// time (BAK-207 §3.5, §5.1 2a). Returns the same MatchResult the old engine
// does, so the season, ladder, player stats and overlay can take it as is.
// Event minutes are Nines minutes (0–18) off the match clock.
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import { applyMomentumEvent, decayMomentum } from '../../sim/weather';
import type { Side } from '../core/snapshot';
import { toMatchEvent } from './events';
import { LiveSim } from './live';
import type { MatchLength } from './rules';

export interface RunMatchOptions {
  seed: number;
  /** Rain and wind change handling and kicking (2f); clear unless told. */
  weather?: WeatherKind;
  /** Multiplier on big-hit injury chance (the difficulty's, as the old engine takes it). */
  injuryRate?: number;
  /** Two Nines halves unless told otherwise. */
  length?: MatchLength;
}

/** No real match comes near this many ticks (about 80 minutes of sim time); it only guards against a sim that never finishes. */
const MAX_TICKS = 100_000;

/** Play a match to full time and report it. Same sheets and seed, same result. */
export function runMatch(home: TeamSheet, away: TeamSheet, opts: RunMatchOptions): MatchResult {
  const sim = new LiveSim(home, away, opts.seed, {
    ...(opts.length ? { length: opts.length } : {}),
    ...(opts.weather ? { weather: opts.weather } : {}),
    ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}),
  });
  const ids: Record<Side, string> = { home: home.clubId, away: away.clubId };
  const events: MatchEvent[] = [];
  let momentum = 0;
  const momentumTimeline = [{ t: 0, value: 0 }];
  let minute = 0;
  while (!sim.finished) {
    if (sim.tick >= MAX_TICKS) throw new Error(`runMatch: seed ${opts.seed} did not finish in ${MAX_TICKS} ticks`);
    sim.step();
    const es = sim.tickEvents;
    if (es.length) {
      const snap = sim.snapshot();
      for (const e of es) {
        const ev = toMatchEvent(e, snap, ids);
        if (!ev) continue;
        events.push(ev);
        if (ev.kind === 'try' || ev.kind === 'big-hit' || ev.kind === 'error') momentum = applyMomentumEvent(momentum, ev.kind, ev.teamId === ids.home);
        else if (ev.kind === 'set-start') momentum = decayMomentum(momentum);
      }
    }
    const m = Math.floor(sim.matchSeconds / 60);
    if (m > minute) {
      minute = m;
      momentumTimeline.push({ t: m, value: Math.round(momentum) });
    }
  }
  return {
    homeScore: sim.points.home,
    awayScore: sim.points.away,
    events,
    stats: tallyStats(events, ids.home),
    weather: sim.weather,
    momentumTimeline,
    injuries: [...sim.injuries],
  };
}

/**
 * The result's stats, counted from its own event log the way the match overlay
 * counts them as they happen (reduceEvent, ui/screens/matchOverlay.ts), so the
 * two always agree: tries and errors by the side named; a "tackle" is one carry
 * of the side in possession (ended by a tackle, a bust or a fend); possession
 * is each side's share of those carries.
 */
export function tallyStats(events: readonly MatchEvent[], homeId: string): MatchResult['stats'] {
  const tries: [number, number] = [0, 0];
  const errors: [number, number] = [0, 0];
  const tackles: [number, number] = [0, 0];
  let prevBigHit = false;
  for (const ev of events) {
    const i = ev.teamId === homeId ? 0 : 1;
    const them = i === 0 ? 1 : 0;
    if (ev.kind === 'try') tries[i]++;
    if (ev.kind === 'error') errors[i]++;
    if (ev.kind === 'set-start') prevBigHit = false;
    else if (ev.kind === 'run' || ev.kind === 'break' || ev.kind === 'fend' || ev.kind === 'break-tackle' || ev.kind === 'penalty') {
      tackles[i]++;
      prevBigHit = false;
    } else if (ev.kind === 'big-hit' || ev.kind === 'tackle') {
      // Named for the defender; the carry was the other side's.
      tackles[them]++;
      prevBigHit = ev.kind === 'big-hit';
    } else if (ev.kind === 'error') {
      if (!prevBigHit) tackles[i]++;
      prevBigHit = false;
    } else prevBigHit = false;
  }
  const sum = tackles[0] + tackles[1];
  const home = sum === 0 ? 50 : Math.round((tackles[0] / sum) * 100);
  return { possession: [home, 100 - home], tackles, errors, tries };
}
