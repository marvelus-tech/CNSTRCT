import { NextResponse } from "next/server";

import { authMode } from "@/lib/auth-mode";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({
    authMode: authMode(),
    signedIn: Boolean(user),
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
  });
}