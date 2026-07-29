import { useCallback, useEffect, useState } from "react";
import { logWizardEvent } from "../lib/analytics";
import { supabase } from "../lib/supabase";

export interface Property {
  id: string; owner_id: string; name: string; address: string; star_rating: number;
  primary_language: string; contact_email: string; status: "onboarding" | "ingesting" | "review" | "active";
  wizard_step: number; wizard_started_at: string; activated_at: string | null;
  staff_role?: "gm" | "admin"; pilot_start_date?: string | null;
  pilot_report_status?: "pending" | "generating" | "ready" | "failed";
}
export type PropertyInput = Pick<Property, "name" | "address" | "star_rating" | "primary_language" | "contact_email">;

export function useProperty(userId?: string, propertyId?: string | null) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setProperty(null); setLoading(false); return; }
    setLoading(true);
    let query = supabase.from("properties").select("*").eq("owner_id", userId);
    if (propertyId) query = query.eq("id", propertyId);
    const { data, error: queryError } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    setError(queryError?.message ?? null);
    setProperty(data as Property | null);
    setLoading(false);
  }, [userId, propertyId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function upsertProperty(input: PropertyInput) {
    if (!userId) throw new Error("Please sign in first.");
    const values = { ...input, owner_id: userId, wizard_step: 2 };
    const query = property
      ? supabase.from("properties").update(values).eq("id", property.id)
      : supabase.from("properties").insert(values);
    const { data, error: mutationError } = await query.select().single();
    if (mutationError) throw mutationError;
    setProperty(data as Property);
    await logWizardEvent(data.id, "step_completed", { step: 1 });
    return data as Property;
  }

  async function advanceStep(step: number, status?: Property["status"]) {
    if (!property) return;
    const { data, error: mutationError } = await supabase.from("properties")
      .update({ wizard_step: step, ...(status ? { status } : {}) }).eq("id", property.id).select().single();
    if (mutationError) throw mutationError;
    setProperty(data as Property);
    await logWizardEvent(property.id, "step_completed", { step: step - 1 });
  }

  async function activateProperty() {
    if (!property) return;
    const activatedAt = new Date();
    const { data, error: mutationError } = await supabase.from("properties")
      .update({ status: "active", activated_at: activatedAt.toISOString(), pilot_start_date: activatedAt.toISOString().slice(0, 10), wizard_step: 5 })
      .eq("id", property.id).select().single();
    if (mutationError) throw mutationError;
    setProperty(data as Property);
    await logWizardEvent(property.id, "activated");
  }
  return { property, loading, error, upsertProperty, advanceStep, activateProperty, refresh };
}
