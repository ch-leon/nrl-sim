import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import data from '../../src/data/towns.json';
import type { Town } from '../../src/data/townSetup';
const towns: Town[] = data;
import { colorsForTown, townColorsAllowed } from '../../src/data/townSetup';
import { generateTowns } from '../../scripts/gen-towns.mjs';

describe('curated offline towns (#485)', () => {
  it('has populated places in AU and NZ only above the floor with complete fields and unique ids', () => {
    expect([...new Set(towns.map(t => t.country))].sort()).toEqual(['AU', 'NZ']);
    expect(new Set(towns.map(t => t.id)).size).toBe(towns.length);
    for (const t of towns) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.region.length).toBeGreaterThan(0);
      expect(t.nickname.length).toBeGreaterThan(0);
      expect(t.population).toBeGreaterThanOrEqual(10000);
      expect(Math.abs(t.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(t.lon)).toBeLessThanOrEqual(180);
    }
  });
  it('is under 100 KB gzipped', () => {
    expect(gzipSync(readFileSync('src/data/towns.json')).length).toBeLessThan(100_000);
  });
  it('refuses real-club city colours, including reversed pairs and white swatch aliases', () => {
    expect(townColorsAllowed('Brisbane', 'AU', '#f4d03f', '#c0392b')).toBe(false);
    expect(townColorsAllowed('Leeds', 'GB', '#2e6fd8', '#f4d03f')).toBe(false);
    expect(townColorsAllowed('Wigan', 'GB', '#ecf0f1', '#c0392b')).toBe(false);
    expect(townColorsAllowed('Wigan', 'GB', '#c0392b', '#ffffff')).toBe(false);
    for (const t of towns) expect(townColorsAllowed(t.name, t.country, ...colorsForTown(t.name, t.country))).toBe(true);
  });
  it('generates deterministically from a local GeoNames TSV and filters by country, population and feature', () => {
    const row = (id: number, country: string, population: number, feature = 'P') =>
      [id, 'Example', '', '', -30, 150, feature, 'PPL', country, '', '01', '', '', '', population].join('\t');
    const source = [row(3, 'NZ', 6000), row(1, 'AU', 5000), row(2, 'US', 7000), row(4, 'PG', 10000), row(5, 'GB', 10000), row(6, 'AU', 4999), row(7, 'NZ', 10000, 'A')].join('\n');
    expect(generateTowns(source, 5000).map(t => t.id)).toEqual(['1', '3']);
    expect(generateTowns(source, 5000)).toEqual(generateTowns(source.split('\n').reverse().join('\n'), 5000));
  });
});


it('accepts a local GeoNames cache export and drops records without a region', () => {
  const record = { geonameid: 1, name: 'Example', admin1code: '01', countrycode: 'AU', latitude: -30, longitude: 150, population: 10000 };
  const towns = generateTowns(JSON.stringify({ 1: record, 2: { ...record, geonameid: 2, admin1code: '' } }));
  expect(towns).toHaveLength(1);
  expect(towns[0]).toMatchObject({ id: '1', name: 'Example', region: '01', country: 'AU', lat: -30, lon: 150, population: 10000 });
});
