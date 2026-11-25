import { NextResponse } from "next/server";
import { mapSeq } from "@/lib/seq";

import { composioConfigured, connectionState, orgoConfigured, orgoDeskLabel } from "@/lib/agent/adapters";
import { provisionStatusLabel, provisioningJobLabel } from "@/lib/agent/provision-labels";
import { ensureTeamShape } from "@/lib/agent/provision";
import { getProvisioningJobsForBusiness } from "@/lib/store";
import { currentUser } from "@/lib/session";
import { listBusinessesForUser, listConnections } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

function ventureSummary(profileJson: string | null | undefined): { city: string; interestsSnippet: string } | null {
  if (!profileJson) return null;
  try {
    const profile = JSON.parse(profileJson) as Profile;
    const interests = String(profile.interests ?? "").trim();
    const snippet = interests.length > 72 ? `${interests.slice(0, 72)}…` : interests;
    return { city: String(profile.location ?? ""), interestsSnippet: snippet };
  } catch {
    return null;
  }
}

function profileSnapshot(profileJson: string | null | undefined): Profile | null {
  if (!profileJson) return null;
  try {
    return JSON.parse(profileJson) as Profile;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const templateTitle = Object.fromEntries(TEMPLATES.map((template) => [template.id, template.title]));

  const businesses = await mapSeq((await listBusinessesForUser(user.id)), async (business) => {
    const team = await ensureTeamShape(business.id);
    const gmail = (await listConnections(business.id)).find((item) => item.toolkit === "gmail");
    const gmailState = connectionState({
      keySet: composioConfigured(),
      connectedAccountId: gmail?.connectedAccountId ?? null,
      storedStatus: gmail?.status,
    });
    const orgoLabel = orgoDeskLabel(business.orgoComputerId, orgoConfigured());
    const jobs = await getProvisioningJobsForBusiness(business.id);
    const jobChips = jobs.map((job) => ({
      provider: job.provider,
      status: job.status,
      label: provisioningJobLabel(job.provider, job.status),
    }));
    return {
      id: business.id,
      provisionStatus: business.provisionStatus,
      provisionLabel: provisionStatusLabel(business.provisionStatus),
      provisionJobs: jobChips,
      name: business.name,
      city: business.city,
      templateId: business.templateId,
      templateTitle: templateTitle[business.templateId] ?? business.templateId,
      slug: business.slug,
      sitePath: `/b/${business.slug}`,
      createdAt: business.createdAt,
      ventureSummary: ventureSummary(business.profileJson),
      ventureProfile: profileSnapshot(business.profileJson),
      teamLabel: team.map((agent) => agent.name).join(", "),
      connectionLabel: `Gmail ${gmailState.replaceAll("_", " ")}`,
      computerLabel: orgoLabel,
      orgoThemeKey: business.orgoThemeKey ?? null,
      orgoThemeApplied: Boolean(business.orgoThemeAppliedAt),
    };
  });

  return NextResponse.json({ businesses });
}