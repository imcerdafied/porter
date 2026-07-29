import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

function required(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured`); return value; }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  if (request.headers.get("apikey") !== serviceKey) return json({ error: "Unauthorized" }, 401);
  try {
    const { conversation_id, reason = "ai_handoff" } = await request.json();
    if (!conversation_id) return json({ error: "conversation_id is required" }, 422);
    const db = createClient(required("SUPABASE_URL"), serviceKey, { auth: { persistSession: false } });
    const { data: conversation } = await db.from("conversations")
      .select("id,property_id,channel,thread_key,properties(name,staff_sms_numbers,staff_email_addresses)")
      .eq("id", conversation_id).single();
    if (!conversation) return json({ error: "Conversation not found" }, 404);
    const { data: messages } = await db.from("messages").select("role,content,created_at")
      .eq("conversation_id", conversation_id).order("created_at").limit(100);
    const { data: existing } = await db.from("escalations").select("id").eq("conversation_id", conversation_id).neq("status", "resolved").maybeSingle();
    if (existing) return json({ escalation_id: existing.id, duplicate: true });
    const { data: escalation, error } = await db.from("escalations")
      .insert({ conversation_id, property_id: conversation.property_id, status: "new", reason })
      .select("id").single();
    if (error) {
      if (error.code === "23505") {
        const { data: active } = await db.from("escalations").select("id").eq("conversation_id", conversation_id).neq("status", "resolved").single();
        return json({ escalation_id: active?.id, duplicate: true });
      }
      throw error;
    }
    await db.from("conversations").update({ escalated: true }).eq("id", conversation_id);
    const property = conversation.properties as unknown as { name: string; staff_sms_numbers: string[]; staff_email_addresses: string[] };
    const lastGuest = [...(messages ?? [])].reverse().find((message) => message.role === "user")?.content ?? "No guest message available";
    const appUrl = Deno.env.get("APP_URL") ?? "https://porter.app";
    const deepLink = `${appUrl}/staff/inbox?escalation=${escalation.id}`;
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), token = Deno.env.get("TWILIO_AUTH_TOKEN"), from = Deno.env.get("TWILIO_FROM_NUMBER");
    const notificationResults: Promise<unknown>[] = [];
    if (sid && token && from) for (const to of property.staff_sms_numbers ?? []) {
      const body = `[${property.name}] ${conversation.channel} escalation (${reason}): ${lastGuest.slice(0, 160)} ${deepLink}`;
      notificationResults.push(fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: to, From: from, Body: body }) }));
    }
    const resendKey = Deno.env.get("RESEND_API_KEY"), emailFrom = Deno.env.get("SMTP_FROM");
    if (resendKey && emailFrom) for (const to of property.staff_email_addresses ?? []) {
      const transcript = (messages ?? []).map((message) => `[${message.role === "user" ? "GUEST" : message.role.toUpperCase()}] ${message.content}`).join("\n\n");
      notificationResults.push(fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: emailFrom, to: [to], reply_to: `${escalation.id}@reply.porter.app`, subject: `[${property.name}] Guest needs assistance`, text: `Channel: ${conversation.channel}\nReason: ${reason}\n\n${transcript}\n\nOpen in Porter: ${deepLink}` }) }));
    }
    const settled = await Promise.allSettled(notificationResults);
    const failed_notifications = settled.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && result.value instanceof Response && !result.value.ok)).length;
    console.log(JSON.stringify({ event: "escalation_created", escalation_id: escalation.id, property_id: conversation.property_id, failed_notifications }));
    return json({ escalation_id: escalation.id, failed_notifications });
  } catch (error) { console.error("escalate function error", error); return json({ error: "Escalation could not be created" }, 500); }
});
