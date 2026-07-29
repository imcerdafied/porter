import { supabase } from "../lib/supabase";

export interface RecordConversionArgs {
  deliveryId: string | null;
  guestSessionId: string | null;
  upsellCatalogId: string;
  propertyId: string;
  funId: string | null;
  conversionType: "click" | "booking_intent" | "rebook_click";
  attributedRevenueUsd: number | null;
  source: "prearrival" | "inapp" | "rebook";
}

export function buildConversionPayload(args: RecordConversionArgs) {
  return {
    p_delivery_id: args.deliveryId,
    p_guest_session_id: args.guestSessionId,
    p_upsell_card_id: args.upsellCatalogId,
    p_property_id: args.propertyId,
    p_fun_id: args.funId,
    p_conversion_type: args.conversionType,
    p_attributed_revenue_usd: args.attributedRevenueUsd,
    p_source: args.source,
  };
}

export async function recordUpsellConversion(args: RecordConversionArgs): Promise<void> {
  const { error } = await supabase.rpc("record_upsell_conversion", buildConversionPayload(args));
  if (error && import.meta.env.DEV) console.warn("[Porter] upsell conversion write failed:", error.message);
}
