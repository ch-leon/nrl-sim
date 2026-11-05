// An invented English-style competition. Match rules deliberately match AU.
import { AU_LEAGUE, AU_RULES } from './au';
import type { ContentPack } from './pack';

export const UK_PACK: ContentPack = {
  id: 'uk',
  league: { ...AU_LEAGUE, seasonRounds: 22, finalsWeeks: 3, rating: { ...AU_LEAGUE.rating } },
  rules: AU_RULES,
  clubs: [
    { id: 'rival-uk-0', name: 'Ashcombe Lanterns', colors: ['#682a72', '#ffcf70'], strength: 70 },
    { id: 'rival-uk-1', name: 'Bramblewick Foundry', colors: ['#167d8d', '#eed8aa'], strength: 68 },
    { id: 'rival-uk-2', name: 'Cinder Vale Comets', colors: ['#773b53', '#8de3df'], strength: 63 },
    { id: 'rival-uk-3', name: 'Dunmere Spires', colors: ['#a95522', '#f4dfba'], strength: 61 },
    { id: 'rival-uk-4', name: 'Emberford Anvils', colors: ['#263a66', '#d6a6e8'], strength: 59 },
    { id: 'rival-uk-5', name: 'Fallowbridge Weavers', colors: ['#633d28', '#7cddda'], strength: 56 },
    { id: 'rival-uk-6', name: 'Gorsehaven Kites', colors: ['#634e91', '#e6bd48'], strength: 54 },
    { id: 'rival-uk-7', name: 'Hollowbeck Sparks', colors: ['#8c384b', '#bbd68c'], strength: 52 },
    { id: 'rival-uk-8', name: 'Ivymoor Millers', colors: ['#296268', '#e9ad76'], strength: 50 },
    { id: 'rival-uk-9', name: 'Juniper Fold Rooks', colors: ['#3f476c', '#e9c894'], strength: 46 },
    { id: 'rival-uk-10', name: 'Kestrel Dene Cogs', colors: ['#89582c', '#c8d7ec'], strength: 42 },
  ],
  names: {
    first: ['Alfie', 'Bertie', 'Callum', 'Declan', 'Elliot', 'Freddie', 'Gareth', 'Hugo', 'Ivor', 'Jasper', 'Kit', 'Laurence', 'Monty', 'Ned', 'Orson', 'Percy', 'Quentin', 'Rupert', 'Stanley', 'Wilfred', 'Toby', 'Archie', 'Finn', 'Ollie'],
    last: ['Brackenwick', 'Cobblesquill', 'Dunmottle', 'Emberwick', 'Fallowden', 'Gorsewell', 'Hollowmere', 'Ivythorpe', 'Juniperby', 'Kestleden', 'Lanternby', 'Mossquill', 'Nettlecombe', 'Oatfen', 'Puddlewick', 'Quarryden', 'Rookmottle', 'Spindleby', 'Thistlewick', 'Umberfen', 'Velvetby', 'Wickerden', 'Yewmottle', 'Bramblequill'],
  },
  vocab: {
    iqStat: 'Rugby IQ', sport: 'rugby',
    stadiumSigns: { food: 'HOT PIES', sport: 'RUGBY', home: 'OUR CLUB', snack: 'CHIPS', score: 'TRY TIME', away: 'WELCOME', cheer: 'GET IN' },
  },
  events: {
    trip: {
      destination: 'the coast', title: 'Weekend at the coast',
      text: 'The season is done and the squad wants a weekend at the coast. The group chat is already full of beach games.',
      outcome: 'The squad is off to the coast.',
      hitNews: [
        '{player} missed the coach home. The seaside-bar video is doing the rounds, and the club has stood him down.',
        '{player} came back with the club crest tattooed upside down and a bar tab the sponsor has already seen. The club has stood him down.',
      ],
      missNews: 'The weekend stayed in the group chat and off the back page.',
    },
    cardText: {},
  },
};
