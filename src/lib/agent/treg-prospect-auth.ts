import { NextResponse } from "next/server";

import { currentUser } from "@/lib/session";
import { getBusiness } from "@/lib/store";

export async function requireBusinessOwner(businessId: string) {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const business = await getBusiness(businessId);
  if (!business || business.userId !== user.id) {
    return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return { user, business };
}