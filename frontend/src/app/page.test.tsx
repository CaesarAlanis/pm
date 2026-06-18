import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { initialData } from "@/lib/kanban";
import { afterEach, beforeEach, vi } from "vitest";

const mockBoardFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => initialData,
    })
  );
};

describe("Home login flow", () => {
  beforeEach(() => {
    mockBoardFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login form by default", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /sign in to kanban studio/i })
    ).toBeInTheDocument();
  });

  it("logs in with valid credentials and allows logout", async () => {
    render(<Home />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /kanban studio/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(
      await screen.findByRole("heading", { name: /sign in to kanban studio/i })
    ).toBeInTheDocument();
  });
});
