import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { json, optionsResponse } from "../_shared/http.ts";
import { secureTokenEqual } from "../_shared/signatures.ts";

const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const slug = String(body.slug ?? "");
    const token = String(body.token ?? "");
    const action = body.action === "update" ? "update" : "read";
    if (!slug || !token) return json({ error: "Invalid admin link" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: property, error: readError } = await supabase
      .from("properties")
      .select("slug,name,knowledge_base,admin_token,logo_url,accent_color")
      .eq("slug", slug)
      .maybeSingle();
    if (readError) throw readError;
    if (!property || !secureTokenEqual(property.admin_token, token)) {
      return json({ error: "Invalid admin link" }, 403);
    }

    if (action === "update") {
      const knowledgeBase = String(body.knowledge_base ?? "");
      const accentColor = String(body.accent_color ?? property.accent_color);
      const logoUrl = String(body.logo_url ?? "").trim() || null;
      if (knowledgeBase.length > 100_000) {
        return json({
          error: "Knowledge base must be under 100,000 characters",
        }, 400);
      }
      if (!ACCENT_PATTERN.test(accentColor)) {
        return json(
          { error: "Accent color must be a six-digit hex color" },
          400,
        );
      }
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          knowledge_base: knowledgeBase,
          accent_color: accentColor,
          logo_url: logoUrl,
        })
        .eq("slug", slug);
      if (updateError) throw updateError;
      property.knowledge_base = knowledgeBase;
      property.accent_color = accentColor;
      property.logo_url = logoUrl;
    }

    const { admin_token: _adminToken, ...safeProperty } = property;
    return json({ property: safeProperty });
  } catch (error) {
    console.error("admin-property function error", error);
    return json({ error: "Could not load property settings" }, 500);
  }
});
