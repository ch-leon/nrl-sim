// src/native/clubSnapshot.ts — what the iPhone's club widgets show (docs/specs/ios.md
// §3 (b) and (c), Phase 5): the next match, the best injured player and how many rounds
// until he is back, and the level points waiting to be spent. Pure: no DOM, no
// Capacitor. src/native/clubWidgets.ts writes it to the App Group for the widget
// extension, which draws it (ios/App/BigCoachWidgets/ClubWidget.swift).
//
// Everything counts in game rounds and only changes when you play: there is no date,
// no time and no wall clock anywhere in it (§6, nothing timed). Where the game has
// words, these are them: the next match's label and the no-match line are the Next
// match card's (fixtures.ts), the clock line is the HUD's (seasonWeekLabel). A sacked
// coach gets no special line, as the club screen's next-match chip has none.
// Not the game's own: the short labels pick the fixture list's ("R7", "SF") and the
// HUD chip's ("W5"); "rounds" until an injured man is back is the weekly injury hook's
// recovery applied to his weeks out, where the Squad screen shows the raw weeks
// ("out 3 wk"), so the two differ when the club has a medical bay or physio centre.
//
// The shape is the Swift side's ClubSnapshot (ios/App/Shared/ClubSnapshot.swift),
// field for field. Change one, change both, and bump CLUB_SNAPSHOT_VERSION when an old
// widget could no longer read a new snapshot.

import type { GameState } from '../core/state';
import { seasonWeekLabel } from '../core/season';
import { SEASON_ROUNDS } from '../config';
import { overallRating, starsForOverall } from '../data/player';
import { matchStage, nextMatchPreview } from '../systems/league';
import { leagueSeasonView } from '../systems/leagueSeasonView';
import { weeksUntilFit } from '../systems/training';
import { COLOR_TOKENS } from '../ui/tokens';

export const CLUB_SNAPSHOT_VERSION = 1;

export interface ClubSnapshot {
  /** Schema version (CLUB_SNAPSHOT_VERSION). */
  v: number;
  club: {
    name: string;
    /** The club's two colours, "#rrggbb". */
    colors: [string, string];
  };
  season: number;
  /** The game's week (round) number. */
  week: number;
  /** The HUD's clock line: "Week 7 of 27 · Season 2", "Trial 1 of 2 · Season 1". */
  when: string;
  /** The next match, or null when the season has none left for the club. */
  next: {
    /** As the Next match card words it: "Round 7", "Pre-season trial 1", "Semi final", "Week 5 · League · round 3". */
    stage: string;
    /** The short form the fixture list uses: "R7", "Trial 1", "SF", "W5". */
    stageShort: string;
    /** The opponent's full name, and its place name ("Broken Hill Brollys", "Broken Hill"). */
    opponent: string;
    opponentShort: string;
    venue: 'home' | 'away' | 'neutral';
  } | null;
  /** With no next match: what the Next match card says instead. Null when there is one. */
  noMatch: string | null;
  /** The best player out injured (by overall), or null when nobody is. */
  injured: {
    name: string;
    position: string;
    /** His star rating, as the squad shows it (half steps). */
    stars: number;
    /** Week advances until he is fit, at the club's recovery today. */
    rounds: number;
    /** How many others are out injured as well. */
    others: number;
  } | null;
  /** Level points banked across the squad, waiting for the coach to spend. 0 hides the line. */
  points: number;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** "Broken Hill Brollys" → "Broken Hill", as the HUD's next-match chip shortens it. */
function placeName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, -1).join(' ') : name;
}

/** The fixture list's short round label (fixtures.ts roundShort and fmtMyFixture). */
function roundShort(round: number): string {
  if (round <= 0) return `Trial ${round + 2}`;
  if (round <= SEASON_ROUNDS) return `R${round}`;
  return ({ 'Quarter final': 'QF', 'Semi final': 'SF', 'Grand final': 'GF' } as Record<string, string>)[matchStage(round)] ?? `R${round}`;
}

/** What the Next match card says when there is no next match (fixtures.ts nextMatchCard). */
function noMatchText(s: GameState): string {
  const view = leagueSeasonView(s);
  if (view) return view.choiceRequired ? 'Choose a league before playing' : `${view.currentLabel} · no scheduled club match`;
  return s.week > SEASON_ROUNDS ? 'No more matches this season' : 'No match this week';
}

function nextMatch(s: GameState): ClubSnapshot['next'] {
  const p = nextMatchPreview(s);
  if (!p) return null;
  const stage = p.label ?? (p.stage === 'Trial' ? `Pre-season trial ${p.round + 2}` : p.stage === 'Round' ? `Round ${p.round}` : p.stage);
  const stageShort = p.slot !== undefined ? `W${p.slot}` : p.label ? p.stage : roundShort(p.round);
  return {
    stage,
    stageShort,
    opponent: p.opponent.name,
    opponentShort: placeName(p.opponent.name),
    venue: p.neutral ? 'neutral' : p.home ? 'home' : 'away',
  };
}

function injured(s: GameState): ClubSnapshot['injured'] {
  const out = s.squad
    .filter((p) => !p.departed && !p.junior && p.injuredWeeks > 0)
    .map((p) => ({ p, overall: overallRating(p) }))
    .sort((a, b) => b.overall - a.overall || a.p.injuredWeeks - b.p.injuredWeeks || (a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0));
  const best = out[0];
  if (!best) return null;
  return {
    name: best.p.name,
    position: best.p.position,
    stars: starsForOverall(best.overall),
    rounds: weeksUntilFit(best.p.injuredWeeks, s.facilities),
    others: out.length - 1,
  };
}

/** Points bank only while the coach spends them himself (Settings); otherwise the focus spends them as they come. */
function points(s: GameState): number {
  if (s.settings.spendPointsMyself !== true) return 0;
  return s.squad.reduce((n, p) => n + (p.departed || p.junior ? 0 : Math.max(0, p.unspentPoints ?? 0)), 0);
}

/** The widgets' snapshot of a career, or null with no career (a fresh install: the widget asks you to open the game). */
export function clubSnapshot(s: GameState | null): ClubSnapshot | null {
  if (!s) return null;
  const entry = s.league.clubs.find((c) => c.id === s.clubId);
  const colour = (c: string | undefined, fallback: string): string => (c && HEX.test(c) ? c.toLowerCase() : fallback);
  const next = nextMatch(s);
  return {
    v: CLUB_SNAPSHOT_VERSION,
    club: { name: s.clubName, colors: [colour(entry?.colors[0], COLOR_TOKENS.accent), colour(entry?.colors[1], COLOR_TOKENS.navy)] },
    season: s.season,
    week: s.week,
    when: seasonWeekLabel(s),
    next,
    noMatch: next ? null : noMatchText(s),
    injured: injured(s),
    points: points(s),
  };
}
