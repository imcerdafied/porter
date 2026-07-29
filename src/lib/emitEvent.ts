import { supabase } from "./supabase";

export type EventType = "question" | "click" | "escalation" | "opt_in" | "contact" | "identity_started" | "identity_skipped" | "identity_error" | "opt_in_completed" | "wayfinding_cta_shown" | "wayfinding_cta_tapped";

export async function emitConciergeEvent(eventType: EventType, payload: Record<string, unknown>, channel: "web" | "whatsapp" | "sms", propertyId?: string): Promise<void> {
  const funId = sessionStorage.getItem("porter_fun_id");
  if (!funId) return;
  await supabase.functions.invoke("emit-event", { body: { fun_id: funId, event_type: eventType, payload, channel, property_id: propertyId ?? null } });
}
