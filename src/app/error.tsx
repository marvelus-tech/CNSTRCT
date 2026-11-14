"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-xl px-5 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Something broke on this page.</h1>
      <p className="mt-4 text-muted">Your data is still saved. Try the page again, or go back home.</p>
      <div className="mt-6">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </main>
  );
}