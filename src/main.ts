import Phaser from 'phaser';
import './ui/fonts';
import { BootScene } from './scenes/BootScene';
import { GroundsScene } from './scenes/GroundsScene';
import { MatchScene } from './scenes/MatchScene';
import { bus, type Events } from './core/events';
import { createNewGame, getState, loadState, type GameState } from './core/state';
import { enableAutosave, getActiveSlot, getSlotSummaries, load, save } from './core/save';
import { showTitleFlow } from './ui/title';
import { advanceWeek } from './core/time';
import { advanceUntil } from './core/advance';
import { advanceFromClub, createHud } from './ui/hud';
import { initWeekSummary } from './ui/weekSummary';
import { initMatchArtAhead, warmMatchArt } from './scenes/matchArtAhead';
import { createNav } from './ui/nav';
import { closeModal, closeScreen } from './ui/dom';
import { initToasts } from './ui/toasts';
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
import { plantPending, registerEventsSystem } from './systems/events';
import { registerRivalsSystem } from './systems/rivals';
import { contractsEndingSoon, endingSoonLabel } from './systems/contracts';
import { initBoardUi, openStaffScreen, STAFF_SCREEN_TITLE } from './ui/screens/board';
import { BOARD, FEATURES } from './config';
import { fmtMoney } from './ui/hud';
import { initMatchReport } from './ui/screens/matchReport';
import { setMatchSettingsOpener } from './ui/screens/matchOverlay';
import { openBuildScreen } from './ui/screens/build';
import { initPlacementBar } from './ui/placementBar';
import { openKitDesigner, syncKitDesign } from './ui/screens/kit';
import { openSquadScreen } from './ui/screens/squad';
import { openLineupScreen } from './ui/screens/lineup';
import { openRecruitScreen } from './ui/screens/recruit';
import { openFixturesScreen } from './ui/screens/fixtures';
import { initSeasonEndFeedback, openHistoryScreen } from './ui/screens/history';
import { financeSummary, initFinanceLedger, openFinanceScreen } from './ui/screens/finance';
import { openContractsScreen } from './ui/screens/contracts';
import { initNewsInbox, newsInbox, openInboxScreen } from './ui/inbox';
import { advanceUntilAsked, askBeforeAdvance, decisionChipItems, openDecisions, pendingDecisionCount } from './ui/decisions';
import { initAudio, initAudioUi, soundStatus } from './fx/audio';
import { initPwa } from './fx/pwa';
import { initLandscapeGuard, sleepLoopIfPortrait } from './ui/orientation';
import { initFirstVisitHints, setTutorialScreens, startTutorial, whenTutorialDone, STEPS as TUTORIAL_STEPS } from './ui/tutorial';
import { commitUndo, initUndo } from './systems/undo';
import { openGuideScreen } from './ui/guide/guide';
import { clearLiveMatch, readLiveMatch } from './systems/liveMatchRecord';
import { isLabHash } from './match/lab/controller';
import { bootLab } from './match/lab/boot';
import { commercialEnabled } from './commercial/flags';
import { initCommercial, recordFirstRun } from './commercial/demo';
import { openPaywall } from './ui/screens/paywall';

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
  initToasts(uiRoot);
  initUndo(); // a match starting ends the 5-second Undo (#370)
  initSeasonEndFeedback();
  initFinanceLedger();
  initNewsInbox();
  warmMatchArt(); // the match ground painted in the art worker while the title is up (N10.5)
  // #362: the careers already here before the first commercial run keep the full game.
  if (commercialEnabled()) recordFirstRun(getSlotSummaries());
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
  // The demo gate's slot (#362), and the paywall at the demo's end (#364).
  if (commercialEnabled()) initCommercial(getActiveSlot(), () => void openPaywall({ reason: 'demo' }));
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
  initMatchReport({ onReason: (screen) => nav.open(screen) }); // "Why did I lose?" (#368)
  initBoardUi();
  // The next fixture's match art, painted in a Worker during the week and uploaded in idle slices (N10.5).
  initMatchArtAhead({ textures: () => game?.textures ?? null, busy: () => game?.scene.isActive('Match') ?? false });

  const g = new Phaser.Game(config);
  game = g;
  // `?e2e` exposes the game to the end-to-end playthrough (scripts/e2e-season.mjs),
  // which checks what the grounds actually draw and dumps the live state for the
  // save corpus (tests/fixtures/saves) before the first autosave. Nothing else reads these.
  if (new URLSearchParams(location.search).has('e2e')) {
    const w = window as unknown as {
      __nrlGame?: Phaser.Game; __nrlState?: () => GameState; __nrlTutorialText?: string[];
      __nrlShowCard?: (cardId: string) => boolean; __nrlNotify?: (n: Events['ui:notify']) => void;
    };
    w.__nrlGame = g;
    w.__nrlState = () => getState();
    w.__nrlShowCard = plantPending;
    // scripts/e2e-webkit.mjs fires a burst of toasts at the lane (#339).
    w.__nrlNotify = (n) => bus.emit('ui:notify', n);
    // Every tutorial step's copy, for scripts/e2e-webkit.mjs's fit check (#208).
    w.__nrlTutorialText = TUTORIAL_STEPS.map((st) => st.text);
  }
  // Opened upright, the rotate card is already up but the game did not exist
  // when it first asked for a pause. Sleep once the loop has actually started
  // (#315). A later turn to portrait still sleeps from onBlock, above.
  sleepLoopIfPortrait(g, () => portraitBlocked);
  // #338: neither advance takes a pending card's default unasked.
  // #370: each first keeps whatever an open Undo would take back, so the decisions confirm is unchanged.
  const advanceOneWeek = (): void => {
    commitUndo();
    askBeforeAdvance(1, () => advanceWeek());
  };
  const runwayWeeks = (s: GameState): number | null => financeSummary(s).runwayWeeks;
  createHud({
    onAdvanceWeek: advanceOneWeek,
    onAdvanceUntil: (t) => {
      commitUndo();
      advanceUntilAsked(t, advanceUntil);
    },
    onNextMatch: () => nav.open('fixtures'),
    onMoney: () => nav.open('finance'),
    onBoard: () => nav.open('staff'), // the objective at risk (#368)
    onDecisions: () => void openDecisions(),
    decisions: decisionChipItems,
    runwayWeeks,
  });
  // #368: the weekly summary, from the club as it stands now; its Play Week is the dock's.
  initWeekSummary({ onAdvance: () => advanceFromClub(advanceOneWeek), runwayWeeks });

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

  // The dock (Broadcast Quiet): CLUB · SQUAD · LEAGUE · BUILD · OFFICE. Lineup
  // and Recruit are Squad's segments, the ladder is in League; the rest of the
  // club is Office's tiles, each with a status line.
  initAudio();
  const openSettings = initAudioUi();
  setMatchSettingsOpener(openSettings); // the pause sheet's Settings
  const nav = createNav();
  nav.registerScreen('squad', 'Squad', () => openSquadScreen(), { holds: ['lineup', 'recruit'] });
  nav.registerScreen('fixtures', 'League', () => openFixturesScreen(), { holds: ['ladder'] });
  nav.registerScreen('build', 'Build', () => openBuildScreen());
  nav.registerScreen('lineup', 'Lineup', () => openLineupScreen(), { hidden: true }); // the coach's nine (#69)
  nav.registerScreen('recruit', 'Recruit', () => openRecruitScreen(), { hidden: true });
  nav.registerScreen('finance', 'Finance', () => openFinanceScreen(), {
    more: true,
    holds: ['contracts'],
    status: () => {
      const net = Math.round(financeSummary(getState()).netWeekly);
      return { text: `${net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(net))} / week`, attn: net < 0 };
    },
  });
  nav.registerScreen('contracts', 'Contracts', () => openContractsScreen(), { hidden: true }); // from Finance's VIEW ▸
  nav.registerScreen('staff', STAFF_SCREEN_TITLE, () => openStaffScreen(), {
    more: true,
    status: () => {
      const p = getState().boardPatience;
      return { text: `Board patience ${p}/${BOARD.MAX_PATIENCE}`, attn: p <= 2 };
    },
  });
  nav.registerScreen('news', 'News', () => openInboxScreen(), {
    more: true,
    status: () => {
      const n = newsInbox.unreadCount + pendingDecisionCount(getState());
      return n > 0 ? { text: `${n} unread`, attn: true } : { text: 'All read' };
    },
  });
  nav.registerScreen('history', 'History', () => openHistoryScreen(), {
    more: true,
    status: () => {
      const n = getState().history.length;
      return { text: n === 0 ? 'No seasons yet' : `${n} past season${n === 1 ? '' : 's'}` };
    },
  });
  // Kit designer (#79), behind the cosmetic-kits flag.
  if (FEATURES.cosmeticKits) nav.registerScreen('kit', 'Kit & colours', () => openKitDesigner(), { more: true, status: () => ({ text: 'Home / away' }) });
  // The Guide (#188); Replay tutorial is in its footer.
  nav.registerScreen('help', 'Guide', () => openGuideScreen(), { more: true, status: () => ({ text: 'How to play' }) });
  nav.registerScreen('settings', 'Settings', openSettings, { more: true, status: () => ({ text: soundStatus(getState().settings) }) });
  // Save & quit: write the slot and go back to the title's slots (#34's reload).
  nav.registerScreen('quit', 'Save & quit', () => {
    save(getState());
    location.reload();
  }, { more: true, status: () => ({ text: `Slot ${getActiveSlot()}` }) });
  // News badge: unread messages plus event cards waiting for a choice (#75).
  const refreshNewsBadge = (): void => nav.setBadge('news', newsInbox.unreadCount + pendingDecisionCount(getState()));
  newsInbox.onChange(refreshNewsBadge);
  bus.on('state:changed', refreshNewsBadge);
  refreshNewsBadge();
  // Squad's red dot (#369): a contract ends within 4 weeks. Looking doesn't clear it; renewing, selling or releasing does.
  const refreshSquadDot = (): void => {
    const n = contractsEndingSoon(getState()).length;
    nav.setDot('squad', n > 0, endingSoonLabel(n));
  };
  bus.on('state:changed', refreshSquadDot);
  refreshSquadDot();

  setTutorialScreens((id) => nav.open(id)); // each step opens its own screen (#337)
  startTutorial(); // self-guards on settings.tutorialDone
  initFirstVisitHints(); // a line atop Lineup, News, Finance and Contracts the first time each opens (#370)
  initPwa({ holdIosHint: whenTutorialDone }); // the install hint waits for the tutorial (#337 U4)

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
