// src/scenes/groundsLife.ts — renders the grounds' cast (GitHub #23).
//
// The pure plan comes from src/world/groundsLife.ts. Here each agent is one
// sprite that walks A* paths over the scene's WalkGrid (so nobody crosses a
// building), plays its activity at each stop, and depth-sorts exactly like the
// manager (ARCHITECTURE §7: layer 2, forward cell while in transit). Presentation
// only: this reads game state and never writes it. GroundsScene just constructs
// it after the facilities render; it rebuilds itself when the week, facilities or
// the squad's injury/morale bands change.
import Phaser from 'phaser';
import { DEFAULT_PLAYER_COLORS, TILE_H } from '../config';
import { depth } from '../world/iso';
import { findPath, type PathNode, type WalkGrid } from '../world/path';
import { bus } from '../core/events';
import { getState } from '../core/state';
import { getCurrentFixture } from '../systems/fixtures';
import { kitFromColors, type Kit } from '../art/match/kit';
import { toTexture } from '../art/pixel';
import { CHAR_DIRS, CHAR_FOOT_Y, CHAR_H, CHAR_W } from '../art/grounds/manager';
import {
  LIFE_PROPS,
  lifePropTextures,
  personAtlas,
  personFrameName,
  personFrameX,
  personKey,
  personLook,
  type PersonKind,
} from '../art/grounds/people';
import { planLife, type Dir, type LifeAgent, type Stop } from '../world/groundsLife';

const CHAR_LAYER = 2;
const WALK_SPEED = 80; // px/s — an amble; the manager's tap-to-move is 120
const DRILL_MUL = 1.7;
const FRAME_MS = 125; // 8fps walk, as the manager
const FALLBACK_COLORS = DEFAULT_PLAYER_COLORS;

interface Hooks {
  scene: Phaser.Scene;
  walkGrid: () => WalkGrid;
  cellToWorld: (gx: number, gy: number) => { x: number; y: number };
}

interface Live {
  agent: LifeAgent;
  atlas: string;
  sprite: Phaser.GameObjects.Sprite;
  emote?: Phaser.GameObjects.Image | undefined;
  prop?: Phaser.GameObjects.Image | undefined;
  bed?: Phaser.GameObjects.Image | undefined;
  stopIdx: number;
  mode: 'act' | 'walk';
  path: PathNode[];
  /** True foot position; the sprite is drawn at this plus the pose offset. */
  px: number;
  py: number;
  cell: { x: number; y: number };
  dir: Dir;
  timer: number;
  clock: number;
}

const kindOf = (a: LifeAgent): PersonKind => a.role;

export class GroundsLife {
  private live: Live[] = [];
  private atlases = new Set<string>();
  private signature = '';
  private offs: (() => void)[] = [];

  constructor(private readonly h: Hooks) {
    this.ensureProps();
    // Registered after GroundsScene's own handlers, so walk-grid blocking is up to date.
    this.offs.push(bus.on('facility:placed', () => this.refresh()));
    this.offs.push(bus.on('state:changed', () => this.refresh()));
    this.refresh();
  }

  /** Cast size — for debugging and QA. */
  count(): number {
    return this.live.length;
  }

  destroy(): void {
    for (const off of this.offs) off();
    this.offs = [];
    this.clear();
    for (const key of this.atlases) if (this.h.scene.textures.exists(key)) this.h.scene.textures.remove(key);
    this.atlases.clear();
  }

  // ── Planning ──

  private currentSignature(): string {
    const s = getState();
    const facs = s.facilities.map((f) => `${f.id}:${f.defId}@${f.x},${f.y}`).join('|');
    const squad = s.squad.map((p) => `${p.id}${p.injuredWeeks > 0 ? '!' : p.morale < 40 ? 'l' : p.morale >= 75 ? 'h' : ''}`).join(',');
    // The kit design (#79) re-dresses the cast when it changes.
    const kit = s.kit ? `${s.kit.pattern}${s.kit.trim}` : '';
    return `${s.season}/${s.week}/${this.matchWeek() ? 1 : 0}/${facs}/${squad}/${kit}`;
  }

  private matchWeek(): boolean {
    const s = getState();
    return getCurrentFixture(s, 'player') !== undefined;
  }

  private kit(): Kit {
    const s = getState();
    const club = s.league.clubs.find((c) => c.id === s.clubId);
    return kitFromColors(club?.colors ?? FALLBACK_COLORS, s.clubId);
  }

  private refresh(): void {
    const sig = this.currentSignature();
    if (sig === this.signature) return;
    this.signature = sig;
    this.clear();
    const s = getState();
    const agents = planLife({
      season: s.season,
      week: s.week,
      grid: this.h.walkGrid(),
      facilities: s.facilities.map((f) => ({ id: f.id, defId: f.defId, x: f.x, y: f.y })),
      squad: s.squad.map((p) => ({ id: p.id, name: p.name, morale: p.morale, injuredWeeks: p.injuredWeeks })),
      matchWeek: this.matchWeek(),
      reputation: s.reputation,
    });
    const kit = this.kit();
    for (const a of agents) this.spawn(a, kit);
  }

  private clear(): void {
    for (const l of this.live) {
      l.sprite.destroy();
      l.emote?.destroy();
      l.prop?.destroy();
      l.bed?.destroy();
    }
    this.live = [];
  }

  // ── Textures ──

  private ensureProps(): void {
    for (const { key, buf } of lifePropTextures()) {
      if (!this.h.scene.textures.exists(key)) {
        toTexture(this.h.scene, key, buf);
        this.atlases.add(key);
      }
    }
  }

  /** One strip atlas per distinct look, generated on first use. */
  private ensureAtlas(look: ReturnType<typeof personLook>): string {
    const key = personKey(look);
    const tm = this.h.scene.textures;
    if (!tm.exists(key)) {
      toTexture(this.h.scene, key, personAtlas(look));
      const tex = tm.get(key);
      for (const dir of CHAR_DIRS) {
        for (const f of [null, 0, 1, 2, 3]) tex.add(personFrameName(dir, f), 0, personFrameX(dir, f), 0, CHAR_W, CHAR_H);
      }
      this.atlases.add(key);
    }
    return key;
  }

  // ── Agents ──

  private spawn(agent: LifeAgent, kit: Kit): void {
    const { scene } = this.h;
    const first = agent.stops[0]!;
    const atlas = this.ensureAtlas(personLook(kindOf(agent), agent.lookKey, kit));
    const w = this.h.cellToWorld(first.cell.x, first.cell.y);
    const sprite = scene.add.sprite(w.x, w.y + TILE_H / 2, atlas, personFrameName(first.face, null));
    sprite.setOrigin(0.5, (CHAR_FOOT_Y + 1) / CHAR_H);
    const live: Live = {
      agent,
      atlas,
      sprite,
      stopIdx: 0,
      mode: 'act',
      path: [],
      px: w.x,
      py: w.y + TILE_H / 2,
      cell: { ...first.cell },
      dir: first.face,
      timer: first.dwell * agent.phase,
      clock: agent.phase * 1000,
    };
    if (agent.mood.emote) {
      live.emote = scene.add.image(w.x, w.y, agent.mood.emote === 'cloud' ? LIFE_PROPS.cloud : LIFE_PROPS.cross).setOrigin(0.5, 1);
    }
    if (agent.mood.slump) sprite.setScale(1, 0.9);
    this.live.push(live);
    this.beginStop(live);
    this.place(live);
  }

  update(deltaMs: number): void {
    for (const l of this.live) {
      l.clock += deltaMs;
      if (l.mode === 'walk') this.stepWalk(l, deltaMs);
      else this.stepAct(l, deltaMs);
      this.place(l);
    }
  }

  private stop(l: Live): Stop {
    return l.agent.stops[l.stopIdx % l.agent.stops.length]!;
  }

  private stepWalk(l: Live, deltaMs: number): void {
    const next = l.path[0];
    if (!next) {
      this.beginStop(l);
      return;
    }
    const { mood } = l.agent;
    const drill = this.stop(l).kind === 'drill';
    const move = (WALK_SPEED * mood.speedMul * (drill ? DRILL_MUL : 1) * deltaMs) / 1000;
    const target = this.h.cellToWorld(next.x, next.y);
    const ty = target.y + TILE_H / 2;
    const dx = target.x - l.px;
    const dy = ty - l.py;
    const dist = Math.hypot(dx, dy);
    l.dir = stepDirOf(next.x - l.cell.x, next.y - l.cell.y);
    if (dist <= move || dist === 0) {
      l.px = target.x;
      l.py = ty;
      l.cell = { x: next.x, y: next.y };
      l.path.shift();
      if (l.path.length === 0) this.beginStop(l);
    } else {
      l.px += (dx / dist) * move;
      l.py += (dy / dist) * move;
    }
  }

  /** Arrived (or spawned): take the stop's pose. */
  private beginStop(l: Live): void {
    const stop = this.stop(l);
    l.mode = 'act';
    l.dir = stop.face;
    // `timer` is pre-seeded (phase) on spawn; later stops start a full dwell.
    if (l.timer <= 0) l.timer = stop.dwell;
    this.applyPose(l, stop);
  }

  private stepAct(l: Live, deltaMs: number): void {
    l.timer -= deltaMs / 1000;
    if (l.timer > 0) return;
    const nextIdx = (l.stopIdx + 1) % l.agent.stops.length;
    const next = l.agent.stops[nextIdx]!;
    this.clearPose(l);
    l.stopIdx = nextIdx;
    l.timer = 0;
    if (next.cell.x === l.cell.x && next.cell.y === l.cell.y) {
      this.beginStop(l);
      return;
    }
    const path = findPath(this.h.walkGrid(), l.cell, next.cell);
    if (path.length === 0) {
      this.beginStop(l); // unreachable right now — just stay put and carry on
      return;
    }
    l.path = path;
    l.mode = 'walk';
  }

  private applyPose(l: Live, stop: Stop): void {
    const { scene } = this.h;
    l.sprite.setVisible(true);
    if (stop.kind === 'video') {
      l.sprite.setVisible(false); // inside, watching the footage
      l.emote?.setVisible(false);
    } else if (stop.kind === 'sit') {
      l.sprite.setCrop(0, 0, CHAR_W, CHAR_FOOT_Y - 6); // legs tucked behind the table
    } else if (stop.kind === 'lift' && !l.prop) {
      l.prop = scene.add.image(l.px, l.py, LIFE_PROPS.barbell).setOrigin(0.5, 1);
    } else if (stop.kind === 'treat' && !l.bed) {
      l.bed = scene.add.image(l.px, l.py, LIFE_PROPS.bed).setOrigin(0.5, 0.7);
    }
  }

  private clearPose(l: Live): void {
    l.sprite.setVisible(true);
    l.sprite.setCrop();
    l.sprite.setAngle(0);
    l.sprite.setOrigin(0.5, (CHAR_FOOT_Y + 1) / CHAR_H);
    l.prop?.destroy();
    l.prop = undefined;
    l.bed?.destroy();
    l.bed = undefined;
    l.emote?.setVisible(true);
  }

  /** Per-frame look: frame, bounce/limp/pose offsets and depth. */
  private place(l: Live): void {
    const s = l.sprite;
    const { mood } = l.agent;
    const stop = this.stop(l);
    const walking = l.mode === 'walk';
    const step = Math.floor(l.clock / (mood.limp ? FRAME_MS * 2 : FRAME_MS)) % 4;
    const d = this.depthAt(l);
    let yOff = 0;
    s.setAngle(0);

    if (walking) {
      s.setFrame(personFrameName(l.dir, step));
      if (mood.bounce && step % 2 === 1) yOff = -mood.bounce;
      if (mood.limp) {
        s.setAngle(step % 2 === 0 ? -5 : 4);
        yOff = step % 2 === 0 ? 1 : 0;
      }
    } else {
      s.setFrame(personFrameName(l.dir, null));
      const beat = Math.floor(l.clock / 450) % 2;
      switch (stop.kind) {
        case 'lift':
          yOff = beat ? 0 : 1;
          l.prop?.setPosition(l.px, l.py - 22 - (beat ? 5 : 0)).setDepth(d + 0.1);
          break;
        case 'sit':
          yOff = 3;
          break;
        case 'treat':
          // Lying on the table: tip the body over (about its middle) onto a bed.
          s.setOrigin(0.5, 0.5);
          s.setAngle(l.agent.injured ? -90 : 90);
          yOff = -(CHAR_FOOT_Y - CHAR_H / 2) - 4;
          l.bed?.setPosition(l.px, l.py - 2).setDepth(d - 0.1);
          break;
        case 'cheer':
          yOff = -Math.abs(Math.sin((l.clock + l.agent.phase * 900) / 190)) * 3;
          break;
        case 'drill':
        case 'meet':
          yOff = mood.bounce && beat ? -1 : 0;
          break;
        default:
          break;
      }
    }

    s.setPosition(l.px, l.py + yOff);
    s.setDepth(d);
    l.emote?.setPosition(l.px, l.py - CHAR_H + 6 + (walking ? 0 : Math.min(0, yOff))).setDepth(d + 0.2);
  }

  private depthAt(l: Live): number {
    const here = l.cell;
    const next = l.mode === 'walk' ? l.path[0] : undefined;
    // In transit, sort with whichever of the two cells is further forward so the
    // floor tile being stepped onto never draws over the feet.
    const fwd = next && next.x + next.y > here.x + here.y ? next : here;
    return depth(fwd.x, fwd.y, CHAR_LAYER);
  }
}

function stepDirOf(dx: number, dy: number): Dir {
  if (dx > 0) return 'e';
  if (dx < 0) return 'w';
  if (dy > 0) return 's';
  return 'n';
}
