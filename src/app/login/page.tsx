"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { syncTriageFromClient } from "@/lib/triage-sync";
import { Wordmark } from "@/components/wordmark";

function supabaseConfiguredClient() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/command-center";
  const loginError = params.get("error");
  const magicAvailable = useMemo(() => supabaseConfiguredClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(loginError ?? "");
  const [sent, setSent] = useState(false);

  async function afterSignIn() {
    if (next.startsWith("/constructing")) {
      const sync = await syncTriageFromClient();
      if (!sync.ok) {
        setBusy(false);
        setError(sync.error || "Signed in but could not save triage answers.");
        return;
      }
    }
    setBusy(false);
    router.replace(next.startsWith("/") ? next : "/command-center");
  }

  async function sendMagicLink() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setBusy(false);
      setError(json.error || "Could not send that link.");
      return;
    }
    setBusy(false);
    setSent(true);
  }

  async function logInDemo() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/demo", { method: "POST" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setBusy(false);
      setError(json.error || "Could not sign you in.");
      return;
    }
    await afterSignIn();
  }

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
        <Link href="/" className="text-sm text-muted">
          Home
        </Link>
      </header>
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:pb-16">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Sign in to build</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Sign in to open your command center. Start a new business from there when you are ready for triage and a live path.
        </p>

        {sent ? (
          <div className="mt-10 rounded-none border border-border bg-card p-6">
            <p className="font-medium text-foreground">Check your email</p>
            <p className="mt-2 text-sm text-muted">
              We sent a sign-in link to <span className="text-foreground">{email}</span>. Open it on this device to continue.
            </p>
          </div>
        ) : magicAvailable ? (
          <form
            className="mt-10 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMagicLink();
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-border bg-background px-3 py-3 text-sm"
              placeholder="you@example.com"
            />
            <Button className="w-full" size="lg" type="submit" disabled={busy}>
              {busy ? "Sending link…" : "Send magic link"}
            </Button>
          </form>
        ) : (
          <Button className="mt-10 w-full" size="lg" onClick={() => void logInDemo()} disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </Button>
        )}

        {!magicAvailable ? null : (
          <p className="mt-6 text-center text-xs text-muted">
            Demo sign-in is only available when Supabase is not configured on this host.
          </p>
        )}

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}