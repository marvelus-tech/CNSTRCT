import { NextResponse } from "next/server";

import { AUTH_FLAG_COOKIE, SESSION_COOKIE } from "@/lib/auth-constants";
import { completeMagicLinkAuth } from "@/lib/auth-verify";

export const runtime = "nodejs";

function safeNext(raw: string | null, origin: string) {
  const fallback = "/command-center";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "magiclink";
  const next = safeNext(url.searchParams.get("next"), url.origin);
  if (!tokenHash) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
  }
  const done = await completeMagicLinkAuth(tokenHash, type);
  if (!done.ok) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(done.error)}&next=${encodeURIComponent(next)}`, url.origin),
    );
  }
  const redirect = NextResponse.redirect(new URL(next, url.origin));
  const sid = done.response.cookies.get(SESSION_COOKIE);
  if (sid) redirect.cookies.set(sid);
  const flag = done.response.cookies.get(AUTH_FLAG_COOKIE);
  if (flag) redirect.cookies.set(flag);
  return redirect;
}