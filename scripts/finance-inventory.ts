// Static opening-roster audit, not a match or season simulator (#556).
// npx vite-node scripts/finance-inventory.ts -- --seeds 20 --out report.json
import { writeFileSync } from 'node:fs';
import { activePack, preparePack, selectPack } from '../src/content';
import { AU_CAREER_PROFILE } from '../src/content/career/au';
import { UK_CAREER_PROFILE } from '../src/content/career/uk';
import { createDivisionWorld } from '../src/data/divisions';
import { annualSalaryQuote, FINANCE_RULES_VERSION, FINANCE_TIERS, openingSalaryOffers, type FinanceTier } from '../src/data/financeRules';
import { overallRating, shownStats } from '../src/data/player';

const args = process.argv.slice(2);
const value = (key: string): string | undefined => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const seeds = Number(value('--seeds') ?? 20);
if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 1_000) throw new Error('--seeds must be 1..1000');
const rows: Array<{ pack: string; difficulty: string; tier: FinanceTier; bills: number[]; playerBills: number[] }> = [];
const tiers: FinanceTier[] = ['local', 'championship', 'premier'];
const overCapCases: Array<{ pack: string; difficulty: string; seed: number; clubId: string; tier: FinanceTier; marketBill: number; offeredBill: number | null }> = [];
for (const [pack, profile] of [['au', AU_CAREER_PROFILE], ['uk', UK_CAREER_PROFILE]] as const) {
  await preparePack(pack); selectPack(pack);
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const buckets = tiers.map(tier => ({ pack, difficulty, tier, bills: [] as number[], playerBills: [] as number[] }));
    for (let seed = 1; seed <= seeds; seed++) {
      const world = createDivisionWorld(profile, activePack(), seed, { name: 'Finance inventory', colors: ['#112233', '#445566'], difficulty });
      for (const division of world.divisions) {
        const instance = world.instances.find(i => i.id === division.instanceId)!;
        const bucket = buckets[division.rank]!;
        for (const id of instance.entrantIds) {
          const squad = id === 'player' ? world.squad : world.clubs.find(c => c.id === id)!.squad!;
          const demands = squad.map(p => {
            const rating = overallRating(p);
            const ceiling = shownStats(p.position).reduce((s, key) => s + (p.ceilings?.[key] ?? p.stats[key]), 0) / 4;
            return annualSalaryQuote(rating, p.age, Math.max(0, ceiling - rating));
          });
          const bill = demands.reduce((a, b) => a + b, 0);
          const offers = openingSalaryOffers(demands, FINANCE_TIERS[bucket.tier].annualCap);
          if (bill > FINANCE_TIERS[bucket.tier].annualCap) overCapCases.push({ pack, difficulty, seed, clubId: id, tier: bucket.tier,
            marketBill: bill, offeredBill: offers ? offers.reduce((a, b) => a + b, 0) : null });
          bucket.bills.push(bill); if (id === 'player') bucket.playerBills.push(bill);
        }
      }
    }
    rows.push(...buckets);
  }
}
const summary = rows.map(row => {
  const sorted = row.bills.slice().sort((a, b) => a - b);
  const cap = FINANCE_TIERS[row.tier].annualCap;
  return { pack: row.pack, difficulty: row.difficulty, tier: row.tier, cap, clubs: sorted.length,
    min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1],
    overCap: sorted.filter(n => n > cap).length,
    player: row.playerBills.length ? { min: Math.min(...row.playerBills), max: Math.max(...row.playerBills), overCap: row.playerBills.filter(n => n > cap).length } : null };
});
const report = { rulesVersion: FINANCE_RULES_VERSION, worldSource: '8b5e34a', seedRange: [1, seeds],
  worlds: seeds * 6, clubBills: seeds * 6 * 24, summary, overCapCases,
  limitation: 'Static unmodified opening rosters quoted at market demand. No games, growth, transfers, purchases or season balance. Over-cap results are admission constraints for #557, not legal created finance careers.' };
const json = JSON.stringify(report, null, 2) + '\n';
const out = value('--out'); if (out) writeFileSync(out, json); else process.stdout.write(json);
console.log(`${report.worlds} opening worlds; ${report.clubBills} club bills; ${summary.reduce((s, r) => s + r.overCap, 0)} over-cap market quotes`);
