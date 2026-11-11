import { describe, expect, it } from 'vitest';
import { appearanceFor, drawPrototypePlayer, HEAD_OPTIONS, type Action, type Build } from '../../../src/art/prototype/player';
import { LOOKS, lookForPlayer, opaqueBounds } from '../../../src/art/match/players';
import { buildKit } from '../../../src/art/match/kit';
import { momentAt } from '../../../src/labs/art/sequence';
import { drawHead } from '../../../src/art/prototype/head';
import { RECOGNITION_CAST, recognitionAt } from '../../../src/labs/art/recognition';

const kit = buildKit(0xe6b632, 0x21394a, 'v');
const base = appearanceFor('p-art-4');
const actions: Action[] = ['idle', 'run', 'carry', 'pass', 'catch', 'brace', 'wrap', 'ground', 'ptb'];

describe('prototype appearance compatibility', () => {
  it('preserves known legacy identities when the head catalogue grows', () => {
    for (const [id, index] of [['p_123', 0], ['p-art-4', 6], ['p-art-9', 5], ['p-art-11', 8]] as const) {
      expect(lookForPlayer(id)).toBe(index);
      const old = LOOKS[index]!;
      const next = appearanceFor(id);
      expect(next).toMatchObject({ skin: old.skin, hair: old.hair, head: old.style, beard: old.beard });
      expect(appearanceFor(id)).toEqual(next);
    }
  });
  it('draws distinct head silhouettes and body builds', () => {
    const heads = HEAD_OPTIONS.map(head => Array.from(drawPrototypePlayer({ ...base, head }, kit, 'idle', 0).data).join(','));
    expect(new Set(heads).size).toBe(HEAD_OPTIONS.length);
    const bodies = (['lean', 'athletic', 'stocky'] as Build[]).map(build => drawPrototypePlayer({ ...base, build }, kit, 'idle', 0).opaqueCount());
    expect(bodies[0]).toBeLessThan(bodies[1]!);
    expect(bodies[1]).toBeLessThan(bodies[2]!);
  });
  it('distinguishes head options by outline as well as colour', () => {
    const silhouettes = HEAD_OPTIONS.map(head => {
      const image = drawHead({ ...base, head, beard: false }, kit, 'front');
      return Array.from(image.data).filter((_, i) => i % 4 === 3).join(',');
    });
    expect(new Set(silhouettes).size).toBe(HEAD_OPTIONS.length);
  });
  it('keeps all cosmetic/action/direction combinations inside their frames', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) {
      for (const facing of ['front', 'back'] as const) for (const action of actions) for (let frame = 0; frame < 6; frame++) {
        const pixels = drawPrototypePlayer({ ...base, build, head, beard: true, tape: true }, kit, action, frame, facing, true);
        const bounds = opaqueBounds(pixels)!;
        expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
        expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBeLessThan(pixels.h - 1);
      }
    }
  });
  it('renders separate front/back views and a protected carry', () => {
    expect(drawPrototypePlayer(base, kit, 'idle', 0, 'front').data).not.toEqual(drawPrototypePlayer(base, kit, 'idle', 0, 'back').data);
    expect(drawPrototypePlayer(base, kit, 'carry', 0, 'front', true).data).not.toEqual(drawPrototypePlayer(base, kit, 'run', 0).data);
  });
});

describe('shared art rehearsal', () => {
  it('keeps moving through the catch and into the carry without a pause or position jump', () => {
    const receiver = (t: number) => momentAt(t).actors.find(p => p.id === 'p-art-4')!;
    for (let t = 2.9; t < 4; t += .02) {
      const dx = receiver(t + .02).x - receiver(t).x;
      expect(dx).toBeGreaterThan(0); expect(dx).toBeLessThan(.003);
    }
    expect(receiver(3.15).action).toBe('catch');
    expect(receiver(3.36).action).toBe('carry');
  });
  it('keeps exactly one ball throughout the passage, including release and catch', () => {
    for (let tick = 0; tick <= 1000; tick++) {
      const state = momentAt(tick / 100);
      expect(state.actors.filter(p => p.possession).length + (state.ball ? 1 : 0)).toBe(1);
    }
  });
  it('is reproducible when scrubbing and reflects lane input', () => {
    const state = momentAt(5.7);
    momentAt(9);
    expect(momentAt(5.7)).toEqual(state);
    expect(state.actors.find(p => p.id === 'p-art-4')!.action).toBe('brace');
    expect(momentAt(5.7, .05).actors.find(p => p.id === 'p-art-4')!.y).toBeCloseTo(.79);
  });
});

describe('nine-player recognition rehearsal', () => {
  it('keeps nine identities in one kit without possession markers', () => {
    const ids = RECOGNITION_CAST.map(p => p.id).sort();
    expect(new Set(ids).size).toBe(9);
    expect(new Set(RECOGNITION_CAST.map(p => p.look.head)).size).toBe(9);
    for (let arrangement = 0; arrangement < 9; arrangement++) for (let t = 0; t <= 10; t += .1) {
      const state = recognitionAt(t, arrangement);
      expect(state.actors.map(p => p.id).sort()).toEqual(ids);
      expect(state.ball).toBeNull();
      for (const actor of state.actors) {
        expect(actor.side).toBe('home'); expect(actor.possession).toBe(false);
        expect(actor.x).toBeGreaterThan(.05); expect(actor.x).toBeLessThan(.96);
        expect(actor.y).toBeGreaterThan(.28); expect(actor.y).toBeLessThan(.85);
      }
    }
  });
  it('loops continuously and changes positions without changing player identities', () => {
    const first = recognitionAt(0).actors;
    const last = recognitionAt(10).actors;
    first.forEach((p, i) => { expect(last[i]!.x).toBeCloseTo(p.x); expect(last[i]!.y).toBeCloseTo(p.y); });
    const rearranged = recognitionAt(0, 1).actors;
    first.forEach((p, i) => { expect(rearranged[i]!.id).toBe(p.id); expect([rearranged[i]!.x, rearranged[i]!.y]).not.toEqual([p.x, p.y]); });
  });
});
