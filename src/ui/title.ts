// Title screen (SuperCOOKED 11): the wordmark on the left, the three save slots on the
// right, each slot's exports, New club and Delete behind its ⋯. Setting up a new club
// (SuperCOOKED 12–14) is three steps with a step bar and ◂ Back on each: 1 Town (one
// search over the offline town list), 2 Club (names and colours with a live jersey),
// 3 Start (the club in one card, difficulty, the veteran switch, Start). A new club
// is always a League career (#819). There is no Classic / League choice.
// The loading screen (SuperCOOKED 10) is showLeagueLoading.
//
// Built from document.createElement and one <style> element, no dom.ts helpers:
// it runs before the game's UI is up, and its tests drive it through a tiny stub
// DOM (createElement, appendChild, setAttribute, click listeners, querySelector
// on data attributes). Every hook the tests and e2e scripts use is a data-nrl-*
// attribute. The three steps are all built at once and only shown one at a time
// (data-nrl-setup-step on the panel), so every field keeps its value going back
// and forth, and Start reads them all.

import { CLASSIC_RETIRED_TEXT } from '../core/classicSave';
import {
  capturePlayerSlot, classicSlots, deleteSlot, downloadOriginalSave, exportRecoverySaves, getSlotSummaries, installImportedSave, listSlotMeta, pickSaveFile, setActiveSlot, type SlotSummary,
} from '../core/save';
import { cleanName, GROUND_MAX, NAME_MAX } from '../data/names';
import type { LeagueCareerDestination } from '../systems/leagueCareerSetup';
import type { GameState } from '../core/state';
import { colorsForTown, defaultClubName, foldTown, groundForTown, townColorsAllowed, townHash, type Town } from '../data/townSetup';
import { buildLabel } from './buildInfo';
import {
  DEFAULT_DIFFICULTY, DEFAULT_PLAYER_COLORS, DIFFICULTIES, PLAYER_PRIMARY_COLORS,
  PLAYER_SECONDARY_COLORS, isValidColorPair, type Difficulty,
} from '../config';
import { kitFromColors } from '../art/match/kit';
import { LOOKS, drawPlayerFrame } from '../art/match/players';
import { encodeCanvas } from '../art/portrait';
import { PLAYER_ID } from '../systems/fixtures';
import { BRAND, type Brand } from '../brand';
import { COLOR_TOKENS as C } from './tokens';
import { fillParentLine, fillWordmark } from './wordmark';
import { commercialEnabled } from '../commercial/flags';
import { openLoginDialog, openPaywall } from './screens/paywall';
import { HOVER_FILL, listenForPress, MOTION_CSS } from './dom';
import { HINTS } from './tutorial';
import { bus } from '../core/events';
import { ladderStanding } from '../systems/board';
import { ordinal } from './hud';

export type TitleChoice = {
  clubName?: string;
  coachName?: string;
  openAll?: boolean;
  difficulty?: Difficulty;
  colors?: [string, string];
  seed?: number;
  home?: GameState['home'];
  groundName?: string;
} & (
  | { mode: 'continue' }
  | { mode: 'new'; careerMode: 'league'; destination: LeagueCareerDestination }
);

const DEFAULT_CLUB_NAME = 'Cavehole Crushers';

const COLOR_NAMES: Record<string, string> = {
  '#f4d03f': 'Gold', '#c0392b': 'Crimson', '#2e6fd8': 'Royal blue', '#e67e22': 'Orange',
  '#8e44ad': 'Purple', '#16a0b8': 'Teal', '#ecf0f1': 'White', '#ffffff': 'White', '#1a1a2e': 'Navy-black',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'More money, cheaper wages, rivals a step slower.',
  normal: "The game as it's meant to be played.",
  hard: 'Less money, dearer wages, sharper rivals.',
};

/** The three steps of a new club (SuperCOOKED 12–14), in order. */
const STEPS = ['Town', 'Club', 'Start'] as const;
type Step = 1 | 2 | 3;

// The pill tint (SuperCOOKED §2): the colour at 12% under the word, 45% round it.
const POS_TINT = 'rgba(20, 195, 142, 0.12)';
const POS_RING = 'rgba(20, 195, 142, 0.45)';
// The outline button (SuperCOOKED §4): 1px white at 30%.
const OUTLINE = 'rgba(255, 255, 255, 0.3)';

// The overlay scrolls when its content is taller than the screen; the auto
// margins on .nrl-title-main centre it only while it fits (justify-content:center
// would push the top of tall content out of reach). Safe-area insets pad every
// side (#347): with the phone turned either way the notch takes one of them. The
// insets come through the frame's --nrl-safe-* (dom.ts) where they are set, env()
// before the frame's stylesheet is in.
export const TITLE_CSS = `
${MOTION_CSS}
.nrl-title { position: absolute; inset: 0; pointer-events: auto; overflow-y: auto; overscroll-behavior: contain;
  display: flex; flex-direction: column; align-items: center; box-sizing: border-box;
  padding: calc(12px + var(--nrl-safe-t, env(safe-area-inset-top, 0px))) calc(12px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)))
    calc(24px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))) calc(12px + var(--nrl-safe-l, env(safe-area-inset-left, 0px)));
  background: ${C.ink}; color: ${C.text};
  font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem;
  /* dom.ts's hover fills, under the names its sheet gives them (the title is up before that sheet). */
  --nrl-raised-hover: ${HOVER_FILL.raised}; --nrl-accent-hover: ${HOVER_FILL.accent}; }
.nrl-title * { box-sizing: border-box; }
/* Controls, as in the game's sheet (#604): no browser tap box, no long-press selection or callout, no double-tap zoom. */
.nrl-title, .nrl-title * { -webkit-tap-highlight-color: transparent; }
.nrl-title :is(button, label) { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }
.nrl-title-main { margin: auto 0; width: 100%; max-width: 880px; display: flex; flex-direction: column; gap: 14px; }
.nrl-title-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
/* The wordmark (SuperCOOKED §2): the title text in Archivo Black, its last word in the accent. */
.nrl-title h1 { margin: 0; text-align: center; font-family: 'Archivo Black', 'Arial Black', sans-serif;
  font-weight: 400; font-size: 4.75rem; letter-spacing: -0.04em; line-height: 0.88; text-transform: uppercase; }
.nrl-title h1 .nrl-wordmark-accent { color: ${C.accent}; }
.nrl-title-logo { display: block; margin: 0 auto; max-width: min(70vw, 360px); max-height: 72px; object-fit: contain; }
.nrl-title-parent { margin: 0; line-height: 1.2; text-align: center; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.625rem;
  letter-spacing: 0.2em; text-transform: uppercase; color: ${C.muted}; }
/* "A SUPERCOOKED GAME": SUPER in Archivo Black, COOKED in the accent. */
.nrl-title-parent :is(.nrl-parent-lead, .nrl-wordmark-accent) { font-family: 'Archivo Black', 'Arial Black', sans-serif; font-weight: 400;
  font-size: 0.875rem; letter-spacing: 0; color: ${C.text}; }
.nrl-title-parent .nrl-wordmark-accent { color: ${C.accent}; }
.nrl-title-parent .nrl-parent-a { margin-right: 0.6em; }
.nrl-title-parent .nrl-parent-z { margin-left: 0.6em; }

/* Loading (SuperCOOKED 10): the wordmark, the parent line, the bar, what it is doing, and a tip at the foot. */
.nrl-title-main-loading { align-items: center; gap: 14px; }
.nrl-title-main-loading h1 { font-size: min(4.75rem, 13vw); }
.nrl-title-main-loading .nrl-title-parent :is(.nrl-parent-lead, .nrl-wordmark-accent) { font-size: 0.8125rem; }
/* No percentage: the work says nothing of how far along it is, so the bar runs without one. */
.nrl-title-bar { position: relative; width: min(280px, 70vw); height: 4px; margin-top: 18px; border-radius: 2px; background: ${C.raised}; overflow: hidden; }
.nrl-title-bar-run { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0 40%, ${C.accent} 40% 56%, transparent 56% 100%);
  background-size: 250% 100%; background-position: 50% 0; }
@media (prefers-reduced-motion: no-preference) {
  .nrl-title-bar-run { animation: nrl-title-run calc(var(--nrl-dur-sheet) * 8) linear infinite; }
}
@keyframes nrl-title-run { from { background-position: 100% 0; } to { background-position: 0% 0; } }
.nrl-title-doing { margin: 0; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.6875rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: ${C.text2}; }
.nrl-title-tip { margin: 12px 0 0; max-width: 40rem; text-align: center; font-size: 0.8125rem; line-height: 1.4; color: ${C.muted}; }
.nrl-title-tip b { font-weight: 600; color: ${C.text}; }

/* The slots (SuperCOOKED 11): the wordmark left, the slot cards right. */
.nrl-title-main-slots { flex-direction: row; align-items: center; gap: 40px; max-width: 860px; }
.nrl-title-brand { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; container-type: inline-size; }
/* BIG over COACH, as wide as the column lets it be. */
.nrl-title-brand h1 { text-align: left; font-size: 4rem; font-size: min(5.75rem, 26cqi); }
.nrl-title-brand h1 .nrl-wordmark-lead { display: block; }
.nrl-title-brand h1::after { content: 'Club manager'; display: block; margin-top: 10px; font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.75rem; font-weight: 500; letter-spacing: 0.34em; line-height: 1.2; color: ${C.text2}; }
.nrl-title-brand .nrl-title-parent { margin-top: 4px; text-align: left; }
.nrl-title-side { flex: 0 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.nrl-title-slots { display: flex; flex-direction: column; gap: 8px; }
/* A slot: its words in the first column, its Continue (or New club) and ⋯ beside them, the ⋯'s row under. */
.nrl-title-card { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-rows: repeat(4, auto);
  column-gap: 10px; row-gap: 2px; align-items: center; min-width: 0;
  padding: 10px 10px 10px 14px; border-radius: 12px; background: ${C.navy}; border: 1px solid ${C.line}; }
.nrl-title-card[data-last] { border-color: rgba(255, 107, 26, 0.55); }
.nrl-title-card[data-empty] { border-style: dashed; }
.nrl-title-card > * { grid-column: 1; min-width: 0; }
.nrl-title-card > :is(.nrl-title-btn-go, .nrl-title-btn-row) { grid-column: 2; grid-row: 1 / span 4; }
.nrl-title-card > .nrl-title-more { grid-column: 3; grid-row: 1 / span 4; }
.nrl-title-card > .nrl-title-menu { grid-column: 1 / -1; grid-row: 5; }
.nrl-title-slotno { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.625rem; letter-spacing: 0.16em; line-height: 1.3;
  text-transform: uppercase; color: ${C.muted}; }
.nrl-title-club { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-weight: 700; font-size: 1.125rem; letter-spacing: 0.03em; line-height: 1.15;
  text-transform: uppercase; overflow-wrap: anywhere; }
.nrl-title-card[data-empty] .nrl-title-club { color: ${C.muted}; }
.nrl-title-when { font-size: 0.75rem; color: ${C.text2}; }
.nrl-title-warn { font-size: 0.75rem; color: ${C.neg}; }
/* The ⋯'s row: the exports, New club over a season, and Delete. */
.nrl-title-menu { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 8px; }
.nrl-title-card:not([data-open="true"]) > .nrl-title-menu { display: none; }
.nrl-title-menu > .nrl-title-btn { flex: 1 1 auto; }
.nrl-title-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-top: 4px; }

/* Buttons (SuperCOOKED §4). */
.nrl-title-btn { min-height: 44px; padding: 0 14px; font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: #fff; cursor: pointer;
  background: ${C.button}; border: 0; border-radius: 10px; white-space: nowrap;
  transition: background-color var(--nrl-dur-press) ease; }
/* Hover for a mouse only; a press takes the same fill and shrinks a little (#604), and snaps back. */
@media (hover: hover) and (pointer: fine) { .nrl-title-btn:hover { background: var(--nrl-raised-hover); } }
.nrl-title-btn:active:not(:disabled) { background: var(--nrl-raised-hover); transform: scale(var(--nrl-press));
  transition: background-color var(--nrl-dur-press) ease, transform var(--nrl-dur-press) var(--nrl-ease-out); }
.nrl-title-btn:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
.nrl-title-btn-go, .nrl-title-btn-go:hover { background: ${C.accent}; color: ${C.onAccent}; }
.nrl-title-btn-go:active:not(:disabled) { background: var(--nrl-accent-hover); }
.nrl-title-card > .nrl-title-btn-go { min-height: 48px; padding: 0 18px; }
/* A slot's own Continue or New club when another slot holds the screen's one orange (#613): an outline. */
.nrl-title-btn-row, .nrl-title-btn-row:hover { background: transparent; box-shadow: inset 0 0 0 1px ${OUTLINE}; font-size: 0.875rem; padding: 0 16px; }
/* Disabled stays visible and its label says why (#613). */
.nrl-title-btn:disabled, .nrl-title-btn:disabled:hover { background: #1a2540; color: #8f98ab; cursor: default;
  white-space: normal; line-height: 1; }
.nrl-title-btn-small { font-size: 0.875rem; padding: 0 10px; }
.nrl-title-more { width: 44px; padding: 0; font-size: 1rem; letter-spacing: 0; color: ${C.text2}; background: ${C.raised}; }
.nrl-title-more[aria-expanded="true"], .nrl-title-more[aria-expanded="true"]:hover, .nrl-title-more[aria-expanded="true"]:active:not(:disabled) {
  background: ${C.text}; color: ${C.onAccent}; }
/* A quiet word for a button: Import save, Edit. */
.nrl-title-btn-text, .nrl-title-btn-text:hover { background: transparent; color: ${C.text2}; font-size: 0.8125rem; padding: 0 6px; }
/* Destructive (SuperCOOKED §3): amber words on the navy button, never the orange. */
.nrl-title-btn[data-nrl-delete-1], .nrl-title-btn[data-nrl-delete-2], .nrl-title-btn[data-nrl-delete-3],
.nrl-title-btn[data-nrl-start-confirm] { color: ${C.neg}; }
.nrl-title-btn[data-armed], .nrl-title-btn[data-armed]:active:not(:disabled) { background: rgba(255, 138, 61, 0.16); color: ${C.neg};
  box-shadow: inset 0 0 0 1px rgba(255, 138, 61, 0.6); }
.nrl-title-build { position: fixed; right: calc(8px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)));
  bottom: calc(4px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); pointer-events: none; color: ${C.muted};
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.625rem; letter-spacing: 0.14em; text-transform: uppercase; }

/* A new club (SuperCOOKED 12–14): the head with ◂ Back and the step bar, the step, and the foot with Next or Start. */
.nrl-title-main-setup { flex: 1 1 auto; min-height: 0; max-height: 36rem; gap: 12px; }
.nrl-title-head { display: flex; align-items: center; gap: 12px; }
.nrl-title-head .nrl-title-btn { flex: 0 0 auto; font-size: 0.8125rem; padding: 0 12px; }
.nrl-title-head h2 { margin: 0; font-family: 'Archivo Black', 'Arial Black', sans-serif; font-size: 1.25rem; font-weight: 400; line-height: 1.1;
  letter-spacing: -0.02em; text-transform: uppercase; flex: 1; min-width: 0; }
.nrl-title-slottag { margin-left: 0.5em; white-space: nowrap; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.625rem; letter-spacing: 0.14em; color: ${C.muted}; }
.nrl-title-steps { display: flex; gap: 6px; flex: 0 0 auto; }
.nrl-title-stepchip { display: flex; align-items: center; min-height: 1.875rem; padding: 0 12px; border-radius: 999px; white-space: nowrap;
  font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: ${C.muted}; background: ${C.panel}; border: 1px solid ${C.line}; }
.nrl-title-stepchip[data-state="done"] { color: ${C.pos}; }
.nrl-title-stepchip[aria-current="step"] { background: ${C.text}; color: ${C.onAccent}; border-color: ${C.text}; }
.nrl-title-stepchip > span { white-space: pre; }
.nrl-title-setup { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.nrl-title-setup > .nrl-title-panel { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-title-setup[data-nrl-setup-step="1"] > :not([data-nrl-panel="1"]),
.nrl-title-setup[data-nrl-setup-step="2"] > :not([data-nrl-panel="2"]),
.nrl-title-setup[data-nrl-setup-step="3"] > :not([data-nrl-panel="3"]) { display: none; }
.nrl-title-setupfoot { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px 16px; }
.nrl-title-setupfoot .nrl-title-btn-go { min-height: 50px; padding: 0 24px; font-size: 1.0625rem; }
/* The build label sits in the foot, clear of the step (N7, #181), on two lines where it must. */
.nrl-title-setupfoot > .nrl-title-build { position: static; max-width: 12.5em; margin-right: auto; line-height: 1.3; }
.nrl-title-setup:not([data-nrl-setup-step="3"]) ~ .nrl-title-setupfoot > :is(.nrl-title-veteran, .nrl-title-go) { display: none; }
.nrl-title-setup[data-nrl-setup-step="3"] ~ .nrl-title-setupfoot > [data-nrl-next] { display: none; }
.nrl-title-veteran { flex: 1 1 10rem; min-width: 0; display: flex; align-items: center; gap: 10px; min-height: 44px;
  font-size: 0.8125rem; line-height: 1.3; color: ${C.text2}; cursor: pointer; }
.nrl-title-veteran input { width: 20px; height: 20px; flex: 0 0 auto; margin: 0; accent-color: ${C.accent}; }
.nrl-title-go { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px 8px; }
/* Start over? reads first, then Cancel, then Start over on the right (SuperCOOKED §4's confirm). */
.nrl-title-confirm { order: -2; flex: 1 1 100%; text-align: right; font-size: 0.8125rem; line-height: 1.3; color: ${C.neg}; }
.nrl-title-go > [data-nrl-start-cancel] { order: -1; }
.nrl-title-label { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.625rem; letter-spacing: 0.16em; text-transform: uppercase; color: ${C.muted}; }
.nrl-title-input { width: 100%; min-height: 44px; padding: 0 12px; font: inherit; font-size: 0.9375rem; min-width: 0; color: #fff;
  background: ${C.panel}; border: 1px solid ${C.line}; border-radius: 10px; }
.nrl-title-input:focus { outline: none; border-color: ${C.accent}; }
/* A name box and, while the name won't do, why (#616): the rename field's rule and words. */
.nrl-title-entry { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-title-input[aria-invalid="true"] { border-color: ${C.neg}; }
.nrl-title-why { font-size: 0.6875rem; line-height: 1.2; color: ${C.neg}; }
.nrl-title-why:empty { display: none; }

/* 1 Town: one big search, the offline towns as its results. */
.nrl-title-panel-town { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 6px; text-align: center; }
.nrl-title-ask { margin: 0; font-family: 'Archivo Black', 'Arial Black', sans-serif; font-weight: 400; font-size: 1.875rem; line-height: 1;
  letter-spacing: -0.02em; text-transform: uppercase; }
.nrl-title-sub { margin: 0; font-size: 0.875rem; color: ${C.text2}; }
.nrl-title-search { width: min(520px, 100%); flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; margin-top: 4px; text-align: left; }
.nrl-title-search > .nrl-title-input { flex: 0 0 auto; min-height: 50px; padding: 0 16px; font-size: 1.0625rem; border-radius: 12px 12px 0 0; }
.nrl-title-search:has(.nrl-title-results:empty) > .nrl-title-input { border-radius: 12px; }
.nrl-title-results { flex: 0 1 auto; min-height: 3rem; overflow-y: auto; overscroll-behavior: contain;
  background: ${C.navy}; border: 1px solid ${C.line}; border-top: 0; border-radius: 0 0 12px 12px; }
.nrl-title-results:empty { display: none; }
.nrl-title-result { width: 100%; min-height: 48px; display: flex; align-items: center; gap: 12px; padding: 0 14px; cursor: pointer;
  border: 0; border-bottom: 1px solid ${C.raised}; background: transparent; color: ${C.text}; text-align: left; font: inherit; font-size: 0.875rem; }
.nrl-title-result:last-child { border-bottom: 0; }
.nrl-title-result[aria-selected="true"] { background: ${C.raised}; }
.nrl-title-result-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.nrl-title-result-name b { font-weight: 600; }
.nrl-title-result-where { flex: 0 0 auto; font-size: 0.75rem; color: ${C.muted}; }
.nrl-title-result[aria-selected="true"] .nrl-title-result-where { color: ${C.text2}; }
.nrl-title-townfoot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; margin-top: 6px; font-size: 0.75rem; color: ${C.muted}; }
.nrl-title-townstatus { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.6875rem; color: ${C.text2}; }

/* 2 Club: the jersey, the names, the two colours. */
.nrl-title-panel-club { display: grid; grid-template-columns: clamp(7.5rem, 20vw, 12.5rem) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 20px; }
.nrl-title-kit { margin: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: 16px; background: ${C.navy}; border: 1px solid ${C.line}; text-align: center; }
.nrl-title-kit img { width: 112px; height: 120px; image-rendering: pixelated; }
.nrl-title-kit-name { max-width: 100%; font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1rem; font-weight: 700; line-height: 1.15;
  letter-spacing: 0.06em; text-transform: uppercase; overflow-wrap: anywhere; }
.nrl-title-kit-note { font-size: 0.6875rem; color: ${C.muted}; }
/* The names and colours scroll on short phones. A drag past the list's end stays in the list (#609):
   chained to the screen, it slid BACK and the heading off the top. */
.nrl-title-details { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-content: start; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 3px; }
.nrl-title-names, .nrl-title-colours { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.nrl-title-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nrl-title-swatches { --nrl-sw: 32px; display: flex; flex-wrap: wrap; gap: 10px; max-width: calc(var(--nrl-sw) * 4 + 30px); }
/* A finger's swatches (N14, #263) take six to a row where the column has room, so both colours fit a phone on its side. */
@media (pointer: coarse) { .nrl-title-swatches { --nrl-sw: 44px; gap: 8px; max-width: calc(var(--nrl-sw) * 6 + 40px); } }
.nrl-title-swatch { width: var(--nrl-sw); height: var(--nrl-sw); padding: 0; border: 2px solid transparent; border-radius: 50%; cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15); }
.nrl-title-swatch[aria-pressed="true"] { border-color: ${C.text}; box-shadow: 0 0 0 2px ${C.accent}; }
.nrl-title-swatch:disabled { opacity: 0.3; cursor: default; }
.nrl-title-swatch:active:not(:disabled) { transform: scale(var(--nrl-press)); transition: transform var(--nrl-dur-press) var(--nrl-ease-out); }
.nrl-title-swatch-why { font-size: 0.6875rem; line-height: 1.3; color: ${C.muted}; }

/* 3 Start: the club in one card, difficulty as three cards. */
.nrl-title-panel-start { display: flex; flex-direction: column; gap: 10px; }
.nrl-title-summary { display: flex; align-items: center; gap: 14px; padding: 8px 8px 8px 14px; border-radius: 14px; background: ${C.navy}; border: 1px solid ${C.line}; }
.nrl-title-summary img { width: 48px; height: 52px; flex: 0 0 auto; image-rendering: pixelated; }
.nrl-title-summary-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-title-summary-name { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; font-weight: 700; line-height: 1.15; letter-spacing: 0.03em;
  text-transform: uppercase; overflow-wrap: anywhere; }
.nrl-title-summary-line { font-size: 0.75rem; color: ${C.text2}; overflow-wrap: anywhere; }
.nrl-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.nrl-title-choices { display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-title-pick { background: ${C.raised}; }
.nrl-title-pick[aria-pressed="true"], .nrl-title-pick[aria-pressed="true"]:hover, .nrl-title-pick[aria-pressed="true"]:active:not(:disabled) { background: ${C.text}; color: ${C.onAccent}; }
.nrl-title-difs { display: flex; gap: 8px; }
.nrl-title-pick.nrl-title-dif { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 12px 14px;
  border-radius: 14px; background: ${C.panel}; box-shadow: inset 0 0 0 1px ${C.line}; text-align: left; white-space: normal;
  font-family: 'Inter', system-ui, sans-serif; font-weight: 400; letter-spacing: 0; text-transform: none; color: ${C.text}; }
.nrl-title-dif[aria-pressed="true"], .nrl-title-dif[aria-pressed="true"]:hover, .nrl-title-dif[aria-pressed="true"]:active:not(:disabled) {
  background: ${C.panel}; color: ${C.text}; box-shadow: inset 0 0 0 2px ${C.accent}; }
.nrl-title-dif-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; }
.nrl-title-dif-name { font-family: 'Archivo Black', 'Arial Black', sans-serif; font-size: 1.25rem; line-height: 1.1; letter-spacing: -0.01em; text-transform: uppercase; }
.nrl-title-dif .nrl-title-difficulty-copy { font-size: 0.75rem; line-height: 1.4; color: ${C.text2}; }
.nrl-title-tag { padding: 3px 7px; border-radius: 999px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.5625rem; line-height: 1.2;
  letter-spacing: 0.12em; text-transform: uppercase; color: ${C.pos}; background: ${POS_TINT}; border: 1px solid ${POS_RING}; }

@media (max-height: 500px) {
  .nrl-title-main { gap: 10px; }
  .nrl-title-main-setup { gap: 8px; }
  .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }
  .nrl-title-logo { max-height: 48px; }
  .nrl-title-ask { font-size: 1.5rem; }
  .nrl-title-sub { font-size: 0.8125rem; }
  .nrl-title-panel-town { gap: 6px; padding-top: 0; }
  .nrl-title-search > .nrl-title-input { min-height: 46px; }
  .nrl-title-kit img { width: 84px; height: 90px; }
  .nrl-title-details { gap: 16px; }
  .nrl-title-names, .nrl-title-colours { gap: 8px; }
  .nrl-title-panel-start { gap: 8px; }
  .nrl-title-summary { padding: 4px 6px 4px 12px; }
  .nrl-title-summary img { width: 37px; height: 40px; }
  .nrl-title-summary-name { font-size: 1.0625rem; }
  .nrl-title-pick.nrl-title-dif { gap: 4px; padding: 8px 12px; }
  .nrl-title-dif-name { font-size: 1.0625rem; }
  .nrl-title-setupfoot .nrl-title-btn-go { min-height: 46px; }
}
@media (max-height: 340px) {
  .nrl-title { padding-bottom: calc(18px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); }
  .nrl-title-main { gap: 6px; }
  .nrl-title-sub { display: none; }
  /* The jersey gives its column to the names and colours; it is on the Start step's card. */
  .nrl-title-panel-club { grid-template-columns: minmax(0, 1fr); }
  .nrl-title-kit { display: none; }
  .nrl-title-summary img { display: none; }
}
/* An iPhone SE on its side (568×320): the build label follows the page instead of sitting in the corner
   over the panel. A phone held upright gets the rotate card. */
@media (max-width: 600px) and (orientation: landscape) {
  .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }
}
@media (max-width: 760px) {
  .nrl-title-main-slots { gap: 24px; }
}
/* A narrow phone: the steps not on show are their number (or ✓), so the head keeps one line. */
@media (max-width: 600px) {
  .nrl-title-stepchip:not([aria-current="step"]) .nrl-title-stepname { display: none; }
}
@media (max-width: 520px) {
  .nrl-title-main-slots { flex-direction: column; align-items: stretch; gap: 16px; }
  .nrl-title-brand { flex: 0 0 auto; }
  .nrl-title-side { flex: 0 0 auto; }
  .nrl-title-head { flex-wrap: wrap; }
  .nrl-title-panel-club { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .nrl-title-kit { flex-direction: row; }
  .nrl-title-kit img { width: 48px; height: 52px; }
  .nrl-title-details { grid-template-columns: minmax(0, 1fr); }
  .nrl-title-difs { flex-direction: column; }
}
`;

// The commercial entries' row (#364), added to the sheet with the commercial flag on only.
const TITLE_COMMERCIAL_CSS = `
.nrl-title-buy { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-title-buy .nrl-title-btn { flex: 1 1 auto; }
`;

function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.setAttribute('class', cls);
  if (text !== undefined) e.textContent = text;
  return e;
}

function mkButton(label: string, dataAttr: string, cls = ''): HTMLButtonElement {
  const b = mk('button', `nrl-title-btn${cls ? ` ${cls}` : ''}`, label);
  b.type = 'button';
  b.setAttribute(dataAttr, '');
  return b;
}

/**
 * The title's heading (#363): the brand's logo (the wordmark, or an image from
 * public/), then the parent-brand line when the brand shows it.
 */
export function titleHeading(brand: Brand = BRAND): HTMLElement[] {
  const h1 = mk('h1', 'nrl-title-name');
  if (brand.logo.kind === 'image') {
    const img = mk('img', 'nrl-title-logo');
    img.setAttribute('src', `${import.meta.env.BASE_URL}${brand.logo.src}`);
    img.setAttribute('alt', brand.name);
    h1.appendChild(img);
  } else {
    // The wordmark (SuperCOOKED §2): text, its last word in the accent; named whole for a screen reader.
    fillWordmark(h1, brand);
    h1.setAttribute('aria-label', brand.titleText);
  }
  const out: HTMLElement[] = [h1];
  if (brand.parentBrand.show) {
    // "A SUPERCOOKED GAME", COOKED in the accent.
    const line = fillParentLine(mk('p', 'nrl-title-parent'), brand);
    line.setAttribute('data-nrl-parent-brand', '');
    out.push(line);
  }
  return out;
}

/** The jersey a club in these colours runs out in, as an image URL ('' without a canvas). */
function jerseyUrl(colors: [string, string]): string {
  try {
    return encodeCanvas(drawPlayerFrame(kitFromColors(colors, PLAYER_ID), LOOKS[0]!, 'idle', 0));
  } catch {
    return '';
  }
}

/**
 * The tip under the loading bar: one of the game's first-visit hints (tutorial.ts HINTS), so the
 * loading screen says nothing the game doesn't already say. A different one most times.
 */
export function loadingTip(now = Date.now()): string {
  const hints = Object.values(HINTS);
  return hints.length ? hints[now % hints.length]! : '';
}

/**
 * The loading screen (SuperCOOKED 10) while a League career is prepared: the wordmark, the
 * parent line, a bar that runs (the set-up reports no progress, so it shows none), what it is
 * doing, and a tip at the foot.
 */
export function showLeagueLoading(root: HTMLElement): HTMLElement {
  const overlay = mk('div', 'nrl-title');
  overlay.setAttribute('data-nrl-league-loading', '');
  overlay.setAttribute('role', 'status');
  const style = document.createElement('style');
  style.textContent = TITLE_CSS;
  overlay.appendChild(style);
  const main = mk('div', 'nrl-title-main nrl-title-main-loading');
  for (const e of titleHeading()) main.appendChild(e);
  const bar = mk('div', 'nrl-title-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Preparing your leagues');
  bar.appendChild(mk('span', 'nrl-title-bar-run'));
  main.appendChild(bar);
  main.appendChild(mk('p', 'nrl-title-doing', 'Preparing your leagues…'));
  overlay.appendChild(main);
  const hint = loadingTip();
  if (hint) {
    const tip = mk('p', 'nrl-title-tip');
    tip.appendChild(mk('b', '', 'Tip:'));
    tip.appendChild(mk('span', '', ` ${hint}`));
    overlay.appendChild(tip);
  }
  root.appendChild(overlay);
  return overlay;
}

/**
 * Renders the title overlay into `root` (#ui-root). Resolves once with the
 * player's choice, after making that slot active so load()/save() target it,
 * then removes itself.
 */
/** The Classic notice shows once per launch, the first time a title finds a Classic save. */
let classicNoticeDue = true;
/** Test hook: show the Classic notice again. */
export function __resetClassicNotice(): void { classicNoticeDue = true; }

export function showTitleFlow(root: HTMLElement, error?: string): Promise<TitleChoice> {
  return new Promise<TitleChoice>((resolve) => {
    listenForPress();
    const overlay = mk('div', 'nrl-title');
    overlay.setAttribute('data-nrl-title', '');
    const style = document.createElement('style');
    style.textContent = commercialEnabled() ? TITLE_CSS + TITLE_COMMERCIAL_CSS : TITLE_CSS;
    overlay.appendChild(style);

    const main = mk('div', 'nrl-title-main');
    overlay.appendChild(main);

    // Which build this is (N7, #181): in the screen's corner (at the foot of the page on a phone), or in a
    // new club's foot beside Next; never over the panel.
    const build = mk('div', 'nrl-title-build', `Build ${buildLabel()}`);
    build.setAttribute('data-nrl-build', '');
    overlay.appendChild(build);

    let settled = false;
    const finish = (slot: number, choice: TitleChoice): void => {
      if (settled) return;
      settled = true;
      setActiveSlot(slot);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(choice);
    };

    /** Each slot's ⋯ and its card: opening one closes the others. */
    let menus: { card: HTMLElement; more: HTMLButtonElement }[] = [];
    let opened: HTMLElement | null = null;
    const openMenu = (card: HTMLElement | null): void => {
      opened = card;
      for (const m of menus) {
        const open = m.card === card;
        m.card.setAttribute('data-open', String(open));
        m.more.setAttribute('aria-expanded', String(open));
      }
    };

    const slotCard = (s: SlotSummary, isPrimary: boolean): HTMLElement => {
      const lead = isPrimary ? 'nrl-title-btn-go' : 'nrl-title-btn-row';
      const card = mk('div', 'nrl-title-card');
      card.setAttribute(`data-nrl-slot-${s.slot}`, '');
      if (s.status === 'empty') card.setAttribute('data-empty', '');
      // The save written last carries the screen's one orange (#613) and says so.
      const last = isPrimary && s.status === 'ok';
      if (last) card.setAttribute('data-last', '');
      card.appendChild(mk('div', 'nrl-title-slotno', last ? `Slot ${s.slot} · Last played` : `Slot ${s.slot}`));
      const club = mk('div', 'nrl-title-club',
        s.status === 'ok' ? String(s.clubName)
        : s.status === 'future' ? 'Newer game version'
        : s.status === 'corrupt' ? 'Unreadable save'
        : 'Empty');
      club.setAttribute(`data-nrl-slot-label-${s.slot}`, '');
      card.appendChild(club);
      if (s.status === 'ok') card.appendChild(mk('div', 'nrl-title-when', `Season ${s.season} · Week ${s.week}${s.ladder ? ` · ${ordinal(s.ladder)}` : ''}`));
      if (s.message) card.appendChild(mk('div', 'nrl-title-warn', s.message));

      // The card's one button: Continue on a season, New club where there is none to continue.
      if (s.status === 'ok') {
        const cont = mkButton(isPrimary ? 'Continue ▸' : 'Continue', `data-nrl-continue-${s.slot}`, lead);
        cont.addEventListener('click', () => finish(s.slot, { mode: 'continue' }));
        card.appendChild(cont);
      } else if (s.status !== 'future') {
        const newBtn = mkButton(isPrimary ? 'New club ▸' : 'New club', `data-nrl-new-${s.slot}`, lead);
        newBtn.addEventListener('click', () => showSetup(s));
        card.appendChild(newBtn);
      }

      // The ⋯: the recovery copies, New club over a season, the original's export, and Delete.
      const menu = mk('div', 'nrl-title-menu');
      menu.id = `nrl-title-menu-${s.slot}`;
      menu.setAttribute('role', 'group');
      menu.setAttribute('aria-label', `Slot ${s.slot}`);
      const what: string[] = [];
      try {
        const originals = exportRecoverySaves(s.slot);
        for (let i = 0; i < originals.length; i++) {
          const copies = mkButton(`Export recovery copy ${i + 1}`, `data-nrl-recovery-${s.slot}-${i}`, 'nrl-title-btn-small');
          copies.addEventListener('click', () => downloadOriginalSave(s.slot, i));
          menu.appendChild(copies);
        }
        if (originals.length) what.push('export');
      } catch { /* unreadable storage is already described on the card */ }
      if (s.status === 'ok') {
        const newBtn = mkButton('New club', `data-nrl-new-${s.slot}`, 'nrl-title-btn-small');
        newBtn.addEventListener('click', () => showSetup(s));
        menu.appendChild(newBtn);
        what.push('new club');
      }
      if (s.status !== 'empty') {
        const recover = mkButton('Export original', `data-nrl-recover-${s.slot}`, 'nrl-title-btn-small');
        recover.addEventListener('click', () => downloadOriginalSave(s.slot));
        menu.appendChild(recover);
        // Two taps so a stray one never destroys a season.
        const del = mkButton('Delete', `data-nrl-delete-${s.slot}`, 'nrl-title-btn-small');
        let armed = false;
        del.addEventListener('click', () => {
          if (!armed) {
            armed = true;
            del.textContent = 'Really delete?';
            del.setAttribute('data-armed', '');
            return;
          }
          deleteSlot(s.slot);
          showSlots();
        });
        menu.appendChild(del);
        if (!what.includes('export')) what.push('export');
        what.push('delete');
      }
      if (what.length) {
        const more = mkButton('⋯', `data-nrl-more-${s.slot}`, 'nrl-title-more');
        more.setAttribute('aria-label', `More for slot ${s.slot}: ${what.join(', ')}`);
        more.setAttribute('aria-expanded', 'false');
        more.setAttribute('aria-controls', menu.id);
        more.addEventListener('click', () => openMenu(opened === card ? null : card));
        card.setAttribute('data-open', 'false');
        card.appendChild(more);
        card.appendChild(menu);
        menus.push({ card, more });
      }
      return card;
    };

    // One orange button on the slots screen (#613): Continue on the save written last
    // (SaveMeta.updatedAt; a tie, or saves from before meta, go to the lower slot). With
    // nothing to continue, New club on the first empty slot.
    const primarySlot = (summaries: SlotSummary[]): number | undefined => {
      const meta = listSlotMeta();
      const when = (slot: number): number => meta.find((m) => m.slot === slot)?.meta?.updatedAt ?? 0;
      const saved = summaries.filter((s) => s.status === 'ok');
      if (saved.length) return saved.reduce((a, b) => (when(b.slot) > when(a.slot) ? b : a)).slot;
      return summaries.find((s) => s.status === 'empty')?.slot;
    };

    // A message for the player (a failed import or load, a repaired save): a toast over the title
    // (§6), danger unless it is good news, rather than a line under the slots.
    const showSlots = (notice?: string, kind: 'danger' | 'info' = 'danger'): void => {
      main.replaceChildren();
      main.setAttribute('class', 'nrl-title-main nrl-title-main-slots');
      overlay.appendChild(build);
      menus = [];
      opened = null;
      const brand = mk('div', 'nrl-title-brand');
      for (const e of titleHeading()) brand.appendChild(e);
      main.appendChild(brand);
      const side = mk('div', 'nrl-title-side');
      const slots = mk('div', 'nrl-title-slots');
      // Each season's ladder place for its card (mockup 11), the HUD's own standing.
      const summaries = getSlotSummaries((st) => ladderStanding(st).rank);
      const primary = primarySlot(summaries);
      for (const s of summaries) slots.appendChild(slotCard(s, s.slot === primary));
      side.appendChild(slots);

      const foot = mk('div', 'nrl-title-foot');
      const importBtn = mkButton('Import save', 'data-nrl-import', 'nrl-title-btn-text');
      importBtn.addEventListener('click', () => {
        void pickSaveFile().then((text) => {
          if (text === null) return;
          const free = getSlotSummaries().find((x) => x.status === 'empty');
          if (!free) return showSlots('All slots are full — delete one before importing.');
          const res = installImportedSave(text, free.slot);
          if (!res.ok) return showSlots(res.message === CLASSIC_RETIRED_TEXT ? CLASSIC_RETIRED_TEXT : res.message ? `Import failed: ${res.message}` : 'Import failed: could not write to storage.');
          showSlots(res.repairs.length ? res.repairs[0]!.notification : undefined, 'info');
        });
      });
      foot.appendChild(importBtn);
      // #364: the full game and "Already bought? Log in", with the commercial flag on only.
      if (commercialEnabled()) {
        const buy = mk('div', 'nrl-title-buy');
        const full = mkButton('Get the full game', 'data-nrl-full-game');
        full.addEventListener('click', () => void openPaywall({ reason: 'title' }));
        buy.appendChild(full);
        const login = mkButton('Already bought? Log in', 'data-nrl-login', 'nrl-title-btn-text');
        login.addEventListener('click', () => void openLoginDialog());
        buy.appendChild(login);
        foot.appendChild(buy);
      }
      side.appendChild(foot);
      main.appendChild(side);
      if (notice) bus.emit('ui:notify', { text: notice, kind });
    };

    // A new club for slot `s.slot`, in three steps. A slot that holds a season asks before Start replaces it.
    const showSetup = (s: SlotSummary): void => {
      main.replaceChildren();
      main.setAttribute('class', 'nrl-title-main nrl-title-main-setup');
      let step: Step = 1;

      // ── The head: ◂ Back (a step back; from Town, the slots), the title, the step bar.
      const head = mk('div', 'nrl-title-head');
      const back = mkButton('◂ Back', 'data-nrl-back');
      head.appendChild(back);
      const title = mk('h2', 'nrl-title-step');
      title.appendChild(mk('span', '', 'New club'));
      title.appendChild(mk('span', 'nrl-title-slottag', `Slot ${s.slot}`));
      head.appendChild(title);
      const bar = mk('nav', 'nrl-title-steps');
      bar.setAttribute('aria-label', 'Steps');
      const chips = STEPS.map((name, i) => {
        const chip = mk('span', 'nrl-title-stepchip');
        chip.setAttribute('data-nrl-stepchip', String(i + 1));
        bar.appendChild(chip);
        return { chip, name };
      });
      head.appendChild(bar);
      main.appendChild(head);

      // Reuse the game's existing seed, without drawing from its simulation stream.
      const seed = Date.now() >>> 0;
      let towns: Town[] = [];
      let selected: Town | undefined;
      let primary = DEFAULT_PLAYER_COLORS[0];
      let secondary = DEFAULT_PLAYER_COLORS[1];
      let difficulty: Difficulty = DEFAULT_DIFFICULTY;

      const setup = mk('div', 'nrl-title-setup');
      setup.setAttribute(`data-nrl-form-${s.slot}`, '');
      setup.setAttribute('data-nrl-setup-step', '1');
      const panel = (n: Step, cls: string): HTMLElement => {
        const p = mk('section', `nrl-title-panel ${cls}`);
        p.setAttribute('data-nrl-panel', String(n));
        p.setAttribute('aria-label', `Step ${n} of ${STEPS.length}: ${STEPS[n - 1]}`);
        setup.appendChild(p);
        return p;
      };
      const field = (label: string, control: HTMLElement): HTMLElement => {
        const row = mk('div', 'nrl-title-field');
        row.appendChild(mk('span', 'nrl-title-label', label));
        row.appendChild(control);
        return row;
      };

      // ── 1 Town: where the club is from names it and its ground.
      const townPanel = panel(1, 'nrl-title-panel-town');
      townPanel.appendChild(mk('h3', 'nrl-title-ask', "Where's your club from?"));
      townPanel.appendChild(mk('p', 'nrl-title-sub', 'It names your club and ground. You can change both next.'));
      const search = mk('div', 'nrl-title-search');
      const townInput = mk('input', 'nrl-title-input');
      townInput.type = 'text';
      townInput.setAttribute('data-nrl-town', '');
      townInput.setAttribute('aria-label', 'Home town');
      townInput.setAttribute('maxlength', '80');
      townInput.setAttribute('autocomplete', 'off');
      townInput.setAttribute('role', 'combobox');
      townInput.setAttribute('aria-autocomplete', 'list');
      townInput.setAttribute('aria-expanded', 'true');
      townInput.setAttribute('aria-controls', 'nrl-towns');
      search.appendChild(townInput);
      const results = mk('div', 'nrl-title-results');
      results.id = 'nrl-towns';
      results.setAttribute('role', 'listbox');
      results.setAttribute('aria-label', 'Towns');
      search.appendChild(results);
      const townFoot = mk('div', 'nrl-title-townfoot');
      townFoot.appendChild(mk('span', '', "Not listed? Type any name. It just won't be on the map."));
      const townNote = mk('span', 'nrl-title-townstatus', 'Loading offline towns…');
      townNote.setAttribute('data-nrl-town-status', '');
      townFoot.appendChild(townNote);
      search.appendChild(townFoot);
      townPanel.appendChild(search);
      const townLabel = (t: Town): string => `${t.name}, ${t.region}, ${t.country}`;

      // ── 2 Club: the jersey, the names, the colours.
      const clubPanel = panel(2, 'nrl-title-panel-club');
      const kit = mk('figure', 'nrl-title-kit');
      const jersey = mk('img', 'nrl-title-jersey');
      jersey.setAttribute('alt', 'Your jersey');
      kit.appendChild(jersey);
      const kitName = mk('figcaption', 'nrl-title-kit-name');
      kit.appendChild(kitName);
      kit.appendChild(mk('span', 'nrl-title-kit-note', 'Colours are for looks only'));
      clubPanel.appendChild(kit);
      const details = mk('div', 'nrl-title-details');
      clubPanel.appendChild(details);
      // The club, coach and ground names take the rename rule (#616): a name that won't do
      // says why under its box and holds Next and Start, never cut short. Empty is fine (a default, or no coach).
      const checks: (() => boolean)[] = [];
      const reasons: HTMLElement[] = [];
      const named = (box: HTMLInputElement, max: number, hook: string): HTMLElement => {
        box.setAttribute('maxlength', String(max * 2)); // room past the limit, so the reason shows
        const why = mk('div', 'nrl-title-why');
        why.setAttribute('aria-live', 'polite');
        why.setAttribute(hook, '');
        const check = (): boolean => {
          const c = box.value.trim() ? cleanName(box.value, max) : null;
          const bad = c !== null && !c.ok;
          box.setAttribute('aria-invalid', String(bad));
          why.textContent = c && !c.ok ? c.why : '';
          return !bad;
        };
        box.addEventListener('input', () => { check(); });
        checks.push(check);
        reasons.push(why);
        const entry = mk('div', 'nrl-title-entry');
        entry.appendChild(box);
        entry.appendChild(why);
        return entry;
      };

      let clubEdited = false;
      let groundEdited = false;
      const input = mk('input', 'nrl-title-input');
      input.addEventListener('input', () => { clubEdited = true; showNames(); });
      input.type = 'text';
      input.value = DEFAULT_CLUB_NAME;
      input.setAttribute('data-nrl-clubname', '');
      input.setAttribute('aria-label', 'Club name');
      const names = mk('div', 'nrl-title-names');
      names.appendChild(field('Club name', named(input, NAME_MAX, 'data-nrl-clubname-why')));

      const coachInput = mk('input', 'nrl-title-input');
      coachInput.type = 'text';
      coachInput.setAttribute('data-nrl-coachname', '');
      coachInput.setAttribute('aria-label', 'Your name');
      coachInput.setAttribute('placeholder', 'Coach');
      names.appendChild(field('Your name', named(coachInput, NAME_MAX, 'data-nrl-coachname-why')));

      const ground = mk('input', 'nrl-title-input');
      ground.addEventListener('input', () => { groundEdited = true; });
      ground.type = 'text';
      ground.setAttribute('data-nrl-groundname', '');
      ground.setAttribute('aria-label', 'Ground name');
      names.appendChild(field('Ground', named(ground, GROUND_MAX, 'data-nrl-groundname-why')));
      details.appendChild(names);
      const colours = mk('div', 'nrl-title-colours');
      details.appendChild(colours);

      // Curated swatches only; a colour that can't be had stays, faded, and says why.
      const swatches = (label: string, aria: string, attr: string, palette: readonly string[], pick: (c: string) => void) => {
        const box = mk('div', 'nrl-title-swatches');
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', label);
        const buttons: HTMLButtonElement[] = [];
        for (const c of palette) {
          const b = mk('button', 'nrl-title-swatch');
          b.type = 'button';
          b.setAttribute(attr, c);
          b.style.background = c;
          b.addEventListener('click', () => { pick(c); refresh(); });
          buttons.push(b);
          box.appendChild(b);
        }
        colours.appendChild(field(label, box));
        /** Name the swatch, and while it is faded, why. */
        const name = (b: HTMLButtonElement, c: string, why: string): void => {
          const text = `${aria} ${COLOR_NAMES[c] ?? c}${why ? `, ${why}` : ''}`;
          b.setAttribute('aria-label', text);
          b.setAttribute('title', why ? `${COLOR_NAMES[c] ?? c}: ${why}` : (COLOR_NAMES[c] ?? c));
        };
        return { buttons, palette, name };
      };
      const townName = (): string => selected?.name ?? townInput.value;
      const LOCAL = "a local club's colours";
      const prim = swatches('Main colour', 'Primary', 'data-nrl-primary', PLAYER_PRIMARY_COLORS, (c) => {
        primary = c;
        if (!isValidColorPair(primary, secondary) || !townColorsAllowed(townName(), selected?.country, primary, secondary)) {
          secondary = PLAYER_SECONDARY_COLORS.find((x) => isValidColorPair(primary, x) && townColorsAllowed(townName(), selected?.country, primary, x)) ?? secondary;
        }
      });
      const sec = swatches('Second colour', 'Secondary', 'data-nrl-secondary', PLAYER_SECONDARY_COLORS, (c) => { secondary = c; });
      colours.appendChild(mk('span', 'nrl-title-swatch-why', "Faded = too close, or a real local club's colours"));

      // ── 3 Start: the club in a card, difficulty. A new club is a League career.
      const startPanel = panel(3, 'nrl-title-panel-start');
      const summary = mk('div', 'nrl-title-summary');
      const summaryKit = mk('img', '');
      summaryKit.setAttribute('alt', '');
      summary.appendChild(summaryKit);
      const summaryText = mk('div', 'nrl-title-summary-text');
      const summaryName = mk('span', 'nrl-title-summary-name');
      const summaryLine = mk('span', 'nrl-title-summary-line');
      summaryText.appendChild(summaryName);
      summaryText.appendChild(summaryLine);
      summary.appendChild(summaryText);
      const edit = mkButton('Edit', 'data-nrl-edit', 'nrl-title-btn-text');
      edit.setAttribute('aria-label', 'Edit the club');
      edit.addEventListener('click', () => goTo(2));
      summary.appendChild(edit);
      startPanel.appendChild(summary);

      const diffBox = mk('div', 'nrl-title-difs');
      diffBox.setAttribute('role', 'group');
      diffBox.setAttribute('aria-label', 'Difficulty');
      const firstCareer = getSlotSummaries().every((x) => x.status === 'empty');
      const diffButtons = new Map<Difficulty, HTMLButtonElement>();
      for (const d of DIFFICULTIES) {
        const b = mkButton('', `data-nrl-difficulty-${d}`, 'nrl-title-pick nrl-title-dif');
        const top = mk('span', 'nrl-title-dif-top');
        top.appendChild(mk('span', 'nrl-title-dif-name', DIFFICULTY_LABEL[d]));
        // A first career: Easy is tagged (#480). The tag reads FIRST CAREER; a screen reader hears the whole hint.
        if (d === 'easy' && firstCareer) {
          const hint = mk('span', 'nrl-title-tag');
          hint.setAttribute('data-nrl-difficulty-hint', '');
          hint.appendChild(mk('span', '', 'First career'));
          hint.appendChild(mk('span', 'nrl-title-sr', '? Start on Easy.'));
          top.appendChild(hint);
        }
        b.appendChild(top);
        b.appendChild(mk('span', 'nrl-title-difficulty-copy', DIFFICULTY_BLURB[d]));
        b.addEventListener('click', () => { difficulty = d; refresh(); });
        diffButtons.set(d, b);
        diffBox.appendChild(b);
      }
      startPanel.appendChild(diffBox);
      // Each card shows its own line; this says the picked one aloud.
      const blurb = mk('p', 'nrl-title-sr');
      blurb.setAttribute('data-nrl-difficulty-blurb', '');
      blurb.setAttribute('aria-live', 'polite');
      startPanel.appendChild(blurb);
      main.appendChild(setup);

      // ── The foot: Next on Town and Club; on Start, the veteran switch and Start.
      const foot = mk('div', 'nrl-title-setupfoot');
      const veteran = mk('input', '');
      veteran.type = 'checkbox';
      veteran.setAttribute('data-nrl-open-all', '');
      const veteranRow = mk('label', 'nrl-title-veteran');
      veteranRow.appendChild(veteran);
      veteranRow.appendChild(mk('span', '', "I've played before: open every building and Office tile now"));
      foot.appendChild(veteranRow);
      foot.appendChild(build);
      const next = mkButton('Next ▸', 'data-nrl-next', 'nrl-title-btn-go');
      foot.appendChild(next);
      const go = mk('div', 'nrl-title-go');
      foot.appendChild(go);
      main.appendChild(foot);

      /** The club name, ground and town as Start would take them, for the jersey's caption and the Start card. */
      const showNames = (): void => {
        const club = cleanName(input.value);
        const name = club.ok ? club.name : (input.value.trim() || DEFAULT_CLUB_NAME);
        kitName.textContent = name;
        summaryName.textContent = name;
        const where = selected?.name ?? townInput.value.trim();
        const g = cleanName(ground.value, GROUND_MAX);
        const coach = cleanName(coachInput.value);
        summaryLine.textContent = [
          g.ok ? g.name : groundForTown(where || name, selected?.id ?? where),
          where,
          coach.ok ? `Coach ${coach.name}` : '',
        ].filter(Boolean).join(' · ');
      };

      const refresh = (): void => {
        prim.buttons.forEach((b, i) => {
          const c = prim.palette[i]!;
          b.disabled = !PLAYER_SECONDARY_COLORS.some((x) => isValidColorPair(c, x) && townColorsAllowed(townName(), selected?.country, c, x));
          b.setAttribute('aria-pressed', String(c === primary));
          prim.name(b, c, b.disabled ? LOCAL : '');
        });
        sec.buttons.forEach((b, i) => {
          const c = sec.palette[i]!;
          const close = !isValidColorPair(primary, c);
          b.disabled = close || !townColorsAllowed(townName(), selected?.country, primary, c);
          b.setAttribute('aria-pressed', String(c === secondary));
          sec.name(b, c, close ? 'too close to your main colour' : b.disabled ? LOCAL : '');
        });
        for (const [d, b] of diffButtons) b.setAttribute('aria-pressed', String(d === difficulty));
        blurb.textContent = DIFFICULTY_BLURB[difficulty];
        const url = jerseyUrl([primary, secondary]);
        if (url) { jersey.setAttribute('src', url); summaryKit.setAttribute('src', url); }
        showNames();
      };

      /** Show step `n`: its panel, the step bar, what ◂ Back goes to. */
      const goTo = (n: Step): void => {
        step = n;
        setup.setAttribute('data-nrl-setup-step', String(n));
        for (const [i, { chip, name }] of chips.entries()) {
          const at = i + 1;
          chip.replaceChildren();
          chip.appendChild(mk('span', '', `${at < n ? '✓' : at} `));
          chip.appendChild(mk('span', 'nrl-title-stepname', name));
          chip.setAttribute('data-state', at < n ? 'done' : at === n ? 'now' : 'next');
          chip.setAttribute('aria-current', at === n ? 'step' : 'false');
        }
        back.setAttribute('aria-label', n === 1 ? 'Back to the save slots' : `Back to ${STEPS[n - 2]}`);
        refresh();
      };
      back.addEventListener('click', () => (step === 1 ? showSlots() : goTo((step - 1) as Step)));

      /** Every name passes (each says why when not); show the Club step and focus the first that doesn't. */
      const namesOk = (): boolean => {
        const bad = [0, 1, 2].filter((i) => !checks[i]!());
        if (bad.length) {
          if (step !== 2) goTo(2);
          [input, coachInput, ground][bad[0]!]!.focus();
          // On a short phone the details scroll: bring the reason into view, not only the box.
          reasons[bad[0]!]!.scrollIntoView?.({ block: 'nearest' });
        }
        return bad.length === 0;
      };
      next.addEventListener('click', () => {
        if (step === 1) goTo(2);
        else if (namesOk()) goTo(3);
      });

      // The phone keyboard (#609): names start with a capital and are not "corrected", and the
      // return key says what it does: on to the next name, then done (the keyboard goes away).
      // From the town it is on to the Club step's first name.
      const nameInputs = [townInput, input, coachInput, ground];
      nameInputs.forEach((box, i) => {
        const after = nameInputs[i + 1];
        box.setAttribute('autocapitalize', 'words');
        box.setAttribute('autocorrect', 'off');
        box.setAttribute('spellcheck', 'false');
        box.setAttribute('enterkeyhint', after ? 'next' : 'done');
        box.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || e.isComposing) return;
          e.preventDefault();
          if (box === townInput) goTo(2);
          if (after) after.focus(); else box.blur();
        });
      });

      const applyTown = (): void => {
        const value = townInput.value.trim();
        selected = towns.find(t => townLabel(t) === value)
          ?? towns.find(t => foldTown(t.name) === foldTown(value));
        const name = selected?.name ?? value;
        const nickname = selected?.nickname ?? ['Wombats', 'Kestrels', 'Otters', 'Ironworkers'][townHash(name) % 4];
        input.value = name ? defaultClubName(name, nickname) : DEFAULT_CLUB_NAME;
        ground.value = name ? groundForTown(name, selected?.id ?? name) : '';
        for (const check of checks) check();
        if (!townColorsAllowed(name, selected?.country, primary, secondary)) {
          [primary, secondary] = colorsForTown(name, selected?.country);
        }
        townNote.textContent = selected ? `${selected.region} · ${selected.country}` : 'Your own town · no coordinates';
        refresh();
      };
      /** The offline towns matching what is typed, the picked one marked; a tap picks it. */
      const suggestions = (): void => {
        results.replaceChildren();
        const query = foldTown(townInput.value);
        for (const t of towns.filter(t => foldTown(townLabel(t)).includes(query)).slice(0, 20)) {
          const option = mk('button', 'nrl-title-result');
          option.type = 'button';
          option.setAttribute('role', 'option');
          option.setAttribute('data-nrl-town-option', townLabel(t));
          option.setAttribute('aria-selected', String(t === selected));
          const nameEl = mk('span', 'nrl-title-result-name');
          // What was typed, in bold, where the name starts with it.
          const folded = foldTown(t.name);
          if (query && folded.length === t.name.length && folded.startsWith(query)) {
            nameEl.appendChild(mk('b', '', t.name.slice(0, query.length)));
            nameEl.appendChild(mk('span', '', t.name.slice(query.length)));
          } else nameEl.textContent = t.name;
          option.appendChild(nameEl);
          option.appendChild(mk('span', 'nrl-title-result-where', `${t.region} · ${t.country}`));
          option.addEventListener('click', () => {
            townInput.value = townLabel(t);
            applyTown();
            suggestions();
          });
          results.appendChild(option);
        }
      };
      townInput.addEventListener('input', () => { applyTown(); suggestions(); });
      townInput.addEventListener('change', applyTown);
      goTo(1);

      const begin = (destination: LeagueCareerDestination): void => {
        if (!namesOk()) return;
        const club = cleanName(input.value);
        const name = club.ok ? club.name : DEFAULT_CLUB_NAME;
        const coach = cleanName(coachInput.value);
        const town = selected?.name ?? townInput.value.trim();
        const groundName = cleanName(ground.value, GROUND_MAX);
        const home = selected
          ? { town, region: selected.region, country: selected.country, lat: selected.lat, lon: selected.lon }
          : { town };
        finish(s.slot, { mode: 'new', careerMode: 'league', destination, seed, clubName: name, ...(coach.ok ? { coachName: coach.name } : {}), difficulty, ...(veteran.checked ? { openAll: true } : {}), colors: [primary, secondary],
          home, groundName: groundName.ok ? groundName.name : groundForTown(town || name, selected?.id ?? town) });
      };
      // Start waits for the town list, and says so while it does (#613).
      const start = mkButton('Loading towns…', 'data-nrl-start', 'nrl-title-btn-go');
      start.disabled = true;
      const ready = (): void => { start.textContent = 'Start season ▸'; start.disabled = false; };
      start.addEventListener('click', () => {
        if (start.disabled || !namesOk()) return;
        const {raw, result} = capturePlayerSlot(s.slot);
        if (result.status !== 'ok' && result.status !== 'empty') return showSlots(result.message);
        const destination: LeagueCareerDestination = {slot: s.slot, expectedOriginal: raw};
        const occupant: SlotSummary = result.status === 'empty' ? {slot: s.slot, status:'empty'} : {
          slot: s.slot, status: 'ok', clubName: result.state.clubName, season: result.state.season, week: result.state.week,
        };
        if (occupant.status === 'empty') return begin(destination);
        // A season (or an unreadable save) is in this slot: say what Start replaces first.
        go.replaceChildren();
        const what = occupant.status === 'ok' ? `${occupant.clubName} (S${occupant.season} W${occupant.week})` : 'the unreadable save';
        const ask = mk('div', 'nrl-title-confirm', `Start over? This replaces ${what}.`);
        ask.setAttribute('data-nrl-confirm', '');
        ask.setAttribute('role', 'alert');
        go.appendChild(ask);
        const yes = mkButton('Start over', 'data-nrl-start-confirm');
        yes.addEventListener('click', () => begin(destination));
        go.appendChild(yes);
        const no = mkButton('Cancel', 'data-nrl-start-cancel');
        no.addEventListener('click', () => { go.replaceChildren(); go.appendChild(start); });
        go.appendChild(no);
      });
      go.appendChild(start);
      // This is the sole runtime import of the data: opening setup starts it.
      void import('../data/towns.json').then(({ default: data }) => {
        towns = data;
        if (!towns.length) throw new Error('Offline town catalogue is empty');
        const initial = towns[seed % towns.length];
        // A player can type while the chunk is loading; don't overwrite their town.
        if (!townInput.value && initial) townInput.value = townLabel(initial);
        const editedClub = clubEdited ? input.value : undefined;
        const editedGround = groundEdited ? ground.value : undefined;
        applyTown();
        suggestions();
        if (editedClub !== undefined) input.value = editedClub;
        if (editedGround !== undefined) ground.value = editedGround;
        for (const check of checks) check();
        showNames();
        ready();
      }).catch(() => {
        townNote.textContent = 'Town list unavailable. Type your own town to start.';
        ready();
      });
    };

    // A Classic career is no longer loadable (#819): its slot reads as empty, and starting a
    // League career there overwrites it. Nothing is deleted. Say so once per launch.
    const retired = classicNoticeDue ? classicSlots() : [];
    if (retired.length) classicNoticeDue = false;
    // Fresh install (all slots empty): go straight to setting up a club in slot 1.
    const summaries = getSlotSummaries();
    if (error) showSlots(error);
    else if (retired.length) showSlots(CLASSIC_RETIRED_TEXT, 'info');
    else if (summaries.every((x) => x.status === 'empty')) showSetup(summaries[0]!);
    else showSlots();

    root.appendChild(overlay);
  });
}
