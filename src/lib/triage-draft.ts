export const TRIAGE_DRAFT_KEY = "cnstrct.triage.v1";

export type TriageDraft = Record<string, string>;

export function loadTriageDraft(): TriageDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRIAGE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as TriageDraft;
  } catch {
    return null;
  }
}

export function saveTriageDraft(draft: TriageDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIAGE_DRAFT_KEY, JSON.stringify(draft));
}

export function clearTriageDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TRIAGE_DRAFT_KEY);
}

export function draftToProfileBody(draft: TriageDraft) {
  return {
    interests: draft.interests,
    skills: draft.skills,
    hasIdea: draft.hasIdea === "yes",
    ideaText: draft.ideaText ?? "",
    space: draft.space,
    capital: draft.capital,
    trades: draft.trades,
    location: draft.location,
    constraints: draft.constraints ?? "",
  };
}

export function isTriageDraftComplete(draft: TriageDraft): boolean {
  return (
    (draft.interests ?? "").trim().length > 1 &&
    (draft.skills ?? "").trim().length > 1 &&
    (draft.hasIdea === "yes" || draft.hasIdea === "no") &&
    Boolean(draft.space) &&
    Boolean(draft.capital) &&
    Boolean(draft.trades) &&
    (draft.location ?? "").trim().length > 1
  );
}