import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanColumn } from "@/components/KanbanColumn";
import type { Card, Column } from "@/lib/kanban";

const column: Column = {
  id: "col-1",
  title: "To Do",
  cardIds: ["card-1", "card-2"],
};

const cards: Card[] = [
  { id: "card-1", title: "Task A", details: "Details A", priority: "high", due_date: null, labels: [] },
  { id: "card-2", title: "Task B", details: "Details B", priority: "none", due_date: null, labels: ["bug"] },
];

describe("KanbanColumn", () => {
  it("renders column title and card count", () => {
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("To Do")).toBeInTheDocument();
    expect(screen.getByText("2 cards")).toBeInTheDocument();
  });

  it("renders all cards in the column", () => {
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Task B")).toBeInTheDocument();
  });

  it("calls onRename when title input changes", async () => {
    const onRename = vi.fn();
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={onRename}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue("To Do");
    await userEvent.type(input, "!");
    expect(onRename).toHaveBeenCalledWith("col-1", "To Do!");
  });

  it("shows 'Drop a card here' for empty columns", () => {
    const emptyColumn = { ...column, cardIds: [] };
    render(
      <KanbanColumn
        column={emptyColumn}
        cards={[]}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    expect(screen.getByText("Drop a card here")).toBeInTheDocument();
  });

  it("shows delete column menu on dots click", async () => {
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    await userEvent.click(screen.getByLabelText("Column menu"));
    expect(screen.getByText("Delete column")).toBeInTheDocument();
  });

  it("calls onDeleteColumn when delete column is clicked", async () => {
    const onDeleteColumn = vi.fn();
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={onDeleteColumn}
      />
    );
    await userEvent.click(screen.getByLabelText("Column menu"));
    await userEvent.click(screen.getByText("Delete column"));
    expect(onDeleteColumn).toHaveBeenCalled();
  });

  it("shows NewCardForm at the bottom", () => {
    render(
      <KanbanColumn
        column={column}
        cards={cards}
        onRename={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteColumn={vi.fn()}
      />
    );
    expect(screen.getByText("Add a card")).toBeInTheDocument();
  });
});
