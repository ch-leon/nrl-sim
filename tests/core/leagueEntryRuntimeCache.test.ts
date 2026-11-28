import { afterEach, expect, it } from 'vitest';
import { activePack, selectPack } from '../../src/content';
import { loadState } from '../../src/core/state';
import { BENCH } from '../../src/match/league/bench';
import { NINES } from '../../src/match/league/rules';
import { applyTuning } from '../../src/match/league/tuning';
import { isPlayableLeagueCareer, structuralAdvanceProblem } from '../../src/systems/competitionCalendar';
import { acceptLeagueEntry, previewLeagueEntry } from '../../src/systems/leagueEntry';
import { leagueCareerStateProblem } from '../../src/systems/leagueEntryValidation';
import { leagueSlotState } from '../helpers/leagueSlot';

const initialPack = activePack().id;
afterEach(() => selectPack(initialPack));

it.each([
  { knob: 'rules.halfMinutes', value: () => NINES.halfMinutes + 1, message: 'This competition rules snapshot needs a supported match engine.' },
  { knob: 'bench.size', value: () => BENCH.size + 1, message: 'This competition lineup policy is not enabled yet.' },
])('refreshes admission when $knob is tuned and restored without replacing the save', async ({ knob, value, message }) => {
  selectPack('au');
  const opening = await leagueSlotState();
  const preview = previewLeagueEntry(opening, opening.competitions!.leagueCareer!.access[0]!.leagueId);
  if (!preview.ok) throw new Error(preview.message);
  const accepted = acceptLeagueEntry(opening, preview.preview);
  if (!accepted.ok) throw new Error(accepted.message);
  const state = accepted.state;
  loadState(state);

  expect(leagueCareerStateProblem(state)).toBeNull();
  expect(isPlayableLeagueCareer(state)).toBe(true);
  expect(structuralAdvanceProblem(state)).toBeNull();
  const tunedFirst = structuredClone(state);
  const restore = applyTuning({ [knob]: value() });
  try {
    const unsupported = { reason: 'unsupported', message };
    expect(leagueCareerStateProblem(tunedFirst)).toEqual(unsupported);
    expect.soft(leagueCareerStateProblem(state)).toEqual(unsupported);
    expect(structuralAdvanceProblem(state)).toBe(message);
    expect(structuralAdvanceProblem(tunedFirst)).toBe(message);
    expect(isPlayableLeagueCareer(state)).toBe(true); // the saved shape is unchanged
  } finally {
    restore();
  }

  expect(leagueCareerStateProblem(state)).toBeNull();
  expect.soft(leagueCareerStateProblem(tunedFirst)).toBeNull();
  expect.soft(structuralAdvanceProblem(tunedFirst)).toBeNull();
});
