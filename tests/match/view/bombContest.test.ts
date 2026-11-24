import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import type { Side, Snapshot } from '../../../src/match/core/snapshot';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { highBall, KICK_CONTEST } from '../../../src/match/league/kickContest';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import type { KickChoice } from '../../../src/match/league/tactics';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import { pictureContext, playerPicture, type PlayerPicture } from '../../../src/match/view/playerPicture';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';

type Outcome = 'caught' | 'contest' | 'knock-on';

/** Fix the positions and the draw so kick-planning changes cannot move these cases to another tick. */
class KickFixture extends LiveSim {
  constructor(private readonly lateChaser = false) {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1);
  }

  protected override assignTargets(): void {}
  protected override stepPlay(): void {}
  protected override move(): void {
    const b = this.ball;
    if (b.kind !== 'flight' || b.via !== 'kick') return;
    const left = b.t0 + b.ticks - this.tick;
    if (left === 4) this.at('home', 0).body.pos.x += .25;
    if (left === 1 && this.lateChaser) this.at('home', 1).body.pos.x = b.to.x - .2;
  }

  kick(outcome: Outcome, kind: KickChoice = 'bomb', { lone = false, kickoff = false } = {}) {
    this.tick = 100;
    this.phase = { kind: 'play' };
    const chaser = this.at('home', 0), catcher = this.at('away', 0), kicker = this.at('home', 5);
    const to = { x: 50, y: 34 };
    for (const player of this.players) {
      player.body.pos = { x: 24, y: 6 + player.slot * 6 };
      player.body.vel = { x: 0, y: 0 };
      player.pose = 'idle';
    }
    kicker.body.pos = { x: 30, y: to.y };
    catcher.body.pos = { x: to.x + .5, y: to.y };
    if (!lone) chaser.body.pos = { x: to.x - 1.2, y: to.y };
    if (this.lateChaser) this.at('home', 1).body.pos = { x: to.x - 2, y: to.y };
    const peak = kind === 'bomb' ? KICK_CONTEST.bomb.peak : kickoff ? 20 : 12;
    const odds = highBall(chaser.stats.speed, catcher.stats.handling, peak, false);
    const rolls = outcome === 'contest' ? [0] : outcome === 'knock-on' ? [odds.won + odds.spill / 2, .2, .8] : [.99];
    this.rng.next = () => rolls.shift() ?? .99;
    this.pendingKick = { at: this.tick + 1, kicker: this.indexOf(kicker), to, receiver: this.indexOf(catcher), peak, kickoff, kind };
    this.step();
    const launch = this.snapshot();
    const arrives = launch.ball.flight!.arrivesTick;
    const frames = new Map([[launch.tick, launch]]);
    while (this.tick < arrives + 7) {
      this.step();
      frames.set(this.tick, this.snapshot());
    }
    return (offset: number) => frames.get(arrives + offset)!;
  }
}

function pictures(snap: Snapshot, previous: Snapshot): PlayerPicture[] {
  const context = pictureContext(snap, previous);
  return snap.players.map(p => playerPicture(p, previous.players.find(q => q.side === p.side && q.slot === p.slot) ?? p,
    snap.tick, snap.ball.holder, 1, context));
}

function jumpers(snap: Snapshot, previous: Snapshot): PlayerPicture[] {
  return pictures(snap, previous).filter(p => p.action === 'bombContest');
}

describe('contested open-play bombs', () => {
  it.each<Outcome>(['caught', 'contest', 'knock-on'])('connects the grounded plant, reach and the actual %s', outcome => {
    const at = new KickFixture().kick(outcome);
    const cue = at(-1).bombContest!;
    expect(cue.arrivesTick).toBe(at(0).tick);
    expect(cue.releasedTick).toBeUndefined();
    expect(cue.players.map(p => [p.side, p.slot])).toEqual([['home', 0], ['away', 0]]);
    expect(cue.players.every(p => Math.hypot(p.x - cue.at.x, p.y - cue.at.y) <= KICK_CONTEST.bomb.contestM)).toBe(true);
    expect(jumpers(at(-5), at(-6))).toEqual(Array.from({ length: 2 }, () => expect.objectContaining({ frame: 0, lift: 0, possession: false })));
    const reach = jumpers(at(-1), at(-2));
    expect(new Set(reach.map(p => p.frame))).toEqual(new Set([1, 2]));
    expect(reach.every(p => p.lift! > 0 && !p.possession)).toBe(true);
    expect(at(-1).ball.holder).toBeNull();

    expect(at(0).events).toEqual(expect.arrayContaining([expect.objectContaining({ detail: outcome })]));
    const holder = outcome === 'caught' ? { side: 'away', slot: 0 } : outcome === 'contest' ? { side: 'home', slot: 0 } : null;
    expect(at(0).ball.holder).toEqual(holder);
    const landing = pictures(at(0), at(-1));
    expect(landing.some(p => p.action === 'airCatch')).toBe(false);
    const gathers = landing.filter(p => p.possession);
    if (holder) {
      const player = at(0).players.find(p => p.side === holder.side && p.slot === holder.slot)!;
      expect(gathers).toEqual([expect.objectContaining({ who: player.who, action: 'bombContest', frame: 2 })]);
    } else expect(gathers).toHaveLength(0);
    expect(jumpers(at(3), at(2))).toEqual(Array.from({ length: 2 }, () => expect.objectContaining({ frame: 4, lift: 0 })));
    expect(jumpers(at(7), at(6))).toHaveLength(0);
  });

  it('keeps the feet planted and draws one ball through a catch or spill', () => {
    const fieldToWorld = (x: number, y: number) => fieldToWorldPoint(x, y, fieldOffsetX());
    const poses = new Map<string, PlayerPicture>();
    const ground = new Map<string, { x: number; y: number }>();
    const actors = (side: Side): ActorView[] => Array.from({ length: 9 }, (_, slot) => ({
      place: (x, y) => void ground.set(`${side}/${slot}`, { x, y }),
      play: () => {},
      paint: picture => void poses.set(`${side}/${slot}`, picture),
    }));
    let visible = false, lift = 0;
    const view = new LiveView({ players: { home: actors('home'), away: actors('away') }, fieldToWorld, ball: {
      place: (_x, _y, l) => { lift = l; }, setRendered: v => { visible = v; },
    } });
    for (const outcome of ['caught', 'knock-on'] as const) {
      const at = new KickFixture().kick(outcome);
      const draw = (offset: number) => view.draw(at(offset - 1), at(offset), 1);
      const keys = ['home/0', 'away/0'];
      draw(-5);
      const feet = keys.map(key => ground.get(key));
      draw(-4);
      expect(keys.map(key => ground.get(key))).toEqual(feet);
      draw(-1);
      expect(keys.every(key => poses.get(key)!.lift! > 0)).toBe(true);
      expect(visible).toBe(true);
      expect(lift).toBeGreaterThan(30);
      expect([...poses.values()].filter(p => p.possession)).toHaveLength(0);
      draw(0);
      expect(visible).toBe(outcome === 'knock-on');
      expect([...poses.values()].filter(p => p.possession)).toHaveLength(outcome === 'knock-on' ? 0 : 1);
      if (outcome === 'knock-on') {
        const spilledAt = lift;
        draw(3);
        expect(visible).toBe(true);
        expect(lift).toBeLessThan(spilledAt);
      }
    }
  });

  it('lands the pair and shows a late winner on his feet without a third jump', () => {
    const at = new KickFixture(true).kick('contest');
    expect(at(-1).bombContest!.players[0]).toMatchObject({ side: 'home', slot: 0 });
    expect(at(0).ball.holder).toEqual({ side: 'home', slot: 1 });
    const take = pictures(at(0), at(-1)).find(p => p.possession);
    expect(take).toMatchObject({ who: at(0).players.find(p => p.side === 'home' && p.slot === 1)!.who, action: 'catch', lift: 0 });
    expect(jumpers(at(0), at(-1))).toEqual(Array.from({ length: 2 }, () => expect.objectContaining({ possession: false })));
  });

  it('keeps the ordinary reception on a lone bomb, punts and kick-offs, and leaves grubbers on the ground', () => {
    for (const [kind, options] of [['bomb', { lone: true }], ['long', {}], ['long', { kickoff: true }], ['grubber', {}]] as const) {
      const at = new KickFixture().kick('caught', kind, options);
      expect(at(-1).bombContest).toBeUndefined();
      expect(at(0).bombContest).toBeUndefined();
      expect(pictures(at(0), at(-1)).filter(p => p.possession)).toEqual([expect.objectContaining({ action: kind === 'grubber' ? 'catch' : 'airCatch' })]);
    }
  });

  it('stages a contested catch in ordinary match play using the sim snapshots', () => {
    // Diggers v Scorpions seed 27 stages a catch at 495. The lab's seed 1 stages one at 554.
    // The open-play dummy moves the earlier fixtures. With it off, Diggers seed 19 and the
    // lab's seed 26 still stage. Seed 20 was listed after those two, so the old test returned
    // before playing it.
    const fixtures = [
      { home: 'rival-diggers', away: 'rival-scorpions', seed: 27 },
      { home: DEFAULT_HOME, away: DEFAULT_AWAY, seed: 1 },
    ];
    const stage = (home: string, away: string, seed: number): boolean => {
      const sim = new LiveSim(labSheet(home), labSheet(away), seed);
      let prev = sim.snapshot();
      let before = prev;
      while (!sim.finished && sim.tick < 3000) {
        sim.step();
        const snap = sim.snapshot();
        if (prev.bombContest?.arrivesTick === snap.tick && snap.events.some(e => e.kind === 'set-start' && e.detail === 'caught')) {
          const reach = jumpers(prev, before);
          if (reach.length === 2 && reach.every(p => p.lift! > 0) && jumpers(snap, prev).some(p => p.possession)) return true;
        }
        before = prev;
        prev = snap;
      }
      return false;
    };
    for (const { home, away, seed } of fixtures) expect(stage(home, away, seed), `${home} ${seed}`).toBe(true);
    const restore = applyTuning({ 'live.dummyChance': 0 });
    try {
      expect(stage('rival-diggers', 'rival-scorpions', 19)).toBe(true);
      expect(stage(DEFAULT_HOME, DEFAULT_AWAY, 26)).toBe(true);
    } finally { restore(); }
  });
});
