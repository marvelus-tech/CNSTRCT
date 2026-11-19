import { clearTriageDraft, draftToProfileBody, isTriageDraftComplete, loadTriageDraft } from "@/lib/triage-draft";

/** Push localStorage triage draft to the signed-in user's profile, then clear draft on success. */
export async function syncTriageFromClient(): Promise<{ ok: boolean; error?: string }> {
  const draft = loadTriageDraft();
  if (!draft || !isTriageDraftComplete(draft)) return { ok: true };

  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draftToProfileBody(draft)),
  });
  const json = (await response.json()) as { error?: string };
  if (!response.ok) {
    return { ok: false, error: json.error || "Could not save triage answers." };
  }
  clearTriageDraft();
  return { ok: true };
}