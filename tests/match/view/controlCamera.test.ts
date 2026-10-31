// Labs: match controls (Leon, 30 Oct). Control drags own one finger; pinch stays live.
import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { CameraController } from '../../../src/world/camera';
import type { LivePlayback, LivePlaybackScene } from '../../../src/match/view/livePlayback';
import { ControlsLayer } from '../../../src/match/view/controlsLayer';

afterEach(() => vi.unstubAllGlobals());

it('reserves a control swipe before camera movement, releases it, and permits pinch and defending pans', () => {
  type Pointer = { x: number; y: number; isDown: boolean };
  const callbacks = new Map<string, (p: Pointer) => void>();
  const p0 = { x: 300, y: 150, isDown: true }, p1 = { x: 400, y: 150, isDown: false };
  const cam = {
    width: 600, height: 300, zoom: 1, scrollX: 300, scrollY: 300,
    setBounds: vi.fn(),
    setZoom(z: number) { this.zoom = z; },
    setScroll(x: number, y: number) { this.scrollX = x; this.scrollY = y; },
  };
  const scene = {
    cameras: { main: cam },
    input: { manager: { pointers: [p0, p1] }, addPointer: vi.fn(),
      on: (name: string, cb: (p: Pointer) => void) => callbacks.set(name, cb), off: vi.fn() },
    scale: { on: vi.fn(), off: vi.fn() },
  };
  const camera = new CameraController(scene as unknown as Phaser.Scene, { world: { x: 0, y: 0, width: 4000, height: 4000 } });
  const control = vi.fn();
  const pb = { controlsAvailable: true, controlAttacking: 'home', controlTackle: 0, controlDirection: 1, control };
  const listeners = new Map<string, (e: PointerEvent) => void>();
  const canvas = {};
  let hit: unknown = canvas;
  const node = () => ({ setAttribute: vi.fn(), addEventListener: vi.fn(), append: vi.fn(), remove: vi.fn() });
  vi.stubGlobal('document', { createElement: node, body: node(), head: node(), elementFromPoint: () => hit });
  const addListener = vi.fn((name: string, cb: (e: PointerEvent) => void) => listeners.set(name, cb));
  vi.stubGlobal('window', { addEventListener: addListener, removeEventListener: vi.fn() });
  const drawing = {
    clear: vi.fn(), destroy: vi.fn(), setText: vi.fn(),
    setDepth() { return this; }, setOrigin() { return this; }, setVisible() { return this; },
  };
  const surface = { ...scene, game: { canvas }, events: { on: vi.fn(), off: vi.fn() },
    add: { graphics: () => drawing, text: () => drawing }, fieldToWorld: (x: number, y: number) => ({ x: x - y, y: x + y }) };
  const layer = new ControlsLayer(surface as unknown as Phaser.Scene & LivePlaybackScene,
    pb as unknown as LivePlayback, 'home', node() as unknown as HTMLElement, (held) => camera.holdPan(held));
  // Capture runs before Phaser's native input callbacks; it never stops propagation.
  expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true, capture: true });
  const event = (id: number, x: number) => ({ pointerId: id, clientX: x, clientY: 150 }) as PointerEvent;
  const emit = (kind: string, p: Pointer) => callbacks.get(kind)!(p);
  listeners.get('pointerdown')!(event(1, 300)); emit('pointerdown', p0);
  const before = [cam.scrollX, cam.scrollY];
  p0.x = 365;
  listeners.get('pointermove')!(event(1, 365)); emit('pointermove', p0);
  expect([cam.scrollX, cam.scrollY]).toEqual(before);
  listeners.get('pointerup')!(event(1, 365)); p0.isDown = false; emit('pointerup', p0);
  expect(control).toHaveBeenCalledOnce();
  expect(drawing.setText).toHaveBeenCalledWith('PASS →');

  // A visible but too-short pitch swipe acknowledges rejection without panning.
  p0.isDown = true; p0.x = 300;
  listeners.get('pointerdown')!(event(1, 300)); emit('pointerdown', p0);
  p0.x = 320;
  listeners.get('pointermove')!(event(1, 320)); emit('pointermove', p0);
  listeners.get('pointerup')!(event(1, 320)); p0.isDown = false; emit('pointerup', p0);
  expect(control).toHaveBeenCalledOnce();
  expect(drawing.setText).toHaveBeenCalledWith('?');

  p0.isDown = true; p0.x = 300;
  listeners.get('pointerdown')!(event(1, 300)); emit('pointerdown', p0);
  hit = {}; // Moving onto a DOM control cancels the swipe, without handing its drag to the camera.
  const cancelled = [cam.scrollX, cam.scrollY];
  p0.x = 365; listeners.get('pointermove')!(event(1, 365)); emit('pointermove', p0);
  expect([cam.scrollX, cam.scrollY]).toEqual(cancelled);
  hit = canvas;
  listeners.get('pointerup')!(event(1, 365)); p0.isDown = false; emit('pointerup', p0);
  expect(control).toHaveBeenCalledOnce();

  p0.isDown = true; p0.x = 300;
  listeners.get('pointerdown')!(event(1, 300)); emit('pointerdown', p0);
  p1.isDown = true;
  listeners.get('pointerdown')!(event(2, 400)); emit('pointerdown', p1);
  p1.x = 450;
  listeners.get('pointermove')!(event(2, 450)); emit('pointermove', p1);
  expect(cam.zoom).toBeGreaterThan(1);
  listeners.get('pointerup')!(event(2, 450)); p1.isDown = false; emit('pointerup', p1);
  listeners.get('pointerup')!(event(1, 300)); p0.isDown = false; emit('pointerup', p0);
  expect(control).toHaveBeenCalledOnce();

  pb.controlAttacking = 'away'; p0.isDown = true;
  listeners.get('pointerdown')!(event(1, 300)); emit('pointerdown', p0);
  const defending = cam.scrollX;
  p0.x = 365; emit('pointermove', p0);
  expect(cam.scrollX).not.toBe(defending);
  layer.destroy(); camera.destroy();
});
