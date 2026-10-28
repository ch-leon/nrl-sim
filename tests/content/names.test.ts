import { describe, it, expect } from 'vitest';
import { AU_PACK } from '../../src/content/au';
import { RIVAL_CLUBS } from '../../src/data/league';
import { generatedBench, generatedRoster } from '../../src/match/league/sheets';

// #398: the name pools are invented, and the pack says nothing it may not. No
// pool surname is a current NRL or NRLW player's (so no generated name can be a
// current player's full name), a near-miss pun on one, or a well-known name from
// the game's past; no club takes an NRL nickname, and no pack text says NRL,
// State of Origin or Kangaroos. Test data only: nothing here ships in the game.

/**
 * Every surname on the 2026 NRL and NRLW club lists (all 17 NRL and 12 NRLW
 * clubs' top squads, nrl.com's player directory, 28 Oct 2026). Re-check it
 * when the pools change.
 */
const CURRENT_SURNAMES: readonly string[] = [
  'Adams', 'Addo-Carr', 'Afoa', 'Ahsam', 'Aiken', 'Aitken', 'Alameddine', 'Alamoti', 'Albert', 'Albert-Jones',
  'Ale', 'Alo', 'Amiatu', 'Anderson', 'Andrews', 'Apps', 'Arrow', 'Arthars', 'Arthur', 'Asaua', 'Ashby',
  'Asomua', 'Ataata', 'Atai', 'Atkinson', 'Auloa', 'Averillo', 'Bai', 'Baker', 'Bamblett', 'Banu', 'Barber',
  'Barnes', 'Barnett', 'Bartlett', 'Barton', 'Basham', 'Bass', 'Bassingthwaighte', 'Bateman', 'Baxter',
  'Beckett', 'Bent', 'Berrell', 'Berry', 'Berryman-Duff', 'Best', 'Betham', 'Biddle', 'Bird', 'Black',
  'Blackwell', 'Blore', 'Bostock', 'Bourke', 'Bowden', 'Boyd', 'Boyle', 'Bradley', 'Brailey', 'Brander',
  'Brigginshaw', 'Brill', 'Brimson', 'Broederlow', 'Brookfield', 'Brooks', 'Broughton', 'Brown', 'Browne',
  'Bryan', 'Buchanan', 'Bukowski', 'Bula', 'Bullemor', 'Burns', 'Burton', 'Butcher', 'Butler', 'Byers',
  'Campbell', 'Cant', 'Capewell', 'Cardwell', 'Carlile', 'Carrigan', 'Carter', 'Cesari', 'Chan Kum Tong',
  'Chapman', 'Cherrington', 'Cherry-Evans', 'Chester', 'Christensen', 'Church', 'Churchill', 'Ciesiolka',
  'Clark', 'Clarke', 'Cleary', 'Clifford', 'Clydsdale', 'Coates', 'Cobbo', 'Cogger', 'Cole', 'Collett',
  'Collins', 'Colquhoun', 'Condon', 'Conn', 'Conti', 'Cook', 'Coric', 'Cotter', 'Couchman', 'Courtenay',
  'Crichton', 'Crichton Ropati', 'Croker', 'Cross', 'Crossland', 'Crouch', 'Curran', 'Curtis', 'Da Silva',
  'Dam', 'Davis-Welsh', 'De Belin', 'De Courcey', 'De Groot', 'Dearden', 'Derby', 'Desic', 'Dibb', 'Dodd',
  'Donoghoe', 'Doorey', 'Doueihi', 'Drinkwater', 'Duffy', 'Dufty', 'Dykes', 'Dymock', 'Edgar', 'Edwards',
  'Egan', 'Ekepati', 'Elaro', 'Elliott', 'Elliston', 'Fa\'amausili', 'Fa\'asuamaleaui', 'Faalogo', 'Faeamani',
  'Fagalilo', 'Faifua', 'Fainu', 'Falaniko', 'Fale', 'Farnworth', 'Farragher', 'Fatialofa', 'Faulalo',
  'Faulkner', 'Fay', 'Feagai', 'Feledy', 'Feleti', 'Ferguson', 'Fermor', 'Fetalaiga', 'Fifita', 'Finau',
  'Finefeuiaki', 'Fisher-Harris', 'Fitzgibbon', 'Flanagan', 'Flegler', 'Fletcher', 'Fogarty', 'Foketi',
  'Foley', 'Fonua', 'Fonua-Blake', 'Ford', 'Fotu-Moala', 'Fotuaika', 'Francis', 'Fressard', 'Frizell',
  'Fuimaono', 'Fuller', 'Funa', 'Gabrael', 'Gagai', 'Gallagher', 'Galvin', 'Gamble', 'Gannon', 'Garlick',
  'Garner', 'Garrick', 'Garton', 'George', 'Gesa', 'Gevers', 'Geyer', 'Giampino', 'Gilbert', 'Ginn', 'Glover',
  'Goldthorp', 'Gosiewski', 'Goulding', 'Graham', 'Graham-Taufa', 'Grant', 'Gray', 'Grey', 'Guler',
  'Gutherson', 'Guymer', 'Haas', 'Hagan', 'Halangahu', 'Halasima', 'Hale', 'Hall', 'Hanisi', 'Hannaway',
  'Harden', 'Harris-Tavita', 'Harrison', 'Harrison-Leaunoa', 'Hart', 'Hassett', 'Hau', 'Hayes', 'Hayward',
  'Haywood', 'Hazelton', 'Healey', 'Henderson', 'Henry', 'Herbert', 'Herdegen', 'Herman', 'Hess',
  'Hetherington', 'Hickling', 'Hicks', 'Hifo', 'Higgins', 'Hill-Moana', 'Hinchey', 'Hinckesman', 'Hippi',
  'Hiroti', 'Hoeter', 'Hola', 'Holmes', 'Holyman', 'Hope', 'Hopgood', 'Hopkins', 'Hopoate', 'Hopoi', 'Hopwood',
  'Horsburgh', 'Hosking', 'Host', 'Howarth', 'Hoy', 'Huakau', 'Hubner', 'Hudson', 'Hufanga', 'Hughes',
  'Humphreys', 'Humphries', 'Hunt', 'Huriwai', 'Hutchinson', 'Hynes', 'Ibrahim', 'Ieli', 'Ieremia',
  'Ieremia-Toeava', 'Ikenasio', 'Ilias', 'Ingram', 'Ioelu', 'Iongi', 'Iro', 'Isa\'ako', 'Isaako', 'Ison',
  'Jackson', 'Jenkins', 'Jennings', 'Jensen', 'Jnr Pasifiki Tonga', 'Johnson', 'Johnston', 'Johnston-Green',
  'Jolliffe', 'Jones', 'Joseph', 'Kailahi', 'Kama', 'Kamikamica', 'Kapua', 'Karapani', 'Karpani', 'Katoa',
  'Kaufusi', 'Kautoga', 'Keeley', 'Kelleher', 'Kelly', 'Kemp', 'Kennard-Ellis', 'Kennedy', 'Kenny', 'Kepaoa',
  'Keppie', 'Kernick', 'Kerrisk', 'Keung', 'Khan-Pereira', 'Kia', 'Kimber', 'King', 'Kini', 'Kira', 'Kiraz',
  'Kiria-Ratu', 'Kirkpatrick', 'Kitai', 'Knowles', 'Kolc', 'Koloamatangi', 'Koroisau', 'Kosi', 'Koster',
  'Koula', 'Kris', 'Kukutai', 'La Salle Va\'a', 'Laban', 'Lahmert', 'Lahrs', 'Laiafi', 'Lanyon', 'Large',
  'Latu', 'Lauitiiti', 'Laulilii', 'Laurie', 'Law', 'Lawrie', 'Laybutt', 'Le Blanc', 'Leatupue', 'Lee',
  'Leiataua', 'Leilua', 'Lemuelu', 'Lenarduzzi', 'Lenaz', 'Lendill', 'Leniu', 'Leo', 'Leota', 'Leuluai-Going',
  'Levi', 'Lewis', 'Liddle', 'Linnane', 'Lisati', 'Liu', 'Lloyd-Phillips', 'Lodge', 'Lofipo', 'Loiero',
  'Lokotui', 'Lolesio', 'Lomas', 'Lopamaua', 'Losalu', 'Luadaka', 'Luai', 'Lucas', 'Lui', 'Luke', 'Luki',
  'Lussick', 'Lutu', 'Maaka', 'MacDonald', 'MacGregor', 'Madden', 'Mafi', 'Mahakitau-Monschau', 'Mahoney',
  'Maire Martin', 'Makasini', 'Maliepo', 'Malupo', 'Mam', 'Mamouzelos', 'Manera', 'Mann', 'Manuleleua',
  'Manzelmann', 'Mara', 'Mariner', 'Mariota', 'Marshall-King', 'Marsters', 'Martin', 'Marzhew', 'Masaga',
  'Mataele', 'Matapo', 'Mato', 'Matterson', 'Matthews', 'May', 'Maynard-Perrin', 'McArthur', 'McCarthy',
  'McEwen', 'McGrath', 'McGrath-West', 'McGregor', 'McInnes', 'McIntyre', 'McKenzie', 'McLean', 'McWilliams',
  'Meakes', 'Meaney', 'Medland', 'Mellars', 'Metcalf', 'Mikaele', 'Milford', 'Milin', 'Millard',
  'Mino-Sinapati', 'Misa', 'Mitchell', 'Moale', 'Molo', 'Monschau', 'Montgomery', 'Montoya', 'Mooney',
  'Moretti', 'Morgan', 'Morrin', 'Morris', 'Morrissey', 'Moses', 'Mozer', 'Muagututia', 'Muhleisen', 'Mulhall',
  'Mulitalo', 'Munster', 'Murphy', 'Murphy-Haua', 'Murray', 'Musu', 'Naitokatoka', 'Naividi', 'Nanai',
  'Nankivell', 'Nanva', 'Nasio', 'Naufahu', 'Navale', 'Nawaqanitawase', 'Neame', 'Nicholls', 'Nicholson',
  'Nicoll-Klokstad', 'Nikora', 'Nikorima', 'Niukore', 'Nizza', 'Nonu', 'Nour', 'Nuuausala', 'O\'Brien',
  'O\'Donnell', 'O\'Neill', 'O\'Sullivan', 'Olakau\'atu', 'Ollerton', 'Onesemo-Tuilaepa', 'Ormond-Maunsell',
  'Owen', 'Paekau', 'Pahulu', 'Paitai', 'Paix', 'Paki', 'Palepale', 'Papali\'i', 'Papalii', 'Parker', 'Parr',
  'Pascoe', 'Paseka', 'Pasikala', 'Patea', 'Patston', 'Pattie', 'Patuki-Case', 'Pauga', 'Paulo', 'Peacock',
  'Pearce-Paul', 'Pearson', 'Peckham-Harris', 'Peel', 'Penisini', 'Penitani', 'Penitani Gray', 'Perham',
  'Peters', 'Pezet', 'Philitoga', 'Piakura', 'Piliae-Rasabale', 'Pio', 'Piper', 'Plath', 'Polata', 'Pole',
  'Pollard', 'Pompey', 'Ponga', 'Pouniu', 'Predebon', 'Preston', 'Price', 'Prior', 'Pryke', 'Puketapu', 'Pule',
  'Purdue', 'Puru', 'Quinlan', 'Radel', 'Radley', 'Raftstrand-Smith', 'Ramien', 'Ramsey', 'Randall', 'Rangi',
  'Rasmussen', 'Raukura Leafe', 'Ravics', 'Reardon', 'Reed', 'Reh', 'Reinke', 'Reynolds', 'Riki', 'Rimoni',
  'Rinakama', 'Roache', 'Roberts', 'Robins-Reti', 'Robinson', 'Robson', 'Roche', 'Roddy', 'Rodwell', 'Rogan',
  'Rogers', 'Romaniuk', 'Rudolf', 'Russell', 'Saab', 'Saifiti', 'Salalilo', 'Salmon', 'Sami', 'Samrani',
  'Samson', 'Sanders', 'Sasagi', 'Satrick', 'Sauaso', 'Saukuru', 'Saulo', 'Saunders', 'Savage', 'Savala',
  'Savill', 'Schiller', 'Schneider', 'Scott', 'Sekene', 'Sele', 'Semu', 'Sergis', 'Seyfarth', 'Sharpe',
  'Sharpley', 'Shereb', 'Shibasaki', 'Shipton', 'Siegwalt', 'Sikahele', 'Simonsson', 'Simpkin', 'Simpkins',
  'Simpson', 'Skelton', 'Sloan', 'Smith', 'Smithies', 'Smythe', 'Solia', 'Sommerton', 'Sorensen', 'Southwell',
  'Spain', 'Spinks', 'Spreadborough', 'Staggs', 'Staples', 'Starling', 'Steep', 'Stewart', 'Stone',
  'Stonestreet', 'Stowers-Smith', 'Strange', 'Su\'A', 'Su\'a', 'Sua', 'Suani', 'Sukkar', 'Suli', 'Suli-Ruka',
  'Sullivan', 'Suluka-Fifita', 'Sutton', 'Symonds', 'Taateo', 'Tabuai-Fidow', 'Tafua', 'Tago', 'Tagoai',
  'Taito', 'Takairangi', 'Takapautolo', 'Takimoana', 'Talagi', 'Talakai', 'Talataina', 'Talau', 'Talty',
  'Tamale', 'Tapine', 'Tass', 'Taua', 'Tauaneai', 'Taufa', 'Tauhalaliku', 'Taukeiaho', 'Taulagi',
  'Taulelei-Siala', 'Taumalolo', 'Taumoepeau', 'Tavana', 'Tawha', 'Taylor', 'Te Tamaki', 'Teakaraanga-Katoa',
  'Tedesco', 'Teitzel', 'Temara', 'Thomas', 'Thompson', 'Tierney', 'Timoko', 'To\'a', 'To\'o', 'Todd',
  'Todhunter', 'Toelau', 'Togatuki', 'Tohi-Hiku', 'Toia', 'Toli', 'Tonga', 'Tooth', 'Toy', 'Tracey',
  'Trbojevic', 'Trindall', 'Tu', 'Tuala', 'Tuaupiki', 'Tufuga', 'Tui', 'Tuialii', 'Tuigamala', 'Tuilagi',
  'Tuimalatu-Brown', 'Tuipulotu', 'Tuivaiti', 'Tuivasa-Sheck', 'Tunufai', 'Tupou', 'Tupouniua', 'Turnbull',
  'Turpin', 'Turua-Quedley', 'Turuva', 'Twal', 'Twidle', 'Tyrell', 'Uele', 'Uilou', 'Underhill', 'Upton',
  'Urwin', 'Uta', 'Utoikamanu', 'Vailea', 'Vaimauga', 'Vaotu\'ua', 'Veivers', 'Vella', 'Verhoeven', 'Verran',
  'Verrills', 'Vette-Welsh', 'Volkman', 'Waaka', 'Waddell', 'Waitere', 'Wakeham', 'Walker', 'Walsh', 'Walters',
  'Warbrick', 'Ward', 'Warwick', 'Watene-Zelezniak', 'Waterman', 'Watson', 'Weale', 'Webster', 'Weekes',
  'Wetere', 'Wheeler', 'White', 'Whitfeld', 'Whyte', 'Wighton', 'Wiki', 'Willett', 'Williams', 'Willison',
  'Wilson', 'Wilton', 'Windleborn', 'Winter', 'Wishart', 'Wong', 'Wood', 'Woods', 'Woolf', 'Xerri', 'Yarrow',
  'Yeo', 'Young',
];

/**
 * The surnames #398 named in the old pool (each read as a real player), and
 * well-known names from the game's past that a pun could point at.
 */
const BLOCKED_SURNAMES: readonly string[] = [
  'Saifiti', 'Leilua', 'Brimson', 'Cotric', 'Peachey', 'Papworth', 'Tuilagi', 'Fifield', 'Naden', 'Utoi', 'Koro', 'Kavanagh',
  'Cronk', 'Thurston', 'Slater', 'Johns', 'Lockyer', 'Inglis', 'Hayne', 'Meninga', 'Fittler', 'Gasnier', 'Minichiello',
  'Webcke', 'Tallis', 'Langer', 'Sterling', 'Beetson', 'Raper', 'Gallen', 'Lomax', 'Dearden', 'Trbojevic', 'Turbo',
  'Munster', 'Cleary', 'Tedesco', 'Ponga', 'Papenhuyzen', 'Haas', 'Hetherington',
];

/** The 17 NRL clubs' nicknames, and the Bears who join in 2027. */
const NRL_NICKNAMES: readonly string[] = [
  'Broncos', 'Raiders', 'Bulldogs', 'Sharks', 'Dolphins', 'Titans', 'Sea Eagles', 'Storm', 'Knights',
  'Cowboys', 'Eels', 'Panthers', 'Rabbitohs', 'Dragons', 'Roosters', 'Warriors', 'Tigers', 'Bears',
];

/** Words the pack may not use: the competition, its marks and its teams (#398). */
const BLOCKED_WORDS: readonly string[] = [...NRL_NICKNAMES, 'NRL', 'NRLW', 'State of Origin', 'Origin', 'Kangaroos', 'Telstra'];

const fold = (s: string): string => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase();

/** A surname and each of its hyphenated or spaced parts ("Fotu-Moala" → fotu-moala, fotu, moala). */
const parts = (s: string): string[] => [fold(s), ...fold(s).split(/[\s'-]+/).filter((p) => p.length > 0)];

/** Levenshtein distance. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j]!;
      row[j] = next;
    }
  }
  return row[b.length]!;
}

const REAL = new Set([...CURRENT_SURNAMES, ...BLOCKED_SURNAMES].flatMap(parts));

/** Why a pool surname reads as a real player's, or null. */
function realProblem(surname: string): string | null {
  const s = fold(surname);
  if (REAL.has(s)) return 'is a real surname';
  for (const r of REAL) {
    if (r.length < 5) continue;
    if (s.includes(r)) return `contains ${r}`;
    if (distance(s, r) <= 1) return `is one letter from ${r}`;
  }
  return null;
}

/** Every string value in an object, deep. */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

describe('the name pools (#398)', () => {
  it('are 60 first names and 60 surnames, no repeats', () => {
    expect(AU_PACK.names.first).toHaveLength(60);
    expect(AU_PACK.names.last).toHaveLength(60);
    expect(new Set(AU_PACK.names.first).size).toBe(60);
    expect(new Set(AU_PACK.names.last).size).toBe(60);
  });

  it("hold no current player's surname, no pun on one and none of the blocked names", () => {
    const hits = AU_PACK.names.last.flatMap((s) => { const why = realProblem(s); return why ? [`${s} ${why}`] : []; });
    expect(hits).toEqual([]);
  });

  it("so no generated name in a new career is a current player's full name", () => {
    const real = new Set(CURRENT_SURNAMES.map(fold));
    const names = RIVAL_CLUBS.flatMap((c) => { const r = generatedRoster(c.id); return [...r, ...generatedBench(c.id, r)]; }).map((e) => e.name);
    expect(names.length).toBeGreaterThan(100);
    expect(names.filter((n) => real.has(fold(n.split(' ').slice(1).join(' '))))).toEqual([]);
  });

  it('the guard catches a real surname and a pun on one', () => {
    expect(realProblem('Saifiti')).not.toBeNull();
    expect(realProblem('Munsterman')).not.toBeNull();
    expect(realProblem('Hetheringtom')).not.toBeNull();
    expect(realProblem('Cronky')).not.toBeNull();
    expect(realProblem('Tackleford')).toBeNull();
  });
});

describe('the pack text (#398)', () => {
  const text = strings({ clubs: AU_PACK.clubs.map((c) => c.name), names: AU_PACK.names, vocab: AU_PACK.vocab, events: AU_PACK.events });

  it.each(BLOCKED_WORDS)('never says %s', (word) => {
    const re = new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i');
    expect(text.filter((t) => re.test(t))).toEqual([]);
  });

  it('no club is named for an NRL club, and the two other-code nicknames are gone', () => {
    const names = AU_PACK.clubs.map((c) => c.name);
    expect(names).toContain('Ballarat Bushrangers');
    expect(names).toContain('Mackay Marlins');
    expect(names.filter((n) => /Brumbies|Mariners/.test(n))).toEqual([]);
  });
});
