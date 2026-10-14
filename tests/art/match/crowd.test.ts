import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import {
  CROWD_BASE,
  CROWD_FH,
  POSE_LIFT,
  cheerShare,
  CROWD_FW,
  buildCrowdAtlas,
  crowdPose,
  crowdShirts,
  drawSpectator,
  shirtForSeat,
  shirtSide,
} from '../../../src/art/match/crowd';
import { drawBall, drawCrossbar, drawShadow, drawUpright, UPRIGHT_H } from '../../../src/art/match/props';
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
    const cheer = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 2))!;
    expect(cheer.y0).toBeLessThan(sit.y0);
  });

  it('atlas holds every frame with unique names', () => {
    const { buf, frames } = buildCrowdAtlas(crowdShirts(home, away));
    expect(new Set(frames.map((f) => f.name)).size).toBe(frames.length);
    expect(frames.every((f) => f.w === CROWD_FW && f.h === CROWD_FH)).toBe(true);
    expect(buf.w * buf.h).toBe(frames.length * CROWD_FW * CROWD_FH);
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

  it('jump lifts 2px and the wave pose raises one arm above a seated head', () => {
    expect(POSE_LIFT[3]).toBe(2);
    const sit = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 0))!;
    const jump = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 3))!;
    const cheer = opaqueBounds(drawSpectator(home.jersey, 0, 'front', 2))!;
    const wave = opaqueBounds(drawSpectator(home.jersey, 0, 'back', 4))!;
    expect(jump.y0).toBe(cheer.y0 - 2);
    expect(jump.y0).toBeGreaterThanOrEqual(0); // headroom: the jump never clips
    expect(wave.y0).toBeLessThan(sit.y0);
    // Feet on CROWD_BASE for a seated fan (outline one row below).
    expect(sit.y1).toBe(CROWD_BASE + 1);
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
});

describe('pixel font', () => {
  it('measures and draws', () => {
    expect(textWidth('PIES')).toBe(15);
    let lit = 0;
    drawText('NRL SIM', () => lit++);
    expect(lit).toBeGreaterThan(40);
  });
});
