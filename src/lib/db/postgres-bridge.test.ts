import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresDatabase, openPostgres } from "./postgres";

const url = "postgres://owner:supersecret@invalid.invalid/neondb";

function assertSafeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  assert.equal(message.includes("supersecret"), false);
  assert.equal(message.includes("invalid.invalid"), false);
  assert.doesNotMatch(message, /is not a function|Unknown postgres operation|Neon driver export is missing/);
  assert.match(message, /fetch failed|timed out|connect|database|ECONN|ENOTFOUND|getaddrinfo|Postgres/i);
  return true;
}

test("neon worker runs query and transaction without leaking the URL", { timeout: 20_000 }, () => {
  const db = createPostgresDatabase(url, { timeoutMs: 4_000 });
  try {
    assert.throws(() => db.prepare("SELECT 1 AS n").get(), assertSafeFailure);
    assert.throws(
      () => db.transaction([{ sql: "SELECT 1" }, { sql: "SELECT ? AS n", params: [1] }]),
      assertSafeFailure,
    );
  } finally {
    db.close();
  }
});

test("opening postgres migrates through the worker and closes it when the network fails", { timeout: 20_000 }, () => {
  assert.throws(() => openPostgres(url, { timeoutMs: 4_000 }), assertSafeFailure);
});
