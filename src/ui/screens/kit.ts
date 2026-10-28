// src/ui/screens/kit.ts — kit designer (GitHub #79): pattern and trim for the
// home kit, plus an alternate strip, with a live preview of the match sprite and
// the card portrait. Opened from the Squad screen while FEATURES.cosmeticKits is
// on. Purely cosmetic: a design only changes what kitFromColors draws.
//
// The option lists and draft edits are pure and unit-tested; the DOM part only
// renders them and saves the draft to GameState.kit. The club's name is edited
// here too (#398), saved on its own: clubName and the club's league entry. No Phaser.
import { getState, setState, type GameState } from '../../core/state';
import {
  CLASH_DISTANCE, KIT_PATTERNS, colorDistance, defaultKitDesign, kitFromDesign, setKitDesign,
  type KitDesign, type KitPattern,
} from '../../art/match/kit';
import { hexToInt } from '../../art/pixel';
import { LOOKS, drawPlayerFrame, lookForPlayer } from '../../art/match/players';
import { buildPortrait, encodeCanvas } from '../../art/portrait';
import { overallRating } from '../../data/player';
import {
  DEFAULT_PLAYER_COLORS, FEATURES, PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS, colorsContrast,
} from '../../config';
import { PLAYER_ID } from '../../systems/fixtures';
import { bus } from '../../core/events';
import { button, closeScreen, el, openModal, segmented } from '../dom';
import { renameClub } from '../../systems/rename';
import { save as saveGame } from '../../core/save';
import { nameField } from '../rename';

export const PATTERN_LABELS: Record<KitPattern, string> = {
  plain: 'Plain', v: 'V', hoops: 'Hoops', sleeves: 'Sleeves', stripes: 'Stripes',
};

/** Every colour the designer offers (the curated club palette). */
export const KIT_COLORS: readonly string[] = [...new Set([...PLAYER_PRIMARY_COLORS, ...PLAYER_SECONDARY_COLORS])];

/** Trims that read against a jersey colour. */
export function trimOptions(jersey: string): string[] {
  return KIT_COLORS.filter((c) => colorsContrast(jersey, c));
}

/** Alternate jerseys far enough from the home jersey to fix a clash. */
export function altJerseyOptions(primary: string): string[] {
  return KIT_COLORS.filter((c) => colorDistance(hexToInt(primary), hexToInt(c)) >= CLASH_DISTANCE * 1.5);
}

/** The player's club colours (primary, secondary). */
export function clubColors(state: GameState): [string, string] {
  return state.league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS;
}

/** The design the designer opens on: the saved one, else the club's current look. */
export function startingDesign(state: GameState): KitDesign {
  return state.kit ?? defaultKitDesign(clubColors(state), PLAYER_ID);
}

/** Change the alternate jersey, keeping its trim readable. */
export function withAltJersey(d: KitDesign, jersey: string): KitDesign {
  const trim = colorsContrast(jersey, d.alt.trim) ? d.alt.trim : trimOptions(jersey)[0] ?? d.alt.trim;
  return { ...d, alt: { ...d.alt, jersey, trim } };
}

/** Is every colour in the design readable (trims contrast with their jerseys)? */
export function isValidDesign(d: KitDesign, primary: string): boolean {
  return KIT_PATTERNS.includes(d.pattern) && KIT_PATTERNS.includes(d.alt.pattern)
    && colorsContrast(primary, d.trim) && colorsContrast(d.alt.jersey, d.alt.trim);
}

/** Put the player's design (if the flag is on) into the kit registry. Call on load and state change. */
export function syncKitDesign(state: GameState): void {
  setKitDesign(PLAYER_ID, FEATURES.cosmeticKits ? state.kit : null);
}

// ── DOM ────────────────────────────────────────────────────────────────────────

function spriteImg(url: string, cls: string, alt: string): HTMLImageElement {
  return el('img', { class: cls, attrs: { src: url, alt } });
}

/** Open the designer as a screen. Saving writes GameState.kit (and the registry follows). */
export function openKitDesigner(): HTMLElement {
  const state = getState();
  const [primary] = clubColors(state);
  let draft = startingDesign(state);
  const star = [...state.squad].sort((a, b) => overallRating(b) - overallRating(a))[0];
  const look = lookForPlayer(star?.id ?? 'kit');

  const preview = el('div', { class: 'nrl-kit-preview' });
  const controls = el('div', { class: 'nrl-kit-controls' });
  // The club's name (#398): its own Save, kept across the designer's re-renders.
  let clubDraft = state.clubName;
  const clubNameRow = (): HTMLElement => nameField({
    value: clubDraft,
    label: 'Club name',
    attr: 'data-club-rename',
    saveLabel: 'Rename',
    inline: true,
    focus: false,
    onDraft: (text) => { clubDraft = text; },
    onSave: (name) => {
      const res = renameClub(getState(), PLAYER_ID, name);
      if (!res.ok) return res.why;
      clubDraft = name;
      if (res.patch) {
        setState(res.patch);
        saveGame(getState());
        bus.emit('ui:notify', { text: `The club is now ${name}.`, kind: 'success' });
      }
      render();
      return null;
    },
  });

  const renderPreview = (): void => {
    const home = kitFromDesign(primary, draft);
    const alt = kitFromDesign(primary, draft, true);
    const lk = LOOKS[look] ?? LOOKS[0]!;
    preview.replaceChildren(
      el('figure', {}, spriteImg(encodeCanvas(drawPlayerFrame(home, lk, 'idle', 0)), 'nrl-kit-sprite', 'Home kit'), el('figcaption', { text: 'Home' })),
      el('figure', {}, spriteImg(encodeCanvas(drawPlayerFrame(alt, lk, 'idle', 0)), 'nrl-kit-sprite', 'Alternate kit'), el('figcaption', { text: 'Alternate' })),
      el('figure', {}, spriteImg(encodeCanvas(buildPortrait(look, home)), 'nrl-kit-portrait', 'Card portrait'), el('figcaption', { text: 'Card' })),
    );
  };

  const patternRow = (current: KitPattern, pick: (p: KitPattern) => void, attr: string): HTMLElement => {
    const seg = segmented(KIT_PATTERNS.map((p) => ({ id: p, label: PATTERN_LABELS[p] })), current, (p) => { pick(p); render(); }, { label: 'Pattern' });
    for (const [p, b] of seg.buttons) {
      b.classList.add('nrl-kit-pattern');
      b.setAttribute(attr, p);
    }
    return el('div', { class: 'nrl-kit-row' }, seg.el);
  };

  const swatchRow = (options: readonly string[], current: string, pick: (c: string) => void, attr: string): HTMLElement => {
    const row = el('div', { class: 'nrl-kit-row' });
    for (const c of options) {
      const b = el('button', {
        class: 'nrl-kit-swatch',
        attrs: { type: 'button', [attr]: c, 'aria-label': c, 'aria-pressed': String(c === current), style: `background:${c}` },
        onClick: () => { pick(c); render(); },
      });
      row.append(b);
    }
    return row;
  };

  const render = (): void => {
    controls.replaceChildren(
      el('h3', { text: 'Club name' }),
      clubNameRow(),
      el('h3', { text: 'Home kit' }),
      el('div', { class: 'nrl-kit-label', text: 'Pattern' }),
      patternRow(draft.pattern, (p) => { draft = { ...draft, pattern: p }; }, 'data-kit-pattern'),
      el('div', { class: 'nrl-kit-label', text: 'Trim' }),
      swatchRow(trimOptions(primary), draft.trim, (c) => { draft = { ...draft, trim: c }; }, 'data-kit-trim'),
      el('h3', { text: 'Alternate strip (worn away when colours clash)' }),
      el('div', { class: 'nrl-kit-label', text: 'Jersey' }),
      swatchRow(altJerseyOptions(primary), draft.alt.jersey, (c) => { draft = withAltJersey(draft, c); }, 'data-kit-alt-jersey'),
      el('div', { class: 'nrl-kit-label', text: 'Trim' }),
      swatchRow(trimOptions(draft.alt.jersey), draft.alt.trim, (c) => { draft = { ...draft, alt: { ...draft.alt, trim: c } }; }, 'data-kit-alt-trim'),
      el('div', { class: 'nrl-kit-label', text: 'Pattern' }),
      patternRow(draft.alt.pattern, (p) => { draft = { ...draft, alt: { ...draft.alt, pattern: p } }; }, 'data-kit-alt-pattern'),
    );
    renderPreview();
  };

  const save = button('Save kit', () => {
    if (!isValidDesign(draft, primary)) return;
    setState({ kit: draft });
    bus.emit('ui:notify', { text: 'New kit saved. It will be worn from the next match.', kind: 'success' });
    closeScreen();
  }, { class: 'nrl-kit-save nrl-btn-primary' });
  const reset = button('Club default', () => {
    draft = defaultKitDesign(clubColors(getState()), PLAYER_ID);
    render();
  });

  // #336: the preview and Save hold still beside the controls, which scroll.
  const content = el('div', { class: 'nrl-kit' },
    el('div', { class: 'nrl-kit-head' },
      el('h2', { text: 'Kit & colours' }),
      el('p', { class: 'nrl-kit-note', text: 'Cosmetic only: kits never change how a match plays.' })),
    el('div', { class: 'nrl-kit-body' },
      el('div', { class: 'nrl-kit-side' }, preview, el('div', { class: 'nrl-kit-actions' }, reset, save)),
      controls),
  );
  render();
  return openModal(content, { class: 'nrl-kit-modal', screen: true, key: 'kit' });
}
