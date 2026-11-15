#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
git rev-parse --is-inside-work-tree >/dev/null
branch=$(git symbolic-ref --quiet --short HEAD) || {
  echo "Select a branch before synchronizing." >&2
  exit 1
}
case "${1:-}" in
  pull)
    # Refuse to mix an incoming revision with uncommitted application work.
    if [ -n "$(git status --porcelain)" ]; then
      echo "Commit or stash the current changes before pulling." >&2
      exit 1
    fi
    git pull --ff-only origin "$branch"
    ;;
  push)
    git push -u origin "HEAD:refs/heads/$branch"
    ;;
  *) echo "Usage: sh scripts/sync-github.sh pull|push" >&2; exit 2 ;;
esac
