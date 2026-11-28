import type { ProvisionStatus } from "../types";
import { getBusiness, getUser, hasAuditKind, recordAudit } from "../store";
import { emailConfigured } from "./config";
import { sendTransactional } from "./send";
import { deskReadyEmailContent } from "./templates";

export const DESK_READY_AUDIT_KIND = "notification.desk_ready";

export function ownerEmailDeliverable(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return false;
  if (trimmed.endsWith("@cnstrct.local")) return false;
  return true;
}

export async function maybeNotifyDeskReady(
  businessId: string,
  input: { previousStatus?: ProvisionStatus; newStatus: ProvisionStatus },
) {
  if (input.newStatus !== "ready" || input.previousStatus === "ready") {
    return { action: "skipped" as const, reason: "no_transition" };
  }
  if (!emailConfigured()) {
    return { action: "skipped" as const, reason: "email_not_configured" };
  }
  if (await hasAuditKind(businessId, DESK_READY_AUDIT_KIND)) {
    return { action: "skipped" as const, reason: "already_sent" };
  }

  const business = await getBusiness(businessId);
  if (!business) {
    return { action: "skipped" as const, reason: "missing_business" };
  }

  const user = await getUser(business.userId);
  if (!user?.email || !ownerEmailDeliverable(user.email)) {
    return { action: "skipped" as const, reason: "no_deliverable_email" };
  }

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const content = deskReadyEmailContent({
    businessName: business.name,
    workspaceUrl: `${siteBase}/workspace/${business.id}`,
    commandCenterUrl: `${siteBase}/command-center`,
  });

  const result = await sendTransactional({
    to: user.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    tags: [
      { name: "template", value: "desk_ready" },
      { name: "business_id", value: business.id },
    ],
  });

  if (!result.ok) {
    return { action: "failed" as const, reason: result.reason };
  }

  await recordAudit({
    businessId: business.id,
    userId: user.id,
    actor: "system",
    kind: DESK_READY_AUDIT_KIND,
    summary: "Workspace ready email sent.",
    refId: "desk-ready-v1",
  });

  return { action: "sent" as const, id: result.id };
}