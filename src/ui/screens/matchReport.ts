// src/ui/screens/matchReport.ts — full time and the match report (N9.5; SuperCOOKED
// 43 and 44, docs/specs/ui-supercooked.md). Built from the MatchResult (the live
// sim's events as recorded), so it agrees with the overlay's tallies.
//
// At full time in the match (43) a card over the dimmed pitch: the round and the
// result pill, both clubs either side of the score, the summary's first line, what
// the match did to the club (ladder, gate, injuries) as pills, the Player of the
// Match, and REPORT / BACK TO CLUB. Back to Club is its one exit (#351 P2): no ✕,
// so the card stays until the club is back. REPORT opens the report (44), a full
// sheet over the pitch: a card per side with its tries, minutes and goals, the
// summary in the ticker's voice (N15.2, match/view/commentary.ts), the plan
// changes (#351 P0), and "The numbers": five rows, the rest a tap away. A match
// finished with no match screen up (the soak) opens the report on its own.
import { bus } from '../../core/events';
import { getState, type Fixture, type GameState } from '../../core/state';
import type { MatchCashQuote } from '../../data/financeRules';
import { competitionRewardPromiseId } from '../../data/competitionRewards';
import type { MatchEvent, MatchResult, TeamSheet } from '../../sim/events';
import { SEASON_ROUNDS } from '../../config';
import { PLAYER_ID, ladderPosition } from '../../systems/fixtures';
import { gateReceipts } from '../../systems/economy';
import { roundLabel } from '../../systems/matchday';
import { recordMatchAward, playerOfTheMatch, type PlayerOfMatch } from '../../systems/stats';
import { leagueFixtureView, type LeagueFixtureView } from '../../systems/leagueSeasonView';
import { hasStructuralCalendar, sameFixtureIdentity } from '../../systems/competitionCalendar';
import { lossReasons, type LossReason, type ReasonScreen } from '../../systems/lossReasons';
import { el, button, mount, openModal, closeModal, getRoot } from '../dom';
import { fmtMoney, ordinal } from '../hud';
import { MATCH_ACTIVE_CLASS, injectOverlayStyles, matchColours, statTable, teamCodes } from './matchOverlay';
import { fmtPotmShort } from './potm';
import { ensurePartsStyles, infoPill, starsEl } from '../parts';
import { playerStars } from '../../data/player';
import { portraitDataUrl } from '../../art/portrait';
import { kitFromColors } from '../../art/match/kit';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { shortName, summaryLines } from '../../match/view/commentary';
import { PRESET_LABEL, isAttackPreset, isDefencePreset } from '../../match/league/presets';

export { shortName };

/** The mark after a bonus-zone try's minute (#423). */
export const BONUS_TRY_MARK = '(bonus)';

export interface ReportSide {
  id: string;
  name: string;
  /** The club's last word ("Larrikins"), for the narrow stats columns. */
  short: string;
  score: number;
  /** "Name 4', 11' (bonus)" per try scorer, in order of his first; a bonus-zone try (5 points) is marked by what it is, not "(5)", which read as a try count (#423). */
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
  /** Saved stage decides whether this result can move the regular ladder. */
  regularLeagueMatch?: boolean;
  title: string;
  payments?: MatchReportIncome;
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
    tries: byPlayer(mine.filter((e) => e.kind === 'try'), (e) => `${minute(e)}${e.detail === 'bonus' ? ` ${BONUS_TRY_MARK}` : ''}`),
    goals: { made: goals.filter((e) => e.detail === 'good').length, taken: goals.length },
    fieldGoals: mine.filter((e) => e.kind === 'field-goal' && e.detail === 'good').length,
    sinBins: byPlayer(mine.filter((e) => e.kind === 'sin-bin'), minute),
    injuries: result.injuries.filter((i) => i.teamId === id).map((i) => `${i.playerName} (${i.weeks} week${i.weeks === 1 ? '' : 's'})`),
  };
}

interface MatchReportIncome {
  ordinary?: MatchCashQuote;
  cup?: {
    matchBase: number;
    quotedCash: number;
    cash: number;
    reputation: number;
    advertisedReputation: number;
    title?: string;
  };
}

/** Snapshot the club's stored payments for the exact accepted fixture. */
export function readMatchReportIncome(state: GameState, saved: LeagueFixtureView): MatchReportIncome | undefined {
  const { bridge, instance, fixture } = saved;
  if (saved.status !== 'completed' || (bridge.homeId !== state.clubId && bridge.awayId !== state.clubId)) return undefined;
  const receipt = state.matchIncome.find(r => r.season === instance.season && sameFixtureIdentity(r.fixture, bridge))?.receipt;
  const ordinary = bridge.homeId === state.clubId ? receipt?.home : receipt?.away;
  const id = competitionRewardPromiseId(instance.season, instance.id, fixture.id);
  const reward = state.competitionRewards.find(r => r.id === id && r.status === 'settled');
  const extra = reward?.status === 'settled' && reward.resolution.kind === 'result' ? reward : undefined;
  if (!ordinary && !extra) return undefined;
  const mine = extra?.receipts.filter(r => r.clubId === state.clubId) ?? [];
  return {
    ...(ordinary ? { ordinary: { ...ordinary } } : {}),
    ...(extra ? { cup: {
      matchBase: extra.matchBase,
      quotedCash: extra.policies.reduce((sum, p) => sum + (p.cash ?? 0), 0),
      cash: mine.reduce((sum, r) => sum + (r.kind === 'cash' ? r.delta : 0), 0),
      reputation: mine.reduce((sum, r) => sum + (r.kind === 'reputation' ? r.delta : 0), 0),
      advertisedReputation: mine.reduce((sum, r) => sum + (r.kind === 'reputation' ? r.advertisedDelta : 0), 0),
      ...mine.flatMap(r => r.kind === 'honour' ? [{ title: r.title }] : [])[0],
    } } : {}),
  };
}

/** The report for a finished match. `names` maps club ids to display names. */
export function buildMatchReport(
  result: MatchResult,
  fixture: { round: number; homeId: string; awayId: string },
  names: Record<string, string>,
  potm: PlayerOfMatch | null,
  reasons: readonly LossReason[] = [],
  saved?: LeagueFixtureView,
  payments?: MatchReportIncome,
): MatchReport {
  const official = saved?.status === 'completed' ? saved.fixture.result : undefined;
  const home = side(result, fixture.homeId, names[fixture.homeId] ?? fixture.homeId, official?.homeScore ?? result.homeScore);
  const away = side(result, fixture.awayId, names[fixture.awayId] ?? fixture.awayId, official?.awayScore ?? result.awayScore);
  // Two clubs with the same last word ("Brisbane Larrikins" v "Launceston Larrikins"): full names.
  if (home.short === away.short) {
    home.short = home.name;
    away.short = away.name;
  }
  const count = (kind: MatchEvent['kind'], id: string): number => result.events.filter((e) => e.kind === kind && e.teamId === id).length;
  const pair = (label: string, h: number | string, a: number | string): ReportRow => ({ label, home: String(h), away: String(a) });
  const scrambles = (id: string): number => result.events.filter((e) => e.detail === 'scramble' && e.teamId === id).length;
  const s = result.stats;
  const rows = [
    pair('Possession', `${s.possession[0]}%`, `${s.possession[1]}%`),
    pair('Tackles', s.tackles[0], s.tackles[1]),
    pair('Line breaks', count('break', home.id), count('break', away.id)),
    pair('Errors', s.errors[0], s.errors[1]),
    pair('Kicks', count('kick', home.id), count('kick', away.id)),
    pair('Big hits', count('big-hit', home.id), count('big-hit', away.id)),
    // Scrambles won (#99): loose balls both sides went for, when there was one.
    ...(scrambles(home.id) + scrambles(away.id) > 0 ? [pair('Scrambles won', scrambles(home.id), scrambles(away.id))] : []),
    // Coach calls (#73): made, and how many paid off, when either coach made one.
    ...(result.calls ? [pair('Calls paid off', `${result.calls.paid[0]}/${result.calls.made[0]}`, `${result.calls.paid[1]}/${result.calls.made[1]}`)] : []),
  ];
  const golden = result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const final = fixture.round > SEASON_ROUNDS;
  const legacyNote = golden ? 'Won in golden point' : result.homeScore === result.awayScore ? (final ? `Drawn — ${home.name} through on seeding` : 'Drawn') : '';
  const note = saved ? saved.status === 'cancelled' ? 'Cancelled'
    : saved.status !== 'completed' ? 'Result pending'
    : saved.decider && !['score', 'draw'].includes(saved.decider)
      ? `${names[saved.winnerId ?? ''] ?? saved.winnerId} won by ${saved.decider.replace(/-/g, ' ')}`
      : golden ? 'Won in golden point' : home.score === away.score ? 'Drawn' : '' : legacyNote;
  let headline = resultHeadline(home, away);
  if (saved && saved.status !== 'completed') headline = null;
  else if (saved?.winnerId && home.score === away.score && (home.id === PLAYER_ID || away.id === PLAYER_ID)) {
    headline = { text: saved.winnerId === PLAYER_ID ? 'WIN' : 'LOSS', kind: saved.winnerId === PLAYER_ID ? 'win' : 'loss' };
  }
  const label = saved ? `${saved.dateLabel} · ${saved.stageLabel}` : roundLabel(fixture.round);
  const potmShort = potm ? (potm.teamId === home.id ? home.short : potm.teamId === away.id ? away.short : names[potm.teamId] ?? potm.teamId) : '';
  return {
    title: `${label} · Full time`,
    round: label,
    ...(payments ? { payments } : {}),
    ...(saved ? { regularLeagueMatch: saved.stageKind === 'league' && saved.status === 'completed' } : {}),
    headline,
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
  // By code point, letters and digits only (#616): "🦊 Fox" read "�F" when it took UTF-16 units.
  const words = name.trim().split(/\s+/).map((w) => w.match(/\p{L}|\p{N}/gu) ?? []).filter((w) => w.length > 0);
  if (words.length === 0) return '?';
  const first = words[0]![0]!;
  const last = words.length > 1 ? words[words.length - 1]![0]! : words[0]![1] ?? '';
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

/** How long the full-time score takes to count up (#640), ms. */
export const COUNT_UP_MS = 800;

/** The score on screen `progress` (0..1) of the way through the count-up: eased out, whole points, the last frame exact. */
export function countUpValue(target: number, progress: number): number {
  if (!(progress < 1)) return target;
  if (!(progress > 0)) return 0;
  return Math.min(target, Math.round(target * (1 - (1 - progress) ** 3)));
}

/**
 * Three stat rows (#640), the player's side first (home first in a match he is not in). SuperCOOKED 43
 * takes them off the full-time card (the report has them, one tap away); kept for anything that wants the trio.
 */
export function fullTimeStats(r: MatchReport, result: MatchResult): { label: string; first: string; second: string }[] {
  const flip = r.away.id === PLAYER_ID;
  const row = (label: string): { home: string; away: string } => r.rows.find((x) => x.label === label) ?? { home: '–', away: '–' };
  const tries = (id: string): number => result.events.filter((e) => e.kind === 'try' && e.teamId === id).length;
  const pair = (label: string, h: string, a: string): { label: string; first: string; second: string } => (flip ? { label, first: a, second: h } : { label, first: h, second: a });
  return [
    pair('Possession', row('Possession').home, row('Possession').away),
    pair('Line breaks', row('Line breaks').home, row('Line breaks').away),
    pair('Tries', String(tries(r.home.id)), String(tries(r.away.id))),
  ];
}

const reducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Count a score pair up from 0–0 on the card (#640). Reduced motion, or no animation frames (the soak): it is the final score at once. */
function countUpScore(pts: HTMLElement, first: number, second: number): void {
  // Each side's points, and the dash muted between them (SuperCOOKED 43); the text still reads "24–18".
  const a = el('span', { text: String(first) });
  const b = el('span', { text: String(second) });
  pts.replaceChildren(a, el('span', { class: 'nrl-ft-dash', text: '–' }), b);
  if (reducedMotion() || typeof requestAnimationFrame === 'undefined' || (first === 0 && second === 0)) return;
  const show = (p: number): void => {
    a.textContent = String(countUpValue(first, p));
    b.textContent = String(countUpValue(second, p));
  };
  show(0);
  const t0 = performance.now();
  const step = (now: number): void => {
    const p = (now - t0) / COUNT_UP_MS;
    show(p);
    if (p < 1 && pts.isConnected) requestAnimationFrame(step);
    else show(1);
  };
  requestAnimationFrame(step);
}

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

/** The result pill (Win by 6 green; a loss or a draw neutral: losing is not an error). `also` follows it ("· Round 2"). */
function resultTag(h: NonNullable<MatchReport['headline']>, also = ''): HTMLElement {
  return el('span', { class: 'nrl-rp-tag', attrs: { 'data-kind': h.kind } },
    el('span', { class: 'nrl-rp-tag-word', text: h.text }), ...(also ? [el('span', { text: `\u00a0· ${also}` })] : []));
}

/** A pill on the full-time card (43): no dot; its class kept for the checks that look for one. */
function chip(tone: Parameters<typeof infoPill>[0], ...parts: (string | Node)[]): HTMLElement {
  const c = infoPill(tone, ...parts);
  c.classList.add('nrl-ft-chip');
  return c;
}

/** The ladder pill: up green, down amber, held plain. */
export function ladderPill(m: ReturnType<typeof ladderMove>): { tone: 'pos' | 'neg' | 'plain'; text: string; to?: string } {
  if ('held' in m) return { tone: 'plain', text: `Ladder: still ${m.held}` };
  const up = parseInt(m.to, 10) < parseInt(m.from, 10);
  return { tone: up ? 'pos' : 'neg', text: `${up ? '▲' : '▼'} Ladder ${m.from} → `, to: m.to };
}

/**
 * Your Player of the Match from the squad, for his face and stars: only when his name is
 * one of yours and no other's. A rival, or a name two of yours share, keeps the initials.
 */
function potmPlayer(potm: NonNullable<MatchReport['potm']>): { face: string; stars: number } | null {
  if (potm.teamId !== PLAYER_ID) return null;
  try {
    const s = getState();
    const men = s.squad.filter((p) => p.name === potm.name);
    if (men.length !== 1) return null;
    const kit = kitFromColors(s.league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS, PLAYER_ID);
    return { face: portraitDataUrl(men[0]!.id, kit), stars: playerStars(men[0]!) };
  } catch {
    return null; // no game loaded
  }
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
export function showFullTime(r: MatchReport, result: MatchResult, fixture: Fixture, opts: ReportOpts = {}): HTMLElement {
  injectOverlayStyles();
  ensurePartsStyles();
  ensureReportStyles();
  document.querySelector('.nrl-mo-ft')?.remove();
  const mine = r.home.id === PLAYER_ID ? r.home : r.away.id === PLAYER_ID ? r.away : null;
  const theirs = mine === r.home ? r.away : r.home;
  const first = mine ?? r.home;
  const second = mine ? theirs : r.away;
  const head = el('div', { class: 'nrl-ft-head' }, el('span', { class: 'nrl-ft-title', text: `Full time · ${r.round}` }), ...(r.headline ? [resultTag(r.headline)] : []));
  const pts = el('span', { class: 'nrl-ft-pts', attrs: { 'aria-label': `${first.score} to ${second.score}` } });
  countUpScore(pts, first.score, second.score);
  // 43: your club (★) on the left, the score between, theirs on the right.
  const score = el('div', { class: 'nrl-ft-score' },
    el('span', { class: 'nrl-ft-club', text: mine ? `${first.name} ★` : first.name }),
    pts,
    el('span', { class: 'nrl-ft-club nrl-ft-vs', text: second.name }));
  // One line from the summary (the ticker's voice): no new words written for the card.
  const line = r.summary[0] ? el('p', { class: 'nrl-ft-line', text: r.summary[0] }) : null;

  // What the match did to the club: only what can be said for sure.
  const chips = el('div', { class: 'nrl-ft-chips' });
  if (r.note) chips.append(chip('plain', r.note));
  if (mine) {
    let gate = 0;
    let gateLabel = 'Gate';
    try {
      const state = getState();
      if (state.competitions?.leagueCareer) {
        const instance = state.competitions.instances.find(i => i.id === fixture.competitionId);
        const paid = instance && state.matchIncome.find(r => r.season === instance.season && sameFixtureIdentity(r.fixture, fixture));
        const quote = fixture.homeId === state.clubId ? paid?.receipt?.home : paid?.receipt?.away;
        gate = quote?.home ?? 0;
        if (paid?.neutral) gateLabel = 'Shared gate';
      } else if (fixture.homeId === PLAYER_ID) gate = gateReceipts(state);
    } catch {
      gate = 0; // no game loaded
    }
    if (gate > 0) chips.append(chip('plain', `${gateLabel} `, el('b', { text: `+${fmtMoney(gate)}` })));
  }
  const hurt = mine ? result.injuries.filter((i) => i.teamId === mine.id) : [];
  for (const i of hurt.slice(0, 2)) chips.append(chip('neg', injuryChip(i.playerName, i.weeks)));
  if (hurt.length > 2) chips.append(chip('neg', `+${hurt.length - 2} more injured`));
  for (const c of chips.querySelectorAll('[data-tone="neg"]')) c.classList.add('nrl-ft-chip-neg');
  chips.hidden = chips.childElementCount === 0;

  // The ladder after the round: it moves once the week has finished.
  let offWeek: (() => void) | null = null;
  if (mine && (r.regularLeagueMatch ?? (fixture.round > 0 && fixture.round <= SEASON_ROUNDS))) {
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
        const l = ladderPill(ladderMove(before, after));
        chips.prepend(chip(l.tone, l.text, ...(l.to ? [el('b', { text: l.to })] : [])));
        chips.hidden = false;
      });
    }
  }

  let potm: HTMLElement | null = null;
  if (r.potm) {
    const him = potmPlayer(r.potm);
    const face = him?.face
      ? el('img', { class: 'nrl-ft-face', attrs: { src: him.face, alt: '', width: '44', height: '50', 'aria-hidden': 'true' } })
      : el('span', { class: 'nrl-ft-badge', text: initials(r.potm.name), attrs: { 'aria-hidden': 'true' } });
    potm = el('div', { class: 'nrl-ft-potm' },
      face,
      el('span', { class: 'nrl-ft-potm-text' },
        el('span', { class: 'nrl-ft-potm-label', text: 'Player of the match' }),
        el('span', { class: 'nrl-ft-potm-who' },
          el('span', { class: 'nrl-ft-potm-name', text: `${r.potm.name}${r.potm.teamId === PLAYER_ID ? '' : ` (${r.potm.short})`}` }),
          ...(him ? [starsEl(him.stars, { size: 13 })] : [])),
        el('span', { class: 'nrl-ft-potm-line', text: r.potm.line })));
  }

  const report = button('Report', () => {
    wrap.hidden = true;
    const box = openMatchReport(r, opts);
    // It takes this card's place over the same dim: a swap, with no dialog's entrance (#606).
    box.setAttribute('data-swap', '');
    // The report closes (its dimmed edge) back onto this card.
    const watch = new MutationObserver(() => {
      if (box.isConnected) return;
      watch.disconnect();
      wrap.hidden = false;
    });
    watch.observe(getRoot(), { childList: true });
  }, { class: 'nrl-btn-outline' });
  report.setAttribute('data-report', '');
  const back = button('Back to club ▸', backToClub, { class: 'nrl-btn-primary' });
  back.setAttribute('data-back-to-club', '');
  const card = el('div', { class: 'nrl-ft-card nrl-potm-modal' }, head, score, ...(line ? [line] : []), chips, ...(potm ? [potm] : []), el('div', { class: 'nrl-ft-actions' }, report, back));
  const wrap = el('div', { class: 'nrl-mo-ft', attrs: { role: 'dialog', 'aria-label': `Full time, ${r.round}` } }, card);
  mount(wrap);
  closeWithMatch(wrap, () => offWeek?.());
  return wrap;
}

// ── The report (44) ────────────────────────────────────────────────────────────

/** "The numbers" shows these first (SuperCOOKED 44, §7 #4: the five the match records); All stats ▸ the rest. */
export const REPORT_FIRST_STATS: readonly string[] = ['Possession', 'Line breaks', 'Tackles', 'Errors', 'Big hits'];

/** The report's rows in two: the five first, in that order, and the rest in the report's order. Pure. */
export function splitReportRows(rows: readonly ReportRow[]): { first: ReportRow[]; rest: ReportRow[] } {
  const first = REPORT_FIRST_STATS.map((l) => rows.find((r) => r.label === l)).filter((r): r is ReportRow => !!r);
  return { first, rest: rows.filter((r) => !first.includes(r)) };
}

function sideBlock(s: ReportSide, colour: string, lead: boolean, mine: boolean): HTMLElement {
  const stripe = el('i', { class: 'nrl-rp-stripe', attrs: { 'aria-hidden': 'true' } });
  stripe.style.background = colour;
  const scoring: string[] = [];
  if (s.tries.length) scoring.push(`Tries: ${s.tries.join(' · ')}`);
  if (s.goals.taken) scoring.push(`Goals ${s.goals.made}/${s.goals.taken}`);
  if (s.fieldGoals) scoring.push(`Field goals ${s.fieldGoals}`);
  if (!scoring.length) scoring.push('No score');
  const lines = [scoring.join(' · ')];
  if (s.sinBins.length) lines.push(`Sin bin: ${s.sinBins.join(', ')}`);
  if (s.injuries.length) lines.push(`Injured: ${s.injuries.join(', ')}`);
  return el('div', { class: lead ? 'nrl-rp-team nrl-rp-lead' : 'nrl-rp-team' },
    stripe,
    el('span', { class: 'nrl-rp-body' },
      el('span', { class: 'nrl-rp-name', text: mine ? `${s.name} ★` : s.name }),
      ...lines.map((t, i) => el('span', { class: i === 0 ? 'nrl-rp-detail' : 'nrl-rp-detail nrl-rp-detail-more', text: t }))),
    el('span', { class: 'nrl-rp-pts', text: String(s.score) }));
}

/** What the report's "Why did I lose?" buttons open, once the club is back (#368). */
export interface ReportOpts {
  onReason?: (screen: ReasonScreen) => void;
}

function paymentSections({ ordinary, cup }: MatchReportIncome): HTMLElement[] {
  const line = (label: string, value: string) => el('li', {}, el('span', { text: label }),
    el('strong', { class: 'nrl-num', text: value }));
  const section = (title: string, kind: string, ...rows: HTMLElement[]) =>
    el('section', { class: 'nrl-report-payments', attrs: { 'data-match-payment': kind } },
      el('h3', { text: title }), el('ul', {}, ...rows));
  const result: HTMLElement[] = [];
  if (ordinary) result.push(section('Ordinary match income', 'ordinary',
    line('Total received', fmtMoney(ordinary.total)), line('Base payment', fmtMoney(ordinary.base)),
    ...(ordinary.home ? [line('Gate receipts', fmtMoney(ordinary.home))] : []),
    ...(ordinary.performance ? [line('Performance', fmtMoney(ordinary.performance))] : []),
    ...(ordinary.sponsor ? [line('Sponsor', fmtMoney(ordinary.sponsor))] : [])));
  if (cup) result.push(section('Extra Open Cup prize', 'cup',
    line('Cash received', fmtMoney(cup.cash)),
    ...(cup.advertisedReputation ? [line('Reputation gained', `+${cup.reputation}${cup.reputation < cup.advertisedReputation ? ' (limited by reputation cap)' : ''}`)] : []),
    ...(cup.title ? [line('Trophy', cup.title)] : []),
    line('Base payment for this match', fmtMoney(cup.matchBase)),
    line('Win prize offered', fmtMoney(cup.quotedCash))));
  return result;
}

export function openMatchReport(r: MatchReport, opts: ReportOpts = {}): HTMLElement {
  injectOverlayStyles();
  ensureReportStyles();
  const colours = matchColours(r.home.id, r.away.id);
  const codes = teamCodes(r.home.name, r.away.name);
  const changes: HTMLElement[] = r.changes.length === 1
    // 44: one change is one plain line.
    ? [el('p', { class: 'nrl-report-change-one', text: r.changes[0]! })]
    // #351 P0: more fold into one line, so they never push the scorers down.
    : r.changes.length ? [el('details', { class: 'nrl-report-changes' },
      el('summary', { text: planChangesSummary(r.changes.length) }),
      ...r.changes.map((t) => el('p', { class: 'nrl-report-change', text: t })))] : [];
  const scroll = el(
    'div',
    { class: 'nrl-rp-scroll' },
    sideBlock(r.home, colours.home, r.home.score >= r.away.score, r.home.id === PLAYER_ID),
    sideBlock(r.away, colours.away, r.away.score >= r.home.score, r.away.id === PLAYER_ID),
    ...(r.note ? [el('p', { class: 'nrl-report-note', text: r.note })] : []),
    ...(r.payments ? paymentSections(r.payments) : []),
    ...(r.summary.length ? [el('p', { class: 'nrl-report-summary', text: r.summary.join(' ') })] : []),
    ...changes,
    // #368: on a loss, "Why did I lose?" folds under them, so the scorers stay above the fold.
    ...(r.reasons.length ? [whyLost(r.reasons, opts.onReason)] : []),
  );
  const back = button('Back to club ▸', backToClub, { class: 'nrl-btn-primary nrl-rp-back' });
  back.setAttribute('data-back-to-club', '');
  // The numbers (44): five rows, home white and away green, then All stats ▸ shows the rest in place.
  const { first, rest } = splitReportRows(r.rows);
  const bars = { home: 'var(--nrl-text)', away: 'var(--nrl-pos)' };
  const numbers = el('div', { class: 'nrl-rp-stats' },
    el('div', { class: 'nrl-rp-stats-head' },
      el('span', { class: 'nrl-rp-stats-title', text: 'The numbers' }),
      el('span', { class: 'nrl-rp-stats-codes', text: `${codes[0]} · ${codes[1]}` })),
    statTable(first, codes, bars));
  if (rest.length) {
    const all = button('All stats ▸', () => {
      numbers.querySelector('.nrl-mo-stattable')?.replaceWith(statTable([...first, ...rest], codes, bars));
      all.remove();
    }, { class: 'nrl-btn-outline nrl-rp-all' });
    all.setAttribute('data-all-stats', '');
    numbers.append(all);
  }
  const content = el(
    'div',
    { class: 'nrl-report' },
    // Changed match outcomes can add scorer/injury/reason rows (#465). Keep the
    // Player of the Match beside the fixed exit while those details scroll.
    el('div', { class: 'nrl-rp-left' },
      el('div', { class: 'nrl-rp-head' },
        el('span', { class: 'nrl-rp-title', text: 'Match report' }),
        r.headline ? resultTag(r.headline, r.round) : el('span', { class: 'nrl-rp-round', text: r.round })),
      scroll,
      ...(r.potm ? [el('p', { class: 'nrl-report-potm' }, el('span', { class: 'nrl-rp-potm-label', text: 'Player of the match ' }), `${r.potm.who} · ${r.potm.line}`)] : []),
      back),
    numbers,
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
  let kickOff: { fixture: Fixture; home: TeamSheet; away: TeamSheet } | null = null;
  const offStarted = bus.on('match:started', ({ fixture, home, away }) => { kickOff = { fixture, home, away }; });
  const reportFinished = ({ fixture, result }: { fixture: Fixture; result: MatchResult }, structural: boolean): void => {
    const p = structural ? playerOfTheMatch(result, fixture.homeId, fixture.awayId) : recordMatchAward(result, fixture.homeId, fixture.awayId);
    const sheets = kickOff && sameFixtureIdentity(kickOff.fixture, fixture) ? kickOff : null;
    const reasons = sheets ? lossReasons(result, fixture, sheets, getState()) : [];
    // Committed fixtures are no longer returned by the scheduled-match query.
    const state = getState();
    const { competitions } = state;
    const instance = competitions?.leagueCareer ? competitions.instances.find(i => i.id === fixture.competitionId) : undefined;
    const actual = instance?.fixtures.find(f => f.id === fixture.id);
    const saved = instance && actual ? leagueFixtureView(instance, actual) : undefined;
    const accepted = saved && sameFixtureIdentity(saved.bridge, fixture) ? saved : undefined;
    const report = buildMatchReport(result, fixture, clubNames(), p, reasons, accepted,
      accepted ? readMatchReportIncome(state, accepted) : undefined);
    if (typeof document !== 'undefined' && document.body?.classList.contains(MATCH_ACTIVE_CLASS)) showFullTime(report, result, fixture, opts);
    else openMatchReport(report, opts);
  };
  const offFinished = bus.on('match:finished', value => { if (!hasStructuralCalendar(getState())) reportFinished(value, false); });
  const offCommitted = bus.on('match:committed', value => reportFinished(value, true));
  return () => {
    offStarted();
    offFinished();
    offCommitted();
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

// SuperCOOKED 43 / 44: the full-time card centred on the darkened pitch; the report a
// full sheet (inset 12) with "The numbers" on the right. Type to the mockups: Archivo
// for the score and the title, Oswald for names and buttons, JetBrains Mono for labels.
export const REPORT_CSS = `
.nrl-mo-ft {
  position: fixed; inset: 0; z-index: 62; display: flex; align-items: center; justify-content: center; pointer-events: auto;
  padding: calc(12px + var(--nrl-safe-t)) calc(12px + var(--nrl-safe-r)) calc(12px + var(--nrl-safe-b)) calc(12px + var(--nrl-safe-l));
  background: rgba(5, 7, 13, 0.62); box-sizing: border-box;
}
.nrl-mo-ft[hidden] { display: none; }
.nrl-ft-card {
  width: min(560px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px;
  padding: 18px 22px; border-radius: 18px; background: var(--nrl-navy); box-shadow: inset 0 0 0 1px var(--nrl-line), 0 12px 40px rgba(0, 0, 0, 0.45);
  color: var(--nrl-text); font-family: var(--nrl-f-body); animation: nrl-sheet-up var(--nrl-dur-sheet) var(--nrl-ease-out);
}
.nrl-ft-head, .nrl-rp-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.nrl-ft-title { font-family: var(--nrl-f-num); font-size: 0.6875rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--nrl-muted); }
/* The result pill: green for a win; a loss or a draw plain (losing is not an error). Written "Win by 6". */
.nrl-rp-tag {
  --nrl-tone-rgb: 143, 152, 171; display: inline-flex; align-items: center; min-height: 28px; padding: 0 11px; box-sizing: border-box; border-radius: 14px;
  background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); color: var(--nrl-text-2);
  font-family: var(--nrl-f-body); font-size: 0.8125rem; font-weight: 600; white-space: nowrap;
}
.nrl-rp-tag[data-kind="win"] { background: rgba(20, 195, 142, 0.14); box-shadow: inset 0 0 0 1px rgba(20, 195, 142, 0.5); color: var(--nrl-pos); }
.nrl-rp-tag-word { display: inline-block; text-transform: lowercase; }
.nrl-rp-tag-word::first-letter { text-transform: uppercase; }
.nrl-ft-score { display: flex; align-items: center; justify-content: center; gap: 18px; min-width: 0; }
.nrl-ft-club { flex: 0 1 auto; min-width: 0; font-family: var(--nrl-f-label); font-size: 1.25rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-ft-vs { color: var(--nrl-text-2); }
.nrl-ft-pts { flex: 0 0 auto; font-family: var(--nrl-f-display); font-size: 3.375rem; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.nrl-ft-dash { margin: 0 0.25em; color: var(--nrl-star-empty); }
.nrl-ft-line { margin: 0; text-align: center; font-size: 0.9375rem; line-height: 1.35; color: #e6e9ef; }
.nrl-ft-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.nrl-ft-chips[hidden] { display: none; }
.nrl-ft-potm { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); }
.nrl-ft-face { flex: 0 0 44px; width: 44px; height: 50px; border-radius: 8px; background: var(--nrl-raised); image-rendering: pixelated; }
.nrl-ft-badge {
  flex: 0 0 44px; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  background: var(--nrl-accent); color: var(--nrl-on-accent); font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 700;
}
.nrl-ft-potm-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.nrl-ft-potm-label { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-ft-potm-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.nrl-ft-potm-name { min-width: 0; font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-ft-potm-line { font-size: 0.8125rem; color: var(--nrl-text-2); }
/* The Player of the Match comes in a beat after the card, on the motion tokens (#597): reduced motion keeps the fade and drops the travel. */
.nrl-ft-potm { animation: nrl-ft-slide var(--nrl-dur-sheet) var(--nrl-ease-out) calc(var(--nrl-dur-sheet) * 3) backwards; }
@keyframes nrl-ft-slide { from { opacity: 0; transform: translateX(var(--nrl-rise)); } to { opacity: 1; transform: none; } }
/* The actions stay in reach when a short screen makes the card scroll. */
.nrl-ft-actions { display: flex; justify-content: flex-end; gap: 8px; position: sticky; bottom: 0; background: var(--nrl-navy); }
.nrl-ft-actions .nrl-btn { height: 48px; font-size: 0.9375rem; padding: 0 20px; border-radius: 10px; }
.nrl-ft-actions .nrl-btn-primary { padding: 0 22px; font-size: 1.0625rem; }
@media (max-height: 400px) {
  .nrl-ft-card { gap: 10px; padding: 14px 20px; }
  .nrl-ft-pts { font-size: 3rem; }
}
/* Under 360px tall (a phone in landscape with Safari's bars): tighter still, so the card fits unscrolled. */
@media (max-height: 360px) {
  .nrl-ft-card { gap: 7px; padding: 12px 18px; }
  .nrl-ft-pts { font-size: 2.5rem; }
  .nrl-ft-line { font-size: 0.8125rem; }
  .nrl-ft-potm { padding: 6px 10px; }
  .nrl-ft-actions .nrl-btn { height: 44px; }
}
/* The report (44): a full sheet over the darkened pitch, The numbers on the right. */
.nrl-modal-backdrop.nrl-report-backdrop {
  top: 0; bottom: 0; background: rgba(5, 7, 13, 0.62);
  padding: calc(12px + var(--nrl-safe-t)) calc(12px + var(--nrl-safe-r)) calc(12px + var(--nrl-safe-b)) calc(12px + var(--nrl-safe-l));
}
.nrl-report-backdrop .nrl-modal.nrl-report-modal {
  width: 100%; height: 100%; max-width: 1000px; max-height: 560px; padding: 14px 18px; border-radius: 16px; background: var(--nrl-navy); box-shadow: inset 0 0 0 1px var(--nrl-line);
}
.nrl-report { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 320px; grid-template-rows: minmax(0, 1fr); gap: 20px; }
.nrl-rp-left { display: flex; flex-direction: column; gap: 10px; min-height: 0; min-width: 0; }
.nrl-rp-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 10px; }
.nrl-rp-title { font-family: var(--nrl-f-display); font-size: 1.375rem; letter-spacing: -0.02em; text-transform: uppercase; color: var(--nrl-text); }
.nrl-rp-round { font-size: 0.8125rem; font-weight: 600; color: var(--nrl-text-2); }
.nrl-rp-team {
  flex: 0 0 auto; display: grid; grid-template-columns: 6px minmax(0, 1fr) auto; column-gap: 12px; align-items: center;
  padding: 10px 12px 10px 0; border-radius: 12px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); overflow: hidden; color: var(--nrl-text-2);
}
.nrl-rp-stripe { align-self: stretch; width: 6px; margin: -10px 0; }
.nrl-rp-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.nrl-rp-name { min-width: 0; font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-rp-pts { font-family: var(--nrl-f-display); font-size: 1.875rem; line-height: 1; font-variant-numeric: tabular-nums; }
.nrl-rp-lead { color: var(--nrl-text); }
.nrl-rp-detail { font-size: 0.75rem; line-height: 1.4; color: var(--nrl-text-2); }
.nrl-rp-team:not(.nrl-rp-lead) .nrl-rp-detail { color: var(--nrl-muted); }
/* What the match paid (#736): a ringed panel per kind of payment, the label left and the sum in JetBrains Mono right. */
.nrl-report-payments { flex: 0 0 auto; padding: 8px 12px; border-radius: 12px; background: var(--nrl-panel); box-shadow: inset 0 0 0 1px var(--nrl-line); font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-report-payments h3, .nrl-report-payments ul { margin: 0; }
.nrl-report-payments h3 { margin-bottom: 2px; font-family: var(--nrl-f-num); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-report-payments ul { padding: 0; list-style: none; }
.nrl-report-payments li { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; }
.nrl-report-payments strong { text-align: right; color: var(--nrl-text); }
.nrl-report-note { margin: 0; font-size: 0.8125rem; color: var(--nrl-accent); }
.nrl-report-summary { margin: 0; font-size: 0.875rem; line-height: 1.45; color: #e6e9ef; }
.nrl-report-change-one { margin: 0; font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-report-changes { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-report-changes summary { cursor: pointer; list-style: none; min-height: 28px; display: flex; align-items: center; }
.nrl-report-changes summary::-webkit-details-marker { display: none; }
.nrl-report-changes summary::before { content: '▸'; margin-right: 6px; }
.nrl-report-changes[open] summary::before { content: '▾'; }
.nrl-report-why summary { color: var(--nrl-accent); font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.nrl-report-why-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-top: 1px solid var(--nrl-line); font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-report-why-row > span { flex: 1 1 auto; min-width: 0; line-height: 1.35; }
.nrl-btn.nrl-report-why-go { flex: 0 0 auto; min-height: 36px; padding: 0 10px; font-size: 0.875rem; border-radius: 8px; }
@media (pointer: coarse) { .nrl-btn.nrl-report-why-go { min-height: 44px; } }
.nrl-report-change { margin: 2px 0 0 14px; }
.nrl-report-potm { margin: 0; font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-rp-potm-label { font-family: var(--nrl-f-num); font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-btn.nrl-rp-back { flex: 0 0 auto; align-self: flex-start; height: 48px; padding: 0 22px; border-radius: 10px; font-size: 1.0625rem; }
/* The numbers (44): a column of split bars beside the story, its own scroll on a short screen. */
.nrl-rp-stats { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 12px; padding-left: 20px; box-shadow: inset 1px 0 0 var(--nrl-line); }
.nrl-rp-stats-head { display: flex; justify-content: space-between; align-items: center; }
.nrl-rp-stats-title { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-rp-stats-codes { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.12em; color: var(--nrl-muted); }
.nrl-rp-stats .nrl-mo-stathead { display: none; }
.nrl-rp-stats .nrl-mo-stattable { gap: 12px; }
.nrl-rp-stats .nrl-mo-statrow { height: auto; grid-template-columns: 52px minmax(0, 1fr) 52px; column-gap: 10px; border-top: 0; font-weight: 700; }
.nrl-rp-stats .nrl-mo-stat-a { color: var(--nrl-text-2); }
.nrl-rp-stats .nrl-mo-stat-bar { height: 5px; gap: 2px; }
.nrl-btn.nrl-rp-all { margin-top: auto; align-self: flex-start; min-height: 44px; padding: 0 14px; border-radius: 10px; font-size: 0.875rem; }
@media (max-height: 340px) { .nrl-rp-stats, .nrl-rp-stats .nrl-mo-stattable { gap: 8px; } }
@media (max-width: 720px) { .nrl-report { grid-template-columns: minmax(0, 1fr) 270px; gap: 14px; } .nrl-rp-stats { padding-left: 14px; } }
@media (max-width: 560px) { .nrl-report { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; overflow-y: auto; } .nrl-rp-stats { padding-left: 0; box-shadow: none; } }
`;
