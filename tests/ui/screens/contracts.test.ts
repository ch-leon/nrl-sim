import { describe, it, expect } from 'vitest';
import { heldRows, type GoneRow } from '../../../src/ui/screens/contracts';
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
