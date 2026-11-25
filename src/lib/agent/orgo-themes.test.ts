import assert from "node:assert/strict";
import test from "node:test";

import { orgoThemeForTemplate, orgoTemplateRefForBusiness } from "./orgo-themes";

test("orgoThemeForTemplate maps live templates", () => {
  const hs = orgoThemeForTemplate("home-services");
  assert.equal(hs.themeKey, "home-services");
  assert.equal(orgoTemplateRefForBusiness("home-services"), undefined);
  const md = orgoThemeForTemplate("mobile-detailing");
  assert.equal(md.themeKey, "mobile-detailing");
});