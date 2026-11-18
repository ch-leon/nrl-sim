import type { GameState } from '../core/state';
import { competitionFixtureId } from '../data/competition';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { shownStats } from '../data/player';
import { applyCampAward } from './assignmentTraining';

/** Cross-check against the live player registry, including ended club spells and retirees. */
export function assignmentOwnerProblem(state: GameState): string | null {
  for (const r of state.competitions?.assignments ?? []) {
    if (r.season < state.season) {
      const history = state.history.find((h) => h.season === r.season)?.league;
      if (!history || history.instanceId !== r.instanceId) return 'assignment historical League';
      // The first round occupies the first fieldSize / 2 ordinals, even once the draw itself is pruned.
      const ordinal = Number(r.fixtureId.slice(r.instanceId.length + 2));
      if (
        !Number.isSafeInteger(ordinal) ||
        ordinal < 0 ||
        ordinal >= history.fieldSize / 2 ||
        r.fixtureId !== competitionFixtureId(r.instanceId, ordinal)
      )
        return 'assignment historical fixture';
    }
    const b = r.booking;
    if (!b) continue;
    const owned = state.squad.find((p) => p.id === b.participantId);
    if (!owned && (r.status === 'booked' || r.status === 'away')) return 'assignment participant ownership';
    const person =
      owned ??
      state.freeAgents.find((p) => p.id === b.participantId) ??
      state.league.clubs.flatMap((c) => c.squad ?? []).find((p) => p.id === b.participantId) ??
      state.playerPopulation.retired.find((p) => p.id === b.participantId);
    if (
      !person ||
      !person.clubHistory?.spells.some(
        (s) =>
          s.clubId === r.clubId &&
          (s.start.season < r.season || (s.start.season === r.season && s.start.week <= b.bookedWeek)) &&
          (!s.end ||
            s.end.season > r.season ||
            (s.end.season === r.season && s.end.week >= (r.status === 'completed' ? 6 : b.bookedWeek)))
      )
    )
      return 'assignment participant history';
    const shown = shownStats(person.position);
    if (r.award && r.awardBasis) {
      const basis = r.awardBasis;
      // Annual entry ages each live player once. A retiree's snapshot stops at the retirement season.
      const lastAgedSeason = 'retiredAt' in person ? person.retiredAt.season : state.season;
      if (basis.age !== person.age - (lastAgedSeason - r.season)) return 'assignment return age';
      if (!shown.every((k) => basis.stats[k] !== undefined && basis.stats[k]! <= person.ceilings[k]!))
        return 'assignment development stats';
      const before = {
        position: person.position,
        ceilings: person.ceilings,
        age: basis.age,
        traits: basis.xpTraits,
        xp: r.award.xpBefore,
        level: 1,
        unspentPoints: r.award.bankedBefore,
        stats: { ...person.stats, ...basis.stats }
      };
      const actual = applyCampAward(before, {
        mode: r.award.mode,
        clubFocus: basis.clubFocus,
        ...(b.focus ? { campFocus: b.focus } : {})
      });
      if (canonicalLeagueJson(actual.receipt) !== canonicalLeagueJson(r.award)) return 'assignment development receipt';
    }
    if (
      (b.focus && b.focus !== 'balanced' && !shown.includes(b.focus)) ||
      (r.award && Object.keys(r.award.statGains).some((k) => !shown.includes(k as (typeof shown)[number]))) ||
      (r.award?.mode === 'auto' && b.focus && r.award.focus !== b.focus)
    )
      return 'assignment participant development';
  }
  return null;
}
