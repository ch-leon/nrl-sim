// src/match/view/commentary.ts — the ticker's lines for the live sim (N15.2), in
// place of the old engine's templates (its sim-side module is deleted). Keyed by the
// kinds live.ts emits (and their detail: a kick's type, the captain's call, a
// bonus try, a goal good or missed...), at least three lines each, in the words
// the pop-ups and the Guide use (six again, tap and go, the 40/20, the sin bin).
// The voice is plain and in the present tense, with the players' own names.
//
// Which line a moment gets is a hash of the match seed, the tick and the moment,
// never a dice roll, so the same match reads the same way twice (at any speed, or
// resumed), and nothing here is anything the sim reads. A Commentator follows the
// match event by event and the ball tick by tick: it knows a kick is in the air
// (so a catch reads as one, and a kick picked up off the ground as a scoop) and
// does not say the same line twice running. The whistles (half-time, full
// time, golden point, the siren) hash the seed alone, so a match skipped to full
// time in the Worker ends on the line it would have ended on.
//
// The match report's summary (matchReport.ts) takes its first lines from here too.
import type { Side, SimEvent } from '../core/snapshot';
import type { MatchEvent, MatchResult } from '../../sim/events';
import { CALL_LABEL, isCoachCall } from '../league/calls';
import { PRESET_LABEL } from '../league/presets';

/**
 * Characters a ticker line holds at 844×390 before its ellipsis: the commentary
 * strip is 34rem (544 px) wide less its padding, border and the Log button, and a
 * line is 0.8rem Courier New, 0.6em a character (measured in Chromium: see
 * docs/status/2026-10-show.md, N15.2). Every line, filled with the longest names
 * the game makes, fits it (a test).
 */
export const TICKER_FIT_CHARS = 56;

/** A club in a line: its last word ("Larrikins"), unless that is a bare "FC" or the like. The match report's columns use it too. */
export function shortName(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? name;
  return last.length >= 4 ? last : name;
}

/**
 * The lines, by moment. Placeholders: {player} the man the event names, {team} his
 * club and {other} the other one; {leader}/{winner} and {hi}–{lo} for the whistles;
 * {call} a coach's call; {plan} a change of plan; {n}/{m} a count of tries.
 */
export const LINES: Readonly<Record<string, readonly string[]>> = {
  // ── Restarts ──
  kickoff: ['{player} kicks off for {team}.', '{player} gets the kick-off away.', 'Away we go: {player} kicks off.'],
  'drop-out': ['{player} takes the goal-line drop-out.', 'Goal-line drop-out from {player}.', '{team} go back with the drop-out.'],
  // ── Kicks, by type (BAK-208 §4.4) ──
  'kick:long': ['{player} kicks long on the last.', 'A long kick from {player}.', '{player} puts boot to it, long downfield.'],
  'kick:bomb': ['{player} puts up a bomb.', 'Up it goes: a bomb from {player}.', 'A bomb from {player} — who wants it?'],
  'kick:grubber': ['{player} grubbers it through.', '{player} grubbers for the in-goal.', '{player} puts it along the ground.'],
  'kick:chip': ['{player} chips over the top.', 'A little chip from {player}.', '{player} chips and chases.'],
  'kick:cross-field': ['{player} goes cross-field for the winger.', 'Cross-field kick from {player}.', '{player} kicks to the wing.'],
  // ── And how they come down ──
  'set-start:caught': ['{player} takes the kick.', 'Safe hands from {player}.', '{player} fields the kick.'],
  'set-start:gathered': ['{player} scoops up the loose ball.', '{player} pounces on it.', '{player} picks it up off the ground.'],
  regather: ['{player} regathers the kick!', 'Regathered! {player} wins it back.', '{player} wins the race to it!'],
  drop: ['{player} spills the kick under pressure!', "Dropped! {player} can't hold the kick.", '{player} puts the high ball down.'],
  '40-20': ['40/20! {player} finds touch.', 'A 40/20 from {player}!', '40/20 — {team} get the ball back.'],
  'on-full': ['Out on the full — {other} ball.', '{player} kicks it out on the full.', 'On the full! {other} get the ball back.'],
  'touch:kick': ['It finds touch — {other} ball.', '{player} finds touch.', 'Out it goes off the boot of {player}.'],
  'touch:penalty': ['{team} find touch from the penalty.', '{player} kicks for the line.', 'Penalty kick to touch by {player}.'],
  'touch:bundled': ['{player} bundles his man into touch.', 'Bundled into touch by {player}.', '{player} pushes him over the sideline.'],
  touch: ['Into touch.', 'The ball runs into touch.', 'Out it goes — a play-the-ball 10 m in.'],
  'dead-ball:20m': ['Dead ball — a 20-metre restart.', 'It runs dead. Restart from the 20.', 'Dead ball. Tap on the 20.'],
  'dead-ball:grounded': ['{player} grounds it in-goal.', '{player} touches it down in-goal.', '{player} plays it safe in-goal.'],
  'dead-ball:drop-out': ['Dead in-goal — goal-line drop-out.', 'It goes dead in-goal. Drop-out.', 'Dead in-goal off a defender: drop-out.'],
  'dead-ball:held': ['{player} is held up in his own in-goal.', "{player} can't get it out — drop-out.", 'Held in-goal: goal-line drop-out.'],
  'dead-ball': ['Dead ball.', 'The ball goes dead.', "That's dead."],
  'charge-down': ['{player} charges down the field goal!', 'Charged down by {player}!', '{player} gets a hand to it — charged down!'],
  // ── The set ──
  handover: ['Tackled on the last — handover to {other}.', 'Handover. {other} take over.', 'Five tackles done — {other} ball.'],
  'six-again': ['Six again! {other} get a fresh set.', 'Six again — the ref calls it on {team}.', 'The ref waves six again.'],
  'quick-ptb': ['Quick play-the-ball from {player}.', '{player} wins the ruck and plays it fast.', '{player} plays it quickly.'],
  'slow-ptb': ['Slow play-the-ball — the defence is set.', '{player} is slow to his feet.', 'The defence wins the ruck. Slow ball.'],
  dart: ['{player} darts from dummy-half.', '{player} goes himself from dummy-half.', 'Out of dummy-half goes {player}.'],
  // ── Attack ──
  'line-break': ['{player} breaks the line!', 'Line break! {player} is away.', '{player} is through the line!', '{player} finds the gap and goes.'],
  step: ['{player} steps his man!', 'A big step from {player}.', "{player} steps inside and he's gone."],
  fend: ['{player} palms off the tackler.', 'Strong fend from {player}.', '{player} fends him away.'],
  'break-tackle': ['{player} busts through the tackle!', '{player} bumps off the defender.', '{player} breaks the tackle!'],
  // The wrestle won (BAK-208 §8.1): the carrier fights out of it.
  'break-tackle:wrestle': ['{player} fights out of the tackle!', '{player} wrestles free!', "Broke free! {player} won't go down."],
  offload: ['{player} gets the offload away!', 'Offload! {player} keeps it alive.', '{player} slips the ball out of the tackle.'],
  'cut-out': ['{player} throws the cut-out ball.', 'A cut-out pass from {player}.', '{player} skips a man with the pass.'],
  // ── Defence ──
  tackle: ['{player} wraps him up.', '{player} makes the tackle.', 'Held. {player} brings him down.', '{player} stops him in his tracks.'],
  // A Wrecking Ball drives on through it (§3); the tackler holds on.
  'tackle:drive': ['{player} hangs on as he drives through.', 'He drives on, but {player} holds him.', '{player} is carried back but holds on.'],
  'big-hit': ['{player} smashes him backwards!', 'Big hit from {player}!', '{player} drives him back in the tackle!'],
  'run-down': ['{player} runs him down!', 'Caught from behind! {player} gets there.', '{player} chases him down from behind.'],
  intercept: ['{player} picks it off!', 'Intercept! {player} reads the pass.', '{player} jumps the pass!'],
  gamble: ['{player} gambles and misses.', '{player} goes for the intercept, no luck.', '{player} jumps out of the line and misses.'],
  strip: ['{player} strips the ball!', '{player} rips it free in the tackle!', 'Stripped! {player} wins the ball.'],
  // ── Errors ──
  loose: ["{player} can't get to it — loose ball.", 'The pass is behind {player} — loose!', "{player} can't reach the pass — loose ball."],
  'loose:nobody': ['The pass goes to ground — loose ball.', 'Loose ball!', "It's on the ground — loose ball."],
  error: ['{player} spills it — knock-on.', 'Knock-on! {player} loses the ball.', '{player} drops it cold.'],
  'error:contact': ['{player} loses it in the tackle.', 'Knocked loose — {player} coughs it up.', 'The ball comes free from {player}.'],
  // ── Legs and knocks ──
  gassed: ['{player} is cooked.', '{player} is out on his feet.', '{player} has nothing left in the legs.'],
  blown: ['{player} has run out of gas.', '{player} is blowing hard.', '{player} has nothing left in the tank.'],
  injury: ['{player} is hurt in the tackle.', '{player} is down and hurt.', 'Trouble here: {player} is hurt.'],
  interchange: ['{player} comes on for {team}.', 'Interchange: {player} on.', '{player} is on off the bench.'],
  // ── Penalties (2e) and the captain's call ──
  'penalty:offside': ['Penalty to {other} — offside.', 'Offside! {player} gives away a penalty.', 'The ref pings {team} for offside.'],
  'penalty:high': ['High shot from {player} — penalty.', 'Penalty! {player} catches him high.', 'A high tackle — penalty to {other}.'],
  penalty: ['Penalty to {other}.', 'The whistle — penalty, {other}.', '{player} gives away a penalty.'],
  'penalty-choice:goal': ['{team} take the shot at goal.', '{player} will kick for goal.', '{team} go for the two.'],
  'penalty-choice:tap': ['{team} tap and go.', 'Quick tap — {team} keep the pressure on.', '{player} takes the tap.'],
  'penalty-choice:touch': ['{team} kick for touch.', '{player} kicks for the line.', '{team} take the ground: kick for touch.'],
  tap: ['{player} taps and goes.', 'Quick tap from {player}.', '{player} takes it quickly off the mark.'],
  'sin-bin:high': ['Sin bin! {player} goes for the high shot.', '{player} is binned for a high shot.', 'Sin bin: {player}, for the high shot.'],
  'sin-bin:professional': ['Sin bin! {player} for a professional foul.', 'Professional foul — {player} to the bin.', '{player} goes to the bin: a cynical foul.'],
  'sin-bin:repeat': ['{player} is binned — too many penalties.', 'Repeat offences: {player} to the bin.', 'Sin bin! {player}, for repeat offences.'],
  'sin-bin:offside': ['Sin bin! {player} for the offside.', '{player} is binned for offside.', 'Offside on the line: {player} to the bin.'],
  'sin-bin': ['{player} is sent to the sin bin.', 'Sin bin! {player} has to go.', '{player} is off to the bin.'],
  'sin-bin-return': ['{player} is back from the sin bin.', '{player} returns from the bin.', 'Back on: {player} is back from the bin.'],
  // ── Scoring ──
  try: ['TRY! {player} dives over.', 'TRY! {player} scores for {team}.', '{player} goes over — four points!', 'Four points: {player} gets it down.'],
  'try:bonus': ['Five points! {player} scores from the zone.', '{player} goes round for the bonus try!', 'Bonus try! {player} gets it in the zone.'],
  'conversion:good': ['{player} converts.', '{player} adds the extras.', 'The conversion is good — two more.', 'Over it goes: {player} converts.'],
  'conversion:missed': ['{player} misses the conversion.', 'Wide of the posts — no extras.', 'The conversion drifts wide.'],
  'penalty-goal:good': ['{player} kicks the penalty goal.', 'Two points: {player} slots the penalty.', '{player} makes no mistake — two points.'],
  'penalty-goal:missed': ['{player} misses the penalty goal.', "Wide! {player}'s penalty goal misses.", 'No points — the penalty goes wide.'],
  'drop-goal': ['{player} drops for the field goal…', '{player} has a shot at a field goal.', 'Field goal attempt from {player}.'],
  'field-goal:good': ['FIELD GOAL! {player} slots it.', '{player} drops it over — one point!', "One point: {player}'s field goal is good."],
  'field-goal:missed': ["{player}'s field goal goes wide.", 'The field goal misses.', '{player} pushes the field goal wide.'],
  // ── The coach (#73, N11) ──
  'coach-call': ['{team} coach calls: {call}.', 'Call from the {team} box: {call}.', '{team} make a call: {call}.'],
  'call-paid': ['{call} pays off for {team}.', 'It works! The {call} pays off for {team}.', 'The call comes off: {call}.'],
  plan: ['{team} switch to {plan}.', 'New plan for {team}: {plan}.', '{team} go {plan}.'],
  // ── The whistles ──
  siren: ["There's the siren — play on till it's dead.", 'The siren goes. Play on until the ball is dead.', 'Siren! The ball has to go dead first.'],
  'half-time:lead': ['Half-time: {leader} lead {hi}–{lo}.', '{leader} go in {hi}–{lo} up at the break.', 'At the break it is {leader} by {margin}.'],
  'half-time:level': ['Half-time: all square at {hi}–{lo}.', 'Level at the break, {hi}–{lo}.', 'Nothing in it at half-time: {hi}–{lo}.'],
  'golden-point': ['Golden point! The next score wins it.', 'Level at full time — golden point!', 'Extra time: golden point. Next score wins.'],
  'full-time:win': ['Full time: {winner} win {hi}–{lo}.', "That's full time — {winner} win {hi}–{lo}.", '{winner} take it {hi}–{lo}. Full time.'],
  'full-time:draw': ['Full time: it ends {hi}–{lo}.', 'All square at full time, {hi}–{lo}.', 'Full time — honours even at {hi}–{lo}.'],
  'full-time:golden-point': ['Golden point to {winner}! {hi}–{lo}.', '{winner} win it in golden point!', 'Golden point goes to {winner}: {hi}–{lo}.'],
  // ── The report's story line (matchReport.ts) ──
  'story:double': ['{player} scores {n} tries.', '{n} tries for {player}.', '{player} crosses {n} times.'],
  'story:tries': ['{team} score {n} tries to {m}.', 'It is {n} tries to {m}.', '{n} tries to {m} in the end.'],
  'story:even': ['{n} tries apiece.', 'The tries are even at {n} each.', 'Level on tries: {n} each.'],
  'story:none': ['Not a try between them.', 'No tries — the boot decides it.', 'A tryless arm-wrestle.'],
};

/** Moments said by the seed alone: once or twice a match, the same line whether it is played out or skipped. */
const WHISTLES: ReadonlySet<string> = new Set(['siren', 'half-time:lead', 'half-time:level', 'golden-point', 'full-time:win', 'full-time:draw', 'full-time:golden-point']);

/** Kicks: a kick in the air until someone has the ball or it is dead (ENDS_KICK). */
const KICKS: ReadonlySet<string> = new Set(['kick', 'kickoff', 'drop-out']);
/** What brings a kick down: a catch or a scoop, a regather, a spill, touch, dead, a try, the whistle. */
const ENDS_KICK: ReadonlySet<string> = new Set([
  'set-start', 'regather', 'drop', 'touch', 'dead-ball', 'on-full', '40-20', 'try', 'error', 'penalty', 'charge-down', 'tackle', 'half-time', 'full-time', 'golden-point',
]);

/** A count of tries in words ("four tries to three"). */
function countWord(n: number): string {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);
}

/** The score for the whistles: who leads, by how much. */
function scoreline(score: Readonly<Record<Side, number>>): { leader?: Side; hi: number; lo: number } {
  const hi = Math.max(score.home, score.away);
  const lo = Math.min(score.home, score.away);
  return score.home === score.away ? { hi, lo } : { leader: score.home > score.away ? 'home' : 'away', hi, lo };
}

/**
 * The moment an event is, for LINES: its kind, sharpened by its detail where the
 * line changes with it (a kick's type, the call, a bonus try, good or missed).
 * `kickInAir`: a kick went up and nobody has the ball yet, and it has not touched the ground (a catch, not a scoop).
 * `score`: the score after the event, for the whistles.
 */
export function lineKey(e: SimEvent, kickInAir: boolean, score?: Readonly<Record<Side, number>>): string {
  const d = e.detail;
  switch (e.kind) {
    case 'kick':
      return `kick:${d && LINES[`kick:${d}`] ? d : 'long'}`;
    case 'set-start':
      return kickInAir ? 'set-start:caught' : 'set-start:gathered';
    case 'touch':
      return d === 'kick' || d === 'penalty' || d === 'bundled' ? `touch:${d}` : 'touch';
    case 'dead-ball':
      if (d === 'held' || d === 'drop-out') return `dead-ball:${d}`;
      return e.player ? 'dead-ball:grounded' : d === '20m' ? 'dead-ball:20m' : 'dead-ball';
    case 'loose':
      return e.player ? 'loose' : 'loose:nobody';
    case 'error':
      return d === 'contact' ? 'error:contact' : 'error';
    case 'break-tackle':
      return d === 'wrestle' ? 'break-tackle:wrestle' : 'break-tackle';
    case 'tackle':
      return e.trait ? 'tackle:drive' : 'tackle';
    case 'penalty':
    case 'sin-bin':
      return d && LINES[`${e.kind}:${d}`] ? `${e.kind}:${d}` : e.kind;
    case 'penalty-choice':
      return `penalty-choice:${d === 'goal' || d === 'touch' ? d : 'tap'}`;
    case 'try':
      return d === 'bonus' ? 'try:bonus' : 'try';
    case 'conversion':
    case 'penalty-goal':
    case 'field-goal':
      return `${e.kind}:${d === 'good' ? 'good' : 'missed'}`;
    case 'half-time':
      return score && score.home !== score.away ? 'half-time:lead' : 'half-time:level';
    case 'full-time':
      if (d === 'golden-point') return 'full-time:golden-point';
      return score && score.home === score.away ? 'full-time:draw' : 'full-time:win';
    default:
      return e.kind;
  }
}

/** A 32-bit mix (murmur-style): the variant hash, no dice. */
function mix(h: number, v: number): number {
  h = Math.imul(h ^ v, 0x5bd1e995);
  h ^= h >>> 15;
  return Math.imul(h, 0x27d4eb2d) >>> 0;
}

function hashText(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Which of `n` lines a moment gets: the match seed, the tick, the moment and its place in the tick (the whistles: the seed alone). */
export function variantIndex(n: number, seed: number, key: string, tick: number, ordinal: number): number {
  let h = mix(seed >>> 0, hashText(key));
  if (!WHISTLES.has(key)) h = mix(mix(h, tick >>> 0), ordinal >>> 0);
  return h % n;
}

/** The values a line can name. */
export interface LineFill {
  player?: string;
  team?: string;
  other?: string;
  leader?: string;
  winner?: string;
  hi?: number;
  lo?: number;
  margin?: number;
  call?: string;
  plan?: string;
  n?: string;
  m?: string;
}

/** Fill a line's placeholders (its first letter a capital), or null when it needs something the moment has not got. */
export function fillLine(template: string, f: LineFill): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = (f as Record<string, string | number | undefined>)[k];
    if (v === undefined || v === '') missing = true;
    return String(v ?? '');
  });
  return missing ? null : out.charAt(0).toUpperCase() + out.slice(1);
}

/** "Kick-chase / Compressed" from a plan event's "kick-chase/compressed". */
function planLabel(detail: string | undefined): string | undefined {
  const [a, d] = (detail ?? '').split('/') as [keyof typeof PRESET_LABEL, keyof typeof PRESET_LABEL];
  return PRESET_LABEL[a] && PRESET_LABEL[d] ? `${PRESET_LABEL[a]} / ${PRESET_LABEL[d]}` : undefined;
}

/**
 * A ball lower than this, metres, with nobody holding it, is flat on the ground. A
 * kick comes down to it on its last tick whether it is caught or not (the catch is
 * the tick after), so it has touched the ground when it is there two ticks running:
 * the end of its flight and then a bounce or a ball lying loose. A grubber's hops
 * skim close to the ground but never lie on it two ticks running.
 */
export const GROUNDED_LIFT = 1e-4;

/**
 * Follows one match and says each moment. Give it every event in order, said or
 * not (a resumed match's silent stretch too), and every tick's ball, so it knows
 * what is in the air and what it said last.
 */
export class Commentator {
  private readonly words: Record<Side, string>;
  private kickInAir = false;
  /** The tick the kick in the air was struck on, and the last tick the ball lay on the ground unheld. */
  private kickTick = -1;
  private groundAt = -2;
  private tick = -1;
  private ordinal = 0;
  /** The last line index used for each moment, so the same line never comes twice running. */
  private readonly last = new Map<string, number>();

  constructor(
    private readonly seed: number,
    names: Readonly<Record<Side, string>>,
  ) {
    this.words = { home: shortName(names.home), away: shortName(names.away) };
  }

  /** The line for an event ('' for nothing to say), given the score after it. */
  line(e: SimEvent, score?: Readonly<Record<Side, number>>): string {
    const ordinal = e.tick === this.tick ? ++this.ordinal : (this.ordinal = 0);
    this.tick = e.tick;
    const key = lineKey(e, this.kickInAir, score);
    if (KICKS.has(e.kind)) {
      this.kickInAir = true;
      this.kickTick = e.tick;
    } else if (ENDS_KICK.has(e.kind)) this.kickInAir = false;
    const lines = LINES[key];
    // A moment with no lines of its own (a kind the sim gained since): the sim's own words.
    if (!lines) return e.text;
    const side = e.side;
    const plan = e.kind === 'plan' ? planLabel(e.detail) : undefined;
    const f: LineFill = {
      ...(e.player ? { player: e.player } : {}),
      ...(side ? { team: this.words[side], other: this.words[side === 'home' ? 'away' : 'home'] } : {}),
      ...(isCoachCall(e.detail) ? { call: CALL_LABEL[e.detail].toLowerCase() } : {}),
      ...(plan ? { plan } : {}),
      ...(score ? this.scoreFill(score) : {}),
    };
    return this.say(key, lines, f, e.tick, ordinal) ?? e.text;
  }

  /**
   * Each tick's ball (after its events): a kick that has come to ground with
   * nobody holding it is down, so whoever picks it up scoops it rather than takes it.
   */
  ball(b: Readonly<{ lift: number; holder: unknown }>, tick: number): void {
    if (!this.kickInAir || tick <= this.kickTick || b.holder !== null || b.lift >= GROUNDED_LIFT) return;
    if (this.groundAt === tick - 1) this.kickInAir = false;
    this.groundAt = tick;
  }

  /** The full-time line for a match finished elsewhere (Skip in the Worker), from its score. */
  fullTime(score: Readonly<Record<Side, number>>, golden: boolean): string {
    const key = golden ? 'full-time:golden-point' : score.home === score.away ? 'full-time:draw' : 'full-time:win';
    return this.say(key, LINES[key]!, this.scoreFill(score), 0, 0) ?? '';
  }

  private scoreFill(score: Readonly<Record<Side, number>>): LineFill {
    const s = scoreline(score);
    return { hi: s.hi, lo: s.lo, margin: s.hi - s.lo, ...(s.leader ? { leader: this.words[s.leader], winner: this.words[s.leader] } : {}) };
  }

  private say(key: string, lines: readonly string[], f: LineFill, tick: number, ordinal: number): string | null {
    let i = variantIndex(lines.length, this.seed, key, tick, ordinal);
    if (lines.length > 1 && this.last.get(key) === i) i = (i + 1) % lines.length;
    this.last.set(key, i);
    return fillLine(lines[i]!, f);
  }
}

/**
 * The report's summary (N15.2): the full-time line and the story of the tries, in
 * the ticker's voice, seeded by the result itself (the score and the length of the
 * log) so a match always reads the same. First lines first: the report shows as
 * many as fit its card.
 */
export function summaryLines(result: MatchResult, home: { id: string; name: string }, away: { id: string; name: string }): string[] {
  const seed = ((result.homeScore + 1) * 73856093) ^ ((result.awayScore + 1) * 19349663) ^ result.events.length;
  const c = new Commentator(seed, { home: home.name, away: away.name });
  const golden = result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const out = [c.fullTime({ home: result.homeScore, away: result.awayScore }, golden)];
  const tries = result.events.filter((e: MatchEvent) => e.kind === 'try');
  const byPlayer = new Map<string, number>();
  for (const t of tries) if (t.player) byPlayer.set(t.player, (byPlayer.get(t.player) ?? 0) + 1);
  const [top, most] = [...byPlayer].reduce<[string, number]>((a, b) => (b[1] > a[1] ? b : a), ['', 0]);
  const th = tries.filter((t) => t.teamId === home.id).length;
  const ta = tries.length - th;
  const pick = (key: string, f: LineFill): string | null => fillLine(LINES[key]![variantIndex(LINES[key]!.length, seed, key, 0, 0)]!, f);
  const story =
    most >= 2
      ? pick('story:double', { player: top, n: countWord(most) })
      : tries.length === 0
        ? pick('story:none', {})
        : th === ta
          ? pick('story:even', { n: countWord(th) })
          : pick('story:tries', { team: shortName(th > ta ? home.name : away.name), n: countWord(Math.max(th, ta)), m: countWord(Math.min(th, ta)) });
  if (story) out.push(story);
  return out.filter((l) => l !== '');
}
