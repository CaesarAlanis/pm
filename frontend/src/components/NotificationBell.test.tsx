import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/NotificationBell";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with no unread notifications", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/notifications")) return jsonOk({ notifications: [] });
      return jsonOk({});
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });
  });

  it("shows unread count badge when there are unread notifications", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/notifications")) return jsonOk({
        notifications: [
          { id: "n1", board_id: "b1", board_title: "Board", action: "assigned", details: "You were assigned", read: 0, created_at: "2025-01-01T00:00:00" },
        ],
      });
      return jsonOk({});
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("opens dropdown on click", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/notifications")) return jsonOk({
        notifications: [
          { id: "n1", board_id: "b1", board_title: "Board", action: "assigned", details: "You were assigned", read: 0, created_at: "2025-01-01T00:00:00" },
        ],
      });
      if (url.includes("/read-all")) return jsonOk({ detail: "Marked 0 notifications as read" });
      return jsonOk({});
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByLabelText(/notifications/i));
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("shows no notifications message when empty", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/notifications")) return jsonOk({ notifications: [] });
      return jsonOk({});
    });
    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByLabelText(/notifications/i));
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});
