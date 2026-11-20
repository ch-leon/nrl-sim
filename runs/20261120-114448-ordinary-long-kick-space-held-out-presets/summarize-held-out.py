#!/usr/bin/env python3
"""Verify the exact held-out plan and summarize its aggregate harness output."""
from pathlib import Path
import json
import math
import sys


DEFAULT = 'baseline'
OFF = 'open-side target off'
SCENARIOS = ('kick-chase v balanced', 'rush v slide')
BANDS = {
    'tackles': (117, 163), 'lineBreaks': (10, 19), 'offloads': (6, 11), 'errors': (8, 12),
    'kicks': (16, 25), 'tries': (4, 7), 'completion': (70, 80),
    'grubberTries': (0.2, 0.3), 'grubberRepeats': (0.05, 0.3), 'grubberDropouts': (0, 0.15),
}


def band(metric, value):
    lo, hi = BANDS[metric]
    return 'below' if value < lo else 'above' if value > hi else 'inside'


def stat(row, metric):
    return row['watch']['territory']['startM'] if metric == 'setStartM' else row['counts'][metric]


def compare(a, b, decimals=1):
    err = math.hypot(a['se'], b['se'])
    star = '*' if err > 0 and abs(b['mean'] - a['mean']) > 2 * err else ''
    return f'{a["mean"]:.{decimals}f} → {b["mean"]:.{decimals}f}{star}'


def range_label(mean, low, high):
    direction = 'below' if mean < low else 'above' if mean > high else 'inside'
    return direction


def main(run):
    plan = json.loads((run / 'plan.json').read_text())
    assert plan['seedStart'] == 1001 and plan['seeds'] == 200
    assert plan.get('variants') == [{'name': OFF, 'tuning': {'longKick.on': 0}}]
    assert [r['name'] for r in plan['scenarios']] == list(SCENARIOS)
    assert all(r['seeds'] == 200 and r['bothWays'] and r['track'] == 'home' for r in plan['scenarios'])
    rows = [json.loads(line) for file in run.glob('results*.jsonl') for line in file.read_text().splitlines() if line]
    by_cell = {(r['scenario'], r['variant']): r for r in rows}
    assert len(rows) == len(by_cell) == 4 and set(by_cell) == {(s, v) for s in SCENARIOS for v in (OFF, DEFAULT)}
    assert all(r['seeds'] == 200 and r['trackedSeeds'] == 400 and r['minutes'] == 5 for r in rows)
    print('## Held-out preset checks\n')
    print('Each fixture uses the same 200 seed IDs per variant in each orientation. All four cells finished, for 400 matches per cell and 1,600 matches overall. The full tables above show the written orientation for ordinary counts. The points shares below use both orientations and count a draw as half a win. The 95% intervals are normal approximations from the harness’s match-level standard errors. The delta uses the two variant errors in quadrature and does not account for dependence between seeds reused across variants or orientations. Only cell aggregates were written. [Held-out preregistration](preregistration.md) · [Original standard report](../20261120-113829-ordinary-long-kick-space-on-v-off-standard/report.md)\n')
    print('| Preset | Wins off → default | Draws off → default | Points share off [95% interval] | Points share default [95% interval] | Default − off [95% interval], pp | Combined SE, pp | 42–58% point estimate off → default |')
    print('|---|---:|---:|---:|---:|---:|---:|---|')
    def show(mean, se, decimals=2, signed=False):
        fmt = f'{"+" if signed else ""}.{decimals}f'
        return f'{mean:{fmt}} [{mean - 1.96 * se:{fmt}}, {mean + 1.96 * se:{fmt}}]'
    for s in SCENARIOS:
        a, b = (by_cell[(s, v)] for v in (OFF, DEFAULT))
        win = f'{a["trackedWin"]*100:.2f}% → {b["trackedWin"]*100:.2f}%'
        draw = f'{a["trackedDraw"]*100:.2f}% → {b["trackedDraw"]*100:.2f}%'
        am, ae, bm, be = (100 * r['pointsShare'][x] for r in (a,b) for x in ('mean','se'))
        err = math.hypot(ae, be)
        limits = f'{range_label(am, 42, 58)} → {range_label(bm, 42, 58)}'
        print(f'| {s} | {win} | {draw} | {show(am, ae, 3)}% | {show(bm, be, 3)}% | {show(bm - am, err, 3, signed=True)} | {err:.2f} | {limits} |')
    print('\n### Match outcomes and §7 bands\n')
    print('The published count bands were calibrated on 14-minute matches. These fixtures use two 2.5-minute halves. An asterisk marks a difference over two combined standard errors under the harness rule.\n')
    print('| Fixture | Tries | Kicks | Kick metres | Completion % | Set start m to go | Touch finds | 40/20s |')
    print('|---|---:|---:|---:|---:|---:|---:|---:|')
    columns = ('tries', 'kicks', 'kickMetres', 'completion', 'setStartM', 'touchFinds', 'fortyTwenties')
    for s in SCENARIOS:
        a, b = (by_cell[(s, v)] for v in (OFF, DEFAULT))
        values = ' | '.join(compare(stat(a, m), stat(b, m)) for m in columns)
        print(f'| {s} | {values} |')
    print()
    for s in SCENARIOS:
        a, b = (by_cell[(s, v)] for v in (OFF, DEFAULT))
        inherited = {metric: band(metric, stat(a, metric)['mean']) for metric in BANDS if band(metric, stat(a, metric)['mean']) != 'inside'}
        unchanged = [metric for metric, side in inherited.items() if band(metric, stat(b, metric)['mean']) == side]
        crossings = [(m, band(m, stat(a, m)['mean']), band(m, stat(b, m)['mean'])) for m in BANDS if band(m, stat(a, m)['mean']) != band(m, stat(b, m)['mean'])]
        print(f'- {s} inherited off-band readings in both variants for {", ".join(unchanged)}.')
        if crossings:
            print(f'- {s} crossings include ' + ', '.join(f'{m} {compare(stat(a,m), stat(b,m), 3 if m.startswith("grubber") else 1)} ({sideoff} → {sideon})' for m,sideoff,sideon in crossings) + '.')
        else:
            print(f'- {s} had no §7 band crossings.')
    print()


if __name__ == '__main__':
    main(Path(sys.argv[1]))
