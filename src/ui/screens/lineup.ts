import { leagueSeasonView, nextSeasonFixture } from '../../systems/leagueSeasonView';
import { roundLabel } from '../../systems/matchday';
// src/ui/screens/lineup.ts — the Lineup screen (GitHub #69; 3e Broadcast Quiet):
// pick the nine starters and the interchange bench, and how hard the bench is
// rotated. Nine tiles on a mini-pitch laid out like the formation (the hooker
// and prop at the ruck, the line behind them, the fullback deepest), a bench
// strip of four above it, and the squad list beside them. Tap a slot or a seat,
// then tap a player to put him there (whoever was there takes his place); tap
// two slots to swap them. Each tile shows the man's rating as he plays that
// slot: a man out of position plays below his rating (systems/lineup.ts,
// tuning reference §21), in amber. Auto pick rebuilds today's best side; PLAN
// opens the attack, defence and bench presets in a bottom sheet over it, the
// half-time sheet's look (3r, #342); PLAYS opens the set plays taken into the
// match in a sheet of its own (#326). Saved at once, so a side picked and then
// the app closed is not lost. DOM UI kit only; the rules are pure and tested
// in systems/lineup.ts. No Phaser.
import { el, button, hintScroll, openScreen, openModal, closeModal, screenHead, segmented } from '../dom';
import { getState, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { overallRating, playerStars } from '../../data/player';
import { BENCH, ROTATIONS, type Rotation } from '../../match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset } from '../../match/league/presets';
import { renderPlanFit, PLAN_FIT_CSS } from '../planFit';
import { TACTIC_BLURB, styleLine } from '../tacticsBlurbs';
import { nextFixture } from '../../systems/league';
import { PLAYER_ID } from '../../systems/fixtures';
import { playerRivalContext, rivalStyle } from '../../systems/rivalRound';
import { kickerAndCaptain } from '../../match/league/sheets';
import {
  LINEUP_SLOTS, POSITION_SHORT, autoPickKeepingPlan, commitLineup, setRotation, describeFills, effectiveRating, lineupAverage, lineupChanges, occupant, placeAt, positionFit,
  resolveLineup, sameSpot, setTactics, spotOf, statsAt, swapSpots, validTactics, type Spot,
} from '../../systems/lineup';
import { squadMore, squadTabs, squadViewSeg } from './squad';
import { ensureScreenStyles } from './recruit';
import { PLAYS_BY_ID } from '../../data/plays';
import { PLAYS } from '../../match/league/plays';
import { ownedPlays, takePlay, validPlays } from '../../systems/playbook';
import { playFitLine, playFitShort, playWhenLine, playsButtonLabel, todaysNine } from '../playbookText';
import { openPlaybookScreen } from './playbook';
import { fitnessPct, openPlayerPage } from './player';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { portraitDataUrl } from '../../art/portrait';
import { ensurePartsStyles, fitnessTone, playerCard, starsEl, statusPill } from '../parts';

const STYLE_ID = 'nrl-lineup-styles';


const ROTATION_LABEL: Readonly<Record<Rotation, string>> = { off: 'Off', standard: 'Standard', heavy: 'Heavy' };
const ROTATION_TIP: Readonly<Record<Rotation, string>> = {
  off: 'Off: the nine play the whole match (only a hurt man comes off, or Fresh legs when you call it)',
  standard: 'Standard: tired men come off under 55% legs, two at a stoppage',
  heavy: 'Heavy: men come off under 70% legs, three at a stoppage',
};

function ensureLineupStyles(): void {
  ensureScreenStyles();
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LINEUP_CSS;
  document.head.appendChild(style);
}

const LINEUP_CSS = `
/* SuperCOOKED 30: the pitch (four lanes of cards) and, beside it, the bench and the reserves, or
   while a man is being swapped (32), who can go there. */
.nrl-lineup-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 13.5rem; gap: 12px; }
.nrl-lineup-field {
  position: relative; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 4px; padding: 6px 8px;
  border-radius: 12px; box-shadow: inset 0 0 0 1px #23573a;
  background: repeating-linear-gradient(180deg, #164029 0, #164029 28px, #1a4830 28px, #1a4830 56px);
}
.nrl-pitch-halfway { position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: rgba(255, 255, 255, 0.18); pointer-events: none; }
.nrl-pitch-lane { position: relative; flex: 1 0 48px; display: flex; align-items: center; gap: 8px; }
.nrl-pitch-lane-label { flex: 0 0 4.5rem; font-family: var(--nrl-f-label); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.7); }
.nrl-pitch-cards { flex: 1 1 auto; min-width: 0; display: flex; justify-content: center; gap: 8px; }
.nrl-pitch-cards > .nrl-pcard { flex: 0 1 7.5rem; min-width: 0; width: auto; box-shadow: inset 0 0 0 1px var(--nrl-line-2), 0 4px 12px rgba(0, 0, 0, 0.35); }
.nrl-btn.nrl-pitch-empty { flex: 0 1 7.5rem; min-width: 0; min-height: 52px; border-radius: 10px; background: rgba(11, 18, 32, 0.6); box-shadow: inset 0 0 0 1px dashed; border: 1px dashed var(--nrl-outline); font-size: 0.8125rem; }
/* A swap under way (32): the picked card wears the accent ring, the rest dim. */
.nrl-pcard[data-selected], .nrl-btn.nrl-pitch-empty[data-selected] { box-shadow: 0 0 0 2px var(--nrl-accent), 0 4px 12px rgba(0, 0, 0, 0.35); }
.nrl-pcard[data-dim] { opacity: 0.5; }
.nrl-pcard[data-out], .nrl-pcard[data-banned] { opacity: 0.7; }
/* The side: Bench n / Reserves n, then the cards; or the swap's candidates. */
.nrl-lineup-side { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.nrl-lineup-side > .nrl-seg { align-self: stretch; }
.nrl-lineup-side > .nrl-seg > .nrl-btn { flex: 1 1 0; padding: 0 8px; font-size: 0.875rem; }
.nrl-side-cards { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 6px; padding: 2px; }
.nrl-side-cards > .nrl-pcard, .nrl-side-cards > .nrl-pitch-empty { flex: 0 0 auto; width: 100%; min-height: 48px; }
.nrl-swap-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 36px; }
.nrl-swap-title { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-btn.nrl-swap-x { width: 36px; min-width: 36px; min-height: 36px; height: 36px; padding: 0; border-radius: 8px; font-family: var(--nrl-f-body); position: relative; }
.nrl-btn.nrl-swap-x::after { content: ''; position: absolute; inset: -4px; }
.nrl-lineup-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 6px; }
.nrl-lineup-row {
  pointer-events: auto; cursor: pointer; flex: 0 0 auto; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 8px;
  min-height: 48px; padding: 4px 8px; border: 0; border-radius: 10px; background: var(--nrl-navy); box-shadow: inset 0 0 0 1px var(--nrl-line-2);
  color: var(--nrl-text); font: inherit; text-align: left;
}
@media (hover: hover) and (pointer: fine) { .nrl-lineup-row:hover { background: var(--nrl-raised-hover); } }
.nrl-lineup-row:active { background: var(--nrl-raised-hover); }
.nrl-lineup-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
.nrl-lineup-row[data-injured], .nrl-lineup-row[data-banned] { opacity: 0.55; cursor: default; }
.nrl-swap-face { width: 28px; height: 32px; border-radius: 6px; background: var(--nrl-raised); image-rendering: pixelated; }
.nrl-lineup-row-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nrl-lineup-row-name { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-swap-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.nrl-swap-meta .nrl-pill { min-height: 1.25rem; padding: 0 7px; font-family: var(--nrl-f-label); font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-lineup-where { font-family: var(--nrl-f-num); font-size: 0.5625rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); white-space: nowrap; }
.nrl-lineup-pick { flex: 0 0 auto; margin: 0; font-size: 0.6875rem; line-height: 1.35; color: var(--nrl-muted); }
/* The header (30): Squad / Recruit, the line, Pitch / List, Swap, Auto pick, ⋯. */
.nrl-sq .nrl-squad-view > .nrl-btn { padding: 0 12px; font-size: 0.8125rem; }
.nrl-btn.nrl-squad-more { width: 44px; min-width: 44px; padding: 0; font-size: 1.125rem; letter-spacing: 0; }
.nrl-btn[data-swap-start][aria-pressed="true"] { box-shadow: inset 0 0 0 1px var(--nrl-accent); color: var(--nrl-accent); }
/* The ⋯ tray: the plan, the plays, and the training focus's choices. */
.nrl-squad-more-tray { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; width: min(26rem, calc(100vw - 48px)); max-height: calc(100% - 64px); overflow-y: auto; overscroll-behavior: contain; }
.nrl-squad-more-tray > .nrl-btn { justify-content: flex-start; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nrl-squad-more-tray > :not(.nrl-btn) { grid-column: 1 / -1; }
.nrl-squad-more-label { padding: 4px 4px 0; font-family: var(--nrl-f-label); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-squad-focus { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.nrl-squad-focus > .nrl-btn { min-height: 40px; padding: 0 6px; border-radius: 8px; font-size: 0.8125rem; }
@media (pointer: coarse) { .nrl-squad-focus > .nrl-btn { min-height: 44px; } }
.nrl-lineup-plays-short { display: none; }
/* A narrow phone (667): the side panel gives the pitch a little, the lane labels shrink. */
@media (max-width: 760px) {
  .nrl-lineup-body { grid-template-columns: minmax(0, 1fr) 11rem; gap: 8px; }
  .nrl-pitch-lane-label { flex-basis: 3.4rem; font-size: 0.5625rem; letter-spacing: 0.08em; }
  .nrl-pitch-cards { gap: 5px; }
  .nrl-sq .nrl-squad-view > .nrl-btn { padding: 0 8px; }
}
/* Short sheets (667×375, 956×330): the lanes share less height; the cards keep 44px to tap. */
@media (max-height: 400px) {
  .nrl-lineup-field { padding: 4px 6px; gap: 2px; }
  .nrl-pitch-cards > .nrl-pcard, .nrl-btn.nrl-pitch-empty { min-height: 44px; }
  .nrl-pitch-cards > .nrl-pcard .nrl-pcard-body { padding: 3px 7px; }
  .nrl-side-cards > .nrl-pcard { min-height: 44px; }
}
/* The plan (#342): a bottom sheet over the dimmed Lineup, the half-time sheet's look (3r). */
.nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal {
  align-self: flex-end;
  width: 100%;
  max-width: 1180px;
  border-radius: 22px 22px 16px 16px;
  background: var(--nrl-navy);
  padding: 8px 24px 14px;
}
.nrl-lineup-plan { display: flex; flex-direction: column; gap: 4px; }
.nrl-lineup-plan-grab { align-self: center; width: 40px; height: 4px; border-radius: 2px; background: var(--nrl-line); }
.nrl-lineup-plan-head { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.nrl-lineup-plan-title { flex: 0 0 auto; font-family: var(--nrl-f-label); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-lineup-plan-sub { flex: 0 1 auto; min-width: 0; font-size: 0.8125rem; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-opp { margin-left: auto; flex: 0 1 auto; min-width: 0; font-size: 0.75rem; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-opp[hidden] { display: none; }
${PLAN_FIT_CSS}
.nrl-lineup-plan-rows { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: center; gap: 6px 12px; }
.nrl-lineup-plan-label { font-family: var(--nrl-f-label); font-size: 0.875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-lineup-plan .nrl-seg { display: flex; padding: 3px; }
.nrl-lineup-plan .nrl-seg > .nrl-btn { flex: 1 1 0; min-height: 38px; padding: 0 8px; font-size: 1.0625rem; letter-spacing: 0.02em; text-transform: none; }
@media (pointer: coarse) { .nrl-lineup-plan .nrl-seg > .nrl-btn { min-height: 44px; } }
.nrl-lineup-rot-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.nrl-lineup-rot-row .nrl-seg { flex: 0 0 300px; max-width: 60%; }
.nrl-lineup-rot-tip { flex: 1 1 auto; min-width: 0; font-size: 0.75rem; color: var(--nrl-muted); line-height: 1.3; }
.nrl-lineup-plan-foot { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.nrl-lineup-tac-hint { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 0.8125rem; line-height: 1.35; color: var(--nrl-text-2); }
.nrl-lineup-tac-hint b { color: var(--nrl-text); font-weight: 600; }
.nrl-lineup-plan-foot .nrl-btn-primary { flex: 0 0 auto; min-height: 48px; padding: 0 24px; font-size: 1.1875rem; }
@media (max-height: 440px) {
  .nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal { padding-top: 6px; padding-bottom: 8px; }
  .nrl-lineup-plan { gap: 2px; }
  .nrl-lineup-plan-rows { row-gap: 2px; }
  .nrl-lineup-plan-foot { margin-top: 0; }
  .nrl-lineup-rot-tip { display: none; }
  .nrl-lineup-rot-row .nrl-seg { max-width: 100%; }
  .nrl-lineup-plan-grab { display: none; }
  .nrl-lineup-plan-title { font-size: 1.375rem; }
  .nrl-lineup-plan .nrl-seg > .nrl-btn { min-height: 36px; font-size: 1rem; }
  .nrl-lineup-plan-foot .nrl-btn-primary { min-height: 44px; }
  .nrl-lineup-tac-hint { font-size: 0.75rem; }
}
@media (max-height: 340px) {
  .nrl-lineup-plan .nrl-seg { padding: 1px; }
}
/* The Plays sheet (#326): the plays owned as rows, a numbered tick for each taken, in the order taken. */
.nrl-lineup-plays-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 6px; max-height: min(52vh, 320px); max-height: min(52dvh, 320px); overflow-y: auto; overscroll-behavior: contain; }
.nrl-lineup-play { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 4px 10px; border: 0; border-radius: 10px; background: var(--nrl-button); color: var(--nrl-text); text-align: left; cursor: pointer; min-width: 0; font: inherit; }
.nrl-lineup-play[aria-pressed="true"] { background: var(--nrl-me); }
/* Pressed (#604): a button's pressed fill, so it shows under reduced motion too (dom.ts adds the scale). */
.nrl-lineup-play:not([aria-pressed="true"]):active { background: var(--nrl-raised-hover); }
.nrl-lineup-play[data-full] { opacity: 0.55; }
.nrl-lineup-play:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
.nrl-lineup-play-tick { flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--nrl-line); display: flex; align-items: center; justify-content: center; font-family: var(--nrl-f-num); font-size: 0.875rem; font-weight: 700; box-sizing: border-box; }
.nrl-lineup-play[aria-pressed="true"] .nrl-lineup-play-tick { background: var(--nrl-accent); border-color: var(--nrl-accent); color: var(--nrl-navy); }
.nrl-lineup-play-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.nrl-lineup-play-name { font-size: 0.875rem; font-weight: 600; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.nrl-lineup-play-fit { font-size: 0.6875rem; font-weight: 500; color: var(--nrl-pos); }
.nrl-lineup-play-fit.nrl-lineup-play-short { color: var(--nrl-accent); }
.nrl-lineup-play-when { font-size: 0.6875rem; color: var(--nrl-muted); overflow-wrap: anywhere; }
.nrl-lineup-plays-empty { margin: 4px 0; font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-lineup-plays-gap { flex: 1 1 auto; }
.nrl-lineup-plays .nrl-lineup-plan-foot .nrl-btn { min-height: 44px; }
@media (max-width: 760px) {
  .nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal { padding: 8px 14px 12px; }
  .nrl-lineup-plan .nrl-seg > .nrl-btn { font-size: 0.9375rem; padding: 0 4px; }
}
`;

/** Human label for a position (title-cased, hyphens kept). */
const positionLabel = (pos: string): string => pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

/** What AUTO PICK says it did (#614), by the spots it changed: a tap on a side already the best is not a dead one. */
export function autoPickNote(changes: number): string {
  return changes === 0 ? 'Already your best side.' : `Auto pick: ${changes} change${changes === 1 ? '' : 's'}.`;
}

let unsub: (() => void) | null = null;
/** The spot being swapped (SuperCOOKED 32): the right panel lists who can go there. */
let swapping: Spot | null = null;
/** "Swap" tapped: the next card tapped is the one to swap. */
let choosing = false;
/** The right panel's tab when nobody is being swapped (SuperCOOKED 33). */
let sideTab: 'bench' | 'reserves' = 'bench';

function onLineupClosed(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  swapping = null;
  choosing = false;
  closeModal(); // the plan or plays sheet, if it is open
}

/** The pitch's four lanes, top to bottom (SuperCOOKED 30), by the slot's position. */
const LANES: readonly { label: string; positions: readonly Position[] }[] = [
  { label: 'Forwards', positions: ['prop', 'hooker', 'second-row', 'lock'] },
  { label: 'Halves', positions: ['five-eighth', 'halfback'] },
  { label: 'Outside backs', positions: ['winger', 'centre'] },
  { label: 'Fullback', positions: ['fullback'] },
];

/** Hold this long on a card to start a swap with it (SuperCOOKED §5: long-press or Swap). */
const LONG_PRESS_MS = 450;

/** What a man is to a slot (SuperCOOKED 32): his slot, one he plays, or out of position. Pure. */
export function swapFit(fit: number): { tag: string; tone: 'pos' | 'muted' | 'neg' } {
  return fit >= 1 ? { tag: 'fits', tone: 'pos' } : fit >= 0.9 ? { tag: 'plays it', tone: 'muted' } : { tag: 'out of pos', tone: 'neg' };
}

/** Where a candidate comes from (SuperCOOKED 32): RESERVE, BENCH, or NOW <slot>. Pure. */
export function swapFrom(where: Spot | null): string {
  if (!where) return 'Reserve';
  return where.kind === 'bench' ? 'Bench' : `Now ${POSITION_SHORT[LINEUP_SLOTS[where.slot]!]}`;
}

/**
 * Open the squad's pitch view as a sheet above the dock (SuperCOOKED 30–33; it is the
 * Lineup screen of old, under the Squad tab). The nine in four lanes, the bench and the
 * reserves at the side. A tap on a card opens his page; a long press, or Swap then a card,
 * starts a swap: the side panel lists who can go there, best fit first, and a tap puts him
 * in (whoever was there takes his place). Re-renders on 'state:changed'; every change goes
 * through the pure rules in systems/lineup.ts and is saved at once.
 */
export function openLineupScreen(): void {
  ensureLineupStyles();
  ensurePartsStyles();
  swapping = null;
  choosing = false;

  const sub = el('div', { class: 'nrl-screen-sub' });
  const field = el('div', { class: 'nrl-lineup-field' });
  const side = el('div', { class: 'nrl-lineup-side' });

  // An injury or a ban keeps the man out of the side: red (#339). A hint is neutral.
  const toast = (text: string, kind: 'info' | 'danger' = 'info'): void => bus.emit('ui:notify', { text, kind });

  /** Start swapping `spot`, or swap it with the one being swapped. */
  const swapSpot = (spot: Spot): void => {
    choosing = false;
    if (swapping && sameSpot(swapping, spot)) swapping = null;
    else if (swapping) {
      const next = swapSpots(getState().lineup, swapping, spot);
      swapping = null;
      if (next !== getState().lineup) { commitLineup(next); return; }
    } else swapping = spot;
    render();
  };

  /** A tap on a candidate in the swap panel: into the spot being swapped. */
  const tapPlayer = (p: Player): void => {
    if (p.injuredWeeks > 0) {
      toast(`${p.name} is injured — out ${p.injuredWeeks}w.`, 'danger');
      return;
    }
    if ((p.suspendedWeeks ?? 0) > 0) {
      toast(`${p.name} is suspended — banned ${p.suspendedWeeks}w.`, 'danger');
      return;
    }
    const lineup = getState().lineup;
    if (!swapping) return;
    const next = placeAt(lineup, swapping, p.id);
    swapping = null;
    if (next !== lineup) commitLineup(next);
    else render();
  };

  // Who kicks and who captains today (N11): the coach's picks, or the defaults.
  let roles: { kicker?: string; captain?: string } = {};
  // The spot the swap list was last drawn for (#614).
  let swapFor: Spot | null = null;
  const kit = (): Kit => kitFromColors(getState().league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS, PLAYER_ID);

  /** A card for `p` in `spot` (or a reserve, spot null): tap opens his page, a long press swaps. */
  const card = (p: Player | null, spot: Spot | null, slotPos: Position | null): HTMLElement => {
    const label = spot?.kind === 'starter' ? POSITION_SHORT[slotPos!] : spot ? `B${spot.index + 1}` : '';
    if (!p) {
      // An empty slot or seat: a dashed card that starts the swap for it.
      const empty = button(`Pick ${label}`, () => spot && swapSpot(spot), { class: 'nrl-pitch-empty' });
      if (spot) empty.setAttribute('data-spot', spot.kind === 'starter' ? `s${spot.slot}` : `b${spot.index}`);
      empty.setAttribute('data-empty', '');
      empty.title = spot?.kind === 'starter' ? `${positionLabel(slotPos!)}: nobody picked` : 'Bench seat: nobody picked';
      if (swapping && spot && sameSpot(swapping, spot)) empty.setAttribute('data-selected', '');
      return empty;
    }
    const injured = p.injuredWeeks > 0;
    const banned = (p.suspendedWeeks ?? 0) > 0;
    const pct = fitnessPct(p);
    const word = injured ? `injured, out ${p.injuredWeeks} weeks` : banned ? `banned ${p.suspendedWeeks} weeks` : `fit ${pct}%`;
    const c = playerCard({
      portrait: portraitDataUrl(p.id, kit()),
      name: shortName(p.name),
      stars: playerStars(p),
      position: slotPos ? POSITION_SHORT[slotPos] : POSITION_SHORT[p.position],
      fitness: { tone: injured || banned ? 'alert' : fitnessTone(pct), word },
      captain: spot?.kind === 'starter' && roles.captain === p.id,
      kicker: spot?.kind === 'starter' && roles.kicker === p.id,
    });
    if (spot) c.setAttribute('data-spot', spot.kind === 'starter' ? `s${spot.slot}` : `b${spot.index}`);
    c.setAttribute('data-player-open', p.id);
    if (injured) c.setAttribute('data-out', '');
    else if (banned) c.setAttribute('data-banned', '');
    if (swapping && spot && sameSpot(swapping, spot)) c.setAttribute('data-selected', '');
    if (swapping && !(spot && sameSpot(swapping, spot))) c.setAttribute('data-dim', '');
    const fit = slotPos ? positionFit(p.position, slotPos) : 1;
    c.title = `${p.name} · ${positionLabel(p.position)}${slotPos && fit < 1 ? ` · at ${positionLabel(slotPos)} ×${fit}` : ''}${injured ? ` · injured, out ${p.injuredWeeks}w` : banned ? ` · suspended, banned ${p.suspendedWeeks}w` : ''}`;
    // A tap opens his page; while choosing or swapping, it picks the card for the swap.
    let pressed = 0;
    let held = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    c.addEventListener('pointerdown', () => {
      held = false;
      pressed = Date.now();
      if (spot) timer = setTimeout(() => { held = true; swapSpot(spot); }, LONG_PRESS_MS);
    });
    const cancel = (): void => { if (timer) { clearTimeout(timer); timer = null; } };
    c.addEventListener('pointerup', cancel);
    c.addEventListener('pointerleave', cancel);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('click', () => {
      cancel();
      if (held || (pressed && Date.now() - pressed >= LONG_PRESS_MS)) { held = false; return; }
      if (spot && (choosing || swapping)) { swapSpot(spot); return; }
      openPlayerPage(p, { kind: 'squad' });
    });
    return c;
  };

  const render = (): void => {
    const s = getState();
    // A man who has left the club is replaced in the saved lineup as soon as the screen sees it.
    const today = resolveLineup(s.lineup, s.squad);
    if (today.changed) {
      commitLineup(today.lineup);
      return; // state:changed renders again
    }
    const lineup = s.lineup;
    const nine = today.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
    roles = kickerAndCaptain(nine, lineup);
    const byId = new Map(s.squad.map((p) => [p.id, p] as const));
    const at = (id: string | null): Player | null => (id ? byId.get(id) ?? null : null);

    // The pitch: the nine in four lanes (SuperCOOKED 30), in LINEUP_SLOTS order within each.
    field.replaceChildren(
      el('span', { class: 'nrl-pitch-halfway', attrs: { 'aria-hidden': 'true' } }),
      ...LANES.map((lane) => el('div', { class: 'nrl-pitch-lane', attrs: { 'data-lane': lane.label } },
        el('span', { class: 'nrl-pitch-lane-label', text: lane.label }),
        el('div', { class: 'nrl-pitch-cards' },
          ...LINEUP_SLOTS.flatMap((pos, slot) => (lane.positions.includes(pos) ? [card(at(lineup.starters[slot] ?? null), { kind: 'starter', slot }, pos)] : []))))));
    field.toggleAttribute('data-swapping', swapping !== null);

    // The side: who is being swapped and who can go there, or the bench and the reserves.
    const picked = new Set([...lineup.starters, ...lineup.bench].filter((id): id is string => id !== null));
    const reserves = s.squad.filter((p) => !picked.has(p.id))
      .sort((a, b) => overallRating(b) - overallRating(a) || a.name.localeCompare(b.name));
    if (swapping) {
      const target = swapping;
      const slotPos = target.kind === 'starter' ? LINEUP_SLOTS[target.slot]! : null;
      const what = slotPos ? positionLabel(slotPos) : `bench seat ${(target as { index: number }).index + 1}`;
      const occupantId = occupant(lineup, target);
      const rows = s.squad.filter((p) => p.id !== occupantId).sort((a, b) => {
        const fa = slotPos ? positionFit(a.position, slotPos) : 1;
        const fb = slotPos ? positionFit(b.position, slotPos) : 1;
        const ea = slotPos ? effectiveRating(a, slotPos) : overallRating(a);
        const eb = slotPos ? effectiveRating(b, slotPos) : overallRating(b);
        return fb - fa || eb - ea || overallRating(b) - overallRating(a) || a.name.localeCompare(b.name);
      });
      const close = button('✕', () => { swapping = null; render(); }, { class: 'nrl-swap-x' });
      close.setAttribute('aria-label', 'Cancel the swap');
      close.setAttribute('data-swap-cancel', '');
      const list = el('div', { class: 'nrl-lineup-list nrl-swap-list' }, ...rows.map((p) => {
        const where = spotOf(lineup, p.id);
        const injured = p.injuredWeeks > 0;
        const banned = (p.suspendedWeeks ?? 0) > 0;
        const fit = slotPos ? swapFit(positionFit(p.position, slotPos)) : null;
        const row = el('button', { class: 'nrl-lineup-row nrl-swap-row', attrs: { type: 'button', 'data-player': p.id }, onClick: () => tapPlayer(p) },
          el('img', { class: 'nrl-swap-face', attrs: { src: portraitDataUrl(p.id, kit()), alt: '', width: '28', height: '32' } }),
          el('span', { class: 'nrl-lineup-row-id' },
            el('span', { class: 'nrl-lineup-row-name', text: shortName(p.name) }),
            starsEl(playerStars(p), { size: 11 })),
          el('span', { class: 'nrl-swap-meta' },
            injured ? statusPill(`Out ${p.injuredWeeks}w`, 'alert') : banned ? statusPill(`Ban ${p.suspendedWeeks}w`, 'alert')
              : fit ? statusPill(fit.tag === 'fits' ? `${POSITION_SHORT[slotPos!]} ✓` : fit.tag === 'plays it' ? `Plays ${POSITION_SHORT[slotPos!]}` : 'Out of pos', fit.tone)
                : statusPill(POSITION_SHORT[p.position], 'muted'),
            el('span', { class: 'nrl-lineup-where', text: swapFrom(where) })));
        if (injured) row.setAttribute('data-injured', '');
        else if (banned) row.setAttribute('data-banned', '');
        row.title = slotPos ? `Rating at ${positionLabel(slotPos)}: ${effectiveRating(p, slotPos)} (overall ${Math.round(overallRating(p))})` : `Overall ${Math.round(overallRating(p))}`;
        return row;
      }));
      hintScroll(list);
      // The same spot drawn again (a kicker, an injury) leaves the list where it was; another spot
      // starts it at the top, where the best man for it is (#614).
      const prev = side.querySelector<HTMLElement>('.nrl-swap-list');
      const keep = prev && swapFor && sameSpot(swapFor, target) ? prev.scrollTop : 0;
      swapFor = target;
      const away = occupantId ? byId.get(occupantId) : undefined;
      side.replaceChildren(
        el('div', { class: 'nrl-swap-head' }, el('span', { class: 'nrl-swap-title', text: `Swap ${what}` }), close),
        list,
        el('p', { class: 'nrl-lineup-pick', text: away ? `Tap a man to swap him in. ${shortName(away.name)} goes where he came from.` : 'Tap a man to put him there.' }));
      if (keep) list.scrollTop = keep;
    } else {
      swapFor = null;
      const tabs = segmented<'bench' | 'reserves'>([
        { id: 'bench', label: `Bench ${lineup.bench.filter((id) => id !== null).length}` },
        { id: 'reserves', label: `Reserves ${reserves.length}` },
      ], sideTab, (id) => { sideTab = id; render(); }, { class: 'nrl-side-tabs', label: 'Bench and reserves' });
      for (const [id, b] of tabs.buttons) b.setAttribute('data-side-tab', id);
      const cards = sideTab === 'bench'
        ? Array.from({ length: BENCH.size }, (_, i) => card(at(lineup.bench[i] ?? null), { kind: 'bench', index: i }, null))
        : reserves.map((p) => card(p, null, null));
      const list = el('div', { class: 'nrl-lineup-bench nrl-side-cards' }, ...cards);
      hintScroll(list);
      side.replaceChildren(tabs.el, list);
    }

    const fitCount = s.squad.filter((p) => p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0).length;
    const pickedN = lineup.starters.filter((id) => id !== null).length;
    const notes = today.fills.length ? ` · on the day: ${describeFills(today.fills).replace(/^Lineup: /, '')}` : '';
    const avg = lineupAverage(lineup, s.squad);
    if (swapping) {
      const slotPos = swapping.kind === 'starter' ? LINEUP_SLOTS[swapping.slot]! : null;
      sub.textContent = slotPos ? `Pick who plays ${positionLabel(slotPos).toLowerCase()}` : `Pick who sits on bench seat ${(swapping as { index: number }).index + 1}`;
      sub.title = sub.textContent;
    } else if (choosing) {
      sub.textContent = 'Tap the card to swap';
      sub.title = sub.textContent;
    } else {
      sub.textContent = `${pickedN}/${LINEUP_SLOTS.length} picked · rated ${avg} · ${fitCount}/${s.squad.length} fit${notes}`;
      sub.title = `${pickedN}/${LINEUP_SLOTS.length} picked · nine rated ${avg} as they play · ${fitCount} fit of ${s.squad.length}${notes}`;
    }
    swapBtn.setAttribute('aria-pressed', String(choosing || swapping !== null));
  };

  const autoBtn = button('Auto pick', () => {
    swapping = null;
    choosing = false;
    const cur = getState().lineup;
    const best = autoPickKeepingPlan(getState().squad, cur);
    commitLineup(best);
    toast(autoPickNote(lineupChanges(cur, best)));
  }, { class: 'nrl-btn-outline' });
  autoBtn.title = 'Today’s best nine by slot and the next four';
  autoBtn.setAttribute('data-auto-pick', '');
  // A swap without a long press: Swap, then the card (SuperCOOKED §5).
  const swapBtn = button('Swap', () => {
    if (choosing || swapping) { choosing = false; swapping = null; } else choosing = true;
    render();
  }, { class: 'nrl-btn-outline' });
  swapBtn.setAttribute('data-swap-start', '');
  swapBtn.title = 'Tap Swap, then the card to swap (or hold a card)';

  const head = screenHead('', { lead: [squadTabs('lineup')], sub, controls: [squadViewSeg('pitch'), swapBtn, autoBtn, squadMore()] });
  const body = el('div', { class: 'nrl-lineup-body' }, field, side);
  const screen = el('div', { class: 'nrl-screen nrl-sq nrl-lineup' }, head, body);
  openScreen(screen, onLineupClosed, 'lineup');
  render();
  unsub = bus.on('state:changed', render);
}

/** "J. Mere": the first initial and the surname, for a card (SuperCOOKED 30). */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]![0]}. ${parts[parts.length - 1]}` : name;
}

/**
 * The game plan sheet (N11, #342): attack, defence and the bench rotation, over whatever is
 * open. Its state follows the save while it is open. Opened from the Squad's ⋯ menu.
 */
export function openPlanSheet(): void {
  ensureLineupStyles();
  const rotation = segmented<Rotation>(ROTATIONS.map((r) => ({ id: r, label: ROTATION_LABEL[r], title: ROTATION_TIP[r] })), null,
    (r) => commitLineup(setRotation(getState().lineup, r)), { class: 'nrl-lineup-rot', label: 'Bench' });
  for (const [r, b] of rotation.buttons) b.setAttribute('data-rotation', r);
  const rotTip = el('span', { class: 'nrl-lineup-rot-tip' });
  const attack = segmented<AttackPreset>(ATTACK_PRESETS.map((p) => ({ id: p, label: PRESET_LABEL[p], title: TACTIC_BLURB[p] })), null,
    (p) => commitLineup(setTactics(getState().lineup, { attack: p })), { class: 'nrl-lineup-tac', label: 'Attack' });
  const defence = segmented<DefencePreset>(DEFENCE_PRESETS.map((p) => ({ id: p, label: PRESET_LABEL[p], title: TACTIC_BLURB[p] })), null,
    (p) => commitLineup(setTactics(getState().lineup, { defence: p })), { class: 'nrl-lineup-tac', label: 'Defence' });
  for (const seg of [attack, defence]) for (const [p, b] of seg.buttons as Map<string, HTMLButtonElement>) b.setAttribute('data-tactic', p);
  // Each side's pick explained in the foot (#351 L2), and what the next opponent plays in the head.
  const hint = el('p', { class: 'nrl-lineup-tac-hint' });
  const planSub = el('span', { class: 'nrl-lineup-plan-sub' });
  const oppLine = el('span', { class: 'nrl-lineup-opp', attrs: { 'data-plan-opponent': '' } });
  const done = button('Done', () => closeModal(), { class: 'nrl-btn-primary' });
  done.setAttribute('data-plan-done', '');
  const plan = el('div', { class: 'nrl-lineup nrl-lineup-plan' },
    el('span', { class: 'nrl-lineup-plan-grab', attrs: { 'aria-hidden': 'true' } }),
    el('div', { class: 'nrl-lineup-plan-head' }, el('span', { class: 'nrl-lineup-plan-title', text: 'Game plan' }), planSub, oppLine),
    el('div', { class: 'nrl-lineup-plan-rows' },
      el('span', { class: 'nrl-lineup-plan-label', text: 'Attack' }), attack.el,
      el('span', { class: 'nrl-lineup-plan-label', text: 'Defence' }), defence.el,
      el('span', { class: 'nrl-lineup-plan-label', text: 'Bench' }), el('div', { class: 'nrl-lineup-rot-row' }, rotation.el, rotTip)),
    el('div', { class: 'nrl-lineup-plan-foot' }, hint, done),
  );
  const render = (): void => {
    const s = getState();
    const today = resolveLineup(s.lineup, s.squad);
    const lineup = s.lineup;
    const nine = today.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
    const tactics = validTactics(lineup.tactics);
    for (const seg of [attack, defence]) for (const [p, b] of seg.buttons) renderPlanFit(b, nine, p);
    attack.set(tactics.attack);
    defence.set(tactics.defence);
    rotation.set(lineup.rotation);
    rotTip.textContent = ROTATION_TIP[lineup.rotation];
    hint.replaceChildren(
      el('b', { text: `${PRESET_LABEL[tactics.attack]}: ` }), TACTIC_BLURB[tactics.attack], el('br'),
      el('b', { text: `${PRESET_LABEL[tactics.defence]}: ` }), TACTIC_BLURB[tactics.defence],
    );
    const league = leagueSeasonView(s);
    const next = league ? nextSeasonFixture(s) : nextFixture(s.league.fixtures, s.week, PLAYER_ID);
    const opp = next ? s.league.clubs.find((c) => c.id === (next.homeId === PLAYER_ID ? next.awayId : next.homeId)) : undefined;
    planSub.textContent = next && opp ? `${league?.next ? `${league.next.dateLabel} · ${league.next.stageLabel}` : roundLabel(next.round)} · v ${opp.name} · ${league?.next?.fixture.neutral ? 'neutral' : next.homeId === PLAYER_ID ? 'home' : 'away'}` : league?.choiceRequired ? 'Choose a league before the next match' : 'Before kick-off';
    oppLine.hidden = !opp;
    if (opp) {
      oppLine.textContent = `${opp.name} play ${styleLine(rivalStyle(opp, playerRivalContext(s)))}`;
      oppLine.title = oppLine.textContent;
    }
  };
  render();
  const off = bus.on('state:changed', () => { if (plan.isConnected) render(); else off(); });
  openModal(plan, { class: 'nrl-lineup-plan-modal', region: true, onRemove: () => off() });
}

/** The Plays sheet (#326): the plays owned, tap to take or leave out; a way to the Playbook. */
export function openPlaysSheet(): void {
  ensureLineupStyles();
  const playsSub = el('span', { class: 'nrl-lineup-plan-sub' });
  const playsList = el('div', { class: 'nrl-lineup-plays-list', attrs: { 'data-plays-list': '' } });
  const playsDone = button('Done', () => closeModal(), { class: 'nrl-btn-primary' });
  playsDone.setAttribute('data-plays-done', '');
  const toBook = button('Playbook ▸', () => { closeModal(); openPlaybookScreen(); });
  toBook.setAttribute('data-plays-playbook', '');
  const sheet = el('div', { class: 'nrl-lineup nrl-lineup-plan nrl-lineup-plays', attrs: { 'data-plays-sheet': '' } },
    el('span', { class: 'nrl-lineup-plan-grab', attrs: { 'aria-hidden': 'true' } }),
    el('div', { class: 'nrl-lineup-plan-head' }, el('span', { class: 'nrl-lineup-plan-title', text: 'Set plays' }), playsSub),
    playsList,
    el('div', { class: 'nrl-lineup-plan-foot' }, toBook, el('span', { class: 'nrl-lineup-plays-gap' }), playsDone),
  );
  const render = (): void => {
    const s = getState();
    const owned = ownedPlays(s);
    const taken = validPlays(s.lineup.plays, owned);
    playsSub.textContent = owned.length === 0 ? 'None bought yet' : `${taken.length} of ${PLAYS.takeMax} · your half calls them in this order`;
    if (owned.length === 0) {
      playsList.replaceChildren(el('p', { class: 'nrl-lineup-plays-empty', text: 'Buy plays on the Playbook: hire an attack coach and he opens a family of them.' }));
      return;
    }
    const nine = todaysNine(s);
    playsList.replaceChildren(...owned.flatMap((id) => {
      const play = PLAYS_BY_ID[id];
      if (!play) return [];
      const at = taken.indexOf(id);
      const full = at < 0 && taken.length >= PLAYS.takeMax;
      const short = playFitShort(play, nine);
      const row = el('button', {
        class: 'nrl-lineup-play',
        attrs: { type: 'button', 'data-play': id, 'aria-pressed': String(at >= 0), title: full ? 'Three is the most' : playFitLine(play, nine) },
        onClick: () => takePlay(id),
      },
      el('span', { class: 'nrl-lineup-play-tick', attrs: { 'aria-hidden': 'true' }, text: at >= 0 ? String(at + 1) : '' }),
      el('span', { class: 'nrl-lineup-play-text' },
        el('span', { class: 'nrl-lineup-play-name' }, play.name, el('span', { class: `nrl-lineup-play-fit${short.ok ? '' : ' nrl-lineup-play-short'}`, text: short.text })),
        el('span', { class: 'nrl-lineup-play-when', text: full ? 'Three is the most: leave one out first' : playWhenLine(play) })));
      if (full) row.setAttribute('data-full', '');
      return [row];
    }));
  };
  render();
  const off = bus.on('state:changed', () => { if (sheet.isConnected) render(); else off(); });
  openModal(sheet, { class: 'nrl-lineup-plan-modal nrl-lineup-plays-modal', region: true, onRemove: () => off() });
}

/** The Plan item's words: "Plan: Attack · Defence". */
export function planLabel(): string {
  const t = validTactics(getState().lineup.tactics);
  return `Plan: ${PRESET_LABEL[t.attack]} · ${PRESET_LABEL[t.defence]}`;
}

/** The Plays item's words, full and short ("Plays: A · B · —", "Plays 2/3"). */
export function playsLabels(): { full: string; short: string } {
  const s = getState();
  const taken = validPlays(s.lineup.plays, ownedPlays(s));
  return { full: playsButtonLabel(taken), short: `Plays ${taken.length}/${PLAYS.takeMax}` };
}
