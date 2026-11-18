import { afterEach, describe, expect, it } from 'vitest';
import { Runner } from '../../../src/match/core/engine';
import { BODY_RADIUS } from '../../../src/match/core/body';
import { toFieldPt } from '../../../src/match/core/field';
import { dist } from '../../../src/match/core/vec';
import type { ContactPlayer, Snapshot } from '../../../src/match/core/snapshot';
import { fieldToWorldPoint } from '../../../src/scenes/matchField';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { LEGS_ENERGY } from '../../../src/match/league/fatigue';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import { SHAPES, backDoorTarget, behindLead, packetSlots, shapeTarget } from '../../../src/match/league/attackingShapes';
import { LIVE } from '../../../src/match/league/live/knobs';

const restores: (()=>void)[]=[];
afterEach(()=>{ while(restores.length) restores.pop()!(); });

class BackDoorSim extends LiveSim {
  draws=0;
  queue:number[]=[];
  constructor(dir:1|-1=1, private readonly edge:1|-1=-1) {
    super(sideSheet('H',{rating:60,tactics:{attack:'expansive'}}),sideSheet('A',{rating:60}),649);
    this.tick=100; this.dir=dir; this.attacking='home'; this.tackles=1; this.mark={x:50,y:34};
    for(const p of this.players) { p.body.pos={x:50-dir*25,y:60}; p.body.vel={x:0,y:0}; p.lockUntil=0; p.busyUntil=0; p.pose='run'; }
    this.players[3]!.body.pos={...this.mark}; this.players[3]!.lockUntil=120;
    this.players[4]!.body.pos={x:50-dir*4,y:34+edge*6};
    this.players[7]!.body.pos={x:50-dir*3,y:34+edge*4};
    this.players[0]!.body.pos={x:50-dir*6,y:34};
    this.players[6]!.body.pos={x:50-dir*1.6,y:34.4};
    this.phase={kind:'ruck',t0:100,carrier:3,tackler:9,stage:'down',handover:false,heldAt:0,down:10,pace:null};
    this.ball={kind:'held',by:3};
    this.rng.next=()=>{this.draws++;return this.queue.shift()??.999;};
  }
  choose() { this.prepareAttackShape(); return this.snapshot(); }
  targets() { this.assignTargets(); return this.players.map(p=>({...p.target})); }
  man(i:number) { return this.players[i]!; }
  readyToHeel() {
    if (this.phase.kind !== 'ruck') throw new Error('ruck');
    this.phase.stage = 'ptb';
    this.phase.t0 = this.tick - LIVE.ptbTicks + 1;
  }
  dh() { if(this.phase.kind==='ruck') {this.phase.stage='dh';this.phase.heldAt=100;} this.ball={kind:'held',by:6};this.players[6]!.pose='dummyHalf'; }
  ruckAt(tick:number) {this.tick=tick;if(this.phase.kind==='ruck')this.stepRuck(this.phase);this.prepareAttackShape();return this.snapshot();}
  cancel() {this.cancelRuckDecision();this.prepareAttackShape();}
  run() {
    const shape=this.snapshot().attackShape!;
    if(this.phase.kind==='ruck')this.phase={kind:'play',shape};
    this.ball={kind:'held',by:4};
    for(const p of this.players) {p.body.pos={x:50-this.dir*25,y:60};p.lockUntil=0;p.pose='run';}
    this.players[4]!.body.pos={x:50,y:34+this.edge*6};this.players[4]!.catchTick=this.tick-LIVE.passCooldown;this.players[4]!.decided=false;
    this.players[7]!.body.pos={x:50+this.dir,y:34+this.edge*4};
    this.players[0]!.body.pos={x:50-this.dir*3,y:34};
    this.players[9]!.body.pos={x:50+this.dir*3,y:34+this.edge*6};
  }
  decide(intercept=false) {
    if(intercept)this.players[9]!.body.pos={x:50-this.dir,y:30.5};
    this.queue=[.5,.999,0,...(intercept?[0]:[])];
    this.stepPlay();this.prepareAttackShape();return this.snapshot();
  }
  catchFlight() {
    if(this.ball.kind!=='flight'||this.ball.receiver===null)throw new Error('flight');
    this.tick=this.ball.t0+this.ball.ticks;
    this.players[this.ball.receiver]!.body.pos={...this.ball.to};
    this.queue=[.999];this.landings();this.prepareAttackShape();return this.snapshot();
  }
  next() {this.tick++;this.prepareAttackShape();return this.snapshot();}
  stepInput() { this.controlList.push({ tick: this.tick + 1, side: 'home', kind: 'step-up' }); }
  passFromFullback() { this.pass(this.man(0), this.man(5)); }
}

describe('ordinary back-door option (#649)',()=>{
  it('prepares exact reachable identities once and snapshots cannot mutate future play',()=>{
    const sim=new BackDoorSim(),control=new BackDoorSim();
    const s=sim.choose(),original=control.choose();
    expect(s.attackShape).toMatchObject({kind:'back-door',backDoor:{caller:{slot:4},lead:{slot:7},support:{slot:0},originY:34}});
    expect(sim.draws).toBe(1);
    const b=s.attackShape!.backDoor!;
    b.caller.who='different';b.lead.slot=8;b.support.side='away';b.originY=1000;
    expect(sim.snapshot()).toEqual(original);
    sim.targets();sim.snapshot();expect(sim.draws).toBe(1);
    for(let i=0;i<8;i++){sim.step();control.step();expect(sim.snapshot()).toEqual(control.snapshot());}
  });

  it('holds authored lanes in both directions, with real support behind the lead and no teleport',()=>{
    for(const dir of [-1,1] as const) {
      const sim=new BackDoorSim(dir),shape=sim.choose().attackShape!;
      const prepared=sim.targets();
      for(const slot of packetSlots(shape.kind,shape.edge,shape.linkSlot,shape.backDoor)) expect(prepared[slot]).toEqual(shapeTarget(shape,slot,{x:50,y:34}));
      sim.run();const before=sim.man(7).body.pos,targets=sim.targets();
      expect(sim.man(7).body.pos).toEqual(before);
      expect(targets[7]).toEqual({x:50+dir*2,y:30});expect(targets[0]).toEqual({x:50-dir*3,y:34});
      expect(sim.man(7).through).toBe(true);expect(sim.man(7).wantsSprint).toBe(true);
      expect(behindLead(sim.man(4).body.pos,targets[0]!,targets[7]!,dir)).toBe(true);
      const drifted={x:50+dir,y:26};
      expect(backDoorTarget(shape,7,drifted)!.y).toBe(30);expect(backDoorTarget(shape,0,drifted)!.y).toBe(34);
    }
  });

  it('respects the actual early DH commitment and ends an alternative or cancelled choice without a reroll',()=>{
    for (const dir of [-1, 1] as const) {
      const sim=new BackDoorSim(dir);sim.choose();sim.dh();sim.queue=[0,.999];
      const called=sim.ruckAt(102);expect(called.passCall?.to.slot).toBe(4);
      const released=sim.ruckAt(106);expect(released.ball.flight?.receiver?.slot).toBe(4);expect(released.attackShape?.kind).toBe('back-door');
      const other=new BackDoorSim(dir);other.choose();other.dh();other.queue=[.999,.999];
      const alternative=other.ruckAt(106);expect(alternative.ball.flight?.receiver?.slot).toBe(7);expect(alternative.attackShape).toBeUndefined();
      const cancelled=new BackDoorSim(dir);cancelled.choose();const draws=cancelled.draws;cancelled.cancel();
      expect(cancelled.choose().attackShape).toBeUndefined();expect(cancelled.draws).toBe(draws);
    }
  });

  it('moves the lead ahead of the half on the heel before DH release in both directions', () => {
    for (const dir of [-1, 1] as const) {
      const sim = new BackDoorSim(dir), caller = sim.man(4), lead = sim.man(7);
      lead.body.pos.x = caller.body.pos.x;
      const beforeHeel = lead.body.pos.x;
      expect(sim.choose().attackShape?.backDoor?.lead.slot).toBe(7);
      sim.readyToHeel();
      sim.queue = [.999, 0, .999]; // legal PTB, ordinary weighted choice, no dart
      sim.step();
      expect(sim.snapshot().ball.flight?.via).toBe('roll');
      const releaseTick = sim.tick + LIVE.rollTicks + LIVE.dhHoldTicks;
      while (sim.tick < releaseTick - 1) sim.step();
      expect(sim.snapshot().passCall?.to.slot).toBe(4);
      expect((lead.body.pos.x - beforeHeel) * dir).toBeGreaterThan(0);
      expect((lead.body.pos.x - caller.body.pos.x) * dir).toBeGreaterThanOrEqual(SHAPES.backDoor.leadClearM);
      expect(lead.body.vel.x * dir).toBeGreaterThan(0);
      sim.step();
      expect(sim.snapshot().ball.flight).toMatchObject({ via: 'pass', receiver: { side: 'home', slot: 4 } });
    }
  });

  it('uses the ordinary decision and pass, keeps the lead finish through second catch, then releases',()=>{
    for(const dir of [-1,1] as const) {
      const sim=new BackDoorSim(dir);sim.choose();sim.run();sim.targets();
      const passed=sim.decide();
      expect(passed.ball.flight).toMatchObject({via:'pass',receiver:{side:'home',slot:0},backDoor:{lead:{side:'home',slot:7}}});
      expect(behindLead(passed.ball.flight!.from,passed.ball.flight!.to,sim.man(7).body.pos,dir)).toBe(true);
      expect(passed.events.some(e=>e.kind==='set-play')).toBe(false);
      const finish=sim.targets()[7];
      expect(finish).toEqual({x:50+dir*2,y:30});expect(sim.man(7).through).toBe(false);
      const caught=sim.catchFlight();expect(caught.ball.holder).toEqual({side:'home',slot:0});
      expect(caught.attackShape?.kind).toBe('back-door');expect(sim.targets()[7]).toEqual(finish);
      expect(sim.next().attackShape).toBeUndefined();
    }
  });

  it('leaves interceptions, invalid identities and genuine cancellations in control',()=>{
    const sim=new BackDoorSim();sim.choose();sim.run();const intercepted=sim.decide(true);
    expect(intercepted.ball.flight?.receiver?.side).toBe('away');expect(intercepted.ball.flight?.backDoor).toBeUndefined();expect(intercepted.attackShape).toBeUndefined();
    for(const change of ['identity','locked','sub','bin'] as const) {
      const s=new BackDoorSim();s.choose();const p=s.man(7);
      if(change==='identity')p.key='replacement';if(change==='locked')p.lockUntil=200;if(change==='sub')p.subFor=0;if(change==='bin')p.binUntilS=1000;
      expect(s.choose().attackShape).toBeUndefined();
    }
  });

  it('keeps the fullback moving goalward and toward the packet edge until the sweep expires', () => {
    const sweepTicks = 6;
    restores.push(applyTuning({ 'shapes.backDoor.sweepTicks': sweepTicks }));
    for (const dir of [-1, 1] as const) for (const edge of [-1, 1] as const) {
      const sim = new BackDoorSim(dir, edge);
      expect(sim.choose().attackShape?.edge).toBe(edge);
      sim.run();
      const flight = sim.decide().ball.flight!;
      expect(flight.backDoor).toBeDefined();
      while (sim.tick < flight.arrivesTick) sim.step();
      expect(sim.snapshot().ball.holder).toEqual({ side: 'home', slot: 0 });
      const carrier = sim.man(0), atCatch = { ...carrier.body.pos };
      const target = { x: flight.to.x + dir * LIVE.runOnM, y: flight.to.y + edge * SHAPES.backDoor.sweepWidthM };
      expect(carrier.target).toEqual(target);
      while (sim.tick < flight.arrivesTick + sweepTicks - 1) sim.step();
      expect((carrier.body.pos.x - atCatch.x) * dir).toBeGreaterThan(0);
      expect((carrier.body.pos.y - atCatch.y) * edge).toBeGreaterThan(0);
      expect(carrier.target).toEqual(target);
      expect(dist(carrier.body.pos, target)).toBeGreaterThan(BODY_RADIUS);
      sim.step();
      expect(carrier.target).not.toEqual(target);
      expect(sim.snapshot().ball.holder).toEqual({ side: 'home', slot: 0 });
    }
  });

  it('releases the carry target on arrival, manual input, a pass or contact', () => {
    for (const ending of ['arrival', 'control', 'pass', 'contact'] as const) {
      const sim = new BackDoorSim();
      sim.choose();
      sim.run();
      sim.decide();
      const caught = sim.catchFlight(), target = sim.targets()[0];
      expect(caught.ball.holder).toEqual({ side: 'home', slot: 0 });
      const carrier = sim.man(0);
      if (ending === 'arrival') carrier.body.pos = { x: target!.x - BODY_RADIUS / 2, y: target!.y };
      if (ending === 'control') sim.stepInput();
      if (ending === 'pass') sim.passFromFullback();
      if (ending === 'contact') sim.man(9).body.pos = { x: carrier.body.pos.x + 0.6, y: carrier.body.pos.y };
      sim.step();
      expect(carrier.target).not.toEqual(target);
      if (ending === 'arrival' || ending === 'control') expect(sim.snapshot().ball.holder?.slot).toBe(0);
      if (ending === 'pass') expect(sim.snapshot().ball.flight?.source?.player.slot).toBe(0);
      if (ending === 'contact') expect(sim.snapshot().phase?.kind).toBe('tackle');
    }
  });

  it('runs the natural seed 5 Lab passage from heel to fullback catch', () => {
    const runner = new Runner(seed => new LiveSim(
      { ...labSheet(DEFAULT_HOME), rotation: 'standard' },
      { ...labSheet(DEFAULT_AWAY), rotation: 'standard' },
      seed, { energy: LEGS_ENERGY.fresh, weather: 'clear', calls: [] },
    ), 5);
    const at = (tick: number): Snapshot => {
      while (!runner.finished && runner.tick < tick) runner.step();
      expect(runner.tick).toBe(tick);
      return runner.cur;
    };
    const player = (snap: Snapshot, ref: ContactPlayer) => {
      const p = snap.players.find(p => p.side === ref.side && p.slot === ref.slot);
      expect(p?.who).toBe(ref.who);
      return p!;
    };
    runner.seek(4291);
    const heel = runner.cur;
    expect(heel.ball.flight?.via).toBe('roll');
    const shape = heel.attackShape!;
    expect(shape.kind).toBe('back-door');
    const { caller, lead, support } = shape.backDoor!;
    const called = at(4297);
    expect(called.passCall?.to).toEqual(caller);
    const ready = at(4300);
    expect((player(ready, lead).x - player(heel, lead).x) * shape.dir).toBeGreaterThan(0);
    expect((player(ready, lead).x - player(ready, caller).x) * shape.dir).toBeGreaterThan(SHAPES.backDoor.leadClearM);
    expect(at(4301).ball.flight).toMatchObject({ via: 'pass', receiver: caller });
    expect(at(4309).ball.holder).toEqual({ side: caller.side, slot: caller.slot });
    const before = at(4321), launched = at(4322), flight = launched.ball.flight!;
    expect(flight).toMatchObject({ via: 'pass', startedTick: 4322, source: { player: caller }, receiver: support, backDoor: { lead } });
    expect(behindLead(flight.from, flight.to, player(before, lead), shape.dir)).toBe(true);
    runner.update(1000);
    expect(runner.cur).toBe(launched);
    const edited = runner.current.snapshot();
    edited.ball.flight!.backDoor!.lead.who = 'changed';
    edited.attackShape!.backDoor!.caller.who = 'changed';
    edited.attackShape!.backDoor!.lead.slot = 8;
    edited.attackShape!.backDoor!.support.side = 'away';
    expect(runner.current.snapshot()).toEqual(launched);
    const caught = at(flight.arrivesTick);
    expect(caught.ball.holder).toEqual({ side: support.side, slot: support.slot });
    expect(caught.attackShape?.backDoor).toEqual(shape.backDoor);
    expect(at(caught.tick + 1).attackShape).toBeUndefined();
    const swept = at(4346);
    const screenX = (s: Snapshot) => {
      const { fx, fy } = toFieldPt(player(s, support));
      return fieldToWorldPoint(fx, fy, 0).x;
    };
    expect(swept.ball.holder).toEqual({ side: support.side, slot: support.slot });
    expect(screenX(swept)).toBeGreaterThan(screenX(caught));
    expect((player(swept, support).y - player(caught, support).y) * shape.edge).toBeGreaterThan(0);
    const straightening = at(4350);
    expect(player(straightening, support).headY! * shape.edge).toBeGreaterThan(0);
    expect(Math.abs(player(straightening, support).headX)).toBeGreaterThan(Math.abs(player(swept, support).headX));
    runner.seek(heel.tick);
    expect(runner.cur).toEqual(heel);
    expect(at(launched.tick)).toEqual(launched);
    expect(at(caught.tick)).toEqual(caught);
    expect(at(swept.tick)).toEqual(swept);
    expect(at(straightening.tick)).toEqual(straightening);
  });

  it('off preserves the preceding ordinary-shapes event and RNG fingerprint exactly',async()=>{
    restores.push(applyTuning({'shapes.backDoor.on':0}));
    const sim=new LiveSim(sideSheet('H',{rating:60}),sideSheet('A',{rating:60}),1),parts:string[]=[];
    const rng=(sim as unknown as {rng:{next:()=>number}}).rng,next=rng.next.bind(rng);let draws=0;
    rng.next=()=>{draws++;return next();};
    while(!sim.finished){sim.step();for(const e of sim.tickEvents)parts.push(`${e.tick}:${e.kind}:${e.side??''}:${e.detail??''}`);}
    const spec='node:crypto',{createHash}=await import(spec);
    expect(`${sim.points.home}-${sim.points.away}:${parts.length}:${createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16)}`).toBe('0-8:138:a3c50b2b797e77b1');
    expect(draws).toBe(842); // preceding engine, after the kickoff coin toss
  });
});
