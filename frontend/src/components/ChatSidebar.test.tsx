import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonOk = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

describe("ChatSidebar", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the toggle button", () => {
    render(<ChatSidebar />);
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
  });

  it("opens the sidebar when toggle is clicked", async () => {
    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask the ai/i)).toBeInTheDocument();
  });

  it("closes the sidebar when close button is clicked", async () => {
    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));
    await userEvent.click(screen.getByRole("button", { name: /close sidebar/i }));
    // Sidebar is hidden via CSS translate, not removed from DOM
    const aside = screen.getByText("AI Assistant").closest("aside");
    expect(aside?.className).toContain("translate-x-full");
  });

  it("sends a message and displays the AI response", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/ai/chat")) return jsonOk({ message: "I added a card!", board_updated: false });
      return jsonOk({});
    });

    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByPlaceholderText(/ask the ai/i);
    await userEvent.type(input, "Add a card");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Add a card")).toBeInTheDocument();
    expect(await screen.findByText("I added a card!")).toBeInTheDocument();
  });

  it("shows board updated indicator when AI updates board", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/ai/chat")) return jsonOk({ message: "Done!", board_updated: true });
      return jsonOk({});
    });

    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByPlaceholderText(/ask the ai/i);
    await userEvent.type(input, "Move card to done");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Board updated")).toBeInTheDocument();
  });

  it("calls onBoardUpdate when board is updated", async () => {
    const onBoardUpdate = vi.fn();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/ai/chat")) return jsonOk({ message: "Updated!", board_updated: true });
      return jsonOk({});
    });

    render(<ChatSidebar onBoardUpdate={onBoardUpdate} />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByPlaceholderText(/ask the ai/i);
    await userEvent.type(input, "Reorganize");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Updated!")).toBeInTheDocument();
    expect(onBoardUpdate).toHaveBeenCalled();
  });

  it("shows error message when API fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/ai/chat")) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      return jsonOk({});
    });

    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByPlaceholderText(/ask the ai/i);
    await userEvent.type(input, "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("disables send button when input is empty", async () => {
    render(<ChatSidebar />);
    await userEvent.click(screen.getByRole("button", { name: /open chat/i }));
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });
});
