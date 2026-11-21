import argparse
import json
import math
from pathlib import Path


def load_run(path):
    return {r['variant']: r for f in sorted(path.glob('results*.jsonl')) for r in map(json.loads, f.read_text().splitlines())}


def core_metrics(row):
    return {key: value for key, value in row.items() if key not in ('variant', 'tuning', 'ms')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('confirmation', type=Path)
    parser.add_argument('reference', type=Path)
    args = parser.parse_args()
    variants = load_run(args.confirmation)
    reference = load_run(args.reference)['baseline']
    off, on = variants['five-eighth option off'], variants['baseline']
    assert len(variants) == 2 and off['trackedSeeds'] == on['trackedSeeds'] == 400
    matched = core_metrics(off) == core_metrics(reference)
    before, after = off['pointsShare'], on['pointsShare']
    delta = 100 * (after['mean'] - before['mean'])
    error = 100 * math.hypot(before['se'], after['se'])
    clear = abs(delta) > 2 * error
    print('## Separate confirmation\n')
    print('This reruns the prior #757 independent cohort, seeds 1001–1200 in both orientations, on the locked engine. The standard suite used seeds 1–100. There were 400 matches in each condition. Points share awards draws half credit. [Preregistration](preregistration.md) · [Prior #757 report](https://github.com/ch-leon/nrl-sim/blob/9e0b4b0f95a42e4c2990fcfda1ed196375dbf339/runs/20261120-204343-wing-bombs-held-out-rush/report.md)\n')
    print('| Condition | Rush outright win | Draw | Rush points share |')
    print('|---|---:|---:|---:|')
    for title, row in [('Prior #757 default', reference), ('Five-eighth option disabled', off), ('Five-eighth option default', on)]:
        print(f"| {title} | {row['trackedWin']:.2%} | {row['trackedDraw']:.2%} | {row['pointsShare']['mean']:.2%} |")
    print()
    if matched:
        print('The disabled variant reproduced every gameplay summary field in the prior #757 repeat.')
    else:
        print('The disabled variant and prior #757 repeat differ in these gameplay summary fields ' + ', '.join(key for key in core_metrics(off) if off[key] != reference.get(key)) + '.')
    conclusion = 'clears' if clear else 'falls inside'
    print(f'The observed shift is {delta:+.2f} percentage points with a combined standard error of {error:.2f} points. It {conclusion} the two-standard-error threshold. The same seeds were used in both conditions and the harness stores aggregate results.\n')


if __name__ == '__main__':
    main()
