import { afterEach, describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import { backDoorTarget, behindLead, packetSlots, shapeTarget } from '../../../src/match/league/attackingShapes';
import { LIVE } from '../../../src/match/league/live/knobs';

const restores: (()=>void)[]=[];
afterEach(()=>{ while(restores.length) restores.pop()!(); });

class BackDoorSim extends LiveSim {
  draws=0;
  queue:number[]=[];
  constructor(dir:1|-1=1) {
    super(sideSheet('H',{rating:60,tactics:{attack:'expansive'}}),sideSheet('A',{rating:60}),649);
    this.tick=100; this.dir=dir; this.attacking='home'; this.tackles=1; this.mark={x:50,y:34};
    for(const p of this.players) { p.body.pos={x:50-dir*25,y:60}; p.body.vel={x:0,y:0}; p.lockUntil=0; p.busyUntil=0; p.pose='run'; }
    this.players[3]!.body.pos={...this.mark}; this.players[3]!.lockUntil=120;
    this.players[4]!.body.pos={x:50-dir*4,y:28};
    this.players[7]!.body.pos={x:50-dir*3,y:30};
    this.players[0]!.body.pos={x:50-dir*6,y:34};
    this.players[6]!.body.pos={x:50-dir*1.6,y:34.4};
    this.phase={kind:'ruck',t0:100,carrier:3,tackler:9,stage:'down',handover:false,heldAt:0,down:10,pace:null};
    this.ball={kind:'held',by:3};
    this.rng.next=()=>{this.draws++;return this.queue.shift()??.999;};
  }
  choose() { this.prepareAttackShape(); return this.snapshot(); }
  targets() { this.assignTargets(); return this.players.map(p=>({...p.target})); }
  man(i:number) { return this.players[i]!; }
  dh() { if(this.phase.kind==='ruck') {this.phase.stage='dh';this.phase.heldAt=100;} this.ball={kind:'held',by:6};this.players[6]!.pose='dummyHalf'; }
  ruckAt(tick:number) {this.tick=tick;if(this.phase.kind==='ruck')this.stepRuck(this.phase);this.prepareAttackShape();return this.snapshot();}
  cancel() {this.cancelRuckDecision();this.prepareAttackShape();}
  run() {
    const shape=this.snapshot().attackShape!;
    if(this.phase.kind==='ruck')this.phase={kind:'play',shape};
    this.ball={kind:'held',by:4};
    for(const p of this.players) {p.body.pos={x:50-this.dir*25,y:60};p.lockUntil=0;p.pose='run';}
    this.players[4]!.body.pos={x:50,y:28};this.players[4]!.catchTick=this.tick-LIVE.passCooldown;this.players[4]!.decided=false;
    this.players[7]!.body.pos={x:50+this.dir,y:30};
    this.players[0]!.body.pos={x:50-this.dir*3,y:34};
    this.players[9]!.body.pos={x:50+this.dir*3,y:28};
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
    const sim=new BackDoorSim();sim.choose();sim.dh();sim.queue=[0,.999];
    const called=sim.ruckAt(102);expect(called.passCall?.to.slot).toBe(4);
    const released=sim.ruckAt(106);expect(released.ball.flight?.receiver?.slot).toBe(4);expect(released.attackShape?.kind).toBe('back-door');
    const other=new BackDoorSim();other.choose();other.dh();other.queue=[.999,.999];
    const alternative=other.ruckAt(106);expect(alternative.ball.flight?.receiver?.slot).toBe(7);expect(alternative.attackShape).toBeUndefined();
    const cancelled=new BackDoorSim();cancelled.choose();const draws=cancelled.draws;cancelled.cancel();
    expect(cancelled.choose().attackShape).toBeUndefined();expect(cancelled.draws).toBe(draws);
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
