# API一覧: こどもマネー日記

| 項目 | 内容 |
|---|---|
| 版 | 0.1(たたき台) |
| 元にする文書 | `requirements.md` 0.3 / `docs/screens.md` 0.1 / `docs/er.md` 0.1 |
| 形式 | JSON。パスは `/api` から始める。FastAPI |

## 1. 共通の決まり

- **認証**: ログイン後、Cookie(HttpOnly、SameSite=Lax)にセッションを入れる。ログインが要る API は、ない場合 `401`。
- **自分の記録だけ**: すべての API は、ログイン中のユーザーの行だけを扱う。他の人の ID を指定したら `404`(存在を教えない。KM-03)。
- **金額**: 整数(円)。
- **日付**: `YYYY-MM-DD`(日本時間)。月は `YYYY-MM`。
- **エラー**: `{"detail": "..."}`。入力の誤りは `422`、重複は `409`。

## 2. エンドポイント

### 認証・ユーザー(S1, S2, S9)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| POST | /api/auth/register | 登録。nickname, password, initial_wallet, initial_savings。成功したらログイン状態にする。ニックネームの重複は 409 | KM-01, KM-23 |
| POST | /api/auth/login | nickname, password。違うときは、どちらが違うか分からない同じ 401 を返す | KM-02 |
| POST | /api/auth/logout | ログアウト | KM-02 |
| GET | /api/me | nickname, initial_wallet, initial_savings | |
| PATCH | /api/me | initial_wallet, initial_savings を直す | KM-23 |

### 残高(S3)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| GET | /api/balance | `{wallet, savings}` を計算して返す(er.md 第3節の式) | KM-05, KM-24 |

### 記録(S3, S4, S5)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| GET | /api/records?month=YYYY-MM&limit=&offset= | 新しい順の一覧。month を省くと全期間 | KM-06 |
| POST | /api/records | 記録を作る | KM-04, KM-25 |
| GET | /api/records/{id} | 1 件(直す画面用) | KM-07 |
| PUT | /api/records/{id} | 直す | KM-07 |
| DELETE | /api/records/{id} | 消す(確認は画面側) | KM-08 |

記録の入力:

```json
{ "record_date": "2026-11-15", "type": "expense", "amount": 100,
  "income_kind": null, "category_id": 1, "memo": "" }
```

チェック(違反は 422):
- `amount` は 1 以上(KM-09)
- `record_date` は今日まで(未来は不可)
- `type = income` のときだけ `income_kind`(allowance / otoshidama)が必須
- `type = expense` のときだけ `category_id` が必須。自分の項目か、はじめから入っている項目のみ
- さいふより多い金額は、**エラーにしない**(確認は画面側。screens.md S4)

### しゅるい(項目)(S4, S8)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| GET | /api/categories | はじめから入っている項目 + 自分の項目 | KM-10 |
| POST | /api/categories | name, color(8 色のキー)。同じ名前は 409 | KM-11 |
| PATCH | /api/categories/{id} | 名前・色を直す。はじめから入っている項目は 403 | KM-12 |
| DELETE | /api/categories/{id} | 使われている記録を「その他」へ移してから消す。はじめから入っている項目は 403 | KM-13 |
| GET | /api/categories/{id}/usage | 使っている記録の件数(消す前の確認用) | KM-13 |

### 月のまとめ(S6, S3)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| GET | /api/summary?month=YYYY-MM | 下の形で返す | KM-14〜16 |

```json
{ "month": "2026-11",
  "income": { "total": 500, "allowance": 500, "otoshidama": 0 },
  "expense": { "total": 100,
               "by_category": [{ "category_id": 1, "name": "おやつ", "color": "red1", "amount": 100 }] },
  "deposit": 300, "withdraw": 0,
  "diff": 400 }
```

`diff` は、もらった − つかった(貯金の出し入れは含めない)。

### ほしいもの(S3, S7)
| メソッド | パス | 内容 | 要件 |
|---|---|---|---|
| GET | /api/wishes | 作った順。各件に、進み具合(`saved`)と `months_left` を付ける | KM-17, KM-19, KM-20 |
| POST | /api/wishes | name, target_amount, otoshidama_plan, monthly_plan。すでに 3 つあるときは 409 | KM-17, KM-18 |
| PATCH | /api/wishes/{id} | 直す | KM-21 |
| DELETE | /api/wishes/{id} | 消す | KM-21 |

- `saved`: 貯金額を、作った順に、上のものから順にあてた額(screens.md S7)。
- `months_left`: `ceil((target_amount − saved) / monthly_plan)`。`monthly_plan` が空か 0 のときは `null`(画面には出さない)。

## 3. 状態コードのまとめ

| コード | 使うとき |
|---|---|
| 200 / 201 / 204 | 成功(取得・更新 / 作成 / 削除) |
| 401 | ログインしていない、ニックネームかパスワードが違う |
| 403 | はじめから入っている項目を直す・消そうとした |
| 404 | 存在しない、または他の人のもの |
| 409 | ニックネーム・項目名の重複、ほしいものが 4 つ目 |
| 422 | 入力の誤り(金額、日付、種類ごとの必須項目) |

## 4. 決めたこと・まだ決めないこと

**この案で決めたこと**
- 残高と進み具合は、保存せず、API が計算して返す。
- 「さいふより多い」は API ではエラーにしない。

**まだ決めないこと(実装のときに決める)**
- セッションの有効期限と、CSRF の対策の細かさ。
- ログインの失敗回数の制限(最小版では行わない)。
- 一覧のページの大きさ(1 人 1,000 件までなので、まず 50 件ずつの案)。
