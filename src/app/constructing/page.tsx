"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { syncTriageFromClient } from "@/lib/triage-sync";

const STEPS_BY_TEMPLATE: Record<string, readonly string[]> = {
  "home-services": [
    "Blueprint from your answers",
    "Public site and lead form",
    "Your founding bots",
    "Routines and approval cards",
  ],
  "mobile-detailing": [
    "Blueprint from your answers",
    "Public booking page and lead form",
    "Your founding bots",
    "Routines and approval cards",
  ],
};

const MIN_MS = 5000;
const IDEMPOTENCY_STORAGE = "cnstrct.construct.idempotency.v1";
const POLL_MS = 2500;

type ProvisionSummary = {
  provisionStatus?: string;
  jobs?: { provider: string; status: string }[];
};

function constructIdempotencyKey(template: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `construct:${template}:${crypto.randomUUID()}`;
  }
  return `construct:${template}:${Date.now()}`;
}

function provisionStatusCopy(status: string | undefined) {
  switch (status) {
    case "ready":
      return "Your workspace is ready.";
    case "failed":
      return "Provisioning needs a retry.";
    case "partial":
      return "Some providers need attention.";
    case "provisioning":
      return "Connecting Orgo, Treg, and Composio.";
    default:
      return "Setting up your workspace.";
  }
}

function ConstructingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const template = params.get("template") || "home-services";
  const steps = STEPS_BY_TEMPLATE[template] ?? STEPS_BY_TEMPLATE["home-services"]!;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [paywallCode, setPaywallCode] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [provisionStatus, setProvisionStatus] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);

  const pollProvision = useCallback(async (id: string) => {
    const response = await fetch(`/api/businesses/${id}/provision`);
    if (!response.ok) return null;
    return (await response.json()) as ProvisionSummary;
  }, []);

  useEffect(() => {
    if (!businessId) return undefined;
    let cancelled = false;

    const tick = async () => {
      const summary = await pollProvision(businessId);
      if (cancelled || !summary) return;
      setProvisionStatus(summary.provisionStatus);
      if (summary.provisionStatus === "ready") {
        try {
          sessionStorage.removeItem(IDEMPOTENCY_STORAGE);
        } catch {
          // ignore
        }
        router.replace(`/command-center?new=${businessId}`);
        return;
      }
      if (summary.provisionStatus === "failed" || summary.provisionStatus === "partial") {
        return;
      }
    };

    void tick();
    const interval = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [businessId, pollProvision, router]);

  async function handleRetry() {
    if (!businessId) return;
    setRetrying(true);
    setError("");
    try {
      await fetch(`/api/businesses/${businessId}/provision`, { method: "POST" });
      const summary = await pollProvision(businessId);
      setProvisionStatus(summary?.provisionStatus);
    } catch {
      setError("Retry failed. Try again in a moment.");
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    const started = Date.now();
    let cancelled = false;

    const advance = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }, 900);

    async function provision() {
      const sync = await syncTriageFromClient();
      if (!sync.ok) {
        window.clearInterval(advance);
        if (!cancelled) setError(sync.error || "Could not save your triage answers.");
        return;
      }

      let idempotencyKey = "";
      try {
        idempotencyKey = sessionStorage.getItem(IDEMPOTENCY_STORAGE) ?? "";
        if (!idempotencyKey) {
          idempotencyKey = constructIdempotencyKey(template);
          sessionStorage.setItem(IDEMPOTENCY_STORAGE, idempotencyKey);
        }
      } catch {
        idempotencyKey = constructIdempotencyKey(template);
      }

      const response = await fetch("/api/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ templateId: template }),
      });
      const json = (await response.json()) as { businessId?: string; error?: string; code?: string };
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_MS - elapsed);
      await new Promise((resolve) => window.setTimeout(resolve, wait));
      window.clearInterval(advance);
      if (cancelled) return;
      if (!response.ok || !json.businessId) {
        setError(json.error || "Could not construct this business.");
        setPaywallCode(json.code || "");
        return;
      }
      setStep(steps.length - 1);
      setBusinessId(json.businessId);
      setProvisionStatus("pending");
    }

    void provision();
    return () => {
      cancelled = true;
      window.clearInterval(advance);
    };
  }, [template, steps.length]);

  const showRetry =
    businessId && (provisionStatus === "failed" || provisionStatus === "partial" || provisionStatus === "provisioning");

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-lg px-5 pb-16 pt-16 text-center">
        <p className="text-sm font-medium text-accent">Constructing</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">Your business is taking shape</h1>
        <p className="mt-3 text-sm text-muted">
          {businessId ? provisionStatusCopy(provisionStatus) : "This usually takes a few seconds. Then you land in your command center."}
        </p>
        <ul className="mt-12 space-y-4 text-left text-sm">
          {steps.map((label, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-none border px-4 py-3 ${active ? "border-accent bg-card" : "border-border"} ${done ? "text-foreground" : "text-muted"}`}
              >
                <span className={`size-2 shrink-0 rounded-full ${done || active ? "bg-accent" : "bg-border"}`} />
                {label}
              </li>
            );
          })}
        </ul>
        {showRetry ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button variant="outline" disabled={retrying} onClick={() => void handleRetry()}>
              {retrying ? "Retrying…" : "Retry provisioning"}
            </Button>
            <Link href={`/command-center?new=${businessId}`} className="text-sm text-muted underline">
              Open command center anyway
            </Link>
          </div>
        ) : null}
        {error ? (
          <p className="mt-8 text-sm text-danger">
            {error}{" "}
            {paywallCode === "payment_required" ? (
              <Link
                href={`/checkout?plan=starter&next=${encodeURIComponent(`/constructing?template=${template}`)}`}
                className="underline"
              >
                Choose a plan
              </Link>
            ) : paywallCode === "plan_limit" ? (
              <Link href={`/checkout?plan=pro&next=${encodeURIComponent("/command-center")}`} className="underline">
                Upgrade to Pro
              </Link>
            ) : (
              <Link href="/opportunities" className="underline">
                Back to paths
              </Link>
            )}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default function ConstructingPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <ConstructingInner />
    </Suspense>
  );
}