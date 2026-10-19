// tests/systems/lineup.test.ts — the coach's lineup (GitHub #69): the fit
// table, the auto pick, resolving the saved lineup on the day (injuries,
// departures, a short squad), the screen's taps, and the sheet the sim gets
// (each man in the slot he was picked for, at the stats his fit leaves him).
import { describe, it, expect } from 'vitest';
import {
  FIT, LINEUP_SLOTS, POSITION_SHORT, autoPick, describeFills, effectiveRating, lineupAverage, occupant, placeAt, positionFit,
  resolveLineup, spotOf, statsAt, swapSpots,
} from '../../src/systems/lineup';
import { ROLES } from '../../src/match/league/roles';
import { POSITIONS, generatePlayerAround, overallRating } from '../../src/data/player';
import { createNewGame } from '../../src/core/state';
import { teamSheetFromSquad } from '../../src/match/league/sheets';
import { runMatch } from '../../src/match/league/match';
import { LiveSim } from '../../src/match/league/live';
import { makeRng } from '../../src/utils/rng';
import { BENCH } from '../../src/match/league/bench';
import type { Lineup, Player } from '../../src/core/state';

/** A squad with one first-grader per position rated exactly `first` and one depth man per position at `depth`, ids by position. */
function squad(first = 65, depth = 55): Player[] {
  const rng = makeRng(11);
  const out: Player[] = [];
  for (const target of [first, depth]) {
    for (const position of POSITIONS) {
      const p = generatePlayerAround(rng, target, { position });
      out.push({ ...p, id: `${position}-${target}`, injuredWeeks: 0, stats: { speed: target, strength: target, stamina: target, skill: target, footyIQ: target } });
    }
  }
  return out;
}


describe('positional fit (pure)', () => {
  it('the slots are the live sim’s roles, in order', () => {
    expect([...LINEUP_SLOTS]).toEqual(ROLES.map((r) => r.name));
    for (const pos of POSITIONS) expect(POSITION_SHORT[pos]).toMatch(/^[A-Z]{2}$/);
  });
  it('same ×1, related ×0.92, unrelated ×0.8, and symmetric', () => {
    expect(positionFit('prop', 'prop')).toBe(FIT.same);
    expect(positionFit('centre', 'winger')).toBe(FIT.related);
    expect(positionFit('halfback', 'five-eighth')).toBe(FIT.related);
    expect(positionFit('prop', 'second-row')).toBe(FIT.related);
    expect(positionFit('prop', 'halfback')).toBe(FIT.unrelated);
    expect(positionFit('winger', 'hooker')).toBe(FIT.unrelated);
    for (const a of POSITIONS) for (const b of POSITIONS) expect(positionFit(a, b)).toBe(positionFit(b, a));
  });
  it('a man out of position is rated and plays at his fit', () => {
    const p = squad()[0]!; // a 65-ish fullback
    expect(effectiveRating(p, 'fullback')).toBe(overallRating(p));
    expect(effectiveRating(p, 'winger')).toBe(Math.round(overallRating(p) * FIT.related));
    expect(effectiveRating(p, 'prop')).toBe(Math.round(overallRating(p) * FIT.unrelated));
    const at = statsAt(p, 'prop');
    for (const k of ['speed', 'strength', 'stamina', 'skill', 'footyIQ'] as const) expect(at[k]).toBe(Math.max(1, Math.round(p.stats[k] * FIT.unrelated)));
    expect(statsAt(p, 'fullback')).toEqual(p.stats);
  });
});

describe('auto pick', () => {
  it('fills every slot with a natural when the squad has one, and benches the next four by overall', () => {
    const s = squad();
    const l = autoPick(s);
    expect(l.starters).toHaveLength(9);
    // One first-grade winger: the second winger slot takes the depth winger.
    LINEUP_SLOTS.forEach((pos, i) => expect(l.starters[i]).toBe(i === 2 ? 'winger-55' : `${pos}-65`));
    expect(l.bench).toHaveLength(BENCH.size);
    // The next four by overall, ties by id so the pick never depends on the squad's order.
    const rest = s.filter((p) => !l.starters.includes(p.id)).sort((a, b) => overallRating(b) - overallRating(a) || (a.id < b.id ? -1 : 1));
    expect(l.bench).toEqual(rest.slice(0, 4).map((p) => p.id));
    expect(l.rotation).toBe('standard');
    expect(new Set([...l.starters, ...l.bench]).size).toBe(13);
  });
  it('the second winger slot takes the depth winger over a better man out of position only when the fit says so', () => {
    const s = squad();
    const l = autoPick(s);
    // The depth winger (55) at winger beats the depth centre (55 × 0.92) and the first-grade lock, who has no slot of his own (65 × 0.8 = 52): the fit decides.
    expect(l.starters[2]).toBe('winger-55');
    // …and with no natural anywhere near, the lock is still the best man for the bench.
    expect(l.bench[0]).toBe('lock-65');
  });
  it('a natural halfback keeps his slot ahead of a better centre moved there; the better man plays his own spot', () => {
    const s = squad(60, 50).map((p) => (p.id === 'centre-60' ? { ...p, stats: { speed: 85, strength: 85, stamina: 85, skill: 85, footyIQ: 85 } } : p));
    const l = autoPick(s);
    expect(l.starters[3]).toBe('centre-60');
    expect(l.starters[5]).toBe('halfback-60');
  });
  it('leaves out the injured, is deterministic, and does not depend on the squad’s order', () => {
    const s = squad();
    const hurt = s.map((p) => (p.id === 'fullback-65' ? { ...p, injuredWeeks: 2 } : p));
    const l = autoPick(hurt);
    expect(l.starters[0]).toBe('fullback-55');
    expect([...l.starters, ...l.bench]).not.toContain('fullback-65');
    expect(autoPick([...hurt].reverse())).toEqual(l);
    expect(autoPick(hurt, 'heavy').rotation).toBe('heavy');
  });
  it('a new game opens with a full, distinct nine and bench of fit men', () => {
    const g = createNewGame('Lineup FC', 5);
    const l = g.lineup;
    expect(l.starters.every((id) => id !== null)).toBe(true);
    expect(l.bench).toHaveLength(BENCH.size);
    const all = [...l.starters, ...l.bench] as string[];
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(g.squad.find((p) => p.id === id)!.injuredWeeks).toBe(0);
  });
});

describe('resolving the lineup on the day', () => {
  it('an injured starter is covered by the best bench man for the slot, with a note, and keeps his slot', () => {
    const s = squad();
    const l = autoPick(s);
    const hurt = s.map((p) => (p.id === 'prop-65' ? { ...p, injuredWeeks: 3 } : p));
    const r = resolveLineup(l, hurt);
    expect(r.changed).toBe(false);
    expect(r.lineup).toBe(l);
    expect(r.fills).toHaveLength(1);
    const f = r.fills[0]!;
    expect(f).toMatchObject({ slot: 7, position: 'prop', why: 'injured', out: hurt.find((p) => p.id === 'prop-65')!.name });
    // The best of the bench for prop (a second-rower or lock there is ×0.92).
    const benchMen = l.bench.map((id) => hurt.find((p) => p.id === id)!);
    const best = [...benchMen].sort((a, b) => effectiveRating(b, 'prop') - effectiveRating(a, 'prop'))[0]!;
    expect(f.player.id).toBe(best.id);
    expect(r.starters[7]!.id).toBe(best.id);
    expect(r.bench.map((p) => p.id)).not.toContain(best.id);
    expect(r.bench).toHaveLength(BENCH.size); // topped up from the rest
    expect(describeFills(r.fills)).toBe(`Lineup: ${best.name} fills in at prop for the injured ${f.out}.`);
  });
  it('a starter who has left the club is replaced in the saved lineup too', () => {
    const s = squad();
    const l = autoPick(s);
    const gone = s.filter((p) => p.id !== 'hooker-65');
    const r = resolveLineup(l, gone);
    expect(r.changed).toBe(true);
    expect(r.fills[0]).toMatchObject({ slot: 6, position: 'hooker', why: 'gone', out: null });
    expect(r.lineup.starters[6]).toBe(r.fills[0]!.player.id);
    expect(r.lineup.starters).not.toContain('hooker-65');
    expect(r.lineup.bench).not.toContain(r.fills[0]!.player.id);
    expect(r.lineup.bench).toHaveLength(BENCH.size);
    expect(describeFills(r.fills)).toMatch(/^Lineup: .+ comes in at hooker\.$/);
    // Resolving the cleaned lineup again changes nothing.
    expect(resolveLineup(r.lineup, gone).changed).toBe(false);
  });
  it('a bench man who has left is replaced; an injured bench man keeps his seat', () => {
    const s = squad();
    const l = autoPick(s);
    const [b0, b1] = l.bench as [string, string];
    const squadNow = s.filter((p) => p.id !== b0).map((p) => (p.id === b1 ? { ...p, injuredWeeks: 1 } : p));
    const r = resolveLineup(l, squadNow);
    expect(r.changed).toBe(true);
    expect(r.lineup.bench).not.toContain(b0);
    expect(r.lineup.bench).toContain(b1);
    expect(r.lineup.bench).toHaveLength(BENCH.size);
    expect(r.bench.map((p) => p.id)).not.toContain(b1); // not fit today
    expect(r.bench).toHaveLength(BENCH.size);
    expect(r.fills).toHaveLength(0);
  });
  it('a player listed twice, an empty slot and a short squad', () => {
    const s = squad();
    const l = autoPick(s);
    const twice: Lineup = { ...l, starters: l.starters.map((id, i) => (i === 1 ? l.starters[2]! : id)) };
    const r = resolveLineup(twice, s);
    expect(r.changed).toBe(true);
    expect(new Set(r.lineup.starters).size).toBe(9);
    const empty: Lineup = { ...l, starters: l.starters.map((id, i) => (i === 4 ? null : id)) };
    const e = resolveLineup(empty, s);
    expect(e.fills[0]).toMatchObject({ slot: 4, why: 'empty' });
    expect(e.changed).toBe(true);
    // Only five fit men: five slots filled, the rest empty, no bench.
    const five = s.slice(0, 5);
    const short = resolveLineup(autoPick(five), five);
    expect(short.starters.filter((p) => p !== null)).toHaveLength(5);
    expect(short.bench).toEqual([]);
  });
  it('the average rating is of the nine as they play', () => {
    const s = squad();
    const l = autoPick(s);
    const mean = Math.round(LINEUP_SLOTS.reduce((a, pos, i) => a + effectiveRating(s.find((p) => p.id === l.starters[i])!, pos), 0) / 9);
    expect(lineupAverage(l, s)).toBe(mean);
    expect(lineupAverage({ ...l, starters: l.starters.map(() => null) }, s)).toBe(0);
  });
});

describe('the screen’s taps', () => {
  const s = squad();
  const l = autoPick(s);
  it('a newcomer into a slot sends the starter to a free seat, else out of the thirteen', () => {
    const outsider = s.find((p) => !l.starters.includes(p.id) && !l.bench.includes(p.id))!;
    const full = placeAt(l, { kind: 'starter', slot: 0 }, outsider.id);
    expect(full.starters[0]).toBe(outsider.id);
    expect(full.bench).toHaveLength(BENCH.size);
    expect(full.bench).not.toContain('fullback-65'); // no seat free: he drops out
    const room: Lineup = { ...l, bench: l.bench.slice(0, 2) };
    const kept = placeAt(room, { kind: 'starter', slot: 0 }, outsider.id);
    expect(kept.bench).toEqual([...room.bench, 'fullback-65']);
    // Into a seat: the seat's man drops out.
    const seat = placeAt(l, { kind: 'bench', index: 1 }, outsider.id);
    expect(seat.bench[1]).toBe(outsider.id);
    expect(seat.bench).toHaveLength(BENCH.size);
    expect(seat.bench).not.toContain(l.bench[1]);
  });
  it('a bench man into a slot swaps with the starter; two slots swap; a move into an empty seat', () => {
    const b = l.bench[0]!;
    const up = placeAt(l, { kind: 'starter', slot: 7 }, b);
    expect(up.starters[7]).toBe(b);
    expect(up.bench[0]).toBe('prop-65');
    const swapped = swapSpots(l, { kind: 'starter', slot: 1 }, { kind: 'starter', slot: 3 });
    expect(swapped.starters[1]).toBe('centre-65');
    expect(swapped.starters[3]).toBe('winger-65');
    const two: Lineup = { ...l, bench: l.bench.slice(0, 2) };
    const moved = swapSpots(two, { kind: 'starter', slot: 0 }, { kind: 'bench', index: 3 });
    expect(moved.starters[0]).toBeNull();
    expect(moved.bench).toEqual([...two.bench, 'fullback-65']);
    expect(spotOf(moved, 'fullback-65')).toEqual({ kind: 'bench', index: 2 });
    expect(occupant(moved, { kind: 'starter', slot: 0 })).toBeNull();
  });
  it('tapping a man onto his own spot, or swapping two empty seats, changes nothing', () => {
    expect(placeAt(l, { kind: 'starter', slot: 0 }, 'fullback-65')).toBe(l);
    const two: Lineup = { ...l, bench: l.bench.slice(0, 2) };
    expect(swapSpots(two, { kind: 'bench', index: 2 }, { kind: 'bench', index: 3 })).toBe(two);
    expect(swapSpots(l, { kind: 'bench', index: 0 }, { kind: 'bench', index: 0 })).toBe(l);
  });
});

describe('the sheet the sim gets', () => {
  it('each man plays the slot he was picked for, at his fit, and the bench and rotation follow', () => {
    const s = squad();
    // A prop at halfback, the halfback on the bench.
    const l0 = autoPick(s, 'heavy');
    const l = placeAt(l0, { kind: 'starter', slot: 5 }, 'prop-55');
    const sel = resolveLineup(l, s);
    const sheet = teamSheetFromSquad(s, 'me', 'Me', ['#111', '#eee'], sel);
    expect(sheet.roster!.map((r) => r.id)).toEqual(l.starters);
    expect(sheet.roster!.map((r) => r.position)).toEqual([...LINEUP_SLOTS]);
    const prop = s.find((p) => p.id === 'prop-55')!;
    expect(sheet.roster![5]!.stats).toEqual(statsAt(prop, 'halfback'));
    expect(sheet.roster![5]!.stats!.skill).toBeLessThan(prop.stats.skill);
    expect(sheet.roster![0]!.stats).toEqual(s.find((p) => p.id === 'fullback-65')!.stats);
    expect(sheet.bench!.map((b) => b.id)).toEqual(l.bench);
    expect(sheet.rotation).toBe('heavy');
    // Without a selection the sheet is the old top nine by overall, no fit applied, no rotation.
    const plain = teamSheetFromSquad(s, 'me', 'Me', ['#111', '#eee']);
    expect(plain.rotation).toBeUndefined();
    expect(plain.roster!.map((r) => overallRating({ stats: r.stats! }))).toEqual([...s].sort((a, b) => overallRating(b) - overallRating(a)).slice(0, 9).map(overallRating));
  });
  it('the live sim puts the picked man in his slot, and the same lineup and seed give the same match', () => {
    const s = squad();
    const l = placeAt(autoPick(s), { kind: 'starter', slot: 5 }, 'prop-55');
    const sheet = teamSheetFromSquad(s, 'me', 'Me', ['#111', '#eee'], resolveLineup(l, s));
    const other = teamSheetFromSquad(squad(62, 52), 'them', 'Them', ['#222', '#ddd']);
    const sim = new LiveSim(sheet, other, 3);
    const who = sim.snapshot().players.filter((p) => p.side === 'home').map((p) => p.who);
    expect(who).toEqual(l.starters);
    expect(who[5]).toBe('prop-55');
    const a = runMatch(sheet, other, { seed: 9 });
    const b = runMatch(teamSheetFromSquad(s, 'me', 'Me', ['#111', '#eee'], resolveLineup(l, s)), other, { seed: 9 });
    expect(b).toEqual(a);
  });
});
