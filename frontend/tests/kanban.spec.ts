import { expect, test } from "@playwright/test";
import { initialData } from "../src/lib/kanban";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/board/user", {
    data: { board: initialData },
  });
  expect(response.ok()).toBeTruthy();
});

const signIn = async (page: Parameters<typeof test>[0]["page"]) => {
  await page.goto("/");
  await page.getByPlaceholder("user").fill("user");
  await page.getByPlaceholder("password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();
  await expect(page.getByText(/one board\.\s*five columns\.\s*zero clutter\./i)).toBeVisible();
};

test("requires login before showing the board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();
  await expect(page.getByText(/one board\.\s*five columns\.\s*zero clutter\./i)).not.toBeVisible();
  await page.getByPlaceholder("user").fill("user");
  await page.getByPlaceholder("password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();
  await expect(page.getByText(/one board\.\s*five columns\.\s*zero clutter\./i)).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  await signIn(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("persists board state after reload", async ({ page }) => {
  await signIn(page);
  const backlogColumn = page.getByTestId("column-col-backlog");

  await backlogColumn.getByRole("button", { name: /add a card/i }).click();
  await backlogColumn.getByPlaceholder("Card title").fill("Persistent card");
  await backlogColumn.getByPlaceholder("Details").fill("This should survive refresh.");
  await backlogColumn.getByRole("button", { name: /add card/i }).click();

  await expect(backlogColumn.getByText("Persistent card")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Persistent card")).toBeVisible();
});
