import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";
import { requireServiceRequest, sendWhatsAppTemplate } from "../_shared/revenue.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = requireServiceRequest(req);
  if (auth.response) return auth.response;
  if (!Deno.env.get("WHATSAPP_ACCESS_TOKEN") || !Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")) {
    return json({ error: "WhatsApp service not configured" }, 503);
  }
  try {
    const admin = createClient(auth.supabaseUrl!, auth.serviceKey!);
    const now = new Date();
    const horizon = new Date(now.getTime() + 168 * 3_600_000).toISOString();
    const { data: sessions, error } = await admin.from("guest_sessions")
      .select("id,fun_id,property_id,guest_phone,checkin_at,properties!inner(slug)")
      .gt("checkin_at", now.toISOString()).lte("checkin_at", horizon);
    if (error) throw new Error(error.message);
    const results: Record<string, unknown>[] = [];
    for (const session of sessions ?? []) {
      const { data: config } = await admin.from("property_revenue_config").select("prearrival_window_hours,max_upsells_per_stay")
        .eq("property_id", session.property_id).maybeSingle();
      const hours = (new Date(session.checkin_at).getTime() - now.getTime()) / 3_600_000;
      if (hours > (config?.prearrival_window_hours ?? 48)) continue;
      const { data: existing } = await admin.from("upsell_deliveries").select("upsell_card_id")
        .eq("guest_session_id", session.id).eq("delivery_type", "prearrival");
      const delivered = new Set((existing ?? []).map((item) => item.upsell_card_id));
      const remaining = (config?.max_upsells_per_stay ?? 2) - delivered.size;
      if (remaining <= 0) continue;
      const { data: cards } = await admin.from("upsell_cards").select("id,title,display_order")
        .eq("property_id", session.property_id).eq("active", true).order("display_order");
      const available = (cards ?? []).filter((card) => !delivered.has(card.id));
      if (!available.length) continue;
      const { data: scores } = await admin.rpc("get_upsell_intent_scores", {
        p_fun_id: session.fun_id, p_property_id: session.property_id, p_card_ids: available.map((card) => card.id),
      });
      const enoughData = (scores ?? []).some((score) => Number(score.event_count) >= 10);
      const orderedIds = new Map((scores ?? []).sort(enoughData
        ? (a, b) => Number(b.score) - Number(a.score) || a.display_order - b.display_order
        : (a, b) => a.display_order - b.display_order).map((row, index) => [row.card_id, index]));
      available.sort((a, b) => (orderedIds.get(a.id) ?? 999) - (orderedIds.get(b.id) ?? 999));
      for (const card of available.slice(0, remaining)) {
        const channel = session.guest_phone ? "whatsapp" : "inapp";
        const { data: delivery, error: insertError } = await admin.from("upsell_deliveries").insert({
          guest_session_id: session.id, upsell_card_id: card.id, property_id: session.property_id,
          fun_id: session.fun_id, channel, delivery_type: "prearrival",
        }).select("id").single();
        if (insertError) { results.push({ session_id: session.id, catalog_item_id: card.id, status: "duplicate" }); continue; }
        if (session.guest_phone) {
          try {
            const slug = Array.isArray(session.properties) ? session.properties[0]?.slug : session.properties?.slug;
            const link = `https://porter.app/${slug}?upsell=${card.id}&delivery=${delivery.id}&stay=${session.id}`;
            const messageId = await sendWhatsAppTemplate(session.guest_phone, "prearrival_upsell", [card.title, link]);
            await admin.from("upsell_deliveries").update({ whatsapp_message_id: messageId ?? null }).eq("id", delivery.id);
          } catch (sendError) {
            await admin.from("upsell_deliveries").delete().eq("id", delivery.id);
            results.push({ session_id: session.id, catalog_item_id: card.id, status: "error", error: String(sendError) });
            continue;
          }
        }
        results.push({ session_id: session.id, catalog_item_id: card.id, status: "dispatched", channel });
      }
    }
    return json({ dispatched: results.filter((r) => r.status === "dispatched").length, results });
  } catch {
    return json({ error: "Unable to dispatch pre-arrival upsells" }, 500);
  }
});
