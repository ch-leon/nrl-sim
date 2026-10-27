// src/ui/guide/pages.ts — the Guide's club-side pages (N7, GitHub #188).
//
// Short pages a phone can read between weeks: what a week does, where the
// money comes from and goes, the squad and its contracts, event cards, the
// ladder and finals, and the grounds. Plain data; the numbers are the game's
// (config.ts, data/facility.ts, the systems) and a test keeps the ones most
// likely to move in step. "How Nines works" is its own file, nines.ts, so the
// match session can update it alone. No Phaser, no DOM.

import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL } from '../../match/league/presets';
import { NINES } from '../../match/league/rules';
import { TACTIC_BLURB } from '../tacticsBlurbs';
import { getState, type GameState } from '../../core/state';
import { BOARD, DIFFICULTY, ECON, LEAGUE, PRIZE, SQUAD_MIN, TRAINING_FOCUS, WILDCARDS } from '../../config';
import { STAFF, WELFARE_RENEWAL_CUT } from '../../systems/staff';
import { LEVEL_MULT } from '../../data/facility';
import { sponsorReturn } from '../../systems/economy';
import { REP_BASELINE } from '../../systems/league';
import { RUNWAY_LOW_WEEKS, RUNWAY_SHORT_WEEKS } from '../hud';

const dollars = (n: number): string => `$${n.toLocaleString('en-US')}`;
const percent = (x: number): string => `${Math.round(x * 100)}%`;

/** The club the page is read for; null before a game is loaded (the Guide's text then quotes a new club). */
function clubNow(): Pick<GameState, 'reputation' | 'facilities'> | null {
  try {
    return getState();
  } catch {
    return null;
  }
}

/**
 * The Money page's Sponsor Board line (N12): the rule, then what the club's own
 * board pays at today's reputation (or what a new one would), the number the
 * weekly tick pays (economy.sponsorReturn). Worked out each time the page is shown.
 */
export function sponsorBullet(club: Pick<GameState, 'reputation' | 'facilities'> | null = clubNow()): string {
  const rep = club?.reputation ?? REP_BASELINE;
  const level = (club?.facilities ?? []).reduce((m, f) => (f.defId === 'sponsorBoard' ? Math.max(m, f.level) : m), 0);
  const rule = `A Sponsor Board pays ${dollars(ECON.SPONSOR_BASE)} a week plus ${dollars(ECON.SPONSOR_PER_REP)} a reputation point, up to ${dollars(ECON.SPONSOR_CAP)}, and ${LEVEL_MULT[1]}× that at level 2, ${LEVEL_MULT[2]}× at level 3.`;
  const now = level > 0
    ? `Yours (level ${level}) pays ${dollars(sponsorReturn(level, rep))} a week at your reputation of ${rep}.`
    : `At your reputation of ${rep} a new one would pay ${dollars(sponsorReturn(1, rep))} a week.`;
  return `${rule} ${now}`;
}

/** A picture a section can show under its text (guide.ts draws it). */
export type GuideFigure = 'bonus-zone';

export interface GuideSection {
  heading?: string;
  text?: string;
  bullets?: string[];
  figure?: GuideFigure;
}

/** A nav screen a page can link to (N14, #263): guide.ts opens it. */
export type GuideScreen = 'finance' | 'squad' | 'lineup' | 'news' | 'ladder' | 'build';

export interface GuidePage {
  id: string;
  /** Tab label (short). */
  short: string;
  title: string;
  /** The screen this page describes, opened from a button under the title. */
  screen?: GuideScreen;
  sections: GuideSection[];
}

export const CLUB_PAGES: readonly GuidePage[] = [
  {
    id: 'week',
    short: 'Your week',
    title: 'Your week',
    sections: [
      {
        text: 'The season is 27 weeks: 24 rounds, then three finals weeks if you make the eight. Play Week runs one week: training and injuries, wages and income, your match and the rivals’, the ladder, the free-agent pool (it refreshes every 4 weeks), then an autosave.',
      },
      {
        heading: 'Advancing further',
        bullets: [
          'The ▾ beside Play Week runs ×4 weeks, to the finals or to the season’s end.',
          `A long advance stops early when something needs you: fewer than 13 fit (the Academy would call up juniors to make the side), an injury, a contract about to run out, a decision card in News, or money: the week the club goes into the red, a forced sale, and the week the balance passes the −${dollars(-ECON.FORCED_SALE_FLOOR)} floor (not every week in the red).`,
        ],
      },
      {
        heading: 'Saving',
        bullets: [
          'The game saves at the end of every week into the slot you chose on the title screen (three slots; Import and Export move a save between devices).',
          'A live match holds the week until full time; if the app is closed mid-match, advancing again resumes the same match.',
        ],
      },
    ],
  },
  {
    id: 'money',
    short: 'Money',
    title: 'Money',
    screen: 'finance',
    sections: [
      {
        heading: 'Coming in',
        // A getter, so the Sponsor Board line quotes the club's reputation each time the page is shown (N12).
        get bullets(): string[] {
          return [
            `Home gates: the crowd is your reputation and form, lifted for a top-eight opponent or a final, and capped by the ground (2,000 on the hill; a Grandstand seats 3,500, 5,000 or 6,500). Tickets are ${dollars(ECON.TICKET_PRICE)}. On Easy the gate pays ${percent(DIFFICULTY.easy.gate)} of that; Normal and Hard pay the full gate. A new club draws about 1,200.`,
            'A weekly grant that grows with reputation ($40 a point).',
            sponsorBullet(),
            `Finals prize money at the rollover: ${dollars(PRIZE.PER_FINALS_WEEK)} for every finals week played, ${dollars(PRIZE.GRAND_FINAL)} more for a grand final and ${dollars(PRIZE.PREMIERSHIP)} for the premiership. Easy pays ${percent(DIFFICULTY.easy.prize)} of that and Hard ${percent(DIFFICULTY.hard.prize)}; Normal pays it as written.`,
            `The board pays ${dollars(BOARD.GRANT_PER_MET)} for every objective met (Easy ${percent(DIFFICULTY.easy.prize)}, Hard ${percent(DIFFICULTY.hard.prize)}); some event cards pay too.`,
          ];
        },
      },
      {
        heading: 'Going out',
        bullets: [
          `Wages every week (Easy pays ${percent(DIFFICULTY.easy.wages)}, Hard ${percent(DIFFICULTY.hard.wages)}); wages climb with a player’s rating and with the club’s standing.`,
          'Upkeep on every facility: about 1% of its build cost a week, more at higher levels.',
          'Running costs (staff, travel, insurance) every week whatever you have built: $1,500 on Normal, $1,200 on Easy, $1,800 on Hard, plus the wages of any staff you hire.',
          'Signing fees, early-renewal fees, building, moving (10% of the build cost) and demolishing (30% back).',
        ],
      },
      {
        heading: 'The Finance screen',
        text: `This season’s books by line, the weekly run-rate and how many weeks of runway it leaves, and the ledger (the board’s objectives and patience are on Staff & Board, in Office). Below $0 the board warns, the balance turns red with “in debt” and this screen counts the weeks to the fire sale at the current burn; below −${dollars(-ECON.FORCED_SALE_FLOOR)} it sells your highest-paid player each week (never below 13), and the squad’s morale drops by ${ECON.FORCED_SALE_MORALE_HIT} each time. The balance at the left of the dock turns amber when the money would last fewer than ${RUNWAY_LOW_WEEKS} weeks at this week’s spending and red under ${RUNWAY_SHORT_WEEKS}; tap it to open this screen.`,
      },
    ],
  },
  {
    id: 'squad',
    short: 'Squad',
    title: 'Squad and contracts',
    screen: 'squad',
    sections: [
      {
        text: 'Between 13 and 30 players (you need 13 fit to field a side). A player’s overall is skill and footy IQ (25% each), speed (20%), strength and stamina (15% each). Tap any player card for his page: stats, traits and tips, morale, contract, tallies and the actions that apply.',
      },
      {
        heading: 'Training and age',
        bullets: [
          'Each facility trains particular stats every week; gains shrink as a stat climbs, so a 60 improves fast and an 85 barely moves. Workhorse and Young Gun train faster; from 31 a player slowly declines.',
          'Traits are rare special skills with a level (I–III) that fire in a moment: a step, a big hit, an offload. Double-edged ones (Hothead, Razzle Dazzle, Gambler) are brilliant some days and costly on others.',
          'At the rollover everyone is a year older; retirement starts at 34 and is certain at 38.',
        ],
      },
      {
        heading: 'Morale',
        text: 'Wins lift it (+4), losses drop it (−4), and it drifts back toward 50. A player paid under the market for his rating, or with 8 weeks or fewer on his deal, loses a point a week; a Canteen or Coach’s Office adds one.',
      },
      {
        heading: 'Contracts',
        bullets: [
          `Deals run 52 weeks. You are warned at 8, 4 and 1 weeks; when one ends the player re-signs at his asking wage. If the club can’t pay, the board lends the money (up to ${dollars(BOARD.LOAN_CAP)} a season, repaid at the season’s end, before the board judges whether you finished solvent); past that he leaves as a free agent.`,
          'Renew early for a fee of two weeks of the new wage; the ask rises when he is unhappy and when the club’s reputation is high.',
          'Sell for a transfer fee (rating² × $10, more for the young, less for the old) or release for two weeks’ wage. The squad can never drop below 13.',
        ],
      },
      {
        heading: 'Staff',
        bullets: [
          'Three hires the facilities don’t cover, beside the board’s objectives on the Staff & Board screen (in Office). Each is paid a wage a week with the running costs and stays until you let him go.',
          `${STAFF.assistantCoach.title} (${dollars(STAFF.assistantCoach.wage)} a week on Normal): changes your plan at the break when you fast-forward a match, the same way a rival’s does. A match you watch, and Skip, stay on the plan you set.`,
          `${STAFF.analyst.title} (${dollars(STAFF.analyst.wage)} a week on Normal): on the next-match card and the rival’s squad page, says what they switch to when they are behind.`,
          `${STAFF.welfare.title} (${dollars(STAFF.welfare.wage)} a week on Normal): halves the odds of a player’s grievance card (a meeting, a pay-rise demand, a homesick youngster) and takes ${percent(WELFARE_RENEWAL_CUT)} off renewal asks.`,
        ],
      },
      {
        heading: 'Recruiting',
        bullets: [
          'The free-agent pool holds 12 and refreshes every 4 weeks; rivals sign from the same pool, so a good one does not wait. A signing fee by rating and age applies (a Scout Office takes 10% off per level).',
          `The pool sits around the league: at a new club its players are about ${LEAGUE.MEAN - LEAGUE.POOL_BELOW} overall, with a star now and then. Reputation, a Scout Office and an Academy lift it.`,
          'Each pre-season the Academy brings 3 prospects aged 17–19 into the pool, 4 with an Academy built and 5 at level 3; from level 2 they arrive as Young Guns.',
          `Short of ${SQUAD_MIN} fit before a match, the Academy calls up juniors to make the side, on the junior wage to the season’s end (better ones with an Academy built).`,
        ],
      },
    ],
  },
  {
    id: 'tactics',
    short: 'Tactics',
    title: 'Tactics and the coach',
    screen: 'lineup',
    sections: [
      {
        text: 'Your side plays a plan: an attack and a defence, picked on the Lineup screen (PLAN in its header). It stays the plan for the match until you change it at a break.',
      },
      {
        heading: 'Attack',
        bullets: ATTACK_PRESETS.map((p) => `${PRESET_LABEL[p]}: ${TACTIC_BLURB[p]}`),
      },
      {
        heading: 'Defence',
        bullets: DEFENCE_PRESETS.map((p) => `${PRESET_LABEL[p]}: ${TACTIC_BLURB[p]}`),
      },
      {
        heading: 'Changing it in a match',
        bullets: [
          'At half-time (and before golden point) a sheet comes up from the bottom with the score, possession and the calls that paid off, and the attack and defence rows: change the plan, then Start 2nd half. The match waits for Start 2nd half at any speed.',
          'After a score, the Plan chip opens the same sheet until the kick-off. A change comes in at the kick-off; it never changes mid-set.',
          'Coach calls are the moment-to-moment layer on top: one call a set each way.',
        ],
      },
      {
        heading: 'Kicker and captain',
        bullets: [
          'On the Lineup screen select a starter and tap Kicker or Captain (tap again for the default). K and C mark them on the field.',
          'Your goal-kicker takes the conversions and penalty goals, and a field goal when he has the ball; his Skill (and Big Boot) is what goes over. Unpicked, or off the field, your best-kicking half takes them. Kicks in play stay with the halfback.',
          'Your captain makes the penalty call: a smart one (Footy IQ) takes the points on a slimmer chance; a Hothead taps and runs from further out.',
          'Leave them unpicked and the best-kicking half kicks and the starter with the best Footy IQ captains.',
        ],
      },
      {
        heading: 'Training focus',
        bullets: [
          `On the Squad screen pick what the squad trains hardest: that stat gains ×${TRAINING_FOCUS.ON}, the other four ×${TRAINING_FOCUS.OFF}. Balanced trains every stat evenly.`,
          'A player’s page shows what each stat will gain in a week under the focus (an old player’s Speed and Stamina can still fall).',
        ],
      },
      {
        heading: 'Reading the opposition',
        bullets: [
          'Every rival plays a style that follows from its nine: a kicking half kicks and chases, quick backs go wide, a heavy pack grinds; a strong pack rushes in defence and a fit side compresses.',
          'The next-match card says how they play (“They play Expansive · Rush”); the ladder tags each club (EXP·RSH) and a rival’s squad page names it.',
        ],
      },
    ],
  },
  {
    id: 'events',
    short: 'Events',
    title: 'Events',
    screen: 'news',
    sections: [
      {
        text: 'Every few weeks a decision turns up: a fan day, a sponsor’s offer, a player unsettled at a rival, a story about one of yours. A chip on the grounds names it, News shows it at the top and Play Week wears a red count; Review opens the card. Each choice says what surely happens and, on its own line, any risk.',
      },
      {
        bullets: [
          'A card waits 2 weeks for your answer. At most two wait at once. A season-end card, like the trip away, is due before the next match.',
          'Play Week never takes a default without asking: with a card waiting it lists what is pending, and you answer now or take the defaults and go.',
          'Money from a choice goes through the ledger like everything else, and the outcome is posted to News. Some choices leave a temporary effect for a few weeks.',
          `A risky choice says its odds. The sharp ones are a ${Math.round(WILDCARDS.INCIDENT_CHANCE * 100)}% chance of a ${WILDCARDS.BAN_WEEKS[0]}-${WILDCARDS.BAN_WEEKS[1]} week ban, and a Welfare Manager halves that. The ban shows on the squad as BAN, and the lineup leaves him out. After the grand final the squad asks for a trip to Bali.`,
          'A new card stops a multi-week advance and opens; once it is answered, Keep advancing carries on to the same end.',
        ],
      },
    ],
  },
  {
    id: 'ladder',
    short: 'Ladder',
    title: 'Ladder and finals',
    screen: 'ladder',
    sections: [
      {
        text: '16 clubs play 24 rounds: 2 points for a win, 1 for a draw, points difference splits ties. The Ladder tab shows every club’s form (the last five), and a club’s name opens its squad. The Fixtures tab previews your next match.',
      },
      {
        heading: 'Finals',
        bullets: [
          `The top eight play quarter finals (1 v 8, 2 v 7, 3 v 6, 4 v 5), the winners are re-seeded for the semis, and the grand final is week 27. A final level at full time goes to golden point: ${NINES.goldenPointMinutes} more minutes, and the next score wins (a try needs no conversion). Still level after that, the higher seed goes through. Finals are night games.`,
          'Prize money is paid at the rollover; the premiership is worth 15 reputation on top.',
        ],
      },
      {
        heading: 'Reputation and the board',
        bullets: [
          'Reputation moves with the finish: the top four gain (+4 for first, down to +1), the bottom four lose (−1 to −4), each finals win adds 1 and a lost grand final 3. It then settles 10% of the way back toward 30, so a club has to keep earning it.',
          `The board sets objectives each season (a ladder finish, staying solvent, beating a rival, building) and keeps 5 points of patience: a missed objective costs one, a clean sweep earns one back, zero and you are sacked. Each one met pays ${dollars(BOARD.GRANT_PER_MET)} and ${BOARD.REP_PER_MET} reputation. Easy pays ${percent(DIFFICULTY.easy.prize)} of the grant and Hard ${percent(DIFFICULTY.hard.prize)}.`,
        ],
      },
      {
        heading: 'Rivals',
        text: 'Every rival keeps a real squad: it signs from the free-agent pool (the news reports anyone rated 65 or better), its players develop and age, juniors arrive, and its strength is the mean of its best nine. On Hard every rival you play is a little better on the day than that rating says, on Easy a little worse.',
      },
    ],
  },
  {
    id: 'grounds',
    short: 'Grounds',
    title: 'Grounds',
    screen: 'build',
    sections: [
      {
        text: 'Build from the Build menu, tap a spot on the grounds, and the facility goes up. Tap a building for its popup: upgrade (levels 1–3, each about 1.6× then 2.2× as effective; an upgrade costs the build price × the level), move (10% of the build cost) or demolish (30% back). Some pair up: a Weights Room next to a Training Paddock trains 25% harder.',
      },
      {
        heading: 'What each one does',
        bullets: [
          'Training Paddock ($8,000): speed and stamina. Weights Room ($15,000): strength. Team Gym ($40,000): strength, speed and stamina. Video Room ($18,000): footy IQ. Coach’s Office ($30,000): IQ and skill, and morale.',
          'Physio Centre ($22,000): stamina, and injuries heal a week faster. Medical Bay ($35,000): injuries heal faster by its level.',
          `Canteen ($12,000): morale. Sponsor Board ($10,000, one only): ${dollars(ECON.SPONSOR_BASE)} a week plus ${dollars(ECON.SPONSOR_PER_REP)} a reputation point (up to ${dollars(ECON.SPONSOR_CAP)}), more at levels 2 and 3. Grandstand ($120,000, one only): seats 3,500, 5,000 or 6,500.`,
          'Academy ($60,000): skill and IQ, more and better juniors each pre-season. Scout Office ($25,000): a better free-agent pool and signing fees 10% cheaper per level.',
        ],
      },
      {
        heading: 'Life on the grounds',
        text: 'Players, staff and (on match weeks) fans walk the paths; buildings pop up with scaffolding and come down the same way. It is all show: nothing on the grounds changes a match except what the facilities train.',
      },
    ],
  },
];
