"use client";

import Link from "next/link";
import { useSessionUser } from "@/lib/use-session-user";
import { cn } from "@/lib/utils";

export function SessionUserChip({
  className,
  homeHref = "/",
}: {
  className?: string;
  homeHref?: string;
}) {
  const user = useSessionUser();
  const label = user?.label ?? "Guest";
  const initials = user?.initials ?? "?";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center bg-white/15 text-xs font-semibold uppercase tracking-wide text-white">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{label}</p>
        <Link href={homeHref} className="text-xs text-white/50 hover:text-white/80">
          Home
        </Link>
      </div>
    </div>
  );
}

/** Account row for Profile on narrow viewports (light theme). */
export function SessionUserAccountRow({ className }: { className?: string }) {
  const user = useSessionUser();
  const label = user?.label ?? "Guest";
  const initials = user?.initials ?? "?";

  return (
    <div className={cn("mb-6 flex items-center gap-3 border border-border bg-card px-4 py-3 lg:hidden", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center bg-foreground/10 text-xs font-semibold uppercase tracking-wide text-foreground">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <Link href="/" className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}