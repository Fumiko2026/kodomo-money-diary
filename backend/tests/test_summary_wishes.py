import pytest

from app.services import allocate_savings, months_left

OCT = "2025-10"


def signup(client, nickname="taro", wallet=0, savings=0):
    res = client.post(
        "/api/auth/register",
        json={"nickname": nickname, "password": "pass1234",
              "initial_wallet": wallet, "initial_savings": savings},
    )
    assert res.status_code == 201


def rec(client, date, type, amount, **extra):
    res = client.post("/api/records", json={"record_date": date, "type": type, "amount": amount, **extra})
    assert res.status_code == 201, res.text


def cat(client, name):
    return next(c["id"] for c in client.get("/api/categories").json() if c["name"] == name)


# ---------- 純粋な計算 ----------

@pytest.mark.parametrize(
    "savings,targets,expected",
    [
        (1000, [600, 800], [600, 400]),
        (300, [5000], [300]),
        (0, [100, 200], [0, 0]),
        (-50, [100], [0]),  # マイナスの貯金は 0 として扱う
        (10_000, [100, 200], [100, 200]),
        (500, [], []),
    ],
)
def test_allocate_savings(savings, targets, expected):
    assert allocate_savings(savings, targets) == expected


@pytest.mark.parametrize(
    "target,saved,plan,expected",
    [
        (5000, 300, 800, 6),  # 4,700 ÷ 800 = 5.875 → 6
        (5000, 3000, 1000, 2),  # ちょうど割り切れる
        (5000, 5000, 1000, 0),  # もう貯まっている
        (5000, 300, None, None),  # 計画が空
        (5000, 300, 0, None),  # 計画が 0 円
    ],
)
def test_months_left(target, saved, plan, expected):
    assert months_left(target, saved, plan) == expected


# ---------- 月のまとめ ----------

def test_summary_requires_login_and_valid_month(client):
    assert client.get(f"/api/summary?month={OCT}").status_code == 401
    signup(client)
    assert client.get("/api/summary").status_code == 422
    assert client.get("/api/summary?month=2025-13").status_code == 422


def test_summary_empty_month(client):
    signup(client)
    assert client.get(f"/api/summary?month={OCT}").json() == {
        "month": OCT,
        "income": {"total": 0, "allowance": 0, "otoshidama": 0},
        "expense": {"total": 0, "by_category": []},
        "deposit": 0, "withdraw": 0, "diff": 0,
    }


def test_summary_totals_and_boundaries(client):
    signup(client, wallet=1000)
    snack, toy = cat(client, "おやつ"), cat(client, "おもちゃ")
    rec(client, "2025-09-30", "income", 9999, income_kind="allowance")  # 前の月
    rec(client, "2025-10-01", "income", 500, income_kind="allowance")
    rec(client, "2025-10-15", "income", 3000, income_kind="otoshidama")
    rec(client, "2025-10-20", "expense", 100, category_id=snack)
    rec(client, "2025-10-21", "expense", 150, category_id=snack)
    rec(client, "2025-10-31", "expense", 400, category_id=toy)
    rec(client, "2025-10-25", "deposit", 300)
    rec(client, "2025-10-26", "withdraw", 50)
    rec(client, "2025-11-01", "expense", 7777, category_id=toy)  # 次の月

    body = client.get(f"/api/summary?month={OCT}").json()
    assert body["income"] == {"total": 3500, "allowance": 500, "otoshidama": 3000}
    assert body["expense"]["total"] == 650
    # 多い順
    assert [(c["name"], c["amount"]) for c in body["expense"]["by_category"]] == [
        ("おもちゃ", 400), ("おやつ", 250),
    ]
    assert body["expense"]["by_category"][0]["color"] == "yellow1"
    assert body["deposit"] == 300
    assert body["withdraw"] == 50
    assert body["diff"] == 2850  # 3,500 − 650。貯金の出し入れは入れない


def test_summary_includes_deleted_custom_category_as_other(client):
    signup(client)
    mine = client.post("/api/categories", json={"name": "ゲーム", "color": "blue1"}).json()["id"]
    rec(client, "2025-10-05", "expense", 200, category_id=mine)
    client.delete(f"/api/categories/{mine}")
    by_cat = client.get(f"/api/summary?month={OCT}").json()["expense"]["by_category"]
    assert [(c["name"], c["amount"]) for c in by_cat] == [("その他", 200)]


def test_summary_only_counts_own_records(client):
    signup(client, "taro")
    rec(client, "2025-10-05", "deposit", 500)
    client.post("/api/auth/logout")
    signup(client, "hana")
    assert client.get(f"/api/summary?month={OCT}").json()["deposit"] == 0


# ---------- ほしいもの ----------

def wish(client, name="ゲーム", target=5000, **plans):
    return client.post("/api/wishes", json={"name": name, "target_amount": target, **plans})


def test_wishes_require_login(client):
    assert client.get("/api/wishes").status_code == 401
    assert wish(client).status_code == 401


def test_create_wish_returns_progress(client):
    """画面案 S3 の例: 貯金 300 円、目標 5,000 円、毎月 800 円 → あと 6 か月"""
    signup(client, savings=300)
    res = wish(client, monthly_plan=800, otoshidama_plan=2000)
    assert res.status_code == 201
    body = res.json()
    assert (body["saved"], body["months_left"]) == (300, 6)
    assert body["otoshidama_plan"] == 2000


def test_months_left_is_null_without_monthly_plan(client):
    signup(client, savings=300)
    assert wish(client).json()["months_left"] is None


def test_wish_limit_is_three(client):
    signup(client)
    for i in range(3):
        assert wish(client, f"w{i}").status_code == 201
    res = wish(client, "w4")
    assert res.status_code == 409
    assert "3 つ" in res.json()["detail"]
    # 1 つ消せば、また作れる
    first = client.get("/api/wishes").json()[0]["id"]
    client.delete(f"/api/wishes/{first}")
    assert wish(client, "w5").status_code == 201


def test_savings_fill_wishes_in_creation_order(client):
    signup(client, savings=1000)
    wish(client, "A", 600)
    wish(client, "B", 800)
    items = client.get("/api/wishes").json()
    assert [(w["name"], w["saved"]) for w in items] == [("A", 600), ("B", 400)]


def test_progress_follows_deposits_and_withdrawals(client):
    signup(client, savings=0)
    wish(client, "A", 500)
    rec(client, "2025-10-01", "deposit", 200)
    assert client.get("/api/wishes").json()[0]["saved"] == 200
    rec(client, "2025-10-02", "withdraw", 150)
    assert client.get("/api/wishes").json()[0]["saved"] == 50


def test_update_wish_partial_and_clear_plan(client):
    signup(client)
    wid = wish(client, monthly_plan=500, otoshidama_plan=1000).json()["id"]
    res = client.patch(f"/api/wishes/{wid}", json={"name": "本", "monthly_plan": None})
    body = res.json()
    assert (body["name"], body["monthly_plan"]) == ("本", None)
    assert body["target_amount"] == 5000  # 送っていないものは、そのまま
    assert body["otoshidama_plan"] == 1000
    assert client.patch(f"/api/wishes/{wid}", json={"name": None}).status_code == 422
    assert client.patch(f"/api/wishes/{wid}", json={"target_amount": 0}).status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {"name": "", "target_amount": 100},
        {"name": "a", "target_amount": 0},
        {"name": "a", "target_amount": 100, "monthly_plan": -1},
        {"name": "あ" * 21, "target_amount": 100},
    ],
)
def test_create_wish_rejects_bad_input(client, body):
    signup(client)
    assert client.post("/api/wishes", json=body).status_code == 422


def test_delete_wish_and_other_users_are_404(client):
    signup(client, "taro")
    wid = wish(client).json()["id"]
    client.post("/api/auth/logout")
    signup(client, "hana")
    assert client.patch(f"/api/wishes/{wid}", json={"name": "x"}).status_code == 404
    assert client.delete(f"/api/wishes/{wid}").status_code == 404
    assert client.get("/api/wishes").json() == []

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"nickname": "taro", "password": "pass1234"})
    assert client.delete(f"/api/wishes/{wid}").status_code == 204
    assert client.get("/api/wishes").json() == []
