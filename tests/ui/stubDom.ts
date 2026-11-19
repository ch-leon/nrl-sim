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
  style = { setProperty: (_key: string, _value: string): void => {} } as Record<string, string> & { setProperty: (key: string, value: string) => void };
  hidden = false;
  checked = false;
  get isConnected(): boolean { return typeof document !== 'undefined' && ((document.body as unknown) === this || (document.head as unknown) === this || this.parentNode?.isConnected === true); }
  classList = {
    add: (...names: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); },
    remove: (...names: string[]) => { this.className = this.className.split(' ').filter((n) => !names.includes(n)).join(' '); },
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on: boolean) => { if (on) this.classList.add(name); else this.classList.remove(name); },
  };
  removeAttribute(k: string): void { delete this.attrs[k]; }
  toggleAttribute(k: string, on: boolean): void { if (on) this.setAttribute(k, ''); else this.removeAttribute(k); }
  remove(): void { this.parentNode?.removeChild(this); }
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
  removeEventListener(ev: string, fn: () => void): void { this.listeners[ev] = (this.listeners[ev] ?? []).filter((f) => f !== fn); }
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
  prepend(...nodes: StubNode[]): void {
    for (const n of [...nodes].reverse()) {
      n.parentNode?.removeChild(n);
      n.parentNode = this;
      this.childNodes.unshift(n);
    }
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
    if (sel.startsWith('.')) return this.all().filter((n) => n.className.split(' ').includes(sel.slice(1)));
    const m = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if (!m) throw new Error(`stub DOM: unsupported selector ${sel}`);
    const [, key, want] = m;
    return this.all().filter((n) => key! in n.attrs && (want === undefined || n.attrs[key!] === want));
  }
  querySelector(sel: string): StubNode | null { return this.querySelectorAll(sel)[0] ?? null; }
  /** This node or its nearest ancestor matching a `.class` or `[data-x]` selector (the same subset). */
  closest(sel: string): StubNode | null {
    const m = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    const hit = (n: StubNode): boolean => sel.startsWith('.')
      ? n.className.split(' ').includes(sel.slice(1))
      : !!m && m[1]! in n.attrs && (m[2] === undefined || n.attrs[m[1]!] === m[2]);
    for (let n: StubNode | null = this; n; n = n.parentNode) if (hit(n)) return n;
    return null;
  }
  /** No canvas here: a `<canvas>` has no drawing context, so a portrait comes out blank. */
  getContext(): null { return null; }
  /** No layout here: every box is at the origin, with no size. */
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number } {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  /** Every word a player could read or hear: text, and the attributes a screen reader speaks. */
  words(): string {
    return [this, ...this.all()].map((n) => [n.text, n.attrs['aria-label'] ?? '', n.attrs.title ?? ''].join(' ')).join(' ');
  }
}

/** Install a `document` that builds StubNodes. Undo with vi.unstubAllGlobals(). */
export function stubDocument(): void {
  const body = new StubNode('body');
  const head = new StubNode('head');
  vi.stubGlobal('document', {
    body,
    documentElement: new StubNode('html'),
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: (sel: string) => body.querySelector(sel),
    createElement: (tag: string) => new StubNode(tag),
    createTextNode: (text: string) => new StubNode('#text', text),
    // A screen's own stylesheet (ensure…Styles): never found, so injected into head.
    getElementById: (id: string) => [...body.all(), ...head.all()].find((n) => n.id === id) ?? null,
    head,
  });
}
