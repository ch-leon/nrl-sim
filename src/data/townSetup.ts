// Helpers and the small colour guard ship with the title; the town list does not.
import { isValidColorPair, PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS } from '../config';

export interface Town {
  id: string; name: string; region: string; country: string;
  lat: number; lon: number; population: number; nickname: string;
}
export const foldTown = (name: string): string => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function townHash(id: string): number {
  let hash = 0;
  for (const c of id) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return hash;
}
export function groundForTown(town: string, id = town): string {
  return `${town} ${['Oval', 'Park', 'Recreation Ground'][townHash(id) % 3]}`;
}
// Palette equivalents, unordered. White has two swatches; navy-black covers black.
// Kept by city/country so unrelated namesakes aren't refused. No real club names ship.
export const REAL_CITY_COLORS: Record<string, readonly string[]> = {
  'AU:brisbane': ['crimson/gold'], 'AU:canberra': ['gold/navy'],
  'AU:sydney': ['blue/white', 'crimson/white', 'crimson/navy', 'navy/white', 'blue/crimson', 'gold/navy'],
  'AU:cronulla': ['blue/white', 'blue/navy'], 'AU:manly': ['crimson/white'],
  'AU:parramatta': ['blue/gold'], 'AU:penrith': ['crimson/navy'],
  'AU:redcliffe': ['crimson/white'], 'AU:gold coast': ['blue/gold'],
  'AU:melbourne': ['purple/white', 'gold/purple'], 'AU:newcastle': ['blue/crimson'],
  'AU:townsville': ['gold/navy'], 'AU:wollongong': ['crimson/white'],
  'AU:perth': ['crimson/navy'], 'AU:gosford': ['crimson/navy'],
  'NZ:auckland': ['blue/crimson', 'navy/white'], 'NZ:christchurch': ['blue/crimson'],
  'GB:wigan': ['crimson/white'], 'GB:st helens': ['crimson/white'], 'GB:saint helens': ['crimson/white'],
  'GB:leeds': ['blue/gold'], 'GB:warrington': ['blue/gold'],
  'GB:hull': ['navy/white', 'crimson/white'], 'GB:castleford': ['gold/navy'],
  'GB:wakefield': ['blue/white', 'blue/crimson'], 'GB:bradford': ['crimson/navy', 'gold/navy'],
  'GB:salford': ['crimson/white', 'crimson/navy'], 'GB:huddersfield': ['crimson/gold'],
  'GB:leigh': ['crimson/white'], 'GB:london': ['crimson/navy'],
};
const COLOR_FAMILY: Record<string, string> = {
  '#f4d03f': 'gold', '#c0392b': 'crimson', '#2e6fd8': 'blue', '#e67e22': 'orange',
  '#8e44ad': 'purple', '#16a0b8': 'teal', '#ecf0f1': 'white', '#ffffff': 'white', '#1a1a2e': 'navy',
};
export function townColorsAllowed(town: string, country: string | undefined, a: string, b: string): boolean {
  const pair = [COLOR_FAMILY[a], COLOR_FAMILY[b]].sort().join('/');
  return !(REAL_CITY_COLORS[`${country}:${foldTown(town)}`] ?? []).includes(pair);
}
export function colorsForTown(town: string, country?: string): [string, string] {
  for (const a of PLAYER_PRIMARY_COLORS) for (const b of PLAYER_SECONDARY_COLORS) {
    if (isValidColorPair(a, b) && townColorsAllowed(town, country, a, b)) return [a, b];
  }
  throw new Error('No safe town colours');
}
