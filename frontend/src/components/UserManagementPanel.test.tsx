import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserManagementPanel } from "./UserManagementPanel";

const mockUsers = {
  users: [
    { id: "u1", username: "alice", created_at: "2024-01-15T00:00:00", board_count: 3 },
    { id: "u2", username: "bob", created_at: "2024-02-20T00:00:00", board_count: 1 },
  ],
  total: 2,
};

function jsonOk(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("UserManagementPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders user list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockUsers)));

    render(<UserManagementPanel onClose={() => {}} />);

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("shows board count for each user", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockUsers)));

    render(<UserManagementPanel onClose={() => {}} />);

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("filters users by search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockUsers)));

    render(<UserManagementPanel onClose={() => {}} />);

    await screen.findByText("alice");
    const input = screen.getByPlaceholderText("Search users...");
    fireEvent.change(input, { target: { value: "bob" } });

    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(mockUsers)));
    const onClose = vi.fn();

    render(<UserManagementPanel onClose={onClose} />);

    await screen.findByText("alice");
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
