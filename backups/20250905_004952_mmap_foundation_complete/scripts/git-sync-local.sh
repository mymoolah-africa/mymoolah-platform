#!/usr/bin/env bash

set -euo pipefail

# Safe local Git sync helper for MyMoolah (local Mac only)
# - Creates a timestamped snapshot branch from your current work
# - Pushes it to GitHub and prints a PR link
# - Tags the snapshot for easy rollback
#
# Usage:
#   npm run sync:local

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

if [[ ! -d .git ]]; then
  echo "❌ This is not a git repository: $REPO_DIR" >&2
  exit 1
fi

if ! git remote -v | grep -q "^origin\s"; then
  echo "❌ No 'origin' remote configured. Please add your GitHub remote first." >&2
  exit 1
fi

timestamp_utc="$(date -u +%Y-%m-%dT%H:%MZ)"
branch_name="sync/local-$(date -u +%Y%m%d-%H%M)"
base_branch="main"

echo "👉 Fetching latest from origin and pruning old refs..."
git fetch --all --prune

echo "👉 Ensuring local $base_branch is up to date..."
git checkout "$base_branch" >/dev/null 2>&1 || true
git pull --rebase

# Stage and commit any local changes (respects .gitignore)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "👉 Committing local changes into a snapshot commit..."
  git add -A
  git commit -m "Local work snapshot ${timestamp_utc}"
else
  echo "ℹ️  No local changes to commit. Creating a snapshot branch from current HEAD."
fi

echo "👉 Creating snapshot branch: ${branch_name}"
git checkout -b "$branch_name"

echo "👉 Pushing branch to origin..."
git push -u origin "$branch_name"

# Create a lightweight rollback point
tag_name="stable-local-$(date -u +%Y%m%d-%H%M)"
echo "👉 Tagging snapshot as: ${tag_name}"
git tag -a "$tag_name" -m "Local stable snapshot"
git push origin "$tag_name" || true

# Compute PR URL from remote
remote_url="$(git config --get remote.origin.url)"
remote_url_http="${remote_url%.git}"
remote_url_http="${remote_url_http/git@github.com:/https://github.com/}"

echo
echo "✅ Snapshot pushed. Open a PR to merge to ${base_branch}:"
echo "${remote_url_http}/pull/new/${branch_name}"
echo

echo "👉 Switching back to ${base_branch}"
git checkout "$base_branch" >/dev/null 2>&1 || true

echo "Done."


