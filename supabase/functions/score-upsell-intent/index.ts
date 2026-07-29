import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) return json({ error: "Service not configured" }, 503);
  try {
    const body = await req.json();
    if (!body.fun_id || !body.property_id || !Array.isArray(body.catalog_ids) || body.catalog_ids.length === 0) {
      return json({ error: "Missing required fields: fun_id, property_id, catalog_ids" }, 400);
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc("get_upsell_intent_scores", {
      p_fun_id: body.fun_id, p_property_id: body.property_id, p_card_ids: body.catalog_ids,
    });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const enoughData = rows.some((row: { event_count: number | string }) => Number(row.event_count) >= 10);
    const ranked = [...rows]
      .sort(enoughData
        ? (a, b) => Number(b.score) - Number(a.score) || a.display_order - b.display_order
        : (a, b) => a.display_order - b.display_order)
      .map(({ card_id, score }: { card_id: string; score: number }) => ({ catalog_item_id: card_id, score: enoughData ? Number(score) : 0 }));
    return json({ ranked, ranking_source: enoughData ? "behavioral" : "manual" });
  } catch {
    return json({ error: "Unable to score upsell intent" }, 500);
  }
});
