// src/ui/screens/rivalSquad.ts — read-only view of a rival club's squad, opened
// from the Ladder (GitHub #74). The rows come from a pure view-model that is
// unit-tested without the DOM. No Phaser.
import type { RivalClub } from '../../core/state';
import { overallRating } from '../../data/player';
import { ROMAN, TRAITS } from '../../data/traits';
import { el, openModal } from '../dom';
import { rivalStyle } from '../../systems/rivalRound';
import { hasStaff } from '../../systems/staff';
import { getState } from '../../core/state';
import { tacticsLabel } from '../../match/league/presets';
import { whenBehindLine } from '../tacticsBlurbs';
import { openPlayerPage } from './player';

export interface RivalSquadRow {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  traits: string; // e.g. "HIT II · FIN I"
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
      traits: p.traits.map((t) => `${TRAITS[t.id].short} ${ROMAN[t.level]}`).join(' · '),
      injuredWeeks: p.injuredWeeks,
    }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
}

/** Open the squad dialog for `club` (over the League screen). */
export function openRivalSquad(club: RivalClub): HTMLElement {
  const rows = rivalSquadRows(club);
  const style = rivalStyle(club);
  const table = el('table', { class: 'nrl-rival-table' });
  const head = el('tr');
  for (const h of ['Player', 'Pos', 'Age', 'Ovr', 'Skills']) head.append(el('th', { text: h }));
  table.append(el('thead', {}, head));
  const body = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    // A row opens the player's page (N7, #185); Close brings this squad back.
    const player = club.squad?.find((p) => p.id === r.id);
    if (player) {
      tr.className = 'nrl-rival-row';
      tr.setAttribute('role', 'button');
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('data-player-open', r.id);
      const open = (): void => { openPlayerPage(player, { kind: 'rival', club }, { onClose: () => openRivalSquad(club) }); };
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    tr.append(
      el('td', { text: r.injuredWeeks > 0 ? `${r.name} (inj ${r.injuredWeeks}w)` : r.name }),
      el('td', { text: r.position }),
      el('td', { text: String(r.age) }),
      el('td', { text: String(r.overall) }),
      el('td', { class: 'nrl-rival-traits', text: r.traits }),
    );
    body.append(tr);
  }
  table.append(body);
  const behind = hasStaff(getState(), 'analyst') ? whenBehindLine(style) : null;
  const line = (text: string, attrs: Record<string, string>): HTMLElement => el('p', { text, attrs: { ...attrs, title: text } });
  // Between HUD and nav like a screen (#343): the club and how it plays in one
  // block beside the ✕, and only the squad scrolls.
  const content = el(
    'div',
    { class: 'nrl-rival-squad' },
    el('div', { class: 'nrl-rival-head' },
      el('h2', { text: club.name }),
      line(`Strength ${club.strength} · plays ${tacticsLabel(style)} · ${rows.length} players · tap a player for his page`, { 'data-style': `${style.attack}/${style.defence}` }),
      ...(behind ? [line(`When behind: ${behind}`, { 'data-when-behind': '' })] : []),
    ),
    rows.length > 0
      ? el('div', { class: 'nrl-rival-scroll' }, table)
      : el('p', { text: 'No squad on record.' }),
  );
  return openModal(content, { class: 'nrl-rival-modal', region: true, closeButton: true });
}
