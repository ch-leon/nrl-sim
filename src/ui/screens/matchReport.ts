// src/ui/screens/matchReport.ts — full time and the match report (N9.5; Broadcast
// Quiet 3s and 3t, docs/specs/ui-broadcast-quiet.md). Built from the MatchResult
// (the live sim's events as recorded), so it agrees with the overlay's tallies.
//
// At full time in the match (3s) a card over the dimmed pitch: the result, the
// score, what the match did to the club (ladder, gate, injuries), the Player of
// the Match, and REPORT / BACK TO CLUB. Back to Club is its one exit (#351 P2):
// no ✕, so the card stays until the club is back. REPORT opens the report (3t), a
// full sheet over the pitch: both sides with their tries, minutes and goals, a
// summary in the ticker's voice (N15.2, match/view/commentary.ts), the plan
// changes folded into one line (#351 P0), and the stats column. A match finished
// with no match screen up (the soak) opens the report on its own.
import { bus } from '../../core/events';
import { getState, setState } from '../../core/state';
import type { MatchEvent, MatchResult, TeamSheet } from '../../sim/events';
import { SEASON_ROUNDS } from '../../config';
import { PLAYER_ID, ladderPosition } from '../../systems/fixtures';
import { gateReceipts } from '../../systems/economy';
import { roundLabel } from '../../systems/matchday';
import { playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { lossReasons, type LossReason, type ReasonScreen } from '../../systems/lossReasons';
import { el, button, mount, openModal, closeModal, getRoot } from '../dom';
import { fmtMoney, ordinal } from '../hud';
import { MATCH_ACTIVE_CLASS, injectOverlayStyles, matchColours, statTable, teamCodes } from './matchOverlay';
import { fmtPotmShort } from './potm';
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
  /** "Round 3", "Grand Final": the full-time card's head. */
  round: string;
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
  potm: { line: string; who: string; name: string; teamId: string; short: string } | null;
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
  const potmShort = potm ? (potm.teamId === home.id ? home.short : potm.teamId === away.id ? away.short : names[potm.teamId] ?? potm.teamId) : '';
  return {
    title: `${roundLabel(fixture.round)} · Full time`,
    round: roundLabel(fixture.round),
    headline: resultHeadline(home, away),
    home,
    away,
    note,
    summary: summaryLines(result, { id: home.id, name: home.name }, { id: away.id, name: away.name }),
    changes: planChangeLines(result.planChanges, { home: home.short, away: away.short }),
    rows,
    potm: potm ? { line: fmtPotmShort(potm), who: `${potm.name} (${names[potm.teamId] ?? potm.teamId})`, name: potm.name, teamId: potm.teamId, short: potmShort } : null,
    reasons: [...reasons],
  };
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

/** Two letters for the Player of the Match badge: "Brayden Naden" → BN. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]![0] ?? '';
  const last = words.length > 1 ? words[words.length - 1]![0] ?? '' : words[0]![1] ?? '';
  return `${first}${last}`.toUpperCase();
}

/** An injury chip on the full-time card: "Webb injured 2 wk". */
export function injuryChip(name: string, weeks: number): string {
  return `${shortName(name)} injured ${weeks} wk`;
}

/** The ladder chip: from and to ("5th", "4th"), or the place it held. */
export function ladderMove(before: number, after: number): { from: string; to: string } | { held: string } {
  return before === after ? { held: ordinal(after) } : { from: ordinal(before), to: ordinal(after) };
}

// ── Full time (3s) ─────────────────────────────────────────────────────────────

/** How Back to Club leaves the match (MatchScene sets it; nothing in the soak). */
let fullTimeExit: (() => void) | null = null;

/** The match scene's way back to the club, for the full-time card and the report. Null when it goes. */
export function setFullTimeExit(fn: (() => void) | null): void {
  fullTimeExit = fn;
}

function backToClub(): void {
  if (fullTimeExit) {
    fullTimeExit();
    return;
  }
  // No match scene (defensive): put the cards away.
  closeModal();
  document.querySelector('.nrl-mo-ft')?.remove();
}

/** The line "Why did I lose?" folds under (#368). */
export const WHY_LOST_TEXT = 'Why did I lose?';

/**
 * Go back to the club (the match's own Back to Club), then run `then` once the
 * club is on screen (#368). Away from a match it closes the report and runs at once.
 */
export function backToClubThen(then: () => void): void {
  const body = typeof document === 'undefined' ? null : document.body;
  if (!body || !body.classList.contains(MATCH_ACTIVE_CLASS) || !fullTimeExit || typeof MutationObserver === 'undefined') {
    closeModal();
    then();
    return;
  }
  const watch = new MutationObserver(() => {
    if (body.classList.contains(MATCH_ACTIVE_CLASS)) return;
    watch.disconnect();
    then();
  });
  watch.observe(body, { attributes: true, attributeFilter: ['class'] });
  backToClub();
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

/** The result tag (WIN BY 6 green; a loss or a draw neutral: losing is not an error). */
function resultTag(h: NonNullable<MatchReport['headline']>): HTMLElement {
  return el('span', { class: 'nrl-rp-tag', text: h.text, attrs: { 'data-kind': h.kind } });
}

function chip(...parts: (string | Node)[]): HTMLElement {
  return el('span', { class: 'nrl-ft-chip' }, ...parts);
}

/** Remove `node` once the match view goes (Back to Club), and run `also` then. */
function closeWithMatch(node: HTMLElement, also?: () => void): void {
  const body = typeof document === 'undefined' ? null : document.body;
  if (!body?.classList.contains(MATCH_ACTIVE_CLASS) || typeof MutationObserver === 'undefined') return;
  const watch = new MutationObserver(() => {
    if (!node.isConnected) {
      watch.disconnect();
      also?.();
      return;
    }
    if (!body.classList.contains(MATCH_ACTIVE_CLASS)) {
      watch.disconnect();
      also?.();
      if (node.classList.contains('nrl-modal-backdrop')) closeModal();
      node.remove();
    }
  });
  watch.observe(body, { attributes: true, attributeFilter: ['class'] });
}

/**
 * The full-time card (3s) over the dimmed pitch. The ladder chip comes once the
 * week has finished (the rest of the round is played after the whistle); the gate
 * is this home week's, as the books took it.
 */
export function showFullTime(r: MatchReport, result: MatchResult, fixture: { round: number; homeId: string; awayId: string }, opts: ReportOpts = {}): HTMLElement {
  injectOverlayStyles();
  ensureReportStyles();
  document.querySelector('.nrl-mo-ft')?.remove();
  const mine = r.home.id === PLAYER_ID ? r.home : r.away.id === PLAYER_ID ? r.away : null;
  const theirs = mine === r.home ? r.away : r.home;
  const head = el('div', { class: 'nrl-ft-head' }, el('span', { class: 'nrl-ft-title', text: `Full time · ${r.round}` }), ...(r.headline ? [resultTag(r.headline)] : []));
  const score = mine
    ? el('div', { class: 'nrl-ft-score' }, el('span', { class: 'nrl-ft-pts', text: `${mine.score}–${theirs.score}` }), el('span', { class: 'nrl-ft-vs', text: `v ${theirs.name}` }))
    : el('div', { class: 'nrl-ft-score' }, el('span', { class: 'nrl-ft-pts', text: `${r.home.score}–${r.away.score}` }), el('span', { class: 'nrl-ft-vs', text: `${r.home.name} v ${r.away.name}` }));

  // What the match did to the club: only what can be said for sure.
  const chips = el('div', { class: 'nrl-ft-chips' });
  if (r.note) chips.append(chip(r.note));
  if (mine && fixture.homeId === PLAYER_ID) {
    let gate = 0;
    try {
      gate = gateReceipts(getState());
    } catch {
      gate = 0; // no game loaded
    }
    if (gate > 0) chips.append(chip('Gate ', el('b', { text: `+${fmtMoney(gate)}` })));
  }
  const hurt = mine ? result.injuries.filter((i) => i.teamId === mine.id) : [];
  for (const i of hurt.slice(0, 2)) chips.append(el('span', { class: 'nrl-ft-chip nrl-ft-chip-neg', text: injuryChip(i.playerName, i.weeks) }));
  if (hurt.length > 2) chips.append(el('span', { class: 'nrl-ft-chip nrl-ft-chip-neg', text: `+${hurt.length - 2} more injured` }));
  chips.hidden = chips.childElementCount === 0;

  // The ladder after the round: it moves once the week has finished.
  let offWeek: (() => void) | null = null;
  if (mine && fixture.round <= SEASON_ROUNDS) {
    let before = 0;
    try {
      before = ladderPosition(getState(), PLAYER_ID);
    } catch {
      before = 0;
    }
    if (before > 0) {
      offWeek = bus.on('week:advanced', () => {
        offWeek?.();
        offWeek = null;
        const after = ladderPosition(getState(), PLAYER_ID);
        if (after <= 0) return;
        const m = ladderMove(before, after);
        chips.prepend('held' in m ? chip(`Ladder: still ${m.held}`) : chip(`Ladder ${m.from} → `, el('b', { text: m.to })));
        chips.hidden = false;
      });
    }
  }

  const potm = r.potm
    ? el('div', { class: 'nrl-ft-potm' },
      el('span', { class: 'nrl-ft-badge', text: initials(r.potm.name), attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'nrl-ft-potm-text' },
        el('span', { class: 'nrl-ft-potm-label', text: 'Player of the match' }),
        el('span', { class: 'nrl-ft-potm-line', text: `${r.potm.name}${r.potm.teamId === PLAYER_ID ? '' : ` (${r.potm.short})`} · ${r.potm.line}` })))
    : null;

  const report = button('Report', () => {
    wrap.hidden = true;
    const box = openMatchReport(r, opts);
    // The report closes (its dimmed edge) back onto this card.
    const watch = new MutationObserver(() => {
      if (box.isConnected) return;
      watch.disconnect();
      wrap.hidden = false;
    });
    watch.observe(getRoot(), { childList: true });
  });
  report.setAttribute('data-report', '');
  const back = button('Back to Club ▸', backToClub, { class: 'nrl-btn-primary' });
  back.setAttribute('data-back-to-club', '');
  const card = el('div', { class: 'nrl-ft-card nrl-potm-modal' }, head, score, chips, ...(potm ? [potm] : []), el('div', { class: 'nrl-ft-actions' }, report, back));
  const wrap = el('div', { class: 'nrl-mo-ft', attrs: { role: 'dialog', 'aria-label': `Full time, ${r.round}` } }, card);
  mount(wrap);
  closeWithMatch(wrap, () => offWeek?.());
  return wrap;
}

// ── The report (3t) ────────────────────────────────────────────────────────────

function sideBlock(s: ReportSide, colour: string, lead: boolean): HTMLElement[] {
  const stripe = el('i', { class: 'nrl-rp-stripe' });
  stripe.style.background = colour;
  const scoring: string[] = [];
  if (s.tries.length) scoring.push(`Tries: ${s.tries.join(' · ')}`);
  if (s.goals.taken) scoring.push(`Goals ${s.goals.made}/${s.goals.taken}`);
  if (s.fieldGoals) scoring.push(`Field goals ${s.fieldGoals}`);
  if (!scoring.length) scoring.push('No score');
  const lines = [scoring.join(' · ')];
  if (s.sinBins.length) lines.push(`Sin bin: ${s.sinBins.join(', ')}`);
  if (s.injuries.length) lines.push(`Injured: ${s.injuries.join(', ')}`);
  return [
    el('div', { class: lead ? 'nrl-rp-team nrl-rp-lead' : 'nrl-rp-team' }, stripe, el('span', { class: 'nrl-rp-name', text: s.name }), el('span', { class: 'nrl-rp-pts', text: String(s.score) })),
    ...lines.map((t, i) => el('p', { class: i === 0 ? 'nrl-rp-detail' : 'nrl-rp-detail nrl-rp-detail-more', text: t })),
  ];
}

/** What the report's "Why did I lose?" buttons open, once the club is back (#368). */
export interface ReportOpts {
  onReason?: (screen: ReasonScreen) => void;
}

export function openMatchReport(r: MatchReport, opts: ReportOpts = {}): HTMLElement {
  injectOverlayStyles();
  ensureReportStyles();
  const colours = matchColours(r.home.id, r.away.id);
  const codes = teamCodes(r.home.name, r.away.name);
  const scroll = el(
    'div',
    { class: 'nrl-rp-scroll' },
    el('div', { class: 'nrl-rp-head' }, ...(r.headline ? [resultTag(r.headline)] : []), el('span', { class: 'nrl-rp-title', text: r.title })),
    ...sideBlock(r.home, colours.home, r.home.score >= r.away.score),
    ...sideBlock(r.away, colours.away, r.away.score >= r.home.score),
    ...(r.note ? [el('p', { class: 'nrl-report-note', text: r.note })] : []),
    ...(r.summary.length ? [el('p', { class: 'nrl-report-summary', text: r.summary.join(' ') })] : []),
    // #351 P0: the plan changes fold into one line, so they never push the scorers down.
    ...(r.changes.length ? [el('details', { class: 'nrl-report-changes' },
      el('summary', { text: planChangesSummary(r.changes.length) }),
      ...r.changes.map((t) => el('p', { class: 'nrl-report-change', text: t })))] : []),
    // #368: on a loss, "Why did I lose?" folds under them, so the scorers stay above the fold.
    ...(r.reasons.length ? [whyLost(r.reasons, opts.onReason)] : []),
    ...(r.potm ? [el('p', { class: 'nrl-report-potm' }, el('span', { class: 'nrl-rp-potm-label', text: 'Player of the match ' }), `${r.potm.who} · ${r.potm.line}`)] : []),
  );
  const back = button('Back to Club ▸', backToClub, { class: 'nrl-btn-primary nrl-rp-back' });
  back.setAttribute('data-back-to-club', '');
  const content = el(
    'div',
    { class: 'nrl-report' },
    el('div', { class: 'nrl-rp-left' }, scroll, back),
    el('div', { class: 'nrl-rp-stats' }, statTable(r.rows, codes, colours)),
  );
  const backdrop = openModal(content, { class: 'nrl-report-modal', region: true });
  backdrop.classList.add('nrl-report-backdrop');
  // The summary drops its last line while the column would scroll with it (a phone held sideways): first lines first.
  const summary = content.querySelector('.nrl-report-summary');
  if (summary) {
    for (let n = r.summary.length; n > 0 && scroll.scrollHeight > scroll.clientHeight + 1; n--) {
      if (n === 1) summary.remove();
      else summary.textContent = r.summary.slice(0, n - 1).join(' ');
    }
  }
  closeWithMatch(backdrop);
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
 * Every full time: the Player of the Match counted for the season review (#190),
 * then the full-time card over the match, or the report when no match is on
 * screen (the soak). Returns unsubscribe. Subscribed at boot, so it runs before
 * the week takes the result (matchday.ts) and the ladder moves.
 */
export function initMatchReport(opts: ReportOpts = {}): () => void {
  // The sheets from kick-off feed "Why did I lose?" (#368).
  let kickOff: { fixture: { round: number; homeId: string }; home: TeamSheet; away: TeamSheet } | null = null;
  const offStarted = bus.on('match:started', ({ fixture, home, away }) => { kickOff = { fixture, home, away }; });
  const offFinished = bus.on('match:finished', ({ fixture, result }: { fixture: { round: number; homeId: string; awayId: string }; result: MatchResult }) => {
    const p = playerOfTheMatch(result, fixture.homeId, fixture.awayId);
    const s = getState();
    if (p && p.teamId === PLAYER_ID) setState({ potmTally: addPotm(s.potmTally, s.season, p.name) });
    const sheets = kickOff && kickOff.fixture.round === fixture.round && kickOff.fixture.homeId === fixture.homeId ? kickOff : null;
    const reasons = sheets ? lossReasons(result, fixture, sheets, getState()) : [];
    const report = buildMatchReport(result, fixture, clubNames(), p, reasons);
    if (typeof document !== 'undefined' && document.body?.classList.contains(MATCH_ACTIVE_CLASS)) showFullTime(report, result, fixture, opts);
    else openMatchReport(report, opts);
  });
  return () => {
    offStarted();
    offFinished();
  };
}

const REPORT_STYLE_ID = 'nrl-report-styles';

function ensureReportStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(REPORT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = REPORT_STYLE_ID;
  style.textContent = REPORT_CSS;
  document.head.appendChild(style);
}

// Broadcast Quiet 3s / 3t: the full-time card centred on the dimmed pitch; the
// report a full sheet (inset 12) with the stats column on the right.
export const REPORT_CSS = `
.nrl-mo-ft {
  position: fixed; inset: 0; z-index: 62; display: flex; align-items: center; justify-content: center; pointer-events: auto;
  padding: calc(12px + var(--nrl-safe-t)) calc(12px + var(--nrl-safe-r)) calc(12px + var(--nrl-safe-b)) calc(12px + var(--nrl-safe-l));
  background: rgba(5, 9, 22, 0.55); box-sizing: border-box;
}
.nrl-mo-ft[hidden] { display: none; }
.nrl-ft-card {
  width: min(540px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;
  padding: 20px 24px; border-radius: 18px; background: var(--nrl-navy); color: var(--nrl-text); box-shadow: var(--nrl-shadow-modal);
  font-family: var(--nrl-f-body); animation: nrl-mo-up 180ms ease-out;
}
.nrl-ft-head, .nrl-rp-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.nrl-ft-title { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-rp-tag {
  padding: 2px 10px; border-radius: 6px; font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  background: var(--nrl-line); color: var(--nrl-text-2);
}
.nrl-rp-tag[data-kind="win"] { background: var(--nrl-win); color: #fff; }
.nrl-ft-score { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.nrl-ft-pts { font-family: var(--nrl-f-num); font-size: 2.625rem; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.nrl-ft-vs { font-family: var(--nrl-f-label); font-size: 1.375rem; font-weight: 600; color: var(--nrl-text-2); }
.nrl-ft-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.nrl-ft-chips[hidden] { display: none; }
.nrl-ft-chip { padding: 6px 10px; border-radius: 8px; background: var(--nrl-raised); font-size: 0.8125rem; }
.nrl-ft-chip b { font-family: var(--nrl-f-num); font-weight: 600; }
.nrl-ft-chip-neg { color: var(--nrl-neg); }
.nrl-ft-potm { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--nrl-line); border-bottom: 1px solid var(--nrl-line); }
.nrl-ft-badge {
  flex: 0 0 44px; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  background: var(--nrl-accent); color: var(--nrl-on-accent); font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 700;
}
.nrl-ft-potm-text { display: flex; flex-direction: column; min-width: 0; }
.nrl-ft-potm-label { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-ft-potm-line { font-size: 0.9375rem; font-weight: 600; }
.nrl-ft-actions { display: flex; justify-content: flex-end; gap: 8px; }
.nrl-ft-actions .nrl-btn { height: 48px; font-size: 1.125rem; padding: 0 16px; }
.nrl-ft-actions .nrl-btn-primary { padding: 0 22px; font-size: 1.1875rem; }
@media (max-height: 400px) {
  .nrl-ft-card { gap: 10px; padding: 16px 20px; }
  .nrl-ft-pts { font-size: 2.375rem; }
}
/* The report (3t): a full sheet over the dimmed pitch, the stats column on the right. */
.nrl-modal-backdrop.nrl-report-backdrop {
  top: 0; bottom: 0; background: rgba(5, 9, 22, 0.55);
  padding: calc(12px + var(--nrl-safe-t)) calc(12px + var(--nrl-safe-r)) calc(12px + var(--nrl-safe-b)) calc(12px + var(--nrl-safe-l));
}
.nrl-report-backdrop .nrl-modal.nrl-report-modal {
  width: 100%; height: 100%; max-width: 1000px; max-height: 560px; padding: 12px 16px; border-radius: 16px; background: var(--nrl-navy);
}
.nrl-report { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 340px; grid-template-rows: minmax(0, 1fr); gap: 20px; }
.nrl-rp-left { display: flex; flex-direction: column; gap: 10px; min-height: 0; min-width: 0; }
.nrl-rp-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; }
.nrl-rp-title { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-rp-team { display: flex; align-items: center; gap: 10px; color: var(--nrl-text-2); }
.nrl-rp-stripe { flex: 0 0 6px; width: 6px; height: 30px; }
.nrl-rp-name { flex: 1 1 auto; min-width: 0; font-family: var(--nrl-f-label); font-size: 1.5rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-rp-pts { font-family: var(--nrl-f-num); font-size: 1.75rem; font-weight: 500; font-variant-numeric: tabular-nums; }
.nrl-rp-lead { color: var(--nrl-text); }
.nrl-rp-lead .nrl-rp-name { font-weight: 700; }
.nrl-rp-lead .nrl-rp-pts { font-weight: 600; }
.nrl-rp-detail { margin: 0; padding-left: 16px; font-size: 0.75rem; line-height: 1.4; color: var(--nrl-text-2); }
.nrl-rp-detail-more { margin-top: -6px; }
.nrl-report-note { margin: 0; font-size: 0.8125rem; color: var(--nrl-accent); }
.nrl-report-summary { margin: 0; font-size: 0.8125rem; font-style: italic; line-height: 1.45; color: var(--nrl-text-2); }
.nrl-report-changes { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-report-changes summary { cursor: pointer; list-style: none; min-height: 28px; display: flex; align-items: center; }
.nrl-report-changes summary::-webkit-details-marker { display: none; }
.nrl-report-changes summary::before { content: '▸'; margin-right: 6px; }
.nrl-report-changes[open] summary::before { content: '▾'; }
.nrl-report-why summary { color: var(--nrl-accent); font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.nrl-report-why-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-top: 1px solid var(--nrl-button); font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-report-why-row > span { flex: 1 1 auto; min-width: 0; line-height: 1.35; }
.nrl-btn.nrl-report-why-go { flex: 0 0 auto; min-height: 36px; padding: 0 10px; font-size: 0.875rem; border-radius: 8px; }
@media (pointer: coarse) { .nrl-btn.nrl-report-why-go { min-height: 44px; } }
.nrl-report-change { margin: 2px 0 0 14px; }
.nrl-report-potm { margin: 0; font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-rp-potm-label { font-family: var(--nrl-f-label); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-btn.nrl-rp-back { flex: 0 0 auto; width: 100%; height: 48px; font-size: 1.1875rem; }
.nrl-rp-stats { min-height: 0; overflow-y: auto; }
@media (max-width: 720px) { .nrl-report { grid-template-columns: minmax(0, 1fr) 280px; gap: 14px; } }
@media (max-width: 560px) { .nrl-report { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; overflow-y: auto; } }
`;
