#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHIVE_NAME="ai-english-study-extension.zip"

cd "$REPO_DIR"

npm run build-extension
rm -f "$ARCHIVE_NAME"

ARCHIVE_NAME="$ARCHIVE_NAME" python3 - <<'PY'
from pathlib import Path
import os
import zipfile

repo_dir = Path.cwd()
source_dir = repo_dir / 'dist-extension'
archive_path = repo_dir / os.environ['ARCHIVE_NAME']

if archive_path.exists():
    archive_path.unlink()

with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for path in source_dir.rglob('*'):
        if path.is_file():
            zf.write(path, path.relative_to(source_dir))
PY

echo "Created $ARCHIVE_NAME"
