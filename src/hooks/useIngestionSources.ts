import { useCallback, useEffect, useState } from "react";
import { logWizardEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

export interface IngestionSource {
  id: string; property_id: string; source_type: "url" | "pdf" | "faq"; label: string | null;
  storage_path: string | null; raw_content: string | null;
  status: "queued" | "processing" | "done" | "error"; error_message: string | null;
}

export function useIngestionSources(propertyId?: string) {
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [loading, setLoading] = useState(Boolean(propertyId));
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!propertyId) { setSources([]); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("ingestion_sources").select("*")
      .eq("property_id", propertyId).order("created_at");
    setSources((data ?? []) as IngestionSource[]);
    setError(queryError?.message ?? null);
    setLoading(false);
  }, [propertyId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!propertyId) return;
    const channel = supabase.channel(`ingestion:${propertyId}`).on("postgres_changes", {
      event: "*", schema: "public", table: "ingestion_sources", filter: `property_id=eq.${propertyId}`,
    }, () => { void refresh(); }).subscribe();
    const interval = window.setInterval(() => { void refresh(); }, 5000);
    return () => { window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [propertyId, refresh]);

  async function addSources(input: { url?: string; faq?: string; files: File[] }) {
    if (!propertyId) throw new Error("Save your property before adding sources.");
    const rows: Array<Partial<IngestionSource>> = [];
    if (input.url) rows.push({ property_id: propertyId, source_type: "url", label: input.url });
    if (input.faq) rows.push({ property_id: propertyId, source_type: "faq", label: "Pasted FAQs", raw_content: input.faq });
    for (const file of input.files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${propertyId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("property-docs").upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      rows.push({ property_id: propertyId, source_type: "pdf", label: file.name, storage_path: path });
    }
    const { data, error: insertError } = await supabase.from("ingestion_sources").insert(rows).select();
    if (insertError) throw insertError;
    const added = data as IngestionSource[];
    setSources((current) => [...current, ...added]);
    await Promise.all(added.map(async (source) => {
      await logWizardEvent(propertyId, "source_added", { source_type: source.source_type });
      void supabase.functions.invoke("ingest-source", { body: { source_id: source.id } }).then(async ({ error: invokeError }: { error: Error | null }) => {
        if (!invokeError) return;
        await supabase.from("ingestion_sources").update({
          status: "error", error_message: invokeError.message,
        }).eq("id", source.id);
      });
    }));
    return added;
  }
  return { sources, loading, error, addSources, refresh };
}
