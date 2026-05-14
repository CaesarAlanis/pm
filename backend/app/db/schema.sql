CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL DEFAULT 'My Board',
    description TEXT NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id),
    title TEXT NOT NULL,
    position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES columns(id),
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
    due_date TEXT,
    labels TEXT NOT NULL DEFAULT '',
    story_points INTEGER,
    estimated_hours REAL,
    actual_hours REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(archived);
CREATE INDEX IF NOT EXISTS idx_boards_favorite ON boards(favorite);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);

CREATE TABLE IF NOT EXISTS board_members (
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_board_id ON activity_log(board_id);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE TABLE IF NOT EXISTS card_assignees (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignees_user_id ON card_assignees(user_id);

CREATE TABLE IF NOT EXISTS checklists (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id);

CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_board_id ON notifications(board_id);

CREATE TABLE IF NOT EXISTS board_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    columns TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token TEXT PRIMARY KEY,
    revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_session_versions (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS card_attachments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT '',
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_card_attachments_card_id ON card_attachments(card_id);

CREATE TABLE IF NOT EXISTS card_links (
    id TEXT PRIMARY KEY,
    source_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL CHECK (link_type IN ('blocked_by', 'relates_to')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_card_id, target_card_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_card_links_source ON card_links(source_card_id);
CREATE INDEX IF NOT EXISTS idx_card_links_target ON card_links(target_card_id);

CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    hours REAL NOT NULL CHECK (hours > 0),
    logged_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_time_logs_card_id ON time_logs(card_id);

CREATE TRIGGER IF NOT EXISTS boards_updated_at
AFTER UPDATE ON boards
FOR EACH ROW
WHEN OLD.title IS NOT NEW.title OR OLD.description IS NOT NEW.description OR OLD.archived IS NOT NEW.archived OR OLD.favorite IS NOT NEW.favorite
BEGIN
    UPDATE boards SET updated_at = datetime('now') WHERE id = NEW.id;
END;
