import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/ChatPanel";
import { initialData } from "@/lib/kanban";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatPanel", () => {
  it("applies an updated board when the backend returns one", async () => {
    const onBoardUpdate = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          reply: "Added card",
          updated_board: {
            ...initialData,
            cards: {
              ...initialData.cards,
              "card-999": {
                id: "card-999",
                title: "Review task",
                details: "Added from chat",
              },
            },
          },
        }),
      })
    );

    render(<ChatPanel board={initialData} onBoardUpdate={onBoardUpdate} />);
    await userEvent.type(
      screen.getByPlaceholderText(/try: add a card for review/i),
      "add a card for review"
    );
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(onBoardUpdate).toHaveBeenCalled();
    expect(screen.getByText(/added card/i)).toBeInTheDocument();
  });
});
