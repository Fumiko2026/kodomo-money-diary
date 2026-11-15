"""ER図の制約が、DBで効いているかを確かめる。各テストは終わったら元に戻す。"""

from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Category, Record, User


@pytest.fixture()
def user(db):
    u = User(nickname="test-taro", password_hash="x", initial_wallet=0, initial_savings=0)
    db.add(u)
    db.flush()
    return u


def _other(db):
    return db.query(Category).filter_by(name="その他", is_default=True).one()


def test_health_connects_to_db(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_default_categories_exist(db):
    names = {c.name for c in db.query(Category).filter_by(is_default=True)}
    assert names == {"おやつ", "おもちゃ", "その他"}


def test_valid_expense_is_saved(db, user):
    db.add(
        Record(user_id=user.id, record_date=date(2026, 11, 12), type="expense",
               amount=100, category_id=_other(db).id)
    )
    db.flush()


@pytest.mark.parametrize("amount", [0, -5])
def test_amount_must_be_positive(db, user, amount):
    db.add(Record(user_id=user.id, record_date=date(2026, 11, 12), type="deposit", amount=amount))
    with pytest.raises(IntegrityError):
        db.flush()


def test_income_requires_income_kind(db, user):
    db.add(Record(user_id=user.id, record_date=date(2026, 11, 12), type="income", amount=500))
    with pytest.raises(IntegrityError):
        db.flush()


def test_deposit_must_not_have_income_kind(db, user):
    db.add(Record(user_id=user.id, record_date=date(2026, 11, 12), type="deposit",
                  amount=300, income_kind="allowance"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_expense_requires_category(db, user):
    db.add(Record(user_id=user.id, record_date=date(2026, 11, 12), type="expense", amount=100))
    with pytest.raises(IntegrityError):
        db.flush()


def test_unknown_type_is_rejected(db, user):
    db.add(Record(user_id=user.id, record_date=date(2026, 11, 12), type="gift", amount=100))
    with pytest.raises(IntegrityError):
        db.flush()


def test_nickname_is_unique(db, user):
    db.add(User(nickname="test-taro", password_hash="y"))
    with pytest.raises(IntegrityError):
        db.flush()
