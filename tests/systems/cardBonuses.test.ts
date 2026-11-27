import { afterEach, describe, expect, it } from 'vitest';
import { selectPack } from '../../src/content';
import { createNewGame, newCardWeek, type ActiveCard, type Fixture, type GameState } from '../../src/core/state';
import { CARD_WEEK, type DecreeId } from '../../src/data/cards';
import { PLAY_IDS, PLAYS_BY_ID } from '../../src/data/plays';
import { cardSheetBonuses } from '../../src/systems/cardBonuses';
import { LINEUP_SLOTS, resolveLineup } from '../../src/systems/lineup';
import { applyTraining, trainWeek } from '../../src/systems/training';
import { bus } from '../../src/core/events';

const club = (): GameState => {
  selectPack('au');
  const s = createNewGame('Sheet FC', 41);
  return { ...s, cardWeek: newCardWeek(41) };
};

const home = (s: GameState): Fixture => ({ round: 7, homeId: s.clubId, awayId: 'visitor' });
const adopt = (s: GameState, id: DecreeId): GameState => ({
  ...s, cardWeek: { ...s.cardWeek!, decree: { id, season: s.season },
    active: [...s.cardWeek!.active, { cardId: id, kind: 'decree', season: s.season, week: s.week, level: 1 }] },
});
const widthPlay = PLAY_IDS.find(id => PLAYS_BY_ID[id].family === 'width')!;
const directPlay = PLAY_IDS.find(id => PLAYS_BY_ID[id].family === 'direct')!;

afterEach(() => bus.clear());

describe('sheet Decrees', () => {
  it('adds Width once when taking one or more owned width-family plays', () => {
    const original = adopt(club(), 'width');
    const s = { ...original, playbook: { owned: [widthPlay, directPlay] }, lineup: { ...original.lineup, plays: [widthPlay, directPlay] } };
    expect(cardSheetBonuses(s, home(s))).toMatchObject({ attack: 3 });
    expect(cardSheetBonuses({ ...s, lineup: { ...s.lineup, plays: [directPlay] } }, home(s)).attack).toBe(0);
    expect(cardSheetBonuses({ ...s, playbook: { owned: [directPlay] } }, home(s)).attack).toBe(0);
    expect(cardSheetBonuses({ ...s, season: s.season + 1 }, home(s)).attack).toBe(0);
  });

  it('adds Through the middle to pack slots and forwards on the bench', () => {
    const s = adopt(club(), 'throughTheMiddle');
    const picked = resolveLineup(s.lineup, s.squad);
    const wanted = ['prop', 'second-row', 'lock', 'hooker'];
    const { strengthByPlayer } = cardSheetBonuses(s, home(s), picked);
    picked.starters.forEach((p, i) => {
      if (p) expect(strengthByPlayer.get(p.id)).toBe(wanted.includes(LINEUP_SLOTS[i]!) ? 2 : undefined);
    });
    picked.bench.forEach(p => expect(strengthByPlayer.get(p.id)).toBe(wanted.includes(p.position) ? 2 : undefined));
  });

  it('applies Fortress to home starters and skips away and neutral matches', async () => {
    const base = adopt(club(), 'fortress');
    const picked = resolveLineup(base.lineup, base.squad);
    const bonus = cardSheetBonuses(base, home(base));
    expect([...bonus.ratingByPlayer]).toEqual(picked.starters.flatMap(p => p ? [[p.id, 2]] : []));
    expect(cardSheetBonuses(base, { round: 7, homeId: 'opponent', awayId: base.clubId }).ratingByPlayer.size).toBe(0);
    const { prepareLeagueCareer } = await import('../../src/systems/leagueCareerSetup');
    const s = adopt(await prepareLeagueCareer({ seed: 41, clubName: 'Neutral FC', cardWeek: true }), 'fortress');
    const instance = s.competitions!.instances.find(i => i.fixtures.some(f => f.homeId === s.clubId))!;
    const fixture = instance.fixtures.find(f => f.homeId === s.clubId)!;
    const neutral = { ...s, competitions: { ...s.competitions!, instances: [{ ...instance, fixtures: [{ ...fixture, neutral: true }] }] } };
    expect(cardSheetBonuses(neutral, { ...home(s), id: fixture.id, competitionId: instance.id }).ratingByPlayer.size).toBe(0);
  });

  it('adds Next man up to interchange players only', () => {
    const s = adopt(club(), 'nextManUp');
    const picked = resolveLineup(s.lineup, s.squad);
    expect(picked.bench.length).toBeGreaterThan(0);
    expect([...cardSheetBonuses(s, home(s)).ratingByPlayer]).toEqual(picked.bench.map(p => [p.id, 3]));
  });

  it('gives training XP to an eligible 21-year-old and leaves a 22-year-old on normal XP', () => {
    const base = club();
    const s = adopt({ ...base, squad: base.squad.map((p, i) => ({ ...p, age: i === 0 ? 21 : 22, xp: 0 })) }, 'youthFirst');
    // applyTraining publishes the squad into the store, as its normal tick does.
    const trained = applyTraining(s);
    const [young, older] = s.squad;
    const normalYoung = trainWeek(young!, s.facilities, s.training.focus);
    expect(trained.squad[0]!.xp).toBeGreaterThan(normalYoung.xp!);
    expect(trained.squad[0]).toEqual(trainWeek(young!, s.facilities, s.training.focus, false, { xpFactor: 1.25 }));
    expect(trained.squad[1]).toEqual(trainWeek(older!, s.facilities, s.training.focus));
  });
});

describe('shared bonus cap', () => {
  it('caps stacked Decree, set play and buffs at eight and uses the strongest copy of an identical buff', () => {
    const base = adopt(club(), 'nextManUp');
    const { bench, starters } = resolveLineup(base.lineup, base.squad);
    const [first, second] = bench;
    const buff = { kind: 'buff' as const, cardId: 'future-squad-buff', level: 1 as const, season: base.season, week: base.week };
    const active: ActiveCard[] = [
      ...base.cardWeek!.active,
      { kind: 'setPlay', cardId: 'setPlay', level: 3, playId: widthPlay },
      buff, { ...buff, level: 2 }, buff,
      { ...buff, cardId: 'future-player-buff', level: 3, playerId: first!.id },
    ];
    const s = { ...base, cardWeek: { ...base.cardWeek!, active },
      playbook: { owned: [widthPlay] }, lineup: { ...base.lineup, plays: [widthPlay] } };
    const before = JSON.stringify(s);
    const bonus = cardSheetBonuses(s, home(s));
    expect(bonus.plays).toEqual([`${widthPlay}:III`]);
    expect(bonus.playRating).toBe(2);
    expect(bonus.ratingByPlayer.get(first!.id)! + bonus.playRating).toBe(CARD_WEEK.SHEET_BONUS_CAP);
    expect(bonus.ratingByPlayer.get(second!.id)! + bonus.playRating).toBe(8);
    expect(bonus.ratingByPlayer.get(starters[0]!.id)).toBe(3);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('keeps Width and multiple levelled plays within the same cap', () => {
    const base = adopt(club(), 'width');
    const plays = [widthPlay, ...PLAY_IDS.filter(id => id !== widthPlay).slice(0, 2)];
    const s = { ...base, cardWeek: { ...base.cardWeek!, active: [
      ...base.cardWeek!.active, ...plays.map(playId => ({ cardId: `steal-play:${playId}`, kind: 'setPlay' as const, level: 3 as const, playId })),
    ] }, playbook: { owned: plays }, lineup: { ...base.lineup, plays } };
    const bonus = cardSheetBonuses(s, home(s));
    expect(bonus.attack).toBe(3);
    expect(bonus.plays).toEqual([`${plays[0]}:III`, `${plays[1]}:III`, `${plays[2]}:II`]);
    expect(bonus.attack + bonus.playRating).toBe(8);
  });
});
