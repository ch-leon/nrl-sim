// QA only. Decisions call the same system operations as the club screens and soak manager.
import { getState, setState, type GameState, type Player, type PlayerStats } from '../../core/state';
import { ON_FIELD, SQUAD_CAP, WEEKS_PER_SEASON, difficultyMultipliers } from '../../config';
import { makeRng } from '../../utils/rng';
import { overallRating, POSITION_GROUPS, shownStats, type PositionGroup } from '../../data/player';
import { cardById, type EventEffect } from '../../data/events';
import { FACILITY_CATALOG, upgradeCost, type FacilityDefId } from '../../data/facility';
import { spendMoney } from '../../data/club';
import { homeGate } from '../../systems/economy';
import { PLAY_LIST, PLAYS_BY_ID, type Play } from '../../data/plays';
import { hasTrait } from '../../data/traits';
import { chooseEvent } from '../../systems/events';
import { setTrainingFocus, spendByFocus, TRAINING_FOCI, weakestStat } from '../../systems/training';
import { releasePlayer, signPlayer, signingFee } from '../../systems/freeagency';
import { renewalFee, renewEarly } from '../../systems/contracts';
import { attackCoach, attackCoachWage, ATTACK_SPECIALITIES, hasStaff, hireAttackCoach, hireStaff, staffWage } from '../../systems/staff';
import { buyPlay, ownedPlays, takePlay } from '../../systems/playbook';
import { autoPickKeepingPlan, commitLineup, isFieldable, resolveLineup, setTactics } from '../../systems/lineup';
import { rivalMatchSheet } from '../../systems/matchday';
import { playerRivalContext } from '../../systems/rivalRound';
import { teamSheetFromSquad } from '../../match/league/sheets';
import { styleFit } from '../../match/league/fit';
import { COUNTER_MATRIX } from '../../match/league/counterMatrix';
import { ATTACK_PRESETS, DEFENCE_PRESETS, DEFAULT_TACTICS, type TeamTactics } from '../../match/league/presets';
import { playFit, playOdds, PLAYS } from '../../match/league/plays';
import { emptyWeekLog, type PersonaConfig, type SigningTally, type WeekLog } from './types';

export interface SoakOperations {
  buildFirstFree(id: FacilityDefId): boolean;
  weeklyNet(s: GameState): number;
}
/** Transparent utility estimate for visible card effects; no future deck or RNG peeking. */
export function effectValue(e: EventEffect): number {
  switch (e.kind) {
    case 'chance': return e.p * e.hit.reduce((n, x) => n + effectValue(x), 0);
    case 'modifier': return e.weeks * (e.trigger === 'weekly' ? 1 : 0.5) * e.effects.reduce((n, x) => n + effectValue(x), 0);
    case 'money': return e.amount;
    case 'reputation': return e.amount * 1000;
    case 'squadMorale': return e.amount * 500;
    case 'playerMorale': return e.amount * 100;
    case 'playerWage': return -e.pct * 20_000;
    case 'boardPatience': return e.amount * 1000;
    case 'suspend': return -1000 * (typeof e.weeks === 'number' ? e.weeks : (e.weeks[0] + e.weeks[1]) / 2);
    case 'closeGates': return -10_000;
    case 'playerTrait': return 1500;
    case 'signSubject': return 2_000;
    case 'flag': return 0;
    default: return 0;
  }
}

/** Position weights for a min-maxer's point. Offload King also leans on strength and handling. */
const POINT_WEIGHT: Readonly<Record<PositionGroup, Partial<Record<keyof PlayerStats, number>>>> = {
  'outside-backs': { speed: 4, handling: 3, footyIQ: 2, strength: 1 },
  halves: { handling: 4, kicking: 4, footyIQ: 3, speed: 2 },
  hooker: { handling: 4, footyIQ: 3, stamina: 2, strength: 2 },
  forwards: { strength: 4, stamina: 3, speed: 2, footyIQ: 2 },
};

function spendOptimal(player: Player): Player {
  const stats = { ...player.stats };
  let points = player.unspentPoints ?? 0;
  const keys = shownStats(player.position);
  const weights = { ...POINT_WEIGHT[POSITION_GROUPS[player.position]] };
  if (hasTrait(player.traits, 'offloadKing')) {
    weights.strength = (weights.strength ?? 0) + 1;
    weights.handling = (weights.handling ?? 0) + 1;
  }
  const room = (key: keyof PlayerStats): number => Math.max(0, (player.ceilings[key] ?? stats[key]) - stats[key]);
  while (points > 0) {
    const open = keys.filter(k => room(k) >= 1);
    if (!open.length) break;
    open.sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0) || stats[a] - stats[b] || a.localeCompare(b));
    const target = open[0]!;
    stats[target] = Math.min(player.ceilings[target]!, stats[target] + 1);
    points--;
  }
  return { ...player, stats, unspentPoints: points };
}

function spendPartial(player: Player, focus: GameState['training']['focus']): Player {
  const total = player.unspentPoints ?? 0;
  const toSpend = Math.floor(total / 2);
  if (toSpend <= 0) return player;
  const spent = spendByFocus({ ...player, unspentPoints: toSpend }, focus);
  return { ...spent, unspentPoints: (spent.unspentPoints ?? 0) + (total - toSpend) };
}

function spendRandom(player: Player, hold: number, rng: { next: () => number; int: (a: number, b: number) => number }): Player {
  if ((player.unspentPoints ?? 0) <= 0) return player;
  if (rng.next() < hold) return player;
  const stats = { ...player.stats };
  let points = player.unspentPoints ?? 0;
  const keys = shownStats(player.position);
  const room = (key: keyof PlayerStats): number => Math.max(0, (player.ceilings[key] ?? stats[key]) - stats[key]);
  while (points > 0) {
    const open = keys.filter(k => room(k) >= 1);
    if (!open.length) break;
    const target = open[rng.int(0, open.length - 1)]!;
    stats[target] = Math.min(player.ceilings[target]!, stats[target] + 1);
    points--;
  }
  return { ...player, stats, unspentPoints: points };
}

/** A private decision RNG. Never consumes or replaces the game's random stream. */
export function createPersonaManager(config: PersonaConfig, seed: number, ops: SoakOperations) {
  const rng = makeRng(seed ^ 0x534a1);
  const decisions = { considered: 0, mistakes: 0 };
  let log = emptyWeekLog();
  let callThisWeek = false;
  const slip = (): boolean => {
    decisions.considered++;
    const bad = rng.next() < config.mistakeRate;
    if (bad) decisions.mistakes++;
    return bad;
  };
  const byRating = (a: Player, b: Player): number => overallRating(b) - overallRating(a) || a.id.localeCompare(b.id);
  const sheet = () => {
    const s = getState();
    return teamSheetFromSquad(s.squad, s.clubId, s.clubName, ['#000000', '#ffffff'], resolveLineup(s.lineup, s.squad));
  };
  const opposition = (): TeamTactics | undefined => {
    const s = getState();
    const f = s.league.fixtures.find(f => !f.result && (f.homeId === s.clubId || f.awayId === s.clubId));
    const club = s.league.clubs.find(c => c.id === (f?.homeId === s.clubId ? f.awayId : f?.homeId));
    return club ? rivalMatchSheet(club, playerRivalContext(s)).tactics : undefined;
  };
  const fitScore = (p: Play): number => {
    const nine = (sheet().roster ?? []).map(p => ({ name: p.name, footyIQ: p.stats?.footyIQ ?? 50 }));
    const odds = playOdds(p, playFit(p, nine).shortfall, getState().lineup.tactics.attack, opposition()?.defence ?? 'slide');
    // Strong means executable with useful contact bonuses; price only breaks close ties.
    return (1 - odds.fail) * (1 + Object.values(p.mods).reduce((a, b) => a + Math.abs(b), 0)) - p.price / 1_000_000;
  };
  const rankPlays = (plays: readonly Play[], poor = false): Play[] => [...plays].sort((a, b) =>
    (poor ? 1 : -1) * (fitScore(a) - fitScore(b)) || a.id.localeCompare(b.id));

  function weekly(): SigningTally {
    log = emptyWeekLog();
    callThisWeek = false;
    for (const ev of [...getState().eventDeck.pending]) {
      const card = cardById(ev.cardId);
      if (!card) continue;
      const mistake = slip();
      if (mistake && config.events !== 'random') continue; // newcomer mistakes are inaction
      const choice = config.events === 'random' ? rng.int(0, card.choices.length - 1)
        : config.events === 'first' ? 0 : card.choices.map((c, i) => ({ i, value: c.effects.reduce((n, e) => n + effectValue(e), 0) }))
          .sort((a, b) => b.value - a.value || a.i - b.i)[0]!.i;
      chooseEvent(ev.id, choice);
      log.events.push(`${card.id}: ${card.choices[choice]?.label ?? choice}`);
    }
    if (!slip() || config.training === 'random') {
      const best = [...getState().squad].sort(byRating).slice(0, ON_FIELD);
      setTrainingFocus(config.training === 'weakest' ? weakestStat(best)
        : config.training === 'random' ? rng.pick(TRAINING_FOCI.filter(f => f !== 'balanced')) : 'balanced');
    }
    log.focus = getState().training?.focus ?? 'balanced';
    if (!slip() && config.facilities.policy !== 'none' && config.facilities.policy !== 'neglect') {
      for (const id of config.facilities.builds) {
        const s = getState();
        const built = s.facilities.find(f => f.defId === id);
        if (id === 'grandstand') {
          // Same sold-out gate trigger as the existing soak manager, supplied in the weekly net budget.
          const home = s.league.fixtures.find(f => f.homeId === s.clubId && !f.result);
          if (!home || !homeGate(s, home).soldOut) continue;
        }
        if (s.money - FACILITY_CATALOG[id].cost < config.facilities.reserve) continue;
        if (!built) {
          if (ops.buildFirstFree(id)) log.facilities.push(`built ${FACILITY_CATALOG[id].name}`);
          break;
        }
        if (config.facilities.policy === 'invest' && built.level < 3) {
          const level = (built.level + 1) as 2 | 3;
          const cost = upgradeCost(FACILITY_CATALOG[id], level);
          if (s.money - cost >= config.facilities.reserve && spendMoney(cost, `upgrade:${id}`)) {
            setState({ facilities: getState().facilities.map(f => f.id === built.id ? { ...f, level } : f) });
            log.facilities.push(`upgraded ${FACILITY_CATALOG[id].name} to L${level}`);
            break;
          }
        }
      }
    }
    // Neglect deliberately leaves facilities as they are; the API has no upkeep toggle.
    const out: SigningTally = { count: 0, fees: 0, overall: 0 };
    if (!slip() || config.recruits.policy === 'stars') {
      if (config.recruits.renewStars) {
        for (const p of [...getState().squad].sort(byRating).slice(0, ON_FIELD)) {
          const s = getState();
          if (p.contractWeeks <= 4 && s.money - renewalFee(s, p) - p.wage * config.recruits.wageWeeks >= config.recruits.reserve) renewEarly(s, p.id);
        }
      }
      // One star a week, or enough affordable players to reach the shallow squad floor.
      for (let n = 0; n < SQUAD_CAP; n++) {
        const s = getState();
        if (s.squad.length >= SQUAD_CAP) break;
        const short = s.squad.length < config.recruits.floor || s.squad.filter(isFieldable).length < 13;
        if (!short && !['improve', 'stars'].includes(config.recruits.policy)) break;
        const ninth = [...s.squad].sort(byRating)[ON_FIELD - 1];
        const candidates = s.freeAgents.filter(p => !p.junior && isFieldable(p)
          && s.money - signingFee(s, p) - p.wage * config.recruits.wageWeeks >= config.recruits.reserve
          && (short || config.recruits.policy === 'stars' || overallRating(p) > (ninth ? overallRating(ninth) : 0))
          && (config.recruits.policy !== 'improve' || ops.weeklyNet(s) - p.wage * difficultyMultipliers(s.settings.difficulty).wages >= -3000))
          .sort(config.recruits.policy === 'minimum' ? (a, b) => a.wage - b.wage || byRating(a, b) : byRating);
        const p = candidates[0];
        if (!p) break;
        const before = s.money;
        if (!signPlayer(s, p.id).ok) break;
        const fee = before - getState().money;
        out.count++; out.fees += fee; out.overall += overallRating(p);
        log.signings.push(`${p.name} ${Math.round(overallRating(p))} $${Math.round(fee)}`);
        if (!short || config.recruits.policy === 'stars') break;
      }
    }
    if (config.releases === 'depth' && !slip()) {
      const s = getState();
      const depth = [...s.squad].sort(byRating).slice(13);
      const worst = depth[depth.length - 1];
      if (worst && s.squad.length > 16) {
        const rating = Math.round(overallRating(worst));
        if (releasePlayer(s, worst.id).ok) log.releases.push(`${worst.name} ${rating}`);
      }
    }
    if (!slip()) for (const role of config.staff.roles) {
      const s = getState();
      if ((s.season > 1 || s.week >= config.staff.fromWeek) && !hasStaff(s, role)
        && s.money - staffWage(s, role) * WEEKS_PER_SEASON >= config.staff.reserve && hireStaff(role)) log.staff.push(role);
    }
    return out;
  }
  function prepareMatch(): void {
    callThisWeek = false;
    if (getState().squad.filter(isFieldable).length < ON_FIELD) {
      log.tactics = 'no side';
      log.calling = 'none';
      return;
    }
    const badTactics = slip();
    if (config.tactics !== 'defaults') {
      const s = getState();
      const fit = styleFit(sheet().roster ?? []);
      const other = opposition();
      const bad = config.tactics === 'mismatch' || badTactics;
      const attackScore = (a: TeamTactics['attack']) => (other ? COUNTER_MATRIX[a][other.defence] * 10 : 0) + fit[a];
      const defenceScore = (d: TeamTactics['defence']) => (other ? -COUNTER_MATRIX[other.attack][d] * 10 : 0) + fit[d];
      const order = bad ? 1 : -1;
      const attack = [...ATTACK_PRESETS].sort((a, b) => order * (attackScore(a) - attackScore(b)))[0]!;
      const defence = [...DEFENCE_PRESETS].sort((a, b) => order * (defenceScore(a) - defenceScore(b)))[0]!;
      commitLineup(setTactics(autoPickKeepingPlan(s.squad, s.lineup), { attack, defence }));
      log.tactics = `${attack}/${defence}`;
    } else if (!badTactics) {
      commitLineup(setTactics(getState().lineup, DEFAULT_TACTICS));
      log.tactics = `${DEFAULT_TACTICS.attack}/${DEFAULT_TACTICS.defence}`;
    } else log.tactics = 'unchanged';
    if (!slip() && config.attackCoach !== 'none' && !attackCoach(getState())) {
      const ranked = rankPlays(PLAY_LIST, config.attackCoach === 'mismatch');
      const family = ranked.find(p => ATTACK_SPECIALITIES.includes(p.family) && (p.family !== 'razzle' || getState().reputation >= PLAYS.razzleRep))?.family;
      const s = getState();
      if (family && s.money - attackCoachWage(s, family) * WEEKS_PER_SEASON >= config.staff.reserve && hireAttackCoach(family)) log.staff.push(`attack coach ${family}`);
    }
    if (!slip() && config.setPlays !== 'none') {
      const coach = attackCoach(getState());
      const poor = config.setPlays === 'poor-fit';
      const max = config.setPlays === 'one' ? 1 : PLAYS.takeMax;
      const offers = rankPlays(PLAY_LIST.filter(p => p.family === coach?.speciality), poor);
      for (const p of offers.slice(0, max)) {
        if (getState().money - p.price >= config.facilities.reserve) buyPlay(p.id);
      }
      if (!(config.setPlays === 'one' && getState().lineup.plays.length)) {
        const wanted = rankPlays(ownedPlays(getState()).map(id => PLAYS_BY_ID[id]), poor).slice(0, max).map(p => p.id);
        for (const id of [...getState().lineup.plays]) if (!wanted.includes(id)) takePlay(id);
        for (const id of wanted) if (!getState().lineup.plays.includes(id)) takePlay(id);
      }
    }
    log.setPlays = [...getState().lineup.plays];
    if (config.calling === 'ai' && !slip()) callThisWeek = true;
    log.calling = callThisWeek ? 'ai' : 'none';
  }
  /** Spend points the week just awarded. The week itself only banks them while spend mode is manual. */
  function spendPoints(): void {
    const focus = getState().training?.focus ?? 'balanced';
    const squad = getState().squad.map(p => {
      if ((p.unspentPoints ?? 0) <= 0) return p;
      if (config.points.policy === 'optimal') return spendOptimal(p);
      if (config.points.policy === 'partial') return spendPartial(p, focus);
      if (config.points.policy === 'random') return spendRandom(p, config.points.hold, rng);
      return spendByFocus(p, focus);
    });
    setState({ squad });
  }
  function takeLog(): WeekLog {
    const out: WeekLog = { ...log, signings: [...log.signings], releases: [...log.releases], facilities: [...log.facilities], staff: [...log.staff], events: [...log.events], setPlays: [...log.setPlays] };
    return out;
  }
  return { weekly, prepareMatch, spendPoints, takeLog, wantsLiveCalls: () => callThisWeek, decisions };
}
