// Helpers and the small colour guard ship with the title; the town list does not.
import { isValidColorPair, PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS } from '../config';
import { GROUND_MAX, NAME_MAX } from './names';

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
  const kind = ['Oval', 'Park', 'Recreation Ground'][townHash(id) % 3]!;
  const room = GROUND_MAX - 1 - [...kind].length;
  return `${fitTown(town, room) || [...town.trim()].slice(0, room).join('').trim()} ${kind}`;
}

// Words a shortened town does not end on ("Sydney Central" → "Sydney", "Newark on" → "Newark"),
// and the ones that are not a place on their own ("South", "Port"): those take the other end.
const LINKS = new Set(['of', 'on', 'upon', 'the', 'and', 'city', 'centre', 'center', 'central', 'business', 'district']);
const NOT_A_PLACE = new Set(['north', 'south', 'east', 'west', 'mount', 'mt', 'port', 'glen', 'te', 'st', 'saint', 'new', 'upper', 'lower', 'city']);
const len = (s: string): number => [...s].length;
const trimLinks = (words: string[], end: 'start' | 'end'): string[] => {
  const w = [...words];
  const at = (): string => (end === 'end' ? w[w.length - 1] : w[0])!.toLowerCase();
  while (w.length && (LINKS.has(at()) || (end === 'end' && NOT_A_PLACE.has(at())))) if (end === 'end') w.pop(); else w.shift();
  return w;
};

/**
 * A town short enough for `room` characters (#616): whole when it fits, else its leading
 * words ("Surfers Paradise" → "Surfers"), else its trailing ones when the lead is not a
 * place on its own ("South Melbourne" → "Melbourne"). '' when no run of whole words fits.
 */
export function fitTown(town: string, room: number): string {
  const name = town.replace(/\s+/g, ' ').trim();
  if (len(name) <= room) return name;
  const words = name.split(' ');
  const ok = (w: string[]): boolean => w.length > 0 && len(w.join(' ')) <= room && !(w.length === 1 && NOT_A_PLACE.has(w[0]!.toLowerCase()));
  for (let k = words.length - 1; k >= 1; k--) {
    const w = trimLinks(words.slice(0, k), 'end');
    if (ok(w)) return w.join(' ');
  }
  for (let k = 1; k < words.length; k++) {
    const w = trimLinks(words.slice(k), 'start');
    if (ok(w)) return w.join(' ');
  }
  return '';
}

/**
 * The club name the title offers for a town: "<town> <nickname>", inside the rename rule's
 * 24 characters (#616) so Kit & Colours opens on a name it can keep. A town that will not
 * shorten to whole words beside the nickname ("Greensborough Ironworkers") goes alone,
 * cut at the limit only past 24 letters.
 */
export function defaultClubName(town: string, nickname: string): string {
  const name = town.replace(/\s+/g, ' ').trim();
  const full = `${name} ${nickname}`;
  if (len(full) <= NAME_MAX) return full;
  const short = fitTown(name, NAME_MAX - 1 - len(nickname));
  if (short) return `${short} ${nickname}`;
  return [...name].slice(0, NAME_MAX).join('').trim();
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
