export const SITE_NAME = "CNSTRCT";

export const HOME_TITLE = "CNSTRCT | Start a real business with almost nothing";

export const HOME_DESCRIPTION =
  "CNSTRCT helps people with little cash start a real micro-business. Answer a short triage, pick a path that fits you, and approve every message agents draft.";

export const TRIAGE_TITLE = "CNSTRCT onboarding | Skills, cash, space, and city";

export const TRIAGE_DESCRIPTION =
  "Answer eight short CNSTRCT questions, one at a time. Share skills, cash, space, and city so the business we suggest matches what you already have right now.";

export const OPPORTUNITIES_TITLE = "CNSTRCT opportunity paths | One path is live today";

export const OPPORTUNITIES_DESCRIPTION =
  "Review three CNSTRCT business paths after triage. Home services and mobile detailing are open today. Estate clearance stays marked coming soon for you.";

export const DASHBOARD_TITLE = "CNSTRCT dashboard | Agent chat, computer, approvals";

export const DASHBOARD_DESCRIPTION =
  "Run your CNSTRCT business from one screen. Read the agent chat, open the sandbox computer, and approve or reject each drafted note before it is marked sent.";

export const CALLBACK_TITLE = "CNSTRCT sign-in | Finish your email magic link now";

export const CALLBACK_DESCRIPTION =
  "Finish a CNSTRCT email magic link when Supabase keys are set. Without those keys, keep going with the demo session this browser already stored for you.";

export const NOT_FOUND_TITLE = "CNSTRCT missing page | This page was not found here";

export const NOT_FOUND_DESCRIPTION =
  "That CNSTRCT page is not here. Head home, see the sample Harbor business, or start triage and build a small business from the skills and cash on hand now.";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function fitTitle(text: string) {
  let title = text.replace(/\s+/g, " ").trim();
  if (title.length > 60) {
    const cut = title.slice(0, 60);
    const space = cut.lastIndexOf(" ");
    title = (space >= 50 ? cut.slice(0, space) : cut).trim();
  }
  while (title.length < 50) title = `${title} business`;
  return title.length > 60 ? title.slice(0, 60).trim() : title;
}

export function fitDescription(text: string) {
  let description = text.replace(/\s+/g, " ").trim();
  const extra = " Approve the draft before it is marked sent.";
  if (description.length < 150) description = `${description}${extra}`.trim();
  if (description.length > 160) {
    const cut = description.slice(0, 160);
    const space = cut.lastIndexOf(" ");
    description = (space >= 150 ? cut.slice(0, space) : cut).trim();
  }
  while (description.length < 150) description = `${description} Review it.`.trim();
  return description.length > 160 ? description.slice(0, 160).trim() : description;
}

export function businessTitle(name: string, city: string) {
  return fitTitle(`${name} | Local home services in ${city}`);
}

export function businessDescription(name: string, city: string) {
  return fitDescription(
    `${name} matches homeowners in ${city} with local tradies. Request a repair, meet a vetted pro, and the business keeps a small margin on the booked job.`,
  );
}
