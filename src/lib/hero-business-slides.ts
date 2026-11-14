export interface HeroBusinessSlide {
  id: string;
  label: string;
  src: string;
  alt: string;
}

export const HERO_BUSINESS_SLIDES: HeroBusinessSlide[] = [
  {
    id: "home-services",
    label: "Home services leads",
    src: "/hero/home-services.webp",
    alt: "Tradesperson working on a home repair job",
  },
  {
    id: "mobile-detailing",
    label: "Mobile detailing booking",
    src: "/hero/mobile-detailing.jpg",
    alt: "Car being detailed in a driveway",
  },
  {
    id: "estate-clearance",
    label: "Estate clearance resale",
    src: "/hero/estate-clearance.webp",
    alt: "Household items staged for resale after a clearance",
  },
  {
    id: "tutoring-match",
    label: "After-school tutoring match",
    src: "/hero/tutoring-match.webp",
    alt: "Student and tutor at a desk",
  },
  {
    id: "local-cleaning",
    label: "Local cleaning service",
    src: "/hero/local-cleaning.webp",
    alt: "Professional cleaning supplies ready for a job",
  },
  {
    id: "fitness-coaching",
    label: "Fitness coaching",
    src: "/hero/fitness-coaching.webp",
    alt: "Trainer coaching a client in a gym",
  },
  {
    id: "micro-retail",
    label: "Micro-retail pop-up",
    src: "/hero/micro-retail.webp",
    alt: "Small retail display with curated products",
  },
];

/** Percent positions for crosshair anchor — stays inset from panel edges. */
export const HERO_CROSSHAIR_COORDS = [
  { x: 50, y: 50 },
  { x: 28, y: 32 },
  { x: 72, y: 38 },
  { x: 35, y: 68 },
  { x: 68, y: 62 },
  { x: 22, y: 52 },
  { x: 78, y: 55 },
] as const;