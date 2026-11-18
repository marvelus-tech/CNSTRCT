import path from "node:path";

/** True on Vercel-style deploys: non-local site URL and sqlite under /tmp. */
export function isEphemeralHostedDemo() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(site);
  const dir = process.env.CNSTRCT_DATA_DIR || path.join(process.cwd(), "data");
  const tmpData = dir === "/tmp" || dir.startsWith("/tmp/");
  return !local && tmpData;
}

export const SEEDED_DEMO_DESK_SLUG = "harbor-tradie-desk";