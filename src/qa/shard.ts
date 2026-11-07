/** Partition existing soak cases without changing their inputs or order within a shard. */
export function shardCases<T>(cases: readonly T[], shard?: string): T[] {
  if (shard === undefined) return [...cases];
  const match = /^(\d+)\/(\d+)$/.exec(shard);
  const part = Number(match?.[1]), total = Number(match?.[2]);
  if (!Number.isSafeInteger(part) || !Number.isSafeInteger(total) || part < 1 || total < 1 || part > total || total > cases.length) {
    throw new Error('--shard must be i/n with 1 ≤ i ≤ n ≤ the number of soak cases');
  }
  return cases.filter((_, i) => i % total === part - 1);
}
