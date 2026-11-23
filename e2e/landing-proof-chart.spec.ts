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
});