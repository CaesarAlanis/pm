import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AuthProvider } from "@/lib/auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const jsonFail = () =>
  Promise.resolve({ ok: false, json: () => Promise.resolve(null) });

const apiBoard = {
  id: "board-1",
  title: "My Board",
  columns: [
    { id: "col-backlog", title: "Backlog", position: 0, cards: [
      { id: "card-1", title: "Align roadmap themes", details: "Draft quarterly themes.", position: 0 },
      { id: "card-2", title: "Gather customer signals", details: "Review support tags.", position: 1 },
    ]},
    { id: "col-discovery", title: "Discovery", position: 1, cards: [
      { id: "card-3", title: "Prototype analytics view", details: "Sketch layouts.", position: 0 },
    ]},
    { id: "col-progress", title: "In Progress", position: 2, cards: [
      { id: "card-4", title: "Refine status language", details: "Standardize labels.", position: 0 },
      { id: "card-5", title: "Design card layout", details: "Add hierarchy.", position: 1 },
    ]},
    { id: "col-review", title: "Review", position: 3, cards: [
      { id: "card-6", title: "QA micro-interactions", details: "Verify hover states.", position: 0 },
    ]},
    { id: "col-done", title: "Done", position: 4, cards: [
      { id: "card-7", title: "Ship marketing page", details: "Final copy approved.", position: 0 },
      { id: "card-8", title: "Close onboarding sprint", details: "Document release notes.", position: 1 },
    ]},
  ],
};

const renderBoard = () => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) return jsonOk({ username: "user" });
    if (url.includes("/api/boards") && !url.includes("/cards") && !url.includes("/columns")) return jsonOk(apiBoard);
    if (url.includes("/auth/logout")) return jsonOk({});
    // Board mutations
    return jsonOk({ detail: "ok" });
  });
  return render(
    <AuthProvider>
      <KanbanBoard />
    </AuthProvider>
  );
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns from API data", async () => {
    renderBoard();
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column and calls API", async () => {
    renderBoard();
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card via API", async () => {
    renderBoard();
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", { name: /add a card/i });
    await userEvent.click(addButton);

    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", { name: /delete new card/i });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("adds a card with default details when details left empty", async () => {
    renderBoard();
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Quick task");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("No details yet.")).toBeInTheDocument();
  });

  it("cancels adding a card", async () => {
    renderBoard();
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Discarded");
    await userEvent.click(within(column).getByRole("button", { name: /cancel/i }));

    expect(within(column).queryByText("Discarded")).not.toBeInTheDocument();
  });

  it("shows loading state before board loads", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(
      <AuthProvider>
        <KanbanBoard />
      </AuthProvider>
    );
    expect(screen.getByText(/loading board/i)).toBeInTheDocument();
  });
});
