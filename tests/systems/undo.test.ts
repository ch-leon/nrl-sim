// tests/systems/undo.test.ts — the 5-second Undo (#370): each of build, sign and
// demolish round-trips to the same GameState (the books net to zero), one offer
// at a time, and the offer ends on time, on advance, on a match and when the
// action can no longer be reversed.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus, type Events } from '../../src/core/events';
import { createNewGame, getState, setState, type GameState } from '../../src/core/state';
import { addFacility, spendMoney } from '../../src/data/club';
import { FACILITY_CATALOG, type FacilityDefId } from '../../src/data/facility';
import { GRID_H, GRID_W } from '../../src/config';
import { validatePlacement } from '../../src/world/placement';
import { classifyReason, financeNet, registerFinanceSystem } from '../../src/systems/economy';
import { signingFee } from '../../src/systems/freeagency';
import { sellPlayer } from '../../src/systems/contracts';
import {
  UNDO_MS, commitUndo, currentOffer, demolishWithUndo, initUndo, offerBuild, signWithUndo, undoNow,
} from '../../src/systems/undo';
import { LINEUP_SLOTS, resolveLineup } from '../../src/systems/lineup';

/** The first free spot for `defId`, scanning row by row. */
function freeSpot(s: GameState, defId: FacilityDefId, skip = 0): { x: number; y: number } {
  let seen = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (validatePlacement(s, defId, x, y, { cost: 0 }).ok && seen++ === skip) return { x, y };
    }
  }
  throw new Error(`no spot for ${defId}`);
}

/** Build the way the placement controller does (#370: then offer the Undo). */
function build(defId: FacilityDefId, at = freeSpot(getState(), defId), now = 0): void {
  const placed = addFacility(defId, at.x, at.y, 1)!;
  spendMoney(FACILITY_CATALOG[defId].cost, `build:${defId}`);
  offerBuild(placed, FACILITY_CATALOG[defId].cost, now);
}

/** Everything but the books and (after a build) the RNG, which the facility id advanced. */
function strip(s: GameState, rng = false): Partial<GameState> {
  const { finance: _f, rngSeed, ...rest } = structuredClone(s);
  return rng ? rest : { ...rest, rngSeed };
}

const last = <T,>(xs: readonly T[]): T => xs[xs.length - 1]!;

/** A season's net, without its season number. */
const lines = ({ season: _s, ...l }: GameState['finance'][number]): number => financeNet(l);
const net = (s: GameState): number => lines(s.finance.find((e) => e.season === s.season)!);

let toasts: Events['ui:notify'][] = [];

beforeEach(() => {
  bus.clear();
  createNewGame('Revert FC', 7);
  setState({ money: 500_000 });
  registerFinanceSystem();
  commitUndo();
  toasts = [];
  bus.on('ui:notify', (n) => toasts.push(n));
});

describe('build', () => {
  it('Undo takes the facility away and gives the full cost back; the books net to zero', () => {
    const before = structuredClone(getState());
    const removed: Events['facility:removed'][] = [];
    bus.on('facility:removed', (e) => removed.push(e));
    build('trainingPaddock', undefined, Date.now());
    expect(getState().facilities).toHaveLength(before.facilities.length + 1);
    expect(undoNow()).toBe(true);
    expect(strip(getState(), true)).toEqual(strip(before, true));
    expect(getState().money).toBe(before.money);
    expect(net(getState())).toBe(0);
    expect(last(getState().finance).facilities).toBe(0);
    expect(removed).toHaveLength(1);
    expect(removed[0]!.undo).toBe(true);
  });

  it('shows one toast with an Undo action that keeps UNDO_MS', () => {
    build('trainingPaddock', undefined, Date.now());
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.text).toContain('built');
    expect(toasts[0]!.ms).toBe(UNDO_MS);
    expect(toasts[0]!.action?.label).toBe('Undo');
    expect(toasts[0]!.action?.enabled?.()).toBe(true);
    toasts[0]!.action!.run();
    expect(getState().facilities.some((f) => f.defId === 'trainingPaddock')).toBe(false);
    expect(toasts[0]!.action?.enabled?.()).toBe(false);
  });

  it('cannot be undone once upgraded or moved', () => {
    build('trainingPaddock', undefined, Date.now());
    const f = last(getState().facilities);
    setState({ facilities: getState().facilities.map((x) => (x.id === f.id ? { ...x, level: 2 } : x)) });
    expect(currentOffer()!.canRevert(getState())).toBe(false);
    expect(undoNow()).toBe(false);
    expect(getState().facilities.some((x) => x.id === f.id)).toBe(true);
  });
});

describe('sign', () => {
  it('Undo puts him back in the pool as he was, at his place, and gives the fee back', () => {
    const before = structuredClone(getState());
    const agent = before.freeAgents[3]!;
    expect(signWithUndo(agent.id).ok).toBe(true);
    expect(getState().money).toBe(before.money - signingFee(before, agent));
    expect(toasts).toHaveLength(1); // the Undo toast only, not two
    expect(toasts[0]!.text).toMatch(new RegExp(`^Signed ${agent.name}: (goes straight into the nine at |starts on the bench|is outside the thirteen)`));
    const unsigned: Events['player:unsigned'][] = [];
    bus.on('player:unsigned', (e) => unsigned.push(e));
    expect(undoNow()).toBe(true);
    expect(strip(getState())).toEqual(strip(before));
    expect(getState().freeAgents[3]).toEqual(agent);
    expect(net(getState())).toBe(0);
    expect(unsigned.map((e) => e.player.id)).toEqual([agent.id]);
  });

  it('a man who out-rates a starter goes into the nine, says so, and Undo puts the old nine back (#416)', () => {
    const s = getState();
    const SR = LINEUP_SLOTS.indexOf('second-row');
    const starter = s.squad.find((p) => p.id === s.lineup.starters[SR])!;
    const agent = { ...s.freeAgents[0]!, position: 'second-row' as const, injuredWeeks: 0, stats: { ...starter.stats, strength: starter.stats.strength + 20, speed: starter.stats.speed + 20 } };
    setState({ freeAgents: [agent, ...s.freeAgents.slice(1)] });
    const before = structuredClone(getState());
    expect(signWithUndo(agent.id).placed).toMatchObject({ where: 'nine', slot: SR, displaced: starter.id });
    expect(getState().lineup.starters[SR]).toBe(agent.id);
    expect(getState().lineup.bench).toContain(starter.id);
    expect(toasts.map((t) => t.text)).toEqual([`Signed ${agent.name}: goes straight into the nine at second-row`]);
    expect(undoNow()).toBe(true);
    expect(getState().lineup).toEqual(before.lineup);
    expect(strip(getState())).toEqual(strip(before));
  });

  it('Undo leaves a lineup the coach has changed since alone (the man just drops out of it)', () => {
    const SR = LINEUP_SLOTS.indexOf('second-row');
    const s = getState();
    const starter = s.squad.find((p) => p.id === s.lineup.starters[SR])!;
    const agent = { ...s.freeAgents[0]!, position: 'second-row' as const, injuredWeeks: 0, stats: { ...starter.stats, strength: starter.stats.strength + 20 } };
    setState({ freeAgents: [agent, ...s.freeAgents.slice(1)] });
    signWithUndo(agent.id);
    const edited = { ...getState().lineup, captain: agent.id };
    setState({ lineup: edited });
    expect(undoNow()).toBe(true);
    expect(getState().lineup).toBe(edited);
    expect(resolveLineup(getState().lineup, getState().squad).lineup.starters).not.toContain(agent.id);
  });

  it('a man put in the nine and then unsigned drops out of the pick', () => {
    const agent = getState().freeAgents[0]!;
    signWithUndo(agent.id);
    const l = getState().lineup;
    setState({ lineup: { ...l, starters: [agent.id, ...l.starters.slice(1)] } });
    undoNow();
    const r = resolveLineup(getState().lineup, getState().squad);
    expect(r.lineup.starters).not.toContain(agent.id);
    expect(r.lineup.bench).not.toContain(agent.id);
  });

  it('cannot be undone once he has gone again', () => {
    const agent = getState().freeAgents[0]!;
    signWithUndo(agent.id);
    expect(sellPlayer(getState(), agent.id).ok).toBe(true);
    expect(currentOffer()!.canRevert(getState())).toBe(false);
    expect(undoNow()).toBe(false);
  });
});

describe('demolish', () => {
  it('Undo puts it back at its spot, level and place, and takes the refund back', () => {
    build('trainingPaddock');
    build('weightsRoom');
    const id = getState().facilities.find((f) => f.defId === 'trainingPaddock')!.id;
    setState({ facilities: getState().facilities.map((x) => (x.id === id ? { ...x, level: 2 } : x)) });
    commitUndo();
    const before = structuredClone(getState());
    const refund = demolishWithUndo(id)!;
    expect(refund).toBeGreaterThan(0);
    expect(getState().money).toBe(before.money + refund);
    expect(undoNow()).toBe(true);
    expect(strip(getState())).toEqual(strip(before));
    expect(lines(last(getState().finance))).toBe(lines(last(before.finance)));
  });

  it('cannot be undone once its spot is taken, or without the refund in the bank', () => {
    build('trainingPaddock');
    const f = getState().facilities.find((x) => x.defId === 'trainingPaddock')!;
    commitUndo();
    demolishWithUndo(f.id);
    // Something else goes up on the spot.
    addFacility('weightsRoom', f.x, f.y, 1);
    expect(currentOffer()!.canRevert(getState())).toBe(false);
    setState({ facilities: getState().facilities.filter((x) => x.defId !== 'weightsRoom') });
    expect(currentOffer()!.canRevert(getState())).toBe(true);
    setState({ money: 0 });
    expect(currentOffer()!.canRevert(getState())).toBe(false);
    expect(undoNow()).toBe(false);
    expect(getState().facilities.some((x) => x.id === f.id)).toBe(false);
  });
});

describe('one offer, and when it ends', () => {
  it('a new action replaces the open offer', () => {
    build('trainingPaddock', undefined, Date.now());
    const agent = getState().freeAgents[0]!;
    signWithUndo(agent.id);
    expect(currentOffer()!.kind).toBe('sign');
    expect(undoNow()).toBe(true);
    // The paddock stays: its offer was replaced.
    expect(getState().facilities.some((f) => f.defId === 'trainingPaddock')).toBe(true);
    expect(undoNow()).toBe(false);
  });

  it('expires after UNDO_MS', () => {
    build('trainingPaddock', undefined, 1000);
    expect(currentOffer(1000 + UNDO_MS - 1)).not.toBeNull();
    expect(currentOffer(1000 + UNDO_MS)).toBeNull();
    expect(undoNow(1000 + UNDO_MS + 1)).toBe(false);
    expect(getState().facilities.some((f) => f.defId === 'trainingPaddock')).toBe(true);
  });

  it('Advance Week commits it (main.ts calls commitUndo first)', () => {
    build('trainingPaddock', undefined, Date.now());
    commitUndo();
    expect(currentOffer()).toBeNull();
    expect(undoNow()).toBe(false);
  });

  it('a match starting commits it', () => {
    const off = initUndo();
    build('trainingPaddock', undefined, Date.now());
    bus.emit('match:started', {} as Events['match:started']);
    expect(currentOffer()).toBeNull();
    off();
  });

  it('is never saved: nothing about an offer is in GameState', () => {
    build('trainingPaddock', undefined, Date.now());
    expect(JSON.stringify(getState())).not.toMatch(/expiresAt|canRevert/);
  });
});

describe('the books', () => {
  it('file an undo on the line it reverses', () => {
    expect(classifyReason('undo:build:trainingPaddock')).toBe('facilities');
    expect(classifyReason('undo:demolish:gym')).toBe('facilities');
    expect(classifyReason('undo:sign:p_1')).toBe('transfers');
  });
});
