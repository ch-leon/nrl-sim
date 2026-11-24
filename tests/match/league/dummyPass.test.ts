import { describe, expect, it } from 'vitest';
import type { ContactPlayer, Snapshot } from '../../../src/match/core/snapshot';
import { labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { pictureContext, playerPicture } from '../../../src/match/view/playerPicture';

function sim(seed: number) {
  return new LiveSim(labSheet('rival-reapers'), labSheet('rival-crocs'), seed);
}

function toTick(game: LiveSim, tick: number) {
  while (game.tick < tick) game.step();
  return game.snapshot();
}

function actor(s: Snapshot, ref: ContactPlayer) {
  return s.players.find(p => p.side === ref.side && p.slot === ref.slot && p.who === ref.who)!;
}

describe('dummy-and-go in ordinary play', () => {
  it('keeps the ball in the reaching hands while drawing the defender across and breaking the line', () => {
    const game = sim(2);
    const s = toTick(game, 2607);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: 'dummy-pass', detail: 'bite' }));
    const cue = s.dummyPass!;
    expect(cue.bit).toBe(true);
    const carrier = actor(s, cue.carrier);
    const defender = actor(s, cue.defender);
    expect(actor(s, cue.receiver).side).toBe(carrier.side);

    for (let tick = s.tick; tick < cue.untilTick; tick++) {
      const f = toTick(game, tick);
      const h = actor(f, cue.carrier);
      expect(f.ball.holder).toEqual({ side: h.side, slot: h.slot });
      expect(f.ball.flight).toBeUndefined();
      const picture = playerPicture(h, carrier, f.tick, f.ball.holder, 1, pictureContext(f));
      expect(picture).toMatchObject({ action: tick < 2613 ? 'dummyPass' : 'carry', possession: true });
      expect(picture.strideFrame).toBeGreaterThanOrEqual(0);
    }
    const after = toTick(game, 2616);
    expect(after.dummyPass).toBeUndefined();
    expect((actor(after, cue.defender).y - defender.y) * cue.towardY).toBeGreaterThan(1);
    expect(after.events).toContainEqual(expect.objectContaining({ kind: 'line-break', slot: carrier.slot, side: carrier.side }));
  });

  it('lets a defender who stayed square make a normal tackle and finish the fake at contact', () => {
    // Seed 1's square at 4695 was the draft's witness. On this engine seed 6 stays square at 4050 and is tackled by that defender.
    const game = sim(6);
    const fake = toTick(game, 4050);
    const cue = fake.dummyPass!;
    expect(cue.bit).toBe(false);
    expect(fake.events).toContainEqual(expect.objectContaining({ kind: 'dummy-pass', detail: 'square' }));
    const contact = toTick(game, 4055);
    expect(contact.dummyPass).toBeUndefined();
    expect(contact.contact?.defenders[0]).toEqual(cue.defender);
    expect(toTick(game, 4062).events).toContainEqual(expect.objectContaining({ kind: 'tackle', slot: cue.defender.slot, side: cue.defender.side }));
  });

  it('restores the ordinary carry when the attempt knob is off', () => {
    const restore = applyTuning({ 'live.dummyChance': 0 });
    try {
      for (const [seed, tick] of [[2, 2607], [6, 4050]] as const) {
        const s = toTick(sim(seed), tick);
        expect(s.dummyPass).toBeUndefined();
        expect(s.events.some(e => e.kind === 'dummy-pass')).toBe(false);
      }
    } finally {
      restore();
    }
  });
});
