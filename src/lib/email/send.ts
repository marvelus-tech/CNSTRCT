import { emailConfigured, emailFromAddress } from "./config";
import { redactEmailAddress } from "./redact";

export type SendTransactionalInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tags?: { name: string; value: string }[];
};

export type SendTransactionalResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "invalid_to" | "provider_error"; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Test-only override for Resend HTTP (avoids mocking global fetch in parallel tests). */
export const resendTestState: { fetch: typeof fetch | undefined } = { fetch: undefined };

function resendFetch(input: RequestInfo | URL, init?: RequestInit) {
  return (resendTestState.fetch ?? fetch)(input, init);
}

export async function sendTransactional(input: SendTransactionalInput): Promise<SendTransactionalResult> {
  if (!emailConfigured()) {
    return { ok: false, reason: "not_configured" };
  }
  const to = input.to.trim();
  if (!EMAIL_RE.test(to)) {
    return { ok: false, reason: "invalid_to" };
  }
  const from = emailFromAddress();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!from || !apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  const response = await resendFetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[email] send failed", {
      to: redactEmailAddress(to),
      status: response.status,
      detail: body.slice(0, 200),
    });
    return { ok: false, reason: "provider_error", message: `Resend HTTP ${response.status}` };
  }

  const json = (await response.json()) as { id?: string };
  console.info("[email] sent", { to: redactEmailAddress(to), id: json.id ?? "unknown" });
  return { ok: true, id: json.id ?? "unknown" };
}