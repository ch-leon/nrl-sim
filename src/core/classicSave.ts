// A Classic career is the old single 16-club season. League career is the only
// mode (#819). This predicate is pure: it never migrates, never touches storage
// and never throws, so a Classic save can be recognised before anything tries to
// load it.
//
// Classic needs positive evidence: a version this game understands, and the
// Classic league table (16 clubs in AU, 12 in the UK pack). A missing leagueCareer is not enough, so a later League shape
// is not archived. A save newer than SAVE_VERSION is not Classic: it keeps the
// "Update the game" message. A League career calendar is the structural calendar
// (mode 'structural') shared by a League career and an isolated developer
// prototype. Those stay where they are. Anything that is not a save object
// (corrupt text, a future shape we cannot even parse) is not Classic.

import { SAVE_VERSION } from './state';

/** Player club plus the 15 AU Classic rivals. */
export const CLASSIC_CLUB_COUNT = 16;
/** Player club plus the 11 UK Classic rivals. */
export const UK_CLASSIC_CLUB_COUNT = 12;
const CLASSIC_CLUB_COUNTS: readonly number[] = [CLASSIC_CLUB_COUNT, UK_CLASSIC_CLUB_COUNT];

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function asSave(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) as unknown; }
    catch { return null; }
  }
  return record(value) ? value : null;
}

/** The structural calendar a League career (and an isolated developer prototype) plays. */
export function isLeagueCareerCalendar(competitions: unknown): boolean {
  if (!record(competitions)) return false;
  const calendar = competitions.calendar;
  return record(calendar) && calendar.mode === 'structural';
}

/** The old single table (16 AU clubs or 12 UK clubs): each club is an object with an id. */
function isClassicLeague(save: Record<string, unknown>): boolean {
  const league = save.league;
  if (!record(league) || !Array.isArray(league.clubs) || !CLASSIC_CLUB_COUNTS.includes(league.clubs.length)) return false;
  return league.clubs.every((club) => record(club) && typeof club.id === 'string');
}

/** True when the payload is a Classic career save. Never throws. */
export function isClassicSave(raw: unknown): boolean {
  const save = asSave(raw);
  if (!save || typeof save.version !== 'number' || !Number.isInteger(save.version)) return false;
  if (save.version < 1 || save.version > SAVE_VERSION) return false;
  const competitions = save.competitions;
  if (record(competitions) && competitions.leagueCareer != null) return false;
  if (isLeagueCareerCalendar(competitions)) return false;
  return isClassicLeague(save);
}

/** The one-time line a retired Classic career shows. */
export const CLASSIC_RETIRED_TEXT = 'Classic mode has been retired. Start a new League career.';
