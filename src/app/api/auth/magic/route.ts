import { NextResponse } from "next/server";

import { issueMagicLink } from "@/lib/auth-magic";

export const runtime = "nodejs";

/** @deprecated Prefer POST /api/auth/magic-link */
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email ?? "";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const rateKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const result = await issueMagicLink(email, origin, rateKey);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
