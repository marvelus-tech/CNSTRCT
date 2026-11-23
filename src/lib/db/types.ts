export type SqlStatement = {
  sql: string;
  params?: readonly unknown[];
};

/**
 * Async on both drivers. Neon HTTP cannot return a row synchronously.
 * The SQLite adapter fulfills the same promises from `node:sqlite`.
 */
export type Queryable = {
  query(sql: string, params?: readonly unknown[]): Promise<unknown[]>;
  exec(sql: string): Promise<void>;
  transaction(statements: readonly SqlStatement[]): Promise<void>;
};

export type Statement = {
  run(...params: unknown[]): Promise<{ changes: number }>;
  get(...params: unknown[]): Promise<unknown>;
  all(...params: unknown[]): Promise<unknown[]>;
};

export type AppDatabase = Queryable & {
  prepare(sql: string): Statement;
  close(): void;
};
