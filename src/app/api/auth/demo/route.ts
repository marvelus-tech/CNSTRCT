import { NextResponse } from "next/server";

import { AUTH_FLAG_COOKIE } from "@/lib/auth-constants";
import { ensureDemoUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const user = await ensureDemoUser();
  const response = NextResponse.json({ user, ok: true });
  response.cookies.set(AUTH_FLAG_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}