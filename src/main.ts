import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GroundsScene } from './scenes/GroundsScene';
import { createNewGame, loadState } from './core/state';
import { enableAutosave, load, showTitleFlow } from './core/save';
import { advanceWeek } from './core/time';
import { createHud } from './ui/hud';
import { createNav } from './ui/nav';

// Phaser rendering conventions per ARCHITECTURE.md §7.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [BootScene, GroundsScene],
};

const uiRoot = document.getElementById('ui-root') as HTMLElement;

export const nav = createNav();

async function boot(): Promise<void> {
  const choice = await showTitleFlow(uiRoot);
  if (choice.mode === 'continue') {
    const saved = load();
    if (saved) loadState(saved);
    else createNewGame(choice.clubName ?? 'Cavehole Crushers');
  } else {
    createNewGame(choice.clubName ?? 'Cavehole Crushers');
  }
  enableAutosave();

  new Phaser.Game(config);
  createHud({ onAdvanceWeek: () => advanceWeek() });
}

void boot();
