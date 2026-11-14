import { NextResponse } from "next/server";

import { loadDesk } from "@/lib/desk";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const desk = loadDesk(user.id, businessId);
  if (!desk) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json(desk);
}