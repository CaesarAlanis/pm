import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchFilter } from "@/components/SearchFilter";
import type { Card, Column } from "@/lib/kanban";

const columns: Column[] = [
  { id: "col-1", title: "Todo", cardIds: ["card-1", "card-2"] },
  { id: "col-2", title: "Done", cardIds: ["card-3"] },
];

const cards: Record<string, Card> = {
  "card-1": { id: "card-1", title: "Design mockups", details: "Create UI designs", priority: "high", due_date: null, labels: ["design"] },
  "card-2": { id: "card-2", title: "Write tests", details: "Unit and integration tests", priority: "medium", due_date: null, labels: ["testing"] },
  "card-3": { id: "card-3", title: "Deploy app", details: "Push to production", priority: "low", due_date: null, labels: ["devops"] },
};

describe("SearchFilter", () => {
  it("renders search input and filter button", () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);
    expect(screen.getByPlaceholderText("Search cards...")).toBeInTheDocument();
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("filters cards by text query", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.type(screen.getByPlaceholderText("Search cards..."), "design");

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as Set<string>;
    expect(lastCall.has("card-1")).toBe(true);
    expect(lastCall.has("card-2")).toBe(false);
  });

  it("filters cards by label via text search", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.type(screen.getByPlaceholderText("Search cards..."), "testing");

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as Set<string>;
    expect(lastCall.has("card-2")).toBe(true);
  });

  it("shows priority options when Filter is clicked", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.click(screen.getByText("Filter"));

    expect(screen.getByText("All Priorities")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("filters by priority", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.click(screen.getByText("Filter"));
    await userEvent.click(screen.getByText("High"));

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as Set<string>;
    expect(lastCall.has("card-1")).toBe(true);
    expect(lastCall.has("card-2")).toBe(false);
  });

  it("shows clear button when filters are active", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.type(screen.getByPlaceholderText("Search cards..."), "test");

    expect(screen.getByLabelText("Clear filters")).toBeInTheDocument();
  });

  it("clears all filters on clear button click", async () => {
    const onFilter = vi.fn();
    render(<SearchFilter columns={columns} cards={cards} onFilter={onFilter} />);

    await userEvent.type(screen.getByPlaceholderText("Search cards..."), "test");
    await userEvent.click(screen.getByLabelText("Clear filters"));

    expect(screen.getByPlaceholderText("Search cards...")).toHaveValue("");
    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as Set<string>;
    expect(lastCall.size).toBe(3);
  });
});
