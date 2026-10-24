// src/match/lab/scene.ts — the lab's Phaser scene: the match stadium (reused
// from MatchScene) with the live sim drawn on its sprites instead of the
// event-log playback, plus the readability layer (BAK-208 §6): pop-ups over
// players, a slow-motion beat and a close-up on big moments, and the stadium
// FX / crowd reactions driven through the same MatchEvents a real match emits.
import Phaser from 'phaser';
import { MatchScene } from '../../scenes/MatchScene';
import { bus } from '../../core/events';
import type { TeamSheet, WeatherKind } from '../../sim/events';
import { ZOOM_DEFAULT } from '../../world/readability';
import type { Side, SimEvent } from '../core/snapshot';
import { toMatchEvent } from '../league/events';
import { LiveView } from '../view/liveView';
import { PopupLayer } from '../view/popupLayer';
import { ContestLayer } from '../view/contestLayer';
import { SLOWMO_FACTOR, SLOWMO_MS, popupFor, type PopupView } from '../view/popups';
import { WrestleBar } from '../view/wrestleBar';
import { SprintLayer } from '../view/sprintLayer';
import { LegsLayer } from '../view/legsLayer';
import { FATIGUE } from '../league/fatigue';
import type { LabController } from './controller';

export interface LabSceneData {
  home: TeamSheet;
  away: TeamSheet;
  controller: LabController;
  /** Rain or wind on the stadium (2f), as the sim plays it. */
  weather?: WeatherKind;
}

/** Pop-ups sit above the name tag (73k) and below the weather (80k). */
const DEPTH_POPUP = 74_000;
/** A big moment's close-up lasts this long before easing back out. */
const CLOSEUP_MS = 1500;

export class LabScene extends MatchScene {
  private controller!: LabController;
  private view: LiveView | null = null;
  private popups: PopupLayer | null = null;
  private contest: ContestLayer | null = null;
  private wrestleBar: WrestleBar | null = null;
  private sprintLayer: SprintLayer | null = null;
  private legsLayer: LegsLayer | null = null;
  private ids!: Record<Side, string>;
  private closeupUntil = 0;

  constructor() {
    super('Lab');
  }

  override init(data: LabSceneData): void {
    super.init({ home: data.home, away: data.away, ...(data.weather ? { weather: data.weather } : {}) });
    this.controller = data.controller;
    this.ids = { home: data.home.clubId, away: data.away.clubId };
  }

  override create(): void {
    super.create();
    // No club to go back to from the lab.
    this.backBtn?.remove();
    this.backBtn = null;
    this.view = new LiveView(this);
    this.popups = new PopupLayer(this, DEPTH_POPUP);
    this.contest = new ContestLayer(this, DEPTH_POPUP - 3);
    this.wrestleBar = new WrestleBar(this, DEPTH_POPUP);
    this.sprintLayer = new SprintLayer(this, DEPTH_POPUP - 1);
    this.legsLayer = new LegsLayer(this, DEPTH_POPUP - 2, FATIGUE);
    const r = this.controller.runner;
    r.onEvents = (events) => this.onSimEvents(events);
    this.view.draw(r.prev, r.cur, 0, 1);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      r.onEvents = null;
      this.popups?.destroy();
      this.popups = null;
      this.contest?.destroy();
      this.contest = null;
      this.wrestleBar?.destroy();
      this.wrestleBar = null;
      this.sprintLayer?.destroy();
      this.sprintLayer = null;
      this.legsLayer?.destroy();
      this.legsLayer = null;
    });
  }

  private onSimEvents(events: readonly SimEvent[]): void {
    const r = this.controller.runner;
    for (const e of events) {
      this.contest?.note(e, r.cur);
      const p = popupFor(e);
      if (p && e.side !== undefined && e.slot !== undefined) {
        this.popups?.show(p, e.side, e.slot);
        if (p.big) {
          r.slowMo(SLOWMO_MS, SLOWMO_FACTOR);
          this.closeupUntil = this.time.now + CLOSEUP_MS;
        }
      }
      // Light up the stadium the way a real match does: particles, crowd,
      // camera. The subscribers pick what they react to by event kind.
      const ev = toMatchEvent(e, r.cur, this.ids);
      if (ev) bus.emit('match:event', ev);
    }
  }

  override update(time: number, delta: number): void {
    const r = this.controller.runner;
    r.update(delta);
    this.view?.draw(r.prev, r.cur, r.alpha, r.playing ? r.speed : 0.001);
    // The close-up MatchScene picked for a big moment eases back out after a beat.
    if (this.closeupUntil && time > this.closeupUntil) {
      this.closeupUntil = 0;
      this.beatZoom = ZOOM_DEFAULT;
      this.zoomTarget = this.viewZoom(ZOOM_DEFAULT);
    }
    super.update(time, delta); // camera follows the ball the view just placed
    const feet = (side: Side, slot: number): { x: number; y: number } | null => {
      const a = this.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y } : null;
    };
    const cam = this.cameras.main;
    const v = cam.worldView;
    const view: PopupView = { left: v.x, top: v.y, width: v.width, height: v.height };
    this.popups?.update(delta, cam.zoom, feet, view);
    this.contest?.update(delta, cam.zoom, (fx, fy) => this.fieldToWorld(fx, fy), feet);
    // The wrestle bar: the fight left in the carrier while he is in a tackle (§8.1).
    this.wrestleBar?.update(r.cur.wrestle, this.cameras.main.zoom, (w) => feet(w.side, w.slot));
    // Legs (§8): a bar under everyone, green → amber once tired → red once spent.
    this.legsLayer?.update(r.cur, this.cameras.main.zoom, feet);
    // Sprint and gas (§8.2): streaks behind anyone flat out, gas bars on the carrier and his chasers.
    this.sprintLayer?.update(r.cur, this.cameras.main.zoom, (side, slot) => {
      const a = this.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y, faceLeft: a.sprite.flipX } : null;
    });
  }
}
