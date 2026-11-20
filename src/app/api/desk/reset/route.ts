import { NextResponse } from "next/server";
import { resetBusiness } from "@/lib/agent/reset";
import { removeWorkspace } from "@/lib/agent/sandbox";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.id === "user_sample") return NextResponse.json({ error: "The sample business stays." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { businessId?: string } | null;
  if (!body?.businessId) return NextResponse.json({ error: "Missing business." }, { status: 400 });
  const result = await resetBusiness(user.id, body.businessId);
  if (!result.ok) {
    const status = result.error === "Business not found." ? 404 : 409;
    return NextResponse.json({ error: result.error, computerIds: result.computerIds }, { status });
  }
  for (const id of result.agentIds) removeWorkspace(id);
  return NextResponse.json({ ok: true });
}
