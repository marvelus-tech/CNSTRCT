import { expect, test, type Page } from "@playwright/test";

const MIN_HEX_COPY_GAP_PX = 8;

async function hexCopyGap(page: Page) {
  const metrics = await page.evaluate(() => {
    const hex = document.querySelector(".hero-overlap-hex__mark");
    const lead = document.querySelector(".hero-overlap-copy-stack p");
    const button = document.querySelector(".hero-overlap-copy-stack a");
    if (!hex || !lead || !button) {
      return { ok: false as const, reason: "missing hero elements" };
    }

    const hb = hex.getBoundingClientRect();
    const lb = lead.getBoundingClientRect();
    const bb = button.getBoundingClientRect();
    const hexBottom = hb.bottom;

    return {
      ok: true as const,
      hexBottom,
      leadTop: lb.top,
      btnTop: bb.top,
      leadGap: lb.top - hexBottom,
      btnGap: bb.top - hexBottom,
    };
  });

  return metrics;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
});

test.describe("landing hero hex isolation", () => {
  test("lead and CTA sit below hex bbox with min gap", async ({ page }) => {
    const metrics = await hexCopyGap(page);
    expect(metrics.ok, metrics.ok ? "" : metrics.reason).toBe(true);
    if (!metrics.ok) return;

    expect(metrics.leadGap).toBeGreaterThanOrEqual(MIN_HEX_COPY_GAP_PX - 0.5);
    expect(metrics.btnGap).toBeGreaterThanOrEqual(MIN_HEX_COPY_GAP_PX - 0.5);
  });

  test("gradient BizOS still overlaps hex on the wordmark", async ({ page }) => {
    const overlap = await page.evaluate(() => {
      const h1 = document.querySelector(".hero-overlap-brand");
      const hex = document.querySelector(".hero-overlap-hex__mark");
      if (!h1 || !hex) return false;
      const hb = h1.getBoundingClientRect();
      const xb = hex.getBoundingClientRect();
      const verticalOverlap = hb.bottom > xb.top + 4;
      const horizontalOverlap = hb.left < xb.right && hb.right > xb.left;
      return verticalOverlap && horizontalOverlap;
    });
    expect(overlap).toBe(true);
  });
});