// src/scenes/matchOfficials.ts — the match's people and furniture off the ball (#642):
// the officials, the interchange benches, the sin bin and the corner flags. Where they
// stand is decided by src/match/view/officials.ts (pure functions of the snapshot).
// Textures are repainted in place. An outgoing player's texture is created when
// first needed, and the registry frees the textures on shutdown.
import type Phaser from 'phaser';
import { PixelBuffer } from '../art/pixel';
import type { Kit } from '../art/match/kit';
import type { Appearance, Facing } from '../art/prototype/player';
import { CENTRE, FOOT, HEIGHT, WIDTH, appearanceFor } from '../art/prototype/player';
import { drawLivePlayer, type LivePlayerAction } from '../art/match/livePlayer';
import {
  BIN_SPOT_X,
  BIN_SPOT_Y,
  CORNER_FLAG_H,
  CORNER_FLAG_W,
  CORNER_FLAG_X,
  drawBinCard,
  drawBinSpot,
  drawCornerFlag,
  drawRefereeSixAgain,
  drawSeatedPlayer,
  paintBench,
  refereeKit,
  refereeLook,
} from '../art/match/bench';
import { TOUCH_JUDGE_JOG_FRAMES, TOUCH_JUDGE_POSES, drawTouchJudge } from '../art/match/touchJudge';
import { CONVERSION_SIGNAL_TICKS, TOUCH_JUDGE_FADE_TICKS, conversionJudges } from '../match/view/conversionJudges';
import { TICK_S } from '../match/core/engine';
import { clamp, lerp, type Vec } from '../match/core/vec';
import { toFieldPt } from '../match/core/field';
import type { PlayerSnap, Side, Snapshot } from '../match/core/snapshot';
import { BENCH, REF, SIX_AGAIN_POSE_TICKS, benchJog, benchSeat, benchSeated, binSeat, binnedSpot, refCoversCarrier, refereeSignal, refereeSpot, type BenchSheet } from '../match/view/officials';
import type { MatchArtRegistry } from './matchArt';
import { BOARD_TEX_H, BOARD_TEX_W, boardColor, drawScoreboard, flashWord, scoreboardOrigin, type BoardState } from '../art/match/scoreboard';
import { reducedMotion } from '../match/view/impact';
import { breakKind } from '../match/view/walkOff';

/** Two planted steps take three metres. Below 0.6 m/s both boots settle. */
const JUDGE_STRIDE_M = 3;
const JUDGE_IDLE_STEP_M = 0.6 * TICK_S;
/** Referee frames kept (a few dozen are ever drawn). */
const REF_FRAMES = 48;
/** The scoreboard's flash after a score (real ms): beats of BEAT_MS for FLASH_MS, the last stretch back on the score. */
const FLASH_MS = 3600;
const FLASH_WORD_MS = 2600;
const BEAT_MS = 280;
/** World px the sin-bin card hangs above the binned man's feet. */
const CARD_LIFT = 41;

/** Phaser.BlendModes.ADD (the type-only import keeps Phaser out of this module's tests). */
const BLEND_ADD = 1;

/** A player-attached bin card belongs to the live picture, not the whistle's walk-off. */
export function binCardSpot(p: PlayerSnap, s: Snapshot): { x: number; y: number } | null {
  return breakKind(s) ? null : binnedSpot(p, s);
}

/** A canvas texture repainted in place: one per thing, never one per frame. */
class Canvas {
  readonly key: string;
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: ImageData;
  constructor(scene: Phaser.Scene, art: MatchArtRegistry, key: string, w: number, h: number) {
    this.key = art.texture(key, new PixelBuffer(w, h));
    this.tex = scene.textures.get(this.key) as Phaser.Textures.CanvasTexture;
    this.img = this.tex.getContext().createImageData(w, h);
  }
  paint(buf: PixelBuffer): void {
    this.img.data.set(buf.data);
    this.tex.getContext().putImageData(this.img, 0, 0);
    this.tex.refresh();
  }
}

export interface OfficialsOptions {
  kits: Record<Side, Kit>;
  sheets: Record<Side, BenchSheet>;
  look: (who: string) => Appearance;
  toWorld: (fx: number, fy: number) => { x: number; y: number };
  shadowKey: string;
  offsetX: number;
  /** The depth a player's sprite is drawn at (the referee goes behind the carrier rather than over him). */
  carrierDepth: (side: Side, slot: number) => number | null;
  /** The sides' short tags (the score bug's) and the scoreboard's depth (behind the pitch). */
  tags: readonly [string, string];
  boardDepth: number;
  /** After dark the board's LEDs glow through the night grade: an additive copy at this depth and strength (none by day). */
  boardGlow?: { depth: number; alpha: number };
}

interface BenchView {
  canvas: Canvas;
  image: Phaser.GameObjects.Image;
  seats: { x: number; y: number }[];
  /** Who was painted, so an unchanged bench is not repainted. */
  shown: string;
  card: Phaser.GameObjects.Image;
  joggers: (BenchJogger | undefined)[];
  jogging: boolean;
}

interface BenchJogger {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  canvas: Canvas;
  shown: string;
}

interface TouchJudgeView {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

export class MatchOfficials {
  private readonly opts: OfficialsOptions;
  private readonly refKit: Kit;
  private readonly refLook: Appearance;
  private readonly ref: Phaser.GameObjects.Sprite;
  private readonly refShadow: Phaser.GameObjects.Image;
  private readonly refCanvas: Canvas;
  private readonly refFrames = new Map<string, PixelBuffer>();
  private refShown = '';
  private readonly judges: readonly [TouchJudgeView, TouchJudgeView];
  /** Framing points for the current conversion picture, in world pixels. */
  conversionFocus: Vec[] | null = null;
  private readonly benches: Record<Side, BenchView>;
  private readonly seated = new Map<string, PixelBuffer>();

  private readonly scene: Phaser.Scene;
  private readonly art: MatchArtRegistry;
  private readonly board: Canvas;
  private readonly boardColors: readonly [number, number];
  private boardShown = '';
  private boardLast: readonly [number, number] | null = null;
  private boardFlash: { word: string; side: Side; from: number } | null = null;
  private readonly reduced = reducedMotion();
  /** The points on the scoreboard now (the e2e run checks it against the score bug). */
  boardScore: readonly [number, number] | null = null;

  constructor(scene: Phaser.Scene, art: MatchArtRegistry, opts: OfficialsOptions) {
    this.opts = opts;
    this.scene = scene;
    this.art = art;
    const world = (p: { x: number; y: number }) => {
      const f = toFieldPt(p);
      return opts.toWorld(f.fx, f.fy);
    };
    // Corner posts at the four corners of the field of play, each sorted by its own foot like an upright.
    const flag = art.texture('corner-flag', drawCornerFlag(opts.kits.home));
    for (const fx of [0, 100]) {
      for (const fy of [0, 100]) {
        const w = opts.toWorld(fx, fy);
        scene.add.image(w.x, w.y, flag).setOrigin((CORNER_FLAG_X + 0.5) / CORNER_FLAG_W, (CORNER_FLAG_H - 1) / CORNER_FLAG_H).setDepth(w.y + 1);
      }
    }
    // The benches, the sin-bin spots and their cards.
    const spot = art.texture('bin-spot', drawBinSpot());
    const card = art.texture('bin-card', drawBinCard());
    const bench = (side: Side): BenchView => {
      const seats = Array.from({ length: BENCH.seats }, (_, i) => world(benchSeat(side, i)));
      const empty = paintBench(seats, seats.map(() => null), opts.kits[side]);
      const canvas = new Canvas(scene, art, `bench-${side}`, empty.buf.w, empty.buf.h);
      canvas.paint(empty.buf);
      const mid = seats.reduce((a, s) => a + s.y, 0) / seats.length;
      const image = scene.add.image(empty.x, empty.y, canvas.key).setOrigin(0, 0).setDepth(mid + 1);
      const bin = world(binSeat(side));
      scene.add.image(Math.round(bin.x) - BIN_SPOT_X, Math.round(bin.y) - BIN_SPOT_Y, spot).setOrigin(0, 0).setDepth(bin.y);
      return { canvas, image, seats, joggers: [], jogging: false, shown: '', card: scene.add.image(0, 0, card).setOrigin(0.5, 1).setVisible(false) };
    };
    this.benches = { home: bench('home'), away: bench('away') };
    // The referee: one sprite and its shadow, in a strip neither side can be taken for.
    this.refKit = refereeKit(opts.kits.home, opts.kits.away);
    this.refLook = refereeLook();
    this.refCanvas = new Canvas(scene, art, 'referee', WIDTH, HEIGHT);
    this.ref = scene.add.sprite(0, 0, this.refCanvas.key).setOrigin(CENTRE / WIDTH, FOOT / HEIGHT);
    this.refShadow = scene.add.image(0, 0, opts.shadowKey).setDepth(-80_000);
    const buildJudge = (i: number): TouchJudgeView => {
      const look: Appearance = { ...appearanceFor(`touch-judge-${i}`), tape: false, boots: this.refLook.boots };
      const still = [...TOUCH_JUDGE_POSES, 'sideline'] as const;
      const atlas = new PixelBuffer(WIDTH * (still.length + TOUCH_JUDGE_JOG_FRAMES), HEIGHT * 2);
      const frames = (['front', 'back'] as const).flatMap((facing, row) => {
        const addFrame = (pixels: PixelBuffer, name: string, col: number) => {
          atlas.blit(pixels, col * WIDTH, row * HEIGHT);
          return { name: `${facing}/${name}`, x: col * WIDTH, y: row * HEIGHT, w: WIDTH, h: HEIGHT };
        };
        return [
          ...still.map((pose, col) => addFrame(drawTouchJudge(look, this.refKit, facing, pose), pose, col)),
          ...Array.from({ length: TOUCH_JUDGE_JOG_FRAMES }, (_, jog) =>
            addFrame(drawTouchJudge(look, this.refKit, facing, 'sideline', jog), `jog${jog}`, still.length + jog)),
        ];
      });
      const key = art.atlas(`touch-judge-${i}`, atlas, frames);
      return {
        image: scene.add.image(0, 0, key).setVisible(false),
        shadow: scene.add.image(0, 0, opts.shadowKey).setDepth(-80_000).setVisible(false),
      };
    };
    this.judges = [buildJudge(0), buildJudge(1)];
    // The scoreboard on the grandstand roof (#673): one texture, repainted when what it shows changes.
    this.boardColors = [boardColor(opts.kits.home), boardColor(opts.kits.away)];
    this.board = new Canvas(scene, art, 'scoreboard', BOARD_TEX_W, BOARD_TEX_H);
    const o = scoreboardOrigin(opts.offsetX);
    scene.add.image(o.x, o.y, this.board.key).setOrigin(0, 0).setDepth(opts.boardDepth);
    if (opts.boardGlow) {
      scene.add.image(o.x, o.y, this.board.key).setOrigin(0, 0).setDepth(opts.boardGlow.depth).setAlpha(opts.boardGlow.alpha).setBlendMode(BLEND_ADD);
    }
    this.board.paint(drawScoreboard({ tags: opts.tags, score: [0, 0] }, this.boardColors));
  }

  /**
   * The scoreboard shows the drawn tick's score (the replay's while one plays, as the score
   * bug does). A score going up flashes the word in the scorer's colours, on wall-clock
   * beats; under reduced motion the word holds still for the same time.
   */
  private drawBoard(score: readonly [number, number]): void {
    const now = this.scene.time.now;
    const last = this.boardLast;
    if (last && (score[0] > last[0] || score[1] > last[1])) {
      const side: Side = score[0] - last[0] >= score[1] - last[1] ? 'home' : 'away';
      const pts = side === 'home' ? score[0] - last[0] : score[1] - last[1];
      this.boardFlash = { word: flashWord(pts), side, from: now };
    } else if (last && (score[0] < last[0] || score[1] < last[1])) this.boardFlash = null; // rewound (a seek, a replay)
    this.boardLast = score;
    this.boardScore = score;
    let state: BoardState = { tags: this.opts.tags, score };
    const f = this.boardFlash;
    if (f) {
      const t = now - f.from;
      if (t >= FLASH_MS) this.boardFlash = null;
      else if (t < FLASH_WORD_MS) state = { ...state, flash: { word: f.word, side: f.side, on: this.reduced || Math.floor(t / BEAT_MS) % 2 === 0 } };
    }
    const key = JSON.stringify(state);
    if (key === this.boardShown) return;
    this.boardShown = key;
    this.board.paint(drawScoreboard(state, this.boardColors));
  }

  /** Where a sin-binned man is drawn (his side's bin), or null to leave him where the sim has him. */
  spot(p: PlayerSnap, s: Snapshot): { x: number; y: number } | null {
    return binnedSpot(p, s);
  }

  /** The tick on screen (a replay's while it plays): the crowd reads the score and the ball's height from it. */
  latest: Snapshot | null = null;

  /** Draw everyone for the frame between `prev` and `cur` at `alpha` (LiveView calls this after the players). */
  draw(prev: Snapshot, cur: Snapshot, alpha: number, heldTicks = 0): void {
    this.latest = cur;
    if (cur.score) this.drawBoard([cur.score.home, cur.score.away]);
    this.drawReferee(prev, cur, alpha);
    this.drawTouchJudges(prev, cur, alpha, heldTicks);
    const tick = prev.tick + (cur.tick - prev.tick) * alpha;
    const exits = cur.interchangeExits?.length && !breakKind(cur) ? cur.interchangeExits : undefined;
    this.drawBench('home', cur, tick, exits);
    this.drawBench('away', cur, tick, exits);
  }

  private world(p: { x: number; y: number }): { x: number; y: number } {
    const f = toFieldPt(p);
    return this.opts.toWorld(f.fx, f.fy);
  }

  private placeJudge(judge: TouchJudgeView, at: Vec, lookAt: Vec, pose: string, opacity: number): void {
    const x = Math.round(at.x);
    const y = Math.round(at.y);
    const left = lookAt.x < at.x;
    const facing = lookAt.y < at.y - 4 ? 'back' : 'front';
    judge.image.setPosition(x, y).setDepth(y + 1.0007).setVisible(opacity > 0).setAlpha(opacity)
      .setFrame(`${facing}/${pose}`).setOrigin((left ? WIDTH - CENTRE : CENTRE) / WIDTH, FOOT / HEIGHT).setFlipX(left);
    judge.shadow.setPosition(x, y).setVisible(opacity > 0).setAlpha(opacity);
  }

  private drawTouchJudges(prev: Snapshot, cur: Snapshot, a: number, heldTicks: number): void {
    const cue = conversionJudges(cur, heldTicks);
    this.conversionFocus = null;
    if (!cue) {
      this.drawSidelineJudges(prev, cur, a, heldTicks);
      return;
    }
    const kicker = this.world(cue.lookAt);
    const [far, near] = cue.feet;
    const feet = [this.world(far), this.world(near)] as const;
    for (const [i, judge] of this.judges.entries()) {
      const arriving = cue.pose === 'ready' && !cur.conversion?.decision;
      this.placeJudge(judge, feet[i]!, kicker, cue.pose, arriving ? cur.touchJudges?.[i]?.alpha ?? 1 : cue.alpha);
    }
    const [farWorld, nearWorld] = feet;
    // Centre on the two flags, with room for their full height. Include the tee while the kick is on.
    this.conversionFocus = [{ x: (farWorld.x + nearWorld.x) / 2, y: (farWorld.y + nearWorld.y) / 2 - 20 },
      { x: farWorld.x, y: farWorld.y - 36 }, { x: nearWorld.x, y: nearWorld.y },
      ...(!cur.conversion?.decision ? [{ x: kicker.x, y: kicker.y - 18 }] : [])];
  }

  private drawSidelineJudges(prev: Snapshot, cur: Snapshot, a: number, heldTicks: number): void {
    const ball = this.world(lerp(prev.ball, cur.ball, a));
    const decision = cur.conversion?.decision;
    const whistle = cur.phase?.kind === 'half-time' || cur.phase?.kind === 'full-time';
    const time = prev.tick + (cur.tick - prev.tick) * a;
    const leaving = decision ? clamp((time - decision.tick - CONVERSION_SIGNAL_TICKS) / TOUCH_JUDGE_FADE_TICKS, 0, 1) : 1;
    for (const [i, judge] of this.judges.entries()) {
      const p = cur.touchJudges?.[i];
      if (!p) {
        judge.image.setVisible(false);
        judge.shadow.setVisible(false);
        continue;
      }
      const before = prev.touchJudges?.[i] ?? p;
      const at = lerp(before, p, a);
      const moving = Math.hypot(p.dx, p.dy) > JUDGE_IDLE_STEP_M;
      const distance = before.distance + (p.distance - before.distance) * a;
      const jog = Math.floor(distance / JUDGE_STRIDE_M * TOUCH_JUDGE_JOG_FRAMES + i * 3) % TOUCH_JUDGE_JOG_FRAMES;
      const look = moving ? this.world({ x: at.x + p.dx * 12, y: at.y + p.dy * 12 }) : ball;
      const opacity = before.alpha + (p.alpha - before.alpha) * a;
      const alpha = whistle
        ? (decision ? 0 : Math.max(0, opacity - heldTicks / TOUCH_JUDGE_FADE_TICKS)) : Math.min(opacity, leaving);
      this.placeJudge(judge, this.world(at), look, moving ? `jog${jog}` : 'sideline', alpha);
    }
  }

  private drawReferee(prev: Snapshot, cur: Snapshot, a: number): void {
    const p0 = refereeSpot(prev);
    const p1 = refereeSpot(cur);
    const at = this.world({ x: p0.x + (p1.x - p0.x) * a, y: p0.y + (p1.y - p0.y) * a });
    const x = Math.round(at.x);
    const y = Math.round(at.y);
    // Sorted like a player; should he stand over the carrier, he goes behind him instead.
    const behind = refCoversCarrier(cur, p1, this.opts.offsetX) && cur.ball.holder;
    const carrier = behind ? this.opts.carrierDepth(cur.ball.holder!.side, cur.ball.holder!.slot) : null;
    this.ref.setPosition(x, y).setDepth(carrier !== null ? carrier - 0.01 : y + 1.0007);
    this.refShadow.setPosition(x, y);
    // He faces the ball, and runs when play runs.
    const ball = this.world(cur.ball);
    const left = ball.x < x;
    const facing: Facing = ball.y < y - 4 ? 'back' : 'front';
    const ticks = Math.max(1, cur.tick - prev.tick);
    const speed = Math.hypot(p1.x - p0.x, p1.y - p0.y) / (ticks * TICK_S);
    const signal = refereeSignal(cur);
    let action: LivePlayerAction = 'idle';
    let frame = Math.floor(cur.tick / 14) % 2;
    let stride: number | undefined;
    if (signal === 'try') {
      action = 'fistPump';
      frame = 2;
    } else if (signal === 'penalty') {
      action = 'point';
      frame = 2;
    } else if (prev.tick !== cur.tick && speed > REF.runSpeed) {
      action = 'run';
      stride = (Math.floor(cur.tick * 0.5) % 6) + (speed < 5 ? 6 : 0);
      frame = stride % 6;
    }
    const arm = signal === 'six-again' ? Math.floor((cur.tick - cur.sixAgainTick!) / SIX_AGAIN_POSE_TICKS) : undefined;
    const key = `${action}/${frame}/${stride ?? ''}/${facing}/${arm ?? ''}`;
    if (key !== this.refShown) {
      let pixels = this.refFrames.get(key);
      if (!pixels) {
        pixels = arm === undefined
          ? drawLivePlayer(this.refLook, this.refKit, action, frame, facing, false, stride)
          : drawRefereeSixAgain(this.refLook, this.refKit, arm, frame, facing, stride);
        if (this.refFrames.size >= REF_FRAMES) this.refFrames.delete(this.refFrames.keys().next().value!);
        this.refFrames.set(key, pixels);
      }
      this.refCanvas.paint(pixels);
      this.refShown = key;
    }
    this.ref.setOrigin((left ? WIDTH - CENTRE : CENTRE) / WIDTH, FOOT / HEIGHT).setFlipX(left);
  }

  private createJogger(side: Side, seat: number): BenchJogger {
    const canvas = new Canvas(this.scene, this.art, `bench-jog-${side}-${seat}`, WIDTH, HEIGHT);
    return {
      canvas,
      image: this.scene.add.image(0, 0, canvas.key).setVisible(false),
      shadow: this.scene.add.image(0, 0, this.opts.shadowKey).setDepth(-80_000).setVisible(false),
      shown: '',
    };
  }

  private drawBench(side: Side, cur: Snapshot, tick: number, exits: Snapshot['interchangeExits']): void {
    const b = this.benches[side];
    const sheet = this.opts.sheets[side];
    const who = benchSeated(sheet, side, cur).slice(0, BENCH.seats);
    const seatsWithExits = exits ? Math.min(who.length, sheet.bench?.length ?? 0) : 0;
    // Previously used seats still need hiding when the bench shrinks or the view seeks.
    const slots = seatsWithExits || b.jogging ? Math.max(seatsWithExits, b.joggers.length) : 0;
    b.jogging = false;
    for (let i = 0; i < slots; i++) {
      const key = i < seatsWithExits ? who[i] : undefined;
      const exit = key === undefined ? undefined : exits?.find(e => e.side === side && e.who === key);
      const run = exit && benchJog(exit, i, tick);
      let j = b.joggers[i];
      if (!run || !exit || key === undefined) {
        if (j?.image.visible) {
          j.image.setVisible(false);
          j.shadow.setVisible(false);
        }
        continue;
      }
      if (!j) {
        j = this.createJogger(side, i);
        b.joggers[i] = j;
      }
      b.jogging = true;
      j.image.setVisible(true);
      j.shadow.setVisible(true);
      who[i] = '';
      const at = this.world(run), to = this.world(run.to);
      const x = Math.round(at.x), y = Math.round(at.y);
      const left = to.x < at.x;
      const facing = to.y < at.y - 2 ? 'back' : 'front';
      const frame = `${key}/${facing}/${run.stride}/${exit.tired}`;
      if (j.shown !== frame) {
        j.shown = frame;
        j.canvas.paint(drawLivePlayer(this.opts.look(key), this.opts.kits[side], 'run', run.stride % 6, facing, false, run.stride, exit.tired));
      }
      j.image.setPosition(x, y).setDepth(y + 1).setOrigin((left ? WIDTH - CENTRE : CENTRE) / WIDTH, FOOT / HEIGHT).setFlipX(left);
      j.shadow.setPosition(x, y);
    }
    const shown = who.join('|');
    if (shown !== b.shown) {
      b.shown = shown;
      const people = b.seats.map((_, i) => {
        const w = who[i];
        if (!w) return null;
        let pic = this.seated.get(`${side}/${w}`);
        if (!pic) {
          pic = drawSeatedPlayer(this.opts.look(w), this.opts.kits[side]);
          this.seated.set(`${side}/${w}`, pic);
        }
        return pic;
      });
      b.canvas.paint(paintBench(b.seats, people, this.opts.kits[side]).buf);
    }
    // The yellow card over a man who has reached the bin.
    const binned = cur.players.find((p) => p.side === side && binnedSpot(p, cur));
    const at = binned && binCardSpot(binned, cur);
    if (at) {
      const w = this.world(at);
      b.card.setPosition(Math.round(w.x), Math.round(w.y) - CARD_LIFT).setDepth(w.y + 2).setVisible(true);
    } else b.card.setVisible(false);
  }
}
