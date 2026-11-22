import { resolveDatabaseDriver } from "./driver";
import { dataDir, sqliteFile } from "./paths";
import { openPostgres } from "./postgres";
import { openSqliteFile } from "./sqlite";
import type { AppDatabase } from "./types";

export { dataDir, sandboxBaseDir, sqliteFile } from "./paths";
export { EphemeralDatabaseError, resolveDatabaseDriver } from "./driver";
export type { AppDatabase } from "./types";

let current: { key: string; db: AppDatabase } | null = null;

export function getDb(): AppDatabase {
  const dir = dataDir();
  const decision = resolveDatabaseDriver(process.env, dir);
  const key = decision.driver === "sqlite" ? `sqlite:${sqliteFile(dir)}` : "postgres";
  if (current?.key === key) return current.db;
  current?.db.close();
  current = null;
  const db = decision.driver === "sqlite" ? openSqliteFile(sqliteFile(dir)) : openPostgres(decision.url);
  current = { key, db };
  return db;
}

export function closeDb() {
  current?.db.close();
  current = null;
}
