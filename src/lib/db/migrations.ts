/**
 * Append-only schema for the tables the store already uses.
 * Do not edit a version after it has shipped. Add the next number.
 *
 * Epoch milliseconds are BIGINT. Postgres INTEGER is int4 and overflows
 * `Date.now()` (about 1.7e12). SQLite INTEGER is already 64-bit, so the
 * sqlite adapter rewrites BIGINT to INTEGER when it applies this text.
 * Flags and small counters stay INTEGER. There are no foreign keys: the
 * existing deletes are ordered by hand and a new constraint would change them.
 */
export const MIGRATIONS = [
  {
    version: "001_baseline",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  interests TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  has_idea INTEGER NOT NULL DEFAULT 0,
  idea_text TEXT NOT NULL DEFAULT '',
  space TEXT NOT NULL DEFAULT 'none',
  capital TEXT NOT NULL DEFAULT 'none',
  trades TEXT NOT NULL DEFAULT 'maybe',
  location TEXT NOT NULL DEFAULT '',
  constraints TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  profile_json TEXT,
  orgo_workspace_id TEXT
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL,
  status TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  computer_seconds INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  orgo_computer_id TEXT,
  tools_json TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule_label TEXT NOT NULL,
  interval_ms BIGINT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run_at BIGINT,
  last_run_at BIGINT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE (agent_id, seq)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  row_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  resolved_at BIGINT
);

CREATE TABLE IF NOT EXISTS policies (
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  mode TEXT NOT NULL,
  PRIMARY KEY (user_id, tool)
);

CREATE TABLE IF NOT EXISTS pending_turns (
  agent_id TEXT PRIMARY KEY,
  state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  service TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS computers (
  agent_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL,
  report TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  agent_id TEXT,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  tool TEXT,
  decision TEXT,
  summary TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  ref_id TEXT
);

CREATE INDEX IF NOT EXISTS audit_events_business ON audit_events (business_id, created_at);

CREATE TABLE IF NOT EXISTS action_policies (
  business_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  mode TEXT NOT NULL,
  PRIMARY KEY (business_id, agent_id, tool)
);

CREATE TABLE IF NOT EXISTS app_connections (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  toolkit TEXT NOT NULL,
  connected_account_id TEXT,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (business_id, toolkit)
);

CREATE TABLE IF NOT EXISTS billing_entitlements (
  user_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end BIGINT,
  updated_at BIGINT NOT NULL
);

-- Applied after the tables exist, and skipped while duplicate roles remain.
CREATE UNIQUE INDEX IF NOT EXISTS agents_business_role ON agents (business_id, role);
`,
  },
  {
    version: "002_provisioning",
    sql: `
ALTER TABLE businesses ADD COLUMN orgo_computer_id TEXT;
ALTER TABLE businesses ADD COLUMN composio_user_id TEXT;
ALTER TABLE businesses ADD COLUMN treg_customer_tag TEXT;
ALTER TABLE businesses ADD COLUMN provision_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE businesses ADD COLUMN provision_error TEXT;
ALTER TABLE businesses ADD COLUMN create_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_user_idempotency ON businesses (user_id, create_idempotency_key);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at BIGINT NOT NULL,
  leased_until BIGINT,
  last_error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (business_id, provider)
);

CREATE INDEX IF NOT EXISTS provisioning_jobs_due ON provisioning_jobs (status, next_attempt_at);
`,
  },
  {
    version: "003_treg_budget",
    sql: `
ALTER TABLE businesses ADD COLUMN treg_budget_status TEXT NOT NULL DEFAULT 'unset';
`,
  },
  {
    version: "004_composio_lifecycle",
    sql: `
CREATE TABLE IF NOT EXISTS composio_connection_attempts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  toolkit TEXT NOT NULL,
  composio_user_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  session_id TEXT,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  UNIQUE (business_id, nonce)
);

CREATE INDEX IF NOT EXISTS composio_connection_attempts_business ON composio_connection_attempts (business_id, status);

CREATE TABLE IF NOT EXISTS composio_sessions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE (business_id, session_id)
);
`,
  },
  {
    version: "005_auth_subject",
    sql: `
ALTER TABLE users ADD COLUMN auth_subject TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_subject ON users (auth_subject) WHERE auth_subject IS NOT NULL;
`,
  },
] as const;

export const SCHEMA_MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at BIGINT NOT NULL
)`;
