import { cityOf, liveCardCopyForTemplate, type TemplateId } from "@/lib/copy";
import type { Profile } from "@/lib/types";
import { TEMPLATES } from "@/lib/templates";

export function opportunityCardsForProfile(profile: Profile) {
  const city = cityOf(profile.location);
  return TEMPLATES.map((template) => {
    if (template.live) {
      const live = liveCardCopyForTemplate(profile, template.id as TemplateId);
      return { id: template.id, live: true, title: live.title, name: live.name, summary: live.summary, pitch: live.summary };
    }
    return { id: template.id, live: false, title: template.title, pitch: `${template.pitch} Coming soon in ${city}.` };
  });
}