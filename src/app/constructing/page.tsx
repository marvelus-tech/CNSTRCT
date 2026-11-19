"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { syncTriageFromClient } from "@/lib/triage-sync";

const STEPS_BY_TEMPLATE: Record<string, readonly string[]> = {
  "home-services": [
    "Blueprint from your answers",
    "Public site and lead form",
    "Agents Mara and Jules",
    "Routines and approval cards",
  ],
  "mobile-detailing": [
    "Blueprint from your answers",
    "Public booking page and lead form",
    "Agents Riley and Sam",
    "Routines and approval cards",
  ],
};

const MIN_MS = 5000;

function ConstructingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const template = params.get("template") || "home-services";
  const steps = STEPS_BY_TEMPLATE[template] ?? STEPS_BY_TEMPLATE["home-services"]!;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

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

      const response = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template }),
      });
      const json = (await response.json()) as { businessId?: string; error?: string };
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_MS - elapsed);
      await new Promise((resolve) => window.setTimeout(resolve, wait));
      window.clearInterval(advance);
      if (cancelled) return;
      if (!response.ok || !json.businessId) {
        setError(json.error || "Could not construct this business.");
        return;
      }
      setStep(steps.length - 1);
      router.replace(`/command-center?new=${json.businessId}`);
    }

    void provision();
    return () => {
      cancelled = true;
      window.clearInterval(advance);
    };
  }, [router, template, steps.length]);

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-lg px-5 pb-16 pt-16 text-center">
        <p className="text-sm font-medium text-accent">Constructing</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">Your business is taking shape</h1>
        <p className="mt-3 text-sm text-muted">This usually takes a few seconds. Then you land in your command center.</p>
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
        {error ? (
          <p className="mt-8 text-sm text-danger">
            {error}{" "}
            <Link href="/opportunities" className="underline">
              Back to paths
            </Link>
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