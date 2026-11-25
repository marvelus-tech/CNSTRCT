import { NextResponse } from "next/server";

import { demoAuthAllowed } from "@/lib/auth-mode";
import { AUTH_FLAG_COOKIE } from "@/lib/auth-constants";
import { ensureDemoSession, writeSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  if (!demoAuthAllowed()) {
    return NextResponse.json({ error: "Demo sign-in is disabled when Supabase auth is configured." }, { status: 403 });
  }
  const { user, sessionId } = await ensureDemoSession();
  const response = NextResponse.json({ user, ok: true });
  writeSessionCookie(response, sessionId);
  response.cookies.set(AUTH_FLAG_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}