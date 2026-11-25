/** Maps BizOS live templates to Orgo template refs (P15). */

export type OrgoThemeEntry = {
  themeKey: string;
  orgoTemplateRef: string | null;
  label: string;
};

const MAP: Record<string, OrgoThemeEntry> = {
  "home-services": {
    themeKey: "home-services",
    orgoTemplateRef: null,
    label: "Home services desk",
  },
  "mobile-detailing": {
    themeKey: "mobile-detailing",
    orgoTemplateRef: null,
    label: "Mobile detailing desk",
  },
  "estate-clearance": {
    themeKey: "estate-clearance",
    orgoTemplateRef: null,
    label: "Estate clearance (placeholder)",
  },
};

export function orgoThemeForTemplate(templateId: string): OrgoThemeEntry {
  return (
    MAP[templateId] ?? {
      themeKey: templateId,
      orgoTemplateRef: null,
      label: templateId.replaceAll("-", " "),
    }
  );
}

export function orgoTemplateRefForBusiness(templateId: string): string | undefined {
  const ref = orgoThemeForTemplate(templateId).orgoTemplateRef;
  return ref ?? undefined;
}