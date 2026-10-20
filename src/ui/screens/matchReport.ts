// src/ui/screens/matchReport.ts — the match report at full time (N9.5): the
// score, who scored and when, the goals, and the match's numbers side by side,
// with the Player of the Match. Built from the MatchResult (the live sim's
// events as recorded), so it agrees with the overlay's tallies. A card, not a
// wall (#203): it sits above Back to Club and lets taps beside it through.
import { bus } from '../../core/events';
import { getState, setState } from '../../core/state';
import type { MatchEvent, MatchResult } from '../../sim/events';
import { SEASON_ROUNDS } from '../../config';
import { PLAYER_ID } from '../../systems/fixtures';
import { roundLabel } from '../../systems/matchday';
import { playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { el, button, openModal, closeModal } from '../dom';
import { MATCH_ACTIVE_CLASS } from './matchOverlay';
import { fmtPotmLine } from './potm';
import { addPotm } from './seasonReview';

export interface ReportSide {
  id: string;
  name: string;
  score: number;
  /** "Name 4', 11' (5)" per try scorer, in order of his first; a bonus-zone try is marked. */
  tries: string[];
  /** Conversions and penalty goals kicked / taken. */
  goals: { made: number; taken: number };
  fieldGoals: number;
  sinBins: string[];
}

export interface ReportRow {
  label: string;
  home: string;
  away: string;
}

export interface MatchReport {
  title: string;
  home: ReportSide;
  away: ReportSide;
  /** "Won in golden point", "Drawn — through on seeding", or empty. */
  note: string;
  rows: ReportRow[];
  potm: { line: string; who: string } | null;
}

const minute = (e: MatchEvent): string => `${Math.max(1, Math.ceil(e.t))}'`;

/** "Name 4', 11'" for each player, in order of his first event. */
function byPlayer(events: readonly MatchEvent[], mark: (e: MatchEvent) => string): string[] {
  const out = new Map<string, string[]>();
  for (const e of events) {
    const who = e.player ?? '—';
    out.set(who, [...(out.get(who) ?? []), mark(e)]);
  }
  return [...out].map(([who, marks]) => `${who} ${marks.join(', ')}`);
}

function side(result: MatchResult, id: string, name: string, score: number): ReportSide {
  const mine = result.events.filter((e) => e.teamId === id);
  const goals = mine.filter((e) => e.kind === 'conversion' || e.kind === 'penalty-goal');
  return {
    id,
    name,
    score,
    tries: byPlayer(mine.filter((e) => e.kind === 'try'), (e) => `${minute(e)}${e.detail === 'bonus' ? ' (5)' : ''}`),
    goals: { made: goals.filter((e) => e.detail === 'good').length, taken: goals.length },
    fieldGoals: mine.filter((e) => e.kind === 'field-goal' && e.detail === 'good').length,
    sinBins: byPlayer(mine.filter((e) => e.kind === 'sin-bin'), minute),
  };
}

/** The report for a finished match. `names` maps club ids to display names. */
export function buildMatchReport(
  result: MatchResult,
  fixture: { round: number; homeId: string; awayId: string },
  names: Record<string, string>,
  potm: PlayerOfMatch | null,
): MatchReport {
  const home = side(result, fixture.homeId, names[fixture.homeId] ?? fixture.homeId, result.homeScore);
  const away = side(result, fixture.awayId, names[fixture.awayId] ?? fixture.awayId, result.awayScore);
  const count = (kind: MatchEvent['kind'], id: string): number => result.events.filter((e) => e.kind === kind && e.teamId === id).length;
  const pair = (label: string, h: number | string, a: number | string): ReportRow => ({ label, home: String(h), away: String(a) });
  const s = result.stats;
  const rows = [
    pair('Possession', `${s.possession[0]}%`, `${s.possession[1]}%`),
    pair('Tackles', s.tackles[0], s.tackles[1]),
    pair('Line breaks', count('break', home.id), count('break', away.id)),
    pair('Errors', s.errors[0], s.errors[1]),
    pair('Kicks', count('kick', home.id), count('kick', away.id)),
    pair('Big hits', count('big-hit', home.id), count('big-hit', away.id)),
  ];
  const golden = result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const final = fixture.round > SEASON_ROUNDS;
  const note = golden ? 'Won in golden point' : result.homeScore === result.awayScore ? (final ? `Drawn — ${home.name} through on seeding` : 'Drawn') : '';
  return {
    title: `${roundLabel(fixture.round)} · Full time`,
    home,
    away,
    note,
    rows,
    potm: potm ? { line: fmtPotmLine(potm), who: `${potm.name} (${names[potm.teamId] ?? potm.teamId})` } : null,
  };
}

function sideBlock(s: ReportSide): HTMLElement {
  const lines: string[] = [];
  if (s.tries.length) lines.push(`Tries: ${s.tries.join(', ')}`);
  if (s.goals.taken) lines.push(`Goals: ${s.goals.made}/${s.goals.taken}`);
  if (s.fieldGoals) lines.push(`Field goals: ${s.fieldGoals}`);
  if (s.sinBins.length) lines.push(`Sin bin: ${s.sinBins.join(', ')}`);
  if (!lines.length) lines.push('No score');
  return el('div', { class: 'nrl-report-side' }, el('h3', { text: `${s.name} ${s.score}` }), ...lines.map((t) => el('p', { text: t })));
}

export function openMatchReport(r: MatchReport): HTMLElement {
  const table = el('table', { class: 'nrl-report-stats' });
  table.append(el('tr', {}, el('th', { text: '' }), el('th', { text: r.home.name }), el('th', { text: r.away.name })));
  for (const row of r.rows) table.append(el('tr', {}, el('td', { text: row.label }), el('td', { text: row.home }), el('td', { text: row.away })));
  const content = el(
    'div',
    { class: 'nrl-report' },
    el('h2', { text: r.title }),
    el('p', { class: 'nrl-report-score', text: `${r.home.name} ${r.home.score} – ${r.away.score} ${r.away.name}` }),
    ...(r.note ? [el('p', { class: 'nrl-report-note', text: r.note })] : []),
    el('div', { class: 'nrl-report-body' }, el('div', { class: 'nrl-report-scoring' }, sideBlock(r.home), sideBlock(r.away)), table),
    ...(r.potm ? [el('p', { class: 'nrl-report-potm', text: `Player of the Match: ${r.potm.who} — ${r.potm.line}` })] : []),
    button('Close', () => closeModal()),
  );
  const backdrop = openModal(content, { class: 'nrl-potm-modal nrl-report-modal', region: true });
  // #203: the card must not swallow the first tap on Back to Club; it closes with the match view.
  backdrop.classList.add('nrl-potm-backdrop', 'nrl-report-backdrop');
  const body = typeof document === 'undefined' ? null : document.body;
  if (body?.classList.contains(MATCH_ACTIVE_CLASS) && typeof MutationObserver !== 'undefined') {
    const watch = new MutationObserver(() => {
      if (!backdrop.isConnected) { watch.disconnect(); return; }
      if (!body.classList.contains(MATCH_ACTIVE_CLASS)) { watch.disconnect(); closeModal(); }
    });
    watch.observe(body, { attributes: true, attributeFilter: ['class'] });
  }
  return backdrop;
}

/** Club ids → names for a report: the player's club and the league's rivals. */
export function clubNames(): Record<string, string> {
  const s = getState();
  const out: Record<string, string> = { [PLAYER_ID]: s.clubName };
  for (const c of s.league.clubs) if (c.id !== PLAYER_ID) out[c.id] = c.name;
  return out;
}

/** The report on every full time (with the Player of the Match, counted for the season review, #190). Returns unsubscribe. */
export function initMatchReport(): () => void {
  return bus.on('match:finished', ({ fixture, result }: { fixture: { round: number; homeId: string; awayId: string }; result: MatchResult }) => {
    const p = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
    const s = getState();
    if (p && p.teamId === PLAYER_ID) setState({ potmTally: addPotm(s.potmTally, s.season, p.name) });
    openMatchReport(buildMatchReport(result, fixture, clubNames(), p));
  });
}
