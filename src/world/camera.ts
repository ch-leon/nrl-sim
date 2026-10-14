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
 * Smallest zoom at which the whole view still fits inside `world` on both axes.
 * Below this the visible rect is bigger than the world, so Phaser's bounds clamp
 * (and clampScroll) would pin the map and expose whatever lies past its edge.
 * Derived from the viewport size, so it moves when the canvas resizes.
 */
export function fitZoom(
  view: { width: number; height: number },
  world: { width: number; height: number },
): number {
  return Math.max(view.width / world.width, view.height / world.height);
}

// Phaser's zoom model (3.60+): zoom scales around the VIEWPORT CENTRE, and
// scroll is zoom-independent — the world point at the view centre is always
// `scroll + view / 2`. A screen point s therefore sees world
// `scroll + view/2 + (s - view/2) / zoom`. Every helper below uses that model so
// it agrees with Phaser's own bounds clamp (BaseCamera.clampX/Y).

/**
 * Clamp scroll so the camera view stays within world bounds at the given zoom.
 * Mirrors Phaser's BaseCamera.clampX/Y: the visible world rect is centred on
 * `scroll + view/2`, so the scroll range shifts by `(view/zoom - view) / 2`.
 * When the world is smaller than the visible rect, `Math.max(min, ...)` keeps
 * max >= min so the map stays pinned instead of jittering.
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
  const minX = world.x + (vw - view.width) / 2;
  const minY = world.y + (vh - view.height) / 2;
  const maxX = Math.max(minX, minX + world.width - vw);
  const maxY = Math.max(minY, minY + world.height - vh);
  return {
    x: Math.min(maxX, Math.max(minX, scrollX)),
    y: Math.min(maxY, Math.max(minY, scrollY)),
  };
}

/** World point under screen point (sx, sy) for a camera at `scroll` / `zoom`. */
export function screenToWorld(
  sx: number,
  sy: number,
  view: { width: number; height: number },
  scroll: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  return {
    x: scroll.x + view.width / 2 + (sx - view.width / 2) / zoom,
    y: scroll.y + view.height / 2 + (sy - view.height / 2) / zoom,
  };
}

/**
 * Scroll that keeps the world point under screen point (sx, sy) fixed while the
 * zoom changes from `oldZoom` to `newZoom` (zoom-to-cursor / pinch midpoint).
 * Works from screen coordinates so it never depends on a pointer's cached
 * worldX/worldY, which Phaser only refreshes when the pointer moves.
 */
export function zoomAnchorScroll(
  sx: number,
  sy: number,
  view: { width: number; height: number },
  scroll: { x: number; y: number },
  oldZoom: number,
  newZoom: number,
): { x: number; y: number } {
  const w = screenToWorld(sx, sy, view, scroll, oldZoom);
  return {
    x: w.x - view.width / 2 - (sx - view.width / 2) / newZoom,
    y: w.y - view.height / 2 - (sy - view.height / 2) / newZoom,
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
  /**
   * When true, the minimum zoom is the viewport fit for `world` (see fitZoom)
   * instead of `minZoom`, so the view can never be larger than the world. It is
   * recomputed on every canvas resize. `minZoom` is ignored in this mode.
   */
  fitView?: boolean;
}

export class CameraController {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;
  private world: CameraOpts['world'];
  private minZoom: number;
  private maxZoom: number;
  private threshold: number;
  private fitView: boolean;

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
  private onResize: () => void;

  constructor(scene: Phaser.Scene, opts: CameraOpts) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.world = opts.world;
    this.minZoom = opts.minZoom ?? 0.5;
    this.maxZoom = opts.maxZoom ?? 2.0;
    this.threshold = opts.dragThreshold ?? 8;
    this.fitView = opts.fitView ?? false;

    this.cam.setBounds(this.world.x, this.world.y, this.world.width, this.world.height);
    // Enable a second pointer so pinch works on touch devices.
    scene.input.addPointer(1);

    this.onPointerDown = (p) => this.handlePointerDown(p);
    this.onPointerMove = (p) => this.handlePointerMove(p);
    this.onPointerUp = (p) => this.handlePointerUp(p);
    this.onWheel = (p, _over, _dx, dy) => this.handleWheel(p, dy);
    this.onResize = () => this.handleResize();

    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
    scene.input.on('wheel', this.onWheel);
    scene.scale.on('resize', this.onResize);

    // Apply an initial clamp in case the world is smaller than the view.
    this.handleResize();
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
    this.scene.scale.off('resize', this.onResize);
  }

  /** Lowest zoom the user can reach: the viewport fit in fitView mode, else minZoom. */
  private zoomFloor(): number {
    return this.fitView
      ? fitZoom({ width: this.cam.width, height: this.cam.height }, this.world)
      : this.minZoom;
  }

  /**
   * Re-apply the zoom floor and scroll clamp for the current viewport. Runs on
   * construction and on every canvas resize, so a bigger viewport (or a rotated
   * phone) cannot leave the camera zoomed out past the world edge.
   */
  private handleResize(): void {
    const floor = this.zoomFloor();
    if (this.cam.zoom < floor) {
      this.zoomToPoint(this.cam.width / 2, this.cam.height / 2, floor);
    } else {
      this.applyScroll(this.cam.scrollX, this.cam.scrollY);
    }
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
    const newZoom = clampZoom(oldZoom * (deltaY > 0 ? 0.9 : 1.1), this.zoomFloor(), this.maxZoom);
    if (newZoom === oldZoom) return;
    this.zoomToPoint(p.x, p.y, newZoom);
  }

  private handlePinch(p0: Phaser.Input.Pointer, p1: Phaser.Input.Pointer): void {
    const dist = this.pointerDistance(p0, p1);
    if (this.pinchPrevDist === 0) {
      this.pinchPrevDist = dist;
      return;
    }
    const oldZoom = this.cam.zoom;
    const newZoom = clampZoom((oldZoom * dist) / this.pinchPrevDist, this.zoomFloor(), this.maxZoom);
    this.pinchPrevDist = dist;
    // Anchor to the midpoint between the two pointers (screen space).
    if (newZoom !== oldZoom) {
      this.zoomToPoint((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, newZoom);
    }
    // Any two-finger gesture counts as a drag so it never triggers a tap.
    this.dragging = true;
  }

  /** Set zoom while keeping the world point under screen (sx, sy) fixed. */
  private zoomToPoint(sx: number, sy: number, newZoom: number): void {
    const next = zoomAnchorScroll(
      sx,
      sy,
      { width: this.cam.width, height: this.cam.height },
      { x: this.cam.scrollX, y: this.cam.scrollY },
      this.cam.zoom,
      newZoom,
    );
    this.cam.setZoom(newZoom);
    this.applyScroll(next.x, next.y);
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
