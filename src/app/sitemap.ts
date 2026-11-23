import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { listBusinessSlugs } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...(await listBusinessSlugs()).map((slug) => ({
      url: `${base}/b/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
