import { NextResponse } from "next/server";
import { opportunityCardsForProfile } from "@/lib/opportunity-cards";
import { parseProfile } from "@/lib/profile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = parseProfile("preview", await request.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const cards = opportunityCardsForProfile(parsed);
  return NextResponse.json({ cards });
}