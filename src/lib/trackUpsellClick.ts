import type { UpsellCard } from "../hooks/useUpsellCards";
import { supabase } from "./supabase";

/** Records revenue intent without delaying or preventing destination navigation. */
export function trackUpsellClick(card: UpsellCard, sessionId: string): void {
  void supabase
    .from("revenue_intent_events")
    .insert({
      upsell_card_id: card.id,
      property_id: card.property_id,
      session_id: sessionId,
      moment: card.moment,
      destination_url: card.destination_url,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn("[Porter] revenue_intent_event write failed:", error.message);
      }
    });
}
