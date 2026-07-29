import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = request.headers.get("authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const serviceDb = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: { user } } = await userDb.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { escalation_id, message } = await request.json();
    if (!escalation_id || !String(message ?? "").trim()) return json({ error: "Escalation and message are required" }, 422);
    const { data: escalation } = await userDb.from("escalations").select("id,conversation_id,status,conversations(channel,thread_key)").eq("id", escalation_id).single();
    if (!escalation) return json({ error: "Escalation not found or not authorized" }, 404);
    const content = String(message).trim();
    const conversation = escalation.conversations as unknown as { channel: "web" | "sms" | "whatsapp"; thread_key: string };
    let deliveryError: string | null = null;
    if (conversation.channel === "whatsapp") {
      const token = Deno.env.get("WHATSAPP_API_TOKEN"), phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      if (!token || !phoneId) deliveryError = "WhatsApp delivery is not configured";
      else { const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: conversation.thread_key, type: "text", text: { body: content } }) }); if (!response.ok) deliveryError = `WhatsApp delivery failed (${response.status})`; }
    } else if (conversation.channel === "sms") {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), token = Deno.env.get("TWILIO_AUTH_TOKEN"), from = Deno.env.get("TWILIO_FROM_NUMBER");
      if (!sid || !token || !from) deliveryError = "SMS delivery is not configured";
      else { const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: conversation.thread_key, From: from, Body: content }) }); if (!response.ok) deliveryError = `SMS delivery failed (${response.status})`; }
    }
    if (deliveryError) return json({ error: deliveryError }, 502);
    const { error: insertError } = await serviceDb.from("messages").insert({ conversation_id: escalation.conversation_id, role: "staff", content });
    if (insertError) throw insertError;
    if (escalation.status === "new") await serviceDb.from("escalations").update({ status: "in_progress", assigned_staff_id: user.id, opened_at: new Date().toISOString() }).eq("id", escalation_id);
    console.log(JSON.stringify({ event: "staff_reply_delivered", escalation_id, channel: conversation.channel }));
    return json({ ok: true });
  } catch (error) { console.error("staff-reply function error", error); return json({ error: "Reply could not be sent" }, 500); }
});
