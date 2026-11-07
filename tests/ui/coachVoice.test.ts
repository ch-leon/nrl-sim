import { afterEach, expect, it, vi } from 'vitest';
import { coachLine, COACH_NAME, COACH_ROLE } from '../../src/ui/coachVoice';
import { coachDocument } from './coachDom';
import { buildCoachFace, coachFaceDataUrl } from '../../src/art/coachFace';
import type { StubNode } from './stubDom';

afterEach(() => vi.unstubAllGlobals());

it('the fixed 16×16 face is deterministic and encoded once', () => {
  const face = buildCoachFace();
  expect([face.w, face.h]).toEqual([16, 16]);
  expect(face.opaqueCount()).toBe(256);
  expect(buildCoachFace().data).toEqual(face.data);
  const encode = vi.fn(() => 'data:image/png;base64,face');
  expect(coachFaceDataUrl(encode)).toBe(coachFaceDataUrl(encode));
  expect(encode).toHaveBeenCalledTimes(1);
});

it('coachLine shares one stylesheet and treats its line as text', () => {
  coachDocument();
  // Supply the already tested encoder through the actual offscreen canvas seam.
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') return { getContext: () => ({ createImageData: () => ({ data: new Uint8ClampedArray(1024) }), putImageData: () => {} }), toDataURL: () => 'data:image/png;base64,face' };
    return create(tag);
  }) as typeof document.createElement);
  const line = coachLine('<b>Keep going</b>') as unknown as StubNode;
  coachLine('Next line');
  expect(line.textContent).toBe(`${COACH_NAME}<b>Keep going</b>`);
  expect(line.all().find((n) => n.className === 'nrl-coach-name')!.getAttribute('title')).toBe(COACH_ROLE);
  expect((document.head as unknown as StubNode).children.filter((n) => n.id === 'nrl-coach-styles')).toHaveLength(1);
});
