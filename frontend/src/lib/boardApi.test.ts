import {
  createCard,
  deleteCard,
  fetchBoard,
  moveCard,
  renameColumn,
} from "@/lib/boardApi";

const boardFixture = {
  columns: [{ id: "col-1", title: "Backlog", cardIds: ["card-1"] }],
  cards: {
    "card-1": { id: "card-1", title: "Test", details: "Details" },
  },
};

describe("boardApi", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches board with stored bearer token", async () => {
    window.localStorage.setItem("pm_auth_token", "abc123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => boardFixture,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBoard();

    expect(result.columns).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "GET" })
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("throws parsed backend detail on failed request", async () => {
    window.localStorage.setItem("pm_auth_token", "abc123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Column title is required" }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(renameColumn("col-1", "")).rejects.toThrow(
      "Column title is required"
    );
  });

  it("uses explicit token over local storage", async () => {
    window.localStorage.setItem("pm_auth_token", "stale-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => boardFixture,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await createCard("col-1", "New", "Card", "fresh-token");

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer fresh-token");
  });

  it("sends expected payloads for mutation endpoints", async () => {
    window.localStorage.setItem("pm_auth_token", "abc123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => boardFixture,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await deleteCard("card-1");
    await moveCard("card-1", "col-2", 0);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/board/cards");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/board/cards/move");

    const deleteOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(deleteOptions.method).toBe("DELETE");
    expect(deleteOptions.body).toBe(JSON.stringify({ card_id: "card-1" }));

    const moveOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(moveOptions.method).toBe("POST");
    expect(moveOptions.body).toBe(
      JSON.stringify({
        card_id: "card-1",
        target_column_id: "col-2",
        target_index: 0,
      })
    );
  });
});
