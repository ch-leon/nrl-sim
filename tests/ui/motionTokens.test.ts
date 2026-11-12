// tests/ui/motionTokens.test.ts — the DOM layer's motion vocabulary (#597): the tokens
// in dom.ts's :root, the one reduced-motion rule, and that the stylesheets in src/ui
// animate through them. What a browser does with them (no travel, the fade kept) is
// measured in the running game; the vitest env has no DOM, so these pin the CSS text.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CSS } from '../../src/ui/dom';
import { OVERLAY_CSS } from '../../src/ui/screens/matchOverlay';
import { REPORT_CSS } from '../../src/ui/screens/matchReport';

const UI = join(__dirname, '../../src/ui');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
});
/** Every src/ui module's source: the stylesheets are template strings in them. */
const SOURCES = files(UI).map((p) => ({ file: p.slice(UI.length + 1), text: readFileSync(p, 'utf8') }));

/** Each `@keyframes` block in `text`: its name and body. */
function keyframes(text: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const start = /@keyframes\s+([\w-]+)\s*\{/g;
  for (let m = start.exec(text); m; m = start.exec(text)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < text.length && depth > 0; i++) depth += text[i] === '{' ? 1 : text[i] === '}' ? -1 : 0;
    out.push({ name: m[1]!, body: text.slice(m.index + m[0].length, i - 1) });
  }
  return out;
}
/** The `animation:` and `transition:` declarations in `text`, each up to its semicolon. */
const motionDecls = (text: string): string[] => text.match(/\b(?:animation|transition):[^;}]*/g) ?? [];

describe('motion tokens (#597)', () => {
  it(':root carries the durations, the two curves, the travel and the scales', () => {
    const root = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('}', CSS.indexOf(':root {')));
    for (const decl of [
      '--nrl-dur-press: 120ms;', '--nrl-dur-fast: 150ms;', '--nrl-dur-sheet: 180ms;',
      '--nrl-ease-out: cubic-bezier(0.23, 1, 0.32, 1);', '--nrl-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);',
      '--nrl-rise: 12px;', '--nrl-pop: 0.97;', '--nrl-press: 0.97;',
    ]) expect(root).toContain(decl);
  });

  it('one reduced-motion rule: no travel, no scaling, and the fades left alone', () => {
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce) { :root { --nrl-rise: 0px; --nrl-pop: 1; --nrl-press: 1; } }');
    // Switched off outright: only what never ends (the speed pill's pulse, the rotate card's turn).
    const off = SOURCES.flatMap(({ file, text }) => (text.match(/@media \(prefers-reduced-motion: reduce\) \{[^@]*?animation: none[^@]*?\}\s*\}/g) ?? []).map((block) => ({ file, block })));
    expect(off.map((o) => o.file).sort()).toEqual(['orientation.ts', 'screens/matchOverlay.ts']);
    const overlay = off.find((o) => o.file === 'screens/matchOverlay.ts')!.block;
    expect(overlay).toContain('.nrl-mo-speed[data-slow]');
    // The score box's flash has no movement, the entrances keep their fade: neither is in that list.
    for (const sel of ['.nrl-mo-scored', '.nrl-mo-banner-in', '.nrl-mo-full', '.nrl-mo-tray', '.nrl-mo-plan-sheet', '.nrl-mo-sheet-card', '.nrl-mo-call-result']) expect(overlay).not.toContain(sel);
  });

  it('a keyframe that moves takes its distance from the tokens, so that rule reaches it', () => {
    const moving = SOURCES.flatMap(({ file, text }) => keyframes(text).map((k) => ({ file, ...k })))
      .filter((k) => k.file !== 'orientation.ts' && /translate|scale\(/.test(k.body));
    expect(moving.map((k) => k.name).sort()).toEqual(expect.arrayContaining(['nrl-mo-in-left', 'nrl-mo-in-right', 'nrl-sheet-up', 'nrl-toast-in']));
    for (const k of moving) {
      for (const t of k.body.match(/translate[XY]?\([^;}]*/g) ?? []) expect(t, `${k.file} @keyframes ${k.name}`).toContain('var(--nrl-rise)');
      for (const t of k.body.match(/scale\([^;}]*/g) ?? []) expect(t, `${k.file} @keyframes ${k.name}`).toMatch(/var\(--nrl-(pop|press)\)/);
    }
  });

  it('the rise is one keyframe, in the stylesheet every screen loads', () => {
    const all = SOURCES.flatMap(({ file, text }) => keyframes(text).map((k) => ({ file, name: k.name })));
    expect(all.filter((k) => k.name === 'nrl-sheet-up').map((k) => k.file)).toEqual(['dom.ts']);
    expect(all.some((k) => k.name === 'nrl-mo-up')).toBe(false);
    for (const { file, text } of SOURCES) expect(text, file).not.toContain('nrl-mo-up');
    // The match cards and the full-time card rise on it.
    expect(OVERLAY_CSS.match(/animation: nrl-sheet-up var\(--nrl-dur-sheet\) var\(--nrl-ease-out\)/g)).toHaveLength(4);
    expect(REPORT_CSS).toContain('animation: nrl-sheet-up var(--nrl-dur-sheet) var(--nrl-ease-out)');
  });

  it('entrances and transitions take their time and curve from the tokens', () => {
    for (const { file, text } of SOURCES) {
      if (file === 'orientation.ts') continue; // the rotate card's turn is its own (and endless)
      for (const decl of motionDecls(text)) {
        if (/^animation: none/.test(decl)) continue;
        // The endless pulse and the score box's colour flash are not entrances; they keep their own timing.
        if (/nrl-mo-slow|nrl-mo-scored/.test(decl)) continue;
        expect(decl, file).toMatch(/var\(--nrl-dur-(press|fast|sheet)\)/);
        // What is left once the tokens are out: no keyword curve but a colour's `ease`, no literal time.
        const literal = decl.replace(/var\(--[\w-]+\)/g, '');
        expect(literal, `${file}: ${decl}`).not.toMatch(/\bease-(out|in)\b/);
        expect(literal, `${file}: ${decl}`).not.toMatch(/\b\d*\.?\d+m?s\b/);
      }
    }
  });

  it('a colour change eases on the keyword; movement on a curve token', () => {
    expect(CSS).toContain('transition: background-color var(--nrl-dur-press) ease, transform var(--nrl-dur-press) var(--nrl-ease-out);');
    expect(CSS).toContain('transition: color var(--nrl-dur-fast) ease;');
    expect(OVERLAY_CSS).toContain('transition: background-color var(--nrl-dur-fast) ease;');
    expect(OVERLAY_CSS).toContain('transition: transform var(--nrl-dur-fast) var(--nrl-ease-in-out);');
    expect(CSS).toContain('.nrl-toast-in { animation: nrl-toast-in var(--nrl-dur-fast) var(--nrl-ease-out); }');
    expect(CSS).toContain('transform: translateY(calc(var(--nrl-rise) / -3));');
    expect(OVERLAY_CSS).toContain('.nrl-mo-banner-in { animation: nrl-mo-in-left var(--nrl-dur-fast) var(--nrl-ease-out) both; }');
  });
});
