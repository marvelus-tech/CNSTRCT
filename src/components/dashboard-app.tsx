"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wordmark } from "@/components/wordmark";
import { approvalChoice } from "@/lib/agent/approval-choice";
import type { DeskPayload } from "@/lib/desk";

export function DashboardApp({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [desk, setDesk] = useState<DeskPayload | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chat" | "team" | "desk">("chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function reload() {
    const response = await fetch(`/api/desk?businessId=${encodeURIComponent(businessId)}`);
    if (!response.ok) {
      setError("Could not load your workspace.");
      return;
    }
    const json = (await response.json()) as DeskPayload;
    setDesk(json);
  }

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), 4000);
    return () => clearInterval(timer);
  }, [businessId]);

  const agent = desk?.agents.find((item) => item.role === "orchestrator") ?? desk?.agents[0];

  async function send() {
    if (!agent || !text.trim()) return;
    setBusy(true);
    await fetch(`/api/agents/${agent.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    setBusy(false);
    await reload();
  }

  async function decide(
    agentId: string,
    approvalId: string,
    decision: "allow" | "deny" | "edit",
    draft?: Record<string, string>,
  ) {
    setBusy(true);
    await fetch(`/api/agents/${agentId}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId, decision, draft }),
    });
    setBusy(false);
    await reload();
  }

  async function runRoutine(agentId: string, routineId: string) {
    setBusy(true);
    await fetch(`/api/agents/${agentId}/routines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routineId }),
    });
    setBusy(false);
    await reload();
  }

  async function reset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await fetch("/api/desk/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: desk?.business?.id }),
    });
    router.push("/triage");
  }

  if (!desk) {
    return (
      <div className="grid min-h-full place-items-center text-muted">
        {error || "Loading your workspace."}
      </div>
    );
  }

  if (!desk.profile) {
    return (
      <Empty title="No answers yet" body="The triage is how CNSTRCT learns what fits you." href="/triage" label="Start the questions" />
    );
  }

  if (!desk.business || !agent) {
    return (
      <Empty title="No business yet" body="Pick the live home-services path to generate a site and wake the agents." href="/opportunities" label="See the three paths" />
    );
  }

  const tokenUsed = desk.agents.reduce((sum, item) => sum + item.tokensUsed, 0);
  const tokenCap = desk.limits.tokens * Math.max(desk.agents.length, 1);
  const tokenPct = Math.min(100, Math.round((tokenUsed / tokenCap) * 100));
  const specialists = desk.agents.filter((item) => item.role !== "orchestrator");

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border px-4 py-3 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Wordmark />
          <div className="text-right">
            <p className="font-medium">{desk.business.name}</p>
            <Link href={`/b/${desk.business.slug}`} className="text-sm text-accent">
              Open the public site
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <Badge>{desk.modelMode === "mock" ? "Mock model" : desk.modelMode === "xai" ? "Grok" : "OpenAI"}</Badge>
          <span>
            {desk.connections.apps.map((item) => `${item.toolkit} ${item.state.replaceAll("_", " ")}`).join(", ") || "No connections"}
          </span>
          <Link href="/command-center" className="underline">
            Command center
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Meter label={`${tokenUsed.toLocaleString()} tokens across the desk`} value={tokenPct} />
          {specialists.map((item) => (
            <Meter
              key={item.id}
              label={`${item.name} ${(item.computerSeconds / 3600).toFixed(2)} of 2.00 computer hours`}
              value={Math.min(100, Math.round((item.computerSeconds / desk.limits.computerSeconds) * 100))}
            />
          ))}
        </div>
      </header>
      <div className="flex gap-2 px-4 pt-3 md:hidden md:px-8">
        {(["chat", "team", "desk"] as const).map((item) => (
          <button key={item} type="button" className={`rounded-none px-3 py-1 text-sm ${tab === item ? "bg-foreground text-white" : "bg-card"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>
      <main className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <section className={`flex min-h-[60vh] flex-col rounded-[28px] border border-border bg-card ${tab === "chat" ? "" : "hidden md:flex"}`}>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {desk.agents.flatMap((item) =>
              item.rows
                .filter((row) => row.kind === "card" && row.body.status === "pending")
                .map((row) => (
                  <RowView
                    key={row.id}
                    row={row}
                    agentId={item.id}
                    busy={busy}
                    onDecide={(id, decision, draft) => void decide(item.id, id, decision, draft)}
                  />
                )),
            )}
            {agent.rows
              .filter((row) => !(row.kind === "card" && row.body.status === "pending"))
              .map((row) => (
                <RowView key={row.id} row={row} agentId={agent.id} busy={busy} onDecide={(id, decision, draft) => void decide(agent.id, id, decision, draft)} />
              ))}
          </div>
          <form
            className="border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <p className="mb-2 text-xs text-muted">You talk to {agent.name} only. A new message closes every open approval and delegated task on this desk.</p>
            <div className="flex gap-2">
              <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`Message ${agent.name}`} className="min-h-12" />
              <Button type="submit" disabled={busy}>
                Send
              </Button>
            </div>
          </form>
        </section>
        <aside className={`space-y-4 ${tab === "chat" ? "hidden md:block" : ""}`}>
          <section className={`rounded-[28px] border border-border bg-card p-4 ${tab === "desk" ? "hidden md:block" : ""}`}>
            <h2 className="font-medium">Team</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {desk.agents.map((item) => (
                <li key={item.id}>
                  <p className="font-medium">
                    {item.name} <span className="font-normal text-muted">{item.role}</span>
                  </p>
                  <p className="text-muted">{item.specialty || item.title}</p>
                  <p className="text-xs text-muted">{item.status}</p>
                </li>
              ))}
            </ul>
            {desk.tasks.length ? (
              <ul className="mt-4 space-y-2 text-xs text-muted">
                {desk.tasks.slice(0, 4).map((task) => (
                  <li key={task.id}>
                    Task {task.status.replaceAll("_", " ")}: {task.instruction.slice(0, 80)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted">No delegated tasks yet.</p>
            )}
          </section>
          <section className={`rounded-[28px] border border-border bg-card p-4 ${tab === "team" ? "hidden md:block" : ""}`}>
            <h2 className="font-medium">Connections</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {desk.connections.apps.map((item) => (
                <li key={item.toolkit}>
                  <p className="font-medium capitalize">{item.toolkit}</p>
                  <p className="text-muted">{item.state.replaceAll("_", " ")}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Gmail send is not available in this MVP. An approved draft stays in the local outbox and is not sent.</p>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {desk.connections.scopes.map((scope) => (
                <li key={scope.role}>
                  {scope.role}: {scope.tools.length ? scope.tools.join(", ") : "no Composio tools"} ({scope.session})
                </li>
              ))}
            </ul>
          </section>
          <section className={`rounded-[28px] border border-border bg-card p-4 ${tab === "team" ? "hidden md:block" : ""}`}>
            <h2 className="font-medium">Computers</h2>
            <ul className="mt-3 space-y-4 text-sm">
              {desk.computers.map((computer) => (
                <li key={computer.agentId}>
                  <p className="font-medium">
                    {computer.name}{" "}
                    <span className="font-normal text-muted">{computer.size === "none" ? "no machine" : computer.size}</span>
                  </p>
                  <p className="text-muted">
                    {computer.size === "none" ? "No Orgo computer" : `Orgo ${computer.state.replaceAll("_", " ")}`}
                  </p>
                  <p className="text-xs text-muted">{computer.localNote}</p>
                  <p className="text-xs text-muted">
                    {(computer.computerSeconds / 3600).toFixed(2)} computer hours · {computer.tokensUsed.toLocaleString()} tokens
                  </p>
                  <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-muted">{computer.terminal || "(no command output yet)"}</pre>
                  <p className="text-xs text-muted">{computer.files.length ? computer.files.map((file) => file.path).join(", ") : "No files yet."}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[28px] border border-border bg-card p-4">
            <h2 className="font-medium">Routines</h2>
            <p className="mt-1 text-xs text-muted">Planned only. Nothing runs until you queue it.</p>
            <ul className="mt-3 space-y-3">
              {desk.agents.flatMap((item) =>
                item.routines.map((routine) => (
                  <li key={routine.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p>
                        {routine.name} <span className="text-muted">{item.name}</span>
                      </p>
                      <p className="text-xs text-muted">{routine.scheduleLabel} · planned</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runRoutine(item.id, routine.id)}>
                      Queue
                    </Button>
                  </li>
                )),
              )}
            </ul>
          </section>
          <section className="rounded-[28px] border border-border bg-card p-4">
            <h2 className="font-medium">Audit</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {desk.audit.length
                ? desk.audit.map((event) => (
                    <li key={event.id}>
                      {event.summary}
                      {event.refId ? ` [${event.refId}]` : ""}
                    </li>
                  ))
                : <li>No audit events yet.</li>}
            </ul>
          </section>
          <section className="rounded-[28px] border border-border bg-card p-4">
            <h2 className="font-medium">Leads</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {desk.leads.map((lead) => (
                <li key={lead.id}>
                  <p className="font-medium">
                    {lead.name} <span className="font-normal text-muted">({lead.source})</span>
                  </p>
                  <p className="text-muted">
                    {lead.service} at {lead.address}
                  </p>
                </li>
              ))}
              {desk.leads.length === 0 ? <li className="text-muted">No requests yet. The public form adds them here.</li> : null}
            </ul>
          </section>
        </aside>
      </main>
      {error ? <p className="px-8 pb-4 text-sm text-danger">{error}</p> : null}
      <div className="px-4 pb-8 md:px-8">
        <Button type="button" variant="ghost" onClick={() => void reset()}>
          {confirmReset ? "Click again to clear this business" : "Start over this business"}
        </Button>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Empty({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <div className="grid min-h-full place-items-center px-6">
      <div className="max-w-md text-center">
        <Wordmark />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href={href}>{label}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({
  row,
  busy,
  onDecide,
}: {
  row: DeskPayload["agents"][number]["rows"][number];
  agentId: string;
  busy: boolean;
  onDecide: (id: string, decision: "allow" | "deny" | "edit", draft?: Record<string, string>) => void;
}) {
  const args = (row.body.args ?? {}) as Record<string, unknown>;
  const pending = row.body.status === "pending";
  const tool = String(row.body.tool ?? "");
  const editable = tool === "send_outreach" || tool === "send_match" || tool === "shell";
  const original = String(args.body ?? args.command ?? "");
  const [draft, setDraft] = useState(original);
  const draftKey = tool === "shell" ? "command" : "body";
  const choice = approvalChoice(original, draft);
  return (
    <article className="rounded-3xl border border-accent/40 bg-accent-soft p-4">
      <p className="font-medium">{String(row.body.title ?? "Approval")}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {Object.entries(args).map(([key, value]) =>
          pending && editable && key === draftKey ? null : (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-muted">{key}</dt>
              <dd className="whitespace-pre-wrap">{String(value)}</dd>
            </div>
          ),
        )}
      </dl>
      {pending && editable ? (
        <Textarea className="mt-3 min-h-24" value={draft} onChange={(event) => setDraft(event.target.value)} />
      ) : null}
      {pending && choice.dirty ? (
        <p className="mt-2 text-xs text-muted">This draft changed. Approve is off so the original is not run by mistake.</p>
      ) : null}
      {pending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={busy || (editable && !choice.approveEnabled)} onClick={() => onDecide(String(row.body.approvalId), "allow")}>
            Approve
          </Button>
          {editable ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy || !choice.editEnabled}
              onClick={() => onDecide(String(row.body.approvalId), "edit", { [draftKey]: draft, ...(args.to ? { to: String(args.to) } : {}), ...(args.subject ? { subject: String(args.subject) } : {}) })}
            >
              Approve edited draft
            </Button>
          ) : null}
          <Button type="button" variant="danger" disabled={busy} onClick={() => onDecide(String(row.body.approvalId), "deny")}>
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Status: {String(row.body.status)}</p>
      )}
    </article>
  );
}

function RowView({
  row,
  agentId,
  busy,
  onDecide,
}: {
  row: DeskPayload["agents"][number]["rows"][number];
  agentId: string;
  busy: boolean;
  onDecide: (id: string, decision: "allow" | "deny" | "edit", draft?: Record<string, string>) => void;
}) {
  if (row.kind === "message") {
    const mine = row.body.role === "user";
    return (
      <p className={`max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-6 ${mine ? "ml-auto bg-foreground text-white" : "bg-white"}`}>
        {String(row.body.text ?? "")}
      </p>
    );
  }
  if (row.kind === "tool-call" && (row.body.status === "done" || row.body.status === "error")) return null;
  if (row.kind === "tool-call" || row.kind === "tool-result" || row.kind === "event" || row.kind === "notice") {
    const label =
      row.kind === "event"
        ? String(row.body.text ?? "Routine")
        : row.kind === "notice"
          ? String(row.body.text ?? "")
          : `${String(row.body.name || row.body.tool || "tool")} · ${String(row.body.status || row.body.summary || "")}`;
    return <p className="text-xs text-muted">{label}</p>;
  }
  if (row.kind === "card") {
    return <ApprovalCard row={row} agentId={agentId} busy={busy} onDecide={onDecide} />;
  }
  return null;
}
