#!/usr/bin/env bash
# EC2 の上で動かす: 秘密の値を取りだして、アプリを(再)起動する。
# 使い方: update.sh <リージョン> <SSM パラメータの前置き(例: /kodomo-money)>
set -euo pipefail

REGION="${1:?リージョンが必要です}"
PREFIX="${2:?SSM パラメータの前置きが必要です}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="/opt/kodomo/.env"

get_param() {
  aws ssm get-parameter --region "$REGION" --name "$PREFIX/$1" --with-decryption \
    --query Parameter.Value --output text
}

# 秘密の値は、この EC2 の中の .env にだけ置く(自分だけが読める)
umask 077
{
  echo "DB_PASSWORD=$(get_param db-password)"
  echo "SECRET_KEY=$(get_param secret-key)"
  echo "COOKIE_SECURE=false"
} > "$ENV_FILE"

cd "$APP_DIR/deploy"
docker compose --env-file "$ENV_FILE" up -d --build --remove-orphans
# アプリのフォルダを入れかえたので、nginx は、新しいフォルダを見るように、作りなおす(DB はそのまま)
docker compose --env-file "$ENV_FILE" up -d --force-recreate --no-deps web
docker image prune -f >/dev/null

echo "== 状態"
docker compose --env-file "$ENV_FILE" ps
