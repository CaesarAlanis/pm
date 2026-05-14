import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/lib/auth";

import { RegisterPage } from "./RegisterPage";

function renderRegister(props = {}) {
  return render(
    <AuthProvider>
      <RegisterPage {...props} />
    </AuthProvider>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders registration form", () => {
    renderRegister();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password (6+ characters)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows switch to login link when callback provided", () => {
    const onSwitch = vi.fn();
    renderRegister({ onSwitchToLogin: onSwitch });
    const link = screen.getByText("Sign in");
    expect(link).toBeInTheDocument();
    link.click();
    expect(onSwitch).toHaveBeenCalled();
  });

  it("shows error on short username", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Username"), "ab");
    await user.type(screen.getByPlaceholderText("Password (6+ characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
  });

  it("shows error on mismatched passwords", async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText("Username"), "testuser");
    await user.type(screen.getByPlaceholderText("Password (6+ characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "different123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("calls register on valid form submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
      const path = typeof url === "string" ? url : url instanceof URL ? url.href : "";
      if (path.includes("/api/auth/register")) {
        return Promise.resolve(new Response(JSON.stringify({ username: "testuser" }), { status: 200 }));
      }
      if (path.includes("/api/auth/me")) {
        return Promise.resolve(new Response(JSON.stringify({ username: "testuser" }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText("Username"), "testuser");
    await user.type(screen.getByPlaceholderText("Password (6+ characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
  });

  it("shows error on duplicate username", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
      const path = typeof url === "string" ? url : url instanceof URL ? url.href : "";
      if (path.includes("/api/auth/register")) {
        return Promise.resolve(
          new Response(JSON.stringify({ detail: "Username already taken" }), { status: 409 })
        );
      }
      if (path.includes("/api/auth/me")) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText("Username"), "existing");
    await user.type(screen.getByPlaceholderText("Password (6+ characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
  });
});
