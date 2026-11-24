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
      expect(Number.parseInt(metrics.planetZ, 10)).toBe(10);
      expect(metrics.fill).toMatch(/rgb\(0,\s*0,\s*0\)|#000000|#000/i);
      expect(metrics.coversArenaCenter, `planet hex should span orbit center at ${viewport.label}px`).toBe(
        true,
      );
    });

    test("connectors orbit moons pass behind and in front of hub by z-index", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      const heading = page.getByRole("heading", { name: /All your favorite tools/i });
      await heading.scrollIntoViewIfNeeded();

      const layering = await page.evaluate(() => {
        const planet = document.querySelector(".connectors-orbit-planet");
        const nodes = [...document.querySelectorAll(".connectors-orbit-node")];
        if (!planet || nodes.length === 0) {
          return { ok: false as const, reason: "missing planet or nodes" };
        }

        const planetZ = Number.parseInt(getComputedStyle(planet).zIndex, 10);
        const nodeZ = nodes.map((node) => Number.parseInt(getComputedStyle(node).zIndex, 10));

        return {
          ok: true as const,
          planetZ,
          minNodeZ: Math.min(...nodeZ),
          maxNodeZ: Math.max(...nodeZ),
        };
      });

      expect(layering.ok, layering.ok ? "" : layering.reason).toBe(true);
      if (!layering.ok) return;

      expect(layering.planetZ).toBe(10);
      expect(layering.minNodeZ, `far-side node z-index at ${viewport.label}px`).toBeLessThan(
        layering.planetZ,
      );
      expect(layering.maxNodeZ, `near-side node z-index at ${viewport.label}px`).toBeGreaterThan(
        layering.planetZ,
      );
    });

    test("front-arc connector discs paint above hub at overlap", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      const heading = page.getByRole("heading", { name: /All your favorite tools/i });
      await heading.scrollIntoViewIfNeeded();

      const paintOrder = await page.evaluate(() => {
        const planet = document.querySelector(".connectors-orbit-planet");
        const hex = document.querySelector(".connectors-orbit-planet-hex");
        const nodes = [...document.querySelectorAll(".connectors-orbit-node")];
        if (!planet || !hex || nodes.length === 0) {
          return { ok: false as const, reason: "missing orbit layers" };
        }

        const planetZ = Number.parseInt(getComputedStyle(planet).zIndex, 10);
        const hr = hex.getBoundingClientRect();

        type Sample = { title: string; z: number; nodeHits: number; hexHits: number };

        const frontSamples: Sample[] = nodes
          .map((node) => {
            const z = Number.parseInt(getComputedStyle(node).zIndex, 10);
            if (z <= planetZ) return null;

            const nr = node.getBoundingClientRect();
            let nodeHits = 0;
            let hexHits = 0;

            const xMin = Math.max(nr.left, hr.left);
            const xMax = Math.min(nr.right, hr.right);
            const yMin = Math.max(nr.top, hr.top);
            const yMax = Math.min(nr.bottom, hr.bottom);
            if (xMin >= xMax || yMin >= yMax) return null;

            for (let x = xMin; x <= xMax; x += 6) {
              for (let y = yMin; y <= yMax; y += 6) {
                if (x < nr.left || x > nr.right || y < nr.top || y > nr.bottom) continue;
                const hit = document.elementFromPoint(x, y);
                if (hit?.closest(".connectors-orbit-node") === node) nodeHits += 1;
                else if (hit?.closest(".connectors-orbit-planet")) hexHits += 1;
              }
            }

            if (nodeHits + hexHits === 0) return null;

            return {
              title: node.getAttribute("title") ?? "unknown",
              z,
              nodeHits,
              hexHits,
            };
          })
          .filter((row): row is Sample => row !== null);

        const backBehind = nodes
          .filter((node) => Number.parseInt(getComputedStyle(node).zIndex, 10) < planetZ)
          .map((node) => {
            const nr = node.getBoundingClientRect();
            const cx = nr.left + nr.width / 2;
            const cy = nr.top + nr.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            return {
              title: node.getAttribute("title") ?? "unknown",
              centerOnHex: hit?.closest(".connectors-orbit-planet") != null,
            };
          });

        return {
          ok: true as const,
          planetZ,
          frontSamples,
          backBehind,
        };
      });

      expect(paintOrder.ok, paintOrder.ok ? "" : paintOrder.reason).toBe(true);
      if (!paintOrder.ok) return;

      for (const sample of paintOrder.frontSamples) {
        expect(
          sample.nodeHits,
          `front arc ${sample.title} should win overlap samples at ${viewport.label}px`,
        ).toBeGreaterThan(sample.hexHits);
      }

      const centerFront = await page.evaluate(() => {
        const planet = document.querySelector(".connectors-orbit-planet");
        const nodes = [...document.querySelectorAll(".connectors-orbit-node")];
        if (!planet || nodes.length === 0) return { ok: false as const };

        const planetZ = Number.parseInt(getComputedStyle(planet).zIndex, 10);
        const front = nodes
          .map((node) => ({
            z: Number.parseInt(getComputedStyle(node).zIndex, 10),
            title: node.getAttribute("title"),
            rect: node.getBoundingClientRect(),
          }))
          .filter((n) => n.z > planetZ)
          .sort((a, b) => b.z - a.z)[0];

        if (!front) return { ok: false as const };

        const cx = front.rect.left + front.rect.width / 2;
        const cy = front.rect.top + front.rect.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        return {
          ok: true as const,
          title: front.title,
          onDisc: hit?.closest(".connectors-orbit-node") != null,
          onHex: hit?.closest(".connectors-orbit-planet") != null,
        };
      });

      expect(centerFront.ok).toBe(true);
      if (!centerFront.ok) return;

      expect(
        centerFront.onDisc,
        `front arc ${centerFront.title} disc center should hit disc at ${viewport.label}px`,
      ).toBe(true);
      expect(
        centerFront.onHex,
        `front arc ${centerFront.title} disc center should not hit hub at ${viewport.label}px`,
      ).toBe(false);

      const farSample = paintOrder.backBehind[0];
      if (farSample && paintOrder.planetZ > 1) {
        expect(
          farSample.centerOnHex,
          `far arc ${farSample.title} disc center may sit behind hub at ${viewport.label}px`,
        ).toBe(false);
      }
    });
  });
}