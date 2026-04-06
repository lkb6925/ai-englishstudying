#!/usr/bin/env bash
set -euo pipefail

cat <<'MSG'
This script rewrites git history to replace .env.example contents with safe placeholders.
It changes commit SHAs from the first affected commit onward.
After running it, you must force-push the rewritten refs.
MSG

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

backup_branch="backup/pre-env-rewrite-$(date +%Y%m%d-%H%M%S)"
git branch "$backup_branch"
echo "Created backup branch: $backup_branch"

git filter-branch --force --tree-filter '
if [ -f .env.example ]; then
  cat > .env.example <<'"'"'EOF'"'"'
APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000
VITE_APP_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash
EOF
fi
' -- --all

echo "History rewrite complete."
echo "Next: git push --force-with-lease --all && git push --force-with-lease --tags"
