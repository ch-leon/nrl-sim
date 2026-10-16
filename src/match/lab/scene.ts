// src/match/lab/scene.ts — the lab's Phaser scene: the match stadium (reused
// from MatchScene) with the live sim drawn on its sprites instead of the
// event-log playback. BAK-207 #84.
import { MatchScene } from '../../scenes/MatchScene';
import type { TeamSheet } from '../../sim/events';
import { LiveView } from '../view/liveView';
import type { LabController } from './controller';

export interface LabSceneData {
  home: TeamSheet;
  away: TeamSheet;
  controller: LabController;
}

export class LabScene extends MatchScene {
  private controller!: LabController;
  private view: LiveView | null = null;

  constructor() {
    super('Lab');
  }

  override init(data: LabSceneData): void {
    super.init({ home: data.home, away: data.away });
    this.controller = data.controller;
  }

  override create(): void {
    super.create();
    // No club to go back to from the lab.
    this.backBtn?.remove();
    this.backBtn = null;
    this.view = new LiveView(this);
    const r = this.controller.runner;
    this.view.draw(r.prev, r.cur, 0, 1);
  }

  override update(time: number, delta: number): void {
    const r = this.controller.runner;
    r.update(delta);
    this.view?.draw(r.prev, r.cur, r.alpha, r.playing ? r.speed : 0.001);
    super.update(time, delta); // camera follows the ball the view just placed
  }
}
