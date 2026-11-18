import { NextResponse } from "next/server";
import { cityOf, liveCardCopyForTemplate, type TemplateId } from "@/lib/copy";
import { currentUser } from "@/lib/session";
import { getProfile } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Start the triage first." }, { status: 401 });
  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Answer the triage first." }, { status: 401 });
  const city = cityOf(profile.location);
  const cards = TEMPLATES.map((template) => {
    if (template.live) {
      const live = liveCardCopyForTemplate(profile, template.id as TemplateId);
      return { id: template.id, live: true, title: live.title, name: live.name, summary: live.summary, pitch: live.summary };
    }
    return { id: template.id, live: false, title: template.title, pitch: `${template.pitch} Coming soon in ${city}.` };
  });
  return NextResponse.json({ cards });
}
