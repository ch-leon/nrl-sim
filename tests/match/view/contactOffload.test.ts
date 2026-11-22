import { describe, expect, it } from 'vitest';
import { CONTACT_FOOT, CONTACT_X, drawContact, offloadBallCentre, standContact } from '../../../src/art/prototype/contact';
import { buildKit } from '../../../src/art/match/kit';
import { appearanceFor } from '../../../src/art/prototype/player';
import { sideSheet } from '../../../src/match/balance/measure';
import { toFieldPt } from '../../../src/match/core/field';
import type { PlayerSnap } from '../../../src/match/core/snapshot';
import { BASE, carrierEdge, contestOdds } from '../../../src/match/league/contest';
import { LiveSim } from '../../../src/match/league/live';
import { advanceContactAnimation } from '../../../src/match/view/contactAnimation';
import type { ContactLayout } from '../../../src/match/view/contactLayout';
import { LiveView, LIFT_PX_PER_M, type BallMotion } from '../../../src/match/view/liveView';
import type { PlayerPicture } from '../../../src/match/view/playerPicture';
import { traitCuesFor } from '../../../src/match/view/traitLayer';
import { fieldToWorldPoint } from '../../../src/scenes/matchField';

class OffloadFixture extends LiveSim {
  constructor() {
    super(sideSheet('H', { rating: 60, tactics: { attack: 'grind' } }), sideSheet('A', { rating: 60 }), 543);
  }
  release(width: number, entry: number, result: 'catch' | 'intercept' | 'spill' = 'catch') {
    this.tick = 99; this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!, t = this.players[16]!, support = this.players[5]!, thief = this.players[10]!;
    for (const p of this.players) { p.body.pos = { x: 90, y: 60 }; p.traits = []; }
    c.body.pos = { x: 50, y: 34 };
    c.body.heading = { x: 1, y: 0 };
    c.pose = 'run';
    t.body.pos = { x: 51, y: 34 + entry };
    support.body.pos = { x: 49, y: 34 + width };
    support.pose = thief.pose = 'run';
    if (result === 'intercept') thief.body.pos = { x: 49.5, y: 34 + width / 2 };
    this.ball = { kind: 'held', by: this.indexOf(c) };
    const prev = this.snapshot();
    this.tick++;
    const plan = this.atkPlan(c), defence = this.defPlan();
    const odds = contestOdds(carrierEdge(c.stats, t.stats), this.situation(c, t, [t]), {
      edge: this.contestFitEdge('home', 'away'), bigHit: defence.bigHit,
      offload: (plan.offload - 1) * BASE.offload + defence.offload,
    });
    let rolls = 0;
    this.rng.next = () => {
      const draw = rolls++;
      if (draw === 0) return odds.broken + odds.fend + odds.offload / 2;
      if (draw === 1) return result === 'intercept' ? 0 : .99;
      return result === 'spill' ? 0 : .99;
    };
    this.contest(c, t, [t]);
    return { prev, start: this.snapshot(), carrier: c.key, defender: t.key, support: support.key, thief: thief.key };
  }
  advanceTo(tick: number) {
    this.tick = tick;
    this.events = [];
    this.landings();
    return this.snapshot();
  }
}

function viewAt(mirror: number) {
  const hidden = new Set<string>();
  const pictures = new Map<string, PlayerPicture>();
  const actor = (side: string, slot: number) => ({
    paint: (pic: PlayerPicture) => pictures.set(`${side}/${slot}`, pic),
    play() {}, place() {},
    ballAnchor: (pic: PlayerPicture) => ({ x: pic.left ? -8 : 8, y: -11 }),
    setSpriteVisible: (visible: boolean) => visible ? hidden.delete(`${side}/${slot}`) : hidden.add(`${side}/${slot}`),
  });
  let ball = { x: 0, y: 0, lift: 0, depth: 0, visible: false, motion: {} as BallMotion };
  let layout: ContactLayout | null = null;
  const fieldToWorld = (fx: number, fy: number) => {
    const p = fieldToWorldPoint(fx, fy, 0);
    return { x: p.x * mirror, y: p.y };
  };
  const view = new LiveView({
    players: { home: Array.from({ length: 9 }, (_, i) => actor('home', i)), away: Array.from({ length: 9 }, (_, i) => actor('away', i)) },
    fieldToWorld,
    ball: {
      place(x, y, lift, depth, motion) { ball = { ...ball, x, y, lift, depth, motion: motion ?? {} as BallMotion }; },
      setRendered(visible) { ball.visible = visible; },
    },
    contact: {
      paint: (_state, next) => { layout = next; },
      offloadAnchor: (state, next) => {
        const at = offloadBallCentre(state, next.pose, appearanceFor(state.contact.carrier.who))!;
        return { x: (at[0] - CONTACT_X) * (next.left ? -1 : 1), y: at[1] - CONTACT_FOOT };
      },
    },
  });
  return {
    view, hidden, pictures,
    ball: () => ball, layout: () => layout,
    world: (p: PlayerSnap) => { const f = toFieldPt(p); const w = fieldToWorld(f.fx, f.fy); return { x: Math.round(w.x), y: Math.round(w.y) }; },
    centre: () => ({ x: ball.x + (ball.motion.offsetX ?? 0), y: ball.y - ball.lift - 1.5 + (ball.motion.offsetY ?? 0) }),
  };
}

describe('an offload from contact', () => {
  it.each(['catch', 'intercept', 'spill'] as const)('uses the genuine launch, then yields the ball to the real %s', result => {
    const sim = new OffloadFixture();
    const { start, carrier, defender, support, thief } = sim.release(6, 1.5, result);
    const flight = start.ball.flight!;
    const event = start.events.find(e => e.kind === 'offload')!;
    expect(event.contact).toMatchObject({ outcome: 'offload', carrier: { who: carrier }, defenders: [{ who: defender }],
      offload: { to: flight.to, arrivesTick: flight.arrivesTick } });
    expect(flight.source!.player.who).toBe(carrier);
    expect(flight.receiver!.who).toBe(result === 'intercept' ? thief : support);
    expect(advanceContactAnimation(null, start)?.kind).toBe('offload');
    const cue = traitCuesFor({ ...event, trait: 'Offload King' }, start);
    if (result === 'intercept') expect(cue).toEqual([]);
    else expect(cue[0]?.to?.slot).toBe(flight.receiver!.slot);
    const last = sim.advanceTo(flight.arrivesTick - 1);
    const settled = sim.advanceTo(flight.arrivesTick);
    const render = viewAt(1);
    render.view.draw(last, settled, 1);
    if (result === 'spill') {
      expect(settled.events.some(e => e.kind === 'error')).toBe(true);
      expect(settled.ball.flight?.via).toBe('bounce');
      expect(render.ball().visible).toBe(true);
    } else {
      expect(settled.ball.holder).toMatchObject({ side: flight.receiver!.side, slot: flight.receiver!.slot });
      expect(render.pictures.get(`${flight.receiver!.side}/${flight.receiver!.slot}`)?.possession).toBe(true);
      expect(render.ball().visible).toBe(false);
    }
    expect(!!render.layout()).toBe(result === 'catch');
  });

  it.each([[.6, -1.5, 1], [-6, 1.5, 1], [.6, -1.5, -1], [-6, 1.5, -1]] as const)(
    'takes the existing ball across to the arm and keeps the real approach side (%s m, entry %s, mirror %s)', (width, entry, mirror) => {
      const sim = new OffloadFixture();
      const { prev, start } = sim.release(width, entry);
      const facts = start.contact!;
      const flight = start.ball.flight!;
      if (Math.abs(width) < 1) expect(flight.arrivesTick - flight.startedTick).toBe(2);
      const render = viewAt(mirror);
      render.view.draw(prev, prev, 1);
      const carrier = start.players.find(p => p.who === facts.carrier.who)!;
      const tackler = start.players.find(p => p.who === facts.defenders[0]!.who)!;
      const from = render.world(carrier), actual = render.world(tackler);
      const carry = render.pictures.get('home/7')!;
      render.view.draw(prev, start, 0);
      expect(render.centre()).toEqual({ x: from.x + (carry.left ? -8 : 8), y: from.y - 11 });
      expect(render.hidden).toEqual(new Set(['home/7', 'away/7']));
      expect(render.layout()!.feet[1]).toMatchObject(actual);
      render.view.draw(prev, start, 1);
      const layout = render.layout()!, state = advanceContactAnimation(null, start)!;
      expect(Math.sign(layout.feet[1]!.x - from.x)).toBe(Math.sign(actual.x - from.x));
      expect(Math.abs(layout.feet[1]!.x - actual.x)).toBeLessThanOrEqual(4);
      expect(render.ball()).toMatchObject({ visible: true, x: from.x, y: from.y, lift: LIFT_PX_PER_M });
      expect(render.ball().depth).toBeGreaterThan(Math.max(...layout.feet.map(p => p.y)) + 1.02);
      const look = appearanceFor(carrier.who!);
      const at = offloadBallCentre(state, layout.pose, look)!;
      const tall = standContact(layout.pose, p => appearanceFor(p.who));
      const hand = tall.carrier.arms[0]!.hand;
      expect(Math.hypot(at[0] - hand[0], at[1] - hand[1])).toBeLessThanOrEqual(2.251);
      const pixels = drawContact(state, p => appearanceFor(p.who), () => buildKit(0xe6b632, 0x21394a, 'v'), 'front', layout.pose);
      // The rugby ball has its own tan seam. Only the flight renderer paints it during this contact.
      let paintedBall = false;
      for (let y = 0; y < pixels.h; y++) for (let x = 0; x < pixels.w; x++) paintedBall ||= pixels.get(x, y).color === 0xa39475;
      expect(paintedBall).toBe(false);
      const next = sim.advanceTo(flight.startedTick + 1);
      render.view.draw(start, next, 1);
      const sought = viewAt(mirror);
      sought.view.draw(next, next, 1);
      expect(sought.layout()).toEqual(render.layout());
      expect(sought.centre()).toEqual(render.centre());
    },
  );

  it('drops the pair on a replaced flight, whistle, changed player, or either participant getting the ball', () => {
    const sim = new OffloadFixture(), { start } = sim.release(6, 1.5);
    const next = sim.advanceTo(start.tick + 1);
    const state = advanceContactAnimation(null, start)!;
    expect(advanceContactAnimation(state, next)).toEqual(advanceContactAnimation(null, next));
    const flight = next.ball.flight!;
    for (const changed of [
      { ...next, contact: undefined },
      { ...next, phase: { kind: 'penalty', since: next.tick } },
      { ...next, attacking: 'away' as const },
      { ...next, ball: { ...next.ball, flight: { ...flight, via: 'kick' as const } } },
      { ...next, ball: { ...next.ball, flight: { ...flight, startedTick: next.tick } } },
      { ...next, ball: { ...next.ball, holder: next.contact!.defenders[0]! } },
      { ...next, ball: { ...next.ball, holder: next.contact!.carrier } },
      { ...next, players: next.players.map(p => p.who === next.contact!.defenders[0]!.who ? { ...p, who: 'replacement' } : p) },
    ]) {
      // An older recording has no optional contact fact to consume on a seek.
      const { contact, ...rest } = changed;
      expect(advanceContactAnimation(state, { ...rest, ...(contact ? { contact } : {}) })).toBeNull();
    }
  });
});
