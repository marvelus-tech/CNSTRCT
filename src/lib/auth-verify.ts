import type { NextResponse } from "next/server";

import { AUTH_FLAG_COOKIE } from "./auth-constants";
import { writeSessionCookie } from "./session";
import { createSession, deleteSessionsForUserExcept, upsertUserForAuth } from "./store";
import { verifyMagicLink } from "./supabase";

export async function completeMagicLinkAuth(
  tokenHash: string,
  type: string,
): Promise<{ ok: true; response: NextResponse } | { ok: false; status: number; error: string }> {
  const { NextResponse } = await import("next/server");
  const result = await verifyMagicLink(tokenHash, type || "magiclink");
  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      error: result.reason === "unconfigured" ? "Supabase keys are not set." : "That link could not be verified.",
    };
  }
  const user = await upsertUserForAuth({
    email: result.email,
    name: result.email.split("@")[0] || "Owner",
    authSubject: result.authSubject,
  });
  const sessionId = await createSession(user.id);
  await deleteSessionsForUserExcept(user.id, sessionId);
  const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  writeSessionCookie(response, sessionId);
  response.cookies.set(AUTH_FLAG_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true, response };
}