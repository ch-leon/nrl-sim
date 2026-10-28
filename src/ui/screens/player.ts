// src/ui/screens/player.ts — the player page (N7, GitHub #185).
//
// Tap a row on the Squad or Recruit screen, or of a rival's squad, and this
// page opens over it as a full sheet (3f, Broadcast Quiet) in three columns.
// Left: ◂ back to where it was opened, the portrait, name, position, age and
// the number he wears, overall and fitness, the contract. Middle: the stat bars
// with this week's training gain, every trait with its tip, morale and why,
// injury risk, this season's and the career tallies. Right: his roles in the
// side (goal-kicker, captain) and, pinned at the foot, the actions that apply
// where the player is (sign a free agent; renew, sell or release one of yours)
// through the same system functions the Recruit, Squad and Contracts screens
// call. The view-model (playerPageModel) is pure and unit-tested; the DOM
// renders it. No Phaser.

import { bus } from '../../core/events';
import { getState, setState, type GameState, type Player, type PlayerStats, type RivalClub, type StatTally } from '../../core/state';
import { save } from '../../core/save';
import { marketWage, overallRating } from '../../data/player';
import { ROMAN, TRAITS, traitTip } from '../../data/traits';
import { CONTRACTS, MORALE, SQUAD_CAP, SQUAD_MIN, difficultyMultipliers } from '../../config';
import { renewalFee, renewalWeeklyCost, renewEarly, sellPlayer, transferFee } from '../../systems/contracts';
import { RELEASE_PAYOUT_WEEKS, releasePlayer, signingFee, signingFeeBasis } from '../../systems/freeagency';
import { signWithUndo } from '../../systems/undo';
import { activePack } from '../../content';
import { PLAYER_ID } from '../../systems/fixtures';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { PORTRAIT_H, PORTRAIT_W, TRAINING_KIT, portraitDataUrl } from '../../art/portrait';
import { backButton, button, closeModal, el, openModal } from '../dom';
import { ensureScreenStyles, fitColour } from './recruit';
import { fmtMoney } from './finance';
import { focusLabel, weeklyChange, weeklyGain } from '../../systems/training';
import { LINEUP_SLOTS, resolveLineup, setCaptain, setKicker, statsAt } from '../../systems/lineup';
import { kickerAndCaptain } from '../../match/league/sheets';
import { RETIREMENT_NOTE_AGE, careerStage, projectCareer, retirementRisk, type CareerPoint, type CareerStage } from '../../systems/potential';

// ── View-model (pure) ───────────────────────────────────────────────────────

/** Where the player was opened from; decides the actions and the kit. */
export type PlayerContext =
  | { kind: 'squad' }
  | { kind: 'freeAgent' }
  | { kind: 'rival'; club: RivalClub };

export type PlayerActionId = 'sign' | 'renew' | 'sell' | 'release';

export interface PlayerAction {
  id: PlayerActionId;
  /** Button text, e.g. "Renew · $38,000", "Sell +$12,000". */
  label: string;
  /** Small print under the buttons, e.g. "$1,200/wk for 52 weeks". */
  detail?: string;
  enabled: boolean;
  /** Why it is disabled. */
  why?: string;
  danger?: boolean;
  /** Two-tap guard: the button reads this after the first tap. */
  confirm?: string;
}

export interface PlayerPageModel {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  /** "Your squad", "Free agent" or the rival's name. */
  where: string;
  /** Each stat, and (your own players, N11) what a week's training under the squad focus adds. */
  stats: { label: string; value: number; gain?: number }[];
  /** The squad's training focus in words, for your own players (N11). */
  trainingFocus: string | null;
  traits: { label: string; tip: string; bad: boolean }[];
  morale: { value: number; word: string; reasons: string[] };
  /** "Fit" or "Out 3 weeks". */
  fitness: string;
  /** Fitness as a %, as the Squad table shows it ({@link fitnessPct}). */
  fitnessPct: number;
  /** The number he wears this week (squad only, {@link squadNumbers}), or null. */
  number: number | null;
  /** His jobs in the nine (squad only, N11): null for anyone else. */
  roles: { starter: boolean; kicker: boolean; captain: boolean } | null;
  injured: boolean;
  /** "low", "moderate" or "high". */
  injuryRisk: string;
  /** The contract as it stands: weeks and the weekly wage as paid. */
  contract: { text: string; expiring: boolean };
  /** "Joined in season 1 · 3rd season at the club", squad only. */
  tenure: string | null;
  season: StatTally | null;
  career: StatTally | null;
  /** His projected career (#369): a view of the training rules run forward, not a hidden stat. */
  outlook: PlayerOutlook;
  actions: PlayerAction[];
}

export interface PlayerOutlook {
  /** Rating today, then at each birthday to 34. */
  points: CareerPoint[];
  peak: CareerPoint;
  /** "Projected peak: 74 at 26 (at your club)". */
  peakText: string;
  /** Where he is on the curve, by training.ts ageMod's bands. */
  stage: CareerStage;
  /** "Retirement risk: 20% at the season's end", from 33. */
  retirement: string | null;
}

/**
 * The player page's outlook (#369): his career projected from the club's
 * facilities and focus today. Free agents and rivals are projected as if they
 * trained at your club, and say so.
 */
export function playerOutlook(p: Player, ctx: PlayerContext, state: GameState): PlayerOutlook {
  const { points, peak } = projectCareer(p, state.facilities, state.training?.focus ?? 'balanced', undefined, state.week);
  const where = ctx.kind === 'squad' ? '' : ' (at your club)';
  const when = peak.age === p.age ? 'now' : `at ${peak.age}`;
  return {
    points,
    peak,
    peakText: `Projected peak: ${peak.rating} ${when}${where}`,
    stage: careerStage(p.age),
    retirement: p.age >= RETIREMENT_NOTE_AGE ? `Retirement risk: ${Math.round(retirementRisk(p.age) * 100)}% at the season's end` : null,
  };
}

const STAT_LABELS: readonly [keyof PlayerStats, string][] = [
  ['speed', 'Speed'], ['strength', 'Strength'], ['stamina', 'Stamina'], ['skill', 'Skill'], ['footyIQ', activePack().vocab.iqStat],
];

/** Morale in a word: 70+ happy, 50+ content, 30+ unsettled, else unhappy. */
export function moraleWord(m: number): string {
  return m >= 70 ? 'Happy' : m >= 50 ? 'Content' : m >= 30 ? 'Unsettled' : 'Unhappy';
}

/** Injury risk in a word, by thirds of the 1–100 range. */
export function riskWord(risk: number): string {
  return risk < 34 ? 'low' : risk < 67 ? 'moderate' : 'high';
}

/** Title-case a position, hyphens kept: "five-eighth" → "Five-Eighth". */
export function positionLabel(pos: string): string {
  return pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const weeksText = (w: number): string => `${w} week${w === 1 ? '' : 's'}`;

/**
 * What the morale system (systems/morale.ts) is docking a squad player for,
 * in words: paid under the market for his rating, a contract running down,
 * or being hurt.
 */
export function moraleReasons(p: Player): string[] {
  const out: string[] = [];
  const market = marketWage(p);
  if (p.wage < market * MORALE.LOW_PAY_RATIO) out.push(`paid under the market (${fmtMoney(p.wage)} v ${fmtMoney(market)}/wk)`);
  if (p.contractWeeks <= MORALE.EXPIRING_WEEKS) out.push('contract running down');
  if (p.injuredWeeks > 0) out.push('injured');
  if ((p.suspendedWeeks ?? 0) > 0) out.push('suspended');
  return out;
}

/** The actions that apply where the player is, priced the way the screens price them. */
export function playerActions(p: Player, ctx: PlayerContext, state: GameState): PlayerAction[] {
  if (ctx.kind === 'rival') return [];
  if (ctx.kind === 'freeAgent') {
    const fee = signingFee(state, p);
    const full = state.squad.length >= SQUAD_CAP;
    const broke = state.money < fee;
    return [{
      id: 'sign',
      label: `Sign · ${fmtMoney(fee)}`,
      detail: `${signingFeeBasis(state, p)} · then ${fmtMoney(paidWage(p, state))}/wk`,
      enabled: !full && !broke,
      ...(full ? { why: `Squad full (${SQUAD_CAP})` } : broke ? { why: 'Not enough money for the fee' } : {}),
    }];
  }
  const fee = renewalFee(state, p);
  const fresh = p.contractWeeks >= CONTRACTS.NEW_CONTRACT_WEEKS;
  const broke = state.money < fee;
  const atMin = state.squad.length <= SQUAD_MIN;
  const minWhy = `Squad at the minimum (${SQUAD_MIN})`;
  return [
    {
      id: 'renew',
      label: `Renew · ${fmtMoney(fee)}`,
      detail: `${fmtMoney(renewalWeeklyCost(state, p))}/wk for ${CONTRACTS.NEW_CONTRACT_WEEKS} weeks`,
      enabled: !fresh && !broke,
      ...(fresh ? { why: 'Contract already full length' } : broke ? { why: 'Not enough money for the fee' } : {}),
    },
    {
      id: 'sell',
      label: `Sell +${fmtMoney(transferFee(p))}`,
      enabled: !atMin,
      confirm: 'Really sell?',
      ...(atMin ? { why: minWhy } : {}),
    },
    {
      id: 'release',
      label: `Release · ${fmtMoney(RELEASE_PAYOUT_WEEKS * p.wage)}`,
      detail: `${RELEASE_PAYOUT_WEEKS}×wage settlement`,
      enabled: !atMin,
      danger: true,
      confirm: 'Really release?',
      ...(atMin ? { why: minWhy } : {}),
    },
  ];
}

/** The weekly wage as the club pays it (the difficulty's multiplier applied). */
function paidWage(p: Player, state: Pick<GameState, 'settings'>): number {
  return Math.round(p.wage * difficultyMultipliers(state.settings.difficulty).wages);
}

const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

/**
 * Where your player sits in the coach's nine (N14, #263): "Starting halfback",
 * "On the bench" or "Not picked". Pure.
 */
export function lineupSlotText(state: Pick<GameState, 'lineup' | 'squad'>, playerId: string): string {
  // The side as it runs out (injured men covered, the bench topped up), not the saved sheet.
  const side = resolveLineup(state.lineup, state.squad);
  const slot = side.starters.findIndex((p) => p?.id === playerId);
  if (slot >= 0) return `Starting ${positionLabel(LINEUP_SLOTS[slot]!).toLowerCase()}`;
  if (side.bench.some((p) => p.id === playerId)) return 'On the bench';
  const picked = state.lineup.starters.includes(playerId) || state.lineup.bench.includes(playerId);
  return picked ? 'Picked, but injured' : 'Not picked';
}

/**
 * Fitness, for the Squad table and the player page: 100 less his injury risk
 * (how much his body can take), 0 while he is injured. A ban does not touch it.
 */
export function fitnessPct(p: Pick<Player, 'injuredWeeks' | 'injuryRisk'>): number {
  if (p.injuredWeeks > 0) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - p.injuryRisk)));
}

/**
 * The number each man wears this week, by id: 1–9 the nine by slot
 * (LINEUP_SLOTS order), 10–13 the bench, as the side runs out (injured men
 * covered). Men not in the side have none. Pure.
 */
export function squadNumbers(state: Pick<GameState, 'lineup' | 'squad'>): Map<string, number> {
  const side = resolveLineup(state.lineup, state.squad);
  const out = new Map<string, number>();
  side.starters.forEach((p, slot) => { if (p) out.set(p.id, slot + 1); });
  side.bench.forEach((p, i) => out.set(p.id, LINEUP_SLOTS.length + 1 + i));
  return out;
}

/**
 * Who kicks the goals and who captains the side that runs out (N11): the
 * coach's picks when they are in the nine, else the defaults — as the Lineup
 * screen and the match work it out. Pure.
 */
export function sideRoles(state: Pick<GameState, 'lineup' | 'squad'>): { starters: Set<string>; kicker?: string; captain?: string } {
  const side = resolveLineup(state.lineup, state.squad);
  const nine = side.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
  return { starters: new Set(nine.map((p) => p.id)), ...kickerAndCaptain(nine, state.lineup) };
}

/** One man's jobs from {@link sideRoles}. */
function rolesOf(r: ReturnType<typeof sideRoles>, id: string): { starter: boolean; kicker: boolean; captain: boolean } {
  return { starter: r.starters.has(id), kicker: r.kicker === id, captain: r.captain === id };
}

/** Everything the page shows, from the player, where he is and the game state. */
export function playerPageModel(p: Player, ctx: PlayerContext, state: GameState): PlayerPageModel {
  const squad = ctx.kind === 'squad';
  const wage = paidWage(p, state);
  const contract = ctx.kind === 'freeAgent'
    ? { text: `Asks ${fmtMoney(wage)}/wk on a ${CONTRACTS.NEW_CONTRACT_WEEKS}-week deal`, expiring: false }
    : { text: `${weeksText(p.contractWeeks)} left · ${fmtMoney(wage)}/wk`, expiring: p.contractWeeks <= MORALE.EXPIRING_WEEKS };
  const seasonsAtClub = p.joinedSeason !== undefined ? state.season - p.joinedSeason + 1 : null;
  // A week's training under the squad's focus (N11): what each stat gains, for your own players.
  const focus = state.training?.focus ?? 'balanced';
  // Nothing trains without facilities: no gains to show. What shows is the week's change, a veteran's decline included.
  const trains = squad && Object.values(weeklyGain(p, state.facilities, focus)).some((g) => g > 0);
  const gain = trains ? weeklyChange(p, state.facilities, focus) : null;
  return {
    id: p.id,
    name: p.name,
    position: positionLabel(p.position),
    age: p.age,
    overall: overallRating(p),
    where: ctx.kind === 'squad' ? `Your squad · ${lineupSlotText(state, p.id)}` : ctx.kind === 'freeAgent' ? (p.junior ? 'Academy prospect' : 'Free agent') : ctx.club.name,
    // Stats train in fractions; the page shows whole numbers.
    stats: STAT_LABELS.map(([key, label]) => ({ label, value: Math.round(p.stats[key]), ...(gain ? { gain: Math.round(gain[key] * 10) / 10 } : {}) })),
    trainingFocus: squad ? focusLabel(focus) : null,
    traits: p.traits
      .filter((t) => t.id in TRAITS)
      .map((t) => ({ label: `${TRAITS[t.id].name} ${ROMAN[t.level]}`, tip: traitTip(t.id), bad: TRAITS[t.id].bad ?? false })),
    morale: { value: p.morale, word: moraleWord(p.morale), reasons: squad ? moraleReasons(p) : [] },
    fitness: p.injuredWeeks > 0 ? `Out ${weeksText(p.injuredWeeks)}` : (p.suspendedWeeks ?? 0) > 0 ? `Banned ${weeksText(p.suspendedWeeks ?? 0)}` : 'Fit',
    injured: p.injuredWeeks > 0 || (p.suspendedWeeks ?? 0) > 0,
    fitnessPct: fitnessPct(p),
    number: squad ? squadNumbers(state).get(p.id) ?? null : null,
    roles: squad ? rolesOf(sideRoles(state), p.id) : null,
    injuryRisk: riskWord(p.injuryRisk),
    contract,
    tenure: squad && seasonsAtClub !== null
      ? `Joined in season ${p.joinedSeason} · ${ordinal(seasonsAtClub)} season at the club`
      : null,
    season: squad && p.seasonStats && p.seasonStats.season === state.season
      ? { games: p.seasonStats.games, tries: p.seasonStats.tries, tackles: p.seasonStats.tackles, lineBreaks: p.seasonStats.lineBreaks }
      : squad ? { games: 0, tries: 0, tackles: 0, lineBreaks: 0 } : null,
    career: p.career ?? null,
    outlook: playerOutlook(p, ctx, state),
    actions: playerActions(p, ctx, state),
  };
}

/** "12 games · 5 tries · 140 tackles · 3 line breaks". */
export function fmtTally(t: StatTally): string {
  const n = (v: number, one: string, many: string): string => `${v} ${v === 1 ? one : many}`;
  return [n(t.games, 'game', 'games'), n(t.tries, 'try', 'tries'), n(t.tackles, 'tackle', 'tackles'), n(t.lineBreaks, 'line break', 'line breaks')].join(' · ');
}

// ── DOM ─────────────────────────────────────────────────────────────────────

const PLAYER_STYLE_ID = 'nrl-player-styles';

function ensurePlayerStyles(): void {
  ensureScreenStyles();
  if (document.getElementById(PLAYER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PLAYER_STYLE_ID;
  style.textContent = PLAYER_CSS;
  document.head.appendChild(style);
}

/** The page's stylesheet (exported for tests). */
export const PLAYER_CSS = `
/* 3f: a full sheet over the one it was opened from (a region dialog, #203: the dock stays whole below it).
   Solid navy: the sheet under it must not show through. */
.nrl-dialog-region .nrl-modal.nrl-player-modal {
  width: 100%;
  max-width: 1180px;
  height: 100%;
  max-height: 100%;
  background: var(--nrl-navy);
  border-radius: 16px;
  box-shadow: var(--nrl-shadow-tray);
  padding: 10px 14px;
}
/* Three columns, 230 / 1fr / 200: who he is, what he can do, his jobs and the deals. */
.nrl-player {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 200px;
  gap: 16px;
  font-size: 0.8125rem;
}
.nrl-player.nrl-player-rival { grid-template-columns: 230px minmax(0, 1fr); }
.nrl-player-card, .nrl-player-side { min-height: 0; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.nrl-player-card .nrl-back { align-self: flex-start; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.nrl-player-top { display: flex; align-items: center; gap: 10px; }
.nrl-player-portrait {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: var(--nrl-button);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.nrl-player-id { min-width: 0; }
.nrl-player-name { font-family: var(--nrl-f-label); font-size: 1.375rem; font-weight: 700; line-height: 1; overflow-wrap: anywhere; }
.nrl-player-meta { margin-top: 4px; font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-player-where { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-player-out { color: var(--nrl-neg); }
.nrl-player-tiles { display: flex; gap: 6px; }
.nrl-player-tile { flex: 1 1 0; min-width: 0; border-radius: 8px; background: var(--nrl-raised); padding: 6px 8px; display: flex; flex-direction: column; }
.nrl-player-tile b { font-family: var(--nrl-f-num); font-size: 1.25rem; font-weight: 600; line-height: 1.2; }
.nrl-player-tile span { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-player-deal { font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); }
.nrl-player-expiring { color: var(--nrl-neg); }
/* The middle column scrolls on its own; the left and the actions hold still. The outlook's
   words go under the curve when the column is narrow (667, or a larger text size). */
.nrl-player-about { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; padding-right: 4px; }
.nrl-player h3 { flex: 0 0 auto; margin: 10px 0 4px; font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-player h3:first-child { margin-top: 0; }
.nrl-player-outlook { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 6px 10px; border-radius: 8px; background: var(--nrl-panel); }
.nrl-player-curve { flex: 0 0 auto; width: 132px; height: 38px; }
.nrl-player-outlook-text { flex: 1 1 9em; display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); }
.nrl-player-outlook-text b { color: var(--nrl-text); }
.nrl-player-outlook-text small { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-player-stats { display: flex; flex-direction: column; flex: 0 0 auto; }
/* Label and number columns in em, so a larger text size widens them with the words (#371). */
.nrl-statrow { display: grid; grid-template-columns: 5.5em minmax(0, 1fr) 2.3em 4.3em; align-items: center; gap: 8px; min-height: 28px; }
.nrl-stattrack { height: 6px; border-radius: 3px; background: var(--nrl-button); overflow: hidden; }
.nrl-statfill { height: 100%; background: var(--nrl-accent); }
.nrl-stat-val { font-family: var(--nrl-f-num); font-weight: 600; }
.nrl-stat-gain { font-family: var(--nrl-f-num); font-size: 0.75rem; color: var(--nrl-pos); white-space: nowrap; }
.nrl-stat-gain.nrl-stat-loss { color: var(--nrl-neg); }
.nrl-player-trait, .nrl-player-line { flex: 0 0 auto; margin: 2px 0; font-size: 0.75rem; line-height: 1.4; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-player-trait b { color: var(--nrl-text); font-weight: 600; margin-right: 6px; }
.nrl-player-trait-bad b { color: var(--nrl-neg); }
.nrl-player-line b { color: var(--nrl-muted); font-weight: 500; }
/* Roles (N11): a row per job, ON in yellow, OFF muted. */
.nrl-btn.nrl-player-role { flex: 0 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 1rem; }
.nrl-player-role-state { color: var(--nrl-muted); }
.nrl-player-role[aria-pressed="true"] .nrl-player-role-state { color: var(--nrl-accent); }
/* What each deal costs, and why one is shut (in yellow): just above the buttons. */
.nrl-player-why { flex: 0 1 auto; min-height: 0; overflow: hidden; margin-top: auto; font-size: 0.6875rem; line-height: 1.35; color: var(--nrl-muted); }
.nrl-player-why > div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* #203: the actions are pinned to the foot of the column, on screen without scrolling. */
.nrl-player-actions {
  flex: 0 0 auto;
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  position: sticky;
  bottom: 0;
  background: var(--nrl-sheet);
  z-index: 1;
}
.nrl-player-why + .nrl-player-actions { margin-top: 0; }
.nrl-player-actions .nrl-btn { min-width: 0; padding: 0 6px; white-space: normal; font-size: 0.9375rem; }
.nrl-player-actions .nrl-btn-primary { grid-column: 1 / -1; font-size: 1.0625rem; }
/* Short sheets (667×375, 956×330): tighter, so the jobs and the deals still fit. */
@media (max-height: 400px) {
  .nrl-player-card, .nrl-player-side { gap: 6px; }
  .nrl-statrow { min-height: 26px; }
  .nrl-player-tile { padding: 4px 8px; }
  .nrl-player-tile b { font-size: 1.125rem; }
}
/* A narrow phone (667): the side columns give a little. */
@media (max-width: 760px) {
  .nrl-player { grid-template-columns: 196px minmax(0, 1fr) 176px; gap: 12px; }
  .nrl-player.nrl-player-rival { grid-template-columns: 196px minmax(0, 1fr); }
  .nrl-statrow { grid-template-columns: 4.6em minmax(0, 1fr) 2em 4em; gap: 6px; }
}
/* Large and Larger text (#371): the name keeps to whole words in the narrow card, and on a
   narrow phone the side columns give the stats' bars some room back. */
html[data-text-size] .nrl-player-name { font-size: 1.125rem; overflow-wrap: break-word; }
@media (max-width: 760px) {
  html[data-text-size] .nrl-player { grid-template-columns: 180px minmax(0, 1fr) 164px; }
  html[data-text-size] .nrl-player.nrl-player-rival { grid-template-columns: 180px minmax(0, 1fr); }
  html[data-text-size] .nrl-statrow { grid-template-columns: 4.4em minmax(1.5em, 1fr) 1.8em 3.6em; gap: 4px; }
}
`;

const FAILURE: Record<string, string> = {
  'squad-full': 'Squad is full — release a player first.',
  'insufficient-funds': 'Not enough money.',
  'not-found': 'That player is no longer there.',
  'already-fresh': 'Contract is already full length.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
};

/** Run an action through the system function that owns it. */
function runAction(id: PlayerActionId, playerId: string): { ok: boolean; reason?: string } {
  const s = getState();
  switch (id) {
    case 'sign': return signWithUndo(playerId); // with a 5-second Undo (#370)
    case 'renew': return renewEarly(s, playerId);
    case 'sell': return sellPlayer(s, playerId);
    case 'release': return releasePlayer(s, playerId);
  }
}

/** The kit the portrait wears: the club's on a squad or rival player, the training top on a free agent. */
function kitFor(ctx: PlayerContext, state: GameState): Kit {
  if (ctx.kind === 'freeAgent') return TRAINING_KIT;
  if (ctx.kind === 'rival') return kitFromColors(ctx.club.colors, ctx.club.id);
  const colors = state.league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS;
  return kitFromColors(colors, PLAYER_ID);
}

/** Where the player is now, by id, or null once he has moved on. */
function findPlayer(id: string, ctx: PlayerContext, state: GameState): Player | null {
  const list = ctx.kind === 'squad' ? state.squad : ctx.kind === 'freeAgent' ? state.freeAgents : (ctx.club.squad ?? []);
  return list.find((p) => p.id === id) ?? null;
}

/** The back button's label: the sheet the page was opened from. */
function backLabel(ctx: PlayerContext): string {
  return ctx.kind === 'squad' ? 'Squad' : ctx.kind === 'freeAgent' ? 'Recruit' : ctx.club.name;
}

function statBars(stats: PlayerPageModel['stats'], focus: string | null): HTMLElement {
  return el('div', { class: 'nrl-statbars nrl-player-stats' }, ...stats.map(({ label, value, gain }) => {
    const fill = el('div', { class: 'nrl-statfill' });
    fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    const row = el('div', { class: 'nrl-statrow' },
      el('span', { text: label }), el('div', { class: 'nrl-stattrack' }, fill), el('span', { class: 'nrl-stat-val', text: String(value) }));
    // N11: what a week's training under the squad focus adds (a stat that does not move shows nothing).
    row.append(gain !== undefined && gain !== 0
      ? el('span', { class: `nrl-stat-gain${gain < 0 ? ' nrl-stat-loss' : ''}`, text: `${gain < 0 ? '−' : '+'}${Math.abs(gain).toFixed(1)}/wk`, attrs: { title: `A week's training under the ${focus} focus`, 'data-gain': '' } })
      : el('span'));
    return row;
  }));
}

/** Write the coach's lineup and keep it now, as the Lineup screen does. */
function setLineup(next: GameState['lineup']): void {
  if (next === getState().lineup) return;
  setState({ lineup: next });
  save(getState());
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const CURVE_W = 132;
const CURVE_H = 38;

/** The curve's rating axis spans at least this many points, so a one-point wobble reads as flat. */
const CURVE_MIN_SPAN = 20;

/** Each point of the curve in the SVG's box: age across, rating up, over at least CURVE_MIN_SPAN points. Pure. */
export function curveXY(points: readonly CareerPoint[], w = CURVE_W, h = CURVE_H): { x: number; y: number }[] {
  const min = Math.min(...points.map((q) => q.rating));
  const max = Math.max(...points.map((q) => q.rating));
  const grow = Math.max(0, CURVE_MIN_SPAN - (max - min)) / 2;
  const lo = min - grow;
  const hi = max + grow;
  const first = points[0]!.age;
  const span = Math.max(1, points[points.length - 1]!.age - first);
  const pad = 3;
  return points.map((q) => ({
    x: pad + ((q.age - first) / span) * (w - 2 * pad),
    y: pad + (1 - (q.rating - lo) / (hi - lo)) * (h - 2 * pad),
  }));
}

/** The age curve (#369): rating against age, today ringed, the peak on a dotted line, in the sheet's yellow. */
function careerCurve(o: PlayerOutlook): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${CURVE_W} ${CURVE_H}`);
  svg.setAttribute('class', 'nrl-player-curve');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Projected rating by age: ${o.points.map((q) => `${q.rating} at ${q.age}`).join(', ')}`);
  const xy = curveXY(o.points);
  const add = (tag: string, attrs: Record<string, string | number>): void => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    svg.append(n);
  };
  const peak = xy[o.points.indexOf(o.peak)]!;
  add('line', { x1: peak.x, x2: peak.x, y1: 0, y2: CURVE_H, stroke: 'var(--nrl-muted)', 'stroke-width': 1, 'stroke-dasharray': '2 2' });
  add('polyline', { points: xy.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '), fill: 'none', stroke: 'var(--nrl-accent)', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  add('circle', { cx: xy[0]!.x, cy: xy[0]!.y, r: 3, fill: 'var(--nrl-text)' });
  return svg;
}

/**
 * Open the page for `player` as found in `ctx`. It follows the player through
 * state changes (a renewal updates the contract line; a sale, release or
 * signing closes it). `onClose` runs when it closes by any route (◂ back, a
 * dock tap), so a rival squad can come back.
 */
export function openPlayerPage(player: Player, ctx: PlayerContext, opts: { onClose?: () => void } = {}): HTMLElement {
  ensurePlayerStyles();
  const content = el('div', { class: `nrl-player${ctx.kind === 'rival' ? ' nrl-player-rival' : ''}`, attrs: { 'data-player-page': player.id } });
  let armed: PlayerActionId | null = null;
  let closed = false;

  const finish = (): void => {
    if (closed) return;
    closed = true;
    off();
    closeModal();
    opts.onClose?.();
  };
  const back = backButton(backLabel(ctx), finish);

  const render = (): void => {
    const state = getState();
    const p = findPlayer(player.id, ctx, state);
    if (!p) { finish(); return; }
    const m = playerPageModel(p, ctx, state);
    const kit = kitFor(ctx, state);

    // Left: who he is, his overall and fitness, his deal.
    const portrait = el('img', {
      class: 'nrl-player-portrait',
      attrs: { src: portraitDataUrl(p.id, kit), alt: '', width: String(PORTRAIT_W * 4), height: String(PORTRAIT_H * 4) },
    });
    const meta = [m.position, `age ${m.age}`, ...(m.number !== null ? [`#${m.number}`] : [])].join(' · ');
    const fit = el('b', { text: p.injuredWeeks > 0 ? 'OUT' : `${m.fitnessPct}%` });
    fit.style.color = fitColour(m.fitnessPct);
    const card = el('div', { class: 'nrl-player-card' },
      back,
      el('div', { class: 'nrl-player-top' }, portrait,
        el('div', { class: 'nrl-player-id' },
          el('div', { class: 'nrl-player-name', text: m.name }),
          el('div', { class: 'nrl-player-meta', text: meta }))),
      el('div', { class: 'nrl-player-where', text: m.where }),
      ...(m.fitness !== 'Fit' ? [el('div', { class: 'nrl-player-where nrl-player-out', text: m.fitness })] : []),
      el('div', { class: 'nrl-player-tiles' },
        el('div', { class: 'nrl-player-tile', attrs: { title: 'Overall rating' } }, el('b', { text: String(m.overall) }), el('span', { text: 'overall' })),
        el('div', { class: 'nrl-player-tile', attrs: { title: `Fitness: 100 less his injury risk (${p.injuryRisk}); 0 while injured` } }, fit, el('span', { text: 'fitness' }))),
      el('div', { class: `nrl-player-deal${m.contract.expiring ? ' nrl-player-expiring' : ''}`, text: ctx.kind === 'freeAgent' ? m.contract.text : `Contract: ${m.contract.text}` }),
      ...(m.tenure ? [el('div', { class: 'nrl-player-deal', text: m.tenure })] : []),
    );

    // Middle: his stats and this week's training, traits, condition, record.
    const line = (label: string, text: string): HTMLElement =>
      el('div', { class: 'nrl-player-line' }, el('b', { text: `${label}: ` }), text);
    const moraleText = `${m.morale.word} (${m.morale.value})${m.morale.reasons.length ? ' · ' + m.morale.reasons.join(', ') : ''}`;
    const about = el('div', { class: 'nrl-player-col nrl-player-about' },
      el('h3', { text: m.trainingFocus ? `Stats · this week's training: ${m.trainingFocus}` : 'Stats' }),
      statBars(m.stats, m.trainingFocus),
      // #369: the projection, under the stats it comes from.
      el('h3', { text: 'Outlook' }),
      el('div', { class: 'nrl-player-outlook', attrs: { 'data-outlook': m.outlook.stage, title: 'Your training rules run forward from your facilities and focus today: a projection, not a hidden potential stat.' } },
        careerCurve(m.outlook),
        el('div', { class: 'nrl-player-outlook-text' },
          el('div', {}, el('b', { text: m.outlook.stage }), ' · ', m.outlook.peakText),
          ...(m.outlook.retirement ? [el('div', { class: 'nrl-player-expiring', text: m.outlook.retirement })] : []),
          el('small', { text: 'A projection: it depends on your facilities.' }))),
      el('h3', { text: 'Traits' }),
      ...(m.traits.length > 0
        ? m.traits.map((t) => el('div', { class: `nrl-player-trait${t.bad ? ' nrl-player-trait-bad' : ''}` }, el('b', { text: t.label }), t.tip))
        : [el('div', { class: 'nrl-player-line', text: 'None — a solid citizen' })]),
      el('h3', { text: 'Condition' }),
      line('Morale', moraleText),
      line('Injury risk', m.injuryRisk),
      ...(m.season || m.career ? [el('h3', { text: 'Record' })] : []),
      ...(m.season ? [line('This season', fmtTally(m.season))] : []),
      ...(m.career ? [line('Career', fmtTally(m.career))] : []),
    );

    // Right: his jobs in the nine (N11), then the deals pinned at the foot.
    const side = el('div', { class: 'nrl-player-side' });
    const notes: { text: string; attn: boolean }[] = [];
    if (m.roles) {
      const roles = m.roles;
      // The Lineup screen's switches: picking the man already chosen goes back to the default.
      const role = (job: string, on: boolean, attr: 'kicker' | 'captain', pick: () => void): HTMLButtonElement => {
        const b = button('', pick, { class: 'nrl-player-role' });
        b.append(el('span', { text: job }), el('span', { class: 'nrl-player-role-state', text: on ? 'On' : 'Off' }));
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('data-player-role', attr);
        b.disabled = !roles.starter;
        b.title = !roles.starter ? 'Starters only' : on ? 'His job: tap to go back to the default' : `Make him the ${job.toLowerCase()}`;
        return b;
      };
      side.append(
        el('h3', { text: 'Roles' }),
        role('Goal-kicker', roles.kicker, 'kicker', () => setLineup(setKicker(getState().lineup, p.id))),
        role('Captain', roles.captain, 'captain', () => setLineup(setCaptain(getState().lineup, p.id))),
      );
      if (!roles.starter) notes.push({ text: 'Roles: starters only — pick him in the nine', attn: true });
    }
    for (const a of m.actions) {
      const verb = a.label.split(/[ ·+]/)[0];
      if (a.why) notes.push({ text: `${verb}: ${a.why}`, attn: true });
      else if (a.detail) notes.push({ text: `${verb}: ${a.detail}`, attn: false });
    }
    if (ctx.kind === 'rival') notes.push({ text: `Plays for ${ctx.club.name}: not for sale`, attn: false });
    if (notes.length) {
      side.append(el('div', { class: 'nrl-player-why' },
        ...notes.map((n) => el('div', { class: n.attn ? 'nrl-attn' : '', text: n.text, attrs: { title: n.text } }))));
    }
    if (m.actions.length) {
      const actions = el('div', { class: 'nrl-player-actions' });
      for (const a of m.actions) {
        // Renew or Sign is the page's one primary; Sell and Release share the row under it.
        const primary = a.id === 'renew' || a.id === 'sign';
        const btn = button(armed === a.id && a.confirm ? a.confirm : a.label, () => {
          if (a.confirm && armed !== a.id) { armed = a.id; render(); return; }
          armed = null;
          const res = runAction(a.id, p.id);
          if (!res.ok) bus.emit('ui:notify', { text: FAILURE[res.reason ?? ''] ?? 'Not possible.', kind: 'info' });
        }, { class: primary ? 'nrl-btn-primary' : 'nrl-btn-danger' });
        btn.setAttribute('data-player-action', a.id);
        if (!a.enabled) { btn.disabled = true; btn.title = a.why ?? ''; }
        else if (a.detail) btn.title = a.detail;
        actions.append(btn);
      }
      side.append(actions);
    }

    // A rival's man has no jobs or deals here: two columns, the note under his card.
    if (ctx.kind === 'rival') {
      card.append(...side.childNodes);
      content.replaceChildren(card, about);
    } else content.replaceChildren(card, about, side);
  };

  const off = bus.on('state:changed', () => {
    if (!content.isConnected) { off(); return; }
    render();
  });
  render();
  // A full sheet in the band above the dock (#203); ◂ back is the one close (#349 A5).
  const backdrop = openModal(content, { class: 'nrl-player-modal', region: true });
  // The backdrop's own listener has closed the dialog; tell whoever opened it.
  backdrop.addEventListener('click', () => { if (!closed) { closed = true; off(); opts.onClose?.(); } });
  return backdrop;
}
