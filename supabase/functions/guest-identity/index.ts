import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";
import { findIdentity } from "../_shared/identity.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { channel, phone_e164, property_id = null } = await request.json();
    if (!["whatsapp", "sms"].includes(channel) || !/^\+[1-9]\d{6,14}$/.test(phone_e164 ?? ""))
      return json({ error: "A valid phone_e164 and channel are required" }, 422);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const funId = await findIdentity(db, channel, phone_e164, property_id);
    return json({ fun_id: funId, opt_in_required: true, opt_in_prompt: "Reply YES to let Porter remember you across visits." });
  } catch (error) { console.error("guest-identity error", error); return json({ error: "Identity creation failed" }, 500); }
});

