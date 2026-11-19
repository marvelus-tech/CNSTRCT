import assert from "node:assert/strict";
import test from "node:test";

import { opportunityCardsForProfile } from "./opportunity-cards";
import { parseProfile } from "./profile";
import type { Profile } from "./types";

const body = {
  interests: "woodworking",
  skills: "talking to neighbors",
  hasIdea: true,
  ideaText: "a cookie stand",
  space: "corner",
  capital: "none",
  trades: "maybe",
  location: "Austin, TX",
  constraints: "weeknights",
};

test("parseProfile accepts preview user id for opportunity preview", () => {
  const parsed = parseProfile("preview", body);
  assert.ok(!("error" in parsed));
  assert.equal(parsed.location, "Austin, TX");
});

test("opportunityCardsForProfile returns three cards with two live", () => {
  const parsed = parseProfile("preview", body);
  assert.ok(!("error" in parsed));
  const cards = opportunityCardsForProfile(parsed as Profile);
  assert.equal(cards.length, 3);
  assert.equal(cards.filter((c) => c.live).length, 2);
  const home = cards.find((c) => c.id === "home-services");
  assert.ok(home?.live);
  assert.match(String(home?.summary), /Austin/i);
});