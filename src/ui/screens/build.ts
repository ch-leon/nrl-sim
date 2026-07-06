// src/ui/screens/build.ts — DOM build menu + facility upgrade/info popup (BAK-178).
//
// The build menu lists FACILITY_CATALOG with cost / footprint / "what it trains".
// Unaffordable rows render disabled. Selecting an affordable facility closes the
// menu and hands off to the live GroundsScene's placement mode via the scene
// registry in world/placement.ts (DOM never imports Phaser).
//
// openFacilityPopup() renders the tap-a-placed-facility upgrade/info popup, priced
// via upgradeCost, capped at L3, disabled when unaffordable.

import { el, panel, button, openModal, closeModal, mount } from '../dom';
import {
  FACILITY_CATALOG,
  upgradeCost,
  type FacilityDef,
} from '../../data/facility';
import type { PlayerStats, PlacedFacility } from '../../core/state';
import { getState, setState } from '../../core/state';
import { spendMoney } from '../../data/club';
import { bus } from '../../core/events';
import { activeGroundsScene, type GroundsSceneLike } from '../../world/placement';

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

const SPECIAL_COPY: Record<NonNullable<FacilityDef['special']>, string> = {
  income: 'Boosts weekly income',
  gate: 'Boosts match-day gate takings',
  recruitQuality: 'Improves recruit quality',
  injuryRecovery: 'Speeds injury recovery',
  morale: 'Lifts squad morale',
};

/** Human "what it trains / does" copy derived from a facility's trains + special. */
export function facilityBlurb(def: FacilityDef): string {
  const trains = (Object.entries(def.trains) as [keyof PlayerStats, number][])
    .filter(([, v]) => v > 0)
    .map(([stat, v]) => `+${v} ${STAT_LABEL[stat]}`);
  const parts: string[] = [];
  if (trains.length > 0) parts.push('Trains ' + trains.join(', ') + ' / week');
  if (def.special) parts.push(SPECIAL_COPY[def.special]);
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

  const rows = Object.values(FACILITY_CATALOG).map((def) => {
    const affordable = money >= def.cost;
    const meta = el(
      'div',
      { class: 'nrl-build-meta' },
      el('span', { class: 'nrl-build-cost', text: fmtMoney(def.cost) }),
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
      el('div', { class: 'nrl-build-blurb', text: facilityBlurb(def) }),
    );
    if (affordable) {
      row.addEventListener('click', () => {
        closeModal();
        scene?.enterPlacementMode(def.id);
      });
    }
    return row;
  });

  const content = panel(
    { class: 'nrl-build-menu' },
    el('h2', { class: 'nrl-build-heading', text: 'Build Facility' }),
    el('div', { class: 'nrl-build-list' }, ...rows),
    button('Close', () => closeModal(), { class: 'nrl-build-close' }),
  );
  ensureBuildStyles();
  openModal(content, { class: 'nrl-build-modal' });
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
  container.append(
    el('h2', { class: 'nrl-facility-name', text: def.name }),
    el('div', { class: 'nrl-facility-level', text: `Level ${facility.level} / 3` }),
    el('p', { class: 'nrl-facility-blurb', text: facilityBlurb(def) }),
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

  container.append(button('Close', () => closeModal(), { class: 'nrl-facility-close' }));
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
  margin-bottom: 0.75rem;
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
.nrl-build-blurb { font-size: 0.75rem; line-height: 1.2; }
.nrl-build-close, .nrl-facility-close { margin-top: 0.25rem; }
.nrl-facility-body { display: flex; flex-direction: column; gap: 0.5rem; }
.nrl-facility-level { font-weight: bold; }
.nrl-facility-blurb { font-size: 0.85rem; line-height: 1.3; margin: 0; }
.nrl-facility-max { font-weight: bold; color: #357a38; }
`;
