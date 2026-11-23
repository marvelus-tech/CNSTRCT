import path from "node:path";

/** Local sqlite file and, outside Vercel, the sandbox parent. Not used for production state. */
export function dataDir() {
  return process.env.CNSTRCT_DATA_DIR || path.join(process.cwd(), "data");
}

export function sqliteFile(dir = dataDir()) {
  return path.join(dir, "cnstrct.db");
}

/**
 * Computer scratch files. On Vercel this is `/tmp` and is not the database.
 * Tests and local dev stay under `CNSTRCT_DATA_DIR/sandboxes`.
 */
export function sandboxBaseDir() {
  if (process.env.CNSTRCT_SANDBOX_DIR) return process.env.CNSTRCT_SANDBOX_DIR;
  if (process.env.VERCEL === "1" && process.env.NODE_ENV !== "test") return "/tmp/cnstrct-sandboxes";
  return path.join(dataDir(), "sandboxes");
}
