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
 */
export function openSqliteFile(file: string): AppDatabase {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  ensureLegacyColumns(raw);
  const db = wrapSqlite(raw);
  try {
    migrate(db, "sqlite");
    seedSample(db);
  } catch (error) {
    raw.close();
    throw error;
  }
  return db;
}

function wrapSqlite(raw: DatabaseSync): AppDatabase {
  return {
    prepare(sql: string): Statement {
      const statement = raw.prepare(sql);
      return {
        run(...params: unknown[]) {
          return statement.run(...params);
        },
        get(...params: unknown[]) {
          return statement.get(...params);
        },
        all(...params: unknown[]) {
          return statement.all(...params);
        },
      };
    },
    query(sql: string, params: readonly unknown[] = []) {
      return raw.prepare(sql).all(...params);
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    transaction(statements: readonly SqlStatement[]) {
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
    },
    close() {
      raw.close();
    },
  };
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
