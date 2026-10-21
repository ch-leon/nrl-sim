// src/ui/guide/zonePicture.ts — the Guide's picture of the bonus zone (#77): one
// end of the field from above, the in-goal between the posts drawn the way the
// pitch art paints it (a lighter band with a dashed edge), with the points a try
// is worth either side. Built from NINES_FACTS (kept equal to the rule constants
// by tests/ui/guide.test.ts), so it moves when the rules do. A static SVG string;
// no Phaser, no match code.

import { NINES_FACTS } from './nines';

/** Picture px per metre. */
const PX = 7;
/** Metres either side of the posts shown, and of field in front of the try line. */
const HALF_W = 20;
const FIELD_M = 5;
const PAD = 8;
/** Room on the right for the line labels. */
const LABEL_W = 96;

const IN_GOAL = '#4b9a44';
const GRASS = '#5fb24a';
const ZONE = '#7fb867';
const LINE = '#f3f5ec';
const INK = '#10101c';

/** The picture's geometry, px: the zone's rectangle, the try line and the dead-ball line (tests read it). */
export function zonePictureGeometry(): { zone: { x: number; y: number; w: number; h: number }; tryLineY: number; deadBallY: number; width: number; height: number } {
  const w = 2 * HALF_W * PX;
  const deadBallY = PAD;
  const tryLineY = PAD + NINES_FACTS.inGoalM * PX;
  const zoneW = NINES_FACTS.postGapM * PX;
  return {
    zone: { x: PAD + w / 2 - zoneW / 2, y: deadBallY, w: zoneW, h: tryLineY - deadBallY },
    tryLineY,
    deadBallY,
    width: PAD + w + LABEL_W,
    height: tryLineY + FIELD_M * PX + PAD,
  };
}

/** The SVG markup. */
export function bonusZoneSvg(): string {
  const g = zonePictureGeometry();
  const left = PAD;
  const right = PAD + 2 * HALF_W * PX;
  const fieldBottom = g.tryLineY + FIELD_M * PX;
  const z = g.zone;
  const mid = z.y + z.h / 2;
  const text = (x: number, y: number, s: string, size: number, anchor = 'middle', fill = LINE): string =>
    `<text x="${x}" y="${y}" font-family="'Courier New', monospace" font-weight="bold" font-size="${size}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}">${s}</text>`;
  const post = (x: number): string => `<circle cx="${x}" cy="${g.tryLineY}" r="3" fill="${LINE}" stroke="${INK}" stroke-width="1"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" width="${g.width}" height="${g.height}" style="max-width:100%;max-height:32vh;height:auto;display:block" role="img" aria-label="The bonus zone: the in-goal between the posts. A try grounded in it is ${NINES_FACTS.bonusTryPoints} points, anywhere else over the line ${NINES_FACTS.tryPoints}.">`,
    `<rect x="${left}" y="${g.deadBallY}" width="${right - left}" height="${g.tryLineY - g.deadBallY}" fill="${IN_GOAL}"/>`,
    `<rect x="${left}" y="${g.tryLineY}" width="${right - left}" height="${fieldBottom - g.tryLineY}" fill="${GRASS}"/>`,
    `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${ZONE}"/>`,
    // The dashed edge on its three open sides; the try line closes it.
    `<path d="M ${z.x} ${g.tryLineY} V ${z.y} H ${z.x + z.w} V ${g.tryLineY}" fill="none" stroke="${LINE}" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>`,
    `<line x1="${left}" y1="${g.deadBallY}" x2="${right}" y2="${g.deadBallY}" stroke="${LINE}" stroke-width="2"/>`,
    `<line x1="${left}" y1="${g.tryLineY}" x2="${right}" y2="${g.tryLineY}" stroke="${LINE}" stroke-width="2"/>`,
    post(z.x),
    post(z.x + z.w),
    text(z.x + z.w / 2, mid, String(NINES_FACTS.bonusTryPoints), 20, 'middle', INK),
    text((left + z.x) / 2, mid, String(NINES_FACTS.tryPoints), 16),
    text((z.x + z.w + right) / 2, mid, String(NINES_FACTS.tryPoints), 16),
    text(right + 6, g.deadBallY + 5, 'Dead ball', 11, 'start', INK),
    text(right + 6, mid, 'Bonus zone', 11, 'start', INK),
    text(right + 6, g.tryLineY, 'Try line', 11, 'start', INK),
    text(right + 6, g.tryLineY + (FIELD_M * PX) / 2, 'Field', 11, 'start', INK),
    `</svg>`,
  ].join('');
}
