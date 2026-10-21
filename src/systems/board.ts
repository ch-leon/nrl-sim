// src/systems/board.ts — board objectives, season review and the sacking state
// (GitHub #47, part of #49). Pure functions plus one season hook. Deterministic:
// objectives come from a private RNG seeded by season + club count, so the same
// state always yields the same goals and the main rngSeed stream is untouched.
import { getState, setState, type GameState, type Objective } from '../core/state';
import { bus } from '../core/events';
import { registerSeasonHook } from '../core/time';
import { earnMoney } from '../data/club';
import { makeRng } from '../utils/rng';
import { BOARD, PRIZE } from '../config';
import { repayBoardLoan } from './contracts';

/** Facts about the season just played, supplied by the fixtures season hook. */
export interface SeasonOutcome {
  ladderPosition: number;
  /** Final regular-season ladder position of every club, by id (1 = top). */
  positions: Readonly<Record<string, number>>;
  /** Finals matches the player club played this season. */
  finalsPlayed: number;
  playedGrandFinal: boolean;
  premiership: boolean;
}

const ordinal = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`;
};

/** Finals prize money for a season (0 if the club missed the finals). */
export function finalsPrize(o: Pick<SeasonOutcome, 'finalsPlayed' | 'playedGrandFinal' | 'premiership'>): number {
  return o.finalsPlayed * PRIZE.PER_FINALS_WEEK
    + (o.playedGrandFinal ? PRIZE.GRAND_FINAL : 0)
    + (o.premiership ? PRIZE.PREMIERSHIP : 0);
}

/** Ladder position the board demands: tighter for famous clubs, looser on Easy. */
export function finalsTarget(state: Pick<GameState, 'reputation' | 'settings'>): number {
  const shift = state.settings.difficulty === 'easy' ? 1 : state.settings.difficulty === 'hard' ? -1 : 0;
  return Math.max(3, Math.min(12, Math.round(12 - state.reputation / 10) + shift));
}

/**
 * The board's 2–3 goals for `state.season`: always a finals target and a
 * solvency floor; clubs with reputation ≥ 25 get a third (rival or build).
 */
export function generateObjectives(state: GameState): Objective[] {
  const rng = makeRng(state.season * 7919 + state.league.clubs.length * 31 + 17);
  const season = state.season;
  const top = finalsTarget(state);
  const floor = BOARD.SOLVENT_FLOOR[state.settings.difficulty ?? 'normal'];
  const out: Objective[] = [
    { id: `s${season}-finals`, kind: 'finals', text: `Finish in the top ${top}`, target: top, status: 'pending' },
    {
      id: `s${season}-solvent`, kind: 'solvent', target: floor, status: 'pending',
      text: floor > 0 ? `Finish the season with at least $${floor.toLocaleString()}` : 'Finish the season solvent',
    },
  ];
  if (state.reputation < 25) return out;

  const rivals = state.league.clubs.filter((c) => c.id !== state.clubId)
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  if (rivals.length > 0 && rng.next() < 0.5) {
    // Reach for a rival a little above the club: better reputation → stronger rival.
    const idx = Math.min(rivals.length - 1, Math.round((1 - state.reputation / 100) * (rivals.length - 1) * 0.7));
    const rival = rivals[idx]!;
    out.push({
      id: `s${season}-rival`, kind: 'beatRival', target: 0, rivalId: rival.id, status: 'pending',
      text: `Finish above ${rival.name}`,
    });
  } else {
    const target = state.facilities.length + BOARD.BUILD_TARGET_EXTRA;
    out.push({ id: `s${season}-build`, kind: 'build', target, status: 'pending', text: `Have ${target} facilities built` });
  }
  return out;
}

/** Is `o` met, given the end-of-season state and outcome? */
export function evaluateObjective(o: Objective, state: GameState, outcome: SeasonOutcome): boolean {
  switch (o.kind) {
    case 'finals': return outcome.ladderPosition > 0 && outcome.ladderPosition <= o.target;
    case 'solvent': return state.money >= o.target;
    case 'build': return state.facilities.length >= o.target;
    case 'beatRival': {
      const rivalPos = o.rivalId ? outcome.positions[o.rivalId] : undefined;
      return rivalPos !== undefined && outcome.ladderPosition > 0 && outcome.ladderPosition < rivalPos;
    }
  }
}

export interface BoardReview {
  objectives: Objective[];
  met: number;
  missed: number;
  patience: number;
  reputation: number;
  grant: number;
  sacked: boolean;
}

/** Pure season review: mark objectives, move patience/reputation, decide the sack. */
export function reviewObjectives(state: GameState, outcome: SeasonOutcome): BoardReview {
  const objectives = state.objectives.map((o): Objective =>
    ({ ...o, status: evaluateObjective(o, state, outcome) ? 'met' : 'missed' }));
  const met = objectives.filter((o) => o.status === 'met').length;
  const missed = objectives.length - met;
  let patience = state.boardPatience - missed;
  if (objectives.length > 0 && missed === 0) patience += 1;
  patience = Math.max(0, Math.min(BOARD.MAX_PATIENCE, patience));
  return {
    objectives, met, missed, patience,
    reputation: Math.min(100, state.reputation + met * BOARD.REP_PER_MET),
    grant: met * BOARD.GRANT_PER_MET,
    sacked: patience <= 0,
  };
}

/** Why the board pulled the trigger, for the game-over summary. */
export function sackingReason(review: Pick<BoardReview, 'objectives'>): string {
  const missed = review.objectives.filter((o) => o.status === 'missed').map((o) => o.text.toLowerCase());
  return missed.length > 0
    ? `The board's patience ran out after you failed to: ${missed.join('; ')}.`
    : 'The board has lost patience with your results.';
}

/** Game-over summary figures (pure). */
export function sackedSummary(state: GameState): {
  seasons: number; premierships: number; bestFinish: number | null; reputation: number; reason: string; season: number;
} {
  const ranked = state.history.filter((h) => h.ladderPosition > 0);
  return {
    seasons: state.history.length,
    premierships: state.history.filter((h) => h.premiership).length,
    bestFinish: ranked.length ? Math.min(...ranked.map((h) => h.ladderPosition)) : null,
    reputation: state.reputation,
    reason: state.sacked?.reason ?? '',
    season: state.sacked?.season ?? state.season,
  };
}

/**
 * Season-end board work, called by the fixtures season hook while the final
 * ladder still exists: prize money, objective review, grant, patience, sacking.
 * Reputation from objectives is applied here (the fixtures hook has already set
 * its own reputation, which we read live).
 */
export function applyBoardReview(outcome: SeasonOutcome): BoardReview {
  const s = getState();
  const prize = finalsPrize(outcome);
  if (prize > 0) {
    earnMoney(prize, 'finals prize money');
    bus.emit('ui:notify', { text: `Finals prize money: $${prize.toLocaleString()}.`, kind: 'success' });
  }

  // The season's board loan (N14.3) is repaid before the board judges the season, so a
  // club is not "solvent" on borrowed money; the prize just paid helps cover it.
  const repaid = repayBoardLoan();
  if (repaid > 0) bus.emit('ui:notify', { text: `Board loan repaid: $${repaid.toLocaleString()}.`, kind: 'info' });

  const after = getState();
  const review = reviewObjectives(after, outcome);
  if (review.grant > 0) earnMoney(review.grant, 'board grant');
  const sacked = review.sacked ? { season: s.season - 1, reason: sackingReason(review) } : undefined;
  setState({
    objectives: review.objectives,
    boardPatience: review.patience,
    reputation: review.reputation,
    ...(sacked ? { sacked } : {}),
  });

  if (review.objectives.length > 0) {
    bus.emit('ui:notify', {
      text: review.missed === 0
        ? `Board: all ${review.met} objectives met. +$${review.grant.toLocaleString()} grant, reputation up.`
        : `Board: ${review.met} met, ${review.missed} missed. Patience ${review.patience}/${BOARD.MAX_PATIENCE}.`,
      kind: review.missed === 0 ? 'success' : 'danger',
      quiet: true, // the review's Board line (N14)
    });
  }
  if (sacked) bus.emit('board:sacked', sacked);
  return review;
}

/** Replace this season's objectives with freshly generated ones when missing/stale. */
export function ensureObjectives(): void {
  const s = getState();
  if (s.sacked || s.objectives.length > 0 || s.league.clubs.length === 0) return;
  setState({ objectives: generateObjectives(s) });
}

/** One-line status for UI, e.g. "Finish in the top 8 — pending". */
export function objectiveLine(o: Objective, state: GameState): string {
  if (o.status !== 'pending') return `${o.text} — ${o.status === 'met' ? 'met' : 'missed'}`;
  switch (o.kind) {
    case 'solvent': return `${o.text} — now $${state.money.toLocaleString()}`;
    case 'build': return `${o.text} — ${state.facilities.length} now`;
    case 'finals': {
      const rank = [...state.league.ladder].sort((a, b) => b.points - a.points
        || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
        .findIndex((r) => r.clubId === state.clubId) + 1;
      return `${o.text} — ${state.league.ladder.some((r) => r.played > 0) && rank > 0 ? `currently ${ordinal(rank)}` : 'season not started'}`;
    }
    default: return `${o.text} — pending`;
  }
}

/** Register the new-season hook (after fixtures-season at order 10). */
export function registerBoardSystem(): void {
  registerSeasonHook('board-season', 20, () => {
    const s = getState();
    if (s.sacked) return;
    const objectives = generateObjectives(s);
    setState({ objectives });
    bus.emit('ui:notify', {
      text: `Board objectives, season ${s.season}: ${objectives.map((o) => o.text).join(' · ')}.`,
      kind: 'info',
    });
  });
  ensureObjectives();
}
