// Camera pan/zoom controller for isometric scenes (BAK-159).
// The pure math (clampZoom, clampScroll, isDrag) is Phaser-free and unit-tested;
// the CameraController class wires Phaser input to it. The controller NEVER stops
// event propagation — scene tap handlers guard with `if (cam.wasDragging()) return;`.
import Phaser from 'phaser';

/** Clamp a zoom factor to [min, max]. */
export function clampZoom(z: number, min = 0.5, max = 2.0): number {
  return Math.min(max, Math.max(min, z));
}

/**
 * Clamp scroll so the camera view stays within world bounds at the given zoom.
 * When the world is smaller than the view, `Math.max(world.x, ...)` keeps
 * maxX >= minX so the map stays pinned instead of jittering.
 */
export function clampScroll(
  scrollX: number,
  scrollY: number,
  view: { width: number; height: number },
  zoom: number,
  world: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const vw = view.width / zoom;
  const vh = view.height / zoom;
  const maxX = Math.max(world.x, world.x + world.width - vw);
  const maxY = Math.max(world.y, world.y + world.height - vh);
  return {
    x: Math.min(maxX, Math.max(world.x, scrollX)),
    y: Math.min(maxY, Math.max(world.y, scrollY)),
  };
}

/** True once total pointer movement reaches the drag threshold (px, screen space). */
export function isDrag(dx: number, dy: number, threshold = 8): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export interface CameraOpts {
  world: { x: number; y: number; width: number; height: number };
  minZoom?: number; // default 0.5
  maxZoom?: number; // default 2.0
  dragThreshold?: number; // default 8 (px, screen space)
}

export class CameraController {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;
  private world: CameraOpts['world'];
  private minZoom: number;
  private maxZoom: number;
  private threshold: number;

  // Single-pointer pan state.
  private pointerDown = false;
  private startX = 0;
  private startY = 0;
  private startScrollX = 0;
  private startScrollY = 0;
  private dragging = false;

  // Pinch state.
  private pinchPrevDist = 0;

  // Bound handlers, kept for clean removal in destroy().
  private onPointerDown: (p: Phaser.Input.Pointer) => void;
  private onPointerMove: (p: Phaser.Input.Pointer) => void;
  private onPointerUp: (p: Phaser.Input.Pointer) => void;
  private onWheel: (
    p: Phaser.Input.Pointer,
    over: unknown,
    dx: number,
    dy: number,
    dz: number,
  ) => void;

  constructor(scene: Phaser.Scene, opts: CameraOpts) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.world = opts.world;
    this.minZoom = opts.minZoom ?? 0.5;
    this.maxZoom = opts.maxZoom ?? 2.0;
    this.threshold = opts.dragThreshold ?? 8;

    this.cam.setBounds(this.world.x, this.world.y, this.world.width, this.world.height);
    // Enable a second pointer so pinch works on touch devices.
    scene.input.addPointer(1);

    this.onPointerDown = (p) => this.handlePointerDown(p);
    this.onPointerMove = (p) => this.handlePointerMove(p);
    this.onPointerUp = (p) => this.handlePointerUp(p);
    this.onWheel = (p, _over, _dx, dy) => this.handleWheel(p, dy);

    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
    scene.input.on('wheel', this.onWheel);

    // Apply an initial clamp in case the world is smaller than the view.
    this.applyScroll(this.cam.scrollX, this.cam.scrollY);
  }

  /** True if the just-ended interaction exceeded the drag threshold. */
  wasDragging(): boolean {
    return this.dragging;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);
    this.scene.input.off('wheel', this.onWheel);
  }

  private activePointers(): Phaser.Input.Pointer[] {
    return this.scene.input.manager.pointers.filter((p) => p.isDown);
  }

  private handlePointerDown(_p: Phaser.Input.Pointer): void {
    const active = this.activePointers();
    // Reset drag flag so a genuine subsequent tap is not falsely suppressed.
    this.dragging = false;
    if (active.length >= 2) {
      // Two pointers down -> begin pinch; record initial distance now to avoid a jump.
      this.pointerDown = false;
      this.pinchPrevDist = this.pointerDistance(active[0]!, active[1]!);
      return;
    }
    this.pointerDown = true;
    this.startX = _p.x;
    this.startY = _p.y;
    this.startScrollX = this.cam.scrollX;
    this.startScrollY = this.cam.scrollY;
  }

  private handlePointerMove(_p: Phaser.Input.Pointer): void {
    const active = this.activePointers();
    if (active.length >= 2) {
      this.handlePinch(active[0]!, active[1]!);
      return;
    }
    if (!this.pointerDown) return;
    const totalDx = _p.x - this.startX;
    const totalDy = _p.y - this.startY;
    if (!this.dragging && isDrag(totalDx, totalDy, this.threshold)) {
      this.dragging = true;
    }
    if (this.dragging) {
      // 1:1 drag in world space (account for zoom).
      const nx = this.startScrollX - totalDx / this.cam.zoom;
      const ny = this.startScrollY - totalDy / this.cam.zoom;
      this.applyScroll(nx, ny);
    }
  }

  private handlePointerUp(_p: Phaser.Input.Pointer): void {
    const active = this.activePointers();
    // If dropping from 2 pointers back to 1, end pinch; keep panning suspended
    // until all pointers lift to avoid a jump.
    if (active.length >= 1) {
      this.pointerDown = false;
      this.pinchPrevDist = 0;
      return;
    }
    this.pointerDown = false;
    this.pinchPrevDist = 0;
    // Leave `dragging` readable via wasDragging() until the next pointerdown.
  }

  private handleWheel(p: Phaser.Input.Pointer, deltaY: number): void {
    const oldZoom = this.cam.zoom;
    const newZoom = clampZoom(oldZoom * (deltaY > 0 ? 0.9 : 1.1), this.minZoom, this.maxZoom);
    if (newZoom === oldZoom) return;
    this.zoomToPoint(p.worldX, p.worldY, newZoom);
  }

  private handlePinch(p0: Phaser.Input.Pointer, p1: Phaser.Input.Pointer): void {
    const dist = this.pointerDistance(p0, p1);
    if (this.pinchPrevDist === 0) {
      this.pinchPrevDist = dist;
      return;
    }
    const oldZoom = this.cam.zoom;
    const newZoom = clampZoom((oldZoom * dist) / this.pinchPrevDist, this.minZoom, this.maxZoom);
    this.pinchPrevDist = dist;
    // Anchor to the midpoint between the two pointers (in world space).
    const midWorldX = (p0.worldX + p1.worldX) / 2;
    const midWorldY = (p0.worldY + p1.worldY) / 2;
    if (newZoom !== oldZoom) {
      this.zoomToPoint(midWorldX, midWorldY, newZoom);
    }
    // Any two-finger gesture counts as a drag so it never triggers a tap.
    this.dragging = true;
  }

  /** Set zoom while keeping the given world point fixed under the cursor/midpoint. */
  private zoomToPoint(worldX: number, worldY: number, newZoom: number): void {
    // Screen offset of the anchor point relative to the camera view centre.
    const dxScreen = (worldX - this.cam.midPoint.x) * this.cam.zoom;
    const dyScreen = (worldY - this.cam.midPoint.y) * this.cam.zoom;
    this.cam.setZoom(newZoom);
    // After zoom, recompute the world point that should sit at the same screen
    // offset and scroll so the anchor stays put.
    const newMidX = worldX - dxScreen / newZoom;
    const newMidY = worldY - dyScreen / newZoom;
    const scrollX = newMidX - this.cam.width / 2 / newZoom;
    const scrollY = newMidY - this.cam.height / 2 / newZoom;
    this.applyScroll(scrollX, scrollY);
  }

  private applyScroll(x: number, y: number): void {
    const clamped = clampScroll(
      x,
      y,
      { width: this.cam.width, height: this.cam.height },
      this.cam.zoom,
      this.world,
    );
    this.cam.setScroll(clamped.x, clamped.y);
  }

  private pointerDistance(a: Phaser.Input.Pointer, b: Phaser.Input.Pointer): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
