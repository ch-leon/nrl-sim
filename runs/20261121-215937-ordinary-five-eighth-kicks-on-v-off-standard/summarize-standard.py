import argparse
import json
import math
from pathlib import Path

BANDS = {
    'tackles': (117, 163), 'lineBreaks': (10, 19), 'offloads': (6, 11),
    'errors': (8, 12), 'kicks': (16, 25), 'tries': (4, 7), 'completion': (70, 80),
    'grubberTries': (.2, .3), 'grubberRepeats': (.05, .3), 'grubberDropouts': (0, .15),
}
PLAY_TYPES = ('kick', 'run', 'pass')


def by_key(path):
    return {(r['scenario'], r['variant']): r for f in sorted(path.glob('results*.jsonl')) for r in map(json.loads, f.read_text().splitlines())}


def normalize(row):
    return {k: v for k, v in row.items() if k not in ('variant', 'tuning', 'ms')}


def diff(left, right):
    return [k for k in sorted(set(left) | set(right)) if left.get(k) != right.get(k)]


def pair(before, after, decimals=2):
    changed = abs(after['mean'] - before['mean'])
    se = math.hypot(after['se'], before['se'])
    star = '*' if 0 < 2 * se < changed else ''
    return f"{before['mean']:.{decimals}f} → {after['mean']:.{decimals}f}{star}"


def mark(value, band):
    lo, hi = band
    return 'below' if value < lo else 'above' if value > hi else 'inside'


def share(row, kind):
    counts = row['watch']['lastTackles']
    total = sum(counts[k]['mean'] for k in PLAY_TYPES)
    n = total * row['seeds'] * row['minutes'] / 5
    p = counts[kind]['mean'] / total if total else 0
    return dict(mean=100 * p, se=100 * math.sqrt(p * (1 - p) / n) if n else 0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('run', type=Path)
    parser.add_argument('observer_run', type=Path)
    parser.add_argument('--stock-only', action='store_true')
    parser.add_argument('wing_reference', type=Path)
    args = parser.parse_args()
    plan = json.loads((args.run / 'plan.json').read_text())
    results = by_key(args.run)
    observer = by_key(args.observer_run)
    reference = by_key(args.wing_reference)
    variants = ('baseline', 'five-eighth option off')
    assert len(results) == len(plan['scenarios']) * len(variants) == 26
    if not args.stock_only:
        assert len(observer) == len(results)
    fixtures = [s['name'] for s in plan['scenarios']]
    off_rows = {n: results[n, variants[1]] for n in fixtures}
    on_rows = {n: results[n, variants[0]] for n in fixtures}
    lossless = {n: diff(normalize(reference[n, 'baseline']), normalize(off_rows[n])) for n in fixtures}
    observer_diffs = {k: diff(normalize(results[k]), normalize(observer[k])) for k in results if k in observer}
    assert all(not ks for ks in observer_diffs.values()), observer_diffs
    total_per_variant = sum(r['trackedSeeds'] if 'trackedSeeds' in r else r['seeds'] for r in on_rows.values())
    print('## Full standard outcome checks\n')
    print(f'All 26 standard cells completed. Each variant ran {total_per_variant:,} simulations, including the late-legs stretch and the two orientations of each tracked fixture. Counts and territory use the written orientation, as in the harness. The table reads off → on. A star uses the harness two-standard-error rule. [Preregistration](preregistration.md) · [Kicker participation](participation.md)\n')
    if args.stock_only:
        print(f'Passive observation agrees in each of its {len(observer)} completed companion cells and the remainder are in progress.')
    else:
        print('Passive observation reproduced every gameplay summary field in all 26 clean standard cells.')
    match_count = sum(not changed for changed in lossless.values())
    print(f'The disabled variant reproduced all reported gameplay metrics of the revised #757 default in {match_count} of the 13 rows. [Published #757 reference](https://github.com/ch-leon/nrl-sim/blob/9e0b4b0f95a42e4c2990fcfda1ed196375dbf339/runs/20261120-203708-ordinary-wing-bombs-on-v-off-standard-close-range/report.md)\n')
    if match_count != len(fixtures):
        for fixture, keys in lossless.items():
            if keys:
                print(f'- {fixture} differs in {", ".join(keys)}.')
        print()
    print('| Fixture | Kicks | Tries | Completion % | Second-last kicks | Set start m to go | Final kick % | Final run % | Final pass % |')
    print('|---|---:|---:|---:|---:|---:|---:|---:|---:|')
    for fixture in fixtures:
        before, after = off_rows[fixture], on_rows[fixture]
        cols = [pair(before['counts'][k], after['counts'][k], 1 if k == 'completion' else 2) for k in ('kicks', 'tries', 'completion')]
        cols += [pair(before['watch']['territory'][k], after['watch']['territory'][k], digits) for k, digits in [('earlyKicks', 2), ('startM', 1)]]
        cols += [pair(share(before, k), share(after, k), 1) for k in PLAY_TYPES]
        print('| ' + ' | '.join([fixture, *cols]) + ' |')
    print('\n### Preset results\n')
    print('Preset fixtures use 200 matches per row across both orientations. The historical standard yardstick is 45–55%. #465 ratified a 42–58% flat preset points-share range. Points share awards draws half credit. Deltas are in percentage points.\n')
    print('| Fixture | Outright win % off → on | Draw % off → on | Points share % off → on | Points-share change (pp) |')
    print('|---|---:|---:|---:|---:|')
    for fixture in fixtures:
        before, after = off_rows[fixture], on_rows[fixture]
        if 'pointsShare' not in before:
            continue
        off, on = before['pointsShare'], after['pointsShare']
        change = 100 * (on['mean'] - off['mean'])
        two_se = 200 * math.hypot(on['se'], off['se'])
        star = '*' if 0 < two_se < abs(change) else ''
        print(f"| {fixture} | {before['trackedWin']:.1%} → {after['trackedWin']:.1%} | {before['trackedDraw']:.1%} → {after['trackedDraw']:.1%} | {off['mean']:.2%} → {on['mean']:.2%} | {change:+.2f}{star} ± {two_se:.2f} (2 SE) |")
    wider = (0.42, 0.58)
    preexisting = []
    new = []
    for fixture in fixtures:
        before, after = off_rows[fixture].get('pointsShare'), on_rows[fixture].get('pointsShare')
        if before is None or after is None:
            continue
        old, current = mark(before['mean'], wider), mark(after['mean'], wider)
        if current == 'inside':
            continue
        detail = f"{fixture} ({before['mean']:.2%} → {after['mean']:.2%})"
        (preexisting if old == current else new).append(detail)
    if preexisting:
        print('\nPreset rows already outside the ratified range in the disabled control and still outside with the option enabled are ' + ', '.join(preexisting) + '.')
    if new:
        print('\nPreset rows crossing outside the ratified range with the option enabled are ' + ', '.join(new) + '.')
    print('\n### §7 band crossings\n')
    print('The count bands were calibrated for 14-minute matches. Standard full matches here run five minutes. The six-minute late-legs stretch is scaled to five minutes.\n')
    crossings = []
    for fixture in fixtures:
        for metric, band in BANDS.items():
            off = off_rows[fixture]['counts'][metric]['mean']
            on = on_rows[fixture]['counts'][metric]['mean']
            old, new = mark(off, band), mark(on, band)
            if old != new:
                crossings.append((fixture, metric, off, on, old, new))
    if crossings:
        print('| Fixture | Metric | Off → on | Off → on band |')
        print('|---|---|---:|---|')
        for fixture, metric, off, on, old, new in crossings:
            print(f'| {fixture} | {metric} | {off:.3f} → {on:.3f} | {old} → {new} |')
    else:
        print('Every §7 band mark stayed as it was in the disabled run.')


if __name__ == '__main__':
    main()
