import { NextResponse } from "next/server";
import { opportunityCardsForProfile } from "@/lib/opportunity-cards";
import { currentUser } from "@/lib/session";
import { getProfile } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Start the triage first." }, { status: 401 });
  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Answer the triage first." }, { status: 401 });
  return NextResponse.json({ cards: opportunityCardsForProfile(profile) });
}
