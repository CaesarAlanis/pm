import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the board from the backend and persists edits", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialData,
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal("fetch", fetchMock);

    render(<KanbanBoard username="user" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/board/user"));

    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "Persisted card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Saved to backend");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/board/user",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  it("renders five columns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => initialData })
    );

    render(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
  });

  it("renames a column", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => initialData })
    );

    render(<KanbanBoard />);
    const column = await waitFor(() => getFirstColumn());
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    await waitFor(() => expect(input).toHaveValue("New Name"));
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
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
  });

  it("sends a chat prompt, shows the assistant response, and refreshes the board", async () => {
    const boardResponse = {
      columns: initialData.columns,
      cards: initialData.cards,
    };
    const aiResponseBoard = {
      columns: initialData.columns,
      cards: {
        ...initialData.cards,
        "card-99": {
          id: "card-99",
          title: "AI created card",
          details: "Created by the assistant",
        },
      },
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => boardResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Added a card for you.",
          applied: true,
          board: aiResponseBoard,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal("fetch", fetchMock);

    render(<KanbanBoard username="user" />);

    const input = await screen.findByPlaceholderText(/ask the ai assistant/i);
    await userEvent.type(input, "Create a card for the launch");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Added a card for you.")).toBeInTheDocument();
    expect(await screen.findByText("AI created card")).toBeInTheDocument();
  });

  it("shows a helpful fallback when the assistant request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => initialData })
        .mockRejectedValueOnce(new Error("Network down"))
    );

    render(<KanbanBoard username="user" />);

    const input = await screen.findByPlaceholderText(/ask the ai assistant/i);
    await userEvent.type(input, "Create a card for the launch");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/couldn't reach the assistant/i)).toBeInTheDocument();
  });
});
