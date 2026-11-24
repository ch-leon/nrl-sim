import { describe, it } from 'vitest';
import { EDGE_RACE_RANGES, publishEdgeRacePart } from './edgeRace';

const range = EDGE_RACE_RANGES[1]!;

describe('the #322 Speed levers', () => {
  it('with the edge race on, fast backs carrying wide bust a flat line more (seeds 101-200 of 400)', async () => {
    await publishEdgeRacePart(range.seedStart, range.seeds);
  }, 720_000);
});
