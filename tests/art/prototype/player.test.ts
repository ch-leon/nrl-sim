import { describe, expect, it } from 'vitest';
import { appearanceFor, castLooks, drawPrototypePlayer, FOOT, HEAD_OPTIONS, type Action, type Build } from '../../../src/art/prototype/player';
import type { Position } from '../../../src/core/state';
import { LOOKS, lookForPlayer, opaqueBounds } from '../../../src/art/match/players';
import { buildKit } from '../../../src/art/match/kit';
import { momentAt } from '../../../src/labs/art/sequence';
import { drawHead } from '../../../src/art/prototype/head';
import { RECOGNITION_CAST, recognitionAt } from '../../../src/labs/art/recognition';

const kit = buildKit(0xe6b632, 0x21394a, 'v');
const base = appearanceFor('p-art-4');
/** A column of the near boot in the standing frame. */
const CENTRE_BOOT = 21;
const actions: Action[] = ['idle', 'run', 'carry', 'pass', 'catch', 'brace', 'wrap', 'ground', 'ptb'];

describe('prototype appearance compatibility', () => {
  it('preserves known legacy colours and beards when the head catalogue grows', () => {
    for (const [id, index] of [['p_123', 0], ['p-art-4', 6], ['p-art-9', 5], ['p-art-11', 8]] as const) {
      expect(lookForPlayer(id)).toBe(index);
      const old = LOOKS[index]!;
      const next = appearanceFor(id);
      expect(next).toMatchObject({ skin: old.skin, hair: old.hair, beard: old.beard });
      expect(appearanceFor(id)).toEqual(next);
    }
  });
  it('is a pure function of the player: the same man in every match, screen and reload', () => {
    const ids = Array.from({ length: 300 }, (_, i) => `p-${i * 37}`);
    const positions: Position[] = ['prop', 'winger', 'hooker', 'lock'];
    const snapshot = JSON.stringify(ids.map((id, i) => appearanceFor(id, positions[i % 4])));
    // Two matches' casts (one with the sides swapped) and direct calls agree.
    const squad = ids.map((id, i) => ({ id, name: `Name ${i}`, position: positions[i % 4]! }));
    const home = castLooks([{ roster: squad.slice(0, 150), bench: squad.slice(150) }]);
    const away = castLooks([{ roster: [] }, { roster: squad }]);
    expect(JSON.stringify(ids.map(home))).toBe(snapshot);
    expect(JSON.stringify(ids.map(away))).toBe(snapshot);
    expect(JSON.stringify(ids.map((id, i) => appearanceFor(id, positions[i % 4])))).toBe(snapshot);
    // A generated rival is keyed by name, as the live sim keys him.
    expect(castLooks([{ roster: [{ name: 'Rival Prop', position: 'prop' }] }])('Rival Prop')).toEqual(appearanceFor('Rival Prop', 'prop'));
  });
  it('builds by position: props and locks stocky, outside backs lean, forwards taller than halves', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `squad-${i}`);
    const looks = (position: Position) => ids.map(id => appearanceFor(id, position));
    for (const position of ['prop', 'lock'] as const) expect(new Set(looks(position).map(l => l.build))).toEqual(new Set(['stocky']));
    for (const position of ['fullback', 'winger', 'centre'] as const) expect(new Set(looks(position).map(l => l.build))).toEqual(new Set(['lean']));
    expect(looks('second-row').some(l => l.build === 'lean')).toBe(false);
    expect(new Set(looks('halfback').map(l => l.build)).size).toBe(3);
    const mean = (position: Position) => looks(position).reduce((n, l) => n + l.stature, 0) / ids.length;
    expect(mean('second-row')).toBeGreaterThan(mean('winger'));
    expect(mean('winger')).toBeGreaterThan(mean('hooker'));
    for (const id of ids) {
      const s = appearanceFor(id).stature;
      expect(s).toBeGreaterThanOrEqual(-1); expect(s).toBeLessThanOrEqual(1);
    }
    expect(new Set([...looks('second-row'), ...looks('hooker')].map(l => l.stature))).toEqual(new Set([-2, -1, 1, 2]));
  });
  it('reaches all eleven head styles across a league, about equally', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 17 * 30; i++) {
      const head = appearanceFor(`league-${i}`).head;
      counts.set(head, (counts.get(head) ?? 0) + 1);
    }
    expect(new Set(counts.keys())).toEqual(new Set(HEAD_OPTIONS));
    for (const n of counts.values()) expect(n).toBeGreaterThan(17 * 30 / 11 / 2);
  });
  it('carries height in the shins: boots stay on the ground, the head rises', () => {
    const top = (stature: number, action: Action, frame = 0) => opaqueBounds(drawPrototypePlayer({ ...base, stature }, kit, action, frame, 'front', true, action === 'run' ? frame : undefined))!;
    for (const action of ['idle', 'run', 'carry', 'brace', 'wrap'] as const) for (let frame = 0; frame < 6; frame++) {
      const middle = top(0, action, frame);
      for (const stature of [-2, -1, 1, 2]) {
        const b = top(stature, action, frame);
        expect(b.y1).toBe(middle.y1); expect(b.y0).toBe(middle.y0 - stature);
      }
    }
    // Feet on the frame's ground row, whatever his height.
    for (const stature of [-2, 2]) {
      const p = drawPrototypePlayer({ ...base, stature }, kit, 'idle', 0);
      expect(p.get(CENTRE_BOOT, FOOT).alpha).toBeGreaterThan(0);
    }
    expect(top(2, 'ground').y0).toBe(top(-2, 'ground').y0);
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
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) for (const stature of [-2, 2]) {
      for (const facing of ['front', 'back'] as const) for (const action of actions) for (let frame = 0; frame < 6; frame++) {
        const pixels = drawPrototypePlayer({ ...base, build, head, stature, beard: true, tape: true }, kit, action, frame, facing, true);
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
