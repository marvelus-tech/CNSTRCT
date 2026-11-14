"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/triage";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logIn() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/demo", { method: "POST" });
    const json = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(json.error || "Could not sign you in.");
      return;
    }
    router.replace(next.startsWith("/") ? next : "/triage");
  }

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
        <Link href="/" className="text-sm text-muted">
          Home
        </Link>
      </header>
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 pb-16">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Sign in to build</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          CNSTRCT is Lovable for real businesses. For this demo, one tap creates a session. No password yet.
        </p>
        <Button className="mt-10 w-full" size="lg" onClick={() => void logIn()} disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </Button>
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