import { describe, it, expect } from 'vitest';
import { heldRows, type GoneRow } from '../../../src/ui/screens/contracts';
import { FINANCE_CSS } from '../../../src/ui/screens/finance';
import type { Player } from '../../../src/core/state';

const p = (id: string): Player => ({ id, name: id.toUpperCase() } as Player);

describe('heldRows (#350 F3)', () => {
  it('keeps the order the screen opened with, whatever the rows are sorted by now', () => {
    // A renewed B now sorts last; it keeps its place.
    expect(heldRows(['a', 'b', 'c'], [p('a'), p('c'), p('b')], new Map()).map((r) => r.kind === 'player' && r.player.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('a released or sold player leaves his row behind', () => {
    const gone = new Map<string, GoneRow>([['b', { text: 'B · released', done: 'Released ✓' }]]);
    const rows = heldRows(['a', 'b', 'c'], [p('a'), p('c')], gone);
    expect(rows.map((r) => r.kind)).toEqual(['player', 'gone', 'player']);
    expect(rows[1]).toMatchObject({ kind: 'gone', id: 'b', done: 'Released ✓' });
  });

  it('a player who arrives while it is open goes after the rest; one who left otherwise drops out', () => {
    const rows = heldRows(['a', 'b'], [p('n'), p('a')], new Map());
    expect(rows.map((r) => r.kind === 'player' && r.player.id)).toEqual(['a', 'n']);
  });
});

// Broadcast Quiet: the Contracts sheet's summary line.
import { contractsSummary } from '../../../src/ui/screens/contracts';

describe('contractsSummary', () => {
  it('counts the squad, the deals ending within the window and the wage bill as paid', () => {
    const squad = [{ contractWeeks: 3, wage: 1000 }, { contractWeeks: 8, wage: 1500 }, { contractWeeks: 30, wage: 2000 }];
    expect(contractsSummary(squad)).toBe('3 players · 2 end within 8 wks · wages $4,500/wk');
    expect(contractsSummary(squad, 1.5)).toBe('3 players · 2 end within 8 wks · wages $6,750/wk');
  });
});

// Layout is checked in WebKit by scripts/e2e-webkit.mjs (runFlow); these pin the CSS.
describe('the table at a larger Text size (#350, #371)', () => {
  it('takes the narrow table by a rem width, so it scales with the text', () => {
    expect(FINANCE_CSS).toContain('@container (max-width: 47.5rem)');
    expect(FINANCE_CSS).not.toMatch(/@container \(max-width: \d+px\)/);
  });

  it('moves the position under the name when even that is too wide, keeping a gone row\'s Released ✓', () => {
    const i = FINANCE_CSS.indexOf('@container (max-width: 38rem)');
    expect(i).toBeGreaterThan(FINANCE_CSS.indexOf('@container (max-width: 47.5rem)'));
    const block = FINANCE_CSS.slice(i, FINANCE_CSS.indexOf('\n}', i));
    expect(block).toContain('tr:not(.nrl-contract-gone) > :is(th, td):nth-child(2) { display: none; }');
    expect(block).toContain('.nrl-contract-pos { display: block; }');
    expect(FINANCE_CSS).toContain('.nrl-contract-pos { display: none; }');
  });

  it("puts each action's label over its amount at the narrowest (568px at Larger), armed labels too", () => {
    const i = FINANCE_CSS.indexOf('@container (max-width: 27rem)');
    expect(i).toBeGreaterThan(FINANCE_CSS.indexOf('@container (max-width: 38rem)'));
    const block = FINANCE_CSS.slice(i, FINANCE_CSS.indexOf('\n}', i));
    expect(block).toMatch(/\.nrl-contract-actions \.nrl-btn \{[^}]*white-space: normal/);
  });

  it('keeps ◂ FINANCE its full width, so its label never runs into the title', () => {
    expect(FINANCE_CSS).toContain('.nrl-contracts .nrl-screen-titles > .nrl-back { flex: 0 0 auto; }');
  });
});

// #612: the name column gives way at every width, and the armed look is dom.ts's, shared with the player page.
import { CSS, ARMED_CLASS, ARMED_MS } from '../../../src/ui/dom';

describe('the table at every width (#612)', () => {
  it('sizes to the sheet, not its content: the name cell takes what the others leave, and its lines end in "…"', () => {
    const wide = FINANCE_CSS.slice(0, FINANCE_CSS.indexOf('@container (max-width: 47.5rem)'));
    expect(wide).toContain('.nrl-contracts-table td.nrl-contract-info { max-width: 0; width: 100%; }');
    expect(wide).toContain('.nrl-contract-name, .nrl-contract-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }');
    expect(FINANCE_CSS).not.toMatch(/\.nrl-contracts-table \{[^}]*min-width/);
  });

  it('leaves the armed look to the shared button class', () => {
    expect(FINANCE_CSS).not.toContain('armed');
    expect(CSS).toContain(`.nrl-btn.${ARMED_CLASS}, .nrl-btn.${ARMED_CLASS}:hover:not(:disabled), .nrl-btn.${ARMED_CLASS}:active:not(:disabled) { background: var(--nrl-neg); color: var(--nrl-on-accent); }`);
  });
});

// The screen itself on the stand-in DOM (tests/ui/stubDom.ts): the two-tap guard's wait.
import { afterEach, beforeEach, vi } from 'vitest';
import { StubNode, stubDocument } from '../stubDom';
import { createNewGame, getState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { openContractsScreen } from '../../../src/ui/screens/contracts';

const slot = vi.hoisted(() => ({ screen: null as unknown, close: null as (() => void) | null }));
vi.mock('../../../src/ui/dom', async (original) => ({
  ...await original<typeof import('../../../src/ui/dom')>(),
  ensureStyles: () => {},
  openScreen: (screen: unknown, close: () => void) => { slot.close?.(); slot.screen = screen; slot.close = close; },
}));

describe('Sell and Release disarm (#612)', () => {
  /** The document's pointerdown listeners (armGuard's, in the capture phase). */
  let downs: ((e: unknown) => void)[] = [];
  const rows = () => (slot.screen as StubNode).querySelectorAll('[data-contract]');
  const buttons = (row: number) => rows()[row]!.all().filter((n) => n.tagName === 'BUTTON');
  const release = (row: number) => buttons(row)[1]!;
  const sell = (row: number) => buttons(row)[2]!;
  /** A finger down on `node` (null: somewhere that is no button). */
  const pointerdown = (node: StubNode | null) => {
    const target = { closest: (sel: string) => (node?.classList.contains(sel.slice(1)) ? node : null) };
    for (const fn of [...downs]) fn({ target });
  };

  beforeEach(() => {
    bus.clear(); stubDocument(); createNewGame('Test Club', 1);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] }); // armedTap reads performance.now
    downs = [];
    Object.assign(document, {
      addEventListener: (ev: string, fn: (e: unknown) => void, capture?: boolean) => { expect([ev, capture]).toEqual(['pointerdown', true]); downs.push(fn); },
      removeEventListener: (_ev: string, fn: (e: unknown) => void) => { downs = downs.filter((d) => d !== fn); },
    });
    getState().money = 500000;
    openContractsScreen();
  });
  afterEach(() => { slot.close?.(); slot.close = null; vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('the first tap arms (the label asks again, in the armed class); a second inside four seconds sells', () => {
    const id = rows()[0]!.attrs['data-contract']!;
    const rest = sell(0).textContent;
    expect(rest).toMatch(/^SELL \+\$/);
    sell(0).click();
    expect(sell(0).textContent).toBe('REALLY SELL?');
    expect(sell(0).classList.contains(ARMED_CLASS)).toBe(true);
    expect(getState().squad.some((p) => p.id === id)).toBe(true);
    vi.advanceTimersByTime(ARMED_MS - 1);
    expect(sell(0).classList.contains(ARMED_CLASS)).toBe(true);
    sell(0).click();
    expect(getState().squad.some((p) => p.id === id)).toBe(false);
    expect(downs).toHaveLength(0);
  });

  it('a second tap at 150ms is the first one again and does not sell; at 400ms it does (#617)', () => {
    const id = rows()[0]!.attrs['data-contract']!;
    sell(0).click();
    vi.advanceTimersByTime(150);
    sell(0).click();
    expect(sell(0).textContent).toBe('REALLY SELL?');
    expect(sell(0).classList.contains(ARMED_CLASS)).toBe(true);
    expect(getState().squad.some((p) => p.id === id)).toBe(true);
    vi.advanceTimersByTime(250); // 400ms in, and the 4s wait is still the one that began at the first tap
    sell(0).click();
    expect(getState().squad.some((p) => p.id === id)).toBe(false);
  });

  it('the same for Release: 150ms is ignored, 300ms goes through (#617)', () => {
    const id = rows()[1]!.attrs['data-contract']!;
    release(1).click();
    vi.advanceTimersByTime(150);
    release(1).click();
    expect(release(1).textContent).toBe('REALLY RELEASE?');
    expect(getState().squad.some((p) => p.id === id)).toBe(true);
    vi.advanceTimersByTime(150);
    release(1).click();
    expect(getState().squad.some((p) => p.id === id)).toBe(false);
  });

  it('four seconds on it is back as it was, in place: no row is rebuilt, and the next tap only arms again', () => {
    const n = getState().squad.length;
    const rest = release(1).textContent;
    release(1).click();
    expect(release(1).textContent).toBe('REALLY RELEASE?');
    const [row, btn] = [rows()[1]!, release(1)];
    vi.advanceTimersByTime(ARMED_MS);
    expect(rows()[1]).toBe(row);
    expect(release(1)).toBe(btn);
    expect(btn.textContent).toBe(rest);
    expect(btn.classList.contains(ARMED_CLASS)).toBe(false);
    expect(btn.classList.contains('nrl-btn-danger')).toBe(true);
    expect(downs).toHaveLength(0);
    release(1).click();
    expect(release(1).textContent).toBe('REALLY RELEASE?');
    expect(getState().squad).toHaveLength(n);
  });

  it('a finger down anywhere else disarms it in place; one on the armed button does not', () => {
    const n = getState().squad.length;
    const rest = sell(0).textContent;
    sell(0).click();
    const btn = sell(0);
    pointerdown(btn);
    expect(btn.classList.contains(ARMED_CLASS)).toBe(true);
    pointerdown(release(0)); // another button
    expect(sell(0)).toBe(btn);
    expect(btn.textContent).toBe(rest);
    expect(btn.classList.contains(ARMED_CLASS)).toBe(false);
    expect(downs).toHaveLength(0);
    sell(0).click();
    pointerdown(null); // the sheet, a scroll
    expect(sell(0).classList.contains(ARMED_CLASS)).toBe(false);
    sell(0).click(); // armed again, not sold
    expect(getState().squad).toHaveLength(n);
  });

  it('survives a re-render while armed, and a wait that was called off never disarms the next one', () => {
    sell(0).click();
    vi.advanceTimersByTime(3000);
    pointerdown(sell(2)); // the tap that arms another row's SELL: finger down, then the click
    sell(2).click();
    expect(sell(0).classList.contains(ARMED_CLASS)).toBe(false);
    bus.emit('state:changed', undefined as never);
    expect(sell(2).textContent).toBe('REALLY SELL?');
    vi.advanceTimersByTime(ARMED_MS - 1); // the first wait's four seconds are long gone
    expect(sell(2).classList.contains(ARMED_CLASS)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(sell(2).classList.contains(ARMED_CLASS)).toBe(false);
    expect(sell(2).textContent).toMatch(/^SELL \+\$/);
  });

  it('closing the sheet calls the wait off', () => {
    sell(0).click();
    expect(downs).toHaveLength(1);
    slot.close!();
    slot.close = null;
    expect(downs).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
