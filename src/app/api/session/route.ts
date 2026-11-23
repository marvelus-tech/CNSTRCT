import { NextResponse } from "next/server";

import { loadDesk } from "@/lib/desk";
import { currentUser } from "@/lib/session";
import { getBusinessForUser } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  return NextResponse.json({
    user,
    desk: business ? await loadDesk(user.id, business.id) : await loadDesk(user.id),
  });
}