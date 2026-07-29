import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface UpsellCard {
  id: string;
  property_id: string;
  moment: "late_checkout" | "spa" | "dining" | "general";
  title: string;
  body: string;
  cta_label: string;
  destination_url: string;
  display_order: number;
  attributed_revenue_usd: number | null;
}

interface UpsellCardsState {
  cards: UpsellCard[];
  loading: boolean;
  error: string | null;
}

export function useUpsellCards(propertyId: string): UpsellCardsState {
  const [state, setState] = useState<UpsellCardsState>({
    cards: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let current = true;
    setState({ cards: [], loading: true, error: null });

    supabase
      .from("upsell_cards")
      .select("id, property_id, moment, title, body, cta_label, destination_url, display_order, attributed_revenue_usd")
      .eq("property_id", propertyId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (!current) return;
        if (error) {
          setState({ cards: [], loading: false, error: error.message });
          return;
        }
        setState({ cards: (data ?? []) as UpsellCard[], loading: false, error: null });
      });

    return () => {
      current = false;
    };
  }, [propertyId]);

  return state;
}
