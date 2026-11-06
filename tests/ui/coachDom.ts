// Minimal DOM for the existing node test suite; canvas encoding is mocked by callers.
import { vi } from 'vitest';
import { StubNode } from './stubDom';

export function coachDocument(): StubNode {
  const make = (tag: string): StubNode => {
    const n = new StubNode(tag);
    Object.assign(n, {
      classList: {
        add: (...names: string[]) => { n.className += ` ${names.join(' ')}`; },
        contains: (name: string) => n.className.split(' ').includes(name),
        toggle: () => {},
      },
      remove: () => n.parentNode?.removeChild(n),
    });
    return n;
  };
  const root = make('div');
  const head = make('head');
  vi.stubGlobal('document', {
    createElement: make,
    createTextNode: (text: string) => new StubNode('#text', text),
    getElementById: (id: string) => id === 'ui-root' ? root : head.children.find((n) => n.id === id) ?? null,
    querySelector: () => null,
    head,
    body: root,
  });
  return root;
}
