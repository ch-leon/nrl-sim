// src/ui/screens/build.ts — DOM build menu + facility upgrade/info popup (BAK-178).
//
// The build menu (Broadcast Quiet 3c) is a sheet of tiles, three across, with a
// category control (ALL / TRAINING / CLUB): each tile has the name, cost, what it
// does at L1, and its upkeep a week (N6) and footprint. A tile the club can't
// build stays visible, dimmed, and says why in place of its meta line.
// Selecting a buildable tile closes the menu and hands off to the live
// GroundsScene's placement mode via the scene registry in world/placement.ts
// (DOM never imports Phaser).
//
// openFacilityPopup() renders the tap-a-placed-facility card (3b) on the right
// of the grounds, so the building stays in view: its level pips, what it does,
// upkeep, the upgrade priced via upgradeCost (capped at L3; unaffordable says
// how much more is needed), Move (placement mode with that facility's ghost, for
// a fee) and Demolish (two taps, part refund) — GitHub #78.

import { el, button, openModal, closeModal, closeScreen, openScreen, screenHead, segmented, ensureStyles, guardDoubleTap } from '../dom';
import {
  FACILITY_CATALOG,
  LEVEL_MULT,
  SPECIAL_MAGNITUDE,

  upgradeCost,
  type FacilityDefId,
  type FacilityDef,
} from '../../data/facility';
import type { PlacedFacility } from '../../core/state';
import { isFacilityOpen, unlockReason } from '../../systems/unlocks';
import type { LeagueReadState } from '../../systems/leagueSeasonView';
import { getState } from '../../core/state';
import { ECON, PROGRESSION } from '../../config';
import { fmtMoney, fmtMoneyShort } from '../../utils/money';
import { bus } from '../../core/events';
import { sponsorReturn } from '../../systems/economy';
import { matchIncomeTier } from '../../systems/matchIncome';
import { demolishWithUndo } from '../../systems/undo';
import { POOL_POINTS_PER_BIAS, SCOUT_BIAS_PER_LEVEL, SCOUT_FEE_DISCOUNT_PER_LEVEL } from '../../systems/freeagency';
import { REP_BASELINE } from '../../systems/league';
import { coachsOfficeLevel } from '../../systems/matchday';
import { officeUnlockLine } from '../coachCallsText';
import { openCoachCallsScreen } from './coachCalls';
import {
  activeGroundsScene, demolishRefund, moveFee, upgradeFacility, type GroundsSceneLike,
} from '../../world/placement';

/** The free-agent pool's lift a level, in overall points (freeagency.poolTarget). */
const poolLift = (bias: number): number => Math.round(bias * POOL_POINTS_PER_BIAS * 10) / 10;

/** What each special actually does, matching the systems that read it. */
const SPECIAL_COPY: Record<FacilityDefId, string> = {
  sponsorBoard: '', // depends on the level and the club's reputation: sponsorCopy
  grandstand: `Seats ${ECON.CAPACITY.slice(1).map((n) => n.toLocaleString('en-US')).join(' / ')} by level; the hill holds ${ECON.CAPACITY[0].toLocaleString('en-US')}. One only`,
  academy: `Better free-agent pool (+${poolLift(SPECIAL_MAGNITUDE.recruitQuality)} overall per level)`,
  scoutOffice: `Better free-agent pool (+${poolLift(SCOUT_BIAS_PER_LEVEL)} overall per level); signing fees ${Math.round(SCOUT_FEE_DISCOUNT_PER_LEVEL * 100)}% cheaper per level`,
  physioCentre: 'Injured players recover 1 week faster',
  medicalBay: 'Injured players recover 1 week faster per level',
  canteen: `+${SPECIAL_MAGNITUDE.morale} squad morale/week per level`,
  coachsOffice: '', // depends on the club's best Coach's Office: officeCopy
  trainingPaddock: '', weightsRoom: '', videoRoom: '', teamGym: '',
};

/**
 * Which level a blurb describes and the club's reputation now (the Sponsor Board's return depends on both),
 * and the club's best Coach's Office (0 = none; the Coach's Office names the calls its next level unlocks).
 */
export interface BlurbContext {
  level: 1 | 2 | 3;
  reputation: number;
  officeLevel?: number;
  tier?: import('../../data/financeRules').FinanceTier;
}

/**
 * The Coach's Office's line (N9.6): morale, and the coach calls it unlocks, with
 * what the club's next level unlocks ("Level 2 unlocks Kick early, Run it, …"), or
 * that every call is unlocked. The calls come from CALLS.unlocks.
 */
function officeCopy({ officeLevel = 0 }: BlurbContext): string {
  return `+${SPECIAL_MAGNITUDE.morale} squad morale/week per level. Unlocks coach calls. ${officeUnlockLine(officeLevel)}`;
}

/**
 * Sponsor Board's fixed per-match return at this tier and level.
 */
function sponsorCopy({ level, reputation, tier = 'premier' }: BlurbContext): string {
  const now = fmtMoney(sponsorReturn(level, reputation, tier));
  return `+${now} per played non-trial match at L${level}. No income while idle. One only`;
}

/**
 * Human XP / special-effect copy derived from the facility definition.
 * `ctx` is the level described (the build menu's L1, a placed facility's own)
 * and the club's reputation; without it, L1 at the baseline reputation.
 */
export function facilityBlurb(def: FacilityDef, ctx: BlurbContext = { level: 1, reputation: REP_BASELINE }): string {
  const parts: string[] = [];
  if (def.training) parts.push(`+${Math.round(PROGRESSION.FACILITY_XP_BONUS * LEVEL_MULT[ctx.level - 1] * 100)}% XP (total cap ${PROGRESSION.FACILITY_XP_CAP * 100}%)`);
  if (def.special) parts.push(def.id === 'sponsorBoard' ? sponsorCopy(ctx) : def.id === 'coachsOffice' ? officeCopy(ctx) : SPECIAL_COPY[def.id]);
  return parts.length > 0 ? parts.join('. ') : 'A club facility.';
}

/** The Build menu's categories (3c): TRAINING is every facility that boosts XP, CLUB the rest. */
export type BuildCategory = 'all' | 'training' | 'club';

/** Which category a facility is listed under (besides ALL). */
export function facilityCategory(def: Pick<FacilityDef, 'training'>): Exclude<BuildCategory, 'all'> {
  return def.training ? 'training' : 'club';
}

/**
 * Why a facility can't be built now, or null when it can: a unique one already
 * on the grounds, or the money short ("Need $23,390 more"). Pure.
 */
export function buildBlocker(def: Pick<FacilityDef, 'id' | 'cost' | 'unique'>, state: { money: number; facilities: readonly { defId: string }[]; unlocks?: { facilities: FacilityDefId[] } | undefined } & Partial<LeagueReadState>): string | null {
  if (!isFacilityOpen(state, def.id)) return unlockReason(def.id, state.league ? { ...state, league: state.league } : undefined);
  if (def.unique && state.facilities.some((f) => f.defId === def.id)) return 'Built: upgrade it on the grounds';
  if (state.money < def.cost) return `Need ${fmtMoney(def.cost - Math.max(0, state.money))} more`;
  return null;
}

/** The category the menu last showed; holds while the game is open. */
let category: BuildCategory = 'all';

/**
 * Open the build menu. Renders one tile per catalog entry (name, cost, what it
 * does, upkeep and footprint). Tiles the club cannot build are dimmed and say
 * why. Clicking a buildable tile closes the menu and enters placement mode on
 * the active GroundsScene.
 *
 * `scene` is optional — defaults to the registered active GroundsScene so the
 * orchestrator can nav-register this as a zero-arg opener.
 */
export function openBuildScreen(scene: GroundsSceneLike | null = activeGroundsScene()): void {
  ensureBuildStyles();
  const list = el('div', { class: 'nrl-build-list' });

  const render = (): void => {
    const s = getState();
    const reputation = s.reputation;
    const officeLevel = coachsOfficeLevel(s);
    const tiles = Object.values(FACILITY_CATALOG)
      .filter((def) => category === 'all' || facilityCategory(def) === category)
      .map((def) => {
        const blocked = buildBlocker(def, s);
        const placed = def.unique === true ? s.facilities.find((f) => f.defId === def.id) : undefined;
        const built = !!placed;
        const meta = `${def.footprint.w}×${def.footprint.h} · one-off cost`;
        const row = el(
          'div',
          {
            class: blocked ? 'nrl-build-row nrl-build-row-disabled' : 'nrl-build-row',
            // aria-disabled is inherited: the Office's separate calls button stays available.
            attrs: blocked ? (def.id === 'coachsOffice' ? {} : { 'aria-disabled': 'true' })
              : { 'data-facility': def.id, role: 'button', tabindex: '0' },
          },
          el('div', { class: 'nrl-build-top' },
            el('span', { class: 'nrl-build-title', text: def.name }),
            // A unique facility already built has no price to pay (3c: "—").
            el('span', { class: 'nrl-build-cost nrl-num', text: built ? '—' : fmtMoney(def.cost) })),
          el('div', { class: 'nrl-build-blurb', text: facilityBlurb(def, { level: 1, reputation, officeLevel, tier: matchIncomeTier(s) }) }),
          // Can't build: the meta line turns amber and says why first. One only and on the grounds (SuperCOOKED 22):
          // green, its level, and where to upgrade it.
          blocked
            ? el('div', { class: `nrl-build-meta nrl-build-why${built ? ' nrl-build-built' : ''}`,
              text: built ? `Built · L${placed!.level} · tap it on the grounds` : !isFacilityOpen(s, def.id) ? blocked : `${blocked} · ${meta}`,
              ...(built ? { attrs: { title: blocked } } : {}) })
            : el('div', { class: 'nrl-build-meta', text: meta }),
        );
        // The Coach's Office's tile opens the Coach calls page, built or not, buildable or not.
        if (def.id === 'coachsOffice') row.append(seeCallsButton());
        if (!blocked) {
          const go = (): void => {
            closeScreen();
            // The scene as it is now: the first tap (#370) can open Build before the grounds are up.
            (scene ?? activeGroundsScene())?.enterPlacementMode(def.id);
          };
          row.addEventListener('click', go);
          row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        }
        return row;
      });
    list.replaceChildren(...tiles);
  };

  const seg = segmented<BuildCategory>(
    [{ id: 'all', label: 'All' }, { id: 'training', label: 'Training' }, { id: 'club', label: 'Club' }],
    category,
    (id) => { category = id; seg.set(id); render(); list.scrollTop = 0; },
    { label: 'Category' },
  );
  render();

  const sheet = el('div', { class: 'nrl-screen nrl-build-menu' },
    screenHead('Build', { sub: el('span', { class: 'nrl-screen-sub', text: 'Pick one, then place it on the grounds' }), controls: [seg.el] }),
    list,
  );
  // Money moves under an open menu (a week advanced from the dock): re-price the tiles.
  const off = bus.on('state:changed', () => { if (sheet.isConnected) render(); });
  openScreen(sheet, off, 'build');
}

/**
 * Open the card for a placed facility (3b), on the right so the building stays
 * in view: no dimmed screen behind it, so the grounds beside it still take taps
 * (another building opens its own card). Closed by its ✕, a sheet opening from
 * the dock, or a match.
 */
export function openFacilityPopup(facility: PlacedFacility): void {
  const def = FACILITY_CATALOG[facility.defId];
  ensureBuildStyles();

  const card = el('div', { class: 'nrl-facility-popup', attrs: { 'data-facility-popup': facility.id } });
  card.append(renderFacilityBody(facility, def));
  // An upgrade redraws the card with the next level's Upgrade in the same spot, and has no Undo (#598).
  guardDoubleTap(card);
  // cut: the card rises by itself (nrl-sheet-up below), so it takes no dialog's entrance as well (#606).
  openModal(card, { class: 'nrl-facility-modal', cut: true }).classList.add('nrl-facility-backdrop');
}

/**
 * "See coach calls" (the Coach's Office's tile and card): opens the Coach calls
 * page. On a tile that is itself a button, so its tap and Enter stop here.
 */
function seeCallsButton(): HTMLButtonElement {
  const b = button('See coach calls ▸', () => {
    closeModal();
    openCoachCallsScreen();
  }, { class: 'nrl-build-calls' });
  b.setAttribute('data-see-calls', '');
  b.addEventListener('click', (e) => e.stopPropagation());
  b.addEventListener('keydown', (e) => e.stopPropagation());
  return b;
}

/** "▬▬▭ LEVEL 2 of 3" (SuperCOOKED 21). */
function levelPips(level: number): HTMLElement {
  const pips = el('span', { class: 'nrl-facility-pips', attrs: { 'aria-hidden': 'true' } });
  for (let i = 1; i <= 3; i++) pips.append(el('i', i <= level ? { class: 'nrl-facility-pip-on' } : {}));
  return el('div', { class: 'nrl-facility-level', attrs: { 'aria-label': `Level ${level} of 3` } },
    pips, el('span', { class: 'nrl-facility-level-text', text: `Level ${level} of 3` }));
}

/**
 * One of the card's level boxes (SuperCOOKED 21): a training facility's XP boost as the big figure and the
 * rest of its line under it; anything else, its whole line. Its line is the same blurb the card always showed.
 */
function levelBox(def: FacilityDef, level: 1 | 2 | 3, tag: string, next: boolean): HTMLElement {
  const s = getState();
  const blurb = facilityBlurb(def, { level, tier: matchIncomeTier(s), reputation: s.reputation, officeLevel: coachsOfficeLevel(s) });
  const xp = def.training ? `+${Math.round(PROGRESSION.FACILITY_XP_BONUS * LEVEL_MULT[level - 1] * 100)}% XP` : null;
  // The big figure says the boost; the line keeps the cap and whatever else the facility does.
  const rest = xp ? blurb.replace(/^\+\d+% XP \(total cap (\d+)%\)\.?\s*/, (_m, cap: string) => `Training boost (total cap ${cap}%). `).trim() : blurb;
  return el('div', { class: next ? 'nrl-facility-box nrl-facility-next' : 'nrl-facility-box' },
    el('span', { class: 'nrl-facility-box-tag', text: tag }),
    ...(xp ? [el('span', { class: 'nrl-facility-box-big', text: xp })] : []),
    el('p', { class: next ? 'nrl-facility-box-text' : 'nrl-facility-box-text nrl-facility-blurb', text: rest }));
}

function renderFacilityBody(facility: PlacedFacility, def: FacilityDef): HTMLElement {
  const money = getState().money;
  const atMax = facility.level >= 3;
  const nextLevel = (facility.level + 1) as 1 | 2 | 3;
  const cost = atMax ? 0 : upgradeCost(def, nextLevel);
  const affordable = !atMax && money >= cost;

  const container = el('div', { class: 'nrl-facility-body' });
  // Running cost now, and what the next level would cost to run (N6).
  const upkeepText = 'No recurring upkeep';
  const x = button('✕', () => closeModal(), { class: 'nrl-screen-x nrl-facility-close' });
  x.setAttribute('aria-label', 'Close');
  container.append(
    el('div', { class: 'nrl-facility-head' }, el('h2', { class: 'nrl-facility-name', text: def.name }), x),
    levelPips(facility.level),
    el('div', { class: 'nrl-facility-info' },
      // Now and the next level side by side (SuperCOOKED 21); at L3, now alone.
      el('div', { class: 'nrl-facility-boxes' },
        levelBox(def, facility.level as 1 | 2 | 3, 'Now', false),
        ...(atMax ? [] : [levelBox(def, nextLevel, `Level ${nextLevel}`, true)])),
      el('div', { class: 'nrl-facility-upkeep', text: upkeepText }),
      ...(def.id === 'coachsOffice' ? [seeCallsButton()] : [])),
  );

  const actions = el('div', { class: 'nrl-facility-actions' });
  if (atMax) {
    actions.append(el('div', { class: 'nrl-facility-max', text: 'Fully upgraded · L3' }));
  } else {
    const upBtn = button(
      `Upgrade to L${nextLevel} · ${fmtMoney(cost)}`,
      () => {
        if (!upgradeFacility(facility.id)) return;
        // Re-render the popup body against the new state.
        const updated = getState().facilities.find((f) => f.id === facility.id);
        if (updated) {
          const parent = container.parentElement;
          const fresh = renderFacilityBody(updated, def);
          if (parent) parent.replaceChild(fresh, container);
        }
      },
      { class: 'nrl-btn-primary nrl-facility-upgrade' },
    );
    actions.append(upBtn);
    // Disabled stays visible and says why.
    if (!affordable) {
      upBtn.disabled = true;
      actions.append(el('div', { class: 'nrl-facility-why', text: `Need ${fmtMoney(cost - Math.max(0, money))} more to upgrade` }));
    }
  }

  // Move / Demolish (#78).
  const fee = moveFee(def);
  const refund = demolishRefund(def, facility.level, facility.constructionSpend ?? 0);
  const moveBtn = button(`Move · ${fmtMoney(fee)}`, () => {
    if (getState().money < fee) return;
    closeModal();
    activeGroundsScene()?.enterMoveMode(facility.id);
  }, { class: 'nrl-facility-move' });
  if (money < fee || !activeGroundsScene()) moveBtn.disabled = true;

  // One tap: the toast's 5-second Undo puts it back (#370; it replaced the "Really demolish?" tap).
  // Written in caps here, so the money keeps its small k (3b: "DEMOLISH +$9k").
  const demoBtn = button(`DEMOLISH +${fmtMoneyShort(refund, { places: 1 })}`, () => {
    demolishWithUndo(facility.id);
    closeModal();
  }, { class: 'nrl-btn-danger nrl-facility-demolish' });
  demoBtn.title = `Refunds ${fmtMoney(refund)}; Undo for 5 seconds`;

  actions.append(el('div', { class: 'nrl-facility-row' }, moveBtn, demoBtn));
  if (money < fee) actions.append(el('div', { class: 'nrl-facility-why', text: `Need ${fmtMoney(fee - Math.max(0, money))} more to move` }));
  container.append(actions);
  return container;
}

// ── Styles (injected once, beside the shared kit in ui/dom.ts) ─────────────

const BUILD_STYLE_ID = 'nrl-build-styles';

function ensureBuildStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(BUILD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BUILD_STYLE_ID;
  style.textContent = BUILD_CSS;
  document.head.appendChild(style);
}

export const BUILD_CSS = `
/* SuperCOOKED 22: the Build sheet. Three tiles across on ringed panels; only the grid scrolls. */
.nrl-build-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  align-content: start;
}
@media (max-width: 600px) { .nrl-build-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .nrl-build-list { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.nrl-build-row {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--nrl-panel);
  box-shadow: inset 0 0 0 1px var(--nrl-line);
  border-radius: 12px;
  padding: 8px 12px;
  box-sizing: border-box;
  transition: background-color var(--nrl-dur-press) ease;
}
@media (hover: hover) and (pointer: fine) { .nrl-build-row:hover:not(.nrl-build-row-disabled) { background: var(--nrl-raised-hover); } }
.nrl-build-row:active:not(.nrl-build-row-disabled) { background: var(--nrl-raised-hover); }
.nrl-build-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-build-row-disabled { cursor: default; opacity: 0.55; }
.nrl-build-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.nrl-build-title { font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; line-height: 1.15; text-transform: uppercase; min-width: 0; }
.nrl-build-cost { font-family: var(--nrl-f-num); font-size: 0.8125rem; font-weight: 700; color: var(--nrl-accent); white-space: nowrap; }
/* The whole line, never clamped: it is the only place a facility's effect reads before you pay (#740 review). */
.nrl-build-blurb { font-size: 0.8125rem; line-height: 1.3; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-build-meta { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-build-meta.nrl-build-why { color: var(--nrl-neg); }
.nrl-build-meta.nrl-build-why.nrl-build-built { color: var(--nrl-pos); }
/* The Coach's Office's way to the Coach calls page: a 44px link-style button at the foot of its tile and card. */
.nrl-btn.nrl-build-calls {
  align-self: flex-start; min-height: 44px; padding: 0 10px; margin-top: 2px;
  background: transparent; box-shadow: inset 0 0 0 1px var(--nrl-line); color: var(--nrl-accent);
  font-size: 0.875rem; text-transform: none; letter-spacing: 0.02em; white-space: normal; text-align: left;
}
/* An unaffordable Coach's Office still opens the page: its tile dims all but the button. */
.nrl-build-row-disabled:has(.nrl-build-calls) { opacity: 1; }
.nrl-build-row-disabled:has(.nrl-build-calls) > :not(.nrl-build-calls) { opacity: 0.55; }

/* SuperCOOKED 21: the facility card, on the right so the building stays in view. No dim and
   no catch-all behind it: taps beside it reach the grounds. */
.nrl-modal-backdrop.nrl-facility-backdrop { pointer-events: none; background: transparent; }
.nrl-facility-backdrop .nrl-modal.nrl-facility-modal {
  pointer-events: auto;
  position: fixed;
  top: calc(12px + var(--nrl-safe-t));
  right: calc(12px + var(--nrl-safe-r));
  bottom: calc(var(--nrl-nav-h, 0px) + 12px);
  width: 330px;
  max-width: calc(100vw - 24px);
  max-height: 440px;
  border-radius: 16px;
  background: var(--nrl-sheet);
  box-shadow: inset 0 0 0 1px var(--nrl-line), var(--nrl-shadow-tray);
  padding: 14px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: nrl-sheet-up var(--nrl-dur-sheet) var(--nrl-ease-out);
}
.nrl-facility-popup { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-facility-body { display: flex; flex-direction: column; gap: 8px; flex: 1 1 auto; min-height: 0; }
.nrl-facility-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 0 0 auto; }
.nrl-modal .nrl-facility-name { margin: 0; font-family: var(--nrl-f-label); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; min-width: 0; }
.nrl-facility-head .nrl-screen-x { position: relative; top: auto; right: auto; flex: 0 0 auto; }
.nrl-facility-level { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
.nrl-facility-pips { display: inline-flex; gap: 4px; }
.nrl-facility-pips i { width: 34px; height: 7px; border-radius: 4px; background: var(--nrl-line); }
.nrl-facility-pips i.nrl-facility-pip-on { background: var(--nrl-text); }
.nrl-facility-level-text { font-family: var(--nrl-f-num); font-size: 0.6875rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--nrl-text-2); }
/* Now and the next level, and the upkeep line, scroll if a long line meets a short phone. */
.nrl-facility-info { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 6px; }
.nrl-facility-boxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 6px; }
.nrl-facility-box { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 8px 10px; border-radius: 12px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); }
.nrl-facility-box.nrl-facility-next { box-shadow: inset 0 0 0 1px rgba(20, 195, 142, 0.45); }
.nrl-facility-box-tag { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-facility-next .nrl-facility-box-tag { color: var(--nrl-pos); }
.nrl-facility-box-big { font-family: var(--nrl-f-display); font-size: 1.375rem; line-height: 1.1; color: var(--nrl-text); }
.nrl-facility-next .nrl-facility-box-big { color: var(--nrl-pos); }
.nrl-facility-box-text { margin: 0; font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-facility-upkeep { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-facility-actions { display: flex; flex-direction: column; gap: 6px; flex: 0 0 auto; }
.nrl-btn.nrl-facility-upgrade { width: 100%; min-height: 44px; font-size: 1.0625rem; border-radius: 10px; }
.nrl-facility-max {
  min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px;
  background: var(--nrl-panel); color: var(--nrl-pos);
  font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.nrl-facility-why { font-size: 0.75rem; color: var(--nrl-neg); text-align: center; }
.nrl-facility-row { display: flex; flex-wrap: wrap; gap: 6px; }
/* Side by side while both labels fit; a larger text size (#371) puts DEMOLISH under MOVE rather than cut it. */
.nrl-facility-row .nrl-btn { flex: 1 1 auto; min-width: 0; min-height: 44px; font-size: 1rem; padding: 0 8px; border-radius: 10px; white-space: nowrap; }
.nrl-btn.nrl-facility-demolish { text-transform: none; }
`;
