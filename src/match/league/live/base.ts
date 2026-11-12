import type { ControlInput } from '../controls';
import { makeRng, type Rng } from '../../../utils/rng';
import type { TeamSheet } from '../../../sim/events';
import { FIELD_LENGTH, MID_X, MID_Y, clampToGround } from '../../core/field';
import { makeBody, maxSpeedFor } from '../../core/body';
import { flightAt, type BallState } from '../../core/ball';
import type { Side, SimEvent } from '../../core/snapshot';
import type { Vec } from '../../core/vec';
import type { Situation } from '../contest';
import { FULLBACK, HOOKER, KICKER, PLAYERS, ROLES } from '../roles';
import type { Candidate, KickChoice } from '../tactics';
import { DEFAULT_TACTICS, attackPlan, defencePlan, zoneOf, type AttackPlan, type DefencePlan, type DefencePreset, type TeamTactics } from '../presets';
import { defaultBreakRule, type BreakRule, type PlanChange } from '../breaks';
import { FATIGUE, drainRate } from '../fatigue';
import { refillSeconds, tankSeconds } from '../gas';
import type { WrestleState } from '../wrestle';
import { fullMatch, type MatchLength } from '../rules';
import { BENCH, DEFAULT_ROTATION, type Rotation } from '../bench';
import type { CaptainRead, PenaltyChoice } from '../penalties';
import { edgeSheets, spreadSheets } from '../spread';
import { CallJudge, callDefence, withAttackCall, withDefenceCall, type CallInput, type CallVerdict, type CoachCall } from '../calls';
import type { KickoffCall } from '../kickoff';
import { weatherEffect, type WeatherEffect } from '../weather';
import type { MatchInjury, WeatherKind } from '../../../sim/events';
import { styleFit, type StyleFit } from '../fit';
import { compressedCounter, fitEdge, rushCounter, slideCounter } from '../counters';
import { NO_AUTO_USED, sheetPlays, type AutoUsed } from '../plays';
import type { PlayId } from '../../../data/plays';
import { LIVE } from './knobs';
import { other, STAND_INS, captainOf, benchOf, statsOf, type Player, type BenchMan, type Phase, type PendingKick, type LiveOptions, type PlanInput, type ScriptedPlay } from './types';

export abstract class LiveBase {
  tick = 0;
  finished = false;
  protected readonly rng: Rng;
  protected readonly players: Player[];
  /** Each side's men on the field, kept once (side() is called many times a tick) and rebuilt when a man goes to or comes back from the sin bin (#71). */
  private homeOn: Player[];
  private awayOn: Player[];
  protected readonly names: Record<Side, string>;
  /** How each side plays (BAK-208 §5), changed at the breaks (N11). */
  readonly tactics: Record<Side, TeamTactics>;
  /** Tight fit of the selected starters, fixed before kick-off; bench and fatigue never rescore it. */
  protected readonly tightFit: Record<Side, number>;
  protected readonly squadFit: Record<Side, StyleFit>;
  protected readonly planFit: Record<Side, { attack: number; defence: number }>;
  /** The goal-kicker each side named (N11, a squad id); the slot-5 kicker when absent or off the field. */
  private readonly goalKickerKey: Record<Side, string | undefined>;
  /** Each side's captain, as the penalty call reads him (N11): neutral when the sheet names none. */
  protected readonly captain: Record<Side, CaptainRead>;
  protected ball!: BallState;
  protected phase!: Phase;
  protected attacking: Side = 'home';
  protected dir: 1 | -1 = 1;
  protected tackles = 0;
  protected lastPlay = false;
  /** Where the play-the-ball is / was (the line forms off it). */
  protected mark: Vec = { x: MID_X, y: MID_Y };
  /** The defensive line's x. */
  protected lineX = 60;
  /** The last ruck's fixed legal line; reaching it once releases each non-marker. */
  protected retreat: {
    side: Side; dir: 1 | -1; line: number;
    eligible: Map<Player, string>; markers: Map<Player, string>;
  } | null = null;

  protected pendingKick: PendingKick | null = null;
  /** Who kicked the ball now in the air (he leads the chase). */
  protected lastKicker = -1;
  /** What the last kick was (a territory kick is chased at cruise, N9.3); only read while a kick is in the air. */
  protected kickInAir: KickChoice | null = null;
  /** The kick in the air is a kick-off (chased as a line, not for a regather). */
  protected kickoffUp = false;
  /** The kicker's call for this last tackle (rolled once): run it, or which kick. */
  protected kickCall: 'run' | KickChoice | null = null;
  /** The kicker's field-goal call for this set (rolled once, only when one is on). */
  protected fgCall: boolean | null = null;
  /** A field goal about to leave the boot, and one in the air (with how it will end). */
  protected pendingGoal: { at: number; kicker: number } | null = null;
  protected goalUp: { side: Side; kicker: number; good: boolean } | null = null;
  /** A penalty kicked for touch, in the air (2e). */
  protected penaltyKickUp: { side: Side } | null = null;
  /** The weather and what it does (2f), the injury rate, and the injuries so far (for MatchResult). */
  readonly weather: WeatherKind;
  protected readonly wx: WeatherEffect;
  protected readonly injuryRate: number;
  protected readonly clubIds: Record<Side, string>;
  readonly injuries: MatchInjury[] = [];
  /** Penalties each side has conceded in its own 20 (#71: repeated infringements bring the sin bin closer). */
  protected readonly ownTwentyPens: Record<Side, number> = { home: 0, away: 0 };
  /** Tick the carrier crossed the line while going round for the bonus zone; -1 when he isn't. */
  protected overLineAt = -1;
  /** The side that has broken the line in this stretch of open play (one line break until the next tackle or stoppage). */
  protected lineBrokenBy: Side | null = null;
  /** Labs: match controls (Leon, 30 Oct). One timed intent for the next decision. */
  protected readonly controlList: ControlInput[];
  protected controlRead = 0;
  protected readonly pendingControl: Record<Side, ControlInput | null> = { home: null, away: null };
  /** Coach calls (#73): the list by tick, how far it has been read, each side's call in force and whether it has had its call this set each way. */
  protected readonly callList: CallInput[];
  /** Sides with an AI coach (N9.6). */
  protected readonly aiCoach: readonly Side[];
  /** Plan changes (N11): the list by tick, how far it has been read, and each side's new plan waiting for the restart. */
  protected readonly planList: PlanInput[];
  protected planRead = 0;
  protected readonly nextPlan: Record<Side, { tactics: TeamTactics; at: PlanChange['at']; minute: number } | null> = { home: null, away: null };
  /** The break rule (N13.5), and the sides it runs for. Null when the match has none. */
  protected readonly aiRival: LiveOptions['aiRival'];
  protected readonly breakRule: BreakRule | null;
  protected readonly breakRuleSides: ReadonlySet<Side>;
  /** Tries conceded in a row, without this side scoring in between. */
  protected readonly concededRun: Record<Side, number> = { home: 0, away: 0 };
  /** Plan changes the restart actually played (the match report's line). */
  readonly planChanges: PlanChange[] = [];
  protected callRead = 0;
  /** `attackLeft` / `defenceLeft`: tackles left for a call that lasts a number of them (callScope; #396: Offload, Gang tackle), 0 for one that lasts the set. */
  protected readonly callState: Record<Side, { attack: CoachCall | null; defence: CoachCall | null; usedAttack: boolean; usedDefence: boolean; attackLeft: number; defenceLeft: number }> = {
    home: { attack: null, defence: null, usedAttack: false, usedDefence: false, attackLeft: 0, defenceLeft: 0 },
    away: { attack: null, defence: null, usedAttack: false, usedDefence: false, attackLeft: 0, defenceLeft: 0 },
  };
  /**
   * A penalty won and not yet taken (#396): the captain's choice, how likely the shot is, and the
   * phase it set, which is the window for the coach's Take the two / Tap and go. Set by every
   * penalty, read only by those calls, so a match with none plays as before.
   */
  protected penaltyUp: { side: Side; mark: Vec; choice: PenaltyChoice; shot: number; phase: Phase; called: boolean } | null = null;
  /** Fresh legs (#367): a swap waiting for the next play-the-ball or stoppage, and the calls made this half. */
  protected readonly freshLegs: Record<Side, { pending: boolean; usedThisHalf: number }> = {
    home: { pending: false, usedThisHalf: 0 },
    away: { pending: false, usedThisHalf: 0 },
  };
  /** Who had the ball and on what tackle at the end of the last tick: a new set or a tackle ends a call's scope. */
  protected callAtk: Side | null = null;
  /** Which calls paid off (spec §3's last column). */
  protected readonly judge = new CallJudge();
  /** The kicking side's kick-off call (#397), made in the restart break and taken by the kick; then what the kick will do, settled where it comes down. */
  protected kickoffCall: { side: Side; call: KickoffCall } | null = null;
  protected kickoffPlay: { side: Side; call: KickoffCall; outcome: 'regather' | 'taken' | 'dead' } | null = null;
  /**
   * Every call judged so far, paid or not, with its ground (#366): the match screen
   * reads the new ones after each tick for the result tag by the chips. A view-side
   * channel, not events, so the event stream and every recorded match stay as they are.
   */
  readonly verdicts: CallVerdict[] = [];
  /**
   * Set plays (#326): each side's three as the sim runs them (none when the
   * sheet has none or `plays.on` is 0, and then nothing below is ever set, so
   * the match plays exactly as before); a coach's call waiting for the next
   * play-the-ball or tap; whether the side has had its play this set; the play
   * being run; a play's kick in the air; a caller who tucked it when his play
   * broke down; what the half remembers of his own calls; and the plays run.
   */
  protected readonly sheetPlays: Record<Side, PlayId[]>;
  protected readonly pendingPlay: Record<Side, PlayId | null> = { home: null, away: null };
  protected readonly playUsed: Record<Side, boolean> = { home: false, away: false };
  protected scripted: ScriptedPlay | null = null;
  protected playKick: { side: Side; edge: number; chasers: number[] } | null = null;
  protected tucked = -1;
  protected readonly autoUsed: Record<Side, AutoUsed> = { home: { ...NO_AUTO_USED, lastSet: {} }, away: { ...NO_AUTO_USED, lastSet: {} } };
  /** Plays each side launched, and how many broke down or were intercepted (a view channel, like `verdicts`: not events). */
  readonly playsRun: { launched: Record<Side, number>; brokeDown: Record<Side, number>; intercepted: Record<Side, number> } = {
    launched: { home: 0, away: 0 },
    brokeDown: { home: 0, away: 0 },
    intercepted: { home: 0, away: 0 },
  };
  /** Sets each side has had and how many it completed (§7 completion: a set not ended by its own error, a turnover or a penalty against it). */
  readonly sets: Record<Side, number> = { home: 0, away: 0 };
  readonly setsCompleted: Record<Side, number> = { home: 0, away: 0 };
  protected setLost = false;
  protected callTackles = 0;
  /** Touch and dead ball (2d): the side that touched the ball last, the kick in play (where from and what for), and a bounce on its way out. */
  protected lastTouch: Side = 'home';
  protected kickFrom: { side: Side; x: number; toLine: number; aim?: 'touch' | '40-20' } | null = null;
  protected outPending: { at: Vec; how: 'touch' | 'dead'; bounced: boolean } | null = null;
  /** Metres each side has gained with its kicks in play (kick spot to where the other side's set starts), and how many kicks that is. */
  readonly kickMetres: Record<Side, number> = { home: 0, away: 0 };
  readonly kicksMeasured: Record<Side, number> = { home: 0, away: 0 };
  /** A loose ball only this side may take (after a knock-on); null = anyone's. */
  protected looseFor: Side | null = null;
  /**
   * A scramble (#99): a loose ball both sides are near, said as it goes loose
   * (LOOSE BALL!) and named when someone comes up with it. `raceFor`: the side
   * that won the race to a grubber in the in-goal; only they can take it.
   */
  protected scramble = false;
  protected raceFor: Side | null = null;
  /** The last ruck's markers and the tick its ball was played (they hold until released). */
  protected markers: number[] = [];
  protected ruckPlayedAt = -1000;
  /** Extra spill chance on the pass in the air (a Razzle Dazzle offload). */
  protected spillExtra = 0;
  /** The latest offload receiver, while the drifting line is still recovering. */
  protected offloadReceiver: number | null = null;
  protected offloadUntil = -1;
  /** The trait to credit when the pass in the air is picked off. */
  protected interceptTrait: string | undefined;
  protected events: SimEvent[] = [];
  readonly tries: Record<Side, number> = { home: 0, away: 0 };
  readonly points: Record<Side, number> = { home: 0, away: 0 };
  /** Interchanges (2b): each side's bench and how hard its coach rotates it. */
  protected readonly bench: Record<Side, BenchMan[]>;
  readonly rotation: Record<Side, Rotation>;
  /** The clock (BAK-207 §5.1, 2a): which half, ticks of play gone in it, time up. */
  protected readonly length: MatchLength;
  protected half = 1;
  protected clockTicks = 0;
  protected siren = false;
  protected sirenAt = 0;
  /** 1 in the first half (home attacks +x), -1 after the ends swap. */
  protected ends: 1 | -1 = 1;
  /** The side that received the opening kick-off kicks off the second half: a coin toss (Phase 3; always home before, and home then won a third of even matches). */
  protected readonly firstReceiver: Side;
  /** A final: golden point if level at full time (N9.4); `golden` once it is being played. */
  protected readonly goldenPoint: boolean;
  protected golden = false;

  /** Starting-sheet scores stay fixed; a break selects the newly played styles. */
  protected refreshPlanFit(side: Side): void {
    const plan = this.tactics[side];
    this.planFit[side] = { attack: this.squadFit[side][plan.attack], defence: this.squadFit[side][plan.defence] };
  }

  protected slideEffect(attacker: Side = this.attacking): number {
    const defender = other(attacker);
    return slideCounter(this.tactics[attacker].attack, this.tactics[defender].defence,
      this.planFit[attacker].attack, this.planFit[defender].defence);
  }

  protected rushEffect(attacker: Side = this.attacking): number {
    const defender = other(attacker);
    return rushCounter(this.tactics[attacker].attack, this.tactics[defender].defence,
      this.planFit[attacker].attack, this.planFit[defender].defence);
  }

  protected compressedEffect(attacker: Side = this.attacking): number {
    const defender = other(attacker);
    return compressedCounter(this.tactics[attacker].attack, this.tactics[defender].defence,
      this.planFit[attacker].attack, this.planFit[defender].defence);
  }

  protected kickCover(kicking: Side): number {
    return this.tactics[kicking].attack === 'kick-chase' ? this.slideEffect(kicking) : 0;
  }

  protected rushKickGap(kicking: Side): number {
    return this.tactics[kicking].attack === 'kick-chase' ? this.rushEffect(kicking) : 0;
  }

  protected contestFitEdge(attacker: Side, defender: Side): number {
    return fitEdge(this.planFit[attacker].attack) - fitEdge(this.planFit[defender].defence);
  }

  constructor(home: TeamSheet, away: TeamSheet, seed: number, opts: LiveOptions = {}) {
    this.squadFit = { home: styleFit(home.roster ?? []), away: styleFit(away.roster ?? []) };
    this.tightFit = { home: this.squadFit.home.grind, away: this.squadFit.away.grind };
    this.sheetPlays = { home: sheetPlays(home.plays), away: sheetPlays(away.plays) };
    // How much the rating gap between the sides counts (Phase 3): stats drawn toward the match average;
    // then the difficulty's edge to the player's rival (N12.2), which the spread would mostly cancel.
    [home, away] = edgeSheets(...spreadSheets(home, away), opts.difficultyEdge);
    this.rng = makeRng(seed);
    this.firstReceiver = this.rng.next() < 0.5 ? 'home' : 'away';
    this.callList = opts.calls ?? [];
    this.controlList = opts.controls ?? [];
    this.aiCoach = opts.aiCoach ?? [];
    this.planList = opts.plans ?? [];
    this.aiRival = opts.aiRival;
    const listed = opts.breakRuleSides;
    if (opts.breakRule) {
      this.breakRule = opts.breakRule;
      this.breakRuleSides = new Set(listed ?? (['home', 'away'] as const));
    } else if (listed && listed.length > 0) {
      this.breakRule = defaultBreakRule;
      this.breakRuleSides = new Set(listed);
    } else {
      this.breakRule = null;
      this.breakRuleSides = new Set();
    }
    this.weather = opts.weather ?? 'clear';
    this.wx = weatherEffect(this.weather);
    this.injuryRate = opts.injuryRate ?? 1;
    this.clubIds = { home: home.clubId, away: away.clubId };
    this.length = opts.length ?? fullMatch();
    this.goldenPoint = opts.goldenPoint === true;
    this.names = { home: home.name, away: away.name };
    this.tactics = { home: { ...(home.tactics ?? DEFAULT_TACTICS) }, away: { ...(away.tactics ?? DEFAULT_TACTICS) } };
    this.planFit = { home: { attack: 1, defence: 1 }, away: { attack: 1, defence: 1 } };
    this.refreshPlanFit('home');
    this.refreshPlanFit('away');
    this.goalKickerKey = { home: home.kicker, away: away.kicker };
    this.captain = { home: captainOf(home), away: captainOf(away) };
    this.players = [...this.buildSide(home, 'home'), ...this.buildSide(away, 'away')];
    this.homeOn = this.players.slice(0, PLAYERS);
    this.awayOn = this.players.slice(PLAYERS);
    this.bench = { home: benchOf(home), away: benchOf(away) };
    this.rotation = { home: home.rotation ?? DEFAULT_ROTATION, away: away.rotation ?? DEFAULT_ROTATION };
    const energy = Math.max(0, Math.min(1, opts.energy ?? 1));
    for (const p of this.players) {
      p.energy = energy;
      p.gassed = energy < FATIGUE.spentAt;
      p.gas.gas = energy;
    }
    // A tired start (the lab's late legs, a closing stretch) finds the bench rested, as it would have been.
    for (const b of [...this.bench.home, ...this.bench.away]) b.energy = energy < 1 ? Math.max(energy, BENCH.recoverCap) : 1;
    this.setForKickoff(other(this.firstReceiver));
  }

  /** Ball to the kicking side's kicker and everyone on his kick-off spot (the start of each half). */
  protected setForKickoff(kicking: Side): void {
    // A kick-off call (#397) the half ended on (the siren went during the conversion) lapses, unpaid.
    if (this.kickoffCall) {
      this.announcePaid(this.judge.kickoff(this.kickoffCall.side, false, 'lapsed', 0));
      this.kickoffCall = null;
    }
    this.ball = { kind: 'held', by: this.indexOf(this.kicker(kicking)) };
    this.phase = { kind: 'restart', t0: this.tick, kicking };
    this.attacking = other(kicking);
    this.dir = this.dirOf(this.attacking);
    this.tackles = 0;
    this.lastPlay = false;
    this.kickCall = this.fgCall = null;
    this.looseFor = null;
    this.pendingKick = null;
    this.markers = [];
    this.retreat = null;
    this.kickFrom = null;
    this.outPending = null;
    this.assignTargets();
    for (const p of this.players) {
      p.body.pos = { ...p.target };
      p.body.vel = { x: 0, y: 0 };
      p.body.heading = { x: this.dirOf(p.side), y: 0 };
    }
  }

  /** The way a side attacks this half. */
  protected dirOf(s: Side): 1 | -1 {
    return s === 'home' ? this.ends : this.ends === 1 ? -1 : 1;
  }

  private buildSide(sheet: TeamSheet, side: Side): Player[] {
    const roster = sheet.roster ?? [];
    const used = new Set<number>();
    return ROLES.map((role, slot) => {
      let i = roster.findIndex((r, k) => !used.has(k) && r.position === role.name);
      if (i < 0) i = roster.findIndex((_, k) => !used.has(k));
      if (i >= 0) used.add(i);
      const entry = roster[i];
      const stats = statsOf(entry);
      const traits = entry?.traits ? [...entry.traits] : [];
      const stamina = entry?.stats?.stamina ?? 50;
      const name = entry?.name ?? `${sheet.name} #${slot + 1}`;
      return {
        side,
        slot,
        name,
        key: entry?.id ?? name,
        ...(entry?.id ? { id: entry.id } : {}),
        injuryRisk: entry?.injuryRisk ?? 20,
        hurt: false,
        stats,
        traits,
        stamina,
        energy: 1,
        drain: drainRate(stamina, traits),
        gassed: false,
        body: makeBody({ x: MID_X, y: MID_Y }, maxSpeedFor(stats.speed), { x: this.dirOf(side), y: 0 }),
        pose: 'idle',
        poseUntil: 0,
        lockUntil: 0,
        slide: null,
        busyUntil: 0,
        cooldownUntil: 0,
        immuneUntil: 0,
        burstUntil: 0,
        brokeAt: -1000,
        gas: { gas: 1, blown: false },
        tankS: tankSeconds(stamina, traits),
        refillS: refillSeconds(stamina),
        wantsSprint: false,
        sprinting: false,
        catchTick: 0,
        decided: false,
        steppedOn: -1,
        jink: null,
        target: { x: MID_X, y: MID_Y },
        through: false,
        subFor: null,
        subAt: 0,
        subSpot: { x: MID_X, y: 1 },
        subFresh: false,
        binUntilS: -1,
        binSpot: { x: MID_X, y: 1 },
      };
    });
  }

  protected startRetreat(): void {
    this.retreat = null;
    const handover = this.phase.kind === 'ruck' && this.phase.handover && this.phase.stage !== 'dh';
    const side = handover ? this.attacking : other(this.attacking);
    const dir = this.dirOf(other(side));
    const markers = this.currentMarkers().filter(p => p.side === side && this.onField(p));
    const line = Math.max(0, Math.min(FIELD_LENGTH, this.mark.x + dir * LIVE.onsideM));
    this.retreat = { side, dir, line, eligible: new Map(), markers: new Map(markers.map(p => [p, p.key])) };
    this.observeRetreat();
  }

  /**
   * Null means free to defend; otherwise he still owes this fixed retreat line.
   * Also records an observed crossing before a decision; move observes every tick.
   */
  protected retreatLine(p: Player): number | null {
    const r = this.retreat;
    const handover = this.phase.kind === 'ruck' && this.phase.handover && this.phase.stage !== 'dh';
    if (!r || r.side !== p.side || r.side !== (handover ? this.attacking : other(this.attacking))
      || r.dir !== (handover ? -this.dir : this.dir)) return null;
    if (!this.onField(p)) return null;
    if (r.markers.get(p) === p.key || r.eligible.get(p) === p.key) return null;
    if ((p.body.pos.x - r.line) * r.dir >= 0) {
      r.eligible.set(p, p.key);
      return null;
    }
    return r.line;
  }

  /** Observe every movement tick, including ticks between targeting decisions. */
  protected observeRetreat(): void {
    if (!this.retreat) return;
    for (const p of this.side(this.retreat.side)) this.retreatLine(p);
  }

  private idx(side: Side, slot: number): number {
    return (side === 'home' ? 0 : PLAYERS) + slot;
  }
  protected at(side: Side, slot: number): Player {
    return this.players[this.idx(side, slot)]!;
  }
  protected indexOf(p: Player): number {
    return this.idx(p.side, p.slot);
  }
  protected holder(): Player | null {
    return this.ball.kind === 'held' ? this.players[this.ball.by]! : null;
  }
  protected ballPos(): Vec {
    const b = this.ball;
    if (b.kind === 'held') return this.players[b.by]!.body.pos;
    if (b.kind === 'flight') return flightAt(b, this.tick).pos;
    return b.pos;
  }
  protected locked(p: Player): boolean {
    return this.tick < p.lockUntil;
  }
  protected emit(kind: string, text: string, p?: Player, trait?: string): void {
    this.events.push({ tick: this.tick, kind, text, ...(p ? { side: p.side, slot: p.slot, player: p.name } : {}), ...(trait ? { trait } : {}) });
  }
  /** Metres from the carrier to the line he is attacking. */
  protected toLine(p: Player): number {
    return this.dir > 0 ? FIELD_LENGTH - p.body.pos.x : p.body.pos.x;
  }
  /** The attacking side's plan for the zone the carrier is in. */
  protected atkPlan(h: Player): AttackPlan {
    const plan = withAttackCall(attackPlan(this.tactics[this.attacking].attack, zoneOf(this.toLine(h)), this.tightFit[this.attacking], ROLES[h.slot]!.name), this.playCall());
    // A set play that broke down (#326): its caller tucks it and takes the tackle — no step, no offload.
    return this.tucked >= 0 && this.tucked === this.indexOf(h) ? { ...plan, step: 0, offload: 0 } : plan;
  }
  /** How the defending side's line is set. */
  protected defPlan(): DefencePlan {
    const def = other(this.attacking);
    return withDefenceCall(defencePlan(this.defencePreset(def)), this.callState[def].defence);
  }
  /** How a side defends now: its preset, or the coach's call for the set (#73) — Rush pays in offside penalties either way. */
  protected defencePreset(side: Side): DefencePreset {
    const called = this.callState[side].defence;
    return (called && callDefence(called)) || this.tactics[side].defence;
  }
  /** After a break the carrier goes: he sprints while his gas lasts (a Jets player has more of it). */
  protected burst(c: Player): void {
    c.immuneUntil = this.tick + LIVE.immuneTicks;
    c.burstUntil = this.tick + LIVE.burstTicks;
    c.brokeAt = this.tick;
  }
  /** The carrier is through: in front of the defensive line. */
  protected lineBroken(): boolean {
    const h = this.holder();
    return h !== null && h.side === this.attacking && (h.body.pos.x - this.lineX) * this.dir > 0;
  }
  /** Nobody in front of him in his lane, close: room to put the foot down. */
  protected laneClear(c: Player): boolean {
    return !this.side(other(c.side)).some((d) => {
      if (this.locked(d)) return false;
      const ahead = (d.body.pos.x - c.body.pos.x) * this.dir;
      return ahead > 0 && ahead < LIVE.sprintLaneM && Math.abs(d.body.pos.y - c.body.pos.y) < LIVE.sprintLaneW;
    });
  }
  /** Caught from behind by a man sprinting at him, soon after he broke: shown and said. */
  protected runDown(c: Player, t: Player, sit: Situation): void {
    if (sit.angle !== 'behind' || !t.sprinting || this.tick - c.brokeAt > LIVE.runDownTicks) return;
    this.emit('run-down', `${t.name} runs down ${c.name}!`, t);
  }
  protected lock(p: Player, pose: string, ticks: number, slideTo?: Vec): void {
    p.pose = pose;
    p.poseUntil = this.tick + ticks;
    p.lockUntil = this.tick + ticks;
    p.body.vel = { x: 0, y: 0 };
    p.slide = slideTo ? { from: { ...p.body.pos }, to: clampToGround(slideTo, 0.5), t0: this.tick, t1: this.tick + ticks } : null;
  }
  /** A side's men on the field (the same array every call: copy before sorting or changing it); a man in the sin bin is not among them. */
  protected side(s: Side): readonly Player[] {
    return s === 'home' ? this.homeOn : this.awayOn;
  }
  /** On the field, not in the sin bin (#71). */
  protected onField(p: Player): boolean {
    return p.binUntilS < 0;
  }
  protected refreshOnField(): void {
    this.homeOn = this.players.slice(0, PLAYERS).filter((p) => this.onField(p));
    this.awayOn = this.players.slice(PLAYERS).filter((p) => this.onField(p));
  }
  /**
   * A side's man for a role: the slot's player, or, with him in the sin bin, the
   * nearest stand-in on the field (STAND_INS). With nobody binned this is the
   * slot's man, so a match with no bins plays exactly as it did.
   */
  private roleMan(side: Side, slot: number): Player {
    const p = this.at(side, slot);
    if (this.onField(p)) return p;
    for (const s of STAND_INS[slot] ?? []) {
      const q = this.at(side, s);
      if (this.onField(q)) return q;
    }
    return this.side(side)[0] ?? p;
  }
  protected kicker(side: Side): Player {
    return this.roleMan(side, KICKER);
  }
  /** Who kicks for goal (N11): the man the side named while he is on the field, else the slot-5 kicker. */
  protected goalKicker(side: Side): Player {
    const key = this.goalKickerKey[side];
    return (key !== undefined && this.side(side).find((p) => p.key === key)) || this.kicker(side);
  }
  protected dummyHalf(side: Side): Player {
    return this.roleMan(side, HOOKER);
  }
  protected fullback(side: Side): Player {
    return this.roleMan(side, FULLBACK);
  }

  protected abstract announcePaid(vs: readonly CallVerdict[]): void;
  protected abstract playCall(): CoachCall | null;
  protected abstract swapIn(p: Player, bi: number, fresh?: boolean): void;
  abstract get matchSeconds(): number;
  protected abstract toLineFor(side: Side, p: Vec): number;
  protected abstract bounce(from: Vec, dir: Vec, metres: number, ticks?: number, hops?: number): void;
  protected abstract outOnTheFull(from: Vec, to: Vec): void;
  protected abstract resolveOut(): void;
  protected abstract endKick(side: Side, at: Vec): void;
  protected abstract groundInGoal(p: Player, raced?: boolean): boolean;
  protected abstract startSetPiece(side: Side, spot: Vec, how: 'ptb' | 'tap', prefer?: number): void;
  protected abstract startDropOut(side: Side): void;
  protected abstract penalize(offender: Side, spot: Vec, why: string, culprit: Player, kind: string, trait?: string, bin?: boolean): void;
  protected abstract takePenalty(award: Side, mark: Vec, choice: PenaltyChoice): void;
  protected abstract penaltyOpen(): { side: Side; mark: Vec; choice: PenaltyChoice; shot: number; called: boolean } | null;
  protected abstract goalAcc(k: Player): number;
  protected abstract goalAim(posts: Vec, dir: 1 | -1, good: boolean): Vec;
  protected abstract fieldGoalOn(h: Player): boolean;
  protected abstract resolveGoal(): void;
  protected abstract pass(from: Player, to: Player, spillExtra?: number, read?: number): void;
  protected abstract interceptThrow(from: Player, toward: Player): boolean;
  protected abstract overlapSide(passer: Player): 0 | 1 | -1;
  protected abstract setPlayRefusal(side: Side, play: PlayId | undefined): string | null;
  protected abstract callSetPlay(side: Side, play: PlayId): void;
  protected abstract aiCallPlay(side: Side): boolean;
  protected abstract expirePlays(newSet: boolean): void;
  protected abstract breakDown(h: Player): void;
  protected abstract contest(c: Player, t: Player, committed: readonly Player[]): void;
  protected abstract stepWrestle(ph: Extract<Phase, { kind: 'tackle' }>, w: WrestleState): boolean;
  protected abstract goForBonus(h: Player): boolean;
  protected abstract score(scorer: Player): void;
  protected abstract committed(h: Player, defenders: readonly Player[]): Player[];
  protected abstract candidates(passer: Player, plan?: AttackPlan): Candidate[];
  protected abstract currentMarkers(): Player[];
  protected abstract dummyHalfSpot(): Vec;
  protected abstract assignTargets(): void;
}
