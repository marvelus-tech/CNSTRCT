export type Space = "none" | "corner" | "spare-room" | "garage";
export type Capital = "none" | "under-100" | "100-500" | "more";
export type Trades = "yes" | "no" | "maybe";
export type AgentRole = "orchestrator" | "scout" | "matcher";
export type MessageKind = "message" | "tool-call" | "tool-result" | "card" | "event" | "notice";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface Profile {
  userId: string;
  interests: string;
  skills: string;
  hasIdea: boolean;
  ideaText: string;
  space: Space;
  capital: Capital;
  trades: Trades;
  location: string;
  constraints: string;
}

export type ProvisionStatus = "pending" | "provisioning" | "ready" | "partial" | "failed";

export type ProvisioningProvider = "orgo" | "treg" | "composio";

export type ProvisioningJobStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface Business {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  slug: string;
  city: string;
  createdAt: number;
  profileJson?: string | null;
  orgoWorkspaceId?: string | null;
  orgoComputerId?: string | null;
  composioUserId?: string | null;
  tregCustomerTag?: string | null;
  provisionStatus: ProvisionStatus;
  provisionError?: string | null;
  createIdempotencyKey?: string | null;
}

export interface ProvisioningJob {
  id: string;
  businessId: string;
  provider: ProvisioningProvider;
  status: ProvisioningJobStatus;
  attempts: number;
  nextAttemptAt: number;
  leasedUntil: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  businessId: string;
  userId: string;
  role: AgentRole;
  name: string;
  title: string;
  specialty: string;
  instructions: string;
  status: "active" | "coming_soon";
  orgoComputerId: string | null;
  tools: string[];
  tokensUsed: number;
  computerSeconds: number;
  createdAt: number;
}

export interface Routine {
  id: string;
  agentId: string;
  name: string;
  prompt: string;
  scheduleLabel: string;
  intervalMs: number;
  enabled: boolean;
  nextRunAt: number | null;
  lastRunAt: number | null;
}

export interface StoredMessage {
  id: string;
  agentId: string;
  seq: number;
  kind: MessageKind;
  body: Record<string, unknown>;
  createdAt: number;
}

export interface Lead {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  address: string;
  service: string;
  source: string;
  createdAt: number;
}

export interface Approval {
  id: string;
  agentId: string;
  userId: string;
  rowId: string;
  callId: string;
  tool: string;
  status: "pending" | "allowed" | "denied" | "always" | "expired";
  createdAt: number;
  resolvedAt: number | null;
}

export type Trigger =
  | { type: "user"; text: string }
  | { type: "routine"; routineId: string; name: string; prompt: string }
  | { type: "task"; taskId: string; instruction: string }
  | { type: "resume" };

export type TaskStatus = "queued" | "running" | "waiting_approval" | "reported" | "failed" | "cancelled";

export interface WorkTask {
  id: string;
  businessId: string;
  fromAgentId: string;
  toAgentId: string;
  instruction: string;
  status: TaskStatus;
  report: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEvent {
  id: string;
  businessId: string;
  userId: string;
  agentId: string | null;
  actor: string;
  kind: string;
  tool: string | null;
  decision: string | null;
  summary: string;
  refId: string | null;
  createdAt: number;
}

export interface AppConnection {
  id: string;
  businessId: string;
  toolkit: string;
  connectedAccountId: string | null;
  status: "not_configured" | "not_connected" | "connected" | "expired";
  createdAt: number;
  updatedAt: number;
}

export interface PendingState {
  calls: { callId: string; name: string; arguments: string; rowId: string }[];
  outputs: { callId: string; output: string }[];
  approvalId: string;
  startSeq: number;
}
