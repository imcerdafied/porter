import type { UpsellCard } from "../hooks/useUpsellCards";
import { supabase } from "./supabase";
import { emitConciergeEvent } from "./emitEvent";
import { recordUpsellConversion } from "../hooks/useUpsellConversion";

/** Records revenue intent without delaying or preventing destination navigation. */
export function trackUpsellClick(card: UpsellCard, sessionId: string): void {
  const funId = sessionStorage.getItem("porter_fun_id");
  const query = new URLSearchParams(window.location.search);
  const deliveryId = query.get("delivery");
  const isRebook = query.get("rebook") === "1";
  const source = isRebook ? "rebook" : deliveryId ? "prearrival" : "inapp";
  void supabase
    .from("revenue_intent_events")
    .insert({
      upsell_card_id: card.id,
      property_id: card.property_id,
      session_id: sessionId,
      moment: card.moment,
      destination_url: card.destination_url,
      fun_id: funId,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn("[Porter] revenue_intent_event write failed:", error.message);
      }
    });
  void emitConciergeEvent("click", { upsell_card_id: card.id, moment: card.moment }, "web", card.property_id);
  void recordUpsellConversion({
    deliveryId,
    guestSessionId: query.get("stay"),
    upsellCatalogId: card.id,
    propertyId: card.property_id,
    funId,
    conversionType: isRebook ? "rebook_click" : "click",
    attributedRevenueUsd: card.attributed_revenue_usd,
    source,
  });
}
