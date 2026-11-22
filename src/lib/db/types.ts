export type SqlStatement = {
  sql: string;
  params?: readonly unknown[];
};

/** Shared by the migration runner. Both adapters speak this. */
export type Queryable = {
  query(sql: string, params?: readonly unknown[]): unknown[];
  exec(sql: string): void;
  transaction(statements: readonly SqlStatement[]): void;
};

export type Statement = {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

/** Same shape store.ts already uses: prepare().get/all/run. */
export type AppDatabase = Queryable & {
  prepare(sql: string): Statement;
  close(): void;
};
