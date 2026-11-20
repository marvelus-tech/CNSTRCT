import fs from "node:fs";
import path from "node:path";
import type { AgentRole } from "../types";
import { COMPUTER_LIMIT_SECONDS, SECONDS_PER_COMPUTER_CALL } from "./limits";
import { addUsage, getAgent, listConnections, listLeads } from "../store";
import { deliverComposioSend } from "./adapters";
import { toolsForRole } from "./blueprint";
import type { ToolContext } from "./contracts";
import {
  ensureWorkspace,
  execInSandbox,
  listSandboxFiles,
  readSandboxFile,
  readTerminal,
  writeSandboxFile,
} from "./sandbox";

export interface ToolOutcome {
  output: string;
  summary: string;
  status: "done" | "error";
  computer: boolean;
  handoff?: { role: string; task: string };
}

const SCHEMAS = [
  { type: "function", function: { name: "shell", description: "Run a sandboxed command. cnstrct-search lists local tradies. Network commands are blocked.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } },
  { type: "function", function: { name: "write_file", description: "Write a text file inside your computer.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } } },
  { type: "function", function: { name: "read_file", description: "Read a file on your computer.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "list_files", description: "List files on your computer.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "screenshot", description: "Describe your current screen from the files and terminal.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_leads", description: "Read homeowner leads captured on the business site.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "delegate", description: "Hand a task to the scout or the matcher. You cannot send or use their computer yourself.", parameters: { type: "object", properties: { role: { type: "string" }, task: { type: "string" } }, required: ["role", "task"] } } },
  { type: "function", function: { name: "send_outreach", description: "Send a partnership email. Requires owner approval. In the demo this only records a local outbox file.", parameters: { type: "object", properties: { to: { type: "string" }, channel: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } },
  { type: "function", function: { name: "send_match", description: "Introduce a homeowner lead to a tradie. Requires owner approval. Demo sends stay local.", parameters: { type: "object", properties: { to: { type: "string" }, leadName: { type: "string" }, tradieName: { type: "string" }, body: { type: "string" } }, required: ["to", "leadName", "body"] } } },
  { type: "function", function: { name: "spend", description: "Spend money. Requires owner approval. The demo never charges a card.", parameters: { type: "object", properties: { amountUsd: { type: "number" }, purpose: { type: "string" } }, required: ["amountUsd", "purpose"] } } },
];

export function toolSchemas() {
  return SCHEMAS;
}

export function toolSchemasFor(role: AgentRole) {
  const allow = new Set(toolsForRole(role));
  return SCHEMAS.filter((schema) => allow.has(schema.function.name));
}

function charge(agentId: string) {
  const agent = getAgent(agentId);
  if (agent && agent.computerSeconds + SECONDS_PER_COMPUTER_CALL > COMPUTER_LIMIT_SECONDS) {
    throw new Error("Computer hour limit reached for this demo (2 hours).");
  }
  addUsage(agentId, 0, SECONDS_PER_COMPUTER_CALL);
}

function recordOutbox(agentId: string, file: string, payload: Record<string, unknown>) {
  const rel = `outbox/${file}`;
  const root = ensureWorkspace(agentId);
  const abs = path.join(root, "outbox", file);
  const prior = fs.existsSync(abs) ? (JSON.parse(fs.readFileSync(abs, "utf8")) as unknown[]) : [];
  prior.push({ mocked: true, network: false, ...payload, at: new Date().toISOString() });
  writeSandboxFile(agentId, rel, JSON.stringify(prior, null, 2));
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  if (!toolsForRole(ctx.agent.role).includes(name)) {
    return {
      output: `${name} is not on the ${ctx.agent.role} tool list.`,
      summary: "Tool blocked",
      status: "error",
      computer: false,
    };
  }
  try {
    switch (name) {
      case "shell": {
        charge(ctx.agent.id);
        const result = await execInSandbox(ctx.agent.id, String(args.command ?? ""), ctx.city);
        return {
          output: result.output,
          summary: result.exitCode === 0 ? "Command finished" : `Exit ${result.exitCode}`,
          status: result.exitCode === 0 ? "done" : "error",
          computer: true,
        };
      }
      case "write_file": {
        charge(ctx.agent.id);
        writeSandboxFile(ctx.agent.id, String(args.path ?? "notes/note.md"), String(args.content ?? ""));
        return { output: `Saved ${String(args.path)}`, summary: `Saved ${String(args.path)}`, status: "done", computer: true };
      }
      case "read_file": {
        charge(ctx.agent.id);
        const text = readSandboxFile(ctx.agent.id, String(args.path ?? ""));
        return { output: text.slice(0, 8000), summary: `Read ${String(args.path)}`, status: "done", computer: true };
      }
      case "list_files": {
        charge(ctx.agent.id);
        const files = listSandboxFiles(ctx.agent.id).map((file) => file.path).join("\n") || "(empty)";
        return { output: files, summary: "Listed files", status: "done", computer: true };
      }
      case "screenshot": {
        charge(ctx.agent.id);
        const files = listSandboxFiles(ctx.agent.id).map((file) => file.path).join(", ") || "none yet";
        const terminal = readTerminal(ctx.agent.id) || "(terminal is clear)";
        const output = `Desktop 1280x800. Files: ${files}.\nTerminal:\n${terminal}`;
        writeSandboxFile(ctx.agent.id, "notes/screen.txt", output);
        return { output, summary: "Looked at the screen", status: "done", computer: true };
      }
      case "list_leads": {
        const leads = listLeads(ctx.business.id);
        const output = leads.length
          ? leads.map((lead) => `${lead.name} | ${lead.service} | ${lead.address} | ${lead.phone} | ${lead.source}`).join("\n")
          : "No leads yet.";
        return { output, summary: `${leads.length} leads`, status: "done", computer: false };
      }
      case "delegate": {
        const role = String(args.role ?? "");
        const task = String(args.task ?? "").trim();
        if (role !== "scout" && role !== "matcher") {
          return { output: "Delegate only to scout or matcher.", summary: "Bad role", status: "error", computer: false };
        }
        if (!task) return { output: "Delegation needs a task.", summary: "Empty task", status: "error", computer: false };
        return {
          output: `Handoff ready for ${role}.`,
          summary: `Delegated to ${role}`,
          status: "done",
          computer: false,
          handoff: { role, task },
        };
      }
      case "send_outreach":
      case "send_match":
      case "spend": {
        charge(ctx.agent.id);
        if (name === "spend") {
          recordOutbox(ctx.agent.id, "spend.json", args);
          return {
            output: "Recorded a mock charge. No card was billed.",
            summary: "Recorded locally",
            status: "done",
            computer: true,
          };
        }
        const connection = listConnections(ctx.business.id).find((item) => item.toolkit === "gmail");
        const delivery = await deliverComposioSend({
          businessId: ctx.business.id,
          role: ctx.agent.role,
          connectedAccountId: connection?.connectedAccountId ?? null,
          args,
        });
        if (delivery.delivered) {
          recordOutbox(ctx.agent.id, name === "send_outreach" ? "outreach.json" : "matches.json", {
            ...args,
            network: true,
            mocked: false,
            composioLogId: delivery.logId,
          });
          return { output: `Sent through Composio (${delivery.logId}).`, summary: "Sent", status: "done", computer: false };
        }
        const file = name === "send_outreach" ? "outreach.json" : "matches.json";
        recordOutbox(ctx.agent.id, file, { ...args, composio: delivery.reason });
        const output =
          delivery.reason === "not_configured"
            ? "Recorded locally. Composio is not configured. No message was sent."
            : delivery.reason === "not_connected"
              ? "Recorded locally. Gmail is not connected. No message was sent."
              : `Composio did not send (${delivery.reason}). No success was recorded.`;
        return {
          output,
          summary: delivery.reason === "provider_error" || delivery.reason === "sdk_not_loaded" ? "Send failed" : "Recorded locally",
          status: delivery.reason === "provider_error" || delivery.reason === "sdk_not_loaded" ? "error" : "done",
          computer: true,
        };
      }
      default:
        return { output: `Unknown tool ${name}`, summary: "Unknown tool", status: "error", computer: false };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed";
    return { output: message, summary: message, status: "error", computer: false };
  }
}
