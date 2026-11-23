import { getAgent, getRoutine, insertTask, listAgents, markRoutineRan, recordAudit } from "../store";
import { enqueue } from "./loop";

/**
 * Routine runner adapted from grokbot-clone server/src/routines.ts (MIT).
 * grokbot uses croner. CNSTRCT stores a plain interval and a next_run_at
 * so the demo does not need a cron dependency. The label still reads like
 * a schedule ("Weekdays at 8:00"). Run now fires the same path.
 */

export async function runRoutine(id: string) {
  return await queueRoutine(id);
}

/**
 * Owner-triggered only. The process timer is gone so a routine cannot fire
 * because the server stayed up. Queueing still runs the same turn loop.
 */
export async function queueRoutine(id: string) {
  const routine = await getRoutine(id);
  if (!routine || !routine.enabled) return;
  const agent = await getAgent(routine.agentId);
  if (!agent) return;
  await markRoutineRan(id, Date.now() + routine.intervalMs);
  if (agent.role === "orchestrator") {
    await recordAudit({
      businessId: agent.businessId,
      userId: agent.userId,
      agentId: agent.id,
      actor: "owner",
      kind: "routine.queued",
      summary: `Queued ${routine.name} on ${agent.name}.`,
    });
    return enqueue(agent.id, {
      type: "routine",
      routineId: routine.id,
      name: routine.name,
      prompt: routine.prompt,
    });
  }
  const orchestrator = (await listAgents(agent.businessId)).find((item) => item.role === "orchestrator");
  const task = await insertTask({
    businessId: agent.businessId,
    fromAgentId: orchestrator?.id ?? agent.id,
    toAgentId: agent.id,
    instruction: routine.prompt,
  });
  await recordAudit({
    businessId: agent.businessId,
    userId: agent.userId,
    agentId: agent.id,
    actor: "owner",
    kind: "routine.queued",
    summary: `Queued ${routine.name} for ${agent.name}. It will not run on a timer.`,
  });
  return enqueue(agent.id, { type: "task", taskId: task.id, instruction: routine.prompt });
}

export function startScheduler() {
  // Planned routines are visible in the workspace. Nothing here executes them.
}
