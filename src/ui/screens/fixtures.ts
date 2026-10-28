// src/ui/screens/fixtures.ts — the League sheet: ladder + fixtures (BAK-184, WU-7;
// Broadcast Quiet 3h). Built from the src/ui/dom.ts helper kit (no Phaser).
// One sheet, two columns: the ladder on the left (the club's row starred, a
// dashed line under the last finals place, a rival's name opens its squad), the
// club's fixtures on the right (results, NEXT, the weeks to come) with a toggle
// to every game of every round. The NEXT row opens the next-match preview
// (N7, #183) as a dialog over the sheet.
//
// Pure formatting helpers (fmtFixtureLine, ladderView, myFixtureRows, …) are
// exported so they can be unit-tested without a DOM (the vitest env is 'node',
// no jsdom — see vite.config.ts, matching the hud.ts / nav.ts convention).
//
// No nav registration here — the orchestrator wires openFixturesScreen /
// openLadderScreen into the nav bar (main.ts).

import { el, button, openModal, openScreen, ensureStyles } from '../dom';
import { getState, type GameState, type Fixture, type LadderRow, type RivalClub, type WeatherKind } from '../../core/state';
import { PLAYER_ID } from '../../systems/fixtures';
import { formGuide, matchStage, nextFixture, nextMatchPreview, type ClubResult, type FormResult, type PreviewSide } from '../../systems/league';
import { SEASON_ROUNDS } from '../../config';
import { openRivalSquad } from './rivalSquad';
import { rivalStyle } from '../../systems/rivalRound';
import { hasStaff } from '../../systems/staff';
import { styleLine, whenBehindLine } from '../tacticsBlurbs';
import { shortName } from './matchReport';

// ── Pure view helpers (unit-tested) ───────────────────────────────────────────

/** Map of clubId → display name for the current league. */
export function clubNameMap(clubs: readonly RivalClub[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of clubs) m[c.id] = c.name;
  return m;
}

/**
 * One-line summary of a fixture, e.g. "R7 · Reapers 18–12 Wolves" when played or
 * "R7 · Reapers v Wolves" when upcoming. `names` maps ids to display names;
 * unknown ids fall back to the raw id.
 */
export function fmtFixtureLine(f: Fixture, names: Record<string, string>): string {
  const home = names[f.homeId] ?? f.homeId;
  const away = names[f.awayId] ?? f.awayId;
  if (f.result) {
    return `R${f.round} · ${home} ${f.result.homeScore}–${f.result.awayScore} ${away}`;
  }
  return `R${f.round} · ${home} v ${away}`;
}

/** A ladder row projected for display, including 1-based position and diff. */
export interface LadderViewRow {
  pos: number;
  clubId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
  isPlayer: boolean;
}

/**
 * Project the (already-sorted) ladder into display rows. Assumes the ladder is
 * in the order applyResult keeps it (position = array index + 1).
 */
export function ladderView(
  ladder: readonly LadderRow[],
  names: Record<string, string>,
  playerId: string = PLAYER_ID,
): LadderViewRow[] {
  return ladder.map((r, i) => ({
    pos: i + 1,
    clubId: r.clubId,
    name: names[r.clubId] ?? r.clubId,
    played: r.played,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    pointsFor: r.pointsFor,
    pointsAgainst: r.pointsAgainst,
    diff: r.pointsFor - r.pointsAgainst,
    points: r.points,
    isPlayer: r.clubId === playerId,
  }));
}

/** 1 → 1st, 2 → 2nd, 3 → 3rd, 4 → 4th, 11 → 11th, 21 → 21st. */
export function fmtOrdinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "R3: won 18–12 at home · R14: drew 10–10 away", or the first meeting. */
export function fmtHeadToHead(results: readonly ClubResult[]): string {
  if (results.length === 0) return 'First meeting this season';
  const verb = { W: 'won', D: 'drew', L: 'lost' } as const;
  return results
    .map((r) => `R${r.round}: ${verb[r.result]} ${r.pointsFor}–${r.pointsAgainst} ${r.home ? 'at home' : 'away'}`)
    .join(' · ');
}

/** The line under a side's name: "3rd · strength 70" (no place before the ladder exists). */
export function fmtSideLine(side: Pick<PreviewSide, 'ladderPos' | 'strength'>): string {
  const place = side.ladderPos > 0 ? `${fmtOrdinal(side.ladderPos)} · ` : '';
  return `${place}strength ${side.strength}`;
}

/** The conditions line: 'clear' → "Fine", 'rain' → "Rain", 'wind' → "Windy". */
export function fmtWeather(w: WeatherKind): string {
  return { clear: 'Fine', rain: 'Rain', wind: 'Windy' }[w];
}

/** Group fixtures by round number, ascending. */
export function fixturesByRound(fixtures: readonly Fixture[]): Array<{ round: number; fixtures: Fixture[] }> {
  const byRound = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const arr = byRound.get(f.round) ?? [];
    arr.push(f);
    byRound.set(f.round, arr);
  }
  return [...byRound.keys()]
    .sort((a, b) => a - b)
    .map((round) => ({ round, fixtures: byRound.get(round) as Fixture[] }));
}

/** The top eight make the finals (systems/fixtures finalsSeeds); the ladder's dashed line sits under 8th. */
export const FINALS_PLACES = 8;

/**
 * The ladder's heading (3h): "LADDER · AFTER R2" once a round is in, "LADDER ·
 * FINAL" in the finals, plain "LADDER" before a ball is kicked.
 */
export function ladderHeading(state: Pick<GameState, 'week' | 'league'>): string {
  const played = state.league.ladder.reduce((m, r) => Math.max(m, r.played), 0);
  if (played === 0) return 'Ladder';
  if (state.week > SEASON_ROUNDS) return 'Ladder · final';
  return `Ladder · after R${played}`;
}

/** The ladder's form column and its draws column show only when they say something (3h). */
export function ladderHasDraws(rows: readonly Pick<LadderViewRow, 'draws'>[]): boolean {
  return rows.some((r) => r.draws > 0);
}

/** A round's short label for a 24px column: R7, QF, SF, GF. */
export function roundShort(round: number): string {
  if (round <= SEASON_ROUNDS) return `R${round}`;
  return { 'Quarter final': 'QF', 'Semi final': 'SF', 'Grand final': 'GF' }[matchStage(round) as string] ?? `R${round}`;
}

/** One row of "Your fixtures" (3h): round, opponent, H/A, and the result, NEXT or the week to come. */
export interface MyFixtureRow {
  round: number;
  rd: string;
  opponentId: string;
  opponent: string;
  home: boolean;
  /** W/L/D once played, 'next' for the coming match, 'later' for the rest. */
  tone: FormResult | 'next' | 'later';
  /** "W 22–16", "NEXT", "Wk 4". */
  res: string;
}

/** The club's season one row a round, oldest first (fmtMyFixture's result, your score first). Pure. */
export function myFixtureRows(state: Pick<GameState, 'league' | 'week'>, names: Record<string, string>, playerId: string = PLAYER_ID): MyFixtureRow[] {
  const next = nextFixture(state.league.fixtures, state.week, playerId);
  const out: MyFixtureRow[] = [];
  for (const { fixtures } of fixturesByRound(state.league.fixtures)) {
    const f = fixtures.find((x) => x.homeId === playerId || x.awayId === playerId);
    if (!f) continue;
    const home = f.homeId === playerId;
    const opponentId = home ? f.awayId : f.homeId;
    const m = fmtMyFixture(f, names, playerId);
    const tone: MyFixtureRow['tone'] = m.result ?? (f === next ? 'next' : 'later');
    const res = m.result ? `${m.result} ${m.score}` : tone === 'next' ? 'NEXT' : `Wk ${f.round}`;
    out.push({ round: f.round, rd: roundShort(f.round), opponentId, opponent: names[opponentId] ?? opponentId, home, tone, res });
  }
  return out;
}

// ── DOM screens ────────────────────────────────────────────────────────────────

/**
 * The forecast for the player's next match: state.weather between weeks is the
 * coming week's (rolled at the end of the last), so it counts only when the next
 * fixture is this coming week's. Pure.
 */
export function forecastFor(state: Pick<GameState, 'league' | 'week' | 'weather'>): WeatherKind | undefined {
  const f = nextFixture(state.league.fixtures, state.week, 'player');
  return f && f.round === state.week ? state.weather : undefined;
}

/** No club's name on the ladder is longer than this (QA finding 3: long names wrapped at 844px). */
export const LADDER_NAME_MAX = 16;

/**
 * What the ladder and the fixtures call each club (#351 X4): one rule for every
 * club, its short name ("Woolloomooloo Wolves" → "Wolves", as the match report
 * says it), unless two clubs share one: those keep their whole names.
 */
export function clubLabels(clubs: readonly { id: string; name: string }[]): Record<string, string> {
  const count = new Map<string, number>();
  for (const c of clubs) count.set(shortName(c.name), (count.get(shortName(c.name)) ?? 0) + 1);
  const m: Record<string, string> = {};
  for (const c of clubs) m[c.id] = (count.get(shortName(c.name)) ?? 0) > 1 ? c.name : shortName(c.name);
  return m;
}

/** Open the League sheet ('fixtures' lights League; so does 'ladder', which it holds). */
export function openFixturesScreen(): HTMLElement {
  return openLeagueScreen('fixtures');
}

/** Open the League sheet from somewhere that asked for the ladder (the Guide). */
export function openLadderScreen(): HTMLElement {
  return openLeagueScreen('ladder');
}

/** The ladder and the fixtures, side by side (3h; they used to be two tabs). */
function openLeagueScreen(key: 'fixtures' | 'ladder'): HTMLElement {
  ensureLeagueStyles();
  const state = getState();
  const ladder = buildLadder(state);
  const fixtures = buildFixtures(state);
  const sheet = el('div', { class: 'nrl-screen nrl-league' }, ladder.el, fixtures.el);
  const opened = openScreen(sheet, undefined, key);
  // Once laid out: the club's row and the next match in view.
  const settle = (): void => { ladder.reveal(); fixtures.reveal(); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(settle);
  else settle();
  return opened;
}

/** Scroll `row` into the middle of `box` without moving anything outside it. */
function centreIn(box: HTMLElement, row: HTMLElement | null): void {
  if (!row || box.scrollHeight <= box.clientHeight) return;
  const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  box.scrollTop = Math.max(0, top - (box.clientHeight - row.offsetHeight) / 2);
}

// ── The ladder ─────────────────────────────────────────────────────────────────

/** The form guide as W/D/L pips (N7, #183), oldest first; a dash before any result. */
function formCells(form: readonly FormResult[]): HTMLElement {
  if (form.length === 0) return el('span', { class: 'nrl-form nrl-form-empty', text: '–', attrs: { 'aria-label': 'No results yet' } });
  const span = el('span', { class: 'nrl-form', attrs: { 'aria-label': `Form: ${form.join(' ')}`, title: `Last ${form.length}, oldest first` } });
  for (const r of form) span.append(el('i', { class: `nrl-form-${r}`, text: r }));
  return span;
}

/**
 * The ladder (3h): pos, club, P, W, (D only once a club has drawn), L, +/−,
 * PTS, and the last five where the sheet is wide enough. The club's row is
 * starred; a dashed line falls under the last finals place; a rival's row
 * opens its squad (#74).
 */
function buildLadder(state: GameState): { el: HTMLElement; reveal: () => void } {
  const col = el('div', { class: 'nrl-league-col nrl-league-ladder' });
  if (state.league.ladder.length === 0) {
    col.append(el('div', { class: 'nrl-label nrl-league-label', text: 'Ladder' }), el('p', { class: 'nrl-league-empty', text: 'No ladder yet — season not started.' }));
    return { el: col, reveal: () => {} };
  }
  const names = clubLabels(state.league.clubs);
  const full = clubNameMap(state.league.clubs);
  const rows = ladderView(state.league.ladder, names);
  const draws = ladderHasDraws(rows);
  const cut = Math.min(FINALS_PLACES, rows.length);

  const table = el('table', { class: `nrl-table nrl-ladder-table${draws ? ' nrl-ladder-draws' : ''}` });
  const cols = ['pos', 'club', 'n', 'n', ...(draws ? ['n'] : []), 'n', 'diff', 'pts', 'form'];
  table.append(el('colgroup', {}, ...cols.map((c) => el('col', { class: `nrl-ladder-col-${c}` }))));
  const head = el('tr', {},
    el('th', { attrs: { 'aria-label': 'Position' } }),
    el('th', { class: 'nrl-ladder-heading', text: ladderHeading(state) }),
    ...['P', 'W', ...(draws ? ['D'] : []), 'L', '+/−', 'Pts'].map((h) => el('th', { class: 'nrl-num', text: h })),
    el('th', { class: 'nrl-ladder-form', text: 'Form' }),
  );
  table.append(el('thead', {}, head));

  const tbody = el('tbody');
  let mine: HTMLElement | null = null;
  for (const r of rows) {
    const club = r.isPlayer ? undefined : state.league.clubs.find((x) => x.id === r.clubId);
    const name = r.isPlayer ? `★ ${r.name}` : r.name;
    // A rival's name opens its squad (#74); the whole row takes the tap.
    const nameCell = club?.squad
      ? el('td', { class: 'nrl-ladder-name' }, el('button', { class: 'nrl-ladder-club', text: name, attrs: { type: 'button', title: full[r.clubId] ?? r.name } }))
      : el('td', { class: 'nrl-ladder-name', text: name, attrs: { title: full[r.clubId] ?? r.name } });
    const diff = r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? `−${-r.diff}` : '0';
    const tr = el('tr', {},
      el('td', { class: 'nrl-num nrl-ladder-pos', text: String(r.pos) }),
      nameCell,
      ...[r.played, r.wins, ...(draws ? [r.draws] : []), r.losses].map((v) => el('td', { class: 'nrl-num', text: String(v) })),
      el('td', { class: 'nrl-num nrl-ladder-diff', text: diff }),
      el('td', { class: 'nrl-num nrl-ladder-pts', text: String(r.points) }),
      // Last five, oldest first (N7, #183). How a side plays is on its squad page (#351 X4).
      el('td', { class: 'nrl-ladder-form' }, formCells(formGuide(state.league.fixtures, r.clubId))),
    );
    if (r.isPlayer) { tr.setAttribute('data-player', 'true'); mine = tr; }
    if (r.pos === cut && cut < rows.length) tr.setAttribute('data-cut', '');
    if (club?.squad) {
      tr.classList.add('nrl-ladder-rival');
      tr.addEventListener('click', () => openRivalSquad(club));
    }
    tbody.append(tr);
  }
  table.append(tbody);
  const scroll = el('div', { class: 'nrl-ladder-scroll' }, table);
  col.append(scroll, el('div', { class: 'nrl-league-foot', text: `Top ${cut} make the finals · tap a club for its squad` }));
  return { el: col, reveal: () => centreIn(scroll, mine) };
}

// ── The fixtures ───────────────────────────────────────────────────────────────

/** "Your fixtures" or every game (#351 X2); the choice holds while the game is open. */
let fixturesView: 'mine' | 'all' = 'mine';

/** One round of the player's season: "R7 · v Wolves (H)", and the result once played, his score first. */
export function fmtMyFixture(f: Fixture, names: Record<string, string>, playerId: string = PLAYER_ID): { label: string; result: FormResult | null; score: string } {
  const home = f.homeId === playerId;
  const opp = names[home ? f.awayId : f.homeId] ?? (home ? f.awayId : f.homeId);
  const stage = f.round > SEASON_ROUNDS ? matchStage(f.round) : `R${f.round}`;
  const label = `${stage} · ${home ? 'v' : 'at'} ${opp}`;
  if (!f.result) return { label, result: null, score: '' };
  const us = home ? f.result.homeScore : f.result.awayScore;
  const them = home ? f.result.awayScore : f.result.homeScore;
  return { label, result: us > them ? 'W' : us < them ? 'L' : 'D', score: `${us}–${them}` };
}

/**
 * The right column (3h): the club's fixtures, one 38px row a round (the NEXT
 * row opens the next-match preview), or every game of every round. Scrolled so
 * the coming round is in view.
 */
function buildFixtures(state: GameState): { el: HTMLElement; reveal: () => void } {
  const col = el('div', { class: 'nrl-league-col nrl-league-fixtures' });
  const label = el('span', { class: 'nrl-label nrl-league-label' });
  const list = el('div', { class: 'nrl-fixtures-list' });
  if (state.league.fixtures.length === 0) {
    label.textContent = 'Your fixtures';
    col.append(el('div', { class: 'nrl-fixtures-head' }, label), el('p', { class: 'nrl-league-empty', text: 'No fixtures yet — season not started.' }));
    return { el: col, reveal: () => {} };
  }
  const names = clubLabels(state.league.clubs);
  const toggle = button('', () => { fixturesView = fixturesView === 'mine' ? 'all' : 'mine'; render(); reveal(); }, { class: 'nrl-fixtures-toggle' });
  let current: HTMLElement | null = null;

  const render = (): void => {
    current = null;
    list.replaceChildren();
    toggle.setAttribute('data-fixtures-view', fixturesView === 'mine' ? 'all' : 'mine');
    if (fixturesView === 'mine') {
      label.textContent = 'Your fixtures';
      toggle.textContent = 'All games ▸';
      let lastPlayed: HTMLElement | null = null;
      for (const r of myFixtureRows(state, names)) {
        const parts = [
          el('span', { class: 'nrl-fixture-rd', text: r.rd }),
          el('span', { class: 'nrl-fixture-opp' }, `v ${r.opponent} `, el('span', { class: 'nrl-fixture-ha', text: r.home ? 'H' : 'A', attrs: { title: r.home ? 'Home' : 'Away' } })),
          el('span', { class: `nrl-fixture-res nrl-fixture-${r.tone}`, text: r.tone === 'next' ? 'NEXT ▸' : r.res }),
        ];
        // The coming match opens its preview: who, form, how they play, their best, head to head.
        const row = r.tone === 'next'
          ? el('button', { class: 'nrl-fixture-row nrl-fixture-mine', attrs: { type: 'button', 'data-next-row': '', 'aria-label': `Next: round ${r.round} v ${r.opponent}, preview` }, onClick: () => openNextMatch() }, ...parts)
          : el('div', { class: 'nrl-fixture-row nrl-fixture-mine' }, ...parts);
        row.setAttribute('data-player', 'true');
        row.setAttribute('data-round', String(r.round));
        if (r.tone === 'next') current = row;
        else if (r.tone !== 'later') lastPlayed = row;
        list.append(row);
      }
      current ??= lastPlayed;
      return;
    }
    label.textContent = 'All games';
    toggle.textContent = '◂ Yours';
    for (const { round, fixtures } of fixturesByRound(state.league.fixtures)) {
      const header = el('div', { class: 'nrl-label nrl-fixtures-round', text: round > SEASON_ROUNDS ? `Finals · ${roundShort(round)}` : `Round ${round}` });
      if (round === state.week) { header.setAttribute('data-current', 'true'); current = header; }
      list.append(header);
      for (const f of fixtures) {
        const line = el('div', { class: 'nrl-fixture', text: fmtFixtureLine(f, names).replace(/^R\d+ · /, '') });
        if (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID) line.setAttribute('data-player', 'true');
        list.append(line);
      }
    }
  };
  const reveal = (): void => {
    if (!current) return;
    if (fixturesView === 'all') list.scrollTop = Math.max(0, current.offsetTop - list.offsetTop);
    else centreIn(list, current);
  };
  render();
  col.append(el('div', { class: 'nrl-fixtures-head' }, label, toggle), list);
  return { el: col, reveal };
}

/**
 * The next-match preview (N7, #183), opened from the NEXT row as a dialog over
 * the sheet: who, where, both sides' place, strength and form, how they play
 * (and, with the Analyst, what they switch to behind), the opponent's best three,
 * this season's meetings, and the forecast: the fixtures system rolls next
 * week's weather at the end of this one (N14), so it shows when the match is
 * this coming week's.
 */
export function openNextMatch(state: GameState = getState()): HTMLElement {
  ensureLeagueStyles();
  return openModal(nextMatchCard(state), { class: 'nrl-next-modal', region: true, closeButton: true });
}

function nextMatchCard(state: GameState): HTMLElement {
  const card = el('div', { class: 'nrl-next-match', attrs: { 'data-next-match': '' } });
  const forecast = forecastFor(state);
  const p = nextMatchPreview(state, forecast ? { weather: forecast } : {});
  if (!p) {
    const text = state.week > SEASON_ROUNDS ? 'No more matches this season' : 'No match this week';
    card.append(el('div', { class: 'nrl-next-head' }, el('span', { class: 'nrl-next-label', text: 'Next match' }), el('span', { class: 'nrl-next-where', text })));
    return card;
  }
  const stage = p.stage === 'Round' ? `Round ${p.round}` : p.stage;
  card.append(el('div', { class: 'nrl-next-head' },
    el('span', { class: 'nrl-next-label', text: 'Next match' }),
    el('span', { class: 'nrl-next-where', text: `${stage} · ${p.home ? 'Home' : 'Away'}` }),
  ));

  const oppClub = state.league.clubs.find((c) => c.id === p.opponent.id);
  // The opponent's name opens its squad, as on the ladder (#74).
  const oppName = oppClub?.squad
    ? el('button', { class: 'nrl-ladder-club nrl-next-name', text: p.opponent.name, attrs: { type: 'button' }, onClick: () => openRivalSquad(oppClub) })
    : el('span', { class: 'nrl-next-name', text: p.opponent.name });
  const sideRow = (side: PreviewSide, name: Node, attr: string): HTMLElement => el(
    'div', { class: 'nrl-next-side', attrs: { [attr]: '' } },
    el('span', { class: 'nrl-next-swatch', attrs: { style: `background:${side.colors[0]};border-color:${side.colors[1]}` } }),
    el('div', { class: 'nrl-next-side-text' }, el('div', {}, name), el('div', { class: 'nrl-next-meta', text: fmtSideLine(side) })),
    // The squares say what they are (#349 X5).
    el('span', { class: 'nrl-next-form' }, el('small', { class: 'nrl-label', text: 'Last 5' }), formCells(side.form)),
  );
  card.append(el('div', { class: 'nrl-next-sides' },
    sideRow(p.opponent, oppName, 'data-next-opponent'),
    sideRow(p.you, el('span', { class: 'nrl-next-name', text: `★ ${p.you.name}` }), 'data-next-you'),
  ));

  const lines = el('div', { class: 'nrl-next-lines' });
  const line = (label: string, text: string): void => {
    lines.append(el('div', { class: 'nrl-next-line' }, el('span', { class: 'nrl-label', text: label }), el('span', { text })));
  };
  // How they play (N11): the style of the nine they would field today; the Guide's Tactics page explains the words.
  if (oppClub) {
    const style = rivalStyle(oppClub);
    line('They play', styleLine(style));
    // The Analyst (N14): what they step to when they go more open. Everyone else just sees how they play.
    if (hasStaff(state, 'analyst')) {
      const behind = whenBehindLine(style);
      if (behind) line('When behind', behind);
    }
  }
  if (p.bestThree.length > 0) {
    line('Their best', p.bestThree.map((b) => `${b.name} (${b.position} ${b.overall})`).join(' · '));
  }
  line('Head to head', fmtHeadToHead(p.headToHead));
  if (p.weather) line('Conditions', fmtWeather(p.weather));
  card.append(lines);
  return card;
}

// ── Styles (the League's own; injected once beside the shared kit) ────────────

const LEAGUE_STYLE_ID = 'nrl-league-styles';

function ensureLeagueStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(LEAGUE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = LEAGUE_STYLE_ID;
  style.textContent = LEAGUE_CSS;
  document.head.appendChild(style);
}

export const LEAGUE_CSS = `
/* 3h: one sheet, the ladder and the fixtures side by side; each column scrolls inside itself. */
.nrl-screen.nrl-league { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; }
.nrl-league-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.nrl-league-label { display: flex; align-items: center; min-height: 24px; }
.nrl-league-empty { color: var(--nrl-muted); margin: 8px 0; }
.nrl-league-foot { flex: 0 0 auto; margin-top: 4px; font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-ladder-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-table.nrl-ladder-table { table-layout: fixed; border-collapse: separate; border-spacing: 0; }
/* rem, not px: 24px at Normal, and room for "10" at Large and Larger text, where it read "1…" (#410). */
.nrl-ladder-col-pos { width: 1.5rem; }
.nrl-ladder-col-n { width: 30px; }
.nrl-ladder-col-diff { width: 44px; }
.nrl-ladder-col-pts { width: 38px; }
.nrl-ladder-col-form { width: 84px; }
.nrl-ladder-table th { height: 24px; padding: 0 4px; }
.nrl-ladder-table th.nrl-ladder-heading { overflow: hidden; text-overflow: ellipsis; }
.nrl-ladder-table td { height: 25px; padding: 0 4px; border-top: 0; overflow: hidden; text-overflow: ellipsis; }
.nrl-ladder-table td.nrl-num { font-weight: 500; }
.nrl-ladder-table td.nrl-ladder-pos { text-align: left; color: var(--nrl-muted); }
.nrl-ladder-table td.nrl-ladder-diff { color: var(--nrl-text-2); }
.nrl-ladder-table td.nrl-ladder-pts { font-weight: 600; }
/* The club's row: starred, #24346b, bold; rounded like the mock's highlight. */
.nrl-ladder-table tr[data-player] td { background: var(--nrl-me); font-weight: 700; }
.nrl-ladder-table tr[data-player] td:first-child { border-radius: 6px 0 0 6px; }
.nrl-ladder-table tr[data-player] td:last-child { border-radius: 0 6px 6px 0; }
/* The finals cut-off: a dashed line under the last place that makes it. */
.nrl-ladder-table tr[data-cut] td { border-bottom: 1px dashed var(--nrl-accent); }
.nrl-ladder-rival { cursor: pointer; }
.nrl-ladder-rival:hover td { background: rgba(255, 255, 255, 0.04); }
.nrl-ladder-club {
  pointer-events: auto;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  cursor: pointer;
}
.nrl-ladder-club:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 1px; }
/* No room for the form column on a narrow phone; the next-match preview still shows both sides' form. */
@media (max-width: 760px) { .nrl-ladder-col-form, .nrl-ladder-table .nrl-ladder-form { display: none; } }
/* A touch screen: a rival's row is a 44px target (the mock's 25px rows are for a mouse). */
@media (pointer: coarse) { .nrl-ladder-table tbody td { height: 44px; } }
.nrl-form { display: inline-flex; gap: 2px; white-space: nowrap; vertical-align: middle; }
.nrl-form i {
  display: inline-block;
  width: 14px;
  height: 14px;
  line-height: 14px;
  border-radius: 3px;
  text-align: center;
  font-style: normal;
  font-family: var(--nrl-f-num);
  font-weight: 600;
  font-size: 0.625rem;
  color: #fff;
}
.nrl-form-W { background: var(--nrl-win); }
.nrl-form-D { background: var(--nrl-line); }
.nrl-form-L { background: var(--nrl-out); }
.nrl-form-empty { color: var(--nrl-muted); }

/* The club's fixtures: 38px rows on #141d3a, the result in Mono. */
.nrl-fixtures-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; margin-bottom: 4px; flex: 0 0 auto; }
.nrl-btn.nrl-fixtures-toggle { min-height: 28px; padding: 0 10px; border-radius: 8px; font-size: 0.8125rem; letter-spacing: 0.06em; position: relative; }
.nrl-btn.nrl-fixtures-toggle::after { content: ''; position: absolute; inset: -8px 0; } /* a 44px hit area */
.nrl-fixtures-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 4px; }
.nrl-fixture-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--nrl-panel);
  color: var(--nrl-text);
  font-family: var(--nrl-f-body);
  font-size: 0.8125rem;
  text-align: left;
  border: 0;
  box-sizing: border-box;
}
button.nrl-fixture-row { pointer-events: auto; cursor: pointer; width: 100%; box-shadow: inset 0 0 0 1px rgba(244, 208, 63, 0.35); }
button.nrl-fixture-row:hover { background: #1a2550; }
button.nrl-fixture-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 1px; }
@media (pointer: coarse) { button.nrl-fixture-row { height: 44px; } }
.nrl-fixture-rd { width: 24px; flex: 0 0 auto; font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 600; color: var(--nrl-muted); }
.nrl-fixture-opp { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-fixture-ha { color: var(--nrl-muted); }
.nrl-fixture-res { flex: 0 0 auto; font-family: var(--nrl-f-num); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.nrl-fixture-W { color: var(--nrl-pos); }
.nrl-fixture-L { color: var(--nrl-neg); }
.nrl-fixture-D { color: var(--nrl-text-2); }
.nrl-fixture-next { color: var(--nrl-accent); font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.06em; }
.nrl-fixture-later { color: var(--nrl-muted); }
/* Every game: a round's label, then its games. */
.nrl-fixtures-round { margin-top: 6px; flex: 0 0 auto; }
.nrl-fixtures-round[data-current] { color: var(--nrl-accent); }
.nrl-fixture { flex: 0 0 auto; font-size: 0.75rem; color: var(--nrl-text-2); padding: 3px 8px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-fixture[data-player] { background: var(--nrl-me); color: var(--nrl-text); font-weight: 600; }
/* A narrow phone: the ladder takes a little more of the width. */
@media (max-width: 700px) { .nrl-screen.nrl-league { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 12px; } }

/* The next-match preview: a dialog over the League sheet. */
.nrl-dialog-region .nrl-modal.nrl-next-modal { width: min(100%, 640px); background: var(--nrl-navy); }
.nrl-next-match { display: flex; flex-direction: column; gap: 8px; font-size: 0.8125rem; }
.nrl-next-head { display: flex; align-items: baseline; gap: 10px; padding-right: 44px; min-height: 36px; align-items: center; }
.nrl-next-label { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-next-where { font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.nrl-next-sides { display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-next-side { display: flex; align-items: center; gap: 10px; flex: 1 1 15rem; min-width: 0; background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; }
.nrl-next-swatch { flex: 0 0 auto; width: 18px; height: 18px; border-radius: 4px; border: 3px solid; box-sizing: border-box; }
.nrl-next-side-text { flex: 1 1 auto; min-width: 0; }
.nrl-next-name { font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.03em; }
.nrl-next-meta { font-family: var(--nrl-f-num); font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-next-form { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: 0 0 auto; }
.nrl-next-form small { font-size: 0.6875rem; }
.nrl-next-lines { display: flex; flex-direction: column; }
.nrl-next-line { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 8px; align-items: baseline; padding: 5px 0; border-top: 1px solid var(--nrl-button); color: var(--nrl-text-2); overflow-wrap: anywhere; }
/* The opponent's name: a text link with a 44px hit area (#194). */
.nrl-next-side .nrl-ladder-club { padding: 12px 0; margin: -12px 0; text-decoration: underline dotted; text-underline-offset: 3px; }
`;
