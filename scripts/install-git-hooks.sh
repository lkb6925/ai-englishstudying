#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$REPO_DIR"

if [[ ! -d ".git" ]]; then
  echo "Git hooks were not installed because this is not a git repository."
  exit 0
fi

if [[ ! -f ".githooks/pre-commit" ]]; then
  echo "Git hooks were not installed because .githooks/pre-commit is missing." >&2
  exit 1
fi

chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

echo "Installed git hooks at ${REPO_DIR}/.githooks"
