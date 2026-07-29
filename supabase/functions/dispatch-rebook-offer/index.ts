import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";
import { requireServiceRequest, sendWhatsAppTemplate } from "../_shared/revenue.ts";

type SessionRow = {
  id: string;
  fun_id: string;
  property_id: string;
  guest_phone: string;
  checkout_at: string;
  properties: { slug: string | null; name: string | null } |
    { slug: string | null; name: string | null }[] | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = requireServiceRequest(req);
  if (auth.response) return auth.response;
  if (!Deno.env.get("WHATSAPP_ACCESS_TOKEN") || !Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")) return json({ error: "WhatsApp service not configured" }, 503);
  try {
    const admin = createClient(auth.supabaseUrl!, auth.serviceKey!);
    const now = new Date();
    const oldest = new Date(now.getTime() - 720 * 3_600_000).toISOString();
    const { data: sessions, error } = await admin.from("guest_sessions")
      .select("id,fun_id,property_id,guest_phone,checkout_at,properties!inner(slug,name)")
      .lte("checkout_at", now.toISOString()).gte("checkout_at", oldest).not("guest_phone", "is", null);
    if (error) throw new Error(error.message);
    const results: Record<string, unknown>[] = [];
    for (const session of (sessions ?? []) as unknown as SessionRow[]) {
      const { data: config } = await admin.from("property_revenue_config")
        .select("post_stay_rebook_window_hours,rebook_discount_pct,rebook_discount_flat_usd").eq("property_id", session.property_id).maybeSingle();
      if (!config) continue;
      const elapsed = (now.getTime() - new Date(session.checkout_at).getTime()) / 3_600_000;
      if (elapsed > config.post_stay_rebook_window_hours) continue;
      const { data: delivery, error: insertError } = await admin.from("upsell_deliveries").insert({
        guest_session_id: session.id, upsell_card_id: null, property_id: session.property_id,
        fun_id: session.fun_id, channel: "whatsapp", delivery_type: "rebook",
      }).select("id").single();
      if (insertError) continue;
      const property = Array.isArray(session.properties) ? session.properties[0] : session.properties;
      const perk = config.rebook_discount_pct != null ? `${config.rebook_discount_pct}% off` :
        config.rebook_discount_flat_usd != null ? `$${Number(config.rebook_discount_flat_usd).toFixed(2)} off` : "a special returning-guest perk";
      try {
        const publicBaseUrl = Deno.env.get("PORTER_PUBLIC_URL") ?? "https://porter-taupe.vercel.app";
        const link = `${publicBaseUrl}/${property?.slug}?rebook=1&delivery=${delivery.id}`;
        const messageId = await sendWhatsAppTemplate(session.guest_phone, "rebooking_offer", [property?.name ?? "the hotel", perk, link]);
        await admin.from("upsell_deliveries").update({ whatsapp_message_id: messageId ?? null }).eq("id", delivery.id);
        results.push({ session_id: session.id, status: "dispatched" });
      } catch (sendError) {
        await admin.from("upsell_deliveries").delete().eq("id", delivery.id);
        results.push({ session_id: session.id, status: "error", error: String(sendError) });
      }
    }
    return json({ dispatched: results.filter((r) => r.status === "dispatched").length, results });
  } catch {
    return json({ error: "Unable to dispatch rebooking offers" }, 500);
  }
});
