import assert from "node:assert/strict";
import test from "node:test";

import { getUserByAuthSubject, getUserByEmail, upsertUserForAuth } from "./store";

test("upsertUserForAuth links auth subject to stable user id", async () => {
  const email = `owner-${Date.now()}@example.com`;
  const subject = `sub_${Date.now()}`;
  const first = await upsertUserForAuth({ email, name: "Owner", authSubject: subject });
  const again = await upsertUserForAuth({ email, name: "Owner", authSubject: subject });
  assert.equal(first.id, again.id);
  const bySubject = await getUserByAuthSubject(subject);
  assert.ok(bySubject);
  assert.equal(bySubject.email, email);
  const byEmail = await getUserByEmail(email);
  assert.equal(byEmail?.id, first.id);
});