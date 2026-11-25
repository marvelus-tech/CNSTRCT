import assert from "node:assert/strict";
import test from "node:test";

import { emailConfigured } from "./config";
import { redactEmailAddress } from "./redact";
import { sendTransactional } from "./send";
import { welcomeEmailContent } from "./templates";

test("emailConfigured is false when Resend vars missing", () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  assert.equal(emailConfigured(), false);
  if (prevKey !== undefined) process.env.RESEND_API_KEY = prevKey;
  else delete process.env.RESEND_API_KEY;
  if (prevFrom !== undefined) process.env.EMAIL_FROM = prevFrom;
  else delete process.env.EMAIL_FROM;
});

test("emailConfigured is true when both vars set", () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "BizOS <hello@example.com>";
  assert.equal(emailConfigured(), true);
  if (prevKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = prevKey;
  if (prevFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = prevFrom;
});

test("redactEmailAddress masks local part", () => {
  assert.equal(redactEmailAddress("owner@acme.test"), "o***@acme.test");
});

test("sendTransactional returns not_configured without API key", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  const result = await sendTransactional({
    to: "a@b.co",
    subject: "Test",
    text: "Hi",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "not_configured");
  if (prevKey !== undefined) process.env.RESEND_API_KEY = prevKey;
  if (prevFrom !== undefined) process.env.EMAIL_FROM = prevFrom;
});

test("welcomeEmailContent includes site URL", () => {
  const { subject, text, html } = welcomeEmailContent({ siteUrl: "https://cnstrct-mu.vercel.app/command-center" });
  assert.match(subject, /Welcome/);
  assert.match(text, /command center/);
  assert.match(html, /cnstrct-mu\.vercel\.app/);
});