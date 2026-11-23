import { NextResponse } from "next/server";
import { enqueue, ownerCanMessage } from "@/lib/agent/loop";
import { currentUser } from "@/lib/session";
import { getAgent, listRows } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await context.params;
  const agent = await getAgent(id);
  if (!user || !agent || agent.userId !== user.id) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  if (!ownerCanMessage(agent)) {
    return NextResponse.json({ error: "Message the orchestrator. Specialists take tasks, not owner chat." }, { status: 403 });
  }
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  await enqueue(agent.id, { type: "user", text });
  return NextResponse.json({ rows: await listRows(agent.id) });
}
