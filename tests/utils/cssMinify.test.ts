// tests/utils/cssMinify.test.ts — the build's CSS squeeze (src/utils/cssMinify.ts):
// what it drops, and what it must leave alone for the CSS to mean the same.
import { describe, it, expect } from 'vitest';
import { minifyCss, minifyCssConsts } from '../../src/utils/cssMinify';
import { CSS } from '../../src/ui/dom';
import { OVERLAY_CSS } from '../../src/ui/screens/matchOverlay';

describe('minifyCss', () => {
  it('drops comments, indents and the spaces beside punctuation', () => {
    expect(minifyCss(`
/* a note */
.a > .b, .c {
  color: red;  /* why */
  margin: 0 auto;
}
`)).toBe('.a>.b,.c{color:red;margin:0 auto}');
  });
  it('keeps a space before a colon: a descendant pseudo-class is not the same selector', () => {
    expect(minifyCss('.a :is(p, li) { x: 1; }')).toBe('.a :is(p,li){x:1}');
    expect(minifyCss('.a:hover { x: 1; }')).toBe('.a:hover{x:1}');
  });
  it('leaves quoted strings and calc() spacing whole', () => {
    expect(minifyCss(".x::before { content: '! ;  {a}'; }")).toBe(".x::before{content:'! ;  {a}'}");
    expect(minifyCss('.x { top: calc(var(--a, 0px) + 0.3rem); }')).toBe('.x{top:calc(var(--a,0px) + 0.3rem)}');
  });
  it('keeps media queries and !important readable to a browser', () => {
    expect(minifyCss('@media (max-height: 500px) and (min-width: 600px) {\n  .a { b: c !important; }\n}'))
      .toBe('@media (max-height:500px) and (min-width:600px){.a{b:c !important}}');
  });
});

describe('minifyCssConsts', () => {
  it('squeezes the stylesheet constants and nothing else in the module', () => {
    const src = 'const note = `a  b`;\nexport const CSS = `\n.a {\n  b: c;\n}\n`;\nconst x = 1;';
    expect(minifyCssConsts(src)).toBe('const note = `a  b`;\nexport const CSS = `.a{b:c}`;\nconst x = 1;');
  });
  it('leaves ${…} whole and the spaces that meet it', () => {
    const src = 'const LINEUP_CSS = `\n.a {\n  height: ${3 * H + 2}px;\n  background-position: 0 ${P}px;\n}\n`;';
    expect(minifyCssConsts(src)).toBe('const LINEUP_CSS = `.a{height:${3 * H + 2}px;background-position:0 ${P}px}`;');
  });
  it('the real stylesheets come out shorter with every rule still there', () => {
    for (const css of [CSS, OVERLAY_CSS]) {
      const min = minifyCss(css);
      expect(min.length).toBeLessThan(css.length * 0.85);
      expect(min.split('{').length).toBe(css.replace(/\/\*[\s\S]*?\*\//g, '').split('{').length);
      expect(min).not.toContain('/*');
    }
  });
});
