# Frontend agent guide

## Purpose

This directory contains the Next.js frontend for the project management MVP. It is currently a demo Kanban experience with local-only state and a test setup for unit and end-to-end coverage.

## Current structure

- app/: App router entry points. The main page renders the Kanban board.
- components/: UI components for the board, cards, columns, and forms.
- lib/: Shared board logic and initial data state.
- tests/: End-to-end tests for the user experience.
- src/test/: Additional test helpers or component-level test assets if present.

## Key files

- src/app/page.tsx: Root page entry that renders the board.
- src/components/KanbanBoard.tsx: Main board container with drag-and-drop behavior and board state.
- src/components/KanbanColumn.tsx: Column rendering and interactions.
- src/components/KanbanCard.tsx: Card details rendering.
- src/components/NewCardForm.tsx: Form for adding cards.
- src/lib/kanban.ts: Shared board data types, sample data, and card movement logic.

## Current implementation notes

- The board is currently a client-side demo with local React state.
- Drag-and-drop is implemented with dnd-kit.
- The app uses TypeScript and Tailwind-style utility classes.
- Tests are run with Vitest for unit tests and Playwright for end-to-end tests.

## Working conventions

- Keep changes simple and aligned with the MVP scope.
- Prefer incremental changes over broad rewrites.
- Preserve existing component boundaries where possible.
- Add or update tests when the UI behavior changes.
- Follow the repository’s guidance to investigate root causes before making fixes.

## Important reminders

- The frontend is not yet wired to the backend or database.
- Authentication and persistence are planned for later milestones.
- The current goal is to keep the existing board experience intact while later milestones add backend integration and AI features.
