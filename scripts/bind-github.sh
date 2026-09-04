#!/bin/sh
# Replant git and push to GitHub. Sandbox wipes are not a cannot.
set -eu
cd /workspace
REPO="${GITHUB_REPO:-https://github.com/AntagonistArmy/weaverslullaby.git}"

git config --global --add safe.directory /workspace 2>/dev/null || true

if [ ! -d .git ]; then
  git init -b main
  git remote add origin "$REPO" 2>/dev/null || git remote set-url origin "$REPO"
fi

git config user.name "AntagonistArmy"
git config user.email "117744215+AntagonistArmy@users.noreply.github.com"
git config credential.helper '!gh auth git-credential'
git config --replace-all credential.https://github.com.helper '!gh auth git-credential'
git config push.autoSetupRemote true
git config init.defaultBranch main
git remote set-url origin "$REPO"

git fetch origin 2>/dev/null || git fetch origin
git checkout -B main
git branch --set-upstream-to=origin/main main 2>/dev/null || true

git add -A
if ! git diff --cached --quiet; then
  git commit -m "Blaze: field snapshot"
fi

git pull --rebase origin main 2>/dev/null || git pull origin main --no-edit || true
git push -u origin main
