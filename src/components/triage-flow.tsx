"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DottedArrowBack } from "@/components/ui/dotted-arrow-back";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wordmark } from "@/components/wordmark";
import { QUESTIONS } from "@/lib/questions";
import { loadTriageDraft, saveTriageDraft, type TriageDraft } from "@/lib/triage-draft";
import { cn } from "@/lib/utils";

export function TriageFlow({ magicLinkEnabled = false }: { magicLinkEnabled?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TriageDraft>({});
  const [error, setError] = useState("");
  const [magic, setMagic] = useState("");
  const [magicNote, setMagicNote] = useState("");
  const [saving, setSaving] = useState(false);
  const question = QUESTIONS[step]!;

  useEffect(() => {
    const stored = loadTriageDraft();
    if (stored) setDraft(stored);
  }, []);

  useEffect(() => {
    if (Object.keys(draft).length > 0) saveTriageDraft(draft);
  }, [draft]);

  function buttonLabel() {
    if (saving) return "Saving";
    const optionalEmpty = "optional" in question && question.optional && !(draft[question.id] ?? "").trim();
    if (optionalEmpty) return "Skip";
    if (step === QUESTIONS.length - 1) return "See your options";
    return "Continue";
  }

  function valueOk() {
    if (question.kind === "idea") return draft.hasIdea === "yes" || draft.hasIdea === "no";
    if (question.kind === "choice") return Boolean(draft[question.id]);
    if ("optional" in question && question.optional) return true;
    return (draft[question.id] ?? "").trim().length > 1;
  }

  function finish(next: TriageDraft) {
    setSaving(true);
    setError("");
    saveTriageDraft(next);
    setSaving(false);
    router.push("/opportunities");
  }

  async function next() {
    if (!valueOk()) {
      setError("Add an answer to continue.");
      return;
    }
    setError("");
    if (step === QUESTIONS.length - 1) {
      finish(draft);
      return;
    }
    setStep((current) => current + 1);
  }

  async function sendMagic(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: magic }),
    });
    const json = (await response.json()) as { error?: string; ok?: boolean };
    setMagicNote(json.ok ? "Check that inbox for the link." : json.error || "Magic link is not configured. Use Log in from the home page.");
  }

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Wordmark />
        <p className="hud-readout shrink-0 text-muted">
          {step + 1} of {QUESTIONS.length}
        </p>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-col justify-start px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:min-h-[70vh] sm:justify-center sm:px-5 sm:pb-16 sm:pt-0">
        <div className="rise">
          <h1 className="text-[1.65rem] font-semibold leading-snug tracking-tight sm:text-4xl sm:leading-tight">
            {question.prompt}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{question.hint}</p>
          <div className="mt-8 grid gap-3">
            {question.kind === "text" ? (
              <Textarea
                value={draft[question.id] ?? ""}
                placeholder={question.placeholder}
                onChange={(event) => setDraft({ ...draft, [question.id]: event.target.value })}
              />
            ) : null}
            {question.kind === "choice"
              ? question.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, [question.id]: option.value })}
                    className={cn(
                      "choice-tile rounded-none",
                      draft[question.id] === option.value && "choice-tile--selected",
                    )}
                  >
                    {option.label}
                  </button>
                ))
              : null}
            {question.kind === "idea" ? (
              <>
                {["yes", "no"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft({ ...draft, hasIdea: value })}
                    className={cn("choice-tile rounded-none", draft.hasIdea === value && "choice-tile--selected")}
                  >
                    {value === "yes" ? "Yes, I have one" : "Not yet"}
                  </button>
                ))}
                {draft.hasIdea === "yes" ? (
                  <Input
                    value={draft.ideaText ?? ""}
                    placeholder="A cookie stand"
                    onChange={(event) => setDraft({ ...draft, ideaText: event.target.value })}
                  />
                ) : null}
              </>
            ) : null}
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <div className="mt-8 flex w-full items-center justify-between gap-3">
            <span className="inline-flex shrink-0 items-center p-[6px]">
              <DottedArrowBack
                type="button"
                className="!px-2 sm:!px-6"
                disabled={step === 0}
                onClick={() => setStep((current) => current - 1)}
              />
            </span>
            <Button type="button" className="min-w-0 shrink" onClick={() => void next()} disabled={saving}>
              {buttonLabel()}
            </Button>
          </div>
        </div>
        {magicLinkEnabled ? (
          <form
            onSubmit={sendMagic}
            className="mt-12 grid gap-3 border-t border-border pt-6 text-sm text-muted sm:mt-16"
          >
            <p>Sign in with a one-time link sent to your email.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Input
                type="email"
                value={magic}
                placeholder="you@example.com"
                className="w-full min-w-0"
                onChange={(event) => setMagic(event.target.value)}
                required
              />
              <Button type="submit" variant="outline" className="w-full shrink-0 sm:w-auto">
                Email me
              </Button>
            </div>
            {magicNote ? <p role="status">{magicNote}</p> : null}
          </form>
        ) : null}
      </main>
    </div>
  );
}