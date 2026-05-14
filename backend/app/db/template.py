import json
import os

from app.db.connection import get_connection


def seed_templates() -> None:
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM board_templates").fetchone()[0]
        if count > 0:
            return
        templates = [
            {
                "id": "tmpl-kanban",
                "name": "Kanban Board",
                "description": "Simple Kanban board with standard workflow columns",
                "columns": json.dumps(["Backlog", "In Progress", "Review", "Done"]),
            },
            {
                "id": "tmpl-scrum",
                "name": "Scrum Sprint",
                "description": "Sprint-based workflow with backlog grooming and retrospective",
                "columns": json.dumps(["Product Backlog", "Sprint Backlog", "In Progress", "Testing", "Done", "Retrospective"]),
            },
            {
                "id": "tmpl-bug",
                "name": "Bug Tracking",
                "description": "Track bugs from report to resolution",
                "columns": json.dumps(["Reported", "Triaged", "In Progress", "Fixed", "Verified", "Closed"]),
            },
        ]
        for t in templates:
            conn.execute(
                "INSERT INTO board_templates (id, name, description, columns) VALUES (?, ?, ?, ?)",
                (t["id"], t["name"], t["description"], t["columns"]),
            )
        conn.commit()
    finally:
        conn.close()


def get_templates() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT id, name, description, columns FROM board_templates ORDER BY name").fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "name": r["name"],
                "description": r["description"],
                "columns": json.loads(r["columns"]),
            })
        return result
    finally:
        conn.close()


def get_template_by_id(template_id: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT id, name, description, columns FROM board_templates WHERE id = ?", (template_id,)).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "columns": json.loads(row["columns"]),
        }
    finally:
        conn.close()
