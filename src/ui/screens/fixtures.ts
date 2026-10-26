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
import { formGuide, nextFixture, nextMatchPreview, type ClubResult, type FormResult, type PreviewSide } from '../../systems/league';
import { SEASON_ROUNDS } from '../../config';
import { openRivalSquad } from './rivalSquad';
import { rivalStyle } from '../../systems/rivalRound';
import { hasStaff } from '../../systems/staff';
import { DEFAULT_TACTICS, PRESET_LABEL, type TeamTactics } from '../../match/league/presets';
import { TACTIC_SHORT, styleLine, whenBehindLine } from '../tacticsBlurbs';
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

/** Longer than this, a club's name on the ladder is its short name (QA finding 3: it wrapped at 844px). */
export const LADDER_NAME_MAX = 16;

/** "Woolloomooloo Wolves" → "Wolves" on the ladder, as the match report says it; shorter names stay whole. */
export function ladderName(name: string): string {
  return name.length > LADDER_NAME_MAX ? shortName(name) : name;
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

/** The form guide as W/D/L cells (N7, #183); a dash before any result. */
function formCells(form: readonly FormResult[]): HTMLElement {
  if (form.length === 0) return el('span', { class: 'nrl-form nrl-form-empty', text: '–', attrs: { 'aria-label': 'No results yet' } });
  const span = el('span', { class: 'nrl-form', attrs: { 'aria-label': `Form: ${form.join(' ')}` } });
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
    formCells(side.form),
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

function buildFixturesTab(state: GameState): HTMLElement {
  const names = clubNameMap(state.league.clubs);
  const wrap = el('div', { class: 'nrl-fixtures' });

  if (state.league.fixtures.length > 0) wrap.append(nextMatchCard(state));

  if (state.league.fixtures.length === 0) {
    wrap.append(panel({}, el('p', { text: 'No fixtures yet — season not started.' })));
    return wrap;
  }

  for (const { round, fixtures } of fixturesByRound(state.league.fixtures)) {
    const isFinal = round > SEASON_ROUNDS;
    const header = el('h3', {
      class: 'nrl-fixtures-round',
      text: isFinal ? `Finals (R${round})` : `Round ${round}`,
    });
    const isCurrent = round === state.week;
    if (isCurrent) header.setAttribute('data-current', 'true');

    const list = el('div', { class: 'nrl-fixtures-list' });
    for (const f of fixtures) {
      const line = el('div', { class: 'nrl-fixture', text: fmtFixtureLine(f, names) });
      if (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID) {
        line.setAttribute('data-player', 'true');
      }
      list.append(line);
    }
    wrap.append(header, list);
  }
  return wrap;
}

function buildLadderTab(state: GameState): HTMLElement {
  const names = clubNameMap(state.league.clubs);
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
      String(r.pos), ladderName(r.name), String(r.played), String(r.wins), String(r.draws),
      String(r.losses), String(r.pointsFor), String(r.pointsAgainst), diffStr, String(r.points),
    ];
    cells.forEach((c, i) => {
      const club = i === 1 && !r.isPlayer ? state.league.clubs.find((x) => x.id === r.clubId) : undefined;
      // A rival's name opens its squad (#74).
      const cell = club?.squad
        ? el('td', { class: 'nrl-ladder-name' }, el('button', { class: 'nrl-ladder-club', text: c, attrs: { type: 'button', title: r.name }, onClick: () => openRivalSquad(club) }))
        : el('td', { text: c, ...(i === 1 ? { class: 'nrl-ladder-name', attrs: { title: r.name } } : {}) });
      tr.append(cell);
    });
    // Last five, oldest first (N7, #183), and how the side plays (N11).
    const club = state.league.clubs.find((x) => x.id === r.clubId);
    const style: TeamTactics | null = r.isPlayer ? (state.lineup?.tactics ?? DEFAULT_TACTICS) : club ? rivalStyle(club) : null;
    tr.append(el('td', { class: 'nrl-ladder-form' },
      formCells(formGuide(state.league.fixtures, r.clubId)),
      ...(style ? [el('small', {
        class: 'nrl-ladder-style',
        text: `${TACTIC_SHORT[style.attack]}·${TACTIC_SHORT[style.defence]}`,
        attrs: { title: `${PRESET_LABEL[style.attack]} / ${PRESET_LABEL[style.defence]}`, 'data-style': `${style.attack}/${style.defence}`, style: 'margin-left:0.35rem;font-size:0.7em;opacity:0.85;white-space:nowrap' },
      })] : []),
    ));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrap.append(el('div', { class: 'nrl-ladder-scroll' }, table));
  return wrap;
}
