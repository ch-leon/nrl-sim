// src/ui/guide/nines.ts — "How Nines works": the live match sim as shipped
// (N7, GitHub #188; the docs part of #77).
//
// OWNED BY THE MATCH SESSION. This file describes the live sim (BAK-207 Phase 2
// 2a–2g, Phase 3, coach calls #73) the way a player meets it, so the Guide
// stays true as mechanics land: when a rule, number or call changes, change it
// here in the same PR. NINES_FACTS holds the numbers the text quotes;
// tests/ui/guide.test.ts checks them against the rule constants
// (src/match/league/rules.ts, goals.ts, penalties.ts, bench.ts, config.ts), so
// a drift fails the build with a pointer to this file. Plain data; no imports
// from the match code, so this file never breaks a match refactor.

import type { GuidePage } from './pages';

/** The numbers the page quotes. Kept equal to the rule constants by a test. */
export const NINES_FACTS = {
  aSide: 9,
  halfMinutes: 9,
  tackles: 5,
  tryPoints: 4,
  bonusTryPoints: 5,
  /** The bonus zone (the picture): the gap between the posts, and the in-goal's depth, metres. */
  postGapM: 5.5,
  inGoalM: 10,
  conversionPoints: 2,
  fieldGoalPoints: 1,
  penaltyGoalPoints: 2,
  benchSize: 4,
  /** Field goals are on in the last this many seconds. */
  fieldGoalLastS: 180,
  /** A field goal is tried from inside this many metres. */
  fieldGoalRangeM: 30,
  /** Legs back at half-time, as a share of what was lost. */
  halfTimeLegsBack: 0.5,
} as const;

const F = NINES_FACTS;

export const NINES_PAGE: GuidePage = {
  id: 'nines',
  short: 'Nines',
  title: 'How Nines works',
  sections: [
    {
      text: `Matches are Rugby League Nines: ${F.aSide} a side on a full-size field, two halves of ${F.halfMinutes} minutes. The clock runs while the ball is in play and stops from a try to the restart; when the siren goes, play carries on until the ball is next dead. At half-time everyone gets back ${Math.round(F.halfTimeLegsBack * 100)}% of the legs he has lost.`,
    },
    {
      heading: 'Sets and scoring',
      bullets: [
        `A set is ${F.tackles} tackles, then the last-tackle kick. Six again (a ruck offence against the defence) starts the count over.`,
        `A try is ${F.tryPoints} points; grounded in the bonus zone, the in-goal between the posts, it is ${F.bonusTryPoints}.`,
        `Conversions are drop kicks, ${F.conversionPoints} points, taken quickly in line with where the try was scored; a longer or wider kick is harder, a better kicker (Skill, Big Boot) straighter. Your named goal-kicker (Lineup) takes them while he is on; otherwise your best-kicking half.`,
        `A field goal is ${F.fieldGoalPoints} point: in the last ${F.fieldGoalLastS / 60} minutes, from inside ${F.fieldGoalRangeM} m, late in the set, with the scores level or his side a point behind. A penalty goal is a ${F.penaltyGoalPoints}-point drop kick.`,
      ],
    },
    {
      heading: 'The bonus zone',
      text: `The in-goal between the posts, ${F.postGapM} m wide and ${F.inGoalM} m deep, is marked on the pitch as a lighter band with a dashed edge. A try grounded in it is worth ${F.bonusTryPoints}, and the zone lights up when one is scored; a carrier over the line with nobody near him goes round toward the posts for it.`,
      figure: 'bonus-zone',
    },
    {
      heading: 'Kick-offs and interchange',
      bullets: [
        'A coin toss decides who kicks off. After a try the side that conceded kicks off (as shipped; real Nines has the scorer restart).',
        `Interchange is unlimited from a bench of ${F.benchSize}. After a try and at half-time the coach swaps the most tired men for fresher ones (standard rotation: anyone under about half his legs, two at a time; heavy rotates sooner and three at a time). A benched player gets his legs back slowly, never all the way.`,
      ],
    },
    {
      heading: 'Touch and restarts',
      bullets: [
        'No scrums. A ball into touch is played by the other side 10 m in; a ball kicked dead is a tap on the 20.',
        'A 40/20 (a last-tackle kick from inside your own 40 that bounces into touch inside their 20) wins the ball back with a tap.',
        'A defender who gathers a kick in his own in-goal grounds it for a 20 m restart when an attacker is close, or runs it out; a ball forced in-goal brings a goal-line drop-out.',
      ],
    },
    {
      heading: 'Penalties and six-again',
      bullets: [
        'Holding down after a long wrestle, or lying in the ruck, gives the attack six again.',
        'Offside at the ruck (a Rush defence pays for its line speed) and high shots (Hotheads more often) give a penalty. The captain takes a shot at goal when it is likely and the clock or score says so, taps and goes inside 25 m, and otherwise kicks for touch and taps 10 m in.',
        'No sin-bins yet.',
      ],
    },
    {
      heading: 'Weather and injuries',
      bullets: [
        'Rain makes the ball slippery: knock-ons, spilled kicks and balls lost in the tackle are about 1.6 times as likely. Wind carries kicks further and less predictably and blows goal kicks off line.',
        'A big hit can injure the carrier: he plays on hampered until the next stoppage, when the coach takes him off first, and the injury follows him home for weeks.',
      ],
    },
    {
      heading: 'Legs and gas',
      bullets: [
        'Legs drain through a match (stamina slows the drain). Sprinting burns gas, and legs are the ceiling on it: fast players with little stamina make breaks they cannot finish.',
        'A cooked player is slower and loses the wrestle; a thin bar under a tackled carrier shows the wrestle, and streaks mark anyone sprinting.',
      ],
    },
    {
      heading: 'Tactics, traits and coach calls',
      bullets: [
        'Each side plays an attack preset (Grind, Balanced, Expansive, Kick-chase, All-out) and a defence preset (Slide, Rush, Compressed) by zone of the field.',
        'Traits fire in their moment and are announced when they do: a step, a fend, an offload, a big hit, a strip, an intercept.',
        'In a live match the chips along the bottom are coach calls for the next play: with the ball Hit-up, Shift left or right, Kick early, Run it, Bomb and Field goal; defending Rush or Hold. One call a set; the stats strip counts the calls that paid off. With no Coach’s Office you have Hit-up and Hold; each level of it adds calls: Shift and Rush, then Kick early and Run it, then Bomb and Field goal.',
      ],
    },
    {
      heading: 'Watching',
      bullets: [
        'Live match (beta) on the Fixtures tab plays your matches on this sim as you watch, with ×1 to ×8 speed and Skip; off, the classic engine plays and replays them. Rival-v-rival rounds are simmed from the clubs’ strength either way.',
        'Full time brings the match report (who scored and when, the goals, the numbers side by side and the Player of the Match), the result into the ladder, and the match’s tallies onto your players’ pages.',
      ],
    },
  ],
};
