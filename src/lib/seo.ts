export const SITE_NAME = "BizOS";

export const HOME_TITLE = "BizOS | Your founding team ships on your desk today";

export const HOME_DESCRIPTION =
  "BizOS finds a business that fits you, then starts your founding bots on your desk. Less guesswork, less friction. You approve every draft before it ships.";

export const TRIAGE_TITLE = "BizOS onboarding | Your skills, cash, space, and city";

export const TRIAGE_DESCRIPTION =
  "Answer eight short BizOS questions, one at a time. Share skills, cash, space, and city so the business we suggest matches what you already have right now.";

export const OPPORTUNITIES_TITLE = "BizOS opportunity paths | Two paths are live for you";

export const OPPORTUNITIES_DESCRIPTION =
  "Review three BizOS business paths after triage. Home services and mobile detailing are open today. Estate clearance stays marked coming soon for you now.";

export const DASHBOARD_TITLE = "BizOS workspace | Agent chat, computer, and approvals";

export const DASHBOARD_DESCRIPTION =
  "Run your BizOS business from one screen. Read the agent chat, open the sandbox computer, and approve or reject each drafted note before it is marked sent.";

export const CALLBACK_TITLE = "BizOS sign-in | Finish your email magic link today";

export const CALLBACK_DESCRIPTION =
  "Finish a BizOS email magic link when Supabase keys are set. Without those keys, keep going with the demo session this browser already stored for you here.";

export const NOT_FOUND_TITLE = "BizOS missing page | The page you wanted is not here";

export const NOT_FOUND_DESCRIPTION =
  "That BizOS page is not here. Head home, see the sample Harbor business, or start triage and build a small business from the skills and cash on hand now.";

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