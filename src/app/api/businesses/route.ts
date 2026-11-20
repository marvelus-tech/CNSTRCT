import { NextResponse } from "next/server";

import { computerState, composioConfigured, connectionState, orgoConfigured } from "@/lib/agent/adapters";
import { ensureTeamShape } from "@/lib/agent/provision";
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

  const businesses = listBusinessesForUser(user.id).map((business) => {
    const team = ensureTeamShape(business.id);
    const gmail = listConnections(business.id).find((item) => item.toolkit === "gmail");
    const gmailState = connectionState({
      keySet: composioConfigured(),
      connectedAccountId: gmail?.connectedAccountId ?? null,
      storedStatus: gmail?.status,
    });
    const orgoState = team.some((agent) => agent.orgoComputerId)
      ? "connected"
      : computerState(null, orgoConfigured());
    return {
      id: business.id,
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
      computerLabel: `Orgo ${orgoState.replaceAll("_", " ")}`,
    };
  });

  return NextResponse.json({ businesses });
}