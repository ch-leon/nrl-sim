// src/ui/screens/recruit.ts — free-agency browser screen (BAK-179, WU-9).
// Renders GameState.freeAgents as pixel PlayerCards with a Sign action. Built on
// the DOM UI kit (src/ui/dom.ts). No Phaser imports. Also exports the shared
// PlayerCard used by the squad screen.

import { el, panel, button, ensureStyles, openScreen, closeScreen } from '../dom';
import { getState, type Player, type PlayerStats, type TraitInstance } from '../../core/state';
import { ROMAN, TRAITS, traitLabel } from '../../data/traits';
import { bus } from '../../core/events';
import { overallRating } from '../../data/player';
import {
  signPlayer, signingFee, signingFeeBasis, FREE_AGENT_POOL_SIZE,
} from '../../systems/freeagency';
import { SQUAD_CAP } from '../../config';
import { TRAINING_KIT, PORTRAIT_W, PORTRAIT_H, PORTRAIT_SCALE, portraitDataUrl } from '../../art/portrait';
import type { Kit } from '../../art/match/kit';

// ── Shared screen styling ───────────────────────────────────────────────────
// Injected once alongside the base kit CSS. Card/stat-bar/screen classes used by
// both the recruit and squad screens.

const SCREEN_STYLE_ID = 'nrl-wu9-styles';

export function ensureScreenStyles(): void {
  ensureStyles();
  if (document.getElementById(SCREEN_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SCREEN_STYLE_ID;
  style.textContent = SCREEN_CSS;
  document.head.appendChild(style);
}

const SCREEN_CSS = `
/* Position/insets come from .nrl-screen-region (ui/dom.ts openScreen): the
   screen sits between the HUD strip and the nav bar (GitHub #14). */
.nrl-screen {
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 20, 0.7);
  padding: 0.5rem;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}
.nrl-screen-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex: 0 0 auto;
}
.nrl-screen-title {
  font-weight: bold;
  font-size: clamp(0.9rem, 4vw, 1.3rem);
  color: #f4d03f;
  text-shadow: 2px 2px 0 #000;
  flex: 1 1 auto;
}
.nrl-screen-sub {
  font-size: clamp(0.65rem, 2.5vw, 0.85rem);
  color: #e8e0c8;
  margin-bottom: 0.4rem;
  flex: 0 0 auto;
}
.nrl-screen-body {
  flex: 1 1 auto;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.5rem;
  align-content: start;
  padding-bottom: 0.5rem;
}
.nrl-screen-empty {
  color: #e8e0c8;
  padding: 1rem;
  text-align: center;
}
.nrl-card { padding: 0.5rem 0.6rem; }
.nrl-card-top {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
/* Pixel portrait: integer CSS scale + pixelated so every source pixel stays hard-edged. */
.nrl-portrait {
  flex: 0 0 auto;
  width: ${PORTRAIT_W * PORTRAIT_SCALE}px;
  height: ${PORTRAIT_H * PORTRAIT_SCALE}px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.nrl-card-id { flex: 1 1 auto; min-width: 0; }
.nrl-card-head {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}
.nrl-card-name {
  font-weight: bold;
  font-size: clamp(0.8rem, 3vw, 1rem);
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nrl-card-ovr {
  font-weight: bold;
  background: #1a1a2e;
  color: #f4d03f;
  border: 2px solid #000;
  padding: 0.05rem 0.35rem;
  min-width: 2.2rem;
  text-align: center;
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
.nrl-card-cost {
  font-size: clamp(0.62rem, 2.4vw, 0.78rem);
  margin-bottom: 0.4rem;
}
.nrl-card-actions { display: flex; gap: 0.4rem; }
.nrl-card-actions .nrl-btn { flex: 1 1 auto; }
.nrl-btn-danger { background: #e06666; }
.nrl-btn-danger:hover:not(:disabled) { background: #ea8a8a; }
.nrl-sort-active { background: #7ec850; }
`;

// ── Formatting helpers ──────────────────────────────────────────────────────

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`;

/** Human label for a position (title-cased, hyphens kept). */
function positionLabel(pos: string): string {
  return pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const STAT_LABELS: readonly [keyof PlayerStats, string][] = [
  ['speed', 'SPD'],
  ['strength', 'STR'],
  ['stamina', 'STA'],
  ['skill', 'SKL'],
  ['footyIQ', 'IQ'],
];

/** Badge label + tooltip for a levelled trait (BAK-208 §3). Traits with a downside render in a warning tint. */
export function traitBadge(t: TraitInstance): { label: string; tip: string; bad: boolean } {
  const def = TRAITS[t.id];
  return { label: `${def.short} ${ROMAN[t.level]}`, tip: `${traitLabel(t)}: ${def.blurb}`, bad: def.bad ?? false };
}

// ── Shared PlayerCard ───────────────────────────────────────────────────────

export interface PlayerCardOpts {
  /** Optional action button rendered in the card footer. */
  action?: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean };
  /** Show injury "OUT xw" badge when injuredWeeks > 0 (squad screen). */
  showInjury?: boolean;
  /** Kit the portrait wears: club kit on the squad, TRAINING_KIT by default. */
  kit?: Kit;
}

/**
 * Shared pixel PlayerCard used by both the recruit and squad screens. Shows a
 * pixel portrait, name, position, age, overall rating, the 5 stat bars, weekly
 * wage, and (via opts) an action button and/or injury badge.
 */
export function PlayerCard(p: Player, opts: PlayerCardOpts = {}): HTMLElement {
  const ovr = overallRating(p);

  const head = el(
    'div',
    { class: 'nrl-card-head' },
    el('span', { class: 'nrl-card-name', text: p.name }),
    el('span', { class: 'nrl-card-ovr', text: String(ovr), attrs: { title: 'Overall rating' } }),
  );

  const metaChildren: (Node | string)[] = [
    el('span', { class: 'nrl-badge', text: positionLabel(p.position) }),
    el('span', { text: `Age ${p.age}` }),
  ];
  if (opts.showInjury && p.injuredWeeks > 0) {
    metaChildren.push(el('span', { class: 'nrl-badge nrl-badge-out', text: `OUT ${p.injuredWeeks}w` }));
  }
  for (const t of p.traits) {
    if (!(t.id in TRAITS)) continue;
    const b = traitBadge(t);
    metaChildren.push(
      el('span', {
        class: `nrl-badge ${b.bad ? 'nrl-badge-trait-bad' : 'nrl-badge-trait'}`,
        text: b.label,
        attrs: { title: b.tip },
      }),
    );
  }
  const meta = el('div', { class: 'nrl-card-meta' }, ...metaChildren);

  const bars = el(
    'div',
    { class: 'nrl-statbars' },
    ...STAT_LABELS.map(([key, label]) => {
      const val = p.stats[key];
      const fill = el('div', { class: 'nrl-statfill' });
      fill.style.width = `${Math.max(0, Math.min(100, val))}%`;
      return el(
        'div',
        { class: 'nrl-statrow' },
        el('span', { text: label }),
        el('div', { class: 'nrl-stattrack' }, fill),
        el('span', { text: String(val) }),
      );
    }),
  );

  const cost = el('div', { class: 'nrl-card-cost', text: `Wage ${money(p.wage)}/wk` });

  // Keyed on the squad id, the same key MatchScene uses, so the face matches on the pitch.
  const portrait = el('img', {
    class: 'nrl-portrait',
    attrs: {
      src: portraitDataUrl(p.id, opts.kit ?? TRAINING_KIT),
      alt: '',
      width: String(PORTRAIT_W * PORTRAIT_SCALE),
      height: String(PORTRAIT_H * PORTRAIT_SCALE),
    },
  });
  const top = el('div', { class: 'nrl-card-top' }, portrait, el('div', { class: 'nrl-card-id' }, head, meta));

  const children: HTMLElement[] = [top, bars, cost];

  if (opts.action) {
    const cls = opts.action.danger ? 'nrl-btn-danger' : undefined;
    const btn = button(opts.action.label, opts.action.onClick, cls ? { class: cls } : {});
    if (opts.action.disabled) btn.disabled = true;
    children.push(el('div', { class: 'nrl-card-actions' }, btn));
  }

  return panel({ class: 'nrl-card' }, ...children);
}

// ── Recruit screen ──────────────────────────────────────────────────────────

let unsub: (() => void) | null = null;

/** Teardown run by the shared screen slot whenever this screen closes. */
function onRecruitClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/**
 * Open the recruit / free-agency screen. Renders the current freeAgents as
 * PlayerCards, each with a Sign button that calls signPlayer. The Sign button is
 * disabled when the squad is at SQUAD_CAP or the fee is unaffordable; on a failed
 * sign the reason is surfaced via a 'ui:notify' danger toast. Re-renders on every
 * 'state:changed' so signings drop out of the list live. Idempotent — reopening
 * replaces the existing instance.
 */
export function openRecruitScreen(): void {
  ensureScreenStyles();

  const body = el('div', { class: 'nrl-screen-body' });

  const render = (): void => {
    body.replaceChildren();
    const s = getState();
    if (s.freeAgents.length === 0) {
      body.appendChild(el('div', { class: 'nrl-screen-empty', text: 'No free agents available. Check back after the next scouting cycle.' }));
      return;
    }
    for (const agent of s.freeAgents) {
      const fee = signingFee(s, agent);
      const full = s.squad.length >= SQUAD_CAP;
      const broke = s.money < fee;
      const disabled = full || broke;
      const label = full ? 'SQUAD FULL' : broke ? 'CANT AFFORD' : `SIGN ${money(fee)}`;
      const card = PlayerCard(agent, {
        // Free agents wear a neutral training top (TRAINING_KIT, the default).
        action: {
          label,
          disabled,
          onClick: () => {
            const res = signPlayer(getState(), agent.id);
            if (!res.ok) {
              bus.emit('ui:notify', { text: signFailureText(res.reason), kind: 'danger' });
            }
          },
        },
      });
      // Signing fee note under the wage line: a transfer-style fee by rating and age (#146).
      const feeNote = el('div', { class: 'nrl-card-cost', text: `Signing fee ${money(fee)} (${signingFeeBasis(s, agent)})` });
      card.insertBefore(feeNote, card.querySelector('.nrl-card-actions'));
      body.appendChild(card);
    }
  };

  const head = el(
    'div',
    { class: 'nrl-screen-head' },
    el('span', { class: 'nrl-screen-title', text: 'Free Agency' }),
    button('CLOSE', closeScreen),
  );
  const sub = el('div', {
    class: 'nrl-screen-sub',
    text: `Pool of ${FREE_AGENT_POOL_SIZE} refreshes every scouting cycle — unsigned agents are replaced.`,
  });

  const screen = el('div', { class: 'nrl-screen' }, head, sub, body);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onRecruitClosed);
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
