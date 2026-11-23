import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { MIGRATIONS } from "./migrations";
import { openSqliteFile } from "./sqlite";
import { partitionRoleIndex, splitSql, sqlForDialect, toPostgresPlaceholders } from "./sql";

const dir = mkdtempSync(path.join(tmpdir(), "cnstrct-migrate-"));

const TABLES = [
  "users",
  "sessions",
  "profiles",
  "businesses",
  "agents",
  "routines",
  "messages",
  "approvals",
  "policies",
  "pending_turns",
  "leads",
  "computers",
  "tasks",
  "audit_events",
  "action_policies",
  "app_connections",
  "billing_entitlements",
  "provisioning_jobs",
  "schema_migrations",
];

test("baseline SQL keeps epoch columns on BIGINT and flags on INTEGER", () => {
  const sql = MIGRATIONS.map((migration) => migration.sql).join("\n");
  for (const column of [
    "created_at",
    "updated_at",
    "resolved_at",
    "next_run_at",
    "last_run_at",
    "current_period_end",
    "interval_ms",
  ]) {
    assert.match(sql, new RegExp(`${column} BIGINT`));
    assert.doesNotMatch(sql, new RegExp(`${column} INTEGER`));
  }
  assert.match(sql, /has_idea INTEGER/);
  assert.match(sql, /enabled INTEGER/);
  assert.match(sql, /tokens_used INTEGER/);
  assert.equal(MIGRATIONS[0]?.version, "001_baseline");
  assert.equal(partitionRoleIndex(sql).roleIndex?.includes("agents_business_role"), true);
});

test("placeholder and dialect rewrites", () => {
  assert.equal(toPostgresPlaceholders("SELECT '?' AS q, ? , ?"), "SELECT '?' AS q, $1 , $2");
  assert.equal(toPostgresPlaceholders("WHERE note = 'it''s ?' AND id = ?"), "WHERE note = 'it''s ?' AND id = $1");
  assert.equal(sqlForDialect("created_at BIGINT NOT NULL", "sqlite"), "created_at INTEGER NOT NULL");
  assert.equal(sqlForDialect("created_at BIGINT NOT NULL", "postgres"), "created_at BIGINT NOT NULL");
  assert.deepEqual(splitSql("CREATE TABLE a (id TEXT); -- comment;\nCREATE TABLE b (id TEXT);"), [
    "CREATE TABLE a (id TEXT)",
    "CREATE TABLE b (id TEXT)",
  ]);
});

test("fresh sqlite migration seeds once and keeps a millisecond timestamp", async () => {
  const file = path.join(dir, "fresh.db");
  const first = await openSqliteFile(file);
  const stamp = 1_730_000_000_000;
  assert.ok(stamp > 2_147_483_647);
  await first.prepare("INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)").run("u_epoch", "e@example.com", "Epoch", stamp);
  const row = (await first.prepare("SELECT created_at FROM users WHERE id = ?").get("u_epoch")) as { created_at: number };
  assert.equal(Number(row.created_at), stamp);
  const names = (await first.query("SELECT name FROM sqlite_master WHERE type = 'table'")).map((item) => String((item as { name: string }).name));
  for (const table of TABLES) assert.ok(names.includes(table), table);
  const index = await first.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get("agents_business_role");
  assert.ok(index);
  const seeded = await first.prepare("SELECT slug FROM businesses WHERE slug = ?").get("harbor-tradie-desk");
  assert.ok(seeded);
  const versions = await first.query("SELECT version FROM schema_migrations");
  assert.equal(versions.length, 3);
  first.close();

  const second = await openSqliteFile(file);
  const businesses = await second.query("SELECT id FROM businesses");
  assert.equal(businesses.length, 1);
  assert.equal((await second.query("SELECT version FROM schema_migrations")).length, 3);
  second.close();
});

test("legacy sqlite file gains columns and skips the role index while duplicates exist", async () => {
  const file = path.join(dir, "legacy.db");
  const raw = new DatabaseSync(file);
  raw.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE businesses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      status TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      computer_seconds INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE audit_events (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      agent_id TEXT,
      actor TEXT NOT NULL,
      kind TEXT NOT NULL,
      tool TEXT,
      decision TEXT,
      summary TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    INSERT INTO users (id, email, name, created_at) VALUES ('user_old', 'old@example.com', 'Old', 10);
    INSERT INTO businesses (id, user_id, template_id, name, slug, city, created_at)
      VALUES ('biz_old', 'user_old', 'home-services', 'Old Desk', 'old-desk', 'Town', 10);
    INSERT INTO agents (id, business_id, user_id, role, name, title, instructions, status, created_at)
      VALUES ('agt_a', 'biz_old', 'user_old', 'scout', 'A', 'Scout', 'do', 'idle', 10);
    INSERT INTO agents (id, business_id, user_id, role, name, title, instructions, status, created_at)
      VALUES ('agt_b', 'biz_old', 'user_old', 'scout', 'B', 'Scout', 'do', 'idle', 11);
  `);
  raw.close();

  const db = await openSqliteFile(file);
  const business = (await db.prepare("SELECT profile_json, orgo_workspace_id FROM businesses WHERE id = ?").get("biz_old")) as {
    profile_json: string | null;
    orgo_workspace_id: string | null;
  };
  assert.equal(business.profile_json, null);
  assert.equal(business.orgo_workspace_id, null);
  const agent = (await db.prepare("SELECT specialty, tools_json, orgo_computer_id FROM agents WHERE id = ?").get("agt_a")) as {
    specialty: string;
    tools_json: string;
    orgo_computer_id: string | null;
  };
  assert.equal(agent.specialty, "");
  assert.equal(agent.tools_json, "");
  assert.equal(agent.orgo_computer_id, null);
  const auditColumns = (await db.query("PRAGMA table_info(audit_events)")) as { name: string }[];
  assert.ok(auditColumns.some((column) => column.name === "ref_id"));
  const index = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get("agents_business_role");
  assert.equal(index, undefined);
  assert.ok(await db.prepare("SELECT id FROM businesses WHERE slug = ?").get("harbor-tradie-desk"));
  db.close();
});

test("store and billing SQL run on the migrated database", async () => {
  process.env.CNSTRCT_DATA_DIR = path.join(dir, "store");
  fs.mkdirSync(process.env.CNSTRCT_DATA_DIR, { recursive: true });
  const { closeDb } = await import("./index");
  await closeDb();
  const { createUser, getProfile, saveProfile } = await import("../store");
  const { getEntitlement, upsertEntitlement } = await import("../billing/entitlements");
  try {
    const user = await createUser({ email: "migrate@example.com", name: "Migrate" });
    await saveProfile({
      userId: user.id,
      interests: "wood",
      skills: "talking",
      hasIdea: true,
      ideaText: "a stand",
      space: "corner",
      capital: "none",
      trades: "maybe",
      location: "Austin",
      constraints: "nights",
    });
    const profile = await getProfile(user.id);
    assert.equal(profile?.hasIdea, true);
    assert.equal(profile?.location, "Austin");
    const periodEnd = Date.now() + 86_400_000;
    await upsertEntitlement({
      userId: user.id,
      planId: "starter",
      currentPeriodEnd: periodEnd,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
    });
    const entitlement = await getEntitlement(user.id);
    assert.equal(entitlement?.planId, "starter");
    assert.equal(entitlement?.currentPeriodEnd, periodEnd);
  } finally {
    await closeDb();
  }
});
