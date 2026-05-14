import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MilestoneTracker } from "./MilestoneTracker";

const mockMilestones = [
  { id: "mile-1", name: "v1.0", description: "First release", due_date: "2026-06-30", status: "upcoming" },
  { id: "mile-2", name: "v2.0", description: "", due_date: null, status: "in_progress" },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "mile-new", name: "New Milestone", description: "", due_date: null, status: "upcoming" }) });
    }
    if (options?.method === "DELETE") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ detail: "Milestone deleted" }) });
    }
    if (options?.method === "PUT") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ detail: "Milestone updated" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ milestones: mockMilestones }) });
  }));
});

describe("MilestoneTracker", () => {
  it("renders milestones list", async () => {
    render(<MilestoneTracker boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("v1.0")).toBeInTheDocument();
      expect(screen.getByText("v2.0")).toBeInTheDocument();
    });
  });

  it("shows create form on button click", async () => {
    const user = userEvent.setup();
    render(<MilestoneTracker boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("New Milestone")).toBeInTheDocument();
    });
    await user.click(screen.getByText("New Milestone"));
    expect(screen.getByPlaceholderText("Milestone name")).toBeInTheDocument();
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    render(<MilestoneTracker boardId="board-1" onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText("Milestones")).toBeInTheDocument();
    });
    const backdrop = screen.getByText("Milestones").closest(".fixed.inset-0")!;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows due date for milestones", async () => {
    render(<MilestoneTracker boardId="board-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Due: 2026-06-30/)).toBeInTheDocument();
    });
  });
});
