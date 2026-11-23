export class EphemeralDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EphemeralDatabaseError";
  }
}

export type DatabaseEnv = {
  NODE_ENV?: string;
  VERCEL?: string;
  NEXT_PHASE?: string;
  CNSTRCT_DB?: string;
  DATABASE_URL?: string;
  POSTGRES_URL?: string;
};

export type DatabaseChoice = { driver: "sqlite" } | { driver: "postgres"; url: string };

const BUILD_PHASE = "phase-production-build";

/**
 * Production on Vercel must have a Neon (Vercel Postgres) URL.
 * `NODE_ENV=test` stays on sqlite even if a URL is present, so the suite
 * cannot talk to a real database by accident. Set `CNSTRCT_DB=postgres` to opt in.
 * `next build` sets `NEXT_PHASE` and must not require the URL.
 */
export function resolveDatabaseDriver(env: DatabaseEnv, dataDirectory: string): DatabaseChoice {
  const url = firstUrl(env.DATABASE_URL, env.POSTGRES_URL);
  const forcedSqlite = env.CNSTRCT_DB === "sqlite";
  const forcedPostgres = env.CNSTRCT_DB === "postgres";
  const test = env.NODE_ENV === "test";

  if (test && !forcedPostgres) return { driver: "sqlite" };

  if (forcedPostgres && !url) {
    throw new Error("CNSTRCT_DB=postgres requires DATABASE_URL or POSTGRES_URL.");
  }

  // `next build` sets this phase and must not dial Neon or refuse a missing URL.
  if (env.NEXT_PHASE === BUILD_PHASE && !forcedPostgres) return { driver: "sqlite" };

  if (isServerlessRuntime(env)) {
    if (forcedSqlite || !url) {
      throw new EphemeralDatabaseError(
        "Production refuses ephemeral SQLite. Set DATABASE_URL or POSTGRES_URL to a Neon (Vercel Postgres) connection string.",
      );
    }
    return { driver: "postgres", url };
  }

  if (forcedSqlite) return { driver: "sqlite" };
  if (url) return { driver: "postgres", url };

  if (env.NODE_ENV === "production" && isEphemeralDataDir(dataDirectory)) {
    throw new EphemeralDatabaseError(
      "Production refuses SQLite under /tmp. Set DATABASE_URL or POSTGRES_URL, or point CNSTRCT_DATA_DIR at a durable disk.",
    );
  }

  return { driver: "sqlite" };
}

export function isServerlessRuntime(env: DatabaseEnv) {
  return env.VERCEL === "1" && env.NEXT_PHASE !== BUILD_PHASE;
}

export function isEphemeralDataDir(dir: string) {
  const normalized = dir.replace(/\\/g, "/");
  return (
    normalized === "/tmp" ||
    normalized.startsWith("/tmp/") ||
    normalized === "/private/tmp" ||
    normalized.startsWith("/private/tmp/")
  );
}

export function firstUrl(...values: Array<string | undefined>) {
  for (const value of values) {
    const cleaned = cleanUrl(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function cleanUrl(value: string | undefined) {
  if (!value) return undefined;
  let next = value.trim();
  if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) {
    next = next.slice(1, -1).trim();
  }
  return next || undefined;
}

/** Drop connection strings and long passwords from driver errors before they reach logs. */
export function scrubDatabaseError(error: unknown, secrets: readonly string[] = []): Error {
  let message = error instanceof Error ? error.message : String(error);
  message = message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]");
  for (const secret of secrets) {
    if (secret.length >= 8) message = message.split(secret).join("[redacted]");
  }
  const wrapped = new Error(message);
  wrapped.name = "DatabaseError";
  return wrapped;
}

export function secretsInConnectionString(connectionString: string) {
  const secrets = [connectionString];
  try {
    const url = new URL(connectionString);
    if (url.password) secrets.push(decodeURIComponent(url.password));
  } catch {
    // The raw string is already in the list.
  }
  return secrets;
}
