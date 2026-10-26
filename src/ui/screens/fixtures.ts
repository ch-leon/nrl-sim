// src/ui/screens/fixtures.ts — Fixtures + Ladder DOM screens (BAK-184, WU-7).
// Built from the src/ui/dom.ts helper kit (no Phaser). One tabbed modal with a
// Fixtures tab (round-by-round, results + upcoming) and a Ladder tab (sortable
// standings). The player row / fixtures are highlighted.
//
// Pure formatting helpers (fmtFixtureLine, ladderView) are exported so they can
// be unit-tested without a DOM (the vitest env is 'node', no jsdom — see
// vite.config.ts, matching the hud.ts / nav.ts convention).
//
// No nav registration here — the orchestrator wires openFixturesScreen /
// openLadderScreen into the nav bar (main.ts).

import { el, panel, button, openModal, setScreenKey } from '../dom';
import { getState, type GameState, type Fixture, type LadderRow, type RivalClub, type WeatherKind } from '../../core/state';
import { PLAYER_ID, ladderPosition } from '../../systems/fixtures';
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

// ── DOM screens ────────────────────────────────────────────────────────────────

type Tab = 'fixtures' | 'ladder';

/** Build (and show) the tabbed League modal, focused on the given tab. */
function openLeagueScreen(initialTab: Tab): HTMLElement {
  const state = getState();
  const content = el('div', { class: 'nrl-league' });

  // One row (#336): the two tabs, a line about the open one, and the ✕ in the corner.
  const tabBar = el('div', { class: 'nrl-league-tabs' });
  const note = el('span', { class: 'nrl-league-note' });
  const body = el('div', { class: 'nrl-league-body' });

  const render = (tab: Tab): void => {
    body.replaceChildren(tab === 'fixtures' ? buildFixturesTab(state) : buildLadderTab(state));
    for (const b of tabBar.querySelectorAll('.nrl-btn')) {
      b.toggleAttribute('data-active', b.getAttribute('data-tab') === tab);
    }
    note.textContent = tab === 'fixtures' ? fixturesNote(state) : ladderNote(state);
    setScreenKey(tab);
  };

  const fixturesBtn = button('Fixtures', () => render('fixtures'));
  fixturesBtn.setAttribute('data-tab', 'fixtures');
  const ladderBtn = button('Ladder', () => render('ladder'));
  ladderBtn.setAttribute('data-tab', 'ladder');

  tabBar.append(fixturesBtn, ladderBtn, note);
  content.append(tabBar, body);
  const opened = openModal(content, { class: 'nrl-league-modal', screen: true, key: initialTab });
  render(initialTab);
  return opened;
}

/** "Round 6 of 16" over the Fixtures tab, or where the season is once the rounds are done. */
function fixturesNote(state: GameState): string {
  if (state.league.fixtures.length === 0) return '';
  return state.week <= SEASON_ROUNDS ? `Round ${state.week} of ${SEASON_ROUNDS}` : 'Finals';
}

/** "You are 3rd of 10 · tap a club for its squad" over the Ladder tab. */
function ladderNote(state: GameState): string {
  const pos = ladderPosition(state, PLAYER_ID);
  return pos > 0 ? `You: ${pos} of ${state.league.ladder.length} · tap a club for its squad` : '';
}

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

/** Open the League screen on the Fixtures tab. */
export function openFixturesScreen(): HTMLElement {
  return openLeagueScreen('fixtures');
}

/** Open the League screen on the Ladder tab. */
export function openLadderScreen(): HTMLElement {
  return openLeagueScreen('ladder');
}

// ── Tab builders ───────────────────────────────────────────────────────────────

/** The form guide as W/D/L pips (N7, #183), oldest first; a dash before any result. */
function formCells(form: readonly FormResult[]): HTMLElement {
  if (form.length === 0) return el('span', { class: 'nrl-form nrl-form-empty', text: '–', attrs: { 'aria-label': 'No results yet' } });
  const span = el('span', { class: 'nrl-form', attrs: { 'aria-label': `Form: ${form.join(' ')}`, title: `Last ${form.length}, oldest first` } });
  for (const r of form) span.append(el('i', { class: `nrl-form-${r}`, text: r }));
  return span;
}

/**
 * The next-match card at the top of the Fixtures tab (N7, #183): who, where,
 * both sides' place, strength and form, the opponent's best three, this
 * season's meetings, and the forecast: the fixtures system rolls next week's
 * weather at the end of this one (N14), so it shows when the match is this coming week's.
 */
function nextMatchCard(state: GameState): HTMLElement {
  const card = el('div', { class: 'nrl-next-match', attrs: { 'data-next-match': '' } });
  const forecast = forecastFor(state);
  const p = nextMatchPreview(state, forecast ? { weather: forecast } : {});
  if (!p) {
    const text = state.week > SEASON_ROUNDS ? 'No more matches this season' : 'No match this week';
    card.append(el('div', { class: 'nrl-next-head' }, el('span', { class: 'nrl-next-label', text: 'Next' }), ` ${text}`));
    return card;
  }
  const stage = p.stage === 'Round' ? `Round ${p.round}` : p.stage;
  card.append(el('div', { class: 'nrl-next-head' },
    el('span', { class: 'nrl-next-label', text: 'Next' }),
    ` ${stage} · ${p.home ? 'Home' : 'Away'}`,
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
    el('span', { class: 'nrl-next-form' }, el('small', { text: 'Last 5' }), formCells(side.form)),
  );
  card.append(el('div', { class: 'nrl-next-sides' },
    sideRow(p.opponent, oppName, 'data-next-opponent'),
    sideRow(p.you, el('span', { class: 'nrl-next-name', text: p.you.name }), 'data-next-you'),
  ));

  const line = (label: string, text: string): HTMLElement =>
    el('div', { class: 'nrl-next-line' }, el('b', { text: `${label}:` }), text);
  // How they play (N11): the style of the nine they would field today; the Guide's Tactics page explains the words.
  if (oppClub) {
    const style = rivalStyle(oppClub);
    card.append(line('They play', styleLine(style)));
    // The Analyst (N14): what they step to when they go more open. Everyone else just sees how they play.
    if (hasStaff(state, 'analyst')) {
      const behind = whenBehindLine(style);
      if (behind) card.append(line('When behind', behind));
    }
  }
  if (p.bestThree.length > 0) {
    card.append(line('Their best', p.bestThree.map((b) => `${b.name} (${b.position} ${b.overall})`).join(' · ')));
  }
  card.append(line('Head to head', fmtHeadToHead(p.headToHead)));
  if (p.weather) card.append(line('Conditions', fmtWeather(p.weather)));
  return card;
}

/** "My season" or every game (#351 X2); the choice holds while the game is open. */
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

function buildFixturesTab(state: GameState): HTMLElement {
  const names = clubLabels(state.league.clubs);
  const wrap = el('div', { class: 'nrl-fixtures' });

  if (state.league.fixtures.length > 0) wrap.append(nextMatchCard(state));

  if (state.league.fixtures.length === 0) {
    wrap.append(panel({}, el('p', { text: 'No fixtures yet — season not started.' })));
    return wrap;
  }

  const list = el('div', { class: 'nrl-fixtures-all' });
  const viewBtns = ([['mine', 'My season'], ['all', 'All games']] as const).map(([v, label]) => {
    const b = button(label, () => { fixturesView = v; render(); });
    b.setAttribute('data-fixtures-view', v);
    return b;
  });
  const render = (): void => {
    for (const b of viewBtns) b.classList.toggle('nrl-sort-active', b.getAttribute('data-fixtures-view') === fixturesView);
    list.replaceChildren();
    const rounds = fixturesByRound(state.league.fixtures);
    if (fixturesView === 'mine') {
      for (const { round, fixtures } of rounds) {
        const f = fixtures.find((x) => x.homeId === PLAYER_ID || x.awayId === PLAYER_ID);
        if (!f) continue;
        const m = fmtMyFixture(f, names);
        const row = el('div', { class: 'nrl-fixture nrl-fixture-mine', attrs: { 'data-player': 'true' } },
          el('span', { class: 'nrl-fixture-label', text: m.label }),
          m.result ? el('span', { class: 'nrl-form' }, el('i', { class: `nrl-form-${m.result}`, text: m.result })) : el('span'),
          el('span', { class: 'nrl-fixture-score', text: m.score }));
        if (round === state.week) row.setAttribute('data-current', 'true');
        list.append(row);
      }
      return;
    }
    for (const { round, fixtures } of rounds) {
      const header = el('h3', { class: 'nrl-fixtures-round', text: round > SEASON_ROUNDS ? `Finals (R${round})` : `Round ${round}` });
      if (round === state.week) header.setAttribute('data-current', 'true');
      const games = el('div', { class: 'nrl-fixtures-list' });
      for (const f of fixtures) {
        const line = el('div', { class: 'nrl-fixture', text: fmtFixtureLine(f, names) });
        if (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID) line.setAttribute('data-player', 'true');
        games.append(line);
      }
      list.append(header, games);
    }
  };
  wrap.append(el('div', { class: 'nrl-fixtures-views' }, ...viewBtns), list);
  render();
  return wrap;
}

function buildLadderTab(state: GameState): HTMLElement {
  const names = clubLabels(state.league.clubs);
  const full = clubNameMap(state.league.clubs);
  const wrap = el('div', { class: 'nrl-ladder' });

  if (state.league.ladder.length === 0) {
    wrap.append(panel({}, el('p', { text: 'No ladder yet — season not started.' })));
    return wrap;
  }

  const rows = ladderView(state.league.ladder, names);
  const table = el('table', { class: 'nrl-ladder-table' });

  const headCells = ['#', 'Club', 'P', 'W', 'D', 'L', 'PF', 'PA', 'Diff', 'Pts', 'Form'];
  const thead = el('thead');
  const hrow = el('tr');
  for (const h of headCells) hrow.append(el('th', { text: h }));
  thead.append(hrow);

  const tbody = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    if (r.isPlayer) tr.setAttribute('data-player', 'true');
    const diffStr = r.diff > 0 ? `+${r.diff}` : String(r.diff);
    const cells = [
      String(r.pos), r.name, String(r.played), String(r.wins), String(r.draws),
      String(r.losses), String(r.pointsFor), String(r.pointsAgainst), diffStr, String(r.points),
    ];
    cells.forEach((c, i) => {
      const club = i === 1 && !r.isPlayer ? state.league.clubs.find((x) => x.id === r.clubId) : undefined;
      // A rival's name opens its squad (#74).
      const cell = club?.squad
        ? el('td', { class: 'nrl-ladder-name' }, el('button', { class: 'nrl-ladder-club', text: c, attrs: { type: 'button', title: full[r.clubId] ?? r.name }, onClick: () => openRivalSquad(club) }))
        : el('td', { text: c, ...(i === 1 ? { class: 'nrl-ladder-name', attrs: { title: full[r.clubId] ?? r.name } } : {}) });
      tr.append(cell);
    });
    // Last five, oldest first (N7, #183). How a side plays is on its squad page (#351 X4).
    tr.append(el('td', { class: 'nrl-ladder-form' }, formCells(formGuide(state.league.fixtures, r.clubId))));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrap.append(el('div', { class: 'nrl-ladder-scroll' }, table));
  return wrap;
}
