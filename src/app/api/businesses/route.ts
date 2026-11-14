import { NextResponse } from "next/server";

import { currentUser } from "@/lib/session";
import { listBusinessesForUser } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const templateTitle = Object.fromEntries(TEMPLATES.map((template) => [template.id, template.title]));

  const businesses = listBusinessesForUser(user.id).map((business) => ({
    id: business.id,
    name: business.name,
    city: business.city,
    templateId: business.templateId,
    templateTitle: templateTitle[business.templateId] ?? business.templateId,
    slug: business.slug,
    sitePath: `/b/${business.slug}`,
    createdAt: business.createdAt,
  }));

  return NextResponse.json({ businesses });
}