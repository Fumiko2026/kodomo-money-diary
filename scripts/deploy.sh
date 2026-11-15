#!/usr/bin/env bash
# アプリを AWS(EC2)に届けて、(再)起動する。
#   使い方: scripts/deploy.sh
# 先に、infra/ で terraform apply を済ませ、`aws login --profile kokuban` でログインしておく。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export AWS_PROFILE="${AWS_PROFILE:-kokuban}"
export AWS_PAGER=""

tf_out() { terraform -chdir="$ROOT/infra" output -raw "$1"; }

BUCKET="$(tf_out artifact_bucket)"
INSTANCE="$(tf_out instance_id)"
REGION="$(tf_out region)"
PREFIX="$(tf_out ssm_prefix)"
URL="$(tf_out url)"
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"

echo "== 1. まとめる"
"$ROOT/scripts/package.sh"

echo "== 2. S3 に置く"
KEY="releases/app-$(date +%Y%m%d-%H%M%S).tar.gz"
aws s3 cp "$ROOT/build/app.tar.gz" "s3://$BUCKET/$KEY" --no-progress

echo "== 3. EC2 の準備ができるのを待つ(はじめては、2〜3 分かかります)"
for _ in $(seq 1 60); do
  STATUS="$(aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=$INSTANCE" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)"
  [ "$STATUS" = "Online" ] && break
  sleep 10
done
[ "$STATUS" = "Online" ] || { echo "EC2 が SSM につながりません(10 分待ちました)"; exit 1; }

echo "== 4. EC2 で、アプリを入れかえて起動(Docker のビルドで、数分かかります)"
PARAMS="$(mktemp)"
trap 'rm -f "$PARAMS"' EXIT
cat > "$PARAMS" <<JSON
{"commands":[
"for i in \$(seq 1 60); do [ -f /opt/kodomo/.bootstrap-done ] && break; sleep 5; done; test -f /opt/kodomo/.bootstrap-done",
"rm -rf /opt/kodomo/app.new && mkdir -p /opt/kodomo/app.new",
"aws s3 cp s3://$BUCKET/$KEY /tmp/app.tar.gz --region $REGION --no-progress",
"tar -xzf /tmp/app.tar.gz -C /opt/kodomo/app.new",
"rm -rf /opt/kodomo/app && mv /opt/kodomo/app.new/app /opt/kodomo/app",
"bash /opt/kodomo/app/deploy/update.sh $REGION $PREFIX"
]}
JSON

COMMAND_ID="$(aws ssm send-command \
  --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --comment "kodomo-money deploy" \
  --parameters "file://$PARAMS" \
  --query 'Command.CommandId' --output text)"

for _ in $(seq 1 120); do
  STATUS="$(aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE" \
    --query Status --output text 2>/dev/null || echo Pending)"
  case "$STATUS" in
    Success) break ;;
    Failed|Cancelled|TimedOut) break ;;
  esac
  sleep 10
done

echo "---- EC2 の出力 ----"
aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE" \
  --query StandardOutputContent --output text | tail -30
if [ "$STATUS" != "Success" ]; then
  echo "---- エラー ----"
  aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE" \
    --query StandardErrorContent --output text | tail -30
  echo "デプロイに失敗しました(状態: $STATUS)"
  exit 1
fi

echo "== 5. つながるか確認"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "$URL/api/health" >/dev/null 2>&1; then
    echo "OK: $URL"
    exit 0
  fi
  sleep 5
done
echo "起動はしましたが、$URL/api/health に、まだつながりません。少し待って、もう一度ブラウザで開いてみてください。"
