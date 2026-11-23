import { NextResponse } from "next/server";
import { parseProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { getProfile, saveProfile } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const profile = await getProfile(user.id);
  return NextResponse.json({ profile: profile ?? null });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = parseProfile(user.id, await request.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await saveProfile(parsed);
  return NextResponse.json({ ok: true });
}