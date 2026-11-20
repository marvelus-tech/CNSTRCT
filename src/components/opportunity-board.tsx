"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { OpportunitySpaceField } from "@/components/opportunity-space-field";
import { draftToProfileBody, isTriageDraftComplete, loadTriageDraft } from "@/lib/triage-draft";
import Link from "next/link";

interface Card {
  id: string;
  live: boolean;
  title: string;
  pitch: string;
  name?: string;
  summary?: string;
}

const CARD_ICONS: Record<string, string> = {
  "home-services": "homeServices",
  "mobile-detailing": "detailing",
  "estate-clearance": "estate",
};

function CardIcon({ kind }: { kind: string }) {
  const stroke = "currentColor";
  if (kind === "homeServices") {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="text-foreground/80">
        <path d="M24 8L40 20V40H32V28H16V40H8V20L24 8Z" stroke={stroke} strokeWidth="1.25" />
        <path d="M20 40V32H28V40" stroke={stroke} strokeWidth="1.25" />
      </svg>
    );
  }
  if (kind === "detailing") {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="text-foreground/55">
        <circle cx="24" cy="24" r="14" stroke={stroke} strokeWidth="1.25" />
        <ellipse cx="24" cy="24" rx="14" ry="5" stroke={stroke} strokeWidth="1" />
        <path d="M24 10V38" stroke={stroke} strokeWidth="1" />
        <path d="M10 24H38" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="text-foreground/55">
      <rect x="12" y="10" width="24" height="28" rx="2" stroke={stroke} strokeWidth="1.25" />
      <path d="M16 18H32M16 24H28M16 30H24" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function ArrowLink({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OpportunityBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCommandCenter =
    searchParams.get("from") === "command-center" ||
    (typeof document !== "undefined" && document.referrer.includes("/command-center"));
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    void (async () => {
      const draft = loadTriageDraft();
      if (draft && isTriageDraftComplete(draft)) {
        const response = await fetch("/api/opportunities/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftToProfileBody(draft)),
        });
        const json = (await response.json()) as { cards?: Card[]; error?: string };
        if (!response.ok) {
          setError(json.error || "Could not load paths.");
          setCards([]);
          return;
        }
        setCards(json.cards ?? []);
        return;
      }

      const sessionRes = await fetch("/api/session");
      if (sessionRes.ok) {
        const response = await fetch("/api/opportunities");
        if (response.ok) {
          const json = (await response.json()) as { cards?: Card[]; error?: string };
          setCards(json.cards ?? []);
          return;
        }
      }

      setError("Answer the triage first.");
      setCards([]);
    })();
  }, []);

  async function openLive(templateId: string) {
    setOpening(true);
    setError("");
    const session = await fetch("/api/session");
    const target = `/constructing?template=${encodeURIComponent(templateId)}`;
    if (session.status === 401) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      setOpening(false);
      return;
    }
    const billingRes = await fetch("/api/billing/status");
    const billing = (await billingRes.json()) as {
      configured?: boolean;
      entitled?: boolean;
      paymentsMessage?: string | null;
    };
    if (!billing.configured) {
      setError(billing.paymentsMessage || "Payments are not configured yet.");
      setOpening(false);
      return;
    }
    if (!billing.entitled) {
      router.push(`/checkout?plan=starter&next=${encodeURIComponent(target)}`);
      setOpening(false);
      return;
    }
    router.push(target);
  }

  return (
    <div className="min-h-full bg-background">
      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
        <div className="flex items-center gap-4 text-sm text-muted">
          {fromCommandCenter ? (
            <Link href="/command-center" className="underline">
              Command center
            </Link>
          ) : null}
          <Link href="/triage" className="underline">
            Edit answers
          </Link>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Matched paths</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Three ways to start. Two are open today.</h1>
          <p className="mt-3 max-w-xl text-muted">Live paths are personalized from your answers. Estate clearance stays closed until a later template.</p>
        </div>
        {error ? (
          <p className="relative z-10 mt-6 text-sm text-danger">
            {error}{" "}
            {error.includes("triage") ? (
              <Link href="/triage" className="underline">
                Start the questions
              </Link>
            ) : null}
          </p>
        ) : null}

        <div className="relative mt-10 min-h-[420px] md:min-h-[380px]">
          <OpportunitySpaceField />
          <div className="relative z-10 grid gap-5 md:grid-cols-3">
            {(cards ?? []).map((card, index) => {
              const iconKey = CARD_ICONS[card.id] ?? "estate";
              const isLive = card.live;
              return (
                <article
                  key={card.id}
                  className={`opportunity-card rise flex min-h-[320px] flex-col border p-6 md:p-7 ${
                    isLive ? "opportunity-card--live" : "opportunity-card--soon"
                  }`}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <CardIcon kind={iconKey} />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        isLive ? "text-accent" : "text-muted"
                      }`}
                    >
                      {isLive ? "Live" : "Soon"}
                    </span>
                  </div>
                  <div className="mt-8 flex flex-1 flex-col">
                    <h2 className="text-sm font-semibold uppercase leading-snug tracking-[0.12em] text-foreground">
                      {card.name || card.title}
                    </h2>
                    <div
                      className={`mt-3 h-px w-full ${isLive ? "bg-foreground/15" : "bg-border"}`}
                      aria-hidden
                    />
                    <p className="mt-4 flex-1 text-sm leading-6 text-muted">{card.summary || card.pitch}</p>
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    {isLive ? (
                      <Button onClick={() => void openLive(card.id)} disabled={opening}>
                        {opening ? "Starting up…" : "Start this business"}
                      </Button>
                    ) : (
                      <p className="text-xs uppercase tracking-wide text-muted">Not selectable yet</p>
                    )}
                    {isLive ? <ArrowLink className="shrink-0 text-accent" /> : <ArrowLink className="shrink-0 text-muted/40" />}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        {cards === null ? <p className="relative z-10 mt-8 text-muted">Loading your three paths.</p> : null}
      </main>
    </div>
  );
}