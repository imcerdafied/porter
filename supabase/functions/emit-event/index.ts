import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

const TYPES = [
  "question",
  "click",
  "escalation",
  "opt_in",
  "contact",
  "identity_started",
  "identity_skipped",
  "identity_error",
  "opt_in_completed",
  "wayfinding_cta_shown",
  "wayfinding_cta_tapped",
];
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const body = await request.json();
    if (
      !body.fun_id || !TYPES.includes(body.event_type) ||
      !["web", "whatsapp", "sms"].includes(body.channel)
    ) return json({ error: "Invalid event" }, 422);
    const payload = body.payload ?? {};
    if (
      typeof payload !== "object" || Array.isArray(payload) ||
      ["email", "phone", "phone_e164", "message"].some((key) => key in payload)
    ) return json({ error: "PII is not allowed in event payloads" }, 422);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await db.from("concierge_events").insert({
      fun_id: body.fun_id,
      event_type: body.event_type,
      payload,
      channel: body.channel,
      property_id: body.property_id ?? null,
    });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    console.error("emit-event error", error);
    return json({ error: "Event could not be recorded" }, 500);
  }
});
