import { supabase } from "./supabase";
import { emitConciergeEvent } from "./emitEvent";

export type WayfindingEvent =
  | "wayfinding_cta_shown"
  | "wayfinding_cta_tapped"
  | "wayfinding_upsell_shown"
  | "wayfinding_upsell_cta_tapped";

export function trackEvent(eventName: WayfindingEvent, properties: Record<string, unknown> = {}): void {
  const propertyId = typeof properties.property_id === "string" ? properties.property_id : undefined;
  if (eventName === "wayfinding_cta_shown" || eventName === "wayfinding_cta_tapped") {
    void emitConciergeEvent(eventName, properties, "web", propertyId);
    return;
  }
  if (propertyId) void logDashboardEvent(propertyId, eventName, properties);
}

export async function logWizardEvent(
  propertyId: string,
  eventName: "step_completed" | "source_added" | "entry_edited" | "activated",
  payload: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("wizard_events").insert({
    property_id: propertyId,
    event_name: eventName,
    payload,
  });
  if (error) console.warn("Unable to record wizard event", error.message);
}

export async function logDashboardEvent(propertyId: string, eventName: string, payload: Record<string, unknown> = {}) {
  const { error } = await supabase.from("dashboard_events").insert({ property_id: propertyId, event_name: eventName, payload });
  if (error) console.warn("Unable to record dashboard event", error.message);
}

export async function logInboxEvent(propertyId: string, eventName: string, escalationId?: string, payload: Record<string, unknown> = {}) {
  const { error } = await supabase.from("inbox_events").insert({ property_id: propertyId, escalation_id: escalationId, event_name: eventName, payload });
  if (error) console.warn("Unable to record inbox event", error.message);
}
