// src/ui/guide/pages.ts — the Guide's club-side pages (N7, GitHub #188).
//
// Short pages a phone can read between weeks: what a week does, where the
// money comes from and goes, the squad and its contracts, event cards, the
// ladder and finals, and the grounds. Plain data; the numbers are the game's
// (config.ts, data/facility.ts, the systems) and a test keeps the ones most
// likely to move in step. "How Nines works" is its own file, nines.ts, so the
// match session can update it alone. No Phaser, no DOM.

import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL } from '../../match/league/presets';
import { TRAINING_FOCUS } from '../../config';
import { TACTIC_BLURB } from '../tacticsBlurbs';

export interface GuideSection {
  heading?: string;
  text?: string;
  bullets?: string[];
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
        text: 'The season is 27 weeks: 24 rounds, then three finals weeks if you make the eight. Advance Week runs one week: training and injuries, wages and income, your match and the rivals’, the ladder, the free-agent pool (it refreshes every 4 weeks), then an autosave.',
      },
      {
        heading: 'Advancing further',
        bullets: [
          'The ▾ beside Advance Week runs ×4 weeks, to the finals or to the season’s end.',
          'A long advance stops early when something needs you: fewer than 13 fit (the Academy would call up juniors to make the side), an injury, a contract about to run out, a decision card in News, or money: the week the club goes into the red, a forced sale, and the week the balance passes the −$100,000 floor (not every week in the red).',
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
        bullets: [
          'Home gates: the crowd is your reputation and form, lifted for a top-eight opponent or a final, and capped by the ground (2,000 on the hill; a Grandstand seats 3,500, 5,000 or 6,500). Tickets are $20. A new club draws about 1,200.',
          'A weekly grant that grows with reputation ($40 a point), and $3,000 a week per level of a Sponsor Board.',
          'Finals prize money at the rollover: $15,000 for every finals week played, $25,000 more for a grand final and $75,000 for the premiership.',
          'The board pays $10,000 for every objective met; some event cards pay too.',
        ],
      },
      {
        heading: 'Going out',
        bullets: [
          'Wages every week (Easy pays 85%, Hard 115%); wages climb with a player’s rating and with the club’s standing.',
          'Upkeep on every facility: about 1% of its build cost a week, more at higher levels.',
          'Running costs (staff, travel, insurance) every week whatever you have built: $1,500 on Normal, $1,200 on Easy, $1,800 on Hard.',
          'Signing fees, early-renewal fees, building, moving (10% of the build cost) and demolishing (30% back).',
        ],
      },
      {
        heading: 'The Finance screen',
        text: 'This season’s books by line, the weekly run-rate and how many weeks of runway it leaves, the board’s objectives and patience, and the ledger. Below $0 the board warns, the balance turns red with “in debt” and this screen counts the weeks to the fire sale at the current burn; below −$100,000 it sells your highest-paid player each week (never below 13), and the squad’s morale drops by 10 each time.',
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
          'Deals run 52 weeks. You are warned at 8, 4 and 1 weeks; when one ends the player re-signs at his asking wage if you can pay it, or leaves as a free agent.',
          'Renew early for a fee of two weeks of the new wage; the ask rises when he is unhappy and when the club’s reputation is high.',
          'Sell for a transfer fee (rating² × $10, more for the young, less for the old) or release for two weeks’ wage. The squad can never drop below 13.',
        ],
      },
      {
        heading: 'Recruiting',
        bullets: [
          'The free-agent pool holds 12 and refreshes every 4 weeks; rivals sign from the same pool, so a good one does not wait. A signing fee by rating and age applies (a Scout Office takes 10% off per level).',
          'Each pre-season the Academy brings 3 prospects aged 17–19 into the pool, 4 with an Academy built and 5 at level 3; from level 2 they arrive as Young Guns.',
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
        text: 'Your side plays a plan: an attack and a defence, picked on the Lineup screen (the chips under the header). It stays the plan for the match until you change it at a break.',
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
          'At half-time (and before golden point) a card shows the score, both sides’ legs and the calls that paid off, with the two rows of chips: change the plan, then Continue (at ×4 and faster it goes on by itself after 8 seconds unless you touch it).',
          'After a score, the Plan chip beside the call chips opens the same rows until the kick-off. A change comes in at the kick-off; it never changes mid-set.',
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
        text: 'Every few weeks a card turns up in News: a fan day, a sponsor’s offer, a player unsettled at a rival, a story about one of yours. Each has two or three choices with their cost or gain shown.',
      },
      {
        bullets: [
          'A card waits 2 weeks for your answer, then takes its default choice. At most two wait at once.',
          'Money from a choice goes through the ledger like everything else, and the outcome is posted to News. Some choices leave a temporary effect for a few weeks.',
          'A new card stops a multi-week advance, so you never miss one.',
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
          'The top eight play quarter finals (1 v 8, 2 v 7, 3 v 6, 4 v 5), the winners are re-seeded for the semis, and the grand final is week 27. A final level at full time goes to golden point: five more minutes, and the next score wins (a try needs no conversion). Still level after that, the higher seed goes through. Finals are night games.',
          'Prize money is paid at the rollover; the premiership is worth 15 reputation on top.',
        ],
      },
      {
        heading: 'Reputation and the board',
        bullets: [
          'Reputation moves with the finish: the top four gain (+4 for first, down to +1), the bottom four lose (−1 to −4), each finals win adds 1 and a lost grand final 3. It then settles 10% of the way back toward 30, so a club has to keep earning it.',
          'The board sets objectives each season (a ladder finish, staying solvent, beating a rival, building) and keeps 5 points of patience: a missed objective costs one, a clean sweep earns one back, zero and you are sacked. Each one met pays $10,000 and 2 reputation.',
        ],
      },
      {
        heading: 'Rivals',
        text: 'Every rival keeps a real squad: it signs from the free-agent pool (the news reports anyone rated 65 or better), its players develop and age, juniors arrive, and its strength is the mean of its best nine. Hard difficulty rates rivals 10% higher.',
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
          'Canteen ($12,000): morale. Sponsor Board ($10,000, one only): $3,000 a week per level. Grandstand ($120,000, one only): seats 3,500, 5,000 or 6,500.',
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
