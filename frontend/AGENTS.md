# Frontend demo overview

This directory contains a standalone Next.js App Router demo of the Kanban UI.

## Key entry points

- `src/app/page.tsx` renders the single `KanbanBoard` component.
- `src/app/layout.tsx` sets up fonts and document metadata.
- `src/app/globals.css` defines the color palette and global styles.

## Core UI components

- `src/components/KanbanBoard.tsx` owns local board state, drag-and-drop wiring,
  and the top-level layout.
- `src/components/KanbanColumn.tsx` renders a column, its cards, and rename/add UI.
- `src/components/KanbanCard.tsx` renders a draggable card with delete support.
- `src/components/NewCardForm.tsx` handles creating a new card in a column.
- `src/components/KanbanCardPreview.tsx` is used in the drag overlay.

## Data model

- `src/lib/kanban.ts` defines `Card`, `Column`, and `BoardData` types, initial
  mock data, and a helper to reorder/move cards.

## Tooling and tests

- Unit tests use Vitest + Testing Library (`src/components/*.test.tsx`,
  `src/lib/*.test.ts`).
- End-to-end tests use Playwright (`tests/kanban.spec.ts`).
- `npm run test:unit` runs Vitest and `npm run test:e2e` runs Playwright.

## Dependencies

- Next.js 16 (App Router), React 19, Tailwind CSS v4.
- Drag and drop via `@dnd-kit/*`.
