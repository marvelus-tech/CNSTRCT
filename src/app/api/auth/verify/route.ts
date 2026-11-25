import { NextResponse } from "next/server";

import { completeMagicLinkAuth } from "@/lib/auth-verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { tokenHash?: string; type?: string };
  if (!body.tokenHash) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  const done = await completeMagicLinkAuth(body.tokenHash, body.type || "magiclink");
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  return done.response;
}
