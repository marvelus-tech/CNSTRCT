import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { authMode } from "./auth-mode";
import { AUTH_FLAG_COOKIE, SESSION_COOKIE } from "./auth-constants";
import { newId } from "./ids";
import { createSession, createUser, deleteSessionsForUserExcept, userForSession } from "./store";
import type { User } from "./types";

export { AUTH_FLAG_COOKIE, SESSION_COOKIE } from "./auth-constants";

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  return await userForSession(sid);
}

export async function ensureDemoUser(): Promise<User> {
  if (authMode() === "supabase" && process.env.VERCEL === "1") {
    throw new Error("Demo users are disabled when Supabase auth is configured on Vercel.");
  }
  const existing = await currentUser();
  if (existing) return existing;
  const stamp = newId("demo");
  const user = await createUser({ email: `${stamp}@cnstrct.local`, name: "Demo owner" });
  const sid = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return user;
}

export async function requireUser(): Promise<User | null> {
  return await currentUser();
}

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export function writeSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions);
}

/** Demo sign-in: returns the user and session id; mirror sid on NextResponse so the browser gets Set-Cookie. */
export async function ensureDemoSession(): Promise<{ user: User; sessionId: string }> {
  const user = await ensureDemoUser();
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) throw new Error("Session missing after ensureDemoUser");
  return { user, sessionId };
}

/** Issue a fresh session and optionally retire other devices (magic link login). */
export async function startSession(user: User, options?: { rotateOthers?: boolean }) {
  const sid = await createSession(user.id);
  if (options?.rotateOthers) {
    await deleteSessionsForUserExcept(user.id, sid);
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
