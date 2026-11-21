import argparse
import collections
import gzip
import json
import statistics
from pathlib import Path


def read_rows(path):
    path = Path(path)
    text = gzip.decompress(path.read_bytes()).decode() if path.suffix == '.gz' else path.read_text()
    return [json.loads(line) for line in text.splitlines() if line]


def ratio(n, d):
    return f'{n}/{d} ({100 * n / d:.2f}%)' if d else f'{n}/{d}'


def kicking(rows):
    k = collections.Counter()
    full_both_sides = []
    team_both = team_any = team_alt = feature_alt = 0
    for row in rows:
        slots = {s: set() for s in ('home', 'away')}
        for kick in row['kicks']:
            if not kick['ordinary']:
                continue
            k[kick['tackle'], kick['slot']] += 1
            if kick['tackle'] == 5:
                slots[kick['side']].add(kick['slot'])
        both = [side for side, used in slots.items() if {4, 5} <= used]
        feature_kicks = [d for d in row['distributions'] if d['alternate'] and 'kickTick' in d]
        feature_alt += len(feature_kicks)
        team_alt += len(set(both) & {d['side'] for d in feature_kicks})
        team_both += len(both)
        team_any += sum(bool(s) for s in slots.values())
        if len(both) == 2:
            full_both_sides.append(row)
    return k, team_both, team_any, full_both_sides, feature_alt, team_alt


def table_row(name, variant, matches):
    counts, team_both, team_any, both_sides, feature_alt, team_alt = kicking(matches)
    other_slots = ', '.join(f'{tackle}/{slot} × {n}' for (tackle, slot), n in sorted(counts.items()) if (tackle, slot) not in {(4, 4), (4, 5), (5, 4), (5, 5)}) or '0'
    values = [counts[(4, 4)], counts[(4, 5)], counts[(5, 4)], counts[(5, 5)], feature_alt, other_slots, ratio(team_both, 2 * len(matches)), ratio(team_alt, 2 * len(matches)), ratio(team_both, team_any), ratio(len(both_sides), len(matches))]
    print('| ' + ' | '.join(map(str, [name, variant, len(matches), *values])) + ' |')


def show_funnel(rows, threshold):
    print('| Fixture group | Five-eighth at selection | Primary at selection | Evaluated | Committed | Released | Right-target flight | Received | Same-half ordinary kick | Play kick / run / pass after receipt |')
    print('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|')
    for name, matches in [('Full matches', [r for r in rows if r['minutes'] == 5]), ('Late-legs stretch', [r for r in rows if r['minutes'] != 5])]:
        for variant in ('baseline', 'five-eighth option off'):
            ds = [d for r in matches if r['variant'] == variant for d in r['distributions']]
            for subset, target, primary in [('alternate', 'all', 'all'), ('alternate', 'clear', 'pressured'), ('alternate', 'pressured', 'pressured'), ('primary', '—', 'all'), ('primary', '—', 'clear'), ('primary', '—', 'pressured')]:
                def band(space):
                    return 'clear' if space is None or space > threshold else 'pressured'
                matching = [d for d in ds if (d['alternate'] if subset == 'alternate' else d['slot'] == 5 and not d['alternate'])
                            and (target in ('all', '—') or band(d['targetSpace']) == target)
                            and (primary == 'all' or band(d['primarySpace']) == primary)]
                received = [d for d in matching if 'receiptTick' in d]
                endings = collections.Counter(d.get('play') for d in received)
                values = [len(matching), sum(d['committed'] for d in matching), sum('releaseTick' in d for d in matching), sum(d['targetFlight'] for d in matching), len(received), sum('kickTick' in d for d in received), ' / '.join(str(endings[o]) for o in ('kick', 'run', 'pass'))]
                key = f'{name}, {variant}, {subset}'
                print('| ' + ' | '.join(map(str, [key, target, primary, *values])) + ' |')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('observations')
    parser.add_argument('--pressure', type=float, required=True)
    parser.add_argument('--examples', type=Path)
    parser.add_argument('--plan', type=Path)
    args = parser.parse_args()
    rows = read_rows(args.observations)
    variants = sorted({r['variant'] for r in rows})
    if args.plan:
        plan = json.loads(args.plan.read_text())
        start = plan.get('seedStart', 1)
        expected = {(v, s['name'], n, flip) for v in ('baseline', *[row['name'] for row in plan['variants']]) for s in plan['scenarios'] for n in range(start, start + s.get('seeds', plan['seeds'])) for flip in ([False, True] if s.get('bothWays') else [False])}
        actual = {(r['variant'], r['scenario'], r['seed'], r['flip']) for r in rows}
        assert len(actual) == len(rows) and expected == actual, (len(rows), len(actual), expected - actual, actual - expected)
    groups = collections.defaultdict(list)
    for r in rows:
        groups[r['scenario'], r['variant']].append(r)
    print('# Ordinary kicker participation\n')
    print('Actual ordinary in-play kicks are counted at strike. The active Nines format ends the set on the fifth tackle. Fourth is the penultimate tackle. Six preset fixtures pool both orientations. Counts shown here are raw. The standard report uses its own written-orientation metrics and scales the late-legs stretch to five minutes. Slot counts include the existing stand-in role when the regular kicker was sin-binned. The linked-alternate columns trace the feature’s last-tackle selection through the actual five-eighth kick.\n')
    print('| Fixture | Variant | Matches | 4th five-eighth | 4th halfback | 5th five-eighth | 5th halfback | 5th linked alternate | Other tackle/slot | Team-matches using both | Team-matches both with linked alternate | Among teams with any final kick | Matches with both sides using both |')
    print('|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|')
    for variant in variants:
        table_row('All full matches', variant, [r for r in rows if r['variant'] == variant and r['minutes'] == 5])
    for (fixture, variant), matches in groups.items():
        table_row(fixture, variant, matches)
    print('\n## Space at the strike\n')
    print('For ordinary final-tackle kicks in whole matches, this is the projected distance to the nearest eligible non-marker at the boot. It is a separate read from pressure at dummy-half selection. Missing measurements indicate no eligible defender.\n')
    print('| Variant | Slot | Kicks | With defender present | Median projected gap (m) | Within 8 m |')
    print('|---|---:|---:|---:|---:|---:|')
    for variant in variants:
        for slot in (4, 5):
            kicks = [k for r in rows if r['variant'] == variant and r['minutes'] == 5 for k in r['kicks'] if k['ordinary'] and k['tackle'] == 5 and k['slot'] == slot]
            gaps = [k['pressureM'] for k in kicks if k['pressureM'] is not None]
            median = f'{statistics.median(gaps):.1f}' if gaps else '—'
            print(f'| {variant} | {slot} | {len(kicks)} | {len(gaps)} | {median} | {sum(g <= 8 for g in gaps)} |')
    print('\n## Dummy-half distribution\n')
    print(f'The pressure read was at {args.pressure:g} m using the projected eligible non-marker defender. For the halfback the feature requires a closing defender or one already within close range. The distance available to the five-eighth uses the nearest eligible defender, including a stationary defender. “Alternate” records the five-eighth returned by the decision even when the ensuing dart draw leaves him uncommitted. The primary rows also include direct distributions to the slot-5 halfback when the regular option was unavailable earlier. The final columns count actual reception and then ordinary strike by that same player. Play outcomes use the observed kick, run or multiple attacking holders after the dummy-half releases the ball.\n')
    show_funnel(rows, args.pressure)
    baseline = [r for r in rows if r['variant'] == 'baseline' and r['minutes'] == 5]
    _, _, _, examples, _, _ = kicking(baseline)
    if args.examples:
        args.examples.write_text(''.join(json.dumps(r) + '\n' for r in examples))
    if examples:
        print('\n## Whole-match replay examples\n')
        for example in examples[:10]:
            last = [k for k in example['kicks'] if k['ordinary'] and k['tackle'] == 5 and k['slot'] in (4, 5)]
            poses = ', '.join(f"{k['side']} slot {k['slot']} {k['kind']} at tick {k['tick']}" for k in last)
            orient = 'swapped' if example['flip'] else 'written'
            score = example['final']
            print(f"- {example['scenario']}, seed {example['seed']}, {orient}, home {score['home']}–{score['away']} away. {poses}.")


if __name__ == '__main__':
    main()
