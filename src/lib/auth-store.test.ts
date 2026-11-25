import assert from "node:assert/strict";
import test from "node:test";

import {
  createSession,
  deleteSessionsForUserExcept,
  getUserByAuthSubject,
  getUserByEmail,
  listSessionsForUser,
  upsertUserForAuth,
} from "./store";

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

test("deleteSessionsForUserExcept keeps one active session", async () => {
  const user = await upsertUserForAuth({
    email: `session-${Date.now()}@example.com`,
    name: "Owner",
    authSubject: null,
  });
  const a = await createSession(user.id);
  const b = await createSession(user.id);
  await deleteSessionsForUserExcept(user.id, b);
  const rows = (await listSessionsForUser(user.id)) as { id: string }[];
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, b);
  assert.notEqual(a, b);
});