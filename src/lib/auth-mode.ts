import { supabaseConfigured } from "./agent/adapters";

export type AuthMode = "demo" | "supabase";

/** Demo cookie auth when Supabase public keys are absent. */
export function authMode(): AuthMode {
  return supabaseConfigured() ? "supabase" : "demo";
}

export function demoAuthAllowed(): boolean {
  return authMode() === "demo";
}