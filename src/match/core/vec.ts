// src/match/core/vec.ts — 2-D vector helpers for the live match sim (BAK-207).
// Units are metres on the field. Pure, allocation-light, no Phaser.

export interface Vec {
  x: number;
  y: number;
}

export const vec = (x = 0, y = 0): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Unit vector in the direction of `a`; the zero vector stays zero. */
export function norm(a: Vec): Vec {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

/** `a` shortened to at most `max` long. */
export function clampLen(a: Vec, max: number): Vec {
  const l = len(a);
  return l > max && l > 1e-9 ? scale(a, max / l) : a;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
