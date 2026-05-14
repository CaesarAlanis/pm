import os

from app.db.connection import get_connection
from app.db.card import user_can_edit_card


def add_card_link(source_card_id: str, target_card_id: str, link_type: str, username: str) -> dict | None:
    conn = get_connection()
    try:
        if link_type not in ("blocked_by", "relates_to"):
            return None
        if source_card_id == target_card_id:
            return None
        if not user_can_edit_card(conn, source_card_id, username):
            return None
        # Check for duplicate
        existing = conn.execute(
            "SELECT 1 FROM card_links WHERE source_card_id = ? AND target_card_id = ? AND link_type = ?",
            (source_card_id, target_card_id, link_type),
        ).fetchone()
        if existing:
            return None
        # For blocked_by, check for reverse cycle (A blocked_by B, B blocked_by A)
        if link_type == "blocked_by":
            reverse = conn.execute(
                "SELECT 1 FROM card_links WHERE source_card_id = ? AND target_card_id = ? AND link_type = 'blocked_by'",
                (target_card_id, source_card_id),
            ).fetchone()
            if reverse:
                return None
        link_id = f"link-{os.urandom(4).hex()}"
        conn.execute(
            "INSERT INTO card_links (id, source_card_id, target_card_id, link_type) VALUES (?, ?, ?, ?)",
            (link_id, source_card_id, target_card_id, link_type),
        )
        conn.commit()
        return {"id": link_id, "source_card_id": source_card_id, "target_card_id": target_card_id, "link_type": link_type}
    finally:
        conn.close()


def remove_card_link(link_id: str, username: str) -> bool:
    conn = get_connection()
    try:
        link = conn.execute("SELECT source_card_id FROM card_links WHERE id = ?", (link_id,)).fetchone()
        if not link:
            return False
        if not user_can_edit_card(conn, link["source_card_id"], username):
            return False
        conn.execute("DELETE FROM card_links WHERE id = ?", (link_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def get_card_links(card_id: str) -> list[dict]:
    """Get all links involving a card (both as source and target)."""
    conn = get_connection()
    try:
        outgoing = conn.execute(
            """SELECT cl.id, cl.source_card_id, cl.target_card_id, cl.link_type, cl.created_at,
                      c.title as target_title
               FROM card_links cl
               JOIN cards c ON cl.target_card_id = c.id
               WHERE cl.source_card_id = ?
               ORDER BY cl.created_at""",
            (card_id,),
        ).fetchall()
        incoming = conn.execute(
            """SELECT cl.id, cl.source_card_id, cl.target_card_id, cl.link_type, cl.created_at,
                      c.title as source_title
               FROM card_links cl
               JOIN cards c ON cl.source_card_id = c.id
               WHERE cl.target_card_id = ?
               ORDER BY cl.created_at""",
            (card_id,),
        ).fetchall()
        results = []
        for r in outgoing:
            d = dict(r)
            d["direction"] = "outgoing"
            results.append(d)
        for r in incoming:
            d = dict(r)
            d["direction"] = "incoming"
            results.append(d)
        return results
    finally:
        conn.close()
