// src/data/names.ts — fictional Aussie/NRL-flavoured name pools. See BAK-166.
// Pure data + a deterministic name picker. No Phaser.

import type { Rng } from '../utils/rng';

export const FIRST_NAMES: readonly string[] = [
  'Jarrah', 'Kobi', 'Reece', 'Tane', 'Bailey', 'Cooper', 'Kade', 'Jaxon',
  'Ryder', 'Hayden', 'Brayden', 'Lachie', 'Beau', 'Digger', 'Macca',
  'Nash', 'Zane', 'Corey', 'Blake', 'Darcy', 'Flynn', 'Hunter', 'Jett',
  'Kane', 'Levi', 'Marley', 'Nate', 'Ollie', 'Rhys', 'Sonny', 'Tyrese',
  'Wade', 'Xavier', 'Zeke', 'Angus', 'Bodhi', 'Cruz', 'Deakin', 'Ezra',
  'Finn',
];

export const SURNAMES: readonly string[] = [
  'Waratah', 'Kavanagh', 'Fifield', 'Tuilagi', 'Boyd', 'Cronky', 'Hansen',
  'Iongi', 'Jurbo', 'Kellaway', 'Lomax', 'Munsterman', 'Naden', 'Ofa',
  'Peachey', 'Quartermaine', 'Radbourne', 'Saifiti', 'Trescothick', 'Utoi',
  'Vaughan', 'Whitbread', 'Xerling', 'Yeomans', 'Zullo', 'Addison', 'Brimson',
  'Cotric', 'Dearden', 'Edmunds', 'Ferguson', 'Grantley', 'Hetherton',
  'Iliffe', 'Jennings', 'Koro', 'Leilua', 'Mbyerson', 'Nofa',
  'Papworth',
];

/** `${pick(FIRST_NAMES)} ${pick(SURNAMES)}` using the seeded RNG. */
export function randomName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`;
}
