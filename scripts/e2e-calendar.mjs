// Shared by the Chromium season and performance playthroughs. A League week is
// a saved calendar slot, not necessarily a round: it can be a trial, a bye or a rest.
export const ADVANCE_PROMPTS = '[data-confirm-advance], [data-ask-proceed], [data-skip-events]';

export function nextClubFixture(page) {
  return page.evaluate(() => {
    const s = window.__nrlState();
    const fixture = (s.competitions?.instances ?? [])
      .filter((i) => i.season === s.season && ['active', 'scheduled'].includes(i.status))
      .flatMap((i) => i.fixtures.filter((f) => f.status === 'scheduled' && f.slot >= s.week
        && (f.homeId === s.clubId || f.awayId === s.clubId)))
      .sort((a, b) => a.slot - b.slot)[0];
    return { season: s.season, week: s.week, fixture: fixture ?? null, seed: s.competitions?.leagueCareer?.scheduleSeed,
      opponent: fixture && s.league.clubs.find((c) => c.id === (fixture.homeId === s.clubId ? fixture.awayId : fixture.homeId))?.name,
      weather: s.weather ?? 'clear' };
  });
}

/** Play the intervening weeks through the UI, never by injecting a round or mutating a save. */
export async function reachClubFixture(page, advanceWeek) {
  const start = await nextClubFixture(page);
  if (!start.fixture) throw new Error(`no scheduled club fixture at or after S${start.season} W${start.week}`);
  let at = start;
  while (at.week < start.fixture.slot) {
    await advanceWeek();
    const after = await nextClubFixture(page);
    if (after.season !== at.season || after.week !== at.week + 1) {
      throw new Error(`one calendar week should elapse from S${at.season} W${at.week}; got S${after.season} W${after.week}`);
    }
    at = after;
  }
  if (at.fixture?.id !== start.fixture.id) throw new Error(`scheduled fixture changed before S${at.season} W${at.week}`);
  return at;
}

/** A reminder's Close cancels the advance, so use its explicit Continue action. */
export async function passAdvancePrompts(page, press, before) {
  for (let i = 0; i < 4; i++) {
    const prompt = page.locator(ADVANCE_PROMPTS).first();
    const next = await page.waitForFunction(({ prompts, stamp }) => {
      if (document.querySelector(prompts)) return 'prompt';
      const s = window.__nrlState();
      return document.querySelector('.nrl-dock[data-advancing], .nrl-mo-controls')
        || (stamp && (s.season !== stamp[0] || s.week !== stamp[1] || (s.preseason ?? null) !== stamp[2])) ? 'started' : null;
    }, { prompts: ADVANCE_PROMPTS, stamp: before ? [before.season, before.week, before.preseason ?? null] : null },
    { timeout: 700 }).then((handle) => handle.jsonValue(), () => null);
    if (next !== 'prompt') return;
    await press(prompt);
  }
  if (await page.locator(ADVANCE_PROMPTS).count()) throw new Error('advance prompts did not clear');
}
