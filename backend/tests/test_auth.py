from app.models import User

NEW = {"nickname": "taro", "password": "pass1234", "initial_wallet": 1000, "initial_savings": 300}


def register(client, **overrides):
    return client.post("/api/auth/register", json={**NEW, **overrides})


def test_register_logs_in_and_returns_me(client):
    res = register(client)
    assert res.status_code == 201
    assert res.json() == {"nickname": "taro", "initial_wallet": 1000, "initial_savings": 300}
    assert client.get("/api/me").json()["nickname"] == "taro"


def test_register_defaults_to_zero(client):
    res = client.post("/api/auth/register", json={"nickname": "hana", "password": "abcd"})
    assert res.status_code == 201
    assert res.json()["initial_wallet"] == 0
    assert res.json()["initial_savings"] == 0


def test_password_is_hashed(client, db):
    register(client)
    user = db.query(User).filter_by(nickname="taro").one()
    assert user.password_hash != "pass1234"
    assert user.password_hash.startswith("$argon2")


def test_duplicate_nickname_is_409(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_register_rejects_bad_input(client):
    assert register(client, nickname="  ").status_code == 422
    assert register(client, password="abc").status_code == 422
    assert register(client, initial_wallet=-1).status_code == 422
    assert register(client, initial_savings=100_000_000).status_code == 422


def test_login_and_logout(client):
    register(client)
    client.post("/api/auth/logout")
    assert client.get("/api/me").status_code == 401

    res = client.post("/api/auth/login", json={"nickname": "taro", "password": "pass1234"})
    assert res.status_code == 200
    assert client.get("/api/me").status_code == 200

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401


def test_login_failure_does_not_reveal_which_is_wrong(client):
    register(client)
    client.post("/api/auth/logout")
    wrong_password = client.post("/api/auth/login", json={"nickname": "taro", "password": "nope"})
    wrong_nickname = client.post("/api/auth/login", json={"nickname": "nobody", "password": "pass1234"})
    assert wrong_password.status_code == wrong_nickname.status_code == 401
    assert wrong_password.json() == wrong_nickname.json()


def test_me_requires_login(client):
    assert client.get("/api/me").status_code == 401
    assert client.patch("/api/me", json={"initial_wallet": 5}).status_code == 401


def test_update_initial_amounts(client):
    register(client)
    res = client.patch("/api/me", json={"initial_wallet": 2000})
    assert res.status_code == 200
    assert res.json()["initial_wallet"] == 2000
    assert res.json()["initial_savings"] == 300  # 送っていない方は、そのまま
    assert client.patch("/api/me", json={"initial_savings": -1}).status_code == 422


def test_session_cookie_is_httponly(client):
    res = register(client)
    cookie = res.headers["set-cookie"].lower()
    assert "kodomo_session=" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
