import assert from "node:assert/strict";
import test from "node:test";

import { authMode, demoAuthAllowed } from "./auth-mode";

test("authMode is demo without Supabase public vars", () => {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.equal(authMode(), "demo");
  assert.equal(demoAuthAllowed(), true);
  if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
  if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
});

test("authMode is supabase when both public vars are set", () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
  assert.equal(authMode(), "supabase");
  assert.equal(demoAuthAllowed(), false);
  if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
  if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
});