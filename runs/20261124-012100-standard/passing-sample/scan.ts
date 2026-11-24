import { LiveSim } from '@repo/match/league/live';
import { labSheet } from '@repo/match/lab/sheets';
import { DEFAULT_ROTATION } from '@repo/match/league/bench';
import { FIELD_WIDTH } from '@repo/match/core/field';
import type { Side } from '@repo/match/core/snapshot';
import type { Player } from '@repo/match/league/live/types';

interface Point { x: number; y: number; }
interface Link {
  launch: number;
  from: Point;
  aim: Point;
  passer: string;
  passerSlot: number;
  receiver: string;
  receiverSlot: number;
  receiverIndex: number;
  caught?: number;
  at?: Point;
}
interface Passage {
  at: number;
  half: number;
  side: Side;
  dir: number;
  tackles: number;
  mark: Point;
  links: Link[];
}
const fixedFixtures = [
  [1, 'rival-reapers', 'rival-wolves'], [2, 'rival-brumbies', 'rival-mariners'],
  [3, 'rival-thunder', 'rival-cyclones'], [17, 'rival-diggers', 'rival-scorpions'],
  [42, 'rival-larrikins', 'rival-swagmen'], [139, 'rival-reapers', 'rival-crocs'],
  [226, 'rival-crocs', 'rival-diggers'], [271, 'rival-gulls', 'rival-drovers'],
] as const;
const fixtures: [number, string, string][] = process.env.FIXTURES
  ? process.env.FIXTURES.split(';').flatMap((item) => {
      const [seeds, home, away] = item.split(',');
      const [start, end = start] = seeds.split('-').map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => [start + i, home, away]);
    })
  : fixedFixtures.flatMap(([seed, home, away]) => [[seed, home, away], [seed, away, home]]);
const preserveTactics = process.env.CLUB_STYLE === '1';
const r = (point: Point): Point => ({ x: +point.x.toFixed(3), y: +point.y.toFixed(3) });
const third = (y: number): -1 | 0 | 1 => y <= FIELD_WIDTH / 3 ? -1 : y >= 2 * FIELD_WIDTH / 3 ? 1 : 0;
const winger = (p: Player, roster: ReadonlySet<string>) => (p.slot === 1 || p.slot === 2) && roster.has(p.key);

for (const [seed, home, away] of fixtures) {
  const sheet = (id: string) => ({
    ...labSheet(id, 'gen', preserveTactics ? {} : { attack: 'balanced', defence: 'slide' }),
    rotation: DEFAULT_ROTATION,
  });
  const h = sheet(home);
  const a = sheet(away);
  const rosterWingers = (s: typeof h) => new Set([...(s.roster ?? []), ...(s.bench ?? [])]
    .filter((m) => m.position === 'winger').map((m) => m.id ?? m.name));
  const wingIds = { home: rosterWingers(h), away: rosterWingers(a) };
  const sim = new LiveSim(h, a, seed, { energy: 1, weather: 'clear', calls: [] }) as any;
  let play: Passage | undefined;
  let flight: Link | undefined;
  const stats: Record<string, number> = {};
  const records: any[] = [];
  const count = (key: string, p: Passage) => {
    for (const sub of [key, `${key}:${p.side}:H${p.half}:dir${p.dir}`])
      stats[sub] = (stats[sub] ?? 0) + 1;
  };
  let results: { kind: string; report: any }[] = [];
  const finish = (tick: number, kind: string, y?: number) => {
    for (const { kind: outcome, report } of results) {
      if (process.env.RECORDS !== '1' && outcome !== 'crossWing') continue;
      records.push({ kind: outcome, ...report, end: { tick, kind, y } });
    }
    results = [];
  };

  for (let i = 0; i < 12000 && !sim.finished; i++) {
    const before = sim.phase.kind;
    const previousHolder = sim.holder() as Player | null;
    const previousBall = sim.ball;
    sim.step();
    const { phase, ball, tick, attacking, half, dir, tackles } = sim;
    const byRuck = before === 'ruck' && phase.kind === 'play';
    if (phase.kind !== 'play' || play?.side !== attacking) {
      if (play) finish(tick, phase.kind, previousHolder?.body.pos.y);
      play = undefined;
      flight = undefined;
    }
    if (byRuck) {
      play = { at: tick, half, dir, side: attacking, tackles, mark: r(sim.mark), links: [] };
      count('ruckPlays', play);
      if (third(play.mark.y) !== 0) count('edgeRucks', play);
      if (previousHolder?.slot === 6 && ball.kind !== 'flight') count('dummyHalfCarries', play);
    }
    if (!play) continue;
    if (phase.kind !== 'play') throw Error('passage persisted out of play');

    if (flight && ball.kind !== 'flight') {
      const holder = sim.holder() as Player | null;
      if (!holder || sim.players[flight.receiverIndex] !== holder || holder.key !== flight.receiver || holder.catchTick !== tick) {
        finish(tick, 'broken-chain');
        play = undefined;
        flight = undefined;
        continue;
      }
      const at = r(holder.body.pos);
      flight.caught = tick;
      flight.at = at;
      play.links.push(flight);
      flight = undefined;
      count('completedPasses', play);
      if (play.links.length === 1) {
        const edge = third(play.mark.y);
        const dy = at.y - play.mark.y;
        if (edge !== 0 && dy * edge < -4) count('firstInfield', play);
        if (edge !== 0 && dy * edge > 4) count('firstBlind', play);
      }
      if (winger(holder, wingIds[holder.side])) {
        const origin = third(play.mark.y), end = third(at.y);
        const dy = at.y - play.mark.y;
        count('wingCatches', play);
        const categories: string[] = [];
        if (origin !== 0 && end === -origin && play.links.length >= 2) categories.push('crossWing');
        if (Math.abs(dy) >= 14 && Math.abs(dy) < FIELD_WIDTH / 3 && play.links.length >= 2) categories.push('shortWing');
        if (end !== 0 && origin === 0 && Math.abs(dy) >= 14 && play.links.length >= 2) categories.push('middleToWing');
        if (origin !== 0 && end === origin && dy * origin > 4) categories.push('blindWing');
        for (const category of categories) {
          count(category, play);
          results.push({ kind: category, report: {
            ...play, links: play.links.map(({ receiverIndex, ...link }) => link),
            dy: +dy.toFixed(3), clock: sim.snapshot().clock, score: { ...sim.points },
          }});
        }
      }
    }
    if (ball.kind !== 'flight' || ball.t0 !== tick) continue;
    if (ball.via !== 'pass') {
      finish(tick, ball.via);
      play = undefined;
      flight = undefined;
      continue;
    }
    const target = sim.players[ball.receiver] as Player | undefined;
    if (!previousHolder || !target || previousHolder.side !== play.side || target.side !== play.side || (previousBall.kind === 'flight' && previousBall.via !== 'roll')) {
      finish(tick, 'broken-chain');
      play = undefined;
      flight = undefined;
      continue;
    }
    flight = {
      launch: tick, from: r(ball.from), aim: r(ball.to),
      passer: previousHolder.key, passerSlot: previousHolder.slot,
      receiver: target.key, receiverSlot: target.slot, receiverIndex: ball.receiver,
    };
    count('attemptedPasses', play);
  }
  finish(sim.tick, sim.phase.kind);
  if (!sim.finished) throw Error(`did not reach full time: ${home} ${away} ${seed}`);
  console.log(JSON.stringify({
    seed, home, away, homeName: h.name, awayName: a.name,
    homeTactics: h.tactics, awayTactics: a.tactics, fullTime: sim.tick,
    score: sim.points, stats, records,
  }));
}
