import { NextResponse } from "next/server";
import { removeWorkspace } from "@/lib/agent/sandbox";
import { currentUser } from "@/lib/session";
import { deleteBusinessForUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.id === "user_sample") return NextResponse.json({ error: "The sample business stays." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { businessId?: string } | null;
  if (!body?.businessId) return NextResponse.json({ error: "Missing business." }, { status: 400 });
  const agentIds = deleteBusinessForUser(user.id, body.businessId);
  if (!agentIds) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  for (const id of agentIds) removeWorkspace(id);
  return NextResponse.json({ ok: true });
}
