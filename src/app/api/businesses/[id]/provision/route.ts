import { NextResponse } from "next/server";

import { provisionSummary, retryProvisioning } from "@/lib/agent/provisioning";
import { currentUser } from "@/lib/session";
import { getBusiness } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const business = await getBusiness(id);
  if (!business || business.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const summary = await provisionSummary(id);
  return NextResponse.json(summary);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const business = await getBusiness(id);
  if (!business || business.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const retried = await retryProvisioning(id);
  const summary = await provisionSummary(id);
  return NextResponse.json({ ...summary, retriedJobs: retried });
}