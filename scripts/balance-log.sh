#!/usr/bin/env bash
# scripts/balance-log.sh — keep balance runs on the `balance-log` branch
# (balance/README.md), so main stays code and the results pile up in one place.
#
#   scripts/balance-log.sh fetch                 check the log out into .balance-log/
#   scripts/balance-log.sh latest <plan-name>    print the newest run dir for a plan (after fetch)
#   scripts/balance-log.sh publish <run dir>...  copy runs in, update INDEX.md, commit and push
set -euo pipefail
LOG=.balance-log
BRANCH=balance-log

# A field from a JSON file.
json() {
  node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))[process.argv[2]])" "$1" "$2"
}

fetch() {
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git fetch -q origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
    if [ -d "$LOG" ]; then
      git -C "$LOG" checkout -q --detach "origin/$BRANCH"
    else
      git worktree add -q --detach "$LOG" "origin/$BRANCH"
    fi
  elif [ ! -d "$LOG" ]; then
    # First run ever: an empty branch of its own.
    git worktree add -q --detach "$LOG"
    git -C "$LOG" checkout -q --orphan "$BRANCH"
    git -C "$LOG" rm -rq --cached . >/dev/null 2>&1 || true
    find "$LOG" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
    printf '# Balance log\n\nEvery balance run, newest last. Each folder has the plan, the raw results and `report.md`.\n\n| Run | Plan | Commit | Branch | Report |\n|---|---|---|---|---|\n' > "$LOG/INDEX.md"
  fi
}

latest() {
  local slug
  slug=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
  ls -d "$LOG"/runs/*-"$slug" 2>/dev/null | sort | tail -1
}

publish() {
  fetch
  mkdir -p "$LOG/runs"
  for run in "$@"; do
    local name
    name=$(basename "$run")
    rm -rf "$LOG/runs/$name"
    cp -r "$run" "$LOG/runs/$name"
    local plan commit branch
    plan=$(json "$run/plan.json" name)
    commit=$(json "$run/meta.json" commit)
    branch=$(json "$run/meta.json" branch)
    grep -q "| $name |" "$LOG/INDEX.md" || echo "| $name | $plan | $commit | $branch | [report](runs/$name/report.md) |" >> "$LOG/INDEX.md"
  done
  git -C "$LOG" add -A
  if git -C "$LOG" diff --cached --quiet; then
    echo "Nothing new to publish."
    return
  fi
  git -C "$LOG" commit -qm "Balance: $(for r in "$@"; do basename "$r"; done | paste -sd ' ')"
  for i in 1 2 3 4; do
    git -C "$LOG" push -q origin "HEAD:refs/heads/$BRANCH" && break
    sleep $((2 ** i))
    git -C "$LOG" pull -q --rebase origin "$BRANCH" || true
  done
  echo "Published to $BRANCH: $*"
}

cmd=${1:-}
shift || true
case "$cmd" in
  fetch) fetch ;;
  latest) latest "$1" ;;
  publish) publish "$@" ;;
  *) echo "usage: scripts/balance-log.sh fetch | latest <plan-name> | publish <run dir>..." >&2; exit 1 ;;
esac
