# Offline home towns

The generator reads a local GeoNames tab-separated export or geonamescache cities JSON. It performs no network
requests. The source dump is never committed:

```sh
node scripts/gen-towns.mjs /path/to/cities5000.json
```

It includes populated places in Australia (AU), New Zealand (NZ) and the United Kingdom (GB),
with a minimum population of 10,000. The `region` field is GeoNames' first administrative division code within that country. IDs are
GeoNames IDs. The optional third argument changes the output path and the fourth
sets the population floor (at least 5,000) if needed for the 100,000-byte gzip budget.

GeoNames geographical data: https://www.geonames.org/ — licensed under Creative
Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). The output
is adapted by filtering countries, features and population, selecting fields,
and adding invented nicknames. GeoNames does not endorse the game.

The JSON is imported only when the new-club setup opens. A preselected town uses
the new game's existing seed without consuming its simulation random stream.
Ground suffixes and suggested nicknames are stable functions of the town ID.
Custom towns carry no inferred coordinates, country or region. Club and ground
names remain editable. Colour guards apply to listed towns' local real-club
palette equivalents, including reversed pairs and both white swatches.

## Committed catalogue

The one-time development source is `geonamescache` 3.0.2's `cities5000.json`,
from its published PyPI wheel (https://pypi.org/project/geonamescache/3.0.2/).
That cache republishes GeoNames populated-place data. Its source JSON SHA-256 is
`6f65c327a0f7374cb7ee629ed6e5128d6d3a2a4d92ed98fc7629690f5074ed55`.
The official GeoNames download endpoint returned HTTP 403 in this environment,
so the published cache supplies the same geographical fields without geocoding.

The original 10,000-person catalogue keeps 724 AU/NZ places: AU 619 and NZ 105.
For #488, a small UK selection from the same published cache is appended, keeping
every AU/NZ entry unchanged. The generator now accepts GB records too.
The expanded catalogue has 732 places (including eight GB towns) and is 18,963 bytes gzipped, within the 100,000-byte budget.
The AU/NZ-only revision was regenerated offline from the previously committed
records, converted to local GeoNames TSV and passed through the generator;
no source download was needed. Records without a region are omitted. Both direct
TSV and cache JSON inputs are sorted by GeoNames ID and use the same deterministic nicknames.

Only the generated JSON and generator are committed. The raw source stays in
`work/`. There is no geonamescache dependency in the game, package lock or CI;
normal builds and tests read the checked-in JSON and never download town data.

UK additions use the same GeoNames cache, fields, licence and deterministic nickname
rule as the original catalogue; no real club identity is used.
