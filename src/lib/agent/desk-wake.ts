import { orgoConfigured } from "./adapters";
import { orgo } from "./orgo";
import { redactProvisioningError } from "./redact";
import { getBusiness } from "../store";

const lastWakeMs = new Map<string, number>();
const WAKE_COOLDOWN_MS = 60_000;

export type DeskWakeResult =
  | { ok: true; status: string; action: "wake" | "skipped" }
  | { ok: false; error: string };

export async function wakeBusinessDesk(businessId: string): Promise<DeskWakeResult> {
  const business = await getBusiness(businessId);
  if (!business) {
    return { ok: false, error: "Business not found." };
  }
  if (!business.orgoComputerId) {
    return { ok: true, status: "no_computer", action: "skipped" };
  }
  if (!orgoConfigured()) {
    return { ok: true, status: "orgo_not_configured", action: "skipped" };
  }

  const now = Date.now();
  const last = lastWakeMs.get(businessId) ?? 0;
  if (now - last < WAKE_COOLDOWN_MS) {
    return { ok: true, status: "rate_limited", action: "skipped" };
  }
  lastWakeMs.set(businessId, now);

  try {
    const computerId = business.orgoComputerId;
    const current = await orgo.getComputer(computerId);
    const status = (current.status ?? "").toLowerCase();
    if (status === "running") {
      return { ok: true, status: "running", action: "skipped" };
    }

    try {
      const resumed = await orgo.resume(computerId);
      return { ok: true, status: resumed.status ?? "resumed", action: "wake" };
    } catch (resumeError) {
      const started = await orgo.start(computerId);
      return { ok: true, status: started.status ?? "starting", action: "wake" };
    }
  } catch (error) {
    const message = redactProvisioningError(error instanceof Error ? error.message : "Desk wake failed.");
    return { ok: false, error: message };
  }
}