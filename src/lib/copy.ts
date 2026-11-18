import type { Capital, Profile, Space } from "./types";

export function cityOf(location: string) {
  const city = location.split(",")[0]?.trim() ?? "";
  return city || "your area";
}

export type TemplateId = "home-services" | "mobile-detailing" | "estate-clearance";

export function businessName(profile: Profile, templateId: TemplateId = "home-services") {
  const city = cityOf(profile.location);
  if (templateId === "mobile-detailing") return `${city} Driveway Detail`;
  return `${city} Home Match`;
}

export function capitalPhrase(capital: Capital) {
  switch (capital) {
    case "none":
      return "basically no cash";
    case "under-100":
      return "under $100";
    case "100-500":
      return "$100 to $500";
    case "more":
      return "more than $500";
  }
}

export function spacePhrase(space: Space) {
  switch (space) {
    case "none":
      return "no extra room at home";
    case "corner":
      return "a corner at home";
    case "spare-room":
      return "a spare room";
    case "garage":
      return "a garage or shed";
  }
}

function personalizeSuffix(profile: Profile, pitch: string) {
  let summary = pitch;
  if (profile.trades === "no") {
    summary += ` You said trades are not your first choice. This path can sit beside ${profile.interests || "what you already like"}.`;
  } else if (profile.trades === "maybe") {
    summary += ` You were unsure about trades. The day to day is matching and follow-up, which lines up with ${profile.skills || "talking to people"}.`;
  } else {
    summary += ` You are open to local services work. Customers will feel your skill with ${profile.skills || "practical work"}.`;
  }
  if (profile.hasIdea && profile.ideaText.trim()) {
    summary += ` You also mentioned "${profile.ideaText.trim()}". This path does not replace that idea. It is a way to earn while it stays on the shelf.`;
  }
  return summary;
}

export function liveCardCopy(profile: Profile) {
  const city = cityOf(profile.location);
  const name = businessName(profile, "home-services");
  const cash = capitalPhrase(profile.capital);
  const pitch = `${name} connects homeowners in ${city} with local tradies and keeps a margin when a job is booked. You can start with ${cash}. There is no van and no inventory to buy.`;
  return {
    id: "home-services" as const,
    live: true,
    title: "Home services leads",
    name,
    city,
    summary: personalizeSuffix(profile, pitch),
  };
}

export function detailingCardCopy(profile: Profile) {
  const city = cityOf(profile.location);
  const name = businessName(profile, "mobile-detailing");
  const cash = capitalPhrase(profile.capital);
  const pitch = `${name} books driveway details in ${city} and hands the job to mobile detailers who already own the gear. You keep the booking margin and can start with ${cash}. Capital is a hose and a borrowed driveway.`;
  return {
    id: "mobile-detailing" as const,
    live: true,
    title: "Mobile detailing bookings",
    name,
    city,
    summary: personalizeSuffix(profile, pitch),
  };
}

export function liveCardCopyForTemplate(profile: Profile, templateId: TemplateId) {
  if (templateId === "mobile-detailing") return detailingCardCopy(profile);
  return liveCardCopy(profile);
}

export function siteCopy(profile: Profile, businessNameText: string, city: string, templateId: TemplateId = "home-services") {
  const interests = profile.interests.trim() || "local work";
  const skills = profile.skills.trim() || "getting a clear answer out of a messy job";
  const constraint = profile.constraints.trim();
  const about = `${businessNameText} is run by someone into ${interests}, and good at ${skills}. The working setup is ${spacePhrase(profile.space)}.${constraint ? ` Constraint they asked us to respect: ${constraint}.` : ""}`;
  const contact = "Messages stay in the demo workspace. They are not emailed or texted to anyone.";

  if (templateId === "mobile-detailing") {
    return {
      eyebrow: `Mobile detailing in ${city}`,
      hero: `${businessNameText} books driveway washes and interior details in ${city} without you buying a van full of gear.`,
      sub: `The customer picks a time and driveway. A mobile detailer who already owns the equipment gets the job. You keep a small booking margin. Started with ${capitalPhrase(profile.capital)} and ${spacePhrase(profile.space)}.`,
      steps: [
        { title: "Book a driveway slot", body: "Name, phone, address, and the detail you want. The request is saved in your workspace." },
        { title: "Match a detailer", body: "We introduce the booking to a mobile pro who already serves this area." },
        { title: "Keep the margin", body: "You earn when the appointment is booked. You do not buy polish, towels, or a trailer." },
      ],
      about,
      contact,
      leadCta: "Request a detail",
      leadPlaceholder: "Full exterior wash, Saturday morning",
      heroCta: "Book a detail",
    };
  }

  return {
    eyebrow: `Home services in ${city}`,
    hero: `${businessNameText} helps homeowners in ${city} book a plumber, electrician, or painter without the runaround.`,
    sub: `The homeowner describes the job. A local tradie who wants the work gets the introduction. You keep a small margin. Started with ${capitalPhrase(profile.capital)} and ${spacePhrase(profile.space)}.`,
    steps: [
      { title: "Tell us the job", body: "Name, phone, address, and what needs doing. The request is saved in your workspace." },
      { title: "Match a tradie", body: "We introduce the job to a local pro who covers this area." },
      { title: "Keep the margin", body: "You earn when the job is booked. You do not buy parts or own a van." },
    ],
    about,
    contact,
    leadCta: "Request a tradie",
    leadPlaceholder: "Leaking kitchen faucet",
    heroCta: "Describe the job",
  };
}
