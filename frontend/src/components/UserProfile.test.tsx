import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfile } from "@/components/UserProfile";
import { AuthProvider } from "@/lib/auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("UserProfile", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/auth/profile") {
        return jsonOk({ username: "testuser", created_at: "2026-01-01T00:00:00", board_count: 3 });
      }
      return jsonOk({});
    });
  });

  it("renders profile modal with username", async () => {
    renderWithAuth(<UserProfile onClose={vi.fn()} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("shows password change form", () => {
    renderWithAuth(<UserProfile onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
  });

  it("shows sign out button", () => {
    renderWithAuth(<UserProfile onClose={vi.fn()} />);
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    renderWithAuth(<UserProfile onClose={onClose} />);
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error for short new password", async () => {
    renderWithAuth(<UserProfile onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Current password"), "oldpass");
    await userEvent.type(screen.getByPlaceholderText("New password"), "short");
    await userEvent.type(screen.getByPlaceholderText("Confirm new password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByText("New password must be at least 6 characters")).toBeInTheDocument();
  });

  it("shows error for mismatched passwords", async () => {
    renderWithAuth(<UserProfile onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Current password"), "oldpass");
    await userEvent.type(screen.getByPlaceholderText("New password"), "newpassword");
    await userEvent.type(screen.getByPlaceholderText("Confirm new password"), "different");
    await userEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });
});
