import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardSettingsPanel } from "./BoardSettingsPanel";

const mockBoard = {
  id: "board-1",
  title: "Test Board",
  description: "A test",
  wip_limit: 0,
  default_card_type: "task",
  archived: 0,
  favorite: 0,
  columns: [],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (options?.method === "PUT") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ detail: "Settings saved" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBoard) });
  }));
});

describe("BoardSettingsPanel", () => {
  it("renders board settings form", async () => {
    render(<BoardSettingsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Board Settings")).toBeInTheDocument();
    });
    expect(screen.getByText("WIP Limit (0 = no limit)")).toBeInTheDocument();
    expect(screen.getByText("Default Card Type")).toBeInTheDocument();
  });

  it("saves settings on button click", async () => {
    const user = userEvent.setup();
    render(<BoardSettingsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Save Settings"));
    await waitFor(() => {
      expect(screen.getByText("Settings saved")).toBeInTheDocument();
    });
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    render(<BoardSettingsPanel boardId="board-1" onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText("Board Settings")).toBeInTheDocument();
    });
    const backdrop = screen.getByText("Board Settings").closest(".fixed.inset-0")!;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });
});
