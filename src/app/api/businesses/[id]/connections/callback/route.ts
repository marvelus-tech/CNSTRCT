import "server-only";

import { NextResponse } from "next/server";

import { finishBusinessConnectionCallback } from "@/lib/agent/connections";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const url = new URL(request.url);
  const sessionUri = url.searchParams.get("session_uri");
  const nonce = url.searchParams.get("nonce");
  const result = await finishBusinessConnectionCallback({
    businessId: id,
    ownerUserId: user.id,
    nonce,
    sessionUri,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const redirect = new URL(`/workspace/${encodeURIComponent(id)}`, url.origin);
  redirect.searchParams.set("connected", result.toolkit);
  return NextResponse.redirect(redirect);
}