import { CHALLENGE_CALL_NAMES as names, CHALLENGE_RATINGS, type ChallengeActor, type ChallengeCall, type ChallengeClash, type ChallengeEdition, type ChallengeProgress } from '../../data/individualChallengeRules';
import type { IndividualChallengeRecord } from '../../data/individualChallenges';
import { TRAITS } from '../../data/traits';
import { challengeTraitBonus } from '../../systems/individualChallengeEngine';
import { el } from '../dom';

export const callHint: Record<ChallengeCall,string> = {
  power: 'Drive straight with strength and footy IQ.',
  angle: 'Cut across the lane with speed and footy IQ.',
  controlled: 'Shorter strides save energy and narrow the range of outcomes.',
  shoot: 'Rush in with strength and speed. Big stops and clean breaks are both in play.',
  track: 'Follow the runner with speed and footy IQ.',
  wrap: 'Plant and hold with strength and footy IQ. Saves energy.',
};
export const outcomeName = ['Stopped short', 'Held on the marker', 'Clean breakthrough'] as const;
export const money = (n: number) => '$' + n.toLocaleString('en-AU');
export const paragraph = (text: string) => el('p', { text });

export function exactPercent(probability: number): string {
  // There are at most seven equally weighted 25-way draws. Recover the
  // integer numerator before formatting, avoiding floating point tail digits.
  return (100 * Math.round(probability * 25 ** 7) / 25 ** 7).toLocaleString('en-AU',{maximumFractionDigits:12}) + '%';
}
export function titleOdds(probability: number): string {
  if (probability > 0 && probability < .001) return '<0.1%';
  if (probability < 1 && probability > .999) return '>99.9%';
  return (100 * probability).toLocaleString('en-AU',{maximumFractionDigits:1}) + '%';
}
export function abilities(actor: ChallengeActor): HTMLElement {
  const label = { strength:'Strength',speed:'Speed',stamina:'Stamina',footyIQ:'Footy IQ' };
  const traits = (['power','angle','shoot'] as const).flatMap(call => {
    const bonus = challengeTraitBonus(actor,call);
    return bonus ? [paragraph(`${TRAITS[bonus.id].name} · +${bonus.bonus} to ${names[call]}`)] : [];
  });
  return el('div',{class:'duel-abilities'},el('dl',{},...CHALLENGE_RATINGS.map(key =>
    el('div',{},el('dt',{text:label[key]}),el('dd',{text:String(actor.ratings[key])})))),...traits);
}
export function lastClash(clash: ChallengeClash): string {
  const crew = clash.role === 'defend';
  const factors = clash.reasons.flatMap(reason => {
    switch(reason.kind) {
      case 'outcome': return [];
      case 'fatigue': return [`${reason.side === 'attack' ? 'Runner' : 'Defender'} fatigue cost ${reason.penalty10 / 10} rating`];
      case 'trait': return [`${TRAITS[reason.trait.id].name} added ${reason.trait.bonus} for the ${reason.side === 'attack' ? 'runner' : 'defender'}`];
      case 'matchup': return [`the matchup gave the ${reason.modifier > 0 ? 'runner' : 'defender'} +${Math.abs(reason.modifier)}`];
    }
  });
  const score = clash.bonus ? (clash.score === 2 ? 'bonus carry wins' : 'Mick retains the title') : `${crew ? 'crew' : 'your player'} +${clash.score}`;
  return `${names[clash.attack]} against ${names[clash.defence]}. ${outcomeName[clash.score]} · ${score}. ${factors.length ? factors.join(' · ') + '. ' : ''}Your energy ${clash.playerEnergyAfter}${clash.playerRecovery ? ` (includes +${clash.playerRecovery} between rivals)` : ''}.`;
}
export function decided(progress: ChallengeProgress): string | null {
  if (progress.result || progress.clashIndex >= 6) return null;
  const left = 6 - progress.clashIndex;
  const crewMax = progress.crewScore + 2 * Math.ceil(left / 2);
  const playerMax = progress.playerScore + 2 * Math.floor(left / 2);
  if (progress.playerScore > crewMax) return 'The title is yours. The remaining clashes still count toward your personal best margin.';
  if (progress.crewScore > playerMax) return 'The crew has the title. The remaining clashes still count toward your personal best margin.';
  return null;
}
export function report(record: IndividualChallengeRecord, edition: ChallengeEdition, qualified: boolean): HTMLElement {
  const panel = el('section',{class:'duel-receipt', attrs:{'data-challenge-podium':record.status}});
  if (record.status === 'cancelled' || record.status === 'interrupted') {
    panel.append(el('h3',{text:record.status === 'interrupted' ? 'Contest interrupted' : 'Entry cancelled'}),paragraph(`${record.participantName} · Season ${record.season}. ${record.reason ?? ''} No event award.`));
    return panel;
  }
  const contest = record.contest!;
  const won = contest.progress.result === 'won';
  const margin = contest.progress.playerScore - contest.progress.crewScore;
  panel.append(el('h3',{text:won ? edition.honour : 'The crew takes the title'}),
    paragraph(`${record.participantName} · Season ${record.season} · ${contest.progress.playerScore}–${contest.progress.crewScore}. Scoring margin ${margin > 0 ? '+' : ''}${margin}.`));
  if (contest.clashes.length === 7) panel.append(paragraph(`Bonus carry · ${outcomeName[contest.clashes[6]!.score]}.`));
  if (record.award) panel.append(el('strong',{text:'Settled on return'}),paragraph(`+${Math.round(record.award.xp.effectiveXp * 100) / 100} XP · ${money(record.award.cash)} club purse · ${record.award.xp.newPoints} new level points.`));
  else panel.append(el('strong',{text:'Earned · payable on return'}),paragraph(`${edition.completionXp + (won ? edition.winnerXp : 0)} base XP · ${money(won ? edition.winnerCash : 0)} club purse. Play the club interval to bring ${record.participantName} back before Week ${edition.returnWeek}.`));
  if (won && edition.id === 'showground') panel.append(paragraph(qualified ? "The club has earned permanent entry to Mick’s Invitational." : "Returning with the title will unlock Mick’s Invitational for your club."));
  panel.append(el('details',{},el('summary',{text:'Clash by clash'}),...contest.clashes.map((clash,i)=>paragraph(`${i+1}. ${lastClash(clash)}`))));
  return panel;
}
