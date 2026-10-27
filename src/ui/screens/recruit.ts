// src/ui/screens/recruit.ts — free-agency browser screen (BAK-179, WU-9).
// Renders GameState.freeAgents as compact player rows with SIGN inline. Built on
// the DOM UI kit (src/ui/dom.ts). No Phaser imports. Also exports the shared
// PlayerRow used by the squad screen.

import { el, button, ensureStyles, openScreen, screenHead } from '../dom';
import { getState, type Player, type TraitInstance } from '../../core/state';
import { TRAITS, traitLabel } from '../../data/traits';
import { bus } from '../../core/events';
import { overallRating } from '../../data/player';
import {
  signingFee, signingFeeBasis, weeksToPoolRefresh, FREE_AGENT_POOL_SIZE,
} from '../../systems/freeagency';
import { signWithUndo } from '../../systems/undo';
import { SQUAD_CAP } from '../../config';
import { TRAINING_KIT, PORTRAIT_W, PORTRAIT_H, portraitDataUrl } from '../../art/portrait';
import type { Kit } from '../../art/match/kit';
import { openPlayerPage } from './player';

// ── Shared screen styling ───────────────────────────────────────────────────
// Injected once alongside the base kit CSS (which holds the screen frame). Row,
// badge and stat-bar classes used by the recruit, squad and player screens.

const SCREEN_STYLE_ID = 'nrl-wu9-styles';

export function ensureScreenStyles(): void {
  ensureStyles();
  if (document.getElementById(SCREEN_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SCREEN_STYLE_ID;
  style.textContent = SCREEN_CSS;
  document.head.appendChild(style);
}

/** Row portraits at ×2: a 32px face keeps a row at the 44px tap height (#336). */
const ROW_PORTRAIT_PX = PORTRAIT_W * 2;

const SCREEN_CSS = `
.nrl-squad-focus { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; flex-shrink: 0; padding: 0 3px 3px 0; margin-bottom: 0.3rem; }
.nrl-squad-focus-note { flex: 1 1 14rem; min-width: 0; color: #e8e0c8; font-size: 0.75rem; line-height: 1.25; }
/* #336: compact rows, two or more across on a phone on its side, so a short
   screen shows four and more instead of one card cut after its stat bars. */
.nrl-screen-body.nrl-rows {
  grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
  gap: 0.3rem;
  padding: 0 3px 0.5rem 0;
}
.nrl-row {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 1px 4px 1px 1px;
  box-sizing: border-box;
  background: #e8e0c8;
  color: #1a1a2e;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  font-family: 'Courier New', monospace;
}
.nrl-row-portrait {
  flex: 0 0 auto;
  width: ${ROW_PORTRAIT_PX}px;
  height: ${ROW_PORTRAIT_PX}px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.nrl-row-id { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.nrl-row-name { font-weight: bold; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-row-meta { display: flex; gap: 0.3rem; align-items: center; font-size: 0.7rem; white-space: nowrap; overflow: hidden; }
.nrl-row-meta .nrl-badge { padding: 0 0.2rem; border-width: 1px; }
.nrl-row-meta [data-trait] { cursor: help; }
.nrl-row .nrl-card-ovr { flex: 0 0 auto; }
.nrl-row .nrl-row-action { flex: 0 0 auto; padding: 0.2rem 0.45rem; font-size: 0.75rem; }
.nrl-row.nrl-card-open:hover { background: #f4efe0; }
.nrl-card-ovr {
  font-weight: bold;
  background: #1a1a2e;
  color: #f4d03f;
  border: 2px solid #000;
  padding: 0.05rem 0.35rem;
  min-width: 2.2rem;
  text-align: center;
  box-sizing: border-box;
}
.nrl-card-meta {
  font-size: clamp(0.62rem, 2.4vw, 0.78rem);
  margin-bottom: 0.35rem;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}
.nrl-badge {
  border: 2px solid #000;
  padding: 0 0.3rem;
  font-weight: bold;
  background: #cfc9b4;
}
.nrl-badge-out { background: #e06666; color: #2a0000; }
.nrl-badge-ban { background: #6b2d5b; color: #fff; }
.nrl-badge-alert { background: var(--nrl-alert-tag, #f4c7c3); color: #5a0000; white-space: nowrap; }
.nrl-badge-trait { background: #9fc5e8; color: #0b1d33; }
.nrl-badge-trait-bad { background: #f0b27a; color: #2a1400; }
.nrl-statbars { display: grid; gap: 0.15rem; margin-bottom: 0.4rem; }
.nrl-statrow {
  display: grid;
  grid-template-columns: 3.2rem 1fr 1.6rem;
  align-items: center;
  gap: 0.3rem;
  font-size: clamp(0.55rem, 2.2vw, 0.7rem);
}
.nrl-stattrack {
  height: 0.55rem;
  background: #cfc9b4;
  border: 2px solid #000;
  position: relative;
}
.nrl-statfill { height: 100%; background: #7ec850; }
.nrl-card-actions { display: flex; gap: 0.4rem; }
.nrl-card-actions .nrl-btn { flex: 1 1 auto; }
.nrl-btn-danger { background: #e06666; }
.nrl-btn-danger:hover:not(:disabled) { background: #ea8a8a; }
`;

// ── Formatting helpers ──────────────────────────────────────────────────────

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`;

/** Short position labels for a row: "FB", "5/8", "2R". */
const POS_SHORT: Readonly<Record<string, string>> = {
  fullback: 'FB', winger: 'WG', centre: 'CE', 'five-eighth': '5/8', halfback: 'HB',
  hooker: 'HK', prop: 'PR', 'second-row': '2R', lock: 'LK',
};

/** Human label for a position (title-cased, hyphens kept). */
function positionLabel(pos: string): string {
  return pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Badge label + tooltip for a levelled trait (BAK-208 §3): its full name (#349 S3). Traits with a downside render in a warning tint. */
export function traitBadge(t: TraitInstance): { label: string; tip: string; bad: boolean } {
  const def = TRAITS[t.id];
  return { label: traitLabel(t), tip: `${traitLabel(t)}: ${def.blurb}`, bad: def.bad ?? false };
}

// ── Shared PlayerRow ────────────────────────────────────────────────────────

export interface PlayerRowOpts {
  /** Optional action button at the row's right end. */
  action?: { label: string; onClick: () => void; disabled?: boolean; title?: string };
  /** Show the "OUT xw" / "BAN xw" badges (squad screen). */
  showInjury?: boolean;
  /** Words after position and age: wage, morale, fee. */
  extra?: string[];
  /** Kit the portrait wears: club kit on the squad, TRAINING_KIT by default. */
  kit?: Kit;
  /** Tapping the row opens the player's page (N7, #185). */
  onOpen?: () => void;
  /** A red dot by the name and this tag (#369: "ends in 3 wk"), read out as `label`. */
  alert?: { tag: string; label: string };
}

/**
 * One player in a compact row (#336): a 32px portrait, name, position, age and
 * the words the screen passes in, the overall rating, and an optional action at
 * the right end. The full card is the player page; the row opens it.
 */
export function PlayerRow(p: Player, opts: PlayerRowOpts = {}): HTMLElement {
  const meta = el('div', { class: 'nrl-row-meta' },
    el('span', { class: 'nrl-badge', text: POS_SHORT[p.position] ?? positionLabel(p.position), attrs: { title: positionLabel(p.position) } }),
    el('span', { text: `${p.age}y` }),
  );
  if (opts.showInjury && p.injuredWeeks > 0) meta.append(el('span', { class: 'nrl-badge nrl-badge-out', text: `OUT ${p.injuredWeeks}w` }));
  if (opts.showInjury && (p.suspendedWeeks ?? 0) > 0) meta.append(el('span', { class: 'nrl-badge nrl-badge-ban', text: `BAN ${p.suspendedWeeks}w` }));
  if (opts.alert) meta.append(el('span', { class: 'nrl-badge nrl-badge-alert', text: opts.alert.tag, attrs: { title: opts.alert.label, 'data-row-alert': '' } }));
  for (const t of opts.extra ?? []) meta.append(el('span', { text: t }));
  for (const t of p.traits) {
    if (!(t.id in TRAITS)) continue;
    const b = traitBadge(t);
    // Not a button: Chrome on Android snaps a tap near a button onto it, so a tap on
    // the name would read out the trait. The row's click handler tells them apart.
    meta.append(el('span', { class: `nrl-badge ${b.bad ? 'nrl-badge-trait-bad' : 'nrl-badge-trait'}`, text: b.label, attrs: { title: b.tip, 'data-trait': t.id } }));
  }

  // Keyed on the squad id, the same key MatchScene uses, so the face matches on the pitch.
  const portrait = el('img', {
    class: 'nrl-row-portrait',
    attrs: { src: portraitDataUrl(p.id, opts.kit ?? TRAINING_KIT), alt: '', width: String(ROW_PORTRAIT_PX), height: String(ROW_PORTRAIT_PX * PORTRAIT_H / PORTRAIT_W) },
  });
  const row = el('div', { class: 'nrl-row', attrs: { 'data-row-player': p.id } },
    portrait,
    el('div', { class: 'nrl-row-id' },
      el('span', { class: 'nrl-row-name' }, p.name, ...(opts.alert ? [el('span', { class: 'nrl-row-dot', attrs: { title: opts.alert.label, 'aria-hidden': 'true' } })] : [])),
      meta),
    el('span', { class: 'nrl-card-ovr', text: String(overallRating(p)), attrs: { title: 'Overall rating' } }),
  );
  // A tap on a trait says what it does, in the toast lane; anywhere else opens the player page.
  row.addEventListener('click', (e) => {
    const trait = e.target instanceof Element ? e.target.closest('[data-trait]') : null;
    if (trait) bus.emit('ui:notify', { text: trait.getAttribute('title') ?? '', kind: 'info' });
    else opts.onOpen?.();
  });
  if (opts.onOpen) {
    const open = opts.onOpen;
    row.classList.add('nrl-card-open');
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `${p.name}${opts.alert ? `, ${opts.alert.label}` : ''}: player page`);
    row.setAttribute('data-player-open', p.id);
    row.addEventListener('keydown', (e) => {
      if (e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); }
    });
  }
  if (opts.action) {
    const a = opts.action;
    const btn = button(a.label, a.onClick, { class: 'nrl-row-action' });
    btn.addEventListener('click', (e) => e.stopPropagation());
    if (a.disabled) btn.disabled = true;
    if (a.title) btn.title = a.title;
    row.append(btn);
  }
  return row;
}

// ── Recruit screen ──────────────────────────────────────────────────────────

type RecruitSort = 'rating' | 'fee' | 'age';
const RECRUIT_SORTS: readonly { key: RecruitSort; label: string }[] = [
  { key: 'rating', label: 'OVR' }, { key: 'fee', label: 'Fee' }, { key: 'age', label: 'Age' },
];

let unsub: (() => void) | null = null;
let recruitSort: RecruitSort = 'rating';

/** Teardown run by the shared screen slot whenever this screen closes. */
function onRecruitClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/**
 * Open the recruit / free-agency screen. Renders the current freeAgents as
 * PlayerRows, each with SIGN inline that calls signPlayer. SIGN is disabled
 * when the squad is at SQUAD_CAP or the fee is unaffordable; on a failed sign
 * the reason is surfaced via a 'ui:notify' danger toast. Sorted by rating, fee
 * or age. Re-renders on every 'state:changed' so signings drop out of the list
 * live. Idempotent — reopening replaces the existing instance.
 */
export function openRecruitScreen(): void {
  ensureScreenStyles();

  const body = el('div', { class: 'nrl-screen-body nrl-rows' });
  const sortBtns = RECRUIT_SORTS.map(({ key, label }) => {
    const b = button(label, () => { recruitSort = key; render(); });
    b.setAttribute('data-sort', key);
    return b;
  });

  const sub = el('div', { class: 'nrl-screen-sub' });
  const render = (): void => {
    body.replaceChildren();
    const s = getState();
    // R2 (#349): when the pool changes, in Advance Weeks.
    const n = weeksToPoolRefresh(s.week);
    sub.textContent = `Pool of ${FREE_AGENT_POOL_SIZE} · new players ${n === 1 ? 'after this week' : `in ${n} weeks`}`;
    for (const [i, b] of sortBtns.entries()) b.classList.toggle('nrl-sort-active', RECRUIT_SORTS[i]!.key === recruitSort);
    if (s.freeAgents.length === 0) {
      body.appendChild(el('div', { class: 'nrl-screen-empty', text: 'No free agents available. New players arrive when the pool refreshes.' }));
      return;
    }
    const agents = s.freeAgents.map((p) => ({ p, fee: signingFee(s, p), ovr: overallRating(p) }));
    agents.sort((a, b) => (recruitSort === 'fee' ? a.fee - b.fee : recruitSort === 'age' ? a.p.age - b.p.age : b.ovr - a.ovr) || b.ovr - a.ovr);
    for (const { p: agent, fee } of agents) {
      const full = s.squad.length >= SQUAD_CAP;
      const broke = s.money < fee;
      body.appendChild(PlayerRow(agent, {
        // Free agents wear a neutral training top (TRAINING_KIT, the default).
        onOpen: () => openPlayerPage(agent, { kind: 'freeAgent' }),
        extra: [`${money(agent.wage)}/wk`],
        action: {
          // The signing fee: a transfer-style fee by rating and age (#146).
          label: full ? 'SQUAD FULL' : `SIGN ${money(fee)}`,
          disabled: full || broke,
          title: full ? `Squad full (${SQUAD_CAP})` : broke ? `Not enough money for the ${money(fee)} fee` : `Signing fee ${money(fee)} (${signingFeeBasis(s, agent)})`,
          onClick: () => {
            const res = signWithUndo(agent.id); // "Signed …" with a 5-second Undo (#370)
            if (!res.ok) {
              bus.emit('ui:notify', { text: signFailureText(res.reason), kind: 'info' });
            }
          },
        },
      }));
    }
  };

  const head = screenHead('Free Agency', { sub, controls: [el('span', { class: 'nrl-screen-label', text: 'Sort:' }), ...sortBtns] });

  const screen = el('div', { class: 'nrl-screen' }, head, body);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onRecruitClosed, 'recruit');
  render();
  unsub = bus.on('state:changed', render);
}

/** Map a signPlayer failure reason to player-facing copy. */
function signFailureText(reason?: string): string {
  switch (reason) {
    case 'squad-full': return 'Squad is full — release a player first.';
    case 'insufficient-funds': return 'Not enough money for the signing fee.';
    case 'not-found': return 'That free agent is no longer available.';
    default: return 'Could not sign player.';
  }
}
