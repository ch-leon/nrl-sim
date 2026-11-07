"""Pool complete soak shards without dropping or changing case results."""
import argparse
import json
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', required=True)
parser.add_argument('files', nargs='+')
args = parser.parse_args()
parts = [json.load(open(path)) for path in args.files]
seen_parts = set()
seen_cases = set()
results = []
first = parts[0]
total = None
for part in parts:
    assert (part['seeds'], part['seasons'], part['liveRivals']) == (first['seeds'], first['seasons'], first['liveRivals']), 'Mixed soak configurations'
    match = re.fullmatch(r'(\d+)/(\d+)', part.get('shard', ''))
    assert match, 'Every input must identify its case shard'
    index, count = map(int, match.groups())
    assert 1 <= index <= count and index not in seen_parts, 'Invalid or duplicate shard'
    assert total is None or count == total, 'Mixed shard counts'
    total = count
    seen_parts.add(index)
    for result in part['results']:
        key = ('old', result['fromVersion'], result['seed'], result['mode']) if result.get('fromVersion') is not None else ('fresh', result['seed'], result['mode'], result.get('difficulty', 'normal'))
        assert key not in seen_cases, f'Duplicate soak case: {key}'
        seen_cases.add(key)
        results.append(result)
assert seen_parts == set(range(1, total + 1)), 'Incomplete shard set'
# Per-shard summaries are deliberately omitted: they do not describe the pool.
pooled = {key: first[key] for key in ['seasons', 'seeds', 'liveRivals']}
pooled.update(shards=sorted(seen_parts), results=results)
with open(args.out, 'w') as stream:
    json.dump(pooled, stream, indent=1)
print(f'Pooled all {total} shards: {len(results)} distinct, unchanged cases. Run the complete-case acceptance guard next.')
