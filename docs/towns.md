# Offline home towns

The generator reads a local GeoNames tab-separated export. It performs no network
requests. The source dump is never committed:

```sh
node scripts/gen-towns.mjs /path/to/cities5000.txt
```

It includes populated places in Australia (AU), New Zealand (NZ), Papua New Guinea
(PG) and the United Kingdom (GB), with a minimum population of 5,000. The `region`
field is GeoNames' first administrative division code within that country. IDs are
GeoNames IDs. The optional third argument changes the output path and the fourth
raises the population floor if needed for the 100,000-byte gzip budget.

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

**Source pending:** no GeoNames dump was supplied with this workspace, and the
request forbids network lookups. `src/data/towns.json` is temporarily empty;
this change cannot ship until the generator runs on an approved local source.
The towns data test intentionally rejects that empty catalogue.
