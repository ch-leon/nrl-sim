#!/usr/bin/env bash
# scripts/cloud-setup.sh — make a cloud session ready to work.
#
# Idempotent. Ensures Node 22 (the version CI uses), runs `npm ci` when
# node_modules is missing or package-lock.json has changed, and installs the
# Chromium build that matches this repo's playwright-core, linked where the
# e2e scripts look: /opt/pw-browsers/chromium (CHROMIUM_PATH overrides it).
# WebKit (e2e:webkit) is left for the job that needs it.
#
#   bash scripts/cloud-setup.sh          Cursor install, or a person proving it.
#                                        A failure exits non-zero.
#   bash scripts/cloud-setup.sh --hook   Claude Code SessionStart. Does the work
#                                        only when CLAUDE_CODE_REMOTE=true, and
#                                        logs and exits 0 if setup fails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() { printf 'cloud-setup: %s\n' "$*" >&2; }

# Claude's hook must not take a session down with it. Cursor's install must
# fail the build when setup fails, so the two entry points disagree on purpose.
if [[ "${1:-}" == "--hook" ]]; then
  if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
    exit 0
  fi
  if "$0" >&2; then
    echo "cloud-setup: ready"
  else
    echo "cloud-setup: failed; session continues. Node, dependencies, or Chromium may be missing."
  fi
  exit 0
elif [[ -n "${1:-}" ]]; then
  log "unknown argument: $1"
  exit 2
fi

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo none
    return 0
  fi
  node -p "process.versions.node.split('.')[0]"
}

# The default image already has Node 22. Install the current 22.x into
# /usr/local only when the `node` on PATH is missing or a different major,
# so login shells find it without a version manager's rc file.
if [[ "$(node_major)" != "22" ]]; then
  log "installing Node 22 (found $(command -v node 2>/dev/null || echo none) $(node -v 2>/dev/null || true))"
  tmp="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  name="$(awk '/node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ { print $2; exit }' "$tmp/SHASUMS256.txt")"
  if [[ -z "$name" ]]; then
    log "could not find a linux-x64 Node 22 tarball in SHASUMS256.txt"
    exit 1
  fi
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$name" -o "$tmp/$name"
  (cd "$tmp" && grep "  $name\$" SHASUMS256.txt | sha256sum -c -)
  as_root tar -xJf "$tmp/$name" -C /usr/local --strip-components=1 --no-same-owner
  rm -rf "$tmp"
  hash -r
  if [[ "$(node_major)" != "22" ]]; then
    log "Node on PATH is still $(command -v node) $(node -v 2>/dev/null || true) after installing 22.x to /usr/local"
    exit 1
  fi
fi

lock_hash="$(sha256sum package-lock.json | awk '{ print $1 }')"
stamp="node_modules/.cache/cloud-setup-lock.sha256"
if [[ ! -d node_modules/playwright-core || ! -f "$stamp" || "$(cat "$stamp")" != "$lock_hash" ]]; then
  log "npm ci"
  npm ci
  mkdir -p node_modules/.cache
  printf '%s\n' "$lock_hash" > "$stamp"
else
  log "node_modules matches package-lock.json"
fi

# e2e-season.mjs and e2e-perf.mjs launch this path directly. Playwright's own
# tree is chromium-<revision>/ under the same directory; the name `chromium`
# is the symlink those scripts exec.
browser_root="/opt/pw-browsers"
link="$browser_root/chromium"
export PLAYWRIGHT_BROWSERS_PATH="$browser_root"
if [[ ! -d "$browser_root" ]]; then
  as_root mkdir -p "$browser_root"
fi
if [[ ! -w "$browser_root" ]]; then
  as_root chown "$(id -u):$(id -g)" "$browser_root"
fi

pw_ver="$(node -p "JSON.parse(require('fs').readFileSync('node_modules/playwright-core/package.json','utf8')).version")"
exe="$(node --input-type=module -e "import { chromium } from 'playwright-core'; process.stdout.write(chromium.executablePath())")"
deps_stamp="$browser_root/.system-deps-$pw_ver"
pw_cli="$ROOT/node_modules/playwright-core/cli.js"

if [[ ! -f "$deps_stamp" ]]; then
  log "installing Chromium system libraries for playwright-core $pw_ver"
  export DEBIAN_FRONTEND=noninteractive
  node "$pw_cli" install-deps chromium
  : > "$deps_stamp"
fi

if [[ ! -x "$exe" ]]; then
  log "installing Chromium for playwright-core $pw_ver"
  node "$pw_cli" install chromium
fi
if [[ ! -x "$exe" ]]; then
  log "Chromium binary missing at $exe"
  exit 1
fi

if [[ ! -e "$link" || "$(readlink -f "$link")" != "$(readlink -f "$exe")" ]]; then
  ln -sfn "$exe" "$link"
fi
if [[ ! -x "$link" ]]; then
  log "could not link $link -> $exe"
  exit 1
fi

log "ready: node $(node -v), playwright-core $pw_ver, chromium $link"
