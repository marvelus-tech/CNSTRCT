"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AppShell, type ShellSection } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

interface VentureSummary {
  city: string;
  interestsSnippet: string;
}

interface BusinessRow {
  id: string;
  name: string;
  city: string;
  templateTitle: string;
  sitePath: string;
  createdAt: number;
  ventureSummary?: VentureSummary | null;
  ventureProfile?: Profile | null;
}

const START_NEW_HREF = "/triage?intent=new";

function BusinessSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2].map((key) => (
        <div key={key} className="animate-pulse border border-border bg-card/40 p-5">
          <div className="h-3 w-24 bg-border" />
          <div className="mt-4 h-7 w-3/4 bg-border" />
          <div className="mt-2 h-4 w-1/3 bg-border" />
          <div className="mt-6 h-9 w-32 bg-border" />
        </div>
      ))}
    </div>
  );
}

function StartNewBusinessButton({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <Button size={size} asChild>
      <Link href={START_NEW_HREF}>Start new business</Link>
    </Button>
  );
}

function BusinessesPanel({
  highlightId,
  businesses,
  loading,
  error,
  highlightRef,
}: {
  highlightId: string | null;
  businesses: BusinessRow[] | null;
  loading: boolean;
  error: string;
  highlightRef: React.RefObject<HTMLLIElement | null>;
}) {
  if (loading) return <BusinessSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-none border border-border bg-card p-8 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/login?next=/command-center" className="mt-4 inline-block">
          <Button variant="outline">Log in</Button>
        </Link>
      </div>
    );
  }

  if (businesses?.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-none border border-border bg-card px-8 py-12 text-center">
        <p className="hud-readout text-[11px] uppercase tracking-[0.2em] text-muted">No businesses yet</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Your command center is ready</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Start a new business when you want a fresh question set, matched paths, and a live desk.
        </p>
        <div className="mt-8">
          <StartNewBusinessButton size="lg" />
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {(businesses ?? []).map((business) => {
        const highlight = business.id === highlightId;
        return (
          <li
            key={business.id}
            ref={highlight ? highlightRef : undefined}
            className={`flex flex-col rounded-none border p-5 transition-colors hover:border-foreground/25 ${
              highlight ? "border-accent bg-card ring-1 ring-accent/30" : "border-border bg-card/90"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{business.templateTitle}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{business.name}</h2>
            <p className="mt-1 text-sm text-muted">{business.city}</p>
            {business.ventureSummary?.interestsSnippet ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted">{business.ventureSummary.interestsSnippet}</p>
            ) : null}
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
  );
}

function ProfilePanel({
  ventureProfile,
  loading,
  hasBusinesses,
}: {
  ventureProfile: Profile | null;
  loading: boolean;
  hasBusinesses: boolean;
}) {
  if (loading) {
    return (
      <div className="max-w-xl animate-pulse space-y-3">
        <div className="h-4 w-40 bg-border" />
        <div className="h-20 w-full bg-border" />
        <div className="h-20 w-full bg-border" />
      </div>
    );
  }
  if (!ventureProfile) {
    return (
      <div className="max-w-xl rounded-none border border-border bg-card p-8">
        <p className="text-sm text-muted">
          {hasBusinesses
            ? "Older desks may not have a saved venture snapshot yet."
            : "No venture answers on file. Start a new business to capture triage for your first desk."}
        </p>
        <div className="mt-4">
          <StartNewBusinessButton />
        </div>
      </div>
    );
  }
  const rows: [string, string][] = [
    ["Interests", ventureProfile.interests],
    ["Skills", ventureProfile.skills],
    ["Location", ventureProfile.location],
    ["Space", ventureProfile.space],
    ["Capital", ventureProfile.capital],
    ["Trades", ventureProfile.trades],
    ["Constraints", ventureProfile.constraints || "—"],
    ["Idea", ventureProfile.hasIdea ? ventureProfile.ideaText || "Yes" : "Not yet"],
  ];
  return (
    <SummaryPanel
      title="Latest venture answers"
      rows={rows}
      footer={
        <Link href={START_NEW_HREF} className="text-sm text-accent underline">
          Start new business
        </Link>
      }
    />
  );
}

function SettingsPanel() {
  return (
    <SummaryPanel
      title="Settings"
      rows={[
        ["Environment", "Demo mode — sqlite on this host"],
        ["Auth", "Demo session or Supabase magic link when configured"],
      ]}
      footer={
        <Link href="/" className="text-sm text-muted underline">
          Back to marketing home
        </Link>
      }
    />
  );
}

function SummaryPanel({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: [string, string][];
  footer?: React.ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <dl className="mt-6 divide-y divide-border border border-border bg-card">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}

function CommandCenterInner() {
  const params = useSearchParams();
  const highlightId = params.get("new");
  const highlightRef = useRef<HTMLLIElement | null>(null);
  const [section, setSection] = useState<ShellSection>("businesses");
  const [businesses, setBusinesses] = useState<BusinessRow[] | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/businesses");
      if (response.status === 401) {
        setError("Sign in to open your command center.");
        setBusinesses([]);
        setBizLoading(false);
        return;
      }
      const json = (await response.json()) as { businesses?: BusinessRow[]; error?: string };
      if (!response.ok) {
        setError(json.error || "Could not load businesses.");
        setBusinesses([]);
      } else {
        setBusinesses(json.businesses ?? []);
      }
      setBizLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightId, businesses]);

  const latestVentureProfile =
    (businesses ?? []).find((row) => row.ventureProfile)?.ventureProfile ?? null;

  const titles: Record<ShellSection, string> = {
    businesses: "Command center",
    profile: "Profile",
    settings: "Settings",
  };

  return (
    <AppShell active={section} onNavigate={setSection} title={titles[section]}>
      {section === "businesses" ? (
        <>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-xl text-muted">Every business you construct lives here. Open one to chat with its agents.</p>
            <StartNewBusinessButton />
          </div>
          <BusinessesPanel
            highlightId={highlightId}
            businesses={businesses}
            loading={bizLoading}
            error={error}
            highlightRef={highlightRef}
          />
          {(businesses?.length ?? 0) > 0 ? (
            <div className="mt-8 flex justify-end">
              <StartNewBusinessButton />
            </div>
          ) : null}
        </>
      ) : null}
      {section === "profile" ? (
        <ProfilePanel ventureProfile={latestVentureProfile} loading={bizLoading} hasBusinesses={(businesses?.length ?? 0) > 0} />
      ) : null}
      {section === "settings" ? <SettingsPanel /> : null}
    </AppShell>
  );
}

export function CommandCenterApp() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <CommandCenterInner />
    </Suspense>
  );
}