// Real club-to-club transfers: quote without writes, then revalidate and commit once.
import { getState, setState, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { weekHeld } from '../core/time';
import { SQUAD_CAP, SQUAD_MIN } from '../config';
import { overallRating } from '../data/player';
import { saleOfferQuote } from '../data/financeRules';
import { commitment, publishedCap, reconcileProtection, salaryDemand, type CapAccount } from './cap';
import { bookPlayerMovement, closeClubSpell, openClubSpell, ownerOf } from './playerCareer';
import { withDerivedStrength } from './rivals';
import type { SignResult } from './freeagency';

export interface SaleOffer {
  playerId: string; sellerId: string; buyerId: string; fee: number;
  season: number; week: number; playerFingerprint: string;
}
type Refusal = { ok: false; reason: string; message: string };
export type SalePreview = { ok: true; offer: SaleOffer; buyerCommitments: { season: number; used: number; cap: number }[] } | Refusal;
export type SaleTransition = { ok: true; state: GameState; offer: SaleOffer } | Refusal;
const refuse = (reason: string, message: string): Refusal => ({ ok: false, reason, message });
const validMoney = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;
function fingerprint(p: Player): string {
  return JSON.stringify({ id: p.id, name: p.name, position: p.position, age: p.age,
    stats: p.stats, ceilings: p.ceilings, deal: p.deal, contractWeeks: p.contractWeeks,
    history: p.clubHistory, emergency: p.emergencyDealEndSeason });
}
function club(state: GameState, id: string): { squad: Player[]; cash: number; capAccount: CapAccount } | undefined {
  if (id === state.clubId) return { squad: state.squad, cash: state.money, capAccount: state.capAccount };
  const c = state.league.clubs.find(x => x.id === id);
  return c?.squad && c.cash !== undefined && c.capAccount ? { squad: c.squad, cash: c.cash, capAccount: c.capAccount } : undefined;
}
function terms(state: GameState, buyerId: string, p: Player) {
  const buyer = club(state, buyerId)!; const cap = publishedCap(buyer.capAccount);
  const end = p.deal?.renewal?.endSeason ?? p.deal?.endSeason ?? state.season;
  const rows: { season: number; used: number; cap: number }[] = [];
  for (let season = state.season; season <= end; season++) rows.push({ season, used: commitment([...buyer.squad, p], season), cap });
  return rows;
}
function check(state: GameState, sellerId: string, buyerId: string, playerId: string, fee: number): Refusal | null {
  const seller = club(state, sellerId); const buyer = club(state, buyerId);
  if (!seller || !buyer || sellerId === buyerId) return refuse('not-found', 'The named clubs are no longer available.');
  const p = seller.squad.find(x => x.id === playerId);
  try { if (!p || ownerOf(state, playerId) !== sellerId) return refuse('not-found', 'That player is no longer at the selling club.'); }
  catch { return refuse('invalid-owner', 'That player has conflicting ownership records.'); }
  if (!p!.deal || p!.deal.endSeason < state.season || !p!.clubHistory) return refuse('no-contract', 'There is no current agreement to transfer.');
  if ((p!.emergencyDealEndSeason ?? 0) >= state.season) return refuse('scholarship', 'An emergency scholarship cannot generate transfer proceeds.');
  if (seller.squad.length <= SQUAD_MIN) return refuse('squad-min', `The selling squad cannot drop below ${SQUAD_MIN}.`);
  if (buyer.squad.length >= SQUAD_CAP) return refuse('squad-full', 'The buying squad is full.');
  if (!validMoney(fee) || !validMoney(seller.cash) || !validMoney(buyer.cash) || !validMoney(seller.cash + fee)) return refuse('invalid-funds', 'The transfer requires valid club funds.');
  if (buyer.cash < fee) return refuse('insufficient-funds', 'The buying club cannot afford that fee.');
  if (terms(state, buyerId, p!).some(row => row.used > row.cap)) return refuse('over-cap', 'The existing deal and queued renewal do not fit the buyer’s salary cap.');
  return null;
}
function offerFor(state: GameState, sellerId: string, buyerId: string, p: Player, fee: number): SaleOffer {
  return { playerId: p.id, sellerId, buyerId, fee, season: state.season, week: state.week, playerFingerprint: fingerprint(p) };
}
/** Need first, then an improvement at the position, then stable club ID. No RNG. */
export function quotePlayerSale(state: GameState, playerId: string): SalePreview {
  const p = state.squad.find(x => x.id === playerId);
  if (!p) return refuse('not-found', 'Player not found.');
  if (state.squad.length <= SQUAD_MIN) return refuse('squad-min', `The squad cannot drop below ${SQUAD_MIN}.`);
  if ((p.emergencyDealEndSeason ?? 0) >= state.season) return refuse('scholarship', 'An emergency scholarship cannot generate transfer proceeds.');
  const fee = saleOfferQuote(salaryDemand(p));
  const candidates = state.league.clubs.filter(c => c.id !== state.clubId && c.squad).map(c => {
    const position = c.squad!.filter(x => x.position === p.position);
    return { id: c.id, need: Math.max(0, 2 - position.length), improvement: overallRating(p) - Math.max(0, ...position.map(overallRating)) };
  }).filter(c => (c.need > 0 || c.improvement > 0) && !check(state, state.clubId, c.id, p.id, fee))
    .sort((a, b) => b.need - a.need || b.improvement - a.improvement || a.id.localeCompare(b.id));
  const buyer = candidates[0];
  if (!buyer) return refuse('no-buyer', 'No club currently needs him and can fund his fee and existing contract. Nothing was changed.');
  return { ok: true, offer: offerFor(state, state.clubId, buyer.id, p, fee), buyerCommitments: terms(state, buyer.id, p) };
}
/** Shared pure boundary for authored rival offers and ordinary sales. */
export function transferBetweenClubs(state: GameState, sellerId: string, buyerId: string, playerId: string, fee: number): SaleTransition {
  const blocked = check(state, sellerId, buyerId, playerId, fee); if (blocked) return blocked;
  const seller = club(state, sellerId)!; const p = seller.squad.find(x => x.id === playerId)!;
  const offer = offerFor(state, sellerId, buyerId, p, fee);
  let moved = openClubSpell(closeClubSpell(p, state, 'transfer'), buyerId, state, 'transfer', fee);
  if (buyerId === state.clubId) moved = { ...moved, joinedSeason: state.season };
  const leaving = seller.squad.filter(x => x.id !== playerId);
  const arriving = [...club(state, buyerId)!.squad, moved];
  const clubs = state.league.clubs.map(c => {
    if (c.id === state.clubId || c.id !== sellerId && c.id !== buyerId) return c;
    const squad = c.id === sellerId ? leaving : arriving;
    return withDerivedStrength({ ...c, squad, cash: c.cash! + (c.id === sellerId ? fee : -fee),
      capAccount: reconcileProtection(squad, c.capAccount!, state.season) });
  });
  const ownSeller = sellerId === state.clubId; const ownBuyer = buyerId === state.clubId;
  const squad = ownSeller ? leaving : ownBuyer ? arriving : state.squad;
  let next: GameState = { ...state, squad, league: { ...state.league, clubs },
    capAccount: reconcileProtection(squad, state.capAccount, state.season),
    ...(ownSeller ? { lineup: { ...state.lineup,
      starters: state.lineup.starters.map(id => id === playerId ? null : id),
      bench: state.lineup.bench.filter(id => id !== playerId),
      captain: state.lineup.captain === playerId ? null : state.lineup.captain,
      kicker: state.lineup.kicker === playerId ? null : state.lineup.kicker } } : {}) };
  if (ownSeller || ownBuyer) next = bookPlayerMovement(next, ownSeller ? fee : -fee, 'transfers');
  return { ok: true, state: next, offer };
}
export function applyPlayerSale(state: GameState, offer: SaleOffer): SaleTransition {
  if (offer.sellerId !== state.clubId || offer.season !== state.season || offer.week !== state.week) return refuse('stale-offer', 'This offer has expired. Review a new offer.');
  const preview = quotePlayerSale(state, offer.playerId);
  if (!preview.ok || Object.keys(preview.offer).some(key => preview.offer[key as keyof SaleOffer] !== offer[key as keyof SaleOffer])) return refuse('stale-offer', 'The player or buying club’s terms have changed. Review a new offer.');
  return transferBetweenClubs(state, offer.sellerId, offer.buyerId, offer.playerId, offer.fee);
}
export function confirmPlayerSale(offer: SaleOffer): SignResult {
  if (weekHeld()) return refuse('match-active', 'Finish the current match before making a transfer.');
  const result = applyPlayerSale(getState(), offer); if (!result.ok) return result;
  setState(result.state);
  bus.emit('money:changed', { delta: offer.fee, reason: `sell:${offer.playerId}`, balance: result.state.money, booked: true, stamp: { season: offer.season, week: offer.week } });
  return { ok: true };
}
