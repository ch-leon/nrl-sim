// src/match/league/match.ts — a whole match on the live sim, headless, to full
// time (BAK-207 §3.5, §5.1 2a). Returns the same MatchResult the old engine
// does, so the season, ladder, player stats and overlay can take it as is.
// Event minutes are Nines minutes (0–18) off the match clock.
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import { applyMomentumEvent, decayMomentum } from '../../sim/weather';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import type { CallInput } from './calls';
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
  /** Coach calls by tick (#73): the match as the player called it. */
  calls?: CallInput[];
}

/** No real match comes near this many ticks (about 80 minutes of sim time); it only guards against a sim that never finishes. */
const MAX_TICKS = 100_000;

/**
 * Builds a match's MatchResult as it plays: the contract's events off each
 * tick's sim events, the momentum line, the stats at the end. runMatch uses it
 * headless; the live match screen uses it as the player watches (coach calls
 * #73: the match on screen is the match), so the two agree exactly.
 */
export class MatchRecorder {
  readonly events: MatchEvent[] = [];
  private momentum = 0;
  private readonly momentumTimeline = [{ t: 0, value: 0 }];
  private minute = 0;

  constructor(private readonly ids: Record<Side, string>) {}

  /** A tick's sim events, read off the snapshot taken after it: the contract events they make. */
  add(es: readonly SimEvent[], snap: Snapshot): MatchEvent[] {
    const out: MatchEvent[] = [];
    for (const e of es) {
      const ev = toMatchEvent(e, snap, this.ids);
      if (!ev) continue;
      out.push(ev);
      this.events.push(ev);
      if (ev.kind === 'try' || ev.kind === 'big-hit' || ev.kind === 'error') this.momentum = applyMomentumEvent(this.momentum, ev.kind, ev.teamId === this.ids.home);
      else if (ev.kind === 'set-start') this.momentum = decayMomentum(this.momentum);
    }
    return out;
  }

  /** Every tick, the match clock: the momentum line takes a reading each minute. */
  clock(matchSeconds: number): void {
    const m = Math.floor(matchSeconds / 60);
    if (m > this.minute) {
      this.minute = m;
      this.momentumTimeline.push({ t: m, value: Math.round(this.momentum) });
    }
  }

  /** The result at full time. */
  result(sim: LiveSim): MatchResult {
    return {
      homeScore: sim.points.home,
      awayScore: sim.points.away,
      events: this.events,
      stats: tallyStats(this.events, this.ids.home),
      weather: sim.weather,
      momentumTimeline: this.momentumTimeline,
      injuries: [...sim.injuries],
    };
  }
}

/** Play a match to full time and report it. Same sheets and seed, same result. */
export function runMatch(home: TeamSheet, away: TeamSheet, opts: RunMatchOptions): MatchResult {
  const sim = new LiveSim(home, away, opts.seed, {
    ...(opts.length ? { length: opts.length } : {}),
    ...(opts.weather ? { weather: opts.weather } : {}),
    ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}),
    ...(opts.calls ? { calls: opts.calls } : {}),
  });
  const rec = new MatchRecorder({ home: home.clubId, away: away.clubId });
  while (!sim.finished) {
    if (sim.tick >= MAX_TICKS) throw new Error(`runMatch: seed ${opts.seed} did not finish in ${MAX_TICKS} ticks`);
    sim.step();
    const es = sim.tickEvents;
    if (es.length) rec.add(es, sim.snapshot());
    rec.clock(sim.matchSeconds);
  }
  return rec.result(sim);
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
