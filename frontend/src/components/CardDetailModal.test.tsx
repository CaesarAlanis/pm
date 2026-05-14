import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardDetailModal } from "@/components/CardDetailModal";
import type { Card } from "@/lib/kanban";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const baseCard: Card = {
  id: "card-1",
  title: "Design Feature",
  details: "Create mockups for new feature",
  priority: "high",
  due_date: "2026-12-31",
  labels: ["design", "frontend"],
};

describe("CardDetailModal", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/comments")) {
        return jsonOk({ comments: [] });
      }
      if (url.includes("/assignees")) {
        return jsonOk({ assignees: [] });
      }
      if (url.includes("/checklists")) {
        return jsonOk({ checklists: [] });
      }
      return jsonOk({});
    });
  });

  it("renders modal with card title", () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    expect(screen.getByDisplayValue("Design Feature")).toBeInTheDocument();
  });

  it("shows tabs for Details, Comments, Checklists", async () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    expect(screen.getAllByText("Details").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Comments (0)")).toBeInTheDocument();
    expect(screen.getByText("Checklists (0/0)")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={onClose}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows priority selector", () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("shows labels in input", () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    expect(screen.getByDisplayValue("design, frontend")).toBeInTheDocument();
  });

  it("shows due date", () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    const dateInput = screen.getByDisplayValue("2026-12-31");
    expect(dateInput).toBeInTheDocument();
  });

  it("calls onSave with updated card data on save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CardDetailModal
        card={baseCard}
        onSave={onSave}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    const titleInput = screen.getByDisplayValue("Design Feature");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Title");
    await userEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalled();
  });
});
