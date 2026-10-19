// src/match/lab/scene.ts — the lab's Phaser scene: the match stadium (reused
// from MatchScene) with the live sim drawn on its sprites instead of the
// event-log playback, plus the readability layer (BAK-208 §6): pop-ups over
// players, a slow-motion beat and a close-up on big moments, and the stadium
// FX / crowd reactions driven through the same MatchEvents a real match emits.
import Phaser from 'phaser';
import { MatchScene } from '../../scenes/MatchScene';
import { bus } from '../../core/events';
import type { TeamSheet } from '../../sim/events';
import { ZOOM_DEFAULT } from '../../world/readability';
import type { Side, SimEvent } from '../core/snapshot';
import { toMatchEvent } from '../league/events';
import { LiveView } from '../view/liveView';
import { PopupLayer } from '../view/popupLayer';
import { SLOWMO_FACTOR, SLOWMO_MS, popupFor } from '../view/popups';
import { WrestleBar } from '../view/wrestleBar';
import type { LabController } from './controller';

export interface LabSceneData {
  home: TeamSheet;
  away: TeamSheet;
  controller: LabController;
}

/** Pop-ups sit above the name tag (73k) and below the weather (80k). */
const DEPTH_POPUP = 74_000;
/** A big moment's close-up lasts this long before easing back out. */
const CLOSEUP_MS = 1500;

export class LabScene extends MatchScene {
  private controller!: LabController;
  private view: LiveView | null = null;
  private popups: PopupLayer | null = null;
  private wrestleBar: WrestleBar | null = null;
  private ids!: Record<Side, string>;
  private closeupUntil = 0;

  constructor() {
    super('Lab');
  }

  override init(data: LabSceneData): void {
    super.init({ home: data.home, away: data.away });
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
    this.wrestleBar = new WrestleBar(this, DEPTH_POPUP);
    const r = this.controller.runner;
    r.onEvents = (events) => this.onSimEvents(events);
    this.view.draw(r.prev, r.cur, 0, 1);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      r.onEvents = null;
      this.popups?.destroy();
      this.popups = null;
      this.wrestleBar?.destroy();
      this.wrestleBar = null;
    });
  }

  private onSimEvents(events: readonly SimEvent[]): void {
    const r = this.controller.runner;
    for (const e of events) {
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
    this.popups?.update(delta, this.cameras.main.zoom, feet);
    // The wrestle bar: the fight left in the carrier while he is in a tackle (§8.1).
    this.wrestleBar?.update(r.cur.wrestle, this.cameras.main.zoom, (w) => feet(w.side, w.slot));
  }
}
