import { describe, expect, it } from 'vitest';
import { KICK_CONTEST } from '../../../src/match/league/kickContest';
import { LiveSim } from '../../../src/match/league/live';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import { pictureContext, playerPicture, type PlayerPicture } from '../../../src/match/view/playerPicture';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import type { Side, Snapshot } from '../../../src/match/core/snapshot';
import { sideSheet } from '../../../src/match/balance/measure';

function match(seed: number, lastTick: number, home = DEFAULT_HOME, away = DEFAULT_AWAY): Snapshot[] {
  const sim = new LiveSim(labSheet(home), labSheet(away), seed);
  const trace = [sim.snapshot()];
  while (sim.tick < lastTick && !sim.finished) {
    sim.step();
    trace.push(sim.snapshot());
  }
  return trace;
}

const diggers = match(19, 2932, 'rival-diggers', 'rival-scorpions');
const regather = match(20, 2547);

function painted(trace: Snapshot[], tick: number) {
  const snap = trace[tick]!, previous = trace[tick - 1]!;
  const context = pictureContext(snap, previous);
  return snap.players.map(p => playerPicture(p, previous.players.find(q => q.who === p.who) ?? p, tick, snap.ball.holder, 1, context));
}

describe('contested open-play bombs', () => {
  it.each([
    { trace: diggers, tick: 1049, result: 'caught', side: 'away', slot: 0 },
    { trace: regather, tick: 2541, result: 'contest', side: 'away', slot: 5 },
    { trace: diggers, tick: 2925, result: 'knock-on', side: null, slot: null },
  ])('connects the grounded plant, reach and the actual $result at tick $tick', ({ trace, tick, result, side, slot }) => {
    const before = trace[tick - 1]!, arrival = trace[tick]!;
    const cue = before.bombContest!;
    expect(cue.arrivesTick).toBe(tick);
    expect(cue.releasedTick).toBeUndefined();
    expect(new Set(cue.players.map(p => p.side)).size).toBe(2);
    expect(cue.players.every(p => Math.hypot(p.x - cue.at.x, p.y - cue.at.y) <= KICK_CONTEST.bomb.contestM)).toBe(true);
    const planting = painted(trace, cue.plantTick).filter(p => p.action === 'bombContest');
    expect(planting).toHaveLength(2);
    expect(planting.every(p => p.frame === 0 && p.lift === 0 && !p.possession)).toBe(true);
    const reach = painted(trace, tick - 1).filter(p => p.action === 'bombContest');
    expect(reach).toHaveLength(2);
    expect(reach.every(p => p.lift! > 0 && !p.possession)).toBe(true);
    expect(new Set(reach.map(p => p.frame))).toEqual(new Set([1, 2]));
    expect(before.ball.holder).toBeNull();
    expect(arrival.events).toEqual(expect.arrayContaining([expect.objectContaining({ detail: result })]));
    expect(arrival.ball.holder).toEqual(side ? { side, slot } : null);
    const land = painted(trace, tick);
    expect(land.filter(p => p.possession)).toHaveLength(side ? 1 : 0);
    expect(land.some(p => p.action === 'airCatch')).toBe(false);
    if (side) {
      const holder = arrival.players.find(p => p.side === side && p.slot === slot)!;
      expect(land.find(p => p.who === holder.who)).toMatchObject({ action: 'bombContest', frame: 2, possession: true });
    }
    // Regather in seed 20 runs straight into a real tackle. Ordinary catch and spill finish the landing.
    if (result !== 'contest') {
      const landed = painted(trace, tick + 3).filter(p => p.action === 'bombContest');
      expect(landed).toHaveLength(2);
      expect(landed.every(p => p.frame === 4 && p.lift === 0)).toBe(true);
      expect(painted(trace, tick + 7).some(p => p.action === 'bombContest')).toBe(false);
    }
  });

  it('keeps the ball free when both players reach, then draws one ball through the spill or clean gather', () => {
    const fieldToWorld = (x: number, y: number) => fieldToWorldPoint(x, y, fieldOffsetX());
    const pictures = new Map<string, PlayerPicture>();
    const ground = new Map<string, { x: number; y: number }>();
    const actors = (side: Side): ActorView[] => Array.from({ length: 9 }, (_, slot) => ({
      place: (x, y) => void ground.set(`${side}/${slot}`, { x, y }),
      play: () => {},
      paint: picture => void pictures.set(`${side}/${slot}`, picture),
    }));
    let visible = false, lift = 0;
    const view = new LiveView({ players: { home: actors('home'), away: actors('away') }, fieldToWorld, ball: {
      place: (_x, _y, l) => { lift = l; }, setRendered: v => { visible = v; },
    } });
    const draw = (tick: number, alpha = 1) => view.draw(diggers[tick - 1]!, diggers[tick]!, alpha);
    for (const tick of [1049, 2925]) {
      const contest = diggers[tick - 1]!.bombContest!;
      const keys = contest.players.map(({ side, slot }) => `${side}/${slot}`);
      draw(contest.plantTick);
      const feet = keys.map(key => ground.get(key));
      draw(contest.plantTick + 1, 0);
      expect(keys.map(key => ground.get(key))).toEqual(feet);
      draw(tick - 1);
      expect(keys.every(key => pictures.get(key)!.lift! > 0)).toBe(true);
      expect(visible).toBe(true);
      expect(lift).toBeGreaterThan(30);
      expect([...pictures.values()].filter(p => p.possession)).toHaveLength(0);
      draw(tick);
      expect(visible).toBe(tick === 2925);
      expect([...pictures.values()].filter(p => p.possession)).toHaveLength(tick === 2925 ? 0 : 1);
    }
    const spillLift = lift;
    draw(2928);
    expect(visible).toBe(true);
    expect(lift).toBeLessThan(spillLift);
  });

  it('shows the actual late taker on his feet if a different eligible player had already jumped', () => {
    const trace = regather.slice();
    const tick = 2541;
    const snap = trace[tick]!;
    const cue = snap.bombContest!;
    const previous = trace[tick - 1]!;
    const earlierChaser = previous.players.find(p => p.side === 'away' && p.slot === 7)!;
    trace[tick] = { ...snap, bombContest: { ...cue, players: [{ ...earlierChaser, who: earlierChaser.who! }, cue.players[1]] } };
    const take = painted(trace, tick).find(p => p.possession)!;
    expect(take).toMatchObject({ who: snap.players.find(p => p.side === 'away' && p.slot === 5)!.who, action: 'catch', lift: 0 });
    expect(painted(trace, tick).filter(p => p.action === 'bombContest').every(p => !p.possession)).toBe(true);
  });

  it('retains the ordinary aerial reception on a lone bomb, long kicks and kick-offs, and leaves grubbers on the ground', () => {
    const lone = match(36, 534, 'rival-diggers', 'rival-scorpions');
    expect(lone[453]!.events).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'kick', detail: 'bomb' })]));
    expect(lone.slice(453).every(s => !s.bombContest)).toBe(true);
    expect(painted(lone, 534).filter(p => p.possession)).toEqual([expect.objectContaining({ action: 'airCatch' })]);

    const sim = new LiveSim(sideSheet('H', { rating: 62 }), sideSheet('A', { rating: 58 }), 1, { length: { halves: 2, halfMinutes: 7 } });
    const checked = new Set<string>();
    let launch: Snapshot['events'][number] | undefined;
    let prev = sim.snapshot();
    while (!sim.finished && checked.size < 3) {
      sim.step();
      const snap = sim.snapshot();
      launch = snap.events.find(e => e.kind === 'kick' || e.kind === 'kickoff') ?? launch;
      const kind = launch?.detail ?? launch?.kind;
      const flight = prev.ball.flight;
      if (flight?.via === 'kick' && flight.startedTick === launch?.tick && flight.arrivesTick === snap.tick && kind && ['long', 'kickoff', 'grubber'].includes(kind)) {
        expect(prev.bombContest).toBeUndefined();
        expect(snap.bombContest).toBeUndefined();
        const taker = snap.ball.holder && snap.players.find(p => p.side === snap.ball.holder!.side && p.slot === snap.ball.holder!.slot);
        const take = taker && playerPicture(taker, taker, snap.tick, snap.ball.holder, 1, pictureContext(snap, prev));
        if (kind === 'grubber') { expect(take && take.action).not.toBe('airCatch'); checked.add(kind); }
        else if (take?.action === 'airCatch') checked.add(kind);
      }
      prev = snap;
    }
    expect(checked).toEqual(new Set(['long', 'kickoff', 'grubber']));
  });
});
