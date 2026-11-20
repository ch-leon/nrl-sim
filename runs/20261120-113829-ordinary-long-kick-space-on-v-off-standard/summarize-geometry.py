#!/usr/bin/env python3
"""Summarize official harness telemetry, with clustered intervals for on − off."""
from collections import Counter, defaultdict
from pathlib import Path
import json
import random
import sys


METRICS = {
    'Launch X': ('launchX',),
    'Launch Y': ('launchY',),
    'First landing X': ('landing', 'x'),
    'First landing Y': ('landing', 'y'),
    'Forward distance': ('forwardM',),
    'First landing distance from centre': ('landing', 'centreOffsetM'),
    'Nearest receiving back to target at launch': ('receivingBackAtLaunchM',),
    'Nearest receiving back to first landing': ('landing', 'receivingBackM'),
    'Nearest eligible receiver to first landing': ('landing', 'receivingAnyM'),
    'Nearest eligible chaser to first landing': ('landing', 'chasingM'),
    'Chaser distance less receiver distance': ('landing', 'chaseMinusReceiveM'),
}
ON, OFF = 'baseline', 'open-side target off'
EVEN, CHASE = 'even 60 v 60', 'kick-chase v balanced'


def field(kick, path):
    v = kick
    for key in path:
        if v is None:
            return None
        v = v[key]
    return v


def sample_matches(rows):
    for variant in (ON, OFF):
        for scenario, seeds, orientations in ((EVEN, 20, [False]), (CHASE, 40, [False, True])):
            actual = [(r['seed'], r['flip']) for r in rows if r['variant'] == variant and r['scenario'] == scenario]
            expected = [(seed, flip) for seed in range(1, seeds + 1) for flip in orientations]
            if sorted(actual) != expected:
                raise ValueError(f'Seed/orientation coverage differs for {variant} and {scenario}')


def data_for(rows, scenario, style):
    data = {ON: defaultdict(list), OFF: defaultdict(list)}
    for row in rows:
        if row['scenario'] != scenario:
            continue
        data[row['variant']][row['seed']].extend(
            kick for kick in row['observations'] if style is None or kick['attack'] == style
        )
    return data


def interval(data, path):
    pair = []
    for variant in (ON, OFF):
        per_seed = []
        for _, kicks in sorted(data[variant].items()):
            vals = [value for kick in kicks if (value := field(kick, path)) is not None]
            per_seed.append((sum(vals), len(vals)))
        pair.append(per_seed)
    def mean(points):
        total = sum(n for _, n in points)
        return (sum(v for v, _ in points) / total if total else None), total
    on, on_n = mean(pair[0])
    off, off_n = mean(pair[1])
    rng = random.Random(650)
    n_seed = len(pair[0])
    d = []
    for _ in range(4_000):
        sample = [rng.randrange(n_seed) for _ in range(n_seed)]
        a, b = (mean([group[i] for i in sample])[0] for group in pair)
        if a is not None and b is not None:
            d.append(a - b)
    d.sort()
    if len(d) < 3_800 or on is None or off is None:
        raise ValueError(f'Insufficient finite bootstrap evidence for {path}')
    return off, on, on - off, d[int(0.025 * len(d))], d[int(0.975 * len(d))], off_n, on_n


def main(path):
    rows = [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    sample_matches(rows)
    for row in rows:
        for kick in row['observations']:
            if kick['landing'] is not None:
                kick['landing']['centreOffsetM'] = kick['centreOffsetM']
    print('## Ordinary in-play long kicks\n')
    print('Kick-level means in metres and 95% paired seed-cluster bootstrap intervals for the change. The bootstrap draws the same seeds in both variants and keeps both orientations of a seed together. Match paths can diverge after the first changed kick. Individual kicks are not paired. Positions use the kicking side’s own try line as X = 0. Y uses a fixed touchline as Y = 0. The lateral centre is at Y = 34 m. The nearest receiving back is one of the fullback (or stand-in), wingers or centre. A chaser or receiver is eligible if on the field and free at the observation tick. Positive chaser minus receiver distance means the receiver is nearer.\n')
    print('| Fixture | Variant | Matches | Ordinary launches | Reached first landing | Excluded launches tracked |')
    print('|---|---|---:|---:|---:|---|')
    for scenario in (EVEN, CHASE):
        for variant in (OFF, ON):
            sub = [r for r in rows if r['scenario'] == scenario and r['variant'] == variant]
            kicks = [k for r in sub for k in r['observations']]
            excluded = Counter()
            for row in sub:
                excluded.update(row['excluded'])
            excluded_text = ', '.join(f'{name} {count}' for name, count in sorted(excluded.items()))
            print(f'| {scenario} | {variant} | {len(sub)} | {len(kicks)} | {sum(k["landing"] is not None for k in kicks)} | {excluded_text} |')
    print()
    groups = ((EVEN, None, 'Even Balanced v Balanced'), (CHASE, 'kick-chase', 'Kick-chase in Kick-chase v Balanced'), (CHASE, 'balanced', 'Balanced in Kick-chase v Balanced'))
    for scenario, style, heading in groups:
        data = data_for(rows, scenario, style)
        print(f'### {heading}\n')
        print('| Metric (m) | Off (n) | Default (n) | Default − off [95% interval] |')
        print('|---|---:|---:|---:|')
        for label, metric in METRICS.items():
            off, on, diff, low, high, off_n, on_n = interval(data, metric)
            print(f'| {label} | {off:.2f} ({off_n}) | {on:.2f} ({on_n}) | {diff:+.2f} [{low:+.2f}, {high:+.2f}] |')
        print()
        for variant in (OFF, ON):
            counts = Counter(
                k['landing']['outcome'] if k['landing'] is not None else 'unlanded'
                for ks in data[variant].values() for k in ks
            )
            print(f'- {variant[0].upper() + variant[1:]} first contacts ' + ', '.join(f'{name} {count}' for name, count in sorted(counts.items())) + '.')
        print()


    print('### Available paired score check\n')
    data = {ON: defaultdict(list), OFF: defaultdict(list)}
    for row in rows:
        if row['scenario'] != CHASE:
            continue
        side, other = ('away', 'home') if row['flip'] else ('home', 'away')
        diff = row['points'][side] - row['points'][other]
        data[row['variant']][row['seed']].append({'share': 1 if diff > 0 else 0.5 if diff == 0 else 0})
    off, on, diff, low, high, off_n, on_n = interval(data, ('share',))
    print(f'The geometry records also contain per-match scores for {off_n} disabled and {on_n} default Kick-chase v Balanced matches. This subset comprises the first 40 standard seeds, both orientations. Its points share moves from {100*off:.3f}% to {100*on:.3f}%, a change of {100*diff:+.3f} pp [95% paired seed-cluster interval {100*low:+.2f}, {100*high:+.2f}] pp. The standard results provide an aggregate estimate for all 100 seeds in each orientation. Rush was outside the geometry sample, so Rush has no observed paired inference.\n')


if __name__ == '__main__':
    main(sys.argv[1])
