#!/bin/bash
# EC2 が最初に起動したときに、1 回だけ動く。Docker と Docker Compose を入れる。
# アプリそのものは、あとから scripts/deploy.sh が届ける。
set -euxo pipefail
exec > >(tee /var/log/kodomo-bootstrap.log) 2>&1

# ネットワークがまだ安定していないことがあるので、失敗したら、やりなおす
retry() {
  for i in 1 2 3 4 5 6; do
    "$@" && return 0
    sleep 10
  done
  return 1
}

# 小さい機材(メモリ 1GB)でも、Docker のビルドで足りなくならないように、メモリの予備(swap)を作る
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

retry dnf install -y docker
systemctl enable --now docker

# Docker Compose。版と SHA-256 を固定して、ちがうファイルが入らないようにする
COMPOSE_VERSION="v5.7.1"
COMPOSE_SHA256="f2f49f903240895fa764c0dca3a14548b754ad9426f6b609ccaf55ec5a3aa2a5"
PLUGIN_DIR=/usr/local/lib/docker/cli-plugins
mkdir -p "$PLUGIN_DIR"
retry curl -fsSL -o "$PLUGIN_DIR/docker-compose" \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64"
echo "${COMPOSE_SHA256}  ${PLUGIN_DIR}/docker-compose" | sha256sum -c -
chmod +x "$PLUGIN_DIR/docker-compose"
docker compose version

mkdir -p /opt/kodomo
touch /opt/kodomo/.bootstrap-done
