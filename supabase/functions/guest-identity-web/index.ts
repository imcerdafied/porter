import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";
import { findIdentity } from "../_shared/identity.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { browser_id, property_id = null, property_slug = null } = await request.json();
    if (!browser_id || String(browser_id).length > 180) return json({ error: "browser_id is required" }, 422);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let resolvedPropertyId = property_id;
    if (!resolvedPropertyId && property_slug) {
      const result = await db.from("properties").select("id").eq("slug", property_slug).maybeSingle();
      if (result.error) throw result.error;
      resolvedPropertyId = result.data?.id ?? null;
    }
    const funId = await findIdentity(db, "web", String(browser_id), resolvedPropertyId);
    await db.from("concierge_events").insert({ fun_id: funId, event_type: "identity_started", payload: {}, channel: "web", property_id: resolvedPropertyId });
    return json({ fun_id: funId });
  } catch (error) {
    console.error("guest-identity-web error", error);
    return json({ error: "Couldn't start your session. Please try again." }, 500);
  }
});
