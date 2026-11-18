// src/ui/wordmark.ts — the game's wordmark and its parent-brand line (docs/specs/ui-supercooked.md
// §2): text, not a logo. The title text in Archivo Black with its last word in the accent (BIG
// white, COACH orange), and "A SUPERCOOKED GAME" with COOKED in the accent. No imports but a
// type: the title and the rotate card build it before the rest of the UI is loaded. The colour
// and the type are each caller's stylesheet's (.nrl-wordmark-accent).

import type { Brand } from '../brand';

/**
 * The brand's title text split for the wordmark: everything but its last word, and the
 * last word (drawn in the accent). "BIG COACH" → ["BIG ", "COACH"]. Pure.
 */
export function wordmarkParts(titleText: string): [string, string] {
  const at = titleText.trimEnd().lastIndexOf(' ');
  return at < 0 ? ['', titleText] : [titleText.slice(0, at + 1), titleText.slice(at + 1)];
}

/**
 * The parent brand split for its line: the lead and the trailing capitals in the accent.
 * "SuperCOOKED" → ["Super", "COOKED"]. A name with no trailing capitals is all lead. Pure.
 */
export function parentBrandParts(name: string): [string, string] {
  const m = /^(.*?)([A-Z]{2,})$/.exec(name);
  return m && m[1] ? [m[1], m[2]!] : [name, ''];
}

/** A span for `text`, made with createElement / textContent / appendChild only (the title's stub DOM). */
function part(tag: 'span' | 'b', cls: string, text: string): HTMLElement {
  const n = document.createElement(tag);
  n.setAttribute('class', cls);
  n.textContent = text;
  return n;
}

/**
 * Fill `into` with the wordmark: the title text in Archivo Black, its last word in the accent
 * (BIG white, COACH orange). Text, not a logo; the whole reads as one name to a screen reader.
 */
export function fillWordmark(into: HTMLElement, brand: Pick<Brand, 'titleText'>): HTMLElement {
  const [lead, last] = wordmarkParts(brand.titleText);
  if (lead) into.appendChild(part('span', 'nrl-wordmark-lead', lead));
  into.appendChild(part('span', 'nrl-wordmark-accent', last));
  return into;
}

/** Fill `into` with the parent line, "A SUPERCOOKED GAME": SUPER bold, COOKED in the accent. */
export function fillParentLine(into: HTMLElement, brand: Pick<Brand, 'parentBrand'>): HTMLElement {
  const [lead, accent] = parentBrandParts(brand.parentBrand.name);
  into.appendChild(part('span', 'nrl-parent-a', 'a '));
  into.appendChild(part('b', 'nrl-parent-lead', lead));
  if (accent) into.appendChild(part('span', 'nrl-wordmark-accent', accent));
  into.appendChild(part('span', 'nrl-parent-z', ' game'));
  return into;
}

