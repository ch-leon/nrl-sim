// src/ui/screens/player.ts — the player page (N7, GitHub #185).
//
// Tap a PlayerCard on the Squad or Recruit screen, or a row of a rival's squad,
// and this dialog opens over it: portrait, the stat bars, every trait with its
// tip, age and position, morale and why, the contract and wage, this season's
// and the career tallies, and the actions that apply where the player is
// (sign a free agent; renew, sell or release one of yours) through the same
// system functions the Recruit, Squad and Contracts screens call. The
// view-model (playerPageModel) is pure and unit-tested; the DOM renders it.
// No Phaser.

import { bus } from '../../core/events';
import { getState, type GameState, type Player, type PlayerStats, type RivalClub, type StatTally } from '../../core/state';
import { marketWage, overallRating } from '../../data/player';
import { ROMAN, TRAITS } from '../../data/traits';
import { CONTRACTS, MORALE, SQUAD_CAP, SQUAD_MIN, difficultyMultipliers } from '../../config';
import { renewalFee, renewalWeeklyCost, renewEarly, sellPlayer, transferFee } from '../../systems/contracts';
import { RELEASE_PAYOUT_WEEKS, releasePlayer, signingFee, signingFeeBasis, signPlayer } from '../../systems/freeagency';
import { PLAYER_ID } from '../../systems/fixtures';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { PORTRAIT_H, PORTRAIT_W, TRAINING_KIT, portraitDataUrl } from '../../art/portrait';
import { button, closeModal, el, openModal, panel } from '../dom';
import { ensureScreenStyles } from './recruit';
import { fmtMoney } from './finance';
import { focusLabel, weeklyChange, weeklyGain } from '../../systems/training';

// ── View-model (pure) ───────────────────────────────────────────────────────

/** Where the player was opened from; decides the actions and the kit. */
export type PlayerContext =
  | { kind: 'squad' }
  | { kind: 'freeAgent' }
  | { kind: 'rival'; club: RivalClub };

export type PlayerActionId = 'sign' | 'renew' | 'sell' | 'release';

export interface PlayerAction {
  id: PlayerActionId;
  /** Button text, e.g. "Sell +$12,000". */
  label: string;
  /** Small print under the buttons, e.g. "$1,200/wk for 52 weeks". */
  detail?: string;
  enabled: boolean;
  /** Why it is disabled. */
  why?: string;
  danger?: boolean;
  /** Two-tap guard: the button reads this after the first tap. */
  confirm?: string;
}

export interface PlayerPageModel {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  /** "Your squad", "Free agent" or the rival's name. */
  where: string;
  /** Each stat, and (your own players, N11) what a week's training under the squad focus adds. */
  stats: { label: string; value: number; gain?: number }[];
  /** The squad's training focus in words, for your own players (N11). */
  trainingFocus: string | null;
  traits: { label: string; tip: string; bad: boolean }[];
  morale: { value: number; word: string; reasons: string[] };
  /** "Fit" or "Out 3 weeks". */
  fitness: string;
  injured: boolean;
  /** "low", "moderate" or "high". */
  injuryRisk: string;
  /** The contract as it stands: weeks and the weekly wage as paid. */
  contract: { text: string; expiring: boolean };
  /** "Joined in season 1 · 3rd season at the club", squad only. */
  tenure: string | null;
  season: StatTally | null;
  career: StatTally | null;
  actions: PlayerAction[];
}

const STAT_LABELS: readonly [keyof PlayerStats, string][] = [
  ['speed', 'Speed'], ['strength', 'Strength'], ['stamina', 'Stamina'], ['skill', 'Skill'], ['footyIQ', 'Footy IQ'],
];

/** Morale in a word: 70+ happy, 50+ content, 30+ unsettled, else unhappy. */
export function moraleWord(m: number): string {
  return m >= 70 ? 'Happy' : m >= 50 ? 'Content' : m >= 30 ? 'Unsettled' : 'Unhappy';
}

/** Injury risk in a word, by thirds of the 1–100 range. */
export function riskWord(risk: number): string {
  return risk < 34 ? 'low' : risk < 67 ? 'moderate' : 'high';
}

/** Title-case a position, hyphens kept: "five-eighth" → "Five-Eighth". */
export function positionLabel(pos: string): string {
  return pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

const weeksText = (w: number): string => `${w} week${w === 1 ? '' : 's'}`;

/**
 * What the morale system (systems/morale.ts) is docking a squad player for,
 * in words: paid under the market for his rating, a contract running down,
 * or being hurt.
 */
export function moraleReasons(p: Player): string[] {
  const out: string[] = [];
  const market = marketWage(p);
  if (p.wage < market * MORALE.LOW_PAY_RATIO) out.push(`paid under the market (${fmtMoney(p.wage)} v ${fmtMoney(market)}/wk)`);
  if (p.contractWeeks <= MORALE.EXPIRING_WEEKS) out.push('contract running down');
  if (p.injuredWeeks > 0) out.push('injured');
  return out;
}

/** The actions that apply where the player is, priced the way the screens price them. */
export function playerActions(p: Player, ctx: PlayerContext, state: GameState): PlayerAction[] {
  if (ctx.kind === 'rival') return [];
  if (ctx.kind === 'freeAgent') {
    const fee = signingFee(state, p);
    const full = state.squad.length >= SQUAD_CAP;
    const broke = state.money < fee;
    return [{
      id: 'sign',
      label: `Sign ${fmtMoney(fee)}`,
      detail: `${signingFeeBasis(state, p)} · then ${fmtMoney(paidWage(p, state))}/wk`,
      enabled: !full && !broke,
      ...(full ? { why: `Squad full (${SQUAD_CAP})` } : broke ? { why: 'Not enough money for the fee' } : {}),
    }];
  }
  const fee = renewalFee(state, p);
  const fresh = p.contractWeeks >= CONTRACTS.NEW_CONTRACT_WEEKS;
  const broke = state.money < fee;
  const atMin = state.squad.length <= SQUAD_MIN;
  const minWhy = `Squad at the minimum (${SQUAD_MIN})`;
  return [
    {
      id: 'renew',
      label: `Renew ${fmtMoney(fee)}`,
      detail: `${fmtMoney(renewalWeeklyCost(state, p))}/wk for ${CONTRACTS.NEW_CONTRACT_WEEKS} weeks`,
      enabled: !fresh && !broke,
      ...(fresh ? { why: 'Contract already full length' } : broke ? { why: 'Not enough money for the fee' } : {}),
    },
    {
      id: 'sell',
      label: `Sell +${fmtMoney(transferFee(p))}`,
      enabled: !atMin,
      confirm: 'Really sell?',
      ...(atMin ? { why: minWhy } : {}),
    },
    {
      id: 'release',
      label: `Release ${fmtMoney(RELEASE_PAYOUT_WEEKS * p.wage)}`,
      detail: `${RELEASE_PAYOUT_WEEKS}×wage settlement`,
      enabled: !atMin,
      danger: true,
      confirm: 'Really release?',
      ...(atMin ? { why: minWhy } : {}),
    },
  ];
}

/** The weekly wage as the club pays it (the difficulty's multiplier applied). */
function paidWage(p: Player, state: Pick<GameState, 'settings'>): number {
  return Math.round(p.wage * difficultyMultipliers(state.settings.difficulty).wages);
}

const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

/** Everything the page shows, from the player, where he is and the game state. */
export function playerPageModel(p: Player, ctx: PlayerContext, state: GameState): PlayerPageModel {
  const squad = ctx.kind === 'squad';
  const wage = paidWage(p, state);
  const contract = ctx.kind === 'freeAgent'
    ? { text: `Asks ${fmtMoney(wage)}/wk on a ${CONTRACTS.NEW_CONTRACT_WEEKS}-week deal`, expiring: false }
    : { text: `${weeksText(p.contractWeeks)} left · ${fmtMoney(wage)}/wk`, expiring: p.contractWeeks <= MORALE.EXPIRING_WEEKS };
  const seasonsAtClub = p.joinedSeason !== undefined ? state.season - p.joinedSeason + 1 : null;
  // A week's training under the squad's focus (N11): what each stat gains, for your own players.
  const focus = state.training?.focus ?? 'balanced';
  // Nothing trains without facilities: no gains to show. What shows is the week's change, a veteran's decline included.
  const trains = squad && Object.values(weeklyGain(p, state.facilities, focus)).some((g) => g > 0);
  const gain = trains ? weeklyChange(p, state.facilities, focus) : null;
  return {
    id: p.id,
    name: p.name,
    position: positionLabel(p.position),
    age: p.age,
    overall: overallRating(p),
    where: ctx.kind === 'squad' ? 'Your squad' : ctx.kind === 'freeAgent' ? (p.junior ? 'Academy prospect' : 'Free agent') : ctx.club.name,
    // Stats train in fractions; the page shows whole numbers.
    stats: STAT_LABELS.map(([key, label]) => ({ label, value: Math.round(p.stats[key]), ...(gain ? { gain: Math.round(gain[key] * 10) / 10 } : {}) })),
    trainingFocus: squad ? focusLabel(focus) : null,
    traits: p.traits
      .filter((t) => t.id in TRAITS)
      .map((t) => ({ label: `${TRAITS[t.id].name} ${ROMAN[t.level]}`, tip: TRAITS[t.id].blurb, bad: TRAITS[t.id].bad ?? false })),
    morale: { value: p.morale, word: moraleWord(p.morale), reasons: squad ? moraleReasons(p) : [] },
    fitness: p.injuredWeeks > 0 ? `Out ${weeksText(p.injuredWeeks)}` : 'Fit',
    injured: p.injuredWeeks > 0,
    injuryRisk: riskWord(p.injuryRisk),
    contract,
    tenure: squad && seasonsAtClub !== null
      ? `Joined in season ${p.joinedSeason} · ${ordinal(seasonsAtClub)} season at the club`
      : null,
    season: squad && p.seasonStats && p.seasonStats.season === state.season
      ? { games: p.seasonStats.games, tries: p.seasonStats.tries, tackles: p.seasonStats.tackles, lineBreaks: p.seasonStats.lineBreaks }
      : squad ? { games: 0, tries: 0, tackles: 0, lineBreaks: 0 } : null,
    career: p.career ?? null,
    actions: playerActions(p, ctx, state),
  };
}

/** "12 games · 5 tries · 140 tackles · 3 line breaks". */
export function fmtTally(t: StatTally): string {
  const n = (v: number, one: string, many: string): string => `${v} ${v === 1 ? one : many}`;
  return [n(t.games, 'game', 'games'), n(t.tries, 'try', 'tries'), n(t.tackles, 'tackle', 'tackles'), n(t.lineBreaks, 'line break', 'line breaks')].join(' · ');
}

// ── DOM ─────────────────────────────────────────────────────────────────────

const FAILURE: Record<string, string> = {
  'squad-full': 'Squad is full — release a player first.',
  'insufficient-funds': 'Not enough money.',
  'not-found': 'That player is no longer there.',
  'already-fresh': 'Contract is already full length.',
  'squad-min': `Squad can't go below ${SQUAD_MIN}.`,
};

/** Run an action through the system function that owns it. */
function runAction(id: PlayerActionId, playerId: string): { ok: boolean; reason?: string } {
  const s = getState();
  switch (id) {
    case 'sign': return signPlayer(s, playerId);
    case 'renew': return renewEarly(s, playerId);
    case 'sell': return sellPlayer(s, playerId);
    case 'release': return releasePlayer(s, playerId);
  }
}

/** The kit the portrait wears: the club's on a squad or rival player, the training top on a free agent. */
function kitFor(ctx: PlayerContext, state: GameState): Kit {
  if (ctx.kind === 'freeAgent') return TRAINING_KIT;
  if (ctx.kind === 'rival') return kitFromColors(ctx.club.colors, ctx.club.id);
  const colors = state.league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS;
  return kitFromColors(colors, PLAYER_ID);
}

/** Where the player is now, by id, or null once he has moved on. */
function findPlayer(id: string, ctx: PlayerContext, state: GameState): Player | null {
  const list = ctx.kind === 'squad' ? state.squad : ctx.kind === 'freeAgent' ? state.freeAgents : (ctx.club.squad ?? []);
  return list.find((p) => p.id === id) ?? null;
}

function statBars(stats: PlayerPageModel['stats'], focus: string | null): HTMLElement {
  return el('div', { class: 'nrl-statbars nrl-player-stats' }, ...stats.map(({ label, value, gain }) => {
    const fill = el('div', { class: 'nrl-statfill' });
    fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    const row = el('div', { class: 'nrl-statrow' }, el('span', { text: label }), el('div', { class: 'nrl-stattrack' }, fill), el('span', { text: String(value) }));
    // N11: what a week's training under the squad focus adds.
    if (gain !== undefined) {
      row.style.gridTemplateColumns = '4.6rem 1fr 1.8rem 2.6rem';
      row.append(el('span', { class: 'nrl-stat-gain', text: `${gain < 0 ? '−' : '+'}${Math.abs(gain).toFixed(1)}/wk`, attrs: { title: `A week's training under the ${focus} focus`, 'data-gain': '', style: 'font-size:0.7em;color:#2e7d32;white-space:nowrap' } }));
    }
    return row;
  }));
}

/**
 * Open the page for `player` as found in `ctx`. It follows the player through
 * state changes (a renewal updates the contract line; a sale, release or
 * signing closes it). `onClose` runs when it closes by any route, so a rival
 * squad can come back.
 */
export function openPlayerPage(player: Player, ctx: PlayerContext, opts: { onClose?: () => void } = {}): HTMLElement {
  ensureScreenStyles();
  const content = el('div', { class: 'nrl-player', attrs: { 'data-player-page': player.id } });
  let armed: PlayerActionId | null = null;
  let closed = false;

  const finish = (): void => {
    if (closed) return;
    closed = true;
    off();
    closeModal();
    opts.onClose?.();
  };

  const render = (): void => {
    const state = getState();
    const p = findPlayer(player.id, ctx, state);
    if (!p) { finish(); return; }
    const m = playerPageModel(p, ctx, state);
    const kit = kitFor(ctx, state);

    const portrait = el('img', {
      class: 'nrl-player-portrait',
      attrs: { src: portraitDataUrl(p.id, kit), alt: '', width: String(PORTRAIT_W * 6), height: String(PORTRAIT_H * 6) },
    });
    const head = el('div', { class: 'nrl-player-id' },
      el('div', { class: 'nrl-player-name' }, el('span', { text: m.name }), el('span', { class: 'nrl-card-ovr', text: String(m.overall), attrs: { title: 'Overall rating' } })),
      el('div', { class: 'nrl-card-meta' },
        el('span', { class: 'nrl-badge', text: m.position }),
        el('span', { text: `Age ${m.age}` }),
        el('span', { class: m.injured ? 'nrl-badge nrl-badge-out' : 'nrl-badge', text: m.fitness }),
      ),
      el('div', { class: 'nrl-player-where', text: m.where }),
    );
    const top = el('div', { class: 'nrl-player-top' }, portrait, head);

    const line = (label: string, text: string, cls = ''): HTMLElement =>
      el('div', { class: `nrl-player-line ${cls}`.trim() }, el('b', { text: `${label}: ` }), text);

    const about = el('div', { class: 'nrl-player-col' },
      el('h3', { text: 'Stats' }),
      statBars(m.stats, m.trainingFocus),
      el('h3', { text: 'Traits' }),
      ...(m.traits.length > 0
        ? m.traits.map((t) => el('div', { class: `nrl-player-trait${t.bad ? ' nrl-player-trait-bad' : ''}` }, el('b', { text: t.label }), t.tip))
        : [el('div', { class: 'nrl-player-line', text: 'None — a solid citizen' })]),
    );
    const moraleText = `${m.morale.word} (${m.morale.value})${m.morale.reasons.length ? ' · ' + m.morale.reasons.join(', ') : ''}`;
    const details = el('div', { class: 'nrl-player-col' },
      el('h3', { text: 'Condition' }),
      line('Morale', moraleText),
      line('Injury risk', m.injuryRisk),
      el('h3', { text: 'Contract' }),
      line('Deal', m.contract.text, m.contract.expiring ? 'nrl-player-expiring' : ''),
      ...(m.tenure ? [line('Club', m.tenure)] : []),
      ...(m.season || m.career ? [el('h3', { text: 'Record' })] : []),
      ...(m.season ? [line('This season', fmtTally(m.season))] : []),
      ...(m.career ? [line('Career', fmtTally(m.career))] : []),
    );

    const actions = el('div', { class: 'nrl-player-actions' });
    for (const a of m.actions) {
      const btn = button(armed === a.id && a.confirm ? a.confirm : a.label, () => {
        if (a.confirm && armed !== a.id) { armed = a.id; render(); return; }
        armed = null;
        const res = runAction(a.id, p.id);
        if (!res.ok) bus.emit('ui:notify', { text: FAILURE[res.reason ?? ''] ?? 'Not possible.', kind: 'danger' });
      }, a.danger ? { class: 'nrl-btn-danger' } : {});
      btn.setAttribute('data-player-action', a.id);
      if (!a.enabled) { btn.disabled = true; btn.title = a.why ?? ''; }
      actions.append(btn);
    }
    const why = m.actions.filter((a) => a.detail || a.why).map((a) => `${a.label.split(' ')[0]}: ${a.why ?? a.detail}`).join(' · ');
    if (why) actions.append(el('div', { class: 'nrl-player-why', text: why }));
    actions.append(button('Close', finish, { class: 'nrl-player-close' }));

    content.replaceChildren(top, el('div', { class: 'nrl-player-grid' }, about, details), actions);
  };

  const off = bus.on('state:changed', () => {
    if (!content.isConnected) { off(); return; }
    render();
  });
  render();
  // In the band between HUD and nav, with a ✕ in the corner (#203).
  const backdrop = openModal(panel({ class: 'nrl-player-panel' }, content), { class: 'nrl-player-modal', region: true });
  const box = backdrop.querySelector('.nrl-modal');
  if (box) {
    const x = button('✕', finish, { class: 'nrl-screen-x' });
    x.setAttribute('aria-label', 'Close');
    box.classList.add('nrl-modal-has-x');
    box.prepend(x);
  }
  // The backdrop's own listener has closed the dialog; tell whoever opened it.
  backdrop.addEventListener('click', () => { if (!closed) { closed = true; off(); opts.onClose?.(); } });
  return backdrop;
}
