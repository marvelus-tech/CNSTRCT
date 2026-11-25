import { NextResponse } from "next/server";

import { tregConfigured } from "@/lib/agent/adapters";
import { currentUser } from "@/lib/session";
import { getBusiness, getProvisioningJobsForBusiness } from "@/lib/store";

export async function requireBusinessOwner(businessId: string) {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const business = await getBusiness(businessId);
  if (!business || business.userId !== user.id) {
    return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return { user, business };
}

export async function requireTregProspect(businessId: string) {
  const gate = await requireBusinessOwner(businessId);
  if ("error" in gate) return gate;
  if (!tregConfigured()) {
    return {
      error: NextResponse.json({ error: "Treg is not configured on this deployment.", code: "treg_not_configured" }, { status: 503 }),
    };
  }
  if (gate.business.tregBudgetStatus !== "set") {
    const jobs = await getProvisioningJobsForBusiness(businessId);
    const tregJob = jobs.find((job) => job.provider === "treg");
    const skipped = tregJob?.status === "skipped";
    return {
      error: NextResponse.json(
        {
          error: skipped
            ? "Treg was skipped for this business. Prospect tools stay off."
            : "Prospecting unlocks after the Treg budget job succeeds.",
          code: skipped ? "treg_skipped" : "treg_not_ready",
        },
        { status: 503 },
      ),
    };
  }
  return gate;
}