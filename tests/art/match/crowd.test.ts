import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import {
  CROWD_BASE,
  CROWD_FH,
  CROWD_FRAMES,
  CROWD_LOOKS,
  FLAG_FRAMES,
  POSE_FRAME,
  POSE_LIFT,
  WAVE_BAND,
  drawFlag,
  cheerShare,
  CROWD_FW,
  buildCrowdAtlas,
  crowdPose,
  crowdShirts,
  drawSpectator,
  shirtForSeat,
  shirtSide,
} from '../../../src/art/match/crowd';
import { drawPrototypePlayer, appearanceFor } from '../../../src/art/prototype/player';
import { drawHead } from '../../../src/art/prototype/head';
import { crowdSeats } from '../../../src/art/match/stadium';
import { drawBall, drawCrossbar, drawPlayerShadow, drawShadow, drawUpright, LIGHT_DX, LIGHT_DY, SHADOW_LENGTH, UPRIGHT_H } from '../../../src/art/match/props';
import { POST_H } from '../../../src/art/match/stadium';
import { opaqueBounds } from '../../../src/art/match/players';
import { drawText, textWidth } from '../../../src/art/match/font';

const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'player');
const away = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');

describe('crowd', () => {
  it('shirts include both teams’ jersey and trim colours', () => {
    const s = crowdShirts(home, away);
    expect(s.slice(0, 4)).toEqual([home.jersey, home.trim, away.jersey, away.trim]);
    expect(shirtSide(0)).toBe('home');
    expect(shirtSide(3)).toBe('away');
    expect(shirtSide(5)).toBeNull();
  });

  it('cheer poses are taller (arms up) than seated ones', () => {
    const sit = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 0))!;
    const cheer = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 1))!;
    expect(cheer.y0).toBeLessThan(sit.y0);
  });

  it('atlas holds every frame with unique names, and stays small', () => {
    const { buf, frames } = buildCrowdAtlas(crowdShirts(home, away));
    expect(new Set(frames.map((f) => f.name)).size).toBe(frames.length);
    const fans = frames.filter((f) => !f.name.startsWith('flag-'));
    expect(fans.every((f) => f.w === CROWD_FW && f.h === CROWD_FH)).toBe(true);
    expect(fans.length).toBe(8 * 2 * CROWD_LOOKS * CROWD_FRAMES.length);
    expect(frames.filter((f) => f.name.startsWith('flag-')).length).toBe(FLAG_FRAMES.length);
    // Near a 512² texture's worth of pixels: one idle slice to upload on a phone (N10.5).
    expect(buf.w * buf.h).toBeLessThan(512 * 512 * 1.05);
    expect(buf.w).toBeLessThanOrEqual(1024);
  });

  it('bays bias shirt colours toward their team', () => {
    let homeInHome = 0;
    let awayInAway = 0;
    for (let i = 0; i < 400; i++) {
      const r = i / 400;
      if (shirtSide(shirtForSeat({ r, bay: 'home' })) === 'home') homeInHome++;
      if (shirtSide(shirtForSeat({ r, bay: 'away' })) === 'away') awayInAway++;
    }
    expect(homeInHome / 400).toBeGreaterThan(0.6);
    expect(awayInAway / 400).toBeGreaterThan(0.6);
  });

  it('calm crowds mostly sit; hyped fans of the scoring side cheer, others do not', () => {
    const calm = { home: 0, away: 0 };
    const hyped = { home: 1, away: 0 };
    let calmCheers = 0;
    let homeCheers = 0;
    let awayCheers = 0;
    for (let i = 0; i < 300; i++) {
      const r = (i + 0.5) / 300;
      // Calm fans may give a rare one-arm wave (4) but never stand/jump (2, 3);
      // hyped fans are on their feet in any of the celebration poses (2..4).
      const cheering = (p: number): boolean => p === 2 || p === 3;
      if (cheering(crowdPose(r, 'home', 7, calm))) calmCheers++;
      if (crowdPose(r, 'home', 7, hyped) >= 2) homeCheers++;
      if (cheering(crowdPose(r, 'away', 7, hyped))) awayCheers++;
    }
    expect(calmCheers).toBe(0);
    expect(homeCheers).toBeGreaterThan(250);
    expect(awayCheers).toBe(0);
    expect(crowdPose(0.3, 'home', 5, hyped)).toBe(crowdPose(0.3, 'home', 5, hyped));
  });
});

describe('crowd liveliness (GitHub #16)', () => {
  const seatsR = Array.from({ length: 400 }, (_, i) => (i + 0.5) / 400);
  const calm = { home: 0, away: 0 };

  it('a jump and standing lift the fan, a groan slumps him; the wave pose raises one arm above a seated head', () => {
    expect(POSE_LIFT[3]).toBeGreaterThan(POSE_LIFT[2]);
    expect(POSE_LIFT[7]).toBeGreaterThan(0);
    expect(POSE_LIFT[5]).toBeLessThan(0);
    const sit = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 0))!;
    const cheer = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 1))!;
    const wave = opaqueBounds(drawSpectator(home.jersey, 0, 'back', 2))!;
    expect(cheer.y0).toBeGreaterThanOrEqual(0); // headroom: the arms never clip
    expect(wave.y0).toBeLessThan(sit.y0);
    // The waist on CROWD_BASE, the frame's last row (the row in front hides it).
    expect(sit.y1).toBe(CROWD_BASE);
  });

  it('an idle crowd keeps moving: every tick some fans shift, but nobody cheers', () => {
    for (let tick = 0; tick < 12; tick++) {
      const poses = seatsR.map((r) => crowdPose(r, 'home', tick, calm));
      const moving = poses.filter((p) => p !== 0).length;
      expect(moving).toBeGreaterThan(400 * 0.04);
      expect(moving).toBeLessThan(400 * 0.25);
      expect(poses.some((p) => p === 2 || p === 3)).toBe(false);
    }
    // ...and different fans move on different ticks.
    const a = seatsR.map((r) => crowdPose(r, 'home', 0, calm));
    const b = seatsR.map((r) => crowdPose(r, 'home', 6, calm));
    expect(a.some((p, i) => p !== b[i])).toBe(true);
  });

  it('a big hit visibly stands about half the bay; a try stands nearly all of it', () => {
    expect(cheerShare(0)).toBe(0);
    expect(cheerShare(0.3)).toBeGreaterThan(0.4);
    expect(cheerShare(0.95)).toBe(1);
    const standing = (hype: number): number =>
      seatsR.filter((r) => crowdPose(r, 'away', 4, { home: 0, away: hype }) !== 0 && crowdPose(r, 'away', 4, { home: 0, away: hype }) !== 1).length / seatsR.length;
    expect(standing(0.3)).toBeGreaterThan(0.35);
    expect(standing(0.95)).toBeGreaterThan(0.95);
  });

  it('try celebrations cycle jump / arms-up / wave, staggered across the bay', () => {
    const hyped = { home: 1, away: 0 };
    const r = 0.4242;
    const cycle = [0, 1, 2].map((t) => crowdPose(r, 'home', t, hyped));
    expect(new Set(cycle)).toEqual(new Set([2, 3, 4]));
    const atTick = seatsR.map((s) => crowdPose(s, 'home', 9, hyped));
    expect(new Set(atTick).size).toBe(3);
  });

  it('who stands is stable per seat as hype decays (no random flicker)', () => {
    let flips = 0;
    for (const r of seatsR) {
      const up = (t: number) => crowdPose(r, 'home', t, { home: 0.4, away: 0 }) >= 2;
      if (up(10) !== up(11)) flips++;
    }
    expect(flips / seatsR.length).toBeLessThan(0.15);
  });
});

describe('crowd scale and reactions (#641)', () => {
  const seatsR = Array.from({ length: 400 }, (_, i) => (i + 0.5) / 400);
  const calm = { home: 0, away: 0 };

  it("a fan's head is close to a player's head in size", () => {
    // The fan's head: the widest run of his face rows that is not outline.
    const fan = drawSpectator(home.jersey, 0, 'front', 0);
    let fanHead = 0;
    for (let y = 6; y < 13; y++) {
      let n = 0;
      for (let x = 0; x < fan.w; x++) if (fan.get(x, y).alpha && fan.get(x, y).color !== 0x1c1424) n++;
      fanHead = Math.max(fanHead, n);
    }
    const head = opaqueBounds(drawHead(appearanceFor('scale-test'), home, 'front'))!;
    const playerHead = head.x1 - head.x0 - 1; // less its outline
    expect(fanHead / playerHead).toBeGreaterThan(0.7);
    expect(fanHead / playerHead).toBeLessThanOrEqual(1);
    // ...on a figure still shorter than a player (waist-up).
    const f = opaqueBounds(fan)!;
    const p = opaqueBounds(drawPrototypePlayer(appearanceFor('scale-test'), home, 'idle', 0))!;
    expect(f.y1 - f.y0).toBeLessThan(p.y1 - p.y0);
  });

  it('a try against a side and a missed kick at goal put its fans’ hands on their heads, not in the air', () => {
    const groaning = { home: 0, away: 0, groan: { home: 0.9, away: 0 } };
    const poses = seatsR.map((r) => crowdPose(r, 'home', 5, groaning));
    expect(poses.filter((p) => p === 5).length / poses.length).toBeGreaterThan(0.85);
    expect(seatsR.some((r) => crowdPose(r, 'away', 5, groaning) === 5)).toBe(false);
    // The groan keeps the arms on the head, no higher than a seated head; a cheer's go above it.
    const groan = opaqueBounds(drawSpectator(home.jersey, 0, 'front', POSE_FRAME[5]))!;
    const sit = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 0))!;
    const cheer = opaqueBounds(drawSpectator(home.jersey, 0, 'front', POSE_FRAME[3]))!;
    expect(groan.y0).toBeGreaterThanOrEqual(sit.y0);
    expect(cheer.y0).toBeLessThan(sit.y0);
    expect(POSE_FRAME[5]).not.toBe(POSE_FRAME[3]);
  });

  it('heads go up for a high ball, and the ground rises at the whistles', () => {
    const up = seatsR.map((r) => crowdPose(r, null, 3, { ...calm, up: 1 }));
    expect(up.filter((p) => p === 6).length / up.length).toBeGreaterThan(0.8);
    const rise = seatsR.map((r) => crowdPose(r, 'away', 3, { ...calm, rise: 1 }));
    expect(rise.filter((p) => POSE_LIFT[p] > 0).length / rise.length).toBeGreaterThan(0.95);
  });

  it('a Mexican wave stands the fans its front passes and no one else', () => {
    const mood = { ...calm, wave: 0.5 };
    expect(crowdPose(0.3, null, 1, mood, 0.5)).toBe(3);
    expect(POSE_LIFT[crowdPose(0.3, null, 1, mood, 0.5 + WAVE_BAND * 1.5)]).toBeGreaterThan(0);
    expect([0, 1, 4]).toContain(crowdPose(0.3, null, 1, mood, 0.9));
  });

  it('the home flags fly when waved and hang furled otherwise', () => {
    const furled = opaqueBounds(drawFlag(home.jersey, home.trim, 0))!;
    const flying = opaqueBounds(drawFlag(home.jersey, home.trim, 2))!;
    expect(flying.x1 - flying.x0).toBeGreaterThan(furled.x1 - furled.x0 + 20);
  });

  it('the near terraces read as full: few empty places, shoulder to shoulder; six flags in the home end', () => {
    const seats = crowdSeats();
    expect(seats.filter((s) => s.layer === 'front').length).toBeGreaterThan(330);
    expect(seats.filter((s) => s.flag).length).toBe(6);
    expect(seats.filter((s) => s.flag).every((s) => s.bay === 'home')).toBe(true);
    expect(seats.filter((s) => s.layer === 'back').every((s) => s.along !== undefined && s.along >= 0 && s.along <= 1)).toBe(true);
  });
});

describe('props', () => {
  it('goalpost upright is tall, padded and outlined', () => {
    const u = drawUpright(home);
    expect(u.h).toBe(UPRIGHT_H);
    expect(UPRIGHT_H).toBeGreaterThan(POST_H);
    const b = opaqueBounds(u)!;
    expect(b.y1 - b.y0).toBeGreaterThanOrEqual(POST_H);
  });

  it('crossbar, ball and shadow render', () => {
    expect(drawCrossbar().opaqueCount()).toBeGreaterThan(50);
    expect(drawBall().opaqueCount()).toBeGreaterThan(20);
    const s = drawShadow(12, 5, 0.3);
    expect(s.opaqueCount()).toBeGreaterThan(30);
    expect(s.get(6, 2).alpha).toBeLessThan(255);
  });

  it('a player’s shadow falls where the posts’ do, longer at dusk and night than by day, centred on the feet', () => {
    // The slope of the light is the post's: 2.6 tiles along +gx for 84 px.
    expect(LIGHT_DY / LIGHT_DX).toBeCloseTo(0.5);
    expect(SHADOW_LENGTH.dusk).toBeGreaterThan(SHADOW_LENGTH.day);
    expect(SHADOW_LENGTH.night).toBeGreaterThan(SHADOW_LENGTH.day);
    const reach = (l: 'day' | 'dusk' | 'night'): number => {
      const b = drawPlayerShadow(l);
      let right = 0;
      let left = 0;
      let below = 0;
      let above = 0;
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          if (b.get(x, y).alpha === 0) continue;
          right = Math.max(right, x + 1 - b.w / 2);
          left = Math.max(left, b.w / 2 - x);
          below = Math.max(below, y + 1 - b.h / 2);
          above = Math.max(above, b.h / 2 - y);
        }
      }
      // Down and to the right of the feet (the buffer's centre), with a foot's width behind them.
      expect(right).toBeGreaterThan(left);
      expect(below).toBeGreaterThan(above);
      return right;
    };
    expect(reach('dusk')).toBeGreaterThan(reach('day'));
    expect(reach('night')).toBeGreaterThan(reach('day'));
  });
});

describe('pixel font', () => {
  it('measures and draws', () => {
    expect(textWidth('PIES')).toBe(15);
    let lit = 0;
    drawText('NRL SIM', () => lit++);
    expect(lit).toBeGreaterThan(40);
  });
});
