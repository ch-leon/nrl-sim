// The Big Three (#840): three Premier League clubs per region that stay well
// ahead of everyone else, so the top of the ladder keeps a wall (#832). Each
// one develops toward its own level, not its league's average, and carries a
// bigger budget. A new career copies its region's list into the saved world;
// runtime systems read that copy, so careers built earlier keep their rules.
// Plain data with no imports, so it never loads a region's content pack.

/** Club id → the level its best nine are built and kept at. */
export type BigThreeLevels = Readonly<Record<string, number>>;

export const BIG_THREE: Readonly<Record<string, BigThreeLevels>> = {
  'au-career-3x8': { 'rival-reapers': 78, 'rival-wolves': 76, 'rival-stingrays': 74 },
  'uk-career-3x8': { 'rival-uk-0': 78, 'rival-uk-runners': 76, 'rival-uk-1': 74 },
};

/** Squad size for a Big Three club: one first-grader and one depth player per
 * position, without the two spare first-graders other rivals carry, so a 78
 * squad fits its cap. The rollover refills rivals to this size anyway. */
export const BIG_THREE_SQUAD_SIZE = 18;

/** The Big Three budget, from the existing cap-account levels: the purchased
 * level and the earned allowance at their maximum. Premier: $600k → $750k. */
export const BIG_THREE_CAP = { purchasedLevel: 3, earnedBasisPoints: 1000 } as const;

/** A copy of the Big Three a new career built from this profile carries, if any. */
export function bigThreeForProfile(profileId: string): Record<string, number> | undefined {
  const levels = BIG_THREE[profileId];
  return levels ? { ...levels } : undefined;
}

/** The Big Three a saved career carries. A career built before #840 has none. */
export function bigThreeOf(world: { bigThree?: Record<string, number> } | undefined): ReadonlyMap<string, number> {
  return new Map(Object.entries(world?.bigThree ?? {}));
}
