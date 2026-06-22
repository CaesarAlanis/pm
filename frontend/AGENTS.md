# Frontend Codebase Notes

This document describes the current frontend implementation in `frontend/`.

## Scope

- Framework: Next.js app router.
- Language: TypeScript + React.
- Styling: Tailwind CSS (with custom tokens in global styles).
- Current mode: frontend-only demo board (no backend integration yet).

## Current Entry Points

- `src/app/page.tsx`: renders `KanbanBoard` as the home page.
- `src/app/layout.tsx`: root app layout.
- `src/app/globals.css`: global style tokens and base styles.

## Main UI Components

- `src/components/KanbanBoard.tsx`
  - Holds board state in React state.
  - Uses `@dnd-kit/core` for drag-and-drop.
  - Supports column rename, add card, delete card, move card.
- `src/components/KanbanColumn.tsx`: renders one column and its cards.
- `src/components/KanbanCard.tsx`: renders card UI.
- `src/components/KanbanCardPreview.tsx`: drag overlay preview.
- `src/components/NewCardForm.tsx`: add-card form inside a column.

## Board Data and Logic

- `src/lib/kanban.ts`
  - Exports board types (`Card`, `Column`, `BoardData`).
  - Defines `initialData` with five columns and starter cards.
  - Contains `moveCard` helper for intra/inter-column reordering.
  - Contains `createId` helper for generating new card IDs.

## Testing Setup

- Unit tests: Vitest + Testing Library.
  - Example files: `src/components/KanbanBoard.test.tsx`, `src/lib/kanban.test.ts`.
- E2E tests: Playwright.
  - Example file: `tests/kanban.spec.ts`.
- Scripts (from `package.json`):
  - `npm run test:unit`
  - `npm run test:e2e`
  - `npm run test:e2e:container`
  - `npm run test:all`

## Build/Run Scripts

- Dev server: `npm run dev`
- Production build: `npm run build`
- Production runtime: `npm run start`

## Notes for Upcoming Integration

- Current state is entirely client-side and ephemeral.
- Future integration should preserve existing component responsibilities where possible.
- Keep interaction behavior stable while replacing local mutations with API-backed flows.