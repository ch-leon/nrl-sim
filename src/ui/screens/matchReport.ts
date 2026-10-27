// src/ui/screens/matchReport.ts — the match report at full time (N9.5): the
// score, who scored and when, the goals, and the match's numbers side by side,
// with the Player of the Match. Built from the MatchResult (the live sim's
// events as recorded), so it agrees with the overlay's tallies. A card, not a
// wall (#203): it sits above Back to Club and lets taps beside it through.
// Back to Club is its one exit (#351 P2): no ✕, so the report stays until the
// club is back and can't be closed with no way to see it again.
// Under the score, a summary in the ticker's voice (N15.2, match/view/commentary.ts):
// the final whistle, then the story of the tries, as many lines as fit the card.
// On a loss, "Why did I lose?" (#368) folds 2–3 reasons under the plan changes,
// each with a button that goes back to the club and opens the screen that fixes it.
import { bus } from '../../core/events';
import { getState, setState } from '../../core/state';
import type { MatchEvent, MatchResult, TeamSheet } from '../../sim/events';
import { SEASON_ROUNDS } from '../../config';
import { PLAYER_ID } from '../../systems/fixtures';
import { roundLabel } from '../../systems/matchday';
import { playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { lossReasons, type LossReason, type ReasonScreen } from '../../systems/lossReasons';
import { el, button, openModal, closeModal } from '../dom';
import { MATCH_ACTIVE_CLASS } from './matchOverlay';
import { fmtPotmLine } from './potm';
import { addPotm } from './seasonReview';
import { shortName, summaryLines } from '../../match/view/commentary';
import { PRESET_LABEL, isAttackPreset, isDefencePreset } from '../../match/league/presets';

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
  /** Your result (#351 P2): "WIN by 12", "LOSS by 4", "DRAW"; null for a match the player is not in. */
  headline: { text: string; kind: 'win' | 'loss' | 'draw' } | null;
  home: ReportSide;
  away: ReportSide;
  /** "Won in golden point", "Drawn — through on seeding", or empty. */
  note: string;
  /** The commentary's summary (N15.2), first lines first: the card shows as many as fit. */
  summary: string[];
  /** Plan changes the restart actually played (N14.1): "Half-time: Larrikins went Expansive · Rush." */
  changes: string[];
  rows: ReportRow[];
  potm: { line: string; who: string } | null;
  /** "Why did I lose?" (#368): on a loss only, most telling first. */
  reasons: LossReason[];
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
  reasons: readonly LossReason[] = [],
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
    headline: resultHeadline(home, away),
    home,
    away,
    note,
    summary: summaryLines(result, { id: home.id, name: home.name }, { id: away.id, name: away.name }),
    changes: planChangeLines(result.planChanges, { home: home.short, away: away.short }),
    rows,
    potm: potm ? { line: fmtPotmLine(potm), who: `${potm.name} (${names[potm.teamId] ?? potm.teamId})` } : null,
    reasons: [...reasons],
  };
}

/** The line "Why did I lose?" folds under (#368). */
export const WHY_LOST_TEXT = 'Why did I lose?';

/**
 * Close the report, go back to the club (the match's own Back to Club), then
 * run `then` once the club is on screen (#368). Away from a match it runs at once.
 */
export function backToClubThen(then: () => void): void {
  closeModal();
  const body = typeof document === 'undefined' ? null : document.body;
  const back = body?.classList.contains(MATCH_ACTIVE_CLASS) ? document.querySelector<HTMLButtonElement>('.nrl-match-back') : null;
  if (!body || !back || typeof MutationObserver === 'undefined') {
    then();
    return;
  }
  const watch = new MutationObserver(() => {
    if (body.classList.contains(MATCH_ACTIVE_CLASS)) return;
    watch.disconnect();
    then();
  });
  watch.observe(body, { attributes: true, attributeFilter: ['class'] });
  back.click();
}

/** The player's result in a word and the margin. */
export function resultHeadline(home: Pick<ReportSide, 'id' | 'score'>, away: Pick<ReportSide, 'id' | 'score'>): MatchReport['headline'] {
  const mine = home.id === PLAYER_ID ? home : away.id === PLAYER_ID ? away : null;
  if (!mine) return null;
  const theirs = mine === home ? away : home;
  const margin = mine.score - theirs.score;
  if (margin === 0) return { text: 'DRAW', kind: 'draw' };
  return margin > 0 ? { text: `WIN by ${margin}`, kind: 'win' } : { text: `LOSS by ${-margin}`, kind: 'loss' };
}

/** The one line the plan changes fold under (#351 P0). */
export function planChangesSummary(n: number): string {
  return `Plan changes (${n})`;
}

/** One line per plan the restart played. The short name, because both sides can switch. */
export function planChangeLines(
  changes: MatchResult['planChanges'],
  names: { home: string; away: string },
): string[] {
  return (changes ?? []).map((p) => {
    const who = p.side === 'home' ? names.home : names.away;
    const attack = isAttackPreset(p.attack) ? PRESET_LABEL[p.attack] : p.attack;
    const defence = isDefencePreset(p.defence) ? PRESET_LABEL[p.defence] : p.defence;
    const when = p.at === 'half-time' ? 'Half-time' : p.at === 'kickoff' ? 'Kick-off' : `Minute ${p.minute}`;
    return `${when}: ${who} went ${attack} · ${defence}.`;
  });
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

/** "Why did I lose?" (#368): each reason with the button that goes back to the club and opens its screen. */
function whyLost(reasons: readonly LossReason[], onReason?: (screen: ReasonScreen) => void): HTMLElement {
  return el('details', { class: 'nrl-report-changes nrl-report-why', attrs: { 'data-why-lost': '' } },
    el('summary', { text: WHY_LOST_TEXT }),
    ...reasons.map((why) => {
      const go = button(why.cta, () => backToClubThen(() => onReason?.(why.screen)), { class: 'nrl-report-why-go' });
      go.setAttribute('data-why-screen', why.screen);
      return el('div', { class: 'nrl-report-why-row' }, el('span', { text: why.text }), go);
    }));
}

export function openMatchReport(r: MatchReport, opts: { onReason?: (screen: ReasonScreen) => void } = {}): HTMLElement {
  const table = el('table', { class: 'nrl-report-stats' });
  table.append(el('tr', {}, el('th', { text: '' }), el('th', { text: r.home.short }), el('th', { text: r.away.short })));
  for (const row of r.rows) table.append(el('tr', {}, el('td', { text: row.label }), el('td', { text: row.home }), el('td', { text: row.away })));
  const changes = r.changes.length ? [el('details', { class: 'nrl-report-changes' },
    el('summary', { text: planChangesSummary(r.changes.length) }),
    ...r.changes.map((t) => el('p', { class: 'nrl-report-change', text: t })))] : [];
  // The result and the Player of the Match head the card (#351): on a phone held
  // sideways they are what shows before any scrolling, beside the ✕.
  const content = el(
    'div',
    { class: 'nrl-report' },
    el('div', { class: 'nrl-report-head' },
      el('h2', {},
        ...(r.headline ? [el('span', { class: `nrl-report-result nrl-report-${r.headline.kind}`, text: r.headline.text }), ' '] : []),
        r.title),
      el('p', { class: 'nrl-report-score', text: `${r.home.name} ${r.home.score} – ${r.away.score} ${r.away.name}` }),
      ...(r.note ? [el('p', { class: 'nrl-report-note', text: r.note })] : []),
      ...(r.potm ? [el('p', { class: 'nrl-report-potm', text: `Player of the Match: ${r.potm.who} — ${r.potm.line}` })] : []),
    ),
    ...(r.summary.length ? [el('p', { class: 'nrl-report-summary', text: r.summary.join(' '), attrs: { style: 'font-style: italic' } })] : []),
    // #351 P0: the plan changes fold into one line, so they never push the scorers down.
    // #368: on a loss "Why did I lose?" folds beside them, so the result and the Player of
    // the Match stay above the fold; a win or a draw keeps the plan changes as they were.
    ...(r.reasons.length ? [el('div', { class: 'nrl-report-folds' }, ...changes, whyLost(r.reasons, opts.onReason))] : changes),
    el('div', { class: 'nrl-report-body' }, el('div', { class: 'nrl-report-scoring' }, sideBlock(r.home), sideBlock(r.away)), table),
  );
  const backdrop = openModal(content, { class: 'nrl-potm-modal nrl-report-modal', region: true });
  // #203: the card must not swallow the first tap on Back to Club; it closes with the match view.
  backdrop.classList.add('nrl-potm-backdrop', 'nrl-report-backdrop');
  // The summary drops its last line while the card would scroll with it (a phone held sideways): first lines first.
  const summary = content.querySelector('.nrl-report-summary');
  const card = backdrop.querySelector('.nrl-modal-scroll');
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

/**
 * The report on every full time (with the Player of the Match, counted for the
 * season review, #190). The sheets from kick-off feed "Why did I lose?" (#368);
 * `onReason` opens a reason's screen once the club is back. Returns unsubscribe.
 */
export function initMatchReport(opts: { onReason?: (screen: ReasonScreen) => void } = {}): () => void {
  let kickOff: { fixture: { round: number; homeId: string }; home: TeamSheet; away: TeamSheet } | null = null;
  const offStarted = bus.on('match:started', ({ fixture, home, away }) => { kickOff = { fixture, home, away }; });
  const offFinished = bus.on('match:finished', ({ fixture, result }: { fixture: { round: number; homeId: string; awayId: string }; result: MatchResult }) => {
    const p = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
    const s = getState();
    if (p && p.teamId === PLAYER_ID) setState({ potmTally: addPotm(s.potmTally, s.season, p.name) });
    const sheets = kickOff && kickOff.fixture.round === fixture.round && kickOff.fixture.homeId === fixture.homeId ? kickOff : null;
    const reasons = sheets ? lossReasons(result, fixture, sheets, getState()) : [];
    openMatchReport(buildMatchReport(result, fixture, clubNames(), p, reasons), opts);
  });
  return () => {
    offStarted();
    offFinished();
  };
}
