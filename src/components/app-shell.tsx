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

function NavButton({
  item,
  active,
  onNavigate,
  layout,
}: {
  item: (typeof NAV)[number];
  active: ShellSection;
  onNavigate: (section: ShellSection) => void;
  layout: "rail" | "tab";
}) {
  const isActive = active === item.id;
  if (layout === "tab") {
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavigate(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors sm:text-xs",
          isActive ? "text-white" : "text-white/55 hover:text-white/85",
        )}
      >
        <NavIcon kind={item.id} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }
  return (
    <button
      key={item.id}
      type="button"
      onClick={() => onNavigate(item.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-sm transition-colors",
        isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
      )}
    >
      <NavIcon kind={item.id} />
      {item.label}
    </button>
  );
}

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
    <div className="flex min-h-[100dvh] bg-background md:min-h-screen">
      <aside className="hidden w-[240px] shrink-0 flex-col bg-[#0a0a0a] text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5 [&_a]:text-white">
          <Wordmark href="/command-center" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map((item) => (
            <NavButton key={item.id} item={item} active={active} onNavigate={onNavigate} layout="rail" />
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
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <Wordmark href="/command-center" />
            {title ? <p className="truncate text-sm font-semibold text-foreground">{title}</p> : null}
          </div>
        </header>
        {title ? (
          <header className="hidden border-b border-border px-6 py-4 md:block md:px-10">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          </header>
        ) : null}
        <main className="flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-4 md:px-10 md:pb-16 md:pt-6">
          {children}
        </main>
      </div>
      <nav
        aria-label="Command center sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[#0a0a0a] pb-[env(safe-area-inset-bottom,0px)] text-white md:hidden"
      >
        <div className="flex w-full">
          {NAV.map((item) => (
            <NavButton key={item.id} item={item} active={active} onNavigate={onNavigate} layout="tab" />
          ))}
        </div>
      </nav>
    </div>
  );
}