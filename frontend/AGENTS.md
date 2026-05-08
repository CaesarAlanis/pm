# Frontend Agent Guidance

## Purpose
This file describes the existing frontend code in `frontend/` and explains how it is currently structured. It is intended for the agent to understand the current implementation before making backend integration changes.

## Frontend architecture
- `frontend/src/app/page.tsx`
  - The app entrypoint for the Next.js route `/`.
  - Gates the app behind the dummy login.
  - Stores the local authenticated state in `localStorage`.
  - Renders the `KanbanBoard` client component after login.

- `frontend/src/components/KanbanBoard.tsx`
  - Client-side component using React state and DnD Kit.
  - Loads and saves `BoardData` through the backend API.
  - Supports column rename, card creation, card deletion, and drag/drop card movement.
  - Includes the AI chat sidebar.
  - Applies valid AI `boardUpdate` responses and persists the updated board.
  - Uses `DndContext` and `DragOverlay` from `@dnd-kit/core`.
  - Contains the main page layout and board header.

- `frontend/src/components/KanbanColumn.tsx`
  - Renders a single column with a title input, card list, and add-card form.
  - Uses `useDroppable` to accept dragged cards.
  - Uses `SortableContext` for vertical card order.

- `frontend/src/components/KanbanCard.tsx`
  - Renders each card with drag handles and a remove button.
  - Uses `useSortable` for drag interactions.

- `frontend/src/components/KanbanCardPreview.tsx`
  - Renders the preview card shown during drag overlay.

- `frontend/src/components/NewCardForm.tsx`
  - Renders a toggled add-card UI inside each column.
  - Handles form submission and validation for new cards.

- `frontend/src/components/LoginScreen.tsx`
  - Renders a local login form for dummy credentials.
  - Validates `user` / `password` and invokes a callback on success.

- `frontend/src/lib/api.ts`
  - Wraps backend API calls for board fetch/save and AI chat.

- `frontend/src/lib/kanban.ts`
  - Defines types: `Card`, `Column`, and `BoardData`.
  - Exports `initialData` with 5 columns and sample cards.
  - Implements `moveCard` helper for moving cards across and within columns.
  - Implements `createId` helper for new card IDs.

## Current limitations
- Authentication is local only and uses hardcoded dummy credentials.
- Chat history is kept in React state and is not persisted.
- Live AI requires `OPENROUTER_API_KEY` in the project root `.env`.

## Testing and build
- `frontend/package.json` includes scripts for `dev`, `build`, `start`, `lint`, `test`, and `test:e2e`.
- The frontend uses Next.js 16, React 19, Tailwind CSS, Vitest, and Playwright.

## Integration notes
- Keep the board shape aligned with `frontend/src/lib/kanban.ts`.
- The backend expects `/api/chat` requests to include prior conversation history, the current board, and the latest user message.
- AI board updates should replace the current board only after backend validation.
