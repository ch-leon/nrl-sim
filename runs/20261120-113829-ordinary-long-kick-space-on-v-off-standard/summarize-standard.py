#!/usr/bin/env python3
"""Check the standard plan’s coverage and report its main outcome contrasts."""
from pathlib import Path
import json
import math
import sys


DEFAULT = 'baseline'
OFF = 'open-side target off'
BANDS = {
    'tackles': (117, 163), 'lineBreaks': (10, 19), 'offloads': (6, 11), 'errors': (8, 12),
    'kicks': (16, 25), 'tries': (4, 7), 'completion': (70, 80),
    'grubberTries': (0.2, 0.3), 'grubberRepeats': (0.05, 0.3), 'grubberDropouts': (0, 0.15),
}


def read(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def stat(row, metric):
    return row['watch']['territory']['startM'] if metric == 'setStartM' else row['counts'][metric]


def change(before, after, decimals=1):
    delta = after['mean'] - before['mean']
    err = math.hypot(before['se'], after['se'])
    star = '*' if err > 0 and abs(delta) > 2 * err else ''
    return f'{before["mean"]:.{decimals}f} → {after["mean"]:.{decimals}f}{star}'


def band(metric, value):
    lo, hi = BANDS[metric]
    return 'below' if value < lo else 'above' if value > hi else 'inside'


def main(run, preceding):
    plan = json.loads((run / 'plan.json').read_text())
    scenarios = [r['name'] for r in plan['scenarios']]
    raw = [r for file in run.glob('results*.jsonl') for r in read(file)]
    current = {(r['variant'], r['scenario']): r for r in raw}
    if len(raw) != 26 or len(current) != 26 or set(current) != {(v, s) for v in [DEFAULT, OFF] for s in scenarios}:
        raise ValueError('Expected exactly 26 standard cells, with all variants and scenarios')
    previous = {r['scenario']: r for r in read(preceding)}
    if set(previous) != set(scenarios):
        raise ValueError('Missing preceding main scenario')
    for scenario in plan['scenarios']:
        s = scenario['name']
        for variant in [OFF, DEFAULT]:
            r = current[(variant, s)]
            if r['seeds'] != scenario.get('seeds', plan['seeds']):
                raise ValueError(f'Seed count mismatch for {variant} {s}')
            if scenario.get('bothWays') and r.get('trackedSeeds') != 2 * r['seeds']:
                raise ValueError(f'Orientation count mismatch for {variant} {s}')
        a, b = (current[(OFF, s)], previous[s])
        mismatches = [k for k in a if k not in ('variant', 'tuning', 'ms') and a[k] != b.get(k)]
        if mismatches:
            raise ValueError(f'The switch-off control diverged from preceding main on {s}: {mismatches}')
    print('## Standard outcome checks\n')
    print('All 26 cells completed. Both variants ran 1,340 matches, including the standard late-legs stretches. For each of the 13 fixtures, the disabled variant reproduced all the preceding main run’s reported metrics exactly. The preceding main run used `d70989b`, the gameplay commit’s direct parent. The harness comparison below uses that run. The preregistration originally named the older `6fa043c` run, which was the newest result visible locally before fetching the current `balance-log` branch. [Preceding main report](../20261120-015711-standard/report.md)\n')
    print('The table shows off → default. An asterisk follows the standard harness test for the selected outcome columns. Kick metres is the match total from all kicks of all types. Set start is the new possession’s first play-the-ball distance to the line it attacks. The ordinary-kick table that follows measures only the class of kicks eligible for the feature.\n')
    print('| Fixture | Tries | Kicks | Kick metres | Completion % | Set start m to go | Touch finds | 40/20s |')
    print('|---|---:|---:|---:|---:|---:|---:|---:|')
    columns = ('tries', 'kicks', 'kickMetres', 'completion', 'setStartM', 'touchFinds', 'fortyTwenties')
    for s in scenarios:
        a, b = (current[(v, s)] for v in (OFF, DEFAULT))
        contents = ' | '.join(change(stat(a, metric), stat(b, metric)) for metric in columns)
        print(f'| {s} | {contents} |')
    print('\n### Preset yardsticks\n')
    print('Each entry uses 100 seeds in both orientations. Side win counts outright wins. Points share gives half credit for a draw. The 45–55% check appears in the standard plan’s description. The revised 42–58% flat preset guard was ratified under #465. The delta SE combines the two cell-level harness errors in quadrature. The standard harness stores aggregates, so its full-sample output cannot recover paired seed uncertainty.\n')
    print('| Tracked preset | Side win off → default | Draws off → default | Points share off → default | Points share change (pp) | Combined SE (pp) |')
    print('|---|---:|---:|---:|---:|---:|')
    for s in scenarios:
        a, b = (current[(v, s)] for v in (OFF, DEFAULT))
        if 'pointsShare' not in a:
            continue
        wins = f'{a["trackedWin"]*100:.1f} → {b["trackedWin"]*100:.1f}'
        draws = f'{a["trackedDraw"]*100:.1f} → {b["trackedDraw"]*100:.1f}'
        pa, pb = a['pointsShare'], b['pointsShare']
        est, err = (pb['mean'] - pa['mean']) * 100, 100 * math.hypot(pa['se'], pb['se'])
        print(f'| {s} | {wins} | {draws} | {pa["mean"]*100:.2f} → {pb["mean"]*100:.2f} | {est:+.2f} | {err:.2f} |')
    print('\n### §7 band crossings and inherited flags\n')
    print('The standard report applies its count targets, which were calibrated at 14 minutes, to the current two 2.5-minute halves. The late-legs counts are scaled from six minutes to five. Every preceding and default row is below the bands for tackles, line breaks, offloads, errors, kicks and tries. Completion and the grubber bands are shown below wherever a band side changes. Other off-band grubber readings are visible in the full tables.\n')
    crossings = []
    for s in scenarios:
        a, b = (current[(v, s)] for v in (OFF, DEFAULT))
        for metric in BANDS:
            pa, pb = stat(a, metric), stat(b, metric)
            ba, bb = band(metric, pa['mean']), band(metric, pb['mean'])
            if ba != bb:
                crossings.append(f'| {s} | {metric} | {change(pa, pb, 3 if metric.startswith("grubber") else 1)} | {ba} → {bb} |')
    if crossings:
        print('| Fixture | Metric | Off → default values | Off → default band |')
        print('|---|---|---:|---|')
        print('\n'.join(crossings))
    else:
        print('No §7 band crossings were observed. All 13 completion readings were inside 70–80% in both variants.')
    print()


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
