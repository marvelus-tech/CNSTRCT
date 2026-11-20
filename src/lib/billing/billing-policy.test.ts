import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "bizos-policy-"));

const profileBody = {
  interests: "woodworking",
  skills: "talking to neighbors",
  hasIdea: true,
  ideaText: "a cookie stand",
  space: "corner" as const,
  capital: "none" as const,
  trades: "maybe" as const,
  location: "Austin, TX",
  constraints: "weeknights",
};

function resetStripe() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_STARTER;
  delete process.env.STRIPE_PRICE_PRO;
}

function setStripeConfigured() {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  process.env.STRIPE_PRICE_PRO = "price_pro";
}

test("local development default bypass when Stripe is unset", async () => {
  delete process.env.VERCEL_ENV;
  delete process.env.BILLING_MODE;
  delete process.env.BILLING_TEST_MODE;
  resetStripe();
  const { billingDevBypassActive, effectiveBillingMode } = await import("./policy");
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  assert.equal(effectiveBillingMode(), "bypass");
  assert.equal(billingDevBypassActive(), true);
  const user = createUser({ email: "local@bizos.local", name: "Local" });
  saveProfile({ userId: user.id, ...profileBody });
  assert.equal(constructionAccess(user.id).ok, true);
});

test("explicit BILLING_MODE=bypass on Vercel preview", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.BILLING_MODE = "bypass";
  delete process.env.BILLING_TEST_MODE;
  setStripeConfigured();
  const { billingDevBypassActive, billingDeployment } = await import("./policy");
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  assert.equal(billingDeployment(), "preview");
  assert.equal(billingDevBypassActive(), true);
  const user = createUser({ email: "preview@bizos.local", name: "Preview" });
  saveProfile({ userId: user.id, ...profileBody });
  assert.equal(constructionAccess(user.id).ok, true);
});

test("production ignores BILLING_MODE=bypass and blocks unpaid users", async () => {
  process.env.VERCEL_ENV = "production";
  process.env.BILLING_MODE = "bypass";
  delete process.env.BILLING_TEST_MODE;
  setStripeConfigured();
  const { billingDevBypassActive, effectiveBillingMode } = await import("./policy");
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  assert.equal(effectiveBillingMode(), "enforce");
  assert.equal(billingDevBypassActive(), false);
  const user = createUser({ email: "unpaid-prod@bizos.local", name: "Unpaid" });
  saveProfile({ userId: user.id, ...profileBody });
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "payment_required");
});

test("production without Stripe returns 503 payments_not_configured", async () => {
  process.env.VERCEL_ENV = "production";
  delete process.env.BILLING_MODE;
  delete process.env.BILLING_TEST_MODE;
  resetStripe();
  const { billingDevBypassActive } = await import("./policy");
  const { createUser } = await import("../store");
  const { constructionAccess } = await import("./access");
  assert.equal(billingDevBypassActive(), false);
  const user = createUser({ email: "noconfig@bizos.local", name: "None" });
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "payments_not_configured");
});

test("production with Stripe and entitlement allows construction", async () => {
  process.env.VERCEL_ENV = "production";
  delete process.env.BILLING_MODE;
  delete process.env.BILLING_TEST_MODE;
  setStripeConfigured();
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  const { upsertEntitlement } = await import("./entitlements");
  const user = createUser({ email: "paid-prod@bizos.local", name: "Paid" });
  saveProfile({ userId: user.id, ...profileBody });
  upsertEntitlement({
    userId: user.id,
    planId: "starter",
    status: "active",
    currentPeriodEnd: Date.now() + 86_400_000,
  });
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, true);
  if (gate.ok) assert.equal(gate.planId, "starter");
});