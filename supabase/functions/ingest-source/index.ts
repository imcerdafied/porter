import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { CORS_HEADERS, json } from "../_shared/http.ts";

type Source = { id: string; property_id: string; source_type: "url" | "pdf" | "faq"; label: string | null; storage_path: string | null; raw_content: string | null };
type Entry = { title: string; body: string };
const anthropicUrl = "https://api.anthropic.com/v1/messages";

function parseEntries(raw: string): Entry[] {
  const match = raw.match(/\[[\s\S]*\]/); // also strips optional markdown fences
  if (!match) return [];
  try {
    const value: unknown = JSON.parse(match[0]);
    return Array.isArray(value) ? value.filter((item): item is Entry => typeof item?.title === "string" && typeof item?.body === "string").slice(0, 30) : [];
  } catch { return []; }
}

async function claude(apiKey: string, content: unknown, maxTokens: number) {
  const response = await fetch(anthropicUrl, { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, messages: [{ role: "user", content }] }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Claude request failed");
  return body.content?.find((block: { type: string }) => block.type === "text")?.text ?? "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !url || !serviceKey) return json({ error: "Ingestion service is not configured" }, 500);
  const admin = createClient(url, serviceKey);
  let sourceId = "";
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const body = await request.json() as { source_id?: string }; sourceId = body.source_id ?? "";
    const { data, error } = await userClient.from("ingestion_sources").select("*").eq("id", sourceId).single();
    if (error || !data) return json({ error: "Source not found" }, 404);
    const source = data as Source;
    await admin.from("ingestion_sources").update({ status: "processing", error_message: null }).eq("id", source.id);
    let rawText = source.raw_content ?? "";
    if (source.source_type === "url") {
      const page = await fetch(source.label!, { redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (!page.ok) throw new Error(`Website returned ${page.status}`);
      rawText = (await page.text()).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 40000);
    } else if (source.source_type === "pdf") {
      const { data: pdf, error: downloadError } = await admin.storage.from("property-docs").download(source.storage_path!);
      if (downloadError) throw downloadError;
      const bytes = new Uint8Array(await pdf.arrayBuffer()); let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      rawText = await claude(apiKey, [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: btoa(binary) } }, { type: "text", text: "Extract all factual text from this hotel PDF. Return plain text only." }], 4096);
    }
    if (!rawText.trim()) throw new Error("No readable content found");
    const drafted = await claude(apiKey, `Extract factual hotel concierge Q&A entries from this content. Return ONLY a JSON array with objects {"title": string, "body": string}. No markdown. Maximum 30 entries.\n\n${rawText.slice(0, 30000)}`, 4096);
    const entries = parseEntries(drafted);
    if (!entries.length) throw new Error("No knowledge entries could be drafted");
    const { error: insertError } = await admin.from("knowledge_entries").insert(entries.map((entry) => ({ ...entry, property_id: source.property_id, source_id: source.id, source_type: source.source_type })));
    if (insertError) throw insertError;
    await admin.from("ingestion_sources").update({ status: "done" }).eq("id", source.id);
    return json({ ok: true, entries: entries.length });
  } catch (error) {
    if (sourceId) await admin.from("ingestion_sources").update({ status: "error", error_message: error instanceof Error ? error.message : String(error) }).eq("id", sourceId);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
