import { runExpansionIntro } from './e2e-webkit/screens/expansionIntro.mjs';
// scripts/e2e-webkit.mjs — Safari-shaped checks: long DOM panels (#206, #203) and
// a phone that opens already upright (#315).
// Builds the game, serves it with `vite preview`, and in Playwright's WebKit as an
// iPhone (touch, DPR 3, iOS user agent). Landscape at 956×330 (16 Pro Max with
// Safari's address bar and tab strip) and 844×390 checks:
//   - the page pins text-size-adjust to 100% (iOS Safari's landscape text boost off);
//   - at the authored text size, every tutorial step's copy fits its bubble unscrolled (#208);
//   - the first guided tap's bubble (#370) sits inside the viewport with Skip on
//     screen and tappable; Skip works;
//   - the same with every font in the bubble boosted 2.17× (what Safari's boost did
//     on Leon's phone, issue #206; WebKit on Linux never boosts by itself): the copy
//     scrolls inside the bubble and Skip / Next stay reachable;
//   - the Guide boosted the same way: the page scrolls, Replay and the dock's CLUB
//     (a sheet's way out) reachable, and Replay brings the tutorial back with Skip
//     and Next on screen;
//   - the player page (#203) above the dock: ◂ SQUAD, Renew / Sell / Release
//     tappable, the dock's tabs uncovered; ◂ SQUAD goes back to Squad.
// Then the landscape screens (#336, #344, #347): every nav screen and the main
// popups at 844×390 with an iPhone 14's safe areas simulated and at 667×375 (see
// runScreens). --screens-only runs just those.
// Then the dock at Normal, Large and Larger text (#344, see runDockTextSize) at those
// three sizes, 568×320, and 375×667 and 320×568 with a mouse (two rows there): nothing
// overlapping or off screen, no label clipped, 44px tabs and PLAY WEEK, the open tab
// marked by its fill and a bar that reads in greyscale, and each tab's spoken name with
// its alert.
// Screenshots and report.json go to e2e-output/webkit/<WxH>/.
// Then one portrait boot (390×844): the menus work upright (#350), so it opens on the
// Club home sheet with no rotate card and the loop already asleep, and turning to
// 844×390 must wake it with the canvas filling the screen. The same turn mid-match
// freezes the clock under the rotate card and resumes it; a match parked at the club
// is Club home upright (no card, the loop asleep, Resume match kept), and the live
// match Continue reopens upright stays paused under the card until the phone is sideways.
// With the match up, the coach tray is filled with the most it shows (#396: six
// calls in five rows), which must not scroll, and the commentary checked: the line (log = line) clear of the bottom row and the
// score bug at 360×640, 390×844, 667×375 and 844×390; the full log (log = full) clear
// of them and of the open tray, and scrolling, at 667×375 and 844×390; and the LOG
// switch keeps its fill under hover. The full tray is checked once more, alone, at 956×330.
// Both Bali choices must fit, retain 44px targets and accept taps at these same
// four sizes. Last, the ladder's form column after five rounds at every text size (#426,
// see runLadderForm). Then the Coach calls page, from Office and from the Coach's Office's
// Build tile (see runCoachCalls; --coach-calls-only runs just that). Exits 1 on any failure.
//
//   npm run e2e:webkit
//   npm run e2e:webkit -- --size 956x330           (or E2E_SIZES="956x330 844x390")
//   WEBKIT_PATH=/path/to/pw_run.sh npm run e2e:webkit
//   E2E_URL=http://localhost:5173/ npm run e2e:webkit   (against a server you started)
//   npm run e2e:webkit -- --group text              (one CI shard: match, text, screens, portrait;
//                                                    see GROUPS at the end of this file)
//
// WebKit comes from WEBKIT_PATH or playwright-core's browser registry
// (PLAYWRIGHT_BROWSERS_PATH); CI fetches it with `playwright-core install --with-deps webkit`.
import { runUnlocks } from './e2e-webkit/screens/unlocks.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, chromium } from 'playwright-core';
import { argv, SIZES, log, startServer, stopServer } from './e2e-webkit/common.mjs';
import { runSize } from './e2e-webkit/portrait/size.mjs';
import { runPortrait } from './e2e-webkit/portrait/portrait.mjs';
import { runPortraitMenus } from './e2e-webkit/portrait/portraitMenus.mjs';
import { runPauseSettings } from './e2e-webkit/match/pauseSettings.mjs';
import { runRecruit } from './e2e-webkit/screens/recruit.mjs';
import { SCREEN_RUNS, runScreens } from './e2e-webkit/screens/screens.mjs';
import { WALK_RUNS, runTutorialWalk } from './e2e-webkit/match/tutorialWalk.mjs';
import { runDockTextSize } from './e2e-webkit/portrait/dockTextSize.mjs';
import { runPlaytest } from './e2e-webkit/match/playtest.mjs';
import { runCoachSays } from './e2e-webkit/screens/coachSays.mjs';
import { runCoachVoice } from './e2e-webkit/screens/coachVoice.mjs';
import { runOfficeUnlocks } from './e2e-webkit/screens/officeUnlocks.mjs';
import { runCoachName } from './e2e-webkit/screens/coachName.mjs';
import { runDifficulty } from './e2e-webkit/screens/difficulty.mjs';
import { runTownSetup } from './e2e-webkit/screens/townSetup.mjs';
import { FLOW_RUNS, runFlow } from './e2e-webkit/screens/flow.mjs';
import { runLargeTextTargets } from './e2e-webkit/text/largeTextTargets.mjs';
import { runLadderForm } from './e2e-webkit/text/ladderForm.mjs';
import { runLabsControls } from './e2e-webkit/match/labsControls.mjs';
import { runCoachCalls } from './e2e-webkit/match/coachCalls.mjs';

// ── Sections and CI shards ──────────────────────────────────────────────────────
// Every run* phase above, in the order a full run takes them. A full run (no flag)
// plays them all; --group <name> plays one CI shard's list (ci.yml, job webkit-shard),
// in this same order. Each section opens its own contexts and writes its own folder
// under e2e-output/webkit, so a section plays the same alone as after the others.
const SECTIONS = [
  ['runExpansionIntro', (b) => runExpansionIntro(b)],
  ['runUnlocks', (b) => runUnlocks(b)],
  ['runSize', async (b) => { let f = 0; for (const [W, H] of SIZES) f += await runSize(b, W, H); return f; }],
  ['runPortrait', (b) => runPortrait(b)],
  ['runPlaytest', async (b) => (await runPlaytest(b)) + (await runPlaytest(b, 844, 390))],
  ['runPauseSettings', (b) => runPauseSettings(b)],
  ['runTutorialWalk', async (b) => { let f = 0; for (const run of WALK_RUNS) f += await runTutorialWalk(b, run); return f; }],
  ['runRecruit', (b) => runRecruit(b)],
  ['runScreens', async (b) => { let f = 0; for (const run of SCREEN_RUNS) f += await runScreens(b, run); return f; }],
  ['runDockTextSize', (b) => runDockTextSize(b)],
  ['runTownSetup', (b) => runTownSetup(b)],
  ['runFlow', async (b) => { let f = 0; for (const run of FLOW_RUNS) f += await runFlow(b, run); return f; }],
  ['runCoachName', (b) => runCoachName(b)],
  ['runOfficeUnlocks', (b) => runOfficeUnlocks(b)],
  ['runDifficulty', (b) => runDifficulty(b)],
  ['runCoachSays', (b) => runCoachSays(b)],
  ['runCoachVoice', (b) => runCoachVoice(b)],
  ['runLargeTextTargets', (b) => runLargeTextTargets(b)],
  ['runLadderForm', (b) => runLadderForm(b)],
  ['runPortraitMenus', (b) => runPortraitMenus(b)],
  ['runCoachCalls', (b) => runCoachCalls(b, [[844, 390]])],
  ['runLabsControls', (b) => runLabsControls(b)],
];
/**
 * The CI shards (ci.yml, job webkit-shard), balanced on section times from CI.
 * Every section is in exactly one group; the guard below fails the run otherwise.
 */
const GROUPS = {
  match: ['runPlaytest', 'runPauseSettings', 'runTutorialWalk', 'runCoachCalls', 'runLabsControls'],
  text: ['runLargeTextTargets', 'runLadderForm'],
  screens: ['runExpansionIntro', 'runOfficeUnlocks', 'runUnlocks', 'runRecruit', 'runScreens', 'runTownSetup', 'runFlow', 'runCoachName', 'runDifficulty', 'runCoachVoice', 'runCoachSays'],
  portrait: ['runSize', 'runPortrait', 'runDockTextSize', 'runPortraitMenus'],
};

// Guard: a run* phase declared in this file or under e2e-webkit/ but missing from SECTIONS, or a section
// in no group (or two), would silently drop out of CI once it is sharded. Fail first.
{
  const dir = fileURLToPath(new URL('./e2e-webkit/', import.meta.url));
  const files = [fileURLToPath(import.meta.url), ...readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.mjs')).sort().map((f) => join(dir, f))];
  const declared = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/^(export )?async function (run[A-Z]\w*)\(/gm)].map((m) => m[2]));
  const listed = SECTIONS.map(([name]) => name);
  const grouped = Object.values(GROUPS).flat();
  const problems = [
    ...declared.filter((n) => !listed.includes(n)).map((n) => `${n} is not in SECTIONS`),
    ...listed.filter((n) => !declared.includes(n)).map((n) => `SECTIONS lists ${n}, which is not declared`),
    ...listed.filter((n) => !grouped.includes(n)).map((n) => `${n} is in no --group`),
    ...listed.filter((n) => grouped.filter((g) => g === n).length > 1).map((n) => `${n} is in more than one --group`),
    ...grouped.filter((n) => !listed.includes(n)).map((n) => `a --group lists ${n}, which is not a section`),
  ];
  if (problems.length) {
    console.error(`e2e-webkit sections and groups disagree:\n  ${[...new Set(problems)].join('\n  ')}`);
    process.exit(2);
  }
}

const SCREENS_ONLY = argv.includes('--screens-only');
const CONTROLS_ONLY = argv.includes('--controls-only');
const CALLS_ONLY = argv.includes('--coach-calls-only');
const GROUP = argv.includes('--group') ? argv[argv.indexOf('--group') + 1] : null;
if (argv.includes('--group') && !GROUPS[GROUP]) {
  console.error(`bad --group "${GROUP ?? ''}": want one of ${Object.keys(GROUPS).join(', ')}`);
  process.exit(2);
}
if (GROUP && (SCREENS_ONLY || CONTROLS_ONLY || CALLS_ONLY)) {
  console.error('--group does not combine with --screens-only, --controls-only or --coach-calls-only');
  process.exit(2);
}
/** [name, run] pairs this invocation plays, in the full run's order. */
const plan = CALLS_ONLY
  ? [['runCoachCalls', (b) => runCoachCalls(b, [[390, 844], [844, 390]])]]
  : CONTROLS_ONLY
    ? SECTIONS.filter(([n]) => n === 'runLabsControls')
    : SCREENS_ONLY
      ? SECTIONS.filter(([n]) => ['runTutorialWalk', 'runScreens', 'runDockTextSize', 'runLargeTextTargets'].includes(n))
      : GROUP
        ? SECTIONS.filter(([n]) => GROUPS[GROUP].includes(n))
        : SECTIONS;

// Every step logs one `ok ` or `FAIL` line: count them per section for the closing tally.
let okLines = 0, failLines = 0;
const counted = (fn) => (...a) => {
  if (typeof a[0] === 'string') { if (a[0].startsWith('ok ')) okLines++; else if (a[0].startsWith('FAIL')) failLines++; }
  return fn(...a);
};
console.log = counted(console.log.bind(console));

let failed = 0;
const tally = [];
try {
  await startServer();
  const browser = process.env.E2E_CHROMIUM_PATH
    ? await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH, args: ['--no-sandbox'] })
    : await webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {});
  log(`sections${GROUP ? ` (--group ${GROUP})` : ''}: ${plan.map(([n]) => n).join(', ')}`);
  for (const [name, run] of plan) {
    const t0 = Date.now(), ok0 = okLines, fail0 = failLines;
    const f = await run(browser);
    failed += f;
    tally.push({ name, s: Math.round((Date.now() - t0) / 1000), ok: okLines - ok0, fail: failLines - fail0, failed: f });
    log(`section ${name}: ${tally.at(-1).s}s, ${tally.at(-1).ok} ok, ${tally.at(-1).fail} FAIL`);
  }
  await browser.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  stopServer();
}
log(`\nsection times${GROUP ? ` (--group ${GROUP})` : ''}:`);
for (const t of tally) log(`  ${t.name.padEnd(20)} ${String(t.s).padStart(4)}s  ${String(t.ok).padStart(4)} ok  ${t.fail} FAIL`);
log(`checks: ${okLines} ok, ${failLines} FAIL, ${tally.length}/${plan.length} sections played`);
log(failed ? `\n${failed} failure(s)` : `\nall ${process.env.E2E_CHROMIUM_PATH ? 'Chromium fallback' : 'WebKit'} layout checks passed`);
process.exit(failed ? 1 : 0);
