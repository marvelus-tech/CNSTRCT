import { firstUrl, isEphemeralDataDir, type DatabaseEnv } from "./db/driver";
import { dataDir } from "./db/paths";

/**
 * The amber banner is for hosted sqlite under /tmp, or a Vercel process that
 * still has no Neon URL. A configured DATABASE_URL means state is durable.
 * This does not follow the build-phase sqlite override in the driver: the
 * banner is about the configured URL, and `next build` must not bake the
 * wrong banner when the URL is already set.
 */
export function isEphemeralHostedDemo() {
  return ephemeralHostedDemo(process.env, dataDir());
}

export function ephemeralHostedDemo(env: DatabaseEnv & { NEXT_PUBLIC_SITE_URL?: string }, dir: string) {
  const site = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(site);
  if (local) return false;
  if (env.CNSTRCT_DB !== "sqlite" && firstUrl(env.DATABASE_URL, env.POSTGRES_URL)) return false;
  if (env.VERCEL === "1" && env.NEXT_PHASE !== "phase-production-build") return true;
  return isEphemeralDataDir(dir);
}

export const SEEDED_DEMO_DESK_SLUG = "harbor-tradie-desk";
