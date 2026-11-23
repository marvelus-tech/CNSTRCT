import { getActionPolicy } from "../store";

/**
 * Adapted from grokbot-clone server/src/agent/tools.ts policyFor (MIT).
 * There, the bot's own computer and shell run freely, and outbound
 * Composio writes pause for an approval card. CNSTRCT asks before those
 * writes and before computer or shell tools, because a Composio approval
 * does not cover a command on the machine.
 */

export type Decision = "allow" | "ask" | "block";

const GATED = new Set([
  "send_outreach",
  "send_match",
  "spend",
  "shell",
  "write_file",
  "read_file",
  "list_files",
  "screenshot",
]);

const TITLES: Record<string, string> = {
  send_outreach: "send a partnership email",
  send_match: "send a match introduction",
  spend: "spend money",
  shell: "run a command",
  write_file: "save a file",
  read_file: "read a file",
  list_files: "list files",
  screenshot: "look at the screen",
  list_leads: "read leads",
  delegate: "delegate a task",
};

export function toolTitle(name: string) {
  return TITLES[name] ?? name.replaceAll("_", " ");
}

export async function policyFor(
  _userId: string,
  toolName: string,
  scope?: { businessId: string; agentId: string },
): Promise<{ decision: Decision; key: string; title: string }> {
  const title = toolTitle(toolName);
  if (!GATED.has(toolName)) return { decision: "allow", key: toolName, title };
  const mode = scope ? await getActionPolicy(scope.businessId, scope.agentId, toolName) : null;
  if (mode === "blocked") return { decision: "block", key: toolName, title };
  if (mode === "always_allow") return { decision: "allow", key: toolName, title };
  return { decision: "ask", key: toolName, title };
}

export function describeArgs(args: Record<string, unknown>) {
  return Object.entries(args)
    .filter(([, value]) => typeof value !== "object" || value === null)
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 800)}`)
    .join("\n")
    .slice(0, 2000);
}
