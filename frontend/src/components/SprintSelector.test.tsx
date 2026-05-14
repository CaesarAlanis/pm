import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SprintSelector } from "./SprintSelector";

const mockSprints = [
  { id: "sprint-1", name: "Sprint 1", goal: "Ship it", start_date: null, end_date: null, status: "active" },
  { id: "sprint-2", name: "Sprint 2", goal: "", start_date: null, end_date: null, status: "planning" },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "sprint-new", name: "New Sprint", goal: "", status: "planning" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: mockSprints }) });
  }));
});

describe("SprintSelector", () => {
  it("renders sprint button", () => {
    render(<SprintSelector boardId="board-1" onSelectSprint={vi.fn()} />);
    expect(screen.getByText("Sprints")).toBeInTheDocument();
  });

  it("shows sprints on click", async () => {
    render(<SprintSelector boardId="board-1" onSelectSprint={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /sprints/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getAllByText("Sprint 1").length).toBeGreaterThan(0);
      expect(screen.getByText("Sprint 2")).toBeInTheDocument();
    });
  });

  it("shows create sprint form", async () => {
    render(<SprintSelector boardId="board-1" onSelectSprint={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /sprints/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByLabelText("New sprint")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("New sprint"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Sprint name")).toBeInTheDocument();
    });
  });

  it("calls onSelectSprint with null for All Cards", async () => {
    const onSelect = vi.fn();
    render(<SprintSelector boardId="board-1" onSelectSprint={onSelect} />);
    const btn = screen.getByRole("button", { name: /sprints/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText("All Cards")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("All Cards"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
