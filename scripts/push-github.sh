#!/bin/sh
set -eu
cd /workspace
if [ ! -d .git ]; then
  git init
  git checkout -B main
  git remote add origin https://github.com/AntagonistArmy/weaverslullaby.git || git remote set-url origin https://github.com/AntagonistArmy/weaverslullaby.git
  git fetch origin
  git branch --set-upstream-to=origin/main main || true
fi
git config user.name "AntagonistArmy"
git config user.email "117744215+AntagonistArmy@users.noreply.github.com"
git add -A
git diff --cached --quiet || git commit -m "Blaze: field snapshot"
git pull --rebase origin main || git pull origin main --no-rebase
git push -u origin main
