/**
 * Orgo desk theme/template apply (P16).
 * Strategy and template refs: docs/orgo-themes.md (P14 spike).
 */
import { markOrgoThemeApplied } from "../store";
import type { Business } from "../types";
import { orgo, OrgoError } from "./orgo";
import { orgoTemplateRefForBusiness, orgoThemeForTemplate } from "./orgo-themes";
import { redactProvisioningError } from "./redact";

export type ThemeApplyOutcome = { ok: true } | { ok: false; retry?: boolean; reason: string };

/** Idempotent: records theme metadata when desk exists; passes Orgo template on create when ref is set. */
export async function applyOrgoThemeForBusiness(business: Business, computerId: string): Promise<ThemeApplyOutcome> {
  if (business.orgoThemeAppliedAt) return { ok: true };
  const theme = orgoThemeForTemplate(business.templateId);
  try {
    const info = await orgo.getComputer(computerId);
    const status = (info.status ?? "").toLowerCase();
    if (status && status !== "running" && status !== "stopped" && status !== "paused") {
      return { ok: false, retry: true, reason: `Desk status is ${status}; waiting to apply theme.` };
    }
    await markOrgoThemeApplied(business.id, theme.themeKey);
    return { ok: true };
  } catch (error) {
    if (error instanceof OrgoError && (error.status === 429 || error.status >= 500)) {
      return { ok: false, retry: true, reason: redactProvisioningError(error.message) };
    }
    if (error instanceof OrgoError) {
      return { ok: false, reason: redactProvisioningError(error.message) };
    }
    return { ok: false, reason: "Theme apply failed." };
  }
}

export function orgoTemplateForCreate(templateId: string): string | undefined {
  return orgoTemplateRefForBusiness(templateId);
}