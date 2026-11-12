// tests/ui/pressHover.test.ts — touch feedback (#604): hover only for a mouse, a press under
// the finger on :active, no browser tap box, no long-press selection on a control. What a
// browser does with these (fills, scale, user-select) is measured in the running game; the
// vitest env has no DOM, so these pin the CSS text, as motionTokens.test.ts does.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CSS, MOTION_CSS } from '../../src/ui/dom';
import { OVERLAY_CSS } from '../../src/ui/screens/matchOverlay';
import { TITLE_CSS } from '../../src/ui/title';

const UI = join(__dirname, '../../src/ui');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
});
/** Every src/ui module's source without its comments: the stylesheets are template strings in them. */
const SOURCES = files(UI).map((p) => ({
  file: p.slice(UI.length + 1),
  text: readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
}));
const GATE = '@media (hover: hover) and (pointer: fine) {';

/** The end of the block whose opening brace is just before `i` (the index past its closing brace). */
function blockEnd(text: string, i: number): number {
  let depth = 1;
  let j = i;
  for (; j < text.length && depth > 0; j++) depth += text[j] === '{' ? 1 : text[j] === '}' ? -1 : 0;
  return j;
}
/** `text` with every hover-gated media block cut out. */
function ungated(text: string): string {
  let out = '';
  let from = 0;
  for (let i = text.indexOf(GATE); i >= 0; i = text.indexOf(GATE, from)) {
    out += text.slice(from, i);
    from = blockEnd(text, i + GATE.length);
  }
  return out + text.slice(from);
}
/** A selector list split at its top-level commas (not those inside :is() or :not()). */
function selectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of list) {
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    depth += c === '(' ? 1 : c === ')' ? -1 : 0;
    cur += c;
  }
  return [...out, cur.trim()];
}
/** The declarations of the rule whose selector list is exactly `selector`. */
function rule(css: string, selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

describe('hover is for a mouse (#604)', () => {
  it('every :hover in src/ui is inside a (hover: hover) and (pointer: fine) block, or beside its own resting look', () => {
    let gated = 0;
    for (const { file, text } of SOURCES) {
      gated += text.split(GATE).length - 1;
      // A selector list outside the gate that names :hover: each hovered selector must sit beside the
      // same selector at rest ("selected, selected:hover"), so a stuck hover changes nothing.
      for (const m of ungated(text).matchAll(/([^{}]*:hover[^{}]*)\{/g)) {
        const list = selectors(m[1]!.replace(/^[\s\S]*;/, ''));
        for (const sel of list.filter((s) => s.includes(':hover'))) {
          const rest = sel.replace(/:hover(:not\(:disabled\))?/, '');
          expect(list, `${file}: "${sel}" outside the hover gate`).toContain(rest);
        }
      }
    }
    expect(gated).toBeGreaterThanOrEqual(15);
  });

  it('each gated hover fill has an :active twin, so a touch gets the same fill under the finger', () => {
    for (const { file, text } of SOURCES) {
      for (const m of text.matchAll(/@media \(hover: hover\) and \(pointer: fine\) \{ ([^{]+):hover((?::not\(:disabled\))?)([^{]*)\{ background: ([^;]+);/g)) {
        const [, head, not, tail, fill] = m;
        // A hover with no :not(:disabled) may press with one: a disabled control shows no press.
        const twins = [`\n${head}:active${not}${tail}{`, `\n${head}:active:not(:disabled)${tail}{`];
        const twin = twins.find((t) => text.includes(t)) ?? twins[0]!;
        const at = text.indexOf(twin);
        expect(at, `${file}: no ${twin.trim()} beside ${head}:hover`).toBeGreaterThanOrEqual(0);
        expect(text.slice(at, text.indexOf('}', at)), `${file}: ${head}:active`).toContain(`background: ${fill};`);
      }
    }
  });
});

describe('a press under the finger (#604)', () => {
  it('.nrl-btn shrinks to --nrl-press on its hover fill, eases in and snaps back', () => {
    const press = rule(CSS, '.nrl-btn:active:not(:disabled)');
    expect(press).toContain('background: #283669;');
    expect(press).toContain('transform: scale(var(--nrl-press));');
    expect(press).toContain('transition: background-color var(--nrl-dur-press) ease, transform var(--nrl-dur-press) var(--nrl-ease-out);');
    // At rest only the fill eases, so the scale snaps back on release (a box measured after a tap is whole).
    expect(rule(CSS, '.nrl-btn')).toContain('transition: background-color var(--nrl-dur-press) ease;');
    for (const { file, text } of SOURCES) expect(text, file).not.toContain('translateY(1px)');
  });

  it('the primary takes its hover yellow; armed and selected keep their colours pressed', () => {
    expect(rule(CSS, '.nrl-btn.nrl-btn-primary:active:not(:disabled)')).toContain('background: #f7da5e');
    expect(CSS).toContain('.nrl-btn.nrl-btn-armed:active:not(:disabled) { background: var(--nrl-neg)');
    expect(CSS).toContain('.nrl-seg > .nrl-btn[aria-pressed="true"]:active:not(:disabled)');
    expect(CSS).toContain('.nrl-dock-tabs > .nrl-btn[aria-current="page"]:active:not(:disabled)');
    expect(OVERLAY_CSS).toContain('.nrl-btn.nrl-mo-tray-call[data-called]:active {');
    expect(OVERLAY_CSS).toContain('.nrl-mo-speed[aria-pressed="true"]:active:not(:disabled) {');
    // Selected comes after the plain press in the sheet and outweighs it.
    expect(CSS.indexOf('.nrl-seg > .nrl-btn[aria-pressed="true"]:active')).toBeGreaterThan(CSS.indexOf('.nrl-btn:active:not(:disabled) {'));
  });

  it('PLAY WEEK: the yellow group shrinks, its buttons only take the fill, and focus is navy inside it', () => {
    expect(rule(CSS, '.nrl-dock-play-group:has(> .nrl-dock-advance:active:not(:disabled))')).toContain('transform: scale(var(--nrl-press));');
    expect(rule(CSS, '.nrl-dock-play-group > .nrl-btn:active:not(:disabled)')).toContain('transform: none;');
    expect(rule(CSS, '.nrl-dock-play-group > .nrl-btn:focus-visible')).toBe('.nrl-dock-play-group > .nrl-btn:focus-visible { outline-color: var(--nrl-on-accent); outline-offset: -4px; ');
  });

  it('small tiles and the match controls shrink; the commentary strip keeps its centring', () => {
    for (const sel of ['.nrl-lineup-tile', '.nrl-kit-swatch', 'button.nrl-finance-contracts', 'button.nrl-club-home-row', '.nrl-mo-coach', '.nrl-mo-log-toggle', '.nrl-mo-scoreboard']) {
      expect(CSS.slice(CSS.indexOf(':is(.nrl-lineup-tile'), CSS.indexOf('):active {', CSS.indexOf(':is(.nrl-lineup-tile')))).toContain(sel);
    }
    expect(rule(OVERLAY_CSS, '.nrl-mo-strip:active')).toContain('transform: translateX(-50%) scale(var(--nrl-press));');
  });

  it('a segmented pill and the speed circle change with their label, in one frame', () => {
    expect(rule(CSS, '.nrl-seg > .nrl-btn')).toContain('transition-property: none;');
    expect(rule(CSS, '.nrl-seg > .nrl-btn:active:not(:disabled)')).toContain('transition-property: transform;');
    expect(rule(OVERLAY_CSS, '.nrl-mo-controls .nrl-btn')).toContain('transition-property: none;');
  });

  it('no separate reduced-motion rule: --nrl-press is 1 there, so a press keeps its fill and loses its scale', () => {
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce) { :root { --nrl-rise: 0px; --nrl-pop: 1; --nrl-press: 1; } }');
    for (const { file, text } of SOURCES) {
      for (const m of text.matchAll(/@media \(prefers-reduced-motion: reduce\) \{/g)) {
        expect(text.slice(m.index, blockEnd(text, m.index + m[0].length)), file).not.toContain(':active');
      }
    }
  });
});

describe('controls, not content (#604)', () => {
  it('the browser tap box goes once, for the whole UI', () => {
    expect(CSS).toContain('#ui-root, #ui-root * { -webkit-tap-highlight-color: transparent; }');
    const others = SOURCES.filter(({ file, text }) => file !== 'dom.ts' && file !== 'title.ts' && text.includes('tap-highlight'));
    expect(others.map((o) => o.file)).toEqual([]);
  });

  it('a control label is not selectable, has no callout and no double-tap zoom; fields and body text are left alone', () => {
    const sel = '#ui-root :is(button, [role="button"], summary, .nrl-dock, .nrl-seg, .nrl-toast, .nrl-ladder-rival)';
    const r = rule(CSS, sel);
    for (const d of ['user-select: none;', '-webkit-user-select: none;', '-webkit-touch-callout: none;', 'touch-action: manipulation;']) expect(r).toContain(d);
    expect(sel).not.toMatch(/input|textarea|select\b|label|guide|news/);
    for (const { file, text } of SOURCES) expect(text, file).not.toMatch(/(^|[\s,}])(body|html)\s*\{[^}]*user-select/);
  });

  it('the title, up before the shared sheet, carries the motion tokens, the gated hover, the press and the listener', () => {
    expect(TITLE_CSS.startsWith(`\n${MOTION_CSS}`)).toBe(true);
    expect(MOTION_CSS).toContain('--nrl-press: 0.97;');
    expect(MOTION_CSS).toContain('--nrl-press: 1;');
    expect(TITLE_CSS).toContain('@media (hover: hover) and (pointer: fine) { .nrl-title-btn:hover { background: #283669; } }');
    expect(rule(TITLE_CSS, '.nrl-title-btn:active:not(:disabled)')).toContain('transform: scale(var(--nrl-press));');
    expect(rule(TITLE_CSS, '.nrl-title :is(button, label)')).toContain('user-select: none;');
    // #613's disabled look still comes after the yellow it must beat.
    expect(TITLE_CSS.indexOf('.nrl-title-btn:disabled, .nrl-title-btn:disabled:hover {')).toBeGreaterThan(TITLE_CSS.indexOf('.nrl-title-btn-go:active:not(:disabled)'));
    const title = readFileSync(join(UI, 'title.ts'), 'utf8');
    expect(title).toContain('listenForPress();');
    expect(readFileSync(join(UI, 'dom.ts'), 'utf8')).toContain("document.addEventListener('touchstart', () => {}, { passive: true });");
  });
});
