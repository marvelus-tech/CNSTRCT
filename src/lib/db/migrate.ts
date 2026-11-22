import { MIGRATIONS, SCHEMA_MIGRATIONS_SQL } from "./migrations";
import { partitionRoleIndex, sqlForDialect } from "./sql";
import type { Queryable } from "./types";

/**
 * Applies versions that are not in `schema_migrations`.
 * The unique role index is not inside that transaction: a database that already
 * has two agents with the same role used to skip the index and keep running.
 * Later boots create it once the duplicates are gone.
 */
export function migrate(db: Queryable, dialect: "postgres" | "sqlite") {
  db.exec(sqlForDialect(SCHEMA_MIGRATIONS_SQL, dialect));
  const applied = new Set(
    db.query("SELECT version FROM schema_migrations").map((row) => String(record(row).version ?? "")),
  );
  let roleIndex: string | null = null;
  for (const migration of MIGRATIONS) {
    const parts = partitionRoleIndex(sqlForDialect(migration.sql, dialect));
    if (parts.roleIndex) roleIndex = parts.roleIndex;
    if (applied.has(migration.version)) continue;
    db.transaction([
      ...parts.statements.map((sql) => ({ sql })),
      {
        sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        params: [migration.version, Date.now()],
      },
    ]);
  }
  if (roleIndex) ensureRoleIndex(db, roleIndex);
}

export function ensureRoleIndex(db: Queryable, statement: string) {
  const dupes = db.query(
    "SELECT business_id, role FROM agents GROUP BY business_id, role HAVING COUNT(*) > 1",
  );
  if (dupes.length > 0) return;
  db.exec(statement);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
