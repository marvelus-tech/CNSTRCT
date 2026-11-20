import { newId } from "../ids";
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
  const next = prev.then(() => runTurn(agentId, trigger)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Turn failed";
    appendRow(agentId, "notice", { tone: "error", text: message });
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
  const agent = getAgent(agentId);
  if (!agent) return;
  const business = getBusiness(agent.businessId);
  const profile = getProfile(agent.userId);
  if (!business || !profile) return;

  if (trigger.type !== "resume") {
    if (trigger.type === "user" && agent.role === "orchestrator") {
      expireDeskChain(business.id);
    } else {
      const pending = getPending(agentId);
      if (pending) expirePending(agentId, pending);
    }
  }

  let startSeq = maxSeq(agentId) + 1;
  if (trigger.type === "resume") {
    const state = getPending(agentId);
    if (!state) return;
    startSeq = state.startSeq;
    const paused = await processCalls(agentId, state, trigger);
    if (paused) return;
  } else if (trigger.type === "user") {
    appendRow(agentId, "message", { role: "user", text: trigger.text });
  } else if (trigger.type === "task") {
    const task = getTask(trigger.taskId);
    if (!task || task.status === "cancelled" || task.status === "failed") {
      appendRow(agentId, "notice", { tone: "info", text: "This task was closed before it ran." });
      return;
    }
    setTaskStatus(trigger.taskId, "running");
    appendRow(agentId, "event", { event: "task", text: trigger.instruction, taskId: trigger.taskId });
  } else {
    appendRow(agentId, "event", {
      event: "routine-run",
      text: `Running routine: ${trigger.name}`,
      routineId: trigger.routineId,
    });
  }

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const fresh = getAgent(agentId);
    if (!fresh) return;
    if (fresh.tokensUsed >= TOKEN_LIMIT) {
      appendRow(agentId, "notice", {
        tone: "error",
        text: "Demo token budget is used up (50,000). Model calls stop at the cap until you reset.",
      });
      return;
    }
    const visible = rowsSince(agentId, startSeq);
    const modelInput = {
      agent: fresh,
      business,
      profile,
      trigger,
      turnRows: visible,
      leads: listLeads(business.id),
    };
    let result;
    try {
      result = await callModel(modelInput, toolSchemasFor(fresh.tools));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Model failed";
      appendRow(agentId, "notice", { tone: "info", text: `${message} Falling back to the scripted demo model.` });
      result = mockModel(modelInput);
    }
    addUsage(agentId, result.tokens, 0);
    if (result.text) appendRow(agentId, "message", { role: "assistant", text: result.text });
    if (!result.calls.length) {
      settleSpecialist(fresh, result.text);
      return;
    }

    const state: PendingState = {
      calls: result.calls.map((call) => {
        const callId = newId("call");
        const row = appendRow(agentId, "tool-call", {
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
  const agent = getAgent(agentId);
  const business = agent ? getBusiness(agent.businessId) : null;
  if (!agent || !business) return false;

  while (state.calls.length) {
    const call = state.calls[0]!;
    const args = parseArgs(call.arguments);
    const approval = state.approvalId ? getApproval(state.approvalId) : null;
    const policy = policyFor(agent.userId, call.name, { businessId: business.id, agentId: agent.id });
    let decision = policy.decision;
    if (approval && approval.callId === call.callId) {
      if (approval.status === "pending") return true;
      decision = approval.status === "allowed" || approval.status === "always" ? "allow" : "block";
      state.approvalId = "";
    } else if (decision === "ask") {
      const approvalId = newId("apr");
      const card = appendRow(agentId, "card", {
        card: "approval",
        approvalId,
        title: `Allow ${agent.name} to ${policy.title}?`,
        detail: describeArgs(args),
        tool: call.name,
        args,
        status: "pending",
      });
      insertApproval({
        id: approvalId,
        agentId,
        userId: agent.userId,
        rowId: card.id,
        callId: call.callId,
        tool: call.name,
      });
      markTool(agentId, call.rowId, "awaiting-approval");
      state.approvalId = approvalId;
      setPending(agentId, state);
      recordAudit({
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
        const task = trigger.type === "task" ? getTask(trigger.taskId) : openTaskForAgent(agent.id);
        if (task && task.status !== "cancelled" && task.status !== "failed") setTaskStatus(task.id, "waiting_approval");
        tellOrchestrator(business.id, `${agent.name} is waiting for you to approve ${policy.title}.`);
      }
      return true;
    }

    if (decision === "block") {
      appendRow(agentId, "tool-result", {
        tool: call.name,
        callId: call.callId,
        output: "The user declined this action. Do not retry it.",
        status: "denied",
        summary: "Not allowed",
        args,
      });
      markTool(agentId, call.rowId, "denied");
      state.calls.shift();
      continue;
    }

    const outcome = await runTool(call.name, args, { agent, business, city: business.city });
    if (outcome.handoff && agent.role === "orchestrator") {
      const target = listAgents(business.id).find((item) => item.role === outcome.handoff?.role);
      if (!target) {
        appendRow(agentId, "tool-result", {
          tool: call.name,
          callId: call.callId,
          output: `No ${outcome.handoff.role} on this desk.`,
          status: "error",
          summary: "Missing specialist",
          args,
        });
        markTool(agentId, call.rowId, "error");
        state.calls.shift();
        continue;
      }
      const task = insertTask({
        businessId: business.id,
        fromAgentId: agent.id,
        toAgentId: target.id,
        instruction: outcome.handoff.task,
      });
      recordAudit({
        businessId: business.id,
        userId: agent.userId,
        agentId: agent.id,
        actor: "orchestrator",
        kind: "task.delegated",
        summary: `${agent.name} delegated to ${target.name}.`,
        refId: task.id,
      });
      await enqueue(target.id, { type: "task", taskId: task.id, instruction: outcome.handoff.task });
      const finished = getTask(task.id);
      appendRow(agentId, "tool-result", {
        tool: call.name,
        callId: call.callId,
        output: finished?.report || `${target.name} has the task (${finished?.status ?? "queued"}).`,
        status: "done",
        summary: `Delegated to ${target.name}`,
        args,
        taskId: task.id,
      });
      markTool(agentId, call.rowId, "done");
      state.calls.shift();
      continue;
    }

    appendRow(agentId, "tool-result", {
      tool: call.name,
      callId: call.callId,
      output: outcome.output,
      status: outcome.status,
      summary: outcome.summary,
      args,
    });
    markTool(agentId, call.rowId, outcome.status === "done" ? "done" : "error");
    if (outcome.status === "done" && (call.name === "send_outreach" || call.name === "send_match" || call.name === "shell")) {
      recordAudit({
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

  clearPending(agentId);
  return false;
}

function settleSpecialist(agent: Agent, text: string) {
  if (agent.role === "orchestrator") return;
  const task = openTaskForAgent(agent.id);
  if (!task) return;
  const report = text || `${agent.name} finished without a draft.`;
  setTaskStatus(task.id, "reported", report);
  tellOrchestrator(agent.businessId, `${agent.name}: ${report}`);
  recordAudit({
    businessId: agent.businessId,
    userId: agent.userId,
    agentId: agent.id,
    actor: agent.role,
    kind: "task.reported",
    summary: report,
    refId: task.id,
  });
}

function tellOrchestrator(businessId: string, text: string) {
  const orchestrator = listAgents(businessId).find((agent) => agent.role === "orchestrator");
  if (!orchestrator) return;
  appendRow(orchestrator.id, "notice", { tone: "info", text });
}

function expirePending(agentId: string, state: PendingState) {
  if (state.approvalId) {
    const approval = getApproval(state.approvalId);
    if (approval?.status === "pending") {
      setApprovalStatus(approval.id, "expired");
      const card = listRows(agentId).find((row) => row.id === approval.rowId);
      if (card) updateRow(card.id, { ...card.body, status: "expired" });
      const agent = getAgent(agentId);
      if (agent) {
        recordAudit({
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
    appendRow(agentId, "tool-result", {
      tool: call.name,
      callId: call.callId,
      output: "Skipped: a new message arrived before approval.",
      status: "denied",
      summary: "Skipped",
    });
    markTool(agentId, call.rowId, "denied");
  }
  clearPending(agentId);
}

function expireDeskChain(businessId: string) {
  for (const member of listAgents(businessId)) {
    const pending = getPending(member.id);
    if (pending) expirePending(member.id, pending);
  }
  for (const approval of listPendingApprovalsForBusiness(businessId)) {
    setApprovalStatus(approval.id, "expired");
    const card = listRows(approval.agentId).find((row) => row.id === approval.rowId);
    if (card) updateRow(card.id, { ...card.body, status: "expired" });
    recordAudit({
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
  cancelOpenTasks(businessId, "Closed because a new owner message arrived.");
}

function markTool(agentId: string, rowId: string, status: string) {
  const row = listRows(agentId).find((item) => item.id === rowId);
  if (!row) return;
  updateRow(rowId, { ...row.body, status });
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

export function resolveApproval(
  userId: string,
  approvalId: string,
  decision: string,
  draft?: Record<string, string>,
  expectedAgentId?: string,
) {
  if (!APPROVAL_DECISIONS.has(decision)) throw new Error("That decision is not allowed.");
  const approval = getApproval(approvalId);
  if (!approval || approval.userId !== userId) throw new Error("Approval not found.");
  if (expectedAgentId && approval.agentId !== expectedAgentId) throw new Error("Approval not found.");
  if (approval.status !== "pending") return Promise.resolve();
  const agent = getAgent(approval.agentId);
  if (!agent) throw new Error("Approval not found.");
  if (decision === "allow" || decision === "always") assertDraftUnchanged(approval.agentId, approval.callId, draft);
  if (decision === "edit") applyDraft(approval.agentId, approval.callId, draft);
  const status = decision === "deny" ? "denied" : "allowed";
  setApprovalStatus(approval.id, status);
  if (decision === "always") setActionPolicy(agent.businessId, agent.id, approval.tool, "always_allow");
  const card = listRows(approval.agentId).find((row) => row.id === approval.rowId);
  if (card) {
    const nextBody: Record<string, unknown> = { ...card.body, status: decision === "edit" ? "edited" : status };
    if (decision === "edit" && draft) {
      const current = card.body.args && typeof card.body.args === "object" ? (card.body.args as Record<string, unknown>) : {};
      nextBody.args = { ...current, ...draft };
    }
    updateRow(card.id, nextBody);
  }
  recordAudit({
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

function assertDraftUnchanged(agentId: string, callId: string, draft?: Record<string, string>) {
  if (!draft) return;
  const state = getPending(agentId);
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

function applyDraft(agentId: string, callId: string, draft?: Record<string, string>) {
  if (!draft) return;
  const state = getPending(agentId);
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
  setPending(agentId, state);
}
