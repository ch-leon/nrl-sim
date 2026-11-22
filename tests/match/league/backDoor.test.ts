import { afterEach, describe, expect, it } from 'vitest';
import { dist } from '../../../src/match/core/vec';
import { LiveSim } from '../../../src/match/league/live';
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
    this.players[7]!.body.pos={x:50-dir*3,y:34+edge*8};
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
    this.players[7]!.body.pos={x:50+this.dir,y:34+this.edge*8};
    const support = this.players[0]!;
    support.body.pos = { x: 50 - this.dir * 4, y: 34 + this.edge * 12 };
    support.body.vel = { x: 2.4 * this.dir, y: 3.2 * this.edge };
    support.body.heading = { x: 0.6 * this.dir, y: 0.8 * this.edge };
    this.players[9]!.body.pos={x:50+this.dir*3,y:34+this.edge*6};
  }
  decide(intercept=false) {
    if(intercept)this.players[9]!.body.pos={x:50-this.dir,y:34+this.edge*9.5};
    this.queue=[.5,.999,0,...(intercept?[0]:[])];
    this.stepPlay();this.prepareAttackShape();return this.snapshot();
  }
  catchFlight(spill = false) {
    if(this.ball.kind!=='flight'||this.ball.receiver===null)throw new Error('flight');
    this.tick=this.ball.t0+this.ball.ticks;
    this.players[this.ball.receiver]!.body.pos={...this.ball.to};
    this.queue=[spill ? 0 : .999];this.landings();this.prepareAttackShape();return this.snapshot();
  }
  next() {this.tick++;this.prepareAttackShape();return this.snapshot();}

  prepareLeadRead() {
    this.choose();
    this.run();
    const carrierY = this.man(4).body.pos.y;
    this.lineX = 50 + this.dir * 10;
    this.man(7).body.vel = { x: this.dir * 3, y: 0 };
    this.man(9).body.pos = { x: 50 + this.dir * 20, y: carrierY };
    this.man(12).body.pos = { x: 50 + this.dir * 3, y: carrierY };
    this.man(13).body.pos = { x: 50 + this.dir * 3, y: carrierY - this.edge * 2 };
    this.man(16).body.pos = { x: 50 + this.dir * 4, y: carrierY + this.edge * 4 };
    this.man(17).body.pos = { x: 50 + this.dir * 6, y: carrierY + this.edge * 4 };
  }

  holdOffsideReader() {
    const d = this.man(16);
    const eligible = new Map(this.side('away').filter(p => p !== d).map(p => [p, p.key]));
    this.retreat = { side: 'away', dir: this.dir, line: d.body.pos.x + this.dir, eligible, markers: new Map() };
  }

  holdMarker(index: number) {
    this.ruckPlayedAt = this.tick;
    this.markers = [index];
  }

  readingSlot() {
    return this.phase.kind === 'play' ? this.phase.shape?.leadRead?.defender.slot : undefined;
  }
}

function targetsWithoutLeadRead(sim: BackDoorSim) {
  const restore = applyTuning({ 'shapes.leadDecoy.on': 0 });
  try { return sim.targets(); } finally { restore(); }
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
      expect(targets[7]).toEqual({x:50+dir*3,y:26});expect(targets[0]).toEqual({x:50-dir*2,y:19});
      expect(sim.man(7).through).toBe(true);expect(sim.man(7).wantsSprint).toBe(true);
      expect(behindLead(sim.man(4).body.pos,targets[0]!,targets[7]!,dir)).toBe(true);
      const drifted={x:50+dir,y:26};
      expect(backDoorTarget(shape,7,drifted)!.y).toBe(26);expect(backDoorTarget(shape,0,drifted)!.y).toBe(19);
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
      expect(passed.ball.flight).toMatchObject({via:'pass',receiver:{side:'home',slot:0}});expect(passed.attackShape?.kind).toBe('back-door');
      expect(behindLead(passed.ball.flight!.from,passed.ball.flight!.to,sim.man(7).body.pos,dir)).toBe(true);
      expect(passed.events.some(e=>e.kind==='set-play')).toBe(false);
      const finish=sim.targets()[7];
      expect(finish).toEqual({x:50+dir*3,y:26});expect(sim.man(7).through).toBe(false);
      const caught=sim.catchFlight();expect(caught.ball.holder).toEqual({side:'home',slot:0});
      expect(caught.attackShape?.kind).toBe('back-door');expect(sim.targets()[7]).toEqual(finish);
      expect(sim.next().attackShape).toBeUndefined();
    }
  });

  it('leaves interceptions, invalid identities and genuine cancellations in control',()=>{
    const sim=new BackDoorSim();sim.choose();sim.run();const intercepted=sim.decide(true);
    expect(intercepted.ball.flight?.receiver?.side).toBe('away');expect(intercepted.attackShape).toBeUndefined();
    const spill = new BackDoorSim();
    spill.choose(); spill.run();
    expect(spill.decide().attackShape?.kind).toBe('back-door');
    const spilled = spill.catchFlight(true);
    expect(spilled.events.some(e => e.kind === 'error')).toBe(true);
    expect(spilled.ball.holder).toBeNull();
    expect(spilled.attackShape).toBeUndefined();
    for(const change of ['identity','locked','sub','bin'] as const) {
      const s=new BackDoorSim();s.choose();const p=s.man(7);
      if(change==='identity')p.key='replacement';if(change==='locked')p.lockUntil=200;if(change==='sub')p.subFor=0;if(change==='bin')p.binUntilS=1000;
      expect(s.choose().attackShape).toBeUndefined();
    }
  });

  it('takes the ball on the fly on both edges in both attacking directions', () => {
    for (const dir of [-1, 1] as const) for (const edge of [-1, 1] as const) {
      const sim = new BackDoorSim(dir, edge);
      expect(sim.choose().attackShape?.edge).toBe(edge);
      sim.run();
      const released = sim.decide(), flight = released.ball.flight!;
      expect(released.attackShape?.kind).toBe('back-door');
      const fullback = sim.man(0), atLaunch = { ...fullback.body.pos };
      expect((flight.from.x - flight.to.x) * dir).toBeGreaterThanOrEqual(SHAPES.backDoor.leadClearM);
      while (sim.tick < flight.arrivesTick - 1) sim.step();
      expect(fullback.through).toBe(true);
      expect(dist(fullback.body.pos, flight.to)).toBeLessThanOrEqual(LIVE.catchReach);
      sim.step();
      expect(sim.snapshot().ball.holder).toEqual({ side: 'home', slot: 0 });
      expect((fullback.body.pos.x - atLaunch.x) * dir).toBeGreaterThan(0);
      expect((fullback.body.pos.y - atLaunch.y) * edge).toBeGreaterThan(1);
      expect(fullback.body.vel.y * edge).toBeGreaterThan(2);
    }
  });

  it('leaves an ordinary pass behind the lead on the inside unmarked', () => {
    for (const edge of [-1, 1] as const) {
      const sim = new BackDoorSim(1, edge);
      sim.choose(); sim.run();
      sim.man(7).body.pos.y = 34 + edge * 4;
      sim.man(0).body.pos.y = 34;
      sim.man(0).body.vel.y *= -1;
      const released = sim.decide(), flight = released.ball.flight!;
      expect(flight.receiver?.slot).toBe(0);
      expect(behindLead(flight.from, flight.to, sim.man(7).body.pos, 1)).toBe(true);
      expect(released.attackShape).toBeUndefined();
    }
  });

  it('drops the sweep steering on cancellation and keeps the real pass in flight', () => {
    const sim = new BackDoorSim();
    sim.choose(); sim.run();
    const launched = sim.decide();
    const sweepTarget = sim.targets()[0];
    expect(launched.attackShape?.kind).toBe('back-door');
    sim.cancel();
    expect(sim.targets()[0]).not.toEqual(sweepTarget);
    expect(sim.snapshot().attackShape).toBeUndefined();
    expect(sim.snapshot().ball.flight).toEqual(launched.ball.flight);
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

describe('reading the back-door lead (#649)', () => {
  it('shades one eligible spare defender and returns him to his line on expiry', () => {
    for (const dir of [-1, 1] as const) for (const edge of [-1, 1] as const) {
      const sim = new BackDoorSim(dir, edge), control = new BackDoorSim(dir, edge);
      sim.prepareLeadRead();
      control.prepareLeadRead();
      const draws = sim.draws, normal = targetsWithoutLeadRead(control), shaded = sim.targets();
      const changed = shaded.flatMap((target, i) => dist(target, normal[i]!) > 0 ? [i] : []);
      expect(changed).toEqual([16]);
      const reader = sim.man(16);
      expect(shaded[16]).toEqual({ x: reader.body.pos.x, y: reader.body.pos.y - edge * 2 });
      expect(sim.snapshot().attackShape).not.toHaveProperty('leadRead');
      expect(sim.draws).toBe(draws);
      sim.tick += SHAPES.leadDecoy.readTicks;
      control.tick = sim.tick;
      expect(sim.targets()).toEqual(targetsWithoutLeadRead(control));
      expect(sim.readingSlot()).toBeUndefined();
      expect(sim.draws).toBe(draws);
    }
  });

  it('respects defensive duties and drops an invalidated read without choosing another man', () => {
    const towardAnother = ['held marker', 'retreating', 'locked', 'binned', 'interchanging', 'cooldown'] as const;
    for (const duty of towardAnother) {
      const sim = new BackDoorSim();
      sim.prepareLeadRead();
      const reader = sim.man(16);
      if (duty === 'held marker') sim.holdMarker(16);
      if (duty === 'retreating') sim.holdOffsideReader();
      if (duty === 'locked') reader.lockUntil = sim.tick + 1;
      if (duty === 'binned') reader.binUntilS = 1000;
      if (duty === 'interchanging') reader.subFor = 0;
      if (duty === 'cooldown') reader.cooldownUntil = sim.tick + 1;
      sim.targets();
      expect(sim.readingSlot(), duty).toBe(8);
      const standIn = sim.man(17);
      standIn.key = 'new player';
      sim.targets();
      expect(sim.readingSlot()).toBeUndefined();
    }
  });

  it('requires an actual run and releases the defender on the real pass or immediate contact', () => {
    const sim = new BackDoorSim();
    sim.prepareLeadRead();
    const lead = sim.man(7);
    lead.body.vel.x = -3;
    sim.targets();
    expect(sim.readingSlot()).toBeUndefined();
    lead.body.vel.x = 3;
    const shading = sim.targets()[16];
    expect(sim.readingSlot()).toBe(7);
    const launched = sim.decide();
    expect(launched.ball.flight).toMatchObject({ via: 'pass', receiver: { side: 'home', slot: 0 } });
    expect(behindLead(launched.ball.flight!.from, launched.ball.flight!.to, lead.body.pos, 1)).toBe(true);
    expect(launched.attackShape?.kind).toBe('back-door');
    expect(launched.attackShape).not.toHaveProperty('leadRead');
    expect(sim.targets()[16]).not.toEqual(shading);

    const early = new BackDoorSim();
    early.prepareLeadRead();
    early.man(4).catchTick = early.tick;
    early.man(12).body.pos = { x: 50.8, y: early.man(4).body.pos.y };
    early.targets();
    early.step();
    expect(early.snapshot().phase?.kind).toBe('tackle');
    expect(early.snapshot().contact?.defenders[0]?.slot).toBe(3);
    expect(early.readingSlot()).toBeUndefined();
  });

  it('with the read off preserves the revision 7 back-door event fingerprint', async () => {
    restores.push(applyTuning({ 'shapes.leadDecoy.on': 0 }));
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1);
    const rng = (sim as unknown as { rng: { next: () => number } }).rng;
    const next = rng.next.bind(rng);
    let draws = 0;
    rng.next = () => { draws++; return next(); };
    const parts: string[] = [];
    while (!sim.finished) {
      sim.step();
      for (const e of sim.tickEvents) parts.push(`${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`);
    }
    const spec = 'node:crypto', { createHash } = await import(spec);
    expect(`${sim.points.home}-${sim.points.away}:${parts.length}:${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}`).toBe('12-6:141:82d97834a1c52696');
    expect(draws).toBe(781); // revision 7 back-door match, lead read off, after the kickoff coin toss
  });
});
