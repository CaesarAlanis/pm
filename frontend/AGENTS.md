# Frontend -- Kanban Board

## Overview

A Next.js 16 single-page app rendering a Kanban board with drag-and-drop, inline column renaming, and card CRUD. Built with React 19, Tailwind CSS v4, and @dnd-kit.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 (PostCSS plugin, no tailwind.config.js)
- @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
- Vitest + Testing Library for unit/integration tests
- Playwright for e2e tests

## Folder Structure

```
src/
  app/
    layout.tsx        -- Root layout (fonts, metadata)
    page.tsx          -- Home page, renders <KanbanBoard />
    globals.css       -- CSS custom properties, Tailwind v4 import
  components/
    KanbanBoard.tsx   -- State owner, DndContext provider
    KanbanColumn.tsx  -- Droppable column with inline title edit
    KanbanCard.tsx    -- Sortable/draggable card
    KanbanCardPreview.tsx -- Static card in DragOverlay
    NewCardForm.tsx   -- Inline form to add a card
  lib/
    kanban.ts         -- Types (BoardData, Column, Card), seed data, moveCard(), createId()
  test/
    setup.ts          -- jest-dom matchers
    vitest.d.ts       -- Type references
tests/
  kanban.spec.ts      -- Playwright e2e tests
```

## State Management

All state lives in KanbanBoard via React useState. No external state library.

- `board` (BoardData): columns[] + cards lookup map
- `activeCardId` (string | null): tracks dragged card for DragOverlay

Pure logic (moveCard) is extracted into lib/kanban.ts, decoupled from React.

## Data Model

- BoardData: { columns: Column[], cards: Record<string, Card> }
- Column: { id, title, cardIds[] } -- cardIds is the canonical sort order
- Card: { id, title, details }

Normalized structure: columns reference cards by ID, cards live in a flat map.

## Testing

- Unit/integration: `vitest` (jsdom), files in `src/**/*.{test,spec}.{ts,tsx}`
- E2e: `playwright`, files in `tests/*.spec.ts`
- Coverage: v8 provider, text + html output

## Design Tokens (CSS custom properties)

- Accent Turquoise: #00CCA2
- Dark Teal Primary: #132E35
- Gray Text: #888888
