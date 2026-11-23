import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrate";
import { seedSample } from "./seed";
import type { AppDatabase, SqlStatement, Statement } from "./types";

/**
 * Explicit local and test adapter. Production on Vercel never calls this.
 * Old files created before versioned migrations get the columns that used to
 * be added with PRAGMA table_info, then the shared migration runs.
 *
 * The methods are async so the store has one calling convention. A mutex
 * keeps a transaction from mixing with another query on this connection:
 * `node:sqlite` is synchronous, and an `await` between statements would
 * otherwise let a second request run inside the open transaction.
 */
export async function openSqliteFile(file: string): Promise<AppDatabase> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  ensureLegacyColumns(raw);
  const db = wrapSqlite(raw);
  try {
    await migrate(db, "sqlite");
    await seedSample(db);
  } catch (error) {
    raw.close();
    throw error;
  }
  return db;
}

function wrapSqlite(raw: DatabaseSync): AppDatabase {
  let tail: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => T): Promise<T> => {
    const run = tail.then(() => fn());
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const prepare = (sql: string): Statement => ({
    run: (...params: unknown[]) =>
      exclusive(() => {
        const result = raw.prepare(sql).run(...params) as { changes?: number };
        return { changes: Number(result?.changes ?? 0) };
      }),
    get: (...params: unknown[]) => exclusive(() => raw.prepare(sql).get(...params)),
    all: (...params: unknown[]) => exclusive(() => raw.prepare(sql).all(...params) as unknown[]),
  });

  return {
    prepare,
    query: (sql, params = []) => exclusive(() => raw.prepare(sql).all(...params) as unknown[]),
    exec: (sql) => exclusive(() => raw.exec(sql)),
    transaction: (statements) => exclusive(() => applySqliteTransaction(raw, statements)),
    close: () => raw.close(),
  };
}

function applySqliteTransaction(raw: DatabaseSync, statements: readonly SqlStatement[]) {
  if (statements.length === 0) return;
  raw.exec("BEGIN");
  try {
    for (const statement of statements) {
      const params = statement.params ?? [];
      if (params.length > 0) raw.prepare(statement.sql).run(...params);
      else raw.exec(statement.sql);
    }
    raw.exec("COMMIT");
  } catch (error) {
    try {
      raw.exec("ROLLBACK");
    } catch {
      // The original error is the one that matters.
    }
    throw error;
  }
}

function ensureLegacyColumns(raw: DatabaseSync) {
  addMissing(raw, "businesses", "profile_json", "ALTER TABLE businesses ADD COLUMN profile_json TEXT");
  addMissing(raw, "businesses", "orgo_workspace_id", "ALTER TABLE businesses ADD COLUMN orgo_workspace_id TEXT");
  addMissing(raw, "agents", "specialty", "ALTER TABLE agents ADD COLUMN specialty TEXT NOT NULL DEFAULT ''");
  addMissing(raw, "agents", "orgo_computer_id", "ALTER TABLE agents ADD COLUMN orgo_computer_id TEXT");
  addMissing(raw, "agents", "tools_json", "ALTER TABLE agents ADD COLUMN tools_json TEXT NOT NULL DEFAULT ''");
  addMissing(raw, "audit_events", "ref_id", "ALTER TABLE audit_events ADD COLUMN ref_id TEXT");
}

function addMissing(raw: DatabaseSync, table: string, column: string, alter: string) {
  if (!tableExists(raw, table)) return;
  const columns = raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((item) => item.name === column)) return;
  raw.exec(alter);
}

function tableExists(raw: DatabaseSync, table: string) {
  return Boolean(raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}
