// Reusable #710 balance runner. Exact policy values and seeded simulation are
// measured independently using the same pure, versioned clash engine.
import type { Position } from '../core/state';
import { generatePlayer, POSITION_GROUPS, POSITIONS, shownStats, type PositionGroup } from '../data/player';
import {
  ATTACK_CALLS, CHALLENGE_CALL_COST, CHALLENGE_EDITIONS, CHALLENGE_JITTER10, CHALLENGE_OUTCOME_COUNT, CHALLENGE_RATINGS,
  CHALLENGE_ROLL_MIN, CHALLENGE_RULE_VERSION, CHALLENGE_SCORE_THRESHOLD10, CHALLENGE_TRAIT_BONUS, DEFENCE_CALLS, REGULAR_CHALLENGE_CLASHES,
  type ChallengeActor, type ChallengeCall, type ChallengeCheckpoint, type ChallengeEdition, type ChallengeProgress,
  type ChallengeRatings, type ChallengeScore,
} from '../data/individualChallengeRules';
import type { TraitId } from '../data/traits';
import {
  advanceChallengeProgress, challengeCalls, challengeCheckpoint, challengeClashRoll, challengeEventSeed,
  freezeChallengeActor, initialChallengeProgress, previewChallengeAction, resolveChallengeAction,
} from '../systems/individualChallengeEngine';
import {
  CHALLENGE_POLICY_VERSION, createChallengePolicy, type ChallengePolicyValue,
} from '../systems/individualChallengePolicy';
import { makeRng } from '../utils/rng';

const SCORES = [0, 1, 2] as const satisfies readonly ChallengeScore[];
const CALLS = [...ATTACK_CALLS, ...DEFENCE_CALLS];
const BASELINE_POLICIES = ['power-shoot', 'angle-track', 'controlled-wrap', 'myopic'] as const;
const POLICIES = ['auto', ...BASELINE_POLICIES] as const;
type Policy = typeof POLICIES[number];
type PolicyPick = (progress: ChallengeProgress, checkpoint: ChallengeCheckpoint) => ChallengeCall;
type AutoPolicy = ReturnType<typeof createChallengePolicy>;
const EPSILON = 1e-12;
const ROLL_AUDIT_SAMPLES = 16_384;
const FAMILY_ALPHA = 0.001;

// One fixed annual ID makes the career-seed mapping a bijection, so disjoint
// blocks cannot accidentally share event seeds. Competing policies within a
// block get the same seeds for a paired comparison.
const balanceSeed = (careerSeed: number): number => challengeEventSeed(careerSeed, 'qa/balance/1');

export interface ChallengeBalanceActor {
  readonly label: string;
  readonly actor: ChallengeActor;
  readonly position?: Position;
  readonly positionGroup?: PositionGroup;
  readonly hidden?: readonly (keyof ChallengeRatings)[];
}

export function challengeBalanceActors(firstSeed: number, generatedPerPosition: number): ChallengeBalanceActor[] {
  const synthetic = (label: string, strength: number, speed: number, stamina: number, footyIQ: number): ChallengeBalanceActor => ({
    label, actor: { id: label, name: label, ratings: { strength, speed, stamina, footyIQ }, traits: [] },
  });
  const actors = [
    synthetic('Balanced 45', 45, 45, 45, 45),
    synthetic('Balanced 50', 50, 50, 50, 50),
    synthetic('Balanced 55', 55, 55, 55, 55),
    synthetic('Balanced 60', 60, 60, 60, 60),
    synthetic('Power', 60, 40, 40, 40),
    synthetic('Speed', 40, 60, 40, 40),
    synthetic('Endurance', 40, 40, 60, 40),
  ];
  const rng = makeRng(firstSeed ^ 0x5bc1bd8d);
  for (const position of POSITIONS) {
    for (let i = 0; i < generatedPerPosition; i++) {
      const player = generatePlayer(rng, { position });
      actors.push({
        label: `${position} ${i + 1}`, actor: freezeChallengeActor(player), position, positionGroup: POSITION_GROUPS[position],
        hidden: CHALLENGE_RATINGS.filter(stat => !shownStats(position).includes(stat)),
      });
    }
  }
  return actors;
}

function policyPick(policy: Policy, auto: AutoPolicy): PolicyPick {
  switch (policy) {
    case 'auto': return progress => auto.choose(progress)!.call;
    case 'power-shoot': return (_, checkpoint) => checkpoint.role === 'carry' ? 'power' : 'shoot';
    case 'angle-track': return (_, checkpoint) => checkpoint.role === 'carry' ? 'angle' : 'track';
    case 'controlled-wrap': return (_, checkpoint) => checkpoint.role === 'carry' ? 'controlled' : 'wrap';
    case 'myopic': {
      const cache = new Map<string, ChallengeCall>();
      return (_, checkpoint) => {
        const key = `${checkpoint.clashIndex}/${checkpoint.playerEnergy}`;
        const cached = cache.get(key);
        if (cached) return cached;
        const ranked = challengeCalls(checkpoint).map(call => {
          const { counts } = previewChallengeAction(checkpoint, call);
          const immediate = checkpoint.bonus ? counts[2] : counts[1] + 2 * counts[2];
          return { call, merit: checkpoint.role === 'carry' ? immediate : -immediate };
        });
        const call = ranked.sort((a, b) => b.merit - a.merit || CHALLENGE_CALL_COST[a.call] - CHALLENGE_CALL_COST[b.call])[0].call;
        cache.set(key, call);
        return call;
      };
    }
  }
}

const stateKey = (progress: ChallengeProgress): string =>
  `${progress.clashIndex}/${progress.playerEnergy}/${progress.playerScore - progress.crewScore}/${progress.result ?? ''}`;

/** Propagate probability mass forward, independently of the Auto solver's backward DP. */
function exactPolicyValue(edition: ChallengeEdition, actor: ChallengeActor, pick: PolicyPick): ChallengePolicyValue & { tieProbability: number } {
  const initial = initialChallengeProgress(actor);
  type Weighted = { progress: ChallengeProgress; probability: number };
  let frontier = new Map<string, Weighted>([[stateKey(initial), { progress: initial, probability: 1 }]]);
  let titleProbability = 0;
  let expectedMargin = 0;
  let tieProbability = 0;

  while (frontier.size) {
    const next = new Map<string, Weighted>();
    for (const { progress, probability } of frontier.values()) {
      const checkpoint = challengeCheckpoint(edition, actor, progress);
      if (!checkpoint) {
        if (progress.result === 'won') titleProbability += probability;
        expectedMargin += probability * (progress.playerScore - progress.crewScore);
        continue;
      }
      if (checkpoint.bonus) tieProbability += probability;
      const preview = previewChallengeAction(checkpoint, pick(progress, checkpoint));
      for (const score of SCORES) {
        if (!preview.counts[score]) continue;
        const following = advanceChallengeProgress(progress, { ...preview, score });
        const key = stateKey(following);
        const weight = probability * preview.counts[score] / CHALLENGE_OUTCOME_COUNT;
        const existing = next.get(key);
        if (existing) existing.probability += weight;
        else next.set(key, { progress: following, probability: weight });
      }
    }
    frontier = next;
  }
  return { titleProbability, expectedMargin, tieProbability };
}

function wilson95(wins: number, samples: number): readonly [number, number] {
  const estimate = wins / samples;
  const z = 1.959963984540054;
  const correction = z * z / samples;
  const midpoint = (estimate + correction / 2) / (1 + correction);
  const halfWidth = z * Math.sqrt((estimate * (1 - estimate) + correction / 4) / samples) / (1 + correction);
  return [Math.max(0, midpoint - halfWidth), Math.min(1, midpoint + halfWidth)];
}

function seededPolicyValue(edition: ChallengeEdition, actor: ChallengeActor, pick: PolicyPick, eventSeeds: readonly number[]) {
  let wins = 0;
  let ties = 0;
  let fatiguedBeforeMick = 0;
  let emptyBeforeMick = 0;
  let conserved = 0;
  let totalMargin = 0;
  const callsByClash = Array.from({ length: REGULAR_CHALLENGE_CLASHES + 1 }, () => ({
    power: 0, angle: 0, controlled: 0, shoot: 0, track: 0, wrap: 0,
  }));

  for (const seed of eventSeeds) {
    let progress = initialChallengeProgress(actor);
    let usedLowCost = false;
    while (progress.result === null) {
      const checkpoint = challengeCheckpoint(edition, actor, progress)!;
      if (checkpoint.bonus) ties++;
      if (checkpoint.clashIndex === 4) {
        if (checkpoint.playerEnergy < 30) fatiguedBeforeMick++;
        if (checkpoint.playerEnergy === 0) emptyBeforeMick++;
      }
      const call = pick(progress, checkpoint);
      callsByClash[checkpoint.clashIndex][call]++;
      if (call === 'controlled' || call === 'wrap') usedLowCost = true;
      const clash = resolveChallengeAction(checkpoint, call, challengeClashRoll(seed, checkpoint.clashIndex));
      progress = advanceChallengeProgress(progress, clash);
    }
    if (progress.result === 'won') wins++;
    if (usedLowCost) conserved++;
    totalMargin += progress.playerScore - progress.crewScore;
  }

  const samples = eventSeeds.length;
  return {
    samples, wins, titleRate: wins / samples, confidence95: wilson95(wins, samples),
    meanMargin: totalMargin / samples, tieRate: ties / samples, fatiguedBeforeMickRate: fatiguedBeforeMick / samples,
    emptyBeforeMickRate: emptyBeforeMick / samples, lowCostChoiceRate: conserved / samples, callsByClash,
  };
}

export function compareChallengePolicies(edition: ChallengeEdition, actor: ChallengeBalanceActor, samples: number, firstSeed: number) {
  const auto = createChallengePolicy(edition, actor.actor);
  const start = performance.now();
  const autoValue = auto.evaluate(initialChallengeProgress(actor.actor));
  const autoSolveMs = performance.now() - start;
  const autoMetrics = auto.metrics();
  const eventSeeds = Array.from({ length: samples }, (_, index) => balanceSeed(firstSeed + index));
  const policies = POLICIES.map(policy => {
    const pick = policyPick(policy, auto);
    const exact = exactPolicyValue(edition, actor.actor, pick);
    return { policy, exact, seeded: seededPolicyValue(edition, actor.actor, pick, eventSeeds) };
  });
  return { edition: edition.id, actor, firstSeed, autoValue, autoMetrics, autoSolveMs, policies };
}
interface CallWitness {
  readonly call: ChallengeCall;
  readonly actor: string;
  readonly edition: ChallengeEdition['id'];
  readonly progress: ChallengeProgress;
  readonly titleProbability: number;
  readonly expectedMargin: number;
  readonly alternatives: readonly { call: ChallengeCall; titleProbability: number; expectedMargin: number }[];
}

/** Find distinct title and margin witnesses from reachable states. */
function findCallWitnesses(actors: readonly ChallengeBalanceActor[]) {
  const title = new Map<ChallengeCall, CallWitness>();
  const margin = new Map<ChallengeCall, CallWitness>();
  const ordered = () => ({
    witnesses: CALLS.flatMap(call => title.get(call) ?? []),
    marginWitnesses: CALLS.flatMap(call => margin.get(call) ?? []),
  });
  for (const edition of Object.values(CHALLENGE_EDITIONS)) {
    for (const { label, actor } of actors) {
      const auto = createChallengePolicy(edition, actor);
      const states = [initialChallengeProgress(actor)];
      const seen = new Set<string>();
      for (const progress of states) {
        const key = stateKey(progress);
        if (seen.has(key)) continue;
        seen.add(key);
        const checkpoint = challengeCheckpoint(edition, actor, progress);
        if (!checkpoint) continue;
        const legal = challengeCalls(checkpoint);
        const best = auto.choose(progress)!;
        if (!title.has(best.call) || !margin.has(best.call)) {
          const alternatives = legal.filter(call => call !== best.call)
            .map(call => ({ call, ...auto.evaluateAction(progress, call)! }));
          const witness = {
            call: best.call, actor: label, edition: edition.id, progress, titleProbability: best.titleProbability,
            expectedMargin: best.expectedMargin, alternatives,
          };
          if (!title.has(best.call) && alternatives.every(other => best.titleProbability - other.titleProbability > EPSILON)) {
            title.set(best.call, witness);
          }
          if (!margin.has(best.call) && alternatives.every(other =>
            Math.abs(best.titleProbability - other.titleProbability) <= EPSILON && best.expectedMargin - other.expectedMargin > EPSILON)) {
            margin.set(best.call, witness);
          }
          if (title.size === CALLS.length && margin.size === CALLS.length) return ordered();
        }
        for (const call of legal) {
          const preview = previewChallengeAction(checkpoint, call);
          for (const score of SCORES) {
            if (preview.counts[score]) states.push(advanceChallengeProgress(progress, { ...preview, score }));
          }
        }
      }
    }
  }
  return ordered();
}

/** Pearson tests on a separate block with about 26 expected counts per pair cell under uniform independent rolls. */
export function auditChallengeRolls(firstSeed: number, roll = challengeClashRoll) {
  const samples = ROLL_AUDIT_SAMPLES;
  const bins = CHALLENGE_OUTCOME_COUNT;
  const stages = REGULAR_CHALLENGE_CLASHES + 1;
  const counts = Array.from({ length: stages }, () => new Uint32Array(bins));
  const pairs = counts.flatMap((_, left) => counts.flatMap((__, right) =>
    right > left ? [{ left, right, joint: new Uint32Array(bins * bins) }] : []));
  const problems: string[] = [];
  const tail = Math.log((stages + pairs.length) / FAMILY_ALPHA);
  // Conservative upper-tail bound for the approximate chi-square null, with Bonferroni across indices
  // and pairs, even though these tests share rows.
  const limitFor = (df: number): number => df + 2 * Math.sqrt(df * tail) + 2 * tail;
  const statistic = (observed: number, expected: number): number => (observed - expected) ** 2 / expected;

  for (let offset = 0; offset < samples; offset++) {
    const seed = balanceSeed(firstSeed + offset);
    const row = counts.map((_, index) => roll(seed, index) - CHALLENGE_ROLL_MIN);
    if (row.some(bin => !Number.isInteger(bin) || bin < 0 || bin >= bins)) {
      return { firstSeed, samples, uniformity: [], independence: [], problems: [`Invalid indexed roll in audit seed ${firstSeed + offset}`] };
    }
    for (let index = 0; index < stages; index++) counts[index][row[index]]++;
    for (const { left, right, joint } of pairs) joint[row[left] * bins + row[right]]++;
  }
  const uniformity = counts.map((marginal, index) => {
    const expected = samples / bins;
    const chiSquare = marginal.reduce((total, observed) => total + statistic(observed, expected), 0);
    const limit = limitFor(bins - 1);
    if (chiSquare > limit) problems.push(`Indexed roll uniformity failed for clash ${index + 1} (${chiSquare.toFixed(2)} > ${limit.toFixed(2)})`);
    return { index, counts: [...marginal], chiSquare, limit };
  });
  const independence = pairs.map(({ left, right, joint }) => {
    let chiSquare = 0;
    for (let a = 0; a < bins; a++) {
      for (let b = 0; b < bins; b++) {
        const expected = counts[left][a] * counts[right][b] / samples;
        if (expected) chiSquare += statistic(joint[a * bins + b], expected);
      }
    }
    const degrees = (counts[left].filter(count => count > 0).length - 1) * (counts[right].filter(count => count > 0).length - 1);
    const limit = limitFor(degrees);
    if (chiSquare > limit) problems.push(`Indexed roll independence failed for clashes ${left + 1}/${right + 1} (${chiSquare.toFixed(2)} > ${limit.toFixed(2)})`);
    return { left, right, chiSquare, limit };
  });
  return { firstSeed, samples, uniformity, independence, problems };
}

/** Pool one policy across disjoint career-seed blocks using a two-sided Bernstein bound. */
export function poolTitleSamples(groups: readonly { samples: number; wins: number; titleProbability: number }[]) {
  let expectedWins = 0;
  let observedWins = 0;
  let variance = 0;
  let impossibleOutcomes = 0;
  for (const { samples, wins, titleProbability } of groups) {
    // Exact forward sums may differ from 1 by a few rounding bits.
    const p = Math.min(1, Math.max(0, titleProbability));
    expectedWins += samples * p;
    observedWins += wins;
    variance += samples * p * (1 - p);
    if (p <= EPSILON) impossibleOutcomes += wins;
    if (p >= 1 - EPSILON) impossibleOutcomes += samples - wins;
  }
  // Policy pools share seeds inside each case. The family correction does not
  // assume the five tests are independent, and no contest is pooled twice.
  const tail = Math.log(2 * POLICIES.length / FAMILY_ALPHA);
  const limit = Math.sqrt(2 * variance * tail) + 2 * tail / 3;
  return { expectedWins, observedWins, limit, impossibleOutcomes,
    passed: impossibleOutcomes === 0 && Math.abs(observedWins - expectedWins) <= limit };
}

const FITTING_TRAITS = ['wreckingBall', 'dontArgue', 'dancingFeet', 'hitman'] as const satisfies readonly TraitId[];
const nearPeer = (probability: number): boolean => probability >= 0.3 && probability <= 0.65;
const percent = (rate: number): string => `${(rate * 100).toFixed(1)}%`;
const rateIn = (rate: number, min: number, max: number): boolean => rate >= min - EPSILON && rate <= max + EPSILON;

export interface IndividualChallengeQAOptions {
  readonly samples: number;
  readonly firstSeed: number;
  readonly generatedPerPosition: number;
}

export function runIndividualChallengeQA(options: IndividualChallengeQAOptions) {
  const { samples, firstSeed, generatedPerPosition } = options;
  if (!Number.isSafeInteger(samples) || samples < 1 || !Number.isSafeInteger(firstSeed) || firstSeed < 0
    || firstSeed >= 2 ** 32 || !Number.isSafeInteger(generatedPerPosition) || generatedPerPosition < 0) {
    throw new Error('Challenge QA needs a positive sample count, a uint32 seed range and a nonnegative generated count');
  }
  const actors = challengeBalanceActors(firstSeed, generatedPerPosition);
  const casesToMeasure = Object.values(CHALLENGE_EDITIONS).flatMap(edition => actors.map(actor => ({ edition, actor })));
  const auditSeed = firstSeed + casesToMeasure.length * samples;
  if (auditSeed + ROLL_AUDIT_SAMPLES > 2 ** 32) throw new Error('Challenge QA seed blocks exceed the uint32 range');
  const cases = casesToMeasure.map(({ edition, actor }, index) =>
    compareChallengePolicies(edition, actor, samples, firstSeed + index * samples));
  const rollAudit = auditChallengeRolls(auditSeed);
  const pooledTitleSamples = POLICIES.map((policy, index) => ({
    policy,
    ...poolTitleSamples(cases.map(row => {
      const { exact, seeded } = row.policies[index];
      return { samples: seeded.samples, wins: seeded.wins, titleProbability: exact.titleProbability };
    })),
  }));
  const generatedGroups = Object.values(CHALLENGE_EDITIONS).flatMap(({ id }) =>
    [...new Set(Object.values(POSITION_GROUPS))].flatMap(positionGroup => {
      const chances = cases.filter(row => row.edition === id && row.actor.positionGroup === positionGroup)
        .map(row => row.autoValue.titleProbability);
      return chances.length ? [{
        edition: id, positionGroup, players: chances.length, minimum: Math.min(...chances), maximum: Math.max(...chances),
        mean: chances.reduce((total, chance) => total + chance, 0) / chances.length,
      }] : [];
    }));
  const { witnesses, marginWitnesses } = findCallWitnesses(actors);
  const correctnessProblems = [...rollAudit.problems];
  for (const pool of pooledTitleSamples) {
    if (!pool.passed) correctnessProblems.push(
      `${pool.policy} pooled title results measured ${pool.observedWins} wins vs ${pool.expectedWins.toFixed(2)} expected (limit ±${pool.limit.toFixed(2)}, impossible outcomes ${pool.impossibleOutcomes})`,
    );
  }

  for (const row of cases) {
    const auto = row.policies[0].exact;
    const name = `${row.edition}/${row.actor.label}`;
    if (Math.abs(auto.titleProbability - row.autoValue.titleProbability) > EPSILON
      || Math.abs(auto.expectedMargin - row.autoValue.expectedMargin) > EPSILON) correctnessProblems.push(`${name} Auto DP and forward enumeration differ`);
    for (const baseline of row.policies.slice(1)) {
      if (auto.titleProbability + EPSILON < baseline.exact.titleProbability) {
        correctnessProblems.push(`${name} Auto underperformed ${baseline.policy}`);
      }
    }
    if (row.autoMetrics.valueStates >= 10504 || row.autoMetrics.classifications >= 787800) correctnessProblems.push(`${name} exceeded search bound`);
  }

  const exactAuto = (edition: ChallengeEdition, actor: ChallengeActor): number =>
    createChallengePolicy(edition, actor).evaluate(initialChallengeProgress(actor)).titleProbability;
  const synthetic = cases.filter(row => !row.actor.position);
  const nearPeers = synthetic.filter(row => nearPeer(row.autoValue.titleProbability));
  const monotonicStats = cases.flatMap(row => CHALLENGE_RATINGS.flatMap(stat => {
    const edition = CHALLENGE_EDITIONS[row.edition];
    const { actor, label } = row.actor;
    const value = actor.ratings[stat];
    if (value === 100) return [];
    const raised = { ...actor, ratings: { ...actor.ratings, [stat]: value + 1 } };
    return { edition: row.edition, actor: label, stat, from: value, to: value + 1, gain: exactAuto(edition, raised) - row.autoValue.titleProbability };
  }));
  for (const check of monotonicStats) {
    if (check.gain < -EPSILON) correctnessProblems.push(`${check.edition}/${check.actor} lost probability when ${check.stat} increased`);
  }

  const traits = synthetic.flatMap(row => FITTING_TRAITS.map(trait => {
    const edition = CHALLENGE_EDITIONS[row.edition];
    const { actor, label } = row.actor;
    const baseline = row.autoValue.titleProbability;
    const withI = exactAuto(edition, { ...actor, traits: [{ id: trait, level: 1 }] });
    const withIII = exactAuto(edition, { ...actor, traits: [{ id: trait, level: 3 }] });
    return { edition: row.edition, actor: label, trait, nearPeer: nearPeer(baseline), baseline, upliftI: withI - baseline, upliftIII: withIII - baseline };
  }));

  const difficulty = (['showground', 'invitational'] as const).flatMap(edition =>
    (['Balanced 45', 'Balanced 60'] as const).map((actor, index) => {
      const range = edition === 'showground' ? (index === 0 ? [0.30, 0.65] : [0.60, 0.90]) : (index === 0 ? [0, 0.30] : [0.30, 0.65]);
      const probability = cases.find(row => row.edition === edition && row.actor.label === actor)!.autoValue.titleProbability;
      const passed = edition === 'invitational' && index === 0 ? probability < range[1] : rateIn(probability, range[0], range[1]);
      return { edition, actor, probability, range, passed };
    }));
  const nearPeerApproach = nearPeers.map(row => {
    const auto = row.autoValue.titleProbability;
    const bestFixed = row.policies.slice(1, 4)
      .reduce((best, candidate) => candidate.exact.titleProbability > best.exact.titleProbability ? candidate : best);
    return {
      edition: row.edition, actor: row.actor.label, bestFixed: bestFixed.policy,
      gainOverBestFixed: auto - bestFixed.exact.titleProbability,
      gainOverMyopic: auto - row.policies[4].exact.titleProbability,
      largestBaselineGain: auto - Math.min(...row.policies.slice(1).map(policy => policy.exact.titleProbability)),
    };
  });
  const usefulAuto = nearPeerApproach.filter(row => row.largestBaselineGain >= 0.05);
  const gainRange = (read: (row: typeof nearPeerApproach[number]) => number): string => {
    if (!nearPeerApproach.length) return 'no near-peer cases';
    const gains = nearPeerApproach.map(read);
    return `${(100 * Math.min(...gains)).toFixed(2)}–${(100 * Math.max(...gains)).toFixed(2)} pp`;
  };
  const fixedSweeps = BASELINE_POLICIES.slice(0, 3).filter(policy => synthetic.every(row => {
    const fixed = row.policies.find(result => result.policy === policy)!;
    return row.policies.slice(1, 4).every(other => fixed.exact.titleProbability >= other.exact.titleProbability - EPSILON);
  }));
  const nearPeerTies = nearPeers.filter(row => rateIn(row.policies[0].exact.tieProbability, 0.1, 0.35));
  const nearPeerTraits = traits.filter(trait => trait.nearPeer);
  const traitsOverCap = nearPeerTraits.filter(trait => trait.upliftIII >= 0.10);
  const noTraitBenefit = FITTING_TRAITS.filter(id => !nearPeerTraits.some(trait => trait.trait === id && trait.upliftIII > EPSILON));
  const withinConfidence = cases.flatMap(row => row.policies).filter(policy => rateIn(policy.exact.titleProbability, ...policy.seeded.confidence95)).length;
  const nearPeerConservation = nearPeers.filter(row => rateIn(row.policies[0].seeded.lowCostChoiceRate, 0.2, 0.5)).length;

  const gates = [
    { name: 'Six useful calls', passed: witnesses.length === CALLS.length, detail: `Reachable strict title advantages for ${witnesses.length}/${CALLS.length} calls` },
    { name: 'Edition difficulty', passed: difficulty.every(row => row.passed),
      detail: difficulty.map(row => `${row.edition} ${row.actor} ${percent(row.probability)} (target ${percent(row.range[0])}–${percent(row.range[1])})`).join(', ') },
    { name: 'Approach value', passed: nearPeers.length > 0 && usefulAuto.length * 2 >= nearPeers.length && !fixedSweeps.length,
      detail: `Auto gained at least 5 points of title chance over at least one baseline in ${usefulAuto.length}/${nearPeers.length} near-peer cases. Gaps over best fixed: ${gainRange(row => row.gainOverBestFixed)}. Gaps over myopic: ${gainRange(row => row.gainOverMyopic)}. Fixed sweeps: ${fixedSweeps.length}` },
    { name: 'Tie-break pacing', passed: nearPeers.length > 0 && nearPeerTies.length === nearPeers.length,
      detail: `${nearPeerTies.length}/${nearPeers.length} near-peer cases tie 10–35% of the time` },
    { name: 'Trait benefit', passed: nearPeerTraits.length > 0 && !traitsOverCap.length && !noTraitBenefit.length,
      detail: `${traitsOverCap.length}/${nearPeerTraits.length} near-peer case/trait combinations gain at least 10 points at III; traits with zero gain in every near-peer case: ${noTraitBenefit.join(', ') || 'none'}` },
  ];

  return {
    ruleVersion: CHALLENGE_RULE_VERSION, policyVersion: CHALLENGE_POLICY_VERSION, options,
    parameters: {
      jitter10: CHALLENGE_JITTER10, traitBonus: CHALLENGE_TRAIT_BONUS,
      callCost: CHALLENGE_CALL_COST, scoreThreshold10: CHALLENGE_SCORE_THRESHOLD10,
    },
    definitions: CHALLENGE_EDITIONS, cases, generatedGroups, witnesses, marginWitnesses, traits, monotonicStats, difficulty, gates,
    nearPeerApproach, rollAudit, pooledTitleSamples,
    diagnostics: {
      nearPeerDefinition: 'Synthetic no-trait actor with a baseline exact Auto title chance of 30–65%',
      nearPeerCases: nearPeers.length, nearPeerConservation, insideWilson95: withinConfidence, familyAlpha: FAMILY_ALPHA,
      totalSampleComparisons: cases.length * POLICIES.length,
    },
    correctness: { passed: !correctnessProblems.length, problems: correctnessProblems },
  };
}
