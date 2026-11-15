#!/usr/bin/env bash
# 手元で、フロントをビルドして、EC2 に届ける 1 つのファイル(build/app.tar.gz)にまとめる。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/build/app.tar.gz}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "== フロントエンドをビルド"
(cd "$ROOT/frontend" && npm ci --silent && npm run build --silent)

echo "== まとめる"
mkdir -p "$STAGE/app" "$(dirname "$OUT")"
cp -R "$ROOT/frontend/dist" "$STAGE/app/frontend-dist"
mkdir "$STAGE/app/backend"
cp -R "$ROOT/backend/app" "$ROOT/backend/migrations" "$ROOT/backend/alembic.ini" \
      "$ROOT/backend/requirements.txt" "$ROOT/backend/Dockerfile" "$ROOT/backend/.dockerignore" \
      "$STAGE/app/backend/"
cp -R "$ROOT/deploy" "$STAGE/app/deploy"
find "$STAGE" \( -name __pycache__ -o -name '*.pyc' -o -name .DS_Store \) -prune -exec rm -rf {} +

# macOS の余分な属性ファイル(._*)を、含めない
COPYFILE_DISABLE=1 tar -czf "$OUT" -C "$STAGE" app
echo "できました: $OUT ($(du -h "$OUT" | cut -f1))"
