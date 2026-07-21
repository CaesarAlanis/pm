import { expect, test } from "@playwright/test";

test.use({
  baseURL: "http://127.0.0.1:8000",
  viewport: { width: 1920, height: 1080 },
});

const DEFAULT_BOARD_DATA = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes", details: "Draft quarterly themes with impact statements and metrics." },
    "card-2": { id: "card-2", title: "Gather customer signals", details: "Review support tags, sales notes, and churn feedback." },
    "card-3": { id: "card-3", title: "Prototype analytics view", details: "Sketch initial dashboard layout and key drill-downs." },
    "card-4": { id: "card-4", title: "Refine status language", details: "Standardize column labels and tone across the board." },
    "card-5": { id: "card-5", title: "Design card layout", details: "Add hierarchy and spacing for scanning dense lists." },
    "card-6": { id: "card-6", title: "QA micro-interactions", details: "Verify hover, focus, and loading states." },
    "card-7": { id: "card-7", title: "Ship marketing page", details: "Final copy approved and asset pack delivered." },
    "card-8": { id: "card-8", title: "Close onboarding sprint", details: "Document release notes and share internally." },
  },
};

const resetBoardState = async (request: any, customBoard?: any) => {
  await request.put("http://127.0.0.1:8000/api/board", {
    data: customBoard || DEFAULT_BOARD_DATA,
  });
};

const performLogin = async (page: any) => {
  await page.goto("/");
  if (await page.getByPlaceholder("user").isVisible()) {
    await page.getByPlaceholder("user").fill("user");
    await page.getByPlaceholder("password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  }
};

const dragCardHelper = async (page: any, cardId: string, targetColId: string) => {
  const card = page.getByTestId(cardId);
  const targetCol = page.getByTestId(targetColId);

  await card.waitFor({ state: "visible" });
  await targetCol.waitFor({ state: "visible" });

  const cardBox = await card.boundingBox();
  const targetBox = await targetCol.boundingBox();
  if (!cardBox || !targetBox) throw new Error("Bounding box missing");

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + 160;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 5 });
  await page.waitForTimeout(100);
  await page.mouse.move(targetX, targetY, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(600);
};

test.describe("Project Management MVP Complete E2E Test Suite", () => {
  test.beforeEach(async ({ request }) => {
    await resetBoardState(request);
  });

  test("1. Login with demo user (user/password)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await page.getByPlaceholder("user").fill("user");
    await page.getByPlaceholder("password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
    await expect(page.getByText("Signed in as")).toBeVisible();
    await expect(page.getByText("user", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  });

  test("2. Drag and drop: Backlog -> Discovery", async ({ page }) => {
    await performLogin(page);
    await dragCardHelper(page, "card-card-1", "column-col-discovery");
    await expect(page.getByTestId("column-col-discovery").getByTestId("card-card-1")).toBeVisible();
  });

  test("3. Drag and drop: Discovery -> In Progress", async ({ page }) => {
    await performLogin(page);
    await dragCardHelper(page, "card-card-3", "column-col-progress");
    await expect(page.getByTestId("column-col-progress").getByTestId("card-card-3")).toBeVisible();
  });

  test("4. Drag and drop: In Progress -> Review", async ({ page }) => {
    await performLogin(page);
    await dragCardHelper(page, "card-card-4", "column-col-review");
    await expect(page.getByTestId("column-col-review").getByTestId("card-card-4")).toBeVisible();
  });

  test("5. Drag and drop: Review -> Done", async ({ page }) => {
    await performLogin(page);
    await dragCardHelper(page, "card-card-6", "column-col-done");
    await expect(page.getByTestId("column-col-done").getByTestId("card-card-6")).toBeVisible();
  });

  test("6. Drag and drop: Done -> Backlog", async ({ page }) => {
    await performLogin(page);
    await dragCardHelper(page, "card-card-7", "column-col-backlog");
    await expect(page.getByTestId("column-col-backlog").getByTestId("card-card-7")).toBeVisible();
  });

  test("7. Drag and drop a card into a completely EMPTY column", async ({ page, request }) => {
    // Reset board with col-discovery completely empty
    const emptyDiscoveryBoard = JSON.parse(JSON.stringify(DEFAULT_BOARD_DATA));
    emptyDiscoveryBoard.columns[1].cardIds = []; // Discovery has 0 cards
    await resetBoardState(request, emptyDiscoveryBoard);

    await performLogin(page);

    // Verify Discovery column displays 0 cards placeholder
    await expect(page.getByTestId("column-col-discovery").getByText("Drop a card here")).toBeVisible();

    // Drag card-1 from Backlog into empty Discovery column
    await dragCardHelper(page, "card-card-1", "column-col-discovery");

    // Verify card-1 is now inside Discovery column
    await expect(page.getByTestId("column-col-discovery").getByTestId("card-card-1")).toBeVisible();
  });

  test("8. AI Chat assistant creates a card automatically", async ({ page }) => {
    await performLogin(page);
    await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
    const chatInput = page.getByPlaceholder("Ask AI to move or add cards...");
    await chatInput.fill("Crea una tarjeta llamada 'Tarea de Prueba AI' en Backlog");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.locator("aside").getByText(/AI Manager/i).last()).toBeVisible({ timeout: 15_000 });
  });

  test("9. Logout functionality", async ({ page }) => {
    await performLogin(page);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
