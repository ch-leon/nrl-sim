// Labs: match controls (Leon, 30 Oct). Pure gestures, thin DOM / Phaser wiring.
import { SET_TACKLES } from '../../config';
import type Phaser from 'phaser';
import type { Side } from '../core/snapshot';
import type { Vec } from '../core/vec';
import { dist } from '../core/vec';
import { toFieldPt } from '../core/field';
import { controlKickBand, type ControlKind } from '../league/controls';
import { LIVE } from '../league/live';
import type { LivePlayback, LivePlaybackScene } from './livePlayback';
import { hintSeen, markHintSeen } from '../../labs/flags';
import { button } from '../../ui/dom';
import { COLOR_TOKENS } from '../../ui/tokens';

export const GESTURE = { swipePx: 30, swipeMs: 350, kickHoldMs: 180, cancelPx: 15, dominance: 1.25, kickAlignment: 0.75 };
export interface GesturePoint extends Vec { pointers?: number }
export interface GestureContext { lastTackle?: boolean; attack?: Vec }
export function classifyGesture(points: readonly GesturePoint[], ms: number, context: GestureContext = {}): ControlKind | null {
  if (points.length < 2 || points.some((p) => (p.pointers ?? 1) !== 1)) return null;
  const a = points[0]!, b = points[points.length - 1]!;
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < GESTURE.cancelPx) return null;
  const attack = context.attack;
  if (context.lastTackle && attack && ms >= GESTURE.kickHoldMs
    && (dx * attack.x + dy * attack.y) / Math.hypot(attack.x, attack.y) < -Math.max(GESTURE.swipePx, length * GESTURE.kickAlignment)) return 'kick';
  if (length <= GESTURE.swipePx || ms >= GESTURE.swipeMs) return null;
  if (Math.abs(dx) > Math.abs(dy) * GESTURE.dominance) return dx < 0 ? 'pass-left' : 'pass-right';
  if (Math.abs(dy) > Math.abs(dx) * GESTURE.dominance) return dy < 0 ? 'step-up' : 'step-down';
  return null;
}
/** Convert screen pass / step to the pitch's lateral axis, using the projected view. */
export function pitchIntent(kind: ControlKind, lateral: Vec): ControlKind {
  if (kind === 'pass-left' || kind === 'pass-right') {
    const positive = (kind === 'pass-right' ? 1 : -1) * lateral.x > 0;
    return positive ? 'pass-right' : 'pass-left';
  }
  if (kind === 'step-up' || kind === 'step-down') {
    const positive = (kind === 'step-down' ? 1 : -1) * lateral.y > 0;
    return positive ? 'step-down' : 'step-up';
  }
  return kind;
}

export class ControlsLayer {
  private readonly pointers = new Set<number>();
  private points: GesturePoint[] = [];
  private started = 0;
  private pointer: number | null = null;
  private readonly skip: HTMLButtonElement;
  private readonly badge: HTMLSpanElement;
  private hint: HTMLButtonElement | null = null;
  private readonly line: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly styles: HTMLStyleElement;
  private readonly canvas: HTMLCanvasElement;
  private compact = false;

  constructor(private readonly scene: Phaser.Scene & LivePlaybackScene, private readonly pb: LivePlayback, private readonly mine: Side, slot: HTMLElement) {
    this.canvas = scene.game.canvas;
    this.skip = button('Skip set', () => pb.skipSet(), { class: 'nrl-mo-labs-skip' });
    slot.append(this.skip);
    this.badge = document.createElement('span');
    this.badge.className = 'nrl-labs-badge';
    this.badge.textContent = 'LABS';
    slot.classList.add('nrl-labs-controls');
    document.body.append(this.badge);
    this.styles = document.createElement('style');
    this.styles.textContent = `
      .nrl-labs-badge { position:fixed; right:calc(12px + var(--nrl-safe-r)); top:calc(76px + var(--nrl-safe-t)); z-index:14; pointer-events:none; color:var(--nrl-accent); background:var(--nrl-navy); font:700 10px var(--nrl-f-label); padding:3px 5px; border-radius:4px; }
      .nrl-mo-controls .nrl-btn.nrl-mo-labs-skip { width:auto; max-width:104px; min-height:44px; padding:0 6px; font-size:0.75rem; white-space:normal; line-height:1.05; }
      .nrl-labs-controls.nrl-labs-compact .nrl-mo-speed:not([aria-pressed="true"]) { display:none; }
      .nrl-labs-hint { position:fixed; inset:0; z-index:24; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(14,22,48,0.78); color:var(--nrl-text); font:1rem var(--nrl-f-body); line-height:1.5; border:0; }
      @media(max-width:700px) { .nrl-mo-controls:has(.nrl-mo-labs-skip) { gap:0; padding:0 4px; } .nrl-mo-controls .nrl-btn.nrl-mo-labs-skip { max-width:76px; font-size:0.6875rem; } }
    `;
    document.head.append(this.styles);
    this.line = scene.add.graphics().setDepth(89000);
    this.label = scene.add.text(0, 0, '', { fontSize: '14px', color: COLOR_TOKENS.accent, backgroundColor: COLOR_TOKENS.navy }).setDepth(89001).setOrigin(0.5, 1).setVisible(false);
    window.addEventListener('pointerdown', this.down, { passive: true });
    window.addEventListener('pointermove', this.move, { passive: true });
    window.addEventListener('pointerup', this.up, { passive: true });
    window.addEventListener('pointercancel', this.cancelPointer, { passive: true });
    window.addEventListener('blur', this.cancel);
    window.addEventListener('resize', this.uncompact);
    scene.events.on('update', this.update);
  }
  private pitchHit(x: number, y: number): boolean { return document.elementFromPoint(x, y) === this.canvas; }
  private world(at: Vec): Vec {
    const f = toFieldPt(at);
    return this.scene.fieldToWorld(f.fx, f.fy);
  }
  private axis(): { forward: Vec; lateral: Vec } {
    const o = this.world({ x: 0, y: 0 }), x = this.world({ x: 1, y: 0 }), y = this.world({ x: 0, y: 1 });
    return { forward: { x: x.x - o.x, y: x.y - o.y }, lateral: { x: y.x - o.x, y: y.y - o.y } };
  }
  private context(): GestureContext {
    const f = this.axis().forward;
    return { lastTackle: this.pb.controlTackle === SET_TACKLES - 1, attack: { x: f.x * this.pb.controlDirection, y: f.y * this.pb.controlDirection } };
  }
  private aim(): Vec {
    const a = this.points[0]!, b = this.points[this.points.length - 1]!;
    const rect = this.canvas.getBoundingClientRect();
    const camera = this.scene.cameras.main;
    const scale = this.scene.scale.width / rect.width / camera.zoom;
    const dx = (a.x - b.x) * scale, dy = (a.y - b.y) * scale;
    const { forward: f, lateral: l } = this.axis();
    const det = f.x * l.y - f.y * l.x;
    const ball = this.pb.controlPicture.ball;
    return { x: ball.x + (dx * l.y - dy * l.x) / det, y: ball.y + (dy * f.x - dx * f.y) / det };
  }
  private down = (e: PointerEvent): void => {
    this.pointers.add(e.pointerId);
    if (this.pointers.size !== 1) { this.cancel(); return; }
    if (!this.pb.controlsAvailable || this.pb.controlAttacking !== this.mine || !this.pitchHit(e.clientX, e.clientY)) return;
    this.pointer = e.pointerId;
    this.started = performance.now();
    this.points = [{ x: e.clientX, y: e.clientY }];
  };
  private move = (e: PointerEvent): void => {
    if (this.pointer !== e.pointerId) return;
    if (!this.pb.controlsAvailable || !this.pitchHit(e.clientX, e.clientY)) { this.cancel(); return; }
    this.points.push({ x: e.clientX, y: e.clientY });
    this.drawAim();
  };
  private up = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointer !== e.pointerId) return;
    if (this.pitchHit(e.clientX, e.clientY)) {
      this.points.push({ x: e.clientX, y: e.clientY });
      const kind = classifyGesture(this.points, performance.now() - this.started, this.context());
      if (kind) this.pb.control(pitchIntent(kind, this.axis().lateral), kind === 'kick' ? this.aim() : undefined);
    }
    this.cancel();
  };
  private cancelPointer = (e: PointerEvent): void => { this.pointers.delete(e.pointerId); this.cancel(); };
  private cancel = (): void => { this.pointer = null; this.points = []; this.line.clear(); this.label.setVisible(false); };
  private drawAim(): void {
    this.line.clear();
    this.label.setVisible(false);
    if (classifyGesture(this.points, performance.now() - this.started, this.context()) !== 'kick') return;
    const ball = this.pb.controlPicture.ball, aim = this.aim();
    const a = this.world(ball), b = this.world(aim);
    const zoom = this.scene.cameras.main.zoom;
    this.line.lineStyle(2 / zoom, Number.parseInt(COLOR_TOKENS.accent.slice(1), 16), 1);
    const n = Math.max(2, Math.ceil(dist(a, b) * zoom / 8));
    for (let i = 0; i < n; i += 2) this.line.lineBetween(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, a.x + (b.x - a.x) * (i + 1) / n, a.y + (b.y - a.y) * (i + 1) / n);
    this.line.strokeCircle(b.x, b.y, 7 / zoom);
    this.label.setText(controlKickBand(dist(ball, aim), LIVE.controlsChipFromM, LIVE.controlsBombFromM).toUpperCase()).setPosition((a.x + b.x) / 2, (a.y + b.y) / 2 - 8 / zoom).setScale(1 / zoom).setVisible(true);
  }
  private uncompact = (): void => {
    this.compact = false;
    this.skip.parentElement?.classList.remove('nrl-labs-compact');
  };
  private update = (): void => {
    const text = this.pb.controlAttacking === this.mine ? 'Skip set' : 'Skip to our ball';
    if (this.skip.textContent !== text) { this.skip.textContent = text; this.uncompact(); }
    this.skip.disabled = !this.pb.controlsAvailable;
    const slot = this.skip.parentElement;
    const bar = slot?.closest('.nrl-mo-bar');
    if (slot && bar && !this.compact && bar.scrollWidth > bar.clientWidth) {
      this.compact = true;
      slot.classList.add('nrl-labs-compact');
    }
    if (slot && this.compact && window.innerWidth > 720) {
      this.compact = false;
      slot.classList.remove('nrl-labs-compact');
    }
    this.skip.hidden = this.pb.finished;
    this.badge.hidden = this.pb.finished;
    if (!this.pb.controlsAvailable) this.cancel();
    else if (!hintSeen('match-controls') && !this.hint && this.pb.controlAttacking === this.mine && this.pb.controlPhase === 'play' && this.pb.controlPicture.ball.holder?.side === this.mine) {
      this.pb.hold();
      this.hint = button('Swipe ← → to pass · ↑ ↓ to step · drag back to kick on the last', () => {
        markHintSeen('match-controls');
        this.hint?.remove(); this.hint = null; this.pb.release();
      }, { class: 'nrl-labs-hint' });
      this.hint.classList.remove('nrl-btn');
      this.hint.style.pointerEvents = 'auto';
      document.body.append(this.hint);
    }
    if (this.pointer !== null) this.drawAim();
  };
  destroy(): void {
    window.removeEventListener('pointerdown', this.down);
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    window.removeEventListener('pointercancel', this.cancelPointer);
    window.removeEventListener('blur', this.cancel);
    window.removeEventListener('resize', this.uncompact);
    this.scene.events.off('update', this.update);
    if (this.hint) { this.hint.remove(); this.pb.release(); }
    this.skip.parentElement?.classList.remove('nrl-labs-controls', 'nrl-labs-compact');
    this.skip.remove(); this.badge.remove(); this.styles.remove(); this.line.destroy(); this.label.destroy();
  }
}
