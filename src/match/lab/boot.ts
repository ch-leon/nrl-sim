// src/match/lab/boot.ts — `/#lab`: boot straight into the match lab (BAK-207
// §4), bypassing the title flow and the club game. The URL hash carries the
// teams, seed and (from a Flag code) the tick, so a lab link reproduces a
// moment exactly.
import Phaser from 'phaser';
import { bus } from '../../core/events';
import { initLandscapeGuard } from '../../ui/orientation';
import { ensureStyles } from '../../ui/dom';
import { LiveSim } from '../league/live';
import { LabController, labHash, parseLabHash, type LabParams } from './controller';
import { LabPanel } from './panel';
import { LabScene, type LabSceneData } from './scene';
import { DEFAULT_AWAY, DEFAULT_HOME, LAB_CLUBS, labSheet } from './sheets';
import { DEFAULT_TACTICS, tacticsLabel } from '../league/presets';
import { LEGS_ENERGY } from '../league/fatigue';

const SCENE_KEY = 'Lab';

export function bootLab(): void {
  ensureStyles();
  let game: Phaser.Game | null = null;
  let blocked = false;
  initLandscapeGuard({
    onBlock: () => {
      blocked = true;
      game?.loop.sleep();
    },
    onUnblock: () => {
      blocked = false;
      game?.loop.wake();
    },
  });

  const toasts = document.createElement('div');
  toasts.className = 'nrl-toast-stack';
  toasts.setAttribute('aria-live', 'polite');
  document.getElementById('ui-root')?.appendChild(toasts);
  const notify = (text: string): void => {
    const t = document.createElement('div');
    t.className = 'nrl-toast nrl-toast-info';
    t.textContent = text;
    toasts.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  };
  bus.on('ui:notify', ({ text }) => notify(text));

  let panel: LabPanel | null = null;
  const start = (params: LabParams): void => {
    const home = labSheet(params.home, params.traits, params.tactics.home);
    const away = labSheet(params.away, params.traits, params.tactics.away);
    const ctrl = new LabController(
      (h, a, seed, traits, tactics, legs, bench, weather, calls) =>
        new LiveSim({ ...labSheet(h, traits, tactics.home), rotation: bench }, { ...labSheet(a, traits, tactics.away), rotation: bench }, seed, { energy: LEGS_ENERGY[legs], weather, calls, ...(params.ai ? { aiCoach: ['home', 'away'] as ('home' | 'away')[] } : {}) }),
      params,
    );
    const data: LabSceneData = { home, away, controller: ctrl, weather: params.weather ?? 'clear' };
    panel?.destroy();
    const styles = `${home.name}: ${tacticsLabel(home.tactics ?? DEFAULT_TACTICS)} · ${away.name}: ${tacticsLabel(away.tactics ?? DEFAULT_TACTICS)}`;
    panel = new LabPanel(ctrl, LAB_CLUBS, { restart: start, notify }, styles);
    history.replaceState(null, '', labHash({ seed: params.seed, home: params.home, away: params.away, tick: params.tick, traits: params.traits, tactics: params.tactics, legs: params.legs, bench: params.bench, weather: params.weather, calls: params.calls, ai: params.ai }));
    if (!game) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-root',
        backgroundColor: '#1a1a2e',
        pixelArt: true,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: [],
      });
      game.events.once(Phaser.Core.Events.READY, () => {
        if (blocked) game?.loop.sleep();
      });
      game.events.on(Phaser.Core.Events.POST_STEP, () => panel?.sync());
      game.scene.add(SCENE_KEY, LabScene, true, data);
    } else {
      game.scene.stop(SCENE_KEY);
      game.scene.start(SCENE_KEY, data);
    }
    // Dev hook for lab automation and Flag debugging (the lab is a dev page).
    (window as unknown as { __lab?: unknown }).__lab = { game, ctrl };
  };

  start(parseLabHash(location.hash, { home: DEFAULT_HOME, away: DEFAULT_AWAY }));
}
