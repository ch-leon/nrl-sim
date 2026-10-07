import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import {
  CROWD_FH,
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
      if (crowdPose(r, 'home', 7, calm) >= 2) calmCheers++;
      if (crowdPose(r, 'home', 7, hyped) >= 2) homeCheers++;
      if (crowdPose(r, 'away', 7, hyped) >= 2) awayCheers++;
    }
    expect(calmCheers).toBe(0);
    expect(homeCheers).toBeGreaterThan(250);
    expect(awayCheers).toBe(0);
    expect(crowdPose(0.3, 'home', 5, hyped)).toBe(crowdPose(0.3, 'home', 5, hyped));
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
