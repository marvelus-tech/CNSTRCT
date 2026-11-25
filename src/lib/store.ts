import { getDb } from "./db";
import { newId } from "./ids";
import type {
  Agent,
  AppConnection,
  Approval,
  AuditEvent,
  Business,
  Capital,
  ComposioConnectionAttempt,
  ComposioConnectionAttemptStatus,
  ComposioSessionRow,
  Lead,
  PendingState,
  Profile,
  Routine,
  Space,
  StoredMessage,
  TaskStatus,
  Trades,
  User,
  WorkTask,
  ProvisioningJob,
  ProvisioningJobStatus,
  ProvisioningProvider,
  ProvisionStatus,
} from "./types";

async function db() {
  return await getDb();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    createdAt: Number(row.created_at),
    authSubject: row.auth_subject == null || row.auth_subject === "" ? null : String(row.auth_subject),
  };
}

export async function createUser(input: {
  email: string;
  name: string;
  authSubject?: string | null;
}): Promise<User> {
  const user: User = {
    id: newId("user"),
    email: input.email,
    name: input.name,
    createdAt: Date.now(),
    authSubject: input.authSubject ?? null,
  };
  await (await db())
    .prepare("INSERT INTO users (id, email, name, created_at, auth_subject) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.email, user.name, user.createdAt, user.authSubject);
  return user;
}

export async function setUserAuthSubject(userId: string, authSubject: string) {
  await (await db()).prepare("UPDATE users SET auth_subject = ? WHERE id = ?").run(authSubject, userId);
}

export async function getUserByAuthSubject(authSubject: string): Promise<User | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM users WHERE auth_subject = ?").get(authSubject));
  if (!row) return null;
  return rowToUser(row);
}

/** Stable user row for Supabase magic link (subject wins over email). */
export async function upsertUserForAuth(input: {
  email: string;
  name: string;
  authSubject?: string | null;
}): Promise<User> {
  if (input.authSubject) {
    const bySubject = await getUserByAuthSubject(input.authSubject);
    if (bySubject) return bySubject;
  }
  const byEmail = await getUserByEmail(input.email);
  if (byEmail) {
    if (input.authSubject && !byEmail.authSubject) await setUserAuthSubject(byEmail.id, input.authSubject);
    return byEmail;
  }
  return await createUser(input);
}

export async function getUser(id: string): Promise<User | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM users WHERE id = ?").get(id));
  if (!row) return null;
  return rowToUser(row);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM users WHERE email = ?").get(email));
  if (!row) return null;
  return rowToUser(row);
}

export async function createSession(userId: string) {
  const id = newId("ses");
  await (await db()).prepare("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)").run(id, userId, Date.now());
  return id;
}

export async function deleteSessionsForUserExcept(userId: string, keepSessionId: string) {
  await (await db())
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?")
    .run(userId, keepSessionId);
}

/** Future: list active sessions for account settings. */
export async function listSessionsForUser(userId: string) {
  return await (await db()).prepare("SELECT id, created_at FROM sessions WHERE user_id = ?").all(userId);
}

export async function userForSession(sessionId: string): Promise<User | null> {
  const row = asRecord(
    await (await db())
      .prepare(
        "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
      )
      .get(sessionId),
  );
  if (!row) return null;
  return rowToUser(row);
}

export async function saveProfile(profile: Profile) {
  await (await db())
    .prepare(
      `INSERT INTO profiles (user_id, interests, skills, has_idea, idea_text, space, capital, trades, location, constraints, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         interests = excluded.interests,
         skills = excluded.skills,
         has_idea = excluded.has_idea,
         idea_text = excluded.idea_text,
         space = excluded.space,
         capital = excluded.capital,
         trades = excluded.trades,
         location = excluded.location,
         constraints = excluded.constraints,
         updated_at = excluded.updated_at`,
    )
    .run(
      profile.userId,
      profile.interests,
      profile.skills,
      profile.hasIdea ? 1 : 0,
      profile.ideaText,
      profile.space,
      profile.capital,
      profile.trades,
      profile.location,
      profile.constraints,
      Date.now(),
    );
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId));
  if (!row) return null;
  return {
    userId: String(row.user_id),
    interests: String(row.interests),
    skills: String(row.skills),
    hasIdea: Number(row.has_idea) === 1,
    ideaText: String(row.idea_text),
    space: String(row.space) as Space,
    capital: String(row.capital) as Capital,
    trades: String(row.trades) as Trades,
    location: String(row.location),
    constraints: String(row.constraints),
  };
}

export async function insertBusinessWithProvisioningJobs(
  input: Omit<Business, "createdAt" | "provisionStatus"> & { provisionStatus?: ProvisionStatus },
  providers: ProvisioningProvider[],
): Promise<Business> {
  const business: Business = {
    ...input,
    id: input.id ?? newId("biz"),
    createdAt: Date.now(),
    provisionStatus: input.provisionStatus ?? "pending",
    orgoComputerId: input.orgoComputerId ?? null,
    provisionError: input.provisionError ?? null,
  };
  const now = business.createdAt;
  const statements = [
    {
      sql: `INSERT INTO businesses (
        id, user_id, template_id, name, slug, city, created_at, profile_json,
        orgo_workspace_id, orgo_computer_id, composio_user_id, treg_customer_tag,
        provision_status, provision_error, create_idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        business.id,
        business.userId,
        business.templateId,
        business.name,
        business.slug,
        business.city,
        business.createdAt,
        business.profileJson ?? null,
        business.orgoWorkspaceId ?? null,
        business.orgoComputerId ?? null,
        business.composioUserId ?? null,
        business.tregCustomerTag ?? null,
        business.provisionStatus,
        business.provisionError ?? null,
        business.createIdempotencyKey ?? null,
      ],
    },
    ...providers.map((provider) => ({
      sql: `INSERT INTO provisioning_jobs (
        id, business_id, provider, status, attempts, next_attempt_at, leased_until, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', 0, ?, NULL, NULL, ?, ?)`,
      params: [newId("pjob"), business.id, provider, now, now, now],
    })),
  ];
  await (await db()).transaction(statements);
  return business;
}

export async function insertBusiness(input: Omit<Business, "id" | "createdAt" | "provisionStatus"> & { provisionStatus?: ProvisionStatus }): Promise<Business> {
  const business: Business = { provisionStatus: "pending", ...input, id: newId("biz"), createdAt: Date.now() };
  await (await db())
    .prepare(
      `INSERT INTO businesses (
        id, user_id, template_id, name, slug, city, created_at, profile_json,
        orgo_workspace_id, orgo_computer_id, composio_user_id, treg_customer_tag,
        provision_status, provision_error, create_idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      business.id,
      business.userId,
      business.templateId,
      business.name,
      business.slug,
      business.city,
      business.createdAt,
      business.profileJson ?? null,
      business.orgoWorkspaceId ?? null,
      business.orgoComputerId ?? null,
      business.composioUserId ?? null,
      business.tregCustomerTag ?? null,
      business.provisionStatus ?? "pending",
      business.provisionError ?? null,
      business.createIdempotencyKey ?? null,
    );
  return business;
}

function mapBusiness(row: Record<string, unknown>): Business {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    templateId: String(row.template_id),
    name: String(row.name),
    slug: String(row.slug),
    city: String(row.city),
    createdAt: Number(row.created_at),
    profileJson: row.profile_json == null ? null : String(row.profile_json),
    orgoWorkspaceId: row.orgo_workspace_id == null ? null : String(row.orgo_workspace_id),
    orgoComputerId: row.orgo_computer_id == null ? null : String(row.orgo_computer_id),
    composioUserId: row.composio_user_id == null ? null : String(row.composio_user_id),
    tregCustomerTag: row.treg_customer_tag == null ? null : String(row.treg_customer_tag),
    tregBudgetStatus:
      row.treg_budget_status == null
        ? "unset"
        : (String(row.treg_budget_status) as import("./types").TregBudgetStatus),
    provisionStatus: (row.provision_status == null ? "pending" : String(row.provision_status)) as ProvisionStatus,
    provisionError: row.provision_error == null ? null : String(row.provision_error),
    createIdempotencyKey: row.create_idempotency_key == null ? null : String(row.create_idempotency_key),
  };
}

function mapProvisioningJob(row: Record<string, unknown>): ProvisioningJob {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    provider: String(row.provider) as ProvisioningProvider,
    status: String(row.status) as ProvisioningJobStatus,
    attempts: Number(row.attempts),
    nextAttemptAt: Number(row.next_attempt_at),
    leasedUntil: row.leased_until == null ? null : Number(row.leased_until),
    lastError: row.last_error == null ? null : String(row.last_error),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function getBusinessByCreateIdempotencyKey(userId: string, key: string): Promise<Business | null> {
  const row = asRecord(
    await (await db())
      .prepare("SELECT * FROM businesses WHERE user_id = ? AND create_idempotency_key = ? LIMIT 1")
      .get(userId, key),
  );
  return row ? mapBusiness(row) : null;
}

export async function setBusinessProvisionFields(
  businessId: string,
  patch: { provisionStatus?: ProvisionStatus; provisionError?: string | null },
) {
  if (patch.provisionStatus != null) {
    await (await db())
      .prepare("UPDATE businesses SET provision_status = ? WHERE id = ?")
      .run(patch.provisionStatus, businessId);
  }
  if (patch.provisionError !== undefined) {
    await (await db())
      .prepare("UPDATE businesses SET provision_error = ? WHERE id = ?")
      .run(patch.provisionError, businessId);
  }
}

export async function enqueueProvisioningJobs(
  businessId: string,
  items: Array<{ provider: ProvisioningProvider; nextAttemptAt: number }>,
) {
  const now = Date.now();
  const statements = items.map((item) => ({
    sql: `INSERT INTO provisioning_jobs (
      id, business_id, provider, status, attempts, next_attempt_at, leased_until, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, 'pending', 0, ?, NULL, NULL, ?, ?)
    ON CONFLICT (business_id, provider) DO NOTHING`,
    params: [newId("pjob"), businessId, item.provider, item.nextAttemptAt, now, now],
  }));
  await (await db()).transaction(statements);
}

export async function getProvisioningJobsForBusiness(businessId: string): Promise<ProvisioningJob[]> {
  return await (await (await db())
    .prepare("SELECT * FROM provisioning_jobs WHERE business_id = ? ORDER BY provider")
    .all(businessId))
    .map((row) => mapProvisioningJob(asRecord(row)!));
}

export async function listDueProvisioningJobs(now: number, limit = 10): Promise<ProvisioningJob[]> {
  return await (await (await db())
    .prepare(
      `SELECT * FROM provisioning_jobs
       WHERE status IN ('pending', 'failed')
         AND next_attempt_at <= ?
         AND (leased_until IS NULL OR leased_until < ?)
       ORDER BY next_attempt_at ASC
       LIMIT ?`,
    )
    .all(now, now, limit))
    .map((row) => mapProvisioningJob(asRecord(row)!));
}

export async function claimProvisioningJob(
  jobId: string,
  now: number,
  leaseUntil: number,
  fromStatuses: ProvisioningJobStatus[],
): Promise<boolean> {
  const placeholders = fromStatuses.map(() => "?").join(", ");
  const result = await (await db())
    .prepare(
      `UPDATE provisioning_jobs
       SET status = 'running', leased_until = ?, updated_at = ?
       WHERE id = ?
         AND status IN (${placeholders})
         AND next_attempt_at <= ?
         AND (leased_until IS NULL OR leased_until < ?)`,
    )
    .run(leaseUntil, now, jobId, ...fromStatuses, now, now);
  return result.changes > 0;
}

export async function updateProvisioningJobResult(
  jobId: string,
  patch: {
    status: ProvisioningJobStatus;
    nextAttemptAt: number;
    leasedUntil: number | null;
    lastError: string | null;
    attempts: number;
  },
) {
  await (await db())
    .prepare(
      `UPDATE provisioning_jobs
       SET status = ?, next_attempt_at = ?, leased_until = ?, last_error = ?, attempts = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.status,
      patch.nextAttemptAt,
      patch.leasedUntil,
      patch.lastError,
      patch.attempts,
      Date.now(),
      jobId,
    );
}


export async function setBusinessWorkspace(id: string, workspaceId: string) {
  await (await db()).prepare("UPDATE businesses SET orgo_workspace_id = ? WHERE id = ?").run(workspaceId, id);
}

export async function setBusinessTregBudgetStatus(id: string, status: import("./types").TregBudgetStatus) {
  await (await db()).prepare("UPDATE businesses SET treg_budget_status = ? WHERE id = ?").run(status, id);
}

export async function setBusinessComposioUserId(id: string, composioUserId: string) {
  await (await db()).prepare("UPDATE businesses SET composio_user_id = ? WHERE id = ?").run(composioUserId, id);
}

export async function setBusinessOrgoIds(
  id: string,
  patch: { orgoWorkspaceId?: string | null; orgoComputerId?: string | null },
) {
  if (patch.orgoWorkspaceId !== undefined) {
    await (await db()).prepare("UPDATE businesses SET orgo_workspace_id = ? WHERE id = ?").run(patch.orgoWorkspaceId, id);
  }
  if (patch.orgoComputerId !== undefined) {
    await (await db()).prepare("UPDATE businesses SET orgo_computer_id = ? WHERE id = ?").run(patch.orgoComputerId, id);
  }
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM businesses WHERE slug = ?").get(slug));
  return row ? mapBusiness(row) : null;
}

export async function getBusinessForUser(userId: string): Promise<Business | null> {
  const row = asRecord(
    await (await db()).prepare("SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId),
  );
  return row ? mapBusiness(row) : null;
}

export async function getBusinessForUserAndTemplate(userId: string, templateId: string): Promise<Business | null> {
  const row = asRecord(
    await (await db()).prepare("SELECT * FROM businesses WHERE user_id = ? AND template_id = ? LIMIT 1").get(userId, templateId),
  );
  return row ? mapBusiness(row) : null;
}

export async function listBusinessesForUser(userId: string): Promise<Business[]> {
  return await (await (await db())
    .prepare("SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId))
    .map((row) => mapBusiness(asRecord(row)!));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM businesses WHERE id = ?").get(id));
  return row ? mapBusiness(row) : null;
}

export async function listBusinessSlugs(): Promise<string[]> {
  return await (await (await db())
    .prepare("SELECT slug FROM businesses ORDER BY created_at ASC")
    .all())
    .map((row) => String(asRecord(row)?.slug ?? ""));
}

export async function slugTaken(slug: string) {
  return Boolean(await (await db()).prepare("SELECT 1 FROM businesses WHERE slug = ?").get(slug));
}

export async function insertAgent(
  input: Omit<Agent, "id" | "createdAt" | "tokensUsed" | "computerSeconds" | "orgoComputerId" | "tools"> & {
    tools?: string[];
  },
): Promise<Agent> {
  const agent: Agent = {
    ...input,
    tools: input.tools ?? [],
    id: newId("agt"),
    tokensUsed: 0,
    computerSeconds: 0,
    orgoComputerId: null,
    createdAt: Date.now(),
  };
  await (await db())
    .prepare(
      `INSERT INTO agents (id, business_id, user_id, role, name, title, specialty, instructions, status, tokens_used, computer_seconds, created_at, orgo_computer_id, tools_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NULL, ?)`,
    )
    .run(
      agent.id,
      agent.businessId,
      agent.userId,
      agent.role,
      agent.name,
      agent.title,
      agent.specialty,
      agent.instructions,
      agent.status,
      agent.createdAt,
      JSON.stringify(agent.tools),
    );
  return agent;
}

export async function setAgentTools(agentId: string, tools: string[]) {
  await (await db()).prepare("UPDATE agents SET tools_json = ? WHERE id = ?").run(JSON.stringify(tools), agentId);
}

function parseTools(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapAgent(row: Record<string, unknown>): Agent {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    userId: String(row.user_id),
    role: String(row.role) as Agent["role"],
    name: String(row.name),
    title: String(row.title),
    specialty: row.specialty == null ? "" : String(row.specialty),
    instructions: String(row.instructions),
    status: String(row.status) as Agent["status"],
    orgoComputerId: row.orgo_computer_id == null ? null : String(row.orgo_computer_id),
    tools: parseTools(row.tools_json),
    tokensUsed: Number(row.tokens_used),
    computerSeconds: Number(row.computer_seconds),
    createdAt: Number(row.created_at),
  };
}

export async function getAgent(id: string): Promise<Agent | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM agents WHERE id = ?").get(id));
  return row ? mapAgent(row) : null;
}

export async function listAgents(businessId: string): Promise<Agent[]> {
  return await (await (await db())
    .prepare("SELECT * FROM agents WHERE business_id = ? ORDER BY created_at ASC")
    .all(businessId))
    .map((row) => mapAgent(asRecord(row)!));
}

export async function setAgentSpecialty(id: string, specialty: string) {
  await (await db()).prepare("UPDATE agents SET specialty = ? WHERE id = ?").run(specialty, id);
}

export async function setAgentName(id: string, name: string) {
  await (await db()).prepare("UPDATE agents SET name = ? WHERE id = ?").run(name, id);
}

export async function setAgentInstructions(id: string, instructions: string) {
  await (await db()).prepare("UPDATE agents SET instructions = ? WHERE id = ?").run(instructions, id);
}

export async function setAgentOrgoComputer(id: string, computerId: string) {
  await (await db()).prepare("UPDATE agents SET orgo_computer_id = ? WHERE id = ?").run(computerId, id);
}

export async function addUsage(agentId: string, tokens: number, computerSeconds: number) {
  await (await db())
    .prepare(
      "UPDATE agents SET tokens_used = tokens_used + ?, computer_seconds = computer_seconds + ? WHERE id = ?",
    )
    .run(tokens, computerSeconds, agentId);
}

export async function insertRoutine(input: Omit<Routine, "id" | "lastRunAt">): Promise<Routine> {
  const routine: Routine = { ...input, id: newId("rtn"), lastRunAt: null };
  await (await db())
    .prepare(
      `INSERT INTO routines (id, agent_id, name, prompt, schedule_label, interval_ms, enabled, next_run_at, last_run_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(
      routine.id,
      routine.agentId,
      routine.name,
      routine.prompt,
      routine.scheduleLabel,
      routine.intervalMs,
      routine.enabled ? 1 : 0,
      routine.nextRunAt,
    );
  return routine;
}

function mapRoutine(row: Record<string, unknown>): Routine {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    name: String(row.name),
    prompt: String(row.prompt),
    scheduleLabel: String(row.schedule_label),
    intervalMs: Number(row.interval_ms),
    enabled: Number(row.enabled) === 1,
    nextRunAt: row.next_run_at == null ? null : Number(row.next_run_at),
    lastRunAt: row.last_run_at == null ? null : Number(row.last_run_at),
  };
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM routines WHERE id = ?").get(id));
  return row ? mapRoutine(row) : null;
}

export async function listRoutines(agentId: string): Promise<Routine[]> {
  return await (await (await db())
    .prepare("SELECT * FROM routines WHERE agent_id = ? ORDER BY name ASC")
    .all(agentId))
    .map((row) => mapRoutine(asRecord(row)!));
}

export async function markRoutineRan(id: string, nextRunAt: number) {
  await (await db()).prepare("UPDATE routines SET last_run_at = ?, next_run_at = ? WHERE id = ?").run(Date.now(), nextRunAt, id);
}

export async function dueRoutines(now = Date.now()): Promise<Routine[]> {
  return await (await (await db())
    .prepare("SELECT * FROM routines WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?")
    .all(now))
    .map((row) => mapRoutine(asRecord(row)!));
}

export async function appendRow(agentId: string, kind: StoredMessage["kind"], body: Record<string, unknown>): Promise<StoredMessage> {
  // One statement so two requests cannot both read the same MAX(seq).
  // The unique (agent_id, seq) constraint is the backstop if they still collide.
  const createdAt = Date.now();
  const id = newId("msg");
  const bodyJson = JSON.stringify(body);
  const sql = `INSERT INTO messages (id, agent_id, seq, kind, body, created_at)
       VALUES (?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM messages WHERE agent_id = ?), ?, ?, ?)
       RETURNING seq`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = asRecord(await (await db()).prepare(sql).get(id, agentId, agentId, kind, bodyJson, createdAt));
      return { id, agentId, seq: Number(row?.seq ?? 0), kind, body, createdAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/unique|duplicate key/i.test(message) || attempt === 4) throw error;
    }
  }
  throw new Error("Could not append the row.");
}

export async function updateRow(id: string, body: Record<string, unknown>) {
  await (await db()).prepare("UPDATE messages SET body = ? WHERE id = ?").run(JSON.stringify(body), id);
}

function mapMessage(row: Record<string, unknown>): StoredMessage {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    seq: Number(row.seq),
    kind: String(row.kind) as StoredMessage["kind"],
    body: JSON.parse(String(row.body)) as Record<string, unknown>,
    createdAt: Number(row.created_at),
  };
}

export async function listRows(agentId: string): Promise<StoredMessage[]> {
  return await (await (await db())
    .prepare("SELECT * FROM messages WHERE agent_id = ? ORDER BY seq ASC")
    .all(agentId))
    .map((row) => mapMessage(asRecord(row)!));
}

export async function rowsSince(agentId: string, seq: number): Promise<StoredMessage[]> {
  return await (await (await db())
    .prepare("SELECT * FROM messages WHERE agent_id = ? AND seq >= ? ORDER BY seq ASC")
    .all(agentId, seq))
    .map((row) => mapMessage(asRecord(row)!));
}

export async function maxSeq(agentId: string) {
  const row = asRecord(await (await db()).prepare("SELECT COALESCE(MAX(seq), 0) AS n FROM messages WHERE agent_id = ?").get(agentId));
  return Number(row?.n ?? 0);
}

export async function insertApproval(
  input: Omit<Approval, "id" | "createdAt" | "resolvedAt" | "status"> & { id?: string; status?: Approval["status"] },
): Promise<Approval> {
  const approval: Approval = {
    ...input,
    id: input.id ?? newId("apr"),
    status: input.status ?? "pending",
    createdAt: Date.now(),
    resolvedAt: null,
  };
  await (await db())
    .prepare(
      "INSERT INTO approvals (id, agent_id, user_id, row_id, call_id, tool, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)",
    )
    .run(approval.id, approval.agentId, approval.userId, approval.rowId, approval.callId, approval.tool, approval.status, approval.createdAt);
  return approval;
}

export async function getApproval(id: string): Promise<Approval | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM approvals WHERE id = ?").get(id));
  if (!row) return null;
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    userId: String(row.user_id),
    rowId: String(row.row_id),
    callId: String(row.call_id),
    tool: String(row.tool),
    status: String(row.status) as Approval["status"],
    createdAt: Number(row.created_at),
    resolvedAt: row.resolved_at == null ? null : Number(row.resolved_at),
  };
}

export async function setApprovalStatus(id: string, status: Approval["status"]) {
  await (await db()).prepare("UPDATE approvals SET status = ?, resolved_at = ? WHERE id = ?").run(status, Date.now(), id);
}

export async function getPolicy(userId: string, tool: string): Promise<string | null> {
  const row = asRecord(await (await db()).prepare("SELECT mode FROM policies WHERE user_id = ? AND tool = ?").get(userId, tool));
  return row ? String(row.mode) : null;
}

export async function setPolicy(userId: string, tool: string, mode: string) {
  await (await db())
    .prepare(
      `INSERT INTO policies (user_id, tool, mode) VALUES (?, ?, ?)
       ON CONFLICT(user_id, tool) DO UPDATE SET mode = excluded.mode`,
    )
    .run(userId, tool, mode);
}

export async function getActionPolicy(businessId: string, agentId: string, tool: string): Promise<string | null> {
  const row = asRecord(
    await (await db())
      .prepare("SELECT mode FROM action_policies WHERE business_id = ? AND agent_id = ? AND tool = ?")
      .get(businessId, agentId, tool),
  );
  return row ? String(row.mode) : null;
}

export async function setActionPolicy(businessId: string, agentId: string, tool: string, mode: string) {
  await (await db())
    .prepare(
      `INSERT INTO action_policies (business_id, agent_id, tool, mode) VALUES (?, ?, ?, ?)
       ON CONFLICT(business_id, agent_id, tool) DO UPDATE SET mode = excluded.mode`,
    )
    .run(businessId, agentId, tool, mode);
}

export async function listPendingApprovalsForBusiness(businessId: string): Promise<Approval[]> {
  return await (await (await db())
    .prepare(
      `SELECT approvals.* FROM approvals
       JOIN agents ON agents.id = approvals.agent_id
       WHERE agents.business_id = ? AND approvals.status = 'pending'`,
    )
    .all(businessId))
    .map((row) => {
      const record = asRecord(row)!;
      return {
        id: String(record.id),
        agentId: String(record.agent_id),
        userId: String(record.user_id),
        rowId: String(record.row_id),
        callId: String(record.call_id),
        tool: String(record.tool),
        status: String(record.status) as Approval["status"],
        createdAt: Number(record.created_at),
        resolvedAt: record.resolved_at == null ? null : Number(record.resolved_at),
      };
    });
}

export async function setPending(agentId: string, state: PendingState) {
  await (await db())
    .prepare(
      `INSERT INTO pending_turns (agent_id, state) VALUES (?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET state = excluded.state`,
    )
    .run(agentId, JSON.stringify(state));
}

export async function getPending(agentId: string): Promise<PendingState | null> {
  const row = asRecord(await (await db()).prepare("SELECT state FROM pending_turns WHERE agent_id = ?").get(agentId));
  if (!row) return null;
  return JSON.parse(String(row.state)) as PendingState;
}

export async function clearPending(agentId: string) {
  await (await db()).prepare("DELETE FROM pending_turns WHERE agent_id = ?").run(agentId);
}

export async function insertLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  const lead: Lead = { ...input, id: newId("lead"), createdAt: Date.now() };
  await (await db())
    .prepare(
      "INSERT INTO leads (id, business_id, name, phone, address, service, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(lead.id, lead.businessId, lead.name, lead.phone, lead.address, lead.service, lead.source, lead.createdAt);
  return lead;
}

export async function listLeads(businessId: string): Promise<Lead[]> {
  return await (await (await db())
    .prepare("SELECT * FROM leads WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId))
    .map((row) => {
      const record = asRecord(row)!;
      return {
        id: String(record.id),
        businessId: String(record.business_id),
        name: String(record.name),
        phone: String(record.phone),
        address: String(record.address),
        service: String(record.service),
        source: String(record.source),
        createdAt: Number(record.created_at),
      };
    });
}

export async function countRecentLeads(businessId: string, since: number) {
  const row = asRecord(
    await (await db()).prepare("SELECT COUNT(*) AS n FROM leads WHERE business_id = ? AND created_at >= ?").get(businessId, since),
  );
  return Number(row?.n ?? 0);
}

export async function upsertComputer(agentId: string, provider: string, status: string, note: string) {
  await (await db())
    .prepare(
      `INSERT INTO computers (agent_id, provider, status, note, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET provider = excluded.provider, status = excluded.status, note = excluded.note, updated_at = excluded.updated_at`,
    )
    .run(agentId, provider, status, note, Date.now());
}

export async function getComputer(agentId: string) {
  const row = asRecord(await (await db()).prepare("SELECT * FROM computers WHERE agent_id = ?").get(agentId));
  if (!row) return null;
  return {
    agentId: String(row.agent_id),
    provider: String(row.provider),
    status: String(row.status),
    note: String(row.note),
    updatedAt: Number(row.updated_at),
  };
}

export async function insertTask(input: {
  businessId: string;
  fromAgentId: string;
  toAgentId: string;
  instruction: string;
}): Promise<WorkTask> {
  const now = Date.now();
  const task: WorkTask = {
    id: newId("task"),
    businessId: input.businessId,
    fromAgentId: input.fromAgentId,
    toAgentId: input.toAgentId,
    instruction: input.instruction,
    status: "queued",
    report: "",
    createdAt: now,
    updatedAt: now,
  };
  await (await db())
    .prepare(
      `INSERT INTO tasks (id, business_id, from_agent_id, to_agent_id, instruction, status, report, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`,
    )
    .run(task.id, task.businessId, task.fromAgentId, task.toAgentId, task.instruction, task.status, task.createdAt, task.updatedAt);
  return task;
}

function mapTask(row: Record<string, unknown>): WorkTask {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    fromAgentId: String(row.from_agent_id),
    toAgentId: String(row.to_agent_id),
    instruction: String(row.instruction),
    status: String(row.status) as TaskStatus,
    report: String(row.report ?? ""),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function getTask(id: string): Promise<WorkTask | null> {
  const row = asRecord(await (await db()).prepare("SELECT * FROM tasks WHERE id = ?").get(id));
  return row ? mapTask(row) : null;
}

export async function listTasks(businessId: string): Promise<WorkTask[]> {
  return await (await (await db())
    .prepare("SELECT * FROM tasks WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId))
    .map((row) => mapTask(asRecord(row)!));
}

export async function openTaskForAgent(agentId: string): Promise<WorkTask | null> {
  const row = asRecord(
    await (await db())
      .prepare(
        "SELECT * FROM tasks WHERE to_agent_id = ? AND status IN ('queued', 'running', 'waiting_approval') ORDER BY created_at DESC LIMIT 1",
      )
      .get(agentId),
  );
  return row ? mapTask(row) : null;
}

export async function cancelOpenTasks(businessId: string, report: string) {
  await (await db())
    .prepare(
      `UPDATE tasks SET status = 'cancelled', report = ?, updated_at = ?
       WHERE business_id = ? AND status IN ('queued', 'running', 'waiting_approval')`,
    )
    .run(report, Date.now(), businessId);
}

export async function setTaskStatus(id: string, status: TaskStatus, report?: string) {
  if (report == null) {
    await (await db()).prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?").run(status, Date.now(), id);
    return;
  }
  await (await db())
    .prepare("UPDATE tasks SET status = ?, report = ?, updated_at = ? WHERE id = ?")
    .run(status, report, Date.now(), id);
}

export async function recordAudit(input: {
  businessId: string;
  userId: string;
  agentId?: string | null;
  actor: string;
  kind: string;
  tool?: string | null;
  decision?: string | null;
  summary: string;
  refId?: string | null;
}): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: newId("aud"),
    businessId: input.businessId,
    userId: input.userId,
    agentId: input.agentId ?? null,
    actor: input.actor,
    kind: input.kind,
    tool: input.tool ?? null,
    decision: input.decision ?? null,
    summary: input.summary,
    refId: input.refId ?? null,
    createdAt: Date.now(),
  };
  await (await db())
    .prepare(
      `INSERT INTO audit_events (id, business_id, user_id, agent_id, actor, kind, tool, decision, summary, created_at, ref_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.id,
      event.businessId,
      event.userId,
      event.agentId,
      event.actor,
      event.kind,
      event.tool,
      event.decision,
      event.summary,
      event.createdAt,
      event.refId,
    );
  return event;
}

export async function listAudit(businessId: string, limit = 20): Promise<AuditEvent[]> {
  return await (await (await db())
    .prepare("SELECT * FROM audit_events WHERE business_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(businessId, limit))
    .map((row) => {
      const record = asRecord(row)!;
      return {
        id: String(record.id),
        businessId: String(record.business_id),
        userId: String(record.user_id),
        agentId: record.agent_id == null ? null : String(record.agent_id),
        actor: String(record.actor),
        kind: String(record.kind),
        tool: record.tool == null ? null : String(record.tool),
        decision: record.decision == null ? null : String(record.decision),
        summary: String(record.summary),
        refId: record.ref_id == null ? null : String(record.ref_id),
        createdAt: Number(record.created_at),
      };
    });
}

export async function upsertConnection(input: {
  businessId: string;
  toolkit: string;
  status: AppConnection["status"];
  connectedAccountId?: string | null;
}): Promise<AppConnection> {
  const now = Date.now();
  const row = asRecord(
    await (await db())
      .prepare(
        `INSERT INTO app_connections (id, business_id, toolkit, connected_account_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (business_id, toolkit) DO UPDATE SET
           status = excluded.status,
           connected_account_id = COALESCE(excluded.connected_account_id, app_connections.connected_account_id),
           updated_at = excluded.updated_at
         RETURNING *`,
      )
      .get(newId("conn"), input.businessId, input.toolkit, input.connectedAccountId ?? null, input.status, now, now),
  );
  if (!row) throw new Error("Connection was not saved.");
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    toolkit: String(row.toolkit),
    connectedAccountId: row.connected_account_id == null ? null : String(row.connected_account_id),
    status: String(row.status) as AppConnection["status"],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapComposioConnectionAttempt(row: Record<string, unknown>): ComposioConnectionAttempt {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    toolkit: String(row.toolkit),
    composioUserId: String(row.composio_user_id),
    nonce: String(row.nonce),
    sessionId: row.session_id == null ? null : String(row.session_id),
    status: String(row.status) as ComposioConnectionAttempt["status"],
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

export async function insertComposioConnectionAttempt(input: Omit<ComposioConnectionAttempt, "sessionId"> & { sessionId?: string | null }) {
  await (await db())
    .prepare(
      `INSERT INTO composio_connection_attempts (
        id, business_id, toolkit, composio_user_id, nonce, session_id, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.businessId,
      input.toolkit,
      input.composioUserId,
      input.nonce,
      input.sessionId ?? null,
      input.status,
      input.createdAt,
      input.expiresAt,
    );
}

export async function getComposioConnectionAttemptByNonce(businessId: string, nonce: string) {
  const row = asRecord(
    await (await db())
      .prepare(
        `SELECT * FROM composio_connection_attempts
         WHERE business_id = ? AND nonce = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(businessId, nonce),
  );
  return row ? mapComposioConnectionAttempt(row) : null;
}

export async function completeComposioConnectionAttempt(id: string, status: ComposioConnectionAttemptStatus) {
  await (await db()).prepare("UPDATE composio_connection_attempts SET status = ? WHERE id = ?").run(status, id);
}

export async function expireComposioConnectionAttempts(businessId: string, now: number) {
  await (await db())
    .prepare(
      `UPDATE composio_connection_attempts
       SET status = 'failed'
       WHERE business_id = ? AND status = 'pending' AND expires_at < ?`,
    )
    .run(businessId, now);
}

export async function recordComposioSession(businessId: string, sessionId: string) {
  const now = Date.now();
  await (await db())
    .prepare(
      `INSERT INTO composio_sessions (id, business_id, session_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (business_id, session_id) DO NOTHING`,
    )
    .run(newId("csess"), businessId, sessionId, now);
}

export async function listComposioSessions(businessId: string): Promise<ComposioSessionRow[]> {
  return await (await (await db())
    .prepare("SELECT * FROM composio_sessions WHERE business_id = ? ORDER BY created_at ASC")
    .all(businessId))
    .map((row) => {
      const record = asRecord(row)!;
      return {
        id: String(record.id),
        businessId: String(record.business_id),
        sessionId: String(record.session_id),
        createdAt: Number(record.created_at),
      };
    });
}

export async function listConnections(businessId: string): Promise<AppConnection[]> {
  return await (await (await db())
    .prepare("SELECT * FROM app_connections WHERE business_id = ? ORDER BY toolkit ASC")
    .all(businessId))
    .map((row) => {
      const record = asRecord(row)!;
      return {
        id: String(record.id),
        businessId: String(record.business_id),
        toolkit: String(record.toolkit),
        connectedAccountId: record.connected_account_id == null ? null : String(record.connected_account_id),
        status: String(record.status) as AppConnection["status"],
        createdAt: Number(record.created_at),
        updatedAt: Number(record.updated_at),
      };
    });
}

export async function deleteBusinessForUser(userId: string, businessId: string) {
  const business = await getBusiness(businessId);
  if (!business || business.userId !== userId) return null;
  const agents = await listAgents(business.id);
  // One transaction so a failed delete does not leave messages behind a missing business.
  const statements: { sql: string; params: unknown[] }[] = [];
  for (const agent of agents) {
    for (const sql of [
      "DELETE FROM messages WHERE agent_id = ?",
      "DELETE FROM approvals WHERE agent_id = ?",
      "DELETE FROM pending_turns WHERE agent_id = ?",
      "DELETE FROM routines WHERE agent_id = ?",
      "DELETE FROM computers WHERE agent_id = ?",
      "DELETE FROM action_policies WHERE agent_id = ?",
    ]) {
      statements.push({ sql, params: [agent.id] });
    }
  }
  for (const sql of [
    "DELETE FROM leads WHERE business_id = ?",
    "DELETE FROM tasks WHERE business_id = ?",
    "DELETE FROM audit_events WHERE business_id = ?",
    "DELETE FROM app_connections WHERE business_id = ?",
    "DELETE FROM composio_connection_attempts WHERE business_id = ?",
    "DELETE FROM composio_sessions WHERE business_id = ?",
    "DELETE FROM agents WHERE business_id = ?",
    "DELETE FROM businesses WHERE id = ?",
  ]) {
    statements.push({ sql, params: [business.id] });
  }
  await (await db()).transaction(statements);
  return agents.map((agent) => agent.id);
}
