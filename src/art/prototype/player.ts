// Approved match characters. Legacy LOOKS and its hash keep each player's colours and beard.
// No atlas of every cosmetic combination: callers cache only the people on screen.
import { PixelBuffer, shade } from '../pixel';
import { LOOKS, lookForPlayer } from '../match/players';
import { hashString, OUTLINE, type Kit } from '../match/kit';
import { drawHead, HEAD_OPTIONS, type Head, type Facing } from './head';
import { drawText, textWidth } from '../match/font';
import type { Position } from '../../core/state';
export { HEAD_OPTIONS, type Head, type Facing } from './head';

export type Movement = 'drive' | 'brake' | 'cutBack' | 'cutForward' | 'shuffleBack' | 'shuffleForward' | 'backpedal';
export type Build = 'lean' | 'athletic' | 'stocky';
export type Action = 'idle' | 'run' | 'carry' | 'pass' | 'catch' | 'land' | 'receive' | 'guard' | 'brace' | 'wrap' | 'ground' | 'ptb' | 'fend';
/** Reactions (#667): the arms held still over standing or running legs. */
export type ReactAction = 'headHands' | 'hips' | 'fold';
export interface Appearance {
  skin: number;
  hair: number;
  head: Head;
  beard: boolean;
  build: Build;
  tape: boolean;
  boots: number;
  /** Rows taller (+) or shorter (−) than the approved figure, −2…2: the shins carry it. */
  stature: number;
  /** The number on his back in this match (castLooks: his place on the team sheet); none outside a match. */
  number?: number;
}
export const WIDTH = 44;
/** The frame: two spare rows above the approved 40-row figure leave the tallest man his head. */
export const HEIGHT = 42;
export const FOOT = 37;
export const CENTRE = 19;
/** Painters draw the approved figure on a 40-row canvas, boots on row 35; `stand` fits it to the frame. */
export const PAINT_H = 40;
export const PAINT_FOOT = FOOT - (HEIGHT - PAINT_H);
/** Shin rows that a taller man repeats and a shorter man loses, in painter rows. */
const SHINS = [32, 33];

/** Fits a painted figure to the frame: boots on FOOT, `rise` shin rows added (or taken away). */
export function stand(paint: PixelBuffer, rise = 0): PixelBuffer {
  const out = new PixelBuffer(paint.w, HEIGHT);
  const extra = new Set(SHINS.slice(0, Math.max(0, rise)));
  const lost = new Set(SHINS.slice(0, Math.max(0, -rise)));
  // Bottom up: rows under the shins drop straight by the frame's spare rows.
  let from = paint.h - 1;
  for (let y = HEIGHT - 1; y >= 0 && from >= 0; y--) {
    while (lost.has(from)) from--;
    for (let x = 0; x < paint.w; x++) {
      const i = (from * paint.w + x) * 4;
      if (paint.data[i + 3]) out.data.set(paint.data.subarray(i, i + 4), (y * paint.w + x) * 4);
    }
    if (extra.delete(from)) continue;
    from--;
  }
  return out;
}

const BUILDS = ['lean', 'athletic', 'stocky'] as const;
/** Props and locks are big men, outside backs run lean; the rest keep the old hash (second-rowers never lean). */
const BUILD_BY_POSITION: Partial<Record<Position, readonly Build[]>> = {
  prop: ['stocky'], lock: ['stocky'], 'second-row': ['athletic', 'stocky'],
  fullback: ['lean'], winger: ['lean'], centre: ['lean'],
};
/** Height range in rows: tall back-rowers, short hookers and halves. */
const STATURE_BY_POSITION: Record<Position, readonly [number, number]> = {
  prop: [0, 1], lock: [0, 2], 'second-row': [1, 2], hooker: [-2, -1], halfback: [-2, 0],
  'five-eighth': [-1, 1], centre: [0, 1], winger: [-1, 1], fullback: [-1, 1],
};
/** Head styles no legacy look reaches. */
const NEW_HEADS = HEAD_OPTIONS.filter(h => !LOOKS.some(l => l.style === h));

/** Every head turns up about equally often: a legacy style keeps its share of 1/11 and passes the rest to the new ones. */
function headFor(id: string, legacy: Head): Head {
  const h = hashString(`${id}/head-v2`);
  const share = LOOKS.filter(l => l.style === legacy).length / LOOKS.length;
  const keep = 1 / HEAD_OPTIONS.length / share;
  return (h % 1000) / 1000 < keep ? legacy : NEW_HEADS[(h >>> 10) % NEW_HEADS.length]!;
}

/**
 * A pure function of the player: the same id and position give the same man in every
 * match and on every screen. Colours and beard come from the legacy look; head, build
 * and height from their own hashes, build and height biased by position.
 */
export function appearanceFor(id: string, position?: Position): Appearance {
  const legacy = LOOKS[lookForPlayer(id)]!;
  const h = hashString(`${id}/body-v1`);
  const builds = (position && BUILD_BY_POSITION[position]) || BUILDS;
  const [low, high] = position ? STATURE_BY_POSITION[position] : [-1, 1];
  return {
    skin: legacy.skin, hair: legacy.hair, head: headFor(id, legacy.style), beard: legacy.beard,
    build: builds[h % 3 % builds.length]!,
    tape: (h >>> 4) % 2 === 0,
    boots: [0xe6be57, 0xf3eee0, 0xd66a50, 0x293449][(h >>> 6) % 4]!,
    stature: low + hashString(`${id}/stature-v1`) % (high - low + 1),
  };
}

/** One match's cast: who (squad id, or name for a generated rival) → his look, by his own position. */
export function castLooks(sheets: readonly { roster?: readonly CastEntry[]; bench?: readonly CastEntry[] }[]): (who: string) => Appearance {
  // Nothing in a save carries a jersey number: starters wear their slot's number, the bench follows on.
  const cast = new Map<string, { position: Position; number: number }>();
  for (const sheet of sheets) [...sheet.roster ?? [], ...sheet.bench ?? []].forEach((entry, i) => cast.set(entry.id ?? entry.name, { position: entry.position, number: i + 1 }));
  const looks = new Map<string, Appearance>();
  return who => {
    let look = looks.get(who);
    if (!look) {
      const entry = cast.get(who);
      look = { ...appearanceFor(who, entry?.position), ...(entry ? { number: entry.number } : {}) };
      looks.set(who, look);
    }
    return look;
  };
}
interface CastEntry { id?: string; name: string; position: Position }

/** A small rugby ball with a dark edge and white central panel. */
export function ballPixels(): PixelBuffer {
  const b = new PixelBuffer(9, 7);
  b.sprite(['...ooo...', '.owwwwwo.', 'owWwwwWwo', 'owWwwwWwo', '.owwwwwo.', '...ooo...'],
    { o: OUTLINE, w: 0xe7dfc7, W: 0xffffff });
  b.fillRect(3, 2, 3, 1, 0xa39475);
  return b;
}

const BALL = ballPixels();

/**
 * The run cycle (#630): six beats, two steps. Each leg goes contact, support,
 * push-off, trail (heel kicked up), knee lift, reach; the far leg runs half a
 * cycle behind, so beats 2 and 5 are flight with both boots off the turf.
 * [knee dx, knee drop below the hip, boot dx, boot lift off the turf]
 */
const RUN_LEG: readonly (readonly [number, number, number, number])[] = [
  [2, 3, 4, 0], [0, 3, 0, 0], [-2, 2, -4, 2], [-3, 2, -5, 4], [4, 1, 4, 4], [4, 2, 5, 2],
];
/** Below sprint pace (strideFrame 6–11): shorter steps and no flight. */
const JOG_LEG: readonly (readonly [number, number, number, number])[] = [
  [1, 3, 2, 0], [0, 3, 0, 0], [-1, 3, -2, 0], [-2, 2, -3, 1], [2, 2, 2, 1], [2, 3, 3, 0],
];
/** Hips and shoulders: low over the support leg, high in flight. */
const RUN_BOB = [0, 1, -1, 0, 1, -1];
const JOG_BOB = [0, 1, 0, 0, 1, 0];
/** Arm swing, -2 (back) … 2 (forward), for the far arm; the near arm swings opposite. Arms oppose their own legs. */
const ARM_SWING = [2, 1, -1, -2, -1, 1];

/** Local layers for the turn/profile chest. Palette letters keep kit colours procedural.
 * Rows are stretched across each build, with the waist tucked inside the shoulder caps.
 * Edit these small grids to preview the same pose in the art lab and a live match.
 */
export const TORSO_LAYERS: Record<Facing, readonly string[]> = {
  front: ['.LLLLLL.', 'LJJJJJJL', 'sJJJJJJJ', 'sJJJJJJJ', '.sJJJJJ.', '.sJJJJJ.', '.ssJJJs.'],
  back: ['.LLLLLL.', 'LJJJJJsL', 'JJJJJJss', 'JJJJJJss', '.JJJJss.', '.JJJJss.', '.sJJJss.'],
  side: ['..LLLL..', '.LJJJsL.', '.JJJJss.', '.JJJJss.', '.JJJss..', '.JJJss..', '.sJJss..'],
};
/** Hand/ball key poses, in pixels from the near shoulder. Timing remains in playerPicture.
 * Catch/pass entries are the near-hand target; the far hand and ball lead it.
 */
export const HANDLING_POSES = {
  carry: { ball: [1, 3], elbow: [-1, 7], hand: [5, 7] },
  catch: [[7, 2], [6, 2], [4, 3], [4, 4], [4, 5], [5, 7]],
  pass: [[7, 4], [8, 3], [6, 3], [4, 4], [2, 5], [1, 6]],
  receive: [[4, 4], [7, 2]],
  guard: [[3, 5], [6, 4]],
} as const;

/** Shoulder lean / crouch / head lead. The hips and planted boots do not follow the lean.
 * Cuts use two planted support beats; starts, stops and defensive steps add a gather beat.
 */
export const MOVEMENT_POSES: Record<Movement, { lean: number; crouch: number; head: number; arms: number }> = {
  drive: { lean: 2, crouch: 1, head: 0, arms: 1 },
  brake: { lean: -2, crouch: 1, head: -1, arms: .5 },
  cutBack: { lean: -1, crouch: 2, head: 1, arms: .5 },
  cutForward: { lean: 1, crouch: 2, head: 1, arms: .5 },
  shuffleBack: { lean: 0, crouch: 2, head: 0, arms: 0 },
  shuffleForward: { lean: 0, crouch: 2, head: 0, arms: 0 },
  backpedal: { lean: -1, crouch: 1, head: 0, arms: .5 },
};
/** [knee dx, knee drop, boot dx, boot lift], with one supporting boot throughout. */
const STEP_LEG = {
  drive: [[1, 3, 2, 0], [0, 3, 0, 0], [-1, 2, -2, 1], [1, 2, 1, 1]],
  brake: [[4, 3, 5, 0], [2, 3, 2, 0], [-1, 3, -2, 0], [0, 3, 0, 1]],
  cutBack: [[-2, 3, -4, 0], [2, 2, 3, 1]],
  cutForward: [[3, 3, 5, 0], [-1, 2, -2, 1]],
  shuffleBack: [[-2, 3, -4, 0], [0, 3, -1, 0], [1, 2, 2, 1], [0, 3, 0, 0]],
  shuffleForward: [[2, 3, 4, 0], [0, 3, 1, 0], [-1, 2, -2, 1], [0, 3, 0, 0]],
  backpedal: [[-1, 3, -3, 0], [-2, 2, -2, 1], [1, 3, 2, 0], [0, 3, 0, 0]],
} as const;
/** A turn's shoulders follow the head on the second support beat; hips remain over the plant. */
export function movementTorso(facing: Facing, movement: Movement | undefined, gait: number): Facing {
  if ((movement !== 'cutBack' && movement !== 'cutForward') || gait >= 3) return facing;
  return facing === 'side' ? (movement === 'cutBack' ? 'back' : 'front') : 'side';
}

/** Shared painted upper-body coordinates. Ball anchors use these same shoulders, including stride/fatigue. */
export function prototypeUpperAt(build: Build, action: Action | ReactAction, frame: number, strideFrame?: number, tired = 0, movement?: Movement) {
  const f = ((Math.floor(frame) % 6) + 6) % 6;
  const bodyW = build === 'stocky' ? 11 : build === 'athletic' ? 9 : 7;
  // Reactions (#667) hold the arms still over standing or running legs: hands on head, hands on hips, arms folded.
  const react = action === 'headHands' || action === 'hips' || action === 'fold';
  const running = strideFrame !== -1 && (action === 'run' || action === 'carry' || action === 'land' || action === 'catch' || action === 'receive' || action === 'guard' || ((action === 'pass' || action === 'fend' || react) && strideFrame !== undefined));
  const gait = strideFrame === undefined ? f : strideFrame < 0 ? 0 : strideFrame % 6;
  const jog = running && strideFrame !== undefined && strideFrame >= 6;
  const motion = movement ? MOVEMENT_POSES[movement] : undefined;
  const cut = movement === 'cutBack' || movement === 'cutForward';
  const shuffle = movement === 'shuffleBack' || movement === 'shuffleForward';
  // Arms pump with the legs except while the hands are busy catching, passing or fending.
  const weary = ['run', 'carry', 'land', 'idle', 'catch', 'pass', 'receive', 'guard'].includes(action) ? Math.max(0, Math.min(2, tired)) : 0;
  const swing = running && (action === 'run' || action === 'carry' || action === 'land' || (strideFrame !== undefined && f === 5 && action !== 'fend')) ? ARM_SWING[gait]! * (jog ? .5 : 1) * (weary > 1 ? .5 : 1) * (motion?.arms ?? 1) : 0;
  // Away from the shared contact picture a tackle and a beaten (or tackled) man each have a start,
  // a middle and an end over the pose's last frames: reach, wrap, drive low; jolt, rock back, regather.
  const beat = f < 2 ? 0 : f < 4 ? 1 : 2;
  const crouch = action === 'guard' || action === 'land' ? 1 : action === 'wrap' ? [2, 3, 4][beat]! : action === 'brace' ? [3, 4, 1][beat]! : action === 'ptb' ? [6, 6, 3, 1, 0, 0][f]! : 0;
  const motionCrouch = motion ? motion.crouch - (shuffle && (gait === 1 || gait === 4) ? 1 : 0) : 0;
  // Tired legs no longer lift him into flight: the bob only dips.
  const bob = running && !motion ? Math.max(weary ? 0 : -1, (jog ? JOG_BOB : RUN_BOB)[gait]!) : 0;
  // Idle breathing: the chest rises a pixel on the in-breath; hips and boots stay put.
  const breath = (action === 'idle' || (action === 'fold' && !running)) && f % 2 === 1 ? 1 : 0;
  // Dejected, the head drops (and nods a pixel on frame 1 when he stands); a man with hands on hips hangs it lower.
  const hang = action === 'headHands' ? 1 + (running ? 0 : f % 2) : action === 'hips' ? 2 + (running ? 0 : f % 2) : 0;
  const lean = (action === 'wrap' ? [4, 3, 4][beat]! : action === 'brace' ? [3, -1, 1][beat]! : action === 'fend' ? 2 : running ? 1 : action === 'ptb' ? 2 : 0) + weary;
  const hipY = 27 + crouch + bob + motionCrouch;
  // Tired, the hips keep the legs' reach and the shoulders sink toward them: a shorter, hunched trunk.
  const shoulderY = 20 + crouch + bob - breath + weary + motionCrouch;
  const hipLeft = CENTRE - Math.floor(bodyW / 2) + lean;
  const left = hipLeft + (motion?.lean ?? 0);
  // Head down and forward of the shoulders when tired or dejected: the neck sinks into the collar.
  const headX = CENTRE - 7 + lean + (weary > 1 || hang > 1 ? 1 : 0) + (motion?.lean ?? 0) + (motion?.head ?? 0);
  const headY = shoulderY - 17 + weary + hang;
  return { f, running, gait, jog, motion, cut, shuffle, weary, lean, swing, beat, bob, breath, hipY, shoulderY, hipLeft, left, headX, headY };
}

/**
 * Frames are sampled on a six-step cycle; directions are painted, never skewed. Idle breathes over frames 0–1.
 * `tired` (#666): 1 on tired legs, 2 spent or blown. A tired man runs and stands lower and hunched,
 * head down, without the lift into flight; spent, his arms barely pump. 0 is the fresh figure, unchanged.
 */
export function drawPrototypePlayer(a: Appearance, kit: Kit, action: Action | ReactAction, frame: number, facing: Facing = 'front', possession = false, strideFrame?: number, tired = 0, movement?: Movement): PixelBuffer {
  const b = new PixelBuffer(WIDTH, PAINT_H);
  const stocky = a.build === 'stocky';
  const bodyW = stocky ? 11 : a.build === 'athletic' ? 9 : 7;
  const thick = stocky ? 4 : 3;
  const skinDark = shade(a.skin, .7);
  const line = (x: number, y: number, ex: number, ey: number, color: number, width = thick) => {
    for (let i = 0; i < width; i++) b.line(x + i, y, ex + i, ey, color);
  };
  const heldBall = (x: number, y: number) => b.blit(BALL, x, y);

  if (action === 'ground') {
    // Authored side-on landing: bent knees, shoulder on turf, ball protected.
    line(8, 31, 12, 34, skinDark); line(7, 34, 3, 34, kit.sock);
    b.fillRect(2, 34, 5, 2, a.boots);
    b.fillRect(10, 29, 7, 5, kit.shorts);
    b.fillRect(16, 27, 10, stocky ? 7 : 6, kit.jersey);
    b.line(16, 27, 25, 27, kit.jerseyLight);
    b.fillRect(20, 28, 2, 5, kit.trim);
    b.blit(drawHead(a, kit, facing), 24, 18);
    line(17, 33, 10, 35, a.skin);
    b.fillRect(8, 35, 5, 1, a.boots);
    if (possession) heldBall(25, 32);
    line(23, 31, 29, 34, a.skin, 2);
    b.outline(OUTLINE);
    return stand(b);
  }

  const upper = prototypeUpperAt(a.build, action, frame, strideFrame, tired, movement);
  const { f, running, gait, jog, motion, cut, shuffle, lean, swing, beat, bob, breath, hipY, shoulderY, hipLeft, left, headX, headY } = upper;
  const legs = jog ? JOG_LEG : RUN_LEG;
  /** One running leg from its hip: thigh, sock to the boot, boot (toe forward). */
  const runLeg = (hipX: number, top: number, beat: number, thigh: number, boot: number, band: number | null) => {
    let [kx, ky, fx, lift] = legs[beat]!;
    if (movement) {
      const steps = STEP_LEG[movement];
      const half = beat >= 3 ? 1 : 0;
      const gather = beat === 1 || beat === 4;
      const step = steps.length === 2 ? steps[half]! : steps[half * 2 + (gather ? 1 : 0)]!;
      [kx, ky, fx, lift] = step;
    }
    const footY = 34 - lift;
    const kneeY = movement ? Math.min(top + ky + 1, footY - 2) : top + ky + 1;
    line(hipX, top, hipX + kx, kneeY, thigh);
    line(hipX + kx, kneeY, hipX + fx, footY, kit.sock);
    if (band !== null) b.fillRect(hipX + kx, kneeY, thick, 1, band);
    // Flat support boot with a heel/toe edge; lifted boots tuck under the knee.
    b.fillRect(hipX + fx, footY, lift > 2 ? 4 : 5, 2, boot);
    if (lift === 0) b.fillRect(hipX + fx, footY + 1, 5, 1, shade(boot, .78));
  };

  // Far limbs first; subdued shading separates them in crowded contact.
  if (running) {
    runLeg(18, hipY, (gait + 3) % 6, skinDark, shade(a.boots, .7), null);
  } else {
    line(18, hipY, 18, 30 + bob, skinDark);
    line(18, 30 + bob, 18, 34, kit.sock);
    b.fillRect(17, 34, 5, 2, shade(a.boots, .7));
  }
  // The fend's ball goes under the far arm, out of the defender's reach.
  if (action === 'fend' && possession) heldBall(left - 5, shoulderY + 2);
  if (action === 'headHands') {
    // Hands clasped behind his head: only the elbows show, flared out beside it.
    line(left + 2, shoulderY + 1, headX - 1, headY + 12, skinDark, 2);
    line(headX - 1, headY + 12, headX + 4, headY + 7, skinDark, 2);
  } else if (action === 'hips') {
    line(left + 2, shoulderY + 1, left - 3, shoulderY + 3, skinDark, 2);
    line(left - 3, shoulderY + 3, left, hipY - 1, skinDark, 2);
  } else if (action === 'fold') {
    // Folded arms are painted over the chest below.
  } else if (swing > 0) {
    // Swung forward: the forearm comes up past the chest.
    line(left + 2, shoulderY + 1, left + 3, shoulderY + 5, skinDark, 2);
    line(left + 3, shoulderY + 5, left + bodyW + (swing > 1 ? 1 : -1), shoulderY + (swing > 1 ? 3 : 5), skinDark, 2);
  } else if (swing < 0) {
    // Swung back: elbow behind the hip, hand trailing.
    line(left + 2, shoulderY + 1, left - (swing < -1 ? 2 : 1), shoulderY + 4, skinDark, 2);
    line(left - (swing < -1 ? 2 : 1), shoulderY + 4, left - (swing < -1 ? 4 : 2), shoulderY + (swing < -1 ? 6 : 7), skinDark, 2);
  } else {
    line(left + 2, shoulderY + 1, left - 1, shoulderY + 6, skinDark);
  }

  // Hand-authored chest clusters: broad shoulders, a lit breast and a tucked waist.
  // The same head/limb anchors keep every turn on the existing short-legged figure.
  const torsoFacing = action === 'pass' && f < 4 ? facing === 'side' ? 'front' : 'side' : movementTorso(facing, movement, gait);
  const torso = TORSO_LAYERS[torsoFacing];
  const torsoLeft = left - (torsoFacing === 'side' ? 0 : 1);
  const torsoWidth = bodyW + (torsoFacing === 'side' ? 0 : 2);
  const palette: Record<string, number> = { L: kit.jerseyLight, J: kit.jersey, s: kit.jerseyShade };
  for (let y = 0; y < 7 + breath; y++) {
    const row = torso[Math.min(y, 6)]!;
    for (let x = 0; x < torsoWidth; x++) {
      const color = palette[row[Math.floor(x * row.length / torsoWidth)]!];
      if (color !== undefined) b.set(torsoLeft + x - Math.round((motion?.lean ?? 0) * y / 7), shoulderY + y, color);
    }
  }
  if (kit.pattern === 'v') {
    b.line(left + 1, shoulderY + 2, left + bodyW / 2, shoulderY + 5, kit.trim);
    b.line(left + bodyW / 2, shoulderY + 5, left + bodyW - 2, shoulderY + 2, kit.trim);
  } else if (kit.pattern === 'hoops') {
    b.fillRect(left, shoulderY + 3, bodyW, 2, kit.trim);
  } else if (kit.pattern === 'stripes') {
    for (let x = 2; x < bodyW; x += 3) b.fillRect(left + x, shoulderY + 1, 1, 7, kit.trim);
  }
  b.fillRect(hipLeft + 1, hipY, bodyW - 1, 3, kit.shorts);
  b.fillRect(hipLeft + 1, hipY + 2, bodyW - 1, 1, kit.shortsShade);
  // On the push-off and in flight the jersey tail and shorts hem trail a pixel behind (#670).
  if (running && (gait === 2 || gait === 3 || gait === 5)) {
    b.fillRect(left - 1, shoulderY + 5 + breath, 1, 2, kit.jerseyShade);
    b.fillRect(hipLeft, hipY + 1, 1, 2, kit.shortsShade);
  }
  const nearX = hipLeft + bodyW - 4;
  if (running) runLeg(nearX, hipY + 2, gait, a.skin, a.boots, kit.trim);
  else {
    const heel = action === 'ptb' && f >= 4 ? -5 : 0;
    line(nearX, hipY + 2, nearX + heel, 31 + bob, a.skin);
    line(nearX + heel, 31 + bob, nearX + heel, 34, kit.sock);
    b.fillRect(nearX + heel, 31 + bob, thick, 1, kit.trim);
    b.fillRect(nearX + heel, 34, 5, 2, a.boots);
  }

  b.fillRect(CENTRE + lean + (motion?.lean ?? 0), shoulderY - 2, 3, 3, skinDark);
  b.fillRect(CENTRE + lean - 1 + (motion?.lean ?? 0), shoulderY, 5, 1, kit.trim);
  const shX = left + bodyW - 2;
  const shY = shoulderY + 2;
  // The near elbow goes behind the head too, so the head covers both hands.
  if (action === 'headHands') {
    line(shX, shY, headX + 16, headY + 12, a.skin, 2);
    line(headX + 16, headY + 12, headX + 11, headY + 7, a.skin, 2);
  }
  // Long hair swings against the bob: it stays where it was a beat ago while the head rises or drops (#670).
  b.blit(drawHead(a, kit, facing, running ? -bob : 0), headX, headY);

  let handX = shX + 1;
  let handY = shY + 6;
  if (action === 'headHands') {
    handX = headX + 16; handY = headY + 12;
  } else if (action === 'hips') {
    handX = shX; handY = hipY;
    line(shX, shY, shX + 4, shY + 3, a.skin, 2);
    line(shX + 4, shY + 3, handX, handY, a.skin, 2);
  } else if (action === 'fold') {
    // Forearms crossed over the chest: the far one under, the near one on top.
    line(left, shoulderY + 3, left + bodyW - 2, shoulderY + 3, skinDark, 2);
    handX = left + 1; handY = shoulderY + 5;
    line(shX + 1, shY - 1, shX + 1, shoulderY + 5, a.skin, 2);
    line(shX + 1, shoulderY + 5, handX, handY, a.skin, 2);
  } else if (action === 'carry' || action === 'land' || action === 'brace' || (action === 'catch' && f === 5)) {
    const pose = HANDLING_POSES.carry;
    handX = shX + pose.hand[0]; handY = shY + pose.hand[1];
    // A supporting far hand and a low near forearm leave the white ball panel exposed.
    line(shX - 3, shY + 2, shX + 4, shY + 6, skinDark, 2);
    const at = handlingBallAt(upper, a.build, 'carry');
    if (possession) heldBall(at.x, at.y);
    line(shX, shY, shX + pose.elbow[0], shY + pose.elbow[1], a.skin);
    line(shX + pose.elbow[0], shY + pose.elbow[1], handX, handY, a.skin, 2);
  } else if (action === 'receive' || action === 'guard') {
    const pose = HANDLING_POSES[action][Math.min(1, f)]!;
    handX = shX + pose[0]; handY = shY + pose[1];
    line(shX - 3, shY + 1, handX - 2, handY + 2, skinDark, 2);
    line(shX, shY, shX + 2, shY + 4, a.skin, 2);
    line(shX + 2, shY + 4, handX, handY, a.skin, 2);
    b.fillRect(handX + 1, handY - 1, 1, 3, a.skin);
  } else if (action === 'catch' || (action === 'pass' && f < 5)) {
    const pose = HANDLING_POSES[action][f]!;
    handX = shX + pose[0]; handY = shY + pose[1];
    line(shX - 3, shY + 1, handX - 2, handY + 2, skinDark, 2);
    const at = handlingBallAt(upper, a.build, action);
    if (possession) heldBall(at.x, at.y);
    line(shX, shY, shX + 2, shY + 4, a.skin, 2);
    line(shX + 2, shY + 4, handX, handY, a.skin, 2);
  } else if (action === 'fend') {
    // A straight arm, palm out: cocked, locked out at the defender, then drawn back in.
    handX = shX + [4, 6, 8, 8, 7, 4][f]!; handY = shY + [2, 1, 0, 0, 0, 1][f]!;
    line(shX, shY, handX, handY, a.skin, 2);
    b.fillRect(handX, handY - 1, 2, 3, a.skin);
  } else if (action === 'wrap') {
    handX = shX + [9, 7, 6][beat]!; handY = shY + [1, 2, 3][beat]!;
    line(shX - 4, shY + 1, handX - 1, handY + 4, skinDark, 2);
    line(shX, shY, handX - 2, shY - 1, a.skin);
    line(handX - 2, shY - 1, handX, handY, a.skin, 2);
  } else if (shuffle || cut || movement === 'backpedal') {
    handX = shX + (shuffle ? 3 : 2); handY = shY + 4;
    line(left + 1, shY, left - 1, shY + 4, skinDark, 2);
    line(left - 1, shY + 4, left + 2, shY + 5, skinDark, 2);
    line(shX, shY, shX + 3, shY + 2, a.skin, 2);
    line(shX + 3, shY + 2, handX, handY, a.skin, 2);
  } else if (swing !== 0) {
    // Pumping: bent at the elbow, forward as the far leg reaches, back as the near leg does.
    const s = -swing;
    const elbow = s > 0 ? [shX + 1, shY + 4] : [shX - (s < -1 ? 3 : 1), shY + 4];
    handX = s > 1 ? shX + 4 : s > 0 ? shX + 3 : s < -1 ? shX - 4 : shX - 2;
    handY = s > 1 ? shY + 2 : s > 0 ? shY + 4 : s < -1 ? shY + 6 : shY + 7;
    line(shX, shY, elbow[0]!, elbow[1]!, a.skin);
    line(elbow[0]!, elbow[1]!, handX, handY, a.skin, 2);
  } else {
    if (action === 'ptb') { handX = shX + 2; handY = shY + (f < 3 ? 7 : 5); }
    line(shX, shY, handX - 1, handY - 2, a.skin);
    line(handX - 1, handY - 2, handX, handY, a.skin, 2);
    if (action === 'ptb' && possession) heldBall(CENTRE + 2 - (f >= 4 ? 6 : 0), 30);
  }
  b.fillRect(shX, shY - 1, 3, 2, kit.jerseyShade);
  if (kit.pattern === 'sleeves') {
    // A trim cuff across the upper arm, wherever the arm points.
    const dx = handX - shX; const dy = handY - shY;
    if (Math.abs(dx) > Math.abs(dy)) b.fillRect(shX + Math.sign(dx) * 2 + 1, shY - 1, 2, 3, kit.trim);
    else b.fillRect(shX + Math.round(dx / Math.max(1, Math.abs(dy)) * 2), shY + 1, 3, 2, kit.trim);
    b.fillRect(shX, shY - 1, 3, 1, kit.trim);
  }
  // A small palm and lit knuckle distinguish hands from the forearm at phone size.
  if (action !== 'headHands' && (swing === 0 || action === 'carry' || action === 'land' || action === 'brace' || action === 'catch')) {
    b.fillRect(handX, handY, 2, 2, a.skin);
    b.set(handX + 1, handY, shade(a.skin, 1.12));
  }
  if (a.tape && action !== 'headHands') b.fillRect(handX, handY - 1, 2, 2, 0xf6edda);
  if (facing === 'back' && a.number !== undefined) {
    // The 3×5 hoarding digits, centred on the back; omitted on the front chest. Painted last:
    // from behind the arms and a tucked ball pass behind the jersey, so they never cover it.
    const digits = String(a.number);
    const w = textWidth(digits);
    const x0 = left + Math.floor((bodyW - w) / 2);
    // A plain panel under the digits keeps them off hoops, stripes and the V.
    const panel = Math.max(left, x0 - 1);
    b.fillRect(panel, shoulderY + 1, Math.min(left + bodyW, x0 + w + 1) - panel, 5, kit.jersey);
    drawText(digits, (x, y) => b.set(x0 + x, shoulderY + 1 + y, kit.trim));
  }
  b.outline(OUTLINE);
  return stand(b, a.stature);
}


function handlingBallAt(p: ReturnType<typeof prototypeUpperAt>, build: Build, action: 'carry' | 'land' | 'catch' | 'pass'): { x: number; y: number } {
  const bodyW = build === 'stocky' ? 11 : build === 'athletic' ? 9 : 7;
  const shX = p.left + bodyW - 2, shY = p.shoulderY + 2;
  const carry = action === 'carry' || action === 'land' || (action === 'catch' && p.f === 5);
  const target = carry ? HANDLING_POSES.carry.ball : HANDLING_POSES[action === 'pass' ? 'pass' : 'catch'][p.f]!;
  return { x: shX + target[0] - (carry ? 0 : 3), y: shY + target[1] - (carry ? 0 : 2) };
}

/** Centre of the embedded ball relative to the actor's feet, in the unmirrored painted frame. */
export function playerBallAnchor(a: Appearance, action: 'carry' | 'land' | 'catch' | 'pass', frame: number, strideFrame?: number, tired = 0, movement?: Movement): { x: number; y: number } {
  const p = prototypeUpperAt(a.build, action, frame, strideFrame, tired, movement);
  const at = handlingBallAt(p, a.build, action);
  return { x: at.x + 4.5 - CENTRE, y: at.y + 3.5 + HEIGHT - PAINT_H - a.stature - FOOT };
}
