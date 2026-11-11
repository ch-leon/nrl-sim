import type Phaser from 'phaser';
import { PixelBuffer } from '../art/pixel';
import type { Kit } from '../art/match/kit';
import type { PlayerAnim } from '../art/match/players';
import type { RingStyle } from '../art/match/kitClash';
import { drawRing } from '../match/view/rings';
import { appearanceFor, WIDTH, HEIGHT, CENTRE, FOOT } from '../art/prototype/player';
import { drawLivePlayer } from '../art/match/livePlayer';
import { CONTACT_W, CONTACT_H, CONTACT_X, CONTACT_FOOT, drawContact } from '../art/prototype/contact';
import type { MatchArtRegistry } from './matchArt';
import type { PlayerPicture } from '../match/view/playerPicture';
import type { ContactAnimation } from '../match/view/contactAnimation';
import type { ContactLayout } from '../match/view/contactLayout';
import type { Side } from '../match/core/snapshot';

/** CPU frames only: bounded independently of match length and interchanges. */
export class PlayerFrameCache {
  private frames = new Map<string, PixelBuffer>();
  constructor(private readonly kits: Record<Side, Kit>) {}
  get(side: Side, p: PlayerPicture): PixelBuffer {
    const key = `${side}/${p.who}/${p.action}/${p.frame}/${p.facing}/${p.possession}`;
    const hit = this.frames.get(key);
    if (hit) { this.frames.delete(key); this.frames.set(key, hit); return hit; }
    const pixels = drawLivePlayer(appearanceFor(p.who), this.kits[side], p.action, p.frame, p.facing, p.possession);
    if (this.frames.size >= 512) this.frames.delete(this.frames.keys().next().value!);
    this.frames.set(key, pixels); return pixels;
  }
  clear(): void { this.frames.clear(); }
  get size(): number { return this.frames.size; }
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

export class MatchActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly texture: PaintedTexture;
  private previousPixels: PixelBuffer | null = null;
  private who: string;
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, private readonly cache: PlayerFrameCache, private readonly side: Side, slot: number, who: string, shadowKey: string, ringColor: number, ringStyle: RingStyle) {
    this.who = who;
    this.texture = new PaintedTexture(scene, art, `live-player-${side}-${slot}`, WIDTH, HEIGHT);
    this.sprite = scene.add.sprite(0, 0, this.texture.key).setOrigin(CENTRE / WIDTH, FOOT / HEIGHT);
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(-80_000);
    this.ring = scene.add.graphics().setDepth(-79_999.5);
    drawRing(this.ring, 0, 0, 15, 7.5, ringStyle, { color: ringColor, width: 1.5, alpha: .9, fillAlpha: ringStyle === 'solid' ? .28 : .1 });
    this.paint({ who, action: 'idle', frame: 0, facing: 'front', left: false, possession: false });
  }
  place(x: number, y: number, depth: number): void {
    this.sprite.setPosition(x, y).setDepth(depth); this.shadow.setPosition(x, y); this.ring.setPosition(x, y);
  }
  wear(who: string): void { this.who = who; }
  paint(picture: PlayerPicture): void {
    this.who = picture.who;
    const pixels = this.cache.get(this.side, picture);
    if (pixels !== this.previousPixels) { this.texture.paint(pixels); this.previousPixels = pixels; }
    // Mirroring a non-centred frame must preserve its feet origin.
    this.sprite.setOrigin((picture.left ? WIDTH - CENTRE : CENTRE) / WIDTH, FOOT / HEIGHT).setFlipX(picture.left);
  }
  play(anim: PlayerAnim, faceLeft: boolean, _timeScale: number): void {
    this.paint({ who: this.who, action: anim, frame: 0, facing: 'front', left: faceLeft, possession: false });
  }
  setSpriteVisible(visible: boolean): void { this.sprite.setVisible(visible); }
}

export class MatchContactLayer {
  private readonly texture: PaintedTexture;
  readonly sprite: Phaser.GameObjects.Image;
  private key = '';
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, private readonly kits: Record<Side, Kit>) {
    this.texture = new PaintedTexture(scene, art, 'live-contact', CONTACT_W, CONTACT_H);
    this.sprite = scene.add.image(0, 0, this.texture.key).setVisible(false);
  }
  paint(state: ContactAnimation | null, layout: ContactLayout | null, facing: 'front' | 'back'): void {
    if (!state || !layout) { this.sprite.setVisible(false); this.key = ''; return; }
    // Rounded local positions bound work to changed pixel poses; pauses upload nothing.
    const key = JSON.stringify([state.tick, state.contact.startedTick, state.kind, facing, layout.pose]);
    if (key !== this.key) {
      this.texture.paint(drawContact(state, p => appearanceFor(p.who), p => this.kits[p.side], facing, layout.pose)); this.key = key;
    }
    this.sprite.setOrigin((layout.left ? CONTACT_W - CONTACT_X : CONTACT_X) / CONTACT_W, CONTACT_FOOT / CONTACT_H)
      .setFlipX(layout.left).setPosition(layout.x, layout.y).setDepth(Math.max(...layout.feet.map(p => p.y)) + 1.02).setVisible(true);
  }
}
