from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "<!DOCTYPE html>" in response.text

def test_login_success():
    response = client.post("/api/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["username"] == "user"

def test_login_invalid_credentials():
    response = client.post("/api/login", json={"username": "invalid", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"

def test_logout():
    response = client.post("/api/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_get_board():
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "user"
    assert len(data["columns"]) == 5

def test_create_update_delete_card():
    # Create card
    create_res = client.post("/api/cards", json={
        "column_id": "col-backlog",
        "title": "Test Card API",
        "details": "Details here"
    })
    assert create_res.status_code == 200
    card_id = create_res.json()["card_id"]

    # Update card
    update_res = client.put(f"/api/cards/{card_id}", json={
        "title": "Updated Card Title",
        "column_id": "col-progress"
    })
    assert update_res.status_code == 200

    # Verify board state
    board_res = client.get("/api/board")
    assert board_res.json()["cards"][card_id]["title"] == "Updated Card Title"

    # Delete card
    delete_res = client.delete(f"/api/cards/{card_id}")
    assert delete_res.status_code == 200

    # Verify deleted
    board_res2 = client.get("/api/board")
    assert card_id not in board_res2.json()["cards"]

def test_rename_column():
    rename_res = client.put("/api/columns/col-backlog", json={"title": "Ideas Backlog"})
    assert rename_res.status_code == 200

    board_res = client.get("/api/board")
    backlog_col = next(c for c in board_res.json()["columns"] if c["id"] == "col-backlog")
    assert backlog_col["title"] == "Ideas Backlog"
