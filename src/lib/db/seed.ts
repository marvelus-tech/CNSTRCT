import type { AppDatabase } from "./types";

const SEEDED_SLUG = "harbor-tradie-desk";

/** Same sample desk the old sqlite bootstrap inserted on an empty file. */
export async function seedSample(db: AppDatabase) {
  const existing = await db.prepare("SELECT id FROM businesses WHERE slug = ?").get(SEEDED_SLUG);
  if (existing) return;
  const now = Date.now();
  await db.prepare("INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)").run(
    "user_sample",
    "sample@cnstrct.local",
    "Sample owner",
    now,
  );
  await db
    .prepare(
      `INSERT INTO profiles (user_id, interests, skills, has_idea, idea_text, space, capital, trades, location, constraints, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "user_sample",
      "neighborhood hardware and weekend repairs",
      "explaining a job in plain language",
      0,
      "",
      "garage",
      "under-100",
      "yes",
      "Harbor, WA",
      "Evenings only",
      now,
    );
  await db
    .prepare("INSERT INTO businesses (id, user_id, template_id, name, slug, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("biz_sample", "user_sample", "home-services", "Harbor Home Match", "harbor-tradie-desk", "Harbor", now);
}
