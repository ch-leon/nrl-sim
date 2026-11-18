// src/ui/parts.ts — the SuperCOOKED shared parts (docs/specs/ui-supercooked.md §4; mockups
// docs/design/supercooked/00-shared-parts.html and 01-more-shared-parts.html), built once and
// used by every screen as it is reworked. Each takes the values to show, never game state:
// the caller works out the stars (starsForOverall, potentialStars), the fitness (fitnessPct),
// the portrait (portraitDataUrl) and the roles (sideRoles), as the screens do today.
//
// The buttons, segmented control, screen header, toasts, placement bar, rotate card and dock
// are the existing helpers in dom.ts, toasts.ts, placementBar.ts, orientation.ts and nav.ts /
// hud.ts, restyled by the stylesheet below and dom.ts's. The pill and dot colours are the
// tokens' (tokens.ts); a pill is its colour at 12% on the background with a 45% edge.

import { STAT_MAX } from '../config';
import { button, closeModal, el, ensureStyles, openModal } from './dom';

// ── Status: a dot and a word, never the colour alone (§3.7) ─────────────────────────────

/** What a status colour means: green good, amber watch, red bad, grey neither. */
export type Tone = 'pos' | 'neg' | 'alert' | 'muted';

/** A status pill: a dot and a word, tinted with its tone (fitness, morale, injury). */
export function statusPill(word: string, tone: Tone): HTMLElement {
  ensurePartsStyles();
  return el('span', { class: 'nrl-pill', attrs: { 'data-tone': tone } },
    el('span', { class: 'nrl-pill-dot', attrs: { 'aria-hidden': 'true' } }), word);
}

/** A bare 8px status dot, for a card or a table cell that says the word elsewhere (its label). */
export function statusDot(tone: Tone, label: string): HTMLElement {
  ensurePartsStyles();
  return el('span', { class: 'nrl-dot', attrs: { 'data-tone': tone, role: 'img', 'aria-label': label, title: label } });
}

/** Fitness's tone, on the Squad table's bands (recruit.ts fitColour): 85+ good, 65+ watch, else bad. */
export function fitnessTone(pct: number): Tone {
  return pct >= 85 ? 'pos' : pct >= 65 ? 'neg' : 'alert';
}

// ── Stars: five, in half steps, no number (§3.5) ───────────────────────────────────────

/** Each of the five stars' fill, 0, 0.5 or 1, for a rating in half steps (clamped to 0–5). Pure. */
export function starFills(stars: number): number[] {
  const half = Math.round(Math.max(0, Math.min(5, stars)) * 2) / 2;
  return [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(1, half - i)));
}

/** The rating said aloud: "3 and a half stars", "1 star", "No stars". Pure. */
export function starsLabel(stars: number): string {
  const half = Math.round(Math.max(0, Math.min(5, stars)) * 2) / 2;
  const whole = Math.floor(half);
  const hasHalf = half !== whole;
  if (whole === 0) return hasHalf ? 'Half a star' : 'No stars';
  return `${whole}${hasHalf ? ' and a half' : ''} star${whole === 1 && !hasHalf ? '' : 's'}`;
}

/** Five ★, filled white, empty --nrl-star-empty, a half star half filled. Sized by `size` (px), or the font. */
export function starsEl(stars: number, opts: { size?: number; class?: string } = {}): HTMLElement {
  ensurePartsStyles();
  const row = el('span', {
    class: opts.class ? `nrl-stars ${opts.class}` : 'nrl-stars',
    attrs: { role: 'img', 'aria-label': starsLabel(stars), title: starsLabel(stars), 'data-stars': String(stars) },
  });
  if (opts.size) row.style.fontSize = `${opts.size / 16}rem`;
  for (const fill of starFills(stars)) {
    const star = el('span', { class: 'nrl-star', attrs: { 'aria-hidden': 'true' } }, '★');
    if (fill > 0) {
      const on = el('b', { text: '★' });
      on.style.width = `${fill * 100}%`;
      star.append(on);
    }
    row.append(star);
  }
  return row;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────────────

/** One of a player's four shown stats (shownStats): its value and its ceiling (p.ceilings). */
export interface StatTileIn {
  label: string;
  value: number;
  /** The most the stat can grow to; the faint bar. Omitted: no ceiling shown. */
  ceiling?: number;
  /** This week's training focus: an accent edge, label and bar. */
  focus?: boolean;
}

/** The share of a bar `n` fills, 0–100 (%), out of STAT_MAX. Pure. */
export function barPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round((n / STAT_MAX) * 100)));
}

/** A stat tile: the label, the number in Archivo Black, a 6px bar (fill = now, faint = ceiling). */
export function statTile(s: StatTileIn): HTMLElement {
  ensurePartsStyles();
  const track = el('span', { class: 'nrl-stat-bar', attrs: { 'aria-hidden': 'true' } });
  if (s.ceiling !== undefined) {
    const cap = el('span', { class: 'nrl-stat-cap' });
    cap.style.width = `${barPct(s.ceiling)}%`;
    track.append(cap);
  }
  const fill = el('span', { class: 'nrl-stat-fill' });
  fill.style.width = `${barPct(s.value)}%`;
  track.append(fill);
  const spoken = s.ceiling !== undefined ? `${s.label} ${Math.round(s.value)}, can reach ${Math.round(s.ceiling)}` : `${s.label} ${Math.round(s.value)}`;
  const tile = el('div', { class: 'nrl-stat-tile', attrs: { role: 'group', 'aria-label': s.focus ? `${spoken}, training focus` : spoken } },
    el('span', { class: 'nrl-stat-label', text: s.label }),
    el('span', { class: 'nrl-stat-value nrl-display', text: String(Math.round(s.value)) }),
    track);
  if (s.focus) tile.setAttribute('data-focus', '');
  return tile;
}

// ── Player card ───────────────────────────────────────────────────────────────────────

/** What a player card shows: all of it worked out by the caller. */
export interface PlayerCardIn {
  /** The portrait's data URL (portraitDataUrl), or '' for an empty slot. */
  portrait: string;
  /** The name as the card shows it (the surname, or "J. Mere"). */
  name: string;
  /** The rating in half stars (starsForOverall). */
  stars: number;
  /** The position code ("FB", "5/8"). */
  position: string;
  /** Fitness: its tone and its word for the dot's spoken label ("Fit 88%", "Injured, out 3 weeks"). */
  fitness: { tone: Tone; word: string };
  captain?: boolean;
  kicker?: boolean;
  onClick?: () => void;
}

/** A player card (34px portrait slot, surname, stars, position, fitness dot, C / K tag): a button. */
export function playerCard(p: PlayerCardIn): HTMLButtonElement {
  ensurePartsStyles();
  const face = el('span', { class: 'nrl-pcard-face' });
  if (p.portrait) face.append(el('img', { attrs: { src: p.portrait, alt: '', width: '34', height: '38' } }));
  const tags = [...(p.captain ? ['C'] : []), ...(p.kicker ? ['K'] : [])];
  const card = el('button', { class: 'nrl-pcard', attrs: { type: 'button' } },
    face,
    ...(tags.length ? [el('span', { class: 'nrl-pcard-tag', text: tags.join(' '), attrs: { 'aria-hidden': 'true' } })] : []),
    el('span', { class: 'nrl-pcard-body' },
      el('span', { class: 'nrl-pcard-name nrl-name-wrap', text: p.name }),
      el('span', { class: 'nrl-pcard-foot' }, starsEl(p.stars, { size: 11 }), el('span', { class: 'nrl-pcard-pos', text: p.position }))),
    el('span', { class: 'nrl-pcard-fit', attrs: { 'data-tone': p.fitness.tone, 'aria-hidden': 'true' } }));
  const roles = [...(p.captain ? ['captain'] : []), ...(p.kicker ? ['goal-kicker'] : [])];
  card.setAttribute('aria-label', [p.name, p.position, starsLabel(p.stars), p.fitness.word, ...roles].join(', '));
  if (p.onClick) card.addEventListener('click', p.onClick);
  return card;
}

// ── Disabled, with why ────────────────────────────────────────────────────────────────

/** The amber line under a disabled control that says why ("Need $18k", §3.2). */
export function whyLine(text: string): HTMLElement {
  return el('span', { class: 'nrl-why', text });
}

/** Disable `b` and say why: in its title and spoken label, and as `line` (a whyLine) when given. */
export function disableWithReason(b: HTMLButtonElement, why: string, line?: HTMLElement): void {
  b.disabled = true;
  b.title = why;
  b.setAttribute('aria-label', `${b.textContent ?? ''}: ${why}`);
  if (line) line.textContent = why;
}

// ── Confirm dialog ────────────────────────────────────────────────────────────────────

/** A confirm dialog's words and what its buttons do. */
export interface ConfirmIn {
  title: string;
  /** One line under the title. */
  line: string;
  /** The left button (outline): "Cancel", "Advance anyway". */
  cancel: string;
  /** The right button: the primary, or with `destructive` an amber one ("Really release?"). */
  confirm: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * A confirm dialog (01-more-shared-parts): an Archivo title, one line, two buttons with the
 * primary on the right. Opened as a dialog (dom.ts openModal); a tap on the dim cancels.
 */
export function confirmDialog(c: ConfirmIn): HTMLElement {
  ensurePartsStyles();
  let answered = false;
  const answer = (fn?: () => void): void => {
    if (answered) return;
    answered = true;
    closeModal();
    fn?.();
  };
  const no = button(c.cancel, () => answer(c.onCancel), { class: 'nrl-btn-outline' });
  const yes = button(c.confirm, () => answer(c.onConfirm), { class: c.destructive ? 'nrl-btn-danger' : 'nrl-btn-primary' });
  no.setAttribute('data-confirm', 'no');
  yes.setAttribute('data-confirm', 'yes');
  const body = el('div', { class: 'nrl-confirm', attrs: { role: 'alertdialog', 'aria-label': c.title } },
    el('h2', { class: 'nrl-confirm-title', text: c.title }),
    el('p', { class: 'nrl-confirm-line', text: c.line }),
    el('div', { class: 'nrl-confirm-actions' }, no, yes));
  return openModal(body, { class: 'nrl-confirm-modal', onRemove: () => { if (!answered) { answered = true; c.onCancel?.(); } } });
}

// ── Empty state, locked tile ──────────────────────────────────────────────────────────

/** An empty list's place: a title in caps and one line ("No news yet"). */
export function emptyState(title: string, line: string): HTMLElement {
  return el('div', { class: 'nrl-empty' },
    el('span', { class: 'nrl-empty-title', text: title }),
    el('span', { class: 'nrl-empty-line', text: line }));
}

/** A tile that is not open yet: its name and, in amber, what opens it. Stays visible (§3.2). */
export function lockedTile(name: string, why: string): HTMLElement {
  ensurePartsStyles();
  return el('div', { class: 'nrl-locked', attrs: { 'aria-disabled': 'true', 'aria-label': `${name}: ${why}` } },
    el('span', { class: 'nrl-locked-name', text: name }),
    el('span', { class: 'nrl-locked-why', text: why }));
}

// ── The wordmark: src/ui/wordmark.ts (no imports, so the title and the rotate card can use it at boot) ──
export { fillParentLine, fillWordmark, parentBrandParts, wordmarkParts } from './wordmark';

// ── Stylesheet ────────────────────────────────────────────────────────────────────────

const STYLE_ID = 'nrl-parts-styles';

/** The parts' stylesheet (exported for tests). Sizes in rem, so Settings › Text size scales them (#371). */
export const PARTS_CSS = `
/* Status pill and dot (00: the colour at 12% on the background, a 45% edge, always with a word). */
.nrl-pill { --nrl-tone: var(--nrl-muted); --nrl-tone-rgb: 143, 152, 171; display: inline-flex; align-items: center; gap: 6px; min-height: 1.75rem; padding: 0 11px; box-sizing: border-box; border-radius: 999px; background: rgba(var(--nrl-tone-rgb), 0.12); box-shadow: inset 0 0 0 1px rgba(var(--nrl-tone-rgb), 0.45); color: var(--nrl-tone); font-family: var(--nrl-f-body); font-size: 0.8125rem; font-weight: 600; white-space: nowrap; }
.nrl-pill-dot, .nrl-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nrl-tone); flex: 0 0 auto; display: inline-block; }
.nrl-dot { --nrl-tone: var(--nrl-muted); }
:is(.nrl-pill, .nrl-dot, .nrl-pcard-fit)[data-tone="pos"] { --nrl-tone: var(--nrl-pos); --nrl-tone-rgb: 20, 195, 142; }
:is(.nrl-pill, .nrl-dot, .nrl-pcard-fit)[data-tone="neg"] { --nrl-tone: var(--nrl-neg); --nrl-tone-rgb: 255, 138, 61; }
:is(.nrl-pill, .nrl-dot, .nrl-pcard-fit)[data-tone="alert"] { --nrl-tone: var(--nrl-alert); --nrl-tone-rgb: 255, 59, 31; }
/* Red words on navy read lighter than the dot (00's "Unhappy"). */
.nrl-pill[data-tone="alert"] { color: #ff6a52; }

/* Stars: five, half steps; the filled part is a white star clipped over the empty one. */
.nrl-stars { display: inline-flex; line-height: 1; white-space: nowrap; font-family: var(--nrl-f-body); }
.nrl-star { position: relative; color: var(--nrl-star-empty); }
.nrl-star > b { position: absolute; left: 0; top: 0; overflow: hidden; color: var(--nrl-text); font-weight: inherit; }

/* Stat tile (00): panel, 14 radius, the number in Archivo Black, a 6px bar. */
.nrl-stat-tile { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 12px; box-sizing: border-box; border-radius: 14px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); }
.nrl-stat-label { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-text-2); }
.nrl-stat-value { font-size: 2.5rem; line-height: 0.9; }
.nrl-stat-bar { position: relative; display: block; height: 6px; border-radius: 3px; background: var(--nrl-raised); }
.nrl-stat-cap, .nrl-stat-fill { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 3px; }
.nrl-stat-cap { background: rgba(255, 255, 255, 0.16); }
.nrl-stat-fill { background: var(--nrl-text); }
.nrl-stat-tile[data-focus] { box-shadow: inset 0 0 0 1px var(--nrl-accent); }
.nrl-stat-tile[data-focus] .nrl-stat-label { color: var(--nrl-accent); }
.nrl-stat-tile[data-focus] .nrl-stat-fill { background: var(--nrl-accent); }

/* Player card (00): 52 tall, a 34px portrait slot, the name in Oswald, stars and position, the fitness dot. */
.nrl-pcard { pointer-events: auto; cursor: pointer; position: relative; display: flex; align-items: stretch; width: 8.25rem; min-height: 52px; padding: 0; margin: 0; border-radius: 10px; border: 0; box-shadow: inset 0 0 0 1px var(--nrl-line-2); background: var(--nrl-navy); color: var(--nrl-text); overflow: hidden; text-align: left; font: inherit; box-sizing: border-box; }
.nrl-pcard:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-pcard:active { transform: scale(var(--nrl-press)); transition: transform var(--nrl-dur-press) var(--nrl-ease-out); }
.nrl-pcard-face { flex: 0 0 34px; background: var(--nrl-raised); display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
.nrl-pcard-face > img { width: 34px; height: 38px; image-rendering: pixelated; }
.nrl-pcard-tag { position: absolute; top: 0; left: 27px; padding: 3px 4px; border-radius: 0 0 4px 4px; background: var(--nrl-accent); color: var(--nrl-on-accent); font-family: var(--nrl-f-display); font-size: 0.5625rem; line-height: 1; }
.nrl-pcard-body { flex: 1 1 auto; min-width: 0; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between; gap: 2px; }
.nrl-pcard-name { padding-right: 10px; font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.15; }
.nrl-pcard-foot { display: flex; justify-content: space-between; align-items: center; gap: 4px; }
.nrl-pcard-pos { font-family: var(--nrl-f-num); font-size: 0.625rem; color: var(--nrl-muted); }
.nrl-pcard-fit { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--nrl-tone, var(--nrl-muted)); }

/* Confirm dialog (01): Archivo title, one line, two buttons, the primary on the right. */
.nrl-confirm { display: flex; flex-direction: column; gap: 8px; max-width: 22rem; }
.nrl-modal h2.nrl-confirm-title { margin: 0; padding-right: 0; }
.nrl-confirm-line { margin: 0; font-size: 0.8125rem; line-height: 1.4; color: var(--nrl-text-2); }
.nrl-confirm-actions { display: flex; gap: 8px; margin-top: 4px; }
.nrl-confirm-actions > .nrl-btn { flex: 1 1 0; min-width: 0; white-space: normal; }

/* Locked tile (01): stays visible at 55%, and says in amber what opens it. */
.nrl-locked { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-height: 52px; padding: 6px 12px; box-sizing: border-box; border-radius: 12px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); opacity: 0.55; }
.nrl-locked-name { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-locked-why { font-size: 0.6875rem; font-weight: 600; color: var(--nrl-neg); }

/* The wordmark and the parent line. */
.nrl-wordmark-accent { color: var(--nrl-accent); }
`;

/** Inject the parts' stylesheet once (after dom.ts's, whose tokens it uses). */
export function ensurePartsStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  ensureStyles();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PARTS_CSS;
  document.head.appendChild(style);
}
