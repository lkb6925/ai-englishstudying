#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/workspaces/ai-englishstudying"
ARCHIVE_NAME="flow-reader-extension.zip"

cd "$REPO_DIR"

npm run build-extension
rm -f "$ARCHIVE_NAME"

(
  cd dist-extension
  zip -qr "../$ARCHIVE_NAME" .
)

echo "Created $ARCHIVE_NAME"
