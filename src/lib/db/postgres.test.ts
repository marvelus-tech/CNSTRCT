import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresDatabase, openPostgres } from "./postgres";

const url = "postgres://owner:supersecret@invalid.invalid/neondb";

function assertSafeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  assert.equal(message.includes("supersecret"), false);
  assert.equal(message.includes("invalid.invalid"), false);
  assert.doesNotMatch(message, /worker_threads|Cannot find module|is not a function/);
  assert.match(message, /fetch failed|timed out|connect|database|ECONN|ENOTFOUND|getaddrinfo|Postgres/i);
  return true;
}

test("neon http query and transaction fail closed without leaking the URL", { timeout: 20_000 }, async () => {
  const db = createPostgresDatabase(url, { timeoutMs: 4_000 });
  try {
    await assert.rejects(() => db.prepare("SELECT 1 AS n").get(), assertSafeFailure);
    await assert.rejects(
      () => db.transaction([{ sql: "SELECT 1" }, { sql: "SELECT ? AS n", params: [1] }]),
      assertSafeFailure,
    );
  } finally {
    db.close();
  }
});

test("opening postgres migrates over http and fails closed when the network fails", { timeout: 20_000 }, async () => {
  await assert.rejects(() => openPostgres(url, { timeoutMs: 4_000 }), assertSafeFailure);
});
