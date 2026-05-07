import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginScreen } from "@/components/LoginScreen";

describe("LoginScreen", () => {
  it("renders the login form", () => {
    render(<LoginScreen onLogin={vi.fn()} />);

    expect(screen.getByPlaceholderText(/user/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows an error for invalid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginScreen onLogin={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/user/i), "wrong");
    await user.type(screen.getByPlaceholderText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("calls onLogin for valid credentials", async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();

    render(<LoginScreen onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText(/user/i), "user");
    await user.type(screen.getByPlaceholderText(/password/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalled();
  });

  it("accepts valid credentials with extra whitespace and username casing differences", async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();

    render(<LoginScreen onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText(/user/i), " User ");
    await user.type(screen.getByPlaceholderText(/password/i), " password ");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalled();
  });
});
