INSERT INTO users (id, username, password_hash)
VALUES ('user-1', 'user', 'password');

INSERT INTO boards (id, user_id, title)
VALUES ('board-1', 'user-1', 'My Board');

INSERT INTO columns (id, board_id, title, position) VALUES
    ('col-backlog', 'board-1', 'Backlog', 0),
    ('col-discovery', 'board-1', 'Discovery', 1),
    ('col-progress', 'board-1', 'In Progress', 2),
    ('col-review', 'board-1', 'Review', 3),
    ('col-done', 'board-1', 'Done', 4);

INSERT INTO cards (id, column_id, title, details, position) VALUES
    ('card-1', 'col-backlog', 'Align roadmap themes', 'Draft quarterly themes with impact statements and metrics.', 0),
    ('card-2', 'col-backlog', 'Gather customer signals', 'Review support tags, sales notes, and churn feedback.', 1),
    ('card-3', 'col-discovery', 'Prototype analytics view', 'Sketch initial dashboard layout and key drill-downs.', 0),
    ('card-4', 'col-progress', 'Refine status language', 'Standardize column labels and tone across the board.', 0),
    ('card-5', 'col-progress', 'Design card layout', 'Add hierarchy and spacing for scanning dense lists.', 1),
    ('card-6', 'col-review', 'QA micro-interactions', 'Verify hover, focus, and loading states.', 0),
    ('card-7', 'col-done', 'Ship marketing page', 'Final copy approved and asset pack delivered.', 0),
    ('card-8', 'col-done', 'Close onboarding sprint', 'Document release notes and share internally.', 1);
