import { describe, expect, it } from 'vitest';
import { playerPicture } from '../../../src/match/view/playerPicture';
import type { PlayerSnap } from '../../../src/match/core/snapshot';
const p: PlayerSnap = { side: 'home', slot: 0, who: 'captain', x: 50, y: 20, pose: 'kick', headX: 1, speed: 0 };
const holder = { side: 'home' as const, slot: 0 };
describe('big-moment sampling', () => {
  it('strikes when possession leaves the boot, including immediate goal kicks', () => {
    const k = { ...p, poseUntil: 108, kick: { startedTick: 100, strikeTick: 103, untilTick: 108, kind: 'punt' as const } };
    expect([100, 101, 102].map(t => playerPicture(k, k, t, holder, 1).frame)).toEqual([0, 1, 2]);
    expect(playerPicture(k, k, 103, null, 1)).toMatchObject({ frame: 3, possession: false });
    expect(playerPicture(k, k, 107, null, 1).frame).toBe(5);
    expect(playerPicture({ ...k, kick: { ...k.kick, kind: 'grubber' } }, k, 103, null, 1).action).toBe('grubberKick');
    expect(playerPicture({ ...k, kick: { ...k.kick, kind: 'drop', strikeTick: 100 } }, k, 100, null, 1)).toMatchObject({ action: 'dropKick', frame: 3, possession: false });
  });
  it('shows a high take only for the actual successful reception and yields to contact', () => {
    const caught = { ...p, pose: 'catch', caughtTick: 100, aerialCatchTick: 100 };
    expect(playerPicture(caught, caught, 101, holder, 1)).toMatchObject({ action: 'airCatch', lift: 6 });
    expect(playerPicture(caught, caught, 101, null, 1).action).not.toBe('airCatch');
    expect(playerPicture({ ...caught, aerialCatchTick: 99 }, caught, 101, holder, 1).action).not.toBe('airCatch');
    expect(playerPicture({ ...caught, pose: 'tackled' }, caught, 101, holder, 1)).toMatchObject({ action: 'tackled', lift: 0 });
    expect(playerPicture({ ...caught, pose: 'run' }, caught, 106, holder, 1)).toMatchObject({ action: 'carry', lift: 0 });
  });
  it('grounds the actual scorer, then recovers across the sim change to celebrate', () => {
    const scorer = { ...p, pose: 'dive', tryTick: 100, celebrationTick: 100 };
    expect(playerPicture(scorer, scorer, 100, holder, 1)).toMatchObject({ action: 'dive', frame: 0 });
    expect(playerPicture(scorer, scorer, 109, holder, 1)).toMatchObject({ action: 'dive', frame: 5 });
    const up = { ...scorer, pose: 'celebrate' };
    expect(playerPicture(up, scorer, 110, holder, 1)).toMatchObject({ action: 'tryRise', frame: 0 });
    expect(playerPicture(up, up, 119, holder, 1)).toMatchObject({ action: 'tryRise', frame: 5 });
    expect(['fistPump', 'point', 'celebrate', 'kneeSlide']).toContain(playerPicture(up, up, 120, holder, 1).action);
    expect(playerPicture({ ...p, pose: 'down' }, p, 120, null, 1).action).toBe('down');
  });
  it('keeps reactions stable across seeks and assigns no celebration to opponents', () => {
    const friend = { ...p, pose: 'celebrate', celebrationTick: 100 };
    const first = playerPicture(friend, friend, 122, null, 1);
    playerPicture(friend, friend, 144, null, 1);
    expect(playerPicture(friend, friend, 122, null, 1)).toEqual(first);
    const reactions = new Set(Array.from({ length: 9 }, (_, slot) => playerPicture({ ...friend, slot, who: `team-${slot}` }, friend, 122, null, 1).action));
    expect(reactions.size).toBeGreaterThan(1);
    expect(playerPicture({ ...p, side: 'away', pose: 'idle' }, p, 122, null, 1).action).toBe('idle');
  });
  it('reaches all four solo celebrations, the knee slide included, and never the paired chest bump', () => {
    const friend = { ...p, pose: 'celebrate', celebrationTick: 100 };
    const reactions = new Set(Array.from({ length: 60 }, (_, slot) => playerPicture({ ...friend, slot, who: `squad-${slot}` }, friend, 122, null, 1).action));
    expect(reactions).toEqual(new Set(['fistPump', 'point', 'celebrate', 'kneeSlide']));
  });
  it('keeps a fending carrier striding: the legs follow the run cycle, the arm the fend', () => {
    const fend = { ...p, pose: 'fend', poseUntil: 106, speed: 6 };
    const strides = [100, 101, 102, 103].map(t => playerPicture(fend, fend, t, holder, 1));
    for (const picture of strides) expect(picture.action).toBe('fend');
    expect(new Set(strides.map(s => s.strideFrame)).size).toBeGreaterThan(1);
    expect(playerPicture({ ...fend, speed: 0 }, fend, 101, holder, 1).strideFrame).toBe(-1);
  });
});

it('uses distance-linked fatigue/facing at the final kick beat and leaves real interruptions to their own pose', () => {
  for (const screenDir of [-1, 1]) for (const speed of [0, 6]) {
    const k = { ...p, headX: -.4, headY: .9, speed, odometer: 12, legs: .3, poseUntil: 108,
      kick: { startedTick: 100, strikeTick: 103, untilTick: 108, kind: 'punt' as const } };
    const end = playerPicture(k, k, 107, null, screenDir);
    const next = playerPicture({ ...k, pose: speed ? 'run' : 'idle' }, k, 108, null, screenDir);
    expect(end).toMatchObject({ action: 'kick', frame: 5, tired: 1 });
    expect(end.strideFrame).toBe(speed ? next.strideFrame : -1);
    expect({ facing: end.facing, left: end.left }).toEqual({ facing: next.facing, left: next.left });
    expect(playerPicture({ ...k, pose: 'tackled' }, k, 107, null, screenDir).action).toBe('tackled');
  }
});

it('enters the scorer celebration on its settled first beat, keeps teammate offsets and yields to interruptions', () => {
  for (let slot = 0; slot < 9; slot++) {
    const scorer = { ...p, slot, pose: 'celebrate', tryTick: 100, celebrationTick: 100 };
    expect(playerPicture(scorer, scorer, 119, { ...holder, slot }, 1)).toMatchObject({ action: 'tryRise', frame: 5, lift: 0 });
    expect(playerPicture(scorer, scorer, 120, { ...holder, slot }, 1).frame).toBe(0);
    expect(playerPicture(scorer, scorer, 122, { ...holder, slot }, 1).frame).toBe(0);
    expect(playerPicture(scorer, scorer, 123, { ...holder, slot }, 1).frame).toBe(1);
    const teammate = { ...p, slot, pose: 'celebrate', celebrationTick: 100 };
    const mate = playerPicture(teammate, teammate, 120, null, 1);
    expect(mate.frame).toBe(mate.action === 'kneeSlide' ? 5 : Math.floor(20 / 3 + slot) % 6);
    expect(playerPicture({ ...scorer, pose: 'tackled' }, scorer, 120, null, 1).action).toBe('tackled');
  }
});

it('turns the recovered tee kicker toward his current direction while leaving the empty tee at the posts', () => {
  for (const screenDir of [-1, 1]) {
    const k = { ...p, headX: -1, headY: 0, poseUntil: 108, goalKick: { readyTick: 70, strikeTick: 100, toward: 1 as const },
      kick: { startedTick: 100, strikeTick: 100, untilTick: 108, kind: 'drop' as const } };
    expect(playerPicture(k, k, 100, null, screenDir)).toMatchObject({ action: 'teeKick', frame: 3, left: screenDir < 0 });
    const end = playerPicture(k, k, 107, null, screenDir);
    const next = playerPicture({ ...k, pose: 'idle' }, k, 108, null, screenDir);
    expect(end).toMatchObject({ action: 'teeKick', frame: 5, teeFlip: true });
    expect({ facing: end.facing, left: end.left }).toEqual({ facing: next.facing, left: next.left });
    expect(next.teeFlip).toBeUndefined();
  }
});


it('uses the pinned seed8 aerial and try handoffs, with deterministic scorer entry and a single knee-slide drop', async () => {
  // Early DH commitment (#672) moves the first try to 2077; the opening aerial 120
  // and the actual try's 20-tick recovery remain.
  const { LiveSim } = await import('../../../src/match/league/live');
  const { labSheet, DEFAULT_HOME, DEFAULT_AWAY } = await import('../../../src/match/lab/sheets');
  const { pictureContext } = await import('../../../src/match/view/playerPicture');
  const { castLooks } = await import('../../../src/art/prototype/player');
  const { PlayerFrameCache } = await import('../../../src/scenes/matchPlayers');
  const { buildKit } = await import('../../../src/art/match/kit');
  const home = labSheet(DEFAULT_HOME), away = labSheet(DEFAULT_AWAY), sim = new LiveSim(home, away, 8);
  const kit = buildKit(0xd2aa34, 0x243444, 'v'), cache = new PlayerFrameCache({ home: kit, away: kit }, castLooks([home, away]));
  let before = sim.snapshot();
  let recovered: ReturnType<typeof cache.get> | undefined;
  const seen = new Set<string>();
  for (let tick = 1; tick <= 2097; tick++) {
    sim.step(); const s = sim.snapshot();
    if ([120, 124, 125, 126, 2086, 2087, 2096, 2097].includes(tick)) {
      const holder = s.ball.holder!;
      expect(holder).not.toBeNull();
      const man = s.players.find(p => p.side === holder.side && p.slot === holder.slot)!;
      const was = before.players.find(p => p.side === man.side && p.slot === man.slot)!;
      const context = pictureContext(s, before);
      const picture = playerPicture(man, was, tick, holder, 1, context);
      const pixels = cache.get(man.side, picture);
      if (tick === 120) { expect(picture.action).toBe('airCatch'); seen.add('take'); }
      if (tick === 124) { expect(picture).toMatchObject({ action: 'airCatch', frame: 4, lift: 0 }); seen.add('landing'); }
      if (tick === 125) {
        const { aerialCatchTick: _, ...grounded } = man;
        expect(picture).toMatchObject({ action: 'airCatch', frame: 5 });
        const carry = playerPicture(grounded, was, tick, holder, 1, context);
        expect(cache.get(man.side, carry).data).toEqual(pixels.data); seen.add('carry-end');
      }
      if (tick === 126) expect(picture.action).toBe('carry');
      if (tick === 2086) { expect(picture).toMatchObject({ action: 'dive', frame: 5 }); recovered = pixels; }
      if (tick === 2087) { expect(picture).toMatchObject({ action: 'tryRise', frame: 0 }); expect(pixels.data).toEqual(recovered!.data); seen.add('ground-rise'); }
      if (tick === 2096) { expect(picture).toMatchObject({ action: 'tryRise', frame: 5 }); recovered = pixels; }
      if (tick === 2097) {
        expect(picture.frame).toBe(0); expect(pixels.data).toEqual(recovered!.data); seen.add('rise-cheer');
        playerPicture(man, was, tick + 20, holder, -1);
        expect(playerPicture(man, was, tick, holder, 1, context)).toEqual(picture);
      }
    }
    before = s;
  }
  expect(seen.size).toBe(5);
  let slider: typeof p | undefined;
  for (let i = 0; i < 60; i++) {
    const candidate = { ...p, who: `slider-${i}`, pose: 'celebrate', tryTick: 100, celebrationTick: 100 };
    if (playerPicture(candidate, candidate, 120, holder, 1).action === 'kneeSlide') { slider = candidate; break; }
  }
  expect(slider).toBeDefined();
  expect([120, 123, 126, 129, 132, 135, 150].map(t => playerPicture(slider!, slider!, t, holder, 1).frame)).toEqual([0, 1, 2, 3, 4, 5, 5]);
});
