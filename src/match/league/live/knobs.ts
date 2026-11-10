
// ── Tuning ─────────────────────────────────────────────────────────────────
/**
 * The live sim's knobs (tuning reference §2–§6). Ticks are 20 Hz, distances
 * metres. Overridable by name in balance experiments (tuning.ts).
 */
export const LIVE = {
  // Labs: match controls (Leon, 30 Oct). Drag length in pitch metres.
  controlsChipFromM: 12,
  controlsBombFromM: 24,
  // Speed (N9.1): players re-pick their targets every this many ticks (1 = every tick, 20 Hz;
  // 2 is a fifth faster but costs a sixth of the line breaks and All-out's edge) and bodies are
  // pushed apart this many times a tick (1 costs a sixth of the points).
  decideEveryTicks: 1,
  separatePasses: 2,
  // Kick chase (N9.3, BAK-208 §11): the kicking side sprints after an attacking kick (bomb,
  // grubber, chip, cross-field) and cruises after a territory kick (1 = sprint after those too);
  // the winger nearest an attacking kick's landing joins the chase (0 = no).
  territoryChaseSprint: 0,
  wingerChase: 1,
  // The defensive line moves up at its preset's speed × gas.cruise / this (N9.3), so lowering
  // cruise for more sprint contrast slows the line with the runners instead of costing tries.
  lineCruiseRef: 0.94,
  // Timing (ticks)
  contactTicks: 9,
  downTicks: 10,
  ptbTicks: 11,
  rollTicks: 4,
  dhHoldTicks: 6,
  tryTicks: 50,
  /** A kick-off waits for everyone to be set, at least this long and at most RESTART_MAX. */
  restartTicks: 40,
  restartMaxTicks: 280,
  /** A receiver must be this close to where a pass comes down to take it; a high ball gives him a little longer to get under it. */
  catchReach: 1.8,
  kickCatchReach: 2.5,
  /** On the last tackle the defending fullback drops this far behind his line, where the kick will land. */
  fullbackDeepM: 16,
  fullbackLastM: 24,
  /** After a pass or catch, no new pass for this long. */
  passCooldown: 12,
  /** A tackled carrier can't be the next receiver for this long after his ptb. */
  busyAfterPtb: 24,
  /** After beating a man the carrier goes (sprints, gas permitting) for at least this long (§8.2). */
  burstTicks: 16,
  /** Caught from behind this soon after breaking is RUN DOWN! (6 s). */
  runDownTicks: 120,
  /** A line break (Phase 3, measured for §7): the carrier this far goal-side of every defender but the last man. */
  lineBreakM: 1,
  /** A Wrecking Ball held in the tackle keeps his legs pumping this often per level (more fight in the wrestle, wrestle.ts). */
  wreckDriveChance: 0.3,
  /** A Playmaker's cut-out reach grows this much per level over the normal pass width, and he minds width less. */
  cutOutPerLevelM: 4,
  playmakerWidth: 0.25,
  /** …and this often per level he throws the cut-out ball to the widest man he can reach. */
  cutOutChance: 0.15,
  /** After beating a tackler the carrier can't be hit again for this long. */
  immuneTicks: 8,
  /** A beaten tackler sits out this long before committing again. */
  beatenCooldown: 30,
  /** The kicker runs this long with the ball before putting boot to it. */
  kickRunTicks: 14,
  kickLockTicks: 8,
  kickContactTicks: 3,
  passPoseTicks: 5,

  // Distances (metres)
  /** Who sprints (§8.2): the carrier with no defender this far ahead and this close to his lane; a defender closing the last stretch; support within reach of a break. */
  sprintLaneM: 15,
  sprintLaneW: 3,
  sprintCloseM: 8,
  supportSprintM: 10,
  /** A free defender this close to a wrestle comes in to help (and joins it on reaching the carrier). */
  joinM: 6,
  /** Carrier starts deciding (pass / into contact) with a defender this close. */
  engageM: 4.5,
  /** A defender this close to the carrier makes the tackle. */
  tackleReach: 1.2,
  /** The defensive line stands this far off the ruck. */
  onsideM: 10,
  /** A big hit drives the carrier back this far. */
  driveBack: 2.5,
  /** A support runner this close can take an offload. */
  offloadM: 7,
  /** Chance a catcher spills a kick: alone, and with a chaser inside PRESSURE_M (less by Handling). */
  dropChance: 0.06,
  dropPressured: 0.18,
  /** Kick chasers this far from the landing point still run flat out at it. */
  chaseThroughM: 2,
  /** Inside this, the wingers start their run on the second-last tackle, before a grubber is struck. The fullback joins once it is aimed. */
  grubberChaseFromM: 24,
  /** The chase does not sit closer than this to the try line until the kick is aimed. */
  grubberChaseDepthM: 10,
  /** How far in front of the ball the chase may lead, metres, before the kick is aimed. */
  grubberChaseLeadM: 3,
  /** On the second-last tackle inside this, the kicker goes early this often (grubber or chip). */
  earlyKickM: 25,
  /** Loose ball picked up within this reach. */
  pickupM: 0.9,
  /** A defender this close to a receiver makes the catch a pressured one. */
  pressureM: 2,
  /** A lone defender this close can be stepped (checked once per defender). */
  stepRange: 2.6,
  /** Another defender within this of the carrier makes it a two-man tackle. */
  secondManM: 3.5,
  /** A defender this close to the pass line can pick it off. */
  laneM: 1.5,
  /** Markers may not leave the ruck to tackle until this long after the ball is played. */
  markerReleaseTicks: 14,
  /** A pass to the side with the overlap gets this much preference (scaled up by an expansive plan). */
  overlapPrefer: 0.8,
  /** Players within this box either side of the passer count toward the overlap. */
  shiftM: 20,
  /** A step jinks the carrier this far sideways, over this many ticks. */
  stepJinkM: 1.6,
  stepJinkTicks: 4,
  /** Carrying the ball costs a little pace: nobody sprints as fast with a footy under the arm. */
  carrySpeed: 0.95,
  /** A receiver runs through the catch point by this much, not to it, so he takes the ball at pace. */
  runOnM: 3,
  /** As the ball is heeled the backline comes up, aiming this far ahead of their standing spots so they are moving when the pass arrives. */
  ruckAdvanceM: 3,
  /** Chance the dummy-half darts instead of passing. */
  dartChance: 0.08,
  /** Engaged carrier's base chance to pass (+ Handling/300, + Playmaker, + preset). */
  passBase: 0.3,
};

/**
 * Forward metres a runner covers in `t` seconds when he steers flat out
 * downfield from forward speed `v0` (negative: still backing up, so he stops
 * first), accelerating at `a` up to `vMax`.
 */
export function runOn(v0: number, a: number, vMax: number, t: number): number {
  if (t <= 0) return 0;
  if (v0 < 0) {
    const ts = Math.min(t, -v0 / a);
    return v0 * ts + 0.5 * a * ts * ts + runOn(0, a, vMax, t - ts);
  }
  const vEnd = Math.min(vMax, v0 + a * t);
  const tAcc = Math.max(0, (vEnd - v0) / a);
  return v0 * tAcc + 0.5 * a * tAcc * tAcc + vEnd * (t - tAcc);
}
