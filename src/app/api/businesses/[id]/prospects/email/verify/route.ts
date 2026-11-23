import { NextResponse } from "next/server";

import { requireBusinessOwner } from "@/lib/agent/treg-prospect-auth";
import { prospectConfigured, runProspectCall } from "@/lib/agent/treg-prospect";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gate = await requireBusinessOwner(id);
  if ("error" in gate) return gate.error;
  if (!prospectConfigured()) {
    return NextResponse.json({ error: "Treg is not configured on this deployment." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  const result = await runProspectCall({
    businessId: id,
    userId: gate.user.id,
    feature: "email-verify",
    body: { email: body.email.trim() },
    idempotencyKey,
  });
  const status = result.ok ? 200 : result.status >= 400 && result.status < 600 ? result.status : 502;
  return NextResponse.json(
    {
      endpointId: result.endpointId,
      callId: result.callId,
      costMicro: result.costMicro,
      servedBy: result.servedBy,
      output: result.output,
      error: result.error,
    },
    { status },
  );
}