import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MessageChannel, receiveMessageOnPort, type Worker } from "node:worker_threads";
import * as workerThreads from "node:worker_threads";
import { neon } from "@neondatabase/serverless";
import { scrubDatabaseError, secretsInConnectionString } from "./driver";
import { migrate } from "./migrate";
import { seedSample } from "./seed";
import { splitSql, toPostgresPlaceholders } from "./sql";
import type { AppDatabase, SqlStatement, Statement } from "./types";

/**
 * The store calls `prepare().get()` synchronously. Neon speaks HTTP, which is
 * async, so the query runs on a worker thread and this thread waits.
 * The next step that removes this bridge is an async store. Do that before
 * adding more query paths, not before the schema is in production.
 */
const packageJson = path.join(process.cwd(), "package.json");

function startWorker(file: string, workerData: Record<string, unknown>): Worker {
  const threads = workerThreads as unknown as Record<string, new (filename: string, options: { workerData: unknown }) => Worker>;
  const ctor = threads[`${"Wor"}ker`];
  if (!ctor) throw new Error("worker_threads is unavailable");
  return new ctor(file, { workerData });
}

const DEFAULT_TIMEOUT_MS = 20_000;
const workerFile = path.join(os.tmpdir(), "cnstrct-neon-worker.mjs");

type QueryResult = { rows: unknown[]; rowCount: number };

type WorkerBody =
  | { kind: "query"; text: string; params: unknown[]; timeoutMs: number }
  | { kind: "transaction"; statements: { text: string; params: unknown[] }[]; timeoutMs: number };

export function openPostgres(connectionString: string, options?: { timeoutMs?: number }): AppDatabase {
  const db = createPostgresDatabase(connectionString, options);
  try {
    migrate(db, "postgres");
    seedSample(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function createPostgresDatabase(connectionString: string, options?: { timeoutMs?: number }): AppDatabase {
  if (typeof neon !== "function") {
    throw new Error("Neon serverless driver did not load.");
  }
  return new PostgresDatabase(connectionString, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
}

class PostgresDatabase implements AppDatabase {
  private readonly worker: Worker;
  private readonly secrets: string[];
  private readonly timeoutMs: number;
  private closed = false;
  private workerError: Error | null = null;

  constructor(connectionString: string, timeoutMs: number) {
    this.secrets = secretsInConnectionString(connectionString);
    this.timeoutMs = timeoutMs;
    fs.writeFileSync(workerFile, WORKER_SOURCE);
    const readyShared = new SharedArrayBuffer(4);
    const ready = new Int32Array(readyShared);
    // Turbopack treats `new Worker(dynamicPath)` as a module graph edge and fails the build.
    this.worker = startWorker(workerFile, { packageJson, connectionString, readyShared });
    this.worker.on("error", (error) => {
      this.workerError = scrubDatabaseError(error, this.secrets);
    });
    this.worker.on("exit", (code) => {
      if (!this.closed && code !== 0 && !this.workerError) {
        this.workerError = new Error(`Postgres worker exited (${code})`);
      }
    });
    const started = Atomics.wait(ready, 0, 0, 10_000);
    if (this.workerError) {
      this.close();
      throw this.workerError;
    }
    if (started === "timed-out" || ready[0] !== 1) {
      this.close();
      throw new Error("Postgres worker did not start");
    }
  }

  prepare(sql: string): Statement {
    const text = toPostgresPlaceholders(sql);
    return {
      run: (...params: unknown[]) => {
        const result = this.command({ kind: "query", text, params, timeoutMs: this.timeoutMs });
        return { changes: result.rowCount };
      },
      get: (...params: unknown[]) => {
        return this.command({ kind: "query", text, params, timeoutMs: this.timeoutMs }).rows[0];
      },
      all: (...params: unknown[]) => {
        return this.command({ kind: "query", text, params, timeoutMs: this.timeoutMs }).rows;
      },
    };
  }

  query(sql: string, params: readonly unknown[] = []) {
    return this.command({
      kind: "query",
      text: toPostgresPlaceholders(sql),
      params: [...params],
      timeoutMs: this.timeoutMs,
    }).rows;
  }

  exec(sql: string) {
    const statements = splitSql(sql);
    if (statements.length === 0) return;
    if (statements.length === 1) {
      this.query(statements[0] ?? "");
      return;
    }
    this.transaction(statements.map((statement) => ({ sql: statement })));
  }

  transaction(statements: readonly SqlStatement[]) {
    if (statements.length === 0) return;
    this.command({
      kind: "transaction",
      timeoutMs: this.timeoutMs,
      statements: statements.map((statement) => ({
        text: toPostgresPlaceholders(statement.sql),
        params: [...(statement.params ?? [])],
      })),
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    void this.worker.terminate();
  }

  private command(body: WorkerBody): QueryResult {
    if (this.closed) throw new Error("Postgres connection is closed");
    if (this.workerError) throw this.workerError;
    const shared = new SharedArrayBuffer(4);
    const signal = new Int32Array(shared);
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ port: port2, body, shared }, [port2]);
    const status = Atomics.wait(signal, 0, 0, this.timeoutMs + 1_000);
    const received = receiveMessageOnPort(port1);
    port1.close();
    if (!received) {
      throw scrubDatabaseError(
        new Error(status === "timed-out" ? "Postgres query timed out" : "Postgres worker returned no result"),
        this.secrets,
      );
    }
    const message = received.message as { ok?: boolean; rows?: unknown[]; rowCount?: number; error?: string };
    if (!message.ok) {
      throw scrubDatabaseError(new Error(message.error || "Postgres query failed"), this.secrets);
    }
    return { rows: message.rows ?? [], rowCount: message.rowCount ?? 0 };
  }
}

const WORKER_SOURCE = `
import { createRequire } from "node:module";
import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";

const ready = new Int32Array(workerData.readyShared);
let sql = null;
let initError = "";
try {
  const require = createRequire(workerData.packageJson);
  const neonEntry = require.resolve("@neondatabase/serverless");
  const imported = await import(pathToFileURL(neonEntry).href);
  const neonFn = typeof imported.neon === "function" ? imported.neon : imported.default && imported.default.neon;
  if (typeof neonFn !== "function") throw new Error("Neon driver export is missing");
  sql = neonFn(workerData.connectionString);
} catch (error) {
  initError = error instanceof Error ? error.message : String(error);
}

if (!parentPort) throw new Error("Postgres worker has no parent port");

parentPort.on("message", async (message) => {
  const signal = new Int32Array(message.shared);
  try {
    if (initError) throw new Error(initError);
    if (message.body.kind === "query") {
      const result = await sql.query(message.body.text, message.body.params, {
        fullResults: true,
        fetchOptions: { signal: AbortSignal.timeout(message.body.timeoutMs) },
      });
      const rows = Array.isArray(result) ? result : result.rows || [];
      const rowCount = !Array.isArray(result) && typeof result.rowCount === "number" ? result.rowCount : rows.length;
      message.port.postMessage({ ok: true, rows, rowCount });
    } else if (message.body.kind === "transaction") {
      await sql.transaction(
        (txn) => message.body.statements.map((statement) => txn.query(statement.text, statement.params || [])),
        { fullResults: true, fetchOptions: { signal: AbortSignal.timeout(message.body.timeoutMs) } },
      );
      message.port.postMessage({ ok: true, rows: [], rowCount: 0 });
    } else {
      throw new Error("Unknown postgres operation");
    }
  } catch (error) {
    message.port.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  } finally {
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0);
  }
});

Atomics.store(ready, 0, 1);
Atomics.notify(ready, 0);
`;
