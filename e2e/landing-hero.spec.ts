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

  test("full wordmark sits beneath hex layer (no OS elevation)", async ({ page }) => {
    const order = await page.evaluate(() => {
      const h1 = document.querySelector(".hero-overlap-brand");
      const hexWrap = document.querySelector(".hero-overlap-hex");
      const hex = document.querySelector(".hero-overlap-hex__mark");
      if (!h1 || !hexWrap || !hex) {
        return { ok: false as const, reason: "missing hero overlap layers" };
      }
      const h1Z = Number.parseInt(getComputedStyle(h1).zIndex, 10);
      const hexZ = Number.parseInt(getComputedStyle(hexWrap).zIndex, 10);
      const splitGlyphs = Boolean(
        document.querySelector(".hero-overlap-brand__suffix"),
      );
      const hb = h1.getBoundingClientRect();
      const xb = hex.getBoundingClientRect();
      const hexFollowsWordmark =
        (h1.compareDocumentPosition(hexWrap) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0;
      const text = h1.textContent ?? "";
      const osStart = Math.max(0, text.indexOf("O"));
      const osRange = document.createRange();
      osRange.setStart(h1.firstChild!, osStart);
      osRange.setEnd(h1.firstChild!, text.length);
      const ob = osRange.getBoundingClientRect();
      const hexOverlapsOs =
        ob.bottom > xb.top + 4 &&
        ob.left < xb.right &&
        ob.right > xb.left &&
        hb.bottom > xb.top + 4;
      return {
        ok: true as const,
        h1Z: Number.isNaN(h1Z) ? 0 : h1Z,
        hexZ,
        splitGlyphs,
        hexFollowsWordmark,
        hexOverlapsOs,
      };
    });

    expect(order.ok, order.ok ? "" : order.reason).toBe(true);
    if (!order.ok) return;
    expect(order.splitGlyphs).toBe(false);
    expect(order.h1Z).toBeLessThan(order.hexZ);
    expect(order.hexFollowsWordmark).toBe(true);
    expect(order.hexOverlapsOs).toBe(true);
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

  test("S glyph is not clipped by the brand stack or hero section", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const stack = document.querySelector(".hero-overlap-brand-stack");
      const section = document.querySelector('section[aria-label="BizOS introduction"]');
      const h1 = document.querySelector(".hero-overlap-brand");
      if (!stack || !section || !h1) {
        return { ok: false as const, reason: "missing hero brand parts" };
      }
      const text = h1.textContent ?? "";
      const range = document.createRange();
      const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
      const node = walker.nextNode();
      if (!node || text.length < 1) {
        return { ok: false as const, reason: "missing suffix text node" };
      }
      const sIdx = text.length - 1;
      range.setStart(node, sIdx);
      range.setEnd(node, sIdx + 1);
      const sb = range.getBoundingClientRect();
      const stackRect = stack.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const stackStyle = getComputedStyle(stack);
      const clientRects = range.getClientRects();
      let maxRight = sb.right;
      for (let i = 0; i < clientRects.length; i++) {
        maxRight = Math.max(maxRight, clientRects[i].right);
      }
      const h1Rect = h1.getBoundingClientRect();
      return {
        ok: true as const,
        overflowX: stackStyle.overflowX,
        insetStackEnd: stackRect.right - maxRight,
        insetSectionEnd: sectionRect.right - maxRight,
        insetH1End: h1Rect.right - maxRight,
      };
    });

    expect(metrics.ok, metrics.ok ? "" : metrics.reason).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.overflowX).not.toBe("hidden");
    expect(metrics.insetStackEnd).toBeGreaterThanOrEqual(2);
    expect(metrics.insetH1End).toBeGreaterThanOrEqual(2);
    expect(metrics.insetSectionEnd).toBeGreaterThanOrEqual(8);
  });
});