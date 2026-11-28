import { allowMagicLinkIssue } from "./auth-rate-limit";
import { sendMagicLink } from "./supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SEND_FAILURE =
  "We could not send an email to that address. Try a different email or contact support if this continues.";

/** Map Supabase/provider OTP errors to plain language for the login UI. */
export function friendlyMagicLinkProviderError(detail?: string): string {
  const tryText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("too many")) {
      return "Too many attempts. Wait a minute and try again.";
    }
    if (lower.includes("signup") && lower.includes("disabled")) {
      return "Sign-in is not open for new addresses on this site yet. Contact support if you need access.";
    }
    if (lower.includes("invalid") && lower.includes("email")) {
      return "Enter a valid email address.";
    }
    if (lower.includes("email address is invalid") || lower.includes("unable to validate email")) {
      return "Enter a valid email address.";
    }
    return null;
  };

  if (!detail?.trim()) return DEFAULT_SEND_FAILURE;

  const direct = tryText(detail);
  if (direct) return direct;

  try {
    const parsed = JSON.parse(detail) as {
      msg?: string;
      message?: string;
      error_description?: string;
      error?: string;
    };
    const combined = [parsed.msg, parsed.message, parsed.error_description, parsed.error].filter(Boolean).join(" ");
    const fromJson = tryText(combined);
    if (fromJson) return fromJson;
  } catch {
    // plain text body from provider
  }

  return DEFAULT_SEND_FAILURE;
}

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
    const error =
      result.reason === "provider" ? friendlyMagicLinkProviderError(result.detail) : DEFAULT_SEND_FAILURE;
    const rateLimited = error === "Too many attempts. Wait a minute and try again.";
    return { ok: false as const, status: rateLimited ? 429 : 502, error };
  }
  return { ok: true as const };
}