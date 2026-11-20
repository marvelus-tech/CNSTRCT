"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  label: string;
  initials: string;
};

let cached: SessionUser | null = null;
let inflight: Promise<SessionUser> | null = null;

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`
      : (name.slice(0, 2) || "?");
  return letters.toUpperCase();
}

async function loadSessionUser(): Promise<SessionUser> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const fallback: SessionUser = { label: "Guest", initials: "?" };
    try {
      const response = await fetch("/api/session");
      if (!response.ok) {
        cached = fallback;
        return fallback;
      }
      const json = (await response.json()) as { user?: { name?: string; email?: string } };
      const name = json.user?.name?.trim() || "Demo owner";
      cached = { label: name, initials: initialsFromName(name) };
      return cached;
    } catch {
      cached = fallback;
      return fallback;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Shared session label for shell chrome; dedupes concurrent fetches. */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(cached);
  useEffect(() => {
    void loadSessionUser().then(setUser);
  }, []);
  return user;
}