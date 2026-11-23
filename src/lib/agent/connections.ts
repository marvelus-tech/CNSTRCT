import { composioConfigured, composioUserId, connectionState } from "./adapters";
import {
  completeToolkitOAuth,
  composioStubReason,
  createDirectToolsSession,
  deprovisionComposioTenant,
  startToolkitOAuth,
} from "./composio";
import { newId } from "../ids";
import {
  completeComposioConnectionAttempt,
  expireComposioConnectionAttempts,
  getBusiness,
  getComposioConnectionAttemptByNonce,
  insertComposioConnectionAttempt,
  listComposioSessions,
  listConnections,
  recordComposioSession,
  upsertConnection,
} from "../store";
import type { Business } from "../types";

const ATTEMPT_TTL_MS = 10 * 60_000;

function siteOrigin() {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function connectionCallbackUrl(businessId: string, nonce: string) {
  return `${siteOrigin()}/api/businesses/${encodeURIComponent(businessId)}/connections/callback?nonce=${encodeURIComponent(nonce)}`;
}

export async function startBusinessConnection(input: {
  business: Business;
  toolkit: string;
  ownerUserId: string;
}) {
  if (input.business.userId !== input.ownerUserId) {
    return { ok: false as const, error: "Not found.", status: 404 };
  }
  const stub = composioStubReason();
  if (stub) {
    return { ok: false as const, error: "Composio is not configured.", status: 503, stub: true };
  }
  const expected = composioUserId(input.business.id);
  if (input.business.composioUserId !== expected) {
    return { ok: false as const, error: "Business Composio identity is not ready.", status: 409 };
  }
  const now = Date.now();
  await expireComposioConnectionAttempts(input.business.id, now);
  const attemptId = newId("catt");
  const nonce = crypto.randomUUID();
  const callbackUrl = connectionCallbackUrl(input.business.id, nonce);
  const oauth = await startToolkitOAuth({ business: input.business, toolkit: input.toolkit, callbackUrl });
  await insertComposioConnectionAttempt({
    id: attemptId,
    businessId: input.business.id,
    toolkit: input.toolkit,
    composioUserId: expected,
    nonce,
    sessionId: oauth.sessionId,
    status: "pending",
    createdAt: now,
    expiresAt: now + ATTEMPT_TTL_MS,
  });
  await recordComposioSession(input.business.id, oauth.sessionId);
  await upsertConnection({
    businessId: input.business.id,
    toolkit: input.toolkit,
    status: "not_connected",
    connectedAccountId: null,
  });
  return {
    ok: true as const,
    redirectUrl: oauth.redirectUrl,
    toolkit: input.toolkit,
    state: connectionState({ keySet: composioConfigured(), connectedAccountId: null }),
  };
}

export async function finishBusinessConnectionCallback(input: {
  businessId: string;
  ownerUserId: string;
  nonce: string | null;
  sessionUri: string | null;
}) {
  if (!input.sessionUri) {
    return { ok: false as const, error: "Missing session_uri.", status: 400 };
  }
  const business = await getBusiness(input.businessId);
  if (!business || business.userId !== input.ownerUserId) {
    return { ok: false as const, error: "Not found.", status: 404 };
  }
  const stub = composioStubReason();
  if (stub) {
    return { ok: false as const, error: "Composio is not configured.", status: 503 };
  }
  if (!input.nonce) {
    return { ok: false as const, error: "Missing connection nonce.", status: 400 };
  }
  const attempt = await getComposioConnectionAttemptByNonce(input.businessId, input.nonce);
  const now = Date.now();
  if (!attempt || attempt.status !== "pending" || attempt.expiresAt < now) {
    return { ok: false as const, error: "Connection attempt expired or unknown.", status: 404 };
  }
  if (attempt.composioUserId !== business.composioUserId) {
    return { ok: false as const, error: "Connection identity mismatch.", status: 403 };
  }
  const completed = await completeToolkitOAuth({
    composioUserId: attempt.composioUserId,
    sessionUri: input.sessionUri,
  });
  await upsertConnection({
    businessId: business.id,
    toolkit: completed.toolkitSlug,
    status: "connected",
    connectedAccountId: completed.connectedAccountId,
  });
  await completeComposioConnectionAttempt(attempt.id, "completed");
  return {
    ok: true as const,
    toolkit: completed.toolkitSlug,
    connectedAccountId: completed.connectedAccountId,
  };
}

export async function deprovisionBusinessConnections(businessId: string) {
  const business = await getBusiness(businessId);
  if (!business?.composioUserId) return { ok: true as const };
  const connections = await listConnections(businessId);
  const sessionIds = (await listComposioSessions(businessId)).map((row) => row.sessionId);
  const accountIds = connections
    .map((item) => item.connectedAccountId)
    .filter((id): id is string => Boolean(id));
  return await deprovisionComposioTenant({
    composioUserId: business.composioUserId,
    connectedAccountIds: accountIds,
    sessionIds,
  });
}

/** Create a throwaway direct-tools session for tests or future tool execute paths. */
export async function ensureDirectToolsSession(businessId: string, connectedAccountId?: string | null) {
  if (composioStubReason()) return null;
  const { sessionId } = await createDirectToolsSession({ businessId, connectedAccountId });
  await recordComposioSession(businessId, sessionId);
  return sessionId;
}