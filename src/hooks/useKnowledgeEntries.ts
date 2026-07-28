import { useCallback, useEffect, useState } from "react";
import { logWizardEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

export interface KnowledgeEntry {
  id: string; property_id: string; source_type: "url" | "pdf" | "faq" | "manual";
  title: string; body: string; status: "draft" | "approved" | "deleted";
}

export function useKnowledgeEntries(propertyId?: string) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(propertyId));
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!propertyId) return;
    const { data, error: queryError } = await supabase.from("knowledge_entries").select("*")
      .eq("property_id", propertyId).neq("status", "deleted").order("created_at");
    setEntries((data ?? []) as KnowledgeEntry[]);
    setError(queryError?.message ?? null); setLoading(false);
  }, [propertyId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function updateEntry(id: string, updates: Pick<KnowledgeEntry, "body"> | Pick<KnowledgeEntry, "status">) {
    const { data, error: mutationError } = await supabase.from("knowledge_entries").update(updates).eq("id", id).select().single();
    if (mutationError) throw mutationError;
    setEntries((current) => data.status === "deleted" ? current.filter((entry) => entry.id !== id)
      : current.map((entry) => entry.id === id ? data as KnowledgeEntry : entry));
    if (propertyId) await logWizardEvent(propertyId, "entry_edited", { entry_id: id, action: "status" in updates ? updates.status : "saved" });
  }
  async function addEntry(title: string, body: string) {
    if (!propertyId) throw new Error("Property not found.");
    const { data, error: mutationError } = await supabase.from("knowledge_entries").insert({
      property_id: propertyId, source_type: "manual", title, body, status: "draft",
    }).select().single();
    if (mutationError) throw mutationError;
    setEntries((current) => [...current, data as KnowledgeEntry]);
    await logWizardEvent(propertyId, "entry_edited", { entry_id: data.id, action: "added" });
  }
  return { entries, loading, error, updateEntry, addEntry, refresh };
}
