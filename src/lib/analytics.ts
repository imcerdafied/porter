import { supabase } from "./supabase";

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
