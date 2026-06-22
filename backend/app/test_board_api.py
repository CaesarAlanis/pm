from pathlib import Path

from fastapi.testclient import TestClient

from app.main import ACCESS_TOKEN, app, store


client = TestClient(app)
store.bootstrap()


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {ACCESS_TOKEN}"}


def _first_column_id(board: dict) -> str:
    return board["columns"][0]["id"]


def _first_card_id(board: dict) -> str:
    return board["columns"][0]["cardIds"][0]


def test_database_bootstrap_creates_file_and_schema() -> None:
    db_path = Path(store.db_path)
    assert db_path.exists()

    response = client.get("/api/board", headers=_auth_headers())
    assert response.status_code == 200
    board = response.json()
    assert len(board["columns"]) == 5


def test_unauthorized_requests_are_rejected() -> None:
    response = client.get("/api/board")
    assert response.status_code == 401


def test_authenticated_board_fetch_shape() -> None:
    response = client.get("/api/board", headers=_auth_headers())
    assert response.status_code == 200
    board = response.json()
    assert "columns" in board
    assert "cards" in board


def test_rename_column_mutation() -> None:
    board = client.get("/api/board", headers=_auth_headers()).json()
    column_id = _first_column_id(board)

    response = client.patch(
        "/api/board/columns/rename",
        json={"column_id": column_id, "title": "New Backlog"},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["columns"][0]["title"] == "New Backlog"


def test_create_update_delete_card_mutations() -> None:
    board = client.get("/api/board", headers=_auth_headers()).json()
    column_id = _first_column_id(board)

    created_response = client.post(
        "/api/board/cards",
        json={
            "column_id": column_id,
            "title": "API Created Card",
            "details": "Created in pytest",
        },
        headers=_auth_headers(),
    )
    assert created_response.status_code == 200
    created_board = created_response.json()

    new_card_id = created_board["columns"][0]["cardIds"][-1]
    assert created_board["cards"][new_card_id]["title"] == "API Created Card"

    updated_response = client.patch(
        "/api/board/cards",
        json={"card_id": new_card_id, "title": "Updated Card"},
        headers=_auth_headers(),
    )
    assert updated_response.status_code == 200
    updated_board = updated_response.json()
    assert updated_board["cards"][new_card_id]["title"] == "Updated Card"

    deleted_response = client.request(
        "DELETE",
        "/api/board/cards",
        json={"card_id": new_card_id},
        headers=_auth_headers(),
    )
    assert deleted_response.status_code == 200
    deleted_board = deleted_response.json()
    assert new_card_id not in deleted_board["cards"]


def test_move_card_mutation() -> None:
    board = client.get("/api/board", headers=_auth_headers()).json()
    card_id = _first_card_id(board)
    review_column = next(
        column for column in board["columns"] if column["title"] == "Review"
    )

    response = client.post(
        "/api/board/cards/move",
        json={
            "card_id": card_id,
            "target_column_id": review_column["id"],
            "target_index": 0,
        },
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    updated = response.json()
    moved_column = next(
        column for column in updated["columns"] if column["id"] == review_column["id"]
    )
    assert moved_column["cardIds"][0] == card_id


def test_invalid_payload_responses() -> None:
    board = client.get("/api/board", headers=_auth_headers()).json()
    column_id = _first_column_id(board)

    response_empty_title = client.post(
        "/api/board/cards",
        json={"column_id": column_id, "title": "   ", "details": "x"},
        headers=_auth_headers(),
    )
    assert response_empty_title.status_code == 400

    response_bad_move = client.post(
        "/api/board/cards/move",
        json={
            "card_id": "card-999999",
            "target_column_id": column_id,
            "target_index": -1,
        },
        headers=_auth_headers(),
    )
    assert response_bad_move.status_code == 400