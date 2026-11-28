import assert from "node:assert/strict";
import test from "node:test";

import { friendlyMagicLinkProviderError } from "./auth-magic";

test("friendlyMagicLinkProviderError uses a calm default", () => {
  assert.match(friendlyMagicLinkProviderError(), /could not send an email/i);
  assert.doesNotMatch(friendlyMagicLinkProviderError("upstream failed"), /provider rejected/i);
});

test("friendlyMagicLinkProviderError maps rate limits", () => {
  assert.equal(
    friendlyMagicLinkProviderError('{"msg":"Email rate limit exceeded"}'),
    "Too many attempts. Wait a minute and try again.",
  );
});

test("friendlyMagicLinkProviderError maps invalid email", () => {
  assert.equal(friendlyMagicLinkProviderError("Email address is invalid"), "Enter a valid email address.");
});