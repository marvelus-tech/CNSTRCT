import { NextResponse } from "next/server";

import { orgo, OrgoError } from "@/lib/agent/orgo";
import { redactProvisioningError } from "@/lib/agent/redact";
import { requireBusinessOwner } from "@/lib/agent/treg-prospect-auth";

export const runtime = "nodejs";

const cache = new Map<string, { expiresAt: number; body: { image?: string; url?: string } }>();
const CACHE_MS = 30_000;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gate = await requireBusinessOwner(id);
  if ("error" in gate) return gate.error;
  const computerId = gate.business.orgoComputerId;
  if (!computerId) {
    return NextResponse.json({ error: "No Orgo workspace computer for this business." }, { status: 404 });
  }
  const now = Date.now();
  const hit = cache.get(computerId);
  if (hit && hit.expiresAt > now) {
    return NextResponse.json({ ...hit.body, cached: true });
  }
  try {
    const shot = await orgo.screenshot(computerId);
    cache.set(computerId, { expiresAt: now + CACHE_MS, body: shot });
    return NextResponse.json({ ...shot, cached: false });
  } catch (error) {
    const message =
      error instanceof OrgoError ? redactProvisioningError(error.message) : "Could not load workspace preview.";
    const status = error instanceof OrgoError && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}