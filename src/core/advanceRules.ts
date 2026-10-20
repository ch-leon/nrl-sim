// src/core/advanceRules.ts — pure stop-early rules for multi-week advance (#44).
//
// No bus, no store, no Phaser: every function takes plain snapshots and returns a
// verdict, so the whole decision table is unit-tested in isolation. The impure
// loop that gathers these inputs lives in ./advance.ts.

import { ECON, MORALE, ON_FIELD, SEASON_ROUNDS, WEEKS_PER_SEASON, SQUAD_MIN } from '../config';

/** How far a multi-advance runs. */
export type AdvanceTarget =
  | { kind: 'weeks'; weeks: number }
  | { kind: 'finals' }
  | { kind: 'seasonEnd' };

/**
 * Why a multi-advance halted. `target` means it finished normally; the others
 * are the "needs attention" stops.
 */
export type StopKind = 'forfeit' | 'injury' | 'contract' | 'bankruptcy' | 'decision' | 'target';

export interface StopReason {
  kind: StopKind;
  text: string;
}

/** Minimal player shape the rules need — keeps this module independent of state.ts. */
export interface SquadMember {
  id: string;
  name: string;
  injuredWeeks: number;
  contractWeeks: number;
}

/** First week of the finals block (QF). */
export const FINALS_START_WEEK = SEASON_ROUNDS + 1;

/** Contract with this many weeks or fewer left counts as unsettled (shared with morale). */
const EXPIRING_WEEKS = MORALE.EXPIRING_WEEKS;

// ── Pre-week: forfeit risk ─────────────────────────────────────────────────

/**
 * Stop before a week whose player fixture would be forfeited. The tick forfeits
 * when fewer than SQUAD_MIN players are fit, so checking before the tick is the
 * only point where the player can still react.
 */
export function forfeitRisk(input: {
  fitCount: number;
  playerFixturePending: boolean;
}): StopReason | null {
  if (!input.playerFixturePending) return null;
  if (input.fitCount >= SQUAD_MIN) return null;
  return {
    kind: 'forfeit',
    text: `Only ${input.fitCount} fit (need ${SQUAD_MIN}) — next match would be forfeited.`,
  };
}

// ── Post-week: squad diffs ─────────────────────────────────────────────────

/**
 * The regular starters: the best ON_FIELD fit players by rating, mirroring
 * teamSheetFromSquad. `rating` is injected so this stays free of the data layer.
 */
export function regularStarterIds<T extends SquadMember>(
  squad: readonly T[],
  rating: (p: T) => number,
): Set<string> {
  const fit = squad.filter((p) => p.injuredWeeks <= 0);
  const best = [...fit].sort((a, b) => rating(b) - rating(a)).slice(0, ON_FIELD);
  return new Set(best.map((p) => p.id));
}

/**
 * Regular starters that became injured during the week. Compares squad
 * snapshots before and after the tick; returns their names.
 */
export function newlyInjuredStarters<T extends SquadMember>(
  before: readonly T[],
  after: readonly T[],
  rating: (p: T) => number,
  /** The coach's picked starters (#69); the best nine by rating when absent. */
  picked?: ReadonlySet<string>,
): string[] {
  const starters = picked ?? regularStarterIds(before, rating);
  const nowById = new Map(after.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const p of before) {
    if (!starters.has(p.id)) continue;
    const now = nowById.get(p.id);
    if (now && now.injuredWeeks > 0 && p.injuredWeeks <= 0) out.push(now.name);
  }
  return out;
}

/**
 * Contract alerts raised by the week. Only transitions count, so a player who was
 * already unsettled at the start of a run does not halt it on every week.
 *  - a settled player crossing into the expiring window (≤ EXPIRING_WEEKS left)
 *  - a player whose unsettled contract ran out and who left the squad
 */
export function contractAlerts(
  before: readonly SquadMember[],
  after: readonly SquadMember[],
): string[] {
  const nowById = new Map(after.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const p of before) {
    const now = nowById.get(p.id);
    if (!now) {
      if (p.contractWeeks <= EXPIRING_WEEKS) out.push(`${p.name} left the club (contract expired).`);
      continue;
    }
    if (p.contractWeeks > EXPIRING_WEEKS && now.contractWeeks > 0 && now.contractWeeks <= EXPIRING_WEEKS) {
      out.push(`${p.name}'s contract is up in ${now.contractWeeks} week${now.contractWeeks === 1 ? '' : 's'}.`);
    }
  }
  return out;
}

/** Facts gathered from one tick, handed to {@link postWeekStop}. */
export interface WeekFacts {
  injuredStarters: readonly string[];
  contractAlerts: readonly string[];
  /** The bank balance before the week and after it (N12.5: debt stops on a crossing). */
  moneyBefore: number;
  moneyAfter: number;
  /** Players the economy force-sold this week to cover debts (the bankruptcy warning's `forcedSales`). */
  forcedSales: readonly string[];
  /** Titles of event cards drawn this week (#75); optional for older callers. */
  newDecisions?: readonly string[];
}

/** True when the balance went from at or above `line` to below it during the week. */
function crossedBelow(f: Pick<WeekFacts, 'moneyBefore' | 'moneyAfter'>, line: number): boolean {
  return f.moneyBefore >= line && f.moneyAfter < line;
}

/** Names the stop toast lists before "and n more" (the cascade can sell several in one week). */
const SALE_NAMES_SHOWN = 3;

/**
 * Debt needs the manager once, not every week in the red (N12.5, QA finding 10):
 * on a forced sale, when the balance first passes the fire-sale floor, and on the
 * crossing into the red, in that order when one week does several. A club that
 * stays in the red without crossing anything runs on to its target.
 */
export function debtStop(f: Pick<WeekFacts, 'moneyBefore' | 'moneyAfter' | 'forcedSales'>): StopReason | null {
  const sold = f.forcedSales.length;
  if (sold > 0) {
    const names = f.forcedSales.slice(0, SALE_NAMES_SHOWN).join(', ');
    const more = sold > SALE_NAMES_SHOWN ? ` and ${sold - SALE_NAMES_SHOWN} more` : '';
    return { kind: 'bankruptcy', text: `${sold === 1 ? 'Forced sale' : 'Forced sales'}: ${names}${more} sold to cover debts.` };
  }
  if (crossedBelow(f, ECON.FORCED_SALE_FLOOR)) {
    const floor = `-$${Math.abs(ECON.FORCED_SALE_FLOOR).toLocaleString('en-US')}`;
    return { kind: 'bankruptcy', text: `Balance below the fire-sale floor (${floor}).` };
  }
  if (crossedBelow(f, ECON.BANKRUPTCY_WARN)) {
    return { kind: 'bankruptcy', text: 'Club has gone into debt.' };
  }
  return null;
}

/**
 * First attention-needing stop after a tick, in priority order: debt (a forced
 * sale, the fire-sale floor, the crossing into the red), then injury to a
 * regular starter, then contract, then a new event card waiting for a choice.
 * Returns null when the run may go on.
 */
export function postWeekStop(facts: WeekFacts): StopReason | null {
  const debt = debtStop(facts);
  if (debt) return debt;
  if (facts.injuredStarters.length > 0) {
    const names = facts.injuredStarters.join(', ');
    return { kind: 'injury', text: `Regular starter injured: ${names}.` };
  }
  if (facts.contractAlerts.length > 0) {
    return { kind: 'contract', text: facts.contractAlerts[0]! };
  }
  if (facts.newDecisions && facts.newDecisions.length > 0) {
    return { kind: 'decision', text: `Decision needed: ${facts.newDecisions[0]!}.` };
  }
  return null;
}

// ── Target ─────────────────────────────────────────────────────────────────

/** Progress so far in a run, used to decide whether the target is met. */
export interface RunProgress {
  weeksPlayed: number;
  week: number;
  startSeason: number;
  season: number;
}

/**
 * Whether the target is met after at least one week has been played (except
 * `weeks: 0`, which is met immediately). "To finals" stops on reaching the first
 * finals week; "To season end" stops on rollover.
 */
export function targetReached(target: AdvanceTarget, p: RunProgress): boolean {
  switch (target.kind) {
    case 'weeks':
      return p.weeksPlayed >= target.weeks;
    case 'finals':
      return p.weeksPlayed > 0 && p.week === FINALS_START_WEEK;
    case 'seasonEnd':
      return p.season !== p.startSeason;
  }
}

/** Plain-language label for a target's completion toast. */
export function targetLabel(target: AdvanceTarget): string {
  switch (target.kind) {
    case 'weeks':
      return `${target.weeks} weeks`;
    case 'finals':
      return 'to finals';
    case 'seasonEnd':
      return 'to season end';
  }
}

/** Maximum weeks any target can span from the start of a season. */
export const MAX_RUN_WEEKS = 2 * WEEKS_PER_SEASON;
