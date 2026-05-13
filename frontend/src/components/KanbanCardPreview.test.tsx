import { render, screen } from "@testing-library/react";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import type { Card } from "@/lib/kanban";

const sampleCard: Card = {
  id: "card-test",
  title: "Test card",
  details: "Test details",
};

describe("KanbanCardPreview", () => {
  it("renders card title and details", () => {
    render(<KanbanCardPreview card={sampleCard} />);
    expect(screen.getByText("Test card")).toBeInTheDocument();
    expect(screen.getByText("Test details")).toBeInTheDocument();
  });
});
