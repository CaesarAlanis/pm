import os

from app.db.connection import get_connection, user_owns_card


def add_checklist(card_id: str, title: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        if not user_owns_card(conn, card_id, username):
            return None
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM checklists WHERE card_id = ?",
            (card_id,),
        ).fetchone()[0]
        checklist_id = f"chl-{os.urandom(6).hex()}"
        conn.execute(
            "INSERT INTO checklists (id, card_id, title, position) VALUES (?, ?, ?, ?)",
            (checklist_id, card_id, title, max_pos + 1),
        )
        conn.commit()
        return {"id": checklist_id, "card_id": card_id, "title": title, "items": []}
    finally:
        conn.close()


def get_checklists_for_card(card_id: str) -> list[dict]:
    conn = get_connection()
    try:
        lists = conn.execute(
            "SELECT id, card_id, title, position FROM checklists WHERE card_id = ? ORDER BY position",
            (card_id,),
        ).fetchall()
        result = []
        for cl in lists:
            items = conn.execute(
                "SELECT id, content, checked, position FROM checklist_items WHERE checklist_id = ? ORDER BY position",
                (cl["id"],),
            ).fetchall()
            result.append({
                "id": cl["id"],
                "card_id": cl["card_id"],
                "title": cl["title"],
                "position": cl["position"],
                "items": [dict(i) for i in items],
            })
        return result
    finally:
        conn.close()


def delete_checklist(checklist_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        checklist = conn.execute("SELECT card_id FROM checklists WHERE id = ?", (checklist_id,)).fetchone()
        if not checklist:
            return False
        if not user_owns_card(conn, checklist["card_id"], username):
            return False
        cur = conn.execute("DELETE FROM checklists WHERE id = ?", (checklist_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def add_checklist_item(checklist_id: str, content: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        checklist = conn.execute("SELECT card_id FROM checklists WHERE id = ?", (checklist_id,)).fetchone()
        if not checklist:
            return None
        if not user_owns_card(conn, checklist["card_id"], username):
            return None
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM checklist_items WHERE checklist_id = ?",
            (checklist_id,),
        ).fetchone()[0]
        item_id = f"chi-{os.urandom(6).hex()}"
        conn.execute(
            "INSERT INTO checklist_items (id, checklist_id, content, position) VALUES (?, ?, ?, ?)",
            (item_id, checklist_id, content, max_pos + 1),
        )
        conn.commit()
        return {"id": item_id, "checklist_id": checklist_id, "content": content, "checked": 0, "position": max_pos + 1}
    finally:
        conn.close()


def toggle_checklist_item(item_id: str, checked: bool, username: str) -> bool:
    conn = get_connection()
    try:
        item = conn.execute(
            """SELECT ci.checklist_id FROM checklist_items ci
               JOIN checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = ?""",
            (item_id,),
        ).fetchone()
        if not item:
            return False
        checklist = conn.execute("SELECT card_id FROM checklists WHERE id = ?", (item["checklist_id"],)).fetchone()
        if not checklist:
            return False
        if not user_owns_card(conn, checklist["card_id"], username):
            return False
        cur = conn.execute(
            "UPDATE checklist_items SET checked = ? WHERE id = ?",
            (1 if checked else 0, item_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_checklist_item(item_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        item = conn.execute(
            """SELECT ci.checklist_id FROM checklist_items ci
               JOIN checklists cl ON ci.checklist_id = cl.id
               WHERE ci.id = ?""",
            (item_id,),
        ).fetchone()
        if not item:
            return False
        checklist = conn.execute("SELECT card_id FROM checklists WHERE id = ?", (item["checklist_id"],)).fetchone()
        if not checklist:
            return False
        if not user_owns_card(conn, checklist["card_id"], username):
            return False
        cur = conn.execute("DELETE FROM checklist_items WHERE id = ?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
