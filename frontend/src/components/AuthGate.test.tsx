import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

describe("AuthGate", () => {
  it("shows the board after a successful sign-in", async () => {
    render(<AuthGate />);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/kanban studio/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
  });

  it("shows an error for invalid credentials", async () => {
    render(<AuthGate />);

    await userEvent.type(screen.getByLabelText(/username/i), "wrong");
    await userEvent.type(screen.getByLabelText(/password/i), "value");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials/i);
    expect(screen.queryByText(/kanban studio/i)).not.toBeInTheDocument();
  });

  it("returns to the sign-in view after logout", async () => {
    render(<AuthGate />);

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/kanban studio/i)).not.toBeInTheDocument();
  });
});
