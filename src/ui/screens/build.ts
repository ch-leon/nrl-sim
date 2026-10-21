// src/ui/screens/build.ts — DOM build menu + facility upgrade/info popup (BAK-178).
//
// The build menu lists FACILITY_CATALOG with cost / upkeep a week (N6) / footprint /
// "what it trains".
// Unaffordable rows render disabled. Selecting an affordable facility closes the
// menu and hands off to the live GroundsScene's placement mode via the scene
// registry in world/placement.ts (DOM never imports Phaser).
//
// openFacilityPopup() renders the tap-a-placed-facility upgrade/info popup, priced
// via upgradeCost, capped at L3, disabled when unaffordable. It also offers Move
// (placement mode with that facility's ghost, for a fee) and Demolish (two taps,
// part refund) — GitHub #78.

import { el, panel, button, openModal, closeModal, closeScreen, mount } from '../dom';
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

/**
 * Open the build menu. Renders one row per catalog entry (name, cost, footprint,
 * blurb). Rows the club cannot afford are disabled. Clicking an affordable row
 * closes the menu and enters placement mode on the active GroundsScene.
 *
 * `scene` is optional — defaults to the registered active GroundsScene so the
 * orchestrator can nav-register this as a zero-arg opener.
 */
export function openBuildScreen(scene: GroundsSceneLike | null = activeGroundsScene()): void {
  const money = getState().money;
  const reputation = getState().reputation;

  const rows = Object.values(FACILITY_CATALOG).map((def) => {
    const built = def.unique && getState().facilities.some((f) => f.defId === def.id);
    const affordable = money >= def.cost && !built;
    const meta = el(
      'div',
      { class: 'nrl-build-meta' },
      el('span', { class: 'nrl-build-cost', text: fmtMoney(def.cost) }),
      el('span', { class: 'nrl-build-upkeep', text: `${fmtMoney(facilityUpkeep(def, 1))}/wk upkeep` }),
      el('span', {
        class: 'nrl-build-fp',
        text: `${def.footprint.w}×${def.footprint.h}`,
      }),
    );
    const row = el(
      'div',
      {
        class: affordable ? 'nrl-build-row' : 'nrl-build-row nrl-build-row-disabled',
        attrs: affordable ? {} : { 'aria-disabled': 'true' },
      },
      el('div', { class: 'nrl-build-title', text: def.name }),
      meta,
      el('div', { class: 'nrl-build-blurb', text: facilityBlurb(def, { level: 1, reputation }) }),
      ...(built ? [el('div', { class: 'nrl-build-hint', text: 'Already built — upgrade it instead.' })] : []),
    );
    if (affordable) {
      row.addEventListener('click', () => {
        closeScreen();
        scene?.enterPlacementMode(def.id);
      });
    }
    return row;
  });

  // Close lives in the header (like the other screens) so it is reachable
  // without scrolling the facility list on short viewports.
  const content = panel(
    { class: 'nrl-build-menu' },
    el(
      'div',
      { class: 'nrl-build-head' },
      el('h2', { class: 'nrl-build-heading', text: 'Build Facility' }),
      button('Close', () => closeScreen(), { class: 'nrl-build-close' }),
    ),
    el('div', { class: 'nrl-build-list' }, ...rows),
  );
  ensureBuildStyles();
  openModal(content, { class: 'nrl-build-modal', screen: true, closeButton: false });
}

/**
 * Open the upgrade/info popup for a placed facility. Shows name, level, blurb and
 * an Upgrade button priced by upgradeCost(def, nextLevel). The button is disabled
 * at L3 or when the club can't afford the next level. Upgrading spends money,
 * increments the level (persisted via setState), re-renders, and notifies.
 */
export function openFacilityPopup(facility: PlacedFacility): void {
  const def = FACILITY_CATALOG[facility.defId];
  ensureBuildStyles();

  const body = renderFacilityBody(facility, def);
  openModal(panel({ class: 'nrl-facility-popup' }, body), { class: 'nrl-facility-modal' });
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
  container.append(
    el('h2', { class: 'nrl-facility-name', text: def.name }),
    el('div', { class: 'nrl-facility-level', text: `Level ${facility.level} / 3` }),
    el('div', { class: 'nrl-facility-upkeep', text: upkeepText }),
    el('p', { class: 'nrl-facility-blurb', text: facilityBlurb(def, { level: facility.level, reputation: getState().reputation }) }),
  );

  if (atMax) {
    container.append(el('div', { class: 'nrl-facility-max', text: 'Fully upgraded (L3).' }));
  } else {
    const upBtn = button(
      `Upgrade to L${nextLevel} — ${fmtMoney(cost)}`,
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
      { class: 'nrl-facility-upgrade' },
    );
    if (!affordable) upBtn.disabled = true;
    container.append(upBtn);
  }

  // Move / Demolish (#78).
  const fee = moveFee(def);
  const refund = demolishRefund(def, facility.level);
  const moveBtn = button(`Move — ${fmtMoney(fee)}`, () => {
    if (getState().money < fee) return;
    closeModal();
    activeGroundsScene()?.enterMoveMode(facility.id);
  }, { class: 'nrl-facility-move' });
  if (money < fee || !activeGroundsScene()) moveBtn.disabled = true;

  // Two taps so a stray one never knocks a building down.
  let armed = false;
  const demoBtn = button(`Demolish (+${fmtMoney(refund)})`, () => {
    if (!armed) {
      armed = true;
      demoBtn.textContent = `Really demolish? +${fmtMoney(refund)} back`;
      demoBtn.classList.add('nrl-facility-armed');
      return;
    }
    const got = demolishFacility(facility.id);
    closeModal();
    if (got !== null) bus.emit('ui:notify', { text: `${def.name} demolished. ${fmtMoney(got)} refunded.`, kind: 'info' });
  }, { class: 'nrl-facility-demolish' });

  container.append(
    el('div', { class: 'nrl-facility-actions' }, moveBtn, demoBtn),
    button('Close', () => closeModal(), { class: 'nrl-facility-close' }),
  );
  return container;
}

// ── Styles (injected once, mirrors the pixel-UI kit in ui/dom.ts) ───────────

const BUILD_STYLE_ID = 'nrl-build-styles';

function ensureBuildStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BUILD_STYLE_ID)) return;
  // Ensure the base kit stylesheet is present too (mount() injects it).
  mount(el('div', { attrs: { style: 'display:none' } }));
  const style = document.createElement('style');
  style.id = BUILD_STYLE_ID;
  style.textContent = BUILD_CSS;
  document.head.appendChild(style);
}

const BUILD_CSS = `
.nrl-build-heading, .nrl-facility-name {
  margin: 0 0 0.5rem;
  font-size: clamp(1rem, 4vw, 1.3rem);
}
.nrl-build-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.nrl-build-row {
  pointer-events: auto;
  cursor: pointer;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  background: #f4d03f;
  padding: 0.5rem 0.6rem;
}
.nrl-build-row:hover:not(.nrl-build-row-disabled) { background: #f7dc6f; }
.nrl-build-row:active:not(.nrl-build-row-disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 #000;
}
.nrl-build-row-disabled {
  cursor: default;
  opacity: 0.5;
  background: #cfc9b4;
}
.nrl-build-title { font-weight: bold; }
.nrl-build-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
  margin: 0.15rem 0;
}
.nrl-build-cost { font-weight: bold; }
.nrl-build-upkeep { opacity: 0.85; }
.nrl-facility-upkeep { font-size: 0.85rem; }
.nrl-build-blurb { font-size: 0.75rem; line-height: 1.2; }
.nrl-build-hint { font-size: 0.75rem; font-weight: bold; opacity: 0.85; }
.nrl-build-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.nrl-build-head .nrl-build-heading { margin: 0; }
.nrl-facility-close { margin-top: 0.25rem; }
.nrl-facility-body { display: flex; flex-direction: column; gap: 0.5rem; }
.nrl-facility-level { font-weight: bold; }
.nrl-facility-blurb { font-size: 0.85rem; line-height: 1.3; margin: 0; }
.nrl-facility-max { font-weight: bold; color: #357a38; }
.nrl-facility-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.nrl-facility-actions .nrl-btn { flex: 1 1 8rem; white-space: normal; }
.nrl-btn.nrl-facility-demolish, .nrl-btn.nrl-facility-demolish:hover { background: #e8a598; }
.nrl-btn.nrl-facility-demolish.nrl-facility-armed,
.nrl-btn.nrl-facility-demolish.nrl-facility-armed:hover { background: #b03a2e; color: #fff; }
`;
