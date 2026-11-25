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
import { fmtMoney } from '../../utils/money';
import { BOARD, DIFFICULTY, ECON, LEAGUE, PRIZE, SQUAD_MIN, SEASON_ROUNDS, FINALS_WEEKS, WEEKS_PER_SEASON, TRAINING_FOCUS, WILDCARDS } from '../../config';
import { activePack } from '../../content';
import { inlineIqStat } from '../../content/pack';
import { ATTACK_COACHES, ATTACK_SPECIALITIES, STAFF } from '../../systems/staff';
import { playsOfFamily } from '../../data/plays';
import { PLAYS } from '../../match/league/plays';
import { sponsorReturn } from '../../systems/economy';
import { matchIncomeTier } from '../../systems/matchIncome';
import { leagueSeasonView } from '../../systems/leagueSeasonView';
import { officeUnlockLine } from '../coachCallsText';

const percent = (x: number): string => `${Math.round(x * 100)}%`;
/** The `footyIQ` stat as the content pack names it (#361): "Footy IQ", and "footy IQ" mid-sentence. */
const IQ = activePack().vocab.iqStat;
const IQ_INLINE = inlineIqStat(activePack());

/** The club the page is read for; null before a game is loaded (the Guide's text then quotes a new club). */
function clubNow(): GameState | null {
  try {
    return getState();
  } catch {
    return null;
  }
}

/**
 * The Money page's Sponsor Board line (N12): the rule, then what the club's own
 * board pays at its current sporting tier (or what a new one would). Worked
 * out each time the page is shown using the same basis as match income.
 */
export function sponsorBullet(club: GameState | (Pick<GameState, 'reputation' | 'facilities'> & Partial<Pick<GameState, 'capAccount'>>) | null = clubNow()): string {
  const level = (club?.facilities ?? []).reduce((m, f) => (f.defId === 'sponsorBoard' ? Math.max(m, f.level) : m), 0);
  const tier = club && 'clubId' in club ? matchIncomeTier(club) : club?.capAccount?.tier ?? 'premier';
  const amount = fmtMoney(sponsorReturn(level || 1, 0, tier));
  return `A Sponsor Board pays 3% / 9% / 18% of match base at levels 1 / 2 / 3 on played non-trial matches. ${level ? `Yours (level ${level}) pays` : 'A new one would pay'} ${amount} per eligible match. No income while idle.`;
}

/**
 * The Grounds page's Coach's Office line (N9.6): what it trains, morale, and the
 * coach calls it unlocks, with what the club's next level unlocks (from CALLS.unlocks).
 */
export function coachsOfficeBullet(club: Pick<GameState, 'facilities'> | null = clubNow()): string {
  const level = (club?.facilities ?? []).reduce((m, f) => (f.defId === 'coachsOffice' ? Math.max(m, f.level) : m), 0);
  const yours = level > 0 ? `Yours is level ${level}. ` : '';
  return `Coach’s Office ($30,000): IQ, handling and kicking, and morale, and it unlocks coach calls (Office ▸ Coach calls lists them all). ${yours}${officeUnlockLine(level)}`;
}

/**
 * The Tactics page's set plays (#326), worded from the catalogue and the
 * staff table so they move with them: the four attack coaches and their
 * wages, what each opens, the three taken in, and what IQ and style do.
 */
export function setPlaysBullets(): string[] {
  const coaches = ATTACK_SPECIALITIES.map((sp) => `${ATTACK_COACHES[sp].short} (${fmtMoney(ATTACK_COACHES[sp].wage)} a week on Normal)`).join(', ');
  const families = ATTACK_SPECIALITIES.map((sp) => `${ATTACK_COACHES[sp].short}: ${playsOfFamily(sp).map((p) => p.name).join(', ')}`).join('. ');
  return [
    `Hire one attack coach at a time on Staff & Board: ${coaches}. The Razzle coach needs reputation ${PLAYS.razzleRep}. Each opens a family of plays to buy once on Office ▸ Playbook; plays you buy stay if he goes.`,
    `${families}.`,
    `Take up to ${PLAYS.takeMax} into a match with PLAYS on the Lineup screen. Your half calls them himself when one is on, in your order, from the play-the-ball or a tap restart, at most ${PLAYS.auto.perHalf} a half.`,
    `Each play needs ${IQ_INLINE} from the men who run it; the Playbook shows who falls short. Short of it, a play breaks down more often: mostly a wasted tackle, now and then an intercept.`,
    'A play of your own attack style breaks down less and pays off more when the squad fits the style; some defences read some plays (Slide reads the shifts).',
  ];
}

/** A picture a section can show under its text (guide.ts draws it). */
export type GuideFigure = 'bonus-zone';

export interface GuideSection {
  heading?: string;
  text?: string;
  bullets?: string[];
  figure?: GuideFigure;
  /** A screen the section links to, under its text (guide.ts draws the button). */
  link?: GuideScreen;
}

/** A nav screen a page can link to (N14, #263): guide.ts opens it. */
export type GuideScreen = 'finance' | 'squad' | 'lineup' | 'news' | 'ladder' | 'build' | 'calls' | 'playbook';

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
        text: `New careers begin each season with two pre-season trials: try a lineup, earn a small home gate, with no ladder points or contract weeks used. Then come ${WEEKS_PER_SEASON} competitive weeks: ${SEASON_ROUNDS} rounds and ${FINALS_WEEKS} finals weeks if you make the eight. Older careers keep their existing season shape. Play Week runs one week: training and injuries, wages and income, your match and the rivals’, the ladder, the free-agent pool (it refreshes every 4 weeks), then an autosave.`,
      },
      {
        heading: 'Advancing further',
        bullets: [
          'The ▾ beside Play Week runs ×4 weeks, to the finals or to the season’s end.',
          `A long advance stops early when something needs you: fewer than 13 fit (sign cover or risk a forfeit), an injury, a contract about to run out, a decision card in News, or money: the week the balance goes into the red, and the week the balance passes the ${fmtMoney(ECON.FORCED_SALE_FLOOR)} floor (not every week in the red). A negative balance does not sell a player.`,
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
            'Played matches pay a guaranteed base: Local $8,000, Championship $12,000, Premier $18,000. Home venue income adds half that base; a Grandstand adds 15% / 45% / 90% more at levels 1 / 2 / 3. Crowds remain a visual measure of reputation and form, not an extra ticket payment.',
            'Wins add 10% of the base; draws add 5%. Trials pay a quarter-base only. Byes, unplayed fixtures and idle weeks earn nothing.',
            sponsorBullet(),
            `Finals prize money at the rollover: ${fmtMoney(PRIZE.PER_FINALS_WEEK)} for every finals week played, ${fmtMoney(PRIZE.GRAND_FINAL)} more for a grand final and ${fmtMoney(PRIZE.PREMIERSHIP)} for the premiership. Easy pays ${percent(DIFFICULTY.easy.prize)} of that and Hard ${percent(DIFFICULTY.hard.prize)}; Normal pays it as written.`,
            `The board pays ${fmtMoney(BOARD.GRANT_PER_MET)} for every objective met (Easy ${percent(DIFFICULTY.easy.prize)}, Hard ${percent(DIFFICULTY.hard.prize)}); some event cards pay too.`,
          ];
        },
      },
      {
        heading: 'Going out',
        bullets: [
          'A signing fee: one year’s wage up front, or a quarter of that for an Academy prospect. A Scout Office takes 10% off the fee per level. The salary then sits on the cap, not the bank, and difficulty does not scale either number.',
          'Releasing a player: a quarter of the salary still to run, and never more than one year’s salary. It is refused when the cash is short. The signing fee is not refunded.',
          'Building, moving (10% of the build cost) and demolishing (30% back).',
          'A renewal costs no cash. The new salary starts when the current deal ends.',
        ],
      },
      {
        heading: 'The Finance screen',
        text: 'This season’s books by line, the cash in the bank, and the salary cap: what this season’s deals add up to and what is already promised next season. Salaries sit on the cap. They are not a weekly bill, and a negative balance does not sell a player. The balance at the left of the dock is the cash in the bank; tap it to open this screen.',
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
        text: `Between 13 and 30 players (you need 13 fit to field a side). A player’s overall is handling and ${IQ_INLINE} (25% each), speed (20%), strength and stamina (15% each). Tap any player card for his page: stats, traits and tips, morale, contract, tallies and the actions that apply.`,
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
          'A new signing covers the rest of this season and needs both the cash for the fee and room under the salary cap. You are warned at 8, 4 and 1 weeks, unless a renewal is already queued. When the deal ends he is unsigned unless you have renewed. Renewing queues one new season after this deal, and a second renewal in the same season does nothing. The board does not lend.',
          'The renewal ask follows his ability now, with a small change for age and potential. It does not move because he is unhappy, and the club’s reputation does not inflate it. A signed salary stays fixed until that deal ends.',
          'Sell previews a real buying club, its fee and the existing contract before you confirm. The buyer must have cash, squad space and salary-cap room. With no eligible buyer, nothing moves. Release costs the payout shown and is refused when cash is short. Neither action can take the squad below 13.',
        ],
      },
      {
        heading: 'Staff',
        bullets: [
          'Three hires the facilities don’t cover, beside the board’s objectives on the Staff & Board screen (in Office). Each is paid a wage a week with the running costs and stays until you let him go.',
          `${STAFF.assistantCoach.title} (${fmtMoney(STAFF.assistantCoach.wage)} a week on Normal): changes your plan at the break when you fast-forward a match, the same way a rival’s does. A match you watch, and Skip, stay on the plan you set.`,
          `${STAFF.analyst.title} (${fmtMoney(STAFF.analyst.wage)} a week on Normal): on the next-match card and the rival’s squad page, says what they switch to when they are behind.`,
          `${STAFF.welfare.title} (${fmtMoney(STAFF.welfare.wage)} a week on Normal): halves the odds of a player’s grievance card (a meeting, a pay-rise demand, a homesick youngster) and takes 3% off a new agreement.`,
        ],
      },
      {
        heading: 'Recruiting',
        bullets: [
          'Scouting discovers up to 12 unsigned players every 4 weeks; it does not replace the people already in the world. Earlier Academy prospects and your club’s released or expired players remain accessible. Rivals recruit from that same population and need cash and salary-cap room. A signing costs one year’s wage up front (a quarter for an Academy prospect’s first signing). A Scout Office takes 10% off the fee per level.',
          `The pool sits around the league: at a new club its players are about ${LEAGUE.MEAN - LEAGUE.POOL_BELOW} overall, with a star now and then. Reputation, a Scout Office and an Academy lift it.`,
          'Each pre-season the Academy brings 3 prospects aged 17–19 into the pool, 4 with an Academy built and 5 at level 3; from level 2 they arrive as Young Guns.',
          `At season rollover, expiry or retirement can leave fewer than ${SQUAD_MIN} registered players. Emergency scholarships fill only those vacancies up to the minimum; injuries and bans do not create replacements. A scholarship lasts one season and cannot be sold or released during that term.`,
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
        heading: 'Set plays',
        bullets: setPlaysBullets(),
        link: 'playbook',
      },
      {
        heading: 'Kicker and captain',
        bullets: [
          'On the Lineup screen select a starter and tap Kicker or Captain (tap again for the default). K and C mark them on the field.',
          'Your goal-kicker takes the conversions and penalty goals, and a field goal when he has the ball; his Kicking (and Big Boot) is what goes over. Unpicked, or off the field, your best-kicking half takes them. Kicks in play stay with the halfback.',
          `Your captain makes the penalty call: a smart one (${IQ}) takes the points on a slimmer chance; a Hothead taps and runs from further out.`,
          `Leave them unpicked and the best-kicking half kicks and the starter with the best ${IQ} captains.`,
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
          'Every rival plays a style. On Easy it keeps its own squad style. On Normal and Hard rivals read your last three league plans, never your upcoming pick; Hard also weighs your squad fit and can react to the plan seen in the first half. Vary your plans to keep them guessing.',
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
          `A risky choice says its odds. The sharp ones are a ${Math.round(WILDCARDS.INCIDENT_CHANCE * 100)}% chance of a ${WILDCARDS.BAN_WEEKS[0]}-${WILDCARDS.BAN_WEEKS[1]} week ban, and a Welfare Manager halves that. The ban shows on the squad as BAN, and the lineup leaves him out. After the grand final the squad asks for a trip to ${activePack().events.trip.destination}.`,
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
        text: `${activePack().clubs.length + 1} clubs play ${SEASON_ROUNDS} rounds: 2 points for a win, 1 for a draw, points difference splits ties. The Ladder tab shows every club’s form (the last five), and a club’s name opens its squad. The Fixtures tab previews your next match.`,
      },
      {
        heading: 'Finals',
        bullets: [
          `The top eight play quarter finals (1 v 8, 2 v 7, 3 v 6, 4 v 5), the winners are re-seeded for the semis, and the grand final is week ${WEEKS_PER_SEASON}. A final level at full time goes to golden point: ${NINES.goldenPointMinutes} more minutes, and the next score wins (a try needs no conversion). Still level after that, the higher seed goes through. Finals are night games.`,
          'Prize money is paid at the rollover; the premiership is worth 15 reputation on top.',
        ],
      },
      {
        heading: 'Reputation and the board',
        bullets: [
          'Reputation moves with the finish: the top four gain (+4 for first, down to +1), the bottom four lose (−1 to −4), each finals win adds 1 and a lost grand final 3. It then settles 10% of the way back toward 30, so a club has to keep earning it.',
          `The board sets objectives each season (a ladder finish, beating a rival, or building) and keeps 5 points of patience: a missed objective costs one, a clean sweep earns one back, and zero means the sack. Reaching the grand final, or winning the premiership, meets the ladder finish from any place on the table, and a premiership season is never a sacking. Cash is not an objective. A building goal asks only for facilities the cash can pay for when the goals are set, at the cheapest build price, and it is left off when the cash cannot buy one. Each one met pays ${fmtMoney(BOARD.GRANT_PER_MET)} and ${BOARD.REP_PER_MET} reputation. Easy pays ${percent(DIFFICULTY.easy.prize)} of the grant and Hard ${percent(DIFFICULTY.hard.prize)}.`,
        ],
      },
      {
        heading: 'Rivals',
        text: 'Every rival keeps a real squad: it signs from the free-agent pool when a position is thin or the squad is short (the news reports signings from the top of the pool), its players develop and age, juniors arrive, and its strength is the mean of its best nine. On Hard every rival you play is a little better on the day than that rating says, on Easy a little worse.',
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
        // A getter, so the Coach's Office line names what the club's next level unlocks each time the page is shown.
        get bullets(): string[] {
          return [
            `Training Paddock ($8,000): speed and stamina. Weights Room ($15,000): strength. Team Gym ($40,000): strength, speed and stamina. Video Room ($18,000): ${IQ_INLINE}.`,
            coachsOfficeBullet(),
            'Physio Centre ($22,000): stamina, and injuries heal a week faster. Medical Bay ($35,000): injuries heal faster by its level.',
            `Canteen ($12,000): morale. Sponsor Board ($10,000, one only): ${fmtMoney(ECON.SPONSOR_BASE)} a week plus ${fmtMoney(ECON.SPONSOR_PER_REP)} a reputation point (up to ${fmtMoney(ECON.SPONSOR_CAP)}), more at levels 2 and 3. Grandstand ($120,000, one only): seats 3,500, 5,000 or 6,500.`,
            'Academy ($60,000): handling, kicking and IQ, more and better juniors each pre-season. Scout Office ($25,000): a better free-agent pool and signing fees 10% cheaper per level.',
          ];
        },
      },
      {
        heading: 'Life on the grounds',
        text: 'Players, staff and (on match weeks) fans walk the paths; buildings pop up with scaffolding and come down the same way. It is all show: nothing on the grounds changes a match except what the facilities train.',
      },
    ],
  },
];

/** Saved season facts replace legacy timing/rewards only for an opted-in League career. */
export function guidePageForCareer(page: GuidePage, state: GameState | null = clubNow()): GuidePage {
  const view = state ? leagueSeasonView(state) : null;
  if (!view || !state) return page;
  const definition = view.instance.definition;
  const dates = definition.stages.map(stage => `${stage.name}: ${stage.slotIds?.length ? `weeks ${stage.slotIds.join(', ')}` : 'dates not recorded'}`).join(' · ');
  const rules = definition.matchRules;
  const tie = definition.drawnKnockout === 'higher-seed' ? 'the higher seed advances' : 'the saved tie draw decides who advances';
  const rewards = 'No extra title cash, board grant or salary-cap prize is paid in this career. Ordinary played-match income still applies.';
  if (page.id === 'week') return { ...page, sections: [
    { text: `This saved year has ${view.calendar.slots.length} weeks, including trials, competition dates and quiet weeks. Play Week advances one calendar interval: training, recovery and any scheduled matches, followed by an autosave. Quiet weeks still count toward the year and contracts; they earn no match income. Salaries sit on the cap and are not weekly cash deductions.` },
    { heading: 'Your dates', text: dates },
    { heading: 'Choosing next season', text: 'Choose a league before play begins. At the end of the full calendar, review the completed year and deliberately choose any earned league. Time stays paused at that choice; confirming runs ageing, contracts and the new schedule once. League choice never lowers the club’s attained capacity.' },
    ...page.sections.slice(1),
  ] };
  if (page.id === 'events') return { ...page, sections: [{ text: 'Decision-card events and optional competition offers are not enabled in this League career. Your saved fixtures are the competitions you actually entered; no event cash or season-end trip is promised.' }] };
  if (page.id === 'money') return { ...page, sections: page.sections.map(section => section.heading === 'Coming in'
    ? { ...section, bullets: [...section.bullets!.slice(0, 2), sponsorBullet(state), rewards,
      'Match payments follow the chosen sporting division, even when the club retains a higher salary-cap capacity. Choosing an easier league does not reduce that capacity.'] } : section) };
  if (page.id === 'ladder') return { ...page, sections: [
    { text: `${view.division.name}: ${view.fieldSize} clubs, ${view.regularRounds} regular rounds. ${definition.standings!.win} points for a win, ${definition.standings!.draw} for a draw and ${definition.standings!.loss} for a loss. Ties use ${definition.standings!.tieBreakers.map(t => t.replace(/-/g, ' ')).join(', ')} in that order.` },
    { heading: 'Finals and dates', text: `${view.finalsSize ? `Top ${view.finalsSize} qualify for finals.` : 'No finals this season.'} ${dates}. A tied knockout plays ${rules.goldenPointMinutes} minutes of golden point; if still tied, ${tie}.` },
    { heading: 'Permanent league access', text: `${view.goal} A minor premiership is a separate honour. A cancelled, withdrawn or missing final does not award a title. There is no automatic promotion or relegation.` },
    { heading: 'Rewards and the board', text: `${rewards} The board’s saved objectives use this league’s field. Results affect reputation and patience; missing an objective costs one patience, a clean sweep earns one back, and zero means dismissal. Reaching this league’s final, or winning the title, meets the ladder finish from any place, and a title season is never a sacking.` },
    { heading: 'Your current objectives', bullets: state.objectives.map(o => o.text) },
    page.sections[page.sections.length - 1]!,
  ] };
  if (page.id === 'nines') return { ...page, sections: page.sections.map((section, index) => index === 0
    ? { text: `This competition’s saved rules: ${definition.lineup.onField} a side, ${definition.lineup.benchSize} on the bench, two halves of ${rules.halfMinutes} minutes. The clock stops after a try until the restart; after the siren, play continues until the ball is dead. At half-time players recover ${Math.round(rules.halfTimeLegsBack * 100)}% of lost legs. A drawn knockout plays ${rules.goldenPointMinutes} minutes of golden point; if still tied, ${tie}.` }
    : section.heading === 'Sets and scoring' ? { ...section, bullets: [section.bullets![0]!,
      `A try is ${rules.tryPoints} points, or ${rules.bonusTryPoints} in the bonus zone. Conversions are ${rules.conversionPoints}-point drop kicks, taken by your named goal-kicker when on the field, otherwise your best-kicking half. Field goals score ${rules.fieldGoalPoints}.`] }
    : section.heading === 'The bonus zone' ? { ...section, text: `The marked in-goal area between the posts is the bonus zone: a try grounded there is worth ${rules.bonusTryPoints} points.` } : section) };
  if (page.id === 'squad') return { ...page, sections: page.sections.map(section => section.heading === 'Contracts'
    ? { ...section, bullets: ['While choosing next season, signing and renewal quotes cover that upcoming year. During play, remaining time follows the saved calendar. Existing signed terms and queued renewals survive league choice; new promises must fit the club’s retained salary-cap capacity.', ...section.bullets!.slice(1)] }
    : section.heading === 'Staff' ? { ...section, bullets: ['Staff stay until you let them go. Displayed wages are not weekly cash deductions.', ...section.bullets!.slice(1)] } : section) };
  return page;
}
