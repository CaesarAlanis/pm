# Database approach for the MVP

## Summary

The MVP uses SQLite for local persistence. This keeps the application simple and avoids introducing a separate database service during the initial build.

## Why SQLite

- The app runs locally in a container.
- The MVP only needs one board per signed-in user.
- SQLite is easy to set up and works well with a file-based local database.
- The schema is simple enough to evolve later if the product grows.

## Proposed schema

The schema is designed around four core entities:

- users: stores the user identity for the MVP login flow.
- boards: stores the board container for a user.
- columns: stores the board columns and their order.
- cards: stores the cards and their current column assignment.

## MVP assumptions

- There is one board per user.
- Columns are fixed in the MVP but can be renamed by the user.
- Cards can be moved between columns.
- The app creates the database automatically if it does not exist.

## Future direction

This design is intentionally simple, but it can support future extension to multiple boards or more advanced collaborative features without a full rewrite.
