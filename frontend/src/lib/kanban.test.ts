import { moveCard, createId, apiToBoardData, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });

  it("returns unchanged columns if activeId is not found", () => {
    const result = moveCard(baseColumns, "card-unknown", "card-1");
    expect(result).toEqual(baseColumns);
  });

  it("returns unchanged columns if overId is not found", () => {
    const result = moveCard(baseColumns, "card-1", "card-unknown");
    expect(result).toEqual(baseColumns);
  });

  it("returns unchanged columns when dropped on same position", () => {
    const result = moveCard(baseColumns, "card-1", "card-1");
    expect(result).toEqual(baseColumns);
  });
});

describe("createId", () => {
  it("creates an id with the given prefix", () => {
    const id = createId("card");
    expect(id).toMatch(/^card-/);
  });

  it("creates unique ids", () => {
    const id1 = createId("col");
    const id2 = createId("col");
    expect(id1).not.toBe(id2);
  });
});

describe("apiToBoardData", () => {
  it("converts API board response to BoardData", () => {
    const api = {
      id: "board-1",
      title: "My Board",
      columns: [
        { id: "col-a", title: "A", position: 0, cards: [
          { id: "card-1", title: "Task 1", details: "Details 1", position: 0 },
        ]},
      ],
    };
    const result = apiToBoardData(api);
    expect(result.columns).toHaveLength(1);
    expect(result.columns[0].id).toBe("col-a");
    expect(result.columns[0].cardIds).toEqual(["card-1"]);
    expect(result.cards["card-1"].title).toBe("Task 1");
  });

  it("sorts columns and cards by position", () => {
    const api = {
      id: "board-1",
      title: "My Board",
      columns: [
        { id: "col-b", title: "B", position: 1, cards: [
          { id: "card-2", title: "Second", details: "d2", position: 1 },
          { id: "card-1", title: "First", details: "d1", position: 0 },
        ]},
        { id: "col-a", title: "A", position: 0, cards: [] },
      ],
    };
    const result = apiToBoardData(api);
    expect(result.columns[0].id).toBe("col-a");
    expect(result.columns[1].id).toBe("col-b");
    expect(result.columns[1].cardIds).toEqual(["card-1", "card-2"]);
  });
});
