import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardList, type BoardSummary } from "@/components/BoardList";

const boards: BoardSummary[] = [
  { id: "b-1", title: "Project Alpha", created_at: "2026-01-01" },
  { id: "b-2", title: "Project Beta", created_at: "2026-02-01" },
];

describe("BoardList", () => {
  it("shows active board title in the button", () => {
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  });

  it("shows 'Select Board' when no active board", () => {
    render(
      <BoardList
        boards={boards}
        activeBoardId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Select Board")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows board list", async () => {
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Project Alpha"));
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByText("New Board")).toBeInTheDocument();
  });

  it("calls onSelect when a board is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={onSelect}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Project Alpha"));
    await userEvent.click(screen.getByText("Project Beta"));
    expect(onSelect).toHaveBeenCalledWith("b-2");
  });

  it("calls onCreate when New Board is clicked", async () => {
    const onCreate = vi.fn();
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={vi.fn()}
        onCreate={onCreate}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Project Alpha"));
    await userEvent.click(screen.getByText("New Board"));
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows delete confirmation on delete click", async () => {
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Project Alpha"));
    const deleteBtn = screen.getByLabelText("Delete Project Alpha");
    await userEvent.click(deleteBtn);
    expect(screen.getByText(/Delete.*Project Alpha/)).toBeInTheDocument();
  });

  it("calls onDelete when confirmed", async () => {
    const onDelete = vi.fn();
    render(
      <BoardList
        boards={boards}
        activeBoardId="b-1"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByText("Project Alpha"));
    await userEvent.click(screen.getByLabelText("Delete Project Alpha"));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("b-1");
  });
});
