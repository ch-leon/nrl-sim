// src/ui/screens/lineup.ts — the Lineup screen (GitHub #69): pick the nine
// starters and the interchange bench, and how hard the bench is rotated.
// Nine tiles on a field panel laid out like the formation (the hooker and prop
// at the ruck, the line behind them, the fullback deepest), a bench of four,
// and the squad list beside them. Tap a slot or a seat, then tap a player to
// put him there (whoever was there takes his place); tap two slots to swap
// them. Each tile shows the man's rating as he plays that slot: a man out of
// position plays below his rating (systems/lineup.ts, tuning reference §21).
// Auto pick rebuilds today's best side; PLAN opens the attack and defence
// presets in a dialog over it (#342). Saved at once, so a side picked and
// then the app closed is not lost. DOM UI kit only; the rules are pure and
// tested in systems/lineup.ts. No Phaser.
import { el, button, openScreen, openModal, screenHead } from '../dom';
import { getState, setState, type Lineup, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { overallRating } from '../../data/player';
import { PORTRAIT_W, portraitDataUrl } from '../../art/portrait';
import type { Kit } from '../../art/match/kit';
import { BENCH, ROTATIONS, type Rotation } from '../../match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../../match/league/presets';
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
import { squadKit } from './squad';

const STYLE_ID = 'nrl-lineup-styles';
/** Portraits at ×2, shown on a tile only when it is wide enough to keep the surname beside it. */
const PORTRAIT_PX = PORTRAIT_W * 2;
/** Tiles are at least this tall (a finger's width, #342). */
const TILE_H = 44;
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

const ROTATION_LABEL: Readonly<Record<Rotation, string>> = { off: 'OFF', standard: 'STD', heavy: 'HEAVY' };
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
.nrl-lineup-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: 0.5rem;
}
.nrl-lineup-left {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${GAP}px;
  overflow-y: auto;
}
/* The pitch fits its box (#342): the lines share its height, the tiles its width. */
.nrl-lineup-field {
  flex: 1 1 auto;
  min-height: ${3 * TILE_H + 4 * GAP + 4}px;
  max-height: 22rem;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: repeat(3, minmax(${TILE_H}px, 1fr));
  gap: ${GAP}px;
  padding: ${GAP - 1}px;
  background: #2f7a36;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-lineup-line { display: flex; align-items: center; justify-content: center; gap: ${GAP}px; min-width: 0; }
.nrl-lineup-line[data-line="0"] { border-bottom: 2px solid rgba(255,255,255,0.18); }
.nrl-lineup-line[data-line="1"] { justify-content: space-between; }
/* Two lines (#342): the slot and his rating there, his surname under it. */
.nrl-lineup-tile {
  pointer-events: auto;
  cursor: pointer;
  position: relative;
  container-type: inline-size;
  flex: 0 1 calc((100% - ${5 * GAP}px) / 6);
  min-width: 0;
  max-width: 120px;
  height: ${TILE_H}px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 3px 1px 2px;
  box-sizing: border-box;
  background: #e8e0c8;
  color: #1a1a2e;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  font-family: 'Courier New', monospace;
  text-align: left;
}
.nrl-lineup-tile[data-selected] { outline: 3px solid #f4d03f; z-index: 2; }
.nrl-lineup-tile[data-empty] { border-style: dashed; background: rgba(232, 224, 200, 0.6); }
.nrl-lineup-tile[data-out] { background: #e9a0a0; }
.nrl-lineup-tile img, .nrl-lineup-tile-blank {
  display: none;
  flex: 0 0 auto;
  width: ${PORTRAIT_PX}px;
  height: ${PORTRAIT_PX}px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.nrl-lineup-tile-blank { border: 2px dashed #555; box-sizing: border-box; }
@container (min-width: 80px) { .nrl-lineup-tile img, .nrl-lineup-tile-blank { display: block; } }
.nrl-lineup-tile-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.nrl-lineup-tile-top { font-size: 0.65rem; font-weight: bold; white-space: nowrap; }
.nrl-lineup-tile-name { font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-fit-related { color: #8a5a00; }
.nrl-lineup-fit-unrelated { color: #b00020; }
.nrl-lineup .nrl-screen-head { margin-bottom: 0.15rem; }
/* The bench (#351 L3): a strip across the top of the pitch, not a row under it. */
.nrl-lineup-bench {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: ${GAP}px;
  padding: ${GAP - 1}px;
  background: #24602a;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-lineup-bench-label { color: #e8e0c8; font-size: 0.65rem; font-weight: bold; flex: 0 0 auto; }
.nrl-lineup-bench .nrl-lineup-tile { flex: 1 1 0; }
/* Too short for the strip and three lines of 44px tiles (956×330): the bench goes beside the pitch, two by two. */
@media (max-height: 340px) {
  .nrl-lineup-left { flex-direction: row; }
  .nrl-lineup-bench { order: 2; display: grid; grid-template-columns: repeat(2, minmax(64px, 84px)); align-content: center; }
  .nrl-lineup-bench-label { grid-column: 1 / -1; }
  .nrl-lineup-bench .nrl-lineup-tile { max-width: none; }
}
.nrl-lineup-right {
  flex: 0 0 clamp(200px, 34%, 340px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.nrl-lineup-pick { color: #f4d03f; font-size: 0.68rem; font-weight: bold; text-shadow: 1px 1px 0 #000; flex: 0 0 auto; }
.nrl-lineup-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 3px;
}
.nrl-lineup-row {
  pointer-events: auto;
  cursor: pointer;
  display: grid;
  grid-template-columns: ${PORTRAIT_PX}px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.3rem;
  min-height: 36px;
  padding: 1px 4px 1px 1px;
  background: #e8e0c8;
  color: #1a1a2e;
  border: 2px solid #000;
  font-family: 'Courier New', monospace;
  font-size: 0.65rem;
  text-align: left;
}
/* N14 (#263): 44px rows on a touch screen (the list scrolls; the field is unchanged). */
@media (pointer: coarse) { .nrl-lineup-row { min-height: 44px; } }
.nrl-lineup-row img { width: ${PORTRAIT_PX}px; height: ${PORTRAIT_PX}px; image-rendering: pixelated; image-rendering: crisp-edges; }
.nrl-lineup-row[data-selected] { outline: 3px solid #f4d03f; }
.nrl-lineup-row[data-injured], .nrl-lineup-row[data-banned] { opacity: 0.55; cursor: default; }
.nrl-lineup-row-id { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.nrl-lineup-row-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-row-meta { white-space: nowrap; font-size: 0.6rem; }
.nrl-lineup-row-eff { font-weight: bold; white-space: nowrap; }
.nrl-lineup-where {
  min-width: 1.9rem;
  text-align: center;
  border: 2px solid #000;
  background: #1a1a2e;
  color: #f4d03f;
  font-weight: bold;
  padding: 0 0.2rem;
  white-space: nowrap;
}
.nrl-lineup-where[data-bench] { background: #3a6ea5; color: #fff; }
.nrl-lineup-where[data-injured], .nrl-lineup-where[data-banned] { background: #b03a2e; color: #fff; }
.nrl-lineup-where[data-free] { background: transparent; color: transparent; border-color: transparent; }
.nrl-lineup-kc { display: flex; gap: 0.3rem; flex-shrink: 0; }
.nrl-lineup-kc[hidden] { display: none; }
/* Kicker and Captain (#349 L4): a switch for the picked man, naming who holds the job now. */
.nrl-lineup-kc .nrl-btn {
  min-height: 44px; flex: 1 1 0; min-width: 0;
  display: flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.4rem;
  background: #e8e0c8; text-align: left; font-size: 0.65rem;
}
.nrl-lineup-kc .nrl-btn:hover:not(:disabled) { background: #fff6c2; }
.nrl-lineup-switch { flex: 0 0 auto; position: relative; width: 26px; height: 14px; border: 2px solid #000; background: #8a8a8a; box-sizing: border-box; }
.nrl-lineup-switch::after { content: ''; position: absolute; top: 1px; left: 1px; width: 8px; height: 8px; background: #fff; border: 1px solid #000; }
.nrl-lineup-kc .nrl-btn[aria-pressed="true"] .nrl-lineup-switch { background: #7ec850; }
.nrl-lineup-kc .nrl-btn[aria-pressed="true"] .nrl-lineup-switch::after { left: auto; right: 1px; }
.nrl-lineup-kc-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.nrl-lineup-kc-text small { font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-role { position: absolute; top: 1px; padding: 0 0.15rem; background: #1a1a2e; color: #f4d03f; border: 1px solid #f4d03f; font-size: 0.55rem; font-weight: bold; line-height: 1.2; pointer-events: none; }
.nrl-lineup-role-k { right: 1px; }
.nrl-lineup-role-c { right: 13px; }
.nrl-lineup-rot { display: flex; gap: 0.2rem; align-items: center; }
.nrl-lineup-rot-label { color: #e8e0c8; font-size: 0.7rem; }
/* The plan dialog (#342): a row of chips per side, each pick's blurb under them. */
.nrl-lineup-plan { font-size: 0.8rem; }
.nrl-lineup-plan h2 { margin: 0 0 0.4rem; font-size: 1rem; }
.nrl-lineup-tac { flex-wrap: wrap; margin-bottom: 0.4rem; }
.nrl-lineup-tac .nrl-lineup-rot-label { color: #1a1a2e; font-weight: bold; min-width: 4.5rem; }
.nrl-lineup-tac .nrl-btn { min-height: 44px; white-space: nowrap; }
/* The lit chip stays lit under a finger: a touch leaves :hover on the last chip tapped. */
.nrl-lineup .nrl-btn.nrl-sort-active, .nrl-lineup .nrl-btn.nrl-sort-active:hover:not(:disabled) { background: #7ec850; }
.nrl-lineup-tac-hint { margin: 0 0 0.5rem; line-height: 1.3; }
.nrl-lineup-opp { padding: 0.25rem 0.4rem; background: rgba(0,0,0,0.08); border-left: 3px solid #1a1a2e; }
.nrl-lineup-opp[hidden] { display: none; }
.nrl-lineup-plan > .nrl-lineup-rot { margin-top: 0.5rem; }
.nrl-lineup-plan > .nrl-lineup-rot .nrl-lineup-rot-label { color: #1a1a2e; font-weight: bold; min-width: 4.5rem; }
.nrl-lineup-plan > .nrl-lineup-rot .nrl-btn { min-height: 44px; padding: 0.3rem 0.6rem; }
.nrl-lineup-rot .nrl-btn { padding: 0.3rem 0.35rem; font-size: clamp(0.6rem, 2vw, 0.8rem); }
.nrl-screen-tools [data-plan] { max-width: 15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (min-width: 1000px) {
  .nrl-lineup-tile-top, .nrl-lineup-tile-name { font-size: 0.72rem; }
  .nrl-lineup-row { font-size: 0.78rem; }
  .nrl-lineup-row-meta { font-size: 0.7rem; }
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
}

/** Write the coach's lineup and keep it now (the game otherwise saves at the week's end). */
function setLineup(next: Lineup): void {
  if (next === getState().lineup) return;
  setState({ lineup: next });
  save(getState());
}

function portrait(p: Player, kit: Kit): HTMLImageElement {
  return el('img', { attrs: { src: portraitDataUrl(p.id, kit), alt: '', width: String(PORTRAIT_PX), height: String(PORTRAIT_PX) } });
}

/**
 * Open the Lineup screen in the shared screen region (ui/dom.ts openScreen).
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
  const kcSwitch = (job: string, onTap: () => void, attr: string): { btn: HTMLButtonElement; holder: HTMLElement } => {
    const holder = el('small');
    const btn = button('', onTap);
    btn.append(el('span', { class: 'nrl-lineup-switch', attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'nrl-lineup-kc-text' }, el('b', { text: job }), holder));
    btn.setAttribute(attr, '');
    return { btn, holder };
  };
  const { btn: kBtn, holder: kHolder } = kcSwitch('Kicker', () => {
    const id = chosen();
    if (id) setLineup(setKicker(getState().lineup, id));
  }, 'data-make-kicker');
  const { btn: cBtn, holder: cHolder } = kcSwitch('Captain', () => {
    const id = chosen();
    if (id) setLineup(setCaptain(getState().lineup, id));
  }, 'data-make-captain');
  const kcRow = el('div', { class: 'nrl-lineup-kc' }, kBtn, cBtn);
  kcRow.hidden = true;
  const list = el('div', { class: 'nrl-lineup-list' });
  const rotRow = el('div', { class: 'nrl-lineup-rot' }, el('span', { class: 'nrl-lineup-rot-label', text: 'Bench:' }));
  const rotButtons = new Map<Rotation, HTMLButtonElement>();
  for (const r of ROTATIONS) {
    const b = button(ROTATION_LABEL[r], () => setLineup({ ...getState().lineup, rotation: r }));
    b.title = ROTATION_TIP[r];
    b.setAttribute('data-rotation', r);
    rotButtons.set(r, b);
    rotRow.append(b);
  }

  // The coach's presets (N11): attack and defence, each chip with what it does.
  const tacButtons = new Map<AttackPreset | DefencePreset, HTMLButtonElement>();
  // Each side's pick explained under its own row (#351 L2), and what the next opponent plays.
  const attackHint = el('p', { class: 'nrl-lineup-tac-hint' });
  const defenceHint = el('p', { class: 'nrl-lineup-tac-hint' });
  const oppLine = el('p', { class: 'nrl-lineup-tac-hint nrl-lineup-opp', attrs: { 'data-plan-opponent': '' } });
  const tacRow = (label: string, presets: readonly (AttackPreset | DefencePreset)[], pick: (p: AttackPreset | DefencePreset) => Partial<TeamTactics>): HTMLElement => {
    const row = el('div', { class: 'nrl-lineup-rot nrl-lineup-tac' }, el('span', { class: 'nrl-lineup-rot-label', text: label }));
    for (const p of presets) {
      const b = button(PRESET_LABEL[p], () => setLineup(setTactics(getState().lineup, pick(p))));
      b.title = TACTIC_BLURB[p];
      b.setAttribute('data-tactic', p);
      tacButtons.set(p, b);
      row.append(b);
    }
    return row;
  };
  const attackRow = tacRow('Attack:', ATTACK_PRESETS, (p) => ({ attack: p as AttackPreset }));
  const defenceRow = tacRow('Defence:', DEFENCE_PRESETS, (p) => ({ defence: p as DefencePreset }));
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
  const tile = (p: Player | null, spot: Spot, kit: Kit, slotPos: Position | null): HTMLElement => {
    const label = spot.kind === 'starter' ? POSITION_SHORT[slotPos!] : `B${spot.index + 1}`;
    const injured = p !== null && p.injuredWeeks > 0;
    const banned = p !== null && (p.suspendedWeeks ?? 0) > 0;
    const fit = p && slotPos ? positionFit(p.position, slotPos) : 1;
    const rating = p ? (slotPos ? effectiveRating(p, slotPos) : overallRating(p)) : null;
    const top = el('span', { class: 'nrl-lineup-tile-top' }, `${label} `);
    if (injured) top.append(el('span', { class: 'nrl-lineup-fit-unrelated', text: `OUT ${p.injuredWeeks}w` }));
    else if (banned) top.append(el('span', { class: 'nrl-lineup-fit-unrelated', text: `BAN ${p.suspendedWeeks}w` }));
    else if (rating !== null) top.append(el('span', { class: fitClass(fit), text: String(rating) }));
    else top.append('—');
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
      p ? portrait(p, kit) : el('span', { class: 'nrl-lineup-tile-blank' }),
      el('div', { class: 'nrl-lineup-tile-text' }, top, el('span', { class: 'nrl-lineup-tile-name', text: p ? surname(p.name) : 'empty' })),
    );
    if (!p) t.setAttribute('data-empty', '');
    if (injured) t.setAttribute('data-out', '');
    // K and C (N11): badges on the tile's top edge.
    if (p && spot.kind === 'starter') {
      if (roles.kicker === p.id) t.append(el('span', { class: 'nrl-lineup-role nrl-lineup-role-k', text: 'K', attrs: { 'data-kicker': '', title: 'Goal-kicker' } }));
      if (roles.captain === p.id) t.append(el('span', { class: 'nrl-lineup-role nrl-lineup-role-c', text: 'C', attrs: { 'data-captain': '', title: 'Captain' } }));
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
    const kit = squadKit();
    const nine = today.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : []));
    roles = kickerAndCaptain(nine, lineup);
    const byId = new Map(s.squad.map((p) => [p.id, p] as const));
    const at = (id: string | null): Player | null => (id ? byId.get(id) ?? null : null);

    // The field: nine tiles in the formation's three lines.
    field.replaceChildren(...FIELD_LINES.map((slots, i) => el('div', { class: 'nrl-lineup-line', attrs: { 'data-line': String(i) } },
      ...slots.map((slot) => tile(at(lineup.starters[slot] ?? null), { kind: 'starter', slot }, kit, LINEUP_SLOTS[slot]!)))));
    bench.replaceChildren(el('span', { class: 'nrl-lineup-bench-label', text: 'Bench' }));
    for (let i = 0; i < BENCH.size; i++) bench.append(tile(at(lineup.bench[i] ?? null), { kind: 'bench', index: i }, kit, null));

    for (const [r, b] of rotButtons) b.classList.toggle('nrl-sort-active', r === lineup.rotation);
    const tactics = validTactics(lineup.tactics);
    for (const [p, b] of tacButtons) b.classList.toggle('nrl-sort-active', p === tactics.attack || p === tactics.defence);
    attackHint.textContent = TACTIC_BLURB[tactics.attack];
    defenceHint.textContent = TACTIC_BLURB[tactics.defence];
    const next = nextFixture(s.league.fixtures, s.week, PLAYER_ID);
    const opp = next ? s.league.clubs.find((c) => c.id === (next.homeId === PLAYER_ID ? next.awayId : next.homeId)) : undefined;
    oppLine.hidden = !opp;
    if (opp) oppLine.replaceChildren(el('strong', { text: `Next: ${opp.name}` }), ` play ${styleLine(rivalStyle(opp))}`);
    planBtn.textContent = `PLAN ${PRESET_LABEL[tactics.attack]} · ${PRESET_LABEL[tactics.defence]}`;
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
        return who ? surname(who.name) : 'nobody';
      };
      kBtn.setAttribute('aria-pressed', String(roles.kicker === chosenId));
      cBtn.setAttribute('aria-pressed', String(roles.captain === chosenId));
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
      const eff = el('span', { class: `nrl-lineup-row-eff ${slotPos ? fitClass(positionFit(p.position, slotPos)) : ''}`, text: effText });
      eff.title = slotPos ? `Rating at ${positionLabel(slotPos)} (overall ${overallRating(p)})` : 'Overall rating';
      const row = el(
        'button',
        {
          class: 'nrl-lineup-row',
          attrs: { type: 'button', 'data-player': p.id },
          onClick: () => tapPlayer(p),
        },
        portrait(p, kit),
        el(
          'div',
          { class: 'nrl-lineup-row-id' },
          el('span', { class: 'nrl-lineup-row-name', text: p.name }),
          el('span', { class: 'nrl-lineup-row-meta', text: `${positionLabel(p.position)} · age ${p.age}` }),
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

  // The plan (N11): attack and defence presets and the picks' blurbs, in a
  // dialog over the screen so the field and the list keep its height (#342).
  // The bench rotation is part of the plan: how hard the four are used.
  const plan = el('div', { class: 'nrl-lineup nrl-lineup-plan' },
    el('h2', { text: 'Game plan' }), oppLine, attackRow, attackHint, defenceRow, defenceHint, rotRow);
  planBtn.onclick = () => openModal(plan, { class: 'nrl-lineup-plan-modal', region: true, closeButton: true });

  const head = screenHead('Lineup', { sub, controls: [planBtn, autoBtn] });
  const body = el(
    'div',
    { class: 'nrl-lineup-body' },
    el('div', { class: 'nrl-lineup-left' }, bench, field),
    el('div', { class: 'nrl-lineup-right' }, pick, kcRow, list),
  );
  const screen = el('div', { class: 'nrl-screen nrl-lineup' }, head, body);
  openScreen(screen, onLineupClosed, 'lineup');
  render();
  unsub = bus.on('state:changed', render);
}
