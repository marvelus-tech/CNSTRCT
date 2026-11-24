import { expect, test } from "@playwright/test";

const TABLET_VIEWPORTS = [
  { width: 744, height: 1133, label: "744" },
  { width: 820, height: 1180, label: "820" },
] as const;

for (const viewport of TABLET_VIEWPORTS) {
  test.describe(`landing hub hex @ ${viewport.label}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
    });

    test("how-it-works solo hex stays within hub token bounds", async ({ page }) => {
      const section = page.locator('section[aria-label="How BizOS works"]');
      await section.scrollIntoViewIfNeeded();

      const solo = section.locator(".how-step-hex-solo__mark");
      await expect(solo).toBeVisible();

      const box = await solo.boundingBox();
      expect(box?.width).toBeDefined();
      const width = box!.width;
      expect(width, `solo hex width at ${viewport.label}px`).toBeGreaterThanOrEqual(60);
      expect(width).toBeLessThanOrEqual(100);
    });

    test("connectors planet hex is visible and dark at center", async ({ page }) => {
      const heading = page.getByRole("heading", { name: /All your favorite tools/i });
      await heading.scrollIntoViewIfNeeded();

      const planet = page.locator(".connectors-orbit-planet-hex");
      await expect(planet).toBeVisible();
      await expect
        .poll(async () => (await planet.boundingBox())?.width ?? 0)
        .toBeGreaterThan(48);

      const metrics = await page.evaluate(() => {
        const hex = document.querySelector(".connectors-orbit-planet-hex");
        const arena = document.querySelector(".connectors-orbit-arena");
        if (!hex || !arena) {
          return { ok: false as const, reason: "missing orbit hex or arena" };
        }

        const rect = hex.getBoundingClientRect();
        const opacity = Number.parseFloat(getComputedStyle(hex).opacity);
        const path = hex.querySelector("path");
        const fill = path ? getComputedStyle(path).fill : "";
        const arenaRect = arena.getBoundingClientRect();
        const arenaCx = arenaRect.left + arenaRect.width / 2;
        const arenaCy = arenaRect.top + arenaRect.height / 2;
        const coversArenaCenter =
          rect.left <= arenaCx &&
          rect.right >= arenaCx &&
          rect.top <= arenaCy &&
          rect.bottom >= arenaCy;

        return {
          ok: true as const,
          width: rect.width,
          height: rect.height,
          opacity,
          fill,
          coversArenaCenter,
          planetZ: getComputedStyle(hex.closest(".connectors-orbit-planet")!).zIndex,
        };
      });

      expect(metrics.ok, metrics.ok ? "" : metrics.reason).toBe(true);
      if (!metrics.ok) return;

      expect(metrics.width).toBeGreaterThan(48);
      expect(metrics.height).toBeGreaterThan(48);
      expect(metrics.opacity).toBeGreaterThan(0);
      expect(Number.parseInt(metrics.planetZ, 10)).toBeGreaterThanOrEqual(30);
      expect(metrics.fill).toMatch(/rgb\(0,\s*0,\s*0\)|#000000|#000/i);
      expect(metrics.coversArenaCenter, `planet hex should span orbit center at ${viewport.label}px`).toBe(
        true,
      );
    });
  });
}