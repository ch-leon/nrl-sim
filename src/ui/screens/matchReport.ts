// src/ui/screens/matchReport.ts — the match report at full time (N9.5): the
// score, who scored and when, the goals, and the match's numbers side by side,
// with the Player of the Match. Built from the MatchResult (the live sim's
// events as recorded), so it agrees with the overlay's tallies. A card, not a
// wall (#203): it sits above Back to Club and lets taps beside it through.
// Under the score, a summary in the ticker's voice (N15.2, match/view/commentary.ts):
// the final whistle, then the story of the tries, as many lines as fit the card.
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
import { shortName, summaryLines } from '../../match/view/commentary';

export { shortName };

export interface ReportSide {
  id: string;
  name: string;
  /** The club's last word ("Larrikins"), for the narrow stats columns. */
  short: string;
  score: number;
  /** "Name 4', 11' (5)" per try scorer, in order of his first; a bonus-zone try is marked. */
  tries: string[];
  /** Conversions and penalty goals kicked / taken. */
  goals: { made: number; taken: number };
  fieldGoals: number;
  sinBins: string[];
  /** "Name (3 weeks)" for each man hurt. */
  injuries: string[];
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
  /** The commentary's summary (N15.2), first lines first: the card shows as many as fit. */
  summary: string[];
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
    short: shortName(name),
    score,
    tries: byPlayer(mine.filter((e) => e.kind === 'try'), (e) => `${minute(e)}${e.detail === 'bonus' ? ' (5)' : ''}`),
    goals: { made: goals.filter((e) => e.detail === 'good').length, taken: goals.length },
    fieldGoals: mine.filter((e) => e.kind === 'field-goal' && e.detail === 'good').length,
    sinBins: byPlayer(mine.filter((e) => e.kind === 'sin-bin'), minute),
    injuries: result.injuries.filter((i) => i.teamId === id).map((i) => `${i.playerName} (${i.weeks} week${i.weeks === 1 ? '' : 's'})`),
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
  // Two clubs with the same last word ("Brisbane Larrikins" v "Launceston Larrikins"): full names.
  if (home.short === away.short) {
    home.short = home.name;
    away.short = away.name;
  }
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
    // Coach calls (#73): made, and how many paid off, when either coach made one.
    ...(result.calls ? [pair('Calls paid off', `${result.calls.paid[0]}/${result.calls.made[0]}`, `${result.calls.paid[1]}/${result.calls.made[1]}`)] : []),
  ];
  const golden = result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const final = fixture.round > SEASON_ROUNDS;
  const note = golden ? 'Won in golden point' : result.homeScore === result.awayScore ? (final ? `Drawn — ${home.name} through on seeding` : 'Drawn') : '';
  return {
    title: `${roundLabel(fixture.round)} · Full time`,
    home,
    away,
    note,
    summary: summaryLines(result, { id: home.id, name: home.name }, { id: away.id, name: away.name }),
    rows,
    potm: potm ? { line: fmtPotmLine(potm), who: `${potm.name} (${names[potm.teamId] ?? potm.teamId})` } : null,
  };
}

function sideBlock(s: ReportSide): HTMLElement {
  const lines: string[] = [];
  if (s.tries.length) lines.push(`Tries: ${s.tries.join(', ')}`);
  if (s.goals.taken) lines.push(`Goals: ${s.goals.made}/${s.goals.taken}`);
  if (s.fieldGoals) lines.push(`Field goals: ${s.fieldGoals}`);
  if (!lines.length) lines.push('No score');
  if (s.sinBins.length) lines.push(`Sin bin: ${s.sinBins.join(', ')}`);
  if (s.injuries.length) lines.push(`Injured: ${s.injuries.join(', ')}`);
  return el('div', { class: 'nrl-report-side' }, el('h3', { text: `${s.short} ${s.score}` }), ...lines.map((t) => el('p', { text: t })));
}

export function openMatchReport(r: MatchReport): HTMLElement {
  const table = el('table', { class: 'nrl-report-stats' });
  table.append(el('tr', {}, el('th', { text: '' }), el('th', { text: r.home.short }), el('th', { text: r.away.short })));
  for (const row of r.rows) table.append(el('tr', {}, el('td', { text: row.label }), el('td', { text: row.home }), el('td', { text: row.away })));
  const content = el(
    'div',
    { class: 'nrl-report' },
    el('h2', { text: r.title }),
    el('p', { class: 'nrl-report-score', text: `${r.home.name} ${r.home.score} – ${r.away.score} ${r.away.name}` }),
    ...(r.note ? [el('p', { class: 'nrl-report-note', text: r.note })] : []),
    ...(r.summary.length ? [el('p', { class: 'nrl-report-summary', text: r.summary.join(' '), attrs: { style: 'font-style: italic' } })] : []),
    el('div', { class: 'nrl-report-body' }, el('div', { class: 'nrl-report-scoring' }, sideBlock(r.home), sideBlock(r.away)), table),
    ...(r.potm ? [el('p', { class: 'nrl-report-potm', text: `Player of the Match: ${r.potm.who} — ${r.potm.line}` })] : []),
    button('Close', () => closeModal()),
  );
  const backdrop = openModal(content, { class: 'nrl-potm-modal nrl-report-modal', region: true });
  // #203: the card must not swallow the first tap on Back to Club; it closes with the match view.
  backdrop.classList.add('nrl-potm-backdrop', 'nrl-report-backdrop');
  // The summary drops its last line while the card would scroll with it (a phone held sideways): first lines first.
  const summary = content.querySelector('.nrl-report-summary');
  const card = backdrop.querySelector('.nrl-modal');
  if (summary && card) {
    for (let n = r.summary.length; n > 0 && card.scrollHeight > card.clientHeight + 1; n--) {
      if (n === 1) summary.remove();
      else summary.textContent = r.summary.slice(0, n - 1).join(' ');
    }
  }
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
