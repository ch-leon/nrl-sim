import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createNewGame, getState, loadState, setState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { generateObjectives, registerBoardSystem } from '../../src/systems/board';
import { bus } from '../../src/core/events';
import { clearSeasonHooks } from '../../src/core/time';
import { EXPANSION_COPY, expansionIntroLines } from '../../src/ui/expansionCopy';
import { EXPANSION_INTRO_HINT, showExpansionIntro } from '../../src/ui/expansionIntro';
import { coachDocument } from './coachDom';
import type { StubNode } from './stubDom';

vi.mock('../../src/art/coachFace', () => ({ coachFaceDataUrl: () => 'data:image/png;base64,face' }));
let root: StubNode;
beforeEach(() => {
  bus.clear(); clearSeasonHooks();
  root = coachDocument();
  createNewGame('<b>Test Club</b>', 484);
  initLeague(getState());
});
afterEach(() => { bus.clear(); clearSeasonHooks(); vi.unstubAllGlobals(); });

it.each(['work', 'skip'])('shows three state-derived guide lines once; %s dismisses without changing the simulation', async (exit) => {
  const before = structuredClone(getState());
  const done = showExpansionIntro();
  const card = root.querySelector('[data-expansion-intro]')!;
  expect(card).not.toBeNull();
  const lines = card.querySelectorAll('[data-coach-line]');
  expect(lines).toHaveLength(3);
  expansionIntroLines(before, generateObjectives(before)).forEach((line, i) => expect(lines[i]!.textContent).toContain(line));
  // User club text is never interpreted as markup.
  expect(card.words()).toContain('<b>Test Club</b>');
  expect(getState()).toEqual({ ...before, settings: { ...before.settings, hintsSeen: [...before.settings.hintsSeen ?? [], EXPANSION_INTRO_HINT] } });
  card.querySelector(`[data-expansion-${exit}]`)!.click();
  await done;
  expect(root.querySelector('[data-expansion-intro]')).toBeNull();
  // The actual serialisable state/load seam preserves the marker.
  loadState(JSON.parse(JSON.stringify(getState())));
  await showExpansionIntro();
  expect(root.querySelector('[data-expansion-intro]')).toBeNull();
  createNewGame('Another Club', 484);
  initLeague(getState());
  const next = showExpansionIntro();
  root.querySelector('[data-expansion-skip]')!.click();
  await next;
});

it('safely handles a missing hintsSeen list', async () => {
  const { hintsSeen: _seen, ...settings } = getState().settings;
  setState({ settings });
  const done = showExpansionIntro();
  root.querySelector('[data-expansion-skip]')!.click();
  await done;
  expect(getState().settings.hintsSeen).toEqual([EXPANSION_INTRO_HINT]);
});

it('announces first-season objectives in News and keeps season two wording ordinary', () => {
  const messages: string[] = [];
  bus.on('ui:notify', (n) => { if (n.from === 'coach') messages.push(n.text); });
  registerBoardSystem();
  expect(messages[0]).toContain(EXPANSION_COPY.objectives(getState().objectives, 'Coach'));
  const goals = getState().objectives;
  expect(goals).toEqual(generateObjectives(getState()));
  setState({ season: 2, objectives: [] });
  registerBoardSystem();
  expect(messages[1]).toContain("the board's objectives for season 2:");
  expect(messages[1]).not.toContain('first season');
});
