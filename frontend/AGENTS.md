# Frontend Architecture & Component Guidelines

## Overview

The frontend is built with Next.js 16 (App Router), React 19, TypeScript, and TailwindCSS v4. It features a responsive, single-board Kanban UI using `@dnd-kit` for drag-and-drop interaction.

## File & Folder Structure

- `src/app/`
  - `page.tsx`: Entry page rendering `KanbanBoard`.
  - `layout.tsx`: Root layout with styling and metadata.
  - `globals.css`: Global styles and custom CSS design variables.
- `src/components/`
  - `KanbanBoard.tsx`: Main board container managing top-level state (`BoardData`), drag-and-drop context (`DndContext`), column renames, card creation, and card deletion.
  - `KanbanColumn.tsx`: Displays a single column, drop target, header editing, card list, and card creation trigger (`NewCardForm`).
  - `KanbanCard.tsx`: Individual draggable card component (`useSortable`).
  - `KanbanCardPreview.tsx`: Visual feedback layer shown inside `<DragOverlay>` during drag operation.
  - `NewCardForm.tsx`: Inline card creation form with title and details inputs.
  - `KanbanBoard.test.tsx`: Component tests.
- `src/lib/`
  - `kanban.ts`: Types (`Card`, `Column`, `BoardData`), `initialData` fixture, `moveCard()` helper, and `createId()` generator.
- `tests/`
  - Playwright end-to-end tests.

## State Management

- **Board Structure**: `BoardData` holds `columns` (array of `Column` objects containing `cardIds`) and `cards` (dictionary mapping `cardId` to `Card`).
- **Drag & Drop**: Managed via `@dnd-kit/core` (`PointerSensor`, `closestCorners`, `DragOverlay`).

## Color Token Variables

Defined in `globals.css` matching project standards:
- `--accent-yellow`: `#ecad0a`
- `--primary-blue`: `#209dd7`
- `--purple-secondary`: `#753991`
- `--navy-dark`: `#032147`
- `--gray-text`: `#888888`

## Testing

- **Unit / Component Tests**: Run via `npm run test:unit` (Vitest + React Testing Library).
- **End-to-End Tests**: Run via `npm run test:e2e` (Playwright).
- **All Tests**: Run via `npm run test:all`.
