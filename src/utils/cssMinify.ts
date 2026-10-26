// src/utils/cssMinify.ts — the build's CSS squeeze (vite.config.ts). The UI's
// stylesheets are template literals (`export const CSS = \`…\``) written for a
// reader: comments, indents, a rule a line. esbuild keeps a template literal as
// it is, so the build drops the comments and the spaces CSS does not need.
// Tests and the dev server see the source as written.
//
// Only what is safe without parsing CSS: comments go, whitespace runs become one
// space, and spaces beside { } ; , > and after : go. A space before ':' stays
// (`.a :is(p)` is not `.a:is(p)`), quoted strings and `${…}` are left whole.

const PUNCT = new Set(['{', '}', ';', ',', '>']);

/** One literal stretch of CSS. `head`/`tail`: it starts/ends the stylesheet (else it meets a `${…}`). */
export function minifyCss(css: string, head = true, tail = true): string {
  let out = '';
  let i = 0;
  const n = css.length;
  const last = (): string => out[out.length - 1] ?? '';
  /** A comment or a whitespace run: one space, unless punctuation or a space is already there. */
  const gap = (): void => {
    const l = last();
    if (l !== ' ' && l !== ':' && !PUNCT.has(l)) out += ' ';
  };
  while (i < n) {
    const c = css[i]!;
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      gap();
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (/\s/.test(c)) {
      while (i < n && /\s/.test(css[i]!)) i++;
      gap();
      continue;
    }
    if (PUNCT.has(c) && last() === ' ') out = out.slice(0, -1);
    if (c === '}' && last() === ';') out = out.slice(0, -1);
    out += c;
    i++;
    if (PUNCT.has(c) || c === ':') while (i < n && /\s/.test(css[i]!)) i++;
  }
  if (head && out.startsWith(' ')) out = out.slice(1);
  if (tail && out.endsWith(' ')) out = out.slice(0, -1);
  return out;
}

/** The end of the `${…}` that opens at `i` (index just past its closing brace). */
function interpolationEnd(code: string, i: number): number {
  let depth = 0;
  for (let j = i + 1; j < code.length; j++) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}' && --depth === 0) return j + 1;
  }
  return code.length;
}

/** Squeeze every `…CSS = \`…\`` stylesheet in a module's source; anything else is left as it is. */
export function minifyCssConsts(code: string): string {
  const start = /\b[A-Z_]*CSS = `/g;
  let out = '';
  let from = 0;
  for (let m = start.exec(code); m; m = start.exec(code)) {
    let i = m.index + m[0].length;
    out += code.slice(from, i);
    let seg = i;
    let first = true;
    while (i < code.length && code[i] !== '`') {
      if (code[i] === '\\') { i += 2; continue; }
      if (code[i] === '$' && code[i + 1] === '{') {
        out += minifyCss(code.slice(seg, i), first, false);
        const end = interpolationEnd(code, i);
        out += code.slice(i, end);
        i = seg = end;
        first = false;
        continue;
      }
      i++;
    }
    out += minifyCss(code.slice(seg, i), first, true);
    from = i;
    start.lastIndex = i + 1;
  }
  return out + code.slice(from);
}
