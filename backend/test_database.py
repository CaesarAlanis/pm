import os
import tempfile
from backend.database import init_db, get_board_json

def test_database_initialization():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        init_db(db_path)
        board_data = get_board_json("user", db_path)

        assert board_data["user_id"] == "user"
        assert board_data["title"] == "Kanban Studio"
        assert len(board_data["columns"]) == 5
        assert "card-1" in board_data["cards"]
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
