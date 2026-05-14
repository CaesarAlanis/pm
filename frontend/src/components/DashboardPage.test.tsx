import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardPage } from "./DashboardPage";

const mockDashboard = {
  total_boards: 3,
  total_cards: 15,
  cards_assigned_to_me: 4,
  overdue_cards: [
    { id: "c1", title: "Overdue task", due_date: "2024-01-01", board_id: "b1", board_title: "Board 1" },
  ],
  recently_active_boards: [
    { id: "b1", title: "Board 1", updated_at: "2024-06-01T00:00:00" },
    { id: "b2", title: "Board 2", updated_at: null },
  ],
};

function jsonOk(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard with stats", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockDashboard)));

    render(<DashboardPage onSelectBoard={() => {}} onCreateBoard={() => {}} />);

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders recently active boards", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockDashboard)));

    render(<DashboardPage onSelectBoard={() => {}} onCreateBoard={() => {}} />);

    expect(await screen.findAllByText("Board 1")).toHaveLength(2); // board link + overdue card
    expect(screen.getByText("Board 2")).toBeInTheDocument();
  });

  it("calls onSelectBoard when a board is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockDashboard)));
    const onSelect = vi.fn();

    render(<DashboardPage onSelectBoard={onSelect} onCreateBoard={() => {}} />);

    const boardButtons = await screen.findAllByText("Board 1");
    fireEvent.click(boardButtons[0]); // First match is the board link
    expect(onSelect).toHaveBeenCalledWith("b1");
  });

  it("calls onCreateBoard when New Board button is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockDashboard)));
    const onCreate = vi.fn();

    render(<DashboardPage onSelectBoard={() => {}} onCreateBoard={onCreate} />);

    fireEvent.click(await screen.findByText("New Board"));
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows overdue cards section", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockDashboard)));

    render(<DashboardPage onSelectBoard={() => {}} onCreateBoard={() => {}} />);

    expect(await screen.findByText("Overdue task")).toBeInTheDocument();
  });
});
