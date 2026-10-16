// src/match/core/flag.ts — Flag codes (BAK-207 §4): a short string that pins
// an exact moment of a deterministic sim — seed, tick, the two teams and a
// note — so a tester can paste it into chat and the same frame is rebuilt.
//
//   nrl1:<seed>:<tick>:<home>~<away>:<note-base64url>
export interface Flag {
  seed: number;
  tick: number;
  home: string;
  away: string;
  note: string;
}

const PREFIX = 'nrl1';

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFlag(f: Flag): string {
  const team = (t: string): string => t.replace(/[:~\s]/g, '-');
  return `${PREFIX}:${Math.floor(f.seed)}:${Math.max(0, Math.floor(f.tick))}:${team(f.home)}~${team(f.away)}:${b64url(f.note)}`;
}

/** Parse a Flag code; null when it isn't one. Surrounding whitespace is ignored. */
export function decodeFlag(code: string): Flag | null {
  const parts = code.trim().split(':');
  if (parts.length < 4 || parts.length > 5 || parts[0] !== PREFIX) return null;
  const seed = Number(parts[1]);
  const tick = Number(parts[2]);
  const teams = (parts[3] ?? '').split('~');
  if (!Number.isInteger(seed) || !Number.isInteger(tick) || tick < 0 || teams.length !== 2) return null;
  const [home, away] = teams as [string, string];
  if (!home || !away) return null;
  let note = '';
  if (parts[4]) {
    try {
      note = unb64url(parts[4]);
    } catch {
      return null;
    }
  }
  return { seed, tick, home, away, note };
}
