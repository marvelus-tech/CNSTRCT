import { neon } from "@neondatabase/serverless";
import { scrubDatabaseError, secretsInConnectionString } from "./driver";
import { migrate } from "./migrate";
import { seedSample } from "./seed";
import { toPostgresPlaceholders } from "./sql";
import type { AppDatabase, SqlStatement, Statement } from "./types";

/**
 * Neon HTTP driver. Queries are async, so the store awaits them on the
 * request. There is no worker thread. A batch that must commit or roll back
 * together uses `sql.transaction`, which is one HTTP request, not a session.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

type QueryRows = { rows?: unknown[]; rowCount?: number | null };

type NeonQuery = (
  text: string,
  params?: readonly unknown[],
  opts?: { fullResults?: boolean; fetchOptions?: { signal?: AbortSignal } },
) => Promise<QueryRows>;

type NeonSql = {
  query: NeonQuery;
  transaction: (
    fn: (txn: { query: NeonQuery }) => Promise<QueryRows>[],
    opts?: { fullResults?: boolean; fetchOptions?: { signal?: AbortSignal } },
  ) => Promise<QueryRows[]>;
};

export async function openPostgres(connectionString: string, options?: { timeoutMs?: number }): Promise<AppDatabase> {
  const db = createPostgresDatabase(connectionString, options);
  try {
    await migrate(db, "postgres");
    await seedSample(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function createPostgresDatabase(connectionString: string, options?: { timeoutMs?: number }): AppDatabase {
  if (typeof neon !== "function") throw new Error("Neon serverless driver did not load.");
  return new PostgresDatabase(connectionString, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
}

class PostgresDatabase implements AppDatabase {
  private readonly sql: NeonSql;
  private readonly secrets: string[];
  private readonly timeoutMs: number;

  constructor(connectionString: string, timeoutMs: number) {
    this.secrets = secretsInConnectionString(connectionString);
    this.timeoutMs = timeoutMs;
    this.sql = neon(connectionString) as unknown as NeonSql;
  }

  prepare(sql: string): Statement {
    const text = toPostgresPlaceholders(sql);
    return {
      run: async (...params: unknown[]) => {
        const result = await this.command(text, params);
        return { changes: result.rowCount };
      },
      get: async (...params: unknown[]) => (await this.command(text, params)).rows[0],
      all: async (...params: unknown[]) => (await this.command(text, params)).rows,
    };
  }

  query(sql: string, params: readonly unknown[] = []) {
    return this.command(toPostgresPlaceholders(sql), params).then((result) => result.rows);
  }

  async exec(sql: string) {
    await this.command(toPostgresPlaceholders(sql), []);
  }

  async transaction(statements: readonly SqlStatement[]) {
    if (statements.length === 0) return;
    try {
      await this.sql.transaction(
        (txn) =>
          statements.map((statement) =>
            txn.query(toPostgresPlaceholders(statement.sql), [...(statement.params ?? [])], {
              fullResults: true,
              fetchOptions: { signal: AbortSignal.timeout(this.timeoutMs) },
            }),
          ),
        { fullResults: true, fetchOptions: { signal: AbortSignal.timeout(this.timeoutMs) } },
      );
    } catch (error) {
      throw scrubDatabaseError(error, this.secrets);
    }
  }

  close() {
    // HTTP queries do not hold a socket.
  }

  private async command(text: string, params: readonly unknown[]) {
    try {
      const result = await this.sql.query(text, params, {
        fullResults: true,
        fetchOptions: { signal: AbortSignal.timeout(this.timeoutMs) },
      });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      const rowCount = typeof result?.rowCount === "number" ? result.rowCount : rows.length;
      return { rows, rowCount };
    } catch (error) {
      throw scrubDatabaseError(error, this.secrets);
    }
  }
}
