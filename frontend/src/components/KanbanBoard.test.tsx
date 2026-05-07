import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchBoard: vi.fn(),
  saveBoard: vi.fn(),
  sendChatMessage: vi.fn(),
}));

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];
const username = "user";

const fetchBoardMock = vi.mocked(api.fetchBoard);
const saveBoardMock = vi.mocked(api.saveBoard);
const sendChatMessageMock = vi.mocked(api.sendChatMessage);

describe("KanbanBoard", () => {
  beforeEach(() => {
    fetchBoardMock.mockResolvedValue(structuredClone(initialData));
    saveBoardMock.mockResolvedValue();
    sendChatMessageMock.mockResolvedValue({
      message: "Done",
      boardUpdate: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders five columns", async () => {
    render(<KanbanBoard username={username} />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(fetchBoardMock).toHaveBeenCalledWith(username);
  });

  it("seeds the backend with demo data for a new empty board", async () => {
    fetchBoardMock.mockResolvedValueOnce({ columns: [], cards: {} });

    render(<KanbanBoard username={username} />);

    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(saveBoardMock).toHaveBeenCalledWith(username, initialData);
  });

  it("renames a column", async () => {
    render(<KanbanBoard username={username} />);
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
    await waitFor(() => expect(saveBoardMock).toHaveBeenCalled());
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard username={username} />);
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
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

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
    await waitFor(() => expect(saveBoardMock).toHaveBeenCalled());
  });

  it("applies AI board updates and persists them", async () => {
    const nextBoard = structuredClone(initialData);
    nextBoard.columns[0].cardIds = [];
    nextBoard.columns[4].cardIds = [...nextBoard.columns[4].cardIds, "card-1"];
    sendChatMessageMock.mockResolvedValueOnce({
      message: "Moved the card to done.",
      boardUpdate: nextBoard,
    });

    render(<KanbanBoard username={username} />);
    await screen.findAllByTestId(/column-/i);

    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to change/i), "Move card 1");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/moved the card to done/i)).toBeInTheDocument();
    expect(sendChatMessageMock).toHaveBeenCalledWith(initialData, [], "Move card 1");
    await waitFor(() => expect(saveBoardMock).toHaveBeenCalledWith(username, nextBoard));
  });

  it("shows the backend chat error when AI setup is missing", async () => {
    sendChatMessageMock.mockRejectedValueOnce(
      new Error("AI request failed: OPENROUTER_API_KEY is not configured")
    );

    render(<KanbanBoard username={username} />);
    await screen.findAllByTestId(/column-/i);

    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to change/i), "Help");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/openrouter_api_key is not configured/i)
    ).toBeInTheDocument();
  });
});
