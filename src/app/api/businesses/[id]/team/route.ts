import { NextResponse } from "next/server";

import { loadDesk } from "@/lib/desk";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const desk = loadDesk(user.id, id);
  if (!desk) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json({
    businessId: id,
    team: desk.agents.map((agent) => ({
      id: agent.id,
      role: agent.role,
      name: agent.name,
      title: agent.title,
      specialty: agent.specialty,
      status: agent.status,
      tools: agent.tools,
    })),
    tasks: desk.tasks,
  });
}
