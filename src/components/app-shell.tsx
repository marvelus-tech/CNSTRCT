"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export type ShellSection = "businesses" | "profile" | "settings";

function NavIcon({ kind }: { kind: ShellSection }) {
  const stroke = "currentColor";
  if (kind === "businesses") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="2" y="3" width="6" height="6" stroke={stroke} strokeWidth="1.25" />
        <rect x="10" y="3" width="6" height="6" stroke={stroke} strokeWidth="1.25" />
        <rect x="2" y="11" width="14" height="4" stroke={stroke} strokeWidth="1.25" />
      </svg>
    );
  }
  if (kind === "profile") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="6" r="3" stroke={stroke} strokeWidth="1.25" />
        <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.5" stroke={stroke} strokeWidth="1.25" />
      <path
        d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV: { id: ShellSection; label: string }[] = [
  { id: "businesses", label: "Businesses" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

export function AppShell({
  active,
  onNavigate,
  children,
  title,
}: {
  active: ShellSection;
  onNavigate: (section: ShellSection) => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [userLabel, setUserLabel] = useState("Guest");
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/session");
      if (!response.ok) return;
      const json = (await response.json()) as { user?: { name?: string; email?: string } };
      const name = json.user?.name?.trim() || "Demo owner";
      setUserLabel(name);
      const parts = name.split(/\s+/).filter(Boolean);
      const letters =
        parts.length >= 2
          ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`
          : (name.slice(0, 2) || "?");
      setInitials(letters.toUpperCase());
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-[240px] shrink-0 flex-col bg-[#0a0a0a] text-white">
        <div className="border-b border-white/10 px-5 py-5 [&_a]:text-white">
          <Wordmark href="/command-center" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-sm transition-colors",
                active === item.id ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              <NavIcon kind={item.id} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center bg-white/15 text-xs font-semibold uppercase tracking-wide">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userLabel}</p>
              <Link href="/" className="text-xs text-white/50 hover:text-white/80">
                Home
              </Link>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {title ? (
          <header className="border-b border-border px-6 py-4 md:px-10">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          </header>
        ) : null}
        <main className="flex-1 px-5 pb-16 pt-6 md:px-10">{children}</main>
      </div>
    </div>
  );
}