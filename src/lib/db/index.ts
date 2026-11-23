import { resolveDatabaseDriver, type DatabaseChoice } from "./driver";
import { dataDir, sqliteFile } from "./paths";
import { openPostgres } from "./postgres";
import { openSqliteFile } from "./sqlite";
import type { AppDatabase } from "./types";

export { dataDir, sandboxBaseDir, sqliteFile } from "./paths";
export { EphemeralDatabaseError, resolveDatabaseDriver } from "./driver";
export type { AppDatabase } from "./types";

let current: { key: string; pending: Promise<AppDatabase> } | null = null;

export function getDb(): Promise<AppDatabase> {
  const dir = dataDir();
  const decision = resolveDatabaseDriver(process.env, dir);
  const key = decision.driver === "sqlite" ? `sqlite:${sqliteFile(dir)}` : "postgres";
  if (current?.key === key) return current.pending;
  const previous = current?.pending;
  const pending = openDatabase(decision, dir, previous);
  current = { key, pending };
  pending.catch(() => {
    if (current?.pending === pending) current = null;
  });
  return pending;
}

async function openDatabase(decision: DatabaseChoice, dir: string, previous?: Promise<AppDatabase>) {
  if (previous) {
    try {
      (await previous).close();
    } catch {
      // A failed open has nothing to close.
    }
  }
  if (decision.driver === "sqlite") return openSqliteFile(sqliteFile(dir));
  return openPostgres(decision.url);
}

export async function closeDb() {
  const existing = current;
  current = null;
  if (!existing) return;
  try {
    (await existing.pending).close();
  } catch {
    // A failed open has nothing to close.
  }
}
