import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthShell } from "@/components/AuthShell";

vi.mock("@/components/KanbanBoard", () => ({
  KanbanBoard: () => <h1>Kanban Studio</h1>,
}));

const jsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: async () => body,
  } as Response);

describe("AuthShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows login error when credentials are invalid", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthShell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /sign in/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password."
    );
  });

  it("logs in and renders board heading", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "token123", token_type: "bearer" })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthShell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /sign in/i })
    );

    expect(await screen.findByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(window.localStorage.getItem("pm_auth_token")).toBe("token123");
  });
});