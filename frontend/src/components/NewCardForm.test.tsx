import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCardForm } from "@/components/NewCardForm";

describe("NewCardForm", () => {
  it("renders 'Add a card' button initially", () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);
    expect(screen.getByText("Add a card")).toBeInTheDocument();
  });

  it("shows form inputs when 'Add a card' is clicked", async () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);

    await userEvent.click(screen.getByText("Add a card"));

    expect(screen.getByPlaceholderText("Card title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Details")).toBeInTheDocument();
    expect(screen.getByText("Add card")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onAdd with title and details on submit", async () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);

    await userEvent.click(screen.getByText("Add a card"));
    await userEvent.type(screen.getByPlaceholderText("Card title"), "My Task");
    await userEvent.type(screen.getByPlaceholderText("Details"), "Some details");
    await userEvent.click(screen.getByText("Add card"));

    expect(onAdd).toHaveBeenCalledWith("My Task", "Some details");
  });

  it("does not call onAdd when title is empty", async () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);

    await userEvent.click(screen.getByText("Add a card"));
    await userEvent.click(screen.getByText("Add card"));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes form and resets on Cancel", async () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);

    await userEvent.click(screen.getByText("Add a card"));
    await userEvent.type(screen.getByPlaceholderText("Card title"), "Draft");
    await userEvent.click(screen.getByText("Cancel"));

    expect(screen.getByText("Add a card")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Add a card"));
    expect(screen.getByPlaceholderText("Card title")).toHaveValue("");
  });

  it("trims whitespace from title and details", async () => {
    const onAdd = vi.fn();
    render(<NewCardForm onAdd={onAdd} />);

    await userEvent.click(screen.getByText("Add a card"));
    await userEvent.type(screen.getByPlaceholderText("Card title"), "  Task  ");
    await userEvent.type(screen.getByPlaceholderText("Details"), "  details  ");
    await userEvent.click(screen.getByText("Add card"));

    expect(onAdd).toHaveBeenCalledWith("Task", "details");
  });
});
