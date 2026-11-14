import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-constants";

const PROTECTED_PREFIXES = ["/command-center", "/constructing", "/workspace", "/triage", "/opportunities"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (sid) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/command-center/:path*", "/constructing", "/workspace/:path*", "/triage", "/opportunities"],
};