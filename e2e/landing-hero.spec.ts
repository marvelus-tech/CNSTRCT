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
      const prefix = document.querySelector(".hero-overlap-brand__prefix");
      const hex = document.querySelector(".hero-overlap-hex__mark");
      if (!prefix || !hex) return false;
      const hb = prefix.getBoundingClientRect();
      const xb = hex.getBoundingClientRect();
      const verticalOverlap = hb.bottom > xb.top + 4;
      const horizontalOverlap = hb.left < xb.right && hb.right > xb.left;
      return verticalOverlap && horizontalOverlap;
    });
    expect(overlap).toBe(true);
  });

  test("hero fills mobile viewport without the next section peeking", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));

    const firstScreen = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-label="BizOS introduction"]');
      const next = document.querySelector('section[aria-label="How BizOS works"]');
      if (!hero || !next) {
        return { ok: false as const, reason: "missing hero or next section" };
      }
      const shell = document.querySelector(".landing-first-screen");
      const heroBox = hero.getBoundingClientRect();
      const nextTop = next.getBoundingClientRect().top;
      const shellBottom = shell?.getBoundingClientRect().bottom ?? heroBox.bottom;
      const vh =
        window.visualViewport?.height ??
        document.documentElement.clientHeight;
      return {
        ok: true as const,
        vh,
        shellBottom,
        heroBottom: heroBox.bottom,
        nextTop,
        nextVisible: nextTop < shellBottom - 0.5,
      };
    });

    expect(firstScreen.ok, firstScreen.ok ? "" : firstScreen.reason).toBe(true);
    if (!firstScreen.ok) return;
    expect(firstScreen.nextVisible).toBe(false);
    expect(firstScreen.shellBottom).toBeGreaterThanOrEqual(firstScreen.vh - 2);
  });

  test("suffix OS (including S) is not covered by hex bbox", async ({ page }) => {
    const clear = await page.evaluate(() => {
      const suffix = document.querySelector(".hero-overlap-brand__suffix");
      const hex = document.querySelector(".hero-overlap-hex__mark");
      if (!suffix || !hex) {
        return { ok: false as const, reason: "missing hero brand parts" };
      }
      const text = suffix.textContent ?? "";
      const range = document.createRange();
      const walker = document.createTreeWalker(suffix, NodeFilter.SHOW_TEXT);
      const node = walker.nextNode();
      if (!node || text.length < 1) {
        return { ok: false as const, reason: "missing suffix text node" };
      }
      const sIdx = text.length - 1;
      range.setStart(node, sIdx);
      range.setEnd(node, sIdx + 1);
      const sb = range.getBoundingClientRect();
      const xb = hex.getBoundingClientRect();
      const overlaps =
        sb.left < xb.right &&
        sb.right > xb.left &&
        sb.top < xb.bottom &&
        sb.bottom > xb.top;
      const overlapX = Math.min(sb.right, xb.right) - Math.max(sb.left, xb.left);
      return { ok: true as const, overlaps, overlapX };
    });

    expect(clear.ok, clear.ok ? "" : clear.reason).toBe(true);
    if (!clear.ok) return;
    expect(clear.overlaps).toBe(false);
    expect(clear.overlapX).toBeLessThanOrEqual(0);
  });
});