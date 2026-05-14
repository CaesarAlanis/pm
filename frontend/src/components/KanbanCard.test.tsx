import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanCard } from "@/components/KanbanCard";
import type { Card } from "@/lib/kanban";

const baseCard: Card = {
  id: "card-1",
  title: "Test Card",
  details: "Some details here",
  priority: "none",
  due_date: null,
  labels: [],
};

describe("KanbanCard", () => {
  it("renders card title and details", () => {
    render(<KanbanCard card={baseCard} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.getByText("Some details here")).toBeInTheDocument();
  });

  it("shows priority indicator for non-none priority", () => {
    const card = { ...baseCard, priority: "high" as const };
    render(<KanbanCard card={card} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const indicator = screen.getByTestId("card-card-1").querySelector(".bg-red-400");
    expect(indicator).toBeInTheDocument();
  });

  it("hides priority indicator for none priority", () => {
    render(<KanbanCard card={baseCard} onDelete={vi.fn()} onEdit={vi.fn()} />);
    const card = screen.getByTestId("card-card-1");
    expect(card.querySelector(".bg-blue-400, .bg-amber-400, .bg-red-400")).not.toBeInTheDocument();
  });

  it("renders labels as badges", () => {
    const card = { ...baseCard, labels: ["design", "frontend"] };
    render(<KanbanCard card={card} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("design")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
  });

  it("shows +N for more than 3 labels", () => {
    const card = { ...baseCard, labels: ["a", "b", "c", "d", "e"] };
    render(<KanbanCard card={card} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders due date when present", () => {
    const card = { ...baseCard, due_date: "2026-12-31" };
    render(<KanbanCard card={card} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("2026-12-31")).toBeInTheDocument();
  });

  it("calls onEdit when card is clicked", async () => {
    const onEdit = vi.fn();
    render(<KanbanCard card={baseCard} onDelete={vi.fn()} onEdit={onEdit} />);
    await userEvent.click(screen.getByTestId("card-card-1"));
    expect(onEdit).toHaveBeenCalledWith("card-1");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<KanbanCard card={baseCard} onDelete={onDelete} onEdit={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Delete Test Card"));
    expect(onDelete).toHaveBeenCalledWith("card-1");
  });
});
