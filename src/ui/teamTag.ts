// src/ui/teamTag.ts — each side's tag, so home and away read apart without their
// colours (#371): the score bug's code beside its stripe, the stats' column heads,
// the momentum line's leaning end and, with Team letters on, the letter over each
// player. Pure (tests/ui/teamTag.test.ts).

/**
 * Three letters for a club (3m): the initials of a three-word name ("Live Test FC" → LTF),
 * else the first three letters ("Launceston Larrikins" → LAU).
 */
export function teamTag(name: string): string {
  const words = nameWords(name);
  if (words.length === 0) return '—';
  if (words.length >= 3) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  return words[0]!.slice(0, 3).toUpperCase();
}

/**
 * Both sides' tags, never the same. Two that read the same ("Brisbane …" v "Brisbane …")
 * take the first letter and the nickname's first two (BBE, BLA); if those still collide,
 * the away side walks along its nickname for a letter the home tag lacks, and two clubs
 * of the same name end up as XXX and XX2.
 */
export function teamTags(home: string, away: string): [string, string] {
  const a = teamTag(home);
  const b = teamTag(away);
  if (a !== b) return [a, b];
  const alt = (name: string): string => {
    const words = nameWords(name);
    const last = words[words.length - 1] ?? '';
    return words.length > 1 ? `${words[0]![0] ?? ''}${last.slice(0, 2)}`.toUpperCase() : teamTag(name);
  };
  const h = alt(home);
  const w = alt(away);
  if (h !== w) return [h, w];
  const words = nameWords(away);
  const letters = words.join('').toUpperCase();
  for (const c of letters.slice(2)) {
    const t = `${w.slice(0, 2)}${c}`;
    if (t !== h) return [h, t];
  }
  return [h, `${h.slice(0, 2)}2`];
}

/** The letter over each side's players (Team letters on): their tags' first letters, or H and A when those are the same. */
export function teamLetters(tags: readonly [string, string]): [string, string] {
  const h = tags[0][0] ?? 'H';
  const a = tags[1][0] ?? 'A';
  return h === a ? ['H', 'A'] : [h, a];
}

/** A name's words, punctuation dropped. */
function nameWords(name: string): string[] {
  return name.trim().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
}
