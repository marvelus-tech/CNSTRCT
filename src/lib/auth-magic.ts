import { allowMagicLinkIssue } from "./auth-rate-limit";
import { sendMagicLink } from "./supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function issueMagicLink(email: string, origin: string, rateKey: string) {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false as const, status: 400, error: "Enter a valid email address." };
  }
  if (!allowMagicLinkIssue(rateKey)) {
    return { ok: false as const, status: 429, error: "Too many attempts. Wait a minute and try again." };
  }
  const result = await sendMagicLink(normalized, origin);
  if (!result.ok && result.reason === "unconfigured") {
    return {
      ok: false as const,
      status: 400,
      error: "Magic links need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }
  if (!result.ok) {
    return { ok: false as const, status: 502, error: "The email provider rejected that request." };
  }
  return { ok: true as const };
}