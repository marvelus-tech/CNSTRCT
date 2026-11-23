import { defaultBudgetBody, isRetryableTregError, putCustomerBudget, TregError, tregConfigured } from "./treg";
import { redactProvisioningError } from "./redact";
import { getBusiness, setBusinessTregBudgetStatus } from "../store";

export type TregProvisionOutcome =
  | { kind: "succeeded" }
  | { kind: "skipped"; reason: string }
  | { kind: "retry"; reason: string }
  | { kind: "failed"; reason: string };

/** Idempotent Treg customer tag budget for one business. */
export async function provisionTregForBusiness(businessId: string): Promise<TregProvisionOutcome> {
  if (!tregConfigured()) {
    return { kind: "skipped", reason: "TREG_TOKEN or TREG_ORG_ID is not set." };
  }
  const business = await getBusiness(businessId);
  if (!business) return { kind: "failed", reason: "Business row missing." };
  const tag = business.tregCustomerTag;
  if (!tag) return { kind: "failed", reason: "treg_customer_tag missing on business row." };
  if (business.tregBudgetStatus === "set") {
    return { kind: "succeeded" };
  }
  try {
    await putCustomerBudget(tag, defaultBudgetBody(tag));
    await setBusinessTregBudgetStatus(businessId, "set");
    return { kind: "succeeded" };
  } catch (error) {
    if (error instanceof TregError) {
      const message = redactProvisioningError(error.message);
      if (isRetryableTregError(error)) {
        await setBusinessTregBudgetStatus(businessId, "failed");
        return { kind: "retry", reason: message };
      }
      await setBusinessTregBudgetStatus(businessId, "failed");
      return { kind: "failed", reason: message };
    }
    throw error;
  }
}