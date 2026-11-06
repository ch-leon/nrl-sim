"""Validate saved #465 baseline/enabled soak JSON; never runs the simulation."""
import json
import math
import statistics
import sys

baseline, enabled = (json.load(open(path)) for path in sys.argv[1:])
expected = {(seed * 7919, mode, difficulty)
            for seed in range(1, 21) for mode in ['idle', 'managed']
            for difficulty in ['easy', 'normal', 'hard']}
for name, data in [('baseline', baseline), ('enabled', enabled)]:
    assert data['seeds'] == 20 and data['seasons'] == 5, name
    assert len(data['results']) == 140, name
    fresh = [r for r in data['results'] if r.get('fromVersion') is None]
    assert len(fresh) == 120, name
    assert {(r['seed'], r['mode'], r['difficulty']) for r in fresh} == expected, name
    assert sorted(r['fromVersion'] for r in data['results'] if r.get('fromVersion') is not None) == list(range(1, 21)), name
    assert not any(r['problems'] for r in data['results']), name
    assert not any(s['forfeits'] for r in data['results'] for s in r['seasons']), name


def group(data, difficulty, mode):
    return [r for r in data['results'] if r.get('fromVersion') is None
            and r['difficulty'] == difficulty and r['mode'] == mode]


def win_rate(careers):
    seasons = [s for r in careers for s in r['seasons']]
    return 100 * sum(s['wins'] for s in seasons) / sum(s['wins'] + s['draws'] + s['losses'] for s in seasons)


for difficulty in ['easy', 'normal', 'hard']:
    for mode in ['idle', 'managed']:
        before, after = (group(data, difficulty, mode) for data in [baseline, enabled])
        swing = win_rate(after) - win_rate(before)
        cash_before = [r['seasons'][-1]['money'] for r in before]
        cash_after = [r['seasons'][-1]['money'] for r in after]
        cash_shift = statistics.mean(cash_after) - statistics.mean(cash_before)
        baseline_se = statistics.stdev(cash_before) / math.sqrt(len(cash_before))
        print(f'{difficulty}/{mode}: wins {win_rate(before):.6f}% → {win_rate(after):.6f}% ({swing:+.6f}pp); cash shift ${cash_shift:+,.2f}, baseline SE ${baseline_se:,.2f}')
        if difficulty == 'normal':
            assert abs(swing) <= 3, f'{mode}: Normal win swing exceeds 3pp'
        assert abs(cash_shift) <= 2 * baseline_se, f'{difficulty}/{mode}: mean cash outside baseline ±2SE'
print('Complete baseline/enabled soak guards passed; saves v1–20, no problems or forfeits.')
