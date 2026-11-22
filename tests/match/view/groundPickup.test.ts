import { describe, expect, it } from 'vitest';
import { PICKUP_BALL_X } from '../../../src/art/match/moments';
import { sideSheet } from '../../../src/match/balance/measure';
import { kickFlight, passFlight, rollFlight } from '../../../src/match/core/ball';
import { TICK_S } from '../../../src/match/core/engine';
import { FIELD_LENGTH, MID_X, MID_Y, toFieldPt } from '../../../src/match/core/field';
import type { Side, Snapshot } from '../../../src/match/core/snapshot';
import { LiveSim } from '../../../src/match/league/live';
import { NINES } from '../../../src/match/league/rules';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import type { PlayerPicture } from '../../../src/match/view/playerPicture';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';

class GroundBallFixture extends LiveSim {
  private releaseAt = -1;

  constructor(kind: 'loose' | 'still' | 'tackle' | 'try' | 'pass' | 'roll' | 'kick' = 'loose') {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1);
    this.tick = 100;
    this.attacking = 'home';
    this.dir = this.dirOf('home');
    this.phase = { kind: 'play' };
    this.rng.next = () => .999;
    for (const player of this.players) {
      player.body.pos = { x: player.side === 'home' ? 12 : FIELD_LENGTH - 12, y: 5 + player.slot * 6 };
      player.target = { ...player.body.pos };
      player.pose = 'idle';
    }
    const collector = this.at('home', 0);
    const x = kind === 'try' ? FIELD_LENGTH + 1 : MID_X;
    collector.body.pos = { x, y: MID_Y };
    const running = kind === 'loose' || kind === 'tackle';
    collector.target = { x: x + (running ? 12 : 0), y: MID_Y };
    collector.body.vel = { x: running ? 4 : 0, y: 0 };
    collector.body.heading = { x: 1, y: 0 };
    collector.pose = running ? 'run' : 'idle';
    const at = { x: x + .42, y: MID_Y - .54 };
    if (kind === 'tackle') {
      const tackler = this.at('away', 0);
      tackler.body.pos = { x: x + 1, y: MID_Y + .2 };
      tackler.target = { ...tackler.body.pos };
    }
    if (kind === 'roll') this.lock(collector, 'dummyHalf', 8);
    const from = { x: x + 8, y: MID_Y };
    const by = this.indexOf(collector);
    this.ball = kind === 'roll' ? rollFlight(from, at, this.tick, by, 1)
      : kind === 'pass' ? passFlight(from, at, this.tick, by)
      : kind === 'kick' ? kickFlight(from, at, this.tick, by)
      : { kind: 'loose', pos: at, vel: { x: 0, y: 0 } };
    if (this.ball.kind === 'flight') this.ball.t0 = this.tick + 1 - this.ball.ticks;
    if (kind === 'kick') this.kickInAir = 'long';
  }

  protected override assignTargets(): void {}

  releaseNext(): void { this.releaseAt = this.tick + 1; }

  stopNext(): void {
    this.siren = true;
    this.sirenAt = this.tick - Math.round(NINES.playOnMaxS / TICK_S);
  }

  protected override stepPlay(): void {
    const h = this.holder();
    if (h && this.tick === this.releaseAt) this.pass(h, this.at('home', 1), 0, 0);
    else super.stepPlay();
  }

  next(): Snapshot { this.step(); return this.snapshot(); }
}

function surface(mirrored = false) {
  const pictures = new Map<string, PlayerPicture>();
  const feet = new Map<string, { x: number; y: number }>();
  const actors = (side: Side): ActorView[] => Array.from({ length: 9 }, (_, slot) => ({
    place: (x, y) => void feet.set(`${side}/${slot}`, { x, y }),
    play: () => {},
    paint: picture => void pictures.set(`${side}/${slot}`, picture),
  }));
  const fieldToWorld = (x: number, y: number) => {
    const p = fieldToWorldPoint(x, y, fieldOffsetX());
    return { x: mirrored ? -p.x : p.x, y: p.y };
  };
  const world = (pos: { x: number; y: number }) => {
    const p = toFieldPt(pos);
    const w = fieldToWorld(p.fx, p.fy);
    return { x: Math.round(w.x), y: Math.round(w.y) };
  };
  let ball = { x: 0, y: 0, lift: 0, visible: false };
  let contact = false;
  const view = new LiveView({ players: { home: actors('home'), away: actors('away') }, fieldToWorld, ball: {
    place: (x, y, lift) => { ball = { ...ball, x, y, lift }; },
    setRendered: visible => { ball.visible = visible; },
  }, contact: { paint: (state, layout) => { contact = !!state && !!layout; } } });
  return { view, world, feet, pictures, ball: () => ball, contact: () => contact };
}

const carrier = (s: Snapshot) => s.players.find(p => p.side === 'home' && p.slot === 0)!;
const holding = (s: ReturnType<typeof surface>) => [...s.pictures.values()].filter(p => p.possession);

describe('ground-ball pick-ups', () => {
  it.each([false, true])('joins the grounded ball to the real collector’s hand (mirrored: %s)', mirrored => {
    const sim = new GroundBallFixture();
    const loose = sim.snapshot();
    const gathered = sim.next();
    const field = surface(mirrored);
    const ballSpot = field.world(loose.ball);
    expect(loose.ball).toMatchObject({ holder: null, lift: 0 });
    expect(loose.groundPickup).toBeUndefined();
    expect(gathered.events).toContainEqual(expect.objectContaining({ kind: 'set-start', detail: 'gathered' }));
    expect(gathered.ball.holder).toEqual({ side: 'home', slot: 0 });
    expect(gathered.groundPickup).toEqual({ tick: gathered.tick, at: { x: loose.ball.x, y: loose.ball.y },
      player: { side: 'home', slot: 0, who: carrier(gathered).who }, feet: { x: carrier(gathered).x, y: carrier(gathered).y } });

    field.view.draw(loose, gathered, 0);
    expect(field.pictures.get('home/0')).toMatchObject({ action: 'groundPickup', frame: 0, possession: false });
    expect(holding(field)).toHaveLength(0);
    field.view.draw(loose, gathered, .98);
    expect(field.ball()).toEqual({ ...ballSpot, lift: 0, visible: true });
    expect(field.pictures.get('home/0')).toMatchObject({ action: 'groundPickup', frame: 1, lift: 0, possession: false, left: mirrored });
    expect(holding(field)).toHaveLength(0);
    const reachFeet = field.feet.get('home/0')!;

    field.view.draw(loose, gathered, 1);
    expect(field.ball().visible).toBe(false);
    expect(holding(field)).toEqual([expect.objectContaining({ who: carrier(gathered).who, action: 'groundPickup', frame: 2, lift: 0 })]);
    const took = field.feet.get('home/0')!;
    expect(Math.abs(reachFeet.x - took.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(reachFeet.y - took.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(took.x + (mirrored ? -PICKUP_BALL_X : PICKUP_BALL_X) - ballSpot.x)).toBeLessThanOrEqual(.5);
    expect(took.y).toBe(ballSpot.y);

    // Jump straight back to the award frame or scrub to the reach in a fresh view.
    const sought = surface(mirrored);
    sought.view.draw(gathered, gathered, 0);
    expect(sought.pictures.get('home/0')).toEqual(field.pictures.get('home/0'));
    expect(sought.feet.get('home/0')).toEqual(took);
    sought.view.draw({ ...loose, tick: loose.tick - 2 }, gathered, .5);
    expect(sought.ball().visible).toBe(false);
    expect(sought.pictures.get('home/0')?.action).not.toBe('groundPickup');
    sought.view.draw(loose, sim.next(), 0);
    expect(sought.ball().visible).toBe(false);
    expect(holding(sought)).toHaveLength(1);
    expect(sought.pictures.get('home/0')?.action).not.toBe('groundPickup');
    sought.view.draw(loose, gathered, .98);
    expect(sought.feet.get('home/0')).toEqual(reachFeet);
    expect(sought.ball()).toEqual({ ...ballSpot, lift: 0, visible: true });
  });

  it.each(['loose', 'still'] as const)('hands back to the real standing or running carry (%s)', kind => {
    const sim = new GroundBallFixture(kind);
    const field = surface();
    let prev = sim.snapshot();
    const frames: number[] = [];
    for (let i = 0; i < 8; i++) {
      const cur = sim.next();
      field.view.draw(prev, cur, 1, 8);
      const [picture] = holding(field);
      expect(field.ball().visible).toBe(false);
      expect(holding(field)).toHaveLength(1);
      expect(picture?.lift).toBe(0);
      if (picture?.action === 'groundPickup') frames.push(picture.frame);
      if (!cur.groundPickup) {
        expect(picture?.action).toBe('carry');
        expect(picture?.strideFrame === -1).toBe(kind === 'still');
        expect(field.feet.get('home/0')).toEqual(field.world(carrier(cur)));
      }
      prev = cur;
    }
    expect([...new Set(frames)]).toEqual([2, 3, 4, 5]);
  });

  it.each([['pass', 'catch'], ['roll', 'dummyHalf'], ['kick', 'airCatch']] as const)('retains the normal %s reception', (kind, action) => {
    const sim = new GroundBallFixture(kind);
    const field = surface();
    const prev = sim.snapshot(), cur = sim.next();
    field.view.draw(prev, cur, 1);
    expect(cur.groundPickup).toBeUndefined();
    expect(holding(field)).toEqual([expect.objectContaining({ action })]);
  });

  it('gives a tackle, try, pass or whistle priority over the pickup', () => {
    const field = surface();
    for (const kind of ['tackle', 'try'] as const) {
      const sim = new GroundBallFixture(kind);
      const prev = sim.snapshot(), cur = sim.next();
      expect(cur.phase?.kind).toBe(kind);
      expect(cur.groundPickup).toBeUndefined();
      field.view.draw(prev, cur, .2);
      expect(field.ball().visible).toBe(false);
      expect(holding(field)).toHaveLength(1);
      expect(holding(field)[0]?.action).not.toBe('groundPickup');
      expect(field.contact()).toBe(kind === 'tackle');
    }
    const sim = new GroundBallFixture();
    const gathered = sim.next();
    sim.releaseNext();
    const pass = sim.next();
    expect(pass.ball.flight?.via).toBe('pass');
    expect(pass.groundPickup).toBeUndefined();
    field.view.draw(gathered, pass, .2);
    expect(field.ball().visible).toBe(true);
    expect(holding(field)).toHaveLength(0);
    expect(field.pictures.get('home/0')?.action).toBe('pass');

    const siren = new GroundBallFixture();
    const reception = siren.next();
    siren.stopNext();
    const whistle = siren.next();
    expect(whistle.phase?.kind).toBe('half-time');
    expect(whistle.groundPickup).toBeUndefined();
    field.view.draw(reception, whistle, .2);
    expect(field.ball().visible).toBe(false);
    expect(holding(field)).toHaveLength(1);
    expect(holding(field)[0]?.action).not.toBe('groundPickup');
  });
});
