import { NextResponse } from "next/server";

import { wakeBusinessDesk } from "@/lib/agent/desk-wake";
import { currentUser } from "@/lib/session";
import { getBusiness } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const business = await getBusiness(id);
  if (!business || business.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const result = await wakeBusinessDesk(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status: result.status, action: result.action });
}