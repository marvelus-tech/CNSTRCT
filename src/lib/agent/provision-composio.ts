import { composioUserId } from "./adapters";
import { getBusiness, setBusinessComposioUserId } from "../store";

export type ComposioProvisionOutcome =
  | { kind: "succeeded" }
  | { kind: "retry"; reason: string }
  | { kind: "failed"; reason: string };

/**
 * Composio has no remote "create user" API. This job only ensures the business
 * row stores the stable integration user id before any connect or session call.
 */
export async function provisionComposioForBusiness(businessId: string): Promise<ComposioProvisionOutcome> {
  const business = await getBusiness(businessId);
  if (!business) return { kind: "failed", reason: "Business row missing." };
  const expected = composioUserId(businessId);
  if (!business.composioUserId) {
    await setBusinessComposioUserId(businessId, expected);
    return { kind: "succeeded" };
  }
  if (business.composioUserId !== expected) {
    return { kind: "failed", reason: "composio_user_id on the business row does not match the derived id." };
  }
  return { kind: "succeeded" };
}