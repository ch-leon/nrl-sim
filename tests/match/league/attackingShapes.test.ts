import { afterEach, describe, expect, it } from 'vitest';
import { SHAPES, chooseShape, shapeEdge, shapeTarget, shapeWeights, packetSlots, type ShapeKind } from '../../../src/match/league/attackingShapes';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { formationTarget, ROLES } from '../../../src/match/league/roles';
import { FIELD_WIDTH } from '../../../src/match/core/field';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';
import { SET_TACKLES } from '../../../src/config';
import { LIVE } from '../../../src/match/league/live/knobs';

const restore: (() => void)[] = [];
afterEach(() => { while (restore.length) restore.pop()!(); });
class ShapeSim extends LiveSim {
  draws = 0;
  constructor(dir: 1 | -1 = 1, y = 34) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 649);
    this.tick = 100; this.attacking = 'home'; this.dir = dir; this.tackles = 1;
    this.mark = { x: 50, y };
    for (const p of this.players) {
      p.body.pos = formationTarget(ROLES[p.slot]!, this.mark, dir, p.side === 'home');
      p.body.vel = { x: 0, y: 0 }; p.lockUntil = 0; p.busyUntil = 0; p.pose = 'idle';
    }
    this.players[4]!.body.pos = { ...this.mark }; this.players[4]!.lockUntil = 110;
    this.players[6]!.body.pos = { x: 50 - dir * 1.6, y: y + .4 };
    this.phase = { kind: 'ruck', t0: 100, carrier: 4, tackler: 9, stage: 'down', handover: false, heldAt: 0, down: 10, pace: null };
    this.ball = { kind: 'held', by: 4 };
    this.rng.next = () => { this.draws++; return .5; };
  }
  choose() { this.prepareAttackShape(); return this.snapshot().attackShape; }
  targets() { this.assignTargets(); return this.players.map(p => ({ ...p.target })); }
  force(kind: ShapeKind, edge: 1 | -1) {
    if (this.phase.kind === 'ruck') this.phase.shape = { kind, edge, side: 'home', dir: this.dir, startedTick: this.tick };
  }
  dh() {
    if (this.phase.kind === 'ruck') { this.phase.stage = 'dh'; this.phase.heldAt = this.tick; }
    this.ball = { kind: 'held', by: 6 }; this.players[4]!.lockUntil = 0;
    this.players[6]!.pose = 'dummyHalf';
  }
  release() { this.tick += 6; if (this.phase.kind === 'ruck') this.stepRuck(this.phase); return this.snapshot(); }
  loose() { this.ball = { kind: 'loose', pos: { ...this.mark }, vel: { x: 0, y: 0 } }; }
  kick() { this.ball = { kind: 'flight', from: this.mark, to: { x: 80,y: 34 }, t0: this.tick, ticks: 30, peak: 8, fromLift: .4, receiver: null, bounces: 0, via: 'kick' }; }
  turn() { this.attacking = 'away'; this.dir = -1; }
  control() { this.cancelRuckDecision(); }
  plays() { this.sheetPlays.home.push('block-play'); }
  man(i: number) { return this.players[i]!; }
  handover() { if (this.phase.kind === 'ruck') this.phase.handover = true; }
  bin(i: number) { this.players[i]!.binUntilS = 1000; this.refreshOnField(); }
  contact(last = false) {
    if(last) this.tackles = SET_TACKLES-1;
    this.phase = {kind:'tackle',t0:this.tick,carrier:4,tackler:9,big:true,wrestle:null,wreck:0};
  }
  finishContact() { this.tick += LIVE.contactTicks; if(this.phase.kind==='tackle') this.stepTackle(this.phase); }
  options() { return this.candidates(this.man(6)); }
}

describe('ordinary attacking structures (#649)', () => {
  it('weights style/tackle/position and offers three structures, with deterministic balanced edge ties', () => {
    expect(shapeWeights('grind', 1, 90, 34).pod).toBeGreaterThan(shapeWeights('expansive', 1, 90, 34).pod);
    expect(shapeWeights('balanced', 4, 15, 34).edge).toBeGreaterThan(shapeWeights('balanced', 1, 90, 34).edge);
    expect(shapeWeights('expansive', 4, 10, 3).edge).toBe(0);
    expect(new Set(Array.from({ length: 100 }, (_, i) => chooseShape('balanced', 3, 30, 34, i / 100).kind))).toEqual(new Set(['spread','pod','edge','back-door']));
    expect(shapeEdge('edge', 34, 1, 1)).toBe(-shapeEdge('edge', 34, 1, 2));
    expect(listKnobs().map(k => k.path)).toContain('shapes.setupReachM');
  });
  it('holds ordered in-bounds packet lanes beside either touchline and mirrors depth', () => {
    for (const dir of [-1,1] as const) for (const edge of [-1,1] as const) for (const kind of ['pod','edge'] as const) for (const y of [1.5,20,34,48,66.5]) {
      const shape = { kind,edge,dir,side:'home' as const,startedTick:100 };
      const targets = packetSlots(kind,edge).map(slot => shapeTarget(shape,slot,{x:50,y}));
      for (const p of targets) { expect(p.y).toBeGreaterThanOrEqual(SHAPES.marginM); expect(p.y).toBeLessThanOrEqual(FIELD_WIDTH-SHAPES.marginM); expect((50-p.x)*dir).toBeGreaterThanOrEqual(3); }
      const lanes = targets.map(p=>p.y).sort((a,b)=>a-b);
      expect(Math.min(lanes[1]!-lanes[0]!,lanes[2]!-lanes[1]!)).toBeGreaterThanOrEqual(2);
    }
  });
  it('chooses once; snapshot/target re-entry is pure, and unreachable near-touch pods stay out', () => {
    const sim = new ShapeSim(), shape = sim.choose();
    expect(shape).toBeDefined(); expect(sim.draws).toBe(1);
    sim.targets(); sim.targets(); expect(sim.choose()).toEqual(shape); sim.snapshot();
    expect(sim.draws).toBe(1);
    const touch = new ShapeSim(1,3);
    expect(touch.choose()!.kind).toBe('spread'); expect(touch.draws).toBe(1);
    const busy = new ShapeSim();
    busy.man(8).body.pos={x:46,y:38}; busy.man(5).body.pos={x:43,y:36}; busy.man(5).busyUntil=200;
    expect(busy.choose()).toMatchObject({kind:'pod',linkSlot:5});
    expect(busy.targets()[5]).toEqual({x:43,y:36});
    expect(busy.options().find(c=>c.idx===5)!.busy).toBe(true);
  });
  it('retains effective DH depth in both directions and spread keeps original support priority', () => {
    for (const dir of [-1,1] as const) for (const kind of ['pod','edge'] as const) {
      const sim = new ShapeSim(dir); sim.force(kind,-1); sim.dh(); const targets = sim.targets(), h = sim.man(6);
      for (const slot of packetSlots(kind,-1)) expect((h.body.pos.x-targets[slot]!.x)*dir).toBeGreaterThanOrEqual(3);
      expect(targets[6]).toEqual({x:50-dir*1.6,y:34.4});
    }
    const sim = new ShapeSim(); sim.force('spread',1); const spread = sim.targets();
    const edge = new ShapeSim(); edge.force('edge',-1);
    // The uninvolved forwards keep the same offload/support spots during contact setup.
    const edgeTargets = edge.targets();
    expect(edgeTargets[7]).toEqual(spread[7]); expect(edgeTargets[8]).toEqual(spread[8]);
    restore.push(applyTuning({'shapes.on':0}));
    expect(new ShapeSim().targets()).toEqual(spread);
    expect(new ShapeSim().choose()).toBeUndefined();
  });
  it('preserves source/receiver preparation, passes, lifecycle ends and input/script priorities without reselecting', () => {
    const sim = new ShapeSim(); const shape = sim.choose(); sim.dh(); const released = sim.release();
    expect(released.attackShape).toEqual(shape); expect(released.ball.flight?.via).toBe('pass');
    sim.loose(); expect(sim.choose()).toBeUndefined(); expect(sim.draws).toBe(3);
    sim.control(); expect(sim.choose()).toBeUndefined();
    for (const end of ['kick','turn'] as const) {
      const s = new ShapeSim(); s.choose(); s.dh(); s.release(); s[end](); expect(s.choose()).toBeUndefined();
    }
    const controlled = new ShapeSim(); controlled.choose(); controlled.control(); controlled.choose(); expect(controlled.draws).toBe(1);
    const scripted = new ShapeSim(); scripted.plays(); expect(scripted.choose()).toBeUndefined(); expect(scripted.draws).toBe(0);
    const handover = new ShapeSim(); handover.handover(); expect(handover.choose()).toBeUndefined(); expect(handover.draws).toBe(0);
    const contact = new ShapeSim(); contact.contact(); const prepared = contact.choose(); contact.finishContact();
    const afterContact = contact.draws; expect(contact.choose()).toEqual(prepared); expect(contact.draws).toBe(afterContact);
    const last = new ShapeSim(); last.contact(true); expect(last.choose()).toBeUndefined(); expect(last.draws).toBe(0);
    const cancelContact = new ShapeSim(); cancelContact.contact(); cancelContact.choose(); cancelContact.control();
    expect(cancelContact.choose()).toBeUndefined(); expect(cancelContact.draws).toBe(1);
    const binned = new ShapeSim(); binned.force('pod',1); binned.bin(8); expect(binned.choose()).toBeUndefined();
    expect(binned.targets()[8]).toEqual(binned.man(8).binSpot);
    const sub = new ShapeSim(); sub.force('pod',1); sub.man(8).subFor = 0; expect(sub.choose()).toBeUndefined();
  });
  it('keeps the shapes-off main event fingerprint exactly', async () => {
    restore.push(applyTuning({'shapes.on':0,'longKick.on':0}));
    const sim = new LiveSim(sideSheet('H',{rating:60}),sideSheet('A',{rating:60}),1), parts:string[]=[];
    while(!sim.finished) { sim.step(); for(const e of sim.tickEvents) parts.push(`${e.tick}:${e.kind}:${e.side??''}:${e.detail??''}`); }
    const spec='node:crypto',{createHash}=await import(spec);
    expect(`${sim.points.home}-${sim.points.away}:${parts.length}:${createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16)}`).toBe('6-0:137:a3aab7b7c35c2c99');
  });
  it('preserves the original three structures with back-door off, without reads changing play', () => {
    restore.push(applyTuning({'shapes.backDoor.on':0}));
    class Probe extends LiveSim { packet() { return this.players.map(p=>({slot:p.slot,side:p.side,who:p.key,x:p.body.pos.x,y:p.body.pos.y,target:p.target,free:!this.locked(p)})); } }
    const home=labSheet(DEFAULT_HOME),away=labSheet(DEFAULT_AWAY),sim=new Probe(home,away,1),control=new LiveSim(home,away,1);
    const choices=new Map<number,NonNullable<ReturnType<typeof sim.snapshot>['attackShape']>>();
    let preservedReceptions=0;
    const seen=new Set<string>(); const settled = new Map<string,unknown>();
    for(let i=0;i<12000 && !sim.finished;i++) {
      sim.step();control.step(); const s=sim.snapshot();sim.snapshot(); expect(s).toEqual(control.snapshot());
      if(s.attackShape?.startedTick===s.tick) { seen.add(s.attackShape.kind); choices.set(s.tick,s.attackShape); }
      if(s.attackShape) expect(s.attackShape).toEqual(choices.get(s.attackShape.startedTick));
      if(s.tick===181 && s.ball.holder?.side==='away' && s.ball.holder.slot===7) { expect(s.attackShape?.startedTick).toBe(140); preservedReceptions++; }
      if(s.attackShape && s.ball.holder && s.players.some(p=>p.side===s.ball.holder!.side&&p.slot===s.ball.holder!.slot&&p.pose==='dummyHalf')) {
        const shape=s.attackShape, packet=sim.packet().filter(p=>p.side===shape.side&&packetSlots(shape.kind,shape.edge,shape.linkSlot).includes(p.slot));
        const max=Math.max(...packet.map(p=>Math.hypot(p.x-p.target.x,p.y-p.target.y)));
        if(max<3&&!settled.has(shape.kind)) settled.set(shape.kind,{tick:s.tick,shape,packet,max});
      }
    }
    expect(seen).toEqual(new Set(['spread','pod','edge']));
    expect(settled.has('pod')).toBe(true); expect(settled.has('edge')).toBe(true);
    expect(preservedReceptions).toBe(1);
  });
});
