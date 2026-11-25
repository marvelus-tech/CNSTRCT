import { composioUserId, orgoConfigured, tregCustomerTag } from "./adapters";
import { provisionComposioForBusiness } from "./provision-composio";
import { provisionOrgoForBusiness } from "./provision-orgo";
import { provisionTregForBusiness } from "./provision-treg";
import { maybeNotifyDeskReady } from "../email";
import { redactProvisioningError } from "./redact";
import {
  claimProvisioningJob,
  enqueueProvisioningJobs,
  getBusiness,
  getProvisioningJobsForBusiness,
  listDueProvisioningJobs,
  setBusinessProvisionFields,
  updateProvisioningJobResult,
} from "../store";
import type { Business, ProvisioningJob, ProvisioningProvider } from "../types";

export const PROVISIONING_PROVIDERS: ProvisioningProvider[] = ["orgo", "treg", "composio"];

const LEASE_MS = 120_000;
const RETRY_MS = 60_000;
const MAX_ATTEMPTS = 8;

export function derivedProvisionTags(businessId: string) {
  return {
    composioUserId: composioUserId(businessId),
    tregCustomerTag: tregCustomerTag(businessId),
  };
}

export async function enqueueDefaultProvisioningJobs(businessId: string, now = Date.now()) {
  await enqueueProvisioningJobs(
    businessId,
    PROVISIONING_PROVIDERS.map((provider) => ({
      provider,
      nextAttemptAt: now,
    })),
  );
}

export async function provisionSummary(businessId: string) {
  const business = await getBusiness(businessId);
  if (!business) return null;
  const jobs = await getProvisioningJobsForBusiness(businessId);
  return {
    businessId,
    provisionStatus: business.provisionStatus,
    provisionError: business.provisionError ?? null,
    jobs: jobs.map((job) => ({
      provider: job.provider,
      status: job.status,
      attempts: job.attempts,
      nextAttemptAt: job.nextAttemptAt,
      lastError: job.lastError,
    })),
  };
}

export async function retryProvisioning(businessId: string) {
  const now = Date.now();
  const jobs = await getProvisioningJobsForBusiness(businessId);
  let bumped = 0;
  for (const job of jobs) {
    if (job.status === "succeeded" || job.status === "skipped") continue;
    const ok = await claimProvisioningJob(job.id, now, now + LEASE_MS, ["failed", "pending"]);
    if (!ok) continue;
    await updateProvisioningJobResult(job.id, {
      status: "pending",
      nextAttemptAt: now,
      leasedUntil: null,
      lastError: null,
      attempts: job.attempts,
    });
    bumped += 1;
  }
  await refreshBusinessProvisionStatus(businessId);
  return bumped;
}

export async function runProvisioningWorkerPass(now = Date.now()) {
  const due = await listDueProvisioningJobs(now);
  const claimed: ProvisioningJob[] = [];
  for (const job of due) {
    const ok = await claimProvisioningJob(job.id, now, now + LEASE_MS, ["pending", "failed"]);
    if (ok) claimed.push(job);
  }
  for (const job of claimed) {
    await processProvisioningJob(job, now);
  }
  return { claimed: claimed.length, processed: claimed.map((item) => item.id) };
}

async function processProvisioningJob(job: ProvisioningJob, now: number) {
  const business = await getBusiness(job.businessId);
  if (!business) {
    await updateProvisioningJobResult(job.id, {
      status: "failed",
      nextAttemptAt: now + RETRY_MS,
      leasedUntil: null,
      lastError: "Business row missing.",
      attempts: job.attempts + 1,
    });
    return;
  }
  try {
    const outcome = await runProviderStub(job.provider, business);
    await applyProviderOutcome(job, business, outcome, now);
  } catch (error) {
    const message = redactProvisioningError(error instanceof Error ? error.message : "Provisioning failed");
    const attempts = job.attempts + 1;
    const terminal = attempts >= MAX_ATTEMPTS;
    await updateProvisioningJobResult(job.id, {
      status: terminal ? "failed" : "failed",
      nextAttemptAt: terminal ? job.nextAttemptAt : now + RETRY_MS,
      leasedUntil: null,
      lastError: message,
      attempts,
    });
    if (terminal) {
      await setBusinessProvisionFields(business.id, {
        provisionError: message,
      });
    }
    await refreshBusinessProvisionStatus(business.id);
  }
}

type StubOutcome =
  | { kind: "succeeded" }
  | { kind: "skipped"; reason: string }
  | { kind: "retry"; reason: string }
  | { kind: "pending_external"; reason: string }
  | { kind: "failed"; reason: string };

async function runProviderStub(provider: ProvisioningProvider, business: Business): Promise<StubOutcome> {
  if (provider === "composio") {
    const result = await provisionComposioForBusiness(business.id);
    if (result.kind === "succeeded") return { kind: "succeeded" };
    if (result.kind === "retry") return { kind: "retry", reason: result.reason };
    return { kind: "failed", reason: result.reason };
  }
  if (provider === "orgo") {
    if (!orgoConfigured()) {
      return { kind: "skipped", reason: "ORGO_API_KEY is not set." };
    }
    const result = await provisionOrgoForBusiness(business.id);
    if (result.kind === "succeeded") return { kind: "succeeded" };
    if (result.kind === "retry") return { kind: "retry", reason: result.reason };
    return { kind: "failed", reason: result.reason };
  }
  if (provider === "treg") {
    const result = await provisionTregForBusiness(business.id);
    if (result.kind === "succeeded" || result.kind === "skipped") return result;
    if (result.kind === "retry") return { kind: "retry", reason: result.reason };
    return { kind: "failed", reason: result.reason };
  }
  return { kind: "skipped", reason: "Unknown provider." };
}

async function applyProviderOutcome(job: ProvisioningJob, business: Business, outcome: StubOutcome, now: number) {
  const attempts = job.attempts + 1;
  if (outcome.kind === "failed") {
    const terminal = attempts >= MAX_ATTEMPTS;
    await updateProvisioningJobResult(job.id, {
      status: "failed",
      nextAttemptAt: terminal ? job.nextAttemptAt : now + RETRY_MS,
      leasedUntil: null,
      lastError: redactProvisioningError(outcome.reason),
      attempts,
    });
    if (terminal) {
      await setBusinessProvisionFields(business.id, { provisionError: redactProvisioningError(outcome.reason) });
    }
    await refreshBusinessProvisionStatus(business.id);
    return;
  }
  if (outcome.kind === "succeeded" || outcome.kind === "skipped") {
    await updateProvisioningJobResult(job.id, {
      status: outcome.kind === "succeeded" ? "succeeded" : "skipped",
      nextAttemptAt: now,
      leasedUntil: null,
      lastError: outcome.kind === "skipped" ? redactProvisioningError(outcome.reason) : null,
      attempts,
    });
    await refreshBusinessProvisionStatus(business.id);
    return;
  }
  if (outcome.kind === "pending_external") {
    const terminal = attempts >= MAX_ATTEMPTS;
    await updateProvisioningJobResult(job.id, {
      status: "failed",
      nextAttemptAt: terminal ? job.nextAttemptAt : now + RETRY_MS,
      leasedUntil: null,
      lastError: redactProvisioningError(outcome.reason),
      attempts,
    });
    if (terminal) {
      await setBusinessProvisionFields(business.id, { provisionError: redactProvisioningError(outcome.reason) });
    }
    await refreshBusinessProvisionStatus(business.id);
    return;
  }
  await updateProvisioningJobResult(job.id, {
    status: "failed",
    nextAttemptAt: now + RETRY_MS,
    leasedUntil: null,
    lastError: redactProvisioningError(outcome.reason),
    attempts,
  });
  await refreshBusinessProvisionStatus(business.id);
}

export async function refreshBusinessProvisionStatus(businessId: string) {
  const existing = await getBusiness(businessId);
  const previousStatus = existing?.provisionStatus;
  const jobs = await getProvisioningJobsForBusiness(businessId);
  const status = aggregateProvisionStatus(jobs);
  const failedJob = jobs.find((job) => job.status === "failed" && job.lastError);
  await setBusinessProvisionFields(businessId, {
    provisionStatus: status,
    provisionError: failedJob?.lastError ?? null,
  });
  await maybeNotifyDeskReady(businessId, { previousStatus, newStatus: status });
}

export function aggregateProvisionStatus(jobs: ProvisioningJob[]): import("../types").ProvisionStatus {
  if (jobs.length === 0) return "pending";
  const terminalOk = (status: string) => status === "succeeded" || status === "skipped";
  if (jobs.every((job) => terminalOk(job.status))) return "ready";
  if (jobs.some((job) => job.status === "failed")) {
    if (jobs.some((job) => terminalOk(job.status))) return "partial";
    return "failed";
  }
  if (jobs.some((job) => job.status === "running")) return "provisioning";
  return "pending";
}