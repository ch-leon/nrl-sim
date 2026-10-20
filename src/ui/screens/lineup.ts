// src/ui/screens/lineup.ts — the Lineup screen (GitHub #69): pick the nine
// starters and the interchange bench, and how hard the bench is rotated.
// Nine tiles on a field panel laid out like the formation (the hooker and prop
// at the ruck, the line behind them, the fullback deepest), a bench of four,
// and the squad list beside them. Tap a slot or a seat, then tap a player to
// put him there (whoever was there takes his place); tap two slots to swap
// them. Each tile shows the man's rating as he plays that slot: a man out of
// position plays below his rating (systems/lineup.ts, tuning reference §21).
// Auto pick rebuilds today's best side. Saved at once, so a side picked and
// then the app closed is not lost. DOM UI kit only; the rules are pure and
// tested in systems/lineup.ts. No Phaser.
import { el, button, openScreen, closeScreen } from '../dom';
import { getState, setState, type Lineup, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { overallRating } from '../../data/player';
import { PORTRAIT_W, portraitDataUrl } from '../../art/portrait';
import type { Kit } from '../../art/match/kit';
import { BENCH, ROTATIONS, type Rotation } from '../../match/league/bench';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../../match/league/presets';
import { TACTIC_BLURB } from '../tacticsBlurbs';
import { kickerAndCaptain } from '../../match/league/sheets';
import {
  LINEUP_SLOTS, POSITION_SHORT, autoPick, describeFills, effectiveRating, lineupAverage, occupant, placeAt, positionFit,
  resolveLineup, sameSpot, setCaptain, setKicker, setTactics, spotOf, statsAt, swapSpots, validTactics, type Spot,
} from '../../systems/lineup';
import { ensureScreenStyles } from './recruit';
import { squadKit } from './squad';

const STYLE_ID = 'nrl-lineup-styles';
/** Portraits at ×2: the biggest that leaves room for six tiles across a phone on its side. */
const PORTRAIT_PX = PORTRAIT_W * 2;
const TILE_H = 36;
const ROW_GAP = 6;
const FIELD_PAD = 5;

/**
 * Where each slot's tile sits on the field panel: a row (0 at the ruck, 1 the
 * line behind it, 2 the fullback deepest) and a lane across (%), roughly the
 * live sim's roles (match/league/roles.ts) spread so the tiles don't touch.
 */
const TILE_AT: readonly { row: number; x: number }[] = [
  { row: 2, x: 50 }, // fullback
  { row: 1, x: 8 }, // winger
  { row: 1, x: 92 }, // winger
  { row: 1, x: 22 }, // centre
  { row: 1, x: 36 }, // five-eighth
  { row: 1, x: 64 }, // halfback
  { row: 0, x: 58 }, // hooker
  { row: 0, x: 42 }, // prop
  { row: 1, x: 78 }, // second-row
];

const ROTATION_LABEL: Readonly<Record<Rotation, string>> = { off: 'OFF', standard: 'STD', heavy: 'HEAVY' };
const ROTATION_TIP: Readonly<Record<Rotation, string>> = {
  off: 'Off: the nine play the whole match (only a hurt man comes off)',
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
  flex: 0 0 62%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  overflow-y: auto;
}
.nrl-lineup-field {
  position: relative;
  flex: 0 0 auto;
  height: ${3 * TILE_H + 2 * ROW_GAP + 2 * FIELD_PAD}px;
  background: #2f7a36;
  background-image: linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18));
  background-size: 100% 2px;
  background-repeat: no-repeat;
  background-position: 0 ${FIELD_PAD + TILE_H + ROW_GAP / 2 - 1}px;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-lineup-tile {
  pointer-events: auto;
  cursor: pointer;
  position: absolute;
  transform: translateX(-50%);
  width: 70px;
  height: ${TILE_H}px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 3px 1px 1px;
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
.nrl-lineup-tile img {
  flex: 0 0 auto;
  width: ${PORTRAIT_PX}px;
  height: ${PORTRAIT_PX}px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.nrl-lineup-tile-blank {
  flex: 0 0 auto;
  width: ${PORTRAIT_PX}px;
  height: ${PORTRAIT_PX}px;
  border: 2px dashed #555;
  box-sizing: border-box;
}
.nrl-lineup-tile-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.nrl-lineup-tile-top { font-size: 0.62rem; font-weight: bold; white-space: nowrap; }
.nrl-lineup-tile-name { font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lineup-fit-related { color: #8a5a00; }
.nrl-lineup-fit-unrelated { color: #b00020; }
.nrl-lineup .nrl-screen-head { margin-bottom: 0.3rem; }
.nrl-lineup .nrl-screen-sub { margin-bottom: 0.25rem; }
.nrl-lineup-bench {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
}
.nrl-lineup-bench-label { color: #e8e0c8; font-size: 0.65rem; font-weight: bold; min-width: 2.6rem; }
.nrl-lineup-bench .nrl-lineup-tile { position: static; transform: none; }
.nrl-lineup-right {
  flex: 1 1 auto;
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
.nrl-lineup-row img { width: ${PORTRAIT_PX}px; height: ${PORTRAIT_PX}px; image-rendering: pixelated; image-rendering: crisp-edges; }
.nrl-lineup-row[data-selected] { outline: 3px solid #f4d03f; }
.nrl-lineup-row[data-injured] { opacity: 0.55; cursor: default; }
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
.nrl-lineup-where[data-injured] { background: #b03a2e; color: #fff; }
.nrl-lineup-where[data-free] { background: transparent; color: transparent; border-color: transparent; }
.nrl-lineup-kc { display: flex; gap: 0.3rem; flex-shrink: 0; }
.nrl-lineup-kc[hidden] { display: none; }
.nrl-lineup-kc .nrl-btn { min-height: 44px; flex: 1 1 0; }
.nrl-lineup-role { display: inline-block; margin-left: 0.15rem; padding: 0 0.15rem; background: #1a1a2e; color: #f4d03f; font-size: 0.55rem; line-height: 1.2; }
.nrl-lineup-rot { display: flex; gap: 0.2rem; align-items: center; }
.nrl-lineup-rot-label { color: #e8e0c8; font-size: 0.7rem; }
.nrl-lineup-tacstrip { display: flex; gap: 0.6rem; align-items: center; overflow-x: auto; flex-shrink: 0; scrollbar-width: thin; }
.nrl-lineup-tac { flex-wrap: nowrap; flex-shrink: 0; }
.nrl-lineup-tac .nrl-btn { min-height: 44px; white-space: nowrap; }
/* The lit chip stays lit under a finger: a touch leaves :hover on the last chip tapped. */
.nrl-lineup .nrl-btn.nrl-sort-active, .nrl-lineup .nrl-btn.nrl-sort-active:hover:not(:disabled) { background: #7ec850; }
.nrl-lineup-tac-hint { color: #e8e0c8; font-size: 0.68rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; flex-shrink: 0; }
.nrl-lineup-rot .nrl-btn { padding: 0.3rem 0.35rem; font-size: clamp(0.6rem, 2vw, 0.8rem); }
.nrl-lineup-head .nrl-btn { padding: 0.3rem 0.5rem; }
@media (min-width: 1000px) {
  .nrl-lineup-tile { width: 96px; }
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
  const kBtn = button('Kicker', () => {
    const id = chosen();
    if (id) setLineup(setKicker(getState().lineup, id));
  });
  kBtn.setAttribute('data-make-kicker', '');
  const cBtn = button('Captain', () => {
    const id = chosen();
    if (id) setLineup(setCaptain(getState().lineup, id));
  });
  cBtn.setAttribute('data-make-captain', '');
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
  const tacHint = el('div', { class: 'nrl-lineup-tac-hint' });
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

  const toast = (text: string): void => bus.emit('ui:notify', { text, kind: 'info' });

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
      toast(`${p.name} is injured — out ${p.injuredWeeks}w.`);
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
    const fit = p && slotPos ? positionFit(p.position, slotPos) : 1;
    const rating = p ? (slotPos ? effectiveRating(p, slotPos) : overallRating(p)) : null;
    const top = el('span', { class: 'nrl-lineup-tile-top' }, `${label} `);
    if (injured) top.append(el('span', { class: 'nrl-lineup-fit-unrelated', text: `OUT ${p.injuredWeeks}w` }));
    else if (rating !== null) top.append(el('span', { class: fitClass(fit), text: String(rating) }));
    else top.append('—');
    if (p && spot.kind === 'starter') {
      if (roles.kicker === p.id) top.append(el('span', { class: 'nrl-lineup-role', text: 'K', attrs: { 'data-kicker': '', title: 'Goal-kicker' } }));
      if (roles.captain === p.id) top.append(el('span', { class: 'nrl-lineup-role', text: 'C', attrs: { 'data-captain': '', title: 'Captain' } }));
    }
    const t = el(
      'button',
      {
        class: 'nrl-lineup-tile',
        attrs: {
          type: 'button',
          'data-spot': spot.kind === 'starter' ? `s${spot.slot}` : `b${spot.index}`,
          title: p
            ? `${p.name} · ${positionLabel(p.position)} · OVR ${overallRating(p)}${slotPos && fit < 1 ? ` · at ${positionLabel(slotPos)} ${rating} (×${fit})` : ''}${injured ? ` · injured, out ${p.injuredWeeks}w` : ''}`
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

    // The field: nine tiles where the formation puts them.
    field.replaceChildren();
    LINEUP_SLOTS.forEach((pos, slot) => {
      const t = tile(at(lineup.starters[slot] ?? null), { kind: 'starter', slot }, kit, pos);
      const { row, x } = TILE_AT[slot]!;
      t.style.top = `${FIELD_PAD + row * (TILE_H + ROW_GAP)}px`;
      t.style.left = `clamp(38px, ${x}%, calc(100% - 38px))`;
      field.append(t);
    });
    bench.replaceChildren(el('span', { class: 'nrl-lineup-bench-label', text: 'Bench' }));
    for (let i = 0; i < BENCH.size; i++) bench.append(tile(at(lineup.bench[i] ?? null), { kind: 'bench', index: i }, kit, null));

    for (const [r, b] of rotButtons) b.classList.toggle('nrl-sort-active', r === lineup.rotation);
    const tactics = validTactics(lineup.tactics);
    for (const [p, b] of tacButtons) b.classList.toggle('nrl-sort-active', p === tactics.attack || p === tactics.defence);
    tacHint.textContent = `${PRESET_LABEL[tactics.attack]}: ${TACTIC_BLURB[tactics.attack]} ${PRESET_LABEL[tactics.defence]}: ${TACTIC_BLURB[tactics.defence]}`;
    tacHint.title = tacHint.textContent;

    const fit = s.squad.filter((p) => p.injuredWeeks <= 0).length;
    const picked = lineup.starters.filter((id) => id !== null).length;
    const notes = today.fills.length ? ` · on the day: ${describeFills(today.fills).replace(/^Lineup: /, '')}` : '';
    sub.textContent = `${picked}/${LINEUP_SLOTS.length} picked · nine rated ${lineupAverage(lineup, s.squad)} as they play · ${fit} fit of ${s.squad.length}${notes}`;

    // The squad list, best for the picked slot first.
    const slotPos = selected && selected.kind === 'starter' ? LINEUP_SLOTS[selected.slot]! : null;
    // The selected starter can be made the goal-kicker or the captain (N11); tapping again goes back to the default.
    const chosenId = selected && selected.kind === 'starter' ? lineup.starters[selected.slot] ?? null : null;
    kcRow.hidden = chosenId === null;
    if (chosenId) {
      kBtn.toggleAttribute('data-active', roles.kicker === chosenId);
      cBtn.toggleAttribute('data-active', roles.captain === chosenId);
      kBtn.classList.toggle('nrl-sort-active', lineup.kicker === chosenId);
      cBtn.classList.toggle('nrl-sort-active', lineup.captain === chosenId);
      kBtn.title = lineup.kicker === chosenId ? 'Your goal-kicker: tap to go back to the default' : 'Make him the goal-kicker';
      cBtn.title = lineup.captain === chosenId ? 'Your captain: tap to go back to the default' : 'Make him captain';
    }
    pick.textContent = selected
      ? slotPos
        ? `Pick for ${positionLabel(slotPos)} (tap a player)`
        : `Pick for bench seat ${(selected as { index: number }).index + 1} (tap a player)`
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
      const whereEl = el('span', {
        class: 'nrl-lineup-where',
        text: injured ? `OUT ${p.injuredWeeks}w` : where ? (where.kind === 'starter' ? POSITION_SHORT[LINEUP_SLOTS[where.slot]!] : `B${where.index + 1}`) : '·',
      });
      if (injured) whereEl.setAttribute('data-injured', '');
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

  const head = el(
    'div',
    { class: 'nrl-screen-head nrl-lineup-head' },
    el('span', { class: 'nrl-screen-title', text: 'Lineup' }),
    rotRow,
    autoBtn,
    button('CLOSE', closeScreen),
  );
  const body = el(
    'div',
    { class: 'nrl-lineup-body' },
    el('div', { class: 'nrl-lineup-left' }, field, bench),
    el('div', { class: 'nrl-lineup-right' }, pick, kcRow, list),
  );
  // The plan (N11): attack and defence presets on their own strip, the picks' blurbs under it.
  const tacStrip = el('div', { class: 'nrl-lineup-tacstrip' }, attackRow, defenceRow);
  const screen = el('div', { class: 'nrl-screen nrl-lineup' }, head, tacStrip, tacHint, sub, body);
  openScreen(screen, onLineupClosed);
  render();
  unsub = bus.on('state:changed', render);
}
