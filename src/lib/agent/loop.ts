import { newId } from "../ids";
import { mapSeq } from "../seq";
import {
  addUsage,
  appendRow,
  cancelOpenTasks,
  clearPending,
  getAgent,
  getApproval,
  getBusiness,
  getPending,
  getProfile,
  getTask,
  insertApproval,
  insertTask,
  listAgents,
  listLeads,
  listPendingApprovalsForBusiness,
  listRows,
  maxSeq,
  openTaskForAgent,
  recordAudit,
  rowsSince,
  setActionPolicy,
  setApprovalStatus,
  setPending,
  setTaskStatus,
  updateRow,
} from "../store";
import type { Agent, PendingState, Trigger } from "../types";
import { TOKEN_LIMIT } from "./limits";
import { callModel, mockModel } from "./model";
import { describeArgs, policyFor } from "./policy";
import { runTool, toolSchemasFor } from "./tools";

/**
 * Turn loop adapted from grokbot-clone server/src/agent/loop.ts (MIT).
 * One queue per agent. Tool calls run in order. A gated tool writes an
 * approval card and stores the rest of the batch in pending_turns. Allow,
 * edit, or deny resumes that batch. A newer owner message expires every open
 * approval and delegated task on that desk, including specialist cards.
 */

const queues = new Map<string, Promise<void>>();
const MAX_STEPS = 8;

export function enqueue(agentId: string, trigger: Trigger) {
  const prev = queues.get(agentId) ?? Promise.resolve();
  const next = prev.then(async () => await runTurn(agentId, trigger)).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : "Turn failed";
    await appendRow(agentId, "notice", { tone: "error", text: message });
  });
  queues.set(agentId, next);
  next.finally(() => {
    if (queues.get(agentId) === next) queues.delete(agentId);
  });
  return next;
}

export function ownerCanMessage(agent: { role: Agent["role"] }) {
  return agent.role === "orchestrator";
}

async function runTurn(agentId: string, trigger: Trigger) {
  const agent = await getAgent(agentId);
  if (!agent) return;
  const business = await getBusiness(agent.businessId);
  const profile = await getProfile(agent.userId);
  if (!business || !profile) return;

  if (trigger.type !== "resume") {
    if (trigger.type === "user" && agent.role === "orchestrator") {
      await expireDeskChain(business.id);
    } else {
      const pending = await getPending(agentId);
      if (pending) await expirePending(agentId, pending);
    }
  }

  let startSeq = await maxSeq(agentId) + 1;
  if (trigger.type === "resume") {
    const state = await getPending(agentId);
    if (!state) return;
    startSeq = state.startSeq;
    const paused = await processCalls(agentId, state, trigger);
    if (paused) return;
  } else if (trigger.type === "user") {
    await appendRow(agentId, "message", { role: "user", text: trigger.text });
  } else if (trigger.type === "task") {
    const task = await getTask(trigger.taskId);
    if (!task || task.status === "cancelled" || task.status === "failed") {
      await appendRow(agentId, "notice", { tone: "info", text: "This task was closed before it ran." });
      return;
    }
    await setTaskStatus(trigger.taskId, "running");
    await appendRow(agentId, "event", { event: "task", text: trigger.instruction, taskId: trigger.taskId });
  } else {
    await appendRow(agentId, "event", {
      event: "routine-run",
      text: `Running routine: ${trigger.name}`,
      routineId: trigger.routineId,
    });
  }

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const fresh = await getAgent(agentId);
    if (!fresh) return;
    if (fresh.tokensUsed >= TOKEN_LIMIT) {
      await appendRow(agentId, "notice", {
        tone: "error",
        text: "Demo token budget is used up (50,000). Model calls stop at the cap until you reset.",
      });
      return;
    }
    const visible = await rowsSince(agentId, startSeq);
    const modelInput = {
      agent: fresh,
      business,
      profile,
      trigger,
      turnRows: visible,
      leads: await listLeads(business.id),
    };
    let result;
    try {
      result = await callModel(modelInput, toolSchemasFor(fresh.tools));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Model failed";
      await appendRow(agentId, "notice", { tone: "info", text: `${message} Falling back to the scripted demo model.` });
      result = mockModel(modelInput);
    }
    await addUsage(agentId, result.tokens, 0);
    if (result.text) await appendRow(agentId, "message", { role: "assistant", text: result.text });
    if (!result.calls.length) {
      await settleSpecialist(fresh, result.text);
      return;
    }

    const state: PendingState = {
      calls: await mapSeq(result.calls, async (call) => {
        const callId = newId("call");
        const row = await appendRow(agentId, "tool-call", {
          callId,
          name: call.name,
          args: call.arguments,
          status: "running",
        });
        return { callId, name: call.name, arguments: JSON.stringify(call.arguments), rowId: row.id };
      }),
      outputs: [],
      approvalId: "",
      startSeq,
    };
    const paused = await processCalls(agentId, state, trigger);
    if (paused) return;
  }
}

async function processCalls(agentId: string, state: PendingState, trigger: Trigger) {
  const agent = await getAgent(agentId);
  const business = agent ? await getBusiness(agent.businessId) : null;
  if (!agent || !business) return false;

  while (state.calls.length) {
    const call = state.calls[0]!;
    const args = parseArgs(call.arguments);
    const approval = state.approvalId ? await getApproval(state.approvalId) : null;
    const policy = await policyFor(agent.userId, call.name, { businessId: business.id, agentId: agent.id });
    let decision = policy.decision;
    if (approval && approval.callId === call.callId) {
      if (approval.status === "pending") return true;
      decision = approval.status === "allowed" || approval.status === "always" ? "allow" : "block";
      state.approvalId = "";
    } else if (decision === "ask") {
      const approvalId = newId("apr");
      const card = await appendRow(agentId, "card", {
        card: "approval",
        approvalId,
        title: `Allow ${agent.name} to ${policy.title}?`,
        detail: describeArgs(args),
        tool: call.name,
        args,
        status: "pending",
      });
      await insertApproval({
        id: approvalId,
        agentId,
        userId: agent.userId,
        rowId: card.id,
        callId: call.callId,
        tool: call.name,
      });
      await markTool(agentId, call.rowId, "awaiting-approval");
      state.approvalId = approvalId;
      await setPending(agentId, state);
      await recordAudit({
        businessId: business.id,
        userId: agent.userId,
        agentId,
        actor: agent.role,
        kind: "approval.requested",
        tool: call.name,
        decision: "ask",
        summary: `${agent.name} is waiting for approval to ${policy.title}.`,
        refId: approvalId,
      });
      if (agent.role !== "orchestrator") {
        const task = trigger.type === "task" ? await getTask(trigger.taskId) : await openTaskForAgent(agent.id);
        if (task && task.status !== "cancelled" && task.status !== "failed") await setTaskStatus(task.id, "waiting_approval");
        await tellOrchestrator(business.id, `${agent.name} is waiting for you to approve ${policy.title}.`);
      }
      return true;
    }

    if (decision === "block") {
      await appendRow(agentId, "tool-result", {
        tool: call.name,
        callId: call.callId,
        output: "The user declined this action. Do not retry it.",
        status: "denied",
        summary: "Not allowed",
        args,
      });
      await markTool(agentId, call.rowId, "denied");
      state.calls.shift();
      continue;
    }

    // allow and always_allow both land here. Shell still goes through planCommand.
    const outcome = await runTool(call.name, args, { agent, business, city: business.city });
    if (outcome.handoff && agent.role === "orchestrator") {
      const target = (await listAgents(business.id)).find((item) => item.role === outcome.handoff?.role);
      if (!target) {
        await appendRow(agentId, "tool-result", {
          tool: call.name,
          callId: call.callId,
          output: `No ${outcome.handoff.role} on this desk.`,
          status: "error",
          summary: "Missing specialist",
          args,
        });
        await markTool(agentId, call.rowId, "error");
        state.calls.shift();
        continue;
      }
      const task = await insertTask({
        businessId: business.id,
        fromAgentId: agent.id,
        toAgentId: target.id,
        instruction: outcome.handoff.task,
      });
      await recordAudit({
        businessId: business.id,
        userId: agent.userId,
        agentId: agent.id,
        actor: "orchestrator",
        kind: "task.delegated",
        summary: `${agent.name} delegated to ${target.name}.`,
        refId: task.id,
      });
      await enqueue(target.id, { type: "task", taskId: task.id, instruction: outcome.handoff.task });
      const finished = await getTask(task.id);
      await appendRow(agentId, "tool-result", {
        tool: call.name,
        callId: call.callId,
        output: finished?.report || `${target.name} has the task (${finished?.status ?? "queued"}).`,
        status: "done",
        summary: `Delegated to ${target.name}`,
        args,
        taskId: task.id,
      });
      await markTool(agentId, call.rowId, "done");
      state.calls.shift();
      continue;
    }

    await appendRow(agentId, "tool-result", {
      tool: call.name,
      callId: call.callId,
      output: outcome.output,
      status: outcome.status,
      summary: outcome.summary,
      args,
    });
    await markTool(agentId, call.rowId, outcome.status === "done" ? "done" : "error");
    if (outcome.status === "done" && (call.name === "send_outreach" || call.name === "send_match" || call.name === "shell")) {
      await recordAudit({
        businessId: business.id,
        userId: agent.userId,
        agentId,
        actor: agent.role,
        kind: "tool.executed",
        tool: call.name,
        decision: "allow",
        summary: outcome.summary,
        refId: call.name === "shell" ? agent.orgoComputerId ?? "local" : "not-sent",
      });
    }
    state.calls.shift();
  }

  await clearPending(agentId);
  return false;
}

async function settleSpecialist(agent: Agent, text: string) {
  if (agent.role === "orchestrator") return;
  const task = await openTaskForAgent(agent.id);
  if (!task) return;
  const report = text || `${agent.name} finished without a draft.`;
  await setTaskStatus(task.id, "reported", report);
  await tellOrchestrator(agent.businessId, `${agent.name}: ${report}`);
  await recordAudit({
    businessId: agent.businessId,
    userId: agent.userId,
    agentId: agent.id,
    actor: agent.role,
    kind: "task.reported",
    summary: report,
    refId: task.id,
  });
}

async function tellOrchestrator(businessId: string, text: string) {
  const orchestrator = (await listAgents(businessId)).find((agent) => agent.role === "orchestrator");
  if (!orchestrator) return;
  await appendRow(orchestrator.id, "notice", { tone: "info", text });
}

async function expirePending(agentId: string, state: PendingState) {
  if (state.approvalId) {
    const approval = await getApproval(state.approvalId);
    if (approval?.status === "pending") {
      await setApprovalStatus(approval.id, "expired");
      const card = (await listRows(agentId)).find((row) => row.id === approval.rowId);
      if (card) await updateRow(card.id, { ...card.body, status: "expired" });
      const agent = await getAgent(agentId);
      if (agent) {
        await recordAudit({
          businessId: agent.businessId,
          userId: agent.userId,
          agentId,
          actor: "owner",
          kind: "approval.expired",
          tool: approval.tool,
          decision: "expired",
          summary: "A new message closed the open approval.",
          refId: approval.id,
        });
      }
    }
  }
  for (const call of state.calls) {
    await appendRow(agentId, "tool-result", {
      tool: call.name,
      callId: call.callId,
      output: "Skipped: a new message arrived before approval.",
      status: "denied",
      summary: "Skipped",
    });
    await markTool(agentId, call.rowId, "denied");
  }
  await clearPending(agentId);
}

async function expireDeskChain(businessId: string) {
  for (const member of await listAgents(businessId)) {
    const pending = await getPending(member.id);
    if (pending) await expirePending(member.id, pending);
  }
  for (const approval of await listPendingApprovalsForBusiness(businessId)) {
    await setApprovalStatus(approval.id, "expired");
    const card = (await listRows(approval.agentId)).find((row) => row.id === approval.rowId);
    if (card) await updateRow(card.id, { ...card.body, status: "expired" });
    await recordAudit({
      businessId,
      userId: approval.userId,
      agentId: approval.agentId,
      actor: "owner",
      kind: "approval.expired",
      tool: approval.tool,
      decision: "expired",
      summary: "A new message closed the open approval.",
      refId: approval.id,
    });
  }
  await cancelOpenTasks(businessId, "Closed because a new owner message arrived.");
}

async function markTool(agentId: string, rowId: string, status: string) {
  const row = (await listRows(agentId)).find((item) => item.id === rowId);
  if (!row) return;
  await updateRow(rowId, { ...row.body, status });
}

function parseArgs(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const APPROVAL_DECISIONS = new Set(["allow", "deny", "edit", "always"]);

export async function resolveApproval(
  userId: string,
  approvalId: string,
  decision: string,
  draft?: Record<string, string>,
  expectedAgentId?: string,
) {
  if (!APPROVAL_DECISIONS.has(decision)) throw new Error("That decision is not allowed.");
  const approval = await getApproval(approvalId);
  if (!approval || approval.userId !== userId) throw new Error("Approval not found.");
  if (expectedAgentId && approval.agentId !== expectedAgentId) throw new Error("Approval not found.");
  if (approval.status !== "pending") return Promise.resolve();
  const agent = await getAgent(approval.agentId);
  if (!agent) throw new Error("Approval not found.");
  if (decision === "allow" || decision === "always") await assertDraftUnchanged(approval.agentId, approval.callId, draft);
  if (decision === "edit") await applyDraft(approval.agentId, approval.callId, draft);
  const status = decision === "deny" ? "denied" : "allowed";
  await setApprovalStatus(approval.id, status);
  if (decision === "always") await setActionPolicy(agent.businessId, agent.id, approval.tool, "always_allow");
  const card = (await listRows(approval.agentId)).find((row) => row.id === approval.rowId);
  if (card) {
    const nextBody: Record<string, unknown> = { ...card.body, status: decision === "edit" ? "edited" : status };
    if (decision === "edit" && draft) {
      const current = card.body.args && typeof card.body.args === "object" ? (card.body.args as Record<string, unknown>) : {};
      nextBody.args = { ...current, ...draft };
    }
    await updateRow(card.id, nextBody);
  }
  await recordAudit({
    businessId: agent.businessId,
    userId,
    agentId: agent.id,
    actor: "owner",
    kind: decision === "edit" ? "approval.edited" : decision === "deny" ? "approval.denied" : "approval.allowed",
    tool: approval.tool,
    decision,
    summary:
      decision === "deny"
        ? `Owner rejected ${agent.name}'s ${approval.tool}.`
        : decision === "edit"
          ? `Owner edited and approved ${agent.name}'s ${approval.tool}.`
          : decision === "always"
            ? `Owner always-allowed ${agent.name}'s ${approval.tool} on this business.`
            : `Owner approved ${agent.name}'s ${approval.tool}.`,
    refId: approval.id,
  });
  return enqueue(approval.agentId, { type: "resume" });
}

async function assertDraftUnchanged(agentId: string, callId: string, draft?: Record<string, string>) {
  if (!draft) return;
  const state = await getPending(agentId);
  const call = state?.calls.find((item) => item.callId === callId);
  if (!call) return;
  const args = parseArgs(call.arguments);
  const allowed = new Set(["to", "subject", "body", "command", "leadName", "tradieName", "purpose"]);
  for (const [key, value] of Object.entries(draft)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    if (String(args[key] ?? "") !== value) {
      throw new Error("Draft changed. Approve the edited draft.");
    }
  }
}

async function applyDraft(agentId: string, callId: string, draft?: Record<string, string>) {
  if (!draft) return;
  const state = await getPending(agentId);
  if (!state) return;
  const allowed = new Set(["to", "subject", "body", "command", "leadName", "tradieName", "purpose"]);
  const call = state.calls.find((item) => item.callId === callId);
  if (!call) return;
  const args = parseArgs(call.arguments);
  for (const [key, value] of Object.entries(draft)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    args[key] = value;
  }
  call.arguments = JSON.stringify(args);
  await setPending(agentId, state);
}
