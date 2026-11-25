import { NextResponse } from "next/server";

import { constructionAccess } from "@/lib/billing/access";
import { openDesk } from "@/lib/agent/provision";
import { kickProvisioningAfterBusinessCreate, provisionSummary } from "@/lib/agent/provisioning";
import { currentUser } from "@/lib/session";
import { getBusinessByCreateIdempotencyKey, getProfile, listAgents } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const profile = await getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Answer the triage first." }, { status: 401 });

  const paid = await constructionAccess(user.id);
  if (!paid.ok) {
    return NextResponse.json({ error: paid.error, code: paid.code }, { status: paid.status });
  }

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

  const idempotencyKey =
    request.headers.get("Idempotency-Key")?.trim() ||
    request.headers.get("x-idempotency-key")?.trim() ||
    "";

  if (idempotencyKey) {
    const existing = await getBusinessByCreateIdempotencyKey(user.id, idempotencyKey);
    if (existing) {
      const agents = await listAgents(existing.id);
      const provision = await provisionSummary(existing.id);
      return NextResponse.json({
        businessId: existing.id,
        business: existing,
        agents,
        sitePath: `/b/${existing.slug}`,
        provision,
        idempotent: true,
      });
    }
  }

  const desk = await openDesk(user.id, profile, templateId, idempotencyKey || null);
  kickProvisioningAfterBusinessCreate();
  const provision = await provisionSummary(desk.business.id);
  return NextResponse.json({
    businessId: desk.business.id,
    business: desk.business,
    agents: desk.agents,
    sitePath: `/b/${desk.business.slug}`,
    provision,
  });
}