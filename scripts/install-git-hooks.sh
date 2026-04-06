#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/workspaces/ai-englishstudying"

cd "$REPO_DIR"

if [[ ! -d ".git" ]]; then
  echo "Git hooks were not installed because this is not a git repository."
  exit 0
fi

chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

echo "Installed git hooks at .githooks"
