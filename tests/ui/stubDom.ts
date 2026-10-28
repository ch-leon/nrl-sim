// A small stand-in DOM for screens built with dom.ts's el() and button() (the vitest
// environment is 'node' and jsdom is not installed). Enough to build a screen, find
// its parts by data attribute, read every word on it, and tap its buttons.
import { vi } from 'vitest';

export class StubNode {
  tagName: string;
  className = '';
  childNodes: StubNode[] = [];
  parentNode: StubNode | null = null;
  attrs: Record<string, string> = {};
  disabled = false;
  type = '';
  value = '';
  id = '';
  style: Record<string, string> = {};
  private text = '';
  private listeners: Record<string, (() => void)[]> = {};

  constructor(tag: string, text = '') {
    this.tagName = tag.toUpperCase();
    this.text = text;
  }

  get children(): StubNode[] { return this.childNodes.filter((c) => c.tagName !== '#TEXT'); }
  get textContent(): string { return this.childNodes.length ? this.childNodes.map((c) => c.textContent).join('') : this.text; }
  set textContent(v: string) { this.replaceChildren(); this.text = v; }
  set innerHTML(v: string) { this.textContent = v; }

  setAttribute(k: string, v: string): void { if (k === 'class') this.className = v; else this.attrs[k] = String(v); }
  getAttribute(k: string): string | null { return k === 'class' ? this.className : this.attrs[k] ?? null; }
  hasAttribute(k: string): boolean { return k in this.attrs; }
  addEventListener(ev: string, fn: () => void): void { (this.listeners[ev] ||= []).push(fn); }
  click(): void { if (!this.disabled) for (const fn of this.listeners.click ?? []) fn(); }
  focus(): void {}

  appendChild(c: StubNode): StubNode {
    c.parentNode?.removeChild(c);
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  append(...nodes: (StubNode | string)[]): void {
    for (const n of nodes) this.appendChild(typeof n === 'string' ? new StubNode('#text', n) : n);
  }
  removeChild(c: StubNode): StubNode {
    this.childNodes = this.childNodes.filter((x) => x !== c);
    c.parentNode = null;
    return c;
  }
  replaceChildren(...nodes: (StubNode | string)[]): void {
    for (const c of [...this.childNodes]) this.removeChild(c);
    this.text = '';
    this.append(...nodes);
  }

  /** Every node under this one, depth first. */
  all(): StubNode[] {
    return this.childNodes.flatMap((c) => [c, ...c.all()]);
  }
  /** `[data-x]` or `[data-x="v"]` only. */
  querySelectorAll(sel: string): StubNode[] {
    const m = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if (!m) throw new Error(`stub DOM: unsupported selector ${sel}`);
    const [, key, want] = m;
    return this.all().filter((n) => key! in n.attrs && (want === undefined || n.attrs[key!] === want));
  }
  querySelector(sel: string): StubNode | null { return this.querySelectorAll(sel)[0] ?? null; }
  /** Every word a player could read or hear: text, and the attributes a screen reader speaks. */
  words(): string {
    return [this, ...this.all()].map((n) => [n.text, n.attrs['aria-label'] ?? '', n.attrs.title ?? ''].join(' ')).join(' ');
  }
}

/** Install a `document` that builds StubNodes. Undo with vi.unstubAllGlobals(). */
export function stubDocument(): void {
  vi.stubGlobal('document', {
    createElement: (tag: string) => new StubNode(tag),
    createTextNode: (text: string) => new StubNode('#text', text),
  });
}
