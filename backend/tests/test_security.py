"""Tests for access control, IDOR prevention, and session security."""
import os

os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient

from main import app

CSRF_HEADER = {"X-Requested-With": "fetch"}
_counter = 0


def _unique(prefix: str) -> str:
    global _counter
    _counter += 1
    return f"{prefix}{os.urandom(3).hex()}{_counter}"


def register_and_login(password: str = "password123") -> tuple[dict, str]:
    """Register a user and return (cookies_dict, username)."""
    username = _unique("sec")
    client = TestClient(app)
    client.post("/api/auth/register", json={"username": username, "password": password}, headers=CSRF_HEADER)
    resp = client.post("/api/auth/login", json={"username": username, "password": password}, headers=CSRF_HEADER)
    return {"session_token": resp.cookies["session_token"]}, username


def create_board(cookies: dict) -> str:
    client = TestClient(app)
    resp = client.post("/api/boards", json={"title": "Test Board"}, cookies=cookies, headers=CSRF_HEADER)
    return resp.json()["id"]


def create_card(cookies: dict, column_id: str, card_id: str) -> None:
    client = TestClient(app)
    client.post(
        "/api/boards/cards",
        json={"column_id": column_id, "id": card_id, "title": "Test Card", "details": "test"},
        cookies=cookies,
        headers=CSRF_HEADER,
    )


def get_first_column_id(board_id: str, cookies: dict) -> str:
    client = TestClient(app)
    resp = client.get(f"/api/boards/{board_id}", cookies=cookies, headers=CSRF_HEADER)
    return resp.json()["columns"][0]["id"]


# --- IDOR Tests ---

class TestBoardIDOR:
    def test_user_cannot_read_other_users_board(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.get(f"/api/boards/{board_id}", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 404

    def test_user_cannot_rename_other_users_board(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.put(f"/api/boards/{board_id}", json={"title": "Hacked"}, cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 404

    def test_user_cannot_delete_other_users_board(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.delete(f"/api/boards/{board_id}", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 404


class TestCardDetailIDOR:
    def test_user_cannot_read_other_users_card_comments(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)
        col_id = get_first_column_id(board_id, cookies_a)
        card_id = _unique("card")
        create_card(cookies_a, col_id, card_id)

        client = TestClient(app)
        resp = client.get(f"/api/boards/cards/{card_id}/comments", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 403

    def test_user_cannot_read_other_users_card_assignees(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)
        col_id = get_first_column_id(board_id, cookies_a)
        card_id = _unique("card")
        create_card(cookies_a, col_id, card_id)

        client = TestClient(app)
        resp = client.get(f"/api/boards/cards/{card_id}/assignees", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 403

    def test_user_cannot_read_other_users_card_checklists(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)
        col_id = get_first_column_id(board_id, cookies_a)
        card_id = _unique("card")
        create_card(cookies_a, col_id, card_id)

        client = TestClient(app)
        resp = client.get(f"/api/boards/cards/{card_id}/checklists", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 403

    def test_user_cannot_comment_on_other_users_card(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)
        col_id = get_first_column_id(board_id, cookies_a)
        card_id = _unique("card")
        create_card(cookies_a, col_id, card_id)

        client = TestClient(app)
        resp = client.post(
            f"/api/boards/cards/{card_id}/comments",
            json={"content": "Unauthorized comment"},
            cookies=cookies_b,
            headers=CSRF_HEADER,
        )
        assert resp.status_code == 403


class TestCollaborationIDOR:
    def test_user_cannot_view_other_users_board_members(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.get(f"/api/boards/{board_id}/members", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 403

    def test_user_cannot_view_other_users_board_activity(self):
        cookies_a, _ = register_and_login()
        cookies_b, _ = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.get(f"/api/boards/{board_id}/activity", cookies=cookies_b, headers=CSRF_HEADER)
        assert resp.status_code == 403

    def test_user_cannot_invite_to_other_users_board(self):
        cookies_a, _ = register_and_login()
        cookies_b, username_b = register_and_login()
        board_id = create_board(cookies_a)

        client = TestClient(app)
        resp = client.post(
            f"/api/boards/{board_id}/members",
            json={"board_id": board_id, "username": username_b, "role": "editor"},
            cookies=cookies_b,
            headers=CSRF_HEADER,
        )
        assert resp.status_code == 403


class TestBoardMemberAccess:
    def test_board_member_can_view_board(self):
        cookies_owner, _ = register_and_login()
        cookies_member, username_member = register_and_login()
        board_id = create_board(cookies_owner)

        client = TestClient(app)
        # Owner invites member
        client.post(
            f"/api/boards/{board_id}/members",
            json={"board_id": board_id, "username": username_member, "role": "editor"},
            cookies=cookies_owner,
            headers=CSRF_HEADER,
        )

        resp = client.get(f"/api/boards/{board_id}", cookies=cookies_member, headers=CSRF_HEADER)
        assert resp.status_code == 200

    def test_board_member_can_add_card(self):
        cookies_owner, _ = register_and_login()
        cookies_member, username_member = register_and_login()
        board_id = create_board(cookies_owner)

        client = TestClient(app)
        client.post(
            f"/api/boards/{board_id}/members",
            json={"board_id": board_id, "username": username_member, "role": "editor"},
            cookies=cookies_owner,
            headers=CSRF_HEADER,
        )

        col_id = get_first_column_id(board_id, cookies_owner)
        card_id = _unique("mcard")
        resp = client.post(
            "/api/boards/cards",
            json={"column_id": col_id, "id": card_id, "title": "Member Card", "details": "Added by member"},
            cookies=cookies_member,
            headers=CSRF_HEADER,
        )
        assert resp.status_code == 200

    def test_viewer_cannot_add_card(self):
        cookies_owner, _ = register_and_login()
        cookies_viewer, username_viewer = register_and_login()
        board_id = create_board(cookies_owner)

        client = TestClient(app)
        client.post(
            f"/api/boards/{board_id}/members",
            json={"board_id": board_id, "username": username_viewer, "role": "viewer"},
            cookies=cookies_owner,
            headers=CSRF_HEADER,
        )

        col_id = get_first_column_id(board_id, cookies_owner)
        card_id = _unique("vcard")
        resp = client.post(
            "/api/boards/cards",
            json={"column_id": col_id, "id": card_id, "title": "Viewer Card", "details": "Should fail"},
            cookies=cookies_viewer,
            headers=CSRF_HEADER,
        )
        assert resp.status_code == 400

    def test_member_sees_board_in_list(self):
        cookies_owner, _ = register_and_login()
        cookies_member, username_member = register_and_login()
        board_id = create_board(cookies_owner)

        client = TestClient(app)
        client.post(
            f"/api/boards/{board_id}/members",
            json={"board_id": board_id, "username": username_member, "role": "editor"},
            cookies=cookies_owner,
            headers=CSRF_HEADER,
        )

        resp = client.get("/api/boards", cookies=cookies_member, headers=CSRF_HEADER)
        board_ids = [b["id"] for b in resp.json()["boards"]]
        assert board_id in board_ids


class TestSessionSecurity:
    def test_password_change_invalidates_old_sessions(self):
        cookies, _ = register_and_login("oldpassword123")
        # Change password
        client = TestClient(app)
        resp = client.put(
            "/api/auth/password",
            json={"current_password": "oldpassword123", "new_password": "newpassword456"},
            cookies=cookies,
            headers=CSRF_HEADER,
        )
        assert resp.status_code == 200

        # Old cookie should be invalid (revoked or version mismatch)
        old_token = cookies["session_token"]
        resp = client.get("/api/auth/me", cookies={"session_token": old_token})
        assert resp.status_code == 401

    def test_revoked_token_cannot_access(self):
        cookies, _ = register_and_login()
        client = TestClient(app)
        # Logout revokes the token
        client.post("/api/auth/logout", cookies=cookies, headers=CSRF_HEADER)
        # Try to access
        resp = client.get("/api/auth/me", cookies=cookies)
        assert resp.status_code == 401


class TestLIKEInjection:
    def test_like_wildcards_escaped_in_user_search(self):
        cookies, _ = register_and_login()
        # Create a user with % in search shouldn't match everyone
        client = TestClient(app)
        resp = client.get("/api/auth/users/search?q=%", cookies=cookies, headers=CSRF_HEADER)
        # Should return results that literally contain %, not everything
        usernames = resp.json().get("users", [])
        # Most normal usernames don't contain % so this should be empty or very short
        # The key test is it doesn't return all users
        from app.db.connection import get_connection
        conn = get_connection()
        total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
        # If LIKE wildcards weren't escaped, searching % would return all users
        # With escaping, it should return very few (only users with literal % in name)
        assert len(usernames) < total_users
