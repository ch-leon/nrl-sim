import type { GameState } from '../core/state';
import type { PlayerCareerHistory } from '../data/playerCareer';
import { fmtMoney } from '../utils/money';
import { el } from './dom';

type PersonHistory = { clubHistory?: PlayerCareerHistory };
/** Resolve stable club IDs today, without inventing a signing before records began. */
export function playerHistoryLines(person: PersonHistory, state: Pick<GameState, 'clubId' | 'clubName' | 'league'>): string[] {
  return (person.clubHistory?.spells ?? []).map(spell => {
    const name = spell.clubId === state.clubId ? state.clubName : state.league.clubs.find(c => c.id === spell.clubId)?.name ?? spell.clubId;
    const arrival = spell.arrival === 'observed' ? 'At this club when records began'
      : spell.arrival === 'opening' ? 'Opening squad' : spell.arrival === 'emergency' ? 'Emergency scholarship'
      : spell.arrival === 'transfer' ? 'Transferred in' : 'Signed';
    const from = spell.arrival === 'observed' ? `records from season ${spell.start.season}, week ${spell.start.week}` : `season ${spell.start.season}, week ${spell.start.week}`;
    const end = spell.end ? `${spell.departure} · season ${spell.end.season}, week ${spell.end.week}` : 'Current club';
    const fee = spell.transferFee === undefined ? '' : ` · fee ${fmtMoney(spell.transferFee)}`;
    return `${name} — ${arrival} · ${from}${fee} · ${end}`;
  });
}

export function playerHistory(person: PersonHistory, state: GameState): HTMLElement {
  const lines = playerHistoryLines(person, state);
  return el('section', { attrs: { 'data-club-history': '' } }, el('h3', { text: 'Club history' }),
    ...lines.map(text => el('p', { class: 'nrl-player-line', text })),
    ...(lines.length ? [] : [el('p', { class: 'nrl-player-line', text: 'No recorded club spells.' })]));
}

/** Compact archive is readable from History, with no selection or deal controls. */
export function retiredPlayerRecords(state: GameState): HTMLElement {
  const records = [...state.playerPopulation.retired].sort((a, b) => b.retiredAt.season - a.retiredAt.season || b.retiredAt.week - a.retiredAt.week || a.name.localeCompare(b.name));
  const rows = records.map(p => {
    const tally = p.career;
    return el('article', { class: 'nrl-history-retired', attrs: { 'data-retired-player': p.id } },
      el('h3', { text: p.name }),
      el('p', { text: `Retired · age ${p.age} · ${p.position} · season ${p.retiredAt.season}, week ${p.retiredAt.week}` }),
      ...(tally ? [el('p', { text: `Career: ${tally.games} games · ${tally.tries} tries · ${tally.tackles} tackles · ${tally.lineBreaks} line breaks` })] : []),
      playerHistory(p, state));
  });
  return el('div', { class: 'nrl-history-records', attrs: { 'data-retired-records': '' } },
    ...(rows.length ? rows : [el('p', { text: 'No recorded retirements yet.' })]));
}
