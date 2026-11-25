import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import type { PlayId } from '../../../src/data/plays';
import { sideSheet } from '../../../src/match/balance/measure';
import type { BallFlightSnap } from '../../../src/match/core/snapshot';
import { labSheet } from '../../../src/match/lab/sheets';
import { DEFAULT_ROTATION } from '../../../src/match/league/bench';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';

class OpenSideRuck extends LiveSim {
  constructor(equipped?: PlayId) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 798);
    this.tick = 100;
    this.attacking = 'home';
    this.dir = 1;
    this.mark = { x: 50, y: 15 };
    this.tackles = 2;
    this.rng.next = () => 0.2;
    this.phase = { kind: 'ruck', t0: 100, carrier: 1, tackler: 9, stage: 'dh', handover: false, heldAt: 100, down: 0, pace: null };
    this.ball = { kind: 'held', by: 6 };
    for (const p of this.players) {
      p.body.vel = { x: 0, y: 0 };
      p.body.pos = { x: p.side === 'home' ? 25 : 85, y: 34 };
    }
    this.at('home', 6).body.pos = this.dummyHalfSpot();
    [3, 4, 5, 8, 2].forEach((slot, i) => {
      this.at('home', slot).body.pos = { x: 48.4 - 3.25 - i * 1.25, y: 15.4 + (i + 1) * 47.6 / 5 };
    });
    if (equipped) this.sheetPlays.home.push(equipped);
    this.prepareAttackShape();
  }

  get planned() { return this.currentAttackShape()?.openSide; }

  pastRelease() {
    while (this.phase.kind === 'ruck' && this.tick <= 106) this.step();
    return this.snapshot();
  }

  inFirstHands() {
    const arrival = this.pastRelease().ball.flight!.arrivesTick;
    while (this.tick < arrival) this.step();
    return this.snapshot().ball.holder;
  }

  coverSecond() {
    const lane = this.planned!.line[1]!.player;
    const next = this.at(lane.side, lane.slot);
    const defender = this.at('away', 3);
    defender.body.pos = { ...next.body.pos, x: next.body.pos.x + 0.25 };
    defender.cooldownUntil = 0;
  }

  noWinger() { this.at('home', 2).lockUntil = this.tick + 30; }

  runLastPass(covered: boolean) {
    const pass = this.at('home', 5);
    const short = this.at('home', 1);
    const open = this.at('home', 7);
    pass.body.pos = { x: 50, y: 16 };
    short.body.pos = { x: 47, y: 5 };
    open.body.pos = { x: 47, y: 24 };
    for (const p of this.side('away')) p.body.pos.y = 14.5;
    for (const slot of [0, 2, 3, 4, 6, 8]) this.at('home', slot).busyUntil = this.tick + 30;
    if (covered) this.at('away', 3).body.pos = { x: 48, y: 24 };
    this.phase = { kind: 'play' };
    this.lastPlay = true;
    this.tackles = SET_TACKLES - 1;
    this.kickCall = 'pass';
    this.ball = { kind: 'held', by: this.indexOf(pass) };
    this.step();
    return this.snapshot();
  }
}

describe('ordinary open-side movement', () => {
  it('starts from an idle equipped playbook and yields the ruck when a learned play fires', () => {
    const ordinary = new OpenSideRuck('tap-rambo');
    expect(ordinary.planned?.line[0]?.player.slot).toBe(3);
    expect(ordinary.pastRelease().ball.flight?.receiver?.slot).toBe(3);
    expect(ordinary.planned).toBeDefined();

    const scripted = new OpenSideRuck('block-play');
    expect(scripted.call('home', 'set-play', 'block-play')).toBeNull();
    const release = scripted.pastRelease();
    expect(release.events.some(e => e.kind === 'set-play' && e.detail === 'block-play')).toBe(true);
    expect(release.ball.flight?.receiver?.slot).toBe(5);
    expect(scripted.planned).toBeUndefined();
  });

  it('drops the planned decision for cover, lost support, or a coach call', () => {
    const covered = new OpenSideRuck();
    expect(covered.inFirstHands()?.slot).toBe(3);
    covered.coverSecond();
    covered.step();
    expect(covered.planned).toBeUndefined();
    expect(covered.snapshot().ball.holder?.slot).toBe(3);

    const unavailable = new OpenSideRuck();
    expect(unavailable.inFirstHands()?.slot).toBe(3);
    unavailable.noWinger();
    unavailable.step();
    expect(unavailable.planned).toBeUndefined();

    const coached = new OpenSideRuck();
    coached.step();
    coached.step();
    expect(coached.snapshot().passCall?.to.slot).toBe(3);
    expect(coached.call('home', 'shift-right')).toBeNull();
    expect(coached.pastRelease().ball.flight).toBeUndefined();
    expect(coached.planned).toBeUndefined();
  });

  it('reads the open side on the last when clear and still takes the blind option against cover', () => {
    expect(new OpenSideRuck().runLastPass(false).ball.flight?.receiver?.slot).toBe(7);
    expect(new OpenSideRuck().runLastPass(true).ball.flight?.receiver?.slot).toBe(1);
    const off = applyTuning({ 'shapes.openSide.on': 0 });
    try {
      // The short side is the wider man. With the shift off, the last pass takes him either way.
      expect(new OpenSideRuck().runLastPass(false).ball.flight?.receiver?.slot).toBe(1);
      expect(new OpenSideRuck().planned).toBeUndefined();
    } finally { off(); }
  });

  // Seeds 1 upward, balanced v slide, clear, full energy. Club pairs in the order of the
  // six named sides. First play of each wing that stays in play from the first pass to the
  // winger's catch, four or more linked passes, all of them backwards and toward that wing.
  it.each([
    { seed: 1, home: 'rival-mariners', away: 'rival-brumbies', release: 6641, end: 6722, dir: 1, wing: 1 },
    { seed: 1, home: 'rival-mariners', away: 'rival-swagmen', release: 4535, end: 4602, dir: 1, wing: 2 },
  ])('moves through real hands to winger $wing in balanced seed $seed toward x direction $dir', ({ seed, home, away, release, end, dir, wing }) => {
    const sheet = (id: string) => ({ ...labSheet(id, 'gen', { attack: 'balanced', defence: 'slide' }), rotation: DEFAULT_ROTATION });
    const sim = new LiveSim(sheet(home), sheet(away), seed, { energy: 1, weather: 'clear', calls: [] });
    const flights: BallFlightSnap[] = [];
    let caught = 0;
    while (sim.tick < end) {
      sim.step();
      if (sim.tick < release) continue;
      const snap = sim.snapshot();
      expect(snap.phase?.kind).toBe('play');
      const flight = snap.ball.flight;
      if (flight?.startedTick === sim.tick) {
        expect(flight.via).toBe('pass');
        expect((flight.to.x - flight.from.x) * dir).toBeLessThan(0);
        expect((flight.to.y - flight.from.y) * (wing === 1 ? -1 : 1)).toBeGreaterThan(0);
        if (flights.length) expect(flight.source?.player).toEqual(flights[flights.length - 1]?.receiver);
        flights.push(flight);
      }
      const last = flights[flights.length - 1];
      if (last?.arrivesTick === sim.tick && last.receiver) {
        const { slot, side, who } = last.receiver;
        expect(snap.ball.holder).toEqual({ slot, side });
        expect(snap.players.find(p => p.slot === slot && p.side === side)?.who).toBe(who);
        caught++;
      }
    }
    expect(flights.length).toBeGreaterThanOrEqual(4);
    expect(caught).toBe(flights.length);
    if (wing === 1) expect(flights[0]?.from.y).toBeGreaterThan(45);
    else expect(flights[0]?.from.y).toBeLessThan(23);
    expect(sim.snapshot().ball.holder).toMatchObject({ slot: wing });
    expect(sim.snapshot().ball.y).toBeCloseTo(wing === 1 ? 5 : 63, 0);
  });
});
