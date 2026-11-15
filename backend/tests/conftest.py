import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.main import app


@pytest.fixture()
def db():
    """各テストは外側のトランザクションごと rollback する(DB に何も残さない)。"""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """API が使う DB セッションを、テスト用のものに差し替える。"""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
