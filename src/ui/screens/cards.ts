import { BOARD } from '../../config';
import { bus } from '../../core/events';
import { getState, type CardHistoryEntry, type CardOffer, type GameState } from '../../core/state';
import { CARD_WEEK, SIGNATURE_TRAIT, cardDefById } from '../../data/cards';
import { PLAYS_BY_ID } from '../../data/plays';
import { fmtMoney } from '../../utils/money';
import { overallRating } from '../../data/player';
import { ROMAN, TRAITS, traitLevel } from '../../data/traits';
import { activeCard, cardHandView, discardHeldCard, pickBlocked, playChosenCard, preferredCardOffer, rerollCost, type CardFaceView } from '../../systems/cardWeek';
import { POSITION_SHORT } from '../../systems/lineup';
import { staffTitle } from '../../systems/staff';
import { cardAction, cardFacts, cardProblem, cardTargets, ensureCardStyles, openCardPick, picksWaitingText } from '../cardWeek';
import { el, openModal } from '../dom';

function activeLines(state: GameState): string[] {
  const cw = state.cardWeek!;
  const players = new Map(state.squad.map(p => [p.id, p]));
  return [
    ...cw.cardPlayers.flatMap(id => {
      const player = players.get(id);
      if (!player) return [];
      const recruit = cw.active.find(c => (c.kind === 'player' || c.kind === 'dilemma') && c.playerId === id);
      const signature = SIGNATURE_TRAIT[player.position];
      const trait = recruit?.kind === 'player' && traitLevel(player.traits, signature) ? ` · ${TRAITS[signature].name}` : '';
      const level = recruit ? ` · Level ${ROMAN[recruit.level]}${trait}` : '';
      const spells = player.clubHistory?.spells ?? [];
      const origin = spells[spells.length - 2];
      const source = recruit?.cardId.startsWith('steal-player:') && origin
        ? state.league.clubs.find(c => c.id === origin.clubId)?.name : undefined;
      return [`${player.name} · ${source ? `From ${source}` : 'Joined from a card'} · ${POSITION_SHORT[player.position]} · ${Math.round(overallRating(player))}${level}`];
    }),
    ...cw.cardTraits.flatMap(({ playerId, trait }) => {
      const player = players.get(playerId);
      const level = player && traitLevel(player.traits, trait);
      return player && level ? [`${TRAITS[trait].name} ${ROMAN[level]} on ${player.name}`] : [];
    }),
    ...cw.active.flatMap(card => {
      if (activeCard(state, card.cardId) !== card) return [];
      if (card.kind === 'staff') {
        const discount = (1 - CARD_WEEK.STAFF_WAGE_FACTOR[card.level]) * 100;
        return [`${card.member.name} · ${staffTitle(card.member)} · Level ${ROMAN[card.level]}${discount ? ` · Wage −${discount}%` : ''}`];
      }
      if (card.kind === 'setPlay') return [`${PLAYS_BY_ID[card.playId].name} · Level ${ROMAN[card.level]}`];
      return [];
    }),
  ];
}

function offerSource(state: GameState, offer: CardOffer): string | undefined {
  const clubId = offer.cards.find(card => card.fromClubId)?.fromClubId;
  return state.league.clubs.find(c => c.id === clubId)?.name;
}

const HISTORY_ACTION: Record<NonNullable<CardHistoryEntry['action']>, string> = {
  take: 'Took', play: 'Played', discard: 'Discarded', pass: 'Passed a pick', expire: 'Pick expired', reroll: 'Rerolled a pick',
};

function historyLine(state: GameState, entry: CardHistoryEntry): string {
  const match = state.competitions?.instances.find(instance => instance.season === entry.season && instance.definition.format.kind === 'league'
    && instance.fixtures.some(f => f.slot === entry.week && (f.homeId === state.clubId || f.awayId === state.clubId)));
  const fixture = match?.fixtures.find(f => f.slot === entry.week && (f.homeId === state.clubId || f.awayId === state.clubId));
  const stage = fixture && match?.definition.stages.find(s => s.id === fixture.stageId);
  const date = fixture && stage
    ? stage.kind === 'knockout' ? `${stage.name} · Round ${fixture.round}` : `Round ${fixture.round}`
    : `Week ${entry.week}`;
  const action = entry.action ?? (entry.cardId === 'pass' ? 'pass' : 'take');
  const card = ['take', 'play', 'discard'].includes(action) ? ` ${cardDefById(entry.cardId)?.title ?? entry.cardId}` : '';
  return `Season ${entry.season} · ${date} · ${HISTORY_ACTION[action]}${card}`;
}

export function openCardsScreen(): HTMLElement | null {
  if (!getState().cardWeek) return null;
  ensureCardStyles();
  const content = el('div', { class: 'nrl-cards-content', attrs: { 'data-cards-screen': '' } });
  let target: CardFaceView | undefined;
  let historyOpen = false;
  let problem = '';

  const play = (face: CardFaceView, id?: string): void => {
    target = undefined;
    const result = playChosenCard('hand', face.index, id);
    problem = result.ok ? '' : result.reason;
    render();
  };

  const render = (): void => {
    const state = getState();
    const cw = state.cardWeek;
    if (!cw) return;
    const blocked = pickBlocked(state);
    content.replaceChildren(el('h2', { text: 'Cards' }));
    if (problem) content.append(el('p', { class: 'nrl-card-problem', text: problem, attrs: { role: 'alert' } }));
    if (target) {
      content.append(cardTargets(state, target, (id) => play(target!, id), () => { target = undefined; render(); }));
      return;
    }

    const count = cw.offers.length;
    const pick = cardAction('Pick', () => openCardPick(), blocked, true);
    pick.setAttribute('data-cards-pick', '');
    const waiting = el('section', {},
      el('div', { class: 'nrl-cards-picks' },
        el('div', {}, el('h3', { text: 'Picks waiting' }),
          el('p', { text: count ? picksWaitingText(count, cw.starterLeft) : 'No picks waiting.' })),
        ...(count ? [pick] : [])));
    if (count > 1) {
      const preferred = preferredCardOffer(state);
      const list = el('div', { class: 'nrl-cards-offers' });
      for (const [index, offer] of cw.offers.entries()) {
        const source = offerSource(state, offer);
        const label = offer.kind === 'starter' ? `Starter pick ${index + 1}`
          : `Match pick · Season ${offer.season}, Week ${offer.week}${source ? ` · From ${source}` : ''}`;
        const open = cardAction(label, () => openCardPick(offer.grant), blocked);
        open.setAttribute('data-cards-offer', String(offer.grant));
        if (offer === preferred && offer.kind !== 'starter') open.append(el('span', { class: 'nrl-cards-latest', text: 'Latest' }));
        list.append(open);
      }
      waiting.append(list);
    } else if (count === 1) {
      pick.setAttribute('data-cards-offer', String(cw.offers[0]!.grant));
    }
    if (count) {
      const source = count === 1 ? offerSource(state, cw.offers[0]!) : undefined;
      if (source) waiting.append(el('p', { class: 'nrl-card-source', text: `From ${source}` }));
      const reroll = cw.offers.some(o => o.kind !== 'decree') ? `Next reroll ${fmtMoney(rerollCost(state))}` : 'Decree picks cannot be rerolled.';
      waiting.append(el('p', { class: 'nrl-card-hint', text: reroll }));
    }
    content.append(waiting);
    if (count && blocked) content.append(cardProblem(blocked));

    const hand = cardHandView(state);
    const grid = el('div', { class: 'nrl-cards-hand' });
    for (const face of hand) {
      const box = cardFacts(face);
      box.setAttribute('data-hand-card', face.cardId);
      box.append(el('span', { class: 'nrl-card-hint', text: face.hint }));
      if (face.refusal) box.append(cardProblem(face.refusal));
      const use = cardAction('Play', () => {
        if (face.targets) { target = face; render(); }
        else play(face);
      }, face.refusal, true);
      use.setAttribute('data-hand-play', String(face.index));
      const discard = cardAction('Discard', () => {
        const result = discardHeldCard(face.index);
        problem = result.ok ? '' : result.reason;
        render();
      }, blocked);
      discard.setAttribute('data-hand-discard', String(face.index));
      box.append(el('div', { class: 'nrl-card-buttons' }, use, discard));
      grid.append(box);
    }
    const active = activeLines(state);
    const list = (lines: readonly string[]) => el('ul', {}, ...lines.map(text => el('li', { text })));
    const history = el('details', {}, el('summary', { text: 'History' }),
      cw.history.length ? list([...cw.history].reverse().map(h => historyLine(state, h))) : el('p', { text: 'No card activity yet.' }));
    history.open = historyOpen;
    history.addEventListener('toggle', () => { historyOpen = history.open; });
    content.append(
      el('section', {}, el('h3', { text: `Hand (${hand.length}/${CARD_WEEK.HAND_CAP})` }), hand.length ? grid : el('p', { text: 'Take cards to keep them here.' })),
      el('section', {}, el('h3', { text: 'Active' }), active.length ? list(active) : el('p', { text: 'No active cards.' }),
        el('p', { text: `Board patience ${state.boardPatience}/${BOARD.MAX_PATIENCE}` })),
      history,
    );
  };

  render();
  const unsubscribe = bus.on('state:changed', () => { if (!target) render(); });
  return openModal(content, { screen: true, key: 'cards', class: 'nrl-cards-screen', closeButton: true, onRemove: unsubscribe });
}
