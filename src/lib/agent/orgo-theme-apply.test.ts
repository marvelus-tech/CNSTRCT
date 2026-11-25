import assert from "node:assert/strict";
import test from "node:test";

import { orgoThemeForTemplate } from "./orgo-themes";

test("orgo theme apply uses P14 mapping keys", () => {
  const hs = orgoThemeForTemplate("home-services");
  assert.equal(hs.themeKey, "home-services");
  assert.equal(hs.orgoTemplateRef, null);
});