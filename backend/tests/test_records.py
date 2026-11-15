from datetime import timedelta

import pytest

from app.services import month_range, today_jst

OTHER_ID_QUERY = "SELECT id FROM categories WHERE name = :n AND is_default"


@pytest.fixture()
def category_ids(db):
    from sqlalchemy import text

    return {n: db.execute(text(OTHER_ID_QUERY), {"n": n}).scalar_one() for n in ("おやつ", "その他")}


def signup(client, nickname="taro", wallet=1000, savings=0):
    res = client.post(
        "/api/auth/register",
        json={"nickname": nickname, "password": "pass1234",
              "initial_wallet": wallet, "initial_savings": savings},
    )
    assert res.status_code == 201
    return res


def rec(client, type, amount, date=None, **extra):
    body = {"record_date": str(date or today_jst()), "type": type, "amount": amount, **extra}
    return client.post("/api/records", json=body)


def test_requires_login(client):
    assert client.get("/api/balance").status_code == 401
    assert client.get("/api/records").status_code == 401
    assert rec(client, "deposit", 100).status_code == 401


def test_balance_example_from_requirements(client, category_ids):
    """要件定義書 9-1: 初期残高1,000 → お小遣い500 → おやつ100 → 貯金300"""
    signup(client, wallet=1000, savings=0)
    assert client.get("/api/balance").json() == {"wallet": 1000, "savings": 0}
    assert rec(client, "income", 500, income_kind="allowance").status_code == 201
    assert rec(client, "expense", 100, category_id=category_ids["おやつ"]).status_code == 201
    assert rec(client, "deposit", 300).status_code == 201
    assert client.get("/api/balance").json() == {"wallet": 1100, "savings": 300}


def test_withdraw_moves_money_back_to_wallet(client):
    signup(client, wallet=0, savings=1000)
    rec(client, "withdraw", 400)
    assert client.get("/api/balance").json() == {"wallet": 400, "savings": 600}


def test_initial_savings_and_update_me_change_balance(client):
    signup(client, wallet=100, savings=50)
    client.patch("/api/me", json={"initial_wallet": 200, "initial_savings": 70})
    assert client.get("/api/balance").json() == {"wallet": 200, "savings": 70}


def test_overspending_is_allowed(client, category_ids):
    signup(client, wallet=100)
    assert rec(client, "expense", 500, category_id=category_ids["その他"]).status_code == 201
    assert client.get("/api/balance").json()["wallet"] == -400


def test_list_is_newest_first_with_category_info(client, category_ids):
    signup(client)
    today = today_jst()
    rec(client, "deposit", 10, date=today - timedelta(days=2))
    rec(client, "expense", 20, date=today, category_id=category_ids["おやつ"])
    rec(client, "income", 30, date=today - timedelta(days=1), income_kind="otoshidama")
    items = client.get("/api/records").json()
    assert [i["amount"] for i in items] == [20, 30, 10]
    assert items[0]["category_name"] == "おやつ"
    assert items[1]["category_name"] is None


def test_list_filters_by_month_and_pages(client):
    signup(client)
    # 未来の日付は記録できないので、過去の月で確かめる(月の最初と最後の日を含む)
    for d in ("2025-09-30", "2025-10-01", "2025-10-15", "2025-10-31", "2025-11-01"):
        assert rec(client, "deposit", 1, date=d).status_code == 201
    oct_ = client.get("/api/records?month=2025-10").json()
    assert sorted(i["record_date"] for i in oct_) == ["2025-10-01", "2025-10-15", "2025-10-31"]
    assert len(client.get("/api/records?limit=2").json()) == 2
    assert len(client.get("/api/records?limit=2&offset=4").json()) == 1
    assert client.get("/api/records?month=2026-13").status_code == 422


def test_month_range_handles_december():
    from datetime import date

    assert month_range("2026-12") == (date(2026, 12, 1), date(2027, 1, 1))
    assert month_range("2026-02") == (date(2026, 2, 1), date(2026, 3, 1))


@pytest.mark.parametrize(
    "body",
    [
        {"type": "deposit", "amount": 0},
        {"type": "deposit", "amount": -1},
        {"type": "income", "amount": 100},  # income_kind がない
        {"type": "expense", "amount": 100},  # category_id がない
        {"type": "deposit", "amount": 100, "income_kind": "allowance"},
        {"type": "deposit", "amount": 100, "category_id": 1},
        {"type": "gift", "amount": 100},
    ],
)
def test_invalid_input_is_422(client, body):
    signup(client)
    res = client.post("/api/records", json={"record_date": str(today_jst()), **body})
    assert res.status_code == 422


def test_future_date_is_422(client):
    signup(client)
    assert rec(client, "deposit", 100, date=today_jst() + timedelta(days=1)).status_code == 422


def test_unknown_category_is_422(client):
    signup(client)
    assert rec(client, "expense", 100, category_id=999999).status_code == 422


def test_other_users_category_cannot_be_used(client, db):
    from app.models import Category, User

    signup(client, "taro")
    client.post("/api/auth/logout")
    signup(client, "hana")
    hana = db.query(User).filter_by(nickname="hana").one()
    mine = Category(user_id=hana.id, name="ひみつ", color="blue1")
    db.add(mine)
    db.flush()
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"nickname": "taro", "password": "pass1234"})
    assert rec(client, "expense", 100, category_id=mine.id).status_code == 422


def test_update_and_delete(client, category_ids):
    signup(client, wallet=0)
    rid = rec(client, "income", 500, income_kind="allowance").json()["id"]

    res = client.put(
        f"/api/records/{rid}",
        json={"record_date": str(today_jst()), "type": "expense", "amount": 200,
              "category_id": category_ids["おやつ"], "memo": "  ガム "},
    )
    assert res.status_code == 200
    assert res.json()["type"] == "expense"
    assert res.json()["income_kind"] is None
    assert res.json()["memo"] == "ガム"
    assert client.get("/api/balance").json()["wallet"] == -200

    assert client.delete(f"/api/records/{rid}").status_code == 204
    assert client.get(f"/api/records/{rid}").status_code == 404
    assert client.get("/api/balance").json()["wallet"] == 0


def test_cannot_touch_other_users_records(client):
    signup(client, "taro")
    rid = rec(client, "deposit", 100).json()["id"]
    client.post("/api/auth/logout")
    signup(client, "hana")

    assert client.get(f"/api/records/{rid}").status_code == 404
    assert client.put(
        f"/api/records/{rid}",
        json={"record_date": str(today_jst()), "type": "deposit", "amount": 1},
    ).status_code == 404
    assert client.delete(f"/api/records/{rid}").status_code == 404
    assert client.get("/api/records").json() == []
    assert client.get("/api/balance").json() == {"wallet": 1000, "savings": 0}
