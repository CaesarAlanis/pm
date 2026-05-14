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

const setupMocks = () => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/comments")) return jsonOk({ comments: [] });
    if (url.includes("/assignees")) return jsonOk({ assignees: [] });
    if (url.includes("/checklists")) return jsonOk({ checklists: [] });
    if (url.includes("/attachments")) return jsonOk({ attachments: [] });
    if (url.includes("/links")) return jsonOk({ links: [] });
    if (url.includes("/time")) return jsonOk({ logs: [] });
    return jsonOk({});
  });
};

describe("CardDetailModal", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupMocks();
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

  it("shows tabs for Details, Comments, Checklists, Attachments, Links, Time", async () => {
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
    expect(screen.getByText("Files (0)")).toBeInTheDocument();
    expect(screen.getByText("Links (0)")).toBeInTheDocument();
    expect(screen.getByText(/Time/)).toBeInTheDocument();
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

  it("saves card via API and calls onClose", async () => {
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
    const titleInput = screen.getByDisplayValue("Design Feature");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Title");
    await userEvent.click(screen.getByText("Save"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows story points and estimated hours fields", () => {
    render(
      <CardDetailModal
        card={baseCard}
        onSave={vi.fn()}
        onClose={vi.fn()}
        boardId="board-1"
        currentUsername="testuser"
      />
    );
    expect(screen.getByText("Story Points")).toBeInTheDocument();
    expect(screen.getByText("Estimated Hours")).toBeInTheDocument();
  });
});
