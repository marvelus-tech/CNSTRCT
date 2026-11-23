import "server-only";

import { NextResponse } from "next/server";

import { startBusinessConnection } from "@/lib/agent/connections";
import { loadDesk } from "@/lib/desk";
import { currentUser } from "@/lib/session";
import { getBusiness } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const desk = await loadDesk(user.id, id);
  if (!desk) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json({ businessId: id, ...desk.connections });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const business = await getBusiness(id);
  if (!business || business.userId !== user.id) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  let toolkit = "gmail";
  try {
    const body = (await request.json()) as { toolkit?: string };
    if (body.toolkit) toolkit = String(body.toolkit).toLowerCase();
  } catch {
    /* default toolkit */
  }
  const result = await startBusinessConnection({ business, toolkit, ownerUserId: user.id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, stub: result.stub === true }, { status: result.status });
  }
  return NextResponse.json({
    businessId: id,
    toolkit: result.toolkit,
    redirectUrl: result.redirectUrl,
    state: result.state,
  });
}