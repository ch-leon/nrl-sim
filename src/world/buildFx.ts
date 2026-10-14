// src/world/buildFx.ts — Phaser glue for build feedback (GitHub #24): the textured
// placement ghost, and the construction / upgrade animations. Maths lives in
// ./buildFeedback (unit-tested). Presentation only: animations are driven off the
// scene's update event, never gate input and never touch GameState, so state
// timing is unchanged (the facility exists in state the instant it is placed).
import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config';
import type { FacilityDef } from '../data/facility';
import { footprintCentre, strokeFootprint } from './ghostPreview';
import {
  constructionDuration,
  constructionFrame,
  footprintCorners,
  prefersReducedMotion,
  scaleAbout,
  upgradeFrame,
  UPGRADE_FLASH_MS,
} from './buildFeedback';

const KEY_PARTICLE = 'particle-square';
const SCAFFOLD_COLOR = 0xd9a441;

type Pt = { x: number; y: number };

interface Job {
  kind: 'build' | 'upgrade';
  sprite: Phaser.GameObjects.Image;
  def: FacilityDef;
  top: Pt;
  elapsed: number;
  gfx: Phaser.GameObjects.Graphics;
  nextDust: number;
}

/** Construction + upgrade animations for placed facility sprites. */
export class BuildFx {
  private jobs: Job[] = [];
  private dust: Phaser.GameObjects.Particles.ParticleEmitter | undefined;
  private sparkle: Phaser.GameObjects.Particles.ParticleEmitter | undefined;

  constructor(private scene: Phaser.Scene) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.step, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
      this.jobs = [];
      this.dust = undefined;
      this.sparkle = undefined;
    });
  }

  /** ~1.5s of scaffolding + dust, then the building pops in with a squash and stretch. */
  construct(sprite: Phaser.GameObjects.Image, def: FacilityDef, top: Pt): void {
    if (constructionDuration(prefersReducedMotion()) === 0) return;
    this.start({ kind: 'build', sprite, def, top });
    sprite.setAlpha(0);
  }

  /** Short scaffold flash and sparkle over the swap to the next level's art. */
  upgrade(sprite: Phaser.GameObjects.Image, def: FacilityDef, top: Pt): void {
    if (prefersReducedMotion()) return;
    this.start({ kind: 'upgrade', sprite, def, top });
    this.sparkleAt(footprintCentre(top, def));
  }

  private start(j: Pick<Job, 'kind' | 'sprite' | 'def' | 'top'>): void {
    // Replace any running job on the same sprite.
    this.jobs = this.jobs.filter((o) => {
      if (o.sprite !== j.sprite) return true;
      o.gfx.destroy();
      return false;
    });
    const gfx = this.scene.add.graphics();
    this.jobs.push({ ...j, elapsed: 0, gfx, nextDust: 0 });
  }

  private emitters(): boolean {
    if (this.dust) return true;
    if (!this.scene.textures.exists(KEY_PARTICLE)) return false;
    this.dust = this.scene.add.particles(0, 0, KEY_PARTICLE, {
      lifespan: 600,
      speed: { min: 15, max: 50 },
      scale: { start: 1.6, end: 0 },
      tint: [0x9a9a9a, 0xb5b5b5, 0x808080],
      alpha: { start: 0.7, end: 0 },
      gravityY: -20,
      emitting: false,
      maxAliveParticles: 40,
    });
    this.sparkle = this.scene.add.particles(0, 0, KEY_PARTICLE, {
      lifespan: 700,
      speed: { min: 40, max: 110 },
      scale: { start: 1.4, end: 0 },
      tint: [0xffe680, 0xffd23b, 0xfff4c0],
      gravityY: 140,
      emitting: false,
      maxAliveParticles: 24,
    });
    this.dust.setDepth(100_000);
    this.sparkle.setDepth(100_000);
    return true;
  }

  private sparkleAt(p: Pt): void {
    if (this.emitters()) this.sparkle!.explode(14, p.x, p.y);
  }

  private step(_time: number, delta: number): void {
    if (this.jobs.length === 0) return;
    const reduced = prefersReducedMotion();
    this.jobs = this.jobs.filter((j) => {
      if (!j.sprite.active) {
        j.gfx.destroy();
        return false;
      }
      j.elapsed += delta;
      const done = j.kind === 'build' ? this.stepBuild(j, reduced) : this.stepUpgrade(j, reduced);
      if (done) j.gfx.destroy();
      return !done;
    });
  }

  private drawScaffold(j: Job, alpha: number): void {
    const front = j.sprite.depth + 0.2;
    j.gfx.clear().setDepth(front);
    const { w, h } = j.def.footprint;
    const c = footprintCorners(j.top, w, h, TILE_W, TILE_H);
    const poleH = 34 + (w + h) * 4;
    j.gfx.lineStyle(2, SCAFFOLD_COLOR, alpha);
    for (const p of c) j.gfx.lineBetween(p.x, p.y, p.x, p.y - poleH);
    // Cross-bars at two heights along the two front edges, plus a top ring.
    for (const frac of [0.4, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = c[i]!;
        const b = c[(i + 1) % 4]!;
        j.gfx.lineBetween(a.x, a.y - poleH * frac, b.x, b.y - poleH * frac);
      }
    }
    strokeFootprint(j.gfx, j.top, j.def, SCAFFOLD_COLOR, false);
  }

  private stepBuild(j: Job, reduced: boolean): boolean {
    const f = constructionFrame(j.elapsed, reduced);
    j.sprite.setAlpha(f.buildingAlpha);
    const centre = footprintCentre(j.top, j.def);
    const p = scaleAbout(j.top, centre, f.scaleX, f.scaleY);
    j.sprite.setScale(f.scaleX, f.scaleY).setPosition(p.x, p.y);
    if (f.phase === 'done') {
      j.sprite.setPosition(j.top.x, j.top.y).setScale(1).setAlpha(1);
      this.sparkleAt(centre);
      return true;
    }
    this.drawScaffold(j, f.scaffoldAlpha);
    if (f.phase === 'scaffold' && j.elapsed >= j.nextDust && this.emitters()) {
      j.nextDust = j.elapsed + 220;
      this.dust!.explode(4, centre.x + (Math.random() - 0.5) * TILE_W, centre.y);
    }
    return false;
  }

  private stepUpgrade(j: Job, reduced: boolean): boolean {
    const f = upgradeFrame(j.elapsed, reduced);
    if (f.done) return true;
    this.drawScaffold(j, f.flashAlpha);
    return j.elapsed >= UPGRADE_FLASH_MS;
  }
}
