import { NextResponse } from "next/server";

import { AUTH_FLAG_COOKIE, SESSION_COOKIE } from "@/lib/auth-constants";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(AUTH_FLAG_COOKIE, "", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}