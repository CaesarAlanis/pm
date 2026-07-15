import {
  addCard,
  moveCard,
  removeCard,
  renameColumn,
  type BoardData,
  type Column,
} from "@/lib/kanban";

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
});

describe("renameColumn", () => {
  it("renames the matching column and leaves others untouched", () => {
    const columns: Column[] = [
      { id: "col-a", title: "A", cardIds: [] },
      { id: "col-b", title: "B", cardIds: [] },
    ];
    const result = renameColumn(columns, "col-a", "Renamed");
    expect(result[0].title).toBe("Renamed");
    expect(result[1].title).toBe("B");
  });
});

describe("addCard and removeCard", () => {
  const board: BoardData = {
    columns: [{ id: "col-a", title: "A", cardIds: ["card-1"] }],
    cards: { "card-1": { id: "card-1", title: "Existing", details: "" } },
  };

  it("adds a card to the target column", () => {
    const result = addCard(board, "col-a", "New card", "Notes");
    expect(result.columns[0].cardIds).toHaveLength(2);
    const newId = result.columns[0].cardIds[1];
    expect(result.cards[newId]).toEqual({
      id: newId,
      title: "New card",
      details: "Notes",
    });
  });

  it("defaults details when none are given", () => {
    const result = addCard(board, "col-a", "New card", "");
    const newId = result.columns[0].cardIds[1];
    expect(result.cards[newId].details).toBe("No details yet.");
  });

  it("removes a card from its column and the cards map", () => {
    const result = removeCard(board, "col-a", "card-1");
    expect(result.columns[0].cardIds).toEqual([]);
    expect(result.cards["card-1"]).toBeUndefined();
  });
});
