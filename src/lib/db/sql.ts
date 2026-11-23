/** Turn sqlite `?` placeholders into postgres `$1` placeholders. Quoted text is left alone. */
export function toPostgresPlaceholders(sql: string): string {
  let out = "";
  let index = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      if (inString && sql[i + 1] === "'") {
        out += "'";
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (!inString && ch === "?") {
      index += 1;
      out += `$${index}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Postgres `BIGINT` is int8. SQLite stores the same values in its 64-bit INTEGER.
 * The migration text has no quoted BIGINT, so a word replace is enough.
 */
export function sqlForDialect(sql: string, dialect: "postgres" | "sqlite"): string {
  if (dialect === "postgres") return sql;
  return sql.replace(/\bBIGINT\b/g, "INTEGER");
}

export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      current += ch;
      if (inString && sql[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (!inString && ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      continue;
    }
    if (!inString && ch === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function partitionRoleIndex(sql: string): { statements: string[]; roleIndex: string | null } {
  const statements: string[] = [];
  let roleIndex: string | null = null;
  for (const statement of splitSql(sql)) {
    if (statement.includes("agents_business_role")) roleIndex = statement;
    else statements.push(statement);
  }
  return { statements, roleIndex };
}
