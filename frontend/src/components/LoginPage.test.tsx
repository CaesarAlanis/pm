import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const jsonFail = () =>
  Promise.resolve({ ok: false, json: () => Promise.resolve(null) });

const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe("LoginPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonFail();
      return jsonOk({});
    });
  });

  it("renders login form", async () => {
    const { LoginPage } = await import("@/components/LoginPage");
    renderWithAuth(<LoginPage />);
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error on invalid credentials", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) return jsonFail();
      if (url.includes("/auth/login")) return jsonFail();
      return jsonOk({});
    });

    const { LoginPage } = await import("@/components/LoginPage");
    renderWithAuth(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "user");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument();
  });
});
