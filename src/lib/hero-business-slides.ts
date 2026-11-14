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
    alt: "Plumber repairing pipes under a kitchen sink",
  },
  {
    id: "mobile-detailing",
    label: "Mobile detailing booking",
    src: "/hero/mobile-detailing.webp",
    alt: "Mobile detailers polishing a car in a driveway",
  },
  {
    id: "estate-clearance",
    label: "Estate clearance resale",
    src: "/hero/estate-clearance.webp",
    alt: "Furniture and boxes staged for an estate clearance sale",
  },
  {
    id: "tutoring-match",
    label: "After-school tutoring match",
    src: "/hero/tutoring-match.webp",
    alt: "Tutor helping a student with homework at a kitchen table",
  },
  {
    id: "local-cleaning",
    label: "Local cleaning service",
    src: "/hero/local-cleaning.webp",
    alt: "Cleaner wiping a kitchen counter during a home cleaning visit",
  },
  {
    id: "fitness-coaching",
    label: "Fitness coaching",
    src: "/hero/fitness-coaching.webp",
    alt: "Fitness coach guiding a client through a dumbbell exercise",
  },
  {
    id: "micro-retail",
    label: "Micro-retail pop-up",
    src: "/hero/micro-retail.webp",
    alt: "Curated products on a small outdoor pop-up retail table",
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