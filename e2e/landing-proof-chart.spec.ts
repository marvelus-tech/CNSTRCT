import { expect, test } from "@playwright/test";

test.describe("landing proof chart", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("endpoint labels in SVG, no below-chart KPI row", async ({ page }) => {
    const section = page.locator(
      'section[aria-label="Enterprise AI adoption and business formation trends"]',
    );
    await expect(section).toBeVisible();

    const chartSvg = section.locator("figure.proof-chart-figure svg");
    await expect(chartSvg).toBeVisible();

    await expect(chartSvg.getByText("89%", { exact: true })).toBeVisible();
    await expect(chartSvg.getByText("AI adoption (2026)", { exact: true })).toBeVisible();
    await expect(chartSvg.getByText("5.7M", { exact: true })).toBeVisible();
    await expect(chartSvg.getByText("New applications, US (2026)", { exact: true })).toBeVisible();

    const belowChartKpiRow = section.locator(
      'div.grid.grid-cols-2:has(p:text("AI adoption (2026)"))',
    );
    await expect(belowChartKpiRow).toHaveCount(0);
  });

  test("endpoint value labels have vertical separation on mobile", async ({ page }) => {
    const chartSvg = page.locator("figure.proof-chart-figure svg");
    await expect(chartSvg).toBeVisible();

    const gapPx = await chartSvg.evaluate((svg) => {
      const valueNodes = [...svg.querySelectorAll("text")].filter((node) => {
        const text = node.textContent?.trim() ?? "";
        return text === "89%" || text === "5.7M";
      });
      if (valueNodes.length !== 2) return -1;

      const byText = new Map(
        valueNodes.map((node) => [node.textContent?.trim() ?? "", node.getBBox()]),
      );
      const aiBox = byText.get("89%");
      const bfsBox = byText.get("5.7M");
      if (!aiBox || !bfsBox) return -1;

      return bfsBox.y - (aiBox.y + aiBox.height);
    });

    expect(gapPx).toBeGreaterThanOrEqual(24);
  });

  test("stats share one visual column with three equal columns on mobile", async ({ page }) => {
    const section = page.locator(
      'section[aria-label="Enterprise AI adoption and business formation trends"]',
    );
    const visual = section.locator(".proof-strip-visual");
    await expect(visual).toBeVisible();

    const statItems = visual.locator(".proof-strip-visual-stats > li");
    await expect(statItems).toHaveCount(3);

    for (const item of await statItems.all()) {
      const className = (await item.getAttribute("class")) ?? "";
      expect(className).not.toMatch(/col-span-2/);
    }

    const figure = visual.locator("figure.proof-chart-figure");
    const firstStat = statItems.first();
    const [figureBox, statBox] = await Promise.all([
      figure.boundingBox(),
      firstStat.boundingBox(),
    ]);
    expect(figureBox).not.toBeNull();
    expect(statBox).not.toBeNull();
    if (figureBox && statBox) {
      expect(Math.abs(figureBox.x - statBox.x)).toBeLessThanOrEqual(4);
    }
  });
});