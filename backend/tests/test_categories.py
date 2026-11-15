from app.services import today_jst


def signup(client, nickname="taro"):
    res = client.post(
        "/api/auth/register",
        json={"nickname": nickname, "password": "pass1234", "initial_wallet": 1000},
    )
    assert res.status_code == 201


def names(client):
    return [c["name"] for c in client.get("/api/categories").json()]


def make(client, name="ゲーム", color="blue1"):
    return client.post("/api/categories", json={"name": name, "color": color})


def default_id(client, name):
    return next(c["id"] for c in client.get("/api/categories").json() if c["name"] == name)


def test_requires_login(client):
    assert client.get("/api/categories").status_code == 401
    assert make(client).status_code == 401


def test_list_has_defaults_first(client):
    signup(client)
    make(client)
    items = client.get("/api/categories").json()
    assert [c["name"] for c in items] == ["おやつ", "おもちゃ", "その他", "ゲーム"]
    assert [c["is_default"] for c in items] == [True, True, True, False]


def test_create(client):
    signup(client)
    res = make(client, "  ゲーム ", "green1")
    assert res.status_code == 201
    assert res.json()["name"] == "ゲーム"
    assert res.json()["color"] == "green1"
    assert res.json()["is_default"] is False


def test_create_rejects_bad_input(client):
    signup(client)
    assert make(client, "", "blue1").status_code == 422
    assert make(client, "あ" * 11, "blue1").status_code == 422
    assert make(client, "ゲーム", "#ff0000").status_code == 422  # 8 色以外は使えない


def test_duplicate_name_is_409_including_defaults(client):
    signup(client)
    assert make(client).status_code == 201
    assert make(client).status_code == 409
    assert make(client, "おやつ").status_code == 409


def test_same_name_is_ok_for_different_users(client):
    signup(client, "taro")
    make(client)
    client.post("/api/auth/logout")
    signup(client, "hana")
    assert make(client).status_code == 201
    assert names(client).count("ゲーム") == 1  # 他の人の項目は見えない


def test_update_name_and_color(client):
    signup(client)
    cid = make(client).json()["id"]
    res = client.patch(f"/api/categories/{cid}", json={"color": "pink1"})
    assert res.json()["name"] == "ゲーム"
    assert res.json()["color"] == "pink1"
    res = client.patch(f"/api/categories/{cid}", json={"name": "本"})
    assert res.json()["name"] == "本"
    assert res.json()["color"] == "pink1"


def test_update_to_taken_name_is_409_but_same_name_is_ok(client):
    signup(client)
    a = make(client, "A").json()["id"]
    make(client, "B")
    assert client.patch(f"/api/categories/{a}", json={"name": "B"}).status_code == 409
    assert client.patch(f"/api/categories/{a}", json={"name": "A", "color": "red1"}).status_code == 200


def test_default_categories_cannot_be_changed(client):
    signup(client)
    for name in ("おやつ", "おもちゃ", "その他"):
        cid = default_id(client, name)
        assert client.patch(f"/api/categories/{cid}", json={"name": "x"}).status_code == 403
        assert client.delete(f"/api/categories/{cid}").status_code == 403
        assert client.get(f"/api/categories/{cid}/usage").status_code == 403


def test_cannot_touch_other_users_category(client):
    signup(client, "taro")
    cid = make(client).json()["id"]
    client.post("/api/auth/logout")
    signup(client, "hana")
    assert client.patch(f"/api/categories/{cid}", json={"name": "x"}).status_code == 404
    assert client.delete(f"/api/categories/{cid}").status_code == 404
    assert client.get(f"/api/categories/{cid}/usage").status_code == 404


def test_usage_counts_only_own_records(client):
    signup(client)
    cid = make(client).json()["id"]
    assert client.get(f"/api/categories/{cid}/usage").json() == {"record_count": 0}
    for _ in range(2):
        client.post("/api/records", json={"record_date": str(today_jst()), "type": "expense",
                                          "amount": 10, "category_id": cid})
    assert client.get(f"/api/categories/{cid}/usage").json() == {"record_count": 2}


def test_delete_moves_records_to_other(client):
    signup(client)
    cid = make(client).json()["id"]
    other_id = default_id(client, "その他")
    rid = client.post("/api/records", json={"record_date": str(today_jst()), "type": "expense",
                                            "amount": 300, "category_id": cid}).json()["id"]

    assert client.delete(f"/api/categories/{cid}").status_code == 204

    assert "ゲーム" not in names(client)
    record = client.get(f"/api/records/{rid}").json()
    assert record["category_id"] == other_id
    assert record["category_name"] == "その他"
    # 記録は残るので、さいふの金額は変わらない
    assert client.get("/api/balance").json()["wallet"] == 700


def test_delete_unused_category(client):
    signup(client)
    cid = make(client).json()["id"]
    assert client.delete(f"/api/categories/{cid}").status_code == 204
    assert client.delete(f"/api/categories/{cid}").status_code == 404
