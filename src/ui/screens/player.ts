import { careerActionClock } from '../../core/season';
import { quotePlayerSale } from '../../systems/playerTransfers';
import { saleConfirmation } from '../saleConfirmation';
import { playerHistory } from '../playerHistory';
import { discoveredFreeAgents } from '../../systems/playerCareer';
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
// renders it. Rename (#398), beside ◂ back, swaps the name for a name field
// for any player: yours, a free agent or a rival's. No Phaser.

import { bus } from '../../core/events';
import { getState, setState, type GameState, type Player, type PlayerStats, type RivalClub, type StatTally } from '../../core/state';
import { save } from '../../core/save';
import { marketWage, overallRating, playerStars, shownStats } from '../../data/player';
import { ROMAN, TRAITS, headlineTrait, traitTip } from '../../data/traits';
import { PROGRESSION, MORALE, SQUAD_CAP, SQUAD_MIN } from '../../config';
import { renewEarly, renewalRefusal, sellPlayer } from '../../systems/contracts';
import { releasePlayer, signingFee, signingFeeBasis } from '../../systems/freeagency';
import { capRoomFor, releaseTerms, renewalAsk, salaryDemand, contractActionView, activeSalary } from '../../systems/cap';
import { hasStaff } from '../../systems/staff';
import { signWithUndo } from '../../systems/undo';
import { activePack } from '../../content';
import { PLAYER_ID } from '../../systems/fixtures';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { PORTRAIT_H, PORTRAIT_W, TRAINING_KIT, portraitDataUrl } from '../../art/portrait';
import { ARMED_CLASS, armGuard, armedTap, backButton, button, closeModal, el, openModal, segmented, type SegItem } from '../dom';
import { ensurePartsStyles, fitnessTone, starsEl, statTile, statusPill, type Tone } from '../parts';
import { ensureScreenStyles } from './recruit';
import { fmtMoney } from './finance';
import { focusLabel, spendPointBlock, spendSquadPoint } from '../../systems/training';
import { LINEUP_SLOTS, commitLineup, resolveLineup, setCaptain, setKicker, statsAt } from '../../systems/lineup';
import { kickerAndCaptain } from '../../match/league/sheets';
import { potentialText } from '../../systems/potential';
import { renamePlayer } from '../../systems/rename';
import { nameField, renameButton } from '../rename';
import { awayPlayerIds, campDisposalProblem } from '../../systems/playerAssignments';
import { campAbsenceText, campAvailability } from './playerAssignments';

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
  assignment: string | null;
  /** Each stat, and (your own players, N11) what a week's training under the squad focus adds. */
  stats: { label: string; value: number; gain?: number; key?: keyof PlayerStats; ceiling?: number; focus?: boolean }[];
  /** The squad's training focus in words, for your own players (N11). */
  trainingFocus: string | null;
  traits: { label: string; tip: string; bad: boolean; name?: string; level?: number; blurb?: string; seen?: string | undefined; headline?: boolean }[];
  /** His rating in half stars (SuperCOOKED §3.5: no number on the page). */
  stars?: number;
  /** Level points banked for the coach to spend (your own players only; §7 #1). */
  unspent?: number;
  /** The season his deal ends, when he has a signed one. */
  endSeason?: number | null;
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
  potential: string;
  xp: string;
  actions: PlayerAction[];
}

const STAT_LABELS: readonly [keyof PlayerStats, string][] = [
  ['speed', 'Speed'], ['strength', 'Strength'], ['stamina', 'Stamina'], ['handling', 'Handling'], ['kicking', 'Kicking'], ['footyIQ', ''],
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
  const clock = careerActionClock(state);
  p = contractActionView(state, p);
  if (ctx.kind === 'rival') return [];
  if (ctx.kind === 'freeAgent') {
    const fee = signingFee(state, p);
    const salary = salaryDemand(p);
    const full = state.squad.length >= SQUAD_CAP;
    const broke = state.money < fee;
    const overCap = !capRoomFor(state.squad, state.capAccount, clock.season, salary);
    return [{
      id: 'sign',
      label: `Sign · ${fmtMoney(fee)}`,
      detail: `${signingFeeBasis(state, p)} · ${fmtMoney(salary)} a season on the cap`,
      enabled: !full && !broke && !overCap,
      ...(full ? { why: `Squad full (${SQUAD_CAP})` }
        : broke ? { why: `Not enough cash. The signing fee is ${fmtMoney(fee)}.` }
        : overCap ? { why: `Not enough cap room. He costs ${fmtMoney(salary)} a season.` }
        : {}),
    }];
  }
  const ask = renewalAsk(p, hasStaff(state, 'welfare'));
  const queued = p.deal?.renewal;
  const start = queued?.startSeason ?? (p.deal && p.deal.endSeason >= clock.season ? p.deal.endSeason + 1 : clock.season);
  const changed = p.deal && ask.salary !== p.deal.salary ? ` ${ask.why}.` : '';
  const blocked = renewalRefusal(state, p);
  const atMin = state.squad.length <= SQUAD_MIN;
  const minWhy = `Squad at the minimum (${SQUAD_MIN})`;
  const terms = releaseTerms(p, clock.season, clock.week, clock.duration);
  const short = state.money < terms.payout;
  const sale = quotePlayerSale(state, p.id);
  const campReleaseBlock = campDisposalProblem(state, p.id);
  return [
    {
      id: 'renew',
      label: 'Renew',
      detail: queued
        ? `From season ${queued.startSeason} at ${fmtMoney(queued.salary)} a season. No fee.`
        : blocked
          ? blocked.message
          : `From season ${start} at ${fmtMoney(ask.salary)} a season. No fee.${changed}`,
      enabled: !blocked,
      ...(blocked ? { why: blocked.message } : {}),
    },
    {
      id: 'sell',
      label: sale.ok ? `Sell +${fmtMoney(sale.offer.fee)}` : 'No buyer',
      enabled: sale.ok,
      ...(sale.ok ? { detail: `Review offer from ${state.league.clubs.find(c => c.id === sale.offer.buyerId)!.name}.` } : { why: sale.message }),
    },
    {
      id: 'release',
      label: `Release · ${fmtMoney(terms.payout)}`,
      detail: `Frees ${fmtMoney(terms.capFreed)} of this season's cap${terms.nextCapFreed ? ` and ${fmtMoney(terms.nextCapFreed)} next season` : ''}. No signing fee back.`,
      enabled: !atMin && !short && !campReleaseBlock,
      danger: true,
      confirm: 'Really release?',
      ...(campReleaseBlock ? { why: campReleaseBlock } : atMin ? { why: minWhy } : short ? { why: `Not enough cash. Releasing him costs ${fmtMoney(terms.payout)}.` } : {}),
    },
  ];
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
export function lineupSlotText(state: GameState, playerId: string): string {
  if (awayPlayerIds(state).has(playerId)) return 'Away at Skills Camp';
  // The side as it runs out (injured men covered, the bench topped up), not the saved sheet.
  const side = resolveLineup(state.lineup, state.squad, awayPlayerIds(state));
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
export function squadNumbers(state: GameState): Map<string, number> {
  const side = resolveLineup(state.lineup, state.squad, awayPlayerIds(state));
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
export function sideRoles(state: GameState): { starters: Set<string>; kicker?: string; captain?: string } {
  const side = resolveLineup(state.lineup, state.squad, awayPlayerIds(state));
  const nine = side.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
  return { starters: new Set(nine.map((p) => p.id)), ...kickerAndCaptain(nine, state.lineup) };
}

/** One man's jobs from {@link sideRoles}. */
function rolesOf(r: ReturnType<typeof sideRoles>, id: string): { starter: boolean; kicker: boolean; captain: boolean } {
  return { starter: r.starters.has(id), kicker: r.kicker === id, captain: r.captain === id };
}

/** Everything the page shows, from the player, where he is and the game state. */
export function playerPageModel(p: Player, ctx: PlayerContext, state: GameState): PlayerPageModel {
  const clock = careerActionClock(state);
  p = contractActionView(state, p);
  const squad = ctx.kind === 'squad';
  const headline = headlineTrait(p.position, p.traits);
  const queuedDeal = p.deal?.renewal;
  const annual = clock.structural ? activeSalary(p, clock.season) : p.deal?.salary ?? salaryDemand(p);
  const contract = ctx.kind === 'freeAgent'
    ? { text: `Fee ${fmtMoney(signingFee(state, p))} · ${fmtMoney(salaryDemand(p))} a season for the rest of ${clock.structural ? `season ${clock.season}` : 'this season'}`, expiring: false }
    : queuedDeal
      ? { text: `${weeksText(p.contractWeeks)} left on this deal · renewed from season ${queuedDeal.startSeason} at ${fmtMoney(queuedDeal.salary)}/season`, expiring: false }
      : { text: `${weeksText(p.contractWeeks)} left · ${fmtMoney(annual)}/season on the cap`, expiring: p.contractWeeks <= MORALE.EXPIRING_WEEKS };
  const seasonsAtClub = p.joinedSeason !== undefined ? clock.season - p.joinedSeason + 1 : null;
  // Keep the squad focus visible: it now controls level-point spending.
  const focus = state.training?.focus ?? 'balanced';
  const assignment = squad ? campAbsenceText(campAvailability(state), p.id) : null;
  return {
    xp: `Level ${p.level ?? 1} · XP ${Math.floor(p.xp ?? 0)}/${PROGRESSION.XP_PER_LEVEL}`,
    id: p.id,
    name: p.name,
    position: positionLabel(p.position),
    age: p.age,
    overall: overallRating(p),
    where: ctx.kind === 'squad' ? (awayPlayerIds(state).has(p.id) ? 'Your squad' : `Your squad · ${lineupSlotText(state, p.id)}`) : ctx.kind === 'freeAgent' ? (p.junior ? 'Academy prospect' : 'Free agent') : ctx.club.name,
    assignment,
    // Stats train in fractions; the page shows whole numbers.
    stats: shownStats(p.position).map((key) => ({
      label: key === 'footyIQ' ? activePack().vocab.iqStat : STAT_LABELS.find(([k]) => k === key)![1],
      value: Math.round(p.stats[key]),
      key,
      ceiling: Math.round(p.ceilings[key] ?? p.stats[key]),
      focus: squad && focus === key,
    })),
    trainingFocus: squad ? focusLabel(focus) : null,
    traits: p.traits
      .filter((t) => t.id in TRAITS)
      .map((t) => ({
        label: `${TRAITS[t.id].name} ${ROMAN[t.level]}`, tip: `${t === headline ? 'Headline trait. ' : ''}${traitTip(t.id)}`, bad: TRAITS[t.id].bad ?? false,
        name: TRAITS[t.id].name, level: t.level, blurb: TRAITS[t.id].blurb, seen: TRAITS[t.id].seen, headline: t === headline,
      })),
    stars: playerStars(p),
    unspent: squad ? p.unspentPoints ?? 0 : 0,
    endSeason: ctx.kind === 'freeAgent' ? null : (queuedDeal ? null : p.deal?.endSeason ?? null),
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
    potential: potentialText(p),
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
/* SuperCOOKED 35–37: one sheet over the one it was opened from (a region dialog, #203: the dock stays
   whole below it). Solid navy: the sheet under it must not show through. */
.nrl-dialog-region .nrl-modal.nrl-player-modal {
  width: 100%;
  max-width: 1180px;
  height: 100%;
  max-height: 100%;
  background: var(--nrl-navy);
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px var(--nrl-line), var(--nrl-shadow-tray);
  padding: 12px 16px;
}
/* The header (who he is, how he is), the tabs, the tab's page (it scrolls), its foot (it holds still). */
.nrl-player {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.8125rem;
}
.nrl-player > * { flex: 0 0 auto; min-width: 0; }
.nrl-player-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.nrl-player-head .nrl-back { flex: 0 0 auto; }
.nrl-player-portrait { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 8px; background: var(--nrl-raised); image-rendering: pixelated; image-rendering: crisp-edges; }
.nrl-player-id { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-player-name { font-family: var(--nrl-f-display); font-size: 1.375rem; line-height: 1; letter-spacing: -0.02em; text-transform: uppercase; overflow-wrap: anywhere; }
.nrl-player-meta { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-player-pills { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
.nrl-player-head .nrl-stars { flex: 0 0 auto; font-size: 1.625rem; }
.nrl-player-bar { display: flex; align-items: center; gap: 10px; min-width: 0; }
.nrl-player-bar .nrl-seg { flex: 0 1 auto; }
.nrl-player-bar .nrl-rename-open { margin-left: auto; }
/* The tab's page: it scrolls on its own; the header, the tabs and the foot hold still (#415). */
.nrl-player-panel { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; }
.nrl-player-panel > * { flex-shrink: 0; }
.nrl-player-foot { display: flex; align-items: center; gap: 10px; min-height: 44px; }
.nrl-player-foot > .nrl-player-where { flex: 1 1 auto; min-width: 0; }
.nrl-player-where { font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-player-out { color: var(--nrl-neg); }
/* Stats: his four as big tiles (00's stat tile); the faint bar is the ceiling. */
.nrl-player-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.nrl-player-stats .nrl-stat-tile { position: relative; }
.nrl-btn.nrl-spend-plus { position: absolute; top: 8px; right: 8px; width: 36px; min-width: 36px; min-height: 36px; height: 36px; padding: 0; border-radius: 8px; font-family: var(--nrl-f-display); font-size: 1.25rem; }
.nrl-btn.nrl-spend-plus::after { content: ''; position: absolute; inset: -4px; }
.nrl-spend-capped { position: absolute; top: 12px; right: 10px; font-family: var(--nrl-f-label); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-spend-left { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); }
/* Traits: a card each, the level as three pips. */
.nrl-player-traits { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 10px; }
.nrl-player-trait { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 14px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); overflow-wrap: anywhere; }
.nrl-player-trait-top { display: flex; align-items: center; gap: 8px; }
.nrl-player-trait-name { flex: 1 1 auto; font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-player-trait-bad .nrl-player-trait-name { color: var(--nrl-neg); }
.nrl-player-pips { flex: 0 0 auto; display: flex; gap: 3px; }
.nrl-player-pips > span { width: 14px; height: 5px; border-radius: 3px; background: var(--nrl-line); }
.nrl-player-pips > span[data-on] { background: var(--nrl-text); }
.nrl-player-trait-tag { font-family: var(--nrl-f-label); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 6px; border-radius: 6px; background: var(--nrl-raised); color: var(--nrl-text-2); }
.nrl-player-trait-what { font-size: 0.8125rem; line-height: 1.4; color: var(--nrl-text-2); }
.nrl-player-trait-seen { font-size: 0.6875rem; line-height: 1.4; color: var(--nrl-muted); }
/* Deal: his jobs in the side, then the contract card with its deals. */
.nrl-player-deal-tab { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.nrl-player-deal-tab.nrl-player-deal-one { grid-template-columns: minmax(0, 1fr); }
.nrl-player-jobs { display: flex; flex-direction: column; gap: 8px; }
.nrl-player h3 { margin: 0; font-family: var(--nrl-f-num); font-size: 0.625rem; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-btn.nrl-player-role { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; padding: 0 12px 0 14px; border-radius: 12px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); font-size: 1rem; }
.nrl-player-role-knob { flex: 0 0 auto; width: 38px; height: 22px; padding: 3px; box-sizing: border-box; border-radius: 11px; background: var(--nrl-line); display: flex; align-items: center; }
.nrl-player-role-knob::before { content: ''; width: 16px; height: 16px; border-radius: 50%; background: var(--nrl-muted); }
.nrl-player-role[aria-pressed="true"] .nrl-player-role-knob { background: var(--nrl-accent); justify-content: flex-end; }
.nrl-player-role[aria-pressed="true"] .nrl-player-role-knob::before { background: var(--nrl-on-accent); }
.nrl-player-role-state { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.nrl-player-contract { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 14px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); }
.nrl-player-contract-ends { font-family: var(--nrl-f-display); font-size: 1.375rem; line-height: 1; text-transform: uppercase; letter-spacing: -0.02em; }
.nrl-player-deal { font-size: 0.8125rem; line-height: 1.35; color: var(--nrl-text-2); }
.nrl-player-expiring { color: var(--nrl-neg); }
/* The deals sit in the page's foot (3f): it never scrolls, so they are always on screen. */
.nrl-player-deal-foot { flex-direction: column; align-items: flex-end; gap: 6px; }
.nrl-player-deal-foot .nrl-player-why { flex: 0 0 auto; align-self: stretch; }
.nrl-player-actions { flex: 0 0 auto; display: flex; gap: 8px; }
.nrl-player-actions .nrl-btn { min-width: 7.5rem; padding: 0 14px; white-space: normal; }
/* What each deal costs, and why one is shut (in amber, SuperCOOKED §3.2). Whole lines, wrapped (#415). */
.nrl-player-why { display: flex; flex-direction: column; gap: 2px; font-size: 0.6875rem; line-height: 1.35; color: var(--nrl-muted); }
.nrl-player-why .nrl-attn { color: var(--nrl-neg); }
/* Record: the lines the first view leaves out (level, potential, condition, tallies, club history). */
.nrl-player-line { font-size: 0.8125rem; line-height: 1.45; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-player-line b { color: var(--nrl-muted); font-weight: 500; }
.nrl-player [data-club-history] { flex: 0 0 auto; }
.nrl-player [data-club-history] h3 { margin-top: 6px; }
/* Short sheets (667×375, 956×330): the tiles and the head close up so the stats fit unscrolled. */
@media (max-height: 400px) {
  .nrl-dialog-region .nrl-modal.nrl-player-modal { padding: 8px 12px; }
  .nrl-player { gap: 6px; }
  .nrl-player-name { font-size: 1.125rem; }
  .nrl-player-head .nrl-stars { font-size: 1.25rem; }
  .nrl-player-stats { gap: 6px; }
  .nrl-player-stats .nrl-stat-tile { padding: 8px 10px; gap: 4px; }
  .nrl-player-stats .nrl-stat-value { font-size: 1.75rem; }
  .nrl-player-head .nrl-back { min-height: 36px; }
}
/* A narrow phone (667): the pills give way to the name; the deal's two halves stack when Large. */
@media (max-width: 760px) {
  .nrl-player-head { gap: 8px; }
  .nrl-player-pills { gap: 4px; }
  .nrl-player-pills .nrl-pill { min-height: 1.375rem; padding: 0 7px; font-size: 0.6875rem; gap: 4px; }
  .nrl-player-head .nrl-stars { font-size: 1.125rem; }
  .nrl-player-portrait { display: none; }
}
html[data-text-size] .nrl-player-name { font-size: 1.125rem; overflow-wrap: break-word; }
@media (max-width: 760px) {
  html[data-text-size] .nrl-player-deal-tab { grid-template-columns: minmax(0, 1fr); }
  html[data-text-size] .nrl-player-head .nrl-stars { font-size: 0.875rem; }
  html[data-text-size] .nrl-player-stats .nrl-stat-label { font-size: 0.6875rem; }
}
`;

const FAILURE: Record<string, string> = {
  'squad-full': 'Squad is full — release a player first.',
  'insufficient-funds': 'Not enough cash.',
  'over-cap': 'Not enough salary-cap room.',
  'not-found': 'That player is no longer there.',
  'already-renewed': 'A renewal is already queued.',
  'not-final-season': 'A renewal waits until the last season of his deal.',
  'no-buyer': 'No club has bought him. Nothing was changed.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
};

/** Run an action through the system function that owns it. */
function runAction(id: PlayerActionId, playerId: string): { ok: boolean; reason?: string; message?: string } {
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
  // A rival's club as the league has it now: a rename (#398) replaces the object the page opened with.
  const club = ctx.kind === 'rival' ? state.league.clubs.find((c) => c.id === ctx.club.id) ?? ctx.club : null;
  const list = ctx.kind === 'squad' ? state.squad : ctx.kind === 'freeAgent' ? discoveredFreeAgents(state) : (club?.squad ?? []);
  return list.find((p) => p.id === id) ?? null;
}

/** The back button's label: the sheet the page was opened from. */
function backLabel(ctx: PlayerContext): string {
  return ctx.kind === 'squad' ? 'Squad' : ctx.kind === 'freeAgent' ? 'Recruit' : ctx.club.name;
}

/** The page's four tabs (SuperCOOKED 35–37, and Record for what the first view leaves out). */
type PlayerTab = 'stats' | 'traits' | 'deal' | 'record';
const PLAYER_TABS: readonly SegItem<PlayerTab>[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'traits', label: 'Traits' },
  { id: 'deal', label: 'Deal' },
  { id: 'record', label: 'Record', title: 'Level, potential, condition, tallies and club history' },
];

/** Morale's tone for its pill (SuperCOOKED §3.7, moraleWord's bands): happy good, content neither, then watch, then bad. */
export function moraleTone(m: number): Tone {
  return m >= 70 ? 'pos' : m >= 50 ? 'muted' : m >= 30 ? 'neg' : 'alert';
}

/** The fitness pill: "Fit 88%" in its tone, or "Out 3 wk" / "Banned 2 wk" in red. */
function fitnessPill(p: Player, pct: number): HTMLElement {
  if (p.injuredWeeks > 0) return statusPill(`Out ${p.injuredWeeks} wk`, 'alert');
  if ((p.suspendedWeeks ?? 0) > 0) return statusPill(`Banned ${p.suspendedWeeks} wk`, 'alert');
  return statusPill(`Fit ${pct}%`, fitnessTone(pct));
}

/**
 * Open the page for `player` as found in `ctx`. It follows the player through
 * state changes (a renewal updates the contract card; a sale, release or
 * signing closes it). `onClose` runs when it closes by any route (◂ back, a
 * dock tap), so a rival squad can come back.
 */
export function openPlayerPage(player: Player, ctx: PlayerContext, opts: { onClose?: () => void } = {}): HTMLElement {
  ensurePlayerStyles();
  ensurePartsStyles();
  const content = el('div', { class: `nrl-player${ctx.kind === 'rival' ? ' nrl-player-rival' : ''}`, attrs: { 'data-player-page': player.id } });
  let tab: PlayerTab = 'stats';
  // Spending level points by hand (§7 #1): the tiles take a + while it is open.
  let spending = false;
  let armed: PlayerActionId | null = null;
  // The armed button's wait (#612, dom.ts armGuard): four seconds or a tap anywhere else puts
  // it back in place, with no re-render under that tap.
  let stopWait: (() => void) | null = null;
  let atRest: (() => void) | null = null;
  // When it was armed: a second tap inside ARMED_REPEAT_MS is the first one again (#617).
  let armedAt = 0;
  const arm = (id: PlayerActionId | null): void => {
    armed = id;
    armedAt = performance.now();
    stopWait?.();
    stopWait = id ? armGuard(() => { armed = null; stopWait = null; atRest?.(); }) : null;
  };
  let saleReview: HTMLElement | null = null;
  let closed = false;
  // Rename (#398): the field's open, and what's typed survives a re-render.
  let renaming: string | null = null;

  const finish = (): void => {
    if (closed) return;
    closed = true;
    stopWait?.();
    off();
    closeModal();
    opts.onClose?.();
  };
  const back = backButton(backLabel(ctx), finish);

  /** The deals (Sign / Renew / Sell / Release) as buttons, with the two-tap Release and the sale review. */
  const dealButtons = (p: Player, m: PlayerPageModel): HTMLElement | null => {
    atRest = null;
    // Sell shows only once a club would buy him (SuperCOOKED 37: "No buyer" stays out of sight).
    const shown = m.actions.filter((a) => a.id !== 'sell' || a.enabled);
    if (!shown.length) return null;
    const actions = el('div', { class: 'nrl-player-actions' });
    for (const a of shown) {
      // Renew or Sign is the tab's one primary; Sell and Release are destructive.
      const primary = a.id === 'renew' || a.id === 'sign';
      const ask = armed === a.id ? a.confirm : undefined;
      const btn = button(ask ?? a.label, () => {
        if (a.id === 'sell') {
          arm(null);
          saleReview = saleConfirmation(p.id, {
            back,
            onCancel: () => { saleReview = null; render(); content.querySelector<HTMLButtonElement>('[data-player-action="sell"]')?.focus(); },
            onSold: () => finish(),
          });
          render(); saleReview.querySelector<HTMLButtonElement>('[data-sale-cancel]')?.focus(); return;
        }
        if (a.confirm && armed !== a.id) { arm(a.id); render(); return; }
        if (a.confirm && !armedTap(performance.now() - armedAt)) return;
        arm(null);
        const res = runAction(a.id, p.id);
        if (!res.ok) bus.emit('ui:notify', { text: res.message ?? FAILURE[res.reason ?? ''] ?? 'Not possible.', kind: 'info' });
      }, { class: primary ? 'nrl-btn-primary' : ask ? `nrl-btn-danger ${ARMED_CLASS}` : 'nrl-btn-danger' });
      if (ask) atRest = () => { btn.classList.remove(ARMED_CLASS); btn.textContent = a.label; };
      btn.setAttribute('data-player-action', a.id);
      if (!a.enabled) { btn.disabled = true; btn.title = a.why ?? ''; }
      else if (a.detail) btn.title = a.detail;
      actions.append(btn);
    }
    return actions;
  };

  const render = (): void => {
    const state = getState();
    const p = findPlayer(player.id, ctx, state);
    if (!p) { finish(); return; }
    content.classList.toggle('nrl-player-sale', saleReview !== null);
    if (saleReview) {
      content.replaceChildren(saleReview);
      return;
    }
    const m = playerPageModel(p, ctx, state);
    const kit = kitFor(ctx, state);
    const unspent = m.unspent ?? 0;
    if (unspent <= 0) spending = false;

    // The header: ◂ back, who he is, how he is (fitness and morale, each a word, §3.7), his stars.
    const portrait = el('img', {
      class: 'nrl-player-portrait',
      attrs: { src: portraitDataUrl(p.id, kit), alt: '', width: String(PORTRAIT_W * 4), height: String(PORTRAIT_H * 4) },
    });
    const meta = [m.position, `age ${m.age}`, ...(m.number !== null ? [`#${m.number}`] : [])].join(' · ');
    const rename = renaming === null
      ? null
      : nameField({
        value: renaming,
        kept: p.name,
        label: 'Player name',
        attr: 'data-player-rename',
        onDraft: (text) => { renaming = text; },
        onCancel: () => { renaming = null; render(); },
        onSave: (name) => {
          const res = renamePlayer(getState(), p.id, name);
          if (!res.ok) return res.why;
          renaming = null;
          if (res.patch) {
            // The page draws again with the new name: no toast.
            setState(res.patch);
            save(getState());
          } else render();
          return null;
        },
      });
    const head = el('div', { class: 'nrl-player-head' }, back, portrait,
      el('div', { class: 'nrl-player-id' },
        ...(rename ? [rename] : [el('div', { class: 'nrl-player-name', text: m.name })]),
        el('div', { class: 'nrl-player-meta', text: meta })),
      el('div', { class: 'nrl-player-pills' },
        fitnessPill(p, m.fitnessPct),
        statusPill(m.morale.word, moraleTone(m.morale.value))),
      starsEl(m.stars ?? 0));

    // The tabs, and Rename at the row's end.
    const tabs = segmented(PLAYER_TABS, tab, (id) => { tab = id; spending = false; render(); }, { label: 'Player page', class: 'nrl-player-tabs' });
    for (const [id, b] of tabs.buttons) b.setAttribute('data-player-tab', id);
    const bar = el('div', { class: 'nrl-player-bar' }, tabs.el,
      ...(rename ? [] : [renameButton(() => { renaming = m.name; render(); })]));

    const panel = el('div', { class: 'nrl-player-panel', attrs: { 'data-player-panel': tab } });
    let foot: HTMLElement | null = null;
    const line = (label: string, text: string, attrs: Record<string, string> = {}): HTMLElement =>
      el('div', { class: 'nrl-player-line', attrs }, el('b', { text: `${label}: ` }), text);

    if (tab === 'stats') {
      // His four stats (shownStats), the training focus in the accent, the ceiling the faint bar.
      const tiles = el('div', { class: 'nrl-player-stats' }, ...m.stats.map((st) => {
        const tile = statTile({ label: st.focus ? `${st.label} · Training` : st.label, value: st.value, ...(st.ceiling !== undefined ? { ceiling: st.ceiling } : {}), focus: st.focus === true });
        tile.classList.add('nrl-statrow');
        if (spending && st.key) {
          const key = st.key;
          if (spendPointBlock(p, key) === 'at-ceiling') tile.append(el('span', { class: 'nrl-spend-capped', text: 'At ceiling' }));
          else {
            const plus = button('+', () => { spendSquadPoint(p.id, key); }, { class: 'nrl-spend-plus nrl-btn-outline' });
            plus.setAttribute('data-spend-stat', key);
            plus.setAttribute('aria-label', `Put a point into ${st.label}`);
            tile.append(plus);
          }
        }
        return tile;
      }));
      panel.append(tiles);
      foot = el('div', { class: 'nrl-player-foot' },
        el('div', { class: `nrl-player-where${m.injured ? ' nrl-player-out' : ''}`, text: m.injured ? `${m.where} · ${m.fitness}` : m.where }),
        ...(m.assignment ? [el('div', { class: 'nrl-player-where', text: m.assignment, attrs: { 'data-camp-absence': p.id } })] : []));
      if (spending) {
        const done = button('Done', () => { spending = false; render(); }, { class: 'nrl-btn-outline' });
        done.setAttribute('data-spend-done', '');
        foot.append(el('span', { class: 'nrl-spend-left', text: `${unspent} point${unspent === 1 ? '' : 's'} to spend` }), done);
      } else if (unspent > 0) {
        const spend = button(`Spend ${unspent} point${unspent === 1 ? '' : 's'} ▸`, () => { spending = true; render(); }, { class: 'nrl-btn-primary' });
        spend.setAttribute('data-spend-open', '');
        spend.title = 'Each tap of + puts one point into that stat, up to its ceiling';
        foot.append(spend);
      }
    } else if (tab === 'traits') {
      // A card per trait: its name, its level as three pips, what it does, how it shows on the pitch.
      panel.append(m.traits.length > 0
        ? el('div', { class: 'nrl-player-traits' }, ...m.traits.map((t) => {
          const pips = el('span', { class: 'nrl-player-pips', attrs: { role: 'img', 'aria-label': `Level ${t.level ?? 1} of 3` } },
            ...[1, 2, 3].map((n) => el('span', n <= (t.level ?? 1) ? { attrs: { 'data-on': '' } } : {})));
          return el('div', { class: `nrl-player-trait${t.bad ? ' nrl-player-trait-bad' : ''}`, attrs: t.headline ? { 'data-headline': '' } : {} },
            el('div', { class: 'nrl-player-trait-top' },
              el('span', { class: 'nrl-player-trait-name', text: t.name ?? t.label }),
              ...(t.headline ? [el('span', { class: 'nrl-player-trait-tag', text: 'Headline trait' })] : []),
              pips),
            el('div', { class: 'nrl-player-trait-what', text: t.blurb ?? t.tip }),
            ...(t.seen ? [el('div', { class: 'nrl-player-trait-seen', text: `On the pitch: ${t.seen}` })] : []));
        }))
        : el('div', { class: 'nrl-player-line', text: 'None — a solid citizen' }));
    } else if (tab === 'deal') {
      const notes: { text: string; attn: boolean }[] = [];
      const jobs = el('div', { class: 'nrl-player-jobs' });
      if (m.roles) {
        const roles = m.roles;
        // The goal-kicker and captain switches: picking the man already chosen goes back to the default.
        const role = (job: string, on: boolean, attr: 'kicker' | 'captain', pick: () => void): HTMLButtonElement => {
          const b = button('', pick, { class: 'nrl-player-role' });
          b.append(el('span', { text: job }), el('span', { class: 'nrl-player-role-knob', attrs: { 'aria-hidden': 'true' } }),
            el('span', { class: 'nrl-player-role-state', text: on ? 'On' : 'Off' }));
          b.setAttribute('aria-pressed', String(on));
          b.setAttribute('data-player-role', attr);
          b.disabled = !roles.starter;
          b.title = !roles.starter ? 'Starters only' : on ? 'His job: tap to go back to the default' : `Make him the ${job.toLowerCase()}`;
          return b;
        };
        jobs.append(el('h3', { text: 'In the side' }),
          role('Goal-kicker', roles.kicker, 'kicker', () => {
            const live = getState();
            commitLineup(setKicker(live.lineup, p.id, awayPlayerIds(live)));
          }),
          role('Captain', roles.captain, 'captain', () => {
            const live = getState();
            commitLineup(setCaptain(live.lineup, p.id, awayPlayerIds(live)));
          }));
        if (!roles.starter) notes.push({ text: 'Roles: starters only — pick him in the nine', attn: true });
      }
      for (const a of m.actions) {
        if (a.id === 'sell' && !a.enabled) continue; // no buyer: Sell stays out of sight
        const verb = a.label.split(/[ ·+]/)[0];
        if (a.why) notes.push({ text: `${verb}: ${a.why}`, attn: true });
        else if (a.detail) notes.push({ text: `${verb}: ${a.detail}`, attn: false });
      }
      if (ctx.kind === 'rival') notes.push({ text: `Plays for ${ctx.club.name}: not for sale`, attn: false });
      const card = el('div', { class: 'nrl-player-contract' },
        el('h3', { text: ctx.kind === 'freeAgent' ? 'To sign him' : 'Contract' }),
        ...(m.endSeason ? [el('div', { class: 'nrl-player-contract-ends', text: `Ends season ${m.endSeason}` })] : []),
        el('div', { class: `nrl-player-deal${m.contract.expiring ? ' nrl-player-expiring' : ''}`, text: ctx.kind === 'freeAgent' ? m.contract.text : `Contract: ${m.contract.text}` }),
        ...(m.tenure ? [el('div', { class: 'nrl-player-deal', text: m.tenure })] : []));
      // What each deal costs sits under the contract; why one is shut (§3.2: disabled says why) goes
      // above the deals in the foot, which never scrolls, so a phone (no `title`) reads it whole.
      const whyLines = (list: typeof notes): HTMLElement => el('div', { class: 'nrl-player-why' },
        ...list.map((n) => el('div', { class: n.attn ? 'nrl-attn' : '', text: n.text, attrs: { title: n.text } })));
      const costs = notes.filter((n) => !n.attn);
      const shut = notes.filter((n) => n.attn);
      if (costs.length) card.append(whyLines(costs));
      panel.append(el('div', { class: `nrl-player-deal-tab${m.roles ? '' : ' nrl-player-deal-one'}` }, ...(m.roles ? [jobs] : []), card));
      // The deals hold still at the foot, on screen without scrolling (3f).
      const deals = dealButtons(p, m);
      if (deals) foot = el('div', { class: 'nrl-player-foot nrl-player-deal-foot' }, ...(shut.length ? [whyLines(shut)] : []), deals);
    } else {
      // Record: what the first view leaves out, all still here (SuperCOOKED 35, "moved off the page").
      const moraleText = `${m.morale.word} (${m.morale.value})${m.morale.reasons.length ? ' · ' + m.morale.reasons.join(', ') : ''}`;
      panel.append(
        line('Level', m.xp.replace(/^Level /, ''), { 'data-xp': '' }),
        el('div', { class: 'nrl-player-line', attrs: { 'data-potential': '' }, text: m.potential }),
        ...(m.trainingFocus ? [line("This week's training", m.trainingFocus)] : []),
        line('Morale', moraleText),
        line('Injury risk', m.injuryRisk),
        ...(m.season ? [line('This season', fmtTally(m.season))] : []),
        ...(m.career ? [line('Career', fmtTally(m.career))] : []),
        ...(m.tenure ? [el('div', { class: 'nrl-player-line', text: m.tenure })] : []),
        playerHistory(p, state),
      );
    }

    // A redraw (a job switched, a point spent, Rename) keeps the tab's place (#614).
    const top = content.querySelector<HTMLElement>('.nrl-player-panel')?.getAttribute('data-player-panel') === tab
      ? content.querySelector<HTMLElement>('.nrl-player-panel')!.scrollTop : 0;
    content.replaceChildren(head, bar, panel, ...(foot ? [foot] : []));
    if (top) panel.scrollTop = top;
  };

  const off = bus.on('state:changed', () => {
    if (!content.isConnected) { off(); return; }
    render();
  });
  render();
  // A full sheet in the band above the dock (#203); ◂ back is the one close (#349 A5).
  // A drill-in from a list: it cuts in, with no dialog's entrance (#606).
  const backdrop = openModal(content, { class: 'nrl-player-modal', region: true, cut: true, onRemove: () => stopWait?.() });
  // The backdrop's own listener has closed the dialog; tell whoever opened it.
  backdrop.addEventListener('click', () => { if (!closed) { closed = true; off(); opts.onClose?.(); } });
  return backdrop;
}
