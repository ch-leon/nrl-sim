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

import { el, panel, button, openModal, closeScreen } from '../dom';
import { getState, type GameState, type Fixture, type LadderRow, type RivalClub } from '../../core/state';
import { PLAYER_ID, ladderPosition } from '../../systems/fixtures';
import { SEASON_ROUNDS } from '../../config';

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

  const tabBar = el('div', { class: 'nrl-league-tabs' });
  const body = el('div', { class: 'nrl-league-body' });

  const render = (tab: Tab): void => {
    body.replaceChildren(tab === 'fixtures' ? buildFixturesTab(state) : buildLadderTab(state));
    for (const b of tabBar.querySelectorAll('.nrl-btn')) {
      b.toggleAttribute('data-active', b.getAttribute('data-tab') === tab);
    }
  };

  const fixturesBtn = button('Fixtures', () => render('fixtures'));
  fixturesBtn.setAttribute('data-tab', 'fixtures');
  const ladderBtn = button('Ladder', () => render('ladder'));
  ladderBtn.setAttribute('data-tab', 'ladder');
  const closeBtn = button('Close', () => closeScreen(), { class: 'nrl-league-close' });

  tabBar.append(fixturesBtn, ladderBtn, closeBtn);
  content.append(tabBar, body);
  render(initialTab);

  return openModal(content, { class: 'nrl-league-modal', screen: true });
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

function buildFixturesTab(state: GameState): HTMLElement {
  const names = clubNameMap(state.league.clubs);
  const wrap = el('div', { class: 'nrl-fixtures' });

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

  const headCells = ['#', 'Club', 'P', 'W', 'D', 'L', 'PF', 'PA', 'Diff', 'Pts'];
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
    for (const c of cells) tr.append(el('td', { text: c }));
    tbody.append(tr);
  }
  table.append(thead, tbody);

  const playerPos = ladderPosition(state, PLAYER_ID);
  if (playerPos > 0) {
    wrap.append(el('p', { class: 'nrl-ladder-pos', text: `Your position: ${playerPos} of ${rows.length}` }));
  }
  wrap.append(table);
  return wrap;
}
