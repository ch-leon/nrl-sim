import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GroundsScene } from './scenes/GroundsScene';
import { MatchScene } from './scenes/MatchScene';
import { bus } from './core/events';
import { createNewGame, getState, loadState } from './core/state';
import { enableAutosave, load, showTitleFlow } from './core/save';
import { advanceWeek } from './core/time';
import { createHud } from './ui/hud';
import { createNav } from './ui/nav';
import { initLeague, registerFixturesSystem } from './systems/fixtures';
import { registerTrainingSystem } from './systems/training';
import { registerEconomySystem } from './systems/economy';
import { registerFreeAgencySystem } from './systems/freeagency';
import { registerPlayerMatchSystem } from './systems/matchday';
import { openBuildScreen } from './ui/screens/build';
import { openSquadScreen } from './ui/screens/squad';
import { openRecruitScreen } from './ui/screens/recruit';
import { openFixturesScreen, openLadderScreen } from './ui/screens/fixtures';

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
  scene: [BootScene, GroundsScene, MatchScene],
};

const uiRoot = document.getElementById('ui-root') as HTMLElement;

// Minimal toast renderer for 'ui:notify' — the §5 event every system emits;
// no ticket owns a renderer, so the orchestrator provides one.
function initToasts(): void {
  const stack = document.createElement('div');
  stack.style.cssText =
    'position:absolute;top:56px;left:50%;transform:translateX(-50%);display:flex;' +
    'flex-direction:column;gap:6px;align-items:center;pointer-events:none;z-index:50;';
  uiRoot.appendChild(stack);
  const colors = { info: '#3a6ea5', success: '#2e7d32', danger: '#b03a2e' } as const;
  bus.on('ui:notify', ({ text, kind }) => {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText =
      `background:${colors[kind]};color:#fff;border:3px solid #000;padding:6px 14px;` +
      'font-family:"Courier New",monospace;font-size:14px;box-shadow:3px 3px 0 #000;';
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });
}

async function boot(): Promise<void> {
  initToasts();
  const choice = await showTitleFlow(uiRoot);
  if (choice.mode === 'continue') {
    const saved = load();
    if (saved) loadState(saved);
    else createNewGame(choice.clubName ?? 'Cavehole Crushers');
  } else {
    createNewGame(choice.clubName ?? 'Cavehole Crushers');
  }
  if (getState().league.clubs.length === 0) initLeague(getState());
  enableAutosave();

  // Week-tick pipeline (ARCHITECTURE §5): training/injuries → economy →
  // matches (player + rivals) → ladder → free agents → autosave.
  registerTrainingSystem();
  registerEconomySystem();
  registerFixturesSystem();
  registerPlayerMatchSystem();
  registerFreeAgencySystem();

  new Phaser.Game(config);
  createHud({ onAdvanceWeek: () => advanceWeek() });

  const nav = createNav();
  nav.registerScreen('squad', 'Squad', () => openSquadScreen());
  nav.registerScreen('recruit', 'Recruit', () => openRecruitScreen());
  nav.registerScreen('build', 'Build', () => openBuildScreen());
  nav.registerScreen('fixtures', 'Fixtures', () => openFixturesScreen());
  nav.registerScreen('ladder', 'Ladder', () => openLadderScreen());
}

void boot();
