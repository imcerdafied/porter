import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await request.json();
    if (!body.fun_id || !["phone", "email"].includes(body.opt_in_type)) return json({ error: "fun_id and opt_in_type are required" }, 422);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let funId = String(body.fun_id);
    if (body.opt_in_type === "email") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 422);
      const result = await db.rpc("opt_in_guest_email", { p_fun_id: funId, p_email: email });
      if (result.error) throw result.error;
      funId = String(result.data);
    } else {
      const phone = String(body.phone_e164 ?? "");
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) return json({ error: "A valid phone number is required." }, 422);
      const result = await db.from("guest_identities").update({ phone_e164: phone, opt_in_phone: true }).eq("fun_id", funId);
      if (result.error) throw result.error;
    }
    const identity = await db.from("guest_identities").select("property_id").eq("fun_id", funId).single();
    await db.from("concierge_events").insert({ fun_id: funId, event_type: "opt_in_completed", payload: { opt_in_type: body.opt_in_type }, channel: body.channel ?? (body.opt_in_type === "email" ? "web" : "sms"), property_id: identity.data?.property_id ?? null });
    return json({ success: true, fun_id: funId });
  } catch (error) { console.error("guest-optin error", error); return json({ error: "We couldn't save your choice. Please try again." }, 500); }
});
