import assert from "node:assert/strict";
import test from "node:test";
import { EphemeralDatabaseError, resolveDatabaseDriver, scrubDatabaseError } from "./driver";
import { ephemeralHostedDemo } from "../hosted-demo";

const publicSite = { NEXT_PUBLIC_SITE_URL: "https://cnstrct-mu.vercel.app" };

test("tests stay on sqlite even when a database URL is present", () => {
  const choice = resolveDatabaseDriver(
    { NODE_ENV: "test", VERCEL: "1", DATABASE_URL: "postgres://user:secret@db.neon.tech/neondb" },
    "/tmp/cnstrct-data",
  );
  assert.deepEqual(choice, { driver: "sqlite" });
});

test("serverless production refuses sqlite and /tmp state", () => {
  assert.throws(
    () => resolveDatabaseDriver({ NODE_ENV: "production", VERCEL: "1" }, "/tmp/cnstrct-data"),
    EphemeralDatabaseError,
  );
  assert.throws(
    () =>
      resolveDatabaseDriver(
        { NODE_ENV: "production", VERCEL: "1", CNSTRCT_DB: "sqlite", DATABASE_URL: "postgres://db.neon.tech/neondb" },
        "/tmp/cnstrct-data",
      ),
    EphemeralDatabaseError,
  );
  assert.throws(
    () => resolveDatabaseDriver({ NODE_ENV: "production" }, "/tmp/cnstrct-data"),
    EphemeralDatabaseError,
  );
});

test("serverless production accepts DATABASE_URL or POSTGRES_URL", () => {
  assert.deepEqual(
    resolveDatabaseDriver(
      { NODE_ENV: "production", VERCEL: "1", DATABASE_URL: " postgres://db.neon.tech/main " },
      "/tmp/cnstrct-data",
    ),
    { driver: "postgres", url: "postgres://db.neon.tech/main" },
  );
  assert.deepEqual(
    resolveDatabaseDriver(
      { NODE_ENV: "production", VERCEL: "1", POSTGRES_URL: '"postgres://db.neon.tech/pooled"' },
      "/tmp/unused",
    ),
    { driver: "postgres", url: "postgres://db.neon.tech/pooled" },
  );
});

test("next build does not require a database URL", () => {
  assert.deepEqual(
    resolveDatabaseDriver({ NODE_ENV: "production", VERCEL: "1", NEXT_PHASE: "phase-production-build" }, "/tmp/build"),
    { driver: "sqlite" },
  );
});

test("local dev uses sqlite until a URL is set, and a durable disk is allowed in production", () => {
  assert.deepEqual(resolveDatabaseDriver({ NODE_ENV: "development" }, "/work/data"), { driver: "sqlite" });
  assert.deepEqual(resolveDatabaseDriver({ NODE_ENV: "production" }, "/var/data"), { driver: "sqlite" });
  assert.deepEqual(
    resolveDatabaseDriver({ NODE_ENV: "development", DATABASE_URL: "postgres://db.neon.tech/main" }, "/work/data"),
    { driver: "postgres", url: "postgres://db.neon.tech/main" },
  );
  assert.throws(
    () => resolveDatabaseDriver({ NODE_ENV: "test", CNSTRCT_DB: "postgres" }, "/tmp/t"),
    /DATABASE_URL or POSTGRES_URL/,
  );
});

test("hosted banner stays off for local and for Neon, and on when production has no database", () => {
  assert.equal(
    ephemeralHostedDemo({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000", NODE_ENV: "production", VERCEL: "1" }, "/tmp/cnstrct-data"),
    false,
  );
  assert.equal(
    ephemeralHostedDemo(
      { ...publicSite, NODE_ENV: "production", VERCEL: "1", DATABASE_URL: "postgres://db.neon.tech/main" },
      "/tmp/cnstrct-data",
    ),
    false,
  );
  assert.equal(
    ephemeralHostedDemo(
      {
        ...publicSite,
        NODE_ENV: "production",
        VERCEL: "1",
        NEXT_PHASE: "phase-production-build",
        DATABASE_URL: "postgres://db.neon.tech/main",
      },
      "/tmp/cnstrct-data",
    ),
    false,
  );
  assert.equal(ephemeralHostedDemo({ ...publicSite, NODE_ENV: "production", VERCEL: "1" }, "/var/data"), true);
  assert.equal(
    ephemeralHostedDemo({ ...publicSite, NODE_ENV: "development" }, "/tmp/cnstrct-data"),
    true,
  );
});

test("driver errors do not keep the connection string", () => {
  const url = "postgres://owner:supersecret@ep-example.neon.tech/neondb";
  const error = scrubDatabaseError(new Error(`connect failed ${url} password supersecret`), [url, "supersecret"]);
  assert.equal(error.message.includes("supersecret"), false);
  assert.equal(error.message.includes("ep-example"), false);
  assert.match(error.message, /postgres:\/\/\[redacted\]/);
});
