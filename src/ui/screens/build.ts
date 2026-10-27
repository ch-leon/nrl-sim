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

import { el, button, openModal, closeModal, closeScreen, openScreen, screenHead, segmented, ensureStyles } from '../dom';
import {
  FACILITY_CATALOG,
  LEVEL_MULT,
  SPECIAL_MAGNITUDE,
  facilityUpkeep,
  upgradeCost,
  type FacilityDefId,
  type FacilityDef,
} from '../../data/facility';
import type { PlayerStats, PlacedFacility } from '../../core/state';
import { getState, setState } from '../../core/state';
import { spendMoney } from '../../data/club';
import { ECON } from '../../config';
import { bus } from '../../core/events';
import { sponsorReturn } from '../../systems/economy';
import { POOL_POINTS_PER_BIAS, SCOUT_BIAS_PER_LEVEL, SCOUT_FEE_DISCOUNT_PER_LEVEL } from '../../systems/freeagency';
import { REP_BASELINE } from '../../systems/league';
import {
  activeGroundsScene, demolishFacility, demolishRefund, moveFee, type GroundsSceneLike,
} from '../../world/placement';

/** Format a money value for display (local; mirrors hud.fmtMoney conventions). */
function fmtMoney(n: number): string {
  const abs = Math.abs(Math.round(n));
  const s = '$' + abs.toLocaleString('en-US');
  return n < 0 ? '-' + s : s;
}

/** Short money for a button: $900, $9k, $9.6k. */
function fmtShort(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs < 1000) return fmtMoney(n);
  return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

const STAT_LABEL: Record<keyof PlayerStats, string> = {
  speed: 'Speed',
  strength: 'Strength',
  stamina: 'Stamina',
  skill: 'Skill',
  footyIQ: 'Footy IQ',
};

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
  coachsOffice: `+${SPECIAL_MAGNITUDE.morale} squad morale/week per level`,
  trainingPaddock: '', weightsRoom: '', videoRoom: '', teamGym: '',
};

/** Which level a blurb describes and the club's reputation now (the Sponsor Board's return depends on both). */
export interface BlurbContext {
  level: 1 | 2 | 3;
  reputation: number;
}

/**
 * The Sponsor Board's line (N12): what it pays a week at `level` and the club's
 * reputation (economy.sponsorReturn, the number the weekly tick pays), then the rule.
 */
function sponsorCopy({ level, reputation }: BlurbContext): string {
  const now = fmtMoney(sponsorReturn(level, reputation));
  const rule = `${fmtMoney(ECON.SPONSOR_BASE)} + ${fmtMoney(ECON.SPONSOR_PER_REP)} a reputation point, up to ${fmtMoney(ECON.SPONSOR_CAP)}; ×${LEVEL_MULT[1]} at L2, ×${LEVEL_MULT[2]} at L3`;
  return `+${now}/week at L${level} and reputation ${reputation} (${rule}). One only`;
}

/**
 * Human "what it trains / does" copy derived from a facility's trains + special.
 * `ctx` is the level described (the build menu's L1, a placed facility's own)
 * and the club's reputation; without it, L1 at the baseline reputation.
 */
export function facilityBlurb(def: FacilityDef, ctx: BlurbContext = { level: 1, reputation: REP_BASELINE }): string {
  const trains = (Object.entries(def.trains) as [keyof PlayerStats, number][])
    .filter(([, v]) => v > 0)
    .map(([stat, v]) => `+${v} ${STAT_LABEL[stat]}`);
  const parts: string[] = [];
  if (trains.length > 0) parts.push('Trains ' + trains.join(', ') + ' / week');
  if (def.special) parts.push(def.id === 'sponsorBoard' ? sponsorCopy(ctx) : SPECIAL_COPY[def.id]);
  return parts.length > 0 ? parts.join('. ') : 'A club facility.';
}

/** The Build menu's categories (3c): TRAINING is every facility that trains a stat, CLUB the rest. */
export type BuildCategory = 'all' | 'training' | 'club';

/** Which category a facility is listed under (besides ALL). */
export function facilityCategory(def: Pick<FacilityDef, 'trains'>): Exclude<BuildCategory, 'all'> {
  return Object.values(def.trains).some((v) => (v ?? 0) > 0) ? 'training' : 'club';
}

/**
 * Why a facility can't be built now, or null when it can: a unique one already
 * on the grounds, or the money short ("Need $23,390 more"). Pure.
 */
export function buildBlocker(def: Pick<FacilityDef, 'id' | 'cost' | 'unique'>, state: { money: number; facilities: readonly { defId: string }[] }): string | null {
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
    const tiles = Object.values(FACILITY_CATALOG)
      .filter((def) => category === 'all' || facilityCategory(def) === category)
      .map((def) => {
        const blocked = buildBlocker(def, s);
        const built = def.unique === true && s.facilities.some((f) => f.defId === def.id);
        const meta = `${fmtMoney(facilityUpkeep(def, 1))}/wk upkeep · ${def.footprint.w}×${def.footprint.h}`;
        const row = el(
          'div',
          {
            class: blocked ? 'nrl-build-row nrl-build-row-disabled' : 'nrl-build-row',
            attrs: blocked ? { 'aria-disabled': 'true' } : { 'data-facility': def.id, role: 'button', tabindex: '0' },
          },
          el('div', { class: 'nrl-build-top' },
            el('span', { class: 'nrl-build-title', text: def.name }),
            // A unique facility already built has no price to pay (3c: "—").
            el('span', { class: 'nrl-build-cost nrl-num', text: built ? '—' : fmtMoney(def.cost) })),
          el('div', { class: 'nrl-build-blurb', text: facilityBlurb(def, { level: 1, reputation }) }),
          // Can't build: the meta line turns yellow and says why first.
          blocked
            ? el('div', { class: 'nrl-build-meta nrl-build-why', text: built ? blocked : `${blocked} · ${meta}` })
            : el('div', { class: 'nrl-build-meta', text: meta }),
        );
        if (!blocked) {
          const go = (): void => {
            closeScreen();
            scene?.enterPlacementMode(def.id);
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
  openModal(card, { class: 'nrl-facility-modal' }).classList.add('nrl-facility-backdrop');
}

/** "LEVEL ▬▬▭ 2/3". */
function levelPips(level: number): HTMLElement {
  const pips = el('span', { class: 'nrl-facility-pips', attrs: { 'aria-hidden': 'true' } });
  for (let i = 1; i <= 3; i++) pips.append(el('i', i <= level ? { class: 'nrl-facility-pip-on' } : {}));
  return el('div', { class: 'nrl-facility-level', attrs: { 'aria-label': `Level ${level} of 3` } },
    el('span', { class: 'nrl-label', text: 'Level' }), pips, el('span', { class: 'nrl-num', text: `${level}/3` }));
}

function renderFacilityBody(facility: PlacedFacility, def: FacilityDef): HTMLElement {
  const money = getState().money;
  const atMax = facility.level >= 3;
  const nextLevel = (facility.level + 1) as 1 | 2 | 3;
  const cost = atMax ? 0 : upgradeCost(def, nextLevel);
  const affordable = !atMax && money >= cost;

  const container = el('div', { class: 'nrl-facility-body' });
  // Running cost now, and what the next level would cost to run (N6).
  const upkeepNow = fmtMoney(facilityUpkeep(def, facility.level));
  const upkeepText = atMax
    ? `Upkeep ${upkeepNow}/wk`
    : `Upkeep ${upkeepNow}/wk · L${nextLevel} ${fmtMoney(facilityUpkeep(def, nextLevel))}/wk`;
  const x = button('✕', () => closeModal(), { class: 'nrl-screen-x nrl-facility-close' });
  x.setAttribute('aria-label', 'Close');
  container.append(
    el('div', { class: 'nrl-facility-head' }, el('h2', { class: 'nrl-facility-name', text: def.name }), x),
    levelPips(facility.level),
    el('div', { class: 'nrl-facility-info' },
      el('p', { class: 'nrl-facility-blurb', text: facilityBlurb(def, { level: facility.level, reputation: getState().reputation }) }),
      el('div', { class: 'nrl-facility-upkeep', text: upkeepText })),
  );

  const actions = el('div', { class: 'nrl-facility-actions' });
  if (atMax) {
    actions.append(el('div', { class: 'nrl-facility-max', text: 'Fully upgraded · L3' }));
  } else {
    const upBtn = button(
      `Upgrade to L${nextLevel} · ${fmtMoney(cost)}`,
      () => {
        // Re-check funds at click time (source of truth).
        if (getState().money < cost) return;
        if (!spendMoney(cost, `upgrade:${facility.defId}`)) return;
        const s = getState();
        const facilities = s.facilities.map((f) =>
          f.id === facility.id ? { ...f, level: nextLevel } : f,
        );
        setState({ facilities }); // emits state:changed -> scene re-renders
        bus.emit('ui:notify', { text: `${def.name} upgraded to L${nextLevel}!`, kind: 'success' });
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
  const refund = demolishRefund(def, facility.level);
  const moveBtn = button(`Move · ${fmtMoney(fee)}`, () => {
    if (getState().money < fee) return;
    closeModal();
    activeGroundsScene()?.enterMoveMode(facility.id);
  }, { class: 'nrl-facility-move' });
  if (money < fee || !activeGroundsScene()) moveBtn.disabled = true;

  // Two taps so a stray one never knocks a building down.
  let armed = false;
  // Written in caps here, so the money keeps its small k (3b: "DEMOLISH +$9k").
  const demoBtn = button(`DEMOLISH +${fmtShort(refund)}`, () => {
    if (!armed) {
      armed = true;
      demoBtn.textContent = `CONFIRM +${fmtShort(refund)}`;
      demoBtn.classList.add('nrl-facility-armed');
      return;
    }
    const got = demolishFacility(facility.id);
    closeModal();
    if (got !== null) bus.emit('ui:notify', { text: `${def.name} demolished. ${fmtMoney(got)} refunded.`, kind: 'info' });
  }, { class: 'nrl-btn-danger nrl-facility-demolish' });
  demoBtn.title = `Two taps: refunds ${fmtMoney(refund)}`;

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
/* 3c: the Build sheet. Three tiles across; only the grid scrolls. */
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
  background: var(--nrl-raised);
  border-radius: 10px;
  padding: 8px 10px;
  box-sizing: border-box;
  transition: background 0.12s ease;
}
.nrl-build-row:hover:not(.nrl-build-row-disabled) { background: #22305c; }
.nrl-build-row:active:not(.nrl-build-row-disabled) { transform: translateY(1px); }
.nrl-build-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-build-row-disabled { cursor: default; opacity: 0.55; }
.nrl-build-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.nrl-build-title { font-family: var(--nrl-f-label); font-size: 17px; font-weight: 700; letter-spacing: 0.03em; line-height: 1.15; min-width: 0; }
.nrl-build-cost { font-size: 13px; color: var(--nrl-accent); white-space: nowrap; }
.nrl-build-blurb { font-size: 12px; line-height: 1.3; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-build-meta { font-size: 11px; color: var(--nrl-muted); }
.nrl-build-meta.nrl-build-why { color: var(--nrl-accent); }

/* 3b: the facility card, on the right so the building stays in view. No dim and
   no catch-all behind it: taps beside it reach the grounds. */
.nrl-modal-backdrop.nrl-facility-backdrop { pointer-events: none; background: transparent; }
.nrl-facility-backdrop .nrl-modal.nrl-facility-modal {
  pointer-events: auto;
  position: fixed;
  top: calc(12px + var(--nrl-safe-t));
  right: calc(12px + var(--nrl-safe-r));
  bottom: calc(var(--nrl-nav-h, 0px) + 12px);
  width: 320px;
  max-width: calc(100vw - 24px);
  max-height: 440px;
  border-radius: 16px;
  background: var(--nrl-sheet);
  box-shadow: var(--nrl-shadow-tray);
  padding: 12px 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: nrl-sheet-up 180ms ease-out;
}
.nrl-facility-popup { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-facility-body { display: flex; flex-direction: column; gap: 8px; flex: 1 1 auto; min-height: 0; }
.nrl-facility-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 0 0 auto; }
.nrl-modal .nrl-facility-name { margin: 0; font-size: 22px; letter-spacing: 0.04em; min-width: 0; }
.nrl-facility-head .nrl-screen-x { position: relative; top: auto; right: auto; flex: 0 0 auto; }
.nrl-facility-level { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.nrl-facility-pips { display: inline-flex; gap: 6px; }
.nrl-facility-pips i { width: 28px; height: 6px; border-radius: 3px; background: var(--nrl-line); }
.nrl-facility-pips i.nrl-facility-pip-on { background: var(--nrl-accent); }
.nrl-facility-level .nrl-num { font-size: 13px; font-weight: 500; }
/* What it does and its upkeep scroll if a long blurb meets a short phone. */
.nrl-facility-info { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 6px; }
.nrl-facility-blurb { font-size: 13px; line-height: 1.4; color: var(--nrl-text-2); margin: 0; }
.nrl-facility-upkeep { font-size: 12px; color: var(--nrl-muted); }
.nrl-facility-actions { display: flex; flex-direction: column; gap: 6px; flex: 0 0 auto; }
.nrl-btn.nrl-facility-upgrade { width: 100%; min-height: 48px; font-size: 18px; }
.nrl-facility-max {
  min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px;
  background: var(--nrl-raised); color: var(--nrl-pos);
  font-family: var(--nrl-f-label); font-size: 18px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.nrl-facility-why { font-size: 12px; color: var(--nrl-accent); text-align: center; }
.nrl-facility-row { display: flex; gap: 6px; }
.nrl-facility-row .nrl-btn { flex: 1 1 0; min-width: 0; font-size: 16px; padding: 0 8px; }
.nrl-btn.nrl-facility-demolish { text-transform: none; }
.nrl-btn.nrl-facility-demolish.nrl-facility-armed,
.nrl-btn.nrl-facility-demolish.nrl-facility-armed:hover:not(:disabled) { background: var(--nrl-neg); color: var(--nrl-on-accent); }
`;
