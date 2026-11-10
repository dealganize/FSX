import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function freshStart(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

test.describe("learning flow", () => {
  test("home shows the learning path and the Player ⇄ Stock match", async ({ page }) => {
    await freshStart(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: /learn how the stock market works/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your learning path" })).toBeVisible();
    await expect(page.getByText("0 of 5 lessons learned")).toBeVisible();
    const match = page.getByTestId("match-card");
    await expect(match).toBeVisible();
    await expect(match.getByText(/Reported to the SEC as of \d{4}-\d{2}-\d{2}/)).toBeVisible();
    // Source credit is server-rendered next to the data (FantasyCalc terms).
    await expect(page.getByRole("link", { name: "FantasyCalc" }).first()).toBeVisible();
  });

  test("onboarding walks through five ideas and marks the learner onboarded", async ({ page }) => {
    await freshStart(page);
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: /A price is what someone will pay/ })).toBeVisible();
    await expect(page.getByText("In the stock market…").first()).toBeVisible();
    await expect(page.getByText("In fantasy football…").first()).toBeVisible();
    for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: /players and companies/ })).toBeVisible();
    await page.getByRole("button", { name: "Start the learning path" }).click();
    await expect(page).toHaveURL(/\/learn\/price/);
    await page.goto("/");
    await expect(page.getByText("New here?")).toHaveCount(0);
  });

  test("a lesson quiz records progress", async ({ page }) => {
    await freshStart(page);
    await page.goto("/learn/change");
    await expect(page.getByTestId("live-example")).toContainText(/Biggest 30-day gainer/);
    await page.getByRole("button", { name: "A: +30% beats +3%" }).click();
    await page.getByRole("button", { name: /The price fell 5%/ }).click();
    await page.getByRole("button", { name: /compare things with very different prices/ }).click();
    await expect(page.getByText("You scored 3 of 3. Lesson learned!")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("1 of 5 lessons learned")).toBeVisible();
  });
});

test.describe("market screens", () => {
  test("markets lists players, filters by position and sorts by volume", async ({ page }) => {
    await page.goto("/markets");
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(300);
    await page.getByRole("radio", { name: "TE" }).or(page.getByRole("button", { name: "TE", exact: true })).first().click();
    await expect(rows.first().getByText("TE", { exact: true })).toBeVisible();
    await page.getByLabel("Search players").fill("kelce");
    await expect(rows).toHaveCount(1);
  });

  test("redraft toggle switches the market", async ({ page }) => {
    await page.goto("/markets?fmt=redraft");
    await expect(page.getByText(/redraft, 1QB, 12 teams, PPR/)).toBeVisible();
  });

  test("practice trade gives feedback and shows up in portfolio and activity", async ({ page }) => {
    await freshStart(page);
    await page.goto("/player/9221");
    await expect(page.getByRole("heading", { name: "Jahmyr Gibbs" })).toBeVisible();
    await page.getByLabel("Shares").fill("2");
    await page.getByRole("button", { name: "Buy Jahmyr Gibbs" }).click();
    await expect(page.getByText("What just happened")).toBeVisible();
    await expect(page.getByText("Your portfolio is concentrated")).toBeVisible();
    await page.goto("/portfolio");
    await expect(page.getByRole("link", { name: "Jahmyr Gibbs" })).toBeVisible();
    await expect(page.getByTestId("diversification-summary")).toContainText("100% of the value is in RBs");
    await page.goto("/activity");
    await expect(page.getByText(/Bought\s*2 ×/)).toBeVisible();
  });

  test("johnrog's real roster is valued as a portfolio", async ({ page }) => {
    await page.goto("/portfolio/sleeper/johnrog");
    await expect(page.getByTestId("roster-total")).toHaveText(/^\d{1,3}(,\d{3})+$/);
    await expect(page.getByRole("navigation", { name: "Leagues" }).getByRole("link")).toHaveCount(4);
    await expect(page.getByTestId("diversification-summary")).toBeVisible();
  });

  test("unknown Sleeper user shows a friendly error", async ({ page }) => {
    await page.goto("/portfolio/sleeper/nobody_here_123");
    await expect(page.getByRole("alert").filter({ hasText: "No Sleeper user" })).toBeVisible();
  });

  test("activity shows real moves as order history", async ({ page }) => {
    await page.goto("/activity?user=johnrog");
    await expect(page.getByRole("heading", { name: "Real moves from Sleeper" })).toBeVisible();
    await expect(page.getByText(/Free-agent pickup|Waiver claim|Trade/).first()).toBeVisible();
  });
});

test.describe("teaching layer and settings", () => {
  test("Learn mode explains terms and can be switched off", async ({ page }) => {
    await freshStart(page);
    await page.goto("/markets");
    await page.getByRole("button", { name: /Volume: what does this mean/ }).click();
    await expect(page.getByText(/FSX uses Sleeper's trending data/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Why this matters/)).toBeVisible();
    await page.getByRole("switch", { name: /Learn mode/ }).click();
    await expect(page.getByText(/Why this matters/)).toHaveCount(0);
  });

  test("theme toggle switches to dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/glossary");
    await page.getByRole("button", { name: /Toggle light or dark theme/ }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("tutor reports offline when no API key is configured", async ({ page }) => {
    await page.goto("/glossary");
    await page.getByRole("button", { name: /Explain-this tutor/ }).click();
    await page.getByRole("button", { name: "What does volume mean here?" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /offline/ })).toBeVisible();
  });

  test("mobile layout uses the menu @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Markets" }).click();
    await expect(page).toHaveURL(/\/markets/);
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  for (const scheme of ["light", "dark"] as const)
  for (const path of ["/", "/learn/price", "/markets", "/player/9221", "/portfolio/sleeper/johnrog", "/glossary"]) {
    test(`no serious violations on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
    });
  }
});
