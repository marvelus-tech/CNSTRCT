import { NextResponse } from "next/server";
import { removeWorkspace } from "@/lib/agent/sandbox";
import { currentUser } from "@/lib/session";
import { deleteDesk } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.id === "user_sample") return NextResponse.json({ error: "The sample business stays." }, { status: 400 });
  const agentIds = deleteDesk(user.id);
  for (const id of agentIds) removeWorkspace(id);
  return NextResponse.json({ ok: true });
}
