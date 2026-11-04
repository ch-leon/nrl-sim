// Offline GeoNames TSV (or geonamescache cities JSON) -> the committed setup-only chunk. Never downloads data.
// Usage: node scripts/gen-towns.mjs /path/to/cities5000.txt [output.json] [population-floor]
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const NICKNAMES = ['Wombats', 'Kestrels', 'Quarries', 'Ironworkers', 'Otters', 'Badgers', 'Ospreys', 'Founders'];
const COUNTRIES = new Set(['AU', 'NZ', 'PG', 'GB']);
export function generateTowns(text, floor = 10000) {
  // geonamescache publishes the same populated-place export as keyed JSON.
  // Accept either local format; neither path performs a network request.
  const lines = text.trimStart().startsWith('{')
    ? Object.values(JSON.parse(text)).map(t => [t.geonameid, t.name, '', '', t.latitude, t.longitude,
      'P', 'PPL', t.countrycode, '', t.admin1code, '', '', '', t.population].join('\t'))
    : text.split(/\r?\n/);
  const towns = new Map();
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [id, name, , , latitude, longitude, featureClass, featureCode, country, , region, , , , population] = line.split('\t');
    if (!COUNTRIES.has(country) || featureClass !== 'P' || !/^PPL(?:A[1-5]?|C|G|X)?$/.test(featureCode) || !Number.isFinite(Number(population)) || Number(population) < floor) continue;
    if (!region) continue; // Incomplete source records are not catalogue suggestions.
    const lat = Number(latitude), lon = Number(longitude);
    if (!/^\d+$/.test(id) || !name || !region || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error(`Invalid GeoNames row: ${id}`);
    towns.set(id, { id, name, region, country, lat, lon, population: Number(population), nickname: NICKNAMES[Number(id) % NICKNAMES.length] });
  }
  return [...towns.values()].sort((a, b) => Number(a.id) - Number(b.id));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , source, output = 'src/data/towns.json', floor = '10000'] = process.argv;
  if (!source) throw new Error('Provide a local GeoNames TSV path; no network requests are made.');
  if (!Number.isFinite(Number(floor)) || Number(floor) < 5000) throw new Error('Population floor must be at least 5000.');
  const towns = generateTowns(readFileSync(source, 'utf8'), Number(floor));
  if ([...COUNTRIES].some(country => !towns.some(t => t.country === country))) throw new Error('Source must contain AU, NZ, PG and GB towns.');
  const json = JSON.stringify(towns) + '\n';
  const bytes = gzipSync(json).length;
  if (bytes >= 100_000) throw new Error(`${bytes} gzipped bytes exceeds budget; raise the population floor.`);
  writeFileSync(output, json);
  console.log(`${towns.length} towns; ${bytes} bytes gzipped; population floor ${floor}`);
}
