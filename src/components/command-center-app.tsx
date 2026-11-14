"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

interface BusinessRow {
  id: string;
  name: string;
  city: string;
  templateTitle: string;
  sitePath: string;
  createdAt: number;
}

function CommandCenterInner() {
  const params = useSearchParams();
  const highlightId = params.get("new");
  const highlightRef = useRef<HTMLLIElement | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/businesses");
      if (response.status === 401) {
        setError("Sign in to open your command center.");
        setBusinesses([]);
        return;
      }
      const json = (await response.json()) as { businesses?: BusinessRow[]; error?: string };
      if (!response.ok) {
        setError(json.error || "Could not load businesses.");
        setBusinesses([]);
        return;
      }
      setBusinesses(json.businesses ?? []);
    })();
  }, []);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightId, businesses]);

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
        <Link href="/opportunities" className="text-sm text-muted">
          Start another path
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Command center</h1>
        <p className="mt-3 max-w-xl text-muted">Every business you construct lives here. Open one to chat with its agents.</p>
        {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
        {businesses === null ? <p className="mt-8 text-muted">Loading your businesses.</p> : null}
        {businesses?.length === 0 && !error ? (
          <div className="mt-10 rounded-none border border-border bg-card p-8">
            <p className="text-sm text-muted">No businesses yet.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/triage">
                <Button variant="outline">Answer triage</Button>
              </Link>
              <Link href="/opportunities">
                <Button>Pick a live path</Button>
              </Link>
            </div>
          </div>
        ) : null}
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {(businesses ?? []).map((business) => {
            const highlight = business.id === highlightId;
            return (
              <li
                key={business.id}
                ref={highlight ? highlightRef : undefined}
                className={`flex flex-col rounded-none border p-5 ${highlight ? "border-accent bg-card ring-1 ring-accent/30" : "border-border bg-card/90"}`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{business.templateTitle}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{business.name}</h2>
                <p className="mt-1 text-sm text-muted">{business.city}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href={`/workspace/${business.id}`}>
                    <Button>Open workspace</Button>
                  </Link>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={business.sitePath}>Public site</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

export function CommandCenterApp() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <CommandCenterInner />
    </Suspense>
  );
}