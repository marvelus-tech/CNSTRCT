import { NextResponse } from "next/server";

import { openDesk } from "@/lib/agent/provision";
import { currentUser } from "@/lib/session";
import { getProfile } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Answer the triage first." }, { status: 401 });

  let templateId = "home-services";
  try {
    const body = (await request.json()) as { templateId?: string };
    if (body.templateId) templateId = body.templateId;
  } catch {
    // empty body ok
  }

  const template = TEMPLATES.find((item) => item.id === templateId);
  if (!template?.live) {
    return NextResponse.json({ error: "That template is not live yet." }, { status: 400 });
  }

  const desk = await openDesk(user.id, profile, templateId);
  return NextResponse.json({
    businessId: desk.business.id,
    business: desk.business,
    agents: desk.agents,
    sitePath: `/b/${desk.business.slug}`,
  });
}