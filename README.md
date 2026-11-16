# こどもマネー日記

[![CI](https://github.com/Fumiko2026/kodomo-money-diary/actions/workflows/ci.yml/badge.svg)](https://github.com/Fumiko2026/kodomo-money-diary/actions/workflows/ci.yml)

小中学生が、お小遣いの「もらった」「つかった」を記録して、ほしいもののために貯金を計画できる Web アプリです。

- さいふと貯金を分けて表示します(貯金すると、さいふから貯金へお金が移ります)。
- 月ごとのまとめ、ほしいもの(3 つまで)の進み具合が見られます。
- 画面の言葉は、小学 4 年生までの漢字に合わせています。

## 使用技術とバージョン

| 区分 | 技術 | バージョン |
|---|---|---|
| フロントエンド | Vue | 3.5 |
| | TypeScript | 6.0 |
| | Vite(ビルド) | 8.3 |
| | Vue Router | 5.5 |
| | Vitest + Vue Test Utils(テスト) | 5.1 / 2.6 |
| バックエンド | Python | 3.15 |
| | FastAPI | 0.163 |
| | SQLAlchemy(ORM)/ Alembic(マイグレーション) | 2.1 / 1.20 |
| | Pydantic(入力のチェック) | 2.14 |
| | Argon2(パスワードのハッシュ化) | argon2-cffi 25.1 |
| | pytest(テスト) | 9.2 |
| データベース | PostgreSQL | 17 |
| インフラ | Docker / Docker Compose | 29 / 5.7 |
| | nginx | 1.27 |
| | Terraform(AWS provider) | 1.17(~> 6.0) |
| | AWS(東京) | EC2 `t4g.micro`、Amazon Linux 2023、S3、SSM |
| CI | GitHub Actions | バックエンド・フロントのテストを自動実行 |

テストは、バックエンド 81 件、フロントエンド 115 件です。

## 動かしかた(開発)

ターミナルを 2 つ使います。先に DB を起動します。

```bash
# DB(PostgreSQL)を起動
docker compose up -d db

# 1 つ目: バックエンド(初回だけ、準備が要ります)
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # テーブルを作る
uvicorn app.main:app --port 8000

# 2 つ目: フロントエンド
cd frontend
npm install                   # 初回だけ
npm run dev                   # http://localhost:5173 をブラウザで開く
```

## テスト

```bash
cd backend  && source .venv/bin/activate && pytest   # 81 件(DB が起動していること)
cd frontend && npm test                              # 115 件
```

## AWS に公開する(東京リージョン)

EC2(`t4g.micro`)1 台の中で、画面(nginx)・API(FastAPI)・PostgreSQL を Docker で動かします。
RDS と NAT ゲートウェイは使いません(費用を抑えるため。動かしている間は、1 日 $0.4 ほど)。
EC2 へのログインは SSH ではなく SSM を使い、外に開けるのは 80 番(HTTP)だけです。

```bash
aws login --profile kokuban          # AWS にログイン(期限が切れたら、もう一度)

cd infra
terraform init
terraform plan                       # 何が作られるかを確認(費用はかかりません)
terraform apply                      # 実際に作る(ここから費用がかかります)
cd ..

scripts/deploy.sh                    # アプリを届けて起動。終わると URL が出ます
```

アプリを直したあとも、`scripts/deploy.sh` をもう一度実行すれば、入れかわります(DB のデータは残ります)。

**使い終わったら、必ず消します**(消さないと、費用がかかりつづけます)。

```bash
cd infra && terraform destroy
```

> HTTPS ではないので、公開中は、本物のパスワードを使わないでください。
> 秘密の値(DB のパスワード、署名の鍵)は、Terraform が作って AWS の SSM パラメータに入れます。このリポジトリには入りません。

## 文書

| ファイル | 内容 |
|---|---|
| [requirements.md](requirements.md) | 要件定義書 |
| [docs/screens.md](docs/screens.md) | 画面の案(9 画面) |
| [docs/er.md](docs/er.md) | ER 図(テーブル設計) |
| [docs/api.md](docs/api.md) | API 一覧 |

## 開発の状況

- [x] 要件定義、画面の案、ER 図、API 設計
- [x] バックエンド(認証、記録、しゅるい、月のまとめ、ほしいもの)
- [x] フロントエンド(全 9 画面)
- [x] GitHub Actions(自動テスト。push のたびに、バックエンドとフロントのテストを実行)
- [x] Terraform で AWS(東京)に公開。EC2 1 台で動作を確認(確認が済んだら `terraform destroy` で消す)

> 開発用の DB パスワードと署名の鍵は、仮の値です(`docker-compose.yml`、`backend/app/config.py`)。
> 公開するときは、環境変数で必ず別の値に変えます。
