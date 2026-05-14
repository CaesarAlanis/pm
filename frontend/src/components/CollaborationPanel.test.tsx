import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollaborationPanel } from "@/components/CollaborationPanel";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

describe("CollaborationPanel", () => {
  it("renders when open with board ID", () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/members")) return jsonOk({ members: [{ username: "user", role: "owner", joined_at: "2025-01-01" }] });
      if (url.includes("/activity")) return jsonOk({ activity: [] });
      return jsonOk({});
    });
    render(<CollaborationPanel boardId="board-1" isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Collaboration")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<CollaborationPanel boardId="board-1" isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText("Collaboration")).not.toBeInTheDocument();
  });

  it("displays members list", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/members")) return jsonOk({ members: [{ username: "user", role: "owner", joined_at: "2025-01-01" }] });
      if (url.includes("/activity")) return jsonOk({ activity: [] });
      return jsonOk({});
    });
    render(<CollaborationPanel boardId="board-1" isOpen={true} onClose={() => {}} />);
    expect(await screen.findByText("user")).toBeInTheDocument();
  });

  it("switches between members and activity tabs", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/members")) return jsonOk({ members: [] });
      if (url.includes("/activity")) return jsonOk({ activity: [{ id: "a1", username: "user", action: "created", details: "Board created", created_at: "2025-01-01T00:00:00" }] });
      return jsonOk({});
    });
    render(<CollaborationPanel boardId="board-1" isOpen={true} onClose={() => {}} />);
    await userEvent.click(screen.getByText(/activity/i));
    expect(await screen.findByText("created")).toBeInTheDocument();
  });
});
