#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/workspaces/ai-englishstudying"
PID_FILE="/tmp/ai-englishstudying-autopublish.pid"
LOG_FILE="/tmp/ai-englishstudying-autopublish.log"

if [[ ! -d "$REPO_DIR" ]]; then
  exit 0
fi

if [[ "${AUTO_PUBLISH_DISABLE:-0}" == "1" ]]; then
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$REPO_DIR"

if [[ ! -f "package.json" ]]; then
  exit 0
fi

if [[ -x "scripts/install-git-hooks.sh" ]]; then
  bash scripts/install-git-hooks.sh >/dev/null 2>&1 || true
fi

nohup npm run autopublish:github -- --allow-dirty-start >>"$LOG_FILE" 2>&1 &
autopublish_pid=$!
echo "$autopublish_pid" >"$PID_FILE"
