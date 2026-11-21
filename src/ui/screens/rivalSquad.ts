import { matchupRead, counterRead, fitRead } from '../matchupRead';
import { teamSheetFromSquad } from '../../match/league/sheets';
import { LINEUP_SLOTS, POSITION_SHORT, autoPick, isFieldable, resolveLineup, validTactics } from '../../systems/lineup';
import { awayPlayerIds } from '../../systems/playerAssignments';
// src/ui/screens/rivalSquad.ts — read-only view of a rival club's squad, opened
// from the Ladder (GitHub #74). A sheet over the League (Broadcast Quiet, like
// the Squad pitch, SuperCOOKED 30): the club and how it plays in the header row, then the
// side it would field on the pitch in the club's kit (the starting nine in four lanes, the
// bench and the reserves beside them) or, under List, the whole squad as a table. A card or
// a row opens the read-only player page; there is no swap and no auto pick. Edit club (#398) swaps the table
// for the club's name and its two kit colours. The rows and the colour options
// come from pure view-models that are unit-tested without the DOM. No Phaser.
import type { RivalClub } from '../../core/state';
import { overallRating, playerStars, ratingText } from '../../data/player';
import { traitLabel } from '../../data/traits';
import { button, el, ensureStyles, hintScroll, openModal, segmented } from '../dom';
import { playerRivalContext, rivalSheet, rivalStyle } from '../../systems/rivalRound';
import { hasStaff } from '../../systems/staff';
import { getState, setState } from '../../core/state';
import { save } from '../../core/save';
import { colorsContrast } from '../../config';
import { renameClub } from '../../systems/rename';
import { nameField } from '../rename';
import { KIT_COLORS } from './kit';
import { tacticsLabel } from '../../match/league/presets';
import { whenBehindLine } from '../tacticsBlurbs';
import { fitnessPct, openPlayerPage, positionLabel } from './player';
import { ensureLineupStyles, LANES, shortName } from './lineup';
import { kitFromColors } from '../../art/match/kit';
import { portraitDataUrl } from '../../art/portrait';
import { ensurePartsStyles, fitnessTone, playerCard } from '../parts';
import { BENCH } from '../../match/league/bench';
import type { Player } from '../../core/state';
import { ensureScreenStyles, posShort } from './recruit';

export interface RivalSquadRow {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  traits: string; // e.g. "Hitman II · Finisher I"
  injuredWeeks: number;
}

/** A rival's squad, best players first. Empty when the club has no squad. */
export function rivalSquadRows(club: RivalClub): RivalSquadRow[] {
  return (club.squad ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      age: p.age,
      overall: overallRating(p),
      traits: p.traits.map(traitLabel).join(' · '),
      injuredWeeks: p.injuredWeeks,
    }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
}

/**
 * What the club editor offers (#398): every jersey the kit designer offers with
 * the club's own first, and the trims that read against `jersey`, the club's own
 * trim first when it does. Pure.
 */
export function rivalColorOptions(current: readonly [string, string], jersey: string): { jerseys: string[]; trims: string[] } {
  const jerseys = [...new Set([current[0], ...KIT_COLORS])];
  const trims = [...new Set([current[1], ...KIT_COLORS])].filter((c) => colorsContrast(jersey, c));
  return { jerseys, trims };
}

/** A new jersey, keeping the trim when it still reads against it, else the first that does. Pure. */
export function withJersey(colors: readonly [string, string], jersey: string, current: readonly [string, string] = colors): [string, string] {
  if (colorsContrast(jersey, colors[1])) return [jersey, colors[1]];
  return [jersey, rivalColorOptions(current, jersey).trims[0] ?? colors[1]];
}

const RIVAL_STYLE_ID = 'nrl-rival-styles';

function ensureRivalStyles(): void {
  ensureStyles();
  ensureScreenStyles();
  ensureLineupStyles();
  ensurePartsStyles();
  if (document.getElementById(RIVAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RIVAL_STYLE_ID;
  style.textContent = RIVAL_CSS;
  document.head.appendChild(style);
}

const RIVAL_CSS = `
/* A sheet over the League (#343): the region's whole band, the dock whole below it, solid so the League does not show through. */
.nrl-dialog-region .nrl-modal.nrl-rival-modal {
  width: 100%;
  max-width: 1180px;
  height: 100%;
  background: var(--nrl-navy);
  border-radius: 16px;
  box-shadow: var(--nrl-shadow-tray);
  padding: 10px 14px;
}
.nrl-rival-squad { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
/* The header row: the club, how it plays (and, with an Analyst, when behind), beside the ✕. */
.nrl-rival-head { flex: 0 0 auto; min-height: 44px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; padding-right: 48px; min-width: 0; }
.nrl-rival-head h2 { flex: 0 1 170px; margin: 0; font-family: var(--nrl-f-label); font-size: 1.1875rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.1; }
.nrl-rival-lines { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.nrl-rival-head p { margin: 0; font-size: 0.75rem; line-height: 1.3; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-rival-head p[data-usual-fit], .nrl-rival-head p[data-matchup], .nrl-rival-head p[data-counters] { white-space: normal; overflow: visible; }
.nrl-rival-head p[data-when-behind] { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-rival-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; }
/* The squad: PLAYER · POS · AGE · OVR · SKILLS, rows open the player page (N7, #185). */
.nrl-rival-table th:nth-child(n+2):nth-child(-n+4), .nrl-rival-table td:nth-child(n+2):nth-child(-n+4) { width: 48px; }
.nrl-rival-table td { height: 34px; }
.nrl-rival-table tbody tr.nrl-rival-row { cursor: pointer; }
@media (hover: hover) and (pointer: fine) { .nrl-rival-table tbody tr.nrl-rival-row:hover { background: rgba(255, 255, 255, 0.04); } }
.nrl-rival-table tbody tr.nrl-rival-row:active { background: rgba(255, 255, 255, 0.04); }
.nrl-rival-table tbody tr.nrl-rival-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
@media (pointer: coarse) { .nrl-rival-table td { height: 44px; } }
.nrl-rival-name { font-weight: 500; }
.nrl-rival-table .nrl-row-note { margin-left: 6px; }
.nrl-rival-table .nrl-row-pos { font-size: 0.9375rem; }
/* Full trait names (#349 S3) wrap inside the row rather than push the table past its box. */
.nrl-rival-table td.nrl-rival-traits { white-space: normal; line-height: 1.25; font-size: 0.75rem; color: var(--nrl-text-2); min-width: 8rem; }
/* Edit club (#398): beside the lines, and the editor in the table's place: the name, then the colours. */
.nrl-btn.nrl-rival-edit { flex: 0 0 auto; min-height: 44px; padding: 0 12px; font-size: 0.875rem; }
.nrl-rival-editor { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: grid; grid-template-columns: minmax(0, 18rem) minmax(0, 1fr); gap: 4px 16px; align-content: start; }
.nrl-rival-editor .nrl-kit-label:first-child { margin-top: 0; }
.nrl-rival-chip { display: inline-block; width: 28px; height: 14px; border-radius: 4px; vertical-align: middle; margin-left: 8px; }
@media (max-width: 760px) { .nrl-rival-editor { grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); gap: 4px 12px; } }
/* Pitch / List beside Edit club, and the pitch under the header row (the lineup's own classes). */
.nrl-rival-view { flex: 0 0 auto; }
.nrl-rival-view > .nrl-btn { min-height: 44px; padding: 0 10px; font-size: 0.8125rem; }
.nrl-rival-head h2 .nrl-rival-chip { margin: 0 8px 0 0; }
/* A narrow sheet (667): the view switch is its two glyphs, and the club's name takes less, so the lines keep their room. */
@media (max-width: 760px) {
  .nrl-rival-view-word { display: none; }
  .nrl-rival-view > .nrl-btn { min-width: 44px; padding: 0 8px; font-size: 1rem; }
  .nrl-rival-head h2 { flex-basis: 8rem; font-size: 1rem; }
}
.nrl-rival-squad > .nrl-lineup-body { flex: 1 1 auto; }
/* Read-only: a card is only a way to his page, with no ring or dimming from a swap. */
.nrl-rival-squad .nrl-pcard[data-out] { opacity: 0.7; }
/* 956×330: the club's lines tighter so five rows show. */
@media (max-height: 340px) { .nrl-rival-head h2 { font-size: 1.1875rem; } .nrl-rival-head p { font-size: 0.75rem; } }
/* …and four whole rows (Wave 3): a slimmer frame round the sheet and its header row; the rows keep 44. */
@media (max-height: 340px) {
  .nrl-dialog-region .nrl-modal.nrl-rival-modal { padding: 4px 12px; }
  .nrl-rival-head { margin-bottom: 4px; }
}
`;

/**
 * The side a rival would field, as the match builds it for a squad with 13 fit men
 * (rivalSheet): the best nine by slot and the next four. Pure.
 */
export function rivalSide(club: RivalClub): { starters: (Player | null)[]; bench: Player[]; reserves: Player[] } {
  const squad = club.squad ?? [];
  const fit = squad.filter(isFieldable);
  const side = resolveLineup(autoPick(fit), fit);
  const used = new Set([...side.starters, ...side.bench].flatMap((p) => (p ? [p.id] : [])));
  const reserves = squad.filter((p) => !used.has(p.id)).sort((a, b) => overallRating(b) - overallRating(a) || a.name.localeCompare(b.name));
  return { starters: side.starters, bench: side.bench.slice(0, BENCH.size), reserves };
}

/** Pitch (the side in their kit) or List (the whole squad), kept between visits as Squad's is. */
type RivalView = 'pitch' | 'list';
let rivalView: RivalView = 'pitch';
let rivalSideTab: 'bench' | 'reserves' = 'bench';

/** The club editor's draft (#398): what is typed and the two colours picked so far. */
export interface ClubDraft { name: string; colors: [string, string] }

/**
 * The club editor in the squad table's place (#398): the name (Save keeps the
 * colours with it), the jersey and the trim. A swatch changes `d` and calls
 * `changed`, which draws the editor again; the name box never takes focus
 * itself, so a phone's keyboard comes up only when the box is tapped and never
 * covers the swatches (as the Kit's club name).
 */
export function rivalClubEditor(
  club: RivalClub,
  d: ClubDraft,
  on: { changed: () => void; cancel: () => void; save: (name: string, colors: [string, string]) => string | null },
): HTMLElement {
  const opts = rivalColorOptions(club.colors, d.colors[0]);
  const swatches = (options: readonly string[], current: string, pick: (c: string) => void, attr: string): HTMLElement =>
    el('div', { class: 'nrl-kit-row' }, ...options.map((c) => el('button', {
      class: 'nrl-kit-swatch',
      attrs: { type: 'button', [attr]: c, 'aria-label': c, 'aria-pressed': String(c === current), style: `background:${c}` },
      onClick: () => { pick(c); on.changed(); },
    })));
  return el('div', { class: 'nrl-rival-editor' },
    el('div', {},
      el('div', { class: 'nrl-kit-label', text: 'Club name' }),
      nameField({
        value: d.name,
        kept: club.name,
        label: 'Club name',
        attr: 'data-rival-rename',
        focus: false,
        onDraft: (text) => { d.name = text; },
        onCancel: on.cancel,
        onSave: (name) => on.save(name, d.colors),
      })),
    el('div', {},
      el('div', { class: 'nrl-kit-label', text: 'Jersey' }),
      swatches(opts.jerseys, d.colors[0], (c) => { d.colors = withJersey(d.colors, c, club.colors); }, 'data-rival-jersey'),
      el('div', { class: 'nrl-kit-label', text: 'Trim' }),
      swatches(opts.trims, d.colors[1], (c) => { d.colors = [d.colors[0], c]; }, 'data-rival-trim')),
  );
}

/** Open the squad sheet for `club` (over the League screen). */
export function openRivalSquad(opened: RivalClub): HTMLElement {
  ensureRivalStyles();
  // The club as the league has it now: a rename replaces the object (#398).
  const live = (): RivalClub => getState().league.clubs.find((c) => c.id === opened.id) ?? opened;
  // Edit club (#398): the draft name and colours while the editor is open.
  let draft: ClubDraft | null = null;
  const content = el('div', { class: 'nrl-rival-squad', attrs: { 'data-rival-squad': opened.id } });

  const squadTable = (club: RivalClub, rows: RivalSquadRow[]): HTMLElement => {
    const table = el('table', { class: 'nrl-table nrl-rival-table' });
    const head = el('tr');
    for (const [h, cls] of [['Player', ''], ['Pos', ''], ['Age', 'nrl-num'], ['Ovr', 'nrl-num'], ['Skills', '']] as const) {
      head.append(el('th', { text: h, ...(cls ? { class: cls } : {}) }));
    }
    table.append(el('thead', {}, head));
    const body = el('tbody');
    for (const r of rows) {
      const tr = el('tr');
      // A row opens the player's page (N7, #185); ◂ back brings this squad back.
      const player = club.squad?.find((p) => p.id === r.id);
      if (player) {
        tr.className = 'nrl-rival-row';
        tr.setAttribute('role', 'button');
        tr.setAttribute('tabindex', '0');
        tr.setAttribute('data-player-open', r.id);
        const open = (): void => { openPlayerPage(player, { kind: 'rival', club }, { onClose: () => openRivalSquad(live()) }); };
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      }
      const name = el('td', {}, el('span', { class: 'nrl-rival-name nrl-row-name', text: r.name }));
      if (r.injuredWeeks > 0) name.append(el('span', { class: 'nrl-row-note', text: `out ${r.injuredWeeks} wk` }));
      tr.append(
        name,
        el('td', { class: 'nrl-row-pos', text: posShort(r.position), attrs: { title: positionLabel(r.position) } }),
        el('td', { class: 'nrl-num', text: String(r.age) }),
        el('td', { class: 'nrl-num', text: ratingText(r.overall) }),
        el('td', { class: 'nrl-rival-traits', text: r.traits }),
      );
      body.append(tr);
    }
    table.append(body);
    return rows.length > 0
      ? el('div', { class: 'nrl-rival-scroll' }, table)
      : el('p', { class: 'nrl-screen-empty', text: 'No squad on record.' });
  };

  /** The side in their kit: four lanes and, beside them, the bench and the reserves; a card opens his page. */
  const rivalPitch = (club: RivalClub): HTMLElement => {
    const { starters, bench, reserves } = rivalSide(club);
    const kit = kitFromColors(club.colors, club.id);
    const card = (p: Player, code: string): HTMLElement => {
      const injured = p.injuredWeeks > 0;
      const banned = (p.suspendedWeeks ?? 0) > 0;
      const pct = fitnessPct(p);
      const c = playerCard({
        portrait: portraitDataUrl(p.id, kit),
        name: shortName(p.name),
        stars: playerStars(p),
        position: code,
        fitness: { tone: injured || banned ? 'alert' : fitnessTone(pct), word: injured ? `injured, out ${p.injuredWeeks} weeks` : banned ? `banned ${p.suspendedWeeks} weeks` : `fit ${pct}%` },
        onClick: () => { openPlayerPage(p, { kind: 'rival', club }, { onClose: () => openRivalSquad(live()) }); },
      });
      c.setAttribute('data-player-open', p.id);
      if (injured || banned) c.setAttribute('data-out', '');
      c.title = `${p.name} · ${positionLabel(p.position)}${injured ? ` · out ${p.injuredWeeks} wk` : banned ? ` · banned ${p.suspendedWeeks} wk` : ''}`;
      return c;
    };
    const empty = (code: string): HTMLElement => {
      const e = button(`No ${code}`, () => {}, { class: 'nrl-pitch-empty' });
      e.disabled = true;
      return e;
    };
    const field = el('div', { class: 'nrl-lineup-field', attrs: { 'data-rival-pitch': '' } },
      el('span', { class: 'nrl-pitch-halfway', attrs: { 'aria-hidden': 'true' } }),
      ...LANES.map((lane) => el('div', { class: 'nrl-pitch-lane', attrs: { 'data-lane': lane.label } },
        el('span', { class: 'nrl-pitch-lane-label', text: lane.label }),
        el('div', { class: 'nrl-pitch-cards' },
          ...LINEUP_SLOTS.flatMap((pos, slot) => {
            if (!lane.positions.includes(pos)) return [];
            const p = starters[slot];
            return [p ? card(p, POSITION_SHORT[pos]) : empty(POSITION_SHORT[pos])];
          })))));
    hintScroll(field);
    const tabs = segmented<'bench' | 'reserves'>([
      { id: 'bench', label: `Bench ${bench.length}` },
      { id: 'reserves', label: `Reserves ${reserves.length}` },
    ], rivalSideTab, (id) => { rivalSideTab = id; render(); }, { class: 'nrl-side-tabs', label: 'Bench and reserves' });
    for (const [id, b] of tabs.buttons) { b.setAttribute('data-rival-side', id); b.removeAttribute('data-seg'); }
    const list = el('div', { class: 'nrl-lineup-bench nrl-side-cards' },
      ...(rivalSideTab === 'bench' ? bench : reserves).map((p) => card(p, POSITION_SHORT[p.position])));
    hintScroll(list);
    return el('div', { class: 'nrl-lineup-body' }, field, el('div', { class: 'nrl-lineup-side' }, tabs.el, list));
  };

  const render = (): void => {
    const club = live();
    const rows = rivalSquadRows(club);
    const state = getState();
    const away = awayPlayerIds(state);
    const ours = teamSheetFromSquad(state.squad, state.clubId, state.clubName, ['#000000', '#ffffff'], resolveLineup(state.lineup, state.squad, away), away).roster ?? [];
    const context = playerRivalContext(state, ours);
    const style = rivalStyle(club, context);
    const theirs = rivalSheet(club, context).roster ?? [];
    const behind = hasStaff(getState(), 'analyst') ? whenBehindLine(style) : null;
    const line = (text: string, attrs: Record<string, string>): HTMLElement => el('p', { text, attrs: { ...attrs, title: text } });
    // Their kit beside the name (the editor shows the draft's).
    const shown = draft ? draft.colors : club.colors;
    const chip = el('span', { class: 'nrl-rival-chip', attrs: { 'aria-hidden': 'true' } });
    chip.style.background = `linear-gradient(90deg, ${shown[0]} 60%, ${shown[1]} 60%)`;
    const title = el('h2', { class: 'nrl-name-wrap' }, chip, club.name);
    const views = segmented<RivalView>([
      { id: 'pitch', label: 'Pitch ⊞', title: 'The side they would field' },
      { id: 'list', label: 'List ☰', title: 'Their whole squad' },
    ], rivalView, (id) => { rivalView = id; render(); }, { class: 'nrl-rival-view', label: 'Squad view' });
    for (const [id, b] of views.buttons) {
      // The word gives way to the glyph on a narrow sheet (the label stays for a screen reader).
      const [word, glyph] = (b.textContent ?? '').split(' ');
      b.replaceChildren(el('span', { class: 'nrl-rival-view-word', text: `${word} ` }), glyph ?? '');
      b.setAttribute('aria-label', word ?? id);
      b.setAttribute('data-rival-view', id);
      b.removeAttribute('data-seg');
    }
    const edit = button('Edit club', () => {
      draft = { name: club.name, colors: [club.colors[0], club.colors[1]] };
      render();
    }, { class: 'nrl-rival-edit' });
    edit.setAttribute('data-rival-edit', '');
    // Between the top and the dock like a sheet (#343): the club and how it plays
    // in one header row beside the ✕, and only the squad (or the editor) scrolls.
    content.replaceChildren(
      el('div', { class: 'nrl-rival-head' },
        title,
        el('div', { class: 'nrl-rival-lines' },
          draft
            ? line('Rename the club and pick its kit. Results already played keep the old name.', {})
            : line(`Usual: ${tacticsLabel(style).replace(' / ', '/')} ${fitRead(theirs, style.attack).stars}/${fitRead(theirs, style.defence).stars}`, { 'data-style': `${style.attack}/${style.defence}`, 'data-usual-fit': '' }),
          ...(!draft ? [line(matchupRead(ours, theirs, validTactics(state.lineup.tactics), style), { 'data-matchup': '' }), line(counterRead(ours, style.defence), { 'data-counters': '' })] : []),
          ...(!draft && behind ? [line(`When behind: ${behind}`, { 'data-when-behind': '' })] : []),
        ),
        ...(draft ? [] : [views.el, edit]),
      ),
      draft ? rivalClubEditor(club, draft, {
        changed: render,
        cancel: () => { draft = null; render(); },
        save: (name, colors) => {
          const res = renameClub(getState(), club.id, name, colors);
          if (!res.ok) return res.why;
          draft = null;
          if (res.patch) {
            // The League sheet under this one draws itself again on the change, where it was scrolled to (#603).
            setState(res.patch);
            save(getState());
          }
          render();
          return null;
        },
      }) : rivalView === 'pitch' && rows.length > 0 ? rivalPitch(club) : squadTable(club, rows),
    );
  };
  render();
  return openModal(content, { class: 'nrl-rival-modal', region: true, closeButton: true });
}
