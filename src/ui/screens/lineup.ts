// src/ui/screens/lineup.ts — the Lineup screen (GitHub #69; 3e Broadcast Quiet):
// pick the nine starters and the interchange bench, and how hard the bench is
// rotated. Nine tiles on a mini-pitch laid out like the formation (the hooker
// and prop at the ruck, the line behind them, the fullback deepest), a bench
// strip of four above it, and the squad list beside them. Tap a slot or a seat,
// then tap a player to put him there (whoever was there takes his place); tap
// two slots to swap them. Each tile shows the man's rating as he plays that
// slot: a man out of position plays below his rating (systems/lineup.ts,
// tuning reference §21), in amber. Auto pick rebuilds today's best side; PLAN
// opens the attack, defence and bench presets in a bottom sheet over it, the
// half-time sheet's look (3r, #342). Saved at once, so a side picked and then
// the app closed is not lost. DOM UI kit only; the rules are pure and tested
// in systems/lineup.ts. No Phaser.
import { el, button, openScreen, openModal, closeModal, screenHead, segmented } from '../dom';
import { getState, setState, type Lineup, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { overallRating } from '../../data/player';
import { BENCH, ROTATIONS, type Rotation } from '../../match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset } from '../../match/league/presets';
import { TACTIC_BLURB, styleLine } from '../tacticsBlurbs';
import { nextFixture } from '../../systems/league';
import { PLAYER_ID } from '../../systems/fixtures';
import { rivalStyle } from '../../systems/rivalRound';
import { kickerAndCaptain } from '../../match/league/sheets';
import {
  LINEUP_SLOTS, POSITION_SHORT, autoPick, describeFills, effectiveRating, lineupAverage, occupant, placeAt, positionFit,
  resolveLineup, sameSpot, setCaptain, setKicker, setTactics, spotOf, statsAt, swapSpots, validTactics, type Spot,
} from '../../systems/lineup';
import { ensureScreenStyles } from './recruit';
import { squadTabs } from './squad';

const STYLE_ID = 'nrl-lineup-styles';
/** Tiles are a finger tall (#342) and 72 wide where the pitch has room (3e). */
const TILE_H = 44;
const TILE_W = 72;
const GAP = 4;

/**
 * The field's three lines, left to right, by slot (LINEUP_SLOTS order): the
 * prop and hooker at the ruck, the line behind them, the fullback deepest;
 * roughly the live sim's roles (match/league/roles.ts).
 */
const FIELD_LINES: readonly (readonly number[])[] = [
  [7, 6], // prop, hooker
  [1, 3, 4, 5, 8, 2], // winger, centre, five-eighth, halfback, second-row, winger
  [0], // fullback
];

const ROTATION_LABEL: Readonly<Record<Rotation, string>> = { off: 'Off', standard: 'Standard', heavy: 'Heavy' };
const ROTATION_TIP: Readonly<Record<Rotation, string>> = {
  off: 'Off: the nine play the whole match (only a hurt man comes off, or Fresh legs when you call it)',
  standard: 'Standard: tired men come off under 55% legs, two at a stoppage',
  heavy: 'Heavy: men come off under 70% legs, three at a stoppage',
};

function ensureLineupStyles(): void {
  ensureScreenStyles();
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LINEUP_CSS;
  document.head.appendChild(style);
}

const LINEUP_CSS = `
/* Two columns (3e): the bench strip and the pitch, and the list beside them. */
.nrl-lineup-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(200px, 34%, 270px);
  gap: 12px;
}
.nrl-lineup-left { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: ${GAP}px; }
/* The bench (#351 L3): a strip across the top of the pitch. */
.nrl-lineup-bench {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: ${GAP}px;
  padding: 3px;
  border-radius: 8px;
  background: var(--nrl-raised);
}
.nrl-lineup-bench-label {
  flex: 0 0 44px;
  text-align: center;
  font-family: var(--nrl-f-label);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nrl-muted);
}
.nrl-lineup-bench .nrl-lineup-tile { flex: 1 1 0; max-width: none; height: 40px; padding: 0 8px; }
/* The pitch fits its box (#342): the lines share its height, the tiles its width. */
.nrl-lineup-field {
  flex: 1 1 auto;
  min-height: ${3 * TILE_H + 2 * GAP + 8}px;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: ${GAP}px;
  padding: 4px;
  border-radius: 8px;
  background: repeating-linear-gradient(90deg, #2f7a36 0px, #2f7a36 60px, #337f3a 60px, #337f3a 120px);
}
.nrl-lineup-line { display: flex; align-items: center; justify-content: center; gap: ${GAP}px; min-width: 0; }
.nrl-lineup-line[data-line="1"] { justify-content: space-between; }
/* A slot: the slot and his rating there, his surname under it. */
.nrl-lineup-tile {
  pointer-events: auto;
  cursor: pointer;
  position: relative;
  flex: 0 1 ${TILE_W}px;
  min-width: 0;
  max-width: ${TILE_W}px;
  height: ${TILE_H}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  box-sizing: border-box;
  border: 0;
  border-radius: 6px;
  background: var(--nrl-raised);
  color: var(--nrl-text);
  font-family: var(--nrl-f-body);
  line-height: 1.15;
  text-align: left;
}
.nrl-lineup-tile:hover { background: #22305c; }
.nrl-lineup-tile:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 1px; }
.nrl-lineup-tile[data-selected] { box-shadow: 0 0 0 2px var(--nrl-accent); z-index: 2; }
.nrl-lineup-tile[data-empty] { background: rgba(232, 224, 200, 0.12); }
.nrl-lineup-tile[data-out], .nrl-lineup-tile[data-banned] { background: var(--nrl-injured); }
.nrl-lineup-tile-top { font-family: var(--nrl-f-label); font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; }
.nrl-lineup-tile-top .nrl-num { font-weight: 600; font-size: 12px; }
.nrl-lineup-tile-name { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-tile[data-empty] .nrl-lineup-tile-name { color: var(--nrl-muted); }
/* Out of position: amber; out of his kind of position: red; hurt or banned: OUT / BAN in red. */
.nrl-lineup-fit-related { color: var(--nrl-fit-ok); }
.nrl-lineup-fit-unrelated, .nrl-lineup-tile-out { color: var(--nrl-neg); }
/* K and C (N11): small yellow letters top-right of the tile. */
.nrl-lineup-roles { position: absolute; top: 2px; right: 3px; display: flex; gap: 3px; pointer-events: none; }
.nrl-lineup-role { font-family: var(--nrl-f-label); font-size: 11px; font-weight: 700; line-height: 1; color: var(--nrl-accent); }
.nrl-lineup-right { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
.nrl-lineup-pick { flex: 0 0 auto; font-family: var(--nrl-f-label); font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Kicker and Captain (#349 L4): a switch for the picked man, naming who holds the job now. */
.nrl-lineup-kc { flex: 0 0 auto; display: flex; gap: 4px; }
.nrl-lineup-kc[hidden] { display: none; }
.nrl-lineup-kc .nrl-btn {
  flex: 1 1 0;
  min-width: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 14px;
  text-align: left;
}
@media (pointer: coarse) { .nrl-lineup-kc .nrl-btn { min-height: 44px; } }
.nrl-lineup-kc-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.nrl-lineup-kc-text small { font-family: var(--nrl-f-body); font-size: 11px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-kc-state { flex: 0 0 auto; color: var(--nrl-muted); }
.nrl-lineup-kc .nrl-btn[aria-pressed="true"] .nrl-lineup-kc-state { color: var(--nrl-accent); }
.nrl-lineup-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 3px; }
/* A candidate: name and "Position · age", his rating for the picked slot, where he is now. */
.nrl-lineup-row {
  pointer-events: auto;
  cursor: pointer;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px 46px;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: var(--nrl-raised);
  color: var(--nrl-text);
  font-family: var(--nrl-f-body);
  text-align: left;
}
/* N14 (#263): 44px rows on a touch screen (the list scrolls; the field is unchanged). */
@media (pointer: coarse) { .nrl-lineup-row { min-height: 44px; } }
.nrl-lineup-row:hover { background: #22305c; }
.nrl-lineup-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
.nrl-lineup-row[data-selected] { background: var(--nrl-me); }
.nrl-lineup-row[data-injured], .nrl-lineup-row[data-banned] { opacity: 0.55; cursor: default; }
.nrl-lineup-row-id { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.nrl-lineup-row-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-row-meta { font-size: 11px; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-row-eff { font-family: var(--nrl-f-num); font-size: 13px; font-weight: 600; text-align: right; }
.nrl-lineup-where {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--nrl-button);
  font-family: var(--nrl-f-label);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.nrl-lineup-where[data-bench] { background: var(--nrl-bench); }
.nrl-lineup-where[data-injured], .nrl-lineup-where[data-banned] { background: var(--nrl-out); }
.nrl-lineup-where[data-free] { background: transparent; color: var(--nrl-muted); }
.nrl-sq .nrl-screen-tools [data-plan] { max-width: 18rem; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 760px) { .nrl-sq .nrl-screen-tools [data-plan] { max-width: 9.5rem; } }
/* A big screen (1280×800): bigger tiles on a pitch that does not run to the floor. */
@media (min-width: 1000px) and (min-height: 600px) {
  .nrl-lineup-field { flex: 0 1 auto; height: 100%; max-height: 420px; }
  .nrl-lineup-tile { flex-basis: 104px; max-width: 104px; height: 56px; padding: 0 8px; }
  .nrl-lineup-tile-top { font-size: 15px; }
  .nrl-lineup-tile-name { font-size: 13px; }
}
/* Short sheets (956×330, 667×375): the bench strip and tiles a touch lower so three lines fit. */
@media (max-height: 380px) {
  .nrl-lineup-bench .nrl-lineup-tile { height: 36px; }
  .nrl-lineup-tile { height: 40px; }
  .nrl-lineup-field { min-height: ${3 * 40 + 2 * GAP + 8}px; }
}

/* The plan (#342): a bottom sheet over the dimmed Lineup, the half-time sheet's look (3r). */
.nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal {
  align-self: flex-end;
  width: 100%;
  max-width: 1180px;
  border-radius: 22px 22px 16px 16px;
  background: var(--nrl-navy);
  padding: 8px 24px 14px;
}
.nrl-lineup-plan { display: flex; flex-direction: column; gap: 8px; }
.nrl-lineup-plan-grab { align-self: center; width: 40px; height: 4px; border-radius: 2px; background: var(--nrl-line); }
.nrl-lineup-plan-head { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.nrl-lineup-plan-title { flex: 0 0 auto; font-family: var(--nrl-f-label); font-size: 24px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-lineup-plan-sub { flex: 0 1 auto; min-width: 0; font-size: 13px; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-opp { margin-left: auto; flex: 0 1 auto; min-width: 0; font-size: 12px; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-opp[hidden] { display: none; }
.nrl-lineup-plan-rows { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: center; gap: 6px 12px; }
.nrl-lineup-plan-label { font-family: var(--nrl-f-label); font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-lineup-plan .nrl-seg { display: flex; padding: 3px; }
.nrl-lineup-plan .nrl-seg > .nrl-btn { flex: 1 1 0; min-height: 38px; padding: 0 8px; font-size: 17px; letter-spacing: 0.02em; text-transform: none; }
@media (pointer: coarse) { .nrl-lineup-plan .nrl-seg > .nrl-btn { min-height: 44px; } }
.nrl-lineup-rot-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.nrl-lineup-rot-row .nrl-seg { flex: 0 0 300px; max-width: 60%; }
.nrl-lineup-rot-tip { flex: 1 1 auto; min-width: 0; font-size: 12px; color: var(--nrl-muted); line-height: 1.3; }
.nrl-lineup-plan-foot { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.nrl-lineup-tac-hint { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 13px; line-height: 1.35; color: var(--nrl-text-2); }
.nrl-lineup-tac-hint b { color: var(--nrl-text); font-weight: 600; }
.nrl-lineup-plan-foot .nrl-btn-primary { flex: 0 0 auto; min-height: 48px; padding: 0 24px; font-size: 19px; }
@media (max-height: 380px) {
  .nrl-lineup-plan-grab { display: none; }
  .nrl-lineup-plan-title { font-size: 22px; }
  .nrl-lineup-plan .nrl-seg > .nrl-btn { min-height: 36px; font-size: 16px; }
  .nrl-lineup-plan-foot .nrl-btn-primary { min-height: 44px; }
  .nrl-lineup-tac-hint { font-size: 12px; }
}
@media (max-width: 760px) {
  .nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal { padding: 8px 14px 12px; }
  .nrl-lineup-plan .nrl-seg > .nrl-btn { font-size: 15px; padding: 0 4px; }
}
`;

const surname = (name: string): string => name.trim().split(/\s+/).pop() ?? name;
const fitClass = (f: number): string => (f >= 1 ? '' : f >= 0.9 ? 'nrl-lineup-fit-related' : 'nrl-lineup-fit-unrelated');
/** Human label for a position (title-cased, hyphens kept). */
const positionLabel = (pos: string): string => pos.replace(/(^|-)([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

let unsub: (() => void) | null = null;
let selected: Spot | null = null;

function onLineupClosed(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  selected = null;
  closeModal(); // the plan sheet, if it is open
}

/** Write the coach's lineup and keep it now (the game otherwise saves at the week's end). */
function setLineup(next: Lineup): void {
  if (next === getState().lineup) return;
  setState({ lineup: next });
  save(getState());
}

/**
 * Open the Lineup screen as a sheet above the dock (ui/dom.ts openScreen).
 * Re-renders on 'state:changed' (a tap, an injury, a signing); taps go through
 * the pure rules in systems/lineup.ts and are saved at once.
 */
export function openLineupScreen(): void {
  ensureLineupStyles();
  selected = null;

  const sub = el('div', { class: 'nrl-screen-sub' });
  const field = el('div', { class: 'nrl-lineup-field' });
  const bench = el('div', { class: 'nrl-lineup-bench' });
  const pick = el('div', { class: 'nrl-lineup-pick' });
  // Kicker and captain (N11): for the starter in the selected slot.
  const chosen = (): string | null => (selected && selected.kind === 'starter' ? getState().lineup.starters[selected.slot] ?? null : null);
  const kcSwitch = (job: string, onTap: () => void, attr: string): { btn: HTMLButtonElement; holder: HTMLElement; state: HTMLElement } => {
    const holder = el('small');
    const state = el('span', { class: 'nrl-lineup-kc-state' });
    const btn = button('', onTap);
    btn.append(el('span', { class: 'nrl-lineup-kc-text' }, el('span', { text: job }), holder), state);
    btn.setAttribute(attr, '');
    return { btn, holder, state };
  };
  const { btn: kBtn, holder: kHolder, state: kState } = kcSwitch('Kicker', () => {
    const id = chosen();
    if (id) setLineup(setKicker(getState().lineup, id));
  }, 'data-make-kicker');
  const { btn: cBtn, holder: cHolder, state: cState } = kcSwitch('Captain', () => {
    const id = chosen();
    if (id) setLineup(setCaptain(getState().lineup, id));
  }, 'data-make-captain');
  const kcRow = el('div', { class: 'nrl-lineup-kc' }, kBtn, cBtn);
  kcRow.hidden = true;
  const list = el('div', { class: 'nrl-lineup-list' });

  // The plan (N11): attack and defence presets and the bench rotation, as the half-time sheet has them (3r).
  const rotation = segmented<Rotation>(ROTATIONS.map((r) => ({ id: r, label: ROTATION_LABEL[r], title: ROTATION_TIP[r] })), null,
    (r) => setLineup({ ...getState().lineup, rotation: r }), { class: 'nrl-lineup-rot', label: 'Bench' });
  for (const [r, b] of rotation.buttons) b.setAttribute('data-rotation', r);
  const rotTip = el('span', { class: 'nrl-lineup-rot-tip' });
  const attack = segmented<AttackPreset>(ATTACK_PRESETS.map((p) => ({ id: p, label: PRESET_LABEL[p], title: TACTIC_BLURB[p] })), null,
    (p) => setLineup(setTactics(getState().lineup, { attack: p })), { class: 'nrl-lineup-tac', label: 'Attack' });
  const defence = segmented<DefencePreset>(DEFENCE_PRESETS.map((p) => ({ id: p, label: PRESET_LABEL[p], title: TACTIC_BLURB[p] })), null,
    (p) => setLineup(setTactics(getState().lineup, { defence: p })), { class: 'nrl-lineup-tac', label: 'Defence' });
  for (const seg of [attack, defence]) for (const [p, b] of seg.buttons as Map<string, HTMLButtonElement>) b.setAttribute('data-tactic', p);
  // Each side's pick explained in the foot (#351 L2), and what the next opponent plays in the head.
  const hint = el('p', { class: 'nrl-lineup-tac-hint' });
  const planSub = el('span', { class: 'nrl-lineup-plan-sub' });
  const oppLine = el('span', { class: 'nrl-lineup-opp', attrs: { 'data-plan-opponent': '' } });
  const planBtn = button('PLAN', () => {});
  planBtn.setAttribute('data-plan', '');
  planBtn.setAttribute('aria-haspopup', 'dialog');

  // An injury or a ban keeps the man out of the side: red (#339). A hint is neutral.
  const toast = (text: string, kind: 'info' | 'danger' = 'info'): void => bus.emit('ui:notify', { text, kind });

  /** A tap on a slot or a seat: pick it, unpick it, or swap it with the one picked before. */
  const tapSpot = (spot: Spot): void => {
    if (selected && sameSpot(selected, spot)) selected = null;
    else if (selected) {
      const next = swapSpots(getState().lineup, selected, spot);
      selected = null;
      if (next !== getState().lineup) setLineup(next);
      else render();
    } else selected = spot;
    render();
  };

  /** A tap on a player in the squad list: into the picked spot, or pick his own spot. */
  const tapPlayer = (p: Player): void => {
    if (p.injuredWeeks > 0) {
      toast(`${p.name} is injured — out ${p.injuredWeeks}w.`, 'danger');
      return;
    }
    if ((p.suspendedWeeks ?? 0) > 0) {
      toast(`${p.name} is suspended — banned ${p.suspendedWeeks}w.`, 'danger');
      return;
    }
    const lineup = getState().lineup;
    if (selected) {
      const next = placeAt(lineup, selected, p.id);
      selected = null;
      if (next !== lineup) setLineup(next);
      else render();
      return;
    }
    const spot = spotOf(lineup, p.id);
    if (spot) {
      selected = spot;
      render();
    } else toast('Tap a slot or a bench seat first, then the player to put there.');
  };

  // Who kicks and who captains today (N11): the coach's picks, or the defaults.
  let roles: { kicker?: string; captain?: string } = {};
  const tile = (p: Player | null, spot: Spot, slotPos: Position | null): HTMLElement => {
    const label = spot.kind === 'starter' ? POSITION_SHORT[slotPos!] : `B${spot.index + 1}`;
    const injured = p !== null && p.injuredWeeks > 0;
    const banned = p !== null && (p.suspendedWeeks ?? 0) > 0;
    const fit = p && slotPos ? positionFit(p.position, slotPos) : 1;
    const rating = p ? (slotPos ? effectiveRating(p, slotPos) : overallRating(p)) : null;
    const top = el('span', { class: 'nrl-lineup-tile-top' }, `${label} `);
    if (injured) top.append(el('span', { class: 'nrl-lineup-tile-out', text: 'OUT' }));
    else if (banned) top.append(el('span', { class: 'nrl-lineup-tile-out', text: 'BAN' }));
    else if (rating !== null) top.append(el('span', { class: `nrl-num ${fitClass(fit)}`.trim(), text: String(rating) }));
    const t = el(
      'button',
      {
        class: 'nrl-lineup-tile',
        attrs: {
          type: 'button',
          'data-spot': spot.kind === 'starter' ? `s${spot.slot}` : `b${spot.index}`,
          title: p
            ? `${p.name} · ${positionLabel(p.position)} · OVR ${overallRating(p)}${slotPos && fit < 1 ? ` · at ${positionLabel(slotPos)} ${rating} (×${fit})` : ''}${injured ? ` · injured, out ${p.injuredWeeks}w` : banned ? ` · suspended, banned ${p.suspendedWeeks}w` : ''}`
            : spot.kind === 'starter'
              ? `${positionLabel(slotPos!)}: nobody picked`
              : 'Bench seat: nobody picked',
        },
        onClick: () => tapSpot(spot),
      },
      top,
      el('span', { class: 'nrl-lineup-tile-name', text: p ? surname(p.name) : 'empty' }),
    );
    if (!p) t.setAttribute('data-empty', '');
    if (injured) t.setAttribute('data-out', '');
    else if (banned) t.setAttribute('data-banned', '');
    // K and C (N11): letters at the tile's top-right.
    if (p && spot.kind === 'starter' && (roles.kicker === p.id || roles.captain === p.id)) {
      const badges = el('span', { class: 'nrl-lineup-roles' });
      if (roles.captain === p.id) badges.append(el('span', { class: 'nrl-lineup-role nrl-lineup-role-c', text: 'C', attrs: { 'data-captain': '', title: 'Captain' } }));
      if (roles.kicker === p.id) badges.append(el('span', { class: 'nrl-lineup-role nrl-lineup-role-k', text: 'K', attrs: { 'data-kicker': '', title: 'Goal-kicker' } }));
      t.append(badges);
    }
    if (sameSpot(selected, spot)) t.setAttribute('data-selected', '');
    return t;
  };

  const render = (): void => {
    const s = getState();
    // A man who has left the club is replaced in the saved lineup as soon as the screen sees it.
    const today = resolveLineup(s.lineup, s.squad);
    if (today.changed) {
      setLineup(today.lineup);
      return; // state:changed renders again
    }
    const lineup = s.lineup;
    const nine = today.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
    roles = kickerAndCaptain(nine, lineup);
    const byId = new Map(s.squad.map((p) => [p.id, p] as const));
    const at = (id: string | null): Player | null => (id ? byId.get(id) ?? null : null);

    // The field: nine tiles in the formation's three lines.
    field.replaceChildren(...FIELD_LINES.map((slots, i) => el('div', { class: 'nrl-lineup-line', attrs: { 'data-line': String(i) } },
      ...slots.map((slot) => tile(at(lineup.starters[slot] ?? null), { kind: 'starter', slot }, LINEUP_SLOTS[slot]!)))));
    bench.replaceChildren(el('span', { class: 'nrl-lineup-bench-label', text: 'Bench' }));
    for (let i = 0; i < BENCH.size; i++) bench.append(tile(at(lineup.bench[i] ?? null), { kind: 'bench', index: i }, null));

    // The plan sheet's state (it may be open over the screen).
    const tactics = validTactics(lineup.tactics);
    attack.set(tactics.attack);
    defence.set(tactics.defence);
    rotation.set(lineup.rotation);
    rotTip.textContent = ROTATION_TIP[lineup.rotation];
    hint.replaceChildren(
      el('b', { text: `${PRESET_LABEL[tactics.attack]}: ` }), TACTIC_BLURB[tactics.attack], el('br'),
      el('b', { text: `${PRESET_LABEL[tactics.defence]}: ` }), TACTIC_BLURB[tactics.defence],
    );
    const next = nextFixture(s.league.fixtures, s.week, PLAYER_ID);
    const opp = next ? s.league.clubs.find((c) => c.id === (next.homeId === PLAYER_ID ? next.awayId : next.homeId)) : undefined;
    planSub.textContent = next && opp ? `Round ${next.round} · v ${opp.name} · ${next.homeId === PLAYER_ID ? 'home' : 'away'}` : 'Before kick-off';
    oppLine.hidden = !opp;
    if (opp) {
      oppLine.textContent = `${opp.name} play ${styleLine(rivalStyle(opp))}`;
      oppLine.title = oppLine.textContent;
    }
    planBtn.textContent = `Plan: ${PRESET_LABEL[tactics.attack]} · ${PRESET_LABEL[tactics.defence]}`;
    planBtn.title = `Attack, defence and the bench (${ROTATION_LABEL[lineup.rotation]}): the coach’s plan for the match`;

    const fit = s.squad.filter((p) => p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0).length;
    const picked = lineup.starters.filter((id) => id !== null).length;
    const notes = today.fills.length ? ` · on the day: ${describeFills(today.fills).replace(/^Lineup: /, '')}` : '';
    const avg = lineupAverage(lineup, s.squad);
    sub.textContent = `${picked}/${LINEUP_SLOTS.length} picked · rated ${avg} · ${fit}/${s.squad.length} fit${notes}`;
    sub.title = `${picked}/${LINEUP_SLOTS.length} picked · nine rated ${avg} as they play · ${fit} fit of ${s.squad.length}${notes}`;

    // The squad list, best for the picked slot first.
    const slotPos = selected && selected.kind === 'starter' ? LINEUP_SLOTS[selected.slot]! : null;
    // The selected starter can be made the goal-kicker or the captain (N11); tapping again goes back to the default.
    const chosenId = selected && selected.kind === 'starter' ? lineup.starters[selected.slot] ?? null : null;
    kcRow.hidden = chosenId === null;
    if (chosenId) {
      const holderName = (id: string | undefined): string => {
        const who = id ? byId.get(id) : undefined;
        return who ? `now ${surname(who.name)}` : 'nobody';
      };
      kBtn.setAttribute('aria-pressed', String(roles.kicker === chosenId));
      cBtn.setAttribute('aria-pressed', String(roles.captain === chosenId));
      kState.textContent = roles.kicker === chosenId ? 'ON' : 'OFF';
      cState.textContent = roles.captain === chosenId ? 'ON' : 'OFF';
      kHolder.textContent = holderName(roles.kicker);
      cHolder.textContent = holderName(roles.captain);
      kBtn.title = lineup.kicker === chosenId ? 'Your goal-kicker: tap to go back to the default' : 'Make him the goal-kicker';
      cBtn.title = lineup.captain === chosenId ? 'Your captain: tap to go back to the default' : 'Make him captain';
    }
    pick.textContent = selected
      ? slotPos
        ? `For ${positionLabel(slotPos)}: tap a player`
        : `For bench seat ${(selected as { index: number }).index + 1}: tap a player`
      : 'Tap a slot, then a player';
    const rows = [...s.squad].sort((a, b) => {
      const ea = slotPos ? effectiveRating(a, slotPos) : overallRating(a);
      const eb = slotPos ? effectiveRating(b, slotPos) : overallRating(b);
      return eb - ea || overallRating(b) - overallRating(a) || a.name.localeCompare(b.name);
    });
    list.replaceChildren();
    const occupantId = selected ? occupant(lineup, selected) : null;
    for (const p of rows) {
      const where = spotOf(lineup, p.id);
      const injured = p.injuredWeeks > 0;
      const banned = (p.suspendedWeeks ?? 0) > 0;
      const whereEl = el('span', {
        class: 'nrl-lineup-where',
        text: injured ? `OUT ${p.injuredWeeks}w` : banned ? `BAN ${p.suspendedWeeks}w` : where ? (where.kind === 'starter' ? POSITION_SHORT[LINEUP_SLOTS[where.slot]!] : `B${where.index + 1}`) : '·',
      });
      if (injured) whereEl.setAttribute('data-injured', '');
      else if (banned) whereEl.setAttribute('data-banned', '');
      else if (where?.kind === 'bench') whereEl.setAttribute('data-bench', '');
      else if (!where) whereEl.setAttribute('data-free', '');
      const effText = slotPos ? `${effectiveRating(p, slotPos)}` : `${overallRating(p)}`;
      const eff = el('span', { class: `nrl-lineup-row-eff ${slotPos ? fitClass(positionFit(p.position, slotPos)) : ''}`.trim(), text: effText });
      eff.title = slotPos ? `Rating at ${positionLabel(slotPos)} (overall ${overallRating(p)})` : 'Overall rating';
      const row = el(
        'button',
        {
          class: 'nrl-lineup-row',
          attrs: { type: 'button', 'data-player': p.id },
          onClick: () => tapPlayer(p),
        },
        el(
          'div',
          { class: 'nrl-lineup-row-id' },
          el('span', { class: 'nrl-lineup-row-name', text: p.name }),
          el('span', { class: 'nrl-lineup-row-meta', text: `${positionLabel(p.position)} · ${p.age}` }),
        ),
        eff,
        whereEl,
      );
      if (injured) row.setAttribute('data-injured', '');
      else if (banned) row.setAttribute('data-banned', '');
      if (occupantId === p.id) row.setAttribute('data-selected', '');
      list.append(row);
    }
  };

  const autoBtn = button('AUTO PICK', () => {
    selected = null;
    const cur = getState().lineup;
    setLineup({ ...autoPick(getState().squad, cur.rotation, validTactics(cur.tactics)), kicker: cur.kicker ?? null, captain: cur.captain ?? null });
  });
  autoBtn.title = 'Today’s best nine by slot and the next four';
  autoBtn.setAttribute('data-auto-pick', '');

  // The plan sheet (N11, #342): over the screen so the field and the list keep their height.
  // The bench rotation is part of the plan: how hard the four are used.
  const done = button('Done', () => closeModal(), { class: 'nrl-btn-primary' });
  done.setAttribute('data-plan-done', '');
  const plan = el('div', { class: 'nrl-lineup nrl-lineup-plan' },
    el('span', { class: 'nrl-lineup-plan-grab', attrs: { 'aria-hidden': 'true' } }),
    el('div', { class: 'nrl-lineup-plan-head' }, el('span', { class: 'nrl-lineup-plan-title', text: 'Game plan' }), planSub, oppLine),
    el('div', { class: 'nrl-lineup-plan-rows' },
      el('span', { class: 'nrl-lineup-plan-label', text: 'Attack' }), attack.el,
      el('span', { class: 'nrl-lineup-plan-label', text: 'Defence' }), defence.el,
      el('span', { class: 'nrl-lineup-plan-label', text: 'Bench' }), el('div', { class: 'nrl-lineup-rot-row' }, rotation.el, rotTip)),
    el('div', { class: 'nrl-lineup-plan-foot' }, hint, done),
  );
  planBtn.onclick = () => openModal(plan, { class: 'nrl-lineup-plan-modal', region: true });

  const head = screenHead('', { lead: [squadTabs('lineup')], sub, controls: [planBtn, autoBtn] });
  const body = el(
    'div',
    { class: 'nrl-lineup-body' },
    el('div', { class: 'nrl-lineup-left' }, bench, field),
    el('div', { class: 'nrl-lineup-right' }, pick, kcRow, list),
  );
  const screen = el('div', { class: 'nrl-screen nrl-sq nrl-lineup' }, head, body);
  openScreen(screen, onLineupClosed, 'lineup');
  render();
  unsub = bus.on('state:changed', render);
}
