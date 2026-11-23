import { expect, test } from "@playwright/test";

test.describe("landing how it works step rhythm", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("mobile vertical order: 01 copy, solo hex, 02 copy, cluster", async ({ page }) => {
    const order = await page.evaluate(() => {
      const section = document.querySelector('section[aria-label="How BizOS works"]');
      if (!section) {
        return { ok: false as const, reason: "missing how-it-works section" };
      }

      const stepTitles = Array.from(section.querySelectorAll(".how-step-title")).map((el) =>
        (el.textContent ?? "").trim(),
      );
      const hex = section.querySelector(".how-step-hex-solo__mark");
      const cluster = section.querySelector(".founding-team-cluster");
      const titles = Array.from(section.querySelectorAll(".how-step-title"));

      if (stepTitles.length !== 2 || !hex || !cluster || titles.length !== 2) {
        return { ok: false as const, reason: "missing step copy or visuals" };
      }

      const y = (el: Element) => el.getBoundingClientRect().top;
      const title01 = titles[0]!;
      const title02 = titles[1]!;

      return {
        ok: true as const,
        stepTitles,
        y01: y(title01),
        yHex: y(hex),
        y02: y(title02),
        yCluster: y(cluster),
      };
    });

    expect(order.ok, order.ok ? "" : order.reason).toBe(true);
    if (!order.ok) return;

    expect(order.stepTitles).toEqual(["Custom Business", "Start your business"]);
    expect(order.y01).toBeLessThan(order.yHex);
    expect(order.yHex).toBeLessThan(order.y02);
    expect(order.y02).toBeLessThan(order.yCluster);
  });
});