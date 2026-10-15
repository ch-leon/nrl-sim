import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GroundsScene } from './scenes/GroundsScene';
import { MatchScene } from './scenes/MatchScene';
import { bus } from './core/events';
import { createNewGame, getState, loadState } from './core/state';
import { enableAutosave, load, showTitleFlow } from './core/save';
import { advanceWeek } from './core/time';
import { advanceUntil } from './core/advance';
import { createHud } from './ui/hud';
import { createNav } from './ui/nav';
import { closeModal, closeScreen, ensureStyles } from './ui/dom';
import { initLeague, registerFixturesSystem } from './systems/fixtures';
import { registerTrainingSystem } from './systems/training';
import { registerEconomySystem } from './systems/economy';
import { registerFreeAgencySystem } from './systems/freeagency';
import { registerPlayerMatchSystem } from './systems/matchday';
import { registerAgingSystem } from './systems/aging';
import { registerMoraleSystem } from './systems/morale';
import { registerYouthSystem } from './systems/youth';
import { registerStatsSystem } from './systems/stats';
import { registerBoardSystem } from './systems/board';
import { initBoardUi } from './ui/screens/board';
import { initPlayerOfMatch } from './ui/screens/potm';
import { openBuildScreen } from './ui/screens/build';
import { openSquadScreen } from './ui/screens/squad';
import { openRecruitScreen } from './ui/screens/recruit';
import { openFixturesScreen, openLadderScreen } from './ui/screens/fixtures';
import { initSeasonEndFeedback, openHistoryScreen } from './ui/screens/history';
import { initFinanceLedger, openFinanceScreen } from './ui/screens/finance';
import { initNewsInbox, newsInbox, openInboxScreen } from './ui/inbox';
import { initAudio, initAudioUi } from './fx/audio';
import { initPwa } from './fx/pwa';
import { startTutorial } from './ui/tutorial';

// Phaser rendering conventions per ARCHITECTURE.md §7.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // #18: the canvas fills the viewport (no letterboxing); scenes re-clamp
    // their cameras on the 'resize' event.
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, GroundsScene, MatchScene],
};

const uiRoot = document.getElementById('ui-root') as HTMLElement;

// Minimal toast renderer for 'ui:notify' — the §5 event every system emits;
// no ticket owns a renderer, so the orchestrator provides one. Placement lives
// in the shared stylesheet (.nrl-toast-stack: just below the HUD, above open
// screens); the match overlay re-anchors it clear of the scoreboard/stats.
function initToasts(): void {
  ensureStyles();
  const stack = document.createElement('div');
  stack.className = 'nrl-toast-stack';
  // #45: announce toasts to screen readers without stealing focus.
  stack.setAttribute('aria-live', 'polite');
  uiRoot.appendChild(stack);
  bus.on('ui:notify', ({ text, kind }) => {
    const toast = document.createElement('div');
    toast.className = `nrl-toast nrl-toast-${kind}`;
    toast.textContent = text;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });
}

async function boot(): Promise<void> {
  initToasts();
  initSeasonEndFeedback();
  initFinanceLedger();
  initNewsInbox();
  const choice = await showTitleFlow(uiRoot);
  if (choice.mode === 'continue') {
    const saved = load();
    if (saved) loadState(saved);
    else createNewGame(choice.clubName ?? 'Cavehole Crushers', undefined, { difficulty: choice.difficulty });
  } else {
    createNewGame(choice.clubName ?? 'Cavehole Crushers', undefined, { difficulty: choice.difficulty });
  }
  if (getState().league.clubs.length === 0) initLeague(getState(), choice.colors);
  enableAutosave();

  // Week-tick pipeline (ARCHITECTURE §5): training/injuries → economy →
  // matches (player + rivals) → ladder → free agents → autosave.
  registerTrainingSystem();
  registerEconomySystem();
  registerFixturesSystem();
  registerPlayerMatchSystem();
  registerFreeAgencySystem();
  registerMoraleSystem();
  registerAgingSystem();
  registerYouthSystem();
  registerStatsSystem();
  registerBoardSystem();
  initPlayerOfMatch();
  initBoardUi();

  const game = new Phaser.Game(config);
  createHud({ onAdvanceWeek: () => advanceWeek(), onAdvanceUntil: (t) => advanceUntil(t) });

  // Grounds → Match handoff: state/ladder are already applied by the matchday
  // tick hook before this fires; the Match scene is pure playback. The scene's
  // own Back-to-Club button returns to Grounds at full-time.
  bus.on('match:started', ({ fixture, sim, home, away }) => {
    // Screens stay usable alongside the HUD (Advance Week is reachable with one
    // open), so clear any screen/dialog before the match takes over the view.
    closeScreen();
    closeModal();
    game.scene.stop('Grounds');
    game.scene.start('Match', { home, away, result: sim, fixture });
  });

  const nav = createNav();
  nav.registerScreen('squad', 'Squad', () => openSquadScreen());
  nav.registerScreen('recruit', 'Recruit', () => openRecruitScreen());
  nav.registerScreen('build', 'Build', () => openBuildScreen());
  nav.registerScreen('fixtures', 'Fixtures', () => openFixturesScreen());
  nav.registerScreen('ladder', 'Ladder', () => openLadderScreen());
  nav.registerScreen('history', 'History', () => openHistoryScreen());
  nav.registerScreen('finance', 'Finance', () => openFinanceScreen());
  nav.registerScreen('news', 'News', () => openInboxScreen());
  newsInbox.onChange((unread) => nav.setBadge('news', unread));
  nav.registerScreen('help', '?', () => startTutorial(true));

  initAudio();
  initAudioUi();
  initPwa();
  startTutorial(); // self-guards on settings.tutorialDone
}

void boot();
