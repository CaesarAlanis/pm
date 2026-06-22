import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import * as boardApi from "@/lib/boardApi";

vi.mock("@/lib/boardApi");

const boardFixture = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
    { id: "col-extra-1", title: "Extra 1", cardIds: [] },
    { id: "col-extra-2", title: "Extra 2", cardIds: [] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Existing card", details: "Notes" },
  },
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boardApi.fetchBoard).mockResolvedValue(boardFixture);
    vi.mocked(boardApi.renameColumn).mockResolvedValue(boardFixture);
    vi.mocked(boardApi.createCard).mockResolvedValue(boardFixture);
    vi.mocked(boardApi.deleteCard).mockResolvedValue(boardFixture);
    vi.mocked(boardApi.moveCard).mockResolvedValue(boardFixture);
  });

  it("renders five columns", async () => {
    render(<KanbanBoard accessToken="token123" />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<KanbanBoard accessToken="token123" />);
    const column = (await screen.findAllByTestId(/column-/i))[0];
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    await userEvent.tab();

    expect(boardApi.renameColumn).toHaveBeenCalledWith(
      "col-backlog",
      "New Name",
      "token123"
    );
  });

  it("adds and removes a card", async () => {
    vi.mocked(boardApi.createCard).mockResolvedValueOnce({
      ...boardFixture,
      columns: [
        {
          ...boardFixture.columns[0],
          cardIds: ["card-1", "card-2"],
        },
        ...boardFixture.columns.slice(1),
      ],
      cards: {
        ...boardFixture.cards,
        "card-2": { id: "card-2", title: "New card", details: "Notes" },
      },
    });
    vi.mocked(boardApi.deleteCard).mockResolvedValueOnce(boardFixture);

    render(<KanbanBoard accessToken="token123" />);
    const column = (await screen.findAllByTestId(/column-/i))[0];
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();
    expect(boardApi.createCard).toHaveBeenCalledWith(
      "col-backlog",
      "New card",
      "Notes",
      "token123"
    );

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
    expect(boardApi.deleteCard).toHaveBeenCalledWith("card-2", "token123");
  });
});
