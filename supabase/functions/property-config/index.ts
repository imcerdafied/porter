import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (!["GET", "POST"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const slug = request.method === "GET"
      ? new URL(request.url).searchParams.get("slug")
      : String((await request.json()).slug ?? "");
    if (!slug) return json({ error: "Property slug is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from("properties")
      .select("id,slug,name,logo_url,accent_color,wayfinding_enabled,phunware_building_id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Property not found" }, 404);
    return json({ property: data }, 200, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (error) {
    console.error("property-config function error", error);
    return json({ error: "Property information is unavailable" }, 500);
  }
});
