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
// does not say the same line twice running. It also keeps a small memory of the match
// (score, who has scored, the lead, the clock) and adds a line after an event's own when
// that memory has news: a second try, the lead changing hands, a close finish (#637). The whistles (half-time, full
// time, golden point, the siren) hash the seed alone, so a match skipped to full
// time in the Worker ends on the line it would have ended on.
//
// The match report's summary (matchReport.ts) takes its first lines from here too.
import type { Side, SimEvent } from '../core/snapshot';
import type { MatchEvent, MatchResult, TeamSheet } from '../../sim/events';
import { CALL_LABEL, callIsPenalty, isCoachCall } from '../league/calls';
import { playOfDetail, playShortTitle } from '../league/plays';
import type { Play } from '../../data/plays';
import { MID_Y } from '../core/field';
import { NINES } from '../league/rules';
import { MAX_LAT_M } from '../league/tactics';
import { ROLES } from '../league/roles';
import { COUNTERS } from '../league/counters';
import { styleFit } from '../league/fit';
import { DEFAULT_TACTICS, isAttackPreset, isDefencePreset, type TeamTactics, PACK, BACKS, PRESET_LABEL } from '../league/presets';

/**
 * Characters a ticker line stays within. At 844×390 the commentary strip is
 * 34rem (544 px) wide less its padding and border, and a line is 0.8rem Courier
 * New, about 0.6em a character (measured in Chromium when the strip also held
 * the Log button: docs/status/2026-10-show.md, N15.2). The button has moved off
 * the strip, so the strip holds more; lines are still written to 56. Every line,
 * filled with the longest names the game makes, fits it (a test). A name the
 * player typed (up to 24 characters, #401) can run a couple past that; the strip
 * wraps the line onto a second (#433) rather than letting it run over the log.
 */
export const TICKER_FIT_CHARS = 56;

/**
 * Longest full club name kept when its last word is too short to stand alone
 * ("Zone Test FC", "Live Test FC"). A longer typed name uses an earlier word
 * (#433: "Murwillumbah Mountain Go" → "Mountain"), so the ticker line still fits.
 */
const SHORT_NAME_KEEP = 16;

/** A club in a line: its last word ("Larrikins"), unless that is a bare "FC" or the like. The match report's columns use it too. */
export function shortName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const words = trimmed.split(' ').filter(Boolean);
  const last = words[words.length - 1] ?? trimmed;
  if ([...last].length >= 4) return last;
  if ([...trimmed].length <= SHORT_NAME_KEEP) return trimmed;
  for (let i = words.length - 2; i >= 0; i--) {
    const word = words[i]!;
    if ([...word].length >= 4) return word;
  }
  return trimmed;
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
  // Kick contests (#99): a bomb won in the air, a spill that goes forward, a scramble and who wins it.
  'regather:contest': ['{player} taps it back from the high ball!', 'Taps it back! {player} beats the catcher.', '{player} gets up highest and taps it back.'],
  'drop:knock-on': ['{player} knocks on under the high ball.', "Knock-on! {player} can't hold the bomb.", '{player} spills it forward — knock-on.'],
  'loose-ball': ["Loose ball! It's a scramble.", 'Loose ball — both sides go for it.', "It's loose! Who wants it?"],
  'loose-ball:in-goal': ["Loose in the in-goal — it's a race!", 'A race for it in the in-goal!', 'Both sides chase it into the in-goal.'],
  'set-start:scramble': ['{player} wins the scramble.', '{player} comes up with the loose ball!', '{player} gets to it first.'],
  'regather:scramble': ['{player} wins the race to it in-goal!', '{player} gets there first in-goal!', '{player} beats them to it over the line!'],
  '40-20': ['40/20! {player} finds touch.', 'A 40/20 from {player}!', '40/20 — {team} get the ball back.', 'What a kick! {player} finds the 40/20!', '{player} nails the 40/20.', '{player} lands the 40/20!'],
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
  'line-break': ['{player} breaks the line!', 'Line break! {player} is away.', '{player} is through the line!', '{player} finds the gap and goes.', '{player} cuts the defence open!', 'Daylight! {player} is through!', '{player} slices through the line!'],
  // A half break (#638): the carrier is through one gap but the cover is still there. Plain words, no shout.
  'line-break:half': ['{player} busts through.', '{player} gets outside his man.', '{player} slips the first defender.', '{player} finds a bit of room.'],
  step: ['{player} steps his man!', 'A big step from {player}.', "{player} steps inside and he's gone."],
  fend: ['{player} palms off the tackler.', 'Strong fend from {player}.', '{player} fends him away.'],
  'break-tackle': ['{player} busts through the tackle!', '{player} bumps off the defender.', '{player} breaks the tackle!'],
  // The wrestle won (BAK-208 §8.1): the carrier fights out of it.
  'break-tackle:wrestle': ['{player} fights out of the tackle!', '{player} wrestles free!', "Broke free! {player} won't go down."],
  offload: ['{player} gets the offload away!', 'Offload! {player} keeps it alive.', '{player} slips the ball out of the tackle.'],
  'cut-out': ['{player} throws the cut-out ball.', 'A cut-out pass from {player}.', '{player} skips a man with the pass.'],
  // Counter reads describe observed moments, never add sim events (#468).
  'counter:slide': ["Slide shuts down the wide play.", "Slide has the numbers out wide.", "The wide ball meets a set Slide line."],
  'counter:compressed': ['Compressed swallows another hit-up.', 'Tight meets a packed Compressed middle.', 'Compressed holds the Tight runners.'],
  'counter:kick-chase': ['Rush comes up; Kick-chase turns them around.', 'Kick-chase puts the ball behind Rush.', 'Over the Rush line goes the kick.'],
  'counter:tight': ['Tight offload keeps it alive against Slide.', 'Tight slips an offload through Slide.', 'Slide leaves room for the Tight offload.'],
  'counter:expansive': ['Expansive breaks the Compressed line.', 'Expansive finds room against Compressed.', 'Compressed cannot hold the Expansive runner.'],
  'counter:rush': ['Rush stops the All-out runner.', 'All-out meets the Rush line.', 'Rush holds firm against All-out.'],
  'counter:all-out': ['All-out breaks through Slide.', 'All-out gets through the Slide line.', 'All-out finds a gap in Slide.'],
  // ── Defence ──
  tackle: ['{player} wraps him up.', '{player} makes the tackle.', 'Held. {player} brings him down.', '{player} stops him in his tracks.'],
  // A Wrecking Ball drives on through it (§3); the tackler holds on.
  'tackle:drive': ['{player} hangs on as he drives through.', 'He drives on, but {player} holds him.', '{player} is carried back but holds on.'],
  'big-hit': ['{player} smashes him backwards!', 'Big hit from {player}!', '{player} drives him back in the tackle!', 'Huge shot from {player}!', '{player} flattens him!', 'Bone-rattling hit from {player}!'],
  // Held up over the line (#652): {player} is the first man in the tackle, {team} the side that held out.
  'held-up': ['Held up! {player} gets under the ball.', '{player} holds him up — no try!', 'Held up over the line! {team} survive.', "Held up! {player} won't let him ground it."],
  'run-down': ['{player} runs him down!', 'Caught from behind! {player} gets there.', '{player} chases him down from behind.'],
  intercept: ['{player} picks it off!', 'Intercept! {player} reads the pass.', '{player} jumps the pass!', 'Intercept! {player} steals it!', '{player} snatches the pass out of the air!', 'Pass picked off by {player}!'],
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
  try: ['TRY! {player} dives over.', 'TRY! {player} scores for {team}.', '{player} goes over — four points!', 'Four points: {player} gets it down.', 'TRY! {player} crashes over!', 'TRY! {player} is over for {team}!', 'Down it goes: TRY for {player}!'],
  'try:bonus': ['Five points! {player} scores from the zone.', '{player} goes round for the bonus try!', 'Bonus try! {player} gets it in the zone.'],
  'conversion:good': ['{player} converts.', '{player} adds the extras.', 'The conversion is good — two more.', 'Over it goes: {player} converts.'],
  'conversion:missed': ['{player} misses the conversion.', 'Wide of the posts — no extras.', 'The conversion drifts wide.'],
  'penalty-goal:good': ['{player} kicks the penalty goal.', 'Two points: {player} slots the penalty.', '{player} makes no mistake — two points.'],
  'penalty-goal:missed': ['{player} misses the penalty goal.', "Wide! {player}'s penalty goal misses.", 'No points — the penalty goes wide.'],
  'drop-goal': ['{player} drops for the field goal…', '{player} has a shot at a field goal.', 'Field goal attempt from {player}.'],
  'field-goal:good': ['FIELD GOAL! {player} slots it.', '{player} drops it over — one point!', "One point: {player}'s field goal is good.", 'Field goal! {player} slots the one-pointer.', '{player} splits the posts — one point!', 'Over it sails: {player}, field goal!'],
  'field-goal:missed': ["{player}'s field goal goes wide.", 'The field goal misses.', '{player} pushes the field goal wide.'],
  // ── The coach (#73, N11) ──
  'coach-call': ['{team} coach calls: {call}.', 'Call from the {team} box: {call}.', '{team} make a call: {call}.'],
  'call-paid': ['{call} pays off for {team}.', 'Yes! The {call} pays off for {team}.', 'The call comes off: {call}.'],
  // The coach overrules the captain on a penalty (#396).
  'coach-call:penalty': ['{team} coach steps in: {call}.', 'From the {team} box: {call}.', 'The coach overrules: {call}.'],
  'call-paid:penalty': ['{call} pays off for {team}.', 'The {call} call comes off for {team}.', 'The call comes off: {call}.'],
  // Set plays (#326): the coach's call, the launch (the half's own call or the coach's), the breakdown. The pop-ups and the rest come with the tray (phase 3).
  'coach-call:play': ['{team} coach calls {play}.', 'From the {team} box: {play}.', 'A play from the box: {play}.'],
  'set-play': ['{player} calls {play}.', '{team} go to {play}.', 'Here comes {play}.'],
  'play-breaks-down': ['It breaks down: {player} tucks it.', 'Nobody there: {play} breaks down.', '{play} goes wrong for {team}.'],
  // Phase 3: the half's own call from the three (no word from the box), and a coach's play that pays off.
  'set-play:half': ['{player} calls {play} himself.', 'Off the cuff: {play}.', '{player} sees it: {play}.'],
  'call-paid:play': ['{play} comes off for {team}!', 'Straight off the whiteboard: {play} works.', 'Called from the box, and {play} pays off.'],
  plan: ['{team} switch to {plan}.', 'New plan for {team}: {plan}.', '{team} go {plan}.'],
  // ── The whistles ──
  siren: ["There's the siren — play on till it's dead.", 'The siren goes. Play on until the ball is dead.', 'Siren! The ball has to go dead first.'],
  'half-time:lead': ['Half-time: {leader} lead {hi}–{lo}.', '{leader} go in {hi}–{lo} up at the break.', 'At the break it is {leader} by {margin}.'],
  'half-time:level': ['Half-time: all square at {hi}–{lo}.', 'Level at the break, {hi}–{lo}.', 'Nothing in it at half-time: {hi}–{lo}.'],
  'golden-point': ['Golden point! The next score wins it.', 'Level at full time — golden point!', 'Extra time: golden point. Next score wins.'],
  'full-time:win': ['Full time: {winner} win {hi}–{lo}.', "That's full time — {winner} win {hi}–{lo}.", '{winner} take it {hi}–{lo}. Full time.'],
  'full-time:draw': ['Full time: it ends {hi}–{lo}.', 'All square at full time, {hi}–{lo}.', 'Full time — honours even at {hi}–{lo}.'],
  'full-time:golden-point': ['Golden point to {winner}! {hi}–{lo}.', '{winner} win it in golden point!', 'Golden point goes to {winner}: {hi}–{lo}.'],
  // ── The match so far (the Commentator's memory: who has how many, who leads, how long) ──
  'memory:second-try': ['{player} has two tonight!', 'A second try for {player}!', '{player} bags a double.', 'Two for {player}, and he is on fire.'],
  'memory:hat-trick': ['Hat-trick! {player} has three!', '{player} completes the hat-trick!', 'Three tries for {player}: a hat-trick!'],
  'memory:many-tries': ['{player} has {n} tries now!', 'Another for {player}: {n} tries!', '{n} tries for {player}, unstoppable.'],
  'memory:back-in-front': ['{team} back in front!', '{team} hit the front again.', '{team} take the lead back.', '{team} edge back in front.'],
  'memory:take-lead': ['{team} take the lead!', '{team} go in front.', 'And {team} are in front.'],
  'memory:lead-final': ['{team} in front, and it is finals footy.', 'Finals pressure: {team} take the lead.', "{team} lead. One slip and the season's gone."],
  'memory:in-a-row': ['{team} score again: {n} tries in a row.', "That's {n} in a row for {team}.", '{team} have scored {n} straight tries.'],
  'memory:close-late': ['Just {margin} in it with {n} to play.', '{leader} lead by {margin} with {n} to go.', 'Only {margin} in it, {n} left.'],
  'memory:level-late': ['All square with {n} to play.', 'Level with {n} to go. Who wants it?', 'Nothing in it, {n} left.'],
  'memory:scoreless': ['Still nothing on the board after {n} minutes.', 'Scoreless after {n} minutes.', '{n} minutes gone and still 0–0.'],
  'memory:drought': ["{team} haven't scored since the {n} minute.", 'Nothing for {team} since the {n} minute.', '{team} stuck on {m} since the {n} minute.'],
  'memory:yet-to-score': ['{team} are yet to score.', 'Still no points for {team}.', "{team} haven't troubled the scorers."],
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

/** Lines that matter: a try, a sin bin, a clean break, a penalty, a kick that wins it, the whistles. The strip holds one a moment before any other line replaces it. */
const IMPORTANT_KEYS: ReadonlySet<string> = new Set([
  'try', 'try:bonus', 'line-break', '40-20', 'field-goal:good', 'held-up', 'penalty', 'penalty:offside', 'penalty:high',
  'sin-bin', 'sin-bin:high', 'sin-bin:professional', 'sin-bin:repeat', 'sin-bin:offside',
  'golden-point', 'half-time:lead', 'half-time:level', 'full-time:win', 'full-time:draw', 'full-time:golden-point',
]);

/** Whether a line for this moment is held on the strip (the memory lines always are). A half break (`detail: 'half'`) stays a plain line. */
export function isImportantKey(key: string, detail?: string): boolean {
  if (key === 'line-break' && detail === 'half') return false;
  return IMPORTANT_KEYS.has(key) || key.startsWith('memory:');
}

/** A line the Commentator says, and whether the strip should hold it. */
export interface Said {
  text: string;
  important: boolean;
}

/** Minutes with no score before a side's drought (or a scoreless match) is worth saying; the match is two halves of seven. */
export const SPELL_MINUTES = 6;
/** The last minutes in which a close margin is worth saying. */
export const CLOSE_LATE_MINUTES = 4;
/** A margin a converted try can wipe out. */
const CLOSE_MARGIN = 6;

/** "3rd", "12th": a match minute in words. */
function ordinalOf(n: number): string {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

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
      if (d === 'scramble') return 'set-start:scramble';
      if (d === 'caught' || d === 'gathered') return `set-start:${d}`;
      return kickInAir ? 'set-start:caught' : 'set-start:gathered';
    case 'regather':
    case 'drop':
    case 'loose-ball':
      return d && LINES[`${e.kind}:${d}`] ? `${e.kind}:${d}` : e.kind;
    case 'touch':
      return d === 'kick' || d === 'penalty' || d === 'bundled' ? `touch:${d}` : 'touch';
    case 'dead-ball':
      if (d === 'held' || d === 'drop-out') return `dead-ball:${d}`;
      return e.player ? 'dead-ball:grounded' : d === '20m' ? 'dead-ball:20m' : 'dead-ball';
    case 'loose':
      return e.player ? 'loose' : 'loose:nobody';
    case 'error':
      return d === 'contact' ? 'error:contact' : 'error';
    case 'line-break':
      return d === 'half' ? 'line-break:half' : 'line-break';
    case 'break-tackle':
      return d === 'wrestle' ? 'break-tackle:wrestle' : 'break-tackle';
    case 'tackle':
      return e.trait ? 'tackle:drive' : 'tackle';
    case 'penalty':
    case 'sin-bin':
      return d && LINES[`${e.kind}:${d}`] ? `${e.kind}:${d}` : e.kind;
    case 'penalty-choice':
      return `penalty-choice:${d === 'goal' || d === 'touch' ? d : 'tap'}`;
    case 'coach-call':
      if (d?.startsWith('set-play:')) return 'coach-call:play';
      return isCoachCall(d) && callIsPenalty(d) ? `${e.kind}:penalty` : e.kind;
    case 'call-paid':
      return isCoachCall(d) && callIsPenalty(d) ? `${e.kind}:penalty` : e.kind;
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
  /** A set play (#326), "the block play". */
  play?: string;
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
/** Match-clock minutes between counter lines credited to the same side. */
export const COUNTER_WINDOW_MINUTES = 3;

export class Commentator {
  private readonly plans: Record<Side, TeamTactics>;
  private readonly fits: Record<Side, ReturnType<typeof styleFit>>;
  private readonly counterAt: Record<Side, number> = { home: -Infinity, away: -Infinity };

  private readonly words: Record<Side, string>;
  private kickInAir = false;
  /** The tick the kick in the air was struck on, and the last tick the ball lay on the ground unheld. */
  private kickTick = -1;
  private groundAt = -2;
  private tick = -1;
  private ordinal = 0;
  /** The last line index used for each moment, so the same line never comes twice running. */
  private readonly last = new Map<string, number>();
  /**
   * Set plays (#326): the play each side's coach has called and is still to run (a
   * launch that isn't one is the half's own call), and the last he called (what a
   * paid-off `set-play` call was: the sim's call-paid names the call, not the play).
   */
  private readonly calledPlay: Record<Side, Play | null> = { home: null, away: null };
  private readonly lastCalledPlay: Record<Side, Play | null> = { home: null, away: null };
  /**
   * The match so far: only what the events, the score and the clock after each one
   * say, so a resumed or skipped stretch heard in order leaves the same memory as a
   * watched one. Nothing here is read by the sim or hashed into a line's pick.
   */
  private readonly memo = {
    score: { home: 0, away: 0 } as Record<Side, number>,
    hasLed: { home: false, away: false } as Record<Side, boolean>,
    tries: new Map<string, number>(),
    run: { side: null as Side | null, n: 0 },
    scoredAt: { home: null as number | null, away: null as number | null },
    spellSaid: { home: false, away: false },
    scorelessSaid: false,
    close: null as { margin: number; minute: number } | null,
    minute: NaN,
  };
  private readonly knockout: boolean;
  private readonly matchMinutes: number;

  constructor(
    private readonly seed: number,
    names: Readonly<Record<Side, string>>,
    sheets?: Readonly<Record<Side, TeamSheet>>,
    /** `knockout`: a final (the match plays golden point if level); `matchMinutes`: its length, for "n to play". */
    opts: { knockout?: boolean; matchMinutes?: number } = {},
  ) {
    this.knockout = !!opts.knockout;
    this.matchMinutes = opts.matchMinutes ?? 2 * NINES.halfMinutes;
    this.plans = { home: { ...(sheets?.home.tactics ?? DEFAULT_TACTICS) }, away: { ...(sheets?.away.tactics ?? DEFAULT_TACTICS) } };
    this.fits = { home: styleFit(sheets?.home.roster ?? []), away: styleFit(sheets?.away.roster ?? []) };
    this.words = { home: shortName(names.home), away: shortName(names.away) };
  }

  /** The line for an event ('' for nothing to say), given the score after it. */
  line(e: SimEvent, score?: Readonly<Record<Side, number>>, minute?: number, ballY?: number): string {
    return this.said(e, score, minute, ballY)[0]?.text ?? '';
  }

  /**
   * What the event says: its own line, then a line from the match's memory when it
   * has one (a second try, the lead changing hands, a close finish, a long drought).
   * Each says whether the strip should hold it.
   */
  said(e: SimEvent, score?: Readonly<Record<Side, number>>, minute?: number, ballY?: number): Said[] {
    const main = this.main(e, score, minute, ballY);
    const out: Said[] = main.text ? [{ text: main.text, important: isImportantKey(main.key, e.detail) }] : [];
    for (const text of this.remember(e, score, minute)) out.push({ text, important: true });
    return out;
  }

  private main(e: SimEvent, score?: Readonly<Record<Side, number>>, minute?: number, ballY?: number): { text: string; key: string } {
    const ordinal = e.tick === this.tick ? ++this.ordinal : (this.ordinal = 0);
    this.tick = e.tick;
    if (e.kind === 'plan' && e.side) {
      const [attack, defence] = (e.detail ?? '').split('/');
      if (isAttackPreset(attack) && isDefencePreset(defence)) this.plans[e.side] = { attack, defence };
    }
    const counter = minute === undefined ? null : this.counter(e, minute, ballY);
    const play = this.followPlays(e);
    const key = counter ?? play.key ?? lineKey(e, this.kickInAir, score);
    if (KICKS.has(e.kind)) {
      this.kickInAir = true;
      this.kickTick = e.tick;
    } else if (ENDS_KICK.has(e.kind)) this.kickInAir = false;
    const lines = LINES[key];
    // A moment with no lines of its own (a kind the sim gained since): the sim's own words.
    if (!lines) return { text: e.text, key };
    const side = e.side;
    const plan = e.kind === 'plan' ? planLabel(e.detail) : undefined;
    const setPlay = e.kind === 'set-play' || e.kind === 'play-breaks-down' || e.kind === 'coach-call' ? playOfDetail(e.detail) : play.paid;
    const f: LineFill = {
      ...(e.player ? { player: e.player } : {}),
      ...(side ? { team: this.words[side], other: this.words[side === 'home' ? 'away' : 'home'] } : {}),
      ...(isCoachCall(e.detail) ? { call: CALL_LABEL[e.detail].toLowerCase() } : {}),
      ...(plan ? { plan } : {}),
      ...(setPlay ? { play: playShortTitle(setPlay) } : {}),
      ...(score ? this.scoreFill(score) : {}),
    };
    return { text: this.say(key, lines, f, e.tick, ordinal, counter ? side : undefined) ?? e.text, key };
  }


  /**
   * The match's memory speaks (at most one line a moment): a hat-trick or a second
   * try, the lead changing hands, a side scoring again, a close finish, a long
   * scoreless spell. Scores are read off the score after each event, so a try,
   * a penalty goal and a field goal all count the same way.
   */
  private remember(e: SimEvent, score: Readonly<Record<Side, number>> | undefined, minute: number | undefined): string[] {
    const m = this.memo;
    if (minute !== undefined && Number.isFinite(minute)) m.minute = minute;
    if (!score || e.kind === 'half-time' || e.kind === 'full-time' || e.kind === 'golden-point' || e.kind === 'siren') return [];
    const known = Number.isFinite(m.minute);
    const golden = known && m.minute >= this.matchMinutes;
    const tick = e.tick;
    const say = (key: string, f: LineFill): string[] => {
      const text = this.say(key, LINES[key]!, f, tick, 1000);
      return text ? [text] : [];
    };
    // The score moved: who scored, and did the lead change hands (the first points of a match never do).
    const before = m.score;
    const rose: Side | null = score.home > before.home ? 'home' : score.away > before.away ? 'away' : null;
    let lead: { side: Side; back: boolean } | null = null;
    if (rose) {
      const was = before.home === before.away ? null : before.home > before.away ? 'home' : 'away';
      const now = score.home === score.away ? null : score.home > score.away ? 'home' : 'away';
      if (before.home + before.away > 0 && now === rose && was !== rose) lead = { side: rose, back: m.hasLed[rose] };
      if (now) m.hasLed[now] = true;
      m.scoredAt[rose] = known ? m.minute : 0;
      m.spellSaid[rose] = false;
      m.score = { home: score.home, away: score.away };
    }
    const margin = Math.abs(score.home - score.away);
    const leader = score.home === score.away ? undefined : this.words[score.home > score.away ? 'home' : 'away'];
    // A try: its scorer's count, and the run of tries one side has put together.
    let tryLine: string | null = null;
    if (e.kind === 'try' && e.side) {
      const n = e.player ? (m.tries.set(`${e.side}:${e.player}`, (m.tries.get(`${e.side}:${e.player}`) ?? 0) + 1), m.tries.get(`${e.side}:${e.player}`)!) : 0;
      m.run = m.run.side === e.side ? { side: e.side, n: m.run.n + 1 } : { side: e.side, n: 1 };
      const team = this.words[e.side];
      if (n >= 4) tryLine = 'memory:many-tries';
      else if (n === 3) tryLine = 'memory:hat-trick';
      else if (lead) tryLine = null;
      else if (n === 2) tryLine = 'memory:second-try';
      else if (m.run.n >= 2) tryLine = 'memory:in-a-row';
      if (tryLine) return say(tryLine, { ...(e.player ? { player: e.player } : {}), team, n: countWord(tryLine === 'memory:in-a-row' ? m.run.n : n) });
    }
    if (lead) {
      const key = this.knockout ? 'memory:lead-final' : lead.back ? 'memory:back-in-front' : 'memory:take-lead';
      return say(key, { team: this.words[lead.side], margin });
    }
    // A kick at goal closes the book on a score: a close margin in the last minutes.
    if ((e.kind === 'conversion' || e.kind === 'penalty-goal' || e.kind === 'field-goal') && known && !golden) {
      const left = this.matchMinutes - m.minute;
      if (left > 0 && left <= CLOSE_LATE_MINUTES && margin <= CLOSE_MARGIN && !(m.close && m.close.margin === margin && m.minute - m.close.minute < 2)) {
        m.close = { margin, minute: m.minute };
        const mins = Math.max(1, Math.ceil(left));
        const n = mins === 1 ? 'one minute' : `${countWord(mins)} minutes`;
        return say(margin === 0 ? 'memory:level-late' : 'memory:close-late', { n, margin, ...(leader ? { leader } : {}) });
      }
    }
    // A long spell with nothing on the board, said once as a set changes hands.
    if (e.kind === 'handover' && known && !golden) {
      const side = (['home', 'away'] as const)
        .filter((s) => !m.spellSaid[s] && m.minute - (m.scoredAt[s] ?? 0) >= SPELL_MINUTES)
        .sort((a, b) => (m.scoredAt[a] ?? -1) - (m.scoredAt[b] ?? -1))[0];
      if (m.score.home + m.score.away === 0) {
        if (!m.scorelessSaid && m.minute >= SPELL_MINUTES) {
          m.scorelessSaid = true;
          return say('memory:scoreless', { n: String(Math.floor(m.minute)) });
        }
      } else if (side) {
        m.spellSaid[side] = true;
        const since = m.scoredAt[side];
        return since === null
          ? say('memory:yet-to-score', { team: this.words[side] })
          : say('memory:drought', { team: this.words[side], n: ordinalOf(Math.floor(since) + 1), m: String(m.score[side]) });
      }
    }
    return [];
  }

  /**
   * Set plays (#326): a coach's play call is remembered until it runs; a launch is
   * the coach's when it is the play he called ('set-play'), else the half's own
   * ('set-play:half'); a paid-off `set-play` call names the play he last called
   * ('call-paid:play'). A new set forgets a call that never ran (the sim lets it lapse).
   */
  private followPlays(e: SimEvent): { key: string | null; paid: Play | null } {
    const side = e.side;
    if (e.kind === 'set-start') this.calledPlay.home = this.calledPlay.away = null;
    if (!side) return { key: null, paid: null };
    if (e.kind === 'coach-call' && e.detail?.startsWith('set-play:')) {
      const p = playOfDetail(e.detail);
      this.calledPlay[side] = p;
      this.lastCalledPlay[side] = p;
      return { key: null, paid: null };
    }
    if (e.kind === 'set-play') {
      const p = playOfDetail(e.detail);
      const coach = !!p && this.calledPlay[side] === p;
      this.calledPlay[side] = null;
      return { key: coach ? 'set-play' : 'set-play:half', paid: null };
    }
    // Not knowing the play (a stretch it never heard), the call's own pay-off line.
    if (e.kind === 'call-paid' && e.detail === 'set-play' && this.lastCalledPlay[side]) return { key: 'call-paid:play', paid: this.lastCalledPlay[side] };
    return { key: null, paid: null };
  }

  /** Read existing successful actions against the active plans; credit the acting side.
   * A tackle names the defender, while a kick, offload or bust names the attacker.
   * No counter attribution is possible without a match clock. */
  private counter(e: SimEvent, minute: number, ballY?: number): string | null {
    if (!e.side || !Number.isFinite(minute) || minute - this.counterAt[e.side] < COUNTER_WINDOW_MINUTES) return null;
    const defending = e.kind === 'tackle' || e.kind === 'big-hit';
    const other = e.side === 'home' ? 'away' : 'home';
    const atk = defending ? other : e.side;
    const def = defending ? e.side : other;
    const attack = this.plans[atk].attack, defence = this.plans[def].defence;
    if (this.fits[atk][attack] === 0 || this.fits[def][defence] === 0) return null;
    // Contact counters have a location: Slide's wide defence and Compressed's
    // middle. Read the rendered ball, never manufacture a tag in the live sim.
    const wide = ballY !== undefined && Math.abs(ballY - MID_Y) > MAX_LAT_M;
    const position = e.slot === undefined ? undefined : ROLES[e.slot]?.name;
    if (ballY !== undefined) {
      if (defending && attack === 'expansive' && defence === 'slide' && !wide) return null;
      if (defending && attack === 'grind' && defence === 'compressed' && wide) return null;
      if (!defending && attack === 'expansive' && defence === 'compressed' && (!wide || !position || !BACKS.includes(position))) return null;
      if (!defending && attack === 'grind' && (!position || !PACK.includes(position))) return null;
    }
    let key: string | null = null;
    if (defending) {
      if (defence === 'slide' && attack === 'expansive' && COUNTERS.slide.on === 1) key = 'slide';
      if (defence === 'compressed' && attack === 'grind' && COUNTERS.compressed.on === 1) key = 'compressed';
      if (defence === 'rush' && attack === 'all-out' && COUNTERS.rush.on === 1) key = 'rush';
    } else {
      if (e.kind === 'kick' && attack === 'kick-chase' && defence === 'rush' && COUNTERS.rush.on === 1) key = 'kick-chase';
      if (e.kind === 'offload' && attack === 'grind' && defence === 'slide' && COUNTERS.slide.on === 1) key = 'tight';
      if (e.kind === 'break-tackle' && attack === 'expansive' && defence === 'compressed' && COUNTERS.compressed.on === 1) key = 'expansive';
      if (e.kind === 'break-tackle' && attack === 'all-out' && defence === 'slide' && COUNTERS.slide.on === 1) key = 'all-out';
    }
    if (!key) return null;
    this.counterAt[e.side] = minute;
    return `counter:${key}`;
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

  private say(key: string, lines: readonly string[], f: LineFill, tick: number, ordinal: number, side?: Side): string | null {
    let i = variantIndex(lines.length, this.seed, key, tick, ordinal);
    const memory = side ? `${key}:${side}` : key;
    for (let tries = 0; tries < lines.length - 1 &&
      (this.last.get(memory) === i || this.last.get(key) === i); tries++) i = (i + 1) % lines.length;
    this.last.set(memory, i);
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
