import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateSelector } from "@/components/TemplateSelector";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const templates = [
  { id: "tmpl-kanban", name: "Kanban", description: "Simple kanban board", columns: ["To Do", "In Progress", "Done"] },
  { id: "tmpl-scrum", name: "Scrum", description: "Scrum sprint board", columns: ["Backlog", "Sprint", "Review", "Done"] },
];

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

describe("TemplateSelector", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/templates") {
        return jsonOk({ templates });
      }
      return jsonOk({});
    });
  });

  it("renders create board modal", async () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Create Board")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My Board")).toBeInTheDocument();
  });

  it("loads and displays templates", async () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Kanban")).toBeInTheDocument();
    expect(screen.getByText("Scrum")).toBeInTheDocument();
  });

  it("shows template columns as badges", async () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(2);
  });

  it("shows Blank Board option", async () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Blank Board")).toBeInTheDocument();
  });

  it("calls onSelect with template ID when template is clicked", async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} onClose={vi.fn()} />);
    await screen.findByText("Kanban");
    await userEvent.click(screen.getByText("Kanban"));
    expect(onSelect).toHaveBeenCalledWith("tmpl-kanban", "Kanban");
  });

  it("calls onSelect with null template ID for blank board", async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} onClose={vi.fn()} />);
    await screen.findByText("Blank Board");
    await userEvent.click(screen.getByText("Blank Board"));
    expect(onSelect).toHaveBeenCalledWith(null, "New Board");
  });

  it("uses custom title when provided", async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} onClose={vi.fn()} />);
    await screen.findByText("Kanban");
    await userEvent.type(screen.getByPlaceholderText("My Board"), "My Project");
    await userEvent.click(screen.getByText("Kanban"));
    expect(onSelect).toHaveBeenCalledWith("tmpl-kanban", "My Project");
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<TemplateSelector onSelect={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
