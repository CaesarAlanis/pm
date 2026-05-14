import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BoardAnalyticsPanel } from "./BoardAnalyticsPanel";

const mockStats = {
  total_cards: 12,
  cards_by_column: [
    { id: "c1", title: "Backlog", card_count: 4 },
    { id: "c2", title: "Done", card_count: 3 },
  ],
  cards_by_priority: { high: 2, medium: 5, none: 5 },
  completion_rate: 25.0,
  overdue_count: 1,
  total_story_points: 30,
  completed_story_points: 10,
  total_estimated_hours: 40,
  total_actual_hours: 25,
  cards_created_this_week: 3,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
    if (url.includes("/velocity")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ velocity: [{ week: "2026-05-05", cards_completed: 5 }] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
  }));
});

describe("BoardAnalyticsPanel", () => {
  it("renders loading state then stats", async () => {
    render(<BoardAnalyticsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });

  it("shows completion rate", async () => {
    render(<BoardAnalyticsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("25%")).toBeInTheDocument();
    });
  });

  it("shows overdue count", async () => {
    render(<BoardAnalyticsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Overdue")).toBeInTheDocument();
    });
  });

  it("calls onClose on backdrop click", async () => {
    const onClose = vi.fn();
    render(<BoardAnalyticsPanel boardId="board-1" onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText("Board Analytics")).toBeInTheDocument();
    });
    const backdrop = screen.getByText("Board Analytics").closest(".fixed.inset-0")!;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("switches to velocity tab", async () => {
    render(<BoardAnalyticsPanel boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Board Analytics")).toBeInTheDocument();
    });
    const velocityTab = screen.getByText("Velocity");
    velocityTab.click();
    await waitFor(() => {
      expect(screen.getByText(/Cards Completed per Week/i)).toBeInTheDocument();
    });
  });
});
