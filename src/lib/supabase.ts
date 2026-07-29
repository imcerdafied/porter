import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Keep the public landing/guest routes renderable in deployments that have not
// enabled onboarding yet. Authenticated operations return a useful inline error.
export const supabaseConfigured = Boolean(url && key);
export const supabase = createClient(
  url ?? "http://127.0.0.1:54321",
  key ?? "supabase-not-configured",
);

export function configurationError() {
  return supabaseConfigured ? null : "Onboarding is not configured. Add the Supabase URL and anon key.";
}
