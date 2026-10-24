import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GroundsScene } from './scenes/GroundsScene';
import { MatchScene } from './scenes/MatchScene';
import { bus } from './core/events';
import { createNewGame, getState, loadState, type GameState } from './core/state';
import { enableAutosave, load, showTitleFlow } from './core/save';
import { advanceWeek } from './core/time';
import { advanceUntil } from './core/advance';
import { createHud } from './ui/hud';
import { initMatchArtAhead, warmMatchArt } from './scenes/matchArtAhead';
import { createNav } from './ui/nav';
import { closeModal, closeScreen, ensureStyles } from './ui/dom';
import { initLeague, registerFixturesSystem } from './systems/fixtures';
import { registerTrainingSystem } from './systems/training';
import { registerEconomySystem, registerFinanceSystem } from './systems/economy';
import { registerFreeAgencySystem } from './systems/freeagency';
import { registerPlayerMatchSystem } from './systems/matchday';
import { registerAgingSystem } from './systems/aging';
import { registerMoraleSystem } from './systems/morale';
import { registerYouthSystem } from './systems/youth';
import { registerStatsSystem } from './systems/stats';
import { registerBoardSystem } from './systems/board';
import { registerEventsSystem } from './systems/events';
import { registerRivalsSystem } from './systems/rivals';
import { initBoardUi } from './ui/screens/board';
import { initMatchReport } from './ui/screens/matchReport';
import { openBuildScreen } from './ui/screens/build';
import { initPlacementBar } from './ui/placementBar';
import { syncKitDesign } from './ui/screens/kit';
import { openSquadScreen } from './ui/screens/squad';
import { openLineupScreen } from './ui/screens/lineup';
import { openRecruitScreen } from './ui/screens/recruit';
import { openFixturesScreen, openLadderScreen } from './ui/screens/fixtures';
import { initSeasonEndFeedback, openHistoryScreen } from './ui/screens/history';
import { initFinanceLedger, openFinanceScreen } from './ui/screens/finance';
import { openContractsScreen } from './ui/screens/contracts';
import { initNewsInbox, newsInbox, openInboxScreen, pendingDecisionCount } from './ui/inbox';
import { initAudio, initAudioUi } from './fx/audio';
import { initPwa } from './fx/pwa';
import { initLandscapeGuard, sleepLoopIfPortrait } from './ui/orientation';
import { startTutorial, STEPS as TUTORIAL_STEPS } from './ui/tutorial';
import { openGuideScreen } from './ui/guide/guide';
import { clearLiveMatch, readLiveMatch } from './systems/liveMatchRecord';
import { isLabHash } from './match/lab/controller';
import { bootLab } from './match/lab/boot';

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
  bus.on('ui:notify', ({ text, kind, quiet }) => {
    if (quiet) return; // already on screen (the season review, N14)
    const toast = document.createElement('div');
    toast.className = `nrl-toast nrl-toast-${kind}`;
    toast.textContent = text;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });
}

// Landscape only: on a phone held upright the rotate card covers the game and
// the Phaser loop sleeps (pausing match playback) until it's turned sideways.
let game: Phaser.Game | null = null;
let portraitBlocked = false;

async function boot(): Promise<void> {
  // BAK-207: `/#lab` opens the live match sim lab instead of the club game.
  if (isLabHash(location.hash)) {
    bootLab();
    return;
  }
  initLandscapeGuard({
    onBlock: () => {
      portraitBlocked = true;
      game?.loop.sleep();
    },
    onUnblock: () => {
      portraitBlocked = false;
      game?.loop.wake();
      // Turned back to landscape, the scale manager can refresh from the old
      // bounds while the rotation is still settling and then read the new bounds
      // as "no change", leaving the canvas at the portrait size with every tap
      // landing beside the camera (found by the playthrough's portrait step).
      // Refresh once the next frame has laid out.
      requestAnimationFrame(() => game?.scale.refresh());
    },
  });
  initToasts();
  initSeasonEndFeedback();
  initFinanceLedger();
  initNewsInbox();
  warmMatchArt(); // the match ground painted in the art worker while the title is up (N10.5)
  const choice = await showTitleFlow(uiRoot);
  if (choice.mode === 'continue') {
    const saved = load();
    if (saved) loadState(saved);
    else {
      // Continue on an empty slot still starts fresh: drop a match record left behind.
      clearLiveMatch();
      createNewGame(choice.clubName ?? 'Cavehole Crushers', undefined, { difficulty: choice.difficulty });
    }
  } else {
    // New Game must not resume a match that belonged to the save this slot had.
    clearLiveMatch();
    createNewGame(choice.clubName ?? 'Cavehole Crushers', undefined, { difficulty: choice.difficulty });
  }
  if (getState().league.clubs.length === 0) initLeague(getState(), choice.colors);
  // The player's kit design (#79) feeds every kit drawn from here on.
  syncKitDesign(getState());
  bus.on('state:changed', (s) => syncKitDesign(s));
  enableAutosave();

  // Week-tick pipeline (ARCHITECTURE §5): training/injuries → economy →
  // matches (player + rivals) → ladder → free agents → autosave.
  registerTrainingSystem();
  registerEconomySystem();
  registerFinanceSystem(); // the club's books by season (#172)
  registerFixturesSystem();
  registerPlayerMatchSystem();
  registerFreeAgencySystem();
  registerMoraleSystem();
  registerAgingSystem();
  registerYouthSystem();
  registerStatsSystem();
  registerBoardSystem();
  registerEventsSystem();
  registerRivalsSystem();
  initMatchReport();
  initBoardUi();
  // The next fixture's match art, painted in a Worker during the week and uploaded in idle slices (N10.5).
  initMatchArtAhead({ textures: () => game?.textures ?? null, busy: () => game?.scene.isActive('Match') ?? false });

  const g = new Phaser.Game(config);
  game = g;
  // `?e2e` exposes the game to the end-to-end playthrough (scripts/e2e-season.mjs),
  // which checks what the grounds actually draw and dumps the live state for the
  // save corpus (tests/fixtures/saves) before the first autosave. Nothing else reads these.
  if (new URLSearchParams(location.search).has('e2e')) {
    const w = window as unknown as { __nrlGame?: Phaser.Game; __nrlState?: () => GameState; __nrlTutorialText?: string[] };
    w.__nrlGame = g;
    w.__nrlState = () => getState();
    // Every tutorial step's copy, for scripts/e2e-webkit.mjs's fit check (#208).
    w.__nrlTutorialText = TUTORIAL_STEPS.map((st) => st.text);
  }
  // Opened upright, the rotate card is already up but the game did not exist
  // when it first asked for a pause. Sleep once the loop has actually started
  // (#315). A later turn to portrait still sleeps from onBlock, above.
  sleepLoopIfPortrait(g, () => portraitBlocked);
  createHud({ onAdvanceWeek: () => advanceWeek(), onAdvanceUntil: (t) => advanceUntil(t) });

  // Grounds → Match handoff: for the classic engine state/ladder are already
  // applied by the matchday tick hook before this fires and the Match scene is
  // pure playback; a live match (coach calls #73) holds the week and its result
  // comes back with 'match:finished'. The scene's own Back-to-Club button
  // returns to Grounds at full-time.
  bus.on('match:started', ({ fixture, home, away, live }) => {
    // Screens stay usable alongside the HUD (Advance Week is reachable with one
    // open), so clear any screen/dialog before the match takes over the view.
    closeScreen();
    closeModal();
    g.scene.stop('Grounds');
    g.scene.start('Match', { home, away, fixture, live });
  });

  initPlacementBar(); // build/move instructions + Cancel (#78)

  const nav = createNav();
  nav.registerScreen('squad', 'Squad', () => openSquadScreen());
  nav.registerScreen('lineup', 'Lineup', () => openLineupScreen()); // the coach's nine (#69)
  nav.registerScreen('recruit', 'Recruit', () => openRecruitScreen());
  nav.registerScreen('build', 'Build', () => openBuildScreen());
  nav.registerScreen('fixtures', 'Fixtures', () => openFixturesScreen());
  nav.registerScreen('ladder', 'Ladder', () => openLadderScreen());
  nav.registerScreen('history', 'History', () => openHistoryScreen());
  nav.registerScreen('finance', 'Finance', () => openFinanceScreen());
  nav.registerScreen('contracts', 'Contracts', () => openContractsScreen());
  nav.registerScreen('news', 'News', () => openInboxScreen());
  // News badge: unread messages plus event cards waiting for a choice (#75).
  const refreshNewsBadge = (): void => nav.setBadge('news', newsInbox.unreadCount + pendingDecisionCount(getState()));
  newsInbox.onChange(refreshNewsBadge);
  bus.on('state:changed', refreshNewsBadge);
  refreshNewsBadge();
  nav.registerScreen('help', '?', () => openGuideScreen()); // the Guide (#188); Replay tutorial is in its footer

  initAudio();
  initAudioUi();
  initPwa();
  startTutorial(); // self-guards on settings.tutorialDone

  // A live match in progress when the app was closed (#73): the save is from the
  // week before it, so advancing again rebuilds the same match, which picks up
  // the record and plays on from where it was, calls and all.
  const pending = readLiveMatch();
  if (pending && pending.season === getState().season && pending.week === getState().week) {
    const resume = (): void => void setTimeout(() => advanceWeek(), 0);
    if (g.isBooted) resume();
    else g.events.once(Phaser.Core.Events.READY, resume);
  } else if (pending) clearLiveMatch();
}

void boot();
