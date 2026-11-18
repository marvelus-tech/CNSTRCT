export interface Tradie {
  name: string;
  trade: string;
  contact: string;
}

export const TRADIES: Tradie[] = [
  { name: "North Loop Plumbing", trade: "plumber", contact: "sam@northloop.example" },
  { name: "Ridge Electric", trade: "electrician", contact: "casey@ridge.example" },
  { name: "Sunday Paint Co", trade: "painter", contact: "june@sundaypaint.example" },
];

export const DETAILERS: Tradie[] = [
  { name: "Shine Lane Mobile", trade: "exterior detail", contact: "morgan@shinelane.example" },
  { name: "Curbside Gloss", trade: "interior detail", contact: "taylor@curbside.example" },
  { name: "Driveway Pro Wash", trade: "full detail", contact: "jamie@drivewaypro.example" },
];

export function searchTradies(city: string) {
  const header = `Local tradies near ${city}. Contacts are example addresses only.`;
  const lines = TRADIES.map((tradie) => `${tradie.name} | ${tradie.trade} | ${tradie.contact} | serves ${city}`);
  return [header, ...lines].join("\n");
}

export function searchDetailers(city: string) {
  const header = `Mobile detailers near ${city}. Contacts are example addresses only.`;
  const lines = DETAILERS.map((detailer) => `${detailer.name} | ${detailer.trade} | ${detailer.contact} | serves ${city}`);
  return [header, ...lines].join("\n");
}

export function partnersForTemplate(templateId: string) {
  return templateId === "mobile-detailing" ? DETAILERS : TRADIES;
}
