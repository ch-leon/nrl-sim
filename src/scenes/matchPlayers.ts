import type Phaser from 'phaser';
import { PixelBuffer } from '../art/pixel';
import type { Kit } from '../art/match/kit';
import type { PlayerAnim } from '../art/match/players';
import type { RingStyle } from '../art/match/kitClash';
import { liveRingPixels, RING_SCALE } from '../match/view/ringTexture';
import { appearanceFor, WIDTH, HEIGHT, CENTRE, FOOT, type Appearance } from '../art/prototype/player';
import { drawLivePlayer } from '../art/match/livePlayer';
import { CONTACT_W, CONTACT_H, CONTACT_X, CONTACT_FOOT, drawContact } from '../art/prototype/contact';
import type { MatchArtRegistry } from './matchArt';
import type { PlayerPicture } from '../match/view/playerPicture';
import type { ContactAnimation } from '../match/view/contactAnimation';
import type { ContactLayout } from '../match/view/contactLayout';
import type { Side } from '../match/core/snapshot';

/**
 * Frames kept, 7 KB each (44×40 RGBA): 768 is 5.4 MB. A whole match draws about 3,600 distinct
 * frames and the busiest passage wants some 465 at once; at 512 one lookup in nine missed, at
 * 768 one in twenty (#646). A miss is a 0.1 ms repaint, so this is headroom for more poses, not a fix.
 */
export const FRAME_CACHE_SIZE = 768;

/** What the cache has done since it was built (the perf harness and the lab read it). */
export interface FrameCacheStats { hits: number; misses: number; evictions: number; peak: number }

/** The fields of a picture that decide which frame is drawn. */
function frameKey(side: Side, p: PlayerPicture): string {
  // A fresh man's key is as it was: tiredness (#666) only adds entries for the tired.
  return `${side}/${p.who}/${p.action}/${p.frame}/${p.strideFrame ?? 'legacy'}/${p.facing}/${p.possession}${p.tired ? `/t${p.tired}` : ''}${p.lookUp ? `/u${p.lookUp}` : ''}`;
}

/** CPU frames only: bounded independently of match length and interchanges. */
export class PlayerFrameCache {
  /** key → frame and the use counter it was last asked for at (least recently used goes first). */
  private frames = new Map<string, { pixels: PixelBuffer; used: number }>();
  private clock = 0;
  private counts: FrameCacheStats = { hits: 0, misses: 0, evictions: 0, peak: 0 };
  constructor(private readonly kits: Record<Side, Kit>, private readonly look: (who: string) => Appearance = appearanceFor, readonly capacity = FRAME_CACHE_SIZE) {}
  get(side: Side, p: PlayerPicture): PixelBuffer {
    const key = frameKey(side, p);
    const hit = this.frames.get(key);
    // A hit is a stamp, not a delete-and-reinsert: the Map is not reshuffled 600 times a second.
    if (hit) { hit.used = ++this.clock; this.counts.hits++; return hit.pixels; }
    this.counts.misses++;
    const pixels = drawLivePlayer(this.look(p.who), this.kits[side], p.action, p.frame, p.facing, p.possession, p.strideFrame, p.tired, p.lookUp);
    if (this.frames.size >= this.capacity) this.evict();
    this.frames.set(key, { pixels, used: ++this.clock });
    if (this.frames.size > this.counts.peak) this.counts.peak = this.frames.size;
    return pixels;
  }
  private evict(): void {
    let oldest = Infinity; let victim = '';
    for (const [key, e] of this.frames) if (e.used < oldest) { oldest = e.used; victim = key; }
    this.frames.delete(victim); this.counts.evictions++;
  }
  clear(): void { this.frames.clear(); }
  get size(): number { return this.frames.size; }
  stats(): FrameCacheStats { return { ...this.counts }; }
}

/** A side's ring, painted once per scene and shared by its eighteen actors (one texture, one batch). */
const ringKeys = new WeakMap<MatchArtRegistry, Map<string, string>>();
function ringTexture(art: MatchArtRegistry, color: number, style: RingStyle): string {
  const keys = ringKeys.get(art) ?? new Map<string, string>(); ringKeys.set(art, keys);
  const id = `${style}-${color.toString(16)}`;
  let key = keys.get(id);
  if (!key) {
    key = art.texture(`live-ring-${id}`, liveRingPixels(style, color));
    keys.set(id, key);
  }
  return key;
}

/** One small reusable GPU texture per actor, not a texture for every appearance/frame. */
class PaintedTexture {
  readonly key: string;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly pixels: ImageData;
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, key: string, w: number, h: number) {
    this.key = art.texture(key, new PixelBuffer(w, h));
    this.texture = scene.textures.get(this.key) as Phaser.Textures.CanvasTexture;
    this.pixels = this.texture.getContext().createImageData(w, h);
  }
  paint(buffer: PixelBuffer): void {
    this.pixels.data.set(buffer.data);
    this.texture.getContext().putImageData(this.pixels, 0, 0); this.texture.refresh();
  }
}

/** The same frame to draw (position, lift and mirroring are not part of it). */
function samePicture(a: PlayerPicture, b: PlayerPicture): boolean {
  return a.who === b.who && a.action === b.action && a.frame === b.frame && a.strideFrame === b.strideFrame && a.facing === b.facing && a.possession === b.possession && a.tired === b.tired && a.lookUp === b.lookUp;
}

export class MatchActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly texture: PaintedTexture;
  private previousPixels: PixelBuffer | null = null;
  /** The picture behind `previousPixels`: asked again, the cache and the texture are left alone. */
  private shown: PlayerPicture | null = null;
  private lift = 0;
  private who: string;
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, private readonly cache: PlayerFrameCache, private readonly side: Side, slot: number, who: string, shadowKey: string, ringColor: number, ringStyle: RingStyle) {
    this.who = who;
    this.texture = new PaintedTexture(scene, art, `live-player-${side}-${slot}`, WIDTH, HEIGHT);
    this.sprite = scene.add.sprite(0, 0, this.texture.key).setOrigin(CENTRE / WIDTH, FOOT / HEIGHT);
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(-80_000);
    this.ring = scene.add.image(0, 0, ringTexture(art, ringColor, ringStyle)).setScale(1 / RING_SCALE).setDepth(-79_999.5);
    this.paint({ who, action: 'idle', frame: 0, facing: 'front', left: false, possession: false });
  }
  place(x: number, y: number, depth: number): void {
    this.sprite.setPosition(x, y - this.lift).setDepth(depth); this.shadow.setPosition(x, y); this.ring.setPosition(x, y);
  }
  wear(who: string): void { this.who = who; }
  paint(picture: PlayerPicture): void {
    this.who = picture.who;
    this.lift = picture.lift ?? 0;
    this.sprite.setY(this.shadow.y - this.lift);
    if (!this.shown || !samePicture(this.shown, picture)) {
      const pixels = this.cache.get(this.side, picture);
      if (pixels !== this.previousPixels) { this.texture.paint(pixels); this.previousPixels = pixels; }
      this.shown = { ...picture };
    }
    // Mirroring a non-centred frame must preserve its feet origin.
    this.sprite.setOrigin((picture.left ? WIDTH - CENTRE : CENTRE) / WIDTH, FOOT / HEIGHT).setFlipX(picture.left);
  }
  play(anim: PlayerAnim, faceLeft: boolean, _timeScale: number): void {
    this.paint({ who: this.who, action: anim, frame: 0, facing: 'front', left: faceLeft, possession: false });
  }
  setSpriteVisible(visible: boolean): void { this.sprite.setVisible(visible); }
  /** A substitute fades in: his shadow and ring with him. */
  fade(alpha: number): void { this.sprite.setAlpha(alpha); this.shadow.setAlpha(alpha); this.ring.setAlpha(alpha); }
}

export class MatchContactLayer {
  private readonly texture: PaintedTexture;
  readonly sprite: Phaser.GameObjects.Image;
  private key = '';
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, private readonly kits: Record<Side, Kit>, private readonly look: (who: string) => Appearance = appearanceFor) {
    this.texture = new PaintedTexture(scene, art, 'live-contact', CONTACT_W, CONTACT_H);
    this.sprite = scene.add.image(0, 0, this.texture.key).setVisible(false);
  }
  paint(state: ContactAnimation | null, layout: ContactLayout | null, facing: 'front' | 'back'): void {
    if (!state || !layout) { this.sprite.setVisible(false); this.key = ''; return; }
    // Rounded local positions bound work to changed pixel poses; pauses upload nothing.
    const key = JSON.stringify([state.tick, state.contact.startedTick, state.kind, facing, layout.pose]);
    if (key !== this.key) {
      this.texture.paint(drawContact(state, p => this.look(p.who), p => this.kits[p.side], facing, layout.pose)); this.key = key;
    }
    this.sprite.setOrigin((layout.left ? CONTACT_W - CONTACT_X : CONTACT_X) / CONTACT_W, CONTACT_FOOT / CONTACT_H)
      .setFlipX(layout.left).setPosition(layout.x, layout.y).setDepth(Math.max(...layout.feet.map(p => p.y)) + 1.02).setVisible(true);
  }
}
