import type { ProvisionStatus, ProvisioningJobStatus, ProvisioningProvider } from "../types";

export function provisionStatusLabel(status: ProvisionStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "failed":
      return "Needs retry";
    case "partial":
      return "Needs retry";
    case "provisioning":
      return "Desk connecting";
    case "pending":
    default:
      return "Desk connecting";
  }
}

export function provisioningJobLabel(provider: ProvisioningProvider, status: ProvisioningJobStatus): string {
  const prefix =
    provider === "orgo" ? "Orgo" : provider === "treg" ? "Treg" : provider === "composio" ? "Composio" : provider;
  if (status === "succeeded" || status === "skipped") return `${prefix} ready`;
  if (status === "failed") return `${prefix} needs retry`;
  if (status === "running") return `${prefix} connecting`;
  return `${prefix} pending`;
}