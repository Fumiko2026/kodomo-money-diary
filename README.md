# こどもマネー日記

小中学生が、お小遣いの「もらった」「つかった」を記録して、ほしいもののために貯金を計画できる Web アプリです。

- さいふと貯金を分けて表示します(貯金すると、さいふから貯金へお金が移ります)。
- 月ごとのまとめ、ほしいもの(3 つまで)の進み具合が見られます。
- 画面の言葉は、小学 4 年生までの漢字に合わせています。

## 技術

| 区分 | 使うもの |
|---|---|
| フロントエンド | Vue 3 + TypeScript(Vite)、Vitest |
| バックエンド | Python + FastAPI、SQLAlchemy + Alembic、pytest |
| DB | PostgreSQL 17(開発中は Docker) |
| 公開(予定) | Terraform で AWS の EC2 + RDS |

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
- [ ] GitHub Actions(自動テスト)
- [ ] Terraform で AWS に公開

> 開発用の DB パスワードと署名の鍵は、仮の値です(`docker-compose.yml`、`backend/app/config.py`)。
> 公開するときは、環境変数で必ず別の値に変えます。
